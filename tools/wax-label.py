#!/usr/bin/env python3
"""wax-label.py: the "Premium wax bucket" deal card's jar (owner, 2026-11-09: "This is how a wax bucket
looks like [a product photo the owner supplied] you may use this but replace branding with Flavors").

  in   assets/generated/raw/wax-bucket-blank.png      the owner's photo with its label made plain black
                                                       and the background white by AI (fal
                                                       nano-banana-pro/edit; the third-party brand's
                                                       artwork and words removed)
       assets/generated/raw/wax-bucket-blank-cut.png  its cut-out (fal Bria RMBG 2.0)
       assets/brand/flavors-logo-original.png         the client's own logo file, never redrawn
  out  assets/generated/raw/owner-waxbucket-up.png    the jar with the logo on its label
       assets/generated/raw/owner-waxbucket-cut.png   the same, cut out (tools/deal-renders.py takes it)

The logo is not drawn by AI (house rule: AI lettering comes back mangled): the real file is set on the
label as print on a cylinder, narrower toward the edges (screen x = centre + r sin(u / r) for a point u
along the label) and dimmed with the cylinder's light toward the sides, then softened a touch to match
the photo.

  python3 -I tools/wax-label.py
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW = os.path.join(ROOT, 'assets', 'generated', 'raw')


def label_box(photo, alpha):
    """The label band: the lower of the two dark runs down the jar's centre line (the upper one is the
    lid; a clear glass gap lies between), and its left and right edges along its middle row."""
    import cv2
    L = cv2.cvtColor(photo, cv2.COLOR_RGB2LAB)[..., 0].astype(np.float32)
    ys, xs = np.where(alpha > 127)
    cx = int((xs.min() + xs.max()) / 2)
    col = cv2.GaussianBlur(L[:, cx - 6:cx + 7].mean(axis=1, keepdims=True), (1, 9), 0)[:, 0]
    dark = col < 70
    runs, y = [], ys.min()
    while y <= ys.max():
        if dark[y]:
            y0 = y
            while y <= ys.max() and dark[y]:
                y += 1
            if y - y0 > 20:
                runs.append((y0, y - 1))
        y += 1
    if len(runs) < 2:
        raise SystemExit(f'expected the lid and the label as two dark runs, found {runs}')
    top, bot = runs[1]
    mid = (top + bot) // 2
    row = L[mid] < 70
    l = cx
    while l > 0 and row[l - 1]:
        l -= 1
    r = cx
    while r < len(row) - 1 and row[r + 1]:
        r += 1
    return top, bot, l, r


def main():
    import cv2
    photo = np.asarray(Image.open(os.path.join(RAW, 'wax-bucket-blank.png')).convert('RGB')).copy()
    cut = np.asarray(Image.open(os.path.join(RAW, 'wax-bucket-blank-cut.png')).convert('RGBA')).copy()
    logo = np.asarray(Image.open(os.path.join(ROOT, 'assets', 'brand', 'flavors-logo-original.png')).convert('RGBA')).astype(np.float32) / 255
    top, bot, l, r = label_box(photo, cut[..., 3])
    hl, R, cx = bot - top + 1, (r - l) / 2, (l + r) / 2
    # the logo's size on the label: 76% of the band's height, its printed width no wider than 62% of the
    # jar's visible width (where the curve still shows it nearly flat)
    lw_h = logo.shape[1] / logo.shape[0]
    h = min(0.76 * hl, (2 * R * np.arcsin(0.62)) / lw_h)
    w_flat = h * lw_h
    y0 = top + (hl - h) / 2
    half = R * np.sin(w_flat / (2 * R))
    xs = np.arange(int(np.floor(cx - half)), int(np.ceil(cx + half)) + 1)
    yy = np.arange(int(np.floor(y0)), int(np.ceil(y0 + h)) + 1)
    X, Y = np.meshgrid(xs, yy)
    u = R * np.arcsin(np.clip((X - cx) / R, -1, 1))                       # along the label, from its centre
    map_x = ((u + w_flat / 2) / w_flat * logo.shape[1]).astype(np.float32)
    map_y = ((Y - y0) / h * logo.shape[0]).astype(np.float32)
    warped = cv2.remap(logo, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    warped = cv2.GaussianBlur(warped, (0, 0), 0.6)
    shade = (0.62 + 0.38 * np.cos(np.arcsin(np.clip((X - cx) / R, -1, 1))))[..., None]
    rgb, a = warped[..., :3] * shade, warped[..., 3:4]
    for img in (photo, cut):
        region = img[yy[0]:yy[-1] + 1, xs[0]:xs[-1] + 1, :3].astype(np.float32) / 255
        img[yy[0]:yy[-1] + 1, xs[0]:xs[-1] + 1, :3] = ((rgb * a + region * (1 - a)) * 255 + 0.5).astype(np.uint8)
    Image.fromarray(photo).save(os.path.join(RAW, 'owner-waxbucket-up.png'))
    Image.fromarray(cut).save(os.path.join(RAW, 'owner-waxbucket-cut.png'))
    print(f'label rows {top}-{bot}, x {l}-{r}; logo {w_flat:.0f}x{h:.0f} flat, {2 * half:.0f}px wide on the jar')


if __name__ == '__main__':
    main()
