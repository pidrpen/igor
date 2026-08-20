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

  /** +10% ко всем характеристикам: герой таверны или спек «Честно прокачен» (ур. 40). */
  var HONEST_STAT_MULT = 1.10;

  function honestStatMult() {
    return HONEST_STAT_MULT;
  }

  function unitGetsHonestStats(u) {
    if (!u) return false;
    if (u._isHero) return true;
    try {
      if (typeof G.igorHeroHonestCleared === 'function' && G.igorHeroHonestCleared(u.classId, u.specId)) return true;
    } catch (_) {}
    return false;
  }

  function applyHonestStats(u) {
    if (!unitGetsHonestStats(u)) return u;
    var m = HONEST_STAT_MULT;
    var ratio = u.maxHp ? (u.hp / u.maxHp) : 1;
    u.maxHp = Math.round((u.maxHp || 0) * m);
    if (u._baseMaxHp != null) u._baseMaxHp = Math.round(u._baseMaxHp * m);
    u.atk = Math.round((u.atk || 0) * m);
    if (u._baseAtk != null) u._baseAtk = Math.round(u._baseAtk * m);
    u.def = Math.round((u.def || 0) * m);
    if (u._baseDef != null) u._baseDef = Math.round(u._baseDef * m);
    u.speed = Math.round((Number(u.speed) || 0) * m);
    if (u._baseSpeed != null) u._baseSpeed = Math.round(u._baseSpeed * m);
    if (u.sec) {
      if (u.sec.critRating != null) u.sec.critRating = Math.round(u.sec.critRating * m);
      if (u.sec.masteryRating != null) u.sec.masteryRating = Math.round(u.sec.masteryRating * m);
      if (u.sec.versRating != null) u.sec.versRating = Math.round(u.sec.versRating * m);
    }
    if (u._baseSecCritRating != null) u._baseSecCritRating = Math.round(u._baseSecCritRating * m);
    if (u._baseSecMasteryRating != null) u._baseSecMasteryRating = Math.round(u._baseSecMasteryRating * m);
    if (u._baseSecVersRating != null) u._baseSecVersRating = Math.round(u._baseSecVersRating * m);
    u.hp = Math.max(0, Math.min(u.maxHp, Math.round(u.maxHp * ratio)));
    return u;
  }

  G.IGOR_MAX_LEVEL = MAX;
  G.IGOR_HONEST_STAT_MULT = HONEST_STAT_MULT;
  G.igorHeroLevelShare = levelShare;
  G.igorHeroXpToNext = xpToNext;
  G.igorHeroPackXp = packXp;
  G.igorHeroClearXp = clearXp;
  G.igorHeroSecForLevel = secForLevel;
  G.igorHeroScaleStat = scaleStat;
  G.igorHeroClampLevel = clampLevel;
  G.igorHeroHonestStatMult = honestStatMult;
  G.igorHeroUnitGetsHonestStats = unitGetsHonestStats;
  G.igorHeroApplyHonestStats = applyHonestStats;
})(typeof window !== 'undefined' ? window : this);
