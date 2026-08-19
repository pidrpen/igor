/**
 * Mythic Key — Druid (Balance / Feral / Guardian / Restoration)
 * FULL rebalance: flat «т» scale (FLAT_REF=15), roles, resources.
 * Подключается через apply-all.js → WOW_MOP.classes.
 *
 * Balance: mana + eclipse (gs only) · Wrath / Starfire / Moonfire / Starsurge
 * Feral:   energy + combo · Shred / Rake / Rip / Ferocious Bite
 * Guardian:rage · Mangle / Thrash / Frenzied Regen
 * Resto:   mana · Rejuv / Regrowth / Wild Growth / Tranquility
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
    const extra = [
      'flat', 'freeAction', 'maxCharges', 'applyDot', 'applyHot',
      'dmgReduce', 'blockChanceAdd', 'blockValueAdd', 'armorMod', 'armorStacksMax',
      'critBonus', 'critMod', 'atkMod', 'lifesteal', 'vuln', 'hits', 'cleaveFlat',
      'school', 'maxHpPct', 'buffTurns', 'aoeBounce', 'shieldFromDmg',
      'enemyDmgMod', 'grantBlock', 'targetFlex', 'holyShock', 'physOnly',
      'purifyPct', 'healAmp', 'nextHealCharges', 'staggerBonus', 'chainDecay',
      'interruptPrimary', 'interruptAoeChance', 'judgmentConsecrateSplash',
      'grantSelfBuff', 'abilityCharges', 'splashFlat', 'petAtkMod',
    ];
    for (const k of extra) {
      if (o[k] !== undefined) ab[k] = o[k];
    }
    if (o.fa) ab.freeAction = true;
    if (o.fl != null) ab.flat = o.fl;
    if (o.ch != null) ab.maxCharges = o.ch;
    if (o.dr != null) ab.dmgReduce = o.dr;
    if (o.bt != null) ab.buffTurns = o.bt;
    if (o.am != null) ab.armorMod = o.am;
    if (o.cm != null) ab.critMod = o.cm;
    if (o.hpPct != null) ab.maxHpPct = o.hpPct;
    return ab;
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
      // ═════════════════════════════════════
      // BALANCE — mana + eclipse (genSec only)
      // Core: Wrath / Starfire / Moonfire / Starsurge
      // atk 15 = FLAT_REF: Nт ≈ Nт урона
      // ═════════════════════════════════════
      {
        id: 'balance',
        name: 'Баланс',
        nameEn: 'Balance',
        role: 'dps',
        icon: '🌙',
        testBuild: true,
        stats: { hp: 95, atk: 15, def: 3, speed: 11 },
        resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 5 },
        secondaryOverride: { type: 'eclipse', name: 'Затмение', icon: '🌓', max: 100, start: 0 },
        abilities: [
          A({ id: 'wrath', n: 'Гнев', en: 'Wrath', i: '🌟',
            c: 5, gs: 15, t: 'damage', fl: 20, school: 'nature',
            d: '20т · +15 затмение', sid: 5176 }),
          A({ id: 'starfire', n: 'Звёздный огонь', en: 'Starfire', i: '⭐',
            c: 7, gs: 20, t: 'damage', fl: 26, school: 'arcane',
            d: '26т · +20 затмение', sid: 2912 }),
          A({ id: 'moonfire', n: 'Лунный огонь', en: 'Moonfire', i: '🌙',
            c: 5, t: 'dot', school: 'arcane',
            applyDot: { flat: 8, turns: 5, name: 'Лунный огонь', id: 'moonfire', icon: '🌙', school: 'arcane' },
            d: '8т×5 · 5 маны', sid: 8921 }),
          A({ id: 'sunfire', n: 'Солнечный огонь', en: 'Sunfire', i: '☀️',
            c: 5, t: 'dot', school: 'nature',
            applyDot: { flat: 8, turns: 5, name: 'Солнечный огонь', id: 'sunfire', icon: '☀️', school: 'nature' },
            d: '8т×5 · 5 маны', sid: 93402 }),
          A({ id: 'starsurge', n: 'Звёздный поток', en: 'Starsurge', i: '💫',
            c: 8, gs: 12, cd: 2, t: 'damage', fl: 36, school: 'arcane',
            d: '36т · +12 затмение · КД 2', sid: 78674 }),
          A({ id: 'starfall', n: 'Звездопад', en: 'Starfall', i: '🌠',
            c: 12, cd: 3, t: 'aoe', fl: 16, school: 'arcane',
            d: '16т область · КД 3', sid: 48505 }),
          A({ id: 'hurricane', n: 'Ураган', en: 'Hurricane', i: '🌪️',
            c: 12, t: 'aoe', fl: 13, school: 'nature',
            d: '13т область · 12 маны', sid: 16914 }),
          A({ id: 'celestial', n: 'Небесное выравнивание', en: 'Celestial Alignment', i: '🌌',
            cd: 5, t: 'buff', fa: 1, atkMod: 0.25, bt: 3, school: 'none',
            d: '+25% ATK · 3 хода · без хода', sid: 112071 }),
          A({ id: 'incarnation', n: 'Воплощение', en: 'Incarnation: Chosen of Elune', i: '🦉',
            cd: 6, t: 'buff', fa: 1, cm: 0.2, atkMod: 0.15, bt: 3, school: 'none',
            d: '+15% ATK · +20% крит · 3 хода · без хода', sid: 102560 }),
        ],
      },

      // ═════════════════════════════════════
      // FERAL — energy + combo
      // Core: Shred / Rake / Rip / Ferocious Bite
      // Builders: fl; finishers: power (combo-scale в движке)
      // ═════════════════════════════════════
      {
        id: 'feral',
        name: 'Сила зверя',
        nameEn: 'Feral',
        role: 'dps',
        icon: '🐱',
        testBuild: true,
        stats: { hp: 100, atk: 15, def: 3, speed: 14 },
        resourceOverride: { type: 'energy', name: 'Энергия', icon: '⚡', max: 100, start: 100, regen: 20 },
        secondaryOverride: { type: 'combo', name: 'Серия приёмов', icon: '🃏', max: 5, start: 0 },
        abilities: [
          A({ id: 'shred', n: 'Полоснуть', en: 'Shred', i: '✂️',
            c: 32, gs: 1, t: 'damage', fl: 26, school: 'physical',
            d: '26т · 32 эн · +1 серия', sid: 5221 }),
          A({ id: 'rake', n: 'Глубокая рана', en: 'Rake', i: '🩸',
            c: 35, gs: 1, t: 'dot', school: 'physical',
            applyDot: { flat: 9, turns: 4, name: 'Глубокая рана', id: 'rake', icon: '🩸', school: 'physical' },
            d: '9т×4 · 35 эн · +1 серия', sid: 1822 }),
          A({ id: 'rip', n: 'Разорвать', en: 'Rip', i: '💔',
            c: 30, cs: 1, t: 'dot', school: 'physical',
            applyDot: { flat: 8, turns: 5, name: 'Разорвать', id: 'rip', icon: '💔', school: 'physical' },
            d: '30 эн · завершающий · при 5 очках 8т×5', sid: 1079 }),
          A({ id: 'ferocious', n: 'Свирепый укус', en: 'Ferocious Bite', i: '🦷',
            c: 25, cs: 1, t: 'damage', fl: 33.5, school: 'physical',
            d: '25 эн · завершающий · при 5 очках 52т', sid: 22568 }),
          A({ id: 'thrash', n: 'Взбучка', en: 'Thrash', i: '🌀',
            c: 45, gs: 1, cd: 2, t: 'aoe', fl: 12, school: 'physical',
            applyDot: { flat: 4, turns: 4, name: 'Взбучка', icon: '🩸', id: 'thrash_bleed', school: 'physical' },
            d: '12т область + 4т×4 · 45 эн · +1 серия · КД 2', sid: 106830 }),
          A({ id: 'swipe', n: 'Размах', en: 'Swipe', i: '👋',
            c: 40, gs: 1, t: 'aoe', fl: 12, school: 'physical',
            d: '12т область · 40 эн · +1 серия', sid: 62078 }),
          A({ id: 'tigers_fury', n: 'Тигриное неистовство', en: "Tiger's Fury", i: '🐯',
            cd: 3, g: 60, t: 'buff', fa: 1, atkMod: 0.15, bt: 2, school: 'none',
            d: '+60 энергии · +15% атаки · 2 хода · без хода', sid: 5217 }),
          A({ id: 'berserk', n: 'Берсерк', en: 'Berserk', i: '😡',
            cd: 5, t: 'buff', fa: 1, atkMod: 0.28, bt: 3, school: 'none',
            d: '+28% атаки · 3 хода · без хода', sid: 106951 }),
          A({ id: 'savage_roar', n: 'Дикий рёв', en: 'Savage Roar', i: '📢',
            c: 25, cd: 4, t: 'buff', fa: 1, atkMod: 0.18, bt: 4, school: 'none',
            d: '+18% атаки · 4 хода · 25 эн · КД 4 · без хода · серию не ест', sid: 52610 }),
        ],
      },

      // ═════════════════════════════════════
      // GUARDIAN — tank · rage
      // Core: Mangle / Thrash / Frenzied Regeneration
      // fl scale like warrior prot / brewmaster (atk 12)
      // ═════════════════════════════════════
      {
        id: 'guardian',
        name: 'Страж',
        nameEn: 'Guardian',
        role: 'tank',
        icon: '🐻',
        testBuild: true,
        stats: { hp: 172, atk: 12, def: 12, speed: 8 },
        resourceOverride: { type: 'rage', name: 'Ярость', icon: '💢', max: 100, start: 20, regen: 8 },
        abilities: [
          A({ id: 'mangle', n: 'Увечье', en: 'Mangle', i: '🐻',
            g: 20, t: 'damage', fl: 18, school: 'physical',
            d: '18т · +20 ярости', sid: 33878 }),
          A({ id: 'thrash', n: 'Взбучка', en: 'Thrash', i: '🌀',
            g: 15, cd: 3, t: 'aoe', fl: 20, school: 'physical',
            applyDot: { flat: 4, turns: 2, name: 'Взбучка', icon: '🩸', id: 'thrash_g', school: 'physical' },
            d: '20т область + 4т×2 · +15 ярости · КД 3', sid: 77758 }),
          A({ id: 'lacerate', n: 'Растерзать', en: 'Lacerate', i: '🩸',
            c: 40, cd: 3, t: 'damage', fl: 40, school: 'physical',
            applyDot: { flat: 6, turns: 2, name: 'Растерзать', id: 'lacerate', icon: '🩸', school: 'physical' },
            d: '40т + 6т×2 · 40 ярости · КД 3', sid: 33745 }),
          A({ id: 'maul', n: 'Трепка', en: 'Maul', i: '👊',
            c: 15, t: 'damage', fl: 28, school: 'physical',
            d: '28т · 15 ярости', sid: 6807 }),
          A({ id: 'frenzied', n: 'Неистовое восстановление', en: 'Frenzied Regeneration', i: '💚',
            c: 40, cd: 5, ch: 2, t: 'heal', school: 'none',
            applyHot: { hpPct: 0.19, turns: 2, name: 'Неистовое восстановление' },
            d: '19% HP × 2 хода · 40 ярости · КД 5 · 2 заряда', sid: 22842 }),
          A({ id: 'savage_def', n: 'Дикая защита', en: 'Savage Defense', i: '🛡️',
            c: 30, t: 'buff', am: 0.08, bt: 4, school: 'none',
            d: '+8% брони · 4 хода · 30 ярости', sid: 62606 }),
          A({ id: 'barkskin', n: 'Дубовая кожа', en: 'Barkskin', i: '🪵',
            cd: 4, t: 'buff', fa: 1, dr: 0.2, bt: 2, school: 'none',
            d: '−20% урон · 2 хода · без хода', sid: 22812 }),
          A({ id: 'survival', n: 'Инстинкты выживания', en: 'Survival Instincts', i: '❤️',
            cd: 10, ch: 2, t: 'buff', fa: 1, dr: 0.5, bt: 2, school: 'none',
            d: '−50% урон · 2 хода · без хода · КД 10 · 2 заряда', sid: 61336 }),
          A({ id: 'growl', n: 'Рык', en: 'Growl', i: '📢',
            cd: 2, t: 'taunt', p: 0, fa: 1, school: 'none',
            d: 'Агро · без хода', sid: 6795 }),
        ],
      },

      // ═════════════════════════════════════
      // RESTORATION — healer · mana
      // Core: Rejuv / Regrowth / Wild Growth / Tranquility
      // atk 15 = FLAT_REF (как Holy / Shaman Resto)
      // ═════════════════════════════════════
      {
        id: 'restoration',
        name: 'Исцеление',
        nameEn: 'Restoration',
        role: 'healer',
        icon: '🌳',
        testBuild: true,
        stats: { hp: 95, atk: 15, def: 4, speed: 10 },
        resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 7 },
        abilities: [
          A({ id: 'reju', n: 'Омоложение', en: 'Rejuvenation', i: '🍃',
            c: 8, t: 'heal', fl: 12, school: 'nature',
            applyHot: { flat: 6, turns: 5, name: 'Омоложение' },
            d: 'СТ · 12т + HoT 6т×5', sid: 774 }),
          A({ id: 'regrowth', n: 'Восстановление', en: 'Regrowth', i: '🌱',
            c: 13, t: 'heal', fl: 28, school: 'nature',
            applyHot: { flat: 4, turns: 4, name: 'Восстановление' },
            d: 'СТ · 28т + HoT 4т×4 · 13 маны', sid: 8936 }),
          A({ id: 'wrath', n: 'Гнев', en: 'Wrath', i: '🌟',
            c: 5, t: 'damage', fl: 15, school: 'nature',
            d: '15т · 5 маны', sid: 5176 }),
          A({ id: 'wg', n: 'Буйный рост', en: 'Wild Growth', i: '🌸',
            c: 16, cd: 2, t: 'heal_aoe', fl: 18, school: 'nature',
            applyHot: { flat: 5, turns: 4, name: 'Буйный рост' },
            d: 'АОЕ · 18т + HoT 5т×4 · КД 2', sid: 48438 }),
          A({ id: 'swiftmend', n: 'Быстрое восстановление', en: 'Swiftmend', i: '⚡',
            c: 10, cd: 3, t: 'heal', fl: 50, school: 'nature',
            d: 'СТ · 50т · КД 3', sid: 18562 }),
          A({ id: 'lifebloom', n: 'Жизнецвет', en: 'Lifebloom', i: '🌼',
            c: 8, t: 'heal', fl: 10, school: 'nature',
            applyHot: { flat: 7, turns: 5, name: 'Жизнецвет' },
            d: 'СТ · 10т + HoT 7т×5', sid: 33763 }),
          A({ id: 'tranq', n: 'Спокойствие', en: 'Tranquility', i: '☮️',
            c: 18, cd: 5, t: 'heal_aoe', fl: 32, school: 'nature',
            d: 'АОЕ · 32т · КД 5', sid: 740 }),
          A({ id: 'nourish', n: 'Покровительство природы', en: 'Nourish', i: '🌿',
            c: 9, t: 'heal', fl: 24, school: 'nature',
            d: 'СТ · 24т · 9 маны', sid: 50464 }),
          A({ id: 'moonfire', n: 'Лунный огонь', en: 'Moonfire', i: '🌙',
            c: 5, t: 'dot', school: 'arcane',
            applyDot: { flat: 7, turns: 5, name: 'Лунный огонь', id: 'moonfire', icon: '🌙', school: 'arcane' },
            d: '7т×5 · 5 маны', sid: 8921 }),
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
    const clone = JSON.parse(JSON.stringify(DRUID));
    if (idx >= 0) classes[idx] = clone;
    else classes.push(clone);
    return clone;
  }

  function applyDruidBalance(classes) {
    return applyTo(classes);
  }

  function validate() {
    const bal = DRUID.specs.find((s) => s.id === 'balance');
    const fer = DRUID.specs.find((s) => s.id === 'feral');
    const gua = DRUID.specs.find((s) => s.id === 'guardian');
    const res = DRUID.specs.find((s) => s.id === 'restoration');
    const byId = (spec, id) => spec.abilities.find((a) => a.id === id);
    const checks = {
      'moonfire 8x5': byId(bal, 'moonfire').applyDot
        && byId(bal, 'moonfire').applyDot.flat === 8
        && byId(bal, 'moonfire').applyDot.turns === 5
        && !(byId(bal, 'moonfire').flat > 0),
      'sunfire 8x5': byId(bal, 'sunfire').applyDot
        && byId(bal, 'sunfire').applyDot.turns === 5
        && byId(bal, 'sunfire').applyDot.flat === 8,
      'starsurge cd2': byId(bal, 'starsurge').cd === 2,
      'rake 9x4': byId(fer, 'rake').applyDot
        && byId(fer, 'rake').applyDot.flat === 9
        && byId(fer, 'rake').applyDot.turns === 4,
      'rip 8x5': byId(fer, 'rip').applyDot
        && byId(fer, 'rip').applyDot.flat === 8
        && byId(fer, 'rip').applyDot.turns === 5
        && byId(fer, 'rip').costSec === 1,
      'ferocious 33.5': byId(fer, 'ferocious').flat === 33.5 && byId(fer, 'ferocious').costSec === 1,
      'thrash feral cd2 4x4': byId(fer, 'thrash').cd === 2
        && byId(fer, 'thrash').applyDot.turns === 4,
      'savage_roar fa no combo': byId(fer, 'savage_roar').freeAction === true
        && !byId(fer, 'savage_roar').costSec,
      'mangle no cd': !byId(gua, 'mangle').cd,
      'thrash g +15': byId(gua, 'thrash').gen === 15 && byId(gua, 'thrash').cd === 3,
      'lacerate 40+6x2': byId(gua, 'lacerate').flat === 40
        && byId(gua, 'lacerate').applyDot.flat === 6
        && byId(gua, 'lacerate').applyDot.turns === 2,
      'frenzied 19% x2': byId(gua, 'frenzied').applyHot
        && byId(gua, 'frenzied').applyHot.hpPct === 0.19
        && byId(gua, 'frenzied').maxCharges === 2
        && byId(gua, 'frenzied').cost === 40,
      'savage_def armor': byId(gua, 'savage_def').type === 'buff'
        && byId(gua, 'savage_def').armorMod === 0.08
        && byId(gua, 'savage_def').cost === 30,
      'survival 2ch cd10': byId(gua, 'survival').maxCharges === 2 && byId(gua, 'survival').cd === 10,
      'resto no ht': !byId(res, 'ht'),
      'resto wrath 15': byId(res, 'wrath') && byId(res, 'wrath').flat === 15,
      'resto moonfire 7x5': byId(res, 'moonfire').applyDot
        && byId(res, 'moonfire').applyDot.flat === 7
        && byId(res, 'moonfire').applyDot.turns === 5,
      'swiftmend 50 cd3': byId(res, 'swiftmend').flat === 50 && byId(res, 'swiftmend').cd === 3,
    };
    const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
    return { ok: failed.length === 0, checks, failed };
  }

  const api = {
    classId: 'druid',
    version: '5.4.8-druid-s31',
    A,
    cls: DRUID,
    class: DRUID,
    specs: DRUID.specs,
    applyTo,
    apply: applyDruidBalance,
    validate,
    /**
     * engineNeeds — фичи, которые данными не закрыть.
     */
    engineNeeds: [
      {
        id: 'eclipse_threshold_buff',
        spec: 'balance',
        priority: 'P1',
        summary:
          'При eclipse.current >= max выдать бафф «Затмение» (+ATK) и сбросить/реверснуть шкалу.',
        why: 'genSec только наполняет бар; costSec нет — secondary мёртв для геймплея.',
      },
      {
        id: 'eclipse_ai_not_builder_lock',
        spec: 'balance',
        priority: 'P2',
        summary:
          'AI: для secondary type===eclipse не залипать на genSec-билдерах до cap.',
        why: 'Общий AI builder-priority заточен под combo/chi.',
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

  global.CLASS_BALANCE_PACKS = global.CLASS_BALANCE_PACKS || [];
  global.CLASS_BALANCE_PACKS.push({ id: 'druid', apply: applyDruidBalance });

})(typeof window !== 'undefined' ? window : globalThis);
