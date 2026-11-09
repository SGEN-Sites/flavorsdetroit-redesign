# Brand system

**"Lit up on 8 Mile": retro roadside marquee meets modern showroom.** Every choice traces to the
real store: the black cloud-shaped sign outlined in marquee bulbs with FLAVORS DETROIT lettering
and a glowing neon 5700 on a blue corrugated tower; the dark storefront with a green cross; the
bright white, glossy interior with deep navy counters glowing with blue LED underglow and glass
jars of flower like a premium deli counter.

**Owner direction, 2026-11-09:** the palette reads **black first, then blue, then whites**. The blue
is the store's own navy, measured from interior photos the owner supplied, not a bright royal; the
bright blue is only the LED underglow. The storefront's rainbow stripes were about six years old,
so the striped awnings are gone; the six colours survive only as thin spectrum dividers, to show
the variety of flavors. Headlines were first set in Jockey One, the closest measured match to the
sign's own lettering (owner's choice of the pairings in `design-options/fonts/`); later the same day
the owner changed the pairing to **Outfit** for titles and larger text with **Work Sans** for text.
Also later that day: the drawn sign's tower is wide and short with no number plate on it; the
category band is black with white only as accents (no ghost word, no light lines behind words), its
cards solid colour with one product render each, a third of it standing above the card; the store
slots show the owner's own photos; and the home hero is the store itself at golden hour (the
owner's storefront photo, relit with AI and labelled, its colour side graded more vivid at the
owner's request), so the drawn, lit sign now plays in the splash and on the 404.

The tokens live in `src/styles/tokens.css`. Change values there, never at a call site. The live
Wix site's own measured baseline is kept for reference in `audit/baseline-styles/tokens.live.css`.

## Evidence

`audit/design-baseline.json` evidence: **computed (browser capture)** — the live home page was
captured in a browser at 1440, 1024, 768 and 390 px on 2026-11-09 00:05 UTC. The live site's own
look (Arial and Lulo Clean on black and white, a flower-photo footer, black-and-gold promo slides)
is the "before"; the redesign keeps the client's words and assets, not that styling.

Brand values and where they come from:

| value | source |
|---|---|
| Store navy `#192036` (counter fronts), `#2C3548` (a lit face) | MEASURED 2026-11-09 from the owner-supplied interior photos (kept private: they show customers) |
| LED underglow `#4B79D7`–`#6E90DD`, core `#C3CAEC` | MEASURED from the same photos |
| Site blue `#2A4290` | DERIVED: the store navy lifted so white text on buttons keeps 9.2:1 |
| Rainbow stripes `#AF0303 #FA8900 #F6FC1E #ED397A #00A3DC #338900` | MEASURED from the client's own social image (stripe centres); used only as the thin divider |
| Sign black `#0B0B0A`, bulb white `#FFFFFE` | MEASURED from the logo file |
| The blacks and whites | DERIVED for the black-first palette |
| The logo | the client's PNG, resized only (never redrawn or recoloured); 53 bulbs detected for the lit overlay |
| Headline face | MEASURED: 14 logo letters against 72 open-licence fonts at equal cap height (`design-options/fonts/assets/logo-match-ranking.json`): Jockey One closest (overlap 0.834, same widths). Kept on record: the owner later chose Outfit + Work Sans instead |

## Colour

| token | role |
|---|---|
| `--night` `#08090B`, `--night-2` `#111318` | BLACK: the page ground and raised surfaces |
| `--sign-black` `#0B0B0A` | the sign body: ticker board, Owner's Box, footer |
| `--navy` `#192036`, `--navy-2` `#2C3548` | BLUE: the store's counters and walls: deal bands, cards, the tape |
| `--royal` `#2A4290`, `--royal-deep`, `--royal-top` | BLUE: the tower, Order now and primary buttons, links on white |
| `--led` `#5A86E6`, `--led-soft` `#C3CDF2`, `--royal-bright` | the LED underglow: accent words, kickers, glow lines |
| `--cream` `#F3F5F8`, `--cream-2` `#C9CED8` | WHITES: every word on black (the token names survive from the cream era) |
| `--bulb`, `--bulb-glow` | lit marquee bulbs (a warm-white halo, never gold) |
| `--white`, `--showroom` `#F4F6FB`, `--showroom-2` | WHITES: the showroom's day bands and panels |
| `--ink` `#0D1018`, `--ink-2`, `--ink-3` | text on white |
| `--rb-*` (six) | only the thin spectrum divider (`--rainbow-line`): header rule, under the home tapes, between the visit and mailing-list bands, the footer edge, the social card |
| `--cross` | the storefront's green cross |
| `--open`, `--closed` | the live status sign |

