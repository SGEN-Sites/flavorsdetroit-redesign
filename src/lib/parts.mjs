// parts.mjs — shared section components. Markup only; looks live in components.css and cinema.css.
import { esc, rel, icon, moreArt } from './html.mjs';
import { SITE, COPY, bulbs, menu, ASOF, gen, images, photos, catRenders, dealRenders, ownboxAssets } from '../content/site.mjs';

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
  // the buds (owner, 2026-11-09: "add more buds ... i want the bud to look more realistic and high
  // definition and place them as if they were placed naturally, some of them can go out of frame as a
  // style"): HD illustrations; one floats over the middle of the words (it was the client's own bud
  // photo, shot with a shallow focus, so half of it was soft), four rest at the top corners where the
  // band meets the Owner's Box, two of them half out of frame
  const nug = (id, cls, sizes) => {
    const r = dealRenders?.items?.[id];
    if (!r) throw new Error('bud missing from deal-renders.json: ' + id);
    const [f1, f2] = r.files;
    return `<img class="kinetic__bud ${cls}" src="${A(from, '/assets/img/' + f1.file)}" srcset="${A(from, '/assets/img/' + f1.file)} ${f1.w}w, ${A(from, '/assets/img/' + f2.file)} ${f2.w}w" sizes="${sizes}" width="${f1.w}" height="${f1.h}" alt="" data-ai="generated" loading="lazy" decoding="async">`;
  };
  return `<div class="kinetic" aria-hidden="true" data-kinetic>
  <span class="pool pool--a" data-depth="-0.1"></span><span class="pool pool--b" data-depth="-0.05"></span>
  ${row(rows[0], -1)}
  ${row(rows[1], 1)}
  ${nug('nug-1', 'kinetic__bud--main', '(max-width: 760px) 48vw, 360px')}
  ${nug('nug-3', 'kinetic__bud--tl', '(max-width: 760px) 30vw, 250px')}
  ${nug('nug-2', 'kinetic__bud--tl2', '(max-width: 760px) 16vw, 120px')}
  ${nug('nug-4', 'kinetic__bud--tr', '(max-width: 760px) 32vw, 270px')}
  ${nug('nug-5', 'kinetic__bud--tr2', '(max-width: 760px) 17vw, 135px')}
</div>`;
}

/** The navy tape that crosses the letter board. Decorative: the board carries the words. */
export function tape(items) {
  const seq = items.map((t, i) => `<span class="tape__item${i % 2 ? ' tape__item--solid' : ''}">${esc(t)}</span>`).join('');
  return `<div class="tape" aria-hidden="true"><div class="tape__track"><div class="tape__list">${seq}</div><div class="tape__list">${seq}</div></div></div>`;
}

/** Category cards (home + shop). Owner, 2026-11-09: keep the section's layout, make the cards solid
 *  colour cards, one uniformly rendered product on each (AI illustrations from one studio template,
 *  framed identically by tools/category-renders.py), the name large at the bottom left and a dark
 *  square order button at the bottom right. Each card's colour is its render's backdrop colour (a
 *  token in tokens.css), so the photo melts into the card. Every card opens the live menu.
 *  (Before: the client's flower and gummies photos and two scene stills, each framed differently.) */
