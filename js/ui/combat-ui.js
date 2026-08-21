/* ui/combat-ui: ability bar, unit cards, battle render */
  function abilityChargeState(ab) {
    if (!ab || !ab.maxCharges) return null;
    const max = Math.max(1, Number(ab.maxCharges) || 1);
    const cur = ab.charges != null ? Number(ab.charges) : max;
    return { max, cur: Math.max(0, Math.min(max, cur)), cd: Number(ab.curCd) || 0 };
  }
  function chargePipsHtml(st) {
    if (!st) return '';
    let html = '<span class="a-pips" aria-hidden="true">';
    for (let i = 0; i < st.max; i++) html += '<i class="' + (i < st.cur ? 'on' : '') + '"></i>';
    return html + '</span>';
  }
  function abilityCdOverlayHtml(ab) {
    const st = abilityChargeState(ab);
    if (st) {
      if (st.cur <= 0 && st.cd > 0) return '<div class="cd-overlay">' + st.cd + '</div>';
      if (st.cur > 0 && st.cd > 0) return '<div class="charge-recharge">+' + st.cd + '</div>';
      return '';
    }
    if (ab && ab.curCd > 0) return '<div class="cd-overlay">' + ab.curCd + '</div>';
    return '';
  }
  function orderedAbilities(u) {
    const abs = (u && u.abilities) ? u.abilities.slice() : [];
    const ord = u && u.abilityOrder;
    if (!ord || !ord.length) return abs;
    const byId = {};
    abs.forEach((a) => { if (a && a.id && !byId[a.id]) byId[a.id] = a; });
    const out = [];
    const used = new Set();
    ord.forEach((id) => {
      if (byId[id] && !used.has(id)) { out.push(byId[id]); used.add(id); }
    });
    abs.forEach((a) => { if (a && a.id && !used.has(a.id)) out.push(a); });
    return out;
  }
  function showAbilities(actor) {
    const bar = document.getElementById('ability-bar');
    const actions = document.getElementById('combat-actions');
    const scrollY = bar ? bar.scrollTop : 0;
    try { hideAbilityTipFloat(); } catch (_) {}
    try { clearRuneHighlight(); } catch (_) {}
    if (bar && bar._holdTimer) { clearTimeout(bar._holdTimer); bar._holdTimer = null; }
    if (bar && bar._holdMove) {
      window.removeEventListener('pointermove', bar._holdMove);
      window.removeEventListener('pointerup', bar._holdUp);
      window.removeEventListener('pointercancel', bar._holdUp);
      bar._holdMove = bar._holdUp = null;
    }
    if (bar) bar.innerHTML = '';
    if (actions) actions.innerHTML = '';
    try {
      if (typeof syncPassivePocket === 'function') syncPassivePocket();
      else renderPassiveTray(actor);
    } catch (e) { console.error(e); }
    if (!bar) return;
    function persistOrder(u, ids) {
      u.abilityOrder = ids.slice();
      let idx = -1;
      if (run && run.party) {
        idx = run.party.findIndex((p) => p && p.uid === u.uid);
        if (idx >= 0 && run.party[idx]) run.party[idx].abilityOrder = ids.slice();
      }
      if (typeof party !== 'undefined' && Array.isArray(party)) {
        if (idx >= 0 && party[idx] && party[idx].classId === u.classId) {
          party[idx].abilityOrder = ids.slice();
        } else {
          const lobby = party.find((p) => p && p.classId === u.classId && p.specId === u.specId);
          if (lobby) lobby.abilityOrder = ids.slice();
        }
      }
      try { if (typeof savePartyProfile === 'function') savePartyProfile(); } catch (_) {}
    }
    function reorderAbility(u, fromId, toId) {
      if (!fromId || !toId || fromId === toId) return;
      const list = orderedAbilities(u);
      const from = list.findIndex((a) => a.id === fromId);
      const to = list.findIndex((a) => a.id === toId);
      if (from < 0 || to < 0) return;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      persistOrder(u, list.map((a) => a.id));
      showAbilities(u);
    }
    const shown = orderedAbilities(actor);
    shown.forEach((ab, idx) => {
      const btn = document.createElement('button');
      const can = canPay(actor, ab);
      const hasWideSweep = !!(actor.buffs || []).some(b => b && b.id === 'wide_sweep' && (Number(b.stacks) || 0) > 0);
      const hasNextAoe = !!(actor.buffs || []).some(b => b && b.id === 'next_aoe' && (Number(b.stacks) || 0) > 0);
      const isComboFin = !!(typeof FINISHER_IDS !== 'undefined' && FINISHER_IDS.has(ab.id)
        && actor.res?.secondary?.type === 'combo' && (actor.res.secondary.current || 0) > 0);
      const chSt = abilityChargeState(ab);
      const hasReadyCharge = !!(chSt && chSt.cur > 0);
      const onceUsed = !!(ab.oncePerTurn && actor._oncePerTurnUsed && actor._oncePerTurnUsed[ab.id]);
      btn.className = 'ability' + ((ab.id === 'elusive' && (actor.purifyCleared || 0) > 0) ? ' elusive-charged' : '')
        + ((ab.id === 'heroic' && hasWideSweep) ? ' wide-sweep-charged' : '')
        + ((hasNextAoe && ab.id !== 'slice' && (ab.type === 'damage' || ab.type === 'dot')) ? ' next-aoe-charged' : '')
        + ((ab.id === 'debug_mode') ? ' debug-mode-ab' : '')
        + (isComboFin ? ' finisher-combo' : '')
        + (hasReadyCharge ? ' has-charges' : '')
        + (chSt && chSt.cur > 0 && chSt.cd > 0 ? ' charge-ticking' : '')
        + (ab.oncePerTurn && !onceUsed ? ' once-ready' : '')
        + (onceUsed ? ' once-spent' : '')
        + (!can ? ' is-disabled' : '');
      // Не используем native disabled: на disabled-кнопках не приходят mouseenter → нет тултипа.
      // Блок каста: aria + canPay в click/hotkey.
      if (!can) btn.setAttribute('aria-disabled', 'true');
      else btn.removeAttribute('aria-disabled');
      btn.tabIndex = 0;
      const needTarget = abilityNeedsClickTarget(ab);
      const rule = abilityTargetRule(ab);
      const keyHint = idx < 9 ? (idx + 1) : (idx === 9 ? 0 : '');
      const est = estimateAbility(actor, ab);
      const cost = costLabel(actor, ab);
      const tags = abilityMetaLine(ab);
      const detail = abilityDescribe(ab, actor);
      // Справа: только база — ресурс, КД, урон/хил/DoT, служебные метки
      const yellowParts = [];
      const seen = new Set();
      const pushY = (s) => {
        s = (s && String(s).trim()) || '';
        if (!s) return;
        const key = s.toLowerCase();
        if (seen.has(key)) return;
        for (const p of yellowParts) {
          if (p.toLowerCase().includes(key) || key.includes(p.toLowerCase())) return;
        }
        seen.add(key);
        yellowParts.push(s);
      };
      pushY(cost);
      const baseCd = Number(ab.baseCd != null ? ab.baseCd : ab.cd) || 0;
      if (baseCd > 0) pushY('КД ' + baseCd);
      if (onceUsed) pushY('уже в этом ходу');
      if (ab.curCd > 0) {
        if (chSt && chSt.cur > 0) pushY('заряд через ' + ab.curCd);
        else pushY('ещё ' + ab.curCd);
      }
      pushY(est);
      if (tags) tags.split(' · ').forEach(pushY);
      const yellow = yellowParts.join(' · ');
      const cdHtml = abilityCdOverlayHtml(ab);
      if (!ab.school) stampAbilitySchool(ab, actor.classId, actor.specId);
      const schoolNote = abilitySchoolNote(ab, actor);
      const schoolCss = abilitySchoolCss(ab, actor);
      // Иконка слева + описание при наведении; справа — имя, база, тип
      let icoInner;
      if (ab.id === 'debug_mode') {
        const pet = getMainPet(actor, true);
        const mode = (pet && pet.attackMode === 'aoe') ? 'АОЕ' : 'СТ';
        icoInner = mode;
      } else {
        icoInner = ab.icon || '✨';
      }
      if (chSt) icoInner += chargePipsHtml(chSt);
      if (ab.oncePerTurn) {
        icoInner += onceUsed
          ? '<span class="a-once used">ход</span>'
          : '<span class="a-once">1×</span>';
      }
      const tipAttrName = String(ab.name || '').replace(/"/g, '&quot;');
      const tipAttrDetail = String(detail || '').replace(/"/g, '&quot;');
      btn.innerHTML =
        (keyHint !== '' ? `<span class="hk">${keyHint}</span>` : '') +
        `<span class="a-ico${ab.id === 'debug_mode' ? ' a-ico-mode' : ''}" data-tip-name="${tipAttrName}" data-tip-detail="${tipAttrDetail}" tabindex="-1">${icoInner}</span>` +
        `<span class="a-body">` +
          `<span class="a-name">${ab.name || ''}</span>` +
          (yellow ? `<span class="a-cost">${yellow}</span>` : '') +
        `</span>` +
        `<span class="a-school ${schoolCss}">${schoolNote || 'Тип: —'}</span>` +
        cdHtml;
      const icoEl = btn.querySelector('.a-ico');
      const showTip = (e) => {
        if (e) e.stopPropagation();
        const anchor = icoEl || btn;
        showAbilityTipFloat(anchor, ab.name || '', detail);
      };
      const hideTip = () => hideAbilityTipFloat();
      if (icoEl) {
        icoEl.addEventListener('mouseenter', showTip);
        icoEl.addEventListener('mouseleave', hideTip);
        icoEl.addEventListener('focus', showTip);
        icoEl.addEventListener('blur', hideTip);
      }
      // ДК: подсветка нужных рун при наведении / фокусе на скилле
      if (ab.costRunes && actor.res?.runes) {
        const hlOn = () => highlightAbilityRunes(actor, ab.costRunes);
        const hlOff = () => {
          // не гасить, если этот скилл выбран для цели
          if (pendingTarget && pendingTarget.ability === ab) {
            highlightAbilityRunes(actor, ab.costRunes);
            return;
          }
          clearRuneHighlight();
        };
        btn.addEventListener('mouseenter', hlOn);
        btn.addEventListener('mouseleave', hlOff);
        btn.addEventListener('focus', hlOn);
        btn.addEventListener('blur', hlOff);
      }
      btn.draggable = false;
      btn.dataset.abid = ab.id;
      const HOLD_MS = 320;
      const cancelHoldTimer = () => {
        if (bar._holdTimer) { clearTimeout(bar._holdTimer); bar._holdTimer = null; }
      };
      const dropWindowHold = () => {
        if (bar._holdMove) {
          window.removeEventListener('pointermove', bar._holdMove);
          window.removeEventListener('pointerup', bar._holdUp);
          window.removeEventListener('pointercancel', bar._holdUp);
          bar._holdMove = bar._holdUp = null;
        }
      };
      const clearOver = () => {
        bar.querySelectorAll('.ability.drag-over').forEach((el) => el.classList.remove('drag-over'));
      };
      btn.addEventListener('pointerdown', (e) => {
        if (e.button != null && e.button !== 0) return;
        bar._didDrag = false;
        bar._dragArmed = false;
        bar._holdFrom = ab.id;
        bar._holdX = e.clientX;
        bar._holdY = e.clientY;
        bar._holdPtr = e.pointerId;
        cancelHoldTimer();
        dropWindowHold();
        const onMove = (ev) => {
          if (ev.pointerId !== bar._holdPtr) return;
          if (!bar._dragArmed) {
            const dx = ev.clientX - (bar._holdX || 0);
            const dy = ev.clientY - (bar._holdY || 0);
            if (dx * dx + dy * dy > 64) cancelHoldTimer();
            return;
          }
          ev.preventDefault();
          const el = document.elementFromPoint(ev.clientX, ev.clientY);
          const over = el && el.closest && el.closest('#ability-bar .ability');
          bar.querySelectorAll('.ability.drag-over').forEach((x) => {
            if (x !== over) x.classList.remove('drag-over');
          });
          if (over && over !== btn) over.classList.add('drag-over');
        };
        const onUp = (ev) => {
          if (ev.pointerId !== bar._holdPtr) return;
          dropWindowHold();
          const fromId = bar._holdFrom;
          const armed = !!bar._dragArmed;
          cancelHoldTimer();
          bar._dragArmed = false;
          bar._holdFrom = null;
          btn.classList.remove('dragging');
          bar.classList.remove('is-reordering');
          let toId = null;
          if (armed) {
            const el = document.elementFromPoint(ev.clientX, ev.clientY);
            const over = el && el.closest && el.closest('#ability-bar .ability');
            if (over && over.dataset.abid) toId = over.dataset.abid;
          }
          clearOver();
          try { btn.releasePointerCapture(ev.pointerId); } catch (_) {}
          if (armed) {
            bar._didDrag = true;
            if (fromId && toId && fromId !== toId) reorderAbility(actor, fromId, toId);
          }
        };
        bar._holdMove = onMove;
        bar._holdUp = onUp;
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        bar._holdTimer = setTimeout(() => {
          bar._holdTimer = null;
          bar._dragArmed = true;
          btn.classList.add('dragging');
          bar.classList.add('is-reordering');
          try { btn.setPointerCapture(e.pointerId); } catch (_) {}
          try { hideAbilityTipFloat(); } catch (_) {}
        }, HOLD_MS);
      });
      btn.addEventListener('click', () => {
        if (bar._didDrag) { bar._didDrag = false; return; }
        hideAbilityTipFloat();
        sfx('click');
        if (btn.classList.contains('is-disabled') || !canPay(actor, ab)) return;
        if (needTarget) {
          pendingTarget = { actor, ability: ab };
          if (ab.costRunes) highlightAbilityRunes(actor, ab.costRunes, true);
          else clearRuneHighlight();
          const r = abilityTargetRule(ab);
          if (EXECUTE_IDS.has(ab.id)) {
            toast(ab.name + ': цель с ≤35% HP (подсвечены)');
          } else {
            toast(r === 'ally_any' ? 'Цель: союзник (клик по портрету)'
              : r === 'ally_or_enemy' ? 'Цель: союзник или враг'
              : 'Цель: враг (клик по портрету)');
          }
          updateUnitSelectionOnly();
        } else {
          castWithRuneFlash(actor, ab, rule === 'self_only' ? actor : null);
        }
      });
      bar.appendChild(btn);
    });
    bar.scrollTop = scrollY;
    // если уже выбран скилл с рунами (после re-render) — вернуть подсветку
    if (pendingTarget && pendingTarget.actor?.uid === actor.uid && pendingTarget.ability?.costRunes) {
      highlightAbilityRunes(actor, pendingTarget.ability.costRunes);
    }
    // ── Reaction actions (Telegraph / Affix agency) ──
    const activeCast = living('enemy').find(e => e.casting);
    if (activeCast?.casting?.avoidable === 'dodge') {
      const dodge = document.createElement('button');
      dodge.className = 'btn btn-sm react-btn';
      dodge.textContent = '💨 Уклонение';
      dodge.title = '−80% от следующего AoE/каста (этот герой)';
      dodge.onclick = () => {
        actor.dodging = 1;
        log(actor.name + ' готовится уклониться', 'player');
        toast('Уклонение!');
        afterAction();
      };
      actions.appendChild(dodge);
    }
    if (activeCast?.casting && !combat.softSave) {
      const soft = document.createElement('button');
      soft.className = 'btn btn-sm react-btn';
      soft.textContent = '🛡 Софт-сейв отряда';
      soft.title = '−30% урона следующего каста (1× за бой)';
      soft.onclick = () => {
        combat.softSave = true;
        log('Отряд: софт-сейв (−30% к касту)', 'heal');
        toast('🛡 Софт-сейв');
        // free reaction — no afterAction consume? consume turn to keep balance
        afterAction();
      };
      actions.appendChild(soft);
    }
    if (actor.thunderMark && hasEffect('thunder')) {
      const disc = document.createElement('button');
      disc.className = 'btn btn-sm react-btn';
      disc.textContent = '⚡ Разряд метки';
      disc.onclick = () => {
        actor.thunderMark = false;
        log(actor.name + ' сбрасывает метку грозы', 'player');
        toast('Метка снята');
        afterAction();
      };
      actions.appendChild(disc);
    }
    if (run.trinketReady && run.trinketAtk) {
      const tr = document.createElement('button');
      tr.className = 'btn btn-sm react-btn';
      tr.textContent = '🔥 Тринкет';
      tr.onclick = () => {
        applyStatus(actor, { id: 'trinket', name: 'Тринкет', icon: '🔥', turns: 1, atkMod: run.trinketAtk });
        run.trinketReady = false;
        log(actor.name + ' активирует амулет (+атака)', 'player');
        toast('Тринкет!');
        renderPowers();
        afterAction();
      };
      actions.appendChild(tr);
    }

    // Key powers (play-style loot)
    const kp = run.keyPowers || {};
    const addKpBtn = (id, label, cls) => {
      const st = kp[id];
      if (!st) return;
      if (st.charges != null && st.charges <= 0) return;
      if (st.usedThisCombat && id !== 'battle_rez' && id !== 'skip_trash') return;
      const b = document.createElement('button');
      b.className = 'btn btn-sm react-btn' + (cls ? ' ' + cls : '');
      b.textContent = label + (st.charges != null ? ` ×${st.charges}` : '');
      b.onclick = () => {
        if (useKeyPower(id, actor)) {
          renderPowers();
          if (id !== 'skip_trash') afterAction();
        }
      };
      actions.appendChild(b);
    };
    addKpBtn('lust', '🥁 Lust');
    addKpBtn('party_shield', '🛡 Щит отряда');
    addKpBtn('hunter_mark', '🏹 Метка');
    addKpBtn('battle_rez', '💎 Rez');
    addKpBtn('skip_trash', '🗺 Обход');

    // Highlight: free kick reaction if enemy casting kickable
    if (activeCast?.casting && (activeCast.casting.kind === 'kick' || activeCast.casting.interruptible !== false)) {
      const kickAb = actor.abilities.find(a =>
        (typeof isKickAbility === 'function' ? isKickAbility(a) : (a.type === 'interrupt' || INTERRUPT_IDS.has(a.id))) && canPay(actor, a));
      if (kickAb) {
        const kb = document.createElement('button');
        kb.className = 'btn btn-sm react-btn kick-now';
        kb.textContent = `⚡ Кик: ${activeCast.name}`;
        kb.onclick = () => {
          castAbility(actor, kickAb, activeCast);
          afterAction();
        };
        actions.prepend(kb);
      }
    }

    if (run?.raid && actor.role === 'tank') {
      const ovTank = (run.party || []).find(h => h.alive && h.role === 'tank' && h.uid !== actor.uid
        && (h.buffs || []).some(b => b.id === 'overload' && (b.stacks || 0) >= 2));
      const taunt = actor.abilities.find(a => a.type === 'taunt' && (typeof canPay !== 'function' || canPay(actor, a)));
      if (ovTank && taunt) {
        const tb = document.createElement('button');
        tb.className = 'btn btn-sm react-btn kick-now';
        tb.textContent = '🛡 Смена танков: провокация';
        tb.onclick = () => {
          castAbility(actor, taunt, null);
          onRaidTaunt(actor);
          afterAction();
        };
        actions.prepend(tb);
      }
    }
    if (run?.raid && (actor.buffs || []).some(b => b.id === 'storm_mark')) {
      const sb = document.createElement('button');
      sb.className = 'btn btn-sm' + (actor.raidSpread ? ' on' : '');
      sb.textContent = actor.raidSpread ? 'Разошлись' : 'Разойтись (метки)';
      sb.onclick = () => {
        actor.raidSpread = !actor.raidSpread;
        toast(actor.raidSpread ? 'Отошли — метки не свяжутся' : 'Снова вместе');
        refreshRaidAlerts();
        renderCombat();
        showAbilities(actor);
      };
      actions.appendChild(sb);
    }

    const skip = document.createElement('button');
    skip.className = 'btn btn-sm';
    skip.textContent = 'Пропуск (Пробел)';
    skip.onclick = () => {
      if (actor.res.primary.type !== 'runes') {
        actor.res.primary.current = clamp(actor.res.primary.current + Math.max(5, actor.res.primary.regen || 5), 0, actor.res.primary.max);
      }
      log(actor.name + ' пропускает', 'player');
      afterAction();
    };
    actions.appendChild(skip);
  }

  function defaultCombatTarget(actor, ability) {
    if (!actor || !ability) return null;
    const rule = abilityTargetRule(ability);
    if (rule === 'self_only') return actor;
    if (rule === 'enemy') {
      const foes = living('enemy').filter(e => e && e.alive && !e.vaultAway);
      if (!foes.length) return null;
      if (EXECUTE_IDS.has(ability.id)) {
        const exec = foes.find(e => e.hp / Math.max(1, e.maxHp) <= 0.35);
        return exec || null;
      }
      if (ability.id === 'touch_death') {
        return foes.find(e => e.hp < actor.hp) || null;
      }
      const kickOnly = ability.type === 'interrupt' || (typeof INTERRUPT_IDS !== 'undefined' && INTERRUPT_IDS.has(ability.id));
      if (kickOnly) {
        return foes.find(e => e.casting) || null;
      }
      const focus = combat && combat.focusEnemy;
      if (focus && foes.some(e => e.uid === focus.uid)) return focus;
      return (typeof lowest === 'function' ? lowest(foes) : null) || foes[0];
    }
    return null;
  }

  function onUnitClick(unit) {
    if (unit && unit.side === 'enemy' && unit.alive && combat) combat.focusEnemy = unit;
    if (run?.raid && unit?.side === 'ally' && !unit.isPet && !pendingTarget
        && typeof tryAssignRaidSoak === 'function' && tryAssignRaidSoak(unit)) {
      return;
    }
    if (raidAutoAllies && combat && !combat.over && unit?.side === 'ally' && !unit.isPet && !pendingTarget) {
      if (typeof setRaidFocus === 'function') setRaidFocus(unit);
      return;
    }
    if (!pendingTarget || !combat?.waitingPlayer) return;
    if (!unit?.alive) return toast('Мёртв');
    const { actor, ability } = pendingTarget;
    const rule = abilityTargetRule(ability);
    const kickOnly = ability.type === 'interrupt' || (typeof INTERRUPT_IDS !== 'undefined' && INTERRUPT_IDS.has(ability.id));
    if (rule === 'self_only') {
      pendingTarget = null;
      castWithRuneFlash(actor, ability, actor);
      return;
    }
    if (rule === 'ally_any') {
      if (unit.side !== 'ally' || unit.isPet) return toast('Нужен союзник');
    } else if (rule === 'enemy') {
      if (unit.side !== 'enemy') return toast('Нужен враг');
    } else if (rule === 'ally_or_enemy') {
      if (unit.isPet) return toast('Не питомец');
      if (unit.side !== 'ally' && unit.side !== 'enemy') return toast('Нужна цель');
    } else {
      return toast('Эта способность без цели');
    }
    if (kickOnly && !unit.casting) return toast('Цель не кастует');
    if (EXECUTE_IDS.has(ability.id) && unit.hp / unit.maxHp > 0.35) return toast('Казнь только при ≤35% здоровья');
    if (ability.id === 'touch_death' && unit.hp >= actor.hp) return toast('Здоровье цели должно быть меньше вашего');
    pendingTarget = null;
    castWithRuneFlash(actor, ability, unit);
  }


  function renderCombat() {
    ensureCombatRowClicks();
    renderAllies();
    renderEnemies();
    bindUnitCardClicks();
    updateUnitSelectionOnly();
    updateBossFrame();
    updateVignette();
    if (run?.raid && typeof refreshRaidAlerts === 'function') refreshRaidAlerts();
    try { if (typeof syncPassivePocket === 'function') syncPassivePocket(); } catch (_) {}
  }

  function bindUnitCardClicks() {
    document.querySelectorAll('#enemy-row .unit, #ally-row .unit, #enemy-row .unit-stack, #ally-row .unit-stack').forEach(el => {
      if (el.dataset.clickBound === '1') return;
      el.dataset.clickBound = '1';
      el.style.cursor = 'pointer';
    });
  }

  /** Only toggles selection/active classes — no full DOM rebuild (no flicker). */
  function updateUnitSelectionOnly() {
    document.body.classList.toggle('need-target', !!(pendingTarget && combat?.waitingPlayer));
    const actor = currentActor();
    document.querySelectorAll('.unit').forEach(el => {
      const id = el.dataset.uid;
      const u = allUnits().find(x => x.uid === id);
      if (!u) return;
      el.classList.toggle('active', !!(actor && actor.uid === id));
      const ab = pendingTarget && pendingTarget.ability;
      const targeting = pendingTarget && (() => {
        const r = abilityTargetRule(ab);
        if (r === 'ally_any') return u.side === 'ally' && !u.isPet;
        if (r === 'enemy') {
          if (u.side !== 'enemy') return false;
          // Молот гнева / казни: только ≤35% HP
          if (EXECUTE_IDS.has(ab.id)) return (u.hp / Math.max(1, u.maxHp)) <= 0.35;
          return true;
        }
        if (r === 'ally_or_enemy') return !u.isPet && (u.side === 'ally' || u.side === 'enemy');
        return false;
      })();
      el.classList.toggle('selected-target', !!targeting);
      // Явная подсветка «можно казнь»
      el.classList.toggle('execute-valid', !!(
        pendingTarget && ab && EXECUTE_IDS.has(ab.id)
        && u.side === 'enemy' && u.alive
        && (u.hp / Math.max(1, u.maxHp)) <= 0.35
      ));
      el.classList.toggle('execute-invalid', !!(
        pendingTarget && ab && EXECUTE_IDS.has(ab.id)
        && u.side === 'enemy' && u.alive
        && (u.hp / Math.max(1, u.maxHp)) > 0.35
      ));
    });
    document.querySelectorAll('.pet-port').forEach(el => {
      el.classList.toggle('active', !!(actor && actor.uid === el.dataset.uid));
    });
  }

  function petPortraitHtml(p, actor) {
    const hpPct = clamp(p.hp / Math.max(1, p.maxHp) * 100, 0, 100);
    const active = actor && actor.uid === p.uid;
    const dead = !p.alive || p.hp <= 0;
    const timer = p.petTurnsLeft != null
      ? `<span class="pet-timer">${p.petTurnsLeft}</span>` : '';
    const title = [
      p.name,
      `${fmt(p.hp)}/${fmt(p.maxHp)} HP`,
      `атака ${fmt(p.atk)}`,
      p.petTurnsLeft != null ? `${p.petTurnsLeft} р. осталось` : 'постоянный',
    ].join(' · ');
    return `<div class="pet-port${active ? ' active' : ''}${dead ? ' dead' : ''}" data-uid="${p.uid}" title="${title}">
      ${artHtml(ASSETS.petP(p.petKey || 'imp'), p.icon || '🐾', 'pet-face')}
      ${timer}
      <div class="pet-hp"><i style="width:${hpPct}%"></i></div>
    </div>`;
  }

  function petRowHtml(hero, actor) {
    const pets = petsOf(hero);
    if (!pets.length) return '<div class="pet-row" aria-hidden="true"></div>';
    return `<div class="pet-row">${pets.map(p => petPortraitHtml(p, actor)).join('')}</div>`;
  }

  function unitHasAuras(u) {
    if (!u) return false;
    if (u.thunderMark) return true;
    return (u.buffs || []).some(b => b && (b.turns == null || Number(b.turns) > 0));
  }

  function stackHtml(u, actor, withPets) {
    const extra = u.side === 'enemy' ? ' enemy-stack' : '';
    const auraOn = unitHasAuras(u) ? ' has-auras' : '';
    return `<div class="unit-stack${extra}${auraOn}" data-uid="${u.uid}">${auraRailHtml(u)}${unitCard(u, actor)}${withPets ? petRowHtml(u, actor) : ''}</div>`;
  }

  function ensureCombatRowClicks() {
    const bind = (id, findUnit) => {
      const row = document.getElementById(id);
      if (!row || row.dataset.combatClick === '1') return;
      row.dataset.combatClick = '1';
      row.addEventListener('click', (e) => {
        const petEl = e.target.closest('.pet-port');
        if (petEl && row.contains(petEl)) {
          e.stopPropagation();
          const p = (combat?.pets || []).find(x => x.uid === petEl.dataset.uid);
          if (!p) return;
          toast(`${p.icon} ${p.name}: ${fmt(p.hp)}/${fmt(p.maxHp)}` +
            (p.petTurnsLeft != null ? ` · ${p.petTurnsLeft} р.` : ''));
          return;
        }
        const hold = e.target.closest('.unit, .unit-stack');
        if (!hold || !row.contains(hold)) return;
        const uid = hold.dataset.uid || hold.querySelector('.unit')?.dataset.uid;
        const u = findUnit(uid);
        if (u) onUnitClick(u);
      });
      row.addEventListener('mouseover', (e) => {
        const ico = e.target.closest('.aura-ico');
        if (!ico || !row.contains(ico)) return;
        showAuraTip(ico, ico.dataset.tipName || '', ico.dataset.tipDetail || '');
      });
      row.addEventListener('mouseout', (e) => {
        const from = e.target.closest('.aura-ico');
        const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('.aura-ico') : null;
        if (from && from !== to) hideAbilityTipFloat();
      });
    };
    bind('ally-row', (uid) => (run?.party || []).find(p => p.uid === uid));
    bind('enemy-row', (uid) => (combat?.enemies || []).find(p => p.uid === uid));
  }

  function auraSig(u) {
    const bits = (u.buffs || []).map(b => [b.id, b.fromUid || '', b.stacks || 0, b.turns || 0, b.dot || 0, b._linked ? 1 : 0].join(':'));
    if (u.thunderMark) bits.push('tm');
    return bits.join('|');
  }

  function shieldDisplayParts(u) {
    const layers = Array.isArray(u && u.shieldLayers) ? u.shieldLayers : [];
    const special = layers.filter(s => s && s.separate && (Number(s.amount) || 0) > 0);
    const generic = layers.filter(s => s && !s.separate && (Number(s.amount) || 0) > 0)
      .reduce((n, s) => n + (Number(s.amount) || 0), 0);
    const fallback = (!layers.length && (u.shield || 0) > 0) ? (u.shield || 0) : generic;
    return { special, generic: fallback };
  }

  function shieldsBlockHtml(u) {
    if (!u) return '<div class="u-shields"></div>';
    const { special, generic } = shieldDisplayParts(u);
    let inner = '';
    const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    for (const s of special) {
      const pct = clamp((Number(s.amount) || 0) / Math.max(1, u.maxHp) * 100, 0, 100);
      inner += `<div class="slot-shield slot-shield-named bar-wrap" data-shield-id="${esc(s.id)}" title="${esc(s.name || 'Щит')}">`
        + `<div class="bar shield shield-pain"><i style="width:${pct}%"></i></div>`
        + `<span class="bar-label">${s.icon || '🛡'}${fmt(s.amount)}</span></div>`;
    }
    if (generic > 0) {
      inner += `<div class="slot-shield bar-wrap"><div class="bar shield"><i style="width:${clamp(generic / Math.max(1, u.maxHp) * 100, 0, 100)}%"></i></div>`
        + `<span class="bar-label">🛡${fmt(generic)}</span></div>`;
    } else if (!special.length && u.stagger > 0) {
      inner += `<div class="slot-shield bar-wrap"><div class="bar" style="background:#3a2810"><i style="width:${clamp(u.stagger / u.maxHp * 100, 0, 100)}%;background:linear-gradient(90deg,#c97a2a,#8a4010)"></i></div>`
        + `<span class="bar-label">шат ${fmt(u.stagger)}</span></div>`;
    }
    return `<div class="u-shields">${inner}</div>`;
  }

  function unitStructSig(u) {
    const isDk = !!(u.res?.runes && u.res.secondary?.type === 'runic_power');
    const parts = shieldDisplayParts(u);
    return [
      u.side,
      u.casting ? 1 : 0,
      (parts.special.length ? 's' + parts.special.length : '') + (parts.generic > 0 ? 'g' : '') + (u.stagger > 0 ? 't' : ''),
      u.res?.runes ? 1 : 0,
      (u.res?.secondary && !isDk) ? 1 : 0,
      (u.burstStacks || 0) > 0 ? 1 : 0,
      u.side === 'enemy' && topThreatUid(u) ? 1 : 0,
    ].join('');
  }

  function patchUnitStack(stack, u, actor, withPets) {
    const card = stack.querySelector(':scope > .unit');
    if (!card || stack.dataset.struct !== unitStructSig(u)) {
      const wrap = document.createElement('div');
      wrap.innerHTML = stackHtml(u, actor, withPets).trim();
      const fresh = wrap.firstElementChild;
      fresh.dataset.struct = unitStructSig(u);
      fresh.dataset.aura = auraSig(u);
      stack.replaceWith(fresh);
      return fresh;
    }
    card.className = unitClassName(u, actor);
    card.style.setProperty('--cc', unitAccent(u));
    const hpPct = clamp(u.hp / Math.max(1, u.maxHp) * 100, 0, 100);
    const hpI = card.querySelector('.bar.hp > i');
    if (hpI) hpI.style.width = hpPct + '%';
    const hpLab = card.querySelector('.bar.hp')?.parentElement?.querySelector('.bar-label');
    if (hpLab) hpLab.textContent = fmt(u.hp) + '/' + fmt(u.maxHp);
    const isDk = !!(u.res?.runes && u.res.secondary?.type === 'runic_power');
    let resPct;
    let resLabel;
    if (isDk) {
      const rp = u.res.secondary;
      resPct = rp.max ? clamp(rp.current / rp.max * 100, 0, 100) : 0;
      resLabel = (rp.icon || '💙') + ' ' + Math.floor(rp.current);
    } else if (u.res?.primary) {
      resPct = u.res.primary.max ? clamp(u.res.primary.current / u.res.primary.max * 100, 0, 100) : 0;
      resLabel = (u.res.primary.icon || '') + ' ' + Math.floor(u.res.primary.current);
    }
    const resI = card.querySelector('.bar.res > i');
    if (resI && resPct != null) resI.style.width = resPct + '%';
    const resLab = card.querySelector('.bar.res')?.parentElement?.querySelector('.bar-label');
    if (resLab && resLabel != null) resLab.textContent = resLabel;
    const sec = card.querySelector('.slot-sec');
    if (sec && u.res?.secondary && !isDk) {
      sec.textContent = u.res.secondary.icon + ' ' + u.res.secondary.current + '/' + u.res.secondary.max;
      sec.classList.toggle('combo-pts', u.res.secondary.type === 'combo' && (u.res.secondary.current || 0) > 0);
    }
    if (u.res?.runes) {
      const fresh = document.createElement('div');
      fresh.innerHTML = runesRowHtml(u);
      const old = card.querySelector('.slot-runes');
      if (old && fresh.firstElementChild && old.outerHTML !== fresh.firstElementChild.outerHTML) {
        old.replaceWith(fresh.firstElementChild);
      }
    }
    if (u.casting) {
      const fill = card.querySelector('.slot-cast .cast-bar > i');
      const name = card.querySelector('.slot-cast .cast-name');
      const castTurns = Number(u.casting.turns || u.casting.resolveIn || 1);
      const castMax = Number(u.casting.maxTurns || u.casting.resolveIn || castTurns) || 1;
      const castPct = Math.max(18, Math.min(100, Math.round((castTurns / Math.max(1, castMax)) * 100)));
      if (fill) fill.style.width = castPct + '%';
      if (name) name.textContent = telegraphLabel(u.casting);
    }
    const shBox = card.querySelector(':scope > .u-shields');
    if (shBox) {
      const fresh = document.createElement('div');
      fresh.innerHTML = shieldsBlockHtml(u);
      if (fresh.firstElementChild && shBox.innerHTML !== fresh.firstElementChild.innerHTML) {
        shBox.replaceWith(fresh.firstElementChild);
      }
    }
    const nameEl = card.querySelector('.u-name');
    if (nameEl) {
      const nm = u.fullName || u.name;
      nameEl.textContent = nm;
      nameEl.title = nm;
    }
    stack.classList.toggle('has-auras', unitHasAuras(u));
    const sig = auraSig(u);
    if (stack.dataset.aura !== sig) {
      stack.dataset.aura = sig;
      const oldAura = stack.querySelector(':scope > .unit-aura');
      const wrap = document.createElement('div');
      wrap.innerHTML = auraRailHtml(u);
      if (oldAura && wrap.firstElementChild) oldAura.replaceWith(wrap.firstElementChild);
      else if (wrap.firstElementChild) stack.prepend(wrap.firstElementChild);
      else if (oldAura) oldAura.remove();
    }
    if (withPets) {
      const pets = petsOf(u);
      const petSig = pets.map(p => p.uid + ':' + p.hp + ':' + (p.alive ? 1 : 0)).join('|');
      if (stack.dataset.pets !== petSig) {
        stack.dataset.pets = petSig;
        const oldPet = stack.querySelector(':scope > .pet-row');
        const wrap = document.createElement('div');
        wrap.innerHTML = petRowHtml(u, actor);
        if (oldPet && wrap.firstElementChild) oldPet.replaceWith(wrap.firstElementChild);
        else if (wrap.firstElementChild) stack.appendChild(wrap.firstElementChild);
      }
    }
    return stack;
  }

  function syncUnitRow(row, units, actor, withPets) {
    if (!row) return;
    const wanted = units.map(u => u.uid);
    const map = new Map();
    [...row.children].forEach(el => {
      const uid = el.dataset.uid || el.querySelector('.unit')?.dataset.uid;
      if (uid) map.set(uid, el);
    });
    [...row.children].forEach(el => {
      const uid = el.dataset.uid || el.querySelector('.unit')?.dataset.uid;
      if (!wanted.includes(uid)) el.remove();
    });
    let prev = null;
    for (const u of units) {
      let el = map.get(u.uid);
      if (!el || !row.contains(el)) {
        const wrap = document.createElement('div');
        wrap.innerHTML = stackHtml(u, actor, withPets).trim();
        el = wrap.firstElementChild;
        el.dataset.struct = unitStructSig(u);
        el.dataset.aura = auraSig(u);
      } else {
        el = patchUnitStack(el, u, actor, withPets);
        if (el) el.dataset.struct = unitStructSig(u);
      }
      if (prev) {
        if (prev.nextElementSibling !== el) prev.after(el);
      } else if (row.firstElementChild !== el) {
        row.prepend(el);
      }
      prev = el;
    }
  }

  function renderAllies() {
    const row = document.getElementById('ally-row');
    if (!row || !run) return;
    syncUnitRow(row, run.party, currentActor(), true);
  }

  function renderEnemies() {
    const row = document.getElementById('enemy-row');
    if (!row) return;
    if (!combat) { row.innerHTML = ''; return; }
    syncUnitRow(row, combat.enemies.filter(u => !u.vaultAway), currentActor(), false);
  }

  function unitAccent(u) {
    if (u.side === 'ally' && typeof classAccentColor === 'function') return classAccentColor(u.classId, u.specId);
    return CLASS_CSS[u.classId] || (u.side === 'enemy' ? '#a04040' : 'var(--gold)');
  }

  function unitClassName(u, actor) {
    const active = actor && actor.uid === u.uid;
    const targeting = pendingTarget && (() => {
      const r = abilityTargetRule(pendingTarget.ability);
      if (r === 'ally_any') return u.side === 'ally' && !u.isPet;
      if (r === 'enemy') return u.side === 'enemy';
      if (r === 'ally_or_enemy') return !u.isPet && (u.side === 'ally' || u.side === 'enemy');
      return false;
    })();
    const castKind = u.casting?.kind || '';
    const castingCls = u.casting
      ? ' casting' + (castKind === 'buster' ? ' tg-buster' : castKind === 'aoe' ? ' tg-aoe' : ' tg-kick')
      : '';
    const low = u.alive && u.hp / u.maxHp < 0.3 ? ' low-hp' : '';
    const kickPrio = u.casting && (u.casting.kind === 'kick' || (u.casting.castPrio || 0) >= 3) ? ' kick-prio' : '';
    const focus = (typeof raidFocusClass === 'function') ? raidFocusClass(u) : '';
    const auras = (u.buffs || []).some(b => b && (b.turns == null || b.turns > 0));
    const auraCls = auras ? ' has-auras' : '';
    return `unit ${u.side === 'ally' ? 'ally' : 'enemy'}${u.alive ? '' : ' dead'}${active ? ' active' : ''}${targeting ? ' selected-target' : ''}${castingCls}${low}${kickPrio}${focus}${auraCls}`;
  }

  function runesRowHtml(u) {
    const r = u.res?.runes;
    if (!r) return '';
    const cdLeft = (type, idx) => {
      let best = 0;
      for (const c of (r.cd || [])) {
        if (c && c.type === type && Number(c.idx) === idx && Number(c.turns) > 0) {
          best = Math.max(best, Number(c.turns) || 0);
        }
      }
      return best;
    };
    const mk = (cls, type, idx) => {
      const on = !!(r[type] && r[type][idx]);
      const cd = on ? 0 : cdLeft(type, idx);
      const cdHtml = (!on && cd > 0) ? `<span class="rune-cd">${cd}</span>` : '';
      return `<i class="rune ${cls}${on ? ' ready' : ' spent'}${cd > 0 ? ' on-cd' : ''}" data-ready="${on ? '1' : '0'}" data-cd="${cd}" title="${on ? 'Готова' : (cd > 0 ? 'Восстановление: ' + cd + ' х.' : 'На КД')}">${cdHtml}</i>`;
    };
    return '<div class="slot-runes runes-row">' +
      (r.blood || []).map((_, i) => mk('b', 'blood', i)).join('') +
      (r.frost || []).map((_, i) => mk('f', 'frost', i)).join('') +
      (r.unholy || []).map((_, i) => mk('u', 'unholy', i)).join('') +
      '</div>';
  }

  function auraKind(b) {
    if (!b) return 'is-buff';
    if (b.dot) return 'is-dot';
    if (b.hot) return 'is-hot';
    if (b.id === 'storm_mark' || b.id === 'overload' || b.id === 'soak_orb') return 'is-debuff';
    if ((b.atkMod && b.atkMod < 0) || (b.defMod && b.defMod < 0) || b.ccMode) return 'is-debuff';
    if (b.dmgTakenMod || b.enemyDmgMod) return 'is-debuff';
    return 'is-buff';
  }

  function auraIsBad(kind) {
    return kind === 'is-dot' || kind === 'is-debuff';
  }

  function auraDetailLines(b, u) {
    const lines = [];
    if (b.dot) {
      lines.push('Урон: ' + fmt(b.dot) + ' за раунд' + (b._linked ? ' (метки связаны, тик удвоен)' : ''));
    }
    if (b.hot) lines.push('Лечение: ' + fmt(b.hot) + ' за раунд');
    if (b.dmgTakenMod) {
      lines.push('Получает +' + Math.round(Number(b.dmgTakenMod) * 100) + '% урона'
        + (b.fromUid ? ' только от наложившего' : ''));
    }
    if (b.dmgReduce) lines.push('Урон по цели −' + Math.round(Number(b.dmgReduce) * 100) + '%');
    if (b.enemyDmgMod) lines.push('Урон цели −' + Math.round(Number(b.enemyDmgMod) * 100) + '%');
    if (b.atkMod) lines.push((b.atkMod > 0 ? '+' : '') + Math.round(b.atkMod * 100) + '% атаки');
    if (b.critMod) lines.push((b.critMod > 0 ? '+' : '') + Math.round(Number(b.critMod) * 100) + '% крита');
    if (b.versMod) lines.push((b.versMod > 0 ? '+' : '') + Math.round(Number(b.versMod) * 100) + '% универсальности');
    if (b.lifesteal) lines.push(Math.round(Number(b.lifesteal) * 100) + '% нанесённого возвращается');
    if (b.healTakenMod) lines.push((b.healTakenMod > 0 ? '+' : '') + Math.round(Number(b.healTakenMod) * 100) + '% входящего лечения');
    if (b.petAtkMod) lines.push((b.petAtkMod > 0 ? '+' : '') + Math.round(Number(b.petAtkMod) * 100) + '% урона питомцам');
    if (b.defMod) lines.push((b.defMod > 0 ? '+' : '') + Math.round(b.defMod * 100) + '% защиты');
    if (b.armorMod) lines.push((Number(b.armorMod) > 0 ? '+' : '') + Math.round(Number(b.armorMod) * 100) + '% брони');
    if (b.abilityCharges != null) lines.push(b.abilityCharges + ' удар' + (b.abilityCharges === 1 ? '' : 'а'));
    if (b.stacks) lines.push('Стаки: ×' + b.stacks);
    if (b.turns != null && b.turns < 90) lines.push('Осталось: ' + b.turns + ' р.');
    if (b.tip) lines.push(b.tip);
    if (b.fromUid) {
      let src = null;
      try {
        src = (typeof allUnits === 'function' ? allUnits() : []).find(x => x && x.uid === b.fromUid) || null;
      } catch (_) { src = null; }
      if (src && src.name) lines.push('Наложил: ' + src.name);
    }
    if (b.id === 'storm_mark') {
      lines.push(u && u.raidSpread
        ? 'Отошёл — связь меток разорвана'
        : 'Если оба с меткой рядом — урон удваивается');
    }
    return lines;
  }

  function raidAuraEntries(u) {
    const list = [];
    const seen = new Set();
    const push = (b) => {
      if (!b || !b.id) return;
      const key = String(b.id) + '@' + String(b.fromUid || '');
      if (seen.has(key)) return;
      seen.add(key);
      list.push(b);
    };
    for (const b of (u.buffs || [])) push(b);
    if (u.thunderMark && !list.some(b => b.id === 'storm_mark')) {
      push({ id: 'storm_mark', name: 'Метка молнии', icon: '🌩️', tip: 'Отмечен молнией' });
    }
    return list.slice(0, 12);
  }

  function escAttr(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function auraIcoHtml(b, u) {
    const kind = auraKind(b);
    const showTurns = b.turns != null && b.turns < 90;
    const n = b.stacks
      ? `<i class="buff-n">${b.stacks}</i>`
      : (showTurns ? `<i class="buff-n">${b.turns}</i>` : '');
    const detail = auraDetailLines(b, u).join(' | ');
    const linked = b.id === 'storm_mark' && b._linked ? ' is-linked' : '';
    return `<span class="aura-ico buff ${kind}${linked}" data-tip-name="${escAttr(b.name || '')}" data-tip-detail="${escAttr(detail)}">${b.icon || '•'}${n}</span>`;
  }

  function auraRailHtml(u) {
    if (u && u.side === 'enemy' && !u.alive) return '';
    const items = raidAuraEntries(u);
    const good = [];
    const bad = [];
    for (const b of items) {
      if (auraIsBad(auraKind(b))) bad.push(b);
      else good.push(b);
    }
    if (!good.length && !bad.length) return '';
    let gShow = good;
    let bShow = bad;
    if (good.length && bad.length) {
      gShow = good.slice(0, 6);
      bShow = bad.slice(0, 6);
    } else {
      gShow = good.slice(0, 12);
      bShow = bad.slice(0, 12);
    }
    const moreGood = good.length - gShow.length;
    const moreBad = bad.length - bShow.length;
    const col = (list, extra, cls, label) => {
      if (!list.length && !extra) return '';
      const more = extra > 0
        ? `<span class="aura-ico aura-more" data-tip-name="Ещё эффекты" data-tip-detail="${escAttr((cls.indexOf('bad') >= 0 ? bad : good).slice(list.length).map(b => b.name || '').join(' | '))}">+${extra}</span>`
        : '';
      const shown = extra > 0 ? list.slice(0, Math.max(0, list.length - 1)) : list;
      return `<div class="aura-rail ${cls}" aria-label="${label}">` +
        shown.map(b => auraIcoHtml(b, u)).join('') + more +
        '</div>';
    };
    return `<div class="unit-aura is-on">${col(gShow, moreGood, 'aura-rail-good', 'Усиления')}${col(bShow, moreBad, 'aura-rail-bad', 'Ослабления')}</div>`;
  }

  function showAuraTip(anchor, name, detail) {
    const tip = getUiTipFloat('ability-tip-float', 'ability-tip-float');
    tip.replaceChildren();
    const n = document.createElement('div');
    n.className = 'pt-name';
    n.textContent = name || 'Эффект';
    tip.appendChild(n);
    const lines = String(detail || '').split(' | ').map(s => s.trim()).filter(Boolean);
    if (!lines.length) {
      const d = document.createElement('div');
      d.className = 'pt-detail';
      d.textContent = 'Нет описания';
      tip.appendChild(d);
    } else {
      for (const line of lines) {
        const d = document.createElement('div');
        d.className = 'pt-detail' + (/^Урон:/.test(line) ? ' pt-dmg' : '');
        d.textContent = line;
        tip.appendChild(d);
      }
    }
    tip.classList.remove('hidden');
    positionUiTipFloat(tip, anchor);
  }

  function unitCard(u, actor) {
    const hpPct = clamp(u.hp / u.maxHp * 100, 0, 100);
    const isDkRunes = !!(u.res?.runes && u.res.secondary?.type === 'runic_power');
    let resPct;
    let resType;
    let resLabel;
    if (isDkRunes) {
      const rp = u.res.secondary;
      resPct = rp.max ? clamp(rp.current / rp.max * 100, 0, 100) : 0;
      resType = 'runic_power';
      resLabel = (rp.icon || '💙') + ' ' + Math.floor(rp.current);
    } else {
      resPct = u.res.primary.max ? clamp(u.res.primary.current / u.res.primary.max * 100, 0, 100) : 0;
      resType = u.res.primary.type;
      resLabel = (u.res.primary.icon || '') + ' ' + Math.floor(u.res.primary.current);
    }
    const castKind = u.casting?.kind || '';
    const teleHtml = u.casting
      ? `<div class="tele-badge ${castKind === 'buster' ? 'buster' : castKind === 'aoe' ? 'aoe' : 'kick'}">${telegraphLabel(u.casting)}</div>`
      : '';
    const topThreat = u.side === 'enemy' ? topThreatUid(u) : null;
    const tankUids = new Set((run?.party || []).filter(p => p.role === 'tank').map(p => p.uid));
    const threatHtml = (u.side === 'enemy' && topThreat)
      ? `<div class="threat-chip${tankUids.has(topThreat) ? ' tanking' : ''}">${tankUids.has(topThreat) ? 'ТАНК' : 'ВТОР.'}</div>`
      : '';
    const burstHtml = (u.burstStacks || 0) > 0
      ? `<div class="burst-chip">💥${u.burstStacks}</div>` : '';
    const runesHtml = runesRowHtml(u);
    const secCombo = u.res?.secondary?.type === 'combo' && (u.res.secondary.current || 0) > 0;
    const sec = (u.res.secondary && !isDkRunes)
      ? `<div class="slot-sec res-text${secCombo ? ' combo-pts' : ''}">${u.res.secondary.icon} ${u.res.secondary.current}/${u.res.secondary.max}</div>`
      : '';
    const cc = unitAccent(u);
    const castTurns = Number(u.casting?.turns || u.casting?.resolveIn || 1);
    const castMax = Number(u.casting?.maxTurns || u.casting?.resolveIn || castTurns) || 1;
    const castPct = Math.max(18, Math.min(100, Math.round((castTurns / Math.max(1, castMax)) * 100)));
    const castBar = u.casting
      ? `<div class="slot-cast"><div class="cast-bar" title="${telegraphLabel(u.casting)}"><i style="width:${castPct}%;animation:none"></i></div><div class="cast-name">${telegraphLabel(u.casting)}</div></div>`
      : '';
    const shieldHtml = shieldsBlockHtml(u);
    const ico = u.side === 'ally' ? (u.icon || '⚔') : (u.icon || '💀');
    const roleLabel = (u.isElite ? '◆ Элита · ' : '') + (ROLE_LABEL[u.role] || u.role) + (u.enraged ? ' 🔥' : '');
    const pSrc = portraitSrc(u);
    const portraitHtml = pSrc
      ? artHtml(pSrc, ico, 'portrait')
      : `<div class="portrait"><span>${ico}</span></div>`;
    const resBarTitle = isDkRunes
      ? `title="Сила рун ${Math.floor(u.res.secondary.current)}/${u.res.secondary.max}"`
      : '';
    return `<div class="${unitClassName(u, actor)}" data-uid="${u.uid}" style="--cc:${cc}">
      ${threatHtml}${teleHtml}${burstHtml}
      ${portraitHtml}
      <div class="u-name" title="${u.fullName || u.name}">${u.fullName || u.name}</div>
      <div class="u-role ${ROLE_CLASS[u.role] || ''}">${roleLabel}</div>
      <div class="bar-wrap">
        <div class="bar hp${u.side === 'enemy' ? ' enemy-hp' : ''}"><i style="width:${hpPct}%"></i></div>
        <span class="bar-label">${fmt(u.hp)}/${fmt(u.maxHp)}</span>
      </div>
      ${shieldHtml}
      <div class="bar-wrap" ${resBarTitle}>
        <div class="bar res ${resType}"><i style="width:${resPct}%"></i></div>
        <span class="bar-label">${resLabel}</span>
      </div>
      ${sec}${runesHtml}${castBar}
    </div>`;
  }
