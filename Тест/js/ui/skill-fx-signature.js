/* ui/skill-fx-signature: фирменные ролики ключевых способностей (2–3+ на спек) по образцу шамана.
 * SIG — «класс:id способности» → рецепт. Рецепты собраны из помощников fx.js (shamEl, shamLinkLine, laterRm,
 * unitCenter, playChainHopFx…) и цвета школы (--fxc / --fxl в css/theme-controls.css).
 * Вызывается из playSkillAnim до общих примитивов; у шамана свой playShamanSkillFx; на 3–4× не играет (короткая версия).
 */
(function () {
  'use strict';

  const SIG = {
    // Воин
    'warrior:colossus': 'quake', 'warrior:whirlwind': 'whirl', 'warrior:charge': 'dash',
    'warrior:bt': 'drain', 'warrior:thunder': 'quake', 'warrior:revenge': 'whirl',
    // Паладин
    'paladin:holy_shock': 'smite', 'paladin:holy_radiance': 'blossom', 'paladin:light_dawn': 'blossom',
    'paladin:avengers': 'bounce', 'paladin:consecrate': 'pool', 'paladin:judgment': 'smite',
    'paladin:hot_w': 'lance', 'paladin:divine_storm': 'whirl', 'paladin:templar': 'quake',
    // Охотник
    'hunter:kill_cmd': 'pounce', 'hunter:dire': 'pounce', 'hunter:multi': 'fan',
    'hunter:aimed': 'lance', 'hunter:chimera': 'lance', 'hunter:barrage': 'skyfall', 'hunter:kill_shot': 'lance',
    'hunter:explosive': 'lob', 'hunter:explosive_trap': 'lob', 'hunter:black_arrow': 'sigil',
    // Разбойник
    'rogue:fan': 'fan', 'rogue:vendetta': 'sigil', 'rogue:garrote': 'sigil',
    'rogue:killing_spree': 'dash', 'rogue:blade_flurry': 'whirl', 'rogue:ambush': 'dash', 'rogue:shadow_dance': 'portal',
    // Жрец
    'priest:penance': 'channel', 'priest:heaven_shield': 'blossom', 'priest:holy_fire': 'smite',
    'priest:circle': 'blossom', 'priest:poh': 'blossom', 'priest:holy_word': 'smite',
    'priest:mind_flay': 'channel', 'priest:mind_blast': 'lance', 'priest:vt': 'drain',
    'priest:shadowfiend': 'portal', 'priest:mind_sear': 'quake',
    // Рыцарь смерти
    'deathknight:death_strike': 'drain', 'deathknight:blood_boil': 'quake', 'deathknight:dnd': 'pool',
    'deathknight:howling': 'quake', 'deathknight:soul_reaper': 'sigil',
    'deathknight:death_coil': 'lance', 'deathknight:outbreak': 'quake', 'deathknight:summon_garg': 'portal',
    // Маг
    'mage:abarr': 'volley', 'mage:am': 'volley', 'mage:ae': 'quake',
    'mage:pyroblast': 'meteor', 'mage:flamestrike': 'smite', 'mage:living_bomb': 'sigil',
    'mage:frozen_orb': 'orbroll', 'mage:ice_lance': 'lance', 'mage:blizzard': 'skyfall',
    // Чернокнижник
    'warlock:agony': 'sigil', 'warlock:ua': 'sigil', 'warlock:haunt': 'lance', 'warlock:drain_soul': 'drain',
    'warlock:hand_guldan': 'skyfall', 'warlock:soul_fire': 'meteor', 'warlock:felstorm': 'whirl',
    'warlock:chaos_bolt': 'meteor', 'warlock:rain_fire': 'skyfall', 'warlock:conflag': 'smite', 'warlock:immolate': 'sigil',
    // Монах
    'monk:keg_smash': 'lob', 'monk:breath': 'channel', 'monk:sck': 'whirl',
    'monk:renewing': 'bounce', 'monk:uft': 'blossom', 'monk:revival': 'blossom', 'monk:enveloping': 'sigil',
    'monk:rsk': 'quake', 'monk:touch_death': 'sigil', 'monk:xuen': 'portal',
    // Друид
    'druid:starsurge': 'meteor', 'druid:starfall': 'skyfall', 'druid:moonfire': 'smite', 'druid:sunfire': 'smite',
    'druid:thrash': 'quake', 'druid:ferocious': 'pounce', 'druid:rake': 'sigil',
    'druid:lacerate': 'sigil', 'druid:mangle': 'pounce',
    'druid:wg': 'blossom', 'druid:tranq': 'blossom', 'druid:lifebloom': 'sigil', 'druid:swiftmend': 'smite',
    // Инженер
    'engineer:rivet_gun': 'volley', 'engineer:call_siege_walker': 'portal',
    'engineer:sticky_bomb': 'lob', 'engineer:cluster_bomb': 'lob', 'engineer:rocket_barrage': 'skyfall', 'engineer:demolish': 'quake',
    'engineer:death_ray': 'channel', 'engineer:rocket_chicken': 'lob', 'engineer:zap_gun': 'lance', 'engineer:world_destroyer': 'portal',
    // Охотник на демонов
    'demonhunter:soul_cleave': 'drain', 'demonhunter:fel_devastation': 'channel', 'demonhunter:immolation_aura': 'quake',
    'demonhunter:eye_beam': 'channel', 'demonhunter:blade_dance': 'whirl', 'demonhunter:fel_rush': 'dash', 'demonhunter:throw_glaive': 'bounce',
  };

  function pt(t) { return t && t.uid ? unitCenter(t.uid) : null; }
  function qb(a, c, b, t) {
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
  }
  /** Полёт по дуге (контрольная точка выше середины на lift), со следом. */
  function arcFly(layer, cls, a, b, lift, ms, onDone, trailCls) {
    const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - lift };
    const el = shamEl(layer, cls, a.x, a.y);
    const frames = [];
    for (let i = 0; i <= 12; i++) {
      const p = qb(a, c, b, i / 12);
      frames.push({ transform: 'translate(' + (p.x - a.x) + 'px,' + (p.y - a.y) + 'px)' });
    }
    el.animate(frames, { duration: ms, easing: 'cubic-bezier(.4,0,.8,.6)', fill: 'forwards' });
    if (trailCls) {
      for (let i = 1; i < 12; i++) {
        setTimeout(() => {
          const p = qb(a, c, b, i / 12);
          laterRm(shamEl(layer, trailCls, p.x, p.y), 440);
        }, (ms * i) / 12);
      }
    }
    setTimeout(() => { el.remove(); if (onDone) onDone(); }, ms);
  }
  /** Прямой полёт с поворотом по направлению. */
  function lineFly(layer, cls, a, b, ms, onDone) {
    const el = shamEl(layer, cls, a.x, a.y);
    const dx = b.x - a.x, dy = b.y - a.y;
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    el.animate([
      { transform: 'translate(0,0) rotate(' + ang + 'deg)' },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + ang + 'deg)' },
    ], { duration: ms, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
    setTimeout(() => { el.remove(); if (onDone) onDone(); }, ms);
  }
  function stagger(list, step, fn) {
    list.forEach((t, i) => setTimeout(() => { const to = pt(t); if (to) fn(t, to, i); }, i * step));
    return Math.max(0, list.length - 1) * step;
  }
  function allyList(c) {
    if (c.list.length) return c.list;
    try { return (run && run.party || []).filter(p => p && p.alive && !p.isPet); } catch (_) { return []; }
  }
  const CHAIN_OF = { holy: 'holy', heal: 'heal', nature: 'nature', fel: 'nature', chi: 'chi', fire: 'fire', frost: 'frost' };

  const R = {
    // Метеор: сгусток над кастером → дуга со следом → взрыв, выжженная земля, встряска
    meteor(c) {
      const t = c.list[0], to = pt(t);
      if (!to) return 0;
      const a = { x: c.from.x, y: c.from.y - 52 };
      laterRm(shamEl(c.layer, 'sig-charge' + c.sc, a.x, a.y), 420);
      setTimeout(() => arcFly(c.layer, 'sig-meteor' + c.sc, a, to, 90, 520, () => {
        c.hit(t, to, 'explode');
        laterRm(shamEl(c.layer, 'sig-scorch' + c.sc, to.x, to.y + 18), 900);
        laterRm(shamEl(c.layer, 'fx-wave' + c.sc, to.x, to.y), 760);
        try { shakeArena(5); } catch (_) {}
      }, 'sig-trail' + c.sc), 160);
      return 160 + 520 + 760;
    },
    // Копьё: тонкий быстрый снаряд, осколки на цели
    lance(c) {
      const span = stagger(c.list, 90, (t, to) => {
        lineFly(c.layer, 'sig-lance' + c.sc, c.from, to, 210, () => c.hit(t, to, 'shard'));
      });
      return span + 210 + 620;
    },
    // Залп: четыре болта веером в каждую цель
    volley(c) {
      const span = stagger(c.list, 120, (t, to) => {
        for (let k = 0; k < 4; k++) {
          setTimeout(() => {
            const off = { x: to.x + (k - 1.5) * 9, y: to.y + (k % 2 ? 7 : -7) };
            lineFly(c.layer, 'sig-bolt' + c.sc, c.from, off, 250, () => {
              if (k === 0) c.hit(t, to);
              else laterRm(shamEl(c.layer, 'fx-flash' + c.sc, off.x, off.y), 420);
            });
          }, k * 60);
        }
      });
      return span + 180 + 250 + 600;
    },
    // Катящийся шар: проходит сквозь ряд целей, осколки на каждой
    orbroll(c) {
      const pts = c.list.map(t => ({ t, p: pt(t) })).filter(o => o.p).sort((a, b) => a.p.x - b.p.x);
      if (!pts.length) return 0;
      const path = [c.from].concat(pts.map(o => o.p));
      const last = path[path.length - 1];
      path.push({ x: last.x + 70, y: last.y });
      const seg = [];
      let total = 0;
      for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y); seg.push(d); total += d; }
      const ms = Math.max(700, Math.min(1500, total * 2.2));
      const el = shamEl(c.layer, 'sig-orb' + c.sc, c.from.x, c.from.y);
      let acc = 0;
      const frames = [{ transform: 'translate(0,0)', offset: 0 }];
      for (let i = 1; i < path.length; i++) {
        acc += seg[i - 1];
        frames.push({ transform: 'translate(' + (path[i].x - c.from.x) + 'px,' + (path[i].y - c.from.y) + 'px)', offset: acc / total });
      }
      el.animate(frames, { duration: ms, easing: 'linear', fill: 'forwards' });
      laterRm(el, ms);
      acc = 0;
      pts.forEach((o, i) => {
        acc += seg[i];
        setTimeout(() => { c.hit(o.t, o.p, 'shard'); }, (acc / total) * ms);
      });
      return ms + 500;
    },
    // Падение с неба: по три снаряда на каждую цель
    skyfall(c) {
      const span = stagger(c.list, 80, (t, to) => {
        for (let k = 0; k < 3; k++) {
          setTimeout(() => {
            const dx = (k - 1) * 18 + (Math.random() * 10 - 5);
            const a = { x: to.x + dx * 1.6, y: to.y - 160 };
            const b = { x: to.x + dx * 0.4, y: to.y };
            lineFly(c.layer, 'sig-fall' + c.sc, a, b, 300, () => {
              if (k === 0) c.hit(t, to);
              else laterRm(shamEl(c.layer, 'fx-flash' + c.sc, b.x, b.y), 420);
            });
          }, k * 90);
        }
      });
      return span + 180 + 300 + 600;
    },
    // Волна по земле: от кастера по ряду; одна цель — удар в землю с трещинами
    quake(c) {
      if (c.list.length <= 1) {
        const t = c.list[0], to = pt(t);
        if (!to) return 0;
        laterRm(shamEl(c.layer, 'sig-quake' + c.sc, to.x, to.y + 20), 900);
        [-25, 15, 60].forEach((rot) => {
          const cr = shamEl(c.layer, 'fx-crack' + c.sc, to.x, to.y + 18);
          cr.style.rotate = rot + 'deg';
          laterRm(cr, 700);
        });
        c.hit(t, to, 'burst');
        try { shakeArena(4); } catch (_) {}
        return 900;
      }
      laterRm(shamEl(c.layer, 'sig-quake' + c.sc, c.from.x, c.from.y + 20), 900);
      const sorted = c.list.slice().sort((a, b) => {
        const pa = pt(a), pb = pt(b);
        return (pa ? Math.hypot(pa.x - c.from.x, pa.y - c.from.y) : 0) - (pb ? Math.hypot(pb.x - c.from.x, pb.y - c.from.y) : 0);
      });
      const span = sorted.reduce((ms, t, i) => {
        setTimeout(() => {
          const to = pt(t);
          if (!to) return;
          laterRm(shamEl(c.layer, 'sig-dust' + c.sc, to.x, to.y + 22), 760);
          laterRm(shamEl(c.layer, 'fx-crack' + c.sc, to.x, to.y + 20), 700);
          c.hit(t, to);
        }, 120 + i * 100);
        return 120 + i * 100;
      }, 0);
      try { shakeArena(3); } catch (_) {}
      return span + 760;
    },
    // Луч: держится, три импульса бегут к цели
    channel(c) {
      const t = c.list[0], to = pt(t);
      if (!to) return 0;
      c.list.slice(0, 5).forEach((u) => {
        const p = pt(u);
        if (p) shamLinkLine(c.layer, c.from.x, c.from.y, p.x, p.y, 'sig-channel' + c.sc, 1000);
      });
      for (let k = 0; k < 3; k++) {
        setTimeout(() => {
          lineFly(c.layer, 'sig-pulse' + c.sc, c.from, to, 260, () => {
            if (k === 0) c.list.forEach((u) => { const p = pt(u); if (p) c.hit(u, p); });
            else laterRm(shamEl(c.layer, 'fx-flash' + c.sc, to.x, to.y), 420);
          });
        }, k * 240);
      }
      return 1000;
    },
    // Вытягивание жизни: удар, нить и капли от цели к кастеру
    drain(c) {
      const t = c.list[0], to = pt(t);
      if (!to) return 0;
      c.hit(t, to, 'hit');
      shamLinkLine(c.layer, to.x, to.y, c.from.x, c.from.y, 'sig-tether' + c.sc, 900);
      for (let k = 0; k < 8; k++) {
        setTimeout(() => lineFly(c.layer, 'sig-drop' + c.sc, to, c.from, 380), 80 + k * 70);
      }
      setTimeout(() => laterRm(shamEl(c.layer, 'sig-absorb' + c.sc, c.from.x, c.from.y), 700), 520);
      return 1100;
    },
    // Столб с неба на каждую цель
    smite(c) {
      const span = stagger(c.list, 90, (t, to) => {
        laterRm(shamEl(c.layer, 'sig-column' + c.sc, to.x, to.y), 720);
        setTimeout(() => {
          c.hit(t, to);
          laterRm(shamEl(c.layer, 'fx-wave' + c.sc, to.x, to.y), 760);
        }, 170);
      });
      return span + 170 + 760;
    },
    // Вихрь клинков вокруг кастера, порезы на целях
    whirl(c) {
      laterRm(shamEl(c.layer, 'sig-whirl' + c.sc, c.from.x, c.from.y), 820);
      const span = c.list.reduce((ms, t, i) => {
        setTimeout(() => {
          const to = pt(t);
          if (!to) return;
          [-40, 30].forEach((rot) => {
            const b = shamEl(c.layer, 'fx-blade' + c.sc, to.x, to.y);
            b.style.setProperty('--rot', rot + 'deg');
            laterRm(b, 420);
          });
          c.hit(t, to);
        }, 160 + i * 70);
        return 160 + i * 70;
      }, 0);
      return span + 820;
    },
    // Веер ножей: во все стороны и по ножу в каждую цель
    fan(c) {
      for (let k = 0; k < 10; k++) {
        const ang = (k / 10) * Math.PI * 2;
        lineFly(c.layer, 'sig-knife' + c.sc, c.from, { x: c.from.x + Math.cos(ang) * 86, y: c.from.y + Math.sin(ang) * 86 }, 300);
      }
      const span = stagger(c.list, 50, (t, to) => {
        lineFly(c.layer, 'sig-knife' + c.sc, c.from, to, 260, () => c.hit(t, to));
      });
      return span + 260 + 600;
    },
    // Руна на цели (проклятия, доты, метки)
    sigil(c) {
      const span = stagger(c.list, 90, (t, to) => {
        laterRm(shamEl(c.layer, 'sig-sigil' + c.sc, to.x, to.y), 1000);
        setTimeout(() => c.hit(t, to), 260);
      });
      return span + 1000;
    },
    // Лужа под врагами
    pool(c) {
      const span = stagger(c.list, 60, (t, to) => {
        laterRm(shamEl(c.layer, 'sig-pool' + c.sc, to.x, to.y + 22), 1100);
        for (let k = 0; k < 4; k++) {
          const m = shamEl(c.layer, 'fx-mote' + c.sc, to.x + (Math.random() * 50 - 25), to.y + 20);
          m.style.setProperty('--mx', (Math.random() * 10 - 5) + 'px');
          m.style.setProperty('--my', (-26 - Math.random() * 20) + 'px');
          m.style.animationDelay = (120 + k * 90) + 'ms';
          laterRm(m, 1100);
        }
        setTimeout(() => c.hit(t, to), 200);
      });
      return span + 1100;
    },
    // Бросок зверя: рывок-полоса и когти
    pounce(c) {
      const t = c.list[0], to = pt(t);
      if (!to) return 0;
      shamLinkLine(c.layer, c.from.x, c.from.y, to.x, to.y, 'sig-pounce' + c.sc, 360);
      setTimeout(() => {
        laterRm(shamEl(c.layer, 'fx-claw' + c.sc, to.x, to.y), 520);
        c.hit(t, to);
      }, 160);
      return 760;
    },
    // Цветение исцеления: кольцо от кастера, лепестки и плюс на каждом союзнике
    blossom(c) {
      const allies = allyList(c);
      laterRm(shamEl(c.layer, 'sig-bloom' + c.sc, c.from.x, c.from.y), 1000);
      const span = stagger(allies, 80, (t, to) => {
        for (let k = 0; k < 5; k++) {
          const pe = shamEl(c.layer, 'sig-petal' + c.sc, to.x + (Math.random() * 34 - 17), to.y + 8);
          pe.style.setProperty('--mx', (Math.random() * 28 - 14) + 'px');
          pe.style.setProperty('--my', (-34 - Math.random() * 26) + 'px');
          pe.style.setProperty('--rot', (Math.random() * 360) + 'deg');
          pe.style.animationDelay = (k * 50) + 'ms';
          laterRm(pe, 1000);
        }
        c.hit(t, to);
      });
      return span + 1000;
    },
    // Рывок: полоса от кастера к цели (Череда убийств — по всем целям подряд)
    dash(c) {
      let prev = c.from;
      const span = c.list.reduce((ms, t, i) => {
        const start = prev;
        const to = pt(t);
        if (!to) return ms;
        prev = to;
        setTimeout(() => {
          shamLinkLine(c.layer, start.x, start.y, to.x, to.y, 'sig-dash' + c.sc, 320);
          laterRm(shamEl(c.layer, 'fx-wave' + c.sc, to.x, to.y), 760);
          c.hit(t, to);
        }, i * 150);
        return i * 150;
      }, 0);
      return span + 760;
    },
    // Навесная бомба: дуга вверх и взрыв с дымом
    lob(c) {
      const span = stagger(c.list, 110, (t, to) => {
        arcFly(c.layer, 'sig-bomb' + c.sc, c.from, to, 150, 560, () => {
          c.hit(t, to, 'explode');
          laterRm(shamEl(c.layer, 'sig-smoke' + c.sc, to.x, to.y), 900);
          try { shakeArena(3); } catch (_) {}
        });
      });
      return span + 560 + 800;
    },
    // Портал призыва у кастера; если есть цель — удар после вспышки
    portal(c) {
      laterRm(shamEl(c.layer, 'sig-portal' + c.sc, c.from.x, c.from.y + 18), 1100);
      setTimeout(() => c.burst(c.from.x, c.from.y, 'burst'), 380);
      if (c.list.length) {
        setTimeout(() => stagger(c.list, 70, (t, to) => c.hit(t, to)), 520);
        return 520 + Math.max(0, c.list.length - 1) * 70 + 700;
      }
      return 1100;
    },
    // Отскок: живая цепь от цели к цели
    bounce(c) {
      const pal = CHAIN_OF[c.school] || 'holy';
      const isHeal = c.school === 'heal' || /^heal/.test(c.type);
      return playChainHopFx(c.layer, c.from, c.list, { school: pal, isHeal, pal, hitPulse: c.pulse })
        || estimateChainAnimMs(Math.max(1, c.list.length));
    },
  };

  /** ctx: layer, from, list, ability, actor, school, impact, type, hit(t, to, impact), burst(x, y, impact), pulse(t). Возвращает мс или 0. */
  function playSignatureFx(ctx) {
    const a = ctx && ctx.actor;
    if (!a || a.side !== 'ally' || a.isPet || a.classId === 'shaman') return 0;
    const kind = SIG[a.classId + ':' + ((ctx.ability && ctx.ability.id) || '')];
    const recipe = kind && R[kind];
    if (!recipe) return 0;
    const c = Object.assign({}, ctx, { sc: ' school-' + (ctx.school || 'physical'), list: (ctx.list || []).filter(Boolean) });
    return recipe(c) || 0;
  }

  window.SKILL_FX_SIGNATURE = SIG;
  window.playSignatureFx = playSignatureFx;
})();
