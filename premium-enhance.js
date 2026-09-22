/* ====================================================================
   premium-enhance.js — 全站动效 & 科技感增强脚本
   自动为所有页面添加：滚动显现、导航栏状态、数字 count-up
   ==================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // —— 滚动显现 ——
  var els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (els.length && !reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el, i) {
      el.style.transitionDelay = (Math.min(i % 4, 3) * 70) + 'ms';
      io.observe(el);
    });
  }

  // —— 导航栏滚动状态（支持 #siteHeader / header.sticky.top-0 / header.bg-white）——
  var headers = document.querySelectorAll('#siteHeader, header.sticky.top-0, header.bg-white.shadow-sm, header.bg-white.border-b');
  if (headers.length > 0) {
    var onScroll = function () {
      var scrolled = window.scrollY > 12;
      headers.forEach(function (h) { h.classList.toggle('scrolled', scrolled); });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // —— 数字 count-up（data-count 属性）——
  function countUp(el, from, to, duration) {
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var countEls = document.querySelectorAll('[data-count]');
  if (countEls.length && !reduce && 'IntersectionObserver' in window) {
    var cIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var el = e.target;
          var target = parseInt(el.getAttribute('data-count'), 10);
          countUp(el, 0, target, 1200);
          cIo.unobserve(el);
        }
      });
    }, { threshold: 0.3 });
    countEls.forEach(function (el) { cIo.observe(el); });
  }

  // —— 进度条填充（data-w 属性）——
  var bars = document.querySelectorAll('.bar-fill[data-w]');
  if (bars.length && !reduce && 'IntersectionObserver' in window) {
    var bIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var bar = e.target;
          var w = bar.getAttribute('data-w');
          setTimeout(function () { bar.style.width = w + '%'; }, 200);
          bIo.unobserve(bar);
        }
      });
    }, { threshold: 0.3 });
    bars.forEach(function (bar) { bIo.observe(bar); });
  }

  // —— 输入框增强 ——
  var inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="tel"], input[type="number"], textarea, select');
  inputs.forEach(function (inp) { inp.classList.add('input-premium'); });

  // —— 按钮增强 ——
  var btns = document.querySelectorAll('button[type="submit"], .btn-primary, a[class*="bg-"][class*="rounded"]');
  btns.forEach(function (btn) { btn.classList.add('btn-shimmer'); });
})();
