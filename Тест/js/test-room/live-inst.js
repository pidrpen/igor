(function (root) {
  const ENEMIES = {
    guard: {
      id: 'guard', name: 'Страж монастыря', color: '#c45a40',
      hp: 95, speed: 2.15, size: 86, side: 'enemy',
      idle: 'mob_guard', aiKind: 'melee', aiAnim: null, aiHit: 2, aiDmg: 12, aiCd: 1.45, aiRange: 1.22
    },
    wisp: {
      id: 'wisp', name: 'Сгусток ша', color: '#9b6cff',
      hp: 58, speed: 2.5, size: 70, side: 'enemy',
      idle: 'mob_wisp', aiKind: 'bolt', aiAnim: null, aiHit: 1, aiDmg: 11, aiCd: 2.1, aiRange: 4.4
    },
    disciple: {
      id: 'disciple', name: 'Ученик', color: '#3ecf8e',
      hp: 88, speed: 2.7, size: 84, side: 'enemy',
      idle: 'mob_disciple', aiKind: 'melee', aiAnim: null, aiHit: 2, aiDmg: 13, aiCd: 1.25, aiRange: 1.2
    },
    caster: {
      id: 'caster', name: 'Ткач тумана', color: '#7ad0ff',
      hp: 76, speed: 2.05, size: 90, side: 'enemy',
      idle: 'mob_caster', aiKind: 'bolt', aiAnim: null, aiHit: 1, aiDmg: 14, aiCd: 2.35, aiRange: 5.0
    },
    elite: {
      id: 'elite', name: 'Нефритовый страж', color: '#4aaa68',
      hp: 210, speed: 2.2, size: 112, side: 'enemy',
      idle: 'mob_elite', aiKind: 'melee', aiAnim: null, aiHit: 2, aiDmg: 20, aiCd: 1.55, aiRange: 1.35
    },
    boss: {
      id: 'boss', name: 'Ша сомнения', color: '#6a40a8',
      hp: 520, speed: 2.05, size: 132, side: 'enemy',
      idle: 'mob_boss', nesIdle: 'nes_boss', aiKind: 'boss', aiAnim: null, aiHit: 2, aiDmg: 26, aiCd: 1.65, aiRange: 1.45, novaDmg: 18, novaRange: 2.5, novaCd: 6
    },
    assassin: {
      id: 'assassin', name: 'Тень ша', color: '#5a2080',
      hp: 72, speed: 3.55, size: 82, side: 'enemy',
      idle: 'mob_assassin', nesIdle: 'nes_assassin', aiKind: 'assassin', aiAnim: 'nes_assassin_atk', aiHit: 1, aiDmg: 19, aiCd: 0.95, aiRange: 1.12
    },
    healer: {
      id: 'healer', name: 'Монастырская целительница', color: '#8ecf9a',
      hp: 86, speed: 2.05, size: 88, side: 'enemy',
      idle: 'mob_healer', nesIdle: 'nes_healer', aiKind: 'healer', aiAnim: null, aiHit: 1, aiDmg: 8, healAmt: 18, aiCd: 2.1, aiRange: 4.6
    },
    archer: {
      id: 'archer', name: 'Нефритовый лучник', color: '#c4a060',
      hp: 74, speed: 2.35, size: 88, side: 'enemy',
      idle: 'mob_archer', nesIdle: 'nes_archer', boltTex: 'arrow', aiKind: 'kite', aiAnim: null, aiHit: 1, aiDmg: 14, aiCd: 1.75, aiRange: 5.4
    },
    brute: {
      id: 'brute', name: 'Глыба ша', color: '#6a30a0',
      hp: 195, speed: 1.55, size: 118, side: 'enemy',
      idle: 'mob_brute', nesIdle: 'nes_brute', aiKind: 'brute', aiAnim: null, aiHit: 2, aiDmg: 24, aiCd: 1.85, aiRange: 1.4, novaDmg: 15, novaRange: 2.2, novaCd: 5.5
    },
    charger: {
      id: 'charger', name: 'Нефритовый боец', color: '#3ecf8e',
      hp: 92, speed: 3.4, size: 86, side: 'enemy',
      idle: 'mob_disciple', aiKind: 'charger', aiAnim: null, aiHit: 2, aiDmg: 16, aiCd: 1.05, aiRange: 1.18
    }
  };

  const SPRITES = {
    guard: [
      '......HHHHHH......',
      '.....HGGGGGGH.....',
      '.....HGKGGKGH.....',
      '.....HGGGGGGH.....',
      '......HNNNNH......',
      '.....RRRRRRRR.....',
      '....RRGGGGGRRR....',
      '....RRRRRRRRRR....',
      '....RR......RR....',
      '...SSS......SSS...',
      '...SS........SS...',
      '...SS........SS...',
      '...DD........DD...',
      '..DDD........DDD..'
    ],
    wisp: [
      '......PPPP......',
      '....PPWWWWPP....',
      '...PWWKKWWWWP...',
      '...PWWKKWWWWP...',
      '....PWWWWWWP....',
      '....PPWWWWPP....',
      '.....PPPPPP.....',
      '......P..P......',
      '.....P....P.....'
    ],
    disciple: [
      '......SSSS......',
      '.....SNNNNNS....',
      '.....SNKNNKNS...',
      '.....SNNNNNS....',
      '......GGGGGG.....',
      '.....GGWWWWGG....',
      '....GGWWWWWWGG...',
      '....GGGGGGGGGG...',
      '....GG......GG...',
      '...NNN......NNN..',
      '...NN........NN..',
      '...DD........DD..'
    ],
    caster: [
      '......BBBBBB......',
      '.....BWWWWWWB.....',
      '.....BWKWWKWB.....',
      '.....BWWWWWWB.....',
      '......BCCCCCB.....',
      '.....CCWWWWCC.....',
      '....CCWWWWWWCC....',
      '....CCCCCCCCCC....',
      '....CC......CC....',
      '...LLL......LLL...',
      '...LL........LL...',
      '...DD........DD...'
    ],
    elite: [
      '........GGGGGG........',
      '......GGWWWWWWGG......',
      '.....GWWKKWWKKWWG.....',
      '.....GWWWWWWWWWWG.....',
      '......GGYYYYYYGG......',
      '.....GGYYYYYYYYGG.....',
      '....GGYYYYYYYYYYGG....',
      '....GGGGGGGGGGGGGG....',
      '....GG..........GG....',
      '...SSS..........SSS...',
      '...SS............SS...',
      '...DD............DD...',
      '..DDD............DDD..'
    ],
    boss: [
      '......VVVVVVVV......',
      '....VVWWWWWWWWVV....',
      '...VWWKKWWWWKKWWV...',
      '...VWWWWWWWWWWWWV...',
      '....VVVVYYYYVVVV....',
      '....VVYYYYYYYYVV....',
      '...VVYYYYYYYYYYVV...',
      '...VVVVVVVVVVVVVV...',
      '...VV..........VV...',
      '..VVV..........VVV..',
      '..VV............VV..',
      '..DD............DD..',
      '.DDD............DDD.'
    ]
  };

  const PAL = {
    guard: { H: '#e8d48a', G: '#c4a040', K: '#1a1810', N: '#e0c8a0', R: '#b83828', S: '#6a2018', D: '#3a2010' },
    wisp: { P: '#6a40a8', W: '#c8b0ff', K: '#f0e070' },
    disciple: { S: '#e8d0b0', N: '#d0b090', K: '#1a1810', G: '#2e8a58', W: '#d8f0e0', D: '#3a2410' },
    caster: { B: '#d8e8f8', W: '#f0f6ff', K: '#1a1810', C: '#5aa0d0', L: '#3a6088', D: '#2a3040' },
    elite: { G: '#1a4a28', W: '#4aaa68', K: '#f0e070', Y: '#c4a040', S: '#6a5848', D: '#3a2410' },
    boss: { V: '#2a1848', W: '#8a70c0', K: '#f0e070', Y: '#4a2068', D: '#1a1028' },
    assassin: { V: '#2a1038', W: '#4a1860', K: '#f0e070', Y: '#1a0818', D: '#0a040c' },
    healer: { S: '#f0e8d8', N: '#e8dcc8', K: '#1a1810', G: '#8ecf9a', W: '#d8f0e0', D: '#3a2410' },
    archer: { S: '#e8d0b0', N: '#d0b090', K: '#1a1810', G: '#3a6a38', W: '#c4a060', D: '#3a2410' },
    brute: { V: '#4a2080', W: '#c4a040', K: '#1a0818', Y: '#e8c040', D: '#1a1028' }
  };

  const SPAWN5 = [
    { x: 14.2, y: 22.4 }, { x: 16.2, y: 22.6 }, { x: 12.2, y: 22.7 },
    { x: 15.0, y: 23.2 }, { x: 13.0, y: 23.3 }
  ];

  function ROOMS() {
    return {
      court: {
        id: 'court', name: 'Нефритовый двор', idx: 1, next: 'colonnade',
        spawn: { brew: { x: 14.2, y: 22.4 }, unholy: { x: 16.2, y: 22.6 }, sham: { x: 12.2, y: 22.7 } },
        spawnList: SPAWN5,
        house: { c0: 5, r0: 6, c1: 11, r1: 12 },
        exits: [[3, 13], [3, 14], [3, 15]],
        enemies: [
          { kit: 'guard', x: 14.4, y: 17.6 },
          { kit: 'guard', x: 11.2, y: 18.2 },
          { kit: 'charger', x: 17.4, y: 16.8 },
          { kit: 'archer', x: 20.6, y: 10.4 },
          { kit: 'archer', x: 7.6, y: 11.2 },
          { kit: 'assassin', x: 9.2, y: 16.8 }
        ]
      },
      colonnade: {
        id: 'colonnade', name: 'Колоннада', idx: 2, next: 'gallery',
        spawnList: SPAWN5, house: null,
        exits: [[3, 13], [3, 14], [3, 15]],
        enemies: [
          { kit: 'disciple', x: 8.4, y: 14.2 },
          { kit: 'disciple', x: 19.6, y: 14.6 },
          { kit: 'charger', x: 14.0, y: 12.4 },
          { kit: 'archer', x: 21.2, y: 9.2 },
          { kit: 'wisp', x: 10.2, y: 9.6 },
          { kit: 'healer', x: 16.8, y: 8.8 }
        ]
      },
      gallery: {
        id: 'gallery', name: 'Крытая галерея', idx: 3, next: 'garden',
        spawn: { brew: { x: 14.0, y: 22.6 }, unholy: { x: 16.0, y: 22.5 }, sham: { x: 12.2, y: 22.7 } },
        spawnList: SPAWN5, house: null,
        exits: [[3, 13], [3, 14], [3, 15]],
        enemies: [
          { kit: 'disciple', x: 10.2, y: 14.4 },
          { kit: 'disciple', x: 17.6, y: 15.0 },
          { kit: 'charger', x: 14.0, y: 16.4 },
          { kit: 'healer', x: 18.4, y: 9.2 },
          { kit: 'caster', x: 14.0, y: 8.2 },
          { kit: 'assassin', x: 8.6, y: 11.2 }
        ]
      },
      garden: {
        id: 'garden', name: 'Сад лотоса', idx: 4, next: 'library',
        spawnList: SPAWN5, house: null,
        exits: [[3, 13], [3, 14], [3, 15]],
        enemies: [
          { kit: 'wisp', x: 8.2, y: 12.4 },
          { kit: 'wisp', x: 19.6, y: 12.8 },
          { kit: 'caster', x: 14.0, y: 10.2 },
          { kit: 'archer', x: 21.4, y: 16.4 },
          { kit: 'healer', x: 7.4, y: 16.2 },
          { kit: 'assassin', x: 12.2, y: 15.6 },
          { kit: 'charger', x: 16.6, y: 15.2 }
        ]
      },
      library: {
        id: 'library', name: 'Зал свитков', idx: 5, next: 'sanctum',
        spawnList: SPAWN5, house: null,
        exits: [[3, 13], [3, 14], [3, 15]],
        enemies: [
          { kit: 'caster', x: 9.2, y: 10.4 },
          { kit: 'caster', x: 18.8, y: 10.6 },
          { kit: 'healer', x: 14.0, y: 8.4 },
          { kit: 'disciple', x: 11.4, y: 15.2 },
          { kit: 'disciple', x: 16.8, y: 15.4 },
          { kit: 'elite', x: 14.0, y: 12.6 }
        ]
      },
      sanctum: {
        id: 'sanctum', name: 'Зал медитации', idx: 6, next: 'crypt',
        spawn: { brew: { x: 14.0, y: 22.5 }, unholy: { x: 16.2, y: 22.6 }, sham: { x: 12.0, y: 22.6 } },
        spawnList: SPAWN5, house: null,
        exits: [[3, 13], [3, 14], [3, 15]],
        enemies: [
          { kit: 'elite', x: 12.4, y: 12.2 },
          { kit: 'brute', x: 16.6, y: 12.6 },
          { kit: 'wisp', x: 20.2, y: 15.4 },
          { kit: 'wisp', x: 8.2, y: 15.2 },
          { kit: 'healer', x: 8.6, y: 10.8 },
          { kit: 'assassin', x: 19.4, y: 10.6 }
        ]
      },
      crypt: {
        id: 'crypt', name: 'Крипта ша', idx: 7, next: 'throne',
        spawnList: SPAWN5, house: null,
        exits: [[3, 13], [3, 14], [3, 15]],
        enemies: [
          { kit: 'brute', x: 10.4, y: 12.2 },
          { kit: 'brute', x: 17.8, y: 12.6 },
          { kit: 'assassin', x: 8.2, y: 16.4 },
          { kit: 'assassin', x: 19.8, y: 16.2 },
          { kit: 'wisp', x: 12.2, y: 9.4 },
          { kit: 'wisp', x: 16.4, y: 9.2 },
          { kit: 'healer', x: 14.0, y: 8.2 }
        ]
      },
      throne: {
        id: 'throne', name: 'Сердце ша', idx: 8, next: null,
        spawn: { brew: { x: 14.0, y: 22.4 }, unholy: { x: 16.0, y: 22.5 }, sham: { x: 12.2, y: 22.6 } },
        spawnList: SPAWN5, house: null, exits: [],
        enemies: [
          { kit: 'boss', x: 14.0, y: 11.4 },
          { kit: 'wisp', x: 9.2, y: 16.2 },
          { kit: 'wisp', x: 18.8, y: 16.0 },
          { kit: 'assassin', x: 11.0, y: 14.6 },
          { kit: 'assassin', x: 17.2, y: 14.4 },
          { kit: 'healer', x: 20.2, y: 10.2 },
          { kit: 'brute', x: 8.4, y: 11.6 }
        ]
      }
    };
  }

  function stamp(m, c0, r0, c1, r1, kind, h, walk, api) {
    for (let r = r0; r < r1; r++) {
      for (let c = c0; c < c1; c++) {
        if (r < 0 || c < 0 || r >= api.ROWS || c >= api.COLS) continue;
        m[r][c] = api.cell(kind, h, walk);
      }
    }
  }

  function emptyMap(api) {
    const m = [];
    for (let r = 0; r < api.ROWS; r++) {
      m[r] = [];
      for (let c = 0; c < api.COLS; c++) {
        if (r === 0 || c === 0 || r === api.ROWS - 1 || c === api.COLS - 1) m[r][c] = api.cell('void', 0, false);
        else m[r][c] = api.cell('water', 0, false);
      }
    }
    return m;
  }

  function setProp(m, c, r, kind) {
    const t = m[r] && m[r][c];
    if (!t || t.kind === 'void') return;
    t.walk = false;
    t.prop = kind;
  }

  function buildCourt(api) {
    const m = emptyMap(api);
    const H = api.HOUSE;
    stamp(m, 6, 16, 22, 25, 'plaza', 0, true, api);
    stamp(m, 13, 14, 16, 25, 'plaza', 0, true, api);
    stamp(m, 8, 13, 20, 17, 'stairs', 1, true, api);
    stamp(m, 3, 5, 12, 14, 'pale', 2, true, api);
    stamp(m, 16, 4, 25, 14, 'jade', 2, true, api);
    stamp(m, 12, 12, 17, 14, 'stairs', 1, true, api);
    stamp(m, 13, 4, 16, 13, 'jade', 2, true, api);
    stamp(m, 12, 19, 17, 23, 'fountain', 0, false, api);
    stamp(m, 3, 20, 7, 25, 'pale', 0, true, api);
    stamp(m, 20, 20, 25, 25, 'jade', 0, true, api);
    stamp(m, 20, 6, 24, 10, 'wall', 2, false, api);
    stamp(m, 21, 7, 23, 9, 'floor', 2, true, api);
    m[9][21] = api.cell('door', 2, true);
    m[9][22] = api.cell('door', 2, true);
    const mid0 = Math.floor((H.c0 + H.c1) / 2) - 1;
    for (let r = H.r0; r < H.r1; r++) {
      for (let c = H.c0; c < H.c1; c++) {
        const edge = r === H.r0 || r === H.r1 - 1 || c === H.c0 || c === H.c1 - 1;
        const door = r === H.r1 - 1 && (c === mid0 || c === mid0 + 1);
        if (door) m[r][c] = api.cell('door', 2, true);
        else if (edge) m[r][c] = api.cell('wall', 2, false);
        else m[r][c] = api.cell('floor', 2, true);
      }
    }
    stamp(m, 13, 3, 16, 5, 'gate', 2, false, api);
    [[16, 11], [16, 17], [18, 8], [18, 20]].forEach(function (p) { setProp(m, p[1], p[0], 'lion'); });
    [[5, 4], [5, 24], [14, 3], [4, 16], [22, 5], [24, 13], [24, 22], [21, 24]].forEach(function (p) { setProp(m, p[1], p[0], 'tree'); });
    [[13, 8], [13, 20], [17, 8], [17, 20], [12, 12], [16, 16], [22, 16], [8, 22]].forEach(function (p) { setProp(m, p[1], p[0], 'lantern'); });
    return m;
  }

  function hallShell(m, api) {
    stamp(m, 3, 3, 25, 25, 'floor', 0, true, api);
    stamp(m, 3, 3, 25, 4, 'wall', 2, false, api);
    stamp(m, 3, 24, 25, 25, 'wall', 2, false, api);
    stamp(m, 3, 3, 4, 25, 'wall', 2, false, api);
    stamp(m, 24, 3, 25, 25, 'wall', 2, false, api);
    m[24][13] = api.cell('door', 0, true);
    m[24][14] = api.cell('door', 0, true);
    m[24][15] = api.cell('door', 0, true);
    stamp(m, 13, 3, 16, 4, 'gate', 1, false, api);
  }

  function buildHall(api, kind) {
    const m = emptyMap(api);
    hallShell(m, api);
    if (kind === 'gallery') {
      stamp(m, 12, 5, 17, 23, 'carpet', 0, true, api);
      stamp(m, 13, 5, 16, 23, 'carpet', 0, true, api);
      stamp(m, 4, 8, 8, 12, 'pale', 0, true, api);
      stamp(m, 20, 8, 24, 12, 'pale', 0, true, api);
      [[6, 6], [6, 10], [6, 14], [6, 18], [6, 22], [21, 6], [21, 10], [21, 14], [21, 18], [21, 22]].forEach(function (p) {
        m[p[1]][p[0]] = api.cell('pillar', 2, false);
      });
      [[8, 6], [8, 22], [19, 6], [19, 22]].forEach(function (p) { setProp(m, p[0], p[1], 'lantern'); });
    }
    if (kind === 'sanctum') {
      stamp(m, 10, 7, 18, 14, 'dais', 1, true, api);
      stamp(m, 12, 8, 16, 12, 'statue', 1, false, api);
      stamp(m, 5, 16, 9, 21, 'water', 0, false, api);
      stamp(m, 19, 16, 23, 21, 'water', 0, false, api);
      stamp(m, 6, 17, 8, 20, 'pale', 0, true, api);
      stamp(m, 20, 17, 22, 20, 'pale', 0, true, api);
      [[7, 6], [20, 6], [7, 14], [20, 14], [10, 18], [17, 18]].forEach(function (p) {
        m[p[1]][p[0]] = api.cell('pillar', 2, false);
      });
      setProp(m, 13, 9, 'statue');
      setProp(m, 14, 9, 'statue');
      [[8, 8], [19, 8], [11, 16], [16, 16]].forEach(function (p) { setProp(m, p[0], p[1], 'lantern'); });
    }
    if (kind === 'library') {
      stamp(m, 6, 6, 12, 22, 'pale', 0, true, api);
      stamp(m, 16, 6, 22, 22, 'pale', 0, true, api);
      stamp(m, 12, 5, 16, 23, 'carpet', 0, true, api);
      [[6, 7], [6, 12], [6, 17], [21, 7], [21, 12], [21, 17], [10, 6], [17, 6]].forEach(function (p) {
        m[p[1]][p[0]] = api.cell('pillar', 2, false);
      });
      [[8, 8], [19, 8], [8, 20], [19, 20]].forEach(function (p) { setProp(m, p[0], p[1], 'lantern'); });
    }
    return m;
  }

  function buildColonnade(api) {
    const m = emptyMap(api);
    stamp(m, 4, 4, 24, 24, 'jade', 0, true, api);
    stamp(m, 12, 4, 16, 24, 'plaza', 0, true, api);
    stamp(m, 6, 8, 10, 20, 'pale', 1, true, api);
    stamp(m, 18, 8, 22, 20, 'pale', 1, true, api);
    [[7, 7], [7, 11], [7, 15], [7, 19], [20, 7], [20, 11], [20, 15], [20, 19]].forEach(function (p) {
      m[p[1]][p[0]] = api.cell('pillar', 2, false);
    });
    stamp(m, 13, 3, 16, 5, 'gate', 1, false, api);
    [[5, 6], [5, 22], [22, 6], [22, 22], [11, 10], [16, 10]].forEach(function (p) { setProp(m, p[0], p[1], 'lantern'); });
    [[4, 10], [4, 18], [23, 10], [23, 18]].forEach(function (p) { setProp(m, p[0], p[1], 'tree'); });
    return m;
  }

  function buildGarden(api) {
    const m = emptyMap(api);
    stamp(m, 3, 3, 25, 25, 'jade', 0, true, api);
    stamp(m, 10, 10, 18, 18, 'water', 0, false, api);
    stamp(m, 12, 12, 16, 16, 'pale', 0, true, api);
    stamp(m, 13, 4, 16, 12, 'plaza', 0, true, api);
    stamp(m, 13, 16, 16, 24, 'plaza', 0, true, api);
    stamp(m, 13, 3, 16, 5, 'gate', 1, false, api);
    [[5, 5], [5, 22], [22, 5], [22, 22], [8, 14], [19, 14]].forEach(function (p) { setProp(m, p[0], p[1], 'tree'); });
    [[8, 8], [19, 8], [8, 20], [19, 20], [11, 11], [16, 16]].forEach(function (p) { setProp(m, p[0], p[1], 'lantern'); });
    return m;
  }

  function buildCrypt(api) {
    const m = emptyMap(api);
    stamp(m, 4, 4, 24, 24, 'jade', 0, true, api);
    stamp(m, 6, 6, 11, 11, 'water', 0, false, api);
    stamp(m, 17, 6, 22, 11, 'water', 0, false, api);
    stamp(m, 6, 16, 11, 21, 'water', 0, false, api);
    stamp(m, 17, 16, 22, 21, 'water', 0, false, api);
    stamp(m, 11, 11, 17, 17, 'dais', 1, true, api);
    stamp(m, 13, 3, 16, 5, 'gate', 1, false, api);
    [[8, 13], [19, 13], [12, 8], [15, 8], [12, 20], [15, 20]].forEach(function (p) {
      m[p[1]][p[0]] = api.cell('pillar', 0, false);
    });
    [[9, 14], [18, 14], [13, 9], [14, 19]].forEach(function (p) { setProp(m, p[0], p[1], 'lantern'); });
    return m;
  }

  function buildThrone(api) {
    const m = emptyMap(api);
    stamp(m, 5, 5, 23, 24, 'jade', 0, true, api);
    stamp(m, 10, 8, 18, 17, 'dais', 1, true, api);
    stamp(m, 12, 9, 16, 14, 'dais', 2, true, api);
    stamp(m, 3, 3, 25, 4, 'wall', 2, false, api);
    stamp(m, 3, 3, 4, 25, 'wall', 2, false, api);
    stamp(m, 24, 3, 25, 25, 'wall', 2, false, api);
    stamp(m, 3, 24, 25, 25, 'wall', 2, false, api);
    m[24][13] = api.cell('door', 0, true);
    m[24][14] = api.cell('door', 0, true);
    m[24][15] = api.cell('door', 0, true);
    stamp(m, 6, 6, 9, 9, 'water', 0, false, api);
    stamp(m, 19, 6, 22, 9, 'water', 0, false, api);
    [[6, 6], [21, 6], [6, 21], [21, 21], [10, 10], [17, 10]].forEach(function (p) {
      m[p[1]][p[0]] = api.cell('pillar', 0, false);
    });
    [[8, 12], [19, 12], [12, 20], [16, 20]].forEach(function (p) { setProp(m, p[0], p[1], 'lantern'); });
    return m;
  }

  function build(id, api) {
    if (id === 'colonnade') return buildColonnade(api);
    if (id === 'gallery') return buildHall(api, 'gallery');
    if (id === 'garden') return buildGarden(api);
    if (id === 'library') return buildHall(api, 'library');
    if (id === 'sanctum') return buildHall(api, 'sanctum');
    if (id === 'crypt') return buildCrypt(api);
    if (id === 'throne') return buildThrone(api);
    return buildCourt(api);
  }

  function paintFaces(scene, ctx, map) {
    const rows = map.length;
    const cols = map[0] ? map[0].length : 0;
    const order = [];
    for (let r = 0; r < rows; r++) {
      if (!map[r]) continue;
      for (let c = 0; c < cols; c++) {
        if (!map[r][c] || map[r][c].kind === 'void') continue;
        order.push({ c: c, r: r, s: c + r });
      }
    }
    order.sort(function (a, b) { return a.s - b.s; });
    for (let i = 0; i < order.length; i++) {
      const c = order[i].c;
      const r = order[i].r;
      const t = map[r][c];
      const h = t.h || 0;
      if (h <= 0) continue;
      const east = (c + 1 < cols && map[r][c + 1]) ? map[r][c + 1] : { h: 0 };
      const south = (r + 1 < rows && map[r + 1] && map[r + 1][c]) ? map[r + 1][c] : { h: 0 };
      const fc = scene.faceColors(t.kind);
      if ((east.h || 0) < h) {
        fillQ(ctx, [
          iso(c + 1, r, h), iso(c + 1, r + 1, h),
          iso(c + 1, r + 1, 0), iso(c + 1, r, 0)
        ], fc.e);
        if (t.kind === 'stairs') {
          fillQ(ctx, [
            iso(c + 1, r, h * 0.55), iso(c + 1, r + 1, h * 0.55),
            iso(c + 1, r + 1, h * 0.45), iso(c + 1, r, h * 0.45)
          ], '#d8c8b0');
        }
      }
      if ((south.h || 0) < h) {
        fillQ(ctx, [
          iso(c, r + 1, h), iso(c + 1, r + 1, h),
          iso(c + 1, r + 1, 0), iso(c, r + 1, 0)
        ], fc.s);
        if (t.kind === 'stairs') {
          fillQ(ctx, [
            iso(c, r + 1, h * 0.7), iso(c + 1, r + 1, h * 0.7),
            iso(c + 1, r + 1, h * 0.58), iso(c, r + 1, h * 0.58)
          ], '#d0c0a8');
          fillQ(ctx, [
            iso(c, r + 1, h * 0.38), iso(c + 1, r + 1, h * 0.38),
            iso(c + 1, r + 1, h * 0.26), iso(c, r + 1, h * 0.26)
          ], '#b8a888');
        }
      }
    }
  }

  function iso(wx, wy, h) {
    return root.LiveIso.isoScreen(wx, wy, h);
  }
  function top(c0, r0, c1, r1, h) {
    return root.LiveIso.isoTop(c0, r0, c1, r1, h);
  }
  function fillQ(ctx, pts, col) {
    root.LiveIso.fillQuad(ctx, pts, col);
  }
  function hash(c, r) { return (c * 73 + r * 149) & 255; }

  function paintCourt(scene, ctx, map) {
    fillQ(ctx, top(1, 1, 27, 27, 0), '#163848');
    fillQ(ctx, top(6, 16, 22, 25, 0), '#c4b090');
    fillQ(ctx, top(13, 14, 16, 25, 0), '#d0bc9a');
    fillQ(ctx, top(3, 5, 12, 14, 2), '#d8c8b0');
    fillQ(ctx, top(16, 4, 25, 14, 2), '#3c7a58');
    fillQ(ctx, top(13, 4, 16, 13, 2), '#3c7a58');
    fillQ(ctx, top(8, 13, 20, 17, 1), '#c8b898');
    fillQ(ctx, top(12, 12, 17, 14, 1), '#c8b898');
    fillQ(ctx, top(12, 19, 17, 23, 0), '#2a6a68');
    fillQ(ctx, top(3, 20, 7, 25, 0), '#c4b49a');
    fillQ(ctx, top(20, 20, 25, 25, 0), '#2e6a48');
    fillQ(ctx, top(20, 6, 24, 10, 2), '#b89068');
    fillQ(ctx, top(13, 3, 16, 5, 2), '#c4a040');
    paintFaces(scene, ctx, map);
    const rows = map.length;
    const cols = map[0] ? map[0].length : 0;
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const t = map[r][c];
        if (!t || t.kind === 'void') continue;
        const h = t.h || 0;
        const p = iso(c + 0.5, r + 0.5, h);
        const hv = hash(c, r);
        const xi = Math.round(p.x);
        const yi = Math.round(p.y);
        if (t.kind === 'water') {
          const shore = (map[r][c - 1] && map[r][c - 1].walk) || (map[r - 1] && map[r - 1][c] && map[r - 1][c].walk)
            || (map[r][c + 1] && map[r][c + 1].walk) || (map[r + 1] && map[r + 1][c] && map[r + 1][c].walk);
          if (shore) fillQ(ctx, top(c, r, c + 1, r + 1, 0), '#1a4050');
          if (hv < 110) {
            ctx.fillStyle = '#3a7a90';
            ctx.fillRect(xi - 10, yi, 16, 1);
            ctx.fillStyle = '#8ec8d8';
            ctx.fillRect(xi - 5, yi - 1, 7, 1);
          }
          if (hv > 200 && hv < 222) {
            ctx.fillStyle = '#c45a28';
            ctx.fillRect(xi, yi - 1, 6, 2);
            ctx.fillStyle = '#e8a060';
            ctx.fillRect(xi + 5, yi - 1, 2, 2);
          }
          if (hv > 28 && hv < 62) {
            ctx.fillStyle = '#2e7a40';
            ctx.fillRect(xi - 6, yi, 12, 3);
            ctx.fillStyle = '#f0e8c8';
            ctx.fillRect(xi - 1, yi, 2, 2);
          }
        } else if (t.kind === 'plaza') {
          if ((c + r) % 2 === 0) fillQ(ctx, top(c + 0.12, r + 0.12, c + 0.88, r + 0.88, 0), '#b8a888');
          if (hv < 50) {
            ctx.fillStyle = '#8a7860';
            ctx.fillRect(xi - 8, yi, 16, 1);
          }
        } else if (t.kind === 'jade') {
          if (hv < 70) {
            ctx.fillStyle = '#4e9a70';
            ctx.fillRect(xi - 4, yi, 8, 2);
          }
          if (hv > 220) {
            ctx.fillStyle = '#c4a040';
            ctx.fillRect(xi, yi, 3, 3);
          }
          if (hv > 40 && hv < 55) {
            ctx.fillStyle = '#1a4a30';
            ctx.fillRect(xi - 6, yi, 12, 1);
          }
        } else if (t.kind === 'pale' || t.kind === 'stairs') {
          ctx.fillStyle = '#c4b49a';
          if ((c + r) % 3 === 0) ctx.fillRect(xi - 12, yi, 24, 1);
          if (hv < 36) ctx.fillRect(xi - 3, yi, 5, 2);
        } else if (t.kind === 'floor') {
          ctx.fillStyle = '#a07850';
          ctx.fillRect(xi - 10, yi, 20, 1);
        } else if (t.kind === 'fountain') {
          if (hv < 80) {
            ctx.fillStyle = '#48c8d8';
            ctx.fillRect(xi - 4, yi, 8, 1);
          }
        } else if (t.kind === 'gate') {
          ctx.fillStyle = '#e8d48a';
          ctx.fillRect(xi - 6, yi, 12, 2);
        }
      }
    }
    scene.cubeIso(ctx, 12.2, 13.05, 17.8, 13.22, 1, 1.55, '#c4b49a', '#8a7860', '#6a5848');
    scene.cubeIso(ctx, 16.2, 13.05, 20.6, 13.22, 2, 2.5, '#3c7a58', '#2a4a38', '#1a3a28');
    scene.cubeIso(ctx, 8.2, 13.05, 11.8, 13.22, 2, 2.5, '#d8c8b0', '#8a7860', '#6a5848');
    scene.cubeIso(ctx, 13.1, 3.1, 15.9, 3.35, 2, 3.4, '#e8d48a', '#a88830', '#8a7020');
    scene.cubeIso(ctx, 13.3, 3.15, 15.7, 3.32, 3.35, 3.7, '#f0e0a0', '#8a7020', '#6a5818');
    scene.cubeIso(ctx, 20.15, 6.15, 23.85, 9.85, 2, 4.1, '#c84838', '#8a2018', '#6a1810');
    scene.hipRoof(ctx, 19.9, 5.9, 24.1, 10.1, 4.05, 5.2, '#2a6a48', '#1a4a30', '#163c28');
    scene.cubeIso(ctx, 14.3, 18.2, 14.7, 18.55, 0, 1.6, '#6a3a18', '#3a200c', '#2a1608');
    scene.cubeIso(ctx, 14.2, 18.15, 14.8, 18.6, 1.55, 1.85, '#c84838', '#8a2018', '#6a1810');
  }

  function paintGallery(scene, ctx, map) {
    fillQ(ctx, top(3, 3, 25, 25, 0), '#6a4a30');
    fillQ(ctx, top(12, 5, 17, 23, 0), '#8a2018');
    fillQ(ctx, top(13, 5, 16, 23, 0), '#c4a040');
    fillQ(ctx, top(4, 8, 8, 12, 0), '#b89068');
    fillQ(ctx, top(20, 8, 24, 12, 0), '#b89068');
    fillQ(ctx, top(13, 3, 16, 4, 0), '#c4a040');
    paintFaces(scene, ctx, map);
    const rows = map.length;
    const cols = map[0] ? map[0].length : 0;
    for (let r = 4; r < rows - 3; r++) {
      for (let c = 4; c < cols - 3; c++) {
        const t = map[r][c];
        if (!t || !t.walk) continue;
        const p = iso(c + 0.5, r + 0.5, 0);
        const xi = Math.round(p.x);
        const yi = Math.round(p.y);
        if (t.kind === 'floor' && ((c + r) % 4 === 0)) {
          ctx.fillStyle = '#5a3a22';
          ctx.fillRect(xi - 14, yi, 28, 1);
        }
        if (t.kind === 'carpet') {
          if (c === 12 || c === 16) {
            ctx.fillStyle = '#e8d48a';
            ctx.fillRect(xi - 2, yi, 4, 2);
          } else if (hash(c, r) < 48) {
            ctx.fillStyle = '#e8d48a';
            ctx.fillRect(xi, yi, 2, 2);
          }
        }
      }
    }
  }

  function paintSanctum(scene, ctx, map) {
    fillQ(ctx, top(3, 3, 25, 25, 0), '#5a4030');
    fillQ(ctx, top(10, 7, 18, 14, 1), '#d8c8b0');
    fillQ(ctx, top(12, 8, 16, 12, 1), '#c4b090');
    fillQ(ctx, top(5, 16, 9, 21, 0), '#1a4a60');
    fillQ(ctx, top(19, 16, 23, 21, 0), '#1a4a60');
    fillQ(ctx, top(13, 3, 16, 4, 1), '#c4a040');
    paintFaces(scene, ctx, map);
    scene.cubeIso(ctx, 12.2, 8.2, 15.8, 11.8, 1, 3.6, '#c4c0b6', '#8a8680', '#6a6860');
    scene.cubeIso(ctx, 12.55, 8.55, 15.45, 11.45, 3.55, 4.25, '#e8d48a', '#a88830', '#8a7020');
    scene.plotIso(ctx, 14.0, 10.0, 4.5, '#f8f0c8', 5);
    scene.hipRoof(ctx, 11.6, 7.6, 16.4, 12.4, 4.2, 5.4, '#3a8a58', '#1e5a3c', '#164a30');
    for (let i = 0; i < 8; i++) {
      scene.plotIso(ctx, 6.4 + (i % 3) * 0.7, 17.6 + Math.floor(i / 3) * 0.7, 0.15, '#8ec8d8', 2);
      scene.plotIso(ctx, 20.4 + (i % 3) * 0.7, 17.6 + Math.floor(i / 3) * 0.7, 0.15, '#8ec8d8', 2);
    }
  }

  function paintThrone(scene, ctx, map) {
    fillQ(ctx, top(1, 1, 27, 27, 0), '#140c20');
    fillQ(ctx, top(5, 5, 23, 24, 0), '#243828');
    fillQ(ctx, top(10, 8, 18, 17, 1), '#3a2060');
    fillQ(ctx, top(12, 9, 16, 14, 2), '#4a2878');
    fillQ(ctx, top(6, 6, 9, 9, 0), '#1a1028');
    fillQ(ctx, top(19, 6, 22, 9, 0), '#1a1028');
    paintFaces(scene, ctx, map);
    const rows = map.length;
    const cols = map[0] ? map[0].length : 0;
    for (let r = 5; r < rows - 3; r++) {
      for (let c = 5; c < cols - 3; c++) {
        const t = map[r][c];
        if (!t) continue;
        const p = iso(c + 0.5, r + 0.5, t.h || 0);
        const hv = hash(c, r);
        const xi = Math.round(p.x);
        const yi = Math.round(p.y);
        if (t.kind === 'jade') {
          if (hv < 55) {
            ctx.fillStyle = '#1a3028';
            ctx.fillRect(xi - 7, yi, 14, 1);
          }
          if (hv > 238) {
            ctx.fillStyle = '#6a40a8';
            ctx.fillRect(xi, yi, 3, 2);
          }
        }
        if (t.kind === 'dais' && hv > 190) {
          ctx.fillStyle = '#8a70c0';
          ctx.fillRect(xi, yi, 2, 2);
        }
      }
    }
    scene.cubeIso(ctx, 12.3, 9.3, 15.7, 12.2, 2, 3.8, '#3a2060', '#201038', '#180c28');
    scene.cubeIso(ctx, 12.7, 9.5, 15.3, 10.4, 3.75, 4.5, '#c4a040', '#8a7020', '#6a5818');
    scene.plotIso(ctx, 14.0, 10.0, 4.7, '#e8c070', 4);
  }

  function paintColonnade(scene, ctx, map) {
    fillQ(ctx, top(4, 4, 24, 24, 0), '#2e6a48');
    fillQ(ctx, top(12, 4, 16, 24, 0), '#c4b090');
    fillQ(ctx, top(6, 8, 10, 20, 1), '#d8c8b0');
    fillQ(ctx, top(18, 8, 22, 20, 1), '#d8c8b0');
    fillQ(ctx, top(13, 3, 16, 5, 1), '#c4a040');
    paintFaces(scene, ctx, map);
    [[7, 7], [7, 11], [7, 15], [7, 19], [20, 7], [20, 11], [20, 15], [20, 19]].forEach(function (p) {
      scene.cubeIso(ctx, p[0], p[1], p[0] + 0.45, p[1] + 0.45, 0, 3.4, '#6a3a18', '#3a200c', '#2a1608');
    });
  }

  function paintGarden(scene, ctx, map) {
    fillQ(ctx, top(3, 3, 25, 25, 0), '#246040');
    fillQ(ctx, top(10, 10, 18, 18, 0), '#1a4a60');
    fillQ(ctx, top(12, 12, 16, 16, 0), '#d8c8b0');
    fillQ(ctx, top(13, 4, 16, 24, 0), '#c4b090');
    fillQ(ctx, top(13, 3, 16, 5, 1), '#c4a040');
    paintFaces(scene, ctx, map);
    for (let i = 0; i < 10; i++) {
      scene.plotIso(ctx, 11.2 + (i % 5) * 1.2, 11.2 + Math.floor(i / 5) * 1.4, 0.2, '#8ec8d8', 2);
    }
  }

  function paintLibrary(scene, ctx, map) {
    fillQ(ctx, top(3, 3, 25, 25, 0), '#5a4030');
    fillQ(ctx, top(6, 6, 12, 22, 0), '#c4b090');
    fillQ(ctx, top(16, 6, 22, 22, 0), '#c4b090');
    fillQ(ctx, top(12, 5, 16, 23, 0), '#8a2018');
    fillQ(ctx, top(13, 3, 16, 4, 0), '#c4a040');
    paintFaces(scene, ctx, map);
    [[6, 7], [6, 12], [6, 17], [21, 7], [21, 12], [21, 17]].forEach(function (p) {
      scene.cubeIso(ctx, p[0], p[1], p[0] + 0.5, p[1] + 0.5, 0, 3.2, '#6a3a18', '#3a200c', '#2a1608');
    });
  }

  function paintCrypt(scene, ctx, map) {
    fillQ(ctx, top(1, 1, 27, 27, 0), '#120818');
    fillQ(ctx, top(4, 4, 24, 24, 0), '#1a3028');
    fillQ(ctx, top(6, 6, 11, 11, 0), '#1a1028');
    fillQ(ctx, top(17, 6, 22, 11, 0), '#1a1028');
    fillQ(ctx, top(6, 16, 11, 21, 0), '#1a1028');
    fillQ(ctx, top(17, 16, 22, 21, 0), '#1a1028');
    fillQ(ctx, top(11, 11, 17, 17, 1), '#3a2060');
    fillQ(ctx, top(13, 3, 16, 5, 1), '#c4a040');
    paintFaces(scene, ctx, map);
    scene.cubeIso(ctx, 12.4, 12.4, 15.6, 15.6, 1, 3.2, '#3a2060', '#201038', '#180c28');
    scene.plotIso(ctx, 14.0, 14.0, 3.5, '#8a70c0', 4);
  }

  function paintRoom(scene, ctx, map, id) {
    if (id === 'colonnade') paintColonnade(scene, ctx, map);
    else if (id === 'gallery') paintGallery(scene, ctx, map);
    else if (id === 'garden') paintGarden(scene, ctx, map);
    else if (id === 'library') paintLibrary(scene, ctx, map);
    else if (id === 'sanctum') paintSanctum(scene, ctx, map);
    else if (id === 'crypt') paintCrypt(scene, ctx, map);
    else if (id === 'throne') paintThrone(scene, ctx, map);
    else paintCourt(scene, ctx, map);
  }

  function paintHallOverlay(scene, ctx, id) {
    const woodT = '#6a3a18';
    const woodE = '#3a200c';
    const woodS = '#2a1608';
    const redT = '#c84838';
    const redE = '#8a2018';
    const redS = '#6a1810';
    if (id === 'gallery') {
      scene.cubeIso(ctx, 3, 3, 25, 4.2, 0, 3.6, redT, redE, redS);
      scene.cubeIso(ctx, 3, 3, 4.2, 25, 0, 3.6, redT, redE, redS);
      scene.cubeIso(ctx, 23.8, 3, 25, 25, 0, 3.6, redT, redE, redS);
      [[6, 6], [6, 10], [6, 14], [6, 18], [6, 22], [21, 6], [21, 10], [21, 14], [21, 18], [21, 22]].forEach(function (p) {
        scene.cubeIso(ctx, p[0], p[1], p[0] + 0.4, p[1] + 0.4, 0, 3.4, woodT, woodE, woodS);
      });
      scene.hipRoof(ctx, 2.4, 2.4, 25.6, 25.6, 3.55, 5.2, '#2a6a48', '#1a4a30', '#163c28');
    } else if (id === 'sanctum') {
      scene.cubeIso(ctx, 3, 3, 25, 4.2, 0, 3.8, redT, redE, redS);
      scene.cubeIso(ctx, 3, 3, 4.2, 25, 0, 3.8, redT, redE, redS);
      scene.cubeIso(ctx, 23.8, 3, 25, 25, 0, 3.8, redT, redE, redS);
      [[7, 6], [20, 6], [7, 14], [20, 14]].forEach(function (p) {
        scene.cubeIso(ctx, p[0], p[1], p[0] + 0.45, p[1] + 0.45, 0, 3.6, woodT, woodE, woodS);
      });
      scene.hipRoof(ctx, 2.3, 2.3, 25.7, 25.7, 3.75, 5.5, '#3a8a58', '#1e5a3c', '#164a30');
      scene.hipRoof(ctx, 10.4, 6.4, 17.6, 14.6, 5.3, 6.6, '#4aaa68', '#2a6a48', '#1a4a30');
    } else if (id === 'library') {
      scene.cubeIso(ctx, 3, 3, 25, 4.2, 0, 3.7, redT, redE, redS);
      scene.cubeIso(ctx, 3, 3, 4.2, 25, 0, 3.7, redT, redE, redS);
      scene.cubeIso(ctx, 23.8, 3, 25, 25, 0, 3.7, redT, redE, redS);
      scene.hipRoof(ctx, 2.4, 2.4, 25.6, 25.6, 3.65, 5.3, '#4a3018', '#2a180c', '#1a1008');
    } else if (id === 'crypt') {
      scene.cubeIso(ctx, 3, 3, 25, 4.3, 0, 3.3, '#3a2060', '#201038', '#180c28');
      scene.cubeIso(ctx, 3, 3, 4.3, 25, 0, 3.3, '#3a2060', '#201038', '#180c28');
      scene.cubeIso(ctx, 23.7, 3, 25, 25, 0, 3.3, '#3a2060', '#201038', '#180c28');
      scene.hipRoof(ctx, 4.2, 4.2, 23.8, 23.8, 3.25, 5.1, '#1a1028', '#100818', '#0c0614');
    } else if (id === 'throne') {
      scene.cubeIso(ctx, 3, 3, 25, 4.3, 0, 3.4, '#3a2060', '#201038', '#180c28');
      scene.cubeIso(ctx, 3, 3, 4.3, 25, 0, 3.4, '#3a2060', '#201038', '#180c28');
      scene.cubeIso(ctx, 23.7, 3, 25, 25, 0, 3.4, '#3a2060', '#201038', '#180c28');
      scene.hipRoof(ctx, 4.6, 4.6, 23.4, 23.4, 3.35, 5.4, '#2a1848', '#1a1030', '#140c24');
      scene.hipRoof(ctx, 10.2, 8.0, 17.8, 16.8, 5.2, 6.4, '#3a2060', '#201038', '#180c28');
    }
  }

  root.LiveInst = {
    ENEMIES: ENEMIES,
    SPRITES: SPRITES,
    PAL: PAL,
    order: ['court', 'colonnade', 'gallery', 'garden', 'library', 'sanctum', 'crypt', 'throne'],
    rooms: ROOMS,
    build: build,
    paintRoom: paintRoom,
    paintHallOverlay: paintHallOverlay
  };
})(window);
