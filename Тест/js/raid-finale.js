/* raid-finale: Lei Shen last stand after existing raid phases. Тест only. */
  const RAID_FINALE_BG = 'assets/backgrounds/leishen-finale.jpg';
  const RAID_FINALE_CINE_BG = 'assets/backgrounds/leishen-victory.png';
  const RAID_FINALE_STEPS = 6;
  const RAID_FINALE_WIPE = 8;
  const RAID_FINALE_BLAST_PCT = 0.12;
  const RAID_FINALE_CINE_MS = 3200;

  let raidFinaleTurnTimer = 0;
  let raidFinaleRaf = 0;
  let raidFinaleBound = false;

  function isRaidFinaleActive() {
    return !!(typeof isRaidRun === 'function' && isRaidRun() && combat && combat.finale && combat.finale.active);
  }

  function raidFinaleReduceMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function isLeiShenUnit(u) {
    return !!(u && (u.raidBoss || (u.isBoss && u.mech && u.mech.id === 'thunder_king')));
  }

  function raidFinaleTurnMs() {
    const spd = (typeof gameSpeed === 'number' && gameSpeed > 0) ? gameSpeed : 1;
    return Math.max(900, Math.round(2400 / spd));
  }

  function startRaidFinale(boss) {
    return false;
    if (typeof isRaidRun !== 'function' || !isRaidRun() || !combat || !boss) return false;
    if (combat.finale && combat.finale.active) return true;
    if (boss._finaleDone || boss._finaleStarted) return false;
    if (!isLeiShenUnit(boss)) return false;
    if (combat.vault && !combat.vault.dropped) return false;

    const ratio = boss.hp / Math.max(1, boss.maxHp);
    const lethal = boss.hp <= 0 || boss.alive === false;
    if (!lethal && ratio > 0.05) return false;
    if (typeof isRaidSplitActive === 'function' && isRaidSplitActive() && !lethal) return false;

    boss._finaleStarted = true;
    if (typeof isRaidSplitActive === 'function' && isRaidSplitActive() && typeof endRaidSplit === 'function') {
      try { endRaidSplit('Небесный гнев'); } catch (_) { /* ignore */ }
    }

    boss.alive = true;
    boss.hp = Math.max(1, boss.hp);
    boss.vaultAway = true;
    boss.casting = null;
    for (const e of (combat.enemies || [])) {
      if (e && e.alive && !isLeiShenUnit(e)) {
        e.alive = false;
        e.hp = 0;
      }
    }

    combat.finale = {
      active: true,
      stage: 'blast',
      steps: 0,
      stepsNeed: RAID_FINALE_STEPS,
      wipe: 0,
      wipeMax: RAID_FINALE_WIPE,
      turnOpen: false,
      ended: false,
    };
    combat.vaultLock = true;
    combat.waitingPlayer = false;
    try { pendingTarget = null; } catch (_) { /* ignore */ }

    const bar = document.getElementById('ability-bar');
    const actions = document.getElementById('combat-actions');
    if (bar) bar.innerHTML = '';
    if (actions) actions.innerHTML = '';
    try { if (typeof hidePassivePocket === 'function') hidePassivePocket(); } catch (_) { /* ignore */ }

    log('Лэй Шэнь бьёт рейд молнией. Арена гибнет — бегите к трону, пока Небесный гнев не дочитается.', 'enemy');
    toast('Небесный гнев — бегите к боссу!');
    raidFinaleBlastThenRun(boss);
    return true;
  }

  function raidFinaleEnsureRoot() {
    let root = document.getElementById('raid-finale');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'raid-finale';
    root.className = 'raid-finale';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<div class="raid-finale-bg" aria-hidden="true"></div>' +
      '<div class="raid-finale-flash" aria-hidden="true"></div>' +
      '<canvas class="raid-finale-bolts" aria-hidden="true"></canvas>' +
      '<div class="raid-finale-blown" aria-hidden="true"></div>' +
      '<div class="raid-finale-stage hidden">' +
        '<div class="raid-finale-boss">' +
          '<img class="raid-finale-boss-art" alt="" />' +
          '<div class="raid-finale-boss-name">Лэй Шэнь</div>' +
        '</div>' +
        '<button type="button" class="raid-finale-path" aria-label="Бежать вперёд"></button>' +
        '<div class="raid-finale-raid" aria-hidden="true"></div>' +
        '<div class="raid-finale-hud">' +
          '<div class="raid-finale-cast">' +
            '<div class="raid-finale-cast-label">Небесный гнев · <span data-wipe>0</span>/<span data-wipe-max>8</span></div>' +
            '<div class="raid-finale-cast-bar"><i></i></div>' +
          '</div>' +
          '<div class="raid-finale-dist">До трона: <span data-steps>0</span> / <span data-need>6</span> шагов</div>' +
          '<button type="button" class="btn btn-primary raid-finale-run">Бежать</button>' +
          '<div class="raid-finale-hint">Кликните «Бежать», дорожку или пробел каждый ход. Если каст заполнится раньше — рейд мёртв.</div>' +
          '<div class="raid-finale-turn"><i></i></div>' +
        '</div>' +
      '</div>' +
      '<div class="raid-finale-cine hidden" aria-hidden="true">' +
        '<div class="raid-finale-cine-bg"></div>' +
        '<div class="raid-finale-cine-veil"></div>' +
        '<div class="raid-finale-cine-text">' +
          '<div class="raid-finale-cine-title">Лэй Шэнь повержен</div>' +
          '<div class="raid-finale-cine-sub">Гром стихает. Трон пуст.</div>' +
        '</div>' +
        '<button type="button" class="btn raid-finale-skip">Пропустить</button>' +
      '</div>';
    document.body.appendChild(root);
    const runBtn = root.querySelector('.raid-finale-run');
    const path = root.querySelector('.raid-finale-path');
    const skip = root.querySelector('.raid-finale-skip');
    if (runBtn) runBtn.addEventListener('click', () => raidFinaleTryRun());
    if (path) path.addEventListener('click', () => raidFinaleTryRun());
    if (skip) skip.addEventListener('click', () => raidFinaleSkipCine());
    return root;
  }

  function raidFinaleStrikeGroup(boss) {
    const heroes = typeof livingHeroes === 'function' ? livingHeroes() : [];
    for (const h of heroes) {
      if (!h || !h.alive) continue;
      const raw = Math.round(h.maxHp * RAID_FINALE_BLAST_PCT);
      const leave = Math.max(0, h.hp - 1);
      const dmg = Math.min(raw, leave);
      if (dmg > 0 && typeof dealTrue === 'function') {
        dealTrue(h, dmg, boss, 'aoe', {
          school: 'nature',
          abilityName: 'Молния трона',
          isAoe: true,
          raidIgnoreRoom: true,
        });
      }
    }
    try { if (typeof renderCombat === 'function') renderCombat(); } catch (_) { /* ignore */ }
    try { if (typeof refreshRaidAlerts === 'function') refreshRaidAlerts(); } catch (_) { /* ignore */ }
  }

  function raidFinaleBlowCards() {
    const root = raidFinaleEnsureRoot();
    const layer = root.querySelector('.raid-finale-blown');
    if (!layer) return;
    layer.innerHTML = '';
    const nodes = document.querySelectorAll(
      '#ally-row .unit, #enemy-row .unit, #boss-frame, .raid-split-friends .unit, .raid-split-foes .unit'
    );
    let i = 0;
    nodes.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return;
      const ghost = el.cloneNode(true);
      ghost.classList.add('raid-finale-ghost');
      ghost.style.left = r.left + 'px';
      ghost.style.top = r.top + 'px';
      ghost.style.width = r.width + 'px';
      ghost.style.height = r.height + 'px';
      const dx = (Math.random() * 2 - 1) * 220;
      const dy = 70 + Math.random() * 180;
      const rot = (Math.random() * 2 - 1) * 32;
      ghost.style.setProperty('--dx', dx + 'px');
      ghost.style.setProperty('--dy', dy + 'px');
      ghost.style.setProperty('--rot', rot + 'deg');
      ghost.style.animationDelay = (i * 26) + 'ms';
      layer.appendChild(ghost);
      i += 1;
    });
  }

  function raidFinalePlayBolts(ms) {
    const root = raidFinaleEnsureRoot();
    const canvas = root.querySelector('.raid-finale-bolts');
    if (!canvas || typeof midpointBolt !== 'function') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    canvas.width = Math.max(2, Math.floor(cssW * dpr));
    canvas.height = Math.max(2, Math.floor(cssH * dpr));
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    const w = canvas.width;
    const h = canvas.height;
    const started = performance.now();
    const specs = [
      { x: 0.18, fat: true, branch: 3 },
      { x: 0.42, fat: false, branch: 2 },
      { x: 0.58, fat: true, branch: 3 },
      { x: 0.82, fat: false, branch: 2 },
      { x: 0.5, sideways: true, fat: false, branch: 1 },
    ];
    const bolts = specs.map((s) => typeof buildStrike === 'function' ? buildStrike(w, h, s) : null).filter(Boolean);
    const tick = (now) => {
      const t = now - started;
      ctx.clearRect(0, 0, w, h);
      const flash = Math.max(0, 1 - t / 280);
      if (flash > 0.02) {
        ctx.fillStyle = 'rgba(210, 236, 255,' + (flash * 0.45) + ')';
        ctx.fillRect(0, 0, w, h);
      }
      const fade = t > ms - 280 ? Math.max(0, 1 - (t - (ms - 280)) / 280) : 1;
      ctx.globalAlpha = fade;
      for (const b of bolts) {
        if (typeof strokeBolt !== 'function') continue;
        strokeBolt(ctx, b.main, b.fat ? 5.2 : 3.2, 'rgba(220,244,255,0.95)', 14);
        strokeBolt(ctx, b.main, b.fat ? 2.1 : 1.3, 'rgba(255,255,255,0.95)', 4);
        for (const br of (b.branches || [])) {
          strokeBolt(ctx, br, 1.4, 'rgba(180,220,255,0.8)', 8);
        }
      }
      ctx.globalAlpha = 1;
      if (t < ms) raidFinaleRaf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    if (raidFinaleRaf) cancelAnimationFrame(raidFinaleRaf);
    raidFinaleRaf = requestAnimationFrame(tick);
  }

  function raidFinaleBlastThenRun(boss) {
    const root = raidFinaleEnsureRoot();
    const reduce = raidFinaleReduceMotion();
    root.classList.add('on');
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('raid-finale-on');
    const bg = root.querySelector('.raid-finale-bg');
    if (bg) bg.style.backgroundImage = 'url("' + RAID_FINALE_BG + '")';
    raidFinaleStrikeGroup(boss);
    if (reduce) {
      raidFinaleEnterRun(boss);
      return;
    }
    const flash = root.querySelector('.raid-finale-flash');
    if (flash) {
      flash.classList.remove('go');
      void flash.offsetWidth;
      flash.classList.add('go');
    }
    raidFinaleBlowCards();
    raidFinalePlayBolts(1100);
    setTimeout(() => raidFinaleEnterRun(boss), 1150);
  }

  function raidFinaleEnterRun(boss) {
    if (!combat || !combat.finale || combat.finale.ended) return;
    combat.finale.stage = 'run';
    const root = raidFinaleEnsureRoot();
    const blown = root.querySelector('.raid-finale-blown');
    if (blown) blown.innerHTML = '';
    const stage = root.querySelector('.raid-finale-stage');
    if (stage) stage.classList.remove('hidden');
    const art = root.querySelector('.raid-finale-boss-art');
    const src = (typeof raidBossPortraitUrl === 'function') ? raidBossPortraitUrl() : '';
    if (art && src) art.src = src;
    raidFinaleFillRaidTokens();
    raidFinalePaintHud();
    raidFinaleOpenTurn();
    try { if (typeof refreshRaidAlerts === 'function') refreshRaidAlerts(); } catch (_) { /* ignore */ }
  }

  function raidFinaleFillRaidTokens() {
    const box = document.querySelector('#raid-finale .raid-finale-raid');
    if (!box) return;
    box.innerHTML = '';
    const heroes = (run && run.party) ? run.party.filter(h => h && !h.isPet) : [];
    for (const h of heroes) {
      const el = document.createElement('span');
      el.className = 'raid-finale-token' + (h.alive ? '' : ' dead');
      el.title = h.fullName || h.name || '';
      const src = typeof portraitSrc === 'function' ? portraitSrc(h) : '';
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        el.appendChild(img);
      } else {
        el.textContent = h.icon || '⚔';
      }
      box.appendChild(el);
    }
    raidFinalePlaceRaid();
  }

  function raidFinalePlaceRaid() {
    const f = combat && combat.finale;
    const box = document.querySelector('#raid-finale .raid-finale-raid');
    if (!f || !box) return;
    const p = Math.min(1, f.steps / Math.max(1, f.stepsNeed));
    box.style.setProperty('--run', String(p));
  }

  function raidFinalePaintHud() {
    const f = combat && combat.finale;
    const root = document.getElementById('raid-finale');
    if (!f || !root) return;
    const wipeEl = root.querySelector('[data-wipe]');
    const wipeMaxEl = root.querySelector('[data-wipe-max]');
    const stepsEl = root.querySelector('[data-steps]');
    const needEl = root.querySelector('[data-need]');
    const bar = root.querySelector('.raid-finale-cast-bar i');
    if (wipeEl) wipeEl.textContent = String(f.wipe);
    if (wipeMaxEl) wipeMaxEl.textContent = String(f.wipeMax);
    if (stepsEl) stepsEl.textContent = String(f.steps);
    if (needEl) needEl.textContent = String(f.stepsNeed);
    if (bar) bar.style.width = Math.round((f.wipe / Math.max(1, f.wipeMax)) * 100) + '%';
    const btn = root.querySelector('.raid-finale-run');
    if (btn) btn.disabled = !f.turnOpen || f.stage !== 'run';
    raidFinalePlaceRaid();
  }

  function raidFinaleClearTurnTimer() {
    if (raidFinaleTurnTimer) {
      clearTimeout(raidFinaleTurnTimer);
      raidFinaleTurnTimer = 0;
    }
  }

  function raidFinaleOpenTurn() {
    if (!combat || !combat.finale || combat.finale.ended) return;
    if (combat.finale.stage !== 'run') return;
    if (paused) {
      raidFinaleTurnTimer = setTimeout(raidFinaleOpenTurn, 180);
      return;
    }
    combat.finale.turnOpen = true;
    raidFinalePaintHud();
    const tick = document.querySelector('#raid-finale .raid-finale-turn i');
    if (tick) {
      tick.style.animation = 'none';
      void tick.offsetWidth;
      tick.style.animation = 'raidFinaleTurn ' + raidFinaleTurnMs() + 'ms linear forwards';
    }
    raidFinaleClearTurnTimer();
    raidFinaleTurnTimer = setTimeout(() => raidFinaleResolveTurn(false), raidFinaleTurnMs());
  }

  function raidFinaleTryRun() {
    if (!isRaidFinaleActive() || combat.finale.ended) return;
    if (combat.finale.stage !== 'run') return;
    if (!combat.finale.turnOpen) {
      toast('Ждите следующий ход');
      return;
    }
    raidFinaleResolveTurn(true);
  }

  function raidFinaleResolveTurn(ran) {
    if (!combat || !combat.finale || combat.finale.ended) return;
    if (combat.finale.stage !== 'run') return;
    if (paused && !ran) {
      raidFinaleTurnTimer = setTimeout(() => raidFinaleResolveTurn(false), 180);
      return;
    }
    raidFinaleClearTurnTimer();
    combat.finale.turnOpen = false;
    if (ran) {
      combat.finale.steps += 1;
      log('Рейд бежит к трону — ' + combat.finale.steps + '/' + combat.finale.stepsNeed + ' шагов.', 'player');
      const raid = document.querySelector('#raid-finale .raid-finale-raid');
      if (raid) {
        raid.classList.remove('lunge');
        void raid.offsetWidth;
        raid.classList.add('lunge');
      }
    } else {
      log('Рейд не успел шагнуть — Небесный гнев читается дальше.', 'enemy');
    }
    if (combat.finale.steps >= combat.finale.stepsNeed) {
      raidFinalePaintHud();
      raidFinaleWin();
      return;
    }
    combat.finale.wipe += 1;
    raidFinalePaintHud();
    if (combat.finale.wipe >= combat.finale.wipeMax) {
      raidFinaleWipe();
      return;
    }
    setTimeout(() => {
      if (isRaidFinaleActive() && combat.finale.stage === 'run') raidFinaleOpenTurn();
    }, ran && !raidFinaleReduceMotion() ? 420 : 80);
  }

  function raidFinaleWin() {
    if (!combat || !combat.finale || combat.finale.ended) return;
    combat.finale.ended = true;
    combat.finale.stage = 'cine';
    combat.finale.turnOpen = false;
    raidFinaleClearTurnTimer();
    log('Рейд добрался до трона. Небесный гнев сорван.', 'player');
    toast('Дошли!');
    if (raidFinaleReduceMotion()) {
      raidFinaleFinishWin();
      return;
    }
    raidFinalePlayCine();
  }

  function raidFinalePlayCine() {
    const root = raidFinaleEnsureRoot();
    const stage = root.querySelector('.raid-finale-stage');
    const cine = root.querySelector('.raid-finale-cine');
    if (stage) stage.classList.add('hidden');
    if (cine) {
      cine.classList.remove('hidden');
      cine.setAttribute('aria-hidden', 'false');
      const cbg = cine.querySelector('.raid-finale-cine-bg');
      if (cbg) cbg.style.backgroundImage = 'url("' + RAID_FINALE_CINE_BG + '")';
    }
    raidFinaleClearTurnTimer();
    raidFinaleTurnTimer = setTimeout(() => raidFinaleFinishWin(), RAID_FINALE_CINE_MS);
  }

  function raidFinaleSkipCine() {
    if (!combat || !combat.finale || combat.finale.stage !== 'cine') return;
    raidFinaleFinishWin();
  }

  function raidFinaleFinishWin() {
    if (!combat || !combat.finale) return;
    raidFinaleClearTurnTimer();
    const boss = (combat.enemies || []).find(e => isLeiShenUnit(e));
    if (boss) {
      boss._finaleDone = true;
      boss.vaultAway = false;
      boss.alive = false;
      boss.hp = 0;
    }
    combat.finale.active = false;
    combat.finale.stage = 'done';
    combat.vaultLock = false;
    combat.over = true;
    raidFinaleTeardown(false);
    if (typeof onVictory === 'function') onVictory();
    else if (typeof endRun === 'function') endRun(true, 'Лэй Шэнь повержен. Рейд 10 человек выстоял.');
  }

  function raidFinaleWipe() {
    if (!combat || !combat.finale || combat.finale.ended) return;
    combat.finale.ended = true;
    combat.finale.stage = 'wipe';
    combat.finale.turnOpen = false;
    raidFinaleClearTurnTimer();
    log('Небесный гнев дочитался. Рейд стёрт.', 'enemy');
    toast('Небесный гнев — вайп');
    const heroes = (run && run.party) ? run.party.filter(h => h && !h.isPet) : [];
    for (const h of heroes) {
      if (!h.alive) continue;
      h.hp = 0;
      h.alive = false;
      h.shield = 0;
    }
    combat.finale.active = false;
    combat.vaultLock = false;
    combat.over = true;
    raidFinaleTeardown(false);
    if (typeof endRun === 'function') endRun(false, 'Небесный гнев стёр рейд.');
  }

  function raidFinaleTeardown(keepBody) {
    raidFinaleClearTurnTimer();
    if (raidFinaleRaf) {
      cancelAnimationFrame(raidFinaleRaf);
      raidFinaleRaf = 0;
    }
    const root = document.getElementById('raid-finale');
    if (root) {
      root.classList.remove('on');
      root.setAttribute('aria-hidden', 'true');
      const stage = root.querySelector('.raid-finale-stage');
      const cine = root.querySelector('.raid-finale-cine');
      const blown = root.querySelector('.raid-finale-blown');
      if (stage) stage.classList.add('hidden');
      if (cine) {
        cine.classList.add('hidden');
        cine.setAttribute('aria-hidden', 'true');
      }
      if (blown) blown.innerHTML = '';
    }
    if (!keepBody) document.body.classList.remove('raid-finale-on');
  }

  function raidFinaleOnKey(e) {
    if (!isRaidFinaleActive()) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
    if (combat.finale.stage === 'cine' && (e.key === 'Escape' || e.key === ' ' || e.code === 'Space' || e.key === 'Enter')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      raidFinaleSkipCine();
      return;
    }
    if (combat.finale.stage === 'run' && (e.key === ' ' || e.code === 'Space' || e.key === 'Enter')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      raidFinaleTryRun();
    }
  }

  function hookRaidFinale() {
    if (raidFinaleBound) return;
    raidFinaleBound = true;
    document.addEventListener('keydown', raidFinaleOnKey, true);

    if (typeof checkEnd === 'function') {
      const _ce = checkEnd;
      checkEnd = function () {
        if (isRaidFinaleActive()) return false;
        return _ce.apply(this, arguments);
      };
    }

    if (typeof checkBossPhase === 'function') {
      const _ph = checkBossPhase;
      checkBossPhase = function (boss) {
        _ph(boss);
        if (typeof maybeTriggerRaidFinale === 'function') maybeTriggerRaidFinale(boss);
      };
    }

    if (typeof killUnit === 'function') {
      const _kill = killUnit;
      killUnit = function (unit) {
        if (unit && isLeiShenUnit(unit) && typeof isRaidRun === 'function' && isRaidRun() && combat && !unit._finaleDone) {
          if (isRaidFinaleActive()) {
            unit.hp = Math.max(1, unit.hp);
            unit.alive = true;
            return;
          }
          const snapHp = unit.hp;
          const snapAlive = unit.alive;
          unit.hp = Math.max(1, unit.hp);
          unit.alive = true;
          if (typeof maybeTriggerRaidFinale === 'function' && maybeTriggerRaidFinale(unit)) return;
          unit.hp = snapHp;
          unit.alive = snapAlive;
        }
        return _kill.apply(this, arguments);
      };
    }

    if (typeof endRun === 'function') {
      const _end = endRun;
      endRun = function () {
        raidFinaleTeardown(false);
        return _end.apply(this, arguments);
      };
    }

    if (typeof backToLobby === 'function') {
      const _back = backToLobby;
      backToLobby = function () {
        raidFinaleTeardown(false);
        return _back.apply(this, arguments);
      };
    }

    if (typeof raidPhaseTitle === 'function') {
      const _pt = raidPhaseTitle;
      raidPhaseTitle = function () {
        if (isRaidFinaleActive()) return 'Небесный гнев';
        return _pt();
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hookRaidFinale);
  } else {
    hookRaidFinale();
  }
