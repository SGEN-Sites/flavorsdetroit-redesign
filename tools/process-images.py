"""process-images.py - derive every picture the redesign ships from the client's own files.

    python3 -I tools/process-images.py

Sources: assets/brand/flavors-logo-original.png (the logo, untouched), assets/originals/* (original
uploads behind the live home page), assets/source/* (images downloaded from the live posts).
Writes src/assets/img/*.webp|png|jpg and src/content/images.json (file, w, h, source, alt).
The logo is resized only: never recoloured, never redrawn. Product photos are resized and
cropped; nothing is generated or altered by AI.
"""
import json, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'assets', 'img')
os.makedirs(OUT, exist_ok=True)
manifest = {}

def P(*p):
    return os.path.join(ROOT, *p)

def save(im, name, fmt='WEBP', q=80, source='', alt='', **kw):
    path = os.path.join(OUT, name)
    if fmt == 'WEBP':
        im.save(path, 'WEBP', quality=q, method=6, **kw)
    elif fmt == 'PNG':
        im.save(path, 'PNG', optimize=True)
    elif fmt == 'JPEG':
        im.convert('RGB').save(path, 'JPEG', quality=q, optimize=True, progressive=True)
    elif fmt == 'ICO':
        im.save(path, 'ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    manifest[name] = dict(w=im.size[0], h=im.size[1], bytes=os.path.getsize(path), source=source, alt=alt)
    print(f'{name:34s} {im.size[0]}x{im.size[1]} {os.path.getsize(path)//1024} KB')

def fit_w(im, w):
    if im.size[0] <= w:
        return im.copy()
    h = round(im.size[1] * w / im.size[0])
    return im.resize((w, h), Image.LANCZOS)

def crop_alpha(im, pad=0.02):
    bb = im.getchannel('A').getbbox()
    if not bb:
        return im
    x0, y0, x1, y1 = bb
    px, py = int((x1 - x0) * pad), int((y1 - y0) * pad)
    return im.crop((max(0, x0 - px), max(0, y0 - py), min(im.size[0], x1 + px), min(im.size[1], y1 + py)))

# ---- the logo (kept on its full canvas so the bulb overlay coordinates still line up) ----------
logo_src = 'assets/brand/flavors-logo-original.png'
logo = Image.open(P(logo_src)).convert('RGBA')
for w in (240, 480, 960, 1400):
    save(fit_w(logo, w), f'logo-sign-{w}.webp', q=90, source=logo_src, alt='Flavors Detroit', lossless=False)
save(fit_w(logo, 512), 'logo-sign-512.png', fmt='PNG', source=logo_src, alt='Flavors Detroit')

# ---- favicons from the client's own rainbow icon ---------------------------------------------
fav_src = 'assets/originals/db1c73_fc9e782e424145b1adf4303b88a77470_mv2.jpg'
fav = Image.open(P(fav_src)).convert('RGB')
side = min(fav.size)
fav = fav.crop(((fav.size[0] - side) // 2, (fav.size[1] - side) // 2, (fav.size[0] + side) // 2, (fav.size[1] + side) // 2))
save(fav.resize((180, 180), Image.LANCZOS), 'apple-touch-icon.png', fmt='PNG', source=fav_src)
save(fav.resize((192, 192), Image.LANCZOS), 'favicon-192.png', fmt='PNG', source=fav_src)
save(fav.resize((32, 32), Image.LANCZOS), 'favicon-32.png', fmt='PNG', source=fav_src)
save(fav.resize((48, 48), Image.LANCZOS), 'favicon.ico', fmt='ICO', source=fav_src)

# ---- social card 1200x630: the logo on sign black, a store-navy glow, the spectrum divider -----
# (owner 2026-11-09: black first, then blue, then whites; the stripes only as a thin divider)
stripes = [(0xaf, 0x03, 0x03), (0xfa, 0x89, 0x00), (0xf6, 0xfc, 0x1e), (0xed, 0x39, 0x7a), (0x00, 0xa3, 0xdc), (0x33, 0x89, 0x00)]
SIGN_BLACK, NAVY = (0x0b, 0x0b, 0x0a), (0x19, 0x20, 0x36)   # measured: logo body; store counter navy
og = Image.new('RGB', (1200, 630), SIGN_BLACK)
glow = Image.new('L', (1200, 630), 0)
gp = glow.load()
for y in range(630):              # an elliptical navy glow behind the sign, fading to black
    for x in range(1200):
        d = ((x - 600) / 560) ** 2 + ((y - 300) / 330) ** 2
        gp[x, y] = int(255 * max(0.0, 1 - d) ** 1.6)
og = Image.composite(Image.new('RGB', (1200, 630), NAVY), og, glow)
lg = logo.copy()
lg.thumbnail((720, 520), Image.LANCZOS)
og.paste(lg, ((1200 - lg.size[0]) // 2, (612 - lg.size[1]) // 2), lg)
sw = 1200 / len(stripes)
for i, c in enumerate(stripes):  # the spectrum divider along the bottom edge, blended like the site's line
    for x in range(int(i * sw), int((i + 1) * sw)):
        t = (x - i * sw) / sw
        n = stripes[min(i + 1, len(stripes) - 1)]
        col = tuple(int(c[k] + (n[k] - c[k]) * t) for k in range(3))
        for y in range(622, 630):
            og.putpixel((x, y), col)
save(og, 'og-flavors-detroit.jpg', fmt='JPEG', q=86, source=logo_src + ' on measured sign black + store navy, spectrum divider (facts/client-facts.json)', alt='Flavors Detroit')

# ---- product photography (client media) ----------------------------------------------------------
def photo(src, name, w, crop=None, alt='', q=78, alpha=False, q2=None):
    im = Image.open(P(src))
    im = im.convert('RGBA') if alpha else im.convert('RGB')
    if crop:
        W, H = im.size
        im = im.crop((int(crop[0] * W), int(crop[1] * H), int(crop[2] * W), int(crop[3] * H)))
    if alpha:
        im = crop_alpha(im)
    save(fit_w(im, w), name, q=q, source=src, alt=alt)
    if im.size[0] >= w * 1.6:
        save(fit_w(im, int(w * 1.6)), name.replace('.webp', '@2x.webp'), q=q2 or (q - 6), source=src, alt=alt)

photo('assets/originals/501c8b_5b00c7f3a6504c3e8a23d55e78e03cf0_mv2.png', 'cat-flower.webp', 560, alt='A cannabis flower bud', alpha=True)
photo('assets/source/91fc54cf-db1c73_b8ceacfccc724bf39d34787165d0c5f4-mv2.png', 'cat-concentrates.webp', 560, crop=(0.0, 0.18, 1.0, 0.78), alt='An amber cannabis concentrate on black')
photo('assets/originals/501c8b_ff786b5c14554e21831ec01588ee994a_mv2.jpg', 'cat-edibles.webp', 560, crop=(0.06, 0.08, 0.94, 0.92), alt='A pile of sour gummies')
photo('assets/originals/501c8b_32c3f240dd1b4494a9710eefcab2a3fd_mv2.jpg', 'learn-flower.webp', 640, crop=(0.0, 0.08, 1.0, 0.92), alt='A purple and orange cannabis bud on black', q=88, q2=70)
photo('assets/source/23d81c20-db1c73_7b9d6157a6014773acb51c17182242df-mv2.jpg', 'learn-concentrate-glass.webp', 640, crop=(0.0, 0.12, 1.0, 0.86), alt='Glassy amber cannabis concentrate on white')
photo('assets/source/c0184b76-db1c73_1e5dcb88a436450386bbc115e44f2d03-mv2.jpg', 'learn-concentrate-jar.webp', 640, crop=(0.0, 0.1, 1.0, 0.9), alt='A golden cannabis concentrate in a glass jar')
photo('assets/originals/501c8b_87670f69e1ae4d5595b6d14df184deab_mv2.jpg', 'learn-kief.webp', 640, alt='A pile of kief on a dark surface')
photo('assets/source/adac940b-db1c73_5a89d2d8e77041cd97ba6a96c7441324-mv2.jpg', 'learn-edible.webp', 640, crop=(0.05, 0.12, 0.95, 0.88), alt='A candy-studded cookie')

json.dump(manifest, open(os.path.join(ROOT, 'src', 'content', 'images.json'), 'w'), indent=1)
print('images', len(manifest))
