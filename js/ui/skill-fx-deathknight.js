/* Skill FX: deathknight (blood / frost / unholy) */
(function () {
  'use strict';
  window.SKILL_FX = window.SKILL_FX || {};
  const fx = {
    death_strike: { school: 'blood', motion: 'slash', impact: 'hit' },
    heart_strike: { school: 'blood', motion: 'slash', impact: 'burst' },
    blood_boil: { school: 'blood', motion: 'nova', impact: 'burst' },
    bone_shield: { school: 'physical', motion: 'nova', impact: 'ring' },
    dnd: { school: 'shadow', motion: 'rain', impact: 'shard' },
    vampiric_blood: { school: 'blood', motion: 'pulse', impact: 'flash' },
    icebound: { school: 'frost', motion: 'nova', impact: 'ring' },
    taunt: { school: 'shadow', motion: 'pulse', impact: 'hit' },
    obliterate: { school: 'frost', motion: 'slash', impact: 'burst' },
    fs: { school: 'frost', motion: 'slash', impact: 'flash' },
    howling: { school: 'frost', motion: 'nova', impact: 'flash' },
    raise_ghoul: { school: 'shadow', motion: 'orbit', impact: 'burst' },
    soul_reaper: { school: 'frost', motion: 'lunge', impact: 'burst' },
    ity: { school: 'frost', motion: 'orbit', impact: 'flash' },
    horn: { school: 'frost', motion: 'pulse', impact: 'ring' },
    scourge: { school: 'shadow', motion: 'slash', impact: 'shard' },
    festering: { school: 'physical', motion: 'slash', impact: 'shard' },
    death_coil: { school: 'shadow', motion: 'bolt', impact: 'burst' },
    outbreak: { school: 'shadow', motion: 'rain', impact: 'burst' },
    dark_trans: { school: 'shadow', motion: 'swirl', impact: 'flash' },
    summon_garg: { school: 'shadow', motion: 'glaive', impact: 'ring' },
  };
  Object.assign(window.SKILL_FX, fx);
})();
