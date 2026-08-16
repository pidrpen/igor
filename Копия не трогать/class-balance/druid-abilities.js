/**
 * Mythic Key — MoP 5.4.8 lite
 * CLASS BALANCE: Druid (balance / feral / guardian / restoration)
 *
 * Назначение: drop-in блок класса `druid` для `wow-mop-data.js`.
 * Не трогает mythic-key.html — только данные способностей + ресурсы спеков.
 *
 * Ключевые решения:
 *  - Balance: secondary eclipse только genSec (gs); без costSec.
 *    Полноценный бафф затмения = engineNeeds (см. druid-report.md).
 *  - Feral: energy + combo (gs builders / cs finishers).
 *  - Guardian: rage; mangle gen, maul spend сильнее генератора.
 *  - Resto: HoT-лестница (reju/regrowth/lifebloom уже в HOT_SPELLS движка).
 *  - savage_def RU: «Дикая защита» (не дубль Survival Instincts).
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

  const DRUID = {
    id: 'druid',
    name: 'Друид',
    nameEn: 'Druid',
    icon: '🐻',
    color: '#FF7D0A',
    resource: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 6 },
    secondary: null,
    specs: [
      // ─── BALANCE ───────────────────────────────────────────────
      {
        id: 'balance',
        name: 'Баланс',
        nameEn: 'Balance',
        role: 'dps',
        icon: '🌙',
        stats: { hp: 95, atk: 17, def: 3, speed: 11 },
        resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 5 },
        // eclipse: uni-bar 0…100; только genSec. Нет spenders (costSec).
        secondaryOverride: { type: 'eclipse', name: 'Затмение', icon: '🌓', max: 100, start: 0 },
        abilities: [
          A({
            id: 'wrath', n: 'Гнев', en: 'Wrath', i: '🌟',
            c: 5, gs: 15, t: 'damage', p: 1.15,
            d: 'Заполнитель. +15 к шкале затмения.', sid: 5176,
          }),
          A({
            id: 'starfire', n: 'Звёздный огонь', en: 'Starfire', i: '⭐',
            c: 7, gs: 20, t: 'damage', p: 1.35,
            d: 'Сильный удар. +20 к шкале затмения.', sid: 2912,
          }),
          A({
            id: 'moonfire', n: 'Лунный огонь', en: 'Moonfire', i: '🌙',
            c: 5, t: 'dot', p: 0.6,
            d: 'DoT (не двигает затмение).', sid: 8921,
          }),
          A({
            id: 'sunfire', n: 'Солнечный огонь', en: 'Sunfire', i: '☀️',
            c: 5, t: 'dot', p: 0.6,
            d: 'DoT (не двигает затмение).', sid: 93402,
          }),
          A({
            id: 'starsurge', n: 'Звёздный поток', en: 'Starsurge', i: '💫',
            c: 8, gs: 12, cd: 1, t: 'damage', p: 1.55,
            d: 'Сильный удар (КД). +12 к затмению.', sid: 78674,
          }),
          A({
            id: 'starfall', n: 'Звездопад', en: 'Starfall', i: '🌠',
            c: 12, cd: 3, t: 'aoe', p: 0.95,
            d: 'AoE по врагам.', sid: 48505,
          }),
          A({
            id: 'hurricane', n: 'Ураган', en: 'Hurricane', i: '🌪️',
            c: 12, t: 'aoe', p: 0.8,
            d: 'AoE-канал (мана).', sid: 16914,
          }),
          A({
            id: 'celestial', n: 'Небесное выравнивание', en: 'Celestial Alignment', i: '🌌',
            cd: 5, t: 'buff', p: 0.32,
            d: '+атака (упрощ. оба затмения). Не тратит шкалу.', sid: 112071,
          }),
          A({
            id: 'incarnation', n: 'Воплощение', en: 'Incarnation: Chosen of Elune', i: '🦉',
            cd: 5, t: 'buff', p: 0.28,
            d: '+атака на несколько ходов.', sid: 102560,
          }),
        ],
      },

      // ─── FERAL ─────────────────────────────────────────────────
      {
        id: 'feral',
        name: 'Сила зверя',
        nameEn: 'Feral',
        role: 'dps',
        icon: '🐱',
        stats: { hp: 100, atk: 17, def: 3, speed: 14 },
        resourceOverride: { type: 'energy', name: 'Энергия', icon: '⚡', max: 100, start: 100, regen: 20 },
        secondaryOverride: { type: 'combo', name: 'Серия приёмов', icon: '🃏', max: 5, start: 0 },
        abilities: [
          A({
            id: 'shred', n: 'Полоснуть', en: 'Shred', i: '✂️',
            c: 40, gs: 1, t: 'damage', p: 1.3,
            d: 'Основной набор серии (−40 энергии, +1).', sid: 5221,
          }),
          A({
            id: 'rake', n: 'Глубокая рана', en: 'Rake', i: '🩸',
            c: 35, gs: 1, t: 'dot', p: 0.6,
            d: 'DoT + 1 к серии.', sid: 1822,
          }),
          A({
            id: 'rip', n: 'Разорвать', en: 'Rip', i: '💔',
            c: 30, cs: 1, t: 'dot', p: 0.8,
            d: 'Завершающий DoT (вся серия).', sid: 1079,
          }),
          A({
            id: 'ferocious', n: 'Свирепый укус', en: 'Ferocious Bite', i: '🦷',
            c: 25, cs: 1, t: 'damage', p: 1.55,
            d: 'Завершающий урон (сильнее с длинной серией).', sid: 22568,
          }),
          A({
            id: 'thrash', n: 'Взбучка', en: 'Thrash', i: '🌀',
            c: 45, gs: 1, t: 'aoe', p: 0.75,
            d: 'AoE-кровотечение + 1 к серии.', sid: 106830,
          }),
          A({
            id: 'tigers_fury', n: 'Тигриное неистовство', en: "Tiger's Fury", i: '🐯',
            cd: 3, g: 60, t: 'buff', p: 0.18,
            d: '+60 энергии и +атака.', sid: 5217,
          }),
          A({
            id: 'berserk', n: 'Берсерк', en: 'Berserk', i: '😡',
            cd: 5, t: 'buff', p: 0.28,
            d: '+атака (КД).', sid: 106951,
          }),
          A({
            id: 'savage_roar', n: 'Дикий рёв', en: 'Savage Roar', i: '📢',
            c: 25, cs: 1, t: 'buff', p: 0.22,
            d: 'Завершающий: +атака (сильнее с серией).', sid: 52610,
          }),
          A({
            id: 'swipe', n: 'Размах', en: 'Swipe', i: '👋',
            c: 40, gs: 1, t: 'aoe', p: 0.75,
            d: 'AoE + 1 к серии.', sid: 62078,
          }),
        ],
      },

      // ─── GUARDIAN ──────────────────────────────────────────────
      {
        id: 'guardian',
        name: 'Страж',
        nameEn: 'Guardian',
        role: 'tank',
        icon: '🐻',
        stats: { hp: 180, atk: 12, def: 12, speed: 8 },
        resourceOverride: { type: 'rage', name: 'Ярость', icon: '💢', max: 100, start: 20, regen: 8 },
        abilities: [
          A({
            id: 'mangle', n: 'Увечье', en: 'Mangle', i: '🐻',
            g: 15, cd: 1, t: 'damage', p: 1.05,
            d: 'Главный генератор: +15 ярости.', sid: 33878,
          }),
          A({
            id: 'thrash', n: 'Взбучка', en: 'Thrash', i: '🌀',
            c: 20, t: 'aoe', p: 0.85,
            d: 'Расход 20 — AoE / агро.', sid: 77758,
          }),
          A({
            id: 'lacerate', n: 'Растерзать', en: 'Lacerate', i: '🩸',
            c: 15, t: 'dot', p: 0.65,
            d: 'Расход 15 — DoT.', sid: 33745,
          }),
          A({
            id: 'maul', n: 'Трепка', en: 'Maul', i: '👊',
            c: 30, t: 'damage', p: 1.5,
            d: 'Главный расход 30 ярости — сильнее увечья.', sid: 6807,
          }),
          A({
            id: 'frenzied', n: 'Неистовое восстановление', en: 'Frenzied Regeneration', i: '💚',
            c: 50, cd: 2, t: 'heal', p: 0.38,
            d: 'Расход 50 — самолечение.', sid: 22842,
          }),
          A({
            id: 'savage_def', n: 'Дикая защита', en: 'Savage Defense', i: '🛡️',
            c: 50, t: 'shield', p: 0.4,
            d: 'Расход 50 — щит (не путать с Инстинктами выживания).', sid: 62606,
          }),
          A({
            id: 'barkskin', n: 'Дубовая кожа', en: 'Barkskin', i: '🪵',
            cd: 4, t: 'shield', p: 0.32,
            d: 'Щит (КД, без ярости).', sid: 22812,
          }),
          A({
            id: 'survival', n: 'Инстинкты выживания', en: 'Survival Instincts', i: '❤️',
            cd: 5, t: 'shield', p: 0.48,
            d: 'Сильный щит (КД, без ярости).', sid: 61336,
          }),
          A({
            id: 'growl', n: 'Рык', en: 'Growl', i: '📢',
            cd: 2, t: 'taunt', p: 0,
            d: 'Провокация.', sid: 6795,
          }),
        ],
      },

      // ─── RESTORATION ───────────────────────────────────────────
      {
        id: 'restoration',
        name: 'Исцеление',
        nameEn: 'Restoration',
        role: 'healer',
        icon: '🌳',
        stats: { hp: 95, atk: 8, def: 4, speed: 10 },
        resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 7 },
        abilities: [
          A({
            id: 'reju', n: 'Омоложение', en: 'Rejuvenation', i: '🍃',
            c: 8, t: 'heal', p: 0.34,
            d: 'HoT: слабый hit + тики (лучшая HPM).', sid: 774,
          }),
          A({
            id: 'regrowth', n: 'Восстановление', en: 'Regrowth', i: '🌱',
            c: 13, t: 'heal', p: 0.42,
            d: 'Hit + HoT (дорого, сильный фронт).', sid: 8936,
          }),
          A({
            id: 'ht', n: 'Целительное прикосновение', en: 'Healing Touch', i: '💚',
            c: 14, t: 'heal', p: 0.52,
            d: 'Сильное прямое лечение (без HoT).', sid: 5185,
          }),
          A({
            id: 'wg', n: 'Буйный рост', en: 'Wild Growth', i: '🌸',
            c: 16, cd: 2, t: 'heal_aoe', p: 0.28,
            d: 'Мгновенный хил по отряду (упрощ., не HoT-тики).', sid: 48438,
          }),
          A({
            id: 'swiftmend', n: 'Быстрое восстановление', en: 'Swiftmend', i: '⚡',
            c: 10, cd: 2, t: 'heal', p: 0.5,
            d: 'Сильный мгновенный хил (КД). HoT не снимает (lite).', sid: 18562,
          }),
          A({
            id: 'lifebloom', n: 'Жизнецвет', en: 'Lifebloom', i: '🌼',
            c: 8, t: 'heal', p: 0.32,
            d: 'HoT на 3 хода (hit + тики).', sid: 33763,
          }),
          A({
            id: 'tranq', n: 'Спокойствие', en: 'Tranquility', i: '☮️',
            c: 18, cd: 5, t: 'heal_aoe', p: 0.36,
            d: 'Большой хил по отряду (КД).', sid: 740,
          }),
          A({
            id: 'nourish', n: 'Покровительство природы', en: 'Nourish', i: '🌿',
            c: 9, t: 'heal', p: 0.4,
            d: 'Экономичное прямое лечение.', sid: 50464,
          }),
          A({
            id: 'moonfire', n: 'Лунный огонь', en: 'Moonfire', i: '🌙',
            c: 5, t: 'dot', p: 0.55,
            d: 'Заполнитель урона (DoT).', sid: 8921,
          }),
        ],
      },
    ],
  };

  /**
   * Применить патч к массиву WOW_CLASSES (мутирует на месте).
   * @param {Array} classes
   * @returns {object|null} заменённый класс
   */
  function applyTo(classes) {
    if (!Array.isArray(classes)) return null;
    const idx = classes.findIndex((c) => c.id === 'druid');
    if (idx < 0) return null;
    classes[idx] = DRUID;
    return DRUID;
  }

  const api = {
    classId: 'druid',
    version: 'MoP 5.4.8 lite',
    cls: DRUID,
    applyTo,
    /**
     * engineNeeds — фичи, которые данными не закрыть (нужен mythic-key.html).
     * Не править HTML из этой задачи; только зафиксировать.
     */
    engineNeeds: [
      {
        id: 'eclipse_threshold_buff',
        spec: 'balance',
        priority: 'P1',
        summary:
          'При eclipse.current >= max выдать бафф «Затмение» (+ATK / +spell dmg на N ходов) и сбросить/реверснуть шкалу.',
        why: 'Сейчас genSec только наполняет бар; costSec нет, FINISHER/special для eclipse нет — secondary мёртв для геймплея.',
      },
      {
        id: 'eclipse_ai_not_builder_lock',
        spec: 'balance',
        priority: 'P2',
        summary:
          'AI: для secondary type===eclipse не залипать на genSec-билдерах до cap; чередовать dots/aoe/starsurge.',
        why: 'Общий AI builder-priority заточен под combo/chi; на eclipse даёт вечный Wrath/Starfire.',
      },
      {
        id: 'tank_self_heal_ai',
        spec: 'guardian',
        priority: 'P2',
        summary: 'AI-танк: кастовать type:heal на себя (frenzied) при низком HP.',
        why: 'Сейчас heal только у role===healer → FR мёртв для AI.',
      },
      {
        id: 'swiftmend_consume_hot',
        spec: 'restoration',
        priority: 'P3',
        summary: 'Опционально: Swiftmend требует/съедает reju|regrowth HoT.',
        why: 'В lite desc честно говорит «не снимает»; полный MoP — consume.',
      },
    ],
  };

  global.CLASS_BALANCE = global.CLASS_BALANCE || {};
  global.CLASS_BALANCE.druid = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  function applyDruidBalance(classes) {
    return applyTo(classes);
  }
  api.apply = applyDruidBalance;
  global.CLASS_BALANCE_PACKS = global.CLASS_BALANCE_PACKS || [];
  global.CLASS_BALANCE_PACKS.push({ id: 'druid', apply: applyDruidBalance });

})(typeof window !== 'undefined' ? window : globalThis);
