/* Skill FX: priest (discipline / holy / shadow) */
(function () {
  'use strict';
  window.SKILL_FX = window.SKILL_FX || {};
  const fx = {
    penance: { school: 'holy', motion: 'chain', impact: 'burst' },
    shield: { school: 'holy', motion: 'nova', impact: 'ring' },
    flash: { school: 'heal', motion: 'beam', impact: 'flash' },
    greater: { school: 'holy', motion: 'beam', impact: 'burst' },
    prayer: { school: 'holy', motion: 'rain', impact: 'ring' },
    smite: { school: 'holy', motion: 'bolt', impact: 'flash' },
    holy_fire: { school: 'fire', motion: 'bolt', impact: 'burst' },
    hellfiend: { school: 'fel', motion: 'pulse', impact: 'burst' },
    heaven_shield: { school: 'holy', motion: 'nova', impact: 'flash' },
    pain_supp: { school: 'holy', motion: 'pulse', impact: 'ring' },
    archangel: { school: 'holy', motion: 'orbit', impact: 'flash' },
    heal: { school: 'heal', motion: 'beam', impact: 'hit' },
    renew: { school: 'nature', motion: 'orbit', impact: 'hit' },
    circle: { school: 'holy', motion: 'nova', impact: 'burst' },
    poh: { school: 'holy', motion: 'rain', impact: 'flash' },
    holy_word: { school: 'holy', motion: 'pulse', impact: 'flash' },
    gh: { school: 'holy', motion: 'beam', impact: 'ring' },
    guardian: { school: 'holy', motion: 'orbit', impact: 'ring' },
    mind_blast: { school: 'shadow', motion: 'bolt', impact: 'burst' },
    swp: { school: 'shadow', motion: 'orbit', impact: 'shard' },
    vt: { school: 'shadow', motion: 'pulse', impact: 'hit' },
    mind_flay: { school: 'shadow', motion: 'beam', impact: 'hit' },
    mind_sear: { school: 'shadow', motion: 'rain', impact: 'burst' },
    devouring: { school: 'shadow', motion: 'swirl', impact: 'shard' },
    swd: { school: 'shadow', motion: 'bolt', impact: 'flash' },
    mind_spike: { school: 'shadow', motion: 'bolt', impact: 'shard' },
    shadowfiend: { school: 'shadow', motion: 'lunge', impact: 'burst' },
    dispersion: { school: 'shadow', motion: 'swirl', impact: 'flash' },
  };
  Object.assign(window.SKILL_FX, fx);
})();
