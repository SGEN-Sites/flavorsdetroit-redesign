// learn.mjs — /learn/. A plain-language guide to the shelves. The product lists come from the
// client (home page, posts, live menu); the short definitions are NEW, neutral copy written for
// this page (no effects, no health claims) and are flagged for the owner's approval in
// docs/PITCH-NOTES.md.
import { esc, rel, icon } from '../lib/html.mjs';
import { page } from '../lib/layout.mjs';
import { SITE, COPY, menu } from '../content/site.mjs';
import { kicker, orderBtn, linkBtn, sectionHead, pageHero, tabs, askBudtender, spectrum } from '../lib/parts.mjs';
import { breadcrumbJsonLd } from '../lib/seo.mjs';

export const PATH = '/learn/';
const A = (p) => rel(PATH, p);

// (owner, 2026-11-09: "update sections here to how we updated the other pages and how we made the home page; no
// cropped images, images must be crisp and HD; include icons to some cards as visual aid")
const gloss = (items) => `<dl class="glossary">${items.map(([ic, term, d]) => `<div class="glossary__item">${ic ? `<span class="glossary__ico" aria-hidden="true">${icon[ic]}</span>` : ''}<div><dt>${esc(term)}</dt><dd>${esc(d)}</dd></div></div>`).join('')}</dl>`;
// a shelf's product: the site's own HD AI cut-outs (the home category + deal renders), shown whole on a solid colour card
const product = (imgs, colour, cap) => `<figure class="shelf-card" style="--shelf:${colour}">
      <div class="shelf-card__art">${imgs.map(([src, w, h, alt]) => `<img src="${A('/assets/img/' + src.replace('@', '440').replace('#', '360'))}" srcset="${A('/assets/img/' + src.replace('@', '440').replace('#', '360'))} 1x, ${A('/assets/img/' + src.replace('@', '880').replace('#', '720'))} 2x" width="${w}" height="${h}" alt="${esc(alt)}" data-ai="generated" loading="lazy" decoding="async">`).join('')}</div>
      <figcaption>${esc(cap)}</figcaption>
    </figure>`;
const panel = (intro, list, media) => `<div class="learn-panel"><div class="stack" style="--stack:18px"><p class="lede">${intro}</p>${list}</div>${media}</div>`;

function hero() {
  return pageHero(PATH, {
    kick: 'Learn',
    titleHtml: 'Know your <span class="accent">flavors</span>',
    lede: 'A plain-language guide to what is on the shelves at Flavors Detroit. Still deciding? Come in and have our budtenders help you decide!',
    crumbs: [{ label: 'Learn' }],
    whole: 'learn-bud',
    aside: `<div class="cluster">${orderBtn('btn btn--order btn--lg', 'Browse the menu')}</div>`,
  });
}

function readingTheMenu() {
  const key = [['(I)', 'Indica', 'Plants with a shorter, bushier build and broad leaves.'],
    ['(S)', 'Sativa', 'Plants with a taller build and narrow leaves.'],
    ['(H)', 'Hybrid', 'A cross of both. On the menu, H/I leans indica and H/S leans sativa.']];
  const sizes = [['1g', 'a gram', ''], ['⅛', 'an eighth', '3.5g'], ['¼', 'a quarter', '7g'], ['½', 'a half', '14g'], ['1oz', 'an ounce', '28g']];
  return `${spectrum()}
<section class="band band--black" aria-labelledby="key-title">
  <div class="container">
    ${sectionHead({ kick: 'Reading the menu', id: 'key-title', titleHtml: 'What the letters <span class="accent">mean</span>', lede: 'Strains on the Flavors Detroit menu carry a short code after the name, like Kush Mints (H) or Grape Cake (I).' })}
    <div class="code-cards">${key.map(([c, h, p], i) => `<div class="code-card" data-reveal style="--i:${i}"><span class="code-card__ico" aria-hidden="true">${icon.leaf}</span><p class="code-card__code">${c}</p><h3>${h}</h3><p>${p}</p></div>`).join('')}</div>
    <div class="sizes">
      <div class="sizes__head"><h3 class="h3">Sizes on the menu</h3>${linkBtn(PATH, '/daily-deals/', 'See the deals', 'btn btn--ghost')}</div>
      <ul class="sizes__row" role="list">${sizes.map(([s, n, g]) => `<li class="size-chip"><span class="size-chip__s">${s}</span><span class="size-chip__n">${n}${g ? `, ${g}` : ''}</span></li>`).join('')}</ul>
      <p class="visually-hidden">1g is a gram. ⅛ is an eighth, 3.5g. ¼ is a quarter, 7g. ½ is a half, 14g. 1oz is an ounce, 28g.</p>
    </div>
  </div>
</section>`;
}

