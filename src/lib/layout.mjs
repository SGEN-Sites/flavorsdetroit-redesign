// layout.mjs — the page shell every page shares: head, utility bar, masthead, drawer,
// footer, phone dock and age gate. All URLs are relative to the page (rel()), so the build
// serves from a domain root or a GitHub Pages subpath.
import { esc, rel, icon, ext } from './html.mjs';
import { SITE, NAV, COPY, bulbs } from '../content/site.mjs';
import { scenePicture, sparks } from './parts.mjs';

const A = (from, p) => rel(from, p);

function head(o) {
  const { path, title, description, canonical, ogType = 'website', jsonld = [], noindex, image } = o;
  const css = A(path, '/assets/css/site.css');
  const ogImg = SITE.liveOrigin + '/assets/img/og-flavors-detroit.jpg';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<meta property="og:type" content="${esc(ogType)}">
<meta property="og:site_name" content="Flavors Detroit">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(image || ogImg)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#08090b">
<link rel="icon" href="${A(path, '/assets/img/favicon.ico')}" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="${A(path, '/assets/img/favicon-32.png')}">
<link rel="apple-touch-icon" href="${A(path, '/assets/img/apple-touch-icon.png')}">
<link rel="preload" href="${A(path, '/assets/fonts/jockey-one.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${A(path, '/assets/fonts/barlow-400.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${css}">
<script>(function(d){var r=d.documentElement,ex=${o.gateExempt ? 'true' : 'false'};r.classList.add('js');try{var calm=matchMedia('(prefers-reduced-motion: reduce)').matches||localStorage.getItem('flavors-motion')==='off';if(!calm&&!ex&&!sessionStorage.getItem('flavors-splash')){r.classList.add('splash-on');sessionStorage.setItem('flavors-lit','1');}else if(!calm&&!sessionStorage.getItem('flavors-lit'))r.classList.add('pre-ignite');}catch(e){}setTimeout(function(){if(!window.__flavorsReady)r.classList.remove('gate-open','pre-ignite','splash-on');},4000);if(ex)return;try{var v=localStorage.getItem('flavors-age-ok')||'',t=parseInt(v.split('|')[1]||'0',10);if(v.charAt(0)!=='1'||(t&&Date.now()-t>2592e6))r.classList.add('gate-open');}catch(e){r.classList.add('gate-open');}})(document);</script>
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head>`;
}

function utility(path) {
  return `<div class="utility">
  <div class="container utility__in">
    <a class="status" data-status href="${A(path, '/visit/')}" data-state="unknown"><span class="status__dot" aria-hidden="true"></span><span class="status__word">Open daily</span><span class="status__detail" data-status-text>10AM–10PM</span></a>
    <span class="utility__spacer"></span>
    <a class="utility__link utility__addr" href="${esc(SITE.mapsUrl)}" target="_blank" rel="noopener">${icon.pin}<span>${esc(SITE.street)}, Detroit</span><span class="visually-hidden"> (opens Google Maps in a new tab)</span></a>
    <a class="utility__link utility__phone" href="${SITE.tel}">${icon.phone}<span>${esc(SITE.phone)}</span></a>
    <a class="utility__link utility__ig" href="${esc(SITE.instagram)}" target="_blank" rel="noopener">${icon.insta}<span>${esc(SITE.instagramHandle)}</span><span class="visually-hidden"> on Instagram (opens in a new tab)</span></a>
    <button class="motion-toggle" type="button" data-motion-toggle aria-pressed="false" hidden><svg class="motion-toggle__pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg><svg class="motion-toggle__play" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7z"/></svg><span class="motion-toggle__label">Pause motion</span></button>
  </div>
</div>`;
}

function masthead(path) {
  const items = NAV.map((n) => `<li><a href="${A(path, n.path)}"${path === n.path || (n.path === '/blog/' && path.startsWith('/post/')) ? ' aria-current="page"' : ''}>${esc(n.label)}</a></li>`).join('');
  return `<div class="masthead">
  <div class="container masthead__in">
    <a class="brand" href="${A(path, '/')}" aria-label="Flavors Detroit, home"><span class="brand__tower"><img src="${A(path, '/assets/img/logo-sign-240.webp')}" srcset="${A(path, '/assets/img/logo-sign-240.webp')} 240w, ${A(path, '/assets/img/logo-sign-480.webp')} 480w" sizes="118px" width="240" height="194" alt="Flavors Detroit"></span></a>
    <nav class="nav" aria-label="Main"><ul>${items}</ul></nav>
    <div class="masthead__actions">
      <a class="btn btn--order" href="${esc(SITE.portal)}" target="_blank" rel="noopener">${icon.bag}<span>Order now</span><span class="visually-hidden"> on the live menu (opens in a new tab)</span></a>
      <button class="menu-btn" type="button" data-menu-open aria-expanded="false" aria-controls="drawer">${icon.menu}<span>Menu</span></button>
    </div>
  </div>
</div>
<div class="rainbow-rule" aria-hidden="true"><span class="rainbow-rule__fill"></span></div>`;
}

function drawer(path) {
  const items = NAV.map((n) => `<li><a href="${A(path, n.path)}"${path === n.path ? ' aria-current="page"' : ''}>${esc(n.label)}${icon.arrow}</a></li>`).join('');
  return `<div class="drawer" id="drawer" data-open="false" aria-hidden="true">
  <button class="drawer__scrim" type="button" data-menu-close tabindex="-1" aria-label="Close menu"></button>
  <div class="drawer__panel" role="dialog" aria-modal="true" aria-label="Site menu">
    <div class="drawer__top">
      <a class="status" data-status href="${A(path, '/visit/')}" data-state="unknown"><span class="status__dot" aria-hidden="true"></span><span class="status__word">Open daily</span><span class="status__detail" data-status-text>10AM–10PM</span></a>
      <button class="drawer__close" type="button" data-menu-close aria-label="Close menu">${icon.close}</button>
    </div>
    <a class="btn btn--order btn--lg btn--block" href="${esc(SITE.portal)}" target="_blank" rel="noopener">${icon.bag}<span>Order now</span><span class="visually-hidden"> on the live menu (opens in a new tab)</span></a>
    <nav class="drawer__nav" aria-label="Menu"><ul class="drawer__list">${items}</ul></nav>
    <div class="drawer__facts">
      <a href="${esc(SITE.mapsUrl)}" target="_blank" rel="noopener">${icon.pin}<span>${esc(SITE.addressLine)}</span><span class="visually-hidden"> (opens Google Maps in a new tab)</span></a>
      <a href="${SITE.tel}">${icon.phone}<span>${esc(SITE.phone)}</span></a>
      <span class="fact">${icon.clock}<span>${esc(SITE.hoursLabel)}</span></span>
      <a href="${esc(SITE.instagram)}" target="_blank" rel="noopener">${icon.insta}<span>${esc(SITE.instagramHandle)}</span><span class="visually-hidden"> on Instagram (opens in a new tab)</span></a>
    </div>
  </div>
</div>`;
}

function footer(path) {
  const col = (title, links) => `<div><h2 class="footer__h">${esc(title)}</h2><ul class="footer__list">${links.join('')}</ul></div>`;
  const li = (p, label) => `<li><a href="${A(path, p)}">${esc(label)}</a></li>`;
  return `<footer class="site-footer">
  <div class="footer__neon" aria-hidden="true">5700</div>
  <div class="container">
    <div class="footer__main">
      <div class="footer__brand">
        <a href="${A(path, '/')}" aria-label="Flavors Detroit, home"><img src="${A(path, '/assets/img/logo-sign-480.webp')}" width="480" height="387" alt="Flavors Detroit" loading="lazy" decoding="async"></a>
        <p class="footer__tag">${esc(COPY.tagline)}.</p>
      </div>
      ${col('Shop', [
        `<li><a href="${esc(SITE.portal)}" target="_blank" rel="noopener">Live menu ${icon.ext}<span class="visually-hidden"> (opens in a new tab)</span></a></li>`,
        li('/shop/', 'Shop'), li('/daily-deals/', 'Daily deals'), li('/owners-box/', "The Owner's Box")])}
      ${col('Flavors Detroit', [li('/visit/', 'Visit us'), li('/learn/', 'Learn'), li('/blog/', 'Flavors news'), li('/contact/', 'Contact')])}
      <div class="footer__visit">
        <h2 class="footer__h">Visit</h2>
        <a href="${esc(SITE.mapsUrl)}" target="_blank" rel="noopener">${icon.pin}<span>${esc(SITE.street)}<br>Detroit, MI ${SITE.zip}</span><span class="visually-hidden"> (opens Google Maps in a new tab)</span></a>
        <span class="fact">${icon.clock}<span>${esc(SITE.hoursLabel)}</span></span>
        <a href="${SITE.tel}">${icon.phone}<span>${esc(SITE.phone)}</span></a>
        <a href="${esc(SITE.instagram)}" target="_blank" rel="noopener">${icon.insta}<span>${esc(SITE.instagramHandle)}</span><span class="visually-hidden"> on Instagram (opens in a new tab)</span></a>
      </div>
    </div>
    <div class="footer__legal">
      <p class="footer__warning">${esc(COPY.compliance)}</p>
      <div class="footer__legal-row">
        <span>© ${SITE.year} Flavors Detroit · <a href="${A(path, '/terms-of-service/')}">Terms of service</a></span>
        <span class="preview-pill">Redesign preview, not the official Flavors Detroit website · menu links open the live menu · store photos are the store's own, some retouched or relit with AI · scene images are AI illustrations, not photos of the store</span>
      </div>
    </div>
  </div>
  <div class="footer__mark" aria-hidden="true" data-finale><span class="pool pool--a"></span>${sparks(12, 7)}<span class="footer__bulbs"></span><span class="footer__word">Flavors</span></div>
</footer>`;
}

function dock() {
  return `<nav class="dock" aria-label="Quick actions">
  <a class="btn btn--order" href="${esc(SITE.portal)}" target="_blank" rel="noopener">${icon.bag}<span>Order now</span><span class="visually-hidden"> on the live menu (opens in a new tab)</span></a>
  <a class="dock__icon" href="${SITE.tel}" aria-label="Call Flavors Detroit, ${esc(SITE.phone)}">${icon.phone}</a>
  <a class="dock__icon" href="${esc(SITE.directionsUrl)}" target="_blank" rel="noopener" aria-label="Directions to ${esc(SITE.addressLine)} (opens Google Maps in a new tab)">${icon.directions}</a>
</nav>
<a class="to-top" href="#main" data-to-top aria-label="Back to top"><svg viewBox="0 0 48 48" aria-hidden="true"><circle class="to-top__track" cx="24" cy="24" r="21"/><circle class="to-top__ring" cx="24" cy="24" r="21" pathLength="100"/><path class="to-top__arrow" d="M24 31V17M17.5 23.5 24 17l6.5 6.5"/></svg></a>`;
}

function ageGate(path) {
  return `<div class="age-gate" id="age-gate" hidden role="dialog" aria-modal="true" aria-labelledby="gate-title" aria-describedby="gate-text">
  <div class="age-gate__ground" aria-hidden="true">${scenePicture(path, 'hero-night-b', { sizes: '100vw' })}</div>
  <div class="age-gate__panel">
    <img class="age-gate__sign" src="${A(path, '/assets/img/logo-sign-480.webp')}" width="480" height="387" alt="Flavors Detroit">
    <h2 class="age-gate__title" id="gate-title">${esc(COPY.gateTitle)}</h2>
    <p class="age-gate__text" id="gate-text">${esc(COPY.gateText)} <a href="${A(path, '/terms-of-service/')}">Terms of Service</a>?</p>
    <div class="age-gate__actions">
      <button class="btn btn--order btn--lg" type="button" data-gate-yes="adult">I'm 21 or older</button>
      <button class="btn btn--cream btn--lg" type="button" data-gate-yes="medical">I'm a medical patient</button>
    </div>
    <a class="age-gate__exit" href="${esc(SITE.exitUrl)}">Exit site</a>
    <p class="age-gate__note fine">We'll remember your answer on this device for 30 days.</p>
  </div>
</div>`;
}

// The splash, "Sign ignition" (owner's choice 2026-11-09, design-options/splash concept 1): on the
// first page of a session the 53 bulbs light round the cloud on black, the sign and its wide, short
// blue tower come up and hold, then it lifts away (to the age gate on a first visit). The
// head script decides before first paint (never under reduced motion, paused motion or without JS).
// Bulb centres: the logo's measured bulbs (logo-bulbs.json), in % of the logo box, in chase order.
const SPLASH_BULBS = (bulbs?.bulbs || []).slice().sort((a, b) => a.i - b.i)
  .map((b) => `${(b.x / bulbs.w * 100).toFixed(2)},${(b.y / bulbs.h * 100).toFixed(2)}`).join(';');
function splash(path) {
  return `<div class="splash" id="splash" aria-hidden="true" data-duration="2300">
  <div class="splash__scene" data-exit="splash-lift">
    <div class="splash__rig">
      <div class="splash__glow"></div>
      <div class="splash__tower"></div>
      <div class="splash__board">
        <img class="splash__logo" src="${A(path, '/assets/img/logo-sign-960.webp')}" srcset="${A(path, '/assets/img/logo-sign-960.webp')} 960w, ${A(path, '/assets/img/logo-sign-1400.webp')} 1400w" sizes="(max-width: 720px) 80vw, 540px" width="960" height="774" alt="" decoding="async">
        <div class="splash__bulbs" data-bulbs="${SPLASH_BULBS}"></div>
      </div>
    </div>
    <div class="splash__edge"></div>
  </div>
</div>`;
}

/**
 * page({ path, title, description, main, jsonld, ogType, canonicalPath, noindex })
 * `path` is the page's own site path ("/", "/daily-deals/", "/post/x/", "/404.html").
 */
export function page(o) {
  const canonical = SITE.liveOrigin + (o.canonicalPath ?? o.path).replace(/index\.html$/, '');
  return `${head({ ...o, canonical })}
<body data-hours="${SITE.hoursAttr}" data-tz="${SITE.tz}"${o.gateExempt ? ' data-gate-exempt' : ''}>
${o.gateExempt ? '' : splash(o.path)}
<div id="page">
<div id="content">
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
${utility(o.path)}
${masthead(o.path)}
</header>
<main id="main">
${o.main}
</main>
${footer(o.path)}
${dock()}
</div>
${drawer(o.path)}
</div>
${o.gateExempt ? '' : ageGate(o.path)}
<script src="${A(o.path, '/assets/js/site.js')}" defer></script>
</body>
</html>
`;
}
