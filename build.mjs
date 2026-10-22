/**
 * 百鲸咨询 站点构建
 * ---------------------------------------------------------------
 * 线上站点 = v2/ 目录下的「现场笔记风」五页站（2026-10 改版）
 *   v2/index.html        首页
 *   v2/ai-training.html  AI培训
 *   v2/efficiency.html   提效咨询
 *   v2/stories.html      翻车实录（索引）
 *   v2/story.html        翻车实录（单篇模板）
 *   v2/styles.css / v2/booking.js / v2/assets/*
 *
 * 这些文件在构建时被复制到 dist/ 根目录，因此站内相对链接（styles.css、
 * assets/logo.png）与线上 URL 完全一致。
 *
 * 根目录的 index.html 是改版前的旧首页，已不再部署，仅作备份/回滚参考。
 * 旧版功能页（4 个测算工具、企业诊断、admin）保留可访问，样式沿用
 * premium-enhance.css。
 *
 * Supabase 的 articles 仍会预渲染成 /article/{id}.html，沿用 v2 视觉，
 * 目的是保住已被收录的旧文章链接不漏 404。
 * ---------------------------------------------------------------
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const DIST = join(ROOT, 'dist');
const V2 = join(ROOT, 'v2');
const SITE_URL = 'https://baijingzixun.top';

// v2 站点的内容版本日期（内容有实质改动时手动更新，不要用构建当天日期，
// 否则每次 CI 都会把所有页面的 lastmod 刷成当天，对搜索引擎是噪声）
const V2_REV = '2026-10-19';
// 静态资源版本号：styles.css / booking.js 内容有变化时 +1（或改日期），
// 构建时自动给所有页面的引用加 ?v=，强制访客浏览器丢弃旧缓存
const ASSET_VER = '20261022-4';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mxtxwjprmfstbheiempi.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_2VAasjGlB4ioG-hhCMSnAA_4AdPGD-R';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatDate(s) {
  if (!s) return '';
  const d = new Date(s);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function escapeHtml(str) {
  if (!str) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

/** JSON-LD 安全序列化：避免正文里的 </script> 提前闭合标签 */
function jsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

async function fetchArticles() {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('sort_order', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/* ------------------------------------------------------------------
   v2 站点：五页 + 样式 + 脚本 + assets 复制到 dist 根目录
   页面清单动态扫描 v2/*.html —— 自动发文脚本新增的 story-N.html
   不需要再回来改这里
   ------------------------------------------------------------------ */
const V2_ASSETS = ['styles.css', 'booking.js', 'share-card.js', 'assets/logo.png', 'assets/qr.jpg',
  'assets/favicon.png', 'assets/apple-touch-icon.png', 'assets/share-logo.png'];

function copyV2Site() {
  // 以 _ 开头的文件、以及 *-preview.html 是本地效果图/草稿，不发布
  const pages = readdirSync(V2).filter(f =>
    f.endsWith('.html') && !f.startsWith('_') && !f.endsWith('-preview.html'));
  for (const f of [...pages, ...V2_ASSETS]) {
    const src = join(V2, f);
    const dest = join(DIST, f);
    if (!existsSync(src)) {
      throw new Error(`v2 资源缺失：${f}（构建中止，避免线上白页）`);
    }
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
  // 旧的「咨询师登录」页引用根级 logo.png，顺手补一个，避免那张图 404
  copyFileSync(join(V2, 'assets', 'logo.png'), join(DIST, 'logo.png'));
  console.log(`✅ v2 站点已复制到 dist 根目录（${pages.length} 页 + 样式/脚本/图标）`);
}

/** 手写递归复制：本机 Node 的 cpSync 复制某些目录会静默崩溃（exit 127），
 *  用 readdirSync + copyFileSync 等价实现，行为稳定。 */
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, entry.name);
    const d = join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (entry.isFile()) copyFileSync(s, d);
  }
}

/* ------------------------------------------------------------------
   翻车实录索引：唯一数据源 v2/_data/stories.json
   —— stories.html / index.html 里的列表由这里渲染，新增文章只改 JSON，
      不碰 HTML 结构（自动化发文依赖这一点）
   ------------------------------------------------------------------ */
