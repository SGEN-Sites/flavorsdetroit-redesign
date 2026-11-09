// parts.mjs — shared section components. Markup only; looks live in components.css.
import { esc, rel, icon, moreArt } from './html.mjs';
import { SITE, COPY, bulbs, menu, ASOF } from '../content/site.mjs';

const A = rel;

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

/** The roadside sign: the client's logo on its royal-blue tower, with the real bulbs lit. */
export function sign(from, { plate = true, flicker = true, eager = true } = {}) {
  const b = bulbs?.bulbs || [];
  const halos = b.map((x) => `<circle class="halo" cx="${x.x}" cy="${x.y}" r="${(x.r * 2.6).toFixed(1)}" style="--i:${x.i}"/>`).join('');
  const cores = b.map((x) => `<circle class="core" cx="${x.x}" cy="${x.y}" r="${(x.r * 0.92).toFixed(1)}"/>`).join('');
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
  ${plate ? `<div class="sign__plate"><span class="neon"${flicker ? ' data-flicker' : ''}>5700</span></div>` : ''}
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

export const awning = (flip = false) => `<div class="awning${flip ? ' awning--flip' : ''}" aria-hidden="true"></div>`;

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

// Placeholder art: simple, clearly illustrative scenes in the brand's own vocabulary, labelled
// "photo coming soon". They hold the layout until the owner supplies real store photos.
function counterArt() {
  const jars = [0, 1, 2, 3, 4, 5].map((i) => {
    const x = 34 + i * 58;
    const fillH = [44, 38, 48, 34, 42, 46][i];
    return `<g><rect class="jar-lid" x="${x + 6}" y="112" width="34" height="11" rx="3"/><rect class="jar-body" x="${x}" y="122" width="46" height="74" rx="11"/><rect class="jar-fill" x="${x + 4}" y="${192 - fillH}" width="38" height="${fillH}" rx="8"/><rect class="jar-shine" x="${x + 8}" y="130" width="5" height="44" rx="2.5"/><rect class="jar-tag" x="${x + 12}" y="158" width="22" height="13" rx="2"/></g>`;
  }).join('');
  return `<svg viewBox="0 0 400 320" preserveAspectRatio="xMidYMax slice" focusable="false"><line class="wall-line" x1="0" y1="92" x2="400" y2="92"/><ellipse class="glow" cx="200" cy="312" rx="196" ry="30"/>${jars}<rect class="counter-top" x="-10" y="194" width="420" height="12"/><rect class="counter" x="-10" y="206" width="420" height="92"/><rect class="counter-glass" x="-10" y="206" width="420" height="8"/><line class="led" x1="-10" y1="298" x2="410" y2="298"/></svg>`;
}
function storefrontArt() {
  const n = 18, w = 400 / n;
  const stripes = Array.from({ length: n }, (_, i) => `<rect class="s${(i % 6) + 1}" x="${(i * w).toFixed(2)}" y="38" width="${Math.min(w + 0.4, 400 - i * w).toFixed(2)}" height="40"/><circle class="s${(i % 6) + 1}" cx="${(i * w + w / 2).toFixed(2)}" cy="78" r="${(w / 2).toFixed(2)}"/>`).join('');
  return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" focusable="false"><rect class="wall" x="0" y="0" width="400" height="300"/><rect class="window-glow" x="24" y="92" width="262" height="138" rx="6"/><rect class="window" x="38" y="104" width="234" height="114" rx="3"/><rect class="counter-in" x="38" y="186" width="234" height="32"/><line class="led" x1="38" y1="218" x2="272" y2="218"/><line class="mullion" x1="116" y1="104" x2="116" y2="218"/><line class="mullion" x1="194" y1="104" x2="194" y2="218"/><rect class="window" x="292" y="112" width="58" height="106" rx="3"/><line class="mullion" x1="321" y1="112" x2="321" y2="218"/>${stripes}<rect class="awn-shade" x="0" y="38" width="400" height="6"/><path class="cross" d="M362 96h14v14h14v14h-14v14h-14v-14h-14v-14h14z"/><rect class="ground" x="0" y="226" width="400" height="74"/></svg>`;
}

/** Labelled placeholder until real store photos are supplied. kind: counter | storefront | sign */
export function placeholder(kind, label, ar) {
  const art = kind === 'counter' ? counterArt() : kind === 'storefront' ? storefrontArt() : '';
  return `<div class="ph ph--${kind}" role="img" aria-label="${esc(label)}"${ar ? ` style="--ar:${ar}"` : ''}>
  <div class="ph__art" aria-hidden="true">${art}</div>
  <span class="ph__label">${icon.camera}<span>${esc(label)}</span></span>
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

/** Inner-page hero. */
export function pageHero(from, { kick, title, titleHtml, lede, crumbs = [], aside = '', id = 'page-title', titleClass = 'h1' }) {
  const bc = crumbs.length ? `<nav class="crumbs" aria-label="Breadcrumb"><a href="${A(from, '/')}">Home</a>${crumbs.map((c) => `<span aria-hidden="true">/</span>${c.path ? `<a href="${A(from, c.path)}">${esc(c.label)}</a>` : `<span aria-current="page">${esc(c.label)}</span>`}`).join('')}</nav>` : '';
  return `<section class="page-hero" aria-labelledby="${id}">
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