function shelves() {
  const flower = panel(esc("We've got the highest quality flower to suit any medical or recreational need. Look for a strain you love, or come in and have our budtenders help you decide!"),
    gloss([
      ['ruler', 'Deli-style flower', 'Flavors flower sold by the gram, eighth, quarter, half or ounce, in five price tiers from $3 to $15 a gram.'],
      ['jar', 'Prepacked eighths', `Flavors 3.5G prepacks. ${menu.eighths.count} strains are $10 each on the live menu.`],
      ['bag', 'Prepacked ounces', 'Flavors 28G prepacks in tiers from $19 to $85.'],
      ['leaf', 'Top shelf shake', 'Smaller pieces of top shelf flower, packed by the ounce.'],
    ]),
    product([['cat/flower-cut-@.webp', 270, 440, 'Illustration: a glass jar with a black lid, filled to the brim with green cannabis buds']], 'var(--card-flower)', 'Flower'));
  const rolls = panel('Ready to smoke, from single grams to party packs.',
    gloss([
      ['joint', 'Pre-rolls', 'Ready-to-smoke joints, including $1 Hello Farms 1G singles.'],
      ['joint', 'Jumbo pre-rolls', 'Flavors 1.3G jumbo pre-rolls.'],
      ['drop', 'Infused pre-rolls', 'Pre-rolls with concentrate added.'],
      ['spark', 'Tarantula', 'A Tarantula joint incorporates top shelf flower, premium concentrates, and kief.'],
    ]),
    product([['deal/preroll-stand-#.webp', 125, 360, 'A pre-roll with a kraft paper tip, standing at a slant']], 'var(--card-more)', 'Pre-rolls'));
  const conc = panel(esc('Shatter, batter and budder, live rosin, hash, crumble and sugar, and infused prerolls, plus the textures below.'),
    gloss([
      ['spark', 'Shatter', 'A glassy, brittle concentrate that snaps when you break it.'],
      ['jar', 'Batter and budder', 'Whipped concentrates with a soft, creamy texture.'],
      ['drop', 'Crumble and sugar', 'Dry or grainy concentrates that break apart easily.'],
      ['spark', 'Cured sugar', 'A sugary texture made from dried and cured plant material.'],
      ['drop', 'Live resin sauce', 'A runny concentrate made from fresh-frozen plants, often with crystals in it.'],
      ['leaf', 'Live rosin and hash', 'Solventless options: hash is collected resin, and rosin is pressed from it with heat and pressure.'],
    ]),
    product([['cat/concentrates-cut-@.webp', 308, 440, 'Illustration: a small glass jar with a black lid, filled with golden-amber cannabis budder']], 'var(--card-concentrates)', 'Concentrates'));
  const vapes = panel('Flavors Detroit carries a wide variety of 510 thread cartridges plus 1G, 2G, and 3G disposable vapes in both distillate and live resin options.',
    gloss([
      ['vape', '510 thread cartridge', 'The common screw-in cartridge that fits most vape batteries.'],
      ['vape', 'Disposable', 'An all-in-one vape with the battery built in.'],
      ['drop', 'Distillate', 'A refined cannabis oil, often with flavor added.'],
      ['leaf', 'Live resin', 'Oil made from fresh-frozen plants.'],
    ]),
    product([['deal/cart-#.webp', 68, 360, 'Illustration: a vape cartridge, golden oil in a clear tank under a black mouthpiece'], ['deal/disposable-#.webp', 47, 360, 'Illustration: a slim black disposable vape pen']], 'var(--royal)', 'Vapes'));
  const edibles = panel(esc("We have the best selection of gummies, chocolate, and other infused treats. A variety of tastes for any flavor you're craving!"),
    gloss([
      ['jar', 'Gummies and chews', 'Infused gummies and chews in a range of flavors and strengths.'],
      ['spark', 'Chocolate and treats', 'Infused chocolates, cookies and other treats.'],
      ['can', 'Drinks and syrups', 'Infused drinks and syrups.'],
      ['bottle', 'Tinctures and topicals', 'Tinctures are liquid extracts taken by dropper. Topicals are lotions and rubs for the skin.'],
    ]),
    product([['cat/edibles-cut-@.webp', 261, 440, 'Illustration: a glass jar with a black lid, filled to the brim with sugar-coated fruit gummies'], ['cat/more-cut-@.webp', 174, 440, 'Illustration: a cream-white drink can of a cannabis beverage, with a green leaf emblem']], 'var(--card-edibles)', 'Edibles & more'));
  return `${spectrum()}
<section class="band band--night band--lit" aria-labelledby="shelves-title" style="--lx: 85%; --ly: 0%">
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
  // white (owner, 2026-11-09: "this section from learn page can be white")
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
  // the shared "ask a budtender" phone (as on /visit/), words unchanged
  return askBudtender(PATH, { key: 'lfaq', id: 'learn-faq', titleHtml: 'Good to <span class="accent">know</span>', items: [
      { q: 'What does (H/I) or (H/S) mean?', a: '<p>Both are hybrids. H/I leans indica and H/S leans sativa.</p>', icon: 'leaf' },
      { q: 'What is deli-style flower?', a: `<p>${esc(COPY.deli)} Deli-style flower is sold by the gram, eighth, quarter, half or ounce.</p>`, icon: 'ruler' },
      { q: 'Who can shop at Flavors Detroit?', a: `<p>${esc(COPY.idLine)} Our age check asks whether you are at least 21 years old or a valid medical marijuana patient.</p>`, icon: 'id' },
      { q: 'Can I order online?', a: `<p>Yes. ${esc(COPY.portalLine)} <a href="${esc(SITE.portal)}" target="_blank" rel="noopener">Open the live menu<span class="visually-hidden"> (opens in a new tab)</span></a>.</p>`, icon: 'bag' },
      { q: 'Where can I ask a question?', a: `<p>Call <a href="${SITE.tel}">${esc(SITE.phone)}</a>, stop in at ${esc(SITE.street)}, or message <a href="${esc(SITE.instagram)}" target="_blank" rel="noopener">${esc(SITE.instagramHandle)}<span class="visually-hidden"> on Instagram (opens in a new tab)</span></a>. We can answer your questions.</p>`, icon: 'chat' },
  ] });   // the compliance line is in the footer on every page (owner, 2026-11-09: removed here)
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
