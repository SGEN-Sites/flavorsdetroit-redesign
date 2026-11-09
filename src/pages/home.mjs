// home.mjs — the home page. Order: sign-lit hero → marquee board → awning → showroom
// categories → deals → the Owner's Box → who we are → visit → mailing list + Instagram → news.
import { esc, rel, icon } from '../lib/html.mjs';
import { page } from '../lib/layout.mjs';
import { SITE, COPY, OWNERS_BOX, menu, postsData, ASOF } from '../content/site.mjs';
import { kicker, orderBtn, linkBtn, sectionHead, sign, ticker, awning, jars, tag, tabs, placeholder, asof, storeCard, mailForm, postCard } from '../lib/parts.mjs';
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
  return `<section class="hero" aria-labelledby="hero-title">
  <div class="container hero__in">
    <div class="hero__text">
      ${kicker('Flavors Detroit · 5700 E 8 Mile Rd')}
      <h1 class="hero__title" id="hero-title">A traditional dispensary with a <span class="accent">modern twist</span>.</h1>
      <p class="lede">Deli-style displays, top-shelf flower and Detroit prices. Open every day, 10AM to 10PM, on 8 Mile.</p>
      <div class="hero__ctas">
        ${orderBtn()}
        ${linkBtn(PATH, '/daily-deals/', "Today's deals")}
      </div>
      <ul class="facts-row hero__facts" role="list">
        <li class="fact"><span class="status" data-status data-state="unknown"><span class="status__dot" aria-hidden="true"></span><span class="status__word">Open daily</span><span class="status__detail" data-status-text>10AM–10PM</span></span></li>
        <li class="fact fact--hide-sm">${icon.store}<span>10,000 sq ft store</span></li>
        <li class="fact"><a href="${SITE.tel}">${icon.phone}<span>${esc(SITE.phone)}</span></a></li>
      </ul>
    </div>
    <div class="hero__art">${sign(PATH)}</div>
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
  return `${ticker(items)}\n${awning()}`;
}

function flavors() {
  return `<section class="band band--day" aria-labelledby="flavors-title" style="padding-top: clamp(40px, 5vw, 72px)">
  <div class="container">
    ${sectionHead({ kick: 'Shop by category', id: 'flavors-title', titleHtml: 'Our <span class="accent">flavors</span>', lede: esc(COPY.deli),
      aside: `<a class="text-link" href="${esc(SITE.portal)}" target="_blank" rel="noopener">Shop the full menu ${icon.ext}<span class="visually-hidden"> (opens in a new tab)</span></a>` })}
    ${jars(PATH, COPY.categories)}
    <div class="counter-top" aria-hidden="true"></div>
    <div class="flavors__note">
      <p class="flavors__deli"><strong>${esc(COPY.portalLine)}</strong> Online orders any time, ready for pickup in store with a valid ID.</p>
      ${orderBtn('btn btn--order', 'Order for pickup')}
    </div>
  </div>
</section>`;
}

function deals() {
  const t3 = tier('$3'), t15 = tier('$15');
  const eighths = menu.eighths;
  const flower = `<div class="tags swipe">
    ${tag({ kick: 'Flavors 3.5G prepacks', price: '$10', per: 'eighth', name: 'Eighths', detail: `${eighths.count} strains on the live menu, including ${esc(pickStrains(eighths.strains, ['Applelato', 'Kush Mints', 'Warheadz', 'Georgia Haze']).join(', '))}.`, feature: true, i: 0 })}
    ${tag({ kick: 'Deli-style flower', price: '$3', per: 'a gram', name: 'By the gram', detail: `Sold by the gram, eighth, quarter, half and ounce in five tiers: $3, $5, $8, $10 and $15 a gram. An eighth on the $3 tier is ${esc(t3?.eighth || '$10')}.`, i: 1 })}
    ${tag({ kick: 'Bundle', price: '$15', per: 'each', name: 'Premium eighths', detail: 'Or 2 for $25.', i: 2 })}
    ${tag({ kick: 'Bundle', price: '$20', per: 'each', name: 'Top shelf eighths', detail: 'Or 2 for $35.', i: 3 })}
  </div>`;
  const ladder = `<div class="ladder" role="list">${(menu.ounceTiers || []).map((t, i) => `<div class="ladder__step" role="listitem" style="--n:${i}"><span class="ladder__price">${esc(t.price)}</span><span class="ladder__meta">${esc(t.kind)} · 28G<br>${t.count} on the menu</span></div>`).join('')}</div>
  <p class="small muted" style="margin-top:16px">Prepacked 28G ounces, from top shelf shake at $19 up to the $85 premium tier (${esc(pickStrains(oz('$85')?.strains || [], ['Animal Mints', 'Cherry Meltz', 'Ghost Mode', 'Peach Guava']).join(', '))}).</p>`;
  const rolls = `<div class="tags swipe">
    ${tag({ kick: 'Hello Farms 1G singles', price: '$1', per: 'pre-roll', name: 'Dollar pre-rolls', detail: `${menu.prerolls.dollar.strains.length} strains on the live menu.`, feature: true, i: 0 })}
    ${tag({ kick: 'Bundle', price: '$17', per: 'for 7', name: 'Jumbo exotics pre-rolls', detail: '7 for $17, Flavors 1.3G jumbo pre-rolls.', i: 1 })}
    ${tag({ kick: 'Vape bundle', price: '$35', per: 'for 10', name: 'Royal High 1G carts', detail: '$3.99 each or 10 for $35.', i: 2 })}
    ${tag({ kick: 'Vape bundle', price: '$45', per: 'for 4', name: 'Flight 1G live resin disposables', detail: '4 for $45.', i: 3 })}
  </div>`;
  const conc = `<div class="tags swipe">
    ${tag({ kick: 'Flavors concentrates', price: '$20', per: '5G bucket', name: 'Budder buckets', detail: 'Flavors 5G budder buckets on the live menu.', feature: true, i: 0 })}
    ${tag({ kick: 'Bundle', price: '$25', per: '5G', name: 'Premium wax bucket', detail: '5G for $25.', i: 1 })}
    ${tag({ kick: 'Bundle', price: '$30', per: 'for 3', name: 'TopShelf 1G crumbles', detail: '3 for $30.', i: 2 })}
    ${tag({ kick: 'Bundle', price: '$45', per: 'for 5', name: 'TopShelf 1G budders', detail: '5 for $45.', i: 3 })}
  </div>`;
  return `<section class="band band--navy band--lit" aria-labelledby="deals-title" style="--lx: 18%; --ly: 0%">
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
  const cards = s.map((x, i) => `<li class="strain" data-reveal style="--i:${i}">
    <p class="strain__top"><span>Deli-style flower</span><span>${esc(x.perGram ? x.perGram + ' a gram' : '')}</span></p>
    <h3 class="strain__name">${esc(x.name)}</h3>
    <p class="strain__meta"><span class="chip">${esc(x.type)}</span>${x.thc ? `<span class="chip">THC ${esc(x.thc)}</span>` : ''}</p>
    <p class="strain__notes">${esc(x.notes)}</p>
    ${x.eighth ? `<p class="strain__price"><b>${esc(x.eighth)}</b><span>an eighth</span></p>` : ''}
  </li>`).join('');
  return `<section class="band band--black" aria-labelledby="box-title">
  <div class="container">
    <div class="box">
      <span class="box__rail box__rail--top" aria-hidden="true"></span>
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
      <span class="box__rail box__rail--bottom" aria-hidden="true"></span>
    </div>
  </div>
</section>`;
}

