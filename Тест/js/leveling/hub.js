/* Таверна: герой, дерево, короткий инст 3 треша → элита → страж → финал. Ключ 5 не серый. */
(function (G) {
  var DUNGEON_BRACKETS = [
    { id: 'crypts', min: 1, max: 12 },
    { id: 'forge', min: 8, max: 20 },
    { id: 'tide', min: 16, max: 28 },
    { id: 'jade', min: 24, max: 36 },
    { id: 'ember', min: 32, max: 40 },
  ];

  function $(id) { return document.getElementById(id); }
  function hero() { return typeof G.igorHeroGetActive === 'function' ? G.igorHeroGetActive() : null; }
  function fmtN(n) { return typeof fmt === 'function' ? fmt(n) : String(Math.round(n || 0)); }
  function toastMsg(m) { try { if (typeof toast === 'function') toast(m); } catch (_) {} }

  function injectCss() {
    if ($('igor-hero-css')) return;
    var s = document.createElement('style');
    s.id = 'igor-hero-css';
    s.textContent = [
      '#tavern-hub{position:fixed;inset:0;z-index:35;overflow:auto;padding:1rem 1.1rem 2rem;',
      'background:#08090c url("assets/backgrounds/lobby-tavern.jpg") center/cover no-repeat;}',
      '#tavern-hub::before{content:"";position:fixed;inset:0;background:rgba(8,9,12,.72);pointer-events:none;}',
      '#tavern-hub .tv-inner{position:relative;z-index:1;max-width:980px;margin:0 auto;}',
      '#tavern-hub .tv-head{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-bottom:.8rem;}',
      '#tavern-hub h1{font-family:var(--font-display);font-size:1.6rem;margin:0}',
      '#tavern-hub .tv-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:.7rem;}',
      '@media(max-width:820px){#tavern-hub .tv-grid{grid-template-columns:1fr}}',
      '#tavern-hub .tv-card{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:.8rem;}',
      '#tavern-hub .tv-sheet{display:grid;grid-template-columns:repeat(3,1fr);gap:.35rem;margin:.5rem 0;font-size:.85rem;}',
      '#tavern-hub .tv-sheet b{display:block;color:var(--gold-bright)}',
      '#tavern-hub .xp-bar{height:8px;background:#1c2230;border-radius:99px;overflow:hidden;}',
      '#tavern-hub .xp-bar i{display:block;height:100%;background:linear-gradient(90deg,#c8d0da,#f0c14b);}',
      '#tavern-hub .tv-create-grid,#tavern-hub .tv-spec-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:.4rem;}',
      '#tavern-hub .tv-pick{border:1px solid var(--border);background:var(--panel2);border-radius:10px;padding:.45rem;color:var(--text);text-align:center;}',
      '#tavern-hub .tv-pick.on{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold);}',
      '#tavern-hub .tv-pick img{width:64px;height:64px;object-fit:cover;border-radius:8px;}',
      '#tavern-hub .tier{margin:.55rem 0;}',
      '#tavern-hub .tier-picks{display:grid;grid-template-columns:1fr;gap:.3rem;}',
      '#tavern-hub .tal{text-align:left;border:1px solid var(--border);background:#141824;color:var(--text);border-radius:8px;padding:.45rem .55rem;}',
      '#tavern-hub .tal.on{border-color:#f0c14b;background:#1c2214;}',
      '#tavern-hub .tal.locked{opacity:.45;}',
      '#tavern-hub .tal .td{font-size:.75rem;color:var(--muted);}',
      '#tavern-hub .skill-chip{display:inline-block;margin:.15rem .15rem 0 0;padding:.12rem .35rem;border-radius:99px;font-size:.72rem;border:1px solid var(--border);}',
      '#tavern-hub .skill-chip.lock{opacity:.45;}',
      '#igor-hero-plaque{font-size:.8rem;}',
      '#tv-queue-ov{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;}',
      '#tv-queue-ov .modal{max-width:360px;}',
    ].join('');
    document.head.appendChild(s);
  }

  function ensureOverlay() {
    if ($('tavern-hub')) return;
    var el = document.createElement('div');
    el.id = 'tavern-hub';
    el.className = 'screen hidden';
    el.innerHTML = '<div class="tv-inner" id="tv-inner"></div>';
    document.body.appendChild(el);
  }

  function hideHub() {
    var el = $('tavern-hub');
    if (el) el.classList.add('hidden');
  }

  function showHub() {
    ensureOverlay();
    injectCss();
    var el = $('tavern-hub');
    if (el) el.classList.remove('hidden');
    var lobby = $('lobby');
    if (lobby) lobby.classList.add('hidden');
    renderHub();
  }

  function backLobby() {
    hideHub();
    var lobby = $('lobby');
    if (lobby) lobby.classList.remove('hidden');
    paintPlaque();
  }

  function specObj(classId, specId) {
    return (typeof WOW_MOP !== 'undefined' && WOW_MOP.getSpec) ? WOW_MOP.getSpec(classId, specId) : null;
  }
  function classObj(classId) {
    return (typeof WOW_MOP !== 'undefined' && WOW_MOP.getClass) ? WOW_MOP.getClass(classId) : null;
  }

  function patchedClasses() {
    if (typeof WOW_MOP === 'undefined') return [];
    return (WOW_MOP.classes || []).filter(function (c) {
      if (!c || c.id === 'cheat') return false;
      return typeof isClassPatched !== 'function' || isClassPatched(c.id);
    });
  }

  function art(classId, specId) {
    try {
      if (specId && typeof ASSETS !== 'undefined') return ASSETS.specP(classId, specId);
      if (typeof ASSETS !== 'undefined') return ASSETS.classP(classId);
    } catch (_) {}
    return '';
  }

  var pickClassId = null;
  var pickSpecId = null;

  function renderCreate() {
    var inner = $('tv-inner');
    var classes = patchedClasses();
    var clsHtml = classes.map(function (c) {
      return '<button type="button" class="tv-pick' + (pickClassId === c.id ? ' on' : '') + '" data-cid="' + c.id + '">' +
        '<img alt="" src="' + art(c.id) + '" />' +
        '<div>' + (c.icon || '') + ' ' + c.name + '</div></button>';
    }).join('');
    var specs = [];
    if (pickClassId) {
      var c = classObj(pickClassId);
      specs = (c && c.specs || []).filter(function (s) {
        return typeof isSpecPatched !== 'function' || isSpecPatched(pickClassId, s.id);
      });
    }
    var specHtml = specs.map(function (s) {
      var role = (typeof ROLE_LABEL !== 'undefined' && ROLE_LABEL[s.role]) ? ROLE_LABEL[s.role] : s.role;
      return '<button type="button" class="tv-pick' + (pickSpecId === s.id ? ' on' : '') + '" data-sid="' + s.id + '">' +
        '<img alt="" src="' + art(pickClassId, s.id) + '" />' +
        '<div>' + (s.icon || '') + ' ' + s.name + '</div>' +
        '<div style="font-size:.72rem;color:var(--muted)">' + role + '</div></button>';
    }).join('');
    inner.innerHTML =
      '<div class="tv-head"><button class="btn" type="button" id="tv-back">← В лобби</button>' +
      '<h1>Таверна</h1><span class="keys-hint">Один герой. Ключ 5 и рейд остаются открыты.</span></div>' +
      '<div class="tv-card"><div class="section-title">Создать героя</div>' +
      '<p class="keys-hint">Спек при создании. Переспек = новый герой. Изобретатель — общее дерево, не своё.</p>' +
      '<label>Имя</label><input id="tv-name" maxlength="18" placeholder="Имя" style="width:100%;margin:.35rem 0 .6rem;padding:.4rem;border-radius:8px;border:1px solid var(--border);background:#101218;color:var(--text)" />' +
      '<div class="section-title">Класс</div><div class="tv-create-grid" id="tv-classes">' + clsHtml + '</div>' +
      '<div class="section-title" style="margin-top:.6rem">Специализация</div><div class="tv-spec-grid" id="tv-specs">' + (specHtml || '<span class="keys-hint">Сначала класс</span>') + '</div>' +
      '<button class="btn btn-primary" type="button" id="tv-create" style="margin-top:.7rem;width:100%" ' + (pickClassId && pickSpecId ? '' : 'disabled') + '>Создать</button></div>';
    $('tv-back').onclick = backLobby;
    inner.querySelectorAll('[data-cid]').forEach(function (b) {
      b.onclick = function () { pickClassId = b.getAttribute('data-cid'); pickSpecId = null; renderCreate(); };
    });
    inner.querySelectorAll('[data-sid]').forEach(function (b) {
      b.onclick = function () { pickSpecId = b.getAttribute('data-sid'); renderCreate(); };
    });
    $('tv-create').onclick = function () {
      if (!pickClassId || !pickSpecId) return;
      var name = ($('tv-name').value || '').trim();
      var h = G.igorHeroCreate({ name: name || classObj(pickClassId).name, classId: pickClassId, specId: pickSpecId });
      if (!h) { toastMsg('Не удалось создать'); return; }
      toastMsg(h.name + ' · ур. 1');
      renderHub();
      paintPlaque();
    };
  }

  function sheetNums(h) {
    var spec = specObj(h.classId, h.specId);
    var share = typeof G.igorHeroLevelShare === 'function' ? G.igorHeroLevelShare(h.level) : 1;
    var scale = typeof STAT_SCALE === 'number' ? STAT_SCALE : 1000;
    var st = spec && spec.stats ? spec.stats : { hp: 100, atk: 15, def: 5, speed: 10 };
    var hp = Math.round(st.hp * share * scale);
    var atk = Math.round(st.atk * share * scale);
    var def = Math.round(st.def * share * scale);
    var speed = st.speed || 10;
    var ids = h.talents || {};
    var vals = Object.keys(ids).map(function (k) { return ids[k]; });
    function has(id) { return vals.indexOf(id) >= 0; }
    if (has('speed_of_light') || has('gen_swift')) speed += 2;
    if (has('oathbound') || has('gen_vital')) { hp = Math.round(hp * 1.12); def = Math.round(def * 1.08); }
    if (has('blade_justice') || has('gen_edge')) atk = Math.round(atk * 1.12);
    if (has('gen_skin')) hp = Math.round(hp * 1.08);
    if (has('gen_focus')) atk = Math.round(atk * 1.08);
    if (has('gen_ward')) def = Math.round(def * 1.10);
    if (has('gen_grip')) { hp = Math.round(hp * 1.06); atk = Math.round(atk * 1.04); }
    return { hp: hp, atk: atk, def: def, speed: speed, spec: spec };
  }

  function renderTalents(h) {
    var tiers = typeof G.igorHeroTalentTiers === 'function' ? G.igorHeroTalentTiers(h.classId) : [];
    return tiers.map(function (tier) {
      var picks = G.igorHeroTalentPicks(h.classId, h.specId, tier);
      var chosen = h.talents && h.talents[tier.id];
      var open = h.level >= tier.level;
      return '<div class="tier"><div style="display:flex;justify-content:space-between;gap:.4rem">' +
        '<span class="section-title" style="margin:0">Ярус · ур. ' + tier.level + ' · ' + tier.title + '</span>' +
        '<span style="font-size:.72rem;color:var(--muted)">' + (open ? (chosen ? 'выбран' : 'выбери один') : 'закрыт') + '</span></div>' +
        '<div class="tier-picks">' + picks.map(function (p) {
          var on = chosen === p.id;
          var dis = !open || !!chosen;
          return '<button type="button" class="tal' + (on ? ' on' : '') + (!open ? ' locked' : '') + '"' +
            ' data-tier="' + tier.id + '" data-tid="' + p.id + '" ' + (dis ? 'disabled' : '') + '>' +
            '<div>' + p.icon + ' ' + p.name + '</div><div class="td">' + p.desc + '</div></button>';
        }).join('') + '</div></div>';
    }).join('');
  }

  function renderSkills(h) {
    var spec = specObj(h.classId, h.specId);
    if (!spec) return '';
    var abs = (spec.abilities || []).slice();
    return abs.map(function (a) {
      var need = typeof G.igorHeroAbilityUnlockLevel === 'function'
        ? G.igorHeroAbilityUnlockLevel(h.classId, h.specId, a) : 1;
      var have = h.level >= need;
      return '<span class="skill-chip' + (have ? '' : ' lock') + '" title="' + (a.desc || a.name) + '">' +
        (a.icon || '') + ' ' + a.name + (have ? '' : ' · ' + need) + '</span>';
    }).join('');
  }

  function renderHero(h) {
    var inner = $('tv-inner');
    var s = sheetNums(h);
    var cls = classObj(h.classId);
    var max = G.IGOR_MAX_LEVEL || 40;
    var need = h.level >= max ? 0 : (typeof G.igorHeroXpToNext === 'function' ? G.igorHeroXpToNext(h.level) : 1);
    var pct = need ? Math.max(0, Math.min(100, h.xp / need * 100)) : 100;
    var role = s.spec ? ((typeof ROLE_LABEL !== 'undefined' && ROLE_LABEL[s.spec.role]) || s.spec.role) : '';
    inner.innerHTML =
      '<div class="tv-head"><button class="btn" type="button" id="tv-back">← В лобби</button>' +
      '<h1>Таверна</h1>' +
      '<span class="week-badge">ур. ' + h.level + (h.level >= 40 ? ' · потолок кита' : '') + '</span></div>' +
      '<div class="tv-grid">' +
      '<div class="tv-card">' +
      '<div style="display:flex;gap:.7rem;align-items:center"><img alt="" src="' + art(h.classId, h.specId) + '" style="width:72px;height:72px;border-radius:10px;object-fit:cover" />' +
      '<div><div style="font-family:var(--font-display);font-size:1.15rem">' + h.name + '</div>' +
      '<div>' + (cls ? cls.name : h.classId) + ' · ' + (s.spec ? s.spec.name : h.specId) + ' · ' + role + '</div>' +
      '<div class="keys-hint">ур. ' + h.level + ' / 40</div></div></div>' +
      '<div class="xp-bar" style="margin-top:.5rem"><i style="width:' + pct + '%"></i></div>' +
      '<div class="keys-hint">' + (h.level >= 40 ? 'опыт не растёт' : (h.xp + ' / ' + need + ' опыта')) + '</div>' +
      '<div class="tv-sheet">' +
      '<div>Здоровье<b>' + fmtN(s.hp) + '</b></div>' +
      '<div>Атака<b>' + fmtN(s.atk) + '</b></div>' +
      '<div>Защита<b>' + fmtN(s.def) + '</b></div>' +
      '<div>Скорость<b>' + s.speed + '</b></div>' +
      '<div>Инсты<b>' + (h.stats.instances || 0) + '</b></div>' +
      '<div>Вайпы<b>' + (h.stats.wipes || 0) + '</b></div></div>' +
      '<div class="section-title">Кнопки</div><div>' + renderSkills(h) + '</div>' +
      '<p class="keys-hint" style="margin-top:.55rem">Короткий инст: 3 пака → элита → страж → финал. Без привала. Союзники ходят сами.</p>' +
      '<button class="btn btn-primary" type="button" id="tv-queue-btn" style="width:100%;margin-top:.5rem">Встать в очередь</button>' +
      '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.45rem">' +
      '<button class="btn btn-sm" type="button" id="tv-reset-tal">Сброс дерева</button>' +
      '<button class="btn btn-sm" type="button" id="tv-wipe-hero">Сброс героя</button></div>' +
      '</div>' +
      '<div class="tv-card"><div class="section-title">Дерево · один из трёх</div>' +
      (h.classId === 'engineer' && h.specId === 'tinkerer'
        ? '<p class="keys-hint">Изобретатель: общее дерево, не отдельная ветка.</p>' : '') +
      '<div id="tv-tree">' + renderTalents(h) + '</div></div></div>';
    $('tv-back').onclick = backLobby;
    $('tv-queue-btn').onclick = function () { startQueue(h); };
    $('tv-reset-tal').onclick = function () {
      if (!confirm('Сбросить таланты? Уровень останется.')) return;
      G.igorHeroResetTalents(h);
      toastMsg('Дерево сброшено');
      renderHub();
    };
    $('tv-wipe-hero').onclick = function () {
      if (!confirm('Удалить героя? Ключ и шмот не трогаем.')) return;
      G.igorHeroDeleteActive();
      pickClassId = pickSpecId = null;
      toastMsg('Герой сброшен');
      renderHub();
      paintPlaque();
    };
    inner.querySelectorAll('.tal[data-tid]').forEach(function (btn) {
      if (btn.disabled) return;
      btn.onclick = function () {
        var rec = hero();
        if (!rec) return;
        rec.talents = rec.talents || G.igorHeroBlankTalents();
        rec.talents[btn.getAttribute('data-tier')] = btn.getAttribute('data-tid');
        G.igorHeroPut(rec);
        toastMsg(btn.textContent.trim().split('\n')[0]);
        renderHub();
      };
    });
  }

  function renderHub() {
    ensureOverlay();
    injectCss();
    var h = hero();
    if (!h) renderCreate();
    else renderHero(h);
  }

  function eligibleDungeons(lv) {
    var ids = DUNGEON_BRACKETS.filter(function (d) {
      return lv >= d.min && lv <= d.max;
    });
    if (!ids.length) {
      ids = DUNGEON_BRACKETS.filter(function (d) { return lv >= d.min - 2 && lv <= d.max + 2; });
    }
    if (!ids.length || lv >= 40) ids = DUNGEON_BRACKETS.slice();
    var all = typeof DUNGEONS !== 'undefined' ? DUNGEONS : [];
    return ids.map(function (b) {
      return all.find(function (d) { return d.id === b.id; });
    }).filter(Boolean);
  }

  function generateTavernRoute(dungeon) {
    var L = dungeon.pathLabels || {};
    var nodes = {
      start: { id: 'start', type: 'trash', pack: 'aoe', name: 'Вход', loc: 'entrance', next: ['hall'], forceBudget: 10 },
      hall: { id: 'hall', type: 'trash', pack: 'aoe', name: 'Коридор', loc: 'corridor', next: ['fork1a'], forceBudget: 10 },
      fork1a: { id: 'fork1a', type: 'trash', pack: 'aoe', name: L.a || 'Зал', loc: 'gallery', next: ['approach'], forceBudget: 10 },
      approach: { id: 'approach', type: 'elite', pack: 'st', name: (L.b || 'Элита') + ' · элита', loc: 'elite', next: ['mid'], forceBudget: 18 },
      mid: { id: 'mid', type: 'boss', name: dungeon.midName || 'Страж', loc: 'mid', next: ['final'], forceBudget: 0 },
      final: { id: 'final', type: 'final', name: dungeon.finalName || 'Финал', loc: 'throne', next: [], forceBudget: 0 },
    };
    return { nodes: nodes, currentId: 'start', visited: [], finalCleared: false, mopupMode: false, seedMeta: { layout: 'tavern-v1' } };
  }

  function shuffle(a) {
    var x = a.slice();
    for (var i = x.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = x[i]; x[i] = x[j]; x[j] = t;
    }
    return x;
  }

  function rollParty(h) {
    var spec = specObj(h.classId, h.specId);
    var role = spec ? spec.role : 'dps';
    var need = { tank: role === 'tank' ? 0 : 1, healer: role === 'healer' ? 0 : 1, dps: role === 'dps' ? 2 : 3 };
    var used = {};
    used[h.classId + ':' + h.specId] = true;
    var roster = [];
    patchedClasses().forEach(function (c) {
      (c.specs || []).forEach(function (s) {
        if (typeof isSpecPatched === 'function' && !isSpecPatched(c.id, s.id)) return;
        roster.push({ classId: c.id, specId: s.id, role: s.role });
      });
    });
    var out = [{ classId: h.classId, specId: h.specId, isHero: true }];
    ['tank', 'healer', 'dps'].forEach(function (r) {
      var pool = shuffle(roster.filter(function (x) { return x.role === r && !used[x.classId + ':' + x.specId]; }));
      if (pool.length < need[r]) pool = shuffle(roster.filter(function (x) { return x.role === r; }));
      for (var i = 0; i < need[r]; i++) {
        var pick = pool[i % Math.max(1, pool.length)];
        if (!pick) continue;
        used[pick.classId + ':' + pick.specId] = true;
        out.push({ classId: pick.classId, specId: pick.specId, isHero: false });
      }
    });
    return out;
  }

  function startQueue(h) {
    var list = eligibleDungeons(h.level);
    if (!list.length) { toastMsg('Нет доступного инста'); return; }
    var d = list[Math.floor(Math.random() * list.length)];
    var ov = document.createElement('div');
    ov.id = 'tv-queue-ov';
    ov.innerHTML = '<div class="modal"><h2>Поиск инста</h2><p class="hint" id="tv-q-msg">Ищем состав…</p></div>';
    document.body.appendChild(ov);
    var steps = ['танк', 'целитель', 'бойцы'];
    var n = 0;
    var t = setInterval(function () {
      n++;
      var msg = $('tv-q-msg');
      if (msg) msg.textContent = 'Нашли: ' + steps.slice(0, n).join(' · ');
      if (n >= 3) {
        clearInterval(t);
        setTimeout(function () {
          ov.remove();
          beginTavern(h, d);
        }, 350);
      }
    }, 420);
  }

  function beginTavern(h, dungeon) {
    if (typeof createHero !== 'function' || typeof beginRunScreen !== 'function') {
      toastMsg('Бой ещё не готов');
      return;
    }
    var build = rollParty(h);
    var units = [];
    G._igorHeroBindUsed = true;
    build.forEach(function (p) {
      G._igorCreateHeroOpts = { scaleLevel: h.level, noGear: true, isHero: !!p.isHero };
      var u = createHero(p.classId, p.specId, 2, null, null);
      if (p.isHero) {
        u._isHero = true;
        u._heroLevel = h.level;
        u.name = h.name;
        u.fullName = h.name + ' · ' + (u.className || '') + ' (' + (u.specName || '') + ')';
      } else {
        u._isHero = false;
        u._heroLevel = h.level;
      }
      units.push(u);
    });
    G._igorCreateHeroOpts = null;
    if (typeof assignPartyUniqueNames === 'function') assignPartyUniqueNames(units);
    var me = units.find(function (u) { return u._isHero; }) || units[0];
    if (me) {
      me.name = h.name;
      me.fullName = h.name + ' · ' + (me.className || '') + ' (' + (me.specName || '') + ')';
    }
    run = {
      dungeon: dungeon, keyLevel: 2, affixes: [], roomIndex: 0, talents: [], deaths: 0,
      timerMax: 25 * 60, timerLeft: 25 * 60, logs: [], restBuffBattles: 0, finished: false,
      forces: 0, loot: [], raid: false, tavern: true, heroLevel: h.level,
      route: generateTavernRoute(dungeon), party: units, _heroXpEarned: 0, _roomArt: {},
    };
    try { raidAutoAllies = true; raidPlayerUid = me ? me.uid : null; } catch (_) {}
    hideHub();
    beginRunScreen();
    try { applyDungeonTheme(); } catch (_) {}
    try {
      log('Инст прокачки · ' + dungeon.name + ' · 3 пака → элита → страж → финал. Без аффиксов ключа.', 'system');
      log('Ты ходишь только своим героем. Союзники — ИИ на этот заход.', 'system');
    } catch (_) {}
    try { updateHud(); } catch (_) {}
    enterRoom();
  }

  function paintPlaque() {
    var el = $('igor-hero-plaque');
    if (!el) return;
    var h = hero();
    if (!h) {
      el.textContent = 'Герой не создан. Ключ 5 и рейд играют как раньше.';
      return;
    }
    var cls = classObj(h.classId);
    var spec = specObj(h.classId, h.specId);
    var need = h.level >= 40 ? 0 : (typeof G.igorHeroXpToNext === 'function' ? G.igorHeroXpToNext(h.level) : 0);
    el.textContent = h.name + ' · ' + (cls ? cls.name : h.classId) + ' (' + (spec ? spec.name : h.specId) + ') · ур. ' +
      h.level + (need ? (' · ' + h.xp + '/' + need + ' опыта') : ' · потолок');
  }

  function injectLobbyButton() {
    if ($('btn-tavern')) { bindLobby(); paintPlaque(); return; }
    var start = $('btn-start');
    if (!start || !start.parentNode) return;
    var wrap = document.createElement('div');
    wrap.id = 'igor-hero-lobby-slot';
    wrap.style.marginTop = '.45rem';
    wrap.innerHTML = '<button class="btn" type="button" id="btn-tavern" style="width:100%;padding:.65rem">Таверна</button>' +
      '<div id="igor-hero-plaque" class="keys-hint" style="margin-top:.35rem"></div>';
    start.insertAdjacentElement('afterend', wrap);
    bindLobby();
    paintPlaque();
  }

  function bindLobby() {
    var b = $('btn-tavern');
    if (!b || b._igorBound) return;
    b._igorBound = true;
    b.addEventListener('click', function () { showHub(); });
  }

  function wrap(name, factory) {
    var prev = G[name];
    if (typeof prev !== 'function') return false;
    var next = factory(prev);
    G[name] = next;
    try { eval(name + ' = next'); } catch (_) {}
    return true;
  }

  function settleXp(win) {
    if (!run || run._heroXpSettled) return;
    if (typeof G.igorHeroGetActive !== 'function') return;
    var rec = G.igorHeroGetActive();
    if (!rec) return;
    run._heroXpSettled = true;
    var amt = run._heroXpEarned || 0;
    if (win) {
      var bonus = typeof G.igorHeroClearXp === 'function' ? G.igorHeroClearXp(rec.level) : 0;
      if (run.dungeon && run.dungeon.id && !(rec.firstClears && rec.firstClears[run.dungeon.id])) {
        bonus = Math.round(bonus * 1.4);
        rec.firstClears = rec.firstClears || {};
        rec.firstClears[run.dungeon.id] = true;
      }
      amt += bonus;
      rec.stats = rec.stats || {};
      rec.stats.instances = (rec.stats.instances || 0) + 1;
      G.igorHeroPut(rec);
    } else {
      amt = Math.round(amt * 0.2);
      rec.stats = rec.stats || {};
      rec.stats.wipes = (rec.stats.wipes || 0) + 1;
      G.igorHeroPut(rec);
    }
    run._heroXpGranted = amt;
    if (typeof G.igorHeroGainXp === 'function' && amt) {
      var r = G.igorHeroGainXp(amt, win ? (run.tavern ? 'инст' : 'ключ') : 'вайп');
      if (r && r.dings && r.dings.length) toastMsg('Уровень ' + r.dings[r.dings.length - 1]);
    }
  }

  function installCombatWraps() {
    if (G._igorHeroHubHooked) return typeof endRun === 'function';
    if (typeof endRun !== 'function') return false;

    wrap('endRun', function (orig) {
      return function (win, msg) {
        var tavern = !!(run && run.tavern);
        if (run && !run.finished) settleXp(win);
        if (tavern && run) run.keyLevel = 0;
        orig(win, msg);
        if (tavern) {
          var t = $('end-title');
          if (t) t.textContent = win ? 'Инст пройден' : 'Вайп';
          var m = $('end-msg');
          if (m && run) {
            var extra = (win ? 'Инст закрыт.' : 'Отряд пал. Герой жив.') +
              ' Опыта за заход: ' + (run._heroXpGranted || 0) + '.';
            m.textContent = extra;
          }
        }
      };
    });

    wrap('pushHistory', function (orig) {
      return function (entry) {
        if (run && run.tavern) return;
        return orig(entry);
      };
    });

    wrap('saveRun', function (orig) {
      return function () {
        if (run && run.tavern) return;
        return orig();
      };
    });

    wrap('backToLobby', function (orig) {
      return function () {
        var reopen = !!(run && run.tavern);
        orig();
        if (reopen) showHub();
        else paintPlaque();
      };
    });

    wrap('onVictory', function (orig) {
      return function () {
        if (run && !run.finished) {
          var node = typeof currentRouteNode === 'function' ? currentRouteNode() : null;
          var type = (node && node.type) || 'trash';
          var rec = hero();
          if (rec && typeof G.igorHeroPackXp === 'function') {
            var xpType = type === 'boss' ? 'boss' : type;
            run._heroXpEarned = (run._heroXpEarned || 0) + G.igorHeroPackXp(xpType, rec.level);
          }
        }
        if (run && run.tavern) {
          if (run.finished) return;
          advanceRoom();
          return;
        }
        return orig();
      };
    });

    wrap('advanceRoom', function (orig) {
      return function () {
        if (!(run && run.tavern)) return orig();
        if (!run || run.finished) return;
        var cur = typeof currentRouteNode === 'function' ? currentRouteNode() : null;
        if (!cur) { endRun(true, 'Инст пройден'); return; }
        if (typeof markNodeVisited === 'function') markNodeVisited(cur.id);
        if (cur.type === 'final') { endRun(true, 'Инст пройден'); return; }
        var next = (cur.next || [])[0];
        if (next && typeof goToNode === 'function') goToNode(next);
        else endRun(true, 'Инст пройден');
      };
    });

    wrap('renderPath', function (orig) {
      return function () {
        if (!(run && run.tavern)) return orig();
        var list = $('path-list');
        if (!list) return;
        list.classList.remove('hidden');
        var order = ['start', 'hall', 'fork1a', 'approach', 'mid', 'final'];
        var cur = run.route && run.route.currentId;
        var visited = new Set((run.route && run.route.visited) || []);
        list.innerHTML = '<div class="route-map">' + order.map(function (id, i) {
          var n = run.route.nodes[id];
          var card = typeof routeNodeCard === 'function' ? routeNodeCard(n, cur, visited) : (n ? n.name : id);
          return (i ? '<div class="rm-line"></div>' : '') + card;
        }).join('') + '</div>';
      };
    });

    wrap('scaleEnemy', function (orig) {
      return function (tpl, k, isBoss, isElite) {
        var e = orig(tpl, k, isBoss, isElite);
        if (run && run.tavern && e && typeof G.igorHeroLevelShare === 'function') {
          var f = G.igorHeroLevelShare(run.heroLevel || 1);
          e.maxHp = Math.max(1, Math.round(e.maxHp * f));
          e.hp = e.maxHp;
          e.atk = Math.max(1, Math.round(e.atk * f));
          e.def = Math.max(0, Math.round((e.def || 0) * f));
        }
        return e;
      };
    });

    wrap('shouldRaidAuto', function (orig) {
      return function (actor) {
        if (run && run.tavern) {
          if (!actor || actor.side !== 'ally' || actor.isPet) return false;
          try { if (raidAutoAllies === false) return false; } catch (_) {}
          return actor.uid !== raidPlayerUid;
        }
        return orig(actor);
      };
    });

    wrap('setRaidFocus', function (orig) {
      return function (unit) {
        if (run && run.tavern && unit && unit.side === 'ally' && !unit.isPet) {
          if (!unit.alive) { toastMsg('Мёртв'); return; }
          raidPlayerUid = unit.uid;
          toastMsg('Управляете: ' + (unit.fullName || unit.name));
          try { renderCombat(); } catch (_) {}
          return;
        }
        return orig(unit);
      };
    });

    wrap('raidFocusClass', function (orig) {
      return function (u) {
        if (run && run.tavern && u && u.side === 'ally' && !u.isPet) {
          return u.uid === raidPlayerUid ? ' raid-focus' : '';
        }
        return orig(u);
      };
    });

    wrap('beginRunScreen', function (orig) {
      return function () {
        hideHub();
        return orig.apply(this, arguments);
      };
    });

    wrap('startCombat', function (orig) {
      return function (type) {
        var r = orig.apply(this, arguments);
        if (run && run.tavern && run.party) {
          run.party.forEach(function (p) {
            if (!p || !p.res || !p.res.secondary) return;
            if (p.res.secondary.type === 'holy_power') {
              p.res.secondary.current = Math.min(3, p.res.secondary.max || 5);
            }
          });
        }
        return r;
      };
    });

    wrap('renderParty', function (orig) {
      return function () {
        orig();
        paintPlaque();
      };
    });

    wrap('updatePreview', function (orig) {
      return function () {
        orig();
        var rec = hero();
        if (!rec || !pickClass || !pickSpec) return;
        if (pickClass !== rec.classId || pickSpec !== rec.specId) return;
        var box = $('skill-preview');
        if (!box) return;
        box.querySelectorAll('.skill-line').forEach(function (line, i) {
          var spec = specObj(rec.classId, rec.specId);
          var a = spec && spec.abilities && spec.abilities[i];
          if (!a || typeof G.igorHeroAbilityUnlockLevel !== 'function') return;
          var need = G.igorHeroAbilityUnlockLevel(rec.classId, rec.specId, a);
          if (rec.level < need) {
            line.style.opacity = '.45';
            var nm = line.querySelector('.sl-name');
            if (nm && nm.textContent.indexOf('ур.') < 0) nm.textContent += ' · ур. ' + need;
          }
        });
      };
    });

    G._igorHeroHubHooked = true;
    return true;
  }

  function boot() {
    injectCss();
    injectLobbyButton();
    installCombatWraps();
    paintPlaque();
  }

  G.igorHeroOpenHub = showHub;
  G.igorHeroBootLobby = boot;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  if (!installCombatWraps()) {
    var t = setInterval(function () { if (installCombatWraps()) clearInterval(t); }, 80);
    setTimeout(function () { clearInterval(t); }, 8000);
  }
  var _init = G.initLobby;
  if (typeof _init === 'function') {
    G.initLobby = function () {
      _init.apply(this, arguments);
      boot();
    };
  }
})(typeof window !== 'undefined' ? window : this);
