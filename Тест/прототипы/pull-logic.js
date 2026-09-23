/* Проба «Пулл» — логика без DOM (браузер и node).
 * Карта данжа, таймер, силы врага. Игрок выбирает, какие паки тянуть разом, какие откаты жать,
 * когда пить. Бой считается сам: урон по области растёт с числом мобов, входящий урон — тоже.
 * Время в секундах, урон отряда в «т/с» (тысячи в секунду, как в игре), здоровье отряда — общий запас в %. */
(function (G) {
  'use strict';

  const PARTY = {
    dps: 10,          /* т/с по одной цели */
    aoePer: 0.6,      /* +60% общего урона за каждого моба сверх первого (до 8 мобов) */
    aoeCap: 8,
    heal: 3.2,        /* % запаса в секунду */
    manaPerPct: 0.3,  /* маны за 1% вылеченного в бою */
    topupPerPct: 0.2, /* маны за 1% после боя */
    walk: 6,          /* с за переход между соседними залами */
    gather: 4,        /* с за каждый лишний пак в пулле (собрать в кучу) */
    drink: 25,        /* с — попить до полной маны */
    deathRun: 20,     /* с — бег от входа за каждого погибшего */
    wipeRun: 35,      /* с — вайп: все бегут от входа */
  };

  const MOBS = {
    novice: { name: 'Послушник', hp: 140, dmg: 0.9 },
    warrior: { name: 'Воин ша', hp: 190, dmg: 1.1 },
    caster: { name: 'Ритуалист', hp: 115, dmg: 1.4 },
    guard: { name: 'Страж', hp: 520, dmg: 2.4 },
  };

  const CDS = [
    { id: 'lust', name: 'Героизм', short: '+30% урона 40 с', cd: Infinity, dur: 40, once: true, desc: 'Раз за ключ. +30% урона отряда на 40 с.' },
    { id: 'wall', name: 'Стена щитов', short: '−40% входящего 15 с', cd: 180, dur: 15, desc: 'Воин: отряд получает на 40% меньше урона 15 с. Откат 3 мин.' },
    { id: 'hymn', name: 'Божественный гимн', short: '+40% запаса, хил ×2 8 с', cd: 180, dur: 8, desc: 'Жрец: сразу +40% запаса и двойное лечение 8 с. Откат 3 мин.' },
    { id: 'burst', name: 'Откаты бойцов', short: '+25% урона 20 с', cd: 120, dur: 20, desc: 'Возгорание, Вендетта, Быстрая стрельба: +25% урона 20 с. Откат 2 мин.' },
  ];

  const P = (id, x, y, mobs, forces, extra) => Object.assign({ id, x, y, mobs, forces, kind: 'pack' }, extra || {});
  const MAP = {
    name: 'Нефритовый Монастырь',
    timer: 15 * 60,
    nodes: [
      { id: 'start', x: 50, y: 520, kind: 'start', name: 'Вход' },
      P('p1', 140, 440, ['novice', 'novice', 'warrior', 'warrior'], 8),
      P('p2', 120, 290, ['novice', 'novice', 'novice', 'caster'], 8),
      P('p3', 250, 370, ['warrior', 'warrior', 'caster', 'caster'], 9),
      P('p4', 270, 520, ['novice', 'novice', 'novice', 'novice'], 7),
      P('p5', 330, 230, ['guard', 'novice', 'novice'], 12),
      { id: 'mid', x: 420, y: 380, kind: 'boss', name: 'Ученик ша', hp: 1000, dmg: 2.6, forces: 0 },
      P('p6', 520, 490, ['warrior', 'warrior', 'warrior'], 8),
      P('p7', 530, 270, ['caster', 'caster', 'novice', 'novice'], 8),
      P('p8', 640, 380, ['guard', 'caster'], 10),
      P('p9', 650, 160, ['warrior', 'warrior', 'warrior', 'warrior'], 10),
      P('p10', 740, 500, ['novice', 'novice', 'novice', 'caster', 'caster'], 10),
      P('p11', 790, 290, ['guard', 'guard'], 15),
      P('p12', 870, 440, ['novice', 'novice', 'novice', 'novice', 'warrior'], 9),
      { id: 'final', x: 940, y: 250, kind: 'boss', name: 'Ша Сомнения', hp: 1300, dmg: 2.9, forces: 0, last: true },
    ],
    edges: [['start', 'p1'], ['start', 'p4'], ['p1', 'p2'], ['p1', 'p3'], ['p4', 'p3'], ['p2', 'p5'], ['p3', 'p5'],
      ['p3', 'mid'], ['p5', 'mid'], ['mid', 'p6'], ['mid', 'p7'], ['p6', 'p8'], ['p7', 'p8'], ['p7', 'p9'],
      ['p8', 'p10'], ['p8', 'p11'], ['p9', 'p11'], ['p10', 'p12'], ['p11', 'p12'], ['p11', 'final'], ['p12', 'final']],
    patrol: { id: 'pat', name: 'Патруль', mobs: ['warrior', 'warrior', 'caster'], forces: 8, path: ['p7', 'p8'], period: 40 },
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const node = (id) => MAP.nodes.find(n => n.id === id);
  const nbrs = (id) => MAP.edges.filter(e => e[0] === id || e[1] === id).map(e => (e[0] === id ? e[1] : e[0]));

  function newRun() {
    return {
      time: 0, pos: 'start', cleared: { start: true }, forces: 0, patrolDead: false,
      pool: 100, mana: 100, deaths: 0, wipes: 0, cdReady: { lust: 0, wall: 0, hymn: 0, burst: 0 }, lustUsed: false,
      log: [], pulls: 0, done: false, failed: false,
    };
  }

  function patrolAt(st, t) {
    if (st.patrolDead) return null;
    const p = MAP.patrol;
    return p.path[Math.floor((t == null ? st.time : t) / p.period) % p.path.length];
  }

  /* сколько секунд идти до ближайшего зала из набора: по зачищенным залам */
  function walkTime(st, set) {
    const want = new Set(set);
    const seen = new Set([st.pos]);
    let front = [st.pos], d = 0;
    while (front.length) {
      const next = [];
      for (const id of front) {
        for (const n of nbrs(id)) {
          if (seen.has(n)) continue;
          if (want.has(n)) return (d + 1) * PARTY.walk;
          seen.add(n);
          if (st.cleared[n]) next.push(n);
        }
      }
      front = next;
      d++;
    }
    return null; /* не дойти: путь закрыт живыми паками или боссом */
  }

  function connected(set) {
    if (set.length <= 1) return true;
    const s = new Set(set), seen = new Set([set[0]]), q = [set[0]];
    while (q.length) { const id = q.shift(); for (const n of nbrs(id)) if (s.has(n) && !seen.has(n)) { seen.add(n); q.push(n); } }
    return seen.size === set.length;
  }

  /* можно ли тянуть такой набор. Возвращает текст причины или '' */
  function checkPull(st, set) {
    if (!set.length) return 'Выбери пак на карте';
    for (const id of set) {
      const n = node(id);
      if (!n || n.kind === 'start') return 'Это не пак';
      if (st.cleared[id]) return 'Этот зал уже зачищен';
    }
    if (set.some(id => node(id).kind === 'boss') && set.length > 1) return 'Босса тянут отдельно';
    if (!connected(set)) return 'Паки в пулле должны быть соседними';
    if (walkTime(st, set) == null) return 'Не дойти: путь перекрыт';
    const fin = set.find(id => node(id).last);
    if (fin && !st.cleared.mid) return 'Сначала Ученик ша';
    return '';
  }

  function cdAvailable(st, id) {
    if (id === 'lust') return !st.lustUsed;
    return st.cdReady[id] <= st.time;
  }

  /* собрать мобов пулла (с патрулём, если он стоит в одном из залов) */
  function gatherMobs(st, set, tStart) {
    const mobs = [];
    let boss = null;
    for (const id of set) {
      const n = node(id);
      if (n.kind === 'boss') { boss = n; mobs.push({ name: n.name, hp: n.hp, max: n.hp, dmg: n.dmg, boss: true }); continue; }
      n.mobs.forEach(k => mobs.push({ name: MOBS[k].name, hp: MOBS[k].hp, max: MOBS[k].hp, dmg: MOBS[k].dmg }));
    }
    const pat = patrolAt(st, tStart);
    const withPatrol = !boss && pat && set.includes(pat);
    if (withPatrol) MAP.patrol.mobs.forEach(k => mobs.push({ name: MOBS[k].name + ' (патруль)', hp: MOBS[k].hp, max: MOBS[k].hp, dmg: MOBS[k].dmg }));
    return { mobs, withPatrol, boss };
  }

  /* Прогон пулла. Не меняет st. Возвращает всё, что нужно и прогнозу, и исполнению. */
  function simulate(st, set, cds) {
    const travel = walkTime(st, set) + PARTY.gather * (set.length - 1);
    const t0 = st.time + travel;
    const g = gatherMobs(st, set, t0);
    const mobs = g.mobs.map(m => Object.assign({}, m));
    const use = {};
    for (const id of cds || []) if (cdAvailable(st, id)) use[id] = true;
    let pool = st.pool, mana = st.mana, t = 0, deaths = 0, minPool = pool, wipe = false;
    if (use.hymn) pool = Math.min(100, pool + 40);
    const dt = 0.25;
    const trace = [];
    while (mobs.some(m => m.hp > 0)) {
      const alive = mobs.filter(m => m.hp > 0);
      let mult = 1 * Math.pow(0.78, deaths);
      if (use.lust && t < 40) mult *= 1.3;
      if (use.burst && t < 20) mult *= 1.25;
      const n = Math.min(alive.length, PARTY.aoeCap);
      const total = PARTY.dps * mult * (1 + PARTY.aoePer * (n - 1));
      /* урон поровну по живым: мобы с меньшим HP падают раньше */
      for (const m of alive) m.hp -= total / alive.length * dt;
      let inc = alive.reduce((s, m) => s + m.dmg, 0);
      if (use.wall && t < 15) inc *= 0.6;
      let heal = mana > 0 ? PARTY.heal * (use.hymn && t < 8 ? 2 : 1) : 0;
      const need = Math.max(0, 100 - pool + inc * dt);
      const h = Math.min(heal * dt, need);
      mana = Math.max(0, mana - h * PARTY.manaPerPct);
      pool = Math.min(100, pool - inc * dt + h);
      minPool = Math.min(minPool, pool);
      if (pool <= 0) { wipe = true; break; }
      if (deaths === 0 && pool < 25) deaths = 1;
      else if (deaths === 1 && pool < 10) deaths = 2;
      t += dt;
      if (Math.round(t * 4) % 8 === 0) trace.push({ t, pool: Math.max(0, pool), left: mobs.reduce((s, m) => s + Math.max(0, m.hp), 0) });
      if (t > 600) { wipe = true; break; }
    }
    const fightTime = Math.round(t);
    let after = 0;
    if (!wipe) after += deaths * PARTY.deathRun;
    else after += PARTY.wipeRun;
    /* после боя жрец доливает запас: за ману, не за время */
    let poolEnd = wipe ? 100 : pool, manaEnd = wipe ? 100 : mana;
    if (!wipe) {
      const top = Math.min(100 - poolEnd, manaEnd / PARTY.topupPerPct);
      poolEnd += top;
      manaEnd -= top * PARTY.topupPerPct;
    }
    const forces = wipe ? 0 : set.reduce((s, id) => s + (node(id).forces || 0), 0) + (g.withPatrol ? MAP.patrol.forces : 0);
    return {
      set: set.slice(), travel, fight: fightTime, after, total: travel + fightTime + after, wipe, deaths, minPool: Math.max(0, Math.round(minPool)),
      poolEnd: Math.round(poolEnd), manaEnd: Math.round(manaEnd), forces, withPatrol: g.withPatrol, mobs: g.mobs.length, used: Object.keys(use), trace,
    };
  }

  function pull(st, set, cds) {
    const why = checkPull(st, set);
    if (why) return { error: why };
    const r = simulate(st, set, cds);
    st.time += r.total;
    for (const id of r.used) {
      if (id === 'lust') st.lustUsed = true;
      else st.cdReady[id] = st.time - r.after - r.fight + CDS.find(c => c.id === id).cd;
    }
    st.pulls++;
    if (r.wipe) {
      st.wipes++;
      st.pool = 100; st.mana = 100;
      st.log.push({ t: st.time, cls: 'bad', text: 'Вайп на ' + names(set) + ' — все бегут от входа (+' + PARTY.wipeRun + ' с)' });
    } else {
      for (const id of set) st.cleared[id] = true;
      if (r.withPatrol) st.patrolDead = true;
      st.forces += r.forces;
      st.deaths += r.deaths;
      st.pool = r.poolEnd; st.mana = r.manaEnd;
      st.pos = set[set.length - 1];
      st.log.push({ t: st.time, cls: r.deaths ? 'warn' : 'good', text: names(set) + (r.withPatrol ? ' + патруль' : '') + ': ' + r.fight + ' с боя'
        + (r.deaths ? ', погибло ' + r.deaths + ' (+' + r.deaths * PARTY.deathRun + ' с)' : '') + (r.forces ? ', +' + r.forces + '% сил' : '') });
    }
    checkDone(st);
    return r;
  }

  function drink(st) {
    st.time += PARTY.drink;
    st.mana = 100;
    st.log.push({ t: st.time, cls: '', text: 'Попили: мана 100% (+' + PARTY.drink + ' с)' });
    checkDone(st);
  }
  function wait(st, sec) {
    st.time += sec;
    st.log.push({ t: st.time, cls: '', text: 'Ждём ' + sec + ' с' });
    checkDone(st);
  }

  function checkDone(st) {
    if (st.cleared.final && st.cleared.mid && st.forces >= 100) st.done = true;
    else if (st.cleared.final && st.forces < 100) { /* босс убит, сил не хватает — надо добрать */ }
    if (st.time > MAP.timer && !st.done) st.failed = true;
  }

  function names(set) { return set.map(id => node(id).name || ('Пак ' + id.slice(1))).join(' + '); }

  function result(st) {
    if (!st.done) return null;
    const used = st.time / MAP.timer;
    const plus = used <= 0.6 ? 3 : used <= 0.8 ? 2 : used <= 1 ? 1 : 0;
    return { plus, used, text: plus ? 'В срок: +' + plus : 'Не в срок' };
  }

  G.PullProto = { PARTY, MOBS, CDS, MAP, node, nbrs, newRun, patrolAt, walkTime, checkPull, cdAvailable, simulate, pull, drink, wait, result, names, clone };
})(typeof window !== 'undefined' ? window : globalThis);
