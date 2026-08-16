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
      'flat','freeAction','maxCharges','applyDot','applyHot','dmgReduce','blockChanceAdd','blockValueAdd',
      'armorMod','armorStacksMax','critBonus','critMod','atkMod','lifesteal','vuln','hits','cleaveFlat',
      'school','maxHpPct','buffTurns','aoeBounce','shieldFromDmg','enemyDmgMod','grantBlock','holyShock',
      'purifyPct','healAmp','nextHealCharges','abilityCharges','staggerBonus','chainDecay','summonOnCast', 'petAtkMod', 'chainPrimary','healFromDealt'];
    for (const k of keys) if (o[k] !== undefined) ab[k] = o[k];
    if (o.fl != null) ab.flat = o.fl;
    if (o.fa) ab.freeAction = true;
    if (o.bt != null) ab.buffTurns = o.bt;
    if (o.dr != null) ab.dmgReduce = o.dr;
    if (o.cm != null) ab.critMod = o.cm;
    if (o.ch != null) ab.maxCharges = o.ch;
    return ab;
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
      fields: { cost: 40, genSec: 2, cd: 2, type: 'aoe' },
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
        resourceOverride: { type: 'energy', name: 'Энергия', icon: '⚡', max: 100, start: 100, regen: 25 },
        abilities: [
          A({
            id: 'jab', n: 'Джаб', en: 'Jab', i: '👊',
            c: 20, gs: 1, t: 'damage', fl: 20, school: 'physical', d: '20т · +1 ци', sid: 100780,
          }),
          A({
            id: 'keg_smash', n: 'Удар бочонком', en: 'Keg Smash', i: '🍺',
            c: 40, gs: 2, cd: 3, t: 'aoe', fl: 40, school: 'physical',
            healFromDealt: 0.05,
            d: '40т область · КД 3 · хил 5% от нанесённого', sid: 121253,
          }),
          A({
            id: 'blackout', n: 'Удар чёрного лотоса', en: 'Blackout Kick', i: '🦶',
            cs: 0, cd: 3, t: 'damage', fl: 45, school: 'physical', d: '45т · КД 3', sid: 100784,
          }),
          A({
            id: 'breath', n: 'Дыхание огня', en: 'Breath of Fire', i: '🔥',
            cs: 1, cd: 4, t: 'aoe', fl: 17, school: 'fire',
            enemyDmgMod: 0.1, bt: 5,
            applyDot: { flat: 3, turns: 5, name: 'Дыхание огня', school: 'fire' },
            d: '17т область · КД 4', sid: 115181,
          }),
          A({
            id: 'sck', n: 'Танцующий журавль', en: 'Spinning Crane Kick', i: '🌪️',
            c: 40, t: 'aoe', fl: 15, school: 'physical',
            d: '15т область · 40 энергии', sid: 101546,
          }),
          A({
            id: 'purifying', n: 'Очищающий отвар', en: 'Purifying Brew', i: '🍵',
            c: 20, cs: 0, t: 'cleanse', p: 1.0, fa: 1, purifyPct: 0.25, d: 'Снимает 25% пошатывания → пул для Отвара неуловимости', sid: 119582,
          }),
          A({
            id: 'elusive', n: 'Отвар неуловимости', en: 'Elusive Brew', i: '💨',
            cd: 0, t: 'shield', fl: 30, d: 'Щит: база 30т + объём stagger, очищенный Очищающим отваром', sid: 115308,
          }),
          A({
            id: 'provoke', n: 'Вызов', en: 'Provoke', i: '📢',
            cd: 2, t: 'taunt', p: 0, fa: 1, d: '', sid: 115546,
          }),
          A({
            id: 'fort_brew', n: 'Отвар железной шкуры', en: 'Fortifying Brew', i: '🏋️',
            cd: 6, t: 'buff', fa: 1, staggerBonus: 0.5, dr: 0.3, bt: 3, d: '', sid: 115203,
          }),
          A({
            id: 'niuzao', n: 'Призыв Нюцзао', en: 'Invoke Niuzao', i: '🐂',
            cd: 10, t: 'summon', fa: 1, school: 'none',
            d: 'Бык 3 раунда · КД 10 · без хода · 25% шата · топ 10т + 50% очистки', sid: 132578,
          }),
],
      },

      // ═════════════════════════════════════
      // MISTWEAVER (testBuild) — healer · Mana + Chi
      // Chi heals: Renewing/Surging/Jab → Enveloping / Uplift
      // RU: Surging = Бурлящий; Enveloping = Окутывающий
      // atk 15 = FLAT_REF (как Holy/Resto)
      // ═════════════════════════════════════
      {
        id: 'mistweaver',
        name: 'Ткач туманов',
        nameEn: 'Mistweaver',
        role: 'healer',
        icon: '🌫️',
        testBuild: true,
        stats: { hp: 95, atk: 15, def: 4, speed: 11 },
        resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 7 },
        secondaryOverride: null,
        abilities: [
          A({ id: 'renewing', n: 'Заживляющий туман', en: 'Renewing Mist', i: '✨',
            c: 8, cd: 2, t: 'heal', fl: 18, school: 'nature',
            applyHot: { flat: 4, turns: 10, name: 'Заживляющий туман', id: 'renewing' },
            d: '18т + хот 10р · носители едят 70% урона монаха', sid: 115151 }),
          A({ id: 'surging', n: 'Бурлящий туман', en: 'Surging Mist', i: '💚',
            c: 10, t: 'heal', fl: 26, school: 'nature',
            d: '26т · быстрый хил', sid: 116694 }),
          A({ id: 'enveloping', n: 'Окутывающий туман', en: 'Enveloping Mist', i: '🌿',
            c: 20, cd: 3, t: 'heal', fl: 36, school: 'nature',
            applyHot: { flat: 8, turns: 4, name: 'Окутывающий туман' },
            d: '36т + 8т×4 · 20 маны · КД 3', sid: 124682 }),
          A({ id: 'uft', n: 'Духовный подъём', en: 'Uplift', i: '🙌',
            c: 12, cd: 2, t: 'heal_aoe', fl: 28, school: 'nature',
            d: '28т область · 12 маны · КД 2', sid: 116670 }),
          A({ id: 'jade_serpent', n: 'Призыв нефритовой змеи', en: 'Jade Serpent', i: '🐍',
            cd: 7, t: 'summon', fa: 1, school: 'nature',
            d: 'Змея 3 раунда · КД 7 · без хода · 3т союзнику и врагу после каждого хода', sid: 115313 }),
          A({ id: 'soothing', n: 'Успокаивающий туман', en: 'Soothing Mist', i: '🍃',
            c: 5, t: 'heal', fl: 3, school: 'nature',
            d: '5 маны · 3т. Со змеёй без хода выбирает цель: змея хилит и бьёт после каждого хода союзника и врага', sid: 115175 }),
          A({ id: 'jade_lotus', n: 'Удар нефритового лотоса', en: 'Jade Lotus Strike', i: '🌸',
            c: 0, t: 'damage', fl: 30, school: 'nature',
            d: '30т · бесплатно', sid: 100780 }),
          A({ id: 'thunder_focus', n: 'Громовой чай', en: 'Thunder Focus Tea', i: '☕',
            cd: 7, t: 'buff', fa: 1, school: 'none',
            d: 'След. 2 хила 0 маны · без хода · КД 7', sid: 116680 }),
          A({ id: 'revival', n: 'Восстановление сил', en: 'Revival', i: '🌈',
            c: 16, cd: 5, t: 'heal_aoe', fl: 34, school: 'nature',
            d: '34т область · КД 5', sid: 115310 }),
        ],
      },

      // ═════════════════════════════════════
      // WINDWALKER (testBuild) — dps · Energy + Chi
      // Jab → RSK / BoK / FoF; ToD execute ≤35%
      // Order: strong spenders before Tiger Palm (AI first-usable)
      // atk 15 = FLAT_REF
      // ═════════════════════════════════════
      {
        id: 'windwalker',
        name: 'Танцующий с ветром',
        nameEn: 'Windwalker',
        role: 'dps',
        icon: '🌪️',
        testBuild: true,
        stats: { hp: 100, atk: 15, def: 3, speed: 14 },
        resourceOverride: { type: 'energy', name: 'Энергия', icon: '⚡', max: 100, start: 100, regen: 18 },
        abilities: [
          A({ id: 'jab', n: 'Лапа тигра', en: 'Tiger Palm', i: '🐯',
            c: 40, gs: 2, t: 'damage', fl: 16, school: 'physical',
            d: '16т · 40 энергии · +2 ци', sid: 100787 }),
          A({ id: 'rsk', n: 'Удар восходящего солнца', en: 'Rising Sun Kick', i: '🌅',
            cs: 2, cd: 2, t: 'damage', fl: 55, school: 'physical',
            d: '55т · 2 ци · КД 2', sid: 107428 }),
          A({ id: 'touch_death', n: 'Касание смерти', en: 'Touch of Death', i: '💀',
            c: 0, cd: 20, t: 'damage', school: 'physical',
            d: 'Бесплатно · КД 20 · HP цели < своего · урон = своё HP', sid: 115080 }),
          A({ id: 'sck', n: 'Танцующий журавль', en: 'Spinning Crane Kick', i: '🌪️',
            c: 40, t: 'aoe', fl: 14, school: 'physical',
            d: '14т область · 40 энергии', sid: 101546 }),
          A({ id: 'xuen', n: 'Призыв Сюэня', en: 'Invoke Xuen', i: '🐯',
            cd: 8, t: 'summon', school: 'physical',
            d: 'Тигр 3 раунда · КД 8 · топ 10т · реген энергии ×2', sid: 123904 }),
          A({ id: 'energizing', n: 'Отвар жизненной энергии', en: 'Energizing Brew', i: '⚡',
            cd: 8, t: 'buff', fa: 1, g: 30, school: 'none',
            d: '+30 энергии · без хода · КД 8', sid: 115288 }),
          A({ id: 'tigereye', n: 'Пиво тигриного глаза', en: 'Tigereye Brew', i: '🍺',
            cd: 3, t: 'buff', fa: 1, atkMod: 0.25, bt: 3, school: 'none',
            d: '+25% атаки · 3 хода · без хода', sid: 116740 }),
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
      'keg_smash gs:2 cd3': byId(brew, 'keg_smash').genSec === 2 && byId(brew, 'keg_smash').cd === 3,
      'no guard': !byId(brew, 'guard'),
      'niuzao fa': !!byId(brew, 'niuzao') && byId(brew, 'niuzao').freeAction === true,
      'purifying cleanse not heal': byId(brew, 'purifying').type === 'cleanse',
      'elusive shield': byId(brew, 'elusive').type === 'shield',
      'mw no chi': mw.secondaryOverride === null,
      'enveloping mana': byId(mw, 'enveloping').cost === 20 && byId(mw, 'enveloping').cd === 3,
      'ww jab +2 chi': byId(ww, 'jab').genSec === 2 && byId(ww, 'jab').name === 'Лапа тигра',
      'ww rsk 55': byId(ww, 'rsk').flat === 55,
      'ww no bok/fists': !byId(ww, 'bok') && !byId(ww, 'fists'),
      'ww tod free': byId(ww, 'touch_death').cd === 20 && !byId(ww, 'touch_death').costSec,
      'mw jade_serpent fa': byId(mw, 'jade_serpent').freeAction === true,
      'mw soothing 3': byId(mw, 'soothing').flat === 3 && byId(mw, 'soothing').cost === 5,
    };
    const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
    return { ok: failed.length === 0, checks, failed };
  }

  const api = {
    A,
    classId: 'monk',
    version: '5.4.8-monk-s29-fa',
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
  function applyMonkBalance(classes) {
    return applyTo(classes);
  }
  api.apply = applyMonkBalance;
  global.CLASS_BALANCE_PACKS = global.CLASS_BALANCE_PACKS || [];
  global.CLASS_BALANCE_PACKS.push({ id: 'monk', apply: applyMonkBalance });

})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
