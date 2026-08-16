# -*- coding: utf-8 -*-
"""Generate unique per-spec trinkets for the test shop (mechanics-flavored)."""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "js", "shop", "shop-trinkets-data.js")

# classId, specId, name, icon, role, special mechanic
SPECS = [
    # warrior
    ("warrior", "arms", "Оружие", "⚔️", "dps", "bleed", "Усиливает кровотечения: DoT +12% пока надет"),
    ("warrior", "fury", "Неистовство", "🔥", "dps", "rage_on_crit", "Крит даёт +5 ярости (раз в ход)"),
    ("warrior", "protection", "Защита", "🛡️", "tank", "block_stack", "После блока +3% брони (стак до 3)"),
    # paladin
    ("paladin", "holy", "Свет", "🌟", "healer", "holy_shock_refund", "Шок небес: 20% вернуть ману"),
    ("paladin", "protection", "Защита", "🛡️", "tank", "consecrate_armor", "На Освящении +8% брони"),
    ("paladin", "retribution", "Воздаяние", "🔨", "dps", "wings_crit", "Под Гневом карателя +5% крита"),
    # hunter
    ("hunter", "beast_mastery", "ПЗ", "🐺", "dps", "pet_damage", "Урон питомца +15%"),
    ("hunter", "marksmanship", "Стрельба", "🎯", "dps", "aimed_focus", "Прицельный: −8 концентрации"),
    ("hunter", "survival", "Выживание", "💣", "dps", "explosive_dot", "Взрывной выстрел DoT +1т"),
    # rogue
    ("rogue", "assassination", "Ликвидация", "🗡️", "dps", "poison_tick", "Яды тикают на +1 ход"),
    ("rogue", "combat", "Бой", "⚔️", "dps", "energy_refund", "После finisher 15% вернуть 20 энергии"),
    ("rogue", "subtlety", "Скрытность", "👤", "dps", "ambush_bonus", "Внезапный удар +12% урона"),
    # priest
    ("priest", "discipline", "Послушание", "🛡️", "healer", "atonement_amp", "Atonement-урон/хил +10%"),
    ("priest", "holy", "Свет", "✨", "healer", "renew_hot", "Обновление HoT +1т"),
    ("priest", "shadow", "Тьма", "🌑", "dps", "orb_gen", "Взрыв разума: +1 к шансу орба"),
    # deathknight
    ("deathknight", "blood", "Кровь", "🩸", "tank", "ds_heal", "Удар смерти хил +12%"),
    ("deathknight", "frost", "Лёд", "❄️", "dps", "rime_proc", "Воющий ветер: 15% не тратить руну"),
    ("deathknight", "unholy", "Нечестивость", "🧟", "dps", "pet_ghoul", "Урон вурдалака +18%"),
    # shaman
    ("shaman", "elemental", "Стихии", "⚡", "dps", "lava_burst_crit", "Выброс лавы +10% крита"),
    ("shaman", "enhancement", "Совершенствование", "🌪️", "dps", "stormstrike_chain", "Удар бури: 20% второй удар 40%"),
    ("shaman", "restoration", "Исцеление", "💧", "healer", "riptide_hot", "Быстрина HoT +1т"),
    # mage
    ("mage", "arcane", "Тайная", "🔮", "dps", "arcane_charge", "Чародейский взрыв: +1 к стаку (data)"),
    ("mage", "fire", "Огонь", "🔥", "dps", "pyro_heat", "Огненный столб: крит +8%"),
    ("mage", "frost", "Лёд", "🧊", "dps", "lance_shatter", "Ледяное копьё по заморозке +15%"),
    # warlock
    ("warlock", "affliction", "Колдовство", "🌑", "dps", "dot_mastery", "Все DoT +10%"),
    ("warlock", "demonology", "Демонология", "👹", "dps", "pet_demo", "Урон демонов +15%"),
    ("warlock", "destruction", "Разрушение", "💥", "dps", "chaos_ember", "Стрела Хаоса: −1 осколок шанс 10%"),
    # monk
    ("monk", "brewmaster", "Хмелевар", "🍺", "tank", "stagger_reduce", "Пошатывание −8% входящего"),
    ("monk", "mistweaver", "Ткач туманов", "🍃", "healer", "renewing_mist", "Заживляющий туман +1т"),
    ("monk", "windwalker", "Танцующий", "🥋", "dps", "chi_refund", "15% вернуть 1 ци после spender"),
    # druid
    ("druid", "balance", "Баланс", "🌙", "dps", "eclipse_power", "Звёздный огонь/Гнев +8%"),
    ("druid", "feral", "Сила зверя", "🐯", "dps", "bleed_feral", "Разорвать/Растерзать +12%"),
    ("druid", "guardian", "Страж", "🐻", "tank", "frenzied_armor", "Исступление: +5% брони"),
    ("druid", "restoration", "Исцеление", "🌿", "healer", "rejuv_hot", "Омоложение HoT +1т"),
    # engineer
    ("engineer", "mechanist", "Механист", "🤖", "dps", "pet_mech", "Урон механизмов +16%"),
    ("engineer", "sapper", "Сапёр", "💣", "dps", "bomb_aoe", "Взрывы AoE +12%"),
    ("engineer", "tinkerer", "Изобретатель", "🔧", "dps", "gadget_proc", "Шанс усилить пета +8%"),
]

