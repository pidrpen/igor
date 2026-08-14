/* raid: 10-man raid test (Тест only) */
  const RAID_SIZE = 10;
  const RAID_NEED = { tank: 2, healer: 2, dps: 6 };
  let gameMode = 'key'; // 'key' | 'raid'
  let raidAutoAllies = true;
  let raidPlayerUid = null;

  const RAID_DUNGEON = {
    id: 'throne',
    name: 'Престол Грома',
    theme: 'rift',
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

  function setGameMode(mode) {
    const next = mode === 'raid' ? 'raid' : 'key';
    if (gameMode === next) {
      syncRaidLobbyUi();
      return;
    }
    gameMode = next;
    if (party.length > getPartySize()) party = party.slice(0, getPartySize());
    editSlot = null;
    syncRaidLobbyUi();
    renderParty();
    refreshAffixes();
    refreshKeystone();
    savePartyProfile();
  }

  function syncRaidLobbyUi() {
    const raid = isRaidLobby();
    document.body.classList.toggle('raid-lobby', raid);
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
    document.getElementById('btn-mode-key')?.addEventListener('click', () => setGameMode('key'));
    document.getElementById('btn-mode-raid')?.addEventListener('click', () => setGameMode('raid'));
    document.getElementById('btn-fill-raid')?.addEventListener('click', fillRaidPreset);
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
    if (!el) return;
    el.innerHTML = 'Смена танков по «Перегрузке» · бейте Проводников СТ · соки молний живыми · кикайте касты';
  }

  function raidAllyAi(actor) {
    if (!actor?.alive) return false;
    const foes = living('enemy');
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
    const kick = usable.find(a => a.type === 'interrupt' || (typeof INTERRUPT_IDS !== 'undefined' && INTERRUPT_IDS.has(a.id)));
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
