// learn.mjs — /learn/. A plain-language guide to the shelves. The product lists come from the
// client (home page, posts, live menu); the short definitions are NEW, neutral copy written for
// this page (no effects, no health claims) and are flagged for the owner's approval in
// docs/PITCH-NOTES.md.
import { esc, rel, icon } from '../lib/html.mjs';
import { page } from '../lib/layout.mjs';
import { SITE, COPY, menu } from '../content/site.mjs';
import { kicker, orderBtn, linkBtn, sectionHead, pageHero, tabs, faq } from '../lib/parts.mjs';
import { breadcrumbJsonLd } from '../lib/seo.mjs';

export const PATH = '/learn/';
const A = (p) => rel(PATH, p);

const gloss = (items) => `<dl class="glossary">${items.map(([t, d]) => `<div class="glossary__item"><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl>`;
const photo = (file, cap, alt) => `<div class="learn-photo"><img src="${A('/assets/img/' + file)}" srcset="${A('/assets/img/' + file)} 640w, ${A('/assets/img/' + file.replace('.webp', '@2x.webp'))} 1024w" sizes="(max-width: 900px) 100vw, 40vw" width="640" height="800" alt="${esc(alt)}" loading="lazy" decoding="async"><span class="learn-photo__cap">${esc(cap)}</span></div>`;
const panel = (intro, list, media) => `<div class="learn-panel"><div class="stack" style="--stack:18px"><p class="lede">${intro}</p>${list}</div>${media}</div>`;

function hero() {
  return pageHero(PATH, {
    kick: 'Learn',
    titleHtml: 'Know your <span class="accent">flavors</span>',
    lede: 'A plain-language guide to what is on the shelves at Flavors Detroit. Still deciding? Come in and have our budtenders help you decide!',
    crumbs: [{ label: 'Learn' }],
    photo: 'learn-flower.webp', pos: '50% 46%',
    aside: `<div class="cluster">${orderBtn('btn btn--order btn--lg', 'Browse the menu')}</div>`,
  });
}

function readingTheMenu() {
  return `<section class="band band--day" aria-labelledby="key-title">
  <div class="container">
    ${sectionHead({ kick: 'Reading the menu', id: 'key-title', titleHtml: 'What the letters <span class="accent">mean</span>', lede: 'Strains on the Flavors Detroit menu carry a short code after the name, like Kush Mints (H) or Grape Cake (I).' })}
    <div class="strain-key">
      <div class="strain-key__item" data-reveal><p class="strain-key__code">(I)</p><h3>Indica</h3><p>Plants with a shorter, bushier build and broad leaves.</p></div>
      <div class="strain-key__item" data-reveal style="--i:1"><p class="strain-key__code">(S)</p><h3>Sativa</h3><p>Plants with a taller build and narrow leaves.</p></div>
      <div class="strain-key__item" data-reveal style="--i:2"><p class="strain-key__code">(H)</p><h3>Hybrid</h3><p>A cross of both. On the menu, H/I leans indica and H/S leans sativa.</p></div>
    </div>
    <div class="section-head" style="margin: clamp(32px, 4vw, 48px) 0 0">
      <div class="section-head__text">
        <h3 class="h3">Sizes on the menu</h3>
        <p class="muted">1g is a gram. ⅛ is an eighth, 3.5g. ¼ is a quarter, 7g. ½ is a half, 14g. 1oz is an ounce, 28g.</p>
      </div>
      ${linkBtn(PATH, '/daily-deals/', 'See the deals', 'btn btn--line')}
    </div>
  </div>