KEY_TIERS = [2, 8, 12, 15]


def ilvl_for_key(k):
    # sync with gear.js keyToIlvl + shop bonus
    return 22 + (k - 2) * 8 + 6


def rarity_for_key(k):
    if k >= 12:
        return "epic"
    if k >= 8:
        return "rare"
    return "uncommon"


def stats_for(role, k):
    """Primary/sec stats in gear-points (applyGear scales with STAT_SCALE)."""
    base = ilvl_for_key(k)
    # trinket ≈ 0.9–1.1 of a strong armor piece
    if role == "tank":
        return {
            "atk": max(12, base // 2),
            "hp": max(40, base * 3),
            "def": max(14, base // 2),
            "vers": max(8, base // 3),
            "mastery": max(6, base // 4),
            "crit": max(4, base // 6),
        }
    if role == "healer":
        return {
            "atk": max(10, base // 3),
            "hp": max(30, base * 2),
            "def": max(8, base // 4),
            "mastery": max(14, base // 2),
            "crit": max(10, base // 3),
            "vers": max(10, base // 3),
        }
    return {
        "atk": max(18, int(base * 0.85)),
        "hp": max(24, base * 1.5),
        "def": max(6, base // 6),
        "crit": max(12, base // 2),
        "mastery": max(10, base // 3),
        "vers": max(8, base // 4),
    }

def main():
    trinkets = []
    for class_id, spec_id, sname, icon, role, mech_id, desc in SPECS:
        for k in KEY_TIERS:
            ilvl = ilvl_for_key(k)
            trinkets.append({
                "id": f"trinket_{class_id}_{spec_id}_k{k}",
                "slot": "trinket",
                "name": f"Знак {sname} · +{k}",
                "icon": icon,
                "ilvl": ilvl,
                "rarity": rarity_for_key(k),
                "role": role,
                "classId": class_id,
                "specId": spec_id,
                "stats": stats_for(role, k),
                "shop": True,
                "shopKey": k,
                "testBuild": True,
                "special": {
                    "id": mech_id,
                    "desc": desc,
                    "classId": class_id,
                    "specId": spec_id,
                },
            })

    # JS export
    js = """/* shop-trinkets-data: auto-generated unique per-spec trinkets — do not hand-edit */
  const SHOP_TRINKETS_RAW = %s;
""" % json.dumps(trinkets, ensure_ascii=False, indent=2)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(js)
    print("wrote", OUT, "count", len(trinkets))


if __name__ == "__main__":
    main()
