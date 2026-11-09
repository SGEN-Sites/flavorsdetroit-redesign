// site.mjs — the one source of store facts and client copy for every template.
// Facts come from facts/client-facts.json (each entry names its source). Copy below is the
// client's own words from the live site (audit/raw, audit/pages), rewritten from all caps into
// sentence case with the words unchanged; any new neutral glue (labels, buttons) is marked GLUE.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const read = (p, d = null) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch { return d; } };

import { displayPosts } from './case.mjs';

export const facts = read('facts/client-facts.json');
export const menu = read('src/content/menu.json');
// Posts as displayed: the owner's sentence-case rule applied word by word (originals stay in
// src/content/posts.json as textOriginal / titleOriginal).
export const postsData = displayPosts(read('src/content/posts.json', { posts: [] }));
export const images = read('src/content/images.json', {});
// AI scene stills (tools/process-gen.py): provenance sidecar with model, request id, seed and alt.
export const gen = read('src/content/generated-images.json', { items: {} });
// The owner's store photos (tools/store-photos.py): alt text, crops and what was retouched.
export const photos = read('src/content/store-photos.json', { items: {} });
export const bulbs = read('src/content/logo-bulbs.json');

const addr = facts.addresses[0];
export const SITE = {
  name: 'Flavors Detroit',
  liveOrigin: 'https://www.flavorsdetroit.com',
  phone: facts.phone[0].value,
  tel: 'tel:' + facts.phone[0].tel,
  street: '5700 E 8 Mile Rd',
  city: 'Detroit', region: 'MI', zip: '48234',
  addressLine: addr.value,
  // The live site's own short link (goo.gl/maps/usLEyaF1tRV9tFTy9) resolves to a pin labelled
  // "5730 East 8 Mile Road" (checked 2026-11-08), so map links search the business at 5700.
  mapsUrl: addr.mapsSearch,
  directionsUrl: addr.directions,
  mapEmbed: 'https://www.google.com/maps?q=' + encodeURIComponent('Flavors Detroit, ' + addr.value) + '&output=embed',
  portal: facts.store.ordering.url,
  instagram: facts.store.instagram.url,
  instagramHandle: facts.store.instagram.value,
  hoursLabel: 'Open every day, 10AM to 10PM',
  hoursShort: 'Every day · 10AM–10PM',
  hoursAttr: '10:00-22:00',
  hoursSchema: facts.hours.schema,
  tz: facts.hours.timeZone,
  year: 2026,
  exitUrl: 'https://www.google.com/',
};

export const NAV = [
  { label: 'Shop', path: '/shop/' },
  { label: 'Deals', path: '/daily-deals/' },
  { label: "The Owner's Box", path: '/owners-box/' },
  { label: 'Visit', path: '/visit/' },
  { label: 'Learn', path: '/learn/' },
  { label: 'News', path: '/blog/' },
  { label: 'Contact', path: '/contact/' },
];

