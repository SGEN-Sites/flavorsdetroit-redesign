// parts.mjs — shared section components. Markup only; looks live in components.css and cinema.css.
import { esc, rel, icon, moreArt } from './html.mjs';
import { SITE, COPY, bulbs, menu, ASOF, gen, images, photos } from '../content/site.mjs';

const A = rel;

// ---- scene stills: AI illustrations from src/content/generated-images.json -------------------
// Mood and product-category art only (never the store, its staff or customers). Every <img> carries
// data-ai="generated"; the files carry IPTC trainedAlgorithmicMedia XMP (tools/process-gen.py).
const genItem = (name) => {
  const it = gen?.items?.[name];
  if (!it) throw new Error('generated image not in the manifest: ' + name);
  return it;
};
const srcset = (from, files) => files.map((f) => `${A(from, '/assets/img/' + f.file)} ${f.w}w`).join(', ');

/** <picture>/<img> for a scene still. alt: false = decorative (alt=""), true = the manifest's
 *  description of the pixels. A portrait crop, when the manifest has one, serves tall screens. */
export function scenePicture(from, name, { sizes = '100vw', eager = false, alt = false, pos = '' } = {}) {
  const it = genItem(name);
  const land = it.files.filter((f) => f.variant === 'landscape');
  const port = it.files.filter((f) => f.variant === 'portrait');
  const def = land[Math.min(1, land.length - 1)];
  const img = `<img src="${A(from, '/assets/img/' + def.file)}" srcset="${srcset(from, land)}" sizes="${sizes}" width="${def.w}" height="${def.h}" alt="${alt ? esc(it.alt) : ''}"${pos ? ` style="object-position:${pos}"` : ''}${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async" data-ai="generated">`;
  return port.length ? `<picture><source media="(max-aspect-ratio: 4/5)" srcset="${srcset(from, port)}" sizes="${sizes}">${img}</picture>` : img;
}

// ---- store photos: the owner's own photos of the store (src/content/store-photos.json) ----------
// Real photos, upscaled and colour graded. Two are retouched with AI fill (the car dashboard in the
// storefront shot, the customers and staff at the counter): those carry data-ai="edited" and the
// IPTC type "Edited using Generative AI"; the others carry "Algorithmically-altered media".
const photoItem = (name) => {
  const it = photos?.items?.[name];
  if (!it) throw new Error('store photo not in the manifest: ' + name);
  return it;
};

/** A store photo in a rounded frame. sizes: the slot's rendered width; ar: the frame's ratio. */
export function storePhoto(from, name, { sizes = '100vw', ar = '4 / 3', cls = '', eager = false, pos = '' } = {}) {
  const it = photoItem(name);
  const def = it.files[Math.min(1, it.files.length - 1)];
  const edited = it.digitalSourceType === 'compositeWithTrainedAlgorithmicMedia';
  return `<div class="photo${cls ? ' ' + cls : ''}" style="--ar:${ar}">
  <img src="${A(from, '/assets/img/' + def.file)}" srcset="${srcset(from, it.files)}" sizes="${sizes}" width="${def.w}" height="${def.h}" alt="${esc(it.alt)}" data-photo="store"${edited ? ' data-ai="edited"' : ''}${pos ? ` style="object-position:${pos}"` : ''}${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">
</div>`;
}

/** The home hero's background: the storefront at golden hour, always the whole frame (a wide shot).
 *  Wider screens get 'hero-wide' (the street extended to the left by AI so the photo runs behind the
 *  words), drawn twice: a black-and-white, darker copy underneath and the colour copy on top, masked
 *  so the colour fades out to the left (cinema.css). Phones get 'hero' (the real frame) in colour
 *  across the top. Both copies use the same URL, so it downloads once. Decorative (alt=""): the same
 *  store is described in words in the visit band below. Loaded eagerly: it is the first paint. */
