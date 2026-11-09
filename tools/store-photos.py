#!/usr/bin/env python3
"""store-photos.py: the owner's store photos (2026-11-09), from phone shots to the site's pictures.

Sources (private, never published: two of them show the car and the customers):
  assets/source/store-photos/in/
    storefront-19.png  the storefront, shot from a car: dashboard, phone mount and a wiper streak in frame
    counter-16.png     the main counter: six identifiable people (customers and staff)
    wall-15.png        the green FLAVORS DETROIT letter wall (no people)
    merch-17.png       the merch counter with blue LED underglow (no people)

Steps (fal requests in between are logged in assets/source/store-photos/log.json):
  python3 -I tools/store-photos.py masks
      fill/<name>-in.png + fill/<name>-mask.png, padded to 1360x1024 (white = fill). The storefront mask
      is the dashboard, the phone mount and the wiper streak (traced in the pixels); the counter mask is
      the six people. Also fill/<name>-mask-check.png, the mask drawn over the photo for review.
  fal FLUX.1 [pro] Fill on each pair -> fill/<name>-out-<k>.png
  python3 -I tools/store-photos.py composite <name> <k>
      edit/<name>.png: the fill's pixels inside the (feathered) mask, the ORIGINAL pixels everywhere
      else, so the sign, the letters, the products and the building stay exactly as photographed.
  fal Topaz High Fidelity V2, 2x, face enhancement off -> up/<name>.png
      (edit/storefront.png, edit/counter.png, in/wall-15.png, in/merch-17.png)
  python3 -I tools/store-photos.py finish
      a cinematic grade (levels, a gentle filmic curve with highlight roll-off, cool shadows, vignette,
      fine grain: colour and tone only, no content change), each slot's crop, WebP widths into
      src/assets/img/store/ with IPTC XMP, and src/content/store-photos.json (alt text + provenance).
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BASE = os.path.join(ROOT, 'assets', 'source', 'store-photos')
IN, FILL, EDIT, UP = (os.path.join(BASE, d) for d in ('in', 'fill', 'edit', 'up'))
OUT = os.path.join(ROOT, 'src', 'assets', 'img', 'store')
MANIFEST = os.path.join(ROOT, 'src', 'content', 'store-photos.json')
LOG = os.path.join(BASE, 'log.json')
PAD = (1360, 1024)          # FLUX works in multiples of 16: pad the 1360x1020 photos by 4 rows

SOURCES = {'storefront': 'storefront-19.png', 'counter': 'counter-16.png', 'merch-72': 'merch-72.png (owner, 2026-11-09)', 'fresheners-73': 'fresheners-73.png (owner, 2026-11-09)'}

# ---- masks (coordinates in the 1360x1020 originals, traced on gridded crops) ---------------------
# storefront: everything below the dashboard's top edge, the phone mount included (its top ~y 760)
DASH = [(0, 766), (120, 770), (236, 776), (321, 766), (371, 758), (457, 744), (476, 750),
        (700, 750), (782, 754), (786, 840), (1240, 840), (1300, 802), (1360, 756), (1360, 1024), (0, 1024)]
# counter: the six people, each traced with a margin (left to right)
PEOPLE = [
    [(0, 450), (32, 446), (78, 456), (84, 500), (80, 544), (104, 548), (106, 574), (82, 582), (70, 626),
     (66, 692), (62, 772), (0, 772)],                                                       # white T-shirt, far left
    [(78, 442), (132, 442), (142, 468), (160, 498), (164, 562), (152, 578), (98, 578), (80, 562)],   # staff, left counter
    [(548, 436), (617, 436), (637, 482), (662, 498), (662, 562), (659, 666), (650, 702), (652, 788),
     (664, 798), (664, 836), (538, 836), (538, 790), (543, 700), (531, 600), (533, 498), (546, 478)],  # back to camera, middle
    [(623, 436), (674, 436), (682, 468), (702, 488), (717, 503), (727, 560), (724, 603), (660, 609),
     (626, 603), (626, 490)],                                                                # jersey, behind the middle counter
    [(960, 446), (1012, 446), (1017, 493), (1042, 503), (1044, 577), (1000, 584), (958, 580), (956, 500)],  # staff, right counter
    [(1268, 482), (1342, 482), (1360, 496), (1360, 934), (1248, 934), (1248, 880), (1253, 820),
     (1234, 730), (1223, 652), (1194, 647), (1194, 568), (1213, 538), (1263, 528)],          # black T-shirt, far right
]


def load(name):
    return Image.open(os.path.join(IN, SOURCES[name])).convert('RGB')


def pad(im):
    """1360x1020 -> 1360x1024 by repeating the last row (FLUX sizes are multiples of 16)."""
    out = Image.new('RGB', PAD)
    out.paste(im, (0, 0))
    last = im.crop((0, im.height - 1, im.width, im.height))
    for y in range(im.height, PAD[1]):
        out.paste(last, (0, y))
    return out


def trace_streak(im):
    """The wiper streak: a thin pale line from the left edge (~y 597) down to the phone mount
    (~545, 773). Per column, the brightest ridge near that line; a robust quadratic through them."""
    L = np.asarray(im.convert('L'), dtype=np.float32)
    pts = []
    for x in range(2, 548, 2):
        y0 = 597 + (773 - 597) * x / 545
        best = None
        for y in range(int(y0) - 26, int(y0) + 27):
            ridge = L[y, x] - 0.5 * (L[y - 10, x] + L[y + 10, x])
            if best is None or ridge > best[0]:
                best = (ridge, y)
        if best[0] > 10:
            pts.append((x, best[1]))
    xs, ys = np.array([p[0] for p in pts], float), np.array([p[1] for p in pts], float)
    keep = np.ones(len(xs), bool)
    for _ in range(4):
        c = np.polyfit(xs[keep], ys[keep], 2)
        res = np.abs(np.polyval(c, xs) - ys)
        keep = res < 4.5
    return c, int(keep.sum()), len(xs)


def build_mask(name, im):
    m = Image.new('L', PAD, 0)
    d = ImageDraw.Draw(m)
    info = {}
    if name == 'storefront':
        d.polygon(DASH, fill=255)
        c, used, seen = trace_streak(im)
        line = [(x, float(np.polyval(c, x))) for x in range(-4, 560, 4)]
        d.line(line, fill=255, width=20, joint='curve')
        info = {'streakFit': [round(v, 6) for v in c], 'streakPoints': f'{used} of {seen}'}
    else:
        for poly in PEOPLE:
            d.polygon(poly, fill=255)
    m = m.filter(ImageFilter.MaxFilter(9))          # +4 px all round
    return m, info


def cmd_masks():
    os.makedirs(FILL, exist_ok=True)
    for name in SOURCES:
        im = load(name)
        m, info = build_mask(name, im)
        pad(im).save(os.path.join(FILL, f'{name}-in.png'))
        m.save(os.path.join(FILL, f'{name}-mask.png'))
        over = im.copy()
        red = Image.new('RGB', im.size, (255, 0, 80))
        over = Image.composite(Image.blend(im, red, 0.55), im, m.crop((0, 0) + im.size))
        over.save(os.path.join(FILL, f'{name}-mask-check.png'))
        cover = (np.asarray(m.crop((0, 0) + im.size)) > 127).mean()
        print(name, 'mask covers', f'{cover:.1%}', 'of the photo', info)


def fix_storefront(edit, im):
    """Two review findings on the fill (2026-11-09), fixed without generating anything new:
    1. where the wiper streak crossed the small gas-station sign far left (x 55-140, y 592-648) the
       fill invented lettering: that box goes back to the photo, and only the thin streak line in
       it is removed by classical inpainting (OpenCV Telea), which can smear but never write;
    2. a yellow blob the fill put on the curb (x 885-962, y 832-855): classical inpainting here, which
       left a rectangular smudge, so `touchup storefront` then re-fills x 872-976, y 824-866 with
       Bria Eraser (fill/storefront-pass2-*.png). Order: composite storefront 1, touchup storefront."""
    import cv2
    o = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR)
    e = cv2.cvtColor(np.asarray(edit), cv2.COLOR_RGB2BGR)
    c, _, _ = trace_streak(im)
    line = np.zeros(o.shape[:2], np.uint8)
    pts = np.array([(x, round(float(np.polyval(c, x)))) for x in range(40, 160, 2)], np.int32)
    cv2.polylines(line, [pts], False, 255, thickness=11)
    fixed_sign = cv2.inpaint(o, line, 5, cv2.INPAINT_TELEA)
    box = np.zeros(o.shape[:2], np.float32)
    box[592:648, 55:140] = 1
    box = cv2.GaussianBlur(box, (0, 0), 2.5)[..., None]
    e = (fixed_sign * box + e * (1 - box)).astype(np.uint8)
    blob = np.zeros(o.shape[:2], np.uint8)
    blob[832:856, 884:963] = 255
    e = cv2.inpaint(e, blob, 6, cv2.INPAINT_TELEA)
    return Image.fromarray(cv2.cvtColor(e, cv2.COLOR_BGR2RGB))


def cmd_composite(name, k):
    im = load(name)
    out = Image.open(os.path.join(FILL, f'{name}-out-{k}.png')).convert('RGB')
    if out.size != PAD:
        out = out.resize(PAD, Image.LANCZOS)
    out = out.crop((0, 0) + im.size)
    m = Image.open(os.path.join(FILL, f'{name}-mask.png')).convert('L').crop((0, 0) + im.size)
    alpha = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(3))   # feather just outside
    edit = Image.composite(out, im, alpha)
    if name == 'storefront':
        edit = fix_storefront(edit, im)
    os.makedirs(EDIT, exist_ok=True)
    edit.save(os.path.join(EDIT, f'{name}.png'))
    a = np.asarray(alpha, np.float32) / 255
    diff = np.abs(np.asarray(out, np.float32) - np.asarray(im, np.float32)).mean(axis=2)
    outside = diff[a < 0.01]
    print(f'{name}: fill {k} composited; outside the mask the fill differed from the photo by '
          f'{outside.mean():.1f}/255 on average (those pixels are kept from the photo)')


# Fixes from the independent review (2026-11-09), applied to the 2x upscales (up/<name>.png) with
# Bria Eraser so nothing is re-upscaled. Boxes in 1360x1020 original coordinates (doubled for up/).
UPFIX = {
    'counter': [(918, 560, 1052, 626),   # remnant of the right staff member's forearm, below the first mask
                (88, 505, 140, 585),     # a dark post the second pass invented where the left staff member stood
                (552, 424, 688, 480),    # leftovers of a wall print hidden behind two people (blue smear, green panel)
                (972, 426, 1036, 482)],  # leftovers of the red-hat wall print behind the right staff member
    'merch-17': [(362, 350, 392, 425)],  # a dark upright shape with yellow feet, seen through the far door
}


def deveil_far_left():
    """The wiper streak over the small far-left signs (x 36-170), removed by SUBTRACTING its measured
    light (a ridge ~3 px wide, about +52/55/58 in R/G/B, measured on the plain grey wall at x 125-190)
    along the streak traced locally in this area; nothing is painted in. Near-white pixels the veil
    clipped take the mean of the two sides of the streak. Returns the corrected 1360x1020 photo."""
    o = np.asarray(load('storefront'), np.float32)
    H, W, _ = o.shape
    L = o.mean(axis=2)
    cg = np.array([-7.9e-05, 0.345192, 602.665003])
    pts = []
    for x in range(20, 201):
        y0 = np.polyval(cg, x)
        r = [(L[y, x] - 0.5 * (L[y - 6, x] + L[y + 6, x]), y) for y in range(int(y0) - 9, int(y0) + 10)]
        best = max(r)
        if best[0] > 8:
            pts.append((x, best[1]))
    xs, ys = np.array([p[0] for p in pts], float), np.array([p[1] for p in pts], float)
    keep = np.ones(len(xs), bool)
    for _ in range(5):
        cl = np.polyfit(xs[keep], ys[keep], 2)
        keep = np.abs(np.polyval(cl, xs) - ys) < 2.5
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dist = (yy - np.polyval(cl, xx)) / np.sqrt(1 + np.polyval(np.polyder(cl), xx) ** 2)
    D, R = [], []
    for x in range(125, 190):
        y0 = np.polyval(cl, x)
        yr = np.arange(int(y0) - 22, int(y0) + 23)
        d = (yr - y0) / np.sqrt(1 + np.polyval(np.polyder(cl), x) ** 2)
        col, bg = o[yr, x], np.abs(d) > 11
        A = np.vstack([d[bg], np.ones(bg.sum())]).T
        D.extend(d)
        R.append(np.stack([col[:, ch] - np.vstack([d, np.ones_like(d)]).T @ np.linalg.lstsq(A, col[bg, ch], rcond=None)[0]
                           for ch in range(3)], 1))
    D, R = np.array(D), np.concatenate(R)
    grid = np.arange(-12, 12.01, 0.5)
    prof = np.stack([np.array([R[(D >= g - .4) & (D < g + .4), ch].mean() for g in grid]) for ch in range(3)], 1)
    prof[np.abs(grid) >= 10] = 0
    prof = np.clip(prof, 0, None)
    out = o.copy()
    reg = (xx >= 36) & (xx <= 170) & (np.abs(dist) < 11.5)
    for ch in range(3):
        out[..., ch][reg] = o[..., ch][reg] - np.interp(dist[reg], grid, prof[:, ch])
    for y, x in zip(*np.where(reg & (o.max(axis=2) >= 246))):
        n = 1 / np.sqrt(1 + np.polyval(np.polyder(cl), x) ** 2)
        out[y, x] = (o[int(round(y - 9 / n)), x] + o[int(round(y + 9 / n)), x]) / 2
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def cmd_farleft():
    """Replace the far-left box of up/storefront.png (where the first fix left a smudge) with the
    de-veiled photo, 2x Lanczos + a light unsharp; the rest of the upscale is untouched."""
    base = Image.open(os.path.join(UP, 'storefront.pre-upfix.png')).convert('RGB')
    dv = deveil_far_left()
    dv.save(os.path.join(FILL, 'storefront-deveiled.png'))
    # the patch: the de-veiled photo's x 0-260, y 540-720, upscaled 2x by Topaz (same model as the rest)
    # so its texture matches; fill/storefront-farleft-crop-2x.png is that Topaz output
    patch = base.copy()
    patch.paste(Image.open(os.path.join(FILL, 'storefront-farleft-crop-2x.png')).convert('RGB').resize((520, 360), Image.LANCZOS), (0, 1080))
    m = Image.new('L', base.size, 0)
    ImageDraw.Draw(m).rectangle((50 * 2, 588 * 2, 142 * 2, 664 * 2), fill=255)
    alpha = m.filter(ImageFilter.GaussianBlur(6))
    Image.composite(patch, base, alpha).save(os.path.join(UP, 'storefront.png'))
    print('storefront: far-left box replaced with the de-veiled photo')


# ---- the golden-hour hero (owner, 2026-11-09: "make it look as if it was shot during the golden hour")
# fal Nano Banana Pro relit the storefront (relight/golden-b.png, 4800x3584). It kept the sign, the
# awning, OPEN and the flag, but garbled small text in three places. Those areas are put back from the
# photo itself: the photo is registered onto the relight (SIFT + RANSAC homography), each area takes
# the photo's pixels through a colour transform fitted on a ring of relit pixels around it (so it
# carries the same light), and is feathered in. Boxes in 1360x1020 photo coordinates.
# Relights tried (2 renders each): B repainted the black left wing tan and wrote mirrored lettering on
# the grey panel; D turned the blue tower pink-tan; C (used) kept the wing dark, the tower blue and the
# panel plain grey. C still garbled the hours poster in the second door and left faint ghost lettering
# on the panel; its far-left street signs are garbled too.
# method 'affine': the photo's pixels through one robust colour transform fitted on a ring of relit
# pixels around the area. method 'clean': the relit panel face smoothed within its own outline
# (normalised convolution, so nothing bleeds in) with its fine grain kept: removes faint lettering,
# paints nothing new. Areas in 1360x1020 photo coordinates (boxes, or polygons for 'clean').
GOLDEN_SOURCE = 'golden-c.png'
GOLDEN_RESTORE = {
    'door poster': ('affine', [(800, 625, 935, 692)]),              # the hours poster in the second door (stops above the car roof)
    'angled panel': ('clean', [[(487, 584), (523, 500), (523, 577)],                 # left face, left of the pole
                               [(543, 489), (583, 477), (543, 566)]]),               # right face (up to the pole's edge)
}
# The far-left street signs the relight garbled cannot be put back from the photo: the relight redrew
# that part of the street with different geometry (tried 2026-11-09: the photo's signs and SUV landed
# in the wrong places). So they stay cropped out; the hero's extension to the left is made separately
# (cmd_golden_wide).
GOLDEN_CROP_X0 = 0.12          # hero file starts here (fraction of the width): drops the far-left signs


def cmd_golden():
    import cv2
    rel = cv2.imread(os.path.join(BASE, 'relight', GOLDEN_SOURCE), cv2.IMREAD_COLOR)
    tru = cv2.imread(os.path.join(UP, 'storefront.png'), cv2.IMREAD_COLOR)          # 2720x2040, = 2x photo
    Hr, Wr = rel.shape[:2]
    def prep(im, w):
        g = cv2.cvtColor(cv2.resize(im, (w, round(im.shape[0] * w / im.shape[1])), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
        return cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8)).apply(g)
    W0 = 1600
    a, b = prep(tru, W0), prep(rel, W0)
    sift = cv2.SIFT_create(nfeatures=12000)
    ka, da = sift.detectAndCompute(a, None)
    kb, db = sift.detectAndCompute(b, None)
    m = cv2.BFMatcher().knnMatch(da, db, k=2)
    good = [p[0] for p in m if len(p) == 2 and p[0].distance < 0.72 * p[1].distance]
    pa = np.float32([ka[g.queryIdx].pt for g in good]); pb = np.float32([kb[g.trainIdx].pt for g in good])
    Hm, inl = cv2.findHomography(pa, pb, cv2.RANSAC, 2.0)
    n_in = int(inl.sum())
    err = np.linalg.norm(cv2.perspectiveTransform(pa[inl.ravel() == 1][None], Hm)[0] - pb[inl.ravel() == 1], axis=1)
    print(f'registration: {len(good)} matches, {n_in} inliers, median error {np.median(err):.2f} px at {W0} px wide')
    # full-resolution transform: truth (2720) -> relight (4800)
    s_t, s_r = W0 / tru.shape[1], W0 / Wr
    S_t = np.diag([s_t, s_t, 1.0]); S_r_inv = np.diag([1 / s_r, 1 / s_r, 1.0])
    Hfull = S_r_inv @ Hm @ S_t
    warped = cv2.warpPerspective(tru, Hfull, (Wr, Hr), flags=cv2.INTER_LANCZOS4)
    out = rel.astype(np.float32).copy()
    report = {}
    valid = cv2.warpPerspective(np.full(tru.shape[:2], 255, np.uint8), Hfull, (Wr, Hr)) > 0
    for name, (method, shapes) in GOLDEN_RESTORE.items():
        if method == 'clean':                                           # smooth each face within its outline
            for poly in shapes:
                q = cv2.perspectiveTransform((np.float32(poly) * 2)[None], Hfull)[0].astype(np.int32)
                fm = np.zeros((Hr, Wr), np.uint8)
                cv2.fillPoly(fm, [q], 255)
                core = cv2.erode(fm, np.ones((9, 9), np.uint8)).astype(np.float32) / 255
                w = fm.astype(np.float32) / 255
                den = cv2.GaussianBlur(w, (0, 0), 26) + 1e-6
                src = out.copy()
                for ch in range(3):
                    smooth = cv2.GaussianBlur(src[..., ch] * w, (0, 0), 26) / den
                    grain = 0.35 * (src[..., ch] - cv2.GaussianBlur(src[..., ch], (0, 0), 0.7))   # pixel-level grain only: wider detail would bring the letters' outlines back
                    clean = smooth + grain
                    a = cv2.GaussianBlur(core, (0, 0), 3)
                    out[..., ch] = clean * a + src[..., ch] * (1 - a)
            report[name] = f'{len(shapes)} face(s) smoothed within their outlines'
            continue
        mask = np.zeros((Hr, Wr), np.uint8)
        for x0, y0, x1, y1 in shapes:
            poly = np.float32([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) * 2          # photo -> truth coords
            q = cv2.perspectiveTransform(poly[None], Hfull)[0].astype(np.int32)
            cv2.fillPoly(mask, [q], 255)
        ring = cv2.dilate(mask, np.ones((91, 91), np.uint8)) & ~cv2.dilate(mask, np.ones((15, 15), np.uint8))
        sel = (ring > 0) & valid
        inside = (mask > 0) & valid
        W32 = warped.astype(np.float32); R32 = rel.astype(np.float32)
        if method == 'affine':
            X = W32[sel]; Y = R32[sel]
            Xa = np.hstack([X, np.ones((len(X), 1), np.float32)])
            keep = np.ones(len(X), bool)
            for _ in range(4):                                          # robust affine colour fit
                M, *_ = np.linalg.lstsq(Xa[keep], Y[keep], rcond=None)
                r = np.abs(Xa @ M - Y).sum(axis=1)
                keep = r < np.percentile(r, 70)
            mapped = np.clip(np.hstack([W32[inside], np.ones((inside.sum(), 1), np.float32)]) @ M, 0, 255)
            report[name] = f'affine, ring residual {float(np.median(r[keep])):.1f}'
        else:                                                           # smooth per-channel gain field
            wgt = sel.astype(np.float32)
            sig = 38
            den = cv2.GaussianBlur(wgt, (0, 0), sig) + 1e-6
            gains = []
            for ch in range(3):
                num_r = cv2.GaussianBlur(R32[..., ch] * wgt, (0, 0), sig) / den
                num_t = cv2.GaussianBlur(W32[..., ch] * wgt, (0, 0), sig) / den
                gains.append(np.clip((num_r + 4) / (num_t + 4), 0.35, 2.6))
            G = np.stack(gains, -1)
            mapped = np.clip(W32[inside] * G[inside], 0, 255)
            report[name] = 'gain field, median gain ' + str(np.round(np.median(G[inside], axis=0), 2).tolist())
        layer = out.copy(); layer[inside] = mapped
        alpha = cv2.GaussianBlur((mask > 0).astype(np.float32), (0, 0), 7)[..., None] * valid[..., None]
        out = layer * alpha + out * (1 - alpha)
    print('restored:', report)
    x0 = round(GOLDEN_CROP_X0 * Wr)
    cv2.imwrite(os.path.join(BASE, 'relight', 'golden-master.png'), np.clip(out[:, x0:], 0, 255).astype(np.uint8))
    print('wrote relight/golden-master.png', Wr - x0, 'x', Hr, f'(cropped from x {x0}: the far-left street signs are not in it)')


# ---- the hero extended to the left (owner, 2026-11-09: "extend the image to the left, and make it
# darker and black & white smoothly as it goes to left so that hero text will remain easily readable")
# The relit frame is 1.18:1; to run behind the headline it needs ~2.4:1. The street to the LEFT of the
# frame is extended with AI (fal FLUX.1 [pro] Fill outpainting at 1024px high, no text, no people);
# the real frame is kept pixel for pixel on the right. On the page that left part sits under the words
# in black and white and dark (CSS), and the file is labelled "Edited using Generative AI".
WIDE_H, WIDE_W = 1024, 2432            # outpaint canvas (2.375:1); the frame sits at its right edge
WIDE_OVERLAP = 40                      # px (at 1024 high) the fill may repaint over the frame's left edge
# signs the outpainting invented with pseudo-lettering: their faces are smoothed within their own box
# (they stay as blank signs; no letters remain). Boxes in the wide master (8512x3584), from review.
WIDE_CLEAN = [(4018, 2045, 4140, 2258),     # tall brown sign
              (3730, 2240, 3797, 2357),     # small sign beside it (its lettered face only, below its roof)
              (2134, 2140, 2238, 2272),     # road sign on a post
              (1180, 2330, 1318, 2376)]     # lettering on a building wall


def cmd_wide_prep():
    m = Image.open(os.path.join(BASE, 'relight', 'golden-master.png')).convert('RGB')
    fw = round(m.width * WIDE_H / m.height)
    small = m.resize((fw, WIDE_H), Image.LANCZOS)
    pad = WIDE_W - fw
    canvas = Image.new('RGB', (WIDE_W, WIDE_H))
    # context for the fill: the frame's left third, mirrored and heavily blurred (sky, road, light)
    ctx = small.crop((0, 0, min(fw, pad), WIDE_H)).transpose(Image.FLIP_LEFT_RIGHT).resize((pad, WIDE_H), Image.LANCZOS)
    canvas.paste(ctx.filter(ImageFilter.GaussianBlur(28)), (0, 0))
    canvas.paste(small, (pad, 0))
    mask = Image.new('L', (WIDE_W, WIDE_H), 0)
    ImageDraw.Draw(mask).rectangle((0, 0, pad + WIDE_OVERLAP, WIDE_H), fill=255)
    canvas.save(os.path.join(FILL, 'hero-wide-in.png'))
    mask.save(os.path.join(FILL, 'hero-wide-mask.png'))
    print(f'hero-wide canvas {WIDE_W}x{WIDE_H}: frame {fw}px at the right, {pad}px to fill (+{WIDE_OVERLAP}px overlap)')


def cmd_wide(k):
    """Compose the wide master: the fill's left part (Topaz 2x if fill/hero-wide-left-2x.png exists),
    scaled to the master's height, then the real master on the right, feathered over the overlap."""
    m = Image.open(os.path.join(BASE, 'relight', 'golden-master.png')).convert('RGB')
    H = m.height
    s = H / WIDE_H
    out = Image.open(os.path.join(FILL, f'hero-wide-out-{k}.png')).convert('RGB')
    if out.size != (WIDE_W, WIDE_H):
        out = out.resize((WIDE_W, WIDE_H), Image.LANCZOS)
    fw = round(m.width * WIDE_H / m.height)
    pad = WIDE_W - fw
    left_w = pad + WIDE_OVERLAP
    up2 = os.path.join(FILL, 'hero-wide-left-2x.png')
    left = Image.open(up2).convert('RGB') if os.path.exists(up2) else out.crop((0, 0, left_w, WIDE_H))
    x0 = round(pad * s)                                  # where the real frame starts in the wide master
    left = left.resize((round(left_w * s), H), Image.LANCZOS)
    wide = Image.new('RGB', (x0 + m.width, H))
    wide.paste(left, (0, 0))
    ov = round(WIDE_OVERLAP * s)
    ramp = np.clip((np.arange(m.width) - 0) / max(ov, 1), 0, 1)[None, :].repeat(H, 0)
    alpha = Image.fromarray((ramp * 255).astype(np.uint8))
    under = wide.crop((x0, 0, x0 + m.width, H))
    wide.paste(Image.composite(m, under, alpha), (x0, 0))
    import cv2
    a = np.asarray(wide).astype(np.float32)
    for bx0, by0, bx1, by1 in WIDE_CLEAN:
        reg = a[by0:by1, bx0:bx1]
        sig = max(4.0, min(bx1 - bx0, by1 - by0) / 2.5)
        smooth = cv2.GaussianBlur(reg, (0, 0), sig)
        h, w_ = reg.shape[:2]
        feather = np.ones((h, w_), np.float32)
        f = 6
        ramp_x = np.clip(np.minimum(np.arange(w_), np.arange(w_)[::-1]) / f, 0, 1)
        ramp_y = np.clip(np.minimum(np.arange(h), np.arange(h)[::-1]) / f, 0, 1)
        feather = (ramp_y[:, None] * ramp_x[None, :])[..., None]
        a[by0:by1, bx0:bx1] = smooth * feather + reg * (1 - feather)
    wide = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    wide.save(os.path.join(BASE, 'relight', 'golden-wide.png'))
    print(f'cleaned {len(WIDE_CLEAN)} invented sign faces')
    print(f'wrote relight/golden-wide.png {wide.width}x{wide.height} (real frame from x {x0}, {wide.width / H:.3f}:1)')


