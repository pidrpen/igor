/* test-room/compare: тест анимаций — спек слева, 1/5 духов, мир-FX */
(function () {
  const BASE = 'assets/sprites/characters/mage_frost_compare/';
  const BOLT = 'assets/sprites/fx/frostbolt.png';
  const DUMMY = 'assets/sprites/fx/dummy_spirit.png';
  const SHAMAN_IDLE = 'assets/sprites/characters/shaman_aoe_compare/idle_00.png';
  const SHAMAN_CAST = [0, 1, 2, 3, 4, 5].map((i) =>
    'assets/sprites/characters/shaman_aoe_compare/cast_' + String(i).padStart(2, '0') + '.png');
  const PORTRAIT = 'assets/portraits/specs/mage_frost.png';
  const CAST = [0, 1, 2, 3].map((i) => BASE + 'cast_' + String(i).padStart(2, '0') + '.png');
  const BAKED = [0, 1, 2, 3, 4, 5].map((i) => BASE + 'baked_' + String(i).padStart(2, '0') + '.png');
  const IDLE = BASE + 'idle_00.png';
  const BREW_IDLE = 'assets/sprites/characters/monk_brew_nes/idle_00.png';
  const BREW_JAB = [0, 1, 2, 3, 4].map((i) =>
    'assets/sprites/characters/monk_brew_nes/jab_' + String(i).padStart(2, '0') + '.png');
  const BREW_BREATH = [0, 1, 2].map((i) =>
    'assets/sprites/characters/monk_brew_nes/breath_' + String(i).padStart(2, '0') + '.png?v=2');
  const BREW_KICK = [0, 1, 2, 3].map((i) =>
    'assets/sprites/characters/monk_brew_nes/kick_' + String(i).padStart(2, '0') + '.png?v=2');
  const BREW_KEG_WIND = 'assets/sprites/characters/monk_brew_nes/keg_00.png';
  const KEG_FLY = 'assets/sprites/fx/keg_fly.png?v=4';
  const KEG_SHARD = [0, 1, 2, 3, 4].map((i) => 'assets/sprites/fx/keg_shard_' + i + '.png?v=4');
  const FIRE_JET = 'assets/sprites/fx/fire_jet.png?v=3';
  const FIRE_BURST = 'assets/sprites/fx/fire_burst.png?v=3';
  const fireJetImg = new Image();
  fireJetImg.src = FIRE_JET;
  const fireBurstImg = new Image();
  fireBurstImg.src = FIRE_BURST;
  const ALLY_SRC = [
    'assets/portraits/specs/shaman_restoration.png',
    'assets/portraits/specs/paladin_holy.png',
    'assets/portraits/specs/priest_holy.png',
    'assets/portraits/specs/monk_mistweaver.png',
  ];

  const CHAIN_IDS = { chain: 1, chain_light: 1, lightning: 1, ch: 1, chain_heal: 1 };
  const HEAL_CHAIN = { ch: 1, chain_heal: 1 };
  const RAIN_IDS = { blizzard: 1, healing_rain: 1, hs: 1, thunderstorm: 1, frozen_orb: 1 };
  const BOLT_IDS = { frostbolt: 1, ice_lance: 1, lb: 1, hw: 1, healing_wave: 1, chw: 1 };

  let busy = false;
  let aoeBusy = false;
  let raf = 0;
  let aoeRaf = 0;
  let dummyN = 5;
  let pick = null;
  let focusDummy = 0;

  function $(id) { return document.getElementById(id); }

  function setStatus(text) {
    const el = $('cmp-status');
    if (el) el.textContent = text;
  }

  function hitDummy(img) {
    if (!img) return;
    img.classList.remove('cmp-hit');
    void img.offsetWidth;
    img.classList.add('cmp-hit');
    setTimeout(() => img.classList.remove('cmp-hit'), 380);
  }

  function playFrames(img, urls, fps, onIndex, onDone) {
    let i = 0;
    const ms = Math.max(50, Math.round(1000 / (fps || 9)));
    const tick = () => {
      if (!img || !urls.length) { if (onDone) onDone(); return; }
      img.src = urls[Math.min(i, urls.length - 1)];
      if (onIndex) onIndex(i);
      i += 1;
      if (i >= urls.length) {
        setTimeout(() => { if (onDone) onDone(); }, ms);
        return;
      }
      setTimeout(tick, ms);
    };
    tick();
  }

  function stagePoint(stage, el, ox, oy) {
    if (!stage || !el) return { x: 0, y: 0 };
    const s = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width * ox - s.left,
      y: r.top + r.height * oy - s.top,
    };
  }

  function packDummies() {
    return [...document.querySelectorAll('#cmp-aoe-pack .cmp-dummy')];
  }

  function allyEls() {
    return [...document.querySelectorAll('#cmp-allies .cmp-ally')];
  }

  function ensurePack() {
    const pack = $('cmp-aoe-pack');
    if (!pack) return;
    pack.innerHTML = '';
    for (let i = 0; i < dummyN; i++) {
      const img = document.createElement('img');
      img.className = 'cmp-dummy' + (i === focusDummy ? ' is-focus' : '');
      img.alt = 'Злой дух';
      img.draggable = false;
      img.src = DUMMY;
      img.dataset.i = String(i);
      img.addEventListener('click', () => {
        focusDummy = i;
        packDummies().forEach((el, k) => el.classList.toggle('is-focus', k === focusDummy));
      });
      pack.appendChild(img);
    }
  }

  function ensureAllies(show) {
    const box = $('cmp-allies');
    if (!box) return;
    box.classList.toggle('hidden', !show);
    if (!show) { box.innerHTML = ''; return; }
    if (box.childElementCount === ALLY_SRC.length) return;
    box.innerHTML = '';
    ALLY_SRC.forEach((src, i) => {
      const el = document.createElement('div');
      el.className = 'cmp-ally';
      el.innerHTML = '<img alt="Союзник" draggable="false" src="' + src + '">';
      el.dataset.i = String(i);
      box.appendChild(el);
    });
  }

  function specPortrait(s) {
    if (typeof ASSETS !== 'undefined' && ASSETS.specP) return ASSETS.specP(s.classId, s.specId);
    return 'assets/portraits/specs/' + s.classId + '_' + s.specId + '.png';
  }

  function casterKind(s) {
    if (!s) return 'portrait';
    if (s.classId === 'mage' && s.specId === 'frost') return 'mage';
    if (s.classId === 'shaman') return 'shaman';
    if (s.classId === 'monk' && s.specId === 'brewmaster') return 'brew';
    return 'portrait';
  }

  function showCasterIdle() {
    const img = $('cmp-aoe-caster');
    const port = $('cmp-caster-portrait');
    const kind = casterKind(pick);
    if (kind === 'portrait') {
      if (img) img.classList.add('hidden');
      if (port) {
        port.classList.remove('hidden');
        const pi = $('cmp-caster-portrait-img');
        if (pi && pick) pi.src = specPortrait(pick);
      }
    } else {
      if (port) port.classList.add('hidden');
      if (img) {
        img.classList.remove('hidden');
        img.classList.toggle('cmp-brew', kind === 'brew');
        img.src = kind === 'shaman' ? SHAMAN_IDLE : (kind === 'brew' ? BREW_IDLE : IDLE);
      }
    }
  }

  function playCasterCast(onRelease) {
    const kind = casterKind(pick);
    const img = $('cmp-aoe-caster');
    const port = $('cmp-caster-portrait');
    if (kind === 'mage' && img) {
      playFrames(img, CAST, 9, (i) => { if (i === 1 && onRelease) onRelease(); }, () => {
        img.src = IDLE;
      });
      return;
    }
    if (kind === 'shaman' && img) {
      playFrames(img, SHAMAN_CAST, 10, (i) => { if (i === 2 && onRelease) onRelease(); }, () => {
        img.src = SHAMAN_IDLE;
      });
      return;
    }
    if (kind === 'brew' && img) {
      playFrames(img, BREW_JAB, 9, (i) => { if (i === 1 && onRelease) onRelease(); }, () => {
        img.src = BREW_IDLE;
      });
      return;
    }
    port?.classList.add('cmp-casting');
    setTimeout(() => port?.classList.remove('cmp-casting'), 480);
    if (onRelease) onRelease();
  }

  function playBrewKick(onHit) {
    const img = $('cmp-aoe-caster');
    if (!img) { if (onHit) onHit(); return; }
    playFrames(img, BREW_KICK, 8, (i) => { if (i === 2 && onHit) onHit(); }, () => {
      img.src = BREW_IDLE;
    });
  }

  function sizeAoeCanvas() {
    const stage = $('cmp-stage-aoe');
    const canvas = $('cmp-aoe-fx');
    if (!stage || !canvas) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    canvas.width = Math.max(2, Math.floor(w * dpr));
    canvas.height = Math.max(2, Math.floor(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { stage, canvas, ctx, w, h };
  }

  function boltPath(x0, y0, x1, y1, jag, detail) {
    let pts = [{ x: x0, y: y0 }, { x: x1, y: y1 }];
    for (let s = 0; s < detail; s++) {
      const next = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const off = (Math.random() * 2 - 1) * jag;
        next.push({ x: mx + (-dy / len) * off, y: my + (dx / len) * off });
        next.push(b);
      }
      pts = next;
      jag *= 0.55;
    }
    return pts;
  }

  function strokePath(ctx, pts, t1, width, color, blur) {
    if (!pts || pts.length < 2) return;
    const n = Math.max(2, Math.floor((pts.length - 1) * Math.max(0.04, t1)));
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i <= n; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();
  }

  function casterOrigin(stage) {
    const img = $('cmp-aoe-caster');
    const port = $('cmp-caster-portrait');
    if (img && !img.classList.contains('hidden')) return stagePoint(stage, img, 0.78, 0.34);
    if (port && !port.classList.contains('hidden')) return stagePoint(stage, port, 0.72, 0.42);
    return { x: 80, y: stage.clientHeight * 0.45 };
  }

  function mouthOrigin(stage) {
    const img = $('cmp-aoe-caster');
    if (img && !img.classList.contains('hidden')) return stagePoint(stage, img, 0.72, 0.38);
    return casterOrigin(stage);
  }

  function playBreathOn(targets, done) {
    const box = sizeAoeCanvas();
    const caster = $('cmp-aoe-caster');
    if (!box || !targets.length) { if (done) done(); return; }
    const o = mouthOrigin(box.stage);
    const ends = targets.map((el) => stagePoint(box.stage, el, 0.48, 0.42));
    if (caster) {
      playFrames(caster, BREW_BREATH, 8, null, () => {
        caster.src = BREW_BREATH[2] || BREW_BREATH[1];
      });
    }
    const t0 = performance.now();
    const growMs = 520;
    const holdMs = 280;
    const fadeMs = 220;
    const total = growMs + holdMs + fadeMs;
    const hit = new Array(targets.length).fill(false);
    const step = (now) => {
      const t = now - t0;
      const grow = Math.min(1, t / growMs);
      const fade = t < growMs + holdMs ? 1 : Math.max(0, 1 - (t - growMs - holdMs) / fadeMs);
      box.ctx.clearRect(0, 0, box.w, box.h);
      box.ctx.globalCompositeOperation = 'source-over';
      ends.forEach((b, i) => {
        const ang = Math.atan2(b.y - o.y, b.x - o.x);
        const full = Math.hypot(b.x - o.x, b.y - o.y);
        const reach = full * grow;
        if (fireJetImg.complete && fireJetImg.naturalWidth && reach > 10) {
          const stamps = Math.max(2, Math.ceil(reach / 34));
          const jw = 40;
          const jh = 16;
          for (let s = 1; s <= stamps; s++) {
            const u = s / stamps;
            const px = o.x + Math.cos(ang) * reach * u;
            const py = o.y + Math.sin(ang) * reach * u;
            box.ctx.save();
            box.ctx.globalAlpha = 0.9 * fade * (0.4 + 0.6 * u);
            box.ctx.translate(px, py);
            box.ctx.rotate(ang);
            box.ctx.drawImage(fireJetImg, -jw / 2, -jh / 2, jw, jh);
            box.ctx.restore();
          }
        }
        if (grow > 0.72 && fireBurstImg.complete && fireBurstImg.naturalWidth) {
          const s = 26 + (grow - 0.72) * 32;
          box.ctx.save();
          box.ctx.globalAlpha = fade * 0.95;
          box.ctx.drawImage(fireBurstImg, b.x - s / 2, b.y - s / 2, s, s);
          box.ctx.restore();
        }
        if (grow > 0.78 && !hit[i]) {
          hit[i] = true;
          hitDummy(targets[i]);
        }
      });
      if (t < total) {
        aoeRaf = requestAnimationFrame(step);
      } else {
        box.ctx.clearRect(0, 0, box.w, box.h);
        if (caster) caster.src = BREW_IDLE;
        if (done) done();
      }
    };
    aoeRaf = requestAnimationFrame(step);
  }

  function playChainOn(targets, pal, done) {
    const box = sizeAoeCanvas();
    if (!box || !targets.length) { if (done) done(); return; }
    const hops = [casterOrigin(box.stage)].concat(targets.map((el) => stagePoint(box.stage, el, 0.5, 0.42)));
    const segs = [];
    for (let i = 0; i < hops.length - 1; i++) {
      segs.push({
        pts: boltPath(hops[i].x, hops[i].y, hops[i + 1].x, hops[i + 1].y, 16, 5),
        el: targets[i] || null,
      });
    }
    const hopMs = 260;
    const t0 = performance.now();
    const step = (now) => {
      const t = now - t0;
      box.ctx.clearRect(0, 0, box.w, box.h);
      box.ctx.globalCompositeOperation = 'lighter';
      const idx = Math.min(segs.length - 1, Math.floor(t / hopMs));
      const local = Math.min(1, (t - idx * hopMs) / hopMs);
      for (let i = 0; i < idx; i++) {
        strokePath(box.ctx, segs[i].pts, 1, 6, pal.glow, 12);
        strokePath(box.ctx, segs[i].pts, 1, 2, pal.core, 3);
      }
      const cur = segs[idx];
      if (cur) {
        strokePath(box.ctx, cur.pts, local, 8, pal.glow, 16);
        strokePath(box.ctx, cur.pts, local, 2.4, pal.core, 4);
        if (local > 0.8 && cur.el && !cur.hit) {
          cur.hit = true;
          hitDummy(cur.el);
        }
      }
      if (t < segs.length * hopMs + 160) {
        aoeRaf = requestAnimationFrame(step);
      } else {
        box.ctx.clearRect(0, 0, box.w, box.h);
        if (done) done();
      }
    };
    aoeRaf = requestAnimationFrame(step);
  }

  function playRainOn(targets, pal, done) {
    const box = sizeAoeCanvas();
    if (!box) { if (done) done(); return; }
    const flakes = [];
    const t0 = performance.now();
    const dur = 1300;
    let lastHit = 0;
    const step = (now) => {
      const t = now - t0;
      const pack = $('cmp-aoe-pack');
      const pr = (pack && pack.getBoundingClientRect()) || box.stage.getBoundingClientRect();
      const sr = box.stage.getBoundingClientRect();
      const left = pr.left - sr.left;
      const top = pr.top - sr.top;
      if (flakes.length < 80) {
        for (let k = 0; k < 5; k++) {
          flakes.push({
            x: left + Math.random() * Math.max(20, pr.width),
            y: top - 10 - Math.random() * 36,
            vy: 1.5 + Math.random() * 2.4,
            s: 2 + Math.random() * 3,
          });
        }
      }
      box.ctx.clearRect(0, 0, box.w, box.h);
      box.ctx.globalCompositeOperation = 'lighter';
      box.ctx.fillStyle = pal.wash;
      box.ctx.fillRect(left, top, pr.width, pr.height);
      box.ctx.fillStyle = pal.flake;
      for (const f of flakes) {
        f.y += f.vy;
        box.ctx.fillRect(f.x, f.y, f.s, f.s + 2);
      }
      if (now - lastHit > 200 && targets.length) {
        lastHit = now;
        hitDummy(targets[Math.floor(Math.random() * targets.length)]);
      }
      if (t < dur) {
        aoeRaf = requestAnimationFrame(step);
      } else {
        targets.forEach((el, i) => setTimeout(() => hitDummy(el), i * 40));
        box.ctx.clearRect(0, 0, box.w, box.h);
        if (done) done();
      }
    };
    aoeRaf = requestAnimationFrame(step);
  }

  function flySpriteBolt(toEl, done) {
    const stage = $('cmp-stage-aoe');
    const bolt = $('cmp-pixel-bolt');
    if (!stage || !bolt || !toEl) { if (done) done(); return; }
    const a = casterOrigin(stage);
    const b = stagePoint(stage, toEl, 0.45, 0.42);
    bolt.src = BOLT;
    bolt.style.display = 'block';
    bolt.style.left = a.x + 'px';
    bolt.style.top = a.y + 'px';
    const t0 = performance.now();
    const dur = 400;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - (1 - t) * (1 - t);
      bolt.style.left = (a.x + (b.x - a.x) * e) + 'px';
      bolt.style.top = (a.y + (b.y - a.y) * e) + 'px';
      if (t < 1) {
        aoeRaf = requestAnimationFrame(step);
      } else {
        bolt.style.display = 'none';
        hitDummy(toEl);
        if (done) done();
      }
    };
    aoeRaf = requestAnimationFrame(step);
  }

  function flyCanvasBolt(toEl, pal, done) {
    const box = sizeAoeCanvas();
    if (!box || !toEl) { if (done) done(); return; }
    const a = casterOrigin(box.stage);
    const b = stagePoint(box.stage, toEl, 0.45, 0.42);
    const t0 = performance.now();
    const dur = 420;
    const trail = [];
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 2);
      const x = a.x + (b.x - a.x) * e;
      const y = a.y + (b.y - a.y) * e;
      trail.push({ x, y });
      box.ctx.clearRect(0, 0, box.w, box.h);
      box.ctx.globalCompositeOperation = 'lighter';
      if (trail.length > 1) {
        box.ctx.beginPath();
        box.ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) box.ctx.lineTo(trail[i].x, trail[i].y);
        box.ctx.strokeStyle = pal.glow;
        box.ctx.lineWidth = 6;
        box.ctx.lineCap = 'round';
        box.ctx.stroke();
        box.ctx.strokeStyle = pal.core;
        box.ctx.lineWidth = 2;
        box.ctx.stroke();
      }
      if (t < 1) {
        aoeRaf = requestAnimationFrame(step);
      } else {
        hitDummy(toEl);
        box.ctx.clearRect(0, 0, box.w, box.h);
        if (done) done();
      }
    };
    aoeRaf = requestAnimationFrame(step);
  }

  function playImpact(toEl, kind, done) {
    const box = sizeAoeCanvas();
    if (!box || !toEl) { if (done) done(); return; }
    hitDummy(toEl);
    const p = stagePoint(box.stage, toEl, 0.45, 0.42);
    const t0 = performance.now();
    const bits = [];
    const n = kind === 'keg' ? 16 : 8;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      bits.push({
        x: p.x, y: p.y,
        vx: Math.cos(a) * (2.4 + Math.random() * 3),
        vy: Math.sin(a) * (2.4 + Math.random() * 3) - (kind === 'keg' ? 1.4 : 0.3),
        s: kind === 'keg' ? 3 + Math.random() * 4 : 2 + Math.random() * 2,
      });
    }
    if (kind === 'keg') {
      [0, 1, 2].forEach((i) => {
        const sh = $('cmp-keg-s' + i);
        if (!sh) return;
        sh.src = KEG_SHARD[i];
        sh.style.display = 'block';
        sh.style.left = p.x + 'px';
        sh.style.top = p.y + 'px';
      });
    }
    const step = (now) => {
      const t = (now - t0) / 460;
      box.ctx.clearRect(0, 0, box.w, box.h);
      box.ctx.globalCompositeOperation = 'lighter';
      box.ctx.beginPath();
      box.ctx.arc(p.x, p.y, 12 + t * 36, 0, Math.PI * 2);
      box.ctx.strokeStyle = kind === 'keg'
        ? 'rgba(230,170,70,' + (1 - t) + ')'
        : 'rgba(255,240,200,' + (1 - t) + ')';
      box.ctx.lineWidth = kind === 'keg' ? 5 : 3;
      box.ctx.stroke();
      box.ctx.fillStyle = kind === 'keg' ? 'rgba(210,140,50,0.95)' : 'rgba(255,255,230,0.95)';
      for (const b of bits) {
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.14;
        box.ctx.fillRect(b.x, b.y, b.s, b.s);
      }
      if (kind === 'keg') {
        [0, 1, 2].forEach((i) => {
          const sh = $('cmp-keg-s' + i);
          if (!sh || sh.style.display === 'none') return;
          const ang = (i - 1) * 0.9;
          const d = t * 52;
          sh.style.left = (p.x + Math.cos(ang) * d) + 'px';
          sh.style.top = (p.y + Math.sin(ang) * d - t * 18) + 'px';
          sh.style.transform = 'translate(-50%,-50%) rotate(' + (t * 180 * (i + 1)) + 'deg)';
        });
      }
      if (t < 1) {
        aoeRaf = requestAnimationFrame(step);
      } else {
        box.ctx.clearRect(0, 0, box.w, box.h);
        [0, 1, 2].forEach((i) => {
          const sh = $('cmp-keg-s' + i);
          if (sh) sh.style.display = 'none';
        });
        if (done) done();
      }
    };
    aoeRaf = requestAnimationFrame(step);
  }

  function ensureShardPool(n) {
    const stage = $('cmp-stage-aoe');
    if (!stage) return [];
    let pool = $('cmp-keg-shard-pool');
    if (!pool) {
      pool = document.createElement('div');
      pool.id = 'cmp-keg-shard-pool';
      pool.setAttribute('aria-hidden', 'true');
      stage.appendChild(pool);
    }
    while (pool.children.length < n) {
      const img = document.createElement('img');
      img.className = 'brew-keg-shard';
      img.alt = '';
      img.draggable = false;
      pool.appendChild(img);
    }
    [...pool.children].forEach((el) => { el.style.display = 'none'; });
    return [...pool.children].slice(0, n);
  }

  function playFocusShatter(p, done) {
    const box = sizeAoeCanvas();
    if (!box) { if (done) done(); return; }
    const t0 = performance.now();
    const bits = [];
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      bits.push({
        x: p.x, y: p.y,
        vx: Math.cos(a) * (1.6 + Math.random() * 2.2),
        vy: Math.sin(a) * (1.6 + Math.random() * 2.2) - 1.2,
        s: 2 + Math.random() * 3,
      });
    }
    const step = (now) => {
      const t = (now - t0) / 260;
      box.ctx.clearRect(0, 0, box.w, box.h);
      box.ctx.globalCompositeOperation = 'lighter';
      box.ctx.beginPath();
      box.ctx.arc(p.x, p.y, 10 + t * 28, 0, Math.PI * 2);
      box.ctx.strokeStyle = 'rgba(230,170,70,' + (1 - t) + ')';
      box.ctx.lineWidth = 4;
      box.ctx.stroke();
      box.ctx.fillStyle = 'rgba(210,140,50,0.95)';
      for (const b of bits) {
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.16;
        box.ctx.fillRect(b.x, b.y, b.s, b.s);
      }
      if (t < 1) {
        aoeRaf = requestAnimationFrame(step);
      } else {
        box.ctx.clearRect(0, 0, box.w, box.h);
        if (done) done();
      }
    };
    aoeRaf = requestAnimationFrame(step);
  }

  function flyShardsTo(origin, targets, done) {
    const stage = $('cmp-stage-aoe');
    if (!stage || !targets.length) { if (done) done(); return; }
    const shards = ensureShardPool(targets.length);
    const ends = targets.map((el) => stagePoint(stage, el, 0.48, 0.42));
    shards.forEach((sh, i) => {
      sh.src = KEG_SHARD[i % KEG_SHARD.length];
      sh.style.display = 'block';
      sh.style.width = '22px';
      sh.style.left = origin.x + 'px';
      sh.style.top = origin.y + 'px';
    });
    const box = sizeAoeCanvas();
    const t0 = performance.now();
    const dur = 400;
    const hit = new Array(targets.length).fill(false);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - (1 - t) * (1 - t);
      if (box) {
        box.ctx.clearRect(0, 0, box.w, box.h);
        box.ctx.globalCompositeOperation = 'lighter';
      }
      shards.forEach((sh, i) => {
        const b = ends[i];
        const x = origin.x + (b.x - origin.x) * e;
        const y = origin.y + (b.y - origin.y) * e - Math.sin(t * Math.PI) * 16;
        sh.style.left = x + 'px';
        sh.style.top = y + 'px';
        sh.style.transform = 'translate(-50%,-50%) rotate(' + (t * 300 * (i % 2 ? 1 : -1)) + 'deg)';
        if (t > 0.8 && !hit[i]) {
          hit[i] = true;
          hitDummy(targets[i]);
        }
        if (box && t > 0.78) {
          box.ctx.beginPath();
          box.ctx.arc(b.x, b.y, 8 + t * 18, 0, Math.PI * 2);
          box.ctx.strokeStyle = 'rgba(230,170,70,' + ((1 - t) * 0.9) + ')';
          box.ctx.lineWidth = 3;
          box.ctx.stroke();
        }
      });
      if (t < 1) {
        aoeRaf = requestAnimationFrame(step);
      } else {
        shards.forEach((sh) => { sh.style.display = 'none'; });
        if (box) box.ctx.clearRect(0, 0, box.w, box.h);
        if (done) done();
      }
    };
    aoeRaf = requestAnimationFrame(step);
  }

  function flyKegSmash(targets, done) {
    const stage = $('cmp-stage-aoe');
    const proj = $('cmp-keg-proj');
    const caster = $('cmp-aoe-caster');
    const focus = targets[Math.min(focusDummy, Math.max(0, targets.length - 1))] || targets[0];
    if (!stage || !proj || !focus) { if (done) done(); return; }
    const a = casterOrigin(stage);
    const mid = stagePoint(stage, focus, 0.42, 0.44);
    proj.src = KEG_FLY;
    proj.style.display = 'block';
    proj.style.left = a.x + 'px';
    proj.style.top = a.y + 'px';
    const t0 = performance.now();
    const dur = 500;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - (1 - t) * (1 - t);
      const x = a.x + (mid.x - a.x) * e;
      const y = a.y + (mid.y - a.y) * e - Math.sin(t * Math.PI) * 22;
      proj.style.left = x + 'px';
      proj.style.top = y + 'px';
      proj.style.transform = 'translate(-50%,-50%) rotate(' + (t * 360) + 'deg)';
      if (t < 1) {
        aoeRaf = requestAnimationFrame(step);
      } else {
        proj.style.display = 'none';
        hitDummy(focus);
        const rest = targets.filter((el) => el !== focus);
        playFocusShatter(mid, () => {
          if (!rest.length) { if (done) done(); return; }
          flyShardsTo(mid, rest, done);
        });
      }
    };
    aoeRaf = requestAnimationFrame(step);
    if (caster) {
      caster.src = BREW_KEG_WIND;
      setTimeout(() => { caster.src = BREW_IDLE; }, 180);
    }
  }

  function finishCast() {
    aoeBusy = false;
  }

  function playAbility(ab) {
    if (!ab || aoeBusy) return;
    const id = ab.id || '';
    const type = String(ab.t || ab.type || '');
    const foes = packDummies();
    const friends = allyEls();
    const focus = foes[Math.min(focusDummy, Math.max(0, foes.length - 1))] || foes[0];
    const name = ab.n || ab.name || id;
    aoeBusy = true;
    setStatus(name);

    const ice = { glow: 'rgba(80,190,255,0.5)', core: '#f2fbff', wash: 'rgba(170,220,255,0.1)', flake: 'rgba(220,245,255,0.9)' };
    const nature = { glow: 'rgba(90,220,120,0.5)', core: '#e8ffe8', wash: 'rgba(120,220,140,0.1)', flake: 'rgba(200,255,210,0.9)' };
    const storm = { glow: 'rgba(70,180,255,0.55)', core: '#fff', wash: 'rgba(140,190,255,0.1)', flake: 'rgba(210,230,255,0.9)' };

    const after = () => { finishCast(); setStatus(name + ' · готово. Хожу снова я.'); };

    if (id === 'keg_smash') {
      if (!foes.length) { after(); return; }
      flyKegSmash(foes, after);
      return;
    }
    if (id === 'breath') {
      playBreathOn(foes, after);
      return;
    }
    if (id === 'blackout' && pick && pick.specId === 'brewmaster') {
      if (!focus) { after(); return; }
      playBrewKick(() => playImpact(focus, 'kick', after));
      return;
    }
    if (id === 'jab' && pick && pick.specId === 'brewmaster') {
      playCasterCast(() => playImpact(focus, 'jab', after));
      return;
    }
    if (CHAIN_IDS[id] || /цепн|chain/i.test(name)) {
      const heal = !!(HEAL_CHAIN[id] || type.indexOf('heal') === 0);
      const list = heal ? (friends.length ? friends : foes) : foes;
      playCasterCast(() => playChainOn(list, heal ? nature : storm, after));
      return;
    }
    if (RAIN_IDS[id] || type === 'aoe' || type === 'heal_aoe' || type === 'cast_aoe') {
      const heal = type.indexOf('heal') === 0;
      const list = heal ? (friends.length ? friends : foes) : foes;
      playCasterCast(() => playRainOn(list, heal ? nature : ice, after));
      return;
    }
    if (BOLT_IDS[id] || type === 'damage' || type === 'heal' || type === 'dot') {
      const heal = type === 'heal' || type === 'heal_aoe';
      const tgt = heal ? (friends[0] || focus) : focus;
      if (!tgt) { after(); return; }
      const frost = pick && pick.classId === 'mage';
      playCasterCast(() => {
        if (frost && (id === 'frostbolt' || id === 'ice_lance')) flySpriteBolt(tgt, after);
        else flyCanvasBolt(tgt, heal ? nature : (frost ? ice : storm), after);
      });
      return;
    }
    playCasterCast(() => {
      const box = sizeAoeCanvas();
      const o = box ? casterOrigin(box.stage) : null;
      if (box && o) {
        box.ctx.clearRect(0, 0, box.w, box.h);
        box.ctx.strokeStyle = 'rgba(255,230,140,0.7)';
        box.ctx.lineWidth = 3;
        box.ctx.beginPath();
        box.ctx.arc(o.x, o.y, 28, 0, Math.PI * 2);
        box.ctx.stroke();
        setTimeout(() => { box.ctx.clearRect(0, 0, box.w, box.h); after(); }, 420);
      } else after();
    });
  }

  function renderRail() {
    const rail = $('cmp-spec-rail');
    if (!rail || typeof allSpecsFlat !== 'function') return;
    const list = allSpecsFlat();
    rail.innerHTML = list.map((s) => {
      const on = pick && pick.classId === s.classId && pick.specId === s.specId;
      return '<button type="button" class="cmp-spec' + (on ? ' on' : '') +
        '" data-class="' + s.classId + '" data-spec="' + s.specId + '">' +
        '<b>' + (s.specName || s.specId) + '</b>' +
        '<span>' + (s.className || s.classId) + '</span></button>';
    }).join('');
    rail.querySelectorAll('.cmp-spec').forEach((btn) => {
      btn.addEventListener('click', () => {
        const found = list.find((s) => s.classId === btn.dataset.class && s.specId === btn.dataset.spec);
        if (found) setPick(found);
      });
    });
  }

  function renderBar() {
    const bar = $('cmp-ability-bar');
    if (!bar || !pick) return;
    const abs = (typeof getSpecAbilities === 'function')
      ? getSpecAbilities(pick.classId, pick.specId)
      : [];
    bar.innerHTML = '';
    abs.forEach((ab, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ability';
      const key = idx < 9 ? String(idx + 1) : '';
      btn.innerHTML =
        (key ? '<span class="hk">' + key + '</span>' : '') +
        '<span class="a-ico">' + (ab.icon || ab.i || '') + '</span>' +
        '<span class="a-body"><span class="a-name">' + (ab.name || ab.n || ab.id) + '</span></span>';
      btn.addEventListener('click', () => playAbility(ab));
      bar.appendChild(btn);
    });
  }

  function setPick(s) {
    pick = s;
    const healer = s.role === 'healer';
    ensureAllies(healer);
    showCasterIdle();
    renderRail();
    renderBar();
    const meta = $('cmp-meta');
    if (meta) {
      meta.textContent = s.className + ' · ' + s.specName + ' · ' + dummyN +
        (dummyN === 1 ? ' дух' : ' духов') + ' · HP не падает';
    }
    setStatus(s.specName + ' · жми способность. Цепи прыгают, область на всех.');
    const on = document.querySelector('#cmp-spec-rail .cmp-spec.on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
  }

  function setDummyN(n) {
    dummyN = n === 1 ? 1 : 5;
    if (focusDummy >= dummyN) focusDummy = 0;
    document.querySelectorAll('[data-cmp-n]').forEach((b) => {
      b.classList.toggle('on', +b.getAttribute('data-cmp-n') === dummyN);
    });
    ensurePack();
    if (pick) setPick(pick);
  }

  /* ── справка: три подачи стрелы ── */
  function flyPixelBolt(done) {
    const stage = $('cmp-stage-pixel');
    const bolt = document.createElement('img');
    const mage = $('cmp-pixel-mage');
    const dummy = $('cmp-pixel-dummy');
    if (!stage || !mage || !dummy) { if (done) done(); return; }
    bolt.src = BOLT;
    bolt.className = 'cmp-bolt';
    bolt.style.display = 'block';
    stage.appendChild(bolt);
    const a = stagePoint(stage, mage, 0.78, 0.38);
    const b = stagePoint(stage, dummy, 0.45, 0.42);
    bolt.style.left = a.x + 'px';
    bolt.style.top = a.y + 'px';
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / 420);
      const e = 1 - (1 - t) * (1 - t);
      bolt.style.left = (a.x + (b.x - a.x) * e) + 'px';
      bolt.style.top = (a.y + (b.y - a.y) * e) + 'px';
      if (t < 1) raf = requestAnimationFrame(step);
      else { bolt.remove(); hitDummy(dummy); if (done) done(); }
    };
    raf = requestAnimationFrame(step);
  }

  function flyPortraitBolt(done) {
    const stage = $('cmp-stage-portrait');
    const canvas = $('cmp-portrait-fx');
    const card = $('cmp-portrait-card');
    const dummy = $('cmp-portrait-dummy');
    if (!stage || !canvas || !card || !dummy) { if (done) done(); return; }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    canvas.width = Math.max(2, Math.floor(w * dpr));
    canvas.height = Math.max(2, Math.floor(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) { if (done) done(); return; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    card.classList.add('cmp-casting');
    const a = stagePoint(stage, card, 0.72, 0.42);
    const b = stagePoint(stage, dummy, 0.45, 0.42);
    const t0 = performance.now();
    const trail = [];
    const step = (now) => {
      const t = Math.min(1, (now - t0) / 520);
      const e = 1 - Math.pow(1 - t, 2.1);
      const x = a.x + (b.x - a.x) * e;
      const y = a.y + (b.y - a.y) * e;
      trail.push({ x, y });
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      if (trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
        ctx.strokeStyle = 'rgba(120,210,255,0.35)';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.strokeStyle = 'rgba(230,250,255,0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (t < 1) raf = requestAnimationFrame(step);
      else {
        hitDummy(dummy);
        card.classList.remove('cmp-casting');
        setTimeout(() => ctx.clearRect(0, 0, w, h), 160);
        if (done) done();
      }
    };
    raf = requestAnimationFrame(step);
  }

  function playPixel(done) {
    const mage = $('cmp-pixel-mage');
    playFrames(mage, CAST, 9, (i) => { if (i === 1) flyPixelBolt(null); }, () => {
      if (mage) mage.src = IDLE;
      if (done) done();
    });
  }
  function playPortrait(done) { flyPortraitBolt(done); }
  function playBaked(done) {
    const mage = $('cmp-baked-mage');
    playFrames(mage, BAKED, 8, null, () => { if (mage) mage.src = IDLE; if (done) done(); });
  }
  function playLane(name, done) {
    if (name === 'pixel') return playPixel(done);
    if (name === 'portrait') return playPortrait(done);
    if (name === 'baked') return playBaked(done);
    if (done) done();
  }
  function playAll() {
    if (busy) return;
    busy = true;
    let left = 3;
    const one = () => { left -= 1; if (left <= 0) busy = false; };
    playPixel(one);
    playPortrait(one);
    playBaked(one);
  }

  function loadStills() {
    const pm = $('cmp-pixel-mage');
    const pd = $('cmp-pixel-dummy');
    const pi = $('cmp-portrait-img');
    const pdd = $('cmp-portrait-dummy');
    const bm = $('cmp-baked-mage');
    const bd = $('cmp-baked-dummy');
    if (pm) pm.src = IDLE;
    if (pd) pd.src = DUMMY;
    if (pi) pi.src = PORTRAIT;
    if (pdd) pdd.src = DUMMY;
    if (bm) bm.src = IDLE;
    if (bd) bd.src = DUMMY;
    const bolt = $('cmp-pixel-bolt');
    if (bolt) { bolt.src = BOLT; bolt.style.display = 'none'; }
    ensurePack();
  }

  function openTestCompare(start) {
    if (typeof hideAllMainScreens === 'function') hideAllMainScreens();
    document.getElementById('end-modal')?.classList.add('hidden');
    const el = $('test-compare');
    if (el) el.classList.remove('hidden');
    loadStills();
    const list = (typeof allSpecsFlat === 'function') ? allSpecsFlat() : [];
    const want = start || { classId: 'monk', specId: 'brewmaster' };
    const found = list.find((s) => s.classId === want.classId && s.specId === want.specId)
      || list.find((s) => s.classId === 'monk' && s.specId === 'brewmaster')
      || list[0]
      || { classId: 'monk', specId: 'brewmaster', className: 'Монах', specName: 'Хмелевар', role: 'tank' };
    setDummyN(dummyN);
    setPick(found);
  }

  function closeCompare() {
    if (raf) cancelAnimationFrame(raf);
    if (aoeRaf) cancelAnimationFrame(aoeRaf);
    raf = 0;
    aoeRaf = 0;
    busy = false;
    aoeBusy = false;
    if (typeof openTestHub === 'function') openTestHub();
  }

  function bind() {
    $('btn-cmp-cast')?.addEventListener('click', playAll);
    $('btn-cmp-hub')?.addEventListener('click', closeCompare);
    document.querySelectorAll('[data-cmp-n]').forEach((b) => {
      b.addEventListener('click', () => setDummyN(+b.getAttribute('data-cmp-n')));
    });
    document.querySelectorAll('[data-cmp-one]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (busy) return;
        busy = true;
        playLane(btn.getAttribute('data-cmp-one'), () => { busy = false; });
      });
    });
    document.addEventListener('keydown', (e) => {
      const box = $('test-compare');
      if (!box || box.classList.contains('hidden')) return;
      if (e.key === 'Escape') { closeCompare(); return; }
      if (e.key >= '1' && e.key <= '9') {
        const bar = $('cmp-ability-bar');
        const btns = bar ? bar.querySelectorAll('.ability') : [];
        const idx = +e.key - 1;
        if (btns[idx]) { e.preventDefault(); btns[idx].click(); }
      }
    });
  }

  window.openTestCompare = openTestCompare;

  try { bind(); } catch (err) { console.error('[compare]', err); }
})();