export function heroPhoto(from) {
  const wide = photoItem('hero-wide').files, crop = photoItem('hero').files;
  const def = wide[Math.min(1, wide.length - 1)];
  const pic = (extra) => `<picture><source media="(max-width: 860px)" srcset="${srcset(from, crop)}" sizes="100vw"><img src="${A(from, '/assets/img/' + def.file)}" srcset="${srcset(from, wide)}" sizes="calc((min(100vh, 940px) - 110px) * 2.38)" width="${def.w}" height="${def.h}" alt="" data-ai="edited"${extra} decoding="async"></picture>`;
  return `<div class="hero__bw"><div class="hero__frame">${pic('')}</div></div>
    <div class="hero__color"><div class="hero__frame">${pic(' data-photo="store" fetchpriority="high"')}</div></div>`;
}

/** A decorative scene still behind a band or hero (sits under the band's scrim). */
export const backdrop = (from, name, { cls = '', depth = '', ...o } = {}) =>
  `<div class="scene${cls ? ' ' + cls : ''}" aria-hidden="true"${depth ? ` data-depth="${depth}"` : ''}>${scenePicture(from, name, o)}</div>`;

/** Rising LED sparks (decorative, motion only). Positions come from a fixed seed, so every build
 *  writes the same markup. */
export function sparks(n = 14, seed = 1) {
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const dots = Array.from({ length: n }, () => {
    const x = (4 + rnd() * 92).toFixed(1), d = (-rnd() * 12).toFixed(2), t = (8 + rnd() * 9).toFixed(2), sz = (2 + rnd() * 2.6).toFixed(1), sx = ((rnd() - 0.5) * 120).toFixed(0);
    return `<i style="--x:${x}%;--d:${d}s;--t:${t}s;--s:${sz}px;--sx:${sx}px"></i>`;
  }).join('');
  return `<span class="sparks" aria-hidden="true">${dots}</span>`;
}

/** The kinetic type band: two rows of giant words sliding opposite ways, faster as you scroll,
 *  with the client's own flower bud floating over them. Decorative (aria-hidden): the words are
 *  the client's own lines and store facts, all shown elsewhere on the page. */
export function kinetic(from, rows) {
  const row = (words, dir) => {
    const seq = words.map((w, i) => `<span class="kinetic__item${i % 2 ? ' kinetic__item--solid' : ''}">${esc(w)}</span>`).join('');
    return `<div class="kinetic__row" data-dir="${dir}"><div class="kinetic__track"><div class="kinetic__list">${seq}</div><div class="kinetic__list">${seq}</div></div></div>`;
  };
  const im = images['cat-flower.webp'] || { w: 560, h: 560 }, im2 = images['cat-flower@2x.webp'];
  return `<div class="kinetic" aria-hidden="true" data-kinetic>
  <span class="pool pool--a" data-depth="-0.1"></span><span class="pool pool--b" data-depth="-0.05"></span>
  ${row(rows[0], -1)}
  ${row(rows[1], 1)}
  <img class="kinetic__bud" src="${A(from, '/assets/img/cat-flower.webp')}" srcset="${A(from, '/assets/img/cat-flower.webp')} ${im.w}w${im2 ? `, ${A(from, '/assets/img/cat-flower@2x.webp')} ${im2.w}w` : ''}" sizes="(max-width: 760px) 46vw, 340px" width="${im.w}" height="${im.h}" alt="" loading="lazy" decoding="async" data-depth="0.2">
</div>`;
}

/** The navy tape that crosses the letter board. Decorative: the board carries the words. */
export function tape(items) {
  const seq = items.map((t, i) => `<span class="tape__item${i % 2 ? ' tape__item--solid' : ''}">${esc(t)}</span>`).join('');
  return `<div class="tape" aria-hidden="true"><div class="tape__track"><div class="tape__list">${seq}</div><div class="tape__list">${seq}</div></div></div>`;
}

/** Category bento (home + shop): dark image cards on the showroom band. Every card opens the live menu.
 *  Flower and Edibles use the client's own photos; Concentrates and Much more use scene stills.
 *  (The AI "jars on a navy counter" still was retired 2026-11-09: it read as the store's own deli
 *  counter, and AI imagery must never stand in for the premises.) */
