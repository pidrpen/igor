/* ui: lobby, party, rooms, end screen, boot */
  function igorHonestCleared(classId, specId) {
    try {
      if (typeof igorHeroHonestCleared === 'function') return !!igorHeroHonestCleared(classId, specId);
    } catch (_) {}
    return false;
  }
  function syncHonestNote(el, on) {
    if (!el) return;
    let n = el.querySelector('.honest-cleared-note');
    if (on && !n) {
      n = document.createElement('div');
      n.className = 'lock-note honest-cleared-note';
      n.textContent = 'Честно прокачен';
      el.appendChild(n);
    } else if (!on && n) n.remove();
  }
  function refreshHonestPickCards() {
    document.querySelectorAll('#class-grid .pick-card').forEach(el => {
      const on = igorHonestCleared(el.dataset.id);
      el.classList.toggle('honest-cleared', !!on);
      syncHonestNote(el, on);
    });
    const clsId = typeof pickClass !== 'undefined' ? pickClass : null;
    document.querySelectorAll('#spec-grid .pick-card').forEach(el => {
      const on = !!(clsId && igorHonestCleared(clsId, el.dataset.id));
      el.classList.toggle('honest-cleared', on);
      syncHonestNote(el, on);
    });
  }
  function initLobby() {
    // Проставить school всем скиллам классов (данные + class-balance)
    try { stampAllAbilitySchools(); } catch (e) { console.warn('[school]', e); }
    const grid = document.getElementById('class-grid');
    grid.innerHTML = WOW_MOP.classes.map(c => {
      const unlocked = isClassPatched(c.id);
      const hasTestSpec = unlocked && (c.specs || []).some(s => isTestSpec(c.id, s.id));
      const roles = classRoleList(c);
      const lockCls = unlocked ? '' : ' locked';
      const honestOn = igorHonestCleared(c.id);
      const note = !unlocked
        ? '<div class="lock-note">без правок</div>'
        : ((hasTestSpec ? '<div class="lock-note test-build-note">Тест</div>' : '') +
           (honestOn ? '<div class="lock-note honest-cleared-note">Честно прокачен</div>' : ''));
      return `
      <div class="pick-card${lockCls}${hasTestSpec ? ' test-build-card' : ''}${honestOn ? ' honest-cleared' : ''}" data-id="${c.id}" data-locked="${unlocked ? '0' : '1'}"
           style="--cc:${CLASS_CSS[c.id] || c.color};border-color:${c.color}66"
           title="${unlocked ? (honestOn ? c.name + ' — честно прокачен' : (hasTestSpec ? c.name + ' — тестовая ветка' : c.name)) : c.name + ' — пока без правок'}">
        ${artHtml(ASSETS.classP(c.id), c.icon, 'medallion', `--cc:${CLASS_CSS[c.id] || c.color}`)}
        <div class="nm">${c.name}</div>
        <div class="sub">${c.resource.icon} ${c.resource.name}</div>
        ${roleChipsHtml(roles)}
        ${note}
      </div>`;
    }).join('');
    grid.querySelectorAll('.pick-card').forEach(el => {
      el.addEventListener('click', () => {
        if (el.dataset.locked === '1') {
          toast('Класс пока без правок — недоступен');
          return;
        }
        selectClass(el.dataset.id);
      });
    });

    document.getElementById('tab-class').addEventListener('click', () => showClassTab());
    document.getElementById('tab-spec').addEventListener('click', () => { if (pickClass) showSpecTab(); });
    document.getElementById('btn-add').addEventListener('click', addToParty);
    const heroChk = document.getElementById('chk-hero-party');
    if (heroChk) {
      heroChk.addEventListener('change', () => { syncHeroPartySlot(); renderParty(); savePartyProfile(); });
    }
    document.getElementById('btn-clear-pick').addEventListener('click', () => {
      pickClass = pickSpec = null;
      showClassTab();
      updatePreview();
      if (typeof syncBalanceFilterFromPick === 'function') syncBalanceFilterFromPick(null, null);
    });

    const ds = document.getElementById('dungeon-select');
    ds.innerHTML = DUNGEONS.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    const kl = document.getElementById('key-level');
    kl.innerHTML = Array.from({ length: 14 }, (_, i) => i + 2).map(n => `<option value="${n}">+${n}</option>`).join('');
    kl.value = '5';
    ds.addEventListener('change', () => { refreshAffixes(); refreshKeystone(); savePartyProfile(); });
    kl.addEventListener('change', () => { refreshAffixes(); refreshKeystone(); savePartyProfile(); });
    document.getElementById('btn-start').addEventListener('click', startRun);
    try { bindRaidLobby(); } catch (e) { console.error('[raid]', e); }
    if (!document.getElementById('btn-tavern')) {
      const startBtn = document.getElementById('btn-start');
      if (startBtn && startBtn.parentNode) {
        const slot = document.createElement('div');
        slot.id = 'igor-hero-lobby-slot';
        slot.style.marginTop = '.45rem';
        slot.innerHTML = '<button class="btn" type="button" id="btn-tavern" style="width:100%;padding:.65rem">Таверна</button>' +
          '<div id="igor-hero-plaque" class="keys-hint" style="margin-top:.35rem"></div>';
        startBtn.insertAdjacentElement('afterend', slot);
      }
    }
    const oldFieldBtn = document.getElementById('btn-field-trial');
    if (oldFieldBtn) oldFieldBtn.remove();
    try { if (typeof igorHeroBootLobby === 'function') igorHeroBootLobby(); } catch (_) {}
    try { syncHeroPartySlot(); } catch (_) {}
    try { refreshHonestPickCards(); } catch (_) {}

    bindAbandonButton();
    document.getElementById('btn-lobby').addEventListener('click', backToLobby);
    document.getElementById('rest-heal')?.addEventListener('click', () => doRest('heal'));
    document.getElementById('rest-buff')?.addEventListener('click', () => doRest('buff'));
    document.getElementById('rest-skip')?.addEventListener('click', () => doRest('skip'));
    document.getElementById('talent-skip')?.addEventListener('click', () => finishTalentPick(null));
    document.getElementById('loot-skip')?.addEventListener('click', () => finishLootPick(null));
    document.getElementById('btn-pause')?.addEventListener('click', togglePause);
    document.getElementById('btn-speed')?.addEventListener('click', cycleSpeed);
    document.getElementById('btn-continue')?.addEventListener('click', continueRun);
    document.getElementById('btn-export-save')?.addEventListener('click', exportSaveFile);
    document.getElementById('gear-close')?.addEventListener('click', closeGearModal);
    document.getElementById('gear-auto-equip')?.addEventListener('click', () => {
      const target = getGearModalTarget();
      if (!target) return;
      autoEquipBest(target);
      if (gearModalMode === 'run') applyGearToHero(target);
      syncGearToLobbyIfNeeded(target);
      savePartyProfile();
      if (run) saveRun();
      renderGearModal();
      if (gearModalMode === 'lobby') renderParty();
      try {
        const n = (typeof getSharedBag === 'function') ? getSharedBag().length : 0;
        const el = document.getElementById('shop-bag-count');
        if (el) el.textContent = String(n);
      } catch (_) {}
      toast('Авто-одето из общей сумки');
    });
    document.getElementById('gear-unequip-all')?.addEventListener('click', () => {
      const target = getGearModalTarget();
      if (!target) return;
      const g = normalizeGear(target.gear);
      for (const slot of GEAR_SLOT_IDS) {
        if (g.equipped[slot]) {
          try {
            if (typeof addToSharedBag === 'function') addToSharedBag(g.equipped[slot]);
            else g.bag.push(g.equipped[slot]);
          } catch (_) {
            g.bag.push(g.equipped[slot]);
          }
          delete g.equipped[slot];
        }
      }
      target.gear = g;
      if (gearModalMode === 'run') applyGearToHero(target);
      syncGearToLobbyIfNeeded(target);
      savePartyProfile();
      if (run) saveRun();
      renderGearModal();
      if (gearModalMode === 'lobby') renderParty();
    });
    document.getElementById('gear-assign-skip')?.addEventListener('click', () => {
      const modal = document.getElementById('gear-assign-modal');
      if (pendingGearItem && run?.party?.length) {
        // bag on lowest ilvl hero
        let best = 0, bestIl = 9999;
        run.party.forEach((h, i) => {
          const il = avgIlvl(h.gear);
          if (il < bestIl) { bestIl = il; best = i; }
        });
        const h = run.party[best];
        h.gear = normalizeGear(h.gear);
        h.gear.bag.push(cloneGearItem(pendingGearItem));
        while (h.gear.bag.length > 24) h.gear.bag.shift();
        if (party[best]) party[best].gear = normalizeGear(h.gear);
        savePartyProfile(); saveRun();
        toast('В сумку: ' + h.name);
      }
      pendingGearItem = null;
      modal?.classList.add('hidden');
      const cb = gearAssignCb; gearAssignCb = null;
      if (cb) cb();
    });
    document.getElementById('btn-import-save')?.addEventListener('click', () => {
      document.getElementById('import-save-file')?.click();
    });
    document.getElementById('import-save-file')?.addEventListener('change', (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (f) importSaveFile(f);
      ev.target.value = '';
    });
    document.addEventListener('keydown', onHotkey);
    bindRecountUI();
    try { bindPassivePocketUI(); } catch (_) {}

    // Lobby party: restore saved profile only; no default presets
    const prof = loadPartyProfile();
    if (prof && prof.party && prof.party.length) {
      applyPartyProfile(prof);
    } else {
      party = [];
    }
    renderParty();
    renderBalancePanel();
    try { renderDivergePanel(); } catch (_) {}
    try { syncRaidLobbyUi(); } catch (_) {}
    refreshAffixes();
    refreshKeystone();
    updatePreview();
    renderHistory();
    const cont = document.getElementById('btn-continue');
    if (cont) cont.classList.toggle('hidden', !hasSave());
  }

  function togglePause() {
    paused = !paused;
    const b = document.getElementById('btn-pause');
    if (b) b.textContent = paused ? '▶' : 'Пауза';
    toast(paused ? 'Пауза' : 'Продолжаем');
    if (!paused && combat && !combat.waitingPlayer && !combat.over) processTurn();
  }
  function cycleSpeed() {
    gameSpeed = gameSpeed === 1 ? 2 : gameSpeed === 2 ? 4 : 1;
    const el = document.getElementById('hud-speed');
    if (el) el.textContent = gameSpeed + '×';
    toast('Скорость ' + gameSpeed + '×');
  }
  function onHotkey(e) {
    if (!run || run.finished || !combat?.waitingPlayer || paused) {
      if (e.key === 'p' || e.key === 'P') { if (run && !run.finished) togglePause(); }
      if (e.key === 's' || e.key === 'S') { if (run && !run.finished) cycleSpeed(); }
      return;
    }
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
    const actor = currentActor();
    if (!actor || actor.side !== 'ally') return;
    if (e.key === 'Escape') {
      pendingTarget = null;
      try { if (typeof clearRuneHighlight === 'function') clearRuneHighlight(); } catch (_) {}
      updateUnitSelectionOnly();
      return;
    }
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (actor.res.primary.type !== 'runes') {
        actor.res.primary.current = clamp(actor.res.primary.current + Math.max(5, actor.res.primary.regen || 5), 0, actor.res.primary.max);
      }
      log(actor.name + ' пропускает', 'player');
      afterAction();
      return;
    }
    if (e.key === 'a' || e.key === 'A') {
      return;
    }
    if (e.key === 'p' || e.key === 'P') { togglePause(); return; }
    if (e.key === 's' || e.key === 'S') { cycleSpeed(); return; }
    const n = e.key === '0' ? 9 : parseInt(e.key, 10) - 1;
    const abs = (typeof orderedAbilities === 'function') ? orderedAbilities(actor) : (actor.abilities || []);
    if (n >= 0 && n < abs.length) {
      const ab = abs[n];
      if (!canPay(actor, ab)) return toast('Нельзя: ' + ab.name);
      const needTarget = abilityNeedsClickTarget(ab);
      const rule = abilityTargetRule(ab);
      if (needTarget) {
        pendingTarget = { actor, ability: ab };
        if (ab.costRunes && typeof highlightAbilityRunes === 'function') {
          highlightAbilityRunes(actor, ab.costRunes, true);
        } else if (typeof clearRuneHighlight === 'function') {
          clearRuneHighlight();
        }
        toast(rule === 'ally_any' ? 'Цель: союзник' : 'Цель: враг');
        updateUnitSelectionOnly();
      } else if (typeof castWithRuneFlash === 'function') {
        castWithRuneFlash(actor, ab, rule === 'self_only' ? actor : null);
      } else {
        castAbility(actor, ab, rule === 'self_only' ? actor : null);
        afterAction();
      }
    }
  }
  function selectClass(id) {
    if (!isClassPatched(id)) {
      toast('Класс пока без правок — недоступен');
      return;
    }
    pickClass = id; pickSpec = null;
    document.querySelectorAll('#class-grid .pick-card').forEach(el => {
      el.classList.toggle('selected', el.dataset.id === id);
    });
    // баланс: тот же класс, спеки «все» (второй ряд фильтров)
    if (typeof syncBalanceFilterFromPick === 'function') {
      syncBalanceFilterFromPick(id, null);
    } else if (typeof balanceFilterClass !== 'undefined') {
      balanceFilterClass = id;
      if (typeof balanceFilterSpec !== 'undefined') balanceFilterSpec = 'all';
      try { renderBalancePanel(); } catch (_) {}
    }
    showSpecTab();
    updatePreview();
  }

  function showClassTab() {
    document.getElementById('class-grid').classList.remove('hidden');
    document.getElementById('spec-grid').classList.add('hidden');
    document.getElementById('tab-class').classList.add('on');
    document.getElementById('tab-spec').classList.remove('on');
    document.getElementById('tab-spec').disabled = !pickClass;
    // Баланс: назад к «Все» / «все спеки» (не оставлять фильтр выбранного спека)
    if (typeof syncBalanceFilterFromPick === 'function') {
      syncBalanceFilterFromPick(null, null);
    } else {
      try {
        if (typeof balanceFilterClass !== 'undefined') balanceFilterClass = 'all';
        if (typeof balanceFilterSpec !== 'undefined') balanceFilterSpec = 'all';
        if (typeof renderBalancePanel === 'function') renderBalancePanel();
      } catch (_) {}
    }
  }

  function showSpecTab() {
    const cls = WOW_MOP.getClass(pickClass);
    if (!cls) return;
    document.getElementById('class-grid').classList.add('hidden');
    const sg = document.getElementById('spec-grid');
    sg.classList.remove('hidden');
    sg.innerHTML = cls.specs.map(s => {
      const unlocked = isSpecPatched(cls.id, s.id);
      const testOnly = isTestSpec(cls.id, s.id);
      const lockCls = unlocked ? '' : ' locked';
      const honestOn = igorHonestCleared(cls.id, s.id);
      const note = !unlocked
        ? '<div class="lock-note">без правок</div>'
        : ((testOnly ? '<div class="lock-note test-build-note">Тест</div>' : '') +
           (honestOn ? '<div class="lock-note honest-cleared-note">Честно прокачен</div>' : ''));
      return `
      <div class="pick-card spec-card${lockCls}${testOnly ? ' test-build-card' : ''}${honestOn ? ' honest-cleared' : ''}" data-id="${s.id}" data-locked="${unlocked ? '0' : '1'}"
           style="--role-c:${ROLE_CSS[s.role]};--cc:${(typeof classAccentColor === 'function' ? classAccentColor(cls.id, s.id) : (CLASS_CSS[cls.id] || cls.color))}"
           title="${unlocked ? (honestOn ? s.name + ' — честно прокачен' : (testOnly ? s.name + ' — Тест' : s.name)) : s.name + ' — пока без правок'}">
        ${artHtml(ASSETS.specP(cls.id, s.id), s.icon || cls.icon, 'medallion', `--cc:${(typeof classAccentColor === 'function' ? classAccentColor(cls.id, s.id) : (ROLE_CSS[s.role] || CLASS_CSS[cls.id] || cls.color))}`)}
        <div class="nm">${s.name}${testOnly ? ' <span class="test-spec-tag">Тест</span>' : ''}</div>
        <div class="spec-role-line ${ROLE_CLASS[s.role]}">Роль в группе: ${ROLE_LABEL[s.role]}</div>
        ${note}
      </div>`;
    }).join('');
    sg.querySelectorAll('.pick-card').forEach(el => {
      el.addEventListener('click', () => {
        if (el.dataset.locked === '1') {
          toast('Спек пока без правок — недоступен');
          return;
        }
        pickSpec = el.dataset.id;
        sg.querySelectorAll('.pick-card').forEach(x => x.classList.toggle('selected', x.dataset.id === pickSpec));
        // баланс: класс + выбранный спек
        if (typeof syncBalanceFilterFromPick === 'function') {
          syncBalanceFilterFromPick(pickClass, pickSpec);
        } else if (typeof balanceFilterClass !== 'undefined') {
          balanceFilterClass = pickClass;
          if (typeof balanceFilterSpec !== 'undefined') balanceFilterSpec = pickSpec;
          try { renderBalancePanel(); } catch (_) {}
        }
        updatePreview();
      });
      if (el.dataset.id === pickSpec) el.classList.add('selected');
    });
    document.getElementById('tab-class').classList.remove('on');
    document.getElementById('tab-spec').classList.add('on');
    document.getElementById('tab-spec').disabled = false;
  }

  function updatePreview() {
    const box = document.getElementById('skill-preview');
    const addBtn = document.getElementById('btn-add');
    if (!pickClass) {
      box.innerHTML = 'Выберите класс, затем специализацию.';
      addBtn.disabled = true;
      return;
    }
    const cls = WOW_MOP.getClass(pickClass);
    if (!cls) {
      box.innerHTML = 'Класс не найден.';
      addBtn.disabled = true;
      return;
    }
    if (!pickSpec) {
      const { primary, secondary } = WOW_MOP.resolveResources(cls, (cls.specs || [])[0]);
      const roles = classRoleList(cls);
      const roleStr = roles.map(r => `<span class="${ROLE_CLASS[r]}">${ROLE_LABEL[r]}</span>`).join(' · ');
      const specsLine = cls.specs.map(s => {
        const ok = isSpecPatched(cls.id, s.id);
        const testOnly = isTestSpec(cls.id, s.id);
        const mark = !ok ? ' (без правок)' : (testOnly ? ' <b style="color:#c4b5fd">Тест</b>' : '');
        return `<span class="${ROLE_CLASS[s.role]}">${s.name}</span>${mark}`;
      }).join(', ');
      box.innerHTML = `<b>${cls.icon} ${cls.name}</b> — ресурс: ${primary.icon} ${primary.name}` +
        (cls.secondary ? ` + ${cls.secondary.icon} ${cls.secondary.name}` : '') +
        `<br>Роли класса: ${roleStr}` +
        `<br>Специализации: ${specsLine}`;
      addBtn.disabled = true;
      return;
    }
    const spec = WOW_MOP.getSpec(pickClass, pickSpec);
    if (!spec) {
      box.innerHTML = 'Спек не найден: ' + pickClass + ' / ' + pickSpec;
      addBtn.disabled = true;
      return;
    }
    const { primary, secondary } = WOW_MOP.resolveResources(cls, spec);
    let html = `<div style="margin-bottom:.45rem;color:var(--text)">
      <b>${cls.icon} ${cls.name} — ${spec.icon} ${spec.name}</b>
      <span class="${ROLE_CLASS[spec.role]}"> · Роль в группе: ${ROLE_LABEL[spec.role]}</span><br>
      <span style="color:var(--muted)">Ресурс: ${primary.icon} <b style="color:var(--gold)">${primary.name}</b>` +
      (secondary ? ` · ${secondary.icon} <b style="color:var(--gold)">${secondary.name}</b>` : '') +
      `</span></div>`;
    // Пассивки: чипы + описание ВНУТРИ превью (без absolute-окон и гориз. скролла)
    try {
      const passives = typeof getSpecPassives === 'function'
        ? getSpecPassives(pickClass, pickSpec, spec.role)
        : [];
      if (passives.length) {
        const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        html += `<div class="lobby-passives">
          <div class="lobby-passives-label">Пассивные способности</div>
          <div class="lobby-passives-chips">` + passives.map(p => `
            <div class="passive-chip lobby-passive-chip" tabindex="0"
              data-passive-name="${esc(p.name)}"
              data-passive-detail="${esc(p.detail || p.short || '')}">
              <span class="p-tag">Пассив</span>
              <span class="p-ico">${p.icon || '✨'}</span>
              <span class="p-name">${p.name || 'Пассивка'}</span>
            </div>`).join('') + `
          </div>
          <div class="lobby-passives-tip hidden" id="lobby-passives-tip" role="tooltip"></div>
        </div>`;
      }
    } catch (_) { /* ignore */ }
    html += `<div style="margin:.35rem 0 .25rem;color:var(--gold-bright);font-weight:700">Скиллы (${spec.abilities.length})</div>`;
    // Фейковый актор для estimateAbility (базовые статы спека)
    const scale = (typeof STAT_SCALE !== 'undefined' ? STAT_SCALE : 1000);
    const honestM = (igorHonestCleared(pickClass, pickSpec) && typeof igorHeroHonestStatMult === 'function')
      ? igorHeroHonestStatMult()
      : (igorHonestCleared(pickClass, pickSpec) ? 1.10 : 1);
    const previewActor = {
      classId: pickClass,
      specId: pickSpec,
      role: spec.role,
      side: 'ally',
      atk: Math.round((spec.stats?.atk || 15) * scale * honestM),
      def: Math.round((spec.stats?.def || 5) * scale * honestM),
      maxHp: Math.round((spec.stats?.hp || 100) * scale * honestM),
      hp: Math.round((spec.stats?.hp || 100) * scale * honestM),
      buffs: [],
      res: {
        primary: { ...primary, current: primary.max || 100, max: primary.max || 100 },
        secondary: secondary ? { ...secondary, current: secondary.start != null ? secondary.start : (secondary.max || 0), max: secondary.max || 5 } : null,
      },
      sec: (typeof defaultSec === 'function') ? defaultSec() : {},
    };
    const skillRows = [];
    spec.abilities.forEach((a, i) => {
      const ab = { ...a, baseCd: a.cd || 0, curCd: 0 };
      stampAbilitySchool(ab, pickClass, pickSpec);
      const costBits = [];
      if (a.costRunes) {
        if (a.costRunes.any) costBits.push(a.costRunes.any + ' рун(ы)');
        else {
          if (a.costRunes.b) costBits.push(a.costRunes.b + ' крови');
          if (a.costRunes.f) costBits.push(a.costRunes.f + ' льда');
          if (a.costRunes.u) costBits.push(a.costRunes.u + ' нечестивости');
        }
      } else if (a.cost) costBits.push(a.cost + ' ' + primary.name);
      if (a.costSec) costBits.push(a.costSec + (secondary ? ' ' + secondary.name : ''));
      if (a.gen) costBits.push('+' + a.gen + ' ' + primary.name);
      if (a.genSec && secondary) costBits.push('+' + a.genSec + ' ' + secondary.name);
      if (a.genRunic) costBits.push('+' + a.genRunic + ' силы рун');
      if (a.cd) costBits.push('КД ' + a.cd);
      if (a.freeAction) costBits.push('Не тратит ход');
      let est = '';
      try { est = typeof estimateAbility === 'function' ? estimateAbility(previewActor, ab) : ''; } catch (_) {}
      if (est) costBits.push(est);
      const costStr = costBits.length ? costBits.join(' · ') : 'без стоимости';
      const schoolNote = abilitySchoolNote(ab, previewActor);
      let detail = '';
      try { detail = typeof abilityDescribe === 'function' ? abilityDescribe(ab, previewActor) : (a.desc || ''); } catch (_) {
        detail = a.desc || '';
      }
      const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      skillRows.push({ ab, costStr, schoolNote, detail, i });
      html += `<div class="skill-line" style="animation-delay:${i * 0.03}s">
        <span class="sl-ico" data-tip-name="${esc(a.name)}" data-tip-detail="${esc(detail)}" tabindex="0">${a.icon || '✨'}</span>
        <div class="sl-name">${a.name}</div>
        <div class="sl-desc"><span class="sl-stats">${costStr}</span><br><span class="sl-type">${schoolNote}</span></div>
      </div>`;
    });
    box.innerHTML = html;
    // Пассивки в лобби: описание под чипами (внутри skill-preview)
    const lobbyTip = box.querySelector('#lobby-passives-tip');
    const showLobbyPassive = (chip) => {
      if (!lobbyTip) return;
      box.querySelectorAll('.lobby-passive-chip.active-tip').forEach(c => c.classList.remove('active-tip'));
      chip.classList.add('active-tip');
      const name = chip.dataset.passiveName || '';
      const detail = chip.dataset.passiveDetail || '';
      lobbyTip.replaceChildren();
      const n = document.createElement('div');
      n.className = 'pt-name';
      n.textContent = name || 'Пассивка';
      const d = document.createElement('div');
      d.className = 'pt-detail';
      d.textContent = detail || 'Нет описания.';
      lobbyTip.appendChild(n);
      lobbyTip.appendChild(d);
      lobbyTip.classList.remove('hidden');
    };
    box.querySelectorAll('.lobby-passive-chip').forEach(chip => {
      chip.addEventListener('mouseenter', () => showLobbyPassive(chip));
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        showLobbyPassive(chip);
      });
      chip.addEventListener('focus', () => showLobbyPassive(chip));
    });
    // Тултипы на иконках скиллов в лобби — fixed float (не absolute)
    box.querySelectorAll('.skill-line .sl-ico').forEach(ico => {
      const name = ico.dataset.tipName || '';
      const detail = ico.dataset.tipDetail || '';
      if (!detail) return;
      const show = (e) => {
        e.stopPropagation();
        if (typeof showAbilityTipFloat === 'function') showAbilityTipFloat(ico, name, detail);
      };
      const hide = () => {
        if (typeof hideAbilityTipFloat === 'function') hideAbilityTipFloat();
      };
      ico.addEventListener('mouseenter', show);
      ico.addEventListener('mouseleave', hide);
      ico.addEventListener('focus', show);
      ico.addEventListener('blur', hide);
    });
    addBtn.disabled = false;
  }

  function heroPartyOn() {
    const cb = document.getElementById('chk-hero-party');
    return !!(cb && cb.checked && typeof igorHeroGetActive === 'function' && igorHeroGetActive());
  }
  function syncHeroPartySlot() {
    const cb = document.getElementById('chk-hero-party');
    const h = (typeof igorHeroGetActive === 'function') ? igorHeroGetActive() : null;
    if (cb) {
      cb.disabled = !h;
      if (!h) cb.checked = false;
    }
    if (!heroPartyOn() || !h) return;
    if (typeof igorHeroStashGear === 'function') igorHeroStashGear();
    const prev = party[0] || {};
    const same = prev.classId === h.classId && prev.specId === h.specId;
    const heroGear = (typeof igorHeroPersistGear === 'function') ? igorHeroPersistGear(h.gear) : (h.gear || emptyGear());
    const eq = heroGear && heroGear.equipped ? heroGear.equipped : {};
    const hasHeroGear = Object.keys(eq).some(k => eq[k]) || (Array.isArray(heroGear.bag) && heroGear.bag.length);
    const entry = {
      classId: h.classId,
      specId: h.specId,
      sec: prev.sec ? { ...prev.sec } : defaultSec(),
      gear: (!hasHeroGear && same && prev.gear) ? normalizeGear(prev.gear) : heroGear,
      heroLocked: true,
    };
    ensureSec(entry);
    if (!party.length) party.push(entry);
    else party[0] = Object.assign({}, party[0], entry);
    autoPlayPick = { classId: h.classId, specId: h.specId };
    if (typeof igorHeroStashGear === 'function') igorHeroStashGear();
  }
  function addToParty() {
    if (!pickClass || !pickSpec) return;
    if (heroPartyOn() && editSlot === 0) {
      toast('Слот 1 занят героем таверны');
      return;
    }
    if (!isSpecPatched(pickClass, pickSpec)) {
      toast('Спек пока без правок — недоступен');
      return;
    }
    const prevSec = (editSlot != null && party[editSlot]?.sec) ? { ...ensureSec(party[editSlot]) } : defaultSec();
    const prevGear = (editSlot != null && party[editSlot]?.gear) ? normalizeGear(party[editSlot].gear) : emptyGear();
    const entry = { classId: pickClass, specId: pickSpec, sec: prevSec, gear: prevGear };
    ensureSec(entry);
    if (!(heroPartyOn() && party[0] && party[0].heroLocked)) {
      autoPlayPick = { classId: pickClass, specId: pickSpec };
    }
    if (editSlot != null && editSlot < party.length) {
      party[editSlot] = entry;
      editSlot = null;
    } else if (party.length < getPartySize()) {
      party.push(entry);
    } else {
      toast('Пати полная — кликните слот чтобы заменить');
      return;
    }
    renderParty();
    toast('Добавлено в отряд');
    savePartyProfile();
  }

  function secPanelHtml(entry, slotIndex) {
    // база + шмот (не пишем в entry.sec — иначе двойной учёт в бою)
    const s = (typeof secWithGear === 'function') ? secWithGear(entry) : ensureSec(entry);
    const mi = masteryInfo(entry.classId, entry.specId);
    const cRating = s.critRating != null ? s.critRating : SEC_CRIT_RATING;
    const vRating = s.versRating != null ? s.versRating : SEC_VERS_RATING;
    const mRating = s.masteryRating != null ? s.masteryRating : SEC_MASTERY_RATING;
    const cPct = Math.round((cRating / SEC_CRIT_RATING) * SEC_CRIT_DEFAULT * 1000) / 10;
    const vPct = Math.round(vRating * SEC_VERS_PCT_PER_RATING * 1000) / 10;
    const mPct = Math.round(masteryDisplayPct(entry.classId, entry.specId, mRating) * 10) / 10;
    const gb = s._gearBonus || { crit: 0, vers: 0, mastery: 0 };
    const gearNote = (n) => (n > 0 ? ` · шмот +${n}` : n < 0 ? ` · шмот ${n}` : '');
    const rateLabel = (total, gear) => (gear ? `${total} <span class="sec-gear-delta">+${gear}</span>` : String(total));
    const mEffect = mi.effect || mi.desc || 'Увеличивает эффективность специализации';
    const mName = mi.name || 'Искусность';
    const tip = (title, body, meta) =>
      `<div class="sec-tip" role="tooltip">
        <div class="smt-name">${title}</div>
        <div class="smt-effect">${body}</div>
        ${meta ? `<div class="smt-meta">${meta}</div>` : ''}
      </div>`;
    return `<div class="sec-panel" data-slot="${slotIndex}" onclick="event.stopPropagation()">
      <div class="sec-title">Вторичные характеристики</div>
      <div class="sec-rows">
        <div class="sec-row-card" tabindex="0">
          <span class="sec-k">Критический удар</span>
          <span class="sec-rating">${rateLabel(cRating, gb.crit)}</span>
          <span class="sec-pct">${cPct}%</span>
          ${tip('Критический удар', 'Вероятность дополнительного урона и исцеления', `рейтинг ${cRating} → ${cPct}%${gearNote(gb.crit)}`)}
        </div>
        <div class="sec-row-card" tabindex="0">
          <span class="sec-k">Искусность</span>
          <span class="sec-rating">${rateLabel(mRating, gb.mastery)}</span>
          <span class="sec-pct">${mPct}%</span>
          ${tip(mName, mEffect, `рейтинг ${mRating} → ${mPct}% · при рейтинге 120: ${mi.pctAt120 ?? 36}%${gearNote(gb.mastery)}`)}
        </div>
        <div class="sec-row-card" tabindex="0">
          <span class="sec-k">Универсальность</span>
          <span class="sec-rating">${rateLabel(vRating, gb.vers)}</span>
          <span class="sec-pct">${vPct}%</span>
          ${tip('Универсальность', 'Снижает входящий урон и усиливает исходящее исцеление', `рейтинг ${vRating} → ${vPct}% (−${Math.round(vPct * 0.6 * 10) / 10}% вх. · +${Math.round(vPct * 0.8 * 10) / 10}% хил)${gearNote(gb.vers)}`)}
        </div>
      </div>
    </div>`;
  }


  function renderParty() {
    const slots = document.getElementById('party-slots');
    slots.innerHTML = '';
    const raidLobby = typeof isRaidLobby === 'function' && isRaidLobby();
    for (let i = 0; i < getPartySize(); i++) {
      const p = party[i];
      const div = document.createElement('div');
      div.className = 'slot' + (p ? ' filled' : ' empty-slot') + (editSlot === i ? ' active-edit' : '') + (raidLobby ? ' raid-member' : '') + ((i === 0 && heroPartyOn()) ? ' hero-locked' : '');
      if (p) {
        ensureSec(p);
        p.gear = normalizeGear(p.gear);
        const cls = WOW_MOP.getClass(p.classId);
        const spec = WOW_MOP.getSpec(p.classId, p.specId);
        if (!cls || !spec) {
          div.className = 'slot empty-slot' + (raidLobby ? ' raid-member' : '');
          div.innerHTML = '<div class="slot-empty">нет данных · ' +
            String(p.classId || '?') + '/' + String(p.specId || '?') + '</div>';
          slots.appendChild(div);
          continue;
        }
        const { primary, secondary } = WOW_MOP.resolveResources(cls, spec);
        // ДК Нечестивость — зелёный контур; иначе цвет класса
        const cc = (typeof classAccentColor === 'function')
          ? classAccentColor(p.classId, p.specId)
          : (CLASS_CSS[cls.id] || cls.color);
        const face = artHtml(
          ASSETS.specP(p.classId, p.specId),
          spec.icon || cls.icon,
          'ico slot-portrait',
          `--cc:${cc}`
        );
        if (raidLobby) {
          const res = `${primary.icon || ''}${secondary ? ' ' + (secondary.icon || '') : ''}`.trim();
          div.innerHTML = `
          <button type="button" class="remove" title="Убрать" aria-label="Убрать из отряда">✕</button>
          <div class="slot-main raid-card">
            ${face}
            <div class="meta">
              <b>${cls.name} · ${spec.name}${(i === 0 && heroPartyOn()) ? ' · герой' : ''}</b>
              <span class="${ROLE_CLASS[spec.role]}">${ROLE_LABEL[spec.role]}${res ? ' · ' + res : ''}</span>
            </div>
            <button type="button" class="btn btn-sm party-gear-btn" data-gear-idx="${i}">Шмот</button>
          </div>`;
        } else {
          div.innerHTML = `
          <button type="button" class="remove" title="Убрать" aria-label="Убрать из отряда">✕</button>
          <div class="slot-main">
            <div class="slot-identity">
              ${face}
              <div class="meta">
                <b>${cls.name} · ${spec.name}</b>
                <span class="${ROLE_CLASS[spec.role]}">${ROLE_LABEL[spec.role]} · ур. вещей ${avgIlvl(p.gear)} · способностей: ${spec.abilities.length}</span>
                <div class="res">${primary.icon} ${primary.name}${secondary ? ' · ' + secondary.icon + ' ' + secondary.name : ''}</div>
                <button type="button" class="btn btn-sm party-gear-btn" data-gear-idx="${i}">Шмот · ${avgIlvl(p.gear) || 0}</button>
              </div>
            </div>
            <div class="slot-divider" aria-hidden="true"><i></i></div>
            <div class="slot-sec-wrap">
              ${secPanelHtml(p, i)}
            </div>
          </div>`;
        }
        div.style.borderColor = cc;
        div.style.setProperty('--cc', cc);
        if (p.classId === 'deathknight' && p.specId === 'unholy') {
          div.classList.add('slot-dk-unholy');
        }
        div.querySelector('.remove').addEventListener('click', (e) => {
          e.stopPropagation();
          party.splice(i, 1);
          renderParty();
          savePartyProfile();
        });
      } else if (raidLobby) {
        div.innerHTML = `
          <div class="slot-main raid-card">
            <div class="ico slot-portrait art-wrap no-art empty-face" aria-hidden="true"><span class="art-emoji">＋</span></div>
            <div class="meta">
              <b>Слот ${i + 1}</b>
              <span>пусто</span>
            </div>
          </div>`;
      } else {
        // Та же сетка, что у заполненного слота — высота не сжимается
        div.innerHTML = `
          <div class="slot-main">
            <div class="slot-identity">
              <div class="ico slot-portrait art-wrap no-art empty-face" aria-hidden="true"><span class="art-emoji">＋</span></div>
              <div class="meta">
                <b>Пустой слот ${i + 1}</b>
                <span>Выберите класс и спек слева</span>
                <div class="res empty-res">—</div>
                <span class="party-gear-btn empty-gear-ph" aria-hidden="true">Шмот · —</span>
              </div>
            </div>
            <div class="slot-divider" aria-hidden="true"><i></i></div>
            <div class="slot-sec-wrap">
              <div class="sec-panel sec-panel-empty" aria-hidden="true">
                <div class="sec-title">Вторичные характеристики</div>
                <div class="sec-rows">
                  <div class="sec-row-card empty"><span class="sec-k">Критический удар</span><span class="sec-rating">—</span><span class="sec-pct">—</span></div>
                  <div class="sec-row-card empty"><span class="sec-k">Искусность</span><span class="sec-rating">—</span><span class="sec-pct">—</span></div>
                  <div class="sec-row-card empty"><span class="sec-k">Универсальность</span><span class="sec-rating">—</span><span class="sec-pct">—</span></div>
                </div>
              </div>
            </div>
          </div>`;
      }
      div.addEventListener('click', () => {
        if (i === 0 && heroPartyOn()) {
          toast('Слот 1 занят героем таверны');
          return;
        }
        editSlot = i;
        if (p) {
          pickClass = p.classId; pickSpec = p.specId;
          showSpecTab();
          document.querySelectorAll('#class-grid .pick-card').forEach(el => {
            el.classList.toggle('selected', el.dataset.id === pickClass);
          });
          if (typeof syncBalanceFilterFromPick === 'function') {
            syncBalanceFilterFromPick(pickClass, pickSpec);
          }
        }
        renderParty();
        updatePreview();
        toast('Слот ' + (i + 1) + ' — выберите класс/спек и «Добавить»');
      });
      slots.appendChild(div);
    }

        slots.querySelectorAll('[data-gear-idx]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openGearModalForLobby(+btn.getAttribute('data-gear-idx'));
      });
    });
    const roles = party.map(p => (WOW_MOP.getSpec(p.classId, p.specId) || {}).role);
    const tanks = roles.filter(r => r === 'tank').length;
    const heals = roles.filter(r => r === 'healer').length;
    const dps = roles.filter(r => r === 'dps').length;
    const need = getPartyNeed();
    const ok = party.length === getPartySize() && tanks === need.tank && heals === need.healer && dps === need.dps;
    const req = document.getElementById('party-req');
    req.className = 'party-req ' + (ok ? 'ok' : 'bad');
    req.textContent = ok
      ? `✓ Состав верный (${need.tank} танк${need.tank > 1 ? 'а' : ''} · ${need.healer} целител${need.healer > 1 ? 'я' : 'ь'} · ${need.dps} бойц${need.dps > 1 ? 'ов' : 'а'})`
      : `Сейчас: танк ${tanks}/${need.tank} · целитель ${heals}/${need.healer} · боец ${dps}/${need.dps} · слотов ${party.length}/${getPartySize()}`;
    document.getElementById('btn-start').disabled = !ok;
  }

    function refreshAffixes() {
    const level = +document.getElementById('key-level').value;
    const wb = document.getElementById('week-badge');
    if (wb) wb.textContent = weeklyAffixLabel() + ' · +' + level;
    document.getElementById('affix-list').innerHTML = keyAffixes(level)
      .map(a => `<span class="affix" title="${a.desc || ''}">${a.name}</span>`).join('');
  }

  // ── Combatant from class/spec ──
  /**
   * Если в отряде несколько одинаковых класс+спек — суффикс «· 1/2/3»
   * (Recount, портреты, журнал: понятно, кто нанёс урон).
   */
  function assignPartyUniqueNames(list) {
    if (!list || !list.length) return list;
    const groups = Object.create(null);
    list.forEach((p, i) => {
      p.partyIndex = i + 1;
      const key = String(p.classId || '') + '|' + String(p.specId || '');
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    for (const p of list) {
      const key = String(p.classId || '') + '|' + String(p.specId || '');
      const g = groups[key] || [p];
      const cls = p.className || p.name || 'Герой';
      const spec = p.specName || '';
      const baseFull = spec ? (cls + ' (' + spec + ')') : cls;
      if (g.length > 1) {
        const n = g.indexOf(p) + 1;
        p.dupIndex = n;
        p.name = cls + ' · ' + n;
        p.fullName = baseFull + ' · ' + n;
      } else {
        p.dupIndex = 0;
        p.name = cls;
        p.fullName = baseFull;
      }
    }
    return list;
  }

  function createHero(classId, specId, keyLevel, secStats, gearState) {
    const cls = WOW_MOP.getClass(classId);
    const spec = WOW_MOP.getSpec(classId, specId);
    if (!cls || !spec) {
      throw new Error('Нет класса/спека: ' + String(classId) + '/' + String(specId));
    }
    const res = makeResourceState(cls, spec);
    const sec = ensureSec({ sec: secStats ? { ...secStats } : defaultSec() });
    const opts = (typeof window !== 'undefined' && window._igorCreateHeroOpts) || null;
    let isHeroUnit = !!(opts && opts.isHero);
    let scaleLevel = (opts && opts.scaleLevel != null) ? opts.scaleLevel : null;
    if (!opts && typeof igorHeroGetActive === 'function') {
      const active = igorHeroGetActive();
      if (active && active.classId === classId && active.specId === specId && !window._igorHeroBindUsed) {
        isHeroUnit = true;
        scaleLevel = active.level;
        window._igorHeroBindUsed = true;
      }
    }
    const share = (scaleLevel != null && typeof igorHeroLevelShare === 'function')
      ? igorHeroLevelShare(scaleLevel)
      : 1;
    if (isHeroUnit && scaleLevel != null && typeof igorHeroSecForLevel === 'function') {
      const lvSec = igorHeroSecForLevel(scaleLevel);
      sec.critRating = lvSec.critRating;
      sec.masteryRating = lvSec.masteryRating;
      sec.versRating = lvSec.versRating;
      ensureSec({ sec });
    }
    // Guardian mastery tiny max HP bump (scales with mastery %)
    let hpBonus = 1;
    const mi = masteryInfo(classId, specId);
    if (mi.kind === 'tank' && classId === 'druid' && specId === 'guardian') {
      const mp = (sec.masteryRating != null ? sec.masteryRating : SEC_MASTERY_RATING) / SEC_MASTERY_RATING * ((mi.pctAt120 || 35) / 100);
      hpBonus = 1 + mp * 0.12;
    }
    // Без героя — текущий кит × STAT_SCALE. С героем — кривая доли; ур.40 = те же spec.stats.
    const baseMaxHp = Math.round(spec.stats.hp * STAT_SCALE * hpBonus * share);
    const baseAtk = Math.round(spec.stats.atk * STAT_SCALE * share);
    const baseDef = Math.round(spec.stats.def * STAT_SCALE * share);
    const baseSpeed = spec.stats.speed;
    const hero = {
      uid: uid(),
      classId, specId,
      name: `${cls.name}`,
      fullName: `${cls.name} (${spec.name})`,
      icon: cls.icon,
      specIcon: spec.icon,
      role: spec.role,
      className: cls.name,
      specName: spec.name,
      side: 'ally',
      sec: { ...sec },
      maxHp: baseMaxHp,
      hp: baseMaxHp,
      atk: baseAtk,
      def: baseDef,
      speed: baseSpeed,
      // базы до шмота — applyGearToHero накинет экип (скиллы через getEff.atk)
      _baseMaxHp: baseMaxHp,
      _baseAtk: baseAtk,
      _baseDef: baseDef,
      _baseSpeed: baseSpeed,
      shield: 0,
      stagger: 0,
      abilities: (() => {
        let list = spec.abilities.map(a => {
          let type = a.type || 'damage';
          if (DOT_ABILITY_IDS.has(a.id)) type = 'dot';
          else if (hotConfig(a.id)) type = 'heal';
          const power = Number(a.power);
          // fl → flat (на случай если A() не проставил flat)
          const flatFromData = a.flat != null ? a.flat : a.fl;
          const ab = {
            ...a,
            type,
            power: Number.isFinite(power) && power > 0 ? power : 1,
            baseCd: a.cd || 0,
            curCd: 0,
          };
          if (flatFromData != null && Number.isFinite(Number(flatFromData))) {
            ab.flat = Number(flatFromData);
          }
          stampAbilitySchool(ab, classId, specId);
          return ab;
        });
        const kickClasses = new Set(['warrior', 'mage', 'shaman', 'monk', 'paladin']);
        if (kickClasses.has(classId) && specId !== 'mistweaver'
            && !list.some(a => INTERRUPT_IDS.has(a.id) || a.type === 'interrupt')) {
          list.push({
            id: 'kick', name: 'Прерывание', nameEn: 'Прерывание', icon: '🦵',
            cost: 0, gen: 0, costSec: 0, genSec: 0, costRunes: null, genRunic: 0,
            cd: 2, baseCd: 2, curCd: 0, type: 'interrupt', power: 0, school: 'none',
            desc: 'Сбивает чтение заклинания врага · немота 2 хода',
          });
        }
        list = injectUtilityAbilities(list, classId, spec.role, specId);
        list.forEach(ab => stampAbilitySchool(ab, classId, specId));
        return list;
      })(),
      buffs: [],
      alive: true,
      res,
      color: cls.color,
      gear: normalizeGear(opts && opts.noGear ? null : gearState),
      ilvl: 0,
    };
    hero._heroLevel = scaleLevel;
    hero._isHero = !!isHeroUnit;
    if (scaleLevel != null && typeof igorHeroFilterAbilities === 'function') {
      hero.abilities = igorHeroFilterAbilities(hero.abilities, classId, specId, scaleLevel);
    }
    hero._baseSecCritRating = hero.sec.critRating;
    hero._baseSecVersRating = hero.sec.versRating;
    hero._baseSecMasteryRating = hero.sec.masteryRating;
    if (typeof igorHeroApplyHonestStats === 'function') {
      igorHeroApplyHonestStats(hero);
    }
    if (isHeroUnit && typeof igorHeroApplyTalents === 'function') {
      igorHeroApplyTalents(hero);
    }
    applyGearToHero(hero);
    for (const a of hero.abilities || []) {
      if (a.maxCharges && a.charges == null) a.charges = a.maxCharges;
    }
    if (typeof party !== 'undefined' && Array.isArray(party)) {
      const src = party.find(p => p && p.classId === classId && p.specId === specId
        && Array.isArray(p.abilityOrder) && p.abilityOrder.length);
      if (src) hero.abilityOrder = src.abilityOrder.slice();
    }
    return hero;
  }

  // ── Run ──
  function bindAbandonButton() {
    const btn = document.getElementById('btn-abandon');
    if (!btn) return;
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.type = 'button';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!run || run.finished) {
        toast('Заход уже закончен');
        return;
      }
      endRun(false, run.raid ? 'Вы покинули рейд.' : 'Вы покинули ключ.');
    });
  }

  function beginRunScreen() {
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('run-screen').classList.remove('hidden');
    document.getElementById('end-modal').classList.add('hidden');
    document.body.classList.toggle('raid-run', !!(run && run.raid));
    try { bindAbandonButton(); } catch (_) {}
    paused = false;
    const b = document.getElementById('btn-pause');
    if (b) b.textContent = 'Пауза';
    if (!recount) resetRecount();
    showRecountPanel(true);
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!run || run.finished || paused) return;
      run.timerLeft = Math.max(0, run.timerLeft - 1);
      updateHud();
      if (run.timerLeft % 8 === 0) saveRun();
      if (run.timerLeft <= 0) endRun(false, 'Время вышло. Ключ провален.');
    }, 1000);
  }

  function startRun() {
    try {
      window._igorHeroBindUsed = false;
      savePartyProfile();
      party = (party || []).filter(p => p && WOW_MOP.getSpec(p.classId, p.specId));
      const raid = isRaidLobby();
      const dungeon = raid
        ? RAID_DUNGEON
        : DUNGEONS.find(d => d.id === document.getElementById('dungeon-select').value);
      if (!dungeon) { toast('Выберите подземелье'); return; }
      const raidDiff = raid
        ? (typeof getRaidDiff === 'function' ? getRaidDiff() : 'normal')
        : null;
      const keyLevel = raid
        ? (typeof raidScaleKey === 'function' ? raidScaleKey(raidDiff) : (raidDiff === 'heroic' ? 8 : 5))
        : +document.getElementById('key-level').value;
      const affixes = raid ? [] : keyAffixes(keyLevel);
      const timerMax = raid
        ? (raidDiff === 'heroic' ? 8 * 60 : 10 * 60)
        : Math.max(12 * 60, dungeon.timerBase - (keyLevel - 2) * 25);
      run = {
        dungeon, keyLevel, affixes, roomIndex: 0, talents: [], deaths: 0,
        timerMax, timerLeft: timerMax, logs: [], restBuffBattles: 0, finished: false,
        forces: 0, loot: [],
        raid: !!raid,
        raidDiff: raid ? (raidDiff === 'heroic' ? 'heroic' : 'normal') : null,
        route: raid ? generateRaidRoute() : generateRoute(dungeon),
        party: party.map(p => {
          const h = createHero(p.classId, p.specId, keyLevel, p.sec, p.gear);
          if (Array.isArray(p.abilityOrder) && p.abilityOrder.length) h.abilityOrder = p.abilityOrder.slice();
          return h;
        }),
        _roomArt: {}, // стабильные фоны комнат (rift/ember)
      };
      assignPartyUniqueNames(run.party);
      raidPlayerUid = (typeof pickAutoPlayerUid === 'function')
        ? pickAutoPlayerUid()
        : (run.raid
          ? (run.party.find(p => p.role === 'tank')?.uid || run.party[0]?.uid)
          : (run.party.find(p => p.role === 'dps')?.uid || run.party[0]?.uid));
      raidAutoAllies = true;
      resetRecount();
      beginRunScreen();
      applyDungeonTheme();
      if (raid) {
        log(`Рейд 10 · ${typeof raidDiffLabel === 'function' ? raidDiffLabel(raidDiff) : raidDiff}: ${dungeon.name}. Лэй Шэнь толстый. Обычный ≈ 10.6м HP / ~41т. Героический ≈ 19.5м HP. Минутный спринт не закрывает.`, 'system');
        log('Механики: смена танков (Перегрузка ×3) · Проводники СТ · метки молнии · соки сфер · кики кастов · с 40% два зала.', 'system');
        log('Авто-рейд: союзники ходят сами. Клик по герою — взять управление.', 'system');
      } else {
        log(`Ключ +${keyLevel}: ${dungeon.name}. Маршрут с развилками · нужно ⚔ ${FORCES_TARGET}% сил (на карте ~${FORCES_MAP_BUDGET}%).` +
          (keyLevel >= 9 ? ' Потолок без шмоток — +8. Выше стена.' : (keyLevel >= 8 ? ' +8 — потолок без шмоток.' : '')), 'system');
        log('Авто-ключ: союзники ходят сами. Клик по герою — взять управление. Кнопка сверху выключает авто.', 'system');
      }
      log(`Отряд: ${run.party.map(p => p.fullName).join(', ')}`, 'system');
      updateHud(); renderPath(); renderPowers(); enterRoom();
      saveRun();
    } catch (e) {
      console.error(e);
      alert('Ошибка: ' + e.message);
    }
  }

  function continueRun() {
    try {
      window._igorHeroBindUsed = false;
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return toast('Нет сохранения');
      const data = JSON.parse(raw);
      const dungeon = data.dungeonId === 'throne' || data.raid
        ? RAID_DUNGEON
        : DUNGEONS.find(d => d.id === data.dungeonId);
      if (!dungeon) return toast('Данж из сейва не найден');
      party = (data.partyBuild || []).map(x => {
        const e = { classId: x.classId, specId: x.specId, sec: x.sec ? { ...x.sec } : defaultSec(), gear: normalizeGear(x.gear) };
        if (Array.isArray(x.abilityOrder) && x.abilityOrder.length) e.abilityOrder = x.abilityOrder.slice();
        ensureSec(e);
        return e;
      });
      const isRaidSave = !!(data.raid || data.dungeonId === 'throne');
      const raidDiff = isRaidSave
        ? (data.raidDiff === 'heroic' || (!data.raidDiff && data.keyLevel >= 8) ? 'heroic' : 'normal')
        : null;
      const keyLevel = isRaidSave
        ? (typeof raidScaleKey === 'function' ? raidScaleKey(raidDiff) : (raidDiff === 'heroic' ? 8 : 5))
        : data.keyLevel;
      run = {
        dungeon, keyLevel, affixes: isRaidSave ? [] : keyAffixes(keyLevel),
        roomIndex: data.roomIndex || 0,
        talents: data.talents || [],
        deaths: data.deaths || 0,
        timerMax: data.timerMax, timerLeft: data.timerLeft,
        logs: data.logs || [], restBuffBattles: data.restBuffBattles || 0,
        finished: false, forces: data.forces || 0, loot: data.loot || [],
        route: data.route && data.route.nodes
          ? data.route
          : generateRoute(dungeon),
        party: (data.party || []).map(p => {
          const h = createHero(p.classId, p.specId, keyLevel, p.sec, p.gear);
          // restore bases if present so gear re-apply is stable
          if (p._baseAtk != null) h._baseAtk = p._baseAtk;
          if (p._baseMaxHp != null) h._baseMaxHp = p._baseMaxHp;
          if (p._baseDef != null) h._baseDef = p._baseDef;
          if (p._baseSpeed != null) h._baseSpeed = p._baseSpeed;
          if (p._baseSecCritRating != null) h._baseSecCritRating = p._baseSecCritRating;
          if (p._baseSecVersRating != null) h._baseSecVersRating = p._baseSecVersRating;
          if (p._baseSecMasteryRating != null) h._baseSecMasteryRating = p._baseSecMasteryRating;
          h.sec = ensureSec({ sec: p.sec ? { ...p.sec } : defaultSec() });
          h.gear = normalizeGear(p.gear);
          applyGearToHero(h);
          h.hp = p.hp; h.maxHp = p.maxHp; h.atk = p.atk; h.def = p.def; h.speed = p.speed;
          h.alive = p.alive; h.shield = p.shield || 0;
          if (p.res) h.res = p.res;
          if (Array.isArray(p.abilityOrder) && p.abilityOrder.length) h.abilityOrder = p.abilityOrder.slice();
          return h;
        }),
        raid: isRaidSave,
        raidDiff: raidDiff,
        _roomArt: data._roomArt || {},
      };
      if (!run.party.length) {
        run.party = party.map(p => {
          const h = createHero(p.classId, p.specId, keyLevel, p.sec, p.gear);
          if (Array.isArray(p.abilityOrder) && p.abilityOrder.length) h.abilityOrder = p.abilityOrder.slice();
          return h;
        });
      }
      assignPartyUniqueNames(run.party);
      raidPlayerUid = (typeof pickAutoPlayerUid === 'function')
        ? pickAutoPlayerUid()
        : (run.raid
          ? (run.party.find(p => p.role === 'tank')?.uid || run.party[0]?.uid)
          : (run.party.find(p => p.role === 'dps')?.uid || run.party[0]?.uid));
      raidAutoAllies = true;
      if (run.raid) {
        if (!run.route?.nodes || data.dungeonId === 'throne') {
          if (!run.route?.nodes) run.route = generateRaidRoute();
        }
      }
      if (!run.route?.nodes) run.route = run.raid ? generateRaidRoute() : generateRoute(dungeon);
      beginRunScreen();
      applyDungeonTheme();
      log('Продолжение сохранения…', 'system');
      updateHud(); renderPath(); renderPowers(); enterRoom();
      toast('Сохранение загружено');
    } catch (e) {
      console.error(e);
      toast('Не удалось загрузить');
    }
  }

  function updateHud() {
    if (!run) return;
    document.getElementById('hud-key').textContent = run.raid
      ? (typeof raidDiffLabel === 'function' ? raidDiffLabel(run.raidDiff) : (run.raidDiff === 'heroic' ? 'Героический' : 'Обычный'))
      : ('+' + run.keyLevel);
    document.getElementById('hud-dungeon').textContent = run.dungeon.name;
    const m = Math.floor(run.timerLeft / 60), s = run.timerLeft % 60;
    document.getElementById('hud-timer').textContent = `⏱ ${m}:${String(s).padStart(2, '0')}`;
    const forcesEl = document.getElementById('hud-forces');
    const f = Math.round(run.forces || 0);
    if (forcesEl) {
      forcesEl.textContent = `⚔ ${f}% / ${FORCES_TARGET}%`;
      forcesEl.title = f >= FORCES_TARGET ? 'Силы набраны' : 'Нужно 100% сил для закрытия ключа';
    }
    const ff = document.getElementById('forces-fill');
    if (ff) {
      ff.style.width = Math.min(100, f) + '%';
      ff.style.background = f >= FORCES_TARGET
        ? 'linear-gradient(90deg, #2a8a55, #3dd68c)'
        : 'linear-gradient(90deg, #3a70b0, #9b5fd4)';
    }
    const node = currentRouteNode();
    document.getElementById('hud-room').textContent = node
      ? `${ROOM_META[node.type]?.icon || ''} ${node.name}`
      : 'Маршрут';
    document.getElementById('hud-deaths').textContent = '💀 ' + run.deaths;
    document.getElementById('timer-fill').style.width = (run.timerLeft / run.timerMax * 100) + '%';
    const sp = document.getElementById('hud-speed');
    if (sp) sp.textContent = gameSpeed + '×';
    try { raidHudPatch(); } catch (_) {}
  }
  function routeNodeCard(n, cur, visited) {
    if (!n) return '';
    const m = ROOM_META[n.type] || { icon: '•', name: n.type };
    const isCur = n.id === cur;
    const isDone = visited.has(n.id) && !isCur;
    const st = n.pack === 'st';
    const cls = [
      'rm-node',
      isCur ? 'current' : '',
      isDone ? 'done' : '',
      st ? 'is-st' : '',
      n.type === 'boss' || n.type === 'final' ? 'is-boss' : '',
      n.mopup ? 'is-mop' : '',
    ].filter(Boolean).join(' ');
    const pct = n.forceBudget
      ? `<span class="rm-pct">+${n.forceBudget}%</span>`
      : `<span class="rm-pct rm-pct-0">${n.type === 'final' ? 'финал' : 'босс'}</span>`;
    const tag = st ? '<span class="rm-tag">СТ</span>' : (n.pack === 'aoe' ? '<span class="rm-tag aoe">AoE</span>' : '');
    return `<div class="${cls}" data-node="${n.id}" title="${n.name}">
      <span class="rm-ico">${m.icon}</span>
      <span class="rm-name">${n.name}</span>
      ${tag}${pct}
    </div>`;
  }
  function renderPath() {
    const list = document.getElementById('path-list');
    if (run?.raid) {
      if (list) { list.innerHTML = ''; list.classList.add('hidden'); }
      return;
    }
    if (list) list.classList.remove('hidden');
    if (!list || !run?.route) { if (list) list.innerHTML = ''; return; }
    const N = run.route.nodes;
    if (!N.start || !N.hall) {
      list.innerHTML = '<div class="room-node">Старый сейв маршрута — начни новый ключ</div>';
      return;
    }
    const cur = run.route.currentId;
    const visited = new Set(run.route.visited || []);
    const f = Math.round(run.forces || 0);
    const need = Math.max(0, FORCES_TARGET - f);
    const fork = (a, b) =>
      `<div class="rm-fork">${routeNodeCard(N[a], cur, visited)}<div class="rm-or">или</div>${routeNodeCard(N[b], cur, visited)}</div>`;
    let mop = '';
    if (run.route.mopupMode || run.route.finalCleared) {
      mop = `<div class="rm-line"></div>
        <div class="rm-mop-label">добор до 100%</div>
        ${routeNodeCard(N.mop1, cur, visited)}
        <div class="rm-line"></div>
        ${routeNodeCard(N.mop2, cur, visited)}
        <div class="rm-line"></div>
        ${routeNodeCard(N.mop3, cur, visited)}`;
    }
    list.innerHTML = `
      <div class="route-map">
        <div class="rm-forces ${f >= FORCES_TARGET ? 'ok' : ''}">⚔ ${f} / ${FORCES_TARGET}%${need ? ` · ещё ${need}%` : ' · можно закрыть'}</div>
        ${routeNodeCard(N.start, cur, visited)}
        <div class="rm-line"></div>
        ${routeNodeCard(N.hall, cur, visited)}
        <div class="rm-line"></div>
        ${fork('fork1a', 'fork1b')}
        <div class="rm-line"></div>
        ${routeNodeCard(N.mid, cur, visited)}
        <div class="rm-line"></div>
        ${routeNodeCard(N.descent, cur, visited)}
        <div class="rm-line"></div>
        ${fork('fork2a', 'fork2b')}
        <div class="rm-line"></div>
        ${routeNodeCard(N.approach, cur, visited)}
        <div class="rm-line"></div>
        ${routeNodeCard(N.final, cur, visited)}
        ${mop}
      </div>`;
  }
  function renderPowers() {
    const el = document.getElementById('party-powers');
    if (!el || !run) return;
    const talents = (run.talents || []).map(t => `<span class="power-chip ${t.rarity}">${t.icon} ${t.name}</span>`).join('');
    const loot = (run.loot || []).map(t => `<span class="loot-chip" title="${t.desc || ''}">${t.icon} ${t.name}</span>`).join('');
    const kp = run.keyPowers || {};
    const actives = [];
    if (kp.lust) actives.push(`<span class="loot-chip">🥁 Lust ${kp.lust.usedThisCombat ? '· CD' : '· ready'}</span>`);
    if (kp.party_shield) actives.push(`<span class="loot-chip">🛡 Щит ${kp.party_shield.usedThisCombat ? '· CD' : '· ready'}</span>`);
    if (kp.hunter_mark) actives.push(`<span class="loot-chip">🏹 Метка ${kp.hunter_mark.usedThisCombat ? '· CD' : '· ready'}</span>`);
    if (kp.battle_rez) actives.push(`<span class="loot-chip">💎 Rez ×${kp.battle_rez.charges || 0}</span>`);
    if (kp.skip_trash) actives.push(`<span class="loot-chip">🗺 Обход ×${kp.skip_trash.charges || 0}</span>`);
    if (run.trinketAtk) actives.push(`<span class="loot-chip">🔥 Тринкет ${run.trinketReady ? 'ready' : 'used'}</span>`);
    el.innerHTML = (talents || '<span class="power-chip">силы —</span>')
      + (loot ? '<br>' + loot : '')
      + (actives.length ? '<div class="power-active">' + actives.join('') + '</div>' : '');
  }
  function renderLog() {
    document.getElementById('log').innerHTML = (run?.logs || []).map(e =>
      `<div class="e ${e.cls}">${e.msg}</div>`).join('');
  }

  function enterRoom() {
    if (!run || run.finished) return;
    restBusy = false;
    talentDoneCb = null;
    if (!run.route) run.route = generateRoute(run.dungeon);
    const node = currentRouteNode();
    if (!node) {
      endRun(true, 'Ключ пройден!');
      return;
    }
    renderPath(); updateHud();
    applyRoomBackground(node);
    const type = node.type;
    const meta = ROOM_META[type] || { icon: '•', name: type };
    document.getElementById('phase-banner').textContent = meta.icon + ' ' + node.name;
    const f = Math.round(run.forces || 0);
    document.getElementById('phase-sub').textContent =
      type === 'rest'
        ? 'Привал — отдых и выбор пути'
        : (node.forceBudget
          ? `${meta.name} · в пулле ⚔ ~${node.forceBudget}% · всего ${f}/${FORCES_TARGET}%`
          : meta.name + ` · силы ${f}/${FORCES_TARGET}%`);
    combat = null; pendingTarget = null;
    if (type === 'rest') {
      // Привалы отключены: legacy-сейвы / старые маршруты — сразу дальше
      skipRestRoomAndContinue();
      return;
    }
    startCombat(type);
    if (run.raid) {
      try { showRaidBriefing(); } catch (_) {}
    }
    try { if (typeof syncPartyAutoHud === 'function') syncPartyAutoHud(); } catch (_) {}
  }

  /** Пропуск комнаты привала без хила/баффа (темп: пачка → пачка). */
  function skipRestRoomAndContinue() {
    try { document.getElementById('rest-modal')?.classList.add('hidden'); } catch (_) {}
    if (run?.route?.currentId) markNodeVisited(run.route.currentId);
    log('Привал отключён — сразу следующая комната (CD скиллов сохраняются).', 'system');
    const nextIds = (currentRouteNode()?.next || []);
    const options = nextIds.map(id => routeNode(id)).filter(Boolean)
      .filter(n => !run.route.visited.includes(n.id));
    if (options.length === 1) {
      goToNode(options[0].id);
      return;
    }
    if (options.length > 1) {
      showRouteChoice(options, '🗺 Дальше', 'Привал пропущен.');
      return;
    }
    advanceRoom();
  }

  /** @deprecated Привал UI отключён — оставлено на случай вызова. */
  function showRestRoom() {
    skipRestRoomAndContinue();
  }

  function markNodeVisited(id) {
    if (!run.route.visited) run.route.visited = [];
    if (!run.route.visited.includes(id)) run.route.visited.push(id);
  }

  function showRouteChoice(options, title, hint) {
    const modal = document.getElementById('route-modal');
    const box = document.getElementById('route-choices');
    const tEl = document.getElementById('route-modal-title');
    const hEl = document.getElementById('route-modal-hint');
    if (!modal || !box) {
      // fallback: first option
      if (options[0]) goToNode(options[0].id);
      return;
    }
    if (tEl) tEl.textContent = title || '🗺 Развилка';
    if (hEl) hEl.textContent = hint || 'Выбери маршрут.';
    box.innerHTML = '';
    options.forEach(n => {
      const m = ROOM_META[n.type] || { icon: '•', name: n.type };
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn' + (n.type === 'elite' ? ' btn-danger' : n.type === 'rest' ? '' : ' btn-ok');
      btn.innerHTML = `${m.icon} <b>${n.name}</b>`
        + (n.forceBudget ? `<div class="rc-pct">⚔ ~${n.forceBudget}% сил в пулле</div>` : '')
        + (n.mopup ? `<div class="rc-pct">добор сил</div>` : '')
        + (n.branch ? `<div class="rc-pct">ветка ${n.branch}</div>` : '');
      btn.onclick = () => {
        modal.classList.add('hidden');
        goToNode(n.id);
      };
      box.appendChild(btn);
    });
    modal.classList.remove('hidden');
  }

  function goToNode(id) {
    if (!run?.route?.nodes?.[id]) return;
    run.route.currentId = id;
    run.roomIndex = (run.roomIndex || 0) + 1;
    saveRun();
    enterRoom();
  }

  function tryFinishKey(msgPrefix) {
    const f = Math.round(run.forces || 0);
    if (f >= FORCES_TARGET) {
      const sc = scoreLabel();
      endRun(true, `${msgPrefix || 'Ключ закрыт!'} +${run.keyLevel} · ${sc} · ⚔${f}% · 💀${run.deaths}`);
      return true;
    }
    return false;
  }

  function advanceRoom() {
    if (!run || run.finished) return;
    const cur = currentRouteNode();
    if (!cur) { endRun(true, 'Ключ пройден!'); return; }
    markNodeVisited(cur.id);

    // Final boss cleared
    if (cur.type === 'final') {
      run.route.finalCleared = true;
      if (tryFinishKey('Финальный босс убит, силы набраны!')) return;
      // need more forces → mopup
      run.route.mopupMode = true;
      toast(`Силы ${Math.round(run.forces)}% — нужен добор до ${FORCES_TARGET}%`);
      log(`Финальный босс убит, но сил ${Math.round(run.forces)}/${FORCES_TARGET}%. Добор доступен.`, 'system');
      showRouteChoice(
        [routeNode('mop1')].filter(Boolean),
        '⚔ Добор сил',
        `Нужно ещё ${Math.max(0, FORCES_TARGET - Math.round(run.forces))}% · таймер идёт`
      );
      return;
    }

    // Mopup: цикл, пока нет 100%. Закрыть ключ с недобором нельзя.
    if (cur.mopup) {
      if (tryFinishKey('Силы набраны!')) return;
      let opts = (cur.next || []).map(id => routeNode(id)).filter(n => n && !run.route.visited.includes(n.id));
      if (!opts.length) {
        ['mop1', 'mop2', 'mop3'].forEach(id => {
          run.route.visited = (run.route.visited || []).filter(v => v !== id);
        });
        opts = [routeNode('mop1')].filter(Boolean);
        log('Добор: ещё один круг — нужно 100% сил.', 'system');
      }
      showRouteChoice(opts, '⚔ Добор сил', `Сейчас ${Math.round(run.forces)}/${FORCES_TARGET}% · без 100% ключ не закроется`);
      return;
    }

    const nextIds = cur.next || [];
    const options = nextIds.map(id => routeNode(id)).filter(Boolean);
    if (!options.length) {
      if (tryFinishKey()) return;
      endRun(true, `Маршрут кончился · ⚔${Math.round(run.forces)}%`);
      return;
    }
    if (options.length === 1) {
      goToNode(options[0].id);
      return;
    }
    showRouteChoice(options, '🗺 Развилка', 'Разные ветки дают разный % сил.');
  }

  function scaleEnemy(tpl, k, isBoss, isElite) {
    // Герой от ключа не растёт. Потолок без шмоток: +8 закрываем редко, +9+ — стена.
    // Шмот потом снизит разрыв, множители здесь не трогать «чтобы пройти сейчас».
    if (run && run.raid) {
      k = (typeof raidScaleKey === 'function')
        ? raidScaleKey(run.raidDiff)
        : (run.raidDiff === 'heroic' ? 8 : 5);
    }
    k = Math.max(2, +k || 2);
    let hpM = 1 + (k - 2) * 0.18;
    let atkM = 1 + (k - 2) * 0.14;
    if (k >= 5) { hpM *= 1.10; atkM *= 1.12; }
    if (k >= 7) { hpM *= 1.12; atkM *= 1.10; }
    if (k >= 8) { hpM *= 1.15; atkM *= 1.12; }
    if (k >= 9) {
      const over = k - 8;
      hpM *= 1.55 * Math.pow(1.22, over - 1);
      atkM *= 1.40 * Math.pow(1.16, over - 1);
    }
    if (run && run.raid) {
      hpM *= 1.12;
      atkM *= 1.08;
      // Босс: 1.52м снимали за минуту. Обычка ×7 ≈ 10.6м; героик ×10 от базы +8 ≈ 19.5м.
      if (isBoss) {
        const heroic = run.raidDiff === 'heroic';
        hpM *= heroic ? 10 : 7;
        atkM *= heroic ? 1.55 : 1.40;
      }
    }
    if (isBoss && hasEffect('boss_hp')) { hpM *= affixValue('boss_hp', 1.4); atkM *= 1.15; }
    if (!isBoss && hasEffect('trash_hp')) hpM *= affixValue('trash_hp', 1.35);
    let abilities = (tpl.abilities || []).map(a => ({ ...a }));
    let phases = tpl.phases || null;
    if (phases) abilities = (phases[0].abilities || []).map(a => ({ ...a }));
    // elites/bosses always have a telegraph cast if missing
    if ((isElite || isBoss) && !abilities.some(a => a.type === 'cast_aoe')) {
      abilities = abilities.concat([{ id: 'dark_cast', name: 'Тёмный каст', cost: 10, cd: 3, type: 'cast_aoe', power: isElite ? 0.88 : 0.78 }]);
    }
    const eliteHp = isElite ? 1.38 : 1;
    const eliteAtk = isElite ? 1.12 : 1;
    // forcesValue assigned later from node.forceBudget (M+ %)
    const hp = Math.round(tpl.hp * hpM * eliteHp * STAT_SCALE);
    const name = isElite && !String(tpl.name).includes('◆') ? ('◆ ' + tpl.name) : tpl.name;
    return {
      uid: uid(), heroId: tpl.id, name, icon: tpl.icon, role: tpl.role || 'dps', side: 'enemy',
      maxHp: hp, hp,
      atk: Math.round(tpl.atk * atkM * eliteAtk * STAT_SCALE),
      def: Math.round(((tpl.def || 0) + Math.floor((k - 2) / 3)) * STAT_SCALE),
      speed: tpl.speed || 10, shield: 0, forcesValue: 0,
      res: { primary: { type: 'mana', name: 'Мана', icon: '💧', max: 50, current: 50, regen: 5 }, secondary: null, runes: null },
      abilities: abilities.map(a => {
        const ab = {
          id: a.id, name: a.name, icon: a.icon || '✨', cost: a.cost || 0, gen: 0, costSec: 0, genSec: 0,
          costRunes: null, genRunic: 0, cd: a.cd || 0, baseCd: a.cd || 0, curCd: 0,
          type: a.type, power: a.power || 1, desc: '',
          castKind: a.castKind || null, castPrio: a.castPrio || 0,
          school: a.school || null,
        };
        // Враги: школа по скиллу (касты чаще магия, мили — физ.)
        if (!ab.school) {
          const t = String(ab.type || '');
          if (t === 'cast_aoe') ab.school = 'shadow';
          else if (t === 'aoe' || t === 'damage') ab.school = 'physical';
          else if (t === 'dot') ab.school = 'shadow';
          else ab.school = 'none';
        }
        return ab;
      }),
      buffs: [], alive: true, isBoss: !!isBoss, isElite: !!isElite, phases, phaseIndex: 0, enraged: false,
      casting: null,
      threat: {}, // uid -> threat number
      missedKicks: 0,
      mech: tpl.mech ? { ...tpl.mech } : null,
    };
  }

  function themePools() {
    const th = run?.dungeon?.theme || 'crypt';
    const pack = ENEMIES.theme && ENEMIES.theme[th];
    if (pack) return pack;
    return {
      trash: ENEMIES.trash || [],
      elite: ENEMIES.elite || [],
      st: ENEMIES.elite || [],
    };
  }

  function addThreat(enemy, hero, amount) {
    if (!enemy || !hero || enemy.side !== 'enemy' || hero.side !== 'ally') return;
    if (!enemy.threat) enemy.threat = {};
    const id = hero.uid;
    enemy.threat[id] = (enemy.threat[id] || 0) + Math.max(0, amount || 0);
  }
  function getThreatTarget(enemy) {
    const heroes = livingHeroes();
    if (!heroes.length) return null;
    if (!enemy.threat) enemy.threat = {};
    // forceTarget from taunt status takes priority
    const taunted = enemy.buffs?.find(b => b.forceTarget);
    if (taunted) {
      const t = heroes.find(p => p.uid === taunted.forceTarget && p.alive);
      if (t) return t;
    }
    let best = null, bestV = -1;
    for (const h of heroes) {
      const v = enemy.threat[h.uid] || 0;
      if (v > bestV) { best = h; bestV = v; }
    }
    const tanks = heroes.filter(h => h.role === 'tank');
    if (tanks.length) {
      let mt = tanks[0], mtV = enemy.threat[mt.uid] || 0;
      for (const t of tanks) {
        const v = enemy.threat[t.uid] || 0;
        if (v > mtV) { mt = t; mtV = v; }
      }
      if (bestV <= 0) return mt;
      const PULL_RATIO = 1.5;
      if (best && best.role !== 'tank' && bestV < Math.max(mtV * PULL_RATIO, mtV + 400)) {
        return mt;
      }
      if (best && best.role !== 'tank' && bestV <= mtV * 1.1) return mt;
      return best || mt;
    }
    return best || heroes[0];
  }
  function topThreatUid(enemy) {
    const t = getThreatTarget(enemy);
    return t?.uid || null;
  }

  function spawnPack(type) {
    const k = run.keyLevel, enemies = [];
    const pools = themePools();
    const node = currentRouteNode();
    const packKind = node?.pack || (type === 'elite' ? 'mixed' : (type === 'trash' ? 'aoe' : type));
    const trashPool = pools.trash || ENEMIES.trash || [];
    const elitePool = pools.elite || ENEMIES.elite || trashPool;
    const stPool = pools.st || elitePool;
    const fallback = trashPool[0] || { id: 'z', name: 'Нежить', icon: '🧟', role: 'dps', hp: 95, atk: 13, def: 4, speed: 9,
      abilities: [{ id: 'h', name: 'Удар', cost: 0, cd: 0, type: 'damage', power: 1 }] };
    const pickSafe = (arr) => (arr && arr.length ? pick(arr) : fallback) || fallback;
    const randomMode = !!(run?.dungeon?.randomEnemies);

    const pushStChampion = () => {
      const champ = scaleEnemy(pickSafe(stPool), k, false, true);
      champ.maxHp = Math.round(champ.maxHp * 1.55);
      champ.hp = champ.maxHp;
      champ.atk = Math.round(champ.atk * 1.1);
      if (!String(champ.name).includes('СТ')) champ.name = champ.name + ' · СТ';
      enemies.push(champ);
      if (k >= 12) enemies.push(scaleEnemy(pickSafe(trashPool), k, false, false));
    };

    // Случайные инсты (Разлом / Угольные): каждый заход — уникальный состав пака
    if (randomMode && (type === 'trash' || type === 'elite')) {
      const isEmber = (run?.dungeon?.theme === 'ember');
      const CHAOS_PREFIX = isEmber
        ? ['Тлеющий', 'Угольный', 'Пепельный', 'Раскалённый', 'Зольный', 'Жаркий', 'Обугленный', 'Искрящий']
        : ['Искажённый', 'Пустотный', 'Хаотичный', 'Сломанный', 'Теневой', 'Разломный', 'Безумный', 'Мутировавший'];
      const CHAOS_SUFFIX = isEmber
        ? ['страж', 'голем', 'исполин', 'вихрь', 'уголёк', 'надсмотрщик', 'осколок', 'страж']
        : ['страж', 'ползун', 'шёпот', 'осколок', 'вихрь', 'кошмар', 'фрагмент', 'страж'];
      const allPool = trashPool.concat(elitePool);
      const abilPool = [];
      allPool.forEach(e => (e.abilities || []).forEach(a => abilPool.push(a)));
      const makeChaosTpl = (base, forceElite) => {
        const tpl = JSON.parse(JSON.stringify(base));
        const pre = CHAOS_PREFIX[Math.floor(Math.random() * CHAOS_PREFIX.length)];
        const suf = CHAOS_SUFFIX[Math.floor(Math.random() * CHAOS_SUFFIX.length)];
        tpl.name = pre + ' ' + suf;
        // случайный портрет из существующих enemy art (иконка + heroId для ASSETS.enemyP)
        const PORTRAIT_IDS = ['z','a','m','b','s','r','p','c','w','j','bz','eq','sp','th','nk','pl','sg','sha','bl','as'];
        const EMBER_ICONS = ['🪨','🔥','☄️','🌋','🪵','⚡','🦴','💀','🌑','👹'];
        const RIFT_ICONS = ['🌀','🌑','👻','🦇','🕷️','🔮','💀','👾','☄️','🧿'];
        tpl.id = PORTRAIT_IDS[Math.floor(Math.random() * PORTRAIT_IDS.length)];
        tpl.icon = isEmber
          ? EMBER_ICONS[Math.floor(Math.random() * EMBER_ICONS.length)]
          : RIFT_ICONS[Math.floor(Math.random() * RIFT_ICONS.length)];
        // лёгкий шум статов
        const noise = () => 0.85 + Math.random() * 0.35;
        tpl.hp = Math.round(tpl.hp * noise());
        tpl.atk = Math.round(tpl.atk * noise());
        tpl.def = Math.max(0, Math.round((tpl.def || 0) * noise()));
        tpl.speed = Math.max(5, Math.round((tpl.speed || 10) * (0.9 + Math.random() * 0.25)));
        // случайные способности из общего пула (1–3)
        const nAb = 1 + Math.floor(Math.random() * 3);
        const picked = [];
        for (let i = 0; i < nAb && abilPool.length; i++) {
          picked.push({ ...abilPool[Math.floor(Math.random() * abilPool.length)] });
        }
        if (!picked.some(a => a.type === 'damage' || a.type === 'aoe')) {
          picked.unshift({ id: 'h', name: 'Удар', cost: 0, cd: 0, type: 'damage', power: 1.0 + Math.random() * 0.3 });
        }
        tpl.abilities = picked;
        return tpl;
      };
      if (packKind === 'st') {
        const champ = scaleEnemy(makeChaosTpl(pickSafe(stPool), true), k, false, true);
        champ.maxHp = Math.round(champ.maxHp * 1.5);
        champ.hp = champ.maxHp;
        champ.name = champ.name + ' · СТ';
        enemies.push(champ);
      } else if (type === 'trash' || packKind === 'aoe') {
        const n = 3 + Math.floor(Math.random() * 3) + (k >= 8 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const base = pickSafe(Math.random() < 0.2 ? elitePool : trashPool);
          enemies.push(scaleEnemy(makeChaosTpl(base, false), k, false, false));
        }
      } else {
        enemies.push(scaleEnemy(makeChaosTpl(pickSafe(elitePool), true), k, false, true));
        const nTrash = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < nTrash; i++) {
          enemies.push(scaleEnemy(makeChaosTpl(pickSafe(trashPool), false), k, false, false));
        }
      }
    } else if (packKind === 'st') {
      pushStChampion();
    } else if (type === 'trash' || packKind === 'aoe') {
      const n = 4 + (k >= 5 ? 1 : 0) + (k >= 10 ? 1 : 0);
      for (let i = 0; i < n; i++) enemies.push(scaleEnemy(pickSafe(trashPool), k, false, false));
    } else if (type === 'elite' || packKind === 'mixed') {
      enemies.push(scaleEnemy(pickSafe(elitePool), k, false, true));
      enemies.push(scaleEnemy(pickSafe(trashPool), k, false, false));
      enemies.push(scaleEnemy(pickSafe(trashPool), k, false, false));
      if (k >= 10) enemies.push(scaleEnemy(pickSafe(trashPool), k, false, false));
    } else if (type === 'boss') {
      if (run.raid) {
        enemies.push(...spawnRaidEncounter());
      } else {
        const theme = run.dungeon.theme || 'crypt';
        const tpl = (ENEMIES.midBosses && ENEMIES.midBosses[theme])
          || (ENEMIES.bosses && ENEMIES.bosses[theme])
          || ENEMIES.bosses?.crypt
          || fallback;
        enemies.push(scaleEnemy(tpl, k, true, false));
        enemies.push(scaleEnemy(pickSafe(trashPool), k, false, false));
      }
    } else if (type === 'final') {
      if (run.raid) {
        enemies.push(...spawnRaidEncounter());
      } else {
        const theme = run.dungeon.theme || 'crypt';
        const finTpl = (ENEMIES.bosses && ENEMIES.bosses[theme]) || ENEMIES.bosses?.crypt || fallback;
        enemies.push(scaleEnemy(finTpl, k, true, false));
        enemies.push(scaleEnemy(pickSafe(elitePool), k, false, true));
      }
    }

    // Distribute node's forceBudget % across trash/elite (bosses = 0)
    const budget = node?.forceBudget || 0;
    const weights = enemies.map(e => (e.isBoss ? 0 : (e.isElite ? 2.2 : 1)));
    const wSum = weights.reduce((a, b) => a + b, 0) || 1;
    let left = budget;
    enemies.forEach((e, i) => {
      if (e.isBoss || weights[i] <= 0) { e.forcesValue = 0; return; }
      const isLast = i === enemies.length - 1 || weights.slice(i + 1).every(w => w <= 0);
      let v = isLast ? Math.round(left * 10) / 10 : Math.round((budget * weights[i] / wSum) * 10) / 10;
      e.forcesValue = Math.max(0.1, v);
      left = Math.round((left - e.forcesValue) * 10) / 10;
    });
    return enemies;
  }

  function applyTalentStats() {
    const te = talentEffects();
    for (const u of run.party) {
      const cls = WOW_MOP.getClass(u.classId);
      const spec = WOW_MOP.getSpec(u.classId, u.specId);
      if (!spec) continue;
      let hpM = te.hpMult || 1, atkM = te.atkMult || 1, defM = te.defMult || 1;
      if (te.allMult) { hpM *= te.allMult; atkM *= te.allMult; defM *= te.allMult; }
      if (u.role === 'tank' && te.tankHp) hpM *= te.tankHp;
      if (u.role === 'dps' && te.dpsAtk) atkM *= te.dpsAtk;
      const ratio = u.hp / Math.max(1, u.maxHp);
      const heroShare = (u._heroLevel != null && typeof igorHeroLevelShare === 'function')
        ? igorHeroLevelShare(u._heroLevel)
        : 1;
      // Базы БЕЗ шмота и БЕЗ номера ключа; затем applyGearToHero накинет экип
      u._baseMaxHp = Math.round(spec.stats.hp * hpM * STAT_SCALE * heroShare);
      u._baseAtk = Math.round(spec.stats.atk * atkM * STAT_SCALE * heroShare);
      u._baseDef = Math.round(spec.stats.def * defM * STAT_SCALE * heroShare);
      u._baseSpeed = (spec.stats.speed || 10) + (te.speedFlat || 0);
      // sec-базы без шмота (если ещё не зафиксированы — из текущего sec «голого»)
      if (u._baseSecCritRating == null) {
        u.sec = ensureSec(u);
        u._baseSecCritRating = Math.round(Number(u.sec.critRating != null ? u.sec.critRating : SEC_CRIT_RATING));
        u._baseSecVersRating = Math.round(Number(u.sec.versRating != null ? u.sec.versRating : SEC_VERS_RATING));
        u._baseSecMasteryRating = Math.round(Number(u.sec.masteryRating != null ? u.sec.masteryRating : SEC_MASTERY_RATING));
      }
      // временно выставить базы, чтобы ratio и applyGear работали
      u.maxHp = u._baseMaxHp;
      u.atk = u._baseAtk;
      u.def = u._baseDef;
      u.speed = u._baseSpeed;
      u.hp = clamp(Math.round(u.maxHp * ratio), 0, u.maxHp);
      if (u._isHero && u._heroLevel != null && typeof igorHeroSecForLevel === 'function') {
        const lvSec = igorHeroSecForLevel(u._heroLevel);
        u._baseSecCritRating = lvSec.critRating;
        u._baseSecVersRating = lvSec.versRating;
        u._baseSecMasteryRating = lvSec.masteryRating;
      }
      if (typeof igorHeroApplyHonestStats === 'function') {
        igorHeroApplyHonestStats(u);
      }
      if (u._isHero && typeof igorHeroApplyStatTalents === 'function') {
        igorHeroApplyStatTalents(u);
      }
      if (typeof applyGearToHero === 'function') {
        applyGearToHero(u);
        // после шмота сохранить % HP
        u.hp = clamp(Math.round(u.maxHp * ratio), 0, u.maxHp);
      }
      // Лут ключа (+атака / защита / HP) — на живую базу, от неё считается flat.
      for (const item of (run.loot || [])) {
        if (!item) continue;
        if (item.atkMult) u.atk = Math.round(u.atk * (1 + Number(item.atkMult)));
        if (item.defFlat) u.def = Math.round(u.def * (1 + Number(item.defFlat)));
        if (item.hpFlat) {
          const r2 = u.hp / Math.max(1, u.maxHp);
          u.maxHp = Math.round(u.maxHp * (1 + Number(item.hpFlat)));
          u.hp = clamp(Math.round(u.maxHp * r2), 0, u.maxHp);
        }
      }
    }
  }

  /**
   * Pet combat weight (ATK as fraction of owner ATK).
   * Permanent pets: meaningful off-DPS; temp summons: short burst.
   * HP/DEF stay softer — 90% incoming DR keeps them alive.
   */
  const PET_ATK_FROM_OWNER = {
    hunter_pet: 0.42,
    hunter_bear: 0.42,
    hunter_hawk: 0.48,
    hunter_raptor: 0.44,
    felguard:   0.40,   // Demo
    ghoul:      0.36,   // Unholy (also Blood/Frost permanent ghoul)
    imp:        0.28,   // Affli / Destro baseline
    water_totem:0.20,
    imp_boss:   0.45,
    voidwalker: 0.22,
    shadowfiend:0.48,   // short CD burst pet
    dire:       0.38,
    wolf:       0.32,   // ×2 spirits
    fire_ele:   0.48,
    gargoyle:   0.52,
    mirror:     0.28,   // ×2 images
    combat_bot: 0.44,
    pocket_bot: 0.30,
    turret:     0.40,
    bomb_drone: 0.36,
    siege_walker: 0.52,
    rocket_chicken: 0.38,
    world_destroyer: 0.55,
    scrap_bot:  0.24,
  };
  const PET_HP_MULT = 0.62;
  const PET_DEF_MULT = 0.5;
  /** Spec bonus on permanent pets (extra ATK share of owner). */
  const PET_SPEC_ATK_BONUS = {
    hunter_beast_mastery: 0.14,
    hunter_marksmanship: 0.05,
    hunter_survival: 0.06,
    warlock_demonology: 0.12,
    warlock_affliction: 0.04,
    warlock_destruction: 0.04,
    deathknight_unholy: 0.12,
    deathknight_frost: 0.04,
    deathknight_blood: 0.03,
    priest_shadow: 0.08,   // shadowfiend bursts
    shaman_elemental: 0.05,
    shaman_enhancement: 0.05,
    mage_arcane: 0.04,
    mage_fire: 0.04,
    mage_frost: 0.04,
     engineer_mechanist: 0.16,
    engineer_sapper: 0.06,
    engineer_tinkerer: 0.10,
  };

  function petAtkShare(defKey, owner) {
    let share = PET_ATK_FROM_OWNER[defKey] ?? 0.42;
    if (owner?.classId && owner?.specId) {
      const key = owner.classId + '_' + owner.specId;
      share += PET_SPEC_ATK_BONUS[key] || 0;
    }
    return share;
  }

  function createPetUnit(owner, defKey, turnsLeft) {
    const def = PET_DEFS[defKey] || PET_DEFS.imp;
    const ownAtk = owner?.atk || (16 * STAT_SCALE);
    let share = petAtkShare(defKey, owner);
    if (owner && owner.specId === 'demonology' && (defKey === 'imp' || defKey === 'imp_boss' || defKey === 'felguard')) {
      share *= 1.15;
    }
    const baseAtk = def.atk * STAT_SCALE * 0.22;
    let atk = Math.max(1, Math.round(ownAtk * share + baseAtk));
    if (owner?.buffs) {
      let petBoost = 0;
      for (const b of owner.buffs) if (b && b.petAtkMod) petBoost += Number(b.petAtkMod) || 0;
      if (petBoost > 0) atk = Math.round(atk * (1 + petBoost));
    }
    const maxHp = Math.round(def.hp * STAT_SCALE * PET_HP_MULT);
    // Temporary summons hit harder (short window)
    const tempBoost = (turnsLeft != null && defKey !== 'hellfiend' && defKey !== 'frost_ghoul' && defKey !== 'water_ele' && defKey !== 'infernal') ? 1.18 : 1;
    let finalAtk = Math.round(atk * tempBoost);
    // Исчадие ада / боевой бот: удар от веса «т», не от доли хозяина
    if (defKey === 'hellfiend' || defKey === 'frost_ghoul' || defKey === 'water_ele' || defKey === 'infernal' || defKey === 'combat_bot') {
      const ref = (typeof FLAT_REF === 'number' ? FLAT_REF : 15);
      finalAtk = ref * STAT_SCALE;
    }
    // Slightly faster pets so they act more often
    const speed = Math.max(8, def.speed + (turnsLeft != null ? 1 : 0));
    const isMain = turnsLeft == null && owner && mainPetKeyFor(owner.classId, owner.specId) === defKey;
    return {
      uid: uid(),
      isPet: true,
      petKey: defKey,
      isMainPet: !!isMain,
      attackMode: 'st', // st | aoe — «Отладка» изобретателя
      ownerUid: owner?.uid || null,
      petTurnsLeft: turnsLeft == null ? null : turnsLeft,
      classId: 'pet',
      name: def.name,
      fullName: def.name + (owner ? ` (${owner.name})` : ''),
      icon: def.icon,
      role: def.role || 'dps',
      side: owner?.side || 'ally',
      maxHp, hp: maxHp,
      atk: finalAtk,
      def: Math.round(def.def * STAT_SCALE * PET_DEF_MULT),
      speed,
      shield: 0,
      abilities: (function () {
        const kits = {
          combat_bot: [
            { id: 'bot_hit', name: 'Гидравлика', icon: '⚙️', power: 1, flat: 25, type: 'damage' },
          ],
          pocket_bot: [
            { id: 'pet_claw', name: 'Искровой укол', icon: '⚡', power: 1.0 },
            { id: 'pet_rend', name: 'Мини-ракеты', icon: '🚀', power: 1.25, cd: 2 },
          ],
          turret: [
            { id: 'pet_claw', name: 'Очередь', icon: '🔫', power: 1.05 },
            { id: 'pet_rend', name: 'Залп', icon: '💥', power: 1.35, cd: 2 },
          ],
          bomb_drone: [
            { id: 'pet_claw', name: 'Таран', icon: '🛸', power: 1.1 },
            { id: 'pet_rend', name: 'Самоподрыв', icon: '💣', power: 1.55, cd: 2 },
          ],
          siege_walker: [
            { id: 'pet_claw', name: 'Тяжёлый шаг', icon: '🦾', power: 1.1 },
            { id: 'pet_rend', name: 'Осадное орудие', icon: '🎯', power: 1.48, cd: 2 },
          ],
          rocket_chicken: [
            { id: 'pet_claw', name: 'Клюв-ракета', icon: '🐔', power: 1.08 },
            { id: 'pet_rend', name: 'Взрывной кудах', icon: '💥', power: 1.4, cd: 2 },
          ],
          world_destroyer: [
            { id: 'pet_aoe', name: 'Осадный залп', icon: '☢️', power: 1, flat: 30, type: 'aoe' },
          ],
          water_totem: [
            { id: 'totem_heal', name: 'Поток', icon: '💧', power: 1, flat: 20, type: 'heal' },
          ],
          scrap_bot: [
            { id: 'pet_claw', name: 'Цап', icon: '⚙️', power: 1, flat: 14, type: 'damage' },
          ],
          hellfiend: [
            { id: 'hell_hit', name: 'Удар Скверны', icon: '👿', power: 1, flat: 34, type: 'damage' },
          ],
          frost_ghoul: [
            { id: 'ghoul_hit', name: 'Укус', icon: '🧟', power: 1, flat: 15, type: 'damage' },
          ],
          water_ele: [
            { id: 'water_bolt', name: 'Водяная стрела', icon: '💧', power: 1, flat: 40, type: 'damage' },
          ],
          infernal: [
            { id: 'infernal_stomp', name: 'Топот', icon: '😈', power: 1, flat: 20, type: 'aoe' },
          ],
          imp_boss: [
            { id: 'pet_aoe', name: 'Огонь бесов', icon: '🔥', power: 1, flat: 7.5, type: 'aoe' },
          ],
        };
        const kit = kits[defKey] || [
          { id: 'pet_claw', name: 'Удар', icon: '🐾', power: 1.0 },
          { id: 'pet_rend', name: 'Растерзание', icon: '🩸', power: 1.28, cd: 2 },
        ];
        return kit.map((k) => ({
          id: k.id, name: k.name, icon: k.icon || '⚙️',
          cost: 0, gen: 0, costSec: 0, genSec: 0, costRunes: null, genRunic: 0,
          cd: k.cd || 0, baseCd: k.cd || 0, curCd: 0, type: k.type || 'damage',
          power: k.power, flat: k.flat, desc: k.desc || 'Атака',
        }));
      })(),
      buffs: [],
      alive: true,
      // Inherit owner secondary stats for crit (pets previously stuck at flat 12%)
      sec: owner?.sec ? { ...owner.sec } : defaultSec(),
      res: {
        primary: { type: 'energy', name: 'Энергия', icon: '⚡', max: 100, current: 100, regen: 20 },
        secondary: null, runes: null,
      },
      color: '#9482C9',
    };
  }

  function allyPets() {
    return (combat?.pets || []).filter(p => p.side === 'ally' && p.alive && p.hp > 0);
  }

  function ownerHasPetType(owner, defKey) {
    if (!combat?.pets || !owner) return false;
    return combat.pets.some(p => p.alive && p.hp > 0 && p.ownerUid === owner.uid && p.petKey === defKey);
  }

  /** Демонология: пет атакует → 65% +1 осколок. */
  function maybeDemoPetShard(pet) {
    if (!pet || !pet.isPet || !pet.ownerUid || !run?.party) return;
    const owner = run.party.find(p => p.uid === pet.ownerUid);
    if (!owner || !owner.alive || owner.classId !== 'warlock' || owner.specId !== 'demonology') return;
    if (!owner.res?.secondary || owner.res.secondary.type !== 'soul_shards') return;
    if (Math.random() >= 0.65) return;
    owner.res.secondary.current = clamp(owner.res.secondary.current + 1, 0, owner.res.secondary.max);
    log(`${pet.name}: осколок → ${owner.name} (${owner.res.secondary.current})`, 'player');
    floatText(owner.uid, '+осколок', 'buff');
  }
  /**
   * Инженер (все спеки): факт атаки питомца → +3–7 пара владельцу.
   * Один раз за ход/действие пета, НЕ за каждую цель AoE (курица, залп и т.п.).
   */
  function maybeEngineerPetPair(pet) {
    if (!pet || !pet.isPet || !pet.ownerUid || !run?.party) return;
    const owner = run.party.find(p => p.uid === pet.ownerUid);
    if (!owner || !owner.alive || owner.classId !== 'engineer') return;
    if (!owner.res?.primary) return;
    // Анти-дубль: несколько dealDmg в одном действии (AoE) не стакают пар
    if (typeof combat !== 'undefined' && combat) {
      const stamp = String(combat.round) + ':' + String(combat.turnIndex) + ':' + pet.uid;
      if (pet._pairStamp === stamp) return;
      pet._pairStamp = stamp;
    }
    let gain = 3 + Math.floor(Math.random() * 5); // 3..7 у сапёра / изобретателя
    if (owner.specId === 'mechanist' && pet.petKey === 'combat_bot') {
      const over = (owner.buffs || []).some(b => b && b.id === 'bot_overdrive' && (b.turns == null || Number(b.turns) > 0));
      gain = over ? 20 : 5;
    }
    owner.res.primary.current = clamp(owner.res.primary.current + gain, 0, owner.res.primary.max);
    floatText(owner.uid, '+' + gain + ' пар', 'buff');
  }
  function canSummonAbility(owner, abilityId) {
    // Лимит «пока жив — не ресам» только у гнома-инженера
    if (!owner || owner.classId !== 'engineer') return true;
    const list = PET_SUMMONS[abilityId];
    if (!list) return true;
    for (const s of list) if (ownerHasPetType(owner, s.def)) return false;
    return true;
  }
  function addPet(owner, defKey, turnsLeft) {
    if (!combat) return null;
    if (!combat.pets) combat.pets = [];
    // Тот же тип не дублируем только у инженера (локу/другим — можно)
    if (owner && owner.classId === 'engineer' && ownerHasPetType(owner, defKey)) return null;
    const alive = combat.pets.filter(p => p.alive).length;
    if (alive >= 12) return null;
    const pet = createPetUnit(owner, defKey, turnsLeft);
    combat.pets.push(pet);
    log(`${owner?.name || 'Призыв'}: ${pet.icon} ${pet.name}${turnsLeft ? ` (${turnsLeft} р.)` : ''}`, 'system');
    // Водяной тотем: при появлении ослабленное «цепное» 20т (50% от 40т)
    if (defKey === 'water_totem' && owner) {
      const allies = (run?.party || []).filter(p => p.alive && p.hp < p.maxHp).sort((a, b) => (a.hp/a.maxHp) - (b.hp/b.maxHp));
      let mult = 0.5;
      for (const al of (allies.length ? allies : (run?.party || []).filter(p => p.alive)).slice(0, 4)) {
        const amt = Math.round(40 * STAT_SCALE * mult);
        const h = healUnit(al, amt, owner, { exact: true, abilityName: 'Поток тотема' });
        if (h) log(`${pet.name}: поток → ${al.name} (+${fmt(h)})`, 'heal');
        mult *= 0.9;
      }
    }
    return pet;
  }

  function spawnClassPets() {
    if (!combat || !run) return;
    for (const hero of run.party.filter(p => p.alive)) {
      if (hero.classId === 'hunter') {
        const petKey = (typeof hunterPetKey === 'function') ? hunterPetKey(hero.specId) : 'hunter_pet';
        addPet(hero, petKey, null);
      }
      else if (hero.classId === 'warlock') {
        if (hero.specId === 'demonology') addPet(hero, 'felguard', null);
        else if (hero.specId === 'affliction') addPet(hero, 'imp', null);
        else addPet(hero, 'imp', null); // destruction
      } else if (hero.classId === 'deathknight' && hero.specId === 'unholy') {
        addPet(hero, 'ghoul', null);
      } else if (hero.classId === 'engineer') {
        if (hero.specId === 'mechanist') addPet(hero, 'combat_bot', null);
        else if (hero.specId === 'tinkerer') addPet(hero, 'pocket_bot', null);
      }
    }
  }

  function petsOf(owner) {
    if (!combat?.pets || !owner) return [];
    // живые + мёртвые основные (для отображения/воскрешения)
    return combat.pets.filter(p =>
      p.ownerUid === owner.uid && (p.alive || p.isMainPet || p.petTurnsLeft == null)
    );
  }


