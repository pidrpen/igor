/* ui/skill-fx-paladin: SKILL_FX for Holy / Protection / Retribution */
(function () {
  'use strict';
  window.SKILL_FX = window.SKILL_FX || {};
  Object.assign(window.SKILL_FX, {
    holy_shock: { school: 'holy', motion: 'bolt', impact: 'flash' },
    holy_light: { school: 'heal', motion: 'beam', impact: 'hit' },
    flash: { school: 'heal', motion: 'beam', impact: 'flash' },
    holy_radiance: { school: 'heal', motion: 'nova', impact: 'flash' },
    word_glory: { school: 'heal', motion: 'pulse', impact: 'burst' },
    light_dawn: { school: 'heal', motion: 'rain', impact: 'flash' },
    crusader: { school: 'holy', motion: 'slash', impact: 'hit' },
    divine_prot: { school: 'holy', motion: 'orbit', impact: 'ring' },
    avenging: { school: 'holy', motion: 'orbit', impact: 'flash' },
    judgment: { school: 'holy', motion: 'bolt', impact: 'burst' },
    avengers: { school: 'holy', motion: 'glaive', impact: 'ring' },
    hot_r: { school: 'holy', motion: 'slash', impact: 'burst' },
    sot_r: { school: 'holy', motion: 'pulse', impact: 'hit' },
    consecrate: { school: 'holy', motion: 'rain', impact: 'ring' },
    hot_w: { school: 'holy', motion: 'lunge', impact: 'flash' },
    ardent: { school: 'holy', motion: 'pulse', impact: 'flash' },
    taunt: { school: 'holy', motion: 'chain', impact: 'flash' },
    templar: { school: 'holy', motion: 'slash', impact: 'shard' },
    divine_storm: { school: 'holy', motion: 'swirl', impact: 'burst' },
    inquisition: { school: 'holy', motion: 'orbit', impact: 'hit' },
  });
})();
