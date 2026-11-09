// motion-check.mjs — the motion layer, tested with motion ON (tools/check.mjs runs reduced motion, so
// it cannot see any of this). Per viewport: console errors, sideways overflow while scrolling, the
// hero Order button in the first screen; on desktop: the pinned category rail (pins, slides, counts),
// marquees that speed up with the scroll, the progress line, back-to-top, the footer finale, and the
// Pause motion button (every CSS animation paused, marquees stopped). Frames go to audit/shots/motion-*.
// 360x740 is in the default set: with motion on, the Pause motion button made the page 390px wide at
// 360 (found 2026-11-09; check.mjs runs reduced motion, where that button is hidden, so it never saw it).
//
//   node tools/motion-check.mjs [--dir dist] [--vp 1440x900,1024x768,390x844,360x740]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_CORE || 'playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const val = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DIR = path.resolve(ROOT, val('--dir', 'dist'));
const VPS = val('--vp', '1440x900,1024x768,390x844,360x740').split(',').map((s) => s.split('x').map(Number));
const SHOTS = path.join(ROOT, 'audit', 'shots'); fs.mkdirSync(SHOTS, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(new URL(req.url, 'http://x').pathname), f = path.join(DIR, u);
  if (u.endsWith('/')) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const results = [], fails = [];
const ok = (vp, name, pass, detail) => { results.push({ vp, name, pass, detail }); if (!pass) fails.push(`${vp} ${name}: ${detail}`); };

for (const [w, h] of VPS) {
  const vp = `${w}x${h}`, mobile = w < 760;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'no-preference' });
  await ctx.addInitScript(() => { try { localStorage.setItem('flavors-age-ok', '1|' + Date.now() + '|adult'); localStorage.removeItem('flavors-motion'); sessionStorage.setItem('flavors-lit', '1'); sessionStorage.setItem('flavors-splash', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e.message || e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(ORIGIN + '/', { waitUntil: 'networkidle' });
  // the site scrolls smoothly; the test's own jumps must land at once so positions are measured, not mid-flight
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(500);

  const first = await page.evaluate(() => {
    const dock = document.querySelector('.dock'); const dh = dock && getComputedStyle(dock).display !== 'none' ? dock.getBoundingClientRect().height : 0;
    const cta = document.querySelector('.hero .btn--order').getBoundingClientRect();
    return { cta: Math.round(cta.bottom), limit: Math.round(innerHeight - dh), toggle: !!document.querySelector('[data-motion-toggle]:not([hidden])'), kinetic: document.documentElement.classList.contains('kinetic-on') };
  });
  ok(vp, 'hero Order button in the first screen (motion on)', first.cta <= first.limit, `bottom ${first.cta} of ${first.limit}`);
  ok(vp, 'Pause motion button shown', first.toggle, first.toggle ? 'shown' : 'missing');
  ok(vp, 'marquees on the scroll loop', first.kinetic, first.kinetic ? 'kinetic-on' : 'not enabled');

  // scroll the whole page in steps: overflow at every stop, frames along the way
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  let worstOverflow = 0, k = 0;
  for (let y = 0; y < H; y += Math.round(h * 0.7)) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(160);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    worstOverflow = Math.max(worstOverflow, sw);
    if (!mobile && k < 14) await page.screenshot({ path: path.join(SHOTS, `motion-${vp}-${String(k).padStart(2, '0')}.png`) });
    k++;
  }
  ok(vp, 'no sideways scroll while scrolling (motion on)', worstOverflow <= 1, `worst ${worstOverflow}px over ${k} stops`);

  if (!mobile) {
    // the rail
    const rail = await page.evaluate(async () => {
      const sec = document.querySelector('[data-rail]'); if (!sec) return { on: false };
      const on = sec.classList.contains('rail-on'); if (!on) return { on };
      const top = sec.getBoundingClientRect().top + scrollY, tall = sec.offsetHeight, pin = sec.querySelector('.rail__pin').offsetHeight;
      const tr = sec.querySelector('.bento'), read = () => new DOMMatrix(getComputedStyle(tr).transform).m41;
      const head = (document.querySelector('.masthead').offsetHeight || 0) + 3;
      scrollTo(0, top - head); await new Promise((r) => setTimeout(r, 200)); const x0 = read(), i0 = sec.querySelector('[data-rail-index]').textContent;
      const pinTop0 = sec.querySelector('.rail__pin').getBoundingClientRect().top;
      scrollTo(0, top - head + (tall - pin) / 2); await new Promise((r) => setTimeout(r, 200)); const x1 = read();
      const pinTop1 = sec.querySelector('.rail__pin').getBoundingClientRect().top;
      scrollTo(0, top - head + (tall - pin)); await new Promise((r) => setTimeout(r, 200)); const x2 = read(), i2 = sec.querySelector('[data-rail-index]').textContent;
      const last = [...sec.querySelectorAll('.bento__item')].pop().getBoundingClientRect();
      const first = sec.querySelector('.bento__item').getBoundingClientRect();
      return { on, travel: tall - pin, x0, x1, x2, i0, i2, pinned: Math.abs(pinTop1 - pinTop0) < 2, lastRight: Math.round(last.right), firstLeft: Math.round(first.left), vw: innerWidth,
        still: sec.classList.contains('rail-static'), metaHidden: getComputedStyle(sec.querySelector('.rail__meta')).display === 'none' };
    });
    // the cards are sized to fit the content column when four of them can (owner, 2026-11-09: smaller
    // cards): then the band holds still and hides the counter; otherwise it pins and slides
    if (rail.on && rail.travel === 0) {
      ok(vp, 'category band: the four cards fit, so it holds still with no counter', rail.still && rail.metaHidden && rail.x0 === 0 && rail.x2 === 0 && rail.firstLeft >= 0, JSON.stringify(rail));
    } else {
      ok(vp, 'category rail pins and slides', rail.on && rail.pinned && rail.x0 > -2 && rail.x1 < rail.x0 && rail.x2 < rail.x1, JSON.stringify(rail));
      ok(vp, 'rail index counts 01 to 04', !rail.on || (rail.i0 === '01' && rail.i2 === '04'), `${rail.i0} → ${rail.i2}`);
    }
    ok(vp, 'rail ends with the last card fully in view', !rail.on || rail.lastRight <= rail.vw, `last card right ${rail.lastRight} of ${rail.vw}`);
    await page.screenshot({ path: path.join(SHOTS, `motion-${vp}-rail-end.png`) });

    // marquees react to scroll speed: measure the ticker's travel over 400ms idle vs. while scrolling
    const mq = await page.evaluate(async () => {
      const t = document.querySelector('.kinetic__track'); const host = document.querySelector('.kinetic');
      host.scrollIntoView({ block: 'center' }); await new Promise((r) => setTimeout(r, 400));
      const x = () => new DOMMatrix(getComputedStyle(t).transform).m41;
      const a = x(); await new Promise((r) => setTimeout(r, 400)); const idle = Math.abs(x() - a);
      const b = x(); for (let i = 0; i < 8; i++) { scrollBy(0, 40); await new Promise((r) => setTimeout(r, 50)); } const busy = Math.abs(x() - b);
      return { idle: +idle.toFixed(1), scrolling: +busy.toFixed(1) };
    });
    ok(vp, 'kinetic band drifts, and runs faster while scrolling', mq.idle > 2 && mq.scrolling > mq.idle * 1.5, JSON.stringify(mq));

    // progress + back to top + finale at the bottom
    const end = await page.evaluate(async () => {
      scrollTo(0, document.documentElement.scrollHeight); await new Promise((r) => setTimeout(r, 400));
      const fill = document.querySelector('.rainbow-rule__fill'), top = document.querySelector('[data-to-top]'), fin = document.querySelector('[data-finale]');
      return { p: +getComputedStyle(fill).getPropertyValue('--p') || +fill.style.getPropertyValue('--p'), toTop: top.classList.contains('is-on'), lit: +fin.style.getPropertyValue('--lit'), toTopBox: top.getBoundingClientRect().width };
    });
    ok(vp, 'progress line full at the end', end.p > 0.98, `--p ${end.p}`);
    ok(vp, 'back-to-top shown, 44px+', end.toTop && end.toTopBox >= 44, `on ${end.toTop}, ${end.toTopBox}px`);
    ok(vp, 'footer finale fully lit at the end', end.lit > 0.98, `--lit ${end.lit}`);
    await page.screenshot({ path: path.join(SHOTS, `motion-${vp}-finale.png`) });
    await page.click('[data-to-top]'); await page.waitForTimeout(2600);
    const yTop = await page.evaluate(() => scrollY);
    ok(vp, 'back-to-top returns to the top', yTop < 5, `scrollY ${yTop}`);
  }

  // Pause motion: CSS animations paused, marquees still
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(200);
  await page.click('[data-motion-toggle]'); await page.waitForTimeout(300);
  const paused = await page.evaluate(async () => {
    // looping CSS animations only: a hover or reveal transition finishing is not "motion that keeps going"
    const live = document.getAnimations().filter((a) => a.playState === 'running' && a.animationName);
    const running = live.length, names = live.slice(0, 4).map((a) => a.animationName);
    const t = document.querySelector('.ticker__track'); const x = () => new DOMMatrix(getComputedStyle(t).transform).m41;
    const a = x(); await new Promise((r) => setTimeout(r, 500)); const moved = Math.abs(x() - a);
    return { running, names, moved: +moved.toFixed(2), pressed: document.querySelector('[data-motion-toggle]').getAttribute('aria-pressed'), stored: localStorage.getItem('flavors-motion') };
  });
  ok(vp, 'Pause motion stops every loop', paused.running === 0 && paused.moved < 0.5 && paused.pressed === 'true' && paused.stored === 'off', JSON.stringify(paused));
  ok(vp, 'no console errors (motion on)', errs.length === 0, errs.slice(0, 3).join(' | ') || 'none');
  await ctx.close();
}
// ---- the splash ("Sign ignition"): plays once per session, gets out of the way, hands over to the gate
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const vp = `${w}x${h}`, mobile = w < 760;
  const mk = async (answered) => {
    const c = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'no-preference' });
    if (answered) await c.addInitScript(() => { try { localStorage.setItem('flavors-age-ok', '1|' + Date.now() + '|adult'); } catch (e) {} });
    return c;
  };
  // 1) returning visitor (gate answered): splash on first paint, gone by ~2.5 s, no second hero ignition
  let ctx = await mk(true), page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message || e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(ORIGIN + '/', { waitUntil: 'commit' });
  await page.waitForTimeout(700);
  const mid = await page.evaluate(() => ({ on: document.documentElement.classList.contains('splash-on'), state: document.documentElement.getAttribute('data-splash'), bulbs: document.querySelectorAll('.splash__bulb').length }));
  await page.screenshot({ path: path.join(SHOTS, `motion-splash-${vp}-mid.png`) });
  await page.waitForTimeout(2600);
  const end = await page.evaluate(() => ({ gone: !document.getElementById('splash'), state: document.documentElement.getAttribute('data-splash'), preIgnite: document.documentElement.classList.contains('pre-ignite'), igniting: document.documentElement.classList.contains('igniting') }));
  ok(vp, 'splash plays on the first page of a session', mid.on && mid.state === 'playing' && mid.bulbs === 53, JSON.stringify(mid));
  ok(vp, 'splash ends and leaves the page', end.gone && end.state === 'ended', JSON.stringify(end));
  ok(vp, 'the hero does not light up a second time', !end.preIgnite && !end.igniting, JSON.stringify(end));
  await page.goto(ORIGIN + '/daily-deals/', { waitUntil: 'load' }); await page.waitForTimeout(300);
  const again = await page.evaluate(() => ({ splash: !!document.getElementById('splash'), on: document.documentElement.classList.contains('splash-on') }));
  ok(vp, 'no splash on the next page of the same session', !again.splash && !again.on, JSON.stringify(again));
  ok(vp, 'no console errors with the splash', errs.length === 0, errs.slice(0, 3).join(' | ') || 'none');
  await ctx.close();
  // 2) skip: a key press fades it out at once and never presses anything underneath
  ctx = await mk(true); page = await ctx.newPage();
  await page.goto(ORIGIN + '/', { waitUntil: 'commit' }); await page.waitForTimeout(900);
  const t0 = Date.now(); await page.keyboard.press('Space');
  await page.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 2000 }).catch(() => {});
  const skipped = await page.evaluate(() => ({ gone: !document.getElementById('splash'), state: document.documentElement.getAttribute('data-splash') }));
  ok(vp, 'a key press skips the splash', skipped.gone && skipped.state === 'skipped' && Date.now() - t0 < 1500, JSON.stringify(skipped) + ` in ${Date.now() - t0}ms`);
  await ctx.close();
  // 3) first visit: the splash hands over to the age gate
  ctx = await mk(false); page = await ctx.newPage();
  await page.goto(ORIGIN + '/', { waitUntil: 'commit' }); await page.waitForTimeout(3400);
  const gateNow = await page.evaluate(() => ({ splash: !!document.getElementById('splash'), gate: !document.getElementById('age-gate').hidden, focus: document.activeElement && document.activeElement.hasAttribute('data-gate-yes') }));
  ok(vp, 'first visit: splash hands over to the age gate', !gateNow.splash && gateNow.gate && gateNow.focus, JSON.stringify(gateNow));
  await page.screenshot({ path: path.join(SHOTS, `motion-splash-${vp}-gate.png`) });
  await ctx.close();
}

await browser.close(); server.close();
const report = { generated: new Date().toISOString(), results, fails, verdict: fails.length ? 'FAIL' : 'PASS' };
fs.writeFileSync(path.join(ROOT, 'audit', 'motion-check.json'), JSON.stringify(report, null, 2));
for (const r of results) console.log(`${r.pass ? 'ok  ' : 'FAIL'} ${r.vp} ${r.name}: ${r.detail}`);
console.log('verdict', report.verdict);
process.exit(fails.length ? 1 : 0);
