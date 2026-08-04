/**
 * Mythic Key — MoP 5.4.8 lite
 * CLASS BALANCE: Monk (brewmaster / mistweaver / windwalker)
 *
 * Ресурсы: Energy|Mana (primary) + Chi (secondary, gs/cs).
 * Drop-in: блок класса `monk` → wow-mop-data.js (WOW_CLASSES).
 * mythic-key.html НЕ править — engineNeeds только ТЗ.
 *
 * Критично Brewmaster:
 *  - engineNeeds MUST include stagger (purifying cleanses stagger, not plain heal)
 *  - Guard = shield; Keg Smash gs:2; Elusive = DEF (not ATK)
 * MW: Surging/Enveloping correct RU; chi heals
 * WW: Jab / RSK / BoK / FoF / ToD execute
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

  /**
   * engineNeeds — фичи, которые данными не закрыть (нужен mythic-key.html).
   * stagger REQUIRED для identity хмелевара.
   */
  const engineNeeds = [
    {
      id: 'stagger',
      required: true,
      priority: 'P0',
      spec: 'brewmaster',
      summary:
        'Пошатывание: доля входящего урона → пул actor.stagger (self-DoT тики). ' +
        'Purifying Brew (id: purifying, cs:1) СНИМАЕТ пул, НЕ лечит HP.',
      why:
        'Без stagger purifying как heal ломает Brewmaster: 1χ = стабильный self-heal, ' +
        'а не разряд отложенного урона. Core tank loop MoP = Stagger → Purify.',
      model: {
        fractionOfHit: 0.35,
        tickPerRound: 0.25,
        maxTicks: 4,
        softCapOfMaxHp: 0.6,
      },
      purify: {
        abilityId: 'purifying',
        costSec: 1,
        typeInData: 'cleanse',
        effect: 'remove_stagger_pool',
        cleanseFraction: 1.0,
        residualHeal: 0,
        emptyPool: 'noop',
      },
      // Пока нет патча: type cleanse → default switch = анимация + трата chi, без heal (лучше fake heal).
    },
    {
      id: 'elusive_def',
      required: true,
      priority: 'P0',
      spec: 'brewmaster',
      abilityId: 'elusive',
      summary:
        'Elusive Brew = DEF/dodge mitigation. Generic buff→atkMod ЗАПРЕЩЁН. ' +
        'Preferred: buff + defMod:power. Interim data: type shield (absorb), не ATK.',
      preferred: { type: 'buff', defModFromPower: true, atkMod: 0, turns: 3 },
      interimData: { type: 'shield', power: 0.28 },
      enginePatchHint:
        "if (ability.id === 'elusive') applyStatus(actor, { defMod: power, atkMod: 0, turns: 3 })",
    },
    {
      id: 'guard_shield',
      required: true,
      priority: 'P1',
      spec: 'brewmaster',
      abilityId: 'guard',
      summary: 'Guard = absorb shield (type:shield, cs:2, cd:2). Уже wired в castAbility.',
      fields: { type: 'shield', costSec: 2, cd: 2, power: 0.45 },
    },
    {
      id: 'keg_smash_gs2',
      required: true,
      priority: 'P1',
      spec: 'brewmaster',
      abilityId: 'keg_smash',
      summary: 'Keg Smash MUST genSec:2 (gs:2), cost 40 energy, type aoe.',
      fields: { cost: 40, genSec: 2, cd: 1, type: 'aoe' },
    },
    {
      id: 'shuffle_bok',
      required: false,
      priority: 'P2',
      spec: 'brewmaster',
      abilityId: 'blackout',
      summary: 'Blackout Kick → Shuffle: +defMod ~0.12 на 2–3 хода поверх damage.',
    },
    {
      id: 'touch_death_execute',
      required: true,
      priority: 'P1',
      spec: 'windwalker',
      abilityId: 'touch_death',
      summary: 'ToD в EXECUTE_IDS (≤35% HP), cs:3, cd:4, power ~1.85 flat.',
      fields: { costSec: 3, cd: 4, type: 'damage', power: 1.85 },
      engineSet: 'EXECUTE_IDS',
      note: 'В актуальном mythic-key touch_death уже в EXECUTE_IDS — сверить, html не править из пакета.',
    },
    {
      id: 'mw_hot_spells',
      required: false,
      priority: 'P2',
      spec: 'mistweaver',
      summary: 'HOT_SPELLS: enveloping / renewing / soothing — уже в движке; сверить при мерже.',
      hotSpells: {
        enveloping: { turns: 4, direct: 0.25, tick: 0.32 },
        renewing: { turns: 3, direct: 0.3, tick: 0.28 },
        soothing: { turns: 2, direct: 0.55, tick: 0.3 },
      },
    },
    {
      id: 'mw_ai_chi_heals',
      required: false,
      priority: 'P3',
      spec: 'mistweaver',
      summary: 'AI-хил: не спамить только soothing; учитывать gs heal builders и cs enveloping/uft.',
    },
  ];

  const MONK = {
    id: 'monk',
    name: 'Монах',
    nameEn: 'Monk',
    icon: '🥋',
    color: '#00FF96',
    resource: { type: 'energy', name: 'Энергия', icon: '⚡', max: 100, start: 100, regen: 18 },
    secondary: { type: 'chi', name: 'Ци', icon: '☯️', max: 5, start: 0 },
    specs: [
      // ═════════════════════════════════════
      // BREWMASTER — tank · Energy + Chi
      // Loop: Jab/Keg(+2χ) → Guard / Purify(stagger) / BoK / Breath
      // ═════════════════════════════════════
      {
        id: 'brewmaster',
        name: 'Хмелевар',
        nameEn: 'Brewmaster',
        role: 'tank',
        icon: '🍺',
        stats: { hp: 168, atk: 12, def: 11, speed: 10 },
        resourceOverride: { type: 'energy', name: 'Энергия', icon: '⚡', max: 100, start: 100, regen: 16 },
        abilities: [
          A({
            id: 'jab', n: 'Джаб', en: 'Jab', i: '👊',
            c: 40, gs: 1, t: 'damage', p: 0.9,
            d: 'Генератор: 40 энергии, +1 ци.', sid: 100780,
          }),
          A({
            id: 'keg_smash', n: 'Удар бочонком', en: 'Keg Smash', i: '🍺',
            c: 40, gs: 2, cd: 1, t: 'aoe', p: 0.9,
            d: 'Генератор: 40 энергии, +2 ци, AoE.', sid: 121253,
          }),
          A({
            id: 'blackout', n: 'Удар чёрного лотоса', en: 'Blackout Kick', i: '🦶',
            cs: 2, t: 'damage', p: 1.3,
            d: 'Расход 2 ци — урон (Shuffle: engineNeeds).', sid: 100784,
          }),
          A({
            id: 'breath', n: 'Дыхание огня', en: 'Breath of Fire', i: '🔥',
            cs: 2, t: 'aoe', p: 0.85,
            d: 'Расход 2 ци — AoE.', sid: 115181,
          }),
          A({
            id: 'guard', n: 'Защита', en: 'Guard', i: '🛡️',
            cs: 2, cd: 2, t: 'shield', p: 0.45,
            d: 'Расход 2 ци — щит-поглощение.', sid: 115295,
          }),
          // cleanse ≠ heal; default cast = no-op until stagger engineNeeds
          A({
            id: 'purifying', n: 'Очищающий отвар', en: 'Purifying Brew', i: '🍵',
            cs: 1, t: 'cleanse', p: 1.0,
            d: 'Расход 1 ци — снимает пошатывание (не лечение).', sid: 119582,
          }),
          // interim: shield absorb (NOT buff→ATK). Preferred DEF via engineNeeds.elusive_def
          A({
            id: 'elusive', n: 'Отвар неуловимости', en: 'Elusive Brew', i: '💨',
            cd: 2, t: 'shield', p: 0.28,
            d: 'Митигация (уклонение/DEF; lite = absorb). Не усиливает атаку.', sid: 115308,
          }),
          A({
            id: 'provoke', n: 'Вызов', en: 'Provoke', i: '📢',
            cd: 2, t: 'taunt', p: 0,
            d: 'Провокация.', sid: 115546,
          }),
          A({
            id: 'fort_brew', n: 'Отвар железной шкуры', en: 'Fortifying Brew', i: '🏋️',
            cd: 5, t: 'shield', p: 0.48,
            d: 'Сильный щит (большой КД).', sid: 115203,
          }),
        ],
      },

      // ═════════════════════════════════════
      // MISTWEAVER — healer · Mana + Chi
      // Chi heals: Renewing/Surging/Jab → Enveloping / Uplift
      // RU: Surging = Бурлящий; Enveloping = Окутывающий
      // ═════════════════════════════════════
      {
        id: 'mistweaver',
        name: 'Ткач туманов',
        nameEn: 'Mistweaver',
        role: 'healer',
        icon: '🌫️',
        stats: { hp: 95, atk: 8, def: 4, speed: 11 },
        resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 7 },
        abilities: [
          A({
            id: 'renewing', n: 'Заживляющий туман', en: 'Renewing Mist', i: '✨',
            c: 10, cd: 1, gs: 1, t: 'heal', p: 0.32,
            d: 'HoT + 1 ци. Мана 10.', sid: 115151,
          }),
          A({
            id: 'surging', n: 'Бурлящий туман', en: 'Surging Mist', i: '💚',
            c: 12, gs: 1, t: 'heal', p: 0.42,
            d: 'Быстрое лечение + 1 ци. Мана 12.', sid: 116694,
          }),
          A({
            id: 'enveloping', n: 'Окутывающий туман', en: 'Enveloping Mist', i: '🌿',
            cs: 3, t: 'heal', p: 0.52,
            d: 'Расход 3 ци — hit + сильный HoT.', sid: 124682,
          }),
          A({
            id: 'uft', n: 'Духовный подъём', en: 'Uplift', i: '🙌',
            cs: 2, t: 'heal_aoe', p: 0.3,
            d: 'Расход 2 ци — хил по отряду.', sid: 116670,
          }),
          A({
            id: 'soothing', n: 'Успокаивающий туман', en: 'Soothing Mist', i: '🍃',
            c: 9, t: 'heal', p: 0.38,
            d: 'Канал-хил (мана, без ци).', sid: 115175,
          }),
          A({
            id: 'spinning', n: 'Танцующий журавль', en: 'Spinning Crane Kick', i: '🌪️',
            c: 12, t: 'aoe', p: 0.65,
            d: 'AoE урон (мана).', sid: 101546,
          }),
          A({
            id: 'jab', n: 'Джаб', en: 'Jab', i: '👊',
            c: 8, gs: 1, t: 'damage', p: 0.85,
            d: 'Генератор: +1 ци (мана 8).', sid: 100780,
          }),
          A({
            id: 'thunder_focus', n: 'Громовой чай', en: 'Thunder Focus Tea', i: '☕',
            cd: 3, t: 'buff', p: 0.2,
            d: 'Усиление следующего исцеления (упрощ. +атака).', sid: 116680,
          }),
          A({
            id: 'revival', n: 'Восстановление сил', en: 'Revival', i: '🌈',
            c: 18, cd: 5, t: 'heal_aoe', p: 0.36,
            d: 'Большой хил по отряду (рейд-КД).', sid: 115310,
          }),
        ],
      },

      // ═════════════════════════════════════
      // WINDWALKER — dps · Energy + Chi
      // Jab → RSK / BoK / FoF; ToD execute ≤35%
      // Order: strong spenders before Tiger Palm (AI first-usable)
      // ═════════════════════════════════════
      {
        id: 'windwalker',
        name: 'Танцующий с ветром',
        nameEn: 'Windwalker',
        role: 'dps',
        icon: '🌪️',
        stats: { hp: 100, atk: 17, def: 3, speed: 14 },
        resourceOverride: { type: 'energy', name: 'Энергия', icon: '⚡', max: 100, start: 100, regen: 18 },
        abilities: [
          A({
            id: 'jab', n: 'Джаб', en: 'Jab', i: '👊',
            c: 40, gs: 1, t: 'damage', p: 0.95,
            d: 'Генератор: 40 энергии, +1 ци.', sid: 100780,
          }),
          A({
            id: 'rsk', n: 'Удар восходящего солнца', en: 'Rising Sun Kick', i: '🌅',
            cs: 2, cd: 1, t: 'damage', p: 1.5,
            d: 'Расход 2 ци — сильный удар (приоритет).', sid: 107428,
          }),
          A({
            id: 'bok', n: 'Удар чёрного лотоса', en: 'Blackout Kick', i: '🦶',
            cs: 2, t: 'damage', p: 1.4,
            d: 'Расход 2 ци — основной spender.', sid: 100784,
          }),
          A({
            id: 'fists', n: 'Ярость Сюэня', en: 'Fists of Fury', i: '👊',
            cs: 3, cd: 3, t: 'aoe', p: 1.1,
            d: 'Расход 3 ци — канал AoE.', sid: 113656,
          }),
          A({
            id: 'touch_death', n: 'Касание смерти', en: 'Touch of Death', i: '💀',
            cs: 3, cd: 4, t: 'damage', p: 1.85,
            d: 'Расход 3 ци. Добивание: только ≤35% HP цели.', sid: 115080,
          }),
          A({
            id: 'tiger_palm', n: 'Лапа тигра', en: 'Tiger Palm', i: '🐯',
            cs: 1, t: 'damage', p: 1.2,
            d: 'Расход 1 ци — filler.', sid: 100787,
          }),
          A({
            id: 'sck', n: 'Танцующий журавль', en: 'Spinning Crane Kick', i: '🌪️',
            c: 40, t: 'aoe', p: 0.8,
            d: '40 энергии — AoE без ци.', sid: 101546,
          }),
          A({
            id: 'energizing', n: 'Отвар жизненной энергии', en: 'Energizing Brew', i: '⚡',
            cd: 4, t: 'buff', p: 0.15, g: 30,
            d: '+30 энергии и лёгкий бафф.', sid: 115288,
          }),
          A({
            id: 'tigereye', n: 'Пиво тигриного глаза', en: 'Tigereye Brew', i: '🍺',
            cd: 2, t: 'buff', p: 0.28,
            d: '+атака (burst).', sid: 116740,
          }),
        ],
      },
    ],
  };

  function applyTo(classes) {
    if (!Array.isArray(classes)) return null;
    const idx = classes.findIndex((c) => c.id === 'monk');
    if (idx < 0) return null;
    classes[idx] = MONK;
    return MONK;
  }

  function validate() {
    const brew = MONK.specs.find((s) => s.id === 'brewmaster');
    const mw = MONK.specs.find((s) => s.id === 'mistweaver');
    const ww = MONK.specs.find((s) => s.id === 'windwalker');
    const byId = (spec, id) => spec.abilities.find((a) => a.id === id);
    const checks = {
      'engineNeeds includes stagger required':
        engineNeeds.some((e) => e.id === 'stagger' && e.required === true),
      'keg_smash gs:2': byId(brew, 'keg_smash').genSec === 2,
      'guard shield cs:2': byId(brew, 'guard').type === 'shield' && byId(brew, 'guard').costSec === 2,
      'purifying cleanse not heal': byId(brew, 'purifying').type === 'cleanse' && byId(brew, 'purifying').type !== 'heal',
      'purifying cs:1': byId(brew, 'purifying').costSec === 1,
      'elusive not buff-ATK (shield interim)': byId(brew, 'elusive').type === 'shield',
      'surging RU Бурлящий': byId(mw, 'surging').name === 'Бурлящий туман',
      'enveloping RU Окутывающий': byId(mw, 'enveloping').name === 'Окутывающий туман',
      'mw chi heal builders': byId(mw, 'surging').genSec === 1 && byId(mw, 'renewing').genSec === 1,
      'mw chi heal spenders': byId(mw, 'enveloping').costSec === 3 && byId(mw, 'uft').costSec === 2,
      'ww jab gs:1': byId(ww, 'jab').genSec === 1 && byId(ww, 'jab').cost === 40,
      'ww rsk/bok/fists/tod':
        byId(ww, 'rsk').costSec === 2 &&
        byId(ww, 'bok').costSec === 2 &&
        byId(ww, 'fists').costSec === 3 &&
        byId(ww, 'touch_death').costSec === 3 &&
        byId(ww, 'touch_death').power === 1.85,
      'ww rsk before tiger_palm':
        ww.abilities.findIndex((a) => a.id === 'rsk') <
        ww.abilities.findIndex((a) => a.id === 'tiger_palm'),
    };
    const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
    return { ok: failed.length === 0, checks, failed };
  }

  const api = {
    A,
    classId: 'monk',
    version: 'MoP 5.4.8 lite',
    cls: MONK,
    class: MONK,
    specs: MONK.specs,
    resource: MONK.resource,
    secondary: MONK.secondary,
    engineNeeds,
    applyTo,
    validate,
  };

  global.CLASS_BALANCE = global.CLASS_BALANCE || {};
  global.CLASS_BALANCE.monk = api;
  global.MONK_BALANCE = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
