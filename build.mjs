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

  // 注意：静态文章页位于 /article/ 子目录，站点根级资源一律使用绝对 URL
  const HOME = `${SITE_URL}/`;
  const DIAG = `${SITE_URL}/%E4%BC%81%E4%B8%9A%E8%AF%8A%E6%96%AD.html`;
  const LOGO = `${SITE_URL}/logo0%EF%BC%88%E9%80%8F%E6%98%8E%EF%BC%89.png`;

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
  <link rel="icon" href="${LOGO}">
  <title>${escapeHtml(article.title)} - 百鲸咨询</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700;800&family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --ink-950:#03101F; --ink-900:#04182F; --ink-800:#062A50; --ink-700:#083E78;
      --brand:#28B8A0; --brand-2:#22C0E0;
      --hair-b:rgba(8,62,120,.10); --hair-w:rgba(255,255,255,.10);
      --font-num:'Sora','Noto Sans SC',system-ui,sans-serif;
      --txt:#0B2545; --muted:rgba(11,37,69,.55);
      --grad-accent:linear-gradient(135deg,#28B8A0,#22C0E0);
    }
    *{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{font-family:'Noto Sans SC',system-ui,sans-serif;color:var(--txt);background:#F4FAFF;line-height:1.6;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;min-height:100vh;display:flex;flex-direction:column}
    a{text-decoration:none;color:inherit}
    .container{max-width:1180px;margin:0 auto;padding:0 24px}
    .site-header{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.78);backdrop-filter:saturate(180%) blur(18px);-webkit-backdrop-filter:saturate(180%) blur(18px);border-bottom:1px solid rgba(8,62,120,.08);transition:background .35s,box-shadow .35s,border-bottom-color .35s}
    .site-header.scrolled{background:rgba(255,255,255,.94);box-shadow:0 10px 30px -18px rgba(8,62,120,.35);border-bottom-color:rgba(8,62,120,.12)}
    .nav-inner{max-width:1180px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px}
    .nav-logo img{width:25vw;max-width:140px;min-width:80px;height:auto;object-fit:contain;display:block}
    .nav-right{display:flex;align-items:center;gap:22px}
    .nav-link{position:relative;padding:8px 2px;font-size:15px;font-weight:500;letter-spacing:.01em;color:rgba(11,37,69,.72);transition:color .3s}
    .nav-link::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--grad-accent);border-radius:2px;transform:scaleX(0);transition:transform .35s cubic-bezier(.22,.61,.36,1)}
    .nav-link:hover{color:var(--ink-700)}
    .nav-link:hover::after{transform:scaleX(1)}
    .nav-cta{position:relative;overflow:hidden;background:linear-gradient(135deg,#083E78,#0B4E92);color:#fff;font-size:13.5px;font-weight:600;padding:10px 20px;border-radius:10px;box-shadow:0 8px 22px -10px rgba(8,62,120,.6);transition:transform .3s,box-shadow .3s}
    .nav-cta:hover{transform:translateY(-1px);box-shadow:0 12px 26px -10px rgba(8,62,120,.7)}
    .section-dark{position:relative;overflow:hidden;color:#fff;background:radial-gradient(900px 460px at 12% -12%,rgba(34,192,224,.22),transparent 62%),radial-gradient(760px 400px at 90% 6%,rgba(40,184,160,.17),transparent 64%),linear-gradient(165deg,#04182F 0%,#062A50 52%,#03101F 100%)}
    .section-dark::before{content:"";position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:62px 62px;-webkit-mask-image:radial-gradient(circle at 50% 26%,#000 0%,transparent 76%);mask-image:radial-gradient(circle at 50% 26%,#000 0%,transparent 76%)}
    .section-dark > *{position:relative;z-index:1}
    .section-dark::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;z-index:2;background:linear-gradient(90deg,transparent,rgba(40,184,160,.6),transparent)}
    .eyebrow{display:inline-flex;align-items:center;gap:10px;font-family:var(--font-num);font-size:11.5px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:var(--brand)}
    .eyebrow::before{content:"";width:24px;height:1px;background:currentColor;opacity:.75}
    .art-hero{padding:64px 0 132px}
    .art-hero-inner{max-width:860px;margin:0 auto}
    .art-hero .eyebrow{margin-bottom:22px}
    .art-hero h1{font-size:clamp(26px,3.6vw,42px);font-weight:800;line-height:1.32;letter-spacing:-.025em;color:#fff}
    .art-hero-meta{margin-top:26px;display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;font-size:13.5px;color:rgba(255,255,255,.55)}
    .art-hero-meta .chip{display:inline-flex;align-items:center;gap:6px;padding:5px 13px;border-radius:999px;border:1px solid rgba(40,184,160,.42);background:rgba(40,184,160,.12);color:#8FE3D2;font-size:12.5px;font-weight:600}
    .art-hero-meta span i{margin-right:5px;opacity:.8}
    .art-body-wrap{padding-bottom:84px;margin-top:-92px}
    .art-card{max-width:860px;margin:0 auto;background:#fff;border:1px solid var(--hair-b);border-radius:22px;box-shadow:0 40px 80px -46px rgba(8,62,120,.42);padding:52px 54px 54px}
    .art-cover{width:100%;border-radius:16px;margin-bottom:34px;max-height:400px;object-fit:cover;display:block}
    .art-excerpt{font-size:16.5px;line-height:1.9;color:rgba(11,37,69,.7);padding:18px 22px;margin-bottom:28px;border-radius:0 12px 12px 0;border-left:3px solid var(--brand);background:linear-gradient(135deg,rgba(40,184,160,.09),rgba(34,192,224,.05))}
    .prose{font-size:16px;line-height:1.95;color:rgba(11,37,69,.82)}
    .prose > *:first-child{margin-top:0}
    .prose p{margin:0 0 18px}
    .prose h1,.prose h2,.prose h3,.prose h4{color:var(--ink-700);font-weight:700;letter-spacing:-.01em;line-height:1.45;margin:36px 0 14px}
    .prose h2{font-size:21px;padding-left:15px;border-left:3px solid var(--brand)}
    .prose h3{font-size:18px}
    .prose h4{font-size:16.5px;color:var(--ink-800)}
    .prose ul,.prose ol{margin:0 0 18px 22px}
    .prose li{margin:7px 0}
    .prose li::marker{color:var(--brand)}
    .prose img{border-radius:12px;margin:24px 0;box-shadow:0 22px 46px -26px rgba(8,62,120,.32)}
    .prose blockquote{margin:24px 0;padding:18px 22px;background:linear-gradient(135deg,rgba(40,184,160,.09),rgba(34,192,224,.05));border-left:3px solid var(--brand);border-radius:0 12px 12px 0;color:rgba(11,37,69,.72);font-size:15.5px}
    .prose blockquote p:last-child{margin-bottom:0}
    .prose a{color:var(--brand);font-weight:600;border-bottom:1px solid rgba(40,184,160,.38)}
    .prose strong{color:var(--ink-800);font-weight:700}
    .prose code{background:rgba(8,62,120,.06);padding:2px 7px;border-radius:6px;font-size:13.5px;font-family:var(--font-num)}
    .prose pre{background:#04182F;color:#D8E9F5;padding:18px 20px;border-radius:14px;overflow:auto;margin:24px 0;font-size:13.5px;line-height:1.7}
    .prose pre code{background:none;padding:0;color:inherit}
    .prose table{width:100%;border-collapse:collapse;margin:24px 0;font-size:14.5px}
    .prose th,.prose td{border:1px solid var(--hair-b);padding:11px 13px;text-align:left}
    .prose th{background:rgba(40,184,160,.07);color:var(--ink-700);font-weight:700}
    .prose hr{border:none;height:1px;margin:34px 0;background:linear-gradient(90deg,transparent,rgba(8,62,120,.14),transparent)}
    .art-foot{max-width:860px;margin:26px auto 0;display:flex;justify-content:center}
    .art-back{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:var(--ink-700);padding:11px 22px;border-radius:11px;background:#fff;border:1px solid var(--hair-b);transition:border-color .3s,color .3s,transform .3s}
    .art-back:hover{border-color:rgba(40,184,160,.45);color:var(--brand);transform:translateY(-2px)}
    .art-cta{position:relative;overflow:hidden;max-width:860px;margin:30px auto 0;border-radius:22px;padding:40px 44px;color:#fff;text-align:center;background:radial-gradient(620px 300px at 15% -20%,rgba(34,192,224,.26),transparent 62%),linear-gradient(140deg,#062A50 0%,#083E78 60%,#04182F 100%);box-shadow:0 34px 70px -40px rgba(6,42,80,.6)}
    .art-cta h3{font-size:23px;font-weight:800;letter-spacing:-.02em;margin-bottom:12px}
    .art-cta p{font-size:14.5px;line-height:1.85;color:rgba(255,255,255,.7);max-width:520px;margin:0 auto 24px}
    .art-cta-actions{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
    .art-cta-actions a{display:inline-flex;align-items:center;gap:8px;padding:13px 26px;border-radius:12px;font-size:14.5px;font-weight:700;transition:transform .2s}
    .art-cta-primary{background:var(--grad-accent);color:#062451;box-shadow:0 12px 26px -10px rgba(40,184,160,.6)}
    .art-cta-ghost{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.26)}
    .art-cta-actions a:hover{transform:translateY(-2px)}
    .site-footer{position:relative;overflow:hidden;margin-top:auto;background:linear-gradient(180deg,#04182F 0%,#03101F 100%);color:rgba(255,255,255,.6);padding:42px 0 38px;font-size:13.5px}
    .site-footer::before{content:"";position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:56px 56px;-webkit-mask-image:radial-gradient(circle at 50% 0%,#000,transparent 70%);mask-image:radial-gradient(circle at 50% 0%,#000,transparent 70%)}
    .site-footer > *{position:relative;z-index:1}
    .site-footer .f-top{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
    .site-footer .f-brand{font-size:15px;font-weight:700;color:#fff;letter-spacing:.02em}
    .site-footer a{color:var(--brand)}
    .site-footer .f-line{color:rgba(255,255,255,.45)}
    @media (max-width:860px){.art-hero{padding:48px 0 118px}.art-card{padding:34px 26px 36px;border-radius:18px}.art-body-wrap{margin-top:-80px}.art-cta{padding:32px 24px}.nav-right .nav-link{display:none}}
    @media (max-width:600px){.prose{font-size:15.5px}.prose h2{font-size:19px}.art-cover{margin-bottom:24px}}
  </style>
</head>
<body>
  <header id="siteHeader" class="site-header">
    <div class="nav-inner">
      <a href="${HOME}" class="nav-logo" aria-label="返回首页"><img src="${LOGO}" alt="百鲸咨询logo"></a>
      <nav class="nav-right">
        <a href="${HOME}" class="nav-link">首页</a>
        <a href="${HOME}#articles" class="nav-link">精选文章</a>
        <a href="${DIAG}" class="nav-link">企业诊断</a>
        <a href="https://g.baijingzixun.top" target="_blank" class="nav-cta">百鲸 G 系统</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="art-hero section-dark">
      <div class="container">
        <div class="art-hero-inner">
          <span class="eyebrow">百鲸洞察 · Insight</span>
          <h1>${escapeHtml(article.title)}</h1>
          <div class="art-hero-meta">
            <span class="chip"><i class="far fa-folder"></i>${escapeHtml(article.category || '咨询')}</span>
            <span><i class="far fa-calendar-alt"></i>${createdAt}</span>
            <span><i class="far fa-user"></i>${escapeHtml(author)}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="art-body-wrap">
      <div class="container">
        <article class="art-card">
          ${article.cover_url ? `<img src="${escapeHtml(article.cover_url)}" class="art-cover" alt="${escapeHtml(article.title)}">` : ''}
          ${excerpt ? `<p class="art-excerpt">${escapeHtml(excerpt)}</p>` : ''}
          <div class="prose">${contentHtml}</div>
        </article>

        <div class="art-foot">
          <a href="${HOME}#articles" class="art-back"><i class="fas fa-arrow-left"></i> 返回文章列表</a>
        </div>

        <div class="art-cta">
          <h3>想让这些方法真正落地到你的企业？</h3>
          <p>百鲸咨询以项目制方式陪跑落地 —— 从企业诊断、方案共创到实施陪跑，把管理动作变成可量化的经营结果。</p>
          <div class="art-cta-actions">
            <a class="art-cta-primary" href="${DIAG}"><i class="fas fa-bolt"></i> 免费企业诊断</a>
            <a class="art-cta-ghost" href="${HOME}#contact"><i class="fas fa-comments"></i> 联系咨询师</a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="f-top">
        <div class="f-brand">百鲸咨询 · 让 AI 真正长在业务里</div>
        <div class="f-line">帮助企业战略落地实现利润增长</div>
        <div class="f-line"><a href="https://beian.miit.gov.cn" target="_blank">浙ICP备2023042992号</a></div>
        <div class="f-line">&copy; 百鲸咨询 版权所有</div>
      </div>
    </div>
  </footer>

  <script>
    (function () {
      var header = document.getElementById('siteHeader');
      if (header) {
        var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 12); };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
      }
    })();
  </script>
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
