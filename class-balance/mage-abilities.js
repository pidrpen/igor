/**
 * Mythic Key — MoP 5.4.8 lite
 * Class balance package: MAGE (arcane / fire / frost)
 *
 * Design:
 *  - primary: mana (max 100, start 100, regen 5)
 *  - secondary: null (no arcane charges / FoF / Hot Streak in data)
 *  - NO free high-power damage (Arcane Missiles / Barrage are paid)
 *  - Arcane charges: optional engine feature (see engineNeeds) — not required
 *  - Fire identity: Pyroblast hard-nuke + Combustion CD burst
 *  - Frost identity: Frozen Orb signature + Ice Lance instant dump
 *
 * Drop-in: copy `specs[*].abilities` (and resource if needed) into wow-mop-data.js
 * class block `id: 'mage'`. Do NOT require mythic-key.html changes.
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

  const MAGE_BALANCE = {
    id: 'mage',
    name: 'Маг',
    nameEn: 'Mage',
    icon: '🔮',
    color: '#69CCF0',
    resource: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 5 },
    secondary: null,
    /**
     * engineNeeds — what the combat engine would need for full MoP flavor.
     * All listed as optional: package works on pure mana without code changes.
     */
    engineNeeds: {
      arcane_charges: 'optional', // 0–4 stacks; gen on Blast, dump Barrage/AM — NOT required
      hot_streak: 'optional',     // free instant Pyro — NOT required (Pyro is paid hard-nuke)
      fingers_of_frost: 'optional', // free/strong IL — NOT required (IL is paid instant)
      brain_freeze: 'optional',
      // Frozen Orb is an ability id, not a resource stack
    },
    notes: [
      'No free high-power AM/Barrage (critical fix vs free p1.2+ spam).',
      'secondary stays null — charges/procs are flavor or future engine work.',
      'Free cost only for long CD buffs/pets (AP, IV, Mirror, Water Elemental).',
      'Target filler p/c ≈ 0.17–0.21 at regen 5; CD/nukes trade efficiency for raw power.',
    ],
    specs: {
      arcane: {
        id: 'arcane',
        name: 'Тайная магия',
        nameEn: 'Arcane',
        role: 'dps',
        icon: '💜',
        stats: { hp: 85, atk: 18, def: 2, speed: 11 },
        abilities: [
          // Main paid cast — backbone of rotation
          A({ id: 'ab', n: 'Чародейская вспышка', en: 'Arcane Blast', i: '💜', c: 8, t: 'damage', p: 1.4,
            d: 'Основной платный удар.', sid: 30451 }),
          // Paid dump (was free high-power — fixed)
          A({ id: 'am', n: 'Чародейские стрелы', en: 'Arcane Missiles', i: '✨', c: 7, t: 'damage', p: 1.35,
            d: 'Платный сброс (упрощ. без зарядов).', sid: 5143 }),
          // Paid dump on CD
          A({ id: 'abarr', n: 'Чародейский обстрел', en: 'Arcane Barrage', i: '💠', c: 6, cd: 1, t: 'damage', p: 1.25,
            d: 'Платный сброс (КД).', sid: 44425 }),
          A({ id: 'ae', n: 'Чародейский взрыв', en: 'Arcane Explosion', i: '💥', c: 10, t: 'aoe', p: 0.9,
            d: 'По области.', sid: 1449 }),
          A({ id: 'arcane_power', n: 'Мощь тайной магии', en: 'Arcane Power', i: '🔋', cd: 5, t: 'buff', p: 0.3,
            d: '+атака.', sid: 12042 }),
          A({ id: 'presence', n: 'Присутствие разума', en: 'Presence of Mind', i: '🧠', cd: 4, t: 'buff', p: 0.15,
            d: '+атака (талант).', sid: 12043 }),
          A({ id: 'mirror', n: 'Зеркальное изображение', en: 'Mirror Image', i: '🪞', cd: 5, t: 'damage', p: 1.1,
            d: 'Урон + 2 копии.', sid: 55342 }),
          A({ id: 'evocation', n: 'Прилив сил', en: 'Evocation', i: '🔄', cd: 4, t: 'buff', p: 0, g: 35,
            d: '+35 маны.', sid: 12051 }),
          A({ id: 'nether_tempest', n: 'Буря Пустоты', en: 'Nether Tempest', i: '🌌', c: 6, cd: 1, t: 'dot', p: 0.65,
            d: 'DoT (талант).', sid: 114923 }),
        ],
      },
      fire: {
        id: 'fire',
        name: 'Огонь',
        nameEn: 'Fire',
        role: 'dps',
        icon: '🔥',
        stats: { hp: 85, atk: 18, def: 2, speed: 11 },
        abilities: [
          // Main filler
          A({ id: 'fireball', n: 'Огненный шар', en: 'Fireball', i: '🔥', c: 7, t: 'damage', p: 1.3,
            d: 'Основной заполнитель.', sid: 133 }),
          // Hard-nuke identity (paid; Hot Streak free-proc not modeled)
          A({ id: 'pyroblast', n: 'Огненная глыба', en: 'Pyroblast', i: '☄️', c: 12, t: 'damage', p: 1.8,
            d: 'Дорогой сильный удар.', sid: 11366 }),
          // Instant tool — efficiency near filler, not free spam king
          A({ id: 'inferno_blast', n: 'Инфернальный взрыв', en: 'Inferno Blast', i: '💥', c: 6, cd: 1, t: 'damage', p: 1.15,
            d: 'Мгновенный урон (КД).', sid: 108853 }),
          // Signature CD burst
          A({ id: 'combustion', n: 'Возгорание', en: 'Combustion', i: '🔥', c: 10, cd: 4, t: 'damage', p: 1.7,
            d: 'Всплеск (КД).', sid: 11129 }),
          A({ id: 'living_bomb', n: 'Живая бомба', en: 'Living Bomb', i: '💣', c: 6, cd: 2, t: 'dot', p: 0.7,
            d: 'DoT (талант).', sid: 44457 }),
          A({ id: 'flamestrike', n: 'Огненный столб', en: 'Flamestrike', i: '🌋', c: 11, t: 'aoe', p: 0.9,
            d: 'По области.', sid: 2120 }),
          // Cheap filler — p/c ≈ fireball, lower raw
          A({ id: 'scorch', n: 'Ожог', en: 'Scorch', i: '🌡️', c: 5, t: 'damage', p: 0.95,
            d: 'Дешёвый удар.', sid: 2948 }),
          A({ id: 'mirror', n: 'Зеркальное изображение', en: 'Mirror Image', i: '🪞', cd: 5, t: 'damage', p: 1.1,
            d: 'Урон + 2 копии.', sid: 55342 }),
          A({ id: 'alter_time', n: 'Манипуляции со временем', en: 'Alter Time', i: '⏳', cd: 5, t: 'buff', p: 0.18,
            d: '+атака (упрощ.).', sid: 108978 }),
        ],
      },
      frost: {
        id: 'frost',
        name: 'Лёд',
        nameEn: 'Frost',
        role: 'dps',
        icon: '❄️',
        stats: { hp: 88, atk: 17, def: 3, speed: 11 },
        abilities: [
          // Main filler — preferred ST efficiency among regular casts
          A({ id: 'frostbolt', n: 'Ледяная стрела', en: 'Frostbolt', i: '🧊', c: 6, t: 'damage', p: 1.3,
            d: 'Основной заполнитель.', sid: 116 }),
          // Instant dump (FoF not modeled) — paid, slightly lower raw than bolt
          A({ id: 'ice_lance', n: 'Ледяное копьё', en: 'Ice Lance', i: '🗡️', c: 5, t: 'damage', p: 1.15,
            d: 'Мгновенный удар.', sid: 30455 }),
          // Signature ability (spell, not resource-orb)
          A({ id: 'frozen_orb', n: 'Ледяной шар', en: 'Frozen Orb', i: '🔮', c: 10, cd: 3, t: 'aoe', p: 1.05,
            d: 'AoE шар (сигнатурный КД).', sid: 84714 }),
          A({ id: 'deep_freeze', n: 'Глубокая заморозка', en: 'Deep Freeze', i: '🥶', c: 8, cd: 3, t: 'damage', p: 1.55,
            d: 'Сильный КД-удар.', sid: 44572 }),
          A({ id: 'cone', n: 'Конус холода', en: 'Cone of Cold', i: '❄️', c: 9, cd: 2, t: 'aoe', p: 0.85,
            d: 'Конус.', sid: 120 }),
          A({ id: 'blizzard', n: 'Снежная буря', en: 'Blizzard', i: '🌨️', c: 12, t: 'aoe', p: 0.85,
            d: 'Зональный урон.', sid: 10 }),
          A({ id: 'icy_veins', n: 'Стылая кровь', en: 'Icy Veins', i: '💉', cd: 5, t: 'buff', p: 0.3,
            d: '+атака.', sid: 12472 }),
          A({ id: 'summon_water', n: 'Элементаль воды', en: 'Summon Water Elemental', i: '💧', cd: 4, t: 'damage', p: 1.05,
            d: 'Питомец.', sid: 31687 }),
          A({ id: 'frostfire', n: 'Стрела ледяного огня', en: 'Frostfire Bolt', i: '🔵', c: 7, t: 'damage', p: 1.35,
            d: 'Альтернативный заполнитель.', sid: 44614 }),
        ],
      },
    },
  };

  // Compact A()-source rows for paste into wow-mop-data.js (shorthand form)
  MAGE_BALANCE.pasteRows = {
    arcane: [
      "A({ id: 'ab', n: 'Чародейская вспышка', en: 'Arcane Blast', i: '💜', c: 8, t: 'damage', p: 1.4, d: 'Основной платный удар.', sid: 30451 })",
      "A({ id: 'am', n: 'Чародейские стрелы', en: 'Arcane Missiles', i: '✨', c: 7, t: 'damage', p: 1.35, d: 'Платный сброс (упрощ. без зарядов).', sid: 5143 })",
      "A({ id: 'abarr', n: 'Чародейский обстрел', en: 'Arcane Barrage', i: '💠', c: 6, cd: 1, t: 'damage', p: 1.25, d: 'Платный сброс (КД).', sid: 44425 })",
      "A({ id: 'ae', n: 'Чародейский взрыв', en: 'Arcane Explosion', i: '💥', c: 10, t: 'aoe', p: 0.9, d: 'По области.', sid: 1449 })",
      "A({ id: 'arcane_power', n: 'Мощь тайной магии', en: 'Arcane Power', i: '🔋', cd: 5, t: 'buff', p: 0.3, d: '+атака.', sid: 12042 })",
      "A({ id: 'presence', n: 'Присутствие разума', en: 'Presence of Mind', i: '🧠', cd: 4, t: 'buff', p: 0.15, d: '+атака (талант).', sid: 12043 })",
      "A({ id: 'mirror', n: 'Зеркальное изображение', en: 'Mirror Image', i: '🪞', cd: 5, t: 'damage', p: 1.1, d: 'Урон + 2 копии.', sid: 55342 })",
      "A({ id: 'evocation', n: 'Прилив сил', en: 'Evocation', i: '🔄', cd: 4, t: 'buff', p: 0, g: 35, d: '+35 маны.', sid: 12051 })",
      "A({ id: 'nether_tempest', n: 'Буря Пустоты', en: 'Nether Tempest', i: '🌌', c: 6, cd: 1, t: 'dot', p: 0.65, d: 'DoT (талант).', sid: 114923 })",
    ],
    fire: [
      "A({ id: 'fireball', n: 'Огненный шар', en: 'Fireball', i: '🔥', c: 7, t: 'damage', p: 1.3, d: 'Основной заполнитель.', sid: 133 })",
      "A({ id: 'pyroblast', n: 'Огненная глыба', en: 'Pyroblast', i: '☄️', c: 12, t: 'damage', p: 1.8, d: 'Дорогой сильный удар.', sid: 11366 })",
      "A({ id: 'inferno_blast', n: 'Инфернальный взрыв', en: 'Inferno Blast', i: '💥', c: 6, cd: 1, t: 'damage', p: 1.15, d: 'Мгновенный урон (КД).', sid: 108853 })",
      "A({ id: 'combustion', n: 'Возгорание', en: 'Combustion', i: '🔥', c: 10, cd: 4, t: 'damage', p: 1.7, d: 'Всплеск (КД).', sid: 11129 })",
      "A({ id: 'living_bomb', n: 'Живая бомба', en: 'Living Bomb', i: '💣', c: 6, cd: 2, t: 'dot', p: 0.7, d: 'DoT (талант).', sid: 44457 })",
      "A({ id: 'flamestrike', n: 'Огненный столб', en: 'Flamestrike', i: '🌋', c: 11, t: 'aoe', p: 0.9, d: 'По области.', sid: 2120 })",
      "A({ id: 'scorch', n: 'Ожог', en: 'Scorch', i: '🌡️', c: 5, t: 'damage', p: 0.95, d: 'Дешёвый удар.', sid: 2948 })",
      "A({ id: 'mirror', n: 'Зеркальное изображение', en: 'Mirror Image', i: '🪞', cd: 5, t: 'damage', p: 1.1, d: 'Урон + 2 копии.', sid: 55342 })",
      "A({ id: 'alter_time', n: 'Манипуляции со временем', en: 'Alter Time', i: '⏳', cd: 5, t: 'buff', p: 0.18, d: '+атака (упрощ.).', sid: 108978 })",
    ],
    frost: [
      "A({ id: 'frostbolt', n: 'Ледяная стрела', en: 'Frostbolt', i: '🧊', c: 6, t: 'damage', p: 1.3, d: 'Основной заполнитель.', sid: 116 })",
      "A({ id: 'ice_lance', n: 'Ледяное копьё', en: 'Ice Lance', i: '🗡️', c: 5, t: 'damage', p: 1.15, d: 'Мгновенный удар.', sid: 30455 })",
      "A({ id: 'frozen_orb', n: 'Ледяной шар', en: 'Frozen Orb', i: '🔮', c: 10, cd: 3, t: 'aoe', p: 1.05, d: 'AoE шар (сигнатурный КД).', sid: 84714 })",
      "A({ id: 'deep_freeze', n: 'Глубокая заморозка', en: 'Deep Freeze', i: '🥶', c: 8, cd: 3, t: 'damage', p: 1.55, d: 'Сильный КД-удар.', sid: 44572 })",
      "A({ id: 'cone', n: 'Конус холода', en: 'Cone of Cold', i: '❄️', c: 9, cd: 2, t: 'aoe', p: 0.85, d: 'Конус.', sid: 120 })",
      "A({ id: 'blizzard', n: 'Снежная буря', en: 'Blizzard', i: '🌨️', c: 12, t: 'aoe', p: 0.85, d: 'Зональный урон.', sid: 10 })",
      "A({ id: 'icy_veins', n: 'Стылая кровь', en: 'Icy Veins', i: '💉', cd: 5, t: 'buff', p: 0.3, d: '+атака.', sid: 12472 })",
      "A({ id: 'summon_water', n: 'Элементаль воды', en: 'Summon Water Elemental', i: '💧', cd: 4, t: 'damage', p: 1.05, d: 'Питомец.', sid: 31687 })",
      "A({ id: 'frostfire', n: 'Стрела ледяного огня', en: 'Frostfire Bolt', i: '🔵', c: 7, t: 'damage', p: 1.35, d: 'Альтернативный заполнитель.', sid: 44614 })",
    ],
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MAGE_BALANCE;
  }
  global.MAGE_BALANCE = MAGE_BALANCE;
})(typeof window !== 'undefined' ? window : globalThis);
