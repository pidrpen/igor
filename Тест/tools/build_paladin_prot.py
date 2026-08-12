# -*- coding: utf-8 -*-
"""Собрать спрайты паладина Защита из idle + поз скиллов (как шаман).

Ожидает сырьё в: предложения ИИ/_work_paladin_prot/
  idle_raw.jpg
  pose_slash.jpg      → crusader / attack
  pose_judgment.jpg
  pose_throw.jpg      → avengers (щит летит, меч в правой)
  pose_smash.jpg      → hot_r
  pose_bash.jpg       → sot_r
  pose_ground.jpg     → consecrate
  pose_overhead.jpg   → hot_w
  pose_defend.jpg     → ardent
  pose_taunt.jpg
"""
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT, "предложения ИИ", "_work_paladin_prot")
OUT = os.path.join(ROOT, "assets", "sprites", "characters", "paladin_protection")
LOGICAL = 72
SCALE = 5

SKILLS = {
    "crusader": "pose_slash.jpg",
    "judgment": "pose_judgment.jpg",
    "avengers": "pose_throw.jpg",
    "hot_r": "pose_smash.jpg",
    "sot_r": "pose_bash.jpg",
    "consecrate": "pose_ground.jpg",
    "hot_w": "pose_overhead.jpg",
    "ardent": "pose_defend.jpg",
    "taunt": "pose_taunt.jpg",
}


def load_rgba(path):
    return Image.open(path).convert("RGBA")


def to_transparent(img, thr=18):
    img = img.convert("RGBA")
    p = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = p[x, y]
            if r + g + b < thr * 3:
                p[x, y] = (0, 0, 0, 0)
    return img


def content_bbox(img, thr=16):
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
    pad = 4
    return (max(0, minx - pad), max(0, miny - pad), min(w, maxx + pad + 1), min(h, maxy + pad + 1))


def fit_square(img, size=LOGICAL):
    img = to_transparent(img)
    img = img.crop(content_bbox(img))
    w, h = img.size
    scale = min(size / max(w, 1), size / max(h, 1)) * 0.92
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ox = (size - nw) // 2
    oy = size - nh - max(1, size // 16)
    canvas.paste(img, (ox, oy), img)
    return canvas


def pixelize(img, logical=LOGICAL, scale=SCALE, colors=56):
    small = fit_square(img, logical)
    rgb = small.convert("RGB")
    q = rgb.quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert("RGB")
    a = small.split()[-1]
    out = Image.merge("RGBA", (*q.split(), a))
    return out.resize((logical * scale, logical * scale), Image.Resampling.NEAREST)


def lerp(a, b, t):
    return Image.blend(a, b, t)


def save(img, name):
    path = os.path.join(OUT, name)
    img.save(path, "PNG")
    print("wrote", name)


def main():
    idle_src = os.path.join(WORK, "idle_raw.jpg")
    if not os.path.exists(idle_src):
        print("missing", idle_src)
        return
    os.makedirs(OUT, exist_ok=True)
    idle = pixelize(load_rgba(idle_src))
    save(idle, "idle.png")
    save(idle, "idle_00.png")

    slash_src = os.path.join(WORK, "pose_slash.jpg")
    if os.path.exists(slash_src):
        attack = pixelize(load_rgba(slash_src))
        save(attack, "attack.png")
        for i, t in enumerate((0.2, 0.45, 0.75, 1.0, 0.7, 0.3)):
            save(lerp(idle, attack, t), "attack_%02d.png" % i)

    for sid, fname in SKILLS.items():
        src = os.path.join(WORK, fname)
        if not os.path.exists(src):
            print("skip", sid)
            continue
        pose = pixelize(load_rgba(src))
        save(pose, "skill_%s.png" % sid)
        frames = (0.15, 0.4, 0.75, 1.0, 0.65, 0.25)
        for i, t in enumerate(frames):
            save(lerp(idle, pose, t), "skill_%s_%02d.png" % (sid, i))


if __name__ == "__main__":
    main()
