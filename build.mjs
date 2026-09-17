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
  <title>${escapeHtml(article.title)} - 百鲸咨询</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script>tailwind.config={theme:{extend:{colors:{primary:'#083E78',accent:'#28B8A0',hover:'#22C0E0',section:'#F4FAFF',neutral:'#E2E8F0',secondary:'#333333'},fontFamily:{sans:['Noto Sans SC','system-ui','sans-serif']}}}}</script>
  <style>body{font-family:'Noto Sans SC',sans-serif;color:#333;background:#F4FAFF}.prose img{max-width:100%;height:auto;border-radius:8px;margin:1rem 0}.prose h2{font-size:1.4rem;font-weight:700;margin:1.2rem 0 .6rem;color:#083E78}.prose p{line-height:1.9;margin:.6rem 0}.prose ul,.prose ol{margin:.6rem 0 1rem 1.4rem}.prose li{margin:.3rem 0}.prose a{color:#28B8A0;text-decoration:underline;font-weight:500}</style>
</head>
<body class="min-h-screen flex flex-col">
  <header class="bg-primary text-white shadow-lg">
    <div class="container mx-auto px-4 py-4 flex items-center justify-between">
      <a href="index.html" class="flex items-center gap-3 text-white no-underline">
        <img src="logo0（透明）.png" alt="百鲸咨询" class="h-10 w-10 rounded-full">
        <div>
          <div class="text-xl font-bold">百鲸咨询</div>
          <div class="text-xs text-blue-200">12年专注企业管理落地陪跑辅导</div>
        </div>
      </a>
      <nav class="hidden md:flex items-center gap-6 text-sm">
        <a href="index.html" class="hover:text-accent transition">首页</a>
        <a href="index.html#articles" class="hover:text-accent transition">文章</a>
        <a href="index.html#contact" class="hover:text-accent transition">联系</a>
      </nav>
    </div>
  </header>
  <main class="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
    <article class="max-w-4xl mx-auto bg-white rounded-2xl shadow-elevated border border-neutral/20 p-8 md:p-10">
      <img src="${escapeHtml(article.cover_url || 'article-default-cover.svg')}" class="w-full rounded-xl mb-6 object-cover max-h-96" alt="${escapeHtml(article.title)}">
      <div class="flex items-center text-sm text-secondary/50 mb-4 gap-2">
        <span><i class="far fa-calendar-alt mr-1"></i>${createdAt}</span>
        <span>·</span><span><i class="far fa-user mr-1"></i>${escapeHtml(author)}</span>
        <span>·</span><span><i class="far fa-folder mr-1"></i>${escapeHtml(article.category || '咨询')}</span>
      </div>
      <h1 class="text-3xl font-bold text-secondary mb-4">${escapeHtml(article.title)}</h1>
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
</body>
</html>`;
}

function generateIndexHtml(articles) {
  const articleCards = articles.map(a => {
    const coverImg = a.cover_url || `${SITE_URL}/article-default-cover.svg`;
    const excerpt = (a.excerpt || '').substring(0, 120) + '...';
    return `<div class="bg-white rounded-xl shadow-elevated border border-neutral/20 overflow-hidden hover:shadow-lg transition-all cursor-pointer group" onclick="location.href='article/${a.id}.html'">
      <div class="relative h-48 overflow-hidden">
        <img src="${escapeHtml(a.cover_url || 'article-default-cover.svg')}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="${escapeHtml(a.title)}">
        <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        <div class="absolute bottom-4 left-4 right-4">
          <span class="bg-accent/90 text-white text-xs px-3 py-1 rounded-full font-medium">${escapeHtml(a.category || '咨询')}</span>
        </div>
      </div>
      <div class="p-6">
        <h3 class="text-xl font-bold text-primary mb-3 group-hover:text-accent transition">${escapeHtml(a.title)}</h3>
        <p class="text-secondary/70 text-sm leading-relaxed mb-4 line-clamp-2">${escapeHtml(excerpt)}</p>
        <div class="flex items-center justify-between text-sm text-secondary/50">
          <span><i class="far fa-calendar-alt mr-1"></i>${formatDate(a.created_at)}</span>
          <span class="text-accent font-medium">阅读全文 →</span>
        </div>
      </div>
    </div>`;
  }).join('');

  const siteDesc = '百鲸咨询12年专注企业管理落地陪跑辅导，提供战略定位、组织优化、薪酬绩效、股权激励、数字化转型等服务，累计服务1000+企业。';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${siteDesc}">
  <meta property="og:title" content="百鲸咨询 - 12年专注企业管理落地陪跑辅导">
  <meta property="og:description" content="${siteDesc}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}/">
  <meta property="og:image" content="${SITE_URL}/logo0（透明）.png">
  <meta property="og:site_name" content="百鲸咨询">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="百鲸咨询 - 12年专注企业管理落地陪跑辅导">
  <meta name="twitter:description" content="${siteDesc}">
  <link rel="canonical" href="${SITE_URL}/">
  <title>百鲸咨询 - 12年专注企业管理落地陪跑辅导 | 战略定位·组织优化·股权激励</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script>tailwind.config={theme:{extend:{colors:{primary:'#083E78',accent:'#28B8A0',hover:'#22C0E0',section:'#F4FAFF',neutral:'#E2E8F0',secondary:'#333333'},fontFamily:{sans:['Noto Sans SC','system-ui','sans-serif']}}}}</script>
  <style>body{font-family:'Noto Sans SC',sans-serif;color:#333;background:#F4FAFF}.prose img{max-width:100%;height:auto;border-radius:8px;margin:1rem 0}.prose h2{font-size:1.4rem;font-weight:700;margin:1.2rem 0 .6rem;color:#083E78}.prose p{line-height:1.9;margin:.6rem 0}.prose ul,.prose ol{margin:.6rem 0 1rem 1.4rem}.prose li{margin:.3rem 0}.prose a{color:#28B8A0;text-decoration:underline;font-weight:500}.line-clamp-2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}</style>
</head>
<body class="min-h-screen flex flex-col">
  <header class="bg-primary text-white shadow-lg">
    <div class="container mx-auto px-4 py-4 flex items-center justify-between">
      <a href="index.html" class="flex items-center gap-3 text-white no-underline">
        <img src="logo0（透明）.png" alt="百鲸咨询" class="h-10 w-10 rounded-full">
        <div>
          <div class="text-xl font-bold">百鲸咨询</div>
          <div class="text-xs text-blue-200">12年专注企业管理落地陪跑辅导</div>
        </div>
      </a>
      <nav class="hidden md:flex items-center gap-6 text-sm">
        <a href="index.html" class="hover:text-accent transition">首页</a>
        <a href="index.html#articles" class="hover:text-accent transition">文章</a>
        <a href="index.html#contact" class="hover:text-accent transition">联系</a>
      </nav>
    </div>
  </header>
  <main class="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
    <div class="mb-12">
      <h2 class="text-3xl font-bold text-primary mb-2">精选文章</h2>
      <p class="text-secondary/60">深度洞察企业管理实践，助力企业战略落地</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${articleCards}</div>
  </main>
  <footer class="bg-primary text-white text-center py-6 mt-12">
    <div class="container mx-auto px-4 text-sm">
      <p>&copy; 2026 百鲸咨询. All rights reserved.</p>
      <p class="mt-1 text-blue-200">专注于企业战略落地·组织优化·股权激励·数字化转型</p>
    </div>
  </footer>
</body>
</html>`;
}

function copyStaticFiles() {
  const staticFiles = [
    'index.html', 'article-detail.html', 'article-default-cover.svg',
    'home-banner.png', 'logo0（透明）.png', 'CNAME', 'robots.txt',
    '_redirects', '404.html',
    'home-banner.svg', 'home-banner-诊断.svg', 'wechat-qrcode.jpg'
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

  // 生成通用的 article-detail.html（重定向到首页）
  writeFileSync(join(DIST, 'article-detail.html'), indexHtml);

  // 复制静态资源（不覆盖 index.html 和 article-detail.html）
  copyStaticFiles();

  console.log('✅ 所有静态页面已生成到 dist/');
  console.log('🎉 构建完成！');
}

main().catch(err => {
  console.error('❌ 构建失败:', err);
  process.exit(1);
});
