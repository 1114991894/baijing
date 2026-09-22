import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, cpSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const DIST = join(ROOT, 'dist');
const SITE_URL = 'https://baijingzixun.top';

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

async function fetchArticles() {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('sort_order', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

function generateArticleHtml(article) {
  const coverImg = article.cover_url && !article.cover_url.startsWith('data:')
    ? article.cover_url
    : `${SITE_URL}/article-default-cover.svg`;
  const contentHtml = article.content || '';
  const excerpt = article.excerpt || '';
  const createdAt = formatDate(article.created_at);
  const author = article.author || '百鲸咨询';
  const articleUrl = `${SITE_URL}/article/${article.id}.html`;

  // 注意：静态文章页位于 /article/ 子目录，所有根级资源必须用绝对 URL，否则子目录下相对路径会 404
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(excerpt || '百鲸咨询 - 精选专业文章')}">
  <meta property="og:title" content="${escapeHtml(article.title)} - 百鲸咨询">
  <meta property="og:description" content="${escapeHtml(excerpt || '百鲸咨询 - 精选专业文章')}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${articleUrl}">
  <meta property="og:image" content="${coverImg}">
  <meta property="og:site_name" content="百鲸咨询">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(article.title)} - 百鲸咨询">
  <meta name="twitter:description" content="${escapeHtml(excerpt || '百鲸咨询 - 精选专业文章')}">
  <meta name="twitter:image" content="${coverImg}">
  <link rel="canonical" href="${articleUrl}">
  <link rel="icon" href="${SITE_URL}/logo0（透明）.png">
  <title>${escapeHtml(article.title)} - 百鲸咨询</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script>tailwind.config={theme:{extend:{colors:{primary:'#083E78',accent:'#28B8A0',hover:'#22C0E0',section:'#F4FAFF',neutral:'#E2E8F0',secondary:'#333333'},fontFamily:{sans:['Noto Sans SC','system-ui','sans-serif']},boxShadow:{elevated:'0 10px 25px -5px rgba(0,0,0,.05), 0 8px 10px -6px rgba(0,0,0,.08)'}}}}</script>
  <style>
    body{font-family:'Noto Sans SC',sans-serif;color:#333;background:#F4FAFF}
    .prose img{max-width:100%;height:auto;border-radius:8px;margin:1rem 0}
    .prose h2{font-size:1.4rem;font-weight:700;margin:1.4rem 0 .6rem;color:#083E78}
    .prose h3{font-size:1.15rem;font-weight:700;margin:1.1rem 0 .5rem;color:#083E78}
    .prose p{line-height:1.9;margin:.7rem 0}
    .prose ul,.prose ol{margin:.6rem 0 1rem 1.4rem}
    .prose li{margin:.35rem 0;line-height:1.85}
    .prose a{color:#28B8A0;text-decoration:underline;font-weight:500}
    .prose a:hover{color:#22C0E0}
    .prose table{width:100%;border-collapse:collapse;margin:1rem 0;font-size:15px}
    .prose th,.prose td{border:1px solid #E2E8F0;padding:8px 12px;text-align:left}
    .prose th{background:#F4FAFF;color:#083E78;font-weight:600}
    .prose blockquote{border-left:4px solid #28B8A0;background:#F4FAFF;padding:12px 16px;margin:1rem 0;color:#555;border-radius:0 8px 8px 0}
    .prose blockquote p{margin:.3rem 0}
    .prose hr{border:none;border-top:1px solid #E2E8F0;margin:1.6rem 0}
    .btn-secondary{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 16px;border-radius:8px;font-weight:600;font-size:14px;color:#083E78;background:#fff;border:1px solid #E2E8F0;transition:all .3s ease;text-decoration:none;white-space:nowrap}
    .btn-secondary:hover{color:#fff;background:#083E78;border-color:#083E78}
  </style>
  <!-- 全站统一样式：导航栏深色玻璃风与首页保持一致（绝对路径，文章页在 /article/ 子目录） -->
  <link rel="stylesheet" href="${SITE_URL}/premium-enhance.css">
</head>
<body>
  <header class="sticky top-0 z-50 bg-white shadow-sm border-b border-neutral/20">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
      <a href="${SITE_URL}/index.html" class="flex items-center">
        <img src="${SITE_URL}/logo0（透明）.png" style="width:25vw;max-width:140px;min-width:80px;height:auto;object-fit:contain;" alt="百鲸咨询logo">
      </a>
      <a href="${SITE_URL}/index.html" class="btn-secondary text-sm"><i class="fas fa-arrow-left mr-1"></i> 返回首页</a>
    </div>
  </header>

  <main class="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <article class="max-w-4xl mx-auto bg-white rounded-2xl shadow-elevated border border-neutral/20 p-6 sm:p-8 md:p-10">
      <img src="${escapeHtml(article.cover_url || `${SITE_URL}/article-default-cover.svg`)}" class="w-full rounded-xl mb-6 object-cover max-h-96" alt="${escapeHtml(article.title)}">
      <div class="flex flex-wrap items-center text-sm text-secondary/50 mb-4 gap-2">
        <span><i class="far fa-calendar-alt mr-1"></i>${createdAt}</span>
        <span>·</span><span><i class="far fa-user mr-1"></i>${escapeHtml(author)}</span>
        <span>·</span><span><i class="far fa-folder mr-1"></i>${escapeHtml(article.category || '咨询')}</span>
      </div>
      <h1 class="text-2xl md:text-3xl font-bold text-secondary mb-4 leading-snug">${escapeHtml(article.title)}</h1>
      ${excerpt ? `<p class="text-secondary/70 text-lg mb-6 border-l-4 border-accent pl-4">${escapeHtml(excerpt)}</p>` : ''}
      <div class="prose">${contentHtml}</div>
    </article>
  </main>

  <footer class="bg-primary text-white text-center py-6 mt-12">
    <div class="container mx-auto px-4 text-sm">
      <p>&copy; 2026 百鲸咨询. All rights reserved.</p>
      <p class="mt-1 text-blue-200">专注于企业战略落地·组织优化·股权激励·数字化转型</p>
    </div>
  </footer>
  <script src="${SITE_URL}/premium-enhance.js"></script>
</body>
</html>`;
}

function generateIndexHtml(articles) {
  // 关键修复：不再整页重造首页（那会把 banner 轮播 / 产品模块 / 联系我们等全部内容丢掉）。
  // 正确做法：以源目录 index.html（完整版首页）为基础，仅把「精选文章」容器里的
  // 「加载中...」占位替换为预渲染文章卡片，供爬虫抓取与首屏直出。
  // 页面加载后，index.html 自带的 Supabase 动态加载逻辑会接管该容器（分页渲染），互不冲突。
  const src = readFileSync(join(ROOT, 'index.html'), 'utf8');

  const placeholder = [
    '          <div class="text-center text-secondary/60 py-12" data-page-node-id="YCFMRSdz4Ewf4ZAqrU3CHA">',
    '            <i class="fas fa-spinner fa-spin text-2xl mb-4" data-page-node-id="nBzLjT0lMmgkMWCJMstuhn"></i>',
    '            <p data-page-node-id="RsGqTT4KDx1cpTbm3e5V1V">加载中...</p>',
    '          </div>'
  ].join('\n');

  if (!src.includes(placeholder)) {
    throw new Error('未在源 index.html 中找到文章占位符（articlesContainer 内的加载中块），请检查结构后再构建');
  }

  const articleCards = articles.map(a => {
    const coverImg = a.cover_url && !a.cover_url.startsWith('data:')
      ? a.cover_url
      : 'article-default-cover.svg';
    return `<article class="article-card flex flex-col">
          <a href="article/${a.id}.html" class="block shrink-0 overflow-hidden">
            <img src="${escapeHtml(coverImg)}" alt="${escapeHtml(a.title)}" class="w-full h-48 object-cover" loading="lazy">
          </a>
          <div class="p-6 flex-1 flex flex-col">
            <div class="flex items-center text-[12.5px] text-secondary/45 mb-3 shrink-0 tracking-wide">
              <span><i class="far fa-calendar-alt mr-1"></i>${formatDate(a.created_at)}</span>
              <span class="mx-2">·</span>
              <span><i class="far fa-user mr-1"></i>${escapeHtml(a.author || '百鲸咨询')}</span>
            </div>
            <a href="article/${a.id}.html" class="article-title mb-3 line-clamp-2">${escapeHtml(a.title)}</a>
            <p class="text-secondary/65 leading-relaxed mb-4 text-[14px] line-clamp-3 flex-1">${escapeHtml(a.excerpt || '')}</p>
            <a href="article/${a.id}.html" class="article-more mt-auto">
              阅读更多 <i class="fas fa-arrow-right text-xs"></i>
            </a>
          </div>
        </article>`;
  }).join('\n          ');

  return src.replace(placeholder, articleCards);
}

function copyStaticFiles() {
  // 注意：index.html 使用构建生成的预渲染版，不从这里复制覆盖。
  // article-detail.html 保留源目录原版（含 JS 动态加载逻辑，兼容 /article-detail.html?id= 旧链接）。
  const staticFiles = [
    'article-detail.html', 'article-default-cover.svg',
    'home-banner.png', 'logo0（透明）.png', 'CNAME', 'robots.txt',
    '_redirects', '404.html',
    'home-banner.svg', 'home-banner-诊断.svg', 'wechat-qrcode.jpg',
    // 全站动效/导航栏统一样式（子页面全部引用，必须复制，否则线上 404 → 导航栏样式不生效）
    'premium-enhance.css', 'premium-enhance.js',
    // 工具页面：sitemap 中已声明这些 URL，必须复制到 dist，否则搜索引擎抓取 404
    '目标测算工具.html', '战略解码工具.html', '组织架构生成工具.html', '股权架构生成工具.html',
    // 管理后台（robots.txt 已 Disallow，不参与收录，但必须可访问）
    'admin.html', '咨询师登录页面.html', '企业诊断.html',
    // 合作客户 logo 墙
    'logos/baishi.jpeg', 'logos/baosheng.png', 'logos/meimin.png', 'logos/putuoshan.jpg',
    'logos/zhidao.jpg', 'logos/zhiwuyan.jpg', 'logos/zhongjian.jpg', 'logos/zhongnan.jpeg',
    'logos/zhongtian.jpg', 'logos/zhongtong.jpg'
  ];
  const dirs = ['articles', 'api'];
  const consultantImgs = ['consultant-lilaoshi.png', 'consultant-liuquanan.png', 'consultant-wanglaoshi.png', '刘诠案老师.jpg', '微信公众号.jpg', '企业诊断.html'];

  // 复制文件
  for (const f of [...staticFiles, ...consultantImgs]) {
    const src = join(ROOT, f);
    const dest = join(DIST, f);
    if (existsSync(src)) {
      const destDir = dirname(dest);
      if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
      copyFileSync(src, dest);
    }
  }
  // 复制目录
  for (const d of dirs) {
    const src = join(ROOT, d);
    const dest = join(DIST, d);
    if (existsSync(src)) {
      if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
      cpSync(src, dest, { recursive: true });
    }
  }
}

function generateSitemap(articles) {
  const today = new Date().toISOString().slice(0, 10);
  const staticUrls = [
    { loc: `${SITE_URL}/`, lastmod: '2026-09-03', freq: 'weekly', pri: '1.0' },
    ...articles.map(a => ({ loc: `${SITE_URL}/article/${a.id}.html`, lastmod: today, freq: 'daily', pri: '0.9' })),
    { loc: `${SITE_URL}/%E7%9B%AE%E6%A0%87%E6%B5%8B%E7%AE%97%E5%B7%A5%E5%85%B7.html`, lastmod: '2026-06-12', freq: 'monthly', pri: '0.8' },
    { loc: `${SITE_URL}/%E6%88%98%E7%95%A5%E8%A7%A3%E7%A0%81%E5%B7%A5%E5%85%B7.html`, lastmod: '2026-06-12', freq: 'monthly', pri: '0.8' },
    { loc: `${SITE_URL}/%E7%BB%84%E7%BB%87%E6%9E%B6%E6%9E%84%E7%94%9F%E6%88%90%E5%B7%A5%E5%85%B7.html`, lastmod: '2026-06-12', freq: 'monthly', pri: '0.8' },
    { loc: `${SITE_URL}/%E8%82%A1%E6%9D%83%E6%9E%B6%E6%9E%84%E7%94%9F%E6%88%90%E5%B7%A5%E5%85%B7.html`, lastmod: '2026-06-12', freq: 'monthly', pri: '0.8' },
    { loc: `${SITE_URL}/%E4%BC%81%E4%B8%9A%E8%AF%8A%E6%96%AD.html`, lastmod: '2026-09-04', freq: 'monthly', pri: '0.8' }
  ];
  const urls = staticUrls.map(u =>
    `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  console.log('🔄 正在从 Supabase 获取文章数据...');
  const articles = await fetchArticles();
  console.log(`✅ 共获取 ${articles.length} 篇文章`);

  if (!existsSync(DIST)) mkdirSync(DIST, { recursive: true });

  // 生成首页
  const indexHtml = generateIndexHtml(articles);
  writeFileSync(join(DIST, 'index.html'), indexHtml);
  console.log('✅ dist/index.html 已生成');

  // 生成每篇文章的独立静态页面
  const articleDir = join(DIST, 'article');
  if (!existsSync(articleDir)) mkdirSync(articleDir, { recursive: true });

  for (const article of articles) {
    const html = generateArticleHtml(article);
    writeFileSync(join(DIST, 'article', `${article.id}.html`), html);
  }
  console.log(`✅ ${articles.length} 个文章页面已生成到 dist/article/`);

  // 复制静态资源（index.html 已由构建生成预渲染版；article-detail.html 保留原版 JS 逻辑）
  copyStaticFiles();

  // 生成 sitemap（覆盖复制过来的旧版）
  const sitemap = generateSitemap(articles);
  writeFileSync(join(DIST, 'sitemap.xml'), sitemap);
  console.log(`✅ sitemap.xml 已生成（${articles.length + 6} 个 URL）`);

  console.log('✅ 所有静态页面已生成到 dist/');
  console.log('🎉 构建完成！');
}

main().catch(err => {
  console.error('❌ 构建失败:', err);
  process.exit(1);
});
