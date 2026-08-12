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

    payAbility(actor, ability);
    // Fury mastery stacks: after paying cost (cost>0 = rage spender)
    try { applyFuryMasteryStacks(actor, ability); } catch (e) { console.error(e); }
    if (ability.maxCharges) {
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
    const lootAtk = (run.loot || []).reduce((s, i) => s + (i.atkMult || 0), 0);
    if (lootAtk && actor.side === 'ally') power *= (1 + lootAtk);

    // finisher scaling
    // Combo finishers scale with spent points; fixed costSec (HP/chi/shards) keep base power
    if (FINISHER_IDS.has(ability.id) && actor._spentSec > 0 && actor.res?.secondary?.type === 'combo') {
      power *= (0.65 + actor._spentSec * 0.18);
    }

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
        const school = abilityDamageSchool(actor, ability);
        const dmgCtx = {
          type: 'damage', abilityId: ability.id, abilityName: ability.name, school,
          isFinisher: FINISHER_IDS.has(ability.id),
        };
        const hits = Math.max(1, Number(ability.hits) || 1);
        let totalDealt = 0;
        for (let hi = 0; hi < hits; hi++) {
          if (!target.alive) break;
          let dmg = abilityDamageRaw(actor, ability);
          if (te.execute && target.hp / target.maxHp <= 0.35) dmg = Math.round(dmg * te.execute);
          totalDealt += dealDmg(target, dmg, actor, dmgCtx);
        }
        const hitNote = hits > 1 ? ` ×${hits}` : '';
        log(`${actor.name}: ${ability.name} → ${target.name} (−${fmt(totalDealt)}${hitNote})`, cls);
        // Правосудие: доп. урон целям под «Освящение» (доля от нанесённого Правосудия)
        if (ability.judgmentConsecrateSplash != null && totalDealt > 0) {
          const splashFrac = Number(ability.judgmentConsecrateSplash) || 0;
          if (splashFrac > 0) {
            const splashRaw = Math.max(1, Math.round(totalDealt * splashFrac));
            for (const e of foes) {
              if (!e.alive || e.uid === target.uid) continue;
              const hasCons = (e.buffs || []).some(b =>
                b && (b.id === 'dot_consecrate' || (b.name && String(b.name).includes('Освящение')))
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
          : (ability.id === 'death_strike' ? 0.25 : (ability.id === 'bt' ? 0.1 : 0));
        if (ls > 0) {
          healUnit(actor, Math.round(totalDealt * ls), actor, {
            abilityId: ability.id, abilityName: ability.name || 'Вампиризм', lifesteal: true,
          });
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
        }
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
        let totalAll = 0;
        const order = (ability.id === 'avengers' && primary)
          ? [primary].concat(foes.filter(e => e.uid !== primary.uid))
          : foes.slice();
        order.forEach((enemy, idx) => {
          if (!enemy?.alive) return;
          let fall = 1;
          if (ability.aoeBounce != null && idx > 0) fall = Math.max(0.15, 1 - Number(ability.aoeBounce) * idx);
          let total = 0;
          if (!hasFlatZero) {
            for (let hi = 0; hi < hits; hi++) {
              if (!enemy.alive) break;
              total += dealDmg(enemy, abilityDamageRaw(actor, ability, mult * fall), actor, aoeCtx);
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
        if (ability.holyShock && target && target.side !== actor.side && target.alive) {
          playSkillAnim(actor, ability, [target]);
          // Урон = вес скилла (27т), не хардкод 12
          const shockFlat = abilityFlatWeight(ability);
          let dealt = abilityDamageRaw(actor, { flat: shockFlat != null ? shockFlat : 27 });
          if (Math.random() < critChance(actor) + (Number(ability.critBonus) || 0)) dealt = Math.round(dealt * critMult(actor));
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
          const h = healUnit(target, amount, actor, {
            abilityId: ability.id, abilityName: ability.name, crit: healCrit,
          });
          log(`${actor.name}: ${ability.name} → ${target.name} (${healCrit ? 'КРИТ ' : ''}+${fmt(h)})`, 'heal');
          if (ability.applyHot) {
            const ad = ability.applyHot;
            const tick = periodicTickFromFlat(actor, ad.flat || 0);
            const turns = Number(ad.turns) || 5;
            applyStatus(target, {
              id: 'hot_' + ability.id, name: ad.name || ability.name, icon: ability.icon || '✨',
              turns, hot: tick, fromUid: actor.uid, periodic: true,
            });
            log(`${actor.name}: период. леч. ${ad.name || ability.name} ${fmt(tick)}/р · ${turns}р`, 'heal');
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
            const tick = periodicTickFromFlat(actor, ad.flat || 0);
            applyStatus(tt, {
              id: 'hot_' + ability.id, name: ad.name || ability.name, icon: ability.icon || '🌿',
              turns: Number(ad.turns) || 5, hot: tick, fromUid: actor.uid, periodic: true,
            });
          }
          if (ability.chainDecay != null) chainMult *= (1 - Number(ability.chainDecay));
        }
        if (ability.dmgReduce && ability.id === 'spirit_link') {
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
        // Default self_only; PW:S / Pain Supp / Guardian — ally_any
        if (abilityTargetRule(ability) === 'self_only') target = actor;
        else {
          target = target || lowest(friends.filter(f => !f.isPet)) || actor;
          if (!target || target.side !== actor.side || target.isPet) target = actor;
        }
        fxTargets = [target];
        playSkillAnim(actor, ability, fxTargets);
        let amount;
        let purifyBonus = 0;
        if (ability.id === 'elusive') {
          target = actor;
          // база 30т (от атаки) + объём stagger, очищенный «Очищающим отваром»
          purifyBonus = Math.max(0, Math.round(actor.purifyCleared || 0));
          amount = abilityShieldRaw(actor, { flat: 30 }, target) + purifyBonus;
          actor.purifyCleared = 0;
        } else {
          amount = abilityShieldRaw(actor, ability, target);
        }
        if (actor.side === 'ally') {
          amount = Math.round(amount * masteryShieldMult(actor) * versHealMult(actor));
        }
        target.shield += amount;
        if (ability.id === 'elusive') {
          log(`${actor.name}: ${ability.name} 🛡${fmt(amount)}` +
            (purifyBonus ? ` (база + ${fmt(purifyBonus)} из очищ. stagger)` : ' (база)'), 'heal');
        } else {
          log(`${actor.name}: ${ability.name} 🛡${fmt(amount)} → ${target.name}`, 'heal');
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
        playSkillAnim(actor, ability, [actor]);
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
          || ability.id === 'icebound' || ability.staggerBonus || Number(ability.dmgReduce) > 0
        )) {
          applyStatus(actor, {
            id: 'dr_' + ability.id, name: ability.name, icon: ability.icon || '🏰', turns: bTurns,
            dmgReduce: Number(ability.dmgReduce) || 0,
            staggerBonus: Number(ability.staggerBonus) || 0,
          });
          log(`${actor.name}: ${ability.name} −${Math.round((Number(ability.dmgReduce)||0)*100)}% · ${bTurns}х`, cls);
        }
        if (ability.id === 'dark_soul') {
          // не на Главаря бесов
          for (const p of (combat?.pets || []).filter(x =>
            x.alive && x.ownerUid === actor.uid && x.petKey !== 'imp_boss'
          )) {
            if (p.petTurnsLeft != null) p.petTurnsLeft += 3;
            else p.petTurnsLeft = 3;
          }
          log(`${actor.name}: ${ability.name} — бесы/демоны +3 хода (не главарь)`, cls);
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
        if (ability.maxHpPct) {
          const bonus = Math.round(actor.maxHp * Number(ability.maxHpPct));
          actor.maxHp += bonus;
          actor.hp = clamp(actor.hp + bonus, 1, actor.maxHp);
          applyStatus(actor, { id: ability.id + '_hp', name: ability.name, icon: ability.icon || '❤️', turns: bTurns, tempHp: bonus });
          log(`${actor.name}: ${ability.name} (+${fmt(bonus)} HP)`, cls);
        }
        if (ability.grantBlock) {
          applyStatus(actor, {
            id: 'shield_block_buff', name: 'Блок щитом', icon: '🧱', turns: bTurns,
            blockChanceAdd: 0.5, blockValueAdd: 0.2,
          });
        }
        // Special buffs that aren't just "+ATK"
        // sot_r / debug_mode / pet_rez — уже обработаны выше, без legacy +ATK от power=1
        const rebalanceBuff = !!(ability.critMod || ability.atkMod || ability.dmgReduce || ability.maxHpPct
          || ability.blockChanceAdd || ability.blockValueAdd || ability.armorMod || ability.grantBlock
          || ability.id === 'sot_r' || ability.id === 'debug_mode' || ability.id === 'pet_rez'
          || ability.id === 'avenging' || ability.id === 'inquisition');
        if (rebalanceBuff) {
          // флаги уже применены — без legacy +ATK / abilityCharges
        } else if ((ability.id === 'last_stand' || ability.id === 'vampiric_blood') && !ability.maxHpPct) {
          const bonus = Math.round(actor.maxHp * power);
          actor.maxHp += bonus;
          actor.hp = clamp(actor.hp + bonus, 1, actor.maxHp);
          applyStatus(actor, {
            id: ability.id, name: ability.name, icon: ability.icon || '⬆️', turns: 3,
            atkMod: ability.id === 'vampiric_blood' ? 0.1 : 0,
            tempHp: bonus,
          });
          log(`${actor.name}: ${ability.name} (+${bonus} HP на 3 хода)`, cls);
          toast(`${ability.name}: +${bonus} HP`);
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
          // Legacy default: +ATK from power — only if no explicit rebalance flags
          const turns = ability.cd >= 5 ? 3 : 3;
          applyStatus(actor, {
            id: ability.id, name: ability.name, icon: ability.icon || '⬆️',
            turns, atkMod: power,
          });
          log(`${actor.name}: ${ability.name} (+${Math.round(power * 100)}% атаки, ${turns} хода)`, cls);
          toast(`${ability.name}: +${Math.round(power * 100)}% атаки`);
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
        const turns = PERIODIC_ROUNDS;
        applyStatus(target, {
          id: 'dot_' + ability.id, name: ability.name, icon: ability.icon || '☠️',
          turns, dot: tick, fromUid: actor.uid, periodic: true, school,
        });
        const hitRaw = ability.flat != null && Number.isFinite(Number(ability.flat))
          ? abilityDamageRaw(actor, { flat: Number(ability.flat) * 0.5 })
          : Math.max(1, Math.round(eff.atk * power * 0.5));
        const dealt = dealDmg(target, hitRaw, actor, dotCtx);
        log(`${actor.name}: ${ability.name} → ${target.name} (−${fmt(dealt)}, период. ${fmt(tick)}/р · ${turns}р)`, cls);
        toast(`${ability.name} на ${target.name} · ${turns}р`);
        break;
      }
      case 'debuff': {
        const turns = Number(ability.buffTurns) || 3;
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


  function applyArmorStack(unit, ability) {
    if (!unit || !ability || !ability.armorMod) return;
    const turns = Number(ability.buffTurns) || 3;
    const maxS = Number(ability.armorStacksMax) || 99;
    const stackId = 'armor_' + (ability.id || 'x');
    if (!unit.buffs) unit.buffs = [];
    const existing = unit.buffs.filter(b => b && b.id === stackId);
    if (existing.length >= maxS) {
      for (const b of existing) b.turns = turns;
      log(unit.name + ': броня обновлена (' + existing.length + '×)', 'system');
      return;
    }
    applyStatus(unit, {
      id: stackId,
      name: 'Броня' + (ability.name ? ' · ' + ability.name : ''),
      icon: '🛡️',
      turns,
      armorMod: Number(ability.armorMod) || 0,
    });
    log(unit.name + ': +' + Math.round((Number(ability.armorMod) || 0) * 100) + '% брони · ' + turns + 'х', 'system');
  }

