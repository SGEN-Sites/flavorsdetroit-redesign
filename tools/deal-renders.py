#!/usr/bin/env python3
"""deal-renders.py: the product images on the home deals band's bento cards (owner, 2026-11-09: "turn
these deal cards into bento layout for all categories. Include product images.").

Source: assets/generated/raw/deal-<id>-r.png (fal-ai/flux-pro/v1.1-ultra, one studio template on a
light grey backdrop, the same seed; prompts, request ids and spend in assets/generated/jobs-deals.json)
and deal-<id>-cut.png (fal BiRefNet v2 cut-out of each render). Every product is unbranded, nothing is
lit, containers are closed, no text. The live menu capture holds no product photos, so each image
stands for the product TYPE of its deal, never a particular brand's product: the alt text says
"Illustration", the files carry IPTC trainedAlgorithmicMedia and the <img> data-ai="generated".

Per image: enclosed gaps BiRefNet left inside the glass are filled from the render; glass walls it bit
away are rebuilt per object (repair_edges: only the object's OUTER left and right edges move, so the
gaps between several jars in one picture stay open); then cropped to the product and written as
src/assets/img/deal/<id>-<h>.webp, with src/content/deal-renders.json (alt, aspect, files, repairs,
provenance).

  python3 -I tools/deal-renders.py
"""
import importlib.util, json, os
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW = os.path.join(ROOT, 'assets', 'generated', 'raw')
OUT = os.path.join(ROOT, 'src', 'assets', 'img', 'deal')
JOBS = os.path.join(ROOT, 'assets', 'generated', 'jobs-deals.json')
MANIFEST = os.path.join(ROOT, 'src', 'content', 'deal-renders.json')
HEIGHTS = [360, 720]            # 1x and 2x of the largest card image

spec = importlib.util.spec_from_file_location('catr', os.path.join(ROOT, 'tools', 'category-renders.py'))
catr = importlib.util.module_from_spec(spec); spec.loader.exec_module(catr)

ALT = {
    'eighths': 'Illustration: a small glass jar with a black lid, filled with green cannabis buds, two loose buds beside it',
    'gram': 'Illustration: a white dish heaped with loose green cannabis buds',
    'premium': 'Illustration: two small glass jars with black lids, filled with green cannabis buds',
    'topshelf': 'Illustration: a small glass jar with a black lid, filled with frosty cannabis buds',
    'preroll': 'Illustration: a single white pre-roll',
    'jumbo': 'Illustration: seven white pre-rolls standing together',
    'cart': 'Illustration: a vape cartridge, golden oil in a clear tank under a black mouthpiece',
    'disposable': 'Illustration: a slim black disposable vape pen',
    'budder': 'Illustration: a wide glass jar with a black lid, filled with golden whipped budder',
    'wax': 'Illustration: a wide glass jar with a white lid, filled with amber crumbly wax',
    'crumbles': 'Illustration: three small glass jars with black lids, filled with golden crumble',
    'budders': 'Illustration: five small glass jars with black lids, filled with golden budder',
    'ounce': 'Illustration: a plain black stand-up pouch with a heap of green cannabis buds in front of it',
    'shake': 'Illustration: a glass jar with a black lid, filled with small pieces of cannabis flower',
}
# which objects get their glass walls rebuilt: the largest object, every object over 10% of the
# product's area ('each'), or none (piles of buds, pre-rolls, pens: no straight walls to rebuild)
REPAIR = {'eighths': 'largest', 'premium': 'each', 'topshelf': 'largest', 'budder': 'largest', 'wax': 'largest',
          'crumbles': 'largest', 'budders': 'largest', 'shake': 'largest', 'cart': 'largest'}