export function bento(from, cats) {
  const tiles = cats.map((c, i) => {
    const r = catRenders?.items?.[c.id];
    if (!r) throw new Error('category render missing from category-renders.json: ' + c.id);
    // the cut-out: drawn at most ~440px tall, so 1x/2x density candidates
    const [f1, f2] = r.files;
    const img = `<img src="${A(from, '/assets/img/' + f1.file)}" srcset="${A(from, '/assets/img/' + f1.file)} 1x, ${A(from, '/assets/img/' + f2.file)} 2x" width="${f1.w}" height="${f1.h}" alt="${esc(r.alt)}" data-ai="generated" loading="lazy" decoding="async">`;
    const text = c.short ? esc(c.short) : c.list ? c.list.map(esc).join(' · ') : esc(c.text);   // the card's short line (site.mjs)
    return `<li class="bento__item bento__item--${esc(c.id)}" data-reveal style="--i:${i}">
    <a class="bento__link" href="${esc(SITE.portal)}" target="_blank" rel="noopener" data-tilt>
      <span class="bento__card" aria-hidden="true"><span class="bento__glint"></span></span>
      <span class="bento__media">${img}</span>
      <div class="bento__body">
        <h3 class="bento__name">${esc(c.name)}</h3>
        <p class="bento__text">${text}</p>
      </div>
      <span class="bento__cart">${icon.bag}<span class="visually-hidden">See menu</span></span>
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

/** A deal card for the home deals bento (owner, 2026-11-09: "turn these deal cards into bento
 *  layout for all categories. Include product images."). img: an id in deal-renders.json (an AI
 *  illustration of the product type, labelled); size: 'feature' (two by two, the store's blue),
 *  'small' or 'wide' (the image beside the words). detail is trusted HTML (callers escape). */
export function deal(from, { img, kick, price, per = '', name, detail = '', foot = '', size = 'small', i = 0 }) {
  const r = dealRenders?.items?.[img];
  if (!r) throw new Error('deal render missing from deal-renders.json: ' + img);
  const [f1, f2] = r.files;
  const m = String(price).match(/^\$(.+)$/);
  const p = m ? `<span class="deal__cur">$</span>${esc(m[1])}` : esc(price);
  return `<article class="deal deal--${size}" data-reveal style="--i:${i}">
  <div class="deal__media"><img src="${A(from, '/assets/img/' + f1.file)}" srcset="${A(from, '/assets/img/' + f1.file)} 1x, ${A(from, '/assets/img/' + f2.file)} 2x" width="${f1.w}" height="${f1.h}" alt="${esc(r.alt)}"${r.dataAi ? ` data-ai="${r.dataAi}"` : ''} loading="lazy" decoding="async"></div>
  <div class="deal__body">
    ${kick ? `<p class="deal__kicker">${esc(kick)}</p>` : ''}
    <p class="deal__price">${p}${per ? `<span class="deal__per">${esc(per)}</span>` : ''}</p>
    <h3 class="deal__name">${esc(name)}</h3>
    ${detail ? `<div class="deal__detail">${detail}</div>` : ''}
    ${foot ? `<p class="deal__foot">${foot}</p>` : ''}
  </div>
</article>`;
}
/** The home Owner's Box stage (owner, 2026-11-09: "add this box because I want to create an animation
 *  where the box opens and the cards will come out of it and lay across on the right side in a single
 *  row as if they are floating. smoke effect should be mystical green"). The owner's road case (closed,
 *  and opened by AI) and green smoke are decoration (aria-hidden); the strains, on holographic cards
 *  with a bud illustration each, carry the content. site.js runs the opening once it is in view.
 *  Then (owner, 2026-11-09: "more sleek and compact"; "on mobile, I want the box to be placed under the
 *  cards"): the stage holds the words and the button too, in reading order (words, cards, case, foot);
 *  the CSS grid stands the case at the left of the words and cards on wide screens, under the cards on
 *  narrow ones. The cards are compact, each bud standing out of its card's top. */
export function ownboxStage(from, strains, { head = '', foot = '' } = {}) {
  const o = ownboxAssets || {};
  const srcset = (it) => it.files.map((f) => `${A(from, '/assets/img/' + f.file)} ${f.w}w`).join(', ');
  const deco = (it, cls, sizes, extra = '') => {
    if (!it || !it.files?.length) throw new Error('Owner\'s Box image missing from ownbox-assets.json: ' + cls);
    const f = it.files[it.files.length - 1];
    return `<img class="${cls}" src="${A(from, '/assets/img/' + it.files[0].file)}" srcset="${srcset(it)}" sizes="${sizes}" width="${f.w}" height="${f.h}" alt="" loading="lazy" decoding="async"${extra}>`;
  };
  const buds = ['bud-a', 'bud-b', 'bud-c'];
  const cards = strains.map((x, i) => {
    const r = dealRenders?.items?.[buds[i % buds.length]];
    if (!r) throw new Error('bud illustration missing from deal-renders.json: ' + buds[i % buds.length]);
    const [f1, f2] = r.files;
    return `<li class="holo-slot" style="--i:${i}">
    <div class="holo" data-tilt>
      <img class="holo__bud" src="${A(from, '/assets/img/' + f1.file)}" srcset="${A(from, '/assets/img/' + f1.file)} 1x, ${A(from, '/assets/img/' + f2.file)} 2x" width="${f1.w}" height="${f1.h}" alt="${esc(r.alt)}" data-ai="generated" loading="lazy" decoding="async">
      <div class="holo__in">
        <p class="holo__top">Deli-style flower</p>
        <h3 class="holo__name">${esc(x.name)}</h3>
        <p class="holo__meta"><span class="chip">${esc(x.type)}</span>${x.thc ? `<span class="chip">THC ${esc(x.thc)}</span>` : ''}</p>
        <p class="holo__notes">${esc(x.notes)}</p>
        <p class="holo__price">${x.eighth ? `<b>${esc(x.eighth)}</b><span>an eighth</span>` : ''}${x.perGram ? `<span class="holo__gram">${esc(x.perGram)} a gram</span>` : ''}</p>
      </div>
    </div>
  </li>`;
  }).join('\n');
  return `<div class="ownbox" data-ownbox>
  ${head}
  <div class="ownbox__reveal"><ul class="ownbox__cards" role="list">${cards}</ul></div>
  <div class="ownbox__case" aria-hidden="true">
    <span class="ownbox__shadow"></span>
    <span class="ownbox__glow"></span>
    ${deco(o.smokeA, 'ownbox__smoke ownbox__smoke--a', '(max-width: 1099px) 46vw, 280px', ' data-ai="generated"')}
    ${deco(o.smokeB, 'ownbox__smoke ownbox__smoke--b', '(max-width: 1099px) 40vw, 240px', ' data-ai="generated"')}
    ${deco(o.caseClosed, 'ownbox__shut', '(max-width: 1099px) min(280px, 64vw), 320px')}
    ${deco(o.caseOpen, 'ownbox__open', '(max-width: 1099px) min(280px, 64vw), 320px', ' data-ai="edited"')}
  </div>
  ${foot}
</div>`;
}
/** The Owner's Box band's background: the owner's street photo in black and white (the fades are CSS). */
export function ownboxBackdrop(from) {
  const it = ownboxAssets?.street;
  if (!it || !it.files?.length) return '';
  const f = it.files[Math.min(1, it.files.length - 1)];
  return `<div class="ownbox__bg" aria-hidden="true"><img src="${A(from, '/assets/img/' + f.file)}" srcset="${it.files.map((x) => `${A(from, '/assets/img/' + x.file)} ${x.w}w`).join(', ')}" sizes="100vw" width="${f.w}" height="${f.h}" alt="" loading="lazy" decoding="async"></div>`;
}

/** The store gallery (owner, 2026-11-09: "can we do something like this [a concave carousel] to show the
 *  images?"): the owner's store photos hung on a wall that curves around the viewer. An original build,
 *  not the paid component: real <img>s in a list, turned in 3D by site.js (a slow drift, drag and flick
 *  with a settle, buttons, arrow keys, a horizontal swipe); without the script, a plain swipe row.
 *  panels: [{ slot, title, sub }]; slot = a store-photos.json item (5:4, cine grade). */
export function cave(from, panels) {
  const n = panels.length;
  const items = panels.map(({ slot, title, sub }, i) => {
    const it = photos?.items?.[slot];
    if (!it) throw new Error('gallery photo missing from store-photos.json: ' + slot);
    const def = it.files[Math.min(1, it.files.length - 1)];
    const edited = it.digitalSourceType === 'compositeWithTrainedAlgorithmicMedia';
    const set = it.files.map((f) => `${A(from, '/assets/img/' + f.file)} ${f.w}w`).join(', ');
    return `<li class="cave__panel" data-title="${esc(title)}" data-sub="${esc(sub)}" aria-roledescription="slide" aria-label="${i + 1} of ${n}: ${esc(title)}">
      <img src="${A(from, '/assets/img/' + def.file)}" srcset="${set}" sizes="(max-width: 760px) 62vw, 420px" width="${def.w}" height="${def.h}" alt="${esc(it.alt)}" data-photo="store"${edited ? ' data-ai="edited"' : ''} loading="${i < 3 || i === n - 1 ? 'eager' : 'lazy'}" decoding="async" draggable="false">
    </li>`;
  }).join('\n');
  return `<div class="cave" data-cave data-reveal>
  <div class="cave__stage" tabindex="0" role="group" aria-roledescription="carousel" aria-label="Photos of the store: use the arrow keys or the buttons to turn the wall">
    <ul class="cave__wall" role="list">${items}</ul>
  </div>
  <p class="cave__caption" aria-hidden="true"><b class="cave__title">${esc(panels[0].title)}</b><span class="cave__sub">${esc(panels[0].sub)}</span></p>
  <div class="cave__controls">
    <button class="cave__btn" type="button" data-cave-prev aria-label="Previous photo">${icon.chevL}</button>
    <span class="cave__count" aria-hidden="true"><b data-cave-n>01</b> / ${String(n).padStart(2, '0')}</span>
    <button class="cave__btn" type="button" data-cave-next aria-label="Next photo">${icon.chevR}</button>
  </div>
</div>`;
}

/** The bento: four cards (a feature, two small, one wide) or three (a feature, two wide). */
export const dealGrid = (cards, { many = false } = {}) => `<div class="deals deals--${cards.length}${many ? ' deals--many' : ''} swipe">${cards.join('\n')}</div>
<p class="swipe-hint">${icon.swipe}<span>Swipe for more</span></p>`;   // a carousel on phones (cinema.css)

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
export function mailForm(id, { night = false, pill = false } = {}) {
  // pill (home strip, owner's option A 2026-11-09): input + button in one rounded bar, label read by screen readers only
  if (pill) return `<form class="form on-night" data-preview-form="Thanks! This is a design preview, so nothing was sent. On the live site this signs you up for new product alerts." novalidate>
  <label class="visually-hidden" for="${id}-email">Email address</label>
  <div class="pill-form"><input id="${id}-email" name="email" type="email" autocomplete="email" required placeholder="you@example.com"><button class="btn btn--order" type="submit">${esc(COPY.mailButton)}</button></div>
  <p class="form-note">${esc(COPY.mailNote)}</p>
  <p class="form-status" aria-live="polite"></p>
</form>`;
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
export function pageHero(from, { kick, title, titleHtml, lede, crumbs = [], aside = '', id = 'page-title', titleClass = 'h1', scene = '', photo = '', pos = '', quiet = false, cutout = false, whole = '' }) {
  const bc = crumbs.length ? `<nav class="crumbs" aria-label="Breadcrumb"><a href="${A(from, '/')}">Home</a>${crumbs.map((c) => `<span aria-hidden="true">/</span>${c.path ? `<a href="${A(from, c.path)}">${esc(c.label)}</a>` : `<span aria-current="page">${esc(c.label)}</span>`}`).join('')}</nav>` : '';
  let media = '';
  // whole: a scene still shown uncropped at the side (object-fit contain), e.g. the /learn/ HD bud (owner, 2026-11-09)
  if (whole) media = `<div class="scene scene--page scene--side scene--whole" aria-hidden="true" data-depth="0.06">${scenePicture(from, whole, { sizes: '(max-width: 860px) 100vw, 60vw', eager: true })}</div>`;
  else if (scene) media = backdrop(from, scene, { cls: 'scene--page' + (quiet ? ' scene--quiet' : ''), eager: true, depth: '0.08', pos });
  else if (photo) {
    const im = images[photo] || {}, two = photo.replace('.webp', '@2x.webp'), im2 = images[two];
    media = `<div class="scene scene--page scene--side${cutout ? ' scene--cutout' : ''}" aria-hidden="true" data-depth="${cutout ? '-0.12' : '0.06'}"><img src="${A(from, '/assets/img/' + photo)}" srcset="${A(from, '/assets/img/' + photo)} ${im.w}w${im2 ? `, ${A(from, '/assets/img/' + two)} ${im2.w}w` : ''}" sizes="(max-width: 860px) 100vw, 55vw" width="${im.w}" height="${im.h}" alt=""${pos ? ` style="object-position:${pos}"` : ''} fetchpriority="high" decoding="async"></div>`;
  }
  return `<section class="page-hero${media ? ' page-hero--scene' : ''}${photo || whole ? ' page-hero--side' : ''}" aria-labelledby="${id}">
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

/** The slim mailing-list + Instagram strip (owner's option A, 2026-11-09; home, /contact/, /blog/). seam: the home
 *  version, where the spectrum line runs behind the strip's middle and the lower half is the next band's white. */
export function mailStrip(from, { id, key, seam = false }) {
  const title = esc(COPY.mailTitle).replace(/ today!$/, ' <span class="accent">today!</span>');
  return `${seam ? '' : spectrum()}
<section class="band band--black loop${seam ? '' : ' loop--plain'}" aria-labelledby="${id}">
  <div class="container">
    <div class="loop__strip" data-reveal>
      <div class="loop__head">
        ${kicker('New product alerts')}
        <h2 class="loop__title" id="${id}">${title}</h2>
        <p class="loop__sub">${esc(COPY.mailSub)}.</p>
      </div>
      ${mailForm(key, { pill: true })}
      <a class="loop__social" href="${esc(SITE.instagram)}" target="_blank" rel="noopener">
        <span class="loop__social-ico" aria-hidden="true">${icon.insta}</span>
        <span><small>${esc(COPY.socialFollow)}</small><strong>${esc(SITE.instagramHandle)}</strong></span>
        <span class="visually-hidden"> on Instagram (opens in a new tab)</span>
      </a>
    </div>
  </div>
</section>`;
}

/** "Ask a budtender" questions (owner, 2026-11-09, /visit/ then /learn/): equal question pills (tabs) beside the
 *  top half of a phone rising from the band's bottom edge, the answer as a chat reply from Flavors. Every answer is
 *  in the HTML (without JavaScript they all show). items: [{ q, a (HTML), icon }]; key keeps the ids unique. */
export function askBudtender(from, { key, id, kick = 'Questions', titleHtml, items }) {
  const tab = (x, n) => `<button class="askb__chip" type="button" role="tab" id="${key}-tab-${n}" aria-controls="${key}-panel-${n}" aria-selected="${n === 0}" tabindex="${n === 0 ? 0 : -1}"><span class="askb__ico" aria-hidden="true">${icon[x.icon] || icon.chat}</span><span>${esc(x.q)}</span></button>`;
  const panel = (x, n) => `<div class="askb__panel" role="tabpanel" id="${key}-panel-${n}" aria-labelledby="${key}-tab-${n}"${n ? ' hidden' : ''}>
          <div class="msg msg--q"><p>${esc(x.q)}</p></div>
          <div class="msg msg--a">${x.a}</div>
        </div>`;
  return `<section class="band band--black band--askb" aria-labelledby="${id}">
  <div class="container">
    ${sectionHead({ kick, id, titleHtml })}
    <div class="askb" data-askb>
      <div class="askb__chips" role="tablist" aria-label="Questions">${items.map(tab).join('')}</div>
      <div class="askb__phone">
        <div class="askb__screen">
          <div class="askb__status" aria-hidden="true"><span>10:00</span><span class="askb__island"></span><span class="askb__sys"><i class="askb__sig"></i><i class="askb__bat"></i></span></div>
          <div class="askb__head" aria-hidden="true"><span class="askb__back">${icon.chevL}</span><img src="${A(from, '/assets/img/logo-sign-240.webp')}" width="240" height="194" alt="" loading="lazy" decoding="async"><span><strong>Flavors Detroit</strong><small>5700 E 8 Mile Rd</small></span></div>
          <div class="askb__chat">${items.map(panel).join('')}</div>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

export const faq = (items) => `<div class="faq">${items.map((q) => `<details><summary>${esc(q.q)}</summary><div class="faq__a">${q.a}</div></details>`).join('')}</div>`;
