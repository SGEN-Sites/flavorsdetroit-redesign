# Pitch notes — Flavors Detroit redesign

Built 2026-11-08/09 from the live site (captured), its 127 blog posts and the live ordering menu
(flavors-detroit.portal42.com, captured 2026-11-08). Preview pages are `noindex`.

## Kept exactly

- Every live URL that answers 200: `/`, `/blog`, all 127 `/post/<slug>` pages, `/terms-of-service`.
  `/daily-deals` (in the live nav, but answering 404) is restored.
- The client's words: home page copy, the age-gate question, mailing list, Instagram and contact
  copy, every post word for word (100% word recall measured against the capture), the Terms of
  Service word for word. All-caps copy is now sentence case with the same words.
- The logo, untouched (resized only). The home page title tag.
- Every price shown comes from the live menu (dated November 8, 2026) or a dated post.

## New

- The design ("Lit up on 8 Mile"), the lit sign with the logo's own 53 bulbs, the Shop, Owner's
  Box, Visit, Learn and Contact pages, the 404, the age gate's medical-patient button, the live
  open/closed status, the phone dock, deal tabs, the deli counter board and the ounce ladder.
- Learn page definitions (shatter, budder, 510 cartridge…) are new, neutral copy written for the
  page: no effects and no health claims. **Owner to approve.**
- Hero line "Deli-style displays, top-shelf flower and Detroit prices…" is glue built from the
  client's facts and phrases.
- The cinematic layer (2026-11-09): a living hero (first a night-road still with the drawn sign, now
  the store itself at golden hour, below); crossing tapes over the
  seam; the category cards on a pinned rail; deal tickets hanging over neon; the Owner's Box in a
  chasing bulb frame; a kinetic type band; a scroll-lit "who are we" statement with counting stats;
  glass panels over bokeh; a scene behind every inner page hero; a footer wordmark that lights up
  at the end. One scroll-aware loop makes the page answer every scroll (marquees speed up with the
  scroll, light curtains and beams on arrival, drifting light, depth), with a **Pause motion**
  button (WCAG 2.2.2). Eight scene stills are AI illustrations (fal flux-pro 1.1 ultra), labelled in
  the files, the markup and the footer, and none shows the store (`CHANGE-LOG.md`, Imagery).
- The owner's choices, 2026-11-09: the palette reads black first, then the store's blue (measured
  from store photos), then whites; the striped awnings are gone (the six colours stay as thin
  dividers); headlines in **Jockey One** with **Barlow** text (pairing A, measured as the closest
  match to the sign's lettering); the **Sign ignition** splash (concept 1) opens the first page of
  each visit, then hands over to the age gate. Later the same day: no number plate on the drawn
  sign's tower, and the tower wider (the real sign's proportion) and shorter; the category band
  black with white only as accents (no faded "Flavors" word, no light lines behind the words).
- **The store, in the owner's own photos** (2026-11-09): the home hero is the storefront at golden
  hour (relit with AI at the owner's request, labelled); the main counter and the green letter wall
  (home), the storefront (home visit band), the sign, the front and the merch counter (`/visit/`),
  upscaled and colour graded. The storefront was shot through a car windshield: the dashboard and
  wiper were removed with AI fill. The counter photo showed customers and staff: they were removed
  with AI for their privacy, and the counter behind them filled in. Every pixel outside those areas
  is the photo; the edited files are labelled (`CHANGE-LOG.md`, Imagery).

## Questions for the owner

1. **The Owner's Box.** The name comes from your brief; the live menu calls the collection
   "Owners Box - Exclusive Flower" (La Rosa #15, Demon Drop, Crunch Berries at $34 an eighth on
   November 8). Is "The Owner's Box" the name you want on the site?
2. **The tower's blue.** Your storefront photo shows the tower in daylight as a mid blue (#5489BF
   measured on the sunlit paint). The drawn tower uses the site's deeper blue so it reads at night;
   say if you want it brighter.
3. **Store photos.** Your four photos are on the site now. In the counter photo the customers and
   staff were removed with AI for their privacy, and the counter behind them is filled in by AI. If
   you have their consent and would rather show the counter as it was, or have a photo of the sign
   at night, either can go in.
4. **Medical patients.** The live gate asks "21 years old or a valid medical marijuana patient";
   the live menu says "Adult-use, 21+"; the Terms (2018) say the site is "privileged to only
   Medical Marijuana Patients". Which wording should the site use, and should the Terms be updated?
5. **Forms.** Which email or SMS platform should the mailing list use, and where should contact
   messages go? The preview forms validate and show a notice; they do not send.
6. **Email.** The Terms list flavorsdetroit@gmail.com. Is it current? (The rebuild does not show
   it anywhere else.)
7. **AI scene stills.** The night road (behind the age gate and on Contact), two category cards and
   four band backdrops (seven in all) are
   AI illustrations (mood and product art, never the store, its staff or customers; labelled as AI).
   Keep them for launch, or replace any with your own photography?

