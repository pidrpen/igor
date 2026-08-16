/**
 * Mythic Key MoP 5.4.8 lite — Priest (Discipline / Holy / Shadow)
 *
 * Ресурс: mana (primary, regen 7).
 * Disc: shields (PW:S, Pain Supp) + Penance ST.
 * Holy: Circle of Healing identity + Renew HoT + Holy Word.
 * Shadow: multi-DoT + shadow_orbs (secondaryOverride max 3) → Devouring cs:3.
 *
 * Orbs: data-only (secondaryOverride + gs/cs) — mythic-key.html не нужен.
 * Drop-in: заменить блок id:'priest' в wow-mop-data.js на PRIEST_CLASS,
 *          либо PRIEST_BALANCE.apply(WOW_MOP).
 *
 * Не править mythic-key.html из этого файла.
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
      costRunes: o.r || null,
      genRunic: o.rp ?? 0,
      cd: o.cd ?? 0,
      type: o.t,
      power: o.p ?? 1,
      desc: o.d || '',
      spellId: o.sid || 0,
    };
  }

  /**
   * Честные упрощения / optional engine work.
   * Orbs уже работают без HTML; ниже — то, чего lite сознательно нет.
   */
  const ENGINE_NEEDS = {
    shadow_orbs: {
      status: 'implemented_data_only',
      secondaryOverride: {
        type: 'shadow_orbs',
        name: 'Сферы тьмы',
        icon: '🔮',
        max: 3,
        start: 0,
      },
      gen: ['mind_blast gs:1', 'swd gs:1'],
      spend: ['devouring cs:3'],
      note:
        'Не нужен отдельный тип в HTML: resolveResources + genSec/costSec хватает. ' +
        'Упрощение: DP всегда 3 орба (нет scale 1–3).',
    },
    execute: {
      id: 'swd',
      status: 'engine_already',
      note: 'swd уже в EXECUTE_IDS (≤35% HP).',
    },
    hot_dot_hooks: {
      renew: 'HOT_SPELLS.renew (turns 4)',
      devouring: 'DOT_TURNS.devouring = 4',
      holy_fire_swp_vt: 'default DoT turns = 3',
      shadowfiend: 'PET_SUMMONS.shadowfiend',
    },
    skipped: [
      {
        id: 'atonement',
        severity: 'skip',
        note: 'Хил от урона нет. Disc Smite/HF = damage only, desc честный.',
      },
      {
        id: 'evangelism_archangel',
        severity: 'skip',
        note: 'Нет стаков евангелия. Archangel = free buff +ATK (ATK не качает heal/shield).',
      },
      {
        id: 'guardian_spirit_anti_death',
        severity: 'simplified',
        note: 'Вместо anti-death: type shield p0.40 free cd5.',
      },
      {
        id: 'vt_passive_mana_from_damage',
        severity: 'simplified',
        note: 'Вместо пассива с тиков: gen:2 на касте VT.',
      },
      {
        id: 'mind_sear_aoe',
        severity: 'skip',
        note: 'Нет Mind Sear в 9-кнопочном ките; cleave = multi-DoT.',
      },
      {
        id: 'penance_dual_channel',
        severity: 'skip',
        note: 'Penance = один heal-hit, не dual/channel.',
      },
    ],
  };

  const PRIEST_CLASS = {
    id: 'priest',
    name: 'Жрец',
    nameEn: 'Priest',
    icon: '🙏',
    color: '#FFFFFF',
    resource: { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 7 },
    secondary: null,
    engineNeeds: ENGINE_NEEDS,
    specs: [
      // ═══════════════════════════════════════
      // DISCIPLINE — shields + efficient ST
      // ═══════════════════════════════════════
      {
        id: 'discipline',
        name: 'Послушание',
        nameEn: 'Discipline',
        role: 'healer',
        icon: '📖',
        stats: { hp: 92, atk: 9, def: 4, speed: 10 },
        // identity: PW:S + Pain Supp absorb; Penance main ST; PoH party
        abilities: [
          A({ id: 'penance', n: 'Исповедь', en: 'Penance', i: '📿', c: 11, cd: 1, t: 'heal', p: 0.48, d: 'Основное лечение (лучшая η ST).', sid: 47540 }),
          A({ id: 'shield', n: 'Слово силы: Щит', en: 'Power Word: Shield', i: '🛡️', c: 11, cd: 1, t: 'shield', p: 0.44, d: 'Поглощение. Синергия с mastery shield.', sid: 17 }),
          A({ id: 'flash', n: 'Быстрое исцеление', en: 'Flash Heal', i: '💚', c: 13, t: 'heal', p: 0.46, d: 'Аварийный ST — дороже Penance по мане.', sid: 2061 }),
          A({ id: 'greater', n: 'Великое исцеление', en: 'Greater Heal', i: '💚', c: 16, t: 'heal', p: 0.56, d: 'Большой разовый хил (throughput).', sid: 2060 }),
          A({ id: 'prayer', n: 'Молитва исцеления', en: 'Prayer of Healing', i: '🙏', c: 16, cd: 1, t: 'heal_aoe', p: 0.28, d: 'Хил отряда. Чуть слабее Holy CoH по HPM.', sid: 596 }),
          A({ id: 'smite', n: 'Кара', en: 'Smite', i: '✨', c: 5, t: 'damage', p: 0.95, d: 'Дешёвый урон (без искупления).', sid: 585 }),
          A({ id: 'holy_fire', n: 'Священный огонь', en: 'Holy Fire', i: '🔥', c: 7, cd: 1, t: 'dot', p: 0.65, d: 'DoT (hit + тики).', sid: 14914 }),
          A({ id: 'pain_supp', n: 'Подавление боли', en: 'Pain Suppression', i: '🩹', cd: 5, t: 'shield', p: 0.50, d: 'Сильный бесплатный щит (save).', sid: 33206 }),
          A({ id: 'archangel', n: 'Архангел', en: 'Archangel', i: '😇', cd: 4, t: 'buff', p: 0.22, d: '+ATK на 3 хода (упрощ. без евангелия).', sid: 81700 }),
        ],
      },

      // ═══════════════════════════════════════
      // HOLY — CoH identity + HoT + Holy Word
      // ═══════════════════════════════════════
      {
        id: 'holy',
        name: 'Свет',
        nameEn: 'Holy',
        role: 'healer',
        icon: '✝️',
        stats: { hp: 92, atk: 8, def: 4, speed: 10 },
        // identity: CoH best AoE HPM; Renew HoT; Heal filler; HW CD spike
        abilities: [
          A({ id: 'heal', n: 'Исцеление', en: 'Heal', i: '💚', c: 10, t: 'heal', p: 0.46, d: 'Экономичный ST-filler.', sid: 2050 }),
          A({ id: 'flash', n: 'Быстрое исцеление', en: 'Flash Heal', i: '💚', c: 13, t: 'heal', p: 0.48, d: 'Авария: чуть сильнее Heal, хуже η.', sid: 2061 }),
          A({ id: 'gh', n: 'Великое исцеление', en: 'Greater Heal', i: '💚', c: 16, t: 'heal', p: 0.56, d: 'Большой ST (throughput).', sid: 2060 }),
          A({ id: 'renew', n: 'Обновление', en: 'Renew', i: '🌿', c: 8, t: 'heal', p: 0.33, d: 'HoT: hit + тики (HOT_SPELLS.renew).', sid: 139 }),
          A({ id: 'circle', n: 'Круг исцеления', en: 'Circle of Healing', i: '⭕', c: 12, cd: 2, t: 'heal_aoe', p: 0.30, d: 'Ключевой AoE-хил Holy (лучший HPM).', sid: 34861 }),
          A({ id: 'poh', n: 'Молитва исцеления', en: 'Prayer of Healing', i: '🙏', c: 16, t: 'heal_aoe', p: 0.27, d: 'AoE без КД — спам дороже CoH.', sid: 596 }),
          A({ id: 'holy_word', n: 'Слово Света: Безмятежность', en: 'Holy Word: Serenity', i: '🕊️', c: 10, cd: 2, t: 'heal', p: 0.55, d: 'Сильный ST на КД.', sid: 88684 }),
          A({ id: 'smite', n: 'Кара', en: 'Smite', i: '✨', c: 5, t: 'damage', p: 0.90, d: 'Урон-заполнитель.', sid: 585 }),
          A({ id: 'guardian', n: 'Дух-хранитель', en: 'Guardian Spirit', i: '👻', cd: 5, t: 'shield', p: 0.40, d: 'Аварийный absorb (упрощ. вместо anti-death).', sid: 47788 }),
        ],
      },

      // ═══════════════════════════════════════
      // SHADOW — DoTs + orbs → Devouring Plague
      // ═══════════════════════════════════════
      {
        id: 'shadow',
        name: 'Тьма',
        nameEn: 'Shadow',
        role: 'dps',
        icon: '🌑',
        stats: { hp: 88, atk: 17, def: 2, speed: 11 },
        secondaryOverride: {
          type: 'shadow_orbs',
          name: 'Сферы тьмы',
          icon: '🔮',
          max: 3,
          start: 0,
        },
        // identity: SW:P+VT; MB/SW:D build orbs; DP spend 3; flay filler; mastery dot
        abilities: [
          A({ id: 'mind_blast', n: 'Взрыв разума', en: 'Mind Blast', i: '🧠', c: 8, cd: 1, gs: 1, t: 'damage', p: 1.40, d: 'Основной удар + 1 сфера тьмы.', sid: 8092 }),
          A({ id: 'swp', n: 'Слово Тьмы: Боль', en: 'Shadow Word: Pain', i: '😣', c: 5, cd: 1, t: 'dot', p: 0.58, d: 'Дешёвый DoT (держать).', sid: 589 }),
          A({ id: 'vt', n: 'Прикосновение вампира', en: 'Vampiric Touch', i: '🦇', c: 7, cd: 1, g: 2, t: 'dot', p: 0.70, d: 'Сильный DoT; +2 маны при применении.', sid: 34914 }),
          A({ id: 'mind_flay', n: 'Пытка разума', en: 'Mind Flay', i: '🌀', c: 5, t: 'damage', p: 1.05, d: 'Дешёвый заполнитель (cost ≤ regen).', sid: 15407 }),
          A({ id: 'devouring', n: 'Всепожирающая чума', en: 'Devouring Plague', i: '🦠', c: 6, cd: 2, cs: 3, t: 'dot', p: 0.95, d: 'Расход 3 сфер — сильный DoT (4 тика).', sid: 2944 }),
          A({ id: 'swd', n: 'Слово Тьмы: Смерть', en: 'Shadow Word: Death', i: '💀', c: 7, cd: 2, gs: 1, t: 'damage', p: 1.60, d: 'Добивание ≤35% HP + 1 сфера.', sid: 32379 }),
          A({ id: 'mind_spike', n: 'Шип разума', en: 'Mind Spike', i: '📌', c: 7, t: 'damage', p: 1.22, d: 'Мгновенный урон (хуже flay по мане).', sid: 73510 }),
          A({ id: 'shadowfiend', n: 'Исчадие Тьмы', en: 'Shadowfiend', i: '👾', cd: 4, t: 'damage', p: 1.15, d: 'Урон + исчадие на 4 раунда.', sid: 34433 }),
          A({ id: 'dispersion', n: 'Слияние с Тьмой', en: 'Dispersion', i: '🌫️', cd: 5, t: 'shield', p: 0.42, d: 'Щит (перезарядка). Без регена маны.', sid: 47585 }),
        ],
      },
    ],
  };

  function apply(WOW_MOP) {
    if (!WOW_MOP || !Array.isArray(WOW_MOP.classes)) return false;
    const idx = WOW_MOP.classes.findIndex(c => c.id === 'priest');
    if (idx < 0) return false;
    // deep-ish clone so callers can mutate safely
    const clone = JSON.parse(JSON.stringify(PRIEST_CLASS));
    // strip meta not present on live class objects
    delete clone.engineNeeds;
    WOW_MOP.classes[idx] = clone;
    return true;
  }

  function applyToWowClass(wowClass) {
    if (!wowClass || wowClass.id !== 'priest') {
      throw new Error('applyToWowClass: expected class id "priest"');
    }
    const clone = JSON.parse(JSON.stringify(PRIEST_CLASS));
    delete clone.engineNeeds;
    Object.keys(clone).forEach(k => {
      wowClass[k] = clone[k];
    });
    return wowClass;
  }

  const PRIEST_BALANCE = {
    A,
    classId: 'priest',
    class: PRIEST_CLASS,
    specs: PRIEST_CLASS.specs,
    resource: PRIEST_CLASS.resource,
    secondary: PRIEST_CLASS.secondary,
    engineNeeds: ENGINE_NEEDS,
    apply,
    applyToWowClass,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PRIEST_BALANCE;
  }
  global.PRIEST_BALANCE = PRIEST_BALANCE;
  global.PRIEST_CLASS = PRIEST_CLASS;
  function applyPriestBalance(classes) {
    if (typeof apply === 'function' && global.WOW_MOP) {
      return apply(global.WOW_MOP);
    }
    if (!Array.isArray(classes)) return false;
    const i = classes.findIndex((c) => c.id === 'priest');
    const clone = JSON.parse(JSON.stringify(PRIEST_CLASS));
    delete clone.engineNeeds;
    if (i >= 0) classes[i] = clone; else classes.push(clone);
    return true;
  }
  PRIEST_BALANCE.applyClasses = applyPriestBalance;
  // Keep apply(WOW_MOP) and also expose unified apply on pack via wrapper in apply-all
  global.CLASS_BALANCE_PACKS = global.CLASS_BALANCE_PACKS || [];
  global.CLASS_BALANCE_PACKS.push({ id: 'priest', apply: applyPriestBalance });

})(typeof window !== 'undefined' ? window : globalThis);
