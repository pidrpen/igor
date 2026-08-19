/* systems/stats: crit, mastery, vers, brew dodge */
  function defaultSec() {
    return {
      critRating: SEC_CRIT_RATING,
      versRating: SEC_VERS_RATING,
      masteryRating: SEC_MASTERY_RATING,
    };
  }
  /** Normalize sec object; migrates older formats. */
  function ensureSec(entry) {
    if (!entry) entry = {};
    if (!entry.sec) entry.sec = defaultSec();
    const s = entry.sec;
    // Very old budget system: integer points 0–18
    if (
      s.critRating == null && s.versRating == null && s.masteryRating == null &&
      s.critPct == null && (s.crit != null || s.mastery != null || s.vers != null)
    ) {
      entry.sec = defaultSec();
      return entry.sec;
    }
    // Migrate critPct-only → rating
    if (s.critRating == null) {
      if (s.critPct != null) {
        s.critRating = Math.round((Number(s.critPct) || SEC_CRIT_DEFAULT) / SEC_CRIT_DEFAULT * SEC_CRIT_RATING);
      } else {
        s.critRating = SEC_CRIT_RATING;
      }
    }
    if (s.versRating == null) {
      if (s.versPct != null) {
        s.versRating = Math.round((Number(s.versPct) || 0) / SEC_VERS_PCT_PER_RATING);
      } else {
        s.versRating = SEC_VERS_RATING;
      }
    }
    s.critRating = Math.max(0, Math.round(Number(s.critRating) || 0));
    s.versRating = Math.max(0, Math.round(Number(s.versRating) || 0));
    s.masteryRating = Math.max(0, Math.round(Number(s.masteryRating != null ? s.masteryRating : SEC_MASTERY_RATING) || 0));
    // Derived % for display / combat helpers
    s.critPct = clamp((s.critRating / SEC_CRIT_RATING) * SEC_CRIT_DEFAULT, 0, 0.75);
    s.versPct = clamp(s.versRating * SEC_VERS_PCT_PER_RATING, 0, 0.6);
    delete s.crit;
    delete s.mastery;
    delete s.vers;
    return s;
  }
  function masteryInfo(classId, specId) {
    const key = classId + '_' + specId;
    const m = MASTERY_BY_SPEC[key];
    if (m) return m;
    return {
      name: 'Искусность',
      effect: 'Увеличивает эффективность специализации',
      kind: 'dmg',
      pctAt120: 36,
    };
  }
  function getUnitSec(u) {
    if (!u) return defaultSec();
    if (u.sec) return u.sec;
    return defaultSec();
  }

  /**
   * Вторички для UI в лобби: база (entry.sec) + бонусы с надетого шмота.
   * Не мутирует entry — сейв хранит «голый» sec, gear считается отдельно
   * (в бою applyGearToHero накидывает то же самое на _baseSec*).
   */
  function secWithGear(entry) {
    const tmp = { sec: entry?.sec ? { ...entry.sec } : defaultSec() };
    const base = ensureSec(tmp);
    const gs = (entry && entry.gear && typeof sumGearStats === 'function')
      ? sumGearStats(entry.gear)
      : { crit: 0, mastery: 0, vers: 0 };
    // Живые поля: stats.crit / mastery / vers. Алиас *Rating — только если очка нет (мёртвое поле).
    const critPts = gs.crit != null ? +gs.crit : (+gs.critRating || 0);
    const versPts = gs.vers != null ? +gs.vers : (+gs.versRating || 0);
    const mastPts = gs.mastery != null ? +gs.mastery : (+gs.masteryRating || 0);
    const gearCrit = Math.round(critPts * (typeof GEAR_CRIT_PER_POINT !== 'undefined' ? GEAR_CRIT_PER_POINT : 1));
    const gearVers = Math.round(versPts * (typeof GEAR_VERS_PER_POINT !== 'undefined' ? GEAR_VERS_PER_POINT : 1));
    const gearMast = Math.round(mastPts * (typeof GEAR_MASTERY_PER_POINT !== 'undefined' ? GEAR_MASTERY_PER_POINT : 1));
    const critRating = Math.max(0, Math.round(Number(base.critRating) || 0) + gearCrit);
    const versRating = Math.max(0, Math.round(Number(base.versRating) || 0) + gearVers);
    const masteryRating = Math.max(0, Math.round(Number(base.masteryRating) || 0) + gearMast);
    return {
      critRating,
      versRating,
      masteryRating,
      critPct: clamp((critRating / SEC_CRIT_RATING) * SEC_CRIT_DEFAULT, 0, 0.75),
      versPct: clamp(versRating * SEC_VERS_PCT_PER_RATING, 0, 0.6),
      _gearBonus: { crit: gearCrit, vers: gearVers, mastery: gearMast },
      _base: {
        critRating: Math.round(Number(base.critRating) || 0),
        versRating: Math.round(Number(base.versRating) || 0),
        masteryRating: Math.round(Number(base.masteryRating) || 0),
      },
    };
  }
  /** Crit chance 0–1 (100 rating → 18%). */
  function critChance(u) {
    const s = getUnitSec(u);
    const rating = Number(s.critRating != null ? s.critRating : SEC_CRIT_RATING) || 0;
    let base = (rating / SEC_CRIT_RATING) * SEC_CRIT_DEFAULT;
    if (u && u.buffs) {
      for (const b of u.buffs) {
        if (b && b.critMod) base += Number(b.critMod) || 0;
      }
    }
    return clamp(base, 0.05, 0.75);
  }
  /** Crit damage multiplier (base 1.5). */
  function critMult(/* u */) {
    return SEC_CRIT_MULT;
  }

  /**
   * Крит исходящего лечения (тот же рейтинг крита, что и для урона).
   * @returns {{ amount: number, crit: boolean }}
   */
  function rollOutgoingHealCrit(actor, ability, amount) {
    let amt = Math.max(0, Number(amount) || 0);
    if (!actor || actor.side !== 'ally' || actor.isPet || amt < 1) {
      return { amount: amt, crit: false };
    }
    const chance = Math.min(
      0.9,
      critChance(actor) + (Number(ability && ability.critBonus) || 0)
    );
    if (Math.random() < chance) {
      return { amount: Math.max(1, Math.round(amt * critMult(actor))), crit: true };
    }
    return { amount: amt, crit: false };
  }
  /**
   * Incoming damage mult from vers.
   * versPct is fraction (0.10 = 10%); DR scale ≈ 0.6 of that value (10% vers → −6% dmg).
   */
  function versPctWithBuffs(u) {
    const s = getUnitSec(u);
    const rating = Number(s.versRating != null ? s.versRating : 0) || 0;
    let vp = rating * SEC_VERS_PCT_PER_RATING;
    if (u && u.buffs) {
      for (const b of u.buffs) {
        if (b && b.versMod) vp += Number(b.versMod) || 0;
      }
    }
    return clamp(vp, 0, 0.6);
  }
  function versInDmgMult(u) {
    if (!u || u.side !== 'ally') return 1;
    return clamp(1 - versPctWithBuffs(u) * 0.6, 0.55, 1);
  }
  /** Outgoing heal mult from vers (10% vers → +8% heal). */
  function versHealMult(u) {
    if (!u || u.side !== 'ally') return 1;
    return 1 + versPctWithBuffs(u) * 0.8;
  }
  /**
   * Mastery effect as fraction (0.36 = 36%).
   * Scales linearly with rating: at 120 rating → pctAt120%.
   */
  function masteryPct(u) {
    if (!u || u.side !== 'ally') return 0;
    const s = getUnitSec(u);
    const info = masteryInfo(u.classId, u.specId);
    const rating = Number(s.masteryRating != null ? s.masteryRating : SEC_MASTERY_RATING) || 0;
    const pctAt120 = Number(info.pctAt120 != null ? info.pctAt120 : 36) || 36;
    return (rating / SEC_MASTERY_RATING) * (pctAt120 / 100);
  }
  /** Display helpers for UI */
  function masteryDisplayPct(classId, specId, rating) {
    const info = masteryInfo(classId, specId);
    const r = rating != null ? rating : SEC_MASTERY_RATING;
    const pctAt120 = Number(info.pctAt120 != null ? info.pctAt120 : 36) || 36;
    return (r / SEC_MASTERY_RATING) * pctAt120;
  }
  /**
   * Apply mastery to outgoing damage.
   * ctx: { type, isAoe, isDot, isFinisher, isPet }
   */
  function masteryDmgMult(u, ctx = {}) {
    if (!u || u.side !== 'ally' || u.isPet) {
      // pets inherit owner mastery if pet-kind
      return 1;
    }
    const pct = masteryPct(u);
    if (pct <= 0) return 1;
    const info = masteryInfo(u.classId, u.specId);
    const k = info.kind;
    // Arms: only bleed / physical DoTs (кровотечения)
    if (k === 'bleed') {
      const isBleed = !!(ctx.isDot || ctx.type === 'dot'
        || (ctx.abilityId && /rend|bleed|кров|рван/.test(String(ctx.abilityId)))
        || (ctx.school === 'physical' && (ctx.isDot || ctx.type === 'dot')));
      return isBleed ? (1 + pct) : 1;
    }
    // Fury: % per stack of «Необузданная ярость»
    if (k === 'fury_stacks') {
      const st = (u.buffs || []).find(b => b && b.id === 'fury_mastery');
      const stacks = st ? (Number(st.stacks) || 0) : 0;
      return stacks > 0 ? (1 + pct * stacks) : 1;
    }
    // Prot pally: only Avenger's Shield
    if (k === 'avengers') {
      return (ctx.abilityId === 'avengers') ? (1 + pct) : 1;
    }
    // Ret: only holy-school damage
    if (k === 'holy_dmg') {
      const school = ctx.school || null;
      return (school === 'holy') ? (1 + pct) : 1;
    }
    // Block / light echo / dodge / pet_tune: no generic damage amp
    if (k === 'block_chance' || k === 'light_echo' || k === 'dodge_chance' || k === 'pet_tune' || k === 'blood_shield') return 1;
    if (k === 'dmg' || k === 'st') return 1 + pct;
    if (k === 'aoe' && (ctx.isAoe || ctx.type === 'aoe' || ctx.type === 'cast_aoe')) return 1 + pct;
    if (k === 'aoe' && !ctx.isAoe) return 1 + pct * 0.45; // partial on ST
    if (k === 'dot' && (ctx.isDot || ctx.type === 'dot')) return 1 + pct;
    if (k === 'dot' && !ctx.isDot) return 1 + pct * 0.35;
    if (k === 'dot_aoe') return 1 + pct * ((ctx.isDot || ctx.isAoe) ? 1 : 0.4);
    if (k === 'finisher' && (ctx.isFinisher || (ctx.abilityId && FINISHER_IDS.has(ctx.abilityId)))) return 1 + pct;
    if (k === 'finisher') return 1 + pct * 0.25;
    // pet: только питомцы (masteryPetMult); свой урон без бонуса
    if (k === 'pet') return 1;
    if (k === 'dot_pet') return 1 + pct * 0.35; // self partial; pets full via masteryPetMult
    if (k === 'multi') return 1 + pct * 0.7;
    if (k === 'tank' || k === 'heal' || k === 'heal_shield' || k === 'shield' || k === 'lowhp_heal') return 1 + pct * 0.15;
    return 1 + pct * 0.5;
  }
  function masteryPetMult(owner) {
    if (!owner) return 1;
    const pct = masteryPct(owner);
    const info = masteryInfo(owner.classId, owner.specId);
    // Full mastery for pet-primary specs; pet_tune does NOT amp normal pet hits
    if (info.kind === 'pet' || info.kind === 'dot_pet') return 1 + pct;
    if (info.kind === 'pet_tune') return 1;
    if (info.kind === 'dmg' || info.kind === 'st' || info.kind === 'aoe' || info.kind === 'dot') return 1 + pct * 0.45;
    return 1 + pct * 0.3;
  }
  function masteryHealMult(u, target) {
    if (!u || u.side !== 'ally') return 1;
    const pct = masteryPct(u);
    if (pct <= 0) return 1;
    const info = masteryInfo(u.classId, u.specId);
    const k = info.kind;
    // Holy: no direct heal amp — echo HoT is applied separately
    if (k === 'light_echo' || k === 'block_chance' || k === 'avengers' || k === 'holy_dmg' || k === 'bleed' || k === 'fury_stacks' || k === 'dodge_chance' || k === 'pet_tune' || k === 'blood_shield') return 1;
    if (k === 'heal' || k === 'heal_shield') return 1 + pct;
    if (k === 'lowhp_heal') {
      // «Глубокие воды»: 0 при full HP → полная иск. при ≤30% HP (линейно)
      const ratio = target ? target.hp / Math.max(1, target.maxHp) : 1;
      let factor = 0;
      if (ratio <= 0.3) factor = 1;
      else if (ratio < 1) factor = (1 - ratio) / 0.7;
      return 1 + pct * factor;
    }
    if (k === 'shield') return 1 + pct * 0.4;
    return 1 + pct * 0.1;
  }
  function masteryShieldMult(u) {
    if (!u || u.side !== 'ally') return 1;
    const pct = masteryPct(u);
    const info = masteryInfo(u.classId, u.specId);
    if (info.kind === 'shield' || info.kind === 'heal_shield') return 1 + pct;
    if (info.kind === 'tank') return 1 + pct * 0.5;
    return 1;
  }
  function masteryTankInMult(u) {
    if (!u || u.side !== 'ally' || u.role !== 'tank') return 1;
    const info = masteryInfo(u.classId, u.specId);
    // Prot warrior / block / avengers / brew dodge: no flat incoming DR from mastery
    if (info.kind === 'block_chance' || info.kind === 'avengers' || info.kind === 'light_echo' || info.kind === 'dodge_chance') return 1;
    const pct = masteryPct(u);
    if (info.kind === 'tank') return clamp(1 - pct * 0.85, 0.55, 1);
    return 1;
  }

  /** Базовый шанс уклона хмелевара: иск. + «Пьяный задира» 6%. */
  function brewBaseDodgeChance(u) {
    if (!u || u.classId !== 'monk' || u.specId !== 'brewmaster') return 0;
    return masteryPct(u) + 0.06;
  }
  function brewLuckyStacks(u) {
    const b = (u.buffs || []).find(x => x && x.id === 'lucky_again');
    return b ? (Number(b.stacks) || 0) : 0;
  }
  /** Итоговый шанс: база × (1 + стаки «Ещё повезёт»). */
  function brewTotalDodgeChance(u) {
    const base = brewBaseDodgeChance(u);
    if (base <= 0) return 0;
    return Math.min(0.95, base * (1 + brewLuckyStacks(u)));
  }
  function clearBrewLucky(u) {
    if (!u || !u.buffs) return;
    u.buffs = u.buffs.filter(b => !b || b.id !== 'lucky_again');
  }
  function addBrewLuckyStack(u) {
    if (!u) return;
    u.buffs = u.buffs || [];
    const base = brewBaseDodgeChance(u);
    const prev = u.buffs.find(b => b && b.id === 'lucky_again');
    const stacks = (prev ? (Number(prev.stacks) || 0) : 0) + 1;
    u.buffs = u.buffs.filter(b => !b || b.id !== 'lucky_again');
    applyStatus(u, {
      id: 'lucky_again',
      name: 'Ещё повезёт ×' + stacks,
      icon: '🍀',
      turns: 99,
      stacks,
      tip: '+' + Math.round(base * stacks * 100) + '% уклон',
    });
    floatText(u.uid, 'повезёт ×' + stacks, 'buff');
  }

  /**
   * Пассивные способности спека (карман «Пассивные способности»).
   * short — ярлык; detail — игровое описание (без «при 120» / формул иск.;
   * фиксированные числа, не зависящие от рейтинга, оставляем).
   */