def cmd_merchdoor():
    """The dark upright shape with yellow feet seen through the far door (possibly someone's legs):
    removed by classical inpainting (OpenCV Telea) on a tight mask of its dark pixels, at 2x, so the
    bright, blurred view through the glass closes over it; nothing new is drawn. (A Bria Eraser pass
    left a pale blob with a dark spot near the top and was not used.)"""
    import cv2
    base = Image.open(os.path.join(UP, 'merch-17.pre-upfix.png')).convert('RGB')
    a = np.asarray(base)
    x0, y0, x1, y1 = 362 * 2, 350 * 2, 392 * 2, 425 * 2
    sub = a[y0:y1, x0:x1].astype(np.float32)
    lum = sub.mean(axis=2)
    yellow = (sub[..., 0] > 150) & (sub[..., 1] > 150) & (sub[..., 2] < 120)
    dark = lum < 150
    m = np.zeros(a.shape[:2], np.uint8)
    m[y0:y1, x0:x1] = ((dark | yellow) * 255).astype(np.uint8)
    m = cv2.dilate(m, np.ones((9, 9), np.uint8))
    fixed = cv2.inpaint(cv2.cvtColor(a, cv2.COLOR_RGB2BGR), m, 9, cv2.INPAINT_TELEA)
    Image.fromarray(cv2.cvtColor(fixed, cv2.COLOR_BGR2RGB)).save(os.path.join(UP, 'merch-17.png'))
    print('merch-17: door shape inpainted,', int((m > 0).sum()), 'px')


