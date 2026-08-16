/* systems/ability-data: PET_DEFS, HoT, schools, estimates, applyStatus */
  const PET_DEFS = {
    hunter_pet: { name: 'Питомец', icon: '🐺', hp: 100, atk: 16, def: 5, speed: 13, role: 'dps' },
    felguard:   { name: 'Страж Скверны', icon: '👹', hp: 125, atk: 17, def: 7, speed: 11, role: 'dps' },
    imp:        { name: 'Бес', icon: '👿', hp: 55, atk: 14, def: 2, speed: 14, role: 'dps' },
    water_totem:{ name: 'Водяной тотем', icon: '⛲', hp: 40, atk: 8, def: 2, speed: 10, role: 'healer' },
    imp_boss:   { name: 'Главарь бесов', icon: '👑', hp: 70, atk: 18, def: 3, speed: 12, role: 'dps' },
    voidwalker: { name: 'Демон Бездны', icon: '👤', hp: 150, atk: 12, def: 9, speed: 8, role: 'tank' },
    ghoul:      { name: 'Вурдалак', icon: '🧟', hp: 105, atk: 16, def: 5, speed: 12, role: 'dps' },
    frost_ghoul:{ name: 'Вурдалак', icon: '🧟', hp: 80, atk: 15, def: 3, speed: 13, role: 'dps' },
    shadowfiend:{ name: 'Исчадие Тьмы', icon: '👾', hp: 75, atk: 18, def: 2, speed: 15, role: 'dps' },
    hellfiend:  { name: 'Исчадие ада', icon: '👿', hp: 70, atk: 15, def: 2, speed: 15, role: 'dps' },
    dire:       { name: 'Зверь', icon: '🐻', hp: 85, atk: 17, def: 4, speed: 13, role: 'dps' },
    wolf:       { name: 'Дух волка', icon: '🐺', hp: 70, atk: 15, def: 3, speed: 14, role: 'dps' },
    fire_ele:   { name: 'Элементаль огня', icon: '🔥', hp: 95, atk: 19, def: 3, speed: 12, role: 'dps' },
    infernal:   { name: 'Инфернал', icon: '😈', hp: 110, atk: 15, def: 6, speed: 10, role: 'dps' },
    niuzao:     { name: 'Нюцзао', icon: '🐂', hp: 140, atk: 14, def: 8, speed: 8, role: 'tank' },
    xuen:       { name: 'Сюэнь', icon: '🐯', hp: 100, atk: 18, def: 4, speed: 14, role: 'dps' },
    jade_serpent:{ name: 'Нефритовая змея', icon: '🐍', hp: 70, atk: 12, def: 3, speed: 12, role: 'healer' },
    water_ele:  { name: 'Элементаль воды', icon: '💧', hp: 90, atk: 15, def: 4, speed: 12, role: 'dps' },
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
    hellfiend:    [{ def: 'hellfiend', n: 1, turns: 5 }],
    dire:         [{ def: 'dire', n: 1, turns: 3 }],
    feral_spirit: [{ def: 'wolf', n: 2, turns: 3 }],
    fire_ele:     [{ def: 'fire_ele', n: 1, turns: 4 }],
    summon_water: [{ def: 'water_ele', n: 1, turns: 3 }],
    niuzao:       [{ def: 'niuzao', n: 1, turns: 3 }],
    xuen:         [{ def: 'xuen', n: 1, turns: 3 }],
    jade_serpent: [{ def: 'jade_serpent', n: 1, turns: 3 }],
    summon_garg:  [{ def: 'gargoyle', n: 1, turns: 4 }],
    raise_ghoul:  [{ def: 'frost_ghoul', n: 1, turns: 2 }],
    mirror:       [{ def: 'mirror', n: 2, turns: 3 }],
    // Engineer
    deploy_turret:      [{ def: 'turret', n: 1, turns: 4 }],
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
      else if (kind === 'parry') {
        // metallic clang — short high + low tick
        o.type = 'triangle'; o.frequency.setValueAtTime(880, now); o.frequency.exponentialRampToValueAtTime(220, now + 0.12);
        g.gain.setValueAtTime(0.07, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        o.start(now); o.stop(now + 0.15);
      } else if (kind === 'block') {
        o.type = 'square'; o.frequency.setValueAtTime(140, now); o.frequency.exponentialRampToValueAtTime(70, now + 0.1);
        g.gain.setValueAtTime(0.05, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        o.start(now); o.stop(now + 0.13);
      } else if (kind === 'dodge') {
        o.type = 'sine'; o.frequency.setValueAtTime(480, now); o.frequency.exponentialRampToValueAtTime(720, now + 0.08);
        g.gain.setValueAtTime(0.035, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        o.start(now); o.stop(now + 0.1);
      }
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
   * Финишер серии: вес в данных × множитель.
   * Старая прямая 0.65+очки×0.18 давала 1 очко = 83% голых т — выгоднее сбрасывать сразу.
   * 5 очков = 1.55 (жёлтые 50 / 60 / 53 / 14). 1–4 слабее, пять единиц < одной пятёрки.
   */
  function comboFinisherMult(points) {
    const n = Math.max(0, Math.round(Number(points) || 0));
    if (n <= 0) return 1;
    if (n === 1) return 0.22;
    if (n === 2) return 0.42;
    if (n === 3) return 0.68;
    if (n === 4) return 1.05;
    return 1.55;
  }

  function comboPointsForEstimate(actor) {
    if (!actor || actor.res?.secondary?.type !== 'combo') return 0;
    return Math.max(0, Number(actor.res.secondary.current) || 0);
  }

  function isComboFinisherActor(actor, ability) {
    return !!(ability && actor
      && typeof FINISHER_IDS !== 'undefined' && FINISHER_IDS.has(ability.id)
      && actor.res?.secondary?.type === 'combo');
  }

  function comboPointsForFinisher(actor) {
    if (!actor || actor.res?.secondary?.type !== 'combo') return 0;
    if (actor._spentSec > 0) return Number(actor._spentSec);
    return comboPointsForEstimate(actor);
  }

  function scaleByComboIfFinisher(actor, ability, raw) {
    if (!isComboFinisherActor(actor, ability)) return raw;
    const pts = comboPointsForFinisher(actor);
    if (!(pts > 0)) return raw;
    return Math.max(1, Math.round(Number(raw) * comboFinisherMult(pts)));
  }

  /** Тик финишера: плоский вес в данных = тик при 5 очках. 1–4 — доля от пятёрки. */
  function scaleDotByComboIfFinisher(actor, ability, raw) {
    if (!isComboFinisherActor(actor, ability)) return raw;
    const pts = comboPointsForFinisher(actor);
    if (!(pts > 0)) return raw;
    const at5 = comboFinisherMult(5);
    if (!(at5 > 0)) return raw;
    return Math.max(1, Math.round(Number(raw) * comboFinisherMult(pts) / at5));
  }

  /** Длина дота: applyDot.turns, иначе общие 3 раунда. */
  function resolveDotTurns(ability) {
    const t = ability && ability.applyDot && Number(ability.applyDot.turns);
    if (t > 0) return Math.max(1, t);
    return PERIODIC_ROUNDS;
  }

  function unitHasFlameShock(unit, caster) {
    if (!unit) return false;
    return (unit.buffs || []).some(b => {
      if (!b || (b.turns != null && !(Number(b.turns) > 0))) return false;
      const id = String(b.id || '');
      const nm = String(b.name || '');
      if (!(id === 'dot_flame_shock' || id.indexOf('flame_shock') >= 0 || nm.indexOf('Огненный шок') >= 0)) return false;
      if (caster && b.fromUid && typeof statusAffectsViewer === 'function' && !statusAffectsViewer(b, caster)) return false;
      return true;
    });
  }

  function resolveDotTickFlat(ability) {
    if (ability && ability.applyDot && ability.applyDot.flat != null) {
      return Number(ability.applyDot.flat);
    }
    if (ability && ability.flat != null) return Number(ability.flat);
    return null;
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
    if (ab.oncePerTurn) bits.push('1× за ход');
    if (ab.freeAction) bits.push('Не тратит ход');
    if (ab.id === 'penance') bits.push('союзник/враг');
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
    if (ab.id === 'emergency_repair') return '20% HP пета';
    if (ab.id === 'plasma_cutter') return '+50% урона пета · 4х';
    if (ab.id === 'bot_overdrive') return 'пар пета ×4 (5→20) · 4х';
    if (ab.id === 'call_siege_walker') return 'область +70% урона пета · 4х';
    // Только цифры урона/хила — метки механики идут в abilityMetaLine (строка ниже)
    if (ab.type === 'heal' || ab.type === 'heal_aoe') {
      if (ab.id === 'soothing' && typeof actorHasJadeSerpent === 'function' && actorHasJadeSerpent(actor)) {
        return 'цель змеи · 3т после каждого хода';
      }
      const mult = (ab.type === 'heal_aoe' ? 0.9 : 1);
      let base = abilityHealRaw(actor, ab, actor, mult);
      const scope = ab.type === 'heal_aoe' ? 'АОЕ' : 'СТ';
      const flatW = abilityFlatWeight(ab);
      const h = hotConfig(ab.id);
      if (h && flatW == null && !ab.applyHot) {
        return `${scope} · ~${fmt(Math.round(base * h.direct))} + ${fmt(Math.round(base * h.tick))}/р · ${PERIODIC_ROUNDS}р`;
      }
      if (ab.applyHot && ab.applyHot.hpPct != null) {
        const pct = Math.round(Number(ab.applyHot.hpPct) * 100);
        const turns = Number(ab.applyHot.turns) || 2;
        return `${scope} · ${pct}% HP/р · ${turns}р`;
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
    if (ab.id === 'touch_death') return 'урон = своё HP · цель слабее вас';
    if (ab.id === 'jade_serpent') return '3р · 3т союзнику и врагу после каждого хода';
    if (ab.id === 'niuzao') return 'бык 3р · без хода · 25% шата · топ 10т + 50% очистки';
    if (ab.id === 'xuen') return 'тигр 3р · топ 10т · реген ×2';
    if (ab.id === 'haunt') return '32т · +15% за свой дот на цели';
    if (ab.id === 'malefic') return '20т · +10% за свой дот на цели';
    if (ab.id === 'dark_soul' && actor && actor.specId === 'destruction') {
      return 'инфернал 20т область · 2 хода';
    }
    if (ab.id === 'ab' && actor && actor.specId === 'arcane') {
      const st = Math.min(3, Math.max(0, Number(actor._arcaneStacks) || 0));
      return '24т · ' + (10 + st * 4) + ' маны · стак ' + st;
    }
    if (ab.id === 'abarr' && actor && actor.specId === 'arcane') {
      const st = Math.min(3, Math.max(0, Number(actor._arcaneStacks) || 0));
      return (20 + 6 * st) + 'т · сброс ' + st + ' стак.';
    }
    if (ab.id === 'pyroblast') {
      if (typeof hasPyroHot === 'function' ? hasPyroHot(actor) : (actor && (actor.buffs || []).some(b => b && b.id === 'pyro_hot'))) {
        return '90т · 10 маны (бафф шара)';
      }
      return '36т · 50 маны';
    }
    if (ab.id === 'lv') {
      return '32т · крит если на цели Огненный шок';
    }
    if (ab.id === 'fire_nova') {
      return '16т область · нужен Огненный шок на цели';
    }
    if (ab.id === 'unleash' && actor && actor.specId === 'enhancement') {
      return '+15% на следующие 2 удара';
    }
    if (ab.id === 'death_strike') {
      const blood = actor && actor.specId === 'blood';
      return (blood ? '35т · хил 15% запаса' : '10т · хил 10% запаса')
        + ' + 25% полученного за 2 хода'
        + (blood ? ' · щит 20% реального хила' : '');
    }
    if (ab.id === 'bone_shield') {
      return '15т цели · щит 40т себе';
    }
    if (ab.id === 'outbreak' && actor && actor.specId === 'unholy') {
      if (Number(ab.curCd) > 0) return 'сброс чумы · 60 силы рун · КД не сбрасывается';
      return '15т область + 6т/р×4 · в КД: 60 силы — весь дот сразу';
    }
    if (ab.type === 'damage' || ab.type === 'aoe') {
      const hits = Math.max(1, Number(ab.hits) || 1);
      let d = abilityDamageRaw(actor, ab);
      const comboFin = isComboFinisherActor(actor, ab);
      const comboN = comboFin ? comboPointsForEstimate(actor) : 0;
      const d5 = comboFin ? Math.max(1, Math.round(d * comboFinisherMult(5))) : d;
      d = scaleByComboIfFinisher(actor, ab, d);
      const flatW = abilityFlatWeight(ab);
      const hitsS = hits > 1 ? `×${hits}` : '';
      const aoeS = ab.type === 'aoe' ? ' по области' : '';
      let s;
      if (comboFin) {
        s = `${fmt(d5)}${hitsS} при 5 очках${aoeS}`;
        if (comboN > 0) s += ` · серия ${comboN} → ${fmt(d)}${hitsS}`;
      } else if (flatW != null) {
        s = hits > 1
          ? `${flatW}т×${hits}` + aoeS
          : `${flatW}т` + aoeS;
      } else {
        s = hits > 1
          ? `~${fmt(d)}×${hits}` + (aoeS || ' урона')
          : `~${fmt(d)}` + (aoeS || ' урона');
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
        if (comboFin) {
          if (comboN > 0) {
            const tickNow = scaleDotByComboIfFinisher(actor, ab, tick);
            s += ` + ${dotName} ${fmt(tick)}/р×${dotTurns} (серия ${comboN} → ${fmt(tickNow)}/р)`;
          } else {
            s += ` + ${dotName} ${fmt(tick)}/р×${dotTurns}`;
          }
        } else {
          s += ` + ${dotName} ${fmt(tick)}/р×${dotTurns}`;
        }
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
      const turns = resolveDotTurns(ab);
      const tickFlat = resolveDotTickFlat(ab);
      const comboFin = isComboFinisherActor(actor, ab);
      const comboN = comboFin ? comboPointsForEstimate(actor) : 0;
      if (tickFlat != null) {
        let tick = periodicTickFromFlat(actor, tickFlat);
        const skipApply = !!(ab.applyDot && !(ab.flat != null && Number(ab.flat) > 0));
        const tick5 = comboFin && ab.applyDot
          ? tick
          : (comboFin ? Math.max(1, Math.round(tick * comboFinisherMult(5))) : tick);
        tick = (comboFin && ab.applyDot)
          ? scaleDotByComboIfFinisher(actor, ab, tick)
          : scaleByComboIfFinisher(actor, ab, tick);
        if (ab.applyDot && !skipApply) {
          let hit = abilityDamageRaw(actor, ab);
          const hit5 = comboFin ? Math.max(1, Math.round(hit * comboFinisherMult(5))) : hit;
          hit = scaleByComboIfFinisher(actor, ab, hit);
          if (comboFin) {
            let s = `${fmt(hit5)} при 5 очках + ${fmt(tick5)}/р · ${turns}р`;
            if (comboN > 0) s += ` · серия ${comboN} → ${fmt(hit)} + ${fmt(tick)}/р`;
            return s;
          }
          return `~${fmt(hit)} + ${fmt(tick)}/р · ${turns}р`;
        }
        if (comboFin) {
          let s = `${fmt(tick5)}/р при 5 очках · ${turns}р`;
          if (comboN > 0) s += ` · серия ${comboN} → ${fmt(tick)}/р`;
          return s;
        }
        return `~${fmt(tick)}/р · ${turns}р период. урон`;
      }
      const p = Number(ab.power) > 0 ? Number(ab.power) : 1;
      let hit = Math.round(eff.atk * p * 0.5);
      let tick = Math.max(1, Math.round(eff.atk * p * 0.4));
      const hit5 = comboFin ? Math.max(1, Math.round(hit * comboFinisherMult(5))) : hit;
      const tick5 = comboFin ? Math.max(1, Math.round(tick * comboFinisherMult(5))) : tick;
      hit = scaleByComboIfFinisher(actor, ab, hit);
      tick = scaleByComboIfFinisher(actor, ab, tick);
      if (comboFin) {
        let s = `${fmt(hit5)} при 5 очках + ${fmt(tick5)}/р · ${turns}р`;
        if (comboN > 0) s += ` · серия ${comboN} → ${fmt(hit)} + ${fmt(tick)}/р`;
        return s;
      }
      return `~${fmt(hit)} + ${fmt(tick)}/р · ${turns}р период. урон`;
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
      if (ab.armorMod) bits.push('+' + Math.round(Number(ab.armorMod) * 100) + '% брони');
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
      const party = ab.id === 'heaven_shield' || ab.partyShield;
      if (fw != null && party) return `щит ${fw}т всем + Искупление`;
      return fw != null ? `щит ${fw}т` : `щит ~${fmt(abilityShieldRaw(actor, ab, actor))}`;
    }
    if (ab.type === 'cc') {
      if (ab.ccMode === 'silence' || ab.id === 'mind_spike') return 'тишина · сбивает каст';
      const n = Number(ab.buffTurns) || Number(ab.ccTurns) || 1;
      return 'стан ' + n + 'х';
    }
    if (ab.type === 'interrupt' || INTERRUPT_IDS.has(ab.id)) return 'сбивает каст';
    if (ab.id === 'hellfiend' || (PET_SUMMONS[ab.id] && ab.id === 'hellfiend')) {
      return 'пет 34т · 5 ходов · кормит Искупление';
    }
    if (ab.type === 'summon' || PET_SUMMONS[ab.id]) return 'призыв питомца';
    return ab.desc || typeLabel(ab.type);
  }

  /**
   * Словарь именных эффектов: наведение на «Кавычки» в подсказке.
   * Цифры тика живут в тексте способности / на иконке у портрета; здесь — как работает эффект.
   */
  const EFFECT_GLOSSARY = {
    'Кровотечение': 'Периодический урон в конце раунда. Свой экземпляр на каждого, кто наложил. Обновление с той же кнопки заменяет тик и длительность, не ставит второй.',
    'Широкий размах': '1 стак. Следующий «Героический удар» бьёт остальных врагов на 40% силы и вешает 40% того же «Кровотечения». Стак тратится.',
    'Героический удар': 'Удар Оружия. Вешает «Кровотечение». Под «Широким размахом» дублируется на остальных врагов (40% удара и 40% кровотечения).',
    'Дар хмелевара': 'Скрытый хот хмелевара. Шанс равен криту лечащего. 75% полученного хила делятся на 5 раундов. Повторный прок обновляет хот. Это не кнопка.',
    'Выбор света': 'Хот на 2 хода после исцеления раненого. Сила от искусности и объёма хила.',
    'Искупление': 'Носители получают долю урона кастера как лечение. Раздают щит, Молитва исцеления и Щит небес. Кормят Кара, Священный огонь, Исповедь во врага и пет.',
    'Заживляющий туман': 'Хот. Носители дополнительно получают хил, равный 70% урона ткача.',
    'Окутывающий туман': 'Прямой хил плюс хот на несколько раундов.',
    'Успокаивающий туман': 'Без змеи — 3т на своём ходу. Со змеёй только выбирает цель: дальше хил идёт от змеи после каждого хода героя и моба.',
    'Затмение': 'При полной шкале: +20% атаки на 3 хода, шкала в ноль.',
    'Пошатывание': 'Около 35% входящего уходит в пул и тикает по себе. «Очищающий отвар» снимает долю пула в щит «Отвара неуловимости».',
    'Отвар неуловимости': 'Щит: базовая прочность плюс урон, недавно снятый «Очищающим отваром».',
    'Очищающий отвар': 'Снимает часть «Пошатывания». Снятое копится для щита «Отвара неуловимости».',
    'Огненный шок': 'Дот. Пока висит, «Выброс лавы» гарантированно критует.',
    'Выброс лавы': 'Жирный огненный удар. Если на цели «Огненный шок» — этот удар критует без броска.',
    'Смерть и разложение': 'Лужа: свои удары дублируются по целям, которые в ней стоят.',
    'Костяной щит': 'Разовый урон цели и щит на себя.',
    'Неистовое восстановление': 'Хот в процентах запаса здоровья, не плоские т.',
    'Дикая защита': 'Плюс к броне на время. Это не щит.',
    'Разорвать': 'Финишер-дот. Цифра тика в данных — при 5 очках серии. С 1–4 очков тик слабее.',
    'Рваная рана': 'Финишер-дот. Тик в данных — при 5 очках серии.',
    'Потрошение': 'Финишер. На кнопке цифра «при 5 очках». С 1 очка сильно слабее.',
    'Ликвидация': 'Финишер. Бесплатно, своё КД, без окна здоровья.',
    'Свирепый укус': 'Финишер. На кнопке цифра при 5 очках серии.',
    'Дикий рёв': 'Усиление атаки. Серию не ест, ход не тратит.',
    'Боевой бот': 'Постоянный пет механиста: 25т в одну цель, +5 пара с атаки хозяина. Берёт 50% урона по хозяину.',
    'Агония': 'Долгий дот Колдовства. Свой экземпляр на наложившего.',
    'Порча': 'Дот. Свой экземпляр на наложившего.',
    'Нестабильное колдовство': 'Дот. Свой экземпляр на наложившего.',
    'Жертвенный огонь': 'Дот Разрушения. Свой экземпляр на наложившего.',
    'Лунный огонь': 'Дот. Свой экземпляр на наложившего. Обновление с той же кнопки заменяет тик.',
    'Солнечный огонь': 'Дот. Свой экземпляр на наложившего.',
    'Глубокая рана': 'Дот Силы зверя. Не финишер.',
    'Взбучка': 'Дот по области. Цифры тика — в тексте способности.',
    'Растерзать': 'Дот Стража. Свой экземпляр на наложившего.',
    'Омоложение': 'Хот Исцеления. Тик в конце раунда.',
    'Восстановление': 'Хот. Тик в конце раунда.',
    'Буйный рост': 'Хот по отряду.',
    'Жизнецвет': 'Хот. Тик в конце раунда.',
    'Обновление': 'Хот Света. Тик в конце раунда.',
    'Быстрина': 'Хот шамана. Тик в конце раунда.',
    'Исцеляющий ливень': 'Хот по отряду.',
    'Шок небес': 'Хот после Шока небес в союзника.',
    'Освящение': 'Дот по земле. Правосудие бьёт сильнее тех, кто стоит в нём.',
    'Священный огонь': 'Дот Послушания. Кормит «Искупление».',
    'Слово Тьмы: Боль': 'Дот Тьмы.',
    'Прикосновение вампира': 'Дот Тьмы, длиннее Боли.',
    'Всепожирающая чума': 'Короткий жирный дот Тьмы за сферы.',
    'Укус змеи': 'Дот охотника. Свой экземпляр на наложившего.',
    'Чёрная стрела': 'Дот Выживания.',
    'Разрывной заряд': 'Короткий дот Выживания.',
    'Ожог ловушки': 'Дот от ловушки.',
    'Смертельный яд': 'Дот Ликвидации с ударов.',
    'Отравление': 'Короткий дот поверх яда.',
    'Гаррота': 'Дот. Накладывается с кнопки Гарроты.',
    'Нарезка': '1 стак. Следующий одиночный удар дублируется по остальным врагам. Стак тратится.',
    'Череда убийств': 'Короткий дот Боя.',
    'Чума': 'Болезнь Крови. Периодический урон.',
    'Озноб': 'Болезнь Льда. Периодический урон.',
    'Болезнь': 'Болезнь Нечестивости. Периодический урон.',
    'Дыхание огня': 'Дот хмелевара по области.',
    'Буря Пустоты': 'Дот Тайной магии.',
    'Возгорание': 'Дот Огня с Ожога. Не отдельная кнопка Возгорания.',
    'Живая бомба': 'Дот. По истечении может задеть соседей — смотри лог боя.',
    'Снежная буря': 'Короткий дот по всем врагам.',
    'Липкая бомба': 'Дот сапёра.',
    'Раскалённая глыба': 'Окно после крита «Огненного шара»: следующая «Огненная глыба» стоит 10 маны и бьёт 90т.',
    'Раскалённый столб': 'Окно после «Огненного столба»: следующий «Огненный шар» критует.',
    'Копьё — область': 'Окно после «Ледяной стрелы» (20%): следующее «Ледяное копьё» бьёт всех врагов.',
    'Щит света': '+10% брони на 4 хода, до 2 стаков. Вешает Щит праведника.',
    'Отвара неуловимости': 'Щит: база плюс урон, снятый «Очищающим отваром».',
  };

  function effectGlossaryText(name) {
    if (!name) return '';
    const key = String(name).replace(/^[«"']|[»"']$/g, '').trim();
    return EFFECT_GLOSSARY[key] || '';
  }

  /** desc из кита — только цифры / КД / ресурс, без фразы «что делает». */
  function descLooksBare(raw) {
    const s = String(raw || '').trim();
    if (!s) return true;
    const leftover = s
      .replace(/\b(кд|ход|хода|ходу|раунд|раунда|раундов|ярость|ярости|мана|маны|пар|пара|энергия|энергии|очко|очка|очков|заряд|заряда|зарядов|серия|серии|область|перезарядка|бесплатно)\b/gi, ' ')
      .replace(/[\d\s·.,:;+\-−~=%/|+×xх()]+/gi, ' ')
      .replace(/\bт\b/gi, ' ')
      .trim();
    return leftover.length < 4;
  }

  function describeDataFacts(ab) {
    if (!ab) return [];
    const bits = [];
    const ad = ab.applyDot;
    if (ad && (ad.flat != null || ad.turns)) {
      const nm = ad.name || 'периодический урон';
      const fl = ad.flat != null ? Number(ad.flat) : null;
      const tn = Number(ad.turns) || 0;
      if (fl != null && tn) bits.push('«' + nm + '»: ' + fl + 'т за раунд, ' + tn + ' р.');
      else if (tn) bits.push('«' + nm + '» на ' + tn + ' р.');
    }
    const ah = ab.applyHot;
    if (ah) {
      const nm = ah.name || 'периодическое лечение';
      if (ah.hpPct != null) {
        bits.push('«' + nm + '»: ' + Math.round(Number(ah.hpPct) * 100) + '% HP за раунд, ' + (Number(ah.turns) || 0) + ' р.');
      } else if (ah.flat != null) {
        bits.push('«' + nm + '»: ' + Number(ah.flat) + 'т лечения за раунд, ' + (Number(ah.turns) || 0) + ' р.');
      }
    }
    if (ab.atkMod) bits.push('+' + Math.round(Number(ab.atkMod) * 100) + '% атаки' + (ab.buffTurns ? ' · ' + ab.buffTurns + 'х' : ''));
    if (ab.petAtkMod) bits.push('+' + Math.round(Number(ab.petAtkMod) * 100) + '% урона питомца' + (ab.buffTurns ? ' · ' + ab.buffTurns + 'х' : ''));
    if (ab.dmgReduce) bits.push('−' + Math.round(Number(ab.dmgReduce) * 100) + '% входящего' + (ab.buffTurns ? ' · ' + ab.buffTurns + 'х' : ''));
    if (ab.armorMod && !ab.armorStacksMax) bits.push((Number(ab.armorMod) > 0 ? '+' : '') + Math.round(Number(ab.armorMod) * 100) + '% брони' + (ab.buffTurns ? ' · ' + ab.buffTurns + 'х' : ''));
    if (ab.lifesteal) bits.push('вампиризм ' + Math.round(Number(ab.lifesteal) * 100) + '%');
    if (ab.healFromDealt) bits.push('хил ' + Math.round(Number(ab.healFromDealt) * 100) + '% от нанесённого');
    if (ab.vuln && ab.vuln.amount) {
      bits.push('цель +' + Math.round(Number(ab.vuln.amount) * 100) + '% урона · ' + (ab.vuln.turns || 3) + 'х');
    }
    if (ab.enemyDmgMod) bits.push('враги −' + Math.round(Number(ab.enemyDmgMod) * 100) + '% урона');
    if (ab.maxHpPct) bits.push('+' + Math.round(Number(ab.maxHpPct) * 100) + '% запаса HP');
    const gb = ab.grantSelfBuff;
    if (gb && gb.name) bits.push('даёт «' + gb.name + '»');
    return bits;
  }

  /**
   * Игровое описание способности (как работает) — для тултипа на иконке.
   * Цифры урона кнопки справа в карточке; цифры дотов/баффов — здесь.
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
      spirit_link: 'Тотем на 3 хода: −10% входящего урона отряду. Каждые 2 удара по отряду выравнивает здоровье по %.',
      word_glory: 'Сильное исцеление одной цели за Энергию Света (СТ).',
      light_dawn: 'Исцеляет всю группу (АОЕ) за Энергию Света.',
      holy_radiance: 'Исцеляет всю группу (АОЕ).',
      holy_light: 'Сильное исцеление одной цели (СТ).',
      flash: 'Быстрое исцеление одной цели (СТ).',
      ms: 'Удар по выбранной цели. Накладывает «Кровотечение».',
      colossus: 'Ломает броню цели и накладывает «Кровотечение».',
      heroic: 'Удар по выбранной цели. Накладывает «Кровотечение». Под «Широким размахом» дублируется на остальных врагов с силой 40%.',
      reck: '+35% атаки на следующие 2 удара. Не завершает ваш ход.',
      fireball: 'Удар по выбранной цели. Крит вешает «Раскалённую глыбу»: следующая «Огненная глыба» стоит 10 маны и бьёт 90т.',
      pyroblast: 'Тяжёлый удар. Обычно 50 маны. Под «Раскалённой глыбой» — 10 маны и 90т, окно снимается.',
      flamestrike: 'Урон по всем врагам. 33% шанс повесить «Раскалённый столб»: следующий «Огненный шар» критует.',
      frostbolt: 'Удар по выбранной цели. 20% шанс повесить «Копьё — область»: следующее «Ледяное копьё» бьёт всех врагов.',
      ice_lance: 'Удар по выбранной цели. Под «Копьё — область» бьёт всех врагов, окно снимается.',
      lv: 'Удар по выбранной цели. Если на цели «Огненный шок» — этот удар критует без броска.',
      flame_shock: 'Прямой удар и дот. Пока висит «Огненный шок», «Выброс лавы» критует.',
      malefic: 'Удар. +10% за каждый свой дот на этой цели.',
      haunt: 'Удар за осколок. +15% за каждый свой дот на этой цели.',
      jade_serpent: 'Призывает «Нефритовая змея» на 3 раунда. Змея не стоит в очереди: после хода каждого героя и моба лечит выбранного «Успокаивающим туманом» на 3т и бьёт последнюю цель хозяина на 3т. Не завершает ваш ход.',
      soothing: 'Без змеи — 3т выбранному союзнику. Со змеёй не тратит ход и только выбирает, кого змея будет лечить.',
      niuzao: 'Призывает Нюцзао на 3 раунда. Не завершает ваш ход.',
      slice: 'Даёт 1 стак «Нарезка»: следующий одиночный удар дублируется по остальным врагам.',
    };
    if (byId[id]) {
      let s = byId[id];
      if (ab.freeAction && !/не заверш|без хода|не тратит ход/.test(s.toLowerCase())) s += ' Не завершает ваш ход.';
      const extra = describeDataFacts(ab).filter(f => s.indexOf(f) < 0);
      if (extra.length) s += ' ' + extra.join(' ');
      return s;
    }
    // Arms Вихрь: grantSelfBuff wide_sweep (у Неистовства — обычный AoE)
    if (id === 'whirlwind' && ab.grantSelfBuff && ab.grantSelfBuff.id === 'wide_sweep') {
      return 'Урон по всем врагам. Даёт 1 стак «Широкий размах»: следующий «Героический удар» дублируется на остальных (40%).';
    }

    const raw = (ab.desc && String(ab.desc).trim()) || '';
    const parts = [];
    if (raw && raw.length > 2 && !descLooksBare(raw)) parts.push(raw);

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

    const blob = parts.join(' ').toLowerCase();
    for (const f of describeDataFacts(ab)) {
      const low = f.toLowerCase();
      if (blob.indexOf(low) >= 0) continue;
      const q = (f.match(/«([^»]+)»/) || [])[1];
      if (q && blob.indexOf(q.toLowerCase()) >= 0 && /\d+\s*т/.test(blob)) continue;
      parts.push(f);
    }
    if (ab.grantSelfBuff && ab.grantSelfBuff.id === 'wide_sweep' && !/широкий размах|героический/.test(blob)) {
      parts.push('Даёт 1 стак «Широкий размах»: следующий «Героический удар» дублируется на остальных (40%).');
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
    const comboRes = actor && actor.res && actor.res.secondary && actor.res.secondary.type === 'combo';
    if (comboRes && typeof FINISHER_IDS !== 'undefined' && FINISHER_IDS.has(id)
        && !/при 5 очк|серии|серия 0\.22/.test(blob)) {
      parts.push('Цифра на кнопке — при 5 очках серии (0.22 / 0.42 / 0.68 / 1.05 / 1.55).');
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
    'plague_strike', 'poison', 'd', 'dot', 'sticky_bomb']);

  /**
   * DoT / HoT / уязвимость / −защита: отдельный экземпляр на каждого наложившего.
   * Личный бафф, стан, рёв на пак — по-прежнему один на id.
   */
  function statusIsPerCaster(buff) {
    if (!buff) return false;
    if (buff.periodic || Number(buff.dot) > 0 || Number(buff.hot) > 0) return true;
    if (buff.dmgTakenMod) return true;
    if (buff.defMod != null && Number(buff.defMod) < 0) return true;
    const id = String(buff.id || '');
    return /^(dot_|hot_|vuln_|hmark)/.test(id);
  }

  /** Пустой fromUid = общий эффект. Иначе только наложивший и его пет. */
  function statusAffectsViewer(buff, viewer) {
    if (!buff) return false;
    const owner = buff.fromUid;
    if (owner == null || owner === '') return true;
    if (!viewer) return false;
    if (viewer.uid === owner) return true;
    if (viewer.ownerUid && viewer.ownerUid === owner) return true;
    return false;
  }

  function statusOwnerKey(buff) {
    if (!buff || buff.fromUid == null || buff.fromUid === '') return '';
    return String(buff.fromUid);
  }

  /** Apply or refresh. Per-caster effects replace only the same id + fromUid. */
  function applyStatus(unit, buff) {
    if (!unit || !buff) return;
    if (!unit.buffs) unit.buffs = [];
    // Стаки (Удар воина Света / броня): плюсовать, не затирать. Полный пересмотр сложения — отдельно.
    if (buff.stackable || (buff.stacks != null && String(buff.id || '').indexOf('armor_') === 0)) {
      const owner = statusOwnerKey(buff);
      const ex = unit.buffs.find(b => b && b.id === buff.id && statusOwnerKey(b) === owner);
      if (ex) {
        const maxS = Number(buff.armorStacksMax || ex.armorStacksMax || 99);
        const add = Math.max(1, Number(buff.stacks) || 1);
        const cur = Math.max(1, Number(ex.stacks) || 1);
        if (cur >= maxS) {
          ex.turns = buff.turns;
          return;
        }
        const next = Math.min(maxS, cur + add);
        const perArmor = (Number(buff.armorMod) || 0) / add;
        if (perArmor) ex.armorMod = perArmor * next;
        ex.stacks = next;
        ex.turns = buff.turns;
        if (ex.name && /×\d+/.test(ex.name)) ex.name = ex.name.replace(/×\d+/, '×' + next);
        else if (ex.name) ex.name = String(ex.name).replace(/ ×\d+$/, '') + ' ×' + next;
        return;
      }
    }
    if (statusIsPerCaster(buff)) {
      const owner = statusOwnerKey(buff);
      unit.buffs = unit.buffs.filter(b => {
        if (!b || b.id !== buff.id) return true;
        return statusOwnerKey(b) !== owner;
      });
    } else {
      unit.buffs = unit.buffs.filter(b => !b || b.id !== buff.id);
    }
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

