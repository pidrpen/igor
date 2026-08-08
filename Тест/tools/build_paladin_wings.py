# -*- coding: utf-8 -*-
"""
Паладин Воздаяние: базовая стойка БЕЗ крыльев.
Крылья — отдельный слой: wing_in / idle_winged / wing_out для Гнева карателя.
"""
from PIL import Image
import os
import math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "assets", "sprites", "characters", "paladin_retribution")
WORK = os.path.join(ROOT, "предложения ИИ", "_work_v02")
LOGICAL = 72
SCALE = 5


def load(path):
    return Image.open(path).convert("RGBA")


def to_logical(img, logical=LOGICAL):
    """If large nearest-scaled image, shrink to logical grid."""
    w, h = img.size
    if w == logical and h == logical:
        return img
    if w % logical == 0 and h % logical == 0 and w == h:
        return img.resize((logical, logical), Image.Resampling.NEAREST)
    # fit content
    return img.resize((logical, logical), Image.Resampling.NEAREST)


def save_scaled(small, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    big = small.resize((small.size[0] * SCALE, small.size[1] * SCALE), Image.Resampling.NEAREST)
    big.save(path, "PNG")
    print(" ", path)


def content_center(img):
    p = img.load()
    w, h = img.size
    xs, ys = [], []
    for y in range(h):
        for x in range(w):
            if p[x, y][3] > 40:
                xs.append(x)
                ys.append(y)
    if not xs:
        return w // 2, h // 2
    return sum(xs) // len(xs), sum(ys) // len(ys)


def split_body_wings(winged):
    """
    Heuristic: body = central opaque mass; wings = side lobes in upper 65%.
    Returns body (no wings), wings (only wings) on transparent canvas.
    """
    img = to_logical(winged).copy()
    w, h = img.size
    p = img.load()
    cx, cy = content_center(img)

    # First pass: mark candidate wing pixels (far from center-x in upper area)
    wing_mask = [[False] * w for _ in range(h)]
    body_mask = [[False] * w for _ in range(h)]

    for y in range(h):
        for x in range(w):
            a = p[x, y][3]
            if a < 40:
                continue
            dx = abs(x - cx)
            # torso band
            in_torso_x = dx <= max(8, int(w * 0.16))
            in_upper = y < int(h * 0.72)
            # legs/feet stay body
            in_lower = y >= int(h * 0.68)
            if in_lower or (in_torso_x and y > int(h * 0.22)):
                body_mask[y][x] = True
            elif in_upper and dx > max(7, int(w * 0.14)):
                wing_mask[y][x] = True
            elif in_torso_x:
                body_mask[y][x] = True
            else:
                # mid sides: if golden and high, wing; else body
                if y < int(h * 0.55) and dx > 6:
                    wing_mask[y][x] = True
                else:
                    body_mask[y][x] = True

    # Grow body a bit into wing roots (shoulders)
    for y in range(h):
        for x in range(w):
            if not wing_mask[y][x]:
                continue
            # if neighbor body below shoulder, keep as wing
            pass

    # Clean: wing pixels that are isolated inside body → body
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if wing_mask[y][x]:
                nbody = sum(
                    1
                    for dy in (-1, 0, 1)
                    for dx in (-1, 0, 1)
                    if body_mask[y + dy][x + dx]
                )
                if nbody >= 6 and abs(x - cx) < 12:
                    wing_mask[y][x] = False
                    body_mask[y][x] = True

    body = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    wings = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    bp, wp = body.load(), wings.load()
    for y in range(h):
        for x in range(w):
            if p[x, y][3] < 40:
                continue
            if wing_mask[y][x]:
                wp[x, y] = p[x, y]
            else:
                bp[x, y] = p[x, y]

    # Fill small holes in body where wings were cut at shoulders — copy from nearby body
    # Paint simple shoulder pads if hole
    for y in range(int(h * 0.25), int(h * 0.45)):
        for x in range(cx - 12, cx + 13):
            if bp[x, y][3] < 40 and p[x, y][3] > 40 and not wing_mask[y][x]:
                bp[x, y] = p[x, y]
            # if empty but was wing root very close to body, add gold shoulder pixel from body average
            if bp[x, y][3] < 40 and abs(x - cx) <= 10:
                # sample from below
                for yy in range(y + 1, min(h, y + 6)):
                    if bp[x, yy][3] > 40:
                        bp[x, y] = bp[x, yy]
                        break

    return body, wings


def scale_layer_from_point(layer, cx, cy, s):
    """Scale layer about (cx,cy) with factor s (0..1+). Nearest neighbor."""
    if s <= 0.02:
        return Image.new("RGBA", layer.size, (0, 0, 0, 0))
    w, h = layer.size
    # crop content
    bbox = layer.getbbox()
    if not bbox:
        return Image.new("RGBA", (w, h), (0, 0, 0, 0))
    # scale full canvas via affine-ish nearest
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    lp = layer.load()
    op = out.load()
    inv = 1.0 / s
    for y in range(h):
        for x in range(w):
            # map out pixel to source
            sx = int(cx + (x - cx) * inv + 0.5)
            sy = int(cy + (y - cy) * inv + 0.5)
            if 0 <= sx < w and 0 <= sy < h:
                c = lp[sx, sy]
                if c[3] > 40:
                    op[x, y] = c
    return out


def alpha_mul(layer, a):
    if a >= 0.99:
        return layer.copy()
    out = layer.copy()
    p = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, al = p[x, y]
            if al:
                p[x, y] = (r, g, b, max(0, min(255, int(al * a))))
    return out


def composite(body, wings):
    out = body.copy()
    out.alpha_composite(wings)
    return out


def build_wing_in(body, wings, n=6):
    cx, cy = content_center(body)
    # pivot slightly above shoulders
    cy = max(0, cy - 8)
    frames = []
    for i in range(n):
        t = (i + 1) / n
        # ease out
        ease = 1 - (1 - t) ** 2
        s = 0.15 + 0.85 * ease
        a = min(1.0, t * 1.2)
        wl = scale_layer_from_point(wings, cx, cy, s)
        wl = alpha_mul(wl, a)
        # slight rise
        shifted = Image.new("RGBA", body.size, (0, 0, 0, 0))
        dy = int((1 - ease) * 4)
        shifted.paste(wl, (0, -dy if dy else 0), wl)
        frames.append(composite(body, shifted))
    return frames


def build_wing_out(body, wings, n=5):
    cx, cy = content_center(body)
    cy = max(0, cy - 8)
    frames = []
    for i in range(n):
        t = (i + 1) / n
        ease = t ** 1.3
        s = 1.0 - 0.85 * ease
        a = 1.0 - ease
        wl = scale_layer_from_point(wings, cx, cy, max(0.08, s))
        wl = alpha_mul(wl, max(0.0, a))
        dy = int(ease * 3)
        shifted = Image.new("RGBA", body.size, (0, 0, 0, 0))
        shifted.paste(wl, (0, dy), wl)
        frames.append(composite(body, shifted))
    # last pure body
    frames.append(body.copy())
    return frames


def strip_wings_from_attack(attack_img, body_ref, wings_ref):
    """Prefer using body-only for attack: if attack still has wings, mask by wing mask of idle."""
    att = to_logical(attack_img)
    wings = to_logical(wings_ref)
    body = to_logical(body_ref)
    w, h = att.size
    # If attack composition differs, just paste body-sized and keep attack silhouette without wing regions
    wp = wings.load()
    ap = att.load()
    out = att.copy()
    op = out.load()
    for y in range(h):
        for x in range(w):
            if wp[x, y][3] > 40:
                # erase wing-like region from attack frame
                op[x, y] = (0, 0, 0, 0)
    # If result too empty, fall back to body
    if not out.getbbox() or sum(1 for y in range(h) for x in range(w) if out.getpixel((x, y))[3] > 40) < 80:
        return body.copy()
    return out


def main():
    # Prefer high-quality base from work if present
    base_path = os.path.join(WORK, "paladin_base_t.png")
    if not os.path.isfile(base_path):
        base_path = os.path.join(SRC_DIR, "idle_00.png")
    winged = load(base_path)
    print("base", base_path, winged.size)

    body, wings = split_body_wings(winged)
    # save debug
    dbg = os.path.join(WORK, "wing_split")
    os.makedirs(dbg, exist_ok=True)
    body.resize((LOGICAL * SCALE, LOGICAL * SCALE), Image.Resampling.NEAREST).save(os.path.join(dbg, "body.png"))
    wings.resize((LOGICAL * SCALE, LOGICAL * SCALE), Image.Resampling.NEAREST).save(os.path.join(dbg, "wings.png"))
    composite(body, wings).resize((LOGICAL * SCALE, LOGICAL * SCALE), Image.Resampling.NEAREST).save(
        os.path.join(dbg, "recombine.png")
    )

    # idle wingless (static)
    for i in range(8):
        save_scaled(body, os.path.join(SRC_DIR, f"idle_{i:02d}.png"))
    save_scaled(body, os.path.join(SRC_DIR, "idle.png"))

    # idle with wings (during AW)
    winged_idle = composite(body, wings)
    for i in range(4):
        save_scaled(winged_idle, os.path.join(SRC_DIR, f"idle_winged_{i:02d}.png"))
    save_scaled(winged_idle, os.path.join(SRC_DIR, "idle_winged.png"))

    # wing in / out
    win = build_wing_in(body, wings, n=6)
    for i, fr in enumerate(win):
        save_scaled(fr, os.path.join(SRC_DIR, f"wing_in_{i:02d}.png"))
    wout = build_wing_out(body, wings, n=5)
    for i, fr in enumerate(wout):
        save_scaled(fr, os.path.join(SRC_DIR, f"wing_out_{i:02d}.png"))

    # Rebuild attack frames without wings (from existing attack or body+lunge)
    for i in range(6):
        ap = os.path.join(SRC_DIR, f"attack_{i:02d}.png")
        if os.path.isfile(ap):
            att = load(ap)
            cleaned = strip_wings_from_attack(att, body, wings)
            # if cleaned still huge wings from misaligned mask, simple lunge body
            save_scaled(cleaned, ap)
        else:
            # synthetic lunge
            fr = Image.new("RGBA", body.size, (0, 0, 0, 0))
            dx = [0, 1, 3, 5, 2, 0][i]
            fr.paste(body, (dx, 0), body)
            save_scaled(fr, ap)
    save_scaled(body, os.path.join(SRC_DIR, "attack.png"))

    print("DONE wingless idle + wing_in/out + idle_winged")


if __name__ == "__main__":
    main()
