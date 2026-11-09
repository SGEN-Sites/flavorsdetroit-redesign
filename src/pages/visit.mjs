// visit.mjs — /visit/. Address, hours (with today marked by site.js), click-to-load map,
// wayfinding from the owner's description of the real building, what to bring, FAQ.
import { esc, rel, icon } from '../lib/html.mjs';
import { page } from '../lib/layout.mjs';
import { SITE, COPY } from '../content/site.mjs';
import { kicker, orderBtn, linkBtn, sectionHead, pageHero, storeCard, faq, storePhoto } from '../lib/parts.mjs';
import { breadcrumbJsonLd, storeJsonLd } from '../lib/seo.mjs';

export const PATH = '/visit/';
const A = (p) => rel(PATH, p);
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function hero() {
  return pageHero(PATH, {
    kick: 'Visit us',
    titleHtml: '5700 E <span class="accent">8 Mile</span> Rd, Detroit',
    lede: "Open every day, 10AM to 10PM. You'll feel right at home in our beautiful 10,000 sq ft location.",
    crumbs: [{ label: 'Visit' }],
    scene: 'rainbow-reflections', pos: '50% 72%',
    aside: storeCard(PATH, { heading: false }),
  });
}

function hoursMap() {
  const rows = DAYS.map((d) => `<tr data-day="${d}"><th scope="row">${d}</th><td>10AM–10PM</td></tr>`).join('');
  return `<section class="band band--night" aria-labelledby="hours-title">
  <div class="container visit-grid">
    <div class="stack" style="--stack:18px">
      ${kicker('Hours')}
      <h2 class="h2" id="hours-title">Open <span class="accent">every day</span></h2>
      <table class="hours-table"><caption class="visually-hidden">Store hours, Detroit time</caption><tbody>${rows}</tbody></table>
      <p class="muted small">Online orders any time on the live menu, ready for pickup in store.</p>
      <div class="cluster">${orderBtn('btn btn--order', 'Order for pickup')}<a class="btn btn--ghost" href="${SITE.tel}">${icon.phone}<span>${esc(SITE.phone)}</span></a></div>
    </div>
    <div class="stack" style="--stack:14px">
      <div class="map-frame">
        <div class="map-frame__load">
          <span class="map-frame__road" aria-hidden="true"></span>
          <svg class="map-pin" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>
          <p class="h3">5700 E 8 Mile Rd</p>
          <button class="btn btn--cream" type="button" data-map-load="${esc(SITE.mapEmbed)}" data-map-title="Map: Flavors Detroit, ${esc(SITE.addressLine)}">${icon.pin}<span>Show the map</span></button>
          <p class="fine muted">The map loads from Google Maps when you ask for it.</p>
        </div>
      </div>
      <div class="cluster">
        <a class="btn btn--ghost" href="${esc(SITE.directionsUrl)}" target="_blank" rel="noopener">${icon.directions}<span>Get directions</span><span class="visually-hidden"> (opens Google Maps in a new tab)</span></a>
        <a class="btn btn--ghost" href="${esc(SITE.mapsUrl)}" target="_blank" rel="noopener">${icon.pin}<span>Open in Google Maps</span><span class="visually-hidden"> (opens in a new tab)</span></a>
      </div>
    </div>
  </div>
</section>`;
}

function wayfinding() {
  const items = [
    { title: 'Look for the sign', text: 'A black, cloud-shaped sign outlined in marquee bulbs, with a glowing neon 5700, on a blue tower.', media: storePhoto(PATH, 'sign', { sizes: '(max-width: 760px) 92vw, 400px' }) },
    { title: 'Then the green cross', text: 'A dark building with a green cross.', media: storePhoto(PATH, 'front', { sizes: '(max-width: 760px) 92vw, 400px' }) },
    { title: 'Step inside', text: 'A bright, glossy showroom with deli-style displays: glass jars of flower on navy counters glowing with blue LED underglow.', media: storePhoto(PATH, 'merch', { sizes: '(max-width: 760px) 92vw, 400px' }) },
  ];
  return `<section class="band band--white" aria-labelledby="find-title">
  <div class="container">
    ${sectionHead({ kick: 'How to find us', id: 'find-title', titleHtml: 'You can\'t miss <span class="accent">5700</span>', lede: 'Right on 8 Mile in Detroit, MI 48234.' })}
    <div class="wayfind">${items.map((it, i) => `<div class="wayfind__item" data-reveal style="--i:${i}">${it.media}<div class="stack" style="--stack:6px"><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></div></div>`).join('')}</div>
  </div>
</section>`;
}

function bring() {
  return `<section class="band band--navy" aria-labelledby="bring-title">
  <div class="container">
    ${sectionHead({ kick: 'Before you come', id: 'bring-title', titleHtml: 'Three things to <span class="accent">know</span>' })}
    <div class="steps swipe">
      <div class="step" data-reveal><p class="step__n">1</p><h3>Bring your ID</h3><p>${esc(COPY.idLine)}</p></div>
      <div class="step" data-reveal style="--i:1"><p class="step__n">2</p><h3>Order ahead</h3><p>${esc(COPY.portalLine)} Online orders any time.</p></div>
      <div class="step" data-reveal style="--i:2"><p class="step__n">3</p><h3>Ask a budtender</h3><p>Look for a strain you love, or come in and have our budtenders help you decide!</p></div>
    </div>
  </div>
</section>`;
}

function questions() {
  return `<section class="band band--day" aria-labelledby="visit-faq">
  <div class="container container--narrow">
    ${sectionHead({ kick: 'Questions', id: 'visit-faq', titleHtml: 'Visiting <span class="accent">Flavors</span>' })}
    ${faq([
      { q: 'When are you open?', a: '<p>Every day, 10AM to 10PM.</p>' },
      { q: 'Where is Flavors Detroit?', a: `<p>${esc(SITE.addressLine)}. <a href="${esc(SITE.directionsUrl)}" target="_blank" rel="noopener">Get directions<span class="visually-hidden"> (opens in a new tab)</span></a>.</p>` },
      { q: 'Can I order ahead?', a: `<p>Yes. ${esc(COPY.portalLine)} <a href="${esc(SITE.portal)}" target="_blank" rel="noopener">Open the live menu<span class="visually-hidden"> (opens in a new tab)</span></a>, then pick up in store.</p>` },
      { q: 'What do I need to bring?', a: `<p>${esc(COPY.idLine)} Medical patients should also bring a valid medical marijuana card.</p>` },
      { q: 'Do you serve medical patients?', a: `<p>We've got the highest quality flower to suit any medical or recreational need. Questions? Call us at <a href="${SITE.tel}">${esc(SITE.phone)}</a>.</p>` },
      { q: 'How do I hear about new drops?', a: `<p>${esc(COPY.mailTitle)} ${esc(COPY.mailSub)}. You can also follow <a href="${esc(SITE.instagram)}" target="_blank" rel="noopener">${esc(SITE.instagramHandle)}<span class="visually-hidden"> on Instagram (opens in a new tab)</span></a> for specials, product photos and news.</p>` },
    ])}
  </div>
</section>`;
}

export function render() {
  return page({
    path: PATH,
    title: 'Visit Flavors Detroit | 5700 E 8 Mile Rd, Detroit, MI 48234',
    description: 'Visit Flavors Detroit at 5700 E 8 Mile Rd, Detroit, MI 48234. Open every day, 10AM to 10PM. Call (313) 733-4464 or order online for pickup.',
    main: [hero(), hoursMap(), wayfinding(), bring(), questions()].join('\n'),
    jsonld: [storeJsonLd(), breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Visit', path: '/visit' }])],
  });
}
