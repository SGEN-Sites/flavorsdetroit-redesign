// owners-box.mjs — /owners-box/. The name comes from the owner's brief; the words come from
// the 2026-10-11 post ("Top Shelf Spotlight"); the strains, type, THC and price come from the
// live menu's "Owners Box - Exclusive Flower" collection (captured, dated).
import { esc, rel, icon } from '../lib/html.mjs';
import { page } from '../lib/layout.mjs';
import { SITE, OWNERS_BOX, menu } from '../content/site.mjs';
import { kicker, orderBtn, linkBtn, sectionHead, pageHero, asof } from '../lib/parts.mjs';
import { breadcrumbJsonLd } from '../lib/seo.mjs';

export const PATH = '/owners-box/';
const A = (p) => rel(PATH, p);

function hero() {
  return pageHero(PATH, {
    kick: OWNERS_BOX.intro,
    titleHtml: 'The Owner\'s <span class="accent">Box</span>',
    lede: esc(OWNERS_BOX.body),
    crumbs: [{ label: "The Owner's Box" }],
    aside: `<div class="cluster">${orderBtn('btn btn--order btn--lg', 'Shop the box')}</div>`,
  });
}

function strains() {
  const cards = OWNERS_BOX.strains.map((x, i) => `<li class="strain" data-reveal style="--i:${i}">
    <p class="strain__top"><span>Flavors deli-style flower</span><span>${esc(x.perGram ? x.perGram + ' a gram' : '')}</span></p>
    <h3 class="strain__name">${esc(x.name)}</h3>
    <p class="strain__meta"><span class="chip">${esc(x.type)}</span>${x.thc ? `<span class="chip">THC ${esc(x.thc)}</span>` : ''}<span class="chip">Special</span></p>
    <p class="strain__notes">${esc(x.notes)}</p>
    ${x.eighth ? `<p class="strain__price"><b>${esc(x.eighth)}</b><span>an eighth on the live menu</span></p>` : ''}
  </li>`).join('');
  return `<section class="band band--black" aria-labelledby="in-box">
  <div class="container">
    <div class="box">
      <span class="box__rail box__rail--top" aria-hidden="true"></span>
      <div class="box__head">
        ${kicker('Top shelf spotlight')}
        <h2 class="box__title" id="in-box">In the box <span class="accent">now</span></h2>
      </div>
      <ul class="box__grid swipe" role="list">${cards}</ul>
      <p class="swipe-hint">${icon.swipe}<span>Swipe for more</span></p>
      <div class="deals-preview__foot">
        <p class="asof">${icon.info}<span>On the live menu's Owners Box collection, ${esc(OWNERS_BOX.asOf)}. Tasting notes from Flavors news, ${esc(OWNERS_BOX.postDate)}. The lineup rotates.</span></p>
        ${orderBtn('btn btn--cream', 'Shop the box')}
      </div>
      <span class="box__rail box__rail--bottom" aria-hidden="true"></span>
    </div>
  </div>
</section>`;
}

function chase() {
  return `<section class="band band--night band--lit" aria-labelledby="chase-title" style="--lx: 20%; --ly: 10%">
  <div class="container split">
    <div class="stack" style="--stack:18px">
      ${kicker('In a class of their own')}
      <h2 class="h2" id="chase-title">Our most exclusive <span class="accent">flower</span></h2>
      <p class="lede">${esc(OWNERS_BOX.chase)}</p>
    </div>
    <div class="stack" style="--stack:16px">
      <div class="store-card">
        <p class="kicker"><span class="kicker__bulb" aria-hidden="true"></span>How the box is priced</p>
        <div class="store-card__row">${icon.ruler}<div><span class="store-card__label">By the gram</span>$15 a gram on the deli counter's top tier</div></div>
        <div class="store-card__row">${icon.bag}<div><span class="store-card__label">By the eighth</span>$34 for 3.5g on the live menu</div></div>
        <div class="store-card__row">${icon.store}<div><span class="store-card__label">Where</span>Flavors deli-style flower, 5700 E 8 Mile Rd</div></div>
        <div class="store-card__actions">${orderBtn('btn btn--order', 'Order for pickup')}${linkBtn(PATH, '/daily-deals/', 'The deli counter', 'btn btn--ghost')}</div>
      </div>
    </div>
  </div>
</section>`;
}

function more() {
  return `<section class="band band--day band--tight" aria-labelledby="more-title">
  <div class="container">
    ${sectionHead({ kick: 'Keep exploring', id: 'more-title', titleHtml: 'More from the <span class="accent">counter</span>' })}
    <div class="steps swipe">
      <div class="step"><p class="step__n">$10</p><h3>Eighths</h3><p>Flavors 3.5G prepacks, ${menu.eighths.count} strains on the live menu.</p><a class="text-link" href="${A('/daily-deals/')}">Daily deals ${icon.arrow}</a></div>
      <div class="step"><p class="step__n">$19</p><h3>Ounces</h3><p>Prepacked 28G ounces from $19 up to the $85 premium tier.</p><a class="text-link" href="${A('/daily-deals/')}">Ounce tiers ${icon.arrow}</a></div>
      <div class="step"><p class="step__n">5700</p><h3>Visit us</h3><p>${esc(SITE.hoursLabel)}, at ${esc(SITE.street)}.</p><a class="text-link" href="${A('/visit/')}">Plan a visit ${icon.arrow}</a></div>
    </div>
  </div>
</section>`;
}

export function render() {
  return page({
    path: PATH,
    title: "The Owner's Box | Exclusive Top-Shelf Flower | Flavors Detroit",
    description: "The Owner's Box at Flavors Detroit: a small group of high-end, extremely exclusive premium strains. " + OWNERS_BOX.strains.map((s) => s.name).join(', ') + ' on the live menu.',
    main: [hero(), strains(), chase(), more()].join('\n'),
    jsonld: [breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: "The Owner's Box", path: '/owners-box' }])],
  });
}
