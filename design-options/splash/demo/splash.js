/* Flavors Detroit: splash concepts, shared runtime (a design option, not wired into the site).
   The inline head script decides before first paint whether the splash runs at all (never under
   prefers-reduced-motion, never without JavaScript, never twice in a session when ?once=1).
   This file then:
   - builds the 53 bulb lights from the logo's measured bulb centres,
   - starts every concept's CSS timeline in the same frame, once the logo (and the neon font) have
     decoded; if that takes longer than 0.6 s the page simply shows, the splash never holds it up,
   - lets any click, tap, key or scroll skip it (0.2 s fade),
   - removes the splash when the element marked [data-exit] finishes its exit animation. */
(function () {
  'use strict';

  var root = document.documentElement;
  var splash = document.getElementById('splash');
  var now = function () { return window.performance && performance.now ? performance.now() : Date.now(); };
  var topLevel = window.self === window.top;

  // Bulb centres in % of the logo box, clockwise from the upper left.
  // Source: src/content/logo-bulbs.json (1838 x 1482 original), sorted by its order index i.
  var BULBS = [[27.41,16.56],[32.08,13.38],[36.78,10.79],[41.64,8.77],[46.47,7.31],[51.1,6.7],[55.44,6.7],[60.41,8],[61.15,14.08],[63.59,20.15],[68.01,23.18],[73.14,21.02],[77.5,17.17],[82.37,15.37],[86.14,19.46],[88.8,25.54],[90.96,32.1],[90.91,38.81],[87.01,42.93],[83.24,47.62],[82.66,54.61],[84.69,61.13],[87.03,68.02],[87.61,75.03],[84.69,80.67],[80.61,84.87],[75.4,87.38],[69.94,88.84],[64.49,89.73],[59.21,89.17],[57.76,83.72],[55.61,78.33],[50.68,77.45],[45.9,80.12],[41.35,83.72],[36.21,87.04],[30.95,89.17],[25.22,90.2],[19.35,90.2],[13.9,87.83],[9.89,83.44],[8.44,77.37],[11.01,71.86],[15.01,67.31],[17.91,61.67],[18.35,55.1],[15.97,48.92],[12.45,43.59],[9.95,38.06],[10.6,32.28],[13.9,27.74],[17.91,23.55],[22.81,19.95]];

  function replayChip() {
    // Full-screen demo only: inside the options page each stage has its own Replay button.
    if (!topLevel || document.querySelector('.demo-replay')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'demo-replay'; b.textContent = 'Replay splash';
    b.addEventListener('click', function () { window.location.reload(); });
    document.body.appendChild(b);
  }

  if (!splash) return;
  if (!root.classList.contains('splash-on')) {
    // Reduced motion (or already seen this session): the page shows directly, the splash never renders.
    splash.parentNode.removeChild(splash);
    return;
  }
  root.setAttribute('data-splash', 'loading');

  var duration = parseInt(splash.getAttribute('data-duration'), 10) || 2400;
  var started = false, finished = false, safety = 0;
  var listenOpts = { capture: true, passive: true };
  var skipEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart'];

  function buildBulbs() {
    var boxes = splash.querySelectorAll('[data-bulbs]');
    for (var b = 0; b < boxes.length; b++) {
      var frag = document.createDocumentFragment();
      for (var i = 0; i < BULBS.length; i++) {
        var el = document.createElement('i');
        el.className = 'bulb';
        el.style.setProperty('--x', BULBS[i][0]);
        el.style.setProperty('--y', BULBS[i][1]);
        el.style.setProperty('--i', i);
        frag.appendChild(el);
      }
      boxes[b].appendChild(frag);
    }
  }

  // "sweep" bulbs light when a light crossing the screen reaches them: give each bulb its
  // horizontal position as a fraction of the splash width (--sx); the concept's CSS turns that
  // into its delay, so the timing follows the real layout on any screen.
  function placeSweep() {
    var boxes = splash.querySelectorAll('[data-bulbs="sweep"]');
    var s = splash.getBoundingClientRect();
    for (var b = 0; b < boxes.length; b++) {
      var r = boxes[b].getBoundingClientRect();
      var lights = boxes[b].querySelectorAll('.bulb');
      for (var i = 0; i < lights.length; i++) {
        var x = r.left - s.left + r.width * BULBS[i][0] / 100;
        lights[i].style.setProperty('--sx', Math.max(0, Math.min(1, x / (s.width || 1))).toFixed(4));
      }
    }
  }

  function finish(reason) {
    if (finished) return;
    finished = true;
    clearTimeout(safety);
    for (var k = 0; k < skipEvents.length; k++) window.removeEventListener(skipEvents[k], skip, listenOpts);
    root.classList.remove('splash-on');
    if (splash.parentNode) splash.parentNode.removeChild(splash);
    root.setAttribute('data-splash', 'done');
    root.setAttribute('data-splash-end', reason);
    window.__splashEnd = now();
    try { window.sessionStorage.setItem('flavors-splash', '1'); } catch (e) { /* storage blocked: it may replay */ }
    // In production this is the hand-off point: open the age gate here on a first visit.
    replayChip();
  }

  // The tap that skips must never also press whatever sits underneath, even after a long press that
  // outlasts the fade. So the press that skips arms a one-time click guard, which stands down
  // 250 ms after that press is released: the click it causes is swallowed, the visitor's next one is not.
  var guardArmed = false, guardTimer = 0;
  function guardClick(e) { if (guardArmed) { e.preventDefault(); e.stopPropagation(); disarmGuard(); } }
  function releaseGuard() { clearTimeout(guardTimer); guardTimer = setTimeout(disarmGuard, 250); }
  function disarmGuard() {
    guardArmed = false; clearTimeout(guardTimer);
    window.removeEventListener('click', guardClick, true);
    window.removeEventListener('pointerup', releaseGuard, true);
    window.removeEventListener('pointercancel', releaseGuard, true);
  }
  function armGuard() {
    if (guardArmed) return;
    guardArmed = true;
    window.addEventListener('click', guardClick, true);
    window.addEventListener('pointerup', releaseGuard, true);
    window.addEventListener('pointercancel', releaseGuard, true);
    guardTimer = setTimeout(disarmGuard, 5000); // backstop if the release is never reported
  }

  function skip(e) {
    if (finished) return;
    if (e && (e.type === 'pointerdown' || e.type === 'touchstart')) armGuard();
    if (!started) { finish('skipped'); return; }
    if (splash.classList.contains('is-skipping')) return;
    root.setAttribute('data-splash', 'skipping');
    splash.classList.add('is-skipping');
  }

  function play() {
    if (started || finished) return;
    started = true;
    window.__splashT0 = now();
    root.setAttribute('data-splash', 'playing');
    splash.classList.add('is-playing');
    safety = setTimeout(function () { finish('safety'); }, duration + 600);
  }

  splash.addEventListener('animationend', function (e) {
    var t = e.target;
    if (t === splash && e.animationName === 'splash-skip') { finish('skipped'); return; }
    if (t && t.getAttribute && t.getAttribute('data-exit') === e.animationName) finish('ended');
  });
  for (var k = 0; k < skipEvents.length; k++) window.addEventListener(skipEvents[k], skip, listenOpts);

  buildBulbs();
  if (document.visibilityState === 'hidden') { finish('hidden'); return; }

  var waits = [];
  var imgs = splash.querySelectorAll('img');
  for (var m = 0; m < imgs.length; m++) waits.push(imgs[m].decode ? imgs[m].decode() : Promise.resolve());
  // the neon font is worth waiting for, but never worth cancelling the splash over: if it fails, the fallback face is used
  if (splash.querySelector('.neon') && document.fonts && document.fonts.load) waits.push(document.fonts.load('400 1em "Tilt Neon"').catch(function () {}));
  var slow = new Promise(function (resolve) { setTimeout(function () { resolve('slow'); }, 600); });

  Promise.race([Promise.all(waits).then(function () { return 'ready'; }), slow]).then(function (state) {
    if (finished) return;
    if (state !== 'ready') { finish('slow'); return; }
    placeSweep();
    requestAnimationFrame(play);
  }, function () { finish('no-logo'); });
})();
