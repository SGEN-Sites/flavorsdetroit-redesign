"""detect-bulbs.py - find the marquee bulbs in the client's logo so the redesign can light the REAL
bulbs (an SVG overlay at their exact centres) instead of drawing new ones. The logo file itself is
never altered.

    python3 -I tools/detect-bulbs.py

Reads  assets/brand/flavors-logo-original.png (1838x1482 RGBA, black sign, white bulbs + letters)
Writes src/content/logo-bulbs.json  {w, h, bulbs:[{x,y,r,i}], letters:{bbox}}  (i = chase order)
       audit/logo-bulbs-check.png   (the detected circles drawn over the logo, for review)
"""
import json, math, os
from collections import deque
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(ROOT, 'assets', 'brand', 'flavors-logo-original.png')
im = Image.open(src).convert('RGBA')
W, H = im.size
px = im.load()

# white = opaque and bright
white = [[False] * W for _ in range(H)]
for y in range(H):
    for x in range(W):
        r, g, b, a = px[x, y]
        white[y][x] = a > 200 and r > 200 and g > 200 and b > 200

seen = [[False] * W for _ in range(H)]
comps = []
for y in range(H):
    for x in range(W):
        if white[y][x] and not seen[y][x]:
            q = deque([(x, y)]); seen[y][x] = True
            xs = ys = n = 0; minx = maxx = x; miny = maxy = y
            while q:
                cx, cy = q.popleft(); xs += cx; ys += cy; n += 1
                minx = min(minx, cx); maxx = max(maxx, cx); miny = min(miny, cy); maxy = max(maxy, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < W and 0 <= ny < H and white[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True; q.append((nx, ny))
            comps.append(dict(n=n, cx=xs / n, cy=ys / n, w=maxx - minx + 1, h=maxy - miny + 1, bbox=(minx, miny, maxx, maxy)))

# A bulb: roughly round (w ~ h), area close to a disc of that width, and not tiny noise.
bulbs, letters = [], []
for c in comps:
    if c['n'] < 300:
        continue
    ratio = c['w'] / c['h']
    disc = math.pi * (c['w'] / 2) * (c['h'] / 2)
    fill = c['n'] / disc if disc else 0
    if 0.8 < ratio < 1.25 and 0.85 < fill < 1.15 and c['w'] < 90:
        bulbs.append(c)
    else:
        letters.append(c)

# Chase order: walk the bulbs around the sign by angle from the centroid of all bulbs,
# starting at the top-left and going clockwise.
mx = sum(b['cx'] for b in bulbs) / len(bulbs)
my = sum(b['cy'] for b in bulbs) / len(bulbs)
for b in bulbs:
    b['ang'] = math.atan2(b['cy'] - my, b['cx'] - mx)
start = -math.pi * 0.75  # upper left
bulbs.sort(key=lambda b: (b['ang'] - start) % (2 * math.pi))

lb = None
if letters:
    lb = (min(l['bbox'][0] for l in letters), min(l['bbox'][1] for l in letters),
          max(l['bbox'][2] for l in letters), max(l['bbox'][3] for l in letters))

out = dict(source='assets/brand/flavors-logo-original.png', w=W, h=H,
           bulbs=[dict(i=i, x=round(b['cx'], 1), y=round(b['cy'], 1), r=round((b['w'] + b['h']) / 4, 1)) for i, b in enumerate(bulbs)],
           letters=dict(bbox=lb, components=len(letters)))
os.makedirs(os.path.join(ROOT, 'src', 'content'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'src', 'content', 'logo-bulbs.json'), 'w'), indent=1)

chk = im.copy(); d = ImageDraw.Draw(chk)
for b in out['bulbs']:
    d.ellipse((b['x'] - b['r'] - 6, b['y'] - b['r'] - 6, b['x'] + b['r'] + 6, b['y'] + b['r'] + 6), outline=(255, 40, 120, 255), width=5)
    d.text((b['x'] + b['r'] + 8, b['y'] - 10), str(b['i']), fill=(255, 40, 120, 255))
bg = Image.new('RGBA', chk.size, (60, 70, 110, 255))
Image.alpha_composite(bg, chk).convert('RGB').resize((W // 2, H // 2)).save(os.path.join(ROOT, 'audit', 'logo-bulbs-check.png'))
print('bulbs', len(out['bulbs']), 'other components', len(letters), 'letters bbox', lb)
