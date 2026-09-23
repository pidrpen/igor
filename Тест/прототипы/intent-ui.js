/* Проба «Намерения» — экран. Логика в intent-logic.js. */
(function () {
  'use strict';
  const P = window.IntentProto;
  const $ = (id) => document.getElementById(id);
  const BEST_KEY = 'mkProtoIntent_v1';

  let st = null;
  let undo = [];
  let sel = null;       /* выбранный герой */
  let pending = null;   /* { hero, ab } — ждём цель */
  let busy = false;     /* идёт ход врагов */
  let hintText = '';

  const best = (() => { try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}') || {}; } catch (_) { return {}; } })();
  function saveBest() { try { localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch (_) {} }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const heroName = (id) => P.heroDef(id).name;
  const heroColor = (id) => P.heroDef(id).color;

  function start(idx) {
    st = P.newFight(idx);
    undo = [];
    pending = null;
    busy = false;
    hintText = 'Выбери героя, потом способность. Сначала ходят все пятеро, потом враги — по номерам.';
    sel = nextHero();
    $('over').hidden = true;
    render();
  }

  function nextHero(after) {
    const list = st.heroes.filter(h => !h.dead && !h.acted);
    if (!list.length) return null;
    if (after) {
      const i = P.HEROES.findIndex(h => h.id === after);
      for (let k = 1; k <= P.HEROES.length; k++) {
        const id = P.HEROES[(i + k) % P.HEROES.length].id;
        if (list.some(h => h.id === id)) return id;
      }
    }
    return list[0].id;
  }

  /* ── намерение словами ── */
  function describe(e) {
    const it = e.intent;
    const out = { cls: 'k-calm', kind: '', what: it.name, amt: '', tgt: '', why: '' };
    const alive = (key) => st.enemies.filter(x => !x.dead && x.key === key).length;
    switch (it.kind) {
      case 'hit': out.cls = 'k-hit'; out.kind = 'Удар по одному'; out.amt = it.amount + ' HP'; break;
      case 'cast': out.cls = 'k-cast'; out.kind = 'Каст · можно сбить'; out.amt = it.amount + ' HP'; break;
      case 'castAll': out.cls = 'k-cast'; out.kind = 'Каст по всем · можно сбить'; out.amt = it.amount + ' HP каждому'; out.tgt = 'весь отряд'; break;
      case 'all': {
        out.cls = 'k-all'; out.kind = 'По всем · не сбить';
        const n = it.perAdd ? alive(it.addKey) : 0;
        out.amt = (it.amount + (it.perAdd || 0) * n) + ' HP каждому';
        if (it.perAdd) out.why = it.amount + ' HP + ' + it.perAdd + ' HP × ' + n + ' живых Тени';
        out.tgt = 'весь отряд';
        break;
      }
      case 'healAlly': out.cls = 'k-heal'; out.kind = 'Лечит своих · можно сбить'; out.amt = '+' + it.amount + ' HP'; out.tgt = 'самому раненому врагу'; break;
      case 'summon': out.kind = 'Призыв'; out.amt = it.count + ' × ' + P.ENEMY[it.spawn].name; break;
      case 'charge': out.cls = 'k-all'; out.kind = 'Готовит'; out.tgt = it.note; break;
      default: out.kind = 'Выжидает';
    }
    if (it.targetId && (it.kind === 'hit' || it.kind === 'cast')) out.tgtHero = it.targetId;
    if (e.stun) { out.off = true; out.why = 'оглушён — пропустит ход'; }
    else if (e.sheep) { out.off = true; out.why = 'овца — пропустит ход, не бей его'; }
    else if (it.interrupted) { out.off = true; out.why = 'сбит'; }
    else if (it.taunted) out.why = 'провокация: бьёт воина';
    return out;
  }

  /* ── отрисовка ── */
  function render() {
    const f = P.FIGHTS[st.fight];
    $('where').textContent = f.name + ' · ход ' + st.round;
    $('lesson').textContent = f.lesson;
    const nav = $('fights');
    nav.textContent = '';
    P.FIGHTS.forEach((ff, i) => {
      const b = el('button', 'btn' + (i === st.fight ? ' on' : ''), ff.name);
      b.type = 'button';
      if (best[ff.id]) b.append(el('span', 'stars', '★'.repeat(best[ff.id])));
      b.addEventListener('click', () => { if (!busy) start(i); });
      nav.append(b);
    });

    const pv = st.phase === 'player' ? P.preview(st) : null;
    const pendAb = pending ? P.abDef(pending.hero, pending.ab) : null;

    /* враги */
    const box = $('enemies');
    box.textContent = '';
    for (const e of st.enemies) {
      if (e.dead && !e.intent) continue;
      const wrap = el('div', 'enemy' + (e.dead ? ' dead' : ''));
      wrap.dataset.uid = e.uid;
      if (!e.dead && e.intent) {
        const d = describe(e);
        const card = el('div', 'intent ' + d.cls + (d.off ? ' off' : ''));
        card.append(el('span', 'ord', String(e.intent.order)));
        card.append(el('div', 'kind', d.kind));
        const line = el('div');
        line.append(el('span', 'what', d.what + ' '), el('span', 'amt', d.amt));
        card.append(line);
        if (d.tgtHero) {
          const t = el('div', 'tgt', '→ ');
          const b = el('b', null, heroName(d.tgtHero));
          b.style.color = heroColor(d.tgtHero);
          t.append(b);
          card.append(t);
        } else if (d.tgt) card.append(el('div', 'tgt', d.tgt));
        if (d.why) card.append(el('div', 'why', d.why));
        wrap.append(card);
      }
      const ec = el('div', 'ecard');
      const nm = el('div', 'nm');
      nm.append(el('span', 'ic', e.icon), el('span', null, e.name + (e.boss ? ' · босс' : '')));
      ec.append(nm);
      const bar = el('div', 'bar');
      const fill = el('i');
      fill.style.width = (100 * e.hp / e.maxHp) + '%';
      bar.append(fill);
      ec.append(bar);
      const num = el('div', 'num');
      num.append(el('span', null, e.dead ? 'повержен' : e.hp + ' / ' + e.maxHp + ' HP'),
        el('span', null, !e.dead && e.hp <= e.maxHp / 2 ? 'Отравление добьёт' : ''));
      ec.append(num);
      const chips = el('div', 'chips');
      if (e.sheep) chips.append(el('span', 'chip cc', 'овца'));
      if (e.stun) chips.append(el('span', 'chip cc', 'оглушён'));
      if (e.mark) chips.append(el('span', 'chip mk', 'метка +50% урона'));
      if (e.boss) chips.append(el('span', 'chip', 'не превращается и не оглушается'));
      ec.append(chips);
      wrap.append(ec);
      if (pendAb && pendAb.target === 'enemy' && !e.dead) {
        const ok = P.validTarget(st, pending.hero, pending.ab, e.uid);
        wrap.classList.add(ok ? 'pick' : 'nopick');
        if (ok) {
          wrap.tabIndex = 0;
          wrap.setAttribute('role', 'button');
          wrap.setAttribute('aria-label', pendAb.name + ' → ' + e.name);
          wrap.addEventListener('click', () => doAct(pending.hero, pending.ab, e.uid));
          wrap.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); doAct(pending.hero, pending.ab, e.uid); } });
        }
      }
      box.append(wrap);
    }

    /* герои */
    const hb = $('heroes');
    hb.textContent = '';
    for (const h of st.heroes) {
      const d = P.heroDef(h.id);
      const card = el('button', 'hero');
      card.type = 'button';
      card.dataset.hid = h.id;
      card.style.setProperty('--c', d.color);
      if (h.dead) card.classList.add('dead');
      else if (h.acted) card.classList.add('acted');
      if (sel === h.id && !pending) card.classList.add('sel');
      const nm = el('div', 'nm');
      nm.append(el('span', null, d.icon), el('b', null, d.name), el('span', null, d.spec));
      card.append(nm);
      const bar = el('div', 'bar');
      const p = pv && pv[h.id];
      const after = p ? Math.max(0, p.hp) : h.hp;
      const hpFill = el('i');
      hpFill.style.width = (100 * after / h.maxHp) + '%';
      hpFill.style.setProperty('--fill', '#3ecf8e');
      bar.append(hpFill);
      if (after < h.hp) {
        const loss = el('i', 'loss');
        loss.style.left = (100 * after / h.maxHp) + '%';
        loss.style.width = (100 * (h.hp - after) / h.maxHp) + '%';
        bar.append(loss);
      }
      if (h.shield) {
        const sh = el('i', 'sh');
        sh.style.left = Math.min(100, 100 * h.hp / h.maxHp) + '%';
        sh.style.width = Math.min(100, 100 * h.shield / h.maxHp) + '%';
        bar.append(sh);
      }
      card.append(bar);
      const num = el('div', 'num');
      num.append(el('span', null, h.dead ? 'погиб' : h.hp + ' / ' + h.maxHp + ' HP' + (h.shield ? ' · щит ' + h.shield + ' HP' : '')));
      card.append(num);
      const fc = el('div', 'fc');
      if (!h.dead && p) {
        if (p.loss > 0) {
          fc.classList.add('hurt');
          const hpLoss = h.hp - Math.max(0, p.hp), shLoss = h.shield - p.shield;
          fc.textContent = 'прилетит −' + hpLoss + ' HP' + (shLoss > 0 ? ', щит примет ' + shLoss : '');
          if (p.dead) fc.append(el('span', 'die', 'УМРЁТ'));
        } else {
          fc.classList.add('safe');
          fc.textContent = 'в этот ход не пострадает';
        }
      }
      card.append(fc);
      const stt = el('div', 'st');
      const bits = [];
      if (h.dr) bits.push('−' + Math.round(h.dr * 100) + '% урона');
      const cds = d.abilities.filter(a => (h.cd[a.id] || 0) > 0).map(a => a.name + ' ' + h.cd[a.id] + ' ход.');
      if (cds.length) bits.push('откат: ' + cds.join(', '));
      stt.textContent = bits.join(' · ');
      card.append(stt);
      if (pendAb && pendAb.target === 'ally') {
        if (!h.dead) { card.classList.add('pick'); card.setAttribute('aria-label', pendAb.name + ' → ' + d.name); }
        card.addEventListener('click', () => { if (!h.dead) doAct(pending.hero, pending.ab, h.id); });
      } else {
        card.disabled = h.dead || h.acted || busy || st.phase !== 'player';
        card.addEventListener('click', () => { sel = h.id; pending = null; hintText = ''; render(); });
      }
      hb.append(card);
    }

    /* способности */
    const who = $('who');
    const abs = $('abs');
    abs.textContent = '';
    if (sel && st.phase === 'player') {
      const d = P.heroDef(sel);
      who.innerHTML = '';
      const b = el('b', null, d.icon + ' ' + d.name);
      b.style.color = d.color;
      who.append(b, el('span', 'muted', ' · ' + d.spec + ' · клавиши 1–4, Esc — отмена цели'));
      d.abilities.forEach((a, i) => {
        const btn = el('button', 'ab' + (pending && pending.ab === a.id ? ' on' : ''));
        btn.type = 'button';
        const t = el('div', 't');
        t.append(el('span', null, a.name), el('kbd', null, String(i + 1)));
        btn.append(t, el('div', 'd', a.desc));
        const cd = st.heroes.find(h => h.id === sel).cd[a.id] || 0;
        const can = P.canUse(st, sel, a.id) && P.targetsFor(st, sel, a.id).length > 0;
        if (cd > 0) btn.append(el('div', 'd', 'Откат: ещё ' + cd + ' ход.'));
        else if (!P.targetsFor(st, sel, a.id).length) btn.append(el('div', 'd', 'Сейчас не на кого'));
        btn.disabled = !can || busy;
        btn.addEventListener('click', () => pickAbility(a.id));
        abs.append(btn);
      });
    } else {
      who.textContent = st.phase === 'player' ? 'Все сходили — жми «Конец хода»' : '';
    }
    $('hint').textContent = hintText;

    const left = st.heroes.filter(h => !h.dead && !h.acted).length;
    $('end').textContent = left ? 'Конец хода · не сходили ' + left : 'Конец хода';
    $('end').disabled = busy || st.phase !== 'player';
    $('undo').disabled = busy || !undo.length || st.phase !== 'player';
    renderLog();
  }

  function renderLog() {
    const lg = $('log');
    lg.textContent = '';
    let lastRound = null;
    const items = st.log.slice(-40);
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.round !== lastRound) { lg.append(el('p', 'r', 'Ход ' + it.round)); lastRound = it.round; }
      lg.append(el('p', it.cls, it.text));
    }
  }

  /* ── действия ── */
  function pickAbility(abId) {
    if (busy || !sel) return;
    const a = P.abDef(sel, abId);
    if (!P.canUse(st, sel, abId)) return;
    if (pending && pending.ab === abId) { pending = null; hintText = ''; render(); return; }
    if (a.target === 'none') { doAct(sel, abId, null); return; }
    pending = { hero: sel, ab: abId };
    hintText = a.target === 'ally' ? a.name + ': выбери союзника' : a.name + ': выбери врага (подсвечены те, на кого можно)';
    render();
  }

  function floatAt(node, text, cls) {
    if (!node) return;
    const r = node.getBoundingClientRect();
    const f = el('div', 'float ' + cls, text);
    f.style.left = (r.left + r.width / 2 - 20) + 'px';
    f.style.top = (r.top + 8) + 'px';
    document.body.append(f);
    setTimeout(() => f.remove(), 1000);
  }
  const enemyNode = (uid) => document.querySelector('.enemy[data-uid="' + uid + '"] .ecard');
  const heroNode = (hid) => document.querySelector('.hero[data-hid="' + hid + '"]');

  function showEvents(events) {
    for (const e of events) {
      if (e.type === 'dmg') floatAt(enemyNode(e.to), '−' + e.amount, 'dmg');
      else if (e.type === 'heal' && e.amount) floatAt(heroNode(e.to), '+' + e.amount, 'heal');
      else if (e.type === 'kick') floatAt(enemyNode(e.to), 'СБИТ', 'abs');
      else if (e.type === 'cc') floatAt(enemyNode(e.to), 'пропустит', 'abs');
      else if (e.type === 'taunt') floatAt(enemyNode(e.to), '→ воин', 'abs');
    }
  }

  function doAct(heroId, abId, target) {
    if (busy) return;
    const snap = P.clone(st);
    if (!P.act(st, heroId, abId, target)) return;
    undo.push(snap);
    pending = null;
    hintText = '';
    const events = st.events.slice();
    sel = nextHero(heroId);
    showEvents(events);
    render();
    if (st.phase === 'won') setTimeout(showOver, 500);
  }

  function endTurn() {
    if (busy || st.phase !== 'player') return;
    busy = true;
    pending = null;
    render();
    P.endTurn(st);
    const events = st.events.slice();
    /* ход врагов проигрываем на старом экране, потом рисуем итог */
    let t = 0;
    for (const e of events) {
      if (e.type === 'enemyAct') {
        t += 420;
        const uid = e.from;
        setTimeout(() => {
          const w = document.querySelector('.enemy[data-uid="' + uid + '"]');
          if (w) { w.classList.remove('flash'); void w.offsetWidth; w.classList.add('flash'); }
        }, t);
      } else if (e.type === 'hurt') {
        const ev = e;
        setTimeout(() => {
          if (ev.absorbed) floatAt(heroNode(ev.to), 'щит −' + ev.absorbed, 'abs');
          if (ev.amount) floatAt(heroNode(ev.to), '−' + ev.amount, 'dmg');
        }, t + 120);
      } else if (e.type === 'eheal') {
        const ev = e;
        setTimeout(() => floatAt(enemyNode(ev.to), '+' + ev.amount, 'heal'), t + 120);
      }
    }
    setTimeout(() => {
      busy = false;
      undo = [];
      sel = nextHero();
      hintText = st.phase === 'player' ? 'Новый ход: враги объявили, что сделают.' : '';
      render();
      if (st.phase !== 'player') setTimeout(showOver, 300);
    }, t + 650);
  }

  function showOver() {
    const f = P.FIGHTS[st.fight];
    const g = P.grade(st);
    $('over-t').textContent = st.phase === 'won' ? f.name + ': победа' : f.name + ': отряд не вытянул';
    $('over-stars').textContent = g ? '★'.repeat(g.stars) + '☆'.repeat(3 - g.stars) + '  ' + g.text : '';
    if (g && (best[f.id] || 0) < g.stars) { best[f.id] = g.stars; saveBest(); }
    const dl = $('over-dl');
    dl.textContent = '';
    const rows = [
      ['Ходов', st.round + (st.phase === 'won' ? ' (три звезды — не дольше ' + P.FIGHTS_PAR[st.fight] + ')' : '')],
      ['Погибло героев', String(st.stats.deaths)],
      ['Урона по отряду', st.stats.taken + ' HP'],
      ['Поглощено щитами', st.stats.absorbed + ' HP'],
      ['Сорвано намерений врагов', String(st.stats.prevented)],
    ];
    for (const [a, b] of rows) dl.append(el('dt', null, a), el('dd', null, b));
    const acts = $('over-acts');
    acts.textContent = '';
    const again = el('button', 'btn', 'Ещё раз');
    again.type = 'button';
    again.addEventListener('click', () => start(st.fight));
    acts.append(again);
    if (st.phase === 'won' && st.fight + 1 < P.FIGHTS.length) {
      const nx = el('button', 'btn btn-main', 'Следующий бой: ' + P.FIGHTS[st.fight + 1].name);
      nx.type = 'button';
      nx.addEventListener('click', () => start(st.fight + 1));
      acts.prepend(nx);
    }
    $('over').hidden = false;
    (acts.querySelector('.btn-main') || again).focus();
  }

  $('end').addEventListener('click', endTurn);
  $('undo').addEventListener('click', () => {
    if (busy || !undo.length) return;
    st = undo.pop();
    pending = null;
    hintText = 'Отменено';
    sel = nextHero();
    render();
  });
  $('restart').addEventListener('click', () => { if (!busy) start(st.fight); });
  document.addEventListener('keydown', (e) => {
    if (!$('over').hidden || busy) return;
    if (e.key === 'Escape') { pending = null; hintText = ''; render(); return; }
    if (/^[1-4]$/.test(e.key) && sel) {
      const a = P.heroDef(sel).abilities[+e.key - 1];
      if (a) pickAbility(a.id);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); $('undo').click(); }
  });

  start(0);
})();
