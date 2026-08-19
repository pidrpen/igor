/* ui/skill-fx-warrior: SKILL_FX + SKILL_ICON for Arms / Fury / Protection */
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
  window.SKILL_ICON = window.SKILL_ICON || {};
  Object.assign(window.SKILL_ICON, {
    ms: 'assets/icons/skills/ms.png',
    whirlwind: 'assets/icons/skills/whirlwind.png',
    overpower: 'assets/icons/skills/overpower.png',
    colossus: 'assets/icons/skills/colossus.png',
    slam: 'assets/icons/skills/slam.png',
    execute: 'assets/icons/skills/execute.png',
    heroic: 'assets/icons/skills/heroic.png',
    charge: 'assets/icons/skills/charge.png',
    reck: 'assets/icons/skills/reck.png',
    bt: 'assets/icons/skills/bt.png',
    rb: 'assets/icons/skills/rb.png',
    berserker: 'assets/icons/skills/berserker.png',
    shield_slam: 'assets/icons/skills/shield_slam.png',
    revenge: 'assets/icons/skills/revenge.png',
    thunder: 'assets/icons/skills/thunder.png',
    shield_block: 'assets/icons/skills/shield_block.png',
    shield_wall: 'assets/icons/skills/shield_wall.png',
    last_stand: 'assets/icons/skills/last_stand.png',
    taunt: 'assets/icons/skills/taunt.png',
    demo_shout: 'assets/icons/skills/demo_shout.png',
  });
})();