// ---- the client's words (LIVE home page unless noted) ------------------------------------------
export const COPY = {
  tagline: 'A traditional dispensary with a modern twist',                      // LIVE home + PORTAL
  metaHome: 'Flavors Detroit embodies a sleek, modern style with deli style displays that showcase our premium products with sophistication and clarity. We take pride in offering best-in-class service, ensuring every customer enjoys a seamless and personalized experience. Our commitment to quality means that every item we carry meets the highest standards. Despite the superior offering our pricing remains highly competitive, providing unparalleled value for those who seek both quality and affordability.',
  deli: 'Flavors Detroit embodies a sleek, modern style with deli style displays that showcase our premium products with sophistication and clarity.',
  service: 'We take pride in offering best-in-class service, ensuring every customer enjoys a seamless and personalized experience.',
  quality: 'Our commitment to quality means that every item we carry meets the highest standards.',
  value: 'Despite the superior offering our pricing remains highly competitive, providing unparalleled value for those who seek both quality and affordability.',
  ourFlavors: 'Our flavors',
  categories: [
    { id: 'flower', name: 'Flower', text: "We've got the highest quality flower to suit any medical or recreational need. Look for a strain you love, or come in and have our budtenders help you decide!", img: 'cat-flower.webp', img2: 'cat-flower@2x.webp', mode: 'cutout', alt: 'A cannabis flower bud' },
    { id: 'concentrates', name: 'Concentrates', list: ['Shatter', 'Batter and budder', 'Live rosin', 'Hash', 'Crumble and sugar', 'Infused prerolls'], img: 'cat-concentrates.webp', img2: 'cat-concentrates@2x.webp', mode: 'screen', alt: 'An amber cannabis concentrate' },
    { id: 'edibles', name: 'Edibles', text: "We have the best selection of gummies, chocolate, and other infused treats. A variety of tastes for any flavor you're craving!", img: 'cat-edibles.webp', img2: 'cat-edibles@2x.webp', mode: 'screen', alt: 'A pile of sour gummies' },
    { id: 'more', name: 'Much more', text: "We have cartridges, topicals, drinks and tinctures: a quality product for all occasions! You'll be sure to find what you need, let us know what you're looking for!", art: 'more' },
  ],
  whoTitle: 'Flavors Detroit: who are we?',
  who: [
    'Located in the heart of Metro Detroit, we are a traditional dispensary with a modern twist.',
    'For years we have been serving the finest flower and cannabis products to our patients. You\'ll feel right at home in our beautiful 10,000 sq ft location.',
    'We\'ve got a new look, but we\'re still serving up all the flavors you love. Stop in today and check us out!',
  ],
  mailTitle: 'Join our mailing list today!',
  mailSub: 'Receive new product alerts before everyone else',
  mailNote: "You're one step away! We promise we won't spam you.",
  mailButton: 'Subscribe now',
  socialTitle: 'Get social with Flavors Detroit',
  socialText: 'Updated with our specials, product photos, news, and so much more! Interact with us! Give us feedback! We can answer your questions.',
  socialFollow: 'Follow us today!',
  contactTitle: 'Contact & location',
  contactSub: 'Tell us what you think and how we\'re doing',
  gateTitle: 'Are you eligible to enter FlavorsDetroit.com?',                      // LIVE age gate
  gateText: 'Are you at least 21 years old or a valid medical marijuana patient and agree to the',
  compliance: 'For adults 21+ only. Keep cannabis products away from children. Product selection, availability and pricing may change.', // LIVE post 2026-10-11
  idLine: 'For adults 21+ only. Valid government-issued photo ID required.',       // LIVE post 2026-08-30
  portalLine: 'Order cannabis online for pickup.',                                  // PORTAL
  portalId: 'Bring a valid ID at pickup or delivery.',                              // PORTAL
  customers: 'Over 1 Million Customers Served',                                     // LIVE blog index, 2026-08-04 post
};

// ---- the Owner's Box (BRIEF name; LIVE 2026-10-11 post words; PORTAL collection, captured) ----
const boxPost = facts.ownersBox;
const boxLive = (menu && menu.ownersBox) ? menu.ownersBox.items : [];
export const OWNERS_BOX = {
  name: "The Owner's Box",
  collection: menu?.ownersBox?.collection || 'Owners Box - Exclusive Flower',
  intro: 'Not everything on the shelf is everyday flower.',                          // LIVE post 2026-10-11
  body: 'At Flavors Detroit, we also carry a small group of high-end, extremely exclusive premium strains for customers who want something more rare, more flavorful, and more elevated from the average menu pick.',
  chase: 'These are the strains for shoppers chasing top-tier flavor, standout bag appeal, rich terpene profiles, and a more luxurious smoke. If you\'re looking for the best of the best, this is where to start.',
  classOwn: 'These premium drops are in a class of their own:',
  strains: boxPost.strains.map((s) => {
    const key = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const live = boxLive.find((l) => l.name.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '') === key);
    return { name: s.name, notes: s.notes, type: live?.type || 'Hybrid', thc: live?.thc || null, eighth: live?.eighth || null, perGram: live?.perGram || null, code: live ? (live.name.match(/\(([^)]+)\)\s*$/) || [])[1] : null };
  }),
  asOf: menu?.asOfLabel || 'November 8, 2026',
  postDate: 'October 11, 2026',
};

/** Source-dated label used next to every price. */
export const ASOF = `Live menu prices, ${menu?.asOfLabel || 'November 8, 2026'}`;
