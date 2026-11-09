#!/usr/bin/env node
// extract-posts.mjs — CONTENT lane: the captured Wix blog posts -> src/content/posts.json
//
// Reads the evidence (never writes it):
//   audit/raw/post-<slug>.html     the untouched server HTML of each post (the source of every word)
//   audit/site-inventory.json      file <-> live URL map (pages[].url / savedAs / status)
//   audit/content-inventory.json   sr-extract's flat bodyText per page (recall self-check only)
//   audit/pages/blog/text.txt      the rendered blog index (cross-check of titles, dates, read times)
//   audit/image-inventory.json     downloaded images (src, usedOn[], localFile, intrinsic size)
// Writes:
//   src/content/posts.json         { generated, count, posts[] }, newest first
//   src/content/posts.report.json  the self-check (recall per post, corrections, caseUnsure, gaps)
//
// Node builtins only, ESM. Re-runnable: it processes whatever post files exist when it runs
// (a background crawl may still be adding them).
//
//   node tools/extract-posts.mjs            write both files and print a summary
//   node tools/extract-posts.mjs --check    compute and print, write nothing
//
// Where the body lives: every post page has <section data-hook="post-description"> holding the
// Ricos viewer <div data-id="content-viewer">. Inside it each block is a <div data-breakout="...">
// wrapper followed by a marker <div type="paragraph|heading|image|gallery|..." data-hook="rcv-blockN">
// naming the block's type. Header (title, author, date, read time) is outside it; share buttons,
// stats, "Recent Posts" and comments are in the <footer data-hook="post-footer"> after it.
//
// Display text (`text`, `title`, `seoTitle`, captions, link text/href) differs from the verbatim
// original only by the three owner-approved corrections, each logged in the post's corrections[]:
//   address  5730 E 8 Mile (any spacing/punctuation/case) -> 5700 (street number only)
//   portal   flavors-detroit.kushcart.us (href or visible) -> https://flavors-detroit.portal42.com/
//   case     ALL-CAPS copy -> sentence case, words unchanged (see caseFix below)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const relPath = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const ARGV = new Set(process.argv.slice(2));
const WRITE = !ARGV.has('--check');
const CASE_DEBUG = ARGV.has('--case-debug'); // print every ALL-CAPS word decision (rule + output), grouped
const caseTrace = new Map();

const RAW_DIR = path.join(ROOT, 'audit', 'raw');
const SITE_INV = path.join(ROOT, 'audit', 'site-inventory.json');
const CONTENT_INV = path.join(ROOT, 'audit', 'content-inventory.json');
const BLOG_TEXT = path.join(ROOT, 'audit', 'pages', 'blog', 'text.txt');
const IMAGE_INV = path.join(ROOT, 'audit', 'image-inventory.json');
const OUT_DIR = path.join(ROOT, 'src', 'content');
const OUT_POSTS = path.join(OUT_DIR, 'posts.json');
const OUT_REPORT = path.join(OUT_DIR, 'posts.report.json');

const ORIGIN = 'https://www.flavorsdetroit.com';
const PORTAL_URL = 'https://flavors-detroit.portal42.com/';
const TZ = 'America/Detroit';
const RECALL_FLOOR = 0.95;
const EXCERPT_MAX = 170;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const inputProblems = [];
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { inputProblems.push({ file: relPath(file), error: e.message }); return null; }
}
function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch (e) { inputProblems.push({ file: relPath(file), error: e.message }); return null; }
}

// ───────────────────────────── HTML: entities, a tiny element parser, tree helpers ─────────────

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', bull: '•', middot: '·', copy: '©',
  reg: '®', trade: '™', deg: '°', cent: '¢', pound: '£', euro: '€', times: '×',
  frac12: '½', frac14: '¼', frac34: '¾', eacute: 'é', Eacute: 'É', egrave: 'è',
  aacute: 'á', ntilde: 'ñ', iacute: 'í', oacute: 'ó', uacute: 'ú', uuml: 'ü', shy: '­',
};
const unknownEntities = new Set();
function decodeEntities(s) {
  if (!s || s.indexOf('&') < 0) return s;
  return s.replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|[A-Za-z][A-Za-z0-9]*);/g, (m, e) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return String.fromCodePoint(cp); } catch { return m; }
    }
    if (Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, e)) return NAMED_ENTITIES[e];
    unknownEntities.add(e);
    return m;
  });
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW_TEXT_TAGS = new Set(['script', 'style', 'textarea', 'title', 'noscript', 'template']);

function parseAttrs(src) {
  const attrs = {};
  const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(src))) attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  return attrs;
}

/** Parses the one element whose open tag starts at html[start] ('<'), up to its matching close tag. */
function parseElementAt(html, start) {
  if (start < 0) return null;
  const re = /<!--[\s\S]*?-->|<\/([A-Za-z][\w:-]*)\s*>|<([A-Za-z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|[^<]+|</g;
  re.lastIndex = start;
  const root = { tag: '#root', attrs: {}, children: [], parent: null };
  const stack = [root];
  let m;
  while ((m = re.exec(html))) {
    const top = stack[stack.length - 1];
    if (m[0].startsWith('<!--')) continue;
    if (m[1] !== undefined) {
      const tag = m[1].toLowerCase();
      let i = stack.length - 1;
      while (i > 0 && stack[i].tag !== tag) i--;
      if (i > 0) stack.length = i;
      if (stack.length === 1) break;
      continue;
    }
    if (m[2] !== undefined) {
      const tag = m[2].toLowerCase();
      let attrSrc = m[3] || '';
      const selfClose = /\/\s*$/.test(attrSrc);
      if (selfClose) attrSrc = attrSrc.replace(/\/\s*$/, '');
      const node = { tag, attrs: parseAttrs(attrSrc), children: [], parent: top };
      top.children.push(node);
      if (VOID_TAGS.has(tag) || selfClose) { if (stack.length === 1) break; continue; }
      if (RAW_TEXT_TAGS.has(tag)) {
        const endRe = new RegExp('</' + tag + '\\s*>', 'ig');
        endRe.lastIndex = re.lastIndex;
        const em = endRe.exec(html);
        node.children.push({ text: html.slice(re.lastIndex, em ? em.index : html.length), raw: true, parent: node });
        re.lastIndex = em ? endRe.lastIndex : html.length;
        continue;
      }
      stack.push(node);
      continue;
    }
    top.children.push({ text: decodeEntities(m[0]), parent: top });
  }
  return root.children[0] || null;
}

const isEl = (n) => !!n && n.tag !== undefined;
function walk(n, fn) {
  if (fn(n) === false) return;
  if (n.children) for (const c of n.children) walk(c, fn);
}
function findFirst(n, pred) {
  let hit = null;
  walk(n, (x) => { if (hit) return false; if (isEl(x) && pred(x)) { hit = x; return false; } return true; });
  return hit;
}
function findAll(n, pred) {
  const out = [];
  walk(n, (x) => { if (isEl(x) && pred(x)) out.push(x); });
  return out;
}
const hookOf = (n) => (n && n.attrs && n.attrs['data-hook']) || '';
const hookRe = (n, re) => re.test(hookOf(n));
function hasAncestor(n, stopAt, pred) {
  for (let p = n.parent; p && p !== stopAt; p = p.parent) if (pred(p)) return true;
  return false;
}
const SKIP_TEXT_TAGS = new Set(['svg', 'script', 'style', 'noscript', 'template', 'button', 'video', 'audio', 'img', 'iframe', 'picture', 'source', 'canvas']);
function textOf(n) {
  let s = '';
  walk(n, (x) => {
    if (!isEl(x)) { if (!x.raw) s += x.text; return true; }
    if (x.tag === 'br') { s += '\n'; return true; }
    return !SKIP_TEXT_TAGS.has(x.tag);
  });
  return s;
}
const squash = (s) => (s || '').replace(/\s+/g, ' ').trim();

/** The element carrying `needle` (an attribute string), parsed; searched from `from`. */
function elementWith(html, needle, from = 0) {
  const i = html.indexOf(needle, from);
  if (i < 0) return null;
  return parseElementAt(html, html.lastIndexOf('<', i));
}

// ───────────────────────────── inline text as segments (plain runs + links) ──────────────────────

const BLOCKISH = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'tr', 'figcaption']);
let linkSeq = 0;

/** Text of `el` as [{text, link:null|{id,href}}], <br> -> "\n", nested blocks separated by "\n", trimmed. */
function segmentsOf(el, skip) {
  const segs = [];
  // A bold lead-in followed directly by more text with no space ("<strong>Premium Flower</strong>
  // <span>For the classic…</span>") renders glued on the live site. Insert a line break at that
  // boundary: formatting only, the words are unchanged.
  let afterBold = false;
  const push = (text, link) => {
    if (!text) return;
    const last = segs[segs.length - 1];
    if (afterBold && last && /\S$/.test(last.text) && /^[A-Z0-9$]/.test(text)) text = '\n' + text;
    afterBold = false;
    if (last && last.link === link) last.text += text;
    else segs.push({ text, link });
  };
  const atBreak = () => !segs.length || /\n$/.test(segs[segs.length - 1].text);
  const rec = (n, link) => {
    if (!isEl(n)) { if (!n.raw) push(n.text, link); return; }
    if (skip && skip(n)) return;
    if (n.tag === 'br') { push('\n', link); return; }
    if (SKIP_TEXT_TAGS.has(n.tag)) return;
    const blockish = n !== el && (BLOCKISH.has(n.tag) || n.attrs['data-ricos-paragraph'] !== undefined);
    if (blockish && !atBreak()) push('\n', link);
    let l = link;
    if (n.tag === 'a' && n.attrs.href !== undefined) l = { id: ++linkSeq, href: n.attrs.href };
    for (const c of n.children) rec(c, l);
    if (blockish && !atBreak()) push('\n', link);
    if (n.tag === 'strong' || n.tag === 'b') afterBold = true;
  };
  rec(el, null);
  return trimSegs(segs);
}
const EDGE_WS_START = /^[\s​]+/;
const EDGE_WS_END = /[\s​]+$/;
function trimSegs(segs) {
  const out = segs.map((s) => ({ text: s.text, link: s.link }));
  while (out.length && !out[0].text.replace(EDGE_WS_START, '')) out.shift();
  if (out.length) out[0].text = out[0].text.replace(EDGE_WS_START, '');
  while (out.length && !out[out.length - 1].text.replace(EDGE_WS_END, '')) out.pop();
  if (out.length) out[out.length - 1].text = out[out.length - 1].text.replace(EDGE_WS_END, '');
  return out;
}
const segText = (segs) => segs.map((s) => s.text).join('');
function segLinks(segs) {
  const byId = new Map();
  for (const s of segs) {
    if (!s.link) continue;
    const cur = byId.get(s.link.id);
    if (cur) cur.text += s.text; else byId.set(s.link.id, { text: s.text, href: s.link.href });
  }
  return [...byId.values()].map((l) => ({ text: l.text.replace(EDGE_WS_START, '').replace(EDGE_WS_END, ''), href: l.href }));
}

