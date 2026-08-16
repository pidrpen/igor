/* Песочница прокачки. Цифры паладина = class-balance/paladin-abilities.js */
(function (G) {
  'use strict';

  G.STAT_SCALE = 1000;
  G.FLAT_REF = 15;
  G.MAX_LEVEL = 40;
  G.SAVE_KEY = 'igorLevelingPaladin_v1';
  G.ASSETS = '../assets/';

  G.ROLE_LABEL = { tank: 'Танк', healer: 'Целитель', dps: 'Боец' };
  G.CLASS_COLOR = {
    warrior: '#C79C6E', paladin: '#F58CBA', hunter: '#ABD473', rogue: '#E8D84A',
    priest: '#F5F5F5', deathknight: '#C41F3B', shaman: '#0070DE', mage: '#69CCF0',
    warlock: '#9482C9', monk: '#00C78C', druid: '#FF7D0A',
  };

  function A(o) {
    const ab = {
      id: o.id, name: o.n, icon: o.i || '✨',
      cost: o.c ?? 0, gen: o.g ?? 0, costSec: o.cs ?? 0, genSec: o.gs ?? 0,
      cd: o.cd ?? 0, type: o.t, power: o.p ?? 1, flat: o.fl ?? o.flat,
      school: o.school || 'holy', desc: o.d || '', unlock: o.u ?? 1,
    };
    if (o.fa) ab.freeAction = true;
    if (o.applyDot) ab.applyDot = o.applyDot;
    if (o.applyHot) ab.applyHot = o.applyHot;
    if (o.critBonus != null) ab.critBonus = o.critBonus;
    if (o.critMod != null) ab.critMod = o.critMod;
    if (o.atkMod != null) ab.atkMod = o.atkMod;
    if (o.dmgReduce != null) ab.dmgReduce = o.dmgReduce;
    if (o.armorMod != null) ab.armorMod = o.armorMod;
    if (o.armorStacksMax != null) ab.armorStacksMax = o.armorStacksMax;
    if (o.buffTurns != null) ab.buffTurns = o.buffTurns;
    if (o.aoeBounce != null) ab.aoeBounce = o.aoeBounce;
    if (o.shieldFromDmg != null) ab.shieldFromDmg = o.shieldFromDmg;
    if (o.interruptPrimary) ab.interruptPrimary = true;
    if (o.interruptAoeChance != null) ab.interruptAoeChance = o.interruptAoeChance;
    if (o.judgmentConsecrateSplash != null) ab.judgmentConsecrateSplash = o.judgmentConsecrateSplash;
    if (o.splashFlat != null) ab.splashFlat = o.splashFlat;
    if (o.holyShock) ab.holyShock = true;
    if (o.vuln) ab.vuln = o.vuln;
    return ab;
  }

  G.SPECS = {
    holy: {
      id: 'holy', name: 'Свет', role: 'healer', icon: '🌟',
      stats: { hp: 95, atk: 15, def: 5, speed: 10 },
      manaRegen: 4,
      mastery: { name: 'Озарённое исцеление', pctAt120: 15, kind: 'light_echo' },
    },
    protection: {
      id: 'protection', name: 'Защита', role: 'tank', icon: '🛡️',
      stats: { hp: 168, atk: 12, def: 12, speed: 8 },
      manaRegen: 10,
      mastery: { name: 'Божественный оплот', pctAt120: 80, kind: 'avengers' },
    },
    retribution: {
      id: 'retribution', name: 'Воздаяние', role: 'dps', icon: '🔨',
      stats: { hp: 105, atk: 17, def: 5, speed: 11 },
      manaRegen: 10,
      mastery: { name: 'Длань Света', pctAt120: 13, kind: 'holy_dmg' },
    },
  };

  G.PALADIN_ABS = {
    holy: [
      A({ id: 'holy_light', n: 'Свет небес', i: '🔆', c: 16, t: 'heal', fl: 35, u: 1, d: 'СТ хил · 35т' }),
      A({ id: 'crusader', n: 'Удар воина Света', i: '⚔️', c: 2, gs: 1, t: 'damage', fl: 10, u: 4, d: '10т · +1 ES' }),
      A({ id: 'flash', n: 'Вспышка Света', i: '⚡', c: 12, t: 'heal', fl: 27, u: 8, d: 'СТ хил · 27т' }),
      A({ id: 'holy_shock', n: 'Шок небес', i: '✨', c: 3, gs: 1, cd: 2, t: 'heal', fl: 27, critBonus: 0.2, holyShock: 1, u: 12,
        applyHot: { flat: 7, turns: 5, name: 'Шок небес' }, d: 'Хил союзнику или урон врагу · +1 ES' }),
      A({ id: 'holy_radiance', n: 'Сияние света', i: '🌅', c: 16, t: 'heal_aoe', fl: 18, u: 16, d: 'АОЕ хил · 18т' }),
      A({ id: 'word_glory', n: 'Слово славы', i: '💫', cs: 3, t: 'heal', fl: 80, u: 20, d: 'СТ · 80т · 3 ES' }),
      A({ id: 'light_dawn', n: 'Свет зари', i: '🌄', cs: 2, cd: 2, t: 'heal_aoe', fl: 30, u: 24, d: 'АОЕ · 30т · 2 ES' }),
      A({ id: 'divine_prot', n: 'Божественная защита', i: '🛡️', cd: 6, t: 'shield', fl: 40, fa: 1, u: 28, d: 'Щит 40т · без хода' }),
      A({ id: 'avenging', n: 'Гнев карателя', i: '😇', cd: 7, t: 'buff', fa: 1, critMod: 0.3, buffTurns: 4, school: 'none', u: 32, d: '+30% крит · 4 хода · без хода' }),
    ],
    protection: [
      A({ id: 'crusader', n: 'Удар воина Света', i: '⚔️', c: 2, gs: 1, t: 'damage', fl: 18, armorMod: 0.04, armorStacksMax: 2, buffTurns: 3, u: 1, d: '18т · +1 ES · броня' }),
      A({ id: 'judgment', n: 'Правосудие', i: '⚖️', c: 4, gs: 1, t: 'damage', fl: 15, judgmentConsecrateSplash: 0.6, u: 4,
        vuln: { amount: 0.05, turns: 4 }, d: '15т · +60% по Освящению · +1 ES' }),
      A({ id: 'taunt', n: 'Длань расплаты', i: '📢', cd: 2, t: 'taunt', p: 0, fa: 1, school: 'none', u: 6, d: 'Агро · без хода' }),
      A({ id: 'consecrate', n: 'Освящение', i: '☀️', c: 5, cd: 5, t: 'aoe', fl: 0, u: 8,
        applyDot: { flat: 3, turns: 4, name: 'Освящение', school: 'holy' }, d: 'DoT 3т × 4 · КД 5' }),
      A({ id: 'avengers', n: 'Щит мстителя', i: '🛡️', c: 5, cd: 2, t: 'aoe', fl: 25, aoeBounce: 0.05, shieldFromDmg: 0.25, interruptPrimary: 1, interruptAoeChance: 0.23, u: 12,
        d: '25т AoE · сбивает каст · щит 25% урона' }),
      A({ id: 'hot_r', n: 'Молот праведника', i: '🔨', cs: 3, t: 'damage', fl: 43, u: 16, d: '43т · 3 ES' }),
      A({ id: 'hot_w', n: 'Молот гнева', i: '⚡', c: 6, gs: 1, t: 'damage', p: 1.4, fa: 1, u: 20, d: '≤35% HP · без хода · +1 ES' }),
      A({ id: 'sot_r', n: 'Щит праведника', i: '🧱', cs: 3, t: 'damage', fl: 80, splashFlat: 30, u: 24, d: '80т + 30т остальным · 3 ES' }),
      A({ id: 'ardent', n: 'Ревностный защитник', i: '❤️', cd: 6, t: 'buff', fa: 1, dmgReduce: 0.6, buffTurns: 3, school: 'none', u: 28, d: '−60% урон · 3 хода · без хода' }),
    ],
    retribution: [
      A({ id: 'crusader', n: 'Удар воина Света', i: '⚔️', c: 5, gs: 1, t: 'damage', p: 1.1, u: 1, d: '+1 ES · 5 маны' }),
      A({ id: 'judgment', n: 'Правосудие', i: '⚖️', c: 6, gs: 1, cd: 2, t: 'damage', fl: 23, u: 4, d: '23т · +1 ES' }),
      A({ id: 'templar', n: 'Вердикт храмовника', i: '⚖️', cs: 3, t: 'damage', fl: 38, u: 8, d: '38т · 3 ES' }),
      A({ id: 'inquisition', n: 'Инквизиция', i: '📜', cd: 4, t: 'buff', fa: 1, atkMod: 0.15, buffTurns: 2, school: 'none', u: 12, d: '+15% атаки · 2 хода · без хода' }),
      A({ id: 'divine_storm', n: 'Божественная буря', i: '🌪️', cs: 4, t: 'aoe', fl: 40, u: 16, d: '40т AoE · 4 ES' }),
      A({ id: 'hot_w', n: 'Молот гнева', i: '⚡', c: 6, gs: 1, t: 'damage', p: 1.45, fa: 1, u: 20, d: '≤35% HP · без хода · +1 ES' }),
      A({ id: 'avenging', n: 'Гнев карателя', i: '😇', cd: 5, t: 'buff', fa: 1, critMod: 0.3, buffTurns: 3, school: 'none', u: 26, d: '+30% крит · 3 хода · без хода' }),
    ],
  };

  G.TALENT_TIERS = [
    {
      id: 't1', level: 8, title: 'Шаг',
      picks: [
        { id: 'speed_of_light', name: 'Скорость света', icon: '💨', desc: '+2 к скорости. Ходишь раньше в раунде.' },
        { id: 'long_arm', name: 'Долгая рука закона', icon: '⚖️', desc: 'Правосудие вешает −10% защиты цели на 2 хода.' },
        { id: 'pursuit', name: 'Преследование справедливости', icon: '🏃', desc: '+8% атаки, пока твоё здоровье выше 80%.' },
      ],
    },
    {
      id: 't2', level: 16, title: 'Ресурс',
      picks: [
        { id: 'divine_purpose', name: 'Божественная цель', icon: '🕊️', desc: 'Добродетель: шанс вернуть ES 25% → 40%.' },
        { id: 'holy_avenger', name: 'Святой мститель', icon: '☀️', desc: 'После траты ES следующий генератор даёт +1 ES сверх нормы. Внутри 3 хода.' },
        { id: 'sanctified_wrath', name: 'Освящённый гнев', icon: '😇', desc: 'Пока висит Гнев карателя — +1 ES в начале твоего хода.' },
      ],
    },
    {
      id: 't3', level: 24, title: 'Лицо спека',
      bySpec: {
        retribution: [
          { id: 'blade_of_light', name: 'Клинок Света', icon: '⚔️', desc: 'Вердикт храмовника +15% урона.' },
          { id: 'ash_storm', name: 'Буря пепла', icon: '🌪️', desc: 'Божественная буря стоит 3 Энергии Света, не 4.' },
          { id: 'wrathful_hammer', name: 'Карающий молот', icon: '⚡', desc: 'Молот гнева доступен с 50% здоровья цели.' },
        ],
        protection: [
          { id: 'unbreakable', name: 'Несокрушимый дух', icon: '❤️', desc: 'Ревностный защитник: перезарядка 6 → 4.' },
          { id: 'holy_bulwark', name: 'Святой оплот', icon: '🔰', desc: 'Щит от Щита мстителя: 25% → 40% нанесённого.' },
          { id: 'hallowed_ground', name: 'Освящённая земля', icon: '☀️', desc: 'Освящение 6 ходов. Сплэш Правосудия 60% → 80%.' },
        ],
        holy: [
          { id: 'selfless', name: 'Самоотверженный целитель', icon: '✨', desc: 'Шок небес (хил) +20%.' },
          { id: 'eternal_flame', name: 'Вечное пламя', icon: '🔥', desc: 'Слово славы оставляет HoT 20% от хила на 3 хода.' },
          { id: 'sacred_shield', name: 'Священный щит', icon: '🛡️', desc: 'Божественная защита: щит +50%.' },
        ],
      },
    },
    {
      id: 't4', level: 32, title: 'Приём',
      picks: [
        { id: 'sacrifice', name: 'Длань жертвенности', icon: '🤲', desc: 'Раз в бой, без хода: 30% входящего выбранного союзника идёт в тебя на 2 хода.' },
        { id: 'bubble', name: 'Божественный щит', icon: '💠', desc: 'Раз в инст, без хода: следующий удар по тебе = 0.' },
        { id: 'fierce_light', name: 'Гневный свет', icon: '🌟', desc: 'Крит школы Свет ×1.75 вместо ×1.5.' },
      ],
    },
    {
      id: 't5', level: 40, title: 'Венец',
      picks: [
        { id: 'master_light', name: 'Мастер Света', icon: '📿', desc: '+8 п.п. к эффекту искусности.' },
        { id: 'oathbound', name: 'Закалённый клятвами', icon: '🏰', desc: '+12% здоровья и +8% защиты.' },
        { id: 'blade_justice', name: 'Клинок правосудия', icon: '🗡️', desc: '+12% атаки и +4% крита.' },
      ],
    },
  ];

  G.DUNGEONS = [
    {
      id: 'crypts', name: 'Склеп Эха', theme: 'crypt', min: 1, max: 12,
      boss: { id: 'bl', name: 'Повелитель Склепа', icon: '👑', hp: 520, atk: 18, def: 8, speed: 8 },
      route: [
        { id: 'start', type: 'trash', name: 'Вход', loc: 'entrance' },
        { id: 'c1', type: 'trash', name: 'Коридор костей', loc: 'corridor' },
        { id: 'el', type: 'elite', name: 'Капитан стражи', loc: 'elite' },
        { id: 'mid', type: 'boss', name: 'Страж склепа', loc: 'mid' },
        { id: 'rest', type: 'rest', name: 'Привал', loc: 'rest' },
        { id: 'final', type: 'final', name: 'Трон мёртвых', loc: 'throne' },
      ],
    },
    {
      id: 'forge', name: 'Пепельная Кузня', theme: 'forge', min: 8, max: 20,
      boss: { id: 'eq', name: 'Пепельная Королева', icon: '🔥', hp: 500, atk: 20, def: 6, speed: 11 },
      route: [
        { id: 'start', type: 'trash', name: 'Штрек', loc: 'entrance' },
        { id: 'el', type: 'elite', name: 'Горн', loc: 'elite' },
        { id: 'c1', type: 'trash', name: 'Молоты', loc: 'corridor' },
        { id: 'mid', type: 'boss', name: 'Надсмотрщик', loc: 'mid' },
        { id: 'rest', type: 'rest', name: 'Заслон', loc: 'rest' },
        { id: 'final', type: 'final', name: 'Очаг', loc: 'throne' },
      ],
    },
    {
      id: 'tide', name: 'Затопленный Приливник', theme: 'tide', min: 16, max: 28,
      boss: { id: 'th', name: 'Ужас Прилива', icon: '🌊', hp: 560, atk: 18, def: 9, speed: 8 },
      route: [
        { id: 'start', type: 'trash', name: 'Шлюз', loc: 'entrance' },
        { id: 'c1', type: 'trash', name: 'Кораллы', loc: 'corridor' },
        { id: 'el', type: 'elite', name: 'Лагуна', loc: 'elite' },
        { id: 'mid', type: 'boss', name: 'Смотритель шлюза', loc: 'mid' },
        { id: 'rest', type: 'rest', name: 'Сухой отсек', loc: 'rest' },
        { id: 'final', type: 'final', name: 'Бездна', loc: 'throne' },
      ],
    },
    {
      id: 'jade', name: 'Нефритовый Монастырь', theme: 'jade', min: 24, max: 36,
      boss: { id: 'sha', name: 'Ша Сомнения', icon: '☯️', hp: 545, atk: 20, def: 7, speed: 10 },
      route: [
        { id: 'start', type: 'trash', name: 'Двор', loc: 'entrance' },
        { id: 'el', type: 'elite', name: 'Ученики', loc: 'elite' },
        { id: 'c1', type: 'trash', name: 'Галерея', loc: 'gallery' },
        { id: 'mid', type: 'boss', name: 'Наставник', loc: 'mid' },
        { id: 'rest', type: 'rest', name: 'Сад', loc: 'rest' },
        { id: 'final', type: 'final', name: 'Зал сомнения', loc: 'throne' },
      ],
    },
    {
      id: 'ember', name: 'Угольные Чертоги', theme: 'ember', min: 32, max: 40,
      boss: { id: 'bz', name: 'Пожиратель жара', icon: '🌑', hp: 580, atk: 21, def: 7, speed: 11 },
      route: [
        { id: 'start', type: 'trash', name: 'Зольный проход', loc: 'entrance' },
        { id: 'c1', type: 'trash', name: 'Шахта', loc: 'corridor' },
        { id: 'el', type: 'elite', name: 'Угольный зал', loc: 'elite' },
        { id: 'mid', type: 'boss', name: 'Надсмотрщик жара', loc: 'mid' },
        { id: 'rest', type: 'rest', name: 'Охлаждение', loc: 'rest' },
        { id: 'final', type: 'final', name: 'Очаг', loc: 'throne' },
      ],
    },
  ];

  G.ENEMIES = {
    trash: [
      { id: 'z', name: 'Нежить', icon: '🧟', role: 'dps', hp: 88, atk: 12, def: 4, speed: 9,
        abilities: [{ id: 'h', name: 'Удар', type: 'damage', power: 1.05 }] },
      { id: 'a', name: 'Лучник', icon: '🏹', role: 'dps', hp: 68, atk: 14, def: 2, speed: 12,
        abilities: [
          { id: 'h', name: 'Выстрел', type: 'damage', power: 1.12 },
          { id: 'v', name: 'Залп', type: 'aoe', power: 0.48, cd: 3 },
        ] },
      { id: 'b', name: 'Громила', icon: '💪', role: 'tank', hp: 128, atk: 13, def: 7, speed: 6,
        abilities: [
          { id: 's', name: 'Удар', type: 'damage', power: 1.08 },
          { id: 'slam', name: 'Топот', type: 'aoe', power: 0.48, cd: 3 },
        ] },
      { id: 'm', name: 'Мистик', icon: '🔮', role: 'healer', hp: 66, atk: 11, def: 2, speed: 10,
        abilities: [
          { id: 'b', name: 'Тень', type: 'damage', power: 0.95 },
          { id: 'h', name: 'Хил', type: 'heal', power: 0.28, cd: 2 },
          { id: 'c', name: 'Волна тьмы', type: 'cast_aoe', power: 0.78, cd: 3 },
        ] },
      { id: 'p', name: 'Пиромант', icon: '🔥', role: 'dps', hp: 70, atk: 13, def: 2, speed: 11,
        abilities: [
          { id: 'bolt', name: 'Огонь', type: 'damage', power: 1.05 },
          { id: 'bomb', name: 'Живая бомба', type: 'cast_aoe', power: 0.74, cd: 3 },
        ] },
    ],
    elite: [
      { id: 'c', name: 'Капитан', icon: '🪖', role: 'tank', hp: 210, atk: 17, def: 9, speed: 8,
        abilities: [
          { id: 'c', name: 'Рассечение', type: 'damage', power: 1.22 },
          { id: 'slam', name: 'Удар щитом', type: 'aoe', power: 0.6, cd: 2 },
          { id: 'cast', name: 'Приказ к бою', type: 'cast_aoe', power: 0.82, cd: 3 },
        ] },
      { id: 'j', name: 'Палач', icon: '🪓', role: 'dps', hp: 190, atk: 19, def: 5, speed: 10,
        abilities: [
          { id: 'cleave', name: 'Раскол', type: 'damage', power: 1.25 },
          { id: 'whirl', name: 'Вихрь', type: 'aoe', power: 0.7, cd: 2 },
        ] },
      { id: 'sg', name: 'Каменный страж', icon: '🗿', role: 'tank', hp: 240, atk: 15, def: 12, speed: 6,
        abilities: [
          { id: 'bash', name: 'Сокрушение', type: 'damage', power: 1.15 },
          { id: 'quake', name: 'Землетрясение', type: 'cast_aoe', power: 0.84, cd: 3 },
        ] },
    ],
  };

  G.AI_ROSTER = [
    { classId: 'warrior', specId: 'protection', role: 'tank', name: 'Воин', specName: 'Защита',
      stats: { hp: 170, atk: 12, def: 12, speed: 8 },
      abs: [
        { id: 'ss', name: 'Удар щитом', icon: '🛡️', type: 'damage', flat: 18, gen: 20 },
        { id: 'rev', name: 'Реванш', icon: '↩️', type: 'aoe', flat: 17, cost: 15, cd: 2 },
        { id: 'taunt', name: 'Провокация', icon: '📢', type: 'taunt', freeAction: true, cd: 2 },
        { id: 'sw', name: 'Глухая оборона', icon: '🏰', type: 'buff', dmgReduce: 0.5, buffTurns: 2, freeAction: true, cd: 8 },
      ] },
    { classId: 'deathknight', specId: 'blood', role: 'tank', name: 'Рыцарь смерти', specName: 'Кровь',
      stats: { hp: 165, atk: 13, def: 11, speed: 8 },
      abs: [
        { id: 'hs', name: 'Удар смерти', icon: '🩸', type: 'damage', flat: 20 },
        { id: 'bb', name: 'Вскипание', icon: '💀', type: 'aoe', flat: 14, cd: 2 },
        { id: 'taunt', name: 'Хватка смерти', icon: '📢', type: 'taunt', freeAction: true, cd: 2 },
        { id: 'ibf', name: 'Незыблемость льда', icon: '🧊', type: 'buff', dmgReduce: 0.4, buffTurns: 2, freeAction: true, cd: 7 },
      ] },
    { classId: 'monk', specId: 'brewmaster', role: 'tank', name: 'Монах', specName: 'Хмелевар',
      stats: { hp: 160, atk: 12, def: 10, speed: 10 },
      abs: [
        { id: 'ks', name: 'Нокаут', icon: '👊', type: 'damage', flat: 16 },
        { id: 'breath', name: 'Дыхание огня', icon: '🔥', type: 'aoe', flat: 14, cd: 2 },
        { id: 'taunt', name: 'Вызов', icon: '📢', type: 'taunt', freeAction: true, cd: 2 },
      ] },
    { classId: 'priest', specId: 'holy', role: 'healer', name: 'Жрец', specName: 'Свет',
      stats: { hp: 92, atk: 15, def: 4, speed: 10 },
      abs: [
        { id: 'heal', name: 'Быстрое исцеление', icon: '💚', type: 'heal', flat: 32, cost: 12 },
        { id: 'gh', name: 'Великое исцеление', icon: '✨', type: 'heal', flat: 44, cost: 18 },
        { id: 'coh', name: 'Молитва исцеления', icon: '🙏', type: 'heal_aoe', flat: 16, cost: 16, cd: 2 },
        { id: 'smite', name: 'Кара', icon: '✝️', type: 'damage', flat: 12 },
      ] },
    { classId: 'shaman', specId: 'restoration', role: 'healer', name: 'Шаман', specName: 'Исцеление',
      stats: { hp: 94, atk: 15, def: 4, speed: 10 },
      abs: [
        { id: 'hw', name: 'Волна исцеления', icon: '🌊', type: 'heal', flat: 34, cost: 14 },
        { id: 'ch', name: 'Цепное исцеление', icon: '🔗', type: 'heal_aoe', flat: 18, cost: 16, cd: 2 },
        { id: 'lb', name: 'Молния', icon: '⚡', type: 'damage', flat: 14 },
      ] },
    { classId: 'druid', specId: 'restoration', role: 'healer', name: 'Друид', specName: 'Исцеление',
      stats: { hp: 96, atk: 14, def: 5, speed: 10 },
      abs: [
        { id: 'ht', name: 'Целительное прикосновение', icon: '🍃', type: 'heal', flat: 33, cost: 14 },
        { id: 'wg', name: 'Буйный рост', icon: '🌼', type: 'heal_aoe', flat: 17, cost: 16, cd: 2 },
        { id: 'wrath', name: 'Гнев', icon: '⭐', type: 'damage', flat: 13 },
      ] },
    { classId: 'monk', specId: 'mistweaver', role: 'healer', name: 'Монах', specName: 'Ткач туманов',
      stats: { hp: 93, atk: 15, def: 4, speed: 11 },
      abs: [
        { id: 'soom', name: 'Успокаивающий туман', icon: '☁️', type: 'heal', flat: 30, cost: 10 },
        { id: 'ef', name: 'Заживляющий туман', icon: '💚', type: 'heal_aoe', flat: 16, cost: 14, cd: 2 },
        { id: 'tiger', name: 'Нокаут', icon: '🐯', type: 'damage', flat: 12 },
      ] },
    { classId: 'mage', specId: 'fire', role: 'dps', name: 'Маг', specName: 'Огонь',
      stats: { hp: 90, atk: 18, def: 3, speed: 12 },
      abs: [
        { id: 'fb', name: 'Огненный шар', icon: '🔥', type: 'damage', flat: 22 },
        { id: 'pyro', name: 'Огненная глыба', icon: '🌋', type: 'damage', flat: 34, cd: 3 },
        { id: 'blast', name: 'Взрыв', icon: '💥', type: 'aoe', flat: 16, cd: 2 },
      ] },
    { classId: 'rogue', specId: 'combat', role: 'dps', name: 'Разбойник', specName: 'Бой',
      stats: { hp: 100, atk: 17, def: 3, speed: 15 },
      abs: [
        { id: 'ss', name: 'Коварный удар', icon: '🗡️', type: 'damage', flat: 20 },
        { id: 'evis', name: 'Потрошение', icon: '🩸', type: 'damage', flat: 32, cd: 2 },
        { id: 'fan', name: 'Веер клинков', icon: '🌀', type: 'aoe', flat: 14, cd: 2 },
      ] },
    { classId: 'hunter', specId: 'marksmanship', role: 'dps', name: 'Охотник', specName: 'Стрельба',
      stats: { hp: 98, atk: 17, def: 3, speed: 12 },
      abs: [
        { id: 'aimed', name: 'Прицельный выстрел', icon: '🎯', type: 'damage', flat: 28, cd: 2 },
        { id: 'arcane', name: 'Чародейский выстрел', icon: '💜', type: 'damage', flat: 18 },
        { id: 'multi', name: 'Залп', icon: '🏹', type: 'aoe', flat: 14, cd: 2 },
        { id: 'ks', name: 'Убийственный выстрел', icon: '💀', type: 'damage', flat: 36, cd: 2, execute: true },
      ] },
    { classId: 'warlock', specId: 'destruction', role: 'dps', name: 'Чернокнижник', specName: 'Разрушение',
      stats: { hp: 96, atk: 17, def: 3, speed: 10 },
      abs: [
        { id: 'incin', name: 'Испепеление', icon: '🔥', type: 'damage', flat: 18 },
        { id: 'chaos', name: 'Стрела Хаоса', icon: '☄️', type: 'damage', flat: 36, cd: 3 },
        { id: 'rain', name: 'Огненный ливень', icon: '🌧️', type: 'aoe', flat: 15, cd: 2 },
      ] },
    { classId: 'shaman', specId: 'elemental', role: 'dps', name: 'Шаман', specName: 'Стихии',
      stats: { hp: 98, atk: 16, def: 4, speed: 11 },
      abs: [
        { id: 'lb', name: 'Молния', icon: '⚡', type: 'damage', flat: 18 },
        { id: 'lvb', name: 'Выброс лавы', icon: '🌋', type: 'damage', flat: 30, cd: 2 },
        { id: 'cl', name: 'Цепная молния', icon: '🌩️', type: 'aoe', flat: 14, cd: 2 },
      ] },
    { classId: 'warrior', specId: 'arms', role: 'dps', name: 'Воин', specName: 'Оружие',
      stats: { hp: 110, atk: 17, def: 5, speed: 10 },
      abs: [
        { id: 'ms', name: 'Смертельный удар', icon: '⚔️', type: 'damage', flat: 22 },
        { id: 'slam', name: 'Мощный удар', icon: '👊', type: 'damage', flat: 30, cost: 20 },
        { id: 'ww', name: 'Вихрь', icon: '🌪️', type: 'aoe', flat: 14, cd: 3 },
        { id: 'exec', name: 'Казнь', icon: '☠️', type: 'damage', flat: 38, execute: true },
      ] },
    { classId: 'deathknight', specId: 'frost', role: 'dps', name: 'Рыцарь смерти', specName: 'Лёд',
      stats: { hp: 108, atk: 17, def: 5, speed: 10 },
      abs: [
        { id: 'oblit', name: 'Уничтожение', icon: '❄️', type: 'damage', flat: 26 },
        { id: 'fs', name: 'Ледяной удар', icon: '🧊', type: 'damage', flat: 22 },
        { id: 'howl', name: 'Воющий ветер', icon: '🌬️', type: 'aoe', flat: 15, cd: 2 },
      ] },
    { classId: 'paladin', specId: 'holy', role: 'healer', name: 'Паладин', specName: 'Свет',
      stats: { hp: 95, atk: 15, def: 5, speed: 10 },
      abs: [
        { id: 'hl', name: 'Свет небес', icon: '🔆', type: 'heal', flat: 35, cost: 16 },
        { id: 'shock', name: 'Шок небес', icon: '✨', type: 'heal', flat: 27, cd: 2 },
        { id: 'rad', name: 'Сияние', icon: '🌅', type: 'heal_aoe', flat: 18, cost: 16, cd: 2 },
        { id: 'cs', name: 'Удар воина Света', icon: '⚔️', type: 'damage', flat: 10 },
      ] },
    { classId: 'paladin', specId: 'retribution', role: 'dps', name: 'Паладин', specName: 'Воздаяние',
      stats: { hp: 105, atk: 17, def: 5, speed: 11 },
      abs: [
        { id: 'cs', name: 'Удар воина Света', icon: '⚔️', type: 'damage', flat: 18 },
        { id: 'tv', name: 'Вердикт', icon: '⚖️', type: 'damage', flat: 34, cd: 1 },
        { id: 'ds', name: 'Божественная буря', icon: '🌪️', type: 'aoe', flat: 22, cd: 2 },
      ] },
    { classId: 'paladin', specId: 'protection', role: 'tank', name: 'Паладин', specName: 'Защита',
      stats: { hp: 168, atk: 12, def: 12, speed: 8 },
      abs: [
        { id: 'cs', name: 'Удар воина Света', icon: '⚔️', type: 'damage', flat: 18 },
        { id: 'as', name: 'Щит мстителя', icon: '🛡️', type: 'aoe', flat: 22, cd: 2, interrupt: true },
        { id: 'taunt', name: 'Длань расплаты', icon: '📢', type: 'taunt', freeAction: true, cd: 2 },
      ] },
  ];

  G.AI_NAMES = {
    tank: ['Бромир', 'Каел', 'Торвак', 'Щитолом', 'Гуннар', 'Хельм'],
    healer: ['Лирия', 'Мяо', 'Элен', 'Светлана', 'Ирис', 'Нефрит'],
    dps: ['Кай', 'Рен', 'Вэй', 'Астра', 'Гром', 'Синь', 'Яро', 'Нин', 'Волк', 'Искра'],
  };

  G.PORTRAIT = function (classId, specId) {
    if (classId && specId) return G.ASSETS + 'portraits/specs/' + classId + '_' + specId + '.png';
    return G.ASSETS + 'portraits/classes/' + classId + '.png';
  };
  G.ENEMY_ART = function (id) {
    return G.ASSETS + 'portraits/enemies/' + id + '.png';
  };
  G.BG = function (theme, loc) {
    return G.ASSETS + 'backgrounds/' + theme + '/' + loc + '.png';
  };
})(window.LP = window.LP || {});
