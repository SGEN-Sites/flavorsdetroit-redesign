#!/usr/bin/env python3
"""ownbox-assets.py: the images for the home Owner's Box band (owner, 2026-11-09: "upscale this image,
make it Black and white and subtle the fades into black for this section's BG ... add this box because
I want to create an animation where the box opens and the cards will come out of it ... smoke effect
should be mystical green").

  street   the owner's street photo (assets/source/owner-products/street-photo.png), upscaled 4x with fal
           Topaz High Fidelity V2 (assets/generated/raw/owner-street-up.png), made black and white with a
           gentle curve and darkened: the band's background (the fades into black are CSS).
  case     the owner's road case (assets/source/owner-products/road-case.png) and an AI edit of it with
           the lid open (fal nano-banana-pro/edit, assets/generated/raw/case-open-r.png), each cut out
           with fal Bria RMBG 2.0 (whole, no floor). The open case is scaled and moved so its body sits
           exactly on the closed one's, and both are written on one canvas, so they crossfade in place.
  smoke    two AI renders of green smoke on black (fal flux-pro/v1.1-ultra): black becomes transparent
           (alpha = brightness, colour unpremultiplied), so the smoke shows over anything.

Output: src/assets/img/ownbox/*.webp (IPTC XMP) and src/content/ownbox-assets.json.
Provenance: assets/generated/jobs-ownbox.json.

  python3 -I tools/ownbox-assets.py
"""
import json, os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW = os.path.join(ROOT, 'assets', 'generated', 'raw')
SRC = os.path.join(ROOT, 'assets', 'source', 'owner-products')
OUT = os.path.join(ROOT, 'src', 'assets', 'img', 'ownbox')
MANIFEST = os.path.join(ROOT, 'src', 'content', 'ownbox-assets.json')


def xmp(desc, source_type):
    return ('<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>'
            '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
            '<rdf:Description rdf:about="" xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" '
            'xmlns:dc="http://purl.org/dc/elements/1.1/" '
            f'Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/{source_type}">'
            f'<dc:description><rdf:Alt><rdf:li xml:lang="x-default">{desc}</rdf:li></rdf:Alt></dc:description>'
            '</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>').encode('utf-8')


def save(img, name, widths, q, desc, st, alpha=False):
    files = []
    for w in widths:
        if w > img.width:
            continue
        h = round(img.height * w / img.width)
        fn = f'ownbox/{name}-{w}.webp'
        img.resize((w, h), Image.LANCZOS).save(os.path.join(ROOT, 'src', 'assets', 'img', fn), 'WEBP', quality=q, method=6, xmp=xmp(desc, st))
        files.append({'file': fn, 'w': w, 'h': h, 'bytes': os.path.getsize(os.path.join(ROOT, 'src', 'assets', 'img', fn))})
    return files


