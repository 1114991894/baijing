/**
 * 百鲸咨询 站点构建
 * ---------------------------------------------------------------
 * 线上站点主体 = mockup-v3/（2026-11 新设计：首页 / 产品 / 资讯 / 文章）
 *   mockup-v3/index.html / products.html / articles.html / article.html
 *   mockup-v3/styles.css → dist/styles-v3.css（改名避免覆盖 v2 遗留页样式）
 *   mockup-v3/booking.js → dist/booking-v3.js（同上）
 *   mockup-v3/assets/* → dist/assets/*
 *
 * v2/ 仍完整保留在仓库（回滚用），其页面与 /article/{id}.html 的旧链接继续
 * 可访问，样式仍用 v2 的 styles.css —— 两套样式文件名隔离，互不覆盖。
 *
 * 更老的 index.html 是再上一版首页，已不再部署，仅作备份/回滚参考。
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
const V3 = join(ROOT, 'mockup-v3');
const SITE_URL = 'https://baijingzixun.top';

// v2 站点的内容版本日期（内容有实质改动时手动更新，不要用构建当天日期，
// 否则每次 CI 都会把所有页面的 lastmod 刷成当天，对搜索引擎是噪声）
const V2_REV = '2026-10-19';
// v3 内容版本日期（实质改动时手动更新）
const V3_REV = '2026-11-27';
// 静态资源版本号：styles.css / booking.js 内容有变化时 +1（或改日期），
// 构建时自动给所有页面的引用加 ?v=，强制访客浏览器丢弃旧缓存
const ASSET_VER = '20261127-8';

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
    // 与资讯页一致：featured=false 是 DRAFT「即将发布」，不生成公开文章页、不进 sitemap
    .eq('featured', true)
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
  'assets/favicon.png', 'assets/apple-touch-icon.png', 'assets/share-logo.png',
  'assets/cropper.min.css', 'assets/cropper.min.js'];

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

/* ------------------------------------------------------------------
   v3 站点：四页 + 样式 + 脚本 + assets + 客户 logo，复制到 dist 根目录。
   样式/脚本改名为 *-v3.*，避免覆盖 v2 遗留页（stories/article 等）的资源。
   ------------------------------------------------------------------ */