No gold anywhere: the black-and-gold promo art was one promotion, not the brand.

Every text/background pair used on the site clears WCAG AA. Measured by `tools/contrast.mjs`
(`audit/contrast.json`):

| foreground | background | ratio | use |
|---|---|---|---|
| white `#F3F5F8` (`--cream`) | black `#08090B` | 18.24:1 | headings and body on black |
| quiet white `#C9CED8` | black | 12.62:1 | ledes on black |
| mist `#AAB3C8` | black | 9.48:1 | muted text on black |
| led-soft `#C3CDF2` | black | 12.65:1 | kickers |
| led `#5A86E6` | black | 5.68:1 | accent words (large text) and UI |
| open `#43E58F` | black | 12.18:1 | "Open now" |
| white | store navy `#192036` | 14.78:1 | text on navy bands |
| white | sign-black `#0B0B0A` | 18.03:1 | black bands, footer |
| ink `#0D1018` | showroom `#F4F6FB` | 17.59:1 | body on white bands |
| ink-2 `#3B4152` | showroom | 9.41:1 | secondary on white bands |
| ink-3 `#5C6372` | showroom | 5.58:1 | captions (13px minimum) |
| royal `#2A4290` | white | 9.21:1 | links and accents on white |
| white | royal | 9.21:1 | Order now and primary buttons |
| ink | white `#F3F5F8` | 17.41:1 | deli price tags, Owner's Box labels |
| white | street-green `#0B6B3A` | 6.61:1 | the 8 Mile street sign |

Text over scene stills is measured on the rendered pixels by `tools/scene-contrast.mjs`
(`audit/scene-contrast.json`): every line clears AA against the brightest 5% of what is behind it.

## Type

Three families, all SIL Open Font License, self-hosted as latin woff2 (`src/assets/fonts/`,
`tools/fetch-fonts.mjs`, sources in `FONTS.json`). Owner's choice 2026-11-09: Outfit + Work Sans,
"where titles or larger sized texts uses outfit". It replaced pairing A of `design-options/fonts/`
(Jockey One + Barlow), chosen earlier the same day.

| family | role |
|---|---|
| Outfit (variable, 100–900) | titles and larger text: headings, the hero, prices, tag and card names, the tapes, the kinetic band. Display weights 700–800 (one step lighter than in the Jockey One era); the card names scale with the card's width. Large headings at a .98 line height: at .92 Outfit's descenders met the next line's ascenders |
| Outfit Outline (the designer's static Outfit 800 and Black 900) | outlined words only: the navy tape (800) and the kinetic band (Black, at the owner's request). An outline traces every contour, and the variable file keeps each letter's parts as overlapping contours (F is three), which showed as seams inside outlined letters; these static builds have every letter merged into one outline (Google's single-weight files keep the overlaps) |
| Work Sans (variable, 100–900, + italic) | body and UI text |
| Tilt Neon | neon numerals only: step numbers and the news date board; the outlined footer word |

One accent word per heading is set in the LED blue (on white bands, the site blue; in the home hero,
over the photo, a pale neon-blue core with an LED glow, which keeps 3:1 there). The inline
accent face of the first draft was retired at the owner's request.

Scale (`--fs-*`): 13px floor for any visible text; body 17px (16px on phones) at 1.62; lede 19px;
h3 `clamp(1.625rem…2.25rem)`; h2 `clamp(2.375rem…4rem)`; h1 `clamp(2.75rem…5rem)`; prices
`clamp(3rem…5rem)`. Headlines in sentence case: the all-caps copy of the live site is rewritten in
sentence case with the words unchanged.

## Space, shape, layout

- Spacing scale `--s-1…--s-10` (4 to 128px); band padding `clamp(56px, 7vw, 104px)`.
- Radii: 8 / 14 / 22 / 32px and pill. Container 1240px, gutter `clamp(16px, 4vw, 40px)`.
- Breakpoints: 1080 (drawer replaces the nav, 44px touch targets), 900/860 (grids stack),
  760 (phone dock with Order now, call, directions), 640 (long rows become swipe rows).
