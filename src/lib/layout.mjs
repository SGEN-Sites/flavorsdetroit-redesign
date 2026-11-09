// layout.mjs — the page shell every page shares: head, utility bar, masthead, drawer,
// footer, phone dock and age gate. All URLs are relative to the page (rel()), so the build
// serves from a domain root or a GitHub Pages subpath.
import { esc, rel, icon, ext } from './html.mjs';
import { SITE, NAV, COPY } from '../content/site.mjs';

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
<meta name="theme-color" content="#060a17">
<link rel="icon" href="${A(path, '/assets/img/favicon.ico')}" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="${A(path, '/assets/img/favicon-32.png')}">
<link rel="apple-touch-icon" href="${A(path, '/assets/img/apple-touch-icon.png')}">
<link rel="preload" href="${A(path, '/assets/fonts/big-shoulders-display.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${A(path, '/assets/fonts/instrument-sans.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${css}">
<script>(function(d){var r=d.documentElement;r.classList.add('js');if(${o.gateExempt ? 'true' : 'false'})return;try{var v=localStorage.getItem('flavors-age-ok')||'',t=parseInt(v.split('|')[1]||'0',10);if(v.charAt(0)!=='1'||(t&&Date.now()-t>2592e6))r.classList.add('gate-open');}catch(e){r.classList.add('gate-open');}setTimeout(function(){if(!window.__flavorsReady)r.classList.remove('gate-open');},4000);})(document);</script>
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head>`;
}

function utility(path) {
  return `<div class="utility">
  <div class="container utility__in">
    <a class="status" data-status href="${A(path, '/visit/')}" data-state="unknown"><span class="status__dot" aria-hidden="true"></span><span class="status__word">Open daily</span><span class="status__detail" data-status-text>10AM–10PM</span></a>
    <span class="utility__spacer"></span>
    <a class="utility__link utility__addr" href="${esc(SITE.mapsUrl)}" target="_blank" rel="noopener">${icon.pin}<span>${esc(SITE.street)}, Detroit</span><span class="visually-hidden"> (opens Google Maps in a new tab)</span></a>
    <a class="utility__link" href="${SITE.tel}">${icon.phone}<span>${esc(SITE.phone)}</span></a>
    <a class="utility__link utility__ig" href="${esc(SITE.instagram)}" target="_blank" rel="noopener">${icon.insta}<span>${esc(SITE.instagramHandle)}</span><span class="visually-hidden"> on Instagram (opens in a new tab)</span></a>
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
<div class="rainbow-rule" aria-hidden="true"></div>`;
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
        <span class="preview-pill">Redesign preview, not the official Flavors Detroit website · menu links open the live menu</span>
      </div>
    </div>
  </div>
</footer>`;
}

function dock() {
  return `<nav class="dock" aria-label="Quick actions">
  <a class="btn btn--order" href="${esc(SITE.portal)}" target="_blank" rel="noopener">${icon.bag}<span>Order now</span><span class="visually-hidden"> on the live menu (opens in a new tab)</span></a>
  <a class="dock__icon" href="${SITE.tel}" aria-label="Call Flavors Detroit, ${esc(SITE.phone)}">${icon.phone}</a>
  <a class="dock__icon" href="${esc(SITE.directionsUrl)}" target="_blank" rel="noopener" aria-label="Directions to ${esc(SITE.addressLine)} (opens Google Maps in a new tab)">${icon.directions}</a>
</nav>`;
}

function ageGate(path) {
  return `<div class="age-gate" id="age-gate" hidden role="dialog" aria-modal="true" aria-labelledby="gate-title" aria-describedby="gate-text">
  <div class="age-gate__ground" aria-hidden="true"></div>
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

/**
 * page({ path, title, description, main, jsonld, ogType, canonicalPath, noindex })
 * `path` is the page's own site path ("/", "/daily-deals/", "/post/x/", "/404.html").
 */
export function page(o) {
  const canonical = SITE.liveOrigin + (o.canonicalPath ?? o.path).replace(/index\.html$/, '');
  return `${head({ ...o, canonical })}
<body data-hours="${SITE.hoursAttr}" data-tz="${SITE.tz}"${o.gateExempt ? ' data-gate-exempt' : ''}>
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
