/**
 * Mythic Key — MoP 5.4.8 lite
 * Rogue balance kit (assassination / combat / subtlety) — test rebalance
 *
 * Модель: Energy (primary) + Combo (secondary).
 * Builders: genSec (gs) > 0
 * Finishers: costSec (cs) === 1 → при оплате dump ALL combo (движок)
 * Premeditation: только gs:2 (без hardcode +2 в castAbility)
 *
 * FLAT_REF ≈ 15т → 1.0× atk. Builders/AoE — fl; combo-finishers — power
 * (DoT-тики rupture / SnD power-scale от потраченных CP).
 *
 * Не трогает mythic-key.html. Подключение: ROGUE_BALANCE.apply / apply-all.js.
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
    if (o.vuln) ab.vuln = o.vuln;
    if (o.applyDot) ab.applyDot = o.applyDot;
    if (o.applyHot) ab.applyHot = o.applyHot;
    if (o.school) ab.school = o.school;
    if (o.maxCharges != null) ab.maxCharges = o.maxCharges;
    if (o.ch != null) ab.maxCharges = o.ch;
    if (o.dmgReduce != null) ab.dmgReduce = o.dmgReduce;
    if (o.dr != null) ab.dmgReduce = o.dr;
    if (o.critBonus != null) ab.critBonus = o.critBonus;
    if (o.critMod != null) ab.critMod = o.critMod;
    if (o.cm != null) ab.critMod = o.cm;
    if (o.atkMod != null) ab.atkMod = o.atkMod;
    if (o.maxHpPct != null) ab.maxHpPct = o.maxHpPct;
    if (o.hpPct != null) ab.maxHpPct = o.hpPct;
    if (o.buffTurns != null) ab.buffTurns = o.buffTurns;
    if (o.bt != null) ab.buffTurns = o.bt;
    if (o.enemyDmgMod != null) ab.enemyDmgMod = o.enemyDmgMod;
    if (o.cleaveFlat != null) ab.cleaveFlat = o.cleaveFlat;
    if (o.lifesteal != null) ab.lifesteal = o.lifesteal;
    if (o.grantSelfBuff) ab.grantSelfBuff = o.grantSelfBuff;
    if (o.applyDotAoe || o.dotAoe) ab.applyDotAoe = true;
    return ab;
  }

  /** Движок: FINISHER_IDS / EXECUTE_IDS (уже в mythic-key — не править). */
  const ENGINE_EXPECT = {
    FINISHER_IDS: ['dispatch', 'eviscerate', 'rupture'],
    EXECUTE_IDS: [],
    /** cs:1 + secondary.type==='combo' → need ≥1, spend all, _spentSec = all CP */
    comboFinisherRule: 'cs:1 dumps all',
    /** Prem: +CP только через genSec в payAbility (спецкейс castAbility не должен +2) */
    premOnlyGenSec: true,
  };

  const ROGUE_CLASS = {
    id: 'rogue',
    name: 'Разбойник',
    nameEn: 'Rogue',
    icon: '🗡️',
    color: '#FFF569',
    resource: {
      type: 'energy',
      name: 'Энергия',
      icon: '⚡',
      max: 100,
      start: 100,
      regen: 20,
    },
    secondary: {
      type: 'combo',
      name: 'Серия приёмов',
      icon: '🃏',
      max: 5,
      start: 0,
    },
    mastery: {
      assassination: { name: 'Сильные яды', desc: '+% DoT / отравления', kind: 'dot', rate: 1.45 },
      combat:        { name: 'Удар с левой', desc: '+% урона (мультиудар)', kind: 'dmg', rate: 1.35 },
      subtlety:      { name: 'Палач', desc: '+% завершающих приёмов', kind: 'finisher', rate: 1.5 },
    },
    specs: [
      // ═════════════════════════════════════
      // ASSASSINATION — poisons / Garrote / Envenom
      // Loop: Mutilate×2–3 → Envenom | Garrote/Rupture DoT | Vendetta window
      // ═════════════════════════════════════
      {
        id: 'assassination',
        name: 'Ликвидация',
        nameEn: 'Assassination',
        role: 'dps',
        icon: '☠️',
        testBuild: true,
        // atk 15 = FLAT_REF: вес Nт ≈ Nт в бою
        stats: { hp: 95, atk: 15, def: 3, speed: 14 },
        identity: ['mutilate', 'dispatch', 'envenom', 'garrote'],
        abilities: [
          A({
            id: 'mutilate', n: 'Мясорубка', en: 'Mutilate', i: '🔪',
            c: 38, gs: 2, t: 'damage', fl: 28, school: 'physical',
            applyDot: { flat: 3, turns: 5, name: 'Смертельный яд', icon: '💚', id: 'deadly_poison', school: 'nature' },
            d: '38 эн · 28т · +2 серии · яд 3т×5', sid: 1329,
          }),
          A({
            id: 'dispatch', n: 'Ликвидация', en: 'Dispatch', i: '🗡️',
            c: 0, cd: 3, cs: 1, t: 'damage', fl: 36, school: 'physical',
            d: 'Бесплатно · КД 3 · завершающий · при 5 очках 56т', sid: 111240,
          }),
          A({
            id: 'envenom', n: 'Отравление', en: 'Envenom', i: '💚',
            c: 25, t: 'damage', fl: 20, school: 'nature',
            applyDot: { flat: 2.5, turns: 2, name: 'Отравление', icon: '💚', id: 'envenom', school: 'nature' },
            applyDotAoe: 1,
            d: '25 эн · 20т + область 2.5т×2 · серию не тратит', sid: 32645,
          }),
          A({
            id: 'rupture', n: 'Рваная рана', en: 'Rupture', i: '🩸',
            c: 25, cs: 1, t: 'damage', fl: 9, school: 'physical',
            applyDot: { flat: 6, turns: 4, name: 'Рваная рана', icon: '🩸', id: 'rupture', school: 'physical' },
            d: '25 эн · завершающий · при 5 очках 14т + 6т×4', sid: 1943,
          }),
          A({
            id: 'garrote', n: 'Гаррота', en: 'Garrote', i: '🤐',
            c: 35, gs: 1, cd: 2, t: 'dot', fl: 8, school: 'physical',
            applyDot: { flat: 5, turns: 5, name: 'Гаррота', icon: '🤐', id: 'garrote', school: 'physical' },
            d: '35 эн · 8т + bleed 5т×5 · +1 серии · КД 2', sid: 703,
          }),
          A({
            id: 'vendetta', n: 'Вендетта', en: 'Vendetta', i: '🎯',
            cd: 5, t: 'damage', fl: 4, school: 'physical', fa: 1,
            vuln: { amount: 0.3, turns: 3, physical: false },
            d: '4т · +30% входящего от наложившего · 3х · без хода · КД 5', sid: 79140,
          }),
          A({
            id: 'fan', n: 'Веер клинков', en: 'Fan of Knives', i: '🌀',
            c: 35, gs: 1, t: 'aoe', fl: 14, school: 'physical',
            d: '35 эн · 14т AoE · +1 серии', sid: 51723,
          }),
          A({
            id: 'slice', n: 'Нарезка', en: 'Slice and Dice', i: '⏱️',
            c: 0, t: 'buff', fa: 1, school: 'none',
            grantSelfBuff: {
              id: 'next_aoe', name: 'Нарезка', icon: '⏱️',
              turns: 99, stacks: 1,
              tip: 'След. атака — область; дот тоже на всех',
            },
            d: 'Бесплатно · без хода · след. атака область', sid: 5171,
          }),
        ],
      },

      // ═════════════════════════════════════
      // COMBAT — Sinister Strike / Blade Flurry / Adrenaline
      // Loop: SS/Revealing → Eviscerate | Blade Flurry cleave | AR burst
      // ═════════════════════════════════════
      {
        id: 'combat',
        name: 'Бой',
        nameEn: 'Combat',
        role: 'dps',
        icon: '⚔️',
        testBuild: true,
        stats: { hp: 100, atk: 15, def: 3, speed: 15 },
        identity: ['ss', 'eviscerate', 'blade_flurry', 'adrenaline'],
        abilities: [
          A({
            id: 'ss', n: 'Коварный удар', en: 'Sinister Strike', i: '🗡️',
            c: 32, gs: 1, t: 'damage', fl: 24, school: 'physical',
            d: '32 эн · 24т · +1 серии', sid: 1752,
          }),
          A({
            id: 'revealing', n: 'Пробивающий удар', en: 'Revealing Strike', i: '👁️',
            c: 20, gs: 1, cd: 4, t: 'damage', fl: 20, school: 'physical',
            vuln: { amount: 0.1, turns: 3, physical: true },
            d: '20 эн · 20т · +1 серии · +10% физ. 3х · КД 4', sid: 84617,
          }),
          A({
            id: 'eviscerate', n: 'Потрошение', en: 'Eviscerate', i: '💥',
            c: 35, cs: 1, t: 'damage', fl: 39, school: 'physical',
            d: '35 эн · завершающий · при 5 очках 60т', sid: 2098,
          }),
          A({
            id: 'killing_spree', n: 'Череда убийств', en: 'Killing Spree', i: '🏃',
            cd: 5, t: 'aoe', fl: 14, hits: 2, school: 'physical',
            applyDot: { flat: 4, turns: 2, name: 'Череда убийств', icon: '🩸', id: 'killing_spree', school: 'physical' },
            d: '14т×2 AoE + кровотечение 4т×2 · КД 5', sid: 51690,
          }),
          A({
            id: 'adrenaline', n: 'Выброс адреналина', en: 'Adrenaline Rush', i: '💉',
            cd: 5, g: 40, t: 'buff', fa: 1, atkMod: 0.25, bt: 3, school: 'none',
            d: '+40 эн · +25% атаки 3х · без хода · КД 5', sid: 13750,
          }),
          A({
            id: 'blade_flurry', n: 'Шквал клинков', en: 'Blade Flurry', i: '🌪️',
            c: 25, cd: 3, t: 'buff', fa: 1, atkMod: 0.12, bt: 4, school: 'none',
            d: '25 эн · +12% атаки 4х (клив-окно) · без хода · КД 3', sid: 13877,
          }),
          A({
            id: 'fan', n: 'Веер клинков', en: 'Fan of Knives', i: '🌀',
            c: 35, gs: 1, t: 'aoe', fl: 7, school: 'physical',
            d: '35 эн · 7т AoE · +1 серии', sid: 51723,
          }),
          A({
            id: 'slice', n: 'Нарезка', en: 'Slice and Dice', i: '⏱️',
            c: 0, t: 'buff', fa: 1, school: 'none',
            grantSelfBuff: {
              id: 'next_aoe', name: 'Нарезка', icon: '⏱️',
              turns: 99, stacks: 1,
              tip: 'След. атака — область; дот тоже на всех',
            },
            d: 'Бесплатно · без хода · след. атака область', sid: 5171,
          }),
        ],
      },

      // ═════════════════════════════════════
      // SUBTLETY — Ambush / Shadow Dance / Premeditation
      // Loop: Prem → Ambush/Backstab → Evis · Dance window
      // Premeditation: gs:2 ONLY (no double in castAbility)
      // ═════════════════════════════════════
      {
        id: 'subtlety',
        name: 'Скрытность',
        nameEn: 'Subtlety',
        role: 'dps',
        icon: '🌑',
        testBuild: true,
        stats: { hp: 92, atk: 15, def: 2, speed: 15 },
        identity: ['hemorrhage', 'backstab', 'ambush', 'shadow_dance'],
        abilities: [
          A({
            id: 'hemorrhage', n: 'Кровоизлияние', en: 'Hemorrhage', i: '🩸',
            c: 28, gs: 1, t: 'damage', fl: 20, school: 'physical',
            applyDot: { flat: 3, turns: 4, name: 'Кровотечение', icon: '🩸', id: 'hemo_bleed', school: 'physical' },
            d: '28 эн · 20т · +1 серии · bleed 3т×4', sid: 16511,
          }),
          A({
            id: 'backstab', n: 'Удар в спину', en: 'Backstab', i: '🔪',
            c: 38, gs: 1, t: 'damage', fl: 28, school: 'physical',
            d: '38 эн · 28т · +1 серии', sid: 53,
          }),
          A({
            id: 'ambush', n: 'Внезапный удар', en: 'Ambush', i: '😮',
            c: 35, gs: 2, t: 'damage', fl: 32, school: 'physical',
            d: '35 эн · 32т · +2 серии (окно Dance / lite без стелса)', sid: 8676,
          }),
          A({
            id: 'eviscerate', n: 'Потрошение', en: 'Eviscerate', i: '💥',
            c: 35, cs: 1, t: 'damage', fl: 38, school: 'physical',
            d: '35 эн · завершающий · при 5 очках 59т', sid: 2098,
          }),
          A({
            id: 'shadow_dance', n: 'Танец теней', en: 'Shadow Dance', i: '💃',
            cd: 4, t: 'buff', fa: 1, atkMod: 0.28, bt: 3, school: 'none',
            d: '+28% атаки 3х (окно Dance) · без хода · КД 4', sid: 51713,
          }),
          A({
            id: 'prem', n: 'Умысел', en: 'Premeditation', i: '🧠',
            cd: 3, gs: 2, t: 'buff', p: 0, fa: 1, school: 'none',
            d: '+2 серии без удара · без хода · КД 3', sid: 14183,
          }),
          A({
            id: 'fan', n: 'Веер клинков', en: 'Fan of Knives', i: '🌀',
            c: 35, gs: 1, t: 'aoe', fl: 14, school: 'physical',
            d: '35 эн · 14т AoE · +1 серии', sid: 51723,
          }),
          A({
            id: 'slice', n: 'Нарезка', en: 'Slice and Dice', i: '⏱️',
            c: 0, t: 'buff', fa: 1, school: 'none',
            grantSelfBuff: {
              id: 'next_aoe', name: 'Нарезка', icon: '⏱️',
              turns: 99, stacks: 1,
              tip: 'След. атака — область; дот тоже на всех',
            },
            d: 'Бесплатно · без хода · след. атака область', sid: 5171,
          }),
        ],
      },
    ],
  };

  /** Плоский индекс ability id → { specId, ability } */
  function indexByAbility() {
    const map = Object.create(null);
    for (const spec of ROGUE_CLASS.specs) {
      for (const ab of spec.abilities) {
        if (!map[ab.id]) map[ab.id] = [];
        map[ab.id].push({ specId: spec.id, ability: ab });
      }
    }
    return map;
  }

  /**
   * Применить кит к объекту класса из WOW_CLASSES (мутация in-place).
   * @param {object} wowClass — элемент WOW_CLASSES с id==='rogue'
   */
  function applyToWowClass(wowClass) {
    if (!wowClass || wowClass.id !== 'rogue') {
      throw new Error('applyToWowClass: expected class id "rogue"');
    }
    wowClass.resource = { ...ROGUE_CLASS.resource };
    wowClass.secondary = { ...ROGUE_CLASS.secondary };
    if (ROGUE_CLASS.mastery) wowClass.mastery = JSON.parse(JSON.stringify(ROGUE_CLASS.mastery));
    for (const balSpec of ROGUE_CLASS.specs) {
      const target = (wowClass.specs || []).find((s) => s.id === balSpec.id);
      if (!target) continue;
      target.stats = { ...balSpec.stats };
      target.abilities = balSpec.abilities.map((a) => ({ ...a }));
      if (balSpec.identity) target.identity = balSpec.identity.slice();
      if (balSpec.testBuild != null) target.testBuild = balSpec.testBuild;
    }
    return wowClass;
  }

  function applyRogueBalance(classes) {
    if (!Array.isArray(classes)) return false;
    const i = classes.findIndex((c) => c.id === 'rogue');
    const clone = JSON.parse(JSON.stringify(ROGUE_CLASS));
    if (i < 0) {
      classes.push(clone);
      return true;
    }
    classes[i] = clone;
    return true;
  }

  const API = {
    version: 'mop-5.4.8-lite-rogue-test',
    ROGUE_CLASS,
    class: ROGUE_CLASS,
    classId: 'rogue',
    ENGINE_EXPECT,
    A,
    indexByAbility,
    applyToWowClass,
    apply: applyRogueBalance,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }
  global.ROGUE_BALANCE = API;
  global.ROGUE_CLASS = ROGUE_CLASS;
  global.CLASS_BALANCE_PACKS = global.CLASS_BALANCE_PACKS || [];
  global.CLASS_BALANCE_PACKS.push({ id: 'rogue', apply: applyRogueBalance });

})(typeof window !== 'undefined' ? window : globalThis);