const BENTO = {
  flower: { photo: 'learn-flower.webp', pos: '50% 46%', size: 'xl', sizes: '(max-width: 640px) 80vw, (max-width: 960px) 92vw, 560px' },
  concentrates: { gen: 'concentrates', pos: '60% 42%', sizes: '(max-width: 640px) 80vw, (max-width: 960px) 46vw, 330px' },
  edibles: { photo: true, pos: '50% 50%', sizes: '(max-width: 640px) 80vw, (max-width: 960px) 46vw, 330px' },
  more: { gen: 'vapes-more', pos: '50% 52%', size: 'wide', sizes: '(max-width: 640px) 80vw, (max-width: 960px) 92vw, 680px' },
};
export function bento(from, cats) {
  const tiles = cats.map((c, i) => {
    const m = BENTO[c.id] || {};
    let media;
    if (m.gen) media = scenePicture(from, m.gen, { sizes: m.sizes, alt: true, pos: m.pos });
    else {
      // a client photo: the category's own (photo: true) or a named file from images.json
      const f = typeof m.photo === 'string' ? m.photo : c.img, f2 = f.replace('.webp', '@2x.webp');
      const im = images[f] || { w: 560, h: 420 }, im2 = images[f2];
      const alt = typeof m.photo === 'string' ? (im.alt || c.alt) : c.alt;
      media = `<img src="${A(from, '/assets/img/' + f)}" srcset="${A(from, '/assets/img/' + f)} ${im.w}w${im2 ? `, ${A(from, '/assets/img/' + f2)} ${im2.w}w` : ''}" sizes="${m.sizes}" width="${im.w}" height="${im.h}" alt="${esc(alt)}" style="object-position:${m.pos}" loading="lazy" decoding="async">`;
    }
    const text = c.list ? c.list.map(esc).join(' · ') : esc(c.text);
    return `<li class="bento__item${m.size ? ' bento__item--' + m.size : ''}" data-reveal style="--i:${i}">
    <a class="bento__link" href="${esc(SITE.portal)}" target="_blank" rel="noopener" data-tilt>
      <span class="bento__media">${media}</span>
      <span class="bento__glint" aria-hidden="true"></span>
      <div class="bento__body">
        <h3 class="bento__name">${esc(c.name)}</h3>
        <p class="bento__text">${text}</p>
        <span class="bento__cta">See menu ${icon.ext}</span>
      </div>
      <span class="visually-hidden"> (opens the live menu in a new tab)</span>
    </a>
  </li>`;
  }).join('\n');
  return `<ul class="bento swipe" role="list">${tiles}</ul>
<p class="swipe-hint">${icon.swipe}<span>Swipe for more</span></p>`;
}

/** Deli tickets hanging from a rail (each on its own string; the rail stays still). */
export const hangRow = (tagsHtml, style = '') =>
  `<div class="tags tags--hang swipe"${style ? ` style="${style}"` : ''}>${tagsHtml.map((t, i) => `<div class="hang" style="--i:${i}">${t}</div>`).join('')}</div>`;

export const kicker = (text, bulb = true) => `<p class="kicker">${bulb ? '<span class="kicker__bulb" aria-hidden="true"></span>' : ''}${esc(text)}</p>`;

export const orderBtn = (cls = 'btn btn--order btn--lg', label = 'Order now') =>
  `<a class="${cls}" href="${esc(SITE.portal)}" target="_blank" rel="noopener">${icon.bag}<span>${esc(label)}</span><span class="visually-hidden"> on the live menu (opens in a new tab)</span></a>`;

export const linkBtn = (from, to, label, cls = 'btn btn--ghost btn--lg') =>
  `<a class="${cls}" href="${A(from, to)}"><span>${esc(label)}</span>${icon.arrow}</a>`;

export const sectionHead = ({ kick, title, titleHtml, lede, aside = '', center = false, id }) => `<div class="section-head${center ? ' section-head--center' : ''}">
  <div class="section-head__text">
    ${kick ? kicker(kick) : ''}
    <h2 class="h2"${id ? ` id="${id}"` : ''}>${titleHtml || esc(title)}</h2>
    ${lede ? `<p class="lede">${lede}</p>` : ''}
  </div>
  ${aside}
</div>`;

/** The roadside sign: the client's logo on its blue tower, with the real bulbs lit. The tower is
 *  wide and short and carries no number plate (owner's direction 2026-11-09). */
