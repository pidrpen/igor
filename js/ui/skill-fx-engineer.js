/* ui/skill-fx-engineer: window.SKILL_FX */
(function (w) {
  'use strict';
  w.SKILL_FX = Object.assign(w.SKILL_FX || {}, {
    wrench_bash: { motion: 'slash', school: 'physical', impact: 'hit' },
    rivet_gun: { motion: 'pierce', school: 'physical', impact: 'hit' },
    plasma_cutter: { motion: 'orbit', school: 'arcane', impact: 'explode' },
    bot_overdrive: { motion: 'swirl', school: 'arcane', impact: 'hit' },
    overclock: { motion: 'orbit', school: 'arcane', impact: 'hit' },
    emergency_repair: { motion: 'swirl', school: 'heal', impact: 'splash' },
    call_siege_walker: { motion: 'slam', school: 'physical', impact: 'explode' },
    shock_wrench: { motion: 'slash', school: 'arcane', impact: 'hit' },
    sticky_bomb: { motion: 'arc', school: 'fire', impact: 'explode' },
    shrapnel_blast: { motion: 'nova', school: 'physical', impact: 'splash' },
    cluster_bomb: { motion: 'rain', school: 'fire', impact: 'explode' },
    deploy_bomb_drone: { motion: 'orbit', school: 'fire', impact: 'splash' },
    rocket_barrage: { motion: 'pierce', school: 'fire', impact: 'explode' },
    remote_charge: { motion: 'bolt', school: 'fire', impact: 'explode' },
    demolish: { motion: 'slam', school: 'fire', impact: 'explode' },
    nitro_boosts: { motion: 'swirl', school: 'fire', impact: 'hit' },
    zap_gun: { motion: 'bolt', school: 'arcane', impact: 'hit' },
    flux_bolt: { motion: 'arc', school: 'arcane', impact: 'splash' },
    death_ray: { motion: 'beam', school: 'fire', impact: 'drain' },
    rocket_chicken: { motion: 'arc', school: 'fire', impact: 'splash' },
    world_destroyer: { motion: 'nova', school: 'physical', impact: 'explode' },
    shrink_ray: { motion: 'beam', school: 'arcane', impact: 'drain' },
    scrap_swarm: { motion: 'swirl', school: 'physical', impact: 'splash' },
    debug_mode: { motion: 'nova', school: 'arcane', impact: 'hit' },
    wrench_heal: { motion: 'beam', school: 'heal', impact: 'hit' },
  });
})(window);
