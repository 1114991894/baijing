/* 预约诊断：轻量抽屉 + 信息收集（无依赖，约 5KB）
   - 复用站点既有的 Supabase diagnosis_leads 表
   - JS 未加载时，按钮本身是指向 #wechat 的普通链接（可扫码，不丢线索） */
(function () {
  'use strict';

  var SB_URL = 'https://mxtxwjprmfstbheiempi.supabase.co';
  var SB_KEY = 'sb_publishable_2VAasjGlB4ioG-hhCMSnAA_4AdPGD-R';
  var CITIES = ['杭州', '上海', '苏州', '宁波', '嘉兴', '无锡', '常州', '南京', '合肥', '其他'];
  var CHIPS = ['工具买了没人用', '只用来写周报', '落不下去', '想先看一个岗位', '说不清，先聊聊'];

  var html =
    '<div class="bk-overlay" id="bkOverlay" role="dialog" aria-modal="true" aria-labelledby="bkTitle">' +
      '<div class="bk-card" role="document">' +
        '<div id="bkForm">' +
          '<div class="bk-head">' +
            '<p class="kicker">预约诊断 · 30 分钟</p>' +
            '<h2 id="bkTitle">先说清楚你卡在哪一步，<br>再决定要不要见面。</h2>' +
            '<p>我直接联系你约时间。不合适我会在电话里直说，不占用你第二次。</p>' +
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
                '<div class="f-field">' +
                  '<label for="bkCity">所在城市</label>' +
                  '<select id="bkCity" name="city">' +
                    '<option value="">请选择</option>' +
                    CITIES.map(function (c) { return '<option>' + c + '</option>'; }).join('') +
                  '</select>' +
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
    '</div>' +
    '<div class="mbar" aria-label="快捷预约">' +
      '<a class="btn btn-dark" href="#wechat" data-book>预约诊断 <span class="arw">→</span></a>' +
      '<a class="btn btn-ghost" href="#wechat">加微信</a>' +
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
        city: document.getElementById('bkCity').value || null,
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