def repair_edges(rgba, photo, comp):
    """One object's straight walls: below its shoulder (the first row at 97% of its widest), each side's
    outer edge reaches at least as far as the intact rows above and below it (catr.envelope); only the
    pixels between the old and the rebuilt edge are added, opaque, from the render itself."""
    H, W = comp.shape
    rows = np.where(comp.any(axis=1))[0]
    top, bot = int(rows.min()), int(rows.max())
    L = np.full(H, W, np.int64); R = np.full(H, -1, np.int64)
    for y in range(top, bot + 1):
        xs = np.flatnonzero(comp[y])
        if xs.size:
            L[y], R[y] = xs[0], xs[-1]
    # each side finds its own shoulder, measured from the lid's centre: a loose bud touching one side
    # of the jar must not move where the other side's wall starts
    lid = [y for y in range(top, top + max(3, (bot - top) // 20)) if R[y] >= 0]
    cx = float(np.median([(L[y] + R[y]) / 2 for y in lid]))
    has = R >= 0
    eL = np.where(has, cx - L, -np.inf); eR = np.where(has, R - cx, -np.inf)
    # the reference width from the upper 70% of the object: loose pieces lie at its foot
    upper = has.copy(); upper[top + int(0.7 * (bot - top)):] = False
    refL, refR = eL[upper].max(), eR[upper].max()
    y0 = min(int(np.argmax(eL >= 0.97 * refL)), int(np.argmax(eR >= 0.97 * refR)))
    body = slice(y0, bot + 1)
    # seen straight on, a jar is the same on both sides: each side may also borrow the other side's
    # wall, but only where that wall is the jar's own (not wider than the jar: loose buds at one foot)
    eLt = np.maximum(eL, np.where(eR <= 1.01 * refR, eR, -np.inf))
    eRt = np.maximum(eR, np.where(eL <= 1.01 * refL, eL, -np.inf))
    envL, envR = catr.envelope(eLt[body]), catr.envelope(eRt[body])
    ok = has[body]
    Lc = np.ceil(cx - envL).astype(np.int64); Rc = np.floor(cx + envR).astype(np.int64)
    cols = np.arange(W)[None, :]
    add = np.zeros_like(comp)
    add[body] = (((cols >= Lc[:, None]) & (cols < L[body][:, None])) | ((cols > R[body][:, None]) & (cols <= Rc[:, None]))) & ok[:, None]
    lift = add & (rgba[..., 3] < 250)
    rgba[lift, :3] = photo[lift]
    rgba[lift, 3] = glass_alpha[lift]
    return int(lift.sum())


def see_through(photo, bg):
    """How opaque each pixel of the render is, judged by its distance from the backdrop: where the
    photograph shows the backdrop through clear glass the pixel is mostly see-through (0.2, a hint of
    glass), where it shows buds, oil or the lid it is opaque. Rebuilt and filled pixels take this, so on
    a coloured card the repaired glass shows the card through it like the rest of the jar, instead of an
    opaque strip of the grey studio backdrop."""
    import cv2
    lab = cv2.cvtColor(photo, cv2.COLOR_RGB2LAB).astype(np.float32)
    b = cv2.cvtColor(np.uint8([[bg]]), cv2.COLOR_RGB2LAB).astype(np.float32)[0, 0]
    d = lab - b
    dist = np.sqrt((0.6 * d[..., 0]) ** 2 + d[..., 1] ** 2 + d[..., 2] ** 2)
    return (np.clip((dist - 6) / (28 - 6), 0.2, 1.0) * 255).astype(np.uint8)


def glass_key(rgba, photo, bg, core_mode='contents', d0=3, d1=27):
    """Clear glass shows whatever is behind it (owner, 2026-11-09, of the jar on the blue card: "reflect
    the blue background, and NOT WHITE"; of the concentrate photos: "ensure the glass parts are complete
    and reflects the color of the background wherever you may put or use it against with"). The cut-out
    kept the glass with the studio backdrop baked in, so on a coloured card it read as white. Here the
    CONTENTS and dark parts (buds, budder, oil, lids: far from the backdrop and either coloured or dark)
    stay as they are, small gaps inside them included; everything else inside the outline that is no
    brighter than the backdrop is glass showing the backdrop: it becomes as see-through as it is close to
    the backdrop colour, and its colour is unmixed from the backdrop (F = B + (I - B) / alpha), so the
    glass keeps its own tint and edge lines and lets the card colour through. Highlights brighter than
    the backdrop (reflections, a white lid) stay solid."""
    import cv2
    lab = cv2.cvtColor(photo, cv2.COLOR_RGB2LAB).astype(np.float32)
    B = cv2.cvtColor(np.uint8([[bg]]), cv2.COLOR_RGB2LAB).astype(np.float32)[0, 0]
    d = lab - B
    dist = np.sqrt((0.6 * d[..., 0]) ** 2 + d[..., 1] ** 2 + d[..., 2] ** 2)
    chroma = np.hypot(lab[..., 1] - 128, lab[..., 2] - 128)
    bchroma = float(np.hypot(B[1] - 128, B[2] - 128))
    sil = rgba[..., 3] > 8
    core = sil & (dist > 16) & ((chroma > bchroma + 10) | (lab[..., 0] < B[0] - 45))
    if core_mode == 'largest':
        # one dollop in a dish: the contents are the largest strongly coloured piece only; tinted light
        # on the dish bottom and the gold rim are glass, judged by their distance alone
        strong = (sil & (chroma > bchroma + 25)).astype(np.uint8)
        n, lbl, stats, _ = cv2.connectedComponentsWithStats(strong)
        core = lbl == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        core = cv2.morphologyEx(core.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8)).astype(bool)
        ff = (~core).astype(np.uint8); cv2.floodFill(ff, None, (0, 0), 0); core |= ff.astype(bool)   # its own highlights
    else:
        core = cv2.morphologyEx(core.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8)).astype(bool)
        n, lbl, stats, _ = cv2.connectedComponentsWithStats((sil & ~core).astype(np.uint8))
        small = np.flatnonzero(stats[:, cv2.CC_STAT_AREA] < 0.004 * sil.sum())
        core |= np.isin(lbl, small[small > 0])
    core = cv2.dilate(core.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    cand = sil & ~core & (lab[..., 0] <= B[0] + 6)
    a_key = np.clip((dist - d0) / (d1 - d0), 0, 1)
    if core_mode == 'largest':
        # a shadow on the dish floor (the budder's, faintly tinted by the light through it) darkens
        # what is behind the glass: its opacity is how much light it takes away (1 - Y / Y_backdrop),
        # so on a coloured card it is a darker shade of that card, not a cream patch
        Y = ((lab[..., 0] / 255 * 100 + 16) / 116) ** 3; Yb = ((B[0] / 255 * 100 + 16) / 116) ** 3
        shade = cand & (chroma < bchroma + 22) & (lab[..., 0] < B[0] - 4)
        a_key = np.where(shade, np.clip(1 - Y / Yb, 0, 0.9), a_key)
    a0 = rgba[..., 3] / 255.0
    a_new = np.where(cand, np.minimum(a0, a_key), a0)
    I = photo.astype(np.float32); Bf = np.asarray(bg, np.float32)
    F = Bf + (I - Bf) / np.maximum(a_new, 0.04)[..., None]
    rgba[cand, :3] = np.clip(F[cand], 0, 255).astype(np.uint8)
    rgba[..., 3] = (a_new * 255 + 0.5).astype(np.uint8)
    return int(cand.sum())


def dish_outline(rgba, photo):
    """The budder dish (a round glass dish seen from above): BiRefNet kept the budder and two scraps of
    the rim and dropped the rest of the glass. The dish is found in the photo itself: a Hough circle on
    the quarter-size image gives the rim, and the outer edge is the strongest edge along each ray from
    its centre (the median over all angles, so the cast shadow on one side cannot pull it out). The
    whole disc becomes part of the picture; glass_key then makes its clear glass see-through."""
    import cv2
    H, W = photo.shape[:2]
    k = 4
    g = cv2.GaussianBlur(cv2.cvtColor(cv2.resize(photo, (W // k, H // k), interpolation=cv2.INTER_AREA), cv2.COLOR_RGB2GRAY), (5, 5), 1.2)
    lo, hi = int(0.30 * min(H, W) / k), int(0.47 * min(H, W) / k)
    cs = cv2.HoughCircles(g, cv2.HOUGH_GRADIENT, dp=1, minDist=5, param1=80, param2=25, minRadius=lo, maxRadius=hi)
    if cs is None:
        raise SystemExit('budder-dish: no rim circle found')
    cx, cy, r = (float(v) * k for v in cs[0][0])
    gray = cv2.GaussianBlur(cv2.cvtColor(photo, cv2.COLOR_RGB2GRAY).astype(np.float32), (5, 5), 1.5)
    gm = np.hypot(cv2.Sobel(gray, cv2.CV_32F, 1, 0), cv2.Sobel(gray, cv2.CV_32F, 0, 1))
    radii = np.arange(0.96 * r, 1.10 * r, 1.0)
    best = []
    for t in np.deg2rad(np.arange(0, 360, 2)):
        xs = np.clip((cx + radii * np.cos(t)).astype(int), 0, W - 1); ys = np.clip((cy + radii * np.sin(t)).astype(int), 0, H - 1)
        best.append(radii[int(np.argmax(gm[ys, xs]))])
    R = float(np.median(best)) + 3
    yy, xx = np.mgrid[0:H, 0:W]
    dd = np.hypot(xx - cx, yy - cy)
    disc = np.clip(R + 1.0 - dd, 0, 1)                       # a 1px soft edge
    inside = disc > 0
    take = inside & (rgba[..., 3] < 250)
    rgba[take, :3] = photo[take]
    rgba[..., 3] = np.maximum(rgba[..., 3], (disc * 255).astype(np.uint8))
    rgba[~inside, 3] = 0                                     # nothing outside the dish (its cast shadow)
    return {'cx': round(cx), 'cy': round(cy), 'rimR': round(r), 'outerR': round(R)}


def trim_backdrop(rgba, photo, bg, d0=8, d1=18):
    """Pre-rolls photographed on white: the cut-out also kept a sliver of the light floor under the
    tip (a white streak on a coloured card). Pixels within d0 of the backdrop colour go, a ramp to d1."""
    import cv2
    lab = cv2.cvtColor(photo, cv2.COLOR_RGB2LAB).astype(np.float32)
    B = cv2.cvtColor(np.uint8([[bg]]), cv2.COLOR_RGB2LAB).astype(np.float32)[0, 0]
    d = lab - B
    dist = np.sqrt((0.6 * d[..., 0]) ** 2 + d[..., 1] ** 2 + d[..., 2] ** 2)
    keep = np.clip((dist - d0) / (d1 - d0), 0, 1)
    before = int((rgba[..., 3] > 127).sum())
    rgba[..., 3] = (rgba[..., 3] * keep).astype(np.uint8)
    # a light grey floor streak attached at the tip: thinner than the pre-roll, so an opening cuts it
    m = (rgba[..., 3] > 40).astype(np.uint8)
    body = cv2.dilate(cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((17, 17), np.uint8)), np.ones((5, 5), np.uint8)).astype(bool)
    rgba[~body, 3] = 0
    # and only the pre-roll itself: the largest piece
    n, lbl, st, _ = cv2.connectedComponentsWithStats((rgba[..., 3] > 40).astype(np.uint8))
    if n > 2:
        big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
        rgba[(lbl != big) & (lbl > 0), 3] = 0
    return before - int((rgba[..., 3] > 127).sum())


def xmp(desc, source_type):
    return catr.xmp(desc).replace(b'trainedAlgorithmicMedia', source_type.encode())


# the owner's own product photos (jobs-deals.json "owner"): what each shows, how it is turned
OWNER_ALT = {
    'preroll-stand': 'A pre-roll with a kraft paper tip, standing at a slant',
    'preroll-flat': 'A pre-roll with a kraft paper tip, at a slant',
    'crumble': 'A piece of golden, crumbly cannabis concentrate',
    'budder-dish': 'Golden budder swirled in a small clear glass dish, seen from above',
}
ROTATE = {'preroll-flat': -58}      # degrees counter-clockwise: the flat pre-roll stands at a slant, leaning left
GLASS = {'eighths', 'premium', 'topshelf', 'budder', 'wax', 'crumbles', 'budders', 'shake', 'budder-dish'}


def main():
    import cv2
    jobs = json.load(open(JOBS))
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.webp'):
            os.remove(os.path.join(OUT, f))
    items = {}
    entries = [(did, 'ai', os.path.join(RAW, f'deal-{did}-r.png'), os.path.join(RAW, f'deal-{did}-cut.png'), job) for did, job in jobs['items'].items()]
    for did, job in (jobs.get('owner') or {}).get('items', {}).items():
        up = os.path.join(RAW, f'owner-{did}-up.png')
        entries.append((did, 'owner', up if os.path.exists(up) else os.path.join(ROOT, job['source']), os.path.join(RAW, f'owner-{did}-cut.png'), job))
    for did, kind, photo_path, cut_path, job in entries:
        photo = np.asarray(Image.open(photo_path).convert('RGB'))
        rgba = np.asarray(Image.open(cut_path).convert('RGBA')).copy()
        if rgba.shape[:2] != photo.shape[:2]:
            raise SystemExit(f'{did}: the cut-out {rgba.shape[:2]} does not match its photo {photo.shape[:2]}')
        H, W = rgba.shape[:2]
        # the backdrop colour (border ring median) and the see-through estimate it gives
        r = round(0.05 * min(H, W))
        ring = np.concatenate([photo[:r].reshape(-1, 3), photo[:, :r].reshape(-1, 3), photo[:, -r:].reshape(-1, 3)])
        global glass_alpha
        glass_alpha = see_through(photo, np.median(ring, axis=0).astype(np.uint8))
        # enclosed gaps: transparent areas the silhouette fully surrounds, filled from the render
        solid = (rgba[..., 3] > 127).astype(np.uint8)
        outside = (1 - solid).copy()
        cv2.floodFill(outside, np.zeros((H + 2, W + 2), np.uint8), (0, 0), 2)
        holes = cv2.morphologyEx((outside == 1).astype(np.uint8), cv2.MORPH_DILATE, np.ones((3, 3), np.uint8)).astype(bool) & (rgba[..., 3] < 250)
        rgba[holes, :3] = photo[holes]
        rgba[holes, 3] = np.maximum(rgba[holes, 3], glass_alpha[holes])
        # rebuilt walls, per object
        restored = 0
        mode = REPAIR.get(did)
        if mode:
            solid = (rgba[..., 3] > 127).astype(np.uint8)
            n, lbl, stats, _ = cv2.connectedComponentsWithStats(solid)
            areas = stats[1:, cv2.CC_STAT_AREA]
            picks = [1 + int(np.argmax(areas))] if mode == 'largest' else [1 + k for k, a in enumerate(areas) if a >= 0.10 * areas.sum()]
            for k in picks:
                restored += repair_edges(rgba, photo, lbl == k)
        bg = np.median(ring, axis=0).astype(np.uint8)
        dish = dish_outline(rgba, photo) if did == 'budder-dish' else None
        trimmed = trim_backdrop(rgba, photo, bg) if did.startswith('preroll-') else 0
        keyed = (glass_key(rgba, photo, bg, core_mode='largest', d0=18, d1=46) if did == 'budder-dish'
                 else glass_key(rgba, photo, bg)) if did in GLASS else 0
        img = Image.fromarray(rgba)
        if did in ROTATE:
            img = img.rotate(ROTATE[did], resample=Image.BICUBIC, expand=True)
        alpha = np.asarray(img)[..., 3] / 255.0
        ys, xs = np.where(alpha > 0.04)
        pad = 8
        box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(img.width, xs.max() + pad + 1), min(img.height, ys.max() + pad + 1))
        crop = img.crop(box)
        cw, chh = crop.size
        if kind == 'ai':
            alt, st = ALT[did], 'trainedAlgorithmicMedia'
            desc = alt.replace('Illustration: ', 'AI illustration (' + jobs['model'] + ', background removed with fal BiRefNet v2): ')
        else:
            alt, st = OWNER_ALT[did], 'algorithmicallyEnhanced'
            desc = ('Product photo supplied by the owner (2026-11-09): ' + alt + '. Background removed with fal BiRefNet v2'
                    + ('; upscaled 2x with Topaz High Fidelity V2' if job.get('upscaleRequestId') else '')
                    + ('; clear glass made see-through' if did in GLASS else '') + '.')
        files = []
        for hh in HEIGHTS:
            ww = round(cw * hh / chh)
            fn = f'deal/{did}-{hh}.webp'
            crop.resize((ww, hh), Image.LANCZOS).save(os.path.join(ROOT, 'src', 'assets', 'img', fn), 'WEBP', quality=86, method=6, xmp=xmp(desc, st))
            files.append({'file': fn, 'w': ww, 'h': hh, 'bytes': os.path.getsize(os.path.join(ROOT, 'src', 'assets', 'img', fn))})
        items[did] = {'kind': kind, 'alt': alt, 'digitalSourceType': st, 'aspect': round(cw / chh, 4), 'files': files, 'holesFilled': int(holes.sum()),
                      'wallPixelsRestored': restored, 'glassPixelsKeyed': keyed, 'rotated': ROTATE.get(did, 0), 'floorPixelsTrimmed': trimmed, 'dish': dish,
                      'requestId': job.get('requestId'), 'cutoutRequestId': job.get('cutoutRequestId'), 'upscaleRequestId': job.get('upscaleRequestId'),
                      'source': (jobs['model'] if kind == 'ai' else job['source']), 'cutout': 'fal-ai/birefnet/v2 (General Use (Heavy), 2048)'}
        print(f'{did:13s} {kind:5s} {cw}x{chh} (w/h {cw / chh:.2f}) holes {int(holes.sum()):6d}  walls {restored:6d}  glass keyed {keyed:7d}  -> ' + ', '.join(f["file"] for f in files))
    json.dump({'note': 'Home deals band product images: AI illustrations of the product type, and product photos the owner supplied (tools/deal-renders.py).', 'items': items}, open(MANIFEST, 'w'), indent=1)
    print('wrote', os.path.relpath(MANIFEST, ROOT))


if __name__ == '__main__':
    main()
