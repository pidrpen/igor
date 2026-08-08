/**
 * Mythic Key — MoP 5.4.8 lite
 * Class balance pack: Gnome Engineer (Mechanist / Sapper / Tinkerer)
 *
 * Primary: energy (Пар). Secondary: parts (Детали).
 * Tinkerer = production unlocked (flat kit preserved).
 * Mechanist + Sapper = testBuild flat rebalance.
 *
 * version: mop-5.4.8-lite-engineer-test
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
    if (o.lifesteal != null) ab.lifesteal = o.lifesteal;
    if (o.applyDot) ab.applyDot = o.applyDot;
    if (o.applyHot) ab.applyHot = o.applyHot;
    if (o.school) ab.school = o.school;
    if (o.dmgReduce != null) ab.dmgReduce = o.dmgReduce;
    if (o.dr != null) ab.dmgReduce = o.dr;
    if (o.maxHpPct != null) ab.maxHpPct = o.maxHpPct;
    if (o.hpPct != null) ab.maxHpPct = o.hpPct;
    if (o.buffTurns != null) ab.buffTurns = o.buffTurns;
    if (o.bt != null) ab.buffTurns = o.bt;
    if (o.atkMod != null) ab.atkMod = o.atkMod;
    if (o.petAtkMod != null) ab.petAtkMod = o.petAtkMod;
    if (o.armorMod != null) ab.armorMod = o.armorMod;
    if (o.am != null) ab.armorMod = o.am;
    if (o.critMod != null) ab.critMod = o.critMod;
    if (o.cm != null) ab.critMod = o.cm;
    if (o.enemyDmgMod != null) ab.enemyDmgMod = o.enemyDmgMod;
    if (o.vuln) ab.vuln = o.vuln;
    if (o.summonOnCast) ab.summonOnCast = o.summonOnCast;
    return ab;
  }

  const ENGINEER_CLASS = {
    id: 'engineer',
    name: 'Гном-инженер',
    nameEn: 'Gnome Engineer',
    icon: '⚙️',
    color: '#E67E22',
    resource: { type: 'energy', name: 'Пар', icon: '💨', max: 100, start: 100, regen: 5 },
    secondary: { type: 'parts', name: 'Детали', icon: '🔩', max: 5, start: 1 },
    specs: [
      // ─── Mechanist (testBuild) — pet / turret ST ───────────
      // ST fl: plasma 28 > rivet 20 > scrap 18 > wrench 16
      // Parts: builders gs → deploy_turret cs2 / siege cs3
      {
        id: 'mechanist',
        name: 'Механист',
        nameEn: 'Mechanist',
        role: 'dps',
        icon: '🤖',
        testBuild: true,
        stats: { hp: 100, atk: 15, def: 5, speed: 11 },
        abilities: [
          A({ id: 'wrench_bash', n: 'Удар гаечным ключом', en: 'Wrench Bash', i: '🔧',
            g: 16, gs: 1, t: 'damage', fl: 16, school: 'physical',
            d: '16т · +16 пар · +1 деталь', sid: 90001 }),
          A({ id: 'rivet_gun', n: 'Заклёпочный пистолет', en: 'Rivet Gun', i: '🔫',
            c: 25, gs: 1, t: 'damage', fl: 20, school: 'physical',
            d: '20т · 25 пар · +1 деталь', sid: 90002 }),
          A({ id: 'plasma_cutter', n: 'Плазменный резак', en: 'Plasma Cutter', i: '✳️',
            c: 35, t: 'damage', fl: 28, school: 'fire',
            d: '28т · 35 пар', sid: 90003 }),
          A({ id: 'deploy_turret', n: 'Развёртывание турели', en: 'Deploy Turret', i: '🗼',
            c: 40, cs: 2, cd: 3, t: 'summon', p: 1, school: 'none',
            d: 'Турель 4 хода · 2 детали · КД 3', sid: 90004 }),
          A({ id: 'overclock', n: 'Разгон', en: 'Overclock', i: '⚡',
            c: 20, cd: 3, t: 'buff', fa: 1, atkMod: 0.2, petAtkMod: 0.2, bt: 3, school: 'none',
            d: '+20% атаки себе и механизмам · 3 хода · без хода', sid: 90005 }),
          A({ id: 'emergency_repair', n: 'Аварийный ремонт', en: 'Emergency Repair', i: '🩹',
            c: 30, cd: 3, t: 'heal', fl: 24, school: 'none',
            d: '24т хил · 30 пар · КД 3', sid: 90006 }),
          A({ id: 'call_siege_walker', n: 'Осадный ходун', en: 'Siege Walker', i: '🦾',
            c: 50, cs: 3, cd: 5, t: 'summon', p: 1, school: 'none',
            d: 'Ходун 4 хода · 3 детали · КД 5', sid: 90007 }),
          A({ id: 'scrap_shot', n: 'Выстрел металлоломом', en: 'Scrap Shot', i: '🧱',
            c: 20, t: 'damage', fl: 18, school: 'physical',
            d: '18т · 20 пар · filler', sid: 90008 }),
          A({ id: 'shock_wrench', n: 'Шоковый ключ', en: 'Shock Wrench', i: '⚡',
            c: 15, cd: 2, t: 'interrupt', fl: 6, school: 'arcane',
            d: 'Сбивает каст · 6т · КД 2', sid: 90009 }),
        ],
      },

      // ─── Sapper (testBuild) — bombs / AoE ──────────────────
      // AoE fl: demolish 32 > rocket 20 > cluster 18 > shrapnel 14
      // ST: remote_charge 26 · sticky DoT setup
      {
        id: 'sapper',
        name: 'Сапёр',
        nameEn: 'Sapper',
        role: 'dps',
        icon: '💣',
        testBuild: true,
        stats: { hp: 92, atk: 15, def: 3, speed: 12 },
        abilities: [
          A({ id: 'sticky_bomb', n: 'Липкая бомба', en: 'Sticky Bomb', i: '🧨',
            g: 14, gs: 1, t: 'dot', fl: 10, school: 'fire',
            applyDot: { flat: 5, turns: 4, name: 'Липкая бомба', school: 'fire' },
            d: '10т + DoT 5т×4 · +14 пар · +1 деталь', sid: 90011 }),
          A({ id: 'shrapnel_blast', n: 'Шрапнель', en: 'Shrapnel Blast', i: '💥',
            c: 28, gs: 1, t: 'aoe', fl: 14, school: 'physical',
            d: '14т AoE · +1 деталь', sid: 90012 }),
          A({ id: 'cluster_bomb', n: 'Кассетная бомба', en: 'Cluster Bomb', i: '💣',
            c: 40, t: 'aoe', fl: 18, school: 'fire',
            d: '18т AoE · 40 пар', sid: 90013 }),
          A({ id: 'deploy_bomb_drone', n: 'Дроны-бомбы', en: 'Bomb Drones', i: '🛸',
            c: 35, cs: 2, cd: 3, t: 'summon', p: 1, school: 'none',
            d: '2 дрона 3 хода · 2 детали · КД 3', sid: 90014 }),
          A({ id: 'rocket_barrage', n: 'Ракетный залп', en: 'Rocket Barrage', i: '🚀',
            c: 45, cd: 2, t: 'aoe', fl: 20, school: 'fire',
            d: '20т AoE · КД 2', sid: 90015 }),
          A({ id: 'remote_charge', n: 'Дистанционный заряд', en: 'Remote Charge', i: '📡',
            c: 25, t: 'damage', fl: 26, school: 'fire',
            d: '26т · точечный подрыв', sid: 90016 }),
          A({ id: 'demolish', n: 'Подрыв', en: 'Demolish', i: '☢️',
            c: 55, cs: 3, cd: 4, t: 'aoe', fl: 32, school: 'fire',
            d: '32т AoE · 3 детали · КД 4', sid: 90017 }),
          A({ id: 'nitro_boosts', n: 'Нитро-ускорители', en: 'Nitro Boosts', i: '🔥',
            c: 15, cd: 4, t: 'buff', fa: 1, atkMod: 0.2, bt: 2, school: 'none',
            d: '+20% атаки · 2 хода · без хода', sid: 90018 }),
          A({ id: 'shock_wrench', n: 'Шоковый ключ', en: 'Shock Wrench', i: '⚡',
            c: 15, cd: 2, t: 'interrupt', fl: 6, school: 'arcane',
            d: 'Сбивает каст · 6т · КД 2', sid: 90009 }),
        ],
      },

      // ─── Tinkerer (production unlocked) — keep intact ──────
      {
        id: 'tinkerer',
        name: 'Изобретатель',
        nameEn: 'Tinkerer',
        role: 'dps',
        icon: '🧪',
        stats: { hp: 95, atk: 16, def: 4, speed: 12 },
        resourceOverride: { type: 'energy', name: 'Пар', icon: '💨', max: 100, start: 100, regen: 5 },
        abilities: [
          A({ id: 'zap_gun', n: 'Электропушка', en: 'Zap Gun', i: '⚡',
            g: 20, gs: 1, t: 'damage', fl: 13, school: 'arcane', d: '', sid: 90021 }),
          A({ id: 'flux_bolt', n: 'Поток флюкса', en: 'Flux Bolt', i: '🌀',
            c: 0, g: 5, gs: 2, t: 'damage', fl: 30, school: 'arcane',
            d: '+5 пар · +2 детали.', sid: 90022 }),
          A({ id: 'death_ray', n: 'Гномский луч смерти', en: 'Gnomish Death Ray', i: '☢️',
            c: 50, cd: 4, t: 'damage', fl: 64, school: 'fire',
            d: 'Мощный луч · КД 4 · DoT радиации · без деталей.', sid: 90023 }),
          A({ id: 'rocket_chicken', n: 'Ракета-курица', en: 'Rocket Chicken', i: '🐔',
            c: 30, cs: 1, cd: 4, t: 'aoe', fl: 10, school: 'fire', d: '', sid: 90024 }),
          A({ id: 'world_destroyer', n: 'Личный разрушитель миров', en: 'World Destroyer', i: '🤖',
            c: 50, cs: 3, cd: 5, t: 'summon', p: 1, d: '', sid: 90025 }),
          A({ id: 'shrink_ray', n: 'Уменьшающий луч', en: 'Shrink Ray', i: '🔬',
            c: 25, cd: 3, t: 'debuff', p: 0.15, d: '', sid: 90026 }),
          A({ id: 'scrap_swarm', n: 'Рой металлолома', en: 'Scrap Swarm', i: '🐝',
            c: 40, cs: 2, cd: 8, t: 'summon', p: 1, d: '', sid: 90028 }),
          A({ id: 'shock_wrench', n: 'Шоковый ключ', en: 'Shock Wrench', i: '⚡',
            c: 20, cd: 5, t: 'cc', p: 1, bt: 2, d: '', sid: 90009 }),
          A({ id: 'debug_mode', n: 'Отладка', en: 'Debug', i: '🔧',
            c: 10, t: 'buff', fa: 1,
            d: '10 пар · переключает режим основного питомца СТ↔АОЕ · без хода · 1×/ход', sid: 90031 }),
          A({ id: 'wrench_heal', n: 'Гаечный воскрешатель', en: 'Wrench Revive', i: '🩹',
            c: 25, cd: 3, t: 'heal',
            d: 'Хил за счет питомца (−50% HP пета → +10% max HP цели)', sid: 90032 }),
        ],
      },
    ],
  };

  function applyEngineerBalance(classes) {
    if (!Array.isArray(classes) || !ENGINEER_CLASS) return false;
    const i = classes.findIndex((c) => c.id === 'engineer');
    const clone = JSON.parse(JSON.stringify(ENGINEER_CLASS));
    if (i >= 0) classes[i] = clone;
    else classes.push(clone);
    return true;
  }

  const api = {
    version: 'mop-5.4.8-lite-engineer-test',
    classId: 'engineer',
    class: ENGINEER_CLASS,
    specs: ENGINEER_CLASS.specs,
    resource: ENGINEER_CLASS.resource,
    secondary: ENGINEER_CLASS.secondary,
    apply: applyEngineerBalance,
    A,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.ENGINEER_CLASS = ENGINEER_CLASS;
  global.ENGINEER_BALANCE = api;
  global.CLASS_BALANCE_PACKS = global.CLASS_BALANCE_PACKS || [];
  global.CLASS_BALANCE_PACKS.push({ id: 'engineer', apply: applyEngineerBalance });

})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