function about() {
  return `<section class="band band--white" aria-labelledby="about-title">
  <div class="container split">
    <div class="about__media" data-reveal>
      ${placeholder('counter', 'Showroom photo coming soon', '5 / 4')}
    </div>
    <div class="about__text">
      ${kicker(COPY.whoTitle)}
      <h2 class="h2" id="about-title">You'll feel right <span class="accent">at home</span>.</h2>
      ${COPY.who.map((p) => `<p class="${p === COPY.who[0] ? 'lede' : ''}">${esc(p)}</p>`).join('\n      ')}
      <div class="stats" role="list">
        <div class="stat" role="listitem"><p class="stat__n">10,000</p><p class="stat__l">square feet of store</p></div>
        <div class="stat" role="listitem"><p class="stat__n">7 days</p><p class="stat__l">a week, 10AM to 10PM</p></div>
        <div class="stat" role="listitem"><p class="stat__n">1M+</p><p class="stat__l">customers served</p></div>
      </div>
    </div>
  </div>
</section>`;
}

function visit() {
  return `<section class="band band--night band--lit" aria-labelledby="visit-title" style="--lx: 85%; --ly: 10%">
  <div class="container visit-band__grid">
    <div class="stack" style="--stack:20px">
      ${kicker(COPY.contactTitle)}
      <h2 class="h2" id="visit-title">5700 E <span class="accent">8 Mile</span> Rd, Detroit.</h2>
      <p class="lede">Look for the sign: a black marquee cloud lit with bulbs on a royal-blue tower, with a neon 5700. Then the rainbow awnings and the green cross.</p>
      ${storeCard(PATH, { heading: false })}
      <p class="muted">${esc(COPY.contactSub)}. <a class="text-link" href="${A('/contact/')}">Send us a message ${icon.arrow}</a></p>
    </div>
    <div class="visit-band__media" data-reveal>
      ${placeholder('storefront', 'Storefront photo coming soon', '16 / 11')}
      <div class="street-sign" aria-hidden="true"><span class="street-sign__plate">E 8 Mile <small>Rd</small></span><span class="street-sign__num">5700</span></div>
    </div>
  </div>
</section>`;
}

function loop() {
  return `<section class="band band--day" aria-labelledby="loop-title">
  <div class="container loop__grid">
    <div class="panel stack" style="--stack:16px" data-reveal>
      ${kicker('New product alerts')}
      <h2 class="h2" id="loop-title">${esc(COPY.mailTitle)}</h2>
      <p class="lede">${esc(COPY.mailSub)}.</p>
      ${mailForm('home-mail')}
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
  const main = [hero(), board(), flavors(), deals(), ownersBox(), about(), visit(), loop(), news()].join('\n');
  return page({
    path: PATH,
    title: 'Flavors Detroit Provisioning Center | 5700 8 Mile Rd | Michigan',   // LIVE title, kept for search
    description: 'Flavors Detroit embodies a sleek, modern style with deli style displays that showcase our premium products with sophistication and clarity. Open every day, 10AM to 10PM, at 5700 E 8 Mile Rd.',
    main,
    jsonld: [storeJsonLd(), websiteJsonLd()],
  });
}
