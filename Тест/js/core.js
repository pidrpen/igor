/* core: class colors, patched specs, portraits, dungeon themes */
/* core: balance panel, FX, art, helpers */
  // ═══════════════════════════════════════════════════
  //  Mythic Key + WoW MoP classes/specs/resources
  // ═══════════════════════════════════════════════════

  if (!window.WOW_MOP) {
    document.body.innerHTML = '<p style="color:#fff;padding:2rem">Не загрузился <b>wow-mop-data.js</b>. Открой папку через локальный сервер или оба файла рядом.</p>';
    throw new Error('WOW_MOP missing');
  }

  const ROLE_LABEL = { tank: 'Танк', healer: 'Целитель', dps: 'Боец' };
  const ROLE_CLASS = { tank: 'role-tank', healer: 'role-healer', dps: 'role-dps' };
  const CLASS_CSS = {
    warrior: 'var(--warrior)', paladin: 'var(--paladin)', hunter: 'var(--hunter)',
    rogue: 'var(--rogue)', priest: 'var(--priest)', deathknight: 'var(--dk)',
    shaman: 'var(--shaman)', mage: 'var(--mage)', warlock: 'var(--warlock)',
    monk: 'var(--monk)', druid: 'var(--druid)', engineer: 'var(--engineer)',
    demonhunter: 'var(--dh)',
    cheat: '#ff4dd2',
  };
  /** Спек-оверрайд цвета контура (отряд / портрет). Unholy DK — зелёный. */
  const SPEC_ACCENT_CSS = {
    'deathknight:unholy': 'var(--dk-unholy)',
  };
  const ROLE_CSS = { tank: 'var(--tank)', healer: 'var(--heal)', dps: 'var(--dps)' };

  /** Цвет рамки класса (с учётом спека: ДК Нечестивость → зелёный). */
  function classAccentColor(classId, specId) {
    if (classId && specId) {
      const key = classId + ':' + specId;
      if (SPEC_ACCENT_CSS[key]) return SPEC_ACCENT_CSS[key];
    }
    return CLASS_CSS[classId] || 'var(--gold)';
  }

  /** Открытые спеки лобби. Бейдж «Тест» снят — киты залиты. */
  const PATCHED_SPECS = new Set([
    'warrior:arms', 'warrior:fury', 'warrior:protection',
    'paladin:holy', 'paladin:protection', 'paladin:retribution',
    'hunter:beast_mastery', 'hunter:marksmanship', 'hunter:survival',
    'rogue:assassination', 'rogue:combat', 'rogue:subtlety',
    'priest:discipline', 'priest:holy', 'priest:shadow',
    'deathknight:blood', 'deathknight:frost', 'deathknight:unholy',
    'shaman:elemental', 'shaman:enhancement', 'shaman:restoration',
    'mage:arcane', 'mage:fire', 'mage:frost',
    'warlock:affliction', 'warlock:demonology', 'warlock:destruction',
    'monk:brewmaster', 'monk:mistweaver', 'monk:windwalker',
    'druid:balance', 'druid:feral', 'druid:guardian', 'druid:restoration',
    'engineer:mechanist', 'engineer:sapper', 'engineer:tinkerer',
    'demonhunter:vengeance', 'demonhunter:havoc',
    'cheat:debug',
  ]);
  const TEST_SPECS = new Set(['cheat:debug']);
  function isTestSpec(classId, specId) {
    return TEST_SPECS.has(classId + ':' + specId);
  }
  function isSpecPatched(classId, specId) {
    return PATCHED_SPECS.has(classId + ':' + specId);
  }
  function isClassPatched(classId) {
    for (const key of PATCHED_SPECS) {
      if (key.startsWith(classId + ':')) return true;
    }
    return false;
  }
  function classRoleList(cls) {
    const order = ['tank', 'healer', 'dps'];
    const roles = [...new Set((cls.specs || []).map(s => s.role))];
    return order.filter(r => roles.includes(r));
  }
  function roleChipsHtml(roles) {
    return '<div class="roles">' + roles.map(r =>
      `<span class="role-chip ${ROLE_CLASS[r]}">${ROLE_LABEL[r]}</span>`
    ).join('') + '</div>';
  }

  /**
   * История баланса. Версии: 5.4.8 → 5.4.8.01 → 5.4.8.02 …
   * Старт лога — с блокировки классов (5.4.8). Дальше каждый ребаланс = +0.01.
   * Новые правки добавляй В НАЧАЛО массива BALANCE_HISTORY (свежие сверху).
   */
  const ASSETS = {
    base: (function () {
      try {
        const el = document.querySelector('script[src*="js/core.js"]');
        if (el && el.src) return new URL('../assets/', el.src).href;
      } catch (_) { /* ignore */ }
      try { return new URL('assets/', document.baseURI || location.href).href; } catch (_) { /* ignore */ }
      return 'assets/';
    })(),
    classP(id) { return this.base + 'portraits/classes/' + id + '.png'; },
    specP(classId, specId) { return this.base + 'portraits/specs/' + classId + '_' + specId + '.png'; },
    enemyP(id) { return this.base + 'portraits/enemies/' + id + '.png'; },
    petP(id) { return this.base + 'portraits/pets/' + id + '.png'; },
    /** Per-room battle backdrop: assets/backgrounds/{theme}/{loc}.png → fallback theme.png */
    bg(theme, loc) {
      const t = theme || 'crypt';
      if (loc) return this.base + 'backgrounds/' + t + '/' + loc + '.png';
      return this.base + 'backgrounds/' + t + '.png';
    },
  };
  /**
   * Route node → location art key (progression through the dungeon).
   * Files live in assets/backgrounds/{crypt|forge|tide|jade|rift|ember}/{key}.png
   */
  const NODE_LOC = {
    start: 'entrance',
    hall: 'corridor',
    fork1a: 'gallery',
    fork1b: 'elite',
    mid: 'mid',
    descent: 'depths',
    fork2a: 'inner',
    fork2b: 'sanctum',
    approach: 'approach',
    final: 'throne',
    mop1: 'mopup',
    mop2: 'annex',
    mop3: 'gallery',
  };
  /** If a new loc file is missing, fall back to a neighbouring room of the same dungeon. */
  const LOC_FALLBACK = {
    inner: 'depths', sanctum: 'elite', approach: 'mid', annex: 'mopup',
    champion: 'elite', hall: 'corridor', descent: 'depths',
  };
  /** Fallback by room type if node id unknown */
  const TYPE_LOC = {
    trash: 'corridor', elite: 'elite', boss: 'mid', final: 'throne', rest: 'rest',
  };
  function artHtml(src, emoji, extraClass, extraStyle) {
    const em = emoji || '✨';
    const st = extraStyle ? ` style="${extraStyle}"` : '';
    return `<span class="art-wrap ${extraClass || ''}"${st}>` +
      `<img class="art-img" src="${src}" alt="" loading="lazy" onerror="this.parentNode.classList.add('no-art')"/>` +
      `<span class="art-emoji">${em}</span></span>`;
  }
  function portraitSrc(u) {
    if (!u) return null;
    if (u.isPet) return ASSETS.petP(u.petKey || 'imp');
    if (u.side === 'enemy') return ASSETS.enemyP(u.heroId || u.id || 'z');
    // Prefer class+spec art in combat; fall back to class
    if (u.classId && u.specId) return ASSETS.specP(u.classId, u.specId);
    if (u.classId) return ASSETS.classP(u.classId);
    return null;
  }
  function applyDungeonTheme(theme) {
    const themes = ['theme-crypt', 'theme-forge', 'theme-tide', 'theme-jade', 'theme-rift', 'theme-ember'];
    const t = theme !== undefined ? theme : (run?.dungeon?.theme || null);
    document.body.classList.remove(...themes);
    const ba = document.getElementById('battle-area');
    if (ba) {
      ba.classList.remove(...themes);
      if (!t) ba.style.removeProperty('--battle-bg');
    }
    if (t) {
      document.body.classList.add('theme-' + t);
      if (ba) ba.classList.add('theme-' + t);
    }
  }
  /** Switch battle backdrop to match current route node (dungeon progression). */
  function applyRoomBackground(nodeOrId) {
    const theme = run?.dungeon?.theme || 'crypt';
    const node = typeof nodeOrId === 'string'
      ? (run?.route?.nodes?.[nodeOrId] || null)
      : (nodeOrId || currentRouteNode());
    const id = node?.id || (typeof nodeOrId === 'string' ? nodeOrId : null);
    const loc = (typeof combat !== 'undefined' && combat && combat.battleLoc)
      || (node && node.loc)
      || (id && NODE_LOC[id])
      || (node && TYPE_LOC[node.type])
      || 'entrance';
    applyDungeonTheme(theme);
    const ba = document.getElementById('battle-area');
    if (!ba) return;

    // Каждый ключ — только свои тематические фоны; комнаты отличаются по loc
    const artTheme = theme;
    const url = ASSETS.bg(artTheme, loc);
    // Не мигаем: если URL уже тот же — не трогаем
    // Quote URL for CSS (absolute file/http URLs may contain spaces / Cyrillic)
    const toCssUrl = (u) => `url(${JSON.stringify(String(u))})`;
    if (ba.dataset.bgUrl === url) return;
    ba.dataset.bgUrl = url;

    const img = new Image();
    img.onload = () => { ba.style.setProperty('--battle-bg', toCssUrl(url)); };
    img.onerror = () => {
      const alt = LOC_FALLBACK[loc];
      if (alt && alt !== loc) {
        const altUrl = ASSETS.bg(artTheme, alt);
        ba.dataset.bgUrl = altUrl;
        const img2 = new Image();
        img2.onload = () => { ba.style.setProperty('--battle-bg', toCssUrl(altUrl)); };
        img2.onerror = () => {
          const fallback = ASSETS.bg(artTheme);
          ba.dataset.bgUrl = fallback;
          ba.style.setProperty('--battle-bg', toCssUrl(fallback));
        };
        img2.src = altUrl;
        return;
      }
      const fallback = ASSETS.bg(artTheme);
      ba.dataset.bgUrl = fallback;
      ba.style.setProperty('--battle-bg', toCssUrl(fallback));
    };
    img.src = url;
  }
  function spawnConfetti() {
    if (!juiceOk()) return;
    for (let i = 0; i < 28; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = ['#e0c060', '#c77dff', '#3dd68c', '#4da3ff', '#ff6b6b'][i % 5];
      p.style.animationDelay = (Math.random() * 0.5) + 's';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 2800);
    }
  }
  function refreshKeystone() {
    const el = document.getElementById('ks-level');
    const nm = document.getElementById('ks-name');
    if (typeof isRaidLobby === 'function' && isRaidLobby()) {
      if (el) el.textContent = (typeof raidDiffLabel === 'function') ? raidDiffLabel() : 'Обычный';
      if (nm) nm.textContent = 'Лэй Шэнь, Повелитель Грома';
      return;
    }
    const lvl = document.getElementById('key-level')?.value || '5';
    const dun = DUNGEONS.find(d => d.id === document.getElementById('dungeon-select')?.value);
    if (el) el.textContent = '+' + lvl;
    if (nm) nm.textContent = dun ? dun.name : '—';
  }
