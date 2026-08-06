/* systems/ability-data: PET_DEFS, HoT, schools, estimates, applyStatus */
  const PET_DEFS = {
    hunter_pet: { name: 'Питомец', icon: '🐺', hp: 100, atk: 16, def: 5, speed: 13, role: 'dps' },
    felguard:   { name: 'Страж Скверны', icon: '👹', hp: 125, atk: 17, def: 7, speed: 11, role: 'dps' },
    imp:        { name: 'Бес', icon: '👿', hp: 55, atk: 14, def: 2, speed: 14, role: 'dps' },
    water_totem:{ name: 'Водяной тотем', icon: '⛲', hp: 40, atk: 8, def: 2, speed: 10, role: 'healer' },
    imp_boss:   { name: 'Главарь бесов', icon: '👑', hp: 70, atk: 18, def: 3, speed: 12, role: 'dps' },
    voidwalker: { name: 'Демон Бездны', icon: '👤', hp: 150, atk: 12, def: 9, speed: 8, role: 'tank' },
    ghoul:      { name: 'Вурдалак', icon: '🧟', hp: 105, atk: 16, def: 5, speed: 12, role: 'dps' },
    shadowfiend:{ name: 'Исчадие Тьмы', icon: '👾', hp: 75, atk: 18, def: 2, speed: 15, role: 'dps' },
    dire:       { name: 'Зверь', icon: '🐻', hp: 85, atk: 17, def: 4, speed: 13, role: 'dps' },
    wolf:       { name: 'Дух волка', icon: '🐺', hp: 70, atk: 15, def: 3, speed: 14, role: 'dps' },
    fire_ele:   { name: 'Элементаль огня', icon: '🔥', hp: 95, atk: 19, def: 3, speed: 12, role: 'dps' },
    gargoyle:   { name: 'Горгулья', icon: '🦇', hp: 90, atk: 18, def: 4, speed: 13, role: 'dps' },
    mirror:     { name: 'Зеркальная копия', icon: '🪞', hp: 45, atk: 13, def: 1, speed: 13, role: 'dps' },
    // Engineer mechanisms
    combat_bot:      { name: 'Боевой бот', icon: '🤖', hp: 120, atk: 17, def: 6, speed: 12, role: 'dps' },
    pocket_bot:      { name: 'Карманный бот', icon: '🔩', hp: 70, atk: 14, def: 3, speed: 14, role: 'dps' },
    turret:          { name: 'Автотурель', icon: '🗼', hp: 80, atk: 16, def: 4, speed: 10, role: 'dps' },
    bomb_drone:      { name: 'Дрон-бомба', icon: '🛸', hp: 45, atk: 18, def: 1, speed: 15, role: 'dps' },
    siege_walker:    { name: 'Осадный ходун', icon: '🦾', hp: 160, atk: 20, def: 8, speed: 9, role: 'dps' },
    rocket_chicken:  { name: 'Ракета-курица', icon: '🐔', hp: 55, atk: 17, def: 2, speed: 16, role: 'dps' },
    world_destroyer: { name: 'Разрушитель миров', icon: '🦿', hp: 140, atk: 21, def: 7, speed: 10, role: 'dps' },
    scrap_bot:       { name: 'Скрап-бот', icon: '⚙️', hp: 40, atk: 13, def: 1, speed: 15, role: 'dps' },
  };

  /** HoT spells: direct fraction + per-round tick. turns = full combat rounds the HoT lasts. */
  const PERIODIC_ROUNDS = 3; // DoT/HoT always last this many combat rounds (1 tick / round)
  const HOT_SPELLS = {
    renew:     { turns: PERIODIC_ROUNDS, direct: 0.2, tick: 0.28 },
    riptide:   { turns: PERIODIC_ROUNDS, direct: 0.45, tick: 0.22 },
    reju:      { turns: PERIODIC_ROUNDS, direct: 0.15, tick: 0.3 },
    regrowth:  { turns: PERIODIC_ROUNDS, direct: 0.65, tick: 0.22 },
    enveloping:{ turns: PERIODIC_ROUNDS, direct: 0.25, tick: 0.32 },
    renewing:  { turns: PERIODIC_ROUNDS, direct: 0.3, tick: 0.28 },
    lifebloom: { turns: PERIODIC_ROUNDS, direct: 0.15, tick: 0.35 },
    soothing:  { turns: PERIODIC_ROUNDS, direct: 0.55, tick: 0.3 },
  };
  /** Heal ids that always apply HoT via HOT_SPELLS (even if map key missing → defaults). */
  const HOT_ABILITY_IDS = new Set(Object.keys(HOT_SPELLS));
  function hotConfig(abilityId) {
    if (HOT_SPELLS[abilityId]) return { ...HOT_SPELLS[abilityId], turns: PERIODIC_ROUNDS };
    if (HOT_ABILITY_IDS.has(abilityId)) return { turns: PERIODIC_ROUNDS, direct: 0.35, tick: 0.25 };
    return null;
  }
  function periodicTurns(/* abilityId */) {
    return PERIODIC_ROUNDS;
  }

  /** Ability id → temporary pet summons (also may deal damage/aoe as normal type) */
  const PET_SUMMONS = {
    hand_guldan:  [{ def: 'imp', n: 2, turns: 3 }],
    shadowfiend:  [{ def: 'shadowfiend', n: 1, turns: 4 }],
    dire:         [{ def: 'dire', n: 1, turns: 3 }],
    feral_spirit: [{ def: 'wolf', n: 2, turns: 3 }],
    fire_ele:     [{ def: 'fire_ele', n: 1, turns: 4 }],
    summon_garg:  [{ def: 'gargoyle', n: 1, turns: 4 }],
    mirror:       [{ def: 'mirror', n: 2, turns: 3 }],
    // Engineer
    deploy_turret:      [{ def: 'turret', n: 1, turns: 4 }],
    call_siege_walker:  [{ def: 'siege_walker', n: 1, turns: 4 }],
    deploy_bomb_drone:  [{ def: 'bomb_drone', n: 2, turns: 3 }],
    rocket_chicken:     [{ def: 'rocket_chicken', n: 2, turns: 3 }],
    world_destroyer:    [{ def: 'world_destroyer', n: 1, turns: 2 }],
    scrap_swarm:        [{ def: 'scrap_bot', n: 2, turns: 5 }],
    hst:                [{ def: 'water_totem', n: 1, turns: 3 }],
    imp_leader:         [{ def: 'imp_boss', n: 1, turns: 3 }],
  };
  const toast = (msg, ms = 2400) => {
    const el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  };
  const log = (msg, cls = 'system') => {
    if (!run) return;
    run.logs.unshift({ msg, cls });
    if (run.logs.length > 90) run.logs.pop();
    renderLog();
  };

  function aiDelay() {
    return Math.max(80, Math.round(400 / gameSpeed));
  }
  function sfx(kind) {
    if (!soundOn) return;
    try {
      const ctx = sfx._ctx || (sfx._ctx = new (window.AudioContext || window.webkitAudioContext)());
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      const now = ctx.currentTime;
      if (kind === 'hit') { o.frequency.value = 180; g.gain.setValueAtTime(0.04, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.08); o.start(now); o.stop(now + 0.09); }
      else if (kind === 'crit') { o.frequency.value = 420; g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12); o.start(now); o.stop(now + 0.13); }
      else if (kind === 'heal') { o.type = 'sine'; o.frequency.value = 520; g.gain.setValueAtTime(0.04, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1); o.start(now); o.stop(now + 0.11); }
      else if (kind === 'win') { o.frequency.value = 660; g.gain.setValueAtTime(0.05, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.25); o.start(now); o.stop(now + 0.26); }
      else if (kind === 'lose') { o.frequency.value = 110; g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.3); o.start(now); o.stop(now + 0.31); }
      else if (kind === 'click') { o.frequency.value = 300; g.gain.setValueAtTime(0.02, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.04); o.start(now); o.stop(now + 0.05); }
    } catch (_) { /* ignore */ }
  }
  /** Per-uid stack so simultaneous numbers fan out over the portrait. */
  const floatStacks = new Map(); // uid -> next index

  function floatAnchor(unitUid) {
    const unit = unitEl(unitUid);
    if (!unit) return null;
    // Prefer portrait circle; fall back to pet face / whole card
    const port = unit.querySelector('.portrait, .art-wrap.pet-face') || unit;
    const r = port.getBoundingClientRect();
    if (!r.width && !r.height) {
      const r2 = unit.getBoundingClientRect();
      return { x: r2.left + r2.width / 2, y: r2.top + r2.height * 0.35, el: unit };
    }
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.4, el: unit };
  }

  /**
   * Floating combat number over unit portrait.
   * Lives in #float-layer (fixed) so renderCombat() re-renders never wipe it.
   */
  function floatText(unitUid, text, kind) {
    if (!unitUid) return;
    const layer = document.getElementById('float-layer');
    const anchor = floatAnchor(unitUid);
    if (!layer || !anchor) return;

    // Format: pure numbers get sign; long digit runs get compact fmt
    let shown = text;
    if (typeof text === 'number') {
      shown = (text > 0 ? '+' : text < 0 ? '−' : '') + fmt(Math.abs(text));
    } else if (typeof text === 'string') {
      shown = text
        .replace(/−/g, '-')
        .replace(/([+\-]?)(\d{4,})/g, (_, s, n) => (s === '-' ? '−' : s) + fmt(n));
      // Prefer en-dash for damage minus in UI
      if (shown.startsWith('-') && (kind === 'dmg' || kind === 'crit' || kind === 'dot')) {
        shown = '−' + shown.slice(1);
      }
    }

    // Stack offset: alternate L/R and climb so multi-hits remain readable
    const idx = floatStacks.get(unitUid) || 0;
    floatStacks.set(unitUid, idx + 1);
    setTimeout(() => {
      const cur = floatStacks.get(unitUid) || 1;
      floatStacks.set(unitUid, Math.max(0, cur - 1));
    }, 1100);
    const side = (idx % 2 === 0 ? -1 : 1) * (8 + (idx % 4) * 6);
    const lift = (idx % 5) * 10;
    const jitterX = side + (Math.random() * 8 - 4);
    const jitterY = lift + (Math.random() * 6 - 2);

    const span = document.createElement('div');
    const k = kind || 'dmg';
    span.className = 'float-text ' + k;
    span.textContent = shown;
    span.style.left = Math.round(anchor.x + jitterX) + 'px';
    span.style.top = Math.round(anchor.y - 4 - jitterY) + 'px';
    span.style.setProperty('--fx', Math.round(jitterX * 0.35) + 'px');
    // Crit pops a bit longer
    const life = k === 'crit' ? 1250 : 1050;
    if (k === 'crit') span.style.animationDuration = '1.2s';
    layer.appendChild(span);
    setTimeout(() => span.remove(), life);
  }
  function typeLabel(t) {
    return ({
      damage: 'урон', aoe: 'по области', heal: 'лечение', heal_aoe: 'лечение отряда',
      shield: 'щит', taunt: 'провокация', buff: 'усиление', debuff: 'ослабление',
      dot: 'периодический урон', interrupt: 'прерывание', summon: 'призыв', cast_aoe: 'каст по области',
    })[t] || t;
  }
  /** flat → множитель атаки (15 flat ≈ ×1.0 атаки). */
  function flatAsAtkMult(flat) {
    const f = Number(flat);
    if (!Number.isFinite(f) || f < 0) return 0;
    return f / FLAT_REF;
  }

  /** Вес flat из данных скилла (поддержка flat и сокращения fl). */
  function abilityFlatWeight(ab) {
    if (!ab) return null;
    const v = ab.flat != null ? ab.flat : ab.fl;
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  /**
   * Сырой урон скилла — всегда от эффективной атаки (спек + шмот + atkMod-баффы).
   * flat: вес относительно FLAT_REF; power: прямой множитель atk.
   */
  function abilityDamageRaw(actor, ab, mult) {
    mult = mult == null ? 1 : mult;
    const eff = getEff(actor);
    const flatW = abilityFlatWeight(ab);
    if (flatW != null) {
      return Math.max(1, Math.round(eff.atk * flatAsAtkMult(flatW) * mult));
    }
    let power = Number(ab && ab.power);
    if (!Number.isFinite(power) || power <= 0) power = 1;
    return Math.max(1, Math.round(eff.atk * power * mult));
  }

  /**
   * Сырое лечение — от атаки кастера (та же шкала, что урон).
   * flat: вес; power: доля maxHp цели (legacy %-хилы, тоже зависят от статов цели).
   */
  function abilityHealRaw(actor, ab, target, mult) {
    mult = mult == null ? 1 : mult;
    const te = talentEffects();
    if (actor && actor.side === 'ally' && te.healMult) mult *= te.healMult;
    const flatW = abilityFlatWeight(ab);
    if (flatW != null) {
      const eff = getEff(actor);
      return Math.max(1, Math.round(eff.atk * flatAsAtkMult(flatW) * mult));
    }
    let power = Number(ab && ab.power);
    if (!Number.isFinite(power) || power <= 0) power = 1;
    const baseHp = (target && target.maxHp) || (actor && actor.maxHp) || STAT_SCALE;
    return Math.max(1, Math.round(baseHp * power * mult));
  }

  /** Щит от flat/power — масштабируется от атаки (flat) или maxHp (power). */
  function abilityShieldRaw(actor, ab, target, mult) {
    mult = mult == null ? 1 : mult;
    const flatW = abilityFlatWeight(ab);
    if (flatW != null) {
      const eff = getEff(actor);
      return Math.max(1, Math.round(eff.atk * flatAsAtkMult(flatW) * mult));
    }
    let power = Number(ab && ab.power);
    if (!Number.isFinite(power) || power <= 0) power = 0.3;
    const baseHp = (target && target.maxHp) || (actor && actor.maxHp) || STAT_SCALE;
    return Math.max(1, Math.round(baseHp * power * mult));
  }

  /** Периодический тик (DoT/HoT) из flat — от атаки источника. */
  function periodicTickFromFlat(actor, flat, mult) {
    mult = mult == null ? 1 : mult;
    const f = Number(flat);
    if (!Number.isFinite(f) || f <= 0) return Math.max(1, Math.round(getEff(actor).atk * 0.05 * mult));
    return Math.max(1, Math.round(getEff(actor).atk * flatAsAtkMult(f) * mult));
  }

  /** Русские названия школ / типов */
  const SCHOOL_RU = {
    physical: 'Физический',
    fire: 'Огонь',
    frost: 'Лёд',
    shadow: 'Тьма',
    holy: 'Свет',
    nature: 'Природа',
    arcane: 'Тайная',
    chi: 'Ци',
    blood: 'Кровь',
    heal: 'Лечение',
    none: 'Без урона',
  };
  /** Базовая школа класса/спека, если по скиллу не угадали */
  function defaultClassSchool(classId, specId) {
    switch (classId) {
      case 'warrior':
      case 'rogue':
      case 'hunter':
        return 'physical';
      case 'deathknight':
        if (specId === 'frost') return 'frost';
        if (specId === 'blood') return 'blood';
        return 'shadow';
      case 'mage':
        if (specId === 'fire') return 'fire';
        if (specId === 'frost') return 'frost';
        return 'arcane';
      case 'warlock':
        return 'shadow';
      case 'priest':
        return specId === 'shadow' ? 'shadow' : 'holy';
      case 'paladin':
        return 'holy';
      case 'shaman':
        return 'nature';
      case 'druid':
        if (specId === 'feral' || specId === 'guardian') return 'physical';
        return 'nature';
      case 'monk':
        return specId === 'mistweaver' ? 'nature' : 'chi';
      case 'engineer':
        return 'physical';
      default:
        return 'physical';
    }
  }
  /**
   * Проставить школу скиллу (явная ability.school > эвристика FX > дефолт класса).
   * non-damage → none/heal.
   */
  function inferAbilitySchool(classId, specId, ab) {
    if (!ab) return 'physical';
    if (ab.school) return String(ab.school).toLowerCase();
    const t = String(ab.type || 'damage').toLowerCase();
    if (t === 'heal' || t === 'heal_aoe' || t === 'shield') return 'heal';
    if (['buff', 'taunt', 'interrupt', 'dispel', 'cleanse', 'purge', 'cc', 'summon'].includes(t)) {
      return 'none';
    }
    // debuff: школа по имени/классу (может резать ATK без урона, но тип важен)
    const actor = { classId: classId || '', specId: specId || '', role: 'dps' };
    let school = 'physical';
    try {
      const fx = resolveSkillFx(ab, actor);
      school = (fx && fx.school) ? String(fx.school).toLowerCase() : 'physical';
    } catch (_) { /* ignore */ }
    if (!school || school === 'heal') school = defaultClassSchool(classId, specId);
    // DoT крови / bleeds
    if (t === 'dot' || (typeof DOT_ABILITY_IDS !== 'undefined' && DOT_ABILITY_IDS.has(ab.id))) {
      const blob = ((ab.id || '') + ' ' + (ab.name || '')).toLowerCase();
      if (/rend|rupture|garrote|bleed|кров|рван|рва/.test(blob)) school = 'physical';
      if (/agony|corrupt|ua|immolate|shadow|тьм|порч/.test(blob)) school = 'shadow';
      if (/flame|immolate|fire|огн/.test(blob)) school = 'fire';
      if (/frost|лед|cold/.test(blob)) school = 'frost';
      if (/moon|sun|nature|природ|serpent/.test(blob)) school = 'nature';
      if (/holy|свет|holy_fire/.test(blob)) school = 'holy';
    }
    return school;
  }
  function stampAbilitySchool(ab, classId, specId) {
    if (!ab) return ab;
    ab.school = inferAbilitySchool(classId, specId, ab);
    if (ab.applyDot && typeof ab.applyDot === 'object' && !ab.applyDot.school) {
      ab.applyDot.school = isPhysicalSchool(ab.school) ? 'physical' : ab.school;
    }
    return ab;
  }
  /** Проставить school всем скиллам в WOW_MOP (лобби + бой). */
  function stampAllAbilitySchools() {
    const classes = (typeof WOW_MOP !== 'undefined' && WOW_MOP.classes) ? WOW_MOP.classes : [];
    for (const cls of classes) {
      for (const sp of (cls.specs || [])) {
        for (const ab of (sp.abilities || [])) {
          stampAbilitySchool(ab, cls.id, sp.id);
        }
      }
    }
  }
  /**
   * Школа урона скилла (physical / fire / frost / shadow / holy / nature / arcane / chi / blood).
   */
  function abilityDamageSchool(actor, ability) {
    if (ability && ability.school) return String(ability.school).toLowerCase();
    const classId = actor && actor.classId;
    const specId = actor && actor.specId;
    return inferAbilitySchool(classId, specId, ability);
  }
  /** Физ. урон: physical, blood (кровотечения/мили), chi (мили монаха). Остальное — «магия». */
  function isPhysicalSchool(school) {
    const s = String(school || 'physical').toLowerCase();
    return s === 'physical' || s === 'blood' || s === 'chi' || s === '';
  }
  /** Строка под описанием: «Тип урона: Физический (физ.)» */
  function abilitySchoolNote(ab, actor) {
    if (!ab) return '';
    const t = String(ab.type || '').toLowerCase();
    if (t === 'heal') return 'Тип: Лечение · СТ';
    if (t === 'heal_aoe') return 'Тип: Лечение · АОЕ';
    if (t === 'shield') return 'Тип: Щит';
    if (t === 'buff') return 'Тип: Усиление';
    if (t === 'taunt') return 'Тип: Угроза';
    if (t === 'interrupt') return 'Тип: Прерывание';
    if (t === 'dispel' || t === 'cleanse') return 'Тип: Снятие эффектов';
    if (t === 'purge') return 'Тип: Развеивание';
    if (t === 'cc') return 'Тип: Контроль';
    if (t === 'summon') return 'Тип: Призыв';
    if (t === 'debuff') {
      const sch = ab.school || abilityDamageSchool(actor, ab);
      if (sch && sch !== 'none') {
        return 'Тип: Ослабление · ' + (SCHOOL_RU[sch] || sch);
      }
      return 'Тип: Ослабление';
    }
    const school = ab.school || abilityDamageSchool(actor, ab);
    if (school === 'none' || school === 'heal') {
      return 'Тип: ' + (SCHOOL_RU[school] || school);
    }
    const ru = SCHOOL_RU[school] || school;
    const kind = isPhysicalSchool(school) ? 'физ.' : 'маг.';
    return 'Тип урона: ' + ru + ' (' + kind + ')';
  }
  function abilitySchoolCss(ab, actor) {
    const t = String(ab && ab.type || '').toLowerCase();
    if (t === 'heal' || t === 'heal_aoe' || t === 'shield') return 'sch-heal';
    if (['buff', 'taunt', 'interrupt', 'dispel', 'cleanse', 'purge', 'cc', 'summon'].includes(t)) return 'sch-none';
    const school = (ab && ab.school) || abilityDamageSchool(actor, ab);
    if (isPhysicalSchool(school)) return 'sch-phys';
    return 'sch-' + (school || 'none');
  }

  /**
   * Короткие метки механики для жёлтой строки (a-cost), вместе с уроном.
   * Пример: «~18т урона · Вампиризм 15% · Не тратит ход»
   */
  function abilityMetaLine(ab) {
    if (!ab) return '';
    const bits = [];
    // Только метки UI, не цифры урона/баффов (они в estimateAbility)
    if (ab.maxCharges) bits.push((ab.charges != null ? ab.charges : ab.maxCharges) + '/' + ab.maxCharges + ' зар.');
    if (ab.freeAction) bits.push('Не тратит ход');
    if (ab.holyShock) bits.push('союзник/враг');
    if (ab.chainPrimary) bits.push('сначала выбранная цель');
    if (ab.holyShock === false && ab.targetFlex) bits.push(String(ab.targetFlex));
    return bits.join(' · ');
  }

  function estimateAbility(actor, ab) {
    const eff = getEff(actor);
    const te = talentEffects();
    // Гаечный воскрешатель — не power-хил (иначе «114т» от max HP)
    if (ab.id === 'wrench_heal') {
      return 'хил за счет питомца';
    }
    // Только цифры урона/хила — метки механики идут в abilityMetaLine (строка ниже)
    if (ab.type === 'heal' || ab.type === 'heal_aoe') {
      const mult = (ab.type === 'heal_aoe' ? 0.9 : 1);
      let base = abilityHealRaw(actor, ab, actor, mult);
      const scope = ab.type === 'heal_aoe' ? 'АОЕ' : 'СТ';
      const flatW = abilityFlatWeight(ab);
      const h = hotConfig(ab.id);
      if (h && flatW == null && !ab.applyHot) {
        return `${scope} · ~${fmt(Math.round(base * h.direct))} + ${fmt(Math.round(base * h.tick))}/р · ${PERIODIC_ROUNDS}р`;
      }
      // Только вес «Nт» из баланса (без старых ~чисел в скобках)
      let s = flatW != null
        ? `${scope} · ${flatW}т`
        : `${scope} · ~${fmt(base)} лечения`;
      if (ab.applyHot && ab.applyHot.flat != null) {
        const turns = Number(ab.applyHot.turns) || 5;
        s += ` + ${Number(ab.applyHot.flat)}т/р · ${turns}р`;
      }
      return s;
    }
    if (ab.type === 'damage' || ab.type === 'aoe') {
      const hits = Math.max(1, Number(ab.hits) || 1);
      let d = abilityDamageRaw(actor, ab);
      if (FINISHER_IDS.has(ab.id) && actor.res?.secondary?.type === 'combo') {
        const stacks = Math.max(1, actor.res.secondary.current || 1);
        d = Math.round(d * (0.7 + stacks * 0.15));
      }
      const flatW = abilityFlatWeight(ab);
      let s;
      if (flatW != null) {
        s = hits > 1
          ? `${flatW}т×${hits}` + (ab.type === 'aoe' ? ' по области' : '')
          : `${flatW}т` + (ab.type === 'aoe' ? ' по области' : '');
      } else {
        s = hits > 1
          ? `~${fmt(d)}×${hits}` + (ab.type === 'aoe' ? ' по области' : ' урона')
          : `~${fmt(d)}` + (ab.type === 'aoe' ? ' по области' : ' урона');
      }
      if (ab.splashFlat != null && Number.isFinite(Number(ab.splashFlat))) {
        s += ' · ' + Number(ab.splashFlat) + 'т остальным';
      }
      if (ab.id === 'sot_r') s += ' · Щит света';
      if (EXECUTE_IDS.has(ab.id)) s += ' · ≤35% HP';
      if (ab.judgmentConsecrateSplash) {
        s += ' · +' + Math.round(Number(ab.judgmentConsecrateSplash) * 100) + '% по Освящ.';
      }
      if (ab.interruptPrimary) {
        s += ' · сбивает каст';
        if (ab.interruptAoeChance) s += ' (+' + Math.round(Number(ab.interruptAoeChance) * 100) + '% АОЕ)';
      }
      if (ab.applyDot && ab.applyDot.flat != null) {
        const tick = periodicTickFromFlat(actor, ab.applyDot.flat);
        const dotTurns = Number(ab.applyDot.turns) || 4;
        const dotName = ab.applyDot.name || 'период.';
        s += ` + ${dotName} ${fmt(tick)}/р×${dotTurns}`;
      }
      if (ab.grantSelfBuff && ab.grantSelfBuff.id === 'wide_sweep') {
        s += ' · +Широкий размах';
      }
      if (ab.id === 'heroic' && actor && (actor.buffs || []).some(b => b && b.id === 'wide_sweep' && (Number(b.stacks) || 0) > 0)) {
        s += ' · 40% по остальным';
      }
      if (ab.enemyDmgMod) s += ` · −${Math.round(Number(ab.enemyDmgMod) * 100)}% урон врагов`;
      if (PET_SUMMONS[ab.id]) s += ' + питомец';
      return s;
    }
    if (ab.type === 'dot' || DOT_ABILITY_IDS.has(ab.id)) {
      if (ab.flat != null) {
        const tick = periodicTickFromFlat(actor, ab.flat);
        return `~${fmt(tick)}/р · ${PERIODIC_ROUNDS}р период. урон`;
      }
      const p = Number(ab.power) > 0 ? Number(ab.power) : 1;
      const hit = Math.round(eff.atk * p * 0.5);
      const tick = Math.max(1, Math.round(eff.atk * p * 0.4));
      return `~${fmt(hit)} + ${fmt(tick)}/р · ${PERIODIC_ROUNDS}р период. урон`;
    }
    if (ab.type === 'buff') {
      if (ab.id === 'dark_soul') return 'питомцы +3 хода';
      if (ab.id === 'metamorphosis') {
        // один раз: ATK себе + петам, длительность
        const pct = Math.round((Number(ab.atkMod) || Number(ab.petAtkMod) || 0.3) * 100);
        const turns = Number(ab.buffTurns) || 2;
        return `+${pct}% урон себе и бесам · ${turns}х`;
      }
      const bits = [];
      if (ab.critMod) bits.push('+' + Math.round(Number(ab.critMod) * 100) + '% крит');
      if (ab.atkMod && ab.id !== 'metamorphosis') bits.push('+' + Math.round(Number(ab.atkMod) * 100) + '% атаки');
      if (ab.petAtkMod && ab.id !== 'metamorphosis') bits.push('+' + Math.round(Number(ab.petAtkMod) * 100) + '% урон петов');
      if (ab.dmgReduce) bits.push('−' + Math.round(Number(ab.dmgReduce) * 100) + '% урон');
      if (ab.staggerBonus) bits.push('+' + Math.round(Number(ab.staggerBonus) * 100) + '% stagger');
      if (ab.maxHpPct) bits.push('+' + Math.round(Number(ab.maxHpPct) * 100) + '% здоровья');
      if (ab.buffTurns && bits.length) bits.push(Number(ab.buffTurns) + 'х');
      if (ab.id === 'last_stand' || ab.id === 'vampiric_blood') return `+${Math.round((ab.maxHpPct || ab.power || 0) * 100)}% здоровья`;
      if (ab.id === 'evocation') return '+мана';
      if (ab.id === 'prem') return '+2 к серии';
      if (ab.id === 'debug_mode') {
        const pet = getMainPet(actor, true);
        const mode = (pet && pet.attackMode === 'aoe') ? 'АОЕ' : 'СТ';
        return 'сейчас ' + mode + ' · переключить';
      }
      if (ab.id === 'pet_rez') return 'воскресить основного питомца';
      // Безрассудство и баффы «на N следующих способностей»
      if (ab.abilityCharges) {
        const pct = Math.round((Number(ab.power) || Number(ab.atkMod) || 0.35) * 100);
        const n = Math.max(1, Number(ab.abilityCharges) || 2);
        return `+${pct}% атаки · след. ${n} удар${n === 1 ? '' : (n < 5 ? 'а' : 'ов')}`;
      }
      if (ab.id === 'sot_r') {
        return '80т + 30т остальным · Щит света';
      }
      if (bits.length) return bits.join(' · ');
      if (ab.power && ab.power !== 1) return `+${Math.round(ab.power * 100)}%`;
      return 'бафф';
    }
    if (ab.type === 'debuff') {
      const pct = Math.round(Math.abs(ab.power || 0) * 100);
      return `−${pct}% атаки / −10% защиты, 3 хода`;
    }
    if (ab.type === 'shield') {
      if (ab.id === 'elusive') {
        const pool = Math.max(0, Math.round(actor.purifyCleared || 0));
        const base = abilityShieldRaw(actor, { flat: 30 }, actor);
        return pool > 0 ? `щит ~${fmt(base + pool)} (+${fmt(pool)} из stagger)` : `щит ~${fmt(base)}`;
      }
      const fw = abilityFlatWeight(ab);
      return fw != null ? `щит ${fw}т` : `щит ~${fmt(abilityShieldRaw(actor, ab, actor))}`;
    }
    if (ab.type === 'cc') {
      const n = Number(ab.buffTurns) || Number(ab.ccTurns) || 1;
      return 'стан ' + n + 'х';
    }
    if (ab.type === 'interrupt' || INTERRUPT_IDS.has(ab.id)) return 'сбивает каст';
    if (ab.type === 'summon' || PET_SUMMONS[ab.id]) return 'призыв питомца';
    return ab.desc || typeLabel(ab.type);
  }

  /**
   * Игровое описание способности (как работает) — для тултипа на иконке.
   * Цифры урона/КД/ресурса сюда не пишем: они справа в карточке.
   */
  function abilityDescribe(ab, actor) {
    if (!ab) return '';
    const id = ab.id || '';
    const t = String(ab.type || '').toLowerCase();
    // Особые id с известной механикой
    const byId = {
      purifying: 'Снимает часть пошатывания. Очищенный урон копится для «Отвара неуловимости».',
      elusive: 'Даёт щит: базовая прочность плюс урон, недавно снятый «Очищающим отваром».',
      guard: 'Ставит личный щит, поглощающий входящий урон.',
      fort_brew: 'Снижает получаемый урон и усиливает пошатывание на несколько ходов.',
      provoke: 'Перетягивает внимание врагов на вас.',
      taunt: 'Перетягивает внимание врагов на вас.',
      debug_mode: 'Переключает режим атаки основного питомца: одна цель или по области. Можно использовать раз за ход.',
      wrench_heal: 'Лечит союзника за счет питомца: снимает половину запаса здоровья основного питомца и передаёт лечение цели.',
      pet_rez: 'Возвращает основного питомца в бой, если он погиб.',
      party_stun: 'Оглушает цель на ход и сбивает чтение заклинания.',
      party_dispel: 'Снимает с союзника вредный магический эффект или стек «Взрывного».',
      party_purge: 'Снимает с врага усиление или ярость.',
      kick: 'Прерывает чтение заклинания врага и накладывает немоту.',
      hot_w: 'Удар по врагу с 35% здоровья или ниже. Не завершает ваш ход.',
      avengers: 'Щит летит по врагам. Сбивает чтение у основной цели; у остальных — с шансом. Часть урона становится щитом.',
      judgment: 'Судит врага. Если на других есть «Освящение», они получают долю урона Правосудия.',
      sot_r: 'Бьёт щитом: 80т по выбранной цели и 30т по остальным. Накладывает «Щит света» (+10% брони, 4 хода, до 2 стаков). 3 Энергии Света.',
      spirit_link: 'Тотем на 3 хода: −10% входящего урона отряду. После каждого удара, если кто-то просел по % HP — сразу выравнивает здоровье отряда.',
      word_glory: 'Сильное исцеление одной цели за Энергию Света (СТ).',
      light_dawn: 'Исцеляет всю группу (АОЕ) за Энергию Света.',
      holy_radiance: 'Исцеляет всю группу (АОЕ).',
      holy_light: 'Сильное исцеление одной цели (СТ).',
      flash: 'Быстрое исцеление одной цели (СТ).',
      ms: 'Накладывает «Кровотечение» на 4 хода.',
      colossus: 'Ломает броню цели и накладывает «Кровотечение» на 4 хода.',
      heroic: 'Накладывает «Кровотечение» на 4 хода. Под «Широким размахом» удар дублируется на остальных врагов с силой 40%.',
      reck: '+35% атаки на следующие 2 удара. Не завершает ваш ход.',
    };
    if (byId[id]) {
      let s = byId[id];
      if (ab.freeAction) s += ' Не завершает ваш ход.';
      return s;
    }
    // Arms Вихрь: grantSelfBuff wide_sweep (у Неистовства — обычный AoE)
    if (id === 'whirlwind' && ab.grantSelfBuff && ab.grantSelfBuff.id === 'wide_sweep') {
      return 'Урон по всем врагам. Даёт 1 стак «Широкий размах»: следующий «Героический удар» дублируется на остальных (40%).';
    }

    const raw = (ab.desc && String(ab.desc).trim()) || '';
    // desc из таблицы, если это не пустышка и не голые цифры/КД
    const looksNumeric = raw && /^[\d\s·.\-−~%ткд/+×xхордпарманаяростьэнерг]+$/i.test(raw.replace(/[а-яёa-z]/gi, ''));
    const parts = [];
    if (raw && raw.length > 2 && !looksNumeric) parts.push(raw);

    if (!parts.length) {
      switch (t) {
        case 'damage':
          parts.push(ab.hits > 1 ? 'Несколько ударов по выбранной цели.' : 'Удар по выбранной цели.');
          break;
        case 'aoe':
        case 'cast_aoe':
          parts.push('Урон по всем врагам.');
          break;
        case 'dot':
          parts.push('Накладывает периодический урон на цель.');
          break;
        case 'heal':
          parts.push(ab.id === 'wrench_heal' ? '' : 'Исцеляет выбранного союзника.');
          break;
        case 'heal_aoe':
          parts.push('Исцеляет весь отряд.');
          break;
        case 'shield':
          parts.push('Накладывает щит, поглощающий урон.');
          break;
        case 'buff':
          parts.push('Временно усиливает вас или ваших питомцев.');
          break;
        case 'debuff':
          parts.push('Ослабляет выбранного врага.');
          break;
        case 'taunt':
          parts.push('Перетягивает внимание врагов на вас.');
          break;
        case 'interrupt':
          parts.push('Сбивает чтение заклинания и накладывает немоту.');
          break;
        case 'cc':
          parts.push(ab.ccMode === 'silence' ? 'Накладывает немоту.' : 'Оглушает цель.');
          break;
        case 'cleanse':
          parts.push('Снимает часть накопленного пошатывания.');
          break;
        case 'dispel':
          parts.push('Снимает вредный эффект с союзника.');
          break;
        case 'purge':
          parts.push('Снимает усиление с врага.');
          break;
        case 'summon':
          parts.push('Призывает питомца или механизм на время.');
          break;
        default:
          parts.push(typeLabel(t) || 'Особая способность.');
      }
    }

    // Доп. механики, если не очевидны из desc
    const blob = parts.join(' ').toLowerCase();
    if (ab.applyDot && !/период|кровотеч|дот|яд|ожог/.test(blob)) {
      const dn = ab.applyDot.name || 'периодический урон';
      const dt = Number(ab.applyDot.turns) || 4;
      parts.push(`Накладывает «${dn}» на ${dt} хода.`);
    }
    if (ab.grantSelfBuff && ab.grantSelfBuff.id === 'wide_sweep' && !/широкий размах|героический/.test(blob)) {
      parts.push('Даёт 1 стак «Широкий размах»: следующий «Героический удар» дублируется на остальных (40%).');
    }
    if (ab.applyHot && !/период|лечение|хот|исцел/.test(blob)) {
      parts.push('Оставляет периодическое лечение.');
    }
    if (ab.holyShock && !/враг|союзник|шок/.test(blob)) {
      parts.push('Можно направить во врага (урон) или в союзника (исцеление).');
    }
    if (ab.lifesteal && !/вампир|похищ|возвращ/.test(blob)) {
      parts.push('Часть урона возвращается как исцеление.');
    }
    if (ab.vuln && !/уязв|брон|слаб/.test(blob)) {
      parts.push('Цель на время получает больше урона.');
    }
    if (ab.cleaveFlat != null && !/бок|сосед|рассев/.test(blob)) {
      parts.push('Задевает врагов рядом с целью.');
    }
    if (ab.enemyDmgMod && !/слаб|урон враг/.test(blob)) {
      parts.push('Ослабляет урон врагов.');
    }
    if ((ab.dmgReduce || ab.staggerBonus) && t === 'buff' && !/снижа|пошат|защит/.test(blob)) {
      if (ab.dmgReduce) parts.push('Снижает получаемый урон.');
      if (ab.staggerBonus) parts.push('Усиливает пошатывание.');
    }
    if (ab.blockChanceAdd && !/блок/.test(blob)) {
      parts.push('Повышает шанс блока.');
    }
    if (PET_SUMMONS[id] && t !== 'summon' && !/призыв|питом/.test(blob)) {
      parts.push('Также призывает питомца.');
    }
    if (ab.freeAction && !/не заверш|без хода|не тратит ход/.test(blob)) {
      parts.push('Не завершает ваш ход.');
    }
    if (ab.maxCharges && !/заряд/.test(blob)) {
      parts.push('Имеет несколько зарядов.');
    }

    return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }

  /** DoT duration rounds (legacy map kept for ids; all forced to PERIODIC_ROUNDS). */
  const DOT_TURNS = {
    doom: PERIODIC_ROUNDS, agony: PERIODIC_ROUNDS, ua: PERIODIC_ROUNDS,
    black_arrow: PERIODIC_ROUNDS, devouring: PERIODIC_ROUNDS,
    rupture: PERIODIC_ROUNDS, garrote: PERIODIC_ROUNDS, serpent: PERIODIC_ROUNDS,
    corruption: PERIODIC_ROUNDS, immolate: PERIODIC_ROUNDS,
    sticky_bomb: PERIODIC_ROUNDS, moonfire: PERIODIC_ROUNDS, sunfire: PERIODIC_ROUNDS, rake: PERIODIC_ROUNDS,
    rip: PERIODIC_ROUNDS, lacerate: PERIODIC_ROUNDS,
    rend: PERIODIC_ROUNDS, plague_strike: PERIODIC_ROUNDS, outbreak: PERIODIC_ROUNDS,
    swp: PERIODIC_ROUNDS, vt: PERIODIC_ROUNDS, holy_fire: PERIODIC_ROUNDS,
    living_bomb: PERIODIC_ROUNDS, nether_tempest: PERIODIC_ROUNDS, flame_shock: PERIODIC_ROUNDS,
    d: PERIODIC_ROUNDS, poison: PERIODIC_ROUNDS, dot: PERIODIC_ROUNDS,
  };
  /** Ability ids that always resolve as DoT even if type was lost/mangled. */
  const DOT_ABILITY_IDS = new Set([
    'moonfire', 'sunfire', 'rake', 'rip', 'lacerate',
    'rend', 'agony', 'ua', 'corruption', 'immolate', 'doom',
    'swp', 'vt', 'devouring', 'holy_fire', 'serpent', 'black_arrow',
    'garrote', 'rupture', 'living_bomb', 'nether_tempest', 'flame_shock',
    'plague_strike', 'outbreak', 'poison', 'd', 'dot', 'sticky_bomb']);

  /** Apply or refresh a buff/debuff/dot on unit (same id replaces old). */
  function applyStatus(unit, buff) {
    if (!unit || !buff) return;
    if (!unit.buffs) unit.buffs = [];
    unit.buffs = unit.buffs.filter(b => b.id !== buff.id);
    unit.buffs.push(buff);
  }
  function scoreLabel() {
    if (!run) return '';
    const left = run.timerLeft;
    const max = run.timerMax;
    if (left <= 0) return 'Провал';
    const pct = left / max;
    if (pct >= 0.4) return '+3';
    if (pct >= 0.2) return '+2';
    if (pct >= 0.08) return '+1';
    return 'В тайме';
  }


  function keyAffixes(level) {
    const week = mythicWeekId();
    const year = new Date().getFullYear();
    const seed = year * 100 + week + level * 17;
    const res = [];
    // Tyr/Fort alternate by calendar week (not just key parity)
    const tyr = AFFIXES.find(a => a.id === 'tyrannical');
    const fort = AFFIXES.find(a => a.id === 'fortified');
    if (week % 2 === 0) res.push(fort); else res.push(tyr);
    const seasonal = AFFIXES.filter(a =>
      a.id !== 'tyrannical' && a.id !== 'fortified' && level >= a.minKey
    );
    const order = seededShuffle(seasonal, seed);
    const want = level >= 12 ? 3 : level >= 7 ? 2 : level >= 4 ? 1 : 0;
    for (const a of order) {
      if (res.length >= 1 + want) break;
      res.push(a);
    }
    return res;
  }
  function weeklyAffixLabel() {
    const w = mythicWeekId();
    return `Неделя ${w} · ${new Date().getFullYear()}`;
  }
  const hasEffect = (k) => run?.affixes.some(a => a.kind === k);
  const affixValue = (k, d = 0) => run?.affixes.find(a => a.kind === k)?.value ?? d;
  function talentEffects() {
    return (run?.talents || []).reduce((acc, t) => {
      for (const [k, v] of Object.entries(t.effect)) {
        if (typeof v === 'number' && typeof acc[k] === 'number' && String(k).includes('Mult')) acc[k] *= v;
        else if (typeof v === 'number' && typeof acc[k] === 'number') acc[k] += v;
        else acc[k] = v;
      }
      return acc;
    }, {});
  }