def cmd_upfix_masks():
    for name, boxes in UPFIX.items():
        up = Image.open(os.path.join(UP, f'{name}.png')).convert('RGB')
        m = Image.new('L', up.size, 0)
        d = ImageDraw.Draw(m)
        for x0, y0, x1, y1 in boxes:
            d.rectangle((x0 * 2, y0 * 2, x1 * 2, y1 * 2), fill=255)
        m.save(os.path.join(FILL, f'{name}-upfix-mask.png'))
        print(name, up.size, len(boxes), 'box(es)')
    # the storefront: the thin wiper-streak line still visible over the small far-left sign
    up = Image.open(os.path.join(UP, 'storefront.png')).convert('RGB')
    c, _, _ = trace_streak(load('storefront'))
    m = Image.new('L', up.size, 0)
    ImageDraw.Draw(m).line([(x * 2, float(np.polyval(c, x)) * 2) for x in range(36, 178, 2)], fill=255, width=26)
    m.save(os.path.join(FILL, 'storefront-upfix-mask.png'))
    print('storefront', up.size, 'streak line x 36-178')


def cmd_upfix(name):
    """Composite fill/<name>-upfix-out.png (Bria Eraser on up/<name>.png) inside its mask."""
    base = Image.open(os.path.join(UP, f'{name}.png')).convert('RGB')
    out = Image.open(os.path.join(FILL, f'{name}-upfix-out.png')).convert('RGB').resize(base.size, Image.LANCZOS)
    m = Image.open(os.path.join(FILL, f'{name}-upfix-mask.png')).convert('L')
    alpha = m.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(4))
    Image.composite(out, base, alpha).save(os.path.join(UP, f'{name}.png'))
    print(f'{name}: review fixes composited into the upscale')


