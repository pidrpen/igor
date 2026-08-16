# -*- coding: utf-8 -*-
"""
Один вход после правки кита.

  python tools/run_rotations.py
      честный урон 1/5/10 по живым class-balance/* → консоль
      + листы «Честный урон» / «Честный урон ротации» в сравнение_ролей.xlsx

  python tools/run_rotations.py --полная
      то же, плюс пересобрать всю книгу (старый ДД, честный сейв, честный хил)

Киты читаются с диска. Браузер и бой не нужны.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def main():
    full = "--полная" in sys.argv
    if full:
        subprocess.check_call([sys.executable, str(HERE / "build_role_compare.py")])
    extra = [a for a in sys.argv[1:] if a != "--полная"]
    subprocess.check_call([sys.executable, str(HERE / "dps_honest.py"), *extra])


if __name__ == "__main__":
    main()
