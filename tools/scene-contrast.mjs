// scene-contrast.mjs — WCAG contrast for text that sits over scene stills, measured on the
// rendered pixels (tools/check.mjs reads CSS backgrounds, which cannot see a photo under a scrim).
//
//   node tools/scene-contrast.mjs [--dir dist] [--vp 1440x900,1024x768,390x844] [--paths /,/shop/]
//
// Per page x viewport (reduced motion, age gate answered): record every visible text line inside a
// scene container (hero, scene page heroes, scene bands, bento cards) with its colour and size;
// make all text transparent; take a full-page screenshot; then, for each line box, take the
// luminance of the pixels behind it and compare the text colour with the 95th-percentile pixel
// (light text) or the 5th-percentile pixel (dark text): the brightest (or darkest) 5% of what sits
// behind the words. Needs 4.5:1, or 3:1 for large text (24px+, or 18.66px+ bold).
// Writes audit/scene-contrast.json. Exit 1 on any failure.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_CORE || 'playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const val = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DIR = path.resolve(ROOT, val('--dir', 'dist'));
const VPS = val('--vp', '1440x900,1024x768,390x844').split(',').map((s) => s.split('x').map(Number));
const firstPost = fs.readdirSync(path.join(DIR, 'post')).sort()[0];
const PATHS = val('--paths', `/,/shop/,/daily-deals/,/owners-box/,/visit/,/learn/,/blog/,/contact/,/post/${firstPost}/`).split(',');
const SCENES = '.hero, .page-hero--scene, .band--neon, .band--spot, .band--rain, .band--bokeh';

// ---- minimal PNG decoder (8-bit RGB / RGBA, non-interlaced: what Chromium writes) -------------
function decodePNG(buf) {
  let p = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); if (data[8] !== 8 || data[12] !== 0) throw new Error('unsupported PNG'); ct = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0; if (!bpp) throw new Error('PNG colour type ' + ct);
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[row + x - bpp] : 0, b = y ? out[row - stride + x] : 0, c = x >= bpp && y ? out[row - stride + x - bpp] : 0;
      let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[row + x] = v & 255;
    }
  }
  return { w, h, bpp, px: out };
}
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

// ---- static server ----------------------------------------------------------------------------
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(new URL(req.url, 'http://x').pathname), f = path.join(DIR, u);
  if (u.endsWith('/')) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ headless: true });
