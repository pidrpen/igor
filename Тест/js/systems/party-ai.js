/* systems/party-ai: spec-aware ally AI for raid / key companions.
   partyAiAct(actor) → true if it already called castAbility (one ability). */
(function (global) {
  'use strict';

  var EMERGENCY_HP = 0.45;
  var TANK_DEF_HP = 0.40;
  var AOE_HEAL_HURT = 0.80;
  var TOPUP_HP = 0.85;
  var PILLAR_HP = 0.70;
  var AOE_FOES = 3;
  var EXECUTE_HP = 0.35;
  var MISTAKE_CHANCE = 0.12;
  var LOOKAHEAD = 3;
  var DROP_HP = 0.50;
  var NEVER_HEAL_HP = 0.35;
  var STAGGER_HIGH = 0.20;
  var STAGGER_INCOMING = 0.12;

  var _planning = false;
  var _intent = null;
  var _holdKick = false;
  var _reserve = 0;
  var _ignoreReserve = false;

  var SPEC_AI = {
    'warrior:arms': {
      role: 'dps',
      dots: ['ms', 'colossus', 'heroic'],
      execute: ['execute'],
      aoe: ['whirlwind'],
      builders: ['ms', 'overpower', 'colossus'],
      spenders: ['slam', 'heroic'],
      st: ['colossus', 'ms', 'slam', 'overpower', 'heroic'],
    },
    'warrior:fury': {
      role: 'dps',
      execute: ['execute'],
      aoe: ['whirlwind'],
      builders: ['bt', 'rb'],
      spenders: ['execute', 'whirlwind'],
      st: ['rb', 'bt'],
    },
    'warrior:protection': {
      role: 'tank',
      taunt: ['taunt'],
      defensives: ['last_stand', 'shield_wall', 'shield_block'],
      builders: ['shield_slam'],
      spenders: ['revenge'],
      aoe: ['revenge'],
      st: ['shield_slam', 'revenge', 'demo_shout'],
    },
    'paladin:holy': {
      role: 'healer',
      stHeal: ['holy_shock', 'flash', 'holy_light'],
      aoeHeal: ['light_dawn', 'holy_radiance'],
      emergency: ['flash', 'holy_shock', 'word_glory'],
      bigSpend: ['word_glory'],
      filler: ['crusader', 'holy_shock'],
    },
    'paladin:protection': {
      role: 'tank',
      taunt: ['taunt'],
      defensives: ['ardent'],
      builders: ['crusader', 'judgment'],
      spenders: ['hot_r', 'sot_r'],
      aoe: ['avengers', 'consecrate'],
      dots: ['consecrate'],
      execute: ['hot_w'],
      st: ['avengers', 'judgment', 'crusader', 'hot_r', 'sot_r'],
    },
    'paladin:retribution': {
      role: 'dps',
      builders: ['crusader', 'judgment'],
      spenders: ['templar', 'divine_storm'],
      execute: ['hot_w'],
      aoe: ['divine_storm'],
      st: ['templar', 'judgment', 'crusader'],
    },
    'monk:brewmaster': {
      role: 'tank',
      taunt: ['provoke'],
      defensives: ['fort_brew', 'elusive'],
      builders: ['jab', 'keg_smash'],
      spenders: ['blackout', 'breath'],
      aoe: ['keg_smash', 'breath', 'sck'],
      dots: ['breath'],
      st: ['blackout', 'jab', 'keg_smash'],
      cleanse: ['purifying'],
    },
    'monk:mistweaver': {
      role: 'healer',
      stHeal: ['surging', 'renewing', 'enveloping'],
      aoeHeal: ['uft', 'revival'],
      emergency: ['enveloping', 'surging', 'renewing'],
      bigSpend: ['enveloping', 'revival'],
      filler: ['jade_lotus', 'jab'],
      aoe: ['sck'],
    },
    'shaman:restoration': {
      role: 'healer',
      stHeal: ['riptide', 'chw', 'hw'],
      aoeHeal: ['ch', 'hs', 'spirit_link'],
      emergency: ['chw', 'riptide', 'hw'],
      bigSpend: ['spirit_link', 'chw'],
      filler: ['flame_shock'],
      dots: ['flame_shock'],
    },
    'priest:discipline': {
      role: 'healer',
      stHeal: ['penance', 'flash', 'greater'],
      aoeHeal: ['prayer', 'heaven_shield'],
      emergency: ['flash', 'penance', 'pain_supp'],
      bigSpend: ['greater', 'heaven_shield'],
      shields: ['shield'],
      filler: ['smite', 'holy_fire', 'penance'],
      dots: ['holy_fire'],
    },
    'mage:fire': {
      role: 'dps',
      dots: ['living_bomb', 'scorch'],
      builders: ['fireball', 'scorch'],
      spenders: ['pyroblast'],
      aoe: ['flamestrike'],
      st: ['pyroblast', 'fireball', 'scorch', 'living_bomb'],
    },
    'mage:frost': {
      role: 'dps',
      aoe: ['frozen_orb', 'blizzard'],
      builders: ['frostbolt', 'ice_lance'],
      spenders: ['deep_freeze'],
      st: ['deep_freeze', 'frostbolt', 'ice_lance'],
      summons: ['summon_water'],
    },
    'warlock:affliction': {
      role: 'dps',
      dots: ['agony', 'corruption', 'ua'],
      builders: ['drain_soul', 'malefic'],
      spenders: ['haunt'],
      aoe: ['seed'],
      st: ['haunt', 'malefic', 'drain_soul'],
    },
    'warlock:destruction': {
      role: 'dps',
      dots: ['immolate'],
      execute: ['shadowburn'],
      builders: ['incinerate', 'conflag'],
      spenders: ['chaos_bolt'],
      aoe: ['rain_fire'],
      st: ['chaos_bolt', 'conflag', 'incinerate'],
      selfHeal: ['ember_tap'],
    },
    'deathknight:blood': {
      role: 'tank',
      taunt: ['taunt'],
      defensives: ['icebound', 'vampiric_blood'],
      builders: ['heart_strike', 'blood_boil'],
      spenders: ['death_strike'],
      aoe: ['blood_boil', 'dnd'],
      dots: ['blood_boil', 'dnd'],
      st: ['death_strike', 'heart_strike', 'bone_shield'],
    },
    'deathknight:frost': {
      role: 'dps',
      dots: ['howling'],
      execute: ['soul_reaper'],
      builders: ['obliterate', 'howling'],
      spenders: ['fs'],
      aoe: ['howling'],
      st: ['obliterate', 'fs', 'howling', 'death_strike'],
    },
    'rogue:combat': {
      role: 'dps',
      builders: ['ss', 'revealing', 'fan'],
      spenders: ['eviscerate'],
      aoe: ['killing_spree', 'fan'],
      st: ['revealing', 'ss', 'eviscerate'],
    },
    'hunter:beast_mastery': {
      role: 'dps',
      dots: ['serpent'],
      execute: ['kill_shot'],
      builders: ['cobra', 'dire'],
      spenders: ['kill_cmd', 'arcane_shot'],
      aoe: ['multi'],
      st: ['kill_cmd', 'arcane_shot', 'dire', 'cobra'],
    },
    'engineer:mechanist': {
      role: 'dps',
      builders: ['wrench_bash'],
      spenders: ['rivet_gun', 'plasma_cutter', 'bot_overdrive', 'call_siege_walker'],
      st: ['rivet_gun', 'wrench_bash'],
      modules: ['call_siege_walker', 'plasma_cutter', 'bot_overdrive'],
      petHeal: ['emergency_repair'],
    },
    'demonhunter:vengeance': {
      role: 'tank',
      builders: ['shear', 'fracture'],
      spenders: ['soul_cleave'],
      aoe: ['immolation_aura', 'fel_devastation'],
      defensives: ['demon_spikes', 'metamorph_veng'],
      taunt: ['torment'],
      st: ['shear', 'fracture', 'soul_cleave'],
    },
    'demonhunter:havoc': {
      role: 'dps',
      builders: ['demons_bite'],
      spenders: ['chaos_strike'],
      aoe: ['blade_dance', 'eye_beam'],
      dots: ['throw_glaive'],
      fa: ['fel_rush'],
      defensives: ['blur', 'metamorph_havoc'],
      st: ['chaos_strike', 'demons_bite', 'throw_glaive'],
    },
  };

  function hpRatio(u) {
    if (!u || !u.maxHp) return 1;
    return u.hp / u.maxHp;
  }

  function lowestOf(list) {
    if (!list || !list.length) return null;
    return list.slice().sort(function (a, b) { return hpRatio(a) - hpRatio(b); })[0];
  }

  function isPillar(u) {
    return !!(u && (u.instRole === 'static_pillar' || u.healOnly));
  }

  function isFightFoe(e) {
    if (!e || !e.alive || e.hp <= 0) return false;
    if (e.vaultAway) return false;
    if (isPillar(e) || e.instObject) return false;
    return true;
  }

  function fightFoes(actor) {
    if (typeof living !== 'function') return [];
    var list = living('enemy').filter(isFightFoe);
    if (actor && typeof fieldSameHall === 'function') {
      list = list.filter(function (e) { return fieldSameHall(actor, e); });
    }
    return list;
  }

  function alliedPillars() {
    var list = (typeof combat !== 'undefined' && combat && combat.enemies) || [];
    return list.filter(function (e) { return e && e.alive && e.hp > 0 && isPillar(e); });
  }

  function friendsOf() {
    if (typeof livingHeroes === 'function') return livingHeroes();
    if (typeof living === 'function') return living('ally').filter(function (u) { return u && !u.isPet; });
    return [];
  }

  function isFreeAction(ab) {
    return !!(ab && (ab.freeAction || ab.fa));
  }

  function isPureKick(ab) {
    if (!ab) return false;
    if (ab.type === 'interrupt') return true;
    if (typeof INTERRUPT_IDS !== 'undefined' && INTERRUPT_IDS.has(ab.id)) return true;
    return false;
  }

  function isKickLike(ab) {
    if (!ab) return false;
    if (typeof isKickAbility === 'function') return isKickAbility(ab);
    return isPureKick(ab) || !!ab.interruptPrimary || ab.id === 'avengers';
  }

  function isExecuteAb(ab) {
    if (!ab) return false;
    if (typeof EXECUTE_IDS !== 'undefined' && EXECUTE_IDS.has(ab.id)) return true;
    return false;
  }

  function isHotAb(ab) {
    if (!ab) return false;
    if (ab.applyHot || ab.type === 'hot') return true;
    if (typeof HOT_ABILITY_IDS !== 'undefined' && HOT_ABILITY_IDS.has && HOT_ABILITY_IDS.has(ab.id)) return true;
    return false;
  }

  function isSaveAbility(ab, kit) {
    if (!ab) return false;
    if (ab.type === 'heal' || ab.type === 'heal_aoe' || ab.type === 'hot' || ab.type === 'shield') return true;
    if (ab.type === 'buff' && (ab.dmgReduce || ab.maxHpPct || ab.blockChanceAdd)) return true;
    if (ab.type === 'cleanse' || ab.id === 'purifying') return true;
    if (ab.lifesteal) return true;
    if (!kit) return false;
    if (kit.defensives && kit.defensives.indexOf(ab.id) >= 0) return true;
    if (kit.emergency && kit.emergency.indexOf(ab.id) >= 0) return true;
    if (kit.bigSpend && kit.bigSpend.indexOf(ab.id) >= 0) return true;
    return false;
  }

  function someoneCasting(foes) {
    return (foes || []).some(function (e) { return e && e.casting; });
  }

  function dotBuffId(ab) {
    if (!ab) return '';
    var ad = ab.applyDot || {};
    return 'dot_' + (ad.id || ab.id);
  }

  function hasOwnDot(unit, actor, ab) {
    if (!unit || !ab) return true;
    var key = dotBuffId(ab);
    return (unit.buffs || []).some(function (b) {
      if (!b || b.id !== key) return false;
      if (b.fromUid && b.fromUid !== actor.uid) return false;
      return b.turns == null || Number(b.turns) > 1;
    });
  }

  function primaryType(actor) {
    return actor && actor.res && actor.res.primary && actor.res.primary.type;
  }

  function primaryCur(actor) {
    return (actor && actor.res && actor.res.primary && actor.res.primary.current) || 0;
  }

  function primaryMax(actor) {
    return (actor && actor.res && actor.res.primary && actor.res.primary.max) || 1;
  }

  function secondaryCur(actor) {
    return (actor && actor.res && actor.res.secondary && actor.res.secondary.current) || 0;
  }

  function secondaryType(actor) {
    return actor && actor.res && actor.res.secondary && actor.res.secondary.type;
  }

  function resourceHigh(actor) {
    var t = primaryType(actor);
    var s = secondaryType(actor);
    if (s === 'holy_power') return secondaryCur(actor) >= 3;
    if (s === 'combo') return secondaryCur(actor) >= 4;
    if (s === 'runic_power') return secondaryCur(actor) >= 40;
    if (s === 'soul_shards') return secondaryCur(actor) >= 1;
    if (s === 'soul_fragments') return secondaryCur(actor) >= 2;
    if (s === 'chi') return secondaryCur(actor) >= 2;
    if (s === 'parts') return secondaryCur(actor) >= 3;
    if (t === 'rage' || t === 'fury') return primaryCur(actor) >= 40;
    if (t === 'energy' || t === 'focus') return primaryCur(actor) >= 50;
    if (t === 'mana') return primaryCur(actor) / primaryMax(actor) >= 0.45;
    if (t === 'runes') return typeof readyRunes === 'function' ? readyRunes(actor) >= 2 : true;
    return primaryCur(actor) / primaryMax(actor) >= 0.55;
  }

  function resourceLow(actor) {
    var t = primaryType(actor);
    var s = secondaryType(actor);
    if (s === 'holy_power') return secondaryCur(actor) < 3;
    if (s === 'combo') return secondaryCur(actor) < 4;
    if (s === 'runic_power') return secondaryCur(actor) < 40;
    if (s === 'soul_shards') return secondaryCur(actor) < 1;
    if (s === 'soul_fragments') return secondaryCur(actor) < 2;
    if (s === 'chi') return secondaryCur(actor) < 2;
    if (s === 'parts') return secondaryCur(actor) < 3;
    if (t === 'rage' || t === 'fury') return primaryCur(actor) < 30;
    if (t === 'energy' || t === 'focus') return primaryCur(actor) < 40;
    if (t === 'mana') return primaryCur(actor) / primaryMax(actor) < 0.25;
    if (t === 'runes') return typeof readyRunes === 'function' ? readyRunes(actor) < 2 : false;
    return primaryCur(actor) / primaryMax(actor) < 0.35;
  }

  function deriveKit(actor) {
    var kit = {
      role: actor.role || 'dps',
      dots: [],
      builders: [],
      spenders: [],
      aoe: [],
      execute: [],
      stHeal: [],
      aoeHeal: [],
      emergency: [],
      bigSpend: [],
      defensives: [],
      taunt: [],
      st: [],
      filler: [],
      shields: [],
      cleanse: [],
      summons: [],
      modules: [],
      petHeal: [],
      selfHeal: [],
      hots: [],
      fa: [],
    };
    var abs = actor.abilities || [];
    for (var i = 0; i < abs.length; i++) {
      var a = abs[i];
      if (!a || !a.id) continue;
      if (a.id.indexOf('pct_') === 0 || a.id === 'debug_mode' || a.id === 'cheat') continue;
      if (a.applyDot || a.type === 'dot') kit.dots.push(a.id);
      if (isHotAb(a)) kit.hots.push(a.id);
      if (a.type === 'aoe') kit.aoe.push(a.id);
      if (a.type === 'heal') {
        kit.stHeal.push(a.id);
        kit.emergency.push(a.id);
        if ((a.costSec || 0) >= 3 || (a.cost || 0) >= 14) kit.bigSpend.push(a.id);
      }
      if (a.type === 'heal_aoe') kit.aoeHeal.push(a.id);
      if (a.type === 'taunt') kit.taunt.push(a.id);
      if (a.type === 'shield' || (a.type === 'buff' && (a.dmgReduce || a.maxHpPct || a.blockChanceAdd))) {
        kit.defensives.push(a.id);
      }
      if (isExecuteAb(a)) kit.execute.push(a.id);
      if ((a.gen > 0 || a.genSec > 0 || a.costRunes) && (a.type === 'damage' || a.type === 'aoe' || a.type === 'dot')) {
        kit.builders.push(a.id);
      }
      if ((a.cost > 0 || a.costSec > 0) && (a.type === 'damage' || a.type === 'aoe')) {
        kit.spenders.push(a.id);
      }
      if (a.type === 'damage' || a.type === 'dot') kit.st.push(a.id);
      if (a.type === 'summon') kit.summons.push(a.id);
      if (a.type === 'cleanse') kit.cleanse.push(a.id);
      if (isFreeAction(a)) kit.fa.push(a.id);
    }
    kit.filler = kit.st.slice();
    return kit;
  }

  function kitFor(actor) {
    var derived = deriveKit(actor);
    var key = (actor.classId || '') + ':' + (actor.specId || '');
    var spec = SPEC_AI[key];
    if (!spec) return derived;
    var out = {};
    var k;
    for (k in derived) if (Object.prototype.hasOwnProperty.call(derived, k)) out[k] = derived[k];
    for (k in spec) if (Object.prototype.hasOwnProperty.call(spec, k)) out[k] = spec[k];
    if (!out.role) out.role = actor.role || derived.role;
    return out;
  }

  function canAfford(actor, ab, target) {
    if (!ab) return false;
    if (typeof canPay === 'function') return canPay(actor, ab, target);
    return !((ab.curCd || 0) > 0.05);
  }

  function wouldBreakReserve(actor, ab) {
    if (_ignoreReserve || _reserve <= 0) return false;
    if (isSaveAbility(ab)) return false;
    if (isKickLike(ab) || isPureKick(ab) || isExecuteAb(ab)) return false;
    if (ab.type === 'taunt' || ab.type === 'cc') return false;
    var cost = Number(ab.cost) || 0;
    if (cost <= 0) return false;
    return primaryCur(actor) - cost < _reserve;
  }

  function canUse(actor, ab, target) {
    if (!canAfford(actor, ab, target)) return false;
    if (wouldBreakReserve(actor, ab)) return false;
    return true;
  }

  function usableList(actor) {
    return (actor.abilities || []).filter(function (a) {
      if (!a || !a.id) return false;
      if (a.id.indexOf('pct_') === 0 || a.id === 'debug_mode') return false;
      return canAfford(actor, a);
    });
  }

  function pickReady(usable, ids, opts) {
    opts = opts || {};
    if (!ids || !ids.length) return null;
    var actor = opts.actor;
    for (var i = 0; i < ids.length; i++) {
      var a = usable.find(function (x) { return x.id === ids[i]; });
      if (!a) continue;
      if (isFreeAction(a) && !opts.allowFa) continue;
      if (_holdKick && !opts.allowKick && isKickLike(a)) continue;
      if (actor && !canUse(actor, a, opts.target)) continue;
      if (opts.needPay && !canUse(opts.actor, a, opts.target)) continue;
      return a;
    }
    return null;
  }

  function doCast(actor, ab, target, tag) {
    if (!ab) return false;
    if (!canUse(actor, ab, target)) return false;
    if (_planning) {
      if (!_intent) _intent = { actor: actor, ab: ab, target: target, tag: tag || 'other' };
      return true;
    }
    if (typeof castAbility !== 'function') return false;
    castAbility(actor, ab, target);
    if (ab.type === 'taunt' && typeof onRaidTaunt === 'function') onRaidTaunt(actor);
    return true;
  }

  function tryIds(actor, usable, ids, target, opts) {
    opts = opts || {};
    opts.actor = actor;
    opts.target = target;
    var ab = pickReady(usable, ids, opts);
    if (!ab) return false;
    return doCast(actor, ab, target, opts.tag);
  }

  function focusFoe(foes) {
    if (!foes.length) return null;
    var cond = foes.find(function (e) {
      return e.mechRole === 'conductor' || e.mechRole === 'echo' || e.mustKillTurns;
    });
    if (cond) return cond;
    var boss = foes.find(function (e) { return e.isBoss || e.raidBoss; });
    if (boss) return boss;
    var focus = typeof combat !== 'undefined' && combat && combat.focusEnemy;
    if (focus && foes.some(function (e) { return e.uid === focus.uid; })) return focus;
    return foes[0];
  }

  function execTarget(foes, prio) {
    if (prio && hpRatio(prio) <= EXECUTE_HP) return prio;
    return foes.find(function (e) { return hpRatio(e) <= EXECUTE_HP; }) || null;
  }

  function unitByUid(uid) {
    if (uid == null) return null;
    var lists = [];
    if (typeof allUnits === 'function') lists.push(allUnits());
    else {
      if (typeof run !== 'undefined' && run && run.party) lists.push(run.party);
      if (typeof combat !== 'undefined' && combat) {
        if (combat.enemies) lists.push(combat.enemies);
        if (combat.pets) lists.push(combat.pets);
      }
    }
    for (var i = 0; i < lists.length; i++) {
      var arr = lists[i] || [];
      for (var j = 0; j < arr.length; j++) {
        if (arr[j] && arr[j].uid === uid) return arr[j];
      }
    }
    return null;
  }

  function nextQueueActors(n) {
    var out = [];
    if (typeof combat === 'undefined' || !combat || !combat.turnQueue) return out;
    var q = combat.turnQueue;
    var idx = Number(combat.turnIndex) || 0;
    var cap = Math.max(2, Math.min(n || LOOKAHEAD, LOOKAHEAD));
    for (var i = 1; i <= cap && idx + i < q.length; i++) {
      var u = unitByUid(q[idx + i]);
      if (u && u.alive) out.push(u);
    }
    return out;
  }

  function enemyHasKickableTelegraph(e) {
    if (!e || e.side === 'ally') return false;
    var c = e.casting;
    if (c && c.interruptible !== false) return true;
    var abs = e.abilities || [];
    for (var i = 0; i < abs.length; i++) {
      var a = abs[i];
      if (!a) continue;
      if ((a.curCd || 0) > 0.05) continue;
      if (a.type === 'cast_aoe') return true;
      if (a.castKind === 'kick' || a.castKind === 'aoe') return true;
    }
    return false;
  }

  function shouldHoldKick(actor, usable, foes) {
    if (someoneCasting(foes)) return false;
    var hasKick = (usable || []).some(function (a) { return isKickLike(a) || isPureKick(a); });
    if (!hasKick) return false;
    var next = nextQueueActors(LOOKAHEAD);
    for (var i = 0; i < next.length; i++) {
      if (next[i] && next[i].side === 'enemy' && enemyHasKickableTelegraph(next[i])) return true;
    }
    return false;
  }

  function unitAtk(u) {
    if (!u) return 0;
    if (typeof getEff === 'function') return getEff(u).atk;
    return Number(u.atk) || 0;
  }

  function estimateAoeHitFrom(enemy) {
    if (!enemy) return 0;
    var power = 1;
    var mult = 1;
    var c = enemy.casting;
    if (c) {
      if (c.power != null) power = c.power;
      if (c.powerMult != null) mult = c.powerMult;
    } else {
      var tele = (enemy.abilities || []).find(function (a) {
        return a && (a.curCd || 0) <= 0.05 && (a.type === 'cast_aoe' || a.castKind === 'aoe' || a.castKind === 'kick');
      });
      if (tele && tele.power != null) power = tele.power;
    }
    var esc = 1 + Math.min(0.75, (enemy.missedKicks || 0) * 0.18);
    var soft = (typeof combat !== 'undefined' && combat && combat.softSave) ? 0.7 : 1;
    return Math.round(unitAtk(enemy) * power * mult * esc * soft);
  }

  function isIncomingAoeCast(c) {
    if (!c) return false;
    if (c.kind === 'aoe' || c.kind === 'kick') return true;
    return c.target === 'all';
  }

  function knownIncomingAoeEnemies(foes) {
    var found = [];
    var seen = {};
    function add(u) {
      if (!u || !u.uid || seen[u.uid]) return;
      seen[u.uid] = true;
      found.push(u);
    }
    var i;
    for (i = 0; i < (foes || []).length; i++) {
      var e = foes[i];
      if (e && e.casting && isIncomingAoeCast(e.casting)) add(e);
    }
    var next = nextQueueActors(LOOKAHEAD);
    for (i = 0; i < next.length; i++) {
      var u = next[i];
      if (!u || u.side !== 'enemy') continue;
      if (u.casting && isIncomingAoeCast(u.casting)) { add(u); continue; }
      var ready = (u.abilities || []).some(function (a) {
        return a && (a.curCd || 0) <= 0.05 && (a.type === 'cast_aoe' || a.castKind === 'aoe');
      });
      if (ready) add(u);
    }
    return found;
  }

  function alliesDroppingFromAoe(friends, foes) {
    var casters = knownIncomingAoeEnemies(foes);
    if (!casters.length) return [];
    var hit = 0;
    for (var i = 0; i < casters.length; i++) hit += estimateAoeHitFrom(casters[i]);
    if (hit <= 0) return [];
    return (friends || []).filter(function (h) {
      if (!h || !h.maxHp) return false;
      return (h.hp - hit) / h.maxHp < DROP_HP;
    });
  }

  function hasBigIncoming(foes) {
    var i;
    for (i = 0; i < (foes || []).length; i++) {
      var c = foes[i] && foes[i].casting;
      if (c && (c.kind === 'buster' || c.kind === 'aoe' || c.kind === 'kick')) return true;
    }
    var next = nextQueueActors(LOOKAHEAD);
    for (i = 0; i < next.length; i++) {
      var u = next[i];
      if (!u || u.side !== 'enemy') continue;
      if (u.casting && (u.casting.kind === 'buster' || u.casting.kind === 'aoe' || u.casting.kind === 'kick')) return true;
      var abs = u.abilities || [];
      for (var j = 0; j < abs.length; j++) {
        var a = abs[j];
        if (!a || (a.curCd || 0) > 0.05) continue;
        if (a.castKind === 'buster' || a.castKind === 'aoe' || a.castKind === 'kick' || a.type === 'cast_aoe') return true;
      }
    }
    return false;
  }

  function lastSaveReserve(actor, kit, usable, friends) {
    var hurting = false;
    var low = 0;
    for (var i = 0; i < (friends || []).length; i++) {
      var r = hpRatio(friends[i]);
      if (r < EMERGENCY_HP) hurting = true;
      if (r < 0.70) low++;
    }
    if (hpRatio(actor) < 0.70) hurting = true;
    if (low >= 2) hurting = true;
    if (!hurting) return 0;
    var t = primaryType(actor);
    if (t !== 'mana' && t !== 'rage' && t !== 'fury') return 0;
    var minCost = 0;
    for (var j = 0; j < (usable || []).length; j++) {
      var a = usable[j];
      if (!isSaveAbility(a, kit)) continue;
      var cost = Number(a.cost) || 0;
      if (cost > 0 && (minCost === 0 || cost < minCost)) minCost = cost;
    }
    if (minCost <= 0) return 0;
    var cur = primaryCur(actor);
    var max = primaryMax(actor);
    if (cur < minCost) return 0;
    if (cur >= minCost * 2 && cur / max > 0.30) return 0;
    return minCost;
  }

  function idOverlap(a, b) {
    var out = [];
    if (!a || !b) return out;
    for (var i = 0; i < a.length; i++) {
      if (b.indexOf(a[i]) >= 0 && out.indexOf(a[i]) < 0) out.push(a[i]);
    }
    return out;
  }

  function findUsable(usable, id) {
    return (usable || []).find(function (x) { return x.id === id; }) || null;
  }

  function builderBridges(actor, builder, spender) {
    if (!builder || !spender) return false;
    var pri = primaryCur(actor);
    var sec = secondaryCur(actor);
    var needPri = Number(spender.cost) || 0;
    var needSec = Number(spender.costSec) || 0;
    var canNow = (needPri <= 0 || pri >= needPri) && (needSec <= 0 || sec >= needSec);
    if (canNow) return false;
    var nextPri = pri + (Number(builder.gen) || 0);
    var nextSec = sec + (Number(builder.genSec) || 0);
    return (needPri <= 0 || nextPri >= needPri) && (needSec <= 0 || nextSec >= needSec);
  }

  function justBelowSpender(actor, usable, kit) {
    var spenders = kit.spenders || [];
    var builders = kit.builders || [];
    if (!spenders.length || !builders.length) return false;
    var i;
    var j;
    var anyPayable = false;
    for (i = 0; i < spenders.length; i++) {
      var s = findUsable(usable, spenders[i]);
      if (s && canUse(actor, s)) anyPayable = true;
    }
    if (anyPayable) return false;
    for (i = 0; i < builders.length; i++) {
      var b = findUsable(usable, builders[i]);
      if (!b || !canUse(actor, b)) continue;
      for (j = 0; j < spenders.length; j++) {
        var sp = findUsable(usable, spenders[j]);
        if (sp && builderBridges(actor, b, sp)) return true;
      }
    }
    return false;
  }

  function estimateAbDmg(actor, ab) {
    if (!ab) return 0;
    if (typeof abilityDamageRaw === 'function') return abilityDamageRaw(actor, ab);
    var flat = Number(ab.flat);
    var atk = unitAtk(actor);
    if (flat) return Math.round(atk * flat / 15);
    return Math.round(atk * (ab.power || 1));
  }

  function wouldKill(actor, ab, target) {
    if (!actor || !ab || !target) return false;
    if (ab.type !== 'damage' && ab.type !== 'aoe' && !isExecuteAb(ab)) return false;
    return estimateAbDmg(actor, ab) >= (Number(target.hp) || 0);
  }

  function isOnlyLethal(actor, usable, ab, target) {
    if (!wouldKill(actor, ab, target)) return false;
    for (var i = 0; i < (usable || []).length; i++) {
      var a = usable[i];
      if (!a || a.id === ab.id) continue;
      if (isFreeAction(a)) continue;
      if (!canAfford(actor, a, target)) continue;
      if (wouldKill(actor, a, target)) return false;
    }
    return true;
  }

  function tryKick(actor, usable, foes) {
    var casting = (foes || []).find(function (e) { return e && e.casting; });
    if (!casting) return false;
    var av = usable.find(function (a) { return a.id === 'avengers' || a.interruptPrimary; });
    if (av && canUse(actor, av, casting)) return doCast(actor, av, casting, 'kick');
    var kick = usable.find(isPureKick);
    if (kick && canUse(actor, kick, casting)) return doCast(actor, kick, casting, 'kick');
    var any = usable.find(isKickLike);
    if (any && canUse(actor, any, casting)) return doCast(actor, any, casting, 'kick');
    var cc = usable.find(function (a) { return a.type === 'cc'; });
    if (cc && canUse(actor, cc, casting)) return doCast(actor, cc, casting, 'kick');
    return false;
  }

  function tryMaintainDots(actor, usable, kit, prio) {
    if (!prio || !kit.dots || !kit.dots.length) return false;
    var seen = {};
    for (var i = 0; i < kit.dots.length; i++) {
      var ab = usable.find(function (x) { return x.id === kit.dots[i]; });
      if (!ab) continue;
      if (isFreeAction(ab)) continue;
      if (_holdKick && isKickLike(ab)) continue;
      var key = dotBuffId(ab);
      if (seen[key]) continue;
      seen[key] = true;
      if (hasOwnDot(prio, actor, ab)) continue;
      if (canUse(actor, ab, prio)) return doCast(actor, ab, prio);
    }
    return false;
  }

  function tryExecute(actor, usable, kit, foes, prio) {
    var t = execTarget(foes, prio);
    if (!t) return false;
    var ids = (kit.execute && kit.execute.length) ? kit.execute : null;
    var ab = ids ? pickReady(usable, ids, { allowFa: true, actor: actor, target: t, allowKick: true }) : null;
    if (!ab) {
      ab = usable.find(function (a) { return isExecuteAb(a); });
    }
    if (!ab) return false;
    if (!canUse(actor, ab, t)) return false;
    return doCast(actor, ab, t, 'execute');
  }

  function tryAoe(actor, usable, kit, foes, prio) {
    if (foes.length < AOE_FOES) return false;
    return tryIds(actor, usable, kit.aoe, prio || foes[0]);
  }

  function trySpendBuild(actor, usable, kit, prio, foes) {
    foes = foes || [];
    if (justBelowSpender(actor, usable, kit) && tryIds(actor, usable, kit.builders, prio)) return true;
    if (foes.length >= AOE_FOES) {
      var aoeSpend = idOverlap(kit.aoe, kit.spenders);
      if (aoeSpend.length && resourceHigh(actor) && tryIds(actor, usable, aoeSpend, prio)) return true;
    }
    if (resourceHigh(actor) && tryIds(actor, usable, kit.spenders, prio)) return true;
    if (resourceLow(actor) && tryIds(actor, usable, kit.builders, prio)) return true;
    if (tryIds(actor, usable, kit.st, prio)) return true;
    if (resourceHigh(actor) && tryIds(actor, usable, kit.builders, prio)) return true;
    return tryIds(actor, usable, kit.spenders, prio);
  }

  function tryTauntSwap(actor, usable, kit, friends, boss) {
    var taunt = pickReady(usable, kit.taunt, { allowFa: true, actor: actor, allowKick: true })
      || usable.find(function (a) { return a.type === 'taunt'; });
    if (!taunt) return false;
    var ov = function (h) { return (h.buffs || []).find(function (b) { return b.id === 'overload'; }); };
    var other = friends.find(function (h) { return h.role === 'tank' && h.uid !== actor.uid; });
    var otherStacks = other ? ((ov(other) || {}).stacks || 0) : 0;
    var mt = typeof currentMainTank === 'function' ? currentMainTank(boss) : null;
    var iAmMt = !!(mt && mt.uid === actor.uid);
    if (other && otherStacks >= 2 && !iAmMt) return doCast(actor, taunt, null, 'taunt');
    return false;
  }

  function tryTankDef(actor, usable, kit) {
    if (hpRatio(actor) >= TANK_DEF_HP) return false;
    if (tryIds(actor, usable, kit.defensives, actor, { allowFa: true })) return true;
    var def = usable.find(function (a) {
      if (typeof abilityTargetRule === 'function' && abilityTargetRule(a) !== 'self_only') return false;
      return a.type === 'shield' || a.type === 'buff' || a.type === 'cleanse';
    });
    return def ? doCast(actor, def, actor) : false;
  }

  function tryPurify(actor, usable, kit, incomingBig) {
    if (!kit.cleanse || !kit.cleanse.length) return false;
    var stag = Number(actor.stagger) || 0;
    var thresh = (incomingBig ? STAGGER_INCOMING : STAGGER_HIGH) * (actor.maxHp || 0);
    if (stag < thresh) return false;
    return tryIds(actor, usable, kit.cleanse, actor, { allowFa: true });
  }

  function healTargetRule(ab) {
    if (typeof abilityTargetRule === 'function') return abilityTargetRule(ab);
    return ab && ab.type === 'heal_aoe' ? 'party' : 'ally_any';
  }

  function castHeal(actor, ab, target, tag) {
    if (!ab) return false;
    var rule = healTargetRule(ab);
    if (rule === 'self_only') return doCast(actor, ab, actor, tag);
    return doCast(actor, ab, target, tag);
  }

  function pickHeal(usable, ids, targetHp, kit, opts) {
    opts = opts || {};
    var list = ids || [];
    var big = kit.bigSpend || [];
    for (var i = 0; i < list.length; i++) {
      var a = usable.find(function (x) { return x.id === list[i]; });
      if (!a) continue;
      if (isFreeAction(a) && !opts.allowFa) continue;
      if (!opts.emergency && big.indexOf(a.id) >= 0 && targetHp > EMERGENCY_HP) continue;
      if (targetHp >= TOPUP_HP && (a.cost || 0) >= 14) continue;
      if (opts.actor && !canUse(opts.actor, a, opts.target)) continue;
      return a;
    }
    return null;
  }

  function pickPreHot(usable, kit, actor, target) {
    var ids = kit.hots || [];
    var ab = pickReady(usable, ids, { actor: actor, target: target });
    if (ab) return ab;
    return usable.find(function (a) {
      if (!isHotAb(a) || isFreeAction(a)) return false;
      return canUse(actor, a, target);
    }) || null;
  }

  function tryHealer(actor, usable, kit, friends, foes, prio) {
    var pillars = alliedPillars();
    var lowPillar = lowestOf(pillars.filter(function (p) { return hpRatio(p) < PILLAR_HP; }));
    if (lowPillar) {
      var pHeal = pickHeal(usable, kit.stHeal, hpRatio(lowPillar), kit, { emergency: true, actor: actor, target: lowPillar })
        || pickReady(usable, kit.stHeal, { allowFa: true, actor: actor, target: lowPillar })
        || usable.find(function (a) { return a.type === 'heal' || a.type === 'heal_aoe' || a.type === 'hot'; });
      if (pHeal) return castHeal(actor, pHeal, lowPillar, hpRatio(lowPillar) < NEVER_HEAL_HP ? 'emergency' : 'heal');
    }

    var hurt = friends.filter(function (h) { return hpRatio(h) < AOE_HEAL_HURT; });
    var crit = lowestOf(friends.filter(function (h) { return hpRatio(h) < EMERGENCY_HP; }));
    var any = lowestOf(friends.filter(function (h) { return h.hp < h.maxHp; }));

    if (crit) {
      var emTag = hpRatio(crit) < NEVER_HEAL_HP ? 'emergency' : 'heal';
      var em = pickHeal(usable, kit.emergency, hpRatio(crit), kit, { emergency: true, allowFa: true, actor: actor, target: crit })
        || pickHeal(usable, kit.stHeal, hpRatio(crit), kit, { emergency: true, allowFa: true, actor: actor, target: crit });
      if (em) return castHeal(actor, em, crit, emTag);
    }

    if (kit.shields && kit.shields.length) {
      var shNeed = lowestOf(friends.filter(function (h) {
        return hpRatio(h) < 0.70 && !(h.shield > 0);
      }));
      if (shNeed && tryIds(actor, usable, kit.shields, shNeed)) return true;
    }

    var droppers = alliesDroppingFromAoe(friends, foes);
    if (droppers.length >= 2) {
      var inAoe = pickHeal(usable, kit.aoeHeal, 0.5, kit, { emergency: true, actor: actor });
      if (inAoe) return castHeal(actor, inAoe, inAoe.id === 'ch' ? (lowestOf(droppers) || actor) : actor, 'heal');
      var hotAb = pickPreHot(usable, kit, actor, lowestOf(droppers) || actor);
      if (hotAb) return castHeal(actor, hotAb, lowestOf(droppers) || actor, 'heal');
    }

    if (hurt.length >= 3) {
      var aoeH = pickHeal(usable, kit.aoeHeal, 0.5, kit, {
        emergency: hurt.some(function (h) { return hpRatio(h) < EMERGENCY_HP; }),
        actor: actor,
      });
      if (aoeH) return castHeal(actor, aoeH, aoeH.id === 'ch' ? (crit || any || actor) : actor);
    }

    var top = (any && hpRatio(any) < TOPUP_HP) ? any : null;
    if (top) {
      var st = pickHeal(usable, kit.stHeal, hpRatio(top), kit, { actor: actor, target: top });
      if (st) return castHeal(actor, st, top);
    }

    if (tryMaintainDots(actor, usable, kit, prio)) return true;
    if (tryExecute(actor, usable, kit, foes, prio)) return true;
    if (tryAoe(actor, usable, kit, foes, prio)) return true;
    if (kit.filler && kit.filler.length) {
      var fillT = prio;
      var fillAb = pickReady(usable, kit.filler, { actor: actor, target: fillT });
      if (fillAb && (fillAb.holyShock || fillAb.id === 'penance') && fillT) {
        return doCast(actor, fillAb, fillT);
      }
      if (tryIds(actor, usable, kit.filler, fillT)) return true;
    }
    return false;
  }

  function tryTank(actor, usable, kit, friends, foes, prio, boss) {
    if (tryTauntSwap(actor, usable, kit, friends, boss)) return true;
    if (tryTankDef(actor, usable, kit)) return true;
    if (tryPurify(actor, usable, kit, hasBigIncoming(foes))) return true;
    if (hpRatio(actor) < 0.70 && kit.spenders && kit.spenders.indexOf('death_strike') >= 0) {
      if (tryIds(actor, usable, ['death_strike'], prio)) return true;
    }
    if (hpRatio(actor) < 0.70 && kit.spenders && kit.spenders.indexOf('soul_cleave') >= 0) {
      if (tryIds(actor, usable, ['soul_cleave'], prio)) return true;
    }
    if (tryMaintainDots(actor, usable, kit, prio)) return true;
    if (foes.length <= 1 && tryExecute(actor, usable, kit, foes, prio)) return true;
    if (justBelowSpender(actor, usable, kit) && tryIds(actor, usable, kit.builders, prio)) return true;
    if (tryAoe(actor, usable, kit, foes, prio)) return true;
    if (foes.length > 1 && tryExecute(actor, usable, kit, foes, prio)) return true;
    if (trySpendBuild(actor, usable, kit, prio, foes)) return true;
    return false;
  }

  function mainPet(actor) {
    if (typeof getMainPet === 'function') return getMainPet(actor, false);
    return null;
  }

  function tryDps(actor, usable, kit, foes, prio) {
    if (kit.selfHeal && kit.selfHeal.length && hpRatio(actor) < EMERGENCY_HP) {
      if (tryIds(actor, usable, kit.selfHeal, actor)) return true;
    }
    if (kit.defensives && kit.defensives.length && hpRatio(actor) < TANK_DEF_HP) {
      if (tryIds(actor, usable, kit.defensives, actor, { allowFa: true })) return true;
    }
    if (kit.petHeal && kit.petHeal.length) {
      var pet = mainPet(actor);
      if (pet && hpRatio(pet) < 0.50 && tryIds(actor, usable, kit.petHeal, pet)) return true;
    }
    if (kit.modules && kit.modules.length && mainPet(actor) && secondaryCur(actor) >= 2) {
      if (foes.length >= AOE_FOES && tryIds(actor, usable, ['call_siege_walker'], actor)) return true;
      if (tryIds(actor, usable, kit.modules, actor)) return true;
    }
    if (kit.summons && kit.summons.length && typeof getMainPet === 'function' && !getMainPet(actor, false)) {
      if (tryIds(actor, usable, kit.summons, prio)) return true;
    }
    if (tryMaintainDots(actor, usable, kit, prio)) return true;
    if (foes.length <= 1 && tryExecute(actor, usable, kit, foes, prio)) return true;
    if (justBelowSpender(actor, usable, kit) && tryIds(actor, usable, kit.builders, prio)) return true;
    if (foes.length >= AOE_FOES) {
      var aoeSpend = idOverlap(kit.aoe, kit.spenders);
      if (aoeSpend.length && resourceHigh(actor) && tryIds(actor, usable, aoeSpend, prio)) return true;
      if (tryAoe(actor, usable, kit, foes, prio)) return true;
    }
    if (foes.length > 1 && tryExecute(actor, usable, kit, foes, prio)) return true;
    if (trySpendBuild(actor, usable, kit, prio, foes)) return true;
    return false;
  }

  function lastResort(actor, usable, prio, friends) {
    var gcd = usable.find(function (a) {
      if (isFreeAction(a)) return false;
      if (isPureKick(a)) return false;
      if (_holdKick && isKickLike(a)) return false;
      if (isExecuteAb(a) && (!prio || hpRatio(prio) > EXECUTE_HP)) return false;
      if (!canUse(actor, a, prio)) return false;
      return a.type === 'damage' || a.type === 'aoe' || a.type === 'dot' || a.type === 'heal' || a.type === 'heal_aoe';
    });
    if (gcd) {
      if (gcd.type === 'heal' || gcd.type === 'heal_aoe') {
        var t = lowestOf(friends.filter(function (h) { return h.hp < h.maxHp; })) || actor;
        return castHeal(actor, gcd, t);
      }
      return doCast(actor, gcd, prio);
    }
    return false;
  }

  function bucketIds(kit, ab) {
    if (!kit || !ab) return null;
    var keys = ['emergency', 'stHeal', 'aoeHeal', 'aoe', 'spenders', 'builders', 'execute', 'st', 'filler', 'defensives', 'dots'];
    for (var i = 0; i < keys.length; i++) {
      var ids = kit[keys[i]];
      if (ids && ids.indexOf(ab.id) >= 0) return ids;
    }
    return null;
  }

  function altTarget(ab, intent, actor, prio, friends, foes) {
    if (!ab) return null;
    if (ab.type === 'heal' || ab.type === 'hot') return intent.target || lowestOf(friends) || actor;
    if (ab.type === 'heal_aoe') return actor;
    if (ab.type === 'taunt') return null;
    if (ab.type === 'buff' || ab.type === 'shield' || ab.type === 'cleanse') return actor;
    if (ab.type === 'aoe') return prio || (foes[0] || null);
    return prio || intent.target;
  }

  function firstUsableAlt(actor, usable, ids, skipId, orig, target, foes) {
    if (!ids) return null;
    var origFa = isFreeAction(orig);
    for (var i = 0; i < ids.length; i++) {
      if (ids[i] === skipId) continue;
      var a = findUsable(usable, ids[i]);
      if (!a) continue;
      if (isFreeAction(a) !== origFa) continue;
      if (isKickLike(a) && !someoneCasting(foes)) continue;
      if (!canAfford(actor, a, target)) continue;
      return a;
    }
    return null;
  }

  function intentProtected(intent, usable, foes, friends) {
    if (!intent || !intent.ab) return false;
    var ab = intent.ab;
    var actor = intent.actor;
    if (intent.tag === 'kick' || (isKickLike(ab) && someoneCasting(foes))) {
      return someoneCasting(foes);
    }
    if (ab.type === 'heal' || ab.type === 'heal_aoe' || ab.type === 'hot' || ab.type === 'shield') {
      if (intent.target && hpRatio(intent.target) < NEVER_HEAL_HP) return true;
      if (ab.type === 'heal_aoe' && (friends || []).some(function (h) { return hpRatio(h) < NEVER_HEAL_HP; })) return true;
    }
    if (intent.tag === 'taunt' && ab.type === 'taunt') return true;
    if (intent.tag === 'execute' || isExecuteAb(ab)) {
      return isOnlyLethal(actor, usable, ab, intent.target);
    }
    return false;
  }

  function pickWorse(intent, actor, usable, kit, foes, friends, prio) {
    var ab = intent.ab;
    var skip = ab.id;
    var bucket = bucketIds(kit, ab);
    var alt = firstUsableAlt(actor, usable, bucket, skip, ab, intent.target, foes);
    if (!alt && kit.spenders && kit.spenders.indexOf(ab.id) >= 0) {
      alt = firstUsableAlt(actor, usable, kit.builders, skip, ab, prio, foes);
    }
    if (!alt && (ab.type === 'aoe' || (kit.aoe && kit.aoe.indexOf(ab.id) >= 0))) {
      alt = firstUsableAlt(actor, usable, kit.st, skip, ab, prio, foes);
    }
    if (!alt && foes.length === 2 && (ab.type === 'damage' || (kit.st && kit.st.indexOf(ab.id) >= 0))) {
      alt = firstUsableAlt(actor, usable, kit.aoe, skip, ab, prio, foes);
    }
    if (!alt) return null;
    return {
      actor: actor,
      ab: alt,
      target: altTarget(alt, intent, actor, prio, friends, foes),
      tag: 'mistake',
    };
  }

  function applyMistake(intent, actor, usable, kit, foes, friends, prio) {
    if (!intent || !intent.ab) return intent;
    if (Math.random() >= MISTAKE_CHANCE) return intent;
    if (intentProtected(intent, usable, foes, friends)) return intent;
    var worse = pickWorse(intent, actor, usable, kit, foes, friends, prio);
    if (!worse || !worse.ab || worse.ab.id === intent.ab.id) return intent;
    if (typeof log === 'function') {
      log('ИИ ошибка: ' + actor.name + ' жмёт ' + (worse.ab.name || worse.ab.id));
    }
    return worse;
  }

  function partyAiAct(actor) {
    if (!actor || !actor.alive || actor.isPet) return false;
    if (actor.side !== 'ally') return false;
    if (typeof isStunned === 'function' && isStunned(actor)) return false;
    try { if (typeof fieldAiMaybeStep === 'function') fieldAiMaybeStep(actor); } catch (_) {}
    var foes = fightFoes(actor);
    var friends = friendsOf();
    if (actor && typeof fieldSameHall === 'function') {
      friends = friends.filter(function (h) { return fieldSameHall(actor, h); });
    }
    var usable = usableList(actor);
    if (!usable.length) return false;
    var kit = kitFor(actor);
    var prio = focusFoe(foes);
    var boss = foes.find(function (e) { return e.isBoss || e.raidBoss; }) || prio;

    _intent = null;
    _planning = true;
    _ignoreReserve = false;
    _holdKick = shouldHoldKick(actor, usable, foes);
    _reserve = lastSaveReserve(actor, kit, usable, friends);

    try {
      if (!tryKick(actor, usable, foes)) {
        var role = kit.role || actor.role || 'dps';
        var ok = false;
        if (role === 'healer') ok = tryHealer(actor, usable, kit, friends, foes, prio);
        else if (role === 'tank') ok = tryTank(actor, usable, kit, friends, foes, prio, boss);
        else ok = tryDps(actor, usable, kit, foes, prio);
        if (!ok) lastResort(actor, usable, prio, friends);
      }
    } finally {
      _planning = false;
      _holdKick = false;
    }

    var planned = _intent;
    _intent = null;
    _reserve = 0;
    _ignoreReserve = true;
    if (!planned) {
      _ignoreReserve = false;
      return false;
    }
    var chosen = applyMistake(planned, actor, usable, kit, foes, friends, prio);
    var done = doCast(chosen.actor, chosen.ab, chosen.target, chosen.tag);
    if (!done && chosen !== planned) done = doCast(planned.actor, planned.ab, planned.target, planned.tag);
    _ignoreReserve = false;
    return done;
  }

  global.partyAiAct = partyAiAct;
  global.PARTY_AI_SPECS = SPEC_AI;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
