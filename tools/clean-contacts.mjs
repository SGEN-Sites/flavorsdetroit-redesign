// clean-contacts.mjs — drop platform error-reporting addresses from the captured contact facts.
//
// sr-extract reads every email-shaped string in the raw HTML, including the Sentry DSNs Wix
// embeds in its scripts ("<hex>@sentry.wixpress.com", "<hex>@sentry.io"). Those are Wix's
// error-reporting endpoints, not the client's contact details, and a rebuild must not carry them.
// They are moved, not deleted: the list and the reason go to audit/contact-cleaned.json and one
// accepted entry in audit/failures.json (B4). Real addresses (flavorsdetroit@gmail.com) stay.
//
//   node tools/clean-contacts.mjs          (re-run after every sr-extract)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const invFile = path.join(ROOT, 'audit', 'content-inventory.json');
const inv = JSON.parse(fs.readFileSync(invFile, 'utf8'));
const PLATFORM = /@(?:sentry(?:-next)?\.wixpress\.com|sentry\.io|[a-z0-9-]+\.wixpress\.com)$/i;
const removed = new Map();
for (const p of inv.pages || []) {
  if (!p.contact || !Array.isArray(p.contact.emails)) continue;
  const keep = [];
  for (const e of p.contact.emails) (PLATFORM.test(e) ? removed.set(e, (removed.get(e) || 0) + 1) : keep.push(e));
  p.contact.emails = keep;
}
fs.writeFileSync(invFile, JSON.stringify(inv, null, 2));
fs.writeFileSync(path.join(ROOT, 'audit', 'contact-cleaned.json'), JSON.stringify({
  generated: new Date().toISOString(),
  reason: 'Wix script error-reporting (Sentry) DSNs found in the raw HTML; not client contact details.',
  removed: Object.fromEntries(removed),
}, null, 2));
const failFile = path.join(ROOT, 'audit', 'failures.json');
const failures = JSON.parse(fs.readFileSync(failFile, 'utf8'));
if (removed.size && !failures.items.some((x) => x.stage === 'extract:contact')) {
  failures.items.push({
    stage: 'extract:contact', target: 'audit/content-inventory.json',
    reason: removed.size + ' Sentry error-reporting addresses from Wix scripts were captured as contact emails; moved to audit/contact-cleaned.json',
    accepted: true, acceptedWhy: 'platform runtime, not client contact details', at: new Date().toISOString(),
  });
  fs.writeFileSync(failFile, JSON.stringify(failures, null, 2));
}
console.log('removed', removed.size, 'platform addresses; kept', [...new Set((inv.pages || []).flatMap((p) => (p.contact && p.contact.emails) || []))].join(', ') || 'none');
