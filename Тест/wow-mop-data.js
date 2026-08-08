/**
 * World of Warcraft — Mists of Pandaria (MoP Classic)
 * Классы, специализации, активные боевые способности и ресурсы.
 * Источник структуры: Wowhead MoP Classic class guides / spell database.
 * В бою — основные активные скиллы ротации + ключевые кд (не пассивы/глифы).
 */
(function (global) {
  'use strict';

  // shorthand ability builder
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
      'grantSelfBuff', 'abilityCharges', 'splashFlat', 'lifesteal', 'petAtkMod',
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

  const WOW_CLASSES = [
    // ═══════════════════════════════════════
    // WARRIOR — Rage
    // ═══════════════════════════════════════
    {
      id: 'warrior', name: 'Воин', nameEn: 'Warrior', icon: '⚔️', color: '#C79C6E',
      resource: { type: 'rage', name: 'Ярость', icon: '💢', max: 100, start: 20, regen: 8 },
      secondary: null,
      specs: [
        {
          id: 'arms', name: 'Оружие', nameEn: 'Arms', role: 'dps', icon: '🗡️',
          stats: { hp: 110, atk: 17, def: 5, speed: 10 },
          // Заметка: актуальный баланс — class-balance/warrior-abilities.js (apply-all перезаписывает specs)
          abilities: [
            A({ id: 'ms', n: 'Смертельный удар', en: 'Mortal Strike', i: '⚔️', g: 20, cd: 2, t: 'damage', p: 1, flat: 15, school: 'physical', applyDot: { flat: 5, turns: 4, name: 'Кровотечение', icon: '🩸', id: 'bleed', school: 'physical' }, d: '', sid: 12294 }),
            A({ id: 'whirlwind', n: 'Вихрь', en: 'Whirlwind', i: '🌪️', c: 20, cd: 9, t: 'aoe', p: 1, flat: 9, hits: 2, school: 'physical', grantSelfBuff: { id: 'wide_sweep', name: 'Широкий размах', icon: '🌀', turns: 99, stacks: 1, tip: 'Героический удар дублируется на остальных (40%)' }, d: '', sid: 1680 }),
            A({ id: 'overpower', n: 'Превосходство', en: 'Overpower', i: '💥', g: 15, t: 'damage', p: 1, flat: 12, cleaveFlat: 4, school: 'physical', d: '', sid: 7384 }),
            A({ id: 'colossus', n: 'Удар колосса', en: 'Colossus Smash', i: '🔨', cd: 3, t: 'damage', p: 1, flat: 21, school: 'physical', vuln: { amount: 0.2, turns: 3, physical: true }, applyDot: { flat: 5, turns: 4, name: 'Кровотечение', icon: '🩸', id: 'bleed', school: 'physical' }, d: '', sid: 86346 }),
            A({ id: 'slam', n: 'Мощный удар', en: 'Slam', i: '👊', c: 20, t: 'damage', p: 1, flat: 30, school: 'physical', d: '', sid: 1464 }),
            A({ id: 'execute', n: 'Казнь', en: 'Execute', i: '☠️', c: 40, t: 'damage', p: 1, flat: 40, school: 'physical', d: '', sid: 5308 }),
            A({ id: 'heroic', n: 'Героический удар', en: 'Heroic Strike', i: '🗡️', c: 35, t: 'damage', p: 1, flat: 20, school: 'physical', applyDot: { flat: 5, turns: 4, name: 'Кровотечение', icon: '🩸', id: 'bleed', school: 'physical' }, d: '', sid: 78 }),
            A({ id: 'charge', n: 'Рывок', en: 'Charge', i: '🏃', g: 10, cd: 4, t: 'damage', p: 1, flat: 3, freeAction: true, school: 'physical', d: '', sid: 100 }),
            A({ id: 'reck', n: 'Безрассудство', en: 'Recklessness', i: '🔥', cd: 7, t: 'buff', p: 0.35, abilityCharges: 2, freeAction: true, school: 'none', d: '+35% атаки на следующие 2 удара · не тратит ход', sid: 1719 }),
          ],
        },
        {
          id: 'fury', name: 'Неистовство', nameEn: 'Fury', role: 'dps', icon: '😤',
          stats: { hp: 115, atk: 16, def: 4, speed: 12 },
          abilities: [
            A({ id: 'bt', n: 'Кровавая жажда', en: 'Bloodthirst', i: '🩸', g: 10, cd: 1, t: 'damage', p: 1.1, d: 'Генератор: +10 ярости, вампиризм.', sid: 23881 }),
            A({ id: 'rb', n: 'Яростный выпад', en: 'Raging Blow', i: '💢', c: 10, t: 'damage', p: 1.55, d: 'Расход 10 ярости — быстрый удар.', sid: 85288 }),
            A({ id: 'ww', n: 'Вихрь', en: 'Whirlwind', i: '🌪️', c: 30, t: 'aoe', p: 0.95, d: 'Расход 30 — по области.', sid: 1680 }),
            A({ id: 'wild_strike', n: 'Буйный удар', en: 'Wild Strike', i: '⚡', c: 30, t: 'damage', p: 1.65, d: 'Главный расходник 30 ярости.', sid: 100130 }),
            A({ id: 'colossus', n: 'Удар колосса', en: 'Colossus Smash', i: '🔨', c: 20, cd: 3, t: 'damage', p: 1.5, d: 'Расход 20 ярости (упрощ. для неистовства).', sid: 86346 }),
            A({ id: 'execute', n: 'Казнь', en: 'Execute', i: '☠️', c: 30, t: 'damage', p: 2.05, d: 'Расход 30. Только ≤35% HP.', sid: 5308 }),
            A({ id: 'berserker', n: 'Ярость берсерка', en: 'Berserker Rage', i: '😡', cd: 3, t: 'buff', p: 0.15, g: 10, d: '+атака и +10 ярости.', sid: 18499 }),
            A({ id: 'reck', n: 'Безрассудство', en: 'Recklessness', i: '🔥', cd: 7, t: 'buff', p: 0.35, abilityCharges: 2, freeAction: true, school: 'none', d: '+35% атаки на следующие 2 удара · не тратит ход', sid: 1719 }),
            A({ id: 'dragon_roar', n: 'Рёв дракона', en: 'Dragon Roar', i: '🐉', cd: 3, t: 'aoe', p: 0.85, d: 'Талант: урон по области (без ярости).', sid: 118000 }),
          ],
        },
        {
          id: 'protection', name: 'Защита', nameEn: 'Protection', role: 'tank', icon: '🛡️',
          stats: { hp: 170, atk: 12, def: 12, speed: 8 },
          abilities: [
            A({ id: 'shield_slam', n: 'Удар щитом', en: 'Shield Slam', i: '🛡️', g: 30, t: 'damage', fl: 18, d: '18т · +30 ярости', sid: 23922 }),
            A({ id: 'revenge', n: 'Реванш', en: 'Revenge', i: '↩️', c: 15, cd: 2, t: 'aoe', fl: 17, d: '17т AoE · 15 ярости · авто при блоке', sid: 6572 }),
            A({ id: 'thunder', n: 'Удар грома', en: 'Thunder Clap', i: '⛈️', g: 10, cd: 2, t: 'aoe', fl: 20, fa: 1, d: '20т AoE · +10 ярости · без хода', sid: 6343 }),
            A({ id: 'shield_block', n: 'Блок щитом', en: 'Shield Block', i: '🧱', c: 10, cd: 5, t: 'buff', fa: 1, ch: 2, blockChanceAdd: 0.5, blockValueAdd: 0.2, bt: 2, d: '2 заряда · +50% блок / +20% сила · 2 хода · без хода', sid: 2565 }),
            A({ id: 'shield_wall', n: 'Глухая оборона', en: 'Shield Wall', i: '🏰', cd: 8, t: 'buff', fa: 1, dr: 0.6, bt: 2, d: '−60% весь урон · 2 хода · без хода', sid: 871 }),
            A({ id: 'last_stand', n: 'Ни шагу назад', en: 'Last Stand', i: '❤️', cd: 10, t: 'buff', fa: 1, hpPct: 0.5, bt: 3, grantBlock: 1, d: '+50% макс. HP · Блок щитом · 3 хода · без хода', sid: 12975 }),
            A({ id: 'taunt', n: 'Провокация', en: 'Taunt', i: '📢', cd: 2, t: 'taunt', p: 0, fa: 1, d: 'Агро · без хода', sid: 355 }),
            A({ id: 'heroic_leap', n: 'Героический прыжок', en: 'Heroic Leap', i: '🦘', cd: 5, t: 'aoe', fl: 2, fa: 1, dr: 0.05, bt: 2, d: '2т AoE · −5% урон 2 хода · без хода', sid: 6544 }),
            A({ id: 'demo_shout', n: 'Деморализующий крик', en: 'Demoralizing Shout', i: '😨', c: 40, cd: 3, t: 'debuff', enemyDmgMod: 0.15, bt: 3, d: '−15% урон врагов · 40 ярости', sid: 1160 }),
          ],
        },
      ],
    },

    // ═══════════════════════════════════════
    // PALADIN — Mana + Holy Power
    // ═══════════════════════════════════════
    {
      id: 'paladin', name: 'Паладин', nameEn: 'Paladin', icon: '✝️', color: '#F58CBA',
      resource: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 6 },
      secondary: { type: 'holy_power', name: 'Энергия Света', icon: '☀️', max: 5, start: 3 },
      specs: [
        {
          id: 'holy', name: 'Свет', nameEn: 'Holy', role: 'healer', icon: '🌟',
          stats: { hp: 95, atk: 15, def: 5, speed: 10 },
          resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 4 },
          abilities: [
            // 5.4.8.14+ (синхрон pack): Сияние 18 · Свет небес 35 · Вспышка 27 · Слово 80 · Заря 30 · Шок 27
            A({ id: 'holy_shock', n: 'Шок небес', en: 'Holy Shock', i: '✨', c: 3, gs: 1, cd: 2, t: 'heal', flat: 27, fl: 27, critBonus: 0.2, holyShock: 1, school: 'holy', applyHot: { flat: 7, turns: 5, name: 'Шок небес' }, d: 'СТ · 27т · хил/урон · +1 ES · +20% крит', sid: 20473 }),
            A({ id: 'holy_light', n: 'Свет небес', en: 'Holy Light', i: '🔆', c: 16, t: 'heal', flat: 35, fl: 35, school: 'holy', d: 'СТ · 35т · 16 маны', sid: 635 }),
            A({ id: 'flash', n: 'Вспышка Света', en: 'Flash of Light', i: '⚡', c: 12, t: 'heal', flat: 27, fl: 27, school: 'holy', d: 'СТ · 27т · 12 маны', sid: 19750 }),
            A({ id: 'holy_radiance', n: 'Сияние света', en: 'Holy Radiance', i: '🌅', c: 16, t: 'heal_aoe', flat: 18, fl: 18, school: 'holy', d: 'АОЕ · 18т · 16 маны', sid: 82327 }),
            A({ id: 'word_glory', n: 'Слово славы', en: 'Word of Glory', i: '💫', cs: 3, t: 'heal', flat: 80, fl: 80, school: 'holy', d: 'СТ · 80т · 3 ES', sid: 85673 }),
            A({ id: 'light_dawn', n: 'Свет зари', en: 'Light of Dawn', i: '🌄', cs: 2, cd: 2, t: 'heal_aoe', flat: 30, fl: 30, school: 'holy', d: 'АОЕ · 30т · 2 ES', sid: 85222 }),
            A({ id: 'crusader', n: 'Удар воина Света', en: 'Crusader Strike', i: '⚔️', c: 2, gs: 1, t: 'damage', flat: 10, fl: 10, school: 'holy', d: '10т · 2 маны · +1 ES', sid: 35395 }),
            A({ id: 'divine_prot', n: 'Божественная защита', en: 'Divine Protection', i: '🛡️', cd: 6, t: 'shield', flat: 40, fl: 40, fa: 1, school: 'holy', d: 'Щит 40т · без хода', sid: 498 }),
            A({ id: 'avenging', n: 'Гнев карателя', en: 'Avenging Wrath', i: '😇', cd: 7, t: 'buff', fa: 1, cm: 0.3, bt: 4, school: 'none', d: '+30% крит · 4 хода · без хода', sid: 31884 }),
          ],
        },
        {
          id: 'protection', name: 'Защита', nameEn: 'Protection', role: 'tank', icon: '🛡️',
          stats: { hp: 168, atk: 12, def: 12, speed: 8 },
          resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 10 },
          abilities: [
            A({ id: 'crusader', n: 'Удар воина Света', en: 'Crusader Strike', i: '⚔️', c: 2, gs: 1, t: 'damage', fl: 18, am: 0.04, armorStacksMax: 2, bt: 3, school: 'holy', d: '18т · 2 маны · +1 ES · броня +4% (2 стака)', sid: 35395 }),
            A({ id: 'judgment', n: 'Правосудие', en: 'Judgment', i: '⚖️', c: 4, gs: 1, t: 'damage', fl: 15, school: 'holy', vuln: { amount: 0.05, turns: 4, physical: false }, judgmentConsecrateSplash: 0.6, d: '15т · +60% по целям под Освящением · +1 ES', sid: 20271 }),
            A({ id: 'avengers', n: 'Щит мстителя', en: "Avenger's Shield", i: '🛡️', c: 5, cd: 2, t: 'aoe', fl: 25, aoeBounce: 0.05, shieldFromDmg: 0.25, school: 'holy', interruptPrimary: 1, interruptAoeChance: 0.23, d: '25т AoE · сбивает каст кликнутой · 23% у остальных · КД 2', sid: 31935 }),
            A({ id: 'hot_r', n: 'Молот праведника', en: 'Hammer of the Righteous', i: '🔨', cs: 3, t: 'damage', fl: 43, school: 'holy', d: '43т СТ · 3 ES', sid: 53595 }),
            A({ id: 'sot_r', n: 'Щит праведника', en: 'Shield of the Righteous', i: '🧱', cs: 3, t: 'damage', flat: 80, fl: 80, splashFlat: 30, school: 'holy', d: '80т основной · 30т остальным · Щит света +10% брони 4х макс.2 · 3 ES', sid: 53600 }),
            A({ id: 'consecrate', n: 'Освящение', en: 'Consecration', i: '☀️', c: 5, cd: 5, t: 'aoe', fl: 0, school: 'holy', applyDot: { flat: 3, turns: 4, name: 'Освящение', school: 'holy' }, d: 'DoT 3т×4 · 5 маны · КД 5', sid: 26573 }),
            A({ id: 'hot_w', n: 'Молот гнева', en: 'Hammer of Wrath', i: '⚡', c: 6, gs: 1, t: 'damage', p: 1.4, school: 'holy', fa: 1, d: '≤35% HP · не тратит ход · +1 ES', sid: 24275 }),
            A({ id: 'ardent', n: 'Ревностный защитник', en: 'Ardent Defender', i: '❤️', cd: 6, t: 'buff', fa: 1, dr: 0.6, bt: 3, d: '−60% весь урон · 3 хода · без хода', sid: 31850 }),
            A({ id: 'taunt', n: 'Длань расплаты', en: 'Hand of Reckoning', i: '📢', cd: 2, t: 'taunt', p: 0, fa: 1, d: 'Агро · без хода', sid: 62124 }),
          ],
        },
        {
          id: 'retribution', name: 'Воздаяние', nameEn: 'Retribution', role: 'dps', icon: '🔨',
          stats: { hp: 105, atk: 17, def: 5, speed: 11 },
          resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 10 },
          abilities: [
            A({ id: 'crusader', n: 'Удар воина Света', en: 'Crusader Strike', i: '⚔️', c: 5, gs: 1, t: 'damage', p: 1.1, school: 'holy', d: '+1 ES · 5 маны', sid: 35395 }),
            A({ id: 'judgment', n: 'Правосудие', en: 'Judgment', i: '⚖️', c: 6, gs: 1, cd: 1, t: 'damage', fl: 23, school: 'holy', d: '23т · +1 ES', sid: 20271 }),
            A({ id: 'templar', n: 'Вердикт храмовника', en: "Templar's Verdict", i: '⚖️', cs: 3, t: 'damage', fl: 38, school: 'holy', d: '38т · 3 ES', sid: 85256 }),
            A({ id: 'divine_storm', n: 'Божественная буря', en: 'Divine Storm', i: '🌪️', cs: 4, t: 'aoe', fl: 40, school: 'holy', d: '40т AoE · 4 ES', sid: 53385 }),
            A({ id: 'hot_w', n: 'Молот гнева', en: 'Hammer of Wrath', i: '⚡', c: 6, gs: 1, t: 'damage', p: 1.45, school: 'holy', fa: 1, d: '≤35% HP · не тратит ход · +1 ES', sid: 24275 }),
            A({ id: 'inquisition', n: 'Инквизиция', en: 'Inquisition', i: '📜', cd: 4, t: 'buff', fa: 1, atkMod: 0.15, bt: 2, d: '+15% ATK · 2 хода · без хода', sid: 84963 }),
            A({ id: 'avenging', n: 'Гнев карателя', en: 'Avenging Wrath', i: '😇', cd: 5, t: 'buff', fa: 1, cm: 0.3, bt: 3, d: '+30% крит · 3 хода · без хода', sid: 31884 }),
          ],
        },
      ],
    },

    // ═══════════════════════════════════════
    // HUNTER — Focus
    // ═══════════════════════════════════════
    {
      id: 'hunter', name: 'Охотник', nameEn: 'Hunter', icon: '🏹', color: '#ABD473',
      resource: { type: 'focus', name: 'Концентрация', icon: '🎯', max: 100, start: 100, regen: 14 },
      secondary: null,
      specs: [
        {
          id: 'beast_mastery', name: 'Повелитель зверей', nameEn: 'Beast Mastery', role: 'dps', icon: '🐺',
          stats: { hp: 100, atk: 16, def: 3, speed: 12 },
          abilities: [
            A({ id: 'kill_cmd', n: 'Команда «Взять!»', en: 'Kill Command', i: '🐾', c: 35, cd: 1, t: 'damage', p: 1.55, d: 'Главный расход — питомец бьёт.', sid: 34026 }),
            A({ id: 'cobra', n: 'Выстрел кобры', en: 'Cobra Shot', i: '🐍', g: 18, t: 'damage', p: 0.8, d: 'Генератор: +18 концентрации.', sid: 77767 }),
            A({ id: 'arcane_shot', n: 'Чародейский выстрел', en: 'Arcane Shot', i: '💜', c: 25, t: 'damage', p: 1.25, d: 'Расход 25 концентрации.', sid: 3044 }),
            A({ id: 'kill_shot', n: 'Убийственный выстрел', en: 'Kill Shot', i: '💀', c: 15, cd: 2, t: 'damage', p: 1.9, d: 'Добивание ≤35%.', sid: 53351 }),
            A({ id: 'multi', n: 'Залп', en: 'Multi-Shot', i: '🏹', c: 35, t: 'aoe', p: 0.8, d: 'Расход 35 — по области.', sid: 2643 }),
            A({ id: 'bestial', n: 'Звериный гнев', en: 'Bestial Wrath', i: '😤', cd: 4, t: 'buff', p: 0.3, d: '+атака вам и питомцу.', sid: 19574 }),
            A({ id: 'rapid', n: 'Быстрая стрельба', en: 'Rapid Fire', i: '💨', cd: 5, t: 'buff', p: 0.25, d: '+атака (перезарядка).', sid: 3045 }),
            A({ id: 'serpent', n: 'Укус змеи', en: 'Serpent Sting', i: '🐍', c: 20, cd: 2, t: 'dot', p: 0.6, d: 'Расход 20 — периодический урон.', sid: 1978 }),
            A({ id: 'dire', n: 'Зверь', en: 'Dire Beast', i: '🐻', cd: 2, t: 'damage', p: 1.05, g: 12, d: 'Талант: урон + зверь, +12 концентрации.', sid: 120679 }),
          ],
        },
        {
          id: 'marksmanship', name: 'Стрельба', nameEn: 'Marksmanship', role: 'dps', icon: '🎯',
          stats: { hp: 98, atk: 17, def: 3, speed: 12 },
          abilities: [
            A({ id: 'chimera', n: 'Выстрел химеры', en: 'Chimera Shot', i: '🐲', c: 40, cd: 2, t: 'damage', p: 1.55, d: 'Главный расход концентрации.', sid: 53209 }),
            A({ id: 'steady', n: 'Верный выстрел', en: 'Steady Shot', i: '➡️', g: 18, t: 'damage', p: 0.75, d: 'Генератор: +18 концентрации.', sid: 56641 }),
            A({ id: 'aimed', n: 'Прицельный выстрел', en: 'Aimed Shot', i: '🎯', c: 45, t: 'damage', p: 1.7, d: 'Дорогой сильный удар.', sid: 19434 }),
            A({ id: 'arcane', n: 'Чародейский выстрел', en: 'Arcane Shot', i: '💜', c: 25, t: 'damage', p: 1.25, d: 'Расход 25 — заполнитель.', sid: 3044 }),
            A({ id: 'kill_shot', n: 'Убийственный выстрел', en: 'Kill Shot', i: '💀', c: 15, cd: 2, t: 'damage', p: 1.9, d: 'Добивание ≤35%.', sid: 53351 }),
            A({ id: 'multi', n: 'Залп', en: 'Multi-Shot', i: '🏹', c: 35, t: 'aoe', p: 0.8, d: 'По области.', sid: 2643 }),
            A({ id: 'rapid', n: 'Быстрая стрельба', en: 'Rapid Fire', i: '💨', cd: 5, t: 'buff', p: 0.3, d: '+атака.', sid: 3045 }),
            A({ id: 'serpent', n: 'Укус змеи', en: 'Serpent Sting', i: '🐍', c: 20, cd: 2, t: 'dot', p: 0.6, d: 'Периодический урон.', sid: 1978 }),
          ],
        },
        {
          id: 'survival', name: 'Выживание', nameEn: 'Survival', role: 'dps', icon: '🪤',
          stats: { hp: 102, atk: 16, def: 4, speed: 12 },
          abilities: [
            A({ id: 'explosive', n: 'Разрывной выстрел', en: 'Explosive Shot', i: '💣', c: 25, cd: 1, t: 'damage', p: 1.5, d: 'Главный расход концентрации.', sid: 53301 }),
            A({ id: 'cobra', n: 'Выстрел кобры', en: 'Cobra Shot', i: '🐍', g: 18, t: 'damage', p: 0.8, d: 'Генератор: +18 концентрации.', sid: 77767 }),
            A({ id: 'arcane', n: 'Чародейский выстрел', en: 'Arcane Shot', i: '💜', c: 25, t: 'damage', p: 1.25, d: 'Расход 25.', sid: 3044 }),
            A({ id: 'black_arrow', n: 'Чёрная стрела', en: 'Black Arrow', i: '🖤', c: 30, cd: 3, t: 'dot', p: 0.8, d: 'Сильный DoT.', sid: 3674 }),
            A({ id: 'multi', n: 'Залп', en: 'Multi-Shot', i: '🏹', c: 35, t: 'aoe', p: 0.85, d: 'По области.', sid: 2643 }),
            A({ id: 'serpent', n: 'Укус змеи', en: 'Serpent Sting', i: '🐍', c: 20, cd: 2, t: 'dot', p: 0.6, d: 'Периодический урон.', sid: 1978 }),
            A({ id: 'kill_shot', n: 'Убийственный выстрел', en: 'Kill Shot', i: '💀', c: 15, cd: 2, t: 'damage', p: 1.9, d: 'Добивание ≤35%.', sid: 53351 }),
            A({ id: 'rapid', n: 'Быстрая стрельба', en: 'Rapid Fire', i: '💨', cd: 5, t: 'buff', p: 0.25, d: '+атака.', sid: 3045 }),
            A({ id: 'explosive_trap', n: 'Взрывная ловушка', en: 'Explosive Trap', i: '🔥', c: 20, cd: 3, t: 'aoe', p: 0.9, d: 'Ловушка: урон по области.', sid: 13813 }),
          ],
        },
      ],
    },

    // ═══════════════════════════════════════
    // ROGUE — Energy + Combo Points
    // ═══════════════════════════════════════
    {
      id: 'rogue', name: 'Разбойник', nameEn: 'Rogue', icon: '🗡️', color: '#FFF569',
      resource: { type: 'energy', name: 'Энергия', icon: '⚡', max: 100, start: 100, regen: 20 },
      secondary: { type: 'combo', name: 'Серия приёмов', icon: '🃏', max: 5, start: 0 },
      specs: [
        {
          id: 'assassination', name: 'Ликвидация', nameEn: 'Assassination', role: 'dps', icon: '☠️',
          stats: { hp: 95, atk: 18, def: 3, speed: 14 },
          abilities: [
            A({ id: 'mutilate', n: 'Мясорубка', en: 'Mutilate', i: '🔪', c: 55, gs: 2, t: 'damage', p: 1.35, d: 'Даёт 2 приёма серии.', sid: 1329 }),
            A({ id: 'dispatch', n: 'Ликвидация', en: 'Dispatch', i: '🗡️', c: 30, gs: 1, t: 'damage', p: 1.4, d: 'Приём серии по ослабленной цели.', sid: 111240 }),
            A({ id: 'envenom', n: 'Отравление', en: 'Envenom', i: '💚', c: 35, cs: 1, t: 'damage', p: 1.5, d: 'Завершающий приём (1–5 серии).', sid: 32645 }),
            A({ id: 'rupture', n: 'Рваная рана', en: 'Rupture', i: '🩸', c: 25, cs: 1, t: 'dot', p: 0.7, d: 'Завершающее кровотечение.', sid: 1943 }),
            A({ id: 'vendetta', n: 'Вендетта', en: 'Vendetta', i: '🎯', cd: 5, t: 'debuff', p: 0.3, d: '−защита / +урон по цели.', sid: 79140 }),
            A({ id: 'fan', n: 'Веер клинков', en: 'Fan of Knives', i: '🌀', c: 35, gs: 1, t: 'aoe', p: 0.65, d: 'По области + приём серии.', sid: 51723 }),
            A({ id: 'garrote', n: 'Гаррота', en: 'Garrote', i: '🤐', c: 45, gs: 1, cd: 2, t: 'dot', p: 0.6, d: 'Кровотечение с немотой.', sid: 703 }),
            A({ id: 'slice', n: 'Мясорубка (серия)', en: 'Slice and Dice', i: '⏱️', c: 25, cs: 1, t: 'buff', p: 0.22, d: 'Завершающий: +атака на 3 хода (сильнее с длинной серией).', sid: 5171 }),
            A({ id: 'kick', n: 'Пинок', en: 'Kick', i: '🦵', c: 15, cd: 2, t: 'interrupt', p: 0, d: 'Прерывание.', sid: 1766 }),
          ],
        },
        {
          id: 'combat', name: 'Бой', nameEn: 'Combat', role: 'dps', icon: '⚔️',
          stats: { hp: 100, atk: 17, def: 3, speed: 15 },
          abilities: [
            A({ id: 'ss', n: 'Коварный удар', en: 'Sinister Strike', i: '🗡️', c: 40, gs: 1, t: 'damage', p: 1.15, d: 'Набор серии (−40 энергии).', sid: 1752 }),
            A({ id: 'revealing', n: 'Пробивающий удар', en: 'Revealing Strike', i: '👁️', c: 35, gs: 1, cd: 1, t: 'damage', p: 1.2, d: 'Набор серии.', sid: 84617 }),
            A({ id: 'eviscerate', n: 'Потрошение', en: 'Eviscerate', i: '💥', c: 35, cs: 1, t: 'damage', p: 1.55, d: 'Завершающий приём (вся серия).', sid: 2098 }),
            A({ id: 'killing_spree', n: 'Череда убийств', en: 'Killing Spree', i: '🏃', cd: 5, t: 'aoe', p: 1.15, d: 'Перезарядка: урон по области.', sid: 51690 }),
            A({ id: 'adrenaline', n: 'Выброс адреналина', en: 'Adrenaline Rush', i: '💉', cd: 5, t: 'buff', p: 0.3, d: '+атака на 3 хода (упрощ.).', sid: 13750 }),
            A({ id: 'blade_flurry', n: 'Шквал клинков', en: 'Blade Flurry', i: '🌪️', c: 25, cd: 2, t: 'buff', p: 0.2, d: '+атака (упрощ. клив).', sid: 13877 }),
            A({ id: 'fan', n: 'Веер клинков', en: 'Fan of Knives', i: '🌀', c: 35, gs: 1, t: 'aoe', p: 0.7, d: 'По области + 1 к серии.', sid: 51723 }),
            A({ id: 'slice', n: 'Мясорубка (серия)', en: 'Slice and Dice', i: '⏱️', c: 25, cs: 1, t: 'buff', p: 0.22, d: 'Завершающий: +атака.', sid: 5171 }),
            A({ id: 'rupture', n: 'Рваная рана', en: 'Rupture', i: '🩸', c: 25, cs: 1, t: 'dot', p: 0.7, d: 'Завершающее кровотечение.', sid: 1943 }),
          ],
        },
        {
          id: 'subtlety', name: 'Скрытность', nameEn: 'Subtlety', role: 'dps', icon: '🌑',
          stats: { hp: 92, atk: 18, def: 2, speed: 15 },
          abilities: [
            A({ id: 'hemorrhage', n: 'Кровоизлияние', en: 'Hemorrhage', i: '🩸', c: 30, gs: 1, t: 'damage', p: 1.15, d: 'Дешёвый набор серии.', sid: 16511 }),
            A({ id: 'backstab', n: 'Удар в спину', en: 'Backstab', i: '🔪', c: 55, gs: 1, t: 'damage', p: 1.45, d: 'Дорогой набор серии.', sid: 53 }),
            A({ id: 'eviscerate', n: 'Потрошение', en: 'Eviscerate', i: '💥', c: 35, cs: 1, t: 'damage', p: 1.55, d: 'Завершающий приём.', sid: 2098 }),
            A({ id: 'ambush', n: 'Внезапный удар', en: 'Ambush', i: '😮', c: 55, gs: 2, t: 'damage', p: 1.65, d: '+2 к серии (сильный удар).', sid: 8676 }),
            A({ id: 'shadow_dance', n: 'Танец теней', en: 'Shadow Dance', i: '💃', cd: 4, t: 'buff', p: 0.28, d: '+атака (упрощ. режим).', sid: 51713 }),
            A({ id: 'prem', n: 'Умысел', en: 'Premeditation', i: '🧠', cd: 3, gs: 2, t: 'buff', p: 0, d: '+2 к серии (без удара).', sid: 14183 }),
            A({ id: 'rupture', n: 'Рваная рана', en: 'Rupture', i: '🩸', c: 25, cs: 1, t: 'dot', p: 0.75, d: 'Завершающее кровотечение.', sid: 1943 }),
            A({ id: 'fan', n: 'Веер клинков', en: 'Fan of Knives', i: '🌀', c: 35, gs: 1, t: 'aoe', p: 0.65, d: 'По области + 1 к серии.', sid: 51723 }),
            A({ id: 'slice', n: 'Мясорубка (серия)', en: 'Slice and Dice', i: '⏱️', c: 25, cs: 1, t: 'buff', p: 0.22, d: 'Завершающий: +атака.', sid: 5171 }),
          ],
        },
      ],
    },

    // ═══════════════════════════════════════
    // PRIEST — Mana
    // ═══════════════════════════════════════
    {
      id: 'priest', name: 'Жрец', nameEn: 'Priest', icon: '🙏', color: '#FFFFFF',
      resource: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 7 },
      secondary: null,
      specs: [
        {
          id: 'discipline', name: 'Послушание', nameEn: 'Discipline', role: 'healer', icon: '📖',
          stats: { hp: 92, atk: 9, def: 4, speed: 10 },
          abilities: [
            A({ id: 'penance', n: 'Исповедь', en: 'Penance', i: '📿', c: 12, cd: 1, t: 'heal', p: 0.48, d: 'Сильное лечение (основная кнопка).', sid: 47540 }),
            A({ id: 'flash', n: 'Быстрое исцеление', en: 'Flash Heal', i: '💚', c: 14, t: 'heal', p: 0.42, d: 'Дорогое быстрое лечение.', sid: 2061 }),
            A({ id: 'greater', n: 'Великое исцеление', en: 'Greater Heal', i: '💚', c: 16, t: 'heal', p: 0.55, d: 'Сильное лечение.', sid: 2060 }),
            A({ id: 'shield', n: 'Слово силы: Щит', en: 'Power Word: Shield', i: '🛡️', c: 12, cd: 1, t: 'shield', p: 0.42, d: 'Поглощение урона.', sid: 17 }),
            A({ id: 'prayer', n: 'Молитва исцеления', en: 'Prayer of Healing', i: '🙏', c: 18, cd: 1, t: 'heal_aoe', p: 0.26, d: 'Лечение отряда.', sid: 596 }),
            A({ id: 'smite', n: 'Кара', en: 'Smite', i: '✨', c: 6, t: 'damage', p: 0.95, d: 'Урон (мана-дешёвый).', sid: 585 }),
            A({ id: 'holy_fire', n: 'Священный огонь', en: 'Holy Fire', i: '🔥', c: 8, cd: 1, t: 'damage', p: 1.15, d: 'Урон.', sid: 14914 }),
            A({ id: 'pain_supp', n: 'Подавление боли', en: 'Pain Suppression', i: '🩹', cd: 5, t: 'shield', p: 0.48, d: 'Сильный щит (перезарядка).', sid: 33206 }),
            A({ id: 'archangel', n: 'Архангел', en: 'Archangel', i: '😇', cd: 4, t: 'buff', p: 0.22, d: '+атака (упрощ. без евангелия).', sid: 81700 }),
          ],
        },
        {
          id: 'holy', name: 'Свет', nameEn: 'Holy', role: 'healer', icon: '✝️',
          stats: { hp: 92, atk: 8, def: 4, speed: 10 },
          abilities: [
            A({ id: 'heal', n: 'Исцеление', en: 'Heal', i: '💚', c: 10, t: 'heal', p: 0.45, d: 'Экономичное лечение.', sid: 2050 }),
            A({ id: 'flash', n: 'Быстрое исцеление', en: 'Flash Heal', i: '💚', c: 14, t: 'heal', p: 0.44, d: 'Дороже, чуть сильнее.', sid: 2061 }),
            A({ id: 'gh', n: 'Великое исцеление', en: 'Greater Heal', i: '💚', c: 16, t: 'heal', p: 0.55, d: 'Сильное лечение.', sid: 2060 }),
            A({ id: 'renew', n: 'Обновление', en: 'Renew', i: '🌿', c: 9, t: 'heal', p: 0.32, d: 'HoT: сразу + тики.', sid: 139 }),
            A({ id: 'poh', n: 'Молитва исцеления', en: 'Prayer of Healing', i: '🙏', c: 18, t: 'heal_aoe', p: 0.26, d: 'По области.', sid: 596 }),
            A({ id: 'circle', n: 'Круг исцеления', en: 'Circle of Healing', i: '⭕', c: 12, cd: 2, t: 'heal_aoe', p: 0.28, d: 'Эффективный хил по области.', sid: 34861 }),
            A({ id: 'holy_word', n: 'Слово Света: Безмятежность', en: 'Holy Word: Serenity', i: '🕊️', c: 10, cd: 2, t: 'heal', p: 0.58, d: 'Сильное лечение (КД).', sid: 88684 }),
            A({ id: 'smite', n: 'Кара', en: 'Smite', i: '✨', c: 6, t: 'damage', p: 0.9, d: 'Урон.', sid: 585 }),
            A({ id: 'guardian', n: 'Дух-хранитель', en: 'Guardian Spirit', i: '👻', cd: 5, t: 'buff', p: 0.28, d: '+атака цели/себе (упрощ.).', sid: 47788 }),
          ],
        },
        {
          id: 'shadow', name: 'Тьма', nameEn: 'Shadow', role: 'dps', icon: '🌑',
          stats: { hp: 88, atk: 17, def: 2, speed: 11 },
          abilities: [
            A({ id: 'mind_blast', n: 'Взрыв разума', en: 'Mind Blast', i: '🧠', c: 8, cd: 1, t: 'damage', p: 1.45, d: 'Основной удар.', sid: 8092 }),
            A({ id: 'swp', n: 'Слово Тьмы: Боль', en: 'Shadow Word: Pain', i: '😣', c: 6, cd: 1, t: 'dot', p: 0.6, d: 'Дешёвый DoT.', sid: 589 }),
            A({ id: 'vt', n: 'Прикосновение вампира', en: 'Vampiric Touch', i: '🦇', c: 8, cd: 1, t: 'dot', p: 0.7, d: 'Сильный DoT (без возврата маны).', sid: 34914 }),
            A({ id: 'mind_flay', n: 'Пытка разума', en: 'Mind Flay', i: '🌀', c: 5, t: 'damage', p: 1.05, d: 'Дешёвый заполнитель.', sid: 15407 }),
            A({ id: 'devouring', n: 'Всепожирающая чума', en: 'Devouring Plague', i: '🦠', c: 10, cd: 2, t: 'dot', p: 0.85, d: 'Сильный DoT.', sid: 2944 }),
            A({ id: 'swd', n: 'Слово Тьмы: Смерть', en: 'Shadow Word: Death', i: '💀', c: 8, cd: 2, t: 'damage', p: 1.65, d: 'Добивание ≤35% HP.', sid: 32379 }),
            A({ id: 'mind_spike', n: 'Шип разума', en: 'Mind Spike', i: '📌', c: 8, t: 'damage', p: 1.25, d: 'Мгновенный урон.', sid: 73510 }),
            A({ id: 'shadowfiend', n: 'Исчадие Тьмы', en: 'Shadowfiend', i: '👾', cd: 4, t: 'damage', p: 1.2, d: 'Урон + исчадие на 4 раунда.', sid: 34433 }),
            A({ id: 'dispersion', n: 'Слияние с Тьмой', en: 'Dispersion', i: '🌫️', cd: 5, t: 'shield', p: 0.42, d: 'Щит (перезарядка).', sid: 47585 }),
          ],
        },
      ],
    },

    // ═══════════════════════════════════════
    // DEATH KNIGHT — Runes + Runic Power
    // ═══════════════════════════════════════
    {
      // Актуально: class-balance/deathknight-abilities.js (apply-all)
      id: 'deathknight', name: 'Рыцарь смерти', nameEn: 'Death Knight', icon: '💀', color: '#C41F3B',
      resource: { type: 'runes', name: 'Руны', icon: '🔷', max: 6, start: 6, regen: 1 },
      secondary: { type: 'runic_power', name: 'Сила рун', icon: '💙', max: 100, start: 20 },
      specs: [
        {
          id: 'blood', name: 'Кровь', nameEn: 'Blood', role: 'tank', icon: '🩸',
          stats: { hp: 172, atk: 15, def: 12, speed: 8 },
          abilities: [
            A({ id: 'death_strike', n: 'Удар смерти', en: 'Death Strike', i: '💚', r: { f: 1, u: 1 }, rp: 20, t: 'damage', fl: 24, school: 'physical', d: '24т · вампиризм · +20 силы рун', sid: 49998 }),
            A({ id: 'heart_strike', n: 'Удар в сердце', en: 'Heart Strike', i: '❤️', r: { b: 1 }, rp: 10, t: 'damage', fl: 16, school: 'physical', d: '16т · +10 силы рун', sid: 55050 }),
            A({ id: 'blood_boil', n: 'Вскипание крови', en: 'Blood Boil', i: '🫧', r: { b: 1 }, rp: 10, t: 'aoe', fl: 14, school: 'shadow', d: '14т AoE', sid: 48721 }),
            A({ id: 'death_coil', n: 'Лик смерти', en: 'Death Coil', i: '🌀', cs: 40, t: 'damage', fl: 26, school: 'shadow', d: '26т · 40 силы рун', sid: 47541 }),
            A({ id: 'bone_shield', n: 'Костяной щит', en: 'Bone Shield', i: '🦴', r: { u: 1 }, rp: 10, cd: 3, t: 'shield', fl: 40, d: 'Щит 40т', sid: 49222 }),
            A({ id: 'dnd', n: 'Смерть и разложение', en: 'Death and Decay', i: '☠️', r: { u: 1 }, rp: 10, cd: 2, t: 'aoe', fl: 10, school: 'shadow', applyDot: { flat: 4, turns: 3, name: 'Смерть и разложение', school: 'shadow' }, d: '10т + DoT', sid: 43265 }),
            A({ id: 'vampiric_blood', n: 'Кровь вампира', en: 'Vampiric Blood', i: '🧛', cd: 6, t: 'buff', fa: 1, hpPct: 0.3, bt: 3, d: '+30% HP · 3х · без хода', sid: 55233 }),
            A({ id: 'icebound', n: 'Незыблемость льда', en: 'Icebound Fortitude', i: '🧊', cd: 8, t: 'buff', fa: 1, dr: 0.4, bt: 2, d: '−40% урон · 2х · без хода', sid: 48792 }),
            A({ id: 'taunt', n: 'Тёмная власть', en: 'Dark Command', i: '📢', cd: 2, t: 'taunt', p: 0, fa: 1, d: 'Агро · без хода', sid: 56222 }),
          ],
        },
        {
          id: 'frost', name: 'Лёд', nameEn: 'Frost', role: 'dps', icon: '❄️',
          stats: { hp: 115, atk: 15, def: 5, speed: 11 },
          abilities: [
            A({ id: 'obliterate', n: 'Уничтожение', en: 'Obliterate', i: '❄️', r: { f: 1, u: 1 }, rp: 20, t: 'damage', fl: 28, school: 'frost', d: '', sid: 49020 }),
            A({ id: 'fs', n: 'Удар льда', en: 'Frost Strike', i: '🧊', cs: 35, t: 'damage', fl: 26, school: 'frost', d: '', sid: 49143 }),
            A({ id: 'howling', n: 'Воющий ветер', en: 'Howling Blast', i: '🌬️', r: { f: 1 }, rp: 10, t: 'aoe', fl: 16, school: 'frost', d: '', sid: 49184 }),
            A({ id: 'ity', n: 'Ледяной столп', en: 'Pillar of Frost', i: '🗼', cd: 5, t: 'buff', fa: 1, atkMod: 0.2, bt: 3, d: '', sid: 51271 }),
            A({ id: 'soul_reaper', n: 'Жнец душ', en: 'Soul Reaper', i: '⚰️', r: { f: 1 }, rp: 10, cd: 2, t: 'damage', fl: 34, school: 'frost', d: '≤35%', sid: 130735 }),
            A({ id: 'dnd', n: 'Смерть и разложение', en: 'Death and Decay', i: '☠️', r: { u: 1 }, rp: 10, cd: 2, t: 'aoe', fl: 12, school: 'shadow', d: '', sid: 43265 }),
          ],
        },
        {
          id: 'unholy', name: 'Нечестивость', nameEn: 'Unholy', role: 'dps', icon: '🧟',
          stats: { hp: 115, atk: 15, def: 5, speed: 11 },
          abilities: [
            A({ id: 'scourge', n: 'Удар Плети', en: 'Scourge Strike', i: '☠️', r: { u: 1 }, rp: 10, t: 'damage', fl: 22, school: 'shadow', d: '22т · +10 силы рун', sid: 55090 }),
            A({ id: 'festering', n: 'Удар разложения', en: 'Festering Strike', i: '🦠', r: { b: 1, f: 1 }, rp: 20, t: 'damage', fl: 18, school: 'physical', d: '18т · +20 силы рун', sid: 85948 }),
            A({ id: 'death_coil', n: 'Лик смерти', en: 'Death Coil', i: '🌀', cs: 40, t: 'damage', fl: 28, school: 'shadow', d: '28т · 40 силы рун', sid: 47541 }),
            A({ id: 'outbreak', n: 'Вспышка болезни', en: 'Outbreak', i: '🤢', cd: 2, t: 'damage', fl: 8, school: 'shadow', applyDot: { flat: 6, turns: 4, name: 'Болезнь', school: 'shadow' }, d: '8т + болезнь 6т×4', sid: 77575 }),
            A({ id: 'dark_trans', n: 'Тёмное превращение', en: 'Dark Transformation', i: '👹', r: { u: 1 }, rp: 10, cd: 3, t: 'buff', fa: 1, d: 'Усиливает вурдалака · без хода', sid: 63560 }),
            A({ id: 'summon_garg', n: 'Призыв горгульи', en: 'Summon Gargoyle', i: '🦇', cd: 5, t: 'damage', fl: 18, school: 'shadow', d: '18т + горгулья', sid: 49206 }),
            A({ id: 'dnd', n: 'Смерть и разложение', en: 'Death and Decay', i: '☠️', r: { u: 1 }, rp: 10, cd: 2, t: 'aoe', fl: 14, school: 'shadow', applyDot: { flat: 4, turns: 3, name: 'Смерть и разложение', school: 'shadow' }, d: '14т AoE + DoT', sid: 43265 }),
            A({ id: 'soul_reaper', n: 'Жнец душ', en: 'Soul Reaper', i: '⚰️', r: { u: 1 }, rp: 10, cd: 2, t: 'damage', fl: 36, school: 'shadow', d: '36т · ≤35% HP', sid: 130736 }),
          ],
        },
      ],
    },

    // ═══════════════════════════════════════
    // SHAMAN — Mana
    // ═══════════════════════════════════════
    {
      id: 'shaman', name: 'Шаман', nameEn: 'Shaman', icon: '⚡', color: '#0070DE',
      resource: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 6 },
      secondary: null,
      specs: [
        {
          id: 'elemental', name: 'Стихии', nameEn: 'Elemental', role: 'dps', icon: '🌪️',
          stats: { hp: 95, atk: 17, def: 3, speed: 11 },
          abilities: [
            A({ id: 'lv', n: 'Выброс лавы', en: 'Lava Burst', i: '🌋', c: 8, cd: 1, t: 'damage', p: 1.6, d: 'Главный удар.', sid: 51505 }),
            A({ id: 'lb', n: 'Молния', en: 'Lightning Bolt', i: '⚡', c: 5, t: 'damage', p: 1.15, d: 'Дешёвый заполнитель.', sid: 403 }),
            A({ id: 'flame_shock', n: 'Огненный шок', en: 'Flame Shock', i: '🔥', c: 6, cd: 1, t: 'dot', p: 0.6, d: 'DoT под выброс лавы.', sid: 8050 }),
            A({ id: 'earth_shock', n: 'Земной шок', en: 'Earth Shock', i: '🌍', c: 8, cd: 1, t: 'damage', p: 1.35, d: 'Сильный шок.', sid: 8042 }),
            A({ id: 'chain', n: 'Цепная молния', en: 'Chain Lightning', i: '🔗', c: 10, t: 'aoe', p: 0.9, d: 'По области.', sid: 421 }),
            A({ id: 'thunderstorm', n: 'Гроза', en: 'Thunderstorm', i: '⛈️', c: 5, g: 12, cd: 3, t: 'aoe', p: 0.7, d: 'AoE +12 маны.', sid: 51490 }),
            A({ id: 'ele_blast', n: 'Взрыв стихий', en: 'Elemental Blast', i: '💫', c: 10, cd: 2, t: 'damage', p: 1.5, d: 'Талант: мощный удар.', sid: 117014 }),
            A({ id: 'fire_ele', n: 'Элементаль огня', en: 'Fire Elemental Totem', i: '🔥', cd: 5, t: 'damage', p: 1.2, d: 'Урон + элементаль.', sid: 2894 }),
            A({ id: 'ascendance', n: 'Перерождение', en: 'Ascendance', i: '⬆️', cd: 5, t: 'buff', p: 0.3, d: '+атака.', sid: 114050 }),
          ],
        },
        {
          id: 'enhancement', name: 'Совершенствование', nameEn: 'Enhancement', role: 'dps', icon: '🪓',
          stats: { hp: 105, atk: 17, def: 4, speed: 12 },
          abilities: [
            A({ id: 'stormstrike', n: 'Удар бури', en: 'Stormstrike', i: '⛈️', c: 8, cd: 1, t: 'damage', p: 1.5, d: 'Основной удар.', sid: 17364 }),
            A({ id: 'lava_lash', n: 'Вскипание лавы', en: 'Lava Lash', i: '🌋', c: 7, cd: 1, t: 'damage', p: 1.4, d: 'Удар второй руки.', sid: 60103 }),
            A({ id: 'flame_shock', n: 'Огненный шок', en: 'Flame Shock', i: '🔥', c: 6, cd: 1, t: 'dot', p: 0.55, d: 'DoT.', sid: 8050 }),
            A({ id: 'lb', n: 'Молния', en: 'Lightning Bolt', i: '⚡', c: 5, t: 'damage', p: 1.2, d: 'Заполнитель по мане (упрощ. без водоворота).', sid: 403 }),
            A({ id: 'unleash', n: 'Высвободить стихии', en: 'Unleash Elements', i: '✨', c: 5, cd: 1, t: 'buff', p: 0.18, d: '+атака на 3 хода.', sid: 73680 }),
            A({ id: 'fire_nova', n: 'Кольцо огня', en: 'Fire Nova', i: '💥', c: 9, cd: 1, t: 'aoe', p: 0.9, d: 'AoE.', sid: 1535 }),
            A({ id: 'feral_spirit', n: 'Дух дикого волка', en: 'Feral Spirit', i: '🐺', cd: 5, t: 'damage', p: 1.2, d: '2 волка на 3 раунда.', sid: 51533 }),
            A({ id: 'ascendance', n: 'Перерождение', en: 'Ascendance', i: '⬆️', cd: 5, t: 'buff', p: 0.3, d: '+атака.', sid: 114051 }),
            A({ id: 'earth_shock', n: 'Земной шок', en: 'Earth Shock', i: '🌍', c: 7, t: 'damage', p: 1.25, d: 'Шок.', sid: 8042 }),
          ],
        },
        {
          // Актуально: class-balance/shaman-abilities.js (apply-all)
          id: 'restoration', name: 'Исцеление', nameEn: 'Restoration', role: 'healer', icon: '💚',
          stats: { hp: 95, atk: 15, def: 4, speed: 10 },
          resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 7 },
          abilities: [
            A({ id: 'riptide', n: 'Быстрина', en: 'Riptide', i: '🌊', c: 4, cd: 1, t: 'heal', fl: 22, applyHot: { flat: 3, turns: 5, name: 'Быстрина' }, d: 'СТ · 22т + HoT', sid: 61295 }),
            A({ id: 'ch', n: 'Цепное исцеление', en: 'Chain Heal', i: '🔗', c: 13, t: 'heal_aoe', fl: 40, chainDecay: 0.05, chainPrimary: true, d: '40т · цепь −5%', sid: 1064 }),
            A({ id: 'hw', n: 'Волна исцеления', en: 'Healing Wave', i: '🌊', c: 8, t: 'heal', fl: 30, d: 'СТ · 30т', sid: 331 }),
            A({ id: 'chw', n: 'Исцеляющий всплеск', en: 'Healing Surge', i: '💧', c: 13, t: 'heal', fl: 24, d: 'СТ · 24т', sid: 8004 }),
            A({ id: 'hs', n: 'Исцеляющий ливень', en: 'Healing Rain', i: '🌧️', c: 15, cd: 2, t: 'heal_aoe', fl: 0, applyHot: { flat: 7, turns: 5, name: 'Исцеляющий ливень' }, d: 'HoT 7т×5', sid: 73920 }),
            A({ id: 'hst', n: 'Тотем целительного потока', en: 'Healing Stream Totem', i: '⛲', c: 5, cd: 2, t: 'summon', p: 1, d: '', sid: 5394 }),
            A({ id: 'unleash', n: 'Высвободить жизнь', en: 'Unleash Life', i: '✨', c: 6, cd: 2, t: 'heal', fl: 15, fa: 1, healAmp: 0.2, nextHealCharges: 2, d: '15т · +20% след. хилы', sid: 73685 }),
            A({ id: 'flame_shock', n: 'Огненный шок', en: 'Flame Shock', i: '🔥', c: 6, t: 'dot', fl: 7, school: 'fire', applyDot: { flat: 4, turns: 6, name: 'Огненный шок', school: 'fire' }, d: '', sid: 8050 }),
            A({ id: 'spirit_link', n: 'Тотем духовной связи', en: 'Spirit Link Totem', i: '🔗', c: 0, cd: 5, t: 'heal_aoe', fl: 15, dr: 0.1, bt: 3, d: '15т · −10% урон 3х · выравнивает % HP', sid: 98008 }),
          ],
        },
      ],
    },

    // ═══════════════════════════════════════
    // MAGE — Mana
    // ═══════════════════════════════════════
    {
      id: 'mage', name: 'Маг', nameEn: 'Mage', icon: '🔮', color: '#69CCF0',
      resource: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 5 },
      secondary: null,
      specs: [
        {
          id: 'arcane', name: 'Тайная магия', nameEn: 'Arcane', role: 'dps', icon: '💜',
          stats: { hp: 85, atk: 18, def: 2, speed: 11 },
          abilities: [
            A({ id: 'ab', n: 'Чародейская вспышка', en: 'Arcane Blast', i: '💜', c: 8, t: 'damage', p: 1.4, d: 'Основной платный удар.', sid: 30451 }),
            A({ id: 'am', n: 'Чародейские стрелы', en: 'Arcane Missiles', i: '✨', c: 6, t: 'damage', p: 1.3, d: 'Платный сброс (упрощ. без зарядов).', sid: 5143 }),
            A({ id: 'abarr', n: 'Чародейский обстрел', en: 'Arcane Barrage', i: '💠', c: 6, cd: 1, t: 'damage', p: 1.25, d: 'Платный сброс.', sid: 44425 }),
            A({ id: 'ae', n: 'Чародейский взрыв', en: 'Arcane Explosion', i: '💥', c: 10, t: 'aoe', p: 0.85, d: 'По области.', sid: 1449 }),
            A({ id: 'arcane_power', n: 'Мощь тайной магии', en: 'Arcane Power', i: '🔋', cd: 5, t: 'buff', p: 0.3, d: '+атака.', sid: 12042 }),
            A({ id: 'presence', n: 'Присутствие разума', en: 'Presence of Mind', i: '🧠', cd: 4, t: 'buff', p: 0.15, d: '+атака (талант).', sid: 12043 }),
            A({ id: 'mirror', n: 'Зеркальное изображение', en: 'Mirror Image', i: '🪞', cd: 5, t: 'damage', p: 1.1, d: 'Урон + 2 копии.', sid: 55342 }),
            A({ id: 'evocation', n: 'Прилив сил', en: 'Evocation', i: '🔄', cd: 4, t: 'buff', p: 0, g: 35, d: '+35 маны.', sid: 12051 }),
            A({ id: 'nether_tempest', n: 'Буря Пустоты', en: 'Nether Tempest', i: '🌌', c: 6, cd: 1, t: 'dot', p: 0.65, d: 'DoT (талант).', sid: 114923 }),
          ],
        },
        {
          id: 'fire', name: 'Огонь', nameEn: 'Fire', role: 'dps', icon: '🔥',
          stats: { hp: 85, atk: 18, def: 2, speed: 11 },
          abilities: [
            A({ id: 'fireball', n: 'Огненный шар', en: 'Fireball', i: '🔥', c: 7, t: 'damage', p: 1.3, d: 'Заполнитель.', sid: 133 }),
            A({ id: 'pyroblast', n: 'Огненная глыба', en: 'Pyroblast', i: '☄️', c: 12, t: 'damage', p: 1.75, d: 'Дорогой сильный удар.', sid: 11366 }),
            A({ id: 'inferno_blast', n: 'Инфернальный взрыв', en: 'Inferno Blast', i: '💥', c: 5, cd: 1, t: 'damage', p: 1.2, d: 'Мгновенный урон.', sid: 108853 }),
            A({ id: 'combustion', n: 'Возгорание', en: 'Combustion', i: '🔥', c: 10, cd: 4, t: 'damage', p: 1.65, d: 'Всплеск (КД).', sid: 11129 }),
            A({ id: 'living_bomb', n: 'Живая бомба', en: 'Living Bomb', i: '💣', c: 6, cd: 2, t: 'dot', p: 0.7, d: 'DoT (талант).', sid: 44457 }),
            A({ id: 'flamestrike', n: 'Огненный столб', en: 'Flamestrike', i: '🌋', c: 12, t: 'aoe', p: 0.85, d: 'По области.', sid: 2120 }),
            A({ id: 'scorch', n: 'Ожог', en: 'Scorch', i: '🌡️', c: 5, t: 'damage', p: 1.05, d: 'Дешёвый удар.', sid: 2948 }),
            A({ id: 'mirror', n: 'Зеркальное изображение', en: 'Mirror Image', i: '🪞', cd: 5, t: 'damage', p: 1.1, d: 'Урон + 2 копии.', sid: 55342 }),
            A({ id: 'alter_time', n: 'Манипуляции со временем', en: 'Alter Time', i: '⏳', cd: 5, t: 'buff', p: 0.18, d: '+атака (упрощ.).', sid: 108978 }),
          ],
        },
        {
          id: 'frost', name: 'Лёд', nameEn: 'Frost', role: 'dps', icon: '❄️',
          stats: { hp: 88, atk: 17, def: 3, speed: 11 },
          abilities: [
            A({ id: 'frostbolt', n: 'Ледяная стрела', en: 'Frostbolt', i: '🧊', c: 6, t: 'damage', p: 1.3, d: 'Основной заполнитель.', sid: 116 }),
            A({ id: 'ice_lance', n: 'Ледяное копьё', en: 'Ice Lance', i: '🗡️', c: 5, t: 'damage', p: 1.2, d: 'Мгновенный удар.', sid: 30455 }),
            A({ id: 'frozen_orb', n: 'Ледяной шар', en: 'Frozen Orb', i: '🔮', c: 10, cd: 3, t: 'aoe', p: 0.95, d: 'AoE шар.', sid: 84714 }),
            A({ id: 'deep_freeze', n: 'Глубокая заморозка', en: 'Deep Freeze', i: '🥶', c: 8, cd: 3, t: 'damage', p: 1.55, d: 'Сильный КД-удар.', sid: 44572 }),
            A({ id: 'cone', n: 'Конус холода', en: 'Cone of Cold', i: '❄️', c: 9, cd: 2, t: 'aoe', p: 0.8, d: 'Конус.', sid: 120 }),
            A({ id: 'blizzard', n: 'Снежная буря', en: 'Blizzard', i: '🌨️', c: 12, t: 'aoe', p: 0.8, d: 'Зональный урон.', sid: 10 }),
            A({ id: 'icy_veins', n: 'Стылая кровь', en: 'Icy Veins', i: '💉', cd: 5, t: 'buff', p: 0.3, d: '+атака.', sid: 12472 }),
            A({ id: 'summon_water', n: 'Элементаль воды', en: 'Summon Water Elemental', i: '💧', cd: 4, t: 'damage', p: 1.05, d: 'Питомец.', sid: 31687 }),
            A({ id: 'frostfire', n: 'Стрела ледяного огня', en: 'Frostfire Bolt', i: '🔵', c: 7, t: 'damage', p: 1.35, d: 'Альтернативный заполнитель.', sid: 44614 }),
          ],
        },
      ],
    },

    // ═══════════════════════════════════════
    // WARLOCK — Mana + Soul Shards
    // ═══════════════════════════════════════
    {
      id: 'warlock', name: 'Чернокнижник', nameEn: 'Warlock', icon: '😈', color: '#9482C9',
      resource: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 5 },
      secondary: { type: 'soul_shards', name: 'Осколки души', icon: '💎', max: 4, start: 1 },
      specs: [
        {
          id: 'affliction', name: 'Колдовство', nameEn: 'Affliction', role: 'dps', icon: '😫',
          stats: { hp: 90, atk: 17, def: 2, speed: 10 },
          abilities: [
            A({ id: 'agony', n: 'Агония', en: 'Agony', i: '😣', c: 5, cd: 1, t: 'dot', p: 0.55, d: 'DoT.', sid: 980 }),
            A({ id: 'corruption', n: 'Порча', en: 'Corruption', i: '🟢', c: 4, t: 'dot', p: 0.55, d: 'DoT.', sid: 172 }),
            A({ id: 'ua', n: 'Нестабильное колдовство', en: 'Unstable Affliction', i: '💜', c: 7, cd: 1, t: 'dot', p: 0.7, d: 'Сильный DoT.', sid: 30108 }),
            A({ id: 'malefic', n: 'Хватка малефиция', en: 'Malefic Grasp', i: '🖐️', c: 7, t: 'damage', p: 1.15, d: 'Канал-заполнитель.', sid: 103103 }),
            A({ id: 'haunt', n: 'Блуждающий дух', en: 'Haunt', i: '👻', c: 10, cs: 1, cd: 2, t: 'damage', p: 1.65, d: 'Расход 1 осколка — сильный удар.', sid: 48181 }),
            A({ id: 'drain_soul', n: 'Похищение души', en: 'Drain Soul', i: '🌑', c: 5, t: 'damage', p: 1.05, gs: 1, d: 'Урон + 1 осколок души.', sid: 1120 }),
            A({ id: 'seed', n: 'Семя порчи', en: 'Seed of Corruption', i: '🌱', c: 11, t: 'aoe', p: 0.75, d: 'AoE.', sid: 27243 }),
            A({ id: 'dark_soul', n: 'Тёмная душа: Злорадство', en: 'Dark Soul: Misery', i: '😈', cd: 5, t: 'buff', p: 0.3, d: '+30% атаки.', sid: 113860 }),
            A({ id: 'soulburn', n: 'Сожжение души', en: 'Soulburn', i: '🔥', cs: 1, cd: 2, t: 'buff', p: 0.25, d: 'Расход 1 осколка — +атака.', sid: 74434 }),
          ],
        },
        {
          id: 'demonology', name: 'Демонология', nameEn: 'Demonology', role: 'dps', icon: '👹',
          stats: { hp: 100, atk: 16, def: 4, speed: 10 },
          abilities: [
            A({ id: 'shadow_bolt', n: 'Стрела Тьмы', en: 'Shadow Bolt', i: '🌑', c: 7, gs: 1, t: 'damage', p: 1.15, d: 'Заполнитель + 1 осколок (упрощ.).', sid: 686 }),
            A({ id: 'soul_fire', n: 'Ожог души', en: 'Soul Fire', i: '🔥', c: 12, cs: 1, t: 'damage', p: 1.7, d: 'Расход 1 осколка — сильный удар.', sid: 6353 }),
            A({ id: 'corruption', n: 'Порча', en: 'Corruption', i: '🟢', c: 5, t: 'dot', p: 0.55, d: 'DoT.', sid: 172 }),
            A({ id: 'hand_guldan', n: 'Длань Гул\'дана', en: "Hand of Gul'dan", i: '✋', c: 10, gs: 1, cd: 2, t: 'aoe', p: 0.95, d: 'AoE + бесы + 1 осколок.', sid: 105174 }),
            A({ id: 'hellfire', n: 'Адское пламя', en: 'Hellfire', i: '🔥', c: 10, t: 'aoe', p: 0.8, d: 'AoE вокруг себя.', sid: 1949 }),
            A({ id: 'metamorphosis', n: 'Метаморфоза', en: 'Metamorphosis', i: '👹', cs: 1, cd: 4, t: 'buff', p: 0.28, d: 'Расход 1 осколка: +атака/защита 4 хода.', sid: 103958 }),
            A({ id: 'doom', n: 'Рок', en: 'Doom', i: '💀', c: 8, cd: 2, t: 'dot', p: 0.75, d: 'Долгий DoT.', sid: 603 }),
            A({ id: 'dark_soul', n: 'Тёмная душа: Знание', en: 'Dark Soul: Knowledge', i: '😈', cd: 5, t: 'buff', p: 0.3, d: '+30% атаки.', sid: 113861 }),
            A({ id: 'felstorm', n: 'Буря Скверны (страж)', en: 'Felstorm', i: '🌪️', cd: 3, t: 'aoe', p: 0.85, d: 'Страж бьёт по области.', sid: 89751 }),
          ],
        },
        {
          id: 'destruction', name: 'Разрушение', nameEn: 'Destruction', role: 'dps', icon: '🔥',
          stats: { hp: 90, atk: 18, def: 2, speed: 11 },
          abilities: [
            A({ id: 'incinerate', n: 'Испепеление', en: 'Incinerate', i: '🔥', c: 7, gs: 1, t: 'damage', p: 1.2, d: 'Заполнитель + 1 осколок (упрощ. угли).', sid: 29722 }),
            A({ id: 'immolate', n: 'Жертвенный огонь', en: 'Immolate', i: '🕯️', c: 6, cd: 1, t: 'dot', p: 0.6, d: 'DoT.', sid: 348 }),
            A({ id: 'chaos_bolt', n: 'Стрела Хаоса', en: 'Chaos Bolt', i: '☄️', c: 10, cs: 1, t: 'damage', p: 2.0, d: 'Расход 1 осколка — главный удар.', sid: 116858 }),
            A({ id: 'conflag', n: 'Поджигание', en: 'Conflagrate', i: '💥', c: 5, gs: 1, cd: 1, t: 'damage', p: 1.25, d: 'Мгновенно + 1 осколок.', sid: 17962 }),
            A({ id: 'shadowburn', n: 'Ожог Тьмы', en: 'Shadowburn', i: '🌑', c: 8, cs: 1, cd: 2, t: 'damage', p: 1.75, d: 'Осколок. Добивание ≤35%.', sid: 17877 }),
            A({ id: 'rain_fire', n: 'Огненный ливень', en: 'Rain of Fire', i: '🌧️', c: 12, t: 'aoe', p: 0.8, d: 'AoE.', sid: 5740 }),
            A({ id: 'havoc', n: 'Хаос', en: 'Havoc', i: '🎯', c: 5, cd: 3, t: 'debuff', p: 0.2, d: '−атака цели.', sid: 80240 }),
            A({ id: 'dark_soul', n: 'Тёмная душа: Нестабильность', en: 'Dark Soul: Instability', i: '😈', cd: 5, t: 'buff', p: 0.3, d: '+30% атаки.', sid: 113858 }),
            A({ id: 'ember_tap', n: 'Вытягивание угля', en: 'Ember Tap', i: '🔥', cs: 1, cd: 2, t: 'heal', p: 0.25, d: 'Расход 1 осколка — самолечение.', sid: 114635 }),
          ],
        },
      ],
    },

    // ═══════════════════════════════════════
    // MONK — Energy/Mana + ци (MoP new)
    // ═══════════════════════════════════════
    {
      id: 'monk', name: 'Монах', nameEn: 'Monk', icon: '🥋', color: '#00FF96',
      resource: { type: 'energy', name: 'Энергия', icon: '⚡', max: 100, start: 100, regen: 18 },
      secondary: { type: 'chi', name: 'Ци', icon: '☯️', max: 5, start: 0 },
      // Mistweaver overrides resource to mana in spec
      specs: [
        {
          id: 'brewmaster', name: 'Хмелевар', nameEn: 'Brewmaster', role: 'tank', icon: '🍺',
          stats: { hp: 168, atk: 12, def: 11, speed: 10 },
          resourceOverride: { type: 'energy', name: 'Энергия', icon: '⚡', max: 100, start: 100, regen: 16 },
          abilities: [
            A({ id: 'jab', n: 'Джаб', en: 'Jab', i: '👊', c: 40, gs: 1, t: 'damage', p: 0.9, d: 'Генератор: +1 ци.', sid: 100780 }),
            A({ id: 'keg_smash', n: 'Удар бочонком', en: 'Keg Smash', i: '🍺', c: 40, gs: 2, cd: 1, t: 'aoe', p: 0.9, d: 'Генератор: +2 ци, AoE.', sid: 121253 }),
            A({ id: 'blackout', n: 'Удар чёрного лотоса', en: 'Blackout Kick', i: '🦶', cs: 2, t: 'damage', p: 1.35, d: 'Расход 2 ци — урон.', sid: 100784 }),
            A({ id: 'breath', n: 'Дыхание огня', en: 'Breath of Fire', i: '🔥', cs: 2, t: 'aoe', p: 0.85, d: 'Расход 2 ци — AoE.', sid: 115181 }),
            A({ id: 'guard', n: 'Защита', en: 'Guard', i: '🛡️', cs: 2, cd: 2, t: 'shield', p: 0.45, d: 'Расход 2 ци — щит.', sid: 115295 }),
            A({ id: 'purifying', n: 'Очищающий отвар', en: 'Purifying Brew', i: '🍵', cs: 1, t: 'heal', p: 0.28, d: 'Расход 1 ци — самолечение (пока без пошатывания).', sid: 119582 }),
            A({ id: 'elusive', n: 'Отвар неуловимости', en: 'Elusive Brew', i: '💨', cd: 2, t: 'shield', p: 0.25, d: 'Щит/выживаемость (упрощ.).', sid: 115308 }),
            A({ id: 'provoke', n: 'Вызов', en: 'Provoke', i: '📢', cd: 2, t: 'taunt', p: 0, d: 'Провокация.', sid: 115546 }),
            A({ id: 'fort_brew', n: 'Отвар железной шкуры', en: 'Fortifying Brew', i: '🏋️', cd: 5, t: 'shield', p: 0.45, d: 'Сильный щит (КД).', sid: 115203 }),
          ],
        },
        {
          id: 'mistweaver', name: 'Ткач туманов', nameEn: 'Mistweaver', role: 'healer', icon: '🌫️',
          stats: { hp: 95, atk: 8, def: 4, speed: 11 },
          resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 7 },
          abilities: [
            A({ id: 'renewing', n: 'Заживляющий туман', en: 'Renewing Mist', i: '✨', c: 10, cd: 1, gs: 1, t: 'heal', p: 0.32, d: 'HoT + 1 ци.', sid: 115151 }),
            A({ id: 'surging', n: 'Бурлящий туман', en: 'Surging Mist', i: '💚', c: 12, gs: 1, t: 'heal', p: 0.42, d: 'Быстрое лечение + 1 ци.', sid: 116694 }),
            A({ id: 'enveloping', n: 'Окутывающий туман', en: 'Enveloping Mist', i: '🌿', cs: 3, t: 'heal', p: 0.52, d: 'Расход 3 ци — hit + сильный HoT.', sid: 124682 }),
            A({ id: 'soothing', n: 'Успокаивающий туман', en: 'Soothing Mist', i: '🍃', c: 9, t: 'heal', p: 0.38, d: 'Канал-хил (мана).', sid: 115175 }),
            A({ id: 'uft', n: 'Духовный подъём', en: 'Uplift', i: '🙌', cs: 2, t: 'heal_aoe', p: 0.3, d: 'Расход 2 ци — хил отряда.', sid: 116670 }),
            A({ id: 'spinning', n: 'Танцующий журавль', en: 'Spinning Crane Kick', i: '🌪️', c: 12, t: 'aoe', p: 0.65, d: 'AoE урон.', sid: 101546 }),
            A({ id: 'jab', n: 'Джаб', en: 'Jab', i: '👊', c: 8, gs: 1, t: 'damage', p: 0.85, d: '+1 ци (мана).', sid: 100780 }),
            A({ id: 'thunder_focus', n: 'Громовой чай', en: 'Thunder Focus Tea', i: '☕', cd: 3, t: 'buff', p: 0.2, d: '+атака (упрощ. усиление).', sid: 116680 }),
            A({ id: 'revival', n: 'Восстановление сил', en: 'Revival', i: '🌈', c: 18, cd: 5, t: 'heal_aoe', p: 0.36, d: 'Большой хил по отряду.', sid: 115310 }),
          ],
        },
        {
          id: 'windwalker', name: 'Танцующий с ветром', nameEn: 'Windwalker', role: 'dps', icon: '🌪️',
          stats: { hp: 100, atk: 17, def: 3, speed: 14 },
          resourceOverride: { type: 'energy', name: 'Энергия', icon: '⚡', max: 100, start: 100, regen: 18 },
          abilities: [
            A({ id: 'jab', n: 'Джаб', en: 'Jab', i: '👊', c: 40, gs: 1, t: 'damage', p: 0.95, d: 'Генератор: +1 ци.', sid: 100780 }),
            A({ id: 'tiger_palm', n: 'Лапа тигра', en: 'Tiger Palm', i: '🐯', cs: 1, t: 'damage', p: 1.2, d: 'Расход 1 ци.', sid: 100787 }),
            A({ id: 'bok', n: 'Удар чёрного лотоса', en: 'Blackout Kick', i: '🦶', cs: 2, t: 'damage', p: 1.4, d: 'Расход 2 ци.', sid: 100784 }),
            A({ id: 'rsk', n: 'Удар восходящего солнца', en: 'Rising Sun Kick', i: '🌅', cs: 2, cd: 1, t: 'damage', p: 1.5, d: 'Расход 2 ци — сильный удар.', sid: 107428 }),
            A({ id: 'fists', n: 'Ярость Сюэня', en: 'Fists of Fury', i: '👊', cs: 3, cd: 3, t: 'aoe', p: 1.1, d: 'Расход 3 ци — AoE.', sid: 113656 }),
            A({ id: 'sck', n: 'Танцующий журавль', en: 'Spinning Crane Kick', i: '🌪️', c: 40, t: 'aoe', p: 0.8, d: 'Энергия — AoE.', sid: 101546 }),
            A({ id: 'energizing', n: 'Отвар жизненной энергии', en: 'Energizing Brew', i: '⚡', cd: 4, t: 'buff', p: 0.15, g: 30, d: '+30 энергии.', sid: 115288 }),
            A({ id: 'tigereye', n: 'Пиво тигриного глаза', en: 'Tigereye Brew', i: '🍺', cd: 2, t: 'buff', p: 0.28, d: '+атака.', sid: 116740 }),
            A({ id: 'touch_death', n: 'Касание смерти', en: 'Touch of Death', i: '💀', cs: 3, cd: 4, t: 'damage', p: 1.85, d: 'Расход 3 ци. Добивание ≤35%.', sid: 115080 }),
          ],
        },
      ],
    },

    // ═══════════════════════════════════════
    // DRUID — resource depends on form/spec
    // ═══════════════════════════════════════
    {
      id: 'druid', name: 'Друид', nameEn: 'Druid', icon: '🐻', color: '#FF7D0A',
      resource: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 6 },
      secondary: null,
      specs: [
        {
          id: 'balance', name: 'Баланс', nameEn: 'Balance', role: 'dps', icon: '🌙',
          stats: { hp: 95, atk: 17, def: 3, speed: 11 },
          resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 5 },
          secondaryOverride: { type: 'eclipse', name: 'Затмение', icon: '🌓', max: 100, start: 0 },
          abilities: [
            A({ id: 'wrath', n: 'Гнев', en: 'Wrath', i: '🌟', c: 5, gs: 12, t: 'damage', p: 1.15, d: 'Заполнитель +12 к шкале затмения.', sid: 5176 }),
            A({ id: 'starfire', n: 'Звёздный огонь', en: 'Starfire', i: '⭐', c: 7, gs: 15, t: 'damage', p: 1.35, d: 'Сильный удар +15 к затмению.', sid: 2912 }),
            A({ id: 'moonfire', n: 'Лунный огонь', en: 'Moonfire', i: '🌙', c: 5, t: 'dot', p: 0.6, d: 'DoT.', sid: 8921 }),
            A({ id: 'sunfire', n: 'Солнечный огонь', en: 'Sunfire', i: '☀️', c: 5, t: 'dot', p: 0.6, d: 'DoT.', sid: 93402 }),
            A({ id: 'starsurge', n: 'Звёздный поток', en: 'Starsurge', i: '💫', c: 8, cd: 1, t: 'damage', p: 1.55, d: 'Сильный удар (КД).', sid: 78674 }),
            A({ id: 'starfall', n: 'Звездопад', en: 'Starfall', i: '🌠', c: 12, cd: 3, t: 'aoe', p: 0.95, d: 'AoE.', sid: 48505 }),
            A({ id: 'hurricane', n: 'Ураган', en: 'Hurricane', i: '🌪️', c: 12, t: 'aoe', p: 0.8, d: 'AoE-канал.', sid: 16914 }),
            A({ id: 'celestial', n: 'Небесное соострование', en: 'Celestial Alignment', i: '🌌', cd: 5, t: 'buff', p: 0.32, d: '+атака (упрощ. оба затмения).', sid: 112071 }),
            A({ id: 'incarnation', n: 'Воплощение', en: 'Incarnation: Chosen of Elune', i: '🦉', cd: 5, t: 'buff', p: 0.28, d: '+атака.', sid: 102560 }),
          ],
        },
        {
          id: 'feral', name: 'Сила зверя', nameEn: 'Feral', role: 'dps', icon: '🐱',
          stats: { hp: 100, atk: 17, def: 3, speed: 14 },
          resourceOverride: { type: 'energy', name: 'Энергия', icon: '⚡', max: 100, start: 100, regen: 20 },
          secondaryOverride: { type: 'combo', name: 'Серия приёмов', icon: '🃏', max: 5, start: 0 },
          abilities: [
            A({ id: 'shred', n: 'Полоснуть', en: 'Shred', i: '✂️', c: 40, gs: 1, t: 'damage', p: 1.25, d: 'Набор серии.', sid: 5221 }),
            A({ id: 'rake', n: 'Глубокая рана', en: 'Rake', i: '🩸', c: 35, gs: 1, t: 'dot', p: 0.6, d: 'DoT + 1 к серии.', sid: 1822 }),
            A({ id: 'rip', n: 'Разорвать', en: 'Rip', i: '💔', c: 30, cs: 1, t: 'dot', p: 0.8, d: 'Завершающий DoT (вся серия).', sid: 1079 }),
            A({ id: 'ferocious', n: 'Свирепый укус', en: 'Ferocious Bite', i: '🦷', c: 25, cs: 1, t: 'damage', p: 1.55, d: 'Завершающий урон.', sid: 22568 }),
            A({ id: 'thrash', n: 'Взбучка', en: 'Thrash', i: '🌀', c: 45, gs: 1, t: 'aoe', p: 0.75, d: 'AoE + 1 к серии.', sid: 106830 }),
            A({ id: 'tigers_fury', n: 'Тигриное неистовство', en: "Tiger's Fury", i: '🐯', cd: 3, g: 50, t: 'buff', p: 0.18, d: '+50 энергии и +атака.', sid: 5217 }),
            A({ id: 'berserk', n: 'Берсерк', en: 'Berserk', i: '😡', cd: 5, t: 'buff', p: 0.28, d: '+атака.', sid: 106951 }),
            A({ id: 'savage_roar', n: 'Дикий рёв', en: 'Savage Roar', i: '📢', c: 25, cs: 1, t: 'buff', p: 0.22, d: 'Завершающий: +атака.', sid: 52610 }),
            A({ id: 'swipe', n: 'Размах', en: 'Swipe', i: '👋', c: 40, gs: 1, t: 'aoe', p: 0.75, d: 'AoE + 1 к серии.', sid: 62078 }),
          ],
        },
        {
          id: 'guardian', name: 'Страж', nameEn: 'Guardian', role: 'tank', icon: '🐻',
          stats: { hp: 180, atk: 12, def: 12, speed: 8 },
          resourceOverride: { type: 'rage', name: 'Ярость', icon: '💢', max: 100, start: 20, regen: 8 },
          abilities: [
            A({ id: 'mangle', n: 'Увечье', en: 'Mangle', i: '🐻', g: 12, cd: 1, t: 'damage', p: 1.1, d: 'Генератор: +12 ярости.', sid: 33878 }),
            A({ id: 'thrash', n: 'Взбучка', en: 'Thrash', i: '🌀', c: 20, t: 'aoe', p: 0.85, d: 'Расход 20 — AoE.', sid: 77758 }),
            A({ id: 'lacerate', n: 'Растерзать', en: 'Lacerate', i: '🩸', c: 15, t: 'dot', p: 0.65, d: 'Расход 15 — DoT.', sid: 33745 }),
            A({ id: 'maul', n: 'Трепка', en: 'Maul', i: '👊', c: 30, t: 'damage', p: 1.4, d: 'Главный расход 30 ярости.', sid: 6807 }),
            A({ id: 'frenzied', n: 'Неистовое восстановление', en: 'Frenzied Regeneration', i: '💚', c: 50, cd: 2, t: 'heal', p: 0.38, d: 'Расход 50 — самолечение.', sid: 22842 }),
            A({ id: 'savage_def', n: 'Дикая защита', en: 'Savage Defense', i: '🛡️', c: 50, t: 'shield', p: 0.4, d: 'Расход 50 — щит.', sid: 62606 }),
            A({ id: 'barkskin', n: 'Дубовая кожа', en: 'Barkskin', i: '🪵', cd: 4, t: 'shield', p: 0.32, d: 'Щит (КД).', sid: 22812 }),
            A({ id: 'survival', n: 'Инстинкты выживания', en: 'Survival Instincts', i: '❤️', cd: 5, t: 'shield', p: 0.48, d: 'Сильный щит (КД).', sid: 61336 }),
            A({ id: 'growl', n: 'Рык', en: 'Growl', i: '📢', cd: 2, t: 'taunt', p: 0, d: 'Провокация.', sid: 6795 }),
          ],
        },
        {
          id: 'restoration', name: 'Исцеление', nameEn: 'Restoration', role: 'healer', icon: '🌳',
          stats: { hp: 95, atk: 8, def: 4, speed: 10 },
          resourceOverride: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 7 },
          abilities: [
            A({ id: 'reju', n: 'Омоложение', en: 'Rejuvenation', i: '🍃', c: 8, t: 'heal', p: 0.34, d: 'HoT: hit + тики.', sid: 774 }),
            A({ id: 'regrowth', n: 'Восстановление', en: 'Regrowth', i: '🌱', c: 13, t: 'heal', p: 0.42, d: 'Hit + HoT.', sid: 8936 }),
            A({ id: 'ht', n: 'Целительное прикосновение', en: 'Healing Touch', i: '💚', c: 14, t: 'heal', p: 0.52, d: 'Сильное лечение.', sid: 5185 }),
            A({ id: 'wg', n: 'Буйный рост', en: 'Wild Growth', i: '🌸', c: 16, cd: 2, t: 'heal_aoe', p: 0.28, d: 'Хил по области.', sid: 48438 }),
            A({ id: 'swiftmend', n: 'Быстрое восстановление', en: 'Swiftmend', i: '⚡', c: 10, cd: 2, t: 'heal', p: 0.5, d: 'Сильный мгновенный хил.', sid: 18562 }),
            A({ id: 'lifebloom', n: 'Жизнецвет', en: 'Lifebloom', i: '🌼', c: 8, t: 'heal', p: 0.32, d: 'HoT на 3 хода.', sid: 33763 }),
            A({ id: 'tranq', n: 'Спокойствие', en: 'Tranquility', i: '☮️', c: 18, cd: 5, t: 'heal_aoe', p: 0.36, d: 'Большой хил по отряду.', sid: 740 }),
            A({ id: 'nourish', n: 'Покровительство природы', en: 'Nourish', i: '🌿', c: 9, t: 'heal', p: 0.4, d: 'Экономичное лечение.', sid: 50464 }),
            A({ id: 'moonfire', n: 'Лунный огонь', en: 'Moonfire', i: '🌙', c: 5, t: 'dot', p: 0.55, d: 'Заполнитель урона.', sid: 8921 }),
          ],
        },
      ],
    },

    // ═══════════════════════════════════════
    // ENGINEER (GNOME) — Steam + Parts · attacking machines
    // ═══════════════════════════════════════
    {
      id: 'engineer', name: 'Гном-инженер', nameEn: 'Gnome Engineer', icon: '⚙️', color: '#E67E22',
      resource: { type: 'energy', name: 'Пар', icon: '💨', max: 100, start: 100, regen: 5 },
      secondary: { type: 'parts', name: 'Детали', icon: '🔩', max: 5, start: 1 },
      specs: [
        {
          id: 'mechanist', name: 'Механист', nameEn: 'Mechanist', role: 'dps', icon: '🤖',
          stats: { hp: 100, atk: 16, def: 5, speed: 11 },
          abilities: [
            A({ id: 'wrench_bash', n: 'Удар гаечным ключом', en: 'Wrench Bash', i: '🔧', g: 18, gs: 1, t: 'damage', p: 1.05, d: 'Ближний удар. +Пар, +1 деталь.', sid: 90001 }),
            A({ id: 'rivet_gun', n: 'Заклёпочный пистолет', en: 'Rivet Gun', i: '🔫', c: 25, gs: 1, t: 'damage', p: 1.22, d: 'Очередь заклёпок. +1 деталь.', sid: 90002 }),
            A({ id: 'plasma_cutter', n: 'Плазменный резак', en: 'Plasma Cutter', i: '✳️', c: 35, t: 'damage', p: 1.45, d: 'Точный режущий луч.', sid: 90003 }),
            A({ id: 'deploy_turret', n: 'Развёртывание турели', en: 'Deploy Turret', i: '🗼', c: 40, cs: 2, cd: 3, t: 'summon', p: 1, d: 'Турель на 4 хода. 2 детали.', sid: 90004 }),
            A({ id: 'overclock', n: 'Разгон', en: 'Overclock', i: '⚡', c: 20, cd: 3, t: 'buff', p: 0.25, d: '+ATK себе (и механизмам рядом по духу).', sid: 90005 }),
            A({ id: 'emergency_repair', n: 'Аварийный ремонт', en: 'Emergency Repair', i: '🩹', c: 30, cd: 3, t: 'heal', p: 0.38, d: 'Сварка корпуса: лечение.', sid: 90006 }),
            A({ id: 'call_siege_walker', n: 'Осадный ходун', en: 'Siege Walker', i: '🦾', c: 50, cs: 3, cd: 5, t: 'summon', p: 1, d: 'Тяжёлый боевой механизм на 4 хода. 3 детали.', sid: 90007 }),
            A({ id: 'scrap_shot', n: 'Выстрел металлоломом', en: 'Scrap Shot', i: '🧱', c: 20, t: 'damage', p: 1.12, d: 'Заполнитель из обломков.', sid: 90008 }),
            A({ id: 'shock_wrench', n: 'Шоковый ключ', en: 'Shock Wrench', i: '⚡', c: 15, cd: 2, t: 'interrupt', p: 0.4, d: 'Сбивает каст искрой. Немота 2 хода.', sid: 90009 }),
          ],
        },
        {
          id: 'sapper', name: 'Сапёр', nameEn: 'Sapper', role: 'dps', icon: '💣',
          stats: { hp: 92, atk: 17, def: 3, speed: 12 },
          abilities: [
            A({ id: 'sticky_bomb', n: 'Липкая бомба', en: 'Sticky Bomb', i: '🧨', g: 16, gs: 1, t: 'dot', p: 0.95, d: 'Липнет и тикает. +Пар, +1 деталь.', sid: 90011 }),
            A({ id: 'shrapnel_blast', n: 'Шрапнель', en: 'Shrapnel Blast', i: '💥', c: 30, gs: 1, t: 'aoe', p: 0.85, d: 'Осколки по паку. +1 деталь.', sid: 90012 }),
            A({ id: 'cluster_bomb', n: 'Кассетная бомба', en: 'Cluster Bomb', i: '💣', c: 40, t: 'aoe', p: 1.05, d: 'Серия взрывов по области.', sid: 90013 }),
            A({ id: 'deploy_bomb_drone', n: 'Дроны-бомбы', en: 'Bomb Drones', i: '🛸', c: 35, cs: 2, cd: 3, t: 'summon', p: 1, d: '2 дрона-камикадзе на 3 хода. 2 детали.', sid: 90014 }),
            A({ id: 'rocket_barrage', n: 'Ракетный залп', en: 'Rocket Barrage', i: '🚀', c: 45, cd: 2, t: 'aoe', p: 1.15, d: 'Залп мини-ракет.', sid: 90015 }),
            A({ id: 'remote_charge', n: 'Дистанционный заряд', en: 'Remote Charge', i: '📡', c: 25, t: 'damage', p: 1.35, d: 'Точечный подрыв цели.', sid: 90016 }),
            A({ id: 'demolish', n: 'Подрыв', en: 'Demolish', i: '☢️', c: 55, cs: 3, cd: 4, t: 'aoe', p: 1.4, d: 'Большой взрыв. 3 детали.', sid: 90017 }),
            A({ id: 'nitro_boosts', n: 'Нитро-ускорители', en: 'Nitro Boosts', i: '🔥', c: 15, cd: 4, t: 'buff', p: 0.2, d: 'Краткий разгон: +ATK.', sid: 90018 }),
            A({ id: 'shock_wrench', n: 'Шоковый ключ', en: 'Shock Wrench', i: '⚡', c: 15, cd: 2, t: 'interrupt', p: 0.4, d: 'Сбивает каст. Немота 2 хода.', sid: 90009 }),
          ],
        },
        {
          id: 'tinkerer', name: 'Изобретатель', nameEn: 'Tinkerer', role: 'dps', icon: '🧪',
          stats: { hp: 95, atk: 16, def: 4, speed: 12 },
          resourceOverride: { type: 'energy', name: 'Пар', icon: '💨', max: 100, start: 100, regen: 5 },
          abilities: [
            A({ id: 'zap_gun', n: 'Электропушка', en: 'Zap Gun', i: '⚡', g: 20, gs: 1, t: 'damage', fl: 13, school: 'arcane', d: '', sid: 90021 }),
            A({ id: 'flux_bolt', n: 'Поток флюкса', en: 'Flux Bolt', i: '🌀', c: 0, g: 5, gs: 2, t: 'damage', fl: 30, school: 'arcane', d: '+5 пар · +2 детали.', sid: 90022 }),
            A({ id: 'death_ray', n: 'Гномский луч смерти', en: 'Gnomish Death Ray', i: '☢️', c: 50, cd: 4, t: 'damage', fl: 64, school: 'fire', d: 'Мощный луч · КД 4 · DoT радиации · без деталей.', sid: 90023 }),
            A({ id: 'rocket_chicken', n: 'Ракета-курица', en: 'Rocket Chicken', i: '🐔', c: 30, cs: 1, cd: 4, t: 'aoe', fl: 10, school: 'fire', d: '', sid: 90024 }),
            A({ id: 'world_destroyer', n: 'Личный разрушитель миров', en: 'World Destroyer', i: '🤖', c: 50, cs: 3, cd: 5, t: 'summon', p: 1, d: '', sid: 90025 }),
            A({ id: 'shrink_ray', n: 'Уменьшающий луч', en: 'Shrink Ray', i: '🔬', c: 25, cd: 3, t: 'debuff', p: 0.15, d: '', sid: 90026 }),
            A({ id: 'scrap_swarm', n: 'Рой металлолома', en: 'Scrap Swarm', i: '🐝', c: 40, cs: 2, cd: 8, t: 'summon', p: 1, d: '', sid: 90028 }),
            A({ id: 'shock_wrench', n: 'Шоковый ключ', en: 'Shock Wrench', i: '⚡', c: 20, cd: 5, t: 'cc', p: 1, bt: 2, d: '', sid: 90009 }),
            A({ id: 'debug_mode', n: 'Отладка', en: 'Debug', i: '🔧', c: 10, t: 'buff', fa: 1, d: '10 пар · переключает режим основного питомца СТ↔АОЕ · без хода · 1×/ход', sid: 90031 }),
            A({ id: 'wrench_heal', n: 'Гаечный воскрешатель', en: 'Wrench Revive', i: '🩹', c: 25, cd: 3, t: 'heal', d: 'Хил за счет питомца (−50% HP пета → +10% max HP цели)', sid: 90032 }),
          ],
        },
      ],
    },
  ];

  function getClass(id) {
    return WOW_CLASSES.find(c => c.id === id);
  }

  function getSpec(classId, specId) {
    const c = getClass(classId);
    return c && c.specs.find(s => s.id === specId);
  }

  function resolveResources(cls, spec) {
    const res = Object.assign({}, spec.resourceOverride || cls.resource);
    const sec = spec.secondaryOverride !== undefined
      ? (spec.secondaryOverride ? Object.assign({}, spec.secondaryOverride) : null)
      : (cls.secondary ? Object.assign({}, cls.secondary) : null);
    return { primary: res, secondary: sec };
  }

  global.WOW_MOP = {
    classes: WOW_CLASSES,
    getClass,
    getSpec,
    resolveResources,
    version: 'MoP Classic',
    source: 'Wowhead MoP Classic class/spell data (combat actives)',
  };
})(typeof window !== 'undefined' ? window : globalThis);
