/* Прокачка: доля статов и опыт. Без DOM. */
(function (G) {
  'use strict';

  var MAX = 40;

  function clampLevel(lv) {
    lv = Math.round(Number(lv) || 1);
    if (lv < 1) return 1;
    if (lv > MAX) return MAX;
    return lv;
  }

  /** доля = 0.22 + 0.78 × ((ур−1)/39)^1.12 ; ур.40 = 1 */
  function levelShare(lv) {
    lv = clampLevel(lv);
    var t = (lv - 1) / (MAX - 1);
    return 0.22 + 0.78 * Math.pow(t, 1.12);
  }

  /** xp = round(36 × ур^1.12 + 22) */
  function xpToNext(lv) {
    lv = Math.max(1, Math.round(Number(lv) || 1));
    if (lv >= MAX) return 0;
    return Math.round(36 * Math.pow(lv, 1.12) + 22);
  }

  function packXp(type, lv) {
    lv = clampLevel(lv);
    if (type === 'trash') return 16 + lv * 5;
    if (type === 'elite') return 32 + lv * 8;
    if (type === 'boss') return 60 + lv * 12;
    if (type === 'final') return 100 + lv * 18;
    return 10 + lv * 3;
  }

  function clearXp(lv) {
    lv = clampLevel(lv);
    return 50 + lv * 12;
  }

  /** Вторички: крит 40→100, иск. 50→120, унив. 0→8 */
  function secForLevel(lv) {
    lv = clampLevel(lv);
    var t = (lv - 1) / (MAX - 1);
    return {
      critRating: Math.round(40 + t * 60),
      masteryRating: Math.round(50 + t * 70),
      versRating: Math.round(t * 8),
    };
  }

  function scaleStat(base, lv) {
    var scale = (typeof STAT_SCALE === 'number') ? STAT_SCALE : 1000;
    return Math.round(Number(base) * levelShare(lv) * scale);
  }

  G.IGOR_MAX_LEVEL = MAX;
  G.igorHeroLevelShare = levelShare;
  G.igorHeroXpToNext = xpToNext;
  G.igorHeroPackXp = packXp;
  G.igorHeroClearXp = clearXp;
  G.igorHeroSecForLevel = secForLevel;
  G.igorHeroScaleStat = scaleStat;
  G.igorHeroClampLevel = clampLevel;
})(typeof window !== 'undefined' ? window : this);
