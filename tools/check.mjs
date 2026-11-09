// check.mjs — rendered + functional checks for the built site (dist/). Fails closed.
//
//   node tools/check.mjs [--dir dist] [--posts 6] [--vp 1440x900,1024x768,768x1024,390x844,360x740]
//
// Per page x viewport (reduced motion, age gate answered): sideways overflow (and the element
// causing it), console/page errors, failed local requests, broken images, standalone tap targets
// under 44px, visible text under 13px, exactly one <h1>, unnamed links/buttons, missing alt.
// Static: every internal href/src in every built file resolves to a file in dist/.
// Functional: age gate (shows, traps focus, Escape-safe, remembers), drawer (opens, traps, Escape
// closes, focus returns), tabs (click + arrow keys), news filter + show more, map click-to-load,
// preview forms (invalid blocked, valid shows the notice), live status rendered, home hero fits
// the first screen with Order visible, no running animations under reduced motion, and a no-JS
// pass (content visible, gate hidden).
// Writes audit/check-report.json; exits 1 if anything fails.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_CORE || 'playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const DIR = path.resolve(ROOT, val('--dir', 'dist'));
const VPS = val('--vp', '1440x900,1024x768,768x1024,390x844,360x740').split(',').map((s) => s.split('x').map(Number));
const NPOSTS = Number(val('--posts', '6'));

// ---------------------------------------------------------------- static link check
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(DIR);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const broken = [];
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const baseM = html.match(/<base href="([^"]+)"/);
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"|\ssrcset="([^"]+)"/g)) {
    const vals = m[1] ? [m[1]] : m[2].split(',').map((x) => x.trim().split(/\s+/)[0]);
    for (let v of vals) {
      if (!v || /^(https?:|mailto:|tel:|data:|#|javascript:)/.test(v)) continue;
      v = v.split('#')[0].split('?')[0];
      if (!v) continue;
      let target;
      if (baseM) target = path.join(DIR, v); // 404.html resolves from the site root via <base>
      else if (v.startsWith('/')) { broken.push({ file: path.relative(DIR, f), href: v, why: 'root-absolute path (breaks under a subpath)' }); continue; }
      else target = path.resolve(path.dirname(f), v);
      if (target.endsWith(path.sep) || v.endsWith('/') || v === '.' || v === './') target = path.join(target, 'index.html');
      if (!fs.existsSync(target)) broken.push({ file: path.relative(DIR, f), href: v, why: 'missing' });
    }
  }
}

// ---------------------------------------------------------------- server
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(DIR, u);
  if (u.endsWith('/')) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end(fs.readFileSync(path.join(DIR, '404.html'))); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

const posts = htmlFiles.map((f) => path.relative(DIR, f)).filter((f) => f.startsWith('post/')).sort();
const step = Math.max(1, Math.floor(posts.length / NPOSTS));
const PAGES = ['/', '/shop/', '/daily-deals/', '/owners-box/', '/visit/', '/learn/', '/blog/', '/contact/', '/terms-of-service/', '/404.html',
  ...posts.filter((_, i) => i % step === 0).slice(0, NPOSTS).map((f) => '/' + f.replace(/index\.html$/, ''))];

const browser = await chromium.launch({ headless: true });
const report = { at: new Date().toISOString(), dir: path.relative(ROOT, DIR), pages: PAGES.length, viewports: VPS.map((v) => v.join('x')), brokenLinks: broken, render: [], functional: [] };
const fails = [];
const fail = (where, what) => fails.push(where + ': ' + what);

async function newCtx(w, h, { gate = false, js = true, motion = false } = {}) {
  const mobile = w < 760;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, reducedMotion: motion ? 'no-preference' : 'reduce', javaScriptEnabled: js });
  if (!gate) await ctx.addInitScript(() => { try { localStorage.setItem('flavors-age-ok', '1|' + Date.now() + '|adult'); } catch (e) {} });
  return ctx;
}

