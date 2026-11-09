// deals.mjs — /daily-deals/ (the live site's own URL, which answered 404 on 2026-11-08).
// Every price comes from the live menu capture (src/content/menu.json, facts.liveMenu) or a
// dated post; each collection used below is asserted to exist in the capture at build time.
import { esc, rel, icon } from '../lib/html.mjs';
import { page } from '../lib/layout.mjs';
import { SITE, COPY, OWNERS_BOX, menu, postsData, ASOF } from '../content/site.mjs';
import { kicker, orderBtn, linkBtn, sectionHead, tag, tabs, asof, pageHero, mailForm } from '../lib/parts.mjs';
import { breadcrumbJsonLd } from '../lib/seo.mjs';
import { niceName, presentable } from '../content/case.mjs';

export const PATH = '/daily-deals/';
const A = (p) => rel(PATH, p);

const has = (c) => {
  if (!(menu.collections || []).includes(c)) throw new Error('deals.mjs: collection not in the live-menu capture: ' + c);
  return c;
};
// [collection string as captured, display name, price shown, "per" label, detail]
const C = (coll, name, price, per, detail, kick = 'Bundle') => ({ coll: has(coll), name, price, per, detail, kick });

const FLOWER = [
  C('$15 each or 2 / $25 Premium Eights', 'Premium eighths', '$15', 'each', 'Or 2 for $25.'),
  C('$20 each or 2 / $35 Top Shelf Eights', 'Top shelf eighths', '$20', 'each', 'Or 2 for $35.'),
  C('$25 each or 2/$45 Exotics', 'Exotics', '$25', 'each', 'Or 2 for $45.'),
];
const PREROLLS = [
  C('7/$17 1.3G Flavors Jumbo Exotics Prerolls', 'Jumbo exotics pre-rolls', '$17', 'for 7', 'Flavors 1.3G jumbo pre-rolls, 7 for $17.'),
  C("2/$50 Flavors 14G Preroll Party Pack's", 'Pre-roll party packs', '$50', 'for 2', 'Flavors 14G party packs, 2 for $50.'),
  C('3/$85 Flavors Tarantula 4.5G (3-Pack)', 'Tarantula 3-packs', '$85', 'for 3', 'Flavors Tarantula 4.5G 3-packs, 3 for $85.'),
  C('7/$25 Infused thirteen / 1g Singles Infused', 'Infused singles', '$25', 'for 7', 'Infused thirteen 1g singles, 7 for $25.'),
  C('$5 each or 5/$20 Rocket Stick 1.2g Injected P.R', 'Rocket Stick 1.2g', '$20', 'for 5', '$5 each or 5 for $20.'),
  C('$5.98 Each or 5/$25 - Fire Styxx 1G Infused Pre Rolls', 'Fire Styxx 1G infused', '$25', 'for 5', '$5.98 each or 5 for $25.'),
];
const VAPES = [
  C('$3.99 Each or 10/$35 Royal High - 1G Vape Cart', 'Royal High 1G carts', '$35', 'for 10', '$3.99 each or 10 for $35.', 'Vape bundle'),
  C('4/$45 Flight 1G Disposable Live Resin', 'Flight 1G live resin disposables', '$45', 'for 4', '4 for $45.', 'Vape bundle'),
  C('5/$45 Motorcity Cannacarts 1G - Disposable', 'Motorcity Cannacarts 1G disposables', '$45', 'for 5', '5 for $45.', 'Vape bundle'),
  C('3/$45 2g Drip & Crude Boys Disposables', 'Drip & Crude Boys 2g disposables', '$45', 'for 3', '3 for $45.', 'Vape bundle'),
  C('$20 Each or 5/$87.50 Muha Meds 2g disposable', 'Muha Meds 2g disposables', '$87.50', 'for 5', '$20 each or 5 for $87.50.', 'Vape bundle'),
  C('2/$18 Muha Meds 510 Thread', 'Muha Meds 510 thread', '$18', 'for 2', '2 for $18.', 'Vape bundle'),
];
const CONC = [
  C('5G/$25 Premium Wax Bucket Blowout', 'Premium wax bucket', '$25', '5G', '5G for $25.'),
  C('$35 each or 3/$90 5G Cured Sugar Buckets', '5G cured sugar buckets', '$35', 'each', 'Or 3 for $90.'),
  C('3/$30 Flavors TopShelf 1G Crumbles', 'TopShelf 1G crumbles', '$30', 'for 3', '3 for $30.'),
  C('3/$30 Flavors TopShelf 1G Cured Sugar Diamonds', 'TopShelf 1G cured sugar diamonds', '$30', 'for 3', '3 for $30.'),
  C('3/$35 Flavors TopShelf 1G Diamond Sauce', 'TopShelf 1G diamond sauce', '$35', 'for 3', '3 for $35.'),
  C('5/$45 Flavors TopShelf 1G Budders', 'TopShelf 1G budders', '$45', 'for 5', '5 for $45.'),
  C('17.50 Each or 2/$30 Twisteez 2G L.R Brush', 'Twisteez 2G live resin brush', '$30', 'for 2', '$17.50 each or 2 for $30.'),
  C('4/$70 Flavors Diamond Donut 3.75G (3-Pack)', 'Diamond Donut 3.75G 3-packs', '$70', 'for 4', '4 for $70.'),
];
const EDIBLES = [
  C('10/$20 Platinum 200mg Gummies', 'Platinum 200mg gummies', '$20', 'for 10', '10 for $20.'),
  C('3/$10 - Choice Chews 200mg', 'Choice Chews 200mg', '$10', 'for 3', '3 for $10.'),
  C('6/$20 Choice 200mg Mega Chew', 'Choice 200mg Mega Chew', '$20', 'for 6', '6 for $20.'),
  C('6/$20 Shattered Thoughts 200mg Gummies', 'Shattered Thoughts 200mg gummies', '$20', 'for 6', '6 for $20.'),
  C('5/$40 Made by a Farmer - Gummies', 'Made by a Farmer gummies', '$40', 'for 5', '5 for $40.'),
  C('$4 each or 10/$25 Dope Rope 200mg', 'Dope Rope 200mg', '$25', 'for 10', '$4 each or 10 for $25.'),
  C('2/$10 Lit Labs Rosin Resin Gummies', 'Lit Labs rosin resin gummies', '$10', 'for 2', '2 for $10.'),
  C('2/$10 Chill Medicated - Syrup To-Go 100mg', 'Chill Medicated syrup to-go 100mg', '$10', 'for 2', '2 for $10.'),
];

