# -*- coding: utf-8 -*-
"""
Честный прогон живучести танка за 12 своих ходов.

Не жадная оценка урона: жмёт стены / блок / самохил / броню.
Входящий идёт по формуле боя (ожидание блока/парира/уклона, без ролла).
"""
from __future__ import annotations

FLAT_REF = 15.0
HORIZON = 12
ENEMY_ST = 18.0
CRIT_OUT = 1.09  # исходящий щит/хил от урона — ожидание крита
VIRTUE = 0.25

SKIP_IDS = {"kick", "taunt", "provoke", "growl", "hot_w", "execute"}
SKIP_TYPES = {"interrupt", "taunt", "cc", "dispel", "purge"}

# стены и сейвы без хода — жать по КД
FA_DEF = {
    "shield_wall", "ardent", "icebound", "barkskin", "survival",
    "fort_brew", "vampiric_blood", "niuzao", "shield_block",
}

# пассивки из passives.js
PASSIVE = {
    "warrior:protection": {
        "block": 0.15 + 0.15,  # Щит с озона + иск. Критический блок при 120
        "parry": 0.05 + 0.07,  # база Защиты + Одной левой
        "armor": 0.0,
        "mastery_in": 1.0,
        "mastery_shield": 1.0,
        "mastery_avengers": 1.0,
        "dodge_base": 0.0,
    },
    "paladin:protection": {
        "block": 0.15,  # Святой щит
        "parry": 0.0,
        "armor": 0.10,  # Защитник света
        "mastery_in": 1.0,
        "mastery_shield": 1.0,
        "mastery_avengers": 1.80,  # иск. 80% только Щит мстителя
        "dodge_base": 0.0,
    },
    "deathknight:blood": {
        "block": 0.0,
        "parry": 0.20,  # Кровяной клинок
        "armor": 0.0,
        "mastery_in": 1.0,  # иск. больше не режет входящий
        "mastery_shield": 1.0,  # Костяной щит без иск.
        "mastery_avengers": 1.0,
        "dodge_base": 0.0,
        "ds_shield": 0.20 * (1.0 + 0.36),  # щит крови от реального хила
    },
    "monk:brewmaster": {
        "block": 0.0,
        "parry": 0.0,
        "armor": 0.0,
        "mastery_in": 1.0,
        "mastery_shield": 1.0,
        "mastery_avengers": 1.0,
        "dodge_base": 0.05 + 0.06,  # иск. + Пьяный задира
    },
    "druid:guardian": {
        "block": 0.0,
        "parry": 0.0,
        "armor": 0.0,
        "mastery_in": max(0.55, 1.0 - 0.35 * 0.85),  # Природный страж
        "mastery_shield": 1.0 + 0.35 * 0.5,
        "mastery_avengers": 1.0,
        "dodge_base": 0.0,
    },
}


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


def ab_type(a):
    return a.get("t") or ""


def ab_flat(a):
    if a.get("fl") is not None:
        return num(a["fl"])
    if a.get("flat") is not None:
        return num(a["flat"])
    return 0.0


def ab_cd(a):
    return int(num(a.get("cd"), 0))


def ab_ch(a):
    return int(num(a.get("ch") or a.get("maxCharges"), 0))


def ab_fa(a):
    return bool(a.get("fa") or a.get("freeAction"))


def ab_bt(a, default=2):
    return int(num(a.get("bt") or a.get("buffTurns"), default))


def ab_armor(a):
    if a.get("am") is not None:
        return num(a["am"])
    return num(a.get("armorMod"))


def ab_dr(a):
    if a.get("dr") is not None:
        return num(a["dr"])
    return num(a.get("dmgReduce"))


def armor_cut(defn):
    d = defn * 1000.0
    return min(0.75, d / (d + 20000.0))


