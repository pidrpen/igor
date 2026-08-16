# -*- coding: utf-8 -*-
"""
Послушание: ротация от «Искупления», не жадный Великое исцеление.

Раздача: Слово силы: Щит — 5р на цель; Щит небес — 5р всем; Молитва — 3р на поражённых.
Корм: Кара, Священный огонь (хлопок и тик), Исповедь во врага, Исчадие ада.
Каждый носитель получает 55% нанесённого.
"""
from __future__ import annotations

FLAT_REF = 15.0
HORIZON = 12
CRIT = 1.09
ATONEMENT = 0.55
PARTY = 5
PET_TURNS = 5
PET_FLAT = 34.0


def num(v, d=0.0):
    if v is None or v is False:
        return d
    try:
        return float(v)
    except (TypeError, ValueError):
        return d


def ab_id(a):
    return a.get("id") or ""


def ab_name(a):
    return a.get("n") or ab_id(a)


def ab_cd(a):
    return int(num(a.get("cd"), 0))


def ab_fa(a):
    return bool(a.get("fa") or a.get("freeAction"))


def hit(atk, flat, atk_mod=1.0):
    return atk * flat / FLAT_REF * atk_mod * CRIT


def simulate_disc_atonement(kit, n_targets):
    """n=1 — один носитель (СТ). n>=5 — пятеро (область). n=10 как пять: колонку 10 лист сам ×2."""
    atk0 = kit["stats"]["atk"]
    mana = 100.0
    mana_max = 100.0
    regen = 7.0
    cds = {}
    log = []
    heal_st = 0.0
    heal_aoe = 0.0
    atk_mod = 1.0
    atk_left = 0
    atone = [0] * PARTY  # ходы Искупления на союзнике 0..4
    hf_ticks = []  # {left, tick}
    pet_left = 0
    carriers_n = 1 if n_targets < 5 else PARTY

    by_id = {ab_id(a): a for a in kit["abilities"]}

    def ready(aid):
        a = by_id.get(aid)
        if not a:
            return False
        if cds.get(aid, 0) > 0:
            return False
        return mana + 1e-6 >= num(a.get("c"))

    def pay(aid):
        nonlocal mana
        a = by_id[aid]
        mana -= num(a.get("c"))
        if ab_cd(a):
            cds[aid] = ab_cd(a)

    def feed(dealt):
        nonlocal heal_st, heal_aoe
        n = sum(1 for t in atone[:carriers_n] if t > 0)
        if n <= 0 or dealt <= 0:
            return 0.0
        chunk = dealt * ATONEMENT * n
        if carriers_n == 1:
            heal_st += chunk
        else:
            heal_aoe += chunk
        return chunk

    def put_atone(who, turns):
        if who == "all":
            for i in range(carriers_n):
                atone[i] = max(atone[i], turns)
        else:
            atone[0] = max(atone[0], turns)

    def shield_credit(flat, allies):
        nonlocal heal_st, heal_aoe
        amt = atk0 * flat / FLAT_REF * 0.85
        if allies <= 1:
            heal_st += amt
        else:
            heal_aoe += amt * allies

    for turn in range(HORIZON):
        if atk_left > 0:
            atk_left -= 1
            if atk_left <= 0:
                atk_mod = 1.0
        for aid in list(cds):
            if cds[aid] > 0:
                cds[aid] -= 1
        mana = min(mana_max, mana + regen)
        if turn > 0:
            for i in range(PARTY):
                if atone[i] > 0:
                    atone[i] -= 1

        # тик Священного огня — кормит, если имя в движке «Священный огонь»
        live = []
        for d in hf_ticks:
            feed(d["tick"])
            d["left"] -= 1
            if d["left"] > 0:
                live.append(d)
        hf_ticks = live

        if pet_left > 0:
            feed(hit(atk0, PET_FLAT, atk_mod))
            pet_left -= 1

        # без хода
        if ready("hellfiend"):
            pay("hellfiend")
            pet_left = PET_TURNS
            log.append(f"х{turn + 1} FA {ab_name(by_id['hellfiend'])}")
        if ready("archangel"):
            pay("archangel")
            atk_mod = 1.2
            atk_left = 3
            log.append(f"х{turn + 1} FA {ab_name(by_id['archangel'])}")

        need_spread = any(atone[i] <= 1 for i in range(carriers_n))
        acted = False

        if carriers_n == 1:
            if atone[0] <= 1 and ready("shield"):
                pay("shield")
                put_atone(0, 5)
                shield_credit(50, 1)
                log.append(f"х{turn + 1} {ab_name(by_id['shield'])}")
                acted = True
        else:
            if need_spread and ready("heaven_shield"):
                pay("heaven_shield")
                put_atone("all", 5)
                shield_credit(40, carriers_n)
                log.append(f"х{turn + 1} {ab_name(by_id['heaven_shield'])}")
                acted = True
            elif need_spread and ready("prayer"):
                pay("prayer")
                put_atone("all", 3)
                prayer = atk0 * 18 / FLAT_REF * CRIT
                heal_aoe += prayer * carriers_n
                log.append(f"х{turn + 1} {ab_name(by_id['prayer'])}")
                acted = True

        if not acted:
            if ready("penance") and any(atone[i] > 0 for i in range(carriers_n)):
                pay("penance")
                feed(hit(atk0, 30, atk_mod))
                log.append(f"х{turn + 1} {ab_name(by_id['penance'])} во врага")
            elif ready("holy_fire") and any(atone[i] > 0 for i in range(carriers_n)):
                pay("holy_fire")
                feed(hit(atk0, 12, atk_mod))
                tick = hit(atk0, 4, atk_mod)
                hf_ticks.append({"left": 4, "tick": tick})
                log.append(f"х{turn + 1} {ab_name(by_id['holy_fire'])}")
            elif ready("smite") and any(atone[i] > 0 for i in range(carriers_n)):
                pay("smite")
                feed(hit(atk0, 20, atk_mod))
                log.append(f"х{turn + 1} {ab_name(by_id['smite'])}")
            elif carriers_n == 1 and ready("greater"):
                pay("greater")
                heal_st += hit(atk0, 38, 1.0)
                log.append(f"х{turn + 1} {ab_name(by_id['greater'])}")
            else:
                log.append(f"х{turn + 1} простой")

    return {
        "dmg_st": 0.0,
        "dmg_aoe": 0.0,
        "heal_st": round(heal_st, 1),
        "heal_aoe": round(heal_aoe, 1),
        "self_heal": 0.0,
        "log": " → ".join(log[:18]),
        "hp": kit["stats"]["hp"],
        "atk": atk0,
        "def": kit["stats"]["def"],
        "dr": 0.0,
        "atonement": True,
    }
