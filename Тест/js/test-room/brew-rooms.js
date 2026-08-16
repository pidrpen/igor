/* test-room: тушь, планы, спрайт Хмелевара */
(function () {
  const NES = 'assets/sprites/characters/monk_brew_nes/';
  const PX = 'assets/style-lab/monk/brew-pixel/';
  const DUMMY = 'assets/sprites/fx/dummy_spirit.png';
  const STYLES = [
    {
      id: 'nes',
      title: '8-bit',
      idle: PX + 'idle_nes.png',
      jab: true,
      text: 'Боевая стойка. Джаб вперёд. Бочонок летит до духа и разбивается.',
    },
    {
      id: 'snes',
      title: 'Мелкий пиксель',
      idle: PX + 'idle_snes.png',
      jab: false,
      text: 'Полный рост, но это пиксель-живопись, не 48 пикселей в высоту.',
    },
    {
      id: 'outline',
      title: 'Обводка',
      idle: PX + 'idle_outline.png',
      jab: false,
      text: 'Почти тот же мелкий пиксель, контур чуть жёстче. Джаба нет.',
    },
    {
      id: 'detail',
      title: 'Детальный',
      idle: PX + 'idle_detail.png',
      jab: false,
      text: 'Ещё мельче и живописнее. Для выбора стиля, не для боя.',
    },
  ];
  const JAB = [0, 1, 2, 3, 4].map((i) => NES + 'jab_' + String(i).padStart(2, '0') + '.png');
  const KEG = [0, 1, 2, 3, 4].map((i) => NES + 'keg_' + String(i).padStart(2, '0') + '.png');

  let style = STYLES[0];
  let busy = false;

  function $(id) { return document.getElementById(id); }

  function setNote(t) {
    const el = $('brew-note');
    if (el) el.textContent = t;
  }

  function showIdle() {
    const img = $('brew-actor');
    if (img) img.src = style.idle;
    const jab = $('btn-brew-jab');
    const keg = $('btn-brew-keg');
    if (jab) jab.disabled = !style.jab;
    if (keg) keg.disabled = !style.jab;
    setNote(style.text + (style.jab ? ' Пробел — джаб. Б — бочонок.' : ''));
  }

  function renderStyles() {
    const box = $('brew-styles');
    if (!box) return;
    box.innerHTML = STYLES.map((s) => (
      '<button type="button" class="brew-style' + (s.id === style.id ? ' on' : '') +
      '" data-id="' + s.id + '">' + s.title + '</button>'
    )).join('');
    box.querySelectorAll('.brew-style').forEach((b) => {
      b.addEventListener('click', () => {
        if (busy) return;
        style = STYLES.find((s) => s.id === b.dataset.id) || STYLES[0];
        renderStyles();
        showIdle();
      });
    });
  }

  function hitDummy() {
    const dummy = $('brew-dummy');
    if (!dummy) return;
    dummy.classList.remove('cmp-hit');
    void dummy.offsetWidth;
    dummy.classList.add('cmp-hit');
    setTimeout(() => dummy.classList.remove('cmp-hit'), 380);
  }

  function playHit(kind) {
    const stage = $('brew-stage');
    const canvas = $('brew-fx');
    const dummy = $('brew-dummy');
    if (!stage || !canvas || !dummy) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    canvas.width = Math.max(2, Math.floor(w * dpr));
    canvas.height = Math.max(2, Math.floor(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sr = stage.getBoundingClientRect();
    const dr = dummy.getBoundingClientRect();
    const cx = dr.left + dr.width * 0.45 - sr.left;
    const cy = dr.top + dr.height * 0.42 - sr.top;
    const t0 = performance.now();
    const bits = [];
    const n = kind === 'keg' ? 14 : 8;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      bits.push({
        x: cx, y: cy,
        vx: Math.cos(a) * (2.2 + Math.random() * 3.4),
        vy: Math.sin(a) * (2.2 + Math.random() * 3.4) - (kind === 'keg' ? 1.2 : 0.4),
        s: kind === 'keg' ? 3 + Math.random() * 4 : 2 + Math.random() * 3,
      });
    }
    const step = (now) => {
      const t = (now - t0) / 420;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const ring = 10 + t * 28;
      ctx.beginPath();
      ctx.arc(cx, cy, ring, 0, Math.PI * 2);
      ctx.strokeStyle = kind === 'keg' ? 'rgba(230,170,70,' + (1 - t) + ')' : 'rgba(255,240,200,' + (1 - t) + ')';
      ctx.lineWidth = kind === 'keg' ? 5 : 3;
      ctx.stroke();
      ctx.fillStyle = kind === 'keg' ? 'rgba(210,140,50,0.9)' : 'rgba(255,255,230,0.95)';
      for (const b of bits) {
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.12;
        ctx.fillRect(b.x, b.y, b.s, b.s);
      }
      if (t < 1) requestAnimationFrame(step);
      else ctx.clearRect(0, 0, w, h);
    };
    requestAnimationFrame(step);
    hitDummy();
  }

  function playSeq(urls, hitAt, hitKind, name) {
    if (busy || !style.jab) return;
    const img = $('brew-actor');
    if (!img) return;
    busy = true;
    setNote(name);
    let i = 0;
    const tick = () => {
      img.src = urls[i];
      if (i === hitAt) playHit(hitKind);
      i += 1;
      if (i >= urls.length) {
        img.src = style.idle;
        busy = false;
        setNote(style.text + ' Пробел — джаб. Б — бочонок.');
        return;
      }
      setTimeout(tick, 120);
    };
    tick();
  }

  function playJab() { playSeq(JAB, 1, 'jab', 'Джаб'); }

  function stagePt(el, ox, oy) {
    const stage = $('brew-stage');
    if (!stage || !el) return { x: 0, y: 0 };
    const s = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width * ox - s.left, y: r.top + r.height * oy - s.top };
  }

  function playKeg() {
    if (busy || !style.jab) return;
    const img = $('brew-actor');
    const dummy = $('brew-dummy');
    const proj = $('brew-keg-proj');
    if (!img || !dummy || !proj) return;
    busy = true;
    setNote('Удар бочонком');
    img.src = KEG[0];
    proj.src = 'assets/sprites/fx/keg_fly.png';
    [0, 1, 2].forEach((i) => {
      const sh = $('brew-keg-s' + i);
      if (sh) {
        sh.src = 'assets/sprites/fx/keg_shard_' + i + '.png';
        sh.style.display = 'none';
      }
    });
    setTimeout(() => {
      img.src = style.idle;
      const a = stagePt(img, 0.86, 0.38);
      const b = stagePt(dummy, 0.42, 0.44);
      proj.style.display = 'block';
      proj.style.left = a.x + 'px';
      proj.style.top = a.y + 'px';
      const t0 = performance.now();
      const dur = 480;
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        const e = 1 - (1 - t) * (1 - t);
        const x = a.x + (b.x - a.x) * e;
        const y = a.y + (b.y - a.y) * e - Math.sin(t * Math.PI) * 18;
        proj.style.left = x + 'px';
        proj.style.top = y + 'px';
        proj.style.transform = 'translate(-50%,-50%) rotate(' + (t * 220) + 'deg)';
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          proj.style.display = 'none';
          playHit('keg');
          const bits = [
            { vx: -2.4, vy: -3.2, rot: -40 },
            { vx: 2.8, vy: -2.6, rot: 55 },
            { vx: 0.4, vy: -4.1, rot: 12 },
          ];
          bits.forEach((bit, i) => {
            const sh = $('brew-keg-s' + i);
            if (!sh) return;
            sh.style.display = 'block';
            let px = x, py = y, rot = bit.rot, n = 0;
            const fly = () => {
              px += bit.vx;
              py += bit.vy;
              bit.vy += 0.22;
              rot += bit.vx * 8;
              sh.style.left = px + 'px';
              sh.style.top = py + 'px';
              sh.style.transform = 'translate(-50%,-50%) rotate(' + rot + 'deg)';
              n += 1;
              if (n < 22) requestAnimationFrame(fly);
              else sh.style.display = 'none';
            };
            requestAnimationFrame(fly);
          });
          setTimeout(() => {
            busy = false;
            setNote(style.text + ' Пробел — джаб. Б — бочонок.');
          }, 380);
        }
      };
      requestAnimationFrame(step);
    }, 160);
  }

  function openInk() {
    if (typeof hideAllMainScreens === 'function') hideAllMainScreens();
    document.getElementById('end-modal')?.classList.add('hidden');
    $('test-ink')?.classList.remove('hidden');
  }

  function openPlans() {
    if (typeof hideAllMainScreens === 'function') hideAllMainScreens();
    document.getElementById('end-modal')?.classList.add('hidden');
    $('test-plans')?.classList.remove('hidden');
  }

  function openBrew() {
    if (typeof hideAllMainScreens === 'function') hideAllMainScreens();
    document.getElementById('end-modal')?.classList.add('hidden');
    $('test-brew')?.classList.remove('hidden');
    const d = $('brew-dummy');
    if (d) d.src = DUMMY;
    style = STYLES[0];
    renderStyles();
    showIdle();
  }

  function bind() {
    $('btn-ink-hub')?.addEventListener('click', () => openTestHub && openTestHub());
    $('btn-plans-hub')?.addEventListener('click', () => openTestHub && openTestHub());
    $('btn-brew-hub')?.addEventListener('click', () => openTestHub && openTestHub());
    $('btn-brew-jab')?.addEventListener('click', playJab);
    $('btn-brew-keg')?.addEventListener('click', playKeg);
    $('plans-to-brew')?.addEventListener('click', () => {
      if (typeof openTestCompare === 'function') openTestCompare({ classId: 'monk', specId: 'brewmaster' });
    });
    $('plans-to-ink')?.addEventListener('click', openInk);
    $('plans-to-anim')?.addEventListener('click', () => {
      if (typeof openTestCompare === 'function') openTestCompare();
    });
    document.addEventListener('keydown', (e) => {
      const brew = $('test-brew');
      if (brew && !brew.classList.contains('hidden')) {
        if (e.code === 'Space') { e.preventDefault(); playJab(); }
        if (e.key === 'b' || e.key === 'B' || e.key === 'и' || e.key === 'И') {
          e.preventDefault();
          playKeg();
        }
        if (e.key === 'Escape' && typeof openTestHub === 'function') openTestHub();
        return;
      }
      const ink = $('test-ink');
      const plans = $('test-plans');
      if ((ink && !ink.classList.contains('hidden')) || (plans && !plans.classList.contains('hidden'))) {
        if (e.key === 'Escape' && typeof openTestHub === 'function') openTestHub();
      }
    });
  }

  window.openInkRoom = openInk;
  window.openPlansRoom = openPlans;
  window.openBrewSprite = openBrew;

  try { bind(); } catch (err) { console.error('[brew-rooms]', err); }
})();
