# Flavors Detroit — website redesign

A full rebuild of https://www.flavorsdetroit.com/ (a Wix site) as a fast, static, platform-free
site for Flavors Detroit, 5700 E 8 Mile Rd, Detroit, MI 48234. The words are the client's own,
captured from the live site, its blog and its live ordering menu; the look is new and comes from
the real building.

**Art direction: "Lit up on 8 Mile"** — retro roadside marquee meets modern showroom, in the
owner's palette: **black first, then the store's blue, then whites** (the blue measured from store
photos). The home hero is the store itself at golden hour (the owner's storefront photo, relit
with AI and labelled), the street running on to the left behind the words in black and white (an
AI extension); the drawn roadside sign (the logo with its 53 real marquee bulbs lit in a
chase on a wide, short blue corrugated tower) plays in the opening splash and on the 404 page.
Black bands carry the deals, the Owner's Box and the category cards. White bands are the showroom
(glossy white, deli price tags). The six stripe colours appear only as thin spectrum dividers. The
store itself appears in the owner's own photos (upscaled and colour graded; the storefront shot had
the car dashboard it was taken through removed, the counter shot its customers and staff, both with
AI fill, labelled as edited). Titles and larger text are Outfit, text is Work Sans (the owner's
choice); outlined words use Outfit's own static builds so their outlines have no seams. A cinematic layer sits on top: scene stills behind the inner page heroes and
several bands (AI illustrations, labelled as such, never the store), crossing tapes, category cards on a pinned
rail, the day's deals as a bento with product illustrations on black, the Owner's Box in a chasing bulb frame, a kinetic type band,
a scroll-lit statement and a lit finale, all on one scroll-aware animation loop with a Pause motion
button; each visit opens with the "Sign ignition" splash. The owner's design choices (fonts,
splash) were made from the option pages in `design-options/`. See `BRAND-SYSTEM.md`.

## Pages

| URL | Page | Source |
|---|---|---|
| `/` | Home | live home page, live menu, posts |
| `/shop/` | Shop the live menu | live menu (flavors-detroit.portal42.com) |
| `/daily-deals/` | Daily deals & more | live menu capture of 2026-11-08, posts (the live `/daily-deals` answers 404; the nav still links it) |
| `/owners-box/` | The Owner's Box | live menu "Owners Box - Exclusive Flower" collection, 2026-10-11 post |
| `/visit/` | Visit us | live site facts + the owner's description of the building |
| `/learn/` | Learn | client product lists + new neutral definitions (owner to approve) |
| `/blog/` | Flavors news | live blog index |
| `/post/<slug>/` | 127 posts | every live post, word for word, at its live URL |
| `/contact/` | Contact & location | the live home page's contact form |
| `/terms-of-service/` | Terms of service | word for word (street number corrected) |
| `/404.html` | Not found | new |

Every page shares one header (live open/closed status computed in Detroit time, hours, address,
phone, Instagram, and an always-visible **Order now** that opens the live menu), one footer, a
phone dock (Order now, call, directions) and the age gate (21+ or medical patient, remembered for
30 days).

## Build

```
node src/build.mjs                 # -> dist/  (production: indexable, canonical to flavorsdetroit.com)
node src/build.mjs --preview       # noindex on every page, robots.txt disallows all
SITE_BASE=/flavorsdetroit-redesign/ node src/build.mjs --preview   # for the GitHub Pages preview (404 page base)
```

No npm dependencies. Node 18+ for the build; Python 3 + Pillow only to re-derive images.

| Command | What it does |
|---|---|
| `python3 -I tools/process-images.py` | derive every picture from the client's own files (logo resized only) |
| `python3 -I tools/detect-bulbs.py` | find the 53 marquee bulbs in the logo for the lit-sign overlay |
| `python3 -I tools/process-gen.py` | derive the scene stills' WebP sizes from the AI renders, with IPTC "AI-generated" XMP |
| `python3 -I tools/category-renders.py` | the category cards' product renders: measures each card's colour (the render's backdrop) and its ink contrast, takes the BiRefNet cut-out, fills gaps inside the glass, rebuilds jar walls the cut-out bit away, writes WebP sizes with IPTC "AI-generated" XMP |
| `node tools/deal-download.mjs [--cutouts]` + `python3 -I tools/deal-renders.py` | the home deals bento's product images (AI illustrations and the owner's own photos; provenance `assets/generated/jobs-deals.json`): download renders and cut-outs, fill gaps in the glass, rebuild bitten walls object by object, make clear glass see-through (the dish found as a circle, its shadow a darkening), WebP sizes with IPTC XMP |
| `python3 -I tools/store-photos.py masks\|composite\|touchup\|finish` | the owner's store photos: fill masks, composite (the photo kept outside each mask), grade, crops and WebP sizes with IPTC XMP (originals private) |
| `node tools/scene-contrast.mjs` | WCAG contrast for text over scene stills, measured on the rendered pixels |
| `node tools/motion-check.mjs` | the motion layer with motion ON: rail, scroll-speed marquees, progress, back-to-top, finale, Pause motion, overflow, console |
| `node tools/fetch-fonts.mjs` | self-host the fonts once (SIL OFL): Outfit, Work Sans and Tilt Neon from Google Fonts, and the designer's static Outfit 400/800 for outlined words (pinned commit, subset to Latin with fontTools) |
| `node tools/menu-facts.mjs` | turn the live-menu capture into `src/content/menu.json` + facts |
| `node tools/extract-posts.mjs` | turn the captured posts into `src/content/posts.json` (100% word recall) |
| `node tools/check.mjs` | rendered + functional checks (5 viewports, age gate, drawer, tabs, forms, map, no-JS) |
| `node tools/sweep.mjs` | the skill's responsive sweep at 390 / 768 / 1024 / 1440 |
| `node tools/shoot.mjs --paths / --vp 1440x900,390x844 --full` | screenshots into `audit/shots/` |
| `node tools/contrast.mjs` | WCAG contrast for every palette pair |

