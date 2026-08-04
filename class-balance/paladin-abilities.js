/**
 * Mythic Key MoP 5.4.8 lite — Paladin (Holy / Protection / Retribution)
 * Ресурсы: mana (primary) + holy_power 0–5 (secondary, gs/cs).
 * Источник: wow-mop-data.js paladin section + баланс lite (gen/spend бьются).
 * Не править mythic-key.html из этого файла — только drop-in данных.
 */
(function (global) {
  'use strict';

  // ── shorthand ability builder (как в wow-mop-data.js) ──
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

  const PALADIN_CLASS = {
    id: 'paladin',
    name: 'Паладин',
    nameEn: 'Paladin',
    icon: '✝️',
    color: '#F58CBA',
    resource: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 6 },
    secondary: { type: 'holy_power', name: 'Энергия Света', icon: '☀️', max: 5, start: 0 },
    specs: [
      // ═══════════════════════════════════════
      // HOLY — healer · 9 скиллов
      // HP: holy_shock + crusader (gs:1) → word_glory / light_dawn (cs:3)
      // ═══════════════════════════════════════
      {
        id: 'holy',
        name: 'Свет',
        nameEn: 'Holy',
        role: 'healer',
        icon: '🌟',
        stats: { hp: 95, atk: 8, def: 5, speed: 10 },
        abilities: [
          A({ id: 'holy_shock', n: 'Шок небес', en: 'Holy Shock', i: '✨', c: 8, gs: 1, cd: 1, t: 'heal', p: 0.4, d: 'Лечение + 1 энергия Света.', sid: 20473 }),
          A({ id: 'word_glory', n: 'Слово славы', en: 'Word of Glory', i: '💫', cs: 3, t: 'heal', p: 0.5, d: 'Расход 3 энергии Света — сильное лечение (0 маны).', sid: 85673 }),
          A({ id: 'holy_light', n: 'Свет небес', en: 'Holy Light', i: '🔆', c: 16, t: 'heal', p: 0.54, d: 'Сильное лечение за ману (без энергии Света).', sid: 635 }),
          A({ id: 'flash', n: 'Вспышка Света', en: 'Flash of Light', i: '⚡', c: 12, t: 'heal', p: 0.44, d: 'Быстрое лечение за ману.', sid: 19750 }),
          A({ id: 'holy_radiance', n: 'Сияние света', en: 'Holy Radiance', i: '🌅', c: 16, cd: 1, t: 'heal_aoe', p: 0.22, d: 'Лечение по области за ману.', sid: 82327 }),
          A({ id: 'light_dawn', n: 'Свет зари', en: 'Light of Dawn', i: '🌄', cs: 3, cd: 2, t: 'heal_aoe', p: 0.32, d: 'Расход 3 энергии Света — хил по области.', sid: 85222 }),
          A({ id: 'crusader', n: 'Удар воина Света', en: 'Crusader Strike', i: '⚔️', c: 5, gs: 1, t: 'damage', p: 0.9, d: '+1 энергия Света (мили-билдер).', sid: 35395 }),
          A({ id: 'divine_prot', n: 'Божественная защита', en: 'Divine Protection', i: '🛡️', cd: 4, t: 'shield', p: 0.3, d: 'Щит (упрощ. снижение урона).', sid: 498 }),
          A({ id: 'avenging', n: 'Гнев карателя', en: 'Avenging Wrath', i: '😇', cd: 5, t: 'buff', p: 0.25, d: '+атака (упрощ. и хилы через ATK).', sid: 31884 }),
        ],
      },

      // ═══════════════════════════════════════
      // PROTECTION — tank · 9 скиллов
      // HP: CS / Judgment / HotR / HoW (gs:1) → SotR (cs:3)
      // ═══════════════════════════════════════
      {
        id: 'protection',
        name: 'Защита',
        nameEn: 'Protection',
        role: 'tank',
        icon: '🛡️',
        stats: { hp: 168, atk: 12, def: 12, speed: 8 },
        abilities: [
          A({ id: 'crusader', n: 'Удар воина Света', en: 'Crusader Strike', i: '⚔️', c: 5, gs: 1, t: 'damage', p: 1.0, d: '+1 энергия Света.', sid: 35395 }),
          A({ id: 'judgment', n: 'Правосудие', en: 'Judgment', i: '⚖️', c: 6, gs: 1, cd: 1, t: 'damage', p: 1.05, d: '+1 энергия Света.', sid: 20271 }),
          A({ id: 'avengers', n: 'Щит мстителя', en: "Avenger's Shield", i: '🛡️', c: 8, cd: 2, t: 'damage', p: 1.2, d: 'Дальний удар щитом (мана, без HP).', sid: 31935 }),
          A({ id: 'hot_r', n: 'Молот праведника', en: 'Hammer of the Righteous', i: '🔨', c: 5, gs: 1, t: 'aoe', p: 0.7, d: 'По области + 1 энергия Света.', sid: 53595 }),
          A({ id: 'sot_r', n: 'Щит праведника', en: 'Shield of the Righteous', i: '🧱', cs: 3, t: 'shield', p: 0.42, d: 'Расход 3 энергии Света — щит.', sid: 53600 }),
          A({ id: 'consecrate', n: 'Освящение', en: 'Consecration', i: '☀️', c: 10, cd: 2, t: 'aoe', p: 0.7, d: 'Зональный урон за ману.', sid: 26573 }),
          A({ id: 'hot_w', n: 'Молот гнева', en: 'Hammer of Wrath', i: '⚡', c: 6, gs: 1, t: 'damage', p: 1.4, d: '+1 энергия Света. Добивание ≤35%.', sid: 24275 }),
          A({ id: 'ardent', n: 'Ревностный защитник', en: 'Ardent Defender', i: '❤️', cd: 5, t: 'shield', p: 0.35, d: 'Сильный щит (упрощ. выживаемость; не +ATK).', sid: 31850 }),
          A({ id: 'taunt', n: 'Длань расплаты', en: 'Hand of Reckoning', i: '📢', cd: 2, t: 'taunt', p: 0, d: 'Провокация.', sid: 62124 }),
        ],
      },

      // ═══════════════════════════════════════
      // RETRIBUTION — dps · 9 скиллов
      // Builders gs:1 · TV/DS cs:3 · без Zealotry (Cata) → Holy Avenger
      // ═══════════════════════════════════════
      {
        id: 'retribution',
        name: 'Воздаяние',
        nameEn: 'Retribution',
        role: 'dps',
        icon: '🔨',
        stats: { hp: 105, atk: 17, def: 5, speed: 11 },
        abilities: [
          A({ id: 'crusader', n: 'Удар воина Света', en: 'Crusader Strike', i: '⚔️', c: 5, gs: 1, t: 'damage', p: 1.1, d: '+1 энергия Света.', sid: 35395 }),
          A({ id: 'judgment', n: 'Правосудие', en: 'Judgment', i: '⚖️', c: 6, gs: 1, cd: 1, t: 'damage', p: 1.1, d: '+1 энергия Света.', sid: 20271 }),
          A({ id: 'exorcism', n: 'Экзорцизм', en: 'Exorcism', i: '👻', c: 8, gs: 1, cd: 1, t: 'damage', p: 1.2, d: 'Дальний урон + 1 энергия Света.', sid: 879 }),
          A({ id: 'templar', n: 'Вердикт храмовника', en: "Templar's Verdict", i: '⚖️', cs: 3, t: 'damage', p: 1.75, d: 'Главный расход 3 энергии Света.', sid: 85256 }),
          A({ id: 'divine_storm', n: 'Божественная буря', en: 'Divine Storm', i: '🌪️', cs: 3, t: 'aoe', p: 1.0, d: 'Расход 3 энергии Света — по области.', sid: 53385 }),
          A({ id: 'hot_w', n: 'Молот гнева', en: 'Hammer of Wrath', i: '⚡', c: 6, gs: 1, t: 'damage', p: 1.45, d: '+1 энергия Света. Добивание ≤35%.', sid: 24275 }),
          A({ id: 'inquisition', n: 'Инквизиция', en: 'Inquisition', i: '📜', cs: 3, cd: 1, t: 'buff', p: 0.28, d: 'Расход 3 энергии Света — +атака на 3 хода.', sid: 84963 }),
          A({ id: 'avenging', n: 'Гнев карателя', en: 'Avenging Wrath', i: '😇', cd: 5, t: 'buff', p: 0.3, d: '+атака на 3 хода.', sid: 31884 }),
          A({ id: 'holy_avenger', n: 'Святой мститель', en: 'Holy Avenger', i: '🔥', cd: 5, t: 'buff', p: 0.22, d: '+атака (lite; вместо Zealotry Cata).', sid: 105809 }),
        ],
      },
    ],
  };

  // ── экспорт ──
  const api = {
    A,
    classId: 'paladin',
    class: PALADIN_CLASS,
    specs: PALADIN_CLASS.specs,
    resource: PALADIN_CLASS.resource,
    secondary: PALADIN_CLASS.secondary,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.PALADIN_BALANCE = api;
})(typeof window !== 'undefined' ? window : globalThis);
