/* raid-split: Тест only. Two halls on Lei Shen 40%. Key 5 living() unchanged. */
  const RAID_SPLIT_ROOMS = {
    azure: {
      id: 'azure',
      title: 'Зал трона',
      task: 'Кик «Зов династии»',
      loc: 'throne',
      tintName: 'Лазурь',
      icon: '🔵',
    },
    gold: {
      id: 'gold',
      title: 'Зал сфер',
      task: 'Соки + проводник СТ',
      loc: 'sanctum',
      tintName: 'Золото',
      icon: '🟡',
    },
  };

  function isRaidSplitActive() {
    return !!(typeof isRaidRun === 'function' && isRaidRun() && combat && combat.raidSplit && combat.raidSplit.active);
  }

  function raidSplitState() {
    return (combat && combat.raidSplit) || null;
  }

  function raidSplitPlayerRoom() {
    const s = raidSplitState();
    return (s && s.playerRoom) || 'azure';
  }

  function raidOtherRoom(room) {
    return room === 'gold' ? 'azure' : 'gold';
  }

  function raidRoomOf(u) {
    if (!u) return null;
    if (u.raidRoom) return u.raidRoom;
    if (u.isPet && u.ownerUid && run) {
      const o = (run.party || []).find(p => p.uid === u.ownerUid);
      if (o && o.raidRoom) return o.raidRoom;
    }
    return null;
  }

  function raidSameRoom(a, b) {
    if (!isRaidSplitActive()) return true;
    const ra = raidRoomOf(a);
    const rb = raidRoomOf(b);
    if (!ra || !rb) return true;
    return ra === rb;
  }

  function raidSplitBlocksHit(attacker, target, ctx) {
    if (!isRaidSplitActive()) return false;
    if (ctx && (ctx.raidWire || ctx.raidIgnoreRoom)) return false;
    if (!attacker || !target) return false;
    return !raidSameRoom(attacker, target);
  }

  function raidRoomHeroes(room) {
    return (typeof livingHeroes === 'function' ? _raidSplitLivingHeroesRaw() : (run.party || []))
      .filter(h => h && h.alive && !h.isPet && (!room || h.raidRoom === room));
  }

  function _raidSplitLivingHeroesRaw() {
    return (run && run.party) ? run.party.filter(u => u.alive && u.hp > 0) : [];
  }

  function raidSplitCanMerge() {
    if (!isRaidSplitActive()) return false;
    const s = combat.raidSplit;
    if (s.forceMerge) return true;
    const cond = (combat.enemies || []).find(e => e.alive && e.mechRole === 'conductor' && e.raidRoom === 'gold');
    const echo = (combat.enemies || []).find(e => e.alive && e.mechRole === 'echo');
    const echoDone = !!(s.echoKicked || !echo);
    const condDead = !cond;
    const soaksOk = !combat.soakNeed;
    const timed = (s.rounds || 0) >= 8 && condDead;
    return (condDead && echoDone && soaksOk) || timed;
  }

  function raidSplitBgUrl(loc) {
    try {
      if (typeof ASSETS !== 'undefined' && ASSETS.bg) return ASSETS.bg('jade', loc);
    } catch (_) { /* ignore */ }
    return '';
  }

  function raidSplitAssignGroups() {
    const heroes = (run.party || []).filter(h => h && !h.isPet);
    const alive = heroes.filter(h => h.alive);
    const tanks = alive.filter(h => h.role === 'tank');
    const heals = alive.filter(h => h.role === 'healer');
    const azure = [];
    const gold = [];
    if (tanks[0]) azure.push(tanks[0]);
    if (tanks[1]) gold.push(tanks[1]);
    if (heals.length >= 2) {
      azure.push(heals[0]);
      gold.push(heals[1]);
    } else if (heals[0]) {
      gold.push(heals[0]);
    }
    const rest = alive.filter(h => !azure.includes(h) && !gold.includes(h));
    for (const h of rest) {
      if (azure.length <= gold.length) azure.push(h);
      else gold.push(h);
    }
    if (!gold.length && azure.length > 1) gold.push(azure.pop());
    if (!azure.length && gold.length > 1) azure.push(gold.pop());
    for (const h of heroes) {
      if (!h.alive) {
        h.raidRoom = azure.length <= gold.length ? 'azure' : 'gold';
        continue;
      }
      h.raidRoom = gold.includes(h) ? 'gold' : 'azure';
      h.raidTint = h.raidRoom;
      applyStatus(h, {
        id: 'raid_tint',
        name: h.raidRoom === 'gold' ? 'Золотой зал' : 'Лазурный зал',
        icon: h.raidRoom === 'gold' ? '🟡' : '🔵',
        turns: 99,
        tip: 'Свой цвет и своя комната. Удары в другой зал не проходят, кроме провода.',
      });
    }
    for (const p of (combat.pets || [])) {
      const o = (run.party || []).find(h => h.uid === p.ownerUid);
      if (o) p.raidRoom = o.raidRoom;
    }
    return { azure, gold };
  }

  function raidSplitSpawnAdds(boss) {
    if (!boss || typeof spawnMechAdd !== 'function') return;
    const echo = spawnMechAdd(boss, {
      addId: 's', addName: 'Эхо династии', addHp: 0.78, role: 'echo', mustKillTurns: 0,
    });
    if (echo) {
      echo.raidRoom = 'azure';
      echo.mechRole = 'echo';
      echo.mustKillTurns = 0;
      echo.abilities = (echo.abilities || []).concat([{
        id: 'dynasty_call', name: 'Зов династии', icon: '⚡', cost: 10, gen: 0, costSec: 0, genSec: 0,
        costRunes: null, genRunic: 0, cd: 2, baseCd: 2, curCd: 0,
        type: 'cast_aoe', power: 0.88, desc: '',
        castKind: 'kick', castPrio: 4, school: 'nature',
      }]);
    }
    const cond = spawnMechAdd(boss, {
      addId: 'eq', addName: 'Проводник зала сфер', addHp: 1.08, role: 'conductor', mustKillTurns: 5,
    });
    if (cond) {
      cond.raidRoom = 'gold';
      cond.mechRole = 'conductor';
      cond.mustKillTurns = 5;
    }
    applyStatus(boss, {
      id: 'cond_shield', name: 'Ток провода', icon: '🔌', turns: 99,
      dmgReduce: 0.22, tip: 'Пока жив проводник в Зале сфер — босс −22% урона. Не неуязвим.',
    });
    boss.raidRoom = 'azure';
  }

  function beginRaidSplit(boss) {
    if (!combat || !isRaidRun() || !boss) return;
    if (combat.raidSplit && combat.raidSplit.active) return;
    if (combat.vault && !combat.vault.dropped) return;
    const groups = raidSplitAssignGroups();
    const focus = (run.party || []).find(p => p.uid === raidPlayerUid && p.alive) || groups.azure[0] || groups.gold[0];
    const playerRoom = (focus && focus.raidRoom) || 'azure';
    combat.raidSplit = {
      active: true,
      playerRoom,
      echoKicked: false,
      rounds: 0,
      forceMerge: false,
    };
    raidSplitSpawnAdds(boss);
    autoAssignGoldSoaks(2);
    document.body.classList.add('raid-split-on');
    raidSplitApplyColumnBgs();
    log('Небо раскалывается! Рейд расходится в два зала. Удары не пересекают порог — только провод.', 'enemy');
    log('Зал трона: кик «Зов династии», бейте Лэй Шэня. Зал сфер: соки (HP выше 35%) и убейте проводника СТ.', 'system');
    log('Клик по герою другой группы — взять эту группу. «Собрать рейд», когда оба задания закрыты.', 'system');
    toast('Два зала · одна группа ваша');
    raidSplitRefreshChrome();
    try { if (typeof buildTurnQueue === 'function') buildTurnQueue(); } catch (_) {}
    try { if (typeof renderCombat === 'function') renderCombat(); } catch (_) {}
  }

  function autoAssignGoldSoaks(n) {
    const need = n || 2;
    const pool = _raidSplitLivingHeroesRaw()
      .filter(h => h.raidRoom === 'gold' && !(h.buffs || []).some(b => b.id === 'soak_orb'))
      .sort((a, b) => (b.hp / b.maxHp) - (a.hp / a.maxHp));
    const pick = pool.filter(h => h.role !== 'tank').concat(pool.filter(h => h.role === 'tank')).slice(0, need);
    for (const h of pick) {
      applyStatus(h, {
        id: 'soak_orb', name: 'Сфера молнии', icon: '💠', turns: 3,
        tip: 'Сок своего зала: держите HP выше 35%.',
      });
      log(h.name + ' принимает сферу в Зале сфер', 'system');
    }
    combat.soakNeed = 0;
    if (pick.length) toast('Зал сфер: соки на ' + pick.map(h => h.name).join(', '));
  }

  function fireRaidWire(fromRoom, toRoom, source, spellName) {
    if (!isRaidSplitActive()) return;
    const boss = (combat.enemies || []).find(e => e.raidBoss || (e.isBoss && e.mech && e.mech.id === 'thunder_king'));
    const src = source || boss;
    const victims = _raidSplitLivingHeroesRaw().filter(h => h.raidRoom === toRoom);
    const atk = (typeof getEff === 'function' && src) ? getEff(src).atk : (src && src.atk) || 1;
    const raw = Math.round(atk * 0.50);
    const ctx = { raidWire: true, school: 'nature', abilityName: spellName || 'Провод', isAoe: true };
    for (const h of victims) {
      if (!h.alive) continue;
      if (typeof dealTrue === 'function') dealTrue(h, raw, src, 'aoe', ctx);
    }
    const markPool = victims.filter(h => h.alive && h.role !== 'tank');
    const marked = markPool[Math.floor(Math.random() * markPool.length)];
    if (marked) {
      const foreign = fromRoom;
      applyStatus(marked, {
        id: 'raid_color',
        name: foreign === 'gold' ? 'Чужое золото' : 'Чужая лазурь',
        icon: foreign === 'gold' ? '🟡' : '🔵',
        turns: 3,
        tip: 'Чужой цвет в вашем зале. Лечите — тик каждый раунд.',
      });
      marked.raidColorMark = foreign;
      log(marked.name + ' получил чужой цвет по проводу.', 'enemy');
    }
    const fromMeta = RAID_SPLIT_ROOMS[fromRoom];
    const toMeta = RAID_SPLIT_ROOMS[toRoom];
    log((spellName || 'Провод') + ': ' + (fromMeta ? fromMeta.title : fromRoom) + ' → ' + (toMeta ? toMeta.title : toRoom) + '.', 'enemy');
    toast('Провод!');
    const wire = document.getElementById('raid-split-wire');
    if (wire) {
      wire.classList.remove('pulse');
      void wire.offsetWidth;
      wire.classList.add('pulse');
    }
  }

  function endRaidSplit(reason) {
    if (!combat || !combat.raidSplit || !combat.raidSplit.active) return;
    combat.raidSplit.active = false;
    combat.raidSplit.forceMerge = false;
    for (const h of (run.party || [])) {
      h.raidRoom = null;
      h.raidTint = null;
      h.raidColorMark = null;
      if (h.buffs) h.buffs = h.buffs.filter(b => b.id !== 'raid_tint' && b.id !== 'raid_color');
    }
    for (const p of (combat.pets || [])) p.raidRoom = null;
    for (const e of (combat.enemies || [])) {
      if (e.mechRole === 'echo' && e.alive) { e.alive = false; e.hp = 0; }
      e.raidRoom = null;
    }
    const boss = (combat.enemies || []).find(e => e.raidBoss || (e.isBoss && e.mech && e.mech.id === 'thunder_king'));
    if (boss && boss.buffs) boss.buffs = boss.buffs.filter(b => b.id !== 'cond_shield');
    document.body.classList.remove('raid-split-on');
    const stage = document.getElementById('raid-split-stage');
    if (stage) stage.classList.add('hidden');
    raidSplitGatherToNativeRows();
    log('Залы сходятся' + (reason ? ' — ' + reason : '') + '. Рейд снова в одном зале.', 'player');
    toast('Рейд собран');
    try { if (typeof buildTurnQueue === 'function') buildTurnQueue(); } catch (_) {}
    try { if (typeof renderCombat === 'function') renderCombat(); } catch (_) {}
    if (typeof refreshRaidAlerts === 'function') refreshRaidAlerts();
  }

  function tryMergeRaidSplit() {
    if (!isRaidSplitActive()) return false;
    if (!raidSplitCanMerge()) {
      toast('Ещё не оба задания');
      return false;
    }
    endRaidSplit('задания залов закрыты');
    return true;
  }

  function raidSplitSwitchPlayerRoom(room) {
    if (!isRaidSplitActive()) return;
    const next = room || raidOtherRoom(raidSplitPlayerRoom());
    combat.raidSplit.playerRoom = next;
    const hero = _raidSplitLivingHeroesRaw().find(h => h.raidRoom === next);
    if (hero && typeof setRaidFocus === 'function') {
      raidPlayerUid = hero.uid;
    }
    const meta = RAID_SPLIT_ROOMS[next];
    toast('Ваша группа: ' + (meta ? meta.title : next) + ' (вторая — только ИИ)');
    raidSplitRefreshChrome();
    try { if (typeof renderCombat === 'function') renderCombat(); } catch (_) {}
  }

  function tickRaidSplit(boss) {
    if (!isRaidSplitActive() || !boss) return;
    const s = combat.raidSplit;
    s.rounds = (s.rounds || 0) + 1;

    const azureHeroes = _raidSplitLivingHeroesRaw().filter(h => h.raidRoom === 'azure');
    const goldHeroes = _raidSplitLivingHeroesRaw().filter(h => h.raidRoom === 'gold');
    const tanksAz = azureHeroes.filter(h => h.role === 'tank');
    const mt = (typeof currentMainTank === 'function' ? currentMainTank(boss) : tanksAz[0]) || tanksAz[0] || azureHeroes[0];
    if (mt && mt.raidRoom === 'azure' && mt.alive) {
      let ov = (mt.buffs || []).find(b => b.id === 'overload');
      if (!ov) {
        applyStatus(mt, {
          id: 'overload', name: 'Перегрузка', icon: '⚡', turns: 8, stacks: 1,
          dmgTakenMod: 0.12, tip: 'Стаки на танке зала трона. На ×3 — разряд. Смена танков, если второй танк в этом зале.',
        });
        ov = (mt.buffs || []).find(b => b.id === 'overload');
      } else {
        ov.stacks = (ov.stacks || 1) + 1;
        ov.turns = Math.max(ov.turns || 0, 6);
        ov.dmgTakenMod = 0.10 * ov.stacks;
      }
      const stacks = ov?.stacks || 1;
      log(mt.name + ': Перегрузка ×' + stacks, 'enemy');
      if (stacks >= 3) {
        const smash = Math.round(mt.maxHp * 0.48);
        dealTrue(mt, smash, boss, 'dmg', { school: 'nature', abilityName: 'Разряд перегрузки' });
        const splash = Math.round((getEff(boss).atk || boss.atk) * 0.32);
        for (const h of azureHeroes) {
          if (h.uid === mt.uid || !h.alive) continue;
          dealTrue(h, splash, boss, 'aoe', { school: 'nature', abilityName: 'Разряд перегрузки', isAoe: true });
        }
        mt.buffs = (mt.buffs || []).filter(b => b.id !== 'overload');
        log('Разряд перегрузки в Зале трона!', 'enemy');
        toast('Разряд в зале трона');
      }
    }

    if (combat.round % 2 === 0) {
      for (const room of ['azure', 'gold']) {
        const pool = _raidSplitLivingHeroesRaw().filter(h => h.raidRoom === room && h.role !== 'tank');
        const h = pool[Math.floor(Math.random() * pool.length)];
        if (!h) continue;
        applyStatus(h, {
          id: 'raid_color',
          name: room === 'gold' ? 'Золотая метка' : 'Лазурная метка',
          icon: room === 'gold' ? '🟡' : '🔵',
          turns: 3,
          tip: 'Свой цвет. Чужой цвет жжёт — лечите.',
        });
        h.raidColorMark = room;
        log(h.name + ': метка своего цвета (' + RAID_SPLIT_ROOMS[room].tintName + ')', 'enemy');
      }
    }

    for (const h of _raidSplitLivingHeroesRaw()) {
      const mark = h.raidColorMark || ((h.buffs || []).find(b => b.id === 'raid_color') && h.raidTint);
      const b = (h.buffs || []).find(x => x.id === 'raid_color');
      if (!b) { h.raidColorMark = null; continue; }
      const tint = h.raidColorMark || h.raidTint;
      if (tint && h.raidTint && tint !== h.raidTint) {
        const burn = Math.round(h.maxHp * 0.08);
        dealTrue(h, burn, boss, 'dot', { school: 'nature', abilityName: 'Чужой цвет', raidIgnoreRoom: true });
        log(h.name + ': чужой цвет жжёт (−' + (typeof fmt === 'function' ? fmt(burn) : burn) + ')', 'enemy');
      }
    }

    const conds = (combat.enemies || []).filter(x => x.alive && x.mechRole === 'conductor');
    for (const add of conds) {
      add.mustKillTurns = (add.mustKillTurns || 5) - 1;
      if (add.mustKillTurns <= 0) {
        const raw = Math.round((getEff(boss).atk || boss.atk) * 0.90);
        const room = add.raidRoom || 'gold';
        for (const h of _raidSplitLivingHeroesRaw()) {
          if (h.raidRoom !== room) continue;
          dealTrue(h, raw, add, 'aoe', { school: 'nature', abilityName: 'Взрыв проводника', isAoe: true });
        }
        fireRaidWire(room, raidOtherRoom(room), add, 'Взрыв провода');
        add.alive = false; add.hp = 0;
        log('Проводник взорвался — удар по своему залу и провод в другой.', 'enemy');
        toast('Проводник взорвался');
      } else {
        log('Проводник зала сфер взорвётся через ' + add.mustKillTurns + ' р.', 'enemy');
      }
    }
    if (!conds.length && (boss.buffs || []).some(b => b.id === 'cond_shield')) {
      boss.buffs = boss.buffs.filter(b => b.id !== 'cond_shield');
      log('Проводник пал — босс без тока провода (−22% снято).', 'player');
    }

    if (combat.round > 1) {
      const soakers = goldHeroes.filter(h => (h.buffs || []).some(b => b.id === 'soak_orb' && (b.turns || 0) <= 1));
      if (soakers.length) {
        let failed = 0;
        for (const h of soakers) {
          if (!h.alive || h.hp / h.maxHp < 0.35) failed++;
        }
        if (failed) {
          const raw = Math.round((getEff(boss).atk || boss.atk) * 0.62 * failed);
          for (const h of goldHeroes) {
            dealTrue(h, raw, boss, 'aoe', {
              school: 'nature', abilityName: 'Сорванный сок', isAoe: true, raidIgnoreRoom: true,
            });
          }
          log('Сорвано соков в Зале сфер: ' + failed + '.', 'enemy');
        } else {
          log('Сферы зала закрыты.', 'player');
          toast('Соки зала сфер');
        }
      }
    }

    const ratio = boss.hp / Math.max(1, boss.maxHp);
    if (ratio <= 0.15) {
      endRaidSplit('ярость императора схлопывает залы');
      return;
    }
    if (raidSplitCanMerge() && (s.rounds || 0) >= 10) {
      endRaidSplit('залы выстояли');
    }
    raidSplitRefreshChrome();
  }

  function raidSplitApplyColumnBgs() {
    const stage = document.getElementById('raid-split-stage');
    if (!stage) return;
    for (const id of ['azure', 'gold']) {
      const col = stage.querySelector('.raid-split-col[data-room="' + id + '"]');
      if (!col) continue;
      const url = raidSplitBgUrl(RAID_SPLIT_ROOMS[id].loc);
      if (url) col.style.setProperty('--split-bg', 'url(' + JSON.stringify(String(url)) + ')');
    }
  }

  function raidSplitGatherToNativeRows() {
    const stage = document.getElementById('raid-split-stage');
    const allyRow = document.getElementById('ally-row');
    const enemyRow = document.getElementById('enemy-row');
    if (!stage || !allyRow || !enemyRow) return;
    const partyIds = new Set((run && run.party || []).map(p => p.uid));
    stage.querySelectorAll('.unit-stack').forEach(el => {
      const id = el.dataset.uid || el.querySelector('.unit')?.dataset.uid;
      if (partyIds.has(id)) allyRow.appendChild(el);
      else enemyRow.appendChild(el);
    });
  }

  function raidSplitDistributeFromNativeRows() {
    const stage = document.getElementById('raid-split-stage');
    const allyRow = document.getElementById('ally-row');
    const enemyRow = document.getElementById('enemy-row');
    if (!stage) return;
    if (!isRaidSplitActive()) {
      stage.classList.add('hidden');
      stage.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('raid-split-on');
      return;
    }
    document.body.classList.add('raid-split-on');
    stage.classList.remove('hidden');
    stage.setAttribute('aria-hidden', 'false');
    raidSplitApplyColumnBgs();
    const playerRoom = raidSplitPlayerRoom();
    stage.querySelectorAll('.raid-split-col').forEach(col => {
      col.classList.toggle('is-player', col.getAttribute('data-room') === playerRoom);
    });
    const move = (row, side) => {
      if (!row) return;
      [...row.querySelectorAll(':scope > .unit-stack')].forEach(el => {
        const id = el.dataset.uid || el.querySelector('.unit')?.dataset.uid;
        let u = null;
        if (side === 'ally') u = (run.party || []).find(p => p.uid === id);
        else u = (combat.enemies || []).find(e => e.uid === id);
        const room = (u && raidRoomOf(u)) || 'azure';
        const pane = stage.querySelector('.raid-split-col[data-room="' + room + '"] .raid-split-' + (side === 'ally' ? 'friends' : 'foes'));
        if (pane) pane.appendChild(el);
        el.dataset.raidTint = room;
        const card = el.querySelector(':scope > .unit');
        if (card) card.dataset.raidTint = room;
      });
    };
    move(enemyRow, 'enemy');
    move(allyRow, 'ally');
    raidSplitRefreshChrome();
  }

  function raidSplitRefreshChrome() {
    const s = raidSplitState();
    const merge = document.getElementById('btn-raid-merge');
    const swap = document.getElementById('btn-raid-swap-room');
    if (merge) {
      const ok = raidSplitCanMerge();
      merge.classList.toggle('hidden', !isRaidSplitActive());
      merge.disabled = !ok;
      merge.textContent = ok ? 'Собрать рейд' : 'Собрать рейд (ещё рано)';
    }
    if (swap) {
      swap.classList.toggle('hidden', !isRaidSplitActive());
      const other = RAID_SPLIT_ROOMS[raidOtherRoom(raidSplitPlayerRoom())];
      if (other) swap.textContent = 'Группа: ' + other.title;
    }
    const stage = document.getElementById('raid-split-stage');
    if (stage && s) {
      stage.querySelectorAll('.raid-split-col').forEach(col => {
        const room = col.getAttribute('data-room');
        const you = room === raidSplitPlayerRoom();
        const tag = col.querySelector('.raid-split-you');
        if (tag) tag.textContent = you ? 'Ваша группа · 1–9' : 'Только ИИ';
        col.classList.toggle('is-player', you);
      });
    }
  }

  function raidSplitAlertBits() {
    if (!isRaidSplitActive()) return [];
    const bits = [];
    const player = RAID_SPLIT_ROOMS[raidSplitPlayerRoom()];
    bits.push('<span class="raid-alert">Сплит: вы в «' + (player ? player.title : '') + '»</span>');
    const echo = (combat.enemies || []).find(e => e.alive && e.mechRole === 'echo');
    if (echo && echo.casting) {
      bits.push('<span class="raid-alert danger">Зов династии — кик в зале трона!</span>');
    } else if (echo && !combat.raidSplit.echoKicked) {
      bits.push('<span class="raid-alert warn">Эхо: ждите каст, сбейте киком</span>');
    }
    const cond = (combat.enemies || []).find(e => e.alive && e.mechRole === 'conductor' && e.raidRoom === 'gold');
    if (cond) bits.push('<span class="raid-alert danger">Проводник сфер: ' + (cond.mustKillTurns || '?') + ' р.</span>');
    if (raidSplitCanMerge()) bits.push('<span class="raid-alert soak">Можно собрать рейд</span>');
    return bits;
  }

  function bindRaidSplitUi() {
    const merge = document.getElementById('btn-raid-merge');
    if (merge && merge.dataset.bound !== '1') {
      merge.dataset.bound = '1';
      merge.addEventListener('click', () => tryMergeRaidSplit());
    }
    const swap = document.getElementById('btn-raid-swap-room');
    if (swap && swap.dataset.bound !== '1') {
      swap.dataset.bound = '1';
      swap.addEventListener('click', () => raidSplitSwitchPlayerRoom());
    }
    const stage = document.getElementById('raid-split-stage');
    if (stage && stage.dataset.combatClick !== '1') {
      stage.dataset.combatClick = '1';
      stage.addEventListener('click', (e) => {
        const petEl = e.target.closest('.pet-port');
        if (petEl && stage.contains(petEl)) {
          e.stopPropagation();
          const p = (combat && combat.pets || []).find(x => x.uid === petEl.dataset.uid);
          if (!p) return;
          if (typeof toast === 'function') {
            toast((p.icon || '') + ' ' + p.name + ': ' + (typeof fmt === 'function' ? fmt(p.hp) : p.hp) + '/' + (typeof fmt === 'function' ? fmt(p.maxHp) : p.maxHp));
          }
          return;
        }
        const hold = e.target.closest('.unit, .unit-stack');
        if (!hold || !stage.contains(hold)) return;
        const uid = hold.dataset.uid || hold.querySelector('.unit')?.dataset.uid;
        const u = (run && run.party || []).find(p => p.uid === uid)
          || (combat && combat.enemies || []).find(p => p.uid === uid);
        if (u && typeof onUnitClick === 'function') onUnitClick(u);
      });
    }
  }

  function raidSplitInjectActionButtons() {
    if (!isRaidSplitActive()) return;
    const actions = document.getElementById('combat-actions');
    if (!actions) return;
    if (!actions.querySelector('[data-raid-split-swap]')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-sm';
      b.dataset.raidSplitSwap = '1';
      const other = RAID_SPLIT_ROOMS[raidOtherRoom(raidSplitPlayerRoom())];
      b.textContent = 'Другая группа' + (other ? ' · ' + other.title : '');
      b.onclick = () => raidSplitSwitchPlayerRoom();
      actions.appendChild(b);
    }
    if (raidSplitCanMerge() && !actions.querySelector('[data-raid-split-merge]')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-sm react-btn kick-now';
      b.dataset.raidSplitMerge = '1';
      b.textContent = 'Собрать рейд';
      b.onclick = () => tryMergeRaidSplit();
      actions.prepend(b);
    }
  }

  function installRaidSplitHooks() {
    if (installRaidSplitHooks.done) return;
    installRaidSplitHooks.done = true;

    if (typeof living === 'function') {
      const _living = living;
      living = function (side) {
        const list = _living(side);
        const actor = combat && combat._raidRoomActor;
        if (!actor || !isRaidSplitActive()) return list;
        return list.filter(u => raidSameRoom(actor, u));
      };
    }
    if (typeof livingHeroes === 'function') {
      const _lh = livingHeroes;
      livingHeroes = function () {
        const list = _lh();
        const actor = combat && combat._raidRoomActor;
        if (!actor || !isRaidSplitActive()) return list;
        return list.filter(u => raidSameRoom(actor, u));
      };
    }

    if (typeof afterAction === 'function') {
      const _after = afterAction;
      afterAction = function () {
        if (combat) combat._raidRoomActor = null;
        return _after.apply(this, arguments);
      };
    }

    if (typeof dealDmg === 'function') {
      const _d = dealDmg;
      dealDmg = function (target, raw, attacker, ctx) {
        if (raidSplitBlocksHit(attacker, target, ctx)) return 0;
        return _d(target, raw, attacker, ctx);
      };
    }
    if (typeof dealTrue === 'function') {
      const _t = dealTrue;
      dealTrue = function (target, d, source, floatKind, ctx) {
        if (raidSplitBlocksHit(source, target, ctx)) return 0;
        return _t(target, d, source, floatKind, ctx);
      };
    }
    if (typeof healUnit === 'function') {
      const _h = healUnit;
      healUnit = function (t, amount, healer, opts) {
        if (raidSplitBlocksHit(healer, t, opts)) return 0;
        return _h(t, amount, healer, opts);
      };
    }

    if (typeof equalizePartyHpByPct === 'function') {
      const _eq = equalizePartyHpByPct;
      equalizePartyHpByPct = function (reason) {
        if (!isRaidSplitActive() || !run || !run.party) return _eq(reason);
        for (const room of ['azure', 'gold']) {
          const allies = run.party.filter(p => p && p.alive && !p.isPet && p.maxHp > 0 && p.raidRoom === room);
          if (allies.length < 2) continue;
          const ratios = allies.map(p => p.hp / p.maxHp);
          const minR = Math.min(...ratios);
          const maxR = Math.max(...ratios);
          if (maxR - minR < 0.005) continue;
          const avg = ratios.reduce((s, r) => s + r, 0) / ratios.length;
          for (const p of allies) {
            p.hp = Math.max(1, Math.min(p.maxHp, Math.round(p.maxHp * avg)));
          }
        }
      };
    }

    if (typeof castAbility === 'function') {
      const _cast = castAbility;
      castAbility = function (actor, ability, target) {
        if (isRaidSplitActive() && target && raidSplitBlocksHit(actor, target, {})) {
          if (typeof log === 'function') log('Удар не проходит в другую комнату.', 'system');
          if (typeof toast === 'function') toast('Другая комната');
          return;
        }
        const prev = combat && combat._raidRoomActor;
        if (combat && actor) combat._raidRoomActor = actor;
        try { return _cast(actor, ability, target); }
        finally { if (combat) combat._raidRoomActor = prev || null; }
      };
    }

    if (typeof aiAct === 'function') {
      const _ai = aiAct;
      aiAct = function (actor) {
        const prev = combat && combat._raidRoomActor;
        if (combat && isRaidSplitActive() && actor) combat._raidRoomActor = actor;
        try { return _ai(actor); }
        finally { if (combat) combat._raidRoomActor = prev || null; }
      };
    }

    if (typeof raidAllyAi === 'function') {
      const _rai = raidAllyAi;
      raidAllyAi = function (actor) {
        const prev = combat && combat._raidRoomActor;
        if (combat && isRaidSplitActive() && actor) combat._raidRoomActor = actor;
        try {
          if (isRaidSplitActive() && actor && actor.role === 'healer' && actor.raidRoom === 'gold') {
            const soakers = _raidSplitLivingHeroesRaw().filter(h =>
              h.raidRoom === 'gold' && (h.buffs || []).some(b => b.id === 'soak_orb') && h.hp / h.maxHp < 0.55);
            const heal = (actor.abilities || []).find(a => a.type === 'heal' && (typeof canPay !== 'function' || canPay(actor, a)));
            const t = soakers.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
            if (heal && t) {
              _castIf(actor, heal, t);
              return true;
            }
          }
          return _rai(actor);
        } finally {
          if (combat) combat._raidRoomActor = prev || null;
        }
      };
    }

    function _castIf(actor, ab, target) {
      if (typeof castAbility === 'function') castAbility(actor, ab, target);
    }

    if (typeof shouldRaidAuto === 'function') {
      const _auto = shouldRaidAuto;
      shouldRaidAuto = function (actor) {
        if (isRaidSplitActive() && actor && actor.raidRoom && actor.raidRoom !== raidSplitPlayerRoom()) return true;
        return _auto(actor);
      };
    }

    if (typeof setRaidFocus === 'function') {
      const _focus = setRaidFocus;
      setRaidFocus = function (hero) {
        if (isRaidSplitActive() && hero && hero.raidRoom && hero.raidRoom !== raidSplitPlayerRoom()) {
          combat.raidSplit.playerRoom = hero.raidRoom;
          const meta = RAID_SPLIT_ROOMS[hero.raidRoom];
          if (typeof toast === 'function') toast('Теперь вы в «' + (meta ? meta.title : hero.raidRoom) + '»');
        }
        return _focus(hero);
      };
    }

    if (typeof tryAssignRaidSoak === 'function') {
      const _soak = tryAssignRaidSoak;
      tryAssignRaidSoak = function (unit) {
        if (isRaidSplitActive() && unit && unit.raidRoom && unit.raidRoom !== 'gold') {
          if (combat && combat.soakNeed) {
            if (typeof toast === 'function') toast('Сферы только в Зале сфер');
            return true;
          }
        }
        return _soak(unit);
      };
    }

    if (typeof updateUnitSelectionOnly === 'function') {
      const _upd = updateUnitSelectionOnly;
      updateUnitSelectionOnly = function () {
        _upd();
        if (!isRaidSplitActive() || typeof pendingTarget === 'undefined' || !pendingTarget) return;
        const actor = pendingTarget.actor;
        document.querySelectorAll('.unit').forEach(el => {
          const id = el.dataset.uid;
          const u = typeof allUnits === 'function' ? allUnits().find(x => x.uid === id) : null;
          if (u && actor && !raidSameRoom(actor, u)) {
            el.classList.remove('selected-target', 'execute-valid');
          }
        });
      };
    }

    if (typeof onUnitClick === 'function') {
      const _click = onUnitClick;
      onUnitClick = function (unit) {
        if (isRaidSplitActive() && typeof pendingTarget !== 'undefined' && pendingTarget && unit) {
          if (!raidSameRoom(pendingTarget.actor, unit)) {
            if (typeof toast === 'function') toast('Другая комната — нет цели');
            return;
          }
        }
        return _click(unit);
      };
    }

    if (typeof defaultCombatTarget === 'function') {
      const _def = defaultCombatTarget;
      defaultCombatTarget = function (actor, ability) {
        const prev = combat && combat._raidRoomActor;
        if (combat && isRaidSplitActive() && actor) combat._raidRoomActor = actor;
        try { return _def(actor, ability); }
        finally { if (combat) combat._raidRoomActor = prev || null; }
      };
    }

    if (typeof showAbilities === 'function') {
      const _show = showAbilities;
      showAbilities = function (actor) {
        const prev = combat && combat._raidRoomActor;
        if (combat && isRaidSplitActive() && actor) combat._raidRoomActor = actor;
        try {
          const r = _show(actor);
          raidSplitInjectActionButtons();
          return r;
        } finally {
          if (combat) combat._raidRoomActor = prev || null;
        }
      };
    }

    if (typeof renderCombat === 'function') {
      const _rc = renderCombat;
      renderCombat = function () {
        raidSplitGatherToNativeRows();
        const r = _rc.apply(this, arguments);
        raidSplitDistributeFromNativeRows();
        return r;
      };
    }

    if (typeof resolveCasting === 'function') {
      const _res = resolveCasting;
      resolveCasting = function (actor) {
        if (isRaidSplitActive() && actor && actor.mechRole === 'echo' && actor.casting) {
          const name = actor.casting.name || 'Зов династии';
          actor.casting = null;
          actor.missedKicks = (actor.missedKicks || 0) + 1;
          fireRaidWire(actor.raidRoom || 'azure', raidOtherRoom(actor.raidRoom || 'azure'), actor, name);
          if (typeof log === 'function') log('Зов династии не сбит — провод в другой зал!', 'enemy');
          return;
        }
        const prev = combat && combat._raidRoomActor;
        if (combat && actor) combat._raidRoomActor = actor;
        try { return _res(actor); }
        finally { if (combat) combat._raidRoomActor = prev || null; }
      };
    }

    if (typeof interruptCast === 'function') {
      const _kick = interruptCast;
      interruptCast = function (target, actor) {
        const r = _kick(target, actor);
        if (r && isRaidSplitActive() && target && target.mechRole === 'echo' && combat.raidSplit) {
          combat.raidSplit.echoKicked = true;
          if (typeof log === 'function') log('Зов династии сбит — провод не прошёл.', 'player');
          raidSplitRefreshChrome();
        }
        return r;
      };
    }

    if (typeof raidPhaseTitle === 'function') {
      const _pt = raidPhaseTitle;
      raidPhaseTitle = function () {
        if (isRaidSplitActive()) return 'Два зала';
        return _pt();
      };
    }

    if (typeof refreshRaidAlerts === 'function') {
      const _al = refreshRaidAlerts;
      refreshRaidAlerts = function () {
        _al();
        if (!isRaidSplitActive()) return;
        const box = document.getElementById('raid-alerts');
        if (!box) return;
        const extra = raidSplitAlertBits().join(' ');
        if (extra) box.innerHTML = (box.innerHTML ? box.innerHTML + ' ' : '') + extra;
        raidSplitRefreshChrome();
      };
    }

    if (typeof killUnit === 'function') {
      const _kill = killUnit;
      killUnit = function (unit) {
        const wasBoss = !!(unit && (unit.raidBoss || (unit.isBoss && unit.mech && unit.mech.id === 'thunder_king')));
        const r = _kill.apply(this, arguments);
        if (wasBoss && combat && combat.raidSplit && combat.raidSplit.active) {
          for (const e of (combat.enemies || [])) {
            if (e.alive && (e.mechRole === 'echo' || e.mechRole === 'conductor')) {
              e.alive = false;
              e.hp = 0;
            }
          }
          endRaidSplit('Лэй Шэнь пал');
        }
        return r;
      };
    }

    if (typeof addPet === 'function') {
      const _pet = addPet;
      addPet = function (owner, defKey, turnsLeft) {
        const pet = _pet(owner, defKey, turnsLeft);
        if (pet && owner && owner.raidRoom) pet.raidRoom = owner.raidRoom;
        return pet;
      };
    }

    if (typeof bindRaidLobby === 'function') {
      const _bind = bindRaidLobby;
      bindRaidLobby = function () {
        const r = _bind.apply(this, arguments);
        bindRaidSplitUi();
        return r;
      };
    }

    bindRaidSplitUi();
  }

  installRaidSplitHooks();
