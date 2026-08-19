/* systems/combat-loop: startCombat, processTurn, endRound */
/* --- fight loop --- */
  function startCombat(type) {
    applyRoomBackground(currentRouteNode());
    const tempHpSnap = {};
    for (const p of (run.party || [])) {
      const sum = (p.buffs || []).reduce((s, b) => s + (b && b.tempHp ? Number(b.tempHp) : 0), 0);
      if (sum > 0 && p.maxHp > 0) tempHpSnap[p.uid] = { sum, ratio: p.hp / p.maxHp };
    }
    applyTalentStats();
    for (const p of (run.party || [])) {
      const snap = tempHpSnap[p.uid];
      if (!snap) continue;
      p.maxHp += snap.sum;
      p.hp = clamp(Math.round(p.maxHp * snap.ratio), p.alive === false ? 0 : 1, p.maxHp);
    }
    resetKeyPowersForCombat();
    const enemies = spawnPack(type);
    for (const p of run.party) {
      if (p.hp <= 0) { p.alive = false; p.hp = 0; } else p.alive = true;
      p.shield = 0;
      p._debugUsedThisTurn = false;
      p._oncePerTurnUsed = {};
      // Баффы/дебаффы едут в следующий пулл и тикают как обычно. КД не сбрасываем.
      p.abilities.forEach(a => {
        // Между пачками откаты НЕ сбрасываются (M+ feel): curCd и charges живут через весь ключ.
        if (a.maxCharges) {
          if (a.charges == null) a.charges = a.maxCharges;
          a.charges = Math.max(0, Math.min(a.maxCharges, Number(a.charges) || 0));
          if (a.charges >= a.maxCharges) {
            a.curCd = 0;
          } else if (!(a.curCd > 0) && a.cd) {
            // нет активного тика — запустить восстановление +1
            a.curCd = a.cd;
          }
          // иначе оставляем текущий curCd
        } else {
          // обычные скиллы: не обнулять curCd при входе в новую пачку
          if (a.curCd == null || a.curCd < 0) a.curCd = 0;
        }
      });
      // Between pulls (M+ feel): no full restore. Energy/focus partially regen; mana barely; rage carries over.
      if (p.res.primary.type === 'energy' || p.res.primary.type === 'focus') {
        p.res.primary.current = clamp(
          Math.max(p.res.primary.current, Math.round(p.res.primary.max * 0.55)),
          0, p.res.primary.max
        );
      } else if (p.res.primary.type === 'mana') {
        // tiny mana sip — healers must manage
        p.res.primary.current = clamp(p.res.primary.current + Math.round(p.res.primary.max * 0.06), 0, p.res.primary.max);
      } else if (p.res.primary.type === 'rage') {
        p.res.primary.current = clamp(Math.max(p.res.primary.current, 15), 0, p.res.primary.max);
      } else if (p.res.runes) {
        // Каждый бой — полный комплект 6/6. Лёд: 3 льда + 3 нечестивости (не 2+2+2).
        p.res.runes = (typeof fullRuneSet === 'function')
          ? fullRuneSet(p.specId)
          : { blood: [true, true], frost: [true, true], unholy: [true, true], cd: [] };
        p.res.primary.current = 6;
      }
      // secondary: серия и Энергия Света едут как есть; chi/eclipse/parts — половина
      if (p.res.secondary && p.res.secondary.type !== 'runic_power'
          && p.res.secondary.type !== 'combo'
          && p.res.secondary.type !== 'holy_power') {
        if (p.res.secondary.type === 'soul_shards') {
          p.res.secondary.current = Math.max(1, Math.min(p.res.secondary.current, 2));
        } else {
          p.res.secondary.current = Math.max(0, Math.floor(p.res.secondary.current * 0.5));
        }
      }
    }
    // Межпулловые «подарки» (привал +15% ATK / авто-lust) отключены — только боевые баффы от скиллов.
    if (run.restBuffBattles) run.restBuffBattles = 0;
    combat = { type, enemies, pets: [], turnQueue: [], turnIndex: 0, round: 1, over: false, waitingPlayer: false, thunderTimer: 0, _afterBusy: false, _animGate: 0 };
    installAnimAfterAction();
    try { if (typeof applyPartyClassAuras === 'function') applyPartyClassAuras(); } catch (e) { console.error('[party aura]', e); }
    spawnClassPets();
    try { if (typeof applyPartyClassAuras === 'function') applyPartyClassAuras(); } catch (e) { console.error('[party aura]', e); }
    try { applyBossMechanics(); } catch (e) { console.error('[boss mech]', e); }
    try { if (typeof fieldOnCombatStart === 'function') fieldOnCombatStart(); } catch (e) { console.error('[field]', e); }
    buildTurnQueue();
    log('Бой: ' + ROOM_META[type].name, 'system');
    renderCombat();
    processTurn();
  }
  function allUnits() {
    if (!combat) return [...(run?.party || [])];
    return [...run.party, ...(combat.pets || []), ...combat.enemies];
  }
  function living(side) {
    if (side === 'ally') {
      const pillars = (combat?.enemies || []).filter(u => u && u.side === 'ally' && u.alive && u.hp > 0 && (u.healOnly || u.instRole === 'static_pillar'));
      return [...run.party, ...((combat?.pets) || []), ...pillars].filter(u => u.side === 'ally' && u.alive && u.hp > 0);
    }
    return (combat?.enemies || []).filter(u => u.alive && u.hp > 0 && !u.vaultAway && u.side !== 'ally' && !u.healOnly && u.instRole !== 'static_pillar');
  }
  function livingHeroes() {
    return run.party.filter(u => u.alive && u.hp > 0);
  }
  function getEff(u, viewer) {
    let atk = u.atk, def = u.def, speed = u.speed;
    for (const b of (u.buffs || [])) {
      if (!b) continue;
      if (b.atkMod) atk *= (1 + b.atkMod);
      if (b.defMod) {
        if (typeof statusIsPerCaster === 'function' && statusIsPerCaster(b) && b.fromUid
            && typeof statusAffectsViewer === 'function' && !statusAffectsViewer(b, viewer)) {
          continue;
        }
        def *= (1 + b.defMod);
      }
    }
    if (u.enraged) atk *= 1.5;
    return { atk: Math.round(atk), def: Math.round(def), speed };
  }
  function buildTurnQueue() {
    const units = allUnits().filter(u => u.alive && u.hp > 0 && u.petKey !== 'jade_serpent' && !u.instObject && !u.healOnly && !u.vaultAway);
    units.sort((a, b) => getEff(b).speed - getEff(a).speed);
    combat.turnQueue = units.map(u => u.uid);
    combat.turnIndex = 0;
  }
  function currentActor() {
    const id = combat?.turnQueue[combat.turnIndex];
    return allUnits().find(u => u.uid === id) || null;
  }

  function animWaitMs(animMs) {
    const n = Number(animMs);
    return Math.min(900, Math.max(280, n > 0 ? n : 350));
  }

  function installAnimAfterAction() {
    if (installAnimAfterAction._ok) return;
    if (typeof afterAction !== 'function') return;
    installAnimAfterAction._ok = true;
    const _after = afterAction;
    afterAction = function () {
      if (!combat || combat.over) return;
      if (combat._afterBusy) return;
      const preWait = !!combat._animPreWait;
      const aiWait = !!combat._aiAnimWait;
      combat._animPreWait = false;
      combat._aiAnimWait = false;
      const animMs = (typeof takeSkillAnimMs === 'function') ? takeSkillAnimMs() : 0;
      combat._afterBusy = true;
      try {
        _after.apply(this, arguments);
      } catch (err) {
        combat._afterBusy = false;
        throw err;
      }
      if (!combat || combat.over) {
        if (combat) combat._afterBusy = false;
        return;
      }
      if (combat.waitingPlayer) {
        combat._afterBusy = false;
        return;
      }
      let wait;
      if (preWait) wait = 0;
      else if (aiWait) wait = Math.max(typeof aiDelay === 'function' ? aiDelay() : 400, animWaitMs(animMs));
      else wait = animWaitMs(animMs);
      scheduleProcessTurn(wait);
    };
  }

  function scheduleProcessTurn(delay) {
    clearTimeout(aiTimer);
    aiTimer = setTimeout(() => {
      try {
        if (combat) combat._afterBusy = false;
        if (!paused) processTurn();
      } catch (err) {
        console.error('[processTurn]', err);
        // Не зависаем: пропускаем текущего и идём дальше
        if (combat && !combat.over) {
          combat.waitingPlayer = false;
          combat._keepPlayerTurn = false;
          combat._afterBusy = false;
          combat.turnIndex = (combat.turnIndex || 0) + 1;
          scheduleProcessTurn(80);
        }
      }
    }, Math.max(0, delay == null ? 60 : delay));
  }

  function processTurn() {
    installAnimAfterAction();
    if (!combat || combat.over || run.finished) return;
    if (combat._afterBusy) return;
    if (combat.vaultLock) {
      scheduleProcessTurn(180);
      return;
    }
    // Сохраняем текущего актора, фильтруем мёртвых, чиним индекс (иначе endRound/скип → «зависание»)
    const prevId = combat.turnQueue[combat.turnIndex];
    combat.turnQueue = combat.turnQueue.filter(id => {
      const u = allUnits().find(x => x.uid === id);
      return u && u.alive && u.hp > 0;
    });
    if (!combat.turnQueue.length) buildTurnQueue();
    else if (prevId) {
      const ni = combat.turnQueue.indexOf(prevId);
      // если текущий умер — остаёмся на том же индексе (следующий после выпавшего)
      combat.turnIndex = ni >= 0 ? ni : Math.min(combat.turnIndex, combat.turnQueue.length);
    }
    if (combat.turnIndex >= combat.turnQueue.length) { endRound(); return; }
    const actor = currentActor();
    if (!actor?.alive || actor.vaultAway || actor.petKey === 'jade_serpent') {
      combat.turnIndex++;
      scheduleProcessTurn(0);
      return;
    }
    if (isStunned(actor)) {
      log((actor.fullName || actor.name) + ' оглушён — ход пропущен', 'system');
      try {
        if (typeof tickJadeSerpentsAfterTurn === 'function') tickJadeSerpentsAfterTurn(actor);
      } catch (e) { console.error('[serpent tick]', e); }
      combat.turnIndex++;
      scheduleProcessTurn(Math.max(80, Math.round(200 / gameSpeed)));
      return;
    }
    actor._oncePerTurnUsed = {};
    actor._fieldStepped = false;
    actor.abilities.forEach(a => {
      if (a.curCd > 0) {
        a.curCd--;
        if (a.curCd <= 0) {
          if (a.maxCharges) {
            // Каждый тик КД восстанавливает +1 заряд (не полный 2/2 сразу)
            if (a.charges == null) a.charges = 0;
            a.charges = Math.min(a.maxCharges, a.charges + 1);
            if (a.charges < a.maxCharges && a.cd) a.curCd = a.cd;
          }
        }
      }
    });
    regenResources(actor);
    const resP = actor.res && actor.res.primary;
    document.getElementById('phase-sub').textContent =
      `Раунд ${combat.round} · ${actor.icon || ''} ${actor.fullName || actor.name}` +
      (resP ? ` · ${resP.icon || ''} ${resP.current}/${resP.max}` : '') +
      (actor.res && actor.res.secondary ? ` · ${actor.res.secondary.icon || ''}${actor.res.secondary.current}` : '');
    showTurnBanner((actor.side === 'ally' ? '▶ ' : '◀ ') + (actor.fullName || actor.name));
    renderCombat();
    updateBossFrame();
    updateVignette();
    if (paused) return;
    // Player only controls heroes; pets auto-act
    if (actor.side === 'ally' && !actor.isPet) {
      if ((typeof shouldRaidAuto === 'function' && shouldRaidAuto(actor))
          || (typeof fieldShouldAuto === 'function' && fieldShouldAuto(actor))) {
        combat.waitingPlayer = false;
        document.getElementById('ability-bar').innerHTML = '';
        try { hidePassivePocket(); } catch (_) {}
        document.getElementById('combat-actions').innerHTML =
          `<span style="color:var(--muted)">Авто-рейд · ${actor.fullName || actor.name}…</span>`;
        clearTimeout(aiTimer);
        aiTimer = setTimeout(() => {
          try {
            if (paused || !combat || combat.over || combat._afterBusy) return;
            installAnimAfterAction();
            if (typeof raidAllyAi === 'function') {
              if (!raidAllyAi(actor)) aiAct(actor);
            } else {
              aiAct(actor);
            }
            combat._aiAnimWait = true;
            afterAction();
          } catch (err) {
            console.error('[raidAi]', err);
            if (combat) {
              combat._keepPlayerTurn = false;
              combat._aiAnimWait = true;
            }
            afterAction();
          }
        }, Math.max(40, Math.round(aiDelay() * 0.55)));
        return;
      }
      combat.waitingPlayer = true;
      combat._keepPlayerTurn = false;
      actor._debugUsedThisTurn = false;
      showAbilities(actor);
    } else {
      combat.waitingPlayer = false;
      combat._keepPlayerTurn = false;
      document.getElementById('ability-bar').innerHTML = '';
      try { hidePassivePocket(); } catch (_) {}
      document.getElementById('combat-actions').innerHTML =
        `<span style="color:var(--muted)">${actor.isPet ? 'Ход питомца…' : 'Ход врага…'}</span>`;
      clearTimeout(aiTimer);
      aiTimer = setTimeout(() => {
        try {
          if (paused || !combat || combat.over || combat._afterBusy) return;
          installAnimAfterAction();
          aiAct(actor);
          combat._aiAnimWait = true;
          afterAction();
        } catch (err) {
          console.error('[aiAct]', err);
          if (combat) {
            combat._keepPlayerTurn = false;
            combat._aiAnimWait = true;
          }
          afterAction();
        }
      }, aiDelay());
    }
  }

  function endRound() {
    // Guard: exactly one periodic pass per combat round (not per hero turn)
    if (!combat || combat._roundTicking) return;
    combat._roundTicking = true;
    combat.round++;
    combat.turnIndex = 0;
    try { if (typeof fieldOnRoundEnd === 'function') fieldOnRoundEnd(); } catch (e) { console.error('[field round]', e); }
    // Демонология: пассивный бес каждые 5 раундов
    if (run?.party && combat.round > 0 && combat.round % 5 === 0) {
      for (const p of run.party.filter(h => h.alive && h.classId === 'warlock' && h.specId === 'demonology')) {
        const n = (combat.pets || []).filter(x => x.alive && x.ownerUid === p.uid && x.petKey === 'imp').length;
        if (n < 4) {
          addPet(p, 'imp', 5);
          log(`${p.name}: пассивный бес`, 'player');
        }
      }
    }
    // Изобретатель: «Ходячая жестянка» — основной питомец +1 деталь каждые 2 раунда
    if (run?.party && combat.round > 0 && combat.round % 2 === 0) {
      for (const p of run.party.filter(h => h.alive && h.classId === 'engineer' && h.specId === 'tinkerer')) {
        let pet = null;
        try { pet = getMainPet(p, false); } catch (_) { pet = null; }
        if (!pet || !pet.alive) continue;
        const sec = p.res && p.res.secondary;
        if (!sec || sec.type !== 'parts') continue;
        const before = Number(sec.current) || 0;
        const max = Number(sec.max) || 5;
        if (before >= max) continue;
        sec.current = Math.min(max, before + 1);
        log(`${pet.name}: нашёл деталь на помойке (+1 · ${sec.current}/${max})`, 'player');
        try { floatText(p.uid, '+1 деталь', 'buff'); } catch (_) {}
      }
    }
    // Passive tank agro pulse — keeps mobs glued to tank without constant taunt
    const tanksPulse = (run?.party || []).filter(p => p.role === 'tank' && p.alive);
    if (tanksPulse.length && combat) {
      for (const e of living('enemy')) {
        const mt = typeof currentMainTank === 'function' ? currentMainTank(e) : tanksPulse[0];
        for (const t of tanksPulse) {
          const amt = e.isBoss ? 350 : (e.isElite ? 220 : 150);
          addThreat(e, t, t.uid === mt?.uid ? amt : Math.round(amt * 0.55));
        }
      }
    }
    for (const u of allUnits()) {
      if (!u.alive) continue;
      // Snapshot list so we tick each buff at most once this round
      const periodic = (u.buffs || []).filter(b => b && (Number(b.dot) > 0 || Number(b.hot) > 0));
      // DoT ticks — 1× per combat round per buff
      for (const d of periodic.filter(b => Number(b.dot) > 0)) {
        if (!u.alive) break;
        if (d._tickedRound === combat.round) continue;
        d._tickedRound = combat.round;
        const tickAmt = Number(d.dot);
        if (!Number.isFinite(tickAmt) || tickAmt <= 0) continue;
        const dotSrc = d.fromUid
          ? (run?.party?.find(p => p.uid === d.fromUid)
            || (combat?.pets || []).find(p => p.uid === d.fromUid)
            || combat?.enemies?.find(e => e.uid === d.fromUid)
            || null)
          : null;
        const dealtDot = dealTrue(u, tickAmt, dotSrc, 'dot', {
          school: d.school || 'physical',
          abilityName: d.name || 'Периодический урон',
          isDot: true,
        });
        const left = Math.max(0, (Number(d.turns) || 1) - 1);
        log(`${u.name}: ${d.name} −${fmt(dealtDot || tickAmt)} · ${left}р`, u.side === 'ally' ? 'enemy' : 'player');
      }
      // HoT ticks — 1× per combat round per buff
      for (const h of periodic.filter(b => Number(b.hot) > 0)) {
        if (!u.alive) break;
        if (h._tickedRound === combat.round) continue;
        h._tickedRound = combat.round;
        const tickAmt = Number(h.hot);
        if (!Number.isFinite(tickAmt) || tickAmt <= 0) continue;
        const healer = h.fromUid
          ? (run?.party?.find(p => p.uid === h.fromUid) || allUnits().find(x => x.uid === h.fromUid))
          : null;
        const before = u.hp;
        const healed = healUnit(u, tickAmt, healer || undefined, {
          noEcho: true,
          abilityName: h.name || 'Периодическое лечение',
          isHot: true,
        });
        const left = Math.max(0, (Number(h.turns) || 1) - 1);
        if (healed > 0) log(`${u.name}: ${h.name} +${fmt(healed)} · ${left}р`, 'heal');
        else if (before >= u.maxHp) log(`${u.name}: ${h.name} (оверхил) · ${left}р`, 'heal');
      }
      // Brewmaster stagger ticks (~25% of pool per round)
      if (u.stagger > 0 && u.side === 'ally') {
        let tick = Math.max(1, Math.round(u.stagger * 0.25));
        u.stagger = Math.max(0, u.stagger - tick);
        const ox = (combat.pets || []).find(p => p.alive && p.ownerUid === u.uid && p.petKey === 'niuzao');
        if (ox && tick > 1) {
          const share = Math.max(1, Math.round(tick * 0.25));
          tick = Math.max(1, tick - share);
          dealTrue(ox, share, u, 'dmg', { abilityName: 'Пошатывание', isDot: true });
          log(`${ox.name}: принял шат −${fmt(share)}`, 'system');
        }
        dealTrue(u, tick, null, 'dmg', { abilityName: 'Пошатывание', isDot: true });
        log(`${u.name}: Пошатывание −${fmt(tick)} (остаток ${fmt(u.stagger)})`, 'enemy');
      }
      // Expire statuses once per combat round (after the single tick)
      const next = [];
      for (const b of (u.buffs || [])) {
        if (b && b.aura) { next.push(b); continue; }
        const left = (Number(b.turns) || 1) - 1;
        if (left <= 0) {
          if (b.tempHp) {
            u.maxHp = Math.max(1, u.maxHp - b.tempHp);
            u.hp = clamp(u.hp, 1, u.maxHp);
          }
          continue;
        }
        const copy = { ...b, turns: left };
        delete copy._tickedRound;
        next.push(copy);
      }
      u.buffs = next;
      if (u.side === 'enemy' && hasEffect('enrage_low') && u.hp / u.maxHp <= 0.3 && !u.enraged) {
        u.enraged = true;
        applyStatus(u, { id: 'enrage', name: 'Ярость', icon: '😡', turns: 99, atkMod: 0.35, dispellable: true, school: 'enrage' });
        log(u.name + ' впадает в ярость! (снимите Развеиванием)', 'enemy');
      }
    }
    // Temporary pet duration
    if (combat.pets) {
      for (const p of combat.pets) {
        if (!p.alive || p.petTurnsLeft == null) continue;
        p.petTurnsLeft--;
        if (p.petTurnsLeft <= 0) {
          if (p.petKey === 'infernal' && p.ownerUid && combat.pets) {
            for (const q of combat.pets) {
              if (q.ownerUid === p.ownerUid && q._holstered && q.petKey === 'imp') {
                q._holstered = false;
                q.alive = true;
                if (!(q.hp > 0)) q.hp = Math.max(1, Math.round((q.maxHp || 1) * 0.6));
                log(`${q.name} возвращается`, 'system');
              }
            }
          }
          p.alive = false; p.hp = 0;
          log(`${p.name} исчезает`, 'system');
        }
      }
      // оставляем мёртвых основных питомцев (для «Воскрешение питомца»)
      combat.pets = combat.pets.filter(p => p.alive || p.isMainPet || p.petTurnsLeft == null);
    }
    try { tickBossMechanics(); } catch (e) { console.error('[tickBoss]', e); }
    // Bursting stacks tick
    tickBurstStacks();
    // Thunder marks: mark 2 heroes, discharge or take extra on next storm
    if (hasEffect('thunder')) {
      combat.thunderTimer = (combat.thunderTimer || 0) + 1;
      if (combat.thunderTimer % 3 === 0) {
        const heroes = livingHeroes();
        const marked = heroes.filter(h => h.thunderMark);
        const dmg = Math.round((8 + run.keyLevel * 1.5) * STAT_SCALE);
        if (marked.length >= 2) {
          marked.forEach(h => {
            dealDmg(h, Math.round(dmg * 1.6), null, { abilityName: 'Гроза (метки)' });
            h.thunderMark = false;
          });
          log('Гроза: оба с меткой получают усиленный удар!', 'enemy');
          toast('⚡ Метки грозы!');
        } else {
          heroes.forEach(a => dealDmg(a, dmg, null, { abilityName: 'Гроза' }));
          log('Гроза −' + fmt(dmg), 'enemy');
        }
        // re-mark 2 random
        heroes.forEach(h => { h.thunderMark = false; });
        const shuf = heroes.slice().sort(() => Math.random() - 0.5).slice(0, Math.min(2, heroes.length));
        shuf.forEach(h => { h.thunderMark = true; });
        if (shuf.length) log('Метки грозы: ' + shuf.map(h => h.name).join(', ') + ' (ход: «Разряд»)', 'system');
      }
    }
    combat.bolsterKills = 0; // reset multi-kill window each round

    // ── Weekly affix end-of-round effects ──
    if (hasEffect('grievous')) {
      const gPct = affixValue('grievous', 0.04);
      for (const h of livingHeroes()) {
        if (h.hp / h.maxHp < 0.9 && h.hp / h.maxHp > 0) {
          const d = Math.max(1, Math.round(h.maxHp * gPct));
          dealTrue(h, d, null);
          log(`${h.name}: Тяжёлая рана −${fmt(d)}`, 'enemy');
        }
      }
    }
    if (hasEffect('quake') && combat.round % 3 === 0) {
      const q = affixValue('quake', 0.08);
      for (const h of livingHeroes()) {
        const d = Math.round(h.maxHp * q);
        dealTrue(h, d, null);
      }
      log('Сотрясение! Весь отряд получает урон', 'enemy');
      toast('Сотрясение');
    }
    if (hasEffect('incorporeal') && combat.round % 4 === 0 && Math.random() < 0.7) {
      const g = scaleEnemy({ id: 'inc', name: 'Бесплотный', icon: '👻', role: 'dps', hp: 55, atk: 12 + run.keyLevel, def: 1, speed: 13, mana: 20,
        abilities: [
          { id: 'h', name: 'Касание', cost: 0, cd: 0, type: 'damage', power: 1.05 },
          { id: 'cast', name: 'Вопль', cost: 10, cd: 2, type: 'cast_aoe', power: 0.7, castKind: 'kick', castPrio: 3 },
        ] }, run.keyLevel, false, false);
      g.buffs.push({ id: 'incorp', name: 'Бесплотность', icon: '💨', turns: 99, atkMod: 0.1, dispellable: true, school: 'magic' });
      combat.enemies.push(g);
      log('Бесплотный: появился дух (снимите бафф / стан)', 'system');
      toast('Бесплотный!');
    }
    if (hasEffect('afflicted') && combat.round % 5 === 0) {
      const t = pick(livingHeroes());
      if (t) {
        applyStatus(t, { id: 'afflicted', name: 'Страдание', icon: '🤢', turns: 3, dispellable: true, school: 'magic',
          hot: 0, // marker
        });
        // DoT via custom
        t.buffs[t.buffs.length - 1].dot = Math.round(t.maxHp * 0.05);
        log(`${t.name} страдает — очистите!`, 'enemy');
        toast('Страждущий: ' + t.name);
      }
    }
    if (typeof tickBurstStacks === 'function') tickBurstStacks();

    combat._roundTicking = false;
    if (checkEnd()) return;
    buildTurnQueue();
    renderCombat();
    // async — иначе processTurn↔endRound уходит в глубокую рекурсию и «зависает» вкладка
    scheduleProcessTurn(0);
  }

  /** Снять подсветку рун (после отвода мыши / каста). */
  function clearRuneHighlight() {
    document.querySelectorAll('.rune.hl').forEach(el => el.classList.remove('hl'));
  }

  /**
   * Подсветить руны, которые тратит скилл.
   * onlyReady=true (hover): только готовые; onlyReady=false (каст): любые слоты типа.
   * costRunes: { b, f, u, any }
   */
  function highlightAbilityRunes(actor, costRunes, onlyReady) {
    clearRuneHighlight();
    if (!actor || !costRunes || !actor.res?.runes) return;
    const unit = document.querySelector(`.unit[data-uid="${actor.uid}"]`);
    if (!unit) return;
    const row = unit.querySelector('.runes-row, .slot-runes');
    if (!row) return;
    const all = [...row.querySelectorAll('.rune')];
    const group = {
      b: all.filter(el => el.classList.contains('b')),
      f: all.filter(el => el.classList.contains('f')),
      u: all.filter(el => el.classList.contains('u')),
    };
    const needReady = onlyReady !== false;
    const mark = (els, n) => {
      let left = Math.max(0, Number(n) || 0);
      for (const el of els) {
        if (left <= 0) break;
        const isReady = el.dataset.ready === '1' || el.classList.contains('ready');
        if (needReady && !isReady) continue;
        el.classList.add('hl');
        left--;
      }
    };
    if (costRunes.any) {
      mark([...group.b, ...group.f, ...group.u], costRunes.any);
    } else {
      if (costRunes.b) mark(group.b, costRunes.b);
      if (costRunes.f) mark(group.f, costRunes.f);
      if (costRunes.u) mark(group.u, costRunes.u);
    }
  }

  function runPlayerCast(actor, ability, target) {
    installAnimAfterAction();
    if (!combat || combat.over || combat._afterBusy) return;
    combat.waitingPlayer = false;
    try {
      const bar = document.getElementById('ability-bar');
      if (bar) bar.innerHTML = '';
      hidePassivePocket();
    } catch (_) {}
    try {
      castAbility(actor, ability, target);
    } catch (err) {
      console.error('[cast]', err);
    }
    if (!combat || combat.over) return;
    if (combat._afterBusy) return;
    const wait = animWaitMs(typeof takeSkillAnimMs === 'function' ? takeSkillAnimMs() : 0);
    combat._animPreWait = true;
    combat._afterBusy = true;
    const gate = (combat._animGate = (combat._animGate || 0) + 1);
    clearTimeout(aiTimer);
    aiTimer = setTimeout(() => {
      try {
        if (!combat || combat.over || combat._animGate !== gate) return;
        combat._afterBusy = false;
        afterAction();
      } catch (err) {
        console.error('[afterAction]', err);
        if (combat && combat._animGate === gate) {
          combat._afterBusy = false;
          combat._keepPlayerTurn = false;
          combat.waitingPlayer = false;
        }
        scheduleProcessTurn(80);
      }
    }, wait);
  }

  /** Каст с рунами: кратко подсветить, потом выполнить действие. */
  function castWithRuneFlash(actor, ability, target) {
    if (ability && ability.costRunes && actor && actor.res && actor.res.runes) {
      highlightAbilityRunes(actor, ability.costRunes, true);
      setTimeout(() => {
        try { clearRuneHighlight(); } catch (_) {}
        runPlayerCast(actor, ability, target);
      }, 150);
      return;
    }
    runPlayerCast(actor, ability, target);
  }

