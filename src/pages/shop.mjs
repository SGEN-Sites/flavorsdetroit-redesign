// shop.mjs — /shop/. The live menu (flavors-detroit.portal42.com) refuses to be framed
// (X-Frame-Options: SAMEORIGIN) and its category paths answer "Page not found", so this page
// hands off to the menu home, which works, and explains what is on it.
import { esc, rel, icon } from '../lib/html.mjs';
import { page } from '../lib/layout.mjs';
import { SITE, COPY, menu } from '../content/site.mjs';
import { kicker, orderBtn, linkBtn, sectionHead, pageHero, bento, tag, spectrum, deal, dealGrid } from '../lib/parts.mjs';
import { breadcrumbJsonLd } from '../lib/seo.mjs';

export const PATH = '/shop/';
const A = (p) => rel(PATH, p);

// The live menu's own category list (PORTAL, captured 2026-11-08)
const PORTAL_CATS = ['Flower', 'Pre-rolls', 'Infused pre-rolls', 'Vapes', 'Edibles', 'Concentrates', 'Drinks', 'Topicals', 'Accessories', 'Paraphernalia'];
const CAT_ICON = { Flower: icon.leaf, 'Pre-rolls': icon.ruler, 'Infused pre-rolls': icon.spark, Vapes: icon.cart, Edibles: icon.jar, Concentrates: icon.drop, Drinks: icon.can, Topicals: icon.bottle, Accessories: icon.bag, Paraphernalia: icon.store };

function hero() {
  return pageHero(PATH, {
    kick: 'Live menu',
    titleHtml: 'Shop the <span class="accent">live menu</span>',
    lede: `${esc(COPY.portalLine)} Browse every shelf online any time, then pick up your order at ${esc(SITE.street)}.`,
    crumbs: [{ label: 'Shop' }],
    photo: 'cat-flower.webp', cutout: true, pos: '50% 50%',   // the client's own bud, floating
    aside: `<div class="stack" style="--stack:12px; justify-items:start">${orderBtn('btn btn--order btn--lg', 'Open the live menu')}<p class="status status-line" data-status data-state="unknown"><span class="status__dot" aria-hidden="true"></span><span class="status__word">Open daily</span><span class="status__detail" data-status-text>10AM–10PM</span></p></div>`,
  });
}

function shelves() {
  // The live menu has no per-category URLs (its paths answer "Page not found"), so the shelves are
  // shown as a list of what is on the menu, with one honest button that opens it.
  const tiles = PORTAL_CATS.map((c, i) => `<li class="shelf-item" data-reveal style="--i:${i % 5}"><span class="shelf-link__icon">${CAT_ICON[c] || icon.leaf}</span><span class="shelf-link__name">${esc(c)}</span></li>`).join('');
  // dark version (owner, 2026-11-09: "turn this section from shop page to be the dark version")
  return `${spectrum()}
<section class="band band--black shelves-dark" aria-labelledby="shelves-title">
  <div class="container">
    ${sectionHead({ kick: 'What is on the menu', id: 'shelves-title', titleHtml: 'Every <span class="accent">shelf</span>, one menu', lede: 'The live menu opens on everything; tap a shelf at the top of the menu to narrow it down.', aside: orderBtn('btn btn--order btn--lg', 'Open the live menu') })}
    <ul class="shelf-grid" role="list">${tiles}</ul>
  </div>
</section>`;
}

function categoriesBand() {
  return `<section class="band band--black band--flavors" aria-labelledby="flavors-title">
  <div class="container">
    ${sectionHead({ kick: 'Shop by category', id: 'flavors-title', titleHtml: 'Our <span class="accent">flavors</span>', lede: esc(COPY.deli) })}
    ${bento(PATH, COPY.categories)}
  </div>
</section>`;
}

function how() {
  // icons and depth (owner, 2026-11-09: "update this section to have icons and look less flat"); words unchanged
  const steps = [['menu', 'Browse the live menu', 'Online orders any time, on every shelf.'],
    ['bag', 'Order for pickup', esc(COPY.portalLine)],
    ['pin', 'Pick up at 5700', `Pickup in store at ${esc(SITE.street)}. Bring a valid ID at pickup.`]];
  // spectrum dividers on its top and bottom edges (owner, 2026-11-09)
  return `${spectrum()}
<section class="band band--navy" aria-labelledby="how-title">
  <div class="container">
    ${sectionHead({ kick: 'Order ahead', id: 'how-title', titleHtml: 'How ordering <span class="accent">works</span>' })}
    <ol class="how-steps" role="list">${steps.map(([ic, h, p], i) => `<li class="how-step" data-reveal style="--i:${i}"><span class="how-step__n" aria-hidden="true">${i + 1}</span><span class="how-step__ico" aria-hidden="true">${icon[ic]}</span><h3>${h}</h3><p>${p}</p></li>`).join('')}</ol>
    <div class="deals-preview__foot">${orderBtn('btn btn--order btn--lg', 'Start an order')}<a class="text-link" href="${SITE.tel}">${icon.phone}<span>Questions? ${esc(SITE.phone)}</span></a></div>
  </div>
</section>
${spectrum()}`;
}

function houseLines() {
  const t = menu.deliTiers || [];
  // the home deals bento (owner, 2026-11-09: "we already have an updated version for these"): same words and prices
  return `<section class="band band--black" aria-labelledby="house-title">
  <div class="container">
    ${sectionHead({ kick: 'Flavors house lines', id: 'house-title', titleHtml: 'Made for the <span class="accent">counter</span>', lede: 'Lines that carry the Flavors name on the live menu.', aside: linkBtn(PATH, '/daily-deals/', 'Daily deals', 'btn btn--cream') })}
    ${dealGrid([
      deal(PATH, { img: 'gram', kick: 'Flavors Deli-Style Flower', price: t[0]?.perGram || '$3', per: 'a gram and up', name: 'Deli-style flower', detail: 'By the gram, eighth, quarter, half or ounce, in five tiers up to $15 a gram.', size: 'feature', i: 0 }),
      deal(PATH, { img: 'eighth-pouch', kick: 'Flavors 3.5G Packaged', price: '$10', per: 'eighth', name: 'Prepacked eighths', detail: `${menu.eighths.count} strains on the live menu.`, i: 1 }),
      deal(PATH, { img: 'ounce', kick: 'Flavors Prepacked Ounces (28g)', price: '$19', per: 'ounce and up', name: 'Prepacked ounces', detail: 'From top shelf shake at $19 to the $85 premium tier.', i: 2 }),
      deal(PATH, { img: 'budder-dish-white', kick: 'Flavors Concentrates', price: '$20', per: '5G bucket', name: 'Budder buckets', detail: 'Flavors 5G budder buckets on the live menu.', size: 'wide', i: 3 }),
    ])}
  </div>
</section>`;
}

export function render() {
  return page({
    path: PATH,
    title: 'Shop the Live Menu | Order Online for Pickup | Flavors Detroit',
    description: 'Shop the Flavors Detroit live menu: flower, pre-rolls, vapes, edibles, concentrates and more. Order cannabis online for pickup at 5700 E 8 Mile Rd, Detroit.',
    main: [hero(), shelves(), categoriesBand(), how(), houseLines()].join('\n'),
    jsonld: [breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }])],
  });
}
