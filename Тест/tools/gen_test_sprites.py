# -*- coding: utf-8 -*-
"""Generate simple placeholder sprites for the animation test room."""
from PIL import Image, ImageDraw
import os

BASE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "assets", "sprites", "characters",
)
TRANSPARENT = (0, 0, 0, 0)


def new_canvas(w=256, h=256):
    return Image.new("RGBA", (w, h), TRANSPARENT)


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG")
    print("saved", path)


def draw_evil_spirit(offset_y=0, arms_out=0, eyes_glow=1.0):
    img = new_canvas()
    d = ImageDraw.Draw(img)
    cx, cy = 128, 118 + offset_y

    for i in range(3):
        col = (80, 40, 120, 50 - i * 12)
        d.ellipse([cx - 70 + i * 8, cy - 90 + i * 6, cx + 70 - i * 8, cy + 90 - i * 6], fill=col)

    body = [
        (cx, cy - 78),
        (cx + 48, cy - 40),
        (cx + 55, cy + 10),
        (cx + 40, cy + 50),
        (cx + 25, cy + 75),
        (cx + 8, cy + 95),
        (cx, cy + 70),
        (cx - 8, cy + 95),
        (cx - 25, cy + 75),
        (cx - 40, cy + 50),
        (cx - 55, cy + 10),
        (cx - 48, cy - 40),
    ]
    d.polygon(body, fill=(72, 28, 110, 230))
    d.ellipse([cx - 28, cy - 50, cx + 28, cy + 20], fill=(140, 80, 200, 180))
    d.ellipse([cx - 16, cy - 35, cx + 16, cy + 5], fill=(200, 140, 255, 200))

    eg = int(80 + 120 * eyes_glow)
    eye_col = (eg, 255, 120, 255)
    d.ellipse([cx - 28, cy - 48, cx - 8, cy - 28], fill=(20, 10, 30, 255))
    d.ellipse([cx + 8, cy - 48, cx + 28, cy - 28], fill=(20, 10, 30, 255))
    d.ellipse([cx - 24, cy - 44, cx - 12, cy - 32], fill=eye_col)
    d.ellipse([cx + 12, cy - 44, cx + 24, cy - 32], fill=eye_col)
    d.arc([cx - 18, cy - 18, cx + 18, cy + 12], 20, 160, fill=(40, 255, 100, 220), width=3)
    d.polygon([(cx - 10, cy - 2), (cx - 6, cy + 14), (cx - 2, cy - 2)], fill=(220, 255, 200, 255))
    d.polygon([(cx + 2, cy - 2), (cx + 6, cy + 14), (cx + 10, cy - 2)], fill=(220, 255, 200, 255))

    ao = arms_out
    d.line([(cx - 40, cy - 5), (cx - 70 - ao, cy + 25)], fill=(100, 50, 150, 230), width=10)
    d.ellipse([cx - 82 - ao, cy + 18, cx - 58 - ao, cy + 42], fill=(90, 40, 140, 240))
    for dx in (-6, 0, 6):
        d.polygon(
            [(cx - 70 - ao + dx, cy + 38), (cx - 74 - ao + dx, cy + 58), (cx - 66 - ao + dx, cy + 38)],
            fill=(180, 255, 140, 255),
        )
    d.line([(cx + 40, cy - 5), (cx + 70 + ao, cy + 25)], fill=(100, 50, 150, 230), width=10)
    d.ellipse([cx + 58 + ao, cy + 18, cx + 82 + ao, cy + 42], fill=(90, 40, 140, 240))
    for dx in (-6, 0, 6):
        d.polygon(
            [(cx + 70 + ao + dx, cy + 38), (cx + 74 + ao + dx, cy + 58), (cx + 66 + ao + dx, cy + 38)],
            fill=(180, 255, 140, 255),
        )

    for i, ox in enumerate([-30, -10, 10, 30]):
        d.polygon(
            [
                (cx + ox - 8, cy + 70),
                (cx + ox + 8, cy + 70),
                (cx + ox + 4 + (i % 2) * 6, cy + 110 + i * 3),
                (cx + ox - 4, cy + 100),
            ],
            fill=(60, 20, 100, 180),
        )
    return img


