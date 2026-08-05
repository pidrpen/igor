// export for merge
// Warrior (Arms / Fury / Protection) — turn-based balance
// Merge: replace warrior class block in wow-mop-data.js
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
    const keys = [
      'flat', 'freeAction', 'maxCharges', 'applyDot', 'applyHot', 'dmgReduce',
      'blockChanceAdd', 'blockValueAdd', 'armorMod', 'armorStacksMax', 'critBonus',
      'critMod', 'atkMod', 'lifesteal', 'vuln', 'hits', 'cleaveFlat', 'school',
      'maxHpPct', 'buffTurns', 'aoeBounce', 'shieldFromDmg', 'enemyDmgMod',
      'grantBlock', 'holyShock', 'purifyPct', 'healAmp', 'nextHealCharges',
      'abilityCharges', 'staggerBonus', 'chainDecay', 'summonOnCast', 'petAtkMod',
      'chainPrimary',
    ];
    for (const k of keys) if (o[k] !== undefined) ab[k] = o[k];
    if (o.fl != null) ab.flat = o.fl;
    if (o.fa) ab.freeAction = true;
    if (o.bt != null) ab.buffTurns = o.bt;
    if (o.dr != null) ab.dmgReduce = o.dr;
    if (o.cm != null) ab.critMod = o.cm;
    if (o.ch != null) ab.maxCharges = o.ch;
    if (o.hpPct != null) ab.maxHpPct = o.hpPct;
    if (o.am != null) ab.armorMod = o.am;
    return ab;
  }

  // Content loaded from disk in next step - PLACEHOLDER
})(typeof window !== 'undefined' ? window : globalThis);
