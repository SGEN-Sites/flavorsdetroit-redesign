// news.mjs — /blog/ (the live site's URL for "Flavors News") plus one page per captured post
// at its live URL (/post/<slug>/). Post words come from src/content/posts.json (verbatim, with
// the owner-approved corrections recorded per post). Flyer images are not carried: the layout is
// typographic so every post matches the brand (decision recorded in docs/CHANGE-LOG.md).
import { esc, rel, icon } from '../lib/html.mjs';
import { page } from '../lib/layout.mjs';
import { SITE, COPY, postsData } from '../content/site.mjs';
import { kicker, orderBtn, linkBtn, sectionHead, pageHero, postCard, mailForm, mailStrip, spectrum, storeCard } from '../lib/parts.mjs';
import { breadcrumbJsonLd, articleJsonLd } from '../lib/seo.mjs';

export const PATH = '/blog/';
// Every captured post keeps its live URL, including the one that was only an image on the live
// site (it gets a short note instead of a body).
const posts = (postsData.posts || []).filter((p) => p.slug && p.path);
// Dates read the way the live posts print them: "Oct 11, 2026"; "Updated: …" when the post was
// edited on a later day (dateModified in the post's own JSON-LD).
const detroitDay = (iso) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Detroit', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
const shortDate = (label) => String(label || '').replace(/^(January|February|March|April|June|July|August|September|October|November|December)\b/, (m) => m.slice(0, 3));
const updatedLabel = (p) => {
  if (!p.dateModified || !p.datePublished) return '';
  const a = detroitDay(p.datePublished), b = detroitDay(p.dateModified);
  return a !== b && new Date(p.dateModified) > new Date(p.datePublished) ? b : '';
};
// Editor placeholder text that was published on a live post ("Header Banner:Insert your image…").
const PLACEHOLDER = /insert your image|\[photo of [^\]]*goes here/i;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const board = (p) => {
  if (!p.datePublished) return 'News';
  const d = new Date(p.datePublished);
  // the label is the date as published on the live site (America/Detroit)
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Detroit', month: 'short', day: 'numeric' }).formatToParts(d);
  const o = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${o.month} ${o.day}`;
};

// ---- links inside posts: live-site URLs become this build's pages; the old ordering site and
// the live-site domain root are already rewritten upstream; everything else opens in a new tab.
// Links into the POS back office (pos.portal42.us/product_edit.php) and Wix hashtag pages (which
// answer 404 on the live site) are published by mistake on the live posts: they stay plain text.
function resolve(from, raw) {
  let href = String(raw || '').trim();
  // The live menu only answers at its home page: /menu/Flower, /menu?sale=1 and product paths
  // return "Page not found" (checked 2026-11-08/09), so every portal link opens the menu home.
  if (/^https?:\/\/flavors-detroit\.portal42\.com\//i.test(href)) return { href: 'https://flavors-detroit.portal42.com/', internal: false };
  const m = href.match(/^https?:\/\/(?:www\.)?flavorsdetroit\.com(\/[^?#]*)?/i);
  if (!m) return { href, internal: false };
  const p = (m[1] || '/').replace(/\/$/, '') || '/';
  if (p.startsWith('/post/')) return { href: rel(from, p + '/'), internal: true };
  if (['/blog', '/daily-deals', '/terms-of-service'].includes(p)) return { href: rel(from, p + '/'), internal: true };
  return { href: rel(from, '/'), internal: true };
}
const anchor = (r, label) => (r.internal
  ? `<a href="${esc(r.href)}">${label}</a>`
  : `<a href="${esc(r.href)}" target="_blank" rel="noopener">${label}<span class="visually-hidden"> (opens in a new tab)</span></a>`);

// Display-only typography repair for text the live posts publish glued together (no words change):
// a line break where a number runs straight into a word ("MI 48234Open Daily", "2/$25Motorcity"),
// a space before an emoji stuck to a word ("10PM📞"), and the extractor's "\n" as <br>.
const repair = (html) => html.split(/(<[^>]+>)/).map((part) => (part.startsWith('<') ? part : part
  .replace(/(\d)([A-Z][a-z]{2,})/g, '$1\n$2')
  .replace(/([A-Za-z0-9.)])(\p{Extended_Pictographic})/gu, '$1 $2')
  .replace(/\n+/g, '<br>'))).join('');

// first occurrence of `t` in the text runs of `html` (never inside a tag or an attribute)
function textIndex(html, t, fromPos = 0) {
  const re = /<[^>]*>/g; let last = 0, m;
  const runs = [];
  while ((m = re.exec(html))) { runs.push([last, m.index]); last = re.lastIndex; }
  runs.push([last, html.length]);
  for (const [a, b] of runs) { if (b <= fromPos) continue; const i = html.slice(Math.max(a, fromPos), b).indexOf(t); if (i >= 0) return Math.max(a, fromPos) + i; }
  return -1;
}
function linkify(from, text, links) {
  let html = esc(text);
  // one word split over two links with the same target ("Rainbow Runt" + "z") becomes one link
  const merged = [];
  for (const l of (links || [])) {
    const prev = merged[merged.length - 1];
    if (prev && l.href && prev.href === l.href && l.text && String(text).includes(prev.text + l.text)) prev.text += l.text;
    else merged.push({ ...l });
  }
  links = merged;
  for (const l of (links || [])) {
    if (!l.text || !l.href || l.posAdmin || l.hashtag || /pos\.portal42\.us|\/blog\/hashtags\//i.test(l.href)) continue;
    const t = esc(l.text);
    const i = textIndex(html, t);
    if (i >= 0) html = html.slice(0, i) + anchor(resolve(from, l.href), t) + html.slice(i + t.length);
  }
  return repair(html);
}

function body(from, p) {
  const out = [];
  for (const b of (p.blocks || [])) {
    if (b.text && PLACEHOLDER.test(b.text)) continue;
    if (b.t === 'hr') { out.push('<hr>'); continue; }
    if (b.t === 'table') {
      const [head, ...rows] = b.rows || [];
      out.push(`<div class="post-table"><table>${head ? `<thead><tr>${head.map((c) => `<th scope="col">${linkify(from, c.text, c.links)}</th>`).join('')}</tr></thead>` : ''}<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${linkify(from, c.text, c.links)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (b.t === 'ul' || b.t === 'ol') { out.push(`<${b.t}>${(b.items || []).map((it) => `<li>${linkify(from, it.text, it.links || b.links)}</li>`).join('')}</${b.t}>`); continue; }
    if (b.button) {
      const l = (b.links || []).find((x) => x.href && !x.posAdmin && !/pos\.portal42\.us/i.test(x.href));
      if (l) { const r = resolve(from, l.href); out.push(`<p>${anchor(r, esc(b.text)).replace('<a ', '<a class="btn btn--line" ')}</p>`); continue; }
    }
    // a paragraph that is nothing but one link is a standalone link: give it a full-size target
    const solo = (b.links || []).length === 1 && b.links[0].text && b.text && b.links[0].text.trim() === b.text.trim() && b.t === 'p';
    if (solo && !b.links[0].posAdmin && !b.links[0].hashtag && !/pos\.portal42\.us|\/blog\/hashtags\//i.test(b.links[0].href)) {
      const r = resolve(from, b.links[0].href);
      out.push(`<p>${anchor(r, esc(b.text) + (r.internal ? '' : icon.ext)).replace('<a ', '<a class="post-link" ')}</p>`);
      continue;
    }
    const tagName = ['h2', 'h3', 'h4'].includes(b.t) ? b.t : 'p';
    out.push(`<${tagName}>${linkify(from, b.text, b.links)}</${tagName}>`);
  }
  if (!out.length) out.push('<p>This post was shared as an image on flavorsdetroit.com. For current specials, see today\'s deals or the live menu.</p>');
  return out.join('\n');
}