function loadStories() {
  const p = join(V2, '_data', 'stories.json');
  if (!existsSync(p)) return { items: [] };
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (err) {
    console.warn('⚠️  stories.json 解析失败，列表将为空：', err.message);
    return { items: [] };
  }
}

const pad2 = n => String(n).padStart(2, '0');

function storyItemHtml(s, withBreakpoint) {
  const no = pad2(s.no);
  const meta = withBreakpoint && s.breakpoint
    ? `${escapeHtml(s.meta)} · 断点：${escapeHtml(s.breakpoint)}`
    : escapeHtml(s.meta);
  if (s.pending) {
    return `      <li>
        <div class="log-row static">
          <span class="no2">${no}</span>
          <span class="t">${escapeHtml(s.title)}</span>
          <span class="meta">${meta}</span>
          <span class="go pending">全文整理中</span>
        </div>
      </li>`;
  }
  return `      <li>
        <a href="${escapeHtml(s.href)}">
          <span class="no2">${no}</span>
          <span class="t">${escapeHtml(s.title)}</span>
          <span class="meta">${meta}</span>
          <span class="go">读全文 →</span>
        </a>
      </li>`;
}

function renderStoryLists(items) {
  const sorted = [...items].sort((a, b) => b.no - a.no);
  const all = sorted.map(s => storyItemHtml(s, true)).join('\n');
  const latest = [
    ...sorted.slice(0, 2).map(s => storyItemHtml(s, false)),
    `      <li>
        <a href="stories.html">
          <span class="no2">全部</span>
          <span class="t">全部翻车实录</span>
          <span class="meta">杭州 / 长三角</span>
          <span class="go">查看索引 →</span>
        </a>
      </li>`
  ].join('\n');

  for (const [file, marker, html] of [
    ['stories.html', '<!--STORIES-->', all],
    ['index.html', '<!--LATEST-->', latest]
  ]) {
    const p = join(DIST, file);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, 'utf8');
    if (!src.includes(marker)) {
      console.warn(`⚠️  ${file} 缺少占位 ${marker}，列表未渲染`);
      continue;
    }
    writeFileSync(p, src.replace(marker, html));
  }
}

/* ------------------------------------------------------------------
   旧版静态资源（保留可访问的存量功能页）
   ------------------------------------------------------------------ */
function copyStaticFiles() {
  // 注意：不再复制旧首页 index.html、banner、AI 海报、咨询师头像、logo 墙
  // —— v2 站点均未引用，留在仓库里即可，不进 dist 可省 5MB+ 部署体积。
  const staticFiles = [
    'article-detail.html',                 // /article-detail.html?id= 旧链接兼容
    'article-default-cover.svg',
    'logo0（透明）.png',                    // 工具页 / 企业诊断页导航栏 logo
    'CNAME', 'robots.txt', '_redirects',
    'premium-enhance.css', 'premium-enhance.js', // 工具页共用导航栏样式
    '目标测算工具.html', '战略解码工具.html',
    '组织架构生成工具.html', '股权架构生成工具.html',
    'admin.html', '咨询师登录页面.html', '企业诊断.html'
  ];
  // articles/ 只是 Supabase 建表说明（.sql/.md），api/ 是 Netlify 形态的
  // serverless webhook，GitHub Pages 上都没有任何作用，不进 dist。
  const dirs = [];

  for (const f of staticFiles) {
    const src = join(ROOT, f);
    const dest = join(DIST, f);
    if (existsSync(src)) {
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
    }
  }
  for (const d of dirs) {
    const src = join(ROOT, d);
    const dest = join(DIST, d);
    if (existsSync(src)) {
      mkdirSync(dest, { recursive: true });
      copyDir(src, dest);
    }
  }
}

/* ------------------------------------------------------------------
   文章静态页：布局换成 v2 视觉（原模板还是 Tailwind 深蓝，与新版割裂）
   ------------------------------------------------------------------ */
