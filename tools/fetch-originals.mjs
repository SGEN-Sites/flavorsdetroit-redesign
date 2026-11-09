// fetch-originals.mjs — download the ORIGINAL upload behind a Wix media id (no transforms).
// The home page serves crops as small as 310x282; the original upload is the real asset.
// One request per id, one at a time, 800 ms apart, to static.wixstatic.com only.
//
//   node tools/fetch-originals.mjs <id> [<id> ...]     ids like 501c8b_1a81...~mv2.jpg
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(ROOT, 'assets', 'originals');
fs.mkdirSync(outDir, { recursive: true });
const ids = process.argv.slice(2);
const logFile = path.join(ROOT, 'audit', 'originals-log.json');
const log = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf8')) : { items: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const id of ids) {
  const url = 'https://static.wixstatic.com/media/' + id;
  const file = path.join(outDir, id.replace(/~/g, '_'));
  if (fs.existsSync(file)) { console.log('cached', id); continue; }
  const r = await fetch(url, { headers: { 'user-agent': 'site-reforge/1.12 (redesign capture)' } });
  const rec = { id, url, status: r.status, at: new Date().toISOString() };
  if (r.ok) {
    const b = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(file, b);
    rec.bytes = b.length; rec.file = path.relative(ROOT, file);
  }
  log.items.push(rec);
  console.log(r.status, id, rec.bytes || '');
  if (r.status === 403 || r.status === 429) { console.log('STOP on', r.status); break; }
  await sleep(800);
}
fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