export function sign(from, { eager = true } = {}) {
  const b = bulbs?.bulbs || [];
  const halos = b.map((x) => `<circle class="halo" cx="${x.x}" cy="${x.y}" r="${(x.r * 2.6).toFixed(1)}" style="--i:${x.i}"/>`).join('');
  const cores = b.map((x) => `<circle class="core" cx="${x.x}" cy="${x.y}" r="${(x.r * 0.92).toFixed(1)}" style="--i:${x.i}"/>`).join('');
  return `<div class="sign" aria-hidden="true">
  <div class="sign__glow"></div>
  <div class="sign__tower"></div>
  <div class="sign__board">
    <img class="sign__logo" src="${A(from, '/assets/img/logo-sign-960.webp')}" srcset="${A(from, '/assets/img/logo-sign-480.webp')} 480w, ${A(from, '/assets/img/logo-sign-960.webp')} 960w, ${A(from, '/assets/img/logo-sign-1400.webp')} 1400w" sizes="(max-width: 860px) 60vw, 500px" width="960" height="774" alt=""${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">
    <svg class="sign__bulbs" viewBox="0 0 ${bulbs?.w || 1838} ${bulbs?.h || 1482}" preserveAspectRatio="xMidYMid meet" focusable="false">
      <defs><radialGradient id="bulbHalo"><stop offset="0" style="stop-color:var(--bulb);stop-opacity:.95"/><stop offset=".35" style="stop-color:var(--bulb-glow);stop-opacity:.55"/><stop offset="1" style="stop-color:var(--bulb-glow);stop-opacity:0"/></radialGradient></defs>
      <g>${halos}</g><g>${cores}</g>
    </svg>
  </div>
</div>`;
}

/** The marquee letter board. Items are short phrases from the client's own posts and menu. */
export function ticker(items) {
  const lis = items.map((t) => `<li class="ticker__item">${t}</li>`).join('');
  return `<div class="ticker" role="region" aria-label="Deals and store highlights">
  <div class="ticker__track">
    <ul class="ticker__list">${lis}</ul>
    <ul class="ticker__list" aria-hidden="true">${lis}</ul>
  </div>
</div>`;
}

/** The thin spectrum divider ("variety in flavors"); the only place the six stripe colours appear. */
export const spectrum = () => `<div class="spectrum" aria-hidden="true"></div>`;

/** Category jar tiles (home + shop). Every one opens the live menu. */
export function jars(from, cats, { swipe = true } = {}) {
  const tiles = cats.map((c, i) => {
    let media;
    if (c.art === 'more') media = `<div class="jar__icons">${moreArt}</div>`;
    else media = `<img class="jar__img${c.mode === 'screen' ? ' jar__img--screen' : ''}" src="${A(from, '/assets/img/' + c.img)}" srcset="${A(from, '/assets/img/' + c.img)} 560w, ${A(from, '/assets/img/' + c.img2)} 896w" sizes="(max-width: 640px) 78vw, (max-width: 960px) 45vw, 290px" width="560" height="420" alt="${esc(c.alt)}" loading="lazy" decoding="async">`;
    const text = c.list ? `<p class="jar__text">${c.list.map(esc).join(' · ')}</p>` : `<p class="jar__text">${esc(c.text)}</p>`;
    return `<li class="jar" data-reveal style="--i:${i}">
    <a class="jar__link" href="${esc(SITE.portal)}" target="_blank" rel="noopener">
      <div class="jar__case">${media}</div>
      <div class="jar__label">
        <h3 class="jar__name">${esc(c.name)}</h3>
        ${text}
        <span class="jar__cta">See menu ${icon.ext}</span>
      </div>
      <span class="visually-hidden"> (opens the live menu in a new tab)</span>
    </a>
  </li>`;
  }).join('\n');
  return `<ul class="jars${swipe ? ' swipe' : ''}" role="list">${tiles}</ul>
<p class="swipe-hint">${icon.swipe}<span>Swipe for more</span></p>`;
}

/** A deli price tag. price like "$10"; per like "3.5G" */
export function tag({ kick, price, per = '', name, detail = '', foot = '', feature = false, i = 0 }) {
  const m = String(price).match(/^\$(.+)$/);
  const p = m ? `<span class="tag__cur">$</span>${esc(m[1])}` : esc(price);
  return `<article class="tag${feature ? ' tag--feature' : ''}" data-reveal style="--i:${i}">
  <span class="tag__hole" aria-hidden="true"></span>
  ${kick ? `<p class="tag__kicker">${esc(kick)}</p>` : ''}
  <p class="tag__price">${p}${per ? `<span class="tag__per">${esc(per)}</span>` : ''}</p>
  <h3 class="tag__name">${esc(name)}</h3>
  ${detail ? `<p class="tag__detail">${detail}</p>` : ''}
  ${foot ? `<p class="tag__foot">${foot}</p>` : ''}
</article>`;
}

