// menu-facts.mjs — turn the live ordering portal capture into the redesign's deal data.
//
// Reads  audit/portal-probe.json (full menu text, captured with tools/probe-portal.mjs)
//        audit/portal-collection-owners-box-exclusive-flower.json (tools/probe-collection.mjs)
// Writes src/content/menu.json          the curated, dated deal data the templates render
//        facts/client-facts.json        merges a "liveMenu" block with the VERBATIM source lines,
//                                       so every price on the rebuild traces to the live menu
//                                       (sr-fabrication reads this file)
//
// Nothing here is typed from memory: every price is parsed from a captured line, and the capture
// date travels with it. Prices change; the pages say so and send people to the live menu.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const probe = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit', 'portal-probe.json'), 'utf8'));
const boxFile = path.join(ROOT, 'audit', 'portal-collection-owners-box-exclusive-flower.json');
const box = fs.existsSync(boxFile) ? JSON.parse(fs.readFileSync(boxFile, 'utf8')) : null;
const L = probe.text.split('\n').map((s) => s.trim()).filter(Boolean);
const capturedAt = probe.at;
// The capture ran 2026-11-08T23:06Z, which is the evening of November 8 in Detroit.
const asOfLabel = new Date(capturedAt).toLocaleDateString('en-US', { timeZone: 'America/Detroit', year: 'numeric', month: 'long', day: 'numeric' });

// ---- product blocks: [badge] brand, "(tag) name", type, THC, price, unit ----------------------
const products = [];
for (let i = 0; i < L.length; i++) {
  const m = L[i].match(/^\((\$\d+(?:\.\d+)?(?:oz|G|g)?)\)\s*(.+)$/);
  if (!m) continue;
  let brand = L[i - 1];
  if (/^(Special|Best seller|Staff pick|Add to cart)$/.test(brand)) brand = L[i - 2];
  const rec = { tag: m[1], name: m[2], brand, line: L[i] };
  for (let k = i + 1; k < Math.min(L.length, i + 14); k++) {
    if (/^THC /.test(L[k]) && !rec.thc) rec.thc = L[k].replace(/^THC\s*/, '');
    if (/^(Indica|Sativa|Hybrid|CBD)$/.test(L[k]) && !rec.type) rec.type = L[k];
    if (/^\$\d/.test(L[k]) && !rec.price) { rec.price = L[k]; rec.unit = (L[k + 1] || '').replace(/^\/\s*/, ''); }
    if (L[k] === 'Add to cart') break;
  }
  products.push(rec);
}
const cleanName = (n) => n.replace(/^Flavors (3\.5G|28G) Prepack - /, '').replace(/^Top Shelf Shake - /, '').replace(/^Hello Farms 1G Preroll - /, '').replace(/^Flavors 1\.3G Jumbo Preroll - /, '').replace(/\s*\(\s*([A-Za-z/]+)\s*\)\s*$/, ' ($1)').trim();
const byTag = (re, brandRe) => products.filter((p) => re.test(p.tag) && (!brandRe || brandRe.test(p.brand)));

// ---- collections (deal bundles), verbatim names from the menu's "Collection" filter -----------
const cStart = L.indexOf('All collections');
const cEnd = L.findIndex((l, i) => i > cStart && /^Sort by$/.test(l));
const collections = cStart >= 0 ? L.slice(cStart + 1, cEnd > cStart ? cEnd : cStart + 80) : [];

// ---- deli counter: flower by the gram ------------------------------------------------------
const deliTiers = [];
for (const g of ['$3G', '$5G', '$8G', '$10G', '$15G']) {
  const rows = products.filter((p) => p.brand === 'Flavors Deli-Style Flower' && p.tag.toLowerCase() === g.toLowerCase());
  if (!rows.length) continue;
  const eighth = rows.map((r) => r.price).filter(Boolean)[0];
  deliTiers.push({ perGram: g.replace('G', ''), eighth, count: rows.length, strains: rows.map((r) => cleanName(r.name)) });
}
// "$8" without the G carries the $8 tier on one item
const eightLoose = products.filter((p) => p.brand === 'Flavors Deli-Style Flower' && p.tag === '$8');
if (eightLoose.length) {
  const t = deliTiers.find((d) => d.perGram === '$8');
  if (t) { t.strains.push(...eightLoose.map((r) => cleanName(r.name))); t.count += eightLoose.length; }
}

// ---- prepacks ----------------------------------------------------------------------------
const eighths = byTag(/^\$10$/, /3\.5G/).map((p) => cleanName(p.name));
const eighthsAll = products.filter((p) => p.tag === '$10' && /3\.5G Prepack/.test(p.name)).map((p) => cleanName(p.name));
const ounceTiers = [];
for (const t of ['$19oz', '$25oz', '$35oz', '$50oz', '$55oz', '$65oz', '$75oz', '$85oz']) {
  const rows = products.filter((p) => p.tag === t);
  if (!rows.length) continue;
  ounceTiers.push({ price: t.replace('oz', ''), count: rows.length, kind: rows.every((r) => /Top Shelf Shake/.test(r.name)) ? 'Top shelf shake' : 'Prepacked ounce', strains: rows.map((r) => cleanName(r.name)) });
}
const dollarPrerolls = byTag(/^\$1$/).map((p) => cleanName(p.name));
const jumboPrerolls = byTag(/^\$3$/, /Pre Rolled/).map((p) => cleanName(p.name));

