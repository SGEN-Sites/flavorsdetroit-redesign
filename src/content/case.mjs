// case.mjs — display-only sentence-case repair for words the live posts set in capitals.
//
// The owner's brief: "rewrite all-caps copy in sentence case". tools/extract-posts.mjs already
// sentence-cased whole all-caps blocks (and keeps every original in textOriginal). Many posts also
// shout single words inside normal sentences ("OCTOBER Specials", "Cherry GLUE Beeswax", "@ FLAVORS
// DETROIT", "FAll To FrosT"). This pass fixes those word by word, for display:
//   - acronyms and units stay as they are (THC, OG, BOGO, 3.5G, 4/20, 10AM, PB&J …)
//   - known proper nouns get their proper form (Flavors, Detroit, October, Halloween, Labor Day …)
//   - common words become lower case (capitalised at the start of a sentence)
//   - any other all-caps word (strain and brand names) becomes Capitalised ("ZKITTLEZ" -> "Zkittlez")
//   - stylised mixes like "FAll" / "FrosT" become "Fall" / "Frost"
// The words never change, only their case. Applied to titles, body text, list items, table cells
// and link text alike, so link matching still lines up.

const ACRO = new Set(('THC THCA CBD CBG CBN OG BOGO LR HCFSE FSE RSO PB&J TGIF ID MI AM PM USA US UK DJ VIP MAC LA AZ NYC NYE BHO ' +
  'GSC XL XXL DIY BBQ ATM EBT FAQ GMO NFL NBA WWE MMA HD TV AC OK RIP MLK BIC LED POS SFV GG HTFSE CO2 THC-A THCa ' +
  'II III IV RNB R&B A&W MVP OMG').split(/\s+/));
const PROPER = {
  flavors: 'Flavors', detroit: 'Detroit', michigan: 'Michigan', mile: 'Mile', motorcity: 'Motorcity', detroiters: 'Detroiters',
  january: 'January', february: 'February', march: 'March', april: 'April', may: 'May', june: 'June', july: 'July',
  august: 'August', september: 'September', october: 'October', november: 'November', december: 'December',
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
  halloween: 'Halloween', thanksgiving: 'Thanksgiving', christmas: 'Christmas', easter: 'Easter', shatterday: 'Shatterday',
};
const COMMON = new Set(('a an the and or but nor of for with without to from in on at by as is are be was were been am it its this that these those ' +
  'we us our you your yours they them their he his she her i me my all any every each some more most less least no not only just also ' +
  'free new now off sale sales deal deals special specials today tonight weekend week weekly month monthly year daily day days night nights ' +
  'order orders online save time open opening close closing hour hours happy early late last first next same big bigger best better great good ' +
  'top shelf flower flowers strain strains preroll prerolls pre-roll pre-rolls joint joints edible edibles concentrate concentrates vape vapes ' +
  'cart carts cartridge cartridges disposable disposables wax shatter budder batter crumble sugar sauce diamonds diamond live resin rosin hash ' +
  'kief gummies gummy chocolate chocolates drink drinks tincture tinctures topical topicals drop drops fresh fire hot new arrivals returning ' +
  'classic classics back school summer fall winter spring blowout event events giveaway giveaways raffle food music stock stack pack bag level ' +
  'vibes energy prices price value quality premium exclusive rare limited quantities quantity supplies while supply gram grams eighth eighths ' +
  'ounce ounces quarter quarters half halves oz plus get got grab buy one two three four five ten mix match any per each up down out in over ' +
  'under here there what when where why how who which shop store menu specials! deals! alert alerts sneak peek update updated hours! ' +
  'bundle bundles price drop savings save! huge massive major epic extended stock-up tasty treats treat candy grown ups holiday holidays ' +
  'gift gifts ideas minute minutes celebrate celebration party weekend! friday! fire! drop! special! sale! blowout! sneak peek! more!').split(/\s+/));
