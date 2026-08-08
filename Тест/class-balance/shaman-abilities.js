/**
 * Mythic Key — MoP 5.4.8 lite
 * Class balance pack: Shaman (Elemental / Enhancement / Restoration)
 *
 * Primary resource: Mana (class regen 6; Resto override regen 7).
 * Secondary: none (MoP — no Maelstrom bar; MW stacks not modeled).
 *
 * Core buttons (AI / list order):
 *   Elemental   → Lava Burst (lv)
 *   Enhancement → Stormstrike + Lava Lash
 *   Restoration → Riptide + Chain Heal
 *
 * Engine gaps (see ENGINE_NEEDS): Maelstrom Weapon, Fulmination, FS→LvB crit
 * guarantee, Unleash Life next-heal buff, HST multi-tick. Descriptions stay
 * honest — no fake resource claims.
 *
 * Usage:
 *   MK_SHAMAN_BALANCE.apply(WOW_MOP.classes)
 *   // or read MK_SHAMAN_BALANCE.class / .specs
 *
 * Do not require mythic-key.html changes for this pack.
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
      'purifyPct','healAmp','nextHealCharges','abilityCharges','staggerBonus','chainDecay','summonOnCast', 'petAtkMod', 'chainPrimary'];
    for (const k of keys) if (o[k] !== undefined) ab[k] = o[k];
    if (o.fl != null) ab.flat = o.fl;
    if (o.fa) ab.freeAction = true;
    if (o.bt != null) ab.buffTurns = o.bt;
    if (o.dr != null) ab.dmgReduce = o.dr;
    if (o.cm != null) ab.critMod = o.cm;
    if (o.ch != null) ab.maxCharges = o.ch;
    return ab;
  }

  /** Features the lite engine does not implement — do not claim in ability desc. */
  const ENGINE_NEEDS = {
    maelstromWeapon: {
      present: false,
      scope: 'enhancement',
      mopNote:
        'MoP Maelstrom Weapon = stacks on melee that instant-cast / empower LB & CL. Not a resource bar (Legion+).',
      engineNote:
        'No stack counter, no free-cast LB, no genSec/costSec hook for MW. Enh LB is plain mana filler.',
      dataPolicy: 'Honest desc on lb; secondary stays null. Do not invent type:maelstrom.',
    },
    fulmination: {
      present: false,
      scope: 'elemental',
      engineNote: 'Lightning Shield charges → Earth Shock dump not modeled. ES is plain damage.',
      dataPolicy: 'No secondary stacks; earth_shock desc without «charges».',
    },
    lavaBurstFlameShock: {
      present: false,
      scope: 'elemental',
      engineNote: 'No FS-required crit / guaranteed crit on Lava Burst.',
      dataPolicy: 'FS desc says setup flavor only; lv does not check FS.',
    },
    unleashLifeBuff: {
      present: false,
      scope: 'restoration',
      engineNote: 'No next-heal amplifier from Unleash Life.',
      dataPolicy: 'desc = instant heal only (no «+усиление»).',
    },
    healingStreamHot: {
      present: false,
      scope: 'restoration',
      engineNote: 'HOT_SPELLS has riptide only; no hst multi-tick.',
      dataPolicy: 'hst = weak one-shot heal_aoe; desc says упрощ. one-shot.',
    },
  };

  const SHAMAN_CLASS = {
    id: 'shaman',
    name: 'Шаман',
    nameEn: 'Shaman',
    icon: '⚡',
    color: '#0070DE',
    // Class default (Ele / Enh). Resto uses resourceOverride.
    resource: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 6 },
    secondary: null,
    specs: [
      // ─────────────────────────────────────
      // ELEMENTAL (testBuild) — Lava Burst flat engine
      // ST fl: lv 32 > ele_blast 30 > earth_shock 24 > lb 18
      // Mana: spenders + regen 6; thunderstorm returns +12 mana
      // atk 15 = FLAT_REF (как Resto production)
      // ─────────────────────────────────────
      {
        id: 'elemental',
        name: 'Стихии',
        nameEn: 'Elemental',
        role: 'dps',
        icon: '🌪️',
        testBuild: true,
        stats: { hp: 95, atk: 15, def: 3, speed: 11 },
        abilities: [
          A({ id: 'lv', n: 'Выброс лавы', en: 'Lava Burst', i: '🌋',
            c: 8, cd: 1, t: 'damage', fl: 32, school: 'fire',
            d: '32т · ядро ротации · КД 1', sid: 51505 }),
          A({ id: 'lb', n: 'Молния', en: 'Lightning Bolt', i: '⚡',
            c: 5, t: 'damage', fl: 18, school: 'nature',
            d: '18т · заполнитель', sid: 403 }),
          A({ id: 'flame_shock', n: 'Огненный шок', en: 'Flame Shock', i: '🔥',
            c: 6, cd: 1, t: 'dot', fl: 8, school: 'fire',
            applyDot: { flat: 5, turns: 5, name: 'Огненный шок', school: 'fire' },
            d: '8т + DoT 5т×5 · сетап (без гарантии крита LvB в lite)', sid: 8050 }),
          A({ id: 'earth_shock', n: 'Земной шок', en: 'Earth Shock', i: '🌍',
            c: 8, cd: 1, t: 'damage', fl: 24, school: 'nature',
            d: '24т · КД 1 (без Fulmination)', sid: 8042 }),
          A({ id: 'chain', n: 'Цепная молния', en: 'Chain Lightning', i: '🔗',
            c: 10, t: 'aoe', fl: 14, school: 'nature',
            d: '14т AoE', sid: 421 }),
          A({ id: 'thunderstorm', n: 'Гроза', en: 'Thunderstorm', i: '⛈️',
            c: 5, g: 12, cd: 3, t: 'aoe', fl: 12, school: 'nature',
            d: '12т AoE · +12 маны · КД 3', sid: 51490 }),
          A({ id: 'ele_blast', n: 'Взрыв стихий', en: 'Elemental Blast', i: '💫',
            c: 10, cd: 2, t: 'damage', fl: 30, school: 'nature',
            d: '30т · талант · КД 2', sid: 117014 }),
          A({ id: 'fire_ele', n: 'Элементаль огня', en: 'Fire Elemental Totem', i: '🔥',
            cd: 5, t: 'damage', fl: 14, school: 'fire',
            d: '14т + элементаль 4 хода (PET_SUMMONS) · КД 5', sid: 2894 }),
          A({ id: 'ascendance', n: 'Перерождение', en: 'Ascendance', i: '⬆️',
            cd: 5, t: 'buff', fa: 1, atkMod: 0.25, bt: 3, school: 'none',
            d: '+25% атаки · 3 хода · без хода', sid: 114050 }),
        ],
      },

      // ─────────────────────────────────────
      // ENHANCEMENT (testBuild) — Stormstrike / Lava Lash
      // ST fl: ss 28 > ll 26 > earth_shock 22 > lb 16
      // Maelstrom Weapon: ENGINE_NEEDS — not simulated
      // ─────────────────────────────────────
      {
        id: 'enhancement',
        name: 'Совершенствование',
        nameEn: 'Enhancement',
        role: 'dps',
        icon: '🪓',
        testBuild: true,
        stats: { hp: 105, atk: 15, def: 4, speed: 12 },
        abilities: [
          A({ id: 'stormstrike', n: 'Удар бури', en: 'Stormstrike', i: '⛈️',
            c: 8, cd: 1, t: 'damage', fl: 28, school: 'physical',
            d: '28т · ядро ротации · КД 1', sid: 17364 }),
          A({ id: 'lava_lash', n: 'Вскипание лавы', en: 'Lava Lash', i: '🌋',
            c: 7, cd: 1, t: 'damage', fl: 26, school: 'fire',
            d: '26т · вторая рука · КД 1', sid: 60103 }),
          A({ id: 'flame_shock', n: 'Огненный шок', en: 'Flame Shock', i: '🔥',
            c: 6, cd: 1, t: 'dot', fl: 7, school: 'fire',
            applyDot: { flat: 4, turns: 5, name: 'Огненный шок', school: 'fire' },
            d: '7т + DoT 4т×5 · под кольцо огня', sid: 8050 }),
          A({ id: 'lb', n: 'Молния', en: 'Lightning Bolt', i: '⚡',
            c: 5, t: 'damage', fl: 16, school: 'nature',
            d: '16т · заполнитель (Maelstrom Weapon не в движке)', sid: 403 }),
          A({ id: 'unleash', n: 'Высвободить стихии', en: 'Unleash Elements', i: '✨',
            c: 5, cd: 1, t: 'buff', fa: 1, atkMod: 0.15, bt: 3, school: 'none',
            d: '+15% атаки · 3 хода · без хода', sid: 73680 }),
          A({ id: 'fire_nova', n: 'Кольцо огня', en: 'Fire Nova', i: '💥',
            c: 9, cd: 1, t: 'aoe', fl: 16, school: 'fire',
            d: '16т AoE · КД 1', sid: 1535 }),
          A({ id: 'feral_spirit', n: 'Дух дикого волка', en: 'Feral Spirit', i: '🐺',
            cd: 5, t: 'damage', fl: 12, school: 'physical',
            d: '12т + 2 волка 3 хода (PET_SUMMONS) · КД 5', sid: 51533 }),
          A({ id: 'ascendance', n: 'Перерождение', en: 'Ascendance', i: '⬆️',
            cd: 5, t: 'buff', fa: 1, atkMod: 0.25, bt: 3, school: 'none',
            d: '+25% атаки · 3 хода · без хода', sid: 114051 }),
          A({ id: 'earth_shock', n: 'Земной шок', en: 'Earth Shock', i: '🌍',
            c: 7, t: 'damage', fl: 22, school: 'nature',
            d: '22т · запасной удар без КД', sid: 8042 }),
        ],
      },

      // ─────────────────────────────────────
      // RESTORATION — Riptide + Chain Heal
      // ST value: riptide (HoT) ≥ hw > chw emergency tax
      // AoE: ch primary; hs CD zone; spirit_link free raid CD
      // ─────────────────────────────────────
      {
        id: 'restoration',
        name: 'Исцеление',
        nameEn: 'Restoration',
        role: 'healer',
        icon: '💚',
        // atk 15 = FLAT_REF: вес Nт ≈ Nт хила (как у паладина Свет)
        stats: { hp: 95, atk: 15, def: 4, speed: 10 },
        resourceOverride: {
          type: 'mana',
          name: 'Мана',
          icon: '💧',
          max: 100,
          start: 100,
          regen: 7,
        },
        abilities: [
          A({
            id: 'riptide', n: 'Быстрина', en: 'Riptide', i: '🌊',
            c: 4, cd: 1, t: 'heal', fl: 22,
            applyHot: { flat: 3, turns: 5, name: 'Быстрина' },
            nextHealCharges: 0, // tidal waves stacks handled as abilityCharges on cast
            d: 'СТ · 22т + HoT', sid: 61295,
          }),
          A({
            id: 'ch', n: 'Цепное исцеление', en: 'Chain Heal', i: '🔗',
            c: 13, t: 'heal_aoe', fl: 40, chainDecay: 0.05, chainPrimary: true,
            d: '40т · сначала выбранная, дальше по %HP (−5%/скачок)', sid: 1064,
          }),
          A({
            id: 'hw', n: 'Волна исцеления', en: 'Healing Wave', i: '🌊',
            c: 8, t: 'heal', fl: 30, d: 'СТ · 30т', sid: 331,
          }),
          A({
            id: 'chw', n: 'Исцеляющий всплеск', en: 'Healing Surge', i: '💧',
            c: 13, t: 'heal', fl: 24, d: 'СТ · 24т · авария', sid: 8004,
          }),
          A({
            id: 'hs', n: 'Исцеляющий ливень', en: 'Healing Rain', i: '🌧️',
            c: 15, cd: 2, t: 'heal_aoe', fl: 0,
            applyHot: { flat: 7, turns: 5, name: 'Исцеляющий ливень' }, d: '', sid: 73920,
          }),
          A({
            id: 'hst', n: 'Тотем целительного потока', en: 'Healing Stream Totem', i: '⛲',
            c: 5, cd: 2, t: 'summon', p: 1, d: '', sid: 5394,
          }),
          A({
            id: 'unleash', n: 'Высвободить жизнь (+20% след. хилы)', en: 'Unleash Life', i: '✨',
            c: 6, cd: 2, t: 'heal', fl: 15, fa: 1, healAmp: 0.2, nextHealCharges: 2, d: '', sid: 73685,
          }),
          A({
            id: 'flame_shock', n: 'Огненный шок', en: 'Flame Shock', i: '🔥',
            c: 6, t: 'dot', fl: 7, school: 'fire',
            applyDot: { flat: 4, turns: 6, name: 'Огненный шок', school: 'fire' }, d: '', sid: 8050,
          }),
          A({
            id: 'spirit_link', n: 'Тотем духовной связи', en: 'Spirit Link Totem', i: '🔗',
            c: 0, cd: 5, t: 'heal_aoe', fl: 15, dr: 0.1, bt: 3,
            d: '15т AoE · −10% урон 3х · после каждого удара выравнивает % HP отряда', sid: 98008,
          }),
        ],
      },
    ],
  };

  function apply(classes) {
    if (!Array.isArray(classes)) {
      throw new Error('MK_SHAMAN_BALANCE.apply expects WOW_CLASSES array');
    }
    const idx = classes.findIndex((c) => c.id === 'shaman');
    const clone = JSON.parse(JSON.stringify(SHAMAN_CLASS));
    if (idx >= 0) classes[idx] = clone;
    else classes.push(clone);
    return clone;
  }

  function getSpec(specId) {
    return SHAMAN_CLASS.specs.find((s) => s.id === specId) || null;
  }

  /** Quick power/cost snapshot for reports / tests */
  function efficiencyTable(specId) {
    const spec = getSpec(specId);
    if (!spec) return [];
    return spec.abilities.map((a) => {
      const cost = a.cost || 0;
      const raw = cost > 0 ? +(a.power / cost).toFixed(4) : Infinity;
      return {
        id: a.id,
        name: a.name,
        cost,
        gen: a.gen,
        cd: a.cd,
        type: a.type,
        power: a.power,
        pPerCost: raw,
      };
    });
  }

  global.MK_SHAMAN_BALANCE = {
    version: 'MoP 5.4.8 lite-test',
    classId: 'shaman',
    resource: 'mana',
    cores: {
      elemental: ['lv'],
      enhancement: ['stormstrike', 'lava_lash'],
      restoration: ['riptide', 'ch'],
    },
    engineNeeds: ENGINE_NEEDS,
    class: SHAMAN_CLASS,
    specs: SHAMAN_CLASS.specs,
    apply,
    getSpec,
    efficiencyTable,
  };
  global.CLASS_BALANCE_PACKS = global.CLASS_BALANCE_PACKS || [];
  global.CLASS_BALANCE_PACKS.push({ id: 'shaman', apply: apply });

})(typeof window !== 'undefined' ? window : globalThis);
