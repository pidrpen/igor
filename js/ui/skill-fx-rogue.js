/* Skill FX: rogue (assassination / combat / subtlety) */
(function () {
  'use strict';
  window.SKILL_FX = window.SKILL_FX || {};
  const fx = {
    mutilate: { school: 'physical', motion: 'slash', impact: 'hit' },
    dispatch: { school: 'physical', motion: 'lunge', impact: 'burst' },
    envenom: { school: 'nature', motion: 'bolt', impact: 'flash' },
    rupture: { school: 'blood', motion: 'slash', impact: 'shard' },
    garrote: { school: 'physical', motion: 'chain', impact: 'hit' },
    vendetta: { school: 'shadow', motion: 'orbit', impact: 'flash' },
    fan: { school: 'physical', motion: 'glaive', impact: 'shard' },
    slice: { school: 'physical', motion: 'swirl', impact: 'flash' },
    ss: { school: 'physical', motion: 'slash', impact: 'burst' },
    revealing: { school: 'physical', motion: 'lunge', impact: 'hit' },
    eviscerate: { school: 'blood', motion: 'slash', impact: 'burst' },
    killing_spree: { school: 'physical', motion: 'lunge', impact: 'shard' },
    adrenaline: { school: 'fire', motion: 'pulse', impact: 'flash' },
    blade_flurry: { school: 'physical', motion: 'swirl', impact: 'hit' },
    hemorrhage: { school: 'blood', motion: 'slash', impact: 'ring' },
    backstab: { school: 'shadow', motion: 'lunge', impact: 'hit' },
    ambush: { school: 'shadow', motion: 'lunge', impact: 'burst' },
    shadow_dance: { school: 'shadow', motion: 'swirl', impact: 'flash' },
    prem: { school: 'shadow', motion: 'orbit', impact: 'ring' },
  };
  Object.assign(window.SKILL_FX, fx);
})();
