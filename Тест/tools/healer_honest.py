# -*- coding: utf-8 -*-
"""
Честный прогон хила за 12 ходов: кит + живые механики движка.

СТ — лечение в одного постоянно раненого (союзник 0).
Область — сумма по 5 союзникам. Колонку 10 лист по-прежнему грубо ×2.
"""
from __future__ import annotations

FLAT = 15.0
HORIZON = 12
PARTY = 5
CRIT = 1.09
ATONEMENT = 0.55
VIRTUE = 0.25

# искусность при 120, как в stats.js / healUnit
MASTERY_HEAL = {
    "priest:holy": 1.39,
    "priest:discipline": 1.042,  # kind shield → хил ×(1+0.42×0.1)
    "monk:mistweaver": 1.39,
    "druid:restoration": 1.39,
    "shaman:restoration": 1.20,  # Глубокие воды: СТ всегда ранен → полная иск.
    "paladin:holy": 1.0,
}
MASTERY_HEAL_AOE = {
    "shaman:restoration": 1.10,  # пачка не вся в 30% HP
}
MASTERY_SHIELD = {
    "priest:discipline": 1.42,
}
LIGHT_ECHO = 0.15  # Выбор света: 15% хила / 2 тика


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


class Fight:
    def __init__(self, kit, aoe, horizon=HORIZON):
        self.kit = kit
        self.key = kit["key"]
        self.aoe = aoe
        self.atk = kit["stats"]["atk"]
        self.m_heal = MASTERY_HEAL.get(self.key, 1.0)
        if aoe and self.key in MASTERY_HEAL_AOE:
            self.m_heal = MASTERY_HEAL_AOE[self.key]
        self.m_shield = MASTERY_SHIELD.get(self.key, 1.0)
        self.mana = 100.0
        self.mana_max = 100.0
        self.regen = {"paladin:holy": 4.0}.get(self.key, 7.0)
        self.es = 3.0 if kit["classId"] == "paladin" else 0.0
        self.es_max = 5.0
        self.cds = {}
        self.by = {ab_id(a): a for a in kit["abilities"]}
        self.log = []
        self.st = 0.0
        self.aoe_sum = 0.0
        self.hots = []  # {ally, left, tick, echo}
        self.atone = [0] * PARTY
        self.renewing = [0] * PARTY
        self.atk_mod = 1.0
        self.atk_left = 0
        self.extra_crit = 0.0  # добавка к ожиданию крита (Гнев +30% → +0.15)
        self.extra_crit_left = 0
        self.tea = 0
        self.heal_amp = 0.0
        self.heal_amp_ch = 0
        self.tidal = 0
        self.serpent = 0
        self.pet = 0
        self.turn = 0
        self.horizon = horizon
        self.mana_log = []
        self.oom_turn = None
        self.idle_mana_turn = None

    def ready(self, aid, ignore_mana=False):
        a = self.by.get(aid)
        if not a:
            return False
        if self.cds.get(aid, 0) > 0:
            return False
        cs = num(a.get("cs"))
        if cs and self.es + 1e-6 < cs:
            return False
        cost = num(a.get("c"))
        if self.tea > 0 and (a.get("t") or "") in ("heal", "heal_aoe"):
            cost = 0
        if not ignore_mana and self.mana + 1e-6 < cost:
            return False
        return True

    def mana_cost(self, aid):
        a = self.by.get(aid)
        if not a:
            return 0.0
        if self.tea > 0 and (a.get("t") or "") in ("heal", "heal_aoe"):
            return 0.0
        return num(a.get("c"))

    def pay(self, aid):
        a = self.by[aid]
        cost = num(a.get("c"))
        if self.tea > 0 and (a.get("t") or "") in ("heal", "heal_aoe"):
            cost = 0
            self.tea -= 1
        self.mana -= cost
        cs = num(a.get("cs"))
        if cs:
            self.es -= cs
            if self.kit["classId"] == "paladin":
                self.es = min(self.es_max, self.es + cs * VIRTUE)
        if a.get("gs"):
            self.es = min(self.es_max, self.es + num(a.get("gs")))
        if ab_cd(a):
            self.cds[aid] = ab_cd(a)

    def crit_mult(self, bonus=0.0):
        # 18% база × 1.5; bonus — доп. шанс (Шок +20%, Гнев +30%)
        return 1.0 + (0.18 + bonus + self.extra_crit * 2) * 0.5

    def credit(self, ally, amt):
        if amt <= 0:
            return 0.0
        if ally == 0:
            self.st += amt
        self.aoe_sum += amt
        return amt

    def heal_ally(self, ally, raw, *, shield=False, no_echo=False, crit_bonus=0.0):
        if shield:
            amt = raw * self.m_shield
        else:
            amp = 1.0 + self.heal_amp if self.heal_amp_ch > 0 else 1.0
            if self.heal_amp_ch > 0:
                self.heal_amp_ch -= 1
            amt = raw * self.m_heal * amp * self.crit_mult(crit_bonus)
        self.credit(ally, amt)
        if (
            self.key == "paladin:holy"
            and not shield
            and not no_echo
            and ally == 0
        ):
            tick = max(0.0, amt * LIGHT_ECHO / 2.0)
            if tick > 0:
                self.hots.append({"ally": 0, "left": 2, "tick": tick, "echo": True})
        return amt

    def heal_all(self, raw, **kw):
        for i in range(PARTY):
            self.heal_ally(i, raw, **kw)

    def put_hot(self, ally, ticks, tick_raw, *, renewing=False):
        tick = tick_raw * self.m_heal * self.crit_mult()
        self.hots.append({"ally": ally, "left": ticks, "tick": tick, "echo": True})
        if renewing:
            self.renewing[ally] = max(self.renewing[ally], ticks)

    def tick_start(self):
        if self.atk_left > 0:
            self.atk_left -= 1
            if self.atk_left <= 0:
                self.atk_mod = 1.0
        if self.extra_crit_left > 0:
            self.extra_crit_left -= 1
            if self.extra_crit_left <= 0:
                self.extra_crit = 0.0
        for aid in list(self.cds):
            if self.cds[aid] > 0:
                self.cds[aid] -= 1
        self.mana = min(self.mana_max, self.mana + self.regen)
        if self.turn > 0:
            for i in range(PARTY):
                if self.atone[i] > 0:
                    self.atone[i] -= 1
                if self.renewing[i] > 0:
                    self.renewing[i] -= 1
        live = []
        for h in self.hots:
            self.credit(h["ally"], h["tick"])
            h["left"] -= 1
            if h["left"] > 0:
                live.append(h)
        self.hots = live
        if self.serpent > 0:
            # 3т после хода каждого героя и моба. СТ: 5+1, пак: 5+5.
            units = PARTY + (5 if self.aoe else 1)
            self.heal_ally(0, 3.0, no_echo=True)
            extra = units - 1
            if extra > 0:
                self.heal_ally(0, 3.0 * extra, no_echo=True)
            self.serpent -= 1
        if self.pet > 0:
            dealt = self.atk * 34 / FLAT * self.atk_mod * self.crit_mult()
            self.feed_atonement(dealt)
            self.pet -= 1

    def feed_atonement(self, dealt):
        n = sum(1 for t in self.atone if t > 0)
        if n <= 0 or dealt <= 0:
            return
        chunk = dealt * ATONEMENT * self.m_heal * 1.0
        # Искупление идёт через healUnit → иск. уже в m_heal; крит на исход. уроне уже в dealt
        for i, t in enumerate(self.atone):
            if t > 0:
                self.credit(i, dealt * ATONEMENT * self.m_heal)

    def put_atone(self, who, turns):
        if who == "all":
            for i in range(PARTY):
                self.atone[i] = max(self.atone[i], turns)
        else:
            self.atone[0] = max(self.atone[0], turns)

    def echo_lotus(self, dealt):
        # 70% нанесённого (крит уже в dealt); healUnit ещё вешает иск.
        chunk = dealt * 0.7 * self.m_heal
        for i in range(PARTY):
            if self.renewing[i] > 0:
                self.credit(i, chunk)

    def cast(self, aid, fa=False):
        if aid not in self.by or not self.ready(aid):
            return False
        a = self.by[aid]
        self.pay(aid)
        tag = f"х{self.turn + 1}" + (" FA " if fa else " ") + ab_name(a)
        if aid == "penance" and self.key == "priest:discipline":
            tag += " во врага"
        self.log.append(tag)
        atk = self.atk * self.atk_mod
        fl = num(a.get("fl") if a.get("fl") is not None else a.get("flat"))

        if aid == "archangel":
            self.atk_mod = 1.2
            self.atk_left = 3
        elif aid == "avenging":
            self.extra_crit = 0.30
            self.extra_crit_left = 4
        elif aid == "thunder_focus":
            self.tea = 2
        elif aid == "unleash":
            self.heal_amp = 0.2
            self.heal_amp_ch = 2
            self.heal_ally(0, atk * 15 / FLAT)
        elif aid == "hellfiend":
            self.pet = 5
        elif aid == "jade_serpent":
            self.serpent = 3
        elif aid == "shield" and self.key == "priest:discipline":
            self.put_atone(0, 5)
            self.heal_ally(0, atk * 50 / FLAT, shield=True)
        elif aid == "heaven_shield":
            self.put_atone("all", 5)
            for i in range(PARTY):
                self.heal_ally(i, atk * 40 / FLAT, shield=True)
        elif aid == "prayer" and self.key == "priest:discipline":
            self.put_atone("all", 3)
            for i in range(PARTY):
                self.heal_ally(i, atk * 18 / FLAT)
        elif aid == "smite" and self.key == "priest:discipline":
            self.feed_atonement(atk * 20 / FLAT * self.crit_mult())
        elif aid == "holy_fire":
            self.feed_atonement(atk * 12 / FLAT * self.crit_mult())
            tick = atk * 4 / FLAT * self.crit_mult()
            # тики как входящий урон врагу → корм; кладём 4 отложенных корма
            for _ in range(4):
                self.hots.append({"ally": -1, "left": 4, "tick": 0, "echo": False, "atonement_tick": tick})
            # проще: отдельный список
            if not hasattr(self, "hf"):
                self.hf = []
            self.hf.append({"left": 4, "tick": tick})
        elif aid == "penance" and self.key == "priest:discipline":
            self.feed_atonement(atk * 30 / FLAT * self.crit_mult())
        elif aid == "holy_shock":
            self.heal_ally(0, atk * 27 / FLAT, crit_bonus=0.20)
            self.put_hot(0, 5, atk * 7 / FLAT)
        elif aid == "word_glory":
            self.heal_ally(0, atk * 80 / FLAT)
        elif aid == "light_dawn":
            self.heal_all(atk * 30 / FLAT)
        elif aid == "holy_light":
            self.heal_ally(0, atk * 35 / FLAT)
        elif aid == "flash" and self.key == "paladin:holy":
            self.heal_ally(0, atk * 27 / FLAT)
        elif aid == "holy_radiance":
            self.heal_all(atk * 18 / FLAT)
        elif aid == "crusader":
            pass
        elif aid == "divine_prot":
            self.heal_ally(0, atk * 40 / FLAT, shield=True)
        elif aid == "holy_word":
            self.heal_ally(0, atk * 42 / FLAT)
        elif aid == "gh":
            self.heal_ally(0, atk * 36 / FLAT)
        elif aid == "greater":
            self.heal_ally(0, atk * 38 / FLAT)
        elif aid == "flash" and self.key == "priest:holy":
            self.heal_ally(0, atk * 32 / FLAT)
        elif aid == "heal":
            self.heal_ally(0, atk * 26 / FLAT)
        elif aid == "renew":
            self.heal_ally(0, atk * 10 / FLAT)
            self.put_hot(0, 5, atk * 5 / FLAT)
        elif aid == "circle":
            self.heal_all(atk * 22 / FLAT)
        elif aid == "poh":
            self.heal_all(atk * 18 / FLAT)
        elif aid == "guardian":
            self.heal_ally(0, atk * 45 / FLAT, shield=True)
        elif aid == "renewing":
            tgt = self._next_renewing_target()
            self.heal_ally(tgt, atk * 18 / FLAT)
            self.put_hot(tgt, 10, atk * 4 / FLAT, renewing=True)
            self.renewing[tgt] = max(self.renewing[tgt], 10)
        elif aid == "surging":
            self.heal_ally(0, atk * 26 / FLAT)
        elif aid == "enveloping":
            self.heal_ally(0, atk * 36 / FLAT)
            self.put_hot(0, 4, atk * 8 / FLAT)
        elif aid == "uft":
            self.heal_all(atk * 28 / FLAT)
        elif aid == "revival":
            self.heal_all(atk * 34 / FLAT)
        elif aid == "jade_lotus":
            dealt = atk * 30 / FLAT * self.crit_mult()
            self.echo_lotus(dealt)
        elif aid == "jab":
            dealt = atk * 15 / FLAT * self.crit_mult()
            self.echo_lotus(dealt)
        elif aid == "sck":
            hit = atk * 10 / FLAT * self.crit_mult()
            n_foes = 5 if self.aoe else 1
            for _ in range(n_foes):
                self.echo_lotus(hit)
        elif aid == "reju":
            tgt = 0 if not self.aoe else self._spread_hot_target()
            self.heal_ally(tgt, atk * 12 / FLAT)
            self.put_hot(tgt, 5, atk * 6 / FLAT)
        elif aid == "regrowth":
            self.heal_ally(0, atk * 28 / FLAT)
            self.put_hot(0, 4, atk * 4 / FLAT)
        elif aid == "lifebloom":
            self.heal_ally(0, atk * 10 / FLAT)
            self.put_hot(0, 5, atk * 7 / FLAT)
        elif aid == "swiftmend":
            self.heal_ally(0, atk * 50 / FLAT)
        elif aid == "nourish":
            self.heal_ally(0, atk * 24 / FLAT)
        elif aid == "wg":
            for i in range(PARTY):
                self.heal_ally(i, atk * 18 / FLAT)
                self.put_hot(i, 4, atk * 5 / FLAT)
        elif aid == "tranq":
            self.heal_all(atk * 32 / FLAT)
        elif aid == "riptide":
            self.heal_ally(0, atk * 22 / FLAT)
            self.put_hot(0, 5, atk * 5 / FLAT)
            self.tidal = 2
        elif aid == "ch":
            m = 1.0
            for i in range(PARTY):
                raw = atk * 35 / FLAT * m
                if self.tidal > 0 and i == 0:
                    pass
                self.heal_ally(i, raw)
                m *= 0.95
        elif aid == "hw":
            raw = atk * 25 / FLAT
            if self.tidal > 0:
                raw *= 1.1
                self.tidal -= 1
            self.heal_ally(0, raw)
        elif aid == "chw":
            raw = atk * 34 / FLAT
            if self.tidal > 0:
                self.tidal -= 1
            self.heal_ally(0, raw)
        elif aid == "hs":
            for i in range(PARTY):
                self.put_hot(i, 5, atk * 7 / FLAT)
        elif aid == "spirit_link":
            self.heal_all(atk * 15 / FLAT)
        else:
            if fl > 0 and (a.get("t") or "") == "heal":
                self.heal_ally(0, atk * fl / FLAT)
            elif fl > 0 and (a.get("t") or "") == "heal_aoe":
                self.heal_all(atk * fl / FLAT)
        return True

    def _next_renewing_target(self):
        if not self.aoe:
            return 0
        # на самого «голого» по заживляющему
        return min(range(PARTY), key=lambda i: self.renewing[i])

    def _spread_hot_target(self):
        return min(range(PARTY), key=lambda i: sum(1 for h in self.hots if h["ally"] == i))

    def tick_hf(self):
        if not hasattr(self, "hf"):
            self.hf = []
        live = []
        for d in self.hf:
            self.feed_atonement(d["tick"])
            d["left"] -= 1
            if d["left"] > 0:
                live.append(d)
        self.hf = live

    def pick_fa(self):
        order = []
        if self.key == "priest:discipline":
            order = ["hellfiend", "archangel"]
        elif self.key == "paladin:holy":
            order = ["avenging", "divine_prot"]
        elif self.key == "priest:holy":
            order = ["guardian"]
        elif self.key == "monk:mistweaver":
            order = ["thunder_focus", "jade_serpent"]
        elif self.key == "shaman:restoration":
            order = ["unleash"]
        for aid in order:
            if self.ready(aid):
                return aid
        return None

    def pick_main(self):
        k = self.key
        aoe = self.aoe
        if k == "priest:discipline":
            need = any(self.atone[i] <= 1 for i in (range(PARTY) if aoe else [0]))
            if not aoe and self.atone[0] <= 1 and self.ready("shield"):
                return "shield"
            if aoe and need and self.ready("heaven_shield"):
                return "heaven_shield"
            if aoe and need and self.ready("prayer"):
                return "prayer"
            if any(t > 0 for t in (self.atone if aoe else [self.atone[0]])):
                if self.ready("penance"):
                    return "penance"
                if self.ready("holy_fire"):
                    return "holy_fire"
                if self.ready("smite"):
                    return "smite"
            return None
        if k == "paladin:holy":
            # В бою нельзя только бить Ударом воина Света и сливать ЭС по КД:
            # кого-то одного надо закрывать Вспышкой / Светом небес за ману.
            if not aoe:
                if self.es + 1e-6 >= 3 and self.ready("word_glory"):
                    return "word_glory"
                if self.ready("holy_shock"):
                    return "holy_shock"
                if self.ready("flash"):
                    return "flash"
                if self.ready("holy_light"):
                    return "holy_light"
                if self.ready("crusader"):
                    return "crusader"
            else:
                # пятеро ранены — то одного спасаем простым хилом, то пачку
                if self.es + 1e-6 >= 3 and self.ready("word_glory"):
                    return "word_glory"
                if self.turn % 2 == 0 and self.ready("flash"):
                    return "flash"
                if self.es + 1e-6 >= 2 and self.ready("light_dawn"):
                    return "light_dawn"
                if self.ready("holy_shock"):
                    return "holy_shock"
                if self.ready("holy_radiance"):
                    return "holy_radiance"
                if self.ready("crusader"):
                    return "crusader"
            return None
        if k == "priest:holy":
            if not aoe:
                if self.ready("holy_word"):
                    return "holy_word"
                if not any(h["ally"] == 0 and h.get("tick") for h in self.hots) and self.ready("renew"):
                    return "renew"
                if self.ready("gh"):
                    return "gh"
                if self.ready("heal"):
                    return "heal"
            else:
                if self.ready("circle"):
                    return "circle"
                if self.ready("poh"):
                    return "poh"
            return None
        if k == "monk:mistweaver":
            if not aoe:
                if self.renewing[0] <= 2 and self.ready("renewing"):
                    return "renewing"
                if self.ready("enveloping"):
                    return "enveloping"
                if self.ready("jade_lotus"):
                    return "jade_lotus"
                if self.ready("jab"):
                    return "jab"
                if self.ready("surging"):
                    return "surging"
            else:
                if min(self.renewing) <= 2 and self.ready("renewing"):
                    return "renewing"
                if self.ready("revival"):
                    return "revival"
                if self.ready("uft"):
                    return "uft"
                if self.ready("sck"):
                    return "sck"
                if self.ready("jade_lotus"):
                    return "jade_lotus"
                if self.ready("jab"):
                    return "jab"
            return None
        if k == "druid:restoration":
            if not aoe:
                if not any(h["ally"] == 0 for h in self.hots) and self.ready("lifebloom"):
                    return "lifebloom"
                if self.ready("swiftmend"):
                    return "swiftmend"
                if self.ready("reju"):
                    return "reju"
                if self.ready("nourish"):
                    return "nourish"
            else:
                if self.ready("tranq"):
                    return "tranq"
                if self.ready("wg"):
                    return "wg"
                if self.ready("reju"):
                    return "reju"
            return None
        if k == "shaman:restoration":
            if not aoe:
                if self.ready("riptide"):
                    return "riptide"
                if self.ready("chw"):
                    return "chw"
                if self.ready("hw"):
                    return "hw"
            else:
                if self.ready("hs"):
                    return "hs"
                if self.ready("ch"):
                    return "ch"
                if self.ready("riptide"):
                    return "riptide"
            return None
        return None

    def want_main(self):
        """Первая кнопка по смыслу, даже если маны нет (КД и Энергия Света — да)."""
        saved = self.ready

        def ready_no_mana(aid, ignore_mana=False):
            return saved(aid, ignore_mana=True)

        self.ready = ready_no_mana
        try:
            return self.pick_main()
        finally:
            self.ready = saved

    def run(self):
        self.hf = []
        for t in range(self.horizon):
            self.turn = t
            self.tick_start()
            self.tick_hf()
            guard = 0
            while guard < 4:
                guard += 1
                fa = self.pick_fa()
                if not fa:
                    break
                # FA с маной: Архангел 0, чай 0, змея 0, Гнев 0; Исчадие 14, Высвободить 6
                if self.mana + 1e-6 < self.mana_cost(fa):
                    if self.oom_turn is None:
                        self.oom_turn = t + 1
                    break
                self.cast(fa, fa=True)
            want = self.want_main()
            main = self.pick_main()
            if want and not main and self.mana + 1e-6 < self.mana_cost(want):
                if self.oom_turn is None:
                    self.oom_turn = t + 1
            if main:
                self.cast(main, fa=False)
            else:
                self.log.append(f"х{t + 1} простой")
                if want and self.idle_mana_turn is None and self.mana + 1e-6 < self.mana_cost(want):
                    self.idle_mana_turn = t + 1
            self.mana_log.append(round(self.mana, 1))
            if self.mana <= 0.05 and self.oom_turn is None:
                self.oom_turn = t + 1
        return {
            "heal_st": round(self.st, 1),
            "heal_aoe": round(self.aoe_sum, 1),
            "log": " → ".join(self.log[:20]),
            "self_heal": 0.0,
            "dmg_st": 0.0,
            "dmg_aoe": 0.0,
            "hp": self.kit["stats"]["hp"],
            "atk": self.atk,
            "def": self.kit["stats"]["def"],
            "dr": 0.0,
            "mana_log": self.mana_log,
            "oom_turn": self.oom_turn,
            "idle_mana_turn": self.idle_mana_turn,
            "regen": self.regen,
        }


def simulate_healer_honest(kit, n_targets, horizon=HORIZON):
    aoe = n_targets >= 5
    return Fight(kit, aoe=aoe, horizon=horizon).run()