def hit_t(a, atk):
    fl = ab_flat(a)
    hits = max(1, int(num(a.get("hits"), 1)))
    if fl > 0:
        return atk * fl / FLAT_REF * hits
    return atk * num(a.get("p"), 1.0) * hits


class Fight:
    def __init__(self, kit, n_targets, heal_per_turn=0.0):
        self.kit = kit
        self.n = n_targets
        self.key = kit["key"]
        self.cid = kit["classId"]
        self.sid = kit["specId"]
        self.atk = kit["stats"]["atk"]
        self.defn = kit["stats"]["def"]
        self.base_hp = kit["stats"]["hp"]
        self.max_hp = self.base_hp
        self.hp = self.base_hp
        self.heal_per_turn = heal_per_turn
        self.pas = PASSIVE.get(self.key, {
            "block": 0.0, "parry": 0.0, "armor": 0.0,
            "mastery_in": 1.0, "mastery_shield": 1.0,
            "mastery_avengers": 1.0, "dodge_base": 0.0,
        })
        self.abs_ = [a for a in kit["abilities"] if self._keep(a)]
        self.by_id = {ab_id(a): a for a in self.abs_}

        self.cds = {ab_id(a): 0 for a in self.abs_}
        self.charges = {}
        for a in self.abs_:
            if ab_ch(a):
                self.charges[ab_id(a)] = ab_ch(a)

        # ресурсы
        if self.cid == "warrior":
            self.res, self.res_max, self.regen = 20.0, 100.0, 8.0
            self.sec, self.sec_max = 0.0, 0.0
        elif self.cid == "paladin":
            self.res, self.res_max, self.regen = 100.0, 100.0, 10.0
            self.sec, self.sec_max = 3.0, 5.0
        elif self.cid == "deathknight":
            self.res = self.res_max = 0  # руны отдельно
            self.regen = 0.0
            self.sec, self.sec_max = 20.0, 100.0  # сила рун
            self.runes = {"b": [0, 0], "f": [0, 0], "u": [0, 0]}
        elif self.cid == "monk":
            self.res, self.res_max, self.regen = 100.0, 100.0, 25.0
            self.sec, self.sec_max = 0.0, 5.0
        elif self.cid == "druid":
            self.res, self.res_max, self.regen = 20.0, 100.0, 8.0
            self.sec, self.sec_max = 0.0, 0.0
        else:
            self.res, self.res_max, self.regen = 100.0, 100.0, 0.0
            self.sec, self.sec_max = 0.0, 0.0

        self.buffs = {}  # id -> {turns, ...}
        self.hots = []   # {left, tick}
        self.shield = 0.0
        self.stagger = 0.0
        self.purify_pool = 0.0
        self.niuzao = 0
        self.lucky = 0.0
        self.crusader_stacks = 0
        self.light_stacks = 0
        self.temp_granted = 0.0
        self.self_heal = 0.0
        self.hp_damage = 0.0
        self.shield_ate = 0.0
        self.stagger_in = 0.0
        self.stagger_tick_hp = 0.0
        self.taken_rounds = [0.0] * (HORIZON + 4)
        self.died_at = None
        self.log = []
        self.turn = 0

    def _keep(self, a):
        if not a or not ab_id(a):
            return False
        if ab_id(a) in SKIP_IDS:
            return False
        if ab_type(a) in SKIP_TYPES:
            return False
        return True

    def rune_ready(self, kind):
        return sum(1 for t in self.runes.get(kind, []) if t <= 0)

    def spend_rune(self, kind):
        slots = self.runes.get(kind, [])
        for i, t in enumerate(slots):
            if t <= 0:
                slots[i] = 3
                return True
        return False

    def can_cast(self, a):
        aid = ab_id(a)
        if self.cds.get(aid, 0) > 0 and not (ab_ch(a) and self.charges.get(aid, 0) > 0):
            return False
        if self.cid == "deathknight":
            r = a.get("r") if isinstance(a.get("r"), dict) else {}
            for k in ("b", "f", "u"):
                need = int(num(r.get(k), 0))
                if need and self.rune_ready(k) < need:
                    return False
            if aid == "death_strike" and self.sec + 1e-6 < 40:
                return False
            return True
        cs = num(a.get("cs"))
        if cs and self.sec + 1e-6 < cs:
            return False
        return self.res + 1e-6 >= num(a.get("c"))

    def pay(self, a):
        aid = ab_id(a)
        if self.cid == "deathknight":
            r = a.get("r") if isinstance(a.get("r"), dict) else {}
            for k in ("b", "f", "u"):
                need = int(num(r.get(k), 0))
                for _ in range(need):
                    self.spend_rune(k)
            if aid == "death_strike":
                self.sec -= 40
            rp = num(a.get("rp"))
            if rp:
                extra = 0
                if a.get("rpPerExtra") and self.n > 1:
                    extra = (self.n - 1) * num(a.get("rpPerExtra"))
                self.sec = min(self.sec_max, self.sec + rp + extra)
        else:
            self.res -= num(a.get("c"))
            self.res = min(self.res_max, self.res + num(a.get("g")))
            cs = num(a.get("cs"))
            if cs:
                self.sec = max(0.0, self.sec - cs)
                if self.cid == "paladin":
                    # Добродетель: 25% на каждую потраченную Энергию Света
                    self.sec = min(self.sec_max, self.sec + cs * VIRTUE)
            if a.get("gs"):
                self.sec = min(self.sec_max, self.sec + num(a.get("gs")))
        if ab_ch(a) and self.charges.get(aid, 0) > 0:
            self.charges[aid] -= 1
            if self.charges[aid] < ab_ch(a) and self.cds.get(aid, 0) <= 0:
                self.cds[aid] = ab_cd(a)
        elif ab_cd(a):
            self.cds[aid] = ab_cd(a)

    def tick_cds_res(self):
        for a in self.abs_:
            aid = ab_id(a)
            if self.cds.get(aid, 0) > 0:
                self.cds[aid] -= 1
                if self.cds[aid] <= 0 and ab_ch(a) and self.charges.get(aid, 0) < ab_ch(a):
                    self.charges[aid] = self.charges.get(aid, 0) + 1
                    if self.charges[aid] < ab_ch(a):
                        self.cds[aid] = ab_cd(a)
        if self.cid == "deathknight":
            for slots in self.runes.values():
                for i, t in enumerate(slots):
                    if t > 0:
                        slots[i] = t - 1
        else:
            self.res = min(self.res_max, self.res + self.regen)

    def expire_start(self):
        # хоты
        for h in list(self.hots):
            amt = h["tick"]
            got = self.heal(amt)
            h["left"] -= 1
            if h["left"] <= 0:
                self.hots.remove(h)
        # пошатывание
        if self.stagger > 0:
            tick = max(1.0, round(self.stagger * 0.25))
            self.stagger = max(0.0, self.stagger - tick)
            if self.niuzao > 0 and tick > 1:
                share = max(1.0, round(tick * 0.25))
                tick = max(1.0, tick - share)
            self._hurt(tick, stagger_tick=True)
        # баффы
        dead = []
        for bid, b in self.buffs.items():
            b["turns"] -= 1
            if b["turns"] <= 0:
                dead.append(bid)
        for bid in dead:
            b = self.buffs.pop(bid)
            if b.get("tempHp"):
                self.max_hp = max(self.base_hp, self.max_hp - b["tempHp"])
                self.hp = min(max(self.hp, 1.0), self.max_hp)
            if bid == "armor_crusader":
                self.crusader_stacks = 0
            if bid == "light_shield":
                self.light_stacks = 0
        if self.niuzao > 0:
            self.niuzao -= 1

    def heal(self, amt):
        if amt <= 0:
            return 0.0
        if self.buffs.get("vampiric_blood", {}).get("healTakenMod"):
            amt *= 1.0 + num(self.buffs["vampiric_blood"]["healTakenMod"])
        room = max(0.0, self.max_hp - self.hp)
        got = min(room, amt)
        self.hp += got
        self.self_heal += got
        return got

    def add_buff(self, bid, turns, **kw):
        cur = self.buffs.get(bid)
        if cur and kw.get("tempHp") and cur.get("tempHp"):
            cur["turns"] = turns
            return
        if kw.get("tempHp"):
            bonus = kw["tempHp"]
            self.max_hp += bonus
            self.hp = min(self.max_hp, self.hp + bonus)
            self.temp_granted += bonus
        self.buffs[bid] = {"turns": turns, **kw}

    def armor_mod_now(self):
        extra = self.pas["armor"]
        for b in self.buffs.values():
            extra += num(b.get("armorMod"))
        return extra

    def dr_now(self):
        return sum(num(b.get("dmgReduce")) for b in self.buffs.values())

    def block_now(self):
        ch = self.pas["block"]
        val = 0.35
        for b in self.buffs.values():
            ch += num(b.get("blockChanceAdd"))
            val += num(b.get("blockValueAdd"))
        return min(0.85, ch), min(0.75, val)

    def parry_now(self):
        return min(0.75, self.pas["parry"] + sum(num(b.get("parryChanceAdd")) for b in self.buffs.values()))

    def dodge_now(self):
        base = self.pas["dodge_base"]
        if base <= 0:
            return 0.0
        return min(0.95, base * (1.0 + self.lucky))

    def enemy_cut(self):
        return min(0.9, sum(num(b.get("enemyDmgMod")) for b in self.buffs.values()))

    def stagger_bonus(self):
        return sum(num(b.get("staggerBonus")) for b in self.buffs.values())

    def _hurt(self, dmg, stagger_tick=False):
        if dmg <= 0:
            return
        self.hp_damage += dmg
        if stagger_tick:
            self.stagger_tick_hp += dmg
        else:
            self.taken_rounds[self.turn] += dmg
        self.hp -= dmg
        if self.hp <= 0:
            self.hp = 0.0
            if self.died_at is None:
                self.died_at = self.turn + 1

    def apply_hit(self, raw):
        raw = raw * (1.0 - self.enemy_cut())
        dmg = raw * (1.0 - armor_cut(self.defn))
        am = self.armor_mod_now()
        if am > 0:
            dmg *= (1.0 - min(0.85, am))
        dr = self.dr_now()
        if dr > 0:
            dmg *= (1.0 - min(0.9, dr))
        dmg *= self.pas["mastery_in"]
        parry = self.parry_now()
        block, bval = self.block_now()
        if parry > 0 or block > 0:
            dmg *= (1.0 - parry) * (block * (1.0 - bval) + (1.0 - block))
        dodge = self.dodge_now()
        if dodge > 0:
            land = 1.0 - dodge
            dmg *= land
            # ожидание стаков «Ещё повезёт»: промах уклона копит, уклон сбрасывает
            self.lucky = land * (self.lucky + 1.0)
        if self.shield > 0 and dmg > 0:
            take = min(self.shield, dmg)
            self.shield -= take
            self.shield_ate += take
            dmg -= take
        if self.key == "monk:brewmaster" and dmg > 0:
            frac = min(0.75, 0.35 + self.stagger_bonus())
            room = max(0.0, self.max_hp * 2 - self.stagger)
            to_s = min(dmg * frac, room)
            self.stagger += to_s
            self.stagger_in += to_s
            dmg -= to_s
        self._hurt(dmg)
        if self.key == "warrior:protection":
            self.res = min(self.res_max, self.res + 3.0)

    def taken_last2(self):
        t = self.turn
        return self.taken_rounds[t] + (self.taken_rounds[t - 1] if t > 0 else 0.0)

    def apply_cast(self, a, fa=False):
        aid = ab_id(a)
        self.pay(a)
        tag = f"х{self.turn + 1}" + (" FA " if fa else " ") + ab_name(a)
        self.log.append(tag)

        # стены / блок / пул HP
        if aid == "shield_block" or (a.get("grantBlock") and aid != "last_stand"):
            self.add_buff(
                "shield_block_buff", ab_bt(a, 2),
                blockChanceAdd=num(a.get("blockChanceAdd"), 0.5),
                blockValueAdd=num(a.get("blockValueAdd"), 0.2),
            )
        if aid == "last_stand":
            self.add_buff(
                "last_stand_hp", ab_bt(a, 3),
                tempHp=self.base_hp * num(a.get("hpPct") or a.get("maxHpPct"), 0.5),
            )
            self.add_buff(
                "shield_block_buff", ab_bt(a, 3),
                blockChanceAdd=0.5, blockValueAdd=0.2,
            )
        if aid == "vampiric_blood":
            self.add_buff(
                "vampiric_blood", ab_bt(a, 4),
                tempHp=self.base_hp * num(a.get("hpPct") or a.get("maxHpPct"), 0.8),
                healTakenMod=num(a.get("healTakenMod"), 0.5),
            )
        dr = ab_dr(a)
        if dr > 0 and (aid in FA_DEF or ab_type(a) == "buff"):
            self.add_buff("dr_" + aid, ab_bt(a, 2), dmgReduce=dr, staggerBonus=num(a.get("staggerBonus")))
        if a.get("staggerBonus") and aid == "fort_brew":
            # уже в dr_ buff
            pass
        if aid == "niuzao":
            self.niuzao = 3
        if aid == "purifying":
            pct = num(a.get("purifyPct"), 0.25)
            cleared = self.stagger * pct
            self.stagger -= cleared
            self.purify_pool += cleared
        if aid == "elusive":
            base = self.atk * 30.0 / FLAT_REF
            amt = (base + self.purify_pool) * self.pas["mastery_shield"]
            self.shield += amt
            self.purify_pool = 0.0
        if aid == "savage_def" or (ab_armor(a) and not a.get("armorStacksMax") and aid not in ("crusader", "sot_r")):
            if ab_armor(a) and aid != "crusader":
                self.add_buff("armor_" + aid, ab_bt(a, 4), armorMod=ab_armor(a))
        if aid == "crusader" and ab_armor(a):
            mx = int(num(a.get("armorStacksMax"), 2))
            if self.crusader_stacks >= mx:
                if "armor_crusader" in self.buffs:
                    self.buffs["armor_crusader"]["turns"] = ab_bt(a, 3)
            else:
                self.crusader_stacks += 1
                self.add_buff(
                    "armor_crusader", ab_bt(a, 3),
                    armorMod=ab_armor(a) * self.crusader_stacks,
                )
        if aid == "sot_r":
            self.light_stacks = min(2, self.light_stacks + 1)
            self.add_buff("light_shield", 4, armorMod=0.10 * self.light_stacks)
        if a.get("enemyDmgMod"):
            self.add_buff("edmg_" + aid, ab_bt(a, 3), enemyDmgMod=num(a.get("enemyDmgMod")))
        if a.get("selfShieldFlat") is not None:
            sh = num(a.get("selfShieldFlat")) * self.pas["mastery_shield"]
            self.shield += sh
        if a.get("shieldFromDmg"):
            dealt = hit_t(a, self.atk) * CRIT_OUT
            if aid == "avengers":
                dealt *= self.pas["mastery_avengers"]
                dealt *= self.n  # область
            self.shield += dealt * num(a.get("shieldFromDmg"))
        if a.get("healFromDealt"):
            dealt = hit_t(a, self.atk) * CRIT_OUT
            if ab_type(a) == "aoe":
                dealt *= self.n
            self.heal(dealt * num(a.get("healFromDealt")))
        if aid == "death_strike":
            pct = 0.15 if self.sid == "blood" else 0.10
            amt = self.max_hp * pct + self.taken_last2() * 0.25
            got = self.heal(amt)
            if self.sid == "blood" and got > 0:
                self.shield += got * num(self.pas.get("ds_shield"), 0.20)
        if ab_type(a) == "heal":
            self.heal(hit_t(a, self.atk) * CRIT_OUT)
        ah = a.get("applyHot") if isinstance(a.get("applyHot"), dict) else None
        if ah:
            turns = int(num(ah.get("turns"), 0))
            if ah.get("hpPct") is not None and turns > 0:
                self.hots.append({"left": turns, "tick": self.max_hp * num(ah.get("hpPct"))})
            elif num(ah.get("flat")) > 0 and turns > 0:
                self.hots.append({"left": turns, "tick": self.atk * num(ah.get("flat")) / FLAT_REF})
        if ab_type(a) == "shield" and aid != "elusive":
            self.shield += hit_t(a, self.atk) * 0.85 * self.pas["mastery_shield"]

    def expected_hit_to_hp(self):
        """Грубо: сколько из одного сырого 18т дойдёт до HP при текущих баффах."""
        raw = ENEMY_ST * (1.0 - self.enemy_cut())
        dmg = raw * (1.0 - armor_cut(self.defn))
        am = self.armor_mod_now()
        if am > 0:
            dmg *= (1.0 - min(0.85, am))
        dr = self.dr_now()
        if dr > 0:
            dmg *= (1.0 - min(0.9, dr))
        dmg *= self.pas["mastery_in"]
        parry = self.parry_now()
        block, bval = self.block_now()
        if parry > 0 or block > 0:
            dmg *= (1.0 - parry) * (block * (1.0 - bval) + (1.0 - block))
        dodge = self.dodge_now()
        if dodge > 0:
            dmg *= (1.0 - dodge)
        if self.shield > 0:
            dmg = max(0.0, dmg - self.shield / max(1, self.n))
        if self.key == "monk:brewmaster" and dmg > 0:
            frac = min(0.75, 0.35 + self.stagger_bonus())
            dmg *= (1.0 - frac)
        return dmg

    def score_main(self, a):
        """Чем выше — тем нужнее для живучести этот ход."""
        aid = ab_id(a)
        missing = self.max_hp - self.hp
        exp_round = self.expected_hit_to_hp() * self.n
        sc = 1.0
        if aid == "last_stand":
            if "last_stand_hp" in self.buffs:
                sc = 5
            else:
                sc = 90 if (self.turn == 0 or self.hp < self.max_hp * 0.7) else 20
        elif aid == "death_strike":
            sc = 80 if (self.taken_last2() > 8 or missing > self.max_hp * 0.15) else 35
        elif aid == "frenzied":
            sc = 85 if missing > self.max_hp * 0.12 else 15
        elif aid == "sot_r":
            sc = 70 if self.light_stacks < 2 else 40
        elif aid == "crusader":
            sc = 65 if self.crusader_stacks < 2 else 25
        elif aid == "bone_shield":
            sc = 75 if self.shield < exp_round else 30
        elif aid == "avengers":
            sc = 60 if self.shield < exp_round else 22
        elif aid == "savage_def":
            sc = 68 if "armor_savage_def" not in self.buffs else 12
        elif aid == "demo_shout":
            sc = 72 if not any(k.startswith("edmg_") for k in self.buffs) else 10
        elif aid == "breath":
            sc = 55 if not any(k.startswith("edmg_") for k in self.buffs) else 18
        elif aid == "elusive":
            one = max(1.0, self.expected_hit_to_hp())
            if self.purify_pool > 5:
                sc = 78
            elif self.shield < one:
                sc = 74
            else:
                sc = 8
        elif aid == "blood_boil":
            sc = 28
        elif aid in ("heart_strike", "shield_slam", "mangle", "jab", "keg_smash", "blackout"):
            sc = 16
        elif aid in ("thrash", "lacerate", "maul", "hot_r", "consecrate", "judgment"):
            sc = 12
        elif aid == "dnd":
            sc = 14
        else:
            sc = 10
        return sc

    def score_fa(self, a):
        aid = ab_id(a)
        if aid == "purifying":
            return 95 if self.stagger > self.max_hp * 0.12 else -1
        if aid == "shield_block":
            return 88 if "shield_block_buff" not in self.buffs else 40
        if aid in ("shield_wall", "ardent", "icebound", "survival"):
            return 100
        if aid == "vampiric_blood":
            return 99
        if aid == "fort_brew":
            return 92
        if aid == "barkskin":
            return 80
        if aid == "niuzao":
            return 70
        return 50

    def def_already_up(self, a):
        aid = ab_id(a)
        if aid == "shield_block" and "shield_block_buff" in self.buffs:
            return True
        if aid == "vampiric_blood" and "vampiric_blood" in self.buffs:
            return True
        if aid == "niuzao" and self.niuzao > 0:
            return True
        if ("dr_" + aid) in self.buffs:
            return True
        return False

    def pick_fa(self):
        best, best_sc = None, 0.0
        for a in self.abs_:
            if not ab_fa(a):
                continue
            aid = ab_id(a)
            if aid not in FA_DEF and aid != "purifying":
                continue
            if not self.can_cast(a):
                continue
            if self.def_already_up(a):
                continue
            sc = self.score_fa(a)
            if sc > best_sc:
                best, best_sc = a, sc
        return best

    def pick_main(self):
        best, best_sc = None, -1.0
        for a in self.abs_:
            if ab_fa(a) and ab_type(a) not in ("damage", "aoe", "heal", "heal_aoe", "shield", "cleanse"):
                continue
            if ab_id(a) in FA_DEF and ab_fa(a):
                continue
            if not self.can_cast(a):
                continue
            sc = self.score_main(a)
            if sc > best_sc:
                best, best_sc = a, sc
        return best

    def run(self):
        for t in range(HORIZON):
            self.turn = t
            if t > 0:
                self.expire_start()
            self.tick_cds_res()

            # без хода: все готовые стены подряд
            guard = 0
            while guard < 6:
                guard += 1
                fa = self.pick_fa()
                if not fa:
                    break
                self.apply_cast(fa, fa=True)

            main = self.pick_main()
            if main:
                self.apply_cast(main, fa=False)
            else:
                self.log.append(f"х{t + 1} простой")

            for _ in range(self.n):
                self.apply_hit(ENEMY_ST)

            if self.heal_per_turn > 0:
                self.heal(self.heal_per_turn)

        raw = ENEMY_ST * self.n * HORIZON
        hp_in = self.hp_damage
        cut_pct = (1.0 - hp_in / raw) * 100 if raw else 0.0
        pocket = self.base_hp + self.temp_granted + self.self_heal
        if hp_in < 1:
            solo = 99.0
        else:
            solo = pocket / hp_in
        died = f"ход {self.died_at}" if self.died_at else "нет"
        return {
            "raw": round(raw, 1),
            "hp_in": round(hp_in, 1),
            "cut_pct": round(cut_pct, 1),
            "shield_ate": round(self.shield_ate, 1),
            "self_heal": round(self.self_heal, 1),
            "stagger_tick": round(self.stagger_tick_hp, 1),
            "stagger_left": round(self.stagger, 1),
            "end_hp": round(self.hp, 1),
            "temp_hp": round(self.temp_granted, 1),
            "died": died,
            "solo": round(solo, 3),
            "pocket": round(pocket, 1),
            "log": " → ".join(self.log[:22]),
        }


def simulate_tank_resist(kit, n_targets, heal_per_turn=0.0):
    return Fight(kit, n_targets, heal_per_turn=heal_per_turn).run()