</section>`;
}

function shelves() {
  const flower = panel(esc("We've got the highest quality flower to suit any medical or recreational need. Look for a strain you love, or come in and have our budtenders help you decide!"),
    gloss([
      ['Deli-style flower', 'Flavors flower sold by the gram, eighth, quarter, half or ounce, in five price tiers from $3 to $15 a gram.'],
      ['Prepacked eighths', `Flavors 3.5G prepacks. ${menu.eighths.count} strains are $10 each on the live menu.`],
      ['Prepacked ounces', 'Flavors 28G prepacks in tiers from $19 to $85.'],
      ['Top shelf shake', 'Smaller pieces of top shelf flower, packed by the ounce.'],
    ]),
    photo('learn-flower.webp', 'Flower, from the Flavors Detroit archive', 'A purple and orange cannabis bud on black'));
  const rolls = panel('Ready to smoke, from single grams to party packs.',
    gloss([
      ['Pre-rolls', 'Ready-to-smoke joints, including $1 Hello Farms 1G singles.'],
      ['Jumbo pre-rolls', 'Flavors 1.3G jumbo pre-rolls.'],
      ['Infused pre-rolls', 'Pre-rolls with concentrate added.'],
      ['Tarantula', 'A Tarantula joint incorporates top shelf flower, premium concentrates, and kief.'],
    ]),
    photo('learn-kief.webp', 'Kief, from the Flavors Detroit archive', 'A pile of kief on a dark surface'));
  const conc = panel(esc('Shatter, batter and budder, live rosin, hash, crumble and sugar, and infused prerolls, plus the textures below.'),
    gloss([
      ['Shatter', 'A glassy, brittle concentrate that snaps when you break it.'],
      ['Batter and budder', 'Whipped concentrates with a soft, creamy texture.'],
      ['Crumble and sugar', 'Dry or grainy concentrates that break apart easily.'],
      ['Cured sugar', 'A sugary texture made from dried and cured plant material.'],
      ['Live resin sauce', 'A runny concentrate made from fresh-frozen plants, often with crystals in it.'],
      ['Live rosin and hash', 'Solventless options: hash is collected resin, and rosin is pressed from it with heat and pressure.'],
    ]),
    photo('learn-concentrate-glass.webp', 'Concentrate, from the Flavors Detroit archive', 'Glassy amber cannabis concentrate on white'));
  const vapes = panel('Flavors Detroit carries a wide variety of 510 thread cartridges plus 1G, 2G, and 3G disposable vapes in both distillate and live resin options.',
    gloss([
      ['510 thread cartridge', 'The common screw-in cartridge that fits most vape batteries.'],
      ['Disposable', 'An all-in-one vape with the battery built in.'],
      ['Distillate', 'A refined cannabis oil, often with flavor added.'],
      ['Live resin', 'Oil made from fresh-frozen plants.'],
    ]),
    photo('learn-concentrate-jar.webp', 'Concentrate, from the Flavors Detroit archive', 'A golden cannabis concentrate in a glass jar'));
  const edibles = panel(esc("We have the best selection of gummies, chocolate, and other infused treats. A variety of tastes for any flavor you're craving!"),
    gloss([
      ['Gummies and chews', 'Infused gummies and chews in a range of flavors and strengths.'],
      ['Chocolate and treats', 'Infused chocolates, cookies and other treats.'],
      ['Drinks and syrups', 'Infused drinks and syrups.'],
      ['Tinctures and topicals', 'Tinctures are liquid extracts taken by dropper. Topicals are lotions and rubs for the skin.'],
    ]),
    photo('learn-edible.webp', 'Edible, from the Flavors Detroit archive', 'A candy-studded cookie'));
  return `<section class="band band--night band--lit" aria-labelledby="shelves-title" style="--lx: 85%; --ly: 0%">
  <div class="container">
    ${sectionHead({ kick: 'On the shelves', id: 'shelves-title', titleHtml: 'Shop by <span class="accent">shelf</span>', lede: 'Pick a shelf to see what it holds.' })}
    ${tabs('learn', [
      { id: 'flower', label: 'Flower', html: flower },
      { id: 'prerolls', label: 'Pre-rolls', html: rolls },
      { id: 'concentrates', label: 'Concentrates', html: conc },
      { id: 'vapes', label: 'Vapes', html: vapes },
      { id: 'edibles', label: 'Edibles & more', html: edibles },
    ], { label: 'Product shelves' })}
  </div>
</section>`;
}

function firstVisit() {
  return `<section class="band band--white band--tight" aria-labelledby="first-title">
  <div class="container split">
    <div class="stack" style="--stack:12px">
      ${kicker('First time at Flavors?')}
      <h2 class="h2" id="first-title">Come in and <span class="accent">ask</span></h2>
      <p class="lede">Look for a strain you love, or come in and have our budtenders help you decide!</p>
    </div>
    <div class="cluster">${linkBtn(PATH, '/visit/', 'Plan a visit', 'btn btn--line btn--lg')}${orderBtn('btn btn--order btn--lg', 'Browse the menu')}</div>
  </div>
</section>`;
}

function questions() {
  return `<section class="band band--day" aria-labelledby="learn-faq">
  <div class="container container--narrow">
    ${sectionHead({ kick: 'Questions', id: 'learn-faq', titleHtml: 'Good to <span class="accent">know</span>' })}
    ${faq([
      { q: 'What does (H/I) or (H/S) mean?', a: '<p>Both are hybrids. H/I leans indica and H/S leans sativa.</p>' },
      { q: 'What is deli-style flower?', a: `<p>${esc(COPY.deli)} Deli-style flower is sold by the gram, eighth, quarter, half or ounce.</p>` },
      { q: 'Who can shop at Flavors Detroit?', a: `<p>${esc(COPY.idLine)} Our age check asks whether you are at least 21 years old or a valid medical marijuana patient.</p>` },
      { q: 'Can I order online?', a: `<p>Yes. ${esc(COPY.portalLine)} <a href="${esc(SITE.portal)}" target="_blank" rel="noopener">Open the live menu<span class="visually-hidden"> (opens in a new tab)</span></a>.</p>` },
      { q: 'Where can I ask a question?', a: `<p>Call <a href="${SITE.tel}">${esc(SITE.phone)}</a>, stop in at ${esc(SITE.street)}, or message <a href="${esc(SITE.instagram)}" target="_blank" rel="noopener">${esc(SITE.instagramHandle)}<span class="visually-hidden"> on Instagram (opens in a new tab)</span></a>. We can answer your questions.</p>` },
    ])}
    <p class="footer__warning" style="margin-top:32px; color: var(--ink-3); border-color: var(--line-day)">${esc(COPY.compliance)}</p>
  </div>
</section>`;
}

export function render() {
  return page({
    path: PATH,
    title: 'Learn the Menu | Flower, Concentrates, Vapes & Edibles | Flavors Detroit',
    description: 'A plain-language guide to the Flavors Detroit menu: strain codes, sizes, deli-style flower, pre-rolls, concentrates, vapes and edibles.',
    main: [hero(), readingTheMenu(), shelves(), firstVisit(), questions()].join('\n'),
    jsonld: [breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Learn', path: '/learn' }])],
  });
}
