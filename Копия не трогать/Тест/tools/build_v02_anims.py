# -*- coding: utf-8 -*-
"""
Собрать 16-bit (вариант 02) idle/attack кадры для тестовой комнаты.
База: предложения ИИ/02 + keyframe-эдиты. Всё прогоняется через
пикселизацию (downscale → quantize → nearest upscale) для единого look.
"""
from PIL import Image, ImageChops, ImageEnhance, ImageFilter
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT, "предложения ИИ", "_work_v02")
OUT_PAL = os.path.join(ROOT, "assets", "sprites", "characters", "paladin_protection")
OUT_SPI = os.path.join(ROOT, "assets", "sprites", "characters", "evil_spirit")
# также копия под retribution (тот же арт)
OUT_RET = os.path.join(ROOT, "assets", "sprites", "characters", "paladin_retribution")

LOGICAL = 72  # логических пикселей
SCALE = 5     # 72*5 = 360 display


def load_rgba(path):
    return Image.open(path).convert("RGBA")


def to_transparent(img, thr=22):
    img = img.convert("RGBA")
    p = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = p[x, y]
            if r + g + b < thr * 3:
                p[x, y] = (0, 0, 0, 0)
    return img


def content_bbox(img, thr=20):
    p = img.load()
    w, h = img.size
    minx, miny, maxx, maxy = w, h, 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            r, g, b, a = p[x, y]
            if a > 12 and (r + g + b) > thr * 3:
                found = True
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    if not found:
        return (0, 0, w, h)
    pad = 2
    return (max(0, minx - pad), max(0, miny - pad), min(w, maxx + pad + 1), min(h, maxy + pad + 1))


