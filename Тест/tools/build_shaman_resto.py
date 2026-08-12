# -*- coding: utf-8 -*-
"""Собрать спрайты шамана Исцеление из idle + поз скиллов."""
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT, "предложения ИИ", "_work_shaman")
OUT = os.path.join(ROOT, "assets", "sprites", "characters", "shaman_restoration")
LOGICAL = 72
SCALE = 5

SKILLS = {
    "riptide": "pose_riptide.jpg",
    "hw": "pose_wave.jpg",
    "chw": "pose_surge.jpg",
    "ch": "pose_chain.jpg",
    "hs": "pose_rain.jpg",
    "hst": "pose_totem.jpg",
    "spirit_link": "pose_spirit_link.jpg",
    "unleash": "pose_unleash.jpg",
    "flame_shock": "pose_flame.jpg",
    "kick": "pose_kick.jpg",
    "party_dispel": "pose_dispel.jpg",
    "party_purge": "pose_purge.jpg",
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
    os.makedirs(OUT, exist_ok=True)
    idle = pixelize(load_rgba(os.path.join(WORK, "idle_raw.jpg")))
    save(idle, "idle.png")
    save(idle, "idle_00.png")

    attack = pixelize(load_rgba(os.path.join(WORK, "pose_riptide.jpg")))
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