const HOLIDAYS = [
  [/\blabor day\b/gi, 'Labor Day'], [/\bindependence day\b/gi, 'Independence Day'], [/\bmemorial day\b/gi, 'Memorial Day'],
  [/\bmother'?s day\b/gi, "Mother's Day"], [/\bfather'?s day\b/gi, "Father's Day"], [/\bvalentine'?s day\b/gi, "Valentine's Day"],
  [/\bnew year'?s eve\b/gi, "New Year's Eve"], [/\bnew year'?s\b/gi, "New Year's"], [/\bblack friday\b/gi, 'Black Friday'],
  [/\bcyber monday\b/gi, 'Cyber Monday'], [/\bsuper bowl\b/gi, 'Super Bowl'], [/\b4th of july\b/gi, '4th of July'],
  [/\bfourth of july\b/gi, 'Fourth of July'], [/\bmlk day\b/gi, 'MLK Day'], [/\bchristmas eve\b/gi, 'Christmas Eve'],
  [/\bsmall business saturday\b/gi, 'Small Business Saturday'], [/\bblack saturday\b/gi, 'Black Saturday'],
];

const SMALL = new Set('a an the and or nor but of for to in on at by with as per vs'.split(' '));
function word(w, start, titleMode) {
  const letters = w.replace(/[^A-Za-z]/g, '');
  if (letters.length < 2) return w;
  if (/\d/.test(w)) return w;                                  // 3.5G, 28G, 4/20, 10AM, 2/$25 …
  const key = w.replace(/[^A-Za-z&-]/g, '');
  if (ACRO.has(key.toUpperCase()) && key === key.toUpperCase()) return w;
  let x = w;
  if (/^[A-Z]{2}[a-z]+[^A-Za-z]*$/.test(x) || /^[A-Z][a-z]+[A-Z][^A-Za-z]*$/.test(x)) x = x[0] + x.slice(1).toLowerCase();
  const upper = letters.replace(/[^A-Z]/g, '').length;
  if (upper !== letters.length) return x;                     // mixed case stays (TopShelf, CandyTrap, McDonald)
  const lower = x.toLowerCase();
  const bare = lower.replace(/[^a-z'&-]/g, '');
  if (PROPER[bare]) return lower.replace(bare, PROPER[bare]);
  const cap = lower.replace(/[a-z]/, (c) => c.toUpperCase());
  // In a title-case line ("Halloween WAX Special") a shouted word joins the title case; in a
  // sentence it becomes an ordinary word ("ALL orders receive a FREE PREROLL" -> "a free preroll").
  if (titleMode) return start || !SMALL.has(bare) ? cap : lower;
  if (COMMON.has(bare) || COMMON.has(lower)) return start ? cap : lower;
  return cap;                                                   // a name: Capitalised
}

/** A line reads as title case when most of its longer, not-shouted words start with a capital. */
function isTitleCase(text) {
  const ws = String(text).split(/\s+/).map((t) => t.replace(/[^A-Za-z]/g, '')).filter((t) => t.length >= 4 && t !== t.toUpperCase());
  if (ws.length < 2) return false;
  return ws.filter((t) => /^[A-Z]/.test(t)).length / ws.length >= 0.6;
}

/** Sentence-case repair for one string (display only). */
export function displayCase(text) {
  if (!text || !/[A-Z]{2}/.test(text)) return text;
  let start = true;
  const titleMode = isTitleCase(text);
  const out = String(text).split(/(\s+)/).map((tok) => {
    if (/^\s+$/.test(tok)) { if (/\n/.test(tok)) start = true; return tok; }
    const r = word(tok, start, titleMode);
    start = /[.!?:]["')\]]*$/.test(tok);
    return r;
  }).join('');
  return HOLIDAYS.reduce((s, [re, to]) => s.replace(re, to), out);
}

/** Holiday names fixed even where the text has no capitals left to repair ("Labor day-2025"). */
export const fixHolidays = (s) => HOLIDAYS.reduce((t, [re, to]) => t.replace(re, to), String(s || ''));

/** A display copy of posts.json with every visible string case-repaired. Originals stay in posts.json. */
export function displayPosts(data) {
  const fix = (s) => fixHolidays(displayCase(s));
  const fixLinks = (ls) => (ls || []).map((l) => ({ ...l, text: fix(l.text) }));
  return {
    ...data,
    posts: (data.posts || []).map((p) => ({
      ...p,
      title: fix(p.title),
      seoTitle: p.seoTitle ? fix(p.seoTitle) : p.seoTitle,
      excerpt: fix(p.excerpt),
      blocks: (p.blocks || []).map((b) => ({
        ...b,
        text: b.text ? fix(b.text) : b.text,
        links: fixLinks(b.links),
        items: b.items ? b.items.map((it) => ({ ...it, text: fix(it.text), links: fixLinks(it.links) })) : b.items,
        rows: b.rows ? b.rows.map((r) => r.map((c) => ({ ...c, text: fix(c.text), links: fixLinks(c.links) }))) : b.rows,
      })),
    })),
  };
}

/** A live-menu strain or product name for display: case repaired, menu code kept off. */
export const niceName = (s) => displayCase(String(s || '').replace(/\s*\([^)]*\)\s*$/, '').trim());
const CRUDE = /\b(shit|fuck|bitch|ass|damn|hell|piss)\b/i;
/** Drop crude names from display samples (counts stay true; the full list is on the live menu). */
export const presentable = (names) => names.filter((n) => !CRUDE.test(n));
