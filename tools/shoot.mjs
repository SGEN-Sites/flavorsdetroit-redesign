// shoot.mjs — serve dist/ locally and capture screenshots with headless Chromium.
//
//   node tools/shoot.mjs --paths /,/daily-deals/ --vp 1440x900,390x844 [--full] [--gate] [--motion]
//        [--prefix <name>] [--dir dist] [--base /sub/]
//
//   --full     full-page capture (taken under reduced motion so reveals are settled)
//   --gate     keep the age gate (default: answered, so pages show)
//   --motion   viewport capture with motion on (default: reduced motion)
// Writes audit/shots/<prefix><slug>-<w>x<h>[-full].png and prints a one-line geometry summary
// (document width vs viewport, hero bottom, first CTA bottom) per capture.
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
const has = (f) => args.includes(f);
const DIR = path.resolve(ROOT, val('--dir', 'dist'));
const BASE = val('--base', '/');
const paths = val('--paths', '/').split(',');
const vps = val('--vp', '1440x900,390x844').split(',').map((s) => s.split('x').map(Number));
const prefix = val('--prefix', '');
const OUTDIR = path.join(ROOT, 'audit', 'shots');
fs.mkdirSync(OUTDIR, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' };
const misses = [];
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!u.startsWith(BASE)) { res.writeHead(404); return res.end(); }
  u = '/' + u.slice(BASE.length);
  let f = path.join(DIR, u);
  if (u.endsWith('/')) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    misses.push(req.url);
    const nf = path.join(DIR, '404.html');
    res.writeHead(404, { 'content-type': 'text/html' });
    return res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'not found');
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const origin = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ headless: true });
for (const [w, h] of vps) {
  const mobile = w < 760;
  const ctx = await browser.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile,
    reducedMotion: has('--motion') ? 'no-preference' : 'reduce',
  });
  if (!has('--gate')) await ctx.addInitScript(() => { try { localStorage.setItem('flavors-age-ok', '1|' + Date.now() + '|adult'); } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  for (const p of paths) {
    const url = origin + BASE + p.replace(/^\//, '');
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(has('--motion') ? 2200 : 400);
    const slug = (p === '/' ? 'home' : p.replace(/^\/|\/$/g, '').replace(/\//g, '__')) || 'home';
    const name = `${prefix}${slug}-${w}x${h}`;
    const geo = await page.evaluate(() => {
      const de = document.documentElement;
      const hero = document.querySelector('.hero, .page-hero, .lost');
      const cta = document.querySelector('.hero .btn--order, .page-hero .btn, .lost .btn');
      return {
        docW: de.scrollWidth, vw: innerWidth, docH: de.scrollHeight,
        heroBottom: hero ? Math.round(hero.getBoundingClientRect().bottom + scrollY) : null,
        ctaBottom: cta ? Math.round(cta.getBoundingClientRect().bottom + scrollY) : null,
      };
    });
    await page.screenshot({ path: path.join(OUTDIR, name + '.png') });
    if (has('--full')) {
      // walk the page once so lazy images (including ones in sideways swipe rows) load
      await page.evaluate(async () => {
        document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
        for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
        scrollTo(0, 0);
        await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })));
      });
      await page.evaluate(() => document.documentElement.classList.add('reveal-all'));
      await page.screenshot({ path: path.join(OUTDIR, name + '-full.png'), fullPage: true });
    }
    console.log(`${name}: doc ${geo.docW}/${geo.vw} wide, ${geo.docH} tall · hero bottom ${geo.heroBottom} · cta bottom ${geo.ctaBottom}${errors.length ? ' · ERRORS ' + errors.join(' | ') : ''}`);
    errors.length = 0;
  }
  await ctx.close();
}
await browser.close();
server.close();
if (misses.length) console.log('404s served:', [...new Set(misses)].join(', '));