const tags = (list, lead = []) => `<div class="tags swipe">${[...lead, ...list.map((d, i) => tag({ kick: d.kick, price: d.price, per: d.per, name: d.name, detail: esc(d.detail), i: (i + lead.length) % 4 }))].join('')}</div>`;

function hero() {
  return pageHero(PATH, {
    kick: 'Daily deals & more',
    titleHtml: 'Daily deals <span class="accent">&amp; more</span>',
    lede: `Detroit prices on flower, ounces, pre-rolls, vapes, concentrates and edibles, taken from the live menu on ${esc(menu.asOfLabel)}. Prices move with every drop; the live menu always has today's.`,
    crumbs: [{ label: 'Daily deals' }],
    aside: `<div class="cluster">${orderBtn()}</div>`,
  });
}

function deliCounter() {
  const rows = (menu.deliTiers || []).map((t) => {
    const box = t.perGram === '$15';
    // the $15 tier is the Owner's Box: use the names as the client writes them in its post
    const list = box ? OWNERS_BOX.strains.map((x) => x.name) : presentable(t.strains.map(niceName));
    const names = list.slice(0, 4).join(', ');
    return `<div class="board__row${box ? ' board__row--box' : ''}">
      <span class="board__g">${esc(t.perGram)}<small>/g</small></span>
      <span class="board__what"><strong>${box ? "The Owner's Box" : `${t.count} strain${t.count === 1 ? '' : 's'}`}</strong><span>${esc(names)}${list.length > 4 ? ' and more' : ''}</span></span>
      <span class="board__eighth">${esc(t.eighth || '')}<small>an eighth</small></span>
    </div>`;
  }).join('');
  return `<section class="band band--night band--lit" aria-labelledby="deli-title" style="--lx: 80%; --ly: 0%">
  <div class="container deals-intro">
    <div class="stack" style="--stack:18px">
      ${kicker('Flavors deli-style flower')}
      <h2 class="h2" id="deli-title">The deli <span class="accent">counter</span></h2>
      <p class="lede">${esc(COPY.deli)}</p>
      <p class="muted">Deli-style flower is sold by the gram, eighth, quarter, half and ounce, in five price tiers. The $15 tier is the Owner's Box.</p>
      <div class="cluster">${orderBtn('btn btn--order', 'Shop deli-style flower')}${linkBtn(PATH, '/owners-box/', "The Owner's Box", 'btn btn--ghost')}</div>
    </div>
    <div class="board" data-reveal>
      <div class="board__rows">${rows}</div>
    </div>
  </div>
</section>`;
}