// ---------------------------------------------------------------- render checks
for (const [w, h] of VPS) {
  const ctx = await newCtx(w, h);
  const page = await ctx.newPage();
  let errors = [], failed = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', (r) => { if (r.url().startsWith(ORIGIN)) failed.push(r.url().replace(ORIGIN, '') + ' ' + (r.failure() || {}).errorText); });
  page.on('response', (r) => { if (r.url().startsWith(ORIGIN) && r.status() >= 400 && !r.url().includes('/nonexistent')) failed.push(r.url().replace(ORIGIN, '') + ' ' + r.status()); });
  for (const p of PAGES) {
    errors = []; failed = [];
    // one navigation timeout used to throw and kill the whole run with no report (2026-11-09: two
    // different post pages, each idle in ~600ms when loaded alone, nothing external). Now: retry once,
    // then fall back to the load event (images and fonts are awaited below anyway); a page that will
    // not load at all is a recorded failure, never a crash.
    let navNote = '';
    try { await page.goto(ORIGIN + p, { waitUntil: 'networkidle' }); }
    catch (e1) {
      try { await page.goto(ORIGIN + p, { waitUntil: 'networkidle' }); navNote = 'network idle timed out once; retry ok'; }
      catch (e2) {
        try { await page.goto(ORIGIN + p, { waitUntil: 'load' }); navNote = 'network idle timed out twice; checked after the load event'; }
        catch (e3) { fail(`${p} @${w}x${h}`, 'page did not load: ' + String(e3.message || e3).split('\n')[0]); continue; }
      }
    }
    if (navNote) console.log(`  note ${p} @${w}x${h}: ${navNote}`);
    await page.evaluate(async () => {
      document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
      for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.9) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
      scrollTo(0, 0);
      // a broken image fails at once (onerror); the wait only bounds a slow one. 10s, not 4s: under
      // machine load a healthy 92KB image was once still decoding at 4s and counted as broken (2026-11-09)
      await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 10000); }))));
      await document.fonts.ready;
    });
    const r = await page.evaluate(async () => {
      const vw = innerWidth, out = { overflow: null, wide: [], images: [], taps: [], small: [], h1: 0, unnamed: [], noalt: [] };
      const de = document.documentElement;
      if (de.scrollWidth > vw + 1) {
        out.overflow = de.scrollWidth;
        for (const el of document.querySelectorAll('body *')) {
          const b = el.getBoundingClientRect();
          if (b.width && b.right > vw + 1 && getComputedStyle(el).position !== 'fixed') {
            let anc = el.parentElement, clipped = false;
            while (anc && anc !== document.body) { const o = getComputedStyle(anc).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') { clipped = true; break; } anc = anc.parentElement; }
            if (!clipped) out.wide.push((el.className && typeof el.className === 'string' ? el.tagName.toLowerCase() + '.' + el.className.split(' ')[0] : el.tagName.toLowerCase()) + ' r=' + Math.round(b.right));
          }
          if (out.wide.length > 6) break;
        }
      }
      const visible = (el) => { const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false; const b = el.getBoundingClientRect(); if (!b.width || !b.height) return false; if (el.closest('[aria-hidden="true"], .visually-hidden, [hidden], .drawer:not([data-open="true"]), .age-gate')) return false; return true; };
      // broken images: a shown image that has not loaded is broken. An image with no box (the answered
      // age gate's backdrop sits in a [hidden] subtree) cannot show, and forcing its load raced the gate
      // script (2026-11-09: the same healthy file flagged on two different posts), so its URL is loaded
      // on its own instead; only a file that fails that way is reported. Missing files are also caught
      // by the link check above and by the failed-request listener.
      const hiddenImgs = [];
      for (const img of document.images) {
        if (!img.hasAttribute('alt')) out.noalt.push(img.getAttribute('src'));
        if (img.complete && img.naturalWidth) continue;
        if (img.getClientRects().length && !img.closest('[hidden]')) out.images.push(img.getAttribute('src'));
        else hiddenImgs.push(img);
      }
      for (const img of hiddenImgs) {
        const src = img.currentSrc || img.src;
        const loads = await new Promise((res) => { const t = new Image(); t.onload = () => res(t.naturalWidth > 0); t.onerror = () => res(false); setTimeout(() => res(false), 10000); t.src = src; });
        if (!loads) out.images.push(img.getAttribute('src') + ' (hidden; its file did not load)');
      }
      for (const el of document.querySelectorAll('a[href], button, input, textarea, select, summary, [role="tab"]')) {
        if (!visible(el)) continue;
        if (el.classList.contains('skip-link')) continue;
        const b = el.getBoundingClientRect();
        const parent = el.parentElement;
        const inline = el.tagName === 'A' && parent && /^(P|LI|DD|SPAN|TD)$/.test(parent.tagName) && (parent.textContent || '').trim().length > (el.textContent || '').trim().length + 2;
        // touch sizes (<= 1080px) need 44px targets; desktop pointers need WCAG 2.5.8's 24px.
        const min = innerWidth <= 1080 ? 44 : 24;
        const box = el.closest('.post-card') && el.closest('.post-card__title') ? el.closest('.post-card').getBoundingClientRect() : b;
        if (!inline && (box.width < min || box.height < min) && !(el.tagName === 'INPUT' && b.height >= min)) out.taps.push(el.tagName.toLowerCase() + ' "' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30) + '" ' + Math.round(b.width) + 'x' + Math.round(b.height));
        const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.value || '').trim();
        const labelled = el.id && document.querySelector('label[for="' + el.id + '"]');
        if (!name && !labelled && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') out.unnamed.push(el.outerHTML.slice(0, 80));
      }
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const seen = new Set();
      while (tw.nextNode()) {
        const n = tw.currentNode; if (!n.textContent.trim()) continue;
        const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
        if (!visible(el)) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 12.95) out.small.push(el.tagName.toLowerCase() + '.' + (typeof el.className === 'string' ? el.className.split(' ')[0] : '') + ' ' + fs + 'px "' + n.textContent.trim().slice(0, 24) + '"');
      }
      out.h1 = document.querySelectorAll('h1').length;
      // contrast: text colour against the composited background (solid colours, translucent
      // layers and the first stop of a gradient), WCAG AA 4.5:1, or 3:1 for large text
      const parse = (s) => { const str = String(s); const k = str.match(/color\(srgb ([^)]+)\)/); const m = str.match(/rgba?\(([^)]+)\)/); const pick = k && (!m || str.indexOf(k[0]) < str.indexOf(m[0])) ? 'k' : (m ? 'm' : null); if (!pick) return null; if (pick === 'k') { const p = k[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 }; } const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
      const bgOf = (el) => {
        const layers = [];
        for (let n = el; n; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.backgroundImage && cs.backgroundImage !== 'none' && /gradient/.test(cs.backgroundImage)) { const c = parse(cs.backgroundImage); if (c) { layers.push(c); if (c.a >= 0.99) break; } }
          const c = parse(cs.backgroundColor);
          if (c && c.a > 0) { layers.push(c); if (c.a >= 0.99) break; }
        }
        let base = { r: 255, g: 255, b: 255, a: 1 };
        for (let i = layers.length - 1; i >= 0; i--) base = layers[i].a >= 0.99 ? layers[i] : over(layers[i], base);
        return base;
      };
      out.lowContrast = [];
      const seen2 = new Set();
      const tw2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (tw2.nextNode()) {
        const n = tw2.currentNode; if (!n.textContent.trim()) continue;
        const el = n.parentElement; if (!el || seen2.has(el)) continue; seen2.add(el);
        if (!visible(el) || el.closest('svg, .ph__art')) continue;
        const cs = getComputedStyle(el);
        const fg = parse(cs.color); if (!fg) continue;
        const bg = bgOf(el);
        const col = fg.a < 1 ? over(fg, bg) : fg;
        const [a, b] = [lum(col), lum(bg)].sort((x, y) => y - x);
        const ratio = (a + 0.05) / (b + 0.05);
        const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
        const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
        if (ratio < need) out.lowContrast.push(el.tagName.toLowerCase() + '.' + (typeof el.className === 'string' ? el.className.split(' ')[0] : '') + ' ' + ratio.toFixed(2) + ':1 "' + n.textContent.trim().slice(0, 30) + '"');
      }
      return out;
    });
    const where = `${p} @${w}`;
    if (r.overflow) fail(where, `sideways overflow ${r.overflow}px > ${w}px: ${r.wide.join(', ')}`);
    if (errors.length) fail(where, 'console errors: ' + errors.slice(0, 3).join(' | '));
    if (failed.length) fail(where, 'failed requests: ' + [...new Set(failed)].slice(0, 4).join(', '));
    if (r.images.length) fail(where, 'broken images: ' + r.images.slice(0, 3).join(', '));
    if (r.noalt.length) fail(where, 'img without alt: ' + r.noalt.slice(0, 3).join(', '));
    if (r.taps.length) fail(where, `tap targets under 44px (${r.taps.length}): ` + r.taps.slice(0, 4).join('; '));
    if (r.small.length) fail(where, `text under 13px (${r.small.length}): ` + r.small.slice(0, 3).join('; '));
    if (r.h1 !== 1) fail(where, 'h1 count ' + r.h1);
    if (r.lowContrast.length) fail(where, `text under WCAG AA contrast (${r.lowContrast.length}): ` + r.lowContrast.slice(0, 4).join('; '));
    if (r.unnamed.length) fail(where, 'unnamed controls: ' + r.unnamed.slice(0, 2).join(' | '));
    report.render.push({ page: p, vp: `${w}x${h}`, ...r, errors, failed, ...(navNote ? { nav: navNote } : {}) });
  }
  await ctx.close();
}