function generateArticleHtml(article) {
  const cover = article.cover_url && !article.cover_url.startsWith('data:') ? article.cover_url : '';
  const excerpt = article.excerpt || '';
  const createdAt = formatDate(article.created_at);
  const author = article.author || '百鲸咨询';
  const category = article.category || '百鲸观察';
  const articleUrl = `${SITE_URL}/article/${article.id}.html`;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: excerpt,
    datePublished: article.created_at || undefined,
    dateModified: article.updated_at || article.created_at || undefined,
    author: { '@type': 'Organization', name: author },
    publisher: { '@type': 'Organization', name: '百鲸咨询' },
    mainEntityOfPage: articleUrl,
    articleSection: category
  };

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(article.title)} — 百鲸咨询</title>
<meta name="description" content="${escapeHtml(excerpt || '百鲸咨询 · AI培训 / 提效咨询 / FDE落地实施')}">
<link rel="canonical" href="${articleUrl}">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<meta property="og:title" content="${escapeHtml(article.title)} — 百鲸咨询">
<meta property="og:description" content="${escapeHtml(excerpt)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${articleUrl}">
<meta property="og:site_name" content="百鲸咨询">
${cover ? `<meta property="og:image" content="${escapeHtml(cover)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/styles.css">
<script type="application/ld+json">${jsonLd(ld)}</script>
</head>
<body>
<img src="/assets/share-logo.png" alt="" width="500" height="500" aria-hidden="true" style="position:absolute;left:-9999px;top:0;">

<header class="topbar">
  <div class="wrap topbar-in">
    <a class="brand" href="/index.html"><img src="/assets/logo.png" alt="百鲸咨询" width="85" height="30"></a>
    <nav class="topnav" aria-label="站内页面">
      <a href="/index.html">首页</a>
      <a href="/ai-training.html">AI培训</a>
      <a href="/efficiency.html">提效咨询</a>
      <a class="nav-hot" href="/stories.html">翻车实录</a>
    </nav>
  </div>
</header>

<article class="article">
  <div class="wrap narrow">
    <a class="back" href="/index.html">← 返回首页</a>
    <p class="kicker">${escapeHtml(category)}</p>
    <h1 style="font-size:clamp(26px,4vw,40px);">${escapeHtml(article.title)}</h1>
    <p class="art-meta">${createdAt} · ${escapeHtml(author)}</p>
${excerpt ? `    <p class="lead" style="margin-top:18px;">${escapeHtml(excerpt)}</p>\n` : ''}${cover ? `    <img src="${escapeHtml(cover)}" alt="${escapeHtml(article.title)}" style="width:100%;height:auto;margin-top:26px;border:1px solid var(--line);border-radius:3px;">\n` : ''}
    <div class="art-body">${article.content || ''}</div>

    <div class="art-cta" id="wechat">
      <figure class="stamp"><img src="/assets/qr.jpg" alt="刘诠案的微信二维码"></figure>
      <div>
        <h3>你公司里有没有类似的情况？</h3>
        <p>加微信说一句，免费聊三十分钟。说清楚你是哪个城市、什么行业、卡在哪一步就行。</p>
        <a class="btn btn-dark" href="#wechat" data-book style="margin-top:14px;">预约诊断 <span class="min">30 MIN</span> <span class="arw">→</span></a>
      </div>
    </div>
  </div>
</article>

<footer class="foot">
  <div class="wrap foot-in">
    <span>友情链接：<a href="https://g.baijingzixun.top">百鲸G系统</a> ↗ <a href="https://jingxuan-worker.pages.dev">鲸选工作台</a> ↗ <a href="https://consultant-club.pages.dev/">consultant-club</a> ↗</span>
    <span>AI培训 · 提效咨询 · FDE落地实施 ｜ 到场半径两小时</span>
    <a href="https://beian.miit.gov.cn" rel="noopener">浙ICP备2023042992号</a>
  </div>
</footer>

<script src="/booking.js" defer></script>
</body>
</html>`;
}

/** 给 styles.css / booking.js 的引用加版本号，破缓存（GitHub Pages 的 max-age=600
 *  会导致样式更新后老访客最多 10 分钟看到旧排版） */
