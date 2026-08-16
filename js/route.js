/* route: talents, dungeons, route graph, targeting rules */
  const TALENTS = [
    { id: 'steel', name: 'Закалённая сталь', icon: '⚔️', rarity: 'common', desc: '+12% атаки', effect: { atkMult: 1.12 } },
    { id: 'iron', name: 'Железная кожа', icon: '🛡️', rarity: 'common', desc: '+12% DEF', effect: { defMult: 1.12 } },
    { id: 'vital', name: 'Живучесть', icon: '❤️', rarity: 'common', desc: '+15% здоровья', effect: { hpMult: 1.15 } },
    { id: 'haste', name: 'Ускорение', icon: '💨', rarity: 'common', desc: '+2 скорости', effect: { speedFlat: 2 } },
    { id: 'vamp', name: 'Вампиризм', icon: '🦇', rarity: 'rare', desc: '12% lifesteal', effect: { lifesteal: 0.12 } },
    { id: 'triage', name: 'Сортировка', icon: '💉', rarity: 'rare', desc: 'Хилы +30%', effect: { healMult: 1.3 } },
    { id: 'glass', name: 'Стеклянная пушка', icon: '🔫', rarity: 'rare', desc: 'Бойцы +20% атаки', effect: { dpsAtk: 1.2 } },
    { id: 'bulwark', name: 'Оплот', icon: '🏰', rarity: 'rare', desc: 'Танки +25% здоровья', effect: { tankHp: 1.25 } },
    { id: 'execute', name: 'Казнь', icon: '⚰️', rarity: 'epic', desc: '+40% по целям <35% здоровья', effect: { execute: 1.4 } },
    { id: 'lust', name: 'Кровожадность', icon: '🐺', rarity: 'epic', desc: '+30% атаки на 2 хода в бою', effect: { bloodlust: 0.3 } },
    { id: 'all', name: 'Мастер ключа', icon: '🔑', rarity: 'epic', desc: '+10% все статы', effect: { allMult: 1.1 } },
    { id: 'aoe', name: 'Мастер области', icon: '💫', rarity: 'epic', desc: 'Урон по области +40%', effect: { aoeMult: 1.4 } },
  ];

  const DUNGEONS = [
    { id: 'crypts', name: 'Склеп Эха', theme: 'crypt', timerBase: 28 * 60,
      midName: 'Хранитель склепа', finalName: 'Повелитель Склепа',
      pathLabels: { a: 'Галерея костей', b: 'Могильный чемпион', c: 'Костяной двор', d: 'Хранитель урн' } },
    { id: 'forge', name: 'Пепельная Кузня', theme: 'forge', timerBase: 27 * 60,
      midName: 'Мастер горна', finalName: 'Пепельная Королева',
      pathLabels: { a: 'Искровой штрек', b: 'Шлаковый исполин', c: 'Зал молотов', d: 'Кователь' } },
    { id: 'tide', name: 'Затопленный Приливник', theme: 'tide', timerBase: 30 * 60,
      midName: 'Жрец прилива', finalName: 'Ужас Прилива',
      pathLabels: { a: 'Коралловый ход', b: 'Утопленный страж', c: 'Шлюз', d: 'Жрец лагуны' } },
    { id: 'jade', name: 'Нефритовый Монастырь', theme: 'jade', timerBase: 29 * 60,
      midName: 'Ученик ша', finalName: 'Ша Сомнения',
      pathLabels: { a: 'Двор фонарей', b: 'Каменный ученик', c: 'Галерея', d: 'Тень ша' } },
    { id: 'rift', name: 'Разлом Хаоса', theme: 'rift', timerBase: 28 * 60, randomEnemies: true,
      midName: 'Разломный Страж', finalName: 'Пожиратель Разлома',
      pathLabels: { a: 'Трещина', b: 'Пустотный сталкер', c: 'Вихрь', d: 'Осколок ядра' } },
    { id: 'ember', name: 'Угольные Чертоги', theme: 'ember', timerBase: 29 * 60, randomEnemies: true,
      midName: 'Пепельный Надсмотрщик', finalName: 'Угольный Титан',
      pathLabels: { a: 'Зольный проход', b: 'Угольный колосс', c: 'Пепельный зал', d: 'Жаркий очаг' } },
  ];
  const ROOM_META = {
    trash: { name: 'Пак', icon: '👾' }, elite: { name: 'Элита', icon: '💀' },
    boss: { name: 'Босс', icon: '🗿' }, final: { name: 'Финал', icon: '👑' }, rest: { name: 'Привал', icon: '🏕️' },
  };
  /** Target enemy forces % for key clear (M+ style). Map has more than 100% via side routes. */
  const FORCES_TARGET = 100;
  const FORCES_MAP_BUDGET = 128; // sum of all combat nodes on full map

  /**
   * Branching route graph (not a linear list).
   * Main path has forks; mopup nodes unlock after final if forces < 100%.
   */
  function generateRoute(dungeon) {
    const L = dungeon.pathLabels || { a: 'Пак', b: 'Чемпион', c: 'Зал', d: 'Страж' };
    const midName = dungeon.midName || 'Страж';
    const finalName = dungeon.finalName || 'Трон';
    // Спуск: врата → коридор → пак/СТ → мид → спуск → пак/СТ → обязательный СТ → трон.
    // Привалов нет. % абсолютные: AoE-путь ~74%, оба СТ ~107%. Ключ только с 100%.
    const nodes = {
      start:    { id: 'start',    type: 'trash', pack: 'aoe',   name: 'Врата',               loc: 'entrance', next: ['hall'], forceBudget: 10 },
      hall:     { id: 'hall',     type: 'trash', pack: 'aoe',   name: 'Коридор',             loc: 'corridor', next: ['fork1a', 'fork1b'], forceBudget: 11 },
      fork1a:   { id: 'fork1a',   type: 'trash', pack: 'aoe',   name: L.a,                   loc: 'gallery',  next: ['mid'], forceBudget: 10, branch: 'A' },
      fork1b:   { id: 'fork1b',   type: 'elite', pack: 'st',    name: L.b + ' · СТ',         loc: 'elite',    next: ['mid'], forceBudget: 26, branch: 'B' },
      mid:      { id: 'mid',      type: 'boss',                 name: midName,               loc: 'mid',      next: ['descent'], forceBudget: 0 },
      descent:  { id: 'descent',  type: 'trash', pack: 'mixed', name: 'Спуск',               loc: 'depths',   next: ['fork2a', 'fork2b'], forceBudget: 12 },
      fork2a:   { id: 'fork2a',   type: 'trash', pack: 'aoe',   name: L.c,                   loc: 'inner',    next: ['approach'], forceBudget: 11, branch: 'C' },
      fork2b:   { id: 'fork2b',   type: 'elite', pack: 'st',    name: L.d + ' · СТ',         loc: 'sanctum',   next: ['approach'], forceBudget: 28, branch: 'D' },
      approach: { id: 'approach', type: 'elite', pack: 'st',    name: 'Преддверие · СТ',     loc: 'approach', next: ['final'], forceBudget: 20 },
      final:    { id: 'final',    type: 'final',                name: finalName,             loc: 'throne',   next: [], forceBudget: 0 },
      mop1:     { id: 'mop1',     type: 'trash', pack: 'aoe',   name: 'Добор: двор',         loc: 'mopup',    next: ['mop2'], forceBudget: 12, mopup: true },
      mop2:     { id: 'mop2',     type: 'elite', pack: 'st',    name: 'Добор: чемпион · СТ', loc: 'annex',    next: ['mop3'], forceBudget: 18, mopup: true },
      mop3:     { id: 'mop3',     type: 'trash', pack: 'mixed', name: 'Добор: склеп',        loc: 'gallery',  next: ['mop1'], forceBudget: 12, mopup: true },
    };
    return {
      nodes,
      currentId: 'start',
      visited: [],
      finalCleared: false,
      mopupMode: false,
      seedMeta: { layout: 'descent-v2' },
    };
  }
  function routeNode(id) {
    return run?.route?.nodes?.[id] || null;
  }
  function currentRouteNode() {
    return routeNode(run?.route?.currentId);
  }
  function routeNextOptions() {
    const cur = currentRouteNode();
    if (!cur) return [];
    let nextIds = cur.next || [];
    // After final boss with incomplete forces → mopup chain
    if (cur.type === 'final' && run.route.finalCleared && (run.forces || 0) < FORCES_TARGET) {
      nextIds = ['mop1'];
    }
    return nextIds.map(id => routeNode(id)).filter(Boolean)
      .filter(n => !run.route.visited.includes(n.id) || n.mopup);
  }
  const PARTY_SIZE = 5; // 1 tank · 1 healer · 3 DPS
  const PRESETS = {
    classic: [
      { classId: 'warrior', specId: 'protection' },
      { classId: 'priest', specId: 'discipline' },
      { classId: 'mage', specId: 'fire' },
      { classId: 'rogue', specId: 'combat' },
      { classId: 'hunter', specId: 'beast_mastery' },
    ],
    aoe: [
      { classId: 'monk', specId: 'brewmaster' },
      { classId: 'shaman', specId: 'restoration' },
      { classId: 'mage', specId: 'frost' },
      { classId: 'warlock', specId: 'destruction' },
      { classId: 'druid', specId: 'balance' },
    ],
    burst: [
      { classId: 'deathknight', specId: 'blood' },
      { classId: 'paladin', specId: 'holy' },
      { classId: 'rogue', specId: 'assassination' },
      { classId: 'hunter', specId: 'marksmanship' },
      { classId: 'warrior', specId: 'arms' },
    ],
  };
  const EXECUTE_IDS = new Set(['execute', 'kill_shot', 'soul_reaper', 'shadowburn', 'hot_w', 'swd']);
  // Finisher scale only meaningful for combo-point spenders (see castAbility). Shard/HP/chi use flat power.
  const FINISHER_IDS = new Set(['dispatch', 'eviscerate', 'rupture', 'templar', 'divine_storm', 'word_glory', 'light_dawn', 'sot_r', 'blackout', 'bok', 'rsk', 'fists', 'enveloping', 'uft', 'touch_death', 'ferocious', 'rip']);

  /**
   * Targeting rules (design-notes/03):
   * self_only — локальные дефы/self-heal (танк, elusive, bone shield…)
   * ally_any  — внешние щиты/сейвы хила (PW:S, Pain Supp, Guardian)
   * enemy     — урон / дебаф / kick
   * default: shield → self_only; heal → ally_any
   */
  const TARGET_SELF_ONLY = new Set([
    // warrior prot
    'shield_block', 'shield_wall', 'last_stand',
    // paladin
    'sot_r', 'ardent', 'divine_prot',
    // DK blood
    'bone_shield', 'icebound', 'vampiric_blood', 'rune_tap',
    // brewmaster
    'guard', 'elusive', 'fort_brew', 'purifying',
    // guardian
    'savage_def', 'barkskin', 'survival', 'frenzied',
    // other self
    'dispersion', 'ember_tap',
    // engineer mechanist
    'plasma_cutter', 'bot_overdrive', 'call_siege_walker', 'emergency_repair',
  ]);
  /** Healer external shields/saves — can target allies */
  const TARGET_ALLY_ANY = new Set([
    'shield',      // PW:S (Disc)
    'pain_supp',   // Pain Suppression
    'guardian',    // Guardian Spirit
  ]);
  function abilityTargetRule(ab) {
    if (!ab) return 'none';
    if (TARGET_SELF_ONLY.has(ab.id)) return 'self_only';
    if (TARGET_ALLY_ANY.has(ab.id)) return 'ally_any';
    // Holy Shock etc.: click ally OR enemy
    if (ab.holyShock) return 'ally_or_enemy';
    if (ab.type === 'dispel') return 'ally_any';
    if (ab.type === 'purge' || ab.type === 'cc') return 'enemy';
    if (ab.type === 'heal') return 'ally_any';
    if (ab.type === 'heal_aoe') return ab.chainPrimary ? 'ally_any' : 'party';
    if (ab.type === 'shield' || ab.type === 'cleanse') return 'self_only'; // safe default
    if (ab.type === 'buff' || ab.type === 'taunt') return 'self_only';
    if (DOT_ABILITY_IDS.has(ab.id) || ab.type === 'dot') return 'enemy';
    if (['damage', 'dot', 'debuff', 'interrupt', 'aoe', 'cast_aoe'].includes(ab.type) || INTERRUPT_IDS.has(ab.id)) return 'enemy';
    return 'none';
  }
  function abilityNeedsClickTarget(ab) {
    if (!ab) return false;
    // Щит мстителя: клик для основной цели (сбитие каста)
    if (ab.id === 'avengers' || ab.interruptPrimary) return true;
    const r = abilityTargetRule(ab);
    return r === 'ally_any' || r === 'enemy' || r === 'ally_or_enemy';
  }
  function resolveAbilityTarget(actor, ability, target) {
    const rule = abilityTargetRule(ability);
    if (rule === 'self_only' || rule === 'party' || rule === 'none') return actor;
    if (rule === 'ally_any') {
      if (target && target.alive && target.side === actor.side && !target.isPet) return target;
      return lowest(living(actor.side === 'ally' ? 'ally' : 'enemy').filter(u => !u.isPet)) || actor;
    }
    if (rule === 'enemy') {
      if (target && target.alive && target.side !== actor.side) return target;
      return null;
    }
    return target || actor;
  }

  // ═══════════════════════════════════════════════════════════
  // 3 MINI-SYSTEMS: Telegraph · Cleanse/CC · Affix Agency + Loot
  // ═══════════════════════════════════════════════════════════
  const TELE_ICONS = { kick: '⚡', buster: '🛡️', aoe: '🌋', summon: '👻', debuff: '⬇️' };
  const LOOT_DRAFT_POOL = [
    { id: 'ring_power', name: 'Кольцо силы', icon: '💍', desc: '+8% атаки отряду', atkMult: 0.08 },
    { id: 'cloak_life', name: 'Плащ живучести', icon: '🧥', desc: '+10% макс. здоровья', hpFlat: 0.1 },
    { id: 'amulet_heal', name: 'Амулет исцеления', icon: '📿', desc: '+12% лечения', healMult: 0.12 },
    { id: 'boots_haste', name: 'Сапоги спешки', icon: '👟', desc: '+1 скорость всем', speedFlat: 1 },
    { id: 'trinket_burst', name: 'Амулет ярости', icon: '🔥', desc: 'Актив: +35% атаки на 1 ход', trinketAtk: 0.35, playStyle: true },
    { id: 'cloak_timer', name: 'Плащ времени', icon: '⏳', desc: 'Смерть: −3 с таймера вместо −5', deathTax: 3 },
    { id: 'ring_vers', name: 'Кольцо стойкости', icon: '🔷', desc: '+5% DEF', defFlat: 0.05 },
    { id: 'charm_focus', name: 'Оберег фокуса', icon: '🎯', desc: '+6% атаки, −1 скорость', atkMult: 0.06, speedFlat: -1 },
    // Play-style powers (active / reactive)
    { id: 'power_lust', name: 'Барабаны битвы', icon: '🥁', desc: 'Актив 1×/бой: +30% атаки отряду 2 хода', keyPower: 'lust', playStyle: true },
    { id: 'power_rez', name: 'Камень возврата', icon: '💎', desc: '1× за ключ: воскресить союзника на 40% здоровья', keyPower: 'battle_rez', playStyle: true },
    { id: 'power_kick', name: 'Печать прерывания', icon: '⚡', desc: 'Прерывания: −1 КД (мин. 1)', kickCdBonus: 1, playStyle: true },
    { id: 'power_skip', name: 'Карта обхода', icon: '🗺️', desc: '1×: пропустить trash-пулл (силы 0)', keyPower: 'skip_trash', playStyle: true },
    { id: 'power_shield', name: 'Оберег группы', icon: '🛡️', desc: 'Актив 1×/бой: щит 18% здоровья отряду', keyPower: 'party_shield', playStyle: true },
    { id: 'power_focus', name: 'Метка охотника', icon: '🏹', desc: 'Актив: +40% урона по цели 2 хода', keyPower: 'hunter_mark', playStyle: true },
  ];
