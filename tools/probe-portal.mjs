// probe-portal.mjs — one headless visit to the live ordering portal to learn its category URLs.
// The portal (flavors-detroit.portal42.com) sends X-Frame-Options: SAMEORIGIN, so the redesign
// links to it instead of embedding it. This records which deep links exist so every "See menu"
// link can land on the right category. Writes audit/portal-probe.json.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_CORE || 'playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const target = process.argv[2] || 'https://flavors-detroit.portal42.com/';
const out = { at: new Date().toISOString(), url: target, links: [], text: '' };
try {
  const resp = await page.goto(out.url, { waitUntil: 'networkidle', timeout: 45000 });
  out.status = resp ? resp.status() : 0;
  out.finalUrl = page.url();
  await page.waitForTimeout(2500);
  out.title = await page.title();
  out.links = await page.$$eval('a[href]', (as) => as.map((a) => ({ text: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60), href: a.href })));
  out.text = await page.evaluate(() => document.body.innerText);
  // Category controls may be buttons rather than links: record their labels too.
  out.buttons = await page.$$eval('button, [role="tab"], [role="link"]', (bs) => bs.map((b) => (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60)).filter(Boolean));
  await page.screenshot({ path: path.join(ROOT, 'audit', 'references', 'portal42-' + (new URL(out.url).pathname.replace(/\W+/g, '-') || 'home') + '1440.png') });
} catch (e) { out.error = String(e && e.message || e); }
fs.mkdirSync(path.join(ROOT, 'audit', 'references'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'audit', 'portal-probe' + (process.argv[2] ? '-' + new URL(target).pathname.replace(/\W+/g, '-') : '') + '.json'), JSON.stringify(out, null, 2));
console.log(out.title, '| links', out.links.length, out.error || '');
for (const l of out.links) console.log(' ', l.text, '->', l.href);
await browser.close();