function addCacheBusting() {
  for (const f of readdirSync(DIST).filter(f => f.endsWith('.html'))) {
    const p = join(DIST, f);
    const html = readFileSync(p, 'utf8');
    const next = html
      .replace(/(href="\/?)styles\.css(")/g, `$1styles.css?v=${ASSET_VER}$2`)
      .replace(/(src="\/?)booking\.js(")/g, `$1booking.js?v=${ASSET_VER}$2`)
      .replace(/(src="\/?)share-card\.js(")/g, `$1share-card.js?v=${ASSET_VER}$2`);
    if (next !== html) writeFileSync(p, next);
  }
}

/* ------------------------------------------------------------------
   存量功能页仍依赖 Tailwind / FontAwesome CDN → 本地化
   （v2 页面零外部依赖，这一遍对它们是无操作）
   ------------------------------------------------------------------ */
function localizeExternalAssets() {
  const extractedStyles = [];
  const processDirectory = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        processDirectory(path);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.html')) continue;

      const html = readFileSync(path, 'utf8');
      const next = html
        .replace(/<script\s+src="https:\/\/cdn\.tailwindcss\.com"><\/script>/g, '<link rel="stylesheet" href="/tailwind.css">')
        .replace(/<link\b[^>]*href="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.5\.1\/css\/all\.min\.css"[^>]*>/g, '<link rel="stylesheet" href="/assets/fontawesome/css/all.min.css">')
        .replace(/<script>\s*tailwind\.config\s*=[\s\S]*?<\/script>/g, '');
      if (next === html) continue;

      writeFileSync(path, next.replace(/<style\s+type="text\/tailwindcss">([\s\S]*?)<\/style>/g, (_, css) => {
        extractedStyles.push(css);
        return '';
      }));
    }
  };
  processDirectory(DIST);

  const tailwindInput = `${readFileSync(join(ROOT, 'tailwind.css'), 'utf8')}\n${extractedStyles.join('\n')}`;
  const hasTailwindPages = readdirSync(DIST).some(f => f.endsWith('.html')) &&
    readdirSync(DIST).filter(f => f.endsWith('.html')).some(f => readFileSync(join(DIST, f), 'utf8').includes('/tailwind.css'));

  const fontAwesomeDir = join(ROOT, 'node_modules', '@fortawesome', 'fontawesome-free');
  if (existsSync(fontAwesomeDir)) {
    const cssDir = join(DIST, 'assets', 'fontawesome', 'css');
    mkdirSync(cssDir, { recursive: true });
    copyFileSync(join(fontAwesomeDir, 'css', 'all.min.css'), join(cssDir, 'all.min.css'));
    copyDir(join(fontAwesomeDir, 'webfonts'), join(DIST, 'assets', 'fontawesome', 'webfonts'));
  }

  if (!hasTailwindPages) return;

  // 中间文件写到系统临时目录：放 dist 里还要删一次，而本机 fs 的删除会被
  // safe-delete shim 接管（偶发 ETIMEDOUT 直接让构建失败）
  const inputPath = join(tmpdir(), `baijing-tailwind-${process.pid}-${Date.now()}.css`);
  writeFileSync(inputPath, tailwindInput);
  execFileSync(process.execPath, [
    join(ROOT, 'node_modules', 'tailwindcss', 'lib', 'cli.js'),
    '-c', join(ROOT, 'tailwind.config.cjs'),
    '-i', inputPath,
    '-o', join(DIST, 'tailwind.css'),
    '--minify'
  ], { cwd: ROOT, stdio: 'inherit' });
}

