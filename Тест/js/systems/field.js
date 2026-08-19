/* systems/field: поле 3 линии × 2 ряда, шаг карточки, раскол залов. Только Тест. */
(function (G) {
  'use strict';

  var LANES = ['L', 'C', 'R'];
  var LANE_NAME = { L: 'лево', C: 'центр', R: 'право' };
  var RANK_NAME = { front: 'передний ряд', back: 'задний ряд' };
  var MELEE_SPEC = {
    'warrior:protection': 1, 'warrior:arms': 1, 'warrior:fury': 1,
    'paladin:protection': 1, 'paladin:retribution': 1,
    'rogue:assassination': 1, 'rogue:combat': 1, 'rogue:subtlety': 1,
    'deathknight:blood': 1, 'deathknight:frost': 1, 'deathknight:unholy': 1,
    'monk:brewmaster': 1, 'monk:windwalker': 1,
    'druid:guardian': 1, 'druid:feral': 1,
    'shaman:enhancement': 1,
    'hunter:survival': 1,
    'demonhunter:vengeance': 1, 'demonhunter:havoc': 1,
    'engineer:sapper': 1,
  };

  function fieldState() {
    if (typeof combat === 'undefined' || !combat) return null;
    if (!combat.field) {
      combat.field = {
        on: true,
        split: false,
        crush: true,
        shoveEvery: 0,
        playerHall: 'A',
        echoUid: null,
      };
    }
    return combat.field;
  }

  function fieldActive() {
    return !!(typeof combat !== 'undefined' && combat && combat.field && combat.field.on !== false);
  }

  function fieldSplitActive() {
    return !!(fieldActive() && combat.field.split);
  }

  function fieldOf(u) {
    if (!u) return { hall: 'A', lane: 'C', rank: 'front' };
    if (!u.field) u.field = { hall: 'A', lane: 'C', rank: u.side === 'enemy' ? 'front' : 'front' };
    if (!u.field.hall) u.field.hall = 'A';
    if (!LANES.includes(u.field.lane)) u.field.lane = 'C';
    if (u.field.rank !== 'back') u.field.rank = 'front';
    return u.field;
  }

  function fieldSameHall(a, b) {
    if (!fieldSplitActive()) return true;
    return fieldOf(a).hall === fieldOf(b).hall;
  }

  function fieldIsMeleeUnit(u) {
    if (!u) return false;
    if (u.isPet) return u.petKey !== 'hunter_hawk' && u.petKey !== 'shadowfiend';
    if (u.side === 'enemy') {
      return u.role === 'tank' || u.role === 'dps';
    }
    var key = String(u.classId || '') + ':' + String(u.specId || '');
    if (MELEE_SPEC[key]) return true;
    return u.role === 'tank';
  }

  function fieldAbilityIgnoresLane(ability) {
    if (!ability) return true;
    var t = ability.type;
    if (t === 'aoe' || t === 'cast_aoe' || t === 'heal' || t === 'heal_aoe' || t === 'hot'
      || t === 'buff' || t === 'shield' || t === 'interrupt' || t === 'taunt' || t === 'cc'
      || t === 'dispel' || t === 'purge') return true;
    if (ability.school && ability.school !== 'physical' && ability.school !== 'none') return true;
    return false;
  }

  function fieldFrontBlocks(target) {
    if (!target || fieldOf(target).rank !== 'back') return false;
    var hall = fieldOf(target).hall;
    var lane = fieldOf(target).lane;
    var side = target.side;
    var list = side === 'enemy'
      ? ((typeof living === 'function') ? living('enemy') : [])
      : ((typeof livingHeroes === 'function') ? livingHeroes() : []);
    return list.some(function (u) {
      if (!u || u.uid === target.uid || !u.alive) return false;
      var f = fieldOf(u);
      return f.hall === hall && f.lane === lane && f.rank === 'front';
    });
  }

  function fieldReachWhy(actor, target, ability) {
    if (!fieldActive() || !actor || !target) return null;
    if (actor.uid === target.uid) return null;
    if (!fieldSameHall(actor, target)) return 'hall';
    if (fieldAbilityIgnoresLane(ability)) return null;
    if (!fieldIsMeleeUnit(actor)) return null;
    var st = ability && (ability.type === 'damage' || ability.type === 'dot');
    if (!st) return null;
    if (fieldOf(actor).lane !== fieldOf(target).lane) return 'lane';
    if (fieldFrontBlocks(target)) return 'block';
    return null;
  }

  function fieldCanReach(actor, target, ability) {
    return !fieldReachWhy(actor, target, ability);
  }

  function fieldBlocksHit(attacker, target, ctx) {
    if (!fieldActive() || !attacker || !target) return false;
    if (!fieldSameHall(attacker, target)) return true;
    if (ctx && (ctx.isAoe || ctx.isDot || ctx.type === 'aoe' || ctx.type === 'cast_aoe' || ctx.type === 'dot')) return false;
    if (!fieldIsMeleeUnit(attacker)) return false;
    if (fieldOf(attacker).lane !== fieldOf(target).lane) return true;
    if (fieldFrontBlocks(target)) return true;
    return false;
  }

  function fieldReachText(why) {
    if (why === 'hall') return 'Другой зал — удар не доходит. Перейди или кликни своего в том зале.';
    if (why === 'lane') return 'Ближний бой только в своей линии. Шагни влево или вправо.';
    if (why === 'block') return 'Передний ряд закрывает. Сначала сними того, кто стоит впереди.';
    return 'Нельзя';
  }

  function fieldUnitsIn(hall, lane, rank, side) {
    var out = [];
    function push(u) {
      if (!u || !u.alive) return;
      if (side && u.side !== side) return;
      var f = fieldOf(u);
      if (hall && f.hall !== hall) return;
      if (lane && f.lane !== lane) return;
      if (rank && f.rank !== rank) return;
      out.push(u);
    }
    if (typeof run !== 'undefined' && run && run.party) run.party.forEach(push);
    if (typeof combat !== 'undefined' && combat) {
      (combat.pets || []).forEach(push);
      (combat.enemies || []).forEach(function (u) {
        if (u && !u.vaultAway && !u.healOnly && u.instRole !== 'static_pillar') push(u);
      });
    }
    return out;
  }

  function fieldPlace(u, hall, lane, rank) {
    if (!u) return;
    u.field = {
      hall: fieldSplitActive() ? (hall || 'A') : 'A',
      lane: LANES.includes(lane) ? lane : 'C',
      rank: rank === 'back' ? 'back' : 'front',
    };
    if (u.isPet) return;
    if (typeof combat !== 'undefined' && combat && combat.pets) {
      combat.pets.forEach(function (p) {
        if (p && p.ownerUid === u.uid) {
          p.field = { hall: u.field.hall, lane: u.field.lane, rank: u.field.rank };
        }
      });
    }
  }

  function fieldAssignParty() {
    var heroes = (typeof run !== 'undefined' && run && run.party) ? run.party.filter(function (h) { return h && !h.isPet; }) : [];
    var tanks = heroes.filter(function (h) { return h.role === 'tank'; });
    var heals = heroes.filter(function (h) { return h.role === 'healer'; });
    var melee = heroes.filter(function (h) { return h.role !== 'tank' && h.role !== 'healer' && fieldIsMeleeUnit(h); });
    var rest = heroes.filter(function (h) { return tanks.indexOf(h) < 0 && heals.indexOf(h) < 0 && melee.indexOf(h) < 0; });
    var ti = 0, hi = 0, mi = 0, ri = 0;
    var tankSlots = [{ lane: 'C', rank: 'front' }, { lane: 'L', rank: 'front' }, { lane: 'R', rank: 'front' }];
    var healSlots = [{ lane: 'C', rank: 'back' }, { lane: 'L', rank: 'back' }, { lane: 'R', rank: 'back' }];
    var meleeSlots = [{ lane: 'L', rank: 'front' }, { lane: 'R', rank: 'front' }, { lane: 'C', rank: 'front' }];
    var restSlots = [{ lane: 'L', rank: 'back' }, { lane: 'R', rank: 'back' }, { lane: 'C', rank: 'back' }];
    tanks.forEach(function (h) { var s = tankSlots[ti++ % tankSlots.length]; fieldPlace(h, 'A', s.lane, s.rank); });
    heals.forEach(function (h) { var s = healSlots[hi++ % healSlots.length]; fieldPlace(h, 'A', s.lane, s.rank); });
    melee.forEach(function (h) { var s = meleeSlots[mi++ % meleeSlots.length]; fieldPlace(h, 'A', s.lane, s.rank); });
    rest.forEach(function (h) { var s = restSlots[ri++ % restSlots.length]; fieldPlace(h, 'A', s.lane, s.rank); });
  }

  function fieldAssignEnemies() {
    if (!combat || !combat.enemies) return;
    var foes = combat.enemies.filter(function (e) {
      return e && e.alive && !e.vaultAway && !e.healOnly && e.instRole !== 'static_pillar' && !e.instObject;
    });
    var i = 0;
    var slots = [
      { lane: 'C', rank: 'front' },
      { lane: 'L', rank: 'front' },
      { lane: 'R', rank: 'front' },
      { lane: 'L', rank: 'back' },
      { lane: 'R', rank: 'back' },
      { lane: 'C', rank: 'back' },
    ];
    foes.forEach(function (e) {
      if (e.isBoss || e.raidBoss) {
        fieldPlace(e, 'A', 'C', 'front');
        return;
      }
      var s = slots[i++ % slots.length];
      fieldPlace(e, 'A', s.lane, s.rank);
    });
  }

  function fieldOnCombatStart() {
    if (typeof combat === 'undefined' || !combat) return;
    var st = fieldState();
    st.on = true;
    st.split = false;
    st.crush = true;
    st.echoUid = null;
    st.playerHall = 'A';
    var node = (typeof currentRouteNode === 'function') ? currentRouteNode() : null;
    var kind = node && node.type;
    st.shoveEvery = 0;
    if (kind === 'elite' || kind === 'boss' || kind === 'final') st.shoveEvery = 2;
    if (typeof run !== 'undefined' && run && run.raid) st.shoveEvery = 3;
    fieldAssignParty();
    fieldAssignEnemies();
    if (typeof run !== 'undefined' && run && run.fieldTrial && kind === 'final') {
      fieldBeginSplit('trial');
    }
    try { document.body.classList.add('has-field'); } catch (_) {}
    log('Поле: 3 линии, передний ряд закрывает ближний бой. Шаг 1 раз за свой ход — клик по пустой клетке.', 'system');
    if (st.shoveEvery) log('Сдвиг: раз в ' + st.shoveEvery + ' р. карточка уезжает на соседнюю линию.', 'system');
  }

  function fieldCanStep(u, hall, lane, rank) {
    if (!fieldActive() || !u || !u.alive) return false;
    if (u._fieldStepped) return false;
    if (!LANES.includes(lane)) return false;
    if (rank !== 'front' && rank !== 'back') return false;
    var f = fieldOf(u);
    if (fieldSplitActive() && hall && hall !== f.hall) return false;
    if (f.lane === lane && f.rank === rank) return false;
    return true;
  }

  function fieldStep(u, hall, lane, rank, silent) {
    if (!fieldCanStep(u, hall, lane, rank)) return false;
    var from = fieldOf(u);
    fieldPlace(u, from.hall, lane, rank);
    u._fieldStepped = true;
    if (!silent) {
      log((u.fullName || u.name) + ' шагает: ' + LANE_NAME[lane] + ', ' + RANK_NAME[rank], 'player');
      try { toast('Шаг: ' + LANE_NAME[lane] + ' · ' + RANK_NAME[rank]); } catch (_) {}
    }
    try { if (typeof renderCombat === 'function') renderCombat(); } catch (_) {}
    return true;
  }

  function fieldShoveUnit(u) {
    if (!u || !u.alive || u.isPet) return false;
    var f = fieldOf(u);
    var idx = LANES.indexOf(f.lane);
    var dir = (Math.random() < 0.5) ? -1 : 1;
    var next = idx + dir;
    if (next < 0 || next > 2) {
      fieldPlace(u, f.hall, f.lane, f.rank === 'front' ? 'back' : 'front');
      log((u.name) + ': сдвиг — на ' + RANK_NAME[fieldOf(u).rank], 'enemy');
      return true;
    }
    fieldPlace(u, f.hall, LANES[next], f.rank);
    log((u.name) + ': сдвиг на линию «' + LANE_NAME[LANES[next]] + '»', 'enemy');
    return true;
  }

  function fieldOnRoundEnd() {
    if (!fieldActive()) return;
    var st = fieldState();
    var round = Number(combat.round) || 1;
    if (st.shoveEvery > 0 && round % st.shoveEvery === 0) {
      var pool = (run.party || []).filter(function (h) {
        return h && h.alive && h.role !== 'tank' && !h.isPet;
      });
      if (pool.length) fieldShoveUnit(pool[Math.floor(Math.random() * pool.length)]);
    }
    if (st.crush) {
      var lim = (run && run.raid) ? 4 : 3;
      var halls = fieldSplitActive() ? ['A', 'B'] : ['A'];
      halls.forEach(function (hall) {
        LANES.forEach(function (lane) {
          var here = (run.party || []).filter(function (h) {
            if (!h || !h.alive || h.isPet) return false;
            var f = fieldOf(h);
            return f.hall === hall && f.lane === lane;
          });
          if (here.length < lim) return;
          here.forEach(function (h) {
            var raw = Math.max(1, Math.round(h.maxHp * 0.06));
            if (typeof dealTrue === 'function') {
              dealTrue(h, raw, null, 'dot', { school: 'shadow', abilityName: 'Давка линии' });
            }
          });
          log('Давка: ' + here.length + ' в линии «' + LANE_NAME[lane] + '» — каждому 6% max HP.', 'enemy');
        });
      });
    }
    if (fieldSplitActive() && st.echoUid) {
      var echo = (combat.enemies || []).find(function (e) { return e && e.uid === st.echoUid; });
      if (echo && echo.alive) {
        var hallB = (run.party || []).filter(function (h) {
          return h && h.alive && fieldOf(h).hall === 'B';
        });
        if (!hallB.length) {
          log('Эхо зала без игроков — бьёт оба зала.', 'enemy');
          (run.party || []).forEach(function (h) {
            if (!h || !h.alive) return;
            var raw = Math.max(1, Math.round(h.maxHp * 0.08));
            if (typeof dealTrue === 'function') dealTrue(h, raw, echo, 'dot', { school: 'nature', abilityName: 'Зов пустого зала' });
          });
        }
      }
    }
  }

  function fieldBeginSplit(reason) {
    if (!fieldActive() || !combat) return;
    var st = fieldState();
    if (st.split) return;
    st.split = true;
    var heroes = (run.party || []).filter(function (h) { return h && h.alive && !h.isPet; });
    var a = [];
    var b = [];
    var tanks = heroes.filter(function (h) { return h.role === 'tank'; });
    var heals = heroes.filter(function (h) { return h.role === 'healer'; });
    if (tanks[0]) a.push(tanks[0]);
    if (tanks[1]) b.push(tanks[1]);
    if (heals[0]) a.push(heals[0]);
    if (heals[1]) b.push(heals[1]);
    else if (heals[0] && b.length === 0) { /* 5-ман: хил остаётся в A, в B пойдёт дд */ }
    var rest = heroes.filter(function (h) { return a.indexOf(h) < 0 && b.indexOf(h) < 0; });
    rest.forEach(function (h) {
      if (a.length <= b.length) a.push(h);
      else b.push(h);
    });
    if (!b.length && a.length > 1) b.push(a.pop());
    if (!a.length && b.length > 1) a.push(b.pop());
    a.forEach(function (h) { fieldPlace(h, 'A', fieldOf(h).lane, fieldOf(h).rank); });
    b.forEach(function (h) { fieldPlace(h, 'B', fieldOf(h).lane, fieldOf(h).rank); });
    (combat.enemies || []).forEach(function (e) {
      if (!e || e.mechRole === 'field_echo') return;
      fieldPlace(e, 'A', fieldOf(e).lane, fieldOf(e).rank);
    });
    fieldSpawnEcho();
    var me = (typeof raidPlayerUid !== 'undefined' && raidPlayerUid)
      ? heroes.find(function (h) { return h.uid === raidPlayerUid; })
      : (a[0] || heroes[0]);
    st.playerHall = me ? fieldOf(me).hall : 'A';
    try { raidAutoAllies = true; } catch (_) {}
    if (me && typeof raidPlayerUid !== 'undefined') raidPlayerUid = me.uid;
    log('Раскол: два зала. Удары и хилы не пересекают порог. Клик по союзнику — взять его зал.', 'enemy');
    log('Зал A: основной босс. Зал B: эхо — кикай каст, не оставляй зал пустым.', 'system');
    try { toast('Два зала · порог закрыт'); } catch (_) {}
    try { document.body.classList.add('field-split'); } catch (_) {}
    try { if (typeof buildTurnQueue === 'function') buildTurnQueue(); } catch (_) {}
    try { if (typeof renderCombat === 'function') renderCombat(); } catch (_) {}
  }

  function fieldSpawnEcho() {
    if (!combat) return;
    var boss = (combat.enemies || []).find(function (e) { return e && e.alive && (e.isBoss || e.raidBoss); })
      || (combat.enemies || []).find(function (e) { return e && e.alive; });
    if (!boss) return;
    var echo = {
      uid: (typeof uid === 'function') ? uid() : ('echo_' + Date.now()),
      name: 'Эхо зала',
      fullName: 'Эхо зала',
      icon: '🌀',
      role: 'dps',
      side: 'enemy',
      classId: boss.classId || 'mob',
      alive: true,
      isBoss: false,
      isElite: true,
      maxHp: Math.max(1, Math.round((boss.maxHp || 100000) * 0.28)),
      hp: 0,
      atk: Math.max(1, Math.round((boss.atk || 10000) * 0.55)),
      def: Math.round((boss.def || 0) * 0.6),
      speed: (boss.speed || 10) + 1,
      shield: 0,
      buffs: [],
      res: { primary: { type: 'mana', icon: '💧', current: 40, max: 40, regen: 8 } },
      abilities: [
        {
          id: 'field_echo_call', name: 'Зов раскола', icon: '⚡',
          cost: 8, gen: 0, costSec: 0, genSec: 0, costRunes: null, genRunic: 0,
          cd: 2, baseCd: 2, curCd: 0,
          type: 'cast_aoe', power: 0.72, school: 'nature',
          castKind: 'kick', castPrio: 4,
        },
      ],
      mechRole: 'field_echo',
      field: { hall: 'B', lane: 'C', rank: 'front' },
    };
    echo.hp = echo.maxHp;
    combat.enemies.push(echo);
    var st = fieldState();
    st.echoUid = echo.uid;
    log('В зале B встаёт Эхо зала (' + (typeof fmt === 'function' ? fmt(echo.maxHp) : echo.maxHp) + ' HP). Кик «Зов раскола».', 'enemy');
  }

  function fieldMerge() {
    if (!fieldSplitActive()) return;
    var st = fieldState();
    st.split = false;
    (run.party || []).forEach(function (h) {
      if (h) fieldPlace(h, 'A', fieldOf(h).lane, fieldOf(h).rank);
    });
    (combat.enemies || []).forEach(function (e) {
      if (!e) return;
      if (e.mechRole === 'field_echo') {
        e.alive = false;
        e.hp = 0;
      } else {
        fieldPlace(e, 'A', fieldOf(e).lane, fieldOf(e).rank);
      }
    });
    try { document.body.classList.remove('field-split'); } catch (_) {}
    log('Залы схлопнулись. Снова одно поле.', 'system');
    try { toast('Рейд снова вместе'); } catch (_) {}
    try { if (typeof renderCombat === 'function') renderCombat(); } catch (_) {}
  }

  function fieldMaybeRaidSplit(u) {
    if (!fieldActive() || !u) return;
    if (typeof isRaidRun === 'function' && !isRaidRun()) return;
    if (fieldSplitActive()) return;
    if (typeof raidBossAtOrBelow === 'function' && !raidBossAtOrBelow(u, 0.40)) return;
    if ((Number(u.phaseIndex) || 0) < 2) return;
    fieldBeginSplit('raid');
  }

  function fieldMaybeKeySplit(u) {
    if (!fieldActive() || !u || !u.isBoss) return;
    if (typeof run === 'undefined' || !run || run.raid) return;
    if (fieldSplitActive()) return;
    var node = (typeof currentRouteNode === 'function') ? currentRouteNode() : null;
    if (!node || node.type !== 'final') return;
    var ok = !!(run.fieldTrial || (run.dungeon && run.dungeon.theme === 'rift'));
    if (!ok) return;
    if (u.hp / Math.max(1, u.maxHp) > 0.55) return;
    fieldBeginSplit(run.fieldTrial ? 'trial' : 'rift');
  }

  function fieldShouldAuto(actor) {
    if (!actor || actor.side !== 'ally' || actor.isPet) return false;
    if (!fieldSplitActive() && !(typeof run !== 'undefined' && run && run.raid)) return false;
    if (typeof shouldRaidAuto === 'function' && typeof isRaidRun === 'function' && isRaidRun()) {
      return shouldRaidAuto(actor);
    }
    if (!fieldSplitActive()) return false;
    try { raidAutoAllies = true; } catch (_) {}
    if (typeof raidPlayerUid === 'undefined' || !raidPlayerUid) {
      var tank = (run.party || []).find(function (p) { return p.role === 'tank' && p.alive; });
      raidPlayerUid = (tank && tank.uid) || (run.party[0] && run.party[0].uid);
    }
    return actor.uid !== raidPlayerUid;
  }

  function fieldSetFocus(hero) {
    if (!hero || hero.side !== 'ally' || hero.isPet) return;
    if (!hero.alive) {
      try { toast('Мёртв'); } catch (_) {}
      return;
    }
    raidPlayerUid = hero.uid;
    var st = fieldState();
    if (st) st.playerHall = fieldOf(hero).hall;
    try { toast('Управляете: ' + (hero.fullName || hero.name)); } catch (_) {}
    try { if (typeof renderCombat === 'function') renderCombat(); } catch (_) {}
  }

  function fieldCrossHall(u) {
    if (!fieldSplitActive() || !u || !u.alive) return false;
    var f = fieldOf(u);
    var dest = f.hall === 'A' ? 'B' : 'A';
    fieldPlace(u, dest, f.lane, f.rank);
    var st = fieldState();
    st.playerHall = dest;
    if (typeof raidPlayerUid !== 'undefined') raidPlayerUid = u.uid;
    log((u.fullName || u.name) + ' переходит в зал ' + dest + '.', 'player');
    try { toast('Зал ' + dest); } catch (_) {}
    try { if (typeof renderCombat === 'function') renderCombat(); } catch (_) {}
    return true;
  }

  function fieldAiMaybeStep(actor) {
    if (!fieldActive() || !actor || actor.side !== 'ally' || actor.isPet) return false;
    if (actor._fieldStepped) return false;
    var f = fieldOf(actor);
    var lim = (run && run.raid) ? 4 : 3;
    var same = (run.party || []).filter(function (h) {
      if (!h || !h.alive || h.isPet) return false;
      var x = fieldOf(h);
      return x.hall === f.hall && x.lane === f.lane;
    });
    if (same.length >= lim) {
      var emptiest = 'C';
      var best = 99;
      LANES.forEach(function (ln) {
        var n = (run.party || []).filter(function (h) {
          if (!h || !h.alive) return false;
          var x = fieldOf(h);
          return x.hall === f.hall && x.lane === ln;
        }).length;
        if (n < best) { best = n; emptiest = ln; }
      });
      if (emptiest !== f.lane) return fieldStep(actor, f.hall, emptiest, f.rank, true);
    }
    if (fieldIsMeleeUnit(actor) && actor.role !== 'healer') {
      var foes = (typeof living === 'function' ? living('enemy') : []).filter(function (e) {
        return e && e.alive && fieldSameHall(actor, e);
      });
      var inLane = foes.filter(function (e) { return fieldOf(e).lane === f.lane && !fieldFrontBlocks(e); });
      if (!inLane.length && foes.length) {
        var want = fieldOf(foes[0]).lane;
        return fieldStep(actor, f.hall, want, 'front', true);
      }
    }
    return false;
  }

  function fieldEnsureDom() {
    var root = document.getElementById('battle-field');
    if (!root) return null;
    var split = fieldSplitActive();
    root.classList.toggle('hidden', !fieldActive());
    root.classList.toggle('is-split', split);
    if (root.dataset.ready === '1') return root;
    function hallHtml(id, title) {
      return '<div class="bf-hall" data-hall="' + id + '">' +
        '<div class="bf-head">' + title + '</div>' +
        '<div class="bf-band enemy">' +
          '<div class="bf-row" data-side="enemy" data-rank="back" data-hall="' + id + '">' +
            LANES.map(function (ln) { return '<div class="bf-cell" data-lane="' + ln + '" data-rank="back" data-hall="' + id + '" data-side="enemy"></div>'; }).join('') +
          '</div>' +
          '<div class="bf-row" data-side="enemy" data-rank="front" data-hall="' + id + '">' +
            LANES.map(function (ln) { return '<div class="bf-cell" data-lane="' + ln + '" data-rank="front" data-hall="' + id + '" data-side="enemy"></div>'; }).join('') +
          '</div>' +
        '</div>' +
        '<div class="bf-midline" aria-hidden="true">линия удара</div>' +
        '<div class="bf-band ally">' +
          '<div class="bf-row" data-side="ally" data-rank="front" data-hall="' + id + '">' +
            LANES.map(function (ln) { return '<div class="bf-cell" data-lane="' + ln + '" data-rank="front" data-hall="' + id + '" data-side="ally"></div>'; }).join('') +
          '</div>' +
          '<div class="bf-row" data-side="ally" data-rank="back" data-hall="' + id + '">' +
            LANES.map(function (ln) { return '<div class="bf-cell" data-lane="' + ln + '" data-rank="back" data-hall="' + id + '" data-side="ally"></div>'; }).join('') +
          '</div>' +
        '</div>' +
      '</div>';
    }
    root.innerHTML = '<div class="bf-halls">' +
      hallHtml('A', 'Зал A · босс') +
      hallHtml('B', 'Зал B · эхо') +
      '</div>';
    root.dataset.ready = '1';
    if (root.dataset.fieldClick !== '1') {
      root.dataset.fieldClick = '1';
      root.addEventListener('click', onFieldClick);
    }
    return root;
  }

  function onFieldClick(e) {
    var cell = e.target.closest && e.target.closest('.bf-cell');
    var hold = e.target.closest && e.target.closest('.unit, .unit-stack');
    if (hold) {
      var uidEl = hold.dataset.uid || (hold.querySelector && hold.querySelector('.unit') && hold.querySelector('.unit').dataset.uid);
      var u = null;
      try { u = (typeof allUnits === 'function' ? allUnits() : []).find(function (x) { return x && x.uid === uidEl; }); } catch (_) {}
      if (u && typeof onUnitClick === 'function') onUnitClick(u);
      return;
    }
    if (!cell) return;
    if (typeof pendingTarget !== 'undefined' && pendingTarget) return;
    if (!combat || !combat.waitingPlayer) return;
    var actor = (typeof currentActor === 'function') ? currentActor() : null;
    if (!actor || actor.side !== 'ally' || actor.isPet) return;
    if (typeof fieldShouldAuto === 'function' && fieldShouldAuto(actor)) return;
    var lane = cell.dataset.lane;
    var rank = cell.dataset.rank;
    var hall = cell.dataset.hall;
    var side = cell.dataset.side;
    if (side !== 'ally') {
      try { toast('Шаг — в клетку своего ряда'); } catch (_) {}
      return;
    }
    fieldStep(actor, hall, lane, rank);
  }

  function fieldStartTrial() {
    if (typeof createHero !== 'function' || typeof beginRunScreen !== 'function') {
      try { toast('Бой ещё не готов'); } catch (_) {}
      return;
    }
    if (typeof party === 'undefined' || !party || party.length < 5) {
      try { toast('Собери отряд из 5'); } catch (_) {}
      return;
    }
    var dungeon = (typeof DUNGEONS !== 'undefined' && DUNGEONS.find(function (d) { return d.id === 'rift'; })) || {
      id: 'rift', name: 'Разлом Хаоса', theme: 'rift', timerBase: 20 * 60,
    };
    var keyLevel = 5;
    try { window._igorHeroBindUsed = false; } catch (_) {}
    run = {
      dungeon: dungeon,
      keyLevel: keyLevel,
      affixes: [],
      roomIndex: 0,
      talents: [],
      deaths: 0,
      timerMax: 12 * 60,
      timerLeft: 12 * 60,
      logs: [],
      restBuffBattles: 0,
      finished: false,
      forces: 0,
      loot: [],
      raid: false,
      fieldTrial: true,
      route: {
        nodes: {
          start: { id: 'start', type: 'trash', pack: 'mixed', name: 'Двор линий', loc: 'entrance', next: ['mid'], forceBudget: 24 },
          mid: { id: 'mid', type: 'elite', pack: 'st', name: 'Сдвигатель', loc: 'elite', next: ['final'], forceBudget: 30 },
          final: { id: 'final', type: 'final', name: 'Два зала', loc: 'throne', next: [], forceBudget: 0 },
        },
        currentId: 'start',
        visited: [],
        finalCleared: false,
        mopupMode: false,
      },
      party: party.map(function (p) {
        var h = createHero(p.classId, p.specId, keyLevel, p.sec, p.gear);
        if (Array.isArray(p.abilityOrder) && p.abilityOrder.length) h.abilityOrder = p.abilityOrder.slice();
        return h;
      }),
      _roomArt: {},
    };
    if (typeof assignPartyUniqueNames === 'function') assignPartyUniqueNames(run.party);
    try {
      raidAutoAllies = true;
      raidPlayerUid = (run.party.find(function (p) { return p.role === 'tank'; }) || run.party[0]).uid;
    } catch (_) {}
    if (typeof resetRecount === 'function') resetRecount();
    beginRunScreen();
    try { applyDungeonTheme(); } catch (_) {}
    log('Учебный инст поля. 3 комнаты: линии → сдвиг → раскол залов. Не ключ, таймер 12:00.', 'system');
    log('Ближний бой бьёт свою линию. Передний ряд закрывает задний. Шаг — клик по пустой клетке своего ряда.', 'system');
    try { updateHud(); } catch (_) {}
    if (typeof renderPath === 'function') renderPath();
    if (typeof renderPowers === 'function') renderPowers();
    enterRoom();
  }

  G.fieldActive = fieldActive;
  G.fieldSplitActive = fieldSplitActive;
  G.fieldOf = fieldOf;
  G.fieldSameHall = fieldSameHall;
  G.fieldIsMeleeUnit = fieldIsMeleeUnit;
  G.fieldCanReach = fieldCanReach;
  G.fieldReachWhy = fieldReachWhy;
  G.fieldReachText = fieldReachText;
  G.fieldBlocksHit = fieldBlocksHit;
  G.fieldOnCombatStart = fieldOnCombatStart;
  G.fieldOnRoundEnd = fieldOnRoundEnd;
  G.fieldStep = fieldStep;
  G.fieldCanStep = fieldCanStep;
  G.fieldBeginSplit = fieldBeginSplit;
  G.fieldMerge = fieldMerge;
  G.fieldMaybeRaidSplit = fieldMaybeRaidSplit;
  G.fieldMaybeKeySplit = fieldMaybeKeySplit;
  G.fieldShouldAuto = fieldShouldAuto;
  G.fieldSetFocus = fieldSetFocus;
  G.fieldCrossHall = fieldCrossHall;
  G.fieldAiMaybeStep = fieldAiMaybeStep;
  G.fieldEnsureDom = fieldEnsureDom;
  G.fieldStartTrial = fieldStartTrial;
  G.fieldPlace = fieldPlace;
  G.LANE_NAME = LANE_NAME;
  G.RANK_NAME = RANK_NAME;
})(typeof window !== 'undefined' ? window : this);
