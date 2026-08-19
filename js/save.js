/* save: localStorage, export/import, history */
  function serializeRun() {
    if (!run || run.finished) return null;
    return {
      saveVersion: 2,
      dungeonId: run.dungeon.id,
      keyLevel: run.keyLevel,
      roomIndex: run.roomIndex,
      route: run.route ? {
        currentId: run.route.currentId,
        visited: (run.route.visited || []).slice(),
        finalCleared: !!run.route.finalCleared,
        mopupMode: !!run.route.mopupMode,
        nodes: run.route.nodes,
      } : null,
      timerLeft: run.timerLeft,
      timerMax: run.timerMax,
      deaths: run.deaths,
      forces: run.forces,
      talents: run.talents,
      restBuffBattles: run.restBuffBattles,
      loot: run.loot || [],
      logs: run.logs.slice(0, 20),
      partyBuild: party.map(p => {
        ensureSec(p);
        return {
          classId: p.classId, specId: p.specId, sec: { ...p.sec }, gear: normalizeGear(p.gear),
          abilityOrder: Array.isArray(p.abilityOrder) ? p.abilityOrder.slice() : undefined,
        };
      }),
      party: run.party.map(p => ({
        classId: p.classId, specId: p.specId, hp: p.hp, maxHp: p.maxHp, atk: p.atk, def: p.def, speed: p.speed,
        alive: p.alive, res: p.res, shield: p.shield, sec: p.sec ? { ...p.sec } : defaultSec(),
        gear: normalizeGear(p.gear),
        abilityOrder: Array.isArray(p.abilityOrder) ? p.abilityOrder.slice() : undefined,
        _baseAtk: p._baseAtk, _baseMaxHp: p._baseMaxHp, _baseDef: p._baseDef, _baseSpeed: p._baseSpeed,
        _baseSecCritRating: p._baseSecCritRating, _baseSecVersRating: p._baseSecVersRating,
        _baseSecMasteryRating: p._baseSecMasteryRating,
      })),
      raid: !!run.raid,
      raidDiff: run.raid ? (run.raidDiff === 'heroic' ? 'heroic' : 'normal') : null,
      _roomArt: run._roomArt || {},
    };
  }
  function saveRun() {
    try {
      const data = serializeRun();
      if (data) localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (_) { /* ignore */ }
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (_) {} }
  function hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (_) { return false; }
  }

  /** Full profile blob: run + party lobby + history + best key. For file export/import. */
  const PROFILE_KEY = 'mythicKeyProfile_v1';
  const SAVE_FILE_VERSION = 2;

  function savePartyProfile() {
    try {
      const payload = {
        party: (party || []).map(p => {
          ensureSec(p);
          return {
            classId: p.classId, specId: p.specId, sec: { ...p.sec }, gear: normalizeGear(p.gear),
            abilityOrder: Array.isArray(p.abilityOrder) ? p.abilityOrder.slice() : undefined,
          };
        }),
        dungeonId: document.getElementById('dungeon-select')?.value || null,
        keyLevel: document.getElementById('key-level')?.value || null,
        gameMode: (typeof gameMode === 'string' ? gameMode : 'key'),
        raidDiff: (typeof getRaidDiff === 'function' ? getRaidDiff() : 'normal'),
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(payload));
    } catch (_) { /* ignore */ }
  }

  function loadPartyProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) { return null; }
  }

  function applyPartyProfile(data) {
    if (!data || !Array.isArray(data.party)) return false;
    party = data.party.map(x => {
      const e = { classId: x.classId, specId: x.specId, sec: x.sec ? { ...x.sec } : defaultSec(), gear: normalizeGear(x.gear) };
      if (Array.isArray(x.abilityOrder) && x.abilityOrder.length) e.abilityOrder = x.abilityOrder.slice();
      ensureSec(e);
      return e;
    }).filter(e => !WOW_MOP || !WOW_MOP.getSpec || WOW_MOP.getSpec(e.classId, e.specId));
    try {
      if (data.dungeonId && document.getElementById('dungeon-select')) {
        const ds = document.getElementById('dungeon-select');
        if ([...ds.options].some(o => o.value === data.dungeonId)) ds.value = data.dungeonId;
      }
      if (data.keyLevel && document.getElementById('key-level')) {
        document.getElementById('key-level').value = String(data.keyLevel);
      }
      if ((data.gameMode === 'raid' || (data.party && data.party.length > 5)) && typeof setGameMode === 'function') {
        setGameMode('raid');
      }
      if (data.raidDiff && typeof setRaidDiff === 'function') setRaidDiff(data.raidDiff);
    } catch (_) {}
    return true;
  }

  function collectFullSave() {
    // Keep profile in sync
    savePartyProfile();
    let runData = null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) runData = JSON.parse(raw);
    } catch (_) { runData = null; }
    // Prefer live serialize if mid-run
    if (run && !run.finished) {
      const live = serializeRun();
      if (live) runData = live;
    }
    let best = 0;
    try { best = +(localStorage.getItem('mythicKeyBest') || 0); } catch (_) {}
    const profile = loadPartyProfile() || {
      party: (party || []).map(p => {
        ensureSec(p);
        return { classId: p.classId, specId: p.specId, sec: { ...p.sec }, gear: normalizeGear(p.gear) };
      }),
    };
    return {
      type: 'mythic-key-save',
      saveFileVersion: SAVE_FILE_VERSION,
      exportedAt: new Date().toISOString(),
      game: 'mythic-key-mop',
      run: runData,
      profile,
      history: loadHistory(),
      bestKey: best,
    };
  }

  function applyFullSave(data) {
    if (!data || data.type !== 'mythic-key-save') {
      throw new Error('Неверный файл сейва');
    }
    // History
    if (Array.isArray(data.history)) {
      try { localStorage.setItem(HIST_KEY, JSON.stringify(data.history.slice(0, 8))); } catch (_) {}
    }
    // Best
    if (typeof data.bestKey === 'number' && data.bestKey >= 0) {
      try { localStorage.setItem('mythicKeyBest', String(data.bestKey)); } catch (_) {}
    }
    // Profile / party
    if (data.profile) {
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile)); } catch (_) {}
      applyPartyProfile(data.profile);
    }
    // Active run
    if (data.run) {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(data.run)); } catch (_) {}
    } else {
      clearSave();
    }
    // Refresh lobby UI
    try {
      renderParty();
      refreshAffixes();
      refreshKeystone();
      renderHistory();
      const cont = document.getElementById('btn-continue');
      if (cont) cont.classList.toggle('hidden', !hasSave());
    } catch (_) {}
    return true;
  }

  function exportSaveFile() {
    try {
      const blob = collectFullSave();
      const json = JSON.stringify(blob, null, 2);
      const name = 'mythic-key-save-' + new Date().toISOString().slice(0, 10) + '.json';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      toast('Сейв скачан: ' + name);
    } catch (e) {
      console.error(e);
      toast('Не удалось экспортировать');
    }
  }

  function importSaveFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || ''));
        applyFullSave(data);
        toast(data.run ? 'Импорт: отряд + активный ключ' : 'Импорт: отряд и история');
      } catch (e) {
        console.error(e);
        toast('Файл сейва повреждён или не подходит');
      }
    };
    reader.onerror = () => toast('Не удалось прочитать файл');
    reader.readAsText(file);
  }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch (_) { return []; }
  }
  function pushHistory(entry) {
    const h = loadHistory();
    h.unshift(entry);
    while (h.length > 8) h.pop();
    try { localStorage.setItem(HIST_KEY, JSON.stringify(h)); } catch (_) {}
    renderHistory();
  }
  function renderHistory() {
    const el = document.getElementById('run-history');
    if (!el) return;
    const h = loadHistory();
    if (!h.length) { el.textContent = 'История ключей пуста.'; return; }
    el.innerHTML = h.map(x =>
      `<div>+${x.key} ${x.dungeon} · ${x.score} · 💀${x.deaths}${x.win ? ' ✓' : ' ✗'}</div>`
    ).join('');
  }
