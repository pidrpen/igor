/**
 * Черновик охотника на демонов. Не подключён в apply-all.
 * Карточка в лобби серая, пока нет в PATCHED_SPECS.
 * Смотреть и править здесь; в бой не заливать, пока не скажешь.
 */
(function (global) {
  'use strict';

  function A(o) {
    const ab = {
      id: o.id, name: o.n, nameEn: o.en || o.n, icon: o.i || '✨',
      cost: o.c ?? 0, gen: o.g ?? 0, costSec: o.cs ?? 0, genSec: o.gs ?? 0,
      cd: o.cd ?? 0, type: o.t, power: o.p ?? 1, desc: o.d || '', spellId: o.sid || 0,
    };
    if (o.fa) ab.freeAction = true;
    if (o.fl != null) ab.flat = o.fl;
    if (o.applyDot) ab.applyDot = o.applyDot;
    if (o.dmgReduce != null) ab.dmgReduce = o.dmgReduce;
    if (o.atkMod != null) ab.atkMod = o.atkMod;
    if (o.lifesteal != null) ab.lifesteal = o.lifesteal;
    if (o.bt != null) ab.buffTurns = o.bt;
    if (o.school) ab.school = o.school;
    if (o.ch != null) ab.maxCharges = o.ch;
    return ab;
  }

  const DH_CLASS = {
    id: 'demonhunter',
    name: 'Охотник на демонов',
    nameEn: 'Demon Hunter',
    icon: '😈',
    color: '#A330C9',
    resource: { type: 'fury', name: 'Ярость скверны', icon: '🟢', max: 100, start: 20, regen: 8 },
    secondary: { type: 'soul_fragments', name: 'Осколки души', icon: '💠', max: 5, start: 0 },
    specs: [
      {
        id: 'vengeance', name: 'Месть', nameEn: 'Vengeance', role: 'tank', icon: '🛡️',
        stats: { hp: 165, atk: 13, def: 11, speed: 9 },
        abilities: [
          A({ id: 'shear', n: 'Рассечение', en: 'Shear', i: '🗡️', g: 15, gs: 1, t: 'damage', fl: 16, school: 'physical',
            d: '16т · +15 ярости скверны · +1 осколок души' }),
          A({ id: 'fracture', n: 'Перелом', en: 'Fracture', i: '💥', c: 25, gs: 2, t: 'damage', fl: 22, school: 'physical',
            d: '22т · 25 ярости · +2 осколка' }),
          A({ id: 'soul_cleave', n: 'Раскол души', en: 'Soul Cleave', i: '💚', c: 40, cs: 2, t: 'damage', fl: 28, lifesteal: 0.25, school: 'fel',
            d: '28т · вампиризм 25% · 2 осколка' }),
          A({ id: 'immolation_aura', n: 'Обжигающая аура', en: 'Immolation Aura', i: '🔥', cd: 3, t: 'aoe', fl: 8, fa: 1, school: 'fel',
            applyDot: { flat: 4, turns: 3, name: 'Обжигающая аура', school: 'fel' },
            d: '8т область + 4т×3 · без хода' }),
          A({ id: 'demon_spikes', n: 'Демонические шипы', en: 'Demon Spikes', i: '🦔', c: 20, cd: 2, ch: 2, t: 'buff', fa: 1, dmgReduce: 0.35, bt: 2, school: 'none',
            d: '−35% входящего · 2 хода · 2 заряда · без хода' }),
          A({ id: 'fel_devastation', n: 'Опустошение Скверны', en: 'Fel Devastation', i: '🌋', c: 50, cd: 6, t: 'aoe', fl: 24, lifesteal: 0.4, school: 'fel',
            d: '24т область · вампиризм 40% · КД 6' }),
          A({ id: 'metamorph_veng', n: 'Метаморфоза', en: 'Metamorphosis', i: '👹', cd: 8, t: 'buff', fa: 1, atkMod: 0.15, dmgReduce: 0.15, bt: 3, school: 'none',
            d: '+15% атаки и −15% входа · 3 хода · без хода' }),
          A({ id: 'torment', n: 'Мучение', en: 'Torment', i: '📢', cd: 2, t: 'taunt', fa: 1, school: 'none',
            d: 'Провокация · без хода' }),
        ],
      },
      {
        id: 'havoc', name: 'Истребление', nameEn: 'Havoc', role: 'dps', icon: '⚔️',
        stats: { hp: 100, atk: 17, def: 4, speed: 13 },
        secondaryOverride: null,
        abilities: [
          A({ id: 'demons_bite', n: 'Укус демона', en: "Demon's Bite", i: '🦷', g: 20, t: 'damage', fl: 18, school: 'physical',
            d: '18т · +20 ярости скверны' }),
          A({ id: 'chaos_strike', n: 'Удар Хаоса', en: 'Chaos Strike', i: '⚔️', c: 40, t: 'damage', fl: 36, school: 'fel',
            d: '36т · 40 ярости' }),
          A({ id: 'blade_dance', n: 'Танец клинков', en: 'Blade Dance', i: '🌀', c: 35, cd: 2, t: 'aoe', fl: 16, school: 'physical',
            d: '16т область · КД 2' }),
          A({ id: 'eye_beam', n: 'Пронзающий взгляд', en: 'Eye Beam', i: '👁️', c: 50, cd: 4, t: 'aoe', fl: 28, school: 'fel',
            d: '28т область · КД 4' }),
          A({ id: 'throw_glaive', n: 'Бросок боевого клинка', en: 'Throw Glaive', i: '🪃', c: 0, cd: 2, t: 'damage', fl: 12, school: 'physical',
            applyDot: { flat: 4, turns: 3, name: 'Клинки Хаоса', school: 'fel' },
            d: '12т + дот 4т×3 · КД 2' }),
          A({ id: 'fel_rush', n: 'Рывок Скверны', en: 'Fel Rush', i: '💨', g: 15, cd: 3, ch: 2, t: 'damage', fl: 10, fa: 1, school: 'fel',
            d: '10т · +15 ярости · 2 заряда · без хода' }),
          A({ id: 'metamorph_havoc', n: 'Метаморфоза', en: 'Metamorphosis', i: '👹', cd: 7, t: 'buff', fa: 1, atkMod: 0.3, bt: 3, school: 'none',
            d: '+30% атаки · 3 хода · без хода' }),
          A({ id: 'blur', n: 'Затуманивание', en: 'Blur', i: '👤', cd: 6, t: 'buff', fa: 1, dmgReduce: 0.4, bt: 2, school: 'none',
            d: '−40% входящего · 2 хода · без хода' }),
        ],
      },
    ],
  };

  global.DEMONHUNTER_DRAFT = DH_CLASS;
})(typeof window !== 'undefined' ? window : globalThis);
