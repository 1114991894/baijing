/* 翻车实录分享卡：把文章正文 + 底部预约区（含二维码）绘成一张长图
   - 零依赖，视觉对齐 v2 设计系统（纸/墨/深青/金）
   - 图片即内容本身：上下无装饰条，只留正文 + 预约卡
   - 移动端：生成后直接唤起系统分享面板（可选微信/朋友圈）
   - 桌面端：预览层展示，右键另存为
   - 只在带 .article .back 的页面（翻车实录文章页）挂载按钮 */
(function () {
  'use strict';

  var isWx = /MicroMessenger/i.test(navigator.userAgent);
  var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  var W = 375, PAD = 22, SCALE = 2;
  var C = {
    paper: '#F6F3EC', paper2: '#FCFAF5', ink: '#161B1D', ink2: '#3E4745',
    muted: '#717873', line: '#DBD5C6', line2: '#C9C2B0',
    teal: '#14604D', tealInk: '#0D4235', gold: '#A5894C'
  };
  var SANS = '"PingFang SC","Hiragino Sans GB","Source Han Sans SC","Noto Sans SC","Microsoft YaHei",system-ui,sans-serif';
  var MONO = 'ui-monospace,"SF Mono","Cascadia Mono",Consolas,"Courier New",monospace';
  var SERIF = 'Georgia,"Times New Roman","Songti SC","Source Han Serif SC",serif';

  function loadImg(src) {
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { res(null); };
      im.src = src;
    });
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* 行内混排：b/strong → 加粗，<br> → 换行；去掉首尾空白 */
  function getRuns(node) {
    var runs = [];
    (function walk(n, bold) {
      Array.prototype.forEach.call(n.childNodes, function (c) {
        if (c.nodeType === 3) {
          if (c.textContent) runs.push({ t: c.textContent, b: bold });
        } else if (c.nodeType === 1) {
          if (c.tagName === 'BR') { runs.push({ t: '\n', b: bold }); return; }
          walk(c, bold || c.tagName === 'B' || c.tagName === 'STRONG');
        }
      });
    })(node, false);
    while (runs.length && /^\s*$/.test(runs[0].t)) runs.shift();
    while (runs.length && /^\s*$/.test(runs[runs.length - 1].t)) runs.pop();
    if (runs.length) {
      runs[0].t = runs[0].t.replace(/^\s+/, '');
      runs[runs.length - 1].t = runs[runs.length - 1].t.replace(/\s+$/, '');
    }
    return runs;
  }

  /* 逐字符断行（中文友好）；lines: [{ items:[{ch,b}], w }] */
  function layoutRuns(ctx, runs, maxW, size, font) {
    font = font || SANS;
    var lines = [], cur = { items: [], w: 0 };
    runs.forEach(function (run) {
      ctx.font = (run.b ? '700 ' : '400 ') + size + 'px ' + font;
      for (var i = 0; i < run.t.length; i++) {
        var ch = run.t[i];
        if (ch === '\n') { if (cur.items.length) { lines.push(cur); cur = { items: [], w: 0 }; } continue; }
        if (ch === ' ' && !cur.items.length) continue;
        var cw = ctx.measureText(ch).width;
        if (cur.w + cw > maxW && cur.items.length) {
          lines.push(cur); cur = { items: [], w: 0 };
          if (ch === ' ') continue;
        }
        cur.items.push({ ch: ch, b: run.b });
        cur.w += cw;
      }
    });
    if (cur.items.length) lines.push(cur);
    return lines;
  }

  function drawLines(ctx, lines, x, y, size, lh, color, paint, font) {
    font = font || SANS;
    lines.forEach(function (line) {
      var cx = x;
      line.items.forEach(function (it) {
        ctx.font = (it.b ? '700 ' : '400 ') + size + 'px ' + font;
        if (paint) {
          ctx.fillStyle = it.b ? C.ink : color;
          ctx.fillText(it.ch, cx, y);
        }
        cx += ctx.measureText(it.ch).width;
      });
      y += lh;
    });
    return y;
  }

  function wrapText(ctx, text, maxW) {
    var lines = [], line = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; }
      else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  }

  /* ---------- 预约卡（二维码 + 文案） ---------- */
  function drawCta(ctx, data, images, y, paint) {
    var x = PAD, w = W - PAD * 2, inner = 16;
    var qrS = 84, sp = 5, capH = 30;
    var stampW = qrS + sp * 2, stampH = qrS + sp * 2 + 4 + capH;
    var rx = x + inner + stampW + 14;
    var rw = w - inner * 2 - stampW - 14;

    ctx.font = '700 15.5px ' + SANS;
    var h3l = wrapText(ctx, data.cta.h3, rw);
    ctx.font = '400 12px ' + SANS;
    var pl = wrapText(ctx, data.cta.p, rw);
    var btnH = 30;
    ctx.font = '700 12.5px ' + SANS;
    var btnLabel = '预约诊断 · 30 MIN →';
    var btnW = ctx.measureText(btnLabel).width + 28;

    var rightH = h3l.length * 22 + 5 + pl.length * 20.5 + 12 + btnH;
    var contentH = Math.max(stampH, rightH);
    var cardH = contentH + inner * 2;

    if (paint) {
      ctx.fillStyle = '#fff';
      roundRect(ctx, x, y, w, cardH, 10);
      ctx.fill();
      ctx.strokeStyle = C.line2;
      ctx.lineWidth = 1;
      ctx.stroke();

      var stY = y + inner + (contentH - stampH) / 2;
      ctx.fillStyle = '#fff';
      roundRect(ctx, x + inner, stY, stampW, stampH, 8);
      ctx.fill();
      ctx.strokeStyle = C.line2;
      ctx.stroke();
      if (images.qr) ctx.drawImage(images.qr, x + inner + sp, stY + sp, qrS, qrS);
      ctx.font = '400 10px ' + SANS;
      ctx.fillStyle = C.muted;
      ctx.textAlign = 'center';
      ctx.fillText('微信扫一扫', x + inner + stampW / 2, stY + sp * 2 + qrS + 6);
      ctx.fillText('刘诠案 · 杭州', x + inner + stampW / 2, stY + sp * 2 + qrS + 18);
      ctx.textAlign = 'left';

      var ry = y + inner;
      ctx.font = '700 15.5px ' + SANS;
      ctx.fillStyle = C.ink;
      h3l.forEach(function (ln, i) { ctx.fillText(ln, rx, ry + i * 22); });
      ry += h3l.length * 22 + 5;
      ctx.font = '400 12px ' + SANS;
      ctx.fillStyle = C.muted;
      pl.forEach(function (ln, i) { ctx.fillText(ln, rx, ry + i * 20.5); });
      ry += pl.length * 20.5 + 12;

      ctx.fillStyle = C.ink;
      roundRect(ctx, rx, ry, btnW, btnH, 4);
      ctx.fill();
      ctx.font = '700 12.5px ' + SANS;
      ctx.fillStyle = C.paper2;
      ctx.textAlign = 'center';
      ctx.fillText(btnLabel, rx + btnW / 2, ry + btnH / 2 - 7);
      ctx.textAlign = 'left';
    }
    return y + cardH;
  }

  /* ---------- 收集文章数据 ---------- */
  function collect() {
    var art = document.querySelector('.article');
    if (!art) return null;
    var kicker = art.querySelector('.kicker');
    var h1 = art.querySelector('h1');
    var meta = art.querySelector('.art-meta');
    var cta = art.querySelector('.art-cta');
    if (!h1 || !cta) return null;
    var blocks = [];
    var node = (meta || h1).nextElementSibling;
    while (node && node !== cta) { blocks.push(node); node = node.nextElementSibling; }
    var qrImg = cta.querySelector('img');
    return {
      kicker: kicker ? kicker.textContent.trim() : '',
      h1: h1.textContent.trim(),
      meta: meta ? meta.textContent.trim() : '',
      blocks: blocks,
      cta: {
        h3: (cta.querySelector('h3') || {}).textContent || '',
        p: (cta.querySelector('p') || {}).textContent || '',
        qr: qrImg ? new URL(qrImg.getAttribute('src'), location.href).href : '/assets/qr.jpg'
      }
    };
  }

  /* ---------- 主渲染（两遍：量高 → 绘制） ---------- */
  function drawAll(ctx, data, images, paint, H) {
    var y = 0;
    ctx.textBaseline = 'top';
    if (paint) { ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H); }

    y = PAD;

    if (paint) {
      try { ctx.letterSpacing = '2px'; } catch (e) {}
      ctx.font = '11px ' + MONO;
      ctx.fillStyle = C.gold;
      ctx.fillText(data.kicker, PAD, y);
      try { ctx.letterSpacing = '0px'; } catch (e) {}
    }
    y += 16;

    ctx.font = '800 20px ' + SANS;
    y = drawLines(ctx, layoutRuns(ctx, [{ t: data.h1, b: true }], W - PAD * 2, 20), PAD, y, 20, 29, C.ink, paint);
    y += 10;

    ctx.font = '10.5px ' + MONO;
    y = drawLines(ctx, layoutRuns(ctx, [{ t: data.meta, b: false }], W - PAD * 2, 10.5, MONO), PAD, y, 10.5, 16, C.muted, paint, MONO);
    y += 18;

    if (paint) { ctx.fillStyle = C.line; ctx.fillRect(PAD, y, W - PAD * 2, 1); }
    y += 1;

    data.blocks.forEach(function (b) {
      var tag = b.tagName;
      if (tag === 'H2') {
        y += 26;
        y = drawLines(ctx, layoutRuns(ctx, [{ t: b.textContent.trim(), b: true }], W - PAD * 2, 16.5), PAD, y, 16.5, 25, C.ink, paint);
        y += 8;
      } else if (tag === 'P') {
        y += 13;
        y = drawLines(ctx, layoutRuns(ctx, getRuns(b), W - PAD * 2, 13.5), PAD, y, 13.5, 25, C.ink2, paint);
      } else if (tag === 'UL' || tag === 'OL') {
        y += 13;
        Array.prototype.forEach.call(b.children, function (li) {
          if (li.tagName !== 'LI') return;
          var lines = layoutRuns(ctx, getRuns(li), W - PAD * 2 - 14, 13.5);
          if (paint) {
            ctx.font = '400 13.5px ' + SANS;
            ctx.fillStyle = C.teal;
            ctx.fillText('•', PAD, y);
          }
          y = drawLines(ctx, lines, PAD + 14, y, 13.5, 25, C.ink2, paint);
          y += 6;
        });
        y += 7;
      } else if (tag === 'BLOCKQUOTE') {
        y += 20;
        var qlines = layoutRuns(ctx, getRuns(b), W - PAD * 2 - 14, 15, SERIF);
        var qh = qlines.length * 26;
        if (paint) {
          ctx.fillStyle = C.gold;
          ctx.fillRect(PAD, y + 2, 2, qh - 4);
        }
        y = drawLines(ctx, qlines, PAD + 14, y, 15, 26, C.ink, paint, SERIF);
        y += 16;
      } else if (tag === 'HR') {
        y += 24;
        if (paint) { ctx.fillStyle = C.line; ctx.fillRect(PAD, y, W - PAD * 2, 1); }
        y += 24;
      }
    });

    y += 28;
    y = drawCta(ctx, data, images, y, paint);
    y += PAD;
    return y;
  }

  function renderCard(data, images) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = W * SCALE;
    canvas.height = 100 * SCALE;
    ctx.scale(SCALE, SCALE);
    var H = drawAll(ctx, data, images, false, 0);
    canvas.height = Math.ceil(H * SCALE);
    ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);
    drawAll(ctx, data, images, true, H);
    return canvas;
  }

  function canvasToBlob(canvas) {
    return new Promise(function (res, rej) {
      canvas.toBlob(function (b) { b ? res(b) : rej(new Error('toBlob failed')); }, 'image/jpeg', 0.92);
    });
  }

  /* ---------- 预览层（桌面端：右键另存为） ---------- */
  var overlayHtml =
    '<div class="sc-panel">' +
    '<div class="sc-bar"><span>分享图片已生成</span>' +
    '<button type="button" id="scClose" aria-label="关闭">✕</button></div>' +
    '<div class="sc-stage"><img id="scImg" alt="百鲸咨询 · 翻车实录分享图"></div>' +
    '<p class="sc-tip" id="scTip"></p>' +
    '</div>';

  function showPreview(url, data) {
    var ov = document.getElementById('scOverlay');
    document.getElementById('scImg').src = url;
    document.getElementById('scTip').textContent = isWx
      ? '长按图片 → 保存到手机，发朋友圈时选择这张图'
      : '在图片上点右键 →「图片另存为」，保存到本地后发朋友圈';
    ov.classList.add('on');
    document.body.style.overflow = 'hidden';
  }
  function hidePreview() {
    var ov = document.getElementById('scOverlay');
    ov.classList.remove('on');
    document.body.style.overflow = '';
    var img = document.getElementById('scImg');
    if (img.src.indexOf('blob:') === 0) { URL.revokeObjectURL(img.src); img.removeAttribute('src'); }
  }

  /* ---------- 系统分享（移动端原生面板） ---------- */
  function tryNativeShare(blob, name, data) {
    if (!navigator.share || !navigator.canShare || typeof File === 'undefined') {
      return Promise.reject(new Error('no-share-api'));
    }
    var file = new File([blob], name, { type: 'image/jpeg' });
    if (!navigator.canShare({ files: [file] })) return Promise.reject(new Error('no-file-share'));
    return navigator.share({
      files: [file],
      title: '百鲸咨询 · AI 落地翻车实录',
      text: data.h1
    }).then(function () { return 'shared'; });
  }

  /* ---------- 分享流程 ---------- */
  var busy = false;
  function onShare() {
    if (busy) return;
    var btn = document.getElementById('shareBtn');
    var data = collect();
    if (!data) { alert('没找到这篇文章的内容'); return; }
    busy = true;
    btn.disabled = true;
    var orig = btn.innerHTML;
    btn.textContent = '生成中…';
    var name = (data.kicker.replace(/\s+/g, '') || '翻车实录') + '-百鲸咨询.jpg';
    var blob = null;

    loadImg(data.cta.qr)
      .then(function (qr) { return canvasToBlob(renderCard(data, { qr: qr })); })
      .then(function (b) {
        blob = b;
        // 移动端优先走系统分享面板；不支持（含微信内置浏览器）时降级预览层
        if (isTouch) return tryNativeShare(blob, name, data);
        return null;
      })
      .then(function (r) {
        if (r === 'shared') return;
        showPreview(URL.createObjectURL(blob), data);
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') return;   // 用户在系统面板里主动取消
        if (blob) showPreview(URL.createObjectURL(blob), data);
        else alert('图片生成失败，请稍后再试一次');
      })
      .then(function () {
        busy = false;
        btn.disabled = false;
        btn.innerHTML = orig;
      });
  }

  /* ---------- 挂载 ---------- */
  function mount() {
    var art = document.querySelector('.article');
    var back = art && art.querySelector('.back');
    if (art && back) {
      var row = document.createElement('div');
      row.className = 'art-top';
      back.parentNode.insertBefore(row, back);
      row.appendChild(back);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'share-btn';
      btn.id = 'shareBtn';
      btn.innerHTML = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false">' +
        '<path d="M8 1.5v8M5 4.5 8 1.5l3 3M2.5 9.5v3.25c0 .41.34.75.75.75h9.5c.41 0 .75-.34.75-.75V9.5" ' +
        'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>分享';
      btn.addEventListener('click', onShare);
      row.appendChild(btn);
    }
    var ov = document.createElement('div');
    ov.className = 'sc-overlay';
    ov.id = 'scOverlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = overlayHtml;
    document.body.appendChild(ov);
    document.getElementById('scClose').addEventListener('click', hidePreview);
    ov.addEventListener('click', function (e) { if (e.target === ov) hidePreview(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hidePreview(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
