// deal-download.mjs — download the deals band's product renders and their cut-outs (fal URLs are
// temporary) into assets/generated/raw/: deal-<id>-r.png (the render) and deal-<id>-cut.png (the
// BiRefNet cut-out, when the job has a cutoutUrl). Provenance stays in assets/generated/jobs-deals.json.
//   node tools/deal-download.mjs [--cutouts]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'assets', 'generated', 'raw');
const JOBS = path.join(ROOT, 'assets', 'generated', 'jobs-deals.json');
const cutouts = process.argv.includes('--cutouts');
const jobs = JSON.parse(fs.readFileSync(JOBS, 'utf8'));
fs.mkdirSync(RAW, { recursive: true });
let n = 0, failed = 0;
for (const [id, j] of Object.entries(jobs.items)) {
  const url = cutouts ? j.cutoutUrl : j.url;
  if (!url) { console.log('skip', id, cutouts ? '(no cutoutUrl)' : '(no url)'); continue; }
  const file = path.join(RAW, `deal-${id}-${cutouts ? 'cut' : 'r'}.png`);
  const r = await fetch(url);
  if (!r.ok) { console.log('FAIL', id, r.status); failed++; continue; }
  const b = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(file, b);
  console.log('ok', id, path.relative(ROOT, file), b.length);
  n++;
}
// the owner's own product photos: their cut-outs (and an upscale, where one was made)
if (cutouts) {
  for (const [id, j] of Object.entries((jobs.owner || {}).items || {})) {
    for (const [key, suffix] of [['cutoutUrl', 'cut'], ['upscaleUrl', 'up']]) {
      if (!j[key]) continue;
      const file = path.join(RAW, `owner-${id}-${suffix}.png`);
      const r = await fetch(j[key]);
      if (!r.ok) { console.log('FAIL', id, key, r.status); failed++; continue; }
      const b = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(file, b);
      console.log('ok', id, path.relative(ROOT, file), b.length);
      n++;
    }
  }
}
console.log(`${n} downloaded, ${failed} failed`);
if (failed) process.exitCode = 1;
