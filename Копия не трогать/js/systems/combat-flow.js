/* systems/combat-flow: afterAction, victory, talents, rest */
  function afterAction() {
    if (!combat || combat.over) return;
    const keep = !!combat._keepPlayerTurn;
    combat._keepPlayerTurn = false;
    pendingTarget = null;
    try { clearRuneHighlight(); } catch (_) {}

    // freeAction: тот же герой ходит ещё раз (Рывок / Рёв / Берсерк)
    if (keep) {
      if (checkEnd()) return;
      const actor = currentActor();
      if (actor && actor.side === 'ally' && !actor.isPet && actor.alive) {
        combat.waitingPlayer = true;
        try {
          renderCombat();
          showAbilities(actor);
          saveRun();
          return;
        } catch (err) {
          console.error('[afterAction freeAction]', err);
          // не зависаем — обычный конец хода
        }
      }
      // keep не удался (нет актора / ошибка UI) → проваливаемся в обычный afterAction
    }

    // Конец хода героя: «Гений инженерии» у изобретателя
    try {
      const fin = currentActor();
      if (fin && fin.side === 'ally' && !fin.isPet) tryTinkererGenius(fin);
    } catch (e) { console.error(e); }

    combat.waitingPlayer = false;
    const bar = document.getElementById('ability-bar');
    const actions = document.getElementById('combat-actions');
    if (bar) bar.innerHTML = '';
    try { hidePassivePocket(); } catch (_) {}
    if (actions) actions.innerHTML = '';
    if (checkEnd()) return;
    combat.turnIndex++;
    try { renderCombat(); } catch (err) { console.error('[afterAction render]', err); }
    saveRun();
    scheduleProcessTurn(Math.max(60, Math.round(180 / gameSpeed)));
  }

  function checkEnd() {
    if (!living('enemy').length) {
      combat.over = true;
      log('Пулл зачищен — идём дальше (без полного восстановления)', 'system');
      // M+ feel: tiny bandage of MISSING hp only (not % max), no mana fill
      run.party.forEach(p => {
        if (p.alive) {
          const missing = p.maxHp - p.hp;
          p.hp = clamp(p.hp + Math.round(missing * 0.06), 0, p.maxHp);
        }
      });
      if (combat.pets) combat.pets = [];
      renderCombat();
      setTimeout(() => onVictory(), 550);
      return true;
    }
    if (!livingHeroes().length) {
      combat.over = true;
      endRun(false, 'Вайп. Ключ провален.');
      return true;
    }
    return false;
  }

  function grantLoot(done) {
    // Gear draft 1 of 3 (+ assign to hero); rare chance at old power loot
    if (Math.random() < 0.18) {
      openLootDraft(typeof done === 'function' ? done : null);
    } else {
      openGearDraft(typeof done === 'function' ? done : null);
    }
  }

  function onVictory() {
    if (run.finished) return;
    const node = currentRouteNode();
    const type = node?.type || 'trash';
    const afterLoot = () => {
      // Always go through advanceRoom — it handles final/mopup/branches
      const offer = type === 'elite' || type === 'boss' || type === 'final' || Math.random() < 0.45;
      if (offer && (run.talents || []).length < 8 && !node?.mopup) {
        openTalent(() => advanceRoom());
      } else {
        advanceRoom();
      }
    };
    if (type === 'boss' || type === 'final' || type === 'elite') {
      grantLoot(afterLoot);
    } else {
      afterLoot();
    }
  }

  let talentDoneCb = null;
  let restBusy = false;

  function finishTalentPick(talent) {
    const modal = document.getElementById('talent-modal');
    if (modal) modal.classList.add('hidden');
    if (talent) {
      try {
        if (!run.talents) run.talents = [];
        if (!run.talents.some(t => t.id === talent.id)) {
          run.talents.push(talent);
          applyTalentStats();
          renderPowers();
          toast(talent.name);
        }
      } catch (e) { console.error(e); }
    }
    const cb = talentDoneCb;
    talentDoneCb = null;
    if (typeof cb === 'function') {
      try { cb(); } catch (e) {
        console.error(e);
        advanceRoom();
      }
    }
  }

  function openTalent(done) {
    talentDoneCb = typeof done === 'function' ? done : null;
    try {
      const owned = new Set((run.talents || []).map(t => t.id));
      const pool = TALENTS.filter(t => !owned.has(t.id));
      const picks = [];
      const available = pool.slice();
      while (picks.length < 3 && available.length) {
        const idx = Math.floor(Math.random() * available.length);
        picks.push(available.splice(idx, 1)[0]);
      }
      if (!picks.length) {
        finishTalentPick(null);
        return;
      }
      const modal = document.getElementById('talent-modal');
      const grid = document.getElementById('talent-grid');
      grid.innerHTML = '';
      picks.forEach(t => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'talent-card rarity-' + t.rarity;
        btn.innerHTML = `<div style="font-size:1.4rem">${t.icon}</div><b>${t.name}</b><div style="font-size:.8rem;color:var(--muted)">${t.desc}</div>`;
        btn.addEventListener('click', () => finishTalentPick(t));
        grid.appendChild(btn);
      });
      modal.classList.remove('hidden');
    } catch (e) {
      console.error(e);
      finishTalentPick(null);
    }
  }

  function doRest(kind) {
    if (!run || run.finished || restBusy) return;
    const node = currentRouteNode();
    if (!node || node.type !== 'rest') return;
    restBusy = true;
    document.getElementById('rest-modal').classList.add('hidden');
    try {
      if (kind === 'heal') {
        // Not a full wipe reset — bandage + partial mana (like food/water between packs)
        run.party.forEach(p => {
          if (p.hp <= 0) { p.alive = true; p.hp = Math.round(p.maxHp * 0.35); }
          else {
            p.alive = true;
            const missing = p.maxHp - p.hp;
            p.hp = clamp(p.hp + Math.round(missing * 0.55), 1, p.maxHp);
          }
          if (p.res?.primary?.type === 'mana') {
            p.res.primary.current = clamp(p.res.primary.current + Math.round(p.res.primary.max * 0.45), 0, p.res.primary.max);
          } else if (p.res?.primary?.type === 'energy' || p.res?.primary?.type === 'focus') {
            p.res.primary.current = p.res.primary.max;
          } else if (p.res?.runes) {
            p.res.runes.blood = [true, true];
            p.res.runes.frost = [true, true];
            p.res.runes.unholy = [true, true];
            p.res.runes.cd = [];
            p.res.primary.current = 6;
          } else if (p.res?.primary) {
            p.res.primary.current = clamp(p.res.primary.current + 20, 0, p.res.primary.max);
          }
        });
        toast('Отдых: ~половина недостающего HP + мана');
        log('Привал: частичное восстановление (не full HP/мана).', 'heal');
      } else if (kind === 'buff') {
        run.party.forEach(p => {
          if (p.alive) {
            const missing = p.maxHp - p.hp;
            p.hp = clamp(p.hp + Math.round(missing * 0.2), 0, p.maxHp);
          }
        });
        run.restBuffBattles = 2;
        toast('+15% атаки на 2 боя');
        log('Настрой: +15% атаки на 2 боя (мало хила).', 'system');
      } else {
        toast('Дальше без отдыха!');
        log('Отряд идёт дальше без лечения.', 'system');
      }
    } catch (e) {
      console.error(e);
    }
    // Always offer talent then advance — never soft-lock on rest room
    openTalent(() => {
      restBusy = false;
      advanceRoom();
    });
  }

