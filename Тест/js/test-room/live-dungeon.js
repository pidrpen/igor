/* live-dungeon: данж живого боя на тайлах Kenney «Isometric Miniature Dungeon» (CC0, assets/kenney/).
 * Геометрия 8 залов (каменные комнаты: стены, колонны, провалы, мебель, ворота на север),
 * отрисовка тайлами и модель персонажа в 8 направлениях.
 * Бой, ИИ и переходы не трогает: сетка 28×28, те же клетки walk / gate / exit, те же враги и точки входа (LiveInst). */
(function () {
  'use strict';
  const K = 'assets/kenney/';
  const COLS = 28, ROWS = 28;
  /* координаты картинки Kenney после уменьшения вдвое (128×256): центр верха клетки и ноги модели */
  const TILE_ORIGIN_Y = 214 / 256;
  const FEET_ORIGIN_Y = 229 / 256;
  const DIRS = ['N', 'E', 'S', 'W'];

  const TILES = ['stone', 'stoneTile', 'stoneUneven', 'stoneMissingTiles', 'stoneInset', 'dirt', 'dirtTiles', 'planks', 'planksBroken',
    'stoneWall', 'stoneWallAged', 'stoneWallWindow', 'stoneWallWindowBars', 'stoneWallColumn', 'stoneWallBroken', 'stoneWallHole',
    'stoneWallDoorClosed', 'stoneWallArchway', 'stoneWallGate', 'stoneWallGateBars', 'stoneWallHalf',
    'stoneColumn', 'stoneColumnWood', 'woodenSupports', 'woodenSupportsBeam', 'woodenSupportBeams',
    'barrel', 'barrels', 'barrelsStacked', 'woodenCrate', 'woodenCrates', 'woodenPile', 'chestClosed', 'chestOpen',
    'tableRoundChairs', 'tableShortChairs', 'tableChairsBroken', 'tableRoundItemsChairs', 'chair', 'stoneStep', 'stairs'];

  function preload(scene) {
    TILES.forEach((n) => DIRS.forEach((d) => scene.load.image('kt_' + n + '_' + d, K + 'tiles/' + n + '_' + d + '.png')));
    for (let d = 0; d < 8; d++) {
      scene.load.image('km_' + d + '_idle', K + 'male/' + d + '_idle_00.png');
      for (let i = 0; i < 10; i++) {
        scene.load.image('km_' + d + '_run_' + i, K + 'male/' + d + '_run_' + String(i).padStart(2, '0') + '.png');
        scene.load.image('km_' + d + '_act_' + i, K + 'male/' + d + '_act_' + String(i).padStart(2, '0') + '.png');
      }
    }
  }

  function makeAnims(scene) {
    for (let d = 0; d < 8; d++) {
      if (!scene.anims.exists('km_run_' + d)) {
        scene.anims.create({ key: 'km_run_' + d, frames: [...Array(10).keys()].map((i) => ({ key: 'km_' + d + '_run_' + i })), frameRate: 14, repeat: -1 });
      }
      if (!scene.anims.exists('km_act_' + d)) {
        /* «подобрать» Kenney: присед и рывок рукой — читается как удар / каст */
        scene.anims.create({ key: 'km_act_' + d, frames: [2, 3, 4, 5, 6, 7].map((i) => ({ key: 'km_' + d + '_act_' + i })), frameRate: 16, repeat: 0 });
      }
    }
  }

  /* ── залы ──
   * Комната: пол c 4..23, r 4..23, стены по кругу (r 3 / 24, c 3 / 24), ворота на север r 3, c 13..15.
   * pillars — колонны; props — [имя, c, r, поворот]; pits — провалы [c0, r0, c1, r1); strips — полосы другого пола. */
  /* walls — внутренние стены [c0, r0, c1, r1) (прихожая у входа, ниши, стеллажи, перегородки) */
  const VESTIBULE = [[4, 20, 11, 21], [18, 20, 24, 21]];
  const HALLS = {
    court: {
      floor: 'stone', alt: ['stoneUneven', 'stoneMissingTiles'],
      walls: VESTIBULE.concat([[9, 4, 10, 8], [18, 4, 19, 8]]),
      pillars: [[11, 13], [17, 13], [12, 8], [16, 8]],
      props: [['barrelsStacked', 4, 4, 'S'], ['barrels', 5, 4, 'S'], ['woodenCrate', 4, 6, 'E'], ['barrel', 8, 4, 'S'],
        ['woodenCrates', 23, 4, 'W'], ['chestClosed', 21, 4, 'S'], ['woodenPile', 23, 6, 'W'],
        ['tableShortChairs', 5, 22, 'E'], ['barrel', 23, 23, 'W'], ['barrels', 22, 22, 'W'], ['woodenCrate', 4, 17, 'E']],
      winEvery: 5,
    },
    colonnade: {
      floor: 'stone', alt: ['stoneUneven'],
      walls: VESTIBULE.concat([[4, 7, 6, 8], [4, 12, 6, 13], [22, 7, 24, 8], [22, 12, 24, 13]]),
      pillars: [[7, 7], [7, 11], [7, 15], [7, 19], [20, 7], [20, 11], [20, 15], [20, 19]],
      props: [['barrelsStacked', 4, 4, 'S'], ['barrels', 23, 4, 'S'], ['chestClosed', 4, 10, 'E'], ['woodenCrates', 23, 10, 'W'],
        ['barrel', 4, 17, 'E'], ['woodenPile', 23, 17, 'W'], ['tableRoundChairs', 5, 22, 'E'], ['woodenCrates', 22, 22, 'W']],
      winEvery: 3,
    },
    gallery: {
      floor: 'stone', alt: ['stoneUneven'],
      strips: [['planks', 12, 4, 17, 20]],
      walls: VESTIBULE.concat([[6, 5, 7, 9], [6, 11, 7, 14], [6, 16, 7, 19], [21, 5, 22, 9], [21, 11, 22, 14], [21, 16, 22, 19]]),
      pillars: [[10, 6], [17, 6], [10, 18], [17, 18]],
      props: [['tableRoundChairs', 4, 7, 'E'], ['tableRoundChairs', 23, 7, 'W'], ['barrelsStacked', 4, 4, 'S'], ['chair', 4, 12, 'E'],
        ['chestOpen', 23, 12, 'W'], ['woodenCrates', 4, 17, 'E'], ['barrels', 23, 17, 'W'], ['tableShortChairs', 22, 22, 'W']],
      winEvery: 4,
    },
    garden: {
      floor: 'dirt', alt: ['dirtTiles', 'stoneMissingTiles'],
      walls: VESTIBULE.concat([[7, 6, 11, 7], [17, 6, 21, 7]]),
      supports: [[8, 9], [19, 9], [8, 18], [19, 18], [13, 13], [15, 13]],
      props: [['woodenPile', 4, 4, 'S'], ['barrelsStacked', 23, 4, 'S'], ['barrels', 22, 4, 'S'], ['woodenCrates', 8, 4, 'S'],
        ['woodenCrate', 19, 4, 'S'], ['woodenCrates', 4, 12, 'E'], ['barrel', 23, 14, 'W'], ['woodenPile', 23, 18, 'W'],
        ['chestClosed', 4, 22, 'E'], ['barrels', 23, 22, 'W']],
      winEvery: 0,
    },
    library: {
      floor: 'planks', alt: ['planksBroken'],
      strips: [['stone', 12, 4, 17, 20]],
      walls: VESTIBULE.concat([[4, 6, 9, 7], [19, 6, 24, 7], [4, 13, 8, 14], [20, 13, 24, 14], [4, 17, 8, 18], [20, 17, 24, 18]]),
      pillars: [[11, 6], [16, 6]],
      props: [['tableShortChairs', 6, 9, 'E'], ['tableShortChairs', 21, 9, 'W'], ['tableRoundItemsChairs', 5, 15, 'E'], ['tableRoundItemsChairs', 22, 15, 'W'],
        ['woodenCrates', 4, 4, 'S'], ['woodenCrate', 23, 4, 'S'], ['chestClosed', 23, 22, 'W'], ['chair', 5, 22, 'E'], ['barrel', 8, 4, 'S']],
      winEvery: 3,
    },
    sanctum: {
      floor: 'stone', alt: ['stoneUneven'],
      walls: VESTIBULE.concat([[4, 7, 7, 8], [21, 7, 24, 8]]),
      pillars: [[10, 7], [17, 7], [10, 17], [17, 17]],
      pits: [[4, 15, 7, 19], [21, 15, 24, 19]],
      strips: [['stoneStep', 11, 9, 17, 10], ['stoneInset', 12, 10, 16, 14]],
      props: [['chestClosed', 14, 5, 'S'], ['barrelsStacked', 4, 4, 'S'], ['barrels', 23, 4, 'S'], ['woodenCrates', 4, 12, 'E'], ['barrel', 23, 12, 'W']],
      winEvery: 4,
    },
    crypt: {
      floor: 'stoneUneven', alt: ['stoneMissingTiles', 'stone'],
      walls: VESTIBULE,
      pillars: [[12, 5], [16, 5], [12, 19], [16, 19]],
      pits: [[5, 6, 10, 11], [17, 6, 22, 11], [5, 15, 10, 19], [17, 15, 22, 19]],
      props: [['barrel', 4, 13, 'E'], ['woodenPile', 23, 13, 'W'], ['chestOpen', 14, 13, 'S'], ['barrelsStacked', 4, 4, 'S'], ['woodenCrates', 23, 4, 'S']],
      winEvery: 0,
    },
    throne: {
      floor: 'stone', alt: ['stoneUneven', 'stoneMissingTiles'],
      walls: VESTIBULE.concat([[4, 8, 6, 9], [22, 8, 24, 9], [4, 14, 6, 15], [22, 14, 24, 15]]),
      pillars: [[7, 6], [21, 6], [7, 18], [21, 18], [11, 7], [17, 7]],
      steps: [[11, 4, 18, 6]],
      props: [['chestClosed', 4, 4, 'S'], ['chestClosed', 23, 4, 'S'], ['barrelsStacked', 4, 11, 'E'], ['barrelsStacked', 23, 11, 'W'],
        ['barrels', 4, 17, 'E'], ['woodenCrates', 23, 17, 'W']],
      winEvery: 4,
    },
  };

  function hash(c, r) { return ((c * 73856093) ^ (r * 19349663)) >>> 0; }

  function roomInfo(id) {
    try { return (window.LiveInst && LiveInst.rooms && LiveInst.rooms()[id]) || null; } catch (_) { return null; }
  }

  function build(id, api) {
    const def = HALLS[id] || HALLS.court;
    const cell = (kind, walk, extra) => Object.assign({ kind, h: 0, walk: !!walk }, extra || {});
    const m = [];
    for (let r = 0; r < ROWS; r++) {
      m[r] = [];
      for (let c = 0; c < COLS; c++) {
        const inside = c >= 4 && c <= 23 && r >= 4 && r <= 23;
        const ring = c >= 3 && c <= 24 && r >= 3 && r <= 24;
        if (inside) {
          const h = hash(c, r);
          const ft = (def.alt && def.alt.length && h % 17 === 0) ? def.alt[(h >> 5) % def.alt.length] : def.floor;
          m[r][c] = cell('floor', true, { ft, fd: DIRS[(h >> 3) % 4] });
        } else if (ring) m[r][c] = cell('wall', false);
        else m[r][c] = cell('void', false);
      }
    }
    const inRoom = (c, r) => c >= 4 && c <= 23 && r >= 4 && r <= 23;
    (def.strips || []).forEach(([ft, c0, r0, c1, r1]) => {
      for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) if (inRoom(c, r)) m[r][c].ft = ft;
    });
    (def.steps || []).forEach(([c0, r0, c1, r1]) => {
      for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) if (inRoom(c, r)) m[r][c].ft = 'stoneStep';
    });
    (def.walls || []).forEach(([c0, r0, c1, r1]) => {
      for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) if (inRoom(c, r)) m[r][c] = cell('wall', false);
    });
    (def.pits || []).forEach(([c0, r0, c1, r1]) => {
      for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) if (inRoom(c, r)) m[r][c] = cell('pit', false);
    });
    const solid = (c, r, extra) => { if (inRoom(c, r)) m[r][c] = Object.assign(m[r][c], { walk: false }, extra); };
    (def.pillars || []).forEach(([c, r]) => solid(c, r, { kind: 'pillar', pname: 'stoneColumn', pdir: 'N' }));
    (def.supports || []).forEach(([c, r]) => solid(c, r, { kind: 'pillar', pname: 'stoneColumnWood', pdir: 'N' }));
    (def.props || []).forEach(([n, c, r, d]) => solid(c, r, { kind: 'prop', pname: n, pdir: d || 'N' }));
    /* ворота на север: те же клетки, что ждёт бой (gate → exit после зачистки) */
    for (let c = 13; c <= 15; c++) m[3][c] = cell('gate', false, { ft: def.floor, fd: 'N' });
    /* точки появления врагов и отряда всегда на проходимом полу */
    const info = roomInfo(id) || {};
    const spots = [].concat(info.enemies || [], info.spawnList || [], Object.values(info.spawn || {}));
    spots.forEach((p) => {
      if (!p || p.x == null) return;
      for (let r = Math.floor(p.y - 0.9); r <= Math.floor(p.y + 0.9); r++) {
        for (let c = Math.floor(p.x - 0.9); c <= Math.floor(p.x + 0.9); c++) {
          if (!inRoom(c, r)) continue;
          const t = m[r][c];
          if (!t.walk) m[r][c] = cell('floor', true, { ft: def.floor, fd: DIRS[hash(c, r) % 4] });
        }
      }
    });
    m.hallId = id;
    return m;
  }

  /* ── отрисовка ── */
  const isRoomCell = (t) => t && t.kind !== 'wall' && t.kind !== 'void';

  function render(scene, map, env) {
    const { isoScreen, isoDepth, keep } = env;
    const def = HALLS[map.hallId] || HALLS.court;
    const img = (key, c, r, depth, oy) => {
      const p = isoScreen(c + 0.5, r + 0.5, 0);
      const o = scene.add.image(Math.round(p.x), Math.round(p.y), key);
      o.setOrigin(0.5, oy == null ? TILE_ORIGIN_Y : oy);
      o.setDepth(depth);
      return keep(o);
    };
    const gates = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = map[r][c];
        if (!t) continue;
        /* пол: ниже всех юнитов; ряды дальше от камеры раньше, чтобы торцы плит перекрывали правильно */
        if (t.ft && t.kind !== 'pit') img('kt_' + t.ft + '_' + (t.fd || 'N'), c, r, 2 + (c + r) * 0.01);
        if (t.kind === 'pillar' || t.kind === 'prop') img('kt_' + t.pname + '_' + (t.pdir || 'N'), c, r, isoDepth(c + 0.5, r + 0.5) + 0.3);
        if (t.kind === 'gate' || t.kind === 'exit') {
          const g = img('kt_' + (t.kind === 'exit' ? 'stoneWallGate' : 'stoneWallGateBars') + '_N', c, r, isoDepth(c + 0.5, r + 0.5) - 0.5);
          gates.push(g);
        }
        if (t.kind !== 'wall') continue;
        /* стена на краю клетки, обращённом к комнате. Задние стены (над комнатой) — в полный рост,
           передние (между комнатой и камерой) — низкие, чтобы не прятать героев */
        const h = hash(c, r);
        const back = (d) => {
          let n = 'stoneWall';
          if (def.winEvery && (c + r) % def.winEvery === 0) n = h % 3 === 0 ? 'stoneWallWindowBars' : 'stoneWallWindow';
          else if (h % 11 === 0) n = 'stoneWallColumn';
          else if (h % 13 === 0) n = 'stoneWallAged';
          else if (h % 29 === 0) n = 'stoneWallDoorClosed';
          return 'kt_' + n + '_' + d;
        };
        if (isRoomCell(map[r + 1] && map[r + 1][c]) && map[r + 1][c].kind !== 'gate') img(back('N'), c, r, isoDepth(c + 0.5, r + 0.5));
        if (isRoomCell(map[r][c + 1])) img(back('W'), c, r, isoDepth(c + 0.5, r + 0.5));
        if (r === 24 && isRoomCell(map[r - 1] && map[r - 1][c])) img('kt_stoneWallHalf_S', c, r, isoDepth(c + 0.5, r + 0.5) + 1);
        if (c === 24 && isRoomCell(map[r][c - 1])) img('kt_stoneWallHalf_E', c, r, isoDepth(c + 0.5, r + 0.5) + 1);
        /* внутренний угол: столб, чтобы стены сошлись без щели */
        const diagRoom = isRoomCell(map[r + 1] && map[r + 1][c + 1]) && !isRoomCell(map[r + 1] && map[r + 1][c]) && !isRoomCell(map[r][c + 1]);
        if (diagRoom) img('kt_stoneColumn_N', c, r, isoDepth(c + 0.5, r + 0.5));
      }
    }
    scene._kGates = gates;
  }

  function openGates(scene) {
    (scene._kGates || []).forEach((g) => { if (g && g.setTexture) g.setTexture('kt_stoneWallGate_N'); });
  }

  /* ── модель персонажа ── */
  function dirFromScreen(sx, sy, prev) {
    if (Math.abs(sx) < 0.05 && Math.abs(sy) < 0.05) return prev == null ? 3 : prev;
    const a = Math.atan2(sy, sx) * 180 / Math.PI;
    return ((5 - Math.round(a / 45)) % 8 + 8) % 8;
  }

  function mixToWhite(hex, k) {
    const n = parseInt(String(hex || '#ffffff').replace('#', ''), 16) || 0xffffff;
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (x) => Math.round(x + (255 - x) * k);
    return (f(r) << 16) | (f(g) << 8) | f(b);
  }

  /* Подменяет у спрайта юнита NES-картинки на модель Kenney: любые setTexture / play / setDisplaySize
     из старого кода превращаются в стойку, бег или жест нужного направления и нужного масштаба. */
  function kenneyize(scene, u) {
    const sp = u && u.sprite;
    if (!sp || sp._km || !sp.scene) return;
    sp._km = true;
    const S = Phaser.GameObjects.Sprite.prototype;
    if (u.dir8 == null) u.dir8 = u.side === 'party' ? 7 : 3;
    const size = (u.kit && u.kit.size) || 90;
    const scale = size / 80;
    const enemy = u.side !== 'party' && !u.isPet;
    u._kmTint = 0xffffff;
    if (enemy || u.isPet) {
      u._kmTint = mixToWhite(u.kit && u.kit.color, enemy ? 0.3 : 0.45);
      try {
        if (sp.preFX) { const cm = sp.preFX.addColorMatrix(); cm.grayscale(enemy ? 0.85 : 0.6); cm.brightness(1.25, true); }
      } catch (_) {}
    }
    sp.setDisplaySize = function () { return S.setScale.call(sp, scale); };
    sp.setTexture = function (key, frame) {
      if (!sp.scene) return sp;
      if (!String(key).startsWith('km_')) key = 'km_' + u.dir8 + '_idle';
      return S.setTexture.call(sp, key, frame);
    };
    sp.play = function (key, ignore) {
      if (!sp.scene) return sp;
      const k = typeof key === 'string' ? key : (key && key.key) || '';
      if (!k.startsWith('km_')) key = 'km_act_' + u.dir8;
      S.play.call(sp, key, ignore);
      return S.setScale.call(sp, scale);
    };
    sp.setFlipX = function () { return sp; };
    sp.clearTint = function () { return S.setTint.call(sp, u._kmTint); };
    S.setOrigin.call(sp, 0.5, FEET_ORIGIN_Y);
    S.setFlipX.call(sp, false);
    if (S.stop) S.stop.call(sp);
    S.setTexture.call(sp, 'km_' + u.dir8 + '_idle');
    S.setScale.call(sp, scale);
    S.setTint.call(sp, u._kmTint);
    if (u.shadow && u.shadow.setStrokeStyle) {
      const ring = enemy ? 0xe0524a : Phaser.Display.Color.HexStringToColor((u.kit && u.kit.color) || '#3ecf8e').color;
      u.shadow.setStrokeStyle(2, ring, 0.9);
      u.shadow.setSize(44 * scale, 18 * scale);
    }
  }

  function face(u, sx, sy) { u.dir8 = dirFromScreen(sx, sy, u.dir8); }

  function idle(scene, u) {
    const sp = u && u.sprite;
    if (!sp || !sp.scene) return;
    kenneyize(scene, u);
    if (sp.anims && sp.anims.isPlaying) sp.anims.stop();
    sp.setTexture('km_' + u.dir8 + '_idle');
  }

  function walk(scene, u) {
    if (!u || !u.sprite || !u.sprite.scene) return;
    kenneyize(scene, u);
    const key = 'km_run_' + u.dir8;
    const cur = u.sprite.anims && u.sprite.anims.currentAnim && u.sprite.anims.currentAnim.key;
    if (cur !== key || !u.sprite.anims.isPlaying) u.sprite.play(key);
  }

  window.LiveDungeon = { preload, makeAnims, build, render, openGates, kenneyize, face, idle, walk, HALLS };
})();
