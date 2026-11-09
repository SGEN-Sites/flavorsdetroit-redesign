// home.mjs — the home page. Order: night-road hero with the lit sign → crossing tapes (letter
// board + navy tape) → spectrum divider → showroom bento → deals on hanging tickets → the Owner's
// Box in a chasing bulb frame → who we are (scroll-lit statement) → visit → spectrum divider →
// mailing list + Instagram → news.
import { esc, rel, icon } from '../lib/html.mjs';
import { page } from '../lib/layout.mjs';
import { SITE, COPY, OWNERS_BOX, menu, postsData, ASOF } from '../content/site.mjs';
import { kicker, orderBtn, linkBtn, sectionHead, ticker, tape, spectrum, bento, deal, dealGrid, ownboxStage, ownboxBackdrop, cave, tabs, storePhoto, heroPhoto, asof, storeCard, mailForm, mailStrip, postCard, backdrop, kinetic } from '../lib/parts.mjs';
import { storeJsonLd, websiteJsonLd } from '../lib/seo.mjs';
import { niceName, presentable } from '../content/case.mjs';

const PATH = '/';
const A = (p) => rel(PATH, p);

const tier = (g) => (menu.deliTiers || []).find((t) => t.perGram === g);
const oz = (p) => (menu.ounceTiers || []).find((t) => t.price === p);
const pickStrains = (list, want, n = 4) => {
  const clean = presentable(list.map(niceName));
  const chosen = want.filter((w) => clean.some((c) => c.toLowerCase() === w.toLowerCase()));
  return (chosen.length ? chosen : clean).slice(0, n);
};

function hero() {
  // depth, back to front: the store itself at golden hour (the owner's photo, relit with AI, owner's
  // choice 2026-11-09) → shade (dark behind the words) → a slow warm light → one LED pool on the dark
  // side. The real sign and tower stand in the photo; the drawn, lit sign plays only in the splash.
  // All decoration is aria-hidden; the words are the content. data-hero: the words drift down and the
  // photo pushes in as the page starts to scroll (site.js).
  return `<section class="hero" aria-labelledby="hero-title" data-hero>
  <div class="hero__scene" aria-hidden="true">
    <div class="hero__photo">${heroPhoto(PATH)}</div>
    <div class="hero__shade"></div>
    <div class="hero__sun"></div>
    <span class="pool pool--a" data-depth="-0.14"></span>
    <div class="hero__light"></div>
  </div>
  <div class="container hero__in">
    <div class="hero__text">
      ${kicker('Flavors Detroit · 5700 E 8 Mile Rd')}
      <h1 class="hero__title" id="hero-title">A traditional dispensary with a <span class="hero__end"><span class="accent">modern twist</span>.</span></h1>
      <p class="lede">Deli-style displays, top-shelf flower and Detroit prices. Open every day, 10AM to 10PM, on 8 Mile.</p>
      <div class="hero__ctas">
        ${orderBtn()}
        ${linkBtn(PATH, '/daily-deals/', "Today's deals")}
      </div>
      <ul class="facts-row hero__facts hero__plate" role="list">
        <li class="fact"><span class="status" data-status data-state="unknown"><span class="status__dot" aria-hidden="true"></span><span class="status__word">Open daily</span><span class="status__detail" data-status-text>10AM–10PM</span></span></li>
        <li class="fact fact--hide-sm">${icon.store}<span>10,000 sq ft store</span></li>
        <li class="fact"><a href="${SITE.tel}">${icon.phone}<span>${esc(SITE.phone)}</span></a></li>
      </ul>
    </div>
    <div class="hero__art" aria-hidden="true"><div class="hero__window"></div></div>
  </div>
</section>`;
}