def fit_square(img, size=LOGICAL):
    """Crop content, fit into size×size transparent canvas, keep aspect."""
    img = to_transparent(img)
    box = content_bbox(img)
    img = img.crop(box)
    w, h = img.size
    scale = min(size / max(w, 1), size / max(h, 1)) * 0.92
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ox = (size - nw) // 2
    oy = size - nh - max(1, size // 16)  # bottom-align for ground feel
    canvas.paste(img, (ox, oy), img)
    return canvas


def pixelize(img, logical=LOGICAL, scale=SCALE, colors=48):
    """Classic pixel look: shrink, quantize, nearest expand."""
    small = fit_square(img, logical)
    # quantize RGB only, keep alpha
    rgb = small.convert("RGB")
    q = rgb.quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert("RGB")
    a = small.split()[-1]
    # hard alpha
    a = a.point(lambda v: 255 if v > 40 else 0)
    out_small = Image.merge("RGBA", (*q.split(), a))
    big = out_small.resize((logical * scale, logical * scale), Image.Resampling.NEAREST)
    return out_small, big


def is_mostly_gold(img):
    img = to_transparent(img)
    p = img.load()
    w, h = img.size
    gold = purple = 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b, a = p[x, y]
            if a < 40:
                continue
            if r > 120 and g > 80 and b < 120 and r >= g:
                gold += 1
            if b > 80 and r < 140 and b >= r:
                purple += 1
    return gold >= purple


def shift(img, dx=0, dy=0):
    canvas = Image.new("RGBA", img.size, (0, 0, 0, 0))
    canvas.paste(img, (dx, dy), img)
    return canvas


def blend_pixel(a, b, t):
    """Blend two same-size RGBA images (logical pixel space)."""
    a = a.convert("RGBA")
    b = b.convert("RGBA")
    # nearest blend via alpha composite trick
    if t <= 0:
        return a.copy()
    if t >= 1:
        return b.copy()
    # hard switch per-pixel by brightness of crossfade
    out = Image.new("RGBA", a.size, (0, 0, 0, 0))
    pa, pb, po = a.load(), b.load(), out.load()
    w, h = a.size
    thr = t
    for y in range(h):
        for x in range(w):
            # dithered threshold by position for pixel feel
            dith = ((x * 3 + y * 5) % 7) / 7.0 * 0.15
            use_b = thr + dith > 0.5 if abs(thr - 0.5) < 0.2 else thr > 0.5
            # smoother: pick by t with dither
            use_b = (t + dith) >= 0.5 if 0.25 < t < 0.75 else (t >= 0.5)
            ra, ga, ba, aa = pa[x, y]
            rb, gb, bb, ab = pb[x, y]
            if aa < 20 and ab < 20:
                continue
            if aa < 20:
                po[x, y] = pb[x, y]
            elif ab < 20:
                po[x, y] = pa[x, y]
            else:
                # lerp colors in steps
                u = t
                r = int(ra * (1 - u) + rb * u)
                g = int(ga * (1 - u) + gb * u)
                b = int(ba * (1 - u) + bb * u)
                al = int(aa * (1 - u) + ab * u)
                # snap to chunkier
                r, g, b = (r // 8) * 8, (g // 8) * 8, (b // 8) * 8
                po[x, y] = (r, g, b, 255 if al > 40 else 0)
    return out


def save_frames(smalls, out_dir, prefix, scale=SCALE):
    os.makedirs(out_dir, exist_ok=True)
    for i, sm in enumerate(smalls):
        big = sm.resize((sm.size[0] * scale, sm.size[1] * scale), Image.Resampling.NEAREST)
        path = os.path.join(out_dir, f"{prefix}_{i:02d}.png")
        big.save(path, "PNG")
        print("  ", path)
    # also first as idle.png / attack.png convenience
    if smalls:
        big0 = smalls[0].resize((smalls[0].size[0] * scale, smalls[0].size[1] * scale), Image.Resampling.NEAREST)
        if prefix == "idle":
            big0.save(os.path.join(out_dir, "idle.png"))
        if prefix == "attack" and len(smalls) > len(smalls) // 2:
            mid = smalls[min(len(smalls) - 1, 3)]
            mid.resize((mid.size[0] * scale, mid.size[1] * scale), Image.Resampling.NEAREST).save(
                os.path.join(out_dir, "attack.png")
            )


def build_idle(base_small, n=8):
    frames = []
    # bob + tiny scale feel via vertical shift only
    pattern = [0, -1, -2, -1, 0, 1, 2, 1]
    for i in range(n):
        dy = pattern[i % len(pattern)]
        # subtle horizontal wing shimmer alternate
        dx = 1 if (i % 4) == 1 else (-1 if (i % 4) == 3 else 0)
        frames.append(shift(base_small, dx, dy))
    return frames


def build_attack(base_small, wind_small, strike_small, n=6):
    # sequence: base → wind → strike lunge → strike hold → recover → base
    keys = [
        base_small,
        wind_small,
        shift(strike_small, 3, 0),
        shift(strike_small, 5, 1),
        shift(wind_small, 2, 0),
        base_small,
    ]
    # ensure same size
    keys = [k.resize(base_small.size, Image.Resampling.NEAREST) for k in keys]
    if n == 6:
        return keys
    # interpolate if needed
    out = []
    for i in range(n):
        t = i / max(n - 1, 1) * (len(keys) - 1)
        i0 = int(t)
        i1 = min(len(keys) - 1, i0 + 1)
        frac = t - i0
        out.append(blend_pixel(keys[i0], keys[i1], frac) if frac > 0.05 else keys[i0])
    return out


def classify_keyframes(paths):
    pal, spi = [], []
    for p in paths:
        if not os.path.isfile(p):
            continue
        im = load_rgba(p)
        (pal if is_mostly_gold(im) else spi).append(p)
    return pal, spi


def main():
    print("WORK", WORK)
    # base from original style 02 crops
    pal_base = load_rgba(os.path.join(WORK, "paladin_base.png"))
    spi_base = load_rgba(os.path.join(WORK, "spirit_base.png"))

    keys = [os.path.join(WORK, f"k_{i:02d}.jpg") for i in range(9, 15)]
    pal_k, spi_k = classify_keyframes(keys)
    print("paladin keys:", pal_k)
    print("spirit keys:", spi_k)

    # pixelize bases
    pal_s, _ = pixelize(pal_base)
    spi_s, _ = pixelize(spi_base)

    # pick wind/strike from keys
    def best_variants(base_s, key_paths, default):
        variants = []
        for p in key_paths:
            sm, _ = pixelize(load_rgba(p))
            variants.append(sm)
        if not variants:
            return default, default
        # farthest from base as strike, middle as wind
        def diff(a, b):
            a2 = a.convert("RGB")
            b2 = b.convert("RGB")
            d = ImageChops.difference(a2, b2)
            return sum(d.convert("L").histogram()[1:])  # rough

        scored = sorted(variants, key=lambda v: diff(base_s, v), reverse=True)
        strike = scored[0]
        wind = scored[min(1, len(scored) - 1)]
        return wind, strike

    pal_wind, pal_strike = best_variants(pal_s, pal_k, pal_s)
    spi_wind, spi_strike = best_variants(spi_s, spi_k, spi_s)

    # If keys failed classification, force generative shifts for attack
    if not pal_k:
        pal_wind = shift(pal_s, -2, -1)
        pal_strike = shift(pal_s, 6, 1)
    if not spi_k:
        spi_wind = shift(spi_s, 0, -2)
        spi_strike = shift(spi_s, -6, 0)

    print("Building paladin…")
    pal_idle = build_idle(pal_s, 8)
    pal_atk = build_attack(pal_s, pal_wind, pal_strike, 6)
    # clear old
    for d in (OUT_PAL, OUT_RET, OUT_SPI):
        os.makedirs(d, exist_ok=True)
        for f in os.listdir(d):
            if f.endswith(".png"):
                os.remove(os.path.join(d, f))

    save_frames(pal_idle, OUT_PAL, "idle")
    save_frames(pal_atk, OUT_PAL, "attack")
    # copy to retribution
    if os.path.isdir(OUT_RET):
        shutil.rmtree(OUT_RET)
    shutil.copytree(OUT_PAL, OUT_RET)

    print("Building spirit…")
    spi_idle = build_idle(spi_s, 8)
    # spirit floats more
    spi_idle = []
    pat = [0, -1, -2, -3, -2, -1, 0, 1]
    for i, dy in enumerate(pat):
        spi_idle.append(shift(spi_s, (1 if i % 2 else -1), dy))
    spi_atk = build_attack(spi_s, spi_wind, spi_strike, 6)
    # reverse horizontal for spirit facing (enemy mirrored in CSS, but asset faces right-ish)
    save_frames(spi_idle, OUT_SPI, "idle")
    save_frames(spi_atk, OUT_SPI, "attack")

    print("DONE")
    print("paladin frames →", OUT_PAL)
    print("retribution copy →", OUT_RET)
    print("spirit frames →", OUT_SPI)


if __name__ == "__main__":
    main()
