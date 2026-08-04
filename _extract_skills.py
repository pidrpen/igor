# -*- coding: utf-8 -*-
"""Собрать скиллы из class-balance в ПРАВКИ-СКИЛЛОВ.md (для ручных пометок)."""
import re
import json
from pathlib import Path

DIR = Path("class-balance")
OUT_MD = Path("ПРАВКИ-СКИЛЛОВ.md")
OUT_JSON = Path("_skills_extract.json")
# старый файл — перезапишем/удалим при генерации
OLD_MD = Path("SKILL-CHANGES.md")

CLASS_FROM_FILE = {
    "warrior-abilities.js": ("warrior", "Воин"),
    "paladin-abilities.js": ("paladin", "Паладин"),
    "hunter-abilities.js": ("hunter", "Охотник"),
    "rogue-abilities.js": ("rogue", "Разбойник"),
    "priest-abilities.js": ("priest", "Жрец"),
    "deathknight-abilities.js": ("deathknight", "Рыцарь смерти"),
    "shaman-abilities.js": ("shaman", "Шаман"),
    "mage-abilities.js": ("mage", "Маг"),
    "warlock-abilities.js": ("warlock", "Чернокнижник"),
    "monk-abilities.js": ("monk", "Монах"),
    "druid-abilities.js": ("druid", "Друид"),
}

ROLE_RU = {
    "dps": "ДПС",
    "tank": "танк",
    "healer": "хил",
}

TYPE_RU = {
    "damage": "урон",
    "aoe": "АоЕ",
    "cast_aoe": "каст-АоЕ",
    "dot": "ДоТ",
    "heal": "хил",
    "heal_aoe": "хил-АоЕ",
    "buff": "бафф",
    "debuff": "дебафф",
    "shield": "щит",
    "interrupt": "кик",
    "taunt": "таунт",
    "dispel": "диспел",
    "purge": "пург",
    "cc": "контроль",
    "cleanse": "клинс",
    "hot": "ХоТ",
}


def extract_a_calls(text):
    results = []
    i = 0
    while True:
        m = re.search(r"\bA\s*\(\s*\{", text[i:])
        if not m:
            break
        start_brace = i + m.end() - 1
        depth = 0
        j = start_brace
        while j < len(text):
            if text[j] == "{":
                depth += 1
            elif text[j] == "}":
                depth -= 1
                if depth == 0:
                    body = text[start_brace + 1 : j]
                    results.append((start_brace, parse_fields(body)))
                    i = j + 1
                    break
            j += 1
        else:
            break
    return results


def grab(body, key):
    m = re.search(rf"\b{key}\s*:\s*'((?:\\'|[^'])*)'", body)
    if m:
        return m.group(1).replace("\\'", "'")
    m = re.search(rf'\b{key}\s*:\s*"((?:\\"|[^"])*)"', body)
    if m:
        return m.group(1).replace('\\"', '"')
    m = re.search(rf"\b{key}\s*:\s*(-?[0-9]+(?:\.[0-9]+)?)", body)
    if m:
        return m.group(1)
    m = re.search(rf"\b{key}\s*:\s*(null|true|false)", body)
    if m:
        return m.group(1)
    return None


def parse_fields(body):
    fields = {}
    mapping = [
        ("id", ["id"]),
        ("n", ["n", "name"]),
        ("en", ["en", "nameEn"]),
        ("i", ["i", "icon"]),
        ("c", ["c", "cost"]),
        ("g", ["g", "gen"]),
        ("cs", ["cs", "costSec"]),
        ("gs", ["gs", "genSec"]),
        ("cd", ["cd"]),
        ("t", ["t", "type"]),
        ("p", ["p", "power"]),
        ("d", ["d", "desc"]),
        ("sid", ["sid", "spellId"]),
        ("rp", ["rp", "genRunic"]),
    ]
    for out_key, aliases in mapping:
        for a in aliases:
            v = grab(body, a)
            if v is not None:
                fields[out_key] = v
                break
    m = re.search(r"\br\s*:\s*(\{[^}]*\})", body)
    if m:
        fields["r"] = re.sub(r"\s+", " ", m.group(1)).strip()
    return fields


