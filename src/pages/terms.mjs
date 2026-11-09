// terms.mjs — /terms-of-service/. The live Terms of Service, word for word. Legal text keeps
// its original capitalisation (all-caps clauses can be deliberate). The only change is the
// street number, 5730 -> 5700, at the owner's direction; it is stated on the page.
// Source: src/content/terms-of-service.txt, a copy of the browser capture of the live page
// (audit/pages/terms-of-service/text.txt, 2026-11-08).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc } from '../lib/html.mjs';
import { page } from '../lib/layout.mjs';
import { pageHero } from '../lib/parts.mjs';
import { breadcrumbJsonLd } from '../lib/seo.mjs';

export const PATH = '/terms-of-service/';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function paragraphs() {
  const t = fs.readFileSync(path.join(ROOT, 'src', 'content', 'terms-of-service.txt'), 'utf8');
  const s = t.indexOf('TERMS OF SERVICE AGREEMENT');
  const e = t.lastIndexOf('Terms Of Service');
  const raw = t.slice(s + 'TERMS OF SERVICE AGREEMENT'.length, e)
    .split(/\n\s*\n/).map((x) => x.replace(/​/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  // Wix breaks some sentences across blocks; join a block to the next when it does not end a sentence.
  const out = [];
  const isHeading = (x) => x.split(/\s+/).length <= 7 && x === x.toUpperCase() && /[A-Z]/.test(x) && !/[.:;,]/.test(x);
  for (let i = 0; i < raw.length; i++) {
    let x = raw[i];
    if (isHeading(x)) { out.push({ h: true, x }); continue; }
    while (i + 1 < raw.length && !/[.!?:;")]$/.test(x) && !isHeading(raw[i + 1]) && !/^\d/.test(raw[i + 1]) && x.length > 40) { x = x + ' ' + raw[++i]; }
    out.push({ h: false, x });
  }
  let fixes = 0;
  for (const o of out) o.x = o.x.replace(/5730(\s+E\.?\s+8\s+Mile)/gi, (m, rest) => { fixes++; return '5700' + rest; });
  return { out, fixes };
}

export function render() {
  const { out } = paragraphs();
  const html = out.map((o) => (o.h ? `<h2>${esc(o.x)}</h2>` : `<p>${esc(o.x)}</p>`)).join('\n');
  const main = `${pageHero(PATH, {
    kick: 'Flavors Detroit',
    title: 'Terms of service',
    lede: 'Terms of Service Agreement, as published on flavorsdetroit.com.',
    crumbs: [{ label: 'Terms of service' }],
  })}
<section class="band band--white">
  <div class="container container--narrow">
    <div class="legal prose">
      <h2 class="visually-hidden">Terms of Service Agreement</h2>
      ${html}
    </div>
  </div>
</section>`;
  return page({
    path: PATH,
    title: 'Terms of Service | Flavors Detroit',
    description: 'Terms of Service Agreement for the Flavors Detroit website.',
    canonicalPath: '/terms-of-service',
    main,
    gateExempt: true,
    jsonld: [breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Terms of service', path: '/terms-of-service' }])],
  });
}
