// export for merge
// Warrior (Arms / Fury / Protection) — turn-based balance
// Merge: replace warrior.specs in wow-mop-data.js (resource class-level не трогать)
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
    // Расширения механики (движок index.html)
    if (o.flat != null) ab.flat = o.flat;                 // урон в «т» (× STAT_SCALE)
    if (o.freeAction) ab.freeAction = true;               // не тратит ход
    if (o.hits != null) ab.hits = o.hits;                 // число ударов
    if (o.cleaveFlat != null) ab.cleaveFlat = o.cleaveFlat; // боковой урон в «т»
    if (o.vuln) ab.vuln = o.vuln;                         // { amount, turns } +% входящего
    if (o.applyDot) ab.applyDot = o.applyDot;             // { flat, turns, name, icon }
    if (o.abilityCharges != null) ab.abilityCharges = o.abilityCharges; // бафф на N способностей
    if (o.lifesteal != null) ab.lifesteal = o.lifesteal;
    // Явная школа урона (physical/fire/…); иначе движок проставит по эвристике
    if (o.school) ab.school = o.school;
    return ab;
  }

  /** @type {Array<{id:string,name:string,nameEn:string,role:string,icon:string,stats:object,abilities:object[]}>} */
  const WARRIOR_SPECS = [
    // ─── Arms ───────────────────────────────────────────────
    {
      id: 'arms', name: 'Оружие', nameEn: 'Arms', role: 'dps', icon: '🗡️',
      stats: { hp: 110, atk: 17, def: 5, speed: 10 },
      // d: '' — без текстового описания; UI сам пишет урон (a-cost) и метки (a-meta)
      abilities: [
        A({ id: 'ms', n: 'Смертельный удар', en: 'Mortal Strike', i: '⚔️',
          g: 20, cd: 2, t: 'damage', p: 1, flat: 15, school: 'physical', d: '', sid: 12294 }),
        A({ id: 'overpower', n: 'Превосходство', en: 'Overpower', i: '💥',
          g: 15, t: 'damage', p: 1, flat: 12, cleaveFlat: 4, school: 'physical', d: '', sid: 7384 }),
        A({ id: 'colossus', n: 'Удар колосса', en: 'Colossus Smash', i: '🔨',
          cd: 3, t: 'damage', p: 1, flat: 21, school: 'physical',
          vuln: { amount: 0.2, turns: 3, physical: true }, d: '', sid: 86346 }),
        A({ id: 'slam', n: 'Мощный удар', en: 'Slam', i: '👊',
          c: 20, t: 'damage', p: 1, flat: 30, school: 'physical', d: '', sid: 1464 }),
        A({ id: 'whirlwind', n: 'Вихрь', en: 'Whirlwind', i: '🌪️',
          c: 20, cd: 1, t: 'aoe', p: 1, flat: 9, hits: 2, school: 'physical', d: '', sid: 1680 }),
        A({ id: 'execute', n: 'Казнь', en: 'Execute', i: '☠️',
          c: 40, t: 'damage', p: 1, flat: 40, school: 'physical', d: '', sid: 5308 }),
        A({ id: 'heroic', n: 'Героический удар', en: 'Heroic Strike', i: '🗡️',
          c: 35, t: 'damage', p: 1, flat: 20, school: 'physical',
          applyDot: { flat: 5, turns: 4, name: 'Кровопускание', icon: '🩸', id: 'rend', school: 'physical' },
          d: '', sid: 78 }),
        A({ id: 'charge', n: 'Рывок', en: 'Charge', i: '🏃',
          g: 10, cd: 4, t: 'damage', p: 1, flat: 3, freeAction: true, school: 'physical', d: '', sid: 100 }),
        A({ id: 'reck', n: 'Безрассудство', en: 'Recklessness', i: '🔥',
          cd: 7, t: 'buff', p: 0.35, abilityCharges: 2, school: 'none', d: '', sid: 1719 }),
      ],
    },

    // ─── Fury ───────────────────────────────────────────────
    {
      id: 'fury', name: 'Неистовство', nameEn: 'Fury', role: 'dps', icon: '😤',
      stats: { hp: 115, atk: 16, def: 4, speed: 12 },
      abilities: [
        A({ id: 'bt', n: 'Кровавая жажда', en: 'Bloodthirst', i: '🩸',
          g: 10, cd: 1, t: 'damage', p: 1.05, lifesteal: 0.15, school: 'physical', d: '', sid: 23881 }),
        A({ id: 'rb', n: 'Яростный выпад', en: 'Raging Blow', i: '💢',
          g: 5, t: 'damage', p: 1, flat: 14, school: 'physical', d: '', sid: 85288 }),
        A({ id: 'wild_strike', n: 'Буйный удар', en: 'Wild Strike', i: '⚡',
          c: 35, t: 'damage', p: 1, flat: 30, school: 'physical', d: '', sid: 100130 }),
        A({ id: 'colossus', n: 'Удар колосса', en: 'Colossus Smash', i: '🔨',
          cd: 3, t: 'damage', p: 1, flat: 21, school: 'physical',
          vuln: { amount: 0.2, turns: 3, physical: true }, d: '', sid: 86346 }),
        A({ id: 'ww', n: 'Вихрь', en: 'Whirlwind', i: '🌪️',
          c: 20, t: 'aoe', p: 1, flat: 9, hits: 2, school: 'physical', d: '', sid: 1680 }),
        A({ id: 'execute', n: 'Казнь', en: 'Execute', i: '☠️',
          c: 40, t: 'damage', p: 1, flat: 40, school: 'physical', d: '', sid: 5308 }),
        A({ id: 'dragon_roar', n: 'Рёв дракона', en: 'Dragon Roar', i: '🐉',
          cd: 3, t: 'aoe', p: 1, flat: 10, freeAction: true, school: 'physical', d: '', sid: 118000 }),
        A({ id: 'berserker', n: 'Ярость берсерка', en: 'Berserker Rage', i: '😡',
          g: 15, cd: 5, t: 'buff', p: 0.2, freeAction: true, school: 'none', d: '', sid: 18499 }),
        A({ id: 'charge', n: 'Рывок', en: 'Charge', i: '🏃',
          g: 10, cd: 4, t: 'damage', p: 1, flat: 3, freeAction: true, school: 'physical', d: '', sid: 100 }),
        A({ id: 'reck', n: 'Безрассудство', en: 'Recklessness', i: '🔥',
          cd: 7, t: 'buff', p: 0.35, abilityCharges: 2, school: 'none', d: '', sid: 1719 }),
      ],
    },

    // ─── Protection (без правок) ────────────────────────────
    {
      id: 'protection', name: 'Защита', nameEn: 'Protection', role: 'tank', icon: '🛡️',
      stats: { hp: 170, atk: 12, def: 12, speed: 8 },
      abilities: [
        A({ id: 'shield_slam', n: 'Удар щитом', en: 'Shield Slam', i: '🛡️', g: 15, cd: 1, t: 'damage', p: 1.1,
          d: 'Главный генератор: +15 ярости. Базовый ST-урон.', sid: 23922 }),
        A({ id: 'revenge', n: 'Реванш', en: 'Revenge', i: '↩️', g: 10, cd: 1, t: 'damage', p: 1.0,
          d: 'Генератор: +10 ярости (в MoP — после блока/парирования; здесь всегда).', sid: 6572 }),
        A({ id: 'devastate', n: 'Разрушение', en: 'Devastate', i: '💥', g: 5, t: 'damage', p: 0.85,
          d: 'Заполнитель: +5 ярости, слабый ST-урон.', sid: 20243 }),
        A({ id: 'thunder', n: 'Удар грома', en: 'Thunder Clap', i: '⛈️', c: 15, cd: 1, t: 'aoe', p: 0.95,
          d: 'Расход 15 ярости — урон по всем врагам.', sid: 6343 }),
        A({ id: 'shield_block', n: 'Блок щитом', en: 'Shield Block', i: '🧱', c: 40, cd: 2, t: 'shield', p: 0.5,
          d: 'Расход 40 ярости — щит (~50% max HP). Частая защита.', sid: 2565 }),
        A({ id: 'shield_wall', n: 'Глухая оборона', en: 'Shield Wall', i: '🏰', cd: 5, t: 'shield', p: 0.6,
          d: 'Большой щит (~60% max HP). Без ярости, CD 5.', sid: 871 }),
        A({ id: 'last_stand', n: 'Ни шагу назад', en: 'Last Stand', i: '❤️', cd: 5, t: 'buff', p: 0.3,
          d: '+макс. здоровье на 3 хода (особый кейс движка).', sid: 12975 }),
        A({ id: 'taunt', n: 'Провокация', en: 'Taunt', i: '📢', cd: 2, t: 'taunt', p: 0,
          d: 'Перетягивает агро на себя.', sid: 355 }),
        A({ id: 'heroic_leap', n: 'Героический прыжок', en: 'Heroic Leap', i: '🦘', c: 15, cd: 3, t: 'aoe', p: 0.7,
          d: 'Расход 15 ярости — AoE-удар (CD 3).', sid: 6544 }),
        A({ id: 'demo_shout', n: 'Деморализующий крик', en: 'Demoralizing Shout', i: '😨', cd: 3, t: 'debuff', p: 0.2,
          d: '−атака одной цели (type debuff). CD 3.', sid: 1160 }),
      ],
    },
  ];

  if (typeof global !== 'undefined') {
    global.WARRIOR_SPECS = WARRIOR_SPECS;
    global.WOW_WARRIOR_BALANCE = { specs: WARRIOR_SPECS, A };
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WARRIOR_SPECS, A };
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
