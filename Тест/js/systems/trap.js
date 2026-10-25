/* systems/trap: «Ловушка бойца» на мид-боссе ключа.
 * С 60% HP босса (раз за бой) случайного бойца запирает с двумя тюремщиками.
 * Запертый бьёт только их, они бьют только его, снаружи не лечат и не достают (_trapId + fieldSameHall).
 * Оба тюремщика мертвы — боец свободен. Боец умер или босс с пачкой пали — тюремщики выходят к остальным.
 */
  const TRAP_AT = 0.6;

  (function wrapSameHall() {
    const base = typeof fieldSameHall === 'function' ? fieldSameHall : null;
    const wrapped = function (a, b) {
      const ka = (a && a._trapId) || null;
      const kb = (b && b._trapId) || null;
      if (ka !== kb) return false;
      return base ? base(a, b) : true;
    };
    window.fieldSameHall = wrapped;
    try { fieldSameHall = wrapped; } catch (_) {}
  })();

  function trapTick() {
    if (!combat || combat.over || !run || run.raid) return;
    const trap = combat.trap;
    if (!trap) {
      tryStartTrap();
      return;
    }
    if (trap.done) return;
    const hero = run.party.find(p => p.uid === trap.heroUid);
    const mobs = (combat.enemies || []).filter(e => e._trapId === trap.id);
    const mobsAlive = mobs.filter(e => e.alive && e.hp > 0);
    const outsideFoes = (combat.enemies || []).filter(e => e.alive && e.hp > 0 && !e._trapId && !e.instObject && !e.vaultAway);
    if (!mobsAlive.length) {
      releaseTrap(hero, mobs, `⛓ ${hero ? hero.name : 'Боец'} вырвался из ловушки`);
    } else if (!hero || !hero.alive || hero.hp <= 0) {
      releaseTrap(hero, mobs, '⛓ Ловушка пуста — тюремщики выходят к пачке');
    } else if (!outsideFoes.length) {
      releaseTrap(hero, mobs, '⛓ Босс пал — ловушка открылась');
    }
  }

  function tryStartTrap() {
    if (combat.type !== 'boss' || combat._trapTried) return;
    const boss = (combat.enemies || []).find(e => e.isBoss && e.alive && e.hp > 0);
    if (!boss || boss.hp / boss.maxHp > TRAP_AT) return;
    combat._trapTried = true;
    const dps = livingHeroes().filter(h => h.role === 'dps' && !h._trapId);
    if (!dps.length) return;
    const hero = dps[Math.floor(Math.random() * dps.length)];
    const id = 'trap_' + combat.round + '_' + hero.uid;
    const eff = getEff(hero);
    const mobs = [0, 1].map((k) => {
      const m = scaleEnemy({
        id: 'z', name: '⛓ Тюремщик', icon: '⛓', role: 'dps', hp: 10, atk: 10, def: 2, speed: 9 + k,
        abilities: [{ id: 'chain_strike', name: 'Удар цепью', type: 'damage', power: 1, cd: 0 }],
      }, run.keyLevel, false, false);
      m.maxHp = m.hp = Math.max(1, Math.round(eff.atk * 3));
      m.atk = Math.max(1, Math.round(hero.maxHp * 0.07));
      m.forcesValue = 0;
      m._trapId = id;
      return m;
    });
    combat.enemies.push(...mobs);
    hero._trapId = id;
    applyStatus(hero, { id: 'trapped', name: 'Ловушка', icon: '⛓', turns: 99, tip: 'Бьёшь только тюремщиков. Снаружи не лечат.' });
    combat.trap = { id, heroUid: hero.uid, done: false };
    log(`⛓ Ловушка: ${hero.name} заперт с двумя тюремщиками — пока не убьёт, не выйдет. Умрёт — они выйдут к пачке.`, 'enemy');
    try { toast('⛓ Ловушка: ' + hero.name); } catch (_) {}
    try { renderCombat(); } catch (_) {}
  }

  function releaseTrap(hero, mobs, msg) {
    combat.trap.done = true;
    mobs.forEach(e => { e._trapId = null; });
    if (hero) {
      hero._trapId = null;
      hero.buffs = (hero.buffs || []).filter(b => b && b.id !== 'trapped');
    }
    log(msg, 'system');
    try { renderCombat(); } catch (_) {}
  }

  window.trapTick = trapTick;