- Rhythm: black bands dominate (the category band included), the store's navy carries the deals
  and the cards, white bands give air between them; the six spectrum colours appear only as 3px
  divider lines.

Signature components (`src/styles/components.css`), each from the building:

| component | from the store |
|---|---|
| `.sign` | the roadside sign: logo + 53 lit bulbs on a wide, short blue corrugated tower (62% of the sign's width, the real sign's proportion) that fades into the night; no number plate |
| `.brand__tower` | the logo mounted on a slice of the tower, in the header and footer |
| `.ticker` + `.spectrum` | the marquee letter board, then the thin spectrum divider |
| `.jar` + `.counter-top` | glass display cases on a navy counter with an LED strip |
| `.tag`, `.board`, `.ladder` | deli price tags, the deli counter board, the ounce tiers |
| `.box` + `.band--ownbox` + `.ownbox` | the Owner's Box: a glass case framed by chasing marquee bulbs, over the owner's street photo in black and white fading into black, under a spectrum line; the owner's road case opens in green smoke and the strains fly out on holographic cards (rainbow edge, glitter rim, sheen; a bud standing out of each card's top) into a floating row; wide screens: the case at the left of the words and cards; narrow: words, cards (a carousel), the case under them, the row opening downward as the case opens, the words and foot centred |
| `.status` | a small neon OPEN sign, computed in Detroit time |
| `.photo` | the owner's own store photos in rounded frames (`.photo--inset` lays one over the corner of another, like a print); upscaled and colour graded, two retouched with AI fill (see `CHANGE-LOG.md`, Imagery) |
| `.street-sign` | the E 8 Mile Rd street sign with the 5700 address plate |

## The cinematic layer (`src/styles/cinema.css`)

Three planes, back to front: a **scene still** (AI illustration, see `CHANGE-LOG.md`, Imagery),
a **scrim** (a token gradient sized so text clears WCAG AA on the rendered pixels), then the
**content**, with film grain blended over the scene and never over the words.

| part | what it is |
|---|---|
| `.hero` | the store at golden hour (the owner's storefront photo, relit with AI), always the whole frame as a wide shot: the hero's height, anchored right, the street running on to the left (an AI extension) in black and white and darker the further left, behind the words (two copies of the photo: a black-and-white one underneath, the colour one masked from where the words end to where the sign starts, in container units) → shade behind the words → a warm, breathing light and one LED light pool; a glass fact plate; as the page scrolls the words drift down and the photo pushes in; on phones the whole frame runs across the top of the hero and fades out exactly where the words begin (`--hero-win`) |
| `.tapes` | the marquee letter board crossed by a navy tape, laid over the seam under the hero, then a thin spectrum line; up to 860 wide the two are stacked, tilted apart with a gap that stays open, a size smaller, so both read (owner, 2026-11-09) |
| `.band--flavors` + `.bento` + `[data-rail]` | a black band with a soft navy glow from the top, white only as accents (the words, the progress bar); four equal solid colour cards (`--card-flower`, `--card-concentrates`, `--card-edibles`, `--card-more`: the logo's green, blue, pink and orange, each its product render's own backdrop colour) with one uniformly rendered product each, cut out of its backdrop, the same height on every card (container units, not what the text leaves), each card starting a third of the way down its product so the top third stands above it over the black band; the name large at the bottom left in ink (6.7:1 or more), sized from the card's width, and a dark square order button at the bottom right; the light sweep crosses the card only, under the product; the cards are sized to fit four across the content column, with breathing room above the heading and below the pickup row; where four fit (1280 wide and up) the band holds still at its own height, otherwise (1024 to about 1200 wide) it pins and the cards slide past ("01 / 04"); on hover the whole card bounces, product and all, then rests a little raised; on phones the row swipes, with room for the bounce and the glow |
| `.band--neon` + `.hang` | deli tickets on strings from a rail over blue neon; each ticket sways on its own string (`/daily-deals/`; the home deals band became the bento below) |
| `.band--deals` + `.deals` | the home deals on black (owner, 2026-11-09): each category tab a bento, a two-by-two feature in the store's blue and white cards beside it (two small, one wide), each with a product image standing on a soft floor shadow (the owner's own pre-roll, budder and crumble photos, AI illustrations of the other product types; clear glass always see-through, so it shows the card it stands on); prices large in Outfit; the Ounces tab lists every live-menu tier; the whole card bounces on hover, then rests a little raised |
| `.band--spot` + `.box--glass` | the Owner's Box over a spotlight still, framed by chasing bulbs; glass cards with an orbiting edge light |
| `.kinetic` | two rows of giant words in Outfit Black sliding opposite ways with the scroll; HD bud illustrations, one floating over the words and four resting at the top corners, two half out of frame |
| `.statement` | the "who are we" sentence, set large; its words light up in reading order |
| `.band--rain`, `.band--bokeh` | blue reflections behind a glass store card; marquee bokeh behind glass panels |
| `.page-hero--scene` | every inner page hero over its own still (Learn uses the client's own flower photo; Shop floats the client's own bud) |
| `.footer__mark` | the finale: a giant cropped "Flavors" under a bulb row; it lights up, bulb by bulb, over the last stretch of the page |

