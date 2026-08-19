/* ui/skill-fx-paladin: SKILL_FX + SKILL_ICON for Holy / Protection / Retribution */
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
  window.SKILL_ICON = window.SKILL_ICON || {};
  Object.assign(window.SKILL_ICON, {
    holy_shock: 'assets/icons/skills/holy_shock.png',
    holy_light: 'assets/icons/skills/holy_light.png',
    flash: 'assets/icons/skills/flash.png',
    holy_radiance: 'assets/icons/skills/holy_radiance.png',
    word_glory: 'assets/icons/skills/word_glory.png',
    light_dawn: 'assets/icons/skills/light_dawn.png',
    crusader: 'assets/icons/skills/crusader.png',
    divine_prot: 'assets/icons/skills/divine_prot.png',
    avenging: 'assets/icons/skills/avenging.png',
    judgment: 'assets/icons/skills/judgment.png',
    avengers: 'assets/icons/skills/avengers.png',
    hot_r: 'assets/icons/skills/hot_r.png',
    sot_r: 'assets/icons/skills/sot_r.png',
    consecrate: 'assets/icons/skills/consecrate.png',
    hot_w: 'assets/icons/skills/hot_w.png',
    ardent: 'assets/icons/skills/ardent.png',
    taunt: 'assets/icons/skills/taunt.png',
    templar: 'assets/icons/skills/templar.png',
    divine_storm: 'assets/icons/skills/divine_storm.png',
    inquisition: 'assets/icons/skills/inquisition.png',
  });
})();
