/* Песочница прокачки: один паладин, 1–40, таланты, LFD, бой. Основа не подключается. */
(function (G) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const uid = () => Math.random().toString(36).slice(2, 9);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  };

  function fmt(n) {
    const v = Math.round(Number(n) || 0);
    const neg = v < 0 ? '-' : '';
    const a = Math.abs(v);
    if (a >= 1e6) return neg + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'м';
    if (a >= 1000) return neg + (a / 1000).toFixed(a >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'т';
    return neg + String(a);
  }

  let toastT = null;
  function toast(msg) {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show'), 1800);
  }

  function log(msg, kind) {
    const box = $('log');
    if (!box) return;
    const d = document.createElement('div');
    d.className = kind || 'system';
    d.textContent = msg;
    box.prepend(d);
    while (box.children.length > 80) box.lastChild.remove();
  }

  function xpToNext(lv) {
    return Math.round(36 * Math.pow(lv, 1.12) + 22);
  }
  function levelFactor(lv) {
    const t = (Math.max(1, Math.min(G.MAX_LEVEL, lv)) - 1) / (G.MAX_LEVEL - 1);
    return 0.22 + 0.78 * Math.pow(t, 1.12);
  }
  function packXp(type, lv) {
    if (type === 'trash') return 16 + lv * 5;
    if (type === 'elite') return 32 + lv * 8;
    if (type === 'boss') return 60 + lv * 12;
    if (type === 'final') return 100 + lv * 18;
    return 10 + lv * 3;
  }
  function clearXp(lv) { return 50 + lv * 12; }

  function talentPicks(tier, specId) {
    if (tier.bySpec) return tier.bySpec[specId] || [];
    return tier.picks || [];
  }
  function hasTalent(id) {
    return !!(hero && hero.talents && Object.values(hero.talents).includes(id));
  }
  function unlockedTalents() {
    if (!hero) return [];
    return G.TALENT_TIERS.filter(t => hero.level >= t.level);
  }
  function pendingTalentTier() {
    if (!hero) return null;
    return G.TALENT_TIERS.find(t => hero.level >= t.level && !hero.talents[t.id]) || null;
  }

  let hero = null;
  let run = null;
  let combat = null;
  let pendingTarget = null;
  let pickSpec = null;
  let gameSpeed = 1;
  let aiTimer = null;
  let queuedDungeon = null;
  let queuedParty = null;

  function specOf(id) { return G.SPECS[id]; }

  function computeSheet(h) {
    const spec = specOf(h.specId);
    const f = levelFactor(h.level);
    let hp = spec.stats.hp * f * G.STAT_SCALE;
    let atk = spec.stats.atk * f * G.STAT_SCALE;
    let def = spec.stats.def * f * G.STAT_SCALE;
    let speed = spec.stats.speed;
    if (hasTalent('speed_of_light')) speed += 2;
    if (hasTalent('oathbound')) { hp *= 1.12; def *= 1.08; }
    if (hasTalent('blade_justice')) atk *= 1.12;
    const critRating = Math.round(40 + (h.level - 1) * (60 / 39));
    const masteryRating = Math.round(50 + (h.level - 1) * (70 / 39));
    const versRating = Math.round((h.level - 1) * (8 / 39));
    let critPct = (critRating / 100) * 0.18;
    if (hasTalent('blade_justice')) critPct += 0.04;
    const masteryPct = (masteryRating / 120) * (spec.mastery.pctAt120 / 100) + (hasTalent('master_light') ? 0.08 : 0);
    return {
      maxHp: Math.round(hp), atk: Math.round(atk), def: Math.round(def), speed,
      critRating, masteryRating, versRating,
      critPct: clamp(critPct, 0.05, 0.75),
      masteryPct: Math.max(0, masteryPct),
      manaRegen: spec.manaRegen,
    };
  }

  function applySheetToUnit(u, keepRatio) {
    const s = computeSheet(hero);
    const ratio = keepRatio && u.maxHp ? u.hp / u.maxHp : 1;
    u.maxHp = s.maxHp; u.atk = s.atk; u.def = s.def; u.speed = s.speed;
    u.hp = clamp(Math.round(u.maxHp * ratio), u.alive === false ? 0 : 1, u.maxHp);
    u.critPct = s.critPct;
    u.masteryPct = s.masteryPct;
    if (u.res && u.res.primary) u.res.primary.regen = s.manaRegen;
  }

  function unlockedAbs(specId, level) {
    return (G.PALADIN_ABS[specId] || []).filter(a => level >= (a.unlock || 1)).map(cloneAb);
  }
  function cloneAb(a) {
    const x = JSON.parse(JSON.stringify(a));
    x.baseCd = a.cd || 0;
    x.curCd = 0;
    return x;
  }

  function injectTalentAbs(list) {
    if (hasTalent('sacrifice')) {
      list.push(cloneAb({
        id: 'sacrifice', name: 'Длань жертвенности', icon: '🤲', type: 'ally_buff',
        school: 'none', freeAction: true, cd: 99, unlock: 32,
        d: 'Раз в бой: 30% входящего союзника → тебе, 2 хода',
      }));
    }
    if (hasTalent('bubble')) {
      list.push(cloneAb({
        id: 'bubble', name: 'Божественный щит', icon: '💠', type: 'buff',
        school: 'none', freeAction: true, cd: 99, unlock: 32,
        d: 'Раз в инст: следующий удар = 0',
      }));
    }
    return list;
  }

  function restatPlayerInRun() {
    if (!run || !hero) return;
    const me = run.party.find(p => p.isPlayer);
    if (!me) return;
    applySheetToUnit(me, true);
    const have = new Set(me.abilities.map(a => a.id));
    const want = injectTalentAbs(unlockedAbs(hero.specId, hero.level));
    for (const a of want) {
      if (hasTalent('ash_storm') && a.id === 'divine_storm') a.costSec = 3;
      if (hasTalent('unbreakable') && a.id === 'ardent') { a.cd = 4; a.baseCd = 4; }
      if (hasTalent('hallowed_ground') && a.id === 'consecrate' && a.applyDot) a.applyDot.turns = 6;
      if (hasTalent('hallowed_ground') && a.id === 'judgment') a.judgmentConsecrateSplash = 0.8;
      if (hasTalent('holy_bulwark') && a.id === 'avengers') a.shieldFromDmg = 0.4;
      if (!have.has(a.id)) me.abilities.push(a);
    }
  }

  function save() {
    if (!hero) { try { localStorage.removeItem(G.SAVE_KEY); } catch (_) {} return; }
    try { localStorage.setItem(G.SAVE_KEY, JSON.stringify(hero)); } catch (_) {}
  }
  function load() {
    try {
      const raw = localStorage.getItem(G.SAVE_KEY);
      if (!raw) return null;
      const h = JSON.parse(raw);
      if (!h || !h.specId || !G.SPECS[h.specId]) return null;
      h.talents = h.talents || {};
      h.firstClears = h.firstClears || {};
      h.stats = h.stats || { instances: 0, kills: 0, wipes: 0 };
      return h;
    } catch (_) { return null; }
  }

  function newHero(name, specId) {
    return {
      name: (name || 'Паладин').trim().slice(0, 18) || 'Паладин',
      specId,
      level: 1,
      xp: 0,
      talents: {},
      firstClears: {},
      stats: { instances: 0, kills: 0, wipes: 0 },
      created: Date.now(),
    };
  }

  function gainXp(amount, reason) {
    amount = Math.max(0, Math.round(amount));
    if (!hero || !amount) return [];
    if (hero.level >= G.MAX_LEVEL) {
      log('+' + amount + ' опыта (' + reason + ') — уровень уже 40', 'xp');
      return [];
    }
    hero.xp += amount;
    log('+' + amount + ' опыта · ' + reason, 'xp');
    const dings = [];
    while (hero.level < G.MAX_LEVEL && hero.xp >= xpToNext(hero.level)) {
      hero.xp -= xpToNext(hero.level);
      hero.level += 1;
      dings.push(hero.level);
      log(hero.name + ' достигает уровня ' + hero.level + '!', 'xp');
      toast('Уровень ' + hero.level);
    }
    if (hero.level >= G.MAX_LEVEL) hero.xp = 0;
    if (run) restatPlayerInRun();
    save();
    refreshHud();
    return dings;
  }

  /* ---------- UI: create / hub ---------- */
  function show(id) {
    ['create', 'hub', 'run-screen', 'queue-overlay', 'brief-overlay'].forEach(x => {
      const el = $(x);
      if (el) el.classList.toggle('hidden', x !== id);
    });
    if (id === 'run-screen') $('run-screen').classList.remove('hidden');
  }

  function renderCreate() {
    const grid = $('spec-grid');
    grid.innerHTML = '';
    Object.values(G.SPECS).forEach(s => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'spec-card' + (pickSpec === s.id ? ' on' : '');
      b.innerHTML =
        '<img alt="" src="' + G.PORTRAIT('paladin', s.id) + '" />' +
        '<div class="sn">' + s.icon + ' ' + s.name + '</div>' +
        '<div class="u-role ' + (s.role === 'tank' ? 'role-tank' : s.role === 'healer' ? 'role-healer' : 'role-dps') + '">' + G.ROLE_LABEL[s.role] + '</div>' +
        '<div style="font-size:.75rem;color:var(--muted)">HP ' + s.stats.hp + ' · атака ' + s.stats.atk + ' · защ. ' + s.stats.def + '</div>';
      b.onclick = () => { pickSpec = s.id; renderCreate(); };
      grid.appendChild(b);
    });
    $('btn-create').disabled = !pickSpec;
  }

  function renderHub() {
    if (!hero) { show('create'); return; }
    show('hub');
    const spec = specOf(hero.specId);
    $('hub-spec-badge').textContent = 'Паладин · ' + spec.name;
    $('hub-level-badge').textContent = 'ур. ' + hero.level + (hero.level >= 40 ? ' · готов к ключу' : '');
    const s = computeSheet(hero);
    const need = hero.level >= 40 ? 0 : xpToNext(hero.level);
    const xpPct = need ? clamp(hero.xp / need * 100, 0, 100) : 100;
    $('sheet').innerHTML =
      '<div class="hero-head">' +
        '<img alt="" src="' + G.PORTRAIT('paladin', hero.specId) + '" />' +
        '<div><div style="font-family:var(--font-display);font-size:1.2rem">' + hero.name + '</div>' +
        '<div class="' + (spec.role === 'tank' ? 'role-tank' : spec.role === 'healer' ? 'role-healer' : 'role-dps') + '">' + G.ROLE_LABEL[spec.role] + ' · ' + spec.name + '</div>' +
        '<div style="font-size:.8rem;color:var(--muted)">ур. ' + hero.level + ' / 40</div></div></div>' +
      '<div class="xp-bar" title="опыт"><i style="width:' + xpPct + '%"></i></div>' +
      '<div class="bar-label">' + (hero.level >= 40 ? 'потолок песочницы' : (hero.xp + ' / ' + need + ' опыта')) + '</div>' +
      '<div class="stat-grid">' +
        '<div>Здоровье <b>' + fmt(s.maxHp) + '</b></div>' +
        '<div>Атака <b>' + fmt(s.atk) + '</b></div>' +
        '<div>Защита <b>' + fmt(s.def) + '</b></div>' +
        '<div>Скорость <b>' + s.speed + '</b></div>' +
        '<div>Крит <b>' + Math.round(s.critPct * 100) + '%</b></div>' +
        '<div>Иск. <b>' + Math.round(s.masteryPct * 100) + '%</b></div>' +
      '</div>' +
      '<div class="skill-mini">' + G.PALADIN_ABS[hero.specId].map(a =>
        '<span class="skill-chip ' + (hero.level >= a.unlock ? 'have' : 'lock') + '" title="' + a.d + '">' +
        a.icon + ' ' + a.name + (hero.level >= a.unlock ? '' : ' · ' + a.unlock) + '</span>'
      ).join('') + '</div>' +
      '<p class="hint" style="margin-top:.6rem">Инстов: ' + (hero.stats.instances || 0) +
        ' · убийств: ' + (hero.stats.kills || 0) +
        ' · вайпов: ' + (hero.stats.wipes || 0) + '</p>';

    renderTalents();
    renderDungeons();
    $('ready-note').textContent = hero.level >= 40
      ? '40-й. В основе отсюда откроется ключ. Здесь можно фармить инсты без опыта.'
      : (pendingTalentTier() ? 'Есть невыбранный талант — открой дерево.' : '');
  }

  function renderTalents() {
    const box = $('talent-tree');
    box.innerHTML = G.TALENT_TIERS.map(tier => {
      const picks = talentPicks(tier, hero.specId);
      const chosen = hero.talents[tier.id];
      const open = hero.level >= tier.level;
      return '<div class="tier"><div class="tier-head"><span class="section-title" style="margin:0">Ярус · ур. ' + tier.level + ' · ' + tier.title + '</span>' +
        '<span style="font-size:.72rem;color:var(--muted)">' + (open ? (chosen ? 'выбран' : 'выбери один') : 'закрыт') + '</span></div>' +
        '<div class="tier-picks">' + picks.map(p => {
          const on = chosen === p.id;
          return '<button type="button" class="tal' + (on ? ' on' : '') + (!open ? ' locked' : '') + '" data-tier="' + tier.id + '" data-id="' + p.id + '" ' + (!open || chosen ? 'disabled' : '') + '>' +
            '<div class="tn">' + p.icon + ' ' + p.name + '</div><div class="td">' + p.desc + '</div></button>';
        }).join('') + '</div></div>';
    }).join('');
    box.querySelectorAll('.tal[data-id]').forEach(btn => {
      if (btn.disabled) return;
      btn.onclick = () => {
        hero.talents[btn.dataset.tier] = btn.dataset.id;
        save();
        toast(btn.querySelector('.tn').textContent);
        renderHub();
      };
    });
  }

  function renderDungeons() {
    const box = $('dungeon-list');
    box.innerHTML = G.DUNGEONS.map(d => {
      const ok = hero.level >= d.min - 2 && hero.level <= d.max + 2 || hero.level >= 40;
      const first = !hero.firstClears[d.id];
      return '<div class="qd ' + (ok ? 'ok' : 'lock') + '"><span>' + d.name +
        ' <span style="color:var(--muted)">· ' + d.min + '–' + d.max + (first ? ' · первый проход' : '') +
        '</span></span><span>' + (ok ? 'доступен' : 'ещё нет') + '</span></div>';
    }).join('');
  }

  let talentDoneCb = null;
  function openTalentModal(tier, done) {
    if (done) talentDoneCb = done;
    const picks = talentPicks(tier, hero.specId);
    $('tm-title').textContent = 'Ярус «' + tier.title + '» · ур. ' + tier.level;
    $('tm-hint').textContent = 'Один из трёх. Потом можно сбросить в таверне.';
    const box = $('tm-picks');
    box.innerHTML = '';
    picks.forEach(p => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tal';
      b.innerHTML = '<div class="tn">' + p.icon + ' ' + p.name + '</div><div class="td">' + p.desc + '</div>';
      b.onclick = () => {
        hero.talents[tier.id] = p.id;
        save();
        $('talent-modal').classList.add('hidden');
        toast(p.name);
        restatPlayerInRun();
        const next = pendingTalentTier();
        if (next) {
          openTalentModal(next, talentDoneCb);
          return;
        }
        const cb = talentDoneCb;
        talentDoneCb = null;
        if (typeof cb === 'function') cb();
      };
      box.appendChild(b);
    });
    $('talent-modal').classList.remove('hidden');
  }

  /* ---------- matchmaking ---------- */
  function eligibleDungeons() {
    const lv = hero.level;
    let list = G.DUNGEONS.filter(d => lv >= d.min && lv <= d.max);
    if (!list.length) {
      list = G.DUNGEONS.filter(d => lv >= d.min - 2 && lv <= d.max + 2);
    }
    if (!list.length || lv >= 40) list = G.DUNGEONS.slice();
    return list;
  }

  function scaleAlly(tpl, level) {
    const f = levelFactor(level);
    const u = {
      uid: uid(),
      side: 'ally',
      isPlayer: false,
      isAi: true,
      classId: tpl.classId,
      specId: tpl.specId,
      role: tpl.role,
      name: tpl.givenName,
      fullName: tpl.givenName + ' · ' + tpl.name + ' (' + tpl.specName + ')',
      icon: tpl.name,
      maxHp: Math.round(tpl.stats.hp * f * G.STAT_SCALE),
      atk: Math.round(tpl.stats.atk * f * G.STAT_SCALE),
      def: Math.round(tpl.stats.def * f * G.STAT_SCALE),
      speed: tpl.stats.speed,
      hp: 0, shield: 0, buffs: [], alive: true,
      critPct: 0.12 + level * 0.0015,
      masteryPct: 0.1,
      res: {
        primary: { type: 'mana', name: 'Мана', icon: '💧', max: 100, current: 100, regen: 8 },
        secondary: null,
      },
      abilities: (tpl.abs || []).map(cloneAb),
      color: G.CLASS_COLOR[tpl.classId] || '#c8d0da',
    };
    u.hp = u.maxHp;
    return u;
  }

  function makePlayerUnit() {
    const spec = specOf(hero.specId);
    const s = computeSheet(hero);
    let abs = injectTalentAbs(unlockedAbs(hero.specId, hero.level));
    abs.forEach(a => {
      if (hasTalent('ash_storm') && a.id === 'divine_storm') a.costSec = 3;
      if (hasTalent('unbreakable') && a.id === 'ardent') { a.cd = 4; a.baseCd = 4; }
      if (hasTalent('hallowed_ground') && a.id === 'consecrate' && a.applyDot) a.applyDot.turns = 6;
      if (hasTalent('hallowed_ground') && a.id === 'judgment') a.judgmentConsecrateSplash = 0.8;
      if (hasTalent('holy_bulwark') && a.id === 'avengers') a.shieldFromDmg = 0.4;
    });
    const u = {
      uid: uid(),
      side: 'ally',
      isPlayer: true,
      classId: 'paladin',
      specId: hero.specId,
      role: spec.role,
      name: hero.name,
      fullName: hero.name + ' · Паладин (' + spec.name + ')',
      icon: '✝️',
      maxHp: s.maxHp, hp: s.maxHp, atk: s.atk, def: s.def, speed: s.speed,
      shield: 0, buffs: [], alive: true,
      critPct: s.critPct, masteryPct: s.masteryPct,
      res: {
        primary: { type: 'mana', name: 'Мана', icon: '💧', max: 100, current: 100, regen: s.manaRegen },
        secondary: { type: 'holy_power', name: 'Энергия Света', icon: '☀️', max: 5, current: 3 },
      },
      abilities: abs,
      color: G.CLASS_COLOR.paladin,
      hammerUsed: false,
      avengerReady: false,
    };
    return u;
  }

  function rollParty() {
    const spec = specOf(hero.specId);
    const need = { tank: spec.role === 'tank' ? 0 : 1, healer: spec.role === 'healer' ? 0 : 1, dps: spec.role === 'dps' ? 2 : 3 };
    const usedNames = new Set([hero.name]);
    const usedKeys = new Set(['paladin:' + hero.specId]);
    const out = [makePlayerUnit()];
    for (const role of ['tank', 'healer', 'dps']) {
      let pool = shuffle(G.AI_ROSTER.filter(r => r.role === role && !usedKeys.has(r.classId + ':' + r.specId)));
      if (pool.length < need[role]) pool = shuffle(G.AI_ROSTER.filter(r => r.role === role));
      for (let i = 0; i < need[role]; i++) {
        const tpl = Object.assign({}, pool[i % pool.length]);
        const names = shuffle(G.AI_NAMES[role] || G.AI_NAMES.dps).filter(n => !usedNames.has(n));
        tpl.givenName = names[0] || ('ИИ-' + uid());
        usedNames.add(tpl.givenName);
        usedKeys.add(tpl.classId + ':' + tpl.specId);
        out.push(scaleAlly(tpl, hero.level));
      }
    }
    return out;
  }

  function startQueue() {
    queuedDungeon = pick(eligibleDungeons());
    $('queue-overlay').classList.remove('hidden');
    $('q-dungeon').textContent = queuedDungeon.name;
    const spec = specOf(hero.specId);
    const steps = [];
    if (spec.role !== 'tank') steps.push({ k: 'танка', ms: 400 + Math.random() * 500 });
    if (spec.role !== 'healer') steps.push({ k: 'целителя', ms: 350 + Math.random() * 450 });
    steps.push({ k: 'бойцов', ms: 500 + Math.random() * 700 });
    $('q-lines').innerHTML = steps.map(s => '<div class="q-line" data-k="' + s.k + '">Ищем ' + s.k + '…</div>').join('');
    $('q-status').textContent = 'Подбор по уровню ' + hero.level + '…';
    let t = 0;
    steps.forEach((s, i) => {
      t += s.ms;
      setTimeout(() => {
        const row = document.querySelector('.q-line[data-k="' + s.k + '"]');
        if (row) { row.classList.add('done'); row.textContent = s.k[0].toUpperCase() + s.k.slice(1) + ' найдены'; }
        if (i === steps.length - 1) {
          setTimeout(() => {
            queuedParty = rollParty();
            $('queue-overlay').classList.add('hidden');
            showBrief();
          }, 380);
        }
      }, t);
    });
  }

  function showBrief() {
    $('brief-overlay').classList.remove('hidden');
    $('brief-title').textContent = queuedDungeon.name + ' · ур. ' + hero.level;
    $('brief-party').innerHTML = queuedParty.map(p =>
      '<div class="pp' + (p.isPlayer ? ' you' : '') + '">' +
        '<img alt="" src="' + G.PORTRAIT(p.classId, p.specId) + '" />' +
        '<div><b>' + p.name + (p.isPlayer ? ' (ты)' : '') + '</b><div class="u-role ' +
        (p.role === 'tank' ? 'role-tank' : p.role === 'healer' ? 'role-healer' : 'role-dps') + '">' +
        G.ROLE_LABEL[p.role] + ' · ' + (p.fullName.split('·')[1] || '') + '</div></div></div>'
    ).join('');
  }

  /* ---------- combat math ---------- */
  function getEff(u) {
    let atk = u.atk, def = u.def, speed = u.speed;
    for (const b of (u.buffs || [])) {
      if (b.atkMod) atk *= (1 + b.atkMod);
      if (b.defMod) def *= (1 + b.defMod);
    }
    if (u.isPlayer && hasTalent('pursuit') && u.hp / u.maxHp > 0.8) atk *= 1.08;
    return { atk: Math.round(atk), def: Math.round(def), speed };
  }

  function armorDr(target, school) {
    const def = getEff(target).def;
    const phys = def / (def + 18000);
    if (school === 'holy' || school === 'fire' || school === 'frost' || school === 'shadow' || school === 'nature' || school === 'arcane') {
      return clamp(phys * 0.38, 0, 0.45);
    }
    return clamp(phys, 0, 0.65);
  }

  function critChance(u, ab) {
    let c = u.critPct || 0.1;
    if (ab && ab.critBonus) c += ab.critBonus;
    for (const b of (u.buffs || [])) if (b.critMod) c += b.critMod;
    return clamp(c, 0.05, 0.75);
  }
  function critMult(u, school) {
    if (u.isPlayer && hasTalent('fierce_light') && school === 'holy') return 1.75;
    return 1.5;
  }
  function masteryDmg(u, ab, school) {
    if (!u.isPlayer) return 1;
    const spec = specOf(hero.specId);
    const pct = u.masteryPct || 0;
    if (spec.mastery.kind === 'holy_dmg' && school === 'holy') return 1 + pct;
    if (spec.mastery.kind === 'avengers' && ab && ab.id === 'avengers') return 1 + pct;
    return 1;
  }

  function rawFrom(actor, ab, flatOverride) {
    const eff = getEff(actor);
    const fl = flatOverride != null ? flatOverride : ab.flat;
    if (fl != null && Number.isFinite(Number(fl)) && Number(fl) > 0) {
      return Math.max(1, Math.round(eff.atk * (Number(fl) / G.FLAT_REF)));
    }
    const p = Number(ab.power);
    return Math.max(1, Math.round(eff.atk * (Number.isFinite(p) && p > 0 ? p : 1)));
  }

  function applyStatus(u, st) {
    u.buffs = (u.buffs || []).filter(b => b.id !== st.id);
    u.buffs.push(Object.assign({ turns: 2 }, st));
  }

  function dealDmg(target, raw, attacker, ctx) {
    if (!target || !target.alive) return 0;
    ctx = ctx || {};
    if (target.buffs && target.buffs.some(b => b.id === 'bubble' && b.turns > 0)) {
      target.buffs = target.buffs.filter(b => b.id !== 'bubble');
      log(target.name + ': Божественный щит поглощает удар', 'heal');
      return 0;
    }
    let school = ctx.school || 'physical';
    let dmg = raw;
    const dr = armorDr(target, school);
    dmg = Math.max(1, Math.round(dmg * (1 - dr)));
    let extraDr = 0;
    for (const b of (target.buffs || [])) if (b.dmgReduce) extraDr += b.dmgReduce;
    if (extraDr > 0) dmg = Math.max(1, Math.round(dmg * (1 - Math.min(0.9, extraDr))));
    if (target.role === 'tank' && target.specId === 'protection' && target.classId === 'paladin' && school === 'physical') {
      const block = 0.15 + (target.isPlayer ? 0 : 0);
      if (Math.random() < block) {
        dmg = Math.max(1, Math.round(dmg * 0.65));
        log(target.name + ': блок', 'heal');
      }
    }
    const sac = (target.buffs || []).find(b => b.id === 'sacrificed');
    if (sac && sac.srcUid && attacker) {
      const src = livingHeroes().find(h => h.uid === sac.srcUid);
      if (src && src.alive) {
        const share = Math.round(dmg * 0.3);
        dmg -= share;
        src.hp = clamp(src.hp - share, 0, src.maxHp);
        if (src.hp <= 0) { src.alive = false; src.hp = 0; }
      }
    }
    if (target.shield > 0) {
      const use = Math.min(target.shield, dmg);
      target.shield -= use;
      dmg -= use;
    }
    target.hp = clamp(target.hp - dmg, 0, target.maxHp);
    if (target.hp <= 0) {
      target.alive = false;
      target.hp = 0;
      if (target.side === 'enemy' && hero) hero.stats.kills = (hero.stats.kills || 0) + 1;
    }
    return dmg;
  }

  function healUnit(target, amount, caster) {
    if (!target || !target.alive) return 0;
    let amt = Math.max(1, Math.round(amount));
    const c = critChance(caster, null);
    let crit = false;
    if (Math.random() < c) { amt = Math.round(amt * 1.5); crit = true; }
    const before = target.hp;
    target.hp = clamp(target.hp + amt, 0, target.maxHp);
    const got = target.hp - before;
    if (caster && caster.isPlayer && specOf(hero.specId).mastery.kind === 'light_echo' && got > 0) {
      const tick = Math.max(1, Math.round(got * (caster.masteryPct || 0.1)));
      applyStatus(target, { id: 'light_echo', name: 'Выбор света', icon: '✨', turns: 2, hot: tick });
    }
    return { got, crit };
  }

  function living(side) {
    if (!run) return [];
    if (side === 'ally') return run.party.filter(u => u.alive && u.hp > 0);
    return (combat?.enemies || []).filter(u => u.alive && u.hp > 0);
  }
  function livingHeroes() { return living('ally'); }
  function lowest(list) {
    if (!list || !list.length) return null;
    return list.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  }

  function executeWindow() {
    return (hero && hasTalent('wrathful_hammer')) ? 0.5 : 0.35;
  }

  function canPay(u, ab, target) {
    if (ab.curCd > 0.05) return false;
    if (ab.cost > 0 && u.res.primary.current < ab.cost) return false;
    if (ab.costSec > 0) {
      if (!u.res.secondary || u.res.secondary.current < ab.costSec) return false;
    }
    if (ab.id === 'hot_w') {
      if (u.hammerUsed) return false;
      const foes = living('enemy');
      if (target) return target.hp / target.maxHp <= executeWindow();
      return foes.some(e => e.hp / e.maxHp <= executeWindow());
    }
    if (ab.id === 'sacrifice' && u._sacUsed) return false;
    if (ab.id === 'bubble' && run && run.bubbleUsed) return false;
    return true;
  }

  function payAbility(u, ab) {
    if (ab.cost > 0) u.res.primary.current -= ab.cost;
    if (ab.costSec > 0 && u.res.secondary) {
      const spent = ab.costSec;
      u.res.secondary.current -= spent;
      if (u.isPlayer) {
        const chance = hasTalent('divine_purpose') ? 0.4 : (hero.level >= 10 ? 0.25 : 0);
        let back = 0;
        for (let i = 0; i < spent; i++) if (Math.random() < chance) back++;
        if (back) {
          u.res.secondary.current = Math.min(u.res.secondary.max, u.res.secondary.current + back);
          log(u.name + ': Добродетель возвращает ' + back + ' ES', 'heal');
        }
        if (hasTalent('holy_avenger')) u.avengerReady = true;
      }
    }
    if (ab.cd) ab.curCd = ab.baseCd || ab.cd;
    if (ab.gen && u.res.primary) {
      u.res.primary.current = Math.min(u.res.primary.max, u.res.primary.current + ab.gen);
    }
    if (ab.genSec && u.res.secondary) {
      let g = ab.genSec;
      if (u.isPlayer && u.avengerReady && hasTalent('holy_avenger')) { g += 1; u.avengerReady = false; }
      u.res.secondary.current = Math.min(u.res.secondary.max, u.res.secondary.current + g);
    }
  }

  function interruptCast(target, actor) {
    if (!target?.casting) return false;
    const name = target.casting.name;
    target.casting = null;
    applyStatus(target, { id: 'lock', name: 'Немота', icon: '🔇', turns: 2 });
    log((actor ? actor.name + ': ' : '') + 'сбивает «' + name + '»', 'player');
    toast('Прервано!');
    return true;
  }

  function needsTarget(ab) {
    if (ab.id === 'holy_shock') return true;
    if (ab.id === 'sacrifice') return true;
    if (ab.type === 'heal' || ab.type === 'ally_buff') return true;
    if (ab.type === 'damage' || ab.type === 'taunt') return true;
    if (ab.id === 'hot_w') return true;
    return false;
  }
  function targetSide(ab) {
    if (ab.id === 'holy_shock') return 'any';
    if (ab.type === 'heal' || ab.type === 'ally_buff' || ab.id === 'sacrifice') return 'ally';
    return 'enemy';
  }

  function castAbility(actor, ab, target) {
    if (!actor.alive || !canPay(actor, ab, target)) return false;
    if (needsTarget(ab) && !target) return false;
    if (ab.id === 'holy_shock' && target) {
      if (target.side === 'ally') ab = Object.assign({}, ab, { type: 'heal' });
      else ab = Object.assign({}, ab, { type: 'damage' });
    }
    payAbility(actor, ab);

    if (ab.type === 'taunt') {
      living('enemy').forEach(e => { e.threatTarget = actor.uid; });
      log(actor.name + ': ' + ab.name + ' — агро на себе', 'player');
      return true;
    }
    if (ab.id === 'bubble') {
      run.bubbleUsed = true;
      applyStatus(actor, { id: 'bubble', name: 'Божественный щит', icon: '💠', turns: 99 });
      log(actor.name + ': Божественный щит', 'heal');
      return true;
    }
    if (ab.id === 'sacrifice' && target) {
      actor._sacUsed = true;
      applyStatus(target, { id: 'sacrificed', name: 'Жертва', icon: '🤲', turns: 2, srcUid: actor.uid });
      log(actor.name + ' принимает 30% урона ' + target.name, 'heal');
      return true;
    }
    if (ab.type === 'buff') {
      const st = { id: ab.id, name: ab.name, icon: ab.icon, turns: ab.buffTurns || 3 };
      if (ab.atkMod) st.atkMod = ab.atkMod;
      if (ab.critMod) st.critMod = ab.critMod;
      if (ab.dmgReduce) st.dmgReduce = ab.dmgReduce;
      applyStatus(actor, st);
      log(actor.name + ': ' + ab.name, 'player');
      return true;
    }
    if (ab.type === 'shield') {
      let sh = rawFrom(actor, ab);
      if (actor.isPlayer && hasTalent('sacred_shield') && ab.id === 'divine_prot') sh = Math.round(sh * 1.5);
      actor.shield = (actor.shield || 0) + sh;
      log(actor.name + ': щит ' + fmt(sh), 'heal');
      return true;
    }
    if (ab.type === 'heal' || ab.type === 'heal_aoe') {
      const targets = ab.type === 'heal_aoe' ? livingHeroes() : [target || lowest(livingHeroes())].filter(Boolean);
      let sum = 0;
      for (const t of targets) {
        let amt = rawFrom(actor, ab);
        if (actor.isPlayer && hasTalent('selfless') && ab.id === 'holy_shock') amt = Math.round(amt * 1.2);
        const r = healUnit(t, amt, actor);
        sum += r.got;
        if (ab.applyHot && t.alive) {
          applyStatus(t, { id: ab.id + '_hot', name: ab.applyHot.name || ab.name, icon: ab.icon, turns: ab.applyHot.turns, hot: rawFrom(actor, { flat: ab.applyHot.flat }) });
        }
        if (actor.isPlayer && hasTalent('eternal_flame') && ab.id === 'word_glory') {
          applyStatus(t, { id: 'eternal_flame', name: 'Вечное пламя', icon: '🔥', turns: 3, hot: Math.max(1, Math.round(r.got * 0.2)) });
        }
      }
      log(actor.name + ': ' + ab.name + ' +' + fmt(sum), 'heal');
      return true;
    }

    if (ab.type === 'cast_aoe') {
      actor.casting = { name: ab.name, power: ab.power || 0.8, turns: 1, kind: 'kick' };
      log(actor.name + ' начинает «' + ab.name + '»!', 'enemy');
      return true;
    }

    const foes = living('enemy');
    if (ab.id === 'avengers' && target && target.casting) interruptCast(target, actor);
    if (ab.id === 'avengers' && !target) {
      const c = foes.find(e => e.casting);
      if (c) interruptCast(c, actor);
    }

    if (ab.id === 'hot_w') actor.hammerUsed = true;

    const school = ab.school || 'holy';
    if (ab.type === 'aoe' || ab.splashFlat != null) {
      const list = foes.slice();
      let main = target && target.alive ? target : list[0];
      if (!main) return true;
      if ((ab.flat === 0 || ab.flat == null) && ab.applyDot) {
        for (const e of list) {
          if (!e.alive) continue;
          applyStatus(e, {
            id: 'consecrate', name: ab.applyDot.name || 'Освящение', icon: '☀️',
            turns: ab.applyDot.turns, dot: rawFrom(actor, { flat: ab.applyDot.flat }), school: 'holy',
          });
        }
        log(actor.name + ': ' + ab.name + ' на поле', actor.side === 'ally' ? 'player' : 'enemy');
        return true;
      }
      let total = 0;
      for (const e of list) {
        let raw = ab.splashFlat != null && e.uid !== main.uid
          ? rawFrom(actor, ab, ab.splashFlat)
          : rawFrom(actor, ab);
        if (ab.aoeBounce && e.uid !== main.uid) raw = Math.round(raw * (1 + ab.aoeBounce));
        raw = Math.round(raw * masteryDmg(actor, ab, school));
        if (ab.id === 'templar' && actor.isPlayer && hasTalent('blade_of_light')) raw = Math.round(raw * 1.15);
        let crit = false;
        if (Math.random() < critChance(actor, ab)) { raw = Math.round(raw * critMult(actor, school)); crit = true; }
        const dealt = dealDmg(e, raw, actor, { school });
        total += dealt;
        if (ab.applyDot && e.alive) {
          let turns = ab.applyDot.turns;
          applyStatus(e, {
            id: 'consecrate', name: ab.applyDot.name || 'Освящение', icon: '☀️',
            turns, dot: rawFrom(actor, { flat: ab.applyDot.flat }), school: 'holy',
          });
        }
        if (ab.id === 'avengers' && e.casting && e.uid !== (target && target.uid) && Math.random() < (ab.interruptAoeChance || 0)) {
          interruptCast(e, actor);
        }
      }
      if (ab.shieldFromDmg && total > 0) {
        const sh = Math.round(total * ab.shieldFromDmg);
        actor.shield = (actor.shield || 0) + sh;
      }
      log(actor.name + ': ' + ab.name + ' −' + fmt(total), actor.side === 'ally' ? 'player' : 'enemy');
      if (ab.id === 'judgment') judgmentSplash(actor, main, ab, school);
      return true;
    }

    if (!target || !target.alive) target = lowest(foes) || foes[0];
    if (!target) return true;
    let raw = rawFrom(actor, ab);
    if (ab.id === 'judgment' && target.buffs && target.buffs.some(b => b.id === 'consecrate')) {
      raw = Math.round(raw * (1 + (ab.judgmentConsecrateSplash || 0.6)));
    }
    raw = Math.round(raw * masteryDmg(actor, ab, school));
    if (ab.id === 'templar' && actor.isPlayer && hasTalent('blade_of_light')) raw = Math.round(raw * 1.15);
    let crit = false;
    if (Math.random() < critChance(actor, ab)) { raw = Math.round(raw * critMult(actor, school)); crit = true; }
    if (ab.vuln) applyStatus(target, { id: 'vuln', name: 'Уязвимость', icon: '⚖️', turns: ab.vuln.turns || 4, defMod: -(ab.vuln.amount || 0.05) });
    if (actor.isPlayer && hasTalent('long_arm') && ab.id === 'judgment') {
      applyStatus(target, { id: 'long_arm', name: 'Долгая рука', icon: '⚖️', turns: 2, defMod: -0.1 });
    }
    const dealt = dealDmg(target, raw, actor, { school });
    log(actor.name + ': ' + ab.name + ' → ' + target.name + ' (−' + fmt(dealt) + (crit ? ', крит' : '') + ')', actor.side === 'ally' ? 'player' : 'enemy');
    if (ab.id === 'crusader' && actor.isPlayer && actor.specId === 'protection') {
      const prev = (actor.buffs || []).find(b => b.id === 'cs_armor');
      const stacks = Math.min(2, (prev ? (prev.stacks || 1) : 0) + 1);
      applyStatus(actor, { id: 'cs_armor', name: 'Броня Света ×' + stacks, icon: '🛡️', turns: 3, stacks, dmgReduce: 0.04 * stacks });
    }
    if (ab.id === 'sot_r') {
      applyStatus(actor, { id: 'sot_r', name: 'Щит света', icon: '🧱', turns: 4, dmgReduce: 0.1 });
    }
    if (ab.applyDot && target.alive) {
      applyStatus(target, {
        id: 'consecrate', name: ab.applyDot.name || 'Освящение', icon: '☀️',
        turns: ab.applyDot.turns, dot: rawFrom(actor, { flat: ab.applyDot.flat }), school: 'holy',
      });
    }
    if (ab.id === 'judgment') judgmentSplash(actor, target, ab, school);
    return true;
  }

  function judgmentSplash(actor, main, ab, school) {
    const ratio = ab.judgmentConsecrateSplash || 0.6;
    const base = rawFrom(actor, ab);
    for (const e of living('enemy')) {
      if (!e.alive || e.uid === (main && main.uid)) continue;
      if (!(e.buffs || []).some(b => b.id === 'consecrate')) continue;
      const dealt = dealDmg(e, Math.round(base * ratio * masteryDmg(actor, ab, school)), actor, { school });
      if (dealt) log(actor.name + ': Правосудие по Освящению → ' + e.name + ' (−' + fmt(dealt) + ')', 'player');
    }
  }

  function tickDotsAndHots() {
    if (!combat) return;
    const units = [...livingHeroes(), ...living('enemy')];
    for (const u of units) {
      if (!u.buffs) continue;
      for (const b of u.buffs.slice()) {
        if (b.dot && u.alive) {
          const d = dealDmg(u, b.dot, null, { school: b.school || 'holy' });
          log(u.name + ': ' + (b.name || 'DoT') + ' −' + fmt(d), 'enemy');
        }
        if (b.hot && u.alive) {
          u.hp = clamp(u.hp + b.hot, 0, u.maxHp);
          log(u.name + ': ' + (b.name || 'HoT') + ' +' + fmt(b.hot), 'heal');
        }
      }
    }
  }

  function decayBuffs(u) {
    if (!u.buffs) return;
    u.buffs.forEach(b => { if (b.turns != null) b.turns--; });
    u.buffs = u.buffs.filter(b => b.turns == null || b.turns > 0);
  }

  /* ---------- combat loop ---------- */
  function spawnPack(node) {
    const f = levelFactor(hero.level);
    const room = node.type;
    if (room === 'final' || room === 'boss') {
      const src = room === 'final' ? run.dungeon.boss : pick(G.ENEMIES.elite);
      const hpM = room === 'final' ? 2.15 : 1.55;
      return [makeEnemy(src, f, hpM, 1.05, true, room === 'final')];
    }
    const pool = room === 'elite' ? G.ENEMIES.elite : G.ENEMIES.trash;
    const n = room === 'elite' ? 1 + (Math.random() < 0.45 ? 1 : 0) : 2 + (Math.random() < 0.55 ? 1 : 0);
    const list = [];
    for (let i = 0; i < n; i++) list.push(makeEnemy(pick(pool), f, room === 'elite' ? 1.35 : 1, 1, room === 'elite', false));
    return list;
  }

  function makeEnemy(tpl, f, hpM, atkM, elite, boss) {
    const u = {
      uid: uid(),
      side: 'enemy',
      heroId: tpl.id,
      name: tpl.name,
      fullName: tpl.name,
      icon: tpl.icon,
      role: tpl.role || 'dps',
      maxHp: Math.round((tpl.hp || 90) * f * G.STAT_SCALE * hpM),
      atk: Math.round((tpl.atk || 12) * f * G.STAT_SCALE * 0.9 * (atkM || 1)),
      def: Math.round((tpl.def || 3) * f * G.STAT_SCALE),
      speed: tpl.speed || 9,
      hp: 0, shield: 0, buffs: [], alive: true,
      critPct: 0.08,
      isElite: !!elite, isBoss: !!boss,
      abilities: (tpl.abilities || [{ id: 'h', name: 'Удар', type: 'damage', power: 1 }]).map(a => {
        const x = cloneAb(a);
        x.icon = x.icon || '✨';
        x.school = x.school || 'physical';
        return x;
      }),
      res: { primary: { type: 'mana', current: 40, max: 40, regen: 4 }, secondary: null },
      threatTarget: null,
    };
    u.hp = u.maxHp;
    return u;
  }

  function startCombat(node) {
    applyRoomBg(node);
    run.party.forEach(p => {
      if (p.hp <= 0) { p.alive = false; p.hp = 0; } else p.alive = true;
      p.shield = 0;
      p.buffs = [];
      p.hammerUsed = false;
      p._sacUsed = false;
      (p.abilities || []).forEach(a => { a.curCd = 0; });
      if (p.res.primary) {
        p.res.primary.current = clamp(p.res.primary.current + Math.round(p.res.primary.max * 0.06), 0, p.res.primary.max);
      }
      if (p.res.secondary && p.res.secondary.type === 'holy_power') {
        p.res.secondary.current = Math.min(3, p.res.secondary.max);
      }
    });
    combat = {
      node, enemies: spawnPack(node), turnQueue: [], turnIndex: 0, round: 1, over: false, waitingPlayer: false,
    };
    buildQueue();
    log('Бой: ' + node.name, 'system');
    renderCombat();
    processTurn();
  }

  function buildQueue() {
    const units = [...run.party, ...combat.enemies].filter(u => u.alive && u.hp > 0);
    units.sort((a, b) => getEff(b).speed - getEff(a).speed);
    combat.turnQueue = units.map(u => u.uid);
    combat.turnIndex = 0;
  }
  function allUnits() { return [...(run?.party || []), ...(combat?.enemies || [])]; }
  function currentActor() {
    const id = combat?.turnQueue[combat.turnIndex];
    return allUnits().find(u => u.uid === id) || null;
  }

  function scheduleTurn(ms) {
    clearTimeout(aiTimer);
    aiTimer = setTimeout(() => { if (combat && !combat.over) processTurn(); }, Math.max(20, ms / gameSpeed));
  }

  function processTurn() {
    if (!combat || combat.over || !run || run.finished) return;
    combat.turnQueue = combat.turnQueue.filter(id => {
      const u = allUnits().find(x => x.uid === id);
      return u && u.alive && u.hp > 0;
    });
    if (!combat.turnQueue.length) buildQueue();
    if (combat.turnIndex >= combat.turnQueue.length) { endRound(); return; }
    const actor = currentActor();
    if (!actor || !actor.alive) { combat.turnIndex++; scheduleTurn(40); return; }
    actor.abilities.forEach(a => { if (a.curCd > 0) a.curCd--; });
    if (actor.res && actor.res.primary) {
      actor.res.primary.current = clamp(actor.res.primary.current + (actor.res.primary.regen || 0), 0, actor.res.primary.max);
    }
    if (actor.isPlayer) actor.hammerUsed = false;
    if (actor.isPlayer && hasTalent('sanctified_wrath') && (actor.buffs || []).some(b => b.id === 'avenging') && actor.res.secondary) {
      actor.res.secondary.current = Math.min(actor.res.secondary.max, actor.res.secondary.current + 1);
    }
    $('turn-banner').textContent = (actor.side === 'ally' ? '▶ ' : '◀ ') + (actor.fullName || actor.name);
    renderCombat();
    if (actor.side === 'ally' && actor.isPlayer) {
      combat.waitingPlayer = true;
      showAbilities(actor);
      return;
    }
    combat.waitingPlayer = false;
    $('ability-bar').innerHTML = '';
    $('combat-actions').textContent = (actor.fullName || actor.name) + ' ходит…';
    clearTimeout(aiTimer);
    aiTimer = setTimeout(() => {
      if (!combat || combat.over) return;
      if (actor.side === 'enemy') enemyAi(actor);
      else allyAi(actor);
      afterAction(actor, false);
    }, Math.max(80, 280 / gameSpeed));
  }

  function endRound() {
    combat.round++;
    tickDotsAndHots();
    allUnits().forEach(decayBuffs);
    if (checkEnd()) return;
    buildQueue();
    processTurn();
  }

  function afterAction(actor, free) {
    pendingTarget = null;
    if (checkEnd()) return;
    if (free) {
      combat.waitingPlayer = true;
      showAbilities(actor);
      renderCombat();
      return;
    }
    combat.waitingPlayer = false;
    $('ability-bar').innerHTML = '';
    combat.turnIndex++;
    renderCombat();
    scheduleTurn(160);
  }

  function checkEnd() {
    if (!combat || combat.over) return true;
    if (!living('enemy').length) {
      combat.over = true;
      run.party.forEach(p => {
        if (p.alive) p.hp = clamp(p.hp + Math.round((p.maxHp - p.hp) * 0.06), 0, p.maxHp);
      });
      const node = run.dungeon.route[run.routeIndex];
      const xp = packXp(node.type === 'final' ? 'final' : node.type, hero.level);
      run.xpThisRun += xp;
      gainXp(xp, node.name);
      renderCombat();
      setTimeout(() => advanceRoom(), 500);
      return true;
    }
    if (!livingHeroes().length) {
      combat.over = true;
      failRun();
      return true;
    }
    return false;
  }

  /* ---------- AI ---------- */
  function enemyAi(actor) {
    if (actor.casting) {
      const base = Math.round(getEff(actor).atk * (actor.casting.power || 0.8));
      livingHeroes().forEach(h => dealDmg(h, base, actor, { school: 'shadow' }));
      log(actor.name + ' завершает «' + actor.casting.name + '»', 'enemy');
      actor.casting = null;
      return;
    }
    const usable = actor.abilities.filter(a => canPay(actor, a));
    const cast = usable.find(a => a.type === 'cast_aoe');
    if (cast && !actor.buffs.some(b => b.id === 'lock') && Math.random() < (actor.isBoss ? 0.5 : 0.32)) {
      castAbility(actor, cast, null);
      return;
    }
    const heal = usable.find(a => a.type === 'heal');
    const hurt = lowest(living('enemy'));
    if (heal && hurt && hurt.hp / hurt.maxHp < 0.55) { castAbility(actor, heal, hurt); return; }
    const aoe = usable.find(a => a.type === 'aoe');
    if (aoe && livingHeroes().length >= 3 && Math.random() < 0.5) { castAbility(actor, aoe, null); return; }
    let t = livingHeroes().find(h => h.uid === actor.threatTarget) || livingHeroes().find(h => h.role === 'tank') || lowest(livingHeroes());
    const hit = usable.find(a => a.type === 'damage') || usable[0];
    if (hit && t) castAbility(actor, hit, t);
  }

  function allyAi(actor) {
    const foes = living('enemy');
    const friends = livingHeroes();
    const usable = actor.abilities.filter(a => canPay(actor, a));
    if (!usable.length) return;
    const casting = foes.find(e => e.casting);
    const kick = usable.find(a => a.interrupt || a.id === 'as' || a.id === 'avengers');
    if (casting && kick) { castAbility(actor, kick, casting); return; }
    if (actor.role === 'tank') {
      const taunt = usable.find(a => a.type === 'taunt');
      const agroBad = foes.some(e => {
        const t = friends.find(h => h.uid === e.threatTarget);
        return t && t.role !== 'tank';
      });
      if (taunt && (agroBad || Math.random() < 0.3)) { castAbility(actor, taunt, null); return; }
      if (actor.hp / actor.maxHp < 0.45) {
        const def = usable.find(a => a.dmgReduce);
        if (def) { castAbility(actor, def, actor); return; }
      }
    }
    if (actor.role === 'healer') {
      const aoeH = usable.find(a => a.type === 'heal_aoe');
      if (aoeH && friends.filter(h => h.hp / h.maxHp < 0.8).length >= 3) { castAbility(actor, aoeH, actor); return; }
      const heal = usable.find(a => a.type === 'heal');
      const t = lowest(friends.filter(h => h.hp < h.maxHp));
      if (heal && t && t.hp / t.maxHp < 0.92) { castAbility(actor, heal, t); return; }
    }
    const exec = usable.find(a => a.execute);
    const low = foes.find(e => e.hp / e.maxHp <= 0.35);
    if (exec && low) { castAbility(actor, exec, low); return; }
    const aoe = usable.find(a => a.type === 'aoe');
    if (aoe && foes.length >= 3) { castAbility(actor, aoe, null); return; }
    const dmg = usable.find(a => a.type === 'damage') || usable[0];
    if (dmg) castAbility(actor, dmg, dmg.type === 'heal' ? lowest(friends) : (lowest(foes) || foes[0]));
  }

  /* ---------- render combat ---------- */
  function portraitFor(u) {
    if (u.side === 'enemy') return G.ENEMY_ART(u.heroId || 'z');
    return G.PORTRAIT(u.classId, u.specId);
  }

  function unitCard(u, actor) {
    const hpPct = clamp(u.hp / Math.max(1, u.maxHp) * 100, 0, 100);
    const res = u.res && u.res.primary;
    const resPct = res && res.max ? clamp(res.current / res.max * 100, 0, 100) : 0;
    const cls = ['unit', u.side];
    if (!u.alive) cls.push('dead');
    if (actor && actor.uid === u.uid) cls.push('turn');
    if (u.isPlayer) cls.push('you');
    if (pendingTarget) {
      const side = targetSide(pendingTarget.ab);
      if (side === 'any' || (side === 'ally' && u.side === 'ally') || (side === 'enemy' && u.side === 'enemy')) cls.push('mark');
    }
    let es = '';
    if (u.res && u.res.secondary && u.res.secondary.type === 'holy_power') {
      const n = u.res.secondary.current, m = u.res.secondary.max;
      es = '<div class="es-orbs">' + Array.from({ length: m }, (_, i) => '<i class="' + (i < n ? 'on' : '') + '"></i>').join('') + '</div>';
    }
    const cast = u.casting ? '<div class="cast-badge">читает: ' + u.casting.name + '</div>' : '';
    return '<div class="' + cls.join(' ') + '" data-uid="' + u.uid + '" style="--cc:' + (u.color || '#c8d0da') + '">' +
      '<img alt="" src="' + portraitFor(u) + '" onerror="this.style.opacity=.25" />' +
      '<div class="u-name" title="' + (u.fullName || u.name) + '">' + u.name + '</div>' +
      '<div class="u-role ' + (u.role === 'tank' ? 'role-tank' : u.role === 'healer' ? 'role-healer' : 'role-dps') + '">' + (G.ROLE_LABEL[u.role] || '') + '</div>' +
      '<div class="bar hp"><i style="width:' + hpPct + '%"></i></div>' +
      '<div class="bar-label">' + fmt(u.hp) + '/' + fmt(u.maxHp) + (u.shield ? ' · щит ' + fmt(u.shield) : '') + '</div>' +
      (res && u.side === 'ally' ? '<div class="bar res"><i style="width:' + resPct + '%"></i></div><div class="bar-label">' + (res.icon || '') + ' ' + Math.floor(res.current) + '</div>' : '') +
      es + cast + '</div>';
  }

  function renderCombat() {
    if (!run) return;
    const actor = combat ? currentActor() : null;
    $('enemy-row').innerHTML = (combat ? combat.enemies : []).map(u => unitCard(u, actor)).join('');
    $('ally-row').innerHTML = run.party.map(u => unitCard(u, actor)).join('');
    $('enemy-row').onclick = onRowClick;
    $('ally-row').onclick = onRowClick;
  }

  function onRowClick(e) {
    const card = e.target.closest('.unit');
    if (!card || !combat || !combat.waitingPlayer) return;
    const u = allUnits().find(x => x.uid === card.dataset.uid);
    if (!u) return;
    if (!pendingTarget) return;
    const side = targetSide(pendingTarget.ab);
    if (side === 'ally' && u.side !== 'ally') return toast('Нужен союзник');
    if (side === 'enemy' && u.side !== 'enemy') return toast('Нужен враг');
    if (pendingTarget.ab.id === 'hot_w' && u.hp / u.maxHp > executeWindow()) return toast('Цель выше окна Молота');
    doCast(pendingTarget.actor, pendingTarget.ab, u);
  }

  function showAbilities(actor) {
    const bar = $('ability-bar');
    bar.innerHTML = '';
    actor.abilities.forEach((ab, i) => {
      const can = canPay(actor, ab);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ability' + (can ? '' : ' is-disabled');
      const bits = [];
      if (ab.cost) bits.push(ab.cost + ' маны');
      if (ab.costSec) bits.push(ab.costSec + ' ES');
      if (ab.genSec) bits.push('+' + ab.genSec + ' ES');
      if (ab.cd) bits.push('КД ' + (ab.baseCd || ab.cd));
      if (ab.freeAction) bits.push('без хода');
      if (ab.flat) bits.push(ab.flat + 'т');
      btn.innerHTML =
        (i < 9 ? '<span class="hk">' + (i + 1) + '</span>' : '') +
        '<span class="a-ico">' + (ab.icon || '✨') + '</span>' +
        '<span class="a-name">' + ab.name + '</span>' +
        '<span class="a-cost">' + bits.join(' · ') + '</span>' +
        (ab.curCd > 0 ? '<div class="cd-overlay">' + ab.curCd + '</div>' : '');
      btn.title = ab.d || ab.desc || '';
      btn.onclick = () => {
        if (!canPay(actor, ab)) return;
        if (needsTarget(ab)) {
          pendingTarget = { actor, ab };
          toast(ab.id === 'holy_shock' ? 'Союзник или враг' : (targetSide(ab) === 'ally' ? 'Клик по союзнику' : 'Клик по врагу'));
          renderCombat();
        } else {
          doCast(actor, ab, null);
        }
      };
      bar.appendChild(btn);
    });
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'btn btn-sm';
    skip.textContent = 'Пропуск';
    skip.onclick = () => afterAction(actor, false);
    $('combat-actions').innerHTML = '';
    $('combat-actions').appendChild(skip);
  }

  function doCast(actor, ab, target) {
    const ok = castAbility(actor, ab, target);
    if (!ok) return;
    afterAction(actor, !!ab.freeAction);
  }

  window.addEventListener('keydown', (e) => {
    if (!combat || !combat.waitingPlayer) return;
    const actor = currentActor();
    if (!actor || !actor.isPlayer) return;
    if (e.key === ' ') { e.preventDefault(); afterAction(actor, false); return; }
    if (e.key === 'Escape') { pendingTarget = null; renderCombat(); return; }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) {
      const ab = actor.abilities[n - 1];
      if (!ab) return;
      const btn = $('ability-bar').children[n - 1];
      if (btn) btn.click();
    }
  });

  /* ---------- dungeon run ---------- */
  function applyRoomBg(node) {
    const url = G.BG(run.dungeon.theme, node.loc || 'entrance');
    const ba = $('battle-area');
    ba.style.backgroundImage =
      'linear-gradient(180deg, rgba(8,10,14,.55), rgba(8,10,14,.72)), url(' + JSON.stringify(url) + ')';
    document.body.className = 'theme-' + run.dungeon.theme;
  }

  function refreshHud() {
    if (!hero) return;
    if ($('hud-lvl')) $('hud-lvl').textContent = 'ур. ' + hero.level;
    if ($('hud-xp')) {
      const need = hero.level >= 40 ? 0 : xpToNext(hero.level);
      $('hud-xp').textContent = hero.level >= 40 ? '40 / 40' : (hero.xp + ' / ' + need);
    }
    if (run && $('hud-dun')) $('hud-dun').textContent = run.dungeon.name;
    if (run && $('hud-room')) {
      const n = run.dungeon.route[run.routeIndex];
      $('hud-room').textContent = n ? n.name : '—';
    }
  }

  function renderPath() {
    const box = $('path-list');
    box.innerHTML = run.dungeon.route.map((n, i) =>
      '<div class="path-item ' + (i < run.routeIndex ? 'done' : i === run.routeIndex ? 'now' : '') + '">' +
      (i < run.routeIndex ? '✓ ' : i === run.routeIndex ? '▶ ' : '· ') + n.name + '</div>'
    ).join('');
    $('side-party').innerHTML = run.party.map(p =>
      p.name + ' · ' + G.ROLE_LABEL[p.role] + (p.isPlayer ? ' (ты)' : '')
    ).join('<br>');
  }

  function enterDungeon() {
    $('brief-overlay').classList.add('hidden');
    run = {
      dungeon: queuedDungeon,
      party: queuedParty,
      routeIndex: 0,
      xpThisRun: 0,
      finished: false,
      bubbleUsed: false,
    };
    hero.stats.instances = (hero.stats.instances || 0) + 1;
    save();
    show('run-screen');
    $('log').innerHTML = '';
    log('Вход: ' + run.dungeon.name + '. Состав: ' + run.party.map(p => p.name).join(', '), 'system');
    refreshHud();
    renderPath();
    enterRoom();
  }

  function enterRoom() {
    const node = run.dungeon.route[run.routeIndex];
    renderPath();
    refreshHud();
    if (node.type === 'rest') {
      combat = null;
      renderCombat();
      $('ability-bar').innerHTML = '';
      $('rest-modal').classList.remove('hidden');
      applyRoomBg(node);
      return;
    }
    startCombat(node);
  }

  function advanceRoom() {
    const go = () => {
      run.routeIndex++;
      if (run.routeIndex >= run.dungeon.route.length) {
        winRun();
        return;
      }
      enterRoom();
    };
    const ding = pendingTalentTier();
    if (ding) {
      openTalentModal(ding, go);
      return;
    }
    go();
  }

  function winRun() {
    run.finished = true;
    combat = null;
    const first = !hero.firstClears[run.dungeon.id];
    hero.firstClears[run.dungeon.id] = true;
    let bonus = clearXp(hero.level);
    if (first) bonus = Math.round(bonus * 1.4);
    run.xpThisRun += bonus;
    gainXp(bonus, first ? 'первый проход' : 'зачистка');
    save();
    $('end-title').textContent = 'Инст пройден';
    $('end-msg').textContent = run.dungeon.name + ' закрыт. Опыта за заход: ' + run.xpThisRun +
      (hero.level >= 40 ? '. Уровень 40 — в основе отсюда откроется ключ.' : '. Сейчас ур. ' + hero.level + '.');
    $('end-modal').classList.remove('hidden');
  }

  function failRun() {
    run.finished = true;
    hero.stats.wipes = (hero.stats.wipes || 0) + 1;
    const pity = Math.round(run.xpThisRun * 0.2);
    run.xpThisRun = pity;
    if (pity) gainXp(pity, 'утешение за вайп');
    save();
    $('end-title').textContent = 'Вайп';
    $('end-msg').textContent = 'Отряд пал. Герой жив. Опыта за заход сохранено 20% (' + pity + ').';
    $('end-modal').classList.remove('hidden');
  }

  function leaveRun() {
    if (run && !run.finished) failRun();
    else backHub();
  }

  function backHub() {
    clearTimeout(aiTimer);
    run = null; combat = null; pendingTarget = null;
    $('end-modal').classList.add('hidden');
    $('rest-modal').classList.add('hidden');
    $('talent-modal').classList.add('hidden');
    document.body.className = '';
    renderHub();
  }

  /* ---------- boot ---------- */
  function setTavern() {
    const url = G.ASSETS + 'backgrounds/lobby-tavern.jpg';
    const bg =
      'linear-gradient(180deg, rgba(6,8,12,.72) 0%, rgba(8,10,14,.55) 28%, rgba(10,12,16,.62) 100%), url(' +
      JSON.stringify(url) + ')';
    ['create', 'hub'].forEach(id => {
      const el = $(id);
      if (el) {
        el.style.backgroundImage = bg;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center 35%';
      }
    });
  }

  function bind() {
    setTavern();
    $('btn-create').onclick = () => {
      const name = $('hero-name').value;
      hero = newHero(name, pickSpec);
      save();
      renderHub();
    };
    $('btn-queue').onclick = startQueue;
    $('btn-enter').onclick = enterDungeon;
    $('btn-requeue').onclick = () => { queuedParty = rollParty(); showBrief(); };
    $('btn-leave').onclick = leaveRun;
    $('btn-hub').onclick = backHub;
    $('btn-respec').onclick = () => {
      if (!hero) return;
      hero.talents = {};
      save();
      toast('Таланты сброшены');
      renderHub();
    };
    $('rest-heal').onclick = () => {
      run.party.forEach(p => {
        if (!p.alive) return;
        p.hp = clamp(p.hp + Math.round((p.maxHp - p.hp) * 0.45), 0, p.maxHp);
        if (p.res.primary) p.res.primary.current = clamp(p.res.primary.current + Math.round(p.res.primary.max * 0.25), 0, p.res.primary.max);
      });
      $('rest-modal').classList.add('hidden');
      log('Отряд перевёл дух.', 'heal');
      advanceRoom();
    };
    $('rest-go').onclick = () => { $('rest-modal').classList.add('hidden'); advanceRoom(); };
    $('btn-speed').onclick = () => {
      gameSpeed = gameSpeed === 1 ? 2 : gameSpeed === 2 ? 4 : 1;
      $('btn-speed').textContent = 'Скорость ' + gameSpeed + '×';
    };
    $('dbg-lvl').onclick = () => {
      if (!hero || hero.level >= 40) return;
      hero.level++;
      hero.xp = 0;
      save();
      toast('ур. ' + hero.level);
      renderHub();
      const t = pendingTalentTier();
      if (t) openTalentModal(t);
    };
    $('dbg-xp').onclick = () => { gainXp(400, 'отладка'); renderHub(); };
    $('dbg-40').onclick = () => {
      hero.level = 40; hero.xp = 0; save(); renderHub();
      const t = pendingTalentTier();
      if (t) openTalentModal(t);
    };
    $('dbg-reset').onclick = () => {
      if (!confirm('Удалить героя песочницы?')) return;
      hero = null; save(); pickSpec = null; show('create'); renderCreate();
    };
  }

  bind();
  hero = load();
  if (hero) renderHub();
  else { show('create'); renderCreate(); }
})(window.LP);
