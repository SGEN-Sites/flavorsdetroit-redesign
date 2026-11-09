/* site.js — Flavors Detroit redesign. No dependencies. Every page works without it:
   panels show, reveals show, the age gate stays hidden, links work. With it:
   age gate · live open status · sticky header state · drawer · tabs · reveals ·
   ticker and bulb pausing · preview forms · click-to-load map · news filter.
   No root-absolute paths: every URL comes from the HTML, so the build works under a
   GitHub Pages subpath. */
(function () {
  'use strict';
  window.__flavorsReady = true;
  var doc = document, root = doc.documentElement, body = doc.body;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* private mode: ask again next visit */ } }
  };
  var page = $('#page');

  function focusables(container) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', container)
      .filter(function (el) { return el.offsetParent !== null || el === doc.activeElement; });
  }
  function trapTab(container, e) {
    if (e.key !== 'Tab') return;
    var f = focusables(container); if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---- age gate ------------------------------------------------------------------------- */
  var GATE_KEY = 'flavors-age-ok', GATE_DAYS = 30;
  var gate = $('#age-gate');
  function gateValid() {
    var raw = store.get(GATE_KEY); if (!raw) return false;
    var at = parseInt(raw.split('|')[1] || '0', 10);
    return raw.charAt(0) === '1' && (!at || (Date.now() - at) < GATE_DAYS * 864e5);
  }
  function closeGate() {
    root.classList.remove('gate-open');
    gate.hidden = true;
    if (page) page.inert = false;
    var main = $('#main'); if (main) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
  }
  if (gate) {
    if (!gateValid()) {
      root.classList.add('gate-open');
      gate.hidden = false;
      if (page) page.inert = true;
      setTimeout(function () { var b = $('[data-gate-yes]', gate); if (b) b.focus(); }, 40);
      gate.addEventListener('keydown', function (e) { trapTab(gate, e); });
      doc.addEventListener('focusin', function (e) { if (!gate.hidden && !gate.contains(e.target)) { var b = $('[data-gate-yes]', gate); if (b) b.focus(); } });
      $$('[data-gate-yes]', gate).forEach(function (btn) {
        btn.addEventListener('click', function () { store.set(GATE_KEY, '1|' + Date.now() + '|' + (btn.getAttribute('data-gate-yes') || 'adult')); closeGate(); });
      });
    } else {
      root.classList.remove('gate-open');
      gate.hidden = true;
    }
  }

  /* ---- live open / closed, computed in the store's own time zone ------------------------ */
  var hoursAttr = body.getAttribute('data-hours') || '10:00-22:00';
  var tz = body.getAttribute('data-tz') || 'America/Detroit';
  var oc = hoursAttr.split('-').map(function (t) { var p = t.split(':'); return (+p[0]) * 60 + (+p[1] || 0); });
  function label12(mins) { var h = Math.floor(mins / 60) % 24, m = mins % 60, ap = h >= 12 ? 'PM' : 'AM'; var hh = h % 12 || 12; return hh + (m ? ':' + (m < 10 ? '0' : '') + m : '') + ap; }
  function nowInStore() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', hour12: false, weekday: 'long' }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      var h = parseInt(o.hour, 10) % 24, m = parseInt(o.minute, 10);
      return { mins: h * 60 + m, weekday: o.weekday };
    } catch (e) { var d = new Date(); return { mins: d.getHours() * 60 + d.getMinutes(), weekday: '' }; }
  }
  function renderStatus() {
    var n = nowInStore(), open = n.mins >= oc[0] && n.mins < oc[1];
    var soon = open && (oc[1] - n.mins) <= 60;
    var word = open ? (soon ? 'Closing soon' : 'Open now') : 'Closed';
    var detail = open ? 'until ' + label12(oc[1]) : (n.mins < oc[0] ? 'opens ' + label12(oc[0]) : 'opens ' + label12(oc[0]) + ' tomorrow');
    $$('[data-status]').forEach(function (el) {
      el.setAttribute('data-state', open ? 'open' : 'closed');
      var w = $('.status__word', el), t = $('[data-status-text]', el);
      if (w) w.textContent = word;
      if (t) t.textContent = detail;
      el.setAttribute('aria-label', 'Flavors Detroit is ' + word.toLowerCase() + ', ' + detail + ' (Detroit time). Open every day 10AM to 10PM.');
    });
    $$('[data-day]').forEach(function (row) { row.classList.toggle('is-today', row.getAttribute('data-day') === n.weekday); });
  }
  renderStatus();
  setInterval(renderStatus, 60000);

  /* ---- header state ------------------------------------------------------------------------ */
  var header = $('.site-header');
  var lastY = -1;
  function onScroll() {
    var y = window.scrollY || 0;
    if ((y > 8) !== (lastY > 8)) header && header.classList.toggle('is-scrolled', y > 8);
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- drawer ----------------------------------------------------------------------------- */
  var drawer = $('#drawer'), menuBtn = $('[data-menu-open]');
  function setDrawer(open) {
    if (!drawer) return;
    drawer.setAttribute('data-open', open ? 'true' : 'false');
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    body.classList.toggle('drawer-open', open);
    root.style.overflow = open ? 'hidden' : '';
    var content = $('#content'); if (content) content.inert = open;
    if (open) { var c = $('[data-menu-close]', drawer); setTimeout(function () { c && c.focus(); }, 30); }
    else if (menuBtn) menuBtn.focus({ preventScroll: true });
  }
  if (drawer && menuBtn) {
    menuBtn.addEventListener('click', function () { setDrawer(true); });
    $$('[data-menu-close]', drawer).forEach(function (b) { b.addEventListener('click', function () { setDrawer(false); }); });
    drawer.addEventListener('keydown', function (e) { if (e.key === 'Escape') setDrawer(false); trapTab($('.drawer__panel', drawer), e); });
    $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { if (a.getAttribute('href').charAt(0) === '#') setDrawer(false); }); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1080 && drawer.getAttribute('data-open') === 'true') setDrawer(false); });
  }

  /* ---- tabs ------------------------------------------------------------------------------- */
  $$('[data-tabs]').forEach(function (wrap) {
    var tabs = $$('[role="tab"]', wrap);
    var panels = tabs.map(function (t) { return doc.getElementById(t.getAttribute('aria-controls')); });
    function select(i, focus) {
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        if (panels[k]) panels[k].hidden = !on;
      });
      if (focus) tabs[i].focus();
      tabs[i].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i, false); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = tabs.length, j = null;
        if (k === 'ArrowRight') j = (i + 1) % n; else if (k === 'ArrowLeft') j = (i - 1 + n) % n;
        else if (k === 'Home') j = 0; else if (k === 'End') j = n - 1;
        if (j !== null) { e.preventDefault(); select(j, true); }
      });
    });
    var start = Math.max(0, tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; }));
    tabs.forEach(function (t, k) { t.tabIndex = k === start ? 0 : -1; if (panels[k]) panels[k].hidden = k !== start; });
    wrap.classList.add('is-ready');
  });

  /* ---- reveals, and pausing decorative loops off screen ---------------------------------- */
  var revealEls = $$('[data-reveal]');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    root.classList.add('reveal-all');
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
    setTimeout(function () { root.classList.add('reveal-all'); }, 2500);
    var loopIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-paused', !en.isIntersecting); });
    }, { threshold: 0 });
    $$('.ticker, .sign').forEach(function (el) { loopIO.observe(el); });
    doc.addEventListener('visibilitychange', function () { $$('.ticker, .sign').forEach(function (el) { el.classList.toggle('is-hidden-tab', doc.hidden); }); });
  }

  /* ---- preview forms: validate, never post ------------------------------------------------ */
  $$('form[data-preview-form]').forEach(function (form) {
    var status = $('.form-status', form) || $('.form-status', form.parentNode);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (status) {
        status.textContent = form.getAttribute('data-preview-form') || 'Thanks! This is a design preview, so nothing was sent.';
        status.setAttribute('data-show', 'true');
        status.setAttribute('role', 'status');
      }
      form.reset();
    });
  });

  /* ---- map: loads only when asked (no third-party request until then) -------------------- */
  $$('[data-map-load]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var frame = btn.closest('.map-frame'); if (!frame) return;
      var ifr = doc.createElement('iframe');
      ifr.src = btn.getAttribute('data-map-load');
      ifr.title = btn.getAttribute('data-map-title') || 'Map';
      ifr.loading = 'lazy';
      ifr.referrerPolicy = 'no-referrer-when-downgrade';
      frame.appendChild(ifr);
      var cover = $('.map-frame__load', frame); if (cover) cover.remove();
    });
  });

  /* ---- news: year filter + show more ------------------------------------------------------ */
  $$('[data-news]').forEach(function (wrap) {
    var cards = $$('[data-year]', wrap), chips = $$('[data-filter]', wrap), more = $('[data-more]', wrap), count = $('[data-count]', wrap);
    var step = parseInt(wrap.getAttribute('data-step') || '12', 10), shown = step, filter = 'all';
    function apply() {
      var match = cards.filter(function (c) { return filter === 'all' || c.getAttribute('data-year') === filter; });
      cards.forEach(function (c) { c.setAttribute('data-hidden', 'true'); });
      match.forEach(function (c, i) { c.setAttribute('data-hidden', i < shown ? 'false' : 'true'); });
      if (more) more.hidden = match.length <= shown;
      if (count) count.textContent = 'Showing ' + Math.min(shown, match.length) + ' of ' + match.length + ' posts';
    }
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        filter = chip.getAttribute('data-filter'); shown = step;
        chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
        apply();
      });
    });
    if (more) more.addEventListener('click', function () {
      var before = shown; shown += step; apply();
      var next = cards.filter(function (c) { return c.getAttribute('data-hidden') === 'false'; })[before];
      if (next) { var a = $('a', next); if (a) a.focus({ preventScroll: false }); }
    });
    apply();
  });
})();