function board() {
  const items = [
    '<b>$10</b> eighth takeover',
    '<b>$5</b> ultra high potency dabs',
    'Deli-style flower from <b>$3</b> a gram',
    'Prepacked ounces from <b>$19</b>',
    '<b>$1</b> pre-rolls',
    'Royal High carts <b>10 for $35</b>',
    "The Owner's Box",
    'Open every day <b>10AM–10PM</b>',
    '5700 E 8 Mile Rd',
  ];
  // the navy tape repeats the client's own lines and store facts (decorative). Not the tagline: it is
  // already the H1, the statement and the footer line (review 2026-11-09: it appeared four times)
  const tapeWords = ['Deli-style displays', 'Detroit prices', 'Open every day 10AM–10PM', SITE.street, 'Flavors Detroit'];
  return `<div class="tapes">
  ${tape(tapeWords)}
  ${ticker(items)}
</div>
${spectrum()}`;
}

function flavors() {
  // data-rail: on large screens with motion, the band pins and the four category cards slide
  // sideways as the page scrolls (site.js); otherwise it is the plain bento grid / swipe row.
  // black, with white only as accents (owner, 2026-11-09: no white background here, no ghost word,
  // no light streaks behind the words)
  return `<section class="band band--black band--flavors" aria-labelledby="flavors-title" data-rail>
  <div class="rail__pin">
    <div class="container">
      ${sectionHead({ kick: 'Shop by category', id: 'flavors-title', titleHtml: 'Our <span class="accent">flavors</span>', lede: esc(COPY.deli),
        aside: `<a class="text-link" href="${esc(SITE.portal)}" target="_blank" rel="noopener">Shop the full menu ${icon.ext}<span class="visually-hidden"> (opens in a new tab)</span></a>` })}
      <div class="rail__view">${bento(PATH, COPY.categories)}</div>
      <div class="rail__foot">
        <div class="rail__meta" aria-hidden="true"><span class="rail__index"><b data-rail-index>01</b> / 0${COPY.categories.length}</span><span class="rail__bar"><i></i></span></div>
        <div class="flavors__note">
          <p class="flavors__deli"><strong>${esc(COPY.portalLine)}</strong> Online orders any time, ready for pickup in store with a valid ID.</p>
          ${orderBtn('btn btn--order', 'Order for pickup')}
        </div>
      </div>
    </div>
  </div>
</section>`;
}

function kineticBand() {
  // the client's own lines and store facts, all already on the page: decorative movement only
  return kinetic(PATH, [
    ['Deli-style flower', 'Detroit prices', "The Owner's Box", 'Flavors Detroit'],
    ['Open every day 10AM–10PM', SITE.street, 'Order for pickup', 'Deli-style displays'],
  ]);
}

