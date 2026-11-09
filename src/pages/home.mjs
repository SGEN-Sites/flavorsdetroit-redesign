// home.mjs — the home page. Order: night-road hero with the lit sign → crossing tapes (letter
// board + navy tape) → spectrum divider → showroom bento → deals on hanging tickets → the Owner's
// Box in a chasing bulb frame → who we are (scroll-lit statement) → visit → spectrum divider →
// mailing list + Instagram → news.
import { esc, rel, icon } from '../lib/html.mjs';
import { page } from '../lib/layout.mjs';
import { SITE, COPY, OWNERS_BOX, menu, postsData, ASOF } from '../content/site.mjs';
import { kicker, orderBtn, linkBtn, sectionHead, ticker, tape, spectrum, bento, tag, hangRow, tabs, storePhoto, heroPhoto, asof, storeCard, mailForm, postCard, backdrop, kinetic } from '../lib/parts.mjs';
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
      <h1 class="hero__title" id="hero-title">A traditional dispensary with a <span class="accent">modern twist</span>.</h1>
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
      <div class="rail__meta" aria-hidden="true"><span class="rail__index"><b data-rail-index>01</b> / 0${COPY.categories.length}</span><span class="rail__bar"><i></i></span></div>
      <div class="flavors__note">
        <p class="flavors__deli"><strong>${esc(COPY.portalLine)}</strong> Online orders any time, ready for pickup in store with a valid ID.</p>
        ${orderBtn('btn btn--order', 'Order for pickup')}
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
  const t3 = tier('$3'), t15 = tier('$15');
  const eighths = menu.eighths;
  const flower = hangRow([
    tag({ kick: 'Flavors 3.5G prepacks', price: '$10', per: 'eighth', name: 'Eighths', detail: `${eighths.count} strains on the live menu, including ${esc(pickStrains(eighths.strains, ['Applelato', 'Kush Mints', 'Warheadz', 'Georgia Haze']).join(', '))}.`, feature: true, i: 0 }),
    tag({ kick: 'Deli-style flower', price: '$3', per: 'a gram', name: 'By the gram', detail: `Sold by the gram, eighth, quarter, half and ounce in five tiers: $3, $5, $8, $10 and $15 a gram. An eighth on the $3 tier is ${esc(t3?.eighth || '$10')}.`, i: 1 }),
    tag({ kick: 'Bundle', price: '$15', per: 'each', name: 'Premium eighths', detail: 'Or 2 for $25.', i: 2 }),
    tag({ kick: 'Bundle', price: '$20', per: 'each', name: 'Top shelf eighths', detail: 'Or 2 for $35.', i: 3 }),
  ]);
  const ladder = `<div class="ladder" role="list">${(menu.ounceTiers || []).map((t, i) => `<div class="ladder__step" role="listitem" style="--n:${i}"><span class="ladder__price">${esc(t.price)}</span><span class="ladder__meta">${esc(t.kind)} · 28G<br>${t.count} on the menu</span></div>`).join('')}</div>
  <p class="small muted" style="margin-top:16px">Prepacked 28G ounces, from top shelf shake at $19 up to the $85 premium tier (${esc(pickStrains(oz('$85')?.strains || [], ['Animal Mints', 'Cherry Meltz', 'Ghost Mode', 'Peach Guava']).join(', '))}).</p>`;
  const rolls = hangRow([
    tag({ kick: 'Hello Farms 1G singles', price: '$1', per: 'pre-roll', name: 'Dollar pre-rolls', detail: `${menu.prerolls.dollar.strains.length} strains on the live menu.`, feature: true, i: 0 }),
    tag({ kick: 'Bundle', price: '$17', per: 'for 7', name: 'Jumbo exotics pre-rolls', detail: '7 for $17, Flavors 1.3G jumbo pre-rolls.', i: 1 }),
    tag({ kick: 'Vape bundle', price: '$35', per: 'for 10', name: 'Royal High 1G carts', detail: '$3.99 each or 10 for $35.', i: 2 }),
    tag({ kick: 'Vape bundle', price: '$45', per: 'for 4', name: 'Flight 1G live resin disposables', detail: '4 for $45.', i: 3 }),
  ]);
  const conc = hangRow([
    tag({ kick: 'Flavors concentrates', price: '$20', per: '5G bucket', name: 'Budder buckets', detail: 'Flavors 5G budder buckets on the live menu.', feature: true, i: 0 }),
    tag({ kick: 'Bundle', price: '$25', per: '5G', name: 'Premium wax bucket', detail: '5G for $25.', i: 1 }),
    tag({ kick: 'Bundle', price: '$30', per: 'for 3', name: 'TopShelf 1G crumbles', detail: '3 for $30.', i: 2 }),
    tag({ kick: 'Bundle', price: '$45', per: 'for 5', name: 'TopShelf 1G budders', detail: '5 for $45.', i: 3 }),
  ]);
  return `<section class="band band--navy band--neon" aria-labelledby="deals-title">
  ${backdrop(PATH, 'neon-abstract', { sizes: '100vw' })}
  <div class="container">
    ${sectionHead({ kick: 'Daily deals & more', id: 'deals-title', titleHtml: 'Detroit <span class="accent">prices</span>, every day', lede: 'A taste of what is on the live menu right now. Prices move with every drop, so the menu always has the latest.',
      aside: linkBtn(PATH, '/daily-deals/', 'All deals', 'btn btn--cream') })}
    ${tabs('home-deals', [
      { id: 'flower', label: 'Flower', html: flower },
      { id: 'ounces', label: 'Ounces', html: ladder },
      { id: 'rolls', label: 'Pre-rolls & vapes', html: rolls },
      { id: 'conc', label: 'Concentrates', html: conc },
    ], { label: 'Deal categories' })}
    <div class="deals-preview__foot">${asof()}${orderBtn('btn btn--order', 'Shop the deals')}</div>
  </div>
</section>`;
}

