#!/usr/bin/env python3
"""
Build the ATL Wing Spot favicon from the official logo.

    pip install pillow numpy
    python3 app/scripts/make-favicon.py        (run from the repo root)

Input   app/public/assets/brand/atl-wing-spot-logo.png
Output  app/public/assets/brand/atl-favicon.png          512x512
        app/public/assets/brand/atl-favicon-32.png        32x32
        app/public/assets/brand/atl-apple-touch-icon.png 180x180

The mark is ATL's own "atl" lozenge, lifted pixel-for-pixel out of the logo.
In the full lockup the lozenge stands on end, so the glyphs are rotated back
to reading orientation (the same way they are printed on the baskets) and set
on a cyan tile inside an orange keyline, which is the ring from the "SAUCE IT
UP!" stamp on ATL's basket paper. Nothing is drawn that is not already theirs.
"""
import os

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BRAND = os.path.join(ROOT, 'app', 'public', 'assets', 'brand')
LOGO = os.path.join(BRAND, 'atl-wing-spot-logo.png')

CYAN = (0x22, 0xC1, 0xDA)
ORANGE = (0xF4, 0x7B, 0x20)
WHITE = (0xFF, 0xFF, 0xFF)


def glyph_mask():
    """The white 'atl' out of the logo's lozenge, rotated to read left to right."""
    a = np.asarray(Image.open(LOGO).convert('RGBA')).astype(int)
    is_white = (a[..., 3] > 100) & (a[..., 0] > 200) & (a[..., 1] > 200) & (a[..., 2] > 200)
    is_cyan = (a[..., 3] > 100) & (a[..., 2] > 150) & (a[..., 1] > 140) & (a[..., 0] < 120)

    # the lozenge is the cyan shape in the left sixth of the lockup
    left = is_cyan[:, :int(a.shape[1] * 0.20)]
    xs, ys = np.where(left.any(axis=0))[0], np.where(left.any(axis=1))[0]
    inside = is_white[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

    gx, gy = np.where(inside.any(axis=0))[0], np.where(inside.any(axis=1))[0]
    glyphs = inside[gy.min():gy.max() + 1, gx.min():gx.max() + 1]
    return Image.fromarray((glyphs * 255).astype(np.uint8), 'L').transpose(Image.ROTATE_270)


def tile(size, mask, keyline=0.055, glyph_width=0.62, radius=0.225):
    ss = 4                                     # supersample, then downscale
    s = size * ss
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(s * radius)
    d.rounded_rectangle([0, 0, s - 1, s - 1], r, fill=ORANGE + (255,))
    k = int(s * keyline)
    d.rounded_rectangle([k, k, s - 1 - k, s - 1 - k], int(r * 0.86), fill=CYAN + (255,))

    gw = int(s * glyph_width)
    gh = max(1, round(gw * mask.height / mask.width))
    m = mask.resize((gw, gh), Image.LANCZOS)
    layer = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    layer.paste(Image.new('RGBA', (gw, gh), WHITE + (255,)), ((s - gw) // 2, (s - gh) // 2), m)
    img.alpha_composite(layer)
    return img.resize((size, size), Image.LANCZOS)


def main():
    mask = glyph_mask()
    master = tile(512, mask)
    for name, size, src in (
        ('atl-favicon.png', 512, master),
        ('atl-apple-touch-icon.png', 180, None),
        # at 32px the keyline has to be a touch heavier or it vanishes
        ('atl-favicon-32.png', 32, tile(32, mask, keyline=0.075, glyph_width=0.68)),
    ):
        im = src if src is not None else tile(size, mask)
        path = os.path.join(BRAND, name)
        im.save(path, 'PNG', optimize=True)
        print(f'  {name:28s} {im.width}x{im.height}  {os.path.getsize(path)/1024:5.1f} KB')


if __name__ == '__main__':
    main()
