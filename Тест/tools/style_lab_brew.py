# -*- coding: utf-8 -*-
"""Five drawing treatments of the brewmaster card portrait (style-lab)."""
from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance, ImageOps, ImageDraw

SRC = Path(__file__).resolve().parents[1] / "assets" / "portraits" / "specs" / "monk_brewmaster.png"
OUT = Path(__file__).resolve().parents[1] / "assets" / "style-lab" / "monk" / "brewmaster"


def save(im, name):
    OUT.mkdir(parents=True, exist_ok=True)
    p = OUT / name
    im.convert("RGB").save(p, "PNG")
    print("wrote", p, im.size)


def pixel(im):
    q = im.quantize(colors=16, method=Image.Quantize.MEDIANCUT).convert("RGB")
    small = q.resize((56, 56), Image.Resampling.BOX)
    return small.resize(im.size, Image.Resampling.NEAREST)


def cartoon(im):
    q = im.quantize(colors=14, method=Image.Quantize.MEDIANCUT).convert("RGB")
    q = ImageEnhance.Color(q).enhance(1.2)
    g = ImageOps.grayscale(im)
    edges = g.filter(ImageFilter.FIND_EDGES)
    edges = ImageOps.autocontrast(edges).point(lambda x: 255 if x > 40 else 0)
    edges = edges.filter(ImageFilter.MaxFilter(3))
    out = q.copy()
    mask = edges.point(lambda x: 255 if x > 0 else 0)
    out.paste(Image.new("RGB", im.size, (22, 16, 12)), mask=mask)
    return out


def ink(im):
    g = ImageOps.grayscale(im)
    g = ImageOps.autocontrast(g)
    paper = Image.new("RGB", im.size, (214, 198, 168))
    wash = ImageEnhance.Color(im).enhance(0.25)
    wash = ImageEnhance.Contrast(wash).enhance(1.15)
    wash = Image.blend(wash.convert("RGB"), paper, 0.45)
    edges = g.filter(ImageFilter.FIND_EDGES).point(lambda x: 255 if x > 22 else 0)
    edges = edges.filter(ImageFilter.SMOOTH_MORE)
    lined = ImageOps.invert(edges).convert("RGB")
    return Image.composite(wash, Image.new("RGB", im.size, (42, 32, 24)), ImageOps.invert(edges))


def flat(im):
    q = im.quantize(colors=8, method=Image.Quantize.MEDIANCUT).convert("RGB")
    q = q.filter(ImageFilter.SMOOTH)
    return ImageEnhance.Color(q).enhance(1.15)


def cel(im):
    q = im.quantize(colors=24, method=Image.Quantize.MEDIANCUT).convert("RGB")
    q = ImageEnhance.Color(q).enhance(1.25)
    q = ImageEnhance.Contrast(q).enhance(1.12)
    q = q.filter(ImageFilter.UnsharpMask(radius=1.4, percent=140, threshold=2))
    return q


def main():
    im = Image.open(SRC).convert("RGB")
    save(im, "00_card.png")
    save(pixel(im), "01_pixel.png")
    save(cartoon(im), "02_outline.png")
    save(ink(im), "03_ink.png")
    save(flat(im), "04_flat.png")
    save(cel(im), "05_cel.png")


if __name__ == "__main__":
    main()