/** Accessible tabs. panels: [{id, label, html}] */
export function tabs(id, panels, { label = 'Categories' } = {}) {
  const tl = panels.map((p, i) => `<button class="tabs__tab" role="tab" type="button" id="${id}-tab-${p.id}" aria-controls="${id}-panel-${p.id}" aria-selected="${i === 0 ? 'true' : 'false'}">${esc(p.label)}</button>`).join('');
  const ps = panels.map((p) => `<div class="tabs__panel" role="tabpanel" id="${id}-panel-${p.id}" aria-labelledby="${id}-tab-${p.id}" tabindex="0">
  <h3 class="tabs__panel-title h3">${esc(p.label)}</h3>
  ${p.html}
</div>`).join('\n');
  return `<div class="tabs" data-tabs>
  <div class="tabs__list" role="tablist" aria-label="${esc(label)}">${tl}</div>
  ${ps}
</div>`;
}

export const asof = (text = ASOF) => `<p class="asof">${icon.info}<span>${esc(text)}. The live menu is the final word.</span></p>`;

/** Store card with live status, address, hours, phone and actions. */
export function storeCard(from, { heading = true } = {}) {
  return `<div class="store-card">
  ${heading ? '<h3 class="h3">Flavors Detroit</h3>' : ''}
  <p class="status status-line" data-status data-state="unknown"><span class="status__dot" aria-hidden="true"></span><span class="status__word">Open daily</span><span class="status__detail" data-status-text>10AM–10PM</span></p>
  <div class="store-card__row">${icon.pin}<div><span class="store-card__label">Address</span><a href="${esc(SITE.mapsUrl)}" target="_blank" rel="noopener">${esc(SITE.street)}, Detroit, MI ${SITE.zip}<span class="visually-hidden"> (opens Google Maps in a new tab)</span></a></div></div>
  <div class="store-card__row">${icon.clock}<div><span class="store-card__label">Hours</span>${esc(SITE.hoursLabel)}</div></div>
  <div class="store-card__row">${icon.phone}<div><span class="store-card__label">Phone</span><a href="${SITE.tel}">${esc(SITE.phone)}</a></div></div>
  <div class="store-card__actions">
    <a class="btn btn--cream" href="${esc(SITE.directionsUrl)}" target="_blank" rel="noopener">${icon.directions}<span>Directions</span><span class="visually-hidden"> (opens Google Maps in a new tab)</span></a>
    <a class="btn btn--ghost" href="${SITE.tel}">${icon.phone}<span>Call</span></a>
  </div>
</div>`;
}

/** Mailing list form (preview: validates, never posts). */
export function mailForm(id, { night = false } = {}) {
  return `<form class="form${night ? ' on-night' : ''}" data-preview-form="Thanks! This is a design preview, so nothing was sent. On the live site this signs you up for new product alerts." novalidate>
  <div class="inline-form">
    <div class="field"><label for="${id}-email">Email address</label><input id="${id}-email" name="email" type="email" autocomplete="email" required placeholder="you@example.com"></div>
    <button class="btn btn--order" type="submit">${esc(COPY.mailButton)}</button>
  </div>
  <p class="form-note">${esc(COPY.mailNote)}</p>
  <p class="form-status" aria-live="polite"></p>
</form>`;
}

/** A card excerpt that ends on a sentence when one ends between 110 and 260 characters. */
export function excerptOf(p) {
  const text = (p.blocks || []).filter((b) => ['p', 'h2', 'h3', 'h4'].includes(b.t) && b.text && !/insert your image/i.test(b.text))
    .map((b) => b.text).join(' ').replace(/\s+/g, ' ').trim() || p.excerpt || p.title || '';
  if (text.length <= 220) return text;
  const re = /[.!?](?=\s)/g; let m;
  while ((m = re.exec(text))) { if (m.index >= 110 && m.index <= 260) return text.slice(0, m.index + 1); if (m.index > 260) break; }
  return text.slice(0, 210).replace(/\s+\S*$/, '') + '…';
}