## Defects found on the live site (fixed or flagged)

| defect | where | in the rebuild |
|---|---|---|
| Address shown as 5730 E 8 Mile Rd | header on every page, terms, 10 posts | 5700 everywhere |
| Your Google Maps link opens a pin labelled "5730 East 8 Mile Road" | home contact section (goo.gl/maps/usLEyaF1tRV9tFTy9) | map links search "Flavors Detroit, 5700 E 8 Mile Rd"; **check the Google Business Profile address** |
| "Daily Deals & More" in the nav, but `/daily-deals` answers 404 | every page | restored at `/daily-deals/` |
| "See Menu" buttons open `…portal42.com/menu/Flower` (and Concentrates, Edibles): "Page not found" | home categories | all menu links open the working menu home |
| 96 product links in posts open the POS back office (`pos.portal42.us/product_edit.php`) | 20 posts | shown as plain text |
| Placeholder text published: "[PHOTO OF CURRENT BUILDING GOES HERE, GOOGLE HAS OLD PICTURE]" | home | removed |
| Placeholder text published: "Header Banner:Insert your image…" | Father's Day BOGO post | removed |
| Old ordering site links (flavors-detroit.kushcart.us) | 95 posts | point to the live portal |
| Dead pages in the site's own links: `/blog/hashtags/1`, `/4`, `/5`, `/flower-menu` | sitemap / posts | redirects listed in `DEPLOY.md` |
| The phone layout is not responsive: at 390 px the page is 1,403 px wide | every page | no sideways scroll at 360 to 1440 px |
| Search basics: 135 pages without a meta description, 137 with several H1s, 142 with images lacking alt text | sitewide (`audit/seo-report.json`) | every page has a description, one H1, and alt text |
| An unlinked price board page (`/sinage`) with old prices ($6/G to $340/OUnce) | `/sinage` | redirects to `/daily-deals/` |
| A post URL left from a Wix sample ("manage-your-blog-from-your-live-site") | 1 post | kept (it is indexed); consider a new slug with a redirect |

## Build facts

CSS 22 KB and JS 11 KB gzipped, home HTML 14 KB gzipped (measured 2026-11-09), fonts self-hosted (two preloaded), no
third-party requests until a visitor opens the map, no tracking. Scene stills are WebP in three
widths (the hero also has a portrait crop for phones) and the store photos in three or four;
everything below the hero loads lazily.
Works without JavaScript (the gate stays hidden, content stays visible, every word and number is in
place).

## Gate verdict

`sr-gate.mjs` (the site-reforge Definition of Done), final run 2026-11-09 05:38 UTC (after the
owner's store photos, the golden-hour wide-shot hero with its black-and-white extension, the
plate-less tower and the black category band; same result as every run before them):
**NOT-READY — 20 PASS, 7 FAIL, 2 UNPROVEN.** Full record: `audit/gate.json` and
`audit/reports/flavorsdetroit-com-2026-11-09T05-38-22-480Z.html`.

Passing: inventory, crawl, content and SEO capture, every image measured and decided (681),
design baseline from a browser, token layer (98 tokens, 0 off-token colours), change control
(1,319 rows) and narrative slots, every source page mapped, SEO survived (0 lost titles,
descriptions, canonicals, H1s), no invented content (1,859 claims traced), no trace of Wix,
failures all resolved or accepted, docs, pages built, SEO migration clean.

| check | result | why, and what it would take |
|---|---|---|
| C03 every crawled page fetched | FAIL | 5 URLs answer 404 on the live site itself (`/daily-deals`, `/flower-menu`, three hashtag pages). `/daily-deals` is rebuilt; the rest redirect (`DEPLOY.md`). |
| C05 no JS-rendered shells | FAIL | A size heuristic flags 65 Wix pages; their words are in the static HTML (posts: 11,259 of 11,259 words recovered). Clearing it means loading 65 pages in a browser from a host that rate-limited the crawl, so it was not done. |
| C10 motion inventory | FAIL | Two Wix stylesheets are cross-origin and unreadable to the capture. Only matters for copying Wix's animations. |
| C11 rebuild reproduces source animation | FAIL | By design: a redesign does not carry Wix's 34 keyframes (slideshow, spinners, loaders). |
| C12 preset library | UNPROVEN | The design is a custom system built from the store, not SGEN presets. |
| C17 content survived | FAIL | 21 findings, all deliberate and in the ledger: Wix member-profile widgets (8 URLs), the old `/sinage` price board, shorter excerpts on the news index, a removed placeholder, and five live H2 tags that held paragraph text (the text is kept). |
| C19 forms intact | FAIL | The preview forms validate and do not post. Connecting them needs the owner's email platform and inbox (`DEPLOY.md` step 4). |
| C22 pixel match with the source | UNPROVEN | Not applicable: a redesign is meant to look different. |
| C23 responsive sweep | FAIL | 6 blockers, all the same preview forms as C19; 0 majors across 56 sweeps at 390/768/1024/1440. |
