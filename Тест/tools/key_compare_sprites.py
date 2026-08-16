# -*- coding: utf-8 -*-
"""Cut flat black out of compare-room sprites so they don't sit in a square."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPR = ROOT / "assets" / "sprites"


def key_black(im, thr=22):
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r <= thr and g <= thr and b <= thr:
                px[x, y] = (0, 0, 0, 0)
    return im


def save(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "PNG")
    print("wrote", path)


def main():
    mage_dir = SPR / "characters" / "mage_frost_compare"
    for p in sorted(mage_dir.glob("*.png")):
        save(key_black(Image.open(p)), p)

    spirit = SPR / "characters" / "evil_spirit" / "idle_00.png"
    save(key_black(Image.open(spirit)), SPR / "fx" / "dummy_spirit.png")

    sham = SPR / "characters" / "shaman_restoration"
    out = SPR / "characters" / "shaman_aoe_compare"
    save(key_black(Image.open(sham / "idle_00.png")), out / "idle_00.png")
    for i in range(6):
        src = sham / f"attack_{i:02d}.png"
        if src.exists():
            save(key_black(Image.open(src)), out / f"cast_{i:02d}.png")


if __name__ == "__main__":
    main()