/** News card. */
export function postCard(from, p, { i = 0, feature = false } = {}) {
  p = { ...p, excerpt: excerptOf(p) };
  const href = A(from, p.path);
  const year = (p.datePublished || '').slice(0, 4) || 'undated';
  if (feature) {
    return `<article class="post-card post-card--feature" data-year="${year}">
  <div class="post-card__board" aria-hidden="true"><span class="neon">${esc(p.dateBoard || year)}</span></div>
  <div class="stack" style="--stack:14px">
    <p class="post-card__meta"><span class="post-card__date">${esc(p.dateLabel || '')}</span><span>${esc(p.readTime || '')}</span></p>
    <h3 class="post-card__title"><a href="${href}">${esc(p.title)}</a></h3>
    <p class="post-card__excerpt">${esc(p.excerpt || '')}</p>
    <span class="post-card__more">Read the post ${icon.arrow}</span>
  </div>
</article>`;
  }
  return `<article class="post-card" data-year="${year}" data-reveal style="--i:${i % 3}">
  <p class="post-card__meta"><span class="post-card__date">${esc(p.dateLabel || '')}</span><span>${esc(p.readTime || '')}</span></p>
  <h3 class="post-card__title"><a href="${href}">${esc(p.title)}</a></h3>
  <p class="post-card__excerpt">${esc(p.excerpt || '')}</p>
  <span class="post-card__more">Read more ${icon.arrow}</span>
</article>`;
}

/** Inner-page hero. scene: a scene still name (full-bleed under a scrim) · photo: a client photo
 *  from images.json shown as a side light (right half, faded in) · quiet: a dimmer scene. */
export function pageHero(from, { kick, title, titleHtml, lede, crumbs = [], aside = '', id = 'page-title', titleClass = 'h1', scene = '', photo = '', pos = '', quiet = false, cutout = false }) {
  const bc = crumbs.length ? `<nav class="crumbs" aria-label="Breadcrumb"><a href="${A(from, '/')}">Home</a>${crumbs.map((c) => `<span aria-hidden="true">/</span>${c.path ? `<a href="${A(from, c.path)}">${esc(c.label)}</a>` : `<span aria-current="page">${esc(c.label)}</span>`}`).join('')}</nav>` : '';
  let media = '';
  if (scene) media = backdrop(from, scene, { cls: 'scene--page' + (quiet ? ' scene--quiet' : ''), eager: true, depth: '0.08', pos });
  else if (photo) {
    const im = images[photo] || {}, two = photo.replace('.webp', '@2x.webp'), im2 = images[two];
    media = `<div class="scene scene--page scene--side${cutout ? ' scene--cutout' : ''}" aria-hidden="true" data-depth="${cutout ? '-0.12' : '0.06'}"><img src="${A(from, '/assets/img/' + photo)}" srcset="${A(from, '/assets/img/' + photo)} ${im.w}w${im2 ? `, ${A(from, '/assets/img/' + two)} ${im2.w}w` : ''}" sizes="(max-width: 860px) 100vw, 55vw" width="${im.w}" height="${im.h}" alt=""${pos ? ` style="object-position:${pos}"` : ''} fetchpriority="high" decoding="async"></div>`;
  }
  return `<section class="page-hero${media ? ' page-hero--scene' : ''}${photo ? ' page-hero--side' : ''}" aria-labelledby="${id}">
  ${media}
  <div class="container page-hero__in">
    <div class="page-hero__text">
      ${bc}
      ${kick ? kicker(kick) : ''}
      <h1 class="${titleClass}" id="${id}">${titleHtml || esc(title)}</h1>
      ${lede ? `<p class="lede">${lede}</p>` : ''}
    </div>
    ${aside ? `<div class="page-hero__aside">${aside}</div>` : ''}
  </div>
</section>
<div class="bulb-rail" aria-hidden="true"></div>`;
}

export const faq = (items) => `<div class="faq">${items.map((q) => `<details><summary>${esc(q.q)}</summary><div class="faq__a">${q.a}</div></details>`).join('')}</div>`;
