/* raid-catacombs: 50% split into catacombs, 5 waves, field, pillars. Тест only. */
(function () {
  const CATA_BG = 'assets/backgrounds/raid-catacombs.jpg';
  const FIELD_BG = 'assets/backgrounds/raid-field.jpg';
  const PILLAR_HP = 360000;
  const PILLAR_DRAIN = 22000;
  const PILLAR_AOE = 2200;

  function ss() { return (typeof STAT_SCALE === 'number') ? STAT_SCALE : 1000; }

  function isCata() {
    return !!(typeof isRaidRun === 'function' && isRaidRun() && combat && combat.catacombs && combat.catacombs.active);
  }
  function cata() { return combat && combat.catacombs; }

  function showRaidPlace(name, sub) {
    let el = document.getElementById('raid-place');
    if (!el) {
      el = document.createElement('div');
      el.id = 'raid-place';
      el.className = 'raid-place';
      el.innerHTML = '<div class="raid-place-name"></div><div class="raid-place-sub"></div>';
      document.body.appendChild(el);
    }
    el.querySelector('.raid-place-name').textContent = name || '';
    el.querySelector('.raid-place-sub').textContent = sub || '';
    el.classList.add('on');
    clearTimeout(el._hide);
    el._hide = setTimeout(() => el.classList.remove('on'), 3200);
    const hud = document.getElementById('hud-room');
    if (hud && name) hud.textContent = '⚡ ' + name;
    const phase = document.getElementById('raid-phase-name');
    if (phase && name) phase.textContent = name;
    try { if (typeof log === 'function') log('Локация: ' + name + (sub ? ' · ' + sub : ''), 'system'); } catch (_) {}
  }

  function raidArt(kind) {
    const base = (typeof ASSETS !== 'undefined' && ASSETS.base) ? ASSETS.base : 'assets/';
    return base + 'backgrounds/' + (kind === 'field' ? 'raid-field.jpg' : 'raid-catacombs.jpg');
  }

  function forceRaidBg(kindOrUrl) {
    if (!combat) return;
    const url = (kindOrUrl === 'field' || kindOrUrl === 'cata')
      ? raidArt(kindOrUrl === 'field' ? 'field' : 'cata')
      : kindOrUrl;
    combat.raidBg = url;
    combat.battleLoc = (kindOrUrl === 'field' || /raid-field|undercourt/.test(String(url))) ? 'undercourt' : 'catacombs';
    const ba = document.getElementById('battle-area');
    if (!ba) return;
    ba.dataset.bgUrl = url;
    ba.classList.add('has-raid-bg');
    const css = 'url(' + JSON.stringify(url) + ')';
    ba.style.setProperty('--battle-bg', css);
    ba.style.backgroundImage = 'linear-gradient(180deg, rgba(10,16,12,.38), rgba(8,12,10,.52)), ' + css;
    ba.style.backgroundSize = 'cover';
    ba.style.backgroundPosition = 'center 40%';
  }

  function blowIntoCatacombs(onDone) {
    const layer = document.getElementById('raid-fx-layer');
    const ba = document.getElementById('battle-area');
    if (!layer || !ba) { forceRaidBg('cata'); if (onDone) onDone(); return; }
    combat.vaultLock = true;
    layer.classList.remove('hidden');
    layer.innerHTML = '<div class="raid-flash"></div><div class="raid-cata-blown"></div>';
    const box = layer.querySelector('.raid-cata-blown');
    const nodes = document.querySelectorAll('#ally-row .unit, #enemy-row .unit, #boss-frame');
    let i = 0;
    nodes.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return;
      const ghost = el.cloneNode(true);
      ghost.classList.add('raid-cata-ghost');
      ghost.style.left = r.left + 'px';
      ghost.style.top = r.top + 'px';
      ghost.style.width = r.width + 'px';
      ghost.style.height = r.height + 'px';
      ghost.style.setProperty('--dx', ((Math.random() * 2 - 1) * 80) + 'px');
      ghost.style.setProperty('--dy', (180 + Math.random() * 220) + 'px');
      ghost.style.setProperty('--rot', ((Math.random() * 2 - 1) * 28) + 'deg');
      ghost.style.animationDelay = (i * 22) + 'ms';
      box.appendChild(ghost);
      i += 1;
    });
    if (typeof playFloorCrack === 'function') {
      /* flash already on layer */
    }
    if (typeof raidFinalePlayBolts === 'function') {
      try { raidFinalePlayBolts(900); } catch (_) {}
    }
    setTimeout(() => {
      forceRaidBg('cata');
    }, 200);
    setTimeout(() => {
      layer.classList.add('hidden');
      layer.innerHTML = '';
      combat.vaultLock = false;
      if (onDone) onDone();
    }, 1300);
  }

  function defaultSides() {
    const heroes = (run.party || []).filter(h => h && !h.isPet);
    const alive = heroes.filter(h => h.alive);
    const tanks = alive.filter(h => h.role === 'tank');
    const heals = alive.filter(h => h.role === 'healer');
    const left = [];
    const right = [];
    if (tanks[0]) left.push(tanks[0]);
    if (tanks[1]) right.push(tanks[1]);
    if (heals[0]) left.push(heals[0]);
    if (heals[1]) right.push(heals[1]);
    const rest = alive.filter(h => !left.includes(h) && !right.includes(h));
    for (const h of rest) {
      if (left.length <= right.length) left.push(h);
      else right.push(h);
    }
    if (!right.length && left.length > 1) right.push(left.pop());
    if (!left.length && right.length > 1) left.push(right.pop());
    const map = {};
    for (const h of heroes) {
      map[h.uid] = right.includes(h) ? 'right' : 'left';
    }
    return map;
  }

  function ensurePickRoot() {
    let root = document.getElementById('raid-cata-pick');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'raid-cata-pick';
    root.className = 'raid-cata-pick';
    root.innerHTML =
      '<div class="raid-cata-pick-box">' +
        '<div class="raid-cata-pick-title">Катакомбы под дворцом</div>' +
        '<div class="raid-cata-pick-hint">Клик по портрету переносит героя. Ты идёшь со своим персонажем. Вторая группа — под ИИ.</div>' +
        '<div class="raid-cata-cols">' +
          '<div class="raid-cata-col" data-side="left"><div class="raid-cata-col-h">Левый ход</div><div class="raid-cata-col-list" data-list="left"></div></div>' +
          '<div class="raid-cata-col" data-side="right"><div class="raid-cata-col-h">Правый ход</div><div class="raid-cata-col-list" data-list="right"></div></div>' +
        '</div>' +
        '<button type="button" class="btn btn-primary" data-cata-go>В катакомбы</button>' +
      '</div>';
    document.body.appendChild(root);
    root.querySelector('[data-cata-go]').addEventListener('click', confirmCataSplit);
    return root;
  }

  function paintPick() {
    const s = cata();
    if (!s) return;
    const root = ensurePickRoot();
    const heroes = (run.party || []).filter(h => h && !h.isPet);
    ['left', 'right'].forEach((side) => {
      const box = root.querySelector('[data-list="' + side + '"]');
      if (!box) return;
      box.innerHTML = '';
      heroes.filter(h => s.assign[h.uid] === side).forEach((h) => {
        const you = h.uid === raidPlayerUid;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'raid-cata-hero' + (you ? ' you' : '');
        const src = (typeof ASSETS !== 'undefined' && h.classId && h.specId) ? ASSETS.specP(h.classId, h.specId) : '';
        b.innerHTML = (src ? '<img alt="" src="' + src + '"/>' : '') +
          '<span>' + (h.name || '') + (you ? ' · ты' : '') + '</span>';
        b.addEventListener('click', () => {
          s.assign[h.uid] = side === 'left' ? 'right' : 'left';
          paintPick();
        });
        box.appendChild(b);
      });
    });
    root.classList.add('on');
  }

  function confirmCataSplit() {
    const s = cata();
    if (!s) return;
    const left = (run.party || []).filter(h => h && !h.isPet && s.assign[h.uid] === 'left');
    const right = (run.party || []).filter(h => h && !h.isPet && s.assign[h.uid] === 'right');
    if (!left.length || !right.length) {
      toast('В каждом ходе нужен хотя бы один герой');
      return;
    }
    const me = (run.party || []).find(h => h.uid === raidPlayerUid) || left[0] || right[0];
    s.playerRoom = s.assign[me.uid] || 'left';
    s.stage = 'waves';
    s.waveYou = 0;
    s.waveThem = 0;
    s.themTicks = 0;
    for (const h of (run.party || [])) {
      if (h.isPet) continue;
      h.raidRoom = s.assign[h.uid] || 'left';
    }
    for (const p of (combat.pets || [])) {
      const o = (run.party || []).find(h => h.uid === p.ownerUid);
      if (o) p.raidRoom = o.raidRoom;
    }
    combat.vaultLock = false;
    const pick = document.getElementById('raid-cata-pick');
    if (pick) pick.classList.remove('on');
    const hall = s.playerRoom === 'left' ? 'Левый ход' : 'Правый ход';
    showRaidPlace('Катакомбы под дворцом', hall + ' · волна 1 из 5');
    spawnCataWave(true);
    spawnCataWave(false);
    forceRaidBg('cata');
    ensureOtherPanel();
    paintOtherPanel();
    try { if (typeof buildTurnQueue === 'function') buildTurnQueue(); } catch (_) {}
    try { if (typeof renderCombat === 'function') renderCombat(); } catch (_) {}
    if (typeof scheduleProcessTurn === 'function') scheduleProcessTurn(80);
  }

  function cataWaveSpec(n, forPlayer) {
    const k = n + (forPlayer ? 0 : 0);
    const halls = [
      [
        { name: 'Грозовой глашатай', id: 'r', role: 'dps', hp: 32, atk: 12, def: 4, speed: 12, mana: 50,
          abs: [
            { id: 'bolt', name: 'Разряд свода', cost: 0, cd: 0, type: 'damage', power: 1.45, school: 'nature' },
            { id: 'cast', name: 'Вопль катакомб', cost: 12, cd: 2, type: 'cast_aoe', power: 0.95, castKind: 'kick', castPrio: 4, school: 'nature' },
          ] },
        { name: 'Клинок династии', id: 'j', role: 'dps', hp: 36, atk: 13, def: 6, speed: 11,
          abs: [
            { id: 'h', name: 'Рассечение свода', cost: 0, cd: 0, type: 'damage', power: 1.55, school: 'physical' },
            { id: 'buster', name: 'Казнь стража', cost: 12, cd: 2, type: 'cast_aoe', power: 1.35, castKind: 'buster', castPrio: 2, school: 'physical' },
          ] },
        { name: 'Клинок династии', id: 'j', role: 'dps', hp: 36, atk: 13, def: 6, speed: 11,
          abs: [
            { id: 'h', name: 'Рассечение свода', cost: 0, cd: 0, type: 'damage', power: 1.55, school: 'physical' },
            { id: 'aoe', name: 'Вихрь искр', cost: 10, cd: 2, type: 'aoe', power: 0.78, school: 'nature' },
          ] },
      ],
      [
        { name: 'Жрец грозы', id: 'm', role: 'healer', hp: 30, atk: 11, def: 3, speed: 11, mana: 60,
          abs: [
            { id: 'b', name: 'Тень грома', cost: 0, cd: 0, type: 'damage', power: 1.25, school: 'nature' },
            { id: 'h', name: 'Заряд плоти', cost: 12, cd: 2, type: 'heal', power: 0.38 },
            { id: 'cast', name: 'Гимн династии', cost: 12, cd: 2, type: 'cast_aoe', power: 0.88, castKind: 'kick', castPrio: 3, school: 'nature' },
          ] },
        { name: 'Грозовой глашатай', id: 'r', role: 'dps', hp: 34, atk: 13, def: 4, speed: 12, mana: 50,
          abs: [
            { id: 'bolt', name: 'Разряд свода', cost: 0, cd: 0, type: 'damage', power: 1.50, school: 'nature' },
            { id: 'cast', name: 'Цепная молния', cost: 12, cd: 2, type: 'cast_aoe', power: 1.00, castKind: 'kick', castPrio: 4, school: 'nature' },
          ] },
        { name: 'Палач свода', id: 'as', role: 'dps', hp: 38, atk: 14, def: 4, speed: 15,
          abs: [
            { id: 'stab', name: 'Удар в спину', cost: 0, cd: 0, type: 'damage', power: 1.60 },
            { id: 'exec', name: 'Коллапс', cost: 10, cd: 2, type: 'damage', power: 2.20 },
          ] },
      ],
      [
        { name: 'Капитан катакомб', id: 'c', role: 'tank', hp: 62, atk: 15, def: 14, speed: 8, mana: 30,
          abs: [
            { id: 'c', name: 'Рассечение', cost: 0, cd: 0, type: 'damage', power: 1.60, school: 'physical' },
            { id: 's', name: 'Клич свода', cost: 10, cd: 3, type: 'buff', power: 0.25 },
            { id: 'buster', name: 'Децимация', cost: 12, cd: 2, type: 'cast_aoe', power: 1.40, castKind: 'buster', castPrio: 2, school: 'physical' },
          ] },
        { name: 'Грозовой глашатай', id: 'r', role: 'dps', hp: 30, atk: 12, def: 4, speed: 12, mana: 50,
          abs: [
            { id: 'bolt', name: 'Разряд свода', cost: 0, cd: 0, type: 'damage', power: 1.45, school: 'nature' },
            { id: 'cast', name: 'Вопль катакомб', cost: 12, cd: 2, type: 'cast_aoe', power: 0.92, castKind: 'kick', castPrio: 4, school: 'nature' },
          ] },
      ],
      [
        { name: 'Нефритовый палач', id: 'j', role: 'dps', hp: 26, atk: 13, def: 6, speed: 11,
          abs: [
            { id: 'cleave', name: 'Раскол', cost: 0, cd: 0, type: 'damage', power: 1.50 },
            { id: 'whirl', name: 'Вихрь клинков', cost: 10, cd: 2, type: 'aoe', power: 0.82 },
          ] },
        { name: 'Ткач молний', id: 's', role: 'dps', hp: 24, atk: 12, def: 3, speed: 13, mana: 40,
          abs: [
            { id: 'bite', name: 'Укус искры', cost: 0, cd: 0, type: 'damage', power: 1.35 },
            { id: 'cast', name: 'Сеть молний', cost: 12, cd: 2, type: 'cast_aoe', power: 0.90, castKind: 'kick', castPrio: 3, school: 'nature' },
          ] },
        { name: 'Ткач молний', id: 's', role: 'dps', hp: 24, atk: 12, def: 3, speed: 13, mana: 40,
          abs: [
            { id: 'bite', name: 'Укус искры', cost: 0, cd: 0, type: 'damage', power: 1.35 },
            { id: 'aoe', name: 'Зола грома', cost: 10, cd: 2, type: 'aoe', power: 0.70, school: 'nature' },
          ] },
        { name: 'Копейщик династии', id: 'a', role: 'dps', hp: 22, atk: 13, def: 3, speed: 13,
          abs: [
            { id: 'h', name: 'Выстрел', cost: 0, cd: 0, type: 'damage', power: 1.40 },
            { id: 'v', name: 'Залп', cost: 10, cd: 3, type: 'aoe', power: 0.72 },
          ] },
      ],
      [
        { name: 'Страж нижнего свода', id: 'sg', role: 'tank', hp: 88, atk: 16, def: 16, speed: 7, mana: 40,
          abs: [
            { id: 'bash', name: 'Сокрушение свода', cost: 0, cd: 0, type: 'damage', power: 1.65, school: 'physical' },
            { id: 'buster', name: 'Обвал камня', cost: 12, cd: 2, type: 'cast_aoe', power: 1.45, castKind: 'buster', castPrio: 2, school: 'physical' },
            { id: 'cast', name: 'Гнев катакомб', cost: 12, cd: 2, type: 'cast_aoe', power: 1.05, castKind: 'kick', castPrio: 4, school: 'nature' },
          ] },
      ],
    ];
    return halls[Math.max(0, Math.min(4, k))] || halls[0];
  }

  function otherRoom(s) {
    return s.playerRoom === 'left' ? 'right' : 'left';
  }

  function visibleCataEnemy(e) {
    const s = cata();
    if (!s || !s.active) return true;
    if (e.instRole === 'static_pillar') return false;
    if (e.raidBoss || (e.isBoss && e.mech && e.mech.id === 'thunder_king')) {
      return !!s.youDone || s.stage === 'field';
    }
    if (e.mechRole === 'cata_wave') {
      if (s.youDone) return false;
      return e.raidRoom === s.playerRoom;
    }
    return !e.vaultAway;
  }

  function livingWave(room) {
    return (combat.enemies || []).filter(e => e.alive && e.hp > 0 && e.mechRole === 'cata_wave' && e.raidRoom === room);
  }

  function spawnCataWave(forPlayer) {
    const s = cata();
    if (!s) return;
    const idx = forPlayer ? s.waveYou : s.waveThem;
    if (idx >= 5) return;
    const spec = cataWaveSpec(idx, forPlayer);
    const k = run.keyLevel || 10;
    const room = forPlayer ? s.playerRoom : otherRoom(s);
    (combat.enemies || []).forEach(e => {
      if (e && e.mechRole === 'cata_wave' && e.raidRoom === room && e.alive) { e.alive = false; e.hp = 0; }
    });
    for (const t of spec) {
      const tpl = {
        id: t.id, name: t.name, icon: '⚡', role: t.role || 'dps',
        hp: t.hp, atk: t.atk, def: t.def || 4, speed: t.speed || 10, mana: t.mana || 25,
        abilities: t.abs || [{ id: 'h', name: 'Удар', cost: 0, cd: 0, type: 'damage', power: 1.4 }],
      };
      const u = scaleEnemy(tpl, k, false, false);
      u.mechRole = 'cata_wave';
      u.raidRoom = room;
      u.name = t.name;
      u.forcesValue = 0;
      combat.enemies.push(u);
    }
    if (forPlayer) {
      s.waveYou = idx + 1;
      forceRaidBg('cata');
      log('Волна ' + s.waveYou + '/5 · ' + (room === 'left' ? 'Левый ход' : 'Правый ход'), 'enemy');
      toast('Волна ' + s.waveYou + ' из 5');
      showRaidPlace('Катакомбы под дворцом', (room === 'left' ? 'Левый ход' : 'Правый ход') + ' · волна ' + s.waveYou + ' из 5');
    } else {
      s.waveThem = idx + 1;
      log('Вторая группа: волна ' + s.waveThem + '/5', 'system');
    }
  }

  function ensureOtherPanel() {
    let p = document.getElementById('raid-cata-other');
    if (p) return p;
    p = document.createElement('div');
    p.id = 'raid-cata-other';
    p.className = 'raid-cata-other';
    document.body.appendChild(p);
    return p;
  }

  function paintOtherPanel() {
    const s = cata();
    const p = document.getElementById('raid-cata-other');
    if (!s || !p || s.stage === 'field' || s.stage === 'pick') {
      if (p) p.classList.remove('on');
      return;
    }
    const other = otherRoom(s);
    const hall = other === 'left' ? 'Левый ход' : 'Правый ход';
    const themN = s.themDone ? 5 : Math.max(1, s.waveThem || 1);
    const heroes = (run.party || []).filter(h => h && !h.isPet && h.raidRoom === other);
    const rows = heroes.map((h) => {
      const hp = Math.max(0, Math.round((h.hp / Math.max(1, h.maxHp)) * 100));
      const res = h.res && h.res.primary ? h.res.primary : null;
      const rp = res ? Math.round((res.current / Math.max(1, res.max)) * 100) : 0;
      return '<div class="raid-cata-obar">' +
        '<div class="raid-cata-oname">' + (h.icon || '') + ' ' + h.name + '</div>' +
        '<div class="raid-cata-ohp"><i style="width:' + hp + '%"></i></div>' +
        (res ? '<div class="raid-cata-ores"><i style="width:' + rp + '%"></i></div>' : '') +
        '</div>';
    }).join('');
    p.innerHTML = '<div class="raid-cata-other-h">' + hall + ' · ИИ</div>' +
      '<div class="raid-cata-owave">' + (s.themDone ? 'На поле, держат босса' : ('Волна ' + themN + ' / 5')) + '</div>' +
      rows;
    p.classList.add('on');
  }

  function tickOtherGroup() {
    const s = cata();
    if (!s || !s.active) return;
    if (s.themDone && !s.youDone) {
      const boss = (combat.enemies || []).find(e => e.raidBoss || (e.isBoss && e.mech && e.mech.id === 'thunder_king'));
      const hold = (run.party || []).filter(h => h.alive && !h.isPet && h.raidRoom === otherRoom(s));
      const atk = boss ? (typeof getEff === 'function' ? getEff(boss).atk : boss.atk) : 20000;
      const raw = Math.max(1, Math.round(atk * 0.55));
      for (const h of hold) {
        if (typeof dealTrue === 'function') {
          dealTrue(h, raw, boss, 'aoe', { school: 'nature', abilityName: 'Удержание босса', isAoe: true, raidIgnoreRoom: true });
        }
      }
      if (hold.length) log('Вторая группа держит Лэй Шэня на поле, пока вы в катакомбах.', 'enemy');
    }
    paintOtherPanel();
  }

  function livingCataWave() {
    const s = cata();
    if (!s) return [];
    return livingWave(s.playerRoom);
  }

  function maybeFinishSide(sideYou) {
    const s = cata();
    if (!s) return;
    if (sideYou) {
      if (s.youDone) return;
      if (livingWave(s.playerRoom).length) return;
      if (s.waveYou < 5) {
        spawnCataWave(true);
        return;
      }
      s.youDone = true;
      log('Ваша группа закрыла катакомбы.', 'player');
    } else {
      if (s.themDone) return;
      if (livingWave(otherRoom(s)).length) return;
      if (s.waveThem < 5) {
        spawnCataWave(false);
        return;
      }
      s.themDone = true;
      log('Вторая группа закрыла катакомбы.', 'system');
    }
    if (s.youDone && s.themDone) enterField();
    else if (s.youDone && !s.themDone) startHold('you');
    else if (!s.youDone && s.themDone) startHold('them');
  }

  function raidCataMaybeAdvance() {
    const s = cata();
    if (!s || !s.active || s.stage === 'field' || s.stage === 'pick') return;
    const before = '' + s.waveYou + s.waveThem + s.youDone + s.themDone + s.stage;
    maybeFinishSide(true);
    maybeFinishSide(false);
    const after = '' + s.waveYou + s.waveThem + s.youDone + s.themDone + s.stage;
    if (before === after) {
      paintOtherPanel();
      return;
    }
    try { if (typeof buildTurnQueue === 'function') buildTurnQueue(); } catch (_) {}
    try { if (typeof renderCombat === 'function') renderCombat(); } catch (_) {}
    paintOtherPanel();
  }

  function startHold(who) {
    const s = cata();
    if (!s || s.stage === 'field') return;
    s.stage = 'hold';
    const boss = (combat.enemies || []).find(e => e.raidBoss || (e.isBoss && e.mech && e.mech.id === 'thunder_king'));
    if (who === 'you') {
      (combat.enemies || []).forEach(e => {
        if (e && e.mechRole === 'cata_wave' && e.raidRoom === s.playerRoom) { e.alive = false; e.hp = 0; }
      });
      if (boss) {
        boss.vaultAway = false;
        boss.raidRoom = s.playerRoom;
      }
      forceRaidBg('field');
      showRaidPlace('Поле под дворцом', 'Держите босса, пока вторая группа идёт по катакомбам');
      log('Вы вышли на поле. Держите Лэй Шэня, пока вторая группа не добьёт свои волны.', 'system');
      toast('Держите босса');
    } else {
      if (boss) {
        boss.vaultAway = true;
        boss.raidRoom = otherRoom(s);
      }
      forceRaidBg('cata');
      showRaidPlace('Катакомбы под дворцом', 'Вторая группа уже на поле и держит босса');
      log('Вторая группа вышла на поле и держит Лэй Шэня. Добейте свои волны.', 'system');
      toast('Вторая группа держит босса');
    }
  }

  function enterField() {
    const s = cata();
    if (!s || s.stage === 'field') return;
    s.stage = 'field';
    s.youDone = true;
    s.themDone = true;
    const boss = (combat.enemies || []).find(e => e.raidBoss || (e.isBoss && e.mech && e.mech.id === 'thunder_king'));
    (combat.enemies || []).forEach(e => {
      if (e && e.mechRole === 'cata_wave') { e.alive = false; e.hp = 0; }
    });
    if (boss) {
      boss.vaultAway = false;
      boss.raidRoom = null;
    }
    for (const h of (run.party || [])) h.raidRoom = null;
    forceRaidBg('field');
    showRaidPlace('Поле под дворцом', 'Рейд собрался. Добивайте Лэй Шэня');
    const other = document.getElementById('raid-cata-other');
    if (other) other.classList.remove('on');
    log('Обе группы на поле под дворцом.', 'enemy');
    toast('Поле под дворцом');
    if (boss && boss.hp / Math.max(1, boss.maxHp) <= 0.20 && typeof spawnRaidPillars === 'function') {
      spawnRaidPillars(boss);
    }
    try { if (typeof buildTurnQueue === 'function') buildTurnQueue(); } catch (_) {}
    try { if (typeof renderCombat === 'function') renderCombat(); } catch (_) {}
  }

  function beginRaidCatacombs(boss) {
    if (!combat || !isRaidRun() || !boss) return;
    if (combat.catacombs && combat.catacombs.active) return;
    if (combat.vault && !combat.vault.dropped) return;
    if (typeof isRaidSplitActive === 'function' && isRaidSplitActive() && typeof endRaidSplit === 'function') {
      try { endRaidSplit('Катакомбы'); } catch (_) {}
    }
    (combat.enemies || []).forEach(e => {
      if (e && e.alive && e.mechRole === 'conductor') { e.alive = false; e.hp = 0; }
    });
    boss.vaultAway = true;
    combat.catacombs = {
      active: true,
      stage: 'pick',
      assign: defaultSides(),
      playerRoom: 'left',
      waveYou: 0,
      waveThem: 0,
      youDone: false,
      themDone: false,
      themTicks: 0,
    };
    combat.vaultLock = true;
    showRaidPlace('Катакомбы под дворцом', 'Пол рушится — рейд сдувает вниз');
    blowIntoCatacombs(() => {
      combat.vaultLock = true;
      paintPick();
    });
  }

  function spawnRaidPillars(boss) {
    if (!combat || !boss || boss._pillars) return;
    const s = cata();
    if (s && s.stage !== 'field') return;
    boss._pillars = true;
    combat._pillarRound = combat.round;
    forceRaidBg('field');
    const mk = (side) => {
      const u = {
        uid: (typeof uid === 'function' ? uid() : 'pilar_' + side),
        heroId: 'eq',
        name: side === 'left' ? 'Столб тока · лево' : 'Столб тока · право',
        icon: '⚡',
        role: 'dps',
        side: 'enemy',
        alive: true,
        maxHp: PILLAR_HP,
        hp: PILLAR_HP,
        atk: 0,
        def: 0,
        speed: 1,
        shield: 0,
        forcesValue: 0,
        buffs: [],
        abilities: [],
        instRole: 'static_pillar',
        instObject: true,
        healOnly: true,
        flank: side,
        isBoss: false,
        isElite: false,
        mechRole: 'static_pillar',
      };
      combat.enemies.push(u);
      return u;
    };
    mk('left');
    mk('right');
    showRaidPlace('Поле под дворцом', 'Столбы тока слева и справа · только лечение');
    log('Два столба тока: по ' + (typeof fmt === 'function' ? fmt(PILLAR_HP) : PILLAR_HP) +
      ' HP. Бить нельзя. Лечение 1–9 → клик по столбу. Каждый ход −' +
      (typeof fmt === 'function' ? fmt(PILLAR_DRAIN) : PILLAR_DRAIN) +
      '. Область ' + (typeof fmt === 'function' ? fmt(PILLAR_AOE) : PILLAR_AOE) +
      ' × (1 + доля дыры).', 'enemy');
    toast('Столбы: только хил');
    try { paintBossFlanks(); } catch (_) {}
    try { if (typeof renderCombat === 'function') renderCombat(); } catch (_) {}
  }

  function paintBossFlanks() {
    const wrap = document.getElementById('boss-flank');
    if (wrap) wrap.classList.toggle('has-pillars', !!(combat && (combat.enemies || []).some(e => e.instRole === 'static_pillar' && e.alive)));
    ['left', 'right'].forEach((side) => {
      const slot = document.getElementById('boss-flank-' + side);
      if (!slot) return;
      const p = (combat && combat.enemies || []).find(e => e.instRole === 'static_pillar' && e.flank === side && e.alive);
      if (!p) { slot.innerHTML = ''; slot.onclick = null; return; }
      const pct = Math.max(0, Math.min(100, Math.round(p.hp / Math.max(1, p.maxHp) * 100)));
      const src = (typeof ASSETS !== 'undefined' && ASSETS.enemyP) ? ASSETS.enemyP('eq') : '';
      slot.innerHTML =
        '<div class="boss-flank-card" data-uid="' + p.uid + '">' +
          (src ? '<img class="boss-flank-art" alt="" src="' + src + '"/>' : '') +
          '<div class="boss-flank-name">' + p.name + '</div>' +
          '<div class="boss-flank-bar"><i style="width:' + pct + '%"></i></div>' +
          '<div class="boss-flank-hp">' + (typeof fmt === 'function' ? fmt(p.hp) : p.hp) +
            ' / ' + (typeof fmt === 'function' ? fmt(p.maxHp) : p.maxHp) + '</div>' +
          '<div class="boss-flank-hint">только хил</div>' +
        '</div>';
      slot.onclick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (typeof onUnitClick === 'function') onUnitClick(p);
      };
    });
  }

  function tickRaidPillars(boss) {
    const s = cata();
    if (s && s.stage !== 'field') return;
    const pillars = (combat.enemies || []).filter(e => e.instRole === 'static_pillar' && e.alive);
    if (!pillars.length) return;
    if (combat._pillarRound === combat.round) return;
    combat._pillarRound = combat.round;
    for (const p of pillars) {
      p.hp = Math.max(0, p.hp - PILLAR_DRAIN);
    }
    const avgMiss = pillars.reduce((a, p) => a + (1 - p.hp / Math.max(1, p.maxHp)), 0) / pillars.length;
    const raw = Math.round(PILLAR_AOE * (1 + avgMiss));
    for (const h of (typeof livingHeroes === 'function' ? livingHeroes() : [])) {
      if (!h.alive) continue;
      if (typeof dealTrue === 'function') {
        dealTrue(h, raw, boss || pillars[0], 'aoe', { school: 'nature', abilityName: 'Разряд столба', isAoe: true });
      }
    }
    log('Столбы: −' + (typeof fmt === 'function' ? fmt(PILLAR_DRAIN) : PILLAR_DRAIN) +
      ' каждый · область ' + (typeof fmt === 'function' ? fmt(raw) : raw) +
      ' (дыра ' + Math.round(avgMiss * 100) + '% → 3т × (1 + дыра))', 'enemy');
    for (const p of pillars) {
      if (p.hp <= 0) {
        p.alive = false;
        partyBurst(0.12, boss || p);
        log(p.name + ' погас — вспышка 12% max HP', 'enemy');
      }
    }
    forceRaidBg('field');
    try { paintBossFlanks(); } catch (_) {}
  }

  function partyBurst(pct, src) {
    for (const h of (typeof livingHeroes === 'function' ? livingHeroes() : [])) {
      if (!h.alive) continue;
      const raw = Math.round(h.maxHp * pct);
      if (typeof dealTrue === 'function') dealTrue(h, raw, src, 'aoe', { school: 'nature', abilityName: 'Вспышка столба', isAoe: true });
    }
  }

  window.paintBossFlanks = paintBossFlanks;
  window.beginRaidCatacombs = beginRaidCatacombs;
  window.raidCataMaybeAdvance = raidCataMaybeAdvance;
  window.spawnRaidPillars = spawnRaidPillars;
  window.tickRaidPillars = tickRaidPillars;
  window.isRaidCatacombs = isCata;
  window.showRaidPlace = showRaidPlace;

  if (typeof startRaidFinale === 'function') {
    startRaidFinale = function () { return false; };
  }

  const _applyBg = typeof applyRoomBackground === 'function' ? applyRoomBackground : null;
  if (_applyBg) {
    applyRoomBackground = function () {
      if (combat && (combat.raidBg || combat.battleLoc === 'catacombs' || combat.battleLoc === 'undercourt')) {
        forceRaidBg(combat.battleLoc === 'undercourt' ? 'field' : (combat.raidBg && /raid-field/.test(combat.raidBg) ? 'field' : 'cata'));
        return;
      }
      return _applyBg.apply(this, arguments);
    };
  }

  const _check = typeof checkEnd === 'function' ? checkEnd : null;
  if (_check) {
    checkEnd = function () {
      try { if (typeof raidCataMaybeAdvance === 'function') raidCataMaybeAdvance(); } catch (e) { console.error('[cata]', e); }
      const s = cata();
      if (s && s.active && (s.stage === 'pick' || s.stage === 'waves' || s.stage === 'hold')) return false;
      return _check.apply(this, arguments);
    };
  }

  const _ai = typeof raidAllyAi === 'function' ? raidAllyAi : null;
  if (_ai) {
    raidAllyAi = function (actor) {
      const s = cata();
      if (s && s.active && s.stage !== 'field' && actor && actor.raidRoom && actor.raidRoom !== s.playerRoom) {
        const friends = (run.party || []).filter(h => h.alive && h.raidRoom === actor.raidRoom);
        const hurt = friends.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        const heal = (actor.abilities || []).find(a => a.type === 'heal' || a.type === 'heal_aoe');
        if (heal && hurt && hurt.hp / hurt.maxHp < 0.7 && typeof castAbility === 'function') {
          castAbility(actor, heal, heal.type === 'heal_aoe' ? actor : hurt);
          return true;
        }
        const foes = livingWave(actor.raidRoom);
        const dmg = (actor.abilities || []).find(a => a.type === 'damage' || a.type === 'aoe');
        if (dmg && foes.length && typeof castAbility === 'function') {
          castAbility(actor, dmg, foes[0]);
          return true;
        }
        return true;
      }
      return _ai.apply(this, arguments);
    };
  }

  const _tick = typeof tickThunderKing === 'function' ? tickThunderKing : null;
  if (_tick) {
    /* enemies.js calls tickThunderKing; we hook extra ticks from wrap below via exported fns */
  }

  const _endRound = typeof endRound === 'function' ? endRound : null;
  if (_endRound) {
    endRound = function () {
      const r = _endRound.apply(this, arguments);
      try {
        if (isCata() && cata().stage === 'waves') tickOtherGroup();
      } catch (e) { console.error(e); }
      return r;
    };
  }

  const _click = typeof onUnitClick === 'function' ? onUnitClick : null;
  if (_click) {
    onUnitClick = function (unit) {
      if (unit && (unit.instRole === 'static_pillar' || unit.healOnly)) {
        if (!pendingTarget || !combat?.waitingPlayer) {
          toast('Столб: лечение 1–9, затем клик');
          return;
        }
        const { actor, ability } = pendingTarget;
        const healish = ability && (ability.type === 'heal' || ability.type === 'heal_aoe' || ability.type === 'hot');
        if (!healish) {
          toast('Столб нельзя бить — только лечение');
          return;
        }
        pendingTarget = null;
        if (typeof castAbility === 'function') castAbility(actor, ability, unit);
        try { paintBossFlanks(); } catch (_) {}
        return;
      }
      return _click.apply(this, arguments);
    };
  }

  const _cast = typeof castAbility === 'function' ? castAbility : null;
  if (_cast) {
    castAbility = function (actor, ability, target) {
      if (target && target.instRole === 'static_pillar' && ability && (ability.type === 'heal' || ability.type === 'heal_aoe' || ability.type === 'hot')) {
        const raw = (typeof abilityDamageRaw === 'function')
          ? abilityDamageRaw(actor, ability)
          : Math.round((actor.atk || ss()) * (ability.power || 1));
        if (typeof healUnit === 'function') {
          const got = healUnit(target, raw, actor, { abilityName: ability.name });
          log((actor.name || '') + ': ' + ability.name + ' → ' + target.name + ' (+' + (typeof fmt === 'function' ? fmt(got || raw) : (got || raw)) + ')', 'heal');
        } else {
          target.hp = Math.min(target.maxHp, target.hp + raw);
        }
        if (typeof afterAction === 'function') afterAction();
        return;
      }
      return _cast.apply(this, arguments);
    };
  }

  const _ren = typeof renderEnemies === 'function' ? renderEnemies : null;
  if (_ren) {
    renderEnemies = function () {
      if (!combat) return _ren.apply(this, arguments);
      const row = document.getElementById('enemy-row');
      if (!row) return;
      const now = Date.now();
      const list = combat.enemies.filter(u => {
        if (u.instRole === 'static_pillar' || u.healOnly) return false;
        if (isCata() && !visibleCataEnemy(u)) return false;
        if (u.vaultAway && !(u.raidBoss || (u.isBoss && u.mech && u.mech.id === 'thunder_king'))) return false;
        if (u.alive) return true;
        if (!u._deadAt) u._deadAt = now;
        return (now - u._deadAt) < 560;
      });
      if (typeof syncUnitRow === 'function') {
        syncUnitRow(row, list, typeof currentActor === 'function' ? currentActor() : null, false);
      } else {
        _ren.apply(this, arguments);
      }
      try { paintBossFlanks(); } catch (_) {}
    };
  }

  const _gtt = typeof getThreatTarget === 'function' ? getThreatTarget : null;
  if (_gtt) {
    getThreatTarget = function (enemy) {
      const s = cata();
      if (s && s.active && enemy && enemy.raidRoom) {
        const hs = (typeof livingHeroes === 'function' ? livingHeroes() : []).filter(h => h.raidRoom === enemy.raidRoom);
        if (hs.length) {
          const tank = hs.find(h => h.role === 'tank');
          return tank || hs[0];
        }
      }
      return _gtt.apply(this, arguments);
    };
  }

  const _dealX = typeof dealDmg === 'function' ? dealDmg : null;
  if (_dealX) {
    dealDmg = function (target, raw, attacker, ctx) {
      if (target && (target.instRole === 'static_pillar' || target.healOnly)) return 0;
      const s = cata();
      if (s && s.active && s.stage !== 'field' && attacker && target && !((ctx && ctx.raidIgnoreRoom))) {
        const ar = attacker.raidRoom;
        const tr = target.raidRoom;
        if (ar && tr && ar !== tr) return 0;
      }
      return _dealX.apply(this, arguments);
    };
  }

  const _build = typeof buildTurnQueue === 'function' ? buildTurnQueue : null;
  if (_build) {
    buildTurnQueue = function () {
      _build.apply(this, arguments);
      if (!combat || !combat.turnQueue) return;
      combat.turnQueue = combat.turnQueue.filter(id => {
        const u = (typeof allUnits === 'function' ? allUnits() : []).find(x => x.uid === id);
        return u && u.instRole !== 'static_pillar';
      });
    };
  }
})();
