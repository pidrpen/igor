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
    if (o.maxHpPct != null) ab.maxHpPct = o.maxHpPct;
    if (o.hpPct != null) ab.maxHpPct = o.hpPct;
    if (o.buffTurns != null) ab.buffTurns = o.buffTurns;
    if (o.bt != null) ab.buffTurns = o.bt;
    if (o.aoeBounce != null) ab.aoeBounce = o.aoeBounce;
    if (o.shieldFromDmg != null) ab.shieldFromDmg = o.shieldFromDmg;
    if (o.enemyDmgMod != null) ab.enemyDmgMod = o.enemyDmgMod;
    if (o.grantBlock) ab.grantBlock = true;
    if (o.holyShock) ab.holyShock = o.holyShock;
    if (o.grantSelfBuff) ab.grantSelfBuff = o.grantSelfBuff;
    return ab;
  }

  /** @type {Array<{id:string,name:string,nameEn:string,role:string,icon:string,stats:object,abilities:object[]}>} */
  const WARRIOR_SPECS = [
    // ─── Arms ───────────────────────────────────────────────
    {
      id: 'arms', name: 'Оружие', nameEn: 'Arms', role: 'dps', icon: '🗡️',
      stats: { hp: 110, atk: 17, def: 5, speed: 10 },
      // d: '' — без текстового описания; UI сам пишет урон (a-cost) и метки (a-meta)
      // Кровотечение: ms / colossus / heroic — 4 хода (пассивка «Кровотечение»)
      // Вихрь перед Превосходством: КД 9 → 1 стак «Широкий размах» → Героический 40% по остальным
      abilities: [
        A({ id: 'ms', n: 'Смертельный удар', en: 'Mortal Strike', i: '⚔️',
          g: 20, cd: 2, t: 'damage', p: 1, flat: 15, school: 'physical',
          applyDot: { flat: 5, turns: 4, name: 'Кровотечение', icon: '🩸', id: 'bleed', school: 'physical' },
          d: '', sid: 12294 }),
        A({ id: 'whirlwind', n: 'Вихрь', en: 'Whirlwind', i: '🌪️',
          c: 20, cd: 9, t: 'aoe', p: 1, flat: 9, hits: 2, school: 'physical',
          grantSelfBuff: {
            id: 'wide_sweep', name: 'Широкий размах', icon: '🌀',
            turns: 99, stacks: 1,
            tip: 'Героический удар дублируется на остальных (40%)',
          },
          d: '', sid: 1680 }),
        A({ id: 'overpower', n: 'Превосходство', en: 'Overpower', i: '💥',
          g: 15, t: 'damage', p: 1, flat: 12, cleaveFlat: 4, school: 'physical', d: '', sid: 7384 }),
        A({ id: 'colossus', n: 'Удар колосса', en: 'Colossus Smash', i: '🔨',
          cd: 3, t: 'damage', p: 1, flat: 21, school: 'physical',
          vuln: { amount: 0.2, turns: 3, physical: true },
          applyDot: { flat: 5, turns: 4, name: 'Кровотечение', icon: '🩸', id: 'bleed', school: 'physical' },
          d: '', sid: 86346 }),
        A({ id: 'slam', n: 'Мощный удар', en: 'Slam', i: '👊',
          c: 20, t: 'damage', p: 1, flat: 30, school: 'physical', d: '', sid: 1464 }),
        A({ id: 'execute', n: 'Казнь', en: 'Execute', i: '☠️',
          c: 40, t: 'damage', p: 1, flat: 40, school: 'physical', d: '', sid: 5308 }),
        A({ id: 'heroic', n: 'Героический удар', en: 'Heroic Strike', i: '🗡️',
          c: 35, t: 'damage', p: 1, flat: 20, school: 'physical',
          applyDot: { flat: 5, turns: 4, name: 'Кровотечение', icon: '🩸', id: 'bleed', school: 'physical' },
          d: '', sid: 78 }),
        A({ id: 'charge', n: 'Рывок', en: 'Charge', i: '🏃',
          g: 10, cd: 4, t: 'damage', p: 1, flat: 3, freeAction: true, school: 'physical', d: '', sid: 100 }),
        A({ id: 'reck', n: 'Безрассудство', en: 'Recklessness', i: '🔥',
          cd: 7, t: 'buff', p: 0.35, abilityCharges: 2, freeAction: true, school: 'none',
          d: '+35% атаки на следующие 2 удара · не тратит ход', sid: 1719 }),
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
          c: 15, t: 'damage', p: 1, flat: 18, hits: 2, school: 'physical', d: '', sid: 85288 }),
        A({ id: 'whirlwind', n: 'Вихрь', en: 'Whirlwind', i: '🌪️',
          c: 20, t: 'aoe', p: 1, flat: 12, school: 'physical', d: '', sid: 1680 }),
        A({ id: 'execute', n: 'Казнь', en: 'Execute', i: '☠️',
          c: 30, t: 'damage', p: 1, flat: 32, school: 'physical', d: '', sid: 5308 }),
        A({ id: 'berserker', n: 'Ярость берсерка', en: 'Berserker Rage', i: '😡',
          g: 15, cd: 5, t: 'buff', p: 0.2, freeAction: true, school: 'none', d: '', sid: 18499 }),
        A({ id: 'charge', n: 'Рывок', en: 'Charge', i: '🏃',
          g: 10, cd: 4, t: 'damage', p: 1, flat: 3, freeAction: true, school: 'physical', d: '', sid: 100 }),
        A({ id: 'reck', n: 'Безрассудство', en: 'Recklessness', i: '🔥',
          cd: 7, t: 'buff', p: 0.35, abilityCharges: 2, freeAction: true, school: 'none',
          d: '+35% атаки на следующие 2 удара · не тратит ход', sid: 1719 }),
      ],
    },

    // ─── Protection (ребаланс: блок/парир + free Revenge) ──
    {
      id: 'protection', name: 'Защита', nameEn: 'Protection', role: 'tank', icon: '🛡️',
      stats: { hp: 170, atk: 12, def: 12, speed: 8 },
      abilities: [
        A({ id: 'shield_slam', n: 'Удар щитом', en: 'Shield Slam', i: '🛡️',
          g: 30, t: 'damage', fl: 18, school: 'physical', d: '', sid: 23922 }),
        A({ id: 'revenge', n: 'Реванш', en: 'Revenge', i: '↩️',
          c: 15, cd: 2, t: 'aoe', fl: 17, school: 'physical', d: '17т AoE · 15 ярости · авто только при парировании (не с блока)', sid: 6572 }),
        A({ id: 'thunder', n: 'Удар грома', en: 'Thunder Clap', i: '⛈️',
          g: 10, cd: 2, t: 'aoe', fl: 20, fa: 1, school: 'physical', d: '', sid: 6343 }),
        A({ id: 'shield_block', n: 'Блок щитом', en: 'Shield Block', i: '🧱',
          c: 10, cd: 5, t: 'buff', fa: 1, ch: 2, blockChanceAdd: 0.5, blockValueAdd: 0.2, bt: 2,
          d: '2 заряда · каждый заряд отдельно +1 за 5 ходов · +50% блок / +20% сила · 2 хода · без хода', sid: 2565 }),
        A({ id: 'shield_wall', n: 'Глухая оборона', en: 'Shield Wall', i: '🏰',
          cd: 12, t: 'buff', fa: 1, dr: 0.6, bt: 2, d: '', sid: 871 }),
        A({ id: 'last_stand', n: 'Ни шагу назад', en: 'Last Stand', i: '❤️',
          cd: 7, t: 'buff', hpPct: 0.5, bt: 3, grantBlock: 1, d: '', sid: 12975 }),
        A({ id: 'taunt', n: 'Провокация', en: 'Taunt', i: '📢',
          cd: 2, t: 'taunt', p: 0, fa: 1, d: '', sid: 355 }),
        A({ id: 'demo_shout', n: 'Деморализующий крик', en: 'Demoralizing Shout', i: '😨',
          c: 40, cd: 3, t: 'debuff', enemyDmgMod: 0.15, bt: 3, d: '', sid: 1160 }),
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
  // Unified contract: apply(classes)
  function applyWarriorBalance(classes) {
    if (!Array.isArray(classes)) return false;
    const c = classes.find((x) => x.id === 'warrior');
    if (!c) return false;
    c.specs = JSON.parse(JSON.stringify(WARRIOR_SPECS));
    return true;
  }
  if (global.CLASS_BALANCE_API && global.CLASS_BALANCE_API.register) {
    global.CLASS_BALANCE_API.register('warrior', applyWarriorBalance);
  } else {
    global.CLASS_BALANCE_PACKS = global.CLASS_BALANCE_PACKS || [];
    global.CLASS_BALANCE_PACKS.push({ id: 'warrior', apply: applyWarriorBalance });
  }
  if (global.WOW_WARRIOR_BALANCE) global.WOW_WARRIOR_BALANCE.apply = applyWarriorBalance;

})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
