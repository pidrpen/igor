/**
 * Mythic Key — MoP 5.4.8 lite
 * Death Knight ability balance pack (blood / frost / unholy)
 *
 * Resource model:
 *   primary  → runes          costRunes: r { b, f, u, any }
 *   secondary→ runic_power    genRunic:  rp   |  costSec: cs
 *
 * Rules (lite):
 *   - ~10 RP per spent rune on rune abilities (genRunic)
 *   - RP dump via costSec only (never primary `c`)
 *   - Blood tank pivots on Death Strike; Frost on Oblit + FS; Unholy on SS/Festering/Gargoyle/DT
 *
 * Drop-in: copy `specs[].abilities` (or whole class block) into wow-mop-data.js A()-builder.
 * Does NOT patch mythic-key.html.
 */
(function (global) {
  'use strict';

  function A(o) {
    return {
      id: o.id,
      name: o.n,
      nameEn: o.en || o.n,
      icon: o.i || '✨',
      cost: o.c ?? 0,
      gen: o.g ?? 0,
      costSec: o.cs ?? 0,
      genSec: o.gs ?? 0,
      costRunes: o.r || null, // { b, f, u, any }
      genRunic: o.rp ?? 0,
      cd: o.cd ?? 0,
      type: o.t,
      power: o.p ?? 1,
      desc: o.d || '',
      spellId: o.sid || 0,
    };
  }

  const DEATHKNIGHT_CLASS = {
    id: 'deathknight',
    name: 'Рыцарь смерти',
    nameEn: 'Death Knight',
    icon: '💀',
    color: '#C41F3B',
    resource: { type: 'runes', name: 'Руны', icon: '🔷', max: 6, start: 6, regen: 1 },
    secondary: { type: 'runic_power', name: 'Сила рун', icon: '💙', max: 100, start: 0 },
    specs: [
      // ─────────────────────────────────────
      // BLOOD — tank · Death Strike core
      // ─────────────────────────────────────
      {
        id: 'blood',
        name: 'Кровь',
        nameEn: 'Blood',
        role: 'tank',
        icon: '🩸',
        stats: { hp: 175, atk: 13, def: 11, speed: 8 },
        abilities: [
          // Core tank strike: 1F+1U (MoP), +20 RP, engine also heals on death_strike
          A({
            id: 'death_strike', n: 'Удар смерти', en: 'Death Strike', i: '💚',
            r: { f: 1, u: 1 }, rp: 20, t: 'damage', p: 1.25,
            d: 'Лёд+нечестивость, +20 силы рун, вампиризм.', sid: 49998,
          }),
          A({
            id: 'heart_strike', n: 'Удар в сердце', en: 'Heart Strike', i: '❤️',
            r: { b: 1 }, rp: 10, t: 'damage', p: 1.1,
            d: 'Руна крови, +10 силы рун.', sid: 55050,
          }),
          A({
            id: 'blood_boil', n: 'Вскипание крови', en: 'Blood Boil', i: '🫧',
            r: { b: 1 }, rp: 10, t: 'aoe', p: 0.75,
            d: 'По области, +10 силы рун.', sid: 48721,
          }),
          // Lite dump: Death Coil (MoP tank also has Rune Strike 30 — Coil kept as sole dump)
          A({
            id: 'death_coil', n: 'Лик смерти', en: 'Death Coil', i: '🌀',
            cs: 40, t: 'damage', p: 1.35,
            d: 'Расход 40 силы рун — сильный удар.', sid: 47541,
          }),
          A({
            id: 'rune_tap', n: 'Захват рун', en: 'Rune Tap', i: '🔋',
            r: { b: 1 }, rp: 10, cd: 2, t: 'heal', p: 0.28,
            d: 'Руна крови — самолечение, +10 силы рун.', sid: 48982,
          }),
          A({
            id: 'vampiric_blood', n: 'Кровь вампира', en: 'Vampiric Blood', i: '🧛',
            cd: 4, t: 'buff', p: 0.25,
            d: '+макс. HP на 3 хода.', sid: 55233,
          }),
          A({
            id: 'bone_shield', n: 'Костяной щит', en: 'Bone Shield', i: '🦴',
            r: { u: 1 }, rp: 10, cd: 3, t: 'shield', p: 0.38,
            d: 'Руна нечестивости — щит, +10 силы рун.', sid: 49222,
          }),
          A({
            id: 'ds', n: 'Смерть и разложение', en: 'Death and Decay', i: '☠️',
            r: { u: 1 }, rp: 10, cd: 2, t: 'aoe', p: 0.8,
            d: 'Зона +10 силы рун.', sid: 43265,
          }),
          A({
            id: 'taunt', n: 'Тёмная власть', en: 'Dark Command', i: '📢',
            cd: 2, t: 'taunt', p: 0,
            d: 'Провокация.', sid: 56222,
          }),
          A({
            id: 'icebound', n: 'Незыблемость льда', en: 'Icebound Fortitude', i: '🧊',
            cd: 5, t: 'shield', p: 0.42,
            d: 'Щит (перезарядка).', sid: 48792,
          }),
        ],
      },

      // ─────────────────────────────────────
      // FROST — dps · Obliterate + Frost Strike
      // ─────────────────────────────────────
      {
        id: 'frost',
        name: 'Лёд',
        nameEn: 'Frost',
        role: 'dps',
        icon: '❄️',
        stats: { hp: 120, atk: 17, def: 6, speed: 10 },
        abilities: [
          A({
            id: 'obliterate', n: 'Уничтожение', en: 'Obliterate', i: '❄️',
            r: { f: 1, u: 1 }, rp: 20, t: 'damage', p: 1.45,
            d: 'Лёд+нечестивость, +20 силы рун.', sid: 49020,
          }),
          A({
            id: 'fs', n: 'Удар льда', en: 'Frost Strike', i: '🧊',
            cs: 35, t: 'damage', p: 1.5,
            d: 'Главный расход 35 силы рун.', sid: 49143,
          }),
          A({
            id: 'howling', n: 'Воющий ветер', en: 'Howling Blast', i: '🌬️',
            r: { f: 1 }, rp: 10, t: 'aoe', p: 0.9,
            d: 'Руна льда, +10 силы рун, AoE.', sid: 49184,
          }),
          A({
            id: 'plague_strike', n: 'Удар чумы', en: 'Plague Strike', i: '🦠',
            r: { u: 1 }, rp: 10, t: 'dot', p: 0.55,
            d: 'Болезнь, +10 силы рун.', sid: 45462,
          }),
          A({
            id: 'ity', n: 'Ледяной столп', en: 'Pillar of Frost', i: '🗼',
            cd: 4, t: 'buff', p: 0.3,
            d: '+атака.', sid: 51271,
          }),
          A({
            id: 'outbreak', n: 'Вспышка болезни', en: 'Outbreak', i: '🤢',
            cd: 3, t: 'dot', p: 0.55,
            d: 'Болезни (без рун).', sid: 77575,
          }),
          A({
            id: 'soul_reaper', n: 'Жнец душ', en: 'Soul Reaper', i: '⚰️',
            r: { f: 1 }, rp: 10, cd: 2, t: 'damage', p: 1.7,
            d: 'Руна льда, +10 силы рун. Добивание ≤35%.', sid: 130735,
          }),
          A({
            id: 'dnd', n: 'Смерть и разложение', en: 'Death and Decay', i: '☠️',
            r: { u: 1 }, rp: 10, cd: 2, t: 'aoe', p: 0.75,
            d: 'По области +10 силы рун.', sid: 43265,
          }),
        ],
      },

      // ─────────────────────────────────────
      // UNHOLY — dps · SS / Festering / Gargoyle / DT
      // ─────────────────────────────────────
      {
        id: 'unholy',
        name: 'Нечестивость',
        nameEn: 'Unholy',
        role: 'dps',
        icon: '🧟',
        stats: { hp: 115, atk: 17, def: 5, speed: 10 },
        abilities: [
          A({
            id: 'scourge', n: 'Удар Плети', en: 'Scourge Strike', i: '☠️',
            r: { u: 1 }, rp: 10, t: 'damage', p: 1.4,
            d: 'Руна нечестивости, +10 силы рун.', sid: 55090,
          }),
          A({
            id: 'festering', n: 'Удар разложения', en: 'Festering Strike', i: '🦠',
            r: { b: 1, f: 1 }, rp: 20, t: 'damage', p: 1.25,
            d: 'Кровь+лёд, +20 силы рун.', sid: 85948,
          }),
          A({
            id: 'death_coil', n: 'Лик смерти', en: 'Death Coil', i: '🌀',
            cs: 40, t: 'damage', p: 1.4,
            d: 'Расход 40 силы рун.', sid: 47541,
          }),
          A({
            id: 'outbreak', n: 'Вспышка болезни', en: 'Outbreak', i: '🤢',
            cd: 3, t: 'dot', p: 0.6,
            d: 'Болезни.', sid: 77575,
          }),
          A({
            id: 'dark_trans', n: 'Тёмное превращение', en: 'Dark Transformation', i: '👹',
            r: { u: 1 }, rp: 10, cd: 3, t: 'buff', p: 0.28,
            d: 'Усиливает вурдалака, +10 силы рун.', sid: 63560,
          }),
          A({
            id: 'summon_garg', n: 'Призыв горгульи', en: 'Summon Gargoyle', i: '🦇',
            cd: 5, t: 'damage', p: 1.3,
            d: 'Урон + горгулья (без рун/RP).', sid: 49206,
          }),
          A({
            id: 'dnd', n: 'Смерть и разложение', en: 'Death and Decay', i: '☠️',
            r: { u: 1 }, rp: 10, cd: 2, t: 'aoe', p: 0.85,
            d: 'По области +10 силы рун.', sid: 43265,
          }),
          A({
            id: 'soul_reaper', n: 'Жнец душ', en: 'Soul Reaper', i: '⚰️',
            r: { u: 1 }, rp: 10, cd: 2, t: 'damage', p: 1.65,
            d: 'Руна нечестивости, +10 силы рун. Добивание ≤35%.', sid: 130736,
          }),
          A({
            id: 'plague_strike', n: 'Удар чумы', en: 'Plague Strike', i: '🦠',
            r: { u: 1 }, rp: 10, t: 'dot', p: 0.55,
            d: 'Болезнь +10 силы рун.', sid: 45462,
          }),
        ],
      },
    ],
  };

  /** Flat ability tables for tooling / report diffs */
  const DEATHKNIGHT_ABILITIES = {
    blood: DEATHKNIGHT_CLASS.specs[0].abilities,
    frost: DEATHKNIGHT_CLASS.specs[1].abilities,
    unholy: DEATHKNIGHT_CLASS.specs[2].abilities,
  };

  /** Balance metadata (not used by engine) */
  const DEATHKNIGHT_BALANCE_META = {
    version: 'mop-5.4.8-lite',
    classId: 'deathknight',
    resource: {
      primary: 'runes',
      secondary: 'runic_power',
      fields: {
        costRunes: 'r',
        genRunic: 'rp',
        costSec: 'cs',
      },
      norms: {
        rpPerRune: 10,
        deathCoil: 40,
        frostStrike: 35,
      },
    },
    pivots: {
      blood: ['death_strike', 'heart_strike', 'death_coil'],
      frost: ['obliterate', 'fs', 'howling'],
      unholy: ['scourge', 'festering', 'death_coil', 'summon_garg', 'dark_trans'],
    },
    notes: [
      'Death Strike / Obliterate: typed f+u (not any:2) — preserves B/F/U cycle.',
      'All rune spends grant genRunic (~10/rune), including utility (Rune Tap, Bone Shield, DnD, DT).',
      'Blood RP dump = Death Coil 40 (Rune Strike omitted in lite).',
      'Frost has no Death Coil; dump = Frost Strike 35.',
      'Unholy: Shadow Infusion / Death Runes not modeled — DT is U-rune + CD gate.',
      'soul_reaper stays in EXECUTE_IDS (engine); ≤35% only.',
      'Passive +5 RP/turn is engine-side; not part of this pack.',
    ],
  };

  global.DEATHKNIGHT_CLASS = DEATHKNIGHT_CLASS;
  global.DEATHKNIGHT_ABILITIES = DEATHKNIGHT_ABILITIES;
  global.DEATHKNIGHT_BALANCE_META = DEATHKNIGHT_BALANCE_META;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      DEATHKNIGHT_CLASS,
      DEATHKNIGHT_ABILITIES,
      DEATHKNIGHT_BALANCE_META,
      A,
    };
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