def cmd_touchup(name):
    """A second eraser pass on a small area of a composite (counter, 2026-11-09: the register screen
    and the erased staff member merged into an odd shape at the far left, x 0-130, y 500-580).
    Inputs: fill/<name>-pass2-in.png (the composite), -pass2-mask.png, -pass2-out.png (Bria Eraser)."""
    base = Image.open(os.path.join(EDIT, f'{name}.png')).convert('RGB')
    out = Image.open(os.path.join(FILL, f'{name}-pass2-out.png')).convert('RGB').resize(base.size, Image.LANCZOS)
    m = Image.open(os.path.join(FILL, f'{name}-pass2-mask.png')).convert('L')
    alpha = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(3))
    Image.composite(out, base, alpha).save(os.path.join(EDIT, f'{name}.png'))
    print(f'{name}: second pass composited inside its mask')


# ---- the grade: colour and tone only ---------------------------------------------------------------
def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def cinematic(im, seed, clarity=0.42, vignette=0.28, grain=0.0035):
    """Colour and tone only (no pixel is moved, added or removed): levels, local contrast (a large-
    radius 'clarity' pass on luminance, which reads as dehaze/depth), a filmic S-curve with highlight
    roll-off, navy-leaning shadows and cool whites, a vignette and fine grain."""
    import cv2
    W3 = np.array([0.2126, 0.7152, 0.0722], np.float32)
    a = np.asarray(im, np.float32) / 255.0
    lum = a @ W3
    lo, hi = np.percentile(lum, 0.8), np.percentile(lum, 99.6)
    a = np.clip((a - lo) / max(hi - lo, 1e-3), 0, 1)                    # levels on luminance (no hue shift)
    lum = a @ W3
    h, w = lum.shape
    # edge-aware base (bilateral at quarter size): local contrast without halos round the sign and poles
    small = cv2.resize(lum, (w // 4, h // 4), interpolation=cv2.INTER_AREA)
    base = cv2.resize(cv2.bilateralFilter(small, 0, 0.1, 0.006 * max(h, w)), (w, h), interpolation=cv2.INTER_LINEAR)
    a = np.clip(a + (clarity * (lum - base))[..., None], 0, 1)           # local contrast, same in R, G and B
    a = 0.006 + 0.994 * a
    s = a * a * (3 - 2 * a)
    a = 0.56 * a + 0.44 * s                                               # filmic S
    a = np.where(a > 0.82, 0.82 + (a - 0.82) * 0.7, a)                   # highlight roll-off (lights never clip hard)
    lum = a @ W3
    a = a + ((1 - lum) ** 2.2)[..., None] * np.array([-0.020, -0.006, 0.034], np.float32)   # shadows lean navy
    a = a + (lum ** 2)[..., None] * np.array([-0.006, 0.0, 0.006], np.float32)              # cool white highlights
    lum = a @ W3
    sat = (1.04 - 0.24 * lum ** 4)[..., None]
    a = lum[..., None] + (a - lum[..., None]) * sat
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2) / np.sqrt(2) * 1.25
    a = a * (1 - vignette * smoothstep(0.5, 1.2, r))[..., None]
    rng = np.random.default_rng(seed)
    a = a + rng.normal(0, grain, (h, w, 1)).astype(np.float32)
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def vivid(im, vib=0.7, sat=1.34, warm=0.05, cool=0.05, punch=0.14):
    """The hero's colour grade (owner, 2026-11-09: "make colors of the background on the right side of
    the hero more colorful and vivid"). Colour and tone only, no pixel moved, added or removed:
    saturation up, most where colour is faint (vibrance: the grey walls and the evening sky gain colour,
    the already-strong yellows and blue do not clip), warmer highlights and bluer shadows (the golden
    light against the store's blue), and a gentle S-curve for depth. Brightness is kept per pixel, so the
    black-and-white copy behind the words barely changes."""
    W3 = np.array([0.2126, 0.7152, 0.0722], np.float32)
    a = np.asarray(im, np.float32) / 255.0
    lum = a @ W3
    s = (a.max(-1) - a.min(-1)) / np.maximum(a.max(-1), 1e-4)
    f = sat + vib * (1 - np.clip(s / 0.55, 0, 1)) ** 1.5
    a = lum[..., None] + (a - lum[..., None]) * f[..., None]
    a = a + (lum ** 2)[..., None] * np.array([warm, warm * 0.35, -warm], np.float32)
    a = a + ((1 - lum) ** 2.5)[..., None] * np.array([-cool * 0.6, -cool * 0.1, cool], np.float32)
    a = np.clip(a, 0, 1)
    a = a + punch * (a * a * (3 - 2 * a) - a)
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def cine(im, seed=7):
    """The store gallery's film look (owner, 2026-11-09: "make all images look more cinematic"), on top of
    each photo's own grade. Colour and tone only, nothing moved, added or removed: a soft bloom round the
    lights, a deeper filmic curve with a gently lifted black (a matte toe), navy shadows and warm cream
    highlights (never gold), slightly quieter mid colour, a stronger vignette and fine grain."""
    import cv2
    W3 = np.array([0.2126, 0.7152, 0.0722], np.float32)
    a = np.asarray(im, np.float32) / 255.0
    h, w = a.shape[:2]
    # bloom: the brightest parts, blurred wide, added back softly
    lum = a @ W3
    hi = np.clip((lum - 0.72) / 0.28, 0, 1)[..., None] * a
    k = max(3, int(0.012 * max(h, w)) | 1)
    a = a + 0.22 * cv2.GaussianBlur(hi, (0, 0), k)
    # filmic curve: S-curve with a lifted toe and a rolled shoulder
    a = np.clip(a, 0, 1.2)
    s = a * a * (3 - 2 * np.clip(a, 0, 1))
    a = 0.45 * a + 0.55 * s
    a = np.clip(0.035 + 0.94 * a, 0, 1)                                     # matte black, never pure 0; and no value
    lum = a @ W3                                                            # over 1 (the bloom), or (1 - lum) ** x is NaN
    # split tone: navy shadows, warm cream highlights
    a = a + ((1 - lum) ** 2.4)[..., None] * np.array([-0.028, -0.004, 0.05], np.float32)
    a = a + (lum ** 2.2)[..., None] * np.array([0.03, 0.016, -0.012], np.float32)
    lum = a @ W3
    a = lum[..., None] + (a - lum[..., None]) * 0.9                         # quieter mid colour
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2) / np.sqrt(2) * 1.3
    a = a * (1 - 0.42 * smoothstep(0.42, 1.15, r))[..., None]
    rng = np.random.default_rng(seed)
    a = a + rng.normal(0, 0.006, (h, w, 1)).astype(np.float32)
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