function postPage(p, i) {
  const from = p.path;
  const newer = posts[i - 1], older = posts[i + 1];
  const year = (p.datePublished || '').slice(0, 4);
  const old = year && Number(year) < 2026;
  const hero = pageHero(from, {
    kick: 'Flavors news',
    title: p.title,
    lede: `<span class="post-meta"><span>${esc(shortDate(p.dateLabel))}</span>${updatedLabel(p) ? `<span>Updated: ${esc(updatedLabel(p))}</span>` : ''}<span>${esc(p.readTime || '')}</span><span>${esc(p.author || 'Flavors Detroit')}</span></span>`,
    crumbs: [{ label: 'News', path: '/blog/' }, { label: p.title.length > 48 ? p.title.slice(0, 46).replace(/\s+\S*$/, '') + '…' : p.title }],
    id: 'post-title',
    titleClass: 'post-hero__title',
    scene: 'bulb-bokeh', pos: '30% 50%', quiet: true,
  });
  const main = `${hero}
<section class="band band--white">
  <div class="container post-layout">
    <article class="post-body prose" aria-labelledby="post-title">
      ${body(from, p)}
      <p class="post-note">${old ? 'This post is from our archive. Its prices and dates have ended; the live menu has today\'s deals. ' : 'Prices and availability can change; the live menu is the final word. '}Originally posted ${esc(p.dateLabel || '')} on flavorsdetroit.com.</p>
      <nav class="post-nav" aria-label="More posts">
        ${newer ? `<a href="${rel(from, newer.path)}"><span>Newer</span><strong>${esc(newer.title)}</strong></a>` : '<span></span>'}
        ${older ? `<a href="${rel(from, older.path)}"><span>Older</span><strong>${esc(older.title)}</strong></a>` : ''}
      </nav>
    </article>
    <aside class="post-aside" aria-label="Shop and visit">
      <div class="panel panel--night stack" style="--stack:12px">
        ${kicker('Shop the live menu')}
        <p class="muted small">${esc(COPY.portalLine)}</p>
        ${orderBtn('btn btn--order btn--block', 'Order now')}
        <a class="btn btn--ghost btn--block" href="${rel(from, '/daily-deals/')}"><span>Today's deals</span>${icon.arrow}</a>
      </div>
      <div class="panel stack" style="--stack:10px">
        <p class="kicker">New product alerts</p>
        <p class="small muted">${esc(COPY.mailSub)}.</p>
        ${mailForm('post-mail')}
      </div>
      <a class="text-link" href="${rel(from, '/blog/')}">${icon.arrow}<span>All posts</span></a>
    </aside>
  </div>
</section>
<section class="band band--day band--tight" aria-labelledby="recent-title">
  <div class="container">
    ${sectionHead({ kick: 'Flavors news', id: 'recent-title', title: 'Recent posts', aside: linkBtn(from, '/blog/', 'See all', 'btn btn--line') })}
    <div class="posts swipe">${posts.filter((x) => x.slug !== p.slug).slice(0, 3).map((x, k) => postCard(from, x, { i: k })).join('')}</div>
  </div>
</section>`;
  return {
    path: p.path,
    html: page({
      path: p.path,
      title: (p.seoTitle || p.title) + (/(flavors detroit)/i.test(p.seoTitle || p.title) ? '' : ' | Flavors Detroit'),
      description: p.metaDescription || p.excerpt || p.title,
      canonicalPath: p.path.replace(/\/$/, ''),
      ogType: 'article',
      main,
      jsonld: [articleJsonLd(p), breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'News', path: '/blog' }, { name: p.title, path: p.path.replace(/\/$/, '') }])],
    }),
  };
}

