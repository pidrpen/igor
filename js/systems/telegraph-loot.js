/* systems/telegraph-loot: telegraphs, interrupts, loot, key powers, pet helpers */
/* combat: systems + fight loop */
  function isSilenced(u) {
    return !!(u?.buffs?.some(b => (b.id === 'lock' || b.id === 'silence' || b.ccMode === 'silence') && b.turns > 0));
  }
  function isStunned(u) {
    return !!(u?.buffs?.some(b => (b.id === 'stun' || b.ccMode === 'stun') && b.turns > 0));
  }
  function hasMajorDef(u) {
    if (!u) return false;
    if ((u.shield || 0) > u.maxHp * 0.12) return true;
    return u.buffs?.some(b => b.defMod > 0.1 || ['elusive', 'shield_wall', 'icebound', 'dr_icebound', 'fort_brew', 'survival', 'barkskin', 'divine_prot', 'ardent'].includes(b.id));
  }
  function makeTelegraph(kind, opts = {}) {
    return {
      kind: kind || 'kick',
      target: opts.target || (kind === 'buster' ? 'tank' : 'all'),
      resolveIn: opts.resolveIn ?? 1,
      powerMult: opts.powerMult ?? 1,
      avoidable: opts.avoidable || false,
      interruptible: opts.interruptible !== false,
      name: opts.name || 'Каст',
      power: opts.power ?? 1,
      turns: opts.resolveIn ?? 1,
    };
  }
  function telegraphLabel(c) {
    if (!c) return '';
    const ic = TELE_ICONS[c.kind] || '✨';
    const map = { kick: 'Прерывание', buster: 'Удар по танку', aoe: 'По области', summon: 'Призыв', debuff: 'Ослабление' };
    const p = c.castPrio || c.priority ? ` P${c.castPrio || c.priority}` : '';
    return `${ic} ${map[c.kind] || c.kind}${p}: ${c.name || 'Каст'}`;
  }
  function resolveCasting(actor) {
    if (!actor?.casting || !combat) return;
    const c = actor.casting;
    actor.casting = null;
    // Missed interrupt escalation
    if (c.interruptible !== false && c.kind === 'kick') {
      actor.missedKicks = (actor.missedKicks || 0) + 1;
      log(`Пропущено прерывание! Эскалация ×${actor.missedKicks} на ${actor.name}`, 'enemy');
    }
    const esc = 1 + Math.min(0.75, (actor.missedKicks || 0) * 0.18);
    const base = Math.round(getEff(actor).atk * (c.power || 1) * (c.powerMult || 1) * esc);
    const kind = c.kind || 'aoe';

    if (kind === 'buster') {
      // Prefer current threat target (should be tank if holding)
      let t = getThreatTarget(actor) || livingHeroes().find(h => h.role === 'tank') || lowest(livingHeroes());
      if (!t) return;
      let dmg = Math.round(base * 1.45);
      if (hasMajorDef(t)) {
        dmg = Math.round(dmg * 0.45);
        log(`${t.name} смягчает удар по танку!`, 'heal');
      }
      if (t.dodging) { dmg = Math.round(dmg * 0.25); t.dodging = 0; }
      // Off-tank: if not tank, bonus damage (cleave punishment)
      if (t.role !== 'tank') {
        dmg = Math.round(dmg * 1.25);
        log('Удар по танку промахнулся мимо танка — +25%!', 'enemy');
      }
      const castCtx = { abilityName: c.name || 'Удар по танку' };
      const dealt = dealDmg(t, dmg, actor, castCtx);
      log(`${actor.name} завершает «${c.name}» → ${t.name} (−${fmt(dealt)})`, 'enemy');
      toast('Удар по танку: ' + c.name);
      return;
    }

    // default / aoe / kick fail — cleave; primary target takes more if threat is on squishy
    const targets = livingHeroes();
    let partySoft = combat.softSave ? 0.7 : 1;
    const primary = getThreatTarget(actor);
    const aoeCtx = { abilityName: c.name || 'По области' };
    for (const a of targets) {
      let dmg = Math.round(base * partySoft);
      if (primary && a.uid === primary.uid && primary.role !== 'tank') dmg = Math.round(dmg * 1.15);
      if (a.dodging) { dmg = Math.round(dmg * 0.2); a.dodging = 0; }
      if (a.thunderMark && hasEffect('thunder')) dmg = Math.round(dmg * 1.25);
      dealDmg(a, dmg, actor, aoeCtx);
    }
    if (combat.softSave) combat.softSave = false;
    log(`${actor.name} завершает «${c.name}»! (−${fmt(base)} по области${esc > 1 ? ', эскал. ' + esc.toFixed(2) : ''})`, 'enemy');
    toast((kind === 'kick' ? 'Каст (прервать!): ' : 'По области: ') + c.name);
  }
  function interruptCast(target, actor) {
    if (!target?.casting) return false;
    const name = target.casting.name;
    const prio = target.casting.castPrio || 1;
    target.casting = null;
    target.missedKicks = 0; // successful kick resets escalation
    const heat = (target.buffs || []).find(b => b.id === 'heat');
    if (heat) {
      heat.stacks = 0;
      log('Кик сбивает перегрев!', 'player');
    }
    applyStatus(target, { id: 'lock', name: 'Немота', icon: '🔇', turns: 2, ccMode: 'silence' });
    if (actor) addThreat(target, actor, 400 * prio);
    log(`${actor ? actor.name + ': ' : ''}прерывает «${name}»! Немота 2 хода`, 'player');
    toast('Прервано!');
    sfx('crit');
    return true;
  }
  function removeDispellable(unit, schools) {
    if (!unit?.buffs) return null;
    const i = unit.buffs.findIndex(b => b.dispellable && (!schools || schools.includes(b.school || 'magic')));
    if (i < 0) return null;
    const [gone] = unit.buffs.splice(i, 1);
    return gone;
  }
  function addBurstStacks(n) {
    livingHeroes().forEach(h => {
      h.burstStacks = Math.min(5, (h.burstStacks || 0) + n);
    });
  }
  function tickBurstStacks() {
    if (!hasEffect('burst')) return;
    livingHeroes().forEach(h => {
      const s = h.burstStacks || 0;
      if (s <= 0) return;
      const dmg = Math.round(h.maxHp * 0.04 * s);
      dealTrue(h, dmg, null);
      log(`${h.name}: Взрывной ×${s} −${fmt(dmg)}`, 'enemy');
    });
  }
  function applyLootItem(item) {
    if (!item || !run) return;
    run.loot = run.loot || [];
    run.loot.push(item);
    run.keyPowers = run.keyPowers || {};
    for (const p of run.party) {
      if (item.hpFlat) {
        const ratio = p.hp / Math.max(1, p.maxHp);
        p.maxHp = Math.round(p.maxHp * (1 + item.hpFlat));
        p.hp = clamp(Math.round(p.maxHp * ratio), 1, p.maxHp);
      }
      if (item.speedFlat) p.speed = Math.max(1, p.speed + item.speedFlat);
      if (item.defFlat) p.def = Math.round(p.def * (1 + item.defFlat));
      if (item.atkMult) p.atk = Math.round(p.atk * (1 + item.atkMult));
    }
    if (item.healMult) run.healLootMult = (run.healLootMult || 1) * (1 + item.healMult);
    if (item.trinketAtk) {
      run.trinketReady = true;
      run.trinketAtk = item.trinketAtk;
    }
    if (item.deathTax != null) run.deathTax = item.deathTax;
    if (item.kickCdBonus) {
      run.kickCdBonus = (run.kickCdBonus || 0) + item.kickCdBonus;
      // Apply to existing kick abilities
      for (const p of run.party) {
        for (const a of p.abilities || []) {
          if (a.type === 'interrupt' || INTERRUPT_IDS.has(a.id)) {
            a.baseCd = Math.max(1, (a.baseCd || a.cd || 2) - item.kickCdBonus);
            a.cd = a.baseCd;
          }
        }
      }
    }
    if (item.keyPower) {
      run.keyPowers[item.keyPower] = run.keyPowers[item.keyPower] || { charges: item.keyPower === 'battle_rez' || item.keyPower === 'skip_trash' ? 1 : 99, usedThisCombat: false };
      if (item.keyPower === 'battle_rez' || item.keyPower === 'skip_trash') {
        run.keyPowers[item.keyPower].charges = (run.keyPowers[item.keyPower].charges || 0) + 1;
      }
    }
    log(`Лут: ${item.icon} ${item.name}`, 'system');
    toast(`Лут: ${item.name}`);
    renderPowers();
  }

  function resetKeyPowersForCombat() {
    if (!run?.keyPowers) return;
    for (const k of Object.keys(run.keyPowers)) {
      if (k !== 'battle_rez' && k !== 'skip_trash') run.keyPowers[k].usedThisCombat = false;
    }
    if (run.trinketAtk) run.trinketReady = true;
  }

  function useKeyPower(id, actor) {
    if (!run?.keyPowers?.[id]) return false;
    const kp = run.keyPowers[id];
    if (kp.charges != null && kp.charges <= 0) { toast('Заряды исчерпаны'); return false; }
    if (kp.usedThisCombat && id !== 'battle_rez' && id !== 'skip_trash') { toast('Уже в этом бою'); return false; }

    if (id === 'lust') {
      for (const p of livingHeroes()) {
        applyStatus(p, { id: 'lust', name: 'Кровожадность', icon: '🥁', turns: 2, atkMod: 0.3 });
      }
      log('Барабаны битвы: +30% атаки на 2 хода', 'player');
      toast('Кровожадность!');
      kp.usedThisCombat = true;
      return true;
    }
    if (id === 'party_shield') {
      for (const p of livingHeroes()) {
        const sh = Math.round(p.maxHp * 0.18);
        if (typeof addUnitShield === 'function') {
          addUnitShield(p, {
            id: 'party_shield', name: 'Щит отряда', icon: '🛡',
            fromUid: actor && actor.uid, amount: sh, abilityId: 'party_shield',
          });
        } else {
          p.shield = (p.shield || 0) + sh;
        }
        pulseUnit(p.uid, 'shielded');
      }
      log('Оберег группы: щит 18% здоровья', 'heal');
      toast('Щит отряду');
      kp.usedThisCombat = true;
      return true;
    }
    if (id === 'hunter_mark') {
      const t = living('enemy').find(e => e.isBoss) || lowest(living('enemy'));
      if (!t) return false;
      applyStatus(t, {
        id: 'hmark', name: 'Метка', icon: '🏹', turns: 2, defMod: -0.25,
        dispellable: true, school: 'magic', fromUid: actor && actor.uid,
      });
      log(`Метка охотника на ${t.name}`, 'player');
      toast('Метка!');
      kp.usedThisCombat = true;
      return true;
    }
    if (id === 'battle_rez') {
      const dead = run.party.find(p => !p.alive);
      if (!dead) { toast('Некого воскрешать'); return false; }
      dead.alive = true;
      dead.hp = Math.round(dead.maxHp * 0.4);
      dead.shield = 0;
      dead.buffs = [];
      kp.charges = Math.max(0, (kp.charges || 1) - 1);
      log(`Камень возврата: ${dead.name} воскрешён (40% здоровья)`, 'heal');
      toast('Воскрешение!');
      renderCombat();
      return true;
    }
    if (id === 'skip_trash') {
      if (!combat || combat.over) return false;
      const node = currentRouteNode();
      if (!node || node.type !== 'trash') { toast('Только на trash-пулле'); return false; }
      // Clear pack without forces (you skipped)
      for (const e of combat.enemies) {
        e.alive = false; e.hp = 0; e.forcesValue = 0;
      }
      combat.over = true;
      kp.charges = Math.max(0, (kp.charges || 1) - 1);
      log('Карта обхода: пулл пропущен', 'system');
      toast('Обход!');
      setTimeout(() => onVictory(), 400);
      return true;
    }
    return false;
  }
  let lootDoneCb = null;
  function openLootDraft(done) {
    lootDoneCb = typeof done === 'function' ? done : null;
    const grid = document.getElementById('loot-grid');
    const modal = document.getElementById('loot-modal');
    if (!grid || !modal) { if (lootDoneCb) lootDoneCb(); return; }
    const pool = LOOT_DRAFT_POOL.slice();
    const picks = [];
    while (picks.length < 3 && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(i, 1)[0]);
    }
    grid.innerHTML = '';
    picks.forEach(item => {
      const div = document.createElement('div');
      div.className = 'loot-card';
      div.innerHTML = `<div class="lc-title">${item.icon} ${item.name}</div><div class="lc-desc">${item.desc || ''}</div>`;
      div.onclick = () => finishLootPick(item);
      grid.appendChild(div);
    });
    modal.classList.remove('hidden');
  }
  function finishLootPick(item) {
    const modal = document.getElementById('loot-modal');
    if (modal) modal.classList.add('hidden');
    if (item) applyLootItem(item);
    const cb = lootDoneCb;
    lootDoneCb = null;
    if (typeof cb === 'function') {
      try { cb(); } catch (e) { console.error(e); advanceRoom(); }
    }
  }
  function injectUtilityAbilities(list, classId, role, specId) {
    list = list || [];
    // Dispel for healers — не Послушанию (жёлтое: Очищение → Щит небес)
    if (role === 'healer' && !(classId === 'priest' && specId === 'discipline')
        && !(classId === 'shaman' && specId === 'restoration')
        && !(classId === 'monk' && specId === 'mistweaver')
        && !list.some(a => a.id === 'party_dispel')) {
      list.push({
        id: 'party_dispel', name: 'Очищение', icon: '✨', cost: 8, gen: 0, costSec: 0, genSec: 0,
        costRunes: null, genRunic: 0, cd: 2, baseCd: 2, curCd: 0, type: 'dispel', power: 1,
        school: 'none',
        desc: 'Снимает 1 магический дебаф / стек Взрывного с союзника',
      });
    }
    // Purge for shaman / priest / mage / hunter — не Послушанию (жёлтое: Развеивание → Исчадие ада)
    if (['shaman', 'priest', 'mage', 'hunter'].includes(classId)
        && !(classId === 'priest' && specId === 'discipline')
        && !(classId === 'shaman' && specId === 'restoration')
        && !(classId === 'monk' && specId === 'mistweaver')
        && !list.some(a => a.id === 'party_purge')) {
      list.push({
        id: 'party_purge', name: 'Развеивание', icon: '💨', cost: 6, gen: 0, costSec: 0, genSec: 0,
        costRunes: null, genRunic: 0, cd: 2, baseCd: 2, curCd: 0, type: 'purge', power: 1,
        school: 'none',
        desc: 'Снимает бафф / ярость с врага',
      });
    }
    // Light stun (не у инженера, паладина и разбойника)
    if (['monk', 'warrior'].includes(classId) && !list.some(a => a.id === 'party_stun')) {
      list.push({
        id: 'party_stun', name: 'Оглушение', icon: '💫', cost: 15, gen: 0, costSec: 0, genSec: 0,
        costRunes: null, genRunic: 0, cd: 3, baseCd: 3, curCd: 0, type: 'cc', power: 1,
        school: 'none',
        desc: 'Стан 1 ход + сбивает каст', ccMode: 'stun',
      });
    }
    // Паладин Свет / Защита — без «Прерывание»
    if (classId === 'paladin' && (specId === 'holy' || specId === 'protection')) {
      list = list.filter(a => a && a.id !== 'kick' && a.type !== 'interrupt' && !INTERRUPT_IDS.has(a.id));
    }
    // Жрец Свет — кик не давать (жёлтое S14)
    if (classId === 'priest' && specId === 'holy') {
      list = list.filter(a => a && a.id !== 'kick' && a.type !== 'interrupt' && !INTERRUPT_IDS.has(a.id));
    }
    // Послушание: не оставлять инжект Очищения / Развеивания
    if (classId === 'priest' && specId === 'discipline') {
      list = list.filter(a => a && a.id !== 'party_dispel' && a.id !== 'party_purge'
        && a.id !== 'kick' && a.type !== 'interrupt' && a.type !== 'dispel' && a.type !== 'purge');
    }
    if (classId === 'monk' && specId === 'mistweaver') {
      list = list.filter(a => a && a.id !== 'kick' && a.id !== 'party_stun' && a.id !== 'party_dispel'
        && a.id !== 'party_purge' && a.type !== 'interrupt' && a.type !== 'cc'
        && a.type !== 'dispel' && a.type !== 'purge' && !INTERRUPT_IDS.has(a.id));
    }
    if (classId === 'shaman' && specId === 'restoration') {
      list = list.filter(a => a && a.id !== 'party_dispel' && a.id !== 'party_purge'
        && a.type !== 'dispel' && a.type !== 'purge');
    }
    // Рыцарь смерти: без Прерывания и Оглушения
    if (classId === 'deathknight') {
      list = list.filter(a => a && a.id !== 'kick' && a.id !== 'party_stun' && a.id !== 'mind_freeze'
        && a.type !== 'interrupt' && a.type !== 'cc');
    }
    // Разбойник: без Пинка и Оглушения
    if (classId === 'rogue') {
      list = list.filter(a => a && a.id !== 'kick' && a.id !== 'party_stun'
        && a.type !== 'interrupt' && a.type !== 'cc' && !INTERRUPT_IDS.has(a.id));
    }
    // Воскрешение основного питомца (охотник / лок / дк / инженер с постоянным петом)
    const mainKey = mainPetKeyFor(classId, specId);
    if (mainKey && !list.some(a => a.id === 'pet_rez')) {
      list.push({
        id: 'pet_rez', name: 'Воскрешение питомца', icon: '♻️', cost: 15, gen: 0, costSec: 0, genSec: 0,
        costRunes: null, genRunic: 0, cd: 0, baseCd: 0, curCd: 0, type: 'buff', power: 0,
        school: 'none', freeAction: false,
        desc: 'Воскрешает основного питомца (15 ресурса). Доступно только если питомец мёртв.',
      });
    }
    return list;
  }

  /** Ключ постоянного «основного» питомца по классу/спеку (null = нет). */
  function mainPetKeyFor(classId, specId) {
    if (classId === 'hunter') {
      return (typeof hunterPetKey === 'function') ? hunterPetKey(specId) : 'hunter_pet';
    }
    if (classId === 'warlock') return (specId === 'demonology') ? 'felguard' : 'imp';
    // Постоянный вурдалак — только Нечестивость
    if (classId === 'deathknight') return (specId === 'unholy') ? 'ghoul' : null;
    if (classId === 'engineer') {
      if (specId === 'mechanist') return 'combat_bot';
      if (specId === 'tinkerer') return 'pocket_bot';
    }
    return null;
  }
  function getMainPet(owner, includeDead) {
    if (!owner || !combat?.pets) return null;
    const key = mainPetKeyFor(owner.classId, owner.specId);
    if (!key) return null;
    const p = combat.pets.find(x => x.ownerUid === owner.uid && x.petKey === key);
    if (!p) return null;
    if (!includeDead && (!p.alive || p.hp <= 0)) return null;
    return p;
  }
  const INTERRUPT_IDS = new Set(['kick', 'pummel', 'counterspell', 'wind_shear', 'mind_freeze', 'spear_hand', 'rebuke']);
  function isKickAbility(a) {
    if (!a) return false;
    return a.type === 'interrupt' || INTERRUPT_IDS.has(a.id) || !!a.interruptPrimary || a.id === 'avengers'
      || (a.id === 'mind_spike' && a.ccMode === 'silence');
  }
  const SAVE_KEY = 'mythicKeySave_v5';
