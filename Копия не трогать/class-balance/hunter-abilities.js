/**
 * Mythic Key MoP 5.4.8 lite — Hunter focus balance package
 * Specs: beast_mastery / marksmanship / survival
 *
 * Фокус: cost / gen концентрации; сигнатуры BM KC, MM Aimed/Chimera, SV Explosive/Black Arrow.
 * Питомцы: постоянный hunter_pet + Dire Beast через PET_SUMMONS в main (см. engineNeeds).
 *
 * Не правит mythic-key.html. Встраивание: applyHunterBalance(WOW_CLASSES) или ручной merge в wow-mop-data.js.
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

  /** Baseline (pre-balance / audit 05-hunter-all) — для diff в отчёте */
  const BASELINE = {
    resource: { type: 'focus', max: 100, start: 100, regen: 14 },
    beast_mastery: {
      kill_cmd: { c: 40, g: 0, cd: 1, p: 1.5 },
      cobra: { c: 0, g: 14, cd: 0, p: 0.85 },
      arcane_shot: { c: 30, g: 0, cd: 0, p: 1.2 },
      multi: { c: 40, g: 0, cd: 0, p: 0.7 },
      serpent: { c: 25, g: 0, cd: 2, p: 0.5 },
      dire: { c: 0, g: 10, cd: 2, p: 1.1 },
      kill_shot: { c: 15, g: 0, cd: 2, p: 1.8 },
    },
    marksmanship: {
      aimed: { c: 50, g: 0, cd: 0, p: 1.55 },
      chimera: { c: 45, g: 0, cd: 2, p: 1.45 },
      steady: { c: 0, g: 14, cd: 0, p: 0.8 },
      arcane: { c: 30, g: 0, cd: 0, p: 1.15 },
      multi: { c: 40, g: 0, cd: 0, p: 0.7 },
      serpent: { c: 25, g: 0, cd: 2, p: 0.5 },
      kill_shot: { c: 15, g: 0, cd: 2, p: 1.8 },
    },
    survival: {
      explosive: { c: 25, g: 0, cd: 1, p: 1.4 },
      black_arrow: { c: 35, g: 0, cd: 3, p: 0.7 },
      cobra: { c: 0, g: 14, cd: 0, p: 0.85 },
      arcane: { c: 30, g: 0, cd: 0, p: 1.2 },
      multi: { c: 40, g: 0, cd: 0, p: 0.75 },
      serpent: { c: 25, g: 0, cd: 2, p: 0.55 },
      explosive_trap: { c: 20, g: 0, cd: 3, p: 0.8 },
      kill_shot: { c: 15, g: 0, cd: 2, p: 1.8 },
    },
  };

  const HUNTER_CLASS = {
    id: 'hunter',
    name: 'Охотник',
    nameEn: 'Hunter',
    icon: '🏹',
    color: '#ABD473',
    resource: { type: 'focus', name: 'Концентрация', icon: '🎯', max: 100, start: 100, regen: 14 },
    secondary: null,
    specs: [
      {
        id: 'beast_mastery',
        name: 'Повелитель зверей',
        nameEn: 'Beast Mastery',
        role: 'dps',
        icon: '🐺',
        stats: { hp: 100, atk: 16, def: 3, speed: 12 },
        abilities: [
          // Сигнатура первой — AI power-sort всё равно берёт max p, но порядок читаем для UI
          A({ id: 'kill_cmd', n: 'Команда «Взять!»', en: 'Kill Command', i: '🐾', c: 35, cd: 1, t: 'damage', p: 1.55, d: 'Главный расход — питомец бьёт (engine: pet ×1.1).', sid: 34026 }),
          A({ id: 'cobra', n: 'Выстрел кобры', en: 'Cobra Shot', i: '🐍', g: 18, t: 'damage', p: 0.8, d: 'Генератор: +18 концентрации.', sid: 77767 }),
          A({ id: 'arcane_shot', n: 'Чародейский выстрел', en: 'Arcane Shot', i: '💜', c: 25, t: 'damage', p: 1.25, d: 'Расход 25 концентрации.', sid: 3044 }),
          A({ id: 'kill_shot', n: 'Убийственный выстрел', en: 'Kill Shot', i: '💀', c: 15, cd: 2, t: 'damage', p: 1.9, d: 'Добивание ≤35%.', sid: 53351 }),
          A({ id: 'multi', n: 'Залп', en: 'Multi-Shot', i: '🏹', c: 35, t: 'aoe', p: 0.8, d: 'Расход 35 — по области.', sid: 2643 }),
          A({ id: 'bestial', n: 'Звериный гнев', en: 'Bestial Wrath', i: '😤', cd: 4, t: 'buff', p: 0.3, d: '+атака вам и питомцу.', sid: 19574 }),
          A({ id: 'rapid', n: 'Быстрая стрельба', en: 'Rapid Fire', i: '💨', cd: 5, t: 'buff', p: 0.25, d: '+атака (перезарядка).', sid: 3045 }),
          A({ id: 'serpent', n: 'Укус змеи', en: 'Serpent Sting', i: '🐍', c: 20, cd: 2, t: 'dot', p: 0.6, d: 'Расход 20 — периодический урон.', sid: 1978 }),
          A({ id: 'dire', n: 'Зверь', en: 'Dire Beast', i: '🐻', cd: 2, t: 'damage', p: 1.05, g: 12, d: 'Урон + зверь (PET_SUMMONS.dire), +12 концентрации.', sid: 120679 }),
        ],
      },
      {
        id: 'marksmanship',
        name: 'Стрельба',
        nameEn: 'Marksmanship',
        role: 'dps',
        icon: '🎯',
        stats: { hp: 98, atk: 17, def: 3, speed: 12 },
        abilities: [
          // Chimera p > Aimed → AI на КД берёт сигнатуру; Aimed — дорогой dump
          A({ id: 'chimera', n: 'Выстрел химеры', en: 'Chimera Shot', i: '🐲', c: 40, cd: 2, t: 'damage', p: 1.75, d: 'Главный расход на КД — сигнатура MM.', sid: 53209 }),
          A({ id: 'steady', n: 'Верный выстрел', en: 'Steady Shot', i: '➡️', g: 18, t: 'damage', p: 0.75, d: 'Генератор: +18 концентрации.', sid: 56641 }),
          A({ id: 'aimed', n: 'Прицельный выстрел', en: 'Aimed Shot', i: '🎯', c: 45, t: 'damage', p: 1.6, d: 'Дорогой сильный удар (dump focus).', sid: 19434 }),
          A({ id: 'arcane', n: 'Чародейский выстрел', en: 'Arcane Shot', i: '💜', c: 25, t: 'damage', p: 1.25, d: 'Расход 25 — заполнитель.', sid: 3044 }),
          A({ id: 'kill_shot', n: 'Убийственный выстрел', en: 'Kill Shot', i: '💀', c: 15, cd: 2, t: 'damage', p: 1.9, d: 'Добивание ≤35%.', sid: 53351 }),
          A({ id: 'multi', n: 'Залп', en: 'Multi-Shot', i: '🏹', c: 35, t: 'aoe', p: 0.8, d: 'По области.', sid: 2643 }),
          A({ id: 'rapid', n: 'Быстрая стрельба', en: 'Rapid Fire', i: '💨', cd: 5, t: 'buff', p: 0.3, d: '+атака.', sid: 3045 }),
          A({ id: 'serpent', n: 'Укус змеи', en: 'Serpent Sting', i: '🐍', c: 20, cd: 2, t: 'dot', p: 0.6, d: 'Периодический урон.', sid: 1978 }),
        ],
      },
      {
        id: 'survival',
        name: 'Выживание',
        nameEn: 'Survival',
        role: 'dps',
        icon: '🪤',
        stats: { hp: 102, atk: 16, def: 4, speed: 12 },
        abilities: [
          A({ id: 'explosive', n: 'Разрывной выстрел', en: 'Explosive Shot', i: '💣', c: 25, cd: 1, t: 'damage', p: 1.5, d: 'Главный расход концентрации.', sid: 53301 }),
          A({ id: 'cobra', n: 'Выстрел кобры', en: 'Cobra Shot', i: '🐍', g: 18, t: 'damage', p: 0.8, d: 'Генератор: +18 концентрации.', sid: 77767 }),
          A({ id: 'arcane', n: 'Чародейский выстрел', en: 'Arcane Shot', i: '💜', c: 25, t: 'damage', p: 1.25, d: 'Расход 25.', sid: 3044 }),
          A({ id: 'black_arrow', n: 'Чёрная стрела', en: 'Black Arrow', i: '🖤', c: 30, cd: 3, t: 'dot', p: 0.85, d: 'Сильный DoT (4 тика).', sid: 3674 }),
          A({ id: 'multi', n: 'Залп', en: 'Multi-Shot', i: '🏹', c: 35, t: 'aoe', p: 0.85, d: 'По области.', sid: 2643 }),
          A({ id: 'serpent', n: 'Укус змеи', en: 'Serpent Sting', i: '🐍', c: 20, cd: 2, t: 'dot', p: 0.6, d: 'Периодический урон.', sid: 1978 }),
          A({ id: 'kill_shot', n: 'Убийственный выстрел', en: 'Kill Shot', i: '💀', c: 15, cd: 2, t: 'damage', p: 1.9, d: 'Добивание ≤35%.', sid: 53351 }),
          A({ id: 'rapid', n: 'Быстрая стрельба', en: 'Rapid Fire', i: '💨', cd: 5, t: 'buff', p: 0.25, d: '+атака.', sid: 3045 }),
          A({ id: 'explosive_trap', n: 'Взрывная ловушка', en: 'Explosive Trap', i: '🔥', c: 20, cd: 3, t: 'aoe', p: 0.9, d: 'Ловушка: урон по области.', sid: 13813 }),
        ],
      },
    ],
  };

  /**
   * Требования/зависимости движка mythic-key.html.
   * Все пункты alreadyPresent: true — HTML трогать не нужно для этого пакета.
   * optional — улучшения, не блокирующие данные.
   */
  const engineNeeds = {
    alreadyPresent: [
      {
        id: 'permanent_hunter_pet',
        where: 'spawnClassPets → addPet(hero, "hunter_pet", null)',
        note: 'Постоянный питомец на старте боя. Kill Command бьёт через petsOf.',
      },
      {
        id: 'pet_summons_dire',
        where: 'PET_SUMMONS.dire = [{ def: "dire", n: 1, turns: 3 }]',
        note: 'Dire Beast type:damage + side-summon после castAbility. Не type:summon.',
      },
      {
        id: 'kill_cmd_pet_strike',
        where: 'castAbility case damage — ability.id === "kill_cmd" → pet atk×1.1',
        note: 'Гарантированный удар пета; иначе 35% pet assist ×0.15.',
      },
      {
        id: 'bestial_pet_buff',
        where: 'castAbility post — bestial → pets atkMod 0.3',
        note: 'Синергия BM с постоянным и временным петом.',
      },
      {
        id: 'dot_turns',
        where: 'DOT_TURNS.serpent=3, black_arrow=4',
        note: 'Σ DoT ≈ p×0.5 + p×0.4×turns.',
      },
      {
        id: 'execute_kill_shot',
        where: 'EXECUTE_IDS has kill_shot',
        note: 'canPay только при ≤35% HP цели.',
      },
      {
        id: 'focus_regen_pay',
        where: 'regenResources + payAbility(cost then gen)',
        note: 'regen 14/ход; ',
      },
      {
        id: 'ai_focus_gen',
        where: 'aiAct: focus < 35% max → prefer gen; else max power damage/dot',
        note: 'Cobra/Steady при низком focus; сигнатуры при высоком p.',
      },
    ],
    /** Ключи, которые main уже должен держать (для сверки координатора) */
    petSummonsRequired: {
      dire: [{ def: 'dire', n: 1, turns: 3 }],
    },
    petDefsRequired: ['hunter_pet', 'dire'],
    optional: [
      {
        id: 'kill_cmd_pet_mult',
        note: 'При PET_NERF=0.25 добавка KC мала (~0.2 эфф. p). Можно ×1.3–1.5 без смены cost 35.',
        requiresHtml: true,
      },
      {
        id: 'ai_dot_value',
        note: 'AI смотрит raw power DoT, не Σ тиков → Black Arrow/Serpent редко. Можно score p×(0.5+0.4×turns).',
        requiresHtml: true,
      },
      {
        id: 'serpent_synergy',
        note: 'В 5.4.8 Serpent почти мёртв у MM; data-only cost 20 / p 0.6 — компромисс без синергий.',
        requiresHtml: false,
      },
    ],
  };

  /** Сводка cost/gen для отчёта и тестов */
  const focusTable = {
    resource: HUNTER_CLASS.resource,
    bySpec: {
      beast_mastery: {
        generators: [
          { id: 'cobra', gen: 18, power: 0.8 },
          { id: 'dire', gen: 12, power: 1.05, cost: 0 },
        ],
        spenders: [
          { id: 'kill_cmd', cost: 35, power: 1.55, cd: 1, signature: true },
          { id: 'arcane_shot', cost: 25, power: 1.25 },
          { id: 'multi', cost: 35, power: 0.8, aoe: true },
          { id: 'serpent', cost: 20, power: 0.6, type: 'dot' },
          { id: 'kill_shot', cost: 15, power: 1.9, execute: true },
        ],
        sustainNote: 'KC(−35+14) + Cobra(+18+14) ≈ net 0 за 2 хода — стабильный цикл.',
      },
      marksmanship: {
        generators: [{ id: 'steady', gen: 18, power: 0.75 }],
        spenders: [
          { id: 'chimera', cost: 40, power: 1.75, cd: 2, signature: true },
          { id: 'aimed', cost: 45, power: 1.6, signature: true },
          { id: 'arcane', cost: 25, power: 1.25 },
          { id: 'multi', cost: 35, power: 0.8, aoe: true },
          { id: 'serpent', cost: 20, power: 0.6, type: 'dot' },
          { id: 'kill_shot', cost: 15, power: 1.9, execute: true },
        ],
        sustainNote: 'Chimera p>Aimed → AI на КД; Aimed dump; Steady g18 закрывает −40/−45.',
      },
      survival: {
        generators: [{ id: 'cobra', gen: 18, power: 0.8 }],
        spenders: [
          { id: 'explosive', cost: 25, power: 1.5, cd: 1, signature: true },
          { id: 'black_arrow', cost: 30, power: 0.85, cd: 3, type: 'dot', signature: true },
          { id: 'arcane', cost: 25, power: 1.25 },
          { id: 'multi', cost: 35, power: 0.85, aoe: true },
          { id: 'explosive_trap', cost: 20, power: 0.9, aoe: true },
          { id: 'serpent', cost: 20, power: 0.6, type: 'dot' },
          { id: 'kill_shot', cost: 15, power: 1.9, execute: true },
        ],
        sustainNote: 'ES 25 / p1.5 — лучший p/focus; 2×ES + Cobra ≈ +focus; BA 30/3 — DoT-окно.',
      },
    },
  };

  function applyHunterBalance(WOW_CLASSES) {
    if (!Array.isArray(WOW_CLASSES)) return false;
    const idx = WOW_CLASSES.findIndex((c) => c.id === 'hunter');
    if (idx < 0) {
      WOW_CLASSES.push(JSON.parse(JSON.stringify(HUNTER_CLASS)));
      return true;
    }
    WOW_CLASSES[idx] = JSON.parse(JSON.stringify(HUNTER_CLASS));
    return true;
  }

  const HUNTER_BALANCE = {
    version: '5.4.8-lite-hunter-focus-1',
    classId: 'hunter',
    baseline: BASELINE,
    class: HUNTER_CLASS,
    engineNeeds,
    focusTable,
    applyHunterBalance,
  };

  if (typeof global !== 'undefined') {
    global.HUNTER_BALANCE = HUNTER_BALANCE;
    global.HUNTER_CLASS = HUNTER_CLASS;
    global.applyHunterBalance = applyHunterBalance;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = HUNTER_BALANCE;
  }
  HUNTER_BALANCE.apply = applyHunterBalance;
  global.CLASS_BALANCE_PACKS = global.CLASS_BALANCE_PACKS || [];
  global.CLASS_BALANCE_PACKS.push({ id: 'hunter', apply: applyHunterBalance });

})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
