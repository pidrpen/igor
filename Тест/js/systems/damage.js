/* systems/damage: revenge, dealDmg, heal, kill */
  function triggerProtRevenge(tank) {
    if (!tank || !tank.alive || !combat) return;
    if (combat._revengeLock) return;
    combat._revengeLock = true;
    try {
      const ab = (tank.abilities || []).find(a => a.id === 'revenge');
      if (!ab) return;
      const foes = living(tank.side === 'ally' ? 'enemy' : 'ally');
      if (!foes.length) return;
      const raw = abilityDamageRaw(tank, ab);
      const ctx = { type: 'aoe', isAoe: true, abilityId: 'revenge', school: 'physical', skipBlock: true, freeRevenge: true };
      try { playSkillAnim(tank, ab, foes.slice()); } catch (_) {}
      for (const e of foes.slice()) {
        if (!e.alive) continue;
        const dealt = dealDmg(e, raw, tank, ctx);
        if (dealt) log(tank.name + ': Реванш (парир) → ' + e.name + ' (−' + fmt(dealt) + ')', 'player');
      }
    } finally {
      combat._revengeLock = false;
    }
  }

  function partyHasSpiritLink() {
    return (run?.party || []).some(p =>
      p && p.alive && !p.isPet && (p.buffs || []).some(b => b && b.id === 'spirit_link' && (b.turns == null || b.turns > 0))
    );
  }

  function maybeSpiritLinkEqualize(reason) {
    if (!partyHasSpiritLink()) return;
    if (typeof combat === 'undefined' || !combat) return;
    combat._spiritLinkHits = (combat._spiritLinkHits || 0) + 1;
    if (combat._spiritLinkHits % 2 !== 0) return;
    equalizePartyHpByPct(reason);
  }

  /**
   * Spirit Link: выровнять % HP всего отряда.
   * После каста тотема и каждые 2 удара по отряду (не каждый удар).
   */
  function equalizePartyHpByPct(reason) {
    if (!run?.party) return;
    // не выравнивать, если тотем уже истёк
    if (!partyHasSpiritLink()) return;
    const allies = run.party.filter(p => p && p.alive && !p.isPet && p.maxHp > 0);
    if (allies.length < 2) return;
    const ratios = allies.map(p => p.hp / p.maxHp);
    const minR = Math.min(...ratios);
    const maxR = Math.max(...ratios);
    // нет просадки (все почти на одном %) — тихий выход
    if (maxR - minR < 0.005) return;
    const avg = ratios.reduce((s, r) => s + r, 0) / ratios.length;
    let moved = 0;
    for (const p of allies) {
      const want = Math.max(1, Math.min(p.maxHp, Math.round(p.maxHp * avg)));
      moved += Math.abs(want - p.hp);
      p.hp = want;
    }
    if (moved > 0) {
      log(`Духовная связь: HP выровнены по %${reason ? ' ← удар ' + reason : ''}`, 'heal');
      for (const p of allies) floatText(p.uid, 'связь', 'heal');
    }
  }

  /** Механист: боевой бот принимает 50% урона по хозяину (без 90% резиста пета). */
  function shareMechanistOwnerHit(target, dmg, attacker) {
    if (!(dmg > 0) || !target || target.isPet) return dmg;
    if (target.classId !== 'engineer' || target.specId !== 'mechanist') return dmg;
    if (typeof getMainPet !== 'function') return dmg;
    const pet = getMainPet(target, false);
    if (!pet || !pet.alive || !(pet.hp > 0)) return dmg;
    const share = Math.max(1, Math.round(dmg * 0.5));
    const keep = Math.max(0, dmg - share);
    pet.hp -= share;
    try { floatText(pet.uid, '−' + fmt(share), 'dmg'); } catch (_) {}
    try { pulseUnit(pet.uid, 'hit'); } catch (_) {}
    log(`${pet.name}: принял ${fmt(share)} вместо ${target.name}`, 'system');
    try { meterOnDamage(attacker || null, pet, share, { abilityName: 'Делит удар' }); } catch (_) {}
    if (pet.hp <= 0) {
      pet.hp = 0;
      if (typeof killUnit === 'function') killUnit(pet, attacker || null);
    }
    return keep;
  }

  function dealDmg(target, raw, attacker, ctx) {
    if (!target?.alive) return 0;
    if (attacker && attacker.buffs && attacker.buffs.length) {
      let cut = 0;
      for (const b of attacker.buffs) {
        if (b && b.enemyDmgMod) cut += Number(b.enemyDmgMod) || 0;
      }
      if (cut > 0) raw = Math.max(1, Math.round(raw * (1 - Math.min(0.9, cut))));
    }
    // Хмелевар: уклон только от прямого ST (не AoE, не DoT)
    if (target.side === 'ally' && target.classId === 'monk' && target.specId === 'brewmaster' && raw > 0) {
      const isAoeHit = !!(ctx && (ctx.isAoe || ctx.type === 'aoe' || ctx.type === 'cast_aoe'));
      const isDotHit = !!(ctx && (ctx.isDot || ctx.type === 'dot'));
      if (!isAoeHit && !isDotHit) {
        const dodgeChance = brewTotalDodgeChance(target);
        if (dodgeChance > 0 && Math.random() < dodgeChance) {
          clearBrewLucky(target);
          floatText(target.uid, 'УКЛОН!', 'dodge');
          try { playDefenseFx(target.uid, 'dodge'); } catch (_) {}
          log(`${target.name}: уклонение! (Ещё повезёт сброшен)`, 'heal');
          return 0;
        }
        // промах уклона — стак «Ещё повезёт» после получения удара (ниже, когда dmg>0)
        target._pendingLuckyStack = true;
      }
    }
    // Школа удара: physical vs magic (fire/frost/shadow/…)
    let school = (ctx && ctx.school) || null;
    if (!school && attacker && ctx && ctx.abilityId) {
      const ab = (attacker.abilities || []).find(a => a.id === ctx.abilityId);
      if (ab) school = abilityDamageSchool(attacker, ab);
    }
    if (!school && attacker) school = abilityDamageSchool(attacker, null);
    if (!school) school = 'physical';
    // Броня: процент входящего, в ноль не уходит. Физ. сильнее магии.
    const defNow = getEff(target, attacker).def;
    const kArmor = isPhysicalSchool(school)
      ? (typeof STAT_SCALE === 'number' ? STAT_SCALE * 20 : 20000)
      : (typeof STAT_SCALE === 'number' ? STAT_SCALE * 85 : 85000);
    const armorCut = Math.min(0.75, defNow / (defNow + kArmor));
    let dmg = Math.max(1, Math.round(raw * (1 - armorCut)));
    if (isPhysicalSchool(school)) {
      let armorPct = 0;
      try { armorPct += passiveArmorMod(target); } catch (_) {}
      if (target.buffs && target.buffs.length) {
        for (const b of target.buffs) {
          if (b && b.armorMod) armorPct += Number(b.armorMod) || 0;
        }
      }
      if (armorPct > 0) dmg = Math.max(1, Math.round(dmg * (1 - Math.min(0.85, armorPct))));
    }
    if (target.buffs && target.buffs.length) {
      let dr = 0;
      for (const b of target.buffs) {
        if (b && b.dmgReduce) dr += Number(b.dmgReduce) || 0;
      }
      if (dr > 0) dmg = Math.max(1, Math.round(dmg * (1 - Math.min(0.9, dr))));
    }
    try { onStHitBossMech(target, attacker, ctx); } catch (_) {}
    // Блок: база 0%. Пассивка «Щит с озона» даёт +15%. Иск. Защиты воина — сверху.
    // Сила блока −35% фиксирована (баффы могут добавить blockValueAdd).
    if (
      attacker && attacker.side === 'enemy' && target.side === 'ally'
      && !target.isPet && isPhysicalSchool(school) && !(ctx && ctx.skipBlock)
    ) {
      let blockChance = 0;
      try { blockChance += passiveBlockChance(target); } catch (_) {}
      // Искусность «Критический блок» (Защита воина) добавляет шанс
      if (target.classId === 'warrior' && target.specId === 'protection') {
        try { blockChance += masteryPct(target); } catch (_) {}
      }
      let blockValue = 0.35;
      // База парирования: воин Защита +5%; пассивки (ДК Кровь «Кровяной клинок» +20%)
      let parryChance = (target.classId === 'warrior' && target.specId === 'protection') ? 0.05 : 0;
      try { parryChance += passiveParryChance(target); } catch (_) {}
      for (const b of (target.buffs || [])) {
        if (!b) continue;
        if (b.blockChanceAdd) blockChance += Number(b.blockChanceAdd) || 0;
        if (b.blockValueAdd) blockValue += Number(b.blockValueAdd) || 0;
        if (b.parryChanceAdd) parryChance += Number(b.parryChanceAdd) || 0;
      }
      if (blockChance > 0 || parryChance > 0) {
        blockChance = Math.min(0.85, blockChance);
        parryChance = Math.min(0.75, parryChance);
        blockValue = Math.min(0.75, blockValue);
        const roll = Math.random();
        if (parryChance > 0 && roll < parryChance) {
          log((target.name || 'Танк') + ': Парирование!', 'player');
          floatText(target.uid, 'ПАРИР!', 'parry');
          try { playDefenseFx(target.uid, 'parry'); } catch (_) {}
          // Prot: авто-Реванш только с парирования (не с блока)
          if (target.classId === 'warrior' && target.specId === 'protection') {
            try { triggerProtRevenge(target); } catch (e) { console.error(e); }
          }
          return 0;
        }
        if (roll < parryChance + blockChance) {
          dmg = Math.max(1, Math.round(dmg * (1 - blockValue)));
          log((target.name || 'Танк') + ': Блок (−' + Math.round(blockValue * 100) + '%)', 'player');
          floatText(target.uid, 'БЛОК −' + Math.round(blockValue * 100) + '%', 'block');
          try { playDefenseFx(target.uid, 'block'); } catch (_) {}
          target._justBlocked = true;
        }
      }
    }
    // Уязвимость (Удар колосса / Вендетта): +% входящего только от наложившего
    if (target.buffs && target.buffs.length) {
      let vuln = 0;
      for (const b of target.buffs) {
        if (!b || !b.dmgTakenMod) continue;
        if (b.physOnly && !isPhysicalSchool(school)) continue;
        if (b.fromUid && typeof statusAffectsViewer === 'function' && !statusAffectsViewer(b, attacker)) continue;
        vuln += Number(b.dmgTakenMod) || 0;
      }
      if (vuln) dmg = Math.max(1, Math.round(dmg * (1 + vuln)));
    }
    // Pets take 90% less damage (glass support units)
    if (target.isPet) dmg = Math.max(1, Math.round(dmg * 0.1));
    // Mastery on attacker (heroes); pets use owner
    if (attacker) {
      if (attacker.isPet && attacker.ownerUid) {
        const owner = run?.party?.find(p => p.uid === attacker.ownerUid);
        dmg = Math.round(dmg * masteryPetMult(owner));
      } else if (attacker.side === 'ally' && !attacker.isPet) {
        dmg = Math.round(dmg * masteryDmgMult(attacker, ctx || {}));
        // Elemental Overload: chance for extra hit
        const mi = masteryInfo(attacker.classId, attacker.specId);
        if (mi.kind === 'multi' && Math.random() < masteryPct(attacker) * 0.55) {
          dmg = Math.round(dmg * 1.3);
        }
      }
    }
    // Incoming DR: vers + tank mastery
    if (target.side === 'ally') {
      dmg = Math.round(dmg * versInDmgMult(target) * masteryTankInMult(target));
    }
    let crit = false;
    if (!(ctx && ctx.skipCrit)) {
      // Pets inherit owner sec → critChance/critMult work; enemies keep flat values
      let cChance = attacker && attacker.side === 'ally' ? critChance(attacker) : 0.12;
      if (attacker && ctx && ctx.abilityId) {
        const abC = (attacker.abilities || []).find(a => a.id === ctx.abilityId);
        if (abC && abC.critBonus) cChance = Math.min(0.9, cChance + Number(abC.critBonus));
      }
      const cMul = attacker && attacker.side === 'ally' ? critMult(attacker) : 1.5;
      if (ctx && ctx.forceCrit) { dmg = Math.round(dmg * cMul); crit = true; }
      else if (Math.random() < cChance) { dmg = Math.round(dmg * cMul); crit = true; }
    }
    if (attacker) attacker._justCrit = !!crit;
    if (target.shield > 0) {
      const a = Math.min(target.shield, dmg);
      target.shield -= a; dmg -= a;
    }
    // Brewmaster Stagger: часть урона в пул (не сразу в HP)
    if (dmg > 0 && target.side === 'ally' && target.classId === 'monk' && target.specId === 'brewmaster') {
      let frac = 0.35;
      for (const b of (target.buffs || [])) {
        if (b && b.staggerBonus) frac += Number(b.staggerBonus) || 0;
      }
      frac = Math.min(0.75, frac);
      const cap = Math.round(target.maxHp * 2);
      const toStagger = Math.min(Math.round(dmg * frac), Math.max(0, cap - (target.stagger || 0)));
      if (toStagger > 0) {
        target.stagger = (target.stagger || 0) + toStagger;
        dmg -= toStagger;
      }
    }
    if (dmg > 0) dmg = shareMechanistOwnerHit(target, dmg, attacker);
    if (dmg <= 0) {
      if (target._pendingLuckyStack) target._pendingLuckyStack = false;
      if (target.stagger > 0) floatText(target.uid, 'шат ' + fmt(target.stagger), 'dmg');
      updateBossFrame();
      updateVignette();
      return 0;
    }
    // Хмелевар: стак «Ещё повезёт» после прямого ST-урона
    if (target._pendingLuckyStack) {
      target._pendingLuckyStack = false;
      try { addBrewLuckyStack(target); } catch (e) { console.error(e); }
    }
    target.hp -= dmg;
    const blockedHit = !!target._justBlocked;
    if (target._justBlocked) delete target._justBlocked;
    // blocked hits already showed «БЛОК» float; still show reduced damage number
    floatText(target.uid, (crit ? 'КРИТ ' : '') + '−' + fmt(dmg), crit ? 'crit' : (blockedHit ? 'block-dmg' : 'dmg'));
    pulseUnit(target.uid, blockedHit ? 'blocked' : 'hit');
    if (crit) flashScreen(true);
    if (!blockedHit) sfx(crit ? 'crit' : 'hit');
    // Prot warrior: +3 rage per direct hit taken (not DoTs / dealTrue)
    if (
      target.side === 'ally' && !target.isPet
      && target.classId === 'warrior' && target.specId === 'protection'
      && target.res?.primary?.type === 'rage'
    ) {
      target.res.primary.current = clamp(target.res.primary.current + 3, 0, target.res.primary.max);
      floatText(target.uid, '+3 ярость', 'buff');
    }
    // Engineer: факт атаки питомца → 3–7 пара (1× за действие, не за каждую цель AoE)
    if (attacker && attacker.isPet && target.side === 'enemy' && dmg > 0) {
      try { maybeEngineerPetPair(attacker); } catch (_) {}
    }
    if (target.hp <= 0) { target.hp = 0; killUnit(target, attacker); }
    else if (target.isBoss) checkBossPhase(target);
    if (dmg > 0 && target.side === 'ally' && !target.isPet && partyHasSpiritLink()) {
      try { maybeSpiritLinkEqualize(target.name); } catch (e) { console.error('[spirit_link]', e); }
    }
    // Threat: tanks generate heavy agro so mobs stay on them
    if (attacker && attacker.side === 'ally' && target.side === 'enemy') {
      const mult = attacker.role === 'tank' ? 6.5
        : (attacker.isPet ? 0.35 : (attacker.role === 'healer' ? 0.55 : 0.7));
      addThreat(target, attacker.isPet
        ? (run?.party?.find(p => p.uid === attacker.ownerUid) || attacker)
        : attacker, dmg * mult);
    }
    updateBossFrame();
    updateVignette();
    meterOnDamage(attacker, target, dmg, ctx || null);
    if (dmg > 0 && attacker && target && target.side === 'enemy') {
      try { maybeFeedAtonement(attacker, dmg, ctx || null); } catch (_) {}
      try { maybeHavocCleave(attacker, target, dmg, ctx || null); } catch (_) {}
      try { maybeMistweaverEcho(attacker, dmg); } catch (_) {}
    }
    return dmg;
  }
  function dealTrue(t, d, source, floatKind, ctx) {
    if (!t?.alive) return 0;
    // DoT-тики тоже учитывают слом брони, но только уязв. наложившего этот тик
    const school = (ctx && ctx.school) || 'physical';
    if (t.buffs && t.buffs.length) {
      let vuln = 0;
      for (const b of t.buffs) {
        if (!b || !b.dmgTakenMod) continue;
        if (b.physOnly && !isPhysicalSchool(school)) continue;
        if (b.fromUid && typeof statusAffectsViewer === 'function' && !statusAffectsViewer(b, source)) continue;
        vuln += Number(b.dmgTakenMod) || 0;
      }
      if (vuln) d = Math.max(1, Math.round(d * (1 + vuln)));
    }
    // True damage still respects vers/tank mastery for allies
    if (t.side === 'ally') d = Math.round(d * versInDmgMult(t) * masteryTankInMult(t));
    if (t.isPet) d = Math.max(1, Math.round(d * 0.1));
    if (d > 0) d = shareMechanistOwnerHit(t, d, source);
    if (!(d > 0)) return 0;
    t.hp -= d;
    floatText(t.uid, '−' + fmt(d), floatKind || 'dmg');
    pulseUnit(t.uid, 'hit');
    if (t.hp <= 0) { t.hp = 0; killUnit(t, source || null); }
    updateVignette();
    meterOnDamage(source || null, t, d, ctx || null);
    if (d > 0 && source && t.side === 'enemy') {
      try { maybeFeedAtonement(source, d, ctx || { abilityName: ctx && ctx.abilityName, isDot: true }); } catch (_) {}
    }
    if (d > 0) {
      try { noteTakenDamage(t, d); } catch (_) {}
    }
    if (d > 0 && t.side === 'ally' && !t.isPet && partyHasSpiritLink()) {
      try { maybeSpiritLinkEqualize(t.name); } catch (e) { console.error('[spirit_link]', e); }
    }
    return d;
  }
  function healUnit(t, amount, healer, opts) {
    if (!t?.alive) return 0;
    // opts.exact — flat «т» из таблицы без mastery/vers/loot поверх
    // opts.noEcho — не вешать «Выбор света» (тики HoT)
    // opts.abilityId / abilityName / sourceName / isHot / lifesteal — для Recount
    let takenMod = 0;
    for (const b of (t.buffs || [])) {
      if (b && b.healTakenMod) takenMod += Number(b.healTakenMod) || 0;
    }
    if (takenMod) amount = Math.round(amount * (1 + takenMod));
    if (healer && healer.side === 'ally' && !(opts && opts.exact)) {
      amount = Math.round(amount * versHealMult(healer) * masteryHealMult(healer, t) * (run?.healLootMult || 1));
      if (combat) {
        for (const e of living('enemy')) addThreat(e, healer, amount * 0.12);
      }
    } else if (healer && healer.side === 'ally' && opts && opts.exact && combat) {
      for (const e of living('enemy')) addThreat(e, healer, amount * 0.12);
    }
    const b = t.hp;
    const wasInjured = b < t.maxHp;
    t.hp = clamp(t.hp + amount, 0, t.maxHp);
    const healed = t.hp - b;
    if (healed > 0) {
      const isCrit = !!(opts && opts.crit);
      floatText(t.uid, (isCrit ? 'КРИТ +' : '+') + fmt(healed), isCrit ? 'crit' : 'heal');
      pulseUnit(t.uid, 'healed');
      sfx(isCrit ? 'crit' : 'heal');
      if (isCrit) try { flashScreen(true); } catch (_) {}
      meterOnHeal(healer, t, healed, opts || null);
      if (healed > 0 && t.classId === 'monk' && t.specId === 'brewmaster') {
        const chance = (typeof critChance === 'function') ? critChance(healer || t) : 0.15;
        if (Math.random() < chance) {
          const tick = Math.max(1, Math.round(healed * 0.75 / 5));
          applyStatus(t, {
            id: 'brew_gift', name: 'Дар хмелевара', icon: '🍵',
            turns: 5, hot: tick, fromUid: (healer || t).uid, periodic: true,
          });
          log(`${t.name}: крит-хил → период. леч. ${fmt(tick)}/р · 5р`, 'heal');
        }
      }
      // Holy paladin mastery: «Выбор света» — HoT % от объёма хила, 2 хода
      if (
        healer && healer.side === 'ally' && !healer.isPet
        && healer.classId === 'paladin' && healer.specId === 'holy'
        && wasInjured && !(opts && (opts.exact || opts.noEcho))
      ) {
        const pct = masteryPct(healer);
        if (pct > 0) {
          const echoTotal = Math.max(1, Math.round(healed * pct));
          const tick = Math.max(1, Math.round(echoTotal / 2));
          applyStatus(t, {
            id: 'light_choice',
            name: 'Выбор света',
            icon: '✨',
            turns: 2,
            hot: tick,
            fromUid: healer.uid,
            periodic: true,
          });
          log(`${t.name}: Выбор света ${fmt(tick)}/р · 2р (от хила ${fmt(healed)})`, 'heal');
        }
      }
    }
    updateVignette();
    return healed;
  }
  function killUnit(unit) {
    if (unit.side === 'ally' && !unit.isPet && unit.classId === 'shaman' && unit.specId === 'restoration'
        && run && !run.restoRebirthUsed) {
      run.restoRebirthUsed = true;
      unit.alive = true;
      unit.hp = Math.max(1, Math.round(unit.maxHp * 0.6));
      if (unit.res?.primary?.type === 'mana') unit.res.primary.current = Math.round(unit.res.primary.max * 0.6);
      unit.shield = 0; unit.casting = null;
      floatText(unit.uid, 'возрождение!', 'heal');
      log(`${unit.name}: Возрождение 60% здоровья/маны (1× за ключ)`, 'heal');
      toast('Возрождение шамана!');
      return;
    }
    unit.alive = false; unit.hp = 0; unit.shield = 0; unit.casting = null;
    if (unit.side === 'enemy') {
      unit.buffs = [];
      unit._deadAt = Date.now();
      setTimeout(() => {
        try { if (typeof renderCombat === 'function') renderCombat(); } catch (_) {}
      }, 580);
    }
    pulseUnit(unit.uid, 'dying');
    log((unit.isPet ? 'Питомец ' : '') + unit.name + ' погибает', 'system');
    // Pets: no death penalty. Основных (постоянных) оставляем как «труп» для воскрешения.
    if (unit.isPet) {
      if (combat?.pets) {
        const keepMain = unit.isMainPet || unit.petTurnsLeft == null;
        if (!keepMain) {
          combat.pets = combat.pets.filter(p => p.uid !== unit.uid);
        }
      }
      return;
    }
    if (unit.side === 'ally') {
      run.deaths++;
      const tax = run.deathTax != null ? run.deathTax : DEATH_PENALTY;
      run.timerLeft = Math.max(0, run.timerLeft - tax);
      log(`Смерть: −${tax}с таймера`, 'system');
      // Kill pets of dead hero
      if (combat?.pets) {
        for (const p of combat.pets.filter(x => x.ownerUid === unit.uid && x.alive)) {
          p.alive = false; p.hp = 0;
          log(`${p.name} отступает`, 'system');
        }
      }
      updateHud();
      saveRun();
    }
    if (unit.side === 'enemy') {
      if (unit.forcesValue) {
        const before = run.forces || 0;
        run.forces = Math.min(FORCES_MAP_BUDGET, Math.round((before + unit.forcesValue) * 10) / 10);
        const gained = Math.round((run.forces - before) * 10) / 10;
        if (gained > 0) log(`⚔ +${gained}% сил (всего ${Math.round(run.forces)}/${FORCES_TARGET})`, 'system');
        updateHud();
      }
      if (hasEffect('bolster')) {
        combat.bolsterKills = (combat.bolsterKills || 0) + 1;
        let pct = affixValue('bolster', 0.15);
        if (combat.bolsterKills >= 2) {
          pct *= 1.5;
          toast('Усиливающий ×1.5 — фокусите!');
          log('Усиливающий: мульти-килл → усиление ×1.5', 'enemy');
        }
        living('enemy').forEach(e => {
          if (!e.alive) return;
          const add = Math.round(e.maxHp * pct);
          e.maxHp += add; e.hp += add; e.atk = Math.round(e.atk * 1.08);
          applyStatus(e, { id: 'bolster_buff', name: 'Усиление', icon: '💪', turns: 99, atkMod: 0.08, dispellable: true, school: 'enrage' });
        });
      }
      // Bursting: stacks instead of flat nuke
      if (hasEffect('burst')) {
        addBurstStacks(1);
        log('Взрывной: +1 стек на отряд (очистите!)', 'enemy');
        toast('💥 Взрывной +1');
      }
      if (hasEffect('spite') && Math.random() < 0.45 && combat) {
        const g = scaleEnemy({ id: 'sp', name: 'Злоба', icon: '👻', role: 'dps', hp: 42, atk: 11 + run.keyLevel, def: 0, speed: 14, mana: 0,
          abilities: [{ id: 'h', name: 'Месть', cost: 0, cd: 0, type: 'damage', power: 1 }] }, run.keyLevel, false, false);
        g.ignorePrio = true;
        combat.enemies.push(g);
        log('Злоба: появился дух мести!', 'system');
      }
      // Sanguine: dead body heals nearby enemies
      if (hasEffect('sanguine') && combat) {
        const pct = affixValue('sanguine', 0.12);
        living('enemy').forEach(e => {
          const heal = Math.round(e.maxHp * pct);
          e.hp = clamp(e.hp + heal, 0, e.maxHp);
          floatText(e.uid, '+' + fmt(heal), 'heal');
        });
        log('Кровавый: враги исцеляются от трупа', 'enemy');
      }
    }
  }
