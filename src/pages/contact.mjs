// contact.mjs — /contact/. The live home page's "Contact & location" block (same fields:
// name, email, phone, message) as its own page. Preview build: the form validates and never posts.
import { esc, rel, icon } from '../lib/html.mjs';
import { page } from '../lib/layout.mjs';
import { SITE, COPY } from '../content/site.mjs';
import { kicker, orderBtn, sectionHead, pageHero, storeCard, mailForm } from '../lib/parts.mjs';
import { breadcrumbJsonLd } from '../lib/seo.mjs';

export const PATH = '/contact/';

export function render() {
  const form = `<form class="form panel" data-preview-form="Thanks! This is a design preview, so your message was not sent. On the live site it goes straight to the Flavors Detroit team." novalidate aria-labelledby="form-title">
  <h2 class="h3" id="form-title">Send us a message</h2>
  <div class="form__row">
    <div class="field"><label for="c-name">Name <span aria-hidden="true">*</span></label><input id="c-name" name="name" type="text" autocomplete="name" required></div>
    <div class="field"><label for="c-email">Email <span aria-hidden="true">*</span></label><input id="c-email" name="email" type="email" autocomplete="email" required></div>
  </div>
  <div class="field"><label for="c-phone">Phone <span aria-hidden="true">*</span></label><input id="c-phone" name="phone" type="tel" autocomplete="tel" required></div>
  <div class="field"><label for="c-msg">Message <span aria-hidden="true">*</span></label><textarea id="c-msg" name="message" required></textarea></div>
  <p class="form-note">All fields are required.</p>
  <button class="btn btn--order btn--lg" type="submit"><span>Send</span>${icon.arrow}</button>
  <p class="form-status" aria-live="polite"></p>
</form>`;
  const main = `${pageHero(PATH, {
    kick: 'Flavors Detroit',
    titleHtml: 'Contact &amp; <span class="accent">location</span>',
    lede: esc(COPY.contactSub) + '.',
    crumbs: [{ label: 'Contact' }],
  })}
<section class="band band--day" aria-label="Contact Flavors Detroit">
  <div class="container contact-grid">
    ${form}
    <div class="stack" style="--stack:16px">
      ${storeCard(PATH)}
      <div class="panel loop__ig stack" style="--stack:12px">
        ${kicker(COPY.socialTitle)}
        <p>${esc(COPY.socialText)}</p>
        <a class="btn btn--cream" href="${esc(SITE.instagram)}" target="_blank" rel="noopener">${icon.insta}<span>Follow ${esc(SITE.instagramHandle)}</span><span class="visually-hidden"> on Instagram (opens in a new tab)</span></a>
      </div>
    </div>
  </div>
</section>
<section class="band band--white band--tight" aria-labelledby="contact-mail">
  <div class="container split">
    <div class="stack" style="--stack:12px">${kicker('New product alerts')}<h2 class="h2" id="contact-mail">${esc(COPY.mailTitle)}</h2><p class="lede">${esc(COPY.mailSub)}.</p></div>
    ${mailForm('contact-mail-form')}
  </div>
</section>`;
  return page({
    path: PATH,
    title: 'Contact & Location | Flavors Detroit, 5700 E 8 Mile Rd',
    description: 'Contact Flavors Detroit: 5700 E 8 Mile Rd, Detroit, MI 48234. Call (313) 733-4464. Open every day, 10AM to 10PM. Tell us what you think and how we\'re doing.',
    main,
    jsonld: [breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }])],
  });
}
