/* ui/skill-fx-shaman: SKILL_FX + SKILL_ICON for Elemental / Enhancement / Restoration */
(function () {
  'use strict';
  window.SKILL_FX = window.SKILL_FX || {};
  const fx = {
    lv: { school: 'fire', motion: 'bolt', impact: 'burst' },
    lb: { school: 'nature', motion: 'bolt', impact: 'flash' },
    flame_shock: { school: 'fire', motion: 'orbit', impact: 'shard' },
    earth_shock: { school: 'nature', motion: 'pulse', impact: 'hit' },
    chain: { school: 'nature', motion: 'chain', impact: 'flash' },
    thunderstorm: { school: 'nature', motion: 'nova', impact: 'burst' },
    ele_blast: { school: 'nature', motion: 'bolt', impact: 'burst' },
    fire_ele: { school: 'fire', motion: 'nova', impact: 'burst' },
    ascendance: { school: 'nature', motion: 'swirl', impact: 'flash' },
    stormstrike: { school: 'physical', motion: 'slash', impact: 'burst' },
    lava_lash: { school: 'fire', motion: 'slash', impact: 'shard' },
    unleash: { school: 'nature', motion: 'pulse', impact: 'flash' },
    fire_nova: { school: 'fire', motion: 'nova', impact: 'ring' },
    feral_spirit: { school: 'physical', motion: 'lunge', impact: 'hit' },
    riptide: { school: 'heal', motion: 'bolt', impact: 'hit' },
    ch: { school: 'heal', motion: 'chain', impact: 'hit' },
    hw: { school: 'heal', motion: 'beam', impact: 'hit' },
    chw: { school: 'heal', motion: 'pulse', impact: 'burst' },
    hs: { school: 'heal', motion: 'rain', impact: 'ring' },
    hst: { school: 'heal', motion: 'orbit', impact: 'ring' },
    spirit_link: { school: 'heal', motion: 'chain', impact: 'ring' },
  };
  Object.assign(window.SKILL_FX, fx);
  window.SKILL_ICON = window.SKILL_ICON || {};
  const icons = {};
  Object.keys(fx).forEach(function (id) {
    icons[id] = 'assets/icons/skills/' + id + '.png';
  });
  Object.assign(window.SKILL_ICON, icons);
})();
