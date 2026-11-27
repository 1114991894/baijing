/* 预约诊断：轻量抽屉 + 信息收集（无依赖，约 5KB）
   - 复用站点既有的 Supabase diagnosis_leads 表
   - JS 未加载时，按钮本身是指向 #wechat 的普通链接（可扫码，不丢线索） */
(function () {
  'use strict';

  var SB_URL = 'https://mxtxwjprmfstbheiempi.supabase.co';
  var SB_KEY = 'sb_publishable_2VAasjGlB4ioG-hhCMSnAA_4AdPGD-R';
  var PROVINCES = {
    '北京': ['北京'], '天津': ['天津'], '上海': ['上海'], '重庆': ['重庆'],
    '河北': ['石家庄','唐山','秦皇岛','邯郸','邢台','保定','张家口','承德','沧州','廊坊','衡水'],
    '山西': ['太原','大同','阳泉','长治','晋城','朔州','晋中','运城','忻州','临汾','吕梁'],
    '内蒙古': ['呼和浩特','包头','乌海','赤峰','通辽','鄂尔多斯','呼伦贝尔','巴彦淖尔','乌兰察布'],
    '辽宁': ['沈阳','大连','鞍山','抚顺','本溪','丹东','锦州','营口','阜新','辽阳','盘锦','铁岭','朝阳','葫芦岛'],
    '吉林': ['长春','吉林','四平','辽源','通化','白山','松原','白城','延边'],
    '黑龙江': ['哈尔滨','齐齐哈尔','鸡西','鹤岗','双鸭山','大庆','伊春','佳木斯','七台河','牡丹江','黑河','绥化'],
    '江苏': ['南京','无锡','徐州','常州','苏州','南通','连云港','淮安','盐城','扬州','镇江','泰州','宿迁'],
    '浙江': ['杭州','宁波','温州','嘉兴','湖州','绍兴','金华','衢州','舟山','台州','丽水'],
    '安徽': ['合肥','芜湖','蚌埠','淮南','马鞍山','淮北','铜陵','安庆','黄山','滁州','阜阳','宿州','六安','亳州','池州','宣城'],
    '福建': ['福州','厦门','莆田','三明','泉州','漳州','南平','龙岩','宁德'],
    '江西': ['南昌','景德镇','萍乡','九江','新余','鹰潭','赣州','吉安','宜春','抚州','上饶'],
    '山东': ['济南','青岛','淄博','枣庄','东营','烟台','潍坊','济宁','泰安','威海','日照','临沂','德州','聊城','滨州','菏泽'],
    '河南': ['郑州','开封','洛阳','平顶山','安阳','鹤壁','新乡','焦作','濮阳','许昌','漯河','三门峡','南阳','商丘','信阳','周口','驻马店'],
    '湖北': ['武汉','黄石','十堰','宜昌','襄阳','鄂州','荆门','孝感','荆州','黄冈','咸宁','随州','恩施'],
    '湖南': ['长沙','株洲','湘潭','衡阳','邵阳','岳阳','常德','张家界','益阳','郴州','永州','怀化','娄底','湘西'],
    '广东': ['广州','深圳','珠海','汕头','佛山','韶关','湛江','肇庆','江门','茂名','惠州','梅州','汕尾','河源','阳江','清远','东莞','中山','潮州','揭阳','云浮'],
    '广西': ['南宁','柳州','桂林','梧州','北海','防城港','钦州','贵港','玉林','百色','贺州','河池','来宾','崇左'],
    '海南': ['海口','三亚','三沙','儋州'],
    '四川': ['成都','自贡','攀枝花','泸州','德阳','绵阳','广元','遂宁','内江','乐山','南充','眉山','宜宾','广安','达州','雅安','巴中','资阳'],
    '贵州': ['贵阳','六盘水','遵义','安顺','毕节','铜仁','黔西南','黔东南','黔南'],
    '云南': ['昆明','曲靖','玉溪','保山','昭通','丽江','普洱','临沧','楚雄','红河','文山','西双版纳','大理','德宏','怒江','迪庆'],
    '西藏': ['拉萨','日喀则','昌都','林芝','山南','那曲'],
    '陕西': ['西安','铜川','宝鸡','咸阳','渭南','延安','汉中','榆林','安康','商洛'],
    '甘肃': ['兰州','嘉峪关','金昌','白银','天水','武威','张掖','平凉','酒泉','庆阳','定西','陇南','临夏','甘南'],
    '青海': ['西宁','海东','海北','黄南','果洛','玉树','海西'],
    '宁夏': ['银川','石嘴山','吴忠','固原','中卫'],
    '新疆': ['乌鲁木齐','克拉玛依','吐鲁番','哈密','昌吉','巴音郭楞','阿克苏','喀什','和田','伊犁','塔城','阿勒泰'],
    '其他 / 港澳台': ['香港','澳门','台湾']
  };
  var CHIPS = ['工具买了没人用', '只用来写周报', '落不下去', '想先看一个岗位', '说不清，先聊聊'];

  var html =
    '<div class="bk-overlay" id="bkOverlay" role="dialog" aria-modal="true" aria-labelledby="bkTitle">' +
      '<div class="bk-card" role="document">' +
        '<div id="bkForm">' +
          '<div class="bk-head">' +
            '<p class="kicker">预约诊断</p>' +
            '<h2 id="bkTitle">先说清楚你卡在哪一步，<br>再决定要不要见面。</h2>' +
            '<button type="button" class="bk-close" id="bkClose" aria-label="关闭">✕</button>' +
          '</div>' +
          '<div class="bk-facts">' +
            '<span>30 分钟</span><span>电话或到现场</span><span>杭州出发 · 到场半径两小时</span><span>不推销</span>' +
          '</div>' +
          '<div class="bk-body">' +
            '<form id="bkFormEl" novalidate>' +
              '<div class="f-row">' +
                '<div class="f-field">' +
                  '<label for="bkCompany">公司 / 门店名称 <span class="req">*</span></label>' +
                  '<input id="bkCompany" name="company" type="text" maxlength="60" placeholder="全称或简称都行" autocomplete="organization" required>' +
                '</div>' +
              '</div>' +
              '<div class="f-row">' +
                '<div class="f-field">' +
                  '<label for="bkProvince">所在省份</label>' +
                  '<select id="bkProvince">' +
                    '<option value="">请选择省</option>' +
                    Object.keys(PROVINCES).map(function (p) { return '<option>' + p + '</option>'; }).join('') +
                  '</select>' +
                '</div>' +
                '<div class="f-field">' +
                  '<label for="bkCity">所在城市</label>' +
                  '<select id="bkCity" name="city"><option value="">先选省，再选市</option></select>' +
                '</div>' +
              '</div>' +
              '<div class="f-row">' +
                '<div class="f-field">' +
                  '<label for="bkName">怎么称呼你 <span class="req">*</span></label>' +
                  '<input id="bkName" name="contact_name" type="text" maxlength="30" placeholder="姓名或称呼" autocomplete="name" required>' +
                '</div>' +
                '<div class="f-field">' +
                  '<label for="bkPhone">手机号 <span class="req">*</span></label>' +
                  '<input id="bkPhone" name="phone" type="tel" inputmode="numeric" maxlength="11" placeholder="11 位手机号" autocomplete="tel" required>' +
                '</div>' +
              '</div>' +
              '<div class="f-field">' +
                '<label for="bkNeed">现在最头疼的环节</label>' +
                '<div class="chips" id="bkChips">' +
                  CHIPS.map(function (t) { return '<button type="button" class="chip" data-t="' + t + '">' + t + '</button>'; }).join('') +
                '</div>' +
                '<textarea id="bkNeed" name="requirement" maxlength="300" placeholder="一句话就行。比如：买了账号没人用，或者某个岗位天天加班对账。"></textarea>' +
              '</div>' +
              '<button type="submit" class="btn btn-dark bk-submit" id="bkSubmit">提交，约 30 分钟 <span class="arw">→</span></button>' +
              '<p class="bk-err" id="bkErr"></p>' +
              '<p class="bk-note"><span>·</span><span>信息只用于约这次时间，不进群发名单，不转给第三方。急着聊也可以直接扫码。</span></p>' +
              '<div class="bk-alt">' +
                '<img src="/assets/qr.jpg" alt="刘诠案的微信二维码" width="78" height="78">' +
                '<span>不想留电话？扫码加微信，说一句你最头疼的环节。</span>' +
              '</div>' +
            '</form>' +
          '</div>' +
        '</div>' +
        '<div class="bk-done" id="bkDone">' +
          '<div class="ok">✓</div>' +
          '<h3>收到，我先看一下你的情况。</h3>' +
          '<p><b>1 个工作日内</b>我会通过这个手机号联系你，约一个双方都方便的时间。</p>' +
          '<p style="color:#717873;font-size:13.5px;">如果着急，也可以直接扫码加微信。</p>' +
          '<div class="bk-alt">' +
            '<img src="/assets/qr.jpg" alt="刘诠案的微信二维码" width="78" height="78">' +
            '<span>微信扫一扫，说一句你最头疼的环节。</span>' +
          '</div>' +
          '<button type="button" class="btn btn-ghost" id="bkDoneBtn" style="margin-top:20px;">关闭</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  function mount() {
    var holder = document.createElement('div');
    holder.innerHTML = html;
    while (holder.firstChild) document.body.appendChild(holder.firstChild);

    var overlay = document.getElementById('bkOverlay');
    var formWrap = document.getElementById('bkForm');
    var form = document.getElementById('bkFormEl');
    var done = document.getElementById('bkDone');
    var err = document.getElementById('bkErr');
    var submit = document.getElementById('bkSubmit');
    var lastFocus = null;

    function open(e) {
      if (e) e.preventDefault();
      lastFocus = document.activeElement;
      overlay.classList.add('on');
      document.body.style.overflow = 'hidden';
      setTimeout(function () { document.getElementById('bkCompany').focus(); }, 60);
    }
    function close() {
      overlay.classList.remove('on');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    // 所有「预约诊断」入口
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-book]');
      if (t) open(e);
    });

    document.getElementById('bkClose').addEventListener('click', close);
    document.getElementById('bkDoneBtn').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('on')) return;
      if (e.key === 'Escape') { close(); }
      if (e.key === 'Tab') {
        var f = overlay.querySelectorAll('button, input, select, textarea, a[href]');
        var list = Array.prototype.filter.call(f, function (el) { return el.offsetParent !== null; });
        if (!list.length) return;
        var first = list[0], last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // 省市二级联动
    var provSel = document.getElementById('bkProvince');
    var citySel = document.getElementById('bkCity');
    function fillCities() {
      var list = PROVINCES[provSel.value] || [];
      citySel.innerHTML = '<option value="">请选择市</option>' +
        list.map(function (c) { return '<option>' + c + '</option>'; }).join('');
      if (list.length === 1) citySel.selectedIndex = 1;
    }
    provSel.addEventListener('change', function () { fillCities(); });
    fillCities();

    // 快捷标签
    document.getElementById('bkChips').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      var ta = document.getElementById('bkNeed');
      var text = chip.getAttribute('data-t');
      var on = chip.classList.contains('on');
      Array.prototype.forEach.call(this.querySelectorAll('.chip'), function (c) { c.classList.remove('on'); });
      if (on) {
        ta.value = ta.value.replace(text, '').trim();
      } else {
        chip.classList.add('on');
        if (ta.value.indexOf(text) === -1) ta.value = (ta.value ? ta.value.replace(/[，,]\s*$/, '') + '，' : '') + text;
      }
      ta.focus();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var company = document.getElementById('bkCompany').value.trim();
      var name = document.getElementById('bkName').value.trim();
      var phone = document.getElementById('bkPhone').value.trim();

      function fail(msg) { err.textContent = msg; err.classList.add('on'); }
      err.classList.remove('on');
      if (!company) return fail('请填一下公司或门店名称');
      if (!name) return fail('请填一下怎么称呼你');
      if (!/^1[3-9]\d{9}$/.test(phone)) return fail('手机号看起来不对，请检查 11 位号码');

      submit.disabled = true;
      submit.innerHTML = '提交中…';
      var payload = {
        company: company,
        city: (provSel.value ? provSel.value + (citySel.value ? ' ' + citySel.value : '') : null),
        contact_name: name,
        phone: phone,
        requirement: document.getElementById('bkNeed').value.trim() || null,
        employee_count: null
      };
      fetch(SB_URL + '/rest/v1/diagnosis_leads', {
        method: 'POST',
        headers: {
          'apikey': SB_KEY,
          'Authorization': 'Bearer ' + SB_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        formWrap.style.display = 'none';
        done.classList.add('on');
        overlay.querySelector('.bk-card').scrollTop = 0;
      }).catch(function () {
        fail('提交没成功。可以直接扫码加微信，或稍后再试。');
      }).then(function () {
        submit.disabled = false;
        submit.innerHTML = '提交，约 30 分钟 <span class="arw">→</span>';
      });
    });

    // 锚点 #wechat 时不需要额外处理，页面本身有二维码区
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();

