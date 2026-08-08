# -*- coding: utf-8 -*-
"""
Idle без крыльев с ТЕМ ЖЕ мечом, что в форме Гнева.
Берём 21_winged_sword.jpg → вырезаем крылья, оставляем тело+меч.
"""
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEYS = os.path.join(ROOT, "предложения ИИ", "_work_v02", "keys_v3")
SRC = os.path.join(KEYS, "21_winged_sword.jpg")
OUT = os.path.join(KEYS, "24_idle_same_sword.png")
OUT_DIR = os.path.join(ROOT, "assets", "sprites", "characters", "paladin_retribution")


def to_transparent(img, thr=28):
    img = img.convert("RGBA")
    p = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = p[x, y]
            if r + g + b < thr * 3:
                p[x, y] = (0, 0, 0, 0)
    return img


def content_center(img):
    p = img.load()
    w, h = img.size
    xs, ys = [], []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            if p[x, y][3] > 40:
                xs.append(x)
                ys.append(y)
    if not xs:
        return w // 2, h // 2
    return sum(xs) // len(xs), sum(ys) // len(ys)


def remove_wings_keep_sword(img):
    """
    Крылья = боковые верхние лопасти.
    Меч = нижняя-левая вертикальная полоса — НЕ трогаем.
    """
    img = to_transparent(img)
    w, h = img.size
    p = img.load()
    cx, cy = content_center(img)
    bb = img.getbbox()
    x0, y0, x1, y1 = bb
    bw, bh = x1 - x0, y1 - y0

    # sword region (left side, lower 70% of figure) — protect
    sword_x1 = x0 + int(bw * 0.42)
    sword_y0 = y0 + int(bh * 0.28)

    out = img.copy()
    op = out.load()

    for y in range(h):
        for x in range(w):
            r, g, b, a = p[x, y]
            if a < 40:
                continue
            # protected sword strip
            if x <= sword_x1 and y >= sword_y0:
                continue

            dx = abs(x - cx)
            # upper side lobes = wings
            in_upper = y < y0 + int(bh * 0.62)
            far_side = dx > int(bw * 0.16)
            # very far lateral feathers
            very_far = dx > int(bw * 0.22)

            if in_upper and very_far:
                op[x, y] = (0, 0, 0, 0)
            elif in_upper and far_side and y < y0 + int(bh * 0.55):
                # wing roots near shoulders — erase if not dense torso
                # keep if close to vertical body center line density
                if dx > int(bw * 0.18):
                    op[x, y] = (0, 0, 0, 0)

    # second pass: erase floating wing islands (not connected to body core)
    # simple: any opaque pixel above mid-torso and outside body column
    body_left = cx - int(bw * 0.14)
    body_right = cx + int(bw * 0.14)
    mid_y = y0 + int(bh * 0.45)
    for y in range(y0, mid_y):
        for x in range(w):
            if op[x, y][3] < 40:
                continue
            if x <= sword_x1 and y >= sword_y0:
                continue
            if x < body_left - int(bw * 0.02) or x > body_right + int(bw * 0.02):
                op[x, y] = (0, 0, 0, 0)

    # black bg
    canvas = Image.new("RGBA", img.size, (0, 0, 0, 255))
    canvas.alpha_composite(out)
    return canvas


def main():
    src = Image.open(SRC).convert("RGBA")
    cleaned = remove_wings_keep_sword(src)
    cleaned.save(OUT)
    print("saved", OUT)

    # quick preview size
    print("bbox", to_transparent(cleaned).getbbox())


if __name__ == "__main__":
    main()
