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