## Where things are

| Path | What |
|---|---|
| `src/content/` | `site.mjs` (facts + client copy), `menu.json`, `posts.json`, `images.json`, `logo-bulbs.json` |
| `src/styles/` | `tokens.css` (brand tokens), `base`, `chrome`, `components`, `pages`, `motion` |
| `src/lib/` | `layout.mjs` (shell), `parts.mjs` (components), `seo.mjs` (JSON-LD), `html.mjs` |
| `src/pages/` | one module per page; `news.mjs` renders the blog index and all 127 posts |
| `src/scripts/site.js` | behaviour (no dependencies; every page works without it) |
| `src/assets/` | self-hosted fonts (SIL OFL) and derived images |
| `facts/client-facts.json` | every declared fact with its source (live site, live menu, owner's brief) |
| `audit/` | the capture (raw HTML is evidence, never edited) and every check's report |
| `docs/` | this file, `DEPLOY.md`, `BRAND-SYSTEM.md`, `CHANGE-LOG.md`, `PITCH-NOTES.md` |

## Verification (final run 2026-11-09, after the owner's store photos, the golden-hour hero, the plate-less tower and the black category band)

- `tools/check.mjs`, every page: 137 pages at 1440x900 and 390x844 (274 renders) and the 10 main
  pages plus 6 posts at 360x740, 768x1024 and 1024x768 as well. 0 failures: no sideways scroll, no
  console errors, no broken images or internal links, standalone tap targets at least 44px on
  touch sizes (24px on desktop), no visible text under 13px, one H1 per page, every text colour at
  WCAG AA contrast against its real background.
- Functional checks all pass: age gate (shows on first visit, traps focus, Escape-safe, remembered,
  medical-patient entry, never covers the Terms page), live open status, tabs (click and arrow
  keys), forms (invalid blocked, valid shows the preview notice), news year filter and show more,
  map loads only on click, phone drawer (traps focus, Escape closes, focus returns), 0 running
  animations under reduced motion, content visible without JavaScript, and the home hero fits the
  first screen with Order now visible at 1440x900, 1280x720, 1024x768, 390x844 and 360x740.
- `sr-sweep` at 390/768/1024/1440 over 14 pages: 0 majors; 6 blockers, all "form has no action"
  (the preview forms). (An earlier run flagged 29 majors: the drifting light pools were off-canvas
  circles; they are now band-sized layers with the light drawn at the same place.)
- `tools/motion-check.mjs` (motion on, at 1440, 1024, 390 and 360 wide): 54 of 54, including the
  splash (plays, ends, skips, hands over to the age gate), the category rail and no sideways scroll
  at 360. `tools/scene-contrast.mjs`: 598 lines of text over scene stills and the hero photo, all
  clear WCAG AA on the rendered pixels (the hero's "modern twist" failed at 1024 before its accent
  became the pale neon blue: 1.46:1 over the blue tower).
- `tools/check.mjs` is hardened against false failures (2026-11-09): a navigation that stalls is
  retried and noted, a page that will not load is a recorded failure (no longer a crash), and an
  image hidden from view (the answered age gate's backdrop) is verified by loading its file.
- `sr-fabrication`: 1,859 claims checked, all traced to the live site, the live menu or declared facts.
- `sr-decontaminate`: clean, no trace of Wix in 141 files. `sr-seo`: 0 migration findings.
- `tools/contrast.mjs`: all 25 palette text pairs clear WCAG AA (lowest 5.58:1).
- `sr-gate.mjs`: NOT-READY, 20 PASS / 7 FAIL / 2 UNPROVEN; each non-pass is explained in
  `PITCH-NOTES.md` (Gate verdict).
