"""contact-sheet.py - one labelled thumbnail grid of the downloaded source media, deduplicated by
Wix media id (largest file kept), so the image decisions can be made by looking, not guessing.

    python3 -I tools/contact-sheet.py [home|posts|all] [out.png]
"""
import json, re, sys, os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
inv = json.load(open(os.path.join(ROOT, 'audit', 'image-inventory.json')))
which = sys.argv[1] if len(sys.argv) > 1 else 'home'
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'audit', f'contact-{which}.png')

best = {}
for x in inv['images']:
    m = re.search(r'media/([0-9a-f]{6}_[0-9a-f]{32})', x['src'])
    k = m.group(1) if m else x['src']
    area = (x.get('intrinsicWidth') or 0) * (x.get('intrinsicHeight') or 0)
    home = any(re.search(r'flavorsdetroit\.com/?$', u) for u in x.get('usedOn', []))
    posts = [u for u in x.get('usedOn', []) if '/post/' in u]
    if k not in best or area > best[k]['area']:
        best[k] = dict(k=k, area=area, file=x.get('localFile'), w=x.get('intrinsicWidth'), h=x.get('intrinsicHeight'),
                       home=home or best.get(k, {}).get('home', False), posts=len(posts), alt=(x.get('alts') or [''])[0])
    else:
        best[k]['home'] = best[k]['home'] or home

items = list(best.values())
if which == 'home':
    items = [i for i in items if i['home']]
elif which == 'posts':
    items = [i for i in items if i['posts'] and not i['home']]
items = [i for i in items if i['file'] and os.path.exists(os.path.join(ROOT, i['file']))]
items.sort(key=lambda i: -i['area'])
print(which, len(items), 'unique media')

T = 220; cols = 6; rows = (len(items) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (T + 10), rows * (T + 40)), (240, 240, 240))
d = ImageDraw.Draw(sheet)
for n, i in enumerate(items):
    try:
        im = Image.open(os.path.join(ROOT, i['file'])).convert('RGB')
        im.thumbnail((T, T))
        x = (n % cols) * (T + 10) + 5; y = (n // cols) * (T + 40) + 5
        sheet.paste(im, (x, y))
        d.text((x, y + T + 2), f"{n}: {i['w']}x{i['h']}", fill=(0, 0, 0))
        d.text((x, y + T + 16), (i['alt'] or i['k'])[:34], fill=(60, 60, 60))
    except Exception as e:
        print('skip', i['file'], e)
sheet.save(out)
json.dump(items, open(out.replace('.png', '.json'), 'w'), indent=1)
print('wrote', out)
