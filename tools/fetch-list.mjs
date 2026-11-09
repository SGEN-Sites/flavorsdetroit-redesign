// fetch-list.mjs — download a list of files (fal URLs are temporary) to paths inside the project.
//   node tools/fetch-list.mjs <list.json>      list: [{ "url": "...", "out": "assets/generated/raw/x.png" }]
// The list for anything made from the owner's own photos lives in assets/source/ (private, never published).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const list = JSON.parse(fs.readFileSync(path.resolve(ROOT, process.argv[2]), 'utf8'));
let ok = 0, failed = 0;
for (const { url, out } of list) {
  const dest = path.resolve(ROOT, out);
  if (!dest.startsWith(ROOT + path.sep)) { console.log('SKIP (outside the project)', out); failed++; continue; }
  const r = await fetch(url);
  if (!r.ok) { console.log('FAIL', r.status, out); failed++; continue; }
  const b = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, b);
  console.log('ok', out, b.length);
  ok++;
}
console.log(`${ok} downloaded, ${failed} failed`);
if (failed) process.exitCode = 1;
