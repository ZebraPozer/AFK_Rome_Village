#!/usr/bin/env python3
"""Build the game's runtime assets from the full-resolution source art.

    art/              full-size originals (edit / replace these)
    prototype/assets/ generated, web-sized copies loaded by the game (do not edit by hand)

Usage (from the project root):  python3 prototype/tools/build_assets.py
Requires Pillow (pip install pillow).

Sizes are chosen from how big things are drawn: the world is 1170×540 and the canvas
renders at up to ~2× on phones, so a 160-px-tall hero never needs more than ~512 px.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / 'art'
OUT = ROOT / 'prototype' / 'assets'

# source in art/            -> output in prototype/assets/   max (width, height)   format
ASSETS = [
    ('characters/roman-legionary.png',  'characters/roman-legionary.png',  (512, 512), 'png'),
    ('characters/roman-archer.png',     'characters/roman-archer.png',     (512, 512), 'png'),
    ('characters/roman-farmer.png',     'characters/roman-farmer.png',     (512, 512), 'png'),
    ('characters/orc-raider.png',       'characters/orc-raider.png',       (512, 512), 'png'),
    ('characters/orc-dual-swords.png',  'characters/orc-dual-swords.png',  (512, 512), 'png'),
    ('characters/orc-shield-guard.png', 'characters/orc-shield-guard.png', (512, 512), 'png'),
    ('characters/orc-red-elite.png',    'characters/orc-red-elite.png',    (512, 512), 'png'),
    ('characters/orc-brute-boss.png',   'characters/orc-brute-boss.png',   (640, 640), 'png'),
    ('buildings/wooden-guard-tower.png', 'buildings/wooden-guard-tower.png', (768, 768), 'png'),
    ('obstacles/palisade.png',          'obstacles/palisade.png',          (512, 512), 'png'),
    ('icons/food.png',                  'icons/food.png',                  (128, 128), 'png'),
    ('icons/gold.png',                  'icons/gold.png',                  (128, 128), 'png'),
    ('icons/legionary-head.png',        'icons/legionary-head.png',        (128, 128), 'png'),
    ('icons/farmer-head.png',           'icons/farmer-head.png',           (128, 128), 'png'),
    ('icons/orc-raider-head.png',       'icons/orc-raider-head.png',       (192, 192), 'png'),
    ('icons/orc-brute-boss-head.png',   'icons/orc-brute-boss-head.png',   (192, 192), 'png'),
    ('icons/app-icon-192.png',          'icons/app-icon-192.png',          (192, 192), 'png'),
    ('icons/app-icon-512.png',          'icons/app-icon-512.png',          (512, 512), 'png'),
    # Wide backdrop layers span the whole screen: keep them big.
    ('landscape/mountains.png',         'landscape/mountains.png',         (2137, 2137), 'png'),
    ('landscape/hills.png',             'landscape/hills.png',             (1846, 1846), 'png'),
    ('landscape/treeline.png',          'landscape/treeline.png',          (1846, 1846), 'png'),
    # Used as a repeating pattern at native pixel size: keep the size, JPEG it (no alpha).
    ('landscape/grass-tile.png',        'landscape/grass-tile.jpg',        (1254, 1254), 'jpg'),
    ('sky/cloud-bank-far.png',          'sky/cloud-bank-far.png',          (1200, 1200), 'png'),
    ('sky/cloud-cumulus.png',           'sky/cloud-cumulus.png',           (1000, 1000), 'png'),
    ('sky/cloud-sunlit.png',            'sky/cloud-sunlit.png',            (1000, 1000), 'png'),
    ('sky/cloud-wisp.png',              'sky/cloud-wisp.png',              (1200, 1200), 'png'),
]


def build():
    total_in = total_out = 0
    for src, dst, (max_w, max_h), fmt in ASSETS:
        source = ART / src
        target = OUT / dst
        target.parent.mkdir(parents=True, exist_ok=True)
        image = Image.open(source)
        image.load()
        scale = min(1.0, max_w / image.width, max_h / image.height)
        if scale < 1.0:
            image = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
        if fmt == 'jpg':
            image.convert('RGB').save(target, 'JPEG', quality=86, optimize=True, progressive=True)
        else:
            image.save(target, 'PNG', optimize=True)
        total_in += source.stat().st_size
        total_out += target.stat().st_size
        print(f'{dst:40s} {image.width:5d}×{image.height:<5d} {target.stat().st_size / 1024:7.0f} KB')
    print(f'\n{len(ASSETS)} files · {total_in / 1048576:.1f} MB of source art → {total_out / 1048576:.1f} MB for the game')


if __name__ == '__main__':
    build()
