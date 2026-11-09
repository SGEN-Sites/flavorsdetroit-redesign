#!/usr/bin/env python3
"""category-renders.py: the product renders on the four category cards (owner, 2026-11-09: keep the
category section's layout, make the cards look like a reference of four solid-colour cards with one
product each, "I want product images to be rendered uniformly").

Source: assets/generated/raw/cat-<id>-r.png, rendered with fal-ai/flux-pro/v1.1-ultra from ONE studio
template (straight-on, soft diffused light, the product centred, a solid seamless backdrop in the card's
colour), the same seed where the model allowed it; prompts, seeds and request ids in
assets/generated/jobs-cat.json. Every product is unbranded and sealed, with no text.

Each render is made uniform here: the backdrop colour is sampled from the border ring (it becomes the
card's colour, so the product sits on its own backdrop colour); the product is found by its distance
from that colour (a bbox check image per render); the product itself comes from the fal BiRefNet v2
cut-out (assets/generated/raw/cat-<id>-cut.png), with gaps inside the glass filled from the render and
jar walls the cut-out bit away rebuilt (repair_outline), cropped to the product.
Output: src/assets/img/cat/<id>-cut-<h>.webp (IPTC trainedAlgorithmicMedia XMP) and
src/content/category-renders.json (card colour, ink chosen for WCAG AA, alt, provenance, repairs).

  python3 -I tools/category-renders.py
"""
import json, os
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW = os.path.join(ROOT, 'assets', 'generated', 'raw')
OUT = os.path.join(ROOT, 'src', 'assets', 'img', 'cat')
JOBS = os.path.join(ROOT, 'assets', 'generated', 'jobs-cat.json')
MANIFEST = os.path.join(ROOT, 'src', 'content', 'category-renders.json')
CUT_HEIGHTS = [440, 880]     # the cut-out's pixel heights (1x and 2x of the largest card product)
INK = (13, 16, 24)            # --ink #0d1018

ALT = {
    'flower': 'Illustration: a glass jar with a black lid, filled to the brim with green cannabis buds',
    'concentrates': 'Illustration: a small glass jar with a black lid, filled with golden-amber cannabis budder',
    'edibles': 'Illustration: a glass jar with a black lid, filled to the brim with sugar-coated fruit gummies',
    'more': 'Illustration: a cream-white drink can of a cannabis beverage, with a green leaf emblem',
}


def lum(rgb):
    c = np.asarray(rgb, np.float64) / 255
    c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return float(c @ [0.2126, 0.7152, 0.0722])