function deals() {
  // black, the deals of each category as a bento with product images (owner, 2026-11-09: "turn the
  // background of this section into black and turn these deal cards into bento layout for all
  // categories. Include product images."). The words and prices are the live menu's (November 8),
  // as on the deli tickets they replace; the images are AI illustrations of the product type, and the
  // owner's own pre-roll, budder and crumble photos ("you may use any of these", 2026-11-09)
  const t3 = tier('$3');
  const eighths = menu.eighths;
  const flower = dealGrid([
    deal(PATH, { img: 'eighths', kick: 'Flavors 3.5G prepacks', price: '$10', per: 'eighth', name: 'Eighths', detail: `${eighths.count} strains on the live menu, including ${esc(pickStrains(eighths.strains, ['Applelato', 'Kush Mints', 'Warheadz', 'Georgia Haze']).join(', '))}.`, size: 'feature', i: 0 }),
    deal(PATH, { img: 'gram', kick: 'Deli-style flower', price: '$3', per: 'a gram', name: 'By the gram', detail: `Sold by the gram, eighth, quarter, half and ounce in five tiers: $3, $5, $8, $10 and $15 a gram. An eighth on the $3 tier is ${esc(t3?.eighth || '$10')}.`, i: 1 }),
    deal(PATH, { img: 'premium', kick: 'Bundle', price: '$15', per: 'each', name: 'Premium eighths', detail: 'Or 2 for $25.', i: 2 }),
    deal(PATH, { img: 'topshelf', kick: 'Bundle', price: '$20', per: 'each', name: 'Top shelf eighths', detail: 'Or 2 for $35.', size: 'wide', i: 3 }),
  ]);
  // the ounces: every tier of the live menu, the prepacked ones on the feature, the shake beside it
  const tiers = menu.ounceTiers || [];
  const pre = tiers.filter((t) => /prepacked/i.test(t.kind)), shake = tiers.filter((t) => /shake/i.test(t.kind));
  const tierList = (list) => `<ul class="deal__tiers">${list.map((t) => `<li><b>${esc(t.price)}</b><span>${t.count} on the menu</span></li>`).join('')}</ul>`;
  const ounces = dealGrid([
    deal(PATH, { img: 'ounce', kick: 'Prepacked 28G ounces', price: pre[0]?.price || '$25', per: 'and up', name: 'Prepacked ounces', detail: tierList(pre), size: 'feature', i: 0 }),
    deal(PATH, { img: 'shake', kick: 'Top shelf shake', price: shake[0]?.price || '$19', per: 'ounce', name: 'Top shelf shake', detail: shake.map((t) => `${esc(t.price)}: ${t.count} on the menu`).join(' · ') + '.', size: 'wide', i: 1 }),
    deal(PATH, { img: 'topshelf', kick: 'Prepacked 28G ounce', price: '$85', per: 'ounce', name: 'The premium tier', detail: `${esc(pickStrains(oz('$85')?.strains || [], ['Animal Mints', 'Cherry Meltz', 'Ghost Mode', 'Peach Guava']).join(', '))}.`, size: 'wide', i: 2 }),
  ]);
  const rolls = dealGrid([
    deal(PATH, { img: 'preroll-stand', kick: 'Hello Farms 1G singles', price: '$1', per: 'pre-roll', name: 'Dollar pre-rolls', detail: `${menu.prerolls.dollar.strains.length} strains on the live menu.`, size: 'feature', i: 0 }),
    deal(PATH, { img: 'preroll-flat', kick: 'Bundle', price: '$17', per: 'for 7', name: 'Jumbo exotics pre-rolls', detail: '7 for $17, Flavors 1.3G jumbo pre-rolls.', i: 1 }),
    deal(PATH, { img: 'cart', kick: 'Vape bundle', price: '$35', per: 'for 10', name: 'Royal High 1G carts', detail: '$3.99 each or 10 for $35.', i: 2 }),
    deal(PATH, { img: 'disposable', kick: 'Vape bundle', price: '$45', per: 'for 4', name: 'Flight 1G live resin disposables', detail: '4 for $45.', size: 'wide', i: 3 }),
  ]);
  const conc = dealGrid([
    deal(PATH, { img: 'budder-dish', kick: 'Flavors concentrates', price: '$20', per: '5G bucket', name: 'Budder buckets', detail: 'Flavors 5G budder buckets on the live menu.', size: 'feature', i: 0 }),
    deal(PATH, { img: 'waxbucket', kick: 'Bundle', price: '$25', per: '5G', name: 'Premium wax bucket', detail: '5G for $25.', i: 1 }),
    deal(PATH, { img: 'crumble', kick: 'Bundle', price: '$30', per: 'for 3', name: 'TopShelf 1G crumbles', detail: '3 for $30.', i: 2 }),
    deal(PATH, { img: 'budder-1g', kick: 'Bundle', price: '$45', per: 'for 5', name: 'TopShelf 1G budders', detail: '5 for $45.', size: 'wide', i: 3 }),
  ]);
  return `<section class="band band--black band--deals" aria-labelledby="deals-title">
  <div class="container">
    ${sectionHead({ kick: 'Daily deals & more', id: 'deals-title', titleHtml: 'Detroit <span class="accent">prices</span>, every day', lede: 'A taste of what is on the live menu right now. Prices move with every drop, so the menu always has the latest.',
      aside: linkBtn(PATH, '/daily-deals/', 'All deals', 'btn btn--cream') })}
    ${tabs('home-deals', [
      { id: 'flower', label: 'Flower', html: flower },
      { id: 'ounces', label: 'Ounces', html: ounces },
      { id: 'rolls', label: 'Pre-rolls & vapes', html: rolls },
      { id: 'conc', label: 'Concentrates', html: conc },
    ], { label: 'Deal categories' })}
    <div class="deals-preview__foot">${asof()}${orderBtn('btn btn--order', 'Shop the deals')}</div>
  </div>
</section>`;
}

