// fetch-fonts.mjs — self-host the four open-licence (SIL OFL) families the redesign uses.
// Downloads the LATIN subset woff2 of each variable font from Google Fonts once, into
// src/assets/fonts/, and records the source URL + licence in src/assets/fonts/FONTS.json.
// The built site never calls a font CDN at runtime.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'assets', 'fonts');
fs.mkdirSync(OUT, { recursive: true });
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const FAMILIES = [
  { file: 'big-shoulders-display.woff2', css: 'Big+Shoulders+Display:wght@600..900', style: 'normal' },
  { file: 'big-shoulders-inline-display.woff2', css: 'Big+Shoulders+Inline+Display:wght@700..900', style: 'normal' },
  { file: 'tilt-neon.woff2', css: 'Tilt+Neon', style: 'normal' },
  { file: 'instrument-sans.woff2', css: 'Instrument+Sans:ital,wdth,wght@0,75..100,400..700;1,75..100,400..700', style: 'normal' },
  { file: 'instrument-sans-italic.woff2', css: 'Instrument+Sans:ital,wdth,wght@0,75..100,400..700;1,75..100,400..700', style: 'italic' },
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
