/* Flavors Detroit lanyard (/visit/ "Three things to know", owner's option A of design-options/before/, 2026-11-09): a badge hanging on a stretchy woven band. Drag it, throw it, click (or Enter /
   Space) to flip it. An original vanilla build of the effect the owner pointed to (React Bits "Lanyard",
   a React + three.js component); no code copied, no dependencies.
   Markup: <div class="lanyard" data-length="220"><button class="lanyard__card">
             <span class="lanyard__face lanyard__face--front">...</span>
             <span class="lanyard__face lanyard__face--back">...</span></button></div>
   The band is drawn as an SVG path (verlet rope); the badge hangs from the rope's last point. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var uid = 0;

  function Lanyard(el) {
    var self = this;
    this.el = el;
    this.card = el.querySelector('.lanyard__card');
    this.front = el.querySelector('.lanyard__face--front');
    this.back = el.querySelector('.lanyard__face--back');
    this.n = 14;
    this.flipped = false;
    this.flipAngle = 0;               // shown flip angle, eases toward 0 / 180
    this.theta = 0; this.omega = 0;   // badge swing angle + angular speed
    this.drag = null;
    this.running = false; this.still = 0; this.visible = true;

    // the band
    var id = 'lanyard-band-' + (++uid);
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'lanyard__band'); svg.setAttribute('aria-hidden', 'true');
    this.edge = document.createElementNS(NS, 'path'); this.edge.setAttribute('class', 'lanyard__edge');
    this.strap = document.createElementNS(NS, 'path'); this.strap.setAttribute('class', 'lanyard__strap'); this.strap.setAttribute('id', id);
    var text = document.createElementNS(NS, 'text'); text.setAttribute('class', 'lanyard__print');
    var tp = document.createElementNS(NS, 'textPath'); tp.setAttribute('href', '#' + id); tp.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#' + id);
    tp.textContent = new Array(9).join('FLAVORS DETROIT ✦ ');
    text.appendChild(tp);
    svg.appendChild(this.edge); svg.appendChild(this.strap); svg.appendChild(text);
    el.insertBefore(svg, el.firstChild);

    this.measure();
    this.reset(!reduce);   // swing in from the side on first view (still when motion is reduced)
    this.render();

    // drag / throw / flip
    this.card.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      self.card.setPointerCapture(e.pointerId);
      var last = self.pts[self.n - 1], r = self.el.getBoundingClientRect();
      self.drag = { id: e.pointerId, ox: e.clientX - r.left - last.x, oy: e.clientY - r.top - last.y, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: 0 };
      self.card.classList.add('is-grabbed');
      self.wake();
    });
    this.card.addEventListener('pointermove', function (e) {
      var d = self.drag; if (!d || d.id !== e.pointerId) return;
      var r = self.el.getBoundingClientRect();
      d.x = e.clientX - r.left - d.ox; d.y = e.clientY - r.top - d.oy;
      d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.sx, e.clientY - d.sy));
      if (reduce) { self.place(d.x, d.y); self.render(); }
    });
    var up = function (e) {
      var d = self.drag; if (!d || d.id !== e.pointerId) return;
      self.drag = null; self.card.classList.remove('is-grabbed');
      if (d.moved < 6 && performance.now() - d.t < 400) self.flip();
      if (reduce) { self.reset(false); self.render(); }
      self.wake();
    };
    this.card.addEventListener('pointerup', up);
    this.card.addEventListener('pointercancel', up);
    this.card.addEventListener('click', function (e) { if (e.detail === 0) self.flip(); });   // keyboard Enter / Space
    this.card.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); self.nudge(e.key === 'ArrowLeft' ? -14 : 14); }
    });

    window.addEventListener('resize', function () { self.measure(); self.reset(false); self.render(); self.wake(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; if (self.visible) self.wake(); }).observe(el);
    }
    this.syncFaces();
  }

  Lanyard.prototype.measure = function () {
    var r = this.el.getBoundingClientRect();
    this.w = r.width; this.h = r.height;
    this.len = parseFloat(getComputedStyle(this.el).getPropertyValue('--band')) || parseFloat(this.el.getAttribute('data-length')) || 200;
    this.seg = this.len / (this.n - 1);
    this.ax = this.w / 2; this.ay = 0;
  };

  Lanyard.prototype.reset = function (swingIn) {
    this.pts = [];
    for (var i = 0; i < this.n; i++) {
      var t = i / (this.n - 1);
      // straight down, or laid out to one side so it drops and swings in
      var x = this.ax + (swingIn ? t * this.len * 0.85 : 0), y = this.ay + (swingIn ? t * this.len * 0.35 : t * this.len);
      this.pts.push({ x: x, y: y, px: x, py: y });
    }
    this.theta = swingIn ? 0.9 : 0; this.omega = 0;
  };

  Lanyard.prototype.place = function (x, y) {   // reduced motion: the badge follows the pointer, the band stays a straight line
    for (var i = 0; i < this.n; i++) { var t = i / (this.n - 1); var p = this.pts[i]; p.x = p.px = this.ax + (x - this.ax) * t; p.y = p.py = this.ay + (y - this.ay) * t; }
  };

  Lanyard.prototype.nudge = function (vx) {
    if (reduce) return;
    var last = this.pts[this.n - 1]; last.px -= vx; this.omega -= vx * 0.004; this.wake();
  };

  Lanyard.prototype.flip = function () {
    this.flipped = !this.flipped;
    this.card.setAttribute('aria-pressed', this.flipped ? 'true' : 'false');
    if (reduce) this.flipAngle = this.flipped ? 180 : 0;
    this.syncFaces(); this.wake(); this.render();
  };

  Lanyard.prototype.syncFaces = function () {
    if (this.front) this.front.setAttribute('aria-hidden', this.flipped ? 'true' : 'false');
    if (this.back) this.back.setAttribute('aria-hidden', this.flipped ? 'false' : 'true');
  };

  Lanyard.prototype.wake = function () {
    if (this.running || !this.visible) return;
    this.running = true; this.still = 0; this.tPrev = performance.now(); this.acc = 0;
    var self = this;
    requestAnimationFrame(function tick(now) {
      if (!self.running) return;
      self.acc += Math.min(50, now - self.tPrev); self.tPrev = now;
      while (self.acc >= 1000 / 120) { self.step(); self.acc -= 1000 / 120; }
      self.render();
      if (!self.visible || (!self.drag && self.still > 90)) { self.running = false; return; }
      requestAnimationFrame(tick);
    });
  };

  Lanyard.prototype.step = function () {
    var pts = this.pts, n = this.n, g = 0.16, damp = 0.984, i, p, k;
    var energy = 0;
    if (!reduce) {
      for (i = 1; i < n; i++) {
        p = pts[i];
        var vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp;
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy + g * (i === n - 1 ? 2.2 : 1);   // the badge weighs the end down
        energy = Math.max(energy, Math.abs(vx) + Math.abs(vy));
      }
    }
    if (this.drag && this.drag.x != null) {
      var last = pts[n - 1];
      last.x += (this.drag.x - last.x) * 0.5; last.y += (this.drag.y - last.y) * 0.5;
    }
    // the band: slightly stretchy (stiffness < 1), anchored at the top
    pts[0].x = this.ax; pts[0].y = this.ay;
    for (k = 0; k < 10; k++) {
      for (i = 0; i < n - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001;
        var diff = (d - this.seg) / d * 0.5 * 0.92;
        var ox = dx * diff, oy = dy * diff;
        if (i === 0) { b.x -= ox * 2; b.y -= oy * 2; }
        else { a.x += ox; a.y += oy; if (!(this.drag && i + 1 === n - 1)) { b.x -= ox; b.y -= oy; } }
      }
      pts[0].x = this.ax; pts[0].y = this.ay;
    }
    // the badge swings toward the band's last direction (a damped spring), lagging a little for weight
    var e1 = pts[n - 1], e0 = pts[n - 3];
    var target = -Math.atan2(e1.x - e0.x, e1.y - e0.y);   // band heading down-right -> badge turns counter-clockwise
    if (!isFinite(target)) target = 0;
    this.omega += (target - this.theta) * 0.06; this.omega *= 0.86; this.theta += this.omega;
    if (this.theta > 1.31) { this.theta = 1.31; this.omega = 0; } else if (this.theta < -1.31) { this.theta = -1.31; this.omega = 0; }   // never past ~75 deg
    // flip easing
    var goal = this.flipped ? 180 : 0;
    this.flipAngle += (goal - this.flipAngle) * 0.12;
    if (Math.abs(goal - this.flipAngle) < 0.2) this.flipAngle = goal;
    energy = Math.max(energy, Math.abs(this.omega) * 40, Math.abs(goal - this.flipAngle) / 4);
    this.still = energy < 0.02 ? this.still + 1 : 0;
  };

  Lanyard.prototype.render = function () {
    var pts = this.pts, n = this.n, i;
    // smooth path through the points (midpoint quadratic curves)
    var d = 'M' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    for (i = 1; i < n - 1; i++) {
      var mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      d += ' Q' + pts[i].x.toFixed(1) + ' ' + pts[i].y.toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
    }
    d += ' L' + pts[n - 1].x.toFixed(1) + ' ' + pts[n - 1].y.toFixed(1);
    this.edge.setAttribute('d', d); this.strap.setAttribute('d', d);
    var last = pts[n - 1], prev = pts[n - 2];
    var vx = last.x - last.px;
    var tiltY = reduce ? 0 : Math.max(-28, Math.min(28, vx * 9));
    this.card.style.transform = 'translate(' + (last.x).toFixed(1) + 'px,' + (last.y).toFixed(1) + 'px) translateX(-50%) rotate(' + (this.theta * 57.3).toFixed(2) + 'deg) rotateY(' + (this.flipAngle + tiltY).toFixed(1) + 'deg)';
  };

  function init(root) {
    (root || document).querySelectorAll('.lanyard:not([data-lanyard-ready])').forEach(function (el) {
      el.setAttribute('data-lanyard-ready', '');
      el.lanyard = new Lanyard(el);
    });
  }
  window.FlavorsLanyard = { init: init };
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', function () { init(); });
})();