/* ============================================================
   UI 精致化：滚动显现（.rise）
   - html 加 .js 后 CSS 才会隐藏元素，无 JS 时一切可见
   - 尊重系统"减少动态效果"偏好
   ============================================================ */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var els = [].slice.call(document.querySelectorAll('.rise'));
  if (!els.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
  els.forEach(function (el, i) {
    el.style.transitionDelay = (Math.min(i % 3, 2) * 60) + 'ms';
    io.observe(el);
  });
})();

/* ============================================================
   手机版导航：右上角汉堡按钮 → 下拉抽屉菜单（booking.js 注入）
   - 桌面端按钮与抽屉均不显示（CSS 控制）
   - 抽屉链接克隆自当前页 .nav-links，自动带 active 状态与预约药丸
   ============================================================ */
(function () {
  'use strict';
  var nav = document.querySelector('.nav');
  var navIn = nav && nav.querySelector('.nav-in');
  var links = nav && nav.querySelector('.nav-links');
  if (!nav || !navIn || !links) return;

  var burger = document.createElement('button');
  burger.className = 'burger';
  burger.type = 'button';
  burger.setAttribute('aria-label', '打开菜单');
  burger.setAttribute('aria-expanded', 'false');
  burger.innerHTML = '<span></span><span></span><span></span>';
  navIn.appendChild(burger);

  var drawer = document.createElement('div');
  drawer.className = 'nav-drawer';
  var clone = links.cloneNode(true);
  clone.removeAttribute('class');
  clone.className = 'nav-drawer-links';
  drawer.appendChild(clone);
  nav.appendChild(drawer);

  function setOpen(open) {
    drawer.classList.toggle('open', open);
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  burger.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!drawer.classList.contains('open'));
  });
  drawer.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('click', function (e) {
    if (drawer.classList.contains('open') && !nav.contains(e.target)) setOpen(false);
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 600 && drawer.classList.contains('open')) setOpen(false);
  });
})();