def contrast(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def xmp(desc):
    return ('<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>'
            '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
            '<rdf:Description rdf:about="" xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" '
            'xmlns:dc="http://purl.org/dc/elements/1.1/" '
            'Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia">'
            f'<dc:description><rdf:Alt><rdf:li xml:lang="x-default">{desc}</rdf:li></rdf:Alt></dc:description>'
            '</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>').encode('utf-8')


def envelope(e):
    """The smallest profile at or above e that rises to one peak and falls again: a dip (a bite out of
    the side) is lifted to the lower of the widest points above and below it, and an edge that only
    narrows toward the base keeps its own shape."""
    up = np.maximum.accumulate(e)
    down = np.maximum.accumulate(e[::-1])[::-1]
    return np.minimum(up, down)


def repair_outline(rgba, photo):
    """The outline (owner, 2026-11-09, after round 2: "parts of jar still looks missing"). BiRefNet read
    the clear glass walls low on the flower and gummies jars as background: it cut them away together
    with the contents seen through them, leaving ragged bites out of both sides. A jar or can photographed
    straight on is equally wide all the way down its body, so below the shoulder (the first row where
    the product reaches 97% of its widest) each side's edge is rebuilt with envelope(): a row reaches out
    at least as far as the intact rows above and below it on that side, and never further than the body
    is anywhere. Every pixel inside the rebuilt outline is made opaque with the render's own colour (the
    photographed glass wall and what shows through it), so nothing inside a product is see-through.
    The lid, neck and shoulder rows are left as BiRefNet cut them."""
    a = rgba[..., 3]
    solid = a > 127
    H, W = solid.shape
    rows = np.where(solid.any(axis=1))[0]
    top, bot = int(rows.min()), int(rows.max())
    L = np.full(H, W, np.int64)
    R = np.full(H, -1, np.int64)
    for y in range(top, bot + 1):
        xs = np.flatnonzero(solid[y])
        if xs.size:
            L[y], R[y] = xs[0], xs[-1]
    width = np.where(R >= 0, R - L + 1, 0)
    y0 = int(np.argmax(width >= 0.97 * width.max()))
    body = slice(y0, bot + 1)
    Lc = -envelope(-L[body])
    Rc = envelope(R[body])
    mask = np.zeros_like(solid)
    cols = np.arange(W)[None, :]
    mask[body] = (cols >= Lc[:, None]) & (cols <= Rc[:, None])
    lift = mask & (a < 250)
    restored = int((mask & ~solid).sum())
    rgba[lift, :3] = photo[lift]
    rgba[lift, 3] = 255
    moved = int(((Lc < L[body]) | (Rc > R[body])).sum())
    return {'restored': restored, 'rows': moved, 'bodyFromRow': y0, 'of': int(bot - top + 1)}


def main():
    import cv2
    jobs = json.load(open(JOBS))
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.webp'):
            os.remove(os.path.join(OUT, f))
    items = {}
    for cid, job in jobs['items'].items():
        im = Image.open(os.path.join(RAW, f'cat-{cid}-r.png')).convert('RGB')
        a = np.asarray(im).astype(np.int16)
        H, W, _ = a.shape
        r = round(0.05 * min(H, W))
        ring = np.concatenate([a[:r].reshape(-1, 3), a[:, :r].reshape(-1, 3), a[:, -r:].reshape(-1, 3)])
        bg = np.median(ring, axis=0)
        # the product: per-row backdrop model (each row's colour from its own left and right edges,
        # interpolated across), so the wall/floor horizon and the light falloff are not "product";
        # distance in Lab with lightness down-weighted, so the soft shadow is not "product" either
        lab = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2LAB).astype(np.float32)
        e = max(8, round(0.08 * W))
        left = np.median(lab[:, :e], axis=1)                     # H x 3
        right = np.median(lab[:, -e:], axis=1)
        t = np.linspace(0, 1, W, dtype=np.float32)[None, :, None]
        model = left[:, None, :] * (1 - t) + right[:, None, :] * t
        d = lab - model
        dist = np.sqrt((0.45 * d[..., 0]) ** 2 + d[..., 1] ** 2 + d[..., 2] ** 2)
        mask = (dist > 16).astype(np.uint8) * 255
        mask[:, :e] = 0
        mask[:, -e:] = 0
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((31, 31), np.uint8))
        n, lbl, stats, _ = cv2.connectedComponentsWithStats(mask)
        k = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        x, y, w, h = stats[k, :4]
        comp = (lbl == k)
        # the cast shadow widens the box to one side and lengthens it below the base: take the product's
        # horizontal span from its upper part (cap and body, no shadow there) and its base from the last
        # row where the product fills most of that span
        upper = comp[y:y + int(0.6 * h), x:x + w]
        cols = np.where(upper.mean(axis=0) > 0.3)[0]
        px0, px1 = x + int(cols.min()), x + int(cols.max())
        cover = comp[y:y + h, px0:px1 + 1].mean(axis=1)
        rows = np.where(cover >= 0.5)[0]
        bottom = y + int(rows.max())
        x, w, h = px0, px1 - px0 + 1, bottom - y + 1
        dbg = np.asarray(im).copy()
        cv2.rectangle(dbg, (int(x), int(y)), (int(x + w), int(y + h)), (255, 0, 255), max(3, W // 300))
        Image.fromarray(dbg).resize((512, round(512 * H / W))).save(os.path.join(RAW, f'cat-{cid}-bbox.png'))
        bg_hex = '#%02x%02x%02x' % tuple(int(v) for v in bg)
        dark = contrast(INK, bg) >= 4.5
        ink = 'dark' if dark else 'light'
        # ---- the cut-out (owner, 2026-11-09: the top third of each product sticks out above its card,
        # over the black band). fal BiRefNet v2 (assets/generated/raw/cat-<id>-cut.png) gives the product
        # with its edge colours cleaned and leaves out the floor and the cast shadow; it is used as it is.
        # (A first version also "unmixed" the see-through glass from the backdrop; it made products close
        # to the backdrop colour (light buds on lime, pink gummies on pink) ghostly, so it was dropped,
        # and the jars were re-rendered filled to the brim, so little bare glass rises above the card.)
        rgba = np.asarray(Image.open(os.path.join(RAW, f'cat-{cid}-cut.png')).convert('RGBA')).copy()
        # holes: BiRefNet can treat a patch of bare glass inside the jar as background (round 2: the
        # concentrates jar had a hole at its upper left that showed the black band through). Any
        # transparent region that the product's silhouette fully encloses is filled from the render
        # itself, so the glass there shows what it showed in the photograph.
        solid = (rgba[..., 3] > 127).astype(np.uint8)
        ff = np.zeros((H + 2, W + 2), np.uint8)
        outside = (1 - solid).copy()
        cv2.floodFill(outside, ff, (0, 0), 2)
        holes = (outside == 1)                                   # background-like but not reachable from the edge
        holes = cv2.morphologyEx(holes.astype(np.uint8), cv2.MORPH_DILATE, np.ones((3, 3), np.uint8)).astype(bool) & (rgba[..., 3] < 250)
        nh = int(holes.sum())
        if nh:
            rgba[holes, :3] = np.asarray(im)[holes]
            rgba[holes, 3] = 255
        added = repair_outline(rgba, np.asarray(im))
        alpha = rgba[..., 3] / 255.0
        ys, xs = np.where(alpha > 0.04)
        pad = 6
        cx0, cy0, cx1, cy1 = max(0, xs.min() - pad), max(0, ys.min() - pad), min(W, xs.max() + pad + 1), min(H, ys.max() + pad + 1)
        crop = Image.fromarray(rgba).crop((cx0, cy0, cx1, cy1))
        cw, chh = crop.size
        files = []
        for hh in CUT_HEIGHTS:
            ww = round(cw * hh / chh)
            fn = f'cat/{cid}-cut-{hh}.webp'
            crop.resize((ww, hh), Image.LANCZOS).save(os.path.join(ROOT, 'src', 'assets', 'img', fn), 'WEBP', quality=86, method=6,
                                                       xmp=xmp(ALT[cid].replace('Illustration: ', 'AI illustration (' + job['model'] + ', background removed with fal BiRefNet v2): ')))
            files.append({'file': fn, 'w': ww, 'h': hh, 'bytes': os.path.getsize(os.path.join(ROOT, 'src', 'assets', 'img', fn))})
        semi = float(((alpha > 0.04) & (alpha < 0.96)).sum() / max(1, (alpha > 0.04).sum()))
        items[cid] = {'bg': bg_hex, 'ink': ink, 'inkContrast': round(contrast(INK if dark else (255, 255, 255), bg), 2),
                      'aspect': round(cw / chh, 4), 'alt': ALT[cid], 'files': files,
                      'cutout': 'fal-ai/birefnet/v2 (General Use (Heavy), 2048), used as it is', **job}
        items[cid]['holesFilled'] = nh
        items[cid]['outlineRepaired'] = added
        print(f'{cid:13s} bg {bg_hex} ink {ink} ({items[cid]["inkContrast"]}:1)  cut-out {cw}x{chh} (w/h {cw / chh:.2f}), soft-edge pixels {semi:.1%}, hole pixels filled {nh}, outline pixels restored {added["restored"]} (rows {added["rows"]})')
    json.dump({'note': 'Category card product renders (AI illustrations; tools/category-renders.py).', 'items': items},
              open(MANIFEST, 'w'), indent=1)
    print('wrote', os.path.relpath(MANIFEST, ROOT))


if __name__ == '__main__':
    main()
