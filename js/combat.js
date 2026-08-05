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
    return u.buffs?.some(b => b.defMod > 0.1 || ['elusive', 'shield_wall', 'icebound', 'fort_brew', 'survival', 'barkskin', 'divine_prot', 'ardent'].includes(b.id));
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
        p.shield = (p.shield || 0) + sh;
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
      applyStatus(t, { id: 'hmark', name: 'Метка', icon: '🏹', turns: 2, defMod: -0.25, dispellable: true, school: 'magic' });
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
    // Dispel for healers
    if (role === 'healer' && !list.some(a => a.id === 'party_dispel')) {
      list.push({
        id: 'party_dispel', name: 'Очищение', icon: '✨', cost: 8, gen: 0, costSec: 0, genSec: 0,
        costRunes: null, genRunic: 0, cd: 2, baseCd: 2, curCd: 0, type: 'dispel', power: 1,
        school: 'none',
        desc: 'Снимает 1 магический дебаф / стек Взрывного с союзника',
      });
    }
    // Purge for shaman / priest / mage / hunter
    if (['shaman', 'priest', 'mage', 'hunter'].includes(classId) && !list.some(a => a.id === 'party_purge')) {
      list.push({
        id: 'party_purge', name: 'Развеивание', icon: '💨', cost: 6, gen: 0, costSec: 0, genSec: 0,
        costRunes: null, genRunic: 0, cd: 2, baseCd: 2, curCd: 0, type: 'purge', power: 1,
        school: 'none',
        desc: 'Снимает бафф / ярость с врага',
      });
    }
    // Light stun (не у инженера и не у паладина)
    if (['rogue', 'monk', 'warrior', 'deathknight'].includes(classId) && !list.some(a => a.id === 'party_stun')) {
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
    if (classId === 'hunter') return 'hunter_pet';
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
  const SAVE_KEY = 'mythicKeySave_v5';
  const HIST_KEY = 'mythicKeyHistory_v1';
  const DEATH_PENALTY = 5;
  /** Combat numbers in thousands: base 170 HP → 170000 (shown as 170т). */
  const STAT_SCALE = 1000;
  /**
   * flat в данных — НЕ фиксированный урон, а «вес» относительно атаки.
   * flat === FLAT_REF ≈ 100% эффективной атаки; flat 30 ≈ 200% атаки.
   * Исторически flat писали рядом с atk ~12–18 → REF 15.
   */
  const FLAT_REF = 15;

  // ── Secondary stats (crit / mastery / vers) ─────────────────
  // Рейтинги (растут от шмота). % считается из рейтинга.
  // Крит: 100 рейтинга → 18% (линейно). Унив.: 1 рейтинг → 0.5%.
  // Искусность: 120 рейтинга → pctAt120% у спека.
  const SEC_CRIT_RATING = 100;         // дефолт рейтинга крита
  const SEC_CRIT_DEFAULT = 0.18;       // 18% при 100 рейтинга
  const SEC_CRIT_MULT = 1.5;           // множитель крит-урона
  const SEC_VERS_RATING = 0;           // дефолт рейтинга унив.
  const SEC_VERS_PCT_PER_RATING = 0.005; // 0.5% за 1 рейтинг
  const SEC_MASTERY_RATING = 120;      // базовый рейтинг искусности
  // Конверсия шмоток → рейтинг
  const GEAR_CRIT_PER_POINT = 5;       // +5 рейтинга крита за 1 crit на шмотке
  const GEAR_VERS_PER_POINT = 1;       // +1 рейтинг унив. за 1 vers
  const GEAR_MASTERY_PER_POINT = 3;    // +3 рейтинга иск. за 1 mastery

  /**
   * Искусность по специализации.
   * pctAt120 — % эффекта при рейтинге 120 (одинаковый рейтинг → разный % у спеков).
   * kind — как применяется в бою; effect — текст для UI (hover).
   */
  const MASTERY_BY_SPEC = {
    // Engineer (Gnome)
    engineer_mechanist:  { name: 'Сборка механизмов', effect: 'Увеличивает урон питомцев, турелей и механизмов', kind: 'pet', pctAt120: 50 },
    engineer_sapper:     { name: 'Пиротехника', effect: 'Увеличивает урон по области и от взрывов', kind: 'aoe', pctAt120: 44 },
    engineer_tinkerer:   { name: 'Гениальные гаджеты', effect: 'Шанс «Гения инженерии»: усилить основного питомца в конце хода (база 0%, иск. даёт %)', kind: 'pet_tune', pctAt120: 12 },
    // Warrior
    warrior_arms:        { name: 'Удары возможности', effect: 'Усиливает эффекты кровотечения (периодический урон)', kind: 'bleed', pctAt120: 70 },
    warrior_fury:        { name: 'Необузданная ярость', effect: 'Стаки за навыки с расходом ярости: +% урона за стак (сброс без расхода)', kind: 'fury_stacks', pctAt120: 15 },
    warrior_protection:  { name: 'Критический блок', effect: 'Добавляет шанс блока к «Щиту с озона» (блок −35% урона)', kind: 'block_chance', pctAt120: 15 },
    // Paladin
    paladin_holy:        { name: 'Озарённое исцеление', effect: '«Выбор света»: периодическое лечение % от объёма хила на 2 хода', kind: 'light_echo', pctAt120: 15 },
    paladin_protection:  { name: 'Божественный оплот', effect: 'Усиливает только урон «Щит мстителя»', kind: 'avengers', pctAt120: 80 },
    paladin_retribution: { name: 'Длань Света', effect: 'Усиливает урон способностей Воздаяния школы «Свет»', kind: 'holy_dmg', pctAt120: 13 },
    // Hunter
    hunter_beast_mastery:{ name: 'Повелитель зверей', effect: 'Увеличивает урон питомца', kind: 'pet', pctAt120: 48 },
    hunter_marksmanship: { name: 'Дикий залп', effect: 'Увеличивает дальний урон по одной цели', kind: 'st', pctAt120: 42 },
    hunter_survival:     { name: 'Сущность гадюки', effect: 'Увеличивает периодический урон и урон по области', kind: 'dot_aoe', pctAt120: 39 },
    // Rogue
    rogue_assassination: { name: 'Сильные яды', effect: 'Увеличивает периодический урон / отравления', kind: 'dot', pctAt120: 44 },
    rogue_combat:        { name: 'Удар с левой', effect: 'Увеличивает весь исходящий урон', kind: 'dmg', pctAt120: 41 },
    rogue_subtlety:      { name: 'Палач', effect: 'Увеличивает урон завершающих приёмов', kind: 'finisher', pctAt120: 45 },
    // Priest
    priest_discipline:   { name: 'Сила щита', effect: 'Увеличивает силу щитов', kind: 'shield', pctAt120: 42 },
    priest_holy:         { name: 'Отзвук Света', effect: 'Увеличивает лечение и периодическое исцеление', kind: 'heal', pctAt120: 39 },
    priest_shadow:       { name: 'Теневой отклик', effect: 'Увеличивает периодический урон / урон тьмы', kind: 'dot', pctAt120: 42 },
    // Death Knight
    deathknight_blood:   { name: 'Кровавый щит', effect: 'Снижает входящий урон; усиливает щит-эффекты', kind: 'tank', pctAt120: 36 },
    deathknight_frost:   { name: 'Ледяное сердце', effect: 'Увеличивает весь исходящий урон', kind: 'dmg', pctAt120: 41 },
    deathknight_unholy:  { name: 'Клинок ужаса', effect: 'Увеличивает периодический урон / болезни и урон питомца', kind: 'dot_pet', pctAt120: 41 },
    // Shaman
    shaman_elemental:    { name: 'Перегрузка стихий', effect: 'Увеличивает урон заклинаний (частично)', kind: 'multi', pctAt120: 38 },
    shaman_enhancement:  { name: 'Усиленные стихии', effect: 'Увеличивает весь исходящий урон', kind: 'dmg', pctAt120: 41 },
    shaman_restoration:  { name: 'Глубокое исцеление', effect: '«Глубокие воды»: прибавка к хилу растёт по мере потери HP цели (полная при ≤30% HP)', kind: 'lowhp_heal', pctAt120: 20 },
    // Mage
    mage_arcane:         { name: 'Магистр маны', effect: 'Увеличивает весь исходящий урон', kind: 'dmg', pctAt120: 41 },
    mage_fire:           { name: 'Воспламенение', effect: 'Увеличивает огненный периодический урон', kind: 'dot', pctAt120: 42 },
    mage_frost:          { name: 'Ледышки', effect: 'Увеличивает урон по области / ледяной урон', kind: 'aoe', pctAt120: 39 },
    // Warlock
    warlock_affliction:  { name: 'Сильные страдания', effect: 'Увеличивает периодический урон', kind: 'dot', pctAt120: 45 },
    warlock_demonology:  { name: 'Мастер-демонолог', effect: 'Увеличивает урон всех питомцев/демонов (только питомцы)', kind: 'pet', pctAt120: 10 },
    warlock_destruction: { name: 'Буря углей', effect: 'Увеличивает весь исходящий урон', kind: 'dmg', pctAt120: 42 },
    // Monk
    monk_brewmaster:     { name: 'Неуловимый боец', effect: 'Добавляет шанс уклонения от прямого (ST) урона (при 120 → +5%)', kind: 'dodge_chance', pctAt120: 5 },
    monk_mistweaver:     { name: 'Дар змеи', effect: 'Увеличивает исходящее лечение', kind: 'heal', pctAt120: 39 },
    monk_windwalker:     { name: 'Удары комбо', effect: 'Увеличивает весь исходящий урон', kind: 'dmg', pctAt120: 41 },
    // Druid
    druid_balance:       { name: 'Полное затмение', effect: 'Увеличивает урон по области / урон заклинаний', kind: 'aoe', pctAt120: 39 },
    druid_feral:         { name: 'Бритвенные когти', effect: 'Увеличивает урон кровотечений', kind: 'dot', pctAt120: 44 },
    druid_guardian:      { name: 'Природный страж', effect: 'Снижает входящий урон; небольшой бонус к запасу здоровья', kind: 'tank', pctAt120: 35 },
    druid_restoration:   { name: 'Гармония', effect: 'Увеличивает лечение и периодическое исцеление', kind: 'heal', pctAt120: 39 },
  };

  function defaultSec() {
    return {
      critRating: SEC_CRIT_RATING,
      versRating: SEC_VERS_RATING,
      masteryRating: SEC_MASTERY_RATING,
    };
  }
  /** Normalize sec object; migrates older formats. */
  function ensureSec(entry) {
    if (!entry) entry = {};
    if (!entry.sec) entry.sec = defaultSec();
    const s = entry.sec;
    // Very old budget system: integer points 0–18
    if (
      s.critRating == null && s.versRating == null && s.masteryRating == null &&
      s.critPct == null && (s.crit != null || s.mastery != null || s.vers != null)
    ) {
      entry.sec = defaultSec();
      return entry.sec;
    }
    // Migrate critPct-only → rating
    if (s.critRating == null) {
      if (s.critPct != null) {
        s.critRating = Math.round((Number(s.critPct) || SEC_CRIT_DEFAULT) / SEC_CRIT_DEFAULT * SEC_CRIT_RATING);
      } else {
        s.critRating = SEC_CRIT_RATING;
      }
    }
    if (s.versRating == null) {
      if (s.versPct != null) {
        s.versRating = Math.round((Number(s.versPct) || 0) / SEC_VERS_PCT_PER_RATING);
      } else {
        s.versRating = SEC_VERS_RATING;
      }
    }
    s.critRating = Math.max(0, Math.round(Number(s.critRating) || 0));
    s.versRating = Math.max(0, Math.round(Number(s.versRating) || 0));
    s.masteryRating = Math.max(0, Math.round(Number(s.masteryRating != null ? s.masteryRating : SEC_MASTERY_RATING) || 0));
    // Derived % for display / combat helpers
    s.critPct = clamp((s.critRating / SEC_CRIT_RATING) * SEC_CRIT_DEFAULT, 0, 0.75);
    s.versPct = clamp(s.versRating * SEC_VERS_PCT_PER_RATING, 0, 0.6);
    delete s.crit;
    delete s.mastery;
    delete s.vers;
    return s;
  }
  function masteryInfo(classId, specId) {
    const key = classId + '_' + specId;
    const m = MASTERY_BY_SPEC[key];
    if (m) return m;
    return {
      name: 'Искусность',
      effect: 'Увеличивает эффективность специализации',
      kind: 'dmg',
      pctAt120: 36,
    };
  }
  function getUnitSec(u) {
    if (!u) return defaultSec();
    if (u.sec) return u.sec;
    return defaultSec();
  }
  /** Crit chance 0–1 (100 rating → 18%). */
  function critChance(u) {
    const s = getUnitSec(u);
    const rating = Number(s.critRating != null ? s.critRating : SEC_CRIT_RATING) || 0;
    let base = (rating / SEC_CRIT_RATING) * SEC_CRIT_DEFAULT;
    if (u && u.buffs) {
      for (const b of u.buffs) {
        if (b && b.critMod) base += Number(b.critMod) || 0;
      }
    }
    return clamp(base, 0.05, 0.75);
  }
  /** Crit damage multiplier (base 1.5). */
  function critMult(/* u */) {
    return SEC_CRIT_MULT;
  }

  /**
   * Крит исходящего лечения (тот же рейтинг крита, что и для урона).
   * @returns {{ amount: number, crit: boolean }}
   */
  function rollOutgoingHealCrit(actor, ability, amount) {
    let amt = Math.max(0, Number(amount) || 0);
    if (!actor || actor.side !== 'ally' || actor.isPet || amt < 1) {
      return { amount: amt, crit: false };
    }
    const chance = Math.min(
      0.9,
      critChance(actor) + (Number(ability && ability.critBonus) || 0)
    );
    if (Math.random() < chance) {
      return { amount: Math.max(1, Math.round(amt * critMult(actor))), crit: true };
    }
    return { amount: amt, crit: false };
  }
  /**
   * Incoming damage mult from vers.
   * versPct is fraction (0.10 = 10%); DR scale ≈ 0.6 of that value (10% vers → −6% dmg).
   */
  function versInDmgMult(u) {
    if (!u || u.side !== 'ally') return 1;
    const s = getUnitSec(u);
    const rating = Number(s.versRating != null ? s.versRating : 0) || 0;
    const vp = rating * SEC_VERS_PCT_PER_RATING;
    return clamp(1 - vp * 0.6, 0.55, 1);
  }
  /** Outgoing heal mult from vers (10% vers → +8% heal). */
  function versHealMult(u) {
    if (!u || u.side !== 'ally') return 1;
    const s = getUnitSec(u);
    const rating = Number(s.versRating != null ? s.versRating : 0) || 0;
    const vp = rating * SEC_VERS_PCT_PER_RATING;
    return 1 + vp * 0.8;
  }
  /**
   * Mastery effect as fraction (0.36 = 36%).
   * Scales linearly with rating: at 120 rating → pctAt120%.
   */
  function masteryPct(u) {
    if (!u || u.side !== 'ally') return 0;
    const s = getUnitSec(u);
    const info = masteryInfo(u.classId, u.specId);
    const rating = Number(s.masteryRating != null ? s.masteryRating : SEC_MASTERY_RATING) || 0;
    const pctAt120 = Number(info.pctAt120 != null ? info.pctAt120 : 36) || 36;
    return (rating / SEC_MASTERY_RATING) * (pctAt120 / 100);
  }
  /** Display helpers for UI */
  function masteryDisplayPct(classId, specId, rating) {
    const info = masteryInfo(classId, specId);
    const r = rating != null ? rating : SEC_MASTERY_RATING;
    const pctAt120 = Number(info.pctAt120 != null ? info.pctAt120 : 36) || 36;
    return (r / SEC_MASTERY_RATING) * pctAt120;
  }
  /**
   * Apply mastery to outgoing damage.
   * ctx: { type, isAoe, isDot, isFinisher, isPet }
   */
  function masteryDmgMult(u, ctx = {}) {
    if (!u || u.side !== 'ally' || u.isPet) {
      // pets inherit owner mastery if pet-kind
      return 1;
    }
    const pct = masteryPct(u);
    if (pct <= 0) return 1;
    const info = masteryInfo(u.classId, u.specId);
    const k = info.kind;
    // Arms: only bleed / physical DoTs (кровотечения)
    if (k === 'bleed') {
      const isBleed = !!(ctx.isDot || ctx.type === 'dot'
        || (ctx.abilityId && /rend|bleed|кров|рван/.test(String(ctx.abilityId)))
        || (ctx.school === 'physical' && (ctx.isDot || ctx.type === 'dot')));
      return isBleed ? (1 + pct) : 1;
    }
    // Fury: % per stack of «Необузданная ярость»
    if (k === 'fury_stacks') {
      const st = (u.buffs || []).find(b => b && b.id === 'fury_mastery');
      const stacks = st ? (Number(st.stacks) || 0) : 0;
      return stacks > 0 ? (1 + pct * stacks) : 1;
    }
    // Prot pally: only Avenger's Shield
    if (k === 'avengers') {
      return (ctx.abilityId === 'avengers') ? (1 + pct) : 1;
    }
    // Ret: only holy-school damage
    if (k === 'holy_dmg') {
      const school = ctx.school || null;
      return (school === 'holy') ? (1 + pct) : 1;
    }
    // Block / light echo / dodge / pet_tune: no generic damage amp
    if (k === 'block_chance' || k === 'light_echo' || k === 'dodge_chance' || k === 'pet_tune') return 1;
    if (k === 'dmg' || k === 'st') return 1 + pct;
    if (k === 'aoe' && (ctx.isAoe || ctx.type === 'aoe' || ctx.type === 'cast_aoe')) return 1 + pct;
    if (k === 'aoe' && !ctx.isAoe) return 1 + pct * 0.45; // partial on ST
    if (k === 'dot' && (ctx.isDot || ctx.type === 'dot')) return 1 + pct;
    if (k === 'dot' && !ctx.isDot) return 1 + pct * 0.35;
    if (k === 'dot_aoe') return 1 + pct * ((ctx.isDot || ctx.isAoe) ? 1 : 0.4);
    if (k === 'finisher' && (ctx.isFinisher || (ctx.abilityId && FINISHER_IDS.has(ctx.abilityId)))) return 1 + pct;
    if (k === 'finisher') return 1 + pct * 0.25;
    // pet: только питомцы (masteryPetMult); свой урон без бонуса
    if (k === 'pet') return 1;
    if (k === 'dot_pet') return 1 + pct * 0.35; // self partial; pets full via masteryPetMult
    if (k === 'multi') return 1 + pct * 0.7;
    if (k === 'tank' || k === 'heal' || k === 'heal_shield' || k === 'shield' || k === 'lowhp_heal') return 1 + pct * 0.15;
    return 1 + pct * 0.5;
  }
  function masteryPetMult(owner) {
    if (!owner) return 1;
    const pct = masteryPct(owner);
    const info = masteryInfo(owner.classId, owner.specId);
    // Full mastery for pet-primary specs; pet_tune does NOT amp normal pet hits
    if (info.kind === 'pet' || info.kind === 'dot_pet') return 1 + pct;
    if (info.kind === 'pet_tune') return 1;
    if (info.kind === 'dmg' || info.kind === 'st' || info.kind === 'aoe' || info.kind === 'dot') return 1 + pct * 0.45;
    return 1 + pct * 0.3;
  }
  function masteryHealMult(u, target) {
    if (!u || u.side !== 'ally') return 1;
    const pct = masteryPct(u);
    if (pct <= 0) return 1;
    const info = masteryInfo(u.classId, u.specId);
    const k = info.kind;
    // Holy: no direct heal amp — echo HoT is applied separately
    if (k === 'light_echo' || k === 'block_chance' || k === 'avengers' || k === 'holy_dmg' || k === 'bleed' || k === 'fury_stacks' || k === 'dodge_chance' || k === 'pet_tune') return 1;
    if (k === 'heal' || k === 'heal_shield') return 1 + pct;
    if (k === 'lowhp_heal') {
      // «Глубокие воды»: 0 при full HP → полная иск. при ≤30% HP (линейно)
      const ratio = target ? target.hp / Math.max(1, target.maxHp) : 1;
      let factor = 0;
      if (ratio <= 0.3) factor = 1;
      else if (ratio < 1) factor = (1 - ratio) / 0.7;
      return 1 + pct * factor;
    }
    if (k === 'shield') return 1 + pct * 0.4;
    return 1 + pct * 0.1;
  }
  function masteryShieldMult(u) {
    if (!u || u.side !== 'ally') return 1;
    const pct = masteryPct(u);
    const info = masteryInfo(u.classId, u.specId);
    if (info.kind === 'shield' || info.kind === 'heal_shield') return 1 + pct;
    if (info.kind === 'tank') return 1 + pct * 0.5;
    return 1;
  }
  function masteryTankInMult(u) {
    if (!u || u.side !== 'ally' || u.role !== 'tank') return 1;
    const info = masteryInfo(u.classId, u.specId);
    // Prot warrior / block / avengers / brew dodge: no flat incoming DR from mastery
    if (info.kind === 'block_chance' || info.kind === 'avengers' || info.kind === 'light_echo' || info.kind === 'dodge_chance') return 1;
    const pct = masteryPct(u);
    if (info.kind === 'tank') return clamp(1 - pct * 0.85, 0.55, 1);
    return 1;
  }

  /** Базовый шанс уклона хмелевара: иск. + «Пьяный задира» 6%. */
  function brewBaseDodgeChance(u) {
    if (!u || u.classId !== 'monk' || u.specId !== 'brewmaster') return 0;
    return masteryPct(u) + 0.06;
  }
  function brewLuckyStacks(u) {
    const b = (u.buffs || []).find(x => x && x.id === 'lucky_again');
    return b ? (Number(b.stacks) || 0) : 0;
  }
  /** Итоговый шанс: база × (1 + стаки «Ещё повезёт»). */
  function brewTotalDodgeChance(u) {
    const base = brewBaseDodgeChance(u);
    if (base <= 0) return 0;
    return Math.min(0.95, base * (1 + brewLuckyStacks(u)));
  }
  function clearBrewLucky(u) {
    if (!u || !u.buffs) return;
    u.buffs = u.buffs.filter(b => !b || b.id !== 'lucky_again');
  }
  function addBrewLuckyStack(u) {
    if (!u) return;
    u.buffs = u.buffs || [];
    const base = brewBaseDodgeChance(u);
    const prev = u.buffs.find(b => b && b.id === 'lucky_again');
    const stacks = (prev ? (Number(prev.stacks) || 0) : 0) + 1;
    u.buffs = u.buffs.filter(b => !b || b.id !== 'lucky_again');
    applyStatus(u, {
      id: 'lucky_again',
      name: 'Ещё повезёт ×' + stacks,
      icon: '🍀',
      turns: 99,
      stacks,
      tip: '+' + Math.round(base * stacks * 100) + '% уклон',
    });
    floatText(u.uid, 'повезёт ×' + stacks, 'buff');
  }

  /**
   * Пассивные способности спека (карман «Пассивные способности»).
   * short — ярлык; detail — игровое описание (без «при 120» / формул иск.;
   * фиксированные числа, не зависящие от рейтинга, оставляем).
   */
  function getSpecPassives(classId, specId, role) {
    const list = [];
    const r = role || (classId && specId && (WOW_MOP.getSpec(classId, specId) || {}).role) || null;
    // Все ДК: как работают руны
    if (classId === 'deathknight') {
      list.push({
        id: 'rune_cycle',
        name: 'Рунный цикл',
        icon: '🔷',
        short: 'руны 2х',
        detail: 'У вас 6 рун: 2 крови, 2 льда, 2 нечестивости. Потраченные руны сами восстанавливаются через 2 хода. Наведение на скилл подсвечивает, какие руны он тратит. Сила рун (💙) растёт от рунных ударов и пассивно (+5 за ход) — её тратят «Лик смерти» и подобные навыки. На портрете под HP — полоска силы рун; кружки — сами руны.',
      });
    }
    // Танки: «Щит с озона» (+15% блок)
    // Исключения: хмелевар (уклон), паладин Защита, ДК Кровь — свои пассивки
    if (
      r === 'tank'
      && !(classId === 'monk' && specId === 'brewmaster')
      && !(classId === 'paladin' && specId === 'protection')
      && !(classId === 'deathknight' && specId === 'blood')
    ) {
      list.push({
        id: 'ozone_shield',
        name: 'Щит с озона',
        icon: '🛡️',
        short: '+15% блок',
        detail: 'Повышает шанс блокировать удар на 15%. Заблокированный удар наносит меньше урона.',
        blockChanceAdd: 0.15,
      });
    }
    // Хмелевар
    if (classId === 'monk' && specId === 'brewmaster') {
      list.push({
        id: 'brew_mastery_dodge',
        name: 'Неуловимый боец',
        icon: '💨',
        short: 'уклон',
        detail: 'Искусность повышает шанс уклониться от прямого удара (не по области).',
      });
      list.push({
        id: 'drunk_brawler',
        name: 'Пьяный задира',
        icon: '🍺',
        short: '+6% уклон',
        detail: 'Всегда даёт +6% шанса уклониться от прямого удара.',
        dodgeChanceAdd: 0.06,
      });
      list.push({
        id: 'lucky_again_passive',
        name: 'Ещё повезёт',
        icon: '🍀',
        short: 'стаки',
        detail: 'Каждый пропущенный прямой удар делает следующий уклон вероятнее. После успешного уклонения эффект сбрасывается. Стаки видны на портрете.',
      });
    }
    // Шаман исцеление
    if (classId === 'shaman' && specId === 'restoration') {
      list.push({
        id: 'deep_waters',
        name: 'Глубокие воды',
        icon: '🌊',
        short: 'хил раненых',
        detail: 'Чем сильнее ранен союзник, тем больше отдачи от исцеления. Полная сила — когда у цели не больше 30% здоровья. Искусность усиливает эффект.',
      });
    }
    // Демонология
    if (classId === 'warlock' && specId === 'demonology') {
      list.push({
        id: 'master_demonologist',
        name: 'Мастер-демонолог',
        icon: '😈',
        short: 'урон петов',
        detail: 'Искусность усиливает урон всех питомцев и демонов. Собственные заклинания не затрагиваются.',
      });
    }
    // Изобретатель
    if (classId === 'engineer' && specId === 'tinkerer') {
      list.push({
        id: 'walking_scrap',
        name: 'Ходячая жестянка',
        icon: '🗑️',
        short: '+1 деталь / 2х',
        detail: 'Основной питомец каждые 2 хода находит на помойке 1 деталь (если жив и есть место в запасе деталей).',
      });
      list.push({
        id: 'engineering_genius',
        name: 'Гений инженерии',
        icon: '⚙️',
        short: 'прокачка пета',
        detail: 'В конце хода есть шанс «прокачать» основного питомца — он наносит удар с +200% урона (в текущем режиме: одна цель или область). Искусность повышает только шанс срабатывания.',
      });
    }
    // Prot warrior mastery
    if (classId === 'warrior' && specId === 'protection') {
      list.push({
        id: 'crit_block_mastery',
        name: 'Критический блок',
        icon: '🧱',
        short: 'шанс блока',
        detail: 'Искусность повышает шанс блокировать удар. Заблокированный удар ослабляется на 35%.',
      });
    }
    // Death Knight Blood
    if (classId === 'deathknight' && specId === 'blood') {
      list.push({
        id: 'blood_blade',
        name: 'Кровяной клинок',
        icon: '🩸',
        short: '+15% парирование',
        detail: 'Повышает шанс парировать прямой удар на 15%. При парировании урон не проходит.',
        parryChanceAdd: 0.15,
      });
      list.push({
        id: 'blood_shield_mastery',
        name: 'Кровавый щит',
        icon: '🩸',
        short: 'танк / щиты',
        detail: 'Искусность снижает входящий урон и усиливает щиты (Костяной щит и подобные).',
      });
    }
    // Death Knight Unholy
    if (classId === 'deathknight' && specId === 'unholy') {
      list.push({
        id: 'dreadblade_mastery',
        name: 'Клинок ужаса',
        icon: '🧟',
        short: 'болезни + пет',
        detail: 'Искусность усиливает периодический урон (болезни) и урон вурдалака и горгульи.',
      });
      list.push({
        id: 'raise_dead_passive',
        name: 'Воскрешение мертвеца',
        icon: '💀',
        short: 'вурдалак',
        detail: 'В начале боя рядом с вами постоянный вурдалак. «Тёмное превращение» усиливает его.',
      });
    }
    // Все паладины: «Добродетель» (возврат ES)
    if (classId === 'paladin') {
      list.push({
        id: 'virtue',
        name: 'Добродетель',
        icon: '🕊️',
        short: 'возврат ES',
        detail: 'При трате Энергии Света каждая потраченная единица может вернуться с шансом 25% (отдельный ролл на каждую). Не выше максимума ES.',
      });
    }
    if (classId === 'paladin' && specId === 'holy') {
      list.push({
        id: 'illuminated_heal',
        name: 'Озарённое исцеление',
        icon: '✨',
        short: 'Выбор света',
        detail: 'Исцеление раненого союзника оставляет на нём «Выбор света» на 2 хода — слабое периодическое лечение. Сила зависит от искусности и объёма хила.',
      });
    }
    if (classId === 'paladin' && specId === 'protection') {
      // Аналог танкового «Щита с озона», но в светлой тематике (+15% блок)
      list.push({
        id: 'holy_shield',
        name: 'Святой щит',
        icon: '✝️',
        short: '+15% блок',
        detail: 'Повышает шанс блокировать удар на 15%. Заблокированный удар наносит меньше урона.',
        blockChanceAdd: 0.15,
      });
      list.push({
        id: 'light_defender',
        name: 'Защитник света',
        icon: '🛡️',
        short: '+10% броня',
        detail: 'Постоянно повышает броню на 10%.',
        armorModAdd: 0.10,
      });
      list.push({
        id: 'divine_bulwark',
        name: 'Божественный оплот',
        icon: '🔰',
        short: 'Щит мстителя',
        detail: 'Искусность усиливает только «Щит мстителя». Остальные способности не затрагиваются.',
      });
    }
    if (classId === 'paladin' && specId === 'retribution') {
      list.push({
        id: 'hand_of_light',
        name: 'Длань Света',
        icon: '☀️',
        short: 'урон Света',
        detail: 'Искусность усиливает урон способностей школы «Свет».',
      });
    }
    if (classId === 'warrior' && specId === 'arms') {
      list.push({
        id: 'bleed_passive',
        name: 'Кровотечение',
        icon: '🩸',
        short: '4 хода',
        detail: '«Удар колосса», «Смертельный удар» и «Героический удар» накладывают «Кровотечение» на цель на 4 хода (периодический урон каждый раунд).',
      });
      list.push({
        id: 'strikes_of_opportunity',
        name: 'Удары возможности',
        icon: '🩸',
        short: 'кровотечения',
        detail: 'Искусность усиливает эффекты кровотечения (в том числе пассивное «Кровотечение»).',
      });
    }
    if (classId === 'warrior' && specId === 'fury') {
      list.push({
        id: 'unshackled_fury',
        name: 'Необузданная ярость',
        icon: '😤',
        short: 'стаки',
        detail: 'Способности с расходом ярости накапливают ярость боя — каждый стак усиливает урон. Способность без расхода ярости сбрасывает стаки. Видно на портрете.',
      });
    }
    return list;
  }
  function getUnitPassives(u) {
    if (!u || u.side !== 'ally' || u.isPet) return [];
    return getSpecPassives(u.classId, u.specId, u.role);
  }
  function passiveBlockChance(u) {
    return getUnitPassives(u).reduce((s, p) => s + (Number(p.blockChanceAdd) || 0), 0);
  }
  function passiveParryChance(u) {
    return getUnitPassives(u).reduce((s, p) => s + (Number(p.parryChanceAdd) || 0), 0);
  }
  function passiveArmorMod(u) {
    if (!u) return 0;
    return getUnitPassives(u).reduce((s, p) => s + (Number(p.armorModAdd) || 0), 0);
  }
  function getUiTipFloat(id, className) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = className + ' hidden';
      el.setAttribute('role', 'tooltip');
      document.body.appendChild(el);
    }
    return el;
  }

  /**
   * Позиция fixed-тултипа.
   * containerEl — опционально: держать подсказку строго внутри этой панели
   * (карман «Пассивные способности»).
   */
  function positionUiTipFloat(tip, anchor, containerEl) {
    const rect = anchor.getBoundingClientRect();
    const pad = 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bounds = containerEl
      ? containerEl.getBoundingClientRect()
      : { left: pad, top: pad, right: vw - pad, bottom: vh - pad, width: vw - pad * 2, height: vh - pad * 2 };

    // Ширина: не шире контейнера / экрана
    const maxW = Math.max(140, Math.min(bounds.width - pad * 2, containerEl ? bounds.width - pad * 2 : Math.min(300, vw * 0.8)));
    tip.style.boxSizing = 'border-box';
    tip.style.maxWidth = Math.round(maxW) + 'px';
    tip.style.width = 'auto';
    tip.style.left = '0px';
    tip.style.top = '0px';
    tip.style.whiteSpace = 'normal';
    tip.style.overflowWrap = 'anywhere';
    tip.style.wordBreak = 'break-word';

    // Переизмерить после maxWidth
    let tw = tip.offsetWidth || Math.min(240, maxW);
    let th = tip.offsetHeight || 70;
    if (tw > maxW) {
      tip.style.width = Math.round(maxW) + 'px';
      tw = tip.offsetWidth || maxW;
      th = tip.offsetHeight || th;
    }

    let left;
    let top;
    if (containerEl) {
      // Внутри кармана: на всю ширину панели, под/над чипом
      left = bounds.left + pad;
      // предпочитаем под чипом
      top = rect.bottom + 4;
      if (top + th > bounds.bottom - pad) {
        top = rect.top - th - 4;
      }
      if (top < bounds.top + pad) top = bounds.top + pad;
      // если всё ещё не влезает по высоте — прижать к верху контейнера
      if (top + th > bounds.bottom - pad) {
        top = Math.max(bounds.top + pad, bounds.bottom - pad - th);
      }
      // горизонталь строго в рамке
      if (left + tw > bounds.right - pad) left = bounds.right - pad - tw;
      if (left < bounds.left + pad) left = bounds.left + pad;
    } else {
      left = rect.right + pad;
      if (left + tw > vw - pad) left = Math.max(pad, rect.left - tw - pad);
      top = rect.top;
      if (top + th > vh - pad) top = Math.max(pad, vh - th - pad);
      if (top < pad) top = pad;
    }

    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
  }

  function getPassiveTipFloat() {
    return getUiTipFloat('passive-tip-float', 'passive-tip-float');
  }

  function hidePassiveTipFloat() {
    const el = document.getElementById('passive-tip-float');
    if (el) el.classList.add('hidden');
    const panel = document.getElementById('passive-pocket-tip');
    if (panel) {
      panel.classList.add('hidden');
      panel.replaceChildren();
    }
    document.querySelectorAll('.passive-chip.active-tip').forEach(c => c.classList.remove('active-tip'));
  }

  /** Описание пассивки в кармане — только нижняя панель, без fixed-окон. */
  function showPassivePocketTip(name, detail) {
    const panel = document.getElementById('passive-pocket-tip');
    if (!panel) return;
    // не трогаем hidePassiveTipFloat (она гасит panel)
    const float = document.getElementById('passive-tip-float');
    if (float) float.classList.add('hidden');
    panel.replaceChildren();
    const n = document.createElement('div');
    n.className = 'pt-name';
    n.textContent = name || 'Пассивка';
    const d = document.createElement('div');
    d.className = 'pt-detail';
    d.textContent = detail || 'Нет описания.';
    panel.appendChild(n);
    panel.appendChild(d);
    panel.classList.remove('hidden');
  }

  function showPassiveTipFloat(chip, name, detail) {
    const pocket = document.getElementById('passive-pocket');
    const inPocket = !!(pocket && !pocket.classList.contains('hidden') && chip && pocket.contains(chip));
    if (inPocket) {
      showPassivePocketTip(name, detail);
      return;
    }
    // Лобби: fixed float
    const tip = getPassiveTipFloat();
    tip.replaceChildren();
    const n = document.createElement('div');
    n.className = 'pt-name';
    n.textContent = name || 'Пассивка';
    const d = document.createElement('div');
    d.className = 'pt-detail';
    d.textContent = detail || '';
    tip.appendChild(n);
    tip.appendChild(d);
    tip.classList.remove('hidden');
    positionUiTipFloat(tip, chip, null);
  }

  function hideAbilityTipFloat() {
    const el = document.getElementById('ability-tip-float');
    if (el) el.classList.add('hidden');
  }

  function showAbilityTipFloat(anchor, name, detail) {
    if (!detail) {
      hideAbilityTipFloat();
      return;
    }
    const tip = getUiTipFloat('ability-tip-float', 'ability-tip-float');
    tip.replaceChildren();
    const n = document.createElement('div');
    n.className = 'pt-name';
    n.textContent = name || 'Способность';
    const d = document.createElement('div');
    d.className = 'pt-detail';
    d.textContent = detail;
    tip.appendChild(n);
    tip.appendChild(d);
    tip.classList.remove('hidden');
    positionUiTipFloat(tip, anchor);
  }

  function bindPassiveChipTips(root) {
    if (!root) return;
    const pocket = document.getElementById('passive-pocket');
    const inPocket = !!(pocket && pocket.contains(root));
    root.querySelectorAll('.passive-chip').forEach(chip => {
      if (chip.dataset.tipBound) return;
      chip.dataset.tipBound = '1';
      const name = chip.dataset.passiveName || chip.querySelector('.p-name')?.textContent || '';
      const detail = chip.dataset.passiveDetail || chip.querySelector('.pt-detail')?.textContent || '';
      const show = () => {
        root.querySelectorAll('.passive-chip.active-tip').forEach(c => c.classList.remove('active-tip'));
        chip.classList.add('active-tip');
        showPassiveTipFloat(chip, name, detail);
      };
      if (inPocket) {
        // В кармане ключа: описание только по нажатию (клик/Enter), не по наведению
        chip.setAttribute('role', 'button');
        chip.setAttribute('aria-pressed', 'false');
        chip.title = 'Нажмите, чтобы открыть описание';
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          const already = chip.classList.contains('active-tip');
          root.querySelectorAll('.passive-chip.active-tip').forEach(c => {
            c.classList.remove('active-tip');
            c.setAttribute('aria-pressed', 'false');
          });
          if (already) {
            const panel = document.getElementById('passive-pocket-tip');
            if (panel) {
              panel.classList.add('hidden');
              panel.replaceChildren();
            }
            return;
          }
          chip.classList.add('active-tip');
          chip.setAttribute('aria-pressed', 'true');
          showPassiveTipFloat(chip, name, detail);
        });
        chip.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            chip.click();
          }
        });
      } else {
        const hide = () => {
          chip.classList.remove('active-tip');
          requestAnimationFrame(() => {
            if (!root.querySelector('.passive-chip:hover, .passive-chip:focus')) hidePassiveTipFloat();
          });
        };
        chip.addEventListener('mouseenter', show);
        chip.addEventListener('mouseleave', hide);
        chip.addEventListener('focus', show);
        chip.addEventListener('blur', hide);
      }
    });
  }

  function renderPassiveTray(actor, trayEl) {
    const tray = trayEl || document.getElementById('passive-tray');
    const pocket = document.getElementById('passive-pocket');
    if (!tray) return;
    const listEl = (!trayEl && document.getElementById('passive-list')) || tray;
    const tipPanel = document.getElementById('passive-pocket-tip');
    // не вызываем hidePassiveTipFloat целиком — сбросит выбор при каждом ходе
    const float = document.getElementById('passive-tip-float');
    if (float) float.classList.add('hidden');

    const passives = actor ? getUnitPassives(actor) : [];
    if (!passives.length) {
      if (listEl) listEl.innerHTML = '';
      if (tipPanel) {
        tipPanel.classList.add('hidden');
        tipPanel.replaceChildren();
      }
      if (pocket && !trayEl) {
        pocket.classList.add('hidden', 'collapsed');
        delete pocket.dataset.userOpened;
      }
      return;
    }
    const chipsHtml = passives.map(p => {
      const name = p.name || 'Пассивка';
      const detail = p.detail || p.short || '';
      const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      return `
      <div class="passive-chip" tabindex="0" data-passive-name="${esc(name)}" data-passive-detail="${esc(detail)}">
        <span class="p-tag">Пассив</span>
        <span class="p-ico">${p.icon || '✨'}</span>
        <span class="p-name">${name}</span>
        <div class="passive-tip" role="tooltip">
          <div class="pt-name">${name}</div>
          <div class="pt-detail">${detail}</div>
        </div>
      </div>`;
    }).join('');
    if (listEl) listEl.innerHTML = chipsHtml;
    // tip-панель не чистим, если уже открыта — только при смене набора
    if (tipPanel && tipPanel.dataset.forActor !== (actor && actor.uid)) {
      tipPanel.classList.add('hidden');
      tipPanel.replaceChildren();
      tipPanel.dataset.forActor = actor && actor.uid ? actor.uid : '';
    }
    if (pocket && !trayEl) {
      pocket.classList.remove('hidden');
      if (pocket.dataset.userOpened !== '1') {
        pocket.classList.add('collapsed');
      }
      bindPassiveChipTips(listEl || tray);
    }
  }

  function hidePassivePocket() {
    const pocket = document.getElementById('passive-pocket');
    const list = document.getElementById('passive-list');
    hidePassiveTipFloat();
    if (list) list.innerHTML = '';
    if (pocket) {
      pocket.classList.add('hidden', 'collapsed');
      delete pocket.dataset.userOpened;
    }
  }

  function bindPassivePocketUI() {
    const pocket = document.getElementById('passive-pocket');
    if (!pocket || pocket.dataset.bound) return;
    pocket.dataset.bound = '1';
    document.getElementById('passive-pocket-toggle')?.addEventListener('click', () => {
      if (pocket.classList.contains('hidden')) return;
      pocket.classList.toggle('collapsed');
      pocket.dataset.userOpened = pocket.classList.contains('collapsed') ? '0' : '1';
      hidePassiveTipFloat();
    });
    // скролл/ресайз — спрятать тултип (позиция устарела)
    window.addEventListener('scroll', () => {
      hidePassiveTipFloat();
      hideAbilityTipFloat();
    }, true);
    window.addEventListener('resize', () => {
      hidePassiveTipFloat();
      hideAbilityTipFloat();
    });
  }

  /** Fury: stack mastery on rage spenders; clear on non-spenders. */
  function applyFuryMasteryStacks(actor, ability) {
    if (!actor || actor.classId !== 'warrior' || actor.specId !== 'fury') return;
    if (actor.res?.primary?.type !== 'rage') return;
    actor.buffs = actor.buffs || [];
    const spendsRage = (Number(ability.cost) || 0) > 0;
    if (spendsRage) {
      const prev = actor.buffs.find(b => b && b.id === 'fury_mastery');
      const stacks = (prev ? (Number(prev.stacks) || 0) : 0) + 1;
      actor.buffs = actor.buffs.filter(b => !b || b.id !== 'fury_mastery');
      const pct = masteryPct(actor);
      applyStatus(actor, {
        id: 'fury_mastery',
        name: 'Необузданная ярость ×' + stacks,
        icon: '😤',
        turns: 99,
        stacks,
        // display only — damage via masteryDmgMult
        tip: '+' + Math.round(pct * stacks * 100) + '% урона',
      });
      floatText(actor.uid, 'ярость ×' + stacks, 'buff');
    } else {
      const had = actor.buffs.some(b => b && b.id === 'fury_mastery');
      if (had) {
        actor.buffs = actor.buffs.filter(b => !b || b.id !== 'fury_mastery');
        floatText(actor.uid, 'стаки сброс', 'buff');
        log(actor.name + ': Необузданная ярость сброшена', 'system');
      }
    }
  }

  // ── Party builder state ──
  let party = []; // { classId, specId }
  let editSlot = null;
  let pickClass = null;
  let pickSpec = null;

  // ── Run ──
  let run = null, combat = null, pendingTarget = null, toastTimer = null, timerInterval = null;
  let gameSpeed = 1; // 1, 2, 4
  let paused = false;
  let soundOn = true;
  let aiTimer = null;

  // ── Recount (meter for current key) ──
  // damage/taken/healing — totals by hero uid
  // damageBySkill / takenBySource / healingBySkill — per-skill nested maps
  let recount = null;
  let recountUiRaf = 0;

  const uid = () => Math.random().toString(36).slice(2, 9);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /** Recount: reset totals for a new key run */
  function resetRecount() {
    recount = {
      damage: Object.create(null),
      taken: Object.create(null),
      healing: Object.create(null),
      damageBySkill: Object.create(null),
      takenBySource: Object.create(null),
      healingBySkill: Object.create(null),
      collapsed: true,
      tab: 'damage',
      detailUid: null,
    };
    scheduleRecountUI();
  }

  function showRecountPanel(show) {
    const panel = document.getElementById('recount-panel');
    if (!panel) return;
    panel.classList.toggle('hidden', !show);
    if (show) scheduleRecountUI();
  }

  /** Credit pet activity to its owner (party hero). */
  function meterPartyKey(unit) {
    if (!unit) return null;
    if (unit.isPet && unit.ownerUid) return unit.ownerUid;
    if (unit.side === 'ally' && !unit.isPet) return unit.uid;
    return null;
  }

  function meterIsPartyHeroUid(id) {
    return !!(id && run?.party?.some(p => p.uid === id));
  }

  function meterAdd(bucket, key, amount) {
    if (!recount || !key || !(amount > 0)) return;
    bucket[key] = (bucket[key] || 0) + amount;
  }

  /** Nested add: bucket[ownerKey][label] += amount */
  function meterAddSkill(nested, ownerKey, label, amount) {
    if (!recount || !nested || !ownerKey || !(amount > 0)) return;
    const skill = String(label || 'Прочее').trim() || 'Прочее';
    if (!nested[ownerKey]) nested[ownerKey] = Object.create(null);
    nested[ownerKey][skill] = (nested[ownerKey][skill] || 0) + amount;
  }

  /** Resolve ability/source display name for meters. */
  function meterResolveAbilityName(unit, ctx) {
    if (!ctx) return null;
    if (ctx.abilityName) return String(ctx.abilityName);
    if (ctx.sourceName) return String(ctx.sourceName);
    if (ctx.abilityId && unit) {
      const ab = (unit.abilities || []).find(a => a && a.id === ctx.abilityId);
      if (ab && ab.name) return ab.name;
    }
    if (ctx.isDot) return 'Периодический урон';
    if (ctx.isHot) return 'Периодическое лечение';
    if (ctx.isPet) return 'Питомец';
    if (ctx.lifesteal) return 'Вампиризм';
    return null;
  }

  function meterDealtLabel(attacker, ctx) {
    const fromCtx = meterResolveAbilityName(attacker, ctx);
    if (fromCtx) {
      if (attacker && attacker.isPet) {
        return (attacker.name ? attacker.name + ': ' : 'Питомец: ') + fromCtx;
      }
      return fromCtx;
    }
    if (attacker && attacker.isPet) return attacker.name || 'Питомец';
    if (attacker && attacker.casting && attacker.casting.name) return attacker.casting.name;
    return 'Автоатака';
  }

  function meterTakenLabel(attacker, ctx) {
    const skill = meterResolveAbilityName(attacker, ctx);
    if (attacker) {
      const who = attacker.name || (attacker.side === 'enemy' ? 'Враг' : 'Источник');
      if (skill) return who + ': ' + skill;
      if (attacker.casting && attacker.casting.name) return who + ': ' + attacker.casting.name;
      return who;
    }
    if (skill) return skill;
    if (ctx && ctx.isDot) return 'Периодический урон';
    return 'Окружение';
  }

  function meterHealLabel(healer, ctx) {
    const fromCtx = meterResolveAbilityName(healer, ctx);
    if (fromCtx) {
      if (healer && healer.isPet) {
        return (healer.name ? healer.name + ': ' : 'Питомец: ') + fromCtx;
      }
      return fromCtx;
    }
    if (healer && healer.isPet) return healer.name || 'Питомец';
    return 'Исцеление';
  }

  /** Party damage done + party damage taken (heroes only for taken). */
  function meterOnDamage(attacker, target, amount, ctx) {
    if (!recount || !(amount > 0) || !run) return;
    const c = ctx || null;
    // Done: only squad (heroes + pets) hitting enemies
    if (attacker && target && target.side === 'enemy' && attacker.side === 'ally') {
      const key = meterPartyKey(attacker);
      if (meterIsPartyHeroUid(key)) {
        meterAdd(recount.damage, key, amount);
        meterAddSkill(recount.damageBySkill, key, meterDealtLabel(attacker, c), amount);
      }
    }
    // Taken: only damage on party heroes (not pets, not enemies)
    if (target && target.side === 'ally' && !target.isPet && meterIsPartyHeroUid(target.uid)) {
      meterAdd(recount.taken, target.uid, amount);
      meterAddSkill(recount.takenBySource, target.uid, meterTakenLabel(attacker, c), amount);
    }
    scheduleRecountUI();
  }

  /** Healing done by squad heroes (incl. self / HoT). Pet heal → owner. */
  function meterOnHeal(healer, _target, amount, ctx) {
    if (!recount || !(amount > 0) || !run || !healer) return;
    if (healer.side !== 'ally') return;
    const key = meterPartyKey(healer);
    if (meterIsPartyHeroUid(key)) {
      meterAdd(recount.healing, key, amount);
      meterAddSkill(recount.healingBySkill, key, meterHealLabel(healer, ctx || null), amount);
    }
    scheduleRecountUI();
  }

  function scheduleRecountUI() {
    if (recountUiRaf) return;
    recountUiRaf = requestAnimationFrame(() => {
      recountUiRaf = 0;
      updateRecountUI();
    });
  }

  function recountDetailMapForTab(tab) {
    if (!recount) return null;
    if (tab === 'taken') return recount.takenBySource;
    if (tab === 'healing') return recount.healingBySkill;
    return recount.damageBySkill;
  }

  function recountDetailTitle(tab) {
    if (tab === 'taken') return 'Получено от';
    if (tab === 'healing') return 'Исцеление скиллами';
    return 'Урон скиллами';
  }

  function renderRecountDetail(heroUid, heroName) {
    const box = document.getElementById('recount-detail');
    const titleEl = document.getElementById('recount-detail-title');
    const listEl = document.getElementById('recount-detail-list');
    if (!box || !listEl) return;
    if (!recount || !heroUid) {
      box.classList.add('hidden');
      return;
    }
    const tab = recount.tab || 'damage';
    const nested = recountDetailMapForTab(tab);
    const skills = (nested && nested[heroUid]) ? nested[heroUid] : null;
    const entries = skills
      ? Object.keys(skills).map(k => ({ name: k, value: skills[k] || 0 }))
        .filter(e => e.value > 0)
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'ru'))
      : [];
    const top = entries.reduce((m, e) => Math.max(m, e.value), 0);
    const who = heroName || 'Герой';
    if (titleEl) titleEl.textContent = who + ' · ' + recountDetailTitle(tab);
    if (!entries.length) {
      listEl.innerHTML = '<div class="recount-detail-empty">Пока нет данных по скиллам</div>';
    } else {
      listEl.innerHTML = entries.map(e => {
        const pct = top > 0 ? Math.round((e.value / top) * 100) : 0;
        return `<div class="recount-detail-row" title="${e.name}: ${fmt(e.value)}">
          <span class="rd-name">${e.name}</span>
          <span class="rd-val">${fmt(e.value)}</span>
          <div class="rd-pct"><i style="width:${pct}%"></i></div>
        </div>`;
      }).join('');
    }
    box.classList.remove('hidden');
  }

  function updateRecountUI() {
    const panel = document.getElementById('recount-panel');
    if (!panel) return;
    if (!run || run.finished || !recount) {
      panel.classList.add('hidden');
      return;
    }
    panel.classList.remove('hidden');
    panel.classList.toggle('collapsed', !!recount.collapsed);
    panel.dataset.tab = recount.tab || 'damage';

    const tabs = panel.querySelectorAll('.recount-tabs button');
    tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === recount.tab));

    if (recount.collapsed) {
      const det = document.getElementById('recount-detail');
      if (det) det.classList.add('hidden');
      return;
    }

    const map = recount.tab === 'taken' ? recount.taken
      : recount.tab === 'healing' ? recount.healing
      : recount.damage;
    const rows = (run.party || []).map(p => ({
      uid: p.uid,
      // fullName уже с «· 2» при дублях спеков (assignPartyUniqueNames)
      name: p.fullName || p.name || 'Герой',
      icon: p.icon || '👤',
      value: map[p.uid] || 0,
    })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'ru'));
    const top = rows.reduce((m, r) => Math.max(m, r.value), 0);
    const total = rows.reduce((s, r) => s + r.value, 0);

    const list = document.getElementById('recount-list');
    if (list) {
      list.innerHTML = rows.map(r => {
        const pct = top > 0 ? Math.round((r.value / top) * 100) : 0;
        const active = recount.detailUid === r.uid ? ' active' : '';
        return `<div class="recount-row${active}" data-uid="${r.uid}" data-name="${r.name}" title="${r.name}: ${fmt(r.value)} · клик — детали скиллов">
          <span class="rc-ico">${r.icon}</span>
          <span class="rc-name">${r.name}</span>
          <span class="rc-val">${fmt(r.value)}</span>
          <div class="recount-bar-wrap"><i style="width:${pct}%"></i></div>
        </div>`;
      }).join('');
      list.querySelectorAll('.recount-row').forEach(row => {
        row.addEventListener('click', () => {
          if (!recount) return;
          const id = row.dataset.uid;
          if (recount.detailUid === id) {
            recount.detailUid = null;
            document.getElementById('recount-detail')?.classList.add('hidden');
            row.classList.remove('active');
            return;
          }
          recount.detailUid = id;
          list.querySelectorAll('.recount-row').forEach(r => r.classList.toggle('active', r.dataset.uid === id));
          renderRecountDetail(id, row.dataset.name || '');
        });
      });
    }
    const totEl = document.getElementById('recount-total');
    if (totEl) totEl.textContent = fmt(total);

    // Keep detail open for selected hero when totals refresh
    if (recount.detailUid) {
      const hero = (run.party || []).find(p => p.uid === recount.detailUid);
      renderRecountDetail(recount.detailUid, hero ? (hero.fullName || hero.name) : '');
    } else {
      document.getElementById('recount-detail')?.classList.add('hidden');
    }
  }

  function bindRecountUI() {
    const panel = document.getElementById('recount-panel');
    if (!panel || panel.dataset.bound) return;
    panel.dataset.bound = '1';
    document.getElementById('recount-toggle')?.addEventListener('click', () => {
      if (!recount) return;
      recount.collapsed = !recount.collapsed;
      updateRecountUI();
    });
    panel.querySelectorAll('.recount-tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!recount) return;
        recount.tab = btn.dataset.tab || 'damage';
        recount.collapsed = false;
        // keep detailUid — switch breakdown to new tab
        updateRecountUI();
      });
    });
    document.getElementById('recount-detail-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!recount) return;
      recount.detailUid = null;
      document.getElementById('recount-detail')?.classList.add('hidden');
      panel.querySelectorAll('.recount-row.active').forEach(r => r.classList.remove('active'));
    });
  }

  /** Format large combat numbers: 170000 → 170т, 1.5e6 → 1.5м */
  function fmt(n) {
    const v = Math.round(Number(n) || 0);
    const neg = v < 0 ? '-' : '';
    const a = Math.abs(v);
    if (a >= 1e6) return neg + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'м';
    if (a >= 1000) return neg + (a / 1000).toFixed(a >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'т';
    return neg + String(a);
  }

  // Pet templates (base stats × STAT_SCALE in createPetUnit)
  const PET_DEFS = {
    hunter_pet: { name: 'Питомец', icon: '🐺', hp: 100, atk: 16, def: 5, speed: 13, role: 'dps' },
    felguard:   { name: 'Страж Скверны', icon: '👹', hp: 125, atk: 17, def: 7, speed: 11, role: 'dps' },
    imp:        { name: 'Бес', icon: '👿', hp: 55, atk: 14, def: 2, speed: 14, role: 'dps' },
    water_totem:{ name: 'Водяной тотем', icon: '⛲', hp: 40, atk: 8, def: 2, speed: 10, role: 'healer' },
    imp_boss:   { name: 'Главарь бесов', icon: '👑', hp: 70, atk: 18, def: 3, speed: 12, role: 'dps' },
    voidwalker: { name: 'Демон Бездны', icon: '👤', hp: 150, atk: 12, def: 9, speed: 8, role: 'tank' },
    ghoul:      { name: 'Вурдалак', icon: '🧟', hp: 105, atk: 16, def: 5, speed: 12, role: 'dps' },
    shadowfiend:{ name: 'Исчадие Тьмы', icon: '👾', hp: 75, atk: 18, def: 2, speed: 15, role: 'dps' },
    dire:       { name: 'Зверь', icon: '🐻', hp: 85, atk: 17, def: 4, speed: 13, role: 'dps' },
    wolf:       { name: 'Дух волка', icon: '🐺', hp: 70, atk: 15, def: 3, speed: 14, role: 'dps' },
    fire_ele:   { name: 'Элементаль огня', icon: '🔥', hp: 95, atk: 19, def: 3, speed: 12, role: 'dps' },
    gargoyle:   { name: 'Горгулья', icon: '🦇', hp: 90, atk: 18, def: 4, speed: 13, role: 'dps' },
    mirror:     { name: 'Зеркальная копия', icon: '🪞', hp: 45, atk: 13, def: 1, speed: 13, role: 'dps' },
    // Engineer mechanisms
    combat_bot:      { name: 'Боевой бот', icon: '🤖', hp: 120, atk: 17, def: 6, speed: 12, role: 'dps' },
    pocket_bot:      { name: 'Карманный бот', icon: '🔩', hp: 70, atk: 14, def: 3, speed: 14, role: 'dps' },
    turret:          { name: 'Автотурель', icon: '🗼', hp: 80, atk: 16, def: 4, speed: 10, role: 'dps' },
    bomb_drone:      { name: 'Дрон-бомба', icon: '🛸', hp: 45, atk: 18, def: 1, speed: 15, role: 'dps' },
    siege_walker:    { name: 'Осадный ходун', icon: '🦾', hp: 160, atk: 20, def: 8, speed: 9, role: 'dps' },
    rocket_chicken:  { name: 'Ракета-курица', icon: '🐔', hp: 55, atk: 17, def: 2, speed: 16, role: 'dps' },
    world_destroyer: { name: 'Разрушитель миров', icon: '🦿', hp: 140, atk: 21, def: 7, speed: 10, role: 'dps' },
    scrap_bot:       { name: 'Скрап-бот', icon: '⚙️', hp: 40, atk: 13, def: 1, speed: 15, role: 'dps' },
  };

  /** HoT spells: direct fraction + per-round tick. turns = full combat rounds the HoT lasts. */
  const PERIODIC_ROUNDS = 3; // DoT/HoT always last this many combat rounds (1 tick / round)
  const HOT_SPELLS = {
    renew:     { turns: PERIODIC_ROUNDS, direct: 0.2, tick: 0.28 },
    riptide:   { turns: PERIODIC_ROUNDS, direct: 0.45, tick: 0.22 },
    reju:      { turns: PERIODIC_ROUNDS, direct: 0.15, tick: 0.3 },
    regrowth:  { turns: PERIODIC_ROUNDS, direct: 0.65, tick: 0.22 },
    enveloping:{ turns: PERIODIC_ROUNDS, direct: 0.25, tick: 0.32 },
    renewing:  { turns: PERIODIC_ROUNDS, direct: 0.3, tick: 0.28 },
    lifebloom: { turns: PERIODIC_ROUNDS, direct: 0.15, tick: 0.35 },
    soothing:  { turns: PERIODIC_ROUNDS, direct: 0.55, tick: 0.3 },
  };
  /** Heal ids that always apply HoT via HOT_SPELLS (even if map key missing → defaults). */
  const HOT_ABILITY_IDS = new Set(Object.keys(HOT_SPELLS));
  function hotConfig(abilityId) {
    if (HOT_SPELLS[abilityId]) return { ...HOT_SPELLS[abilityId], turns: PERIODIC_ROUNDS };
    if (HOT_ABILITY_IDS.has(abilityId)) return { turns: PERIODIC_ROUNDS, direct: 0.35, tick: 0.25 };
    return null;
  }
  function periodicTurns(/* abilityId */) {
    return PERIODIC_ROUNDS;
  }

  /** Ability id → temporary pet summons (also may deal damage/aoe as normal type) */
  const PET_SUMMONS = {
    hand_guldan:  [{ def: 'imp', n: 2, turns: 3 }],
    shadowfiend:  [{ def: 'shadowfiend', n: 1, turns: 4 }],
    dire:         [{ def: 'dire', n: 1, turns: 3 }],
    feral_spirit: [{ def: 'wolf', n: 2, turns: 3 }],
    fire_ele:     [{ def: 'fire_ele', n: 1, turns: 4 }],
    summon_garg:  [{ def: 'gargoyle', n: 1, turns: 4 }],
    mirror:       [{ def: 'mirror', n: 2, turns: 3 }],
    // Engineer
    deploy_turret:      [{ def: 'turret', n: 1, turns: 4 }],
    call_siege_walker:  [{ def: 'siege_walker', n: 1, turns: 4 }],
    deploy_bomb_drone:  [{ def: 'bomb_drone', n: 2, turns: 3 }],
    rocket_chicken:     [{ def: 'rocket_chicken', n: 2, turns: 3 }],
    world_destroyer:    [{ def: 'world_destroyer', n: 1, turns: 2 }],
    scrap_swarm:        [{ def: 'scrap_bot', n: 2, turns: 5 }],
    hst:                [{ def: 'water_totem', n: 1, turns: 3 }],
    imp_leader:         [{ def: 'imp_boss', n: 1, turns: 3 }],
  };
  const toast = (msg, ms = 2400) => {
    const el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  };
  const log = (msg, cls = 'system') => {
    if (!run) return;
    run.logs.unshift({ msg, cls });
    if (run.logs.length > 90) run.logs.pop();
    renderLog();
  };

  function aiDelay() {
    return Math.max(80, Math.round(400 / gameSpeed));
  }
  function sfx(kind) {
    if (!soundOn) return;
    try {
      const ctx = sfx._ctx || (sfx._ctx = new (window.AudioContext || window.webkitAudioContext)());
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      const now = ctx.currentTime;
      if (kind === 'hit') { o.frequency.value = 180; g.gain.setValueAtTime(0.04, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.08); o.start(now); o.stop(now + 0.09); }
      else if (kind === 'crit') { o.frequency.value = 420; g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12); o.start(now); o.stop(now + 0.13); }
      else if (kind === 'heal') { o.type = 'sine'; o.frequency.value = 520; g.gain.setValueAtTime(0.04, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1); o.start(now); o.stop(now + 0.11); }
      else if (kind === 'win') { o.frequency.value = 660; g.gain.setValueAtTime(0.05, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.25); o.start(now); o.stop(now + 0.26); }
      else if (kind === 'lose') { o.frequency.value = 110; g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.3); o.start(now); o.stop(now + 0.31); }
      else if (kind === 'click') { o.frequency.value = 300; g.gain.setValueAtTime(0.02, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.04); o.start(now); o.stop(now + 0.05); }
    } catch (_) { /* ignore */ }
  }
  /** Per-uid stack so simultaneous numbers fan out over the portrait. */
  const floatStacks = new Map(); // uid -> next index

  function floatAnchor(unitUid) {
    const unit = unitEl(unitUid);
    if (!unit) return null;
    // Prefer portrait circle; fall back to pet face / whole card
    const port = unit.querySelector('.portrait, .art-wrap.pet-face') || unit;
    const r = port.getBoundingClientRect();
    if (!r.width && !r.height) {
      const r2 = unit.getBoundingClientRect();
      return { x: r2.left + r2.width / 2, y: r2.top + r2.height * 0.35, el: unit };
    }
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.4, el: unit };
  }

  /**
   * Floating combat number over unit portrait.
   * Lives in #float-layer (fixed) so renderCombat() re-renders never wipe it.
   */
  function floatText(unitUid, text, kind) {
    if (!unitUid) return;
    const layer = document.getElementById('float-layer');
    const anchor = floatAnchor(unitUid);
    if (!layer || !anchor) return;

    // Format: pure numbers get sign; long digit runs get compact fmt
    let shown = text;
    if (typeof text === 'number') {
      shown = (text > 0 ? '+' : text < 0 ? '−' : '') + fmt(Math.abs(text));
    } else if (typeof text === 'string') {
      shown = text
        .replace(/−/g, '-')
        .replace(/([+\-]?)(\d{4,})/g, (_, s, n) => (s === '-' ? '−' : s) + fmt(n));
      // Prefer en-dash for damage minus in UI
      if (shown.startsWith('-') && (kind === 'dmg' || kind === 'crit' || kind === 'dot')) {
        shown = '−' + shown.slice(1);
      }
    }

    // Stack offset: alternate L/R and climb so multi-hits remain readable
    const idx = floatStacks.get(unitUid) || 0;
    floatStacks.set(unitUid, idx + 1);
    setTimeout(() => {
      const cur = floatStacks.get(unitUid) || 1;
      floatStacks.set(unitUid, Math.max(0, cur - 1));
    }, 1100);
    const side = (idx % 2 === 0 ? -1 : 1) * (8 + (idx % 4) * 6);
    const lift = (idx % 5) * 10;
    const jitterX = side + (Math.random() * 8 - 4);
    const jitterY = lift + (Math.random() * 6 - 2);

    const span = document.createElement('div');
    const k = kind || 'dmg';
    span.className = 'float-text ' + k;
    span.textContent = shown;
    span.style.left = Math.round(anchor.x + jitterX) + 'px';
    span.style.top = Math.round(anchor.y - 4 - jitterY) + 'px';
    span.style.setProperty('--fx', Math.round(jitterX * 0.35) + 'px');
    // Crit pops a bit longer
    const life = k === 'crit' ? 1250 : 1050;
    if (k === 'crit') span.style.animationDuration = '1.2s';
    layer.appendChild(span);
    setTimeout(() => span.remove(), life);
  }
  function typeLabel(t) {
    return ({
      damage: 'урон', aoe: 'по области', heal: 'лечение', heal_aoe: 'лечение отряда',
      shield: 'щит', taunt: 'провокация', buff: 'усиление', debuff: 'ослабление',
      dot: 'периодический урон', interrupt: 'прерывание', summon: 'призыв', cast_aoe: 'каст по области',
    })[t] || t;
  }
  /** flat → множитель атаки (15 flat ≈ ×1.0 атаки). */
  function flatAsAtkMult(flat) {
    const f = Number(flat);
    if (!Number.isFinite(f) || f < 0) return 0;
    return f / FLAT_REF;
  }

  /** Вес flat из данных скилла (поддержка flat и сокращения fl). */
  function abilityFlatWeight(ab) {
    if (!ab) return null;
    const v = ab.flat != null ? ab.flat : ab.fl;
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  /**
   * Сырой урон скилла — всегда от эффективной атаки (спек + шмот + atkMod-баффы).
   * flat: вес относительно FLAT_REF; power: прямой множитель atk.
   */
  function abilityDamageRaw(actor, ab, mult) {
    mult = mult == null ? 1 : mult;
    const eff = getEff(actor);
    const flatW = abilityFlatWeight(ab);
    if (flatW != null) {
      return Math.max(1, Math.round(eff.atk * flatAsAtkMult(flatW) * mult));
    }
    let power = Number(ab && ab.power);
    if (!Number.isFinite(power) || power <= 0) power = 1;
    return Math.max(1, Math.round(eff.atk * power * mult));
  }

  /**
   * Сырое лечение — от атаки кастера (та же шкала, что урон).
   * flat: вес; power: доля maxHp цели (legacy %-хилы, тоже зависят от статов цели).
   */
  function abilityHealRaw(actor, ab, target, mult) {
    mult = mult == null ? 1 : mult;
    const te = talentEffects();
    if (actor && actor.side === 'ally' && te.healMult) mult *= te.healMult;
    const flatW = abilityFlatWeight(ab);
    if (flatW != null) {
      const eff = getEff(actor);
      return Math.max(1, Math.round(eff.atk * flatAsAtkMult(flatW) * mult));
    }
    let power = Number(ab && ab.power);
    if (!Number.isFinite(power) || power <= 0) power = 1;
    const baseHp = (target && target.maxHp) || (actor && actor.maxHp) || STAT_SCALE;
    return Math.max(1, Math.round(baseHp * power * mult));
  }

  /** Щит от flat/power — масштабируется от атаки (flat) или maxHp (power). */
  function abilityShieldRaw(actor, ab, target, mult) {
    mult = mult == null ? 1 : mult;
    const flatW = abilityFlatWeight(ab);
    if (flatW != null) {
      const eff = getEff(actor);
      return Math.max(1, Math.round(eff.atk * flatAsAtkMult(flatW) * mult));
    }
    let power = Number(ab && ab.power);
    if (!Number.isFinite(power) || power <= 0) power = 0.3;
    const baseHp = (target && target.maxHp) || (actor && actor.maxHp) || STAT_SCALE;
    return Math.max(1, Math.round(baseHp * power * mult));
  }

  /** Периодический тик (DoT/HoT) из flat — от атаки источника. */
  function periodicTickFromFlat(actor, flat, mult) {
    mult = mult == null ? 1 : mult;
    const f = Number(flat);
    if (!Number.isFinite(f) || f <= 0) return Math.max(1, Math.round(getEff(actor).atk * 0.05 * mult));
    return Math.max(1, Math.round(getEff(actor).atk * flatAsAtkMult(f) * mult));
  }

  /** Русские названия школ / типов */
  const SCHOOL_RU = {
    physical: 'Физический',
    fire: 'Огонь',
    frost: 'Лёд',
    shadow: 'Тьма',
    holy: 'Свет',
    nature: 'Природа',
    arcane: 'Тайная',
    chi: 'Ци',
    blood: 'Кровь',
    heal: 'Лечение',
    none: 'Без урона',
  };
  /** Базовая школа класса/спека, если по скиллу не угадали */
  function defaultClassSchool(classId, specId) {
    switch (classId) {
      case 'warrior':
      case 'rogue':
      case 'hunter':
        return 'physical';
      case 'deathknight':
        if (specId === 'frost') return 'frost';
        if (specId === 'blood') return 'blood';
        return 'shadow';
      case 'mage':
        if (specId === 'fire') return 'fire';
        if (specId === 'frost') return 'frost';
        return 'arcane';
      case 'warlock':
        return 'shadow';
      case 'priest':
        return specId === 'shadow' ? 'shadow' : 'holy';
      case 'paladin':
        return 'holy';
      case 'shaman':
        return 'nature';
      case 'druid':
        if (specId === 'feral' || specId === 'guardian') return 'physical';
        return 'nature';
      case 'monk':
        return specId === 'mistweaver' ? 'nature' : 'chi';
      case 'engineer':
        return 'physical';
      default:
        return 'physical';
    }
  }
  /**
   * Проставить школу скиллу (явная ability.school > эвристика FX > дефолт класса).
   * non-damage → none/heal.
   */
  function inferAbilitySchool(classId, specId, ab) {
    if (!ab) return 'physical';
    if (ab.school) return String(ab.school).toLowerCase();
    const t = String(ab.type || 'damage').toLowerCase();
    if (t === 'heal' || t === 'heal_aoe' || t === 'shield') return 'heal';
    if (['buff', 'taunt', 'interrupt', 'dispel', 'cleanse', 'purge', 'cc', 'summon'].includes(t)) {
      return 'none';
    }
    // debuff: школа по имени/классу (может резать ATK без урона, но тип важен)
    const actor = { classId: classId || '', specId: specId || '', role: 'dps' };
    let school = 'physical';
    try {
      const fx = resolveSkillFx(ab, actor);
      school = (fx && fx.school) ? String(fx.school).toLowerCase() : 'physical';
    } catch (_) { /* ignore */ }
    if (!school || school === 'heal') school = defaultClassSchool(classId, specId);
    // DoT крови / bleeds
    if (t === 'dot' || (typeof DOT_ABILITY_IDS !== 'undefined' && DOT_ABILITY_IDS.has(ab.id))) {
      const blob = ((ab.id || '') + ' ' + (ab.name || '')).toLowerCase();
      if (/rend|rupture|garrote|bleed|кров|рван|рва/.test(blob)) school = 'physical';
      if (/agony|corrupt|ua|immolate|shadow|тьм|порч/.test(blob)) school = 'shadow';
      if (/flame|immolate|fire|огн/.test(blob)) school = 'fire';
      if (/frost|лед|cold/.test(blob)) school = 'frost';
      if (/moon|sun|nature|природ|serpent/.test(blob)) school = 'nature';
      if (/holy|свет|holy_fire/.test(blob)) school = 'holy';
    }
    return school;
  }
  function stampAbilitySchool(ab, classId, specId) {
    if (!ab) return ab;
    ab.school = inferAbilitySchool(classId, specId, ab);
    if (ab.applyDot && typeof ab.applyDot === 'object' && !ab.applyDot.school) {
      ab.applyDot.school = isPhysicalSchool(ab.school) ? 'physical' : ab.school;
    }
    return ab;
  }
  /** Проставить school всем скиллам в WOW_MOP (лобби + бой). */
  function stampAllAbilitySchools() {
    const classes = (typeof WOW_MOP !== 'undefined' && WOW_MOP.classes) ? WOW_MOP.classes : [];
    for (const cls of classes) {
      for (const sp of (cls.specs || [])) {
        for (const ab of (sp.abilities || [])) {
          stampAbilitySchool(ab, cls.id, sp.id);
        }
      }
    }
  }
  /**
   * Школа урона скилла (physical / fire / frost / shadow / holy / nature / arcane / chi / blood).
   */
  function abilityDamageSchool(actor, ability) {
    if (ability && ability.school) return String(ability.school).toLowerCase();
    const classId = actor && actor.classId;
    const specId = actor && actor.specId;
    return inferAbilitySchool(classId, specId, ability);
  }
  /** Физ. урон: physical, blood (кровотечения/мили), chi (мили монаха). Остальное — «магия». */
  function isPhysicalSchool(school) {
    const s = String(school || 'physical').toLowerCase();
    return s === 'physical' || s === 'blood' || s === 'chi' || s === '';
  }
  /** Строка под описанием: «Тип урона: Физический (физ.)» */
  function abilitySchoolNote(ab, actor) {
    if (!ab) return '';
    const t = String(ab.type || '').toLowerCase();
    if (t === 'heal') return 'Тип: Лечение · СТ';
    if (t === 'heal_aoe') return 'Тип: Лечение · АОЕ';
    if (t === 'shield') return 'Тип: Щит';
    if (t === 'buff') return 'Тип: Усиление';
    if (t === 'taunt') return 'Тип: Угроза';
    if (t === 'interrupt') return 'Тип: Прерывание';
    if (t === 'dispel' || t === 'cleanse') return 'Тип: Снятие эффектов';
    if (t === 'purge') return 'Тип: Развеивание';
    if (t === 'cc') return 'Тип: Контроль';
    if (t === 'summon') return 'Тип: Призыв';
    if (t === 'debuff') {
      const sch = ab.school || abilityDamageSchool(actor, ab);
      if (sch && sch !== 'none') {
        return 'Тип: Ослабление · ' + (SCHOOL_RU[sch] || sch);
      }
      return 'Тип: Ослабление';
    }
    const school = ab.school || abilityDamageSchool(actor, ab);
    if (school === 'none' || school === 'heal') {
      return 'Тип: ' + (SCHOOL_RU[school] || school);
    }
    const ru = SCHOOL_RU[school] || school;
    const kind = isPhysicalSchool(school) ? 'физ.' : 'маг.';
    return 'Тип урона: ' + ru + ' (' + kind + ')';
  }
  function abilitySchoolCss(ab, actor) {
    const t = String(ab && ab.type || '').toLowerCase();
    if (t === 'heal' || t === 'heal_aoe' || t === 'shield') return 'sch-heal';
    if (['buff', 'taunt', 'interrupt', 'dispel', 'cleanse', 'purge', 'cc', 'summon'].includes(t)) return 'sch-none';
    const school = (ab && ab.school) || abilityDamageSchool(actor, ab);
    if (isPhysicalSchool(school)) return 'sch-phys';
    return 'sch-' + (school || 'none');
  }

  /**
   * Короткие метки механики для жёлтой строки (a-cost), вместе с уроном.
   * Пример: «~18т урона · Вампиризм 15% · Не тратит ход»
   */
  function abilityMetaLine(ab) {
    if (!ab) return '';
    const bits = [];
    // Только метки UI, не цифры урона/баффов (они в estimateAbility)
    if (ab.maxCharges) bits.push((ab.charges != null ? ab.charges : ab.maxCharges) + '/' + ab.maxCharges + ' зар.');
    if (ab.freeAction) bits.push('Не тратит ход');
    if (ab.holyShock) bits.push('союзник/враг');
    if (ab.chainPrimary) bits.push('сначала выбранная цель');
    if (ab.holyShock === false && ab.targetFlex) bits.push(String(ab.targetFlex));
    return bits.join(' · ');
  }

  function estimateAbility(actor, ab) {
    const eff = getEff(actor);
    const te = talentEffects();
    // Гаечный воскрешатель — не power-хил (иначе «114т» от max HP)
    if (ab.id === 'wrench_heal') {
      return 'хил за счет питомца';
    }
    // Только цифры урона/хила — метки механики идут в abilityMetaLine (строка ниже)
    if (ab.type === 'heal' || ab.type === 'heal_aoe') {
      const mult = (ab.type === 'heal_aoe' ? 0.9 : 1);
      let base = abilityHealRaw(actor, ab, actor, mult);
      const scope = ab.type === 'heal_aoe' ? 'АОЕ' : 'СТ';
      const flatW = abilityFlatWeight(ab);
      const h = hotConfig(ab.id);
      if (h && flatW == null && !ab.applyHot) {
        return `${scope} · ~${fmt(Math.round(base * h.direct))} + ${fmt(Math.round(base * h.tick))}/р · ${PERIODIC_ROUNDS}р`;
      }
      // Только вес «Nт» из баланса (без старых ~чисел в скобках)
      let s = flatW != null
        ? `${scope} · ${flatW}т`
        : `${scope} · ~${fmt(base)} лечения`;
      if (ab.applyHot && ab.applyHot.flat != null) {
        const turns = Number(ab.applyHot.turns) || 5;
        s += ` + ${Number(ab.applyHot.flat)}т/р · ${turns}р`;
      }
      return s;
    }
    if (ab.type === 'damage' || ab.type === 'aoe') {
      const hits = Math.max(1, Number(ab.hits) || 1);
      let d = abilityDamageRaw(actor, ab);
      if (FINISHER_IDS.has(ab.id) && actor.res?.secondary?.type === 'combo') {
        const stacks = Math.max(1, actor.res.secondary.current || 1);
        d = Math.round(d * (0.7 + stacks * 0.15));
      }
      const flatW = abilityFlatWeight(ab);
      let s;
      if (flatW != null) {
        s = hits > 1
          ? `${flatW}т×${hits}` + (ab.type === 'aoe' ? ' по области' : '')
          : `${flatW}т` + (ab.type === 'aoe' ? ' по области' : '');
      } else {
        s = hits > 1
          ? `~${fmt(d)}×${hits}` + (ab.type === 'aoe' ? ' по области' : ' урона')
          : `~${fmt(d)}` + (ab.type === 'aoe' ? ' по области' : ' урона');
      }
      if (ab.splashFlat != null && Number.isFinite(Number(ab.splashFlat))) {
        s += ' · ' + Number(ab.splashFlat) + 'т остальным';
      }
      if (ab.id === 'sot_r') s += ' · Щит света';
      if (EXECUTE_IDS.has(ab.id)) s += ' · ≤35% HP';
      if (ab.judgmentConsecrateSplash) {
        s += ' · +' + Math.round(Number(ab.judgmentConsecrateSplash) * 100) + '% по Освящ.';
      }
      if (ab.interruptPrimary) {
        s += ' · сбивает каст';
        if (ab.interruptAoeChance) s += ' (+' + Math.round(Number(ab.interruptAoeChance) * 100) + '% АОЕ)';
      }
      if (ab.applyDot && ab.applyDot.flat != null) {
        const tick = periodicTickFromFlat(actor, ab.applyDot.flat);
        const dotTurns = Number(ab.applyDot.turns) || 4;
        const dotName = ab.applyDot.name || 'период.';
        s += ` + ${dotName} ${fmt(tick)}/р×${dotTurns}`;
      }
      if (ab.grantSelfBuff && ab.grantSelfBuff.id === 'wide_sweep') {
        s += ' · +Широкий размах';
      }
      if (ab.id === 'heroic' && actor && (actor.buffs || []).some(b => b && b.id === 'wide_sweep' && (Number(b.stacks) || 0) > 0)) {
        s += ' · 40% по остальным';
      }
      if (ab.enemyDmgMod) s += ` · −${Math.round(Number(ab.enemyDmgMod) * 100)}% урон врагов`;
      if (PET_SUMMONS[ab.id]) s += ' + питомец';
      return s;
    }
    if (ab.type === 'dot' || DOT_ABILITY_IDS.has(ab.id)) {
      if (ab.flat != null) {
        const tick = periodicTickFromFlat(actor, ab.flat);
        return `~${fmt(tick)}/р · ${PERIODIC_ROUNDS}р период. урон`;
      }
      const p = Number(ab.power) > 0 ? Number(ab.power) : 1;
      const hit = Math.round(eff.atk * p * 0.5);
      const tick = Math.max(1, Math.round(eff.atk * p * 0.4));
      return `~${fmt(hit)} + ${fmt(tick)}/р · ${PERIODIC_ROUNDS}р период. урон`;
    }
    if (ab.type === 'buff') {
      if (ab.id === 'dark_soul') return 'питомцы +3 хода';
      if (ab.id === 'metamorphosis') {
        // один раз: ATK себе + петам, длительность
        const pct = Math.round((Number(ab.atkMod) || Number(ab.petAtkMod) || 0.3) * 100);
        const turns = Number(ab.buffTurns) || 2;
        return `+${pct}% урон себе и бесам · ${turns}х`;
      }
      const bits = [];
      if (ab.critMod) bits.push('+' + Math.round(Number(ab.critMod) * 100) + '% крит');
      if (ab.atkMod && ab.id !== 'metamorphosis') bits.push('+' + Math.round(Number(ab.atkMod) * 100) + '% атаки');
      if (ab.petAtkMod && ab.id !== 'metamorphosis') bits.push('+' + Math.round(Number(ab.petAtkMod) * 100) + '% урон петов');
      if (ab.dmgReduce) bits.push('−' + Math.round(Number(ab.dmgReduce) * 100) + '% урон');
      if (ab.staggerBonus) bits.push('+' + Math.round(Number(ab.staggerBonus) * 100) + '% stagger');
      if (ab.maxHpPct) bits.push('+' + Math.round(Number(ab.maxHpPct) * 100) + '% здоровья');
      if (ab.buffTurns && bits.length) bits.push(Number(ab.buffTurns) + 'х');
      if (ab.id === 'last_stand' || ab.id === 'vampiric_blood') return `+${Math.round((ab.maxHpPct || ab.power || 0) * 100)}% здоровья`;
      if (ab.id === 'evocation') return '+мана';
      if (ab.id === 'prem') return '+2 к серии';
      if (ab.id === 'debug_mode') {
        const pet = getMainPet(actor, true);
        const mode = (pet && pet.attackMode === 'aoe') ? 'АОЕ' : 'СТ';
        return 'сейчас ' + mode + ' · переключить';
      }
      if (ab.id === 'pet_rez') return 'воскресить основного питомца';
      // Безрассудство и баффы «на N следующих способностей»
      if (ab.abilityCharges) {
        const pct = Math.round((Number(ab.power) || Number(ab.atkMod) || 0.35) * 100);
        const n = Math.max(1, Number(ab.abilityCharges) || 2);
        return `+${pct}% атаки · след. ${n} удар${n === 1 ? '' : (n < 5 ? 'а' : 'ов')}`;
      }
      if (ab.id === 'sot_r') {
        return '80т + 30т остальным · Щит света';
      }
      if (bits.length) return bits.join(' · ');
      if (ab.power && ab.power !== 1) return `+${Math.round(ab.power * 100)}%`;
      return 'бафф';
    }
    if (ab.type === 'debuff') {
      const pct = Math.round(Math.abs(ab.power || 0) * 100);
      return `−${pct}% атаки / −10% защиты, 3 хода`;
    }
    if (ab.type === 'shield') {
      if (ab.id === 'elusive') {
        const pool = Math.max(0, Math.round(actor.purifyCleared || 0));
        const base = abilityShieldRaw(actor, { flat: 30 }, actor);
        return pool > 0 ? `щит ~${fmt(base + pool)} (+${fmt(pool)} из stagger)` : `щит ~${fmt(base)}`;
      }
      const fw = abilityFlatWeight(ab);
      return fw != null ? `щит ${fw}т` : `щит ~${fmt(abilityShieldRaw(actor, ab, actor))}`;
    }
    if (ab.type === 'cc') {
      const n = Number(ab.buffTurns) || Number(ab.ccTurns) || 1;
      return 'стан ' + n + 'х';
    }
    if (ab.type === 'interrupt' || INTERRUPT_IDS.has(ab.id)) return 'сбивает каст';
    if (ab.type === 'summon' || PET_SUMMONS[ab.id]) return 'призыв питомца';
    return ab.desc || typeLabel(ab.type);
  }

  /**
   * Игровое описание способности (как работает) — для тултипа на иконке.
   * Цифры урона/КД/ресурса сюда не пишем: они справа в карточке.
   */
  function abilityDescribe(ab, actor) {
    if (!ab) return '';
    const id = ab.id || '';
    const t = String(ab.type || '').toLowerCase();
    // Особые id с известной механикой
    const byId = {
      purifying: 'Снимает часть пошатывания. Очищенный урон копится для «Отвара неуловимости».',
      elusive: 'Даёт щит: базовая прочность плюс урон, недавно снятый «Очищающим отваром».',
      guard: 'Ставит личный щит, поглощающий входящий урон.',
      fort_brew: 'Снижает получаемый урон и усиливает пошатывание на несколько ходов.',
      provoke: 'Перетягивает внимание врагов на вас.',
      taunt: 'Перетягивает внимание врагов на вас.',
      debug_mode: 'Переключает режим атаки основного питомца: одна цель или по области. Можно использовать раз за ход.',
      wrench_heal: 'Лечит союзника за счет питомца: снимает половину запаса здоровья основного питомца и передаёт лечение цели.',
      pet_rez: 'Возвращает основного питомца в бой, если он погиб.',
      party_stun: 'Оглушает цель на ход и сбивает чтение заклинания.',
      party_dispel: 'Снимает с союзника вредный магический эффект или стек «Взрывного».',
      party_purge: 'Снимает с врага усиление или ярость.',
      kick: 'Прерывает чтение заклинания врага и накладывает немоту.',
      hot_w: 'Удар по врагу с 35% здоровья или ниже. Не завершает ваш ход.',
      avengers: 'Щит летит по врагам. Сбивает чтение у основной цели; у остальных — с шансом. Часть урона становится щитом.',
      judgment: 'Судит врага. Если на других есть «Освящение», они получают долю урона Правосудия.',
      sot_r: 'Бьёт щитом: 80т по выбранной цели и 30т по остальным. Накладывает «Щит света» (+10% брони, 4 хода, до 2 стаков). 3 Энергии Света.',
      spirit_link: 'Тотем на 3 хода: −10% входящего урона отряду. После каждого удара, если кто-то просел по % HP — сразу выравнивает здоровье отряда.',
      word_glory: 'Сильное исцеление одной цели за Энергию Света (СТ).',
      light_dawn: 'Исцеляет всю группу (АОЕ) за Энергию Света.',
      holy_radiance: 'Исцеляет всю группу (АОЕ).',
      holy_light: 'Сильное исцеление одной цели (СТ).',
      flash: 'Быстрое исцеление одной цели (СТ).',
      ms: 'Накладывает «Кровотечение» на 4 хода.',
      colossus: 'Ломает броню цели и накладывает «Кровотечение» на 4 хода.',
      heroic: 'Накладывает «Кровотечение» на 4 хода. Под «Широким размахом» удар дублируется на остальных врагов с силой 40%.',
      reck: '+35% атаки на следующие 2 удара. Не завершает ваш ход.',
    };
    if (byId[id]) {
      let s = byId[id];
      if (ab.freeAction) s += ' Не завершает ваш ход.';
      return s;
    }
    // Arms Вихрь: grantSelfBuff wide_sweep (у Неистовства — обычный AoE)
    if (id === 'whirlwind' && ab.grantSelfBuff && ab.grantSelfBuff.id === 'wide_sweep') {
      return 'Урон по всем врагам. Даёт 1 стак «Широкий размах»: следующий «Героический удар» дублируется на остальных (40%).';
    }

    const raw = (ab.desc && String(ab.desc).trim()) || '';
    // desc из таблицы, если это не пустышка и не голые цифры/КД
    const looksNumeric = raw && /^[\d\s·.\-−~%ткд/+×xхордпарманаяростьэнерг]+$/i.test(raw.replace(/[а-яёa-z]/gi, ''));
    const parts = [];
    if (raw && raw.length > 2 && !looksNumeric) parts.push(raw);

    if (!parts.length) {
      switch (t) {
        case 'damage':
          parts.push(ab.hits > 1 ? 'Несколько ударов по выбранной цели.' : 'Удар по выбранной цели.');
          break;
        case 'aoe':
        case 'cast_aoe':
          parts.push('Урон по всем врагам.');
          break;
        case 'dot':
          parts.push('Накладывает периодический урон на цель.');
          break;
        case 'heal':
          parts.push(ab.id === 'wrench_heal' ? '' : 'Исцеляет выбранного союзника.');
          break;
        case 'heal_aoe':
          parts.push('Исцеляет весь отряд.');
          break;
        case 'shield':
          parts.push('Накладывает щит, поглощающий урон.');
          break;
        case 'buff':
          parts.push('Временно усиливает вас или ваших питомцев.');
          break;
        case 'debuff':
          parts.push('Ослабляет выбранного врага.');
          break;
        case 'taunt':
          parts.push('Перетягивает внимание врагов на вас.');
          break;
        case 'interrupt':
          parts.push('Сбивает чтение заклинания и накладывает немоту.');
          break;
        case 'cc':
          parts.push(ab.ccMode === 'silence' ? 'Накладывает немоту.' : 'Оглушает цель.');
          break;
        case 'cleanse':
          parts.push('Снимает часть накопленного пошатывания.');
          break;
        case 'dispel':
          parts.push('Снимает вредный эффект с союзника.');
          break;
        case 'purge':
          parts.push('Снимает усиление с врага.');
          break;
        case 'summon':
          parts.push('Призывает питомца или механизм на время.');
          break;
        default:
          parts.push(typeLabel(t) || 'Особая способность.');
      }
    }

    // Доп. механики, если не очевидны из desc
    const blob = parts.join(' ').toLowerCase();
    if (ab.applyDot && !/период|кровотеч|дот|яд|ожог/.test(blob)) {
      const dn = ab.applyDot.name || 'периодический урон';
      const dt = Number(ab.applyDot.turns) || 4;
      parts.push(`Накладывает «${dn}» на ${dt} хода.`);
    }
    if (ab.grantSelfBuff && ab.grantSelfBuff.id === 'wide_sweep' && !/широкий размах|героический/.test(blob)) {
      parts.push('Даёт 1 стак «Широкий размах»: следующий «Героический удар» дублируется на остальных (40%).');
    }
    if (ab.applyHot && !/период|лечение|хот|исцел/.test(blob)) {
      parts.push('Оставляет периодическое лечение.');
    }
    if (ab.holyShock && !/враг|союзник|шок/.test(blob)) {
      parts.push('Можно направить во врага (урон) или в союзника (исцеление).');
    }
    if (ab.lifesteal && !/вампир|похищ|возвращ/.test(blob)) {
      parts.push('Часть урона возвращается как исцеление.');
    }
    if (ab.vuln && !/уязв|брон|слаб/.test(blob)) {
      parts.push('Цель на время получает больше урона.');
    }
    if (ab.cleaveFlat != null && !/бок|сосед|рассев/.test(blob)) {
      parts.push('Задевает врагов рядом с целью.');
    }
    if (ab.enemyDmgMod && !/слаб|урон враг/.test(blob)) {
      parts.push('Ослабляет урон врагов.');
    }
    if ((ab.dmgReduce || ab.staggerBonus) && t === 'buff' && !/снижа|пошат|защит/.test(blob)) {
      if (ab.dmgReduce) parts.push('Снижает получаемый урон.');
      if (ab.staggerBonus) parts.push('Усиливает пошатывание.');
    }
    if (ab.blockChanceAdd && !/блок/.test(blob)) {
      parts.push('Повышает шанс блока.');
    }
    if (PET_SUMMONS[id] && t !== 'summon' && !/призыв|питом/.test(blob)) {
      parts.push('Также призывает питомца.');
    }
    if (ab.freeAction && !/не заверш|без хода|не тратит ход/.test(blob)) {
      parts.push('Не завершает ваш ход.');
    }
    if (ab.maxCharges && !/заряд/.test(blob)) {
      parts.push('Имеет несколько зарядов.');
    }

    return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }

  /** DoT duration rounds (legacy map kept for ids; all forced to PERIODIC_ROUNDS). */
  const DOT_TURNS = {
    doom: PERIODIC_ROUNDS, agony: PERIODIC_ROUNDS, ua: PERIODIC_ROUNDS,
    black_arrow: PERIODIC_ROUNDS, devouring: PERIODIC_ROUNDS,
    rupture: PERIODIC_ROUNDS, garrote: PERIODIC_ROUNDS, serpent: PERIODIC_ROUNDS,
    corruption: PERIODIC_ROUNDS, immolate: PERIODIC_ROUNDS,
    sticky_bomb: PERIODIC_ROUNDS, moonfire: PERIODIC_ROUNDS, sunfire: PERIODIC_ROUNDS, rake: PERIODIC_ROUNDS,
    rip: PERIODIC_ROUNDS, lacerate: PERIODIC_ROUNDS,
    rend: PERIODIC_ROUNDS, plague_strike: PERIODIC_ROUNDS, outbreak: PERIODIC_ROUNDS,
    swp: PERIODIC_ROUNDS, vt: PERIODIC_ROUNDS, holy_fire: PERIODIC_ROUNDS,
    living_bomb: PERIODIC_ROUNDS, nether_tempest: PERIODIC_ROUNDS, flame_shock: PERIODIC_ROUNDS,
    d: PERIODIC_ROUNDS, poison: PERIODIC_ROUNDS, dot: PERIODIC_ROUNDS,
  };
  /** Ability ids that always resolve as DoT even if type was lost/mangled. */
  const DOT_ABILITY_IDS = new Set([
    'moonfire', 'sunfire', 'rake', 'rip', 'lacerate',
    'rend', 'agony', 'ua', 'corruption', 'immolate', 'doom',
    'swp', 'vt', 'devouring', 'holy_fire', 'serpent', 'black_arrow',
    'garrote', 'rupture', 'living_bomb', 'nether_tempest', 'flame_shock',
    'plague_strike', 'outbreak', 'poison', 'd', 'dot', 'sticky_bomb']);

  /** Apply or refresh a buff/debuff/dot on unit (same id replaces old). */
  function applyStatus(unit, buff) {
    if (!unit || !buff) return;
    if (!unit.buffs) unit.buffs = [];
    unit.buffs = unit.buffs.filter(b => b.id !== buff.id);
    unit.buffs.push(buff);
  }
  function scoreLabel() {
    if (!run) return '';
    const left = run.timerLeft;
    const max = run.timerMax;
    if (left <= 0) return 'Провал';
    const pct = left / max;
    if (pct >= 0.4) return '+3';
    if (pct >= 0.2) return '+2';
    if (pct >= 0.08) return '+1';
    return 'В тайме';
  }


  function keyAffixes(level) {
    const week = mythicWeekId();
    const year = new Date().getFullYear();
    const seed = year * 100 + week + level * 17;
    const res = [];
    // Tyr/Fort alternate by calendar week (not just key parity)
    const tyr = AFFIXES.find(a => a.id === 'tyrannical');
    const fort = AFFIXES.find(a => a.id === 'fortified');
    if (week % 2 === 0) res.push(fort); else res.push(tyr);
    const seasonal = AFFIXES.filter(a =>
      a.id !== 'tyrannical' && a.id !== 'fortified' && level >= a.minKey
    );
    const order = seededShuffle(seasonal, seed);
    const want = level >= 12 ? 3 : level >= 7 ? 2 : level >= 4 ? 1 : 0;
    for (const a of order) {
      if (res.length >= 1 + want) break;
      res.push(a);
    }
    return res;
  }
  function weeklyAffixLabel() {
    const w = mythicWeekId();
    return `Неделя ${w} · ${new Date().getFullYear()}`;
  }
  const hasEffect = (k) => run?.affixes.some(a => a.kind === k);
  const affixValue = (k, d = 0) => run?.affixes.find(a => a.kind === k)?.value ?? d;
  function talentEffects() {
    return (run?.talents || []).reduce((acc, t) => {
      for (const [k, v] of Object.entries(t.effect)) {
        if (typeof v === 'number' && typeof acc[k] === 'number' && String(k).includes('Mult')) acc[k] *= v;
        else if (typeof v === 'number' && typeof acc[k] === 'number') acc[k] += v;
        else acc[k] = v;
      }
      return acc;
    }, {});
  }

  // ── Resources ──
  function makeResourceState(cls, spec) {
    const { primary, secondary } = WOW_MOP.resolveResources(cls, spec);
    const state = {
      primary: {
        type: primary.type,
        name: primary.name,
        icon: primary.icon,
        max: primary.max,
        current: primary.start ?? primary.max,
        regen: primary.regen ?? 0,
      },
      secondary: secondary ? {
        type: secondary.type,
        name: secondary.name,
        icon: secondary.icon,
        max: secondary.max,
        current: secondary.start ?? 0,
      } : null,
      runes: null,
    };
    if (primary.type === 'runes') {
      state.runes = {
        blood: [true, true],
        frost: [true, true],
        unholy: [true, true],
        cd: [], // { type, turns }
      };
      state.primary.current = 6;
      state.primary.max = 6;
    }
    return state;
  }

  function readyRunes(u) {
    if (!u.res.runes) return 0;
    const r = u.res.runes;
    return r.blood.filter(Boolean).length + r.frost.filter(Boolean).length + r.unholy.filter(Boolean).length;
  }

  function spendRunes(u, costRunes) {
    if (!costRunes || !u.res.runes) return true;
    const r = u.res.runes;
    const take = (type, n) => {
      let left = n;
      for (let i = 0; i < r[type].length && left > 0; i++) {
        if (r[type][i]) { r[type][i] = false; r.cd.push({ type, idx: i, turns: 2 }); left--; }
      }
      return left === 0;
    };
    if (costRunes.any) {
      let n = costRunes.any;
      for (const type of ['blood', 'frost', 'unholy']) {
        for (let i = 0; i < r[type].length && n > 0; i++) {
          if (r[type][i]) { r[type][i] = false; r.cd.push({ type, idx: i, turns: 2 }); n--; }
        }
      }
      return n === 0;
    }
    if (costRunes.b && !take('blood', costRunes.b)) return false;
    if (costRunes.f && !take('frost', costRunes.f)) return false;
    if (costRunes.u && !take('unholy', costRunes.u)) return false;
    return true;
  }

  function canPay(u, ab, target) {
    if (ab.maxCharges) {
      if (ab.charges == null) ab.charges = ab.maxCharges;
      if (ab.charges <= 0) return false;
    } else if (ab.curCd > 0.05) return false;
    if (typeof PET_SUMMONS !== 'undefined' && PET_SUMMONS[ab.id] && u && typeof canSummonAbility === 'function' && !canSummonAbility(u, ab.id)) return false;
    if (ab.costRunes) {
      if (!u.res.runes) return false;
      if (ab.costRunes.any) { if (readyRunes(u) < ab.costRunes.any) return false; }
      else {
        const r = u.res.runes;
        if (ab.costRunes.b && r.blood.filter(Boolean).length < ab.costRunes.b) return false;
        if (ab.costRunes.f && r.frost.filter(Boolean).length < ab.costRunes.f) return false;
        if (ab.costRunes.u && r.unholy.filter(Boolean).length < ab.costRunes.u) return false;
      }
    }
    if (ab.cost > 0 && u.res.primary.type !== 'runes' && u.res.primary.current < ab.cost) return false;
    if (ab.costSec > 0) {
      if (!u.res.secondary) return false;
      const need = ab.costSec;
      if (u.res.secondary.type === 'combo' && need === 1) {
        if (u.res.secondary.current < 1) return false;
      } else if (u.res.secondary.current < need) return false;
    }
    // execute window
    if (EXECUTE_IDS.has(ab.id) && target && target.side === 'enemy') {
      if (target.hp / target.maxHp > 0.35) return false;
    }
    if (EXECUTE_IDS.has(ab.id) && !target && combat) {
      const foes = living('enemy');
      if (!foes.some(e => e.hp / e.maxHp <= 0.35)) return false;
    }
    if ((ab.type === 'interrupt' || INTERRUPT_IDS.has(ab.id)) && target) {
      if (!target.casting) return false;
    }
    if (ab.id === 'debug_mode' && u._debugUsedThisTurn) return false;
    if (ab.id === 'pet_rez') {
      const pet = getMainPet(u, true);
      if (pet && pet.alive && pet.hp > 0) return false;
      if (!mainPetKeyFor(u.classId, u.specId)) return false;
    }
    if (ab.id === 'wrench_heal') {
      const pet = getMainPet(u, false);
      if (!pet) return false;
    }
    return true;
  }

  function payAbility(u, ab) {
    // remember secondary stacks for finisher scaling before spend
    if (ab.costSec > 0 && u.res.secondary) {
      u._spentSec = u.res.secondary.type === 'combo'
        ? u.res.secondary.current
        : Math.min(u.res.secondary.current, ab.costSec);
    } else u._spentSec = 0;

    if (ab.costRunes) spendRunes(u, ab.costRunes);
    else if (ab.cost > 0 && u.res.primary.type !== 'runes') {
      u.res.primary.current = Math.max(0, u.res.primary.current - ab.cost);
    }
    if (ab.gen && u.res.primary.type !== 'runes') {
      u.res.primary.current = clamp(u.res.primary.current + ab.gen, 0, u.res.primary.max);
    }
    if (ab.genRunic && u.res.secondary?.type === 'runic_power') {
      u.res.secondary.current = clamp(u.res.secondary.current + ab.genRunic, 0, u.res.secondary.max);
    }
    if (ab.genSec && u.res.secondary) {
      const prev = u.res.secondary.current;
      u.res.secondary.current = clamp(u.res.secondary.current + ab.genSec, 0, u.res.secondary.max);
      // Balance eclipse: при заполнении шкалы — короткий +ATK (lite 5.4.8)
      if (u.res.secondary.type === 'eclipse' && prev < u.res.secondary.max && u.res.secondary.current >= u.res.secondary.max) {
        u.buffs = u.buffs || [];
        applyStatus(u, { id: 'eclipse', name: 'Затмение', icon: '🌓', turns: 3, atkMod: 0.2 });
        u.res.secondary.current = 0;
      }
    }
    if (ab.costSec > 0 && u.res.secondary) {
      if (u.res.secondary.type === 'runic_power') {
        u.res.secondary.current = Math.max(0, u.res.secondary.current - ab.costSec);
      } else if (u.res.secondary.type === 'combo') {
        u.res.secondary.current = 0;
      } else {
        u.res.secondary.current = Math.max(0, u.res.secondary.current - ab.costSec);
      }
      // Холи-паладин «Добродетель»: каждая потраченная ES — 25% шанс вернуть
      try { maybeHolyVirtueRefund(u, ab); } catch (e) { console.error(e); }
    }
  }

  /**
   * Пассивка «Добродетель» (все спеки паладина):
   * за каждую потраченную ед. Энергии Света — 25% вернуть 1 ед. (независимые роллы).
   */
  function maybeHolyVirtueRefund(u, ab) {
    if (!u || u.classId !== 'paladin') return;
    if (!u.res?.secondary || u.res.secondary.type !== 'holy_power') return;
    const spent = Math.max(0, Number(u._spentSec) || 0);
    if (spent <= 0) return;
    let refunded = 0;
    for (let i = 0; i < spent; i++) {
      if (Math.random() < 0.25) refunded++;
    }
    if (refunded <= 0) return;
    u.res.secondary.current = clamp(
      u.res.secondary.current + refunded,
      0,
      u.res.secondary.max
    );
    floatText(u.uid, '+' + refunded + ' ES', 'buff');
    pulseResourceGain(u.uid, '+' + refunded + ' ES');
    log(
      (u.name || 'Паладин') + ': Добродетель — вернулось ' + refunded + ' ES (из ' + spent + ')',
      'player'
    );
  }

  /** Короткая анимация +X у вторичного ресурса на портрете */
  function pulseResourceGain(unitUid, text) {
    if (!unitUid) return;
    const card = document.querySelector(`.unit[data-uid="${unitUid}"]`);
    if (!card) return;
    const slot = card.querySelector('.slot-sec') || card.querySelector('.bar.res')?.parentElement;
    if (!slot) return;
    slot.classList.add('res-gain-pulse');
    const tag = document.createElement('span');
    tag.className = 'res-gain-float';
    tag.textContent = text || '+';
    slot.style.position = slot.style.position || 'relative';
    slot.appendChild(tag);
    setTimeout(() => {
      tag.remove();
      slot.classList.remove('res-gain-pulse');
    }, 900);
  }

  function regenResources(u) {
    if (!u.alive) return;
    const p = u.res.primary;
    if (p.type !== 'runes' && p.regen) {
      p.current = clamp(p.current + p.regen, 0, p.max);
    }
    if (u.res.runes) {
      const left = [];
      for (const cd of u.res.runes.cd) {
        cd.turns--;
        if (cd.turns <= 0) u.res.runes[cd.type][cd.idx] = true;
        else left.push(cd);
      }
      u.res.runes.cd = left;
      u.res.primary.current = readyRunes(u);
    }
    // small passive RP for DK
    if (u.res.secondary?.type === 'runic_power') {
      u.res.secondary.current = clamp(u.res.secondary.current + 5, 0, u.res.secondary.max);
    }
  }

  function costLabel(u, ab) {
    const bits = [];
    if (ab.costRunes) {
      if (ab.costRunes.any) bits.push(ab.costRunes.any + ' рун(ы)');
      else {
        if (ab.costRunes.b) bits.push(ab.costRunes.b + ' крови');
        if (ab.costRunes.f) bits.push(ab.costRunes.f + ' льда');
        if (ab.costRunes.u) bits.push(ab.costRunes.u + ' нечестивости');
      }
    } else if (ab.cost > 0) bits.push(ab.cost + ' ' + (u.res.primary.icon || '') + ' ' + u.res.primary.name);
    if (ab.costSec > 0 && u.res.secondary) {
      bits.push(ab.costSec + ' ' + u.res.secondary.icon + ' ' + u.res.secondary.name);
    }
    if (ab.gen) bits.push('+' + ab.gen + ' ' + u.res.primary.name);
    if (ab.genSec && u.res.secondary) bits.push('+' + ab.genSec + ' ' + u.res.secondary.name);
    if (ab.genRunic) bits.push('+' + ab.genRunic + ' силы рун');
    if (ab.cd) bits.push('КД ' + ab.cd);
    if (!bits.length) bits.push('бесплатно');
    return bits.join(' · ');
  }

  // ── Lobby UI ──

/* --- fight loop --- */
  function startCombat(type) {
    applyRoomBackground(currentRouteNode());
    applyTalentStats();
    resetKeyPowersForCombat();
    const enemies = spawnPack(type);
    for (const p of run.party) {
      if (p.hp <= 0) { p.alive = false; p.hp = 0; } else p.alive = true;
      p.shield = 0;
      p.buffs = [];
      p.abilities.forEach(a => { a.curCd = 0; });
      // Between pulls (M+ feel): no full restore. Energy/focus partially regen; mana barely; rage carries over.
      if (p.res.primary.type === 'energy' || p.res.primary.type === 'focus') {
        p.res.primary.current = clamp(
          Math.max(p.res.primary.current, Math.round(p.res.primary.max * 0.55)),
          0, p.res.primary.max
        );
      } else if (p.res.primary.type === 'mana') {
        // tiny mana sip — healers must manage
        p.res.primary.current = clamp(p.res.primary.current + Math.round(p.res.primary.max * 0.06), 0, p.res.primary.max);
      } else if (p.res.primary.type === 'rage') {
        p.res.primary.current = clamp(Math.max(p.res.primary.current, 15), 0, p.res.primary.max);
      } else if (p.res.runes) {
        // Каждый бой — полный комплект 6/6 (раньше random гасил 1–3 руны со старта)
        p.res.runes.blood = [true, true];
        p.res.runes.frost = [true, true];
        p.res.runes.unholy = [true, true];
        p.res.runes.cd = [];
        p.res.primary.current = 6;
      }
      // secondary (combo/chi/…) decays — not free refill
      if (p.res.secondary && p.res.secondary.type !== 'runic_power') {
        if (p.res.secondary.type === 'soul_shards') {
          p.res.secondary.current = Math.max(1, Math.min(p.res.secondary.current, 2));
        } else if (p.res.secondary.type === 'holy_power') {
          // Все спеки паладина: каждый бой с 3 ед. Энергии Света
          p.res.secondary.current = Math.min(3, p.res.secondary.max || 5);
        } else {
          p.res.secondary.current = Math.max(0, Math.floor(p.res.secondary.current * 0.5));
        }
      }
    }
    const te = talentEffects();
    if (te.bloodlust) {
      for (const a of run.party.filter(x => x.alive)) {
        a.buffs.push({ id: 'lust', name: 'Кровожадность', icon: '🐺', turns: 2, atkMod: te.bloodlust });
      }
    }
    if (run.restBuffBattles > 0) {
      for (const a of run.party.filter(x => x.alive)) {
        a.buffs.push({ id: 'rb', name: 'Настрой', icon: '🔥', turns: 99, atkMod: 0.15 });
      }
      run.restBuffBattles--;
    }
    combat = { type, enemies, pets: [], turnQueue: [], turnIndex: 0, round: 1, over: false, waitingPlayer: false, thunderTimer: 0 };
    spawnClassPets();
    buildTurnQueue();
    log('Бой: ' + ROOM_META[type].name, 'system');
    renderCombat();
    processTurn();
  }
  function allUnits() {
    if (!combat) return [...(run?.party || [])];
    return [...run.party, ...(combat.pets || []), ...combat.enemies];
  }
  function living(side) {
    if (side === 'ally') {
      return [...run.party, ...((combat?.pets) || [])].filter(u => u.side === 'ally' && u.alive && u.hp > 0);
    }
    return (combat?.enemies || []).filter(u => u.alive && u.hp > 0);
  }
  function livingHeroes() {
    return run.party.filter(u => u.alive && u.hp > 0);
  }
  function getEff(u) {
    let atk = u.atk, def = u.def, speed = u.speed;
    for (const b of (u.buffs || [])) {
      if (!b) continue;
      if (b.atkMod) atk *= (1 + b.atkMod);
      if (b.defMod) def *= (1 + b.defMod);
    }
    if (u.enraged) atk *= 1.5;
    return { atk: Math.round(atk), def: Math.round(def), speed };
  }
  function buildTurnQueue() {
    const units = allUnits().filter(u => u.alive && u.hp > 0);
    units.sort((a, b) => getEff(b).speed - getEff(a).speed);
    combat.turnQueue = units.map(u => u.uid);
    combat.turnIndex = 0;
  }
  function currentActor() {
    const id = combat?.turnQueue[combat.turnIndex];
    return allUnits().find(u => u.uid === id) || null;
  }

  function scheduleProcessTurn(delay) {
    clearTimeout(aiTimer);
    aiTimer = setTimeout(() => {
      try {
        if (!paused) processTurn();
      } catch (err) {
        console.error('[processTurn]', err);
        // Не зависаем: пропускаем текущего и идём дальше
        if (combat && !combat.over) {
          combat.waitingPlayer = false;
          combat._keepPlayerTurn = false;
          combat.turnIndex = (combat.turnIndex || 0) + 1;
          scheduleProcessTurn(80);
        }
      }
    }, Math.max(0, delay == null ? 60 : delay));
  }

  function processTurn() {
    if (!combat || combat.over || run.finished) return;
    // Сохраняем текущего актора, фильтруем мёртвых, чиним индекс (иначе endRound/скип → «зависание»)
    const prevId = combat.turnQueue[combat.turnIndex];
    combat.turnQueue = combat.turnQueue.filter(id => {
      const u = allUnits().find(x => x.uid === id);
      return u && u.alive && u.hp > 0;
    });
    if (!combat.turnQueue.length) buildTurnQueue();
    else if (prevId) {
      const ni = combat.turnQueue.indexOf(prevId);
      // если текущий умер — остаёмся на том же индексе (следующий после выпавшего)
      combat.turnIndex = ni >= 0 ? ni : Math.min(combat.turnIndex, combat.turnQueue.length);
    }
    if (combat.turnIndex >= combat.turnQueue.length) { endRound(); return; }
    const actor = currentActor();
    if (!actor?.alive) {
      combat.turnIndex++;
      scheduleProcessTurn(0);
      return;
    }
    if (isStunned(actor)) {
      log((actor.fullName || actor.name) + ' оглушён — ход пропущен', 'system');
      combat.turnIndex++;
      scheduleProcessTurn(Math.max(80, Math.round(200 / gameSpeed)));
      return;
    }
    actor.abilities.forEach(a => {
      if (a.curCd > 0) {
        a.curCd--;
        if (a.curCd <= 0 && a.maxCharges) a.charges = a.maxCharges;
      }
    });
    regenResources(actor);
    const resP = actor.res && actor.res.primary;
    document.getElementById('phase-sub').textContent =
      `Раунд ${combat.round} · ${actor.icon || ''} ${actor.fullName || actor.name}` +
      (resP ? ` · ${resP.icon || ''} ${resP.current}/${resP.max}` : '') +
      (actor.res && actor.res.secondary ? ` · ${actor.res.secondary.icon || ''}${actor.res.secondary.current}` : '');
    showTurnBanner((actor.side === 'ally' ? '▶ ' : '◀ ') + (actor.fullName || actor.name));
    renderCombat();
    updateBossFrame();
    updateVignette();
    if (paused) return;
    // Player only controls heroes; pets auto-act
    if (actor.side === 'ally' && !actor.isPet) {
      combat.waitingPlayer = true;
      combat._keepPlayerTurn = false;
      actor._debugUsedThisTurn = false;
      showAbilities(actor);
    } else {
      combat.waitingPlayer = false;
      combat._keepPlayerTurn = false;
      document.getElementById('ability-bar').innerHTML = '';
      try { hidePassivePocket(); } catch (_) {}
      document.getElementById('combat-actions').innerHTML =
        `<span style="color:var(--muted)">${actor.isPet ? 'Ход питомца…' : 'Ход врага…'}</span>`;
      clearTimeout(aiTimer);
      aiTimer = setTimeout(() => {
        try {
          if (paused || !combat || combat.over) return;
          aiAct(actor);
          afterAction();
        } catch (err) {
          console.error('[aiAct]', err);
          if (combat) combat._keepPlayerTurn = false;
          afterAction();
        }
      }, aiDelay());
    }
  }

  function endRound() {
    // Guard: exactly one periodic pass per combat round (not per hero turn)
    if (!combat || combat._roundTicking) return;
    combat._roundTicking = true;
    combat.round++;
    combat.turnIndex = 0;
    // Демонология: пассивный бес каждые 5 раундов
    if (run?.party && combat.round > 0 && combat.round % 5 === 0) {
      for (const p of run.party.filter(h => h.alive && h.classId === 'warlock' && h.specId === 'demonology')) {
        const n = (combat.pets || []).filter(x => x.alive && x.ownerUid === p.uid && x.petKey === 'imp').length;
        if (n < 4) {
          addPet(p, 'imp', 5);
          log(`${p.name}: пассивный бес`, 'player');
        }
      }
    }
    // Изобретатель: «Ходячая жестянка» — основной питомец +1 деталь каждые 2 раунда
    if (run?.party && combat.round > 0 && combat.round % 2 === 0) {
      for (const p of run.party.filter(h => h.alive && h.classId === 'engineer' && h.specId === 'tinkerer')) {
        let pet = null;
        try { pet = getMainPet(p, false); } catch (_) { pet = null; }
        if (!pet || !pet.alive) continue;
        const sec = p.res && p.res.secondary;
        if (!sec || sec.type !== 'parts') continue;
        const before = Number(sec.current) || 0;
        const max = Number(sec.max) || 5;
        if (before >= max) continue;
        sec.current = Math.min(max, before + 1);
        log(`${pet.name}: нашёл деталь на помойке (+1 · ${sec.current}/${max})`, 'player');
        try { floatText(p.uid, '+1 деталь', 'buff'); } catch (_) {}
      }
    }
    // Passive tank agro pulse — keeps mobs glued to tank without constant taunt
    const tankPulse = run?.party?.find(p => p.role === 'tank' && p.alive);
    if (tankPulse && combat) {
      for (const e of living('enemy')) {
        addThreat(e, tankPulse, e.isBoss ? 350 : (e.isElite ? 220 : 150));
      }
    }
    for (const u of allUnits()) {
      if (!u.alive) continue;
      // Snapshot list so we tick each buff at most once this round
      const periodic = (u.buffs || []).filter(b => b && (Number(b.dot) > 0 || Number(b.hot) > 0));
      // DoT ticks — 1× per combat round per buff
      for (const d of periodic.filter(b => Number(b.dot) > 0)) {
        if (!u.alive) break;
        if (d._tickedRound === combat.round) continue;
        d._tickedRound = combat.round;
        const tickAmt = Number(d.dot);
        if (!Number.isFinite(tickAmt) || tickAmt <= 0) continue;
        const dotSrc = d.fromUid
          ? (run?.party?.find(p => p.uid === d.fromUid)
            || (combat?.pets || []).find(p => p.uid === d.fromUid)
            || combat?.enemies?.find(e => e.uid === d.fromUid)
            || null)
          : null;
        const dealtDot = dealTrue(u, tickAmt, dotSrc, 'dot', {
          school: d.school || 'physical',
          abilityName: d.name || 'Периодический урон',
          isDot: true,
        });
        const left = Math.max(0, (Number(d.turns) || 1) - 1);
        log(`${u.name}: ${d.name} −${fmt(dealtDot || tickAmt)} · ${left}р`, u.side === 'ally' ? 'enemy' : 'player');
      }
      // HoT ticks — 1× per combat round per buff
      for (const h of periodic.filter(b => Number(b.hot) > 0)) {
        if (!u.alive) break;
        if (h._tickedRound === combat.round) continue;
        h._tickedRound = combat.round;
        const tickAmt = Number(h.hot);
        if (!Number.isFinite(tickAmt) || tickAmt <= 0) continue;
        const healer = h.fromUid
          ? (run?.party?.find(p => p.uid === h.fromUid) || allUnits().find(x => x.uid === h.fromUid))
          : null;
        const before = u.hp;
        const healed = healUnit(u, tickAmt, healer || undefined, {
          noEcho: true,
          abilityName: h.name || 'Периодическое лечение',
          isHot: true,
        });
        const left = Math.max(0, (Number(h.turns) || 1) - 1);
        if (healed > 0) log(`${u.name}: ${h.name} +${fmt(healed)} · ${left}р`, 'heal');
        else if (before >= u.maxHp) log(`${u.name}: ${h.name} (оверхил) · ${left}р`, 'heal');
      }
      // Brewmaster stagger ticks (~25% of pool per round)
      if (u.stagger > 0 && u.side === 'ally') {
        const tick = Math.max(1, Math.round(u.stagger * 0.25));
        u.stagger = Math.max(0, u.stagger - tick);
        dealTrue(u, tick, null, 'dmg', { abilityName: 'Пошатывание', isDot: true });
        log(`${u.name}: Пошатывание −${fmt(tick)} (остаток ${fmt(u.stagger)})`, 'enemy');
      }
      // Expire statuses once per combat round (after the single tick)
      const next = [];
      for (const b of (u.buffs || [])) {
        const left = (Number(b.turns) || 1) - 1;
        if (left <= 0) {
          if (b.tempHp) {
            u.maxHp = Math.max(1, u.maxHp - b.tempHp);
            u.hp = clamp(u.hp, 1, u.maxHp);
          }
          continue;
        }
        const copy = { ...b, turns: left };
        delete copy._tickedRound;
        next.push(copy);
      }
      u.buffs = next;
      if (u.side === 'enemy' && hasEffect('enrage_low') && u.hp / u.maxHp <= 0.3 && !u.enraged) {
        u.enraged = true;
        applyStatus(u, { id: 'enrage', name: 'Ярость', icon: '😡', turns: 99, atkMod: 0.35, dispellable: true, school: 'enrage' });
        log(u.name + ' впадает в ярость! (снимите Развеиванием)', 'enemy');
      }
    }
    // Temporary pet duration
    if (combat.pets) {
      for (const p of combat.pets) {
        if (!p.alive || p.petTurnsLeft == null) continue;
        p.petTurnsLeft--;
        if (p.petTurnsLeft <= 0) {
          p.alive = false; p.hp = 0;
          log(`${p.name} исчезает`, 'system');
        }
      }
      // оставляем мёртвых основных питомцев (для «Воскрешение питомца»)
      combat.pets = combat.pets.filter(p => p.alive || p.isMainPet || p.petTurnsLeft == null);
    }
    // Bursting stacks tick
    tickBurstStacks();
    // Thunder marks: mark 2 heroes, discharge or take extra on next storm
    if (hasEffect('thunder')) {
      combat.thunderTimer = (combat.thunderTimer || 0) + 1;
      if (combat.thunderTimer % 3 === 0) {
        const heroes = livingHeroes();
        const marked = heroes.filter(h => h.thunderMark);
        const dmg = Math.round((8 + run.keyLevel * 1.5) * STAT_SCALE);
        if (marked.length >= 2) {
          marked.forEach(h => {
            dealDmg(h, Math.round(dmg * 1.6), null, { abilityName: 'Гроза (метки)' });
            h.thunderMark = false;
          });
          log('Гроза: оба с меткой получают усиленный удар!', 'enemy');
          toast('⚡ Метки грозы!');
        } else {
          heroes.forEach(a => dealDmg(a, dmg, null, { abilityName: 'Гроза' }));
          log('Гроза −' + fmt(dmg), 'enemy');
        }
        // re-mark 2 random
        heroes.forEach(h => { h.thunderMark = false; });
        const shuf = heroes.slice().sort(() => Math.random() - 0.5).slice(0, Math.min(2, heroes.length));
        shuf.forEach(h => { h.thunderMark = true; });
        if (shuf.length) log('Метки грозы: ' + shuf.map(h => h.name).join(', ') + ' (ход: «Разряд»)', 'system');
      }
    }
    combat.bolsterKills = 0; // reset multi-kill window each round

    // ── Weekly affix end-of-round effects ──
    if (hasEffect('grievous')) {
      const gPct = affixValue('grievous', 0.04);
      for (const h of livingHeroes()) {
        if (h.hp / h.maxHp < 0.9 && h.hp / h.maxHp > 0) {
          const d = Math.max(1, Math.round(h.maxHp * gPct));
          dealTrue(h, d, null);
          log(`${h.name}: Тяжёлая рана −${fmt(d)}`, 'enemy');
        }
      }
    }
    if (hasEffect('quake') && combat.round % 3 === 0) {
      const q = affixValue('quake', 0.08);
      for (const h of livingHeroes()) {
        const d = Math.round(h.maxHp * q);
        dealTrue(h, d, null);
      }
      log('Сотрясение! Весь отряд получает урон', 'enemy');
      toast('Сотрясение');
    }
    if (hasEffect('incorporeal') && combat.round % 4 === 0 && Math.random() < 0.7) {
      const g = scaleEnemy({ id: 'inc', name: 'Бесплотный', icon: '👻', role: 'dps', hp: 55, atk: 12 + run.keyLevel, def: 1, speed: 13, mana: 20,
        abilities: [
          { id: 'h', name: 'Касание', cost: 0, cd: 0, type: 'damage', power: 1.05 },
          { id: 'cast', name: 'Вопль', cost: 10, cd: 2, type: 'cast_aoe', power: 0.7, castKind: 'kick', castPrio: 3 },
        ] }, run.keyLevel, false, false);
      g.buffs.push({ id: 'incorp', name: 'Бесплотность', icon: '💨', turns: 99, atkMod: 0.1, dispellable: true, school: 'magic' });
      combat.enemies.push(g);
      log('Бесплотный: появился дух (снимите бафф / стан)', 'system');
      toast('Бесплотный!');
    }
    if (hasEffect('afflicted') && combat.round % 5 === 0) {
      const t = pick(livingHeroes());
      if (t) {
        applyStatus(t, { id: 'afflicted', name: 'Страдание', icon: '🤢', turns: 3, dispellable: true, school: 'magic',
          hot: 0, // marker
        });
        // DoT via custom
        t.buffs[t.buffs.length - 1].dot = Math.round(t.maxHp * 0.05);
        log(`${t.name} страдает — очистите!`, 'enemy');
        toast('Страждущий: ' + t.name);
      }
    }
    if (typeof tickBurstStacks === 'function') tickBurstStacks();

    combat._roundTicking = false;
    if (checkEnd()) return;
    buildTurnQueue();
    renderCombat();
    // async — иначе processTurn↔endRound уходит в глубокую рекурсию и «зависает» вкладка
    scheduleProcessTurn(0);
  }

  /** Снять подсветку рун (после отвода мыши / каста). */
  function clearRuneHighlight() {
    document.querySelectorAll('.rune.hl').forEach(el => el.classList.remove('hl'));
  }

  /**
   * Подсветить руны, которые тратит скилл.
   * onlyReady=true (hover): только готовые; onlyReady=false (каст): любые слоты типа.
   * costRunes: { b, f, u, any }
   */
  function highlightAbilityRunes(actor, costRunes, onlyReady) {
    clearRuneHighlight();
    if (!actor || !costRunes || !actor.res?.runes) return;
    const unit = document.querySelector(`.unit[data-uid="${actor.uid}"]`);
    if (!unit) return;
    const row = unit.querySelector('.runes-row, .slot-runes');
    if (!row) return;
    const all = [...row.querySelectorAll('.rune')];
    const group = {
      b: all.filter(el => el.classList.contains('b')),
      f: all.filter(el => el.classList.contains('f')),
      u: all.filter(el => el.classList.contains('u')),
    };
    const needReady = onlyReady !== false;
    const mark = (els, n) => {
      let left = Math.max(0, Number(n) || 0);
      for (const el of els) {
        if (left <= 0) break;
        const isReady = el.dataset.ready === '1' || el.classList.contains('ready');
        if (needReady && !isReady) continue;
        el.classList.add('hl');
        left--;
      }
    };
    if (costRunes.any) {
      mark([...group.b, ...group.f, ...group.u], costRunes.any);
    } else {
      if (costRunes.b) mark(group.b, costRunes.b);
      if (costRunes.f) mark(group.f, costRunes.f);
      if (costRunes.u) mark(group.u, costRunes.u);
    }
  }

  /** Каст с рунами: кратко подсветить, потом выполнить действие. */
  function castWithRuneFlash(actor, ability, target) {
    if (ability && ability.costRunes && actor && actor.res && actor.res.runes) {
      highlightAbilityRunes(actor, ability.costRunes, true);
      setTimeout(() => {
        try { clearRuneHighlight(); } catch (_) {}
        castAbility(actor, ability, target);
        afterAction();
      }, 150);
      return;
    }
    castAbility(actor, ability, target);
    afterAction();
  }

  function showAbilities(actor) {
    const bar = document.getElementById('ability-bar');
    const actions = document.getElementById('combat-actions');
    const scrollY = bar ? bar.scrollTop : 0;
    try { hideAbilityTipFloat(); } catch (_) {}
    try { clearRuneHighlight(); } catch (_) {}
    if (bar) bar.innerHTML = '';
    if (actions) actions.innerHTML = '';
    try { renderPassiveTray(actor); } catch (e) { console.error(e); }
    if (!bar) return;
    actor.abilities.forEach((ab, idx) => {
      const btn = document.createElement('button');
      const can = canPay(actor, ab);
      const hasWideSweep = !!(actor.buffs || []).some(b => b && b.id === 'wide_sweep' && (Number(b.stacks) || 0) > 0);
      btn.className = 'ability' + ((ab.id === 'elusive' && (actor.purifyCleared || 0) > 0) ? ' elusive-charged' : '')
        + ((ab.id === 'heroic' && hasWideSweep) ? ' wide-sweep-charged' : '')
        + ((ab.id === 'debug_mode') ? ' debug-mode-ab' : '');
      btn.disabled = !can;
      const needTarget = abilityNeedsClickTarget(ab);
      const rule = abilityTargetRule(ab);
      const keyHint = idx < 9 ? (idx + 1) : (idx === 9 ? 0 : '');
      const est = estimateAbility(actor, ab);
      const cost = costLabel(actor, ab);
      const tags = abilityMetaLine(ab);
      const detail = abilityDescribe(ab, actor);
      // Справа: только база — ресурс, КД, урон/хил/DoT, служебные метки
      const yellowParts = [];
      const seen = new Set();
      const pushY = (s) => {
        s = (s && String(s).trim()) || '';
        if (!s) return;
        const key = s.toLowerCase();
        if (seen.has(key)) return;
        for (const p of yellowParts) {
          if (p.toLowerCase().includes(key) || key.includes(p.toLowerCase())) return;
        }
        seen.add(key);
        yellowParts.push(s);
      };
      pushY(cost);
      const baseCd = Number(ab.baseCd != null ? ab.baseCd : ab.cd) || 0;
      if (baseCd > 0) pushY('КД ' + baseCd);
      if (ab.curCd > 0) pushY('ещё ' + ab.curCd);
      pushY(est);
      if (tags) tags.split(' · ').forEach(pushY);
      const yellow = yellowParts.join(' · ');
      const cdHtml = ab.curCd > 0 ? `<div class="cd-overlay">${ab.curCd}</div>` : '';
      if (!ab.school) stampAbilitySchool(ab, actor.classId, actor.specId);
      const schoolNote = abilitySchoolNote(ab, actor);
      const schoolCss = abilitySchoolCss(ab, actor);
      // Иконка слева + описание при наведении; справа — имя, база, тип
      let icoInner;
      if (ab.id === 'debug_mode') {
        const pet = getMainPet(actor, true);
        const mode = (pet && pet.attackMode === 'aoe') ? 'АОЕ' : 'СТ';
        icoInner = mode;
      } else {
        icoInner = ab.icon || '✨';
      }
      const tipAttrName = String(ab.name || '').replace(/"/g, '&quot;');
      const tipAttrDetail = String(detail || '').replace(/"/g, '&quot;');
      btn.innerHTML =
        (keyHint !== '' ? `<span class="hk">${keyHint}</span>` : '') +
        `<span class="a-ico${ab.id === 'debug_mode' ? ' a-ico-mode' : ''}" data-tip-name="${tipAttrName}" data-tip-detail="${tipAttrDetail}" tabindex="-1">${icoInner}</span>` +
        `<span class="a-body">` +
          `<span class="a-name">${ab.name || ''}</span>` +
          (yellow ? `<span class="a-cost">${yellow}</span>` : '') +
        `</span>` +
        `<span class="a-school ${schoolCss}">${schoolNote || 'Тип: —'}</span>` +
        cdHtml;
      const icoEl = btn.querySelector('.a-ico');
      if (icoEl) {
        const show = (e) => {
          e.stopPropagation();
          showAbilityTipFloat(icoEl, ab.name || '', detail);
        };
        const hide = () => hideAbilityTipFloat();
        icoEl.addEventListener('mouseenter', show);
        icoEl.addEventListener('mouseleave', hide);
        icoEl.addEventListener('focus', show);
        icoEl.addEventListener('blur', hide);
      }
      // ДК: подсветка нужных рун при наведении / фокусе на скилле
      if (ab.costRunes && actor.res?.runes) {
        const hlOn = () => highlightAbilityRunes(actor, ab.costRunes);
        const hlOff = () => {
          // не гасить, если этот скилл выбран для цели
          if (pendingTarget && pendingTarget.ability === ab) {
            highlightAbilityRunes(actor, ab.costRunes);
            return;
          }
          clearRuneHighlight();
        };
        btn.addEventListener('mouseenter', hlOn);
        btn.addEventListener('mouseleave', hlOff);
        btn.addEventListener('focus', hlOn);
        btn.addEventListener('blur', hlOff);
      }
      btn.addEventListener('click', () => {
        hideAbilityTipFloat();
        sfx('click');
        if (!canPay(actor, ab)) return;
        if (needTarget) {
          // Always pick target manually (heals, DoTs, damage, purge, kick…)
          pendingTarget = { actor, ability: ab };
          if (ab.costRunes) highlightAbilityRunes(actor, ab.costRunes, true);
          else clearRuneHighlight();
          const r = abilityTargetRule(ab);
          if (EXECUTE_IDS.has(ab.id)) {
            toast(ab.name + ': цель с ≤35% HP (подсвечены)');
          } else {
            toast(r === 'ally_any' ? 'Цель: союзник (клик по фрейму)'
              : r === 'ally_or_enemy' ? 'Цель: союзник или враг'
              : 'Цель: враг (клик по фрейму)');
          }
          updateUnitSelectionOnly();
        } else {
          // self_only / aoe / buff / cleanse / heal_aoe — без клика
          castWithRuneFlash(actor, ab, rule === 'self_only' ? actor : null);
        }
      });
      bar.appendChild(btn);
    });
    bar.scrollTop = scrollY;
    // если уже выбран скилл с рунами (после re-render) — вернуть подсветку
    if (pendingTarget && pendingTarget.actor?.uid === actor.uid && pendingTarget.ability?.costRunes) {
      highlightAbilityRunes(actor, pendingTarget.ability.costRunes);
    }
    // ── Reaction actions (Telegraph / Affix agency) ──
    const activeCast = living('enemy').find(e => e.casting);
    if (activeCast?.casting?.avoidable === 'dodge') {
      const dodge = document.createElement('button');
      dodge.className = 'btn btn-sm react-btn';
      dodge.textContent = '💨 Уклонение';
      dodge.title = '−80% от следующего AoE/каста (этот герой)';
      dodge.onclick = () => {
        actor.dodging = 1;
        log(actor.name + ' готовится уклониться', 'player');
        toast('Уклонение!');
        afterAction();
      };
      actions.appendChild(dodge);
    }
    if (activeCast?.casting && !combat.softSave) {
      const soft = document.createElement('button');
      soft.className = 'btn btn-sm react-btn';
      soft.textContent = '🛡 Софт-сейв отряда';
      soft.title = '−30% урона следующего каста (1× за бой)';
      soft.onclick = () => {
        combat.softSave = true;
        log('Отряд: софт-сейв (−30% к касту)', 'heal');
        toast('🛡 Софт-сейв');
        // free reaction — no afterAction consume? consume turn to keep balance
        afterAction();
      };
      actions.appendChild(soft);
    }
    if (actor.thunderMark && hasEffect('thunder')) {
      const disc = document.createElement('button');
      disc.className = 'btn btn-sm react-btn';
      disc.textContent = '⚡ Разряд метки';
      disc.onclick = () => {
        actor.thunderMark = false;
        log(actor.name + ' сбрасывает метку грозы', 'player');
        toast('Метка снята');
        afterAction();
      };
      actions.appendChild(disc);
    }
    if (run.trinketReady && run.trinketAtk) {
      const tr = document.createElement('button');
      tr.className = 'btn btn-sm react-btn';
      tr.textContent = '🔥 Тринкет';
      tr.onclick = () => {
        applyStatus(actor, { id: 'trinket', name: 'Тринкет', icon: '🔥', turns: 1, atkMod: run.trinketAtk });
        run.trinketReady = false;
        log(actor.name + ' активирует амулет (+атака)', 'player');
        toast('Тринкет!');
        renderPowers();
        afterAction();
      };
      actions.appendChild(tr);
    }

    // Key powers (play-style loot)
    const kp = run.keyPowers || {};
    const addKpBtn = (id, label, cls) => {
      const st = kp[id];
      if (!st) return;
      if (st.charges != null && st.charges <= 0) return;
      if (st.usedThisCombat && id !== 'battle_rez' && id !== 'skip_trash') return;
      const b = document.createElement('button');
      b.className = 'btn btn-sm react-btn' + (cls ? ' ' + cls : '');
      b.textContent = label + (st.charges != null ? ` ×${st.charges}` : '');
      b.onclick = () => {
        if (useKeyPower(id, actor)) {
          renderPowers();
          if (id !== 'skip_trash') afterAction();
        }
      };
      actions.appendChild(b);
    };
    addKpBtn('lust', '🥁 Lust');
    addKpBtn('party_shield', '🛡 Щит отряда');
    addKpBtn('hunter_mark', '🏹 Метка');
    addKpBtn('battle_rez', '💎 Rez');
    addKpBtn('skip_trash', '🗺 Обход');

    // Highlight: free kick reaction if enemy casting kickable
    if (activeCast?.casting && (activeCast.casting.kind === 'kick' || activeCast.casting.interruptible !== false)) {
      const kickAb = actor.abilities.find(a =>
        (a.type === 'interrupt' || INTERRUPT_IDS.has(a.id)) && canPay(actor, a));
      if (kickAb) {
        const kb = document.createElement('button');
        kb.className = 'btn btn-sm react-btn kick-now';
        kb.textContent = `⚡ Кик: ${activeCast.name}`;
        kb.onclick = () => {
          castAbility(actor, kickAb, activeCast);
          afterAction();
        };
        actions.prepend(kb);
      }
    }

    const auto = document.createElement('button');
    auto.className = 'btn btn-sm btn-ok';
    auto.textContent = 'Автоход (A)';
    auto.onclick = () => {
      if (actor.role === 'dps' || actor.role === 'healer') {
        toast('ДД/хил: выбери способность и цель сам');
        return;
      }
      aiAct(actor); afterAction();
    };
    actions.appendChild(auto);
    const skip = document.createElement('button');
    skip.className = 'btn btn-sm';
    skip.textContent = 'Пропуск (Пробел)';
    skip.onclick = () => {
      if (actor.res.primary.type !== 'runes') {
        actor.res.primary.current = clamp(actor.res.primary.current + Math.max(5, actor.res.primary.regen || 5), 0, actor.res.primary.max);
      }
      log(actor.name + ' пропускает', 'player');
      afterAction();
    };
    actions.appendChild(skip);
  }

  function onUnitClick(unit) {
    if (!pendingTarget || !combat?.waitingPlayer) return;
    if (!unit?.alive) return toast('Мёртв');
    const { actor, ability } = pendingTarget;
    const rule = abilityTargetRule(ability);
    const isKick = ability.type === 'interrupt' || INTERRUPT_IDS.has(ability.id);
    if (rule === 'self_only') {
      pendingTarget = null;
      castWithRuneFlash(actor, ability, actor);
      return;
    }
    if (rule === 'ally_any') {
      if (unit.side !== 'ally' || unit.isPet) return toast('Нужен союзник');
    } else if (rule === 'enemy') {
      if (unit.side !== 'enemy') return toast('Нужен враг');
    } else if (rule === 'ally_or_enemy') {
      if (unit.isPet) return toast('Не питомец');
      if (unit.side !== 'ally' && unit.side !== 'enemy') return toast('Нужна цель');
    } else {
      return toast('Эта способность без цели');
    }
    if (isKick && !unit.casting) return toast('Цель не кастует');
    if (EXECUTE_IDS.has(ability.id) && unit.hp / unit.maxHp > 0.35) return toast('Казнь только при ≤35% здоровья');
    pendingTarget = null;
    castWithRuneFlash(actor, ability, unit);
  }

  function castAbility(actor, ability, target) {
    if (!actor.alive || !canPay(actor, ability, target)) return;
    if (isStunned(actor)) {
      log(actor.name + ' оглушён и пропускает действие', 'system');
      return;
    }
    if (isSilenced(actor) && (ability.type === 'cast_aoe' || ability.type === 'heal' || ability.type === 'heal_aoe' || ability.type === 'dot')) {
      // silence blocks new casts / spells for enemies mainly; allies still cast melee
      if (actor.side === 'enemy') {
        log(actor.name + ' в немоте — каст невозможен', 'system');
        return;
      }
    }
    // resolve execute target auto
    if (EXECUTE_IDS.has(ability.id) && !target) {
      target = living(actor.side === 'ally' ? 'enemy' : 'ally').find(e => e.hp / e.maxHp <= 0.35);
      if (!target) return;
    }
    // Enforce targeting rules (tank defs self-only, etc.)
    const rule = abilityTargetRule(ability);
    if (rule === 'self_only') target = actor;
    else if (rule === 'ally_or_enemy') {
      // keep player-chosen target (ally or enemy); no auto-rewrite
      if (!target || !target.alive || target.isPet) {
        target = lowest(living(actor.side === 'ally' ? 'ally' : 'enemy').filter(u => !u.isPet)) || actor;
      }
    } else if (rule === 'ally_any') {
      target = resolveAbilityTarget(actor, ability, target);
      if (!target || target.side !== actor.side || target.isPet) target = actor;
    } else if (rule === 'enemy') {
      // цель до payAbility — иначе при fail ресурс уже списан / freeAction ломается
      const foesPre = actor.side === 'ally' ? living('enemy') : living('ally');
      target = target || lowest(foesPre);
      if (!target) {
        log(ability.name + ': нет цели', 'system');
        return;
      }
      if (EXECUTE_IDS.has(ability.id) && target.hp / target.maxHp > 0.35) {
        log(ability.name + ' только при ≤35% здоровья', 'system');
        return;
      }
    }
    // Guards before spend
    if (ability.id === 'debug_mode' && actor._debugUsedThisTurn) {
      log(ability.name + ': уже использовано на этом ходу', 'system');
      return;
    }
    if (ability.id === 'pet_rez') {
      const alivePet = getMainPet(actor, false);
      if (alivePet) {
        log(ability.name + ': питомец уже жив', 'system');
        return;
      }
      if (!mainPetKeyFor(actor.classId, actor.specId)) {
        log(ability.name + ': нет основного питомца', 'system');
        return;
      }
    }
    if (ability.id === 'wrench_heal') {
      const pet = getMainPet(actor, false);
      if (!pet) {
        log(ability.name + ': нужен живой основной питомец', 'system');
        return;
      }
    }

    payAbility(actor, ability);
    // Fury mastery stacks: after paying cost (cost>0 = rage spender)
    try { applyFuryMasteryStacks(actor, ability); } catch (e) { console.error(e); }
    if (ability.maxCharges) {
      if (ability.charges == null) ability.charges = ability.maxCharges;
      ability.charges = Math.max(0, ability.charges - 1);
      if (ability.charges <= 0 && ability.cd) ability.curCd = ability.cd;
    } else if (ability.cd) {
      ability.curCd = ability.cd;
    }

    const te = talentEffects();
    if (!actor.buffs) actor.buffs = [];
    const eff = getEff(actor);
    const friends = actor.side === 'ally' ? living('ally') : living('enemy');
    const foes = actor.side === 'ally' ? living('enemy') : living('ally');
    // Guard against missing/NaN power (would make DoT ticks falsy and never fire)
    let power = Number(ability.power);
    if (!Number.isFinite(power) || power <= 0) power = 1;
    const cls = actor.side === 'ally' ? 'player' : 'enemy';
    const lootHeal = (run.loot || []).reduce((s, i) => s + (i.healMult || 0), 0);
    const lootAtk = (run.loot || []).reduce((s, i) => s + (i.atkMult || 0), 0);
    if (lootAtk && actor.side === 'ally') power *= (1 + lootAtk);

    // finisher scaling
    // Combo finishers scale with spent points; fixed costSec (HP/chi/shards) keep base power
    if (FINISHER_IDS.has(ability.id) && actor._spentSec > 0 && actor.res?.secondary?.type === 'combo') {
      power *= (0.65 + actor._spentSec * 0.18);
    }

    let fxTargets = [];
    // Normalize type; force known DoT ids even if type was lost
    const abType = DOT_ABILITY_IDS.has(ability.id)
      ? 'dot'
      : String(ability.type || '').toLowerCase();

    switch (abType) {
      case 'damage': {
        target = target || lowest(foes);
        if (!target) break;
        if (EXECUTE_IDS.has(ability.id) && target.hp / target.maxHp > 0.35) {
          log(ability.name + ' только при ≤35% здоровья цели', 'system');
          break;
        }
        fxTargets = [target];
        playSkillAnim(actor, ability, fxTargets);
        const school = abilityDamageSchool(actor, ability);
        const dmgCtx = {
          type: 'damage', abilityId: ability.id, abilityName: ability.name, school,
          isFinisher: FINISHER_IDS.has(ability.id),
        };
        const hits = Math.max(1, Number(ability.hits) || 1);
        let totalDealt = 0;
        for (let hi = 0; hi < hits; hi++) {
          if (!target.alive) break;
          let dmg = abilityDamageRaw(actor, ability);
          if (te.execute && target.hp / target.maxHp <= 0.35) dmg = Math.round(dmg * te.execute);
          totalDealt += dealDmg(target, dmg, actor, dmgCtx);
        }
        const hitNote = hits > 1 ? ` ×${hits}` : '';
        log(`${actor.name}: ${ability.name} → ${target.name} (−${fmt(totalDealt)}${hitNote})`, cls);
        // Правосудие: доп. урон целям под «Освящение» (доля от нанесённого Правосудия)
        if (ability.judgmentConsecrateSplash != null && totalDealt > 0) {
          const splashFrac = Number(ability.judgmentConsecrateSplash) || 0;
          if (splashFrac > 0) {
            const splashRaw = Math.max(1, Math.round(totalDealt * splashFrac));
            for (const e of foes) {
              if (!e.alive || e.uid === target.uid) continue;
              const hasCons = (e.buffs || []).some(b =>
                b && (b.id === 'dot_consecrate' || (b.name && String(b.name).includes('Освящение')))
              );
              if (!hasCons) continue;
              const sd = dealDmg(e, splashRaw, actor, {
                type: 'damage', abilityId: ability.id, abilityName: ability.name + ' (освящ.)',
                school, skipBlock: true,
              });
              if (sd) log(`${actor.name}: ${ability.name} → ${e.name} (−${fmt(sd)}, освящ.)`, cls);
            }
          }
        }
        if (te.lifesteal && actor.side === 'ally') {
          healUnit(actor, Math.round(totalDealt * te.lifesteal), actor, {
            abilityName: 'Вампиризм', lifesteal: true,
          });
        }
        const ls = ability.lifesteal != null
          ? Number(ability.lifesteal)
          : (ability.id === 'death_strike' ? 0.25 : (ability.id === 'bt' ? 0.1 : 0));
        if (ls > 0) {
          healUnit(actor, Math.round(totalDealt * ls), actor, {
            abilityId: ability.id, abilityName: ability.name || 'Вампиризм', lifesteal: true,
          });
        }
        // Cleave: соседние цели слева/справа (порядок списка врагов)
        if (ability.cleaveFlat != null && Number.isFinite(Number(ability.cleaveFlat))) {
          const sideRaw = abilityDamageRaw(actor, { flat: ability.cleaveFlat });
          const idx = foes.findIndex(e => e.uid === target.uid);
          for (const j of [idx - 1, idx + 1]) {
            if (j < 0 || j >= foes.length) continue;
            const side = foes[j];
            if (!side?.alive) continue;
            const sd = dealDmg(side, sideRaw, actor, dmgCtx);
            if (sd) log(`${actor.name}: ${ability.name} (бок) → ${side.name} (−${fmt(sd)})`, cls);
          }
        }
        // Splash на всех остальных (Щит праведника: 30т второстепенным)
        if (ability.splashFlat != null && Number.isFinite(Number(ability.splashFlat))) {
          const splashRaw = abilityDamageRaw(actor, { flat: Number(ability.splashFlat) });
          for (const e of foes) {
            if (!e.alive || (target && e.uid === target.uid)) continue;
            const sd = dealDmg(e, splashRaw, actor, {
              type: 'damage', abilityId: ability.id, abilityName: ability.name + ' (второст.)',
              school, skipBlock: false,
            });
            if (sd) log(`${actor.name}: ${ability.name} → ${e.name} (−${fmt(sd)}, второст.)`, cls);
          }
        }
        // Щит праведника: + «Щит света» (броня)
        if (ability.id === 'sot_r' && actor.alive) {
          const prev = (actor.buffs || []).find(b => b && b.id === 'light_shield');
          const stacks = Math.min(2, (prev ? (Number(prev.stacks) || 0) : 0) + 1);
          actor.buffs = (actor.buffs || []).filter(b => !b || b.id !== 'light_shield');
          applyStatus(actor, {
            id: 'light_shield',
            name: stacks > 1 ? ('Щит света ×' + stacks) : 'Щит света',
            icon: '✨',
            turns: 4,
            stacks,
            armorMod: 0.10 * stacks,
            tip: 'Броня увеличена на ' + (10 * stacks) + '%',
          });
          log(`${actor.name}: Щит света ×${stacks} (+${10 * stacks}% брони · 4х)`, cls);
          floatText(actor.uid, 'щит света ×' + stacks, 'buff');
        }
        // Уязвимость брони (Удар колосса) — по умолчанию только физ. урон
        if (ability.vuln && target.alive) {
          const amt = Number(ability.vuln.amount) || 0.2;
          const turns = Number(ability.vuln.turns) || 3;
          const physOnly = ability.vuln.physical !== false;
          applyStatus(target, {
            id: 'vuln_' + ability.id,
            name: physOnly ? 'Слом брони' : ability.name,
            icon: ability.icon || '🔨',
            turns,
            dmgTakenMod: amt,
            physOnly,
            dispellable: true,
          });
          log(
            `${target.name}: +${Math.round(amt * 100)}% ${physOnly ? 'физ. ' : ''}урона · ${turns} хода`,
            'system'
          );
        }
        if (ability.armorMod && actor.alive) applyArmorStack(actor, ability);
        // DoT поверх урона (Arms: Кровотечение 4 хода и др.)
        if (ability.applyDot && target.alive) {
          const ad = ability.applyDot;
          let tick = periodicTickFromFlat(actor, ad.flat || 0);
          // Arms bleed mastery (and other DoT masteries) snapshot into tick
          tick = Math.max(1, Math.round(tick * masteryDmgMult(actor, {
            isDot: true, type: 'dot', abilityId: ad.id || ability.id,
            school: ad.school || 'physical',
          })));
          // Явная длительность из applyDot (Кровотечение = 4) — не PERIODIC_ROUNDS
          const turns = Math.max(1, Number(ad.turns) || 4);
          applyStatus(target, {
            id: 'dot_' + (ad.id || ability.id),
            name: ad.name || ability.name,
            icon: ad.icon || '🩸',
            turns,
            dot: tick,
            fromUid: actor.uid,
            periodic: true,
            school: ad.school || 'physical',
          });
          log(`${actor.name}: ${ad.name || 'период. урон'} → ${target.name} (${fmt(tick)}/р · ${turns}р)`, cls);
        }
        // Arms: «Широкий размах» — Героический удар дублируется на остальных (40% силы)
        if (ability.id === 'heroic' && actor.alive && target) {
          const ws = (actor.buffs || []).find(b => b && b.id === 'wide_sweep' && (Number(b.stacks) || 0) > 0);
          if (ws) {
            const splashRaw = Math.max(1, Math.round(abilityDamageRaw(actor, ability) * 0.4));
            for (const e of foes) {
              if (!e.alive || e.uid === target.uid) continue;
              const sd = dealDmg(e, splashRaw, actor, {
                type: 'damage', abilityId: ability.id, abilityName: ability.name + ' (размах)',
                school, skipBlock: false,
              });
              if (sd) log(`${actor.name}: ${ability.name} (размах) → ${e.name} (−${fmt(sd)})`, cls);
            }
            actor.buffs = (actor.buffs || []).filter(b => b && b.id !== 'wide_sweep');
            log(`${actor.name}: «Широкий размах» израсходован`, 'system');
          }
        }
        // Kill Command — pet strikes; other hunter hits — small pet assist
        if (actor.side === 'ally' && actor.classId === 'hunter') {
          const pets = petsOf(actor);
          if (pets.length && foes.length) {
            const p = pets[0];
            const t2 = target || lowest(foes);
            if (t2 && p.alive) {
              const petDmg = Math.round(getEff(p).atk * (ability.id === 'kill_cmd' ? 1.55 : 0.4));
              if (ability.id === 'kill_cmd' || Math.random() < 0.35) {
                const pd = dealDmg(t2, petDmg, p, {
                  type: 'damage', abilityId: ability.id, abilityName: ability.name, isPet: true,
                });
                if (pd) log(`${p.name}: Удар → ${t2.name} (−${fmt(pd)})`, 'player');
              }
            }
          }
        }
        if (ability.id === 'death_ray') {
          const radTick = periodicTickFromFlat(actor, 5);
          for (const e of foes) {
            if (!e.alive) continue;
            applyStatus(e, {
              id: 'dot_radiation', name: 'Радиационный ожог', icon: '☢️',
              turns: 2, dot: radTick, fromUid: actor.uid, periodic: true, school: 'fire',
            });
          }
          log(`${actor.name}: Радиационный ожог (${fmt(radTick)}/р · 2р) на всех`, cls);
        }
        if (target && target.alive && actor.side === 'ally' && !actor.isPet) {
          actor.lastAttackUid = target.uid;
        }
        break;
      }
      case 'aoe': {
        const mult = (actor.side === 'ally' && te.aoeMult) || 1;
        // Щит мстителя: основная цель — только кликнутая (иначе без «гарантированного» сбития)
        let primary = null;
        if (ability.id === 'avengers' && target && target.side !== actor.side && target.alive) {
          primary = target;
        }
        if (ability.id === 'avengers' && primary) {
          fxTargets = [primary].concat(foes.filter(e => e.uid !== primary.uid));
        } else {
          fxTargets = foes.slice();
        }
        playSkillAnim(actor, ability, fxTargets);
        const aoeCtx = {
          type: 'aoe', isAoe: true, abilityId: ability.id, abilityName: ability.name,
          school: ability.school || abilityDamageSchool(actor, ability),
        };
        const hits = Math.max(1, Number(ability.hits) || 1);
        const hasFlatZero = ability.flat === 0 || ability.flat === '0';
        let totalAll = 0;
        const order = (ability.id === 'avengers' && primary)
          ? [primary].concat(foes.filter(e => e.uid !== primary.uid))
          : foes.slice();
        order.forEach((enemy, idx) => {
          if (!enemy?.alive) return;
          let fall = 1;
          if (ability.aoeBounce != null && idx > 0) fall = Math.max(0.15, 1 - Number(ability.aoeBounce) * idx);
          let total = 0;
          if (!hasFlatZero) {
            for (let hi = 0; hi < hits; hi++) {
              if (!enemy.alive) break;
              total += dealDmg(enemy, abilityDamageRaw(actor, ability, mult * fall), actor, aoeCtx);
            }
            if (total > 0) log(`${actor.name}: ${ability.name} → ${enemy.name} (−${fmt(total)})`, cls);
          }
          totalAll += total;
          // Щит мстителя: гарантированный сбитие только у кликнутой; остальные — с шансом
          if (ability.interruptPrimary && enemy.casting) {
            const isPrimary = !!(primary && enemy.uid === primary.uid);
            const chance = isPrimary ? 1 : (Number(ability.interruptAoeChance) || 0);
            if (isPrimary || (chance > 0 && Math.random() < chance)) {
              const castName = enemy.casting.name || 'каст';
              interruptCast(enemy, actor);
              log(
                `${actor.name}: ${ability.name} сбивает «${castName}» у ${enemy.name}` +
                (isPrimary ? '' : ' (шанс)'),
                'player'
              );
            }
          }
          if (ability.applyDot && enemy.alive) {
            const ad = ability.applyDot;
            let tick = periodicTickFromFlat(actor, ad.flat || 0);
            tick = Math.max(1, Math.round(tick * masteryDmgMult(actor, {
              isDot: true, type: 'dot', abilityId: ad.id || ability.id,
              school: ad.school || ability.school || 'physical',
            })));
            applyStatus(enemy, {
              id: 'dot_' + (ad.id || ability.id), name: ad.name || ability.name,
              icon: ad.icon || ability.icon || '☀️', turns: Number(ad.turns) || 4,
              dot: tick, fromUid: actor.uid, periodic: true,
              school: ad.school || ability.school || 'physical',
            });
          }
          if (ability.enemyDmgMod && enemy.alive) {
            applyStatus(enemy, {
              id: 'edm_' + ability.id, name: ability.name, icon: ability.icon || '🔥',
              turns: Number(ability.buffTurns) || 5,
              enemyDmgMod: Number(ability.enemyDmgMod) || 0,
            });
          }
        });
        if (ability.shieldFromDmg && totalAll > 0) {
          const sh = Math.round(totalAll * Number(ability.shieldFromDmg));
          actor.shield = (actor.shield || 0) + sh;
          log(`${actor.name}: щит ${fmt(sh)} от ${ability.name}`, cls);
        }
        if (ability.dmgReduce && ability.id === 'heroic_leap') {
          applyStatus(actor, {
            id: 'dr_heroic_leap', name: ability.name, icon: ability.icon || '🦘',
            turns: Number(ability.buffTurns) || 2, dmgReduce: Number(ability.dmgReduce) || 0,
          });
        }
        break;
      }
      case 'cast_aoe': {
        if (actor.side === 'enemy') {
          if (isSilenced(actor)) {
            log(actor.name + ' в немоте — не может читать', 'system');
            break;
          }
          // Prefer ability-defined castKind; bosses default to buster more often
          const isBoss = !!actor.isBoss;
          let kind = ability.castKind || (isBoss && Math.random() < 0.5 ? 'buster' : 'kick');
          if (kind !== 'buster' && kind !== 'aoe' && kind !== 'kick') kind = 'kick';
          const castPrio = ability.castPrio || (kind === 'kick' ? 3 : kind === 'buster' ? 2 : 1);
          const avoidable = kind === 'aoe' && !isBoss && Math.random() < 0.35 ? 'dodge' : false;
          actor.casting = makeTelegraph(kind, {
            name: ability.name, power, powerMult: kind === 'buster' ? 1.2 : 1,
            target: kind === 'buster' ? 'tank' : 'all', avoidable, interruptible: kind !== 'buster' || true,
          });
          actor.casting.castPrio = castPrio;
          actor.casting.priority = castPrio;
          playSkillAnim(actor, ability, []);
          log(`${actor.name} читает [P${castPrio}]: ${telegraphLabel(actor.casting)}${avoidable ? ' · можно уклониться' : ''}`, 'enemy');
          toast(telegraphLabel(actor.casting));
        } else {
          fxTargets = foes.slice();
          playSkillAnim(actor, ability, fxTargets);
          const aoeCtx = {
            type: 'cast_aoe', isAoe: true, abilityId: ability.id,
            abilityName: ability.name,
            school: abilityDamageSchool(actor, ability),
          };
          for (const t of foes.slice()) dealDmg(t, Math.round(eff.atk * power), actor, aoeCtx);
        }
        break;
      }
      case 'interrupt': {
        target = target || foes.find(e => e.casting);
        if (!target?.casting) { log('Нечего прерывать', 'system'); break; }
        playSkillAnim(actor, ability, [target]);
        interruptCast(target, actor);
        break;
      }
      case 'dispel': {
        target = target || lowest(friends.filter(f => !f.isPet && ((f.burstStacks || 0) > 0 || f.buffs.some(b => b.dispellable)))) || actor;
        playSkillAnim(actor, ability, [target]);
        // clear 1 burst stack or dispellable
        if ((target.burstStacks || 0) > 0) {
          target.burstStacks = Math.max(0, target.burstStacks - 1);
          log(`${actor.name}: ${ability.name} → ${target.name} (−1 Взрывной, стек ${target.burstStacks})`, 'heal');
          toast('Снят стек Взрывного');
        } else {
          const gone = removeDispellable(target, ['magic', 'curse', 'disease']);
          if (gone) {
            log(`${actor.name}: ${ability.name} снимает «${gone.name}» с ${target.name}`, 'heal');
            toast('Очищено: ' + gone.name);
          } else if (target.thunderMark) {
            target.thunderMark = false;
            log(`${actor.name}: ${ability.name} снимает метку грозы с ${target.name}`, 'heal');
          } else {
            log(`${actor.name}: ${ability.name} — нечего снимать`, 'system');
          }
        }
        break;
      }
      case 'purge': {
        target = target || foes.find(e => e.enraged || e.buffs.some(b => b.dispellable || b.atkMod > 0)) || pick(foes);
        if (!target) break;
        playSkillAnim(actor, ability, [target]);
        if (target.enraged) {
          target.enraged = false;
          log(`${actor.name}: ${ability.name} усмиряет ${target.name}`, 'player');
          toast('Ярость снята');
        } else {
          const gone = removeDispellable(target, ['magic', 'enrage']) || (() => {
            const i = target.buffs.findIndex(b => b.atkMod > 0);
            if (i < 0) return null;
            return target.buffs.splice(i, 1)[0];
          })();
          if (gone) log(`${actor.name}: ${ability.name} снимает «${gone.name || 'бафф'}» с ${target.name}`, 'player');
          else log(`${actor.name}: ${ability.name} — нечего снимать`, 'system');
        }
        break;
      }
      case 'cc': {
        target = target || pick(foes);
        if (!target) break;
        playSkillAnim(actor, ability, [target]);
        const mode = ability.ccMode || 'stun';
        if (target.casting) interruptCast(target, actor);
        if (mode === 'stun') {
          const stTurns = Number(ability.buffTurns) || Number(ability.ccTurns) || 1;
          applyStatus(target, { id: 'stun', name: 'Оглушение', icon: '💫', turns: stTurns, ccMode: 'stun' });
          log(`${actor.name}: ${ability.name} → ${target.name} (стан ${stTurns}х)`, 'player');
          toast('💫 Стан ' + stTurns + 'х');
        } else {
          applyStatus(target, { id: 'lock', name: 'Немота', icon: '🔇', turns: 2, ccMode: 'silence' });
          log(`${actor.name}: ${ability.name} → ${target.name} (немота)`, 'player');
        }
        // Spite ghosts: stun kills
        if (target.name === 'Злоба' || target.id === 'sp') {
          target.hp = 0; target.alive = false;
          log('Злоба уничтожена оглушением!', 'player');
        }
        break;
      }
      case 'cleanse': {
        playSkillAnim(actor, ability, [actor]);
        const before = actor.stagger || 0;
        const pct = ability.purifyPct != null ? Number(ability.purifyPct) : 1;
        if (before > 0) {
          const cleared = Math.max(1, Math.round(before * Math.min(1, Math.max(0, pct))));
          actor.stagger = Math.max(0, before - cleared);
          // Пул для «Отвар неуловимости»: сумма очищенного stagger
          actor.purifyCleared = (actor.purifyCleared || 0) + cleared;
          log(`${actor.name}: ${ability.name} — −${fmt(cleared)} шат (остаток ${fmt(actor.stagger)}; пул щита ${fmt(actor.purifyCleared)})`, 'heal');
          toast('Пошатывание −' + fmt(cleared));
          floatText(actor.uid, 'чист ' + fmt(cleared), 'heal');
        } else {
          log(`${actor.name}: ${ability.name} — пошатывания нет`, 'system');
          toast('Пошатывания нет');
        }
        break;
      }
      case 'heal': {
        // Гаечный воскрешатель: −50% maxHP пета → +10% maxHP цели
        if (ability.id === 'wrench_heal') {
          const pet = getMainPet(actor, false);
          if (!pet) {
            log(`${actor.name}: ${ability.name} — нет живого питомца`, 'system');
            break;
          }
          target = target || lowest(friends.filter(f => !f.isPet)) || actor;
          if (!target || target.side !== actor.side || target.isPet) target = actor;
          const sac = Math.max(1, Math.round(pet.maxHp * 0.5));
          pet.hp = Math.max(0, pet.hp - sac);
          if (pet.hp <= 0) {
            pet.hp = 0;
            killUnit(pet, actor);
          } else {
            floatText(pet.uid, '−' + fmt(sac), 'dmg');
          }
          const healAmt = Math.max(1, Math.round(target.maxHp * 0.1));
          playSkillAnim(actor, ability, [target]);
          const h = healUnit(target, healAmt, actor, {
            exact: true, abilityId: ability.id, abilityName: ability.name,
          });
          log(`${actor.name}: ${ability.name} (пет −${fmt(sac)}) → ${target.name} (+${fmt(h)})`, 'heal');
          toast('Гаечный воскрешатель');
          break;
        }
        if (ability.holyShock && target && target.side !== actor.side && target.alive) {
          playSkillAnim(actor, ability, [target]);
          // Урон = вес скилла (27т), не хардкод 12
          const shockFlat = abilityFlatWeight(ability);
          let dealt = abilityDamageRaw(actor, { flat: shockFlat != null ? shockFlat : 27 });
          if (Math.random() < critChance(actor) + (Number(ability.critBonus) || 0)) dealt = Math.round(dealt * critMult(actor));
          dealt = dealDmg(target, dealt, actor, {
            type: 'damage', abilityId: ability.id, abilityName: ability.name, school: 'holy', skipBlock: true,
          });
          const hotFlat = (ability.applyHot && ability.applyHot.flat != null)
            ? Number(ability.applyHot.flat) : 7;
          applyStatus(target, {
            id: 'dot_holy_shock', name: 'Шок небес', icon: ability.icon || '✨',
            turns: Number(ability.applyHot && ability.applyHot.turns) || 5,
            dot: periodicTickFromFlat(actor, hotFlat), fromUid: actor.uid, periodic: true, school: 'holy',
          });
          log(`${actor.name}: ${ability.name} → ${target.name} (−${fmt(dealt)} + период.)`, cls);
          break;
        }
        if (abilityTargetRule(ability) === 'self_only') target = actor;
        else target = target || lowest(friends.filter(f => !f.isPet)) || lowest(friends) || actor;
        if (!target || target.side !== actor.side) target = actor;
        if (!target.buffs) target.buffs = [];
        fxTargets = [target];
        playSkillAnim(actor, ability, fxTargets);
        // Лечение всегда от статов (атака кастера через flat, или % maxHp через power)
        let amount = abilityHealRaw(actor, ability, target, 1 + lootHeal);
        for (const b of (actor.buffs || [])) {
          if (!b || !b.healAmp || !(b.abilityCharges > 0)) continue;
          amount = Math.round(amount * (1 + Number(b.healAmp)));
          b.abilityCharges -= 1;
          if (b.abilityCharges <= 0) b.turns = 0;
        }
        if (ability.id === 'hw' || ability.id === 'chw') {
          const tw = (actor.buffs || []).find(b => b && b.id === 'tidal_waves' && b.abilityCharges > 0);
          if (tw) {
            if (ability.id === 'hw') amount = Math.round(amount * 1.1);
            tw.abilityCharges -= 1;
            if (tw.abilityCharges <= 0) tw.turns = 0;
          }
        }
        // Крит хила: всегда от рейтинга крита (+critBonus скилла)
        let healCrit = false;
        {
          const rolled = rollOutgoingHealCrit(actor, ability, amount);
          amount = rolled.amount;
          healCrit = rolled.crit;
        }
        if (!Number.isFinite(amount) || amount < 1) amount = Math.max(1, Math.round(getEff(actor).atk * 0.5));

        const useFlat = abilityFlatWeight(ability) != null;
        // Legacy HoT-split (renew etc.) — только если НЕТ flat и НЕТ applyHot
        const hotCfg = (!useFlat && !ability.applyHot) ? hotConfig(ability.id) : null;
        if (hotCfg) {
          const direct = Math.max(1, Math.round(amount * (hotCfg.direct || 0.35)));
          let tick = Math.max(1, Math.round(amount * (hotCfg.tick || 0.25)));
          if (!Number.isFinite(tick) || tick < 1) tick = Math.max(1, Math.round(getEff(actor).atk * 0.05));
          const turns = PERIODIC_ROUNDS;
          const h = healUnit(target, direct, actor, {
            abilityId: ability.id, abilityName: ability.name, crit: healCrit,
          });
          applyStatus(target, {
            id: 'hot_' + ability.id, name: ability.name, icon: ability.icon || '🌿',
            turns, hot: tick, fromUid: actor.uid, periodic: true,
          });
          log(`${actor.name}: ${ability.name} → ${target.name} (${healCrit ? 'КРИТ ' : ''}+${fmt(h)}, период. леч. ${fmt(tick)}/р · ${turns}р)`, 'heal');
          toast(`${ability.name} на ${target.name} · ${turns}р`);
        } else {
          const h = healUnit(target, amount, actor, {
            abilityId: ability.id, abilityName: ability.name, crit: healCrit,
          });
          log(`${actor.name}: ${ability.name} → ${target.name} (${healCrit ? 'КРИТ ' : ''}+${fmt(h)})`, 'heal');
          if (ability.applyHot) {
            const ad = ability.applyHot;
            const tick = periodicTickFromFlat(actor, ad.flat || 0);
            const turns = Number(ad.turns) || 5;
            applyStatus(target, {
              id: 'hot_' + ability.id, name: ad.name || ability.name, icon: ability.icon || '✨',
              turns, hot: tick, fromUid: actor.uid, periodic: true,
            });
            log(`${actor.name}: период. леч. ${ad.name || ability.name} ${fmt(tick)}/р · ${turns}р`, 'heal');
          }
        }
        if (ability.id === 'riptide') {
          applyStatus(actor, { id: 'tidal_waves', name: 'Прилив', icon: '🌊', turns: 6, abilityCharges: 2 });
        }
        if (ability.healAmp && ability.nextHealCharges) {
          applyStatus(actor, {
            id: 'unleash_life', name: ability.name, icon: ability.icon || '✨',
            turns: 6, healAmp: Number(ability.healAmp), abilityCharges: Number(ability.nextHealCharges),
          });
        }
        break;
      }
      case 'heal_aoe': {
        const healAllies = friends.filter(f => !f.isPet);
        fxTargets = healAllies.length ? healAllies : friends.slice();
        playSkillAnim(actor, ability, fxTargets);
        let chainTargets = fxTargets.slice();
        if (ability.chainDecay != null || ability.chainPrimary) {
          const primary = (ability.chainPrimary && target && target.alive && target.side === actor.side && !target.isPet)
            ? target : null;
          let rest = chainTargets.filter(u => u.alive && (!primary || u.uid !== primary.uid));
          const injured = rest.filter(u => u.hp < u.maxHp).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
          const full = rest.filter(u => !injured.includes(u));
          chainTargets = (primary ? [primary] : []).concat(injured, full);
          if (!chainTargets.length) chainTargets = fxTargets.slice();
        }
        let chainMult = 1;
        for (const tt of chainTargets) {
          const useF = abilityFlatWeight(ability) != null;
          let amt = abilityHealRaw(actor, ability, tt, chainMult * (1 + lootHeal));
          // hm already partly in talent via abilityHealRaw; keep chain only
          for (const b of (actor.buffs || [])) {
            if (b && b.healAmp && b.abilityCharges > 0) {
              amt = Math.round(amt * (1 + Number(b.healAmp)));
              b.abilityCharges -= 1;
              if (b.abilityCharges <= 0) b.turns = 0;
              break;
            }
          }
          // Крит хила по каждой цели (крит-рейтинг кастера)
          let aoeHealCrit = false;
          {
            const rolled = rollOutgoingHealCrit(actor, ability, amt);
            amt = rolled.amount;
            aoeHealCrit = rolled.crit;
          }
          if (!(useF && abilityFlatWeight(ability) === 0 && ability.applyHot)) {
            const h = healUnit(tt, amt, actor, {
              abilityId: ability.id, abilityName: ability.name, crit: aoeHealCrit,
            });
            log(`${actor.name}: ${ability.name} → ${tt.name} (${aoeHealCrit ? 'КРИТ ' : ''}+${fmt(h)})`, 'heal');
          }
          if (ability.applyHot) {
            const ad = ability.applyHot;
            const tick = periodicTickFromFlat(actor, ad.flat || 0);
            applyStatus(tt, {
              id: 'hot_' + ability.id, name: ad.name || ability.name, icon: ability.icon || '🌿',
              turns: Number(ad.turns) || 5, hot: tick, fromUid: actor.uid, periodic: true,
            });
          }
          if (ability.chainDecay != null) chainMult *= (1 - Number(ability.chainDecay));
        }
        if (ability.dmgReduce && ability.id === 'spirit_link') {
          for (const al of friends.filter(f => !f.isPet && f.alive)) {
            applyStatus(al, {
              id: 'spirit_link', name: ability.name, icon: ability.icon || '🔗',
              turns: Number(ability.buffTurns) || 3, dmgReduce: Number(ability.dmgReduce),
            });
          }
          equalizePartyHpByPct('каст');
        }
        break;
      }
      case 'shield': {
        // Default self_only; PW:S / Pain Supp / Guardian — ally_any
        if (abilityTargetRule(ability) === 'self_only') target = actor;
        else {
          target = target || lowest(friends.filter(f => !f.isPet)) || actor;
          if (!target || target.side !== actor.side || target.isPet) target = actor;
        }
        fxTargets = [target];
        playSkillAnim(actor, ability, fxTargets);
        let amount;
        let purifyBonus = 0;
        if (ability.id === 'elusive') {
          target = actor;
          // база 30т (от атаки) + объём stagger, очищенный «Очищающим отваром»
          purifyBonus = Math.max(0, Math.round(actor.purifyCleared || 0));
          amount = abilityShieldRaw(actor, { flat: 30 }, target) + purifyBonus;
          actor.purifyCleared = 0;
        } else {
          amount = abilityShieldRaw(actor, ability, target);
        }
        if (actor.side === 'ally') {
          amount = Math.round(amount * masteryShieldMult(actor) * versHealMult(actor));
        }
        target.shield += amount;
        if (ability.id === 'elusive') {
          log(`${actor.name}: ${ability.name} 🛡${fmt(amount)}` +
            (purifyBonus ? ` (база + ${fmt(purifyBonus)} из очищ. stagger)` : ' (база)'), 'heal');
        } else {
          log(`${actor.name}: ${ability.name} 🛡${fmt(amount)} → ${target.name}`, 'heal');
        }
        break;
      }
      case 'taunt': {
        fxTargets = foes.slice();
        playSkillAnim(actor, ability, fxTargets);
        for (const e of foes) {
          e.buffs.push({ id: 'taunt', name: 'Агро', icon: '🎯', turns: 3, forceTarget: actor.uid });
          // Snap threat well above current top so tank keeps pulls
          if (!e.threat) e.threat = {};
          const top = Math.max(0, ...Object.values(e.threat), 0);
          e.threat[actor.uid] = top + 12000 + Math.round(actor.maxHp * 0.12);
        }
        log(`${actor.name}: ${ability.name} — угроза захвачена`, 'player');
        toast('Провокация!');
        break;
      }
      case 'buff': {
        // Отладка: переключить режим основного питомца СТ ↔ АОЕ (1× за ход, freeAction)
        if (ability.id === 'debug_mode') {
          actor._debugUsedThisTurn = true;
          const pet = getMainPet(actor, true);
          if (!pet) {
            log(`${actor.name}: ${ability.name} — нет питомца`, 'system');
            break;
          }
          pet.attackMode = (pet.attackMode === 'aoe') ? 'st' : 'aoe';
          const modeRu = pet.attackMode === 'aoe' ? 'АОЕ' : 'СТ';
          log(`${actor.name}: ${ability.name} → режим питомца: ${modeRu}`, 'player');
          toast('Отладка: ' + modeRu);
          floatText(pet.uid, modeRu, 'buff');
          break;
        }
        // Воскрешение основного питомца
        if (ability.id === 'pet_rez') {
          playSkillAnim(actor, ability, [actor]);
          const key = mainPetKeyFor(actor.classId, actor.specId);
          let pet = getMainPet(actor, true);
          if (pet && (!pet.alive || pet.hp <= 0)) {
            pet.alive = true;
            pet.hp = Math.max(1, Math.round(pet.maxHp * 0.6));
            pet.shield = 0;
            pet.buffs = [];
            pet.attackMode = pet.attackMode || 'st';
            log(`${actor.name}: ${ability.name} → ${pet.name} (+${fmt(pet.hp)} HP)`, 'heal');
            toast('Питомец воскрешён');
            floatText(pet.uid, 'возрождён', 'heal');
          } else if (!pet && key) {
            pet = addPet(actor, key, null);
            if (pet) {
              pet.isMainPet = true;
              pet.attackMode = 'st';
              pet.hp = Math.max(1, Math.round(pet.maxHp * 0.6));
              log(`${actor.name}: ${ability.name} → ${pet.name}`, 'heal');
              toast('Питомец воскрешён');
            }
          } else {
            log(`${actor.name}: ${ability.name} — некого воскрешать`, 'system');
          }
          break;
        }
        playSkillAnim(actor, ability, [actor]);
        const bTurns = Number(ability.buffTurns) || 3;
        if (ability.blockChanceAdd || ability.blockValueAdd) {
          applyStatus(actor, {
            id: 'shield_block_buff', name: ability.name, icon: ability.icon || '🧱', turns: bTurns,
            blockChanceAdd: Number(ability.blockChanceAdd) || 0,
            blockValueAdd: Number(ability.blockValueAdd) || 0,
          });
          log(`${actor.name}: ${ability.name} · блок ↑ · ${bTurns}х`, cls);
        }
        if (ability.dmgReduce && (
          ability.id === 'shield_wall' || ability.id === 'ardent' || ability.id === 'fort_brew'
          || ability.id === 'icebound' || ability.staggerBonus || Number(ability.dmgReduce) > 0
        )) {
          applyStatus(actor, {
            id: 'dr_' + ability.id, name: ability.name, icon: ability.icon || '🏰', turns: bTurns,
            dmgReduce: Number(ability.dmgReduce) || 0,
            staggerBonus: Number(ability.staggerBonus) || 0,
          });
          log(`${actor.name}: ${ability.name} −${Math.round((Number(ability.dmgReduce)||0)*100)}% · ${bTurns}х`, cls);
        }
        if (ability.id === 'dark_soul') {
          // не на Главаря бесов
          for (const p of (combat?.pets || []).filter(x =>
            x.alive && x.ownerUid === actor.uid && x.petKey !== 'imp_boss'
          )) {
            if (p.petTurnsLeft != null) p.petTurnsLeft += 3;
            else p.petTurnsLeft = 3;
          }
          log(`${actor.name}: ${ability.name} — бесы/демоны +3 хода (не главарь)`, cls);
        }
        // sot_r теперь type:damage (см. case damage) — legacy buff-ветка не нужна
        if (ability.armorMod && !ability.armorStacksMax) {
          applyStatus(actor, {
            id: 'armor_' + ability.id, name: ability.name, icon: ability.icon || '🛡️', turns: bTurns,
            armorMod: Number(ability.armorMod) || 0,
          });
          log(`${actor.name}: ${ability.name} +${Math.round((Number(ability.armorMod)||0)*100)}% брони`, cls);
        }
        if (ability.critMod) {
          applyStatus(actor, {
            id: 'crit_' + ability.id, name: ability.name, icon: ability.icon || '😇', turns: bTurns,
            critMod: Number(ability.critMod) || 0,
          });
          log(`${actor.name}: ${ability.name} +${Math.round((Number(ability.critMod)||0)*100)}% крит`, cls);
        }
        if (ability.atkMod) {
          applyStatus(actor, {
            id: 'atk_' + ability.id, name: ability.name, icon: ability.icon || '📜', turns: bTurns,
            atkMod: Number(ability.atkMod) || 0,
            petAtkMod: Number(ability.petAtkMod) || 0,
          });
          log(`${actor.name}: ${ability.name} +${Math.round((Number(ability.atkMod)||0)*100)}% атаки` +
            (ability.petAtkMod ? ` / петам +${Math.round(Number(ability.petAtkMod)*100)}%` : ''), cls);
          if (ability.petAtkMod && combat?.pets) {
            for (const p of combat.pets.filter(x => x.alive && x.ownerUid === actor.uid)) {
              p.atk = Math.round(p.atk * (1 + Number(ability.petAtkMod)));
            }
          }
        }
        if (ability.maxHpPct) {
          const bonus = Math.round(actor.maxHp * Number(ability.maxHpPct));
          actor.maxHp += bonus;
          actor.hp = clamp(actor.hp + bonus, 1, actor.maxHp);
          applyStatus(actor, { id: ability.id + '_hp', name: ability.name, icon: ability.icon || '❤️', turns: bTurns, tempHp: bonus });
          log(`${actor.name}: ${ability.name} (+${fmt(bonus)} HP)`, cls);
        }
        if (ability.grantBlock) {
          applyStatus(actor, {
            id: 'shield_block_buff', name: 'Блок щитом', icon: '🧱', turns: bTurns,
            blockChanceAdd: 0.5, blockValueAdd: 0.2,
          });
        }
        // Special buffs that aren't just "+ATK"
        // sot_r / debug_mode / pet_rez — уже обработаны выше, без legacy +ATK от power=1
        const rebalanceBuff = !!(ability.critMod || ability.atkMod || ability.dmgReduce || ability.maxHpPct
          || ability.blockChanceAdd || ability.blockValueAdd || ability.armorMod || ability.grantBlock
          || ability.id === 'sot_r' || ability.id === 'debug_mode' || ability.id === 'pet_rez'
          || ability.id === 'avenging' || ability.id === 'inquisition');
        if (rebalanceBuff) {
          // флаги уже применены — без legacy +ATK / abilityCharges
        } else if ((ability.id === 'last_stand' || ability.id === 'vampiric_blood') && !ability.maxHpPct) {
          const bonus = Math.round(actor.maxHp * power);
          actor.maxHp += bonus;
          actor.hp = clamp(actor.hp + bonus, 1, actor.maxHp);
          applyStatus(actor, {
            id: ability.id, name: ability.name, icon: ability.icon || '⬆️', turns: 3,
            atkMod: ability.id === 'vampiric_blood' ? 0.1 : 0,
            tempHp: bonus,
          });
          log(`${actor.name}: ${ability.name} (+${bonus} HP на 3 хода)`, cls);
          toast(`${ability.name}: +${bonus} HP`);
        } else if (ability.id === 'evocation') {
          const gain = Math.round(actor.res.primary.max * 0.4);
          actor.res.primary.current = clamp(actor.res.primary.current + gain, 0, actor.res.primary.max);
          log(`${actor.name}: ${ability.name} (+${gain} маны)`, cls);
          toast(`+${gain} маны`);
        } else if (ability.id === 'prem' && actor.res.secondary?.type === 'combo') {
          // +2 already applied via genSec in payAbility — only log
          log(`${actor.name}: ${ability.name} (+2 к серии)`, cls);
          toast('+2 к серии');
        } else if (ability.id === 'elusive') {
          log(`${actor.name}: ${ability.name} (+${Math.round(Math.max(0.15, power) * 100)}% DEF)`, cls);
          toast(ability.name + ': +DEF');
        } else if (ability.id === 'metamorphosis') {
          // Demo form: strong ATK + slight toughness for 4 turns
          applyStatus(actor, {
            id: 'metamorphosis', name: 'Метаморфоза', icon: '👹', turns: 4,
            atkMod: power, defMod: 0.15,
          });
          log(`${actor.name}: Метаморфоза — +${Math.round(power * 100)}% атаки, +15% защиты (4 хода)`, cls);
          toast(`Метаморфоза: +${Math.round(power * 100)}% атаки · 4 хода`);
        } else if (ability.abilityCharges) {
          // Безрассудство и т.п.: +ATK на следующие N ударов (не по ходам)
          const charges = Math.max(1, Number(ability.abilityCharges) || 2);
          const pct = Math.round(power * 100);
          applyStatus(actor, {
            id: ability.id, name: ability.name, icon: ability.icon || '⬆️',
            turns: 99, atkMod: power, abilityCharges: charges,
            tip: `+${pct}% атаки · следующие ${charges} удара`,
          });
          log(`${actor.name}: ${ability.name} (+${pct}% атаки · след. ${charges} удара)`, cls);
          toast(`${ability.name}: +${pct}% · ${charges} удара`);
        } else if (!(
          ability.critMod || ability.atkMod || ability.dmgReduce || ability.maxHpPct
          || ability.blockChanceAdd || ability.blockValueAdd || ability.armorMod || ability.grantBlock
        )) {
          // Legacy default: +ATK from power — only if no explicit rebalance flags
          const turns = ability.cd >= 5 ? 3 : 3;
          applyStatus(actor, {
            id: ability.id, name: ability.name, icon: ability.icon || '⬆️',
            turns, atkMod: power,
          });
          log(`${actor.name}: ${ability.name} (+${Math.round(power * 100)}% атаки, ${turns} хода)`, cls);
          toast(`${ability.name}: +${Math.round(power * 100)}% атаки`);
        }
        break;
      }
      case 'dot': {
        // Player must click target; enemies may auto-pick
        if ((!target || !target.alive) && actor.side === 'enemy') target = lowest(foes);
        if (!target || !target.alive) {
          log(ability.name + ': нужна цель (клик по врагу)', 'system');
          toast('Нужна цель');
          break;
        }
        if (!target.buffs) target.buffs = [];
        fxTargets = [target];
        playSkillAnim(actor, ability, fxTargets);
        const school = abilityDamageSchool(actor, ability);
        const dotCtx = {
          type: 'dot', isDot: true, abilityId: ability.id, abilityName: ability.name, school,
          isFinisher: FINISHER_IDS.has(ability.id),
        };
        // Snapshot mastery into DoT ticks (crit only on initial hit)
        let tick;
        if (ability.flat != null && Number.isFinite(Number(ability.flat))) {
          tick = periodicTickFromFlat(actor, ability.flat);
        } else {
          tick = Math.max(1, Math.round(eff.atk * power * 0.4));
        }
        if (actor.side === 'ally' && !actor.isPet) {
          tick = Math.round(tick * masteryDmgMult(actor, { ...dotCtx, skipCrit: true }));
        } else if (actor.isPet && actor.ownerUid) {
          const owner = run?.party?.find(p => p.uid === actor.ownerUid);
          tick = Math.round(tick * masteryPetMult(owner));
        }
        if (!Number.isFinite(tick) || tick < 1) tick = Math.max(1, Math.round(eff.atk * 0.05));
        const turns = PERIODIC_ROUNDS;
        applyStatus(target, {
          id: 'dot_' + ability.id, name: ability.name, icon: ability.icon || '☠️',
          turns, dot: tick, fromUid: actor.uid, periodic: true, school,
        });
        const hitRaw = ability.flat != null && Number.isFinite(Number(ability.flat))
          ? abilityDamageRaw(actor, { flat: Number(ability.flat) * 0.5 })
          : Math.max(1, Math.round(eff.atk * power * 0.5));
        const dealt = dealDmg(target, hitRaw, actor, dotCtx);
        log(`${actor.name}: ${ability.name} → ${target.name} (−${fmt(dealt)}, период. ${fmt(tick)}/р · ${turns}р)`, cls);
        toast(`${ability.name} на ${target.name} · ${turns}р`);
        break;
      }
      case 'debuff': {
        const turns = Number(ability.buffTurns) || 3;
        if (ability.enemyDmgMod != null || ability.id === 'demo_shout') {
          const mod = Number(ability.enemyDmgMod != null ? ability.enemyDmgMod : power) || 0.15;
          fxTargets = foes.slice();
          playSkillAnim(actor, ability, fxTargets);
          for (const e of foes) {
            if (!e.alive) continue;
            applyStatus(e, {
              id: 'deb_' + ability.id, name: ability.name, icon: ability.icon || '😨',
              turns, atkMod: -Math.abs(mod),
            });
          }
          log(`${actor.name}: ${ability.name} — враги −${Math.round(Math.abs(mod)*100)}% · ${turns}х`, cls);
          break;
        }
        target = target || pick(foes);
        if (!target) return;
        fxTargets = [target];
        playSkillAnim(actor, ability, fxTargets);
        applyStatus(target, {
          id: 'deb_' + ability.id, name: ability.name, icon: ability.icon || '⬇️',
          turns, atkMod: -Math.abs(power), defMod: -0.1,
        });
        log(`${actor.name}: ${ability.name} → ${target.name} (−${Math.round(Math.abs(power) * 100)}% атаки)`, cls);
        break;
      }
      case 'summon': {
        playSkillAnim(actor, ability, []);
        if (actor.side === 'enemy' && combat) {
          const m = scaleEnemy(pick(ENEMIES.trash), run.keyLevel, false, false);
          m.name = 'Слуга'; m.maxHp = Math.round(m.maxHp * 0.65); m.hp = m.maxHp;
          combat.enemies.push(m);
          log(actor.name + ' призывает слугу', 'enemy');
        } else if (actor.side === 'ally' && combat) {
          const list = PET_SUMMONS[ability.id] || [{ def: 'imp', n: 1, turns: 3 }];
          for (const s of list) {
            for (let i = 0; i < (s.n || 1); i++) addPet(actor, s.def, s.turns ?? 3);
          }
        }
        break;
      }
      default:
        // purifying by id if type not cleanse
        if (ability.id === 'purifying') {
          playSkillAnim(actor, ability, [actor]);
          const before = actor.stagger || 0;
          const pct = ability.purifyPct != null ? Number(ability.purifyPct) : 1;
          const cleared = before > 0 ? Math.max(1, Math.round(before * Math.min(1, pct))) : 0;
          actor.stagger = Math.max(0, before - cleared);
          if (cleared > 0) actor.purifyCleared = (actor.purifyCleared || 0) + cleared;
          log(`${actor.name}: ${ability.name} — −${fmt(cleared)} шат`, 'heal');
          break;
        }
        playSkillAnim(actor, ability, target ? [target] : []);
        break;
    }

    // Spells that summon pets on top of their main effect (Hand of Gul'dan, Shadowfiend, etc.)
    if (actor.side === 'ally' && combat && PET_SUMMONS[ability.id] && ability.type !== 'summon') {
      for (const s of PET_SUMMONS[ability.id]) {
        for (let i = 0; i < (s.n || 1); i++) addPet(actor, s.def, s.turns ?? 3);
      }
    }
    // Dark Transformation — buff owned ghoul
    if (ability.id === 'dark_trans' && actor.side === 'ally') {
      for (const p of petsOf(actor)) {
        applyStatus(p, { id: 'dark_trans', name: 'Тёмное превращение', icon: '👹', turns: 3, atkMod: 0.35 });
        log(`${p.name} усилен!`, 'player');
      }
    }
    // Bestial Wrath — also buff pet
    if (ability.id === 'bestial' && actor.side === 'ally') {
      for (const p of petsOf(actor)) {
        applyStatus(p, { id: 'bestial', name: 'Звериный гнев', icon: '😤', turns: 3, atkMod: 0.3 });
      }
    }
    // Felstorm — pet AOE if felguard present
    if (ability.id === 'felstorm' && actor.side === 'ally') {
      const pets = petsOf(actor);
      const pet = pets.find(p => p.petKey === 'felguard') || pets[0];
      if (pet && foes.length) {
        playSkillAnim(pet, ability, foes);
        for (const t of foes.slice()) {
          const d = dealDmg(t, Math.round(getEff(pet).atk * 1.05), pet, {
            type: 'aoe', isAoe: true, abilityId: 'felstorm', abilityName: ability.name || 'Буря Скверны', isPet: true,
          });
          log(`${pet.name}: Буря Скверны → ${t.name} (−${fmt(d)})`, 'player');
        }
      }
    }

    // handle kick by id even if type is debuff
    if (INTERRUPT_IDS.has(ability.id) && ability.type !== 'interrupt') {
      const t = target || foes.find(e => e.casting);
      if (t?.casting) interruptCast(t, actor);
    }

    // Self-buffs from ability data (Вихрь → «Широкий размах»)
    if (ability.grantSelfBuff && actor.alive) {
      const g = ability.grantSelfBuff;
      const stacks = Math.max(1, Number(g.stacks) || 1);
      applyStatus(actor, {
        id: g.id,
        name: g.name || ability.name,
        icon: g.icon || ability.icon || '✨',
        turns: Math.max(1, Number(g.turns) || 99),
        stacks,
        tip: g.tip || '',
      });
      log(`${actor.name}: +${g.name || g.id}${stacks > 1 ? ' ×' + stacks : ''}`, cls);
      if (g.id === 'wide_sweep') floatText(actor.uid, 'широкий размах', 'buff');
    }

    // Списание зарядов «следующие N способностей» (не для самого баффа, который их даёт)
    if (!ability.abilityCharges && actor.buffs && actor.buffs.length) {
      let changed = false;
      for (const b of actor.buffs) {
        if (b.abilityCharges == null) continue;
        b.abilityCharges = Number(b.abilityCharges) - 1;
        changed = true;
      }
      if (changed) {
        actor.buffs = actor.buffs.filter(b => b.abilityCharges == null || b.abilityCharges > 0);
      }
    }

    // freeAction: ход игрока не заканчивается (afterAction смотрит флаг)
    if (ability.freeAction && actor.side === 'ally' && !actor.isPet) {
      combat._keepPlayerTurn = true;
    }
  }

  /**
   * Изобретатель: в конце хода — шанс (=% иск.) «Гений инженерии»:
   * основной питомец бьёт с +200% урона (×3) в режиме СТ/АОЕ.
   */
  function tryTinkererGenius(actor) {
    if (!actor || !combat || actor.classId !== 'engineer' || actor.specId !== 'tinkerer') return;
    if (!actor.alive) return;
    const pet = getMainPet(actor, false);
    if (!pet) return;
    const chance = masteryPct(actor); // база 0 при 0 рейтинга; при 120 → 0.12
    if (!(chance > 0) || Math.random() >= chance) return;
    const foes = living('enemy');
    if (!foes.length) return;
    applyStatus(pet, {
      id: 'genius_tune',
      name: 'Гений инженерии',
      icon: '⚙️',
      turns: 1,
      tip: '+200% урон',
    });
    const raw = Math.max(1, Math.round(getEff(pet).atk * 1.05 * 3));
    const aoe = pet.attackMode === 'aoe';
    if (aoe) {
      let total = 0;
      for (const e of foes.slice()) {
        if (!e.alive) continue;
        total += dealDmg(e, raw, pet, {
          type: 'aoe', isAoe: true, isPet: true,
          abilityName: 'Гений инженерии', abilityId: 'genius_tune',
        });
      }
      log(`${actor.name}: Гений инженерии → ${pet.name} АОЕ (−${fmt(total)} сумм.)`, 'player');
    } else {
      const t = lowest(foes);
      const d = dealDmg(t, raw, pet, {
        type: 'damage', isPet: true,
        abilityName: 'Гений инженерии', abilityId: 'genius_tune',
      });
      log(`${actor.name}: Гений инженерии → ${pet.name} → ${t.name} (−${fmt(d)})`, 'player');
    }
    toast('⚙️ Гений инженерии!');
    floatText(pet.uid, 'гений!', 'buff');
  }


  function applyArmorStack(unit, ability) {
    if (!unit || !ability || !ability.armorMod) return;
    const turns = Number(ability.buffTurns) || 3;
    const maxS = Number(ability.armorStacksMax) || 99;
    const stackId = 'armor_' + (ability.id || 'x');
    if (!unit.buffs) unit.buffs = [];
    const existing = unit.buffs.filter(b => b && b.id === stackId);
    if (existing.length >= maxS) {
      for (const b of existing) b.turns = turns;
      log(unit.name + ': броня обновлена (' + existing.length + '×)', 'system');
      return;
    }
    applyStatus(unit, {
      id: stackId,
      name: 'Броня' + (ability.name ? ' · ' + ability.name : ''),
      icon: '🛡️',
      turns,
      armorMod: Number(ability.armorMod) || 0,
    });
    log(unit.name + ': +' + Math.round((Number(ability.armorMod) || 0) * 100) + '% брони · ' + turns + 'х', 'system');
  }

  function triggerProtRevenge(tank) {
    if (!tank || !tank.alive || !combat) return;
    if (combat._revengeLock) return;
    combat._revengeLock = true;
    try {
      const ab = (tank.abilities || []).find(a => a.id === 'revenge');
      if (!ab) return;
      const foes = living(tank.side === 'ally' ? 'enemy' : 'ally');
      if (!foes.length) return;
      const raw = abilityDamageRaw(tank, ab);
      const ctx = { type: 'aoe', isAoe: true, abilityId: 'revenge', school: 'physical', skipBlock: true, freeRevenge: true };
      try { playSkillAnim(tank, ab, foes.slice()); } catch (_) {}
      for (const e of foes.slice()) {
        if (!e.alive) continue;
        const dealt = dealDmg(e, raw, tank, ctx);
        if (dealt) log(tank.name + ': Реванш (блок) → ' + e.name + ' (−' + fmt(dealt) + ')', 'player');
      }
    } finally {
      combat._revengeLock = false;
    }
  }

  function partyHasSpiritLink() {
    return (run?.party || []).some(p =>
      p && p.alive && !p.isPet && (p.buffs || []).some(b => b && b.id === 'spirit_link' && (b.turns == null || b.turns > 0))
    );
  }

  /**
   * Spirit Link: выровнять % HP всего отряда.
   * Вызывается при касте тотема и после КАЖДОГО удара (dealDmg/dealTrue),
   * который нанёс урон союзнику — 5 ударов = до 5 выравниваний.
   */
  function equalizePartyHpByPct(reason) {
    if (!run?.party) return;
    // не выравнивать, если тотем уже истёк
    if (!partyHasSpiritLink()) return;
    const allies = run.party.filter(p => p && p.alive && !p.isPet && p.maxHp > 0);
    if (allies.length < 2) return;
    const ratios = allies.map(p => p.hp / p.maxHp);
    const minR = Math.min(...ratios);
    const maxR = Math.max(...ratios);
    // нет просадки (все почти на одном %) — тихий выход
    if (maxR - minR < 0.005) return;
    const avg = ratios.reduce((s, r) => s + r, 0) / ratios.length;
    let moved = 0;
    for (const p of allies) {
      const want = Math.max(1, Math.min(p.maxHp, Math.round(p.maxHp * avg)));
      moved += Math.abs(want - p.hp);
      p.hp = want;
    }
    if (moved > 0) {
      log(`Духовная связь: HP выровнены по %${reason ? ' ← удар ' + reason : ''}`, 'heal');
      for (const p of allies) floatText(p.uid, 'связь', 'heal');
    }
  }

  function dealDmg(target, raw, attacker, ctx) {
    if (!target?.alive) return 0;
    if (attacker && attacker.buffs && attacker.buffs.length) {
      let cut = 0;
      for (const b of attacker.buffs) {
        if (b && b.enemyDmgMod) cut += Number(b.enemyDmgMod) || 0;
      }
      if (cut > 0) raw = Math.max(1, Math.round(raw * (1 - Math.min(0.9, cut))));
    }
    // Хмелевар: уклон только от прямого ST (не AoE, не DoT)
    if (target.side === 'ally' && target.classId === 'monk' && target.specId === 'brewmaster' && raw > 0) {
      const isAoeHit = !!(ctx && (ctx.isAoe || ctx.type === 'aoe' || ctx.type === 'cast_aoe'));
      const isDotHit = !!(ctx && (ctx.isDot || ctx.type === 'dot'));
      if (!isAoeHit && !isDotHit) {
        const dodgeChance = brewTotalDodgeChance(target);
        if (dodgeChance > 0 && Math.random() < dodgeChance) {
          clearBrewLucky(target);
          floatText(target.uid, 'уклон!', 'buff');
          log(`${target.name}: уклонение! (Ещё повезёт сброшен)`, 'heal');
          return 0;
        }
        // промах уклона — стак «Ещё повезёт» после получения удара (ниже, когда dmg>0)
        target._pendingLuckyStack = true;
      }
    }
    // Школа удара: physical vs magic (fire/frost/shadow/…)
    let school = (ctx && ctx.school) || null;
    if (!school && attacker && ctx && ctx.abilityId) {
      const ab = (attacker.abilities || []).find(a => a.id === ctx.abilityId);
      if (ab) school = abilityDamageSchool(attacker, ab);
    }
    if (!school && attacker) school = abilityDamageSchool(attacker, null);
    if (!school) school = 'physical';
    // Броня: физ. режется сильно, магия — слабо (тип урона влияет на геймплей)
    const armorFactor = isPhysicalSchool(school) ? 0.5 : 0.12;
    let dmg = Math.max(1, raw - Math.floor(getEff(target).def * armorFactor));
    if (isPhysicalSchool(school)) {
      let armorPct = 0;
      try { armorPct += passiveArmorMod(target); } catch (_) {}
      if (target.buffs && target.buffs.length) {
        for (const b of target.buffs) {
          if (b && b.armorMod) armorPct += Number(b.armorMod) || 0;
        }
      }
      if (armorPct > 0) dmg = Math.max(1, Math.round(dmg * (1 - Math.min(0.85, armorPct))));
    }
    if (target.buffs && target.buffs.length) {
      let dr = 0;
      for (const b of target.buffs) {
        if (b && b.dmgReduce) dr += Number(b.dmgReduce) || 0;
      }
      if (dr > 0) dmg = Math.max(1, Math.round(dmg * (1 - Math.min(0.9, dr))));
    }
    // Блок: база 0%. Пассивка «Щит с озона» даёт +15%. Иск. Защиты воина — сверху.
    // Сила блока −35% фиксирована (баффы могут добавить blockValueAdd).
    if (
      attacker && attacker.side === 'enemy' && target.side === 'ally'
      && !target.isPet && isPhysicalSchool(school) && !(ctx && ctx.skipBlock)
    ) {
      let blockChance = 0;
      try { blockChance += passiveBlockChance(target); } catch (_) {}
      // Искусность «Критический блок» (Защита воина) добавляет шанс
      if (target.classId === 'warrior' && target.specId === 'protection') {
        try { blockChance += masteryPct(target); } catch (_) {}
      }
      let blockValue = 0.35;
      // База парирования: воин Защита +5%; пассивки (ДК Кровь «Кровяной клинок» +15%)
      let parryChance = (target.classId === 'warrior' && target.specId === 'protection') ? 0.05 : 0;
      try { parryChance += passiveParryChance(target); } catch (_) {}
      for (const b of (target.buffs || [])) {
        if (!b) continue;
        if (b.blockChanceAdd) blockChance += Number(b.blockChanceAdd) || 0;
        if (b.blockValueAdd) blockValue += Number(b.blockValueAdd) || 0;
        if (b.parryChanceAdd) parryChance += Number(b.parryChanceAdd) || 0;
      }
      if (blockChance > 0 || parryChance > 0) {
        blockChance = Math.min(0.85, blockChance);
        parryChance = Math.min(0.75, parryChance);
        blockValue = Math.min(0.75, blockValue);
        const roll = Math.random();
        if (parryChance > 0 && roll < parryChance) {
          log((target.name || 'Танк') + ': Парирование!', 'player');
          floatText(target.uid, 'парир!', 'buff');
          return 0;
        }
        if (roll < parryChance + blockChance) {
          dmg = Math.max(1, Math.round(dmg * (1 - blockValue)));
          log((target.name || 'Танк') + ': Блок (−' + Math.round(blockValue * 100) + '%)', 'player');
          if (target.classId === 'warrior' && target.specId === 'protection') {
            try { triggerProtRevenge(target); } catch (e) { console.error(e); }
          }
        }
      }
    }
    // Уязвимость (Удар колосса): +% входящего; physOnly → только физ. школы
    if (target.buffs && target.buffs.length) {
      let vuln = 0;
      for (const b of target.buffs) {
        if (!b || !b.dmgTakenMod) continue;
        if (b.physOnly && !isPhysicalSchool(school)) continue;
        vuln += Number(b.dmgTakenMod) || 0;
      }
      if (vuln) dmg = Math.max(1, Math.round(dmg * (1 + vuln)));
    }
    // Pets take 90% less damage (glass support units)
    if (target.isPet) dmg = Math.max(1, Math.round(dmg * 0.1));
    // Mastery on attacker (heroes); pets use owner
    if (attacker) {
      if (attacker.isPet && attacker.ownerUid) {
        const owner = run?.party?.find(p => p.uid === attacker.ownerUid);
        dmg = Math.round(dmg * masteryPetMult(owner));
      } else if (attacker.side === 'ally' && !attacker.isPet) {
        dmg = Math.round(dmg * masteryDmgMult(attacker, ctx || {}));
        // Elemental Overload: chance for extra hit
        const mi = masteryInfo(attacker.classId, attacker.specId);
        if (mi.kind === 'multi' && Math.random() < masteryPct(attacker) * 0.55) {
          dmg = Math.round(dmg * 1.3);
        }
      }
    }
    // Incoming DR: vers + tank mastery
    if (target.side === 'ally') {
      dmg = Math.round(dmg * versInDmgMult(target) * masteryTankInMult(target));
    }
    let crit = false;
    // Pets inherit owner sec → critChance/critMult work; enemies keep flat values
    let cChance = attacker && attacker.side === 'ally' ? critChance(attacker) : 0.12;
    if (attacker && ctx && ctx.abilityId) {
      const abC = (attacker.abilities || []).find(a => a.id === ctx.abilityId);
      if (abC && abC.critBonus) cChance = Math.min(0.9, cChance + Number(abC.critBonus));
    }
    const cMul = attacker && attacker.side === 'ally' ? critMult(attacker) : 1.5;
    if (Math.random() < cChance) { dmg = Math.round(dmg * cMul); crit = true; }
    if (target.shield > 0) {
      const a = Math.min(target.shield, dmg);
      target.shield -= a; dmg -= a;
    }
    // Brewmaster Stagger: часть урона в пул (не сразу в HP)
    if (dmg > 0 && target.side === 'ally' && target.classId === 'monk' && target.specId === 'brewmaster') {
      let frac = 0.35;
      for (const b of (target.buffs || [])) {
        if (b && b.staggerBonus) frac += Number(b.staggerBonus) || 0;
      }
      frac = Math.min(0.75, frac);
      const cap = Math.round(target.maxHp * 2);
      const toStagger = Math.min(Math.round(dmg * frac), Math.max(0, cap - (target.stagger || 0)));
      if (toStagger > 0) {
        target.stagger = (target.stagger || 0) + toStagger;
        dmg -= toStagger;
      }
    }
    if (dmg <= 0) {
      if (target._pendingLuckyStack) target._pendingLuckyStack = false;
      if (target.stagger > 0) floatText(target.uid, 'шат ' + fmt(target.stagger), 'dmg');
      updateBossFrame();
      updateVignette();
      return 0;
    }
    // Хмелевар: стак «Ещё повезёт» после прямого ST-урона
    if (target._pendingLuckyStack) {
      target._pendingLuckyStack = false;
      try { addBrewLuckyStack(target); } catch (e) { console.error(e); }
    }
    target.hp -= dmg;
    floatText(target.uid, (crit ? 'КРИТ ' : '') + '−' + fmt(dmg), crit ? 'crit' : 'dmg');
    pulseUnit(target.uid, 'hit');
    if (crit) flashScreen(true);
    sfx(crit ? 'crit' : 'hit');
    // Prot warrior: +3 rage per direct hit taken (not DoTs / dealTrue)
    if (
      target.side === 'ally' && !target.isPet
      && target.classId === 'warrior' && target.specId === 'protection'
      && target.res?.primary?.type === 'rage'
    ) {
      target.res.primary.current = clamp(target.res.primary.current + 3, 0, target.res.primary.max);
      floatText(target.uid, '+3 ярость', 'buff');
    }
    // Engineer: факт атаки питомца → 3–7 пара (1× за действие, не за каждую цель AoE)
    if (attacker && attacker.isPet && target.side === 'enemy' && dmg > 0) {
      try { maybeEngineerPetPair(attacker); } catch (_) {}
    }
    if (target.hp <= 0) { target.hp = 0; killUnit(target, attacker); }
    else if (target.isBoss) checkBossPhase(target);
    // Spirit Link: каждый удар, что нанёс урон союзнику (5 ударов → до 5 выравниваний)
    if (dmg > 0 && target.side === 'ally' && !target.isPet && partyHasSpiritLink()) {
      try { equalizePartyHpByPct(target.name); } catch (e) { console.error('[spirit_link]', e); }
    }
    // Threat: tanks generate heavy agro so mobs stay on them
    if (attacker && attacker.side === 'ally' && target.side === 'enemy') {
      const mult = attacker.role === 'tank' ? 6.5
        : (attacker.isPet ? 0.35 : (attacker.role === 'healer' ? 0.55 : 0.7));
      addThreat(target, attacker.isPet
        ? (run?.party?.find(p => p.uid === attacker.ownerUid) || attacker)
        : attacker, dmg * mult);
    }
    updateBossFrame();
    updateVignette();
    meterOnDamage(attacker, target, dmg, ctx || null);
    return dmg;
  }
  function dealTrue(t, d, source, floatKind, ctx) {
    if (!t?.alive) return 0;
    // DoT-тики тоже учитывают слом брони (физ. кровотечения под Колоссом)
    const school = (ctx && ctx.school) || 'physical';
    if (t.buffs && t.buffs.length) {
      let vuln = 0;
      for (const b of t.buffs) {
        if (!b || !b.dmgTakenMod) continue;
        if (b.physOnly && !isPhysicalSchool(school)) continue;
        vuln += Number(b.dmgTakenMod) || 0;
      }
      if (vuln) d = Math.max(1, Math.round(d * (1 + vuln)));
    }
    // True damage still respects vers/tank mastery for allies
    if (t.side === 'ally') d = Math.round(d * versInDmgMult(t) * masteryTankInMult(t));
    if (t.isPet) d = Math.max(1, Math.round(d * 0.1));
    if (!(d > 0)) return 0;
    t.hp -= d;
    floatText(t.uid, '−' + fmt(d), floatKind || 'dmg');
    pulseUnit(t.uid, 'hit');
    if (t.hp <= 0) { t.hp = 0; killUnit(t, source || null); }
    updateVignette();
    meterOnDamage(source || null, t, d, ctx || null);
    // Spirit Link: DoT/true — тоже выравнивать после каждой просадки
    if (d > 0 && t.side === 'ally' && !t.isPet && partyHasSpiritLink()) {
      try { equalizePartyHpByPct(t.name); } catch (e) { console.error('[spirit_link]', e); }
    }
    return d;
  }
  function healUnit(t, amount, healer, opts) {
    if (!t?.alive) return 0;
    // opts.exact — flat «т» из таблицы без mastery/vers/loot поверх
    // opts.noEcho — не вешать «Выбор света» (тики HoT)
    // opts.abilityId / abilityName / sourceName / isHot / lifesteal — для Recount
    if (healer && healer.side === 'ally' && !(opts && opts.exact)) {
      amount = Math.round(amount * versHealMult(healer) * masteryHealMult(healer, t) * (run?.healLootMult || 1));
      if (combat) {
        for (const e of living('enemy')) addThreat(e, healer, amount * 0.12);
      }
    } else if (healer && healer.side === 'ally' && opts && opts.exact && combat) {
      for (const e of living('enemy')) addThreat(e, healer, amount * 0.12);
    }
    const b = t.hp;
    const wasInjured = b < t.maxHp;
    t.hp = clamp(t.hp + amount, 0, t.maxHp);
    const healed = t.hp - b;
    if (healed > 0) {
      const isCrit = !!(opts && opts.crit);
      floatText(t.uid, (isCrit ? 'КРИТ +' : '+') + fmt(healed), isCrit ? 'crit' : 'heal');
      pulseUnit(t.uid, 'healed');
      sfx(isCrit ? 'crit' : 'heal');
      if (isCrit) try { flashScreen(true); } catch (_) {}
      meterOnHeal(healer, t, healed, opts || null);
      if (healed > 0 && t.classId === 'monk' && t.specId === 'brewmaster') {
        const chance = (typeof critChance === 'function') ? critChance(healer || t) : 0.15;
        if (Math.random() < chance) {
          const tick = Math.max(1, Math.round(healed * 0.75 / 5));
          applyStatus(t, {
            id: 'brew_gift', name: 'Дар хмелевара', icon: '🍵',
            turns: 5, hot: tick, fromUid: (healer || t).uid, periodic: true,
          });
          log(`${t.name}: крит-хил → период. леч. ${fmt(tick)}/р · 5р`, 'heal');
        }
      }
      // Holy paladin mastery: «Выбор света» — HoT % от объёма хила, 2 хода
      if (
        healer && healer.side === 'ally' && !healer.isPet
        && healer.classId === 'paladin' && healer.specId === 'holy'
        && wasInjured && !(opts && (opts.exact || opts.noEcho))
      ) {
        const pct = masteryPct(healer);
        if (pct > 0) {
          const echoTotal = Math.max(1, Math.round(healed * pct));
          const tick = Math.max(1, Math.round(echoTotal / 2));
          // refresh / replace existing light_choice on this target
          t.buffs = (t.buffs || []).filter(x => !x || x.id !== 'light_choice');
          applyStatus(t, {
            id: 'light_choice',
            name: 'Выбор света',
            icon: '✨',
            turns: 2,
            hot: tick,
            fromUid: healer.uid,
            periodic: true,
          });
          log(`${t.name}: Выбор света ${fmt(tick)}/р · 2р (от хила ${fmt(healed)})`, 'heal');
        }
      }
    }
    updateVignette();
    return healed;
  }
  function killUnit(unit) {
    if (unit.side === 'ally' && !unit.isPet && unit.classId === 'shaman' && unit.specId === 'restoration'
        && run && !run.restoRebirthUsed) {
      run.restoRebirthUsed = true;
      unit.alive = true;
      unit.hp = Math.max(1, Math.round(unit.maxHp * 0.6));
      if (unit.res?.primary?.type === 'mana') unit.res.primary.current = Math.round(unit.res.primary.max * 0.6);
      unit.shield = 0; unit.casting = null;
      floatText(unit.uid, 'возрождение!', 'heal');
      log(`${unit.name}: Возрождение 60% здоровья/маны (1× за ключ)`, 'heal');
      toast('Возрождение шамана!');
      return;
    }
    unit.alive = false; unit.hp = 0; unit.shield = 0; unit.casting = null;
    pulseUnit(unit.uid, 'dying');
    log((unit.isPet ? 'Питомец ' : '') + unit.name + ' погибает', 'system');
    // Pets: no death penalty. Основных (постоянных) оставляем как «труп» для воскрешения.
    if (unit.isPet) {
      if (combat?.pets) {
        const keepMain = unit.isMainPet || unit.petTurnsLeft == null;
        if (!keepMain) {
          combat.pets = combat.pets.filter(p => p.uid !== unit.uid);
        }
      }
      return;
    }
    if (unit.side === 'ally') {
      run.deaths++;
      const tax = run.deathTax != null ? run.deathTax : DEATH_PENALTY;
      run.timerLeft = Math.max(0, run.timerLeft - tax);
      log(`Смерть: −${tax}с таймера`, 'system');
      // Kill pets of dead hero
      if (combat?.pets) {
        for (const p of combat.pets.filter(x => x.ownerUid === unit.uid && x.alive)) {
          p.alive = false; p.hp = 0;
          log(`${p.name} отступает`, 'system');
        }
      }
      updateHud();
      saveRun();
    }
    if (unit.side === 'enemy') {
      if (unit.forcesValue) {
        const before = run.forces || 0;
        run.forces = Math.min(FORCES_MAP_BUDGET, Math.round((before + unit.forcesValue) * 10) / 10);
        const gained = Math.round((run.forces - before) * 10) / 10;
        if (gained > 0) log(`⚔ +${gained}% сил (всего ${Math.round(run.forces)}/${FORCES_TARGET})`, 'system');
        updateHud();
      }
      if (hasEffect('bolster')) {
        combat.bolsterKills = (combat.bolsterKills || 0) + 1;
        let pct = affixValue('bolster', 0.15);
        if (combat.bolsterKills >= 2) {
          pct *= 1.5;
          toast('Усиливающий ×1.5 — фокусите!');
          log('Усиливающий: мульти-килл → усиление ×1.5', 'enemy');
        }
        living('enemy').forEach(e => {
          if (!e.alive) return;
          const add = Math.round(e.maxHp * pct);
          e.maxHp += add; e.hp += add; e.atk = Math.round(e.atk * 1.08);
          applyStatus(e, { id: 'bolster_buff', name: 'Усиление', icon: '💪', turns: 99, atkMod: 0.08, dispellable: true, school: 'enrage' });
        });
      }
      // Bursting: stacks instead of flat nuke
      if (hasEffect('burst')) {
        addBurstStacks(1);
        log('Взрывной: +1 стек на отряд (очистите!)', 'enemy');
        toast('💥 Взрывной +1');
      }
      if (hasEffect('spite') && Math.random() < 0.45 && combat) {
        const g = scaleEnemy({ id: 'sp', name: 'Злоба', icon: '👻', role: 'dps', hp: 42, atk: 11 + run.keyLevel, def: 0, speed: 14, mana: 0,
          abilities: [{ id: 'h', name: 'Месть', cost: 0, cd: 0, type: 'damage', power: 1 }] }, run.keyLevel, false, false);
        g.ignorePrio = true;
        combat.enemies.push(g);
        log('Злоба: появился дух мести!', 'system');
      }
      // Sanguine: dead body heals nearby enemies
      if (hasEffect('sanguine') && combat) {
        const pct = affixValue('sanguine', 0.12);
        living('enemy').forEach(e => {
          const heal = Math.round(e.maxHp * pct);
          e.hp = clamp(e.hp + heal, 0, e.maxHp);
          floatText(e.uid, '+' + fmt(heal), 'heal');
        });
        log('Кровавый: враги исцеляются от трупа', 'enemy');
      }
    }
  }
  function checkBossPhase(boss) {
    if (!boss.phases) return;
    const ratio = boss.hp / boss.maxHp;
    let idx = 0;
    for (let i = 0; i < boss.phases.length; i++) {
      if (i === 0 || ratio <= boss.phases[i].at) idx = i;
    }
    if (idx !== boss.phaseIndex) {
      boss.phaseIndex = idx;
      const ph = boss.phases[idx];
      boss.abilities = ph.abilities.map(a => ({
        id: a.id, name: a.name, icon: '✨', cost: a.cost || 0, gen: 0, costSec: 0, genSec: 0,
        costRunes: null, genRunic: 0, cd: a.cd || 0, baseCd: a.cd || 0, curCd: 0,
        type: a.type, power: a.power || 1, desc: '',
        castKind: a.castKind || null, castPrio: a.castPrio || 0,
      }));
      log('Фаза: ' + ph.name, 'enemy');
      toast(boss.name + ': ' + ph.name);
    }
  }
  function lowest(list) {
    if (!list?.length) return null;
    return list.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  }

  function aiAct(actor) {
    if (!actor.alive) return;
    if (isStunned(actor)) {
      log(actor.name + ' оглушён — пропуск хода', 'system');
      return;
    }
    // resolve pending cast via Telegraph Engine
    if (actor.side === 'enemy' && actor.casting) {
      resolveCasting(actor);
      return;
    }

    const foes = actor.side === 'ally' ? living('enemy') : livingHeroes();
    const friends = actor.side === 'ally' ? livingHeroes() : living('enemy');
    // Pets: simple auto-attack (режим attackMode: st|aoe — «Отладка»)
    if (actor.isPet) {
      if (actor.attackMode === 'aoe' && foes.length) {
        const raw = Math.max(1, Math.round(getEff(actor).atk * 0.95));
        let total = 0;
        for (const e of foes.slice()) {
          if (!e.alive) continue;
          total += dealDmg(e, raw, actor, {
            type: 'aoe', isAoe: true, isPet: true, abilityName: 'Залп', abilityId: 'pet_aoe_mode',
          });
        }
        log(`${actor.name}: залп АОЕ (−${fmt(total)})`, 'player');
        maybeDemoPetShard(actor);
        try { maybeEngineerPetPair(actor); } catch (_) {}
        return;
      }
      const ab = actor.abilities.find(a => a.curCd <= 0 && (a.type === 'aoe' || a.type === 'heal' || (a.type === 'damage' && a.power >= 1.2)))
        || actor.abilities.find(a => a.curCd <= 0)
        || actor.abilities[0];
      if (!ab) return;
      if (ab.type === 'aoe') {
        castAbility(actor, ab, null);
        maybeDemoPetShard(actor);
        return;
      }
      if (ab.type === 'heal' || ab.type === 'heal_aoe') {
        const injured = living('ally').filter(u => !u.isPet && u.alive && u.hp < u.maxHp);
        const ht = lowest(injured) || lowest(living('ally').filter(u => !u.isPet));
        if (ht) castAbility(actor, ab, ht);
        return;
      }
      let tt = null;
      if (actor.petKey === 'scrap_bot' && actor.ownerUid) {
        const owner = run?.party?.find(p => p.uid === actor.ownerUid);
        if (owner?.lastAttackUid) tt = living('enemy').find(e => e.uid === owner.lastAttackUid) || null;
      }
      tt = tt || lowest(foes) || pick(foes);
      if (!tt) return;
      castAbility(actor, ab, tt);
      maybeDemoPetShard(actor);
      return;
    }
    const usable = actor.abilities.filter(a => canPay(actor, a));
    if (!usable.length) return;

    // interrupt casters / stun casters
    if (actor.side === 'ally') {
      const casting = foes.find(e => e.casting);
      const kick = usable.find(a => a.type === 'interrupt' || INTERRUPT_IDS.has(a.id));
      if (casting && kick && Math.random() < 0.8) {
        castAbility(actor, kick, casting);
        return;
      }
      const stun = usable.find(a => a.type === 'cc');
      if (casting && stun && !kick && Math.random() < 0.5) {
        castAbility(actor, stun, casting);
        return;
      }
      // dispel burst stacks
      if (actor.role === 'healer') {
        const stacked = friends.find(f => (f.burstStacks || 0) >= 2);
        const disp = usable.find(a => a.type === 'dispel');
        if (stacked && disp && Math.random() < 0.7) {
          castAbility(actor, disp, stacked);
          return;
        }
      }
      const enraged = foes.find(e => e.enraged);
      const purge = usable.find(a => a.type === 'purge');
      if (enraged && purge && Math.random() < 0.65) {
        castAbility(actor, purge, enraged);
        return;
      }
    }

    // Ally healer/DPS AI removed — player picks targets. Enemy healers still auto.
    if (actor.role === 'healer' && actor.side === 'enemy') {
      const hurt = lowest(friends.filter(f => !f.isPet)) || lowest(friends);
      const healAb = usable.find(a => a.type === 'heal' || a.type === 'heal_aoe');
      if (hurt && hurt.hp / hurt.maxHp < 0.85 && healAb) {
        castAbility(actor, healAb, abilityTargetRule(healAb) === 'self_only' ? actor : hurt);
        return;
      }
    }
    if (actor.role === 'tank') {
      const agroOnHealer = foes.some(e => {
        const ft = e.buffs.find(b => b.forceTarget);
        return !ft || run.party.find(p => p.uid === ft.forceTarget)?.role === 'healer';
      });
      const taunt = usable.find(a => a.type === 'taunt');
      if (taunt && (agroOnHealer || Math.random() < 0.35)) { castAbility(actor, taunt, null); return; }
      // Local defs always on self
      const sh = usable.find(a => (a.type === 'shield' || a.type === 'cleanse') && abilityTargetRule(a) === 'self_only');
      if (sh && (actor.hp / actor.maxHp < 0.55 || (actor.stagger || 0) > actor.maxHp * 0.2)) {
        castAbility(actor, sh, actor);
        return;
      }
    }

    // start cast sometimes for enemies (telegraph) — prefer high-priority kicks
    if (actor.side === 'enemy' && !isSilenced(actor)) {
      const casts = usable.filter(a => a.type === 'cast_aoe')
        .sort((a, b) => (b.castPrio || 0) - (a.castPrio || 0));
      const castAb = casts[0];
      const p = actor.isBoss ? 0.58 : (actor.isElite ? 0.48 : 0.38);
      // escalate cast rate if previous kicks were missed
      const boost = Math.min(0.25, (actor.missedKicks || 0) * 0.08);
      if (castAb && Math.random() < p + boost) { castAbility(actor, castAb, null); return; }
    }

    const aoe = usable.find(a => a.type === 'aoe');
    if (aoe && foes.length >= 3 && Math.random() < 0.55) { castAbility(actor, aoe, null); return; }

    let target = null;
    if (actor.side === 'enemy') {
      // Threat table + sticky tank: mobs hit the tank far more often
      const tank = livingHeroes().find(a => a.role === 'tank');
      target = getThreatTarget(actor);
      if (!target) {
        target = tank || lowest(livingHeroes());
        if (target) addThreat(actor, target, 500);
      }
      // Soft bias: even if someone pulled slightly, ~70% still swing tank if alive
      if (tank && target && target.uid !== tank.uid) {
        const tThreat = actor.threat?.[target.uid] || 0;
        const tankThreat = actor.threat?.[tank.uid] || 0;
        if (tThreat < tankThreat * 2.2 && Math.random() < 0.72) {
          target = tank;
        }
      }
      // Rare boss glance at 2nd threat only when tank is very stable
      if (actor.isBoss && tank && target?.uid === tank.uid && livingHeroes().length > 1 && Math.random() < 0.08) {
        const sorted = livingHeroes().slice().sort((a, b) =>
          (actor.threat?.[b.uid] || 0) - (actor.threat?.[a.uid] || 0));
        if (sorted[1]) target = sorted[1];
      }
    } else {
      // Ally DPS: only used by pets/edge paths — keep simple pick, no auto-DoT spam
      const exec = usable.find(a => EXECUTE_IDS.has(a.id));
      const low = foes.find(e => e.hp / e.maxHp <= 0.35);
      if (exec && low) { castAbility(actor, exec, low); return; }
      const bestByPower = (list) => list.slice().sort((a, b) => (b.power || 0) - (a.power || 0))[0];
      if (actor.res.secondary && actor.res.secondary.current < actor.res.secondary.max - 1) {
        const builders = usable.filter(a => a.genSec > 0 || a.genRunic > 0);
        const builder = bestByPower(builders.filter(a => a.type === 'damage' || a.type === 'aoe'))
          || bestByPower(builders);
        if (builder) {
          castAbility(actor, builder, lowest(foes));
          return;
        }
      }
      const secNeed = actor.res.secondary?.type === 'combo' ? 3 : (actor.res.secondary?.type === 'runic_power' ? 35 : 2);
      if (actor.res.secondary && actor.res.secondary.current >= secNeed) {
        const fins = usable.filter(a => a.costSec > 0 || FINISHER_IDS.has(a.id));
        const fin = bestByPower(fins);
        if (fin) { castAbility(actor, fin, lowest(foes)); return; }
      }
      if (actor.res.primary && ['rage', 'focus', 'energy'].includes(actor.res.primary.type)
          && actor.res.primary.current < actor.res.primary.max * 0.35) {
        const gens = usable.filter(a => a.gen > 0);
        const g = bestByPower(gens);
        if (g) { castAbility(actor, g, lowest(foes)); return; }
      }
      target = lowest(foes);
    }
    // Prefer strongest affordable non-execute damage (not first in list)
    const dmgPool = usable.filter(a => (a.type === 'damage' || a.type === 'dot') && !EXECUTE_IDS.has(a.id));
    const dmg = dmgPool.slice().sort((a, b) => (b.power || 0) - (a.power || 0))[0]
      || usable.find(a => a.type === 'damage') || usable[0];
    castAbility(actor, dmg, target);
  }

  function afterAction() {
    if (!combat || combat.over) return;
    const keep = !!combat._keepPlayerTurn;
    combat._keepPlayerTurn = false;
    pendingTarget = null;
    try { clearRuneHighlight(); } catch (_) {}

    // freeAction: тот же герой ходит ещё раз (Рывок / Рёв / Берсерк)
    if (keep) {
      if (checkEnd()) return;
      const actor = currentActor();
      if (actor && actor.side === 'ally' && !actor.isPet && actor.alive) {
        combat.waitingPlayer = true;
        try {
          renderCombat();
          showAbilities(actor);
          saveRun();
          return;
        } catch (err) {
          console.error('[afterAction freeAction]', err);
          // не зависаем — обычный конец хода
        }
      }
      // keep не удался (нет актора / ошибка UI) → проваливаемся в обычный afterAction
    }

    // Конец хода героя: «Гений инженерии» у изобретателя
    try {
      const fin = currentActor();
      if (fin && fin.side === 'ally' && !fin.isPet) tryTinkererGenius(fin);
    } catch (e) { console.error(e); }

    combat.waitingPlayer = false;
    const bar = document.getElementById('ability-bar');
    const actions = document.getElementById('combat-actions');
    if (bar) bar.innerHTML = '';
    try { hidePassivePocket(); } catch (_) {}
    if (actions) actions.innerHTML = '';
    if (checkEnd()) return;
    combat.turnIndex++;
    try { renderCombat(); } catch (err) { console.error('[afterAction render]', err); }
    saveRun();
    scheduleProcessTurn(Math.max(60, Math.round(180 / gameSpeed)));
  }

  function checkEnd() {
    if (!living('enemy').length) {
      combat.over = true;
      log('Пулл зачищен — идём дальше (без полного восстановления)', 'system');
      // M+ feel: tiny bandage of MISSING hp only (not % max), no mana fill
      run.party.forEach(p => {
        if (p.alive) {
          const missing = p.maxHp - p.hp;
          p.hp = clamp(p.hp + Math.round(missing * 0.06), 0, p.maxHp);
        }
      });
      if (combat.pets) combat.pets = [];
      renderCombat();
      setTimeout(() => onVictory(), 550);
      return true;
    }
    if (!livingHeroes().length) {
      combat.over = true;
      endRun(false, 'Вайп. Ключ провален.');
      return true;
    }
    return false;
  }

  function grantLoot(done) {
    // Gear draft 1 of 3 (+ assign to hero); rare chance at old power loot
    if (Math.random() < 0.18) {
      openLootDraft(typeof done === 'function' ? done : null);
    } else {
      openGearDraft(typeof done === 'function' ? done : null);
    }
  }

  function onVictory() {
    if (run.finished) return;
    const node = currentRouteNode();
    const type = node?.type || 'trash';
    const afterLoot = () => {
      // Always go through advanceRoom — it handles final/mopup/branches
      const offer = type === 'elite' || type === 'boss' || type === 'final' || Math.random() < 0.45;
      if (offer && (run.talents || []).length < 8 && !node?.mopup) {
        openTalent(() => advanceRoom());
      } else {
        advanceRoom();
      }
    };
    if (type === 'boss' || type === 'final' || type === 'elite') {
      grantLoot(afterLoot);
    } else {
      afterLoot();
    }
  }

  let talentDoneCb = null;
  let restBusy = false;

  function finishTalentPick(talent) {
    const modal = document.getElementById('talent-modal');
    if (modal) modal.classList.add('hidden');
    if (talent) {
      try {
        if (!run.talents) run.talents = [];
        if (!run.talents.some(t => t.id === talent.id)) {
          run.talents.push(talent);
          applyTalentStats();
          renderPowers();
          toast(talent.name);
        }
      } catch (e) { console.error(e); }
    }
    const cb = talentDoneCb;
    talentDoneCb = null;
    if (typeof cb === 'function') {
      try { cb(); } catch (e) {
        console.error(e);
        advanceRoom();
      }
    }
  }

  function openTalent(done) {
    talentDoneCb = typeof done === 'function' ? done : null;
    try {
      const owned = new Set((run.talents || []).map(t => t.id));
      const pool = TALENTS.filter(t => !owned.has(t.id));
      const picks = [];
      const available = pool.slice();
      while (picks.length < 3 && available.length) {
        const idx = Math.floor(Math.random() * available.length);
        picks.push(available.splice(idx, 1)[0]);
      }
      if (!picks.length) {
        finishTalentPick(null);
        return;
      }
      const modal = document.getElementById('talent-modal');
      const grid = document.getElementById('talent-grid');
      grid.innerHTML = '';
      picks.forEach(t => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'talent-card rarity-' + t.rarity;
        btn.innerHTML = `<div style="font-size:1.4rem">${t.icon}</div><b>${t.name}</b><div style="font-size:.8rem;color:var(--muted)">${t.desc}</div>`;
        btn.addEventListener('click', () => finishTalentPick(t));
        grid.appendChild(btn);
      });
      modal.classList.remove('hidden');
    } catch (e) {
      console.error(e);
      finishTalentPick(null);
    }
  }

  function doRest(kind) {
    if (!run || run.finished || restBusy) return;
    const node = currentRouteNode();
    if (!node || node.type !== 'rest') return;
    restBusy = true;
    document.getElementById('rest-modal').classList.add('hidden');
    try {
      if (kind === 'heal') {
        // Not a full wipe reset — bandage + partial mana (like food/water between packs)
        run.party.forEach(p => {
          if (p.hp <= 0) { p.alive = true; p.hp = Math.round(p.maxHp * 0.35); }
          else {
            p.alive = true;
            const missing = p.maxHp - p.hp;
            p.hp = clamp(p.hp + Math.round(missing * 0.55), 1, p.maxHp);
          }
          if (p.res?.primary?.type === 'mana') {
            p.res.primary.current = clamp(p.res.primary.current + Math.round(p.res.primary.max * 0.45), 0, p.res.primary.max);
          } else if (p.res?.primary?.type === 'energy' || p.res?.primary?.type === 'focus') {
            p.res.primary.current = p.res.primary.max;
          } else if (p.res?.runes) {
            p.res.runes.blood = [true, true];
            p.res.runes.frost = [true, true];
            p.res.runes.unholy = [true, true];
            p.res.runes.cd = [];
            p.res.primary.current = 6;
          } else if (p.res?.primary) {
            p.res.primary.current = clamp(p.res.primary.current + 20, 0, p.res.primary.max);
          }
        });
        toast('Отдых: ~половина недостающего HP + мана');
        log('Привал: частичное восстановление (не full HP/мана).', 'heal');
      } else if (kind === 'buff') {
        run.party.forEach(p => {
          if (p.alive) {
            const missing = p.maxHp - p.hp;
            p.hp = clamp(p.hp + Math.round(missing * 0.2), 0, p.maxHp);
          }
        });
        run.restBuffBattles = 2;
        toast('+15% атаки на 2 боя');
        log('Настрой: +15% атаки на 2 боя (мало хила).', 'system');
      } else {
        toast('Дальше без отдыха!');
        log('Отряд идёт дальше без лечения.', 'system');
      }
    } catch (e) {
      console.error(e);
    }
    // Always offer talent then advance — never soft-lock on rest room
    openTalent(() => {
      restBusy = false;
      advanceRoom();
    });
  }

  function renderCombat() {
    renderAllies();
    renderEnemies();
    updateBossFrame();
    updateVignette();
  }

  /** Only toggles selection/active classes — no full DOM rebuild (no flicker). */
  function updateUnitSelectionOnly() {
    const actor = currentActor();
    document.querySelectorAll('.unit').forEach(el => {
      const id = el.dataset.uid;
      const u = allUnits().find(x => x.uid === id);
      if (!u) return;
      el.classList.toggle('active', !!(actor && actor.uid === id));
      const ab = pendingTarget && pendingTarget.ability;
      const targeting = pendingTarget && (() => {
        const r = abilityTargetRule(ab);
        if (r === 'ally_any') return u.side === 'ally' && !u.isPet;
        if (r === 'enemy') {
          if (u.side !== 'enemy') return false;
          // Молот гнева / казни: только ≤35% HP
          if (EXECUTE_IDS.has(ab.id)) return (u.hp / Math.max(1, u.maxHp)) <= 0.35;
          return true;
        }
        if (r === 'ally_or_enemy') return !u.isPet && (u.side === 'ally' || u.side === 'enemy');
        return false;
      })();
      el.classList.toggle('selected-target', !!targeting);
      // Явная подсветка «можно казнь»
      el.classList.toggle('execute-valid', !!(
        pendingTarget && ab && EXECUTE_IDS.has(ab.id)
        && u.side === 'enemy' && u.alive
        && (u.hp / Math.max(1, u.maxHp)) <= 0.35
      ));
      el.classList.toggle('execute-invalid', !!(
        pendingTarget && ab && EXECUTE_IDS.has(ab.id)
        && u.side === 'enemy' && u.alive
        && (u.hp / Math.max(1, u.maxHp)) > 0.35
      ));
    });
    document.querySelectorAll('.pet-port').forEach(el => {
      el.classList.toggle('active', !!(actor && actor.uid === el.dataset.uid));
    });
  }

  function petPortraitHtml(p, actor) {
    const hpPct = clamp(p.hp / Math.max(1, p.maxHp) * 100, 0, 100);
    const active = actor && actor.uid === p.uid;
    const dead = !p.alive || p.hp <= 0;
    const timer = p.petTurnsLeft != null
      ? `<span class="pet-timer">${p.petTurnsLeft}</span>` : '';
    const title = [
      p.name,
      `${fmt(p.hp)}/${fmt(p.maxHp)} HP`,
      `атака ${fmt(p.atk)}`,
      p.petTurnsLeft != null ? `${p.petTurnsLeft} р. осталось` : 'постоянный',
    ].join(' · ');
    return `<div class="pet-port${active ? ' active' : ''}${dead ? ' dead' : ''}" data-uid="${p.uid}" title="${title}">
      ${artHtml(ASSETS.petP(p.petKey || 'imp'), p.icon || '🐾', 'pet-face')}
      ${timer}
      <div class="pet-hp"><i style="width:${hpPct}%"></i></div>
    </div>`;
  }

  function renderAllies() {
    const row = document.getElementById('ally-row');
    const actor = currentActor();
    // Heroes as full cards; pets as mini portraits under their owner
    row.innerHTML = run.party.map(hero => {
      const pets = petsOf(hero);
      // Always same stack size; pet-row only when pets exist (absolute, outside card)
      const petRow = pets.length
        ? `<div class="pet-row">${pets.map(p => petPortraitHtml(p, actor)).join('')}</div>`
        : `<div class="pet-row" aria-hidden="true"></div>`;
      return `<div class="unit-stack">${unitCard(hero, actor)}${petRow}</div>`;
    }).join('');
    row.querySelectorAll('.unit').forEach(el => {
      el.addEventListener('click', () => {
        const u = run.party.find(p => p.uid === el.dataset.uid);
        if (u) onUnitClick(u);
      });
    });
    row.querySelectorAll('.pet-port').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = (combat?.pets || []).find(x => x.uid === el.dataset.uid);
        if (!p) return;
        toast(`${p.icon} ${p.name}: ${fmt(p.hp)}/${fmt(p.maxHp)}` +
          (p.petTurnsLeft != null ? ` · ${p.petTurnsLeft} р.` : ''));
      });
    });
  }
  function renderEnemies() {
    const row = document.getElementById('enemy-row');
    if (!combat) { row.innerHTML = ''; return; }
    const actor = currentActor();
    row.innerHTML = combat.enemies.map(u => unitCard(u, actor)).join('');
    row.querySelectorAll('.unit').forEach(el => {
      el.addEventListener('click', () => {
        const u = combat.enemies.find(p => p.uid === el.dataset.uid);
        if (u) onUnitClick(u);
      });
    });
  }

  function unitCard(u, actor) {
    const hpPct = clamp(u.hp / u.maxHp * 100, 0, 100);
    // ДК: под HP показываем силу рун, а не счётчик 6 рун
    const isDkRunes = !!(u.res?.runes && u.res.secondary?.type === 'runic_power');
    let resPct;
    let resType;
    let resLabel;
    if (isDkRunes) {
      const rp = u.res.secondary;
      resPct = rp.max ? clamp(rp.current / rp.max * 100, 0, 100) : 0;
      resType = 'runic_power';
      resLabel = (rp.icon || '💙') + ' ' + Math.floor(rp.current);
    } else {
      resPct = u.res.primary.max ? clamp(u.res.primary.current / u.res.primary.max * 100, 0, 100) : 0;
      resType = u.res.primary.type;
      resLabel = (u.res.primary.icon || '') + ' ' + Math.floor(u.res.primary.current);
    }
    const active = actor && actor.uid === u.uid;
    const targeting = pendingTarget && (() => {
      const r = abilityTargetRule(pendingTarget.ability);
      if (r === 'ally_any') return u.side === 'ally' && !u.isPet;
      if (r === 'enemy') return u.side === 'enemy';
      if (r === 'ally_or_enemy') return !u.isPet && (u.side === 'ally' || u.side === 'enemy');
      return false;
    })();
    const castKind = u.casting?.kind || '';
    const teleHtml = u.casting
      ? `<div class="tele-badge ${castKind === 'buster' ? 'buster' : castKind === 'aoe' ? 'aoe' : 'kick'}">${telegraphLabel(u.casting)}</div>`
      : '';
    const topThreat = u.side === 'enemy' ? topThreatUid(u) : null;
    const tankUid = run?.party?.find(p => p.role === 'tank')?.uid;
    const threatHtml = (u.side === 'enemy' && topThreat)
      ? `<div class="threat-chip${topThreat === tankUid ? ' tanking' : ''}">${topThreat === tankUid ? 'ТАНК' : 'ВТОР.'}</div>`
      : '';
    const burstHtml = (u.burstStacks || 0) > 0
      ? `<div class="burst-chip">💥${u.burstStacks}</div>` : '';
    const markHtml = u.thunderMark ? `<div class="mark-chip">⚡ метка</div>` : '';
    // Only render rune/sec slots when present — empty slots collapse via CSS :empty
    let runesHtml = '';
    if (u.res.runes) {
      const r = u.res.runes;
      // ready = руна доступна (тускло); hl навешивается при hover/выборе скилла
      const mk = (cls, on) =>
        `<i class="rune ${cls}${on ? ' ready' : ''}" data-ready="${on ? '1' : '0'}"></i>`;
      runesHtml = '<div class="slot-runes runes-row">' +
        r.blood.map(on => mk('b', on)).join('') +
        r.frost.map(on => mk('f', on)).join('') +
        r.unholy.map(on => mk('u', on)).join('') +
        '</div>';
    }
    // Вторичный ресурс текстом — кроме ДК (сила рун уже в полоске под HP)
    const sec = (u.res.secondary && !isDkRunes)
      ? `<div class="slot-sec res-text">${u.res.secondary.icon} ${u.res.secondary.current}/${u.res.secondary.max}</div>`
      : '';
    // All buffs/debuffs/DoTs/HoTs with remaining rounds (same strip for everyone)
    const buffs = (u.buffs || [])
      .slice()
      .sort((a, b) => {
        const pa = (a.dot || a.hot) ? 2 : 1;
        const pb = (b.dot || b.hot) ? 2 : 1;
        return pb - pa;
      })
      .slice(0, 10)
      .map(b => {
        const bits = [b.name || ''];
        if (b.atkMod) bits.push((b.atkMod > 0 ? '+' : '') + Math.round(b.atkMod * 100) + '% атаки');
        if (b.defMod) bits.push((b.defMod > 0 ? '+' : '') + Math.round(b.defMod * 100) + '% DEF');
        if (b.dmgTakenMod) {
          bits.push('+' + Math.round(b.dmgTakenMod * 100) + '%' + (b.physOnly ? ' физ.' : '') + ' урон');
        }
        if (b.abilityCharges != null) bits.push(b.abilityCharges + ' удар' + (b.abilityCharges === 1 ? '' : 'а'));
        if (b.stacks) bits.push('×' + b.stacks);
        if (b.armorMod) bits.push('+' + Math.round(Number(b.armorMod) * 100) + '% брони');
        if (b.tip) bits.push(b.tip);
        if (b.dot) bits.push(fmt(b.dot) + '/р период.');
        if (b.hot) bits.push(fmt(b.hot) + '/р леч.');
        const showTurns = b.turns != null && b.turns < 90;
        if (showTurns) bits.push(b.turns + 'р');
        let kind = 'is-buff';
        if (b.dot) kind = 'is-dot';
        else if (b.hot) kind = 'is-hot';
        else if ((b.atkMod && b.atkMod < 0) || (b.defMod && b.defMod < 0) || b.ccMode) kind = 'is-debuff';
        // стаки (Ещё повезёт / ярость / Щит света) — число на иконке; иначе ходы
        const n = (b.stacks)
          ? `<i class="buff-n">${b.stacks}</i>`
          : (showTurns ? `<i class="buff-n">${b.turns}</i>` : '');
        return `<span class="buff ${kind}" title="${bits.filter(Boolean).join(' · ')}">${b.icon || '•'}${n}</span>`;
      }).join('');
    const castingCls = u.casting
      ? ' casting' + (castKind === 'buster' ? ' tg-buster' : castKind === 'aoe' ? ' tg-aoe' : ' tg-kick')
      : '';
    const low = u.alive && u.hp / u.maxHp < 0.3 ? ' low-hp' : '';
    const cc = (u.side === 'ally' && typeof classAccentColor === 'function')
      ? classAccentColor(u.classId, u.specId)
      : (CLASS_CSS[u.classId] || (u.side === 'enemy' ? '#a04040' : 'var(--gold)'));
    const castBar = u.casting
      ? `<div class="slot-cast"><div class="cast-bar" title="${telegraphLabel(u.casting)}"><i></i></div><div class="cast-name">${telegraphLabel(u.casting)}</div></div>`
      : '';
    const shieldHtml = u.shield
      ? `<div class="slot-shield bar-wrap"><div class="bar shield"><i style="width:${clamp(u.shield / u.maxHp * 100, 0, 100)}%"></i></div><span class="bar-label">🛡${fmt(u.shield)}</span></div>`
      : (u.stagger > 0
        ? `<div class="slot-shield bar-wrap"><div class="bar" style="background:#3a2810"><i style="width:${clamp(u.stagger / u.maxHp * 100, 0, 100)}%;background:linear-gradient(90deg,#c97a2a,#8a4010)"></i></div><span class="bar-label">шат ${fmt(u.stagger)}</span></div>`
        : '');
    const ico = u.side === 'ally' ? (u.icon || '⚔') : (u.icon || '💀');
    const roleLabel = (u.isElite ? '◆ Элита · ' : '') + (ROLE_LABEL[u.role] || u.role) + (u.enraged ? ' 🔥' : '');
    const pSrc = portraitSrc(u);
    const portraitHtml = pSrc
      ? artHtml(pSrc, ico, 'portrait')
      : `<div class="portrait"><span>${ico}</span></div>`;
    const kickPrio = u.casting && (u.casting.kind === 'kick' || (u.casting.castPrio || 0) >= 3) ? ' kick-prio' : '';
    const resBarTitle = isDkRunes
      ? `title="Сила рун ${Math.floor(u.res.secondary.current)}/${u.res.secondary.max}"`
      : '';
    return `<div class="unit ${u.side === 'ally' ? 'ally' : 'enemy'}${u.alive ? '' : ' dead'}${active ? ' active' : ''}${targeting ? ' selected-target' : ''}${castingCls}${low}${kickPrio}" data-uid="${u.uid}" style="--cc:${cc}">
      ${threatHtml}${teleHtml}${burstHtml}${markHtml}
      ${portraitHtml}
      <div class="u-name" title="${u.fullName || u.name}">${u.fullName || u.name}</div>
      <div class="u-role ${ROLE_CLASS[u.role] || ''}">${roleLabel}</div>
      <div class="bar-wrap">
        <div class="bar hp${u.side === 'enemy' ? ' enemy-hp' : ''}"><i style="width:${hpPct}%"></i></div>
        <span class="bar-label">${fmt(u.hp)}/${fmt(u.maxHp)}</span>
      </div>
      ${shieldHtml}
      <div class="bar-wrap" ${resBarTitle}>
        <div class="bar res ${resType}"><i style="width:${resPct}%"></i></div>
        <span class="bar-label">${resLabel}</span>
      </div>
      ${sec}${runesHtml}${castBar}
      <div class="buffs">${buffs}</div>
    </div>`;
  }
