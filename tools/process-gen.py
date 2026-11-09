"""process-gen.py - derive the shipped WebP files from the AI-generated scene stills.

    python3 -I tools/process-gen.py

Source: assets/generated/raw/<name>.jpg, rendered with fal-ai/flux-pro/v1.1-ultra and logged with
request id, seed and prompt in assets/generated/generated.json (tools/gen-download.mjs).
Writes src/assets/img/gen/<name>-<w>.webp (+ <name>-p-<w>.webp portrait crops) and
src/content/generated-images.json, the provenance sidecar the templates read.

Every file carries an XMP packet with the IPTC digital source type trainedAlgorithmicMedia and a
description that names the model and says it is not a photograph of the store. Markup adds
data-ai="generated". These are mood and product-category illustrations: none shows the store,
its staff or its customers (docs/CHANGE-LOG.md, Imagery). Nothing here touches the client's own
logo or photos; those come from tools/process-images.py.
"""
import json, os
from PIL import Image, ImageEnhance, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'assets', 'generated', 'raw')
OUT = os.path.join(ROOT, 'src', 'assets', 'img', 'gen')
LOG = os.path.join(ROOT, 'assets', 'generated', 'generated.json')
MANIFEST = os.path.join(ROOT, 'src', 'content', 'generated-images.json')
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):            # derived files only: rebuilt from raw every run
    if f.endswith('.webp'):
        os.remove(os.path.join(OUT, f))

log = json.load(open(LOG))
renders = {x['name']: x for x in log['items']}

# role: hero (full-bleed, portrait crop for phones) | backdrop (band background under a scrim)
#       | tile (bento card). crop: relative (x0, y0, x1, y1). grade: 'cool' pulls warm bulbs to cream.
SPECS = {
    'hero-night-b': dict(role='hero', widths=[1280, 1920, 2560], q=70,
                         portrait=dict(crop=(0.31, 0.0, 0.631, 1.0), widths=[640, 1000]),
                         alt='Illustration: an empty multi-lane road at night with red and white light trails, streetlights and power lines'),
    # 'jars-counter' (three jars on a navy counter with a blue LED strip) is no longer shipped: the store's
    # own counters are navy with LED underglow, so it read as the client's premises (review 2026-11-09).
    'concentrates': dict(role='tile', widths=[640, 1100], q=74,
                         alt='Illustration: amber cannabis concentrate shards and an open jar of budder on black glass'),
    'vapes-more': dict(role='tile', widths=[640, 1100], q=74,
                       alt='Illustration: a blank vape cartridge, a dropper bottle and a can on navy glass over a blue LED line'),
    'box-spotlight': dict(role='backdrop', widths=[800, 1280, 1920], q=72,
                          alt='Illustration: two glass jars of top-shelf cannabis flower on black velvet under one spotlight'),
    # graded to the store's blue (owner 2026-11-09: black, then blue, then whites; spectrum colours
    # only as thin dividers), so the pink tubes and the rainbow puddles read as LED blue
    'neon-abstract': dict(role='backdrop', widths=[800, 1280, 1920], q=70, grade='blue',
                          alt='Illustration: neon tube curves glowing blue, reflected on a wet floor'),
    'rainbow-reflections': dict(role='backdrop', widths=[800, 1280, 1920], q=66, grade='blue',
                                alt='Illustration: blue light reflections on wet asphalt at night'),
    'bulb-bokeh': dict(role='backdrop', widths=[800, 1280, 1920], q=70, grade='cool',
                       alt='Illustration: a row of glowing marquee bulbs in soft focus'),
    # 'showroom-glow-b' retired 2026-11-09: the owner asked for the flavors band to be black, without
    # the faded light lines behind its words (the raw render stays in assets/generated/raw).
}

def xmp(name, r):
    desc = (f'AI-generated illustration ({log["model"]}, request {r["requestId"]}). '
            'Not a photograph of Flavors Detroit, its staff or its customers.')
    return ('<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>'
            '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
            '<rdf:Description rdf:about="" xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" '
            'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" '
            'Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia" '
            f'xmp:CreatorTool="{log["model"]}">'
            f'<dc:description><rdf:Alt><rdf:li xml:lang="x-default">{desc}</rdf:li></rdf:Alt></dc:description>'
            f'<dc:title><rdf:Alt><rdf:li xml:lang="x-default">{name}</rdf:li></rdf:Alt></dc:title>'
            '</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>').encode('utf-8')

def cool(im):
    """Warm marquee bulbs -> cream white with navy shadows (no gold): half desaturated original,
    half a navy-to-cream duotone of its luminance."""
    desat = ImageEnhance.Color(im).enhance(0.45)
    duo = ImageOps.colorize(ImageOps.grayscale(im), black=(6, 10, 23), white=(255, 250, 238), mid=(92, 104, 140))
    return Image.blend(desat, duo, 0.5)

def blue(im):
    """Any hue -> the store's blue: a black / store navy / LED blue / blue-white map of the image's
    luminance (measured store navy #192036, LED #4b79d7, core #c3caec), so light stays light and
    shadow stays black, with 12% of the desaturated original kept for texture."""
    g = ImageOps.grayscale(im)
    tone = ImageOps.colorize(g, black=(4, 5, 8), white=(214, 224, 252), mid=(54, 86, 186), blackpoint=8, whitepoint=246, midpoint=118)
    return Image.blend(tone, ImageEnhance.Color(im).enhance(0.0), 0.12)

def fit_w(im, w):
    if im.size[0] <= w:
        return im.copy()
    return im.resize((w, round(im.size[1] * w / im.size[0])), Image.LANCZOS)

manifest = {'model': log['model'], 'note': 'AI-generated illustrations; never a stand-in for the store, staff or customers.', 'items': {}}
for name, spec in SPECS.items():
    r = renders[name]
    src = os.path.join(RAW, name + '.jpg')
    im = Image.open(src).convert('RGB')
    if spec.get('grade') == 'cool':
        im = cool(im)
    elif spec.get('grade') == 'blue':
        im = blue(im)
    packet = xmp(name, r)
    files = []

    def emit(img, variant, widths, tag):
        for w in widths:
            out = fit_w(img, w)
            fname = f'{name}{tag}-{out.size[0]}.webp'
            path = os.path.join(OUT, fname)
            out.save(path, 'WEBP', quality=spec['q'], method=6, xmp=packet)
            files.append(dict(file='gen/' + fname, w=out.size[0], h=out.size[1], bytes=os.path.getsize(path), variant=variant))
            print(f'gen/{fname:40s} {out.size[0]}x{out.size[1]} {os.path.getsize(path) // 1024} KB')

    emit(im, 'landscape', spec['widths'], '')
    if spec.get('portrait'):
        W, H = im.size
        c = spec['portrait']['crop']
        p = im.crop((int(c[0] * W), int(c[1] * H), int(c[2] * W), int(c[3] * H)))
        emit(p, 'portrait', spec['portrait']['widths'], '-p')
    manifest['items'][name] = dict(
        role=spec['role'], alt=spec['alt'], source=os.path.relpath(src, ROOT), model=log['model'],
        requestId=r['requestId'], seed=r.get('seed'), prompt=r.get('prompt'), grade=spec.get('grade'),
        rawSize=[r['width'], r['height']], files=files)

json.dump(manifest, open(MANIFEST, 'w'), indent=1)
total = sum(f['bytes'] for it in manifest['items'].values() for f in it['files'])
print('generated items', len(manifest['items']), '· files', sum(len(it['files']) for it in manifest['items'].values()), '·', total // 1024, 'KB')
