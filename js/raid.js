/* raid: 10-man raid test (Тест only) */
  const RAID_SIZE = 10;
  const RAID_NEED = { tank: 2, healer: 2, dps: 6 };
  let gameMode = 'key'; // 'key' | 'raid'
  let raidAutoAllies = true;
  let raidPlayerUid = null;

  const RAID_DUNGEON = {
    id: 'throne',
    name: 'Престол Грома',
    theme: 'jade',
    timerBase: 10 * 60,
    raid: true,
    midName: '—',
    finalName: 'Лэй Шэнь, Повелитель Грома',
  };

  const RAID_PRESET = [
    { classId: 'warrior', specId: 'protection' },
    { classId: 'paladin', specId: 'protection' },
    { classId: 'priest', specId: 'discipline' },
    { classId: 'shaman', specId: 'restoration' },
    { classId: 'mage', specId: 'fire' },
    { classId: 'rogue', specId: 'combat' },
    { classId: 'hunter', specId: 'beast_mastery' },
    { classId: 'warlock', specId: 'demonology' },
    { classId: 'deathknight', specId: 'frost' },
    { classId: 'monk', specId: 'windwalker' },
  ];

  function isRaidRun() { return !!(run && run.raid); }
  function isRaidLobby() { return gameMode === 'raid'; }
  function getPartySize() {
    if (run) return run.raid ? RAID_SIZE : 5;
    return gameMode === 'raid' ? RAID_SIZE : 5;
  }
  function getPartyNeed() {
    return getPartySize() >= RAID_SIZE ? RAID_NEED : { tank: 1, healer: 1, dps: 3 };
  }

  function generateRaidRoute() {
    return {
      nodes: {
        final: {
          id: 'final', type: 'final', name: 'Лэй Шэнь, Повелитель Грома',
          loc: 'throne', next: [], forceBudget: 0, raid: true,
        },
      },
      currentId: 'final',
      visited: [],
      finalCleared: false,
      mopupMode: false,
      seedMeta: { layout: 'raid-10' },
    };
  }

  const LOBBY_BG = {
    key: 'assets/backgrounds/lobby-key.jpg',
    raid: 'assets/backgrounds/lobby-leishen.jpg',
  };
  const lobbyBgImgs = {};
  let lobbyFxBusy = false;
  let lobbyFxRaf = 0;

  function lobbyReduceMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function loadLobbyBg(src) {
    if (lobbyBgImgs[src]) return lobbyBgImgs[src];
    lobbyBgImgs[src] = new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error(src));
      im.src = src;
    });
    return lobbyBgImgs[src];
  }

  function preloadLobbyBgs() {
    loadLobbyBg(LOBBY_BG.key).catch(() => {});
    loadLobbyBg(LOBBY_BG.raid).catch(() => {});
  }

  function applyGameMode(next) {
    gameMode = next === 'raid' ? 'raid' : 'key';
    if (party.length > getPartySize()) party = party.slice(0, getPartySize());
    editSlot = null;
    syncRaidLobbyUi();
    renderParty();
    refreshAffixes();
    refreshKeystone();
    savePartyProfile();
  }

  function setGameMode(mode) {
    const next = mode === 'raid' ? 'raid' : 'key';
    if (gameMode === next) {
      syncRaidLobbyUi();
      return;
    }
    if (lobbyFxBusy) return;
    const lobby = document.getElementById('lobby');
    const onLobby = lobby && !lobby.classList.contains('hidden');
    if (!onLobby || lobbyReduceMotion()) {
      applyGameMode(next);
      return;
    }
    playLobbyDissolve(gameMode, next);
  }

  function ensureLobbyFx() {
    let root = document.getElementById('lobby-fx');
    if (root) return root;
    const lobby = document.getElementById('lobby');
    root = document.createElement('div');
    root.id = 'lobby-fx';
    root.className = 'lobby-fx';
    root.setAttribute('aria-hidden', 'true');
    const canvas = document.createElement('canvas');
    canvas.id = 'lobby-fx-canvas';
    root.appendChild(canvas);
    if (lobby) lobby.insertBefore(root, lobby.firstChild);
    else document.body.appendChild(root);
    return root;
  }

  function drawCoverImg(ctx, img, w, h, posY) {
    if (!img || !img.width) return;
    const ir = img.width / img.height;
    const cr = w / h;
    let dw, dh;
    if (ir > cr) {
      dh = h;
      dw = h * ir;
    } else {
      dw = w;
      dh = w / ir;
    }
    const dx = (w - dw) / 2;
    const dy = h * posY - dh * posY;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function midpointBolt(x0, y0, x1, y1, displace, detail) {
    let pts = [{ x: x0, y: y0 }, { x: x1, y: y1 }];
    let jag = displace;
    for (let step = 0; step < detail; step++) {
      const next = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const off = (Math.random() * 2 - 1) * jag;
        next.push({ x: mx + (-dy / len) * off, y: my + (dx / len) * off });
        next.push(b);
      }
      pts = next;
      jag *= 0.52;
    }
    return pts;
  }

  function strokeBolt(ctx, pts, width, color, blur) {
    if (!pts || pts.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();
  }

  function buildStrike(w, h, spec) {
    const x = spec.x + (Math.random() - 0.5) * 0.05;
    let x0, y0, x1, y1;
    if (spec.sideways) {
      x0 = w * (Math.random() < 0.5 ? -0.02 : 1.02);
      y0 = h * (0.28 + Math.random() * 0.4);
      x1 = w * (1 - x0 / w);
      y1 = y0 + (Math.random() - 0.5) * h * 0.18;
    } else {
      x0 = w * x;
      y0 = h * -0.04;
      x1 = w * (x + (Math.random() - 0.5) * 0.1);
      y1 = h * (0.82 + Math.random() * 0.14);
    }
    const jag = Math.min(w, h) * (spec.fat ? 0.085 : 0.052);
    const main = midpointBolt(x0, y0, x1, y1, jag, spec.fat ? 7 : 6);
    const branches = [];
    const n = spec.branch || 2;
    for (let i = 0; i < n; i++) {
      const idx = Math.floor((0.22 + Math.random() * 0.55) * (main.length - 1));
      const p = main[idx];
      const dir = Math.random() < 0.5 ? -1 : 1;
      const len = Math.min(w, h) * (0.1 + Math.random() * 0.2);
      const bx = p.x + dir * len * (0.55 + Math.random() * 0.5);
      const by = p.y + len * (0.35 + Math.random() * 0.55);
      branches.push(midpointBolt(p.x, p.y, bx, by, jag * 0.42, 4));
    }
    return { main, branches, fat: !!spec.fat, born: 0 };
  }

  function playLobbyDissolve(fromMode, toMode) {
    lobbyFxBusy = true;
    const fromSrc = fromMode === 'raid' ? LOBBY_BG.raid : LOBBY_BG.key;
    const toSrc = toMode === 'raid' ? LOBBY_BG.raid : LOBBY_BG.key;
    const root = ensureLobbyFx();
    const canvas = root.querySelector('canvas');
    const ctx = canvas && canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      applyGameMode(toMode);
      lobbyFxBusy = false;
      return;
    }

    const finish = () => {
      if (lobbyFxRaf) cancelAnimationFrame(lobbyFxRaf);
      lobbyFxRaf = 0;
      root.classList.remove('on');
      root.style.opacity = '';
      document.body.classList.remove('lobby-fx-playing');
      document.getElementById('btn-mode-key')?.removeAttribute('disabled');
      document.getElementById('btn-mode-raid')?.removeAttribute('disabled');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      lobbyFxBusy = false;
    };

    Promise.all([loadLobbyBg(fromSrc), loadLobbyBg(toSrc)]).then(([fromImg, toImg]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      canvas.width = Math.max(2, Math.floor(cssW * dpr));
      canvas.height = Math.max(2, Math.floor(cssH * dpr));
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      const w = canvas.width;
      const h = canvas.height;

      const mask = document.createElement('canvas');
      const bolts = document.createElement('canvas');
      const dest = document.createElement('canvas');
      const cut = document.createElement('canvas');
      mask.width = bolts.width = dest.width = cut.width = w;
      mask.height = bolts.height = dest.height = cut.height = h;
      const mctx = mask.getContext('2d');
      const bctx = bolts.getContext('2d');
      const dctx = dest.getContext('2d');
      const cctx = cut.getContext('2d');
      mctx.clearRect(0, 0, w, h);
      dctx.fillStyle = '#07090c';
      dctx.fillRect(0, 0, w, h);
      drawCoverImg(dctx, toImg, w, h, 0.42);
      ctx.fillStyle = '#0a0c10';
      ctx.fillRect(0, 0, w, h);
      drawCoverImg(ctx, fromImg, w, h, 0.42);

      document.body.classList.add('lobby-fx-playing');
      document.getElementById('btn-mode-key')?.setAttribute('disabled', '');
      document.getElementById('btn-mode-raid')?.setAttribute('disabled', '');
      root.classList.add('on');
      applyGameMode(toMode);

      const schedule = [
        { t: 90, x: 0.54, branch: 3 },
        { t: 260, x: 0.26, branch: 2 },
        { t: 430, x: 0.74, branch: 3 },
        { t: 620, x: 0.50, branch: 4, fat: true },
        { t: 780, x: 0.42, branch: 2, sideways: true },
        { t: 920, x: 0.62, branch: 2 },
      ];
      const live = [];
      let flash = 0;
      let chromeBack = false;
      const t0 = performance.now();
      const TOTAL = 2100;
      const FLOOD_AT = 980;
      const FADE_AT = 1780;

      const frame = (now) => {
        const t = now - t0;
        for (const s of schedule) {
          if (!s.done && t >= s.t) {
            s.done = true;
            const strike = buildStrike(w, h, s);
            strike.born = t;
            live.push(strike);
            flash = Math.max(flash, s.fat ? 0.72 : 0.42);
            const paths = [strike.main, ...strike.branches];
            mctx.save();
            mctx.globalCompositeOperation = 'lighter';
            mctx.filter = 'blur(' + (s.fat ? 14 : 8) * dpr + 'px)';
            for (const p of paths) {
              strokeBolt(mctx, p, (s.fat ? 22 : 13) * dpr, '#fff', 0);
            }
            mctx.filter = 'none';
            for (const p of paths) {
              strokeBolt(mctx, p, (s.fat ? 7 : 4) * dpr, '#fff', 0);
            }
            mctx.restore();
          }
        }

        if ((t / 16 | 0) % 2 === 0) {
          mctx.save();
          mctx.filter = 'blur(' + 6 * dpr + 'px)';
          mctx.globalAlpha = 0.16;
          mctx.drawImage(mask, 0, 0);
          mctx.restore();
        }

        if (t > FLOOD_AT) {
          const flood = Math.min(1, (t - FLOOD_AT) / 720);
          const g = mctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.hypot(w, h) * 0.62 * flood);
          g.addColorStop(0, 'rgba(255,255,255,' + (0.55 + flood * 0.45) + ')');
          g.addColorStop(0.55, 'rgba(255,255,255,' + (0.22 + flood * 0.5) + ')');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          mctx.fillStyle = g;
          mctx.fillRect(0, 0, w, h);
          if (flood > 0.82) {
            mctx.fillStyle = 'rgba(255,255,255,' + ((flood - 0.82) / 0.18) + ')';
            mctx.fillRect(0, 0, w, h);
          }
        }

        bctx.clearRect(0, 0, w, h);
        for (const s of live) {
          const age = t - s.born;
          const a = age < 70 ? 1 : Math.max(0, 1 - (age - 70) / 240);
          if (a <= 0) continue;
          bctx.globalAlpha = a;
          const fat = s.fat;
          strokeBolt(bctx, s.main, (fat ? 18 : 11) * dpr, 'rgba(70,180,255,0.55)', 22 * dpr);
          strokeBolt(bctx, s.main, (fat ? 7 : 4.2) * dpr, 'rgba(170,230,255,0.95)', 8 * dpr);
          strokeBolt(bctx, s.main, (fat ? 2.4 : 1.6) * dpr, '#fff', 2 * dpr);
          for (const br of s.branches) {
            strokeBolt(bctx, br, 6 * dpr, 'rgba(80,190,255,0.4)', 12 * dpr);
            strokeBolt(bctx, br, 1.6 * dpr, '#eef9ff', 2 * dpr);
          }
        }
        bctx.globalAlpha = 1;
        flash *= 0.82;

        const shake = flash * 5 * dpr;
        ctx.setTransform(1, 0, 0, 1, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        ctx.fillStyle = '#0a0c10';
        ctx.fillRect(-8, -8, w + 16, h + 16);
        drawCoverImg(ctx, fromImg, w, h, 0.42);

        cctx.globalCompositeOperation = 'source-over';
        cctx.clearRect(0, 0, w, h);
        cctx.drawImage(dest, 0, 0);
        cctx.globalCompositeOperation = 'destination-in';
        cctx.drawImage(mask, 0, 0);
        cctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(cut, 0, 0);

        ctx.drawImage(bolts, 0, 0);
        if (flash > 0.02) {
          ctx.fillStyle = 'rgba(210, 236, 255,' + (flash * 0.55) + ')';
          ctx.fillRect(0, 0, w, h);
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        if (t >= FADE_AT) {
          if (!chromeBack) {
            chromeBack = true;
            document.body.classList.remove('lobby-fx-playing');
          }
          const fade = Math.min(1, (t - FADE_AT) / (TOTAL - FADE_AT));
          root.style.opacity = String(1 - fade);
        }

        if (t >= TOTAL) {
          root.style.opacity = '';
          finish();
          return;
        }
        lobbyFxRaf = requestAnimationFrame(frame);
      };
      lobbyFxRaf = requestAnimationFrame(frame);
    }).catch(() => {
      applyGameMode(toMode);
      finish();
    });
  }

  function syncRaidLobbyUi() {
    const raid = isRaidLobby();
    document.body.classList.toggle('raid-lobby', raid);
    const chromeBtn = document.getElementById('btn-lobby-chrome');
    if (chromeBtn) chromeBtn.textContent = document.body.classList.contains('lobby-chrome-hidden')
      ? 'Показать интерфейс'
      : 'Скрыть интерфейс';
    const title = document.querySelector('.lobby-party-col .section-title');
    if (title && !title.dataset.base) title.dataset.base = title.textContent;
    if (title) {
      title.textContent = raid
        ? 'Рейд (10 слотов) — 2 танка · 2 хила · 6 бойцов'
        : 'Отряд (5 слотов) — клик по слоту, чтобы заменить';
    }
    const slots = document.getElementById('party-slots');
    if (slots) slots.classList.toggle('raid-slots', raid);
    const preview = document.getElementById('skill-preview');
    if (preview && /отряд|рейд/i.test(preview.textContent) && !pickClass) {
      preview.textContent = raid
        ? 'Выберите класс, затем специализацию. Справа — рейд 10 (2 танка, 2 целителя, 6 бойцов).'
        : 'Выберите класс, затем специализацию. Справа — отряд (1 танк, 1 целитель, 3 бойца).';
    }
    const ds = document.getElementById('dungeon-select');
    if (ds) {
      if (raid) {
        ds.innerHTML = `<option value="throne">${RAID_DUNGEON.name}</option>`;
        ds.value = 'throne';
        ds.disabled = true;
      } else {
        const prev = ds.value === 'throne' ? 'crypts' : ds.value;
        ds.disabled = false;
        ds.innerHTML = DUNGEONS.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        if ([...ds.options].some(o => o.value === prev)) ds.value = prev;
      }
    }
    const start = document.getElementById('btn-start');
    if (start) start.textContent = raid ? 'Войти в рейд · Лэй Шэнь' : 'Взять ключ и войти';
    const fill = document.getElementById('btn-fill-raid');
    if (fill) fill.classList.toggle('hidden', !raid);
    const hint = document.getElementById('raid-hint');
    if (hint) hint.classList.toggle('hidden', !raid);
    document.getElementById('btn-mode-key')?.classList.toggle('on', !raid);
    document.getElementById('btn-mode-raid')?.classList.toggle('on', raid);
    const affixTitle = [...document.querySelectorAll('.lobby-party-col .section-title')]
      .find(el => /Аффикс/.test(el.textContent || ''));
    affixTitle?.classList.toggle('hidden', raid);
    document.getElementById('week-badge')?.classList.toggle('hidden', raid);
    document.getElementById('affix-list')?.classList.toggle('hidden', raid);
    refreshKeystone();
  }

  function fillRaidPreset() {
    party = RAID_PRESET.map(p => {
      const e = { classId: p.classId, specId: p.specId, sec: defaultSec(), gear: emptyGear() };
      ensureSec(e);
      return e;
    });
    editSlot = null;
    renderParty();
    savePartyProfile();
    toast('Собран рейд 10: 2 танка · 2 хила · 6 бойцов');
  }

  function shouldRaidAuto(actor) {
    if (!isRaidRun() || !actor || actor.side !== 'ally' || actor.isPet) return false;
    if (!raidAutoAllies) return false;
    if (!raidPlayerUid || !run.party.some(p => p.uid === raidPlayerUid && p.alive)) {
      const tank = run.party.find(p => p.role === 'tank' && p.alive);
      raidPlayerUid = tank?.uid || run.party.find(p => p.alive)?.uid || null;
    }
    return actor.uid !== raidPlayerUid;
  }

  function setRaidFocus(hero) {
    if (!isRaidRun() || !hero || hero.side !== 'ally' || hero.isPet) return;
    if (!hero.alive) return toast('Мёртв');
    raidPlayerUid = hero.uid;
    toast('Управляете: ' + (hero.fullName || hero.name));
    try { renderCombat(); } catch (_) {}
  }

  function raidFocusClass(u) {
    if (!isRaidRun() || !u || u.side !== 'ally' || u.isPet) return '';
    return u.uid === raidPlayerUid ? ' raid-focus' : '';
  }

  function currentMainTank(enemy) {
    const tanks = livingHeroes().filter(h => h.role === 'tank');
    if (!tanks.length) return livingHeroes()[0] || null;
    if (!enemy) return tanks[0];
    let mt = tanks[0], best = -1;
    for (const t of tanks) {
      const v = (enemy.threat && enemy.threat[t.uid]) || 0;
      if (v > best) { mt = t; best = v; }
    }
    return mt;
  }

  function raidBossTpl() {
    return (ENEMIES.raidBosses && ENEMIES.raidBosses.leishen) || null;
  }

  function spawnRaidEncounter() {
    const k = run.keyLevel;
    const tpl = raidBossTpl();
    if (!tpl) return [];
    const boss = scaleEnemy(tpl, k, true, false);
    boss.maxHp = Math.round(boss.maxHp * 1.15);
    boss.hp = boss.maxHp;
    boss.atk = Math.round(boss.atk * 1.08);
    boss.raidBoss = true;
    return [boss];
  }

  function bindRaidLobby() {
    preloadLobbyBgs();
    document.getElementById('btn-mode-key')?.addEventListener('click', () => setGameMode('key'));
    document.getElementById('btn-mode-raid')?.addEventListener('click', () => setGameMode('raid'));
    document.getElementById('btn-fill-raid')?.addEventListener('click', fillRaidPreset);
    document.getElementById('btn-lobby-chrome')?.addEventListener('click', () => {
      document.body.classList.toggle('lobby-chrome-hidden');
      const on = document.body.classList.contains('lobby-chrome-hidden');
      const btn = document.getElementById('btn-lobby-chrome');
      if (btn) btn.textContent = on ? 'Показать интерфейс' : 'Скрыть интерфейс';
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!document.body.classList.contains('lobby-chrome-hidden')) return;
      document.body.classList.remove('lobby-chrome-hidden');
      const btn = document.getElementById('btn-lobby-chrome');
      if (btn) btn.textContent = 'Скрыть интерфейс';
    });
    const auto = document.getElementById('btn-raid-auto');
    if (auto) {
      auto.addEventListener('click', () => {
        raidAutoAllies = !raidAutoAllies;
        auto.classList.toggle('on', raidAutoAllies);
        auto.textContent = raidAutoAllies ? 'Авто-рейд: вкл' : 'Авто-рейд: выкл';
        toast(raidAutoAllies
          ? 'Союзники ходят сами. Клик по герою — взять управление'
          : 'Вы ходите всеми десятью');
      });
    }
  }

  function raidHudPatch() {
    if (!isRaidRun()) return;
    const forces = document.getElementById('hud-forces');
    if (forces) {
      forces.textContent = '⚔ Рейд 10';
      forces.title = 'Тест рейдового босса на 10 человек';
    }
    const ff = document.getElementById('forces-fill');
    if (ff) {
      const boss = (combat?.enemies || []).find(e => e.isBoss && e.alive);
      const pct = boss ? clamp(boss.hp / Math.max(1, boss.maxHp) * 100, 0, 100) : 0;
      ff.style.width = pct + '%';
      ff.style.background = 'linear-gradient(90deg, #2a6a9a, #7ad0ff)';
    }
    const auto = document.getElementById('btn-raid-auto');
    if (auto) {
      auto.classList.remove('hidden');
      auto.classList.toggle('on', raidAutoAllies);
      auto.textContent = raidAutoAllies ? 'Авто-рейд: вкл' : 'Авто-рейд: выкл';
    }
    const allyTitle = document.querySelector('#ally-row')?.previousElementSibling;
    if (allyTitle) allyTitle.textContent = 'Рейд (клик — взять управление)';
  }

  function showRaidBriefing() {
    const el = document.getElementById('phase-sub');
    if (el) el.textContent = '';
  }

  function raidAllyAi(actor) {
    if (!actor?.alive) return false;
    const foes = living('enemy').filter(e => !e.vaultAway);
    const friends = livingHeroes();
    const usable = actor.abilities.filter(a => canPay(actor, a));
    if (!usable.length) return false;
    const boss = foes.find(e => e.isBoss) || foes[0];
    const conductors = foes.filter(e => e.mechRole === 'conductor' || e.mustKillTurns);
    const lowestAlly = (list) => {
      const a = (list || friends).filter(u => u && u.alive);
      if (!a.length) return null;
      return a.slice().sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
    };

    const casting = foes.find(e => e.casting);
    const kick = usable.find(a => typeof isKickAbility === 'function' ? isKickAbility(a) : (a.type === 'interrupt' || (typeof INTERRUPT_IDS !== 'undefined' && INTERRUPT_IDS.has(a.id))));
    if (casting && kick) {
      castAbility(actor, kick, casting);
      return true;
    }

    if (actor.role === 'tank') {
      const ov = (h) => (h.buffs || []).find(b => b.id === 'overload');
      const myStacks = ov(actor)?.stacks || 0;
      const other = friends.find(h => h.role === 'tank' && h.uid !== actor.uid);
      const otherStacks = other ? (ov(other)?.stacks || 0) : 0;
      const mt = currentMainTank(boss);
      const iAmMt = mt && mt.uid === actor.uid;
      const taunt = usable.find(a => a.type === 'taunt');
      if (taunt && other && otherStacks >= 2 && iAmMt === false) {
        castAbility(actor, taunt, null);
        return true;
      }
      if (taunt && myStacks >= 3 && iAmMt) {
        // too late — still try to hold with a def
      } else if (taunt && other && otherStacks >= 2 && iAmMt) {
        // stay, OT should taunt
      }
      if (actor.hp / actor.maxHp < 0.45) {
        const def = usable.find(a => (a.type === 'shield' || a.type === 'buff') && abilityTargetRule(a) === 'self_only');
        if (def) { castAbility(actor, def, actor); return true; }
      }
    }

    if (actor.role === 'healer') {
      const crit = lowestAlly(friends.filter(h => h.hp / h.maxHp < 0.55));
      const any = lowestAlly(friends.filter(h => h.hp < h.maxHp));
      const aoeHeal = usable.find(a => a.type === 'heal_aoe');
      const hurtCount = friends.filter(h => h.hp / h.maxHp < 0.8).length;
      if (aoeHeal && hurtCount >= 3) { castAbility(actor, aoeHeal, actor); return true; }
      const heal = usable.find(a => a.type === 'heal');
      const target = crit || (any && any.hp / any.maxHp < 0.92 ? any : null);
      if (heal && target) {
        castAbility(actor, heal, abilityTargetRule(heal) === 'self_only' ? actor : target);
        return true;
      }
    }

    const prio = conductors[0] || boss || foes[0];
    if (!prio) return false;
    const exec = usable.find(a => typeof EXECUTE_IDS !== 'undefined' && EXECUTE_IDS.has(a.id));
    if (exec && prio.hp / prio.maxHp <= 0.35) { castAbility(actor, exec, prio); return true; }
    const aoe = usable.find(a => a.type === 'aoe');
    if (aoe && foes.length >= 2) { castAbility(actor, aoe, null); return true; }
    const dmg = usable.find(a => a.type === 'damage' || a.type === 'dot') || usable[0];
    if (dmg) {
      const rule = abilityTargetRule(dmg);
      if (rule === 'self_only') castAbility(actor, dmg, actor);
      else if (rule === 'ally_any') castAbility(actor, dmg, lowestAlly() || actor);
      else castAbility(actor, dmg, prio);
      return true;
    }
    return false;
  }

  const VAULT_LOC = 'depths';
  const VAULT_WAVES = [
    [{ addId: 'b', addName: 'Страж дворца', addHp: 0.55 }, { addId: 'a', addName: 'Копейщик династии', addHp: 0.5 }, { addId: 'r', addName: 'Жрец грома', addHp: 0.48 }],
    [{ addId: 'c', addName: 'Капитан стражи', addHp: 0.55 }, { addId: 'j', addName: 'Нефритовый палач', addHp: 0.5 }, { addId: 's', addName: 'Ткач молний', addHp: 0.48 }],
    [{ addId: 'sg', addName: 'Хранитель свода', addHp: 0.62 }, { addId: 'b', addName: 'Каменный страж', addHp: 0.58 }],
  ];
  const VAULT_CAST_MAX = 8;

  function raidBossPortraitUrl() {
    try { return ASSETS.enemyP('ls'); } catch (_) { return ''; }
  }

  function raidPhaseTitle() {
    const boss = (combat?.enemies || []).find(e => e.raidBoss || (e.isBoss && e.mech?.id === 'thunder_king'));
    if (combat?.vault && !combat.vault.dropped) return 'Под дворцом';
    if (!boss) return 'Рейд 10';
    const r = boss.hp / Math.max(1, boss.maxHp);
    if (r <= 0.15) return 'Ярость императора';
    if (r <= 0.40) return 'Расколотое небо';
    if (r <= 0.50) return 'Провал';
    if (r <= 0.70) return 'Зал проводников';
    return 'Престол грома';
  }

  function refreshRaidAlerts() {
    const nameEl = document.getElementById('raid-phase-name');
    const box = document.getElementById('raid-alerts');
    const hud = document.getElementById('raid-phase-hud');
    if (!isRaidRun()) {
      hud?.classList.add('hidden');
      document.getElementById('raid-cast-dock')?.classList.add('hidden');
      return;
    }
    if (nameEl) nameEl.textContent = raidPhaseTitle();
    const bits = [];
    const heroes = typeof livingHeroes === 'function' ? livingHeroes() : [];
    const ov = heroes.filter(h => (h.buffs || []).some(b => b.id === 'overload'));
    for (const h of ov) {
      const s = (h.buffs.find(b => b.id === 'overload') || {}).stacks || 1;
      bits.push(`<span class="raid-alert warn">${h.name}: перегрузка ×${s}${s >= 2 ? ' — смена!' : ''}</span>`);
    }
    const conds = (combat?.enemies || []).filter(e => e.alive && e.mechRole === 'conductor');
    for (const c of conds) {
      bits.push(`<span class="raid-alert danger">${c.name}: взрыв через ${c.mustKillTurns || '?'} р.</span>`);
    }
    const soaks = heroes.filter(h => (h.buffs || []).some(b => b.id === 'soak_orb'));
    if (combat?.soakNeed) {
      bits.push(`<span class="raid-alert soak">Соки: клик по герою · ${soaks.length}/${combat.soakNeed}</span>`);
    } else if (soaks.length) {
      bits.push(`<span class="raid-alert soak">Сок: ${soaks.map(h => h.name).join(', ')} (HP &gt; 35%)</span>`);
    }
    const marks = heroes.filter(h => (h.buffs || []).some(b => b.id === 'storm_mark'));
    if (marks.length) {
      const linked = marks.length >= 2 && marks.every(h => !h.raidSpread);
      bits.push(`<span class="raid-alert${linked ? ' danger' : ''}">Молния: ${marks.map(h => h.name + (h.raidSpread ? ' (отошёл)' : '')).join(', ')}${linked ? ' — связаны!' : ''}</span>`);
    }
    if (box) box.innerHTML = bits.join(' ');
    if (hud) hud.classList.toggle('hidden', !bits.length);
    const dock = document.getElementById('raid-cast-dock');
    if (dock && combat?.vault && !combat.vault.dropped) {
      dock.classList.remove('hidden');
      const img = document.getElementById('raid-cast-portrait');
      if (img && !img.src) img.src = raidBossPortraitUrl();
      const fill = document.getElementById('raid-cast-fill');
      const pct = Math.round((combat.vault.cast / Math.max(1, combat.vault.castMax)) * 100);
      if (fill) fill.style.width = pct + '%';
      const sp = document.getElementById('raid-cast-spell');
      if (sp) sp.textContent = 'Небесный гнев · ' + combat.vault.cast + '/' + combat.vault.castMax;
    } else {
      dock?.classList.add('hidden');
    }
  }

  function startRaidSoakAssign(n) {
    if (!combat) return;
    combat.soakNeed = n || 3;
    log('Сферы молнии! Кликните ' + combat.soakNeed + ' героев — они сокают (держите HP выше 35%).', 'system');
    toast('Кликните ' + combat.soakNeed + ' героев для сока');
    refreshRaidAlerts();
    try { renderCombat(); } catch (_) {}
  }

  function tryAssignRaidSoak(unit) {
    if (!combat?.soakNeed || !unit || !unit.alive || unit.isPet) return false;
    if ((unit.buffs || []).some(b => b.id === 'soak_orb')) {
      toast('Уже назначен');
      return true;
    }
    const have = (typeof livingHeroes === 'function' ? livingHeroes() : []).filter(h => (h.buffs || []).some(b => b.id === 'soak_orb')).length;
    if (have >= combat.soakNeed) return false;
    applyStatus(unit, {
      id: 'soak_orb', name: 'Сфера молнии', icon: '💠', turns: 3,
      tip: 'Сок: останьтесь выше 35% HP, иначе сфера рванёт рейд.',
    });
    log(unit.name + ' принимает сферу (' + (have + 1) + '/' + combat.soakNeed + ')', 'system');
    if (have + 1 >= combat.soakNeed) {
      combat.soakNeed = 0;
      toast('Соки назначены');
    }
    refreshRaidAlerts();
    try { renderCombat(); } catch (_) {}
    return true;
  }

  function linkRaidStormMarks() {
    const marks = (typeof livingHeroes === 'function' ? livingHeroes() : []).filter(h =>
      (h.buffs || []).some(b => b.id === 'storm_mark'));
    if (marks.length < 2) return;
    if (marks.every(h => !h.raidSpread)) {
      for (const h of marks) {
        const b = (h.buffs || []).find(x => x.id === 'storm_mark');
        if (b && !b._linked) {
          b.dot = Math.round((Number(b.dot) || 0) * 2);
          b._linked = true;
          b.name = 'Метка молнии (связь)';
        }
      }
      log('Метки молнии связались — тик удвоен. На своём ходу: «Разойтись».', 'enemy');
      toast('Метки связались!');
    }
    refreshRaidAlerts();
  }

  function onRaidTaunt(actor) {
    if (!isRaidRun() || !actor || actor.role !== 'tank') return;
    for (const h of (typeof livingHeroes === 'function' ? livingHeroes() : [])) {
      if (h.uid === actor.uid) continue;
      if ((h.buffs || []).some(b => b.id === 'overload')) {
        h.buffs = h.buffs.filter(b => b.id !== 'overload');
        log(actor.name + ' принимает удар — перегрузка с ' + h.name + ' сброшена.', 'player');
        toast('Смена танков!');
      }
    }
    refreshRaidAlerts();
  }

  function forceBattleLoc(loc) {
    if (!combat) return;
    combat.battleLoc = loc;
    const ba = document.getElementById('battle-area');
    if (ba) delete ba.dataset.bgUrl;
    if (typeof applyRoomBackground === 'function') applyRoomBackground(currentRouteNode());
  }

  function playFloorCrack(toLoc, onDone) {
    const layer = document.getElementById('raid-fx-layer');
    const ba = document.getElementById('battle-area');
    if (!layer || !ba) { forceBattleLoc(toLoc); if (onDone) onDone(); return; }
    combat.vaultLock = true;
    const from = getComputedStyle(ba).getPropertyValue('--battle-bg') || '';
    layer.classList.remove('hidden');
    layer.innerHTML = '<div class="raid-flash"></div><div class="raid-shatter"></div>';
    const grid = layer.querySelector('.raid-shatter');
    const cols = 5, rows = 4;
    for (let i = 0; i < cols * rows; i++) {
      const t = document.createElement('i');
      const c = i % cols, r = Math.floor(i / cols);
      t.style.backgroundImage = from;
      t.style.backgroundSize = (cols * 100) + '% ' + (rows * 100) + '%';
      t.style.backgroundPosition = (c / (cols - 1) * 100) + '% ' + (r / (rows - 1) * 100) + '%';
      t.style.setProperty('--dx', ((c - 2) * 80) + 'px');
      t.style.setProperty('--dy', (40 + r * 70) + 'px');
      t.style.setProperty('--rot', ((c % 2 ? 1 : -1) * (12 + r * 8)) + 'deg');
      t.style.animationDelay = (i * 18) + 'ms';
      grid.appendChild(t);
    }
    forceBattleLoc(toLoc);
    setTimeout(() => {
      layer.classList.add('hidden');
      layer.innerHTML = '';
      combat.vaultLock = false;
      if (onDone) onDone();
    }, 1100);
  }

  function spawnVaultWave() {
    const boss = (combat.enemies || []).find(e => e.raidBoss || (e.isBoss && e.mech?.id === 'thunder_king'));
    if (!boss || !combat.vault) return;
    const wave = VAULT_WAVES[combat.vault.wave];
    if (!wave) return;
    for (const spec of wave) {
      const add = spawnMechAdd(boss, { ...spec, role: 'vault_trash' });
      if (add) add.mustKillTurns = 0;
    }
    combat.vault.wave += 1;
    log('Волна стражи ' + combat.vault.wave + '/' + VAULT_WAVES.length + ' — убейте быстрее, пока каст не заполнится!', 'enemy');
    toast('Волна ' + combat.vault.wave + ' · бейте треш');
    try { if (typeof buildTurnQueue === 'function') buildTurnQueue(); } catch (_) {}
    try { renderCombat(); } catch (_) {}
    refreshRaidAlerts();
  }

  function maybeTriggerRaidVault(target) {
    if (!isRaidRun() || !target || !target.alive) return;
    if (!target.raidBoss && !(target.isBoss && target.mech && target.mech.id === 'thunder_king')) return;
    if (target._vaultInter) return;
    if (target.hp / Math.max(1, target.maxHp) > 0.5) return;
    target._vaultInter = true;
    beginRaidVault(target);
  }

  function beginRaidVault(boss) {
    if (!combat || !boss) return;
    (combat.enemies || []).forEach(e => {
      if (e.mechRole === 'conductor' && e.alive) { e.alive = false; e.hp = 0; }
    });
    boss.vaultAway = true;
    combat.vault = { wave: 0, cast: 0, castMax: VAULT_CAST_MAX, dropped: false };
    const img = document.getElementById('raid-cast-portrait');
    if (img) img.src = raidBossPortraitUrl();
    log('Пол рушится! Рейд проваливается под дворец. Лэй Шэнь читает Небесный гнев — не дайте шкале заполниться.', 'enemy');
    toast('Провал под дворец!');
    playFloorCrack(VAULT_LOC, () => {
      spawnVaultWave();
      refreshRaidAlerts();
      if (typeof scheduleProcessTurn === 'function') scheduleProcessTurn(80);
    });
  }

  function tickRaidVaultCast(boss) {
    if (!combat?.vault || combat.vault.dropped) return;
    combat.vault.cast = (combat.vault.cast || 0) + 1;
    refreshRaidAlerts();
    if (combat.vault.cast >= combat.vault.castMax) {
      combat.vault.cast = 0;
      const heroes = typeof livingHeroes === 'function' ? livingHeroes() : [];
      for (const h of heroes) {
        if (!h.alive) continue;
        const raw = Math.round(h.maxHp * 0.8);
        dealTrue(h, raw, boss, 'aoe', { school: 'nature', abilityName: 'Небесный гнев', isAoe: true });
      }
      log('Небесный гнев! Весь рейд получает 80% здоровья.', 'enemy');
      toast('Небесный гнев — 80%!');
    }
    raidVaultMaybeAdvance();
  }

  function playBossFall(onDone) {
    const dock = document.getElementById('raid-cast-dock');
    const layer = document.getElementById('raid-fx-layer');
    if (!dock || !layer) { if (onDone) onDone(); return; }
    combat.vaultLock = true;
    const img = document.getElementById('raid-cast-portrait');
    const r = img ? img.getBoundingClientRect() : dock.getBoundingClientRect();
    layer.classList.remove('hidden');
    const ghost = document.createElement('img');
    ghost.className = 'raid-boss-fall';
    ghost.src = (img && img.src) || raidBossPortraitUrl();
    ghost.style.left = r.left + 'px';
    ghost.style.top = r.top + 'px';
    ghost.style.width = r.width + 'px';
    ghost.style.height = r.height + 'px';
    layer.appendChild(ghost);
    dock.classList.add('hidden');
    requestAnimationFrame(() => {
      ghost.style.left = 'calc(50% - 70px)';
      ghost.style.top = '42%';
      ghost.style.width = '140px';
      ghost.style.height = '140px';
      ghost.style.transform = 'rotate(12deg)';
    });
    setTimeout(() => {
      layer.classList.add('hidden');
      layer.innerHTML = '';
      combat.vaultLock = false;
      if (onDone) onDone();
    }, 900);
  }

  function dropBossIntoVault() {
    if (!combat?.vault || combat.vault.dropped) return;
    combat.vault.dropped = true;
    const boss = (combat.enemies || []).find(e => e.raidBoss || (e.isBoss && e.mech?.id === 'thunder_king'));
    playBossFall(() => {
      if (boss) {
        boss.vaultAway = false;
        log('Лэй Шэнь обрушивается в свод! Фон тот же — добивайте его здесь.', 'enemy');
        toast('Босс падает в комнату!');
      }
      try { if (typeof buildTurnQueue === 'function') buildTurnQueue(); } catch (_) {}
      try { renderCombat(); } catch (_) {}
      refreshRaidAlerts();
      if (typeof scheduleProcessTurn === 'function') scheduleProcessTurn(80);
    });
  }

  function raidVaultMaybeAdvance() {
    if (!isRaidRun() || !combat?.vault || combat.vault.dropped) return;
    const trash = (combat.enemies || []).filter(e => e.alive && !e.raidBoss && !e.vaultAway && e.mechRole === 'vault_trash');
    if (trash.length) return;
    if (combat.vault.wave < VAULT_WAVES.length) spawnVaultWave();
    else dropBossIntoVault();
  }

  const _raidHudPatchBase = raidHudPatch;
  raidHudPatch = function () {
    _raidHudPatchBase();
    refreshRaidAlerts();
  };
