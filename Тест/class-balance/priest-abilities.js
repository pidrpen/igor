/**
 * Mythic Key MoP 5.4.8 lite — Priest (Discipline / Holy / Shadow)
 *
 * Ресурс: mana (primary, regen 7). Shadow secondary: shadow_orbs (max 3).
 * Disc: shields + atonement-style (Smite/Holy Fire lifesteal) + Penance ST.
 * Holy: PoH / Renew HoT / Holy Word: Serenity + Circle identity.
 * Shadow: Mind Blast / SW:P / VT / Mind Flay + orbs → Devouring.
 *
 * Flat scale: atk 15 = FLAT_REF → вес Nт ≈ Nт хила/урона в бою.
 * Schools: holy (Disc/Holy), shadow (Shadow).
 *
 * Drop-in: PRIEST_BALANCE.apply(classes) via apply-all.js.
 * Не править mythic-key.html / combat engine из этого файла.
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
    if (o.maxCharges != null) ab.maxCharges = o.maxCharges;
    if (o.ch != null) ab.maxCharges = o.ch;
    if (o.dmgReduce != null) ab.dmgReduce = o.dmgReduce;
    if (o.dr != null) ab.dmgReduce = o.dr;
    if (o.critBonus != null) ab.critBonus = o.critBonus;
    if (o.critMod != null) ab.critMod = o.critMod;
    if (o.cm != null) ab.critMod = o.cm;
    if (o.atkMod != null) ab.atkMod = o.atkMod;
    if (o.maxHpPct != null) ab.maxHpPct = o.maxHpPct;
    if (o.hpPct != null) ab.maxHpPct = o.hpPct;
    if (o.buffTurns != null) ab.buffTurns = o.buffTurns;
    if (o.bt != null) ab.buffTurns = o.bt;
    if (o.lifesteal != null) ab.lifesteal = o.lifesteal;
    if (o.abilityCharges != null) ab.abilityCharges = o.abilityCharges;
    if (o.ccMode) ab.ccMode = o.ccMode;
    if (o.partyShield || o.ps) ab.partyShield = true;
    return ab;
  }

  /**
   * Честные упрощения / optional engine work.
   * Orbs — data-only (secondaryOverride + gs/cs).
   */
  const ENGINE_NEEDS = {
    shadow_orbs: {
      status: 'implemented_data_only',
      secondaryOverride: {
        type: 'shadow_orbs',
        name: 'Сферы тьмы',
        icon: '🔮',
        max: 3,
        start: 0,
      },
      gen: ['mind_blast gs:1', 'swd gs:1'],
      spend: ['devouring cs:3'],
      note:
        'resolveResources + genSec/costSec. DP всегда 3 орба (нет scale 1–3).',
    },
    execute: {
      id: 'swd',
      status: 'engine_already',
      note: 'swd уже в EXECUTE_IDS (≤35% HP).',
    },
    hot_dot_hooks: {
      renew: 'applyHot flat ticks (не legacy HOT_SPELLS split при flat)',
      devouring: 'type:dot flat tick',
      holy_fire_swp_vt: 'applyDot / type:dot',
      shadowfiend: 'PET_SUMMONS.shadowfiend',
    },
    atonement: {
      status: 'engine',
      note:
        'Бафф «Искупление». Слово силы: Щит — 5р. Щит небес — 5р всем. Молитва исцеления — 3р на поражённых. Кара / Священный огонь / Исповедь во врага / Исчадие ада лечат носителей 55%, не кастера.',
    },
    hellfiend: {
      status: 'engine',
      note: 'PET_SUMMONS.hellfiend · 5 ходов · 28т · последняя цель хозяина или случайная.',
    },
    skipped: [
      {
        id: 'evangelism_stacks',
        severity: 'skip',
        note: 'Нет стаков евангелия. Archangel = free buff +ATK.',
      },
      {
        id: 'guardian_spirit_anti_death',
        severity: 'simplified',
        note: 'Вместо anti-death: type shield flat freeAction.',
      },
      {
        id: 'vt_passive_mana_from_damage',
        severity: 'simplified',
        note: 'Вместо пассива с тиков: gen:2 на касте VT.',
      },
      {
        id: 'mind_sear_aoe',
        severity: 'data',
        note: 'Пронзание разума — область 14т, 8 маны.',
      },
      {
        id: 'penance_dual_channel',
        severity: 'skip',
        note: 'Penance = один heal-hit, не dual/channel.',
      },
    ],
  };

  const PRIEST_CLASS = {
    id: 'priest',
    name: 'Жрец',
    nameEn: 'Priest',
    icon: '🙏',
    color: '#FFFFFF',
    resource: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 7 },
    secondary: null,
    engineNeeds: ENGINE_NEEDS,
    specs: [
      // ═══════════════════════════════════════
      // DISCIPLINE — shields + atonement dps-heal
      // atk 15 = FLAT_REF
      // ═══════════════════════════════════════
      {
        id: 'discipline',
        name: 'Послушание',
        nameEn: 'Discipline',
        role: 'healer',
        icon: '📖',
        testBuild: true,
        stats: { hp: 95, atk: 15, def: 4, speed: 10 },
        resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 7 },
        abilities: [
          A({ id: 'penance', n: 'Исповедь', en: 'Penance', i: '📿',
            c: 10, cd: 3, t: 'heal', fl: 26, school: 'holy',
            d: 'Союзник или враг · 26т · КД 3 · кормит Искупление', sid: 47540 }),
          A({ id: 'shield', n: 'Слово силы: Щит', en: 'Power Word: Shield', i: '🛡️',
            c: 9, cd: 3, t: 'shield', fl: 50, school: 'holy',
            d: 'Щит 50т · КД 3 · Искупление 5р', sid: 17 }),
          A({ id: 'flash', n: 'Быстрое исцеление', en: 'Flash Heal', i: '💚',
            c: 12, t: 'heal', fl: 28, school: 'holy',
            d: 'СТ · 28т · авария', sid: 2061 }),
          A({ id: 'greater', n: 'Великое исцеление', en: 'Greater Heal', i: '💚',
            c: 15, t: 'heal', fl: 38, school: 'holy',
            d: 'СТ · 38т · throughput', sid: 2060 }),
          A({ id: 'prayer', n: 'Молитва исцеления', en: 'Prayer of Healing', i: '🙏',
            c: 13, cd: 6, t: 'heal_aoe', fl: 18, school: 'holy',
            d: 'АОЕ · 18т · КД 6 · Искупление 3р на поражённых', sid: 596 }),
          A({ id: 'smite', n: 'Кара', en: 'Smite', i: '✨',
            c: 5, t: 'damage', fl: 16, school: 'holy',
            d: '16т · кормит Искупление 55% носителям', sid: 585 }),
          A({ id: 'holy_fire', n: 'Священный огонь', en: 'Holy Fire', i: '🔥',
            c: 7, cd: 2, t: 'damage', fl: 10, school: 'holy',
            applyDot: { flat: 4, turns: 4, name: 'Священный огонь', icon: '🔥', id: 'holy_fire', school: 'holy' },
            d: '10т + 4т×4 · кормит Искупление носителям', sid: 14914 }),
          A({ id: 'hellfiend', n: 'Исчадие ада', en: 'Fiend of Hell', i: '👿',
            c: 14, cd: 9, t: 'summon', fl: 28, fa: 1, school: 'shadow',
            d: 'Пет 28т · 5 ходов · без хода · 14 маны · КД 9 · урон кормит Искупление', sid: 34433 }),
          A({ id: 'heaven_shield', n: 'Щит небес', en: 'Heavenly Shield', i: '🌤️',
            c: 30, cd: 10, t: 'shield', fl: 40, ps: 1, school: 'holy',
            d: '30 маны · КД 10 · щит 40т всем + Искупление 5р', sid: 81781 }),
          A({ id: 'pain_supp', n: 'Подавление боли', en: 'Pain Suppression', i: '🩹',
            cd: 6, t: 'buff', fa: 1, dr: 0.4, bt: 2, school: 'none',
            d: 'Сейв по клику · −40% урон · 2 хода · без хода', sid: 33206 }),
          A({ id: 'archangel', n: 'Архангел', en: 'Archangel', i: '😇',
            cd: 4, t: 'buff', fa: 1, atkMod: 0.2, bt: 3, school: 'none',
            d: '+20% ATK · 3 хода · без хода', sid: 81700 }),
        ],
      },

      // ═══════════════════════════════════════
      // HOLY — PoH / Renew / Serenity + CoH
      // ═══════════════════════════════════════
      {
        id: 'holy',
        name: 'Свет',
        nameEn: 'Holy',
        role: 'healer',
        icon: '✝️',
        testBuild: true,
        stats: { hp: 95, atk: 15, def: 4, speed: 10 },
        resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 7 },
        abilities: [
          A({ id: 'heal', n: 'Исцеление', en: 'Heal', i: '💚',
            c: 8, t: 'heal', fl: 26, school: 'holy',
            d: 'СТ · 26т · filler', sid: 2050 }),
          A({ id: 'flash', n: 'Быстрое исцеление', en: 'Flash Heal', i: '💚',
            c: 12, t: 'heal', fl: 32, school: 'holy',
            d: 'СТ · 32т · авария', sid: 2061 }),
          A({ id: 'renew', n: 'Обновление', en: 'Renew', i: '🌿',
            c: 6, t: 'heal', fl: 10, school: 'holy',
            applyHot: { flat: 5, turns: 5, name: 'Обновление', icon: '🌿', id: 'renew' },
            d: 'СТ · 10т + HoT 5т×5', sid: 139 }),
          A({ id: 'circle', n: 'Круг исцеления', en: 'Circle of Healing', i: '⭕',
            c: 10, cd: 2, t: 'heal_aoe', fl: 22, school: 'holy',
            d: 'АОЕ · 22т · КД 2 · identity', sid: 34861 }),
          A({ id: 'poh', n: 'Молитва исцеления', en: 'Prayer of Healing', i: '🙏',
            c: 14, t: 'heal_aoe', fl: 18, school: 'holy',
            d: 'АОЕ · 18т · без КД', sid: 596 }),
          A({ id: 'holy_word', n: 'Слово Света: Безмятежность', en: 'Holy Word: Serenity', i: '🕊️',
            c: 8, cd: 2, t: 'heal', fl: 42, school: 'holy',
            d: 'СТ · 42т · КД 2 · spike', sid: 88684 }),
          A({ id: 'gh', n: 'Великое исцеление', en: 'Greater Heal', i: '💚',
            c: 15, t: 'heal', fl: 36, school: 'holy',
            d: 'СТ · 36т · throughput', sid: 2060 }),
          A({ id: 'smite', n: 'Кара', en: 'Smite', i: '✨',
            c: 5, t: 'damage', fl: 12, school: 'holy',
            d: '12т · заполнитель', sid: 585 }),
          A({ id: 'guardian', n: 'Дух-хранитель', en: 'Guardian Spirit', i: '👻',
            cd: 6, t: 'shield', fl: 45, fa: 1, school: 'holy',
            d: 'Щит 45т · без хода · упрощ. anti-death', sid: 47788 }),
        ],
      },

      // ═══════════════════════════════════════
      // SHADOW — multi-DoT + orbs → Devouring
      // ═══════════════════════════════════════
      {
        id: 'shadow',
        name: 'Тьма',
        nameEn: 'Shadow',
        role: 'dps',
        icon: '🌑',
        testBuild: true,
        stats: { hp: 90, atk: 15, def: 2, speed: 11 },
        resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 7 },
        secondaryOverride: {
          type: 'shadow_orbs',
          name: 'Сферы тьмы',
          icon: '🔮',
          max: 3,
          start: 0,
        },
        abilities: [
          A({ id: 'mind_blast', n: 'Взрыв разума', en: 'Mind Blast', i: '🧠',
            c: 8, cd: 2, gs: 1, t: 'damage', fl: 30, school: 'shadow',
            d: '30т · +1 сфера · КД 2', sid: 8092 }),
          A({ id: 'swp', n: 'Слово Тьмы: Боль', en: 'Shadow Word: Pain', i: '😣',
            c: 5, cd: 2, t: 'dot', fl: 5, school: 'shadow',
            applyDot: { turns: 4, name: 'Слово Тьмы: Боль', icon: '😣', id: 'swp', school: 'shadow' },
            d: '5т/р · 4 раунда · держать', sid: 589 }),
          A({ id: 'vt', n: 'Прикосновение вампира', en: 'Vampiric Touch', i: '🦇',
            c: 6, cd: 2, g: 2, t: 'dot', fl: 7, school: 'shadow',
            applyDot: { turns: 5, name: 'Прикосновение вампира', icon: '🦇', id: 'vt', school: 'shadow' },
            d: '7т/р · 5 раундов · +2 маны', sid: 34914 }),
          A({ id: 'mind_flay', n: 'Пытка разума', en: 'Mind Flay', i: '🌀',
            c: 5, t: 'damage', fl: 20, school: 'shadow',
            d: '20т · filler (≤ regen)', sid: 15407 }),
          A({ id: 'mind_sear', n: 'Пронзание разума', en: 'Mind Sear', i: '📡',
            c: 8, t: 'aoe', fl: 14, school: 'shadow',
            d: '14т область · 8 маны', sid: 48045 }),
          A({ id: 'devouring', n: 'Всепожирающая чума', en: 'Devouring Plague', i: '🦠',
            c: 6, cd: 2, cs: 3, t: 'dot', fl: 10, school: 'shadow',
            applyDot: { turns: 3, name: 'Всепожирающая чума', icon: '🦠', id: 'devouring', school: 'shadow' },
            d: '10т/р · 3 раунда · 3 сферы · КД 2', sid: 2944 }),
          A({ id: 'swd', n: 'Слово Тьмы: Смерть', en: 'Shadow Word: Death', i: '💀',
            c: 7, cd: 2, gs: 1, t: 'damage', fl: 34, school: 'shadow',
            d: '34т · ≤35% HP · +1 сфера', sid: 32379 }),
          A({ id: 'mind_spike', n: 'Шип разума', en: 'Mind Spike', i: '📌',
            c: 7, cd: 3, t: 'cc', ccMode: 'silence', bt: 1, school: 'shadow',
            d: 'Тишина · сбивает каст · КД 3', sid: 73510 }),
          A({ id: 'shadowfiend', n: 'Исчадие Тьмы', en: 'Shadowfiend', i: '👾',
            cd: 4, t: 'damage', fl: 18, school: 'shadow',
            d: '18т + исчадие 4р', sid: 34433 }),
          A({ id: 'dispersion', n: 'Слияние с Тьмой', en: 'Dispersion', i: '🌫️',
            cd: 6, t: 'shield', fl: 40, fa: 1, school: 'shadow',
            d: 'Щит 40т · без хода', sid: 47585 }),
        ],
      },
    ],
  };

  function apply(WOW_MOP) {
    if (!WOW_MOP || !Array.isArray(WOW_MOP.classes)) return false;
    const idx = WOW_MOP.classes.findIndex((c) => c.id === 'priest');
    if (idx < 0) return false;
    const clone = JSON.parse(JSON.stringify(PRIEST_CLASS));
    delete clone.engineNeeds;
    WOW_MOP.classes[idx] = clone;
    return true;
  }

  function applyToWowClass(wowClass) {
    if (!wowClass || wowClass.id !== 'priest') {
      throw new Error('applyToWowClass: expected class id "priest"');
    }
    const clone = JSON.parse(JSON.stringify(PRIEST_CLASS));
    delete clone.engineNeeds;
    Object.keys(clone).forEach((k) => {
      wowClass[k] = clone[k];
    });
    return wowClass;
  }

  function applyPriestBalance(classes) {
    if (typeof apply === 'function' && global.WOW_MOP && classes === global.WOW_MOP) {
      return apply(global.WOW_MOP);
    }
    if (!Array.isArray(classes)) return false;
    const i = classes.findIndex((c) => c.id === 'priest');
    const clone = JSON.parse(JSON.stringify(PRIEST_CLASS));
    delete clone.engineNeeds;
    if (i >= 0) classes[i] = clone;
    else classes.push(clone);
    return true;
  }

  const PRIEST_BALANCE = {
    version: '5.4.8-priest-s13',
    A,
    classId: 'priest',
    class: PRIEST_CLASS,
    specs: PRIEST_CLASS.specs,
    resource: PRIEST_CLASS.resource,
    secondary: PRIEST_CLASS.secondary,
    engineNeeds: ENGINE_NEEDS,
    apply,
    applyToWowClass,
    applyClasses: applyPriestBalance,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PRIEST_BALANCE;
  }
  global.PRIEST_BALANCE = PRIEST_BALANCE;
  global.PRIEST_CLASS = PRIEST_CLASS;
  PRIEST_BALANCE.applyClasses = applyPriestBalance;
  // Prefer classes-array contract for apply-all
  PRIEST_BALANCE.apply = applyPriestBalance;

  global.CLASS_BALANCE_PACKS = global.CLASS_BALANCE_PACKS || [];
  global.CLASS_BALANCE_PACKS.push({ id: 'priest', apply: applyPriestBalance });
})(typeof window !== 'undefined' ? window : globalThis);
