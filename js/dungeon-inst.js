/* dungeon-inst: составы паков по комнате + механики инста. Только Тест. */
(function () {
  function instTheme() { return run?.dungeon?.theme || null; }
  function instKey() { return +(run?.keyLevel || 2); }
  function instNode() { return (typeof currentRouteNode === 'function') ? currentRouteNode() : null; }
  function instCombat() {
    if (!combat) combat = {};
    if (!combat.inst) {
      combat.inst = {
        theme: instTheme(), pressure: 0, heat: 0, hallHeat: 0, roundAcc: 0,
        grab: null, reflectUid: null, soak: null, coal: null,
      };
    }
    return combat.inst;
  }
  function ss() { return (typeof STAT_SCALE === 'number') ? STAT_SCALE : 1000; }
  function trueDmg(t, pct, src, name, school) {
    if (!t || !t.alive) return;
    const raw = Math.max(1, Math.round(t.maxHp * pct));
    if (typeof dealTrue === 'function') dealTrue(t, raw, src || null, 'dot', { school: school || 'shadow', abilityName: name });
    else { t.hp = Math.max(0, t.hp - raw); if (t.hp <= 0 && typeof killUnit === 'function') killUnit(t, src || null); }
  }
  function partyTrue(pct, src, name, school) {
    (typeof livingHeroes === 'function' ? livingHeroes() : []).forEach(h => trueDmg(h, pct, src, name, school));
  }
  function isAoeCtx(ctx) {
    return !!(ctx && (ctx.isAoe || ctx.type === 'aoe' || ctx.type === 'cast_aoe' || ctx.isDot || ctx.type === 'dot'));
  }
  function hasWall(u) { return typeof hasMajorDef === 'function' && hasMajorDef(u); }
  function seniorEnemy() {
    const list = (combat?.enemies || []).filter(e => e.alive && !e.instObject && e.instRole !== 'reflect');
    return list.find(e => e.isBoss) || list.find(e => e.isElite) || list[0] || null;
  }
  function paintAura(host, id, name, icon, stacks, tip) {
    if (!host) return;
    host.buffs = host.buffs || [];
    let b = host.buffs.find(x => x.id === id);
    if (!b) {
      if (typeof applyStatus === 'function') {
        applyStatus(host, { id, name, icon, turns: 99, stacks: stacks || 0, tip: tip || name });
        b = host.buffs.find(x => x.id === id);
      } else {
        b = { id, name, icon, turns: 99, stacks: stacks || 0, tip: tip || name };
        host.buffs.push(b);
      }
    }
    if (b) { b.stacks = stacks || 0; b.turns = 99; b.name = name; }
  }

  function cloneAb(a) {
    return {
      id: a.id, name: a.name, icon: a.icon || '✨', cost: a.cost || 0, cd: a.cd || 0,
      type: a.type, power: a.power, school: a.school || null,
      castKind: a.castKind || null, castPrio: a.castPrio || 0, instFlag: a.instFlag || null,
    };
  }
  function U(o) {
    return {
      id: o.id, name: o.name, icon: o.icon, role: o.role || 'dps',
      hp: o.hp, atk: o.atk, def: o.def || 3, speed: o.speed || 10, mana: o.mana || 20,
      abilities: (o.abilities || []).map(cloneAb),
      instRole: o.instRole || null, instObject: !!o.instObject, mech: o.mech || null,
    };
  }

  const UNITS = {
    tide: {
      archer: () => U({ id: 'a', name: 'Коралловый стрелок', icon: '🏹', hp: 76, atk: 15, def: 2, speed: 12,
        abilities: [
          { id: 'h', name: 'Гарпун', cost: 0, cd: 0, type: 'damage', power: 1.20, school: 'physical' },
          { id: 'v', name: 'Залп соли', cost: 10, cd: 3, type: 'aoe', power: 0.52, school: 'frost' },
        ] }),
      priest: () => U({ id: 'm', name: 'Жрец глубин', icon: '🔮', role: 'healer', hp: 80, atk: 12, def: 2, speed: 10, mana: 50,
        abilities: [
          { id: 'b', name: 'Волна', cost: 0, cd: 0, type: 'damage', power: 1.00, school: 'frost' },
          { id: 'h', name: 'Исцеление глубин', cost: 12, cd: 2, type: 'heal', power: 0.32 },
          { id: 'c', name: 'Гимн моря', cost: 12, cd: 2, type: 'cast_aoe', power: 0.80, castKind: 'kick', castPrio: 4, school: 'frost', instFlag: 'tide_hymn' },
        ] }),
      tentacle: () => U({ id: 'th', name: 'Щупальце', icon: '🌊', role: 'tank', hp: 150, atk: 18, def: 8, speed: 7, instRole: 'tentacle',
        abilities: [
          { id: 't', name: 'Хватка', cost: 0, cd: 0, type: 'damage', power: 1.60, school: 'physical', instFlag: 'tide_grab' },
          { id: 's', name: 'Шквал', cost: 10, cd: 2, type: 'aoe', power: 0.72, school: 'frost', instFlag: 'tide_squall' },
        ] }),
      oracle: () => U({ id: 'pl', name: 'Оракул прилива', icon: '🐚', role: 'healer', hp: 185, atk: 17, def: 4, speed: 11, mana: 60, instRole: 'oracle',
        abilities: [
          { id: 'bolt', name: 'Волна', cost: 0, cd: 0, type: 'damage', power: 1.15, school: 'frost' },
          { id: 'h', name: 'Исцеление глубин', cost: 12, cd: 2, type: 'heal', power: 0.36 },
          { id: 'cast', name: 'Цунами', cost: 12, cd: 2, type: 'cast_aoe', power: 0.95, castKind: 'aoe', castPrio: 3, school: 'frost', instFlag: 'tide_tsunami' },
        ] }),
      guard: () => U({ id: 'b', name: 'Утопленный страж', icon: '💪', role: 'tank', hp: 345, atk: 23, def: 15, speed: 6, mana: 25, instRole: 'tide_guard',
        abilities: [
          { id: 's', name: 'Удар якорем', cost: 0, cd: 0, type: 'damage', power: 1.70, school: 'physical', instFlag: 'tide_anchor' },
          { id: 'exec', name: 'На дно', cost: 10, cd: 2, type: 'cast_aoe', power: 2.45, castKind: 'buster', castPrio: 2, school: 'physical' },
          { id: 'cast', name: 'Водоворот', cost: 12, cd: 2, type: 'cast_aoe', power: 0.95, castKind: 'kick', castPrio: 3, school: 'frost', instFlag: 'tide_hymn' },
        ] }),
      lagoon: () => U({ id: 'pl', name: 'Жрец лагуны', icon: '🐚', role: 'healer', hp: 290, atk: 18, def: 6, speed: 11, mana: 70, instRole: 'lagoon',
        abilities: [
          { id: 'bolt', name: 'Волна', cost: 0, cd: 0, type: 'damage', power: 1.30, school: 'frost' },
          { id: 'h', name: 'Исцеление глубин', cost: 12, cd: 2, type: 'heal', power: 0.40 },
          { id: 'cast', name: 'Гимн давления', cost: 12, cd: 2, type: 'cast_aoe', power: 0.80, castKind: 'kick', castPrio: 4, school: 'frost', instFlag: 'tide_hymn' },
        ] }),
    },
    jade: {
      student: () => U({ id: 'j', name: 'Ученик монастыря', icon: '🪓', hp: 85, atk: 15, def: 4, speed: 12,
        abilities: [
          { id: 'cleave', name: 'Удар ци', cost: 0, cd: 0, type: 'damage', power: 1.15 },
          { id: 'whirl', name: 'Вихрь листвы', cost: 10, cd: 3, type: 'aoe', power: 0.55, school: 'nature' },
        ] }),
      whisper: () => U({ id: 'sha', name: 'Шёпот ша', icon: '☯️', hp: 78, atk: 14, def: 2, speed: 11, mana: 40,
        abilities: [
          { id: 'bolt', name: 'Сомнение', cost: 0, cd: 0, type: 'damage', power: 1.10, school: 'shadow' },
          { id: 'cast', name: 'Смятение', cost: 12, cd: 3, type: 'cast_aoe', power: 0.80, castKind: 'kick', castPrio: 3, school: 'shadow', instFlag: 'jade_confuse' },
        ] }),
      guard: () => U({ id: 'c', name: 'Страж двора', icon: '🪖', role: 'tank', hp: 150, atk: 16, def: 10, speed: 7, instRole: 'jade_guard',
        abilities: [
          { id: 'c', name: 'Рассечение', cost: 0, cd: 0, type: 'damage', power: 1.45, school: 'physical' },
          { id: 's', name: 'Клич', cost: 10, cd: 3, type: 'buff', power: 0.25, instFlag: 'jade_shout' },
          { id: 'verdict', name: 'Нефритовый приговор', cost: 12, cd: 3, type: 'cast_aoe', power: 1.75, castKind: 'buster', castPrio: 2, school: 'physical', instFlag: 'jade_verdict' },
        ] }),
      guardChamp: () => U({ id: 'c', name: 'Страж двора', icon: '🪖', role: 'tank', hp: 315, atk: 18, def: 14, speed: 7, mana: 30, instRole: 'jade_guard',
        abilities: [
          { id: 'c', name: 'Рассечение', cost: 0, cd: 0, type: 'damage', power: 1.50, school: 'physical' },
          { id: 's', name: 'Клич', cost: 10, cd: 3, type: 'buff', power: 0.25, instFlag: 'jade_shout' },
          { id: 'verdict', name: 'Нефритовый приговор', cost: 12, cd: 3, type: 'cast_aoe', power: 1.85, castKind: 'buster', castPrio: 2, school: 'physical', instFlag: 'jade_verdict' },
          { id: 'cast', name: 'Смятение', cost: 12, cd: 3, type: 'cast_aoe', power: 0.85, castKind: 'kick', castPrio: 3, school: 'shadow', instFlag: 'jade_confuse' },
        ] }),
      shadow: () => U({ id: 'as', name: 'Тень ша', icon: '🗡️', hp: 175, atk: 22, def: 3, speed: 15, mana: 25, instRole: 'jade_shadow',
        abilities: [
          { id: 'stab', name: 'Удар в спину', cost: 0, cd: 0, type: 'damage', power: 1.40 },
          { id: 'poison', name: 'Яд сомнения', cost: 8, cd: 2, type: 'dot', power: 0.50, school: 'shadow' },
          { id: 'cast', name: 'Взрыв ци', cost: 12, cd: 3, type: 'cast_aoe', power: 0.88, castKind: 'kick', castPrio: 4, school: 'shadow' },
        ] }),
      stone: () => U({ id: 'sg', name: 'Каменный ученик', icon: '🗿', role: 'tank', hp: 315, atk: 19, def: 16, speed: 6, instRole: 'jade_stone',
        abilities: [
          { id: 'bash', name: 'Каменный кулак', cost: 0, cd: 0, type: 'damage', power: 1.50 },
          { id: 'exec', name: 'Дробление', cost: 10, cd: 2, type: 'damage', power: 2.00 },
          { id: 'cast', name: 'Взгляд камня', cost: 12, cd: 3, type: 'cast_aoe', power: 0.85, castKind: 'kick', castPrio: 3, instFlag: 'jade_gaze' },
        ] }),
    },
    crypt: {
      acolyte: () => U({ id: 'z', name: 'Костяной служка', icon: '🧟', hp: 96, atk: 14, def: 4, speed: 8, instRole: 'crypt_acolyte',
        abilities: [
          { id: 'h', name: 'Костяной удар', cost: 0, cd: 0, type: 'damage', power: 1.20, school: 'physical' },
          { id: 'dot', name: 'Гниль', cost: 8, cd: 3, type: 'dot', power: 0.50, school: 'shadow', instFlag: 'crypt_rot' },
        ] }),
      ritual: () => U({ id: 'r', name: 'Прах-ритуалист', icon: '📿', hp: 80, atk: 13, def: 2, speed: 10, mana: 40,
        abilities: [
          { id: 'bolt', name: 'Порча', cost: 0, cd: 0, type: 'damage', power: 1.10, school: 'shadow' },
          { id: 'nova', name: 'Вспышка праха', cost: 12, cd: 3, type: 'cast_aoe', power: 0.80, castKind: 'kick', castPrio: 3, school: 'shadow', instFlag: 'crypt_dust' },
        ] }),
      shroud: () => U({ id: 's', name: 'Ткач савана', icon: '🕷️', hp: 84, atk: 15, def: 2, speed: 13, mana: 25, instRole: 'crypt_shroud',
        abilities: [
          { id: 'bite', name: 'Укус', cost: 0, cd: 0, type: 'damage', power: 1.15 },
          { id: 'web', name: 'Саван', cost: 10, cd: 3, type: 'debuff', power: 0.16, instFlag: 'crypt_shroud' },
        ] }),
      mystic: () => U({ id: 'm', name: 'Могильный мистик', icon: '🔮', role: 'healer', hp: 76, atk: 12, def: 2, speed: 10, mana: 45,
        abilities: [
          { id: 'b', name: 'Тень', cost: 0, cd: 0, type: 'damage', power: 1.00, school: 'shadow' },
          { id: 'h', name: 'Тёмный хил', cost: 12, cd: 2, type: 'cast_aoe', power: 0.01, castKind: 'kick', castPrio: 2, instFlag: 'crypt_darkheal' },
        ] }),
      plate: () => U({ id: 'sg', name: 'Надгробный страж', icon: '🪖', role: 'tank', hp: 152, atk: 16, def: 11, speed: 6, instRole: 'crypt_plate',
        abilities: [
          { id: 's', name: 'Удар плиты', cost: 0, cd: 0, type: 'damage', power: 1.25, school: 'physical', instFlag: 'crypt_cleave' },
          { id: 'bash', name: 'Срыв плиты', cost: 10, cd: 3, type: 'cast_aoe', power: 1.75, castKind: 'buster', castPrio: 2, school: 'physical' },
          { id: 'wall', name: 'Надгробный щит', cost: 0, cd: 3, type: 'shield', power: 0.28, instFlag: 'crypt_plate_shield' },
        ] }),
      necro: () => U({ id: 'nk', name: 'Некромант склепа', icon: '💀', role: 'healer', hp: 182, atk: 17, def: 3, speed: 9, mana: 60, instRole: 'crypt_necro',
        abilities: [
          { id: 'bolt', name: 'Костяной шип', cost: 0, cd: 0, type: 'damage', power: 1.15, school: 'shadow' },
          { id: 'heal', name: 'Тёмное исцеление', cost: 12, cd: 2, type: 'cast_aoe', power: 0.01, castKind: 'kick', castPrio: 2, instFlag: 'crypt_darkheal' },
          { id: 'sum', name: 'Восставший', cost: 14, cd: 3, type: 'summon', power: 1, instFlag: 'crypt_echo_add' },
          { id: 'nova', name: 'Взрыв костей', cost: 12, cd: 3, type: 'cast_aoe', power: 0.88, castKind: 'kick', castPrio: 3 },
        ] }),
      pain: () => U({ id: 'pl', name: 'Ткач боли', icon: '🩸', hp: 190, atk: 21, def: 3, speed: 12, mana: 55, instRole: 'crypt_pain',
        abilities: [
          { id: 'lash', name: 'Плеть', cost: 0, cd: 0, type: 'damage', power: 1.25 },
          { id: 'dot', name: 'Агония', cost: 8, cd: 2, type: 'dot', power: 0.65, school: 'shadow' },
          { id: 'burst', name: 'Всплеск боли', cost: 12, cd: 3, type: 'cast_aoe', power: 0.95, castKind: 'aoe', castPrio: 3, instFlag: 'crypt_painsoak' },
        ] }),
      grave: () => U({ id: 'sg', name: 'Могильный страж', icon: '🗿', role: 'tank', hp: 315, atk: 21, def: 15, speed: 6, mana: 25, instRole: 'crypt_grave',
        abilities: [
          { id: 'bash', name: 'Сокрушение', cost: 0, cd: 0, type: 'damage', power: 1.50, instFlag: 'crypt_cleave' },
          { id: 'exec', name: 'Казнь стража', cost: 10, cd: 2, type: 'cast_aoe', power: 2.00, castKind: 'buster', castPrio: 2 },
          { id: 'wall', name: 'Костяная кожа', cost: 0, cd: 3, type: 'shield', power: 0.40, instFlag: 'crypt_bone_skin' },
          { id: 'cast', name: 'Обвал склепа', cost: 12, cd: 3, type: 'cast_aoe', power: 0.95, castKind: 'kick', castPrio: 3 },
        ] }),
      urn: () => U({ id: 'c', name: 'Хранитель урн', icon: '⚱️', hp: 285, atk: 18, def: 8, speed: 9, mana: 40, instRole: 'crypt_urn',
        abilities: [
          { id: 'h', name: 'Удар урны', cost: 0, cd: 0, type: 'damage', power: 1.45, school: 'shadow' },
          { id: 'cast', name: 'Хор праха', cost: 12, cd: 3, type: 'cast_aoe', power: 0.90, castKind: 'kick', castPrio: 3, instFlag: 'crypt_choir' },
        ] }),
    },
    forge: {
      pyro: () => U({ id: 'p', name: 'Искровой пиромант', icon: '🔥', hp: 74, atk: 14, def: 2, speed: 11, mana: 40,
        abilities: [
          { id: 'bolt', name: 'Огонь', cost: 0, cd: 0, type: 'damage', power: 1.10, school: 'fire' },
          { id: 'bomb', name: 'Живая бомба', cost: 12, cd: 3, type: 'cast_aoe', power: 0.78, castKind: 'kick', castPrio: 3, school: 'fire', instFlag: 'forge_kick' },
        ] }),
      bruiser: () => U({ id: 'b', name: 'Шлаковый громила', icon: '💪', role: 'tank', hp: 155, atk: 16, def: 9, speed: 6, instRole: 'forge_bruiser',
        abilities: [
          { id: 's', name: 'Шлаковый удар', cost: 0, cd: 0, type: 'damage', power: 1.40, school: 'fire', instFlag: 'forge_slag' },
          { id: 'bash', name: 'Ковочный удар', cost: 10, cd: 3, type: 'cast_aoe', power: 1.30, castKind: 'buster', castPrio: 2, school: 'fire', instFlag: 'forge_bash' },
        ] }),
      hammer: () => U({ id: 'j', name: 'Молотобоец', icon: '🪓', hp: 88, atk: 16, def: 5, speed: 9,
        abilities: [
          { id: 'cleave', name: 'Раскол', cost: 0, cd: 0, type: 'damage', power: 1.30 },
          { id: 'whirl', name: 'Вихрь искр', cost: 12, cd: 2, type: 'aoe', power: 0.70, school: 'fire' },
        ] }),
      sparkMaster: () => U({ id: 'nk', name: 'Мастер искр', icon: '⚒️', hp: 190, atk: 20, def: 6, speed: 10, mana: 45, instRole: 'forge_spark',
        abilities: [
          { id: 'h', name: 'Молот', cost: 0, cd: 0, type: 'damage', power: 1.30, school: 'fire' },
          { id: 'cast', name: 'Выброс жара', cost: 12, cd: 2, type: 'cast_aoe', power: 0.88, castKind: 'kick', castPrio: 3, school: 'fire', instFlag: 'forge_blast' },
        ] }),
      giant: () => U({ id: 'sg', name: 'Шлаковый исполин', icon: '🗿', role: 'tank', hp: 320, atk: 19, def: 16, speed: 5, instRole: 'forge_giant',
        abilities: [
          { id: 'bash', name: 'Раскалённый кулак', cost: 0, cd: 0, type: 'damage', power: 1.55, school: 'fire' },
          { id: 'exec', name: 'Проковка', cost: 10, cd: 2, type: 'cast_aoe', power: 1.50, castKind: 'buster', castPrio: 2, school: 'fire', instFlag: 'forge_bash' },
          { id: 'cast', name: 'Перекал', cost: 12, cd: 3, type: 'cast_aoe', power: 0.92, castKind: 'kick', castPrio: 4, school: 'fire', instFlag: 'forge_recal' },
        ] }),
      smith: () => U({ id: 'eq', name: 'Кователь горна', icon: '⚒️', hp: 300, atk: 21, def: 8, speed: 8, mana: 40, instRole: 'forge_smith',
        abilities: [
          { id: 'h', name: 'Молот наковальни', cost: 0, cd: 0, type: 'damage', power: 1.35, school: 'fire' },
          { id: 'bash', name: 'Закалочный удар', cost: 10, cd: 3, type: 'cast_aoe', power: 1.15, castKind: 'buster', castPrio: 2, school: 'fire', instFlag: 'forge_bash' },
          { id: 'cast', name: 'Искра горна', cost: 12, cd: 2, type: 'cast_aoe', power: 0.86, castKind: 'kick', castPrio: 3, school: 'fire', instFlag: 'forge_spark' },
        ] }),
    },
    ember: {
      coal: () => U({ id: 'p', name: 'Уголёк', icon: '🔥', hp: 78, atk: 14, def: 3, speed: 11, instRole: 'ember_coal',
        abilities: [
          { id: 'bolt', name: 'Искра', cost: 0, cd: 0, type: 'damage', power: 1.10, school: 'fire' },
          { id: 'aoe', name: 'Зола', cost: 10, cd: 2, type: 'aoe', power: 0.50, school: 'fire' },
        ] }),
      live: () => U({ id: 'p', name: 'Живой уголёк', icon: '🔥', hp: 43, atk: 12, def: 2, speed: 12, instRole: 'ember_live',
        abilities: [
          { id: 'bolt', name: 'Искра', cost: 0, cd: 0, type: 'damage', power: 1.00, school: 'fire' },
        ] }),
      brute: () => U({ id: 'b', name: 'Пепельный громила', icon: '💪', role: 'tank', hp: 172, atk: 16, def: 10, speed: 6, instRole: 'ember_brute',
        abilities: [
          { id: 's', name: 'Удар угля', cost: 0, cd: 0, type: 'damage', power: 1.40, school: 'fire', instFlag: 'ember_hit' },
          { id: 'slam', name: 'Обвал жара', cost: 10, cd: 3, type: 'cast_aoe', power: 0.85, castKind: 'buster', castPrio: 2, school: 'fire', instFlag: 'ember_slam' },
        ] }),
      berserk: () => U({ id: 'bz', name: 'Раскалённый берсерк', icon: '😤', hp: 210, atk: 21, def: 5, speed: 12, mana: 45, instRole: 'ember_berserk',
        abilities: [
          { id: 'hit', name: 'Яростный удар', cost: 0, cd: 0, type: 'damage', power: 1.30, school: 'fire', instFlag: 'ember_ragehit' },
          { id: 'rage', name: 'Берсерк', cost: 0, cd: 4, type: 'buff', power: 0.30 },
          { id: 'cast', name: 'Извержение', cost: 12, cd: 3, type: 'cast_aoe', power: 0.90, castKind: 'kick', castPrio: 3, school: 'fire', instFlag: 'ember_erupt' },
        ] }),
      colossus: () => U({ id: 'sp', name: 'Угольный колосс', icon: '🪨', role: 'tank', hp: 340, atk: 20, def: 16, speed: 5, instRole: 'ember_colossus',
        abilities: [
          { id: 'slam', name: 'Удар угля', cost: 0, cd: 0, type: 'damage', power: 1.55, school: 'fire', instFlag: 'ember_hit' },
          { id: 'exec', name: 'Раскал', cost: 10, cd: 2, type: 'damage', power: 2.10, school: 'fire' },
          { id: 'cast', name: 'Обвал жара', cost: 14, cd: 3, type: 'cast_aoe', power: 1.05, castKind: 'buster', castPrio: 2, school: 'fire', instFlag: 'ember_slam' },
        ] }),
    },
    rift: {
      shard: () => U({ id: 'w', name: 'Осколок пустоты', icon: '😈', hp: 80, atk: 15, def: 2, speed: 12, mana: 40, instRole: 'rift_shard',
        abilities: [
          { id: 'b', name: 'Луч хаоса', cost: 0, cd: 0, type: 'damage', power: 1.25, school: 'shadow' },
          { id: 'n', name: 'Искажение', cost: 12, cd: 3, type: 'cast_aoe', power: 0.82, castKind: 'kick', castPrio: 3, school: 'shadow' },
        ] }),
      crawler: () => U({ id: 'bz', name: 'Ползун разлома', icon: '🌑', hp: 152, atk: 16, def: 11, speed: 6, mana: 35, instRole: 'rift_crawler',
        abilities: [
          { id: 'hit', name: 'Разрыв', cost: 0, cd: 0, type: 'damage', power: 1.30 },
          { id: 'slam', name: 'Волна пустоты', cost: 10, cd: 2, type: 'aoe', power: 0.64, school: 'shadow' },
        ] }),
      guard: () => U({ id: 'eq', name: 'Страж трещины', icon: '🌀', role: 'tank', hp: 200, atk: 20, def: 13, speed: 7, mana: 45, instRole: 'rift_guard',
        abilities: [
          { id: 'h', name: 'Удар разлома', cost: 0, cd: 0, type: 'damage', power: 1.40 },
          { id: 'bash', name: 'Сжатие трещины', cost: 12, cd: 3, type: 'cast_aoe', power: 1.70, castKind: 'buster', castPrio: 2, school: 'shadow' },
          { id: 'cast', name: 'Искажение', cost: 12, cd: 2, type: 'cast_aoe', power: 0.90, castKind: 'kick', castPrio: 3, school: 'shadow' },
        ] }),
      stalker: () => U({ id: 'as', name: 'Пустотный сталкер', icon: '🗡️', hp: 300, atk: 24, def: 4, speed: 16, mana: 40, instRole: 'rift_stalker',
        abilities: [
          { id: 'stab', name: 'Разрез реальности', cost: 0, cd: 0, type: 'damage', power: 1.55, school: 'shadow' },
          { id: 'exec', name: 'Коллапс', cost: 10, cd: 2, type: 'damage', power: 2.15, school: 'shadow' },
          { id: 'cast', name: 'Взрыв пустоты', cost: 12, cd: 3, type: 'cast_aoe', power: 0.95, castKind: 'kick', castPrio: 4, school: 'shadow' },
        ] }),
    },
  };

  const ELITE_KEYS = {
    oracle: 1, shadow: 1, sparkMaster: 1, necro: 1, pain: 1, berserk: 1, guardChamp: 1,
  };
  const THEME_ALIAS = { crypts: 'crypt', crypt: 'crypt' };

  function recipeFor(theme, nodeId, k) {
    const extraA = k >= 5 ? 1 : 0;
    const extraP = k >= 10 ? 1 : 0;
    const extraT = k >= 12 ? 1 : 0;
    if (theme === 'tide') {
      const lit = { list: ['priest', ...Array(3 + extraA).fill('archer'), ...Array(extraP).fill('priest')], vent: true };
      const grab = { list: ['tentacle', 'priest', ...Array(2 + extraA).fill('archer'), ...Array(extraP).fill('priest')], vent: true };
      return {
        start: lit, hall: grab, fork1a: lit, fork1b: { list: ['guard'], champ: true, vent: true },
        descent: { list: ['tentacle', 'priest', 'oracle', ...(k >= 10 ? ['archer'] : [])], vent: true },
        fork2a: lit, fork2b: { list: ['lagoon'], champ: true, vent: true },
        approach: { list: ['guard', ...(extraT ? ['tentacle'] : [])], champ: true, vent: true },
        mop1: lit, mop2: { list: ['guard'], champ: true, vent: true },
        mop3: { list: ['oracle', 'priest', 'archer'], vent: true },
      }[nodeId] || null;
    }
    if (theme === 'jade') {
      return {
        start: { list: ['guard', 'whisper', 'student', 'student', 'student'] },
        hall: { list: ['guard', 'whisper', 'whisper', 'student', 'student'] },
        fork1a: { list: ['guard', 'whisper', 'student', 'student', 'student'] },
        fork1b: { list: ['stone'], champ: true },
        descent: { list: ['shadow', 'whisper', 'student', 'student', 'student'] },
        fork2a: { list: ['whisper', 'student', 'student', 'student', 'student'] },
        fork2b: { list: ['shadow'], champ: true },
        approach: { list: ['guardChamp', 'whisper'], champ: true },
        mop1: { list: ['student', 'student', 'student', 'student', 'student'] },
        mop2: { list: ['shadow'], champ: true },
        mop3: { list: ['whisper', 'student', 'student', 'student', 'student'] },
      }[nodeId] || null;
    }
    if (theme === 'crypt') {
      const A = ['ritual', 'mystic', 'acolyte', 'acolyte'];
      if (k >= 5) A.push('shroud');
      if (k >= 10) A.push('plate');
      const B = ['ritual', 'plate', 'mystic', 'acolyte'];
      if (k >= 5) B.push('shroud');
      if (k >= 10) B.push('acolyte');
      const v1 = (k + (run?.route?.visited?.length || 0)) % 2 === 0;
      const V = v1
        ? ['necro', 'ritual', 'acolyte', ...(k >= 10 ? ['plate'] : [])]
        : ['pain', 'mystic', 'acolyte', ...(k >= 10 ? ['shroud'] : [])];
      return {
        start: { list: A }, hall: { list: A }, fork1a: { list: B },
        fork1b: { list: ['grave', ...(extraT ? ['acolyte'] : [])], champ: true },
        descent: { list: V },
        fork2a: { list: A },
        fork2b: { list: ['urn', ...(extraT ? ['acolyte'] : [])], champ: true },
        approach: { list: ['grave', ...(extraT ? ['acolyte'] : [])], champ: true },
        mop1: { list: A }, mop2: { list: ['grave'], champ: true }, mop3: { list: V },
      }[nodeId] || null;
    }
    if (theme === 'forge') {
      const sparks = ['pyro', 'pyro', 'bruiser', 'hammer'];
      if (k >= 5) sparks.push('hammer');
      if (k >= 10) sparks.push('pyro');
      const slag = ['bruiser', 'hammer', 'hammer', 'pyro'];
      if (k >= 5) slag.push('pyro');
      if (k >= 10) slag.push('bruiser');
      return {
        start: { list: sparks }, hall: { list: slag }, fork1a: { list: sparks },
        fork1b: { list: ['giant'], champ: true },
        descent: { list: ['sparkMaster', 'bruiser', 'pyro', ...(k >= 10 ? ['hammer'] : [])] },
        fork2a: { list: slag },
        fork2b: { list: ['smith'], champ: true },
        approach: { list: ['giant', ...(extraT ? ['pyro'] : [])], champ: true },
        mop1: { list: sparks }, mop2: { list: ['giant'], champ: true },
        mop3: { list: ['sparkMaster', 'pyro', 'hammer'] },
      }[nodeId] || null;
    }
    if (theme === 'ember') {
      const area = k >= 5
        ? { list: ['brute', 'live', 'coal', 'coal', 'coal'], trough: true }
        : { list: ['brute', 'live', 'coal', 'coal'], trough: true };
      const mix = k >= 10
        ? { list: ['berserk', 'brute', 'live', 'coal'], trough: true }
        : { list: ['berserk', 'brute', 'live'], trough: true };
      const st = { list: ['colossus'], champ: true, liveRound: 2, extraCoal12: extraT };
      const appr = { list: ['colossus', 'live'], champ: true, extraCoal12: extraT };
      return {
        start: area, hall: area, fork1a: area, fork1b: st, descent: mix,
        fork2a: area, fork2b: st, approach: appr, mop1: area, mop2: st, mop3: mix,
      }[nodeId] || null;
    }
    if (theme === 'rift') {
      const nShard = k >= 10 ? 4 : (k >= 5 ? 3 : 2);
      const area = { list: ['crawler', ...Array(nShard).fill('shard')], riftCore: true };
      const mix = { list: ['guard', 'crawler', 'shard', ...(k >= 10 ? ['shard'] : [])], riftCore: true, emptyChance: 0.5 };
      const st = { list: ['stalker', ...(extraT ? ['shard'] : [])], champ: true, splitAt: nodeId === 'approach' ? 0.5 : 0.6, splitN: nodeId === 'approach' ? 3 : 4 };
      return {
        start: area, hall: area, fork1a: area, fork1b: st, descent: mix,
        fork2a: area, fork2b: st, approach: st, mop1: area, mop2: st, mop3: area,
      }[nodeId] || null;
    }
    return null;
  }

  function makeObject(id, name, icon, role) {
    return {
      id, name, icon, role: role || 'dps',
      hp: 40, atk: 1, def: 0, speed: 1, mana: 0,
      abilities: [{ id: 'idle', name: '—', cost: 0, cd: 99, type: 'buff', power: 0 }],
      instObject: true, instRole: id, forcesValue: 0,
    };
  }

  function finishUnit(u, tpl) {
    if (tpl.instRole) u.instRole = tpl.instRole;
    if (tpl.instObject) { u.instObject = true; u.forcesValue = 0; }
    (u.abilities || []).forEach((ab, i) => {
      const src = (tpl.abilities || [])[i];
      if (src && src.instFlag) ab.instFlag = src.instFlag;
    });
    return u;
  }

  function applyForces(enemies) {
    const node = instNode();
    const budget = node?.forceBudget || 0;
    const weights = enemies.map(e => (e.isBoss || e.instObject || e.instRole === 'reflect' || e.instRole === 'empty_contour') ? 0 : (e.isElite ? 2.2 : 1));
    const wSum = weights.reduce((a, b) => a + b, 0) || 1;
    let left = budget;
    enemies.forEach((e, i) => {
      if (e.isBoss || e.instObject || weights[i] <= 0) { e.forcesValue = 0; return; }
      const isLast = i === enemies.length - 1 || weights.slice(i + 1).every(w => w <= 0);
      const v = isLast ? Math.round(left * 10) / 10 : Math.round((budget * weights[i] / wSum) * 10) / 10;
      e.forcesValue = Math.max(0.1, v);
      left = Math.round((left - e.forcesValue) * 10) / 10;
    });
    return enemies;
  }

  function chaosName(theme, u) {
    if (theme !== 'rift' && theme !== 'ember') return;
    const PRE = theme === 'ember'
      ? ['Тлеющий', 'Угольный', 'Пепельный', 'Раскалённый', 'Зольный', 'Жаркий', 'Обугленный', 'Искрящий']
      : ['Искажённый', 'Пустотный', 'Хаотичный', 'Сломанный', 'Теневой', 'Разломный', 'Безумный', 'Мутировавший'];
    const SUF = theme === 'ember'
      ? ['страж', 'голем', 'исполин', 'вихрь', 'уголёк', 'надсмотрщик', 'осколок']
      : ['страж', 'ползун', 'шёпот', 'осколок', 'вихрь', 'кошмар', 'фрагмент'];
    const stamp = u.isElite ? ' · СТ' : '';
    const base = String(u.name).replace(/^◆\s*/, '').replace(/\s·\sСТ$/, '');
    if (u.instObject || u.isBoss) return;
    u.name = PRE[Math.floor(Math.random() * PRE.length)] + ' ' + SUF[Math.floor(Math.random() * SUF.length)] + stamp;
    const n = 0.85 + Math.random() * 0.35;
    if (u.instRole === 'rift_shard') {
      u.maxHp = Math.min(u.maxHp, Math.round(96 * ss() * (1 + (instKey() - 2) * 0.16)));
      u.hp = u.maxHp;
    } else if (u.instRole === 'rift_crawler') {
      u.maxHp = Math.max(u.maxHp, Math.round(130 * ss() * (1 + (instKey() - 2) * 0.16)));
      u.hp = u.maxHp;
    }
    void base; void n;
  }

  function lockObject(v) {
    v.instObject = true;
    v.forcesValue = 0;
    v.hp = Math.max(v.hp, 80 * ss());
    v.maxHp = v.hp;
    v.alive = true;
    v.atk = 1;
    return v;
  }

  function spawnFromRecipe(recipe, theme, k) {
    const lib = UNITS[theme];
    if (!lib || !recipe) return null;
    const out = [];
    (recipe.list || []).forEach((key, i) => {
      const factory = lib[key];
      if (!factory) return;
      const tpl = factory();
      const isChamp = !!recipe.champ && i === 0;
      const isElite = isChamp || !!ELITE_KEYS[key] || key === 'oracle' || key === 'shadow' || key === 'sparkMaster' || key === 'necro' || key === 'pain' || key === 'berserk' || key === 'guardChamp' || (theme === 'rift' && key === 'guard');
      const u = scaleEnemy(tpl, k, false, isElite);
      finishUnit(u, tpl);
      if (isChamp) {
        u.maxHp = Math.round(u.maxHp * 1.55);
        u.hp = u.maxHp;
        u.atk = Math.round(u.atk * 1.1);
        u.isElite = true;
        if (!String(u.name).includes('СТ')) u.name = u.name + ' · СТ';
      }
      if (key === 'live') u.instRole = 'ember_live';
      if (key === 'coal' && i === 1 && theme === 'ember') { /* live is separate */ }
      if (theme === 'forge' && key === 'bruiser' && out.some(x => x.instRole === 'forge_bruiser')) {
        const bash = (u.abilities || []).find(a => a.instFlag === 'forge_bash');
        if (bash) bash.curCd = 1;
      }
      chaosName(theme, u);
      out.push(u);
    });
    if (recipe.vent) out.push(lockObject(scaleEnemy(makeObject('vent', 'Шлюзовой вентиль', '⚙️'), k, false, false)));
    if (recipe.trough) out.push(lockObject(scaleEnemy(makeObject('trough', 'Зольный жёлоб', '🪵'), k, false, false)));
    if (recipe.liveRound === 2) {
      instCombat().spawnLiveOn = 2;
    }
    if (recipe.extraCoal12 && k >= 12) {
      const c = scaleEnemy(UNITS.ember.coal(), k, false, false);
      finishUnit(c, UNITS.ember.coal());
      chaosName(theme, c);
      out.push(c);
    }
    if (recipe.riftCore) {
      const shards = out.filter(e => e.instRole === 'rift_shard' || e.instRole === 'rift_crawler');
      const onCrawler = Math.random() < 0.4;
      const coreHost = onCrawler
        ? out.find(e => e.instRole === 'rift_crawler')
        : (out.find(e => e.instRole === 'rift_shard') || shards[0]);
      if (coreHost) {
        coreHost.instCore = true;
        paintAura(coreHost, 'rift_core', 'Скрытое ядро', '🧿', 1, 'Одиночная 100%. Область 35%.');
      }
      out.filter(e => e.instRole === 'rift_crawler' && !e.instCore).forEach(e => {
        e.instShell = true;
        paintAura(e, 'rift_shell', 'Ложный панцирь', '🐚', 1, 'Одиночная 40%. Область 100%.');
      });
      if (recipe.emptyChance && Math.random() < recipe.emptyChance) {
        const g = out.find(e => e.instRole === 'rift_guard');
        if (g) {
          g.instRole = 'empty_contour';
          g.maxHp = Math.max(1, Math.round(g.maxHp * 0.3));
          g.hp = g.maxHp;
          g.forcesValue = 0;
          g.abilities = (g.abilities || []).filter(a => a.type === 'damage');
          paintAura(g, 'rift_empty', 'Пустой контур', '🕳️', 1, 'Любой удар снимает. Сил нет.');
        }
      }
    }
    if (recipe.splitAt) {
      instCombat().riftSplitAt = recipe.splitAt;
      instCombat().riftSplitN = recipe.splitN || 4;
    }
    if (theme === 'ember') {
      const live = out.find(e => e.instRole === 'ember_live');
      if (live) paintAura(live, 'ember_live', 'Живой уголь', '🔥', 1, 'Убить одиночным. Область кормит жар.');
    }
    return applyForces(out);
  }

  function spawnInstBoss(theme, type, k) {
    const isFinal = type === 'final';
    const tpl = isFinal
      ? (ENEMIES.bosses && ENEMIES.bosses[theme])
      : (ENEMIES.midBosses && ENEMIES.midBosses[theme]);
    if (!tpl || typeof scaleEnemy !== 'function') return null;
    const boss = scaleEnemy(tpl, k, true, false);
    boss.instRole = theme + (isFinal ? '_final' : '_mid');
    const out = [boss];
    const addTrash = (factory, elite) => {
      const t = factory();
      const u = scaleEnemy(t, k, false, !!elite);
      finishUnit(u, t);
      out.push(u);
      return u;
    };
    if (theme === 'tide') {
      out.push(lockObject(scaleEnemy(makeObject('vent', 'Шлюзовой вентиль', '⚙️'), k, false, false)));
      if (!isFinal) addTrash(Math.random() < 0.5 ? UNITS.tide.archer : UNITS.tide.priest, false);
      else addTrash(UNITS.tide.oracle, true);
    }
    if (theme === 'forge' && !isFinal) addTrash(UNITS.forge.pyro, false);
    if (theme === 'forge' && isFinal) addTrash(UNITS.forge.sparkMaster, true);
    if (theme === 'crypt' && !isFinal) addTrash(UNITS.crypt.acolyte, false);
    if (theme === 'crypt' && isFinal) {
      const anc = scaleEnemy(makeObject('echo_anchor', 'Якорь Эха', '🔗'), k, false, true);
      anc.instRole = 'echo_anchor';
      anc.instObject = false;
      anc.maxHp = Math.round(boss.maxHp * 0.35);
      anc.hp = anc.maxHp;
      anc.atk = Math.round(boss.atk * 0.4);
      anc.abilities = [
        { id: 'h', name: 'Отзвук', cost: 0, cd: 0, type: 'damage', power: 0.80, school: 'shadow',
          icon: '✨', gen: 0, costSec: 0, genSec: 0, costRunes: null, genRunic: 0, baseCd: 0, curCd: 0, desc: '', castKind: null, castPrio: 0 },
      ];
      anc.forcesValue = 0;
      out.push(anc);
    }
    if (theme === 'rift' && !isFinal) {
      const echo = scaleEnemy(tpl, k, false, true);
      echo.name = 'Эхо Стража';
      echo.instRole = 'rift_echo';
      echo.isBoss = false;
      echo.maxHp = Math.round(boss.maxHp * 0.7);
      echo.hp = echo.maxHp;
      echo.atk = Math.round(boss.atk * 0.8);
      echo.mech = null;
      paintAura(echo, 'rift_phase', 'Вне фазы', '🌀', 1, 'Сначала якорь: одиночная в одно тело.');
      paintAura(boss, 'rift_phase', 'Вне фазы', '🌀', 1, 'Сначала якорь: одиночная в одно тело.');
      out.push(echo);
    }
    if (theme === 'ember' && !isFinal) {
      out.push(lockObject(scaleEnemy(makeObject('furnace', 'Топка чертогов', '♨️'), k, false, false)));
    }
    if (theme === 'jade' && !isFinal) {
      instCombat().lanterns = true;
      const a = lockObject(scaleEnemy(makeObject('lantern', 'Нефритовый фонарь', '🏮'), k, false, false));
      const b = lockObject(scaleEnemy(makeObject('lantern', 'Нефритовый фонарь', '🏮'), k, false, false));
      a.instLit = true; b.instLit = false;
      a.name = 'Нефритовый фонарь · свет';
      out.push(a, b);
    }
    return applyForces(out);
  }

  function spawnInstEncounter(type) {
    if (run?.raid) return null;
    const theme = instTheme();
    if (!theme || !UNITS[theme]) return null;
    const k = instKey();
    if (type === 'boss' || type === 'final') return spawnInstBoss(theme, type, k);
    const rec = recipeFor(theme, instNode()?.id, k);
    if (!rec) return null;
    return spawnFromRecipe(rec, theme, k);
  }

  /* ── механики ── */
  function addPressure(n, why) {
    if (instTheme() !== 'tide') return;
    const inst = instCombat();
    inst.pressure = Math.max(0, Math.min(5, (inst.pressure || 0) + n));
    if (why) log('Давление: ' + (n > 0 ? '+' : '') + n + ' · ' + why + ' · сейчас ' + inst.pressure, 'system');
    paintAura(seniorEnemy(), 'tide_pressure', 'Столб давления', '🌊', inst.pressure, '5 стаков — гидроудар. Вентиль −2.');
    if (inst.pressure >= 5) {
      const abyss = !!(combat.enemies || []).some(e => e.isBoss && e.hp / e.maxHp <= 0.3);
      partyTrue(abyss ? 0.15 : 0.12, null, 'Гидростатический удар', 'frost');
      log('Гидростатический удар', 'enemy');
      toast('Столб давления!');
      inst.pressure = 0;
      paintAura(seniorEnemy(), 'tide_pressure', 'Столб давления', '🌊', 0, '5 стаков — гидроудар.');
    }
  }
  function addLungs(hero, n) {
    if (!hero || !hero.alive) return;
    if ((hero.buffs || []).some(b => b.id === 'air_pocket')) return;
    let b = (hero.buffs || []).find(x => x.id === 'tide_lungs');
    if (!b) {
      applyStatus(hero, { id: 'tide_lungs', name: 'Затопление лёгких', icon: '🌊', turns: 6, stacks: n || 1, tip: '6% max HP за стак. На 3 — удушье. Лечение −1.' });
    } else {
      b.stacks = Math.min(3, (b.stacks || 1) + (n || 1));
      b.turns = Math.max(b.turns || 0, 6);
    }
    log(hero.name + ': Затопление лёгких ×' + ((hero.buffs || []).find(x => x.id === 'tide_lungs')?.stacks || 1), 'enemy');
  }
  function clearLungs(hero, all) {
    const b = (hero.buffs || []).find(x => x.id === 'tide_lungs');
    if (!b) return;
    if (all) hero.buffs = hero.buffs.filter(x => x.id !== 'tide_lungs');
    else {
      b.stacks = (b.stacks || 1) - 1;
      if (b.stacks <= 0) hero.buffs = hero.buffs.filter(x => x.id !== 'tide_lungs');
    }
    applyStatus(hero, { id: 'air_pocket', name: 'Воздушный карман', icon: '💨', turns: 2, tip: 'Новые лёгкие не вешаются' });
  }
  function startTideGrab(tentacle, pct) {
    const inst = instCombat();
    if (inst.grab) return;
    const dps = livingHeroes().filter(h => h.role === 'dps' && h.alive);
    const t = dps[0] || livingHeroes().find(h => h.role !== 'tank') || null;
    if (!t || !tentacle) return;
    inst.grab = { tentacleUid: tentacle.uid, heroUid: t.uid, left: 2, pct: pct || 0.12 };
    applyStatus(t, { id: 'tide_grab', name: 'Хватка', icon: '🌊', turns: 2, tip: 'Пропуск хода. Бейте Щупальце.', skipTurn: true, ccMode: 'stun' });
    log('Хватка: ' + t.name + ' · 2 раунда', 'enemy');
    toast('Хватка!');
  }

  function addForgeHeat(n, why) {
    if (instTheme() !== 'forge') return;
    const inst = instCombat();
    if ((combat.enemies || []).some(e => e.isBoss && e.mech && e.mech.id === 'heat')) return;
    inst.heat = Math.max(0, Math.min(3, (inst.heat || 0) + n));
    paintAura(seniorEnemy(), 'forge_heat', 'Жар горна', '🔥', inst.heat, 'Кик −1. На 3 — выплеск 4% max HP.');
    if (why && n) log('Жар горна: ' + (n > 0 ? '+' : '') + n + ' · ' + why + ' · ' + inst.heat, 'system');
    if (inst.heat >= 3 && n > 0) {
      partyTrue(0.04, null, 'Выплеск горна', 'fire');
      log('Выплеск горна · 4% max HP', 'enemy');
      inst.heat = 1;
      paintAura(seniorEnemy(), 'forge_heat', 'Жар горна', '🔥', 1, 'Кик −1.');
    }
  }
  function addScale(hero) {
    if (!hero) return;
    applyStatus(hero, { id: 'forge_scale', name: 'Окалина', icon: '🟤', turns: 2, dmgTakenMod: 0.15, tip: 'Входящий огонь +15%' });
  }

  function addHallHeat(n, why, bossMode) {
    if (instTheme() !== 'ember') return;
    const inst = instCombat();
    const cap = 8;
    const was = inst.hallHeat || 0;
    inst.hallHeat = Math.max(0, Math.min(cap, was + n));
    paintAura(seniorEnemy(), 'ember_heat', 'Жар чертогов', '🔥', inst.hallHeat, 'Уголь в жёлоб / колосса / топку. Кик не гасит.');
    if (why && n) log('Жар чертогов: ' + (n > 0 ? '+' : '') + n + ' · ' + why + ' · ' + inst.hallHeat, 'system');
    if (inst.hallHeat >= 8 && was < 8) {
      partyTrue(bossMode ? 0.18 : 0.12, null, 'Выгорание зала', 'fire');
      toast('Выгорание зала!');
    }
  }
  function giveCoal(hero, turns) {
    if (!hero) return;
    const inst = instCombat();
    inst.coal = { heroUid: hero.uid, left: turns || 3 };
    applyStatus(hero, { id: 'ember_coal', name: 'Остывший уголь', icon: '🪨', turns: turns || 3, tip: 'Положить в жёлоб / колосса / топку. Не в громилу.' });
    log(hero.name + ' несёт Остывший уголь', 'system');
  }
  function hasCoal(hero) {
    const inst = instCombat();
    return !!(inst.coal && hero && inst.coal.heroUid === hero.uid);
  }
  function clearCoal() {
    const inst = instCombat();
    if (inst.coal) {
      const h = (run.party || []).find(p => p.uid === inst.coal.heroUid);
      if (h) h.buffs = (h.buffs || []).filter(b => b.id !== 'ember_coal');
    }
    inst.coal = null;
  }

  function addDoubt(hero) {
    if (!hero) return;
    let b = (hero.buffs || []).find(x => x.id === 'jade_doubt');
    if (!b) applyStatus(hero, { id: 'jade_doubt', name: 'Сомнение', icon: '☯️', turns: 3, stacks: 1, atkMod: -0.08, tip: '−8% исходящего за стак, потолок 3.' });
    else {
      b.stacks = Math.min(3, (b.stacks || 1) + 1);
      b.atkMod = -0.08 * b.stacks;
      b.turns = 3;
    }
  }
  function spawnJadeReflect(real) {
    if (!real || !combat) return;
    const inst = instCombat();
    if (inst.reflectUid && (combat.enemies || []).some(e => e.uid === inst.reflectUid && e.alive)) return;
    const copy = {
      uid: (typeof uid === 'function' ? uid() : 'r_' + Date.now()),
      name: 'Отражение: ' + String(real.name).replace(/\s·\sСТ$/, '').replace(/^◆\s*/, ''),
      icon: real.icon, classId: real.classId, heroId: real.heroId,
      side: 'enemy', role: 'dps', alive: true,
      hp: Math.max(1, Math.round(real.maxHp * 0.4)),
      maxHp: Math.max(1, Math.round(real.maxHp * 0.4)),
      atk: 1, def: 0, speed: 1, shield: 0, buffs: [],
      abilities: [], instObject: false, instRole: 'reflect',
      reflectOf: real.uid, forcesValue: 0,
    };
    combat.enemies.push(copy);
    inst.reflectUid = copy.uid;
    inst.reflectLeft = 2;
    log('Ложный портрет: ' + copy.name, 'enemy');
    toast('Отражение!');
  }

  function openSoak(need, kind, label) {
    const inst = instCombat();
    inst.soak = { need, kind, picked: [], label: label || 'Сок', until: (combat.round || 1) + 1 };
    log(label + ': кликните ' + need + ' героя, без кнопки 1–9.', 'system');
    toast(label);
  }
  function pickSoak(unit) {
    const inst = instCombat();
    if (!inst.soak || !unit || unit.side !== 'ally' || unit.isPet) return false;
    if (inst.soak.picked.includes(unit.uid)) return true;
    inst.soak.picked.push(unit.uid);
    applyStatus(unit, { id: 'inst_soak', name: inst.soak.label || 'Сок', icon: '💠', turns: 1, tip: 'Назначен на окно' });
    log(unit.name + ' в соке (' + inst.soak.picked.length + '/' + inst.soak.need + ')', 'system');
    return true;
  }
  function resolveSoak() {
    const inst = instCombat();
    const s = inst.soak;
    if (!s) return;
    const n = s.picked.length;
    const heroes = livingHeroes();
    const picked = heroes.filter(h => s.picked.includes(h.uid));
    if (s.kind === 'pain') {
      if (n === 2) picked.forEach(h => trueDmg(h, 0, null, 'Всплеск боли'));
      if (n === 2) picked.forEach(h => { const raw = Math.round(12 * ss()); if (typeof dealTrue === 'function') dealTrue(h, raw, null, 'dot', { school: 'shadow', abilityName: 'Всплеск боли' }); });
      else if (n === 0) heroes.forEach(h => { if (typeof dealTrue === 'function') dealTrue(h, Math.round(10 * ss()), null, 'dot', { school: 'shadow', abilityName: 'Всплеск боли' }); });
      else if (n === 1) { if (typeof dealTrue === 'function') dealTrue(picked[0], Math.round(22 * ss()), null, 'dot', { school: 'shadow', abilityName: 'Всплеск боли' }); }
      else picked.forEach(h => {
        if (typeof dealTrue === 'function') dealTrue(h, Math.round(10 * ss()), null, 'dot', { school: 'shadow', abilityName: 'Всплеск боли' });
        applyStatus(h, { id: 'deaf', name: 'Оглушённый слух', icon: '🔇', turns: 1, tip: 'Прерывания не сбивают' });
      });
    }
    if (s.kind === 'urn') {
      if (n === 1) { if (typeof dealTrue === 'function') dealTrue(picked[0], Math.round(18 * ss()), null, 'dot', { school: 'shadow', abilityName: 'Урна тишины' }); }
      else if (n === 0) heroes.forEach(h => { if (typeof dealTrue === 'function') dealTrue(h, Math.round(12 * ss()), null, 'dot', { school: 'shadow', abilityName: 'Урна тишины' }); });
      else picked.forEach(h => {
        if (typeof dealTrue === 'function') dealTrue(h, Math.round(14 * ss()), null, 'dot', { school: 'shadow', abilityName: 'Урна тишины' });
        applyStatus(h, { id: 'deaf', name: 'Оглушённый слух', icon: '🔇', turns: 2, tip: 'Прерывания не сбивают' });
      });
    }
    if (s.kind === 'debt') {
      const debt = inst.echoDebt || 0;
      if (n === 2) picked.forEach(h => { if (typeof dealTrue === 'function') dealTrue(h, Math.round(debt / 2), null, 'dot', { school: 'shadow', abilityName: 'Долг эха' }); });
      else if (n === 1) { if (typeof dealTrue === 'function') dealTrue(picked[0], debt, null, 'dot', { school: 'shadow', abilityName: 'Долг эха' }); }
      else if (n === 0) heroes.forEach(h => { if (typeof dealTrue === 'function') dealTrue(h, debt, null, 'dot', { school: 'shadow', abilityName: 'Долг эха' }); });
      else picked.forEach(h => { if (typeof dealTrue === 'function') dealTrue(h, Math.round(debt * 0.4), null, 'dot', { school: 'shadow', abilityName: 'Долг эха' }); });
      inst.echoDebt = 0;
    }
    if (s.kind === 'call') {
      if (n === 1) {
        const h = picked[0];
        const raw = (h.hp / h.maxHp < 0.4) ? 32 : 20;
        if (typeof dealTrue === 'function') dealTrue(h, Math.round(raw * ss()), null, 'dot', { school: 'shadow', abilityName: 'Зов эха' });
      } else if (n === 0) {
        heroes.forEach(h => { if (typeof dealTrue === 'function') dealTrue(h, Math.round(10 * ss()), null, 'dot', { school: 'shadow', abilityName: 'Зов эха' }); });
        const boss = (combat.enemies || []).find(e => e.isBoss && e.alive);
        if (boss) boss.hp = Math.min(boss.maxHp, boss.hp + Math.round(boss.maxHp * 0.04));
      } else picked.forEach(h => { if (typeof dealTrue === 'function') dealTrue(h, Math.round(14 * ss()), null, 'dot', { school: 'shadow', abilityName: 'Зов эха' }); });
    }
    heroes.forEach(h => { if (h.buffs) h.buffs = h.buffs.filter(b => b.id !== 'inst_soak'); });
    inst.soak = null;
  }

  function startInstRoom() {
    if (run?.raid) return;
    const theme = instTheme();
    if (!UNITS[theme]) return;
    const inst = instCombat();
    inst.theme = theme;
    inst.pressure = 0;
    inst.heat = 0;
    inst.hallHeat = (theme === 'ember' && (combat.enemies || []).some(e => e.isBoss)) ? 2 : (theme === 'ember' ? 1 : 0);
    inst.roundAcc = 0;
    inst.echoDebt = 0;
    inst.yankUsed = false;
    inst.shellLoads = 0;
    if (theme === 'tide') log('Столб давления 0/5. Гимн кормит столб. Вентиль −2 стака.', 'system');
    if (theme === 'jade') log('Сомнение: не бейте карту «Отражение». Смятение — прерывание в Шёпота ша.', 'system');
    if (theme === 'crypt') log('Эхо клика: Гниль прыгает на последний клик. Плиту снимают одиночные.', 'system');
    if (theme === 'forge') log('Жар горна 0/3. Прерывание гасит жар. Ковочный удар — стенка танка.', 'system');
    if (theme === 'ember') log('Жар чертогов. Живого уголька — одиночным, уголь в жёлоб / колосса. Кик жар не гасит.', 'system');
    if (theme === 'rift') log('Читайте ауры. Скрытое ядро ест одиночную. Ложный панцирь ест область.', 'system');
    if (theme === 'crypt' && combat.type === 'boss') {
      const boss = (combat.enemies || []).find(e => e.isBoss);
      if (boss) {
        applyStatus(boss, {
          id: 'bone_ward', name: 'Костяной заслон', icon: '🦴', turns: 99,
          stacks: 4, dmgReduce: 0.4,
          tip: 'Одиночные снимают заряд. Область не ест. Пока жив — Первый отзвук 80%.',
        });
      }
    }
    if (theme === 'ember') addHallHeat(0);
    if (theme === 'forge') addForgeHeat(0);
    const col = (combat.enemies || []).find(e => e.instRole === 'ember_colossus' || (e.isBoss && theme === 'ember' && combat.type === 'final'));
    if (col && theme === 'ember' && (col.instRole === 'ember_colossus' || combat.type === 'final')) {
      applyStatus(col, { id: 'ember_shell', name: combat.type === 'final' ? 'Угольная броня' : 'Угольная корка', icon: '🪨', turns: 99, dmgReduce: combat.type === 'final' ? 0.40 : 0.25, tip: 'Кладите уголь в корпус.' });
    }
  }

  function tickInstRoom() {
    if (run?.raid || !combat) return;
    const theme = instTheme();
    if (!UNITS[theme]) return;
    const inst = instCombat();
    inst.roundAcc = (inst.roundAcc || 0) + 1;
    const r = inst.roundAcc;

    if (inst.soak && combat.round >= inst.soak.until) resolveSoak();

    if (theme === 'tide') {
      const boss = (combat.enemies || []).find(e => e.isBoss && e.alive);
      const every = boss ? 1 : 2;
      if (boss && boss.hp / boss.maxHp <= 0.6 && combat.type === 'final') {
        /* наводнение: ток */
      }
      if (!inst.skipPlanPressure && r % every === 0) addPressure(1, 'тик комнаты');
      inst.skipPlanPressure = false;
      const grab = inst.grab;
      if (grab) {
        const ten = (combat.enemies || []).find(e => e.uid === grab.tentacleUid);
        const hero = (run.party || []).find(h => h.uid === grab.heroUid);
        if (!ten || !ten.alive) {
          if (hero) hero.buffs = (hero.buffs || []).filter(b => b.id !== 'tide_grab');
          inst.grab = null;
          addPressure(-1, 'Щупальце убито');
        } else if (hero && hero.alive) {
          trueDmg(hero, grab.pct || 0.12, ten, 'Хватка', 'frost');
          grab.left -= 1;
          if (grab.left <= 0) {
            applyStatus(hero, { id: 'stun', name: 'Оглушение', icon: '💫', turns: 1, ccMode: 'stun' });
            addLungs(hero, 1);
            ten.alive = false; ten.hp = 0;
            hero.buffs = (hero.buffs || []).filter(b => b.id !== 'tide_grab');
            inst.grab = null;
            log('Хватка сорвалась', 'enemy');
          }
        }
      }
      for (const h of livingHeroes()) {
        const lungs = (h.buffs || []).find(b => b.id === 'tide_lungs');
        if (!lungs) continue;
        const st = lungs.stacks || 1;
        trueDmg(h, 0.06 * st, null, 'Затопление лёгких', 'frost');
        if (st >= 3) {
          trueDmg(h, 0.18, null, 'Удушье', 'frost');
          applyStatus(h, { id: 'stun', name: 'Удушье', icon: '💨', turns: 1, ccMode: 'stun' });
          lungs.stacks = 1;
        }
      }
      const lagoon = (combat.enemies || []).find(e => e.alive && e.instRole === 'lagoon');
      if (lagoon && r % 3 === 0) {
        const dps = livingHeroes().filter(h => h.role === 'dps');
        if (dps.length) addLungs(dps[Math.floor(Math.random() * dps.length)], 1);
      }
      if (boss && combat.type === 'boss' && r % (boss.hp / boss.maxHp <= 0.5 ? 2 : 3) === 0) {
        const t = livingHeroes().find(h => h.role !== 'tank') || livingHeroes()[0];
        if (t) {
          log('Отнять воздух — прерывание в Жреца прилива (если читает) / иначе лёгкие', 'enemy');
          if (!boss.casting) addLungs(t, 2);
        }
      }
      const oracle = (combat.enemies || []).find(e => e.alive && e.instRole === 'oracle');
      if (oracle && r % 2 === 0 && !(combat.enemies || []).some(e => e.alive && e.instRole === 'vent')) {
        combat.enemies.push(lockObject(scaleEnemy(makeObject('vent', 'Шлюзовой вентиль', '⚙️'), instKey(), false, false)));
      }
    }

    if (theme === 'jade') {
      if (inst.reflectUid) {
        inst.reflectLeft = (inst.reflectLeft || 0) - 1;
        if (inst.reflectLeft <= 0) {
          const rf = (combat.enemies || []).find(e => e.uid === inst.reflectUid);
          if (rf) { rf.alive = false; rf.hp = 0; }
          inst.reflectUid = null;
        }
      }
      const sh = (combat.enemies || []).find(e => e.alive && e.instRole === 'jade_shadow' && !e._jadeHalf);
      if (sh && sh.hp / sh.maxHp <= 0.5) {
        sh._jadeHalf = true;
        spawnJadeReflect(sh);
      }
    }

    if (theme === 'crypt') {
      (combat.enemies || []).filter(e => e.alive && e.instRole === 'crypt_plate').forEach(p => {
        const sh = p.shield || 0;
        p._plateIgnore = (p._plateIgnore || 0) + 1;
        if (sh > 0 && p._plateIgnore >= 2 && !p._plateClicked) {
          p.shield = 0;
          livingHeroes().forEach(h => {
            const raw = Math.round(getEff(p).atk * 0.70);
            dealDmg(h, raw, p, { type: 'aoe', isAoe: true, abilityName: 'Клев плиты' });
          });
          log('Надгробный щит рвётся — Клев плиты', 'enemy');
          p._plateIgnore = 0;
        }
        p._plateClicked = false;
      });
      (combat.enemies || []).filter(e => e.alive && e.instRole === 'crypt_grave').forEach(p => {
        const skin = (p.buffs || []).find(b => b.id === 'crypt_bone_skin') || (p.shield > p.maxHp * 0.2);
        p._skinIgnore = (p._skinIgnore || 0) + 1;
        if (p.shield > 0 && p._skinIgnore >= 2 && !p._skinClicked) {
          partyTrue(0.08, p, 'Отзвук кожи', 'shadow');
          p.shield = 0;
          p.buffs = (p.buffs || []).filter(b => b.id !== 'crypt_bone_skin');
          log('Костяная кожа провисела — Отзвук кожи 8% max HP', 'enemy');
        }
        p._skinClicked = false;
        void skin;
      });
      const urn = (combat.enemies || []).find(e => e.alive && e.instRole === 'crypt_urn');
      if (urn && r >= 2 && r % 3 === 0) openSoak(1, 'urn', 'Урна тишины · ровно 1');
      const mid = (combat.enemies || []).find(e => e.isBoss && e.alive && combat.type === 'boss');
      if (mid && r >= 3 && r % 3 === 0) openSoak(1, 'urn', 'Урна тишины · ровно 1');
      const fin = (combat.enemies || []).find(e => e.isBoss && e.alive && combat.type === 'final');
      if (fin) {
        inst.echoWindow = (inst.echoWindow || 0) + 1;
        if (inst.echoWindow % 2 === 0 && inst.echoDebt > 0 && (combat.enemies || []).some(e => e.alive && e.instRole === 'echo_anchor')) {
          const share = Math.round(inst.echoDebt * 0.25);
          const hs = livingHeroes();
          const each = Math.max(1, Math.round(share / Math.max(1, hs.length)));
          hs.forEach(h => { if (typeof dealTrue === 'function') dealTrue(h, each, fin, 'dot', { school: 'shadow', abilityName: 'Долг эха' }); });
          inst.echoDebt = Math.max(0, inst.echoDebt - share);
          log('Якорь Эха отдаёт долг', 'enemy');
        }
        if (r >= 4 && r % 4 === 0) openSoak(1, 'call', 'Зов эха · ровно 1');
        if (!fin._silenceDone && fin.hp / fin.maxHp <= 0.3) {
          fin._silenceDone = true;
          livingHeroes().forEach(h => applyStatus(h, { id: 'crypt_silence', name: 'Тишина склепа', icon: '🔇', turns: 2, tip: 'Прерывания не сбивают' }));
          log('Тишина склепа · 2 хода кик пустой', 'enemy');
        }
      }
    }

    if (theme === 'forge') {
      const giant = (combat.enemies || []).find(e => e.alive && (e.instRole === 'forge_giant' || e.instRole === 'forge_smith'));
      if (giant && r % 2 === 0) addForgeHeat(1, 'чемпион');
    }

    if (theme === 'ember') {
      const bossMode = !!(combat.enemies || []).some(e => e.isBoss);
      if ((inst.hallHeat || 0) >= 8) partyTrue(bossMode ? 0.08 : 0.06, null, 'Выгорание зала', 'fire');
      if (inst.coal) {
        const h = (run.party || []).find(p => p.uid === inst.coal.heroUid);
        if (h && h.alive) {
          trueDmg(h, 0.03, null, 'Остывший уголь', 'fire');
          inst.coal.left -= 1;
          if (inst.coal.left <= 0) {
            trueDmg(h, bossMode ? 0.10 : 0.08, null, 'Уголь истёк', 'fire');
            addHallHeat(1, 'уголь истёк', bossMode);
            clearCoal();
          }
        } else clearCoal();
      }
      const brute = (combat.enemies || []).find(e => e.alive && e.instRole === 'ember_brute');
      if (brute && (inst.hallHeat || 0) <= 2 && !inst.placedThisRound) addHallHeat(1, 'громила раздул', bossMode);
      inst.placedThisRound = false;
      (livingHeroes() || []).forEach(h => {
        const plates = (h.buffs || []).find(b => b.id === 'ember_plates');
        if (plates) trueDmg(h, bossMode && combat.type === 'final' ? 0.07 : 0.05, null, 'Раскалённые латы', 'fire');
      });
      if (inst.spawnLiveOn === r || (bossMode && combat.type !== 'final' && r % (combat.enemies.some(e => e.isBoss && e.hp / e.maxHp <= 0.4) ? 2 : 3) === 0 && r >= 2)) {
        if (!(combat.enemies || []).some(e => e.alive && e.instRole === 'ember_live')) {
          const live = scaleEnemy(UNITS.ember.live(), instKey(), false, false);
          finishUnit(live, UNITS.ember.live());
          live.forcesValue = 0;
          paintAura(live, 'ember_live', 'Живой уголь', '🔥', 1, 'Убить одиночным.');
          combat.enemies.push(live);
          log('Живой уголёк', 'enemy');
        }
      }
      if (bossMode && combat.type === 'boss' && r >= 3 && r % (combat.enemies.some(e => e.isBoss && e.hp / e.maxHp <= 0.4) ? 2 : 3) === 0) {
        const dps = livingHeroes().filter(h => h.role === 'dps');
        if (dps.length && !livingHeroes().some(h => (h.buffs || []).some(b => b.id === 'ember_brand'))) {
          const t = dps[Math.floor(Math.random() * dps.length)];
          applyStatus(t, { id: 'ember_brand', name: 'Клеймо надсмотрщика', icon: '♨️', turns: 3, tip: 'Удар по надсмотрщику лечит его. Снять углём в топку или хилом ≥15% max HP.' });
          log(t.name + ': Клеймо надсмотрщика', 'enemy');
        }
      }
      livingHeroes().forEach(h => {
        const br = (h.buffs || []).find(b => b.id === 'ember_brand');
        if (br && (br.turns || 0) <= 1 && r > 1) {
          /* expire handled by status tick; extra punish if still present next */
        }
      });
      const titan = (combat.enemies || []).find(e => e.isBoss && e.alive && combat.type === 'final');
      if (titan && titan.hp / titan.maxHp <= 0.55 && !inst.coreOut) {
        inst.coreOut = true;
        const core = lockObject(scaleEnemy(makeObject('ember_core', 'Раскалённое ядро', '☄️'), instKey(), false, false));
        core.maxHp = Math.round(titan.maxHp * 0.18);
        core.hp = core.maxHp;
        core.instObject = false;
        core.instRole = 'ember_core';
        combat.enemies.push(core);
        log('Раскалённое ядро открыто', 'enemy');
      }
    }

    if (theme === 'rift') {
      const st = (combat.enemies || []).find(e => e.alive && e.instRole === 'rift_stalker');
      const at = inst.riftSplitAt || 0.6;
      if (st && !st._split && st.hp / st.maxHp <= at) {
        st._split = true;
        const n = inst.riftSplitN || 4;
        const hp = Math.max(1, Math.round(st.maxHp * 0.22));
        st.alive = false; st.hp = 0;
        for (let i = 0; i < n; i++) {
          const sh = scaleEnemy(UNITS.rift.shard(), instKey(), false, false);
          finishUnit(sh, UNITS.rift.shard());
          sh.maxHp = hp; sh.hp = hp; sh.forcesValue = 0;
          if (i === 0) {
            sh.instCore = true;
            sh.instRole = 'rift_second';
            paintAura(sh, 'rift_core2', 'Второе ядро', '🧿', 1, '3 хода, иначе обратный коллапс.');
            inst.secondCoreUid = sh.uid;
            inst.secondLeft = 3;
          }
          combat.enemies.push(sh);
        }
        log('Пустотный сталкер рассыпается', 'enemy');
        toast('Распад!');
      }
      if (inst.secondCoreUid) {
        const c = (combat.enemies || []).find(e => e.uid === inst.secondCoreUid);
        const others = (combat.enemies || []).filter(e => e.alive && e.uid !== inst.secondCoreUid && e.instRole === 'rift_shard');
        inst.secondLeft = (inst.secondLeft || 0) - 1;
        if (c && c.alive && inst.secondLeft <= 0 && !others.length) {
          partyTrue(0.16, c, 'Обратный коллапс', 'shadow');
          log('Обратный коллапс — ядро прожило', 'enemy');
          inst.secondCoreUid = null;
        }
        if (!c || !c.alive) inst.secondCoreUid = null;
      }
      if (combat.type === 'boss' && r % 3 === 0) {
        log('Якорь фазы: одиночная или провокация в одно тело', 'system');
      }
    }
  }

  function handleInstCast(actor, cast) {
    const flag = cast?.instFlag || (actor.abilities || []).find(a => a.name === cast?.name)?.instFlag;
    const name = cast?.name || '';
    const theme = instTheme();
    if (theme === 'crypt' && (flag === 'crypt_darkheal' || name === 'Тёмный хил' || name === 'Тёмное исцеление')) {
      const friends = (combat.enemies || []).filter(e => e.alive && !e.instObject);
      const hurt = friends.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (hurt) {
        const pct = actor.instRole === 'crypt_necro' ? 0.20 : 0.16;
        const amt = Math.max(actor.instRole === 'crypt_necro' ? 16 : 12, Math.round(hurt.maxHp * pct));
        hurt.hp = Math.min(hurt.maxHp, hurt.hp + amt);
        log(actor.name + ' лечит ' + hurt.name + ' (+' + (typeof fmt === 'function' ? fmt(amt) : amt) + ')', 'enemy');
      }
      return true;
    }
    if (theme === 'crypt' && (flag === 'crypt_painsoak' || name === 'Всплеск боли')) {
      openSoak(2, 'pain', 'Всплеск боли · ровно 2');
      return true;
    }
    return false;
  }

  function onInstCastResolved(actor, cast) {
    if (!actor || run?.raid) return;
    const flag = cast?.instFlag || (actor.abilities || []).find(a => a.name === cast?.name)?.instFlag;
    const name = cast?.name || '';
    const theme = instTheme();
    if (theme === 'tide') {
      if (flag === 'tide_hymn' || /Гимн|Водоворот|Приливный/.test(name)) {
        addPressure(2, 'пропущенный гимн');
        if (actor.isBoss && combat.type === 'boss') actor.hp = Math.min(actor.maxHp, actor.hp + Math.round(actor.maxHp * 0.08));
      }
      if (flag === 'tide_tsunami' || name === 'Цунами') addPressure(1, 'Цунами');
      if (flag === 'tide_grab' || name === 'Хватка') startTideGrab(actor, actor.isBoss ? 0.08 : 0.12);
    }
    if (theme === 'jade') {
      if (flag === 'jade_confuse' || name === 'Смятение') {
        livingHeroes().forEach(addDoubt);
        const guard = (combat.enemies || []).find(e => e.alive && e.instRole === 'jade_guard');
        spawnJadeReflect(guard || actor);
      }
      if (flag === 'jade_gaze' || name === 'Взгляд камня') {
        const already = livingHeroes().find(h => (h.buffs || []).some(b => b.id === 'petrify'));
        const t = already || livingHeroes().find(h => h.role !== 'tank') || livingHeroes()[0];
        if (t) {
          applyStatus(t, { id: 'petrify', name: 'Окаменение', icon: '🗿', turns: 2, ccMode: 'stun', tip: 'Снимает одиночный хил. Область не снимает.' });
          log(t.name + ': Окаменение', 'enemy');
        }
      }
      if (flag === 'jade_shout' || name === 'Клич') {
        (combat.enemies || []).filter(e => e.alive).forEach(e => applyStatus(e, { id: 'jade_shout', name: 'Клич', icon: '📣', turns: 2, atkMod: 0.25, tip: '+25% атаки' }));
      }
    }
    if (theme === 'crypt') {
      if (flag === 'crypt_dust' || name === 'Вспышка праха') {
        instCombat().dustEcho = 2;
        log('Пыльный отзвук · 2 хода: следующая смерть бьёт 6% max HP', 'enemy');
      }
      if (flag === 'crypt_choir' || name === 'Хор праха') {
        const dps = livingHeroes().filter(h => h.role !== 'tank');
        const pick = dps.sort(() => Math.random() - 0.5).slice(0, 1);
        pick.forEach(h => applyStatus(h, { id: 'need_spread', name: 'Каменный хор', icon: '📣', turns: 2, tip: 'На своём ходе клик по себе без кнопки = Разойтись' }));
      }
      if (flag === 'crypt_shroud' || name === 'Саван') {
        const t = (typeof getThreatTarget === 'function' ? getThreatTarget(actor) : null) || livingHeroes()[0];
        if (t) applyStatus(t, { id: 'shroud', name: 'Саван', icon: '🕸️', turns: 2, dmgTakenMod: 0.16, tip: 'Два савана — Разойтись' });
      }
      if (flag === 'crypt_echo_add' || name === 'Восставший') {
        const donor = livingHeroes()[Math.floor(Math.random() * livingHeroes().length)];
        if (donor && typeof spawnMechAdd === 'function') {
          const add = spawnMechAdd(actor, { addName: 'Восставший · ' + donor.name, addId: 'z', addHp: 0.55 });
          if (add) { add.instRole = 'crypt_risen'; add.echoDonor = donor.uid; }
        }
      }
    }
    if (theme === 'forge') {
      if (flag === 'forge_kick' || flag === 'forge_blast' || name === 'Живая бомба') addForgeHeat(flag === 'forge_blast' ? 2 : 1, 'пропуск каста');
      if (flag === 'forge_recal') addForgeHeat(2, 'Перекал');
      if (flag === 'forge_spark') addForgeHeat(2, 'Искра горна');
      if (flag === 'forge_bash' && !hasWall(typeof getThreatTarget === 'function' ? getThreatTarget(actor) : null)) {
        addForgeHeat(1, 'без стенки');
        if (actor.instRole === 'forge_bruiser') {
          livingHeroes().forEach(h => {
            const raw = Math.round(getEff(actor).atk * 0.70);
            dealDmg(h, raw, actor, { type: 'aoe', isAoe: true, abilityName: 'Выплеск корки', school: 'fire' });
            addScale(h);
          });
        }
      }
    }
    if (theme === 'ember') {
      const bossMode = !!(combat.enemies || []).some(e => e.isBoss);
      if (flag === 'ember_erupt' || /Искра|Кнут пепла/.test(name)) addHallHeat(bossMode ? 2 : 1, 'пропуск каста', bossMode);
      if (flag === 'ember_slam') {
        const t = (typeof getThreatTarget === 'function' ? getThreatTarget(actor) : null);
        if (t && !hasWall(t)) {
          addHallHeat(bossMode && combat.type === 'final' ? 2 : 1, 'Обвал без стенки', bossMode);
          const cur = (t.buffs || []).find(b => b.id === 'ember_plates');
          const cap = (bossMode && combat.type === 'final') ? 3 : 2;
          if (cur) cur.stacks = Math.min(cap, (cur.stacks || 1) + 1);
          else applyStatus(t, { id: 'ember_plates', name: 'Раскалённые латы', icon: '🛡️', turns: bossMode && combat.type === 'final' ? 4 : 3, stacks: 1, tip: 'Хил ≥10–12% max HP снимает стак' });
        }
      }
    }
  }

  function onInstInterrupt(target) {
    const theme = instTheme();
    if (theme === 'forge' && !(target && target.isBoss && target.mech && target.mech.id === 'heat')) {
      addForgeHeat(-1, 'прерывание');
      if (target && target.instRole === 'forge_giant') instCombat().heat = 0;
      if (target && target.instRole === 'forge_smith') {
        addForgeHeat(-1, 'Искра горна');
        livingHeroes().forEach(h => { if (h.buffs) h.buffs = h.buffs.filter(b => b.id !== 'forge_clamp'); });
      }
    }
  }

  function onInstDamage(target, raw, attacker, ctx) {
    if (!target || run?.raid) return raw;
    const theme = instTheme();
    const inst = instCombat();
    const name = ctx?.abilityName || '';

    if (target.instRole === 'vent') {
      addPressure(-2, 'вентиль');
      toast('Вентиль −2 давления');
      return 0;
    }
    if (target.instRole === 'lantern') {
      if (target.instLit) {
        log('Фонарь погашен', 'player');
        target.instLit = false;
      } else {
        if (attacker && attacker.side === 'ally') addDoubt(attacker);
        log('Не тот фонарь', 'enemy');
      }
      return 0;
    }
    if (target.instRole === 'reflect' && target.reflectOf) {
      const real = (combat.enemies || []).find(e => e.uid === target.reflectOf && e.alive);
      if (real && raw > 0) {
        const heal = Math.round(raw * 0.8);
        real.hp = Math.min(real.maxHp, real.hp + heal);
        if (attacker && attacker.side === 'ally') addDoubt(attacker);
        log('Отражение кормит ' + real.name, 'enemy');
        toast('Не то тело!');
      }
      return 0;
    }
    if (target.instRole === 'trough') {
      if (attacker && hasCoal(attacker) && !isAoeCtx(ctx)) {
        clearCoal();
        addHallHeat(-2, 'уголь в жёлоб');
        inst.placedThisRound = true;
        toast('Уголь в жёлоб');
      }
      return 0;
    }
    if (target.instRole === 'furnace') {
      if (attacker && hasCoal(attacker) && !isAoeCtx(ctx)) {
        clearCoal();
        addHallHeat(-2, 'уголь в топку', true);
        livingHeroes().forEach(h => { if (h.buffs) h.buffs = h.buffs.filter(b => b.id !== 'ember_brand'); });
        inst.placedThisRound = true;
        toast('Уголь в топку');
      }
      return 0;
    }
    if (target.instRole === 'empty_contour') {
      target.hp = 0; target.alive = false;
      log('Пустой контур снят — сил нет', 'player');
      return 0;
    }
    if (target.instCore && isAoeCtx(ctx)) raw = Math.round(raw * 0.35);
    if (target.instShell && !isAoeCtx(ctx)) raw = Math.round(raw * 0.40);

    if (theme === 'tide' && attacker && attacker.instRole === 'tentacle' && name === 'Шквал') addPressure(1, 'Шквал');
    if (theme === 'tide' && attacker && /Удар якорем/.test(name) && raw > 0) {
      addPressure(1, 'Удар якорем');
      const tank = livingHeroes().find(h => h.role === 'tank');
      if (tank && tank.hp / tank.maxHp < 0.4) addLungs(tank, 1);
    }
    if (theme === 'jade' && attacker && attacker.side === 'ally') {
      const cut = ((attacker.buffs || []).find(b => b.id === 'jade_doubt')?.stacks || 0) * 0.08;
      if (cut) raw = Math.round(raw * (1 - cut));
    }
    if (theme === 'crypt' && attacker && attacker.side === 'ally' && !isAoeCtx(ctx)) {
      target._lastClickUid = attacker.uid;
      if (target.instRole === 'crypt_plate') { target._plateClicked = true; target._plateIgnore = 0; }
      if (target.instRole === 'crypt_grave') { target._skinClicked = true; target._skinIgnore = 0; }
      if (attacker._echoLast === target.uid) {
        applyStatus(attacker, { id: 'double_echo', name: 'Двойной отзвук', icon: '🔁', turns: 2, tip: 'Следующий входящий повторится на 50%' });
      }
      attacker._echoLast = target.uid;
    }
    if (theme === 'crypt' && target.instRole === 'echo_anchor') { /* ok */ }
    if (theme === 'crypt' && target.isBoss && combat.type === 'final' && raw > 0) {
      inst.echoDebt = (inst.echoDebt || 0) + raw;
    }
    if (theme === 'forge' && attacker && attacker.instRole === 'forge_bruiser' && flagOrName(ctx, 'forge_slag', 'Шлаковый удар')) {
      const t = target;
      if (t && !hasWall(t)) addScale(t);
    }
    if (theme === 'ember') {
      const bossMode = !!(combat.enemies || []).some(e => e.isBoss);
      if (target.instRole === 'ember_brute' || (target.isBoss && combat.type === 'boss')) {
        const h = inst.hallHeat || 0;
        if (target.instRole === 'ember_brute') {
          if (h >= 8) raw = Math.round(raw * 0.75);
          else if (h >= 6) raw = Math.round(raw * 0.80);
          else if (h >= 3) raw = Math.round(raw * 0.90);
        }
        if (attacker && hasCoal(attacker) && !isAoeCtx(ctx) && target.instRole === 'ember_brute') {
          target.hp = Math.min(target.maxHp, target.hp + Math.round(target.maxHp * 0.05));
          addHallHeat(1, 'глоток угля', bossMode);
          clearCoal();
          toast('Глоток угля!');
          return 0;
        }
        if (attacker && hasCoal(attacker) && !isAoeCtx(ctx) && target.isBoss && combat.type === 'boss') {
          target.hp = Math.min(target.maxHp, target.hp + Math.round(target.maxHp * 0.06));
          addHallHeat(1, 'глоток', true);
          clearCoal();
          return 0;
        }
        if (attacker && (target.buffs || []).some(b => b.id === 'ember_brand') === false && attacker.side === 'ally'
            && (attacker.buffs || []).some(b => b.id === 'ember_brand') && target.isBoss) {
          target.hp = Math.min(target.maxHp, target.hp + Math.round(target.maxHp * 0.05));
          addHallHeat(1, 'клеймо кормит', true);
          return 0;
        }
        if (attacker && !hasCoal(attacker) && !isAoeCtx(ctx) && (inst.hallHeat || 0) >= 4 && !inst.yankUsed && target.instRole === 'ember_brute') {
          giveCoal(attacker, 3);
          inst.yankUsed = true;
          log(attacker.name + ' вырвал уголь', 'player');
        }
      }
      if ((target.instRole === 'ember_colossus' || (target.isBoss && combat.type === 'final')) && attacker && hasCoal(attacker) && !isAoeCtx(ctx)) {
        addHallHeat(-1, 'уголь в корпус', bossMode);
        inst.shellLoads = (inst.shellLoads || 0) + ((inst.hallHeat || 0) >= 6 && combat.type === 'final' ? 2 : 1);
        inst.placedThisRound = true;
        const need = combat.type === 'final' ? 3 : 2;
        if (inst.shellLoads >= need) {
          inst.shellLoads = 0;
          target.buffs = (target.buffs || []).filter(b => b.id !== 'ember_shell');
          applyStatus(target, { id: 'ember_crack', name: 'Разлом корпуса', icon: '💥', turns: combat.type === 'final' ? 4 : 3, dmgTakenMod: combat.type === 'final' ? 0.25 : 0.15, tip: 'Корпус снят' });
          addHallHeat(-1, 'разлом', bossMode);
          log('Корпус снят', 'player');
        }
        clearCoal();
      }
      if (attacker && attacker.instRole === 'ember_brute') {
        const h = inst.hallHeat || 0;
        let w = 1.40;
        if (h >= 8) w = 2.00; else if (h >= 6) w = 1.80; else if (h >= 3) w = 1.60;
        if (/Удар угля/.test(name)) raw = Math.round(getEff(attacker).atk * w);
        if (inst.coal) {
          const c = (run.party || []).find(p => p.uid === inst.coal.heroUid);
          if (c && c.alive) trueDmg(c, 0.04, attacker, 'Удар по носителю', 'fire');
        }
      }
    }
    if (theme === 'rift' && combat.type === 'boss' && attacker && attacker.side === 'ally' && !isAoeCtx(ctx)
        && (target.instRole === 'rift_echo' || target.isBoss)) {
      if ((target.buffs || []).some(b => b.id === 'rift_phase')) {
        target.buffs = target.buffs.filter(b => b.id !== 'rift_phase');
        applyStatus(target, { id: 'rift_anchor', name: 'Заякорен', icon: '⚓', turns: 3, dmgTakenMod: 0.50, tip: '+50% входящего' });
        log('Якорь фазы на ' + target.name, 'player');
      }
    }
    return raw;
  }
  function flagOrName(ctx, flag, name) {
    return (ctx && ctx.instFlag === flag) || (ctx && ctx.abilityName === name);
  }

  function onInstHeal(target, amount, healer) {
    if (!target || run?.raid) return;
    if ((target.buffs || []).some(b => b.id === 'tide_lungs')) {
      const all = healer && ['pain_supp', 'guardian'].includes(healer._lastAbilityId);
      clearLungs(target, all);
    }
    if ((target.buffs || []).some(b => b.id === 'petrify')) {
      const ab = healer && healer._lastAbilityId;
      const aoeHeal = ab && /heal_aoe|prayer|tranquility|revival|chi_x|lotus/.test(ab);
      if (!aoeHeal) {
        target.buffs = target.buffs.filter(b => b.id !== 'petrify');
        log(target.name + ': Окаменение снято', 'heal');
      }
    }
    if ((target.buffs || []).some(b => b.id === 'ember_plates') && amount >= target.maxHp * 0.10) {
      const b = target.buffs.find(x => x.id === 'ember_plates');
      b.stacks = (b.stacks || 1) - 1;
      if (b.stacks <= 0) target.buffs = target.buffs.filter(x => x.id !== 'ember_plates');
    }
    if ((target.buffs || []).some(b => b.id === 'ember_brand') && amount >= target.maxHp * 0.15) {
      target.buffs = target.buffs.filter(b => b.id !== 'ember_brand');
      log(target.name + ': Клеймо снято', 'heal');
    }
    if (healer && healer.side === 'ally') {
      const cut = ((healer.buffs || []).find(b => b.id === 'jade_doubt')?.stacks || 0) * 0.08;
      void cut;
    }
  }

  function onInstKill(unit, killer, ctx) {
    if (!unit || run?.raid) return;
    const theme = instTheme();
    const inst = instCombat();
    if (inst.dustEcho && unit.side === 'enemy') {
      partyTrue(0.06, unit, 'Пыльный отзвук', 'shadow');
      inst.dustEcho = 0;
      log('Пыльный отзвук хлопнул', 'enemy');
    }
    if (unit.instRole === 'crypt_acolyte') {
      const destUid = unit._lastClickUid;
      const dest = (run.party || []).find(h => h.uid === destUid && h.alive) || (typeof lowest === 'function' ? lowest(livingHeroes()) : livingHeroes()[0]);
      if (dest) applyStatus(dest, { id: 'rot', name: 'Гниль', icon: '🦠', turns: 2, dot: Math.round((unit.atk || 1) * 0.50), school: 'shadow', tip: 'Прыгнула с служки' });
    }
    if (unit.instRole === 'echo_anchor') openSoak(2, 'debt', 'Долг эха · ровно 2');
    if (theme === 'ember' && (unit.instRole === 'ember_live' || (unit.instRole === 'ember_coal' && unit.name.indexOf('Живой') >= 0))) {
      const bossMode = !!(combat.enemies || []).some(e => e.isBoss);
      if (isAoeCtx(ctx) || (killer && killer._lastWasAoe)) {
        addHallHeat(2, 'уголёк областью', bossMode);
        partyTrue(bossMode ? 0.08 : 0.06, unit, 'Вспышка угля', 'fire');
      } else if (killer && killer.side === 'ally') {
        if (inst.coal) {
          addHallHeat(1, 'второй уголь', bossMode);
          trueDmg(killer, 0.05, unit, 'Уголь уже есть', 'fire');
        } else giveCoal(killer, 3);
      }
    }
    if (theme === 'tide' && unit.instRole === 'tentacle' && inst.grab && inst.grab.tentacleUid === unit.uid) {
      const hero = (run.party || []).find(h => h.uid === inst.grab.heroUid);
      if (hero) hero.buffs = (hero.buffs || []).filter(b => b.id !== 'tide_grab');
      inst.grab = null;
      addPressure(-1, 'Щупальце убито');
    }
  }

  function tryInstAi(actor) {
    if (!actor || actor.side !== 'ally' && actor.side !== 'enemy') return false;
    if (actor.side !== 'enemy') return false;
    if (actor.instRole === 'jade_guard' && !actor._shouted) {
      const sh = (actor.abilities || []).find(a => a.instFlag === 'jade_shout' || a.name === 'Клич');
      if (sh && !(sh.curCd > 0)) {
        actor._shouted = true;
        if (typeof castAbility === 'function') { castAbility(actor, sh, actor); return true; }
      }
    }
    if (actor.instRole === 'rift_crawler' && !actor._waved) {
      const w = (actor.abilities || []).find(a => a.name === 'Волна пустоты');
      if (w && !(w.curCd > 0)) {
        actor._waved = true;
        if (typeof castAbility === 'function') { castAbility(actor, w, null); return true; }
      }
    }
    if (actor.instRole === 'crypt_risen' && actor.echoDonor) {
      const donor = (run.party || []).find(h => h.uid === actor.echoDonor);
      const last = donor && donor.lastAttackUid;
      const foes = (combat.enemies || []).filter(e => e.alive);
      const allies = livingHeroes();
      let t = foes.find(e => e.uid === last) || allies.find(h => h.uid === last);
      if (t && t.side === 'ally') trueDmg(t, 0, actor, 'Восставший');
      if (t && t.side === 'ally' && typeof dealTrue === 'function') dealTrue(t, Math.round(8 * ss()), actor, 'dot', { school: 'shadow', abilityName: 'Восставший' });
      else if (t && typeof dealDmg === 'function') dealDmg(t, Math.round(getEff(actor).atk), actor, { type: 'damage', abilityName: 'Восставший' });
      return true;
    }
    if (actor.instRole === 'ember_live') {
      addHallHeat(1, 'уголёк дожил до хода', !!(combat.enemies || []).some(e => e.isBoss));
    }
    return false;
  }

  function afterInstCast(actor, ability, target) {
    if (!actor || !ability || run?.raid) return;
    actor._lastAbilityId = ability.id;
    actor._lastWasAoe = ability.type === 'aoe' || ability.type === 'cast_aoe' || ability.type === 'heal_aoe';
    if (hasCoal(actor) && target && target.side === 'ally' && target.uid !== actor.uid && !target.isPet && !actor._lastWasAoe) {
      clearCoal();
      giveCoal(target, 3);
      log('Уголь передан → ' + target.name, 'system');
    }
    if (instTheme() === 'crypt' && ability.type === 'debuff' && target && target.side === 'ally') {
      /* shroud already in resolve */
    }
  }

  /* ── hooks ── */
  const _spawn = typeof spawnPack === 'function' ? spawnPack : null;
  if (_spawn) {
    spawnPack = function (type) {
      try {
        const inst = spawnInstEncounter(type);
        if (inst && inst.length) return inst;
      } catch (e) { console.error('[inst spawn]', e); }
      return _spawn(type);
    };
  }
  const _start = typeof startCombat === 'function' ? startCombat : null;
  if (_start) {
    startCombat = function (type) {
      const r = _start.apply(this, arguments);
      try { startInstRoom(); } catch (e) { console.error('[inst start]', e); }
      return r;
    };
  }
  const _apply = typeof applyBossMechanics === 'function' ? applyBossMechanics : null;
  if (_apply) {
    applyBossMechanics = function () {
      if (!run?.raid && UNITS[instTheme()]) {
        try { startInstRoom(); } catch (e) { console.error(e); }
        const theme = instTheme();
        const boss = (combat.enemies || []).find(e => e.isBoss);
        if (theme === 'forge' && boss && combat.type === 'final' && _apply) {
          if (boss.mech && boss.mech.id === 'heat') _apply.apply(this, arguments);
        }
        return;
      }
      return _apply.apply(this, arguments);
    };
  }
  const _tick = typeof tickBossMechanics === 'function' ? tickBossMechanics : null;
  if (_tick) {
    tickBossMechanics = function () {
      const theme = instTheme();
      if (run?.raid || !UNITS[theme]) {
        _tick.apply(this, arguments);
      } else if (theme === 'forge' && combat.type === 'final') {
        _tick.apply(this, arguments);
      }
      try { tickInstRoom(); } catch (e) { console.error('[inst tick]', e); }
    };
  }
  const _deal = typeof dealDmg === 'function' ? dealDmg : null;
  if (_deal) {
    dealDmg = function (target, raw, attacker, ctx) {
      let n = raw;
      try { n = onInstDamage(target, raw, attacker, ctx); } catch (e) { console.error(e); }
      const before = target && target.hp;
      const dealt = _deal(target, n, attacker, ctx);
      try {
        if (target && before > 0 && target.hp <= 0) onInstKill(target, attacker, ctx);
      } catch (e) { console.error(e); }
      return dealt;
    };
  }
  const _heal = typeof healUnit === 'function' ? healUnit : null;
  if (_heal) {
    healUnit = function (t, amount, healer, opts) {
      if (healer && healer.side === 'ally') {
        const cut = ((healer.buffs || []).find(b => b.id === 'jade_doubt')?.stacks || 0) * 0.08;
        if (cut) amount = Math.round(amount * (1 - cut));
      }
      const r = _heal(t, amount, healer, opts);
      try { onInstHeal(t, r || amount, healer); } catch (e) { console.error(e); }
      return r;
    };
  }
  const _resolve = typeof resolveCasting === 'function' ? resolveCasting : null;
  if (_resolve) {
    resolveCasting = function (actor) {
      const c = actor && actor.casting;
      if (c) {
        try {
          if (handleInstCast(actor, c)) {
            actor.casting = null;
            if (c.interruptible !== false && c.kind === 'kick') {
              /* handled without miss? it resolved — count as miss only if kick kind and we didn't intercept before miss logic */
            }
            try { onInstCastResolved(actor, c); } catch (e) { console.error(e); }
            return;
          }
        } catch (e) { console.error(e); }
      }
      const r = _resolve.apply(this, arguments);
      try { onInstCastResolved(actor, c); } catch (e) { console.error(e); }
      return r;
    };
  }
  const _kick = typeof interruptCast === 'function' ? interruptCast : null;
  if (_kick) {
    interruptCast = function (target, actor) {
      if (target && livingHeroes().some(h => (h.buffs || []).some(b => b.id === 'crypt_silence' || b.id === 'deaf'))) {
        if ((actor && (actor.buffs || []).some(b => b.id === 'crypt_silence' || b.id === 'deaf')) || livingHeroes().some(h => (h.buffs || []).some(b => b.id === 'crypt_silence'))) {
          if ((actor.buffs || []).some(b => b.id === 'crypt_silence' || b.id === 'deaf')) {
            log('Тишина / Оглушённый слух — прерывание пустое', 'system');
            return false;
          }
        }
      }
      const r = _kick.apply(this, arguments);
      try { if (r) onInstInterrupt(target); } catch (e) { console.error(e); }
      return r;
    };
  }
  const _check = typeof checkEnd === 'function' ? checkEnd : null;
  if (_check) {
    checkEnd = function () {
      if (combat && combat.enemies) {
        const real = combat.enemies.filter(e => e.alive && e.hp > 0 && !e.vaultAway && !e.instObject && e.instRole !== 'vent' && e.instRole !== 'reflect' && e.instRole !== 'trough' && e.instRole !== 'furnace' && e.instRole !== 'lantern');
        const dummy = combat.enemies.filter(e => e.instObject || e.instRole === 'vent' || e.instRole === 'reflect' || e.instRole === 'trough' || e.instRole === 'furnace' || e.instRole === 'lantern');
        if (!real.length && dummy.length) dummy.forEach(d => { d.alive = false; d.hp = 0; });
      }
      return _check.apply(this, arguments);
    };
  }
  const _build = typeof buildTurnQueue === 'function' ? buildTurnQueue : null;
  if (_build) {
    buildTurnQueue = function () {
      _build.apply(this, arguments);
      if (!combat || !combat.turnQueue) return;
      combat.turnQueue = combat.turnQueue.filter(id => {
        const u = (typeof allUnits === 'function' ? allUnits() : []).find(x => x.uid === id);
        return u && !u.instObject && u.instRole !== 'vent' && u.instRole !== 'reflect' && u.instRole !== 'trough' && u.instRole !== 'furnace' && u.instRole !== 'lantern';
      });
    };
  }
  const _ai = typeof aiAct === 'function' ? aiAct : null;
  if (_ai) {
    aiAct = function (actor) {
      try { if (tryInstAi(actor)) return; } catch (e) { console.error(e); }
      return _ai.apply(this, arguments);
    };
  }
  const _cast = typeof castAbility === 'function' ? castAbility : null;
  if (_cast) {
    castAbility = function (actor, ability, target) {
      const r = _cast.apply(this, arguments);
      try { afterInstCast(actor, ability, target); } catch (e) { console.error(e); }
      return r;
    };
  }
  const _click = typeof onUnitClick === 'function' ? onUnitClick : null;
  if (_click) {
    onUnitClick = function (unit) {
      const inst = combat && combat.inst;
      if (inst && inst.soak && unit && unit.side === 'ally' && !unit.isPet && !pendingTarget) {
        if (pickSoak(unit)) { try { if (typeof renderCombat === 'function') renderCombat(); } catch (_) {} return; }
      }
      if (inst && unit && combat?.waitingPlayer && !pendingTarget && unit.side === 'ally') {
        const actor = typeof currentActor === 'function' ? currentActor() : null;
        if (actor && actor.uid === unit.uid && (unit.buffs || []).some(b => b.id === 'need_spread' || b.id === 'shroud')) {
          unit.buffs = unit.buffs.filter(b => b.id !== 'need_spread');
          applyStatus(unit, { id: 'spread_ok', name: 'Разошлись', icon: '💨', turns: 2, tip: 'Отошли' });
          log(unit.name + ': Разойтись', 'player');
          toast('Разошлись');
          try { if (typeof renderCombat === 'function') renderCombat(); } catch (_) {}
          return;
        }
      }
      return _click.apply(this, arguments);
    };
  }

  window.spawnInstEncounter = spawnInstEncounter;
  window.startInstRoom = startInstRoom;
  window.tickInstRoom = tickInstRoom;
})();