const V3_PAGES = ['index.html', 'products.html', 'articles.html', 'article.html'];
function copyV3Site(articles = []) {
  for (const f of V3_PAGES) {
    const src = join(V3, f);
    if (!existsSync(src)) throw new Error(`v3 页面缺失：${f}（构建中止，避免线上白页）`);
    let html = readFileSync(src, 'utf8')
      .replace(/(href=")styles\.css(")/g, '$1styles-v3.css$2')
      .replace(/(src=")booking\.js(")/g, '$1booking-v3.js$2');
    if (f === 'article.html') {
      // v3 精修文章页对应的是首篇（"你公司不是缺 AI"），按 sort_order 注入上下篇导航
      const cur = articles.find(a => articleHref(a) === '/article.html') || articles[0];
      html = html.replace('<!--ART_NAV-->', articleNavHtml(cur, articles));
    }
    writeFileSync(join(DIST, f), html);
  }
  copyFileSync(join(V3, 'styles.css'), join(DIST, 'styles-v3.css'));
  copyFileSync(join(V3, 'booking.js'), join(DIST, 'booking-v3.js'));
  const assetDir = join(V3, 'assets');
  for (const f of readdirSync(assetDir)) {
    if (existsSync(join(assetDir, f))) copyFileSync(join(assetDir, f), join(DIST, 'assets', f));
  }
  copyDir(join(V3, 'logos'), join(DIST, 'logos'));
  console.log('✅ v3 站点已复制到 dist 根目录（4 页 + 隔离样式/脚本 + assets/logos）');
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
    ? `${escapeHtml(s.meta)} · 要点：${escapeHtml(s.breakpoint)}`
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
          <span class="t">全部工作台提效实录</span>
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
  const dirs = ['logos']; // 旧首页合作客户墙的 logo 资源，v2 首页「合作客户」复用

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
   文章导航：上一篇 / 下一篇。排序与资讯页一致（sort_order 越大越靠前）。
   首篇仍用 v3 精修静态版 article.html，其余走构建生成的 /article/{id}.html
   ------------------------------------------------------------------ */
function articleHref(a) {
  return (a.title && a.title.indexOf('你公司不是缺 AI') === 0)
    ? '/article.html'
    : '/article/' + encodeURIComponent(a.id) + '.html';
}

function articleNavHtml(current, articles) {
  if (!current || !Array.isArray(articles) || articles.length < 2) return '';
  const list = [...articles].sort((a, b) =>
    (b.sort_order ?? 0) - (a.sort_order ?? 0) ||
    new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );
  const i = list.findIndex(a => a.id === current.id);
  if (i < 0) return '';
  const prev = i > 0 ? list[i - 1] : null;
  const next = i < list.length - 1 ? list[i + 1] : null;
  if (!prev && !next) return '';
  const item = (a, kind) => '<a class="' + kind + '" href="' + articleHref(a) + '">'
    + '<span class="n">' + (kind === 'prev' ? '← 上一篇' : '下一篇 →') + '</span>'
    + '<span class="t">' + escapeHtml(a.title) + '</span></a>';
  return '<nav class="art-nav" aria-label="文章导航">'
    + (prev ? item(prev, 'prev') : '<span class="empty"></span>')
    + (next ? item(next, 'next') : '<span class="empty"></span>')
    + '</nav>';
}

/* ------------------------------------------------------------------
   文章静态页：与 v3 精修版 article.html 同版式（顶栏 / 正文 / 底栏一致）
   注意页面在 /article/ 深路径，所有资源必须用根绝对路径
   ------------------------------------------------------------------ */
function generateArticleHtml(article, articles) {
  const artNav = articleNavHtml(article, articles);
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
<title>${escapeHtml(article.title)} | 百鲸咨询</title>
<meta name="description" content="${escapeHtml(excerpt || '百鲸咨询 · 组织人效观点与实践')}">
<link rel="canonical" href="${articleUrl}">
<link rel="icon" href="/assets/favicon.png">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(article.title)}">
<meta property="og:description" content="${escapeHtml(excerpt)}">
<meta property="og:url" content="${articleUrl}">
<meta property="og:site_name" content="百鲸咨询">
${cover ? `<meta property="og:image" content="${escapeHtml(cover)}">` : ''}
<link rel="stylesheet" href="/styles-v3.css">
<script type="application/ld+json">${jsonLd(ld)}</script>
</head>
<body>

<nav class="nav">
  <div class="wrap nav-in">
    <a class="logo" href="/index.html"><picture><source srcset="/assets/logo-white.webp" type="image/webp"><img src="/assets/logo-white.png" alt="百鲸咨询"></picture></a>
    <div class="nav-links">
      <a href="/index.html">首页</a>
      <a href="/products.html">产品</a>
      <a href="/articles.html" class="active">资讯</a>
      <a href="/index.html#contact" class="nav-cta" data-book>预约诊断</a>
    </div>
  </div>
</nav>

<header class="article-hero">
  <div class="wrap">
    <div class="cat">观点 · ${escapeHtml(category)}</div>
    <h1>${escapeHtml(article.title)}</h1>
    <div class="meta"><span>${escapeHtml(author)}</span><span>${createdAt}</span><span>百鲸咨询</span></div>
  </div>
</header>

<main class="article-body">
${cover ? `  <figure class="op-img" style="margin-bottom:40px">\n    <img src="${escapeHtml(cover)}" alt="${escapeHtml(article.title)}">\n    <figcaption>${escapeHtml(article.title)}（配图）</figcaption>\n  </figure>\n` : ''}${article.content || ''}
</main>

${artNav ? artNav + '\n\n' : ''}<div class="article-cta">
  <div class="box">
    <div>
      <h3>想判断你公司该从哪些任务切入？</h3>
      <p>组织人效诊断标配 AI 机会地图：2–3 周，找出最适合先落地的 3–5 个岗位任务。</p>
    </div>
    <img src="/assets/qr.jpg" alt="百鲸咨询微信二维码" style="width:120px;height:120px;border-radius:10px;flex:none;background:#fff;padding:6px;">
  </div>
</div>

<footer class="footer">
  <div class="wrap foot-row">
    <span class="fl">友情链接：</span>
    <a href="https://g.baijingzixun.top" target="_blank" rel="noopener">百鲸G系统 ↗</a>
    <a href="https://worker.baijingzixun.top" target="_blank" rel="noopener">鲸选工作台 ↗</a>
    <a href="https://consultant-club.pages.dev/" target="_blank" rel="noopener">consultant-club ↗</a>
    <span class="sep">｜</span>
    <a class="icp" href="https://beian.miit.gov.cn" target="_blank" rel="noopener">浙ICP备2023042992号</a>
  </div>
</footer>

<script src="/booking-v3.js"></script>
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
      .replace(/(src="\/?)share-card\.js(")/g, `$1share-card.js?v=${ASSET_VER}$2`)
      .replace(/(href="\/?)styles-v3\.css(")/g, `$1styles-v3.css?v=${ASSET_VER}$2`)
      .replace(/(src="\/?)booking-v3\.js(")/g, `$1booking-v3.js?v=${ASSET_VER}$2`);
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
        // admin 后台：境外 CDN 在国内不稳（supabase-js 挂起会导致登录无响应），全部本地化
        .replace(/<script\s+src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"><\/script>/g, '<script src="/assets/supabase.js"></script>')
        .replace(/<script\s+src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/cropperjs\/1\.6\.1\/cropper\.min\.js"><\/script>/g, '<script src="/assets/cropper.min.js"></script>')
        .replace(/<link\b[^>]*href="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/cropperjs\/1\.6\.1\/cropper\.min\.css"[^>]*>/g, '<link rel="stylesheet" href="/assets/cropper.min.css">')
        // Google Fonts 在国内常挂起且会阻塞后续脚本执行，直接移除（回退系统字体）
        .replace(/<link\b[^>]*fonts\.googleapis\.com[^>]*>/g, '')
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

  // admin 后台的 supabase-js 本地化（构建依赖 node_modules，Actions 云端同样可用）
  const supabaseUmd = join(ROOT, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js');
  if (existsSync(supabaseUmd)) {
    copyFileSync(supabaseUmd, join(DIST, 'assets', 'supabase.js'));
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
    { loc: `${SITE_URL}/`, lastmod: V3_REV, freq: 'weekly', pri: '1.0' },
    { loc: `${SITE_URL}/products.html`, lastmod: V3_REV, freq: 'monthly', pri: '0.9' },
    { loc: `${SITE_URL}/articles.html`, lastmod: V3_REV, freq: 'weekly', pri: '0.8' },
    { loc: `${SITE_URL}/article.html`, lastmod: V3_REV, freq: 'monthly', pri: '0.7' },
    { loc: `${SITE_URL}/ai-training.html`, lastmod: V2_REV, freq: 'monthly', pri: '0.9' },
    { loc: `${SITE_URL}/efficiency.html`, lastmod: V2_REV, freq: 'monthly', pri: '0.9' },
    { loc: `${SITE_URL}/jingxuan.html`, lastmod: V2_REV, freq: 'monthly', pri: '0.9' },
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

  // 2) v2 站点（遗留页兼容）→ v3 站点（新主体，覆盖同名页面）
  copyV2Site();
  copyV3Site(articles);

  // 2.5) 翻车实录索引（数据源 v2/_data/stories.json）
  const stories = loadStories().items || [];
  renderStoryLists(stories);
  console.log(`✅ 翻车实录索引已渲染（${stories.length} 篇）`);

  // 3) 历史文章静态页（v2 视觉）
  if (articles.length) {
    const articleDir = join(DIST, 'article');
    mkdirSync(articleDir, { recursive: true });
    for (const article of articles) {
      writeFileSync(join(articleDir, `${article.id}.html`), generateArticleHtml(article, articles));
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

export { generateArticleHtml, generateSitemap, copyV2Site, copyV3Site };
