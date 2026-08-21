/* systems/meter: Recount */
  function resetRecount() {
    recount = {
      damage: Object.create(null),
      taken: Object.create(null),
      healing: Object.create(null),
      damageBySkill: Object.create(null),
      takenBySource: Object.create(null),
      healingBySkill: Object.create(null),
      collapsed: true,
      tab: 'damage',
      detailUid: null,
    };
    scheduleRecountUI();
  }

  function showRecountPanel(show) {
    const panel = document.getElementById('recount-panel');
    if (!panel) return;
    panel.classList.toggle('hidden', !show);
    if (show) scheduleRecountUI();
  }

  /** Credit pet activity to its owner (party hero). */
  function meterPartyKey(unit) {
    if (!unit) return null;
    if (unit.isPet && unit.ownerUid) return unit.ownerUid;
    if (unit.side === 'ally' && !unit.isPet) return unit.uid;
    return null;
  }

  function meterIsPartyHeroUid(id) {
    return !!(id && run?.party?.some(p => p.uid === id));
  }

  function meterAdd(bucket, key, amount) {
    if (!recount || !key || !(amount > 0)) return;
    bucket[key] = (bucket[key] || 0) + amount;
  }

  /** Nested add: bucket[ownerKey][label] += amount */
  function meterAddSkill(nested, ownerKey, label, amount) {
    if (!recount || !nested || !ownerKey || !(amount > 0)) return;
    const skill = String(label || 'Прочее').trim() || 'Прочее';
    if (!nested[ownerKey]) nested[ownerKey] = Object.create(null);
    nested[ownerKey][skill] = (nested[ownerKey][skill] || 0) + amount;
  }

  /** Resolve ability/source display name for meters. */
  function meterResolveAbilityName(unit, ctx) {
    if (!ctx) return null;
    if (ctx.abilityName) return String(ctx.abilityName);
    if (ctx.sourceName) return String(ctx.sourceName);
    if (ctx.abilityId && unit) {
      const ab = (unit.abilities || []).find(a => a && a.id === ctx.abilityId);
      if (ab && ab.name) return ab.name;
    }
    if (ctx.isDot) return 'Периодический урон';
    if (ctx.isHot) return 'Периодическое лечение';
    if (ctx.isPet) return 'Питомец';
    if (ctx.lifesteal) return 'Вампиризм';
    return null;
  }

  function meterDealtLabel(attacker, ctx) {
    const fromCtx = meterResolveAbilityName(attacker, ctx);
    if (fromCtx) {
      if (attacker && attacker.isPet) {
        return (attacker.name ? attacker.name + ': ' : 'Питомец: ') + fromCtx;
      }
      return fromCtx;
    }
    if (attacker && attacker.isPet) return attacker.name || 'Питомец';
    if (attacker && attacker.casting && attacker.casting.name) return attacker.casting.name;
    return 'Автоатака';
  }

  function meterTakenLabel(attacker, ctx) {
    const skill = meterResolveAbilityName(attacker, ctx);
    if (attacker) {
      const who = attacker.name || (attacker.side === 'enemy' ? 'Враг' : 'Источник');
      if (skill) return who + ': ' + skill;
      if (attacker.casting && attacker.casting.name) return who + ': ' + attacker.casting.name;
      return who;
    }
    if (skill) return skill;
    if (ctx && ctx.isDot) return 'Периодический урон';
    return 'Окружение';
  }

  function meterHealLabel(healer, ctx) {
    const fromCtx = meterResolveAbilityName(healer, ctx);
    if (fromCtx) {
      const label = (ctx && ctx.isShield && fromCtx.indexOf('щит') < 0 && fromCtx.indexOf('Щит') < 0)
        ? (fromCtx + ' (щит)')
        : fromCtx;
      if (healer && healer.isPet) {
        return (healer.name ? healer.name + ': ' : 'Питомец: ') + label;
      }
      return label;
    }
    if (ctx && ctx.isShield) return 'Щит';
    if (healer && healer.isPet) return healer.name || 'Питомец';
    return 'Исцеление';
  }

  /** Party damage done + party damage taken (heroes only for taken). */
  function meterOnDamage(attacker, target, amount, ctx) {
    if (!recount || !(amount > 0) || !run) return;
    const c = ctx || null;
    // Done: only squad (heroes + pets) hitting enemies
    if (attacker && target && target.side === 'enemy' && attacker.side === 'ally') {
      const key = meterPartyKey(attacker);
      if (meterIsPartyHeroUid(key)) {
        meterAdd(recount.damage, key, amount);
        meterAddSkill(recount.damageBySkill, key, meterDealtLabel(attacker, c), amount);
      }
    }
    // Taken: only damage on party heroes (not pets, not enemies)
    if (target && target.side === 'ally' && !target.isPet && meterIsPartyHeroUid(target.uid)) {
      meterAdd(recount.taken, target.uid, amount);
      meterAddSkill(recount.takenBySource, target.uid, meterTakenLabel(attacker, c), amount);
    }
    scheduleRecountUI();
  }

  /** Healing done by squad heroes (incl. self / HoT). Pet heal → owner. */
  function meterOnHeal(healer, _target, amount, ctx) {
    if (!recount || !(amount > 0) || !run || !healer) return;
    if (healer.side !== 'ally') return;
    const key = meterPartyKey(healer);
    if (meterIsPartyHeroUid(key)) {
      meterAdd(recount.healing, key, amount);
      meterAddSkill(recount.healingBySkill, key, meterHealLabel(healer, ctx || null), amount);
    }
    scheduleRecountUI();
  }

  function scheduleRecountUI() {
    if (recountUiRaf) return;
    recountUiRaf = requestAnimationFrame(() => {
      recountUiRaf = 0;
      updateRecountUI();
    });
  }

  function recountDetailMapForTab(tab) {
    if (!recount) return null;
    if (tab === 'taken') return recount.takenBySource;
    if (tab === 'healing') return recount.healingBySkill;
    return recount.damageBySkill;
  }

  function recountDetailTitle(tab) {
    if (tab === 'taken') return 'Получено от';
    if (tab === 'healing') return 'Исцеление скиллами';
    return 'Урон скиллами';
  }

  function renderRecountDetail(heroUid, heroName) {
    const box = document.getElementById('recount-detail');
    const titleEl = document.getElementById('recount-detail-title');
    const listEl = document.getElementById('recount-detail-list');
    if (!box || !listEl) return;
    if (!recount || !heroUid) {
      box.classList.add('hidden');
      return;
    }
    const tab = recount.tab || 'damage';
    const nested = recountDetailMapForTab(tab);
    const skills = (nested && nested[heroUid]) ? nested[heroUid] : null;
    const entries = skills
      ? Object.keys(skills).map(k => ({ name: k, value: skills[k] || 0 }))
        .filter(e => e.value > 0)
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'ru'))
      : [];
    const top = entries.reduce((m, e) => Math.max(m, e.value), 0);
    const who = heroName || 'Герой';
    if (titleEl) titleEl.textContent = who + ' · ' + recountDetailTitle(tab);
    if (!entries.length) {
      listEl.innerHTML = '<div class="recount-detail-empty">Пока нет данных по скиллам</div>';
    } else {
      listEl.innerHTML = entries.map(e => {
        const pct = top > 0 ? Math.round((e.value / top) * 100) : 0;
        return `<div class="recount-detail-row" title="${e.name}: ${fmt(e.value)}">
          <span class="rd-name">${e.name}</span>
          <span class="rd-val">${fmt(e.value)}</span>
          <div class="rd-pct"><i style="width:${pct}%"></i></div>
        </div>`;
      }).join('');
    }
    box.classList.remove('hidden');
  }

  function updateRecountUI() {
    const panel = document.getElementById('recount-panel');
    if (!panel) return;
    if (!run || run.finished || !recount) {
      panel.classList.add('hidden');
      return;
    }
    panel.classList.remove('hidden');
    panel.classList.toggle('collapsed', !!recount.collapsed);
    panel.dataset.tab = recount.tab || 'damage';

    const tabs = panel.querySelectorAll('.recount-tabs button');
    tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === recount.tab));

    if (recount.collapsed) {
      const det = document.getElementById('recount-detail');
      if (det) det.classList.add('hidden');
      return;
    }

    const map = recount.tab === 'taken' ? recount.taken
      : recount.tab === 'healing' ? recount.healing
      : recount.damage;
    const rows = (run.party || []).map(p => ({
      uid: p.uid,
      // fullName уже с «· 2» при дублях спеков (assignPartyUniqueNames)
      name: p.fullName || p.name || 'Герой',
      icon: p.icon || '👤',
      value: map[p.uid] || 0,
    })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'ru'));
    const top = rows.reduce((m, r) => Math.max(m, r.value), 0);
    const total = rows.reduce((s, r) => s + r.value, 0);

    const list = document.getElementById('recount-list');
    if (list) {
      list.innerHTML = rows.map(r => {
        const pct = top > 0 ? Math.round((r.value / top) * 100) : 0;
        const active = recount.detailUid === r.uid ? ' active' : '';
        return `<div class="recount-row${active}" data-uid="${r.uid}" data-name="${r.name}" title="${r.name}: ${fmt(r.value)} · клик — детали скиллов">
          <span class="rc-ico">${r.icon}</span>
          <span class="rc-name">${r.name}</span>
          <span class="rc-val">${fmt(r.value)}</span>
          <div class="recount-bar-wrap"><i style="width:${pct}%"></i></div>
        </div>`;
      }).join('');
      list.querySelectorAll('.recount-row').forEach(row => {
        row.addEventListener('click', () => {
          if (!recount) return;
          const id = row.dataset.uid;
          if (recount.detailUid === id) {
            recount.detailUid = null;
            document.getElementById('recount-detail')?.classList.add('hidden');
            row.classList.remove('active');
            return;
          }
          recount.detailUid = id;
          list.querySelectorAll('.recount-row').forEach(r => r.classList.toggle('active', r.dataset.uid === id));
          renderRecountDetail(id, row.dataset.name || '');
        });
      });
    }
    const totEl = document.getElementById('recount-total');
    if (totEl) totEl.textContent = fmt(total);

    // Keep detail open for selected hero when totals refresh
    if (recount.detailUid) {
      const hero = (run.party || []).find(p => p.uid === recount.detailUid);
      renderRecountDetail(recount.detailUid, hero ? (hero.fullName || hero.name) : '');
    } else {
      document.getElementById('recount-detail')?.classList.add('hidden');
    }
  }

  function bindRecountUI() {
    const panel = document.getElementById('recount-panel');
    if (!panel || panel.dataset.bound) return;
    panel.dataset.bound = '1';
    document.getElementById('recount-toggle')?.addEventListener('click', () => {
      if (!recount) return;
      recount.collapsed = !recount.collapsed;
      updateRecountUI();
    });
    panel.querySelectorAll('.recount-tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!recount) return;
        recount.tab = btn.dataset.tab || 'damage';
        recount.collapsed = false;
        // keep detailUid — switch breakdown to new tab
        updateRecountUI();
      });
    });
    document.getElementById('recount-detail-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!recount) return;
      recount.detailUid = null;
      document.getElementById('recount-detail')?.classList.add('hidden');
      panel.querySelectorAll('.recount-row.active').forEach(r => r.classList.remove('active'));
    });
  }

  /** Format large combat numbers: 170000 → 170т, 1.5e6 → 1.5м */
  function fmt(n) {
    const v = Math.round(Number(n) || 0);
    const neg = v < 0 ? '-' : '';
    const a = Math.abs(v);
    if (a >= 1e6) return neg + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'м';
    if (a >= 1000) return neg + (a / 1000).toFixed(a >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'т';
    return neg + String(a);
  }

  // Pet templates (base stats × STAT_SCALE in createPetUnit)
