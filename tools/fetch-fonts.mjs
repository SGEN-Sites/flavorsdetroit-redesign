// fetch-fonts.mjs — self-host the open-licence (SIL OFL) families the redesign uses.
// Downloads the LATIN subset woff2 of each family/weight from Google Fonts once, into
// src/assets/fonts/, and records the source URL + licence in src/assets/fonts/FONTS.json.
// The built site never calls a font CDN at runtime.
// 2026-11-09: the owner first chose pairing A, Jockey One + Barlow; later the same day the owner
// changed it to Outfit (titles and larger text) + Work Sans (text). Both are variable fonts: one
// woff2 per family covers every weight. Tilt Neon stays for the neon numerals.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'assets', 'fonts');
fs.mkdirSync(OUT, { recursive: true });
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const FAMILIES = [
  { file: 'outfit.woff2', css: 'Outfit:wght@100..900', style: 'normal' },
  { file: 'work-sans.woff2', css: 'Work+Sans:wght@100..900', style: 'normal' },
  { file: 'work-sans-italic.woff2', css: 'Work+Sans:ital,wght@1,100..900', style: 'italic' },
  { file: 'tilt-neon.woff2', css: 'Tilt+Neon', style: 'normal' },
];
// files of earlier pairings, removed once the new ones are in
const RETIRED = ['jockey-one.woff2', 'barlow-400.woff2', 'barlow-400-italic.woff2', 'barlow-500.woff2', 'barlow-600.woff2', 'barlow-700.woff2'];
// OUTLINED words (the navy tape: 800; the kinetic band: 400) use the designer's own STATIC builds.
// The variable Outfit keeps each letter's parts as separate overlapping contours (F is three: the
// stem and two bars; a is three). Filled, that is invisible; -webkit-text-stroke traces every contour,
// so seams showed inside the outlined letters (owner, 2026-11-09: "fonts in outline looks broken").
// Google's single-weight files are instanced from the variable font and keep the overlaps (checked
// 2026-11-09: F3 a3 r2 t2); the designer's static builds have every letter merged (F1 a2 r1 t1).
// Pinned to the repo's commit; subset to the same Latin range as outfit.woff2 with fontTools.
const OUTLINE_REPO = 'https://raw.githubusercontent.com/Outfitio/Outfit-Fonts/902773808eb372f70fb34e8946dd1ffe604efc79/';
// (the kinetic band's words went from 400 to Black 900 at the owner's request, 2026-11-09: "can we
// make them in bold or black if that thickness is available?")
const OUTLINE = [
  { file: 'outfit-outline-800.woff2', weight: 800, src: OUTLINE_REPO + 'fonts/webfonts/Outfit-ExtraBold.woff2' },
  { file: 'outfit-outline-900.woff2', weight: 900, src: OUTLINE_REPO + 'fonts/webfonts/Outfit-Black.woff2' },
];
RETIRED.push('outfit-outline-400.woff2');

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
const fetchedFamilies = record.fonts.length;
const latin = (record.fonts.find((f) => f.file === 'outfit.woff2') || {}).unicodeRange;
record.outline = [];
for (const o of OUTLINE) {
  const fr = await fetch(o.src);
  if (!fr.ok) { console.log(fr.status, 'outline font not fetched:', o.src); continue; }
  const tmp = path.join(OUT, '.tmp-' + o.file);
  fs.writeFileSync(tmp, Buffer.from(await fr.arrayBuffer()));
  const out = path.join(OUT, o.file);
  let subset = 'none (python3 -m fontTools.subset unavailable: the full file is used)';
  try {
    if (!latin) throw new Error('no Latin range recorded for outfit.woff2');
    execFileSync('python3', ['-I', '-m', 'fontTools.subset', tmp, '--unicodes=' + latin.replace(/\s+/g, ''), '--layout-features=*', '--flavor=woff2', '--output-file=' + out]);
    subset = latin;
    fs.rmSync(tmp);
  } catch (e) {
    console.log('subset failed (' + e.message.split('\n')[0] + '): keeping the full file');
    fs.renameSync(tmp, out);
  }
  const bytes = fs.statSync(out).size;
  record.outline.push({ file: o.file, source: o.src, servedAs: 'Outfit Outline', weight: o.weight, style: 'normal', bytes, unicodeRange: subset,
    why: 'merged contours for -webkit-text-stroke (the variable Outfit keeps overlapping contours)' });
  console.log(fr.status, o.file, bytes);
}
fs.writeFileSync(path.join(OUT, 'FONTS.json'), JSON.stringify(record, null, 2));
if (fetchedFamilies === FAMILIES.length) {
  for (const f of RETIRED) { const p = path.join(OUT, f); if (fs.existsSync(p)) { fs.rmSync(p); console.log('removed', f); } }
} else console.log('not every family was fetched: the earlier files are kept');