def find_specs(text):
    specs = []
    for m in re.finditer(
        r"id:\s*'([a-z_]+)'\s*,\s*name:\s*'([^']*)'(?:\s*,\s*nameEn:\s*'([^']*)')?\s*,\s*role:\s*'([^']*)'",
        text,
    ):
        specs.append(
            {
                "id": m.group(1),
                "name": m.group(2),
                "nameEn": m.group(3) or "",
                "role": m.group(4),
                "pos": m.start(),
            }
        )
    return specs


def fmt_now_ru(ab):
    parts = []
    t = ab.get("t")
    if t:
        parts.append(f"тип={TYPE_RU.get(t, t)}")
    if ab.get("p") is not None:
        parts.append(f"сила={ab['p']}")
    if ab.get("c") and ab["c"] not in ("0", 0, None):
        parts.append(f"цена={ab['c']}")
    if ab.get("g") and ab["g"] not in ("0", 0, None):
        parts.append(f"генерация={ab['g']}")
    if ab.get("cs") and ab["cs"] not in ("0", 0, None):
        parts.append(f"цена2={ab['cs']}")
    if ab.get("gs") and ab["gs"] not in ("0", 0, None):
        parts.append(f"ген2={ab['gs']}")
    if ab.get("rp") and ab["rp"] not in ("0", 0, None):
        parts.append(f"сила_рун+={ab['rp']}")
    if ab.get("r"):
        r = ab["r"]
        # человекочитаемые руны
        r_ru = r.replace("b:", "кровь:").replace("f:", "лёд:").replace("u:", "нечест:").replace("any:", "любая:")
        parts.append(f"руны={r_ru}")
    if ab.get("cd") is not None:
        parts.append(f"кд={ab['cd']}")
    return ", ".join(parts) if parts else "—"


def esc_cell(s):
    if s is None:
        return "—"
    s = str(s).replace("\n", " ").replace("|", "\\|").strip()
    return s if s else "—"