// ---- the Owner's Box ---------------------------------------------------------------------
let ownersBox = null;
if (box && box.lines) {
  const items = [];
  for (let i = 0; i < box.lines.length; i++) {
    const m = box.lines[i].match(/^\((\$\d+G)\)\s*(.+)$/);
    if (!m) continue;
    const it = { name: cleanName(m[2]), line: box.lines[i], perGram: m[1].replace('G', '') };
    for (let k = i + 1; k < Math.min(box.lines.length, i + 14); k++) {
      if (/^THC /.test(box.lines[k]) && !it.thc) it.thc = box.lines[k].replace(/^THC\s*/, '');
      if (/^(Indica|Sativa|Hybrid)$/.test(box.lines[k]) && !it.type) it.type = box.lines[k];
      if (/^Buy 3\.5 g for /.test(box.lines[k])) it.eighth = box.lines[k].replace('Buy 3.5 g for ', '');
      if (/^\(\$/.test(box.lines[k])) break;
    }
    items.push(it);
  }
  ownersBox = { collection: box.collection, count: box.count, capturedAt: box.at, items };
}

const pick = (re) => collections.filter((c) => re.test(c));
const menu = {
  source: 'https://flavors-detroit.portal42.com/',
  capturedAt, asOfLabel,
  note: 'Parsed by tools/menu-facts.mjs from audit/portal-probe.json. Prices change; the live menu is the final word.',
  deliTiers,
  eighths: { price: '$10', size: '3.5G', count: eighthsAll.length, strains: eighthsAll },
  ounceTiers,
  prerolls: {
    dollar: { price: '$1', size: '1G', brand: 'Hello Farms', strains: dollarPrerolls },
    jumbo: { price: '$3', size: '1.3G', count: jumboPrerolls.length, bundle: pick(/Jumbo Exotics Prerolls/)[0] || null },
    bundles: pick(/Preroll|Pre Roll|Rocket Stick|Tarantula|Infused thirteen/i),
  },
  vapes: pick(/Vape|Cart|disposable|Disposables|510/i),
  concentrates: pick(/Bucket|Crumble|Diamond|Sauce|Budder|Brush|Donut|clair|Snowcapped|Krack|RSO/i),
  edibles: pick(/Gumm|Chew|Dope Rope|Syrup|Chill to Go|Chocolate/i).filter((c) => !/Pain/i.test(c)),
  premiumEighths: pick(/Eights|Exotics$/i),
  collections,
  ownersBox,
};
fs.mkdirSync(path.join(ROOT, 'src', 'content'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'src', 'content', 'menu.json'), JSON.stringify(menu, null, 2));

// ---- merge the verbatim source lines into the declared facts ------------------------------
const factsFile = path.join(ROOT, 'facts', 'client-facts.json');
const facts = JSON.parse(fs.readFileSync(factsFile, 'utf8'));
facts.liveMenu = {
  source: 'PORTAL https://flavors-detroit.portal42.com/ captured ' + capturedAt + ' (audit/portal-probe.json) and the Owners Box collection (audit/portal-collection-owners-box-exclusive-flower.json)',
  asOf: asOfLabel,
  collections,
  productLines: products.map((p) => [p.line, p.brand, p.type, p.thc ? 'THC ' + p.thc : '', p.price ? p.price + ' / ' + p.unit : ''].filter(Boolean).join(' · ')),
  ownersBox: ownersBox ? ownersBox.items.map((i) => [i.line, i.type, i.thc ? 'THC ' + i.thc : '', i.eighth ? 'Buy 3.5 g for ' + i.eighth : ''].filter(Boolean).join(' · ')) : [],
  pickupNote: 'Bring a valid ID at pickup or delivery.',
};
fs.writeFileSync(factsFile, JSON.stringify(facts, null, 2));

console.log('as of', asOfLabel);
console.log('deli tiers', deliTiers.map((d) => d.perGram + '/g=' + d.eighth + ' x' + d.count).join(', '));
console.log('eighths', eighthsAll.length, '| ounce tiers', ounceTiers.map((o) => o.price + ' x' + o.count).join(', '));
console.log('$1 prerolls', dollarPrerolls.length, '| jumbo', jumboPrerolls.length);
console.log('collections', collections.length, '| owners box', ownersBox ? ownersBox.items.map((i) => i.name + ' ' + i.eighth + ' ' + i.thc).join('; ') : 'none');
