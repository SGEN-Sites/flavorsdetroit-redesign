// probe-collection.mjs — select ONE collection filter on the live ordering portal and record the
// products it lists (name, price, strain type, brand line). Read-only: it changes a filter, never
// touches the cart. Used for the Owner's Box and the deal collections, so prices on the redesign
// trace to the live menu on a stated date.
//
//   node tools/probe-collection.mjs "Owners Box - Exclusive Flower" [...]
// Writes audit/portal-collection-<slug>.json
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_CORE || 'playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const names = process.argv.slice(2);
if (!names.length) { console.log('usage: probe-collection.mjs "<collection label>" [...]'); process.exit(64); }

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('https://flavors-detroit.portal42.com/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);

// Where does the label live? A <select><option>, a listbox, or a hidden menu item.
const where = await page.evaluate((label) => {
  const all = [...document.querySelectorAll('*')].filter((el) => el.children.length === 0 && (el.textContent || '').trim() === label);
  return all.map((el) => {
    const sel = el.closest('select');
    return { tag: el.tagName, selectName: sel ? (sel.name || sel.id || sel.getAttribute('aria-label') || '') : null, value: el.getAttribute('value'), parentTag: el.parentElement && el.parentElement.tagName };
  });
}, names[0]);
console.log('label found as', JSON.stringify(where));

for (const label of names) {
  const out = { at: new Date().toISOString(), collection: label, url: null, products: [], text: '' };
  try {
    const selects = await page.$$('select');
    let done = false;
    for (const s of selects) {
      const opts = await s.$$eval('option', (os) => os.map((o) => ({ v: o.value, t: (o.textContent || '').trim() })));
      const hit = opts.find((o) => o.t === label);
      if (hit) { await s.selectOption(hit.v); done = true; break; }
    }
    if (!done) {
      const el = page.getByText(label, { exact: true }).first();
      await el.click({ force: true, timeout: 8000 });
    }
    await page.waitForTimeout(3500);
    out.url = page.url();
    out.text = await page.evaluate(() => document.body.innerText);
    const lines = out.text.split('\n').map((s) => s.trim()).filter(Boolean);
    const start = lines.findIndex((l) => /^\d+ products?$/.test(l));
    out.count = start >= 0 ? lines[start] : null;
    const prods = [];
    for (let i = start + 1; i < lines.length; i++) {
      const l = lines[i];
      if (/^(Terms|Privacy policy)$/.test(l)) break;
      if (l === 'Add to cart' || l === '●' || l === '/ unit') continue;
      prods.push(l);
    }
    out.lines = prods.slice(0, 400);
  } catch (e) { out.error = String(e && e.message || e).split('\n')[0]; }
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  fs.writeFileSync(path.join(ROOT, 'audit', 'portal-collection-' + slug + '.json'), JSON.stringify(out, null, 2));
  console.log(label, '|', out.count, '|', out.url, out.error || '');
  console.log((out.lines || []).slice(0, 80).join(' | '));
  await page.goto('https://flavors-detroit.portal42.com/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
}
await browser.close();
