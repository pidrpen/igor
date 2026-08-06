/**
 * Mythic Key — Death Knight (Blood / Unholy unlocked; Frost locked)
 * Современный flat-баланс (как воин/паладин): вес Nт ≈ Nт в бою при atk ≈ 15.
 *
 * Ресурсы:
 *   primary  → runes        costRunes: r { b, f, u, any }
 *   secondary→ runic_power  genRunic: rp | costSec: cs
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
    return ab;
  }

  const DEATHKNIGHT_CLASS = {
    id: 'deathknight',
    name: 'Рыцарь смерти',
    nameEn: 'Death Knight',
    icon: '💀',
    color: '#C41F3B',
    resource: { type: 'runes', name: 'Руны', icon: '🔷', max: 6, start: 6, regen: 1 },
    secondary: { type: 'runic_power', name: 'Сила рун', icon: '💙', max: 100, start: 20 },
    specs: [
      // ─── Blood (tank) — unlocked ───────────────────────────
      {
        id: 'blood',
        name: 'Кровь',
        nameEn: 'Blood',
        role: 'tank',
        icon: '🩸',
        // atk 15 → вес Nт ≈ Nт на флоате
        stats: { hp: 172, atk: 15, def: 12, speed: 8 },
        abilities: [
          A({ id: 'death_strike', n: 'Удар смерти', en: 'Death Strike', i: '💚',
            r: { f: 1, u: 1 }, rp: 20, t: 'damage', fl: 24, lifesteal: 0.25, school: 'physical',
            d: 'Лёд+нечестивость · 24т · вампиризм 25% · +20 силы рун', sid: 49998 }),
          A({ id: 'heart_strike', n: 'Удар в сердце', en: 'Heart Strike', i: '❤️',
            r: { b: 1 }, rp: 10, t: 'damage', fl: 16, school: 'physical',
            d: 'Руна крови · 16т · +10 силы рун', sid: 55050 }),
          A({ id: 'blood_boil', n: 'Вскипание крови', en: 'Blood Boil', i: '🫧',
            r: { b: 1 }, rp: 10, t: 'aoe', fl: 14, school: 'shadow',
            d: '14т AoE · руна крови · +10 силы рун', sid: 48721 }),
          A({ id: 'death_coil', n: 'Лик смерти', en: 'Death Coil', i: '🌀',
            cs: 40, t: 'damage', fl: 26, school: 'shadow',
            d: '26т · 40 силы рун', sid: 47541 }),
          A({ id: 'bone_shield', n: 'Костяной щит', en: 'Bone Shield', i: '🦴',
            r: { u: 1 }, rp: 10, cd: 3, t: 'shield', fl: 40, school: 'none',
            d: 'Щит 40т · руна нечестивости · +10 силы рун · КД 3', sid: 49222 }),
          A({ id: 'dnd', n: 'Смерть и разложение', en: 'Death and Decay', i: '☠️',
            r: { u: 1 }, rp: 10, cd: 2, t: 'aoe', fl: 10, school: 'shadow',
            applyDot: { flat: 4, turns: 3, name: 'Смерть и разложение', icon: '☠️', id: 'dnd', school: 'shadow' },
            d: '10т AoE + DoT 4т×3 · +10 силы рун', sid: 43265 }),
          A({ id: 'vampiric_blood', n: 'Кровь вампира', en: 'Vampiric Blood', i: '🧛',
            cd: 6, t: 'buff', fa: 1, hpPct: 0.3, bt: 3, school: 'none',
            d: '+30% max HP · 3 хода · без хода', sid: 55233 }),
          A({ id: 'icebound', n: 'Незыблемость льда', en: 'Icebound Fortitude', i: '🧊',
            cd: 8, t: 'buff', fa: 1, dr: 0.4, bt: 2, school: 'none',
            d: '−40% урон · 2 хода · без хода', sid: 48792 }),
          A({ id: 'taunt', n: 'Тёмная власть', en: 'Dark Command', i: '📢',
            cd: 2, t: 'taunt', p: 0, fa: 1, school: 'none',
            d: 'Агро · без хода', sid: 56222 }),
        ],
      },

      // ─── Frost (locked — data only) ────────────────────────
      {
        id: 'frost',
        name: 'Лёд',
        nameEn: 'Frost',
        role: 'dps',
        icon: '❄️',
        stats: { hp: 115, atk: 15, def: 5, speed: 11 },
        abilities: [
          A({ id: 'obliterate', n: 'Уничтожение', en: 'Obliterate', i: '❄️',
            r: { f: 1, u: 1 }, rp: 20, t: 'damage', fl: 28, school: 'frost', d: '', sid: 49020 }),
          A({ id: 'fs', n: 'Удар льда', en: 'Frost Strike', i: '🧊',
            cs: 35, t: 'damage', fl: 26, school: 'frost', d: '', sid: 49143 }),
          A({ id: 'howling', n: 'Воющий ветер', en: 'Howling Blast', i: '🌬️',
            r: { f: 1 }, rp: 10, t: 'aoe', fl: 16, school: 'frost', d: '', sid: 49184 }),
          A({ id: 'ity', n: 'Ледяной столп', en: 'Pillar of Frost', i: '🗼',
            cd: 5, t: 'buff', fa: 1, atkMod: 0.2, bt: 3, school: 'none', d: '', sid: 51271 }),
          A({ id: 'soul_reaper', n: 'Жнец душ', en: 'Soul Reaper', i: '⚰️',
            r: { f: 1 }, rp: 10, cd: 2, t: 'damage', fl: 34, school: 'frost', d: '≤35% HP', sid: 130735 }),
          A({ id: 'dnd', n: 'Смерть и разложение', en: 'Death and Decay', i: '☠️',
            r: { u: 1 }, rp: 10, cd: 2, t: 'aoe', fl: 12, school: 'shadow', d: '', sid: 43265 }),
        ],
      },

      // ─── Unholy (dps) — unlocked ───────────────────────────
      {
        id: 'unholy',
        name: 'Нечестивость',
        nameEn: 'Unholy',
        role: 'dps',
        icon: '🧟',
        stats: { hp: 115, atk: 15, def: 5, speed: 11 },
        abilities: [
          A({ id: 'scourge', n: 'Удар Плети', en: 'Scourge Strike', i: '☠️',
            r: { u: 1 }, rp: 10, t: 'damage', fl: 22, school: 'shadow',
            d: 'Руна нечестивости · 22т · +10 силы рун', sid: 55090 }),
          A({ id: 'festering', n: 'Удар разложения', en: 'Festering Strike', i: '🦠',
            r: { b: 1, f: 1 }, rp: 20, t: 'damage', fl: 18, school: 'physical',
            d: 'Кровь+лёд · 18т · +20 силы рун', sid: 85948 }),
          A({ id: 'death_coil', n: 'Лик смерти', en: 'Death Coil', i: '🌀',
            cs: 40, t: 'damage', fl: 28, school: 'shadow',
            d: '28т · 40 силы рун', sid: 47541 }),
          A({ id: 'outbreak', n: 'Вспышка болезни', en: 'Outbreak', i: '🤢',
            cd: 8, t: 'aoe', fl: 8, school: 'shadow',
            applyDot: { flat: 6, turns: 4, name: 'Болезнь', icon: '🦠', id: 'plague', school: 'shadow' },
            d: '8т AoE + болезнь 6т×4 на всех врагов · КД 8 · без рун', sid: 77575 }),
          A({ id: 'dark_trans', n: 'Тёмное превращение', en: 'Dark Transformation', i: '👹',
            r: { u: 1 }, rp: 10, cd: 3, t: 'buff', fa: 1, school: 'none',
            d: 'Усиливает вурдалака · руна нечестивости · +10 силы рун · без хода', sid: 63560 }),
          A({ id: 'summon_garg', n: 'Призыв горгульи', en: 'Summon Gargoyle', i: '🦇',
            cd: 5, t: 'damage', fl: 18, school: 'shadow',
            d: '18т + горгулья 4 хода · КД 5', sid: 49206 }),
          A({ id: 'dnd', n: 'Смерть и разложение', en: 'Death and Decay', i: '☠️',
            r: { u: 1 }, rp: 10, cd: 2, t: 'aoe', fl: 14, school: 'shadow',
            applyDot: { flat: 4, turns: 3, name: 'Смерть и разложение', icon: '☠️', id: 'dnd', school: 'shadow' },
            d: '14т AoE + DoT · +10 силы рун', sid: 43265 }),
          A({ id: 'soul_reaper', n: 'Жнец душ', en: 'Soul Reaper', i: '⚰️',
            r: { u: 1 }, rp: 10, cd: 2, t: 'damage', fl: 36, school: 'shadow',
            d: '36т · ≤35% HP · руна нечестивости · +10 силы рун', sid: 130736 }),
        ],
      },
    ],
  };

  function applyDeathKnightBalance(classes) {
    if (!Array.isArray(classes) || !DEATHKNIGHT_CLASS) return false;
    const i = classes.findIndex((c) => c.id === 'deathknight');
    const clone = JSON.parse(JSON.stringify(DEATHKNIGHT_CLASS));
    if (i >= 0) classes[i] = clone; else classes.push(clone);
    return true;
  }

  global.DEATHKNIGHT_CLASS = DEATHKNIGHT_CLASS;
  global.DEATHKNIGHT_BALANCE = {
    classId: 'deathknight',
    class: DEATHKNIGHT_CLASS,
    specs: DEATHKNIGHT_CLASS.specs,
    apply: applyDeathKnightBalance,
    A,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DEATHKNIGHT_CLASS, applyDeathKnightBalance, A };
  }

  global.CLASS_BALANCE_PACKS = global.CLASS_BALANCE_PACKS || [];
  global.CLASS_BALANCE_PACKS.push({ id: 'deathknight', apply: applyDeathKnightBalance });

})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
