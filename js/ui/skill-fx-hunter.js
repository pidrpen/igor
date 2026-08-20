/* ui/skill-fx-hunter: SKILL_FX for Beast Mastery / Marksmanship / Survival */
(function () {
  'use strict';
  window.SKILL_FX = window.SKILL_FX || {};
  Object.assign(window.SKILL_FX, {
    kill_cmd: { school: 'physical', motion: 'lunge', impact: 'burst' },
    cobra: { school: 'nature', motion: 'bolt', impact: 'hit' },
    arcane_shot: { school: 'arcane', motion: 'bolt', impact: 'flash' },
    kill_shot: { school: 'physical', motion: 'bolt', impact: 'burst' },
    multi: { school: 'physical', motion: 'rain', impact: 'shard' },
    bestial: { school: 'nature', motion: 'pulse', impact: 'flash' },
    rapid: { school: 'physical', motion: 'orbit', impact: 'flash' },
    serpent: { school: 'nature', motion: 'orbit', impact: 'hit' },
    dire: { school: 'physical', motion: 'pulse', impact: 'burst' },
    chimera: { school: 'frost', motion: 'bolt', impact: 'burst' },
    steady: { school: 'physical', motion: 'bolt', impact: 'hit' },
    aimed: { school: 'physical', motion: 'beam', impact: 'burst' },
    arcane: { school: 'arcane', motion: 'bolt', impact: 'hit' },
    barrage: { school: 'physical', motion: 'rain', impact: 'burst' },
    explosive: { school: 'fire', motion: 'bolt', impact: 'burst' },
    black_arrow: { school: 'shadow', motion: 'bolt', impact: 'shard' },
    explosive_trap: { school: 'fire', motion: 'nova', impact: 'burst' },
  });
})();
