# -*- coding: utf-8 -*-
"""
Паладин v3.1:
- idle с мечом (без крыльев)
- одинаковый масштаб ТЕЛА с крыльями / без (ноги на одной линии, bodyH совпадает)
- отдельные attack / attack_winged / wing_in / wing_out
"""
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEYS = os.path.join(ROOT, "предложения ИИ", "_work_v02", "keys_v3")
OUT = os.path.join(ROOT, "assets", "sprites", "characters", "paladin_retribution")
LOGICAL = 96  # место под крылья/меч, тело якорится по ногам
SCALE = 5
COLORS = 42
# Целевая высота ТЕЛА (голова→ступни), без крыльев — одинакова во всех формах
TARGET_BODY_H = 62
FOOT_PAD = 3


def load(path):
    return Image.open(path).convert("RGBA")


def to_transparent(img, thr=30):
    img = img.convert("RGBA")
    p = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = p[x, y]
            if r + g + b < thr * 3:
                p[x, y] = (0, 0, 0, 0)
    return img


def full_bbox(img):
    b = img.getbbox()
    return b if b else (0, 0, img.size[0], img.size[1])


def body_bbox(img, wingless=False):
    """
    BBox ТЕЛА: ищем «плотную» центральную колонку (голова+торс+ноги).
    Крылья (бока) и тонкий клинок (мало пикселей в ряду) отсекаем.
    """
    img = to_transparent(img)
    bb = full_bbox(img)
    x0, y0, x1, y1 = bb
    w = x1 - x0
    h = y1 - y0
    p = img.load()

    # ширина колонки тела
    if wingless:
        cx0 = x0 + int(w * 0.28)
        cx1 = x0 + int(w * 0.72)
    else:
        cx0 = x0 + int(w * 0.36)
        cx1 = x0 + int(w * 0.64)

    # по рядам: плотность в колонке; тело = ряды с достаточной плотностью
    thr = max(3, (cx1 - cx0) // 6)
    rows = []
    for y in range(y0, y1):
        cnt = 0
        for x in range(cx0, cx1):
            if p[x, y][3] > 40:
                cnt += 1
        rows.append(cnt)

    # ступни: самый нижний ряд с плотностью
    foot = None
    for y in range(len(rows) - 1, -1, -1):
        if rows[y] >= thr:
            foot = y0 + y
            break
    if foot is None:
        return bb

    # голова: идём сверху, пропускаем редкие ряды (остриё меча / перья)
    head = None
    for y in range(len(rows)):
        if rows[y] >= thr:
            # требуем ещё 2 плотных ряда подряд — не одиночный пиксель клинка
            if y + 2 < len(rows) and rows[y + 1] >= thr and rows[y + 2] >= max(2, thr - 1):
                head = y0 + y
                break
    if head is None:
        head = y0 + int(h * 0.15)

    # горизонталь по плотным рядам
    minx, maxx = cx1, cx0
    for y in range(head, foot + 1):
        for x in range(cx0, cx1):
            if p[x, y][3] > 40:
                minx = min(minx, x)
                maxx = max(maxx, x)
    pad = max(2, w // 22)
    return (max(x0, minx - pad), head, min(x1, maxx + pad + 1), foot + 1)


def normalize_to_canvas(img, wingless=False, size=LOGICAL):
    """
    Масштабирует так, чтобы body height == TARGET_BODY_H,
    ставит ступни на FOOT_PAD от низа, центрирует по X.
    Крылья могут выходить за бока/верх.
    """
    img = to_transparent(img)
    bb = body_bbox(img, wingless=wingless)
    body_h = max(1, bb[3] - bb[1])
    scale = TARGET_BODY_H / body_h

    # scale whole image
    nw = max(1, int(img.size[0] * scale))
    nh = max(1, int(img.size[1] * scale))
    scaled = img.resize((nw, nh), Image.Resampling.LANCZOS)

    # body bbox after scale
    bx0 = int(bb[0] * scale)
    by0 = int(bb[1] * scale)
    bx1 = int(bb[2] * scale)
    by1 = int(bb[3] * scale)
    body_cx = (bx0 + bx1) // 2
    body_bottom = by1

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # place so body bottom at size - FOOT_PAD, body center at size//2
    dest_x = size // 2 - body_cx
    dest_y = (size - FOOT_PAD) - body_bottom
    canvas.paste(scaled, (dest_x, dest_y), scaled)
    return canvas


def pixelize(img):
    rgb = img.convert("RGB")
    # keep alpha from hard threshold
    a = img.split()[-1].point(lambda v: 255 if v > 50 else 0)
    q = rgb.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT).convert("RGB")
    return Image.merge("RGBA", (*q.split(), a))


def prepare(path, wingless=False):
    return pixelize(normalize_to_canvas(load(path), wingless=wingless))


def save_seq(frames, prefix):
    os.makedirs(OUT, exist_ok=True)
    for i, fr in enumerate(frames):
        big = fr.resize((fr.size[0] * SCALE, fr.size[1] * SCALE), Image.Resampling.NEAREST)
        path = os.path.join(OUT, f"{prefix}_{i:02d}.png")
        big.save(path)
        print(" ", path)
    if not frames:
        return
    big0 = frames[0].resize((frames[0].size[0] * SCALE, frames[0].size[1] * SCALE), Image.Resampling.NEAREST)
    if prefix == "idle":
        big0.save(os.path.join(OUT, "idle.png"))
    if prefix == "idle_winged":
        big0.save(os.path.join(OUT, "idle_winged.png"))
    if prefix in ("attack", "attack_winged"):
        mid = frames[min(3, len(frames) - 1)]
        mid.resize((mid.size[0] * SCALE, mid.size[1] * SCALE), Image.Resampling.NEAREST).save(
            os.path.join(OUT, f"{prefix}.png")
        )


def shift(img, dx=0, dy=0):
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (dx, dy), img)
    return out


