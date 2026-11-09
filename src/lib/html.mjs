// html.mjs — tiny helpers for the static build. No dependencies.

/** Escape text for HTML element content and attribute values. */
export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Join class names, skipping falsy ones. */
export const cx = (...c) => c.filter(Boolean).join(' ');

/** Build attributes from an object: {href:'x', hidden:true, 'data-x': 1}. */
export const attrs = (o) => Object.entries(o)
  .filter(([, v]) => v !== false && v !== null && v !== undefined)
  .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`)).join('');

/**
 * Relative URL from one site path to another, so the build works at a domain root AND under a
 * GitHub Pages subpath. Paths are site paths like "/", "/daily-deals/", "/assets/css/x.css".
 */
export function rel(from, to) {
  if (/^(https?:|mailto:|tel:|#|data:)/.test(to)) return to;
  const fromDir = from.endsWith('/') ? from : from.replace(/[^/]*$/, '');
  const a = fromDir.split('/').filter(Boolean);
  const [toPath, hash = ''] = to.split('#');
  const b = toPath.split('/').filter(Boolean);
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const up = a.length - i;
  let out = '../'.repeat(up) + b.slice(i).join('/');
  if (toPath.endsWith('/') && b.length > i) out += '/';
  if (!out) out = './';
  return out + (hash ? '#' + hash : '');
}

/** Words that are external links get target/rel and an accessible "opens in a new tab" hint. */
export const ext = (href, label, cls = '', extra = '') =>
  `<a class="${esc(cls)}" href="${esc(href)}" target="_blank" rel="noopener"${extra}>${label}<span class="visually-hidden"> (opens in a new tab)</span></a>`;

// ---- icons: inline SVG, stroke-based, currentColor --------------------------------------------
const svg = (body, vb = '0 0 24 24', fill = 'none') =>
  `<svg viewBox="${vb}" fill="${fill}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const icon = {
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  chevL: svg('<path d="M15 5l-7 7 7 7"/>'),
  chevR: svg('<path d="M9 5l7 7-7 7"/>'),
  ext: svg('<path d="M7 17 17 7M9 7h8v8"/>'),
  phone: svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
  pin: svg('<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  insta: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  bag: svg('<path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/>'),
  store: svg('<path d="M4 10v10h16V10"/><path d="M3 10 5 4h14l2 6"/><path d="M3 10c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3"/><path d="M10 20v-5h4v5"/>'),
  joint: svg('<path d="M4 19.5 15.5 8l1.8 1.8L5.8 21.3z"/><path d="M15.5 8 17 6.5l1.8 1.8-1.5 1.5M18.5 4.5c.4-1 1.1-1.7 2-2M20.5 6.5c.9-.3 1.6-.9 2-1.8"/>'),   // pre-roll
  vape: svg('<rect x="9.5" y="7" width="5" height="15" rx="1.5"/><path d="M10.5 7V4.5a1.5 1.5 0 0 1 3 0V7M9.5 12h5"/>'),   // cart / pen
  chat: svg('<path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M8 9.5h8M8 12.5h5"/>'),   // ask a budtender
  id: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.5 1.7-2 3-2s2.4.5 3 2M14 10h4M14 13h3"/>'),
  mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>'),
  directions: svg('<path d="M12 2 22 12 12 22 2 12z"/><path d="M9 13v-2h5V8.5L17 11.5 14 14.5V12"/>'),
  camera: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  spark: svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
  calendar: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  leaf: svg('<path d="M12 21V11"/><path d="M12 11c-1-4-4-7-8-7 0 4 3 7 8 7zM12 11c1-4 4-7 8-7 0 4-3 7-8 7z"/><path d="M12 14c-2-1.6-4.5-2-7-1 1.6 2.4 4.3 3 7 1zm0 0c2-1.6 4.5-2 7-1-1.6 2.4-4.3 3-7 1z"/>'),
  swipe: svg('<path d="M4 12h16M15 7l5 5-5 5M9 7 4 12l5 5"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  ruler: svg('<path d="M3 17 17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>'),
  cross: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></svg>`,
  cart: svg('<rect x="9" y="2" width="6" height="5" rx="1"/><path d="M8 7h8l-1 13H9z"/><path d="M10 11h4M10 14h4"/>'),
  drop: svg('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
  bottle: svg('<path d="M10 2h4v4l2 3v12H8V9l2-3z"/><path d="M8 13h8"/>'),
  can: svg('<rect x="7" y="4" width="10" height="17" rx="2"/><path d="M7 8h10M10 2h4"/>'),
  jar: svg('<rect x="5" y="7" width="14" height="14" rx="3"/><path d="M7 3h10v4H7z"/>'),
};

/** The "much more" category tile art: a cartridge, a dropper bottle, a drink can and a jar. */
export const moreArt = `<svg viewBox="0 0 220 150" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
  <g transform="translate(14 22)"><rect x="12" y="0" width="16" height="14" rx="3"/><path d="M8 14h24l-3 82H11z"/><path d="M13 40h14M13 52h14"/></g>
  <g transform="translate(66 14)"><path d="M14 0h12v14l6 9v79H8V23l6-9z"/><path d="M8 52h24"/></g>
  <g transform="translate(118 26)"><rect x="0" y="8" width="34" height="88" rx="6"/><path d="M0 26h34M9 0h16"/></g>
  <g transform="translate(166 48)"><rect x="0" y="12" width="40" height="62" rx="9"/><rect x="4" y="0" width="32" height="12" rx="3"/></g>
</svg>`;
