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

  /* ---- the splash: "Sign ignition" -------------------------------------------------------
     The head script decided before first paint (html.splash-on: first page of a session, motion
     welcome, JS on). Here: build the 53 bulb lights from the logo's measured centres, start the
     CSS timeline once the logo is decoded (if that takes over 0.6 s the page just
     shows: the splash never holds anyone up), let any click, tap, key or scroll skip it (0.2 s),
     and remove it when the scene's lift ends. Underneath, the age gate (first visit) or the page. */
  (function () {
    var sp = $('#splash');
    if (!sp) return;
    if (!root.classList.contains('splash-on') || reduceMotion) { root.classList.remove('splash-on'); sp.parentNode.removeChild(sp); return; }
    var duration = parseInt(sp.getAttribute('data-duration'), 10) || 2300, started = false, finished = false, safety = 0;
    var opts = { capture: true, passive: true }, skipOn = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    var box = $('.splash__bulbs', sp);
    if (box) {
      var frag = doc.createDocumentFragment();
      (box.getAttribute('data-bulbs') || '').split(';').forEach(function (pair, i) {
        var xy = pair.split(','); if (xy.length < 2) return;
        var b = doc.createElement('i'); b.className = 'splash__bulb';
        b.style.setProperty('--x', xy[0]); b.style.setProperty('--y', xy[1]); b.style.setProperty('--i', i);
        frag.appendChild(b);
      });
      box.appendChild(frag);
    }
    // the press that skips must never also press what sits underneath (a gate button, a link):
    // it arms a one-time click guard that stands down 250 ms after the press is released
    var guard = false, guardT = 0;
    var swallow = function (e) { if (guard) { e.preventDefault(); e.stopPropagation(); disarm(); } };
    var release = function () { clearTimeout(guardT); guardT = setTimeout(disarm, 250); };
    var disarm = function () { guard = false; clearTimeout(guardT); window.removeEventListener('click', swallow, true); window.removeEventListener('pointerup', release, true); window.removeEventListener('pointercancel', release, true); };
    var arm = function () { if (guard) return; guard = true; window.addEventListener('click', swallow, true); window.addEventListener('pointerup', release, true); window.addEventListener('pointercancel', release, true); guardT = setTimeout(disarm, 5000); };
    var finish = function (why) {
      if (finished) return; finished = true; clearTimeout(safety);
      skipOn.forEach(function (n) { window.removeEventListener(n, skip, opts); });
      root.classList.remove('splash-on');
      if (sp.parentNode) sp.parentNode.removeChild(sp);
      root.setAttribute('data-splash', why);
      try { window.sessionStorage.setItem('flavors-splash', '1'); } catch (e) { /* storage blocked: it may replay */ }
    };
    var skip = function (e) {
      if (finished) return;
      if (e && (e.type === 'pointerdown' || e.type === 'touchstart')) arm();
      if (!started) { finish('skipped'); return; }
      if (!sp.classList.contains('is-skipping')) sp.classList.add('is-skipping');
    };
    sp.addEventListener('animationend', function (e) {
      if (e.target === sp && e.animationName === 'splash-skip') { finish('skipped'); return; }
      if (e.target && e.target.getAttribute && e.target.getAttribute('data-exit') === e.animationName) finish('ended');
    });
    skipOn.forEach(function (n) { window.addEventListener(n, skip, opts); });
    if (doc.visibilityState === 'hidden') { finish('hidden'); return; }
    root.setAttribute('data-splash', 'loading');
    var waits = [], logo = $('.splash__logo', sp);
    if (logo) waits.push(logo.decode ? logo.decode() : Promise.resolve());
    var slow = new Promise(function (r) { setTimeout(function () { r('slow'); }, 600); });
    Promise.race([Promise.all(waits).then(function () { return 'ready'; }), slow]).then(function (state) {
      if (finished) return;
      if (state !== 'ready') { finish('slow'); return; }
      (window.requestAnimationFrame || setTimeout)(function () {
        if (finished) return;
        started = true; root.setAttribute('data-splash', 'playing'); sp.classList.add('is-playing');
        safety = setTimeout(function () { finish('safety'); }, duration + 600);
      });
    }, function () { finish('no-logo'); });
  })();

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
    ignite();
  }

  /* ---- ignition: once per session the hero sign switches on (after the gate, if any) ------ */
  function ignite() {
    if (!root.classList.contains('pre-ignite')) return;
    root.classList.remove('pre-ignite');
    if (!$('.hero') || reduceMotion) return;
    try { window.sessionStorage.setItem('flavors-lit', '1'); } catch (e) { /* storage blocked: it may replay */ }
    root.classList.add('igniting');   // kept on: the ignition animations simply end in their final state
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
      ignite();
    }
  } else {
    ignite();
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
  var motionOK = !reduceMotion && ('IntersectionObserver' in window);
  if (!motionOK) {
    root.classList.add('reveal-all');
  } else {
    // split headings: each word rises into place (the heading keeps its full text as its name)
    $$('main h2.h2, main .box__title').forEach(function (h) {
      if (h.closest('.visually-hidden')) return;
      var label = h.textContent.replace(/\s+/g, ' ').trim(), w = 0;
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = doc.createDocumentFragment(), first = null;
            // text that starts right after a tag with no space (", every day" after <span>prices</span>)
            // stays on the line of that tag's last word: the two are glued (owner, 2026-11-09: the
            // comma fell to a line of its own; separate inline-blocks may break between them)
            var lead = /^\S/.test(n.textContent) && n.previousSibling && n.previousSibling.nodeType === 1 ? n.previousSibling : null;
            n.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(part)); return; }
              var o = doc.createElement('span'), i = doc.createElement('span');
              o.className = 'sw'; o.setAttribute('aria-hidden', 'true');
              i.className = 'sw__i'; i.style.setProperty('--w', w++); i.textContent = part;
              o.appendChild(i); frag.appendChild(o);
              if (!first) first = o;
            });
            n.parentNode.replaceChild(frag, n);
            if (lead && first) {
              var g = doc.createElement('span'); g.className = 'sw-glue';
              lead.parentNode.insertBefore(g, lead); g.appendChild(lead); g.appendChild(first);
            }
          } else if (n.nodeType === 1 && !/^(svg|br)$/i.test(n.tagName)) walk(n);
        });
      })(h);
      h.setAttribute('aria-label', label);
      h.classList.add('is-split');
      h.setAttribute('data-reveal-words', '');
    });
    var fired = false;
    var io = new IntersectionObserver(function (entries) {
      fired = true;
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.concat($$('[data-reveal-words]')).forEach(function (el) { io.observe(el); });
    // fail-safe: if the observer never reports, show everything (reveals then stay a scroll effect)
    setTimeout(function () { if (!fired) root.classList.add('reveal-all'); }, 2500);
    var loopIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-paused', !en.isIntersecting || doc.hidden); });
    }, { threshold: 0 });
    var loops = $$('.ticker, .sign, .hero, .tapes, .box, .tags--hang, .site-footer, .kinetic, .band--spot, .band--rain, .band--bokeh, [data-rail], .page-hero--scene, .neon-sign');
    loops.forEach(function (el) { loopIO.observe(el); });
    doc.addEventListener('visibilitychange', function () {
      loops.forEach(function (el) {
        el.classList.toggle('is-hidden-tab', doc.hidden);
        var r = el.getBoundingClientRect();
        el.classList.toggle('is-paused', doc.hidden || r.bottom < 0 || r.top > window.innerHeight);
      });
    });
  }

  /* ---- cinema: depth, pointer light, tilt + glint, magnetic buttons, scroll-lit words ------ */
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
  if (motionOK) {
    /* ---- the alive engine: one loop for everything that answers the scroll ----------------
       scrollFns(y, vh) run after a scroll and write only (geometry is cached by measureFns on
       resize, load, font load and body resize, so scrolling never reads layout); tickers(t, dt,
       y, vel) run every frame while one of them asks for another. vel = smoothed scroll speed in
       px per ms, signed (down = positive). */
    var scrollFns = [], tickers = [], measureFns = [], geo = [];
    // (engT / engY: the header code above already owns a function-scoped lastY)
    var rafId = 0, dirty = true, engT = 0, engY = window.scrollY || 0, vel = 0, motionPaused = false;
    var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
    var hostGeo = function (el) { for (var i = 0; i < geo.length; i++) if (geo[i].el === el) return geo[i]; var g = { el: el, top: 0, h: 0 }; geo.push(g); return g; };
    var frame = function (t) {
      rafId = 0;
      var y = window.scrollY || 0, vh = window.innerHeight;
      var dt = engT ? clamp(t - engT, 1, 64) : 16.7; engT = t;
      vel += ((y - engY) / dt - vel) * Math.min(1, dt / 90); engY = y;
      if (Math.abs(vel) < 0.002) vel = 0;
      if (dirty) { dirty = false; for (var i = 0; i < scrollFns.length; i++) scrollFns[i](y, vh); }
      var awake = vel !== 0;
      if (!doc.hidden) for (var k = 0; k < tickers.length; k++) if (tickers[k](t, dt, y, vel)) awake = true;
      if (awake) rafId = raf(frame); else engT = 0;
    };
    var kick = function () { if (!rafId) rafId = raf(frame); };
    var remeasure = function () { for (var i = 0; i < measureFns.length; i++) measureFns[i](); dirty = true; kick(); };
    window.addEventListener('scroll', function () { dirty = true; kick(); }, { passive: true });
    window.addEventListener('resize', remeasure);
    window.addEventListener('load', remeasure);
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden) kick(); });

    // pause motion (WCAG 2.2.2): one button stops every loop; the choice is remembered
    var mtBtn = $('[data-motion-toggle]');
    motionPaused = store.get('flavors-motion') === 'off';
    var applyMotion = function () {
      root.classList.toggle('motion-off', motionPaused);
      if (mtBtn) mtBtn.setAttribute('aria-pressed', motionPaused ? 'true' : 'false');
      dirty = true; kick();
    };
    if (mtBtn) {
      mtBtn.hidden = false;
      mtBtn.addEventListener('click', function () { motionPaused = !motionPaused; store.set('flavors-motion', motionPaused ? 'off' : 'on'); applyMotion(); });
    }
    applyMotion();

    // the category rail: on big screens the band pins and the cards slide sideways with the scroll
    var railSec = $('[data-rail]');
    if (railSec) {
      var rTrack = $('.bento', railSec), rView = $('.rail__view', railSec), rPin = $('.rail__pin', railSec);
      var rIdx = $('[data-rail-index]', railSec), rBar = $('.rail__bar i', railSec), rItems = $$('.bento__item', railSec);
      var railOn = false, travel = 0, headH = 0, rg = hostGeo(railSec);
      measureFns.push(function () {   // first: the rail's height moves everything below it
        var want = !!(rTrack && rView && rPin) && window.innerWidth >= 1024 && window.innerHeight >= 700;
        if (want !== railOn) {
          railOn = want; railSec.classList.toggle('rail-on', want);
          if (!want) { railSec.style.height = ''; rTrack.style.transform = ''; }
        }
        if (!railOn) return;
        railSec.style.height = '';
        travel = Math.max(0, rTrack.scrollWidth - rView.clientWidth);
        railSec.classList.toggle('rail-static', !travel);   // nothing to slide: hide the counter and progress
        railSec.style.height = (rPin.offsetHeight + travel) + 'px';
        var mh = $('.masthead'); headH = (mh ? mh.offsetHeight : 0) + 3;
      });
      scrollFns.push(function (y) {
        if (!railOn || !travel) return;
        var p = clamp((y + headH - rg.top) / travel, 0, 1);
        rTrack.style.transform = 'translate3d(' + (-p * travel).toFixed(1) + 'px,0,0)';
        if (rBar) rBar.style.setProperty('--rp', p.toFixed(4));
        if (rIdx) { var n = Math.min(rItems.length, Math.floor(p * rItems.length * 0.999) + 1); rIdx.textContent = (n < 10 ? '0' : '') + n; }
      });
    }

    // reading progress: the spectrum line under the header fills; the back-to-top ring follows
    var fill = $('.rainbow-rule__fill'), toTop = $('[data-to-top]'), docMax = 1;
    measureFns.push(function () { docMax = Math.max(1, doc.documentElement.scrollHeight - window.innerHeight); });
    scrollFns.push(function (y, vh) {
      var p = clamp(y / docMax, 0, 1);
      if (fill) fill.style.setProperty('--p', p.toFixed(4));
      if (toTop) { toTop.style.setProperty('--p', p.toFixed(4)); toTop.classList.toggle('is-on', y > vh * 0.9); }
    });
    if (toTop) toTop.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      var brand = $('.brand'); if (brand) setTimeout(function () { brand.focus({ preventScroll: true }); }, 700);
    });

    // depth: [data-depth] layers drift against the scroll (lighter on touch, off on small screens)
    // (a light pool stays still and band-sized: its light inside takes the depth, as --dy)
    var depthEls = $$('[data-depth]').map(function (el) { return { el: el, pool: el.classList.contains('pool'), d: parseFloat(el.getAttribute('data-depth')) || 0, g: hostGeo(el.closest('section, footer, .kinetic') || el.parentElement) }; });
    var depthSet = function (o, v) {
      if (o.pool) { if (v) o.el.style.setProperty('--dy', v); else o.el.style.removeProperty('--dy'); }
      else o.el.style.transform = v ? 'translate3d(0,' + v + ',0)' : '';
    };
    var depthOn = false, amp = fine ? 1 : 0.6;
    measureFns.push(function () { depthOn = window.innerWidth >= 700; if (!depthOn) depthEls.forEach(function (o) { depthSet(o, ''); }); });
    scrollFns.push(function (y, vh) {
      if (!depthOn) return;
      for (var i = 0; i < depthEls.length; i++) {
        var o = depthEls[i], top = o.g.top - y;
        if (motionPaused) { depthSet(o, ''); continue; }
        if (top + o.g.h < -240 || top > vh + 240) continue;
        depthSet(o, ((top + o.g.h / 2 - vh / 2) * -o.d * amp).toFixed(1) + 'px');
      }
    });

    // the hero lets go: words drift down and dim, the sign lifts and settles, the road pushes in
    var heroSec = $('[data-hero]');
    if (heroSec) {
      var hText = $('.hero__text', heroSec), hArt = $('.hero__art', heroSec), hFrames = $$('.hero__frame', heroSec), hg = hostGeo(heroSec), lastHP = -1;
      scrollFns.push(function (y) {
        var p = motionPaused ? 0 : clamp((y - hg.top + 60) / Math.max(1, hg.h), 0, 1);
        if (p === lastHP) return; lastHP = p;
        if (hText) { hText.style.transform = p ? 'translate3d(0,' + (p * 90).toFixed(1) + 'px,0)' : ''; hText.style.opacity = p ? (1 - p * 0.9).toFixed(3) : ''; }
        if (hArt) hArt.style.transform = p ? 'translate3d(0,' + (-p * 50).toFixed(1) + 'px,0) scale(' + (1 - p * 0.07).toFixed(4) + ')' : '';
        for (var hf = 0; hf < hFrames.length; hf++) hFrames[hf].style.scale = p ? (1 + p * 0.12).toFixed(4) : '';   // both copies (colour + black-and-white) push in together
      });
    }

    // marquees: the letter board, the navy tape and the kinetic rows run on the loop, faster while
    // the page scrolls and turning round when it scrolls back up; the board holds still under a pointer
    var marq = [];
    $$('.ticker__track').forEach(function (el) { marq.push({ el: el, host: el.closest('.ticker'), dir: -1, base: 0.05, k: 0.6 }); });
    $$('.tape__track').forEach(function (el) { marq.push({ el: el, host: el.closest('.tapes'), dir: 1, base: 0.035, k: 0.5 }); });
    $$('.kinetic__row').forEach(function (row) { var tr = $('.kinetic__track', row); if (tr) marq.push({ el: tr, host: row.closest('.kinetic'), dir: parseFloat(row.getAttribute('data-dir')) || 1, base: 0.04, k: 0.9 }); });
    if (marq.length && 'IntersectionObserver' in window) {
      root.classList.add('kinetic-on');
      marq.forEach(function (m) {
        m.x = 0; m.w = 0; m.on = false; m.hold = false;
        if (m.host && m.host.classList.contains('ticker')) {
          m.host.addEventListener('pointerenter', function () { m.hold = true; });
          m.host.addEventListener('pointerleave', function () { m.hold = false; kick(); });
        }
      });
      measureFns.push(function () { marq.forEach(function (m) { m.w = m.el.scrollWidth / 2; }); });
      var mio = new IntersectionObserver(function (es) {
        es.forEach(function (en) { marq.forEach(function (m) { if (m.host === en.target) m.on = en.isIntersecting; }); });
        kick();
      }, { rootMargin: '120px 0px' });
      var mHosts = []; marq.forEach(function (m) { if (m.host && mHosts.indexOf(m.host) < 0) { mHosts.push(m.host); mio.observe(m.host); } });
      tickers.push(function (t, dt, y, v) {
        if (motionPaused) return false;
        var any = false;
        for (var i = 0; i < marq.length; i++) {
          var m = marq[i]; if (!m.on || !m.w) continue; any = true;
          if (m.hold && Math.abs(v) < 0.01) continue;
          m.x += m.dir * (m.base + clamp(v, -2.5, 2.5) * m.k) * dt;
          if (m.x <= -m.w) m.x += m.w; else if (m.x > 0) m.x -= m.w;
          m.el.style.transform = 'translate3d(' + m.x.toFixed(2) + 'px,0,0)';
        }
        return any;
      });
    }

    // the finale: the footer wordmark and its bulbs light up over the last stretch of the page
    var fin = $('[data-finale]');
    if (fin) {
      var fg = hostGeo(fin);
      scrollFns.push(function (y, vh) {
        var start = fg.top - vh, span = Math.max(1, docMax - start);
        var p = motionPaused ? 1 : clamp((y - start) / span, 0, 1);
        fin.style.setProperty('--lit', p.toFixed(3));
      });
    }

    // entrances: a light curtain passes down each band as it arrives; framed media get a beam
    var curtIO = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.__curtain.classList.add('is-on'); curtIO.unobserve(en.target); } });
    }, { threshold: 0.12 });
    $$('main > section.band, main > .kinetic').forEach(function (b) {
      if (b.getBoundingClientRect().top < window.innerHeight * 0.8) return;   // already in view at load: no sweep
      var c = doc.createElement('span'); c.className = 'curtain'; c.setAttribute('aria-hidden', 'true'); c.appendChild(doc.createElement('i'));
      b.appendChild(c); b.__curtain = c; curtIO.observe(b);
    });
    var beamIO = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('beam-on'); beamIO.unobserve(en.target); } });
    }, { threshold: 0.35 });
    // the category tiles: the sweep runs on the coloured card only, under the product (owner, 2026-11-09)
    $$('.bento__card, main .photo, .box--glass .strain, main .store-card, .post-card--feature, .learn-photo, .map-frame').forEach(function (el) {
      el.classList.add('beam-host');
      var s = doc.createElement('span'); s.className = 'beam'; s.setAttribute('aria-hidden', 'true'); el.appendChild(s); beamIO.observe(el);
    });

    // glass cards carry an orbiting edge light; dark bands get a pointer spotlight (fine pointer)
    if (fine) {
      $$('.box--glass .strain, .panel--glass, .band--rain .store-card, .page-hero--scene .store-card').forEach(function (el) {
        el.classList.add('orbit-host');
        var o = doc.createElement('span'); o.className = 'orbit'; o.setAttribute('aria-hidden', 'true'); el.appendChild(o);
      });
      $$('.band--neon, .band--spot, .band--rain, .band--bokeh, .kinetic, .page-hero--scene').forEach(function (b) {
        var s = doc.createElement('span'); s.className = 'spot'; s.setAttribute('aria-hidden', 'true'); b.appendChild(s);
        var ev = null, q = false;
        b.addEventListener('pointermove', function (e) {
          ev = e; if (q) return; q = true;
          raf(function () { q = false; var r = b.getBoundingClientRect(); s.style.setProperty('--mx', (ev.clientX - r.left).toFixed(0) + 'px'); s.style.setProperty('--my', (ev.clientY - r.top).toFixed(0) + 'px'); });
        }, { passive: true });
        b.addEventListener('pointerenter', function () { b.classList.add('spot-on'); });
        b.addEventListener('pointerleave', function () { b.classList.remove('spot-on'); });
      });
    }
    // the hero's LED light follows the pointer
    var heroEl = $('.hero'), light = $('.hero__light');
    if (fine && heroEl && light) {
      var lp = null, lq = false;
      heroEl.addEventListener('pointermove', function (e) {
        lp = e; if (lq) return; lq = true;
        raf(function () {
          lq = false; var r = heroEl.getBoundingClientRect();
          light.style.setProperty('--mx', ((lp.clientX - r.left) / r.width * 100).toFixed(1) + '%');
          light.style.setProperty('--my', ((lp.clientY - r.top) / r.height * 100).toFixed(1) + '%');
        });
      }, { passive: true });
    }
    // tilt + glint on cards
    if (fine) {
      $$('[data-tilt]').forEach(function (card) {
        var ev = null, q = false, glint = $('.bento__glint', card);
        card.addEventListener('pointermove', function (e) {
          ev = e; if (q) return; q = true;
          raf(function () {
            q = false; var r = card.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
            card.style.setProperty('--ry', ((px - 0.5) * 7).toFixed(2) + 'deg');
            card.style.setProperty('--rx', ((0.5 - py) * 5).toFixed(2) + 'deg');
            if (glint) { glint.style.setProperty('--gx', (px * 100).toFixed(1) + '%'); glint.style.setProperty('--gy', (py * 100).toFixed(1) + '%'); }
          });
        }, { passive: true });
        card.addEventListener('pointerleave', function () { card.style.removeProperty('--rx'); card.style.removeProperty('--ry'); });
      });
      // magnetic calls to action
      $$('.hero__ctas .btn, [data-magnetic]').forEach(function (b) {
        b.addEventListener('pointermove', function (e) {
          var r = b.getBoundingClientRect();
          b.style.translate = ((e.clientX - r.left - r.width / 2) * 0.16).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * 0.26).toFixed(1) + 'px';
        }, { passive: true });
        b.addEventListener('pointerleave', function () { b.style.translate = ''; });
      });
    }
    // stats count up once as they come into view (the final number is the HTML, so no-JS and
    // reduced motion show it as written)
    var counters = $$('[data-count]');
    if (counters.length) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          cio.unobserve(en.target);
          var el = en.target, end = parseInt(el.getAttribute('data-count'), 10), t0 = 0;
          if (!(end > 0)) return;
          el.style.fontVariantNumeric = 'tabular-nums';
          var step = function (t) {
            if (!t0) t0 = t;
            var k = Math.min(1, (t - t0) / 1400), v = Math.round(end * (1 - Math.pow(1 - k, 3)));
            el.textContent = v.toLocaleString('en-US');
            if (k < 1) raf(step); else el.style.fontVariantNumeric = '';
          };
          raf(step);
        });
      }, { threshold: 0.2 });
      // only numbers still below the screen are zeroed and counted; anything already in view stays put
      counters.forEach(function (el) { if (el.getBoundingClientRect().top > window.innerHeight) { el.textContent = '0'; cio.observe(el); } });
    }
    // scroll-lit statement: words switch on in reading order as it passes through the screen
    var litEls = $$('[data-scroll-lit]');
    if (litEls.length) {
      var sets = litEls.map(function (el) {
        (function wrap(node) {
          Array.prototype.slice.call(node.childNodes).forEach(function (n) {
            if (n.nodeType === 3) {
              var frag = doc.createDocumentFragment();
              n.textContent.split(/(\s+)/).forEach(function (part) {
                if (!part) return;
                if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(part)); return; }
                var s = doc.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s);
              });
              n.parentNode.replaceChild(frag, n);
            } else if (n.nodeType === 1) wrap(n);
          });
        })(el);
        return { el: el, words: $$('.w', el), g: hostGeo(el), k: -1 };
      });
      root.classList.add('lit-ready');
      scrollFns.push(function (y, vh) {
        sets.forEach(function (s) {
          var top = s.g.top - y;
          var p = clamp((vh * 0.9 - top) / (s.g.h + vh * 0.28), 0, 1), k = Math.round(p * s.words.length);
          if (k === s.k) return; s.k = k;
          s.words.forEach(function (w, i) { w.classList.toggle('is-lit', i < k); });
        });
      });
    }

    // geometry last: the rail has set its height by now, so every cached top is final
    measureFns.push(function () {
      var sy = window.scrollY || 0;
      geo.forEach(function (g) { var r = g.el.getBoundingClientRect(); g.top = r.top + sy; g.h = r.height; });
    });
    if ('ResizeObserver' in window) {
      var roQ = false;
      new ResizeObserver(function () { if (roQ) return; roQ = true; raf(function () { roQ = false; remeasure(); }); }).observe(doc.body);
    }
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(remeasure);
    remeasure();
  }

  /* ---- the Owner's Box: the road case opens and the cards fly out to their floating row ------
     (owner, 2026-11-09). Each card starts at the case's opening: --fx/--fy is the way from its own
     place back there (measured from its layout box, which a transform never moves). It runs once,
     when a third of the stage is in view; without motion (reduced or paused) or without
     IntersectionObserver the box is simply shown open. */
  (function () {
    var ob = $('[data-ownbox]');
    if (!ob) return;
    var cs = $('.ownbox__case', ob), list = $('.ownbox__cards', ob), slots = $$('.holo-slot', ob);
    function aim() {
      var c = cs.getBoundingClientRect(), l = list.getBoundingClientRect();
      var ox = c.left + c.width * 0.5, oy = c.top + c.height * 0.32;
      slots.forEach(function (s, i) {
        var cx = l.left - list.scrollLeft + s.offsetLeft + s.offsetWidth / 2, cy = l.top + s.offsetTop + s.offsetHeight / 2;
        s.style.setProperty('--fx', Math.round(ox - cx) + 'px');
        s.style.setProperty('--fy', Math.round(oy - cy) + 'px');
        s.style.setProperty('--fr', ((i - (slots.length - 1) / 2) * 16) + 'deg');
      });
    }
    var still = function () { return reduceMotion || root.classList.contains('motion-off') || !('IntersectionObserver' in window); };
    function open() {
      if (ob.classList.contains('is-open')) return;
      aim();
      if (still()) { ob.classList.add('is-instant', 'is-open'); return; }
      raf(function () {
        ob.classList.add('is-open');
        setTimeout(function () { ob.classList.add('is-floating'); }, 900 + 200 * slots.length + 1300);
      });
    }
    if (still()) { open(); return; }
    aim();
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); open(); } });
    }, { threshold: 0.33 });
    io.observe(ob);
    window.addEventListener('resize', function () { if (!ob.classList.contains('is-open')) aim(); }, { passive: true });
  })();

  /* ---- the store gallery: photos on a wall that curves around the viewer ------------------
     (owner, 2026-11-09). Panel i hangs at the angle a = (i - pos) * step on a drum of radius R, seen
     from inside it at the perspective distance P: x = R sin a, z = R (1 - cos a), turned by -a, so the
     side panels come closer and turn in. pos drifts slowly; a drag keeps the wall under the pointer, a
     flick carries on and the wall settles with a panel centred; a click on a side panel, the buttons,
     the arrow keys and a sideways swipe turn it. It drifts only while in view, never under reduced or
     paused motion, and brakes while a mouse rests on it or the keyboard is in it (WCAG 2.2.2). Without
     this script the list is a plain swipe row (cinema.css). */
  $$('[data-cave]').forEach(function (cv) {
    var stage = $('.cave__stage', cv), wall = $('.cave__wall', cv), panels = $$('.cave__panel', cv), n = panels.length;
    if (!n || !stage || !wall) return;
    var cap = $('.cave__caption', cv), capT = $('.cave__title', cv), capS = $('.cave__sub', cv), num = $('[data-cave-n]', cv);
    cv.classList.add('cave-on');
    var DRIFT = 0.12;                                     // panels per second
    var pos = 0, target = null, speed = 0, h = 0, w = 0, gap = 0, R = 0, step = 0;
    var hover = false, keyIn = false, inView = !('IntersectionObserver' in window), dragging = false;
    var frame = 0, last = 0, shown = -1;
    var still = function () { return reduceMotion || root.classList.contains('motion-off') || doc.hidden; };
    var wrap = function (d) { var m = ((d % n) + n) % n; return m >= n / 2 ? m - n : m; };   // into [-n/2, n/2)
    function measure() {
      var W = stage.clientWidth;
      h = Math.round(Math.max(150, Math.min(300, W * 0.205)));
      w = Math.round(h * 1.25); gap = Math.round(Math.max(10, h * 0.055));
      var P = h * 4; R = P * 1.08; step = (w + gap) / R;
      cv.style.setProperty('--ph', h + 'px'); cv.style.setProperty('--pw', w + 'px');
      wall.style.perspective = P + 'px';
      stage.style.height = Math.round(h * 1.6) + 'px';
      paint();
    }
    function paint() {
      for (var i = 0; i < n; i++) {
        var d = wrap(i - pos), a = d * step, z = R * (1 - Math.cos(a)), el = panels[i];
        var op = Math.max(0, Math.min(1, (n / 2 - 0.55 - Math.abs(d)) / 0.6));   // gone before it wraps round
        el.style.transform = 'translate3d(' + (R * Math.sin(a)).toFixed(1) + 'px,0,' + z.toFixed(1) + 'px) rotateY(' + (-a).toFixed(4) + 'rad)';
        el.style.opacity = op.toFixed(3);
        el.style.visibility = op > 0 ? '' : 'hidden';
        el.style.zIndex = String(100 + Math.round(z / 4));
      }
      var c = ((Math.round(pos) % n) + n) % n;
      if (c === shown) return;
      shown = c;
      if (capT) capT.textContent = panels[c].getAttribute('data-title') || '';
      if (capS) capS.textContent = panels[c].getAttribute('data-sub') || '';
      if (num) num.textContent = (c < 9 ? '0' : '') + (c + 1);
      if (cap) { cap.classList.remove('is-new'); void cap.offsetWidth; cap.classList.add('is-new'); }
      panels.forEach(function (p, k) { if (k === c) p.setAttribute('aria-current', 'true'); else p.removeAttribute('aria-current'); });
    }
    function tick(now) {
      frame = 0;
      var dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      var moving = dragging;
      if (!dragging && target !== null) {
        pos += (target - pos) * (1 - Math.exp(-dt * 9));
        if (Math.abs(target - pos) < 0.0006) { pos = target; target = null; }
        moving = true;
      } else if (!dragging) {
        var brake = hover || keyIn || still() || !inView;
        speed += ((brake ? 0 : DRIFT) - speed) * (1 - Math.exp(-dt * 2.5));
        if (brake && Math.abs(speed) < 0.002) speed = 0;
        if (speed) { pos += speed * dt; moving = true; }
        else if (brake && (hover || keyIn) && Math.abs(pos - Math.round(pos)) > 0.0006) { target = Math.round(pos); moving = true; }
      }
      paint();
      if (moving || (inView && !still() && !hover && !keyIn)) frame = requestAnimationFrame(tick);
    }
    function kick() { if (!frame) { last = performance.now(); frame = requestAnimationFrame(tick); } }
    function settle(t) {
      speed = 0;
      if (still()) { pos = t; target = null; paint(); return; }   // reduced motion: the wall moves only as asked, at once
      target = t; kick();
    }
    function go(dir) { settle((target !== null ? target : Math.round(pos)) + dir); }
    // drag, flick, click
    var startX = 0, startPos = 0, lastX = 0, lastT = 0, vel = 0, moved = 0, pid = null;
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true; target = null; speed = 0; pid = e.pointerId;
      startX = lastX = e.clientX; startPos = pos; lastT = performance.now(); vel = 0; moved = 0;
      try { stage.setPointerCapture(pid); } catch (err) { /* capture is a nicety */ }
      cv.classList.add('is-dragging'); kick();
    });
    stage.addEventListener('pointermove', function (e) {
      if (!dragging || e.pointerId !== pid) return;
      var dx = e.clientX - startX, now = performance.now(), dt = Math.max(8, now - lastT);
      moved = Math.max(moved, Math.abs(dx));
      pos = startPos - dx / (w + gap);
      vel = 0.75 * vel + 0.25 * (-(e.clientX - lastX) / (w + gap)) / (dt / 1000);
      lastX = e.clientX; lastT = now;
      paint();
    });
    function release(e) {
      if (!dragging || e.pointerId !== pid) return;
      dragging = false; cv.classList.remove('is-dragging');
      if (e.type === 'pointerup' && moved < 6) {           // a click: turn to the panel under it
        var hit = doc.elementFromPoint(e.clientX, e.clientY), p = hit && hit.closest ? hit.closest('.cave__panel') : null;
        var k = p ? panels.indexOf(p) : -1, c = Math.round(pos);
        settle(k >= 0 ? c + Math.round(wrap(k - c)) : c);
        return;
      }
      if (performance.now() - lastT > 120) vel = 0;        // held still before letting go: no flick
      settle(Math.round(pos + Math.max(-3, Math.min(3, vel * 0.35))));
    }
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    // a sideways swipe on a trackpad turns it; an up-and-down wheel stays the page's
    var wheelT = 0;
    stage.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault(); target = null; speed = 0;
      pos += e.deltaX / (w + gap); paint();
      clearTimeout(wheelT); wheelT = setTimeout(function () { settle(Math.round(pos)); }, 140);
    }, { passive: false });
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    var prev = $('[data-cave-prev]', cv), next = $('[data-cave-next]', cv);
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    stage.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hover = true; kick(); } });
    stage.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hover = false; kick(); } });
    cv.addEventListener('focusin', function (e) { if (e.target.matches && e.target.matches(':focus-visible')) { keyIn = true; kick(); } });
    cv.addEventListener('focusout', function (e) { if (!cv.contains(e.relatedTarget)) { keyIn = false; kick(); } });
    if (!inView) new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; kick(); }, { rootMargin: '80px 0px' }).observe(stage);
    doc.addEventListener('visibilitychange', kick);
    new MutationObserver(kick).observe(root, { attributes: true, attributeFilter: ['class'] });   // Pause motion
    window.addEventListener('resize', measure, { passive: true });
    measure(); kick();
  });

  /* ---- the order bar: on from the second screen, closable for the visit (owner, 2026-11-09) ---- */
  (function () {
    var bar = $('[data-orderbar]');
    if (!bar) return;
    var KEY = 'flavors-orderbar-off';
    try { if (window.sessionStorage.getItem(KEY) === '1') return; } catch (e) { /* storage blocked: show it */ }
    bar.hidden = false;
    root.classList.add('has-orderbar');
    var on = false;
    var update = function () {
      var want = (window.scrollY || 0) > Math.min(window.innerHeight * 0.8, 720);
      if (want !== on) { on = want; bar.classList.toggle('is-on', on); }
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
    var close = $('[data-orderbar-close]', bar);
    if (close) close.addEventListener('click', function () {
      try { window.sessionStorage.setItem(KEY, '1'); } catch (e) { /* closed for this page only */ }
      var hadFocus = bar.contains(doc.activeElement);
      window.removeEventListener('scroll', update);
      bar.classList.remove('is-on'); root.classList.remove('has-orderbar');
      setTimeout(function () { bar.hidden = true; }, 650);
      if (hadFocus) { var t = $('.masthead .btn--order') || $('#main'); if (t) { if (!t.hasAttribute('tabindex') && t.id === 'main') t.setAttribute('tabindex', '-1'); t.focus(); } }
    });
  })();

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
  // /visit/ "ask a budtender" questions: tabs (click, arrow keys, Home / End); the answer arrives as a chat reply
  $$('[data-askb]').forEach(function (box) {
    var tabs = $$('[role="tab"]', box), panels = $$('[role="tabpanel"]', box);
    function show(n, focus) {
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === n ? 'true' : 'false'); t.tabIndex = k === n ? 0 : -1; });
      panels.forEach(function (p, k) { p.hidden = k !== n; p.classList.toggle('is-new', k === n); });
      if (focus) tabs[n].focus();
      // phones: the chip row scrolls sideways; keep the chosen chip in view without moving the page
      var row = tabs[n].parentElement;
      if (row.scrollWidth > row.clientWidth) row.scrollTo({ left: Math.max(0, tabs[n].offsetLeft - 16), behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    tabs.forEach(function (t, k) { t.addEventListener('click', function () { show(k, false); }); });
    box.addEventListener('keydown', function (e) {
      var cur = tabs.indexOf(document.activeElement); if (cur < 0) return;
      var n = { ArrowRight: cur + 1, ArrowDown: cur + 1, ArrowLeft: cur - 1, ArrowUp: cur - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (n === undefined) return; e.preventDefault(); show((n + tabs.length) % tabs.length, true);
    });
  });
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