def main():
    all_specs = []
    for f in sorted(DIR.glob("*-abilities.js")):
        text = f.read_text(encoding="utf-8")
        class_id, class_name = CLASS_FROM_FILE.get(f.name, (f.stem, f.stem))
        specs = find_specs(text)
        a_calls = extract_a_calls(text)

        for si, sp in enumerate(specs):
            if sp["role"] not in ("dps", "tank", "healer"):
                continue
            end = specs[si + 1]["pos"] if si + 1 < len(specs) else len(text)
            start = sp["pos"]
            abs_ = [
                fields
                for pos, fields in a_calls
                if start <= pos < end and fields.get("id")
            ]
            seen = set()
            ab_list = []
            for ab in abs_:
                if ab["id"] in seen:
                    continue
                seen.add(ab["id"])
                ab_list.append(ab)
            all_specs.append(
                {
                    "file": f.name,
                    "classId": class_id,
                    "className": class_name,
                    "specId": sp["id"],
                    "specName": sp["name"],
                    "role": sp["role"],
                    "abilities": ab_list,
                }
            )

    lines = []
    lines.append("# Правки скиллов — Mythic Key (MoP lite)")
    lines.append("")
    lines.append("Заполни колонку **→ надо** напротив скилла. Когда готово — напиши «примени правки скиллов».")
    lines.append("")
    lines.append("## Как заполнять")
    lines.append("")
    lines.append("| Что хочешь | Пример |")
    lines.append("|------------|--------|")
    lines.append("| Цифры | `сила=1.4, цена=20, кд=2, генерация=12` |")
    lines.append("| Тип | `тип=АоЕ` / `тип=урон` / `тип=хил` / `тип=ДоТ` / `тип=кик` … |")
    lines.append("| Убрать скилл | `УБРАТЬ` |")
    lines.append("| Новый скилл | в конце спека: `### НОВЫЙ id — Название` и строка `→ надо: …` |")
    lines.append("| Механика | `МЕХАНИКА: казнь с 20% ХП, вампиризм 15%` |")
    lines.append("| Без правок | пусто, `—` или `ok` |")
    lines.append("| Свободный текст | `слабее, кд 3, только по танку` |")
    lines.append("")
    lines.append("**Подписи в «сейчас»:**")
    lines.append("")
    lines.append("- **тип** — что делает скилл в бою")
    lines.append("- **сила** — множитель (урон/хил/щит)")
    lines.append("- **цена** — расход основного ресурса (ярость, мана, энергия…)")
    lines.append("- **генерация** — сколько ресурса даёт")
    lines.append("- **цена2 / ген2** — второй ресурс (энергия Света, комбо, ци, осколки…)")
    lines.append("- **кд** — перезарядка в ходах")
    lines.append("- **руны / сила_рун** — для рыцаря смерти")
    lines.append("")
    lines.append("Данные берутся из `class-balance/*-abilities.js`.")
    lines.append("Особая механика (казнь, кик, вампиризм и т.п.) — ещё и в `index.html`.")
    lines.append("")
    lines.append("---")
    lines.append("")

    by_class = {}
    for s in all_specs:
        by_class.setdefault(s["classId"], []).append(s)

    order = [
        "warrior",
        "paladin",
        "hunter",
        "rogue",
        "priest",
        "deathknight",
        "shaman",
        "mage",
        "warlock",
        "monk",
        "druid",
    ]
    total_ab = 0
    for cid in order:
        specs = by_class.get(cid, [])
        if not specs:
            continue
        cname = specs[0]["className"]
        src = specs[0]["file"]
        lines.append(f"## {cname}")
        lines.append("")
        lines.append(f"_файл: `{src}` · id: `{cid}`_")
        lines.append("")
        for sp in specs:
            role = ROLE_RU.get(sp["role"], sp["role"])
            lines.append(f"### {sp['specName']} · {role}")
            lines.append("")
            lines.append(f"_id спека: `{sp['specId']}`_")
            lines.append("")
            for ab in sp["abilities"]:
                total_ab += 1
                name = ab.get("n") or ab.get("en") or ab["id"]
                icon = ab.get("i") or ""
                head = f"{icon} **{name}**" if icon else f"**{name}**"
                en = ab.get("en") or ""
                if en and en != name:
                    head += f" · _{en}_"
                head += f" · `{ab['id']}`"
                lines.append(head)
                lines.append("")
                desc = ab.get("d") or "—"
                lines.append(f"- **Описание:** {esc_cell(desc)}")
                lines.append(f"- **Сейчас:** {fmt_now_ru(ab)}")
                lines.append("- **→ Надо:** ")
                lines.append("")
            lines.append("**Весь спек (по желанию):**")
            lines.append("")
            lines.append("> ")
            lines.append("")
            lines.append("---")
            lines.append("")

    lines.append("## Общие правила / заметки")
    lines.append("")
    lines.append("Сюда — то, что касается всех классов сразу:")
    lines.append("«все казни с 20%», «хилы −10%», «АоЕ дороже на 5» и т.п.")
    lines.append("")
    lines.append("> ")
    lines.append("")

    OUT_MD.write_text("\n".join(lines), encoding="utf-8")
    OUT_JSON.write_text(json.dumps(all_specs, ensure_ascii=False, indent=2), encoding="utf-8")

    if OLD_MD.exists():
        OLD_MD.unlink()
        print(f"removed {OLD_MD}")

    print(f"specs={len(all_specs)} abilities={total_ab}")
    print(f"wrote {OUT_MD}")


if __name__ == "__main__":
    main()
