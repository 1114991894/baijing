/**
 * 新增一篇「AI落地翻车实录」
 * ---------------------------------------------------------------
 * 用法：node new-story.mjs <文章.json>
 *
 * 输入 JSON（UTF-8）：
 * {
 *   "title": "标题（不带句号）",
 *   "description": "meta description，80~160 字",
 *   "meta": "苏州 · 制造 · AI质检 · 2026.08",          // 列表里显示的地点/行业/主题/月份
 *   "breakpoint": "检出之后没人处理，报警成了噪音",      // 断点一句话，索引页会显示
 *   "date": "2026-10-21",                              // 发布日 YYYY-MM-DD
 *   "kicker": "翻车实录 04",                            // 可省略，默认按序号生成
 *   "body": "<h2>现场：...</h2><p>...</p>..."          // 正文 HTML，h2/p/b/ul/blockquote 可用
 * }
 *
 * 脚本会：
 *   1. 计算下一个序号 N（现有最大序号 + 1），生成 v2/story-N.html
 *   2. 把条目写进 v2/_data/stories.json（列表顺序由 build.mjs 渲染，不用手改 HTML）
 * 之后跑 `node build.mjs` 验证，再 git push 触发部署。
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const V2 = join(__dirname, 'v2');
const DATA = join(V2, '_data', 'stories.json');
const SITE_URL = 'https://baijingzixun.top';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('用法：node new-story.mjs <文章.json>');
  process.exit(1);
}

const a = JSON.parse(readFileSync(resolve(inputPath), 'utf8'));
for (const k of ['title', 'description', 'meta', 'breakpoint', 'date', 'body']) {
  if (!a[k]) {
    console.error(`❌ 缺少字段：${k}`);
    process.exit(1);
  }
}
if (/<script/i.test(a.body)) {
  console.error('❌ 正文不允许包含 <script>');
  process.exit(1);
}

const store = existsSync(DATA) ? JSON.parse(readFileSync(DATA, 'utf8')) : { items: [] };
const items = store.items || [];
const no = items.reduce((m, s) => Math.max(m, s.no || 0), 0) + 1;
const href = no === 1 ? 'story.html' : `story-${no}.html`;
const outPath = join(V2, href);
if (existsSync(outPath)) {
  console.error(`❌ ${href} 已存在，拒绝覆盖`);
  process.exit(1);
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jsonLd = o => JSON.stringify(o).replace(/</g, '\\u003c');
const kicker = a.kicker || `翻车实录 ${String(no).padStart(2, '0')}`;
const url = `${SITE_URL}/${href}`;

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(a.title)} —— 翻车实录</title>
<meta name="description" content="${esc(a.description)}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/png" href="assets/favicon.png">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
<link rel="stylesheet" href="styles.css">
<script type="application/ld+json">${jsonLd({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: a.title,
  description: a.description,
  datePublished: a.date,
  author: { '@type': 'Organization', name: '百鲸咨询' },
  publisher: { '@type': 'Organization', name: '百鲸咨询' },
  articleSection: 'AI落地翻车实录',
  mainEntityOfPage: url
})}</script>
</head>
<body>

<header class="topbar">
  <div class="wrap topbar-in">
    <a class="brand" href="index.html"><img src="assets/logo.png" alt="百鲸咨询" width="85" height="30"></a>
    <nav class="topnav" aria-label="站内页面">
      <a href="index.html">首页</a>
      <a href="ai-training.html">AI培训</a>
      <a href="efficiency.html">提效咨询</a>
      <a class="nav-hot" href="stories.html">翻车实录</a>
    </nav>
  </div>
</header>

<article class="article">
  <div class="wrap narrow">
    <a class="back" href="stories.html">← 返回翻车实录</a>
    <p class="kicker">${esc(kicker)}</p>
    <h1 style="font-size:clamp(26px,4vw,40px);">${esc(a.title)}</h1>
    <p class="art-meta">${esc(a.meta)} · 现场记录，公司做匿名处理</p>

${a.body}

    <div class="art-cta" id="wechat">
      <figure class="stamp"><img src="assets/qr.jpg" alt="刘诠案的微信二维码"></figure>
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
    <span><a href="https://g.baijingzixun.top">百鲸G系统</a> · <a href="https://jingxuan-worker.pages.dev">鲸选工作台</a></span>
    <span>AI培训 · 提效咨询 · FDE落地实施 ｜ 到场半径两小时</span>
    <a href="https://beian.miit.gov.cn" rel="noopener">浙ICP备2023042992号</a>
  </div>
</footer>

<script src="booking.js" defer></script>
</body>
</html>
`;

writeFileSync(outPath, html);

items.push({
  no,
  href,
  title: a.title,
  meta: a.meta,
  breakpoint: a.breakpoint,
  date: a.date
});
store.items = items;
store.updated = a.date;
writeFileSync(DATA, JSON.stringify(store, null, 2) + '\n');

console.log(`✅ 已生成 v2/${href}（第 ${no} 篇）`);
console.log(`✅ 已写入 v2/_data/stories.json（共 ${items.length} 篇）`);
console.log('下一步：node build.mjs → 校验 → git add -A && git commit && git push');
