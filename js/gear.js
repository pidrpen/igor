/* gear: slots, generation, equip UI */
  // ═══════════════════════════════════════
  // GEAR SYSTEM (basic) — slots, gen, equip, JSON-safe
  // ═══════════════════════════════════════
  const GEAR_SLOTS = [
    { id: 'weapon', name: 'Оружие', wAtk: 1.0, wHp: 0.15, wDef: 0.1 },
    { id: 'head', name: 'Голова', wAtk: 0.35, wHp: 0.55, wDef: 0.35 },
    { id: 'chest', name: 'Грудь', wAtk: 0.3, wHp: 0.7, wDef: 0.45 },
    { id: 'legs', name: 'Ноги', wAtk: 0.35, wHp: 0.6, wDef: 0.35 },
    { id: 'feet', name: 'Ступни', wAtk: 0.25, wHp: 0.35, wDef: 0.25 },
    { id: 'hands', name: 'Руки', wAtk: 0.45, wHp: 0.3, wDef: 0.2 },
    { id: 'ring', name: 'Кольцо', wAtk: 0.4, wHp: 0.25, wDef: 0.2 },
    { id: 'trinket', name: 'Аксессуар', wAtk: 0.5, wHp: 0.2, wDef: 0.15 },
  ];
  const GEAR_SLOT_IDS = GEAR_SLOTS.map(s => s.id);
  const GEAR_SLOT_MAP = Object.fromEntries(GEAR_SLOTS.map(s => [s.id, s]));

  const GEAR_PREFIXES = [
    { id: 'sharp', name: 'Острый', weights: { atk: 1.25, crit: 1.2 } },
    { id: 'sturdy', name: 'Крепкий', weights: { hp: 1.3, def: 1.15 } },
    { id: 'keen', name: 'Точный', weights: { crit: 1.4, mastery: 1.1 } },
    { id: 'wise', name: 'Мудрого', weights: { mastery: 1.4, vers: 1.1 } },
    { id: 'hardy', name: 'Стойкий', weights: { vers: 1.35, def: 1.15 } },
    { id: 'swift', name: 'Быстрый', weights: { speed: 1.5, atk: 1.05 } },
    { id: 'brutal', name: 'Жестокий', weights: { atk: 1.35, crit: 1.1 } },
    { id: 'guardian', name: 'Стража', weights: { def: 1.4, hp: 1.2 } },
  ];
  const GEAR_SUFFIXES = [
    { id: 'tiger', name: 'тигра', weights: { crit: 1.3 } },
    { id: 'bear', name: 'медведя', weights: { hp: 1.25, def: 1.15 } },
    { id: 'eagle', name: 'орла', weights: { mastery: 1.3 } },
    { id: 'owl', name: 'совы', weights: { vers: 1.25 } },
    { id: 'serpent', name: 'змеи', weights: { atk: 1.15, crit: 1.1 } },
    { id: 'boar', name: 'вепря', weights: { def: 1.2, hp: 1.1 } },
  ];
  const GEAR_ICONS = {
    weapon: ['⚔️', '🗡️', '🪓', '🔨'],
    head: ['🪖', '🎩', '👑'],
    chest: ['🦺', '👕', '🧥'],
    legs: ['👖', '🩳'],
    feet: ['👟', '🥾', '👢'],
    hands: ['🧤', '✋'],
    ring: ['💍', '💠'],
    trinket: ['🔮', '📿', '🧿', '🔥'],
  };

  function emptyGear() {
    return { equipped: {}, bag: [] };
  }
  function normalizeGear(g) {
    const out = emptyGear();
    if (!g || typeof g !== 'object') return out;
    const eq = g.equipped && typeof g.equipped === 'object' ? g.equipped : {};
    for (const slot of GEAR_SLOT_IDS) {
      if (eq[slot] && eq[slot].uid) out.equipped[slot] = cloneGearItem(eq[slot]);
    }
    out.bag = Array.isArray(g.bag) ? g.bag.filter(Boolean).map(cloneGearItem) : [];
    return out;
  }
  function cloneGearItem(it) {
    if (!it) return null;
    return {
      uid: it.uid,
      slot: it.slot,
      name: it.name,
      icon: it.icon || '📦',
      ilvl: +it.ilvl || 1,
      rarity: it.rarity || 'common',
      role: it.role || 'any',
      stats: { ...(it.stats || {}) },
      prefixId: it.prefixId || null,
      suffixId: it.suffixId || null,
    };
  }
  function gearUid() {
    return 'g_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }
  function keyToIlvl(keyLevel) {
    const k = Math.max(2, +keyLevel || 2);
    return 6 + (k - 2) * 4; // +2→6, +5→18, +10→38, +14→54
  }
  function rarityForIlvl(ilvl, roll) {
    const r = roll == null ? Math.random() : roll;
    if (ilvl >= 40 && r < 0.12) return 'epic';
    if (ilvl >= 22 && r < 0.28) return 'rare';
    if (r < 0.55) return 'uncommon';
    return 'common';
  }
  function rarityMult(r) {
    return { common: 1, uncommon: 1.08, rare: 1.18, epic: 1.3 }[r] || 1;
  }
  function pickWeighted(list, rnd) {
    return list[Math.floor(rnd() * list.length)];
  }
  function mulberry32(a) {
    return function () {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function generateGearItem(opts = {}) {
    const keyLevel = opts.keyLevel || run?.keyLevel || 5;
    const slotId = opts.slot || GEAR_SLOT_IDS[Math.floor(Math.random() * GEAR_SLOT_IDS.length)];
    const slot = GEAR_SLOT_MAP[slotId] || GEAR_SLOTS[0];
    const seed = opts.seed != null ? opts.seed : (Math.floor(Math.random() * 1e9) ^ Date.now());
    const rnd = mulberry32(seed >>> 0);
    const ilvl = opts.ilvl || keyToIlvl(keyLevel) + Math.floor(rnd() * 5) - 1;
    const rarity = opts.rarity || rarityForIlvl(ilvl, rnd());
    const prefix = pickWeighted(GEAR_PREFIXES, rnd);
    const suffix = pickWeighted(GEAR_SUFFIXES, rnd);
    const rm = rarityMult(rarity);
    const budget = Math.max(4, Math.round(ilvl * 0.85 * rm));

    // Primary split by slot weights
    const wAtk = slot.wAtk * (prefix.weights.atk || 1) * (suffix.weights.atk || 1);
    const wHp = slot.wHp * (prefix.weights.hp || 1) * (suffix.weights.hp || 1);
    const wDef = slot.wDef * (prefix.weights.def || 1) * (suffix.weights.def || 1);
    const wSum = wAtk + wHp + wDef || 1;
    let atk = Math.round(budget * 0.55 * (wAtk / wSum));
    let hp = Math.round(budget * 8 * (wHp / wSum)); // HP in "display units" before STAT_SCALE applied later as flat on maxHp after scale
    let def = Math.round(budget * 0.35 * (wDef / wSum));

    // Secondary budget
    const secBudget = Math.max(1, Math.round(ilvl * 0.22 * rm));
    const secKeys = ['crit', 'mastery', 'vers', 'speed'];
    // bias from prefix/suffix
    const secW = { crit: 1, mastery: 1, vers: 1, speed: 0.7 };
    for (const k of secKeys) {
      secW[k] *= (prefix.weights[k] || 1) * (suffix.weights[k] || 1);
    }
    // two secondaries usually
    const order = secKeys.slice().sort((a, b) => secW[b] - secW[a] || rnd() - 0.5);
    const s1 = order[0], s2 = order[1];
    const split = 0.55 + rnd() * 0.3;
    const stats = {
      atk: Math.max(0, atk),
      hp: Math.max(0, hp),
      def: Math.max(0, def),
      crit: 0, mastery: 0, vers: 0, speed: 0,
    };
    stats[s1] = Math.max(1, Math.round(secBudget * split));
    stats[s2] = Math.max(0, secBudget - stats[s1]);
    if (slotId === 'weapon') stats.atk = Math.max(stats.atk, Math.round(budget * 0.4));
    if (slotId === 'trinket') {
      // trinkets lean secondary
      stats.atk = Math.round(stats.atk * 0.7);
      stats.hp = Math.round(stats.hp * 0.6);
    }

    const icons = GEAR_ICONS[slotId] || ['📦'];
    const icon = icons[Math.floor(rnd() * icons.length)];
    const roleBias = opts.role || 'any';
    if (roleBias === 'tank') {
      stats.hp = Math.round(stats.hp * 1.15);
      stats.def = Math.round(stats.def * 1.2);
      stats.atk = Math.round(stats.atk * 0.85);
    } else if (roleBias === 'healer') {
      stats.mastery += 1;
      stats.vers += 1;
      stats.atk = Math.round(stats.atk * 0.75);
    } else if (roleBias === 'dps') {
      stats.atk = Math.round(stats.atk * 1.12);
      stats.crit += 1;
    }

    const name = `${prefix.name} ${slot.name.toLowerCase()} ${suffix.name}`;
    return {
      uid: gearUid(),
      slot: slotId,
      name,
      icon,
      ilvl: Math.max(1, ilvl),
      rarity,
      role: roleBias,
      stats,
      prefixId: prefix.id,
      suffixId: suffix.id,
      seed,
    };
  }

  function formatGearStats(it) {
    if (!it?.stats) return '';
    const s = it.stats;
    const parts = [];
    if (s.atk) parts.push(`+${s.atk} атака`);
    if (s.hp) parts.push(`+${s.hp} здоровье`);
    if (s.def) parts.push(`+${s.def} защита`);
    if (s.crit) parts.push(`+${s.crit} крит`);
    if (s.mastery) parts.push(`+${s.mastery} иск.`);
    if (s.vers) parts.push(`+${s.vers} унив.`);
    if (s.speed) parts.push(`+${s.speed} скор.`);
    return parts.join(' · ');
  }
  function rarityLabel(r) {
    return ({ common: 'обычный', uncommon: 'необычный', rare: 'редкий', epic: 'эпический' })[r] || r || '';
  }
  function gearScore(it) {
    if (!it?.stats) return 0;
    const s = it.stats;
    return (s.atk || 0) * 3 + (s.hp || 0) * 0.15 + (s.def || 0) * 2
      + (s.crit || 0) * 2 + (s.mastery || 0) * 2 + (s.vers || 0) * 2 + (s.speed || 0) * 4
      + (it.ilvl || 0);
  }
  function avgIlvl(gear) {
    const g = normalizeGear(gear);
    const items = GEAR_SLOT_IDS.map(s => g.equipped[s]).filter(Boolean);
    if (!items.length) return 0;
    return Math.round(items.reduce((a, it) => a + (it.ilvl || 0), 0) / items.length);
  }
  function sumGearStats(gear) {
    const g = normalizeGear(gear);
    const tot = { atk: 0, hp: 0, def: 0, crit: 0, mastery: 0, vers: 0, speed: 0 };
    for (const slot of GEAR_SLOT_IDS) {
      const it = g.equipped[slot];
      if (!it?.stats) continue;
      for (const k of Object.keys(tot)) tot[k] += (+it.stats[k] || 0);
    }
    return tot;
  }

  /** Apply equipped gear onto hero combat stats (from stored bases). */
  function applyGearToHero(hero) {
    if (!hero) return;
    hero.gear = normalizeGear(hero.gear);
    if (hero._baseAtk == null) {
      hero._baseAtk = hero.atk;
      hero._baseMaxHp = hero.maxHp;
      hero._baseDef = hero.def;
      hero._baseSpeed = hero.speed;
    }
    const gs = sumGearStats(hero.gear);
    // Gear ATK/DEF/HP are in "spec units"; combat uses STAT_SCALE on base already.
    // Treat gear atk/def as flat post-scale-ish: atk points * STAT_SCALE * 0.15 softness
    const atkBonus = Math.round((gs.atk || 0) * STAT_SCALE * 0.12);
    const defBonus = Math.round((gs.def || 0) * STAT_SCALE * 0.1);
    const hpBonus = Math.round((gs.hp || 0) * STAT_SCALE * 0.35);
    const ratio = hero.maxHp > 0 ? hero.hp / hero.maxHp : 1;
    hero.atk = Math.max(1, hero._baseAtk + atkBonus);
    hero.def = Math.max(0, hero._baseDef + defBonus);
    hero.maxHp = Math.max(1, hero._baseMaxHp + hpBonus);
    hero.hp = clamp(Math.round(hero.maxHp * ratio), hero.alive === false ? 0 : 1, hero.maxHp);
    hero.speed = Math.max(1, (hero._baseSpeed || hero.speed || 10) + Math.floor((gs.speed || 0) / 3));
    // secondary from gear (ratings grow; % derived in ensureSec / combat)
    hero.sec = ensureSec(hero);
    if (hero._baseSecCritRating == null) {
      hero._baseSecCritRating = Math.round(Number(hero.sec.critRating != null ? hero.sec.critRating : SEC_CRIT_RATING));
      hero._baseSecVersRating = Math.round(Number(hero.sec.versRating != null ? hero.sec.versRating : SEC_VERS_RATING));
      hero._baseSecMasteryRating = Math.round(Number(hero.sec.masteryRating != null ? hero.sec.masteryRating : SEC_MASTERY_RATING));
    }
    hero.sec.critRating = Math.max(0, Math.round(hero._baseSecCritRating + (gs.crit || 0) * GEAR_CRIT_PER_POINT));
    hero.sec.versRating = Math.max(0, Math.round(hero._baseSecVersRating + (gs.vers || 0) * GEAR_VERS_PER_POINT));
    hero.sec.masteryRating = Math.max(0, Math.round(hero._baseSecMasteryRating + (gs.mastery || 0) * GEAR_MASTERY_PER_POINT));
    // keep derived % in sync for UI/save
    hero.sec.critPct = clamp((hero.sec.critRating / SEC_CRIT_RATING) * SEC_CRIT_DEFAULT, 0, 0.75);
    hero.sec.versPct = clamp(hero.sec.versRating * SEC_VERS_PCT_PER_RATING, 0, 0.6);
    hero.ilvl = avgIlvl(hero.gear);
  }

  function equipItemOnGear(gear, item, preferReplace) {
    const g = normalizeGear(gear);
    if (!item || !GEAR_SLOT_MAP[item.slot]) return g;
    const cur = g.equipped[item.slot];
    if (cur) {
      if (preferReplace || gearScore(item) >= gearScore(cur)) {
        g.bag.push(cur);
        g.equipped[item.slot] = cloneGearItem(item);
      } else {
        g.bag.push(cloneGearItem(item));
      }
    } else {
      g.equipped[item.slot] = cloneGearItem(item);
    }
    // bag cap
    while (g.bag.length > 24) g.bag.shift();
    return g;
  }
  function unequipSlot(gear, slot) {
    const g = normalizeGear(gear);
    if (g.equipped[slot]) {
      g.bag.push(g.equipped[slot]);
      delete g.equipped[slot];
    }
    return g;
  }
  function equipFromBag(gear, bagIndex) {
    const g = normalizeGear(gear);
    if (bagIndex < 0 || bagIndex >= g.bag.length) return g;
    const item = g.bag.splice(bagIndex, 1)[0];
    return equipItemOnGear(g, item, true);
  }

  function giveItemToPartyMember(member, item, replace) {
    if (!member || !item) return;
    member.gear = equipItemOnGear(member.gear, item, replace !== false);
  }

  function partyMemberLabel(p, idx) {
    const cls = WOW_MOP.getClass(p.classId);
    const spec = WOW_MOP.getSpec(p.classId, p.specId);
    const il = avgIlvl(p.gear);
    return `${idx + 1}. ${cls?.name || p.classId} (${spec?.name || p.specId}) · ур. вещей ${il}`;
  }

  let gearModalIndex = null; // lobby party index OR run party uid
  let gearModalMode = 'lobby'; // lobby | run
  let pendingGearItem = null;
  let gearAssignCb = null;

  function openGearModalForLobby(idx) {
    gearModalMode = 'lobby';
    gearModalIndex = idx;
    renderGearModal();
    document.getElementById('gear-modal')?.classList.remove('hidden');
  }
  function openGearModalForRunHero(hero) {
    gearModalMode = 'run';
    gearModalIndex = hero?.uid;
    renderGearModal();
    document.getElementById('gear-modal')?.classList.remove('hidden');
  }
  function getGearModalTarget() {
    if (gearModalMode === 'lobby') {
      return party[gearModalIndex] || null;
    }
    if (!run) return null;
    return run.party.find(p => p.uid === gearModalIndex) || null;
  }
  function renderGearModal() {
    const target = getGearModalTarget();
    const title = document.getElementById('gear-modal-title');
    const sub = document.getElementById('gear-modal-sub');
    const eqEl = document.getElementById('gear-equipped');
    const bagEl = document.getElementById('gear-bag');
    if (!eqEl || !bagEl) return;
    if (!target) {
      if (title) title.textContent = 'Экипировка';
      eqEl.innerHTML = '';
      bagEl.innerHTML = '<div class="hint">Нет героя</div>';
      return;
    }
    const gear = normalizeGear(target.gear);
    target.gear = gear;
    const cls = WOW_MOP.getClass(target.classId);
    const spec = WOW_MOP.getSpec(target.classId, target.specId);
    if (title) title.textContent = `${cls?.name || ''} · ${spec?.name || ''}`;
    if (sub) sub.textContent = `ур. вещей ${avgIlvl(gear)} · ${formatGearStats({ stats: sumGearStats(gear) }) || 'пусто'}`;

    eqEl.innerHTML = GEAR_SLOTS.map(slot => {
      const it = gear.equipped[slot.id];
      if (!it) {
        return `<div class="gear-slot-row empty"><span class="gs-slot">${slot.name}</span><span class="gs-item">— пусто —</span></div>`;
      }
      return `<div class="gear-slot-row" data-unequip="${slot.id}">
        <span class="gs-slot">${slot.name}</span>
        <span class="gs-item"><span class="rarity-${it.rarity}">${it.icon} ${it.name}</span>
        <span class="ilvl-badge">${it.ilvl}</span><br><span style="color:var(--muted);font-size:.7rem">${formatGearStats(it)}</span></span>
      </div>`;
    }).join('');
    eqEl.querySelectorAll('[data-unequip]').forEach(row => {
      row.style.cursor = 'pointer';
      row.title = 'Снять в сумку';
      row.onclick = () => {
        const slot = row.getAttribute('data-unequip');
        target.gear = unequipSlot(target.gear, slot);
        if (gearModalMode === 'run') applyGearToHero(target);
        syncGearToLobbyIfNeeded(target);
        savePartyProfile();
        if (run) saveRun();
        renderGearModal();
        if (gearModalMode === 'lobby') renderParty();
        else { try { renderCombat?.(); } catch (_) {} updateHud(); }
      };
    });

    if (!gear.bag.length) {
      bagEl.innerHTML = '<div class="hint">Сумка пуста</div>';
    } else {
      bagEl.innerHTML = gear.bag.map((it, i) => `
        <div class="gear-bag-item" data-bag="${i}">
          <span><span class="rarity-${it.rarity}">${it.icon} ${it.name}</span>
          <span class="ilvl-badge">${it.ilvl}</span>
          <div style="color:var(--muted);font-size:.7rem">${GEAR_SLOT_MAP[it.slot]?.name || it.slot} · ${formatGearStats(it)}</div></span>
          <button class="btn btn-sm btn-ok" type="button">Надеть</button>
        </div>`).join('');
      bagEl.querySelectorAll('[data-bag]').forEach(row => {
        row.onclick = () => {
          const i = +row.getAttribute('data-bag');
          target.gear = equipFromBag(target.gear, i);
          if (gearModalMode === 'run') applyGearToHero(target);
          syncGearToLobbyIfNeeded(target);
          savePartyProfile();
          if (run) saveRun();
          renderGearModal();
          if (gearModalMode === 'lobby') renderParty();
        };
      });
    }
  }
  function syncGearToLobbyIfNeeded(hero) {
    if (!hero || gearModalMode !== 'run') return;
    // mirror gear onto lobby party entry with same class/spec index match
    const idx = (run?.party || []).findIndex(p => p.uid === hero.uid);
    if (idx >= 0 && party[idx]) {
      party[idx].gear = normalizeGear(hero.gear);
    }
  }
  function closeGearModal() {
    document.getElementById('gear-modal')?.classList.add('hidden');
    gearModalIndex = null;
  }

  function openGearAssign(item, done) {
    pendingGearItem = cloneGearItem(item);
    gearAssignCb = typeof done === 'function' ? done : null;
    const modal = document.getElementById('gear-assign-modal');
    const prev = document.getElementById('gear-assign-preview');
    const list = document.getElementById('gear-assign-heroes');
    if (!modal || !list) {
      // fallback: bag of first
      if (run?.party?.[0]) {
        run.party[0].gear = equipItemOnGear(run.party[0].gear, item, true);
        applyGearToHero(run.party[0]);
        if (party[0]) party[0].gear = normalizeGear(run.party[0].gear);
      }
      if (gearAssignCb) gearAssignCb();
      return;
    }
    if (prev) {
      prev.innerHTML = `<div class="lc-title rarity-${item.rarity}">${item.icon} ${item.name}</div>
        <div class="lc-meta">${GEAR_SLOT_MAP[item.slot]?.name || item.slot} · ур. ${item.ilvl} · ${rarityLabel(item.rarity)}</div>
        <div class="lc-stats">${formatGearStats(item)}</div>`;
    }
    const heroes = run?.party || [];
    list.innerHTML = heroes.map((h, i) => {
      const cur = normalizeGear(h.gear).equipped[item.slot];
      const better = !cur || gearScore(item) >= gearScore(cur);
      const cls = WOW_MOP.getClass(h.classId);
      return `<button type="button" class="btn assign-hero-btn ${better ? 'btn-ok' : ''}" data-hi="${i}">
        ${cls?.icon || ''} ${h.name || cls?.name} · ур. вещей ${avgIlvl(h.gear)}
        <div style="font-size:.72rem;color:var(--muted)">${cur ? `сейчас: ${cur.name} (ур. ${cur.ilvl})` : 'слот пуст'} ${better ? '· лучше' : '· слабее/в сумку'}</div>
      </button>`;
    }).join('');
    list.querySelectorAll('[data-hi]').forEach(btn => {
      btn.onclick = () => {
        const i = +btn.getAttribute('data-hi');
        const h = run.party[i];
        if (!h || !pendingGearItem) return;
        h.gear = equipItemOnGear(h.gear, pendingGearItem, true);
        applyGearToHero(h);
        if (party[i]) party[i].gear = normalizeGear(h.gear);
        savePartyProfile();
        saveRun();
        log(`Шмот → ${h.name}: ${pendingGearItem.icon} ${pendingGearItem.name}`, 'system');
        toast(`${h.name}: ${pendingGearItem.name}`);
        pendingGearItem = null;
        modal.classList.add('hidden');
        const cb = gearAssignCb; gearAssignCb = null;
        if (cb) cb();
      };
    });
    modal.classList.remove('hidden');
  }

  function openGearDraft(done) {
    const grid = document.getElementById('loot-grid');
    const modal = document.getElementById('loot-modal');
    const title = modal?.querySelector('h2');
    if (title) title.textContent = 'Добыча — шмот';
    const hint = modal?.querySelector('.hint');
    if (hint) hint.innerHTML = 'Выбери <b>1 из 3</b> предметов экипировки (или пропусти).';
    lootDoneCb = null; // gear uses own flow
    if (!grid || !modal) { if (typeof done === 'function') done(); return; }
    const keyLevel = run?.keyLevel || 5;
    const picks = [];
    const usedSlots = new Set();
    for (let n = 0; n < 3; n++) {
      let slot = GEAR_SLOT_IDS[Math.floor(Math.random() * GEAR_SLOT_IDS.length)];
      // prefer unique slots in the 3
      let guard = 0;
      while (usedSlots.has(slot) && guard++ < 8) {
        slot = GEAR_SLOT_IDS[Math.floor(Math.random() * GEAR_SLOT_IDS.length)];
      }
      usedSlots.add(slot);
      picks.push(generateGearItem({ keyLevel, slot, seed: Math.floor(Math.random() * 1e9) + n * 17 }));
    }
    grid.innerHTML = '';
    picks.forEach(item => {
      const div = document.createElement('div');
      div.className = 'loot-card';
      div.innerHTML = `<div class="lc-title rarity-${item.rarity}">${item.icon} ${item.name}</div>
        <div class="lc-meta">${GEAR_SLOT_MAP[item.slot]?.name || item.slot} · ур. <b>${item.ilvl}</b> · ${rarityLabel(item.rarity)}</div>
        <div class="lc-stats">${formatGearStats(item)}</div>`;
      div.onclick = () => {
        modal.classList.add('hidden');
        openGearAssign(item, typeof done === 'function' ? done : null);
      };
      grid.appendChild(div);
    });
    // rewire skip for this open
    const skip = document.getElementById('loot-skip');
    if (skip) {
      skip.onclick = () => {
        modal.classList.add('hidden');
        if (typeof done === 'function') done();
      };
    }
    modal.classList.remove('hidden');
  }
