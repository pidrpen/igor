/* Проба «Пулл» — экран. Логика в pull-logic.js. */
(function () {
  'use strict';
  const P = window.PullProto;
  const $ = (id) => document.getElementById(id);
  const SVG = 'http://www.w3.org/2000/svg';
  const BEST_KEY = 'mkProtoPull_v1';

  let st, sel, cdsOn, busy = false, shownTime = 0;

  const mm = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function sv(tag, attrs, text) { const e = document.createElementNS(SVG, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; }
  const label = (n) => n.kind === 'boss' ? n.name : 'Пак ' + n.id.slice(1);

  function start() {
    st = P.newRun();
    sel = [];
    cdsOn = new Set();
    shownTime = 0;
    busy = false;
    $('over').hidden = true;
    render();
  }

  function composition(ids) {
    const count = {};
    for (const id of ids) {
      const n = P.node(id);
      if (n.kind === 'boss') { count[n.name + ' (босс)'] = 1; continue; }
      n.mobs.forEach(k => { const nm = P.MOBS[k].name; count[nm] = (count[nm] || 0) + 1; });
    }
    return Object.entries(count).map(([k, v]) => (v > 1 ? v + ' × ' : '') + k).join(', ');
  }

  /* ── карта ── */
  function renderMap() {
    const svg = $('map');
    svg.textContent = '';
    for (const [a, b] of P.MAP.edges) {
      const A = P.node(a), B = P.node(b);
      svg.append(sv('line', { x1: A.x, y1: A.y, x2: B.x, y2: B.y, class: 'edge' + (st.cleared[a] && st.cleared[b] ? ' walk' : '') }));
    }
    const pat = P.patrolAt(st);
    if (pat) {
      const [a, b] = P.MAP.patrol.path.map(P.node);
      svg.append(sv('path', { d: `M${a.x + 30} ${a.y - 30} L${b.x + 30} ${b.y - 30}`, class: 'pat-path' }));
    }
    for (const n of P.MAP.nodes) {
      if (n.kind === 'start') {
        const g = sv('g', { class: 'node done' });
        g.append(sv('circle', { cx: n.x, cy: n.y, r: 16, class: 'ring' }), sv('text', { x: n.x, y: n.y + 38, class: 'sub' }, 'Вход'));
        svg.append(g);
        continue;
      }
      const done = !!st.cleared[n.id];
      const can = !done && !P.checkPull(st, [n.id]);
      const r = n.kind === 'boss' ? 30 : 16 + n.mobs.length * 3;
      const g = sv('g', { class: 'node' + (n.kind === 'boss' ? ' boss' : '') + (done ? ' done' : '') + (sel.includes(n.id) ? ' sel' : '') + (can ? ' can' : (!done ? ' far' : '')), tabindex: done ? -1 : 0, role: 'button' });
      g.append(sv('title', {}, label(n) + (n.kind === 'boss' ? ' — ' + n.hp + ' т HP' : ': ' + composition([n.id]) + ' · ' + n.forces + '% сил')));
      g.append(sv('circle', { cx: n.x, cy: n.y, r, class: 'ring' }));
      g.append(sv('text', { x: n.x, y: n.y + 5 }, done ? '✓' : n.kind === 'boss' ? '★' : String(n.mobs.length)));
      g.append(sv('text', { x: n.x, y: n.y + r + 18, class: 'sub' }, label(n) + (n.forces ? ' · ' + n.forces + '%' : '')));
      if (!done) {
        g.addEventListener('click', () => toggle(n.id));
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(n.id); } });
      }
      svg.append(g);
    }
    if (pat) {
      const p = P.node(pat);
      const g = sv('g', { class: 'pat' });
      g.append(sv('title', {}, 'Патруль: ' + P.MAP.patrol.mobs.map(k => P.MOBS[k].name).join(', ') + ' · ' + P.MAP.patrol.forces + '% сил'));
      g.append(sv('circle', { cx: p.x + 30, cy: p.y - 30, r: 11 }));
      const left = P.MAP.patrol.period - (st.time % P.MAP.patrol.period);
      g.append(sv('text', { x: p.x + 30, y: p.y - 50 }, 'патруль · ' + Math.ceil(left) + ' с'));
      svg.append(g);
    }
    const me = P.node(st.pos);
    const pg = sv('g', { class: 'party' });
    pg.append(sv('circle', { cx: me.x - 22, cy: me.y - 30, r: 13 }), sv('text', { x: me.x - 22, y: me.y - 25 }, 'Вы'));
    svg.append(pg);
  }

  function toggle(id) {
    if (busy) return;
    const n = P.node(id);
    if (n.kind === 'boss') sel = sel.includes(id) ? [] : [id];
    else {
      sel = sel.filter(x => P.node(x).kind !== 'boss');
      sel = sel.includes(id) ? sel.filter(x => x !== id) : sel.concat(id);
    }
    render();
  }

  /* ── панель пулла ── */
  function renderPanel() {
    $('pull-title').textContent = sel.length ? 'Пулл: ' + P.names(sel).replace(/Пак p?/g, 'Пак ') : 'Выбери пак на карте';
    const why = P.checkPull(st, sel);
    const comp = $('comp');
    comp.textContent = '';
    if (sel.length) {
      const b = el('b', null, composition(sel));
      comp.append(b);
    } else {
      comp.textContent = 'Один пак — безопасно, но долго. Два-три соседних разом — быстрее за счёт урона по области, но без откатов отряд может не вытянуть.';
    }

    const cds = $('cds');
    cds.textContent = '';
    for (const c of P.CDS) {
      const ready = P.cdAvailable(st, c.id);
      const b = el('button', 'cd' + (cdsOn.has(c.id) && ready ? ' on' : ''));
      b.type = 'button';
      b.title = c.desc;
      b.append(el('b', null, c.name), el('span', null, c.short));
      b.append(el('span', null, c.id === 'lust' ? (ready ? 'готов · раз за ключ' : 'использован')
        : ready ? 'готов' : 'откат ещё ' + mm(st.cdReady[c.id] - st.time)));
      b.disabled = !ready || busy;
      b.setAttribute('aria-pressed', cdsOn.has(c.id) && ready ? 'true' : 'false');
      b.addEventListener('click', () => { cdsOn.has(c.id) ? cdsOn.delete(c.id) : cdsOn.add(c.id); render(); });
      cds.append(b);
    }

    const fc = $('forecast');
    fc.textContent = '';
    let r = null;
    if (sel.length && why) fc.append(el('p', 'warn', why));
    if (sel.length && !why) {
      r = P.simulate(st, sel, [...cdsOn]);
      if (r.withPatrol) fc.append(el('p', 'warn', 'Патруль будет в этом зале — присоединится (+' + P.MAP.patrol.mobs.length + ' моба, +' + P.MAP.patrol.forces + '% сил)'));
      if (r.wipe) fc.append(el('p', 'warn', 'ВАЙП: отряд не вытянет. Добавь откаты, попей или тяни меньше.'));
      else if (r.deaths) fc.append(el('p', 'warn', 'Погибнет ' + r.deaths + ': урон отряда −22% за каждого, после боя +' + r.deaths * P.PARTY.deathRun + ' с на бег'));
      else fc.append(el('p', 'okline', 'Без потерь · запас отряда не ниже ' + r.minPool + '%'));
      fc.append(spark(r));
      const dl = el('dl', 'fc');
      const rows = [
        ['Дорога и сбор', r.travel + ' с'],
        ['Бой', r.fight + ' с'],
      ];
      if (r.after) rows.push([r.wipe ? 'Бег после вайпа' : 'Бег после смертей', r.after + ' с']);
      rows.push(['Итого времени', r.total + ' с'], ['Силы', r.wipe ? '0%' : '+' + r.forces + '%'],
        ['Мана после', r.manaEnd + '%'], ['Сил за минуту', r.wipe ? '—' : (r.forces / r.total * 60).toFixed(1) + '%']);
      for (const [a, b] of rows) dl.append(el('dt', null, a), el('dd', null, b));
      fc.append(dl);
    }
    $('go').disabled = busy || !sel.length || !!why || st.done;
    $('go').textContent = r && r.wipe ? 'Тянуть (будет вайп)' : 'Тянуть';
    $('drink').disabled = busy || st.mana >= 100 || st.done;
    $('drink').textContent = 'Попить · +' + P.PARTY.drink + ' с';
    $('wait').disabled = busy || st.done;
  }

  function spark(r) {
    const w = 300, h = 56;
    const s = sv('svg', { class: 'spark', viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'none', role: 'img', 'aria-label': 'Запас отряда по ходу боя' });
    const tmax = Math.max(1, r.fight);
    s.append(sv('rect', { x: 0, y: 0, width: w, height: h, fill: '#0b0d12' }));
    s.append(sv('line', { x1: 0, x2: w, y1: h * 0.75, y2: h * 0.75, stroke: '#ef4444', 'stroke-dasharray': '4 4', 'stroke-width': 1, opacity: 0.6 }));
    const pts = [[0, r.trace.length ? 100 : 100]].concat(r.trace.map(p => [p.t, p.pool]));
    const d = pts.map((p, i) => (i ? 'L' : 'M') + (p[0] / tmax * w).toFixed(1) + ' ' + (h - p[1] / 100 * h).toFixed(1)).join(' ');
    s.append(sv('path', { d: d + ` L${w} ${h} L0 ${h} Z`, fill: 'rgba(52,211,153,.18)' }));
    s.append(sv('path', { d, fill: 'none', stroke: r.wipe ? '#ef4444' : '#34d399', 'stroke-width': 2 }));
    return s;
  }

  function renderHud() {
    const T = P.MAP.timer;
    $('t-val').textContent = mm(shownTime) + ' / ' + mm(T);
    $('t-left').textContent = shownTime <= T ? 'осталось ' + mm(T - shownTime) : 'просрочено на ' + mm(shownTime - T);
    $('t-bar').style.width = Math.min(100, shownTime / T * 100) + '%';
    $('t-bar').style.setProperty('--fill', shownTime > T ? '#ef4444' : shownTime > T * 0.8 ? '#f0b429' : '#34d399');
    $('m-time').classList.toggle('late', shownTime > T);
    $('f-val').textContent = st.forces + '%';
    $('f-bar').style.width = Math.min(100, st.forces) + '%';
    $('mn-val').textContent = Math.round(st.mana) + '%';
    $('mn-bar').style.width = st.mana + '%';
    $('d-val').textContent = 'смертей ' + st.deaths + (st.wipes ? ' · вайпов ' + st.wipes : '');
    $('b-val').textContent = (st.cleared.mid ? 1 : 0) + (st.cleared.final ? 1 : 0) + ' / 2';
  }

  function renderLog() {
    const lg = $('log');
    lg.textContent = '';
    if (!st.log.length) { lg.append(el('p', null, 'Пока ни одного пулла. Посмотри на карту: что тянуть первым, чтобы откаты успели откатиться к тяжёлым залам?')); return; }
    for (let i = st.log.length - 1; i >= 0; i--) {
      const l = st.log[i];
      const p = el('p', l.cls);
      p.append(el('span', 't', mm(l.t)), document.createTextNode(l.text.replace(/Пак p/g, 'Пак ')));
      lg.append(p);
    }
  }

  function render() {
    renderHud();
    renderMap();
    renderPanel();
    renderLog();
  }

  /* таймер бежит к новому значению — видно, сколько съел пулл */
  function animateTo(t, then) {
    busy = true;
    render();
    const from = shownTime, dur = 700, t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      shownTime = from + (t - from) * (1 - Math.pow(1 - k, 3));
      renderHud();
      if (k < 1) requestAnimationFrame(step);
      else { shownTime = t; busy = false; render(); if (then) then(); }
    };
    requestAnimationFrame(step);
  }

  function afterAction() {
    if (st.done) showOver();
  }

  function showOver() {
    const r = P.result(st);
    let best = 0;
    try { best = +(localStorage.getItem(BEST_KEY) || 0); } catch (_) {}
    if (r.plus > best) { try { localStorage.setItem(BEST_KEY, String(r.plus)); } catch (_) {} }
    $('over-t').textContent = r.plus ? 'Ключ закрыт в срок' : 'Ключ закрыт, но не в срок';
    $('over-big').textContent = r.plus ? '+' + r.plus : 'просрочен';
    const dl = $('over-dl');
    dl.textContent = '';
    const rows = [
      ['Время', mm(st.time) + ' из ' + mm(P.MAP.timer)],
      ['Пуллов', String(st.pulls)],
      ['Погибло героев', String(st.deaths)],
      ['Вайпов', String(st.wipes)],
      ['Силы', st.forces + '%'],
      ['+3 — не дольше', mm(P.MAP.timer * 0.6)],
      ['+2 — не дольше', mm(P.MAP.timer * 0.8)],
    ];
    if (best) rows.push(['Лучший результат раньше', '+' + best]);
    for (const [a, b] of rows) dl.append(el('dt', null, a), el('dd', null, b));
    $('over').hidden = false;
    $('over-again').focus();
  }

  $('go').addEventListener('click', () => {
    if (busy) return;
    const res = P.pull(st, sel, [...cdsOn]);
    if (res.error) return;
    sel = [];
    cdsOn = new Set();
    animateTo(st.time, afterAction);
  });
  $('drink').addEventListener('click', () => { if (!busy) { P.drink(st); animateTo(st.time); } });
  $('wait').addEventListener('click', () => { if (!busy) { P.wait(st, 10); animateTo(st.time); } });
  $('restart').addEventListener('click', start);
  $('over-again').addEventListener('click', start);
  document.addEventListener('keydown', (e) => {
    if (!$('over').hidden || busy) return;
    if (e.target && e.target.closest && e.target.closest('.node')) return;
    if (e.key === 'Enter' && !$('go').disabled) $('go').click();
    else if (e.key === 'Escape') { sel = []; render(); }
    else if (e.key.toLowerCase() === 'd' || e.key.toLowerCase() === 'в') { if (!$('drink').disabled) $('drink').click(); }
  });

  start();
})();