function categories() {
  const e = menu.eighths;
  const flowerLead = [
    tag({ kick: 'Flavors 3.5G prepacks', price: '$10', per: 'eighth', name: 'Eighths', detail: `${e.count} strains on the live menu, from ${esc(niceName(e.strains[0]))} to ${esc(niceName(e.strains[e.strains.length - 1]))}.`, feature: true, i: 0 }),
  ];
  const oz = (menu.ounceTiers || []);
  const ladder = `<div class="ladder" role="list">${oz.map((t, i) => `<div class="ladder__step" role="listitem" style="--n:${i}"><span class="ladder__price">${esc(t.price)}</span><span class="ladder__meta">${esc(t.kind)} · 28G<br>${t.count} on the menu</span></div>`).join('')}</div>
  <div class="tags swipe" style="margin-top:28px">
    ${oz.filter((t) => ['$19', '$25', '$85'].includes(t.price)).map((t, i) => tag({ kick: t.kind + ' · 28G', price: t.price, per: 'ounce', name: t.price === '$85' ? 'The premium tier' : t.price === '$19' ? 'Top shelf shake' : 'Prepacked ounces', detail: esc(presentable(t.strains.map(niceName)).slice(0, 4).join(', ')) + (t.strains.length > 4 ? ' and more.' : '.'), feature: t.price === '$85', i })).join('')}
  </div>`;
  const rollLead = [tag({ kick: 'Hello Farms 1G singles', price: '$1', per: 'pre-roll', name: 'Dollar pre-rolls', detail: esc(presentable(menu.prerolls.dollar.strains.map(niceName)).join(', ')) + '.', feature: true, i: 0 })];
  const box5 = (postsData.posts || []).find((p) => p.slug === 'halloween-at-flavors-detroit-new-flower-10-eighths-5-concentrates-85-ounces');
  const concLead = [
    tag({ kick: 'Flavors concentrates', price: '$20', per: '5G bucket', name: 'Budder buckets', detail: 'Flavors 5G budder buckets on the live menu.', feature: true, i: 0 }),
    ...(box5 ? [tag({ kick: 'Flavors news, ' + box5.dateLabel, price: '$5', per: 'gram', name: '$5 concentrate lab', detail: 'Budders, cured sugars and sugar waxes joined the $5 grams.', foot: `<a class="text-link" href="${A(box5.path)}">Read the post ${icon.arrow}</a>`, i: 1 })] : []),
  ];
  return `<section class="band band--navy" aria-labelledby="cats-title">
  <div class="container">
    ${sectionHead({ kick: 'By category', id: 'cats-title', titleHtml: 'Every deal, <span class="accent">by the shelf</span>', lede: 'Bundles and multi-buys as they appear on the live menu.' })}
    ${tabs('deals', [
      { id: 'flower', label: 'Flower', html: tags(FLOWER, flowerLead) },
      { id: 'ounces', label: 'Ounces', html: ladder },
      { id: 'prerolls', label: 'Pre-rolls', html: tags(PREROLLS, rollLead) },
      { id: 'vapes', label: 'Vapes', html: tags(VAPES) },
      { id: 'concentrates', label: 'Concentrates', html: tags(CONC, concLead) },
      { id: 'edibles', label: 'Edibles', html: tags(EDIBLES) },
    ], { label: 'Deal categories' })}
    <div class="deals-preview__foot">${asof()}${orderBtn('btn btn--order', 'Shop the deals')}</div>
  </div>
</section>`;
}

function boxCallout() {
  return `<section class="band band--black band--tight" aria-labelledby="box-callout">
  <div class="container">
    <div class="box">
      <span class="box__rail box__rail--top" aria-hidden="true"></span>
      <div class="split">
        <div class="stack" style="--stack:14px">
          ${kicker(OWNERS_BOX.intro)}
          <h2 class="box__title" id="box-callout">The Owner's <span class="accent">Box</span></h2>
          <p class="lede">${esc(OWNERS_BOX.body)}</p>
        </div>
        <div class="stack" style="--stack:14px">
          <p class="muted">In the box on ${esc(OWNERS_BOX.asOf)}: ${esc(OWNERS_BOX.strains.map((s) => s.name).join(', '))}.</p>
          <div class="cluster">${linkBtn(PATH, '/owners-box/', "Open the Owner's Box", 'btn btn--cream')}</div>
        </div>
      </div>
      <span class="box__rail box__rail--bottom" aria-hidden="true"></span>
    </div>
  </div>
</section>`;
}

function alerts() {
  return `<section class="band band--white band--tight" aria-labelledby="alerts-title">
  <div class="container split">
    <div class="stack" style="--stack:12px">
      ${kicker('New product alerts')}
      <h2 class="h2" id="alerts-title">${esc(COPY.mailTitle)}</h2>
      <p class="lede">${esc(COPY.mailSub)}.</p>
    </div>
    ${mailForm('deals-mail')}
  </div>
</section>`;
}

export function render() {
  return page({
    path: PATH,
    title: 'Daily Deals & More | Flavors Detroit, 5700 E 8 Mile Rd',
    description: `Flavors Detroit deals from the live menu: $10 eighths, deli-style flower from $3 a gram, prepacked ounces from $19, $1 pre-rolls and vape bundles. Prices as of ${menu.asOfLabel}.`,
    main: [hero(), deliCounter(), categories(), boxCallout(), alerts()].join('\n'),
    jsonld: [breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Daily deals', path: '/daily-deals' }])],
  });
}