// ───────────────────────────── media ids ─────────────────────────────────────────────────────────

/** Wix media id ("db1c73_<32 hex>~mv2.jpg", older "..~mv2_d_2340_2811_s_2.jpg") from an id, uri or URL. */
function mediaIdOf(s) {
  if (!s) return null;
  let v = String(s);
  try { v = decodeURIComponent(v); } catch { /* keep as is */ }
  const m = v.match(/\/media\/([^/?#\s]+)/);
  if (m) v = m[1];
  const id = v.match(/^([A-Za-z0-9]+_[0-9a-f]{20,}(?:~mv2)?(?:_[A-Za-z0-9_]+)?\.[A-Za-z0-9]+)$/);
  return id ? id[1] : null;
}
/** Wix crop transform ("/v1/crop/x_0,y_464,w_1774,h_161/") -> {x,y,w,h} | null. */
function cropOf(url) {
  const m = (url || '').match(/\/v1\/crop\/x_(\d+),y_(\d+),w_(\d+),h_(\d+)\//);
  return m ? { x: +m[1], y: +m[2], w: +m[3], h: +m[4] } : null;
}
const cropKey = (id, c) => `${id}|${c.x},${c.y},${c.w},${c.h}`;

// ───────────────────────────── one post: metadata ─────────────────────────────────────────────────

function headMeta(html) {
  const headEnd = html.indexOf('</head>');
  const head = headEnd > 0 ? html.slice(0, headEnd) : html.slice(0, 400000);
  const meta = {};
  for (const m of head.matchAll(/<meta\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)) {
    const a = parseAttrs(m[1].replace(/\/\s*$/, ''));
    const k = a.property || a.name || a.itemprop;
    if (k && a.content !== undefined && !(k in meta)) meta[k] = a.content;
  }
  const titleM = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  let canonical = null;
  for (const m of head.matchAll(/<link\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)) {
    const a = parseAttrs(m[1].replace(/\/\s*$/, ''));
    if ((a.rel || '').toLowerCase() === 'canonical' && a.href) { canonical = a.href; break; }
  }
  const blogPostings = [];
  const ldErrors = [];
  for (const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let j;
    try { j = JSON.parse(m[1]); } catch (e) { ldErrors.push(e.message); continue; }
    const stack = [j];
    while (stack.length) {
      const o = stack.pop();
      if (Array.isArray(o)) { stack.push(...o); continue; }
      if (!o || typeof o !== 'object') continue;
      const t = o['@type'];
      if (t === 'BlogPosting' || (Array.isArray(t) && t.includes('BlogPosting'))) blogPostings.push(o);
      if (o['@graph']) stack.push(o['@graph']);
    }
  }
  return { meta, title: titleM ? squash(decodeEntities(titleM[1])) : null, canonical, blogPosting: blogPostings[0] || null, ldErrors };
}

function toISO(v) {
  if (!v || typeof v !== 'string') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
const DETROIT_PARTS = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric' });
function detroitYMD(iso) {
  const p = Object.fromEntries(DETROIT_PARTS.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day };
}
/** Live header label "Aug 30, 2020" | "Oct 11" (current-year posts omit the year) -> parts. */
function parseLiveDate(label) {
  const m = (label || '').trim().match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:,\s*(\d{4}))?$/);
  if (!m) return null;
  return { m: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(m[1]) + 1, d: +m[2], y: m[3] ? +m[3] : null };
}

// ───────────────────────────── one post: body blocks ──────────────────────────────────────────────

const MARKER_TO_T = { paragraph: 'p', heading: 'h', bulleted_list: 'ul', numbered_list: 'ol', ordered_list: 'ol', divider: 'hr', image: 'image', gallery: 'gallery', video: 'video', button: 'button', table: 'table', 'empty-line': 'empty' };

function markerAfter(w) {
  const sibs = w.parent ? w.parent.children : [];
  for (let i = sibs.indexOf(w) + 1; i < sibs.length; i++) {
    const s = sibs[i];
    if (!isEl(s)) continue;
    if (/^rcv-block/.test(hookOf(s))) return s.attrs.type || null;
    if (s.attrs['data-breakout'] !== undefined) return null;
  }
  return null;
}

function classify(w) {
  if (findFirst(w, (n) => n.tag === 'table')) return 'table';
  if (findFirst(w, (n) => hookRe(n, /\bgallery-viewer\b/))) return 'gallery';
  if (findFirst(w, (n) => hookRe(n, /\bfigure-VIDEO\b/) || n.tag === 'video' || n.tag === 'iframe')) return 'video';
  if (findFirst(w, (n) => hookRe(n, /\bfigure-IMAGE\b|^image-viewer\b/) || n.tag === 'wow-image')) return 'image';
  if (findFirst(w, (n) => hookRe(n, /\bdivider\b/) || n.tag === 'hr')) return 'hr';
  if (findFirst(w, (n) => hookRe(n, /\bbutton-viewer\b/))) return 'button';
  const first = findFirst(w, (n) => /^(h[1-6]|ul|ol|p|blockquote|pre)$/.test(n.tag) || n.attrs['data-ricos-paragraph'] !== undefined);
  if (!first) return textOf(w).trim() ? 'other' : 'empty';
  if (/^h[1-6]$/.test(first.tag)) return 'h';
  if (first.tag === 'ul' || first.tag === 'ol') return first.tag;
  if (first.tag === 'p' || first.tag === 'blockquote' || first.tag === 'pre') return 'p';
  return textOf(first).trim() ? 'p' : 'empty';
}

const HEADING_MAP = { h1: 'h2', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h4', h6: 'h4' };

function imageFromNode(node, source, galleryId) {
  const wow = findFirst(node, (n) => n.tag === 'wow-image');
  const img = findFirst(node, (n) => n.tag === 'img');
  let info = null;
  if (wow && wow.attrs['data-image-info']) { try { info = JSON.parse(wow.attrs['data-image-info']); } catch { info = null; } }
  const mediaId = mediaIdOf(wow && wow.attrs.id) || mediaIdOf(info && info.imageData && info.imageData.uri) || mediaIdOf(img && img.attrs['data-pin-media']) || mediaIdOf(img && img.attrs.src);
  let dw = info && info.imageData ? +info.imageData.width || null : null;
  let dh = info && info.imageData ? +info.imageData.height || null : null;
  if (!dw && img && img.attrs.width) dw = +img.attrs.width || null;
  if (!dh && img && img.attrs.height) dh = +img.attrs.height || null;
  const cap = findFirst(node, (n) => n.tag === 'figcaption');
  const link = node.tag === 'a' && node.attrs.href !== undefined ? node : findFirst(node, (n) => n.tag === 'a' && n.attrs.href !== undefined);
  const transformUrl = [wow && wow.attrs.id, img && img.attrs['data-pin-media'], img && img.attrs.src].find((u) => /\/v1\//.test(u || '')) || null;
  return {
    mediaId,
    crop: cropOf(transformUrl),
    alt: img ? (img.attrs.alt ?? '') : '',
    declaredW: dw,
    declaredH: dh,
    captionSegs: cap ? segmentsOf(cap) : null,
    hrefOriginal: link ? link.attrs.href : null,
    source,
    galleryId: galleryId || null,
    fallbackSrc: img ? (img.attrs['data-pin-media'] || img.attrs.src || null) : null,
  };
}

function extractBody(viewer) {
  const blocks = []; // { t, segs } | { t:'ul'|'ol', items:[{segs, level}] } | { t:'table', rows:[[{segs}]] } | { t:'hr' }
  const images = [];
  const videos = [];
  const notes = { types: {}, markerMismatch: [], other: [], multiLeaf: [], headingDemotions: [], emptySkipped: 0 };
  let wrappers = findAll(viewer, (n) => n.attrs['data-breakout'] !== undefined && !hasAncestor(n, viewer, (p) => p.attrs && p.attrs['data-breakout'] !== undefined));
  if (!wrappers.length) wrappers = viewer.children.filter(isEl);
  for (const w of wrappers) {
    const kind = classify(w);
    const marker = markerAfter(w);
    notes.types[kind] = (notes.types[kind] || 0) + 1;
    const markerT = marker ? (MARKER_TO_T[marker] || marker) : null;
    const kindT = ['ul', 'ol'].includes(kind) ? kind : kind;
    if (markerT && markerT !== kindT && !(markerT === 'p' && kindT === 'empty') && !(markerT === 'empty' && kindT === 'p')) {
      notes.markerMismatch.push({ marker, detected: kind, text: squash(textOf(w)).slice(0, 80) });
    }
    const at = blocks.length;
    if (kind === 'empty') { notes.emptySkipped++; continue; }
    if (kind === 'p' || kind === 'h' || kind === 'other') {
      // every outermost paragraph/heading in the wrapper is its own block (a "layout" or quote may hold several)
      const isLeaf = (n) => /^(h[1-6]|p|blockquote|pre)$/.test(n.tag) || n.attrs['data-ricos-paragraph'] !== undefined;
      let leaves = findAll(w, isLeaf).filter((n) => !hasAncestor(n, w, isLeaf));
      if (!leaves.length) leaves = [w];
      let emitted = 0;
      for (const el of leaves) {
        const segs = segmentsOf(el);
        if (!segText(segs)) continue;
        if (/^h[1-6]$/.test(el.tag)) {
          const t = HEADING_MAP[el.tag];
          if (t !== el.tag) notes.headingDemotions.push({ from: el.tag, to: t, text: segText(segs).slice(0, 60) });
          blocks.push({ t, segs });
        } else blocks.push({ t: 'p', segs });
        emitted++;
      }
      if (!emitted) { notes.emptySkipped++; continue; }
      if (kind === 'other') notes.other.push({ marker, text: squash(textOf(w)).slice(0, 80) });
      if (emitted > 1) notes.multiLeaf.push({ marker, blocks: emitted, text: squash(textOf(w)).slice(0, 80) });
    } else if (kind === 'ul' || kind === 'ol') {
      const list = findFirst(w, (n) => n.tag === 'ul' || n.tag === 'ol');
      const items = [];
      const addItems = (lst, depth) => {
        for (const li of lst.children.filter((c) => isEl(c) && c.tag === 'li')) {
          const segs = segmentsOf(li, (n) => n !== li && (n.tag === 'ul' || n.tag === 'ol'));
          const lvl = +li.attrs['aria-level'] || depth;
          if (segText(segs)) items.push(lvl > 1 ? { segs, level: lvl } : { segs });
          for (const sub of li.children.filter((c) => isEl(c) && (c.tag === 'ul' || c.tag === 'ol'))) addItems(sub, depth + 1);
          for (const sub of findAll(li, (n) => n !== li && (n.tag === 'ul' || n.tag === 'ol') && !hasAncestor(n, li, (p) => p.tag === 'ul' || p.tag === 'ol')).filter((s) => s.parent !== li)) addItems(sub, depth + 1);
        }
      };
      addItems(list, 1);
      if (items.length) blocks.push({ t: list.tag, items }); else notes.emptySkipped++;
    } else if (kind === 'table') {
      const rows = [];
      for (const tr of findAll(w, (n) => n.tag === 'tr')) {
        const cells = tr.children.filter((c) => isEl(c) && (c.tag === 'td' || c.tag === 'th')).map((td) => ({ segs: segmentsOf(td) }));
        if (cells.some((c) => segText(c.segs))) rows.push(cells);
      }
      if (rows.length) blocks.push({ t: 'table', rows }); else notes.emptySkipped++;
    } else if (kind === 'hr') {
      blocks.push({ t: 'hr' });
    } else if (kind === 'button') {
      const a = findFirst(w, (n) => hookRe(n, /\bbutton-viewer\b/));
      const segs = segmentsOf(a);
      // the button IS a link: make the whole label one link segment
      const label = segText(segs);
      if (!label) { notes.emptySkipped++; continue; }
      blocks.push({ t: 'p', button: true, segs: [{ text: label, link: { id: ++linkSeq, href: a.attrs.href ?? '' } }] });
    } else if (kind === 'gallery') {
      const gid = (findFirst(w, (n) => /^viewer-/.test(n.attrs.id || '')) || {}).attrs?.id || null;
      for (const cell of findAll(w, (n) => hookRe(n, /\bgallery-media-cell\b/))) images.push({ ...imageFromNode(cell, 'gallery', gid), afterBlock: at });
    } else if (kind === 'image') {
      const fig = findFirst(w, (n) => hookRe(n, /\bfigure-IMAGE\b/)) || w;
      images.push({ ...imageFromNode(fig, 'image'), afterBlock: at });
    } else if (kind === 'video') {
      for (const v of findAll(w, (n) => n.tag === 'video' || n.tag === 'iframe')) {
        const src = v.attrs.src || (findFirst(v, (n) => n.tag === 'source') || { attrs: {} }).attrs.src || null;
        const rec = { src, afterBlock: at };
        if (v.attrs.poster) rec.poster = v.attrs.poster;
        if (v.tag === 'iframe') rec.embed = true;
        videos.push(rec);
      }
    }
  }
  return { blocks, images, videos, notes };
}

// ───────────────────────────── corrections 1 + 2: address, portal ────────────────────────────────

// (?<!\d) not \b: the source glues "Flavors Detroit5730 E. 8 Mile Rd." in one post
const ADDRESS_RE = /(?<!\d)5730(\s*,?\s*(?:E\.?|East)?\s*,?\s*8\s*-?\s*Mile)/gi;
const PORTAL_TEXT_RE = /(?:https?:\/\/)?(?:www\.)?flavors-detroit\.kushcart\.us(?:\/[^\s"'<>]*)?/gi;

function fixAddress(text, log, where) {
  return text.replace(ADDRESS_RE, (m, tail) => {
    log.push({ what: 'address', from: m, to: '5700' + tail, where });
    return '5700' + tail;
  });
}
function fixPortalText(text, log, where) {
  return text.replace(PORTAL_TEXT_RE, (m) => {
    const trail = (m.match(/[.,;:!?)\]]+$/) || [''])[0];
    const core = trail ? m.slice(0, -trail.length) : m;
    log.push({ what: 'portal', from: core, to: PORTAL_URL, where });
    return PORTAL_URL + trail;
  });
}
function fixPortalHref(href, log, where) {
  if (href && /flavors-detroit\.kushcart\.us/i.test(href)) {
    log.push({ what: 'portal', from: href, to: PORTAL_URL, where });
    return PORTAL_URL;
  }
  return href;
}

// ───────────────────────────── correction 3: ALL-CAPS -> sentence case ───────────────────────────
//
// A unit (block, list item, table cell, caption, title) is ALL-CAPS when it has >= 3 letter-words
// and >= 80% of its letters are upper case (URLs, domains, e-mails, #tags and @handles excluded).
// Such a unit is lower-cased word by word and the first word of each sentence is capitalised; the
// casing of names is restored from evidence in the rest of the post corpus — every non-ALL-CAPS unit
// of every post, where C = times a word is written Capitalised/mixed mid-sentence and L = times it is
// written lower-case mid-sentence. Per word, the first rule that applies:
//   protected token (URL, domain, e-mail, #tag, @handle) ............................ kept as written
//   acronym whitelist (THC, CBD, OG, BOGO, PB&J, TGIF, MI, AM, PM, ...) .............. kept upper case
//   unit tokens (G, OZ, MG, ...) and tokens with a digit (3.5G, 28G, 4/20) ........... kept as written
//     (ordinals 1ST/2ND/3RD/4TH -> 1st/2nd/3rd/4th)
//   part of a multi-word name written in Title/mixed case elsewhere ("Royal High") .... that casing
//   month / weekday name ("MAY" only when next to a number) .......................... capitalised
//   built-in common English / retail word (COMMON below) ............................. lower case
//   C > 0 and L = 0 (only ever written capitalised: Detroit, Swisher, strain names) .. that casing
//   L > 0 and (C = 0 or L >= 60% of L + C) ............................................ lower case
//   anything else (no evidence, or written both ways) .............................. KEPT AS WRITTEN
//                                                                   and listed in the report's caseUnsure
// A multi-word name is a run of 2-4 adjacent capitalised words in a non-ALL-CAPS unit that contains
// no function word and at least one word that is not common (not in COMMON, not mostly lower-case).

const ACRONYMS = new Set(['THC', 'CBD', 'CBG', 'CBN', 'OG', 'BOGO', 'LR', 'HCFSE', 'RSO', 'PB&J', 'TGIF', 'ID', 'MI', 'AM', 'PM', 'USA', 'DJ', 'G']);
const UNITS = new Set(['G', 'OZ', 'MG', 'ML', 'LB', 'LBS', 'GR', 'KG', 'GS']);
// letters glued after a number that stay with it ("120MG", "10AM", "4TH", "3.5G"); longer runs split for casing only
const GLUED_SUFFIX = /^(?:ST|ND|RD|TH|AM|PM|G|GS|GR|OZ|MG|ML|LB|LBS|KG|K|X|PK|CT|S|D|H|HR|HRS|MIN|MM)$/i;
const BUILTIN_PROPER = new Map(['january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((w) => [w, w[0].toUpperCase() + w.slice(1)]));
const FUNCTION_WORDS = new Set(`a an the and or nor but for of at in on to by from with as into onto upon off is are was were be been am do does
our your my his her its their this that these those it we you they i me us them all any every each per plus vs n`.trim().split(/\s+/));
// Plain English and retail/cannabis-category vocabulary, never a name on its own in this corpus.
// Deliberately excludes flavour, colour, food and animal words (they double as strain names) and
// brand words (Flavors, Connoisseur, ...). A name made of common words is still restored when it
// appears in Title case elsewhere (the multi-word name rule runs first).
const COMMON = new Set(`
a about above across after again against ahead all almost along already also although always among an and another any anyone
anything anywhere are around as at away back be because before behind below between beyond both but by can could did do does
doing done don't down during each either else enough even ever every everybody everyone everything everywhere except few for from
here how however if in inside instead into is isn't it it's its just least less like many more most much near never next no none
nor not now of off on once only onto or other others our ours out outside over own per plus rather same several should since so
some someone something sometimes somewhere soon still such than that the their theirs them then there these they this those though
through till to together too toward towards under unless until up upon very via was we were what whatever when where whether which
while who whole whose why will with within without would yet you your yours he she him her his hers me my mine us i i'm i'll
add ask become begin believe bring bringing buy call carry catch celebrate celebrating change check choose come comes coming cut
deliver drop drops dropped dropping eat end ending ends enjoy enter feel find finish get gets getting give gives go goes going gone
got grab had has have having hear help hit hold hook join keep kick know last learn leave let let's lets load loaded loading look
looking love made make makes making meet miss must need open order ordering ordered pay pick picked picks play prepare pull put
reach read receive relax reload remember rest restock restocked return roll run save saved saves say see seen sell sells serve
served set share shop shopping show sign smoke spend stack stacked start started starting stay staying stock stocked stocking stop
take taking talk tell thank thanks think try turn unwind upgrade use used visit wait walk want watch wear welcome went win wish work
amazing available awesome bad best better big bigger biggest cheap classic cool crazy daily dark early easier easiest easy epic
exclusive extra famous fast fine free fresh full fully good grand great happy hard heavy high higher highest hot huge incredible
insane large late latest limited little long loud low lower lowest major massive mellow mild new newest nice old only perfect
plenty popular premium prepacked prepack pre-packed pure quick ready real right select short simple single small smooth soft
special strong sure tasty top total true ultimate unbeatable unique usual whole wild wonderful
accessories address age amount bag bags bar bars batch bit box bucket buckets bud buds bundle bundles business card cart carts
cartridge cartridges case cash category celebration chance choice choices city class code collection community concentrate
concentrates cost costs customer customers day days deal deals delivery details discount discounts dispensary door doors dose
dosed edible edibles effect effects energy event events experience extract extracts family fan fans favorite favorites flower
flowers food friend friends fun gear gift gifts gram grams group guest guests half holiday holidays home hour hours idea info
information inventory item items joint joints kind kinds lab level life limit line lineup list location lot lots market member
members menu minute minutes moment money month months morning name news night nights note number offer offers orders ounce ounces
pack package packages packs pair part party patient patients people person piece pickup place plan point points pre-roll
pre-rolls preroll prerolls price prices pricing product products promo promos promotion promotions quality quantity question
reason reasons rewards room round rule sale sales savings season selection service set shake shelf show side size sizes special
specials spot staff state stock store strain strains strength stuff style supply supplies support taste team texture textures
thing things threads time times tip tips today tomorrow tonight treat treats type types update updates value variety vape vapes
vibe vibes view way week weekend weekends weeks year years safety stuffer stocking curbside tel
shatter budder crumble wax beeswax sauce rosin hash kief distillate resin moonrock moonrocks tarantula tarantulas blunt blunts disposable
disposables pen pens battery batteries gummy gummies chocolate chocolates drink drinks tincture tinctures topical topicals capsule
capsules eighth eighths quarter quarters indica sativa hybrid terpene terpenes infused live online cannabis weed marijuana
glass bong bongs pipe pipes rig rigs dab dabs grinder grinders lighter lighters paper papers cone cones tray trays
opening sneak peek arrival arrivals
one two three four five six seven eight nine ten first second third double triple
`.trim().split(/\s+/));
const ABBREV_BEFORE_DOT = new Set(['E', 'W', 'N', 'S', 'RD', 'ST', 'AVE', 'BLVD', 'DR', 'MR', 'MRS', 'MS', 'VS', 'OZ', 'LB', 'LBS', 'GR', 'MG', 'JR', 'SR', 'MT', 'FT', 'NO', 'CHOC', 'APPROX', 'EST']);

const PROTECTED_RE = /https?:\/\/[^\s]+|www\.[^\s]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|[#@][\p{L}\p{N}_]+|[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.(?:com|net|org|us|io|co|info|biz|app|me)\b(?:\/[^\s]*)?/giu;
const WORD_RE = /[\p{L}\p{N}]+(?:['’&.\-/][\p{L}\p{N}]+)*/gu;
const hasLetter = (s) => /\p{L}/u.test(s);
const hasDigit = (s) => /\p{N}/u.test(s);
const keyOf = (s) => s.toLowerCase().replace(/’/g, "'");

/** Word tokens of `str` with sentence-initial flags ("$35PLATINUM" is cased as "35" + "PLATINUM"). */
function tokenize(str) {
  const prot = [];
  for (const m of str.matchAll(PROTECTED_RE)) prot.push([m.index, m.index + m[0].length]);
  const toks = [];
  for (const m of str.matchAll(WORD_RE)) {
    const s = m.index;
    const e = s + m[0].length;
    const isProt = prot.some(([a, b]) => s < b && e > a);
    const glued = !isProt && m[0].match(/^(\p{N}[\p{N}.,]*)(\p{L}{2,})$/u);
    if (glued && !GLUED_SUFFIX.test(glued[2])) {
      toks.push({ s, e: s + glued[1].length, v: glued[1], prot: false });
      toks.push({ s: s + glued[1].length, e, v: glued[2], prot: false, glued: true });
      continue;
    }
    toks.push({ s, e, v: m[0], prot: isProt });
  }
  for (let i = 0; i < toks.length; i++) {
    if (i === 0) { toks[i].initial = true; continue; }
    const gap = str.slice(toks[i - 1].e, toks[i].s);
    const prevUp = toks[i - 1].v.toUpperCase();
    const enders = /[!?…]|\.(?=\s|$)|\n/.test(gap);
    const abbrevDot = /^\.\s+$/.test(gap) && ABBREV_BEFORE_DOT.has(prevUp);
    toks[i].initial = enders && !abbrevDot;
  }
  return toks;
}
function letterWords(toks) { return toks.filter((t) => !t.prot && hasLetter(t.v)); }
function isAllCaps(str) {
  const words = letterWords(tokenize(str));
  if (words.length < 3) return false;
  let up = 0; let all = 0;
  for (const w of words) for (const ch of w.v) { if (/\p{L}/u.test(ch)) { all++; if (ch !== ch.toLowerCase() && ch === ch.toUpperCase()) up++; } }
  return all > 0 && up / all >= 0.8;
}
function formOf(v) {
  const letters = v.replace(/[^\p{L}]/gu, '');
  if (!letters) return 'none';
  if (letters === letters.toLowerCase()) return 'lower';
  if (letters === letters.toUpperCase()) return letters.length >= 2 ? 'upper' : 'cap';
  const first = letters[0];
  if (first === first.toUpperCase() && letters.slice(1) === letters.slice(1).toLowerCase()) return 'cap';
  return 'mixed';
}
/** Apply the case pattern of `pattern` (same letters) onto `tok`, char by char; null if lengths differ. */
function withCasing(tok, pattern) {
  if (!pattern || pattern.length !== tok.length) return null;
  let out = '';
  for (let i = 0; i < tok.length; i++) {
    const p = pattern[i];
    const c = p !== p.toLowerCase() ? tok[i].toUpperCase() : tok[i].toLowerCase();
    out += c.length === 1 ? c : tok[i];
  }
  return out;
}
function lowerSame(tok) { let o = ''; for (const ch of tok) { const l = ch.toLowerCase(); o += l.length === ch.length ? l : ch; } return o; }
function capFirst(tok) { const i = tok.search(/\p{L}/u); if (i < 0) return tok; const u = tok[i].toUpperCase(); return u.length === 1 ? tok.slice(0, i) + u + tok.slice(i + 1) : tok; }

class CaseEvidence {
  constructor() { this.words = new Map(); this.names = new Map(); this.acceptedNames = null; }
  w(key) { let e = this.words.get(key); if (!e) { e = { L: 0, C: 0, U: 0, forms: new Map() }; this.words.set(key, e); } return e; }
  get(key) { return this.words.get(key) || { L: 0, C: 0, U: 0, forms: new Map() }; }
  /** Learn from one non-ALL-CAPS unit. */
  learn(str) {
    const all = tokenize(str);
    for (const t of all) {
      if (t.prot || !/^\p{L}/u.test(t.v)) continue;
      const f = formOf(t.v);
      const e = this.w(keyOf(t.v));
      if (f === 'mixed') { e.forms.set(t.v, (e.forms.get(t.v) || 0) + 1); e.C++; continue; }
      if (t.initial) continue;
      if (f === 'lower') e.L++;
      else if (f === 'upper') e.U++;
      else if (f === 'cap') { e.forms.set(t.v, (e.forms.get(t.v) || 0) + 1); e.C++; }
    }
    // names: runs of >= 2 adjacent capitalised/mixed words (short upper tokens like OG may join a run)
    let run = [];
    const flush = () => {
      if (run.length >= 2 && run.some((t) => ['cap', 'mixed'].includes(formOf(t.v)))) {
        for (let a = 0; a < run.length; a++) for (let b = a + 2; b <= Math.min(run.length, a + 4); b++) {
          const seq = run.slice(a, b);
          const k = seq.map((t) => keyOf(t.v)).join(' ');
          let n = this.names.get(k);
          if (!n) { n = new Map(); this.names.set(k, n); }
          const forms = seq.map((t) => t.v).join(' ');
          n.set(forms, (n.get(forms) || 0) + 1);
        }
      }
      run = [];
    };
    for (let i = 0; i < all.length; i++) {
      const t = all[i];
      const f = formOf(t.v);
      const ok = !t.prot && !t.glued && /^\p{L}/u.test(t.v) && (f === 'cap' || f === 'mixed' || (f === 'upper' && t.v.length <= 4));
      const adjacent = run.length && /^[  ]$/.test(str.slice(all[i - 1].e, t.s));
      if (ok && (run.length === 0 || adjacent)) run.push(t);
      else { flush(); if (ok) run.push(t); }
    }
    flush();
  }
  /** Common = in COMMON, or written lower-case at least 60% of the time it appears mid-sentence. */
  isCommon(key) { const e = this.get(key); return COMMON.has(key) || (e.L > 0 && e.L / (e.L + e.C) >= 0.6); }
  bestForm(key) {
    const e = this.get(key);
    if (!e.forms.size) return null;
    return [...e.forms.entries()].sort((a, b) => b[1] - a[1] || (formOf(a[0]) === 'cap' ? -1 : 1))[0][0];
  }
  /** Accepted multi-word names, longest first. */
  finalizeNames() {
    const out = [];
    for (const [k, forms] of this.names) {
      const keys = k.split(' ');
      if (keys.some((x) => FUNCTION_WORDS.has(x))) continue; // "Fire At Flavors" is a title-case line, not a name
      if (!keys.some((x) => !this.isCommon(x))) continue; // all-common runs ("Order Online") are not names
      const best = [...forms.entries()].sort((a, b) => b[1] - a[1])[0][0];
      out.push({ keys, forms: best.split(' '), seen: [...forms.values()].reduce((a, n) => a + n, 0) });
    }
    out.sort((a, b) => b.keys.length - a.keys.length || b.seen - a.seen);
    this.acceptedNames = out;
    return out;
  }
}

/** Word i of an ALL-CAPS unit -> { v: new token, rule, unsure?: reason }. */
function decideWord(toks, i, ev) {
  const tok = toks[i];
  const v = tok.v;
  if (tok.prot || !hasLetter(v)) return { v, rule: 'kept' };
  const up = v.toUpperCase();
  if (ACRONYMS.has(up) || ACRONYMS.has(up.replace(/\./g, ''))) return { v, rule: 'acronym' };
  if (/^(?:\p{L}\.)+\p{L}?$/u.test(v)) return { v, rule: 'acronym' }; // T.G.I.F, U.S.A
  if (hasDigit(v)) {
    if (/^\d+(?:ST|ND|RD|TH)$/i.test(v)) return { v: lowerSame(v), rule: 'ordinal' };
    return { v, rule: 'digits' };
  }
  if (UNITS.has(up)) return { v, rule: 'unit' };
  if (/^\p{L}$/u.test(v)) {
    if (up === 'I') return { v: 'I', rule: 'pronoun' };
    if (up === 'A') return { v: lowerSame(v), rule: 'article' };
    return { v, rule: 'letter' };
  }
  if (/^I['’](?:M|LL|VE|D)$/i.test(v)) return { v: 'I' + lowerSame(v.slice(1)), rule: 'pronoun' };
  if (keyOf(v) === 'may') {
    const near = (j) => j >= 0 && j < toks.length && /^\d/.test(toks[j].v);
    return near(i + 1) || near(i - 1) ? { v: withCasing(v, 'May'), rule: 'month' } : { v: lowerSame(v), rule: 'common' };
  }
  const d = decideKey(keyOf(v), v, ev);
  if (d) return d;
  // compounds: decide each part of PRE-ROLLS / 1/8TH'S / MOTHER'S
  const parts = v.split(/([-/]|['’](?=\p{L}+$))/u);
  if (parts.length > 1) {
    let out = ''; let unsure = null;
    for (const p of parts) {
      if (!p || !hasLetter(p) || /^['’\-/]$/u.test(p)) { out += p; continue; }
      if (/^s$/i.test(p)) { out += lowerSame(p); continue; }
      if (hasDigit(p) || UNITS.has(p.toUpperCase()) || ACRONYMS.has(p.toUpperCase())) { out += p; continue; }
      const pd = decideKey(keyOf(p), p, ev);
      if (!pd || pd.unsure) { unsure = (pd && pd.unsure) || 'no-evidence'; break; }
      out += pd.v;
    }
    if (!unsure && out.length === v.length) return { v: out, rule: 'compound' };
    return { v, rule: 'kept', unsure: unsure || 'no-evidence' };
  }
  return { v, rule: 'kept', unsure: 'no-evidence' };
}
function decideKey(key, v, ev) {
  if (BUILTIN_PROPER.has(key)) return { v: withCasing(v, BUILTIN_PROPER.get(key)) || v, rule: 'month/day' };
  if (COMMON.has(key)) return { v: lowerSame(v), rule: 'common' };
  const e = ev.get(key);
  const best = ev.bestForm(key);
  const asBest = best ? withCasing(v, best) : null;
  if (e.C > 0 && e.L === 0 && asBest) return { v: asBest, rule: 'corpus-proper' };
  if (e.L > 0 && (e.C === 0 || e.L / (e.L + e.C) >= 0.6)) return { v: lowerSame(v), rule: 'corpus-lower' };
  if (e.L > 0 && e.C > 0) return { v, rule: 'kept', unsure: `ambiguous (lower x${e.L}, capitalised x${e.C})` };
  return null;
}

/** ALL-CAPS unit -> sentence case. Returns { text, unsure: [{word, reason}], trace } (length preserved). */
function caseFix(str, ev) {
  const toks = tokenize(str);
  const outV = toks.map((t, i) => decideWord(toks, i, ev));
  const fromName = new Array(toks.length).fill(false);
  // multi-word names override single-word decisions
  const names = ev.acceptedNames || ev.finalizeNames();
  for (let i = 0; i < toks.length; i++) {
    for (const n of names) {
      const L = n.keys.length;
      if (i + L > toks.length) continue;
      let ok = true;
      for (let j = 0; j < L && ok; j++) {
        const t = toks[i + j];
        if (t.prot || keyOf(t.v) !== n.keys[j]) ok = false;
        if (j > 0 && !/^[  ]+$/.test(str.slice(toks[i + j - 1].e, t.s))) ok = false;
      }
      if (!ok) continue;
      for (let j = 0; j < L; j++) {
        const t = toks[i + j];
        if (ACRONYMS.has(t.v.toUpperCase())) continue;
        const nv = withCasing(t.v, n.forms[j]);
        if (nv) { outV[i + j] = { v: nv, rule: 'name: ' + n.forms.join(' ') }; fromName[i + j] = true; }
      }
      i += L - 1;
      break;
    }
  }
  // capitalise the first word of each sentence (when it starts with a letter)
  for (let i = 0; i < toks.length; i++) {
    if (!toks[i].initial || toks[i].prot) continue;
    if (!/^\p{L}/u.test(toks[i].v)) continue;
    const cur = outV[i].v;
    if (/^\p{Ll}/u.test(cur)) outV[i] = { ...outV[i], v: capFirst(cur) };
  }
  let out = ''; let last = 0;
  const unsure = [];
  const trace = [];
  toks.forEach((t, i) => {
    out += str.slice(last, t.s) + outV[i].v;
    last = t.e;
    if (outV[i].unsure && !fromName[i]) unsure.push({ word: t.v, reason: outV[i].unsure });
    if (hasLetter(t.v)) trace.push({ word: t.v, out: outV[i].v, rule: outV[i].rule });
  });
  out += str.slice(last);
  return { text: out.length === str.length ? out : str, unsure, trace };
}

// ───────────────────────────── per-unit correction pipeline ──────────────────────────────────────

/** segs -> { text, textOriginal, links } with corrections logged in `log`, unsure words in `unsureSink`. */
function correctSegs(segs, ctx, where) {
  const textOriginal = segText(segs);
  const work = segs.map((s) => ({ text: s.text, link: s.link }));
  const linkMap = new Map();
  for (const s of work) {
    if (!s.link) continue;
    if (!linkMap.has(s.link.id)) linkMap.set(s.link.id, { id: s.link.id, href: fixPortalHref(s.link.href, ctx.log, `${where}.links[${linkMap.size}].href`) });
    s.link = linkMap.get(s.link.id);
  }
  for (const s of work) s.text = fixAddress(s.text, ctx.log, where);
  for (const s of work) s.text = fixPortalText(s.text, ctx.log, where);
  const joined = segText(work);
  if (isAllCaps(textOriginal)) {
    const r = caseFix(joined, ctx.ev);
    if (r.text !== joined) {
      ctx.log.push({ what: 'case', from: joined, to: r.text, where });
      let pos = 0;
      for (const s of work) { s.text = r.text.slice(pos, pos + s.text.length); pos += s.text.length; }
    }
    for (const u of r.unsure) ctx.unsure.push({ ...u, where, unit: textOriginal.slice(0, 120) });
    if (CASE_DEBUG) for (const t of r.trace) {
      const k = t.word.toUpperCase() + ' -> ' + t.out + '  [' + t.rule.replace(/^name: .*/, 'name') + ']';
      const e = ctx.ev.get(keyOf(t.word));
      const rec = caseTrace.get(k) || { n: 0, rule: t.rule, L: e.L, C: e.C };
      rec.n++; caseTrace.set(k, rec);
    }
  }
  return { text: segText(work), textOriginal, links: segLinks(work) };
}
function correctString(str, ctx, where) {
  if (str == null) return null;
  return correctSegs([{ text: str, link: null }], ctx, where).text;
}

// ───────────────────────────── recall self-check ─────────────────────────────────────────────────

const stripWord = (w) => w.replace(/^[^\p{L}\p{N}\p{Extended_Pictographic}$#@]+|[^\p{L}\p{N}\p{Extended_Pictographic}%]+$/gu, '');
const isWord = (w) => !!w && /[\p{L}\p{N}\p{Extended_Pictographic}]/u.test(w);
/** Whitespace tokens -> [{ raw (lower-cased, quotes straightened), norm (outer punctuation stripped) }]. */
function wordTokens(s) {
  return (s || '')
    .normalize('NFKC')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({ raw, norm: stripWord(raw) }));
}
function words(s) { return wordTokens(s).map((t) => t.norm).filter(isWord); }
function bag(list) { const m = new Map(); for (const w of list) m.set(w, (m.get(w) || 0) + 1); return m; }
function countBy(list) { const m = {}; for (const x of list) m[x] = (m[x] || 0) + 1; return m; }
const CHROME_LINES = new Set(['All Posts', 'Search', 'See All', 'Log In', 'Share', 'Recent Posts', 'HOME', 'Live Menu / Order Online', 'Daily Deals & More', 'Flavors News', 'Post not marked as liked', 'Comments', 'Write a comment...']);
const CHROME_LINE_RE = [/^\d+\s+views?$/i, /^\d+\s+comments?$/i, /^\d+\s+likes?\.?$/i, /^Updated:?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?$/];

/** content-inventory bodyText -> the post's own words (header fields and chrome removed). */
function expectedBody(bodyText, header) {
  let t = bodyText || '';
  const rp = t.lastIndexOf('Recent Posts');
  if (rp >= 0) t = t.slice(0, rp);
  let lines = t.split('\n').map((l) => l.trim()).filter(Boolean);
  const headerSeen = {};
  // the post header sits before the body: All Posts, Search, title, author, date, read time
  const rt = lines.findIndex((l) => /^\d+\s+min\s+read$/i.test(l));
  if (rt >= 0 && rt <= 8) {
    for (const l of lines.slice(0, rt + 1)) {
      if (l === header.title) headerSeen.title = true;
      if (l === header.author) headerSeen.author = true;
      if (l === header.timeAgo) headerSeen.date = true;
      if (l === header.readTime) headerSeen.readTime = true;
    }
    lines = lines.slice(rt + 1);
  }
  lines = lines.filter((l) => !CHROME_LINES.has(l) && !CHROME_LINE_RE.some((re) => re.test(l)));
  return { text: lines.join('\n'), headerSeen, headerCut: rt >= 0 && rt <= 8 };
}
/**
 * Word recall of expectedText inside gotText, order-aware: the two word sequences (both in document
 * order) are aligned by longest common subsequence; recall = aligned expected words / expected words.
 * Both reference texts (sr-extract's bodyText and the raw tag-strip) put a space at every element
 * boundary, so a word the source writes across adjacent spans ("N","E","W" in seven <strong>s, or
 * "Edibles</strong><span>Tasty", which renders run-together) arrives split. Inside each unaligned gap,
 * a run of consecutive expected tokens whose concatenation equals one extracted word (or the reverse)
 * also counts; those words are reported as joinedFromSplits so the reconciliation stays visible.
 */
function recallOf(expectedText, gotText) {
  const all = wordTokens(expectedText); // punctuation-only tokens ("—") stay for joins, are not counted
  const E = []; all.forEach((t, i) => { if (isWord(t.norm)) E.push({ ...t, at: i }); });
  const G = wordTokens(gotText).filter((t) => isWord(t.norm));
  const n = E.length; const m = G.length;
  if (n * m > 30e6) return recallBag(E, G); // never hit by these posts; keeps memory bounded
  const W = m + 1;
  const dp = new Uint16Array((n + 1) * W);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    dp[i * W + j] = E[i].norm === G[j].norm ? dp[(i + 1) * W + j + 1] + 1 : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1]);
  }
  const eHit = new Array(n).fill(false); const gHit = new Array(m).fill(false);
  const pairs = [];
  for (let i = 0, j = 0; i < n && j < m;) {
    if (E[i].norm === G[j].norm) { eHit[i] = gHit[j] = true; pairs.push([i, j]); i++; j++; }
    else if (dp[(i + 1) * W + j] >= dp[i * W + j + 1]) i++;
    else j++;
  }
  let joined = 0;
  const joinE = (a, b) => stripWord(all.slice(E[a].at, E[b].at + 1).map((x) => x.raw).join(''));
  const joinG = (a, b) => stripWord(G.slice(a, b + 1).map((x) => x.raw).join(''));
  pairs.push([n, m]);
  let pe = -1; let pg = -1;
  for (const [ei, gj] of pairs) {
    const e0 = pe + 1; const e1 = ei - 1; const g0 = pg + 1; const g1 = gj - 1;
    if (e1 >= e0 && g1 >= g0) {
      // expected split, extracted joined: E[s..s+k-1] -> one G token
      for (let g = g0; g <= g1; g++) {
        if (gHit[g]) continue;
        for (let s = e0; s <= e1 && !gHit[g]; s++) {
          if (eHit[s]) continue;
          for (let t = s + 1; t <= Math.min(e1, s + 12); t++) {
            if (eHit[t]) break;
            if (joinE(s, t) === G[g].norm) { for (let x = s; x <= t; x++) eHit[x] = true; gHit[g] = true; joined += t - s + 1; break; }
          }
        }
      }
      // expected joined, extracted split: one E token -> G[s..t]
      for (let e = e0; e <= e1; e++) {
        if (eHit[e]) continue;
        for (let s = g0; s <= g1 && !eHit[e]; s++) {
          if (gHit[s]) continue;
          for (let t = s + 1; t <= Math.min(g1, s + 12); t++) {
            if (gHit[t]) break;
            if (joinG(s, t) === E[e].norm) { eHit[e] = true; for (let x = s; x <= t; x++) gHit[x] = true; joined++; break; }
          }
        }
      }
    }
    pe = ei; pg = gj;
  }
  const missing = new Map();
  E.forEach((t, i) => { if (!eHit[i]) missing.set(t.norm, (missing.get(t.norm) || 0) + 1); });
  const extra = new Map();
  G.forEach((t, j) => { if (!gHit[j]) extra.set(t.norm, (extra.get(t.norm) || 0) + 1); });
  const hit = eHit.filter(Boolean).length;
  const fmt = (mp) => [...mp.entries()].map(([w, c]) => (c > 1 ? `${w} x${c}` : w));
  return {
    expectedWords: n,
    matched: hit,
    joinedFromSplits: joined,
    recall: n ? hit / n : 1,
    missing: fmt(missing),
    extraWords: [...extra.values()].reduce((a, c) => a + c, 0),
    extraSample: fmt(extra).slice(0, 12),
  };
}
/** Fallback multiset recall (order-free) for pathological sizes. */
function recallBag(E, G) {
  const got = bag(G.map((t) => t.norm));
  let hit = 0; const missing = new Map();
  for (const t of E) { const c = got.get(t.norm) || 0; if (c > 0) { hit++; got.set(t.norm, c - 1); } else missing.set(t.norm, (missing.get(t.norm) || 0) + 1); }
  const extra = [...got.entries()].filter(([, c]) => c > 0);
  return { expectedWords: E.length, matched: hit, joinedFromSplits: 0, recall: E.length ? hit / E.length : 1, missing: [...missing.keys()], extraWords: extra.reduce((a, [, c]) => a + c, 0), extraSample: extra.slice(0, 12).map(([w]) => w) };
}

// ───────────────────────────── images: inventory join + kind hint ────────────────────────────────

/** media id -> largest downloaded uncropped rendition; "id|x,y,w,h" -> the downloaded crop. */
function buildImageIndex(inv) {
  const byId = new Map();
  for (const im of (inv && inv.images) || []) {
    const id = mediaIdOf(im.src);
    if (!id || !im.localFile) continue;
    if (!fs.existsSync(path.resolve(ROOT, im.localFile))) continue;
    const rec = { area: (+im.intrinsicWidth || 0) * (+im.intrinsicHeight || 0), localFile: im.localFile, w: +im.intrinsicWidth || null, h: +im.intrinsicHeight || null };
    const c = cropOf(im.src);
    const key = c ? cropKey(id, c) : id;
    const cur = byId.get(key);
    if (!cur || rec.area > cur.area) byId.set(key, rec);
  }
  return byId;
}
/** Hint only. flyer = square-ish promo graphic; photo = tall product shot, or a camera-native 4:3 frame. */
function kindOf(w, h) {
  if (!w || !h) return 'unknown';
  const r = h / w;
  const long = Math.max(w, h);
  if (r >= 0.9 && r <= 1.1 && Math.min(w, h) >= 1000) return 'flyer';
  if (r >= 1.2 && h >= 1800) return 'photo';
  const camera = Math.abs(r - 0.75) < 0.01 || Math.abs(r - 4 / 3) < 0.01;
  if (camera && long >= 3000) return 'photo';
  return 'unknown';
}

// ───────────────────────────── blog index cross-check ───────────────────────────────────────────

function parseBlogIndex(text) {
  if (!text) return [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const start = lines.indexOf('All Posts');
  const end = lines.findIndex((l, i) => i > start && /^Terms Of Service$/i.test(l));
  const body = lines.slice(start + 1, end > 0 ? end : lines.length);
  const entries = [];
  let cur = [];
  for (const l of body) {
    if (/^\d+\s+min\s+read$/i.test(l) && cur.length >= 3) {
      const author = cur[cur.length - 2];
      const date = cur[cur.length - 1];
      const head = cur.slice(0, -2);
      entries.push({ title: head[0], excerpt: head.slice(1).join(' '), author, date, readTime: l });
      cur = [];
    } else cur.push(l);
  }
  return entries;
}

// ───────────────────────────── main ──────────────────────────────────────────────────────────────

const siteInv = readJSON(SITE_INV);
const contentInv = readJSON(CONTENT_INV);
const imageInv = readJSON(IMAGE_INV);
const blogText = readText(BLOG_TEXT);

const bySaved = new Map();
for (const p of (siteInv && siteInv.pages) || []) if (p.savedAs) bySaved.set(p.savedAs, p);
const ciByUrl = new Map();
for (const p of (contentInv && contentInv.pages) || []) { if (p.url) ciByUrl.set(p.url.replace(/\/$/, ''), p); if (p.savedAs) ciByUrl.set('file:' + p.savedAs, p); }
const imageIndex = buildImageIndex(imageInv);
const blogIndex = parseBlogIndex(blogText);

let files = [];
try { files = fs.readdirSync(RAW_DIR).filter((f) => /^post-.+\.html$/.test(f)).sort(); } catch (e) { inputProblems.push({ file: relPath(RAW_DIR), error: e.message }); }

const parsed = [];
const unmapped = [];
const failed = [];
for (const file of files) {
  const html = readText(path.join(RAW_DIR, file));
  if (!html) { failed.push({ file, reason: 'unreadable' }); continue; }
  const inv = bySaved.get(file) || null;
  if (!inv) unmapped.push(file);
  const head = headMeta(html);
  const bp = head.blogPosting || {};
  const liveUrl = (inv && (inv.finalUrl || inv.url)) || head.canonical || head.meta['og:url'] || (bp.mainEntityOfPage && bp.mainEntityOfPage.url) || null;
  if (!liveUrl) { failed.push({ file, reason: 'no live URL (not in site-inventory, no canonical/og:url)' }); continue; }
  let slug;
  try { slug = decodeURIComponent(new URL(liveUrl).pathname.replace(/^\/post\//, '').replace(/\/$/, '')); } catch { slug = file.replace(/^post-|\.html$/g, ''); }
  const descStart = html.indexOf('data-hook="post-description"');
  const viewerAt = descStart >= 0 ? html.indexOf('data-id="content-viewer"', descStart) : -1;
  const viewer = viewerAt >= 0 ? parseElementAt(html, html.lastIndexOf('<', viewerAt)) : null;
  if (!viewer) { failed.push({ file, reason: 'no post-description/content-viewer container' }); continue; }
  const body = extractBody(viewer);
  const titleEl = elementWith(html, 'data-hook="post-title"');
  const header = {
    title: titleEl ? squash(textOf(titleEl)) : null,
    author: squash(textOf(elementWith(html, 'data-hook="user-name"') || { children: [] })) || null,
    timeAgo: squash(textOf(elementWith(html, 'data-hook="time-ago"') || { children: [] })) || null,
    readTime: squash(textOf(elementWith(html, 'data-hook="time-to-read"') || { children: [] })) || null,
  };
  parsed.push({ file, html: null, inv, head, bp, liveUrl, slug, body, header });
}

// pass 1: corpus evidence for case restoration (every non-ALL-CAPS unit of every post)
const ev = new CaseEvidence();
function unitsOfPost(p) {
  const u = [];
  if (p.header.title) u.push(p.header.title);
  if (p.head.title) u.push(p.head.title);
  for (const b of p.body.blocks) {
    if (b.segs) u.push(segText(b.segs));
    if (b.items) for (const it of b.items) u.push(segText(it.segs));
    if (b.rows) for (const r of b.rows) for (const c of r) u.push(segText(c.segs));
  }
  for (const im of p.body.images) if (im.captionSegs) u.push(segText(im.captionSegs));
  return u.filter(Boolean);
}
for (const p of parsed) for (const s of unitsOfPost(p)) for (const piece of s.split('\n')) if (piece.trim() && !isAllCaps(piece)) ev.learn(piece);
ev.finalizeNames();

// pass 2: build posts
const posts = [];
const recallRows = [];
const unsureAll = [];
const dateNotes = [];
const missingDates = [];
const structural = { headingDemotions: [], markerMismatch: [], otherBlocks: [], multiBlockWrappers: [], tables: [], buttons: [], videos: 0, imagesNotDownloaded: [], lowResLocal: [], hashtagLinks: 0, posAdminLinks: [] };
const contentFlags = [];
const PLACEHOLDER_RE = /\b(?:insert your (?:image|text|title)|lorem ipsum|your (?:text|title) here|add your (?:text|image))\b/i;
for (const p of parsed) {
  const log = [];
  const unsure = [];
  const ctx = { log, unsure, ev };
  const bp = p.bp;
  const meta = p.head.meta;

  // dates (JSON-LD BlogPosting first, then article:* meta) — never guessed
  const datePublished = toISO(bp.datePublished) || toISO(meta['article:published_time']);
  const dateModified = toISO(bp.dateModified) || toISO(meta['article:modified_time']) || null;
  const dateSource = toISO(bp.datePublished) ? 'json-ld' : (toISO(meta['article:published_time']) ? 'meta' : null);
  let dateLabel = null;
  let dateLabelSource = null;
  const live = parseLiveDate(p.header.timeAgo);
  if (datePublished) {
    const det = detroitYMD(datePublished);
    if (live) {
      let y = live.y;
      if (!y) { y = det.y; if (live.m === 12 && det.m === 1) y -= 1; if (live.m === 1 && det.m === 12) y += 1; }
      dateLabel = `${MONTHS[live.m - 1]} ${live.d}, ${y}`;
      dateLabelSource = 'live header label' + (live.y ? '' : ' + year from datePublished');
      if (live.m !== det.m || live.d !== det.d || (live.y && live.y !== det.y)) dateNotes.push({ slug: p.slug, liveLabel: p.header.timeAgo, datePublished, inDetroit: `${MONTHS[det.m - 1]} ${det.d}, ${det.y}`, used: dateLabel });
    } else {
      dateLabel = `${MONTHS[det.m - 1]} ${det.d}, ${det.y}`;
      dateLabelSource = 'datePublished in ' + TZ;
    }
  } else {
    missingDates.push({ slug: p.slug, liveLabel: p.header.timeAgo || null, note: 'no BlogPosting datePublished and no article:published_time' });
    if (live && live.y) { dateLabel = `${MONTHS[live.m - 1]} ${live.d}, ${live.y}`; dateLabelSource = 'live header label'; }
  }

  // header strings
  const titleOriginal = p.header.title || (bp.headline ? squash(bp.headline) : null) || squash(meta['og:title']) || p.head.title;
  const title = correctString(titleOriginal, ctx, 'title');
  const seoTitleOriginal = p.head.title || null;
  const seoTitle = correctString(seoTitleOriginal, ctx, 'seoTitle');
  const mdRaw = meta.description !== undefined ? squash(meta.description) : null;
  const metaDescription = mdRaw ? correctString(mdRaw, ctx, 'metaDescription') : null;
  const author = p.header.author || (bp.author && bp.author.name) || meta['article:author'] || null;

  // blocks
  const blocks = [];
  p.body.blocks.forEach((b, i) => {
    const where = `blocks[${i}]`;
    if (b.t === 'hr') { blocks.push({ t: 'hr' }); return; }
    if (b.t === 'ul' || b.t === 'ol') {
      blocks.push({ t: b.t, items: b.items.map((it, k) => { const r = correctSegs(it.segs, ctx, `${where}.items[${k}]`); const o = { text: r.text, textOriginal: r.textOriginal, links: r.links }; if (it.level) o.level = it.level; return o; }) });
      return;
    }
    if (b.t === 'table') {
      blocks.push({ t: 'table', rows: b.rows.map((row, ri) => row.map((c, ci) => { const r = correctSegs(c.segs, ctx, `${where}.rows[${ri}][${ci}]`); return { text: r.text, textOriginal: r.textOriginal, links: r.links }; })) });
      structural.tables.push(p.slug);
      return;
    }
    const r = correctSegs(b.segs, ctx, where);
    const o = { t: b.t, text: r.text, textOriginal: r.textOriginal, links: r.links };
    if (b.button) { o.button = true; structural.buttons.push({ slug: p.slug, text: r.textOriginal }); }
    blocks.push(o);
  });
  for (const b of blocks) for (const l of [...(b.links || []), ...((b.items || []).flatMap((x) => x.links)), ...((b.rows || []).flat().flatMap((x) => x.links))]) {
    if (/\/blog\/hashtags\//.test(l.href)) { l.hashtag = true; structural.hashtagLinks++; }
    if (/^https?:\/\/pos\.portal42\.us\/product_edit\.php/i.test(l.href)) { l.posAdmin = true; structural.posAdminLinks.push(p.slug); }
  }

  // images
  const images = p.body.images.map((im, i) => {
    const hit = im.mediaId ? (im.crop ? imageIndex.get(cropKey(im.mediaId, im.crop)) : imageIndex.get(im.mediaId)) : null;
    const w = hit ? hit.w : (im.crop ? im.crop.w : im.declaredW);
    const h = hit ? hit.h : (im.crop ? im.crop.h : im.declaredH);
    if (!hit) structural.imagesNotDownloaded.push({ slug: p.slug, mediaId: im.mediaId, ...(im.crop ? { crop: im.crop } : {}) });
    const o = {
      src: im.mediaId ? 'https://static.wixstatic.com/media/' + im.mediaId : im.fallbackSrc,
      mediaId: im.mediaId,
      alt: im.alt,
      localFile: hit ? hit.localFile : null,
      w: w || null,
      h: h || null,
      kind: im.crop ? kindOf(im.crop.w, im.crop.h) : kindOf(im.declaredW || w, im.declaredH || h),
      afterBlock: im.afterBlock,
      source: im.source,
    };
    if (im.crop) o.crop = im.crop;
    if (!im.crop && im.declaredW && im.declaredH && (im.declaredW !== w || im.declaredH !== h)) { o.uploadW = im.declaredW; o.uploadH = im.declaredH; }
    // the asset stage sometimes only caught Wix's blurred LQIP placeholder (e.g. 49x16) for an image
    const fullW = im.crop ? im.crop.w : im.declaredW;
    if (hit && fullW && hit.w && hit.w < 300 && fullW > 2 * hit.w) { o.localFileLowRes = true; structural.lowResLocal.push({ slug: p.slug, mediaId: im.mediaId, localFile: hit.localFile, local: `${hit.w}x${hit.h}`, upload: `${fullW}x${im.crop ? im.crop.h : im.declaredH}` }); }
    if (im.captionSegs && segText(im.captionSegs)) { const r = correctSegs(im.captionSegs, ctx, `images[${i}].caption`); o.caption = r.text; o.captionOriginal = r.textOriginal; }
    if (im.hrefOriginal !== null && im.hrefOriginal !== undefined) { o.href = fixPortalHref(im.hrefOriginal, log, `images[${i}].href`); if (o.href !== im.hrefOriginal) o.hrefOriginal = im.hrefOriginal; }
    return o;
  });
  structural.videos += p.body.videos.length;

  // cover (the post's featured image: JSON-LD image / og:image — not part of the body)
  const coverUrl = (bp.image && (bp.image.url || (typeof bp.image === 'string' ? bp.image : null))) || meta['og:image'] || null;
  const coverId = mediaIdOf(coverUrl);
  let cover = null;
  if (coverId) {
    const hit = imageIndex.get(coverId);
    const cw = +((bp.image && bp.image.width) || meta['og:image:width']) || null;
    const ch = +((bp.image && bp.image.height) || meta['og:image:height']) || null;
    cover = { src: 'https://static.wixstatic.com/media/' + coverId, mediaId: coverId, localFile: hit ? hit.localFile : null, w: hit ? hit.w : cw, h: hit ? hit.h : ch, kind: kindOf(cw || (hit && hit.w), ch || (hit && hit.h)), inBody: images.some((x) => x.mediaId === coverId) };
    if (hit && cw && ch && (hit.w !== cw || hit.h !== ch)) { cover.uploadW = cw; cover.uploadH = ch; }
    if (hit && cw && hit.w && hit.w < 300 && cw > 2 * hit.w) { cover.localFileLowRes = true; structural.lowResLocal.push({ slug: p.slug, mediaId: coverId, localFile: hit.localFile, local: `${hit.w}x${hit.h}`, upload: `${cw}x${ch}`, cover: true }); }
  }

  // excerpt: body display text, <= 170 chars, cut on a whole word
  const bodyText = blocks.flatMap((b) => (b.button ? [] : b.text ? [b.text] : b.items ? b.items.map((x) => x.text) : b.rows ? b.rows.flat().map((x) => x.text) : [])).join(' ');
  const flat = squash(bodyText);
  let excerpt = flat;
  if (flat.length > EXCERPT_MAX) {
    const cut = flat.slice(0, EXCERPT_MAX + 1).lastIndexOf(' ');
    excerpt = flat.slice(0, cut > 0 ? cut : EXCERPT_MAX).replace(/[\s,;:–—\-(/&+]+$/u, '');
  }

  const post = {
    slug: p.slug,
    liveUrl: p.liveUrl,
    path: `/post/${p.slug}/`,
    title,
    titleOriginal,
    seoTitle,
    seoTitleOriginal,
    metaDescription,
    author,
    datePublished,
    dateModified,
    dateLabel,
    readTime: p.header.readTime || null,
    excerpt,
    blocks,
    images,
    videos: p.body.videos,
    cover,
    corrections: log,
  };
  posts.push(post);
  blocks.forEach((b, i) => { for (const t of [b.textOriginal, ...((b.items || []).map((x) => x.textOriginal))]) if (t && PLACEHOLDER_RE.test(t)) contentFlags.push({ slug: p.slug, where: `blocks[${i}]`, what: 'editor placeholder text published on the live post', text: t.slice(0, 140) }); });
  if (/^manage-your-blog-from-your-live-site$|^(?:design-a-stunning-blog|grow-your-blog-community|create-a-blog-post-subscribers-will-love)$/.test(p.slug)) contentFlags.push({ slug: p.slug, what: 'slug is left over from a Wix sample post; the title and body were rewritten', title: titleOriginal });
  if (!blocks.length) contentFlags.push({ slug: p.slug, what: 'no text blocks (image/video-only post)', images: images.length, videos: p.body.videos.length });
  for (const u of unsure) unsureAll.push({ ...u, slug: p.slug });
  for (const d of p.body.notes.headingDemotions) structural.headingDemotions.push({ slug: p.slug, ...d });
  for (const d of p.body.notes.markerMismatch) structural.markerMismatch.push({ slug: p.slug, ...d });
  for (const d of p.body.notes.other) structural.otherBlocks.push({ slug: p.slug, ...d });
  for (const d of p.body.notes.multiLeaf) structural.multiBlockWrappers.push({ slug: p.slug, ...d });

  // recall self-check
  const ci = ciByUrl.get(p.liveUrl.replace(/\/$/, '')) || ciByUrl.get('file:' + p.file) || null;
  // the extracted words in document order (an image caption sits right after its image)
  const blockTexts = (b) => (b.textOriginal ? [b.textOriginal] : b.items ? b.items.map((x) => x.textOriginal) : b.rows ? b.rows.flat().map((x) => x.textOriginal) : []);
  const seq = [];
  blocks.forEach((b, k) => { for (const im of images) if (im.afterBlock === k && im.captionOriginal) seq.push(im.captionOriginal); seq.push(...blockTexts(b)); });
  for (const im of images) if (im.afterBlock >= blocks.length && im.captionOriginal) seq.push(im.captionOriginal);
  const extractedOriginal = seq.join('\n');
  let row;
  if (ci) {
    const exp = expectedBody(ci.bodyText, p.header);
    const r = recallOf(exp.text, extractedOriginal);
    row = { slug: p.slug, source: 'content-inventory', recall: +r.recall.toFixed(4), expectedWords: r.expectedWords, matched: r.matched, joinedFromSplits: r.joinedFromSplits, missing: r.missing, extraWords: r.extraWords, headerChecked: exp.headerCut, headerSeen: exp.headerSeen };
    if (r.extraWords) row.extraSample = r.extraSample;
  } else {
    // not in content-inventory (captured after sr-extract ran): compare with a plain tag-strip of the container
    const html = readText(path.join(RAW_DIR, p.file));
    const s = html.lastIndexOf('<', html.indexOf('data-hook="post-description"'));
    const fe = html.indexOf('data-hook="post-footer"', s);
    const e = fe > s ? html.lastIndexOf('<', fe) : -1;
    const region = html.slice(s, e > s ? e : undefined).replace(/<(svg|button|script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|h[1-6]|li|div|td)>/gi, '\n').replace(/<[^>]+>/g, ' ');
    const r = recallOf(decodeEntities(region), extractedOriginal);
    row = { slug: p.slug, source: 'raw tag-strip (no content-inventory entry)', recall: +r.recall.toFixed(4), expectedWords: r.expectedWords, matched: r.matched, joinedFromSplits: r.joinedFromSplits, missing: r.missing, extraWords: r.extraWords };
    if (r.extraWords) row.extraSample = r.extraSample;
  }
  recallRows.push(row);
}

posts.sort((a, b) => (b.datePublished || '').localeCompare(a.datePublished || '') || a.slug.localeCompare(b.slug));

// blog index cross-check (titles, labels, read times of the posts listed on /blog)
const byTitle = new Map();
for (const x of posts) { if (!byTitle.has(x.titleOriginal)) byTitle.set(x.titleOriginal, []); byTitle.get(x.titleOriginal).push(x); }
const parsedBySlug = new Map(parsed.map((x) => [x.slug, x]));
const blogCheck = { listed: blogIndex.length, matched: 0, notCaptured: [], mismatches: [] };
for (const e of blogIndex) {
  const cands = byTitle.get(e.title) || [];
  // titles repeat across years ("Hello Summer !" 2021 and 2025): pick the one whose header date matches
  const p = cands.find((c) => parsedBySlug.get(c.slug).header.timeAgo === e.date) || cands[0];
  if (!p) { blogCheck.notCaptured.push({ title: e.title, date: e.date }); continue; }
  blogCheck.matched++;
  const pp = parsedBySlug.get(p.slug);
  const diffs = [];
  if (pp && pp.header.timeAgo !== e.date) diffs.push(`date: post "${pp.header.timeAgo}" vs index "${e.date}"`);
  if (p.readTime !== e.readTime) diffs.push(`readTime: post "${p.readTime}" vs index "${e.readTime}"`);
  if (p.author !== e.author) diffs.push(`author: post "${p.author}" vs index "${e.author}"`);
  if (diffs.length) blogCheck.mismatches.push({ slug: p.slug, diffs });
}

// aggregate
const corrByKind = {};
const corrPosts = {};
for (const p of posts) for (const c of p.corrections) { corrByKind[c.what] = (corrByKind[c.what] || 0) + 1; (corrPosts[c.what] ||= new Set()).add(p.slug); }
const unsureAgg = new Map();
for (const u of unsureAll) {
  const k = u.word.toUpperCase();
  let a = unsureAgg.get(k);
  if (!a) { a = { word: u.word, reason: u.reason, count: 0, posts: new Set(), example: `${u.slug} ${u.where}: ${u.unit}` }; unsureAgg.set(k, a); }
  a.count++; a.posts.add(u.slug);
}
const caseUnsure = [...unsureAgg.values()].sort((a, b) => b.count - a.count || a.word.localeCompare(b.word)).map((a) => ({ word: a.word, reason: a.reason, count: a.count, posts: [...a.posts], example: a.example }));
const residual = [];
for (const p of posts) {
  const s = JSON.stringify({ t: p.title, s: p.seoTitle, m: p.metaDescription, b: p.blocks.map((b) => [b.text, b.links, b.items, b.rows]), i: p.images.map((x) => [x.caption, x.href]) });
  if (/kushcart/i.test(s)) residual.push({ slug: p.slug, what: 'kushcart still in display fields' });
  if (/(?<!\d)5730(?!\d)/.test(s)) residual.push({ slug: p.slug, what: '5730 still in display fields' });
}
recallRows.sort((a, b) => a.recall - b.recall || a.slug.localeCompare(b.slug));
const under = recallRows.filter((r) => r.recall < RECALL_FLOOR);
const recalls = recallRows.map((r) => r.recall).sort((a, b) => a - b);
const median = recalls.length ? recalls[Math.floor((recalls.length - 1) / 2)] : null;
const generated = new Date().toISOString();

const report = {
  schema: 'flavors/posts-report@1',
  generated,
  script: 'tools/extract-posts.mjs',
  container: 'section[data-hook="post-description"] > div[data-id="content-viewer"]; one block per div[data-breakout] wrapper, typed by the following div[data-hook="rcv-blockN"][type] marker (header, post-footer share/stats, Recent Posts and comments are outside it)',
  summary: {
    postFilesFound: files.length,
    postsProcessed: posts.length,
    failed: failed.length,
    unmappedFiles: unmapped.length,
    missingDates: missingDates.length,
    correctionsByKind: corrByKind,
    postsWithCorrections: Object.fromEntries(Object.entries(corrPosts).map(([k, v]) => [k, v.size])),
    caseUnsureWords: caseUnsure.length,
    recall: { floor: RECALL_FLOOR, min: recalls[0] ?? null, median, postsUnderFloor: under.length, fromContentInventory: recallRows.filter((r) => r.source === 'content-inventory').length, fromRawTagStrip: recallRows.filter((r) => r.source !== 'content-inventory').length },
    residualOldValues: residual.length,
  },
  unmappedFiles: unmapped,
  failed,
  missingDates,
  dateLabelNotes: dateNotes,
  caseUnsure,
  underFloor: under,
  recall: recallRows.map(({ slug, recall, expectedWords, matched, joinedFromSplits, missing, source, extraWords, extraSample }) => ({ slug, recall, expectedWords, matched, joinedFromSplits, missing: missing.slice(0, 20), extraWords, ...(extraSample ? { extraSample } : {}), source })),
  blogIndexCheck: blogCheck,
  structure: {
    headingDemotions: { count: structural.headingDemotions.length, posts: countBy(structural.headingDemotions.map((x) => x.slug)) },
    markerMismatch: structural.markerMismatch,
    otherBlocks: structural.otherBlocks,
    multiBlockWrappers: structural.multiBlockWrappers,
    tablePosts: [...new Set(structural.tables)],
    buttons: structural.buttons,
    videos: structural.videos,
    hashtagLinks: structural.hashtagLinks,
    bodyImagesNotInImageInventory: { count: structural.imagesNotDownloaded.length, posts: countBy(structural.imagesNotDownloaded.map((x) => x.slug)) },
    localFileIsLowResPlaceholder: structural.lowResLocal,
  },
  contentFlags: [
    ...contentFlags,
    ...(structural.posAdminLinks.length ? [{ what: 'links into the POS back office (pos.portal42.us/product_edit.php?strainID=...), kept verbatim and marked links[].posAdmin', count: structural.posAdminLinks.length, posts: countBy(structural.posAdminLinks) }] : []),
  ],
  schemaNotes: [
    'blocks[].t also uses "table" ({t:"table", rows:[[{text,textOriginal,links}]]}) — one post has a Ricos table',
    'blocks[] with button:true are Wix button CTAs (a paragraph whose whole text is one link)',
    'body h1 headings are demoted to h2 (the page title owns h1); h5/h6 map to h4',
    'list items carry level only when nested (level > 1)',
    'links[].hashtag:true marks Wix auto-hashtag links (/blog/hashtags/N) — those pages were not captured',
    'links[].posAdmin:true marks links into the POS back-office product editor (not a public page); href kept verbatim',
    'images[].afterBlock = number of blocks before the image (document position); source = image|gallery; href = the link wrapping the image; uploadW/uploadH = the size the HTML declares when it differs from the downloaded file; crop = the Wix crop of the original shown on the live page (src is the uncropped original, localFile the downloaded crop); localFileLowRes = the only downloaded rendition is a tiny blurred placeholder',
    'w/h = pixel size of localFile when one exists, else the size the HTML declares; kind is a hint from the declared aspect ratio (flyer: square-ish >= 1000px; photo: portrait h/w >= 1.2 and h >= 1800, or a camera-native 4:3 frame >= 3000px; else unknown)',
    'videos[] = {src, afterBlock[, poster][, embed]} for Ricos video blocks',
    'cover = the featured image from JSON-LD/og:image (not a body image unless cover.inBody)',
    'seoTitle = the page <title> (differs from the visible title on some posts)',
    'excerpt = body display text squashed to single spaces, <= 170 chars, cut at a word boundary, no ellipsis added',
    'metaDescription = <meta name="description"> only; null when the live post has none (og:description is a run-together auto excerpt and is not used)',
    'dateLabel = the date the live post header shows ("Aug 30, 2020", or "Oct 11" for current-year posts, the year then taken from datePublished in America/Detroit); see dateLabelNotes for the post where the header date and datePublished-in-Detroit differ',
    'recall = order-aware: expected words aligned to the extracted textOriginal by longest common subsequence; joinedFromSplits counts words the reference split at an element boundary (e.g. one <strong> per letter) that match one extracted word',
  ],
  caseRules: {
    acronymsKeptUpper: [...ACRONYMS],
    unitsKeptAsWritten: [...UNITS],
    acceptedNames: (ev.acceptedNames || []).length,
  },
  unknownEntities: [...unknownEntities],
  inputProblems,
};

const out = { generated, count: posts.length, posts };
if (WRITE) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_POSTS, JSON.stringify(out, null, 2) + '\n');
  fs.writeFileSync(OUT_REPORT, JSON.stringify(report, null, 2) + '\n');
}

// summary
const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(1) + '%');
console.log(`extract-posts: ${files.length} post files, ${posts.length} processed, ${failed.length} failed, ${unmapped.length} not in site-inventory`);
console.log(`  dates: ${posts.filter((x) => x.datePublished).length} with datePublished, ${missingDates.length} missing; ${dateNotes.length} live labels differ from the America/Detroit date`);
console.log(`  corrections: ${Object.entries(corrByKind).map(([k, v]) => `${k} ${v} (${corrPosts[k].size} posts)`).join(', ') || 'none'}; residual old values: ${residual.length}`);
console.log(`  caseUnsure: ${caseUnsure.length} words (${unsureAll.length} occurrences)`);
console.log(`  recall: min ${pct(recalls[0])}, median ${pct(median)}, ${under.length} under ${pct(RECALL_FLOOR)} (${report.summary.recall.fromContentInventory} vs content-inventory bodyText, ${report.summary.recall.fromRawTagStrip} vs raw tag-strip: not in content-inventory); ${recallRows.reduce((a, r) => a + r.matched, 0)}/${recallRows.reduce((a, r) => a + r.expectedWords, 0)} words, ${recallRows.reduce((a, r) => a + (r.joinedFromSplits || 0), 0)} via split/join`);
console.log(`  flags: ${report.contentFlags.length} content flags, ${structural.lowResLocal.length} low-res local files, ${report.structure.bodyImagesNotInImageInventory.count} body images not downloaded`);
for (const r of under) console.log(`    ${r.slug}: ${pct(r.recall)} missing ${r.missing.slice(0, 15).join(' | ')}`);
if (unmapped.length) console.log(`  unmapped files: ${unmapped.join(', ')}`);
if (failed.length) console.log(`  failed: ${failed.map((f) => f.file + ' (' + f.reason + ')').join(', ')}`);
console.log(WRITE ? `  wrote ${relPath(OUT_POSTS)} and ${relPath(OUT_REPORT)}` : '  --check: nothing written');
if (CASE_DEBUG) {
  const groups = {};
  for (const [k, r] of caseTrace) { const g = r.rule.startsWith('name') ? 'name' : r.rule; (groups[g] ||= []).push(`${k} x${r.n} (L${r.L} C${r.C})`); }
  for (const [g, list] of Object.entries(groups).sort()) console.log(`\n[${g}] ${list.length}\n  ` + list.sort().join('\n  '));
}
