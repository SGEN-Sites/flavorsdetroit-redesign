# Flavors Detroit — website redesign

**Preview:** https://sgen-sites.github.io/flavorsdetroit-redesign/ (noindex; menu links open the live Flavors Detroit menu)

A full rebuild of https://www.flavorsdetroit.com/ (a Wix site) as a fast, static, platform-free
site for Flavors Detroit, 5700 E 8 Mile Rd, Detroit, MI 48234. The words are the client's own,
captured from the live site, its blog and its live ordering menu; the look is new and comes from
the real building.

**Art direction: "Lit up on 8 Mile"** — retro roadside marquee meets modern showroom.
Night bands are the roadside sign (the logo with its 53 real marquee bulbs lit in a chase, a
royal-blue corrugated tower, a neon 5700). Day bands are the showroom (glossy white, glass jars on
navy counters with blue LED underglow, deli price tags). The rainbow awning stripe, measured from
the client's own artwork, is the flag, used sparingly. See `BRAND-SYSTEM.md`.

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

## Verification (final run 2026-11-09)

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
  (the preview forms).
- `sr-fabrication`: 1,859 claims checked, all traced to the live site, the live menu or declared facts.
- `sr-decontaminate`: clean, no trace of Wix in 141 files. `sr-seo`: 0 migration findings.
- `tools/contrast.mjs`: every palette text pair clears WCAG AA (lowest 5.19:1).
- `sr-gate.mjs`: NOT-READY, 20 PASS / 7 FAIL / 2 UNPROVEN; each non-pass is explained in
  `PITCH-NOTES.md` (Gate verdict).