# slot -> (master, crop box as fractions of the master, widths, quality, alt)
SLOTS = {
    'storefront': dict(src='storefront', box=(0, 0, 1, 0.9167), widths=[800, 1200, 1600], q=78,
        alt='The Flavors Detroit store in daylight: a black cloud-shaped sign reading '
            'Flavors Detroit 5700 on a blue corrugated tower above a dark grey building, its black awning '
            'reading Flavors Detroit and Recreational Cannabis, a lit Open sign and a Cannabis feather flag '
            'with a green cross, with traffic lights hanging over the street.'),
    # /visit/ wayfinding photos (sign, front, merch): owner, 2026-11-09: "turn these images to look cinematic",
    # then "I want them have a golden hour lighting to make it more dramatic". sign + front are cropped from the
    # approved golden-hour master (the hero's AI relight, real signage restored), boxes found by registering the
    # old storefront crops onto it (SIFT homography, 270 inliers, median error 0.45 px at 1600 wide), with the
    # hero's grade (vivid + cine). Labelled edited: the relight is AI.
    'sign': dict(src='golden', grade='vivid+cine', box=(0.1818, 0.0, 0.6657, 0.4264), widths=[600, 900, 1160], q=80,
        alt='The Flavors Detroit sign at golden hour: a black cloud outlined in bulbs, reading Flavors '
            'Detroit with 5700 below, on a tall blue corrugated tower lit by low warm sun, behind a utility pole and wires.'),
    'front': dict(src='golden', grade='vivid+cine', box=(0.1403, 0.3226, 0.7994, 0.9073), widths=[600, 900, 1200, 1580], q=80,
        alt='The front of Flavors Detroit at golden hour: a dark grey building under the blue tower, a black awning reading '
            'Flavors Detroit and Recreational Cannabis, a lit Open sign in the window, a parked silver car and '
            'a black Cannabis feather flag with a green cross, with long warm shadows across the street.'),
    'counter': dict(src='counter', box=(0.03125, 0, 0.96875, 1), widths=[800, 1200, 1600, 2400], q=78,
        alt='Inside Flavors Detroit: the main sales counter under bright ceiling lights, with white glass '
            'display cases, blue Flavors Detroit letters on the back wall, screens above and walls of '
            'packaged products on both sides, over blue floor mats.'),
    'merch': dict(src='golden-merch', grade='cine', box=(0, 0, 1, 1), widths=[600, 900, 1200, 1600], q=78,
        alt='The merch corner at Flavors Detroit in warm late-afternoon light: sun streaming through the front door and '
            'windows across the floor mats and a long dark counter edged with blue LED light, piled with folded T-shirts '
            'and hoodies, caps and glass pieces on shelves, under hanging cage pendant lights and a blue wall with menu screens.'),
    # the home hero (owner, 2026-11-09): the storefront relit to golden hour, see cmd_golden, with the
    # vivid() grade (the owner asked for more colourful, vivid colour on the hero's colour side).
    # Always the whole frame, a wide shot (owner: "too zoomed in, should look like a wide shot").
    # 'hero' = the real frame, for phones (across the top of the hero);
    # 'hero-wide' = the frame with the street extended to the left, for wider screens (behind the words)
    'hero-wide': dict(src='golden-wide', grade='vivid', box=(0, 0, 1, 1), widths=[1400, 2000, 2800, 3600], q=66,
        alt='The Flavors Detroit store at golden hour at the right of a wide street view (the street to the left '
            'is an AI extension): the black cloud-shaped sign reading Flavors Detroit 5700 on its blue tower, the '
            'dark building with its black awning, a lit Open sign and a Cannabis feather flag.'),
    'hero': dict(src='golden', grade='vivid', box=(0, 0, 1, 1), widths=[800, 1280], q=70,
        alt='The Flavors Detroit store at golden hour: the black cloud-shaped sign reading Flavors Detroit 5700 '
            'on its blue corrugated tower, the dark building with its black awning reading Flavors Detroit and '
            'Recreational Cannabis, a lit Open sign and a Cannabis feather flag, under a warm evening sky.'),
    'wall': dict(src='wall-15', box=(0, 0, 1, 1), widths=[400, 600, 900, 1200], q=80,
        alt='A wall at Flavors Detroit with large lit green letters reading Flavors Detroit above shelves '
            'and racks of packaged products, with screens above, one showing strain art.'),
    # the home visit band (owner, 2026-11-09: "ensure we are using the improved version of the storefront
    # image"): the golden-hour storefront, as in the hero, in full
    'store-golden': dict(src='golden', grade='vivid', box=(0, 0, 1, 1), widths=[800, 1200, 1600], q=74,
        alt='The Flavors Detroit store at golden hour: the black cloud-shaped sign reading Flavors Detroit 5700 '
            'on its blue corrugated tower, the dark building with its black awning reading Flavors Detroit and '
            'Recreational Cannabis, a lit Open sign and a Cannabis feather flag, under a warm evening sky.'),
    # the store gallery in "who are we" (owner, 2026-11-09: the concave wall, "make all images look more
    # cinematic"): every panel 5:4, with the cine() film look on top of the photo's own grade
    'gal-counter': dict(src='counter', grade='cine', box=(0.03125, 0, 0.96875, 1), widths=[480, 800, 1200], q=78,
        alt='Inside Flavors Detroit: the main sales counter under bright ceiling lights, with glass display '
            'cases, blue Flavors Detroit letters on the back wall, screens above and walls of packaged products '
            'on both sides.'),
    'gal-wall': dict(src='wall-15', grade='cine', box=(0, 0.15, 1, 0.75), widths=[480, 800, 1200], q=78,
        alt='Large lit green letters reading Flavors Detroit on a striped wall, under screens, above shelves '
            'of packaged products.'),
    'gal-merch': dict(src='merch-72', grade='cine', box=(0, 0.14, 1, 0.74), widths=[480, 800, 1200], q=78,
        alt='Flavors Detroit merch: beanies on mannequin heads above glass shelves of black logo hoodies and '
            'tie-dye hoodies, with bright tank tops laid out on the counter in front.'),
    'gal-clouds': dict(src='fresheners-73', grade='cine', box=(0, 0.10, 1, 0.55), widths=[480, 800, 1148], q=78,
        alt='Rows of cloud-shaped Flavors Detroit logo pieces in red, pink and white hanging on a wire wall.'),
    'gal-led': dict(src='merch-17', grade='cine', box=(0.03125, 0, 0.96875, 1), widths=[480, 800, 1200], q=78,
        alt='The merch corner at Flavors Detroit: a long dark counter edged with blue LED light, piled with '
            'folded T-shirts and hoodies, caps on mannequin heads and glass pieces on shelves.'),
    'gal-store': dict(src='golden', grade='vivid+cine', box=(0, 0, 1, 0.9428), widths=[480, 800, 1200], q=78,
        alt='The Flavors Detroit store at golden hour: the black cloud-shaped sign on its blue tower above the '
            'dark building and its black awning.'),
}
EDITED = {'storefront': 'The car dashboard, phone mount and a wiper streak in the original phone photo were '
                        'removed and the street below filled in with AI (fal FLUX.1 [pro] Fill inside a mask; '
                        'a curb spot and the streak over a small far-left sign re-filled with fal Bria Eraser); '
                        'every other pixel is the photo. Upscaled 2x (Topaz High Fidelity V2) and colour graded.',
          'counter': 'The six customers and staff in the original photo were erased with AI (fal Bria Eraser) '
                     'for their privacy and the counter behind them filled in, with three follow-up eraser '
                     'passes (a far-left spot, a forearm remnant, two wall prints that had been hidden behind '
                     'people); every other pixel is the photo. Upscaled 2x (Topaz High Fidelity V2) and colour '
                     'graded.',
          'golden': 'The storefront photo (car dashboard removed as above) relit to golden hour with AI (fal Nano '
                    'Banana Pro). The hours poster in the second door was put back from the photo, faint lettering '
                    'the relight left on a plain grey panel was smoothed out, and the far-left street signs it '
                    'garbled are cropped out. Colour graded for richer colour (more saturated, warmer highlights, '
                    'bluer shadows).',
          'golden-merch': 'The owner\'s merch-corner photo, upscaled 2x (Topaz High Fidelity V2), relit to golden hour with AI '
                          '(fal Nano Banana Pro edit); the two menu screens and the ATM sign were put back from the photo. '
                          'Colour graded.',
          'golden-wide': 'The golden-hour storefront (relit with AI, as for the hero) with the street to its left '
                         'extended by AI (fal FLUX.1 [pro] Fill outpainting) so the photo can run behind the '
                         'headline; the real frame is kept on the right, nothing in it moved, added or removed. '
                         'Colour graded for richer colour (more saturated, warmer highlights, bluer shadows).'}
