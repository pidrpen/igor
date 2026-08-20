/* ui/skill-fx-warrior: SKILL_FX for Arms / Fury / Protection */
(function () {
  'use strict';
  window.SKILL_FX = window.SKILL_FX || {};
  Object.assign(window.SKILL_FX, {
    ms: { school: 'physical', motion: 'slash', impact: 'burst' },
    whirlwind: { school: 'physical', motion: 'swirl', impact: 'ring' },
    overpower: { school: 'physical', motion: 'lunge', impact: 'hit' },
    colossus: { school: 'physical', motion: 'pulse', impact: 'burst' },
    slam: { school: 'physical', motion: 'slash', impact: 'shard' },
    execute: { school: 'blood', motion: 'slash', impact: 'burst' },
    heroic: { school: 'physical', motion: 'slash', impact: 'flash' },
    charge: { school: 'physical', motion: 'lunge', impact: 'ring' },
    reck: { school: 'fire', motion: 'orbit', impact: 'flash' },
    bt: { school: 'blood', motion: 'slash', impact: 'hit' },
    rb: { school: 'physical', motion: 'slash', impact: 'hit' },
    berserker: { school: 'fire', motion: 'pulse', impact: 'flash' },
    shield_slam: { school: 'physical', motion: 'pulse', impact: 'hit' },
    revenge: { school: 'physical', motion: 'glaive', impact: 'hit' },
    thunder: { school: 'nature', motion: 'nova', impact: 'burst' },
    shield_block: { school: 'physical', motion: 'orbit', impact: 'ring' },
    shield_wall: { school: 'physical', motion: 'nova', impact: 'flash' },
    last_stand: { school: 'blood', motion: 'pulse', impact: 'flash' },
    taunt: { school: 'physical', motion: 'pulse', impact: 'ring' },
    demo_shout: { school: 'shadow', motion: 'swirl', impact: 'ring' },
  });
})();
