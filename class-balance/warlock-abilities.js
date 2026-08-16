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
    const keys = [
      'flat','freeAction','maxCharges','applyDot','applyHot','dmgReduce','blockChanceAdd','blockValueAdd',
      'armorMod','armorStacksMax','critBonus','critMod','atkMod','lifesteal','vuln','hits','cleaveFlat',
      'school','maxHpPct','buffTurns','aoeBounce','shieldFromDmg','enemyDmgMod','grantBlock','holyShock',
      'purifyPct','healAmp','nextHealCharges','abilityCharges','staggerBonus','chainDecay','summonOnCast', 'petAtkMod', 'chainPrimary'];
    for (const k of keys) if (o[k] !== undefined) ab[k] = o[k];
    if (o.fl != null) ab.flat = o.fl;
    if (o.fa) ab.freeAction = true;
    if (o.bt != null) ab.buffTurns = o.bt;
    if (o.dr != null) ab.dmgReduce = o.dr;
    if (o.cm != null) ab.critMod = o.cm;
    if (o.ch != null) ab.maxCharges = o.ch;
    return ab;
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
        // Affliction (testBuild) — multi-DoT + shard cycle
        // ST fl: haunt 32 > malefic 20 > drain 16; DoTs 8–10 hit + ticks
        id: 'affliction',
        name: 'Колдовство',
        nameEn: 'Affliction',
        role: 'dps',
        icon: '😫',
        testBuild: true,
        stats: { hp: 90, atk: 15, def: 2, speed: 10 },
        cycle: {
          gen: [{ id: 'drain_soul', gs: 1 }],
          cost: [
            { id: 'haunt', cs: 1, role: 'damage spender' },
            { id: 'soulburn', cs: 1, role: 'buff spender' },
          ],
        },
        abilities: [
          A({ id: 'agony', n: 'Агония', en: 'Agony', i: '😣',
            c: 5, cd: 2, t: 'dot', fl: 8, school: 'shadow',
            applyDot: { flat: 5, turns: 6, name: 'Агония', id: 'agony', icon: '😣', school: 'shadow' },
            d: '5т×6 · КД 2', sid: 980 }),
          A({ id: 'corruption', n: 'Порча', en: 'Corruption', i: '🟢',
            c: 4, t: 'dot', fl: 8, school: 'shadow',
            applyDot: { flat: 5, turns: 5, name: 'Порча', id: 'corruption', icon: '🟢', school: 'shadow' },
            d: '5т×5', sid: 172 }),
          A({ id: 'ua', n: 'Нестабильное колдовство', en: 'Unstable Affliction', i: '💜',
            c: 7, cd: 2, t: 'dot', fl: 10, school: 'shadow',
            applyDot: { flat: 6, turns: 5, name: 'Нестабильное колдовство', id: 'ua', icon: '💜', school: 'shadow' },
            d: '6т×5 · КД 2', sid: 30108 }),
          A({ id: 'malefic', n: 'Хватка малефиция', en: 'Malefic Grasp', i: '🖐️',
            c: 7, t: 'damage', fl: 20, school: 'shadow',
            d: '20т · +10% за свой дот на цели', sid: 103103 }),
          A({ id: 'haunt', n: 'Блуждающий дух', en: 'Haunt', i: '👻',
            c: 8, cs: 1, cd: 2, t: 'damage', fl: 32, school: 'shadow',
            d: '32т · +15% за свой дот · 1 осколок · КД 2', sid: 48181 }),
          A({ id: 'drain_soul', n: 'Похищение души', en: 'Drain Soul', i: '🌑',
            c: 5, gs: 1, t: 'damage', fl: 16, school: 'shadow',
            d: '16т · +1 осколок души', sid: 1120 }),
          A({ id: 'seed', n: 'Семя порчи', en: 'Seed of Corruption', i: '🌱',
            c: 11, t: 'aoe', fl: 14, school: 'shadow',
            d: '14т AoE', sid: 27243 }),
          A({ id: 'dark_soul', n: 'Тёмная душа: Знание', en: 'Dark Soul: Knowledge', i: '😈',
            cd: 6, t: 'buff', fa: 1, atkMod: 0.25, bt: 3, school: 'none',
            d: '+25% атаки · 3 хода · без хода · КД 6', sid: 113861 }),
          A({ id: 'soulburn', n: 'Сожжение души', en: 'Soulburn', i: '🔥',
            cs: 1, cd: 2, t: 'buff', fa: 1, atkMod: 0.15, bt: 3, school: 'none',
            d: '1 осколок · +15% атаки · 3 хода · без хода', sid: 74434 }),
        ],
      },
      {
        id: 'demonology',
        name: 'Демонология',
        nameEn: 'Demonology',
        role: 'dps',
        icon: '👹',
        stats: { hp: 100, atk: 16, def: 4, speed: 10 },
        resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 10 },
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
          A({ id: 'shadow_bolt', n: 'Стрела Тьмы', en: 'Shadow Bolt', i: '🌑', c: 7, gs: 1, t: 'damage', p: 1.15, school: 'shadow', d: '', sid: 686 }),
          A({ id: 'soul_fire', n: 'Ожог души', en: 'Soul Fire', i: '🔥', c: 7, cs: 1, t: 'damage', p: 1.7, school: 'fire', d: '', sid: 6353 }),
          A({ id: 'corruption', n: 'Порча', en: 'Corruption', i: '🟢', c: 5, t: 'dot', fl: 13, school: 'shadow',
            applyDot: { flat: 5, turns: 5, name: 'Порча', school: 'shadow' }, d: '', sid: 172 }),
          A({ id: 'hand_guldan', n: "Длань Гул'дана", en: "Hand of Gul'dan", i: '✋', c: 0, cs: 2, gs: 0, cd: 3, t: 'aoe', p: 0.95, school: 'shadow', d: '', sid: 105174 }),
          A({ id: 'metamorphosis', n: 'Метаморфоза', en: 'Metamorphosis', i: '👹', c: 0, cs: 0, cd: 5, t: 'buff', fa: 1, atkMod: 0.3, petAtkMod: 0.3, bt: 2, d: '', sid: 103958 }),
          A({ id: 'dark_soul', n: 'Тёмная душа: Знание', en: 'Dark Soul: Knowledge', i: '😈', c: 0, cd: 10, t: 'buff', fa: 1, d: '', sid: 113861 }),
          A({ id: 'felstorm', n: 'Буря Скверны (страж)', en: 'Felstorm', i: '🌪️', cd: 3, t: 'aoe', fl: 30, school: 'shadow', d: '', sid: 89751 }),
          A({ id: 'imp_leader', n: 'Главарь бесов', en: 'Imp Gang Boss', i: '👑', c: 0, cd: 8, t: 'summon', fa: 1, d: '', sid: 90101 }),
],
      },
      {
        // Destruction (testBuild) — embers-as-shards flat kit
        // ST fl: chaos 40 > shadowburn 34 exec > conflag 20 > incinerate 18
        id: 'destruction',
        name: 'Разрушение',
        nameEn: 'Destruction',
        role: 'dps',
        icon: '🔥',
        testBuild: true,
        stats: { hp: 90, atk: 15, def: 2, speed: 11 },
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
          A({ id: 'incinerate', n: 'Испепеление', en: 'Incinerate', i: '🔥',
            c: 6, gs: 1, t: 'damage', fl: 18, school: 'fire',
            d: '18т · +1 осколок (упрощ. угли)', sid: 29722 }),
          A({ id: 'immolate', n: 'Жертвенный огонь', en: 'Immolate', i: '🕯️',
            c: 6, cd: 3, t: 'dot', fl: 10, school: 'fire',
            applyDot: { flat: 10, turns: 4, name: 'Жертвенный огонь', id: 'immolate', icon: '🕯️', school: 'fire' },
            d: '10т × 4 · КД 3', sid: 348 }),
          A({ id: 'chaos_bolt', n: 'Стрела Хаоса', en: 'Chaos Bolt', i: '☄️',
            c: 8, cs: 1, t: 'damage', fl: 40, school: 'fire',
            d: '40т · 1 осколок (фикс. cost, не combo-scale)', sid: 116858 }),
          A({ id: 'conflag', n: 'Поджигание', en: 'Conflagrate', i: '💥',
            c: 5, gs: 1, cd: 2, t: 'damage', fl: 20, school: 'fire',
            d: '20т · +1 осколок · КД 2', sid: 17962 }),
          A({ id: 'shadowburn', n: 'Ожог Тьмы', en: 'Shadowburn', i: '🌑',
            c: 6, cs: 1, cd: 2, t: 'damage', fl: 34, school: 'shadow',
            d: '34т · 1 осколок · ≤35% HP · КД 2', sid: 17877 }),
          A({ id: 'rain_fire', n: 'Огненный ливень', en: 'Rain of Fire', i: '🌧️',
            c: 10, t: 'aoe', fl: 14, school: 'fire',
            d: '14т AoE', sid: 5740 }),
          A({ id: 'havoc', n: 'Хаос', en: 'Havoc', i: '🎯',
            c: 5, cd: 7, t: 'debuff', fa: 1, bt: 3, school: 'none',
            d: 'Метка на 2 целях · 3 хода · 40% урона основной дублируется · без хода · КД 7', sid: 80240 }),
          A({ id: 'dark_soul', n: 'Тёмная душа: Нестабильность', en: 'Dark Soul: Instability', i: '😈',
            cd: 7, t: 'buff', fa: 1, bt: 2, school: 'none',
            d: 'Инфернал область 20т · 2 хода · КД 7 · без хода', sid: 113858 }),
          A({ id: 'ember_tap', n: 'Вытягивание угля', en: 'Ember Tap', i: '🔥',
            cs: 1, cd: 2, t: 'heal', fl: 24, school: 'fire',
            d: '24т хил · 1 осколок · КД 2', sid: 114635 }),
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
    version: '5.4.8-warlock-s25',
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
  function applyWarlockBalance(classes) {
    if (!Array.isArray(classes) || !WARLOCK_CLASS) return false;
    const i = classes.findIndex((c) => c.id === 'warlock');
    const clone = JSON.parse(JSON.stringify(WARLOCK_CLASS));
    if (i >= 0) classes[i] = clone; else classes.push(clone);
    return true;
  }
  WARLOCK_BALANCE.apply = applyWarlockBalance;
  global.CLASS_BALANCE_PACKS = global.CLASS_BALANCE_PACKS || [];
  global.CLASS_BALANCE_PACKS.push({ id: 'warlock', apply: applyWarlockBalance });

})(typeof window !== 'undefined' ? window : globalThis);
