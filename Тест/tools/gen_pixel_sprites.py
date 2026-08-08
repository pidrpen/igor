# -*- coding: utf-8 -*-
"""
Настоящие пиксельные спрайты (низкое разрешение → nearest-neighbor scale).
Стиль: 16-bit RPG, палитра ограниченная, контур тёмный.
"""
from PIL import Image
import os

BASE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "assets", "sprites", "characters",
)

# Логический размер спрайта (пиксели арта)
W, H = 48, 48
# Во сколько раз увеличить для экрана (crisp pixels)
SCALE = 6  # 48*6 = 288

# ── Палитры ──────────────────────────────────────────
# spirit
S_OUT = (28, 12, 40, 255)
S_BODY = (88, 42, 130, 255)
S_MID = (120, 70, 170, 255)
S_HI = (170, 120, 220, 255)
S_EYE = (180, 255, 80, 255)
S_EYE2 = (255, 255, 180, 255)
S_CLAW = (140, 255, 120, 255)
S_TONGUE = (220, 60, 100, 255)
S_GLOW = (100, 255, 160, 90)

# paladin
P_OUT = (30, 24, 28, 255)
P_METAL = (170, 165, 155, 255)
P_METAL2 = (130, 125, 115, 255)
P_METAL3 = (210, 205, 190, 255)
P_PINK = (220, 90, 150, 255)
P_PINK2 = (255, 140, 190, 255)
P_GOLD = (230, 190, 70, 255)
P_GOLD2 = (255, 230, 140, 255)
P_SKIN = (220, 180, 140, 255)
P_BOOT = (70, 50, 40, 255)
P_WOOD = (110, 75, 45, 255)
P_CAPE = (160, 40, 90, 255)


def blank():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def put(px, x, y, c):
    if 0 <= x < W and 0 <= y < H and c[3] > 0:
        px[x, y] = c


