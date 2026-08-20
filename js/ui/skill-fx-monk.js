/* ui/skill-fx-monk: window.SKILL_FX */
(function (w) {
  'use strict';
  w.SKILL_FX = Object.assign(w.SKILL_FX || {}, {
    jab: { motion: 'slash', school: 'chi', impact: 'hit' },
    keg_smash: { motion: 'slam', school: 'physical', impact: 'explode' },
    blackout: { motion: 'arc', school: 'chi', impact: 'hit' },
    breath: { motion: 'beam', school: 'fire', impact: 'splash' },
    sck: { motion: 'swirl', school: 'chi', impact: 'splash' },
    purifying: { motion: 'swirl', school: 'heal', impact: 'hit' },
    elusive: { motion: 'nova', school: 'chi', impact: 'hit' },
    provoke: { motion: 'nova', school: 'physical', impact: 'splash' },
    fort_brew: { motion: 'orbit', school: 'physical', impact: 'hit' },
    niuzao: { motion: 'slam', school: 'nature', impact: 'splash' },
    renewing: { motion: 'orbit', school: 'heal', impact: 'hit' },
    surging: { motion: 'beam', school: 'heal', impact: 'hit' },
    enveloping: { motion: 'orbit', school: 'nature', impact: 'splash' },
    uft: { motion: 'nova', school: 'heal', impact: 'splash' },
    jade_serpent: { motion: 'orbit', school: 'nature', impact: 'hit' },
    soothing: { motion: 'chain', school: 'heal', impact: 'hit' },
    jade_lotus: { motion: 'slash', school: 'nature', impact: 'explode' },
    thunder_focus: { motion: 'nova', school: 'arcane', impact: 'hit' },
    revival: { motion: 'rain', school: 'heal', impact: 'splash' },
    rsk: { motion: 'slash', school: 'chi', impact: 'explode' },
    touch_death: { motion: 'pierce', school: 'shadow', impact: 'drain' },
    xuen: { motion: 'slash', school: 'nature', impact: 'splash' },
    energizing: { motion: 'swirl', school: 'chi', impact: 'hit' },
    tigereye: { motion: 'orbit', school: 'fire', impact: 'explode' },
  });
})(window);