/* ============================================================
   导航栏智能显隐：下滑隐藏、上滑显示（桌面端 + 手机端统一）
   ============================================================ */
(function () {
  'use strict';
  var nav = document.querySelector('.nav');
  if (!nav) return;
  var lastY = window.scrollY || 0;
  var ticking = false;
  var THRESHOLD = 140;   // 离顶部超过这个距离才开始隐藏
  var DELTA = 2;         // 滚动幅度小于此值视为抖动，不触发

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || window.pageYOffset || 0;
      var dy = y - lastY;
      if (y > THRESHOLD && dy > DELTA) {
        nav.classList.add('nav-hidden');
      } else if (dy < -DELTA || y <= THRESHOLD) {
        nav.classList.remove('nav-hidden');
      }
      lastY = y;
      ticking = false;
    });
  }, { passive: true });
})();

/* ============================================================
   文章页分享按钮：生成分享图 → 系统分享（可发朋友圈）/ 保存 / 复制链接
   - 分享图用 Canvas 现场绘制（封面 + 分类 + 标题 + 日期 + 二维码）
   - 支持 navigator.share 文件分享的设备直接调起系统分享面板
   - 其余设备走下载保存；微信内长按图片也可保存
   ============================================================ */
(function () {
  'use strict';
  var btn = document.querySelector('.art-share');
  if (!btn) return;

  var hero = document.querySelector('.article-hero');
  var h1 = document.querySelector('.article-hero h1');
  var cat = document.querySelector('.article-hero .cat');
  var metaEl = document.querySelector('.article-hero .meta');
  var coverImg = document.querySelector('.article-cover-wrap .op-img img');
  var TITLE = h1 ? h1.textContent.trim() : document.title;
  var CAT = cat ? cat.textContent.trim() : '百鲸咨询';
  // 摘要：优先页面 meta description（后台填的文章摘要），退回正文首段
  var EXCERPT = (function () {
    var m = document.querySelector('meta[name="description"]');
    var t = m ? m.content.trim() : '';
    if (!t) {
      var p = document.querySelector('.article-body p');
      t = p ? p.textContent.trim() : '';
    }
    return t.slice(0, 120);
  })();
  var URL_NOW = location.origin + location.pathname;

  function loadImage(src) {
    return new Promise(function (resolve) {
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = function () { resolve(null); };
      im.src = src;
    });
  }

  function wrap(ctx, text, maxW) {
    var lines = [];
    var line = '';
    for (var i = 0; i < text.length; i++) {
      var test = line + text[i];
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = text[i]; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function buildCard() {
    var W = 900;
    var cv = document.createElement('canvas');
    var ctx = cv.getContext('2d');

    // 封面完整显示（等比缩放不裁剪）：宽度撑满，过高则限高 560 水平居中；画布高度随封面比例自适应
    var coverSrc = (coverImg && coverImg.complete && coverImg.naturalWidth) ? coverImg : null;
    var loadP = coverSrc ? Promise.resolve(coverSrc) : loadImage(coverImg ? coverImg.currentSrc || coverImg.src : '');

    return loadP.then(function (im) {
      var dispW = W, dispH = 0;
      if (im && im.naturalWidth) {
        var ar = im.naturalWidth / im.naturalHeight;
        dispH = Math.round(W / ar);
        if (dispH > 560) { dispH = 560; dispW = Math.round(560 * ar); }
      }
      var cb = Math.max(dispH, 90);      // 内容区起点（无封面时留出顶部空间）
      var pad = 70, maxW = W - pad * 2;

      // 先测量行数，再按内容计算画布高度
      cv.width = W; cv.height = 1400;    // 临时尺寸供 measureText
      ctx.font = '700 36px "PingFang SC","Microsoft YaHei",sans-serif';
      var titleLines = wrap(ctx, TITLE, maxW).slice(0, 4);
      ctx.font = '24px "PingFang SC","Microsoft YaHei",sans-serif';
      var exLines = EXCERPT ? wrap(ctx, EXCERPT, maxW).slice(0, 3) : [];

      var titleEnd = cb + 140 + (titleLines.length - 1) * 54;   // 标题最后一行基线
      var exEnd = exLines.length ? titleEnd + 56 + (exLines.length - 1) * 36 : titleEnd;
      var dividerY = exEnd + (exLines.length ? 50 : 40);        // 金色分隔线（在摘要下方）
      var qy = dividerY + 54;                                    // 二维码顶部（分隔线下方 54px = 3x）
      var H = qy + 190 + 60;
      cv.width = W; cv.height = H;

      // 背景
      ctx.fillStyle = '#0A2E26';
      ctx.fillRect(0, 0, W, H);

      // 封面：完整绘制，水平居中，底部渐隐衔接深色
      if (dispH) {
        ctx.drawImage(im, (W - dispW) / 2, 0, dispW, dispH);
        var grad = ctx.createLinearGradient(0, dispH - 90, 0, dispH);
        grad.addColorStop(0, 'rgba(10,46,38,0)');
        grad.addColorStop(1, 'rgba(10,46,38,1)');
        ctx.fillStyle = grad;
        ctx.fillRect((W - dispW) / 2, dispH - 90, dispW, 90);
      }

      // 金色分类
      ctx.fillStyle = '#C9B788';
      ctx.font = '22px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.fillText(CAT, pad, cb + 84);

      // 标题
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 36px "PingFang SC","Microsoft YaHei",sans-serif';
      var ty = cb + 140;
      titleLines.forEach(function (ln) { ctx.fillText(ln, pad, ty); ty += 54; });

      // 摘要（替代原日期行）
      if (exLines.length) {
        ctx.fillStyle = 'rgba(243,239,230,.6)';
        ctx.font = '24px "PingFang SC","Microsoft YaHei",sans-serif';
        var ey = titleEnd + 56;
        exLines.forEach(function (ln) { ctx.fillText(ln, pad, ey); ey += 36; });
      }

      // 金色分隔线（摘要下方，二维码上方 90px）
      ctx.fillStyle = 'rgba(201,183,136,.45)';
      ctx.fillRect(pad, dividerY, maxW, 2);

      // 二维码（白色圆角卡 + 码图 + 说明）
      var qs = 190, qx = pad;
      ctx.fillStyle = '#FFFFFF';
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(qx, qy, qs, qs, 14); ctx.fill(); }
      else ctx.fillRect(qx, qy, qs, qs);
      var qr = loadImage('/assets/qr.jpg');
      return qr.then(function (qim) {
        if (qim) ctx.drawImage(qim, qx + 10, qy + 10, qs - 20, qs - 20);
        ctx.fillStyle = 'rgba(243,239,230,.85)';
        ctx.font = '600 26px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillText('扫码预约，免费诊断', qx + qs + 34, qy + 58);
        ctx.fillStyle = 'rgba(243,239,230,.5)';
        ctx.font = '22px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillText('组织人效诊断 · AI 机会地图', qx + qs + 34, qy + 98);
        ctx.fillText('baijingzixun.top', qx + qs + 34, qy + 138);

        return Promise.resolve(cv.toDataURL('image/png'));
      });
    });
  }

  function ensureModal() {
    var mask = document.querySelector('.share-mask');
    if (mask) return mask;
    mask = document.createElement('div');
    mask.className = 'share-mask';
    mask.innerHTML =
      '<div class="share-card" role="dialog" aria-label="分享本文">' +
      '  <h3>分享这篇文章<button type="button" class="share-x" aria-label="关闭">×</button></h3>' +
      '  <img class="share-preview" alt="文章分享图">' +
      '  <div class="share-btns">' +
      '    <button type="button" class="share-copy">复制链接</button>' +
      '    <button type="button" class="share-save primary">保存 / 分享</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(mask);
    mask.addEventListener('click', function (e) {
      if (e.target === mask || e.target.classList.contains('share-x')) mask.classList.remove('open');
    });
    return mask;
  }

  // 分享图用 dataURL（base64）：微信浏览器长按可"识别图中二维码"，其他浏览器长按可保存到相册
  // （blob: URL 在微信 webview 里长按菜单经常无法识别/保存，故不用）
  function dataURLtoBlob(d) {
    var parts = d.split(',');
    var mime = parts[0].match(/:(.*?);/)[1];
    var b = atob(parts[1]);
    var n = b.length;
    var u8 = new Uint8Array(n);
    while (n--) u8[n] = b.charCodeAt(n);
    return new Blob([u8], { type: mime });
  }

  var cardData = null;   // 分享图 dataURL 缓存
  btn.addEventListener('click', function () {
    var mask = ensureModal();
    mask.classList.add('open');
    var preview = mask.querySelector('.share-preview');
    if (cardData) { preview.src = cardData; return; }
    buildCard().then(function (data) {
      if (!data) return;
      cardData = data;
      preview.src = cardData;
    });
  });

  document.addEventListener('click', function (e) {
    var mask = document.querySelector('.share-mask');
    if (!mask || !mask.classList.contains('open')) return;
    if (e.target.classList.contains('share-copy')) {
      var done = function () { e.target.textContent = '已复制'; setTimeout(function () { e.target.textContent = '复制链接'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(TITLE + ' ' + URL_NOW).then(done, done);
      else done();
    } else if (e.target.classList.contains('share-save')) {
      if (!cardData) return;
      var file = new File([dataURLtoBlob(cardData)], 'baijing-article.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: TITLE }).catch(function () {});
      } else {
        var a = document.createElement('a');
        a.href = cardData;
        a.download = 'baijing-article.png';
        a.click();
      }
    }
  });
})();