const report = { generated: new Date().toISOString(), method: 'p95/p5 background luminance under each text line, text hidden, reduced motion', checked: 0, fails: [], worst: [] };
for (const [w, h] of VPS) {
  const mobile = w < 760;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => { try { localStorage.setItem('flavors-age-ok', '1|' + Date.now() + '|adult'); } catch (e) {} });
  const page = await ctx.newPage();
  for (const p of PATHS) {
    await page.goto(ORIGIN + p, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
      for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
      scrollTo(0, 0);
      await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); }))));
      await document.fonts.ready;
    });
    const lines = await page.evaluate((SCENES) => {
      const parse = (s) => { const k = String(s).match(/color\(srgb ([^)]+)\)/); if (k) { const v = k[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [v[0] * 255, v[1] * 255, v[2] * 255, v.length > 3 ? v[3] : 1]; } const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
      const out = [];
      const scenes = [...document.querySelectorAll(SCENES)];
      for (const sc of scenes) {
        const tw = document.createTreeWalker(sc, NodeFilter.SHOW_TEXT);
        while (tw.nextNode()) {
          const n = tw.currentNode; if (!n.textContent.trim()) continue;
          const el = n.parentElement; if (!el) continue;
          if (el.closest('[aria-hidden="true"], .visually-hidden, [hidden], svg')) continue;
          const eb = el.getBoundingClientRect(); if (eb.width <= 2 || eb.height <= 2) continue;   // clipped screen-reader text
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
          let op = 1; for (let a = el; a; a = a.parentElement) op *= +getComputedStyle(a).opacity;
          const col = parse(cs.color); if (!col) continue;
          // only the part of a line a visitor can see: clip it by every ancestor that clips
          // (overflow other than visible, e.g. a swipe row) and by the viewport's width
          const clips = [[0, -Infinity, innerWidth, Infinity]];
          for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
            const ac = getComputedStyle(a);
            if (ac.overflowX !== 'visible' || ac.overflowY !== 'visible') {
              const ab = a.getBoundingClientRect();
              clips.push([ab.left + a.clientLeft, ab.top + a.clientTop, ab.left + a.clientLeft + a.clientWidth, ab.top + a.clientTop + a.clientHeight]);
            }
          }
          const r = document.createRange(); r.selectNodeContents(n);
          for (const b of r.getClientRects()) {
            let x0 = b.left, y0 = b.top, x1 = b.right, y1 = b.bottom;
            for (const c of clips) { x0 = Math.max(x0, c[0]); y0 = Math.max(y0, c[1]); x1 = Math.min(x1, c[2]); y1 = Math.min(y1, c[3]); }
            if (x1 - x0 < 2 || y1 - y0 < 2) continue;
            out.push({ text: n.textContent.trim().slice(0, 40), cls: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''), scene: sc.className.split(' ').slice(0, 3).join('.'),
              x: x0 + scrollX, y: y0 + scrollY, w: x1 - x0, h: y1 - y0, col, op, size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight, 10) });
          }
        }
      }
      return out;
    }, SCENES);
    // hide every glyph (and icon strokes that follow currentColor), keep every background
    await page.addStyleTag({ content: '.dock, .drawer, .skip-link { display: none !important; } *, *::before, *::after { color: transparent !important; -webkit-text-stroke-color: transparent !important; text-shadow: none !important; caret-color: transparent !important; } ::placeholder { color: transparent !important; } .sw__i { translate: none !important; }' });
    await page.waitForTimeout(120);
    const png = decodePNG(await page.screenshot({ fullPage: true }));
    for (const L of lines) {
      const x0 = Math.max(0, Math.floor(L.x)), y0 = Math.max(0, Math.floor(L.y)), x1 = Math.min(png.w, Math.ceil(L.x + L.w)), y1 = Math.min(png.h, Math.ceil(L.y + L.h));
      const ls = [];
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * png.w + x) * png.bpp; ls.push(lum(png.px[i], png.px[i + 1], png.px[i + 2])); }
      if (!ls.length) continue;
      ls.sort((a, b) => a - b);
      const pct = (q) => ls[Math.min(ls.length - 1, Math.floor(q * ls.length))];
      const med = pct(0.5);
      // text colour composited over the median background when translucent
      const a = (L.col[3] ?? 1) * L.op;
      const bgMid = med; // luminance only; composite in linear-ish space is close enough for alpha ~1
      const tl = lum(L.col[0], L.col[1], L.col[2]);
      const tLum = a >= 0.999 ? tl : tl * a + bgMid * (1 - a);
      const light = tLum > med;
      const worstBg = light ? pct(0.95) : pct(0.05);
      const cr = ratio(tLum, worstBg);
      const large = L.size >= 24 || (L.weight >= 700 && L.size >= 18.66);
      const need = large ? 3 : 4.5;
      report.checked++;
      const row = { page: p, vp: `${w}x${h}`, scene: L.scene, el: L.cls, text: L.text, ratio: +cr.toFixed(2), need, medianRatio: +ratio(tLum, med).toFixed(2) };
      report.worst.push(row);
      if (cr < need) report.fails.push(row);
    }
  }
  await ctx.close();
}
await browser.close();
server.close();
report.worst.sort((a, b) => a.ratio / a.need - b.ratio / b.need);
report.worst = report.worst.slice(0, 25);
report.verdict = report.fails.length ? 'FAIL' : 'PASS';
fs.writeFileSync(path.join(ROOT, 'audit', 'scene-contrast.json'), JSON.stringify(report, null, 2));
console.log(`text lines over scene stills checked: ${report.checked} · pages ${PATHS.length} x viewports ${VPS.length}`);
for (const f of report.fails.slice(0, 40)) console.log(`  FAIL ${f.page} @${f.vp} ${f.el} "${f.text}" ${f.ratio}:1 < ${f.need} (median ${f.medianRatio}) [${f.scene}]`);
console.log('closest to the line:');
for (const f of report.worst.slice(0, 8)) console.log(`  ${f.ratio}:1 (needs ${f.need}) ${f.page} @${f.vp} ${f.el} "${f.text}"`);
console.log('verdict', report.verdict);
process.exit(report.verdict === 'PASS' ? 0 : 1);
