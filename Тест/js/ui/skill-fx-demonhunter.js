/* ui/skill-fx-demonhunter: window.SKILL_FX + SKILL_ICON */
(function (w) {
  'use strict';
  w.SKILL_FX = Object.assign(w.SKILL_FX || {}, {
    shear: { motion: 'slash', school: 'physical', impact: 'hit' },
    fracture: { motion: 'slam', school: 'physical', impact: 'explode' },
    soul_cleave: { motion: 'arc', school: 'fel', impact: 'drain' },
    immolation_aura: { motion: 'nova', school: 'fel', impact: 'splash' },
    demon_spikes: { motion: 'nova', school: 'physical', impact: 'hit' },
    fel_devastation: { motion: 'beam', school: 'fel', impact: 'drain' },
    metamorph_veng: { motion: 'orbit', school: 'fel', impact: 'explode' },
    torment: { motion: 'nova', school: 'shadow', impact: 'splash' },
    demons_bite: { motion: 'slash', school: 'fel', impact: 'hit' },
    chaos_strike: { motion: 'slash', school: 'fel', impact: 'explode' },
    blade_dance: { motion: 'swirl', school: 'physical', impact: 'splash' },
    eye_beam: { motion: 'beam', school: 'fel', impact: 'explode' },
    throw_glaive: { motion: 'arc', school: 'physical', impact: 'hit' },
    fel_rush: { motion: 'pierce', school: 'fel', impact: 'splash' },
    metamorph_havoc: { motion: 'nova', school: 'fel', impact: 'explode' },
    blur: { motion: 'swirl', school: 'shadow', impact: 'hit' },
  });
  w.SKILL_ICON = Object.assign(w.SKILL_ICON || {}, {
    shear: '🗡️',
    fracture: '💥',
    soul_cleave: '💚',
    immolation_aura: '🔥',
    demon_spikes: '🦔',
    fel_devastation: '🌋',
    metamorph_veng: '👹',
    torment: '📢',
    demons_bite: '🦷',
    chaos_strike: '⚔️',
    blade_dance: '🌀',
    eye_beam: '👁️',
    throw_glaive: '🪃',
    fel_rush: '💨',
    metamorph_havoc: '👹',
    blur: '👤',
  });
})(window);