def draw_paladin(offset_x=0, shield_up=0, hammer_angle=0):
    img = new_canvas()
    d = ImageDraw.Draw(img)
    cx, cy = 128 + offset_x, 130

    d.rectangle([cx - 28, cy + 30, cx - 8, cy + 95], fill=(160, 150, 140, 255))
    d.rectangle([cx + 8, cy + 30, cx + 28, cy + 95], fill=(160, 150, 140, 255))
    d.rectangle([cx - 32, cy + 88, cx - 4, cy + 102], fill=(90, 70, 50, 255))
    d.rectangle([cx + 4, cy + 88, cx + 32, cy + 102], fill=(90, 70, 50, 255))

    d.rounded_rectangle([cx - 38, cy - 35, cx + 38, cy + 40], radius=8, fill=(200, 185, 150, 255))
    d.rectangle([cx - 38, cy - 10, cx + 38, cy - 2], fill=(245, 140, 186, 255))
    d.ellipse([cx - 12, cy - 20, cx + 12, cy + 8], fill=(255, 220, 120, 255))
    d.ellipse([cx - 6, cy - 14, cx + 6, cy + 2], fill=(255, 250, 200, 255))

    d.ellipse([cx - 52, cy - 42, cx - 22, cy - 12], fill=(210, 195, 160, 255))
    d.ellipse([cx + 22, cy - 42, cx + 52, cy - 12], fill=(210, 195, 160, 255))
    d.ellipse([cx - 48, cy - 38, cx - 26, cy - 16], fill=(245, 140, 186, 200))
    d.ellipse([cx + 26, cy - 38, cx + 48, cy - 16], fill=(245, 140, 186, 200))

    d.ellipse([cx - 24, cy - 78, cx + 24, cy - 30], fill=(180, 170, 155, 255))
    d.rectangle([cx - 26, cy - 58, cx + 26, cy - 48], fill=(140, 130, 110, 255))
    d.rectangle([cx - 16, cy - 62, cx + 16, cy - 52], fill=(255, 240, 160, 255))
    d.ellipse([cx - 8, cy - 72, cx + 8, cy - 58], fill=(255, 250, 200, 230))

    sy = cy - 20 - shield_up
    shield = [
        (cx + 40, sy - 40),
        (cx + 78, sy - 30),
        (cx + 82, sy + 35),
        (cx + 70, sy + 70),
        (cx + 48, sy + 75),
        (cx + 36, sy + 40),
    ]
    d.polygon(shield, fill=(170, 160, 145, 255))
    d.polygon(
        [
            (cx + 48, sy - 28),
            (cx + 72, sy - 20),
            (cx + 74, sy + 30),
            (cx + 55, sy + 55),
            (cx + 44, sy + 25),
        ],
        fill=(245, 140, 186, 230),
    )
    d.ellipse([cx + 52, sy - 5, cx + 68, sy + 12], fill=(255, 220, 100, 255))
    d.ellipse([cx + 56, sy - 1, cx + 64, sy + 8], fill=(255, 250, 200, 255))

    hx, hy = cx - 55, cy - 10 + hammer_angle
    d.line([(cx - 40, cy - 15), (hx, hy + 20)], fill=(180, 170, 150, 255), width=12)
    d.rounded_rectangle([hx - 18, hy - 8, hx + 18, hy + 28], radius=3, fill=(140, 130, 120, 255))
    d.rectangle([hx - 8, hy + 28, hx + 8, hy + 55], fill=(100, 80, 55, 255))
    d.ellipse([hx - 10, hy - 12, hx + 10, hy + 0], fill=(255, 220, 120, 200))

    d.polygon(
        [(cx - 20, cy - 30), (cx + 20, cy - 30), (cx + 15, cy + 50), (cx - 30, cy + 55)],
        fill=(180, 60, 120, 120),
    )
    return img


def main():
    spirit_dir = os.path.join(BASE, "evil_spirit")
    for i, oy in enumerate([0, -4, -8, -4, 0, 4, 6, 4]):
        save(
            draw_evil_spirit(offset_y=oy, arms_out=(i % 3), eyes_glow=0.7 + 0.3 * (i % 2)),
            os.path.join(spirit_dir, f"idle_{i:02d}.png"),
        )
    for i, (oy, ao, eg) in enumerate(
        [(0, 0, 1), (-2, 8, 1.2), (0, 18, 1.4), (4, 22, 1.5), (2, 14, 1.2), (0, 4, 1)]
    ):
        save(
            draw_evil_spirit(offset_y=oy, arms_out=ao, eyes_glow=eg),
            os.path.join(spirit_dir, f"attack_{i:02d}.png"),
        )
    save(draw_evil_spirit(), os.path.join(spirit_dir, "idle.png"))
    save(draw_evil_spirit(arms_out=20, eyes_glow=1.5), os.path.join(spirit_dir, "attack.png"))

    pal_dir = os.path.join(BASE, "paladin_protection")
    for i, (ox, su, ha) in enumerate(
        [(0, 0, 0), (0, 2, -2), (0, 0, 0), (0, -1, 1), (0, 0, 0), (0, 1, -1), (0, 0, 0), (0, 0, 2)]
    ):
        save(
            draw_paladin(offset_x=ox, shield_up=su, hammer_angle=ha),
            os.path.join(pal_dir, f"idle_{i:02d}.png"),
        )
    for i, (ox, su, ha) in enumerate(
        [(0, 0, 0), (8, 10, -15), (20, 5, -30), (28, 0, -20), (16, 8, -10), (4, 4, 0)]
    ):
        save(
            draw_paladin(offset_x=ox, shield_up=su, hammer_angle=ha),
            os.path.join(pal_dir, f"attack_{i:02d}.png"),
        )
    save(draw_paladin(), os.path.join(pal_dir, "idle.png"))
    save(draw_paladin(offset_x=24, shield_up=5, hammer_angle=-25), os.path.join(pal_dir, "attack.png"))
    print("done")


if __name__ == "__main__":
    main()
