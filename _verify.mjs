import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:8090';
const OUT = 'H:/7、百鲸咨询/2.产品/2.软件与设计/1.网站/baijing/baijing/_shots';
mkdirSync(OUT, { recursive: true });

const PAGES = [
  ['index', '/index.html'],
  ['ai-training', '/ai-training.html'],
  ['efficiency', '/efficiency.html'],
  ['stories', '/stories.html'],
  ['story', '/story.html'],
  ['story2', '/story-2.html'],
  ['story3', '/story-3.html'],
  ['404', '/nope/xx']
];

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ executablePath: EDGE });

const problems = [];

async function audit(page, url, label, viewport) {
  const errors = [];
  const failed = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', r => failed.push(r.url() + ' :: ' + (r.failure()?.errorText || '')));
  page.on('response', r => {
    const u = r.url();
    if (u.startsWith(BASE) && r.status() >= 400 && !u.includes('/nope/')) failed.push(r.status() + ' ' + u);
  });

  await page.goto(BASE + url, { waitUntil: 'networkidle' });

  const metrics = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    h1: document.querySelectorAll('h1').length,
    title: document.title,
    desc: (document.querySelector('meta[name=description]') || {}).content || '',
    ld: document.querySelectorAll('script[type="application/ld+json"]').length,
    qr: (() => {
      const img = document.querySelector('.stamp img');
      if (!img) return null;
      const r = img.getBoundingClientRect();
      return { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY), w: Math.round(r.width) };
    })(),
    topbarSticky: (() => {
      const t = document.querySelector('.topbar');
      if (!t) return null;
      return getComputedStyle(t).position;
    })()
  }));

  if (metrics.scrollW > metrics.clientW + 1) {
    problems.push(`[${label}/${viewport}] 横向溢出 ${metrics.scrollW} > ${metrics.clientW}`);
  }
  if (metrics.h1 !== 1) problems.push(`[${label}/${viewport}] H1 数量 = ${metrics.h1}`);
  if (!metrics.desc) problems.push(`[${label}/${viewport}] 缺 meta description`);
  if (errors.length) problems.push(`[${label}/${viewport}] console error: ${errors.slice(0, 3).join(' | ')}`);
  if (failed.length) problems.push(`[${label}/${viewport}] 资源失败: ${failed.slice(0, 4).join(' | ')}`);

  // 站内链接可达性（同页锚点跳过）
  if (viewport === 'desktop') {
    const links = await page.$$eval('a[href]', as =>
      Array.from(new Set(as.map(a => a.getAttribute('href'))))
        .filter(h => h && !h.startsWith('#') && !h.startsWith('http') && !h.startsWith('tel:'))
    );
    for (const h of links) {
      const target = h.startsWith('/') ? h : new URL(h, BASE + url).pathname;
      const resp = await page.request.get(BASE + target);
      if (resp.status() >= 400) problems.push(`[${label}] 死链 ${h} → ${resp.status()}`);
    }
  }

  await page.screenshot({ path: `${OUT}/${label}-${viewport}.png`, fullPage: viewport === 'mobile' ? false : true });
  return metrics;
}

for (const [label, url] of PAGES) {
  for (const [vp, size] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const m = await audit(page, url, label, vp);
    if (label === 'index' && vp === 'mobile') {
      console.log('mobile 首屏 QR:', JSON.stringify(m.qr), 'viewport H=844');
      if (m.qr && m.qr.bottom > 844) problems.push(`[index/mobile] 首屏看不到二维码（bottom=${m.qr.bottom}）`);
    }
    if (label === 'index' && vp === 'desktop') {
      console.log('desktop topbar position:', m.topbarSticky);
      if (m.topbarSticky !== 'sticky') problems.push(`[index/desktop] 顶栏不是 sticky：${m.topbarSticky}`);
    }
    // 滚动后顶栏仍在
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(300);
    const stickyTop = await page.evaluate(() => {
      const t = document.querySelector('.topbar');
      return t ? Math.round(t.getBoundingClientRect().top) : null;
    });
    if (stickyTop !== 0 && stickyTop !== null) problems.push(`[${label}/${vp}] 滚动后顶栏 top=${stickyTop}（应为 0）`);
    await ctx.close();
  }
}

// 预约抽屉交互（拦截 Supabase 写入，避免污染生产数据）
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  let posted = null;
  await page.route('**/rest/v1/diagnosis_leads', async route => {
    posted = route.request().postDataJSON();
    await route.fulfill({ status: 201, body: '' });
  });
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  await page.click('.hero-actions [data-book]');
  await page.waitForTimeout(300);
  const opened = await page.isVisible('#bkOverlay.on');
  if (!opened) problems.push('[index/mobile] 点预约诊断未打开抽屉');

  // 空提交 → 应报错
  await page.click('#bkSubmit');
  await page.waitForTimeout(200);
  const errText = await page.textContent('#bkErr');
  if (!errText || !errText.trim()) problems.push('[booking] 空提交未给出校验提示');

  await page.fill('#bkCompany', '测试公司');
  await page.fill('#bkName', '测试');
  await page.fill('#bkPhone', '13800138000');
  await page.click('#bkSubmit');
  await page.waitForTimeout(600);
  const doneShown = await page.isVisible('#bkDone.on');
  if (!doneShown) problems.push('[booking] 提交后未显示成功态');
  if (!posted || posted.phone !== '13800138000') problems.push('[booking] 提交体异常: ' + JSON.stringify(posted));

  await page.screenshot({ path: `${OUT}/booking-success.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  if (await page.isVisible('#bkOverlay.on')) problems.push('[booking] Esc 未关闭抽屉');
  await ctx.close();
}

await browser.close();

console.log('\n=== 问题清单 ===');
console.log(problems.length ? problems.join('\n') : '无');
