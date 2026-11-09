// prune-image-fragments.mjs — move srcset parse artefacts out of audit/image-inventory.json.
//
// Wix serves transform URLs that contain commas (".../v1/fill/w_310,h_282,al_c,q_80/name.jpg").
// Splitting a srcset on commas produces two kinds of fake "image":
//   1. the tail tokens resolved against the page origin
//      (https://www.flavorsdetroit.com/h_282, /al_c, /post/enc_auto/<id>~mv2.jpg, /quality_auto/x.jpg)
//   2. the head cut at the first comma
//      (https://static.wixstatic.com/media/<id>~mv2.jpg/v1/fill/w_310) which the CDN answers 403.
// Neither is an image. The complete URL for the same media is in the inventory and downloads.
// Fetching kind 1 would also send junk requests to a host that rate-limited the crawl (HTTP 429).
// They are MOVED, not deleted: every entry and the reason land in audit/image-inventory.pruned.json,
// stale assets:image failures for them are closed, and one accepted entry per pass is written to
// audit/failures.json so the decision is on the record (B4).
//
//   node tools/prune-image-fragments.mjs            (dry run: prints counts)
//   node tools/prune-image-fragments.mjs --apply
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const invFile = path.join(ROOT, 'audit', 'image-inventory.json');
const outFile = path.join(ROOT, 'audit', 'image-inventory.pruned.json');
const failFile = path.join(ROOT, 'audit', 'failures.json');
const apply = process.argv.includes('--apply');

const inv = JSON.parse(fs.readFileSync(invFile, 'utf8'));
const IMG_EXT = /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i;

/** Returns a reason string when src is a parse artefact, else null. */
function fragmentReason(src) {
  let u; try { u = new URL(src); } catch { return 'unparseable url'; }
  if (u.host === 'www.flavorsdetroit.com') {
    if (/^\/(quality_auto|h_\d+|w_\d+|y_\d+|x_\d+|q_\d+|al_c|enc_avif|usm_|blur_)/.test(u.pathname)) return 'transform token resolved against the page origin';
    if (/\/enc_auto\/|~mv2|\/quality_auto\//.test(u.pathname)) return 'media id resolved against the page path';
    if (!IMG_EXT.test(u.pathname)) return 'same-origin path without an image extension';
    return null;
  }
  if (u.host === 'static.wixstatic.com') {
    // A complete transform URL ends in "/<transforms>/<filename.ext>". One cut at the first comma
    // ends in a single bare token ("/v1/fill/w_310", "/v1/crop/x_576") and the CDN answers 403.
    if (/\/v1\/(fill|crop|fit)\/[^/,]+$/.test(u.pathname) && !IMG_EXT.test(u.pathname)) return 'transform URL truncated at its first comma (CDN answers 403)';
  }
  return null;
}

const keep = []; const pruned = [];
for (const im of inv.images) {
  const why = fragmentReason(im.src);
  if (why) pruned.push({ ...im, prunedWhy: why }); else keep.push(im);
}
console.log('images', inv.images.length, '-> keep', keep.length, 'prune', pruned.length);
if (!apply || pruned.length === 0) process.exit(0);

const prev = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : { images: [] };
const all = [...(prev.images || []), ...pruned];
fs.writeFileSync(outFile, JSON.stringify({
  schema: 'flavors/image-inventory-pruned@1',
  generated: new Date().toISOString(),
  reason: 'srcset parse artefacts (comma-split Wix transform URLs). Not images; the complete URL for each media id stays in the inventory.',
  count: all.length,
  images: all,
}, null, 2));
inv.images = keep;
inv.note = (inv.note ? inv.note + ' ' : '') + `Pruned ${pruned.length} more srcset fragments to audit/image-inventory.pruned.json (tools/prune-image-fragments.mjs, ${new Date().toISOString().slice(0, 10)}).`;
fs.writeFileSync(invFile, JSON.stringify(inv, null, 2));

const prunedSet = new Set(pruned.map((p) => p.src));
const failures = JSON.parse(fs.readFileSync(failFile, 'utf8'));
const before = failures.items.length;
failures.items = failures.items.filter((x) => !(String(x.stage || '').startsWith('assets:') && prunedSet.has(x.target)));
const closed = before - failures.items.length;
failures.items.push({
  stage: 'extract:images',
  target: 'audit/image-inventory.json',
  reason: `${pruned.length} entries were srcset fragments, not images (${[...new Set(pruned.map((p) => p.prunedWhy))].join('; ')}); moved to audit/image-inventory.pruned.json` + (closed ? `; ${closed} assets:image failure(s) for them closed` : ''),
  accepted: true,
  acceptedWhy: 'parse artefacts: nothing real to fetch; the complete URL for every media id is in the inventory',
  at: new Date().toISOString(),
});
fs.writeFileSync(failFile, JSON.stringify(failures, null, 2));
console.log('applied; closed', closed, 'stale asset failures');