function index() {
  const [lead, ...rest] = posts;
  const years = [...new Set(rest.map((p) => (p.datePublished || '').slice(0, 4)).filter(Boolean))];
  const chips = [['all', 'All'], ...years.map((y) => [y, y])].map(([v, l], i) => `<button class="tabs__tab" type="button" data-filter="${v}" aria-pressed="${i === 0 ? 'true' : 'false'}">${esc(l)}</button>`).join('');
  const featured = lead ? postCard(PATH, { ...lead, dateBoard: board(lead) }, { feature: true }) : '';
  const main = `${pageHero(PATH, {
    kick: 'Flavors news',
    titleHtml: 'Flavors <span class="accent">news</span>',
    lede: 'Drops, deals and events from 5700 E 8 Mile Rd, straight from the Flavors Detroit blog.',
    crumbs: [{ label: 'News' }],
    scene: 'bulb-bokeh', pos: '30% 50%',
    aside: `<a class="btn btn--ghost btn--lg" href="${esc(SITE.instagram)}" target="_blank" rel="noopener">${icon.insta}<span>${esc(SITE.instagramHandle)}</span><span class="visually-hidden"> on Instagram (opens in a new tab)</span></a>`,
  })}
${spectrum()}
<section class="band band--black" aria-labelledby="latest-title">
  <div class="container">
    <h2 class="visually-hidden" id="latest-title">Latest post</h2>
    <div class="posts">${featured}</div>
  </div>
</section>
<section class="band band--black band--flush-top news-all" aria-labelledby="all-title" style="padding-top: clamp(16px, 2vw, 32px)">
  <div class="container" data-news data-step="12">
    <div class="news-tools">
      <h2 class="h3" id="all-title">All posts</h2>
      <div class="filter-chips" role="group" aria-label="Filter posts by year">${chips}</div>
    </div>
    <p class="news-count" data-count aria-live="polite">${rest.length} posts</p>
    <div class="posts" style="margin-top:16px">${rest.map((p, i) => postCard(PATH, p, { i })).join('\n')}</div>
    <div class="news-more"><button class="btn btn--ghost btn--lg" type="button" data-more hidden>Show more posts</button></div>
  </div>
</section>
${mailStrip(PATH, { id: 'news-mail', key: 'news-mail-form' })}`;
  return page({
    path: PATH,
    title: 'Flavors News | Drops, Deals & Events | Flavors Detroit',
    description: 'Flavors news: new drops, daily deals and events from Flavors Detroit at 5700 E 8 Mile Rd, Detroit.',
    canonicalPath: '/blog',
    main,
    jsonld: [breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'News', path: '/blog' }])],
  });
}

export function render() {
  return [{ path: PATH, html: index() }, ...posts.map(postPage)];
}
