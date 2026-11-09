// gen-download.mjs — download generated stills (fal URLs are temporary) and keep their provenance.
// Writes assets/generated/raw/<name>.jpg and appends to assets/generated/generated.json:
// { name, model, requestId, seed, prompt, width, height, url, downloadedAt }.
//   node tools/gen-download.mjs <jobs.json>      jobs: [{ name, requestId, seed, url, width, height, prompt }]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'generated', 'raw');
fs.mkdirSync(OUT, { recursive: true });
const LOG = path.join(ROOT, 'assets', 'generated', 'generated.json');
const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8')) : { model: 'fal-ai/flux-pro/v1.1-ultra', listPriceUsd: 0.06, items: [] };
const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const j of jobs) {
  const file = path.join(OUT, j.name + '.jpg');
  const r = await fetch(j.url);
  if (!r.ok) { console.log('FAIL', j.name, r.status); continue; }
  const b = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(file, b);
  log.items = log.items.filter((x) => !(x.name === j.name && x.requestId === j.requestId));
  log.items.push({ ...j, model: log.model, file: path.relative(ROOT, file), bytes: b.length, downloadedAt: new Date().toISOString() });
  console.log('ok', j.name, b.length);
}
fs.writeFileSync(LOG, JSON.stringify(log, null, 2));
console.log('renders logged', log.items.length, '· list price $' + (log.items.length * log.listPriceUsd).toFixed(2));