def blend(a, b, t):
    a, b = a.convert("RGBA"), b.convert("RGBA")
    if t <= 0.02:
        return a.copy()
    if t >= 0.98:
        return b.copy()
    out = Image.new("RGBA", a.size, (0, 0, 0, 0))
    pa, pb, po = a.load(), b.load(), out.load()
    w, h = a.size
    for y in range(h):
        for x in range(w):
            dith = ((x * 3 + y * 7) % 8) / 8.0 * 0.2 - 0.1
            u = min(1.0, max(0.0, t + dith))
            ra, ga, ba, aa = pa[x, y]
            rb, gb, bb, ab = pb[x, y]
            if aa < 20 and ab < 20:
                continue
            if aa < 20:
                po[x, y] = pb[x, y]
            elif ab < 20:
                po[x, y] = pa[x, y]
            elif u < 0.38:
                po[x, y] = pa[x, y]
            elif u > 0.62:
                po[x, y] = pb[x, y]
            else:
                r = (int(ra * (1 - u) + rb * u) // 8) * 8
                g = (int(ga * (1 - u) + gb * u) // 8) * 8
                bl = (int(ba * (1 - u) + bb * u) // 8) * 8
                po[x, y] = (r, g, bl, 255)
    return out


def chain_keys(keys, steps_between=1):
    out = [keys[0]]
    for i in range(len(keys) - 1):
        a, b = keys[i], keys[i + 1]
        for s in range(1, steps_between + 1):
            out.append(blend(a, b, s / (steps_between + 1)))
        out.append(b)
    return out


def attack_cycle(idle, strike, n=6):
    wind = shift(idle, -2, 0)
    mid = blend(idle, strike, 0.4)
    hold = strike
    rec = blend(strike, idle, 0.55)
    keys = [idle, wind, mid, hold, rec, idle]
    return keys[:n]


def main():
    # Idle: тот же меч что у Гнева (24 = 21 без крыльев). НЕ 22/23 — кривые.
    wingless_idle_path = os.path.join(KEYS, "24_idle_same_sword.png")
    if not os.path.isfile(wingless_idle_path):
        wingless_idle_path = os.path.join(KEYS, "17.jpg")
        print("WARN: no wrath-sword idle, fallback 17")

    winged_idle_path = os.path.join(KEYS, "21_winged_sword.jpg")
    if not os.path.isfile(winged_idle_path):
        winged_idle_path = os.path.join(KEYS, "ref_winged.png")
        print("WARN: no winged sword idle, fallback ref")

    wingless_idle = prepare(wingless_idle_path, wingless=True)
    wingless_atk = prepare(os.path.join(KEYS, "20.jpg"), wingless=True)
    winged_idle = prepare(winged_idle_path, wingless=False)
    winged_atk = prepare(os.path.join(KEYS, "18.jpg"), wingless=False)
    wing_nubs = prepare(os.path.join(KEYS, "19.jpg"), wingless=False)
    wing_half = prepare(os.path.join(KEYS, "16.jpg"), wingless=False)

    # measure body heights for report
    def body_h(im, wl):
        # reverse: already normalized, measure opaque center
        p = im.load()
        w, h = im.size
        ys = [y for y in range(h) for x in range(w // 3, 2 * w // 3) if p[x, y][3] > 40]
        return (max(ys) - min(ys) + 1) if ys else 0

    print("bodyH wingless idle", body_h(wingless_idle, True))
    print("bodyH winged idle", body_h(winged_idle, False))
    print("bodyH wingless atk", body_h(wingless_atk, True))
    print("bodyH winged atk", body_h(winged_atk, False))

    if os.path.isdir(OUT):
        for f in os.listdir(OUT):
            if f.endswith(".png"):
                os.remove(os.path.join(OUT, f))

    # idle wingless + sword
    save_seq([wingless_idle], "idle")
    for i in range(1, 8):
        wingless_idle.resize((LOGICAL * SCALE, LOGICAL * SCALE), Image.Resampling.NEAREST).save(
            os.path.join(OUT, f"idle_{i:02d}.png")
        )

    save_seq([winged_idle], "idle_winged")
    for i in range(1, 4):
        winged_idle.resize((LOGICAL * SCALE, LOGICAL * SCALE), Image.Resampling.NEAREST).save(
            os.path.join(OUT, f"idle_winged_{i:02d}.png")
        )

    # wing_in / out — body scale already matched
    win = chain_keys([wingless_idle, wing_nubs, wing_half, winged_idle], steps_between=1)
    while len(win) < 6:
        win.insert(-1, blend(win[-2], win[-1], 0.5))
    save_seq(win[:6], "wing_in")

    wout = chain_keys([winged_idle, wing_half, wing_nubs, wingless_idle], steps_between=1)
    while len(wout) < 6:
        wout.insert(-1, blend(wout[-2], wout[-1], 0.5))
    save_seq(wout[:6], "wing_out")

    save_seq(attack_cycle(wingless_idle, wingless_atk, 6), "attack")
    save_seq(attack_cycle(winged_idle, winged_atk, 6), "attack_winged")

    print("DONE v3.1 matched body + sword idle →", OUT)


if __name__ == "__main__":
    main()
