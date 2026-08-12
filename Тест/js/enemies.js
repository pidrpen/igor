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
      crypt: { id: 'bl', name: 'Повелитель Склепа', icon: '👑', role: 'tank', hp: 560, atk: 20, def: 9, speed: 8, mana: 50,
        mech: { id: 'soul_link', addName: 'Якорь души', addId: 'sg', addHp: 1.45 },
        phases: [
          { at: 1, name: 'Костяной двор', abilities: [
            { id: 'a', name: 'Копьё могил', cost: 0, cd: 0, type: 'damage', power: 1.25 },
            { id: 'cast', name: 'Ритуал костей', cost: 12, cd: 2, type: 'cast_aoe', power: 0.85, castKind: 'kick', castPrio: 3 },
            { id: 's', name: 'Призыв скелетов', cost: 12, cd: 3, type: 'summon', power: 1 },
          ]},
          { at: 0.65, name: 'Кровавый алтарь', abilities: [
            { id: 'a', name: 'Копьё могил', cost: 0, cd: 0, type: 'damage', power: 1.35 },
            { id: 'buster', name: 'Казнь стража', cost: 14, cd: 2, type: 'cast_aoe', power: 1.1, castKind: 'buster', castPrio: 2 },
            { id: 'n', name: 'Вспышка праха', cost: 12, cd: 2, type: 'aoe', power: 0.72 },
          ]},
          { at: 0.3, name: 'Трон мёртвых', abilities: [
            { id: 'a', name: 'Копьё могил', cost: 0, cd: 0, type: 'damage', power: 1.4 },
            { id: 'n', name: 'Волна смерти', cost: 10, cd: 1, type: 'aoe', power: 0.8 },
            { id: 'cast', name: 'Некротическая бомба', cost: 14, cd: 2, type: 'cast_aoe', power: 0.95, castKind: 'kick', castPrio: 4 },
            { id: 's', name: 'Призыв', cost: 12, cd: 3, type: 'summon', power: 1 },
          ]},
        ]},
      forge: { id: 'eq', name: 'Пепельная Королева', icon: '🔥', role: 'dps', hp: 530, atk: 22, def: 6, speed: 11, mana: 55,
        mech: { id: 'heat', kickCools: true },
        phases: [
          { at: 1, name: 'Искры', abilities: [
            { id: 'l', name: 'Хлыст огня', cost: 0, cd: 0, type: 'damage', power: 1.25 },
            { id: 'cast', name: 'Плавильный луч', cost: 12, cd: 2, type: 'cast_aoe', power: 0.88, castKind: 'kick', castPrio: 3 },
            { id: 'r', name: 'Дождь искр', cost: 14, cd: 2, type: 'aoe', power: 0.65 },
          ]},
          { at: 0.55, name: 'Горн', abilities: [
            { id: 'l', name: 'Хлыст огня', cost: 0, cd: 0, type: 'damage', power: 1.35 },
            { id: 'buster', name: 'Молот кузни', cost: 14, cd: 2, type: 'cast_aoe', power: 1.15, castKind: 'buster', castPrio: 2 },
            { id: 'r', name: 'Дождь искр', cost: 12, cd: 2, type: 'aoe', power: 0.75 },
          ]},
          { at: 0.25, name: 'Инферно', abilities: [
            { id: 'i', name: 'Инферно', cost: 0, cd: 0, type: 'aoe', power: 0.85 },
            { id: 'w', name: 'Гнев пламени', cost: 12, cd: 1, type: 'damage', power: 1.6 },
            { id: 'cast', name: 'Сверхнакал', cost: 14, cd: 2, type: 'cast_aoe', power: 1.0, castKind: 'aoe', castPrio: 4 },
          ]},
        ]},
      tide: { id: 'th', name: 'Ужас Прилива', icon: '🌊', role: 'tank', hp: 590, atk: 19, def: 10, speed: 8, mana: 50,
        mech: { id: 'drown_mark' },
        phases: [
          { at: 1, name: 'Глубины', abilities: [
            { id: 't', name: 'Щупальце', cost: 0, cd: 0, type: 'damage', power: 1.2 },
            { id: 'cast', name: 'Приливный удар', cost: 12, cd: 2, type: 'cast_aoe', power: 0.82, castKind: 'kick', castPrio: 3 },
            { id: 's', name: 'Шквал', cost: 12, cd: 2, type: 'aoe', power: 0.65 },
          ]},
          { at: 0.6, name: 'Наводнение', abilities: [
            { id: 't', name: 'Щупальце', cost: 0, cd: 0, type: 'damage', power: 1.3 },
            { id: 'cast', name: 'Водоворот', cost: 12, cd: 2, type: 'cast_aoe', power: 0.9, castKind: 'aoe', castPrio: 3 },
            { id: 's', name: 'Шквал', cost: 10, cd: 1, type: 'aoe', power: 0.72 },
          ]},
          { at: 0.3, name: 'Бездна', abilities: [
            { id: 'c', name: 'Сокрушение', cost: 0, cd: 0, type: 'aoe', power: 0.85 },
            { id: 'buster', name: 'Хватка глубин', cost: 14, cd: 2, type: 'cast_aoe', power: 1.2, castKind: 'buster', castPrio: 2 },
            { id: 's', name: 'Прилив', cost: 10, cd: 2, type: 'damage', power: 1.55 },
          ]},
        ]},
      jade: { id: 'sha', name: 'Ша Сомнения', icon: '☯️', role: 'dps', hp: 575, atk: 21, def: 7, speed: 10, mana: 55,
        mech: { id: 'sha_split', addName: 'Воплощение сомнения', addId: 'as', addHp: 1.2, at: 0.55 },
        phases: [
          { at: 1, name: 'Сомнение', abilities: [
            { id: 'bolt', name: 'Тень', cost: 0, cd: 0, type: 'damage', power: 1.25 },
            { id: 'cast', name: 'Волна сомнения', cost: 12, cd: 2, type: 'cast_aoe', power: 0.85, castKind: 'kick', castPrio: 3 },
          ]},
          { at: 0.55, name: 'Трещина', abilities: [
            { id: 'bolt', name: 'Тень', cost: 0, cd: 0, type: 'damage', power: 1.3 },
            { id: 'adds', name: 'Воплощения', cost: 10, cd: 3, type: 'summon', power: 1 },
            { id: 'cast', name: 'Шёпот ша', cost: 12, cd: 2, type: 'cast_aoe', power: 0.9, castKind: 'kick', castPrio: 4 },
          ]},
          { at: 0.25, name: 'Разлом', abilities: [
            { id: 'bolt', name: 'Тень', cost: 0, cd: 0, type: 'damage', power: 1.4 },
            { id: 'adds', name: 'Воплощения', cost: 10, cd: 2, type: 'summon', power: 1 },
            { id: 'cast', name: 'Взрыв ша', cost: 14, cd: 2, type: 'cast_aoe', power: 1.0, castKind: 'aoe', castPrio: 4 },
            { id: 'buster', name: 'Удар сомнения', cost: 12, cd: 2, type: 'cast_aoe', power: 1.15, castKind: 'buster', castPrio: 2 },
          ]},
        ]},
      rift: { id: 'bz', name: 'Пожиратель Разлома', icon: '🌑', role: 'dps', hp: 590, atk: 22, def: 7, speed: 11, mana: 55,
        mech: { id: 'rift_priority', addName: 'Нестабильный осколок', addId: 'eq', addHp: 1.1, mustKillTurns: 3 },
        phases: [
          { at: 1, name: 'Трещина', abilities: [
            { id: 'bolt', name: 'Луч хаоса', cost: 0, cd: 0, type: 'damage', power: 1.25 },
            { id: 'cast', name: 'Искажение пространства', cost: 12, cd: 2, type: 'cast_aoe', power: 0.88, castKind: 'kick', castPrio: 3 },
          ]},
          { at: 0.55, name: 'Поглощение', abilities: [
            { id: 'bolt', name: 'Луч хаоса', cost: 0, cd: 0, type: 'damage', power: 1.35 },
            { id: 'adds', name: 'Фрагменты', cost: 10, cd: 3, type: 'summon', power: 1 },
            { id: 'cast', name: 'Волна разлома', cost: 12, cd: 2, type: 'cast_aoe', power: 0.95, castKind: 'kick', castPrio: 4 },
          ]},
          { at: 0.25, name: 'Коллапс', abilities: [
            { id: 'bolt', name: 'Луч хаоса', cost: 0, cd: 0, type: 'damage', power: 1.45 },
            { id: 'adds', name: 'Фрагменты', cost: 10, cd: 2, type: 'summon', power: 1 },
            { id: 'cast', name: 'Взрыв пустоты', cost: 14, cd: 2, type: 'cast_aoe', power: 1.05, castKind: 'aoe', castPrio: 4 },
            { id: 'buster', name: 'Поглощение', cost: 12, cd: 2, type: 'cast_aoe', power: 1.2, castKind: 'buster', castPrio: 2 },
          ]},
        ]},
      ember: { id: 'sp', name: 'Угольный Титан', icon: '🪨', role: 'tank', hp: 600, atk: 21, def: 11, speed: 7, mana: 45,
        mech: { id: 'ember_feed', addName: 'Живой уголёк', addId: 'p', addHp: 0.85, n: 2 },
        phases: [
          { at: 1, name: 'Тлеющие угли', abilities: [
            { id: 'slam', name: 'Удар угля', cost: 0, cd: 0, type: 'damage', power: 1.25 },
            { id: 'cast', name: 'Искра пепла', cost: 12, cd: 2, type: 'cast_aoe', power: 0.88, castKind: 'kick', castPrio: 3 },
            { id: 'aoe', name: 'Зольный вихрь', cost: 12, cd: 2, type: 'aoe', power: 0.65 },
          ]},
          { at: 0.55, name: 'Раскалённый корпус', abilities: [
            { id: 'slam', name: 'Удар угля', cost: 0, cd: 0, type: 'damage', power: 1.4 },
            { id: 'buster', name: 'Обвал жара', cost: 14, cd: 2, type: 'cast_aoe', power: 1.15, castKind: 'buster', castPrio: 2 },
            { id: 'aoe', name: 'Зольный вихрь', cost: 10, cd: 2, type: 'aoe', power: 0.75 },
          ]},
          { at: 0.25, name: 'Пепельный трон', abilities: [
            { id: 'slam', name: 'Удар угля', cost: 0, cd: 0, type: 'damage', power: 1.5 },
            { id: 'adds', name: 'Угольки', cost: 10, cd: 2, type: 'summon', power: 1 },
            { id: 'cast', name: 'Извержение', cost: 14, cd: 2, type: 'cast_aoe', power: 1.05, castKind: 'aoe', castPrio: 4 },
            { id: 'buster', name: 'Обвал жара', cost: 12, cd: 2, type: 'cast_aoe', power: 1.2, castKind: 'buster', castPrio: 2 },
          ]},
        ]},
    },
    /** Mid-bosses: unique per dungeon, used on mid node */
    midBosses: {
      crypt: { id: 'sg', name: 'Хранитель склепа', icon: '🪦', role: 'tank', hp: 380, atk: 18, def: 10, speed: 8, mana: 40,
        mech: { id: 'bone_ward', stacks: 4 },
        phases: [
          { at: 1, name: 'Стража', abilities: [
            { id: 's', name: 'Удар щитом', cost: 0, cd: 0, type: 'damage', power: 1.2 },
            { id: 'cast', name: 'Костяной залп', cost: 12, cd: 2, type: 'cast_aoe', power: 0.8, castKind: 'kick', castPrio: 3 },
            { id: 'slam', name: 'Топот', cost: 10, cd: 2, type: 'aoe', power: 0.6 },
          ]},
          { at: 0.4, name: 'Ярость', abilities: [
            { id: 's', name: 'Удар щитом', cost: 0, cd: 0, type: 'damage', power: 1.35 },
            { id: 'buster', name: 'Сокрушение', cost: 12, cd: 2, type: 'cast_aoe', power: 1.05, castKind: 'buster', castPrio: 2 },
            { id: 'slam', name: 'Топот', cost: 8, cd: 1, type: 'aoe', power: 0.7 },
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
        phases: [
          { at: 1, name: 'Ритуал', abilities: [
            { id: 'bolt', name: 'Волна', cost: 0, cd: 0, type: 'damage', power: 1.1 },
            { id: 'h', name: 'Исцеление глубин', cost: 12, cd: 2, type: 'heal', power: 0.35 },
            { id: 'cast', name: 'Гимн моря', cost: 12, cd: 2, type: 'cast_aoe', power: 0.8, castKind: 'kick', castPrio: 4 },
          ]},
          { at: 0.5, name: 'Шторм', abilities: [
            { id: 'bolt', name: 'Волна', cost: 0, cd: 0, type: 'damage', power: 1.25 },
            { id: 'cast', name: 'Цунами', cost: 12, cd: 2, type: 'cast_aoe', power: 0.9, castKind: 'aoe', castPrio: 3 },
            { id: 'h', name: 'Исцеление глубин', cost: 10, cd: 1, type: 'heal', power: 0.4 },
          ]},
        ]},
      jade: { id: 'as', name: 'Ученик ша', icon: '🧘', role: 'dps', hp: 350, atk: 19, def: 5, speed: 12, mana: 50,
        mech: { id: 'sha_split', addName: 'Тень ученика', addId: 'sha', addHp: 0.9, at: 0.4 },
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
        phases: [
          { at: 1, name: 'Тление', abilities: [
            { id: 'h', name: 'Удар жара', cost: 0, cd: 0, type: 'damage', power: 1.25 },
            { id: 'cast', name: 'Искра', cost: 12, cd: 2, type: 'cast_aoe', power: 0.85, castKind: 'kick', castPrio: 3 },
            { id: 'aoe', name: 'Зола', cost: 10, cd: 2, type: 'aoe', power: 0.6 },
          ]},
          { at: 0.4, name: 'Разгон', abilities: [
            { id: 'h', name: 'Удар жара', cost: 0, cd: 0, type: 'damage', power: 1.4 },
            { id: 'adds', name: 'Угольки', cost: 10, cd: 3, type: 'summon', power: 1 },
            { id: 'cast', name: 'Взрыв углей', cost: 12, cd: 2, type: 'cast_aoe', power: 0.95, castKind: 'kick', castPrio: 4 },
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
        _tpl({ id: 'z', name: 'Костяной служка', icon: '🧟', hp: 90, atk: 13, def: 4, speed: 8,
          abilities: [
            { id: 'h', name: 'Костяной удар', cost: 0, cd: 0, type: 'damage', power: 1.1, school: 'physical' },
            { id: 'dot', name: 'Гниль', cost: 8, cd: 3, type: 'dot', power: 0.4, school: 'shadow' },
          ]}),
        _tpl({ id: 'r', name: 'Прах-ритуалист', icon: '📿', hp: 76, atk: 12, def: 2, speed: 10, mana: 40,
          abilities: [
            { id: 'bolt', name: 'Порча', cost: 0, cd: 0, type: 'damage', power: 1.0, school: 'shadow' },
            { id: 'nova', name: 'Вспышка праха', cost: 12, cd: 3, type: 'cast_aoe', power: 0.72, castKind: 'kick', castPrio: 3, school: 'shadow' },
          ]}),
        _tpl({ id: 's', name: 'Ткач савана', icon: '🕷️', hp: 80, atk: 14, def: 2, speed: 13,
          abilities: [
            { id: 'bite', name: 'Укус', cost: 0, cd: 0, type: 'damage', power: 1.05 },
            { id: 'web', name: 'Саван', cost: 10, cd: 3, type: 'debuff', power: 0.16 },
          ]}),
        _tpl({ id: 'm', name: 'Могильный мистик', icon: '🔮', role: 'healer', hp: 70, atk: 11, def: 2, speed: 10, mana: 45,
          abilities: [
            { id: 'b', name: 'Тень', cost: 0, cd: 0, type: 'damage', power: 0.95, school: 'shadow' },
            { id: 'h', name: 'Тёмный хил', cost: 12, cd: 2, type: 'heal', power: 0.3 },
          ]}),
      ],
      elite: [
        _tpl({ id: 'nk', name: 'Некромант склепа', icon: '💀', role: 'healer', hp: 175, atk: 16, def: 3, speed: 9, mana: 60,
          abilities: [
            { id: 'bolt', name: 'Костяной шип', cost: 0, cd: 0, type: 'damage', power: 1.1, school: 'shadow' },
            { id: 'heal', name: 'Тёмное исцеление', cost: 12, cd: 2, type: 'heal', power: 0.35 },
            { id: 'sum', name: 'Восставший', cost: 14, cd: 3, type: 'summon', power: 1 },
            { id: 'nova', name: 'Взрыв костей', cost: 12, cd: 3, type: 'cast_aoe', power: 0.8, castKind: 'kick', castPrio: 3 },
          ]}),
        _tpl({ id: 'pl', name: 'Ткач боли', icon: '🩸', hp: 185, atk: 20, def: 3, speed: 12, mana: 55,
          abilities: [
            { id: 'lash', name: 'Плеть', cost: 0, cd: 0, type: 'damage', power: 1.2 },
            { id: 'dot', name: 'Агония', cost: 8, cd: 2, type: 'dot', power: 0.55, school: 'shadow' },
            { id: 'burst', name: 'Всплеск боли', cost: 12, cd: 3, type: 'cast_aoe', power: 0.95, castKind: 'aoe', castPrio: 3 },
          ]}),
      ],
      st: [
        _tpl({ id: 'sg', name: 'Могильный страж', icon: '🗿', role: 'tank', hp: 310, atk: 20, def: 15, speed: 6,
          abilities: [
            { id: 'bash', name: 'Сокрушение', cost: 0, cd: 0, type: 'damage', power: 1.5 },
            { id: 'exec', name: 'Казнь стража', cost: 10, cd: 2, type: 'damage', power: 2.0 },
            { id: 'wall', name: 'Костяная кожа', cost: 0, cd: 3, type: 'shield', power: 0.4 },
            { id: 'cast', name: 'Обвал склепа', cost: 12, cd: 3, type: 'cast_aoe', power: 0.9, castKind: 'kick', castPrio: 3 },
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
        _tpl({ id: 'b', name: 'Шлаковый громила', icon: '💪', role: 'tank', hp: 145, atk: 14, def: 9, speed: 6,
          abilities: [
            { id: 's', name: 'Удар', cost: 0, cd: 0, type: 'damage', power: 1.15 },
            { id: 'slam', name: 'Топот горна', cost: 8, cd: 2, type: 'aoe', power: 0.5 },
          ]}),
        _tpl({ id: 'j', name: 'Молотобоец', icon: '🪓', hp: 88, atk: 16, def: 5, speed: 9,
          abilities: [
            { id: 'cleave', name: 'Раскол', cost: 0, cd: 0, type: 'damage', power: 1.25 },
            { id: 'whirl', name: 'Вихрь искр', cost: 12, cd: 3, type: 'aoe', power: 0.6, school: 'fire' },
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
            { id: 'exec', name: 'Проковка', cost: 10, cd: 2, type: 'damage', power: 2.05, school: 'fire' },
            { id: 'cast', name: 'Перекал', cost: 12, cd: 3, type: 'cast_aoe', power: 0.92, castKind: 'kick', castPrio: 4, school: 'fire' },
          ]}),
      ],
    },
    tide: {
      trash: [
        _tpl({ id: 'a', name: 'Коралловый стрелок', icon: '🏹', hp: 72, atk: 15, def: 2, speed: 12,
          abilities: [
            { id: 'h', name: 'Гарпун', cost: 0, cd: 0, type: 'damage', power: 1.15 },
            { id: 'v', name: 'Залп соли', cost: 10, cd: 3, type: 'aoe', power: 0.48 },
          ]}),
        _tpl({ id: 'm', name: 'Жрец глубин', icon: '🔮', role: 'healer', hp: 72, atk: 11, def: 2, speed: 10, mana: 50,
          abilities: [
            { id: 'b', name: 'Волна', cost: 0, cd: 0, type: 'damage', power: 0.95, school: 'frost' },
            { id: 'h', name: 'Исцеление глубин', cost: 12, cd: 2, type: 'heal', power: 0.32 },
            { id: 'c', name: 'Гимн моря', cost: 10, cd: 3, type: 'cast_aoe', power: 0.8, castKind: 'kick', castPrio: 4, school: 'frost' },
          ]}),
        _tpl({ id: 'th', name: 'Щупальце', icon: '🌊', hp: 95, atk: 14, def: 5, speed: 8,
          abilities: [
            { id: 't', name: 'Хватка', cost: 0, cd: 0, type: 'damage', power: 1.2 },
            { id: 's', name: 'Шквал', cost: 10, cd: 2, type: 'aoe', power: 0.55 },
          ]}),
      ],
      elite: [
        _tpl({ id: 'pl', name: 'Оракул прилива', icon: '🐚', role: 'healer', hp: 180, atk: 16, def: 4, speed: 11, mana: 60,
          abilities: [
            { id: 'bolt', name: 'Волна', cost: 0, cd: 0, type: 'damage', power: 1.1, school: 'frost' },
            { id: 'h', name: 'Исцеление глубин', cost: 12, cd: 2, type: 'heal', power: 0.36 },
            { id: 'cast', name: 'Цунами', cost: 12, cd: 2, type: 'cast_aoe', power: 0.9, castKind: 'aoe', castPrio: 3, school: 'frost' },
          ]}),
      ],
      st: [
        _tpl({ id: 'b', name: 'Утопленный страж', icon: '💪', role: 'tank', hp: 330, atk: 20, def: 14, speed: 6,
          abilities: [
            { id: 's', name: 'Удар якорем', cost: 0, cd: 0, type: 'damage', power: 1.5 },
            { id: 'exec', name: 'На дно', cost: 10, cd: 2, type: 'damage', power: 2.1 },
            { id: 'cast', name: 'Водоворот', cost: 12, cd: 3, type: 'cast_aoe', power: 0.9, castKind: 'kick', castPrio: 3, school: 'frost' },
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
        _tpl({ id: 'c', name: 'Страж двора', icon: '🪖', role: 'tank', hp: 150, atk: 14, def: 10, speed: 7,
          abilities: [
            { id: 'c', name: 'Рассечение', cost: 0, cd: 0, type: 'damage', power: 1.15 },
            { id: 's', name: 'Клич', cost: 10, cd: 3, type: 'buff', power: 0.2 },
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
            { id: 'cast', name: 'Смятение', cost: 12, cd: 3, type: 'cast_aoe', power: 0.85, castKind: 'kick', castPrio: 3 },
          ]}),
      ],
    },
    rift: {
      trash: [
        _tpl({ id: 'w', name: 'Осколок пустоты', icon: '😈', hp: 80, atk: 15, def: 2, speed: 12, mana: 40,
          abilities: [
            { id: 'b', name: 'Луч хаоса', cost: 0, cd: 0, type: 'damage', power: 1.2, school: 'shadow' },
            { id: 'n', name: 'Искажение', cost: 12, cd: 3, type: 'cast_aoe', power: 0.8, castKind: 'kick', castPrio: 3, school: 'shadow' },
          ]}),
        _tpl({ id: 'bz', name: 'Ползун разлома', icon: '🌑', hp: 88, atk: 14, def: 4, speed: 11,
          abilities: [
            { id: 'hit', name: 'Разрыв', cost: 0, cd: 0, type: 'damage', power: 1.15 },
            { id: 'slam', name: 'Волна пустоты', cost: 10, cd: 2, type: 'aoe', power: 0.55, school: 'shadow' },
          ]}),
      ],
      elite: [
        _tpl({ id: 'eq', name: 'Страж трещины', icon: '🌀', role: 'tank', hp: 200, atk: 18, def: 10, speed: 9, mana: 45,
          abilities: [
            { id: 'h', name: 'Удар разлома', cost: 0, cd: 0, type: 'damage', power: 1.25 },
            { id: 'cast', name: 'Искажение', cost: 12, cd: 2, type: 'cast_aoe', power: 0.88, castKind: 'kick', castPrio: 3, school: 'shadow' },
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
        _tpl({ id: 'b', name: 'Пепельный громила', icon: '💪', role: 'tank', hp: 148, atk: 14, def: 9, speed: 6,
          abilities: [
            { id: 's', name: 'Удар угля', cost: 0, cd: 0, type: 'damage', power: 1.15, school: 'fire' },
            { id: 'slam', name: 'Обвал жара', cost: 8, cd: 2, type: 'aoe', power: 0.52, school: 'fire' },
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
      if (m.id === 'soul_link' || m.id === 'rift_priority' || m.id === 'ember_feed') {
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
        applyStatus(boss, { id: 'heat', name: 'Перегрев', icon: '🔥', turns: 99, stacks: 0, tip: 'Кик сбивает жар. 3+ стака жгут отряд.' });
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
      if (m.id === 'ember_feed') {
        const feeds = (combat.enemies || []).filter(x => x.alive && x.mechRole === 'ember_feed');
        if (feeds.length) {
          const heal = Math.round(boss.maxHp * 0.035 * feeds.length);
          boss.hp = Math.min(boss.maxHp, boss.hp + heal);
          log(`${boss.name} питается углями +${fmt(heal)}`, 'enemy');
        }
      }
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
      if (m.id === 'drown_mark' && combat.round % 3 === 0) {
        const t = lowest(livingHeroes());
        if (t) {
          applyStatus(t, { id: 'drown', name: 'Утопление', icon: '🌊', turns: 2, dmgTakenMod: 0.2, tip: 'Получает +20% урона' });
          log(`${t.name} тонет — лечите / диспел`, 'enemy');
        }
      }
    }
  }
