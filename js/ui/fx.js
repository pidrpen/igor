/* ui/fx: skill VFX, banners, vignette, boss frame */
  function juiceOk() {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && gameSpeed <= 2;
  }
  function flashScreen(crit) {
    if (!juiceOk()) return;
    const el = document.getElementById('screen-flash');
    if (!el) return;
    el.className = crit ? 'crit on' : 'on';
    setTimeout(() => { el.className = ''; }, 60);
  }
  /** Hero card or pet portrait under owner */
  function unitEl(uid) {
    return document.querySelector(`.unit[data-uid="${uid}"], .pet-port[data-uid="${uid}"]`);
  }
  function pulseUnit(uid, cls) {
    if (!juiceOk()) return;
    const el = unitEl(uid);
    if (!el) return;
    // pet portraits only support hit/active styles
    const useCls = el.classList.contains('pet-port') && cls !== 'hit' ? 'hit' : cls;
    el.classList.remove(useCls);
    void el.offsetWidth;
    el.classList.add(useCls);
    const ms = (useCls === 'parried' || useCls === 'blocked' || useCls === 'dodged') ? 560 : 400;
    setTimeout(() => el.classList.remove(useCls), ms);
  }

  /**
   * Visual feedback for tank defense: parry / block / dodge.
   * Ring + slash (parry) or shield dome (block) over the unit portrait.
   */
  function playDefenseFx(uid, kind) {
    if (!uid) return;
    const k = kind === 'block' ? 'block' : (kind === 'dodge' ? 'dodge' : 'parry');
    try { pulseUnit(uid, k === 'block' ? 'blocked' : (k === 'dodge' ? 'dodged' : 'parried')); } catch (_) {}
    try {
      if (k === 'parry') sfx('parry');
      else if (k === 'block') sfx('block');
      else sfx('dodge');
    } catch (_) {}
    if (!juiceOk()) return;
    const layer = document.getElementById('skill-fx-layer');
    const c = unitCenter(uid);
    if (!layer || !c) return;
    const root = document.createElement('div');
    root.className = 'def-fx def-fx-' + k;
    root.style.left = c.x + 'px';
    root.style.top = c.y + 'px';
    // ring
    const ring = document.createElement('div');
    ring.className = 'def-fx-ring';
    root.appendChild(ring);
    if (k === 'parry') {
      // dual steel slash
      for (const rot of [-42, 38]) {
        const s = document.createElement('div');
        s.className = 'def-fx-slash';
        s.style.setProperty('--rot', rot + 'deg');
        root.appendChild(s);
      }
      // sparks
      for (let i = 0; i < 6; i++) {
        const sp = document.createElement('div');
        sp.className = 'def-fx-spark';
        const a = (i / 6) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 28 + Math.random() * 22;
        sp.style.setProperty('--dx', Math.cos(a) * dist + 'px');
        sp.style.setProperty('--dy', Math.sin(a) * dist + 'px');
        sp.style.animationDelay = (i * 18) + 'ms';
        root.appendChild(sp);
      }
    } else if (k === 'block') {
      const sh = document.createElement('div');
      sh.className = 'def-fx-shield';
      root.appendChild(sh);
      for (let i = 0; i < 5; i++) {
        const sp = document.createElement('div');
        sp.className = 'def-fx-spark def-fx-spark-block';
        const a = (-Math.PI / 2) + (i - 2) * 0.45;
        const dist = 24 + Math.random() * 16;
        sp.style.setProperty('--dx', Math.cos(a) * dist + 'px');
        sp.style.setProperty('--dy', Math.sin(a) * dist + 'px');
        sp.style.animationDelay = (i * 20) + 'ms';
        root.appendChild(sp);
      }
    } else {
      // dodge: swoosh arc
      const sw = document.createElement('div');
      sw.className = 'def-fx-swoosh';
      root.appendChild(sw);
    }
    layer.appendChild(root);
    setTimeout(() => root.remove(), 700);
  }

  function unitCenter(uid) {
    const el = unitEl(uid);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, el };
  }

  // ── Skill FX constructor (A) + signature map (B) ──
  const SKILL_FX = {
      // Gnome Engineer — unique jab-style geometric FX per skill
      wrench_bash: { motion: "slash", school: "physical", impact: "hit" },
      rivet_gun: { motion: "pierce", school: "physical", impact: "hit" },
      plasma_cutter: { motion: "beam", school: "arcane", impact: "hit" },
      deploy_turret: { motion: "nova", school: "physical", impact: "splash" },
      overclock: { motion: "orbit", school: "arcane", impact: "hit" },
      emergency_repair: { motion: "swirl", school: "heal", impact: "splash" },
      call_siege_walker: { motion: "slam", school: "physical", impact: "explode" },
      scrap_shot: { motion: "bolt", school: "physical", impact: "hit" },
      shock_wrench: { motion: "slash", school: "arcane", impact: "hit" },
      sticky_bomb: { motion: "arc", school: "fire", impact: "explode" },
      shrapnel_blast: { motion: "nova", school: "fire", impact: "splash" },
      cluster_bomb: { motion: "rain", school: "fire", impact: "explode" },
      deploy_bomb_drone: { motion: "orbit", school: "fire", impact: "splash" },
      rocket_barrage: { motion: "pierce", school: "fire", impact: "explode" },
      remote_charge: { motion: "bolt", school: "fire", impact: "explode" },
      demolish: { motion: "slam", school: "fire", impact: "explode" },
      nitro_boosts: { motion: "swirl", school: "fire", impact: "hit" },
      zap_gun: { motion: "bolt", school: "arcane", impact: "hit" },
      flux_bolt: { motion: "arc", school: "arcane", impact: "splash" },
      death_ray: { motion: "beam", school: "shadow", impact: "drain" },
      rocket_chicken: { motion: "arc", school: "fire", impact: "splash" },
      world_destroyer: { motion: "nova", school: "physical", impact: "explode" },
      shrink_ray: { motion: "beam", school: "arcane", impact: "drain" },
      magnetic_grip: { motion: "orbit", school: "physical", impact: "hit" },
      scrap_swarm: { motion: "swirl", school: "physical", impact: "splash" },

    // Warrior
    mortal_strike: { motion: 'slash', school: 'physical', impact: 'hit' },
    overpower: { motion: 'slash', school: 'physical', impact: 'hit' },
    colossus: { motion: 'slam', school: 'physical', impact: 'explode' },
    execute: { motion: 'slash', school: 'blood', impact: 'explode' },
    whirlwind: { motion: 'swirl', school: 'physical', impact: 'splash' },
    bladestorm: { motion: 'swirl', school: 'physical', impact: 'splash' },
    thunder_clap: { motion: 'nova', school: 'physical', impact: 'splash' },
    shield_slam: { motion: 'slam', school: 'physical', impact: 'hit' },
    revenge: { motion: 'slash', school: 'physical', impact: 'hit' },
    heroic_strike: { motion: 'slash', school: 'physical', impact: 'hit' },
    charge: { motion: 'pierce', school: 'physical', impact: 'hit' },
    pummel: { motion: 'slam', school: 'physical', impact: 'hit' },
    // Paladin
    crusader: { motion: 'slash', school: 'holy', impact: 'hit' },
    templar: { motion: 'slash', school: 'holy', impact: 'explode' },
    judgment: { motion: 'bolt', school: 'holy', impact: 'hit' },
    exorcism: { motion: 'bolt', school: 'holy', impact: 'explode' },
    divine_storm: { motion: 'swirl', school: 'holy', impact: 'splash' },
    holy_shock: { motion: 'bolt', school: 'holy', impact: 'hit' },
    flash_light: { motion: 'beam', school: 'holy', impact: 'hit' },
    holy_light: { motion: 'beam', school: 'holy', impact: 'hit' },
    light_dawn: { motion: 'nova', school: 'holy', impact: 'splash' },
    word_glory: { motion: 'beam', school: 'holy', impact: 'hit' },
    shield_righteous: { motion: 'nova', school: 'holy', impact: 'hit' },
    rebuke: { motion: 'slam', school: 'holy', impact: 'hit' },
    // Hunter
    arcane_shot: { motion: 'bolt', school: 'arcane', impact: 'hit' },
    steady: { motion: 'bolt', school: 'physical', impact: 'hit' },
    aimed: { motion: 'pierce', school: 'physical', impact: 'explode' },
    multi: { motion: 'rain', school: 'physical', impact: 'splash' },
    kill_shot: { motion: 'pierce', school: 'physical', impact: 'explode' },
    kill_cmd: { motion: 'slash', school: 'physical', impact: 'hit' },
    serpent: { motion: 'bolt', school: 'nature', impact: 'hit' },
    black_arrow: { motion: 'bolt', school: 'shadow', impact: 'hit' },
    explosive: { motion: 'bolt', school: 'fire', impact: 'explode' },
    // Rogue
    mutilate: { motion: 'slash', school: 'physical', impact: 'hit' },
    envenom: { motion: 'slash', school: 'nature', impact: 'splash' },
    eviscerate: { motion: 'slash', school: 'physical', impact: 'explode' },
    rupture: { motion: 'slash', school: 'blood', impact: 'hit' },
    garrote: { motion: 'slash', school: 'blood', impact: 'hit' },
    ambush: { motion: 'pierce', school: 'physical', impact: 'explode' },
    sinister: { motion: 'slash', school: 'physical', impact: 'hit' },
    fan_knives: { motion: 'rain', school: 'physical', impact: 'splash' },
    dispatch: { motion: 'slash', school: 'physical', impact: 'explode' },
    kick: { motion: 'slam', school: 'physical', impact: 'hit' },
    // Priest
    smite: { motion: 'bolt', school: 'holy', impact: 'hit' },
    mind_blast: { motion: 'bolt', school: 'shadow', impact: 'hit' },
    mind_spike: { motion: 'bolt', school: 'shadow', impact: 'hit' },
    swp: { motion: 'orbit', school: 'shadow', impact: 'hit' },
    vt: { motion: 'orbit', school: 'shadow', impact: 'drain' },
    devouring: { motion: 'orbit', school: 'shadow', impact: 'drain' },
    mind_flay: { motion: 'beam', school: 'shadow', impact: 'drain' },
    flash_heal: { motion: 'beam', school: 'holy', impact: 'hit' },
    greater_heal: { motion: 'beam', school: 'holy', impact: 'hit' },
    renew: { motion: 'orbit', school: 'holy', impact: 'hit' },
    pw_shield: { motion: 'nova', school: 'holy', impact: 'hit' },
    shield: { motion: 'nova', school: 'holy', impact: 'hit' },
    penance: { motion: 'rain', school: 'holy', impact: 'hit' },
    holy_fire: { motion: 'bolt', school: 'holy', impact: 'explode' },
    // DK
    obliterate: { motion: 'slash', school: 'frost', impact: 'explode' },
    frost_strike: { motion: 'slash', school: 'frost', impact: 'hit' },
    howling: { motion: 'nova', school: 'frost', impact: 'splash' },
    death_coil: { motion: 'bolt', school: 'shadow', impact: 'hit' },
    death_strike: { motion: 'slash', school: 'blood', impact: 'drain' },
    heart: { motion: 'slash', school: 'blood', impact: 'hit' },
    blood_boil: { motion: 'nova', school: 'blood', impact: 'splash' },
    scourge: { motion: 'slash', school: 'shadow', impact: 'hit' },
    festering: { motion: 'slash', school: 'shadow', impact: 'hit' },
    outbreak: { motion: 'bolt', school: 'shadow', impact: 'hit' },
    plague_strike: { motion: 'slash', school: 'shadow', impact: 'hit' },
    mind_freeze: { motion: 'slam', school: 'frost', impact: 'hit' },
    // Shaman
    lightning: { motion: 'chain', school: 'nature', impact: 'hit' },
    chain_light: { motion: 'chain', school: 'nature', impact: 'hit' },
    lava_burst: { motion: 'bolt', school: 'fire', impact: 'explode' },
    flame_shock: { motion: 'bolt', school: 'fire', impact: 'hit' },
    earth_shock: { motion: 'bolt', school: 'nature', impact: 'hit' },
    frost_shock: { motion: 'bolt', school: 'frost', impact: 'hit' },
    lava_lash: { motion: 'slash', school: 'fire', impact: 'explode' },
    stormstrike: { motion: 'slash', school: 'nature', impact: 'hit' },
    healing_wave: { motion: 'beam', school: 'nature', impact: 'hit' },
    riptide: { motion: 'bolt', school: 'nature', impact: 'hit' },
    chain_heal: { motion: 'chain', school: 'nature', impact: 'hit' },
    healing_rain: { motion: 'rain', school: 'nature', impact: 'splash' },
    fire_nova: { motion: 'nova', school: 'fire', impact: 'explode' },
    wind_shear: { motion: 'slash', school: 'nature', impact: 'hit' },
    // Mage
    fireball: { motion: 'bolt', school: 'fire', impact: 'explode' },
    pyroblast: { motion: 'bolt', school: 'fire', impact: 'explode' },
    scorch: { motion: 'bolt', school: 'fire', impact: 'hit' },
    living_bomb: { motion: 'orbit', school: 'fire', impact: 'explode' },
    combust: { motion: 'nova', school: 'fire', impact: 'explode' },
    frostbolt: { motion: 'bolt', school: 'frost', impact: 'hit' },
    ice_lance: { motion: 'pierce', school: 'frost', impact: 'hit' },
    frozen_orb: { motion: 'orbit', school: 'frost', impact: 'splash' },
    blizzard: { motion: 'rain', school: 'frost', impact: 'splash' },
    arcane_blast: { motion: 'bolt', school: 'arcane', impact: 'hit' },
    arcane_missiles: { motion: 'rain', school: 'arcane', impact: 'hit' },
    arcane_barrage: { motion: 'bolt', school: 'arcane', impact: 'explode' },
    arcane_explosion: { motion: 'nova', school: 'arcane', impact: 'splash' },
    counterspell: { motion: 'slam', school: 'arcane', impact: 'hit' },
    // Warlock
    shadow_bolt: { motion: 'bolt', school: 'shadow', impact: 'hit' },
    incinerate: { motion: 'bolt', school: 'fire', impact: 'hit' },
    chaos_bolt: { motion: 'bolt', school: 'fire', impact: 'explode' },
    immolate: { motion: 'orbit', school: 'fire', impact: 'hit' },
    corruption: { motion: 'orbit', school: 'shadow', impact: 'hit' },
    agony: { motion: 'orbit', school: 'shadow', impact: 'drain' },
    ua: { motion: 'orbit', school: 'shadow', impact: 'drain' },
    drain_life: { motion: 'beam', school: 'shadow', impact: 'drain' },
    drain_soul: { motion: 'beam', school: 'shadow', impact: 'drain' },
    hand_guldan: { motion: 'rain', school: 'shadow', impact: 'explode' },
    conflagrate: { motion: 'bolt', school: 'fire', impact: 'explode' },
    rain_fire: { motion: 'rain', school: 'fire', impact: 'splash' },
    soul_fire: { motion: 'bolt', school: 'fire', impact: 'explode' },
    // Monk
    jab: { motion: 'slash', school: 'chi', impact: 'hit' },
    tiger: { motion: 'slash', school: 'chi', impact: 'hit' },
    rsk: { motion: 'slash', school: 'chi', impact: 'explode' },
    fists: { motion: 'swirl', school: 'chi', impact: 'splash' },
    blackout: { motion: 'slash', school: 'chi', impact: 'hit' },
    keg_smash: { motion: 'slam', school: 'physical', impact: 'splash' },
    breath_fire: { motion: 'beam', school: 'fire', impact: 'splash' },
    spinning: { motion: 'swirl', school: 'chi', impact: 'splash' },
    chi_wave: { motion: 'chain', school: 'chi', impact: 'hit' },
    enveloping: { motion: 'orbit', school: 'chi', impact: 'hit' },
    soothing: { motion: 'beam', school: 'chi', impact: 'hit' },
    renewing: { motion: 'orbit', school: 'chi', impact: 'hit' },
    spear_hand: { motion: 'pierce', school: 'chi', impact: 'hit' },
    // Druid
    wrath: { motion: 'bolt', school: 'nature', impact: 'hit' },
    starfire: { motion: 'bolt', school: 'arcane', impact: 'explode' },
    moonfire: { motion: 'orbit', school: 'arcane', impact: 'hit' },
    sunfire: { motion: 'orbit', school: 'nature', impact: 'hit' },
    starsurge: { motion: 'bolt', school: 'arcane', impact: 'explode' },
    hurricane: { motion: 'swirl', school: 'nature', impact: 'splash' },
    rake: { motion: 'slash', school: 'physical', impact: 'hit' },
    shred: { motion: 'slash', school: 'physical', impact: 'hit' },
    rip: { motion: 'slash', school: 'blood', impact: 'hit' },
    ferocious: { motion: 'slash', school: 'physical', impact: 'explode' },
    mangle: { motion: 'slash', school: 'physical', impact: 'hit' },
    thrash: { motion: 'swirl', school: 'physical', impact: 'splash' },
    swipe: { motion: 'arc', school: 'physical', impact: 'splash' },
    maul: { motion: 'slash', school: 'physical', impact: 'hit' },
    reju: { motion: 'orbit', school: 'nature', impact: 'hit' },
    regrowth: { motion: 'beam', school: 'nature', impact: 'hit' },
    healing_touch: { motion: 'beam', school: 'nature', impact: 'hit' },
    wild_growth: { motion: 'nova', school: 'nature', impact: 'splash' },
    lifebloom: { motion: 'orbit', school: 'nature', impact: 'hit' },
  };

  function skillFxStyle(ability) {
    const fx = resolveSkillFx(ability);
    if (fx.school === 'heal' || ability.type === 'heal' || ability.type === 'heal_aoe') return 'heal';
    if (fx.school && fx.school !== 'physical') return fx.school;
    if (ability.type === 'aoe' || ability.type === 'cast_aoe') return 'aoe';
    return fx.school || '';
  }

  function resolveSkillFx(ability, actor) {
    const id = (ability?.id || '').toLowerCase();
    const name = (ability?.name || '').toLowerCase();
    const type = (ability?.type || '').toLowerCase();
    const blob = id + ' ' + name + ' ' + type;

    if (SKILL_FX[id]) {
      return { ...SKILL_FX[id] };
    }

    // School inference
    let school = 'physical';
    if (type === 'heal' || type === 'heal_aoe' || type === 'shield' || /heal|жизн|свет|исцел|омолож|хил|mist|reju|flash|renew|light|свят/.test(blob)) school = 'heal';
    else if (/fire|flame|огн|жар|пир|combust|inciner|pyro|meteor|lava|slag|ember|ash|угол|пепел/.test(blob)) school = 'fire';
    else if (/frost|ice|холод|лед|freeze|blizzard|howling/.test(blob)) school = 'frost';
    else if (/shadow|void|тьм|порч|death|нечист|mind|dark|хаос|разлом|sha|агон|corrupt/.test(blob)) school = 'shadow';
    else if (/nature|природ|leaf|thorn|wild|moon|star|звер|ярос|serpent|riptide|chain|lightning|earth/.test(blob)) school = 'nature';
    else if (/holy|божеств|paladin|crusader|judgment|exorc|smite|penance/.test(blob)) school = 'holy';
    else if (/arcane|тайная|arcane/.test(blob)) school = 'arcane';
    else if (/chi|ци|jab|tiger|fists|brew|mistweaver|windwalker/.test(blob)) school = 'chi';
    else if (/blood|blood|кран|death_strike|heart|blood_boil|execute|rupture|garrote/.test(blob)) school = 'blood';
    else if (actor?.classId === 'mage' && /bolt|blast|barrage/.test(blob)) school = 'arcane';
    else if (actor?.classId === 'warlock') school = 'shadow';
    else if (actor?.classId === 'priest' && actor?.specId === 'shadow') school = 'shadow';
    else if (actor?.classId === 'priest') school = 'holy';
    else if (actor?.classId === 'paladin') school = 'holy';
    else if (actor?.classId === 'shaman') school = 'nature';
    else if (actor?.classId === 'druid' && (actor?.specId === 'balance' || actor?.specId === 'restoration')) school = 'nature';
    else if (actor?.classId === 'monk') school = 'chi';
    else if (actor?.classId === 'engineer') school = /bomb|rocket|demolish|nitro|shrapnel|sticky|cluster|charge/.test(blob) ? 'fire' : 'physical';
    else if (actor?.classId === 'deathknight' && actor?.specId === 'frost') school = 'frost';
    else if (actor?.classId === 'deathknight' && actor?.specId === 'blood') school = 'blood';
    else if (actor?.classId === 'deathknight') school = 'shadow';

    // Motion inference
    let motion = 'bolt';
    if (type === 'heal' || type === 'heal_aoe' || type === 'shield') motion = type === 'heal_aoe' ? 'nova' : 'beam';
    else if (type === 'buff' || type === 'taunt') motion = 'nova';
    else if (type === 'aoe' || type === 'cast_aoe') {
      if (/rain|дожд|blizzard|meteor|storm|вихрь|nova|взрыв/.test(blob)) motion = /rain|дожд|blizzard/.test(blob) ? 'rain' : 'nova';
      else if (/whirl|blade|spin|swirl|вихрь|fan|swipe|thrash/.test(blob)) motion = 'swirl';
      else motion = 'nova';
    } else if (type === 'dot') motion = 'orbit';
    else if (/chain|цепн|прыж/.test(blob)) motion = 'chain';
    else if (/pierce|aimed|lance|stab|ambush|charge|spear|выст|shot/.test(blob) && !/slash|удар/.test(blob)) {
      motion = /shot|выст|aimed|arcane_shot|steady/.test(blob) ? 'bolt' : 'pierce';
    } else if (/slash|удар|strike|blow|cleave|sunder|bash|maul|swipe|kick|revenge|devastate|mutilate|shred|rake|jab|palm|mortal|overpower|slam|rend|execute|heroic|shield_slam|heart|obliterate|scourge|storm|lava_lash|blackout|rsk|tiger|маул|кос|удар/.test(blob)
      || actor?.role === 'tank'
      || (actor && ['warrior','rogue','deathknight'].includes(actor.classId))
      || (actor?.classId === 'monk' && actor?.specId !== 'mistweaver')
      || (actor?.classId === 'druid' && (actor?.specId === 'feral' || actor?.specId === 'guardian'))
      || (actor?.classId === 'paladin' && actor?.specId === 'retribution')
      || (actor?.classId === 'shaman' && actor?.specId === 'enhancement')) {
      if (/slam|bash|colossus|keg|shield_slam|pummel/.test(blob)) motion = 'slam';
      else if (/cleave|swipe|arc/.test(blob)) motion = 'arc';
      else motion = 'slash';
    } else if (/beam|луч|flay|drain|penance/.test(blob)) motion = 'beam';
    else if (/rain|залп|multi|barrage|missiles|hand_guldan/.test(blob)) motion = 'rain';
    else if (/nova|explosion|взрыв|thunder_clap|divine_storm/.test(blob)) motion = 'nova';
    else if (/orbit|orb|bomb|corrupt|agony|ua|immolate|moonfire|sunfire|vt|swp/.test(blob)) motion = 'orbit';
    else motion = 'bolt';

    // Chi / melee polish: prefer jab-style slash over bland bolt for ST damage
    if (school === 'chi' && type === 'damage' && motion === 'bolt') motion = 'slash';
    if (type === 'damage' && motion === 'bolt' && /удар|strike|jab|palm|kick|blow/.test(blob)) motion = 'slash';

    // Impact
    let impact = 'hit';

    if (type === 'heal' || type === 'heal_aoe' || school === 'heal') impact = 'hit';
    else if (/explode|burst|combust|pyro|chaos|meteor|execute|kill_shot|colossus|chaos_bolt/.test(blob)) impact = 'explode';
    else if (/drain|life|vt|devouring|death_strike|agony/.test(blob)) impact = 'drain';
    else if (type === 'aoe' || type === 'cast_aoe' || motion === 'rain' || motion === 'swirl' || motion === 'nova') impact = 'splash';

    // Shape hint
    let shape = 'single';
    if (type === 'aoe' || type === 'cast_aoe' || type === 'heal_aoe' || motion === 'nova' || motion === 'swirl' || motion === 'rain') shape = 'aoe_ring';
    else if (type === 'buff' || type === 'taunt' || type === 'shield') shape = 'self';
    else if (motion === 'beam' || motion === 'chain') shape = 'channel';

    return { motion, school, impact, shape };
  }

  function playSkillAnim(actor, ability, targets) {
    if (!juiceOk() || !actor) return;
    const layer = document.getElementById('skill-fx-layer');
    if (!layer) return;
    const from = unitCenter(actor.uid);
    if (!from) return;
    const list = (targets || []).filter(Boolean);
    const fx = resolveSkillFx(ability, actor);
    const school = fx.school === 'heal' ? 'heal' : (fx.school || '');
    const style = school === 'physical' ? '' : school;
    const type = ability.type || '';

    pulseUnit(actor.uid, 'casting-skill');
    pulseUnit(actor.uid, 'attacking');
    if (school) {
      const el = unitEl(actor.uid);
      if (el) {
        const cls = 'school-flash-' + (school === 'physical' ? 'physical' : school);
        // physical flash uses generic casting
        if (school !== 'physical') {
          el.classList.add(cls);
          setTimeout(() => el.classList.remove(cls), 420);
        }
      }
    }

    const tag = document.createElement('div');
    tag.className = 'skill-name-tag' + (school ? ' school-' + school : '');
    tag.textContent = ability.name || '';
    tag.style.left = from.x + 'px';
    tag.style.top = (from.y - 28) + 'px';
    layer.appendChild(tag);
    setTimeout(() => tag.remove(), 1200);

    const spawnBurst = (x, y, kind, impact) => {
      const b = document.createElement('div');
      let cls = 'skill-burst';
      if (kind) cls += ' ' + kind;
      if (impact && impact !== 'hit') cls += ' impact-' + impact;
      b.className = cls;
      b.style.left = x + 'px';
      b.style.top = y + 'px';
      layer.appendChild(b);
      setTimeout(() => b.remove(), 900);
    };
        const spawnSlash = (x, y) => {
      // jab-style dual geometric cut — no emoji
      const make = (rot, delay) => {
        const s = document.createElement('div');
        s.className = 'skill-slash' + (school && school !== 'physical' ? ' ' + school : '');
        s.style.left = x + 'px';
        s.style.top = y + 'px';
        s.style.setProperty('--slash-rot', rot + 'deg');
        if (delay) s.style.animationDelay = delay + 'ms';
        layer.appendChild(s);
        setTimeout(() => s.remove(), 780 + (delay || 0));
      };
      make(-38, 0);
      make(34, 120);
    };
    const spawnRing = (x, y, ground) => {
      const r = document.createElement('div');
      r.className = 'skill-ring' + (school ? ' ' + school : '') + (ground ? ' ground' : '');
      r.style.left = x + 'px';
      r.style.top = y + 'px';
      layer.appendChild(r);
      setTimeout(() => r.remove(), 1100);
    };
    const spawnBeam = (x1, y1, x2, y2) => {
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      const beam = document.createElement('div');
      beam.className = 'skill-beam' + (school ? ' ' + school : '');
      beam.style.left = x1 + 'px';
      beam.style.top = y1 + 'px';
      beam.style.width = len + 'px';
      beam.style.transform = `rotate(${ang}deg)`;
      layer.appendChild(beam);
      setTimeout(() => beam.remove(), 750);
    };
    const spawnArc = (x, y) => {
      const a = document.createElement('div');
      a.className = 'skill-arc' + (school && school !== 'physical' ? ' ' + school : '');
      a.style.left = x + 'px';
      a.style.top = y + 'px';
      layer.appendChild(a);
      setTimeout(() => a.remove(), 700);
    };
    const spawnSwirl = (x, y) => {
      const s = document.createElement('div');
      s.className = 'skill-swirl' + (school ? ' ' + school : (style ? ' ' + style : ' physical'));
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      layer.appendChild(s);
      setTimeout(() => s.remove(), 1100);
    };
    const spawnRain = (x, y, n) => {
      const count = n || 6;
      for (let i = 0; i < count; i++) {
        const d = document.createElement('div');
        d.className = 'skill-rain-drop' + (school && school !== 'physical' ? ' ' + school : ' fire');
        d.style.left = (x + (Math.random() * 50 - 25)) + 'px';
        d.style.top = (y + (Math.random() * 20 - 30)) + 'px';
        d.style.animationDelay = (i * 0.04) + 's';
        layer.appendChild(d);
        setTimeout(() => d.remove(), 1000);
      }
    };
    const spawnOrbit = (x, y) => {
      for (let i = 0; i < 3; i++) {
        const o = document.createElement('div');
        o.className = 'skill-orbit' + (school && school !== 'physical' ? ' ' + school : ' shadow');
        o.style.left = x + 'px';
        o.style.top = y + 'px';
        o.style.animationDelay = (i * 0.06) + 's';
        layer.appendChild(o);
        setTimeout(() => o.remove(), 1000);
      }
    };
    const spawnPierce = (x1, y1, x2, y2) => {
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      const p = document.createElement('div');
      p.className = 'skill-pierce' + (school ? ' ' + school : ' physical');
      p.style.left = x1 + 'px';
      p.style.top = y1 + 'px';
      p.style.width = len + 'px';
      p.style.transform = `rotate(${ang}deg)`;
      layer.appendChild(p);
      setTimeout(() => p.remove(), 650);
    };
    const spawnProjectile = (to, onHit) => {
      const proj = document.createElement('div');
      proj.className = 'skill-projectile' + (school ? ' school-' + school : '');
      // pure CSS orb — no emoji
      proj.style.left = from.x + 'px';
      proj.style.top = from.y + 'px';
      const dx = to.x - from.x, dy = to.y - from.y;
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      proj.style.setProperty('--ang', ang + 'deg');
      layer.appendChild(proj);
      // trail: jab-style geometric line along flight path
      const trail = document.createElement('div');
      trail.className = 'skill-slash' + (school && school !== 'physical' ? ' ' + school : '');
      trail.style.left = from.x + 'px';
      trail.style.top = from.y + 'px';
      trail.style.setProperty('--slash-rot', ang + 'deg');
      trail.style.opacity = '0.7';
      layer.appendChild(trail);
      setTimeout(() => trail.remove(), 780);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dur = clamp(dist / 520, 0.42, 0.85); // slower flight
      proj.animate([
        { transform: 'translate(-50%, -50%) scale(.45)', opacity: 0.15 },
        { transform: `translate(calc(-50% + ${dx * 0.45}px), calc(-50% + ${dy * 0.45}px)) scale(1.2)`, opacity: 1, offset: 0.5 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.85)`, opacity: 1 },
      ], { duration: dur * 1000, easing: 'cubic-bezier(.18,.75,.22,1)', fill: 'forwards' });
      setTimeout(() => {
        if (onHit) onHit();
        proj.remove();
      }, dur * 1000);
    };
    const hitPulse = (t) => {
      if (type === 'heal' || type === 'heal_aoe' || type === 'shield' || school === 'heal') pulseUnit(t.uid, type === 'shield' ? 'shielded' : 'healed');
      else pulseUnit(t.uid, 'hit');
    };

    // Self / buff / shield no-target
    // Summon deploy: jab-style dual slash + ring (machine deploy flash)
    if (type === 'summon') {
      spawnSlash(from.x, from.y);
      spawnRing(from.x, from.y, true);
      spawnBurst(from.x, from.y, style || 'physical', fx.impact || 'splash');
      if (list.length) {
        list.forEach((tgt, i) => setTimeout(() => {
          const p = rectCenter(tgt);
          spawnOrbit(p.x, p.y);
          spawnBurst(p.x, p.y, style || 'physical', 'splash');
        }, 120 + i * 90));
      }
      return;
    }

    if (type === 'buff' || type === 'taunt' || (type === 'shield' && !list.length) || fx.motion === 'nova' && !list.length) {
      spawnRing(from.x, from.y, fx.motion === 'nova');
      spawnBurst(from.x, from.y, style || (type === 'shield' ? 'heal' : ''), fx.impact);
      if (type === 'shield') pulseUnit(actor.uid, 'shielded');
      if (type === 'taunt' || type === 'aoe' || type === 'cast_aoe') {
        list.forEach((t, i) => setTimeout(() => {
          const to = unitCenter(t.uid);
          if (!to) return;
          spawnBurst(to.x, to.y, style || 'aoe', fx.impact);
          hitPulse(t);
        }, 100 + i * 90));
      }
      return;
    }

    // AoE family
    if (type === 'aoe' || type === 'heal_aoe' || type === 'cast_aoe' || fx.motion === 'swirl' || fx.motion === 'rain' || (fx.motion === 'nova' && list.length > 1)) {
      if (fx.motion === 'swirl') spawnSwirl(from.x, from.y);
      else if (fx.motion === 'rain') {
        list.forEach((t, i) => setTimeout(() => {
          const to = unitCenter(t.uid) || from;
          spawnRain(to.x, to.y, 5);
        }, i * 70));
      } else {
        spawnRing(from.x, from.y, true);
      }
      list.forEach((t, i) => {
        setTimeout(() => {
          const to = unitCenter(t.uid);
          if (!to) return;
          if (fx.motion === 'swirl') spawnSwirl(to.x, to.y);
          spawnBurst(to.x, to.y, style || (type === 'heal_aoe' ? 'heal' : 'aoe'), fx.impact);
          hitPulse(t);
        }, 120 + i * 90);
      });
      return;
    }

    // Per-target
    list.forEach((t, i) => {
      const to = unitCenter(t.uid);
      if (!to) return;
      const delay = i * 90;
      setTimeout(() => {
        const motion = fx.motion;
        if (motion === 'beam' || type === 'heal' || type === 'shield') {
          spawnBeam(from.x, from.y, to.x, to.y);
          spawnBurst(to.x, to.y, style || 'heal', fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'chain') {
          // hop: caster → target (visual only; multi-target handled by successive list entries)
          spawnBeam(from.x, from.y, to.x, to.y);
          spawnBurst(to.x, to.y, style || 'nature', fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'slash' || motion === 'slam') {
          spawnSlash(to.x, to.y);
          if (motion === 'slam') spawnRing(to.x, to.y, true);
          spawnBurst(to.x, to.y, style, fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'arc') {
          spawnArc(to.x, to.y);
          spawnBurst(to.x, to.y, style, fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'pierce') {
          spawnPierce(from.x, from.y, to.x, to.y);
          spawnBurst(to.x, to.y, style, fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'orbit') {
          spawnOrbit(to.x, to.y);
          spawnBurst(to.x, to.y, style || 'shadow', fx.impact);
          if (type === 'dot') spawnRing(to.x, to.y);
          hitPulse(t);
          return;
        }
        if (motion === 'nova') {
          spawnRing(to.x, to.y, true);
          spawnBurst(to.x, to.y, style || 'aoe', fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'rain') {
          spawnRain(to.x, to.y, 6);
          spawnBurst(to.x, to.y, style, fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'swirl') {
          spawnSwirl(to.x, to.y);
          spawnBurst(to.x, to.y, style, fx.impact);
          hitPulse(t);
          return;
        }
        // bolt default
        spawnProjectile(to, () => {
          spawnBurst(to.x, to.y, style || (type === 'dot' ? 'shadow' : ''), fx.impact);
          if (type === 'dot') spawnRing(to.x, to.y);
          hitPulse(t);
        });
      }, delay);
    });

    // no targets: self burst
    if (!list.length) {
      spawnBurst(from.x, from.y, style, fx.impact);
    }
  }

  function showTurnBanner(text) {
    const el = document.getElementById('turn-banner');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 900);
  }
  function updateVignette() {
    const el = document.getElementById('vignette');
    if (!el || !run) return;
    const allies = run.party.filter(p => p.alive);
    const low = allies.some(p => p.hp / p.maxHp < 0.3);
    el.classList.toggle('on', low && allies.length > 0);
  }
  function updateBossFrame() {
    const frame = document.getElementById('boss-frame');
    if (!frame || !combat) { if (frame) frame.classList.remove('show'); return; }
    const boss = combat.enemies.find(e => e.isBoss && e.alive);
    if (!boss) { frame.classList.remove('show'); return; }
    frame.classList.add('show');
    document.getElementById('boss-name').textContent = boss.icon + ' ' + boss.name;
    const pct = clamp(boss.hp / boss.maxHp * 100, 0, 100);
    document.getElementById('boss-hp-fill').style.width = pct + '%';
    document.getElementById('boss-hp-text').textContent = fmt(boss.hp) + ' / ' + fmt(boss.maxHp);
    const ph = document.getElementById('boss-phases');
    if (boss.phases) {
      ph.innerHTML = boss.phases.map((_, i) =>
        `<span class="${i <= (boss.phaseIndex || 0) ? 'on' : ''}"></span>`).join('');
    } else ph.innerHTML = '';
  }
  // Portraits + battle backgrounds only (ability icons stay emoji).
  // Base is always the game root `assets/` folder (resolved from this script URL),
  // so paths stay correct even if the page is opened from a subpath or CSS lives in css/.
