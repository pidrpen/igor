/* test-room/sprites: 2D-спрайты + проигрыватель
 *
 * Idle статичный. Крылья Гнева: по ХОДАМ (buffTurns), не по таймеру.
 * Ход = скилл, который тратит ход (!freeAction). freeAction не жрёт ходы крыльев.
 */
  const SPRITE_BASE = (function () {
    try {
      const el = document.querySelector('script[src*="test-room/sprites.js"]');
      if (el && el.src) return new URL('../../assets/sprites/', el.src).href;
    } catch (_) { /* ignore */ }
    try { return new URL('assets/sprites/', document.baseURI || location.href).href; } catch (_) { /* ignore */ }
    return 'assets/sprites/';
  })();

  const SPRITE_PACKS = {
    'enemy:evil_spirit': {
      id: 'evil_spirit',
      label: 'Злой дух',
      folder: 'characters/evil_spirit',
      mirror: false,
      style: 'v02-16bit',
      anims: {
        idle: { prefix: 'idle_', count: 1, fps: 1, loop: false },
        attack: { prefix: 'attack_', count: 6, fps: 11, loop: false },
      },
      skills: {},
    },
    'paladin:retribution': {
      id: 'paladin_retribution',
      label: 'Паладин — Воздаяние',
      folder: 'characters/paladin_retribution',
      mirror: false,
      style: 'v02-16bit',
      anims: {
        idle: { prefix: 'idle_', count: 1, fps: 1, loop: false },
        idle_winged: { prefix: 'idle_winged_', count: 1, fps: 1, loop: false },
        wing_in: { prefix: 'wing_in_', count: 6, fps: 12, loop: false },
        wing_out: { prefix: 'wing_out_', count: 6, fps: 12, loop: false },
        attack: { prefix: 'attack_', count: 6, fps: 11, loop: false },
        attack_winged: { prefix: 'attack_winged_', count: 6, fps: 11, loop: false },
      },
      skills: {
        crusader: 'attack',
        judgment: 'attack',
        templar: 'attack',
        divine_storm: 'attack',
        hot_w: 'attack',
        inquisition: 'attack',
        avenging: 'wing_in',
      },
      avengingId: 'avenging',
      noLunge: new Set(['inquisition', 'avenging']),
    },
  };

  const DEFAULT_ENEMY_KEY = 'enemy:evil_spirit';

  function spriteKey(classId, specId) {
    return classId + ':' + specId;
  }

  function hasSpritePack(classId, specId) {
    return !!SPRITE_PACKS[spriteKey(classId, specId)];
  }

  function getHeroSpritePack(classId, specId) {
    return SPRITE_PACKS[spriteKey(classId, specId)] || null;
  }

  function getEnemySpritePack() {
    return SPRITE_PACKS[DEFAULT_ENEMY_KEY];
  }

  function getSpecAbilities(classId, specId) {
    const classes = (window.WOW_MOP && WOW_MOP.classes) || [];
    const cls = classes.find(c => c.id === classId);
    if (!cls) return [];
    const spec = (cls.specs || []).find(s => s.id === specId);
    return (spec && spec.abilities) ? spec.abilities.slice() : [];
  }

  function frameUrl(pack, animName, index) {
    const anim = pack.anims[animName];
    if (!anim) return null;
    const i = String(index).padStart(2, '0');
    return SPRITE_BASE + pack.folder + '/' + anim.prefix + i + '.png?v=v04';
  }

  function preloadPack(pack) {
    if (!pack || pack._preloaded) return;
    pack._preloaded = true;
    for (const name of Object.keys(pack.anims)) {
      const anim = pack.anims[name];
      for (let i = 0; i < anim.count; i++) {
        const img = new Image();
        img.src = frameUrl(pack, name, i);
      }
    }
  }

  function resolveSkillAnim(pack, abilityId, hasWings) {
    if (!pack) return 'idle';
    if (abilityId === (pack.avengingId || 'avenging')) return 'wing_in';
    let key = (pack.skills && pack.skills[abilityId]) || null;
    if (!key) {
      const sk = 'skill_' + abilityId;
      if (pack.anims && pack.anims[sk]) key = sk;
    }
    if (!key) key = pack.anims && pack.anims.attack ? 'attack' : 'idle';
    if (hasWings && key === 'attack' && pack.anims.attack_winged) key = 'attack_winged';
    return key;
  }

  function skillHasCustomAnim(pack, abilityId) {
    if (!pack) return false;
    if (abilityId === (pack.avengingId || 'avenging')) return true;
    if (pack.anims && pack.anims['skill_' + abilityId]) return true;
    const mapped = pack.skills && pack.skills[abilityId];
    return !!(mapped && mapped !== 'attack' && pack.anims && pack.anims[mapped]);
  }

  function createSpritePlayer(imgEl, pack, fallbackSrc) {
    let timer = null;
    let current = 'idle';
    let frame = 0;
    let onDone = null;
    let hasWings = false;
    let wingsLeaving = false;
    /** Сколько ХОДОВ крыльев осталось (как buffTurns в игре). */
    let wingsTurnsLeft = 0;
    let suppressAutoIdle = false;

    if (imgEl && pack) {
      imgEl.classList.toggle('mirror', !!pack.mirror);
    }

    function clearTimer() {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    }

    function showFallback() {
      clearTimer();
      if (fallbackSrc) imgEl.src = fallbackSrc;
      imgEl.classList.remove('test-sprite-img');
      imgEl.classList.add('test-sprite-placeholder');
    }

    function showSpriteFrame(animName, idx) {
      imgEl.classList.remove('test-sprite-placeholder');
      imgEl.classList.add('test-sprite-img');
      const url = frameUrl(pack, animName, idx);
      if (url) imgEl.src = url;
    }

    function buffActive() {
      return hasWings && !wingsLeaving && wingsTurnsLeft > 0;
    }

    function idleKey() {
      if (buffActive() && pack && pack.anims.idle_winged) return 'idle_winged';
      return 'idle';
    }

    function goIdle() {
      suppressAutoIdle = true;
      play(idleKey(), { skipAutoIdle: true, force: true });
      suppressAutoIdle = false;
    }

    function play(animName, opts) {
      opts = opts || {};
      // wing_out нельзя сбить — иначе залипнут крылья
      if (wingsLeaving && animName !== 'wing_out' && !opts.force) {
        const pending = { animName, opts };
        play('wing_out', {
          skipAutoIdle: true,
          force: true,
          onDone: () => {
            hasWings = false;
            wingsLeaving = false;
            wingsTurnsLeft = 0;
            play(pending.animName, pending.opts);
          },
        });
        return;
      }

      onDone = typeof opts.onDone === 'function' ? opts.onDone : null;
      clearTimer();
      current = animName || idleKey();
      frame = 0;

      if (!pack || !pack.anims[current]) {
        showFallback();
        if (onDone) {
          const cb = onDone;
          onDone = null;
          setTimeout(cb, 350);
        }
        return;
      }

      preloadPack(pack);
      const anim = pack.anims[current];
      const played = current;
      showSpriteFrame(played, 0);

      if (!anim.loop && anim.count <= 1) {
        if (onDone) {
          const cb = onDone;
          onDone = null;
          setTimeout(cb, 0);
        }
        return;
      }

      const ms = Math.max(40, Math.round(1000 / (anim.fps || 8)));
      timer = setInterval(() => {
        frame += 1;
        if (frame >= anim.count) {
          if (anim.loop || opts.loop) {
            frame = 0;
            showSpriteFrame(played, frame);
          } else {
            clearTimer();
            const cb = onDone;
            onDone = null;
            if (cb) cb();
            if (!opts.skipAutoIdle && !suppressAutoIdle) {
              const endAnims = { wing_in: 1, wing_out: 1, idle: 1, idle_winged: 1 };
              if (!endAnims[played]) goIdle();
            }
          }
          return;
        }
        showSpriteFrame(played, frame);
      }, ms);
    }

    /** Включить крылья на N ходов (buffTurns). */
    function playAvenging(turns, opts) {
      opts = opts || {};
      const onDoneAll = typeof opts.onDone === 'function' ? opts.onDone : null;
      const n = Math.max(1, turns || 3);

      if (hasWings && !wingsLeaving) {
        // рекаст: обновить длительность
        wingsTurnsLeft = n;
        goIdle();
        if (onDoneAll) setTimeout(onDoneAll, 0);
        return;
      }

      if (wingsLeaving) {
        wingsLeaving = false;
        hasWings = true;
        wingsTurnsLeft = n;
        goIdle();
        if (onDoneAll) setTimeout(onDoneAll, 0);
        return;
      }

      play('wing_in', {
        skipAutoIdle: true,
        force: true,
        onDone: () => {
          hasWings = true;
          wingsLeaving = false;
          wingsTurnsLeft = n;
          goIdle();
          if (onDoneAll) onDoneAll();
        },
      });
    }

    function endWings(after) {
      if (!hasWings) {
        wingsLeaving = false;
        wingsTurnsLeft = 0;
        if (after) after();
        return;
      }
      if (wingsLeaving) {
        if (after) after();
        return;
      }
      wingsLeaving = true;
      wingsTurnsLeft = 0;

      if (!pack || !pack.anims.wing_out) {
        hasWings = false;
        wingsLeaving = false;
        goIdle();
        if (after) after();
        return;
      }

      play('wing_out', {
        skipAutoIdle: true,
        force: true,
        onDone: () => {
          hasWings = false;
          wingsLeaving = false;
          wingsTurnsLeft = 0;
          suppressAutoIdle = true;
          play('idle', { skipAutoIdle: true, force: true });
          suppressAutoIdle = false;
          if (after) after();
        },
      });
    }

    /**
     * После действия героя: если скилл тратит ход (!freeAction) — −1 ход крыльев.
     * При 0 → wing_out.
     * ability: объект скилла (freeAction / buffTurns).
     */
    function playSkill(abilityId, opts) {
      opts = opts || {};
      const ability = opts.ability || null;
      const avId = (pack && pack.avengingId) || 'avenging';
      const free = !!(ability && (ability.freeAction || ability.fa));

      if (abilityId === avId && pack && pack.anims.wing_in) {
        const turns = (ability && (ability.buffTurns != null ? ability.buffTurns : ability.bt)) || 3;
        return playAvenging(+turns, opts);
      }

      const key = resolveSkillAnim(pack, abilityId, buffActive());
      return play(key, {
        skipAutoIdle: opts.skipAutoIdle,
        force: opts.force,
        onDone: () => {
          // после экшена, который тратит ход — тик баффа крыльев
          if (buffActive() && !free) {
            wingsTurnsLeft = Math.max(0, wingsTurnsLeft - 1);
            if (wingsTurnsLeft <= 0) {
              endWings(() => {
                if (opts.onDone) opts.onDone({ wingsLeft: 0 });
              });
              return;
            }
          }
          if (!opts.skipAutoIdle) goIdle();
          if (opts.onDone) opts.onDone({ wingsLeft: wingsTurnsLeft });
        },
      });
    }

    function stop() {
      clearTimer();
      onDone = null;
    }

    function destroy() {
      stop();
      hasWings = false;
      wingsLeaving = false;
      wingsTurnsLeft = 0;
    }

    if (pack) play('idle', { skipAutoIdle: true, force: true });
    else showFallback();

    return {
      play,
      playSkill,
      playAvenging,
      endWings,
      goIdle,
      stop,
      destroy,
      get anim() { return current; },
      get wings() { return hasWings && !wingsLeaving; },
      get wingsTurns() { return wingsTurnsLeft; },
      pack,
    };
  }
