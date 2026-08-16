/* raid: 10-man raid test (Тест only) */
  const RAID_SIZE = 10;
  const RAID_NEED = { tank: 2, healer: 2, dps: 6 };
  let gameMode = 'key'; // 'key' | 'raid'
  let raidAutoAllies = true;
  let raidPlayerUid = null;

  const RAID_DUNGEON = {
    id: 'throne',
    name: 'Престол Грома',
    theme: 'jade',
    timerBase: 10 * 60,
    raid: true,
    midName: '—',
    finalName: 'Лэй Шэнь, Повелитель Грома',
  };

  const RAID_PRESET = [
    { classId: 'warrior', specId: 'protection' },
    { classId: 'paladin', specId: 'protection' },
    { classId: 'priest', specId: 'discipline' },
    { classId: 'shaman', specId: 'restoration' },
    { classId: 'mage', specId: 'fire' },
    { classId: 'rogue', specId: 'combat' },
    { classId: 'hunter', specId: 'beast_mastery' },
    { classId: 'warlock', specId: 'demonology' },
    { classId: 'deathknight', specId: 'frost' },
    { classId: 'monk', specId: 'windwalker' },
  ];

  function isRaidRun() { return !!(run && run.raid); }
  function isRaidLobby() { return gameMode === 'raid'; }
  function getPartySize() {
    if (run) return run.raid ? RAID_SIZE : 5;
    return gameMode === 'raid' ? RAID_SIZE : 5;
  }
  function getPartyNeed() {
    return getPartySize() >= RAID_SIZE ? RAID_NEED : { tank: 1, healer: 1, dps: 3 };
  }

  function generateRaidRoute() {
    return {
      nodes: {
        final: {
          id: 'final', type: 'final', name: 'Лэй Шэнь, Повелитель Грома',
          loc: 'throne', next: [], forceBudget: 0, raid: true,
        },
      },
      currentId: 'final',
      visited: [],
      finalCleared: false,
      mopupMode: false,
      seedMeta: { layout: 'raid-10' },
    };
  }

  function setGameMode(mode) {
    const next = mode === 'raid' ? 'raid' : 'key';
    if (gameMode === next) {
      syncRaidLobbyUi();
      return;
    }
    gameMode = next;
    if (party.length > getPartySize()) party = party.slice(0, getPartySize());
    editSlot = null;
    syncRaidLobbyUi();
    renderParty();
    refreshAffixes();
    refreshKeystone();
    savePartyProfile();
  }

  function syncRaidLobbyUi() {
    const raid = isRaidLobby();
    document.body.classList.toggle('raid-lobby', raid);
    const title = document.querySelector('.lobby-party-col .section-title');
    if (title && !title.dataset.base) title.dataset.base = title.textContent;
    if (title) {
      title.textContent = raid
        ? 'Рейд (10 слотов) — 2 танка · 2 хила · 6 бойцов'
        : 'Отряд (5 слотов) — клик по слоту, чтобы заменить';
    }
    const slots = document.getElementById('party-slots');
    if (slots) slots.classList.toggle('raid-slots', raid);
    const preview = document.getElementById('skill-preview');
    if (preview && /отряд|рейд/i.test(preview.textContent) && !pickClass) {
      preview.textContent = raid
        ? 'Выберите класс, затем специализацию. Справа — рейд 10 (2 танка, 2 целителя, 6 бойцов).'
        : 'Выберите класс, затем специализацию. Справа — отряд (1 танк, 1 целитель, 3 бойца).';
    }
    const ds = document.getElementById('dungeon-select');
    if (ds) {
      if (raid) {
        ds.innerHTML = `<option value="throne">${RAID_DUNGEON.name}</option>`;
        ds.value = 'throne';
        ds.disabled = true;
      } else {
        const prev = ds.value === 'throne' ? 'crypts' : ds.value;
        ds.disabled = false;
        ds.innerHTML = DUNGEONS.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        if ([...ds.options].some(o => o.value === prev)) ds.value = prev;
      }
    }
    const start = document.getElementById('btn-start');
    if (start) start.textContent = raid ? 'Войти в рейд · Лэй Шэнь' : 'Взять ключ и войти';
    const fill = document.getElementById('btn-fill-raid');
    if (fill) fill.classList.toggle('hidden', !raid);
    const hint = document.getElementById('raid-hint');
    if (hint) hint.classList.toggle('hidden', !raid);
    document.getElementById('btn-mode-key')?.classList.toggle('on', !raid);
    document.getElementById('btn-mode-raid')?.classList.toggle('on', raid);
    const affixTitle = [...document.querySelectorAll('.lobby-party-col .section-title')]
      .find(el => /Аффикс/.test(el.textContent || ''));
    affixTitle?.classList.toggle('hidden', raid);
    document.getElementById('week-badge')?.classList.toggle('hidden', raid);
    document.getElementById('affix-list')?.classList.toggle('hidden', raid);
    refreshKeystone();
  }

  function fillRaidPreset() {
    party = RAID_PRESET.map(p => {
      const e = { classId: p.classId, specId: p.specId, sec: defaultSec(), gear: emptyGear() };
      ensureSec(e);
      return e;
    });
    editSlot = null;
    renderParty();
    savePartyProfile();
    toast('Собран рейд 10: 2 танка · 2 хила · 6 бойцов');
  }

  function shouldRaidAuto(actor) {
    if (!isRaidRun() || !actor || actor.side !== 'ally' || actor.isPet) return false;
    if (!raidAutoAllies) return false;
    if (!raidPlayerUid || !run.party.some(p => p.uid === raidPlayerUid && p.alive)) {
      const tank = run.party.find(p => p.role === 'tank' && p.alive);
      raidPlayerUid = tank?.uid || run.party.find(p => p.alive)?.uid || null;
    }
    return actor.uid !== raidPlayerUid;
  }

  function setRaidFocus(hero) {
    if (!isRaidRun() || !hero || hero.side !== 'ally' || hero.isPet) return;
    if (!hero.alive) return toast('Мёртв');
    raidPlayerUid = hero.uid;
    toast('Управляете: ' + (hero.fullName || hero.name));
    try { renderCombat(); } catch (_) {}
  }

  function raidFocusClass(u) {
    if (!isRaidRun() || !u || u.side !== 'ally' || u.isPet) return '';
    return u.uid === raidPlayerUid ? ' raid-focus' : '';
  }

  function currentMainTank(enemy) {
    const tanks = livingHeroes().filter(h => h.role === 'tank');
    if (!tanks.length) return livingHeroes()[0] || null;
    if (!enemy) return tanks[0];
    let mt = tanks[0], best = -1;
    for (const t of tanks) {
      const v = (enemy.threat && enemy.threat[t.uid]) || 0;
      if (v > best) { mt = t; best = v; }
    }
    return mt;
  }

  function raidBossTpl() {
    return (ENEMIES.raidBosses && ENEMIES.raidBosses.leishen) || null;
  }

  function spawnRaidEncounter() {
    const k = run.keyLevel;
    const tpl = raidBossTpl();
    if (!tpl) return [];
    const boss = scaleEnemy(tpl, k, true, false);
    boss.maxHp = Math.round(boss.maxHp * 1.15);
    boss.hp = boss.maxHp;
    boss.atk = Math.round(boss.atk * 1.08);
    boss.raidBoss = true;
    return [boss];
  }

  function bindRaidLobby() {
    document.getElementById('btn-mode-key')?.addEventListener('click', () => setGameMode('key'));
    document.getElementById('btn-mode-raid')?.addEventListener('click', () => setGameMode('raid'));
    document.getElementById('btn-fill-raid')?.addEventListener('click', fillRaidPreset);
    const auto = document.getElementById('btn-raid-auto');
    if (auto) {
      auto.addEventListener('click', () => {
        raidAutoAllies = !raidAutoAllies;
        auto.classList.toggle('on', raidAutoAllies);
        auto.textContent = raidAutoAllies ? 'Авто-рейд: вкл' : 'Авто-рейд: выкл';
        toast(raidAutoAllies
          ? 'Союзники ходят сами. Клик по герою — взять управление'
          : 'Вы ходите всеми десятью');
      });
    }
  }

  function raidHudPatch() {
    if (!isRaidRun()) return;
    const forces = document.getElementById('hud-forces');
    if (forces) {
      forces.textContent = '⚔ Рейд 10';
      forces.title = 'Тест рейдового босса на 10 человек';
    }
    const ff = document.getElementById('forces-fill');
    if (ff) {
      const boss = (combat?.enemies || []).find(e => e.isBoss && e.alive);
      const pct = boss ? clamp(boss.hp / Math.max(1, boss.maxHp) * 100, 0, 100) : 0;
      ff.style.width = pct + '%';
      ff.style.background = 'linear-gradient(90deg, #2a6a9a, #7ad0ff)';
    }
    const auto = document.getElementById('btn-raid-auto');
    if (auto) {
      auto.classList.remove('hidden');
      auto.classList.toggle('on', raidAutoAllies);
      auto.textContent = raidAutoAllies ? 'Авто-рейд: вкл' : 'Авто-рейд: выкл';
    }
    const allyTitle = document.querySelector('#ally-row')?.previousElementSibling;
    if (allyTitle) allyTitle.textContent = 'Рейд (клик — взять управление)';
  }

  function showRaidBriefing() {
    const el = document.getElementById('phase-sub');
    if (el) el.textContent = '';
  }

  function raidAllyAi(actor) {
    if (!actor?.alive) return false;
    const foes = living('enemy').filter(e => !e.vaultAway);
    const friends = livingHeroes();
    const usable = actor.abilities.filter(a => canPay(actor, a));
    if (!usable.length) return false;
    const boss = foes.find(e => e.isBoss) || foes[0];
    const conductors = foes.filter(e => e.mechRole === 'conductor' || e.mustKillTurns);
    const lowestAlly = (list) => {
      const a = (list || friends).filter(u => u && u.alive);
      if (!a.length) return null;
      return a.slice().sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
    };

    const casting = foes.find(e => e.casting);
    const kick = usable.find(a => typeof isKickAbility === 'function' ? isKickAbility(a) : (a.type === 'interrupt' || (typeof INTERRUPT_IDS !== 'undefined' && INTERRUPT_IDS.has(a.id))));
    if (casting && kick) {
      castAbility(actor, kick, casting);
      return true;
    }

    if (actor.role === 'tank') {
      const ov = (h) => (h.buffs || []).find(b => b.id === 'overload');
      const myStacks = ov(actor)?.stacks || 0;
      const other = friends.find(h => h.role === 'tank' && h.uid !== actor.uid);
      const otherStacks = other ? (ov(other)?.stacks || 0) : 0;
      const mt = currentMainTank(boss);
      const iAmMt = mt && mt.uid === actor.uid;
      const taunt = usable.find(a => a.type === 'taunt');
      if (taunt && other && otherStacks >= 2 && iAmMt === false) {
        castAbility(actor, taunt, null);
        return true;
      }
      if (taunt && myStacks >= 3 && iAmMt) {
        // too late — still try to hold with a def
      } else if (taunt && other && otherStacks >= 2 && iAmMt) {
        // stay, OT should taunt
      }
      if (actor.hp / actor.maxHp < 0.45) {
        const def = usable.find(a => (a.type === 'shield' || a.type === 'buff') && abilityTargetRule(a) === 'self_only');
        if (def) { castAbility(actor, def, actor); return true; }
      }
    }

    if (actor.role === 'healer') {
      const crit = lowestAlly(friends.filter(h => h.hp / h.maxHp < 0.55));
      const any = lowestAlly(friends.filter(h => h.hp < h.maxHp));
      const aoeHeal = usable.find(a => a.type === 'heal_aoe');
      const hurtCount = friends.filter(h => h.hp / h.maxHp < 0.8).length;
      if (aoeHeal && hurtCount >= 3) { castAbility(actor, aoeHeal, actor); return true; }
      const heal = usable.find(a => a.type === 'heal');
      const target = crit || (any && any.hp / any.maxHp < 0.92 ? any : null);
      if (heal && target) {
        castAbility(actor, heal, abilityTargetRule(heal) === 'self_only' ? actor : target);
        return true;
      }
    }

    const prio = conductors[0] || boss || foes[0];
    if (!prio) return false;
    const exec = usable.find(a => typeof EXECUTE_IDS !== 'undefined' && EXECUTE_IDS.has(a.id));
    if (exec && prio.hp / prio.maxHp <= 0.35) { castAbility(actor, exec, prio); return true; }
    const aoe = usable.find(a => a.type === 'aoe');
    if (aoe && foes.length >= 2) { castAbility(actor, aoe, null); return true; }
    const dmg = usable.find(a => a.type === 'damage' || a.type === 'dot') || usable[0];
    if (dmg) {
      const rule = abilityTargetRule(dmg);
      if (rule === 'self_only') castAbility(actor, dmg, actor);
      else if (rule === 'ally_any') castAbility(actor, dmg, lowestAlly() || actor);
      else castAbility(actor, dmg, prio);
      return true;
    }
    return false;
  }

  const VAULT_LOC = 'depths';
  const VAULT_WAVES = [
    [{ addId: 'b', addName: 'Страж дворца', addHp: 0.55 }, { addId: 'a', addName: 'Копейщик династии', addHp: 0.5 }, { addId: 'r', addName: 'Жрец грома', addHp: 0.48 }],
    [{ addId: 'c', addName: 'Капитан стражи', addHp: 0.55 }, { addId: 'j', addName: 'Нефритовый палач', addHp: 0.5 }, { addId: 's', addName: 'Ткач молний', addHp: 0.48 }],
    [{ addId: 'sg', addName: 'Хранитель свода', addHp: 0.62 }, { addId: 'b', addName: 'Каменный страж', addHp: 0.58 }],
  ];
  const VAULT_CAST_MAX = 8;

  function raidBossPortraitUrl() {
    try { return ASSETS.enemyP('ls'); } catch (_) { return ''; }
  }

  function raidPhaseTitle() {
    const boss = (combat?.enemies || []).find(e => e.raidBoss || (e.isBoss && e.mech?.id === 'thunder_king'));
    if (combat?.vault && !combat.vault.dropped) return 'Под дворцом';
    if (!boss) return 'Рейд 10';
    const r = boss.hp / Math.max(1, boss.maxHp);
    if (r <= 0.15) return 'Ярость императора';
    if (r <= 0.40) return 'Расколотое небо';
    if (r <= 0.50) return 'Провал';
    if (r <= 0.70) return 'Зал проводников';
    return 'Престол грома';
  }

  function refreshRaidAlerts() {
    const nameEl = document.getElementById('raid-phase-name');
    const box = document.getElementById('raid-alerts');
    const hud = document.getElementById('raid-phase-hud');
    if (!isRaidRun()) {
      hud?.classList.add('hidden');
      document.getElementById('raid-cast-dock')?.classList.add('hidden');
      return;
    }
    if (nameEl) nameEl.textContent = raidPhaseTitle();
    const bits = [];
    const heroes = typeof livingHeroes === 'function' ? livingHeroes() : [];
    const ov = heroes.filter(h => (h.buffs || []).some(b => b.id === 'overload'));
    for (const h of ov) {
      const s = (h.buffs.find(b => b.id === 'overload') || {}).stacks || 1;
      bits.push(`<span class="raid-alert warn">${h.name}: перегрузка ×${s}${s >= 2 ? ' — смена!' : ''}</span>`);
    }
    const conds = (combat?.enemies || []).filter(e => e.alive && e.mechRole === 'conductor');
    for (const c of conds) {
      bits.push(`<span class="raid-alert danger">${c.name}: взрыв через ${c.mustKillTurns || '?'} р.</span>`);
    }
    const soaks = heroes.filter(h => (h.buffs || []).some(b => b.id === 'soak_orb'));
    if (combat?.soakNeed) {
      bits.push(`<span class="raid-alert soak">Соки: клик по герою · ${soaks.length}/${combat.soakNeed}</span>`);
    } else if (soaks.length) {
      bits.push(`<span class="raid-alert soak">Сок: ${soaks.map(h => h.name).join(', ')} (HP &gt; 35%)</span>`);
    }
    const marks = heroes.filter(h => (h.buffs || []).some(b => b.id === 'storm_mark'));
    if (marks.length) {
      const linked = marks.length >= 2 && marks.every(h => !h.raidSpread);
      bits.push(`<span class="raid-alert${linked ? ' danger' : ''}">Молния: ${marks.map(h => h.name + (h.raidSpread ? ' (отошёл)' : '')).join(', ')}${linked ? ' — связаны!' : ''}</span>`);
    }
    if (box) box.innerHTML = bits.join(' ');
    if (hud) hud.classList.toggle('hidden', !bits.length);
    const dock = document.getElementById('raid-cast-dock');
    if (dock && combat?.vault && !combat.vault.dropped) {
      dock.classList.remove('hidden');
      const img = document.getElementById('raid-cast-portrait');
      if (img && !img.src) img.src = raidBossPortraitUrl();
      const fill = document.getElementById('raid-cast-fill');
      const pct = Math.round((combat.vault.cast / Math.max(1, combat.vault.castMax)) * 100);
      if (fill) fill.style.width = pct + '%';
      const sp = document.getElementById('raid-cast-spell');
      if (sp) sp.textContent = 'Небесный гнев · ' + combat.vault.cast + '/' + combat.vault.castMax;
    } else {
      dock?.classList.add('hidden');
    }
  }

  function startRaidSoakAssign(n) {
    if (!combat) return;
    combat.soakNeed = n || 3;
    log('Сферы молнии! Кликните ' + combat.soakNeed + ' героев — они сокают (держите HP выше 35%).', 'system');
    toast('Кликните ' + combat.soakNeed + ' героев для сока');
    refreshRaidAlerts();
    try { renderCombat(); } catch (_) {}
  }

  function tryAssignRaidSoak(unit) {
    if (!combat?.soakNeed || !unit || !unit.alive || unit.isPet) return false;
    if ((unit.buffs || []).some(b => b.id === 'soak_orb')) {
      toast('Уже назначен');
      return true;
    }
    const have = (typeof livingHeroes === 'function' ? livingHeroes() : []).filter(h => (h.buffs || []).some(b => b.id === 'soak_orb')).length;
    if (have >= combat.soakNeed) return false;
    applyStatus(unit, {
      id: 'soak_orb', name: 'Сфера молнии', icon: '💠', turns: 3,
      tip: 'Сок: останьтесь выше 35% HP, иначе сфера рванёт рейд.',
    });
    log(unit.name + ' принимает сферу (' + (have + 1) + '/' + combat.soakNeed + ')', 'system');
    if (have + 1 >= combat.soakNeed) {
      combat.soakNeed = 0;
      toast('Соки назначены');
    }
    refreshRaidAlerts();
    try { renderCombat(); } catch (_) {}
    return true;
  }

  function linkRaidStormMarks() {
    const marks = (typeof livingHeroes === 'function' ? livingHeroes() : []).filter(h =>
      (h.buffs || []).some(b => b.id === 'storm_mark'));
    if (marks.length < 2) return;
    if (marks.every(h => !h.raidSpread)) {
      for (const h of marks) {
        const b = (h.buffs || []).find(x => x.id === 'storm_mark');
        if (b && !b._linked) {
          b.dot = Math.round((Number(b.dot) || 0) * 2);
          b._linked = true;
          b.name = 'Метка молнии (связь)';
        }
      }
      log('Метки молнии связались — тик удвоен. На своём ходу: «Разойтись».', 'enemy');
      toast('Метки связались!');
    }
    refreshRaidAlerts();
  }

  function onRaidTaunt(actor) {
    if (!isRaidRun() || !actor || actor.role !== 'tank') return;
    for (const h of (typeof livingHeroes === 'function' ? livingHeroes() : [])) {
      if (h.uid === actor.uid) continue;
      if ((h.buffs || []).some(b => b.id === 'overload')) {
        h.buffs = h.buffs.filter(b => b.id !== 'overload');
        log(actor.name + ' принимает удар — перегрузка с ' + h.name + ' сброшена.', 'player');
        toast('Смена танков!');
      }
    }
    refreshRaidAlerts();
  }

  function forceBattleLoc(loc) {
    if (!combat) return;
    combat.battleLoc = loc;
    const ba = document.getElementById('battle-area');
    if (ba) delete ba.dataset.bgUrl;
    if (typeof applyRoomBackground === 'function') applyRoomBackground(currentRouteNode());
  }

  function playFloorCrack(toLoc, onDone) {
    const layer = document.getElementById('raid-fx-layer');
    const ba = document.getElementById('battle-area');
    if (!layer || !ba) { forceBattleLoc(toLoc); if (onDone) onDone(); return; }
    combat.vaultLock = true;
    const from = getComputedStyle(ba).getPropertyValue('--battle-bg') || '';
    layer.classList.remove('hidden');
    layer.innerHTML = '<div class="raid-flash"></div><div class="raid-shatter"></div>';
    const grid = layer.querySelector('.raid-shatter');
    const cols = 5, rows = 4;
    for (let i = 0; i < cols * rows; i++) {
      const t = document.createElement('i');
      const c = i % cols, r = Math.floor(i / cols);
      t.style.backgroundImage = from;
      t.style.backgroundSize = (cols * 100) + '% ' + (rows * 100) + '%';
      t.style.backgroundPosition = (c / (cols - 1) * 100) + '% ' + (r / (rows - 1) * 100) + '%';
      t.style.setProperty('--dx', ((c - 2) * 80) + 'px');
      t.style.setProperty('--dy', (40 + r * 70) + 'px');
      t.style.setProperty('--rot', ((c % 2 ? 1 : -1) * (12 + r * 8)) + 'deg');
      t.style.animationDelay = (i * 18) + 'ms';
      grid.appendChild(t);
    }
    forceBattleLoc(toLoc);
    setTimeout(() => {
      layer.classList.add('hidden');
      layer.innerHTML = '';
      combat.vaultLock = false;
      if (onDone) onDone();
    }, 1100);
  }

  function spawnVaultWave() {
    const boss = (combat.enemies || []).find(e => e.raidBoss || (e.isBoss && e.mech?.id === 'thunder_king'));
    if (!boss || !combat.vault) return;
    const wave = VAULT_WAVES[combat.vault.wave];
    if (!wave) return;
    for (const spec of wave) {
      const add = spawnMechAdd(boss, { ...spec, role: 'vault_trash' });
      if (add) add.mustKillTurns = 0;
    }
    combat.vault.wave += 1;
    log('Волна стражи ' + combat.vault.wave + '/' + VAULT_WAVES.length + ' — убейте быстрее, пока каст не заполнится!', 'enemy');
    toast('Волна ' + combat.vault.wave + ' · бейте треш');
    try { if (typeof buildTurnQueue === 'function') buildTurnQueue(); } catch (_) {}
    try { renderCombat(); } catch (_) {}
    refreshRaidAlerts();
  }

  function maybeTriggerRaidVault(target) {
    if (!isRaidRun() || !target || !target.alive) return;
    if (!target.raidBoss && !(target.isBoss && target.mech && target.mech.id === 'thunder_king')) return;
    if (target._vaultInter) return;
    if (target.hp / Math.max(1, target.maxHp) > 0.5) return;
    target._vaultInter = true;
    beginRaidVault(target);
  }

  function beginRaidVault(boss) {
    if (!combat || !boss) return;
    (combat.enemies || []).forEach(e => {
      if (e.mechRole === 'conductor' && e.alive) { e.alive = false; e.hp = 0; }
    });
    boss.vaultAway = true;
    combat.vault = { wave: 0, cast: 0, castMax: VAULT_CAST_MAX, dropped: false };
    const img = document.getElementById('raid-cast-portrait');
    if (img) img.src = raidBossPortraitUrl();
    log('Пол рушится! Рейд проваливается под дворец. Лэй Шэнь читает Небесный гнев — не дайте шкале заполниться.', 'enemy');
    toast('Провал под дворец!');
    playFloorCrack(VAULT_LOC, () => {
      spawnVaultWave();
      refreshRaidAlerts();
      if (typeof scheduleProcessTurn === 'function') scheduleProcessTurn(80);
    });
  }

  function tickRaidVaultCast(boss) {
    if (!combat?.vault || combat.vault.dropped) return;
    combat.vault.cast = (combat.vault.cast || 0) + 1;
    refreshRaidAlerts();
    if (combat.vault.cast >= combat.vault.castMax) {
      combat.vault.cast = 0;
      const heroes = typeof livingHeroes === 'function' ? livingHeroes() : [];
      for (const h of heroes) {
        if (!h.alive) continue;
        const raw = Math.round(h.maxHp * 0.8);
        dealTrue(h, raw, boss, 'aoe', { school: 'nature', abilityName: 'Небесный гнев', isAoe: true });
      }
      log('Небесный гнев! Весь рейд получает 80% здоровья.', 'enemy');
      toast('Небесный гнев — 80%!');
    }
    raidVaultMaybeAdvance();
  }

  function playBossFall(onDone) {
    const dock = document.getElementById('raid-cast-dock');
    const layer = document.getElementById('raid-fx-layer');
    if (!dock || !layer) { if (onDone) onDone(); return; }
    combat.vaultLock = true;
    const img = document.getElementById('raid-cast-portrait');
    const r = img ? img.getBoundingClientRect() : dock.getBoundingClientRect();
    layer.classList.remove('hidden');
    const ghost = document.createElement('img');
    ghost.className = 'raid-boss-fall';
    ghost.src = (img && img.src) || raidBossPortraitUrl();
    ghost.style.left = r.left + 'px';
    ghost.style.top = r.top + 'px';
    ghost.style.width = r.width + 'px';
    ghost.style.height = r.height + 'px';
    layer.appendChild(ghost);
    dock.classList.add('hidden');
    requestAnimationFrame(() => {
      ghost.style.left = 'calc(50% - 70px)';
      ghost.style.top = '42%';
      ghost.style.width = '140px';
      ghost.style.height = '140px';
      ghost.style.transform = 'rotate(12deg)';
    });
    setTimeout(() => {
      layer.classList.add('hidden');
      layer.innerHTML = '';
      combat.vaultLock = false;
      if (onDone) onDone();
    }, 900);
  }

  function dropBossIntoVault() {
    if (!combat?.vault || combat.vault.dropped) return;
    combat.vault.dropped = true;
    const boss = (combat.enemies || []).find(e => e.raidBoss || (e.isBoss && e.mech?.id === 'thunder_king'));
    playBossFall(() => {
      if (boss) {
        boss.vaultAway = false;
        log('Лэй Шэнь обрушивается в свод! Фон тот же — добивайте его здесь.', 'enemy');
        toast('Босс падает в комнату!');
      }
      try { if (typeof buildTurnQueue === 'function') buildTurnQueue(); } catch (_) {}
      try { renderCombat(); } catch (_) {}
      refreshRaidAlerts();
      if (typeof scheduleProcessTurn === 'function') scheduleProcessTurn(80);
    });
  }

  function raidVaultMaybeAdvance() {
    if (!isRaidRun() || !combat?.vault || combat.vault.dropped) return;
    const trash = (combat.enemies || []).filter(e => e.alive && !e.raidBoss && !e.vaultAway && e.mechRole === 'vault_trash');
    if (trash.length) return;
    if (combat.vault.wave < VAULT_WAVES.length) spawnVaultWave();
    else dropBossIntoVault();
  }

  const _raidHudPatchBase = raidHudPatch;
  raidHudPatch = function () {
    _raidHudPatchBase();
    refreshRaidAlerts();
  };
