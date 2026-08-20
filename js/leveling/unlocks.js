/* Открытие кнопок по уровню героя. Без героя — полный кит как сейчас. */
(function (G) {
  'use strict';

  var PALADIN = {
    holy: {
      holy_light: 1, crusader: 4, flash: 8, holy_shock: 12,
      holy_radiance: 16, word_glory: 20, light_dawn: 24,
      divine_prot: 28, avenging: 32,
    },
    protection: {
      crusader: 1, judgment: 4, taunt: 6, consecrate: 8,
      avengers: 12, hot_r: 16, hot_w: 20, sot_r: 24, ardent: 28,
    },
    retribution: {
      crusader: 1, judgment: 4, templar: 8, inquisition: 12,
      divine_storm: 16, hot_w: 20, avenging: 26,
    },
  };

  var PALADIN_PASSIVE = {
    virtue: 10,
    illuminated_heal: 14,
    holy_shield: 14,
    light_defender: 14,
    divine_bulwark: 10,
  };

  var UTIL = {
    kick: 12,
    party_dispel: 12,
    party_purge: 12,
    party_stun: 12,
    pet_rez: 12,
    taunt: 12,
  };

  var cache = Object.create(null);

  function isExec(ab) {
    return typeof EXECUTE_IDS !== 'undefined' && EXECUTE_IDS && EXECUTE_IDS.has && EXECUTE_IDS.has(ab.id);
  }

  function genericMap(classId, specId) {
    var key = classId + ':' + specId;
    if (cache[key]) return cache[key];
    var spec = (typeof WOW_MOP !== 'undefined' && WOW_MOP.getSpec) ? WOW_MOP.getSpec(classId, specId) : null;
    var list = (spec && spec.abilities) ? spec.abilities.slice() : [];
    var map = Object.create(null);
    var used = Object.create(null);

    function take(pred, lv) {
      for (var i = 0; i < list.length; i++) {
        var a = list[i];
        if (!a || used[a.id] || UTIL[a.id]) continue;
        if (pred(a)) {
          map[a.id] = lv;
          used[a.id] = true;
          return a;
        }
      }
      return null;
    }

    take(function (a) {
      return (a.genSec > 0) || (a.gen > 0 && a.type === 'damage') || a.type === 'heal' || a.type === 'damage';
    }, 1);
    take(function (a) { return a.type === 'damage' || a.type === 'heal' || a.type === 'dot'; }, 4);
    take(function (a) { return a.costSec > 0; }, 8) || take(function (a) { return (a.cd || 0) >= 2; }, 8);
    take(function (a) {
      return a.type === 'taunt' || a.type === 'interrupt' || a.applyHot || a.id === 'taunt';
    }, 12);
    take(function (a) {
      return a.type === 'aoe' || a.type === 'heal_aoe' || a.type === 'cast_aoe' || !!a.applyDot;
    }, 16);
    take(function (a) { return isExec(a); }, 20)
      || take(function (a) { return a.freeAction && (a.type === 'buff' || a.type === 'shield'); }, 20);
    take(function (a) { return true; }, 24);
    take(function (a) { return (a.cd || 0) >= 5; }, 28);
    take(function (a) { return (a.cd || 0) >= 4 || a.type === 'buff'; }, 32);

    for (var j = 0; j < list.length; j++) {
      var ab = list[j];
      if (!ab || used[ab.id]) continue;
      map[ab.id] = 40;
      used[ab.id] = true;
    }
    cache[key] = map;
    return map;
  }

  function abilityUnlockLevel(classId, specId, ability) {
    if (!ability) return 1;
    var id = ability.id || ability;
    if (UTIL[id] && !(classId === 'paladin' && specId === 'protection' && id === 'taunt')) {
      return UTIL[id];
    }
    if (classId === 'paladin' && PALADIN[specId] && PALADIN[specId][id] != null) {
      return PALADIN[specId][id];
    }
    var map = genericMap(classId, specId);
    return map[id] != null ? map[id] : 1;
  }

  function passiveUnlockLevel(classId, specId, passiveId) {
    if (classId === 'paladin' && PALADIN_PASSIVE[passiveId] != null) {
      return PALADIN_PASSIVE[passiveId];
    }
    return 12;
  }

  function filterAbilities(list, classId, specId, level) {
    if (!list || !list.length) return list || [];
    if (level == null) return list;
    var lv = Number(level) || 1;
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (!a) continue;
      if (lv >= abilityUnlockLevel(classId, specId, a)) out.push(a);
    }
    return out;
  }

  function heroActive() {
    return typeof G.igorHeroGetActive === 'function' && !!G.igorHeroGetActive();
  }

  G.igorHeroAbilityUnlockLevel = abilityUnlockLevel;
  G.igorHeroPassiveUnlockLevel = passiveUnlockLevel;
  G.igorHeroFilterAbilities = filterAbilities;
  G.igorHeroHasActive = heroActive;
})(typeof window !== 'undefined' ? window : this);
