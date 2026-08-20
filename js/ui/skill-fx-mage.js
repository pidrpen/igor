/* ui/skill-fx-mage: SKILL_FX for Arcane / Fire / Frost */
(function () {
  'use strict';
  window.SKILL_FX = window.SKILL_FX || {};
  const fx = {
    ab: { school: 'arcane', motion: 'bolt', impact: 'burst' },
    am: { school: 'arcane', motion: 'rain', impact: 'flash' },
    abarr: { school: 'arcane', motion: 'glaive', impact: 'burst' },
    ae: { school: 'arcane', motion: 'nova', impact: 'ring' },
    nether_tempest: { school: 'arcane', motion: 'orbit', impact: 'shard' },
    arcane_power: { school: 'arcane', motion: 'pulse', impact: 'flash' },
    presence: { school: 'arcane', motion: 'orbit', impact: 'flash' },
    mirror: { school: 'arcane', motion: 'swirl', impact: 'ring' },
    evocation: { school: 'arcane', motion: 'beam', impact: 'hit' },
    fireball: { school: 'fire', motion: 'bolt', impact: 'burst' },
    pyroblast: { school: 'fire', motion: 'bolt', impact: 'shard' },
    scorch: { school: 'fire', motion: 'beam', impact: 'flash' },
    living_bomb: { school: 'fire', motion: 'orbit', impact: 'burst' },
    flamestrike: { school: 'fire', motion: 'rain', impact: 'burst' },
    alter_time: { school: 'arcane', motion: 'swirl', impact: 'flash' },
    frostbolt: { school: 'frost', motion: 'bolt', impact: 'hit' },
    ice_lance: { school: 'frost', motion: 'lunge', impact: 'hit' },
    frozen_orb: { school: 'frost', motion: 'orbit', impact: 'ring' },
    deep_freeze: { school: 'frost', motion: 'nova', impact: 'burst' },
    blizzard: { school: 'frost', motion: 'rain', impact: 'flash' },
    icy_veins: { school: 'frost', motion: 'pulse', impact: 'flash' },
    summon_water: { school: 'frost', motion: 'orbit', impact: 'burst' },
  };
  Object.assign(window.SKILL_FX, fx);
})();
