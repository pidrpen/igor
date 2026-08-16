/* systems/abilities: castAbility */
  function castAbility(actor, ability, target) {
    if (!actor.alive || !canPay(actor, ability, target)) return;
    if (isStunned(actor)) {
      log(actor.name + ' оглушён и пропускает действие', 'system');
      return;
    }
    if (isSilenced(actor) && (ability.type === 'cast_aoe' || ability.type === 'heal' || ability.type === 'heal_aoe' || ability.type === 'dot')) {
      // silence blocks new casts / spells for enemies mainly; allies still cast melee
      if (actor.side === 'enemy') {
        log(actor.name + ' в немоте — каст невозможен', 'system');
        return;
      }
    }
    // resolve execute target auto
    if (EXECUTE_IDS.has(ability.id) && !target) {
      target = living(actor.side === 'ally' ? 'enemy' : 'ally').find(e => e.hp / e.maxHp <= 0.35);
      if (!target) return;
    }
    if (ability.id === 'touch_death') {
      const foesPre = actor.side === 'ally' ? living('enemy') : living('ally');
      target = target && target.alive ? target : foesPre.find(e => e.hp < actor.hp);
      if (!target || !(target.hp < actor.hp)) {
        log(ability.name + ': здоровье цели должно быть меньше вашего', 'system');
        return;
      }
    }
    // Enforce targeting rules (tank defs self-only, etc.)
    const rule = abilityTargetRule(ability);
    if (rule === 'self_only') target = actor;
    else if (rule === 'ally_or_enemy') {
      // keep player-chosen target (ally or enemy); no auto-rewrite
      if (!target || !target.alive || target.isPet) {
        target = lowest(living(actor.side === 'ally' ? 'ally' : 'enemy').filter(u => !u.isPet)) || actor;
      }
    } else if (rule === 'ally_any') {
      target = resolveAbilityTarget(actor, ability, target);
      if (!target || target.side !== actor.side || target.isPet) target = actor;
    } else if (rule === 'enemy') {
      // цель до payAbility — иначе при fail ресурс уже списан / freeAction ломается
      const foesPre = actor.side === 'ally' ? living('enemy') : living('ally');
      target = target || lowest(foesPre);
      if (!target) {
        log(ability.name + ': нет цели', 'system');
        return;
      }
      if (EXECUTE_IDS.has(ability.id) && target.hp / target.maxHp > 0.35) {
        log(ability.name + ' только при ≤35% здоровья', 'system');
        return;
      }
    }
    // Guards before spend
    if (ability.id === 'debug_mode' && actor._debugUsedThisTurn) {
      log(ability.name + ': уже использовано на этом ходу', 'system');
      return;
    }
    if (ability.oncePerTurn && actor._oncePerTurnUsed && actor._oncePerTurnUsed[ability.id]) {
      log(ability.name + ': один раз за ход', 'system');
      return;
    }
    if (ability.id === 'pet_rez') {
      const alivePet = getMainPet(actor, false);
      if (alivePet) {
        log(ability.name + ': питомец уже жив', 'system');
        return;
      }
      if (!mainPetKeyFor(actor.classId, actor.specId)) {
        log(ability.name + ': нет основного питомца', 'system');
        return;
      }
    }
    if (ability.id === 'wrench_heal') {
      const pet = getMainPet(actor, false);
      if (!pet) {
        log(ability.name + ': нужен живой основной питомец', 'system');
        return;
      }
    }

    const outbreakDump = typeof isOutbreakDump === 'function' && isOutbreakDump(actor, ability);
    const savedOutbreakCd = ability.curCd;
    payAbility(actor, ability);
    if (ability.oncePerTurn) {
      actor._oncePerTurnUsed = actor._oncePerTurnUsed || {};
      actor._oncePerTurnUsed[ability.id] = true;
    }
    // Fury mastery stacks: after paying cost (cost>0 = rage spender)
    try { applyFuryMasteryStacks(actor, ability); } catch (e) { console.error(e); }
    if (outbreakDump) {
      ability.curCd = savedOutbreakCd;
    } else if (ability.maxCharges) {
      if (ability.charges == null) ability.charges = ability.maxCharges;
      ability.charges = Math.max(0, ability.charges - 1);
      // Откат по 1 заряду: таймер стартует при любом spend, если ещё не тикает
      if (ability.charges < ability.maxCharges && ability.cd && !(ability.curCd > 0)) {
        ability.curCd = ability.cd;
      }
    } else if (ability.cd) {
      ability.curCd = ability.cd;
    }

    const te = talentEffects();
    if (!actor.buffs) actor.buffs = [];
    const eff = getEff(actor);
    const friends = actor.side === 'ally' ? living('ally') : living('enemy');
    const foes = actor.side === 'ally' ? living('enemy') : living('ally');
    // Guard against missing/NaN power (would make DoT ticks falsy and never fire)
    let power = Number(ability.power);
    if (!Number.isFinite(power) || power <= 0) power = 1;
    const cls = actor.side === 'ally' ? 'player' : 'enemy';
    const lootHeal = (run.loot || []).reduce((s, i) => s + (i.healMult || 0), 0);
    // Лутовый +атака живёт на базе героя (applyTalentStats / applyLootItem), не на мёртвом power.

    let fxTargets = [];
    // Normalize type; force known DoT ids even if type was lost
    const abType = DOT_ABILITY_IDS.has(ability.id)
      ? 'dot'
      : String(ability.type || '').toLowerCase();

    switch (abType) {
      case 'damage': {
        target = target || lowest(foes);
        if (!target) break;
        if (EXECUTE_IDS.has(ability.id) && target.hp / target.maxHp > 0.35) {
          log(ability.name + ' только при ≤35% здоровья цели', 'system');
          break;
        }
        fxTargets = [target];
        playSkillAnim(actor, ability, fxTargets);
        if (ability.targetHpPct != null) {
          const pct = Number(ability.targetHpPct) || 0;
          const raw = Math.max(1, Math.round(target.maxHp * pct));
          target.hp = Math.max(0, target.hp - raw);
          try { floatText(target.uid, '−' + Math.round(pct * 100) + '%', 'dmg'); } catch (_) {}
          log(`${actor.name}: ${ability.name} → ${target.name} (−${fmt(raw)})`, cls);
          if (target.hp <= 0) {
            target.hp = 0;
            if (typeof killUnit === 'function') killUnit(target, actor);
          } else if (target.isBoss && typeof checkBossPhase === 'function') {
            checkBossPhase(target);
          }
          if (typeof maybeTriggerRaidVault === 'function') maybeTriggerRaidVault(target);
          try { updateBossFrame(); } catch (_) {}
          break;
        }
        const school = abilityDamageSchool(actor, ability);
        const dmgCtx = {
          type: 'damage', abilityId: ability.id, abilityName: ability.name, school,
          isFinisher: FINISHER_IDS.has(ability.id),
        };
        if (ability.id === 'lv' && typeof unitHasFlameShock === 'function' && unitHasFlameShock(target, actor)) {
          dmgCtx.forceCrit = true;
        }
        if (ability.id === 'fireball' && (actor.buffs || []).some(b => b && b.id === 'next_fb_crit')) {
          dmgCtx.forceCrit = true;
          actor.buffs = (actor.buffs || []).filter(b => !b || b.id !== 'next_fb_crit');
        }
        const pyroHot = ability.id === 'pyroblast' && (actor.buffs || []).some(b => b && b.id === 'pyro_hot');
        const hits = Math.max(1, Number(ability.hits) || 1);
        let totalDealt = 0;
        for (let hi = 0; hi < hits; hi++) {
          if (!target.alive) break;
          let dmg;
          if (ability.id === 'touch_death') {
            dmg = Math.max(1, Number(actor.hp) || 1);
          } else if (pyroHot) {
            dmg = abilityDamageRaw(actor, { flat: 90 });
          } else {
            dmg = abilityDamageRaw(actor, ability);
          }
          if ((ability.id === 'haunt' || ability.id === 'malefic') && target) {
            const n = countOwnAffDots(target, actor);
            const per = ability.id === 'haunt' ? 0.15 : 0.10;
            if (n > 0) dmg = Math.round(dmg * (1 + per * n));
          }
          if (ability.id === 'abarr') {
            const st = Math.min(3, Math.max(0, Number(actor._arcaneStacks) || 0));
            if (st > 0) dmg += abilityDamageRaw(actor, { flat: 6 * st });
          }
          dmg = scaleByComboIfFinisher(actor, ability, dmg);
          if (te.execute && target.hp / target.maxHp <= 0.35) dmg = Math.round(dmg * te.execute);
          actor._justCrit = false;
          totalDealt += dealDmg(target, dmg, actor, dmgCtx);
        }
        const hitNote = hits > 1 ? ` ×${hits}` : '';
        log(`${actor.name}: ${ability.name} → ${target.name} (−${fmt(totalDealt)}${hitNote})`, cls);
        if (pyroHot) {
          actor.buffs = (actor.buffs || []).filter(b => !b || b.id !== 'pyro_hot');
        }
        if (ability.id === 'ab' && actor.specId === 'arcane') {
          actor._arcaneStacks = Math.min(3, (Number(actor._arcaneStacks) || 0) + 1);
        } else if (ability.id === 'abarr') {
          actor._arcaneStacks = 0;
        }
        if (ability.id === 'fireball' && actor._justCrit) {
          applyStatus(actor, {
            id: 'pyro_hot', name: 'Раскалённая глыба', icon: '☄️', turns: 99,
            tip: 'Следующая Огненная глыба: 10 маны и 90т',
          });
          log(`${actor.name}: крит шара — следующая глыба 10 маны / 90т`, cls);
        }
        if (ability.id === 'frostbolt' && Math.random() < 0.2) {
          applyStatus(actor, {
            id: 'lance_aoe', name: 'Копьё — область', icon: '🗡️', turns: 99,
            tip: 'Следующее Ледяное копьё бьёт по области',
          });
          log(`${actor.name}: следующее Ледяное копьё — область`, cls);
        }
        if (ability.id === 'ice_lance') {
          const lb = (actor.buffs || []).find(b => b && b.id === 'lance_aoe');
          if (lb) {
            const splash = abilityDamageRaw(actor, ability);
            for (const e of foes) {
              if (!e.alive || e.uid === target.uid) continue;
              const sd = dealDmg(e, splash, actor, dmgCtx);
              if (sd) log(`${actor.name}: ${ability.name} (область) → ${e.name} (−${fmt(sd)})`, cls);
            }
            actor.buffs = (actor.buffs || []).filter(b => !b || b.id !== 'lance_aoe');
          }
        }
        // Правосудие: доп. урон целям под «Освящение» (доля от нанесённого Правосудия)
        if (ability.judgmentConsecrateSplash != null && totalDealt > 0) {
          const splashFrac = Number(ability.judgmentConsecrateSplash) || 0;
          if (splashFrac > 0) {
            const splashRaw = Math.max(1, Math.round(totalDealt * splashFrac));
            for (const e of foes) {
              if (!e.alive || e.uid === target.uid) continue;
              const hasCons = (e.buffs || []).some(b =>
                b && (b.id === 'dot_consecrate' || (b.name && String(b.name).includes('Освящение')))
                && (typeof statusAffectsViewer !== 'function' || statusAffectsViewer(b, actor))
              );
              if (!hasCons) continue;
              const sd = dealDmg(e, splashRaw, actor, {
                type: 'damage', abilityId: ability.id, abilityName: ability.name + ' (освящ.)',
                school, skipBlock: true,
              });
              if (sd) log(`${actor.name}: ${ability.name} → ${e.name} (−${fmt(sd)}, освящ.)`, cls);
            }
          }
        }
        if (te.lifesteal && actor.side === 'ally') {
          healUnit(actor, Math.round(totalDealt * te.lifesteal), actor, {
            abilityName: 'Вампиризм', lifesteal: true,
          });
        }
        const ls = ability.lifesteal != null
          ? Number(ability.lifesteal)
          : (ability.id === 'bt' ? 0.1 : 0);
        if (ls > 0 && ability.id !== 'death_strike') {
          healUnit(actor, Math.round(totalDealt * ls), actor, {
            abilityId: ability.id, abilityName: ability.name || 'Вампиризм', lifesteal: true,
          });
        }
        if (ability.id === 'death_strike') {
          applyDeathStrikeHeal(actor);
        }
        if (ability.selfShieldFlat != null) {
          let sh = abilityShieldRaw(actor, { flat: Number(ability.selfShieldFlat) }, actor);
          if (actor.side === 'ally') {
            sh = Math.round(sh * masteryShieldMult(actor) * versHealMult(actor));
          }
          actor.shield = (actor.shield || 0) + sh;
          log(`${actor.name}: Костяной щит 🛡${fmt(sh)}`, 'heal');
        }
        if (ability.cleaveOnDnd) {
          let extras = 0;
          const extraRaw = abilityDamageRaw(actor, ability);
          for (const e of foes) {
            if (!e.alive || (target && e.uid === target.uid)) continue;
            if (!unitHasOwnDnd(e, actor)) continue;
            const sd = dealDmg(e, extraRaw, actor, dmgCtx);
            if (sd) {
              extras++;
              log(`${actor.name}: ${ability.name} (разложение) → ${e.name} (−${fmt(sd)})`, cls);
            }
          }
          if (ability.rpPerExtra && extras > 0) addRunicPower(actor, extras * Number(ability.rpPerExtra));
        }
        // Cleave: соседние цели слева/справа (порядок списка врагов)
        if (ability.cleaveFlat != null && Number.isFinite(Number(ability.cleaveFlat))) {
          const sideRaw = abilityDamageRaw(actor, { flat: ability.cleaveFlat });
          const idx = foes.findIndex(e => e.uid === target.uid);
          for (const j of [idx - 1, idx + 1]) {
            if (j < 0 || j >= foes.length) continue;
            const side = foes[j];
            if (!side?.alive) continue;
            const sd = dealDmg(side, sideRaw, actor, dmgCtx);
            if (sd) log(`${actor.name}: ${ability.name} (бок) → ${side.name} (−${fmt(sd)})`, cls);
          }
        }
        // Splash на всех остальных (Щит праведника: 30т второстепенным)
        if (ability.splashFlat != null && Number.isFinite(Number(ability.splashFlat))) {
          const splashRaw = abilityDamageRaw(actor, { flat: Number(ability.splashFlat) });
          for (const e of foes) {
            if (!e.alive || (target && e.uid === target.uid)) continue;
            const sd = dealDmg(e, splashRaw, actor, {
              type: 'damage', abilityId: ability.id, abilityName: ability.name + ' (второст.)',
              school, skipBlock: false,
            });
            if (sd) log(`${actor.name}: ${ability.name} → ${e.name} (−${fmt(sd)}, второст.)`, cls);
          }
        }
        // Щит праведника: + «Щит света» (броня)
        if (ability.id === 'sot_r' && actor.alive) {
          const prev = (actor.buffs || []).find(b => b && b.id === 'light_shield');
          const stacks = Math.min(2, (prev ? (Number(prev.stacks) || 0) : 0) + 1);
          actor.buffs = (actor.buffs || []).filter(b => !b || b.id !== 'light_shield');
          applyStatus(actor, {
            id: 'light_shield',
            name: stacks > 1 ? ('Щит света ×' + stacks) : 'Щит света',
            icon: '✨',
            turns: 4,
            stacks,
            armorMod: 0.10 * stacks,
            tip: 'Броня увеличена на ' + (10 * stacks) + '%',
          });
          log(`${actor.name}: Щит света ×${stacks} (+${10 * stacks}% брони · 4х)`, cls);
          floatText(actor.uid, 'щит света ×' + stacks, 'buff');
        }
        // Уязвимость брони (Удар колосса) — по умолчанию только физ. урон
        if (ability.vuln && target.alive) {
          const amt = Number(ability.vuln.amount) || 0.2;
          const turns = Number(ability.vuln.turns) || 3;
          const physOnly = ability.vuln.physical !== false;
          applyStatus(target, {
            id: 'vuln_' + ability.id,
            name: physOnly ? 'Слом брони' : ability.name,
            icon: ability.icon || '🔨',
            turns,
            dmgTakenMod: amt,
            physOnly,
            dispellable: true,
            fromUid: actor.uid,
          });
          log(
            `${target.name}: +${Math.round(amt * 100)}% ${physOnly ? 'физ. ' : ''}урона · ${turns} хода`,
            'system'
          );
        }
        if (ability.armorMod && actor.alive) applyArmorStack(actor, ability);
        // DoT поверх урона (Arms: Кровотечение 4 хода и др.)
        if (ability.applyDot && target.alive) {
          const ad = ability.applyDot;
          let tick = periodicTickFromFlat(actor, ad.flat || 0);
          // Arms bleed mastery (and other DoT masteries) snapshot into tick
          tick = Math.max(1, Math.round(tick * masteryDmgMult(actor, {
            isDot: true, type: 'dot', abilityId: ad.id || ability.id,
            school: ad.school || 'physical',
          })));
          tick = scaleDotByComboIfFinisher(actor, ability, tick);
          // Явная длительность из applyDot (Кровотечение = 4) — не PERIODIC_ROUNDS
          const turns = Math.max(1, Number(ad.turns) || 4);
          applyStatus(target, {
            id: 'dot_' + (ad.id || ability.id),
            name: ad.name || ability.name,
            icon: ad.icon || '🩸',
            turns,
            dot: tick,
            fromUid: actor.uid,
            periodic: true,
            school: ad.school || 'physical',
          });
          log(`${actor.name}: ${ad.name || 'период. урон'} → ${target.name} (${fmt(tick)}/р · ${turns}р)`, cls);
          if (ability.applyDotAoe) {
            for (const e of foes) {
              if (!e.alive || e.uid === target.uid) continue;
              applyStatus(e, {
                id: 'dot_' + (ad.id || ability.id),
                name: ad.name || ability.name,
                icon: ad.icon || '🩸',
                turns,
                dot: tick,
                fromUid: actor.uid,
                periodic: true,
                school: ad.school || 'physical',
              });
            }
            log(`${actor.name}: ${ad.name || 'период. урон'} — область`, cls);
          }
        }
        try { consumeNextAoe(actor, ability, target, foes, school, cls); } catch (e) { console.error(e); }
        // Arms: «Широкий размах» — Героический удар дублируется на остальных (40% силы + 40% кровотечения)
        if (ability.id === 'heroic' && actor.alive && target) {
          const ws = (actor.buffs || []).find(b => b && b.id === 'wide_sweep' && (Number(b.stacks) || 0) > 0);
          if (ws) {
            const splashPct = 0.4;
            const splashRaw = Math.max(1, Math.round(abilityDamageRaw(actor, ability) * splashPct));
            // Тик кровотечения как у основной цели, но × тот же % что и splash-удар
            let splashBleedTick = 0;
            if (ability.applyDot) {
              const ad = ability.applyDot;
              let tick = periodicTickFromFlat(actor, ad.flat || 0);
              tick = Math.max(1, Math.round(tick * masteryDmgMult(actor, {
                isDot: true, type: 'dot', abilityId: ad.id || ability.id,
                school: ad.school || 'physical',
              })));
              splashBleedTick = Math.max(1, Math.round(tick * splashPct));
            }
            for (const e of foes) {
              if (!e.alive || e.uid === target.uid) continue;
              const sd = dealDmg(e, splashRaw, actor, {
                type: 'damage', abilityId: ability.id, abilityName: ability.name + ' (размах)',
                school, skipBlock: false,
              });
              if (sd) log(`${actor.name}: ${ability.name} (размах) → ${e.name} (−${fmt(sd)})`, cls);
              if (splashBleedTick > 0 && e.alive && ability.applyDot) {
                const ad = ability.applyDot;
                const turns = Math.max(1, Number(ad.turns) || 4);
                applyStatus(e, {
                  id: 'dot_' + (ad.id || ability.id),
                  name: ad.name || 'Кровотечение',
                  icon: ad.icon || '🩸',
                  turns,
                  dot: splashBleedTick,
                  fromUid: actor.uid,
                  periodic: true,
                  school: ad.school || 'physical',
                });
                log(`${actor.name}: ${ad.name || 'Кровотечение'} (размах ${Math.round(splashPct * 100)}%) → ${e.name} (${fmt(splashBleedTick)}/р · ${turns}р)`, cls);
              }
            }
            actor.buffs = (actor.buffs || []).filter(b => b && b.id !== 'wide_sweep');
            log(`${actor.name}: «Широкий размах» израсходован`, 'system');
          }
        }
        // Kill Command — pet strikes; other hunter hits — small pet assist
        if (actor.side === 'ally' && actor.classId === 'hunter') {
          const pets = petsOf(actor);
          if (pets.length && foes.length) {
            const p = pets[0];
            const t2 = target || lowest(foes);
            if (t2 && p.alive) {
              const petDmg = Math.round(getEff(p).atk * (ability.id === 'kill_cmd' ? 1.55 : 0.4));
              if (ability.id === 'kill_cmd' || Math.random() < 0.35) {
                const pd = dealDmg(t2, petDmg, p, {
                  type: 'damage', abilityId: ability.id, abilityName: ability.name, isPet: true,
                });
                if (pd) log(`${p.name}: Удар → ${t2.name} (−${fmt(pd)})`, 'player');
              }
            }
          }
        }
        if (ability.id === 'death_ray') {
          const radTick = periodicTickFromFlat(actor, 5);
          for (const e of foes) {
            if (!e.alive) continue;
            applyStatus(e, {
              id: 'dot_radiation', name: 'Радиационный ожог', icon: '☢️',
              turns: 2, dot: radTick, fromUid: actor.uid, periodic: true, school: 'fire',
            });
          }
          log(`${actor.name}: Радиационный ожог (${fmt(radTick)}/р · 2р) на всех`, cls);
        }
        if (target && target.alive && actor.side === 'ally' && !actor.isPet) {
          actor.lastAttackUid = target.uid;
        }
        break;
      }
      case 'aoe': {
        if (actor._outbreakDump) {
          actor._outbreakDump = false;
          dumpOutbreakPlague(actor);
          break;
        }
        if (ability.id === 'fire_nova') {
          const shockT = (target && target.alive && target.side !== actor.side) ? target : foes.find(e => e && e.alive);
          if (!shockT || typeof unitHasFlameShock !== 'function' || !unitHasFlameShock(shockT, actor)) {
            log(ability.name + ': нужен Огненный шок на цели', 'system');
            toast('Нужен Огненный шок');
            break;
          }
        }
        const mult = (actor.side === 'ally' && te.aoeMult) || 1;
        // Щит мстителя: основная цель — только кликнутая (иначе без «гарантированного» сбития)
        let primary = null;
        if (ability.id === 'avengers' && target && target.side !== actor.side && target.alive) {
          primary = target;
        }
        if (ability.id === 'avengers' && primary) {
          fxTargets = [primary].concat(foes.filter(e => e.uid !== primary.uid));
        } else {
          fxTargets = foes.slice();
        }
        playSkillAnim(actor, ability, fxTargets);
        const aoeCtx = {
          type: 'aoe', isAoe: true, abilityId: ability.id, abilityName: ability.name,
          school: ability.school || abilityDamageSchool(actor, ability),
        };
        const hits = Math.max(1, Number(ability.hits) || 1);
        const hasFlatZero = ability.flat === 0 || ability.flat === '0';
        // Буря Скверны: урон только удар пета (после switch), не второй хлопок кнопки
        const skipAoeDmg = ability.id === 'felstorm';
        let totalAll = 0;
        const order = (ability.id === 'avengers' && primary)
          ? [primary].concat(foes.filter(e => e.uid !== primary.uid))
          : foes.slice();
        order.forEach((enemy, idx) => {
          if (!enemy?.alive) return;
          let fall = 1;
          if (ability.aoeBounce != null && idx > 0) fall = Math.max(0.15, 1 - Number(ability.aoeBounce) * idx);
          let total = 0;
          if (!hasFlatZero && !skipAoeDmg) {
            for (let hi = 0; hi < hits; hi++) {
              if (!enemy.alive) break;
              let raw = abilityDamageRaw(actor, ability, mult * fall);
              raw = scaleByComboIfFinisher(actor, ability, raw);
              total += dealDmg(enemy, raw, actor, aoeCtx);
            }
            if (total > 0) log(`${actor.name}: ${ability.name} → ${enemy.name} (−${fmt(total)})`, cls);
          }
          totalAll += total;
          // Щит мстителя: гарантированный сбитие только у кликнутой; остальные — с шансом
          if (ability.interruptPrimary && enemy.casting) {
            const isPrimary = !!(primary && enemy.uid === primary.uid);
            const chance = isPrimary ? 1 : (Number(ability.interruptAoeChance) || 0);
            if (isPrimary || (chance > 0 && Math.random() < chance)) {
              const castName = enemy.casting.name || 'каст';
              interruptCast(enemy, actor);
              log(
                `${actor.name}: ${ability.name} сбивает «${castName}» у ${enemy.name}` +
                (isPrimary ? '' : ' (шанс)'),
                'player'
              );
            }
          }
          if (ability.applyDot && enemy.alive) {
            const ad = ability.applyDot;
            let tick = periodicTickFromFlat(actor, ad.flat || 0);
            tick = Math.max(1, Math.round(tick * masteryDmgMult(actor, {
              isDot: true, type: 'dot', abilityId: ad.id || ability.id,
              school: ad.school || ability.school || 'physical',
            })));
            tick = scaleDotByComboIfFinisher(actor, ability, tick);
            applyStatus(enemy, {
              id: 'dot_' + (ad.id || ability.id), name: ad.name || ability.name,
              icon: ad.icon || ability.icon || '☀️', turns: Number(ad.turns) || 4,
              dot: tick, fromUid: actor.uid, periodic: true,
              school: ad.school || ability.school || 'physical',
            });
          }
          if (ability.enemyDmgMod && enemy.alive) {
            applyStatus(enemy, {
              id: 'edm_' + ability.id, name: ability.name, icon: ability.icon || '🔥',
              turns: Number(ability.buffTurns) || 5,
              enemyDmgMod: Number(ability.enemyDmgMod) || 0,
            });
          }
        });
        if (ability.rpPerTarget) {
          const n = order.filter(e => e && e.alive !== false).length;
          const hitsN = order.filter(e => e).length;
          if (hitsN > 0) addRunicPower(actor, hitsN * Number(ability.rpPerTarget));
        }
        if (ability.id === 'flamestrike' && Math.random() < 0.33) {
          applyStatus(actor, {
            id: 'next_fb_crit', name: 'Раскалённый столб', icon: '🌋', turns: 99,
            tip: 'Следующий Огненный шар — крит',
          });
          log(`${actor.name}: следующий Огненный шар — крит`, cls);
        }
        if (ability.healFromDealt && totalAll > 0) {
          const h = healUnit(actor, Math.round(totalAll * Number(ability.healFromDealt)), actor, {
            abilityId: ability.id, abilityName: ability.name,
          });
          if (h) log(`${actor.name}: ${ability.name} лечит (+${fmt(h)})`, 'heal');
        }
        if (ability.shieldFromDmg && totalAll > 0) {
          const sh = Math.round(totalAll * Number(ability.shieldFromDmg));
          actor.shield = (actor.shield || 0) + sh;
          log(`${actor.name}: щит ${fmt(sh)} от ${ability.name}`, cls);
        }
        if (ability.dmgReduce && ability.id === 'heroic_leap') {
          applyStatus(actor, {
            id: 'dr_heroic_leap', name: ability.name, icon: ability.icon || '🦘',
            turns: Number(ability.buffTurns) || 2, dmgReduce: Number(ability.dmgReduce) || 0,
          });
        }
        break;
      }
      case 'cast_aoe': {
        if (actor.side === 'enemy') {
          if (isSilenced(actor)) {
            log(actor.name + ' в немоте — не может читать', 'system');
            break;
          }
          // Prefer ability-defined castKind; bosses default to buster more often
          const isBoss = !!actor.isBoss;
          let kind = ability.castKind || (isBoss && Math.random() < 0.5 ? 'buster' : 'kick');
          if (kind !== 'buster' && kind !== 'aoe' && kind !== 'kick') kind = 'kick';
          const castPrio = ability.castPrio || (kind === 'kick' ? 3 : kind === 'buster' ? 2 : 1);
          const avoidable = kind === 'aoe' && !isBoss && Math.random() < 0.35 ? 'dodge' : false;
          actor.casting = makeTelegraph(kind, {
            name: ability.name, power, powerMult: kind === 'buster' ? 1.2 : 1,
            target: kind === 'buster' ? 'tank' : 'all', avoidable, interruptible: kind !== 'buster' || true,
          });
          actor.casting.castPrio = castPrio;
          actor.casting.priority = castPrio;
          actor.casting.maxTurns = actor.casting.turns || actor.casting.resolveIn || 1;
          playSkillAnim(actor, ability, []);
          log(`${actor.name} читает [P${castPrio}]: ${telegraphLabel(actor.casting)}${avoidable ? ' · можно уклониться' : ''}`, 'enemy');
          toast(telegraphLabel(actor.casting));
        } else {
          fxTargets = foes.slice();
          playSkillAnim(actor, ability, fxTargets);
          const aoeCtx = {
            type: 'cast_aoe', isAoe: true, abilityId: ability.id,
            abilityName: ability.name,
            school: abilityDamageSchool(actor, ability),
          };
          for (const t of foes.slice()) dealDmg(t, Math.round(eff.atk * power), actor, aoeCtx);
        }
        break;
      }
      case 'interrupt': {
        target = target || foes.find(e => e.casting);
        if (!target?.casting) { log('Нечего прерывать', 'system'); break; }
        playSkillAnim(actor, ability, [target]);
        interruptCast(target, actor);
        break;
      }
      case 'dispel': {
        target = target || lowest(friends.filter(f => !f.isPet && ((f.burstStacks || 0) > 0 || f.buffs.some(b => b.dispellable)))) || actor;
        playSkillAnim(actor, ability, [target]);
        // clear 1 burst stack or dispellable
        if ((target.burstStacks || 0) > 0) {
          target.burstStacks = Math.max(0, target.burstStacks - 1);
          log(`${actor.name}: ${ability.name} → ${target.name} (−1 Взрывной, стек ${target.burstStacks})`, 'heal');
          toast('Снят стек Взрывного');
        } else {
          const gone = removeDispellable(target, ['magic', 'curse', 'disease']);
          if (gone) {
            log(`${actor.name}: ${ability.name} снимает «${gone.name}» с ${target.name}`, 'heal');
            toast('Очищено: ' + gone.name);
          } else if (target.thunderMark) {
            target.thunderMark = false;
            log(`${actor.name}: ${ability.name} снимает метку грозы с ${target.name}`, 'heal');
          } else {
            log(`${actor.name}: ${ability.name} — нечего снимать`, 'system');
          }
        }
        break;
      }
      case 'purge': {
        target = target || foes.find(e => e.enraged || e.buffs.some(b => b.dispellable || b.atkMod > 0)) || pick(foes);
        if (!target) break;
        playSkillAnim(actor, ability, [target]);
        if (target.enraged) {
          target.enraged = false;
          log(`${actor.name}: ${ability.name} усмиряет ${target.name}`, 'player');
          toast('Ярость снята');
        } else {
          const gone = removeDispellable(target, ['magic', 'enrage']) || (() => {
            const i = target.buffs.findIndex(b => b.atkMod > 0);
            if (i < 0) return null;
            return target.buffs.splice(i, 1)[0];
          })();
          if (gone) log(`${actor.name}: ${ability.name} снимает «${gone.name || 'бафф'}» с ${target.name}`, 'player');
          else log(`${actor.name}: ${ability.name} — нечего снимать`, 'system');
        }
        break;
      }
      case 'cc': {
        target = target || pick(foes);
        if (!target) break;
        playSkillAnim(actor, ability, [target]);
        const mode = ability.ccMode || 'stun';
        if (target.casting) interruptCast(target, actor);
        if (mode === 'stun') {
          const stTurns = Number(ability.buffTurns) || Number(ability.ccTurns) || 1;
          applyStatus(target, { id: 'stun', name: 'Оглушение', icon: '💫', turns: stTurns, ccMode: 'stun' });
          log(`${actor.name}: ${ability.name} → ${target.name} (стан ${stTurns}х)`, 'player');
          toast('💫 Стан ' + stTurns + 'х');
        } else {
          applyStatus(target, { id: 'lock', name: 'Немота', icon: '🔇', turns: 2, ccMode: 'silence' });
          log(`${actor.name}: ${ability.name} → ${target.name} (немота)`, 'player');
        }
        // Spite ghosts: stun kills
        if (target.name === 'Злоба' || target.id === 'sp') {
          target.hp = 0; target.alive = false;
          log('Злоба уничтожена оглушением!', 'player');
        }
        break;
      }
      case 'cleanse': {
        playSkillAnim(actor, ability, [actor]);
        const before = actor.stagger || 0;
        const pct = ability.purifyPct != null ? Number(ability.purifyPct) : 1;
        if (before > 0) {
          const cleared = Math.max(1, Math.round(before * Math.min(1, Math.max(0, pct))));
          actor.stagger = Math.max(0, before - cleared);
          // Пул для «Отвар неуловимости»: сумма очищенного stagger
          actor.purifyCleared = (actor.purifyCleared || 0) + cleared;
          log(`${actor.name}: ${ability.name} — −${fmt(cleared)} шат (остаток ${fmt(actor.stagger)}; пул щита ${fmt(actor.purifyCleared)})`, 'heal');
          toast('Пошатывание −' + fmt(cleared));
          floatText(actor.uid, 'чист ' + fmt(cleared), 'heal');
        } else {
          log(`${actor.name}: ${ability.name} — пошатывания нет`, 'system');
          toast('Пошатывания нет');
        }
        break;
      }
      case 'heal': {
        // Гаечный воскрешатель: −50% maxHP пета → +10% maxHP цели
        if (ability.id === 'emergency_repair') {
          const pet = typeof getMainPet === 'function' ? getMainPet(actor, false) : null;
          if (!pet) {
            log(`${actor.name}: ${ability.name} — нет живого питомца`, 'system');
            break;
          }
          playSkillAnim(actor, ability, [pet]);
          const amt = Math.max(1, Math.round(pet.maxHp * 0.2));
          const h = healUnit(pet, amt, actor, {
            exact: true, abilityId: ability.id, abilityName: ability.name,
          });
          log(`${actor.name}: ${ability.name} → ${pet.name} (+${fmt(h)})`, 'heal');
          break;
        }
        if (ability.id === 'wrench_heal') {
          const pet = getMainPet(actor, false);
          if (!pet) {
            log(`${actor.name}: ${ability.name} — нет живого питомца`, 'system');
            break;
          }
          target = target || lowest(friends.filter(f => !f.isPet)) || actor;
          if (!target || target.side !== actor.side || target.isPet) target = actor;
          const sac = Math.max(1, Math.round(pet.maxHp * 0.5));
          pet.hp = Math.max(0, pet.hp - sac);
          if (pet.hp <= 0) {
            pet.hp = 0;
            killUnit(pet, actor);
          } else {
            floatText(pet.uid, '−' + fmt(sac), 'dmg');
          }
          const healAmt = Math.max(1, Math.round(target.maxHp * 0.1));
          playSkillAnim(actor, ability, [target]);
          const h = healUnit(target, healAmt, actor, {
            exact: true, abilityId: ability.id, abilityName: ability.name,
          });
          log(`${actor.name}: ${ability.name} (пет −${fmt(sac)}) → ${target.name} (+${fmt(h)})`, 'heal');
          toast('Гаечный воскрешатель');
          break;
        }
        if (ability.id === 'penance' && target && target.side !== actor.side && target.alive) {
          playSkillAnim(actor, ability, [target]);
          let raw = abilityDamageRaw(actor, ability);
          const dealt = dealDmg(target, raw, actor, {
            type: 'damage', abilityId: ability.id, abilityName: ability.name, school: 'holy',
          });
          log(`${actor.name}: ${ability.name} → ${target.name} (−${fmt(dealt)})`, cls);
          break;
        }
        if (ability.holyShock && target && target.side !== actor.side && target.alive) {
          playSkillAnim(actor, ability, [target]);
          // Урон = вес скилла (27т), не хардкод 12
          const shockFlat = abilityFlatWeight(ability);
          let dealt = abilityDamageRaw(actor, { flat: shockFlat != null ? shockFlat : 27 });
          // Один ролл крита — в dealDmg, с critBonus скилла. Второй бросок не делать.
          dealt = dealDmg(target, dealt, actor, {
            type: 'damage', abilityId: ability.id, abilityName: ability.name, school: 'holy', skipBlock: true,
          });
          const hotFlat = (ability.applyHot && ability.applyHot.flat != null)
            ? Number(ability.applyHot.flat) : 7;
          applyStatus(target, {
            id: 'dot_holy_shock', name: 'Шок небес', icon: ability.icon || '✨',
            turns: Number(ability.applyHot && ability.applyHot.turns) || 5,
            dot: periodicTickFromFlat(actor, hotFlat), fromUid: actor.uid, periodic: true, school: 'holy',
          });
          log(`${actor.name}: ${ability.name} → ${target.name} (−${fmt(dealt)} + период.)`, cls);
          break;
        }
        if (abilityTargetRule(ability) === 'self_only') target = actor;
        else target = target || lowest(friends.filter(f => !f.isPet)) || lowest(friends) || actor;
        if (!target || target.side !== actor.side) target = actor;
        if (!target.buffs) target.buffs = [];
        fxTargets = [target];
        playSkillAnim(actor, ability, fxTargets);
        // Лечение всегда от статов (атака кастера через flat, или % maxHp через power)
        let amount = abilityHealRaw(actor, ability, target, 1 + lootHeal);
        for (const b of (actor.buffs || [])) {
          if (!b || !b.healAmp || !(b.abilityCharges > 0)) continue;
          amount = Math.round(amount * (1 + Number(b.healAmp)));
          b.abilityCharges -= 1;
          if (b.abilityCharges <= 0) b.turns = 0;
        }
        if (ability.id === 'hw' || ability.id === 'chw') {
          const tw = (actor.buffs || []).find(b => b && b.id === 'tidal_waves' && b.abilityCharges > 0);
          if (tw) {
            if (ability.id === 'hw') amount = Math.round(amount * 1.1);
            tw.abilityCharges -= 1;
            if (tw.abilityCharges <= 0) tw.turns = 0;
          }
        }
        // Крит хила: всегда от рейтинга крита (+critBonus скилла)
        let healCrit = false;
        {
          const rolled = rollOutgoingHealCrit(actor, ability, amount);
          amount = rolled.amount;
          healCrit = rolled.crit;
        }
        if (!Number.isFinite(amount) || amount < 1) amount = Math.max(1, Math.round(getEff(actor).atk * 0.5));

        const useFlat = abilityFlatWeight(ability) != null;
        // Legacy HoT-split (renew etc.) — только если НЕТ flat и НЕТ applyHot
        const hotCfg = (!useFlat && !ability.applyHot) ? hotConfig(ability.id) : null;
        const skipDirectHeal = !!(ability.applyHot && (
          ability.applyHot.hpPct != null || abilityFlatWeight(ability) === 0
        )) || (ability.id === 'soothing' && typeof actorHasJadeSerpent === 'function' && actorHasJadeSerpent(actor));
        if (hotCfg) {
          const direct = Math.max(1, Math.round(amount * (hotCfg.direct || 0.35)));
          let tick = Math.max(1, Math.round(amount * (hotCfg.tick || 0.25)));
          if (!Number.isFinite(tick) || tick < 1) tick = Math.max(1, Math.round(getEff(actor).atk * 0.05));
          const turns = PERIODIC_ROUNDS;
          const h = healUnit(target, direct, actor, {
            abilityId: ability.id, abilityName: ability.name, crit: healCrit,
          });
          applyStatus(target, {
            id: 'hot_' + ability.id, name: ability.name, icon: ability.icon || '🌿',
            turns, hot: tick, fromUid: actor.uid, periodic: true,
          });
          log(`${actor.name}: ${ability.name} → ${target.name} (${healCrit ? 'КРИТ ' : ''}+${fmt(h)}, период. леч. ${fmt(tick)}/р · ${turns}р)`, 'heal');
          toast(`${ability.name} на ${target.name} · ${turns}р`);
        } else {
          if (!skipDirectHeal) {
            const h = healUnit(target, amount, actor, {
              abilityId: ability.id, abilityName: ability.name, crit: healCrit,
            });
            log(`${actor.name}: ${ability.name} → ${target.name} (${healCrit ? 'КРИТ ' : ''}+${fmt(h)})`, 'heal');
          }
          if (ability.applyHot) {
            const ad = ability.applyHot;
            const turns = Number(ad.turns) || 5;
            const tick = ad.hpPct != null
              ? Math.max(1, Math.round(target.maxHp * Number(ad.hpPct)))
              : periodicTickFromFlat(actor, ad.flat || 0);
            applyStatus(target, {
              id: 'hot_' + ability.id, name: ad.name || ability.name, icon: ability.icon || '✨',
              turns, hot: tick, fromUid: actor.uid, periodic: true,
            });
            if (skipDirectHeal) {
              log(`${actor.name}: ${ability.name} → ${target.name} (период. леч. ${fmt(tick)}/р · ${turns}р)`, 'heal');
            } else {
              log(`${actor.name}: период. леч. ${ad.name || ability.name} ${fmt(tick)}/р · ${turns}р`, 'heal');
            }
          }
        }
        if (ability.id === 'riptide') {
          applyStatus(actor, { id: 'tidal_waves', name: 'Прилив', icon: '🌊', turns: 6, abilityCharges: 2 });
        }
        if (ability.healAmp && ability.nextHealCharges) {
          applyStatus(actor, {
            id: 'unleash_life', name: ability.name, icon: ability.icon || '✨',
            turns: 6, healAmp: Number(ability.healAmp), abilityCharges: Number(ability.nextHealCharges),
          });
        }
        break;
      }
      case 'heal_aoe': {
        const healAllies = friends.filter(f => !f.isPet);
        fxTargets = healAllies.length ? healAllies : friends.slice();
        let chainTargets = fxTargets.slice();
        if (ability.chainDecay != null || ability.chainPrimary) {
          const primary = (ability.chainPrimary && target && target.alive && target.side === actor.side && !target.isPet)
            ? target : null;
          let rest = chainTargets.filter(u => u.alive && (!primary || u.uid !== primary.uid));
          const injured = rest.filter(u => u.hp < u.maxHp).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
          const full = rest.filter(u => !injured.includes(u));
          chainTargets = (primary ? [primary] : []).concat(injured, full);
          if (!chainTargets.length) chainTargets = fxTargets.slice();
        }
        // FX после порядка прыжков: шаман → выбранный → самый раненый → …
        playSkillAnim(actor, ability, chainTargets);
        let chainMult = 1;
        for (const tt of chainTargets) {
          const useF = abilityFlatWeight(ability) != null;
          let amt = abilityHealRaw(actor, ability, tt, chainMult * (1 + lootHeal));
          // hm already partly in talent via abilityHealRaw; keep chain only
          for (const b of (actor.buffs || [])) {
            if (b && b.healAmp && b.abilityCharges > 0) {
              amt = Math.round(amt * (1 + Number(b.healAmp)));
              b.abilityCharges -= 1;
              if (b.abilityCharges <= 0) b.turns = 0;
              break;
            }
          }
          // Крит хила по каждой цели (крит-рейтинг кастера)
          let aoeHealCrit = false;
          {
            const rolled = rollOutgoingHealCrit(actor, ability, amt);
            amt = rolled.amount;
            aoeHealCrit = rolled.crit;
          }
          if (!(useF && abilityFlatWeight(ability) === 0 && ability.applyHot)) {
            const h = healUnit(tt, amt, actor, {
              abilityId: ability.id, abilityName: ability.name, crit: aoeHealCrit,
            });
            log(`${actor.name}: ${ability.name} → ${tt.name} (${aoeHealCrit ? 'КРИТ ' : ''}+${fmt(h)})`, 'heal');
          }
          if (ability.applyHot) {
            const ad = ability.applyHot;
            const tick = ad.hpPct != null
              ? Math.max(1, Math.round(tt.maxHp * Number(ad.hpPct)))
              : periodicTickFromFlat(actor, ad.flat || 0);
            applyStatus(tt, {
              id: 'hot_' + ability.id, name: ad.name || ability.name, icon: ability.icon || '🌿',
              turns: Number(ad.turns) || 5, hot: tick, fromUid: actor.uid, periodic: true,
            });
          }
          if ((ability.id === 'prayer' || ability.id === 'poh') && actor.specId === 'discipline') {
            applyAtonementBuff(tt, actor, 3);
          }
          if (ability.chainDecay != null) chainMult *= (1 - Number(ability.chainDecay));
        }
        if (ability.dmgReduce && ability.id === 'spirit_link') {
          if (typeof combat !== 'undefined' && combat) combat._spiritLinkHits = 0;
          for (const al of friends.filter(f => !f.isPet && f.alive)) {
            applyStatus(al, {
              id: 'spirit_link', name: ability.name, icon: ability.icon || '🔗',
              turns: Number(ability.buffTurns) || 3, dmgReduce: Number(ability.dmgReduce),
            });
          }
          equalizePartyHpByPct('каст');
        }
        break;
      }
      case 'shield': {
        // Default self_only; PW:S / Pain Supp / Guardian — ally_any; Щит небес — всем
        const partyShield = ability.id === 'heaven_shield' || !!ability.partyShield;
        let shieldTargets;
        if (partyShield) {
          shieldTargets = friends.filter(f => f && f.alive && !f.isPet);
          if (!shieldTargets.length) shieldTargets = [actor];
        } else {
          if (abilityTargetRule(ability) === 'self_only') target = actor;
          else {
            target = target || lowest(friends.filter(f => !f.isPet)) || actor;
            if (!target || target.side !== actor.side || target.isPet) target = actor;
          }
          shieldTargets = [target];
        }
        fxTargets = shieldTargets;
        playSkillAnim(actor, ability, fxTargets);
        for (const shT of shieldTargets) {
          let amount;
          let purifyBonus = 0;
          if (ability.id === 'elusive') {
            purifyBonus = Math.max(0, Math.round(actor.purifyCleared || 0));
            amount = abilityShieldRaw(actor, { flat: 30 }, shT) + purifyBonus;
            actor.purifyCleared = 0;
          } else {
            amount = abilityShieldRaw(actor, ability, shT);
          }
          if (actor.side === 'ally') {
            amount = Math.round(amount * masteryShieldMult(actor) * versHealMult(actor));
          }
          shT.shield += amount;
          if (ability.id === 'elusive') {
            log(`${actor.name}: ${ability.name} 🛡${fmt(amount)}` +
              (purifyBonus ? ` (база + ${fmt(purifyBonus)} из очищ. stagger)` : ' (база)'), 'heal');
          } else {
            log(`${actor.name}: ${ability.name} 🛡${fmt(amount)} → ${shT.name}`, 'heal');
          }
          if ((ability.id === 'shield' || ability.id === 'heaven_shield') && actor.specId === 'discipline') {
            applyAtonementBuff(shT, actor, 5);
          }
        }
        break;
      }
      case 'taunt': {
        fxTargets = foes.slice();
        playSkillAnim(actor, ability, fxTargets);
        for (const e of foes) {
          e.buffs.push({ id: 'taunt', name: 'Агро', icon: '🎯', turns: 3, forceTarget: actor.uid });
          // Snap threat well above current top so tank keeps pulls
          if (!e.threat) e.threat = {};
          const top = Math.max(0, ...Object.values(e.threat), 0);
          e.threat[actor.uid] = top + 12000 + Math.round(actor.maxHp * 0.12);
          if (typeof onRaidTaunt === 'function') onRaidTaunt(actor);
        }
        log(`${actor.name}: ${ability.name} — угроза захвачена`, 'player');
        toast('Провокация!');
        break;
      }
      case 'buff': {
        // Отладка: переключить режим основного питомца СТ ↔ АОЕ (1× за ход, freeAction)
        if (ability.id === 'debug_mode') {
          actor._debugUsedThisTurn = true;
          const pet = getMainPet(actor, true);
          if (!pet) {
            log(`${actor.name}: ${ability.name} — нет питомца`, 'system');
            break;
          }
          pet.attackMode = (pet.attackMode === 'aoe') ? 'st' : 'aoe';
          const modeRu = pet.attackMode === 'aoe' ? 'АОЕ' : 'СТ';
          log(`${actor.name}: ${ability.name} → режим питомца: ${modeRu}`, 'player');
          toast('Отладка: ' + modeRu);
          floatText(pet.uid, modeRu, 'buff');
          break;
        }
        // Воскрешение основного питомца
        if (ability.id === 'pet_rez') {
          playSkillAnim(actor, ability, [actor]);
          const key = mainPetKeyFor(actor.classId, actor.specId);
          let pet = getMainPet(actor, true);
          if (pet && (!pet.alive || pet.hp <= 0)) {
            pet.alive = true;
            pet.hp = Math.max(1, Math.round(pet.maxHp * 0.6));
            pet.shield = 0;
            pet.buffs = [];
            pet.attackMode = pet.attackMode || 'st';
            log(`${actor.name}: ${ability.name} → ${pet.name} (+${fmt(pet.hp)} HP)`, 'heal');
            toast('Питомец воскрешён');
            floatText(pet.uid, 'возрождён', 'heal');
          } else if (!pet && key) {
            pet = addPet(actor, key, null);
            if (pet) {
              pet.isMainPet = true;
              pet.attackMode = 'st';
              pet.hp = Math.max(1, Math.round(pet.maxHp * 0.6));
              log(`${actor.name}: ${ability.name} → ${pet.name}`, 'heal');
              toast('Питомец воскрешён');
            }
          } else {
            log(`${actor.name}: ${ability.name} — некого воскрешать`, 'system');
          }
          break;
        }
        let buffHost = actor;
        if (typeof abilityTargetRule === 'function' && abilityTargetRule(ability) === 'ally_any') {
          const allies = friends.filter(f => f && f.alive && !f.isPet);
          if (target && target.alive && target.side === actor.side && !target.isPet) buffHost = target;
          else buffHost = lowest(allies) || actor;
        }
        playSkillAnim(actor, ability, [buffHost]);
        const bTurns = Number(ability.buffTurns) || 3;
        if (ability.blockChanceAdd || ability.blockValueAdd) {
          applyStatus(actor, {
            id: 'shield_block_buff', name: ability.name, icon: ability.icon || '🧱', turns: bTurns,
            blockChanceAdd: Number(ability.blockChanceAdd) || 0,
            blockValueAdd: Number(ability.blockValueAdd) || 0,
          });
          log(`${actor.name}: ${ability.name} · блок ↑ · ${bTurns}х`, cls);
        }
        if (ability.dmgReduce && (
          ability.id === 'shield_wall' || ability.id === 'ardent' || ability.id === 'fort_brew'
          || ability.id === 'icebound' || ability.id === 'pain_supp'
          || ability.staggerBonus || Number(ability.dmgReduce) > 0
        )) {
          const drHost = ability.id === 'pain_supp' ? buffHost : actor;
          const drId = ability.id === 'icebound' ? 'icebound' : ('dr_' + ability.id);
          applyStatus(drHost, {
            id: drId, name: ability.name, icon: ability.icon || '🏰', turns: bTurns,
            dmgReduce: Number(ability.dmgReduce) || 0,
            staggerBonus: Number(ability.staggerBonus) || 0,
          });
          log(`${actor.name}: ${ability.name} → ${drHost.name} −${Math.round((Number(ability.dmgReduce)||0)*100)}% · ${bTurns}х`, cls);
        }
        if (ability.id === 'dark_soul') {
          if (actor.specId === 'destruction') {
            for (const p of (combat?.pets || []).filter(x =>
              x.ownerUid === actor.uid && x.petKey === 'imp' && x.alive
            )) {
              p._holstered = true;
              p.alive = false;
              log(`${p.name} уступает место инферналу`, 'system');
            }
            if (typeof addPet === 'function') addPet(actor, 'infernal', 2);
            log(`${actor.name}: ${ability.name} — инфернал на 2 хода`, cls);
          } else {
            for (const p of (combat?.pets || []).filter(x =>
              x.alive && x.ownerUid === actor.uid && x.petKey !== 'imp_boss'
            )) {
              if (p.petTurnsLeft != null) p.petTurnsLeft += 3;
            }
            log(`${actor.name}: ${ability.name} — срочным демонам +3 хода (вечные без таймера)`, cls);
          }
        }
        // sot_r теперь type:damage (см. case damage) — legacy buff-ветка не нужна
        if (ability.armorMod && !ability.armorStacksMax) {
          applyStatus(actor, {
            id: 'armor_' + ability.id, name: ability.name, icon: ability.icon || '🛡️', turns: bTurns,
            armorMod: Number(ability.armorMod) || 0,
          });
          log(`${actor.name}: ${ability.name} +${Math.round((Number(ability.armorMod)||0)*100)}% брони`, cls);
        }
        if (ability.critMod) {
          applyStatus(actor, {
            id: 'crit_' + ability.id, name: ability.name, icon: ability.icon || '😇', turns: bTurns,
            critMod: Number(ability.critMod) || 0,
          });
          log(`${actor.name}: ${ability.name} +${Math.round((Number(ability.critMod)||0)*100)}% крит`, cls);
        }
        if (ability.atkMod) {
          applyStatus(actor, {
            id: 'atk_' + ability.id, name: ability.name, icon: ability.icon || '📜', turns: bTurns,
            atkMod: Number(ability.atkMod) || 0,
            petAtkMod: Number(ability.petAtkMod) || 0,
          });
          log(`${actor.name}: ${ability.name} +${Math.round((Number(ability.atkMod)||0)*100)}% атаки` +
            (ability.petAtkMod ? ` / петам +${Math.round(Number(ability.petAtkMod)*100)}%` : ''), cls);
          if (ability.petAtkMod && combat?.pets) {
            for (const p of combat.pets.filter(x => x.alive && x.ownerUid === actor.uid)) {
              p.atk = Math.round(p.atk * (1 + Number(ability.petAtkMod)));
            }
          }
        }
        if (ability.id === 'plasma_cutter' || ability.id === 'call_siege_walker') {
          const pet = typeof getMainPet === 'function' ? getMainPet(actor, false) : null;
          if (!pet) {
            log(`${actor.name}: ${ability.name} — нет живого питомца`, 'system');
          } else {
            const turns = Number(ability.buffTurns) || 4;
            const pct = Number(ability.petAtkMod) || 0;
            applyStatus(pet, {
              id: ability.id, name: ability.name, icon: ability.icon || '⚙️',
              turns, atkMod: pct,
              tip: ability.id === 'call_siege_walker'
                ? 'Область и +' + Math.round(pct * 100) + '% урона'
                : '+' + Math.round(pct * 100) + '% урона',
            });
            log(`${actor.name}: ${ability.name} → ${pet.name} (+${Math.round(pct * 100)}%` +
              (ability.id === 'call_siege_walker' ? ' · область' : '') +
              ` · ${turns}х)`, cls);
          }
        }
        if (ability.id === 'bot_overdrive') {
          applyStatus(actor, {
            id: 'bot_overdrive', name: ability.name, icon: ability.icon || '⏩',
            turns: Number(ability.buffTurns) || 4, pairMult: 4,
            tip: 'Пар с атаки пета ×4 (5 → 20)',
          });
          log(`${actor.name}: ${ability.name} — пар пета ×4 · 4х`, cls);
        }
        if (ability.maxHpPct) {
          const extra = {};
          if (ability.healTakenMod) extra.healTakenMod = Number(ability.healTakenMod);
          grantTempHp(actor, ability, Math.round(actor.maxHp * Number(ability.maxHpPct)), bTurns, ability.icon || '❤️', extra);
        }
        if (ability.grantBlock) {
          applyStatus(actor, {
            id: 'shield_block_buff', name: 'Блок щитом', icon: '🧱', turns: bTurns,
            blockChanceAdd: 0.5, blockValueAdd: 0.2,
          });
        }
        // Special buffs that aren't just "+ATK"
        // sot_r / debug_mode / pet_rez — уже обработаны выше, без legacy +ATK от power=1
        if (ability.healAmp) {
          applyStatus(actor, {
            id: 'healamp_' + ability.id, name: ability.name, icon: ability.icon || '☕',
            turns: bTurns, healAmp: Number(ability.healAmp),
            abilityCharges: Number(ability.nextHealCharges) || 9,
          });
          log(`${actor.name}: ${ability.name} +${Math.round(Number(ability.healAmp) * 100)}% след. хилы · ${bTurns}х`, cls);
        }
        if (ability.id === 'thunder_focus') {
          applyStatus(actor, {
            id: 'tea_free', name: 'Громовой чай', icon: '☕', turns: 99, abilityCharges: 2,
            tip: 'Следующие 2 исцеления — 0 маны',
          });
          log(`${actor.name}: ${ability.name} — 2 хила без маны`, cls);
        }
        const rebalanceBuff = !!(ability.critMod || ability.atkMod || ability.dmgReduce || ability.maxHpPct
          || ability.blockChanceAdd || ability.blockValueAdd || ability.armorMod || ability.grantBlock
          || ability.healAmp
          || ability.id === 'sot_r' || ability.id === 'debug_mode' || ability.id === 'pet_rez'
          || ability.id === 'avenging' || ability.id === 'inquisition'
          || ability.id === 'dark_soul' || ability.id === 'dark_trans' || ability.id === 'horn'
          || ability.id === 'energizing' || ability.id === 'evocation'
          || ability.id === 'thunder_focus'
          || ability.id === 'plasma_cutter' || ability.id === 'bot_overdrive'
          || ability.id === 'call_siege_walker' || ability.petAtkMod);
        if (rebalanceBuff) {
          // флаги уже применены — без legacy +ATK / abilityCharges
        } else if ((ability.id === 'last_stand' || ability.id === 'vampiric_blood') && !ability.maxHpPct) {
          grantTempHp(actor, ability, Math.round(actor.maxHp * power), 3, ability.icon || '⬆️', {
            atkMod: ability.id === 'vampiric_blood' ? 0.1 : 0,
          });
        } else if (ability.id === 'evocation') {
          const gain = Math.round(actor.res.primary.max * 0.4);
          actor.res.primary.current = clamp(actor.res.primary.current + gain, 0, actor.res.primary.max);
          log(`${actor.name}: ${ability.name} (+${gain} маны)`, cls);
          toast(`+${gain} маны`);
        } else if (ability.id === 'prem' && actor.res.secondary?.type === 'combo') {
          // +2 already applied via genSec in payAbility — only log
          log(`${actor.name}: ${ability.name} (+2 к серии)`, cls);
          toast('+2 к серии');
        } else if (ability.id === 'elusive') {
          log(`${actor.name}: ${ability.name} (+${Math.round(Math.max(0.15, power) * 100)}% DEF)`, cls);
          toast(ability.name + ': +DEF');
        } else if (ability.id === 'metamorphosis') {
          // Demo form: strong ATK + slight toughness for 4 turns
          applyStatus(actor, {
            id: 'metamorphosis', name: 'Метаморфоза', icon: '👹', turns: 4,
            atkMod: power, defMod: 0.15,
          });
          log(`${actor.name}: Метаморфоза — +${Math.round(power * 100)}% атаки, +15% защиты (4 хода)`, cls);
          toast(`Метаморфоза: +${Math.round(power * 100)}% атаки · 4 хода`);
        } else if (ability.abilityCharges) {
          // Безрассудство и т.п.: +ATK на следующие N ударов (не по ходам)
          const charges = Math.max(1, Number(ability.abilityCharges) || 2);
          const pct = Math.round(power * 100);
          applyStatus(actor, {
            id: ability.id, name: ability.name, icon: ability.icon || '⬆️',
            turns: 99, atkMod: power, abilityCharges: charges,
            tip: `+${pct}% атаки · следующие ${charges} удара`,
          });
          log(`${actor.name}: ${ability.name} (+${pct}% атаки · след. ${charges} удара)`, cls);
          toast(`${ability.name}: +${pct}% · ${charges} удара`);
        } else if (!(
          ability.critMod || ability.atkMod || ability.dmgReduce || ability.maxHpPct
          || ability.blockChanceAdd || ability.blockValueAdd || ability.armorMod || ability.grantBlock
        )) {
          // Пустой баф больше не даёт +100% атаки. Только явный atkMod.
          log(`${actor.name}: ${ability.name}`, cls);
        }
        break;
      }
      case 'dot': {
        // Player must click target; enemies may auto-pick
        if ((!target || !target.alive) && actor.side === 'enemy') target = lowest(foes);
        if (!target || !target.alive) {
          log(ability.name + ': нужна цель (клик по врагу)', 'system');
          toast('Нужна цель');
          break;
        }
        if (!target.buffs) target.buffs = [];
        fxTargets = [target];
        playSkillAnim(actor, ability, fxTargets);
        const school = abilityDamageSchool(actor, ability);
        const dotCtx = {
          type: 'dot', isDot: true, abilityId: ability.id, abilityName: ability.name, school,
          isFinisher: FINISHER_IDS.has(ability.id),
        };
        // Snapshot mastery into DoT ticks (crit only on initial hit)
        let tick;
        if (ability.flat != null && Number.isFinite(Number(ability.flat))) {
          tick = periodicTickFromFlat(actor, ability.flat);
        } else {
          tick = Math.max(1, Math.round(eff.atk * power * 0.4));
        }
        if (actor.side === 'ally' && !actor.isPet) {
          tick = Math.round(tick * masteryDmgMult(actor, { ...dotCtx, skipCrit: true }));
        } else if (actor.isPet && actor.ownerUid) {
          const owner = run?.party?.find(p => p.uid === actor.ownerUid);
          tick = Math.round(tick * masteryPetMult(owner));
        }
        if (!Number.isFinite(tick) || tick < 1) tick = Math.max(1, Math.round(eff.atk * 0.05));
        if (ability.applyDot && ability.applyDot.flat != null) {
          tick = periodicTickFromFlat(actor, ability.applyDot.flat);
          if (actor.side === 'ally' && !actor.isPet) {
            tick = Math.round(tick * masteryDmgMult(actor, { ...dotCtx, skipCrit: true }));
          }
        }
        if (ability.applyDot && ability.applyDot.flat != null) {
          tick = scaleDotByComboIfFinisher(actor, ability, tick);
        } else {
          tick = scaleByComboIfFinisher(actor, ability, tick);
        }
        const turns = resolveDotTurns(ability);
        applyStatus(target, {
          id: 'dot_' + ability.id, name: ability.name, icon: ability.icon || '☠️',
          turns, dot: tick, fromUid: actor.uid, periodic: true, school,
        });
        const skipApply = !!(ability.applyDot && !(ability.flat != null && Number(ability.flat) > 0));
        if (!skipApply) {
          let hitRaw;
          if (ability.applyDot) {
            hitRaw = abilityDamageRaw(actor, ability);
          } else if (ability.flat != null && Number.isFinite(Number(ability.flat))) {
            hitRaw = abilityDamageRaw(actor, { flat: Number(ability.flat) * 0.5 });
          } else {
            hitRaw = Math.max(1, Math.round(eff.atk * power * 0.5));
          }
          hitRaw = scaleByComboIfFinisher(actor, ability, hitRaw);
          const dealt = dealDmg(target, hitRaw, actor, dotCtx);
          log(`${actor.name}: ${ability.name} → ${target.name} (−${fmt(dealt)}, период. ${fmt(tick)}/р · ${turns}р)`, cls);
        } else {
          log(`${actor.name}: ${ability.name} → ${target.name} (период. ${fmt(tick)}/р · ${turns}р)`, cls);
        }
        toast(`${ability.name} на ${target.name} · ${turns}р`);
        try { consumeNextAoe(actor, ability, target, foes, school, cls); } catch (e) { console.error(e); }
        break;
      }
      case 'debuff': {
        const turns = Number(ability.buffTurns) || 3;
        if (ability.id === 'havoc') {
          const marked = [];
          if (target && target.alive && target.side !== actor.side) marked.push(target);
          for (const e of foes) {
            if (marked.length >= 2) break;
            if (!e.alive || marked.some(m => m.uid === e.uid)) continue;
            marked.push(e);
          }
          for (const e of marked) {
            applyStatus(e, {
              id: 'havoc_mark', name: 'Хаос', icon: ability.icon || '🎯',
              turns, fromUid: actor.uid,
            });
          }
          log(`${actor.name}: ${ability.name} — метка на ${marked.map(m => m.name).join(', ') || 'никого'} · ${turns}х`, cls);
          toast('Хаос: метка');
          break;
        }
        if (ability.enemyDmgMod != null || ability.id === 'demo_shout') {
          const mod = Number(ability.enemyDmgMod != null ? ability.enemyDmgMod : power) || 0.15;
          fxTargets = foes.slice();
          playSkillAnim(actor, ability, fxTargets);
          for (const e of foes) {
            if (!e.alive) continue;
            applyStatus(e, {
              id: 'deb_' + ability.id, name: ability.name, icon: ability.icon || '😨',
              turns, atkMod: -Math.abs(mod),
            });
          }
          log(`${actor.name}: ${ability.name} — враги −${Math.round(Math.abs(mod)*100)}% · ${turns}х`, cls);
          break;
        }
        target = target || pick(foes);
        if (!target) return;
        fxTargets = [target];
        playSkillAnim(actor, ability, fxTargets);
        applyStatus(target, {
          id: 'deb_' + ability.id, name: ability.name, icon: ability.icon || '⬇️',
          turns, atkMod: -Math.abs(power), defMod: -0.1,
          fromUid: actor.uid,
        });
        log(`${actor.name}: ${ability.name} → ${target.name} (−${Math.round(Math.abs(power) * 100)}% атаки)`, cls);
        break;
      }
      case 'summon': {
        playSkillAnim(actor, ability, []);
        if (actor.side === 'enemy' && combat) {
          const m = scaleEnemy(pick(ENEMIES.trash), run.keyLevel, false, false);
          m.name = 'Слуга'; m.maxHp = Math.round(m.maxHp * 0.65); m.hp = m.maxHp;
          combat.enemies.push(m);
          log(actor.name + ' призывает слугу', 'enemy');
        } else if (actor.side === 'ally' && combat) {
          const list = PET_SUMMONS[ability.id] || [{ def: 'imp', n: 1, turns: 3 }];
          for (const s of list) {
            for (let i = 0; i < (s.n || 1); i++) addPet(actor, s.def, s.turns ?? 3);
          }
        }
        break;
      }
      default:
        // purifying by id if type not cleanse
        if (ability.id === 'purifying') {
          playSkillAnim(actor, ability, [actor]);
          const before = actor.stagger || 0;
          const pct = ability.purifyPct != null ? Number(ability.purifyPct) : 1;
          const cleared = before > 0 ? Math.max(1, Math.round(before * Math.min(1, pct))) : 0;
          actor.stagger = Math.max(0, before - cleared);
          if (cleared > 0) actor.purifyCleared = (actor.purifyCleared || 0) + cleared;
          log(`${actor.name}: ${ability.name} — −${fmt(cleared)} шат`, 'heal');
          break;
        }
        playSkillAnim(actor, ability, target ? [target] : []);
        break;
    }

    // Spells that summon pets on top of their main effect (Hand of Gul'dan, Shadowfiend, etc.)
    if (actor.side === 'ally' && combat && PET_SUMMONS[ability.id] && ability.type !== 'summon') {
      for (const s of PET_SUMMONS[ability.id]) {
        for (let i = 0; i < (s.n || 1); i++) addPet(actor, s.def, s.turns ?? 3);
      }
    }
    // Dark Transformation — buff owned ghoul
    if (ability.id === 'dark_trans' && actor.side === 'ally') {
      for (const p of petsOf(actor)) {
        applyStatus(p, { id: 'dark_trans', name: 'Тёмное превращение', icon: '👹', turns: 3, atkMod: 0.35 });
        log(`${p.name} усилен!`, 'player');
      }
    }
    // Bestial Wrath — also buff pet
    if (ability.id === 'bestial' && actor.side === 'ally') {
      for (const p of petsOf(actor)) {
        applyStatus(p, { id: 'bestial', name: 'Звериный гнев', icon: '😤', turns: 3, atkMod: 0.3 });
      }
    }
    // Felstorm — pet AOE if felguard present
    if (ability.id === 'felstorm' && actor.side === 'ally') {
      const pets = petsOf(actor);
      const pet = pets.find(p => p.petKey === 'felguard') || pets[0];
      if (pet && foes.length) {
        playSkillAnim(pet, ability, foes);
        for (const t of foes.slice()) {
          const d = dealDmg(t, Math.round(getEff(pet).atk * 1.05), pet, {
            type: 'aoe', isAoe: true, abilityId: 'felstorm', abilityName: ability.name || 'Буря Скверны', isPet: true,
          });
          log(`${pet.name}: Буря Скверны → ${t.name} (−${fmt(d)})`, 'player');
        }
      }
    }

    // handle kick by id even if type is debuff
    if (INTERRUPT_IDS.has(ability.id) && ability.type !== 'interrupt') {
      const t = target || foes.find(e => e.casting);
      if (t?.casting) interruptCast(t, actor);
    }

    // Self-buffs from ability data (Вихрь → «Широкий размах»)
    if (ability.grantSelfBuff && actor.alive) {
      const g = ability.grantSelfBuff;
      const stacks = Math.max(1, Number(g.stacks) || 1);
      applyStatus(actor, {
        id: g.id,
        name: g.name || ability.name,
        icon: g.icon || ability.icon || '✨',
        turns: Math.max(1, Number(g.turns) || 99),
        stacks,
        tip: g.tip || '',
      });
      log(`${actor.name}: +${g.name || g.id}${stacks > 1 ? ' ×' + stacks : ''}`, cls);
      if (g.id === 'wide_sweep') floatText(actor.uid, 'широкий размах', 'buff');
    }

    // Списание зарядов «следующие N способностей» (не для самого баффа, который их даёт)
    if (!ability.abilityCharges && actor.buffs && actor.buffs.length) {
      let changed = false;
      for (const b of actor.buffs) {
        if (b.abilityCharges == null) continue;
        b.abilityCharges = Number(b.abilityCharges) - 1;
        changed = true;
      }
      if (changed) {
        actor.buffs = actor.buffs.filter(b => b.abilityCharges == null || b.abilityCharges > 0);
      }
    }

    // freeAction: ход игрока не заканчивается (afterAction смотрит флаг)
    if (ability.id === 'soothing' && actor.side === 'ally') {
      const hasSerpent = typeof actorHasJadeSerpent === 'function'
        ? actorHasJadeSerpent(actor)
        : !!(combat && combat.pets && combat.pets.some(p =>
          p.alive && p.ownerUid === actor.uid && p.petKey === 'jade_serpent'));
      if (hasSerpent && target && target.side === actor.side && !target.isPet) {
        actor._sootheUid = target.uid;
        combat._keepPlayerTurn = true;
        log(`${actor.name}: туман на ${target.name} — змея хилит после каждого хода`, 'heal');
      }
    }
    if (ability.freeAction && actor.side === 'ally' && !actor.isPet) {
      combat._keepPlayerTurn = true;
    }
  }

  /**
   * Изобретатель: в конце хода — шанс (=% иск.) «Гений инженерии»:
   * основной питомец бьёт с +200% урона (×3) в режиме СТ/АОЕ.
   */
  function tryTinkererGenius(actor) {
    if (!actor || !combat || actor.classId !== 'engineer' || actor.specId !== 'tinkerer') return;
    if (!actor.alive) return;
    const pet = getMainPet(actor, false);
    if (!pet) return;
    const chance = masteryPct(actor); // база 0 при 0 рейтинга; при 120 → 0.12
    if (!(chance > 0) || Math.random() >= chance) return;
    const foes = living('enemy');
    if (!foes.length) return;
    applyStatus(pet, {
      id: 'genius_tune',
      name: 'Гений инженерии',
      icon: '⚙️',
      turns: 1,
      tip: '+200% урон',
    });
    const raw = Math.max(1, Math.round(getEff(pet).atk * 1.05 * 3));
    const aoe = pet.attackMode === 'aoe';
    if (aoe) {
      let total = 0;
      for (const e of foes.slice()) {
        if (!e.alive) continue;
        total += dealDmg(e, raw, pet, {
          type: 'aoe', isAoe: true, isPet: true,
          abilityName: 'Гений инженерии', abilityId: 'genius_tune',
        });
      }
      log(`${actor.name}: Гений инженерии → ${pet.name} АОЕ (−${fmt(total)} сумм.)`, 'player');
    } else {
      const t = lowest(foes);
      const d = dealDmg(t, raw, pet, {
        type: 'damage', isPet: true,
        abilityName: 'Гений инженерии', abilityId: 'genius_tune',
      });
      log(`${actor.name}: Гений инженерии → ${pet.name} → ${t.name} (−${fmt(d)})`, 'player');
    }
    toast('⚙️ Гений инженерии!');
    floatText(pet.uid, 'гений!', 'buff');
  }


  function consumeNextAoe(actor, ability, primary, foes, school, cls) {
    if (!actor || !ability || ability.id === 'slice') return;
    const b = (actor.buffs || []).find(x => x && x.id === 'next_aoe' && (Number(x.stacks) || 0) > 0);
    if (!b) return;
    if (ability.type === 'aoe' || ability.type === 'heal_aoe') {
      actor.buffs = (actor.buffs || []).filter(x => !x || x.id !== 'next_aoe');
      return;
    }
    let raw = abilityDamageRaw(actor, ability);
    raw = scaleByComboIfFinisher(actor, ability, raw);
    const ad = ability.applyDot;
    let splashTick = 0;
    let turns = 4;
    if (ad) {
      splashTick = periodicTickFromFlat(actor, ad.flat || 0);
      splashTick = Math.max(1, Math.round(splashTick * masteryDmgMult(actor, {
        isDot: true, type: 'dot', abilityId: ad.id || ability.id,
        school: ad.school || school || 'physical',
      })));
      splashTick = scaleDotByComboIfFinisher(actor, ability, splashTick);
      turns = Math.max(1, Number(ad.turns) || 4);
    }
    for (const e of (foes || [])) {
      if (!e.alive || (primary && e.uid === primary.uid)) continue;
      const sd = dealDmg(e, raw, actor, {
        type: 'aoe', isAoe: true, abilityId: ability.id,
        abilityName: ability.name + ' (нарезка)', school,
      });
      if (sd) log(`${actor.name}: ${ability.name} (нарезка) → ${e.name} (−${fmt(sd)})`, cls || 'player');
      if (splashTick > 0 && e.alive && ad) {
        applyStatus(e, {
          id: 'dot_' + (ad.id || ability.id),
          name: ad.name || ability.name,
          icon: ad.icon || '🩸',
          turns,
          dot: splashTick,
          fromUid: actor.uid,
          periodic: true,
          school: ad.school || school || 'physical',
        });
      }
    }
    actor.buffs = (actor.buffs || []).filter(x => !x || x.id !== 'next_aoe');
    log(`${actor.name}: «Нарезка» израсходована`, 'system');
  }

  function applyArmorStack(unit, ability) {
    if (!unit || !ability || !ability.armorMod) return;
    const turns = Number(ability.buffTurns) || 3;
    const maxS = Number(ability.armorStacksMax) || 99;
    const stackId = 'armor_' + (ability.id || 'x');
    const add = Number(ability.armorMod) || 0;
    if (!unit.buffs) unit.buffs = [];
    const existing = unit.buffs.find(b => b && b.id === stackId);
    if (existing) {
      const cur = Math.max(1, Number(existing.stacks) || 1);
      if (cur >= maxS) {
        existing.turns = turns;
        log(unit.name + ': броня обновлена (' + cur + '×)', 'system');
        return;
      }
      existing.stacks = cur + 1;
      existing.armorMod = add * existing.stacks;
      existing.turns = turns;
      existing.name = 'Броня · ' + (ability.name || '') + ' ×' + existing.stacks;
      log(unit.name + ': броня ×' + existing.stacks + ' (+' + Math.round(existing.armorMod * 100) + '%) · ' + turns + 'х', 'system');
      return;
    }
    applyStatus(unit, {
      id: stackId,
      name: 'Броня' + (ability.name ? ' · ' + ability.name : '') + ' ×1',
      icon: '🛡️',
      turns,
      armorMod: add,
      stacks: 1,
      stackable: true,
      armorStacksMax: maxS,
    });
    log(unit.name + ': +' + Math.round(add * 100) + '% брони · ' + turns + 'х', 'system');
  }

  function maybeMistweaverEcho(monk, dealt) {
    if (!monk || monk.classId !== 'monk' || monk.specId !== 'mistweaver' || !(dealt > 0)) return;
    if (monk.isPet) return;
    const amt = Math.max(1, Math.round(dealt * 0.7));
    const allies = typeof livingHeroes === 'function' ? livingHeroes() : (run.party || []).filter(p => p.alive && !p.isPet);
    for (const p of allies) {
      const has = (p.buffs || []).some(b => b && (
        b.id === 'hot_renewing' || (b.name && String(b.name).includes('Заживляющий'))
      ) && (b.turns == null || Number(b.turns) > 0));
      if (!has) continue;
      const h = healUnit(p, amt, monk, { abilityName: 'Заживляющий туман', noEcho: true });
      if (h) log(`${monk.name}: Заживляющий туман → ${p.name} (+${fmt(h)})`, 'heal');
    }
  }
  function countOwnAffDots(unit, caster) {
    if (!unit || !caster) return 0;
    const ids = { dot_agony: 1, dot_corruption: 1, dot_ua: 1 };
    let n = 0;
    for (const b of (unit.buffs || [])) {
      if (!b || (b.turns != null && !(Number(b.turns) > 0))) continue;
      if (b.fromUid && b.fromUid !== caster.uid) continue;
      const id = String(b.id || '');
      if (ids[id] || /агония|порча|нестабильн/i.test(String(b.name || ''))) n++;
    }
    return n;
  }
  function addRunicPower(actor, n) {
    if (!actor || !actor.res || !actor.res.secondary || actor.res.secondary.type !== 'runic_power') return;
    const add = Math.round(Number(n) || 0);
    if (!(add > 0)) return;
    actor.res.secondary.current = clamp(actor.res.secondary.current + add, 0, actor.res.secondary.max);
    try { pulseResourceGain(actor.uid, '+' + add); } catch (_) {}
  }
  function unitHasOwnDnd(unit, caster) {
    if (!unit || !caster) return false;
    return (unit.buffs || []).some(b => b && b.id === 'dot_dnd' && b.fromUid === caster.uid
      && (b.turns == null || Number(b.turns) > 0));
  }
  function noteTakenDamage(unit, d) {
    if (!unit || !(d > 0)) return;
    unit._takenByRound = unit._takenByRound || {};
    const rnd = (typeof combat !== 'undefined' && combat && combat.round != null) ? combat.round : 0;
    unit._takenByRound[rnd] = (unit._takenByRound[rnd] || 0) + d;
    const keys = Object.keys(unit._takenByRound);
    if (keys.length > 8) {
      keys.sort((a, b) => Number(a) - Number(b));
      keys.slice(0, keys.length - 6).forEach(k => { delete unit._takenByRound[k]; });
    }
  }
  function takenLastRounds(unit, n) {
    if (!unit || !unit._takenByRound) return 0;
    const rnd = (typeof combat !== 'undefined' && combat && combat.round != null) ? combat.round : 0;
    let s = 0;
    const span = Math.max(1, Number(n) || 2);
    for (let i = 0; i < span; i++) s += Number(unit._takenByRound[rnd - i]) || 0;
    return s;
  }
  function applyDeathStrikeHeal(actor) {
    if (!actor) return;
    const blood = actor.specId === 'blood';
    const pct = blood ? 0.15 : 0.10;
    const taken = takenLastRounds(actor, 2);
    const amt = Math.max(1, Math.round(actor.maxHp * pct + taken * 0.25));
    const h = healUnit(actor, amt, actor, { abilityId: 'death_strike', abilityName: 'Удар смерти' });
    if (h) log(`${actor.name}: Удар смерти лечит (+${fmt(h)})`, 'heal');
  }
  function dumpOutbreakPlague(actor) {
    const foes = actor.side === 'ally' ? living('enemy') : living('ally');
    let any = false;
    for (const e of foes) {
      if (!e || !e.alive) continue;
      const b = (e.buffs || []).find(x => x && x.id === 'dot_plague' && x.fromUid === actor.uid);
      if (!b || !(Number(b.dot) > 0)) continue;
      const left = Math.max(0, Number(b.turns) || 0);
      if (left <= 0) continue;
      const dump = Math.max(1, Math.round(Number(b.dot) * left));
      const d = dealDmg(e, dump, actor, {
        type: 'dot', isDot: true, abilityId: 'outbreak', abilityName: 'Вспышка болезни',
      });
      b.turns = 0;
      any = true;
      if (d) log(`${actor.name}: Вспышка болезни сбрасывает дот → ${e.name} (−${fmt(d)})`, 'player');
    }
    if (!any) log(`${actor.name}: Вспышка болезни — нечего сбрасывать`, 'system');
  }

  function grantTempHp(actor, ability, bonus, turns, icon, extra) {
    if (!actor || !(bonus > 0)) return;
    const id = ability.id + '_hp';
    const prev = (actor.buffs || []).find(b => b && (b.id === id || b.id === ability.id) && b.tempHp);
    if (prev) {
      prev.turns = turns;
      log(actor.name + ': ' + ability.name + ' — пул не суммируется, длительность обновлена', 'system');
      return;
    }
    actor.maxHp += bonus;
    actor.hp = clamp(actor.hp + bonus, 1, actor.maxHp);
    applyStatus(actor, Object.assign({
      id, name: ability.name, icon: icon || '❤️', turns, tempHp: bonus,
    }, extra || {}));
    log(`${actor.name}: ${ability.name} (+${fmt(bonus)} HP)`, actor.side === 'ally' ? 'player' : 'enemy');
  }

  function applyAtonementBuff(target, caster, turns) {
    if (!target || !target.alive || target.isPet) return;
    applyStatus(target, {
      id: 'atonement',
      name: 'Искупление',
      icon: '✨',
      turns: Math.max(1, Number(turns) || 3),
      fromUid: caster && caster.uid,
    });
    log((caster && caster.name ? caster.name + ': ' : '') + 'Искупление → ' + target.name + ' · ' + turns + 'р', 'heal');
  }

  function maybeFeedAtonement(attacker, dealt, ctx) {
    if (!(dealt > 0) || !attacker || !run) return;
    if (ctx && ctx.isHavocEcho) return;
    let owner = attacker;
    let fromPet = false;
    if (attacker.isPet && attacker.ownerUid) {
      owner = (run.party || []).find(p => p.uid === attacker.ownerUid);
      fromPet = true;
    }
    if (!owner || owner.classId !== 'priest' || owner.specId !== 'discipline') return;
    const abId = ctx && ctx.abilityId;
    const abName = ctx && ctx.abilityName;
    const feedIds = abId === 'smite' || abId === 'holy_fire' || abId === 'penance';
    const feedName = abName === 'Священный огонь' || abName === 'Кара' || abName === 'Исповедь';
    if (!fromPet && !feedIds && !feedName) return;
    const carriers = (run.party || []).filter(p =>
      p && p.alive && !p.isPet && (p.buffs || []).some(b => b && b.id === 'atonement' && (b.turns == null || b.turns > 0))
    );
    if (!carriers.length) return;
    const amt = Math.max(1, Math.round(dealt * 0.55));
    for (const c of carriers) {
      const h = healUnit(c, amt, owner, { abilityName: 'Искупление', noEcho: true });
      if (h > 0) log(`${owner.name}: Искупление → ${c.name} (+${fmt(h)})`, 'heal');
    }
  }

  function maybeHavocCleave(attacker, primary, dealt, ctx) {
    if (!(dealt > 0) || !attacker || !primary || !combat) return;
    if (ctx && (ctx.isHavocEcho || ctx.isDot)) return;
    if (attacker.isPet) return;
    const marks = living('enemy').filter(e =>
      e && e.alive && e.uid !== primary.uid
      && (e.buffs || []).some(b => b && b.id === 'havoc_mark' && b.fromUid === attacker.uid)
    );
    if (!marks.length) return;
    for (const e of marks) {
      const echo = Math.max(1, Math.round(dealt * 0.4));
      const d = dealDmg(e, echo, attacker, {
        type: ctx && ctx.type || 'damage',
        abilityId: ctx && ctx.abilityId,
        abilityName: 'Хаос',
        school: ctx && ctx.school,
        isHavocEcho: true,
        skipCrit: true,
      });
      if (d) log(`${attacker.name}: Хаос → ${e.name} (−${fmt(d)})`, 'player');
    }
  }

