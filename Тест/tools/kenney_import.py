"""Импорт Kenney «Isometric Miniature Dungeon» (CC0) для живого боя.

Берёт распакованный архив kenney_isometric-miniature-dungeon.zip, уменьшает всё вдвое
(тайл 256×128 → 128×64 — масштаб живого боя) и кладёт в Тест/assets/kenney/:
  tiles/<имя>_<N|E|S|W>.png   — пол, стены, колонны, мебель
  male/<напр>_<idle|run|act>_<кадр>.png — модель персонажа, 8 направлений
  License.txt                 — CC0, указание автора не обязательно

Запуск: python Тест/tools/kenney_import.py <папка распакованного архива>
"""
import pathlib
import shutil
import sys

from PIL import Image

src = pathlib.Path(sys.argv[1])
dst = pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'kenney'
(dst / 'tiles').mkdir(parents=True, exist_ok=True)
(dst / 'male').mkdir(parents=True, exist_ok=True)


def half(p_in, p_out):
    im = Image.open(p_in).convert('RGBA')
    im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
    im.save(p_out, optimize=True)


n = 0
for p in sorted((src / 'Isometric').glob('*.png')):
    half(p, dst / 'tiles' / p.name)
    n += 1
kinds = {'Idle': 'idle', 'Run': 'run', 'Pickup': 'act'}
m = 0
for p in sorted((src / 'Characters' / 'Male').glob('Male_*_*.png')):
    _, d, rest = p.stem.split('_')
    kind = rest.rstrip('0123456789')
    frame = int(rest[len(kind):])
    half(p, dst / 'male' / f'{d}_{kinds[kind]}_{frame:02d}.png')
    m += 1
shutil.copy(src / 'License.txt', dst / 'License.txt')
print(f'тайлов {n}, кадров персонажа {m} → {dst}')