IPTC = {True: 'compositeWithTrainedAlgorithmicMedia', False: 'algorithmicallyEnhanced'}


def xmp(desc, source_type):
    return ('<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>'
            '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
            '<rdf:Description rdf:about="" xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" '
            'xmlns:dc="http://purl.org/dc/elements/1.1/" '
            f'Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/{source_type}">'
            f'<dc:description><rdf:Alt><rdf:li xml:lang="x-default">{desc}</rdf:li></rdf:Alt></dc:description>'
            '</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>').encode('utf-8')


def cmd_finish():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.webp'):
            os.remove(os.path.join(OUT, f))
    log = json.load(open(LOG)) if os.path.exists(LOG) else {}
    masters = {}
    for i, src in enumerate(['storefront', 'counter', 'merch-17', 'wall-15', 'merch-72', 'fresheners-73']):
        up = Image.open(os.path.join(UP, f'{src}.png')).convert('RGB')
        masters[src] = cinematic(up, seed=11 + i)
    masters['golden'] = Image.open(os.path.join(BASE, 'relight', 'golden-master.png')).convert('RGB')
    masters['golden-wide'] = Image.open(os.path.join(BASE, 'relight', 'golden-wide.png')).convert('RGB')
    # /visit/ 'Step inside' at golden hour (owner, 2026-11-09): AI relight of merch-17, the menu screens and the ATM sign
    # put back from the photo (relight/merch/merch-gold-restore.json)
    masters['golden-merch'] = Image.open(os.path.join(BASE, 'relight', 'merch', 'merch-gold-a-restored.png')).convert('RGB')
    items = {}
    graded = {}
    for slot, spec in SLOTS.items():
        m = masters[spec['src']]
        gr = spec.get('grade', '')
        if gr:
            key = spec['src'] + '|' + gr
            if key not in graded:
                g = m
                for step in gr.split('+'):
                    g = vivid(g) if step == 'vivid' else cine(g) if step == 'cine' else g
                graded[key] = g
            m = graded[key]
        W, H = m.size
        x0, y0, x1, y1 = spec['box']
        crop = m.crop((round(x0 * W), round(y0 * H), round(x1 * W), round(y1 * H)))
        edited = spec.get('edited', spec['src'] in EDITED)
        st = IPTC[edited]
        note = EDITED[spec['src']] if edited else ('The owner\'s photo, upscaled 2x (Topaz High Fidelity V2) and colour graded'
                                                    + (' (the AI retouching elsewhere in this photo is outside this crop).' if spec['src'] in EDITED else '.'))
        packet = xmp('Flavors Detroit store photo. ' + note.replace('&', 'and'), st)
        files = []
        variants = [('landscape', crop, spec['widths'], '')]
        if spec.get('portrait'):
            px0, py0, px1, py1 = spec['portrait']['crop']
            variants.append(('portrait', m.crop((round(px0 * W), round(py0 * H), round(px1 * W), round(py1 * H))), spec['portrait']['widths'], '-p'))
        for variant, img, widths, tag in variants:
            for w in widths:
                if w > img.width:
                    continue
                h = round(img.height * w / img.width)
                out = img.resize((w, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=0.9, percent=55, threshold=2))
                fname = f'store/{slot}{tag}-{w}.webp'
                out.save(os.path.join(ROOT, 'src', 'assets', 'img', fname), 'WEBP', quality=spec['q'], method=6, xmp=packet)
                files.append({'file': fname, 'w': w, 'h': h, 'variant': variant,
                              'bytes': os.path.getsize(os.path.join(ROOT, 'src', 'assets', 'img', fname))})
        golden = spec['src'] in ('golden', 'golden-wide')
        src_name = SOURCES.get('storefront') if golden else SOURCES.get(spec['src'], spec['src'] + '.png')
        reqs = (log.get('storefront', []) + log.get('golden', []) + (log.get('golden-wide', []) if spec['src'] == 'golden-wide' else [])
                if golden else log.get(spec['src'], []))
        items[slot] = {'alt': spec['alt'], 'source': f"owner's photo ({src_name})",
                       'digitalSourceType': st, 'edit': note, 'crop': spec['box'], 'master': list(m.size),
                       'requests': reqs, 'files': files}
        print(slot, crop.size, [(f['variant'][0], f['w']) for f in files], st)
    json.dump({'note': "The owner's store photos (2026-11-09). Colour and tone graded; upscaled 2x with Topaz "
                       'High Fidelity V2. Three are retouched with AI (see edit), one of them (the hero) relit to '
                       'golden hour. The originals stay private: one shows customers.', 'items': items},
              open(MANIFEST, 'w'), indent=1)
    print('wrote', os.path.relpath(MANIFEST, ROOT))


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'masks':
        cmd_masks()
    elif cmd == 'composite':
        cmd_composite(sys.argv[2], sys.argv[3])
    elif cmd == 'touchup':
        cmd_touchup(sys.argv[2])
    elif cmd == 'upfix-masks':
        cmd_upfix_masks()
    elif cmd == 'upfix':
        cmd_upfix(sys.argv[2])
    elif cmd == 'farleft':
        cmd_farleft()
    elif cmd == 'golden':
        cmd_golden()
    elif cmd == 'wide-prep':
        cmd_wide_prep()
    elif cmd == 'wide':
        cmd_wide(sys.argv[2])
    elif cmd == 'merchdoor':
        cmd_merchdoor()
    elif cmd == 'finish':
        cmd_finish()
    else:
        print(__doc__)
        sys.exit(2)
