// capture-live.mjs — a polite, browser-based capture of the live Flavors Detroit pages.
//
// Why a browser: the static crawl was rate-limited (HTTP 429 at 22:40Z on 2026-11-08) after
// 60 of 143 pages, and Wix pages are script-rendered (sr-extract flags them). One headless
// browser loads ONE page at a time, waits GAP_MS between pages, and stops the whole run on the
// first 401/403/429/451/503 document response. No retries, no UA spoofing, no parallelism.
//
//   node tools/capture-live.mjs --home            computed-style capture of / at 1440/1024/768/390
//   node tools/capture-live.mjs --pages a,b,c     rendered text + DOM + screenshots per path
//
// Writes audit/capture/*.json (sr-capture payloads), audit/pages/<slug>/{rendered.html,text.txt},
// audit/screens/baseline/<slug>-<w>.png and audit/live-capture-log.json.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_CORE || 'playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILL = (process.env.SITE_REFORGE || (process.env.HOME + '/.claude/skills/site-reforge'));
const ORIGIN = 'https://www.flavorsdetroit.com';
const GAP_MS = Number(process.env.GAP_MS || 25000);
const STOP_CODES = new Set([401, 403, 429, 451, 503]);

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

const logFile = path.join(ROOT, 'audit', 'live-capture-log.json');
const log = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf8')) : { runs: [] };
const run = { at: new Date().toISOString(), gapMs: GAP_MS, visits: [] };
log.runs.push(run);
const save = () => fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mk = (...p) => { const d = path.join(ROOT, ...p); fs.mkdirSync(d, { recursive: true }); return d; };

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

async function visit(p) {
  const url = ORIGIN + p;
  const resp = await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  const status = resp ? resp.status() : 0;
  run.visits.push({ url, status, at: new Date().toISOString() });
  save();
  if (STOP_CODES.has(status)) {
    console.log('STOP: ' + url + ' answered HTTP ' + status + ' — ending the run, no retry.');
    await browser.close();
    process.exit(2);
  }
  // Let Wix hydrate and lazy content settle, then scroll the page once so lazy sections render.
  await page.waitForTimeout(3000);
  await page.evaluate(async () => {
    const step = Math.max(300, Math.floor(innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
  return status;
}

const slugOf = (p) => (p === '/' ? 'home' : p.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '__'));

if (has('--home')) {
  const iife = execFileSync('node', [path.join(SKILL, 'scripts', 'sr-capture.mjs'), '--emit'], { encoding: 'utf8' });
  const iifeScroll = execFileSync('node', [path.join(SKILL, 'scripts', 'sr-capture.mjs'), '--emit-scroll'], { encoding: 'utf8' });
  const st = await visit('/');
  console.log('home', st);
  const capDir = mk('audit', 'capture');
  const shotDir = mk('audit', 'screens', 'baseline');
  for (const w of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width: w, height: w === 390 ? 844 : (w === 768 ? 1024 : (w === 1024 ? 768 : 900)) });
    await page.waitForTimeout(1500);
    const res = await page.evaluate((src) => (0, eval)(src), iife);
    const file = path.join(capDir, `home-${w}.json`);
    fs.writeFileSync(file, JSON.stringify(res));
    await page.screenshot({ path: path.join(shotDir, `home-${w}.png`), fullPage: true });
    console.log('  captured', w, 'viewport.w=', res && res.viewport && res.viewport.w);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(1000);
  const scrollRes = await page.evaluate((src) => (0, eval)(src), iifeScroll);
  fs.writeFileSync(path.join(capDir, 'home-1440-scroll.json'), JSON.stringify(scrollRes));
  console.log('  scroll pass saved');
}

const list = val('--pages');
if (list) {
  const paths = list.split(',').map((s) => s.trim()).filter(Boolean);
  let first = !has('--home');
  for (const p of paths) {
    if (!first) { console.log('  waiting', GAP_MS / 1000, 's'); await sleep(GAP_MS); }
    first = false;
    await page.setViewportSize({ width: 1440, height: 900 });
    const st = await visit(p);
    const slug = slugOf(p);
    const dir = mk('audit', 'pages', slug);
    const html = await page.content();
    const text = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync(path.join(dir, 'rendered.html'), html);
    fs.writeFileSync(path.join(dir, 'text.txt'), text);
    const links = await page.$$eval('a[href]', (as) => as.map((a) => ({ text: (a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80), href: a.href })));
    fs.writeFileSync(path.join(dir, 'links.json'), JSON.stringify(links, null, 2));
    const imgs = await page.$$eval('img', (is) => is.map((i) => ({ src: i.currentSrc || i.src, alt: i.alt, w: i.naturalWidth, h: i.naturalHeight })));
    fs.writeFileSync(path.join(dir, 'images.json'), JSON.stringify(imgs, null, 2));
    const shotDir = mk('audit', 'screens', 'baseline');
    await page.screenshot({ path: path.join(shotDir, `${slug}-1440.png`), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(shotDir, `${slug}-390.png`), fullPage: true });
    console.log(p, st, 'text chars', text.length);
  }
}

await browser.close();
console.log('done');
