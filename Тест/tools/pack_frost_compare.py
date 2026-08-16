# -*- coding: utf-8 -*-
"""Pack frost-mage compare sprites from session Imagine outputs."""
from pathlib import Path
from PIL import Image

SESS = Path(
    r"C:\Users\worlo\.grok\sessions"
    r"\C%3A%5CUsers%5Cworlo%5CDownloads%5Cigor-mainnn"
    r"\01a0066f-cade-7403-b55d-70075a388caf\images"
)
OUT = Path(__file__).resolve().parents[1] / "assets" / "sprites"
HERO = OUT / "characters" / "mage_frost_compare"
FX = OUT / "fx"
SIZE = 480


def key_black(im, thr=18):
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r <= thr and g <= thr and b <= thr:
                px[x, y] = (0, 0, 0, 0)
    return im


def to_square(im, size=SIZE, opaque_black=False):
    im = im.convert("RGBA")
    # letterbox onto black (or transparent)
    src = im.copy()
    src.thumbnail((size, size), Image.Resampling.NEAREST)
    bg = (0, 0, 0, 255) if opaque_black else (0, 0, 0, 0)
    canvas = Image.new("RGBA", (size, size), bg)
    x = (size - src.size[0]) // 2
    y = (size - src.size[1]) // 2
    canvas.alpha_composite(src, (x, y))
    return canvas


def crop_content(im, pad=8):
    im = im.convert("RGBA")
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def save_png(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "PNG")
    print("wrote", path, im.size)


def main():
    idle = Image.open(SESS / "5.jpg")
    wind = Image.open(SESS / "8.jpg")
    thrust = Image.open(SESS / "7.jpg")
    recov = Image.open(SESS / "9.jpg")
    bolt_raw = Image.open(SESS / "6.jpg")

    idle_s = to_square(idle)
    wind_s = to_square(wind)
    thrust_s = to_square(thrust)
    recov_s = to_square(recov)

    save_png(idle_s, HERO / "idle_00.png")
    save_png(wind_s, HERO / "cast_00.png")
    save_png(thrust_s, HERO / "cast_01.png")
    save_png(thrust_s, HERO / "cast_02.png")
    save_png(recov_s, HERO / "cast_03.png")

    bolt = crop_content(key_black(bolt_raw), pad=4)
    # shrink projectile
    bw = 96
    bh = int(bolt.height * (bw / bolt.width))
    bolt = bolt.resize((bw, bh), Image.Resampling.NEAREST)
    save_png(bolt, FX / "frostbolt.png")

    # baked: mage shifted left so the bolt can travel — and still dies at the frame edge
    def shift_left(im, dx=70):
        out = Image.new("RGBA", im.size, (0, 0, 0, 255))
        out.alpha_composite(im, (-dx, 0))
        return out

    baked_poses = [
        shift_left(wind_s),
        shift_left(thrust_s),
        shift_left(thrust_s),
        shift_left(thrust_s),
        shift_left(thrust_s),
        shift_left(recov_s),
    ]
    # staff tip after -70px shift ~ (250, 180); bolt walks to the right edge
    starts = [
        None,
        (250, 178),
        (310, 182),
        (375, 188),
        (440, 192),
        None,
    ]
    for i, pose in enumerate(baked_poses):
        frame = pose.copy()
        pos = starts[i]
        if pos:
            x = pos[0]
            y = pos[1] - bolt.height // 2
            if x < SIZE:
                frame.alpha_composite(bolt, (x, y))
        save_png(frame, HERO / f"baked_{i:02d}.png")

    print("ok", HERO, FX)


if __name__ == "__main__":
    main()
