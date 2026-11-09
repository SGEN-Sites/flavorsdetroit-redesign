// sweep.mjs — run the skill's responsive + a11y sweep (sr-sweep.mjs --emit) on the built site
// at every configured breakpoint, then merge each result and collect (C23).
//
//   node tools/sweep.mjs [--posts 4]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_CORE || 'playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILL = (process.env.SITE_REFORGE || (process.env.HOME + '/.claude/skills/site-reforge')) + '/scripts/sr-sweep.mjs';
const DIR = path.join(ROOT, 'dist');
const args = process.argv.slice(2);
const nPosts = Number(args[args.indexOf('--posts') + 1] || 4);
const project = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.json'), 'utf8'));
const WIDTHS = project.config.breakpoints;
const HEIGHT = { 390: 844, 768: 1024, 1024: 768, 1440: 900 };

const iife = execFileSync('node', [SKILL, '--emit'], { encoding: 'utf8' });
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(DIR, u); if (u.endsWith('/')) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

const posts = fs.readdirSync(path.join(DIR, 'post')).sort();
const pick = posts.filter((_, i) => i % Math.max(1, Math.floor(posts.length / nPosts)) === 0).slice(0, nPosts);
const PAGES = ['/', '/shop/', '/daily-deals/', '/owners-box/', '/visit/', '/learn/', '/blog/', '/contact/', '/terms-of-service/', '/404.html', ...pick.map((s) => `/post/${s}/`)];
const outDir = path.join(ROOT, 'audit', 'sweeps');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
let merged = 0;
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: HEIGHT[w] || 900 }, reducedMotion: 'reduce', isMobile: w < 760, hasTouch: w < 760 });
  await ctx.addInitScript(() => { try { localStorage.setItem('flavors-age-ok', '1|' + Date.now() + '|adult'); } catch (e) {} });
  const page = await ctx.newPage();
  for (const p of PAGES) {
    await page.goto(ORIGIN + p, { waitUntil: 'networkidle' });
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 20)); } scrollTo(0, 0); await document.fonts.ready; });
    const res = await page.evaluate((src) => (0, eval)(src), iife);
    if (!res || !res.viewport || res.viewport.w !== w) throw new Error(`sweep viewport mismatch on ${p}: wanted ${w}, got ${res && res.viewport && res.viewport.w}`);
    const slug = (p === '/' ? 'home' : p.replace(/^\/|\/$/g, '').replace(/[/.]/g, '_'));
    const file = path.join(outDir, `${slug}-${w}.json`);
    fs.writeFileSync(file, JSON.stringify(res));
    execFileSync('node', [SKILL, '--project', ROOT, '--merge', file, '--label', `${slug}-${w}`], { encoding: 'utf8' });
    merged++;
  }
  await ctx.close();
}
await browser.close(); server.close();
console.log('merged', merged, 'sweeps over', PAGES.length, 'pages x', WIDTHS.join('/'));
console.log(execFileSync('node', [SKILL, '--project', ROOT, '--collect'], { encoding: 'utf8' }).split('\n').slice(-25).join('\n'));
