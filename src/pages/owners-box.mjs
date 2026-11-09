// owners-box.mjs — /owners-box/. The name comes from the owner's brief; the words come from
// the 2026-10-11 post ("Top Shelf Spotlight"); the strains, type, THC and price come from the
// live menu's "Owners Box - Exclusive Flower" collection (captured, dated).
import { esc, rel, icon } from '../lib/html.mjs';
import { page } from '../lib/layout.mjs';
import { SITE, OWNERS_BOX, menu } from '../content/site.mjs';
import { kicker, orderBtn, linkBtn, sectionHead, pageHero, asof, ownboxStage, ownboxBackdrop, spectrum } from '../lib/parts.mjs';
import { breadcrumbJsonLd } from '../lib/seo.mjs';

export const PATH = '/owners-box/';
const A = (p) => rel(PATH, p);

function hero() {
  return pageHero(PATH, {
    kick: OWNERS_BOX.intro,
    titleHtml: 'The Owner\'s <span class="accent">Box</span>',
    lede: esc(OWNERS_BOX.body),
    crumbs: [{ label: "The Owner's Box" }],
    scene: 'box-spotlight', pos: '68% 60%',
    aside: `<div class="cluster">${orderBtn('btn btn--order btn--lg', 'Shop the box')}</div>`,
  });
}

function strains() {
  // (owner, 2026-11-09: "this section should take after how we designed deals in the home section") the
  // home Owner's Box band: the spectrum line, the owner's street photo in black and white, the road case
  // opening in green smoke and the box's strains flying out on holographic cards with a bud each
  return `${spectrum()}
<section class="band band--black band--ownbox" aria-labelledby="in-box">
  ${ownboxBackdrop(PATH)}
  <div class="container">
    <div class="box box--glass">
      <span class="box__bulbs" aria-hidden="true"><i class="t"></i><i class="r"></i><i class="b"></i><i class="l"></i></span>
      ${ownboxStage(PATH, OWNERS_BOX.strains, {
        head: `<div class="box__head ownbox__head">
        ${kicker('Top shelf spotlight')}
        <h2 class="box__title" id="in-box">In the box <span class="accent">now</span></h2>
      </div>`,
        foot: `<div class="deals-preview__foot ownbox__foot">
        <p class="asof">${icon.info}<span>On the live menu's Owners Box collection, ${esc(OWNERS_BOX.asOf)}. Tasting notes from Flavors news, ${esc(OWNERS_BOX.postDate)}. The lineup rotates.</span></p>
        ${orderBtn('btn btn--cream', 'Shop the box')}
      </div>`,
      })}
    </div>
  </div>
</section>`;
}

function chase() {
  // spectrum divider on the top edge (owner, 2026-11-09)
  return `${spectrum()}
<section class="band band--night band--lit" aria-labelledby="chase-title" style="--lx: 20%; --ly: 10%">
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
  // (owner, 2026-11-09: option B of design-options/counter/, "black bento", after first choosing C) Eighths
  // as the royal feature with a large jar of which only the top half rises from the card's bottom edge,
  // Ounces white with the pouch, Visit over the golden-hour storefront; same words and numbers as before
  const go = (label) => `<span class="cbento__go">${label} ${icon.arrow}</span>`;
  const deal = (f, w, alt, cls) => `<img class="${cls}" src="${A(`/assets/img/deal/${f}-720.webp`)}" srcset="${A(`/assets/img/deal/${f}-360.webp`)} 360w, ${A(`/assets/img/deal/${f}-720.webp`)} 720w" sizes="(max-width: 900px) 80vw, 480px" width="${w}" height="720" alt="${alt}" data-ai="generated" loading="lazy" decoding="async">`;
  return `${spectrum()}
<section class="band band--black band--tight" aria-labelledby="more-title">
  <div class="container">
    ${sectionHead({ kick: 'Keep exploring', id: 'more-title', titleHtml: 'More from the <span class="accent">counter</span>' })}
    <div class="cbento">
      <a class="cbento__card cbento__card--feature" href="${A('/daily-deals/')}"><span class="cbento__price">$10</span><h3>Eighths</h3><p>Flavors 3.5G prepacks, ${menu.eighths.count} strains on the live menu.</p>${go('Daily deals')}${deal('eighths', 724, 'Illustration: a small glass jar with a black lid, filled with green cannabis buds, two loose buds beside it', 'cbento__jar')}</a>
      <a class="cbento__card cbento__card--white" href="${A('/daily-deals/')}"><span class="cbento__price">$19</span><h3>Ounces</h3><p>Prepacked 28G ounces from $19 up to the $85 premium tier.</p>${go('Ounce tiers')}${deal('ounce', 800, 'Illustration: a plain black stand-up pouch with a heap of green cannabis buds in front of it', 'cbento__pouch')}</a>
      <a class="cbento__card cbento__card--photo" href="${A('/visit/')}"><img class="cbento__bg" src="${A('/assets/img/store/store-golden-800.webp')}" srcset="${A('/assets/img/store/store-golden-800.webp')} 800w, ${A('/assets/img/store/store-golden-1200.webp')} 1200w" sizes="(max-width: 900px) 92vw, 560px" width="800" height="679" alt="The Flavors Detroit store at golden hour" data-photo="store" data-ai="edited" loading="lazy" decoding="async"><span class="cbento__price">5700</span><h3>Visit us</h3><p>${esc(SITE.hoursLabel)}, at ${esc(SITE.street)}.</p>${go('Plan a visit')}</a>
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