def rect(px, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            put(px, x, y, c)


def fill_ellipse(px, cx, cy, rx, ry, c):
    for y in range(cy - ry, cy + ry + 1):
        for x in range(cx - rx, cx + rx + 1):
            nx = (x - cx) / max(rx, 1)
            ny = (y - cy) / max(ry, 1)
            if nx * nx + ny * ny <= 1.0:
                put(px, x, y, c)


def outline_blob(px, points, fill, outline=None):
    """points: set of (x,y) filled cells; draw fill then 4-neigh outline."""
    for x, y in points:
        put(px, x, y, fill)
    if outline:
        for x, y in points:
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                n = (x + dx, y + dy)
                if n not in points:
                    put(px, n[0], n[1], outline)


def save_scaled(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    big = img.resize((W * SCALE, H * SCALE), Image.Resampling.NEAREST)
    big.save(path, "PNG")
    print("saved", path)


# ══════════════════════════════════════════════════════
#  EVIL SPIRIT  (faces camera / slightly left-hostile)
# ══════════════════════════════════════════════════════

def spirit_body_points(bob=0, arms=0, attack=0):
    """Return dict layers for spirit at pose params."""
    # bob: vertical shift of body (-2..2)
    # arms: how far claws extend (0..3)
    # attack: lean / stretch toward left (enemy faces player = toward left of sprite? 
    #   enemy is on right side of screen and mirrored with scaleX(-1), so draw facing RIGHT in asset
    #   so after flip it faces left toward player)
    pts = set()
    # body oval
    cx, cy = 24 + attack, 22 + bob
    for y in range(cy - 12, cy + 14):
        for x in range(cx - 10, cx + 11):
            nx = (x - cx) / 10.0
            ny = (y - cy) / 13.0
            if nx * nx + ny * ny <= 1.0:
                pts.add((x, y))
    # head bump
    for y in range(cy - 16, cy - 8):
        for x in range(cx - 8, cx + 9):
            nx = (x - cx) / 8.0
            ny = (y - (cy - 12)) / 6.0
            if nx * nx + ny * ny <= 1.0:
                pts.add((x, y))
    # bottom tendrils
    tend = []
    for i, ox in enumerate([-6, -2, 2, 6]):
        phase = (bob + i) % 3
        for t in range(0, 10 + phase):
            x = cx + ox + (1 if (t + i) % 3 == 0 else 0) * (1 if i % 2 else -1)
            y = cy + 12 + t
            tend.append((x, y))
            pts.add((x, y))
            if t > 4:
                pts.add((x + (1 if i % 2 == 0 else -1), y))
    return pts, cx, cy


def draw_spirit(bob=0, arms=0, attack=0, mouth_open=0):
    img = blank()
    px = img.load()
    pts, cx, cy = spirit_body_points(bob, arms, attack)

    # soft glow (behind)
    for y in range(H):
        for x in range(W):
            dx, dy = x - cx, y - (cy + 2)
            if dx * dx + dy * dy < 200:
                put(px, x, y, S_GLOW)

    outline_blob(px, pts, S_BODY, S_OUT)

    # mid highlight
    for y in range(cy - 8, cy + 6):
        for x in range(cx - 5, cx + 6):
            if (x, y) in pts:
                put(px, x, y, S_MID)
    for y in range(cy - 6, cy + 2):
        for x in range(cx - 3, cx + 4):
            if (x, y) in pts:
                put(px, x, y, S_HI)

    # eyes
    put(px, cx - 4, cy - 4, S_OUT)
    put(px, cx - 3, cy - 4, S_OUT)
    put(px, cx + 2, cy - 4, S_OUT)
    put(px, cx + 3, cy - 4, S_OUT)
    put(px, cx - 4, cy - 3, S_OUT)
    put(px, cx - 3, cy - 3, S_EYE)
    put(px, cx + 2, cy - 3, S_EYE)
    put(px, cx + 3, cy - 3, S_OUT)
    put(px, cx - 3, cy - 2, S_EYE2)
    put(px, cx + 2, cy - 2, S_EYE2)

    # brows angry
    put(px, cx - 5, cy - 6, S_OUT)
    put(px, cx - 4, cy - 5, S_OUT)
    put(px, cx + 3, cy - 5, S_OUT)
    put(px, cx + 4, cy - 6, S_OUT)

    # mouth
    my = cy + 2 + mouth_open
    for x in range(cx - 3, cx + 4):
        put(px, x, my, S_OUT)
    if mouth_open:
        for x in range(cx - 2, cx + 3):
            put(px, x, my + 1, S_TONGUE)
        # fangs
        put(px, cx - 2, my + 1, S_CLAW)
        put(px, cx + 2, my + 1, S_CLAW)
        put(px, cx - 2, my + 2, S_CLAW)
        put(px, cx + 2, my + 2, S_CLAW)

    # arms / claws — reach left (will face player after flip on enemy side)
    # draw arms reaching to the RIGHT in asset (after scaleX -1 on enemy → reaches left toward player)
    # Actually: enemy has CSS scaleX(-1). Player faces right. Enemy should face left.
    # Asset drawn facing right → flip → faces left. Attack should extend toward face direction = RIGHT in asset.
    reach = 6 + arms * 2 + attack
    # right arm (forward)
    ax0, ay0 = cx + 8, cy + 2
    for i in range(reach):
        put(px, ax0 + i, ay0 + (i // 3), S_BODY)
        put(px, ax0 + i, ay0 + 1 + (i // 3), S_OUT)
    # claw tips
    tipx, tipy = ax0 + reach, ay0 + reach // 3
    for dy in (-2, 0, 2):
        put(px, tipx, tipy + dy, S_CLAW)
        put(px, tipx + 1, tipy + dy, S_CLAW)
        put(px, tipx + 2, tipy + dy + (1 if dy == 0 else 0), S_CLAW)

    # left arm (back, smaller)
    for i in range(4 + arms):
        put(px, cx - 9 - i, cy + 3 + i // 2, S_MID)
        put(px, cx - 9 - i, cy + 4 + i // 2, S_OUT)
    lx = cx - 10 - arms
    ly = cy + 5 + arms // 2
    put(px, lx - 1, ly, S_CLAW)
    put(px, lx - 2, ly + 1, S_CLAW)
    put(px, lx - 1, ly + 2, S_CLAW)

    return img


# ══════════════════════════════════════════════════════
#  PROTECTION PALADIN  (faces right toward enemy)
# ══════════════════════════════════════════════════════

def draw_paladin(step=0, lunge=0, hammer=0, shield=0):
    """
    step: idle weight shift 0/1
    lunge: forward x (0..4)
    hammer: swing phase 0 idle, 1 windup, 2 strike, 3 follow
    shield: raise 0..2
    """
    img = blank()
    px = img.load()
    ox = 2 + lunge
    # weight shift
    leg_off = 1 if step else 0

    # cape (behind)
    for y in range(16, 34):
        for x in range(14 + ox, 22 + ox - (y - 16) // 4):
            put(px, x, y + leg_off // 2, P_CAPE)
            put(px, x - 1, y + leg_off // 2, P_OUT)

    # legs
    # left leg
    rect(px, 18 + ox, 30, 21 + ox, 38, P_METAL2)
    rect(px, 17 + ox - leg_off, 38, 22 + ox - leg_off, 42, P_BOOT)
    # right leg
    rect(px, 24 + ox, 30, 27 + ox, 38, P_METAL)
    rect(px, 23 + ox + leg_off, 38, 28 + ox + leg_off, 42, P_BOOT)

    # torso
    rect(px, 17 + ox, 16, 28 + ox, 30, P_METAL)
    rect(px, 18 + ox, 17, 27 + ox, 28, P_METAL3)
    # pink belt / sash
    rect(px, 17 + ox, 24, 28 + ox, 26, P_PINK)
    # chest emblem
    put(px, 22 + ox, 20, P_GOLD)
    put(px, 23 + ox, 20, P_GOLD2)
    put(px, 22 + ox, 21, P_GOLD2)
    put(px, 23 + ox, 21, P_GOLD)

    # shoulders
    rect(px, 14 + ox, 15, 17 + ox, 19, P_METAL3)
    rect(px, 28 + ox, 15, 31 + ox, 19, P_METAL3)
    put(px, 15 + ox, 16, P_PINK2)
    put(px, 29 + ox, 16, P_PINK2)

    # head / helmet
    rect(px, 19 + ox, 8, 26 + ox, 16, P_METAL)
    rect(px, 20 + ox, 9, 25 + ox, 14, P_METAL3)
    # visor
    rect(px, 20 + ox, 12, 25 + ox, 13, P_OUT)
    put(px, 21 + ox, 12, P_GOLD2)
    put(px, 24 + ox, 12, P_GOLD2)
    # plume
    put(px, 22 + ox, 6, P_PINK)
    put(px, 23 + ox, 5, P_PINK2)
    put(px, 23 + ox, 6, P_PINK)
    put(px, 24 + ox, 6, P_PINK)
    put(px, 23 + ox, 7, P_GOLD)

    # outline helmet top
    for x in range(19 + ox, 27 + ox):
        put(px, x, 7, P_OUT)

    # LEFT arm + hammer (back / swinging)
    # hammer pivot near left shoulder
    hx, hy = 12 + ox, 20
    if hammer == 0:
        # idle down
        rect(px, 12 + ox, 18, 15 + ox, 26, P_METAL2)
        # handle
        rect(px, 10 + ox, 26, 12 + ox, 34, P_WOOD)
        # head
        rect(px, 7 + ox, 24, 14 + ox, 28, P_METAL3)
        put(px, 8 + ox, 25, P_GOLD)
    elif hammer == 1:
        # windup up-back
        rect(px, 11 + ox, 12, 14 + ox, 18, P_METAL2)
        rect(px, 9 + ox, 6, 12 + ox, 14, P_WOOD)
        rect(px, 6 + ox, 4, 14 + ox, 8, P_METAL3)
        put(px, 8 + ox, 5, P_GOLD)
    elif hammer == 2:
        # strike forward
        rect(px, 26 + ox, 18, 32 + ox, 21, P_METAL2)
        rect(px, 32 + ox, 17, 38 + ox, 20, P_WOOD)
        rect(px, 36 + ox, 14, 42 + ox, 22, P_METAL3)
        put(px, 38 + ox, 16, P_GOLD2)
        put(px, 39 + ox, 17, P_GOLD)
    else:
        # follow-through
        rect(px, 24 + ox, 22, 30 + ox, 25, P_METAL2)
        rect(px, 30 + ox, 24, 35 + ox, 27, P_WOOD)
        rect(px, 33 + ox, 22, 40 + ox, 28, P_METAL3)

    # RIGHT arm + shield (forward)
    sy = 16 - shield
    # arm
    rect(px, 28 + ox, 18, 32 + ox, 24, P_METAL2)
    # tower shield
    rect(px, 31 + ox, sy, 38 + ox, sy + 16, P_METAL)
    rect(px, 32 + ox, sy + 1, 37 + ox, sy + 15, P_METAL3)
    rect(px, 33 + ox, sy + 3, 36 + ox, sy + 12, P_PINK)
    # sun emblem
    put(px, 34 + ox, sy + 6, P_GOLD)
    put(px, 35 + ox, sy + 6, P_GOLD2)
    put(px, 34 + ox, sy + 7, P_GOLD2)
    put(px, 35 + ox, sy + 7, P_GOLD)
    # shield outline
    for y in range(sy, sy + 17):
        put(px, 31 + ox, y, P_OUT)
        put(px, 38 + ox, y, P_OUT)
    for x in range(31 + ox, 39 + ox):
        put(px, x, sy, P_OUT)
        put(px, x, sy + 16, P_OUT)

    # feet outline polish
    for x in range(17 + ox - leg_off, 23 + ox - leg_off):
        put(px, x, 42, P_OUT)
    for x in range(23 + ox + leg_off, 29 + ox + leg_off):
        put(px, x, 42, P_OUT)

    return img


def main():
    # ── Spirit idle: float bob ──
    spirit_dir = os.path.join(BASE, "evil_spirit")
    idle_bobs = [0, -1, -2, -1, 0, 1, 2, 1]
    for i, b in enumerate(idle_bobs):
        save_scaled(
            draw_spirit(bob=b, arms=i % 2, attack=0, mouth_open=0),
            os.path.join(spirit_dir, f"idle_{i:02d}.png"),
        )
    # spirit attack: lunge + arms + mouth
    atk = [
        dict(bob=0, arms=0, attack=0, mouth_open=0),
        dict(bob=-1, arms=1, attack=1, mouth_open=1),
        dict(bob=0, arms=2, attack=3, mouth_open=1),
        dict(bob=1, arms=3, attack=5, mouth_open=1),
        dict(bob=0, arms=2, attack=3, mouth_open=1),
        dict(bob=0, arms=0, attack=1, mouth_open=0),
    ]
    for i, p in enumerate(atk):
        save_scaled(draw_spirit(**p), os.path.join(spirit_dir, f"attack_{i:02d}.png"))
    save_scaled(draw_spirit(), os.path.join(spirit_dir, "idle.png"))
    save_scaled(draw_spirit(arms=3, attack=5, mouth_open=1), os.path.join(spirit_dir, "attack.png"))

    # ── Paladin idle: weight shift + shield breathe ──
    pal_dir = os.path.join(BASE, "paladin_protection")
    idle_p = [
        dict(step=0, lunge=0, hammer=0, shield=0),
        dict(step=0, lunge=0, hammer=0, shield=1),
        dict(step=1, lunge=0, hammer=0, shield=1),
        dict(step=1, lunge=0, hammer=0, shield=0),
        dict(step=0, lunge=0, hammer=0, shield=0),
        dict(step=0, lunge=0, hammer=0, shield=0),
        dict(step=1, lunge=0, hammer=0, shield=1),
        dict(step=0, lunge=0, hammer=0, shield=0),
    ]
    for i, p in enumerate(idle_p):
        save_scaled(draw_paladin(**p), os.path.join(pal_dir, f"idle_{i:02d}.png"))
    # attack: windup → strike → recover
    atk_p = [
        dict(step=0, lunge=0, hammer=0, shield=0),
        dict(step=0, lunge=0, hammer=1, shield=1),
        dict(step=0, lunge=2, hammer=1, shield=2),
        dict(step=1, lunge=4, hammer=2, shield=1),
        dict(step=1, lunge=3, hammer=3, shield=0),
        dict(step=0, lunge=1, hammer=0, shield=0),
    ]
    for i, p in enumerate(atk_p):
        save_scaled(draw_paladin(**p), os.path.join(pal_dir, f"attack_{i:02d}.png"))
    save_scaled(draw_paladin(), os.path.join(pal_dir, "idle.png"))
    save_scaled(draw_paladin(lunge=4, hammer=2, shield=1), os.path.join(pal_dir, "attack.png"))
    print("pixel sprites done", W, "x", H, "x", SCALE)


if __name__ == "__main__":
    main()
