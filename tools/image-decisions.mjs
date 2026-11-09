// image-decisions.mjs — one decision per source image in audit/image-inventory.json, by what the
// redesign actually does with it, each with its reason (C08). Re-run after sr-assets.
//   KEEP      used in the rebuild (derived by tools/process-images.py)
//   REPLACE   its job is done another way (the Instagram PNG -> an inline SVG icon)
//   OPTIONAL  real client product photography not placed in this preview (kept for later pages)
//   REMOVE    not carried: promo flyers, the black-and-gold hero banners (owner's brief), Wix UI art
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const invFile = path.join(ROOT, 'audit', 'image-inventory.json');
const inv = JSON.parse(fs.readFileSync(invFile, 'utf8'));
const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'content', 'posts.json'), 'utf8')).posts;
const mid = (s) => (String(s).match(/([0-9a-f]{6}_[0-9a-f]{32})/) || [])[1] || null;

// media ids the build derives pictures from (tools/process-images.py)
const USED = {
  db1c73_a07a44f5be394617adcc43b3f59afd84: 'logo-sign-*.webp/png (the logo, resized only)',
  db1c73_fc9e782e424145b1adf4303b88a77470: 'favicon + apple-touch-icon',
  db1c73_cc22dca1b1874066b0a08b08c61048be: 'source composition for the social card og-flavors-detroit.jpg',
  '501c8b_5b00c7f3a6504c3e8a23d55e78e03cf0': 'cat-flower.webp (Flower jar)',
  '501c8b_ff786b5c14554e21831ec01588ee994a': 'cat-edibles.webp (Edibles jar)',
  '501c8b_32c3f240dd1b4494a9710eefcab2a3fd': 'learn-flower.webp',
  '501c8b_87670f69e1ae4d5595b6d14df184deab': 'learn-kief.webp',
  db1c73_b8ceacfccc724bf39d34787165d0c5f4: 'cat-concentrates.webp (Concentrates jar)',
  db1c73_7b9d6157a6014773acb51c17182242df: 'learn-concentrate-glass.webp',
  db1c73_1e5dcb88a436450386bbc115e44f2d03: 'learn-concentrate-jar.webp',
  db1c73_5a89d2d8e77041cd97ba6a96c7441324: 'learn-edible.webp',
};
const HERO_BANNERS = new Set(['db1c73_e54873781582443f99f348c36270b351', 'db1c73_ebad6abb1ca94a4b98dae6ec1176339e', 'db1c73_15a8d3203a114949be23d296fa3cb5f1']);
const INSTAGRAM = '501c8b_18f477349f1e41a2a4eae49422a89601';
const kindById = new Map();
for (const p of posts) for (const im of p.images || []) if (im.mediaId) kindById.set(mid(im.mediaId) || im.mediaId, im.kind);

const counts = {};
for (const im of inv.images) {
  const id = mid(im.src);
  let d, why;
  if (id && USED[id]) { d = 'KEEP'; why = 'Used in the rebuild: ' + USED[id] + '.'; }
  else if (id && HERO_BANNERS.has(id)) { d = 'REMOVE'; why = 'Home hero banner slide from the black-and-gold promotion; the owner\'s brief excludes that art. The sign-lit hero replaces it.'; }
  else if (id === INSTAGRAM) { d = 'REPLACE'; why = 'Instagram badge replaced by an inline SVG icon in the brand colours.'; }
  else if (/parastorage\.com/.test(im.src)) { d = 'REMOVE'; why = 'Wix editor UI art (frame/sprite), platform runtime.'; }
  else if (kindById.get(id) === 'flyer') { d = 'REMOVE'; why = 'Promotional flyer from a post. Its words are carried as text on the post page; the typographic post layout keeps every post on brand.'; }
  else if (kindById.get(id) === 'photo') { d = 'OPTIONAL'; why = 'Client product photograph from a post, not placed in this preview. Available for future product or category pages.'; }
  else if ((im.usedOn || []).some((u) => /flavorsdetroit\.com\/?$/.test(u))) { d = 'OPTIONAL'; why = 'Home page product photo (another crop of a kept photo or an unused category shot).'; }
  else { d = 'REMOVE'; why = 'Post image not carried: the post layout is typographic. Kept on disk in assets/source as evidence.'; }
  im.decision = d; im.decisionWhy = why; im.decidedBy = 'tools/image-decisions.mjs';
  counts[d] = (counts[d] || 0) + 1;
}
fs.writeFileSync(invFile, JSON.stringify(inv, null, 2));
console.log('images', inv.images.length, counts);
