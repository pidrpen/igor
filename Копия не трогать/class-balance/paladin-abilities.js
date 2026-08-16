/**
 * Mythic Key — Paladin (Holy / Protection / Retribution)
 * Ребаланс из таблицы (блок/хилы/flat «т»). Подключается через apply-all.js.
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
    if (o.blockChanceAdd != null) ab.blockChanceAdd = o.blockChanceAdd;
    if (o.blockValueAdd != null) ab.blockValueAdd = o.blockValueAdd;
    if (o.armorMod != null) ab.armorMod = o.armorMod;
    if (o.am != null) ab.armorMod = o.am;
    if (o.armorStacksMax != null) ab.armorStacksMax = o.armorStacksMax;
    if (o.critBonus != null) ab.critBonus = o.critBonus;
    if (o.critMod != null) ab.critMod = o.critMod;
    if (o.cm != null) ab.critMod = o.cm;
    if (o.atkMod != null) ab.atkMod = o.atkMod;
    if (o.maxHpPct != null) ab.maxHpPct = o.maxHpPct;
    if (o.hpPct != null) ab.maxHpPct = o.hpPct;
    if (o.buffTurns != null) ab.buffTurns = o.buffTurns;
    if (o.bt != null) ab.buffTurns = o.bt;
    if (o.aoeBounce != null) ab.aoeBounce = o.aoeBounce;
    if (o.shieldFromDmg != null) ab.shieldFromDmg = o.shieldFromDmg;
    if (o.enemyDmgMod != null) ab.enemyDmgMod = o.enemyDmgMod;
    if (o.grantBlock) ab.grantBlock = true;
    if (o.holyShock) ab.holyShock = o.holyShock;
    if (o.interruptPrimary != null) ab.interruptPrimary = o.interruptPrimary;
    if (o.interruptAoeChance != null) ab.interruptAoeChance = o.interruptAoeChance;
    if (o.judgmentConsecrateSplash != null) ab.judgmentConsecrateSplash = o.judgmentConsecrateSplash;
    if (o.splashFlat != null) ab.splashFlat = o.splashFlat;
    return ab;
  }

  const PALADIN_CLASS = {
    id: 'paladin',
    name: 'Паладин',
    nameEn: 'Paladin',
    icon: '✝️',
    color: '#F58CBA',
    resource: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 6 },
    secondary: { type: 'holy_power', name: 'Энергия Света', icon: '☀️', max: 5, start: 3 },
    specs: [
      {
        id: 'holy',
        name: 'Свет',
        nameEn: 'Holy',
        role: 'healer',
        icon: '🌟',
        // atk 15 = FLAT_REF: вес Nт → ~Nт хила/урона в бою (fmt: 35000 → «35т»)
        stats: { hp: 95, atk: 15, def: 5, speed: 10 },
        resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 4 },
        abilities: [
          // 5.4.8.14: Сияние 18 · Свет небес 35 · Вспышка 27 · Слово 80 · Заря 30 · Шок 27
          A({ id: 'holy_shock', n: 'Шок небес', en: 'Holy Shock', i: '✨',
            c: 3, gs: 1, cd: 2, t: 'heal', flat: 27, fl: 27, critBonus: 0.2, holyShock: 1, school: 'holy',
            applyHot: { flat: 7, turns: 5, name: 'Шок небес' },
            d: 'СТ · 27т · хил союзника или урон врагу · +1 ES', sid: 20473 }),
          A({ id: 'holy_light', n: 'Свет небес', en: 'Holy Light', i: '🔆',
            c: 16, t: 'heal', flat: 35, fl: 35, school: 'holy', d: 'СТ · 35т', sid: 635 }),
          A({ id: 'flash', n: 'Вспышка Света', en: 'Flash of Light', i: '⚡',
            c: 12, t: 'heal', flat: 27, fl: 27, school: 'holy', d: 'СТ · 27т', sid: 19750 }),
          A({ id: 'holy_radiance', n: 'Сияние света', en: 'Holy Radiance', i: '🌅',
            c: 16, t: 'heal_aoe', flat: 18, fl: 18, school: 'holy', d: 'АОЕ · 18т', sid: 82327 }),
          // Слово славы — перед Светом зари
          A({ id: 'word_glory', n: 'Слово славы', en: 'Word of Glory', i: '💫',
            cs: 3, t: 'heal', flat: 80, fl: 80, school: 'holy', d: 'СТ · 80т · 3 ES', sid: 85673 }),
          A({ id: 'light_dawn', n: 'Свет зари', en: 'Light of Dawn', i: '🌄',
            cs: 2, cd: 2, t: 'heal_aoe', flat: 30, fl: 30, school: 'holy', d: 'АОЕ · 30т · 2 ES', sid: 85222 }),
          A({ id: 'crusader', n: 'Удар воина Света', en: 'Crusader Strike', i: '⚔️',
            c: 2, gs: 1, t: 'damage', flat: 10, fl: 10, school: 'holy', d: '10т · +1 ES', sid: 35395 }),
          A({ id: 'divine_prot', n: 'Божественная защита', en: 'Divine Protection', i: '🛡️',
            cd: 6, t: 'shield', flat: 40, fl: 40, fa: 1, school: 'holy', d: 'Щит 40т · без хода', sid: 498 }),
          A({ id: 'avenging', n: 'Гнев карателя', en: 'Avenging Wrath', i: '😇',
            cd: 7, t: 'buff', fa: 1, cm: 0.3, bt: 4, school: 'none', d: '+30% крит · 4 хода · без хода', sid: 31884 }),
        ],
      },
      {
        id: 'protection',
        name: 'Защита',
        nameEn: 'Protection',
        role: 'tank',
        icon: '🛡️',
        stats: { hp: 168, atk: 12, def: 12, speed: 8 },
        resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 10 },
        abilities: [
          A({ id: 'crusader', n: 'Удар воина Света', en: 'Crusader Strike', i: '⚔️',
            c: 2, gs: 1, t: 'damage', fl: 18, am: 0.04, armorStacksMax: 2, bt: 3, school: 'holy',
            d: '', sid: 35395 }),
          A({ id: 'judgment', n: 'Правосудие', en: 'Judgment', i: '⚖️',
            c: 4, gs: 1, t: 'damage', fl: 15, school: 'holy',
            vuln: { amount: 0.05, turns: 4, physical: false },
            // 60% урона Правосудия по целям с дебаффом «Освящение» (скейл от атаки)
            judgmentConsecrateSplash: 0.6,
            d: '15т · +60% по целям под Освящением', sid: 20271 }),
          A({ id: 'avengers', n: 'Щит мстителя', en: "Avenger's Shield", i: '🛡️',
            c: 5, cd: 2, t: 'aoe', fl: 25, aoeBounce: 0.05, shieldFromDmg: 0.25, school: 'holy',
            interruptPrimary: 1, interruptAoeChance: 0.23,
            d: '25т AoE · сбивает каст основной цели · 23% — у остальных · щит 25% урона · КД 2', sid: 31935 }),
          A({ id: 'hot_r', n: 'Молот праведника', en: 'Hammer of the Righteous', i: '🔨',
            cs: 3, t: 'damage', fl: 43, school: 'holy', d: '', sid: 53595 }),
          A({ id: 'sot_r', n: 'Щит праведника', en: 'Shield of the Righteous', i: '🧱',
            cs: 3, t: 'damage', flat: 80, fl: 80, splashFlat: 30, school: 'holy',
            d: '80т основной · 30т остальным · Щит света +10% брони 4х макс.2 · 3 ES', sid: 53600 }),
          A({ id: 'consecrate', n: 'Освящение', en: 'Consecration', i: '☀️',
            c: 5, cd: 5, t: 'aoe', fl: 0, school: 'holy',
            applyDot: { flat: 3, turns: 4, name: 'Освящение', school: 'holy' },
            d: '', sid: 26573 }),
          A({ id: 'hot_w', n: 'Молот гнева', en: 'Hammer of Wrath', i: '⚡',
            c: 6, gs: 1, t: 'damage', p: 1.4, school: 'holy', fa: 1,
            d: 'Только при ≤35% HP цели · не тратит ход · +1 ES', sid: 24275 }),
          A({ id: 'ardent', n: 'Ревностный защитник', en: 'Ardent Defender', i: '❤️',
            cd: 6, t: 'buff', fa: 1, dr: 0.6, bt: 3, d: '', sid: 31850 }),
          A({ id: 'taunt', n: 'Длань расплаты', en: 'Hand of Reckoning', i: '📢',
            cd: 2, t: 'taunt', p: 0, fa: 1, d: '', sid: 62124 }),
        ],
      },
      {
        id: 'retribution',
        name: 'Воздаяние',
        nameEn: 'Retribution',
        role: 'dps',
        icon: '🔨',
        stats: { hp: 105, atk: 17, def: 5, speed: 11 },
        resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 10 },
        abilities: [
          A({ id: 'crusader', n: 'Удар воина Света', en: 'Crusader Strike', i: '⚔️',
            c: 5, gs: 1, t: 'damage', p: 1.1, school: 'holy', d: '', sid: 35395 }),
          A({ id: 'judgment', n: 'Правосудие', en: 'Judgment', i: '⚖️',
            c: 6, gs: 1, cd: 1, t: 'damage', fl: 23, school: 'holy', d: '', sid: 20271 }),
          A({ id: 'templar', n: 'Вердикт храмовника', en: "Templar's Verdict", i: '⚖️',
            cs: 3, t: 'damage', fl: 38, school: 'holy', d: '', sid: 85256 }),
          A({ id: 'divine_storm', n: 'Божественная буря', en: 'Divine Storm', i: '🌪️',
            cs: 4, t: 'aoe', fl: 40, school: 'holy', d: '', sid: 53385 }),
          A({ id: 'hot_w', n: 'Молот гнева', en: 'Hammer of Wrath', i: '⚡',
            c: 6, gs: 1, t: 'damage', p: 1.45, school: 'holy', fa: 1,
            d: 'Только при ≤35% HP цели · не тратит ход · +1 ES', sid: 24275 }),
          A({ id: 'inquisition', n: 'Инквизиция', en: 'Inquisition', i: '📜',
            cd: 4, t: 'buff', fa: 1, atkMod: 0.15, bt: 2, d: '', sid: 84963 }),
          A({ id: 'avenging', n: 'Гнев карателя', en: 'Avenging Wrath', i: '😇',
            cd: 5, t: 'buff', fa: 1, cm: 0.3, bt: 3, d: '', sid: 31884 }),
        ],
      },
    ],
  };

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
  function applyPaladinBalance(classes) {
    if (!Array.isArray(classes) || !PALADIN_CLASS) return false;
    const i = classes.findIndex((c) => c.id === 'paladin');
    const clone = JSON.parse(JSON.stringify(PALADIN_CLASS));
    if (i >= 0) classes[i] = clone; else classes.push(clone);
    return true;
  }
  api.apply = applyPaladinBalance;
  global.CLASS_BALANCE_PACKS = global.CLASS_BALANCE_PACKS || [];
  global.CLASS_BALANCE_PACKS.push({ id: 'paladin', apply: applyPaladinBalance });

})(typeof window !== 'undefined' ? window : globalThis);