Rules: tokens only (tints through `color-mix`); scene images are decorative (`alt=""`); the category
cards' product renders carry alt text describing the pixels; phones drop the pointer light, tilt,
spotlights, orbits and the rail; `tools/scene-contrast.mjs` measures every line of text
over a still and `tools/motion-check.mjs` tests the motion layer with motion on.

## Motion

Motion lives in `src/styles/motion.css`, `src/styles/components.css`, `src/styles/cinema.css` and
`src/scripts/site.js`, eased with `cubic-bezier(.16, 1, .3, 1)`. A `prefers-reduced-motion` block
is present and must stay present; under it nothing animates (measured: 0 running animations), the
words of every heading and statement are in place, and the stats show their final numbers.

One animation loop in `site.js` (the "alive engine") reads the scroll position and the scroll speed
and drives everything that answers the scroll; layout is measured on resize and load, never while
scrolling. A **Pause motion** button in the top bar stops every loop (WCAG 2.2.2) and is remembered.

| what | trigger |
|---|---|
| The splash, "Sign ignition" (2.3 s): on black the 53 bulbs light round the cloud, the sign and its wide, short blue tower come up and hold, then it lifts away on an LED edge | the first page of each visit (any page but the Terms); any click, tap, key or scroll skips it; then the age gate on a first visit |
| Hero ignition: the store fades up from the dark | only when the splash did not play (paused motion earlier in the visit, or storage blocked) |
| Marquee bulb chase around the real logo bulbs on the drawn sign (3.4s loop; the 404 page) | page load; pauses off screen |
| Letter board, navy tape and kinetic rows: drift on their own, run faster while the page scrolls, turn round when it scrolls up | the scroll loop; the board holds still under a pointer; off screen they stop |
| The hero lets go: words drift down and dim, the store photo pushes in | scroll position over the hero |
| The category rail: the band pins and the four cards slide past, with a 01 / 04 counter and a progress bar | scroll position; 1024px+ wide and 700px+ tall only |
| Light curtain down each band as it arrives; a beam across cards, photos and frames | scrolling into view, once |
| Drifting LED light pools; rising sparks; a light orbiting the glass cards' edges | continuous; off screen they pause; orbits and spotlights need a fine pointer |
| Reading progress in the spectrum line under the header; the back-to-top ring | scroll position |
| Finale: the footer "Flavors" and its bulbs light up | the last stretch of the page |
| The store photo drifts slowly (34 s) and a warm golden-hour light breathes over it (9 s) | page load; pauses off screen and under Pause motion |
| Deal tickets sway on their strings | page load; pause on hover and off screen |
| Bulbs chase around the Owner's Box frame (clockwise) | page load; pause off screen |
| Footer wordmark light sweep (9s) | page load; pauses off screen |
| A soft LED spotlight follows the pointer over the dark bands | fine pointer only |
| Film grain drift on the hero | large fine-pointer screens only |
| Reveal: rise 24px and brighten, 90ms stagger | scrolling into view; if the observer never reports in 2.5s, everything shows |
| Split headings: each word rises into place, 55ms stagger | scrolling into view (the heading keeps its full text as its accessible name) |
| Scroll-lit statement: words switch on in reading order | scroll position |
| Stat count-up (10,000 sq ft, 7 days) | scrolling into view, once |
| Depth: scene stills, light pools, the ghost words and the floating bud drift against the scroll | scroll; 700px+ wide, gentler on touch |
| Card tilt with a moving glint; magnetic hero buttons; the hero's LED light follows the pointer | fine pointer only |
| Card lift and LED glow on hover; the Order button glint | pointer hover / focus |
| Drawer slide, header compacts | menu button / scrolling |
