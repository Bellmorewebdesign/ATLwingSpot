#!/usr/bin/env python3
"""
Prepare the September client photo pack for the web.

    pip install pillow numpy
    python3 app/scripts/process-client-photos.py        (run from the repo root)

Inputs
    ATL-Wing-Spot-September-Photo-Pack/ATL-Wing-Spot-September-Photo-Pack/photos/

Outputs
    app/public/assets/food/client-refresh/*.webp   cut-out feature shots (alpha)
    images-web/client-*.webp                       5:4 menu-card shots (opaque)

Why two shapes
    Feature slots (hero, group band, crave rail, social band) place the food
    with `object-fit: contain` over a coloured surface, so those need a real
    transparent cut-out. Menu cards use `object-fit: cover` inside a 5:4 box on
    white, so those get an opaque 5:4 crop instead.

The cut-out
    Every ATL shot is lit on a flat studio ground (pure white for most of the
    pack, ~#f5f5f5 for the group shot). The ground colour is measured from the
    border, alpha is keyed off distance from it, and each edge pixel is then
    un-premultiplied  F = (P - (1-a)*BG) / a  so no pale fringe survives. That
    is what stops the white halo the old hero cut-out had.

Not used, on purpose
    02  the small package lettering renders as "aEL", not "atl"
    10  a second mac-and-cheese cup; 11 is the cleaner of the pair
    12  a second onion-ring shot; its white paper liner keys transparent, which
        reads as a hole on any ground that is not cream
    15, 19, 20  further waffle-fry variants already covered by 13/14/04
    18  byte-for-byte duplicate of 17
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PACK = os.path.join(ROOT, 'ATL-Wing-Spot-September-Photo-Pack',
                    'ATL-Wing-Spot-September-Photo-Pack', 'photos')
FOOD_OUT = os.path.join(ROOT, 'app', 'public', 'assets', 'food', 'client-refresh')
MENU_OUT = os.path.join(ROOT, 'images-web')


# ---------------------------------------------------------------- keying ----
def _ground(a, band=8):
    """Median colour of the border, i.e. the studio background."""
    edge = np.concatenate([a[:band].reshape(-1, 3), a[-band:].reshape(-1, 3),
                           a[:, :band].reshape(-1, 3), a[:, -band:].reshape(-1, 3)])
    return np.median(edge, axis=0)


def cutout(path, t_lo=14.0, t_hi=48.0, blur=0.6):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    bg = _ground(a)
    diff = a - bg
    darker = np.clip(-diff, 0, None).max(axis=2)          # shadow side
    lighter = np.clip(diff, 0, None).max(axis=2)          # specular side
    chroma = a.max(axis=2) - a.min(axis=2)                # any colour at all
    d = np.maximum(np.maximum(darker, lighter * 0.9), chroma * 1.35)
    alpha = np.clip((d - t_lo) / (t_hi - t_lo), 0.0, 1.0)
    if blur:
        alpha = np.asarray(
            Image.fromarray((alpha * 255).astype(np.uint8))
            .filter(ImageFilter.GaussianBlur(blur))
        ).astype(np.float32) / 255.0
    aa = np.clip(alpha, 1e-3, 1.0)[..., None]
    fg = np.clip((a - (1.0 - aa) * bg) / aa, 0, 255)      # un-premultiply
    return Image.fromarray(np.dstack([fg, alpha * 255]).astype(np.uint8), 'RGBA')


def trim(im, thresh=8):
    al = np.asarray(im)[..., 3]
    ys, xs = np.where(al > thresh)
    if not len(ys):
        return im
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


# ------------------------------------------------------------- 5:4 framing --
def frame_5x4(path, out_w=1000):
    """Crop to 5:4 around the food, never slicing into it; pad if it will not fit."""
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(np.float32)
    bg = _ground(a)
    d = np.abs(a - bg).max(axis=2)
    ys, xs = np.where(d > 18)
    if not len(ys):
        x0, y0, x1, y1 = 0, 0, im.width, im.height
    else:
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    W, H, R = im.width, im.height, 1.25

    if W / H > R:                                    # too wide: crop the sides
        cw = int(round(H * R))
        if cw >= (x1 - x0):
            left = int(round(min(max(cx - cw / 2, 0), W - cw)))
            box = (left, 0, left + cw, H)
        else:                                        # food is wider than 5:4
            ch = int(round(W / R))
            im = _pad_to(im, W, ch, tuple(int(c) for c in bg))
            box = (0, 0, W, ch)
    else:                                            # too tall: crop top/bottom
        ch = int(round(W / R))
        if ch >= (y1 - y0):
            top = int(round(min(max(cy - ch / 2, 0), H - ch)))
            box = (0, top, W, top + ch)
        else:
            cw = int(round(H * R))
            im = _pad_to(im, cw, H, tuple(int(c) for c in bg))
            box = (0, 0, cw, H)

    out = im.crop(box).resize((out_w, int(round(out_w / R))), Image.LANCZOS)
    return out


def _pad_to(im, w, h, fill):
    canvas = Image.new('RGB', (max(w, im.width), max(h, im.height)), fill)
    canvas.paste(im, ((canvas.width - im.width) // 2, (canvas.height - im.height) // 2))
    return canvas


# --------------------------------------------------------------- recipes ----
# name -> (source file, max width, keying threshold pair)
FEATURES = {
    'hero-wing-basket':               ('01-single-wing-basket.png',        1400, (14, 48)),
    'wing-basket-group':              ('03-multi-basket-wing-group.png',   1600, (12, 42)),
    'loaded-waffle-fries':            ('04-loaded-waffle-fries.jpg',        920, (14, 46)),
    'fruity-pebbles-chicken-waffles': ('05-fruity-pebbles-chicken-waffles.jpg', 920, (14, 46)),
    'buffalo-ranch-wrap':             ('07-buffalo-ranch-wrap.jpg',         920, (14, 46)),
    'honey-bbq-club-wrap':            ('08-honey-bbq-club-wrap.jpg',        820, (14, 46)),
    # closing CTA: the only pack shot whose packaging is orange, so it is the
    # one that survives being placed on the cyan takeover
    'onion-rings-orange-box':         ('17-onion-rings-orange-box.jpg',    1100, (14, 46)),
    'mac-and-cheese':                 ('11-mac-and-cheese-cup-white.png',   700, (14, 46)),
    'sauced-waffle-fries':            ('16-sauced-waffle-fries-blue-box.jpg', 820, (14, 46)),
}

# menu-items.json listing index -> (source file, output name)
MENU = {
    35: ('05-fruity-pebbles-chicken-waffles.jpg', 'client-fruity-pebbles-chicken-n-waffles'),
    34: ('06-oreo-chicken-waffles.jpg',           'client-oreo-chicken-n-waffles'),
    42: ('07-buffalo-ranch-wrap.jpg',             'client-buffalo-ranch-chicken-wrap'),
    41: ('09-honey-mustard-wrap.jpg',             'client-honey-mustard-wrap'),
    46: ('13-waffle-fries-blue-box.jpg',          'client-waffle-fries'),
    47: ('14-cheese-waffle-fries-blue-box.jpg',   'client-cheese-fries'),
    48: ('17-onion-rings-orange-box.jpg',         'client-battered-onion-rings'),
    49: ('04-loaded-waffle-fries.jpg',            'client-buffalo-ranch-loaded-waffle-fries'),
}


def main():
    if not os.path.isdir(PACK):
        sys.exit(f'photo pack not found: {PACK}')
    os.makedirs(FOOD_OUT, exist_ok=True)

    print('feature cut-outs -> app/public/assets/food/client-refresh/')
    for name, (src, maxw, (lo, hi)) in FEATURES.items():
        im = trim(cutout(os.path.join(PACK, src), t_lo=lo, t_hi=hi))
        if im.width > maxw:
            im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
        dst = os.path.join(FOOD_OUT, name + '.webp')
        # alpha_quality < 100 makes the mask lossy, which is where the bytes
        # are in a cut-out; the edge stays clean at 70.
        im.save(dst, 'WEBP', quality=82, method=6, alpha_quality=70)
        print(f'  {name+".webp":40s} {im.width}x{im.height}  {os.path.getsize(dst)/1024:6.1f} KB')

    print('menu 5:4 frames -> images-web/')
    for idx, (src, name) in sorted(MENU.items()):
        im = frame_5x4(os.path.join(PACK, src))
        dst = os.path.join(MENU_OUT, name + '.webp')
        im.save(dst, 'WEBP', quality=84, method=6)
        print(f'  [{idx:>2}] {name+".webp":48s} {im.width}x{im.height}  {os.path.getsize(dst)/1024:6.1f} KB')


if __name__ == '__main__':
    main()
