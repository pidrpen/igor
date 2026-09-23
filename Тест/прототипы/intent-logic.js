/* Проба «Намерения» — логика без DOM (работает и в браузере, и в node для ботов).
 * Враги объявляют ход заранее: что сделают и по кому. У отряда пять действий, чтобы ответить.
 * Сначала ходят все герои (в любом порядке), потом враги исполняют объявленное — по номерам. */
(function (G) {
  'use strict';

  const HEROES = [
    { id: 'war', name: 'Воин', spec: 'Защита', role: 'tank', icon: '🛡️', color: '#C79C6E', maxHp: 180, abilities: [
      { id: 'slam', name: 'Удар щитом', target: 'enemy', dmg: 14, cd: 1, desc: '14 HP урона врагу.' },
      { id: 'taunt', name: 'Провокация', target: 'enemy', taunt: true, cd: 2, desc: 'Удар этого врага по герою уходит в воина. Откат 2 хода.' },
      { id: 'shout', name: 'Вызывающий крик', target: 'none', massTaunt: true, cd: 4, desc: 'Все одиночные удары врагов в этот ход уходят в воина. Откат 4 хода.' },
      { id: 'wall', name: 'Стена щитов', target: 'none', selfDr: 0.6, cd: 3, desc: 'Воин получает на 60% меньше урона в этот ход. Откат 3 хода.' },
    ] },
    { id: 'pri', name: 'Жрец', spec: 'Послушание', role: 'healer', icon: '✝️', color: '#F5F5F5', maxHp: 110, abilities: [
      { id: 'heal', name: 'Исцеление', target: 'ally', heal: 40, cd: 1, desc: '+40 HP союзнику.' },
      { id: 'pws', name: 'Слово силы: Щит', target: 'ally', shield: 45, cd: 2, desc: 'Щит на 45 HP, держится, пока не пробьют. Откат 2 хода.' },
      { id: 'poh', name: 'Молитва исцеления', target: 'none', healAll: 18, cd: 2, desc: '+18 HP всему отряду. Откат 2 хода.' },
      { id: 'ps', name: 'Подавление боли', target: 'ally', dr: 0.5, cd: 3, desc: 'Союзник получает на 50% меньше урона в этот ход. Откат 3 хода.' },
    ] },
    { id: 'mag', name: 'Маг', spec: 'Огонь', role: 'dps', icon: '🔥', color: '#69CCF0', maxHp: 95, abilities: [
      { id: 'fireball', name: 'Огненный шар', target: 'enemy', dmg: 26, cd: 1, desc: '26 HP урона.' },
      { id: 'flamestrike', name: 'Огненный столб', target: 'none', dmgAll: 10, cd: 2, desc: '10 HP урона всем врагам. Снимает Превращение. Откат 2 хода.' },
      { id: 'counterspell', name: 'Антимагия', target: 'enemy', kick: true, cd: 2, desc: 'Сбивает каст врага. Откат 2 хода.' },
      { id: 'poly', name: 'Превращение', target: 'enemy', sheep: true, cd: 3, desc: 'Враг пропускает свой ход. Любой урон по нему снимает овцу. Откат 3 хода.' },
    ] },
    { id: 'rog', name: 'Разбойник', spec: 'Ликвидация', role: 'dps', icon: '🗡️', color: '#E8D84A', maxHp: 100, abilities: [
      { id: 'mutilate', name: 'Расправа', target: 'enemy', dmg: 22, cd: 1, desc: '22 HP урона.' },
      { id: 'envenom', name: 'Отравление', target: 'enemy', execute: true, cd: 1, desc: '45 HP урона, если у цели половина HP или меньше, иначе 12.' },
      { id: 'kick', name: 'Пинок', target: 'enemy', kick: true, cd: 2, desc: 'Сбивает каст врага. Откат 2 хода.' },
      { id: 'kidney', name: 'Удар по почкам', target: 'enemy', stun: true, cd: 3, desc: 'Враг пропускает свой ход. Урон не снимает. Откат 3 хода.' },
    ] },
    { id: 'hun', name: 'Охотник', spec: 'Стрельба', role: 'dps', icon: '🏹', color: '#ABD473', maxHp: 100, abilities: [
      { id: 'aimed', name: 'Прицельный выстрел', target: 'enemy', dmg: 24, cd: 1, desc: '24 HP урона.' },
      { id: 'multi', name: 'Многократный выстрел', target: 'none', dmgAll: 9, cd: 1, desc: '9 HP урона всем врагам. Снимает Превращение.' },
      { id: 'silence', name: 'Глушащий выстрел', target: 'enemy', kick: true, cd: 2, desc: 'Сбивает каст врага. Откат 2 хода.' },
      { id: 'mark', name: 'Метка охотника', target: 'enemy', mark: 0.5, cd: 2, desc: 'Цель получает на 50% больше урона от отряда до конца хода. Сначала метка — потом бить. Откат 2 хода.' },
    ] },
  ];

  /* Намерения врага.
   *  hit   — удар по одному герою: переводится Провокацией, режется щитом.
   *  cast  — каст по одному герою: сбивается киком, переводится Провокацией.
   *  castAll — каст по всем: только сбить.
   *  all   — удар по всем: не сбить, только пережить.
   *  healAlly — лечит самого раненого врага: сбить, оглушить или убить.
   *  summon / charge / idle — без урона. */
  const E = {
    guard: { name: 'Нефритовый страж', icon: '🗿', maxHp: 140, script: [
      { kind: 'hit', name: 'Удар алебардой', amount: 32, target: 'tank' },
      { kind: 'all', name: 'Размах', amount: 18 },
      { kind: 'hit', name: 'Удар алебардой', amount: 32, target: 'tank' },
    ] },
    adept: { name: 'Ученик ша', icon: '👤', maxHp: 80, script: [
      { kind: 'cast', name: 'Стрела тьмы', amount: 50, target: 'weakest' },
      { kind: 'castAll', name: 'Волна тьмы', amount: 24 },
    ] },
    archer: { name: 'Нефритовый лучник', icon: '🏹', maxHp: 75, script: [
      { kind: 'hit', name: 'Выстрел в спину', amount: 46, target: 'weakest' },
      { kind: 'hit', name: 'Выстрел', amount: 34, target: 'healer' },
    ] },
    ritA: { name: 'Ритуалист', icon: '📿', maxHp: 90, script: [
      { kind: 'castAll', name: 'Теневая вспышка', amount: 28 },
      { kind: 'cast', name: 'Порча', amount: 44, target: 'weakest' },
    ] },
    ritB: { name: 'Ритуалист', icon: '📿', maxHp: 90, script: [
      { kind: 'cast', name: 'Порча', amount: 44, target: 'weakest' },
      { kind: 'castAll', name: 'Теневая вспышка', amount: 28 },
    ] },
    mystic: { name: 'Мистик', icon: '🔮', maxHp: 85, script: [
      { kind: 'healAlly', name: 'Тёмное исцеление', amount: 50 },
      { kind: 'castAll', name: 'Теневая вспышка', amount: 28 },
    ] },
    brute: { name: 'Громила', icon: '💪', maxHp: 150, script: [
      { kind: 'hit', name: 'Сокрушение', amount: 40, target: 'tank' },
      { kind: 'hit', name: 'Сокрушение', amount: 40, target: 'tank' },
      { kind: 'all', name: 'Топот', amount: 16 },
    ] },
    sha: { name: 'Ша Сомнения', icon: '👁️', maxHp: 480, boss: true, script: [
      { kind: 'hit', name: 'Удар сомнения', amount: 50, target: 'tank' },
      { kind: 'summon', name: 'Зов теней', spawn: 'shade', count: 2 },
      { kind: 'charge', name: 'Сгущение сомнения', note: 'Следующий ход: Волна сомнения — 45 HP всем, +20 HP за каждую живую Тень' },
      { kind: 'all', name: 'Волна сомнения', amount: 45, perAdd: 20, addKey: 'shade' },
    ] },
    shade: { name: 'Тень сомнения', icon: '🌑', maxHp: 40, script: [
      { kind: 'hit', name: 'Касание тени', amount: 28, target: 'healer' },
    ] },
  };

  const FIGHTS = [
    { id: 'yard', name: 'Двор фонарей', lesson: 'Провокация уводит удар на воина, кик сбивает каст, убитый враг не ходит.', enemies: ['guard', 'adept', 'archer'] },
    { id: 'choir', name: 'Хор ритуалистов', lesson: 'Кастов больше, чем киков. Решай, что сбить, что заглушить овцой или оглушением, а что принять щитом.', enemies: ['brute', 'ritA', 'ritB', 'mystic'] },
    { id: 'sha', name: 'Ша Сомнения', lesson: 'Босс объявляет Волну за ход вперёд. Каждая живая Тень делает её сильнее — успей убить Тени и подготовить отряд.', enemies: ['sha'] },
  ];

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const heroDef = (id) => HEROES.find(h => h.id === id);
  const abDef = (heroId, abId) => heroDef(heroId).abilities.find(a => a.id === abId);
  const SINGLE = { hit: 1, cast: 1 };
  const KICKABLE = { cast: 1, castAll: 1, healAlly: 1 };

  function makeEnemy(st, key) {
    const d = E[key];
    return { uid: 'e' + (st.nextUid++), key, name: d.name, icon: d.icon, hp: d.maxHp, maxHp: d.maxHp, boss: !!d.boss,
      step: 0, intent: null, sheep: false, stun: false, mark: 0, dead: false, fresh: true };
  }

  function newFight(idx) {
    const f = FIGHTS[idx];
    const st = {
      fight: idx, round: 1, phase: 'player', log: [], nextUid: 1, events: [],
      heroes: HEROES.map(h => ({ id: h.id, hp: h.maxHp, maxHp: h.maxHp, shield: 0, dr: 0, acted: false, cd: {}, dead: false })),
      enemies: [],
      stats: { taken: 0, deaths: 0, absorbed: 0, prevented: 0 },
    };
    f.enemies.forEach(k => st.enemies.push(makeEnemy(st, k)));
    rollIntents(st);
    return st;
  }

  const livingHeroes = (st) => st.heroes.filter(h => !h.dead);
  const livingEnemies = (st) => st.enemies.filter(e => !e.dead);
  const heroOf = (st, id) => st.heroes.find(h => h.id === id);
  const enemyOf = (st, uid) => st.enemies.find(e => e.uid === uid);
  const roleHero = (st, role) => livingHeroes(st).find(h => heroDef(h.id).role === role);

  function weakest(st) {
    const list = livingHeroes(st).slice();
    list.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp) || a.maxHp - b.maxHp);
    return list[0] || null;
  }

  function pickTarget(st, rule) {
    if (rule === 'tank') return roleHero(st, 'tank') || weakest(st);
    if (rule === 'healer') return roleHero(st, 'healer') || weakest(st);
    return weakest(st);
  }

  function rollIntents(st) {
    let order = 1;
    for (const e of st.enemies) {
      if (e.dead) continue;
      const script = E[e.key].script;
      const def = script[e.step % script.length];
      const it = Object.assign({}, def, { order: order++, interrupted: false, taunted: false });
      if (SINGLE[it.kind]) {
        const t = pickTarget(st, it.target);
        it.targetId = t ? t.id : null;
      }
      e.intent = it;
      e.fresh = false;
    }
  }

  /* ── что можно нажать ── */
  function canUse(st, heroId, abId) {
    if (st.phase !== 'player') return false;
    const h = heroOf(st, heroId);
    if (!h || h.dead || h.acted) return false;
    return !((h.cd[abId] || 0) > 0);
  }

  function validTarget(st, heroId, abId, targetId) {
    const ab = abDef(heroId, abId);
    if (ab.target === 'none') return targetId == null;
    if (ab.target === 'ally') { const t = heroOf(st, targetId); return !!(t && !t.dead); }
    const e = enemyOf(st, targetId);
    if (!e || e.dead) return false;
    const it = e.intent;
    if (ab.kick) return !!(it && KICKABLE[it.kind] && !it.interrupted);
    if (ab.taunt) {
      const tank = roleHero(st, 'tank');
      return !!(it && SINGLE[it.kind] && !it.interrupted && tank && it.targetId !== tank.id);
    }
    if (ab.sheep || ab.stun) return !e.boss && !e.sheep && !e.stun;
    if (ab.mark) return !e.mark;
    return true;
  }

  function targetsFor(st, heroId, abId) {
    const ab = abDef(heroId, abId);
    if (ab.target === 'none') return [null];
    if (ab.target === 'ally') return livingHeroes(st).map(h => h.id);
    return livingEnemies(st).map(e => e.uid).filter(uid => validTarget(st, heroId, abId, uid));
  }

  function note(st, text, cls) { st.log.push({ round: st.round, text, cls: cls || '' }); }
  function ev(st, e) { st.events.push(e); }

  function hitEnemy(st, e, amount, src) {
    if (e.dead) return 0;
    const dmg = Math.round(amount * (1 + (e.mark || 0)));
    e.hp -= dmg;
    ev(st, { type: 'dmg', to: e.uid, amount: dmg });
    if (e.sheep) { e.sheep = false; note(st, e.name + ': овца спала от удара', 'warn'); }
    if (e.hp <= 0) {
      e.hp = 0; e.dead = true;
      const it = e.intent;
      if (it && it.kind !== 'idle') st.stats.prevented++;
      note(st, src + ' добивает: ' + e.name + (it ? ' — «' + it.name + '» сорван' : ''), 'good');
      ev(st, { type: 'kill', to: e.uid });
    }
    return dmg;
  }

  /* ход героя. Возвращает true, если действие прошло. */
  function act(st, heroId, abId, targetId) {
    if (!canUse(st, heroId, abId) || !validTarget(st, heroId, abId, targetId)) return false;
    st.events = [];
    const h = heroOf(st, heroId), hd = heroDef(heroId), ab = abDef(heroId, abId);
    const who = hd.name;
    if (ab.dmg) {
      const e = enemyOf(st, targetId);
      const d = hitEnemy(st, e, ab.dmg, who);
      note(st, who + ': ' + ab.name + ' → ' + e.name + ' −' + d + ' HP');
    } else if (ab.execute) {
      const e = enemyOf(st, targetId);
      const low = e.hp <= e.maxHp / 2;
      const d = hitEnemy(st, e, low ? 45 : 12, who);
      note(st, who + ': ' + ab.name + (low ? ' (добивание)' : '') + ' → ' + e.name + ' −' + d + ' HP');
    } else if (ab.dmgAll) {
      for (const e of livingEnemies(st)) hitEnemy(st, e, ab.dmgAll, who);
      note(st, who + ': ' + ab.name + ' — по всем −' + ab.dmgAll + ' HP');
    } else if (ab.kick) {
      const e = enemyOf(st, targetId);
      e.intent.interrupted = true;
      st.stats.prevented++;
      note(st, who + ': ' + ab.name + ' — «' + e.intent.name + '» сбит', 'good');
      ev(st, { type: 'kick', to: e.uid });
    } else if (ab.taunt) {
      const e = enemyOf(st, targetId);
      e.intent.targetId = roleHero(st, 'tank').id;
      e.intent.taunted = true;
      note(st, who + ': ' + ab.name + ' — ' + e.name + ' бьёт воина');
      ev(st, { type: 'taunt', to: e.uid });
    } else if (ab.massTaunt) {
      const tank = roleHero(st, 'tank');
      for (const e of livingEnemies(st)) {
        const it = e.intent;
        if (it && SINGLE[it.kind] && !it.interrupted && it.targetId !== tank.id) { it.targetId = tank.id; it.taunted = true; ev(st, { type: 'taunt', to: e.uid }); }
      }
      note(st, who + ': ' + ab.name + ' — все одиночные удары на воина');
    } else if (ab.selfDr) {
      h.dr = Math.max(h.dr, ab.selfDr);
      note(st, who + ': ' + ab.name + ' — −' + Math.round(ab.selfDr * 100) + '% урона в этот ход');
      ev(st, { type: 'buff', to: h.id });
    } else if (ab.heal) {
      const t = heroOf(st, targetId);
      const got = Math.min(ab.heal, t.maxHp - t.hp);
      t.hp += got;
      note(st, who + ': ' + ab.name + ' → ' + heroDef(t.id).name + ' +' + got + ' HP', 'heal');
      ev(st, { type: 'heal', to: t.id, amount: got });
    } else if (ab.shield) {
      const t = heroOf(st, targetId);
      t.shield = Math.max(t.shield, ab.shield);
      note(st, who + ': ' + ab.name + ' → ' + heroDef(t.id).name + ' (щит ' + ab.shield + ' HP)', 'heal');
      ev(st, { type: 'buff', to: t.id });
    } else if (ab.healAll) {
      for (const t of livingHeroes(st)) { const got = Math.min(ab.healAll, t.maxHp - t.hp); t.hp += got; if (got) ev(st, { type: 'heal', to: t.id, amount: got }); }
      note(st, who + ': ' + ab.name + ' — всем +' + ab.healAll + ' HP', 'heal');
    } else if (ab.dr) {
      const t = heroOf(st, targetId);
      t.dr = Math.max(t.dr, ab.dr);
      note(st, who + ': ' + ab.name + ' → ' + heroDef(t.id).name, 'heal');
      ev(st, { type: 'buff', to: t.id });
    } else if (ab.sheep) {
      const e = enemyOf(st, targetId); e.sheep = true;
      note(st, who + ': ' + ab.name + ' — ' + e.name + ' пропустит ход (не бей его!)');
      ev(st, { type: 'cc', to: e.uid });
    } else if (ab.stun) {
      const e = enemyOf(st, targetId); e.stun = true;
      note(st, who + ': ' + ab.name + ' — ' + e.name + ' пропустит ход');
      ev(st, { type: 'cc', to: e.uid });
    } else if (ab.mark) {
      const e = enemyOf(st, targetId); e.mark = ab.mark;
      note(st, who + ': ' + ab.name + ' → ' + e.name + ' (+50% урона до конца хода)');
      ev(st, { type: 'buff', to: e.uid });
    }
    h.acted = true;
    h.cd[abId] = ab.cd || 1;
    if (!livingEnemies(st).length) finish(st, true);
    return true;
  }

  function hurtHero(st, h, amount, what) {
    if (h.dead) return 0;
    let dmg = Math.round(amount * (1 - (h.dr || 0)));
    const absorbed = Math.min(h.shield, dmg);
    h.shield -= absorbed; dmg -= absorbed;
    st.stats.absorbed += absorbed;
    h.hp -= dmg;
    st.stats.taken += dmg;
    ev(st, { type: 'hurt', to: h.id, amount: dmg, absorbed });
    if (h.hp <= 0) {
      h.hp = 0; h.dead = true; st.stats.deaths++;
      note(st, heroDef(h.id).name + ' погибает от «' + what + '»', 'bad');
      ev(st, { type: 'death', to: h.id });
    }
    return dmg;
  }

  /* исполнить объявленное врагами (мутирует st). silent — для прогноза */
  function resolveEnemies(st) {
    const acting = st.enemies.filter(e => !e.dead).slice();
    for (const e of acting) {
      if (e.dead) continue;
      const it = e.intent;
      if (!it) continue;
      if (e.stun) { e.stun = false; note(st, e.name + ' оглушён — ход пропущен'); continue; }
      if (e.sheep) { e.sheep = false; note(st, e.name + ' в облике овцы — ход пропущен'); continue; }
      if (it.interrupted) continue;
      ev(st, { type: 'enemyAct', from: e.uid });
      if (it.kind === 'hit' || it.kind === 'cast') {
        let t = heroOf(st, it.targetId);
        if (!t || t.dead) t = pickTarget(st, 'weakest');
        if (!t) break;
        const d = hurtHero(st, t, it.amount, it.name);
        note(st, e.name + ': ' + it.name + ' → ' + heroDef(t.id).name + ' −' + d + ' HP', 'bad');
      } else if (it.kind === 'castAll' || it.kind === 'all') {
        let amt = it.amount;
        if (it.perAdd) amt += it.perAdd * st.enemies.filter(x => !x.dead && x.key === it.addKey).length;
        for (const t of livingHeroes(st)) hurtHero(st, t, amt, it.name);
        note(st, e.name + ': ' + it.name + ' — всем −' + amt + ' HP', 'bad');
      } else if (it.kind === 'healAlly') {
        const hurt = livingEnemies(st).filter(x => x.hp < x.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (hurt) { const got = Math.min(it.amount, hurt.maxHp - hurt.hp); hurt.hp += got; note(st, e.name + ': ' + it.name + ' → ' + hurt.name + ' +' + got + ' HP', 'bad'); ev(st, { type: 'eheal', to: hurt.uid, amount: got }); }
      } else if (it.kind === 'summon') {
        for (let i = 0; i < it.count; i++) { const n = makeEnemy(st, it.spawn); n.fresh = true; st.enemies.push(n); }
        note(st, e.name + ': ' + it.name + ' — ' + it.count + ' × ' + E[it.spawn].name, 'bad');
      } else if (it.kind === 'charge') {
        note(st, e.name + ': ' + it.name + ' — ' + it.note, 'warn');
      }
      if (livingHeroes(st).length <= 2) break;
    }
  }

  function preview(st) {
    const c = clone(st);
    c.log = []; c.events = [];
    resolveEnemies(c);
    const out = {};
    for (const h of c.heroes) {
      const was = heroOf(st, h.id);
      out[h.id] = { hp: h.hp, shield: h.shield, dead: h.dead && !was.dead, loss: (was.hp + was.shield) - (h.hp + h.shield) };
    }
    return out;
  }

  function finish(st, win) {
    st.phase = win ? 'won' : 'lost';
    note(st, win ? 'Пак зачищен' : 'Отряд не вытянул', win ? 'good' : 'bad');
  }

  function endTurn(st) {
    if (st.phase !== 'player') return false;
    st.events = [];
    st.phase = 'enemy';
    resolveEnemies(st);
    if (livingHeroes(st).length <= 2) { finish(st, false); return true; }
    if (!livingEnemies(st).length) { finish(st, true); return true; }
    st.round++;
    for (const h of st.heroes) {
      h.acted = false; h.dr = 0;
      for (const k of Object.keys(h.cd)) { h.cd[k] = Math.max(0, h.cd[k] - 1); }
    }
    for (const e of st.enemies) { e.mark = 0; if (!e.dead && !e.fresh) e.step++; }
    rollIntents(st);
    st.phase = 'player';
    return true;
  }

  function grade(st) {
    if (st.phase !== 'won') return null;
    if (st.stats.deaths === 0 && st.round <= FIGHTS_PAR[st.fight]) return { stars: 3, text: 'Чисто и быстро' };
    if (st.stats.deaths === 0) return { stars: 2, text: 'Без потерь' };
    return { stars: 1, text: 'С потерями: ' + st.stats.deaths };
  }
  const FIGHTS_PAR = [5, 8, 8];

  G.IntentProto = { HEROES, ENEMY: E, FIGHTS, FIGHTS_PAR, newFight, canUse, validTarget, targetsFor, act, endTurn, preview,
    heroDef, abDef, livingHeroes, livingEnemies, grade, clone, KICKABLE, SINGLE };
})(typeof window !== 'undefined' ? window : globalThis);