function ownersBox() {
  const s = OWNERS_BOX.strains;
  const cards = s.map((x, i) => `<li class="strain" data-reveal data-tilt style="--i:${i}">
    <p class="strain__top"><span>Deli-style flower</span><span>${esc(x.perGram ? x.perGram + ' a gram' : '')}</span></p>
    <h3 class="strain__name">${esc(x.name)}</h3>
    <p class="strain__meta"><span class="chip">${esc(x.type)}</span>${x.thc ? `<span class="chip">THC ${esc(x.thc)}</span>` : ''}</p>
    <p class="strain__notes">${esc(x.notes)}</p>
    ${x.eighth ? `<p class="strain__price"><b>${esc(x.eighth)}</b><span>an eighth</span></p>` : ''}
  </li>`).join('');
  return `<section class="band band--black band--spot" aria-labelledby="box-title">
  ${backdrop(PATH, 'box-spotlight', { sizes: '100vw', depth: '0.06' })}
  <span class="pool pool--a" data-depth="-0.12"></span><span class="pool pool--b" data-depth="-0.06"></span>
  <div class="container">
    <div class="box box--glass">
      <span class="box__bulbs" aria-hidden="true"><i class="t"></i><i class="r"></i><i class="b"></i><i class="l"></i></span>
      <div class="box__head">
        ${kicker(OWNERS_BOX.intro)}
        <h2 class="box__title" id="box-title">The Owner's <span class="accent">Box</span></h2>
        <p class="lede">${esc(OWNERS_BOX.body)}</p>
      </div>
      <ul class="box__grid swipe" role="list">${cards}</ul>
      <div class="deals-preview__foot">
        <p class="asof">${icon.info}<span>In the box on the live menu, ${esc(OWNERS_BOX.asOf)}. The lineup rotates.</span></p>
        ${linkBtn(PATH, '/owners-box/', "Open the Owner's Box", 'btn btn--cream')}
      </div>
    </div>
  </div>
</section>`;
}

