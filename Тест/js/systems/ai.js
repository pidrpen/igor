/* systems/ai: enemy and pet AI */
  function checkBossPhase(boss) {
    if (!boss.phases) return;
    const ratio = boss.hp / boss.maxHp;
    let idx = 0;
    for (let i = 0; i < boss.phases.length; i++) {
      if (i === 0 || ratio <= boss.phases[i].at) idx = i;
    }
    if (idx !== boss.phaseIndex) {
      boss.phaseIndex = idx;
      const ph = boss.phases[idx];
      boss.abilities = ph.abilities.map(a => ({
        id: a.id, name: a.name, icon: '✨', cost: a.cost || 0, gen: 0, costSec: 0, genSec: 0,
        costRunes: null, genRunic: 0, cd: a.cd || 0, baseCd: a.cd || 0, curCd: 0,
        type: a.type, power: a.power || 1, desc: '',
        castKind: a.castKind || null, castPrio: a.castPrio || 0,
      }));
      log('Фаза: ' + ph.name, 'enemy');
      toast(boss.name + ': ' + ph.name);
    }
  }
  function lowest(list) {
    if (!list?.length) return null;
    return list.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  }

  function actorHasJadeSerpent(owner) {
    return !!(owner && combat && combat.pets && combat.pets.some(p =>
      p.alive && p.ownerUid === owner.uid && p.petKey === 'jade_serpent'));
  }

  function tickJadeSerpent(serpent) {
    if (!serpent || !serpent.alive || serpent.petKey !== 'jade_serpent') return;
    const owner = run?.party?.find(p => p.uid === serpent.ownerUid);
    if (!owner) return;
    const allies = living('ally').filter(u => !u.isPet && u.alive);
    const ally = allies.find(a => a.uid === owner._sootheUid)
      || lowest(allies.filter(a => a.hp < a.maxHp))
      || lowest(allies);
    if (ally) {
      const h = healUnit(ally, abilityDamageRaw(owner, { flat: 3 }), serpent, {
        abilityName: 'Успокаивающий туман',
      });
      if (h) log(`${serpent.name}: туман → ${ally.name} (+${fmt(h)})`, 'heal');
    }
    const foesNow = living('enemy').filter(e => e.alive && !e.vaultAway);
    let foe = owner.lastAttackUid ? foesNow.find(e => e.uid === owner.lastAttackUid) : null;
    foe = foe || lowest(foesNow) || pick(foesNow);
    if (foe) {
      const d = dealDmg(foe, abilityDamageRaw(owner, { flat: 3 }), serpent, {
        type: 'damage', isPet: true, abilityId: 'serpent_spit', abilityName: 'Туман змеи',
      });
      if (d) log(`${serpent.name}: → ${foe.name} (−${fmt(d)})`, 'player');
    }
  }

  function tickJadeSerpentsAfterTurn(actor) {
    if (!combat || !actor || actor.isPet) return;
    const list = (combat.pets || []).filter(p => p.alive && p.petKey === 'jade_serpent');
    for (const s of list) tickJadeSerpent(s);
  }

  function aiAct(actor) {
    if (!actor.alive) return;
    if (isStunned(actor)) {
      log(actor.name + ' оглушён — пропуск хода', 'system');
      return;
    }
    // resolve pending cast via Telegraph Engine
    if (actor.side === 'enemy' && actor.casting) {
      resolveCasting(actor);
      return;
    }

    if (actor.vaultAway) return;
    const foes = actor.side === 'ally' ? living('enemy').filter(e => !e.vaultAway) : livingHeroes();
    const friends = actor.side === 'ally' ? livingHeroes() : living('enemy');
    // Pets: simple auto-attack (режим attackMode: st|aoe — «Отладка»)
    if (actor.isPet) {
      if (actor.petKey === 'niuzao') {
        const owner = run?.party?.find(p => p.uid === actor.ownerUid);
        const extra = Math.round(((owner && owner.purifyCleared) || 0) * 0.5);
        const base = owner ? abilityDamageRaw(owner, { flat: 10 }) : 10000;
        let total = 0;
        for (const e of foes.slice()) {
          if (!e.alive) continue;
          total += dealDmg(e, base + extra, actor, {
            type: 'aoe', isAoe: true, isPet: true, abilityId: 'niuzao_stomp', abilityName: 'Топ Нюцзао',
          });
        }
        if (owner) owner.purifyCleared = 0;
        log(`${actor.name}: топ (−${fmt(total)}${extra ? ', +очистка' : ''})`, 'player');
        return;
      }
      if (actor.petKey === 'xuen') {
        const owner = run?.party?.find(p => p.uid === actor.ownerUid);
        const raw = owner ? abilityDamageRaw(owner, { flat: 10 }) : 10000;
        let total = 0;
        for (const e of foes.slice()) {
          if (!e.alive) continue;
          total += dealDmg(e, raw, actor, {
            type: 'aoe', isAoe: true, isPet: true, abilityId: 'xuen_slam', abilityName: 'Лапа Сюэня',
          });
        }
        log(`${actor.name}: область (−${fmt(total)})`, 'player');
        return;
      }
      if (actor.petKey === 'jade_serpent') {
        // Тик не на своём ходе: после каждого героя и моба (tickJadeSerpentsAfterTurn).
        return;
      }
      if (actor.petKey === 'combat_bot') {
        const siege = (actor.buffs || []).some(b => b && b.id === 'call_siege_walker'
          && (b.turns == null || Number(b.turns) > 0));
        const raw = abilityDamageRaw(actor, { flat: 25 });
        if ((siege || actor.attackMode === 'aoe') && foes.length) {
          let total = 0;
          for (const e of foes.slice()) {
            if (!e.alive) continue;
            total += dealDmg(e, raw, actor, {
              type: 'aoe', isAoe: true, isPet: true, abilityId: 'bot_hit', abilityName: 'Гидравлика',
            });
          }
          log(`${actor.name}: область (−${fmt(total)})`, 'player');
        } else {
          const owner = run?.party?.find(p => p.uid === actor.ownerUid);
          let tt = owner?.lastAttackUid ? foes.find(e => e.uid === owner.lastAttackUid) : null;
          tt = tt || lowest(foes) || pick(foes);
          if (tt) {
            const d = dealDmg(tt, raw, actor, {
              type: 'damage', isPet: true, abilityId: 'bot_hit', abilityName: 'Гидравлика',
            });
            if (d) log(`${actor.name}: → ${tt.name} (−${fmt(d)})`, 'player');
          }
        }
        return;
      }
      if (actor.attackMode === 'aoe' && foes.length) {
        const raw = Math.max(1, Math.round(getEff(actor).atk * 0.95));
        let total = 0;
        for (const e of foes.slice()) {
          if (!e.alive) continue;
          total += dealDmg(e, raw, actor, {
            type: 'aoe', isAoe: true, isPet: true, abilityName: 'Залп', abilityId: 'pet_aoe_mode',
          });
        }
        log(`${actor.name}: залп АОЕ (−${fmt(total)})`, 'player');
        maybeDemoPetShard(actor);
        try { maybeEngineerPetPair(actor); } catch (_) {}
        return;
      }
      const ab = actor.abilities.find(a => a.curCd <= 0 && (a.type === 'aoe' || a.type === 'heal' || (a.type === 'damage' && a.power >= 1.2)))
        || actor.abilities.find(a => a.curCd <= 0)
        || actor.abilities[0];
      if (!ab) return;
      if (ab.type === 'aoe') {
        castAbility(actor, ab, null);
        maybeDemoPetShard(actor);
        return;
      }
      if (ab.type === 'heal' || ab.type === 'heal_aoe') {
        const injured = living('ally').filter(u => !u.isPet && u.alive && u.hp < u.maxHp);
        const ht = lowest(injured) || lowest(living('ally').filter(u => !u.isPet));
        if (ht) castAbility(actor, ab, ht);
        return;
      }
      let tt = null;
      if (actor.ownerUid) {
        const owner = run?.party?.find(p => p.uid === actor.ownerUid);
        if (owner?.lastAttackUid && (actor.petKey === 'scrap_bot' || actor.petKey === 'hellfiend' || actor.petKey === 'frost_ghoul' || actor.petKey === 'water_ele')) {
          tt = living('enemy').find(e => e.uid === owner.lastAttackUid) || null;
        }
      }
      if (actor.petKey === 'hellfiend' || actor.petKey === 'frost_ghoul' || actor.petKey === 'water_ele') tt = tt || pick(foes);
      else tt = tt || lowest(foes) || pick(foes);
      if (!tt) return;
      castAbility(actor, ab, tt);
      maybeDemoPetShard(actor);
      return;
    }
    const usable = actor.abilities.filter(a => canPay(actor, a));
    if (!usable.length) return;

    // interrupt casters / stun casters
    if (actor.side === 'ally') {
      const casting = foes.find(e => e.casting);
      const kick = usable.find(a => typeof isKickAbility === 'function' ? isKickAbility(a) : (a.type === 'interrupt' || INTERRUPT_IDS.has(a.id)));
      if (casting && kick && Math.random() < 0.8) {
        castAbility(actor, kick, casting);
        return;
      }
      const stun = usable.find(a => a.type === 'cc');
      if (casting && stun && !kick && Math.random() < 0.5) {
        castAbility(actor, stun, casting);
        return;
      }
      // dispel burst stacks
      if (actor.role === 'healer') {
        const stacked = friends.find(f => (f.burstStacks || 0) >= 2);
        const disp = usable.find(a => a.type === 'dispel');
        if (stacked && disp && Math.random() < 0.7) {
          castAbility(actor, disp, stacked);
          return;
        }
      }
      const enraged = foes.find(e => e.enraged);
      const purge = usable.find(a => a.type === 'purge');
      if (enraged && purge && Math.random() < 0.65) {
        castAbility(actor, purge, enraged);
        return;
      }
    }

    // Ally healer/DPS AI removed — player picks targets. Enemy healers still auto.
    if (actor.role === 'healer' && actor.side === 'enemy') {
      const hurt = lowest(friends.filter(f => !f.isPet)) || lowest(friends);
      const healAb = usable.find(a => a.type === 'heal' || a.type === 'heal_aoe');
      if (hurt && hurt.hp / hurt.maxHp < 0.85 && healAb) {
        castAbility(actor, healAb, abilityTargetRule(healAb) === 'self_only' ? actor : hurt);
        return;
      }
    }
    if (actor.role === 'tank') {
      const agroOnHealer = foes.some(e => {
        const ft = e.buffs.find(b => b.forceTarget);
        return !ft || run.party.find(p => p.uid === ft.forceTarget)?.role === 'healer';
      });
      const taunt = usable.find(a => a.type === 'taunt');
      if (taunt && (agroOnHealer || Math.random() < 0.35)) { castAbility(actor, taunt, null); return; }
      // Local defs always on self
      const sh = usable.find(a => (a.type === 'shield' || a.type === 'cleanse') && abilityTargetRule(a) === 'self_only');
      if (sh && (actor.hp / actor.maxHp < 0.55 || (actor.stagger || 0) > actor.maxHp * 0.2)) {
        castAbility(actor, sh, actor);
        return;
      }
    }

    // start cast sometimes for enemies (telegraph) — prefer high-priority kicks
    if (actor.side === 'enemy' && !isSilenced(actor)) {
      const casts = usable.filter(a => a.type === 'cast_aoe')
        .sort((a, b) => (b.castPrio || 0) - (a.castPrio || 0));
      const castAb = casts[0];
      const p = actor.isBoss ? 0.58 : (actor.isElite ? 0.48 : 0.38);
      // escalate cast rate if previous kicks were missed
      const boost = Math.min(0.25, (actor.missedKicks || 0) * 0.08);
      if (castAb && Math.random() < p + boost) { castAbility(actor, castAb, null); return; }
    }

    const aoe = usable.find(a => a.type === 'aoe');
    if (aoe && foes.length >= 3 && Math.random() < 0.55) { castAbility(actor, aoe, null); return; }

    let target = null;
    if (actor.side === 'enemy') {
      // Threat table + sticky tank: mobs hit the tank far more often
      const tank = livingHeroes().find(a => a.role === 'tank');
      target = getThreatTarget(actor);
      if (!target) {
        target = tank || lowest(livingHeroes());
        if (target) addThreat(actor, target, 500);
      }
      // Soft bias: even if someone pulled slightly, ~70% still swing tank if alive
      if (tank && target && target.uid !== tank.uid) {
        const tThreat = actor.threat?.[target.uid] || 0;
        const tankThreat = actor.threat?.[tank.uid] || 0;
        if (tThreat < tankThreat * 2.2 && Math.random() < 0.72) {
          target = tank;
        }
      }
      // Rare boss glance at 2nd threat only when tank is very stable
      if (actor.isBoss && tank && target?.uid === tank.uid && livingHeroes().length > 1 && Math.random() < 0.08) {
        const sorted = livingHeroes().slice().sort((a, b) =>
          (actor.threat?.[b.uid] || 0) - (actor.threat?.[a.uid] || 0));
        if (sorted[1]) target = sorted[1];
      }
    } else {
      // Ally DPS: only used by pets/edge paths — keep simple pick, no auto-DoT spam
      const tod = usable.find(a => a.id === 'touch_death');
      if (tod) {
        const weak = foes.find(e => e.hp < actor.hp);
        if (weak) { castAbility(actor, tod, weak); return; }
      }
      const exec = usable.find(a => EXECUTE_IDS.has(a.id));
      const low = foes.find(e => e.hp / e.maxHp <= 0.35);
      if (exec && low) { castAbility(actor, exec, low); return; }
      const bestByPower = (list) => list.slice().sort((a, b) => (b.power || 0) - (a.power || 0))[0];
      if (actor.res.secondary && actor.res.secondary.current < actor.res.secondary.max - 1) {
        const builders = usable.filter(a => a.genSec > 0 || a.genRunic > 0);
        const builder = bestByPower(builders.filter(a => a.type === 'damage' || a.type === 'aoe'))
          || bestByPower(builders);
        if (builder) {
          castAbility(actor, builder, lowest(foes));
          return;
        }
      }
      const secNeed = actor.res.secondary?.type === 'combo' ? 3 : (actor.res.secondary?.type === 'runic_power' ? 35 : 2);
      if (actor.res.secondary && actor.res.secondary.current >= secNeed) {
        const fins = usable.filter(a => a.costSec > 0 || FINISHER_IDS.has(a.id));
        const fin = bestByPower(fins);
        if (fin) { castAbility(actor, fin, lowest(foes)); return; }
      }
      if (actor.res.primary && ['rage', 'focus', 'energy'].includes(actor.res.primary.type)
          && actor.res.primary.current < actor.res.primary.max * 0.35) {
        const gens = usable.filter(a => a.gen > 0);
        const g = bestByPower(gens);
        if (g) { castAbility(actor, g, lowest(foes)); return; }
      }
      target = lowest(foes);
    }
    // Prefer strongest affordable non-execute damage (not first in list)
    const dmgPool = usable.filter(a => (a.type === 'damage' || a.type === 'dot') && !EXECUTE_IDS.has(a.id));
    const dmg = dmgPool.slice().sort((a, b) => (b.power || 0) - (a.power || 0))[0]
      || usable.find(a => a.type === 'damage') || usable[0];
    castAbility(actor, dmg, target);
  }

