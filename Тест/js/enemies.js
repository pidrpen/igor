/* enemies: affixes + enemy templates */
  const AFFIXES = [
    { id: 'tyrannical', name: 'Тиранический', minKey: 2, kind: 'boss_hp', value: 1.4, desc: 'Боссы крепче и злее' },
    { id: 'fortified', name: 'Укреплённый', minKey: 2, kind: 'trash_hp', value: 1.35, desc: 'Треш крепче' },
    { id: 'bolstering', name: 'Усиливающий', minKey: 4, kind: 'bolster', value: 0.18, desc: 'Смерть усиливает остальных' },
    { id: 'raging', name: 'Разъярённый', minKey: 7, kind: 'enrage_low', value: 0.35, desc: 'Враги в ярости при низком здоровье' },
    { id: 'bursting', name: 'Взрывной', minKey: 7, kind: 'burst', value: 0.1, desc: 'Смерть даёт стеки взрыва' },
    { id: 'sanguine', name: 'Кровавый', minKey: 4, kind: 'sanguine', value: 0.12, desc: 'Трупы лечат врагов рядом' },
    { id: 'grievous', name: 'Тяжёлый', minKey: 7, kind: 'grievous', value: 0.04, desc: 'Раненые герои истекают' },
    { id: 'quaking', name: 'Сотрясающий', minKey: 7, kind: 'quake', value: 0.08, desc: 'Каждые 3 раунда — толчок' },
    { id: 'spiteful', name: 'Злобный', minKey: 10, kind: 'spite', value: 0.55, desc: 'Духи мести' },
    { id: 'incorporeal', name: 'Бесплотный', minKey: 10, kind: 'incorporeal', value: 1, desc: 'Духи: purge / stun' },
    { id: 'afflicted', name: 'Страждущий', minKey: 10, kind: 'afflicted', value: 1, desc: 'Союзник требует очищения' },
    { id: 'thundering', name: 'Грозовой', minKey: 12, kind: 'thunder', value: 0.14, desc: 'Метки грозы' },
  ];

  /** ISO-like week number for weekly affix rotation */
  function mythicWeekId(d = new Date()) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const ys = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return 1 + Math.floor(((t - ys) / 86400000 + 1) / 7);
  }
  function seededShuffle(arr, seed) {
    const a = arr.slice();
    let s = seed >>> 0;
    for (let i = a.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const j = s % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Enemy templates (base before key scale). Elite = named dangers with telegraphs.
  const ENEMIES = {
    trash: [
      { id: 'z', name: 'Нежить', icon: '🧟', role: 'dps', hp: 95, atk: 13, def: 4, speed: 9, mana: 20,
        abilities: [{ id: 'h', name: 'Удар', cost: 0, cd: 0, type: 'damage', power: 1.05 }] },
      { id: 'a', name: 'Лучник', icon: '🏹', role: 'dps', hp: 72, atk: 15, def: 2, speed: 12, mana: 20,
        abilities: [
          { id: 'h', name: 'Выстрел', cost: 0, cd: 0, type: 'damage', power: 1.15 },
          { id: 'v', name: 'Залп', cost: 10, cd: 3, type: 'aoe', power: 0.5 },
        ] },
      { id: 'm', name: 'Мистик', icon: '🔮', role: 'healer', hp: 70, atk: 11, def: 2, speed: 10, mana: 45,
        abilities: [
          { id: 'b', name: 'Тень', cost: 0, cd: 0, type: 'damage', power: 0.95 },
          { id: 'h', name: 'Хил', cost: 12, cd: 2, type: 'heal', power: 0.32 },
          { id: 'c', name: 'Волна тьмы', cost: 10, cd: 3, type: 'cast_aoe', power: 0.82 },
        ] },
      { id: 'b', name: 'Громила', icon: '💪', role: 'tank', hp: 140, atk: 14, def: 8, speed: 6, mana: 15,
        abilities: [
          { id: 's', name: 'Удар', cost: 0, cd: 0, type: 'damage', power: 1.1 },
          { id: 'slam', name: 'Топот', cost: 8, cd: 2, type: 'aoe', power: 0.5 },
        ] },
      { id: 's', name: 'Тенеплёт', icon: '🕷️', role: 'dps', hp: 80, atk: 14, def: 2, speed: 13, mana: 25,
        abilities: [
          { id: 'bite', name: 'Укус', cost: 0, cd: 0, type: 'damage', power: 1.05 },
          { id: 'web', name: 'Паутина', cost: 10, cd: 3, type: 'debuff', power: 0.18 },
        ] },
      { id: 'r', name: 'Ритуалист', icon: '📿', role: 'dps', hp: 78, atk: 12, def: 2, speed: 10, mana: 40,
        abilities: [
          { id: 'bolt', name: 'Порча', cost: 0, cd: 0, type: 'damage', power: 1.0 },
          { id: 'nova', name: 'Теневая вспышка', cost: 12, cd: 3, type: 'cast_aoe', power: 0.7 },
        ] },
      { id: 'p', name: 'Пиромант', icon: '🔥', role: 'dps', hp: 74, atk: 13, def: 2, speed: 11, mana: 40,
        abilities: [
          { id: 'bolt', name: 'Огонь', cost: 0, cd: 0, type: 'damage', power: 1.05 },
          { id: 'bomb', name: 'Живая бомба', cost: 12, cd: 3, type: 'cast_aoe', power: 0.78 },
        ] },
    ],
    elite: [
      { id: 'c', name: 'Капитан', icon: '🪖', role: 'tank', hp: 240, atk: 19, def: 10, speed: 8, mana: 30,
        abilities: [
          { id: 'c', name: 'Рассечение', cost: 0, cd: 0, type: 'damage', power: 1.25 },
          { id: 's', name: 'Клич', cost: 10, cd: 3, type: 'buff', power: 0.25 },
          { id: 'slam', name: 'Удар щитом', cost: 12, cd: 2, type: 'aoe', power: 0.65 },
          { id: 'cast', name: 'Приказ к бою', cost: 12, cd: 3, type: 'cast_aoe', power: 0.85 },
        ] },
      { id: 'w', name: 'Чернокнижник-элит', icon: '😈', role: 'dps', hp: 195, atk: 22, def: 4, speed: 11, mana: 60,
        abilities: [
          { id: 'b', name: 'Стрела', cost: 0, cd: 0, type: 'damage', power: 1.3 },
          { id: 'd', name: 'Порча', cost: 10, cd: 2, type: 'dot', power: 0.6 },
          { id: 'n', name: 'Хаос', cost: 12, cd: 3, type: 'cast_aoe', power: 0.9 },
        ] },
      { id: 'j', name: 'Палач', icon: '🪓', role: 'dps', hp: 210, atk: 21, def: 6, speed: 10, mana: 25,
        abilities: [
          { id: 'cleave', name: 'Раскол', cost: 0, cd: 0, type: 'damage', power: 1.3 },
          { id: 'whirl', name: 'Вихрь клинков', cost: 12, cd: 2, type: 'aoe', power: 0.75 },
          { id: 'exec', name: 'Казнь стража', cost: 10, cd: 2, type: 'damage', power: 1.7 },
        ] },
      { id: 'sg', name: 'Каменный страж', icon: '🗿', role: 'tank', hp: 280, atk: 17, def: 14, speed: 6, mana: 20,
        abilities: [
          { id: 'bash', name: 'Сокрушение', cost: 0, cd: 0, type: 'damage', power: 1.2 },
          { id: 'wall', name: 'Каменная кожа', cost: 0, cd: 3, type: 'shield', power: 0.35 },
          { id: 'quake', name: 'Землетрясение', cost: 12, cd: 3, type: 'cast_aoe', power: 0.88 },
        ] },
      { id: 'pl', name: 'Ткач боли', icon: '🩸', role: 'dps', hp: 185, atk: 20, def: 3, speed: 12, mana: 55,
        abilities: [
          { id: 'lash', name: 'Плеть', cost: 0, cd: 0, type: 'damage', power: 1.2 },
          { id: 'dot', name: 'Агония', cost: 8, cd: 2, type: 'dot', power: 0.55 },
          { id: 'burst', name: 'Всплеск боли', cost: 12, cd: 3, type: 'cast_aoe', power: 0.95 },
        ] },
      { id: 'bz', name: 'Берсерк', icon: '😤', role: 'dps', hp: 220, atk: 20, def: 5, speed: 11, mana: 20,
        abilities: [
          { id: 'hit', name: 'Яростный удар', cost: 0, cd: 0, type: 'damage', power: 1.25 },
          { id: 'rage', name: 'Берсерк', cost: 0, cd: 4, type: 'buff', power: 0.35 },
          { id: 'slam', name: 'Сокрушительный удар', cost: 10, cd: 2, type: 'aoe', power: 0.7 },
        ] },
      { id: 'nk', name: 'Некромант', icon: '💀', role: 'healer', hp: 175, atk: 16, def: 3, speed: 9, mana: 60,
        abilities: [
          { id: 'bolt', name: 'Костяной шип', cost: 0, cd: 0, type: 'damage', power: 1.1 },
          { id: 'heal', name: 'Тёмное исцеление', cost: 12, cd: 2, type: 'heal', power: 0.35 },
          { id: 'sum', name: 'Восставший', cost: 14, cd: 3, type: 'summon', power: 1 },
          { id: 'nova', name: 'Взрыв костей', cost: 12, cd: 3, type: 'cast_aoe', power: 0.8 },
        ] },
      { id: 'as', name: 'Убийца', icon: '🗡️', role: 'dps', hp: 165, atk: 24, def: 3, speed: 15, mana: 25,
        abilities: [
          { id: 'stab', name: 'Удар в спину', cost: 0, cd: 0, type: 'damage', power: 1.35 },
          { id: 'poison', name: 'Яд', cost: 8, cd: 2, type: 'dot', power: 0.5 },
          { id: 'fan', name: 'Веер клинков', cost: 12, cd: 2, type: 'aoe', power: 0.7 },
        ] },
    ],
    bosses: {
      crypt: { id: 'bl', name: 'Ваэр, Последнее Эхо', icon: '👑', role: 'tank', hp: 560, atk: 20, def: 9, speed: 8, mana: 50,
        mech: { id: 'echo_vaer' },
        phases: [
          { at: 1, name: 'Костяной двор', abilities: [
            { id: 'a', name: 'Копьё отзвука', cost: 0, cd: 0, type: 'damage', power: 1.25, school: 'shadow' },
            { id: 'cast', name: 'Хор гробницы', cost: 12, cd: 2, type: 'cast_aoe', power: 0.85, castKind: 'kick', castPrio: 3, school: 'shadow' },
          ]},
          { at: 0.65, name: 'Кровавый алтарь', abilities: [
            { id: 'a', name: 'Копьё отзвука', cost: 0, cd: 0, type: 'damage', power: 1.35, school: 'shadow' },
            { id: 'buster', name: 'Казнь эха', cost: 14, cd: 2, type: 'cast_aoe', power: 1.1, castKind: 'buster', castPrio: 2, school: 'physical' },
            { id: 'cast', name: 'Хор гробницы', cost: 12, cd: 2, type: 'cast_aoe', power: 0.85, castKind: 'kick', castPrio: 3, school: 'shadow' },
          ]},
          { at: 0.3, name: 'Последнее эхо', abilities: [
            { id: 'a', name: 'Копьё отзвука', cost: 0, cd: 0, type: 'damage', power: 1.4, school: 'shadow' },
            { id: 'n', name: 'Волна смерти', cost: 10, cd: 1, type: 'aoe', power: 0.8, school: 'shadow' },
            { id: 'cast', name: 'Некротическая бомба', cost: 14, cd: 2, type: 'cast_aoe', power: 0.95, castKind: 'aoe', castPrio: 4, school: 'shadow' },
          ]},
        ]},
      forge: { id: 'eq', name: 'Пепельная Королева', icon: '🔥', role: 'dps', hp: 530, atk: 22, def: 6, speed: 11, mana: 55,
        mech: { id: 'heat', kickCools: true },
        phases: [
          { at: 1, name: 'Искры', abilities: [
            { id: 'l', name: 'Хлыст огня', cost: 0, cd: 0, type: 'damage', power: 1.25, school: 'fire' },
            { id: 'cast', name: 'Плавильный луч', cost: 12, cd: 2, type: 'cast_aoe', power: 0.88, castKind: 'kick', castPrio: 3, school: 'fire' },
            { id: 'r', name: 'Дождь искр', cost: 14, cd: 2, type: 'aoe', power: 0.65, school: 'fire' },
          ]},
          { at: 0.55, name: 'Горн', abilities: [
            { id: 'l', name: 'Хлыст огня', cost: 0, cd: 0, type: 'damage', power: 1.35, school: 'fire' },
            { id: 'buster', name: 'Молот кузни', cost: 14, cd: 2, type: 'cast_aoe', power: 1.15, castKind: 'buster', castPrio: 2, school: 'fire' },
            { id: 'r', name: 'Дождь искр', cost: 12, cd: 2, type: 'aoe', power: 0.75, school: 'fire' },
          ]},
          { at: 0.25, name: 'Инферно', abilities: [
            { id: 'i', name: 'Инферно', cost: 0, cd: 0, type: 'aoe', power: 0.85, school: 'fire' },
            { id: 'w', name: 'Гнев пламени', cost: 12, cd: 1, type: 'damage', power: 1.6, school: 'fire' },
            { id: 'cast', name: 'Сверхнакал', cost: 14, cd: 2, type: 'cast_aoe', power: 1.0, castKind: 'aoe', castPrio: 4, school: 'fire' },
          ]},
        ]},
      tide: { id: 'th', name: 'Ужас Прилива', icon: '🌊', role: 'tank', hp: 590, atk: 19, def: 10, speed: 8, mana: 50,
        mech: { id: 'tide_inst' },
        phases: [
          { at: 1, name: 'Глубины', abilities: [
            { id: 't', name: 'Щупальце', cost: 0, cd: 0, type: 'damage', power: 1.2, school: 'physical' },
            { id: 'cast', name: 'Приливный удар', cost: 12, cd: 2, type: 'cast_aoe', power: 0.82, castKind: 'kick', castPrio: 3, school: 'frost', instFlag: 'tide_hymn' },
            { id: 's', name: 'Шквал', cost: 12, cd: 2, type: 'aoe', power: 0.65, school: 'frost', instFlag: 'tide_squall' },
          ]},
          { at: 0.6, name: 'Наводнение', abilities: [
            { id: 't', name: 'Щупальце', cost: 0, cd: 0, type: 'damage', power: 1.3, school: 'physical' },
            { id: 'cast', name: 'Водоворот', cost: 12, cd: 2, type: 'cast_aoe', power: 0.9, castKind: 'aoe', castPrio: 3, school: 'frost', instFlag: 'tide_whirl' },
            { id: 's', name: 'Шквал', cost: 10, cd: 1, type: 'aoe', power: 0.72, school: 'frost', instFlag: 'tide_squall' },
          ]},
          { at: 0.3, name: 'Бездна', abilities: [
            { id: 'c', name: 'Сокрушение', cost: 0, cd: 0, type: 'aoe', power: 0.85 },
            { id: 'buster', name: 'Хватка глубин', cost: 14, cd: 2, type: 'cast_aoe', power: 1.2, castKind: 'buster', castPrio: 2 },
            { id: 's', name: 'Прилив', cost: 10, cd: 2, type: 'damage', power: 1.55 },
          ]},
        ]},
      jade: { id: 'sha', name: 'Ша Сомнения', icon: '☯️', role: 'dps', hp: 575, atk: 21, def: 7, speed: 10, mana: 55,
        mech: { id: 'jade_inst' },
        phases: [
          { at: 1, name: 'Сомнение', abilities: [
            { id: 'bolt', name: 'Тень', cost: 0, cd: 0, type: 'damage', power: 1.25, school: 'shadow' },
            { id: 'cast', name: 'Волна сомнения', cost: 12, cd: 2, type: 'cast_aoe', power: 0.85, castKind: 'kick', castPrio: 3, school: 'shadow', instFlag: 'jade_wave' },
          ]},
          { at: 0.70, name: 'Трещина', abilities: [
            { id: 'bolt', name: 'Тень', cost: 0, cd: 0, type: 'damage', power: 1.3, school: 'shadow' },
            { id: 'cast', name: 'Шёпот ша', cost: 12, cd: 2, type: 'cast_aoe', power: 0.9, castKind: 'kick', castPrio: 4, school: 'shadow', instFlag: 'jade_sha_whisper' },
          ]},
          { at: 0.35, name: 'Разлом', abilities: [
            { id: 'bolt', name: 'Тень', cost: 0, cd: 0, type: 'damage', power: 1.4, school: 'shadow' },
            { id: 'cast', name: 'Взрыв ша', cost: 14, cd: 2, type: 'cast_aoe', power: 1.0, castKind: 'aoe', castPrio: 4, school: 'shadow', instFlag: 'jade_burst' },
            { id: 'buster', name: 'Удар сомнения', cost: 12, cd: 2, type: 'cast_aoe', power: 1.15, castKind: 'buster', castPrio: 2, school: 'shadow', instFlag: 'jade_doubt_strike' },
          ]},
        ]},
      rift: { id: 'bz', name: 'Пожиратель Разлома', icon: '🌑', role: 'dps', hp: 590, atk: 22, def: 7, speed: 11, mana: 55,
        mech: { id: 'rift_inst' },
        phases: [
          { at: 1, name: 'Сбой кнопок', abilities: [
            { id: 'bolt', name: 'Луч хаоса', cost: 0, cd: 0, type: 'damage', power: 1.25, school: 'shadow' },
            { id: 'cast', name: 'Искажение пространства', cost: 12, cd: 2, type: 'cast_aoe', power: 0.88, castKind: 'kick', castPrio: 3, school: 'shadow', instFlag: 'rift_warp' },
          ]},
          { at: 0.60, name: 'Съеденный клик', abilities: [
            { id: 'bolt', name: 'Луч хаоса', cost: 0, cd: 0, type: 'damage', power: 1.35, school: 'shadow' },
            { id: 'cast', name: 'Волна разлома', cost: 12, cd: 2, type: 'cast_aoe', power: 0.95, castKind: 'kick', castPrio: 4, school: 'shadow', instFlag: 'rift_wave' },
          ]},
          { at: 0.30, name: 'Двойная дыра', abilities: [
            { id: 'bolt', name: 'Луч хаоса', cost: 0, cd: 0, type: 'damage', power: 1.45, school: 'shadow' },
            { id: 'cast', name: 'Взрыв пустоты', cost: 14, cd: 2, type: 'cast_aoe', power: 1.05, castKind: 'aoe', castPrio: 4, school: 'shadow', instFlag: 'rift_void' },
            { id: 'abs', name: 'Поглощение', cost: 12, cd: 2, type: 'cast_aoe', power: 0.01, castKind: 'kick', castPrio: 3, school: 'shadow', instFlag: 'rift_absorb' },
          ]},
        ]},
      ember: { id: 'sp', name: 'Угольный Титан', icon: '🪨', role: 'tank', hp: 600, atk: 21, def: 11, speed: 7, mana: 45,
        mech: { id: 'ember_inst' },
        phases: [
          { at: 1, name: 'Тлеющие угли', abilities: [
            { id: 'slam', name: 'Удар угля', cost: 0, cd: 0, type: 'damage', power: 1.25, school: 'fire' },
            { id: 'cast', name: 'Искра пепла', cost: 12, cd: 2, type: 'cast_aoe', power: 0.88, castKind: 'kick', castPrio: 3, school: 'fire', instFlag: 'ember_spark' },
            { id: 'aoe', name: 'Зольный вихрь', cost: 12, cd: 2, type: 'aoe', power: 0.65, school: 'fire' },
          ]},
          { at: 0.55, name: 'Раскалённый корпус', abilities: [
            { id: 'slam', name: 'Удар угля', cost: 0, cd: 0, type: 'damage', power: 1.4, school: 'fire' },
            { id: 'buster', name: 'Обвал жара', cost: 14, cd: 2, type: 'cast_aoe', power: 1.15, castKind: 'buster', castPrio: 2, school: 'fire', instFlag: 'ember_slam' },
            { id: 'aoe', name: 'Зольный вихрь', cost: 10, cd: 2, type: 'aoe', power: 0.75, school: 'fire' },
          ]},
          { at: 0.25, name: 'Пепельный трон', abilities: [
            { id: 'slam', name: 'Удар угля', cost: 0, cd: 0, type: 'damage', power: 1.5, school: 'fire' },
            { id: 'adds', name: 'Угольки', cost: 10, cd: 2, type: 'summon', power: 1 },
            { id: 'cast', name: 'Извержение', cost: 14, cd: 2, type: 'cast_aoe', power: 1.05, castKind: 'aoe', castPrio: 4, school: 'fire', instFlag: 'ember_erupt' },
            { id: 'buster', name: 'Обвал жара', cost: 12, cd: 2, type: 'cast_aoe', power: 1.2, castKind: 'buster', castPrio: 2, school: 'fire', instFlag: 'ember_slam' },
          ]},
        ]},
    },
    /** 10-man raid test boss */
    raidBosses: {
      leishen: {
        id: 'ls', name: 'Лэй Шэнь, Повелитель Грома', icon: '⚡', role: 'tank',
        hp: 800, atk: 17, def: 10, speed: 9, mana: 80,
        mech: { id: 'thunder_king', addName: 'Проводник грома', addId: 'eq', addHp: 1.05, n: 2, mustKillTurns: 4 },
        phases: [
          { at: 1, name: 'Престол грома', abilities: [
            { id: 'smash', name: 'Удар тирана', cost: 0, cd: 0, type: 'damage', power: 1.52, school: 'physical' },
            { id: 'cast', name: 'Сверхзаряд', cost: 12, cd: 2, type: 'cast_aoe', power: 1.00, castKind: 'kick', castPrio: 4, school: 'nature' },
            { id: 'nova', name: 'Грозовое поле', cost: 12, cd: 3, type: 'aoe', power: 0.70, school: 'nature' },
          ]},
          { at: 0.70, name: 'Зал проводников', abilities: [
            { id: 'smash', name: 'Удар тирана', cost: 0, cd: 0, type: 'damage', power: 1.58, school: 'physical' },
            { id: 'buster', name: 'Казнь стража', cost: 14, cd: 2, type: 'cast_aoe', power: 1.28, castKind: 'buster', castPrio: 2, school: 'physical' },
            { id: 'cast', name: 'Цепная молния', cost: 12, cd: 2, type: 'cast_aoe', power: 1.05, castKind: 'kick', castPrio: 4, school: 'nature' },
            { id: 'adds', name: 'Призыв проводников', cost: 10, cd: 4, type: 'summon', power: 1 },
          ]},
          { at: 0.40, name: 'Расколотое небо', abilities: [
            { id: 'smash', name: 'Удар тирана', cost: 0, cd: 0, type: 'damage', power: 1.62, school: 'physical' },
            { id: 'buster', name: 'Децимация', cost: 14, cd: 2, type: 'cast_aoe', power: 1.32, castKind: 'buster', castPrio: 2, school: 'nature' },
            { id: 'cast', name: 'Небесный разряд', cost: 12, cd: 2, type: 'cast_aoe', power: 1.12, castKind: 'aoe', castPrio: 4, school: 'nature' },
            { id: 'adds', name: 'Проводники', cost: 10, cd: 3, type: 'summon', power: 1 },
          ]},
          { at: 0.15, name: 'Ярость императора', abilities: [
            { id: 'smash', name: 'Удар тирана', cost: 0, cd: 0, type: 'aoe', power: 0.98, school: 'physical' },
            { id: 'buster', name: 'Гнев Грома', cost: 12, cd: 1, type: 'cast_aoe', power: 1.38, castKind: 'buster', castPrio: 2, school: 'nature' },
            { id: 'cast', name: 'Конец династии', cost: 14, cd: 2, type: 'cast_aoe', power: 1.22, castKind: 'kick', castPrio: 4, school: 'nature' },
          ]},
          { at: 0.05, name: 'Небесный гнев', abilities: [
            { id: 'cast', name: 'Небесный гнев', cost: 0, cd: 0, type: 'cast_aoe', power: 1.4, castKind: 'aoe', castPrio: 5, school: 'nature' },
          ]},
        ],
      },
    },
    /** Mid-bosses: unique per dungeon, used on mid node */
    midBosses: {
      crypt: { id: 'sg', name: 'Хранитель Отзвука', icon: '🪦', role: 'tank', hp: 380, atk: 18, def: 10, speed: 8, mana: 40,
        mech: { id: 'echo_keeper', stacks: 4 },
        phases: [
          { at: 1, name: 'Стража', abilities: [
            { id: 's', name: 'Удар щитом', cost: 0, cd: 0, type: 'damage', power: 1.2 },
            { id: 'cast', name: 'Каменный хор', cost: 12, cd: 3, type: 'cast_aoe', power: 0.8, castKind: 'kick', castPrio: 3, school: 'shadow', instFlag: 'crypt_choir' },
          ]},
          { at: 0.4, name: 'Срыв эха', abilities: [
            { id: 's', name: 'Удар щитом', cost: 0, cd: 0, type: 'damage', power: 1.35 },
            { id: 'buster', name: 'Сокрушение гробницы', cost: 12, cd: 2, type: 'cast_aoe', power: 1.05, castKind: 'buster', castPrio: 2 },
            { id: 'cast', name: 'Каменный хор', cost: 12, cd: 3, type: 'cast_aoe', power: 0.8, castKind: 'kick', castPrio: 3, school: 'shadow', instFlag: 'crypt_choir' },
          ]},
        ]},
      forge: { id: 'nk', name: 'Мастер горна', icon: '⚒️', role: 'dps', hp: 360, atk: 20, def: 6, speed: 10, mana: 45,
        phases: [
          { at: 1, name: 'Ковка', abilities: [
            { id: 'h', name: 'Молот', cost: 0, cd: 0, type: 'damage', power: 1.25 },
            { id: 'cast', name: 'Искра', cost: 12, cd: 2, type: 'cast_aoe', power: 0.82, castKind: 'kick', castPrio: 3 },
            { id: 'aoe', name: 'Шлак', cost: 10, cd: 2, type: 'aoe', power: 0.65 },
          ]},
          { at: 0.45, name: 'Перегрев', abilities: [
            { id: 'h', name: 'Молот', cost: 0, cd: 0, type: 'damage', power: 1.4 },
            { id: 'cast', name: 'Выброс жара', cost: 12, cd: 2, type: 'cast_aoe', power: 0.95, castKind: 'aoe', castPrio: 3 },
          ]},
        ]},
      tide: { id: 'pl', name: 'Жрец прилива', icon: '🐚', role: 'healer', hp: 340, atk: 16, def: 5, speed: 11, mana: 60,
        mech: { id: 'tide_inst' },
        phases: [
          { at: 1, name: 'Литургия колодца', abilities: [
            { id: 'bolt', name: 'Волна', cost: 0, cd: 0, type: 'damage', power: 1.1, school: 'frost' },
            { id: 'h', name: 'Исцеление глубин', cost: 12, cd: 2, type: 'heal', power: 0.35 },
            { id: 'cast', name: 'Гимн моря', cost: 12, cd: 2, type: 'cast_aoe', power: 0.8, castKind: 'kick', castPrio: 4, school: 'frost', instFlag: 'tide_hymn' },
            { id: 'air', name: 'Отнять воздух', cost: 12, cd: 3, type: 'cast_aoe', power: 0.01, castKind: 'kick', castPrio: 5, school: 'frost', instFlag: 'tide_steal_air' },
          ]},
          { at: 0.5, name: 'Открытый шлюз', abilities: [
            { id: 'bolt', name: 'Волна', cost: 0, cd: 0, type: 'damage', power: 1.25, school: 'frost' },
            { id: 'cast', name: 'Цунами', cost: 12, cd: 2, type: 'cast_aoe', power: 0.9, castKind: 'aoe', castPrio: 3, school: 'frost', instFlag: 'tide_tsunami' },
            { id: 'h', name: 'Исцеление глубин', cost: 10, cd: 1, type: 'heal', power: 0.4 },
            { id: 'air', name: 'Отнять воздух', cost: 12, cd: 2, type: 'cast_aoe', power: 0.01, castKind: 'kick', castPrio: 5, school: 'frost', instFlag: 'tide_steal_air' },
          ]},
        ]},
      jade: { id: 'as', name: 'Ученик ша', icon: '🧘', role: 'dps', hp: 350, atk: 19, def: 5, speed: 12, mana: 50,
        mech: { id: 'jade_inst' },
        phases: [
          { at: 1, name: 'Медитация', abilities: [
            { id: 'bolt', name: 'Удар ци', cost: 0, cd: 0, type: 'damage', power: 1.2 },
            { id: 'cast', name: 'Смятение', cost: 12, cd: 2, type: 'cast_aoe', power: 0.85, castKind: 'kick', castPrio: 3 },
          ]},
          { at: 0.4, name: 'Пробуждение', abilities: [
            { id: 'bolt', name: 'Удар ци', cost: 0, cd: 0, type: 'damage', power: 1.4 },
            { id: 'adds', name: 'Тени', cost: 10, cd: 3, type: 'summon', power: 1 },
            { id: 'cast', name: 'Взрыв ци', cost: 12, cd: 2, type: 'cast_aoe', power: 0.92, castKind: 'kick', castPrio: 4 },
          ]},
        ]},
      rift: { id: 'eq', name: 'Разломный Страж', icon: '🌀', role: 'tank', hp: 360, atk: 18, def: 9, speed: 9, mana: 45,
        phases: [
          { at: 1, name: 'Стабильность', abilities: [
            { id: 'h', name: 'Удар разлома', cost: 0, cd: 0, type: 'damage', power: 1.2 },
            { id: 'cast', name: 'Искажение', cost: 12, cd: 2, type: 'cast_aoe', power: 0.85, castKind: 'kick', castPrio: 3 },
          ]},
          { at: 0.45, name: 'Коллапс', abilities: [
            { id: 'h', name: 'Удар разлома', cost: 0, cd: 0, type: 'damage', power: 1.35 },
            { id: 'adds', name: 'Осколки', cost: 10, cd: 3, type: 'summon', power: 1 },
            { id: 'cast', name: 'Взрыв пустоты', cost: 12, cd: 2, type: 'cast_aoe', power: 0.95, castKind: 'kick', castPrio: 4 },
          ]},
        ]},
      ember: { id: 'th', name: 'Пепельный Надсмотрщик', icon: '🔥', role: 'dps', hp: 370, atk: 20, def: 7, speed: 10, mana: 50,
        mech: { id: 'ember_inst' },
        phases: [
          { at: 1, name: 'Тление', abilities: [
            { id: 'h', name: 'Удар жара', cost: 0, cd: 0, type: 'damage', power: 1.25, school: 'fire' },
            { id: 'cast', name: 'Искра', cost: 12, cd: 2, type: 'cast_aoe', power: 0.85, castKind: 'kick', castPrio: 3, school: 'fire', instFlag: 'ember_spark' },
            { id: 'aoe', name: 'Зола', cost: 10, cd: 2, type: 'aoe', power: 0.6, school: 'fire' },
          ]},
          { at: 0.4, name: 'Разгон', abilities: [
            { id: 'h', name: 'Удар жара', cost: 0, cd: 0, type: 'damage', power: 1.4, school: 'fire' },
            { id: 'adds', name: 'Угольки', cost: 10, cd: 3, type: 'summon', power: 1 },
            { id: 'cast', name: 'Взрыв углей', cost: 12, cd: 2, type: 'cast_aoe', power: 0.95, castKind: 'kick', castPrio: 4, school: 'fire', instFlag: 'ember_erupt' },
          ]},
        ]},
    },
  };

  function _tpl(o) {
    return {
      id: o.id, name: o.name, icon: o.icon, role: o.role || 'dps',
      hp: o.hp, atk: o.atk, def: o.def || 3, speed: o.speed || 10, mana: o.mana || 25,
      abilities: o.abilities || [{ id: 'h', name: 'Удар', cost: 0, cd: 0, type: 'damage', power: 1.1 }],
    };
  }

  /** Тематические пулы: разные данжи — разные враги и роли паков. */
  ENEMIES.theme = {
    crypt: {
      trash: [
        _tpl({ id: 'z', name: 'Костяной служка', icon: '🧟', hp: 96, atk: 14, def: 4, speed: 8,
          abilities: [
            { id: 'h', name: 'Костяной удар', cost: 0, cd: 0, type: 'damage', power: 1.2, school: 'physical' },
            { id: 'dot', name: 'Гниль', cost: 8, cd: 3, type: 'dot', power: 0.5, school: 'shadow' },
          ]}),
        _tpl({ id: 'r', name: 'Прах-ритуалист', icon: '📿', hp: 80, atk: 13, def: 2, speed: 10, mana: 40,
          abilities: [
            { id: 'bolt', name: 'Порча', cost: 0, cd: 0, type: 'damage', power: 1.1, school: 'shadow' },
            { id: 'nova', name: 'Вспышка праха', cost: 12, cd: 3, type: 'cast_aoe', power: 0.8, castKind: 'kick', castPrio: 3, school: 'shadow' },
          ]}),
        _tpl({ id: 's', name: 'Ткач савана', icon: '🕷️', hp: 84, atk: 15, def: 2, speed: 13, mana: 25,
          abilities: [
            { id: 'bite', name: 'Укус', cost: 0, cd: 0, type: 'damage', power: 1.15 },
            { id: 'web', name: 'Саван', cost: 10, cd: 3, type: 'debuff', power: 0.16 },
          ]}),
        _tpl({ id: 'm', name: 'Могильный мистик', icon: '🔮', role: 'healer', hp: 76, atk: 12, def: 2, speed: 10, mana: 45,
          abilities: [
            { id: 'b', name: 'Тень', cost: 0, cd: 0, type: 'damage', power: 1.0, school: 'shadow' },
            { id: 'h', name: 'Тёмный хил', cost: 12, cd: 2, type: 'heal', power: 0.32 },
          ]}),
      ],
      elite: [
        _tpl({ id: 'nk', name: 'Некромант склепа', icon: '💀', role: 'healer', hp: 182, atk: 17, def: 3, speed: 9, mana: 60,
          abilities: [
            { id: 'bolt', name: 'Костяной шип', cost: 0, cd: 0, type: 'damage', power: 1.15, school: 'shadow' },
            { id: 'heal', name: 'Тёмное исцеление', cost: 12, cd: 2, type: 'heal', power: 0.35 },
            { id: 'sum', name: 'Восставший', cost: 14, cd: 3, type: 'summon', power: 1 },
            { id: 'nova', name: 'Взрыв костей', cost: 12, cd: 3, type: 'cast_aoe', power: 0.88, castKind: 'kick', castPrio: 3 },
          ]}),
        _tpl({ id: 'pl', name: 'Ткач боли', icon: '🩸', hp: 190, atk: 21, def: 3, speed: 12, mana: 55,
          abilities: [
            { id: 'lash', name: 'Плеть', cost: 0, cd: 0, type: 'damage', power: 1.25 },
            { id: 'dot', name: 'Агония', cost: 8, cd: 2, type: 'dot', power: 0.65, school: 'shadow' },
            { id: 'burst', name: 'Всплеск боли', cost: 12, cd: 3, type: 'cast_aoe', power: 0.95, castKind: 'aoe', castPrio: 3 },
          ]}),
      ],
      st: [
        _tpl({ id: 'sg', name: 'Могильный страж', icon: '🗿', role: 'tank', hp: 315, atk: 21, def: 15, speed: 6, mana: 25,
          abilities: [
            { id: 'bash', name: 'Сокрушение', cost: 0, cd: 0, type: 'damage', power: 1.5 },
            { id: 'exec', name: 'Казнь стража', cost: 10, cd: 2, type: 'cast_aoe', power: 2.0, castKind: 'buster', castPrio: 2 },
            { id: 'wall', name: 'Костяная кожа', cost: 0, cd: 3, type: 'shield', power: 0.4 },
            { id: 'cast', name: 'Обвал склепа', cost: 12, cd: 3, type: 'cast_aoe', power: 0.95, castKind: 'kick', castPrio: 3 },
          ]}),
      ],
    },
    forge: {
      trash: [
        _tpl({ id: 'p', name: 'Искровой пиромант', icon: '🔥', hp: 74, atk: 14, def: 2, speed: 11, mana: 40,
          abilities: [
            { id: 'bolt', name: 'Огонь', cost: 0, cd: 0, type: 'damage', power: 1.1, school: 'fire' },
            { id: 'bomb', name: 'Живая бомба', cost: 12, cd: 3, type: 'cast_aoe', power: 0.78, castKind: 'kick', castPrio: 3, school: 'fire' },
          ]}),
        _tpl({ id: 'b', name: 'Шлаковый громила', icon: '💪', role: 'tank', hp: 155, atk: 16, def: 9, speed: 6, mana: 20,
          abilities: [
            { id: 's', name: 'Шлаковый удар', cost: 0, cd: 0, type: 'damage', power: 1.4, school: 'fire' },
            { id: 'bash', name: 'Ковочный удар', cost: 10, cd: 3, type: 'cast_aoe', power: 1.3, castKind: 'buster', castPrio: 2, school: 'fire' },
          ]}),
        _tpl({ id: 'j', name: 'Молотобоец', icon: '🪓', hp: 88, atk: 16, def: 5, speed: 9,
          abilities: [
            { id: 'cleave', name: 'Раскол', cost: 0, cd: 0, type: 'damage', power: 1.3 },
            { id: 'whirl', name: 'Вихрь искр', cost: 12, cd: 2, type: 'aoe', power: 0.7, school: 'fire' },
          ]}),
      ],
      elite: [
        _tpl({ id: 'nk', name: 'Мастер искр', icon: '⚒️', hp: 190, atk: 20, def: 6, speed: 10, mana: 45,
          abilities: [
            { id: 'h', name: 'Молот', cost: 0, cd: 0, type: 'damage', power: 1.3 },
            { id: 'cast', name: 'Выброс жара', cost: 12, cd: 2, type: 'cast_aoe', power: 0.88, castKind: 'kick', castPrio: 3, school: 'fire' },
          ]}),
      ],
      st: [
        _tpl({ id: 'sg', name: 'Шлаковый исполин', icon: '🗿', role: 'tank', hp: 320, atk: 19, def: 16, speed: 5,
          abilities: [
            { id: 'bash', name: 'Раскалённый кулак', cost: 0, cd: 0, type: 'damage', power: 1.55, school: 'fire' },
            { id: 'exec', name: 'Проковка', cost: 10, cd: 2, type: 'cast_aoe', power: 1.5, castKind: 'buster', castPrio: 2, school: 'fire' },
            { id: 'cast', name: 'Перекал', cost: 12, cd: 3, type: 'cast_aoe', power: 0.92, castKind: 'kick', castPrio: 4, school: 'fire' },
          ]}),
      ],
    },
    tide: {
      trash: [
        _tpl({ id: 'a', name: 'Коралловый стрелок', icon: '🏹', hp: 76, atk: 15, def: 2, speed: 12,
          abilities: [
            { id: 'h', name: 'Гарпун', cost: 0, cd: 0, type: 'damage', power: 1.2 },
            { id: 'v', name: 'Залп соли', cost: 10, cd: 3, type: 'aoe', power: 0.52, school: 'frost' },
          ]}),
        _tpl({ id: 'm', name: 'Жрец глубин', icon: '🔮', role: 'healer', hp: 80, atk: 12, def: 2, speed: 10, mana: 50,
          abilities: [
            { id: 'b', name: 'Волна', cost: 0, cd: 0, type: 'damage', power: 1.0, school: 'frost' },
            { id: 'h', name: 'Исцеление глубин', cost: 12, cd: 2, type: 'heal', power: 0.32 },
            { id: 'c', name: 'Гимн моря', cost: 12, cd: 2, type: 'cast_aoe', power: 0.8, castKind: 'kick', castPrio: 4, school: 'frost' },
          ]}),
        _tpl({ id: 'th', name: 'Щупальце', icon: '🌊', role: 'tank', hp: 150, atk: 18, def: 8, speed: 7,
          abilities: [
            { id: 't', name: 'Хватка', cost: 0, cd: 0, type: 'damage', power: 1.6, school: 'physical' },
            { id: 's', name: 'Шквал', cost: 10, cd: 2, type: 'aoe', power: 0.72, school: 'frost' },
          ]}),
      ],
      elite: [
        _tpl({ id: 'pl', name: 'Оракул прилива', icon: '🐚', role: 'healer', hp: 185, atk: 17, def: 4, speed: 11, mana: 60,
          abilities: [
            { id: 'bolt', name: 'Волна', cost: 0, cd: 0, type: 'damage', power: 1.15, school: 'frost' },
            { id: 'h', name: 'Исцеление глубин', cost: 12, cd: 2, type: 'heal', power: 0.36 },
            { id: 'cast', name: 'Цунами', cost: 12, cd: 2, type: 'cast_aoe', power: 0.95, castKind: 'aoe', castPrio: 3, school: 'frost' },
          ]}),
      ],
      st: [
        _tpl({ id: 'b', name: 'Утопленный страж', icon: '💪', role: 'tank', hp: 345, atk: 23, def: 15, speed: 6, mana: 25,
          abilities: [
            { id: 's', name: 'Удар якорем', cost: 0, cd: 0, type: 'damage', power: 1.7 },
            { id: 'exec', name: 'На дно', cost: 10, cd: 2, type: 'cast_aoe', power: 2.45, castKind: 'buster', castPrio: 2 },
            { id: 'cast', name: 'Водоворот', cost: 12, cd: 2, type: 'cast_aoe', power: 0.95, castKind: 'kick', castPrio: 3, school: 'frost' },
          ]}),
      ],
    },
    jade: {
      trash: [
        _tpl({ id: 'j', name: 'Ученик монастыря', icon: '🪓', hp: 85, atk: 15, def: 4, speed: 12,
          abilities: [
            { id: 'cleave', name: 'Удар ци', cost: 0, cd: 0, type: 'damage', power: 1.15 },
            { id: 'whirl', name: 'Вихрь листвы', cost: 10, cd: 3, type: 'aoe', power: 0.55, school: 'nature' },
          ]}),
        _tpl({ id: 'sha', name: 'Шёпот ша', icon: '☯️', hp: 78, atk: 14, def: 2, speed: 11, mana: 40,
          abilities: [
            { id: 'bolt', name: 'Сомнение', cost: 0, cd: 0, type: 'damage', power: 1.1, school: 'shadow' },
            { id: 'cast', name: 'Смятение', cost: 12, cd: 3, type: 'cast_aoe', power: 0.8, castKind: 'kick', castPrio: 3, school: 'shadow' },
          ]}),
        _tpl({ id: 'c', name: 'Страж двора', icon: '🪖', role: 'tank', hp: 150, atk: 16, def: 10, speed: 7,
          abilities: [
            { id: 'c', name: 'Рассечение', cost: 0, cd: 0, type: 'damage', power: 1.45 },
            { id: 's', name: 'Клич', cost: 10, cd: 3, type: 'buff', power: 0.25 },
            { id: 'verdict', name: 'Нефритовый приговор', cost: 12, cd: 3, type: 'cast_aoe', power: 1.75, castKind: 'buster', castPrio: 2 },
          ]}),
      ],
      elite: [
        _tpl({ id: 'as', name: 'Тень ша', icon: '🗡️', hp: 175, atk: 22, def: 3, speed: 15,
          abilities: [
            { id: 'stab', name: 'Удар в спину', cost: 0, cd: 0, type: 'damage', power: 1.4 },
            { id: 'poison', name: 'Яд сомнения', cost: 8, cd: 2, type: 'dot', power: 0.5, school: 'shadow' },
            { id: 'cast', name: 'Взрыв ци', cost: 12, cd: 3, type: 'cast_aoe', power: 0.88, castKind: 'kick', castPrio: 4, school: 'shadow' },
          ]}),
      ],
      st: [
        _tpl({ id: 'sg', name: 'Каменный ученик', icon: '🗿', role: 'tank', hp: 315, atk: 19, def: 16, speed: 6,
          abilities: [
            { id: 'bash', name: 'Каменный кулак', cost: 0, cd: 0, type: 'damage', power: 1.5 },
            { id: 'exec', name: 'Дробление', cost: 10, cd: 2, type: 'damage', power: 2.0 },
            { id: 'cast', name: 'Взгляд камня', cost: 12, cd: 3, type: 'cast_aoe', power: 0.85, castKind: 'kick', castPrio: 3 },
          ]}),
      ],
    },
    rift: {
      trash: [
        _tpl({ id: 'w', name: 'Осколок пустоты', icon: '😈', hp: 80, atk: 15, def: 2, speed: 12, mana: 40,
          abilities: [
            { id: 'b', name: 'Луч хаоса', cost: 0, cd: 0, type: 'damage', power: 1.25, school: 'shadow' },
            { id: 'n', name: 'Искажение', cost: 12, cd: 3, type: 'cast_aoe', power: 0.82, castKind: 'kick', castPrio: 3, school: 'shadow' },
          ]}),
        _tpl({ id: 'bz', name: 'Ползун разлома', icon: '🌑', hp: 152, atk: 16, def: 11, speed: 6, mana: 35,
          abilities: [
            { id: 'hit', name: 'Разрыв', cost: 0, cd: 0, type: 'damage', power: 1.3 },
            { id: 'slam', name: 'Волна пустоты', cost: 10, cd: 2, type: 'aoe', power: 0.64, school: 'shadow' },
          ]}),
      ],
      elite: [
        _tpl({ id: 'eq', name: 'Страж трещины', icon: '🌀', role: 'tank', hp: 200, atk: 20, def: 13, speed: 7, mana: 45,
          abilities: [
            { id: 'h', name: 'Удар разлома', cost: 0, cd: 0, type: 'damage', power: 1.4 },
            { id: 'bash', name: 'Сжатие трещины', cost: 12, cd: 3, type: 'cast_aoe', power: 1.7, castKind: 'buster', castPrio: 2, school: 'shadow' },
            { id: 'cast', name: 'Искажение', cost: 12, cd: 2, type: 'cast_aoe', power: 0.9, castKind: 'kick', castPrio: 3, school: 'shadow' },
          ]}),
      ],
      st: [
        _tpl({ id: 'as', name: 'Пустотный сталкер', icon: '🗡️', hp: 300, atk: 24, def: 4, speed: 16,
          abilities: [
            { id: 'stab', name: 'Разрез реальности', cost: 0, cd: 0, type: 'damage', power: 1.55, school: 'shadow' },
            { id: 'exec', name: 'Коллапс', cost: 10, cd: 2, type: 'damage', power: 2.15, school: 'shadow' },
            { id: 'cast', name: 'Взрыв пустоты', cost: 12, cd: 3, type: 'cast_aoe', power: 0.95, castKind: 'kick', castPrio: 4, school: 'shadow' },
          ]}),
      ],
    },
    ember: {
      trash: [
        _tpl({ id: 'p', name: 'Уголёк', icon: '🔥', hp: 78, atk: 14, def: 3, speed: 11,
          abilities: [
            { id: 'bolt', name: 'Искра', cost: 0, cd: 0, type: 'damage', power: 1.1, school: 'fire' },
            { id: 'aoe', name: 'Зола', cost: 10, cd: 2, type: 'aoe', power: 0.5, school: 'fire' },
          ]}),
        _tpl({ id: 'b', name: 'Пепельный громила', icon: '💪', role: 'tank', hp: 172, atk: 16, def: 10, speed: 6,
          abilities: [
            { id: 's', name: 'Удар угля', cost: 0, cd: 0, type: 'damage', power: 1.4, school: 'fire' },
            { id: 'slam', name: 'Обвал жара', cost: 10, cd: 3, type: 'cast_aoe', power: 0.85, castKind: 'buster', castPrio: 2, school: 'fire' },
          ]}),
      ],
      elite: [
        _tpl({ id: 'bz', name: 'Раскалённый берсерк', icon: '😤', hp: 210, atk: 21, def: 5, speed: 12,
          abilities: [
            { id: 'hit', name: 'Яростный удар', cost: 0, cd: 0, type: 'damage', power: 1.3, school: 'fire' },
            { id: 'rage', name: 'Берсерк', cost: 0, cd: 4, type: 'buff', power: 0.3 },
            { id: 'cast', name: 'Извержение', cost: 12, cd: 3, type: 'cast_aoe', power: 0.9, castKind: 'kick', castPrio: 3, school: 'fire' },
          ]}),
      ],
      st: [
        _tpl({ id: 'sp', name: 'Угольный колосс', icon: '🪨', role: 'tank', hp: 340, atk: 20, def: 16, speed: 5,
          abilities: [
            { id: 'slam', name: 'Удар угля', cost: 0, cd: 0, type: 'damage', power: 1.55, school: 'fire' },
            { id: 'exec', name: 'Раскал', cost: 10, cd: 2, type: 'damage', power: 2.1, school: 'fire' },
            { id: 'cast', name: 'Обвал жара', cost: 14, cd: 3, type: 'cast_aoe', power: 0.95, castKind: 'buster', castPrio: 2, school: 'fire' },
          ]}),
      ],
    },
  };

  function _findTplById(id) {
    const pools = [ENEMIES.trash, ENEMIES.elite];
    if (ENEMIES.theme) {
      for (const th of Object.keys(ENEMIES.theme)) {
        const t = ENEMIES.theme[th];
        pools.push(t.trash, t.elite, t.st);
      }
    }
    for (const arr of pools) {
      if (!arr) continue;
      const f = arr.find(x => x && x.id === id);
      if (f) return f;
    }
    return (ENEMIES.trash && ENEMIES.trash[0]) || null;
  }

  function spawnMechAdd(boss, opts) {
    if (!combat || !boss) return null;
    const tpl = _findTplById(opts.addId || 'z');
    if (!tpl || typeof scaleEnemy !== 'function') return null;
    const add = scaleEnemy(tpl, run.keyLevel, false, true);
    add.name = opts.addName || add.name;
    add.mechRole = opts.role || boss.mech?.id;
    add.maxHp = Math.round(add.maxHp * (opts.addHp || 1.2));
    add.hp = add.maxHp;
    add.mustKillTurns = opts.mustKillTurns || 0;
    combat.enemies.push(add);
    log(`${boss.name} призывает: ${add.name}`, 'enemy');
    toast(add.name);
    return add;
  }

  function applyBossMechanics() {
    if (!combat) return;
    for (const boss of (combat.enemies || []).filter(e => e.isBoss && e.mech)) {
      const m = boss.mech;
      if (m.id === 'soul_link' || m.id === 'rift_priority') {
        const n = m.n || 1;
        for (let i = 0; i < n; i++) {
          const add = spawnMechAdd(boss, m);
          if (add && m.id === 'soul_link') {
            boss.linkedAddUid = add.uid;
            applyStatus(boss, {
              id: 'soul_link', name: 'Связь души', icon: '🔗', turns: 99,
              dmgReduce: 0.65, tip: 'Пока адд жив — босс −65% урона. Бей адда СТ.',
            });
          }
        }
      }
      if (m.id === 'bone_ward') {
        applyStatus(boss, {
          id: 'bone_ward', name: 'Костяной щит', icon: '🦴', turns: 99,
          stacks: m.stacks || 4, dmgReduce: 0.4,
          tip: 'СТ-удары снимают стаки. AoE щит не ломает.',
        });
      }
      if (m.id === 'heat') {
        applyStatus(boss, { id: 'heat', name: 'Перегрев', icon: '🔥', turns: 99, stacks: 0, tip: 'Прерывание → клик по Королеве сбрасывает стаки. 3+ жгут 4% max HP. Пока жив Жаркий очаг — кик не сбрасывает.' });
      }
      if (m.id === 'thunder_king') {
        applyStatus(boss, {
          id: 'thunder_king', name: 'Повелитель грома', icon: '⚡', turns: 99,
          tip: '10-ман: смена танков, проводники СТ, соки, кики. С 40% — два зала (кик / соки), провод бьёт через порог.',
        });
        log('Лэй Шэнь: смена танков по Перегрузке ×3 · Проводники СТ · соки живыми · с 40% два зала.', 'system');
        toast('Рейд 10 · Лэй Шэнь');
      }
    }
  }

  function onStHitBossMech(target, attacker, ctx) {
    if (!target?.buffs) return;
    const isAoe = !!(ctx && (ctx.isAoe || ctx.type === 'aoe' || ctx.type === 'cast_aoe'));
    const isDot = !!(ctx && (ctx.isDot || ctx.type === 'dot'));
    if (isAoe || isDot) return;
    const ward = target.buffs.find(b => b.id === 'bone_ward');
    if (ward && (ward.stacks || 0) > 0) {
      ward.stacks -= 1;
      try { floatText(target.uid, 'щит −1', 'buff'); } catch (_) {}
      log(`${target.name}: костяной щит ${ward.stacks}`, 'player');
      if (ward.stacks <= 0) {
        target.buffs = target.buffs.filter(b => b.id !== 'bone_ward');
        log('Костяной щит разбит — босс уязвим!', 'player');
        toast('Щит разбит!');
      }
    }
  }

  function tickBossMechanics() {
    if (!combat) return;
    for (const boss of (combat.enemies || []).filter(e => e.alive && e.isBoss && e.mech)) {
      const m = boss.mech;
      if (boss.linkedAddUid) {
        const add = combat.enemies.find(x => x.uid === boss.linkedAddUid);
        if (!add || !add.alive) {
          boss.buffs = (boss.buffs || []).filter(b => b.id !== 'soul_link');
          boss.linkedAddUid = null;
          log('Связь души разорвана — босс уязвим!', 'player');
          toast('Связь разорвана!');
        }
      }
      if (m.id === 'sha_split' && !boss._splitDone && boss.hp / Math.max(1, boss.maxHp) <= (m.at || 0.55)) {
        boss._splitDone = true;
        const add = spawnMechAdd(boss, m);
        if (add) add.mustKillTurns = 2;
        log('Ша разделяется — убейте воплощение СТ, иначе босс восстановится!', 'enemy');
      }
      if (m.id === 'sha_split') {
        const add = (combat.enemies || []).find(x => x.alive && x.mechRole === 'sha_split');
        if (add && add.mustKillTurns != null) {
          add.mustKillTurns -= 1;
          if (add.mustKillTurns <= 0) {
            const heal = Math.round(boss.maxHp * 0.1);
            boss.hp = Math.min(boss.maxHp, boss.hp + heal);
            add.alive = false; add.hp = 0;
            log(`${boss.name} поглощает воплощение +${fmt(heal)}`, 'enemy');
            toast('Воплощение прожило — босс хильнулся');
          }
        }
      }
      /* ember_feed: снято. Жар 0–8 и уголь — js/dungeon-inst.js */
      if (m.id === 'rift_priority') {
        const add = (combat.enemies || []).find(x => x.alive && x.mechRole === 'rift_priority');
        if (add) {
          add.mustKillTurns = (add.mustKillTurns || 3) - 1;
          if (add.mustKillTurns <= 0) {
            const raw = Math.round((getEff(boss).atk || boss.atk) * 1.1);
            for (const h of livingHeroes()) dealDmg(h, raw, boss, { type: 'aoe', isAoe: true, abilityName: 'Взрыв осколка' });
            add.alive = false; add.hp = 0;
            log('Осколок взорвался по отряду!', 'enemy');
            toast('Осколок взорвался — нужен СТ');
          } else {
            log(`Осколок взорвётся через ${add.mustKillTurns} р. — бейте СТ!`, 'enemy');
          }
        }
      }
      if (m.id === 'heat') {
        const heat = (boss.buffs || []).find(b => b.id === 'heat');
        if (heat) {
          if (boss.casting) {
            heat.stacks = (heat.stacks || 0) + 1;
          }
          if ((heat.stacks || 0) >= 3) {
            const raw = Math.round(boss.maxHp * 0.04);
            for (const h of livingHeroes()) dealTrue(h, raw, boss, 'dot', { school: 'fire', abilityName: 'Перегрев' });
            log(`Перегрев ×${heat.stacks} жжёт отряд`, 'enemy');
          }
        }
      }
      /* drown_mark: снято. Столб давления и Затопление лёгких — js/dungeon-inst.js */
      if (m.id === 'thunder_king') {
        tickThunderKing(boss, m);
      }
    }
  }

  function tickThunderKing(boss, m) {
    if (!combat || !boss?.alive) return;
    const heroes = livingHeroes();
    if (!heroes.length) return;
    const tanks = heroes.filter(h => h.role === 'tank');
    const mt = (typeof currentMainTank === 'function' ? currentMainTank(boss) : tanks[0]) || heroes[0];
    const ratio = boss.hp / Math.max(1, boss.maxHp);

    // Одна фаза за раз: большой удар не спавнит провал и столбы в одном тике.
    if (ratio <= 0.75 && typeof queueRaidPhase === 'function') queueRaidPhase('vault');
    if (combat.vault && !combat.vault.dropped) {
      if (typeof tickRaidVaultCast === 'function') tickRaidVaultCast(boss);
      return;
    }
    if (ratio <= 0.50 && typeof queueRaidPhase === 'function') queueRaidPhase('pillars');

    if (combat.catacombs && combat.catacombs.active && combat.catacombs.stage !== 'field' && !combat.catacombs.youDone) {
      return;
    }

    if (typeof isRaidSplitActive === 'function' && isRaidSplitActive()) {
      if (typeof tickRaidSplit === 'function') tickRaidSplit(boss);
      return;
    }

    if (typeof tickRaidPillars === 'function') tickRaidPillars(boss);

    // Tank swap: overload stacks on current MT
    if (mt && mt.alive) {
      let ov = (mt.buffs || []).find(b => b.id === 'overload');
      if (!ov) {
        applyStatus(mt, {
          id: 'overload', name: 'Перегрузка', icon: '⚡', turns: 8, stacks: 1,
          dmgTakenMod: 0.12, tip: 'Стаки на текущем танке. На ×3 — разряд. ОТ должен спровоцировать.',
        });
        ov = (mt.buffs || []).find(b => b.id === 'overload');
      } else {
        ov.stacks = (ov.stacks || 1) + 1;
        ov.turns = Math.max(ov.turns || 0, 6);
        ov.dmgTakenMod = 0.10 * ov.stacks;
      }
      const stacks = ov?.stacks || 1;
      log(`${mt.name}: Перегрузка ×${stacks}`, 'enemy');
      if (stacks >= 3) {
        const smash = Math.round(mt.maxHp * 0.48);
        dealTrue(mt, smash, boss, 'dmg', { school: 'nature', abilityName: 'Разряд перегрузки' });
        const splash = Math.round((getEff(boss).atk || boss.atk) * 0.35);
        for (const h of heroes) {
          if (h.uid === mt.uid || !h.alive) continue;
          dealTrue(h, splash, boss, 'aoe', { school: 'nature', abilityName: 'Разряд перегрузки', isAoe: true });
        }
        ov.stacks = 0;
        mt.buffs = (mt.buffs || []).filter(b => b.id !== 'overload');
        log('Разряд перегрузки! Нужна смена танков до ×3.', 'enemy');
        toast('Разряд! Смена танков');
      }
    }
    if (tanks.length < 2) {
      const raw = Math.round((getEff(boss).atk || boss.atk) * 0.28);
      for (const h of heroes) dealTrue(h, raw, boss, 'aoe', { school: 'nature', abilityName: 'Без второго стража', isAoe: true });
      log('Нет второго танка — рейд горит. Нужны 2 танка.', 'enemy');
    }

    // Lightning marks every 3 rounds
    if (combat.round % 3 === 0) {
      const pool = heroes.filter(h => h.role !== 'tank');
      const shuf = pool.slice().sort(() => Math.random() - 0.5).slice(0, 2);
      for (const h of shuf) {
        const tick = Math.round(h.maxHp * 0.08);
        applyStatus(h, {
          id: 'storm_mark', name: 'Метка молнии', icon: '🌩️', turns: 2, dot: tick,
          school: 'nature', tip: 'Лечите метку. Тик каждый раунд.',
        });
        h.thunderMark = true;
        log(`${h.name} отмечен молнией`, 'enemy');
      }
      if (typeof linkRaidStormMarks === 'function') linkRaidStormMarks();
    }

    // Conductors at 70% and 40%
    if (ratio <= 0.70 && !boss._cond70) {
      boss._cond70 = true;
      for (let i = 0; i < (m.n || 2); i++) {
        const add = spawnMechAdd(boss, { ...m, role: 'conductor' });
        if (add) {
          add.mustKillTurns = m.mustKillTurns || 4;
          add.name = (m.addName || add.name) + ' · ' + (i + 1);
        }
      }
      applyStatus(boss, {
        id: 'cond_shield', name: 'Ток проводников', icon: '🔌', turns: 99,
        dmgReduce: 0.35, tip: 'Пока проводники живы — босс −35% урона.',
      });
      log('Проводники! Убейте СТ за 4 раунда, иначе рейд получит разряд.', 'enemy');
      toast('Проводники — бейте СТ');
    }
    if (ratio <= 0.40 && !boss._cond40) {
      boss._cond40 = true;
    }

    const conds = (combat.enemies || []).filter(x => x.alive && x.mechRole === 'conductor');
    for (const add of conds) {
      add.mustKillTurns = (add.mustKillTurns || 4) - 1;
      if (add.mustKillTurns <= 0) {
        const raw = Math.round((getEff(boss).atk || boss.atk) * 0.95);
        for (const h of livingHeroes()) {
          dealTrue(h, raw, boss, 'aoe', { school: 'nature', abilityName: 'Взрыв проводника', isAoe: true });
        }
        add.alive = false; add.hp = 0;
        log('Проводник взорвался по рейду!', 'enemy');
        toast('Проводник взорвался');
      } else {
        log(`Проводник взорвётся через ${add.mustKillTurns} р.`, 'enemy');
      }
    }
    if (!conds.length && (boss.buffs || []).some(b => b.id === 'cond_shield')) {
      boss.buffs = boss.buffs.filter(b => b.id !== 'cond_shield');
      log('Проводники пали — босс снова уязвим.', 'player');
    }

    // Soak resolve
    if (combat.round > 1) {
      const soakers = heroes.filter(h => (h.buffs || []).some(b => b.id === 'soak_orb' && (b.turns || 0) <= 1));
      if (soakers.length) {
        let failed = 0;
        for (const h of soakers) {
          if (!h.alive || h.hp / h.maxHp < 0.35) failed++;
        }
        if (failed) {
          const raw = Math.round((getEff(boss).atk || boss.atk) * 0.7 * failed);
          for (const h of livingHeroes()) {
            dealTrue(h, raw, boss, 'aoe', { school: 'nature', abilityName: 'Сорванный сок', isAoe: true });
          }
          log(`Сорвано соков: ${failed} — рейд получил разряд.`, 'enemy');
        } else {
          log('Все сферы сокнуты.', 'player');
          toast('Соки закрыты');
        }
      }
    }

    if (ratio <= 0.15 && !boss._empEnrage) {
      boss._empEnrage = true;
      boss.enraged = true;
      applyStatus(boss, { id: 'emp_wrath', name: 'Ярость императора', icon: '👑', turns: 99, atkMod: 0.35 });
      log('Ярость императора — босс бьёт сильнее. Дожмите!', 'enemy');
      toast('Ярость императора');
    }

    if (combat.round >= 90) {
      const raw = Math.round((getEff(boss).atk || boss.atk) * 0.14);
      for (const h of livingHeroes()) {
        dealTrue(h, raw, boss, 'aoe', { school: 'nature', abilityName: 'Берсерк', isAoe: true });
      }
      log('Берсерк! Рейд топит по таймеру.', 'enemy');
    }
  }
