# -*- coding: utf-8 -*-
import re
from pathlib import Path

text = Path(__file__).resolve().parents[1].joinpath("wow-mop-data.js").read_text(encoding="utf-8")
patched = {
    "warrior:arms", "warrior:fury", "warrior:protection",
    "paladin:holy", "paladin:protection", "paladin:retribution",
    "deathknight:blood", "deathknight:unholy",
    "shaman:restoration", "warlock:demonology", "monk:brewmaster",
    "engineer:tinkerer",
}
parts = re.split(r"\n    \{\n      id: '", text)
results = []
for p in parts[1:]:
    cid = p.split("'", 1)[0]
    nm = re.search(r"name: '([^']+)'", p)
    cname = nm.group(1) if nm else cid
    specs = re.findall(
        r"id: '([a-z_]+)', name: '([^']+)', nameEn: '([^']+)', role: '([^']+)'",
        p,
    )
    for sid, sname, sen, role in specs[:10]:
        key = f"{cid}:{sid}"
        results.append((key, cname, sname, role, key in patched))

locked = [r for r in results if not r[4]]
for r in results:
    mark = "OK" if r[4] else "LOCKED"
    print(f"{mark:6} {r[0]:32} {r[1]} / {r[2]} ({r[3]})")
print("---")
print("LOCKED", len(locked))
for r in locked:
    print(r[0])
