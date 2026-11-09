// build.mjs — render every page into dist/. Node builtins only.
//
//   node src/build.mjs              production build (canonical + indexable, robots allows all)
//   node src/build.mjs --preview    preview build: noindex on every page, robots disallows all
//   node src/build.mjs --out <dir>  write somewhere other than dist/
//
// Pages are folders with index.html so URLs stay clean (/daily-deals/), and every link is
// relative, so the same output serves from a domain root or a GitHub Pages subpath.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const preview = args.includes('--preview');
const outArg = args.indexOf('--out');
const OUT = path.resolve(ROOT, outArg >= 0 ? args[outArg + 1] : 'dist');
const LIVE = 'https://www.flavorsdetroit.com';

// ---- clean the output folder (only ever dist/ or an explicit --out inside the project) -------
if (!OUT.startsWith(ROOT + path.sep)) throw new Error('refusing to write outside the project: ' + OUT);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const copyDir = (src, dst) => {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f), d = path.join(dst, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else if (!/\.(json|md)$/i.test(f)) fs.copyFileSync(s, d);
  }
};
copyDir(path.join(ROOT, 'src', 'assets', 'fonts'), path.join(OUT, 'assets', 'fonts'));
copyDir(path.join(ROOT, 'src', 'assets', 'img'), path.join(OUT, 'assets', 'img'));
fs.mkdirSync(path.join(OUT, 'assets', 'js'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'src', 'scripts', 'site.js'), path.join(OUT, 'assets', 'js', 'site.js'));

// ---- one stylesheet, in cascade order, comments stripped -------------------------------------
const SHEETS = ['tokens', 'base', 'chrome', 'components', 'pages', 'motion'];
const css = SHEETS.map((n) => fs.readFileSync(path.join(ROOT, 'src', 'styles', n + '.css'), 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\n\s*\n+/g, '\n')
  .replace(/^\s+/gm, '');
fs.mkdirSync(path.join(OUT, 'assets', 'css'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'assets', 'css', 'site.css'), css);

// ---- pages -----------------------------------------------------------------------------------
const written = [];
function write(sitePath, html) {
  if (preview) html = html.replace('<meta name="viewport"', '<meta name="robots" content="noindex, nofollow">\n<meta name="viewport"');
  const file = sitePath.endsWith('/') ? path.join(OUT, sitePath, 'index.html') : path.join(OUT, sitePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  written.push(sitePath);
}

const MODULES = ['home', 'shop', 'deals', 'owners-box', 'visit', 'learn', 'news', 'contact', 'terms', 'notfound'];
for (const m of MODULES) {
  const file = path.join(ROOT, 'src', 'pages', m + '.mjs');
  if (!fs.existsSync(file)) { console.log('  skip (not written yet):', m); continue; }
  const mod = await import(pathToFileURL(file).href);
  const out = mod.render();
  // a module returns one page as a string, or many as [{ path, html }]
  if (typeof out === 'string') write(mod.PATH || (m === 'home' ? '/' : '/' + m + '/'), out);
  else for (const p of out) write(p.path, p.html);
}

// ---- robots + sitemap ------------------------------------------------------------------------
fs.writeFileSync(path.join(OUT, 'robots.txt'), preview
  ? 'User-agent: *\nDisallow: /\n'
  : `User-agent: *\nAllow: /\n\nSitemap: ${LIVE}/sitemap.xml\n`);
const today = new Date().toISOString().slice(0, 10);
const urls = written.filter((p) => p.endsWith('/'));
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${LIVE}${u === '/' ? '/' : u.replace(/\/$/, '')}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
// GitHub Pages: serve files as-is (no Jekyll processing of underscored paths)
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
// Redirects for the old Wix URLs with no page of their own (Netlify / Cloudflare Pages format;
// docs/DEPLOY.md lists the same rules for other hosts). Every other live URL is kept as is.
fs.writeFileSync(path.join(OUT, '_redirects'), [
  '/sinage            /daily-deals/  301',
  '/blog/hashtags/*   /blog/         301',
  '/profile/*         /blog/         301',
  '/flower-menu       /shop/         301',
  '',
].join('\n'));

console.log(`built ${written.length} page(s) into ${path.relative(ROOT, OUT)}/${preview ? ' (preview: noindex)' : ''}`);
console.log('  css', (css.length / 1024).toFixed(1) + ' KB');