function generateSitemap(articles, stories = []) {
  const staticUrls = [
    { loc: `${SITE_URL}/`, lastmod: V2_REV, freq: 'weekly', pri: '1.0' },
    { loc: `${SITE_URL}/ai-training.html`, lastmod: V2_REV, freq: 'monthly', pri: '0.9' },
    { loc: `${SITE_URL}/efficiency.html`, lastmod: V2_REV, freq: 'monthly', pri: '0.9' },
    { loc: `${SITE_URL}/stories.html`, lastmod: V2_REV, freq: 'weekly', pri: '0.8' },
    ...stories.filter(s => !s.pending).map(s => ({
      loc: `${SITE_URL}/${s.href}`,
      lastmod: s.date || V2_REV,
      freq: 'monthly', pri: '0.7'
    })),
    ...articles.map(a => ({
      loc: `${SITE_URL}/article/${a.id}.html`,
      lastmod: formatDate(a.updated_at || a.created_at) || V2_REV,
      freq: 'yearly', pri: '0.6'
    })),
    { loc: `${SITE_URL}/%E7%9B%AE%E6%A0%87%E6%B5%8B%E7%AE%97%E5%B7%A5%E5%85%B7.html`, lastmod: '2026-06-12', freq: 'yearly', pri: '0.5' },
    { loc: `${SITE_URL}/%E6%88%98%E7%95%A5%E8%A7%A3%E7%A0%81%E5%B7%A5%E5%85%B7.html`, lastmod: '2026-06-12', freq: 'yearly', pri: '0.5' },
    { loc: `${SITE_URL}/%E7%BB%84%E7%BB%87%E6%9E%B6%E6%9E%84%E7%94%9F%E6%88%90%E5%B7%A5%E5%85%B7.html`, lastmod: '2026-06-12', freq: 'yearly', pri: '0.5' },
    { loc: `${SITE_URL}/%E8%82%A1%E6%9D%83%E6%9E%B6%E6%9E%84%E7%94%9F%E6%88%90%E5%B7%A5%E5%85%B7.html`, lastmod: '2026-06-12', freq: 'yearly', pri: '0.5' },
    { loc: `${SITE_URL}/%E4%BC%81%E4%B8%9A%E8%AF%8A%E6%96%AD.html`, lastmod: '2026-09-04', freq: 'yearly', pri: '0.5' }
  ];
  const urls = staticUrls.map(u =>
    `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  console.log('🔄 正在从 Supabase 获取文章数据...');
  let articles = [];
  try {
    articles = await fetchArticles();
    console.log(`✅ 共获取 ${articles.length} 篇文章`);
  } catch (err) {
    // 首页/服务页不依赖文章数据。Supabase 抖动不应该让整站发布失败，
    // 只降级为「本轮不生成历史文章页」，站点其余部分照常上线。
    console.warn('⚠️  文章数据获取失败，本轮跳过历史文章页生成：', err.message || err);
  }

  if (!existsSync(DIST)) mkdirSync(DIST, { recursive: true });

  // 1) 旧版功能页与存量资源
  copyStaticFiles();

  // 2) v2 站点（复制到根，可覆盖 404.html 等同名旧文件）
  copyV2Site();

  // 2.5) 翻车实录索引（数据源 v2/_data/stories.json）
  const stories = loadStories().items || [];
  renderStoryLists(stories);
  console.log(`✅ 翻车实录索引已渲染（${stories.length} 篇）`);

  // 3) 历史文章静态页（v2 视觉）
  if (articles.length) {
    const articleDir = join(DIST, 'article');
    mkdirSync(articleDir, { recursive: true });
    for (const article of articles) {
      writeFileSync(join(articleDir, `${article.id}.html`), generateArticleHtml(article));
    }
    console.log(`✅ ${articles.length} 个文章页面已生成到 dist/article/`);
  }

  // 4) 资源版本号破缓存 + 存量页面外部依赖本地化
  addCacheBusting();
  localizeExternalAssets();

  // 5) sitemap
  writeFileSync(join(DIST, 'sitemap.xml'), generateSitemap(articles, stories));
  const urlCount = articles.length + stories.filter(s => !s.pending).length + 9;
  console.log(`✅ sitemap.xml 已生成（${urlCount} 个 URL）`);

  console.log('🎉 构建完成！输出目录：dist/');
}

// 允许被测试脚本 import 而不自动执行
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error('❌ 构建失败:', err);
    process.exit(1);
  });
}

export { generateArticleHtml, generateSitemap, copyV2Site };
