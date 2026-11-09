// fetch-fonts.mjs — self-host the open-licence (SIL OFL) families the redesign uses.
// Downloads the LATIN subset woff2 of each family/weight from Google Fonts once, into
// src/assets/fonts/, and records the source URL + licence in src/assets/fonts/FONTS.json.
// The built site never calls a font CDN at runtime.
// 2026-11-09: the owner chose pairing A: Jockey One (headlines: the closest measured match to the
// sign's lettering) + Barlow (text). Tilt Neon stays for the neon numerals.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'assets', 'fonts');
fs.mkdirSync(OUT, { recursive: true });
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const FAMILIES = [
  { file: 'jockey-one.woff2', css: 'Jockey+One', style: 'normal' },
  { file: 'tilt-neon.woff2', css: 'Tilt+Neon', style: 'normal' },
  { file: 'barlow-400.woff2', css: 'Barlow:wght@400', style: 'normal' },
  { file: 'barlow-400-italic.woff2', css: 'Barlow:ital,wght@1,400', style: 'italic' },
  { file: 'barlow-500.woff2', css: 'Barlow:wght@500', style: 'normal' },
  { file: 'barlow-600.woff2', css: 'Barlow:wght@600', style: 'normal' },
  { file: 'barlow-700.woff2', css: 'Barlow:wght@700', style: 'normal' },
];

const record = { fetched: new Date().toISOString(), licence: 'SIL Open Font License 1.1 (all families)', fonts: [] };
for (const f of FAMILIES) {
  const r = await fetch('https://fonts.googleapis.com/css2?family=' + f.css + '&display=swap', { headers: { 'user-agent': UA } });
  const css = await r.text();
  // Blocks look like: /* latin */ @font-face { font-style: normal; ... src: url(...) format('woff2'); unicode-range: ...; }
  const blocks = css.split('/*').map((b) => b.trim()).filter((b) => b.startsWith('latin */'));
  const block = blocks.find((b) => b.includes('font-style: ' + f.style));
  if (!block) { console.log('no latin block for', f.file); continue; }
  const url = block.match(/url\(([^)]+)\)/)[1];
  const range = (block.match(/unicode-range:\s*([^;]+);/) || [])[1];
  const fr = await fetch(url, { headers: { 'user-agent': UA } });
  const buf = Buffer.from(await fr.arrayBuffer());
  fs.writeFileSync(path.join(OUT, f.file), buf);
  record.fonts.push({ file: f.file, source: url, family: f.css.split(':')[0].replace(/\+/g, ' '), style: f.style, bytes: buf.length, unicodeRange: range });
  console.log(fr.status, f.file, buf.length);
}
fs.writeFileSync(path.join(OUT, 'FONTS.json'), JSON.stringify(record, null, 2));
