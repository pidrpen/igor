/* ui/combat-ui: ability bar, unit cards, battle render */
  function showAbilities(actor) {
    const bar = document.getElementById('ability-bar');
    const actions = document.getElementById('combat-actions');
    const scrollY = bar ? bar.scrollTop : 0;
    try { hideAbilityTipFloat(); } catch (_) {}
    try { clearRuneHighlight(); } catch (_) {}
    if (bar) bar.innerHTML = '';
    if (actions) actions.innerHTML = '';
    try { renderPassiveTray(actor); } catch (e) { console.error(e); }
    if (!bar) return;
    actor.abilities.forEach((ab, idx) => {
      const btn = document.createElement('button');
      const can = canPay(actor, ab);
      const hasWideSweep = !!(actor.buffs || []).some(b => b && b.id === 'wide_sweep' && (Number(b.stacks) || 0) > 0);
      btn.className = 'ability' + ((ab.id === 'elusive' && (actor.purifyCleared || 0) > 0) ? ' elusive-charged' : '')
        + ((ab.id === 'heroic' && hasWideSweep) ? ' wide-sweep-charged' : '')
        + ((ab.id === 'debug_mode') ? ' debug-mode-ab' : '')
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
      if (ab.curCd > 0) pushY('ещё ' + ab.curCd);
      pushY(est);
      if (tags) tags.split(' · ').forEach(pushY);
      const yellow = yellowParts.join(' · ');
      const cdHtml = ab.curCd > 0 ? `<div class="cd-overlay">${ab.curCd}</div>` : '';
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
      // Тултип и на всей карточке (в т.ч. на КД / без ресурса)
      btn.addEventListener('mouseenter', showTip);
      btn.addEventListener('mouseleave', hideTip);
      btn.addEventListener('focus', showTip);
      btn.addEventListener('blur', hideTip);
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
      btn.addEventListener('click', () => {
        hideAbilityTipFloat();
        sfx('click');
        if (btn.classList.contains('is-disabled') || !canPay(actor, ab)) return;
        if (needTarget) {
          // Always pick target manually (heals, DoTs, damage, purge, kick…)
          pendingTarget = { actor, ability: ab };
          if (ab.costRunes) highlightAbilityRunes(actor, ab.costRunes, true);
          else clearRuneHighlight();
          const r = abilityTargetRule(ab);
          if (EXECUTE_IDS.has(ab.id)) {
            toast(ab.name + ': цель с ≤35% HP (подсвечены)');
          } else {
            toast(r === 'ally_any' ? 'Цель: союзник (клик по фрейму)'
              : r === 'ally_or_enemy' ? 'Цель: союзник или враг'
              : 'Цель: враг (клик по фрейму)');
          }
          updateUnitSelectionOnly();
        } else {
          // self_only / aoe / buff / cleanse / heal_aoe — без клика
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
        (a.type === 'interrupt' || INTERRUPT_IDS.has(a.id)) && canPay(actor, a));
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

  function onUnitClick(unit) {
    if (!pendingTarget || !combat?.waitingPlayer) return;
    if (!unit?.alive) return toast('Мёртв');
    const { actor, ability } = pendingTarget;
    const rule = abilityTargetRule(ability);
    const isKick = ability.type === 'interrupt' || INTERRUPT_IDS.has(ability.id);
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
    if (isKick && !unit.casting) return toast('Цель не кастует');
    if (EXECUTE_IDS.has(ability.id) && unit.hp / unit.maxHp > 0.35) return toast('Казнь только при ≤35% здоровья');
    pendingTarget = null;
    castWithRuneFlash(actor, ability, unit);
  }


  function renderCombat() {
    renderAllies();
    renderEnemies();
    updateBossFrame();
    updateVignette();
  }

  /** Only toggles selection/active classes — no full DOM rebuild (no flicker). */
  function updateUnitSelectionOnly() {
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

  function renderAllies() {
    const row = document.getElementById('ally-row');
    const actor = currentActor();
    // Heroes as full cards; pets as mini portraits under their owner
    row.innerHTML = run.party.map(hero => {
      const pets = petsOf(hero);
      // Always same stack size; pet-row only when pets exist (absolute, outside card)
      const petRow = pets.length
        ? `<div class="pet-row">${pets.map(p => petPortraitHtml(p, actor)).join('')}</div>`
        : `<div class="pet-row" aria-hidden="true"></div>`;
      return `<div class="unit-stack">${unitCard(hero, actor)}${petRow}</div>`;
    }).join('');
    row.querySelectorAll('.unit').forEach(el => {
      el.addEventListener('click', () => {
        const u = run.party.find(p => p.uid === el.dataset.uid);
        if (u) onUnitClick(u);
      });
    });
    row.querySelectorAll('.pet-port').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = (combat?.pets || []).find(x => x.uid === el.dataset.uid);
        if (!p) return;
        toast(`${p.icon} ${p.name}: ${fmt(p.hp)}/${fmt(p.maxHp)}` +
          (p.petTurnsLeft != null ? ` · ${p.petTurnsLeft} р.` : ''));
      });
    });
  }
  function renderEnemies() {
    const row = document.getElementById('enemy-row');
    if (!combat) { row.innerHTML = ''; return; }
    const actor = currentActor();
    row.innerHTML = combat.enemies.map(u => unitCard(u, actor)).join('');
    row.querySelectorAll('.unit').forEach(el => {
      el.addEventListener('click', () => {
        const u = combat.enemies.find(p => p.uid === el.dataset.uid);
        if (u) onUnitClick(u);
      });
    });
  }

  function unitCard(u, actor) {
    const hpPct = clamp(u.hp / u.maxHp * 100, 0, 100);
    // ДК: под HP показываем силу рун, а не счётчик 6 рун
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
    const active = actor && actor.uid === u.uid;
    const targeting = pendingTarget && (() => {
      const r = abilityTargetRule(pendingTarget.ability);
      if (r === 'ally_any') return u.side === 'ally' && !u.isPet;
      if (r === 'enemy') return u.side === 'enemy';
      if (r === 'ally_or_enemy') return !u.isPet && (u.side === 'ally' || u.side === 'enemy');
      return false;
    })();
    const castKind = u.casting?.kind || '';
    const teleHtml = u.casting
      ? `<div class="tele-badge ${castKind === 'buster' ? 'buster' : castKind === 'aoe' ? 'aoe' : 'kick'}">${telegraphLabel(u.casting)}</div>`
      : '';
    const topThreat = u.side === 'enemy' ? topThreatUid(u) : null;
    const tankUid = run?.party?.find(p => p.role === 'tank')?.uid;
    const threatHtml = (u.side === 'enemy' && topThreat)
      ? `<div class="threat-chip${topThreat === tankUid ? ' tanking' : ''}">${topThreat === tankUid ? 'ТАНК' : 'ВТОР.'}</div>`
      : '';
    const burstHtml = (u.burstStacks || 0) > 0
      ? `<div class="burst-chip">💥${u.burstStacks}</div>` : '';
    const markHtml = u.thunderMark ? `<div class="mark-chip">⚡ метка</div>` : '';
    // Only render rune/sec slots when present — empty slots collapse via CSS :empty
    let runesHtml = '';
    if (u.res.runes) {
      const r = u.res.runes;
      // turns left for a specific spent rune slot (from r.cd entries)
      const cdLeft = (type, idx) => {
        let best = 0;
        for (const c of (r.cd || [])) {
          if (c && c.type === type && Number(c.idx) === idx && Number(c.turns) > 0) {
            best = Math.max(best, Number(c.turns) || 0);
          }
        }
        return best;
      };
      // ready = ярко; spent = свой цвет, приглушённый + цифра ходов до восстановления
      const mk = (cls, type, idx) => {
        const on = !!(r[type] && r[type][idx]);
        const cd = on ? 0 : cdLeft(type, idx);
        const cdHtml = (!on && cd > 0) ? `<span class="rune-cd">${cd}</span>` : '';
        return `<i class="rune ${cls}${on ? ' ready' : ' spent'}${cd > 0 ? ' on-cd' : ''}" data-ready="${on ? '1' : '0'}" data-cd="${cd}" title="${on ? 'Готова' : (cd > 0 ? 'Восстановление: ' + cd + ' х.' : 'На КД')}">${cdHtml}</i>`;
      };
      runesHtml = '<div class="slot-runes runes-row">' +
        (r.blood || []).map((_, i) => mk('b', 'blood', i)).join('') +
        (r.frost || []).map((_, i) => mk('f', 'frost', i)).join('') +
        (r.unholy || []).map((_, i) => mk('u', 'unholy', i)).join('') +
        '</div>';
    }
    // Вторичный ресурс текстом — кроме ДК (сила рун уже в полоске под HP)
    const sec = (u.res.secondary && !isDkRunes)
      ? `<div class="slot-sec res-text">${u.res.secondary.icon} ${u.res.secondary.current}/${u.res.secondary.max}</div>`
      : '';
    // All buffs/debuffs/DoTs/HoTs with remaining rounds (same strip for everyone)
    const buffs = (u.buffs || [])
      .slice()
      .sort((a, b) => {
        const pa = (a.dot || a.hot) ? 2 : 1;
        const pb = (b.dot || b.hot) ? 2 : 1;
        return pb - pa;
      })
      .slice(0, 10)
      .map(b => {
        const bits = [b.name || ''];
        if (b.atkMod) bits.push((b.atkMod > 0 ? '+' : '') + Math.round(b.atkMod * 100) + '% атаки');
        if (b.defMod) bits.push((b.defMod > 0 ? '+' : '') + Math.round(b.defMod * 100) + '% DEF');
        if (b.dmgTakenMod) {
          bits.push('+' + Math.round(b.dmgTakenMod * 100) + '%' + (b.physOnly ? ' физ.' : '') + ' урон');
        }
        if (b.abilityCharges != null) bits.push(b.abilityCharges + ' удар' + (b.abilityCharges === 1 ? '' : 'а'));
        if (b.stacks) bits.push('×' + b.stacks);
        if (b.armorMod) bits.push('+' + Math.round(Number(b.armorMod) * 100) + '% брони');
        if (b.tip) bits.push(b.tip);
        if (b.dot) bits.push(fmt(b.dot) + '/р период.');
        if (b.hot) bits.push(fmt(b.hot) + '/р леч.');
        const showTurns = b.turns != null && b.turns < 90;
        if (showTurns) bits.push(b.turns + 'р');
        let kind = 'is-buff';
        if (b.dot) kind = 'is-dot';
        else if (b.hot) kind = 'is-hot';
        else if ((b.atkMod && b.atkMod < 0) || (b.defMod && b.defMod < 0) || b.ccMode) kind = 'is-debuff';
        // стаки (Ещё повезёт / ярость / Щит света) — число на иконке; иначе ходы
        const n = (b.stacks)
          ? `<i class="buff-n">${b.stacks}</i>`
          : (showTurns ? `<i class="buff-n">${b.turns}</i>` : '');
        return `<span class="buff ${kind}" title="${bits.filter(Boolean).join(' · ')}">${b.icon || '•'}${n}</span>`;
      }).join('');
    const castingCls = u.casting
      ? ' casting' + (castKind === 'buster' ? ' tg-buster' : castKind === 'aoe' ? ' tg-aoe' : ' tg-kick')
      : '';
    const low = u.alive && u.hp / u.maxHp < 0.3 ? ' low-hp' : '';
    const cc = (u.side === 'ally' && typeof classAccentColor === 'function')
      ? classAccentColor(u.classId, u.specId)
      : (CLASS_CSS[u.classId] || (u.side === 'enemy' ? '#a04040' : 'var(--gold)'));
    const castTurns = Number(u.casting?.turns || u.casting?.resolveIn || 1);
    const castMax = Number(u.casting?.maxTurns || u.casting?.resolveIn || castTurns) || 1;
    const castPct = Math.max(18, Math.min(100, Math.round((castTurns / Math.max(1, castMax)) * 100)));
    const castBar = u.casting
      ? `<div class="slot-cast"><div class="cast-bar" title="${telegraphLabel(u.casting)}"><i style="width:${castPct}%;animation:none"></i></div><div class="cast-name">${telegraphLabel(u.casting)}</div></div>`
      : '';
    const shieldHtml = u.shield
      ? `<div class="slot-shield bar-wrap"><div class="bar shield"><i style="width:${clamp(u.shield / u.maxHp * 100, 0, 100)}%"></i></div><span class="bar-label">🛡${fmt(u.shield)}</span></div>`
      : (u.stagger > 0
        ? `<div class="slot-shield bar-wrap"><div class="bar" style="background:#3a2810"><i style="width:${clamp(u.stagger / u.maxHp * 100, 0, 100)}%;background:linear-gradient(90deg,#c97a2a,#8a4010)"></i></div><span class="bar-label">шат ${fmt(u.stagger)}</span></div>`
        : '');
    const ico = u.side === 'ally' ? (u.icon || '⚔') : (u.icon || '💀');
    const roleLabel = (u.isElite ? '◆ Элита · ' : '') + (ROLE_LABEL[u.role] || u.role) + (u.enraged ? ' 🔥' : '');
    const pSrc = portraitSrc(u);
    const portraitHtml = pSrc
      ? artHtml(pSrc, ico, 'portrait')
      : `<div class="portrait"><span>${ico}</span></div>`;
    const kickPrio = u.casting && (u.casting.kind === 'kick' || (u.casting.castPrio || 0) >= 3) ? ' kick-prio' : '';
    const resBarTitle = isDkRunes
      ? `title="Сила рун ${Math.floor(u.res.secondary.current)}/${u.res.secondary.max}"`
      : '';
    return `<div class="unit ${u.side === 'ally' ? 'ally' : 'enemy'}${u.alive ? '' : ' dead'}${active ? ' active' : ''}${targeting ? ' selected-target' : ''}${castingCls}${low}${kickPrio}" data-uid="${u.uid}" style="--cc:${cc}">
      ${threatHtml}${teleHtml}${burstHtml}${markHtml}
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
      <div class="buffs">${buffs}</div>
    </div>`;
  }