// ---------------------------------------------------------------- functional checks
async function fn(name, w, h, opts, body) {
  const ctx = await newCtx(w, h, opts);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message || e)));
  let ok = true, detail = '';
  try { detail = await body(page, ctx); } catch (e) { ok = false; detail = String(e.message || e).split('\n')[0]; }
  if (errs.length) { ok = false; detail += ' | page errors: ' + errs.join(' | '); }
  report.functional.push({ name, vp: `${w}x${h}`, ok, detail });
  if (!ok) fail('functional ' + name + ' @' + w, detail);
  await ctx.close();
}
const assert = (c, m) => { if (!c) throw new Error(m); };

for (const [w, h] of [[1440, 900], [390, 844]]) {
  await fn('age gate', w, h, { gate: true }, async (page) => {
    await page.goto(ORIGIN + '/', { waitUntil: 'networkidle' });
    assert(await page.isVisible('#age-gate'), 'gate not visible on first visit');
    await page.waitForTimeout(120);
    assert(await page.evaluate(() => document.getElementById('age-gate').contains(document.activeElement)), 'focus not inside the gate');
    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
    assert(await page.evaluate(() => document.getElementById('age-gate').contains(document.activeElement)), 'Tab escaped the gate');
    await page.keyboard.press('Escape');
    assert(await page.isVisible('#age-gate'), 'Escape dismissed the gate without an answer');
    assert(await page.evaluate(() => document.getElementById('page').inert === true), 'page behind the gate is not inert');
    await page.click('[data-gate-yes="adult"]');
    assert(!(await page.isVisible('#age-gate')), 'gate still visible after answering');
    assert(await page.evaluate(() => (localStorage.getItem('flavors-age-ok') || '').startsWith('1|')), 'answer not stored');
    await page.reload({ waitUntil: 'networkidle' });
    assert(!(await page.isVisible('#age-gate')), 'gate shown again after answering');
    return 'shows, traps focus, Escape-safe, remembered';
  });
  await fn('medical entry', w, h, { gate: true }, async (page) => {
    await page.goto(ORIGIN + '/visit/', { waitUntil: 'networkidle' });
    await page.click('[data-gate-yes="medical"]');
    assert(!(await page.isVisible('#age-gate')), 'medical answer did not close the gate');
    return 'medical patient button enters the site';
  });
  await fn('live status', w, h, {}, async (page) => {
    await page.goto(ORIGIN + '/', { waitUntil: 'networkidle' });
    const st = await page.$$eval('[data-status]', (els) => els.map((e) => e.getAttribute('data-state') + ':' + e.textContent.replace(/\s+/g, ' ').trim()));
    assert(st.length && st.every((s) => /^(open|closed):/.test(s)), 'status not rendered: ' + st.join(' / '));
    return st[0];
  });
  await fn('tabs', w, h, {}, async (page) => {
    await page.goto(ORIGIN + '/', { waitUntil: 'networkidle' });
    const tabs = await page.$$('#home-deals-tab-flower, #home-deals-tab-ounces');
    assert(tabs.length === 2, 'home deal tabs missing');
    assert(await page.isVisible('#home-deals-panel-flower') && !(await page.isVisible('#home-deals-panel-ounces')), 'initial panel state wrong');
    await page.click('#home-deals-tab-ounces');
    assert(await page.isVisible('#home-deals-panel-ounces') && !(await page.isVisible('#home-deals-panel-flower')), 'click did not switch panels');
    await page.focus('#home-deals-tab-ounces'); await page.keyboard.press('ArrowRight');
    assert(await page.evaluate(() => document.activeElement.id) === 'home-deals-tab-rolls', 'ArrowRight did not move to the next tab');
    assert(await page.isVisible('#home-deals-panel-rolls'), 'ArrowRight did not show the next panel');
    return 'click and arrow keys switch panels';
  });
  await fn('forms', w, h, {}, async (page) => {
    await page.goto(ORIGIN + '/contact/', { waitUntil: 'networkidle' });
    await page.click('form[data-preview-form] button[type="submit"] >> nth=0');
    assert(!(await page.isVisible('form[data-preview-form] .form-status[data-show="true"]')), 'empty form showed the success notice');
    await page.fill('#c-name', 'Test'); await page.fill('#c-email', 'test@example.com'); await page.fill('#c-phone', '3135550100'); await page.fill('#c-msg', 'Hello');
    await page.click('form[data-preview-form] button[type="submit"] >> nth=0');
    assert(await page.isVisible('.form-status[data-show="true"]'), 'valid form did not show the preview notice');
    return 'invalid blocked; valid shows the preview notice';
  });
  await fn('news filter', w, h, {}, async (page) => {
    await page.goto(ORIGIN + '/blog/', { waitUntil: 'networkidle' });
    const vis = () => page.$$eval('[data-news] .post-card', (cs) => cs.filter((c) => c.getAttribute('data-hidden') !== 'true').map((c) => c.getAttribute('data-year')));
    const first = await vis();
    assert(first.length === 12, 'expected 12 cards first, got ' + first.length);
    const more = await page.isVisible('[data-more]');
    if (more) { await page.click('[data-more]'); const second = await vis(); assert(second.length > 12, 'show more did not add cards'); }
    await page.click('[data-filter="2020"]');
    const y = await vis();
    assert(y.length && y.every((v) => v === '2020'), 'year filter leaked: ' + [...new Set(y)].join(','));
    return `12 shown, show more works, 2020 filter shows ${y.length}`;
  });
  await fn('map', w, h, {}, async (page) => {
    await page.route('https://www.google.com/**', (r) => r.fulfill({ status: 200, body: 'map' }));
    await page.goto(ORIGIN + '/visit/', { waitUntil: 'networkidle' });
    assert(!(await page.$('.map-frame iframe')), 'map loaded before it was asked for');
    await page.click('[data-map-load]');
    assert(await page.$('.map-frame iframe'), 'map did not load on click');
    return 'loads only on click';
  });
  await fn('reduced motion', w, h, {}, async (page) => {
    await page.goto(ORIGIN + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
    assert(running === 0, running + ' animations running under reduced motion');
    return '0 running';
  });
  await fn('no JavaScript', w, h, { js: false }, async (page) => {
    await page.goto(ORIGIN + '/', { waitUntil: 'load' });
    assert(!(await page.isVisible('#age-gate')), 'gate visible without JS');
    const hidden = await page.$$eval('[data-reveal]', (els) => els.filter((e) => +getComputedStyle(e).opacity < 1).length);
    assert(hidden === 0, hidden + ' reveal elements invisible without JS');
    assert(await page.isVisible('#home-deals-panel-ounces'), 'tab panels hidden without JS');
    return 'content visible, gate hidden, panels shown';
  });
}
await fn('drawer', 390, 844, {}, async (page) => {
  await page.goto(ORIGIN + '/', { waitUntil: 'networkidle' });
  await page.click('[data-menu-open]');
  assert(await page.getAttribute('#drawer', 'data-open') === 'true', 'drawer did not open');
  await page.waitForTimeout(80);
  assert(await page.evaluate(() => document.getElementById('drawer').contains(document.activeElement)), 'focus not in drawer');
  for (let i = 0; i < 14; i++) await page.keyboard.press('Tab');
  assert(await page.evaluate(() => document.getElementById('drawer').contains(document.activeElement)), 'Tab escaped the drawer');
  await page.keyboard.press('Escape');
  assert(await page.getAttribute('#drawer', 'data-open') === 'false', 'Escape did not close the drawer');
  assert(await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-menu-open')), 'focus did not return to the menu button');
  return 'opens, traps, Escape closes, focus returns';
});
for (const [w, h] of [[1440, 900], [1280, 720], [1024, 768], [390, 844], [360, 740]]) {
  await fn('hero fits', w, h, {}, async (page) => {
    await page.goto(ORIGIN + '/', { waitUntil: 'networkidle' });
    const g = await page.evaluate(() => {
      const dock = document.querySelector('.dock'); const dh = dock && getComputedStyle(dock).display !== 'none' ? dock.getBoundingClientRect().height : 0;
      const cta = document.querySelector('.hero .btn--order').getBoundingClientRect();
      const h1 = document.querySelector('.hero h1').getBoundingClientRect();
      return { ctaBottom: Math.round(cta.bottom), h1Top: Math.round(h1.top), limit: Math.round(innerHeight - dh) };
    });
    assert(g.ctaBottom <= g.limit, `hero Order button ends at ${g.ctaBottom}px, below the first screen (${g.limit}px)`);
    return `Order button bottom ${g.ctaBottom} of ${g.limit}`;
  });
}

await browser.close();
server.close();
report.fails = fails;
report.verdict = fails.length || broken.length ? 'FAIL' : 'PASS';
fs.writeFileSync(path.join(ROOT, 'audit', 'check-report.json'), JSON.stringify(report, null, 2));
console.log(`pages ${PAGES.length} x viewports ${VPS.length}; html files ${htmlFiles.length}; broken links ${broken.length}`);
for (const b of broken.slice(0, 10)) console.log('  LINK', b.file, '->', b.href, '(' + b.why + ')');
for (const f of report.functional) console.log(`  ${f.ok ? 'ok  ' : 'FAIL'} ${f.name} @${f.vp}: ${f.detail}`);
console.log(fails.length ? `\n${fails.length} failure(s):` : '\nno render failures');
for (const f of fails.slice(0, 60)) console.log('  - ' + f);
console.log('verdict', report.verdict);
process.exit(report.verdict === 'PASS' ? 0 : 1);
