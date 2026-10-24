(function () {
  const W = 1280;
  const H = 720;
  const ASSET = 'assets/';
  const COLS = 28;
  const ROWS = 28;
  /* Данж на тайлах Kenney (live-dungeon.js) — по умолчанию; ?livestyle=pixel — старый пиксельный двор */
  const KENNEY = !!window.LiveDungeon && !/[?&]livestyle=pixel/.test(location.search || '');
  const TW = KENNEY ? 128 : 70;
  const TH = KENNEY ? 64 : 36;
  const HH = KENNEY ? 0 : 22;
  const ORIGIN_X = COLS * (TW / 2) + 56;
  const ORIGIN_Y = 168;
  const WORLD_W = ORIGIN_X + COLS * (TW / 2) + 64;
  const WORLD_H = ORIGIN_Y + (COLS + ROWS) * (TH / 2) + 96;
  let liveGame = null;
  const ALL_KITS = (window.LiveKits && LiveKits.build && LiveKits.build()) || {};
  let partyIds = ((window.LiveKits && LiveKits.PARTY) || ['brew', 'sham', 'unholy']).slice();
  partyIds = partyIds.filter((id) => ALL_KITS[id]);
  if (partyIds.length < 3) partyIds = Object.keys(ALL_KITS).slice(0, 5);
  let playAs = partyIds[0] || 'brew';
  const TURN = 1.2;
  const HOUSE = { c0: 5, r0: 6, c1: 11, r1: 12 };
  const PX = 2;

  function $(id) {
    return document.getElementById('live-' + id) || document.getElementById(id);
  }

  function setHint(text, kind) {
    const el = $('hint');
    if (!el) return;
    el.textContent = text;
    el.className = 'live-hint' + (kind ? ' ' + kind : '');
  }

  function bootError(msg) {
    const el = $('boot-error');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function pad(i) { return String(i).padStart(2, '0'); }

  function isoScreen(wx, wy, h) {
    h = h || 0;
    return {
      x: ORIGIN_X + (wx - wy) * (TW / 2),
      y: ORIGIN_Y + (wx + wy) * (TH / 2) - h * HH
    };
  }

  function isoDepth(wx, wy) {
    return 10 + (wx + wy) * 20;
  }

  function nearFilter() {
    return (Phaser.Textures.FilterMode && Phaser.Textures.FilterMode.NEAREST) || 1;
  }

  function cell(kind, h, walk) {
    return { kind: kind, h: h || 0, walk: !!walk };
  }

  function stamp(m, c0, r0, c1, r1, kind, h, walk) {
    for (let r = r0; r < r1; r++) {
      for (let c = c0; c < c1; c++) {
        if (r < 0 || c < 0 || r >= ROWS || c >= COLS) continue;
        m[r][c] = cell(kind, h, walk);
      }
    }
  }

  function buildWorld(roomId) {
    if (KENNEY) return LiveDungeon.build(roomId || 'court', { cell: cell, COLS: COLS, ROWS: ROWS });
    if (window.LiveInst && LiveInst.build) {
      return LiveInst.build(roomId || 'court', { cell: cell, stamp: stamp, COLS: COLS, ROWS: ROWS, HOUSE: HOUSE });
    }
    const m = [];
    for (let r = 0; r < ROWS; r++) {
      m[r] = [];
      for (let c = 0; c < COLS; c++) m[r][c] = cell('void', 0, false);
    }
    return m;
  }

  function fillPoly(ctx, pts, color) {
    const n = pts.length;
    let minY = pts[0].y;
    let maxY = pts[0].y;
    for (let i = 1; i < n; i++) {
      if (pts[i].y < minY) minY = pts[i].y;
      if (pts[i].y > maxY) maxY = pts[i].y;
    }
    ctx.fillStyle = color;
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const ys = y + 0.5;
      const xs = [];
      for (let i = 0; i < n; i++) {
        const p = pts[i];
        const q = pts[(i + 1) % n];
        if ((p.y < ys && q.y >= ys) || (q.y < ys && p.y >= ys)) {
          xs.push(p.x + (ys - p.y) * (q.x - p.x) / (q.y - p.y));
        }
      }
      if (xs.length < 2) continue;
      xs.sort(function (a, b) { return a - b; });
      const x0 = Math.round(xs[0]);
      const x1 = Math.round(xs[xs.length - 1]);
      if (x1 > x0) ctx.fillRect(x0, y, x1 - x0, 1);
    }
  }

  function fillQuad(ctx, pts, color) {
    fillPoly(ctx, pts, color);
  }

  function isoTop(c0, r0, c1, r1, h) {
    return [
      isoScreen(c0, r0, h),
      isoScreen(c1, r0, h),
      isoScreen(c1, r1, h),
      isoScreen(c0, r1, h)
    ];
  }

  window.LiveIso = { isoScreen: isoScreen, isoTop: isoTop, fillQuad: fillQuad, fillPoly: fillPoly };

  function inHouse(x, y, house) {
    if (!house) return false;
    return x >= house.c0 + 0.15 && x < house.c1 - 0.15 && y >= house.r0 + 0.15 && y < house.r1 - 0.15;
  }

  class LiveScene extends Phaser.Scene {
    constructor() {
      super('live');
    }

    preload() {
      this.failedLoads = [];
      this.load.imageLoadType = 'HTMLImageElement';
      this.load.on('loaderror', (file) => {
        const k = (file && file.key) || '';
        if (/_front|_back|ghoul_|nes_|coil_skull|riptide_bolt|flame_orb|heal_spark|dnd_pool|plague_cloud|arrow|slash|war_|pal_|hunt_|rog_|pri_|mage_|lock_|dru_|eng_|dh_/.test(k)) return;
        this.failedLoads.push(k || '?');
      });
      if (KENNEY) LiveDungeon.preload(this);
      const fx = ASSET + 'sprites/fx/';
      this.load.image('keg_fly', fx + 'keg_fly.png');
      this.load.image('fire_jet', fx + 'fire_jet.png');
      this.load.image('fire_burst', fx + 'fire_burst.png');
      this.load.image('frostbolt', fx + 'frostbolt.png');

      const monk = ASSET + 'sprites/characters/monk_brew_nes/';
      this.load.image('brew_idle', monk + 'idle_00.png');
      this.load.image('brew_idle_front', monk + 'idle_front_00.png');
      this.load.image('brew_idle_back', monk + 'idle_back_00.png');
      for (let i = 0; i < 5; i++) {
        this.load.image('brew_jab_' + pad(i), monk + 'jab_' + pad(i) + '.png');
        this.load.image('brew_keg_' + pad(i), monk + 'keg_' + pad(i) + '.png');
        this.load.image('brew_jab_front_' + pad(i), monk + 'jab_front_' + pad(i) + '.png');
        this.load.image('brew_jab_back_' + pad(i), monk + 'jab_back_' + pad(i) + '.png');
      }
      for (let i = 0; i < 4; i++) {
        this.load.image('brew_walk_' + pad(i), monk + 'walk_' + pad(i) + '.png');
        this.load.image('brew_walk_front_' + pad(i), monk + 'walk_front_' + pad(i) + '.png');
        this.load.image('brew_walk_back_' + pad(i), monk + 'walk_back_' + pad(i) + '.png');
      }
      for (let i = 0; i < 3; i++) this.load.image('brew_breath_' + pad(i), monk + 'breath_' + pad(i) + '.png');
      for (let i = 0; i < 4; i++) this.load.image('brew_kick_' + pad(i), monk + 'kick_' + pad(i) + '.png');

      const dk = ASSET + 'sprites/characters/dk_unholy_nes/';
      this.load.image('dk_idle', dk + 'idle_00.png');
      this.load.image('dk_idle_front', dk + 'idle_front_00.png');
      this.load.image('dk_idle_back', dk + 'idle_back_00.png');
      ['attack', 'skill_coil', 'skill_nova'].forEach((name) => {
        const key = name === 'attack' ? 'dk_attack' : 'dk_' + name.replace('skill_', '');
        for (let i = 0; i < 6; i++) this.load.image(key + '_' + pad(i), dk + name + '_' + pad(i) + '.png');
      });
      for (let i = 0; i < 4; i++) {
        this.load.image('dk_walk_' + pad(i), dk + 'walk_' + pad(i) + '.png');
        this.load.image('dk_walk_front_' + pad(i), dk + 'walk_front_' + pad(i) + '.png');
        this.load.image('dk_walk_back_' + pad(i), dk + 'walk_back_' + pad(i) + '.png');
      }

      const gh = ASSET + 'sprites/characters/dk_ghoul_nes/';
      this.load.image('ghoul_idle', gh + 'idle_00.png');
      this.load.image('ghoul_dark', gh + 'dark_00.png');
      for (let i = 0; i < 4; i++) {
        this.load.image('ghoul_walk_' + pad(i), gh + 'walk_' + pad(i) + '.png');
        this.load.image('ghoul_atk_' + pad(i), gh + 'atk_' + pad(i) + '.png');
      }

      const mobs = ASSET + 'sprites/characters/live_mobs/';
      ['assassin', 'healer', 'archer', 'brute'].forEach((id) => {
        this.load.image('nes_' + id, mobs + id + '_idle_00.png');
      });
      for (let i = 0; i < 3; i++) this.load.image('nes_assassin_atk_' + pad(i), mobs + 'assassin_atk_' + pad(i) + '.png');

      const fx2 = ASSET + 'sprites/fx/';
      ['coil_skull', 'riptide_bolt', 'flame_orb', 'heal_spark', 'dnd_pool', 'plague_cloud', 'arrow', 'slash'].forEach((k) => {
        this.load.image(k, fx2 + k + '.png');
      });

      const sham = ASSET + 'sprites/characters/shaman_resto_nes/';
      this.load.image('sham_idle', sham + 'idle_00.png');
      this.load.image('sham_idle_front', sham + 'idle_front_00.png');
      this.load.image('sham_idle_back', sham + 'idle_back_00.png');
      ['attack', 'skill_flame_shock', 'skill_riptide', 'skill_hw'].forEach((name) => {
        const key = name === 'attack' ? 'sham_attack' : 'sham_' + (name === 'skill_flame_shock' ? 'flame' : name.replace('skill_', ''));
        for (let i = 0; i < 6; i++) this.load.image(key + '_' + pad(i), sham + name + '_' + pad(i) + '.png');
      });
      for (let i = 0; i < 4; i++) {
        this.load.image('sham_walk_' + pad(i), sham + 'walk_' + pad(i) + '.png');
        this.load.image('sham_walk_front_' + pad(i), sham + 'walk_front_' + pad(i) + '.png');
        this.load.image('sham_walk_back_' + pad(i), sham + 'walk_back_' + pad(i) + '.png');
      }

      const nes = (window.LiveKits && LiveKits.NES) || {};
      Object.keys(nes).forEach((cls) => {
        if (cls === 'monk' || cls === 'shaman' || cls === 'deathknight') return;
        const pack = nes[cls];
        const base = ASSET + 'sprites/characters/' + pack.folder + '/';
        const pre = pack.prefix;
        this.load.image(pre + '_idle', base + 'idle_00.png');
        this.load.image(pre + '_idle_front', base + 'idle_front_00.png');
        this.load.image(pre + '_idle_back', base + 'idle_back_00.png');
        for (let i = 0; i < 4; i++) {
          this.load.image(pre + '_walk_' + pad(i), base + 'walk_' + pad(i) + '.png');
          this.load.image(pre + '_walk_front_' + pad(i), base + 'walk_front_' + pad(i) + '.png');
          this.load.image(pre + '_walk_back_' + pad(i), base + 'walk_back_' + pad(i) + '.png');
        }
        for (let i = 0; i < 6; i++) this.load.image(pre + '_attack_' + pad(i), base + 'attack_' + pad(i) + '.png');
      });
    }

    texOk(key) {
      if (!this.textures.exists(key)) return false;
      const t = this.textures.get(key);
      if (!t || t.key === '__MISSING') return false;
      try {
        const img = t.getSourceImage && t.getSourceImage();
        if (!img || img.width < 40) return false;
      } catch (_) { return false; }
      return true;
    }

    makeAnim(key, frames, fps, loop) {
      if (this.anims.exists(key)) this.anims.remove(key);
      const ok = frames.filter((k) => this.texOk(k));
      if (!ok.length) return;
      this.anims.create({
        key: key,
        frames: ok.map((k) => ({ key: k })),
        frameRate: fps,
        repeat: loop ? -1 : 0
      });
    }

    ensureCanvas(key, w, h) {
      if (this.textures.exists(key)) this.textures.remove(key);
      const tex = this.textures.createCanvas(key, w, h);
      const ctx = tex.getContext();
      ctx.imageSmoothingEnabled = false;
      return tex;
    }

    blitPixels(ctx, ox, oy, rows, pal) {
      for (let j = 0; j < rows.length; j++) {
        const row = rows[j];
        for (let i = 0; i < row.length; i++) {
          const col = pal[row[i]];
          if (!col) continue;
          ctx.fillStyle = col;
          ctx.fillRect(ox + i * PX, oy + j * PX, PX, PX);
        }
      }
    }

    bakePixels(key, rows, pal, pad) {
      pad = pad || 2;
      let w = 0;
      for (let i = 0; i < rows.length; i++) if (rows[i].length > w) w = rows[i].length;
      const tw = w * PX + pad * 2;
      const th = rows.length * PX + pad * 2;
      const tex = this.ensureCanvas(key, tw, th);
      this.blitPixels(tex.getContext(), pad, pad, rows, pal);
      tex.refresh();
      tex.setFilter(nearFilter());
    }

    cubeIso(ctx, c0, r0, c1, r1, h0, h1, top, east, south) {
      fillPoly(ctx, [
        isoScreen(c1, r0, h1), isoScreen(c1, r1, h1),
        isoScreen(c1, r1, h0), isoScreen(c1, r0, h0)
      ], east);
      fillPoly(ctx, [
        isoScreen(c0, r1, h1), isoScreen(c1, r1, h1),
        isoScreen(c1, r1, h0), isoScreen(c0, r1, h0)
      ], south);
      fillPoly(ctx, isoTop(c0, r0, c1, r1, h1), top);
    }

    hipRoof(ctx, c0, r0, c1, r1, hEave, hPeak, tile, shadeE, shadeS) {
      const cx = (c0 + c1) / 2;
      const cy = (r0 + r1) / 2;
      const pk = isoScreen(cx, cy, hPeak);
      const nw = isoScreen(c0, r0, hEave);
      const ne = isoScreen(c1, r0, hEave);
      const se = isoScreen(c1, r1, hEave);
      const sw = isoScreen(c0, r1, hEave);
      fillPoly(ctx, [
        isoScreen(c1, r0, hEave), isoScreen(c1, r1, hEave),
        isoScreen(c1, r1, hEave - 0.18), isoScreen(c1, r0, hEave - 0.18)
      ], '#5a1008');
      fillPoly(ctx, [
        isoScreen(c0, r1, hEave), isoScreen(c1, r1, hEave),
        isoScreen(c1, r1, hEave - 0.18), isoScreen(c0, r1, hEave - 0.18)
      ], '#4a0c08');
      fillPoly(ctx, [pk, nw, ne], tile);
      fillPoly(ctx, [pk, ne, se], shadeE);
      fillPoly(ctx, [pk, se, sw], shadeS);
      fillPoly(ctx, [pk, sw, nw], tile);
    }

    plotIso(ctx, wx, wy, h, color, rad) {
      const p = isoScreen(wx, wy, h);
      const xi = Math.round(p.x);
      const yi = Math.round(p.y);
      ctx.fillStyle = color;
      for (let dy = -rad; dy <= rad; dy++) {
        for (let dx = -rad; dx <= rad; dx++) {
          if (dx * dx + dy * dy <= rad * rad + rad) ctx.fillRect(xi + dx, yi + dy, 1, 1);
        }
      }
    }

    paintPavOn(ctx, layer) {
      const C0 = HOUSE.c0;
      const R0 = HOUSE.r0;
      const C1 = HOUSE.c1;
      const R1 = HOUSE.r1;
      const h0 = 1;
      const h1 = h0 + 3.15;
      const cube = (a, b, c, d, z0, z1, t, e, s) => this.cubeIso(ctx, a, b, c, d, z0, z1, t, e, s);
      const wc = '#d05648';
      const we = '#8a3028';
      const ws = '#6a2018';
      const woodT = '#6a3a18';
      const woodE = '#3a200c';
      const woodS = '#2a1608';
      const goldT = '#e8d48a';
      const goldE = '#a88830';
      const goldS = '#8a7020';
      if (layer === 'back') {
        cube(C0 - 0.2, R0 - 0.2, C1 + 0.2, R1 + 0.2, h0 - 0.25, h0, '#c4b49a', '#8a7860', '#6a5848');
        cube(C0 + 0.14, R0 + 0.14, C1 - 0.14, R0 + 0.34, h0, h1, wc, we, ws);
        cube(C0 + 0.14, R0 + 0.14, C0 + 0.34, R1 - 0.14, h0, h1, wc, we, ws);
        cube(C0 + 0.05, R0 + 0.05, C1 - 0.05, R0 + 0.24, h1 - 0.18, h1 + 0.08, woodT, woodE, woodS);
        cube(C0 + 0.05, R0 + 0.05, C0 + 0.24, R1 - 0.05, h1 - 0.18, h1 + 0.08, woodT, woodE, woodS);
        [[C0, R0], [C1 - 0.22, R0], [C0, R1 - 0.22]].forEach((p) => {
          cube(p[0], p[1], p[0] + 0.22, p[1] + 0.22, h0, h1 + 0.1, woodT, woodE, woodS);
          cube(p[0] - 0.04, p[1] - 0.04, p[0] + 0.26, p[1] + 0.26, h1 - 0.08, h1 + 0.16, goldT, goldE, goldS);
        });
      }
      if (layer === 'front') {
        const mid = (C0 + C1) / 2;
        cube(mid - 1.2, R1 + 0.05, mid + 1.2, R1 + 0.4, h0 - 0.12, h0 + 0.02, '#b8a888', '#7a6a58', '#5a4a3a');
        cube(C1 - 0.34, R0 + 0.14, C1 - 0.14, R1 - 0.14, h0, h1, wc, we, ws);
        cube(C1 - 0.2, R0 + 1.55, C1 - 0.12, R0 + 3.05, h0 + 0.85, h0 + 2.25, goldT, '#3a2010', '#2a1808');
        cube(C1 - 0.18, R0 + 1.7, C1 - 0.13, R0 + 2.9, h0 + 1.0, h0 + 2.1, '#f0e8c0', '#5a4030', '#4a3020');
        cube(C0 + 0.14, R1 - 0.34, mid - 0.12, R1 - 0.14, h0, h1, wc, we, ws);
        cube(mid + 0.12, R1 - 0.34, C1 - 0.14, R1 - 0.14, h0, h1, wc, we, ws);
        cube(C0 + 0.4, R1 - 0.18, C0 + 1.05, R1 - 0.1, h0 + 1.0, h0 + 2.05, goldT, '#3a2010', '#2a1808');
        cube(C1 - 1.05, R1 - 0.18, C1 - 0.4, R1 - 0.1, h0 + 1.0, h0 + 2.05, goldT, '#3a2010', '#2a1808');
        cube(mid - 1.15, R1 - 0.36, mid + 1.15, R1 - 0.08, h1 - 0.55, h1 - 0.08, goldT, goldE, goldS);
        cube(mid - 1.05, R1 - 0.28, mid - 0.04, R1 - 0.1, h0, h1 - 0.58, '#4a2a14', woodE, '#1a1008');
        cube(mid + 0.04, R1 - 0.28, mid + 1.05, R1 - 0.1, h0, h1 - 0.58, '#5a3418', woodE, '#1a1008');
        this.plotIso(ctx, mid - 0.55, R1 - 0.14, h0 + 1.15, goldT, 2);
        this.plotIso(ctx, mid + 0.55, R1 - 0.14, h0 + 1.15, goldT, 2);
        cube(C1 - 0.24, R0 + 0.05, C1 - 0.05, R1 - 0.05, h1 - 0.18, h1 + 0.08, woodT, woodE, woodS);
        cube(C0 + 0.05, R1 - 0.24, C1 - 0.05, R1 - 0.05, h1 - 0.18, h1 + 0.08, woodT, woodE, woodS);
        cube(C1 - 0.22, R1 - 0.22, C1, R1, h0, h1 + 0.1, woodT, woodE, woodS);
        cube(C1 - 0.26, R1 - 0.26, C1 + 0.04, R1 + 0.04, h1 - 0.08, h1 + 0.16, goldT, goldE, goldS);
      }
      if (layer === 'roof') {
        const o = 0.58;
        this.hipRoof(ctx, C0 - o, R0 - o, C1 + o, R1 + o, h1 + 0.12, h1 + 1.15, '#3a8a58', '#1e5a3c', '#164a30');
        const o2 = 0.7;
        this.hipRoof(ctx, C0 + o2, R0 + o2, C1 - o2, R1 - o2, h1 + 1.05, h1 + 1.95, '#4aaa68', '#2a6a48', '#1a4a30');
        const cx = (C0 + C1) / 2;
        fillPoly(ctx, [
          isoScreen(cx - 0.07, R0 + o2, h1 + 1.9),
          isoScreen(cx + 0.07, R0 + o2, h1 + 1.9),
          isoScreen(cx + 0.07, R1 - o2, h1 + 1.9),
          isoScreen(cx - 0.07, R1 - o2, h1 + 1.9)
        ], goldT);
        this.plotIso(ctx, cx, R0 + o2, h1 + 2.02, '#f0e0a0', 3);
        this.plotIso(ctx, cx, R1 - o2, h1 + 2.02, '#f0e0a0', 3);
        this.plotIso(ctx, cx, (R0 + R1) / 2, h1 + 2.12, '#f8f0c8', 4);
        [[C0 - o, R0 - o], [C1 + o, R0 - o], [C1 + o, R1 + o], [C0 - o, R1 + o]].forEach((p) => {
          this.plotIso(ctx, p[0], p[1], h1 + 0.28, goldT, 2);
        });
      }
    }

    bakePav() {
      ['back', 'front', 'roof'].forEach((layer) => {
        const tex = this.ensureCanvas('iso_pav_' + layer, WORLD_W, WORLD_H);
        const ctx = tex.getContext();
        ctx.clearRect(0, 0, W, H);
        this.paintPavOn(ctx, layer);
        tex.refresh();
        tex.setFilter(nearFilter());
      });
    }

    cubeLocal(ctx, cx, topY, hPx, top, left, right) {
      const n = { x: cx, y: topY - TH / 2 };
      const e = { x: cx + TW / 2, y: topY };
      const s = { x: cx, y: topY + TH / 2 };
      const w = { x: cx - TW / 2, y: topY };
      const nb = { x: n.x, y: n.y + hPx };
      const eb = { x: e.x, y: e.y + hPx };
      const sb = { x: s.x, y: s.y + hPx };
      const wb = { x: w.x, y: w.y + hPx };
      fillQuad(ctx, [e, s, sb, eb], right);
      fillQuad(ctx, [w, s, sb, wb], left);
      fillQuad(ctx, [n, e, s, w], top);
    }

    makeTileTextures() {
      const near = nearFilter();
      this.bakePixels('iso_lion', [
        '..........LLLLLL..........',
        '........LLWWWWWWLL........',
        '.......LWWMMMMMMWWL.......',
        '......LWMMMLMMMMLMWL......',
        '......LWMMKMMMMKMMWL......',
        '......LWMMMGMMGMMMWL......',
        '.....LWWMMMMMMMMMMWWL.....',
        '....LWWMMMMMMMMMMMMWWL....',
        '...LWWMMMMMMMMMMMMMMWWL...',
        '...LWMMMMWWWWWWMMMMMMWL...',
        '..LWMMMWWWWWWWWWWMMMMWL...',
        '..LWMMMWWWKKKKWWWMMMMWL...',
        '..LWMMMMWWWWWWWWWMMMMWL...',
        '..LWWMMMMMMMMMMMMMMMWWL...',
        '...LWWMMMMMMMMMMMMWWL.....',
        '....LLWMMMMMMMMMMWLL......',
        '....DMLWWMMMMMMWWLMD......',
        '...DMMLLLWWWWWWLLLMMD.....',
        '....DMMDL......LDMMD......',
        '....DMMD........DMMD......',
        '....DMD..........DMD......',
        '...DMD............DMD.....',
        '...DD..............DD.....',
        '...D................D.....'
      ], {
        D: '#4a4840', M: '#8a8680', L: '#c4c0b6', W: '#e8e4dc',
        K: '#1c1a16', G: '#c4a040'
      });
      this.bakePixels('iso_tree', [
        '............DDD............',
        '...........DYYYD...........',
        '..........DYYYYYD..........',
        '.........DDYYYYYDD.........',
        '........DDYYYYYYYDD........',
        '.......DDDYYYYYYYDDD.......',
        '......DDDYYYYYYYYYDDD......',
        '.....DDDDYYYYYYYYYDDDD.....',
        '......DDDYYYYYYYYYDDD......',
        '.....DDDDYYYYYYYYYDDDD.....',
        '....DDDDDYYYYYYYYYDDDDD....',
        '...DDDDDDYYYYYYYYYDDDDDD...',
        '....DDDDDYYYYYYYYYDDDDD....',
        '...DDDDDDYYYYYYYYYDDDDDD...',
        '..DDDDDDDYYYYYYYYYDDDDDDD..',
        '...DDDDDDYYYYYYYYYDDDDDD...',
        '........NNNNNNNNNNN........',
        '.........NNBBBBBBNN........',
        '.........NNNNNNNNNN........',
        '.........NNBBBBBBNN........',
        '.........NNNNNNNNNN........',
        '.........NNBBBBBBNN........',
        '.........NNNNNNNNNN........'
      ], {
        D: '#1a4a28', Y: '#2e7a38', N: '#5a3818', B: '#3a2408'
      });
      this.bakePixels('iso_lantern', [
        '...SSSSSSS...',
        '..SSHHHHHSS..',
        '..SHYYYYYHS..',
        '..SHYOOOYHS..',
        '..SHYYYYYHS..',
        '..SHHHHHHHS..',
        '...SSSSSSS...',
        '.....PP......',
        '.....PP......',
        '.....PP......',
        '.....PP......',
        '.....PP......',
        '....SSSS.....',
        '...SSSSSS....'
      ], {
        S: '#6a6860', H: '#9a9890', Y: '#f0c848', O: '#f8e070', P: '#4a3018'
      });

      const fw = 92;
      const fh = 78;
      const ftex = this.ensureCanvas('iso_fountain', fw, fh);
      const fctx = ftex.getContext();
      this.cubeLocal(fctx, 46, 40, 18, '#3a8a78', '#1a4a40', '#2a6a58');
      fillQuad(fctx, [
        { x: 46, y: 28 },
        { x: 70, y: 40 },
        { x: 46, y: 52 },
        { x: 22, y: 40 }
      ], '#48c8d8');
      fillQuad(fctx, [
        { x: 46, y: 32 },
        { x: 62, y: 40 },
        { x: 46, y: 48 },
        { x: 30, y: 40 }
      ], '#7aeeff');
      fctx.fillStyle = '#e8ffff';
      fctx.fillRect(44, 8, 4, 24);
      fctx.fillStyle = '#7aeeff';
      fctx.fillRect(40, 14, 4, 4);
      fctx.fillRect(48, 18, 4, 4);
      fctx.fillRect(36, 22, 4, 4);
      fctx.fillRect(52, 12, 4, 4);
      ftex.refresh();
      ftex.setFilter(near);
      this.bakePav();
      this.bakePixels('iso_pillar', [
        '..HHHH..',
        '.HNNNNH.',
        '.HNNNNH.',
        '.HDDDDH.',
        '.HDDDDH.',
        '.HDDDDH.',
        '.HDDDDH.',
        '.HDDDDH.',
        '.HDDDDH.',
        '.DDDDDD.'
      ], { H: '#8a6840', N: '#c4a070', D: '#4a3018' }, 8);
      if (window.LiveInst && LiveInst.ENEMIES) {
        Object.keys(LiveInst.ENEMIES).forEach((id) => {
          const rows = (LiveInst.SPRITES && (LiveInst.SPRITES[id] || LiveInst.SPRITES.disciple)) || null;
          const pal = (LiveInst.PAL && (LiveInst.PAL[id] || LiveInst.PAL.disciple)) || null;
          if (rows && pal) this.bakePixels('mob_' + id, rows, pal, 8);
        });
      }
    }

    topColor(kind) {
      if (kind === 'water') return '#1a4a60';
      if (kind === 'plaza' || kind === 'lion') return '#c4b090';
      if (kind === 'pale') return '#d8c8b0';
      if (kind === 'jade') return '#3c7a58';
      if (kind === 'stairs') return '#c8b898';
      if (kind === 'floor') return '#b89068';
      if (kind === 'door') return '#6a4a30';
      if (kind === 'fountain') return '#2a6a68';
      if (kind === 'wall') return '#c85848';
      if (kind === 'carpet') return '#8a2018';
      if (kind === 'dais') return '#d8c8b0';
      if (kind === 'gate' || kind === 'exit') return '#c4a040';
      if (kind === 'pillar') return '#6a3a18';
      if (kind === 'statue') return '#c4c0b6';
      return '#c4b090';
    }

    faceColors(kind) {
      if (kind === 'jade') return { e: '#3a6a50', s: '#2a4a38' };
      if (kind === 'wall') return { e: '#8a3028', s: '#6a2018' };
      if (kind === 'pillar') return { e: '#3a200c', s: '#2a1608' };
      if (kind === 'dais' || kind === 'statue') return { e: '#8a7860', s: '#6a5848' };
      if (kind === 'gate' || kind === 'exit') return { e: '#a88830', s: '#8a7020' };
      if (kind === 'stairs' || kind === 'pale' || kind === 'floor' || kind === 'door' || kind === 'carpet') {
        return { e: '#8a7860', s: '#6a5848' };
      }
      return { e: '#8a7860', s: '#6a5848' };
    }

    paintGround() {
      const tex = this.ensureCanvas('arena_ground', WORLD_W, WORLD_H);
      const ctx = tex.getContext();
      ctx.fillStyle = '#120c18';
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      const skyH = Math.min(WORLD_H, ORIGIN_Y + 90);
      for (let y = 0; y < skyH; y++) {
        const t = y / skyH;
        let r;
        let g;
        let b;
        if (t < 0.22) {
          const k = t / 0.22;
          r = 26 + k * 40;
          g = 16 + k * 8;
          b = 40 + k * 16;
        } else if (t < 0.38) {
          const k = (t - 0.22) / 0.16;
          r = 66 + k * 130;
          g = 24 + k * 50;
          b = 56 + k * 8;
        } else {
          const k = Math.min(1, (t - 0.38) / 0.4);
          r = 22 + k * 8;
          g = 14 + k * 6;
          b = 28 + k * 10;
        }
        ctx.fillStyle = 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
        ctx.fillRect(0, y, WORLD_W, 1);
      }
      ctx.fillStyle = '#f0e8c8';
      const sunX = ORIGIN_X + 380;
      ctx.fillRect(sunX, 44, 22, 22);
      ctx.fillRect(sunX - 6, 50, 34, 12);
      ctx.fillRect(sunX + 6, 38, 12, 34);
      ctx.fillStyle = '#d8d0a0';
      ctx.fillRect(sunX + 8, 50, 8, 8);
      ctx.fillStyle = '#e8dcc0';
      for (let i = 0; i < 36; i++) {
        ctx.fillRect((i * 97 + 40) % WORLD_W, 10 + ((i * 23) % 90), 2, 2);
      }

      const map = this.map;
      if (window.LiveInst && LiveInst.paintRoom) LiveInst.paintRoom(this, ctx, map, this.roomId || 'court');
      tex.refresh();
      tex.setFilter(nearFilter());
    }

    cellAt(x, y) {
      const c = Math.floor(x);
      const r = Math.floor(y);
      if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return cell('void', 0, false);
      return this.map[r][c];
    }

    heightAt(x, y) {
      return this.cellAt(x, y).h || 0;
    }

    isSolid(c, r, fromH) {
      if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return true;
      const t = this.map[r][c];
      if (!t.walk) return true;
      if (Math.abs((t.h || 0) - fromH) > 1) return true;
      return false;
    }

    putProp(c, r, key, originY, extraDepth) {
      const t = this.map[r] && this.map[r][c];
      const h = (t && t.h) || 0;
      const p = isoScreen(c + 0.5, r + 0.5, h);
      const img = this.add.image(Math.round(p.x), Math.round(p.y), key);
      img.setOrigin(0.5, originY == null ? 0.92 : originY);
      img.setDepth(isoDepth(c + 0.5, r + 0.5) + (extraDepth || 0));
      return this.keepBit(img);
    }

    keepBit(o) {
      if (!this.worldBits) this.worldBits = [];
      this.worldBits.push(o);
      return o;
    }

    clearWorld() {
      (this.worldBits || []).forEach((o) => { if (o && o.destroy) o.destroy(); });
      this.worldBits = [];
      this.houseWalls = [];
      this.houseRoof = null;
    }

    currentRoom() {
      if (!window.LiveInst) return { id: 'court', name: 'Нефритовый двор', idx: 1, next: null, spawn: {}, house: HOUSE, exits: [], enemies: [] };
      return LiveInst.rooms()[this.roomId || 'court'];
    }

    bakeHall(id) {
      ['back', 'front', 'roof'].forEach((layer) => {
        const tex = this.ensureCanvas('iso_hall_' + layer, WORLD_W, WORLD_H);
        const ctx = tex.getContext();
        ctx.clearRect(0, 0, WORLD_W, WORLD_H);
        if (layer === 'roof' && window.LiveInst) LiveInst.paintHallOverlay(this, ctx, id);
        tex.refresh();
        tex.setFilter(nearFilter());
      });
    }

    drawMap() {
      if (KENNEY) {
        const kroom = this.currentRoom();
        this.clearWorld();
        this.house = null;
        this.houseRoof = null;
        this.map = buildWorld(kroom.id);
        LiveDungeon.render(this, this.map, { isoScreen: isoScreen, isoDepth: isoDepth, keep: (o) => this.keepBit(o) });
        if (!this.hover) this.hover = this.add.graphics();
        this._houseOpen = false;
        return;
      }
      const room = this.currentRoom();
      this.house = room.house || null;
      this.clearWorld();
      this.map = buildWorld(room.id);
      this.paintGround();
      if (!this.hover) this.hover = this.add.graphics();
      const ground = this.add.image(0, 0, 'arena_ground');
      ground.setOrigin(0, 0);
      ground.setDepth(1);
      this.keepBit(ground);
      this.houseWalls = [];
      if (room.id === 'court') {
        const pavBack = this.add.image(0, 0, 'iso_pav_back');
        pavBack.setOrigin(0, 0);
        pavBack.setDepth(isoDepth(HOUSE.c0 + 1, HOUSE.r0 + 1));
        const pavFront = this.add.image(0, 0, 'iso_pav_front');
        pavFront.setOrigin(0, 0);
        pavFront.setDepth(isoDepth((HOUSE.c0 + HOUSE.c1) / 2, HOUSE.r1 - 0.6));
        this.houseRoof = this.add.image(0, 0, 'iso_pav_roof');
        this.houseRoof.setOrigin(0, 0);
        this.houseRoof.setDepth(isoDepth(HOUSE.c1, HOUSE.r1) + 6);
        this.houseWalls.push(pavBack, pavFront);
        this.keepBit(pavBack);
        this.keepBit(pavFront);
        this.keepBit(this.houseRoof);
      } else if (room.id !== 'colonnade' && room.id !== 'garden') {
        this.bakeHall(room.id);
        const hall = this.add.image(0, 0, 'iso_hall_roof');
        hall.setOrigin(0, 0);
        hall.setDepth(isoDepth(8, 8) + 2);
        hall.setAlpha(0.22);
        this.houseRoof = hall;
        this.keepBit(hall);
      }
      let fx = 0;
      let fy = 0;
      let fn = 0;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = this.map[r][c];
          if (!t) continue;
          if (t.kind === 'fountain') { fx += c + 0.5; fy += r + 0.5; fn += 1; }
          if (t.kind === 'pillar' || t.prop === 'pillar') this.putProp(c, r, 'iso_pillar', 0.92, 0.55);
          else if (t.prop === 'lion') {
            const lion = this.putProp(c, r, 'iso_lion', 0.92, 0.5);
            if (c > COLS / 2) lion.setFlipX(true);
          } else if (t.prop === 'tree') this.putProp(c, r, 'iso_tree', 0.92, 0.55);
          else if (t.prop === 'lantern') this.putProp(c, r, 'iso_lantern', 0.95, 0.45);
          else if (t.prop === 'statue') {
            const st = this.putProp(c, r, 'iso_lion', 0.92, 0.55);
            st.setTint(0xc4b49a);
          }
        }
      }
      if (fn) {
        const fc = isoScreen(fx / fn, fy / fn, 0);
        const fountain = this.add.image(Math.round(fc.x), Math.round(fc.y - 8), 'iso_fountain');
        fountain.setOrigin(0.5, 0.82);
        fountain.setDepth(isoDepth(fx / fn, fy / fn) + 0.4);
        fountain.setDisplaySize(110, 92);
        this.keepBit(fountain);
      }
      this._houseOpen = false;
    }

    camFollow(snap) {
      const p = this.player();
      if (!p || !p.sprite) return;
      const cam = this.cameras.main;
      cam.setBounds(0, 0, WORLD_W, WORLD_H);
      cam.setZoom(KENNEY ? 0.92 : 0.78);
      cam.startFollow(p.sprite, true, 1, 1);
      cam.setFollowOffset(0, 48);
      if (snap) cam.centerOn(p.sprite.x, p.sprite.y + 48);
    }

    separate(x, y, fromH) {
      const rad = 0.32;
      let px = x;
      let py = y;
      const h0 = fromH == null ? this.heightAt(x, y) : fromH;
      for (let n = 0; n < 8; n++) {
        let hit = false;
        const c0 = Math.floor(px - rad) - 1;
        const c1 = Math.floor(px + rad) + 1;
        const r0 = Math.floor(py - rad) - 1;
        const r1 = Math.floor(py + rad) + 1;
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            if (!this.isSolid(c, r, h0)) continue;
            const left = c;
            const right = c + 1;
            const top = r;
            const bot = r + 1;
            if (px > left && px < right && py > top && py < bot) {
              const dl = px - left;
              const drt = right - px;
              const dt = py - top;
              const db = bot - py;
              const m = Math.min(dl, drt, dt, db);
              if (m === dl) px = left - rad;
              else if (m === drt) px = right + rad;
              else if (m === dt) py = top - rad;
              else py = bot + rad;
              hit = true;
              continue;
            }
            const nx = Math.max(left, Math.min(px, right));
            const ny = Math.max(top, Math.min(py, bot));
            const dx = px - nx;
            const dy = py - ny;
            const d2 = dx * dx + dy * dy;
            if (d2 > 0 && d2 < rad * rad) {
              const d = Math.sqrt(d2);
              const k = (rad - d) / d;
              px += dx * k;
              py += dy * k;
              hit = true;
            }
          }
        }
        if (!hit) break;
      }
      return { x: px, y: py };
    }

    tryMove(u, nx, ny) {
      const h0 = this.heightAt(u.wx, u.wy);
      const a = this.separate(nx, u.wy, h0);
      const b = this.separate(a.x, ny, h0);
      u.wx = b.x;
      u.wy = b.y;
    }

    unstuck(u) {
      const p = this.separate(u.wx, u.wy, this.heightAt(u.wx, u.wy));
      u.wx = p.x;
      u.wy = p.y;
    }

    placeUnit(u) {
      if (KENNEY) LiveDungeon.kenneyize(this, u);
      const h = this.heightAt(u.wx, u.wy);
      const p = isoScreen(u.wx, u.wy, h);
      u.sprite.setPosition(Math.round(p.x), Math.round(p.y));
      u.shadow.setPosition(Math.round(p.x), Math.round(p.y + 5));
      u.sprite.setDepth(isoDepth(u.wx, u.wy) + 0.25);
      u.shadow.setDepth(u.sprite.depth - 0.1);
    }

    drawUnitBar(u) {
      if (!u || !u.bar) return;
      u.bar.clear();
      if (u.hp <= 0) return;
      const w = Math.max(28, u.kit.size * 0.38);
      const x = u.sprite.x - w / 2;
      const y = u.sprite.y - u.kit.size * 0.88;
      u.bar.fillStyle(0x07080a, 0.6);
      u.bar.fillRect(x - 1, y - 1, w + 2, 5);
      u.bar.fillStyle(u.side === 'party' ? 0x3ecf8e : 0xc44840, 1);
      u.bar.fillRect(x, y, w * (u.hp / u.maxHp), 3);
      u.bar.setDepth(u.sprite.depth + 12);
    }

    updateHouse() {
      if (!this.house) {
        if (this.houseRoof) this.houseRoof.setAlpha(0.4);
        return;
      }
      const p = this.player();
      const inside = !!(p && inHouse(p.wx, p.wy, this.house));
      if (inside === this._houseOpen) return;
      this._houseOpen = inside;
      const roofA = inside ? 0.14 : 1;
      const wallA = inside ? 0.22 : 1;
      if (this.houseRoof) this.houseRoof.setAlpha(roofA);
      this.houseWalls.forEach((w) => w.setAlpha(wallA));
    }

    drawHover() {
      const p = this.player();
      this.hover.clear();
      if (!p) return;
      const c = Math.floor(p.wx);
      const r = Math.floor(p.wy);
      const h = this.heightAt(c + 0.5, r + 0.5);
      const s = isoScreen(c + 0.5, r + 0.5, h);
      this.hover.setDepth(isoDepth(c + 0.5, r + 0.5) + 0.05);
      this.hover.lineStyle(2, 0xe8d48a, 0.9);
      this.hover.beginPath();
      this.hover.moveTo(s.x, s.y - TH / 2);
      this.hover.lineTo(s.x + TW / 2, s.y);
      this.hover.lineTo(s.x, s.y + TH / 2);
      this.hover.lineTo(s.x - TW / 2, s.y);
      this.hover.closePath();
      this.hover.strokePath();
    }

    drawMini() {
      if (!this.mini) return;
      const g = this.mini;
      const s = 4;
      const ox = 16;
      const oy = 16;
      g.clear();
      g.fillStyle(0x070a0c, 0.75);
      g.fillRoundedRect(ox - 8, oy - 8, COLS * s + 16, ROWS * s + 16, 8);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = this.map[r][c];
          let col = 0x111418;
          if (t.prop === 'lion') col = 0x9aa0a8;
          else if (t.prop === 'tree') col = 0x2e7a40;
          else if (t.prop === 'lantern') col = 0xd87828;
          else if (t.kind === 'plaza' || t.kind === 'pale') col = t.h ? 0xc4b49a : 0xb8a888;
          else if (t.kind === 'jade') col = t.h >= 2 ? 0x5a9a78 : 0x3e7a62;
          else if (t.kind === 'water') col = 0x245a78;
          else if (t.kind === 'wall') col = 0x8a3030;
          else if (t.kind === 'floor' || t.kind === 'door') col = 0xb08a62;
          else if (t.kind === 'fountain') col = 0x3ec8c0;
          else if (t.kind === 'stairs') col = 0xd0c0a0;
          else if (t.kind === 'gate' || t.kind === 'exit') col = 0xc4a040;
          else if (t.kind === 'carpet') col = 0x8a2018;
          else if (t.kind === 'dais') col = 0xc4b49a;
          else if (t.kind === 'pillar' || t.kind === 'statue') col = 0x6a5848;
          g.fillStyle(col, 1);
          g.fillRect(ox + c * s, oy + r * s, s - 1, s - 1);
        }
      }
      Object.keys(this.units).forEach((id) => {
        const u = this.units[id];
        if (u.hp <= 0) return;
        g.fillStyle(parseInt(u.kit.color.replace('#', ''), 16), 1);
        g.fillCircle(ox + u.wx * s, oy + u.wy * s, id === playAs ? 3.5 : 2.6);
      });
    }

    create() {
      this.cameras.main.setBackgroundColor(KENNEY ? '#0c0b10' : '#160e1c');
      this.cameras.main.roundPixels = true;
      this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
      this.scale.on('resize', (gameSize) => {
        this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
        this.camFollow(false);
      });
      this.roomId = 'court';
      this.roomClear = false;
      this.ROWS = ROWS;
      this.makeTileTextures();
      try {
        const near = (Phaser.Textures.FilterMode && Phaser.Textures.FilterMode.NEAREST) || 1;
        const keys = this.textures.getTextureKeys ? this.textures.getTextureKeys() : Object.keys(this.textures.list || {});
        keys.forEach((k) => {
          if (k !== '__DEFAULT' && k !== '__MISSING' && !/^k[tmb]_/.test(k) && this.texOk(k)) this.textures.get(k).setFilter(near);
        });
      } catch (_) {}

      if (this.failedLoads && this.failedLoads.length) {
        setHint('Картинки не встали: ' + this.failedLoads.slice(0, 4).join(', '), 'bad');
      }

      this.drawMap();
      this.mini = this.add.graphics().setDepth(4000).setScrollFactor(0);

      this.makeAnim('brew_jab', [0, 1, 2, 3, 4].map((i) => 'brew_jab_' + pad(i)), 8);
      this.makeAnim('brew_jab_front', [0, 1, 2, 3, 4].map((i) => 'brew_jab_front_' + pad(i)), 8);
      this.makeAnim('brew_jab_back', [0, 1, 2, 3, 4].map((i) => 'brew_jab_back_' + pad(i)), 8);
      this.makeAnim('brew_walk', [0, 1, 2, 3].map((i) => 'brew_walk_' + pad(i)), 8, true);
      this.makeAnim('brew_walk_front', [0, 1, 2, 3].map((i) => 'brew_walk_front_' + pad(i)), 8, true);
      this.makeAnim('brew_walk_back', [0, 1, 2, 3].map((i) => 'brew_walk_back_' + pad(i)), 8, true);
      this.makeAnim('brew_keg', [0, 1, 2].map((i) => 'brew_keg_' + pad(i)), 10);
      this.makeAnim('brew_breath', [0, 1, 2].map((i) => 'brew_breath_' + pad(i)), 6);
      this.makeAnim('brew_kick', [0, 1, 2, 3].map((i) => 'brew_kick_' + pad(i)), 8);
      this.makeAnim('dk_attack', [0, 1, 2, 3, 4, 5].map((i) => 'dk_attack_' + pad(i)), 11);
      this.makeAnim('dk_coil', [0, 1, 2, 3, 4, 5].map((i) => 'dk_coil_' + pad(i)), 10);
      this.makeAnim('dk_nova', [0, 1, 2, 3, 4, 5].map((i) => 'dk_nova_' + pad(i)), 9);
      this.makeAnim('dk_walk', [0, 1, 2, 3].map((i) => 'dk_walk_' + pad(i)), 8, true);
      this.makeAnim('dk_walk_front', [0, 1, 2, 3].map((i) => 'dk_walk_front_' + pad(i)), 8, true);
      this.makeAnim('dk_walk_back', [0, 1, 2, 3].map((i) => 'dk_walk_back_' + pad(i)), 8, true);
      this.makeAnim('ghoul_walk', [0, 1, 2, 3].map((i) => 'ghoul_walk_' + pad(i)), 8, true);
      this.makeAnim('ghoul_atk', [0, 1, 2, 3].map((i) => 'ghoul_atk_' + pad(i)), 10);
      this.makeAnim('nes_assassin_atk', [0, 1, 2].map((i) => 'nes_assassin_atk_' + pad(i)), 12);
      this.makeAnim('sham_attack', [0, 1, 2, 3, 4, 5].map((i) => 'sham_attack_' + pad(i)), 11);
      this.makeAnim('sham_flame', [0, 1, 2, 3, 4, 5].map((i) => 'sham_flame_' + pad(i)), 11);
      this.makeAnim('sham_riptide', [0, 1, 2, 3, 4, 5].map((i) => 'sham_riptide_' + pad(i)), 10);
      this.makeAnim('sham_hw', [0, 1, 2, 3, 4, 5].map((i) => 'sham_hw_' + pad(i)), 10);
      this.makeAnim('sham_walk', [0, 1, 2, 3].map((i) => 'sham_walk_' + pad(i)), 8, true);
      this.makeAnim('sham_walk_front', [0, 1, 2, 3].map((i) => 'sham_walk_front_' + pad(i)), 8, true);
      this.makeAnim('sham_walk_back', [0, 1, 2, 3].map((i) => 'sham_walk_back_' + pad(i)), 8, true);
      if (KENNEY) LiveDungeon.makeAnims(this);
      const nes = (window.LiveKits && LiveKits.NES) || {};
      Object.keys(nes).forEach((cls) => {
        if (cls === 'monk' || cls === 'shaman' || cls === 'deathknight') return;
        const pre = nes[cls].prefix;
        this.makeAnim(pre + '_walk', [0, 1, 2, 3].map((i) => pre + '_walk_' + pad(i)), 8, true);
        this.makeAnim(pre + '_walk_front', [0, 1, 2, 3].map((i) => pre + '_walk_front_' + pad(i)), 8, true);
        this.makeAnim(pre + '_walk_back', [0, 1, 2, 3].map((i) => pre + '_walk_back_' + pad(i)), 8, true);
        this.makeAnim(pre + '_attack', [0, 1, 2, 3, 4, 5].map((i) => pre + '_attack_' + pad(i)), 11);
      });

      this.units = {};
      this.spawnPartySprites();

      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,A,S,D');
      this.input.keyboard.on('keydown', (ev) => {
        const kit = ALL_KITS[playAs];
        if (!kit) return;
        const ab = kit.abs.find((a) => a.key === ev.key);
        if (ab) this.tryCast(ab.id);
      });

      window.LiveProto = this;
      this.resetFight();
      this.syncKitButtons();
      this.scale.refresh();
      this.camFollow(true);
    }

    spritePrefix(u) {
      if (!u) return null;
      if (u.id === 'ghoul') return 'ghoul';
      if (u.kit && u.kit.spritePrefix) return u.kit.spritePrefix;
      if (u.id === 'brew') return 'brew';
      if (u.id === 'sham') return 'sham';
      if (u.id === 'unholy') return 'dk';
      return null;
    }

    spawnPartySprites() {
      partyIds.forEach((id) => this.ensureHeroSprite(id));
    }

    ensureHeroSprite(id) {
      const kit = ALL_KITS[id];
      if (!kit) return null;
      if (this.units[id] && this.units[id].sprite) {
        this.units[id].kit = kit;
        return this.units[id];
      }
      const idle = this.texOk(kit.idle) ? kit.idle : '__DEFAULT';
      const spr = this.add.sprite(0, 0, idle);
      spr.setOrigin(0.5, 0.92);
      spr.setDisplaySize(kit.size, kit.size);
      if (!this.texOk(kit.idle)) spr.setTint(Phaser.Display.Color.HexStringToColor(kit.color).color);
      const shadow = this.add.ellipse(0, 0, 48, 16, 0x000000, 0.4);
      this.units[id] = this.freshHero(id, kit, spr, shadow);
      return this.units[id];
    }

    dropHeroSprite(id) {
      const u = this.units[id];
      if (!u) return;
      if (u.sprite) u.sprite.destroy();
      if (u.shadow) u.shadow.destroy();
      if (u.bar) u.bar.destroy();
      delete this.units[id];
    }

    freshHero(id, kit, spr, shadow) {
      const bar = this.add.graphics().setDepth(5000);
      const u = {
        id: id, kit: kit, sprite: spr, shadow: shadow, bar: bar,
        wx: kit.start.x, wy: kit.start.y, facing: 'front', moving: false,
        hp: kit.hp, maxHp: kit.hp, busy: false, aiCd: 0.3,
        energy: kit.resMax || 100, cds: {}, side: 'party'
      };
      this.resetRes(u, true);
      return u;
    }

    resetRes(u, full) {
      const kit = u.kit;
      if (full) {
        u.hp = kit.hp;
        u.maxHp = kit.hp;
      }
      u.energy = kit.resStart != null ? kit.resStart : (kit.resMax || 100);
      if (kit.resType === 'runic') u.energy = kit.resStart != null ? kit.resStart : 20;
      u.sec = 0;
      u.shield = 0;
      u.stagger = 0;
      u.dots = [];
      u.hots = [];
      u.buffs = [];
      u.taken = [];
      u.healAmp = 0;
      u.healAmpN = 0;
      u.cds = {};
      if (kit.resType === 'runic' || kit.runesMax) {
        const set = kit.runeSet || { b: 2, f: 2, u: 2 };
        u.runes = { b: set.b || 0, f: set.f || 0, u: set.u || 0 };
        u.runeCD = {
          b: set.b ? [0, 0].concat(set.b > 2 ? [0] : []) : [],
          f: set.f ? [0, 0].concat(set.f > 2 ? [0] : []) : [],
          u: set.u ? [0, 0].concat(set.u > 2 ? [0] : []) : []
        };
      } else {
        u.runes = null;
        u.runeCD = null;
      }
    }

    player() { return this.units[playAs]; }

    livingOf(side) {
      return Object.keys(this.units).filter((id) => {
        const u = this.units[id];
        return u && u.side === side && u.hp > 0;
      }).map((id) => this.units[id]);
    }

    livingEnemies() { return this.livingOf('enemy'); }
    livingParty() { return this.livingOf('party'); }

    nearestFoe(u) {
      if (!u) return null;
      if (u.tauntTo && this.units[u.tauntTo] && this.units[u.tauntTo].hp > 0) return this.units[u.tauntTo];
      const list = u.side === 'party' ? this.livingEnemies() : this.livingParty().filter((a) => !a.isPet);
      let best = null;
      let bestD = 1e9;
      list.forEach((o) => {
        const d = Math.hypot(u.wx - o.wx, u.wy - o.wy);
        if (d < bestD) { bestD = d; best = o; }
      });
      return best;
    }

    nearestEnemy() {
      return this.nearestFoe(this.player());
    }

    clearEnemies() {
      Object.keys(this.units).forEach((id) => {
        const u = this.units[id];
        if (!u || u.side !== 'enemy') return;
        if (u.sprite) u.sprite.destroy();
        if (u.shadow) u.shadow.destroy();
        if (u.bar) u.bar.destroy();
        delete this.units[id];
      });
    }

    spawnEnemies() {
      this.clearEnemies();
      const room = this.currentRoom();
      (room.enemies || []).forEach((spec, i) => {
        const base = window.LiveInst && LiveInst.ENEMIES[spec.kit];
        if (!base) return;
        const kit = Object.assign({}, base);
        if (kit.nesIdle && this.texOk(kit.nesIdle)) kit.idle = kit.nesIdle;
        const idle = this.texOk(kit.idle) ? kit.idle : '__DEFAULT';
        const spr = this.add.sprite(0, 0, idle);
        spr.setOrigin(0.5, 0.92);
        spr.setDisplaySize(kit.size, kit.size);
        if (!this.texOk(kit.idle)) spr.setTint(Phaser.Display.Color.HexStringToColor(kit.color).color);
        const shadow = this.add.ellipse(0, 0, 40, 14, 0x000000, 0.4);
        const bar = this.add.graphics().setDepth(5000);
        const id = 'e' + i;
        this.units[id] = {
          id: id, kit: kit, sprite: spr, shadow: shadow, bar: bar,
          wx: spec.x, wy: spec.y, facing: 'front', moving: false,
          hp: kit.hp, maxHp: kit.hp, busy: false, aiCd: 0.4 + Math.random() * 0.4,
          energy: 0, sec: 0, runes: null, runeCD: null, cds: {}, side: 'enemy',
          shield: 0, dots: [], hots: [], buffs: [], taken: [], healAmp: 0, healAmpN: 0,
          home: { x: spec.x, y: spec.y }, aggro: false, novaCd: kit.novaCd || 6
        };
        this.unstuck(this.units[id]);
        this.placeUnit(this.units[id]);
      });
    }

    placeParty(resetHp) {
      const room = this.currentRoom();
      const spots = room.spawnList || [
        { x: 14.2, y: 22.4 }, { x: 16.2, y: 22.6 }, { x: 12.2, y: 22.7 },
        { x: 15.0, y: 23.2 }, { x: 13.0, y: 23.3 }
      ];
      partyIds.forEach((id, i) => {
        this.ensureHeroSprite(id);
        const u = this.units[id];
        const kit = ALL_KITS[id];
        if (!u || !kit) return;
        if (u.sprite.anims) u.sprite.anims.stop();
        if (resetHp) this.resetRes(u, true);
        u.busy = false;
        u.aiCd = 0.3 + Math.random() * 0.3;
        u.cds = {};
        const named = room.spawn && (room.spawn[id] || room.spawn[kit.specId]);
        const sp = named || spots[i] || kit.start;
        u.wx = sp.x;
        u.wy = sp.y;
        this.unstuck(u);
        u.sprite.setAlpha(1);
        u.sprite.clearTint();
        if (!this.texOk(kit.idle)) u.sprite.setTint(Phaser.Display.Color.HexStringToColor(kit.color).color);
        u.facing = 'front';
        u.flipLeft = false;
        u.moving = false;
        this.applyIdle(u);
        u.shadow.setAlpha(1);
        this.placeUnit(u);
      });
      this.applyPartyAuras();
      this.ensureGhoul(!!resetHp);
      this.ensureHunterPet(!!resetHp);
    }

    applyPartyAuras() {
      const seen = {};
      this.livingParty().forEach((u) => {
        if (!u || u.isPet) return;
        const cid = u.kit && u.kit.classId;
        if (!cid || seen[cid]) return;
        seen[cid] = 1;
        let au = (typeof CLASS_AURA === 'object' && CLASS_AURA[cid]) || null;
        if (cid === 'hunter' && typeof hunterKit === 'function') {
          try { au = hunterKit(u.kit.specId).aura; } catch (_) {}
        }
        if (!au) return;
        this.livingParty().forEach((ally) => {
          if (!ally || ally.isPet) return;
          const extra = { aura: true };
          if (au.atkMod) extra.atkMod = au.atkMod;
          if (au.dmgReduce) extra.dmgReduce = au.dmgReduce;
          if (au.healTakenMod) extra.healTaken = au.healTakenMod;
          if (au.critMod) extra.atkMod = (extra.atkMod || 0) + au.critMod * 0.5;
          if (au.versMod) extra.dmgReduce = (extra.dmgReduce || 0) + au.versMod * 0.35;
          this.putBuff(ally, au.id || ('aura_' + cid), 999, extra);
        });
      });
    }

    enterRoom(id, resetHp) {
      Object.keys(this.units).forEach((uid) => {
        const u = this.units[uid];
        if (!u || !u.isPet || u.permanent) return;
        u.hp = 0;
        this.killUnit(u);
        delete this.units[uid];
      });
      this.roomId = id || 'court';
      this.roomClear = false;
      this.over = false;
      this._houseOpen = true;
      this._trans = false;
      this.drawMap();
      this.placeParty(!!resetHp);
      this.ensureGhoul(!!resetHp);
      this.spawnEnemies();
      this.camFollow(true);
      this.updateHouse();
      this.drawHover();
      this.drawMini();
      this.refreshHud(true);
      const room = this.currentRoom();
      const total = (window.LiveInst && LiveInst.order && LiveInst.order.length) || 8;
      setHint(room.idx + ' / ' + total + ' · ' + room.name + '. Союзники сами бьют и хилят. Север — дальше, когда зал чист.');
      const tag = document.getElementById('live-room');
      if (tag) tag.textContent = room.idx + ' / ' + total + '  ' + room.name;
    }

    unlockExits() {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = this.map[r] && this.map[r][c];
          if (!t) continue;
          if (t.kind === 'gate' || t.kind === 'exit') {
            t.walk = true;
            t.kind = 'exit';
          }
        }
      }
      if (KENNEY) LiveDungeon.openGates(this);
    }

    tryExit() {
      if (!this.roomClear || this._trans || this.over) return;
      const room = this.currentRoom();
      if (!room.next) return;
      const p = this.player();
      if (!p) return;
      const t = this.cellAt(p.wx, p.wy);
      if (!t || t.kind !== 'exit') return;
      this._trans = true;
      this.cameras.main.fade(160, 12, 8, 20);
      this.time.delayedCall(170, () => {
        this.enterRoom(room.next, false);
        this.cameras.main.fadeIn(220);
      });
    }

    resetFight() {
      this.tweens.killAll();
      this.time.removeAllEvents();
      this.enterRoom('court', true);
      this.syncKitButtons();
    }

    setPlayAs(id) {
      if (partyIds.indexOf(id) < 0 || playAs === id) return;
      playAs = id;
      this.camFollow(true);
      this.syncKitButtons();
      this.refreshHud(true);
    }

    swapPlaySpec(newId) {
      if (!ALL_KITS[newId]) return;
      const i = partyIds.indexOf(playAs);
      if (i < 0) return;
      if (partyIds.indexOf(newId) >= 0 && newId !== playAs) {
        playAs = newId;
        this.camFollow(true);
        this.syncKitButtons();
        this.refreshHud(true);
        return;
      }
      const old = partyIds[i];
      partyIds[i] = newId;
      playAs = newId;
      this.dropHeroSprite(old);
      this.ensureHeroSprite(newId);
      this.resetFight();
    }

    dist(a, b) {
      return Math.hypot(a.wx - b.wx, a.wy - b.wy);
    }

    idleTex(u) {
      const pre = this.spritePrefix(u);
      if (pre) {
        if (u.facing === 'front' && this.texOk(pre + '_idle_front')) return pre + '_idle_front';
        if (u.facing === 'back' && this.texOk(pre + '_idle_back')) return pre + '_idle_back';
      }
      return this.texOk(u.kit.idle) ? u.kit.idle : '__DEFAULT';
    }

    applyIdle(u) {
      if (KENNEY) { LiveDungeon.idle(this, u); return; }
      if (u.sprite.anims) u.sprite.anims.stop();
      const tex = this.idleTex(u);
      u.sprite.setTexture(tex);
      u.sprite.setDisplaySize(u.kit.size, u.kit.size);
      if (u.facing === 'side') u.sprite.setFlipX(!!u.flipLeft);
      else u.sprite.setFlipX(false);
    }

    walkAnim(u) {
      const pre = this.spritePrefix(u);
      if (!pre) return null;
      if (u.facing === 'front' && this.anims.exists(pre + '_walk_front')) return pre + '_walk_front';
      if (u.facing === 'back' && this.anims.exists(pre + '_walk_back')) return pre + '_walk_back';
      if (this.anims.exists(pre + '_walk')) return pre + '_walk';
      return null;
    }

    applyWalk(u) {
      if (KENNEY) { LiveDungeon.walk(this, u); return; }
      const key = this.walkAnim(u);
      if (!key) return;
      if (u.facing === 'side') u.sprite.setFlipX(!!u.flipLeft);
      else u.sprite.setFlipX(false);
      const cur = u.sprite.anims && u.sprite.anims.currentAnim && u.sprite.anims.currentAnim.key;
      if (cur !== key) {
        u.sprite.play(key);
        u.sprite.setDisplaySize(u.kit.size, u.kit.size);
      }
    }

    faceFromScreen(u, sx, sy) {
      if (Math.abs(sx) < 0.05 && Math.abs(sy) < 0.05) return;
      if (KENNEY) LiveDungeon.face(u, sx, sy);
      if (Math.abs(sy) >= Math.abs(sx) * 0.72) {
        u.facing = sy > 0 ? 'front' : 'back';
        u.flipLeft = false;
      } else {
        u.facing = 'side';
        u.flipLeft = sx < 0;
      }
      if (u.busy) return;
      if (u.moving) this.applyWalk(u);
      else this.applyIdle(u);
    }

    faceToward(u, x, y) {
      const sx = x - u.sprite.x;
      const sy = y == null ? 0 : y - u.sprite.y;
      this.faceFromScreen(u, sx, sy);
    }

    resLabel(u) {
      const kit = u.kit;
      if (kit.resType === 'runic') return 'силы рун';
      if (kit.resType === 'mana') return 'маны';
      return kit.resName || 'энергии';
    }

    runeReady(u, kind) {
      if (!u.runes) return 0;
      return u.runes[kind] || 0;
    }

    hasRunes(u, need) {
      if (!need) return true;
      if (!u.runes) return false;
      const keys = Object.keys(need);
      for (let i = 0; i < keys.length; i++) {
        if (this.runeReady(u, keys[i]) < (need[keys[i]] || 0)) return false;
      }
      return true;
    }

    spendRunes(u, need) {
      if (!need || !u.runes || !u.runeCD) return;
      const RUNE_CD = 3 * TURN;
      Object.keys(need).forEach((k) => {
        let n = need[k] || 0;
        while (n > 0 && u.runes[k] > 0) {
          u.runes[k] -= 1;
          const slots = u.runeCD[k];
          if (slots && slots.length) {
            let i = 0;
            while (i < slots.length && slots[i] > 0) i += 1;
            if (i >= slots.length) i = 0;
            slots[i] = Math.max(slots[i], RUNE_CD);
          }
          n -= 1;
        }
      });
    }

    tickRunes(u, dt) {
      if (!u.runeCD || !u.runes) return;
      ['b', 'f', 'u'].forEach((k) => {
        const slots = u.runeCD[k];
        if (!slots) return;
        for (let i = 0; i < slots.length; i++) {
          if (slots[i] > 0) {
            slots[i] = Math.max(0, slots[i] - dt);
            if (slots[i] <= 0) u.runes[k] = Math.min(slots.length, (u.runes[k] || 0) + 1);
          }
        }
      });
    }

    canPay(u, ab) {
      if (!u || !ab) return false;
      if ((u.cds[ab.id] || 0) > 0) return false;
      if ((ab.cost || 0) > 0 && u.energy < ab.cost) return false;
      if ((ab.costSec || 0) > 0 && (u.sec || 0) < ab.costSec && u.kit.resType !== 'runic') return false;
      if ((ab.costSec || 0) > 0 && u.kit.resType === 'runic' && u.energy < ab.costSec) return false;
      if (ab.costRunes && !this.hasRunes(u, ab.costRunes)) return false;
      return true;
    }

    pay(u, ab) {
      u.energy = Math.max(0, u.energy - (ab.cost || 0));
      if (u.kit.resType === 'runic') {
        u.energy = Math.max(0, u.energy - (ab.costSec || 0));
        u.energy = Math.min(u.kit.resMax || 100, u.energy + (ab.genRunic || 0));
      } else {
        u.sec = Math.max(0, (u.sec || 0) - (ab.costSec || 0));
        u.sec = Math.min(u.kit.secMax || 5, (u.sec || 0) + (ab.genSec || 0) + (ab.gen || 0));
        u.energy = Math.min(u.kit.resMax || 100, u.energy + (ab.gen || 0));
      }
      this.spendRunes(u, ab.costRunes);
      if (ab.cd) u.cds[ab.id] = ab.cd * TURN;
    }

    lowestAlly(u) {
      const list = this.livingParty().filter((a) => a.hp > 0 && !a.isPet);
      if (!list.length) return u;
      list.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
      return list[0];
    }

    hasDot(t, id) {
      return !!(t.dots && t.dots.some((d) => d.id === id && d.left > 0));
    }

    putDot(t, spec, from) {
      if (!spec || !t) return;
      const id = spec.id || spec.name || 'dot';
      const row = {
        id: id,
        name: spec.name || 'Дота',
        flat: spec.flat || 0,
        left: (spec.turns || 3) * TURN,
        tick: 0,
        from: from && from.id
      };
      t.dots = (t.dots || []).filter((d) => d.id !== id);
      t.dots.push(row);
    }

    putHot(t, spec) {
      if (!spec || !t) return;
      const id = spec.id || spec.name || 'hot';
      const row = {
        id: id,
        name: spec.name || 'Хот',
        flat: spec.flat || 0,
        left: (spec.turns || 3) * TURN,
        tick: 0
      };
      t.hots = (t.hots || []).filter((d) => d.id !== id);
      t.hots.push(row);
    }

    putBuff(u, id, dur, extra) {
      extra = extra || {};
      u.buffs = (u.buffs || []).filter((b) => b.id !== id);
      u.buffs.push(Object.assign({ id: id, left: dur }, extra));
    }

    buffVal(u, key) {
      let v = 0;
      (u.buffs || []).forEach((b) => { if (b[key]) v += b[key]; });
      return v;
    }

    takenWindow(u, sec) {
      const now = this.nowT || 0;
      return (u.taken || []).reduce((s, row) => (now - row.t <= sec ? s + row.amt : s), 0);
    }

    dumpPlague(caster) {
      this.livingEnemies().forEach((e) => {
        const d = (e.dots || []).find((x) => x.id === 'plague' && x.left > 0);
        if (!d) return;
        const ticks = Math.max(1, Math.ceil(d.left / TURN));
        this.hurt(e, d.flat * ticks, caster);
        d.left = 0;
      });
    }

    healAmt(caster, base) {
      let n = base || 0;
      if (caster && caster.healAmp && caster.healAmpN > 0) {
        n = Math.round(n * (1 + caster.healAmp));
        caster.healAmpN -= 1;
        if (caster.healAmpN <= 0) caster.healAmp = 0;
      }
      return n;
    }

    applyHit(caster, target, ab, dealt) {
      if (!target || target.hp <= 0) return 0;
      let dmg = dealt != null ? dealt : (ab.dmg || 0);
      if (ab.id === 'scourge' || ab.id === 'festering') {
        if (this.hasDot(target, 'dnd')) dmg *= 2;
      }
      if (ab.enemyDmgMod && target.hp > 0) this.putBuff(target, ab.id + '_mod', 5 * TURN, { incoming: ab.enemyDmgMod });
      let done = 0;
      if (dmg > 0) done = this.hurt(target, dmg, caster);
      if (ab.applyDot) this.putDot(target, ab.applyDot, caster);
      if (ab.healFromDealt && done) this.heal(caster, Math.round(done * ab.healFromDealt));
      if (ab.lifesteal && done) this.heal(caster, Math.round(done * ab.lifesteal));
      if (ab.id === 'death_strike') {
        const fromTaken = Math.round(this.takenWindow(caster, 2 * TURN) * 0.25);
        const fromMax = Math.round(caster.maxHp * 0.10);
        this.heal(caster, fromMax + fromTaken);
      }
      return done;
    }

    applyHealKind(caster, ab) {
      const amt = this.healAmt(caster, ab.heal || ab.dmg || 0);
      if (ab.kind === 'heal_aoe' || ab.type === 'heal_aoe') {
        const list = this.livingParty().slice().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
        if (ab.id === 'ch') {
          let v = amt;
          list.slice(0, 3).forEach((ally) => {
            this.heal(ally, Math.round(v));
            if (ally.sprite) this.popFx(ally.sprite.x, ally.sprite.y - 28, 'heal_spark', 36);
            if (ab.applyHot) this.putHot(ally, ab.applyHot);
            v *= (1 - (ab.chainDecay || 0.05));
          });
        } else {
          list.forEach((ally) => {
            if (amt) this.heal(ally, amt);
            if (ally.sprite) this.popFx(ally.sprite.x, ally.sprite.y - 28, 'heal_spark', 36);
            if (ab.applyHot) this.putHot(ally, ab.applyHot);
          });
        }
        if (ab.dmgReduce) list.forEach((ally) => this.putBuff(ally, ab.id, (ab.buffTurns || 3) * TURN, { dmgReduce: ab.dmgReduce }));
        return;
      }
      const t = this.lowestAlly(caster);
      if (amt) this.heal(t, amt);
      if (t && t.sprite) this.popFx(t.sprite.x, t.sprite.y - 30, 'heal_spark', 40);
      if (ab.applyHot) this.putHot(t, ab.applyHot);
      if (ab.healAmp) {
        caster.healAmp = ab.healAmp;
        caster.healAmpN = ab.nextHealCharges || 2;
      }
    }

    applySelf(caster, ab) {
      if (ab.kind === 'shield' || ab.type === 'shield' || ab.selfShieldFlat) {
        caster.shield = (caster.shield || 0) + (ab.dmg || ab.selfShieldFlat || 30);
        this.floatText(caster.sprite.x, caster.sprite.y - 70, 'щит ' + (ab.dmg || ab.selfShieldFlat || 30) + ' т', '#c8e8ff');
      }
      if (ab.dmgReduce) this.putBuff(caster, ab.id, (ab.buffTurns || 3) * TURN, { dmgReduce: ab.dmgReduce });
      if (ab.atkMod) this.putBuff(caster, ab.id, (ab.buffTurns || 3) * TURN, { atkMod: ab.atkMod });
      if (ab.purifyPct) {
        const n = Math.round(this.takenWindow(caster, 3 * TURN) * ab.purifyPct);
        if (n) this.heal(caster, n);
      }
      if (ab.type === 'taunt' || ab.kind === 'self' && ab.id === 'provoke') {
        this.livingEnemies().forEach((e) => {
          if (this.dist(caster, e) < 6) { e.aggro = true; e.tauntTo = caster.id; }
        });
      }
      if (ab.healAmp) {
        caster.healAmp = ab.healAmp;
        caster.healAmpN = ab.nextHealCharges || 2;
      }
    }

    findPartySpec(specId) {
      for (let i = 0; i < partyIds.length; i++) {
        const u = this.units[partyIds[i]];
        if (u && u.hp > 0 && u.kit && u.kit.specId === specId) return u;
      }
      return null;
    }

    ensureGhoul(resetHp) {
      const dk = this.findPartySpec('unholy') || this.units.unholy;
      if (!dk || dk.hp <= 0) return;
      let g = this.units.ghoul;
      if (g && g.hp > 0) {
        if (resetHp) {
          g.hp = g.maxHp;
          g.busy = false;
          if (g.sprite) { g.sprite.setAlpha(1); g.sprite.clearTint(); }
          if (g.shadow) g.shadow.setAlpha(1);
        }
        g.wx = dk.wx + 0.75;
        g.wy = dk.wy + 0.25;
        this.unstuck(g);
        this.placeUnit(g);
        return;
      }
      if (g) {
        if (g.sprite) g.sprite.destroy();
        if (g.shadow) g.shadow.destroy();
        if (g.bar) g.bar.destroy();
        delete this.units.ghoul;
      }
      const idle = this.texOk('ghoul_idle') ? 'ghoul_idle' : (this.texOk('dk_idle') ? 'dk_idle' : '__DEFAULT');
      const kit = {
        id: 'ghoul', name: 'Вурдалак', color: '#6aaa50',
        hp: 78, speed: 3.35, size: 72,
        idle: idle, aiAnim: this.anims.exists('ghoul_atk') ? 'ghoul_atk' : 'dk_attack',
        aiHit: 2, aiDmg: 13, aiCd: 1.05, aiRange: 1.18
      };
      const spr = this.add.sprite(0, 0, idle);
      spr.setOrigin(0.5, 0.92);
      spr.setDisplaySize(kit.size, kit.size);
      const shadow = this.add.ellipse(0, 0, 32, 12, 0x000000, 0.38);
      const bar = this.add.graphics().setDepth(5000);
      this.units.ghoul = {
        id: 'ghoul', kit: kit, sprite: spr, shadow: shadow, bar: bar,
        wx: dk.wx + 0.75, wy: dk.wy + 0.25, facing: 'side', moving: false, flipLeft: false,
        hp: kit.hp, maxHp: kit.hp, busy: false, aiCd: 0.25,
        energy: 0, sec: 0, cds: {}, side: 'party', isPet: true, permanent: true,
        owner: dk.id, dots: [], hots: [], buffs: [], taken: []
      };
      this.placeUnit(this.units.ghoul);
      this.applyIdle(this.units.ghoul);
    }

    ensureHunterPet(resetHp) {
      const hun = this.findPartySpec('beast_mastery') || this.findPartySpec('marksmanship') || this.findPartySpec('survival');
      const id = 'hunt_pet';
      if (!hun || hun.hp <= 0) {
        const old = this.units[id];
        if (old) { old.hp = 0; this.killUnit(old); }
        return;
      }
      let g = this.units[id];
      if (g && g.hp > 0) {
        if (resetHp) { g.hp = g.maxHp; g.busy = false; if (g.sprite) { g.sprite.setAlpha(1); g.sprite.clearTint(); } }
        g.wx = hun.wx + 0.8; g.wy = hun.wy - 0.2;
        this.unstuck(g); this.placeUnit(g); return;
      }
      if (g) { if (g.sprite) g.sprite.destroy(); if (g.shadow) g.shadow.destroy(); if (g.bar) g.bar.destroy(); delete this.units[id]; }
      const idle = this.texOk('nes_brute') ? 'nes_brute' : (this.texOk('mob_guard') ? 'mob_guard' : '__DEFAULT');
      const kit = {
        id: id, name: 'Зверь', color: '#abd473', hp: 70, speed: 3.2, size: 70,
        idle: idle, aiAnim: hun.kit.aiAnim, aiHit: 2, aiDmg: 12, aiCd: 1.1, aiRange: 1.2
      };
      const spr = this.add.sprite(0, 0, idle);
      spr.setOrigin(0.5, 0.92);
      spr.setDisplaySize(kit.size, kit.size);
      const shadow = this.add.ellipse(0, 0, 30, 12, 0x000000, 0.38);
      const bar = this.add.graphics().setDepth(5000);
      this.units[id] = {
        id: id, kit: kit, sprite: spr, shadow: shadow, bar: bar,
        wx: hun.wx + 0.8, wy: hun.wy - 0.2, facing: 'side', moving: false,
        hp: kit.hp, maxHp: kit.hp, busy: false, aiCd: 0.3,
        energy: 0, sec: 0, cds: {}, side: 'party', isPet: true, permanent: true,
        owner: hun.id, dots: [], hots: [], buffs: [], taken: []
      };
      this.placeUnit(this.units[id]);
    }

    spawnPet(caster, ab) {
      const id = 'pet_' + caster.id;
      const old = this.units[id];
      if (old) { old.hp = 0; this.killUnit(old); }
      const isTotem = ab.id === 'hst';
      const kit = {
        id: id,
        name: ab.id === 'niuzao' ? 'Нюцзао' : (isTotem ? 'Тотем потока' : 'Горгулья'),
        color: caster.kit.color,
        hp: isTotem ? 24 : 40,
        speed: isTotem ? 0 : 2.6,
        size: isTotem ? 48 : 64,
        idle: caster.kit.idle,
        aiAnim: caster.kit.aiAnim,
        aiHit: 2,
        aiDmg: ab.dmg || ab.flat || 8,
        aiCd: 1.1,
        aiRange: isTotem ? 0 : 3.4,
        aiKind: isTotem ? 'totem' : 'melee'
      };
      const spr = this.add.sprite(0, 0, this.texOk(kit.idle) ? kit.idle : '__DEFAULT');
      spr.setOrigin(0.5, 0.92);
      spr.setDisplaySize(kit.size, kit.size);
      spr.setAlpha(isTotem ? 0.95 : 0.92);
      const shadow = this.add.ellipse(0, 0, 28, 10, 0x000000, 0.35);
      const bar = this.add.graphics().setDepth(5000);
      this.units[id] = {
        id: id, kit: kit, sprite: spr, shadow: shadow, bar: bar,
        wx: caster.wx + 0.4, wy: caster.wy - 0.35, facing: caster.facing, moving: false,
        hp: kit.hp, maxHp: kit.hp, busy: false, aiCd: 0.2,
        energy: 0, sec: 0, cds: {}, side: 'party', isPet: true,
        ttl: (ab.id === 'summon_garg' ? 4 : (ab.id === 'niuzao' ? 3 : 5)) * TURN,
        owner: caster.id, dots: [], hots: [], buffs: [], taken: []
      };
      this.placeUnit(this.units[id]);
      if (ab.id === 'summon_garg') {
        const foe = this.nearestFoe(caster);
        if (foe) this.hurt(foe, ab.dmg || 18, caster);
      }
    }

    tryCast(id) {
      return this.tryCastFor(this.player(), id, true);
    }

    tryCastFor(p, id, hints) {
      if (!p || this.over || p.busy || p.hp <= 0) return false;
      const ab = p.kit.abs.find((a) => a.id === id);
      if (!ab) return false;
      if (id === 'outbreak' && (p.cds.outbreak || 0) > 0 && p.kit.resType === 'runic' && p.energy >= 60) {
        p.energy -= 60;
        this.dumpPlague(p);
        if (hints) setHint('Вспышка болезни: дот сразу за 60 силы рун.');
        return true;
      }
      if ((p.cds[ab.id] || 0) > 0) {
        if (hints) setHint(ab.name + ': ещё ' + p.cds[ab.id].toFixed(1) + ' с.', 'wait');
        return false;
      }
      if (!this.canPay(p, ab)) {
        if (hints) {
          if (ab.costRunes && !this.hasRunes(p, ab.costRunes)) setHint(ab.name + ': нет рун.', 'bad');
          else if ((ab.costSec || 0) > 0 && p.kit.resType === 'runic') setHint(ab.name + ': нужно ' + ab.costSec + ' силы рун.', 'bad');
          else if ((ab.cost || 0) > 0) setHint(ab.name + ': нужно ' + ab.cost + ' ' + this.resLabel(p) + '.', 'bad');
          else setHint(ab.name + ': нечем платить.', 'bad');
        }
        return false;
      }
      const foe = this.nearestFoe(p);
      const friendly = ab.kind === 'heal' || ab.kind === 'heal_aoe' || ab.kind === 'self' || ab.kind === 'summon'
        || ab.type === 'heal' || ab.type === 'heal_aoe' || ab.type === 'buff' || ab.type === 'shield'
        || ab.type === 'cleanse' || ab.type === 'taunt' || ab.type === 'summon';
      if (!friendly) {
        if (!foe) return false;
        if (this.dist(p, foe) > ab.range) {
          if (hints) setHint(ab.name + ': далеко. Подойди.', 'wait');
          return false;
        }
        this.faceToward(p, foe.sprite.x, foe.sprite.y);
      } else if (ab.kind === 'heal' || ab.type === 'heal') {
        const t = this.lowestAlly(p);
        if (t && t.sprite) this.faceToward(p, t.sprite.x, t.sprite.y);
      }
      this.pay(p, ab);
      if (hints) setHint(ab.name);
      const lock = !ab.freeAction;
      if (lock) p.busy = true;
      const done = () => {
        if (lock) p.busy = false;
        if (!this.over && p.hp > 0) this.applyIdle(p);
        this.checkEnd();
      };
      const hit = () => {
        if (ab.kind === 'heal' || ab.kind === 'heal_aoe' || ab.type === 'heal' || ab.type === 'heal_aoe') {
          this.applyHealKind(p, ab);
          return;
        }
        if (ab.kind === 'self' || ab.type === 'buff' || ab.type === 'shield' || ab.type === 'cleanse' || ab.type === 'taunt') {
          this.applySelf(p, ab);
          if (ab.id === 'dark_trans') {
            const pet = this.units.ghoul || this.units['pet_' + p.id];
            if (pet) {
              this.putBuff(pet, 'dark_trans', 8 * TURN, { atkMod: 1 });
              if (this.texOk('ghoul_dark') && pet.sprite) {
                pet.sprite.setTexture('ghoul_dark');
                pet.sprite.setDisplaySize(84, 84);
              }
            }
          }
          return;
        }
        if (ab.kind === 'summon' || ab.type === 'summon') {
          this.spawnPet(p, ab);
          return;
        }
        if (ab.kind === 'keg') {
          this.livingEnemies().forEach((e) => {
            if (this.dist(p, e) <= ab.range) this.applyHit(p, e, ab);
          });
          return;
        }
        if (ab.kind === 'breath' || ab.kind === 'nova') {
          if (ab.id === 'dnd') this.groundPool(p, 'dnd_pool', 110, 56);
          if (ab.id === 'outbreak') this.popFx(p.sprite.x, p.sprite.y - 20, 'plague_cloud', 56);
          this.livingEnemies().forEach((e) => {
            if (this.dist(p, e) <= ab.range) this.applyHit(p, e, ab);
          });
          return;
        }
        if (foe && foe.hp > 0) {
          this.applyHit(p, foe, ab);
          if (ab.kind === 'melee') this.popFx(foe.sprite.x, foe.sprite.y - 24, 'slash', 42);
        }
      };

      if (ab.kind === 'keg') {
        this.playAnim(p, ab.anim, ab.hitAt, () => this.flyThing(p, foe, 'keg_fly', 42, 56, 0, () => { hit(); done(); }), null);
        return true;
      }
      if (ab.kind === 'breath') {
        this.playAnim(p, ab.anim, ab.hitAt, () => this.sprayFire(p, foe, 0, () => { hit(); done(); }), null);
        return true;
      }
      if (ab.kind === 'bolt') {
        const bolt = this.boltTexFor(ab);
        this.playAnim(p, ab.anim, ab.hitAt, () => this.flyThing(p, foe, bolt, 32, 32, 0, () => { hit(); done(); }), null);
        return true;
      }
      this.playAnim(p, ab.anim, ab.hitAt, hit, done);
      return true;
    }

    playAnim(u, animKey, hitAt, onHit, onDone) {
      let key = animKey;
      if (u.facing && u.facing !== 'side') {
        const alt = animKey + '_' + u.facing;
        if (this.anims.exists(alt)) key = alt;
      }
      const anim = key && this.anims.get(key);
      if (u.facing === 'side') u.sprite.setFlipX(!!u.flipLeft);
      else u.sprite.setFlipX(false);
      const rate = (anim && anim.frameRate) || 8;
      const n = (anim && anim.frames && anim.frames.length) || 4;
      const totalMs = anim ? Math.round((n / rate) * 1000) + 50 : 320;
      if (anim) u.sprite.play(key);
      u.sprite.setDisplaySize(u.kit.size, u.kit.size);
      let hit = false;
      let finished = false;
      const fireHit = () => {
        if (hit) return;
        hit = true;
        if (onHit) onHit();
      };
      const finish = () => {
        if (finished) return;
        finished = true;
        fireHit();
        if (onDone) onDone();
      };
      this.time.delayedCall(anim ? Math.round((hitAt / rate) * 1000) : 140, fireHit);
      if (anim) u.sprite.once('animationcomplete', finish);
      this.time.delayedCall(totalMs, finish);
    }

    playAiMelee(u, target) {
      if (!target || u.busy || this.over || u.hp <= 0 || target.hp <= 0) return;
      u.busy = true;
      u.aiCd = u.kit.aiCd;
      this.faceToward(u, target.sprite.x, target.sprite.y);
      this.playAnim(u, u.kit.aiAnim, u.kit.aiHit || 2, () => {
        if (target.hp > 0 && this.dist(u, target) <= (u.kit.aiRange || 1.25) + 0.3) this.hurt(target, u.kit.aiDmg);
      }, () => {
        u.busy = false;
        if (!this.over && u.hp > 0) this.applyIdle(u);
      });
    }

    playAiBolt(u, target) {
      if (!target || u.busy || this.over || u.hp <= 0 || target.hp <= 0) return;
      u.busy = true;
      u.aiCd = u.kit.aiCd;
      this.faceToward(u, target.sprite.x, target.sprite.y);
      this.playAnim(u, u.kit.aiAnim, u.kit.aiHit || 1, () => {
        const bolt = (u.kit.boltTex && this.texOk(u.kit.boltTex)) ? u.kit.boltTex
          : (this.texOk('arrow') && u.kit.aiKind === 'kite' ? 'arrow'
            : (this.texOk('frostbolt') ? 'frostbolt' : 'fire_burst'));
        this.flyThing(u, target, bolt, 28, 28, u.kit.aiDmg, () => {});
      }, () => {
        u.busy = false;
        if (!this.over && u.hp > 0) this.applyIdle(u);
      });
    }

    playAiNova(u) {
      if (u.busy || this.over || u.hp <= 0) return;
      u.busy = true;
      u.aiCd = u.kit.aiCd;
      u.novaCd = u.kit.novaCd || 7;
      this.playAnim(u, u.kit.aiAnim, 2, () => {
        this.livingParty().forEach((p) => {
          if (this.dist(u, p) <= (u.kit.novaRange || 2.4)) this.hurt(p, u.kit.novaDmg || 12);
        });
        const ring = this.add.ellipse(u.sprite.x, u.sprite.y, 90, 36, 0x8a40c8, 0.35).setDepth(u.sprite.depth - 0.05);
        this.tweens.add({ targets: ring, alpha: 0, scaleX: 1.6, scaleY: 1.6, duration: 360, onComplete: () => ring.destroy() });
      }, () => {
        u.busy = false;
        if (!this.over && u.hp > 0) this.applyIdle(u);
      });
    }

    tickAi(u, dt) {
      if (!u || u.hp <= 0 || u.busy || this.over) return;
      if (u.aiCd > 0) u.aiCd = Math.max(0, u.aiCd - dt);
      if (u.novaCd > 0) u.novaCd = Math.max(0, u.novaCd - dt);
      const p = this.player();
      if (u.side === 'party') {
        if (u.id === playAs) return;
        if (u.isPet) {
          if (u.kit.aiKind === 'totem') {
            if (u.aiCd <= 0) {
              u.aiCd = 1;
              const t = this.lowestAlly(u);
              if (t) this.heal(t, u.kit.aiDmg || 6);
            }
            return;
          }
          const foeP = this.nearestFoe(u);
          const owner = this.units[u.owner];
          if (foeP && this.dist(u, foeP) > (u.kit.aiRange || 1.3) && u.kit.speed) {
            const ang = Math.atan2(foeP.wy - u.wy, foeP.wx - u.wx);
            this.tryMove(u, u.wx + Math.cos(ang) * u.kit.speed * dt, u.wy + Math.sin(ang) * u.kit.speed * dt);
            this.faceToward(u, foeP.sprite.x, foeP.sprite.y);
            u.moving = true;
            this.applyWalk(u);
          } else if (foeP && u.aiCd <= 0) this.playAiMelee(u, foeP);
          else if (!foeP && owner && owner.hp > 0 && this.dist(u, owner) > 1.4) {
            const ang = Math.atan2(owner.wy - u.wy, owner.wx - u.wx);
            this.tryMove(u, u.wx + Math.cos(ang) * u.kit.speed * 0.85 * dt, u.wy + Math.sin(ang) * u.kit.speed * 0.85 * dt);
            this.faceToward(u, owner.sprite.x, owner.sprite.y);
            u.moving = true;
            this.applyWalk(u);
          } else if (u.moving) { u.moving = false; this.applyIdle(u); }
          return;
        }
        if (u.aiCd <= 0 && this.allyPick(u)) return;
        const foe = this.nearestFoe(u);
        if (!foe) {
          if (p && this.dist(u, p) > 1.6) {
            const ang = Math.atan2(p.wy - u.wy, p.wx - u.wx);
            this.tryMove(u, u.wx + Math.cos(ang) * u.kit.speed * 0.7 * dt, u.wy + Math.sin(ang) * u.kit.speed * 0.7 * dt);
            this.faceToward(u, p.sprite.x, p.sprite.y);
            u.moving = true;
            this.applyWalk(u);
          } else if (u.moving) {
            u.moving = false;
            this.applyIdle(u);
          }
          return;
        }
        const d = this.dist(u, foe);
        const want = u.kit.aiRange;
        if (u.kit.ranged && d < want - 1.4) {
          const ang = Math.atan2(u.wy - foe.wy, u.wx - foe.wx);
          this.tryMove(u, u.wx + Math.cos(ang) * u.kit.speed * dt, u.wy + Math.sin(ang) * u.kit.speed * dt);
          this.faceToward(u, foe.sprite.x, foe.sprite.y);
          u.moving = true;
          this.applyWalk(u);
        } else if (d > want) {
          const ang = Math.atan2(foe.wy - u.wy, foe.wx - u.wx);
          this.tryMove(u, u.wx + Math.cos(ang) * u.kit.speed * 0.75 * dt, u.wy + Math.sin(ang) * u.kit.speed * 0.75 * dt);
          this.faceToward(u, foe.sprite.x, foe.sprite.y);
          u.moving = true;
          this.applyWalk(u);
        } else {
          if (u.moving) { u.moving = false; this.applyIdle(u); }
          if (u.aiCd <= 0) {
            if (u.kit.ranged || u.kit.role === 'healer') this.playAiBolt(u, foe);
            else this.playAiMelee(u, foe);
          }
        }
        return;
      }
      const foe = this.nearestFoe(u);
      const dHome = Math.hypot(u.wx - u.home.x, u.wy - u.home.y);
      if (foe && this.dist(u, foe) < 5.8) u.aggro = true;
      if (dHome > 9.5) u.aggro = false;
      if (!u.aggro || !foe) {
        if (dHome > 0.35) {
          const ang = Math.atan2(u.home.y - u.wy, u.home.x - u.wx);
          this.tryMove(u, u.wx + Math.cos(ang) * u.kit.speed * 0.5 * dt, u.wy + Math.sin(ang) * u.kit.speed * 0.5 * dt);
          u.moving = true;
        } else if (u.moving) {
          u.moving = false;
          this.applyIdle(u);
        }
        return;
      }
      const dE = this.dist(u, foe);
      const kind = u.kit.aiKind || 'melee';
      if (kind === 'healer') {
        const mates = this.livingEnemies().filter((e) => e.id !== u.id);
        mates.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
        const hurt = mates[0];
        if (hurt && hurt.hp < hurt.maxHp * 0.82 && u.aiCd <= 0) {
          u.busy = true;
          u.aiCd = u.kit.aiCd || 2;
          this.playAnim(u, u.kit.aiAnim, 1, () => {
            this.heal(hurt, u.kit.healAmt || 16);
            this.popFx(hurt.sprite.x, hurt.sprite.y - 36, 'heal_spark', 36);
          }, () => { u.busy = false; if (u.hp > 0) this.applyIdle(u); });
          return;
        }
        if (dE < 3.2) {
          const ang = Math.atan2(u.wy - foe.wy, u.wx - foe.wx);
          this.tryMove(u, u.wx + Math.cos(ang) * u.kit.speed * dt, u.wy + Math.sin(ang) * u.kit.speed * dt);
          u.moving = true;
        } else if (u.moving) { u.moving = false; this.applyIdle(u); }
        return;
      }
      if (kind === 'kite' || (kind === 'assassin' && u.hp < u.maxHp * 0.34)) {
        const want = u.kit.aiRange - 0.7;
        if (dE < want) {
          const ang = Math.atan2(u.wy - foe.wy, u.wx - foe.wx);
          this.tryMove(u, u.wx + Math.cos(ang) * u.kit.speed * dt, u.wy + Math.sin(ang) * u.kit.speed * dt);
          this.faceToward(u, foe.sprite.x, foe.sprite.y);
          u.moving = true;
        } else if (dE > u.kit.aiRange) {
          const ang = Math.atan2(foe.wy - u.wy, foe.wx - u.wx);
          this.tryMove(u, u.wx + Math.cos(ang) * u.kit.speed * dt, u.wy + Math.sin(ang) * u.kit.speed * dt);
          u.moving = true;
        } else {
          if (u.moving) { u.moving = false; this.applyIdle(u); }
          if (u.aiCd <= 0) this.playAiBolt(u, foe);
        }
        return;
      }
      if ((kind === 'boss' || kind === 'brute') && u.novaCd <= 0 && dE <= (u.kit.novaRange || 2.4) + 0.4) {
        this.playAiNova(u);
        return;
      }
      const chase = (kind === 'assassin' || kind === 'charger') ? 1.15 : 0.85;
      if (dE > u.kit.aiRange) {
        const ang = Math.atan2(foe.wy - u.wy, foe.wx - u.wx);
        this.tryMove(u, u.wx + Math.cos(ang) * u.kit.speed * chase * dt, u.wy + Math.sin(ang) * u.kit.speed * chase * dt);
        this.faceToward(u, foe.sprite.x, foe.sprite.y);
        u.moving = true;
      } else {
        if (u.moving) { u.moving = false; this.applyIdle(u); }
        if (u.aiCd <= 0) {
          if (kind === 'bolt') this.playAiBolt(u, foe);
          else this.playAiMelee(u, foe);
        }
      }
    }

    allyPick(u) {
      const abs = u.kit.abs || [];
      const byId = (id) => abs.find((a) => a.id === id);
      const tryId = (id) => {
        const a = byId(id);
        if (!a || !this.canPay(u, a)) return false;
        const ok = this.tryCastFor(u, id, false);
        if (ok) u.aiCd = Math.max(0.4, u.kit.aiCd || 1.0);
        return ok;
      };
      const tryList = (arr) => {
        if (!arr) return false;
        for (let i = 0; i < arr.length; i++) if (tryId(arr[i])) return true;
        return false;
      };
      const spec = ((window.PARTY_AI_SPECS || {})[(u.kit.classId || '') + ':' + (u.kit.specId || '')]) || {};
      const hurt = this.lowestAlly(u);
      const foes = this.livingEnemies();
      const foe = this.nearestFoe(u);
      const role = spec.role || u.kit.role;
      if (role === 'healer') {
        if (hurt && hurt.hp < hurt.maxHp * 0.42 && tryList(spec.emergency)) return true;
        if (hurt && hurt.hp < hurt.maxHp * 0.72 && tryList(spec.stHeal)) return true;
        if (this.livingParty().some((a) => a.hp < a.maxHp * 0.82) && tryList(spec.aoeHeal)) return true;
        if (hurt && hurt.hp < hurt.maxHp * 0.92 && tryList(spec.hots)) return true;
        if (foe && tryList(spec.filler)) return true;
        if (foe && tryList(spec.dots)) return true;
        return false;
      }
      if (role === 'tank') {
        if (u.hp < u.maxHp * 0.55 && tryList(spec.defensives)) return true;
        if (u.hp < u.maxHp * 0.72 && tryList(spec.cleanse)) return true;
        if (foes.length >= 3 && tryList(spec.aoe)) return true;
        if (foes.some((e) => !e.tauntTo) && tryList(spec.taunt)) return true;
        if (tryList(spec.spenders)) return true;
        if (tryList(spec.builders)) return true;
        return tryList(spec.st);
      }
      if (foe && foe.hp < foe.maxHp * 0.35 && tryList(spec.execute)) return true;
      if (foes.length >= 3 && tryList(spec.aoe)) return true;
      if (foe && spec.dots) {
        for (let i = 0; i < spec.dots.length; i++) {
          const id = spec.dots[i];
          const a = byId(id);
          const dotId = (a && a.applyDot && (a.applyDot.id || a.applyDot.name)) || id;
          if (a && a.applyDot && !this.hasDot(foe, dotId) && tryId(id)) return true;
        }
      }
      if (u.hp < u.maxHp * 0.4 && tryList(spec.selfHeal || spec.defensives)) return true;
      if (tryList(spec.spenders)) return true;
      if (tryList(spec.builders)) return true;
      if (tryList(spec.st)) return true;
      for (let i = 0; i < abs.length; i++) {
        const a = abs[i];
        if (a.kind === 'heal' || a.kind === 'heal_aoe' || a.kind === 'self') continue;
        if (tryId(a.id)) return true;
      }
      return false;
    }

    tickAuras(u, dt) {
      if (!u || u.hp <= 0) return;
      (u.dots || []).forEach((d) => {
        d.left -= dt;
        d.tick = (d.tick || 0) + dt;
        if (d.tick >= TURN && d.flat) {
          d.tick -= TURN;
          this.hurt(u, d.flat);
        }
      });
      u.dots = (u.dots || []).filter((d) => d.left > 0);
      (u.hots || []).forEach((h) => {
        h.left -= dt;
        h.tick = (h.tick || 0) + dt;
        if (h.tick >= TURN && h.flat) {
          h.tick -= TURN;
          this.heal(u, h.flat);
        }
      });
      u.hots = (u.hots || []).filter((h) => h.left > 0);
      (u.buffs || []).forEach((b) => { b.left -= dt; });
      u.buffs = (u.buffs || []).filter((b) => b.left > 0);
      if (u.stagger > 0) {
        u._stagAcc = (u._stagAcc || 0) + dt;
        if (u._stagAcc >= TURN) {
          u._stagAcc -= TURN;
          const tick = Math.max(1, Math.round(u.stagger * 0.25));
          u.stagger = Math.max(0, u.stagger - tick);
          u._stagTick = true;
          this.hurt(u, tick);
          u._stagTick = false;
        }
      }
      if (u.isPet && !u.permanent) {
        u.ttl = (u.ttl || 0) - dt;
        if (u.ttl <= 0) { u.hp = 0; this.killUnit(u); }
      }
      if (u.id === 'ghoul') {
        const dark = (u.buffs || []).some((b) => b.id === 'dark_trans');
        if (!dark && u.kit && u.sprite) {
          if (this.texOk(u.kit.idle) && u.sprite.texture && u.sprite.texture.key === 'ghoul_dark') {
            u.sprite.setTexture(u.kit.idle);
            u.sprite.setDisplaySize(u.kit.size, u.kit.size);
          }
        }
      }
    }

    popFx(x, y, key, size) {
      if (!this.texOk(key)) return;
      const img = this.add.image(x, y, key).setDepth(920);
      img.setDisplaySize(size || 40, size || 40);
      this.tweens.add({
        targets: img,
        y: y - 22,
        alpha: 0,
        duration: 420,
        onComplete: () => img.destroy()
      });
    }

    groundPool(u, key, w, h) {
      if (!u || !this.texOk(key)) return;
      const img = this.add.image(u.sprite.x, u.sprite.y + 8, key).setDepth(u.sprite.depth - 0.2);
      img.setDisplaySize(w || 90, h || 48);
      img.setAlpha(0.85);
      this.tweens.add({ targets: img, alpha: 0, scaleX: 1.25, scaleY: 1.25, duration: 900, onComplete: () => img.destroy() });
    }

    boltTexFor(ab) {
      if (ab.id === 'death_coil' && this.texOk('coil_skull')) return 'coil_skull';
      if (ab.id === 'flame_shock' && this.texOk('flame_orb')) return 'flame_orb';
      if (ab.id === 'outbreak' && this.texOk('plague_cloud')) return 'plague_cloud';
      if (ab.id === 'riptide' && this.texOk('riptide_bolt')) return 'riptide_bolt';
      if ((ab.id === 'cobra' || ab.id === 'aimed' || ab.id === 'arcane_shot' || ab.id === 'steady' || ab.id === 'kill_shot' || ab.id === 'multi') && this.texOk('arrow')) return 'arrow';
      return this.texOk('frostbolt') ? 'frostbolt' : 'fire_burst';
    }

    flyThing(from, to, tex, w, h, dmg, done, tint) {
      if (!to || to.hp <= 0) { if (done) done(); return; }
      const img = this.add.image(from.sprite.x, from.sprite.y - 36, this.texOk(tex) ? tex : '__DEFAULT').setDepth(800);
      img.setDisplaySize(w, h);
      if (tint) img.setTint(tint);
      this.tweens.add({
        targets: img,
        x: to.sprite.x,
        y: to.sprite.y - 28,
        angle: 180,
        duration: 400,
        ease: 'Quad.easeIn',
        onComplete: () => {
          img.destroy();
          if (dmg && to.hp > 0) this.hurt(to, dmg);
          this.time.delayedCall(30, done || function () {});
        }
      });
    }

    sprayFire(from, to, dmg, done) {
      if (!to) { if (done) done(); return; }
      const ox = from.sprite.x;
      const oy = from.sprite.y - 40;
      const dx = to.sprite.x - ox;
      const dy = to.sprite.y - 24 - oy;
      const dist = Math.max(16, Math.hypot(dx, dy));
      const jet = this.add.image(ox, oy, this.texOk('fire_jet') ? 'fire_jet' : '__DEFAULT').setOrigin(0, 0.5).setDepth(790);
      jet.rotation = Math.atan2(dy, dx);
      jet.displayHeight = 18;
      jet.displayWidth = 8;
      this.tweens.add({
        targets: jet,
        displayWidth: dist,
        duration: 360,
        onComplete: () => {
          const burst = this.add.image(to.sprite.x, to.sprite.y - 24, this.texOk('fire_burst') ? 'fire_burst' : '__DEFAULT').setDepth(792);
          burst.setDisplaySize(56, 56);
          if (dmg) this.hurt(to, dmg);
          this.tweens.add({
            targets: [jet, burst],
            alpha: 0,
            duration: 220,
            delay: 80,
            onComplete: () => { jet.destroy(); burst.destroy(); }
          });
        }
      });
      this.time.delayedCall(700, done || function () {});
    }

    floatText(x, y, text, color) {
      const t = this.add.text(x, y, text, {
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '18px',
        fontStyle: '700',
        color: color || '#ffe0b0'
      }).setOrigin(0.5).setDepth(5000);
      this.tweens.add({
        targets: t,
        y: y - 40,
        alpha: 0,
        duration: 720,
        ease: 'Quad.easeOut',
        onComplete: () => t.destroy()
      });
    }

    hurt(u, amount, from) {
      if (!u || u.hp <= 0 || !amount) return 0;
      let n = amount;
      const atkMod = from ? this.buffVal(from, 'atkMod') : 0;
      if (atkMod) n = Math.round(n * (1 + atkMod));
      const red = this.buffVal(u, 'dmgReduce');
      if (red) n = Math.max(1, Math.round(n * (1 - red)));
      const inc = this.buffVal(u, 'incoming');
      if (inc) n = Math.round(n * (1 + inc));
      if (from && from.kit && from.kit.resType === 'rage' && from.hp > 0) {
        from.energy = Math.min(from.kit.resMax || 100, (from.energy || 0) + 8);
      }
      if (!u._stagTick && u.kit && u.kit.specId === 'brewmaster' && u.kit.role === 'tank') {
        const pool = Math.round(n * 0.35);
        if (pool > 0) {
          n -= pool;
          u.stagger = (u.stagger || 0) + pool;
        }
      }
      if (u.shield > 0) {
        const soak = Math.min(u.shield, n);
        u.shield -= soak;
        n -= soak;
      }
      if (n <= 0) {
        this.floatText(u.sprite.x, u.sprite.y - 70, 'щит', '#c8e8ff');
        this.refreshHud();
        return 0;
      }
      u.hp = Math.max(0, u.hp - n);
      u.taken = (u.taken || []).concat([{ t: this.nowT || 0, amt: n }]).slice(-12);
      this.floatText(u.sprite.x, u.sprite.y - 70, '−' + n + ' т', u.id === playAs ? '#ff8a8a' : '#ffd0a8');
      u.sprite.setTint(0xffc8b0);
      this.time.delayedCall(120, () => { if (u.sprite) u.sprite.clearTint(); });
      this.refreshHud();
      if (u.hp <= 0) this.killUnit(u);
      this.checkEnd();
      return n;
    }

    heal(u, amount) {
      if (!u || u.hp <= 0 || !amount) return;
      let n = amount;
      const amp = this.buffVal(u, 'healTaken');
      if (amp) n = Math.round(n * (1 + amp));
      u.hp = Math.min(u.maxHp, u.hp + n);
      this.floatText(u.sprite.x, u.sprite.y - 70, '+' + n + ' HP', '#8ef0b0');
      this.refreshHud();
    }

    killUnit(u) {
      u.busy = true;
      u.aggro = false;
      if (u.id === 'ghoul') this.ghoulCd = 8;
      if (u.bar) u.bar.clear();
      this.tweens.add({
        targets: [u.sprite, u.shadow],
        alpha: 0.12,
        duration: 420
      });
    }

    checkEnd() {
      if (this.over) return true;
      const p = this.player();
      if (p && p.hp <= 0) {
        this.over = true;
        p.busy = false;
        this.refreshHud();
        setHint('Падение. «Сначала» — двор с начала.', 'bad');
        return true;
      }
      if (!this.livingEnemies().length && !this.roomClear) {
        this.roomClear = true;
        this.unlockExits();
        const room = this.currentRoom();
        if (!room.next) {
          this.over = true;
          if (p) p.busy = false;
          setHint('Ша пал. Инст пройден. Цифры учебные.', 'ok');
        } else {
          setHint('Зал чист. Выход на север — золотые плиты.', 'ok');
        }
        this.refreshHud(true);
      }
      return !!this.over;
    }

    runeText(u) {
      if (!u.runes) return '';
      const bit = (n, on) => '<i class="' + (n ? on : '') + '"></i>';
      return '<div class="live-runes">' +
        bit(u.runes.b >= 1, 'b') + bit(u.runes.b >= 2, 'b') +
        bit(u.runes.f >= 1, 'f') + bit(u.runes.f >= 2, 'f') +
        bit(u.runes.u >= 1, 'u') + bit(u.runes.u >= 2, 'u') +
        '</div>';
    }

    resMeters(u) {
      const kit = u.kit;
      const max = kit.resMax || 100;
      let html = '';
      if (kit.resType === 'runic') {
        html += this.runeText(u);
        html += '<div class="live-meter"><span>сила рун</span><div class="live-track en"><i style="width:' + (100 * u.energy / max) + '%"></i></div>' +
          '<span>' + Math.round(u.energy) + ' / ' + max + '</span></div>';
      } else {
        html += '<div class="live-meter"><span>' + (kit.resName || 'энергия') + '</span><div class="live-track en"><i style="width:' + (100 * u.energy / max) + '%"></i></div>' +
          '<span>' + Math.round(u.energy) + ' / ' + max + '</span></div>';
        if (kit.secName) {
          const sm = kit.secMax || 5;
          html += '<div class="live-meter"><span>' + kit.secName + '</span><div class="live-track chi"><i style="width:' + (100 * (u.sec || 0) / sm) + '%"></i></div>' +
            '<span>' + Math.round(u.sec || 0) + ' / ' + sm + '</span></div>';
        }
      }
      if (u.shield) html += '<div class="live-meter"><span>щит</span><div class="live-track sh"><i style="width:100%"></i></div><span>' + Math.round(u.shield) + ' т</span></div>';
      return html;
    }

    abMeta(p, ab) {
      const bits = [];
      if (ab.heal) bits.push('+' + ab.heal + ' HP');
      else if (ab.dmg) bits.push(ab.dmg + ' т');
      if (ab.applyDot) bits.push(ab.applyDot.name || 'дот');
      if (ab.applyHot) bits.push(ab.applyHot.name || 'хот');
      if (ab.cost) bits.push(ab.cost + ' ' + (p.kit.resName || 'эн.'));
      if (ab.costSec && p.kit.resType === 'runic') bits.push(ab.costSec + ' силы рун');
      else if (ab.costSec && p.kit.secName) bits.push(ab.costSec + ' ' + p.kit.secName);
      if (ab.costRunes) {
        const r = ab.costRunes;
        const names = { b: 'крови', f: 'льда', u: 'нечестивости' };
        Object.keys(r).forEach((k) => { if (r[k]) bits.push(r[k] + ' рун' + (r[k] > 1 ? 'ы' : 'а') + ' ' + (names[k] || k)); });
      }
      if (ab.freeAction) bits.push('без хода');
      if (!bits.length) bits.push('бесплатно');
      return bits.join(' · ');
    }

    syncKitButtons() {
      const box = document.getElementById('live-kits');
      if (box) {
        box.innerHTML = partyIds.map((id) => {
          const kit = ALL_KITS[id];
          if (!kit) return '';
          return '<button type="button" class="live-kit' + (id === playAs ? ' on' : '') + '" data-kit="' + id + '">' + (kit.fullName || kit.name) + '</button>';
        }).join('');
      }
      const sel = document.getElementById('live-spec-swap');
      if (sel && !sel.dataset.bound) {
        const groups = {};
        Object.keys(ALL_KITS).forEach((id) => {
          const k = ALL_KITS[id];
          const g = k.classId || 'other';
          if (!groups[g]) groups[g] = [];
          groups[g].push(k);
        });
        sel.innerHTML = Object.keys(groups).map((g) => {
          const clsName = groups[g][0] && groups[g][0].name ? groups[g][0].name.split(' ')[0] : g;
          return '<optgroup label="' + clsName + '">' + groups[g].map((k) => {
            return '<option value="' + k.id + '">' + (k.fullName || k.name) + '</option>';
          }).join('') + '</optgroup>';
        }).join('');
        sel.value = playAs;
        sel.addEventListener('change', () => {
          if (window.LiveProto) window.LiveProto.swapPlaySpec(sel.value);
        });
        sel.dataset.bound = '1';
      } else if (sel) sel.value = playAs;
    }

    refreshHud(force) {
      const p = this.player();
      const box = $('abs');
      const strips = document.getElementById('live-strips');
      if (strips) {
        const party = partyIds.map((id) => {
          const u = this.units[id];
          const kit = ALL_KITS[id];
          if (!u) return '';
          const you = id === playAs;
          const hpPct = Math.max(0, 100 * u.hp / u.maxHp);
          return (
            '<div class="live-hero-strip' + (you ? ' you' : '') + '" style="--cc:' + kit.color + '">' +
              '<div class="live-name" style="color:' + kit.color + '">' + (you ? 'Ты · ' : '') + kit.name + '</div>' +
              '<div class="live-meter"><span>HP</span><div class="live-track hp"><i style="width:' + hpPct + '%;background:' + (you ? '#3ecf8e' : '#f07178') + '"></i></div>' +
              '<span>' + Math.round(u.hp) + ' / ' + u.maxHp + ' HP</span></div>' +
              (you ? this.resMeters(u) : '') +
            '</div>'
          );
        }).join('');
        const foes = Object.keys(this.units).filter((id) => this.units[id].side === 'enemy').map((id) => {
          const u = this.units[id];
          const hpPct = Math.max(0, 100 * u.hp / u.maxHp);
          return (
            '<div class="live-hero-strip foe" style="--cc:' + u.kit.color + '">' +
              '<div class="live-name" style="color:' + u.kit.color + '">' + u.kit.name + '</div>' +
              '<div class="live-meter"><span>HP</span><div class="live-track hp"><i style="width:' + hpPct + '%;background:#c45a48"></i></div>' +
              '<span>' + Math.round(u.hp) + ' / ' + u.maxHp + ' HP</span></div>' +
            '</div>'
          );
        }).join('');
        strips.innerHTML = party;
      }
      if (!box || !p) return;
      const abs = p.kit.abs;
      const sig = playAs + abs.map((ab) => ab.id + ':' + (this.canPay(p, ab) ? 1 : 0) + ':' + ((p.cds[ab.id] || 0).toFixed(1))).join('|') + (this.over ? ':o' : '');
      if (!force && box.dataset.sig === sig) return;
      box.dataset.sig = sig;
      box.innerHTML = abs.map((ab) => {
        const cd = p.cds[ab.id] || 0;
        const need = this.over || !this.canPay(p, ab);
        let meta = this.abMeta(p, ab);
        if (cd > 0) meta = 'ещё ' + cd.toFixed(1) + ' с';
        return (
          '<button type="button" class="live-ab' + (need ? ' is-disabled' : '') + (cd > 0 ? ' cd' : '') + '" data-ab="' + ab.id + '">' +
          '<span class="hk">' + ab.key + '</span>' +
          '<span class="nm">' + ab.name + '</span>' +
          '<span class="meta">' + meta + '</span></button>'
        );
      }).join('');
      box.querySelectorAll('.live-ab').forEach((btn) => {
        btn.addEventListener('click', () => this.tryCast(btn.getAttribute('data-ab')));
      });
    }

    update(_time, delta) {
      const dt = Math.min(0.05, (delta || 16) / 1000);
      if (!this.over) {
        this.nowT = (this.nowT || 0) + dt;
        if (this.ghoulCd > 0) {
          this.ghoulCd -= dt;
          if (this.ghoulCd <= 0) this.ensureGhoul(true);
        }
        Object.keys(this.units).forEach((id) => {
          const u = this.units[id];
          if (!u || u.hp <= 0) return;
          this.tickAuras(u, dt);
          if (u.side !== 'party' || u.isPet) return;
          const max = u.kit.resMax || 100;
          if (u.kit.resType !== 'runic') u.energy = Math.min(max, (u.energy || 0) + (u.kit.resRegen || 0) * dt);
          this.tickRunes(u, dt);
          (u.kit.abs || []).forEach((ab) => {
            if (u.cds[ab.id] > 0) u.cds[ab.id] = Math.max(0, u.cds[ab.id] - dt);
          });
        });
        const p = this.player();
        if (p && p.hp > 0) {
          let vx = 0;
          let vy = 0;
          if (!p.busy) {
            if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
            if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
            if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
            if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;
            if (vx || vy) {
              const len = Math.hypot(vx, vy) || 1;
              vx /= len;
              vy /= len;
              const dwx = (vx + vy) * p.kit.speed * dt;
              const dwy = (vy - vx) * p.kit.speed * dt;
              this.tryMove(p, p.wx + dwx, p.wy + dwy);
              p.moving = true;
              this.faceFromScreen(p, vx, vy);
              this.applyWalk(p);
            } else if (p.moving) {
              p.moving = false;
              this.applyIdle(p);
            }
          }
          this.unstuck(p);
          const foe = this.nearestEnemy();
          if (foe && !(vx || vy)) this.faceToward(p, foe.sprite.x, foe.sprite.y);
        }

        Object.keys(this.units).forEach((id) => {
          const u = this.units[id];
          if (!u || u.hp <= 0) return;
          this.unstuck(u);
          this.tickAi(u, dt);
        });

        Object.keys(this.units).forEach((id) => {
          this.placeUnit(this.units[id]);
          this.drawUnitBar(this.units[id]);
        });
        this.updateHouse();
        this.drawHover();
        this.drawMini();
        this.tryExit();
      }
      this.refreshHud();
    }
  }

  let kitsBound = false;
  function bindKitButtons() {
    if (kitsBound) return;
    kitsBound = true;
    const box = document.getElementById('live-kits');
    if (box) {
      box.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-kit]');
        if (!btn) return;
        const id = btn.getAttribute('data-kit');
        if (window.LiveProto) window.LiveProto.setPlayAs(id);
        else playAs = id;
      });
    }
  }

  function bootLiveFight() {
    if (typeof Phaser === 'undefined') {
      bootError('Phaser не загрузился.');
      return null;
    }
    const host = $('game');
    if (!host) {
      bootError('Нет поля #live-game.');
      return null;
    }
    bindKitButtons();
    if (!Object.keys(ALL_KITS).length) {
      bootError('Киты живого боя не загрузились (live-kits.js).');
      return null;
    }
    if (liveGame) {
      if (window.LiveProto) window.LiveProto.resetFight();
      liveGame.scale.refresh();
      return liveGame;
    }
    window.addEventListener('resize', () => { if (liveGame) liveGame.scale.refresh(); });
    liveGame = new Phaser.Game({
      /* данж Kenney: WebGL (оттенки врагов, плавный масштаб); без WebGL Phaser сам откатится на Canvas */
      type: KENNEY ? Phaser.AUTO : Phaser.CANVAS,
      parent: host,
      width: W,
      height: H,
      backgroundColor: '#0a1410',
      pixelArt: !KENNEY,
      roundPixels: true,
      loader: { imageLoadType: 'HTMLImageElement' },
      scale: {
        mode: Phaser.Scale.RESIZE,
        parent: host,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: LiveScene
    });
    requestAnimationFrame(function () {
      if (liveGame) liveGame.scale.refresh();
      if (window.LiveProto && window.LiveProto.camFollow) window.LiveProto.camFollow(true);
    });
    return liveGame;
  }

  function destroyLiveFight() {
    if (liveGame) {
      liveGame.destroy(true);
      liveGame = null;
      window.LiveProto = null;
    }
    const host = $('game');
    if (host) host.innerHTML = '';
  }

  document.getElementById('live-btn-reset')?.addEventListener('click', () => {
    if (window.LiveProto) window.LiveProto.resetFight();
  });

  window.bootLiveFight = bootLiveFight;
  window.destroyLiveFight = destroyLiveFight;
})();