function ownersBox() {
  // (owner, 2026-11-09) the band's background is the owner's street photo in black and white, fading
  // into black, under the spectrum line; the box's strains ride holographic cards with a bud
  // illustration each, and come out of the owner's road case as it opens in green smoke
  return `${spectrum()}
<section class="band band--black band--ownbox" aria-labelledby="box-title">
  ${ownboxBackdrop(PATH)}
  <div class="container">
    <div class="box box--glass">
      <span class="box__bulbs" aria-hidden="true"><i class="t"></i><i class="r"></i><i class="b"></i><i class="l"></i></span>
      ${ownboxStage(PATH, OWNERS_BOX.strains, {
        head: `<div class="box__head ownbox__head">
        ${kicker(OWNERS_BOX.intro)}
        <h2 class="box__title" id="box-title">The Owner's <span class="accent">Box</span></h2>
        <p class="lede">${esc(OWNERS_BOX.body)}</p>
      </div>`,
        foot: `<div class="deals-preview__foot ownbox__foot">
        <p class="asof">${icon.info}<span>In the box on the live menu, ${esc(OWNERS_BOX.asOf)}. The lineup rotates.</span></p>
        ${linkBtn(PATH, '/owners-box/', "Open the Owner's Box", 'btn btn--cream')}
      </div>`,
      })}
    </div>
  </div>
</section>`;
}

function about() {
  // (owner, 2026-11-09: "make layout more compact and sleek and make all images look more cinematic";
  // then "can we do something like this [a concave carousel] to show the images?") the client's first
  // "who are we" line is a scroll-lit statement; the store's own photos hang on a wall that curves round
  // the viewer (the counter shown with its customers and staff removed for their privacy, as before);
  // the rest of the client's copy and the store facts sit in one compact row under it
  const [lead, ...rest] = COPY.who;
  const statement = esc(lead).replace('a traditional dispensary with a modern twist', 'a traditional dispensary with a <span class="accent">modern twist</span>');
  return `<section class="band band--white about" aria-labelledby="about-title">
  <div class="container about__top">
    ${kicker(COPY.whoTitle)}
    <p class="statement" data-scroll-lit>${statement}</p>
  </div>
  ${cave(PATH, [
    { slot: 'gal-counter', title: 'The main counter', sub: 'Glass cases under the Flavors Detroit letters' },
    { slot: 'gal-wall', title: 'The letter wall', sub: 'Lit green letters over the shelves' },
    { slot: 'gal-merch', title: 'Flavors merch', sub: 'Beanies, hoodies and tanks' },
    { slot: 'gal-clouds', title: 'The cloud wall', sub: 'The logo in red, pink, white and blue' },
    { slot: 'gal-led', title: 'The merch corner', sub: 'Lit in the store\u2019s blue LED' },
    { slot: 'gal-store', title: '5700 E 8 Mile Rd', sub: 'Look for the sign' },
  ])}
  <div class="container about__row">
    <div class="about__text">
      <h2 class="h2" id="about-title">You'll feel right <span class="accent">at home</span>.</h2>
      ${rest.map((p, i) => `<p class="${i === 0 ? 'lede' : ''}">${esc(p)}</p>`).join('\n      ')}
    </div>
    <div class="stats" role="list">
      <div class="stat" role="listitem"><p class="stat__n"><span data-count="10000">10,000</span></p><p class="stat__l">square feet of store</p></div>
      <div class="stat" role="listitem"><p class="stat__n"><span data-count="7">7</span> days</p><p class="stat__l">a week, 10AM to 10PM</p></div>
      <div class="stat" role="listitem"><p class="stat__n">1M+</p><p class="stat__l">customers served</p></div>
    </div>
  </div>
</section>`;
}

