# Brand system

**"Lit up on 8 Mile": retro roadside marquee meets modern showroom.** Every choice traces to the
real store as the owner described it: the black cloud-shaped sign outlined in marquee bulbs with
cream FLAVORS DETROIT lettering and a glowing neon 5700 on a royal-blue corrugated tower; the dark
storefront with rainbow-striped awnings and a green cross; the bright white, glossy interior with
navy counters glowing with blue LED underglow and glass jars of flower like a premium deli counter.

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
| Rainbow stripes `#AF0303 #FA8900 #F6FC1E #ED397A #00A3DC #338900` | MEASURED from the client's own social image (stripe centres) |
| Sign black `#0B0B0A`, bulb white `#FFFFFE` | MEASURED from the logo file |
| Royal blue, navy, LED blue, cream | CHOSEN from the owner's description; to confirm against a store photo |
| The logo | the client's PNG, resized only (never redrawn or recoloured); 53 bulbs detected for the lit overlay |

## Colour

| token | role |
|---|---|
| `--night` `#060A17`, `--night-2` | the sign at night: page ground, raised night surfaces |
| `--sign-black` `#0B0B0A` | the sign body: ticker board, Owner's Box, footer |
| `--navy` `#0C1A3D`, `--navy-2` | the counters: deal bands, jar cases, ladder steps |
| `--royal` `#1F4FE0`, `--royal-deep`, `--royal-bright` | the tower: logo tab, Order now, links on light |
| `--led` `#3FA9FF`, `--led-soft` | LED underglow: kickers, accent words, glow lines |
| `--cream` `#F4EAD5`, `--cream-2` | sign lettering: text on night, price tags, strain labels |
| `--bulb`, `--bulb-glow` | lit marquee bulbs (warm halo) |
| `--white`, `--showroom` `#F4F6FB`, `--showroom-2` | the showroom: day bands and panels |
| `--ink` `#0B1330`, `--ink-2`, `--ink-3` | text on day |
| `--rb-*` (six) | the awning flag: header rule, awning valance, footer edge, storefront art |
| `--cross` | the storefront's green cross |
| `--open`, `--closed` | the live status sign |

No gold anywhere: the black-and-gold promo art was one promotion, not the brand.

Every text/background pair used on the site clears WCAG AA. Measured by `tools/contrast.mjs`
(`audit/contrast.json`):

| foreground | background | ratio | use |
|---|---|---|---|
| cream `#F4EAD5` | night `#060A17` | 16.53:1 | headings and body on night |
| cream-2 `#D9CCB0` | night | 12.43:1 | ledes on night |
| mist `#AEB8D6` | night | 9.99:1 | muted text on night |
| led-soft `#9FD3FF` | night | 12.45:1 | kickers, accent words |
| open `#43E58F` | night | 12.08:1 | "Open now" |
| cream | navy `#0C1A3D` | 14.28:1 | text on navy |
| cream | sign-black `#0B0B0A` | 16.48:1 | black bands, footer |
| ink `#0B1330` | showroom `#F4F6FB` | 16.89:1 | body on day |
| ink-2 `#3A4566` | showroom | 8.74:1 | secondary on day |
| ink-3 `#5B6788` | showroom | 5.19:1 | captions (13px minimum) |
| royal `#1F4FE0` | white | 6.46:1 | links on white |
| white | royal | 6.46:1 | Order now and primary buttons |
| ink | cream | 15.28:1 | deli price tags, Owner's Box labels |
| white | street-green `#0B6B3A` | 6.61:1 | the 8 Mile street sign |

## Type

Four families, all SIL Open Font License, self-hosted as latin woff2 (`src/assets/fonts/`):

| family | role |
|---|---|
| Big Shoulders Display 600–900 | headlines, prices, tag names: tall, condensed, Midwest-industrial signage |
| Big Shoulders Inline Display | ONE accent word per heading, lit like sign lettering ("modern twist", "8 Mile") |
| Tilt Neon | neon numerals only: the 5700 plate, the open sign, step numbers, the news date board |
| Instrument Sans 400–700 | body and UI |

Scale (`--fs-*`): 13px floor for any visible text; body 17px (16px on phones) at 1.62; lede 19px;
h3 `clamp(1.625rem…2.25rem)`; h2 `clamp(2.375rem…4rem)`; h1 `clamp(2.75rem…5rem)`; prices
`clamp(3rem…5rem)`. Headlines in sentence case: the all-caps copy of the live site is rewritten in
sentence case with the words unchanged.

## Space, shape, layout

- Spacing scale `--s-1…--s-10` (4 to 128px); band padding `clamp(56px, 7vw, 104px)`.
- Radii: 8 / 14 / 22 / 32px and pill. Container 1240px, gutter `clamp(16px, 4vw, 40px)`.
- Breakpoints: 1080 (drawer replaces the nav, 44px touch targets), 900/860 (grids stack),
  760 (phone dock with Order now, call, directions), 640 (long rows become swipe rows).
- Rhythm: night (the sign) and day (the showroom) bands alternate; the rainbow appears as a thin
  header rule, one awning valance under the home marquee, the footer edge and the storefront art.

Signature components (`src/styles/components.css`), each from the building:

| component | from the store |
|---|---|
| `.sign` | the roadside sign: logo + 53 lit bulbs + royal corrugated tower + neon 5700 plate |
| `.brand__tower` | the logo mounted on a slice of the tower, in the header and footer |
| `.ticker` + `.awning` | the marquee letter board, then the rainbow awning valance |
| `.jar` + `.counter-top` | glass display cases on a navy counter with an LED strip |
| `.tag`, `.board`, `.ladder` | deli price tags, the deli counter board, the ounce tiers |
| `.box` | the Owner's Box: a black case framed by bulb rails, cream jar labels |
| `.status` | a small neon OPEN sign, computed in Detroit time |
| `.ph` | labelled placeholders drawn from the store's own elements until photos arrive |
| `.street-sign` | the E 8 Mile Rd street sign with the 5700 address plate |

## Motion

All motion lives in `src/styles/motion.css` and `src/styles/components.css`, eased with
`cubic-bezier(.16, 1, .3, 1)`. A `prefers-reduced-motion` block is present and must stay present;
under it nothing animates (measured: 0 running animations).

| what | trigger |
|---|---|
| Marquee bulb chase around the real logo bulbs (3.4s loop) | page load; pauses off screen |
| Neon 5700 flickers on once (1.8s) | page load |
| Ticker scroll (46s loop) | page load; pauses on hover, focus and off screen; wraps static under reduced motion |
| Bulb rails twinkle on the Owner's Box | page load |
| Reveal: rise 24px and brighten, 90ms stagger | scrolling into view (IntersectionObserver); 2.5s fail-safe shows everything |
| Card lift and LED glow on hover | pointer hover / focus |
| Drawer slide, header compacts | menu button / scrolling |
