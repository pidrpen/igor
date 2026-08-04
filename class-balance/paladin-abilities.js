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
    return ab;
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
      {
        id: 'holy',
        name: 'Свет',
        nameEn: 'Holy',
        role: 'healer',
        icon: '🌟',
        stats: { hp: 95, atk: 8, def: 5, speed: 10 },
        resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 4 },
        abilities: [
          A({ id: 'holy_shock', n: 'Шок небес', en: 'Holy Shock', i: '✨',
            c: 3, gs: 1, cd: 2, t: 'heal', fl: 27, critBonus: 0.2, holyShock: 1,
            applyHot: { flat: 7, turns: 5, name: 'Шок небес' },
            d: '27т хил + 7т×5 HoT · или 12т DoT по врагу · +1 ES · +20% крит', sid: 20473 }),
          A({ id: 'word_glory', n: 'Слово славы', en: 'Word of Glory', i: '💫',
            cs: 3, t: 'heal', fl: 80, d: '80т · 3 ES', sid: 85673 }),
          A({ id: 'holy_light', n: 'Свет небес', en: 'Holy Light', i: '🔆',
            c: 16, t: 'heal', fl: 45, d: '45т · 16 маны', sid: 635 }),
          A({ id: 'flash', n: 'Вспышка Света', en: 'Flash of Light', i: '⚡',
            c: 12, t: 'heal', fl: 37, d: '37т · 12 маны', sid: 19750 }),
          A({ id: 'holy_radiance', n: 'Сияние света', en: 'Holy Radiance', i: '🌅',
            c: 16, t: 'heal_aoe', fl: 21, d: '21т по группе · 16 маны', sid: 82327 }),
          A({ id: 'light_dawn', n: 'Свет зари', en: 'Light of Dawn', i: '🌄',
            cs: 2, cd: 2, t: 'heal_aoe', fl: 34, d: '34т по группе · 2 ES', sid: 85222 }),
          A({ id: 'crusader', n: 'Удар воина Света', en: 'Crusader Strike', i: '⚔️',
            c: 2, gs: 1, t: 'damage', fl: 10, school: 'holy', d: '10т · 2 маны · +1 ES', sid: 35395 }),
          A({ id: 'divine_prot', n: 'Божественная защита', en: 'Divine Protection', i: '🛡️',
            cd: 6, t: 'shield', fl: 40, fa: 1, d: 'Щит 40т · без хода', sid: 498 }),
          A({ id: 'avenging', n: 'Гнев карателя', en: 'Avenging Wrath', i: '😇',
            cd: 7, t: 'buff', fa: 1, cm: 0.3, bt: 4, d: '+30% крит · 4 хода · без хода', sid: 31884 }),
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
            c: 2, gs: 1, t: 'damage', p: 1.0, am: 0.04, armorStacksMax: 2, bt: 3, school: 'holy',
            d: '2 маны · +1 ES · броня +4% (2 стака)', sid: 35395 }),
          A({ id: 'judgment', n: 'Правосудие', en: 'Judgment', i: '⚖️',
            c: 4, gs: 1, t: 'damage', fl: 15, school: 'holy',
            vuln: { amount: 0.05, turns: 4, physical: false },
            d: '15т · 4 маны · +1 ES · +5% свет 4х', sid: 20271 }),
          A({ id: 'avengers', n: 'Щит мстителя', en: "Avenger's Shield", i: '🛡️',
            c: 5, cd: 1, t: 'aoe', fl: 13, aoeBounce: 0.05, shieldFromDmg: 0.25, school: 'holy',
            d: '13т AoE −5%/цель · щит 25% урона', sid: 31935 }),
          A({ id: 'hot_r', n: 'Молот праведника', en: 'Hammer of the Righteous', i: '🔨',
            cs: 3, t: 'damage', fl: 43, school: 'holy', d: '43т СТ · 3 ES', sid: 53595 }),
          A({ id: 'sot_r', n: 'Щит праведника', en: 'Shield of the Righteous', i: '🧱',
            cs: 3, t: 'buff', am: 0.7, bt: 2, d: '+70% брони · 2 хода · 3 ES', sid: 53600 }),
          A({ id: 'consecrate', n: 'Освящение', en: 'Consecration', i: '☀️',
            c: 5, cd: 5, t: 'aoe', fl: 0, school: 'holy',
            applyDot: { flat: 3, turns: 4, name: 'Освящение', school: 'holy' },
            d: 'DoT 3т×4 · 5 маны · КД 5', sid: 26573 }),
          A({ id: 'hot_w', n: 'Молот гнева', en: 'Hammer of Wrath', i: '⚡',
            c: 6, gs: 1, t: 'damage', p: 1.4, school: 'holy', d: '+1 ES · ≤35% HP', sid: 24275 }),
          A({ id: 'ardent', n: 'Ревностный защитник', en: 'Ardent Defender', i: '❤️',
            cd: 6, t: 'buff', fa: 1, dr: 0.6, bt: 3, d: '−60% весь урон · 3 хода · без хода', sid: 31850 }),
          A({ id: 'taunt', n: 'Длань расплаты', en: 'Hand of Reckoning', i: '📢',
            cd: 2, t: 'taunt', p: 0, fa: 1, d: 'Агро · без хода', sid: 62124 }),
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
            c: 5, gs: 1, t: 'damage', p: 1.1, school: 'holy', d: '+1 ES · 5 маны', sid: 35395 }),
          A({ id: 'judgment', n: 'Правосудие', en: 'Judgment', i: '⚖️',
            c: 6, gs: 1, cd: 1, t: 'damage', fl: 23, school: 'holy', d: '23т · +1 ES', sid: 20271 }),
          A({ id: 'templar', n: 'Вердикт храмовника', en: "Templar's Verdict", i: '⚖️',
            cs: 3, t: 'damage', fl: 38, school: 'holy', d: '38т · 3 ES', sid: 85256 }),
          A({ id: 'divine_storm', n: 'Божественная буря', en: 'Divine Storm', i: '🌪️',
            cs: 3, t: 'aoe', fl: 19, school: 'holy', d: '19т AoE · 3 ES', sid: 53385 }),
          A({ id: 'hot_w', n: 'Молот гнева', en: 'Hammer of Wrath', i: '⚡',
            c: 6, gs: 1, t: 'damage', p: 1.45, school: 'holy', d: '+1 ES · ≤35% HP', sid: 24275 }),
          A({ id: 'inquisition', n: 'Инквизиция', en: 'Inquisition', i: '📜',
            cd: 4, t: 'buff', fa: 1, atkMod: 0.15, bt: 2, d: '+15% ATK · 2 хода · без хода', sid: 84963 }),
          A({ id: 'avenging', n: 'Гнев карателя', en: 'Avenging Wrath', i: '😇',
            cd: 5, t: 'buff', fa: 1, cm: 0.3, bt: 3, d: '+30% крит · 3 хода · без хода', sid: 31884 }),
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
})(typeof window !== 'undefined' ? window : globalThis);