function visit() {
  // (owner, 2026-11-09: "for this section let's make it more simple, make more compact and ensure we are
  // using the improved version of the storefront image") the address, the live status, the hours and
  // the phone in one quiet column, two buttons, and the golden-hour storefront as in the hero (whole,
  // uncropped); no store card box. The wayfinding line lives on /visit/. The "E 8 Mile Rd / 5700"
  // street-sign plate on the photo was restored at the owner's request (2026-11-09: "revert the 8mile road sign")
  return `<section class="band band--night band--rain" aria-labelledby="visit-title">
  ${backdrop(PATH, 'rainbow-reflections', { sizes: '100vw' })}
  <div class="container visit-band__grid">
    <div class="visit-band__text">
      ${kicker(COPY.contactTitle)}
      <h2 class="h2" id="visit-title">5700 E <span class="accent">8 Mile</span> Rd, Detroit.</h2>
      <p class="status status-line" data-status data-state="unknown"><span class="status__dot" aria-hidden="true"></span><span class="status__word">Open daily</span><span class="status__detail" data-status-text>10AM–10PM</span></p>
      <ul class="visit-band__facts" role="list">
        <li>${icon.clock}<span>${esc(SITE.hoursLabel)}</span></li>
        <li>${icon.phone}<a href="${SITE.tel}">${esc(SITE.phone)}</a></li>
        <li>${icon.pin}<a href="${esc(SITE.mapsUrl)}" target="_blank" rel="noopener">${esc(SITE.street)}, Detroit, MI ${SITE.zip}<span class="visually-hidden"> (opens Google Maps in a new tab)</span></a></li>
      </ul>
      <div class="cluster">
        <a class="btn btn--cream" href="${esc(SITE.directionsUrl)}" target="_blank" rel="noopener">${icon.directions}<span>Directions</span><span class="visually-hidden"> (opens Google Maps in a new tab)</span></a>
        <a class="btn btn--ghost" href="${SITE.tel}">${icon.phone}<span>Call</span></a>
      </div>
      <p class="muted visit-band__note">${esc(COPY.contactSub)}. <a class="text-link" href="${A('/contact/')}">Send us a message ${icon.arrow}</a></p>
    </div>
    <div class="visit-band__media" data-reveal>
      ${storePhoto(PATH, 'store-golden', { sizes: '(max-width: 900px) 92vw, 620px', ar: '4224 / 3584' })}
      <div class="street-sign" aria-hidden="true"><span class="street-sign__plate">E 8 Mile <small>Rd</small></span><span class="street-sign__num">5700</span></div>
    </div>
  </div>
</section>`;
}

function loop() {
  // (owner, 2026-11-09: option A of design-options/loop/, "one slim strip"; the spectrum line behind its middle,
  // the lower half the next band's white) the shared mailStrip(); the client's longer social line stays on /contact/
  return mailStrip(PATH, { id: 'loop-title', key: 'home-mail', seam: true });
}

function news() {
  const posts = (postsData.posts || []).slice(0, 3);
  if (!posts.length) return '';
  return `<section class="band band--white" aria-labelledby="news-title">
  <div class="container">
    ${sectionHead({ kick: 'From the blog', id: 'news-title', titleHtml: 'Flavors <span class="accent">news</span>', aside: linkBtn(PATH, '/blog/', 'All news', 'btn btn--line') })}
    <div class="posts swipe">${posts.map((p, i) => postCard(PATH, p, { i })).join('')}</div>
  </div>
</section>`;
}

export function render() {
  const main = [hero(), board(), flavors(), deals(), ownersBox(), kineticBand(), about(), visit(), loop(), news()].join('\n');
  return page({
    path: PATH,
    title: 'Flavors Detroit Provisioning Center | 5700 8 Mile Rd | Michigan',   // LIVE title, kept for search
    description: 'Flavors Detroit embodies a sleek, modern style with deli style displays that showcase our premium products with sophistication and clarity. Open every day, 10AM to 10PM, at 5700 E 8 Mile Rd.',
    main,
    jsonld: [storeJsonLd(), websiteJsonLd()],
  });
}
