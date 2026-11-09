// contrast.mjs — WCAG 2.x contrast ratios for the text/background pairs the design uses, read
// from src/styles/tokens.css (hex tokens only). Writes audit/contrast.json and prints a table.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(ROOT, 'src', 'styles', 'tokens.css'), 'utf8');
const tok = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]));
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(tok[a]), lum(tok[b])].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const PAIRS = [
  ['cream', 'night', 'headings and body on night bands'],
  ['cream-2', 'night', 'ledes on night bands'],
  ['mist', 'night', 'muted text on night bands'],
  ['led-soft', 'night', 'kickers and accent words on night'],
  ['led', 'night', 'LED accents (large text and UI only)'],
  ['open', 'night', 'Open now status'],
  ['closed', 'night', 'Closed status'],
  ['cream', 'navy', 'text on navy bands'],
  ['mist', 'navy', 'muted text on navy'],
  ['cream', 'sign-black', 'text on the black bands and footer'],
  ['mist', 'sign-black', 'muted text on black'],
  ['ink', 'showroom', 'body on day bands'],
  ['ink-2', 'showroom', 'secondary text on day bands'],
  ['ink-3', 'showroom', 'captions on day bands'],
  ['ink', 'white', 'body on white'],
  ['ink-2', 'white', 'secondary on white'],
  ['ink-3', 'white', 'captions on white'],
  ['royal', 'white', 'links and accents on white'],
  ['royal-deep', 'white', 'kickers on white'],
  ['white', 'royal', 'button text on royal blue'],
  ['white', 'royal-deep', 'button text on the darker edge'],
  ['ink', 'cream', 'price tags and Owner\'s Box labels'],
  ['ink-2', 'cream', 'tag details'],
  ['royal-deep', 'cream', 'tag kickers'],
  ['white', 'street-green', 'street sign'],
];
const rows = PAIRS.filter(([a, b]) => tok[a] && tok[b]).map(([a, b, use]) => ({ fg: `--${a} ${tok[a]}`, bg: `--${b} ${tok[b]}`, ratio: +ratio(a, b).toFixed(2), use, aa: ratio(a, b) >= 4.5 ? 'AA' : ratio(a, b) >= 3 ? 'AA large/UI' : 'FAIL' }));
fs.writeFileSync(path.join(ROOT, 'audit', 'contrast.json'), JSON.stringify(rows, null, 2));
for (const r of rows) console.log(`${r.fg.padEnd(26)} on ${r.bg.padEnd(24)} ${String(r.ratio).padStart(6)}:1  ${r.aa.padEnd(11)} ${r.use}`);
