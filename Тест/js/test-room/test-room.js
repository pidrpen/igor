/* test-room: арена анимаций + полная панель способностей как в бою */
  let testPick = null;
  let testPlayer = null;
  let testEnemy = null;
  let testBusy = false;
  let testAbilities = [];
  let testActor = null; // mock unit для costLabel / estimateAbility

  function hideAllMainScreens() {
    ['lobby', 'run-screen', 'test-hub', 'test-compare', 'test-picker', 'test-arena', 'test-style', 'test-ink', 'test-brew', 'test-plans'].forEach(id => {
      document.getElementById(id)?.classList.add('hidden');
    });
  }

  function openTestHub() {
    hideAllMainScreens();
    document.getElementById('end-modal')?.classList.add('hidden');
    document.getElementById('test-hub')?.classList.remove('hidden');
  }

  function openTestPicker() {
    hideAllMainScreens();
    document.getElementById('end-modal')?.classList.add('hidden');
    document.getElementById('test-picker')?.classList.remove('hidden');
    renderTestSpecGrid();
    updateTestLaunchBar();
  }

  function closeTestRoomToLobby() {
    destroyTestArena();
    hideAllMainScreens();
    document.getElementById('lobby')?.classList.remove('hidden');
  }

  function allSpecsFlat() {
    const list = [];
    const classes = (window.WOW_MOP && WOW_MOP.classes) || [];
    for (const cls of classes) {
      for (const spec of cls.specs || []) {
        list.push({
          classId: cls.id,
          specId: spec.id,
          className: cls.name,
          specName: spec.name,
          role: spec.role,
          icon: spec.icon || cls.icon,
          color: cls.color,
        });
      }
    }
    return list;
  }

  function renderTestSpecGrid() {
    const grid = document.getElementById('test-spec-grid');
    if (!grid) return;
    const roleLabel = (typeof ROLE_LABEL !== 'undefined')
      ? ROLE_LABEL
      : { tank: 'Танк', healer: 'Целитель', dps: 'Боец' };
    const roleClass = (typeof ROLE_CLASS !== 'undefined')
      ? ROLE_CLASS
      : { tank: 'role-tank', healer: 'role-healer', dps: 'role-dps' };

    grid.innerHTML = allSpecsFlat().map(s => {
      const has = hasSpritePack(s.classId, s.specId);
      const sel = testPick && testPick.classId === s.classId && testPick.specId === s.specId;
      const accent = (typeof classAccentColor === 'function')
        ? classAccentColor(s.classId, s.specId)
        : (s.color || 'var(--gold)');
      const thumb = has
        ? `<div class="test-thumb" style="--cc:${accent}"><img src="${frameUrl(getHeroSpritePack(s.classId, s.specId), 'idle', 0)}" alt=""></div>`
        : (typeof artHtml === 'function'
          ? artHtml(ASSETS.specP(s.classId, s.specId), s.icon, '', `--cc:${accent}`)
          : `<div class="test-thumb">${s.icon || '✨'}</div>`);
      return `
        <div class="test-spec-card${has ? ' has-sprite' : ''}${sel ? ' selected' : ''}"
             data-class="${s.classId}" data-spec="${s.specId}"
             style="--cc:${accent}"
             title="${s.className} — ${s.specName}">
          <span class="${has ? 'badge-sprite' : 'badge-stub'}">${has ? 'анимации' : 'скоро'}</span>
          ${thumb}
          <div class="nm">${s.specName}</div>
          <div class="sub">${s.className}</div>
          <span class="role-chip ${roleClass[s.role] || ''}">${roleLabel[s.role] || s.role}</span>
        </div>`;
    }).join('');

    grid.querySelectorAll('.test-spec-card').forEach(el => {
      el.addEventListener('click', () => {
        const classId = el.dataset.class;
        const specId = el.dataset.spec;
        const found = allSpecsFlat().find(x => x.classId === classId && x.specId === specId);
        testPick = found || { classId, specId };
        renderTestSpecGrid();
        updateTestLaunchBar();
      });
    });
  }

  function updateTestLaunchBar() {
    const label = document.getElementById('test-pick-label');
    const btn = document.getElementById('btn-test-launch');
    if (!label || !btn) return;
    if (!testPick) {
      label.textContent = 'Выберите специализацию';
      btn.disabled = true;
      return;
    }
    const has = hasSpritePack(testPick.classId, testPick.specId);
    const abs = getSpecAbilities(testPick.classId, testPick.specId);
    label.textContent = `${testPick.className} · ${testPick.specName}` +
      ` · ${abs.length} скиллов` +
      (has ? ' · 2D' : ' · без спрайта');
    btn.disabled = false;
  }

  function launchTestArena() {
    if (!testPick) return;
    hideAllMainScreens();
    document.getElementById('test-arena')?.classList.remove('hidden');
    setupTestArena(testPick);
  }

  function destroyTestArena() {
    testBusy = false;
    testAbilities = [];
    testActor = null;
    try { testPlayer?.destroy(); } catch (_) {}
    try { testEnemy?.destroy(); } catch (_) {}
    testPlayer = null;
    testEnemy = null;
    const bar = document.getElementById('test-ability-bar');
    if (bar) bar.innerHTML = '';
  }

  function buildTestActor(pick) {
    const classes = (window.WOW_MOP && WOW_MOP.classes) || [];
    const cls = classes.find(c => c.id === pick.classId);
    const spec = cls && (cls.specs || []).find(s => s.id === pick.specId);
    const abs = ((spec && spec.abilities) || []).map(a => {
      // shallow clone + runtime fields
      const ab = { ...a };
      ab.curCd = 0;
      if (ab.maxCharges && ab.charges == null) ab.charges = ab.maxCharges;
      return ab;
    });
    const resType = (spec && spec.resourceOverride) || (cls && cls.resource) || { type: 'mana', name: 'Мана', icon: '💧', max: 100 };
    const sec = cls && cls.secondary;
    return {
      uid: 'test-hero',
      name: (spec && spec.name) || pick.specName || 'Герой',
      classId: pick.classId,
      specId: pick.specId,
      abilities: abs,
      buffs: [],
      alive: true,
      res: {
        primary: {
          type: resType.type || 'mana',
          name: resType.name || 'Мана',
          icon: resType.icon || '💧',
          max: resType.max || 100,
          current: resType.max || 100,
        },
        secondary: sec ? {
          type: sec.type,
          name: sec.name,
          icon: sec.icon || '☀️',
          max: sec.max || 5,
          current: sec.start != null ? sec.start : (sec.max || 5),
        } : null,
      },
    };
  }

  function setupTestArena(pick) {
    destroyTestArena();
    testBusy = false;

    const heroPack = getHeroSpritePack(pick.classId, pick.specId);
    const enemyPack = getEnemySpritePack();
    preloadPack(heroPack);
    preloadPack(enemyPack);

    testActor = buildTestActor(pick);
    testAbilities = testActor.abilities;

    const title = document.getElementById('test-arena-title');
    const meta = document.getElementById('test-arena-meta');
    if (title) title.textContent = `${pick.className} — ${pick.specName}`;
    if (meta) {
      meta.textContent = heroPack
        ? `${testAbilities.length} способностей · 2D ` + (heroPack.label || '')
        : `${testAbilities.length} способностей · спрайта героя нет`;
    }

    const playerImg = document.getElementById('test-player-img');
    const enemyImg = document.getElementById('test-enemy-img');
    const playerName = document.getElementById('test-player-name');
    const enemyName = document.getElementById('test-enemy-name');
    const playerCard = document.getElementById('test-fighter-player');
    const enemyCard = document.getElementById('test-fighter-enemy');

    if (playerName) {
      playerName.innerHTML = `${pick.specName}<span class="role">${pick.className}</span>`;
    }
    if (enemyName) enemyName.innerHTML = `Злой дух<span class="role">враг</span>`;

    const accent = (typeof classAccentColor === 'function')
      ? classAccentColor(pick.classId, pick.specId)
      : (pick.color || '#aaa');
    if (playerCard) playerCard.style.setProperty('--cc', accent);

    const fallback = (typeof ASSETS !== 'undefined')
      ? ASSETS.specP(pick.classId, pick.specId)
      : null;

    if (playerImg) testPlayer = createSpritePlayer(playerImg, heroPack, fallback);
    if (enemyImg) testEnemy = createSpritePlayer(enemyImg, enemyPack, null);

    playerCard?.classList.remove('anim-idle');
    enemyCard?.classList.remove('anim-idle');

    renderTestAbilityBar();
    updateWingsHud();
    setTestStatus('Стойка · выбери способность');
  }

  /** Панель как в бою: кнопки .ability в #test-ability-bar */
  function renderTestAbilityBar() {
    const bar = document.getElementById('test-ability-bar');
    if (!bar) return;
    bar.innerHTML = '';
    const actor = testActor;
    if (!actor || !actor.abilities.length) {
      bar.innerHTML = '<div class="test-skill-empty">Нет способностей</div>';
      return;
    }

    actor.abilities.forEach((ab, idx) => {
      const btn = document.createElement('button');
      const can = (typeof canPay === 'function') ? canPay(actor, ab) : true;
      const chSt = (typeof abilityChargeState === 'function') ? abilityChargeState(ab) : null;
      btn.className = 'ability' + (!can ? ' is-disabled' : '')
        + (chSt && chSt.cur > 0 ? ' has-charges' : '')
        + (chSt && chSt.cur > 0 && chSt.cd > 0 ? ' charge-ticking' : '');
      btn.type = 'button';
      if (!can) btn.setAttribute('aria-disabled', 'true');
      btn.tabIndex = 0;
      btn.dataset.abId = ab.id;

      const keyHint = idx < 9 ? String(idx + 1) : '';
      let cost = '';
      let est = '';
      let tags = '';
      let detail = ab.desc || '';
      let schoolNote = '';
      let schoolCss = '';
      try {
        if (typeof costLabel === 'function') cost = costLabel(actor, ab);
        if (typeof estimateAbility === 'function') est = estimateAbility(actor, ab);
        if (typeof abilityMetaLine === 'function') tags = abilityMetaLine(ab);
        if (typeof abilityDescribe === 'function') detail = abilityDescribe(ab, actor);
        if (typeof abilitySchoolNote === 'function') schoolNote = abilitySchoolNote(ab, actor);
        if (typeof abilitySchoolCss === 'function') schoolCss = abilitySchoolCss(ab, actor);
      } catch (e) {
        console.warn('[test-room ab]', e);
      }

      const yellowParts = [];
      const pushY = (s) => {
        s = (s && String(s).trim()) || '';
        if (s && !yellowParts.includes(s)) yellowParts.push(s);
      };
      pushY(cost);
      if (ab.cd > 0) pushY('КД ' + ab.cd);
      if (ab.curCd > 0) {
        if (chSt && chSt.cur > 0) pushY('заряд через ' + ab.curCd);
        else pushY('ещё ' + ab.curCd);
      }
      pushY(est);
      if (tags) tags.split(' · ').forEach(pushY);
      // бейдж анимации
      const heroPack = testPlayer?.pack || getHeroSpritePack(actor.classId, actor.specId);
      if (ab.id === 'avenging') pushY('крылья · ' + (ab.buffTurns || 3) + 'х');
      else if (skillHasCustomAnim(heroPack, ab.id)) pushY('anim');
      else pushY('заглушка');

      const yellow = yellowParts.join(' · ');
      const cdHtml = (typeof abilityCdOverlayHtml === 'function')
        ? abilityCdOverlayHtml(ab)
        : (ab.curCd > 0 ? `<div class="cd-overlay">${ab.curCd}</div>` : '');
      const tipName = String(ab.name || '').replace(/"/g, '&quot;');
      const tipDetail = String(detail || '').replace(/"/g, '&quot;');
      const pips = (chSt && typeof chargePipsHtml === 'function') ? chargePipsHtml(chSt) : '';

      btn.innerHTML =
        (keyHint !== '' ? `<span class="hk">${keyHint}</span>` : '') +
        `<span class="a-ico" data-tip-name="${tipName}" data-tip-detail="${tipDetail}" tabindex="-1">${ab.icon || '✨'}${pips}</span>` +
        `<span class="a-body">` +
          `<span class="a-name">${ab.name || ab.id}</span>` +
          (yellow ? `<span class="a-cost">${yellow}</span>` : '') +
        `</span>` +
        `<span class="a-school ${schoolCss || ''}">${schoolNote || (ab.type || '—')}</span>` +
        cdHtml;

      // tooltip float if game has it
      const icoEl = btn.querySelector('.a-ico');
      const showTip = (e) => {
        if (e) e.stopPropagation();
        if (typeof showAbilityTipFloat === 'function') {
          showAbilityTipFloat(icoEl || btn, ab.name || '', detail);
        }
      };
      const hideTip = () => {
        if (typeof hideAbilityTipFloat === 'function') hideAbilityTipFloat();
      };
      if (icoEl) {
        icoEl.addEventListener('mouseenter', showTip);
        icoEl.addEventListener('mouseleave', hideTip);
        icoEl.addEventListener('focus', showTip);
        icoEl.addEventListener('blur', hideTip);
      }

      btn.addEventListener('click', () => {
        hideTip();
        if (btn.classList.contains('is-disabled')) return;
        playHeroSkill(ab);
      });

      bar.appendChild(btn);
    });

    updateWingsHud();
  }

  function updateWingsHud() {
    const hud = document.getElementById('test-wings-hud');
    if (!hud) return;
    const n = testPlayer?.wingsTurns || 0;
    if (testPlayer?.wings && n > 0) {
      hud.textContent = `Крылья: ${n} ход` + (n === 1 ? '' : (n < 5 ? 'а' : 'ов')) + ' · тратятся действиями';
      hud.classList.remove('hidden');
    } else {
      hud.textContent = '';
      hud.classList.add('hidden');
    }
  }

  function setTestStatus(text) {
    const el = document.getElementById('test-status');
    if (el) el.textContent = text;
  }

  function playHeroSkill(ability) {
    if (testBusy || !ability) return;
    const pack = testPlayer?.pack || null;
    const isAvenging = ability.id === ((pack && pack.avengingId) || 'avenging');
    const hasWings = !!(testPlayer && testPlayer.wings);
    const animKey = resolveSkillAnim(pack, ability.id, hasWings);
    const noLunge = pack?.noLunge?.has?.(ability.id) || isAvenging || ability.freeAction;
    const name = ability.name || ability.id;

    testBusy = true;

    document.querySelectorAll('#test-ability-bar .ability').forEach(b => {
      b.classList.toggle('on', b.dataset.abId === ability.id);
    });

    const card = document.getElementById('test-fighter-player');
    const other = document.getElementById('test-fighter-enemy');
    card?.classList.remove('anim-lunge-player', 'anim-hit');
    if (!noLunge && animKey !== 'idle' && animKey !== 'wing_in') {
      card?.classList.add('anim-lunge-player');
    }

    const finish = (info) => {
      card?.classList.remove('anim-lunge-player');
      const t = ability.type || '';
      const hits = /damage|aoe|dot/i.test(t) || animKey === 'attack' || animKey === 'attack_winged';
      if (hits && other) {
        other.classList.remove('anim-hit');
        void other.offsetWidth;
        other.classList.add('anim-hit');
        setTimeout(() => other.classList.remove('anim-hit'), 320);
      }
      testBusy = false;
      document.querySelectorAll('#test-ability-bar .ability.on').forEach(b => b.classList.remove('on'));
      updateWingsHud();
      const left = (info && info.wingsLeft != null) ? info.wingsLeft : (testPlayer?.wingsTurns || 0);
      if (testPlayer?.wings && left > 0) {
        setTestStatus(`Гнев · крылья ещё ${left} ход` + (left === 1 ? '' : 'а') + ' (тратятся действиями)');
      } else if (!testPlayer?.wings) {
        setTestStatus('Стойка · выбери способность');
      }
    };

    if (isAvenging && testPlayer?.playSkill) {
      const turns = ability.buffTurns != null ? ability.buffTurns : 3;
      setTestStatus(`${name} · крылья на ${turns} хода`);
      card?.classList.add('anim-avenging-flash');
      setTimeout(() => card?.classList.remove('anim-avenging-flash'), 500);
      testPlayer.playSkill(ability.id, {
        ability,
        onDone: (info) => {
          finish(info);
          updateWingsHud();
          setTestStatus(`${name} · ${turns} хода · жрётся скиллами с ходом`);
        },
      });
      return;
    }

    setTestStatus(`${name} · ${animKey}${hasWings ? ' (с крыльями)' : ''}`);
    if (testPlayer?.playSkill) {
      testPlayer.playSkill(ability.id, { ability, onDone: finish });
    } else {
      setTimeout(() => finish({}), 400);
    }
  }

  function runEnemyAttack() {
    if (testBusy) return;
    const actor = testEnemy;
    if (!actor) return;
    testBusy = true;
    setTestStatus('Враг · attack');
    const card = document.getElementById('test-fighter-enemy');
    const other = document.getElementById('test-fighter-player');
    card?.classList.add('anim-lunge-enemy');
    actor.play('attack', {
      onDone: () => {
        card?.classList.remove('anim-lunge-enemy');
        if (other) {
          other.classList.remove('anim-hit');
          void other.offsetWidth;
          other.classList.add('anim-hit');
          setTimeout(() => other.classList.remove('anim-hit'), 320);
        }
        testBusy = false;
        setTestStatus('Стойка · выбери способность');
      },
    });
  }

  function initTestRoom() {
    const lobbyParty = document.querySelector('.lobby-party-col');
    let btn = document.getElementById('btn-test-room');
    if (!btn && lobbyParty) {
      btn = document.createElement('button');
      btn.id = 'btn-test-room';
      btn.type = 'button';
      btn.className = 'btn';
      btn.textContent = '🎬 Тестовая комната (анимации)';
      const startBtn = document.getElementById('btn-start');
      if (startBtn && startBtn.parentNode) {
        startBtn.parentNode.insertBefore(btn, startBtn);
      } else {
        lobbyParty.appendChild(btn);
      }
    }
    btn?.addEventListener('click', openTestHub);

    document.getElementById('btn-hub-lobby')?.addEventListener('click', closeTestRoomToLobby);
    document.getElementById('btn-hub-arena')?.addEventListener('click', openTestPicker);
    document.getElementById('btn-hub-compare')?.addEventListener('click', () => {
      if (typeof openTestCompare === 'function') openTestCompare();
    });
    document.getElementById('btn-hub-style')?.addEventListener('click', () => {
      if (typeof openStyleLab === 'function') openStyleLab();
    });
    document.getElementById('btn-hub-ink')?.addEventListener('click', () => {
      if (typeof openInkRoom === 'function') openInkRoom();
    });
    document.getElementById('btn-hub-brew')?.addEventListener('click', () => {
      if (typeof openTestCompare === 'function') openTestCompare({ classId: 'monk', specId: 'brewmaster' });
    });
    document.getElementById('btn-hub-plans')?.addEventListener('click', () => {
      if (typeof openPlansRoom === 'function') openPlansRoom();
    });
    document.getElementById('btn-test-back-lobby')?.addEventListener('click', openTestHub);
    document.getElementById('btn-test-arena-back')?.addEventListener('click', () => {
      destroyTestArena();
      openTestPicker();
    });
    document.getElementById('btn-test-launch')?.addEventListener('click', launchTestArena);

    document.getElementById('btn-test-idle')?.addEventListener('click', () => {
      if (testBusy) return;
      testPlayer?.goIdle?.() || testPlayer?.play?.('idle');
      testEnemy?.play?.('idle');
      setTestStatus('Стойка');
    });
    document.getElementById('btn-test-atk-enemy')?.addEventListener('click', runEnemyAttack);

    document.addEventListener('keydown', (e) => {
      const arena = document.getElementById('test-arena');
      if (!arena || arena.classList.contains('hidden')) return;
      if (e.key >= '1' && e.key <= '9') {
        const idx = +e.key - 1;
        if (testAbilities[idx]) {
          e.preventDefault();
          playHeroSkill(testAbilities[idx]);
        }
      }
      if (e.key === '0' || e.key === 'i' || e.key === 'I') {
        if (testBusy) return;
        testPlayer?.goIdle?.();
        testEnemy?.play?.('idle');
        setTestStatus('Стойка');
      }
      if (e.key === 'e' || e.key === 'E') runEnemyAttack();
      if (e.key === 'Escape') {
        destroyTestArena();
        openTestPicker();
      }
    });

    testPick = allSpecsFlat().find(s => s.classId === 'paladin' && s.specId === 'retribution') || null;
  }

  try {
    initTestRoom();
  } catch (e) {
    console.error('[test-room]', e);
  }
