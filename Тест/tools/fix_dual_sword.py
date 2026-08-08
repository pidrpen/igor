# -*- coding: utf-8 -*-
"""
Idle с ОДНИМ мечом: тело из 17.jpg (без меча) + простой двуручный клинок (пиксель).
Не используем 22 (там два меча).
"""
from PIL import Image, ImageDraw
import os

KEYS = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "предложения ИИ", "_work_v02", "keys_v3",
)
BODY = os.path.join(KEYS, "17.jpg")
OUT = os.path.join(KEYS, "23_one_sword.png")

# палитра меча
C_EDGE = (240, 230, 190, 255)
C_BLADE = (220, 190, 90, 255)
C_BLADE2 = (200, 160, 50, 255)
C_HILT = (160, 110, 40, 255)
C_GRIP = (90, 50, 100, 255)
C_GEM = (200, 60, 100, 255)
C_OUT = (60, 40, 20, 255)


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


def put(px, x, y, c, w, h):
    if 0 <= x < w and 0 <= y < h:
        px[x, y] = c


def draw_sword(img, cx, y_hand, blade_up=48, blade_down=8):
    """
    Один меч: клинок вверх от рукояти, короткий хвостовик вниз.
    y_hand — уровень рукояти (где руки).
    """
    px = img.load()
    w, h = img.size
    # клинок вверх
    for i in range(blade_up):
        y = y_hand - 10 - i
        # taper
        half = 3 if i < blade_up - 8 else max(1, 3 - (i - (blade_up - 8)) // 2)
        for dx in range(-half, half + 1):
            col = C_EDGE if abs(dx) == half else (C_BLADE if abs(dx) < 2 else C_BLADE2)
            put(px, cx + dx, y, col, w, h)
        # center shine
        put(px, cx, y, C_EDGE, w, h)
    # tip
    put(px, cx, y_hand - 10 - blade_up, C_EDGE, w, h)
    put(px, cx, y_hand - 11 - blade_up, C_EDGE, w, h)

    # гард
    gy = y_hand - 8
    for dx in range(-10, 11):
        put(px, cx + dx, gy, C_HILT, w, h)
        put(px, cx + dx, gy + 1, C_OUT, w, h)
    for dx in (-10, 10):
        put(px, cx + dx, gy - 1, C_HILT, w, h)
        put(px, cx + dx, gy + 2, C_HILT, w, h)
    # gem
    put(px, cx, gy, C_GEM, w, h)
    put(px, cx, gy + 1, C_GEM, w, h)

    # рукоять (grip) вниз к рукам
    for i in range(12):
        y = gy + 2 + i
        for dx in range(-2, 3):
            put(px, cx + dx, y, C_GRIP if abs(dx) < 2 else C_OUT, w, h)

    # нижний помель (короткий, НЕ второй клинок)
    py = gy + 14
    for dx in range(-4, 5):
        put(px, cx + dx, py, C_HILT, w, h)
    put(px, cx, py + 1, C_HILT, w, h)
    put(px, cx, py + 2, C_OUT, w, h)


def main():
    body = to_transparent(Image.open(BODY))
    # work at higher res for cleaner draw then we pixelize in build pipeline
    # find hand-ish area: middle-left of body content
    bb = body.getbbox()
    x0, y0, x1, y1 = bb
    # меч слева от груди, рукоять на уровне рук (~45% высоты тела)
    cx = x0 + int((x1 - x0) * 0.32)
    y_hand = y0 + int((y1 - y0) * 0.42)

    out = body.copy()
    draw_sword(out, cx, y_hand, blade_up=int((y1 - y0) * 0.42), blade_down=4)

    # solid black bg for consistency
    canvas = Image.new("RGBA", out.size, (0, 0, 0, 255))
    canvas.alpha_composite(out)
    canvas.save(OUT)
    print("saved", OUT, "sword at", cx, y_hand)


if __name__ == "__main__":
    main()