def body_box(rgba):
    """The case body: its bottom (the lowest solid row, the wheels) and its left and right in the lower
    half (below the lid line)."""
    m = rgba[..., 3] > 200
    ys = np.where(m.any(axis=1))[0]
    top, bot = ys.min(), ys.max()
    low = m[top + (bot - top) // 2: bot + 1]
    xs = np.where(low.any(axis=0))[0]
    return float(xs.min()), float(xs.max()), float(bot)


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.webp'):
            os.remove(os.path.join(OUT, f))
    man = {}
    # ---- street: black and white, gentle S, darker
    st = Image.open(os.path.join(RAW, 'owner-street-up.png')).convert('RGB')
    a = np.asarray(st).astype(np.float32) / 255
    lum = a @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    lo, hi = np.percentile(lum, 1), np.percentile(lum, 99.5)
    lum = np.clip((lum - lo) / (hi - lo), 0, 1)
    lum = 0.7 * lum + 0.3 * (lum * lum * (3 - 2 * lum))
    lum = lum * 0.82
    bw = Image.fromarray((lum * 255 + 0.5).astype(np.uint8)).convert('RGB')
    man['street'] = {'alt': '', 'files': save(bw, 'street-bw', [1280, 1920, 2560, 3200], 62,
        'Street photo supplied by the owner (2026-11-09), upscaled 4x with Topaz High Fidelity V2 and made black and white.', 'algorithmicallyEnhanced'),
        'source': 'assets/source/owner-products/street-photo.png', 'note': 'background; the fades into black are CSS'}
    # ---- the case, closed and open, on one canvas
    # cut out with fal Bria RMBG 2.0 (owner, 2026-11-09: "make sure to cut this properly ... I can still see
    # the background from previous file under"): BiRefNet had dropped the black panels, and the step that
    # put back every dark pixel also put back the floor's shadow between the wheels; Bria keeps the case
    # whole and leaves the floor out, so its cut-outs are used as they are
    shut = np.asarray(Image.open(os.path.join(RAW, 'owner-case-closed-bria.png')).convert('RGBA')).copy()
    opn = np.asarray(Image.open(os.path.join(RAW, 'case-open-bria.png')).convert('RGBA')).copy()
    l1, r1, b1 = body_box(shut); l2, r2, b2 = body_box(opn)
    s = (r1 - l1) / (r2 - l2)
    opn_img = Image.fromarray(opn).resize((round(opn.shape[1] * s), round(opn.shape[0] * s)), Image.LANCZOS)
    dx, dy = l1 - l2 * s, b1 - b2 * s                                           # where the open image's origin lands in the closed one's frame
    shut_img = Image.fromarray(shut)
    x0, y0 = min(0, dx), min(0, dy)
    x1, y1 = max(shut_img.width, dx + opn_img.width), max(shut_img.height, dy + opn_img.height)
    cw, chh = round(x1 - x0), round(y1 - y0)
    c_shut = Image.new('RGBA', (cw, chh)); c_shut.paste(shut_img, (round(-x0), round(-y0)))
    c_open = Image.new('RGBA', (cw, chh)); c_open.paste(opn_img, (round(dx - x0), round(dy - y0)))
    # crop both to the union of what they show
    un = np.maximum(np.asarray(c_shut)[..., 3], np.asarray(c_open)[..., 3]) > 6
    ys, xs = np.where(un)
    box = (max(0, xs.min() - 6), max(0, ys.min() - 6), min(cw, xs.max() + 7), min(chh, ys.max() + 7))
    c_shut, c_open = c_shut.crop(box), c_open.crop(box)
    widths = [480, 720, 960]
    man['caseClosed'] = {'alt': '', 'files': save(c_shut, 'case-closed', widths, 84,
        'Road case with the Flavors Detroit logo, image supplied by the owner (2026-11-09); background removed.', 'algorithmicallyEnhanced'),
        'source': 'assets/source/owner-products/road-case.png'}
    man['caseOpen'] = {'alt': '', 'files': save(c_open, 'case-open', widths, 84,
        'The owner\'s road case with its lid opened by AI (fal nano-banana-pro/edit); background removed.', 'compositeWithTrainedAlgorithmicMedia'),
        'source': 'fal-ai/nano-banana-pro/edit of the owner\'s road case'}
    man['case'] = {'aspect': round(c_shut.width / c_shut.height, 4), 'scaleOpen': round(s, 4),
                   # where the case opening is, as a fraction of the canvas: the smoke and the cards start there
                   'opening': {'x': round(((l1 + r1) / 2 - box[0] - x0) / c_shut.width, 4), 'y': round(0.36, 4)}}
    # ---- smoke: black -> transparent
    for k in ['a', 'b']:
        sm = np.asarray(Image.open(os.path.join(RAW, f'smoke-{k}.png')).convert('RGB')).astype(np.float32) / 255
        al = np.clip((sm.max(axis=2) - 0.10) / 0.80, 0, 1) ** 1.15   # the render's near-black (up to ~0.08) goes fully clear
        col = np.clip(sm / np.maximum(al[..., None], 1e-3), 0, 1)
        img = Image.fromarray((np.dstack([col, al]) * 255 + 0.5).astype(np.uint8), 'RGBA')
        man['smoke' + k.upper()] = {'alt': '', 'files': save(img, f'smoke-{k}', [400, 800], 70,
            'AI illustration (fal-ai/flux-pro/v1.1-ultra): green smoke, background made transparent.', 'trainedAlgorithmicMedia')}
    json.dump(man, open(MANIFEST, 'w'), indent=1)
    for k, v in man.items():
        if 'files' in v:
            print(f'{k:11s}', ', '.join(f'{f["file"]} ({f["w"]}x{f["h"]}, {f["bytes"] // 1024} KB)' for f in v['files']))
    print('case', man['case'])
    print('wrote', os.path.relpath(MANIFEST, ROOT))


if __name__ == '__main__':
    main()
