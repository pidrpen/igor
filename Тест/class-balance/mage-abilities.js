/**
 * Mythic Key — Mage (Arcane / Fire / Frost) — full rebalance TEST
 * class-balance/mage-abilities.js
 *
 * Design (MoP 5.4.8 lite):
 *  - primary: mana (max 100, start 100, regen 5)
 *  - secondary: null (no arcane charges / FoF / Hot Streak modeled)
 *  - flat «т» damage (atk 15 ≈ FLAT_REF) + school arcane/fire/frost
 *  - high-power damage is ALWAYS paid mana (AM / Barrage / Pyro / Combustion etc.)
 *  - free cost only for long-CD buffs / pets / Evocation
 *
 * Spec identities:
 *  Arcane → Blast / Missiles / Barrage
 *  Fire   → Fireball / Pyroblast / Combustion
 *  Frost  → Frostbolt / Ice Lance / Frozen Orb / Ice Nova
 *
 * apply-all: global.MAGE_BALANCE + CLASS_BALANCE_PACKS (apply)
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
    if (o.atkMod != null) ab.atkMod = o.atkMod;
    if (o.critMod != null) ab.critMod = o.critMod;
    if (o.cm != null) ab.critMod = o.cm;
    if (o.buffTurns != null) ab.buffTurns = o.buffTurns;
    if (o.bt != null) ab.buffTurns = o.bt;
    if (o.dmgReduce != null) ab.dmgReduce = o.dmgReduce;
    if (o.dr != null) ab.dmgReduce = o.dr;
    if (o.maxHpPct != null) ab.maxHpPct = o.maxHpPct;
    if (o.hpPct != null) ab.maxHpPct = o.hpPct;
    if (o.cleaveFlat != null) ab.cleaveFlat = o.cleaveFlat;
    if (o.splashFlat != null) ab.splashFlat = o.splashFlat;
    return ab;
  }

  const ENGINE_NEEDS = {
    arcane_charges: 'optional', // 0–4 stacks; gen on Blast, dump Barrage/AM — NOT required
    hot_streak: 'optional',     // free instant Pyro — NOT required (Pyro is paid hard-nuke)
    fingers_of_frost: 'optional', // free/strong IL — NOT required (IL is paid instant)
    brain_freeze: 'optional',
    note: 'Package works on pure mana without mythic-key.html changes.',
  };

  const MAGE_CLASS = {
    id: 'mage',
    name: 'Маг',
    nameEn: 'Mage',
    icon: '🔮',
    color: '#69CCF0',
    resource: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 5 },
    secondary: null,
    engineNeeds: ENGINE_NEEDS,
    version: '-test',
    notes: [
      'Full MoP kits with flat «т» + school; paid high-power only.',
      'secondary stays null — charges/procs are flavor / future engine work.',
      'Free cost: long-CD buffs (AP / IV / PoM / Alter Time), pets (Mirror / Water), Evocation.',
      'testBuild:true on all specs · version -test',
    ],
    specs: [
      // ═══════════════════════════════════════
      // ARCANE — Blast / Missiles / Barrage
      // ═══════════════════════════════════════
      {
        id: 'arcane',
        name: 'Тайная магия',
        nameEn: 'Arcane',
        role: 'dps',
        icon: '💜',
        testBuild: true,
        // atk 15 → вес Nт ≈ Nт на flat
        stats: { hp: 90, atk: 15, def: 2, speed: 11 },
        abilities: [
          A({ id: 'ab', n: 'Чародейская вспышка', en: 'Arcane Blast', i: '💜',
            c: 8, t: 'damage', fl: 24, school: 'arcane',
            d: '24т · 8 маны · основной удар', sid: 30451 }),
          A({ id: 'am', n: 'Чародейские стрелы', en: 'Arcane Missiles', i: '✨',
            c: 7, t: 'damage', fl: 22, school: 'arcane',
            d: '22т · 7 маны · платный сброс (без зарядов)', sid: 5143 }),
          A({ id: 'abarr', n: 'Чародейский обстрел', en: 'Arcane Barrage', i: '💠',
            c: 6, cd: 1, t: 'damage', fl: 20, school: 'arcane',
            d: '20т · 6 маны · КД 1 · платный сброс', sid: 44425 }),
          A({ id: 'ae', n: 'Чародейский взрыв', en: 'Arcane Explosion', i: '💥',
            c: 10, t: 'aoe', fl: 14, school: 'arcane',
            d: '14т AoE · 10 маны', sid: 1449 }),
          A({ id: 'nether_tempest', n: 'Буря Пустоты', en: 'Nether Tempest', i: '🌌',
            c: 6, cd: 1, t: 'dot', fl: 8, school: 'arcane',
            applyDot: { flat: 5, turns: 4, name: 'Буря Пустоты', icon: '🌌', id: 'nether_tempest', school: 'arcane' },
            d: '8т + DoT 5т×4 · 6 маны · КД 1', sid: 114923 }),
          A({ id: 'arcane_power', n: 'Мощь тайной магии', en: 'Arcane Power', i: '🔋',
            cd: 5, t: 'buff', fa: 1, atkMod: 0.3, bt: 3, school: 'none',
            d: '+30% атаки · 3 хода · КД 5 · без хода', sid: 12042 }),
          A({ id: 'presence', n: 'Присутствие разума', en: 'Presence of Mind', i: '🧠',
            cd: 4, t: 'buff', fa: 1, atkMod: 0.15, bt: 2, school: 'none',
            d: '+15% атаки · 2 хода · КД 4 · без хода', sid: 12043 }),
          A({ id: 'mirror', n: 'Зеркальное изображение', en: 'Mirror Image', i: '🪞',
            cd: 5, t: 'damage', fl: 16, school: 'arcane',
            d: '16т + 2 копии · КД 5', sid: 55342 }),
          A({ id: 'evocation', n: 'Прилив сил', en: 'Evocation', i: '🔄',
            cd: 4, t: 'buff', p: 0, g: 35, school: 'none',
            d: '+35 маны · КД 4', sid: 12051 }),
        ],
      },

      // ═══════════════════════════════════════
      // FIRE — Fireball / Pyroblast / Combustion
      // ═══════════════════════════════════════
      {
        id: 'fire',
        name: 'Огонь',
        nameEn: 'Fire',
        role: 'dps',
        icon: '🔥',
        testBuild: true,
        stats: { hp: 90, atk: 15, def: 2, speed: 11 },
        abilities: [
          A({ id: 'fireball', n: 'Огненный шар', en: 'Fireball', i: '🔥',
            c: 7, t: 'damage', fl: 22, school: 'fire',
            d: '22т · 7 маны · заполнитель', sid: 133 }),
          A({ id: 'pyroblast', n: 'Огненная глыба', en: 'Pyroblast', i: '☄️',
            c: 12, t: 'damage', fl: 36, school: 'fire',
            d: '36т · 12 маны · дорогой hard-nuke (без free Hot Streak)', sid: 11366 }),
          A({ id: 'inferno_blast', n: 'Инфернальный взрыв', en: 'Inferno Blast', i: '💥',
            c: 6, cd: 1, t: 'damage', fl: 18, school: 'fire',
            d: '18т · 6 маны · КД 1 · мгновенный', sid: 108853 }),
          A({ id: 'combustion', n: 'Возгорание', en: 'Combustion', i: '🔥',
            c: 10, cd: 4, t: 'damage', fl: 34, school: 'fire',
            d: '34т · 10 маны · КД 4 · сигнатурный всплеск', sid: 11129 }),
          A({ id: 'living_bomb', n: 'Живая бомба', en: 'Living Bomb', i: '💣',
            c: 6, cd: 2, t: 'dot', fl: 10, school: 'fire',
            applyDot: { flat: 6, turns: 3, name: 'Живая бомба', icon: '💣', id: 'living_bomb', school: 'fire' },
            d: '10т + DoT 6т×3 · 6 маны · КД 2', sid: 44457 }),
          A({ id: 'flamestrike', n: 'Огненный столб', en: 'Flamestrike', i: '🌋',
            c: 11, t: 'aoe', fl: 14, school: 'fire',
            d: '14т AoE · 11 маны', sid: 2120 }),
          A({ id: 'scorch', n: 'Ожог', en: 'Scorch', i: '🌡️',
            c: 5, t: 'damage', fl: 16, school: 'fire',
            d: '16т · 5 маны · дешёвый удар', sid: 2948 }),
          A({ id: 'mirror', n: 'Зеркальное изображение', en: 'Mirror Image', i: '🪞',
            cd: 5, t: 'damage', fl: 16, school: 'fire',
            d: '16т + 2 копии · КД 5', sid: 55342 }),
          A({ id: 'alter_time', n: 'Манипуляции со временем', en: 'Alter Time', i: '⏳',
            cd: 5, t: 'buff', fa: 1, atkMod: 0.18, bt: 2, school: 'none',
            d: '+18% атаки · 2 хода · КД 5 · без хода', sid: 108978 }),
        ],
      },

      // ═══════════════════════════════════════
      // FROST — Frostbolt / Lance / Orb / Nova
      // ═══════════════════════════════════════
      {
        id: 'frost',
        name: 'Лёд',
        nameEn: 'Frost',
        role: 'dps',
        icon: '❄️',
        testBuild: true,
        stats: { hp: 92, atk: 15, def: 3, speed: 11 },
        abilities: [
          A({ id: 'frostbolt', n: 'Ледяная стрела', en: 'Frostbolt', i: '🧊',
            c: 6, t: 'damage', fl: 22, school: 'frost',
            d: '22т · 6 маны · основной заполнитель', sid: 116 }),
          A({ id: 'ice_lance', n: 'Ледяное копьё', en: 'Ice Lance', i: '🗡️',
            c: 5, t: 'damage', fl: 18, school: 'frost',
            d: '18т · 5 маны · мгновенный dump (без FoF)', sid: 30455 }),
          A({ id: 'frozen_orb', n: 'Ледяной шар', en: 'Frozen Orb', i: '🔮',
            c: 10, cd: 3, t: 'aoe', fl: 16, school: 'frost',
            d: '16т AoE · 10 маны · КД 3 · сигнатура', sid: 84714 }),
          A({ id: 'ice_nova', n: 'Кольцо льда', en: 'Ice Nova', i: '💠',
            c: 8, cd: 2, t: 'aoe', fl: 20, school: 'frost',
            d: '20т AoE · 8 маны · КД 2', sid: 157997 }),
          A({ id: 'deep_freeze', n: 'Глубокая заморозка', en: 'Deep Freeze', i: '🥶',
            c: 8, cd: 3, t: 'damage', fl: 30, school: 'frost',
            d: '30т · 8 маны · КД 3 · сильный КД-удар', sid: 44572 }),
          A({ id: 'blizzard', n: 'Снежная буря', en: 'Blizzard', i: '🌨️',
            c: 12, t: 'aoe', fl: 12, school: 'frost',
            d: '12т AoE · 12 маны', sid: 10 }),
          A({ id: 'frostfire', n: 'Стрела ледяного огня', en: 'Frostfire Bolt', i: '🔵',
            c: 7, t: 'damage', fl: 24, school: 'frost',
            d: '24т · 7 маны · альтернативный заполнитель', sid: 44614 }),
          A({ id: 'icy_veins', n: 'Стылая кровь', en: 'Icy Veins', i: '💉',
            cd: 5, t: 'buff', fa: 1, atkMod: 0.3, bt: 3, school: 'none',
            d: '+30% атаки · 3 хода · КД 5 · без хода', sid: 12472 }),
          A({ id: 'summon_water', n: 'Элементаль воды', en: 'Summon Water Elemental', i: '💧',
            cd: 4, t: 'damage', fl: 14, school: 'frost',
            d: '14т · КД 4 · питомец (упрощ.)', sid: 31687 }),
        ],
      },
    ],
  };

  function applyMageBalance(classes) {
    if (!Array.isArray(classes) || !MAGE_CLASS) return false;
    const i = classes.findIndex((c) => c.id === 'mage');
    const clone = JSON.parse(JSON.stringify(MAGE_CLASS));
    if (i >= 0) classes[i] = clone;
    else classes.push(clone);
    return true;
  }

  /** Specs map (legacy apply-all path: pack.specs object) */
  const specsMap = {
    arcane: MAGE_CLASS.specs[0],
    fire: MAGE_CLASS.specs[1],
    frost: MAGE_CLASS.specs[2],
  };

  const MAGE_BALANCE = {
    version: '-test',
    id: 'mage',
    name: MAGE_CLASS.name,
    nameEn: MAGE_CLASS.nameEn,
    icon: MAGE_CLASS.icon,
    color: MAGE_CLASS.color,
    resource: MAGE_CLASS.resource,
    secondary: MAGE_CLASS.secondary,
    engineNeeds: ENGINE_NEEDS,
    class: MAGE_CLASS,
    classId: 'mage',
    specs: specsMap,
    specsArr: MAGE_CLASS.specs,
    notes: MAGE_CLASS.notes,
    A,
    apply: applyMageBalance,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MAGE_BALANCE;
  }
  global.MAGE_BALANCE = MAGE_BALANCE;
  global.MAGE_CLASS = MAGE_CLASS;
  global.CLASS_BALANCE_PACKS = global.CLASS_BALANCE_PACKS || [];
  global.CLASS_BALANCE_PACKS.push({ id: 'mage', apply: applyMageBalance });

})(typeof window !== 'undefined' ? window : globalThis);
