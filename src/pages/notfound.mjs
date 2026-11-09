// notfound.mjs — /404.html. GitHub Pages serves this file for any missing URL at any depth, so
// the page carries a <base href> pointing at the site root and is generated as if it lived at
// "/" (every relative URL then resolves from the root). The build passes the root in via
// SITE_BASE ("/" by default, "/<repo>/" for a GitHub Pages project preview).
import { rel, icon } from '../lib/html.mjs';
import { page } from '../lib/layout.mjs';
import { SITE } from '../content/site.mjs';
import { kicker, orderBtn, linkBtn, sign } from '../lib/parts.mjs';

export const PATH = '/404.html';

export function render() {
  const base = process.env.SITE_BASE || '/';
  const main = `<section class="lost band--night band--lit" aria-labelledby="lost-title" style="--lx: 75%; --ly: 30%">
  <div class="container lost__in">
    <div class="stack" style="--stack:18px">
      ${kicker('Page not found')}
      <h1 class="h1" id="lost-title">This page took a wrong turn off <span class="accent">8 Mile</span>.</h1>
      <p class="lede">The page you are looking for is not here. Try the live menu, today's deals, or head back home.</p>
      <div class="cluster">
        ${orderBtn('btn btn--order btn--lg', 'Order now')}
        ${linkBtn('/', '/daily-deals/', "Today's deals")}
        ${linkBtn('/', '/', 'Back home')}
      </div>
    </div>
    <div>${sign('/', { plate: true, flicker: true })}</div>
  </div>
</section>`;
  let html = page({
    path: '/',
    canonicalPath: '/404',
    title: 'Page not found | Flavors Detroit',
    description: 'This page could not be found. Visit Flavors Detroit at 5700 E 8 Mile Rd, Detroit, or shop the live menu.',
    main,
  });
  html = html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<base href="${base}">\n<meta name="robots" content="noindex">`);
  // the neon plate reads 404 here instead of the street number
  html = html.replace('<span class="neon" data-flicker>5700</span>', '<span class="neon" data-flicker>404</span>');
  return html;
}
