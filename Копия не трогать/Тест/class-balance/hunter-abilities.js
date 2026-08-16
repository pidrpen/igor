/**
 * Mythic Key MoP 5.4.8 lite — Hunter focus balance package (TEST rebalance)
 * Specs: beast_mastery / marksmanship / survival — all testBuild
 *
 * Фокус: cost / gen концентрации; flat-веса вокруг FLAT_REF=15 (как warrior/DK).
 * Сигнатуры: BM Kill Command, MM Chimera/Aimed, SV Explosive/Black Arrow.
 * Питомцы: постоянный hunter_pet + Dire Beast через PET_SUMMONS (engineNeeds).
 *
 * Не правит mythic-key.html. Встраивание: applyHunterBalance(WOW_CLASSES)
 * или apply-all.js через CLASS_BALANCE_PACKS / HUNTER_BALANCE.
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
    // Расширения механики (движок index.html / abilities.js)
    if (o.flat != null) ab.flat = o.flat;
    if (o.fl != null) ab.flat = o.fl;
    if (o.freeAction || o.fa) ab.freeAction = true;
    if (o.hits != null) ab.hits = o.hits;
    if (o.cleaveFlat != null) ab.cleaveFlat = o.cleaveFlat;
    if (o.vuln) ab.vuln = o.vuln;
    if (o.applyDot) ab.applyDot = o.applyDot;
    if (o.applyHot) ab.applyHot = o.applyHot;
    if (o.abilityCharges != null) ab.abilityCharges = o.abilityCharges;
    if (o.lifesteal != null) ab.lifesteal = o.lifesteal;
    if (o.school) ab.school = o.school;
    if (o.maxCharges != null) ab.maxCharges = o.maxCharges;
    if (o.ch != null) ab.maxCharges = o.ch;
    if (o.dmgReduce != null) ab.dmgReduce = o.dmgReduce;
    if (o.dr != null) ab.dmgReduce = o.dr;
    if (o.blockChanceAdd != null) ab.blockChanceAdd = o.blockChanceAdd;
    if (o.blockValueAdd != null) ab.blockValueAdd = o.blockValueAdd;
    if (o.armorMod != null) ab.armorMod = o.armorMod;
    if (o.am != null) ab.armorMod = o.am;
    if (o.armorStacksMax != null) ab.armorStacksMax = o.armorStacksMax;
    if (o.critBonus != null) ab.critBonus = o.critBonus;
    if (o.critMod != null) ab.critMod = o.critMod;
    if (o.cm != null) ab.critMod = o.cm;
    if (o.atkMod != null) ab.atkMod = o.atkMod;
    if (o.petAtkMod != null) ab.petAtkMod = o.petAtkMod;
    if (o.maxHpPct != null) ab.maxHpPct = o.maxHpPct;
    if (o.hpPct != null) ab.maxHpPct = o.hpPct;
    if (o.buffTurns != null) ab.buffTurns = o.buffTurns;
    if (o.bt != null) ab.buffTurns = o.bt;
    if (o.aoeBounce != null) ab.aoeBounce = o.aoeBounce;
    if (o.shieldFromDmg != null) ab.shieldFromDmg = o.shieldFromDmg;
    if (o.enemyDmgMod != null) ab.enemyDmgMod = o.enemyDmgMod;
    if (o.grantBlock) ab.grantBlock = true;
    if (o.grantSelfBuff) ab.grantSelfBuff = o.grantSelfBuff;
    return ab;
  }

  /** Baseline (pre-flat rebalance) — для diff в отчёте */
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

  // ═══════════════════════════════════════════════════════════
  // FLAT_REF = 15 → вес Nт ≈ Nт в бою при atk 15
  // Фокус: max 100 / start 100 / regen 14
  // ═══════════════════════════════════════════════════════════
  const HUNTER_CLASS = {
    id: 'hunter',
    name: 'Охотник',
    nameEn: 'Hunter',
    icon: '🏹',
    color: '#ABD473',
    resource: { type: 'focus', name: 'Концентрация', icon: '🎯', max: 100, start: 100, regen: 14 },
    secondary: null,
    specs: [
      // ─────────────────────────────────────────────────────
      // BEAST MASTERY — Kill Command + pet engine
      // ST fl: kill_shot 40 > kill_cmd 26 > arcane 20 > dire 16 > cobra 12
      // ─────────────────────────────────────────────────────
      {
        id: 'beast_mastery',
        name: 'Повелитель зверей',
        nameEn: 'Beast Mastery',
        role: 'dps',
        icon: '🐺',
        testBuild: true,
        // atk 15 = FLAT_REF
        stats: { hp: 100, atk: 15, def: 3, speed: 12 },
        abilities: [
          A({
            id: 'kill_cmd', n: 'Команда «Взять!»', en: 'Kill Command', i: '🐾',
            c: 35, cd: 1, t: 'damage', fl: 26, school: 'physical',
            d: 'Сигнатура · 26т · 35 конц. · питомец бьёт · КД 1', sid: 34026,
          }),
          A({
            id: 'cobra', n: 'Выстрел кобры', en: 'Cobra Shot', i: '🐍',
            g: 18, t: 'damage', fl: 12, school: 'nature',
            d: 'Генератор · 12т · +18 конц.', sid: 77767,
          }),
          A({
            id: 'arcane_shot', n: 'Чародейский выстрел', en: 'Arcane Shot', i: '💜',
            c: 25, t: 'damage', fl: 20, school: 'arcane',
            d: 'Заполнитель · 20т · 25 конц.', sid: 3044,
          }),
          A({
            id: 'kill_shot', n: 'Убийственный выстрел', en: 'Kill Shot', i: '💀',
            c: 15, cd: 2, t: 'damage', fl: 40, fa: 1, school: 'physical',
            d: 'Добивание ≤35% · 40т · 15 конц. · без хода · КД 2', sid: 53351,
          }),
          A({
            id: 'multi', n: 'Залп', en: 'Multi-Shot', i: '🏹',
            c: 35, t: 'aoe', fl: 14, school: 'physical',
            d: 'AoE · 14т · 35 конц.', sid: 2643,
          }),
          A({
            id: 'bestial', n: 'Звериный гнев', en: 'Bestial Wrath', i: '😤',
            cd: 5, t: 'buff', fa: 1, atkMod: 0.3, bt: 3, school: 'none',
            d: '+30% атаки вам · +30% питомцу · 3 хода · без хода · КД 5', sid: 19574,
          }),
          A({
            id: 'rapid', n: 'Быстрая стрельба', en: 'Rapid Fire', i: '💨',
            cd: 6, t: 'buff', fa: 1, atkMod: 0.25, bt: 3, school: 'none',
            d: '+25% атаки · 3 хода · без хода · КД 6', sid: 3045,
          }),
          A({
            id: 'serpent', n: 'Укус змеи', en: 'Serpent Sting', i: '🐍',
            c: 20, cd: 2, t: 'damage', fl: 8, school: 'nature',
            applyDot: { flat: 5, turns: 4, name: 'Укус змеи', icon: '🐍', id: 'serpent', school: 'nature' },
            d: '8т + яд 5т×4 · 20 конц. · КД 2', sid: 1978,
          }),
          A({
            id: 'dire', n: 'Зверь', en: 'Dire Beast', i: '🐻',
            g: 12, cd: 2, t: 'damage', fl: 16, school: 'physical',
            d: '16т + временный зверь · +12 конц. · КД 2', sid: 120679,
          }),
        ],
      },

      // ─────────────────────────────────────────────────────
      // MARKSMANSHIP — Chimera CD + Aimed dump
      // ST fl: kill_shot 40 > aimed 34 > chimera 28 > arcane 20 > steady 11
      // ─────────────────────────────────────────────────────
      {
        id: 'marksmanship',
        name: 'Стрельба',
        nameEn: 'Marksmanship',
        role: 'dps',
        icon: '🎯',
        testBuild: true,
        stats: { hp: 98, atk: 15, def: 3, speed: 12 },
        abilities: [
          A({
            id: 'chimera', n: 'Выстрел химеры', en: 'Chimera Shot', i: '🐲',
            c: 40, cd: 2, t: 'damage', fl: 28, school: 'nature',
            d: 'Сигнатура · 28т · 40 конц. · КД 2', sid: 53209,
          }),
          A({
            id: 'steady', n: 'Верный выстрел', en: 'Steady Shot', i: '➡️',
            g: 18, t: 'damage', fl: 11, school: 'physical',
            d: 'Генератор · 11т · +18 конц.', sid: 56641,
          }),
          A({
            id: 'aimed', n: 'Прицельный выстрел', en: 'Aimed Shot', i: '🎯',
            c: 45, t: 'damage', fl: 34, school: 'physical',
            d: 'Дорогой dump · 34т · 45 конц.', sid: 19434,
          }),
          A({
            id: 'arcane', n: 'Чародейский выстрел', en: 'Arcane Shot', i: '💜',
            c: 25, t: 'damage', fl: 20, school: 'arcane',
            d: 'Заполнитель · 20т · 25 конц.', sid: 3044,
          }),
          A({
            id: 'kill_shot', n: 'Убийственный выстрел', en: 'Kill Shot', i: '💀',
            c: 15, cd: 2, t: 'damage', fl: 40, fa: 1, school: 'physical',
            d: 'Добивание ≤35% · 40т · 15 конц. · без хода · КД 2', sid: 53351,
          }),
          A({
            id: 'multi', n: 'Залп', en: 'Multi-Shot', i: '🏹',
            c: 35, t: 'aoe', fl: 14, school: 'physical',
            d: 'AoE · 14т · 35 конц.', sid: 2643,
          }),
          A({
            id: 'barrage', n: 'Шквал', en: 'Barrage', i: '🎇',
            c: 30, cd: 3, t: 'aoe', fl: 18, hits: 2, school: 'physical',
            d: 'AoE-бёрст · 18т×2 · 30 конц. · КД 3', sid: 120360,
          }),
          A({
            id: 'rapid', n: 'Быстрая стрельба', en: 'Rapid Fire', i: '💨',
            cd: 6, t: 'buff', fa: 1, atkMod: 0.3, bt: 3, school: 'none',
            d: '+30% атаки · 3 хода · без хода · КД 6', sid: 3045,
          }),
          A({
            id: 'serpent', n: 'Укус змеи', en: 'Serpent Sting', i: '🐍',
            c: 20, cd: 2, t: 'damage', fl: 8, school: 'nature',
            applyDot: { flat: 5, turns: 4, name: 'Укус змеи', icon: '🐍', id: 'serpent', school: 'nature' },
            d: '8т + яд 5т×4 · 20 конц. · КД 2', sid: 1978,
          }),
        ],
      },

      // ─────────────────────────────────────────────────────
      // SURVIVAL — Explosive Shot + Black Arrow DoT
      // ST fl: kill_shot 40 > explosive 24 > arcane 20 > black_arrow 14 > cobra 12
      // ─────────────────────────────────────────────────────
      {
        id: 'survival',
        name: 'Выживание',
        nameEn: 'Survival',
        role: 'dps',
        icon: '🪤',
        testBuild: true,
        stats: { hp: 102, atk: 15, def: 4, speed: 12 },
        abilities: [
          A({
            id: 'explosive', n: 'Разрывной выстрел', en: 'Explosive Shot', i: '💣',
            c: 25, cd: 1, t: 'damage', fl: 24, school: 'fire',
            applyDot: { flat: 4, turns: 3, name: 'Разрывной заряд', icon: '💥', id: 'explosive', school: 'fire' },
            d: 'Сигнатура · 24т + 4т×3 · 25 конц. · КД 1', sid: 53301,
          }),
          A({
            id: 'cobra', n: 'Выстрел кобры', en: 'Cobra Shot', i: '🐍',
            g: 18, t: 'damage', fl: 12, school: 'nature',
            d: 'Генератор · 12т · +18 конц.', sid: 77767,
          }),
          A({
            id: 'arcane', n: 'Чародейский выстрел', en: 'Arcane Shot', i: '💜',
            c: 25, t: 'damage', fl: 20, school: 'arcane',
            d: 'Заполнитель · 20т · 25 конц.', sid: 3044,
          }),
          A({
            id: 'black_arrow', n: 'Чёрная стрела', en: 'Black Arrow', i: '🖤',
            c: 30, cd: 3, t: 'damage', fl: 14, school: 'shadow',
            applyDot: { flat: 6, turns: 4, name: 'Чёрная стрела', icon: '🖤', id: 'black_arrow', school: 'shadow' },
            d: 'Сильный DoT · 14т + 6т×4 · 30 конц. · КД 3', sid: 3674,
          }),
          A({
            id: 'multi', n: 'Залп', en: 'Multi-Shot', i: '🏹',
            c: 35, t: 'aoe', fl: 15, school: 'physical',
            d: 'AoE · 15т · 35 конц.', sid: 2643,
          }),
          A({
            id: 'serpent', n: 'Укус змеи', en: 'Serpent Sting', i: '🐍',
            c: 20, cd: 2, t: 'damage', fl: 8, school: 'nature',
            applyDot: { flat: 5, turns: 4, name: 'Укус змеи', icon: '🐍', id: 'serpent', school: 'nature' },
            d: '8т + яд 5т×4 · 20 конц. · КД 2', sid: 1978,
          }),
          A({
            id: 'kill_shot', n: 'Убийственный выстрел', en: 'Kill Shot', i: '💀',
            c: 15, cd: 2, t: 'damage', fl: 40, fa: 1, school: 'physical',
            d: 'Добивание ≤35% · 40т · 15 конц. · без хода · КД 2', sid: 53351,
          }),
          A({
            id: 'explosive_trap', n: 'Взрывная ловушка', en: 'Explosive Trap', i: '🔥',
            c: 20, cd: 3, t: 'aoe', fl: 12, school: 'fire',
            applyDot: { flat: 4, turns: 3, name: 'Ожог ловушки', icon: '🔥', id: 'explosive_trap', school: 'fire' },
            d: 'AoE · 12т + ожог 4т×3 · 20 конц. · КД 3', sid: 13813,
          }),
          A({
            id: 'rapid', n: 'Быстрая стрельба', en: 'Rapid Fire', i: '💨',
            cd: 6, t: 'buff', fa: 1, atkMod: 0.25, bt: 3, school: 'none',
            d: '+25% атаки · 3 хода · без хода · КД 6', sid: 3045,
          }),
        ],
      },
    ],
  };

  /**
   * Требования/зависимости движка.
   * alreadyPresent: true — HTML трогать не нужно для этого пакета.
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
        where: 'castAbility case damage — ability.id === "kill_cmd" → pet atk×1.55',
        note: 'Гарантированный удар пета; иначе 35% pet assist ×0.4.',
      },
      {
        id: 'bestial_pet_buff',
        where: 'castAbility post — bestial → pets atkMod 0.3',
        note: 'Синергия BM с постоянным и временным петом.',
      },
      {
        id: 'applyDot_damage',
        where: 'case damage/aoe — ability.applyDot → periodic tick',
        note: 'Serpent / Black Arrow / Explosive / Trap используют applyDot, не type:dot.',
      },
      {
        id: 'execute_kill_shot',
        where: 'EXECUTE_IDS has kill_shot',
        note: 'canPay только при ≤35% HP цели; freeAction не тратит ход.',
      },
      {
        id: 'focus_regen_pay',
        where: 'regenResources + payAbility(cost then gen)',
        note: 'regen 14/ход; cost списывается, затем gen.',
      },
      {
        id: 'ai_focus_gen',
        where: 'aiAct: focus < 35% max → prefer gen; else max power damage/dot',
        note: 'Cobra/Steady при низком focus; сигнатуры по flat/p.',
      },
      {
        id: 'buff_atkMod',
        where: 'case buff — ability.atkMod / freeAction',
        note: 'Rapid Fire / Bestial Wrath: freeAction + atkMod + buffTurns.',
      },
    ],
    petSummonsRequired: {
      dire: [{ def: 'dire', n: 1, turns: 3 }],
    },
    petDefsRequired: ['hunter_pet', 'dire'],
    optional: [
      {
        id: 'kill_cmd_pet_mult',
        note: 'Engine pet mult 1.55 поверх flat 26 героя — суммарно сильный KC.',
        requiresHtml: false,
      },
      {
        id: 'serpent_synergy',
        note: 'В 5.4.8 Serpent почти мёртв у MM; data applyDot 5×4 — компромисс без синергий.',
        requiresHtml: false,
      },
    ],
  };

  /** Сводка cost/gen/flat для отчёта и тестов */
  const focusTable = {
    resource: HUNTER_CLASS.resource,
    flatRef: 15,
    bySpec: {
      beast_mastery: {
        generators: [
          { id: 'cobra', gen: 18, flat: 12 },
          { id: 'dire', gen: 12, flat: 16, cost: 0, cd: 2 },
        ],
        spenders: [
          { id: 'kill_cmd', cost: 35, flat: 26, cd: 1, signature: true },
          { id: 'arcane_shot', cost: 25, flat: 20 },
          { id: 'multi', cost: 35, flat: 14, aoe: true },
          { id: 'serpent', cost: 20, flat: 8, applyDot: '5×4', type: 'damage+dot' },
          { id: 'kill_shot', cost: 15, flat: 40, execute: true, freeAction: true },
        ],
        buffs: [
          { id: 'bestial', atkMod: 0.3, freeAction: true, cd: 5 },
          { id: 'rapid', atkMod: 0.25, freeAction: true, cd: 6 },
        ],
        sustainNote: 'KC(−35)+regen14 + Cobra(+18)+regen14 ≈ net +11 / 2 хода — стабильный цикл.',
      },
      marksmanship: {
        generators: [{ id: 'steady', gen: 18, flat: 11 }],
        spenders: [
          { id: 'chimera', cost: 40, flat: 28, cd: 2, signature: true },
          { id: 'aimed', cost: 45, flat: 34, signature: true },
          { id: 'arcane', cost: 25, flat: 20 },
          { id: 'multi', cost: 35, flat: 14, aoe: true },
          { id: 'barrage', cost: 30, flat: 18, hits: 2, aoe: true, cd: 3 },
          { id: 'serpent', cost: 20, flat: 8, applyDot: '5×4' },
          { id: 'kill_shot', cost: 15, flat: 40, execute: true, freeAction: true },
        ],
        buffs: [{ id: 'rapid', atkMod: 0.3, freeAction: true, cd: 6 }],
        sustainNote: 'Chimera на КД; Aimed dump 45; Steady g18 закрывает −40/−45.',
      },
      survival: {
        generators: [{ id: 'cobra', gen: 18, flat: 12 }],
        spenders: [
          { id: 'explosive', cost: 25, flat: 24, cd: 1, applyDot: '4×3', signature: true },
          { id: 'black_arrow', cost: 30, flat: 14, cd: 3, applyDot: '6×4', signature: true },
          { id: 'arcane', cost: 25, flat: 20 },
          { id: 'multi', cost: 35, flat: 15, aoe: true },
          { id: 'explosive_trap', cost: 20, flat: 12, aoe: true, applyDot: '4×3' },
          { id: 'serpent', cost: 20, flat: 8, applyDot: '5×4' },
          { id: 'kill_shot', cost: 15, flat: 40, execute: true, freeAction: true },
        ],
        buffs: [{ id: 'rapid', atkMod: 0.25, freeAction: true, cd: 6 }],
        sustainNote: 'ES 25 / fl24 — лучший p/focus; 2×ES + Cobra ≈ focus+; BA 30/3 — DoT-окно.',
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
    version: '5.4.8-lite-hunter-flat-test',
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
