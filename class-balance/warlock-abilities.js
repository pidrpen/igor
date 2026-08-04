/**
 * Mythic Key MoP 5.4.8 lite — Warlock balance package
 * class-balance/warlock-abilities.js
 *
 * Secondary: soul_shards (max 4, start 1) on ALL specs.
 * Cycle rule: every spec must have genSec (gs) builders AND costSec (cs) spenders.
 *
 * Aff: Drain Soul gs · Haunt (+Soulburn) cs
 * Demo: Shadow Bolt / Hand of Gul'dan gs · Soul Fire / Metamorphosis cs
 * Destro: Incinerate / Conflagrate gs · Chaos Bolt / Shadowburn / Ember Tap cs
 *   (Chaos Bolt is fixed-cost secondary spend — NOT combo finisher scale)
 *
 * Drop-in: merge `WARLOCK_CLASS` into WOW_CLASSES (replace warlock entry),
 * or copy per-spec abilities into wow-mop-data.js.
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

  /** Engine integration notes (do not require mythic-key.html edits if already true). */
  const ENGINE_NEEDS = {
    secondaryType: 'soul_shards',
    secondaryMax: 4,
    secondaryStart: 1,
    secondaryRegen: 0,
    /**
     * Destruction fantasy = Burning Embers, but lite uses the same soul_shards secondary.
     * Incinerate/Conflagrate gs model ember fill; Chaos Bolt/Shadowburn/Ember Tap cs model ember spend.
     * No separate burning_embers type required for the cycle to work.
     */
    embersNote:
      'Destro secondary is soul_shards standing in for Burning Embers. ' +
      'Do NOT put chaos_bolt in FINISHER_IDS combo scaling. ' +
      'Fixed cs:1 keep base power (engine already scales finisher only when secondary.type === "combo"). ' +
      'shadowburn must remain in EXECUTE_IDS (≤35% HP).',
    chaosBolt: {
      id: 'chaos_bolt',
      costSec: 1,
      finisherComboScale: false,
      reason: 'cs:1 fixed spend must keep power 2.0; combo mult would cut signature nuke',
    },
    executeIds: ['shadowburn'],
    floorResetShards: 1,
    ai: {
      builderWhen: 'secondary.current < max - 1',
      spenderWhen: 'secondary.current >= 2 (non-combo threshold)',
      note: 'With gs:1 and cs:1, AI can loop build→spend without ≥3 holy-power style threshold issues',
    },
  };

  const WARLOCK_CLASS = {
    id: 'warlock',
    name: 'Чернокнижник',
    nameEn: 'Warlock',
    icon: '😈',
    color: '#9482C9',
    resource: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 5 },
    secondary: { type: 'soul_shards', name: 'Осколки души', icon: '💎', max: 4, start: 1 },
    engineNeeds: ENGINE_NEEDS,
    specs: [
      {
        id: 'affliction',
        name: 'Колдовство',
        nameEn: 'Affliction',
        role: 'dps',
        icon: '😫',
        stats: { hp: 90, atk: 17, def: 2, speed: 10 },
        cycle: {
          gen: [{ id: 'drain_soul', gs: 1 }],
          cost: [
            { id: 'haunt', cs: 1, role: 'damage spender' },
            { id: 'soulburn', cs: 1, role: 'buff spender' },
          ],
        },
        abilities: [
          A({ id: 'agony', n: 'Агония', en: 'Agony', i: '😣', c: 5, cd: 1, t: 'dot', p: 0.55, d: 'DoT.', sid: 980 }),
          A({ id: 'corruption', n: 'Порча', en: 'Corruption', i: '🟢', c: 4, t: 'dot', p: 0.55, d: 'DoT.', sid: 172 }),
          A({ id: 'ua', n: 'Нестабильное колдовство', en: 'Unstable Affliction', i: '💜', c: 7, cd: 1, t: 'dot', p: 0.7, d: 'Сильный DoT.', sid: 30108 }),
          A({ id: 'malefic', n: 'Хватка малефиция', en: 'Malefic Grasp', i: '🖐️', c: 7, t: 'damage', p: 1.15, d: 'Канал-заполнитель.', sid: 103103 }),
          A({ id: 'haunt', n: 'Блуждающий дух', en: 'Haunt', i: '👻', c: 10, cs: 1, cd: 2, t: 'damage', p: 1.65, d: 'Расход 1 осколка — сильный удар.', sid: 48181 }),
          A({ id: 'drain_soul', n: 'Похищение души', en: 'Drain Soul', i: '🌑', c: 5, gs: 1, t: 'damage', p: 1.05, d: 'Урон + 1 осколок души.', sid: 1120 }),
          A({ id: 'seed', n: 'Семя порчи', en: 'Seed of Corruption', i: '🌱', c: 11, t: 'aoe', p: 0.75, d: 'AoE.', sid: 27243 }),
          A({ id: 'dark_soul', n: 'Тёмная душа: Злорадство', en: 'Dark Soul: Misery', i: '😈', cd: 5, t: 'buff', p: 0.3, d: '+30% атаки.', sid: 113860 }),
          A({ id: 'soulburn', n: 'Сожжение души', en: 'Soulburn', i: '🔥', cs: 1, cd: 2, t: 'buff', p: 0.25, d: 'Расход 1 осколка — +атака.', sid: 74434 }),
        ],
      },
      {
        id: 'demonology',
        name: 'Демонология',
        nameEn: 'Demonology',
        role: 'dps',
        icon: '👹',
        stats: { hp: 100, atk: 16, def: 4, speed: 10 },
        cycle: {
          // MoP Demonic Fury simplified onto soul_shards
          gen: [
            { id: 'shadow_bolt', gs: 1 },
            { id: 'hand_guldan', gs: 1 },
          ],
          cost: [
            { id: 'soul_fire', cs: 1, role: 'damage spender' },
            { id: 'metamorphosis', cs: 1, role: 'form buff spender' },
          ],
        },
        abilities: [
          A({ id: 'shadow_bolt', n: 'Стрела Тьмы', en: 'Shadow Bolt', i: '🌑', c: 7, gs: 1, t: 'damage', p: 1.15, d: 'Заполнитель + 1 осколок (упрощ. fury).', sid: 686 }),
          A({ id: 'soul_fire', n: 'Ожог души', en: 'Soul Fire', i: '🔥', c: 12, cs: 1, t: 'damage', p: 1.7, d: 'Расход 1 осколка — сильный удар.', sid: 6353 }),
          A({ id: 'corruption', n: 'Порча', en: 'Corruption', i: '🟢', c: 5, t: 'dot', p: 0.55, d: 'DoT.', sid: 172 }),
          A({ id: 'hand_guldan', n: 'Длань Гул\'дана', en: "Hand of Gul'dan", i: '✋', c: 10, gs: 1, cd: 2, t: 'aoe', p: 0.95, d: 'AoE + бесы + 1 осколок.', sid: 105174 }),
          A({ id: 'hellfire', n: 'Адское пламя', en: 'Hellfire', i: '🔥', c: 10, t: 'aoe', p: 0.8, d: 'AoE вокруг себя.', sid: 1949 }),
          A({ id: 'metamorphosis', n: 'Метаморфоза', en: 'Metamorphosis', i: '👹', cs: 1, cd: 4, t: 'buff', p: 0.28, d: 'Расход 1 осколка: +атака/защита 4 хода.', sid: 103958 }),
          A({ id: 'doom', n: 'Рок', en: 'Doom', i: '💀', c: 8, cd: 2, t: 'dot', p: 0.75, d: 'Долгий DoT.', sid: 603 }),
          A({ id: 'dark_soul', n: 'Тёмная душа: Знание', en: 'Dark Soul: Knowledge', i: '😈', cd: 5, t: 'buff', p: 0.3, d: '+30% атаки.', sid: 113861 }),
          A({ id: 'felstorm', n: 'Буря Скверны (страж)', en: 'Felstorm', i: '🌪️', cd: 3, t: 'aoe', p: 0.85, d: 'Страж бьёт по области.', sid: 89751 }),
        ],
      },
      {
        id: 'destruction',
        name: 'Разрушение',
        nameEn: 'Destruction',
        role: 'dps',
        icon: '🔥',
        stats: { hp: 90, atk: 18, def: 2, speed: 11 },
        cycle: {
          // MoP Burning Embers simplified onto soul_shards
          gen: [
            { id: 'incinerate', gs: 1 },
            { id: 'conflag', gs: 1 },
          ],
          cost: [
            { id: 'chaos_bolt', cs: 1, role: 'ST nuke (NOT finisher scale)' },
            { id: 'shadowburn', cs: 1, role: 'execute ≤35%' },
            { id: 'ember_tap', cs: 1, role: 'self-heal' },
          ],
        },
        abilities: [
          A({ id: 'incinerate', n: 'Испепеление', en: 'Incinerate', i: '🔥', c: 7, gs: 1, t: 'damage', p: 1.2, d: 'Заполнитель + 1 осколок (упрощ. угли).', sid: 29722 }),
          A({ id: 'immolate', n: 'Жертвенный огонь', en: 'Immolate', i: '🕯️', c: 6, cd: 1, t: 'dot', p: 0.6, d: 'DoT.', sid: 348 }),
          A({ id: 'chaos_bolt', n: 'Стрела Хаоса', en: 'Chaos Bolt', i: '☄️', c: 10, cs: 1, t: 'damage', p: 2.0, d: 'Расход 1 осколка — главный удар (фикс. cost, не combo-scale).', sid: 116858 }),
          A({ id: 'conflag', n: 'Поджигание', en: 'Conflagrate', i: '💥', c: 5, gs: 1, cd: 1, t: 'damage', p: 1.25, d: 'Мгновенно + 1 осколок.', sid: 17962 }),
          A({ id: 'shadowburn', n: 'Ожог Тьмы', en: 'Shadowburn', i: '🌑', c: 8, cs: 1, cd: 2, t: 'damage', p: 1.75, d: 'Осколок. Добивание ≤35%.', sid: 17877 }),
          A({ id: 'rain_fire', n: 'Огненный ливень', en: 'Rain of Fire', i: '🌧️', c: 12, t: 'aoe', p: 0.8, d: 'AoE.', sid: 5740 }),
          A({ id: 'havoc', n: 'Хаос', en: 'Havoc', i: '🎯', c: 5, cd: 3, t: 'debuff', p: 0.2, d: '−атака цели.', sid: 80240 }),
          A({ id: 'dark_soul', n: 'Тёмная душа: Нестабильность', en: 'Dark Soul: Instability', i: '😈', cd: 5, t: 'buff', p: 0.3, d: '+30% атаки.', sid: 113858 }),
          A({ id: 'ember_tap', n: 'Вытягивание угля', en: 'Ember Tap', i: '🔥', cs: 1, cd: 2, t: 'heal', p: 0.25, d: 'Расход 1 осколка — самолечение.', sid: 114635 }),
        ],
      },
    ],
  };

  /** Flat lookup: abilityId → { cost, gen, costSec, genSec, power, type, cd, specs[] } */
  const WARLOCK_ABILITY_INDEX = {};
  for (const spec of WARLOCK_CLASS.specs) {
    for (const ab of spec.abilities) {
      if (!WARLOCK_ABILITY_INDEX[ab.id]) {
        WARLOCK_ABILITY_INDEX[ab.id] = {
          id: ab.id,
          name: ab.name,
          nameEn: ab.nameEn,
          cost: ab.cost,
          gen: ab.gen,
          costSec: ab.costSec,
          genSec: ab.genSec,
          power: ab.power,
          type: ab.type,
          cd: ab.cd,
          spellId: ab.spellId,
          specs: [],
        };
      }
      WARLOCK_ABILITY_INDEX[ab.id].specs.push(spec.id);
    }
  }

  /** Cycle validation helper (true if every spec has ≥1 gs and ≥1 cs). */
  function validateShardCycles(cls) {
    const report = [];
    for (const spec of cls.specs) {
      const gens = spec.abilities.filter((a) => a.genSec > 0).map((a) => a.id);
      const costs = spec.abilities.filter((a) => a.costSec > 0).map((a) => a.id);
      report.push({
        spec: spec.id,
        ok: gens.length > 0 && costs.length > 0,
        generators: gens,
        spenders: costs,
      });
    }
    return report;
  }

  const WARLOCK_BALANCE = {
    version: 'mop-5.4.8-lite-warlock-v1',
    class: WARLOCK_CLASS,
    engineNeeds: ENGINE_NEEDS,
    index: WARLOCK_ABILITY_INDEX,
    validate: () => validateShardCycles(WARLOCK_CLASS),
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = WARLOCK_BALANCE;
  }
  global.WARLOCK_BALANCE = WARLOCK_BALANCE;
  global.WARLOCK_CLASS = WARLOCK_CLASS;
})(typeof window !== 'undefined' ? window : globalThis);
