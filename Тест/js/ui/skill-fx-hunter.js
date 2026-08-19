/* ui/skill-fx-hunter: SKILL_FX + SKILL_ICON for Beast Mastery / Marksmanship / Survival */
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
  window.SKILL_ICON = window.SKILL_ICON || {};
  Object.assign(window.SKILL_ICON, {
    kill_cmd: 'assets/icons/skills/kill_cmd.png',
    cobra: 'assets/icons/skills/cobra.png',
    arcane_shot: 'assets/icons/skills/arcane_shot.png',
    kill_shot: 'assets/icons/skills/kill_shot.png',
    multi: 'assets/icons/skills/multi.png',
    bestial: 'assets/icons/skills/bestial.png',
    rapid: 'assets/icons/skills/rapid.png',
    serpent: 'assets/icons/skills/serpent.png',
    dire: 'assets/icons/skills/dire.png',
    chimera: 'assets/icons/skills/chimera.png',
    steady: 'assets/icons/skills/steady.png',
    aimed: 'assets/icons/skills/aimed.png',
    arcane: 'assets/icons/skills/arcane.png',
    barrage: 'assets/icons/skills/barrage.png',
    explosive: 'assets/icons/skills/explosive.png',
    black_arrow: 'assets/icons/skills/black_arrow.png',
    explosive_trap: 'assets/icons/skills/explosive_trap.png',
  });
})();
