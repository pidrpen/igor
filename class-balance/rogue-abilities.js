/**
 * Mythic Key — MoP 5.4.8 lite
 * Rogue balance kit (assassination / combat / subtlety)
 *
 * Модель: Energy (primary) + Combo (secondary).
 * Builders: genSec (gs) > 0
 * Finishers: costSec (cs) === 1 → при оплате dump ALL combo (движок)
 * Premeditation: только gs:2 (без hardcode +2 в castAbility)
 *
 * Не трогает mythic-key.html. Подключение: подмена specs rogue в WOW_CLASSES
 * или ручной merge полей abilities / resource / secondary / stats.
 */
(function (global) {
  'use strict';

  function A(o) {
    return {
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
  }

  /** Движок: FINISHER_IDS / EXECUTE_IDS (уже в mythic-key — не править). */
  const ENGINE_EXPECT = {
    FINISHER_IDS: ['envenom', 'eviscerate', 'rupture', 'slice'],
    EXECUTE_IDS: ['dispatch'],
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
      // ASSASSINATION — Mutilate / Dispatch / Envenom
      // ═════════════════════════════════════
      {
        id: 'assassination',
        name: 'Ликвидация',
        nameEn: 'Assassination',
        role: 'dps',
        icon: '☠️',
        stats: { hp: 95, atk: 18, def: 3, speed: 14 },
        identity: ['mutilate', 'dispatch', 'envenom'],
        abilities: [
          // main 2-CP builder (E/CP ≈ 27.5)
          A({
            id: 'mutilate', n: 'Мясорубка', en: 'Mutilate', i: '🔪',
            c: 55, gs: 2, t: 'damage', p: 1.35,
            d: 'Основной набор: 55 энергии, +2 к серии.', sid: 1329,
          }),
          // execute builder ≤35% (EXECUTE_IDS)
          A({
            id: 'dispatch', n: 'Ликвидация', en: 'Dispatch', i: '🗡️',
            c: 30, gs: 1, t: 'damage', p: 1.4,
            d: 'Дешёвый набор по цели ≤35% HP (+1 серия).', sid: 111240,
          }),
          // power finisher dump-all
          A({
            id: 'envenom', n: 'Отравление', en: 'Envenom', i: '💚',
            c: 35, cs: 1, t: 'damage', p: 1.5,
            d: 'Завершающий: вся серия → урон (cs:1 dump all).', sid: 32645,
          }),
          A({
            id: 'rupture', n: 'Рваная рана', en: 'Rupture', i: '🩸',
            c: 25, cs: 1, t: 'dot', p: 0.7,
            d: 'Завершающее кровотечение (вся серия). Mastery DoT.', sid: 1943,
          }),
          A({
            id: 'vendetta', n: 'Вендетта', en: 'Vendetta', i: '🎯',
            cd: 5, t: 'debuff', p: 0.3,
            d: 'КД: −защита / ослабление цели.', sid: 79140,
          }),
          A({
            id: 'fan', n: 'Веер клинков', en: 'Fan of Knives', i: '🌀',
            c: 35, gs: 1, t: 'aoe', p: 0.65,
            d: 'AoE-билдер: +1 к серии.', sid: 51723,
          }),
          A({
            id: 'garrote', n: 'Гаррота', en: 'Garrote', i: '🤐',
            c: 45, gs: 1, cd: 2, t: 'dot', p: 0.6,
            d: 'DoT-билдер +1 серия (без требования стелса).', sid: 703,
          }),
          A({
            id: 'slice', n: 'Нарезка', en: 'Slice and Dice', i: '⏱️',
            c: 25, cs: 1, t: 'buff', p: 0.22,
            d: 'Завершающий: +атака на 3 хода (сильнее с длинной серией).', sid: 5171,
          }),
          A({
            id: 'kick', n: 'Пинок', en: 'Kick', i: '🦵',
            c: 15, cd: 2, t: 'interrupt', p: 0,
            d: 'Прерывание (15 энергии).', sid: 1766,
          }),
        ],
      },

      // ═════════════════════════════════════
      // COMBAT — Sinister Strike / Eviscerate / Adrenaline Rush
      // ═════════════════════════════════════
      {
        id: 'combat',
        name: 'Бой',
        nameEn: 'Combat',
        role: 'dps',
        icon: '⚔️',
        stats: { hp: 100, atk: 17, def: 3, speed: 15 },
        identity: ['ss', 'eviscerate', 'adrenaline'],
        abilities: [
          // main 1-CP builder (40 E/CP — быстрее старого 50, всё ещё медленнее Assa Mut)
          A({
            id: 'ss', n: 'Коварный удар', en: 'Sinister Strike', i: '🗡️',
            c: 40, gs: 1, t: 'damage', p: 1.2,
            d: 'Основной набор: 40 энергии, +1 к серии.', sid: 1752,
          }),
          A({
            id: 'revealing', n: 'Пробивающий удар', en: 'Revealing Strike', i: '👁️',
            c: 35, gs: 1, cd: 1, t: 'damage', p: 1.15,
            d: 'Чуть дешевле набор (+1 серия). КД 1.', sid: 84617,
          }),
          A({
            id: 'eviscerate', n: 'Потрошение', en: 'Eviscerate', i: '💥',
            c: 35, cs: 1, t: 'damage', p: 1.55,
            d: 'Главный завершающий: вся серия → урон.', sid: 2098,
          }),
          A({
            id: 'killing_spree', n: 'Череда убийств', en: 'Killing Spree', i: '🏃',
            cd: 5, t: 'aoe', p: 1.15,
            d: 'Бесплатный AoE-бёрст (КД 5).', sid: 51690,
          }),
          // lite: +энергия при касте (g) + ATK-бафф — без правки engine regen
          A({
            id: 'adrenaline', n: 'Выброс адреналина', en: 'Adrenaline Rush', i: '💉',
            cd: 5, g: 40, t: 'buff', p: 0.28,
            d: '+40 энергии сразу и +атака на 3 хода (lite AR).', sid: 13750,
          }),
          A({
            id: 'blade_flurry', n: 'Шквал клинков', en: 'Blade Flurry', i: '🌪️',
            c: 25, cd: 2, t: 'buff', p: 0.18,
            d: '+атака (упрощ. cleave → self ATK).', sid: 13877,
          }),
          A({
            id: 'fan', n: 'Веер клинков', en: 'Fan of Knives', i: '🌀',
            c: 35, gs: 1, t: 'aoe', p: 0.7,
            d: 'AoE + 1 к серии (как Assa).', sid: 51723,
          }),
          A({
            id: 'slice', n: 'Нарезка', en: 'Slice and Dice', i: '⏱️',
            c: 25, cs: 1, t: 'buff', p: 0.22,
            d: 'Завершающий: +атака на 3 хода.', sid: 5171,
          }),
          A({
            id: 'rupture', n: 'Рваная рана', en: 'Rupture', i: '🩸',
            c: 25, cs: 1, t: 'dot', p: 0.7,
            d: 'Завершающее кровотечение (вся серия).', sid: 1943,
          }),
        ],
      },

      // ═════════════════════════════════════
      // SUBTLETY — Hemorrhage / Backstab / Shadow Dance
      // Premeditation: gs:2 ONLY (no double)
      // ═════════════════════════════════════
      {
        id: 'subtlety',
        name: 'Скрытность',
        nameEn: 'Subtlety',
        role: 'dps',
        icon: '🌑',
        stats: { hp: 92, atk: 18, def: 2, speed: 15 },
        identity: ['hemorrhage', 'backstab', 'shadow_dance'],
        abilities: [
          // cheap filler builder — AI (bestByPower) предпочтёт Backstab/Ambush;
          // Hemo — energy-safe кнопка игрока
          A({
            id: 'hemorrhage', n: 'Кровоизлияние', en: 'Hemorrhage', i: '🩸',
            c: 30, gs: 1, t: 'damage', p: 1.15,
            d: 'Дешёвый набор: 30 энергии, +1 к серии.', sid: 16511,
          }),
          A({
            id: 'backstab', n: 'Удар в спину', en: 'Backstab', i: '🔪',
            c: 50, gs: 1, t: 'damage', p: 1.4,
            d: 'Дорогой набор: 50 энергии, +1 к серии, выше урон.', sid: 53,
          }),
          A({
            id: 'eviscerate', n: 'Потрошение', en: 'Eviscerate', i: '💥',
            c: 35, cs: 1, t: 'damage', p: 1.55,
            d: 'Завершающий: вся серия → урон. Mastery finisher.', sid: 2098,
          }),
          // 2-CP burst builder (stealth/Dance упрощены — всегда доступен)
          A({
            id: 'ambush', n: 'Внезапный удар', en: 'Ambush', i: '😮',
            c: 50, gs: 2, t: 'damage', p: 1.55,
            d: 'Сильный удар +2 к серии (без стелса, lite).', sid: 8676,
          }),
          A({
            id: 'shadow_dance', n: 'Танец теней', en: 'Shadow Dance', i: '💃',
            cd: 4, t: 'buff', p: 0.28,
            d: '+атака на 3 хода (упрощ. Dance-окно).', sid: 51713,
          }),
          // CRITICAL: only gs:2 — castAbility must NOT add another +2
          A({
            id: 'prem', n: 'Умысел', en: 'Premeditation', i: '🧠',
            cd: 3, gs: 2, t: 'buff', p: 0,
            d: '+2 к серии без удара (только genSec, без double).', sid: 14183,
          }),
          A({
            id: 'rupture', n: 'Рваная рана', en: 'Rupture', i: '🩸',
            c: 25, cs: 1, t: 'dot', p: 0.75,
            d: 'Завершающее кровотечение (вся серия).', sid: 1943,
          }),
          A({
            id: 'fan', n: 'Веер клинков', en: 'Fan of Knives', i: '🌀',
            c: 35, gs: 1, t: 'aoe', p: 0.65,
            d: 'AoE + 1 к серии.', sid: 51723,
          }),
          A({
            id: 'slice', n: 'Нарезка', en: 'Slice and Dice', i: '⏱️',
            c: 25, cs: 1, t: 'buff', p: 0.22,
            d: 'Завершающий: +атака на 3 хода.', sid: 5171,
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
    for (const balSpec of ROGUE_CLASS.specs) {
      const target = (wowClass.specs || []).find((s) => s.id === balSpec.id);
      if (!target) continue;
      target.stats = { ...balSpec.stats };
      target.abilities = balSpec.abilities.map((a) => ({ ...a }));
    }
    return wowClass;
  }

  const API = {
    ROGUE_CLASS,
    ENGINE_EXPECT,
    A,
    indexByAbility,
    applyToWowClass,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }
  global.ROGUE_BALANCE = API;
  function applyRogueBalance(classes) {
    if (!Array.isArray(classes)) return false;
    const i = classes.findIndex((c) => c.id === 'rogue');
    if (i < 0) {
      classes.push(JSON.parse(JSON.stringify(ROGUE_CLASS)));
      return true;
    }
    applyToWowClass(classes[i]);
    return true;
  }
  API.apply = applyRogueBalance;
  global.CLASS_BALANCE_PACKS = global.CLASS_BALANCE_PACKS || [];
  global.CLASS_BALANCE_PACKS.push({ id: 'rogue', apply: applyRogueBalance });

})(typeof window !== 'undefined' ? window : globalThis);