function about() {
  // the first "who are we" line becomes a scroll-lit statement (words switch on like bulbs as it
  // scrolls through); the rest of the client's copy stays in the text column
  const [lead, ...rest] = COPY.who;
  const statement = esc(lead).replace('a traditional dispensary with a modern twist', 'a traditional dispensary with a <span class="accent">modern twist</span>');
  return `<section class="band band--white about" aria-labelledby="about-title">
  <div class="container">
    ${kicker(COPY.whoTitle)}
    <p class="statement" data-scroll-lit>${statement}</p>
  </div>
  <div class="container split">
    <div class="about__media about__photos" data-reveal>
      ${storePhoto(PATH, 'counter', { sizes: '(max-width: 900px) 92vw, 620px', ar: '5 / 4' })}
      ${storePhoto(PATH, 'wall', { sizes: '(max-width: 900px) 34vw, 220px', ar: '3 / 4', cls: 'photo--inset' })}
    </div>
    <div class="about__text">
      <h2 class="h2" id="about-title">You'll feel right <span class="accent">at home</span>.</h2>
      ${rest.map((p, i) => `<p class="${i === 0 ? 'lede' : ''}">${esc(p)}</p>`).join('\n      ')}
      <div class="stats" role="list">
        <div class="stat" role="listitem"><p class="stat__n"><span data-count="10000">10,000</span></p><p class="stat__l">square feet of store</p></div>
        <div class="stat" role="listitem"><p class="stat__n"><span data-count="7">7</span> days</p><p class="stat__l">a week, 10AM to 10PM</p></div>
        <div class="stat" role="listitem"><p class="stat__n">1M+</p><p class="stat__l">customers served</p></div>
      </div>
    </div>
  </div>
</section>`;
}

function visit() {
  return `<section class="band band--night band--rain" aria-labelledby="visit-title">
  ${backdrop(PATH, 'rainbow-reflections', { sizes: '100vw' })}
  <span class="pool pool--b" data-depth="-0.08"></span>
  <div class="container visit-band__grid">
    <div class="stack" style="--stack:20px">
      ${kicker(COPY.contactTitle)}
      <h2 class="h2" id="visit-title">5700 E <span class="accent">8 Mile</span> Rd, Detroit.</h2>
      <p class="lede">Look for the sign: a black marquee cloud lit with bulbs on a blue tower, with a neon 5700. Then the green cross.</p>
      ${storeCard(PATH, { heading: false })}
      <p class="muted">${esc(COPY.contactSub)}. <a class="text-link" href="${A('/contact/')}">Send us a message ${icon.arrow}</a></p>
    </div>
    <div class="visit-band__media" data-reveal>
      ${storePhoto(PATH, 'storefront', { sizes: '(max-width: 900px) 92vw, 640px', ar: '16 / 11' })}
      <div class="street-sign" aria-hidden="true"><span class="street-sign__plate">E 8 Mile <small>Rd</small></span><span class="street-sign__num">5700</span></div>
    </div>
  </div>
</section>`;
}

function loop() {
  return `${spectrum()}
<section class="band band--night band--bokeh" aria-labelledby="loop-title">
  ${backdrop(PATH, 'bulb-bokeh', { sizes: '100vw', depth: '0.08' })}
  <span class="pool pool--a" data-depth="-0.1"></span>
  <div class="container loop__grid">
    <div class="panel panel--night panel--glass stack" style="--stack:16px" data-reveal>
      ${kicker('New product alerts')}
      <h2 class="h2" id="loop-title">${esc(COPY.mailTitle)}</h2>
      <p class="lede">${esc(COPY.mailSub)}.</p>
      ${mailForm('home-mail', { night: true })}
    </div>
    <div class="panel loop__ig" data-reveal style="--i:1">
      ${kicker(COPY.socialTitle)}
      <p class="ig-handle">${esc(COPY.socialFollow)}</p>
      <p>${esc(COPY.socialText)}</p>
      <a class="btn btn--cream btn--lg" href="${esc(SITE.instagram)}" target="_blank" rel="noopener">${icon.insta}<span>Follow ${esc(SITE.instagramHandle)}</span><span class="visually-hidden"> on Instagram (opens in a new tab)</span></a>
    </div>
  </div>
</section>`;
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