/* --- end + boot --- */
  function endRun(win, msg) {
    if (!run || run.finished) return;
    run.finished = true;
    try { clearInterval(timerInterval); } catch (_) {}
    try { clearTimeout(aiTimer); } catch (_) {}
    combat = null;
    try { showRecountPanel(false); } catch (_) {}
    try { hidePassivePocket(); } catch (_) {}
    const score = win ? (typeof scoreLabel === 'function' ? scoreLabel() : 'Готово') : 'Провал';
    try {
      pushHistory({
        key: run.keyLevel,
        dungeon: run.dungeon && run.dungeon.name,
        score,
        deaths: run.deaths,
        win,
        forces: Math.round(run.forces || 0),
      });
    } catch (_) {}
    try {
      const best = +(localStorage.getItem('mythicKeyBest') || 0);
      if (win && run.keyLevel > best) localStorage.setItem('mythicKeyBest', String(run.keyLevel));
    } catch (_) {}
    try { clearSave(); } catch (_) {}
    try { document.getElementById('talent-modal')?.classList.add('hidden'); } catch (_) {}
    try { document.getElementById('rest-modal')?.classList.add('hidden'); } catch (_) {}
    try { document.body.classList.remove('has-field', 'field-split'); } catch (_) {}
    const box = document.getElementById('end-box');
    if (box) box.className = 'modal end-modal ' + (win ? 'win' : 'lose');
    const title = document.getElementById('end-title');
    if (title) {
      title.textContent = win
        ? (run.raid ? `Рейд закрыт · ${score}!` : `Ключ закрыт · ${score}!`)
        : (run.raid ? 'Рейд провален' : 'Ключ провален');
    }
    const lootStr = (run.loot || []).map(l => (l.icon || '') + ' ' + (l.name || '')).join(', ') || 'нет';
    const endMsg = document.getElementById('end-msg');
    if (endMsg) endMsg.textContent = (msg || '') + `\nДобыча: ${lootStr}`;
    const modal = document.getElementById('end-modal');
    if (modal) modal.classList.remove('hidden');
    try { sfx(win ? 'win' : 'lose'); } catch (_) {}
    try { if (win) spawnConfetti(); } catch (_) {}
    document.getElementById('vignette')?.classList.remove('on');
    applyDungeonTheme(null);
  }
  function backToLobby() {
    clearInterval(timerInterval);
    clearTimeout(aiTimer);
    const fl = document.getElementById('float-layer');
    if (fl) fl.innerHTML = '';
    floatStacks.clear();
    run = null; combat = null; paused = false;
    try { document.body.classList.remove('has-field', 'field-split'); } catch (_) {}
    recount = null;
    showRecountPanel(false);
    try { hidePassivePocket(); } catch (_) {}
    document.getElementById('end-modal').classList.add('hidden');
    document.getElementById('run-screen').classList.add('hidden');
    document.getElementById('lobby').classList.remove('hidden');
    document.getElementById('vignette')?.classList.remove('on');
    applyDungeonTheme(null);
    document.body.classList.remove('raid-run');
    try { if (typeof syncRaidLobbyUi === 'function') syncRaidLobbyUi(); } catch (_) {}
    const cont = document.getElementById('btn-continue');
    if (cont) cont.classList.toggle('hidden', !hasSave());
    renderHistory();
    try { refreshHonestPickCards(); } catch (_) {}
  }

  try {
    initLobby();
  } catch (e) {
    console.error(e);
    document.body.innerHTML = '<p style="color:#fff;padding:2rem">Ошибка: ' + e.message + '</p>';
  }
