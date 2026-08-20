/* ui/fx: skill VFX, banners, vignette, boss frame */
  function juiceOk() {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && gameSpeed <= 2;
  }
  let lastSkillAnimMs = 0;
  function noteSkillAnimMs(ms) {
    const n = Math.max(0, Math.round(Number(ms) || 0));
    lastSkillAnimMs = Math.max(lastSkillAnimMs, n);
    return n;
  }
  function takeSkillAnimMs() {
    const n = lastSkillAnimMs;
    lastSkillAnimMs = 0;
    return n;
  }
  function estimateChainAnimMs(targetCount) {
    const hops = Math.max(1, Number(targetCount) || 1);
    return hops * 330 + Math.max(0, hops - 1) * 48 + 520;
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
    outbreak: { motion: 'nova', school: 'shadow', impact: 'splash' },
    plague_strike: { motion: 'slash', school: 'shadow', impact: 'hit' },
    mind_freeze: { motion: 'slam', school: 'frost', impact: 'hit' },
    // Shaman
    lightning: { motion: 'chain', school: 'nature', impact: 'hit' },
    chain_light: { motion: 'chain', school: 'nature', impact: 'hit' },
    lava_burst: { motion: 'bolt', school: 'fire', impact: 'explode' },
    lv: { motion: 'bolt', school: 'fire', impact: 'explode' },
    lb: { motion: 'chain', school: 'nature', impact: 'hit' },
    flame_shock: { motion: 'bolt', school: 'fire', impact: 'hit' },
    earth_shock: { motion: 'slam', school: 'nature', impact: 'hit' },
    frost_shock: { motion: 'bolt', school: 'frost', impact: 'hit' },
    lava_lash: { motion: 'slash', school: 'fire', impact: 'explode' },
    stormstrike: { motion: 'slash', school: 'nature', impact: 'hit' },
    thunderstorm: { motion: 'nova', school: 'nature', impact: 'splash' },
    ele_blast: { motion: 'bolt', school: 'nature', impact: 'explode' },
    fire_ele: { motion: 'nova', school: 'fire', impact: 'explode' },
    ascendance: { motion: 'nova', school: 'nature', impact: 'splash' },
    feral_spirit: { motion: 'slash', school: 'physical', impact: 'hit' },
    healing_wave: { motion: 'beam', school: 'nature', impact: 'hit' },
    hw: { motion: 'wave', school: 'heal', impact: 'hit' },
    healing_wave: { motion: 'wave', school: 'heal', impact: 'hit' },
    riptide: { motion: 'tide', school: 'heal', impact: 'hit' },
    chw: { motion: 'surge', school: 'heal', impact: 'hit' },
    ch: { motion: 'chain', school: 'heal', impact: 'hit' },
    chain_heal: { motion: 'chain', school: 'heal', impact: 'hit' },
    chain: { motion: 'chain', school: 'nature', impact: 'hit' },
    hs: { motion: 'rain', school: 'heal', impact: 'splash' },
    healing_rain: { motion: 'rain', school: 'heal', impact: 'splash' },
    hst: { motion: 'totem', school: 'heal', impact: 'splash' },
    spirit_link: { motion: 'linkweb', school: 'heal', impact: 'hit' },
    unleash: { motion: 'unleash', school: 'heal', impact: 'hit' },
    party_dispel: { motion: 'cleanse', school: 'holy', impact: 'hit' },
    party_purge: { motion: 'purge', school: 'nature', impact: 'hit' },
    kick: { motion: 'windcut', school: 'nature', impact: 'hit' },
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
      const fx = { ...SKILL_FX[id] };
      if (fx.motion === 'glaive' || fx.motion === 'lunge') fx.motion = 'slash';
      if (fx.motion === 'pulse') fx.motion = 'nova';
      return fx;
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

  const CHAIN_PAL = {
    heal:   { core: '#f7fff9', mid: '#8af5c8', glow: '#3dd68c', deep: '#0f6a3a', spark: '#e8fff2', drop: '#7ef0c0' },
    nature: { core: '#f4ffd4', mid: '#9cff60', glow: '#6fdc3c', deep: '#2a7010', spark: '#e8ffc4', drop: '#9cff60' },
    holy:   { core: '#fff8d8', mid: '#ffe08a', glow: '#f0c14b', deep: '#8a6208', spark: '#fff6cc', drop: '#ffe08a' },
    chi:    { core: '#f0fff8', mid: '#7ef0d0', glow: '#3dceaa', deep: '#0f5a48', spark: '#d8fff4', drop: '#7ef0d0' },
    fire:   { core: '#fff4d0', mid: '#ff9a40', glow: '#ff5a18', deep: '#8a1800', spark: '#ffd080', drop: '#ff8a2a' },
    frost:  { core: '#f0f8ff', mid: '#8ad4ff', glow: '#3aa0e0', deep: '#104868', spark: '#d8f0ff', drop: '#8ad4ff' },
  };
  const chainScene = { jobs: [], raf: 0 };

  function chainPalette(school, isHeal) {
    if (isHeal || school === 'heal') return CHAIN_PAL.heal;
    return CHAIN_PAL[school] || CHAIN_PAL.nature;
  }
  function qbez(ax, ay, cx, cy, bx, by, t) {
    const u = 1 - t;
    return {
      x: u * u * ax + 2 * u * t * cx + t * t * bx,
      y: u * u * ay + 2 * u * t * cy + t * t * by,
    };
  }
  function chainCtrl(ax, ay, bx, by, sign) {
    const dx = bx - ax, dy = by - ay;
    const dist = Math.hypot(dx, dy) || 1;
    const lift = Math.min(108, 40 + dist * 0.32);
    const nx = -dy / dist, ny = dx / dist;
    const sway = (sign || 1) * Math.min(36, 10 + dist * 0.08);
    return { x: (ax + bx) / 2 + nx * sway, y: Math.min(ay, by) - lift + ny * sway * 0.25 };
  }
  function acquireChainCanvas(layer) {
    let c = document.getElementById('chain-fx-canvas');
    if (!c) {
      c = document.createElement('canvas');
      c.id = 'chain-fx-canvas';
      c.className = 'chain-fx-canvas';
      (layer || document.body).appendChild(c);
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    const tw = Math.floor(w * dpr), th = Math.floor(h * dpr);
    if (c.width !== tw || c.height !== th) {
      c.width = tw;
      c.height = th;
      c.style.width = w + 'px';
      c.style.height = h + 'px';
    }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { canvas: c, ctx, w, h };
  }
  function drawRibbon(ctx, ax, ay, cx, cy, bx, by, t0, t1, pal, width, alpha) {
    const steps = Math.max(18, Math.round(28 * Math.max(0.15, t1 - t0)));
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const pass = (color, w, a) => {
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = t0 + (t1 - t0) * (i / steps);
        const p = qbez(ax, ay, cx, cy, bx, by, t);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = color;
      ctx.globalAlpha = a;
      ctx.lineWidth = w;
      ctx.stroke();
    };
    pass(pal.glow, width * 4.2, alpha * 0.22);
    pass(pal.mid, width * 2.1, alpha * 0.55);
    pass(pal.core, width * 0.7, alpha * 0.95);
    ctx.restore();
  }
  function drawJagged(ctx, ax, ay, cx, cy, bx, by, t1, pal, seed, alpha) {
    const n = 10;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * t1;
      const p = qbez(ax, ay, cx, cy, bx, by, t);
      if (i > 0 && i < n) {
        const dx = bx - ax, dy = by - ay;
        const len = Math.hypot(dx, dy) || 1;
        const off = Math.sin(t * 14 + seed) * 11 + Math.sin(t * 27 + seed * 1.7) * 5;
        p.x += (-dy / len) * off;
        p.y += (dx / len) * off;
      }
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = pal.spark;
    ctx.globalAlpha = alpha * 0.55;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }
  function drawOrb(ctx, x, y, pal, pulse) {
    const r = 16 + pulse * 5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, pal.core);
    g.addColorStop(0.28, pal.mid);
    g.addColorStop(0.62, pal.glow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.core;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(x, y, 3.2 + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function drawNode(ctx, x, y, pal, age, now) {
    const life = Math.max(0, 1 - (now - age) / 1400);
    if (life <= 0) return;
    const pulse = 0.5 + 0.5 * Math.sin(now / 140);
    drawOrb(ctx, x, y, pal, pulse * 0.45);
    ctx.save();
    ctx.strokeStyle = pal.mid;
    ctx.globalAlpha = 0.35 * life;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 14 + pulse * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  function spawnChainDom(layer, cls, x, y, extra) {
    const el = document.createElement('div');
    el.className = cls;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    if (extra) Object.assign(el.style, extra);
    layer.appendChild(el);
    return el;
  }
  function landChainHop(layer, x, y, palName, isHeal) {
    const ring = spawnChainDom(layer, 'chain-splash-ring school-' + palName, x, y);
    setTimeout(() => ring.remove(), 720);
    const ring2 = spawnChainDom(layer, 'chain-splash-ring chain-splash-ring-late school-' + palName, x, y);
    setTimeout(() => ring2.remove(), 900);
    const crown = spawnChainDom(layer, 'chain-splash-crown school-' + palName, x, y);
    setTimeout(() => crown.remove(), 640);
    if (isHeal) {
      const plus = spawnChainDom(layer, 'chain-plus school-' + palName, x, y - 8);
      plus.textContent = '+';
      setTimeout(() => plus.remove(), 780);
      for (let i = 0; i < 3; i++) {
        const mote = spawnChainDom(layer, 'chain-mote school-' + palName, x, y);
        mote.style.setProperty('--mx', ((i - 1) * 18) + 'px');
        mote.style.setProperty('--my', (-22 - i * 10) + 'px');
        mote.style.animationDelay = (i * 40) + 'ms';
        setTimeout(() => mote.remove(), 820);
      }
    }
    for (let k = 0; k < 9; k++) {
      const a = (-Math.PI / 2) + (k - 4) * 0.42 + (Math.random() * 0.18 - 0.09);
      const dist = 22 + Math.random() * 22;
      const sp = spawnChainDom(layer, 'chain-hop-spark school-' + palName, x, y);
      sp.style.setProperty('--sx', Math.cos(a) * dist + 'px');
      sp.style.setProperty('--sy', Math.sin(a) * dist + 'px');
      sp.style.animationDelay = (k * 14) + 'ms';
      setTimeout(() => sp.remove(), 560);
    }
  }
  function tickChainScene(now) {
    const layer = document.getElementById('skill-fx-layer');
    const { ctx, w, h } = acquireChainCanvas(layer);
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const keep = [];
    for (const job of chainScene.jobs) {
      job.step(now);
      job.draw(ctx, now);
      if (job.alive) keep.push(job);
    }
    chainScene.jobs = keep;
    ctx.globalCompositeOperation = 'source-over';
    if (chainScene.jobs.length) {
      chainScene.raf = requestAnimationFrame(tickChainScene);
    } else {
      chainScene.raf = 0;
      ctx.clearRect(0, 0, w, h);
    }
  }
  function playChainHopFx(layer, from, list, opt) {
    const hops = [from].concat(list.map(t => {
      const c = unitCenter(t.uid);
      return c ? { x: c.x, y: c.y, uid: t.uid, unit: t } : null;
    }).filter(Boolean));
    if (hops.length < 2) return 0;
    const isHeal = !!opt.isHeal;
    const pal = chainPalette(opt.school, isHeal);
    const palName = opt.pal || (isHeal ? 'heal' : 'nature');
    const isBolt = !isHeal;
    const job = {
      hops,
      hopI: 0,
      hopStart: 0,
      hopDur: 300,
      waitUntil: 0,
      links: [],
      particles: [],
      nodes: [{ x: hops[0].x, y: hops[0].y, born: performance.now() }],
      seed: Math.random() * 10,
      fade: 1,
      fading: false,
      fadeStart: 0,
      alive: true,
      lastDrop: 0,
      step(now) {
        if (!this.hopStart) {
          this.hopStart = now;
          const a = this.hops[0], b = this.hops[1];
          this.hopDur = Math.max(240, Math.min(420, Math.hypot(b.x - a.x, b.y - a.y) / 1.85));
          landChainHop(layer, a.x, a.y, palName, isHeal);
        }
        if (this.fading) {
          this.fade = Math.max(0, 1 - (now - this.fadeStart) / 520);
          if (this.fade <= 0) this.alive = false;
          return;
        }
        if (this.waitUntil && now < this.waitUntil) return;
        if (this.waitUntil && now >= this.waitUntil) {
          this.waitUntil = 0;
          this.hopStart = now;
        }
        const a = this.hops[this.hopI];
        const b = this.hops[this.hopI + 1];
        if (!a || !b) return;
        const t = Math.min(1, (now - this.hopStart) / this.hopDur);
        const e = t * t * (3 - 2 * t);
        const ctrl = chainCtrl(a.x, a.y, b.x, b.y, this.hopI % 2 === 0 ? 1 : -1);
        const p = qbez(a.x, a.y, ctrl.x, ctrl.y, b.x, b.y, e);
        if (now - this.lastDrop > 22) {
          this.particles.push({
            x: p.x, y: p.y,
            vx: (Math.random() - 0.5) * 0.35,
            vy: 0.25 + Math.random() * 0.55,
            life: 1,
            kind: Math.random() > 0.45 ? 'drop' : 'spark',
            size: 2 + Math.random() * 2.4,
          });
          this.lastDrop = now;
        }
        if (t >= 1) {
          this.links.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, cx: ctrl.x, cy: ctrl.y, born: now });
          this.nodes.push({ x: b.x, y: b.y, born: now });
          landChainHop(layer, b.x, b.y, palName, isHeal);
          if (opt.hitPulse) {
            if (b.unit) opt.hitPulse(b.unit);
            else if (b.uid) pulseUnit(b.uid, isHeal ? 'healed' : 'hit');
          }
          this.hopI += 1;
          if (this.hopI >= this.hops.length - 1) {
            this.fading = true;
            this.fadeStart = now;
          } else {
            const n = this.hops[this.hopI + 1];
            this.hopDur = Math.max(240, Math.min(420, Math.hypot(n.x - b.x, n.y - b.y) / 1.85));
            this.waitUntil = now + 48;
          }
        }
      },
      draw(ctx, now) {
        const fade = this.fade;
        for (const link of this.links) {
          const age = (now - link.born) / 900;
          const a = fade * Math.max(0.22, 1 - age * 0.35);
          drawRibbon(ctx, link.ax, link.ay, link.cx, link.cy, link.bx, link.by, 0, 1, pal, 5.5, a);
          if (isBolt) drawJagged(ctx, link.ax, link.ay, link.cx, link.cy, link.bx, link.by, 1, pal, this.seed, a);
        }
        if (!this.fading && this.hopI < this.hops.length - 1 && !this.waitUntil) {
          const a = this.hops[this.hopI];
          const b = this.hops[this.hopI + 1];
          const raw = Math.min(1, (now - this.hopStart) / this.hopDur);
          const e = raw * raw * (3 - 2 * raw);
          const ctrl = chainCtrl(a.x, a.y, b.x, b.y, this.hopI % 2 === 0 ? 1 : -1);
          drawRibbon(ctx, a.x, a.y, ctrl.x, ctrl.y, b.x, b.y, 0, e, pal, 6.2, fade);
          if (isBolt) drawJagged(ctx, a.x, a.y, ctrl.x, ctrl.y, b.x, b.y, e, pal, this.seed + this.hopI, fade);
          const p = qbez(a.x, a.y, ctrl.x, ctrl.y, b.x, b.y, e);
          drawOrb(ctx, p.x, p.y, pal, 0.5 + 0.5 * Math.sin(now / 70));
        }
        for (const n of this.nodes) drawNode(ctx, n.x, n.y, pal, n.born, now);
        const nextP = [];
        for (const pt of this.particles) {
          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.life -= 0.045;
          if (pt.life <= 0) continue;
          ctx.save();
          ctx.globalAlpha = Math.max(0, pt.life) * fade;
          ctx.fillStyle = pt.kind === 'drop' ? pal.drop : pal.spark;
          if (pt.kind === 'drop') {
            ctx.fillRect(pt.x - 1.2, pt.y - 2, 2.4, 4.2);
          } else {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          nextP.push(pt);
        }
        this.particles = nextP;
      },
    };
    chainScene.jobs.push(job);
    if (!chainScene.raf) chainScene.raf = requestAnimationFrame(tickChainScene);
    return estimateChainAnimMs(hops.length - 1);
  }

  function shamEl(layer, cls, x, y) {
    const el = document.createElement('div');
    el.className = cls;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    layer.appendChild(el);
    return el;
  }
  function shamFly(layer, cls, ax, ay, bx, by, ms, onDone) {
    const el = shamEl(layer, cls, ax, ay);
    const dx = bx - ax, dy = by - ay;
    el.animate([
      { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0.3 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`, opacity: 1 },
    ], { duration: ms, easing: 'cubic-bezier(.18,.75,.22,1)', fill: 'forwards' });
    setTimeout(() => { el.remove(); if (onDone) onDone(); }, ms);
    return el;
  }
  function shamLinkLine(layer, ax, ay, bx, by, cls, life) {
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    const el = shamEl(layer, cls, ax, ay);
    el.style.width = len + 'px';
    el.style.transform = 'rotate(' + ang + 'deg)';
    setTimeout(() => el.remove(), life || 700);
    return el;
  }

  function laterRm(el, ms) {
    if (!el) return;
    setTimeout(() => { try { el.remove(); } catch (_) {} }, ms);
  }
  function shamSparks(layer, cls, x, y, n, dist, life) {
    for (let i = 0; i < n; i++) {
      const sp = shamEl(layer, cls, x, y);
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      const d = dist * (0.7 + Math.random() * 0.5);
      sp.style.setProperty('--sx', Math.cos(a) * d + 'px');
      sp.style.setProperty('--sy', Math.sin(a) * d + 'px');
      laterRm(sp, life || 640);
    }
  }

  /** Боевые FX шамана — слой skill-fx-layer в бою, не спрайты тест-комнаты. */
  function playShamanSkillFx(layer, from, list, ability, hitPulse, actor) {
    if (!actor || actor.classId !== 'shaman') return 0;
    const id = ability.id || '';
    const type = String(ability.type || '');
    if (!list.length && (id === 'hst' || id === 'spirit_link' || id === 'hs' || id === 'healing_rain')) {
      try {
        if (typeof run !== 'undefined' && run && run.party) {
          list = run.party.filter(p => p && p.alive && !p.isPet);
        }
      } catch (_) {}
    }
    const to0 = list[0] ? (unitCenter(list[0].uid) || from) : from;
    const pulse = (t, kind) => {
      if (hitPulse) hitPulse(t);
      else if (t && t.uid) pulseUnit(t.uid, kind || 'healed');
    };

    if (id === 'ch' || id === 'chain_heal' || id === 'chain' || id === 'chain_light' || id === 'lightning') {
      const isHeal = id === 'ch' || id === 'chain_heal';
      playChainHopFx(layer, from, list, {
        school: isHeal ? 'heal' : 'nature',
        isHeal,
        pal: isHeal ? 'heal' : 'nature',
        hitPulse,
      });
      return estimateChainAnimMs(Math.max(1, list.length));
    }

    if (id === 'lb') {
      playChainHopFx(layer, from, list.slice(0, 1), {
        school: 'nature', isHeal: false, pal: 'nature', hitPulse,
      });
      return estimateChainAnimMs(1);
    }

    if (id === 'riptide') {
      shamFly(layer, 'sham-tide-orb', from.x, from.y, to0.x, to0.y, 340, () => {
        laterRm(shamEl(layer, 'sham-tide-ring', to0.x, to0.y), 800);
        for (let i = 0; i < 4; i++) {
          const o = shamEl(layer, 'sham-tide-orbit', to0.x, to0.y);
          o.style.setProperty('--oang', (i * 90) + 'deg');
          o.style.animationDelay = (i * 40) + 'ms';
          laterRm(o, 900);
        }
        if (list[0]) pulse(list[0], 'healed');
      });
      return 1240;
    }

    if (id === 'hw' || id === 'healing_wave') {
      laterRm(shamLinkLine(layer, from.x, from.y, to0.x, to0.y, 'sham-wave-beam', 720), 720);
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          const t = (i + 1) / 7;
          laterRm(shamEl(layer, 'sham-wave-crest', from.x + (to0.x - from.x) * t, from.y + (to0.y - from.y) * t), 520);
        }, i * 55);
      }
      setTimeout(() => {
        laterRm(shamEl(layer, 'sham-heal-splash', to0.x, to0.y), 700);
        if (list[0]) pulse(list[0], 'healed');
      }, 380);
      return 720;
    }

    if (id === 'chw') {
      shamFly(layer, 'sham-surge-orb', from.x, from.y, to0.x, to0.y, 220, () => {
        laterRm(shamEl(layer, 'sham-heal-splash sham-surge-splash', to0.x, to0.y), 700);
        const plus = shamEl(layer, 'chain-plus school-heal', to0.x, to0.y - 10);
        plus.textContent = '+';
        laterRm(plus, 700);
        if (list[0]) pulse(list[0], 'healed');
      });
      return 920;
    }

    if (id === 'hs' || id === 'healing_rain') {
      const tgts = list.length ? list : [];
      tgts.forEach((t, i) => {
        const p = unitCenter(t.uid);
        if (!p) return;
        setTimeout(() => {
          laterRm(shamEl(layer, 'sham-rain-cloud', p.x, p.y - 36), 1100);
          for (let k = 0; k < 8; k++) {
            const d = shamEl(layer, 'sham-rain-drop', p.x + (Math.random() * 36 - 18), p.y - 28);
            d.style.animationDelay = (k * 40) + 'ms';
            laterRm(d, 900);
          }
          pulse(t, 'healed');
        }, i * 70);
      });
      return 1100 + Math.max(0, tgts.length - 1) * 70;
    }

    if (id === 'hst') {
      laterRm(shamEl(layer, 'sham-totem', from.x, from.y + 18), 1100);
      const allies = list.length ? list : [];
      allies.forEach((t, i) => {
        const p = unitCenter(t.uid);
        if (!p) return;
        setTimeout(() => {
          shamLinkLine(layer, from.x, from.y + 18, p.x, p.y, 'sham-stream', 640);
          laterRm(shamEl(layer, 'sham-heal-splash', p.x, p.y), 700);
          pulse(t, 'healed');
        }, 120 + i * 80);
      });
      return 1100 + Math.max(0, allies.length - 1) * 80;
    }

    if (id === 'spirit_link') {
      laterRm(shamEl(layer, 'sham-link-totem', from.x, from.y + 16), 1200);
      const pts = [from].concat(list.map(t => unitCenter(t.uid)).filter(Boolean));
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          shamLinkLine(layer, pts[i].x, pts[i].y, pts[j].x, pts[j].y, 'sham-spirit-web', 900);
        }
      }
      list.forEach((t, i) => setTimeout(() => {
        const p = unitCenter(t.uid);
        if (p) laterRm(shamEl(layer, 'sham-link-node', p.x, p.y), 900);
        pulse(t, 'shielded');
      }, 80 + i * 50));
      return 1200;
    }

    if (id === 'unleash') {
      laterRm(shamEl(layer, 'sham-unleash-burst', from.x, from.y), 900);
      shamSparks(layer, 'sham-unleash-spark', from.x, from.y, 8, 36, 700);
      if (type === 'buff') {
        laterRm(shamEl(layer, 'sham-ascend', from.x, from.y), 900);
        pulseUnit(actor.uid, 'shielded');
      } else if (list[0]) {
        setTimeout(() => {
          laterRm(shamEl(layer, 'sham-heal-splash', to0.x, to0.y), 700);
          pulse(list[0], 'healed');
        }, 160);
      }
      return 900;
    }

    if (id === 'flame_shock') {
      shamFly(layer, 'sham-flame-orb', from.x, from.y, to0.x, to0.y, 280, () => {
        laterRm(shamEl(layer, 'sham-flame-ring', to0.x, to0.y), 800);
        shamSparks(layer, 'sham-ember', to0.x, to0.y, 6, 22, 620);
        if (list[0]) pulse(list[0], 'hit');
      });
      return 1080;
    }

    if (id === 'lv' || id === 'lava_burst') {
      shamFly(layer, 'sham-lava-orb', from.x, from.y, to0.x, to0.y, 300, () => {
        laterRm(shamEl(layer, 'sham-lava-burst', to0.x, to0.y), 860);
        laterRm(shamEl(layer, 'sham-flame-ring', to0.x, to0.y), 800);
        shamSparks(layer, 'sham-ember', to0.x, to0.y, 10, 30, 680);
        if (list[0]) pulse(list[0], 'hit');
      });
      return 1160;
    }

    if (id === 'earth_shock') {
      laterRm(shamEl(layer, 'sham-earth-ring', to0.x, to0.y + 10), 820);
      shamSparks(layer, 'sham-earth-chunk', to0.x, to0.y + 8, 7, 24, 640);
      laterRm(shamEl(layer, 'sham-earth-crack', to0.x, to0.y + 14), 700);
      if (list[0]) pulse(list[0], 'hit');
      return 820;
    }

    if (id === 'ele_blast') {
      shamFly(layer, 'sham-ele-orb', from.x, from.y, to0.x, to0.y, 300, () => {
        laterRm(shamEl(layer, 'sham-ele-burst', to0.x, to0.y), 820);
        shamSparks(layer, 'sham-unleash-spark', to0.x, to0.y, 8, 28, 640);
        if (list[0]) pulse(list[0], 'hit');
      });
      return 1120;
    }

    if (id === 'thunderstorm') {
      laterRm(shamEl(layer, 'sham-storm-cloud', from.x, from.y - 28), 1100);
      laterRm(shamEl(layer, 'sham-storm-ring', from.x, from.y), 900);
      list.forEach((t, i) => {
        const p = unitCenter(t.uid);
        if (!p) return;
        setTimeout(() => {
          laterRm(shamEl(layer, 'sham-bolt-flash', p.x, p.y - 8), 420);
          laterRm(shamEl(layer, 'chain-splash-ring school-nature', p.x, p.y), 700);
          pulse(t, 'hit');
        }, 80 + i * 70);
      });
      return 1100;
    }

    if (id === 'fire_nova') {
      const tgts = list.length ? list : [];
      tgts.forEach((t, i) => {
        const p = unitCenter(t.uid);
        if (!p) return;
        setTimeout(() => {
          laterRm(shamEl(layer, 'sham-nova-ring', p.x, p.y), 860);
          shamSparks(layer, 'sham-ember', p.x, p.y, 7, 26, 620);
          pulse(t, 'hit');
        }, i * 60);
      });
      return 860 + Math.max(0, tgts.length - 1) * 60;
    }

    if (id === 'stormstrike') {
      laterRm(shamEl(layer, 'sham-ss-slash', to0.x, to0.y), 520);
      setTimeout(() => laterRm(shamEl(layer, 'sham-ss-slash sham-ss-slash-b', to0.x, to0.y), 520), 90);
      laterRm(shamEl(layer, 'sham-bolt-flash', to0.x, to0.y - 6), 400);
      if (list[0]) pulse(list[0], 'hit');
      return 610;
    }

    if (id === 'lava_lash') {
      laterRm(shamEl(layer, 'sham-ll-slash', to0.x, to0.y), 560);
      shamSparks(layer, 'sham-ember', to0.x, to0.y, 8, 24, 620);
      if (list[0]) pulse(list[0], 'hit');
      return 620;
    }

    if (id === 'ascendance') {
      laterRm(shamEl(layer, 'sham-ascend', from.x, from.y), 1100);
      laterRm(shamEl(layer, 'sham-storm-ring', from.x, from.y), 900);
      shamSparks(layer, 'sham-unleash-spark', from.x, from.y, 10, 42, 800);
      pulseUnit(actor.uid, 'shielded');
      return 1100;
    }

    if (id === 'fire_ele') {
      laterRm(shamEl(layer, 'sham-fire-pillar', from.x, from.y + 8), 1000);
      laterRm(shamEl(layer, 'sham-nova-ring', from.x, from.y), 860);
      if (list[0]) {
        shamFly(layer, 'sham-lava-orb', from.x, from.y, to0.x, to0.y, 260, () => {
          laterRm(shamEl(layer, 'sham-lava-burst', to0.x, to0.y), 800);
          pulse(list[0], 'hit');
        });
      }
      return 1000;
    }

    if (id === 'feral_spirit') {
      laterRm(shamEl(layer, 'sham-wolf-dash', from.x + 10, from.y), 640);
      setTimeout(() => laterRm(shamEl(layer, 'sham-wolf-dash sham-wolf-dash-b', from.x + 6, from.y + 8), 640), 80);
      if (list[0]) {
        setTimeout(() => {
          laterRm(shamEl(layer, 'sham-ss-slash', to0.x, to0.y), 500);
          pulse(list[0], 'hit');
        }, 180);
      }
      return 680;
    }

    if (id === 'kick' || id === 'wind_shear') {
      const s = shamEl(layer, 'sham-wind-cut', (from.x + to0.x) / 2, (from.y + to0.y) / 2);
      const ang = Math.atan2(to0.y - from.y, to0.x - from.x) * 180 / Math.PI;
      s.style.setProperty('--cut-rot', ang + 'deg');
      laterRm(s, 520);
      if (list[0]) pulse(list[0], 'hit');
      return 520;
    }

    if (id === 'party_dispel') {
      laterRm(shamEl(layer, 'sham-cleanse', to0.x, to0.y), 800);
      if (list[0]) pulse(list[0], 'healed');
      return 800;
    }

    if (id === 'party_purge') {
      laterRm(shamEl(layer, 'sham-purge', to0.x, to0.y), 800);
      if (list[0]) pulse(list[0], 'hit');
      return 800;
    }

    return 0;
  }

  function playLeiShenFx(actor, ability, targets, layer, from) {
    if (!actor || !ability || !layer) return 0;
    const name = String(ability.name || '');
    const kick = ability.castKind === 'kick' || /Сверхзаряд|Цепная|Конец династии|Гнев катакомб|Вопль/.test(name);
    const aoe = ability.type === 'aoe' || ability.type === 'cast_aoe' || ability.castKind === 'aoe' || /поле|разряд|Децимация|Гнев Грома/.test(name);
    const buster = ability.castKind === 'buster' || /Казнь|Децимация|Гнев Грома|Обвал/.test(name);
    const list = (targets || []).filter(Boolean);
    if (typeof flashScreen === 'function') flashScreen(buster || aoe);
    const bolts = document.createElement('canvas');
    bolts.className = 'lei-fx-bolts';
    bolts.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:70;';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    bolts.width = Math.floor(window.innerWidth * dpr);
    bolts.height = Math.floor(window.innerHeight * dpr);
    layer.appendChild(bolts);
    const ctx = bolts.getContext('2d');
    if (ctx && typeof buildStrike === 'function' && typeof strokeBolt === 'function') {
      const specs = aoe
        ? [{ x: 0.2, fat: true, branch: 3 }, { x: 0.5, fat: true, branch: 4 }, { x: 0.8, fat: false, branch: 2 }]
        : [{ x: from.x / Math.max(1, window.innerWidth), fat: !!buster, branch: buster ? 3 : 2 }];
      const built = specs.map(s => buildStrike(bolts.width, bolts.height, s)).filter(Boolean);
      const started = performance.now();
      const life = kick ? 700 : (buster ? 900 : 560);
      const tick = (now) => {
        const t = now - started;
        ctx.clearRect(0, 0, bolts.width, bolts.height);
        const fade = Math.max(0, 1 - t / life);
        ctx.globalAlpha = fade;
        for (const b of built) {
          strokeBolt(ctx, b.main, b.fat ? 5 : 3, 'rgba(220,244,255,0.95)', 14);
          strokeBolt(ctx, b.main, b.fat ? 2 : 1.2, 'rgba(255,255,255,0.95)', 4);
          for (const br of (b.branches || [])) strokeBolt(ctx, br, 1.3, 'rgba(180,220,255,0.8)', 8);
        }
        ctx.globalAlpha = 1;
        if (t < life) requestAnimationFrame(tick);
        else bolts.remove();
      };
      requestAnimationFrame(tick);
    } else {
      setTimeout(() => bolts.remove(), 600);
    }
    for (const t of list) {
      const c = unitCenter(t.uid);
      if (!c) continue;
      const ring = document.createElement('div');
      ring.className = 'lei-fx-ring' + (buster ? ' buster' : '');
      ring.style.left = c.x + 'px';
      ring.style.top = c.y + 'px';
      layer.appendChild(ring);
      setTimeout(() => ring.remove(), 900);
    }
    const tag = document.createElement('div');
    tag.className = 'lei-fx-name';
    tag.textContent = name;
    tag.style.left = from.x + 'px';
    tag.style.top = (from.y - 36) + 'px';
    layer.appendChild(tag);
    setTimeout(() => tag.remove(), 1100);
    const life = kick ? 700 : (buster ? 900 : 560);
    return Math.max(life, list.length ? 900 : 0, 1100);
  }

  function playSkillAnim(actor, ability, targets) {
    if (!juiceOk() || !actor) return 0;
    const layer = document.getElementById('skill-fx-layer');
    if (!layer) return 0;
    const from = unitCenter(actor.uid);
    if (!from) return 0;
    let animMs = 0;
    if (actor.raidBoss || (actor.mech && actor.mech.id === 'thunder_king') || actor.heroId === 'ls') {
      try { animMs = Math.max(animMs, playLeiShenFx(actor, ability, targets, layer, from) || 0); } catch (e) { console.error('[lei fx]', e); }
    }
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
      if (impact === 'explode' || school === 'frost' || school === 'holy') {
        const r = document.createElement('div');
        r.className = 'skill-ring' + (school ? ' ' + school : '');
        r.style.left = x + 'px';
        r.style.top = y + 'px';
        layer.appendChild(r);
        setTimeout(() => r.remove(), 900);
      } else if (impact === 'drain' || school === 'shadow' || school === 'blood') {
        const o = document.createElement('div');
        o.className = 'skill-orbit' + (school && school !== 'physical' ? ' ' + school : ' shadow');
        o.style.left = x + 'px';
        o.style.top = y + 'px';
        layer.appendChild(o);
        setTimeout(() => o.remove(), 900);
      } else if (school === 'fire') {
        for (let i = 0; i < 3; i++) {
          const d = document.createElement('div');
          d.className = 'skill-rain-drop fire';
          d.style.left = (x + (Math.random() * 28 - 14)) + 'px';
          d.style.top = (y + (Math.random() * 16 - 18)) + 'px';
          d.style.animationDelay = (i * 0.03) + 's';
          layer.appendChild(d);
          setTimeout(() => d.remove(), 800);
        }
      }
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
    const drawnSchool = (school && school !== 'none') ? school : (style || 'physical');
    const spawnDrawnHit = (x, y, impact) => {
      laterRm(shamEl(layer, 'fx-hit school-' + drawnSchool + (impact && impact !== 'hit' ? ' impact-' + impact : ''), x, y), 720);
      const n = impact === 'explode' ? 9 : (impact === 'splash' ? 7 : 5);
      shamSparks(layer, 'fx-spark school-' + drawnSchool, x, y, n, impact === 'explode' ? 30 : 18, 580);
      if (drawnSchool === 'heal' || type === 'heal' || type === 'heal_aoe' || type === 'shield') {
        const plus = shamEl(layer, 'chain-plus school-heal', x, y - 8);
        plus.textContent = '+';
        laterRm(plus, 700);
      }
    };
    const spawnProjectile = (to, onHit) => {
      const dx = to.x - from.x, dy = to.y - from.y;
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      const dist = Math.hypot(dx, dy);
      const dur = clamp(dist / 520, 0.42, 0.85);
      const el = shamEl(layer, 'fx-orb school-' + drawnSchool, from.x, from.y);
      el.animate([
        { transform: 'translate(-50%,-50%) rotate(' + ang + 'deg) scale(.5)', opacity: 0.25 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) rotate(' + ang + 'deg) scale(1)', opacity: 1 },
      ], { duration: dur * 1000, easing: 'cubic-bezier(.18,.75,.22,1)', fill: 'forwards' });
      setTimeout(() => { el.remove(); if (onHit) onHit(); }, dur * 1000);
      return Math.round(dur * 1000);
    };
    const hitPulse = (t) => {
      if (type === 'heal' || type === 'heal_aoe' || type === 'shield' || school === 'heal') pulseUnit(t.uid, type === 'shield' ? 'shielded' : 'healed');
      else pulseUnit(t.uid, 'hit');
    };
    const staggerMs = (step, n) => Math.max(0, (Math.max(1, n) - 1) * step);

    const shamMs = playShamanSkillFx(layer, from, list, ability, hitPulse, actor);
    if (shamMs) return noteSkillAnimMs(Math.max(animMs, shamMs));

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
      return noteSkillAnimMs(Math.max(animMs, 1100 + staggerMs(90, list.length)));
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
      return noteSkillAnimMs(Math.max(animMs, 1100 + staggerMs(90, list.length)));
    }

    // Цепь: живая нить шаман → цель → цель.
    if (fx.motion === 'chain') {
      const isHeal = type.indexOf('heal') === 0 || school === 'heal';
      const chainMs = playChainHopFx(layer, from, list, {
        school,
        isHeal,
        pal: school || (isHeal ? 'heal' : 'nature'),
        hitPulse,
      }) || estimateChainAnimMs(Math.max(1, list.length));
      return noteSkillAnimMs(Math.max(animMs, chainMs));
    }

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
          spawnDrawnHit(to.x, to.y, fx.impact);
          hitPulse(t);
        }, 120 + i * 90);
      });
      const aoeLife = fx.motion === 'rain'
        ? 1000 + staggerMs(70, list.length)
        : 1100 + staggerMs(90, list.length);
      return noteSkillAnimMs(Math.max(animMs, aoeLife));
    }

    // Per-target
    let hitMs = 0;
    list.forEach((t, i) => {
      const to = unitCenter(t.uid);
      if (!to) return;
      const delay = i * 90;
      const motion = fx.motion;
      let piece = 900;
      if (motion === 'beam' || type === 'heal' || type === 'shield') piece = 750;
      else if (motion === 'slash') piece = 900;
      else if (motion === 'slam' || motion === 'nova' || motion === 'swirl') piece = 1100;
      else if (motion === 'arc') piece = 700;
      else if (motion === 'pierce') piece = 650;
      else if (motion === 'orbit' || motion === 'rain') piece = 1000;
      else if (motion === 'chain') piece = 750;
      else {
        const dist = Math.hypot(to.x - from.x, to.y - from.y);
        piece = Math.round(clamp(dist / 520, 0.42, 0.85) * 1000) + 900;
      }
      hitMs = Math.max(hitMs, delay + piece);
      setTimeout(() => {
        if (motion === 'beam' || type === 'heal' || type === 'shield') {
          spawnBeam(from.x, from.y, to.x, to.y);
          spawnDrawnHit(to.x, to.y, fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'chain') {
          spawnBeam(from.x, from.y, to.x, to.y);
          spawnDrawnHit(to.x, to.y, fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'slash' || motion === 'slam') {
          spawnSlash(to.x, to.y);
          if (motion === 'slam') spawnRing(to.x, to.y, true);
          spawnDrawnHit(to.x, to.y, fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'arc') {
          spawnArc(to.x, to.y);
          spawnDrawnHit(to.x, to.y, fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'pierce') {
          spawnPierce(from.x, from.y, to.x, to.y);
          spawnDrawnHit(to.x, to.y, fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'orbit') {
          spawnOrbit(to.x, to.y);
          spawnDrawnHit(to.x, to.y, fx.impact);
          if (type === 'dot') spawnRing(to.x, to.y);
          hitPulse(t);
          return;
        }
        if (motion === 'nova') {
          spawnRing(to.x, to.y, true);
          spawnDrawnHit(to.x, to.y, fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'rain') {
          spawnRain(to.x, to.y, 6);
          spawnDrawnHit(to.x, to.y, fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'swirl') {
          spawnSwirl(to.x, to.y);
          spawnDrawnHit(to.x, to.y, fx.impact);
          hitPulse(t);
          return;
        }
        spawnProjectile(to, () => {
          spawnDrawnHit(to.x, to.y, fx.impact);
          if (type === 'dot') spawnRing(to.x, to.y);
          hitPulse(t);
        });
      }, delay);
    });

    if (!list.length) {
      spawnBurst(from.x, from.y, style, fx.impact);
      hitMs = 900;
    }
    return noteSkillAnimMs(Math.max(animMs, hitMs));
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
    try { if (typeof paintBossFlanks === 'function') paintBossFlanks(); } catch (_) {}
  }
  // Portraits + battle backgrounds only (ability icons stay emoji).
  // Base is always the game root `assets/` folder (resolved from this script URL),
  // so paths stay correct even if the page is opened from a subpath or CSS lives in css/.
