/* ui/skill-fx-warlock: SKILL_FX + SKILL_ICON for Affliction / Demonology / Destruction */
(function () {
  'use strict';
  window.SKILL_FX = window.SKILL_FX || {};
  const fx = {
    agony: { school: 'shadow', motion: 'orbit', impact: 'shard' },
    corruption: { school: 'shadow', motion: 'swirl', impact: 'hit' },
    ua: { school: 'shadow', motion: 'orbit', impact: 'burst' },
    malefic: { school: 'shadow', motion: 'beam', impact: 'hit' },
    haunt: { school: 'shadow', motion: 'bolt', impact: 'burst' },
    drain_soul: { school: 'shadow', motion: 'beam', impact: 'flash' },
    seed: { school: 'shadow', motion: 'nova', impact: 'shard' },
    dark_soul: { school: 'shadow', motion: 'pulse', impact: 'flash' },
    soulburn: { school: 'fire', motion: 'pulse', impact: 'hit' },
    shadow_bolt: { school: 'shadow', motion: 'bolt', impact: 'hit' },
    soul_fire: { school: 'fire', motion: 'bolt', impact: 'burst' },
    hand_guldan: { school: 'shadow', motion: 'rain', impact: 'burst' },
    metamorphosis: { school: 'shadow', motion: 'swirl', impact: 'flash' },
    felstorm: { school: 'fire', motion: 'swirl', impact: 'burst' },
    imp_leader: { school: 'fire', motion: 'orbit', impact: 'ring' },
    incinerate: { school: 'fire', motion: 'bolt', impact: 'flash' },
    immolate: { school: 'fire', motion: 'orbit', impact: 'shard' },
    chaos_bolt: { school: 'fire', motion: 'bolt', impact: 'shard' },
    conflag: { school: 'fire', motion: 'pulse', impact: 'burst' },
    shadowburn: { school: 'shadow', motion: 'bolt', impact: 'flash' },
    rain_fire: { school: 'fire', motion: 'rain', impact: 'flash' },
    havoc: { school: 'shadow', motion: 'lunge', impact: 'flash' },
    ember_tap: { school: 'fire', motion: 'beam', impact: 'hit' },
  };
  Object.assign(window.SKILL_FX, fx);
  window.SKILL_ICON = window.SKILL_ICON || {};
  const icons = {};
  Object.keys(fx).forEach(function (id) {
    icons[id] = 'assets/icons/skills/' + id + '.png';
  });
  Object.assign(window.SKILL_ICON, icons);
})();
