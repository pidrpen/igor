/**
 * Mythic Key — Death Knight (Blood / Unholy production; Frost testBuild)
 * Современный flat-баланс (как воин/паладин): вес Nт ≈ Nт в бою при atk ≈ 15.
 *
 * Ресурсы:
 *   primary  → runes        costRunes: r { b, f, u, any }
 *   secondary→ runic_power  genRunic: rp | costSec: cs
 *
 * version: mop-5.4.8-lite-dk-frost-test
 */
(function (global) {
  'use strict';

  function A(o) {
    const ab = {
      id: o.id,
      name: o.n,
      nameEn: o.en || o.n,
      icon: o.i || '✨',
      cost: o.c ?? 0,
      gen: o.g ?? 0,
      costSec: o.cs ?? 0,
      genSec: o.gs ?? 0,
      costRunes: o.r || null,
      genRunic: o.rp ?? 0,
      cd: o.cd ?? 0,
      type: o.t,
      power: o.p ?? 1,
      desc: o.d || '',
      spellId: o.sid || 0,
    };
    if (o.flat != null) ab.flat = o.flat;
    if (o.fl != null) ab.flat = o.fl;
    if (o.freeAction || o.fa) ab.freeAction = true;
    if (o.hits != null) ab.hits = o.hits;
    if (o.lifesteal != null) ab.lifesteal = o.lifesteal;
    if (o.applyDot) ab.applyDot = o.applyDot;
    if (o.school) ab.school = o.school;
    if (o.dmgReduce != null) ab.dmgReduce = o.dmgReduce;
    if (o.dr != null) ab.dmgReduce = o.dr;
    if (o.maxHpPct != null) ab.maxHpPct = o.maxHpPct;
    if (o.hpPct != null) ab.maxHpPct = o.hpPct;
    if (o.buffTurns != null) ab.buffTurns = o.buffTurns;
    if (o.bt != null) ab.buffTurns = o.bt;
    if (o.atkMod != null) ab.atkMod = o.atkMod;
    if (o.petAtkMod != null) ab.petAtkMod = o.petAtkMod;
    if (o.armorMod != null) ab.armorMod = o.armorMod;
    if (o.am != null) ab.armorMod = o.am;
    if (o.selfShieldFlat != null) ab.selfShieldFlat = o.selfShieldFlat;
    if (o.healTakenMod != null) ab.healTakenMod = o.healTakenMod;
    if (o.cleaveOnDnd) ab.cleaveOnDnd = true;
    if (o.rpPerExtra != null) ab.rpPerExtra = o.rpPerExtra;
    if (o.rpPerTarget != null) ab.rpPerTarget = o.rpPerTarget;
    if (o.healFromDealt != null) ab.healFromDealt = o.healFromDealt;
    return ab;
  }

  const DEATHKNIGHT_CLASS = {
    id: 'deathknight',
    name: 'Рыцарь смерти',
    nameEn: 'Death Knight',
    icon: '💀',
    color: '#C41F3B',
    resource: { type: 'runes', name: 'Руны', icon: '🔷', max: 6, start: 6, regen: 1 },
    secondary: { type: 'runic_power', name: 'Сила рун', icon: '💙', max: 100, start: 20 },
    specs: [
      // ─── Blood (tank) — unlocked ───────────────────────────
      {
        id: 'blood',
        name: 'Кровь',
        nameEn: 'Blood',
        role: 'tank',
        icon: '🩸',
        // atk 15 → вес Nт ≈ Nт на флоате
        stats: { hp: 172, atk: 15, def: 12, speed: 8 },
        abilities: [
          A({ id: 'death_strike', n: 'Удар смерти', en: 'Death Strike', i: '💚',
            cs: 40, t: 'damage', fl: 35, school: 'physical',
            d: '35т · 40 силы рун · хил 15% запаса + 25% полученного за 2 хода · щит 20% реального хила', sid: 49998 }),
          A({ id: 'heart_strike', n: 'Удар в сердце', en: 'Heart Strike', i: '❤️',
            r: { b: 1 }, rp: 10, t: 'damage', fl: 16, school: 'physical',
            cleaveOnDnd: 1, rpPerExtra: 4,
            d: 'Руна крови · 16т · клев по Смерти и разложению · +4 силы за доп. цель', sid: 55050 }),
          A({ id: 'blood_boil', n: 'Вскипание крови', en: 'Blood Boil', i: '🫧',
            r: { b: 1 }, rp: 10, t: 'aoe', fl: 14, school: 'shadow',
            applyDot: { flat: 3, turns: 2, name: 'Чума', icon: '🦠', id: 'blood_plague', school: 'shadow' },
            healFromDealt: 0.4,
            d: '14т область + Чума 3т×2 · хил 40% от нанесённого', sid: 48721 }),
          A({ id: 'bone_shield', n: 'Костяной щит', en: 'Bone Shield', i: '🦴',
            r: { u: 1 }, rp: 10, cd: 3, t: 'damage', fl: 15, school: 'physical',
            selfShieldFlat: 40,
            d: '15т цели · щит 40т себе · руна нечестивости · КД 3', sid: 49222 }),
          A({ id: 'dnd', n: 'Смерть и разложение', en: 'Death and Decay', i: '☠️',
            r: { u: 1 }, rp: 10, cd: 2, t: 'aoe', fl: 10, school: 'shadow',
            applyDot: { flat: 4, turns: 3, name: 'Смерть и разложение', icon: '☠️', id: 'dnd', school: 'shadow' },
            d: '10т область + дебафф 4т×3 · свой экземпляр', sid: 43265 }),
          A({ id: 'vampiric_blood', n: 'Кровь вампира', en: 'Vampiric Blood', i: '🧛',
            cd: 10, t: 'buff', fa: 1, hpPct: 0.8, bt: 4, healTakenMod: 0.5, school: 'none',
            d: '+80% запаса HP · +50% входящего исцеления · 4 хода · без хода · КД 10', sid: 55233 }),
          A({ id: 'icebound', n: 'Незыблемость льда', en: 'Icebound Fortitude', i: '🧊',
            cd: 8, t: 'buff', fa: 1, dr: 0.4, bt: 2, school: 'none',
            d: '−40% урон · 2 хода · без хода', sid: 48792 }),
          A({ id: 'taunt', n: 'Тёмная власть', en: 'Dark Command', i: '📢',
            cd: 2, t: 'taunt', p: 0, fa: 1, school: 'none',
            d: 'Агро · без хода', sid: 56222 }),
        ],
      },

      // ─── Frost (testBuild) — full MoP lite kit ─────────────
      // ST: obliterate 30 > fs 28 > howling 16+DoT; execute soul_reaper 36
      // Loop: diseases → obliterate/howling (runes) → frost strike (RP) · pillar CD
      {
        id: 'frost',
        name: 'Лёд',
        nameEn: 'Frost',
        role: 'dps',
        icon: '❄️',
        testBuild: true,
        // atk 15 = FLAT_REF (как Unholy production)
        stats: { hp: 115, atk: 15, def: 5, speed: 11 },
        abilities: [
          A({ id: 'obliterate', n: 'Уничтожение', en: 'Obliterate', i: '❄️',
            r: { f: 1, u: 1 }, rp: 20, t: 'damage', fl: 30, school: 'frost',
            d: 'Лёд+нечестивость · 30т · +20 силы рун', sid: 49020 }),
          A({ id: 'fs', n: 'Удар льда', en: 'Frost Strike', i: '🧊',
            cs: 40, t: 'damage', fl: 43, school: 'frost',
            d: '43т · 40 силы рун', sid: 49143 }),
          A({ id: 'howling', n: 'Воющий ветер', en: 'Howling Blast', i: '🌬️',
            r: { f: 1 }, cd: 2, t: 'aoe', fl: 16, school: 'frost',
            applyDot: { flat: 4, turns: 4, name: 'Озноб', icon: '🥶', id: 'frost_fever', school: 'frost' },
            rpPerTarget: 3,
            d: '16т область + озноб 4т×4 · КД 2 · +3 силы рун за цель', sid: 49184 }),
          A({ id: 'death_strike', n: 'Удар смерти', en: 'Death Strike', i: '💚',
            cs: 40, t: 'damage', fl: 10, school: 'physical',
            d: '10т · 40 силы рун · хил 10% запаса + 25% полученного за 2 хода', sid: 49998 }),
          A({ id: 'raise_ghoul', n: 'Воскрешение мертвеца', en: 'Raise Dead', i: '🧟',
            r: { u: 1 }, rp: 10, t: 'summon', fl: 15, school: 'shadow',
            d: '1 нечестивость · вурдалак 2 хода · 15т по последней цели', sid: 46584 }),
          A({ id: 'soul_reaper', n: 'Жнец душ', en: 'Soul Reaper', i: '⚰️',
            r: { f: 1 }, rp: 10, cd: 2, t: 'damage', fl: 36, school: 'frost',
            d: '36т · ≤35% HP · руна льда · +10 силы рун', sid: 130735 }),
          A({ id: 'ity', n: 'Ледяной столп', en: 'Pillar of Frost', i: '🗼',
            cd: 5, t: 'buff', fa: 1, atkMod: 0.2, bt: 3, school: 'none',
            d: '+20% атаки · 3 хода · без хода', sid: 51271 }),
          A({ id: 'horn', n: 'Зимний горн', en: 'Horn of Winter', i: '📯',
            cd: 2, t: 'buff', fa: 1, rp: 20, school: 'none',
            d: '+20 силы рун · без хода · КД 2', sid: 57330 }),
          A({ id: 'icebound', n: 'Незыблемость льда', en: 'Icebound Fortitude', i: '🧊',
            cd: 8, t: 'buff', fa: 1, dr: 0.4, bt: 2, school: 'none',
            d: '−40% урон · 2 хода · без хода', sid: 48792 }),
        ],
      },

      // ─── Unholy (dps) — unlocked ───────────────────────────
      {
        id: 'unholy',
        name: 'Нечестивость',
        nameEn: 'Unholy',
        role: 'dps',
        icon: '🧟',
        stats: { hp: 115, atk: 15, def: 5, speed: 11 },
        abilities: [
          A({ id: 'scourge', n: 'Удар Плети', en: 'Scourge Strike', i: '☠️',
            r: { u: 1 }, rp: 10, t: 'damage', fl: 26, school: 'shadow',
            cleaveOnDnd: 1,
            d: 'Руна нечестивости · 26т · дубль по Смерти и разложению', sid: 55090 }),
          A({ id: 'festering', n: 'Удар разложения', en: 'Festering Strike', i: '🦠',
            r: { b: 1, f: 1 }, rp: 20, t: 'damage', fl: 18, school: 'physical',
            cleaveOnDnd: 1,
            d: 'Кровь+лёд · 18т · дубль по Смерти и разложению', sid: 85948 }),
          A({ id: 'death_coil', n: 'Лик смерти', en: 'Death Coil', i: '🌀',
            cs: 40, t: 'damage', fl: 40, school: 'shadow',
            d: '40т · 40 силы рун', sid: 47541 }),
          A({ id: 'death_strike', n: 'Удар смерти', en: 'Death Strike', i: '💚',
            cs: 40, t: 'damage', fl: 10, school: 'physical',
            d: '10т · 40 силы рун · хил 10% запаса + 25% полученного за 2 хода', sid: 49998 }),
          A({ id: 'outbreak', n: 'Вспышка болезни', en: 'Outbreak', i: '🤢',
            cd: 6, t: 'aoe', fl: 15, school: 'shadow',
            applyDot: { flat: 6, turns: 4, name: 'Болезнь', icon: '🦠', id: 'plague', school: 'shadow' },
            d: '15т область + 6т×4 · КД 6 · в КД: 60 силы — весь дот сразу', sid: 77575 }),
          A({ id: 'dark_trans', n: 'Тёмное превращение', en: 'Dark Transformation', i: '👹',
            r: { u: 1 }, rp: 10, cd: 3, t: 'buff', fa: 1, school: 'none',
            d: 'Усиливает вурдалака · руна нечестивости · +10 силы рун · без хода', sid: 63560 }),
          A({ id: 'summon_garg', n: 'Призыв горгульи', en: 'Summon Gargoyle', i: '🦇',
            cd: 5, t: 'damage', fl: 18, school: 'shadow',
            d: '18т + горгулья 4 хода · КД 5', sid: 49206 }),
          A({ id: 'dnd', n: 'Смерть и разложение', en: 'Death and Decay', i: '☠️',
            r: { u: 1 }, rp: 10, cd: 8, t: 'aoe', fl: 14, school: 'shadow',
            applyDot: { flat: 4, turns: 3, name: 'Смерть и разложение', icon: '☠️', id: 'dnd', school: 'shadow' },
            d: '14т область + дебафф · КД 8 · свой экземпляр', sid: 43265 }),
        ],
      },
    ],
  };

  function applyDeathKnightBalance(classes) {
    if (!Array.isArray(classes) || !DEATHKNIGHT_CLASS) return false;
    const i = classes.findIndex((c) => c.id === 'deathknight');
    const clone = JSON.parse(JSON.stringify(DEATHKNIGHT_CLASS));
    if (i >= 0) classes[i] = clone; else classes.push(clone);
    return true;
  }

  global.DEATHKNIGHT_CLASS = DEATHKNIGHT_CLASS;
  global.DEATHKNIGHT_BALANCE = {
    version: '5.4.8-dk-s16',
    classId: 'deathknight',
    class: DEATHKNIGHT_CLASS,
    specs: DEATHKNIGHT_CLASS.specs,
    apply: applyDeathKnightBalance,
    A,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DEATHKNIGHT_CLASS, applyDeathKnightBalance, A };
  }

  global.CLASS_BALANCE_PACKS = global.CLASS_BALANCE_PACKS || [];
  global.CLASS_BALANCE_PACKS.push({ id: 'deathknight', apply: applyDeathKnightBalance });

})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
