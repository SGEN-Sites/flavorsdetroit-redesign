# Deploy

## The preview (now)

The public preview is GitHub Pages, built with `--preview`: every page carries
`<meta name="robots" content="noindex, nofollow">` and `robots.txt` disallows all, so the preview
never competes with the live site in search.

```
SITE_BASE=/flavorsdetroit-redesign/ node src/build.mjs --preview
# publish dist/ to the gh-pages branch (the source lives on main)
```

All links are relative, so the same build works at a domain root or under a Pages subpath. The
404 page carries a `<base href>` set from `SITE_BASE`.

## Going live at flavorsdetroit.com

1. **Build for production:** `node src/build.mjs` (no `--preview`). Canonicals, `sitemap.xml`,
   `robots.txt` and JSON-LD already point at `https://www.flavorsdetroit.com`.
2. **Host:** any static host. Netlify or Cloudflare Pages read `dist/_redirects` as written;
   other hosts need the same rules (below).
3. **Redirects** for the old Wix URLs that have no page of their own (all other live URLs are kept
   exactly, including every `/post/<slug>`):

   | Old | New |
   |---|---|
   | `/sinage` | `/daily-deals/` |
   | `/blog/hashtags/*` | `/blog/` |
   | `/profile/*` | `/blog/` |
   | `/flower-menu` | `/shop/` |

4. **Connect the two forms** (the preview validates them and shows a notice, it never posts):
   - Mailing list ("Join our mailing list today!") on Home, Deals, Contact, News and every post:
     connect to the email or SMS platform the owner chooses (it replaces the Wix contact list).
   - Contact form (name, email, phone, message) on `/contact/`: connect to the store inbox or a
     form service. Set each form's `action` and remove `data-preview-form`.
5. **Store photos:** replace the labelled placeholders (`placeholder()` in `src/lib/parts.mjs`) with
   the owner's photos of the sign, the storefront and the showroom.
6. **Confirm with the owner** (see `PITCH-NOTES.md`): the Owner's Box name, the royal blue and neon
   colours against a photo, medical-patient wording, the Google Business Profile address (5700).
7. **DNS:** point flavorsdetroit.com at the new host; keep the Wix site until the new one answers.
8. **After launch:** submit `https://www.flavorsdetroit.com/sitemap.xml` in Google Search Console.

## What is not included on purpose

No analytics, pixels or chat widgets (the Wix ones were removed with the platform). The live menu
stays at `https://flavors-detroit.portal42.com/`; every Order and menu link opens it in a new tab.
The map on `/visit/` loads from Google only when a visitor asks for it.
