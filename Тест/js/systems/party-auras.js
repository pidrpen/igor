/* systems/party-auras: уникальный бафф класса на отряд + питомцы охотника */
(function (G) {
  'use strict';

  var CLASS_AURA = {
    warrior: {
      id: 'aura_warrior', name: 'Боевой крик', icon: '📣',
      tip: '+8% атаки всему отряду.',
      atkMod: 0.08,
    },
    paladin: {
      id: 'aura_paladin', name: 'Аура благочестия', icon: '✝️',
      tip: '−8% входящего урона отряду.',
      dmgReduce: 0.08,
    },
    rogue: {
      id: 'aura_rogue', name: 'Грязные приёмы', icon: '🗡️',
      tip: '+5% крита отряду.',
      critMod: 0.05,
    },
    priest: {
      id: 'aura_priest', name: 'Слово силы: Стойкость', icon: '📖',
      tip: '+8% входящего лечения отряду.',
      healTakenMod: 0.08,
    },
    deathknight: {
      id: 'aura_dk', name: 'Рог зимы', icon: '📯',
      tip: '+6% атаки отряду.',
      atkMod: 0.06,
    },
    shaman: {
      id: 'aura_shaman', name: 'Ярость воздуха', icon: '🌬️',
      tip: '+6% универсальности отряду.',
      versMod: 0.06,
    },
    mage: {
      id: 'aura_mage', name: 'Чародейская гениальность', icon: '📘',
      tip: '+6% крита отряду.',
      critMod: 0.06,
    },
    warlock: {
      id: 'aura_lock', name: 'Тёмное намерение', icon: '📓',
      tip: '+5% атаки отряду и +10% урона питомцам хозяина.',
      atkMod: 0.05,
      petAtkMod: 0.10,
    },
    monk: {
      id: 'aura_monk', name: 'Наследие императора', icon: '🥋',
      tip: '+4% атаки и −4% входящего отряду.',
      atkMod: 0.04,
      dmgReduce: 0.04,
    },
    druid: {
      id: 'aura_druid', name: 'Знак дикой природы', icon: '🐾',
      tip: '+6% универсальности отряду.',
      versMod: 0.06,
    },
    engineer: {
      id: 'aura_eng', name: 'Полевой чертёж', icon: '📐',
      tip: '+8% урона питомцам и механизмам хозяина.',
      petAtkMod: 0.08,
    },
    demonhunter: {
      id: 'aura_dh', name: 'Хаос в крови', icon: '😈',
      tip: '+5% атаки и +4% крита отряду.',
      atkMod: 0.05,
      critMod: 0.04,
    },
    cheat: {
      id: 'aura_cheat', name: 'Отладка', icon: '🧪',
      tip: 'Читер: без баффа отряда.',
    },
  };

  var HUNTER_PET = {
    beast_mastery: {
      key: 'hunter_bear',
      aura: {
        id: 'aura_hunter_bm', name: 'Дух зверя', icon: '🐻',
        tip: 'Питомец — медведь. Сам лечит 20% нанесённого. Отряд: +4% атаки.',
        atkMod: 0.04,
      },
      petBuff: { id: 'pet_bm', name: 'Живучий зверь', icon: '💚', lifesteal: 0.20, tip: '20% нанесённого возвращается питомцу.' },
    },
    marksmanship: {
      key: 'hunter_hawk',
      aura: {
        id: 'aura_hunter_mm', name: 'Дух ястреба', icon: '🦅',
        tip: 'Питомец — ястреб. +10% крита питомцу. Отряд: +5% крита.',
        critMod: 0.05,
      },
      petBuff: { id: 'pet_mm', name: 'Острый глаз', icon: '🎯', critMod: 0.10, tip: '+10% крита питомца.' },
    },
    survival: {
      key: 'hunter_raptor',
      aura: {
        id: 'aura_hunter_sv', name: 'Дух ящера', icon: '🦖',
        tip: 'Питомец — ящер. +8% универсальности питомцу. Отряд: +5% универсальности.',
        versMod: 0.05,
      },
      petBuff: { id: 'pet_sv', name: 'Жёсткая шкура', icon: '🛡️', versMod: 0.08, tip: '+8% универсальности питомца.' },
    },
  };

  function hunterKit(specId) {
    return HUNTER_PET[specId] || HUNTER_PET.beast_mastery;
  }

  function hunterPetKey(specId) {
    return hunterKit(specId).key;
  }

  function auraHasEffect(spec) {
    if (!spec) return false;
    return !!(spec.atkMod || spec.dmgReduce || spec.critMod || spec.versMod
      || spec.petAtkMod || spec.lifesteal || spec.healTakenMod);
  }

  function applyAuraTo(unit, spec) {
    if (!unit || !spec || !spec.id || !auraHasEffect(spec)) return;
    if (typeof applyStatus !== 'function') return;
    applyStatus(unit, {
      id: spec.id,
      name: spec.name,
      icon: spec.icon,
      turns: 99,
      atkMod: spec.atkMod || 0,
      dmgReduce: spec.dmgReduce || 0,
      critMod: spec.critMod || 0,
      versMod: spec.versMod || 0,
      petAtkMod: spec.petAtkMod || 0,
      lifesteal: spec.lifesteal || 0,
      healTakenMod: spec.healTakenMod || 0,
      tip: spec.tip || '',
      aura: true,
      dispellable: false,
    });
  }

  function applyPartyClassAuras() {
    if (!run || !run.party) return;
    var heroes = run.party.filter(function (p) { return p && p.alive && !p.isPet; });
    var seen = {};
    var specs = [];
    heroes.forEach(function (h) {
      var spec = (h.classId === 'hunter') ? hunterKit(h.specId).aura : CLASS_AURA[h.classId];
      if (!spec || !spec.id || seen[spec.id] || !auraHasEffect(spec)) return;
      seen[spec.id] = true;
      specs.push(spec);
    });
    var targets = heroes.slice();
    if (typeof combat !== 'undefined' && combat && combat.pets) {
      combat.pets.forEach(function (pet) {
        if (pet && pet.alive) targets.push(pet);
      });
    }
    specs.forEach(function (spec) {
      targets.forEach(function (u) { applyAuraTo(u, spec); });
    });
    if (typeof combat !== 'undefined' && combat && combat.pets) {
      combat.pets.forEach(function (pet) {
        if (!pet || !pet.alive) return;
        var owner = heroes.find(function (h) { return h.uid === pet.ownerUid; });
        if (!owner || owner.classId !== 'hunter') return;
        applyAuraTo(pet, hunterKit(owner.specId).petBuff);
      });
    }
  }

  G.CLASS_AURA = CLASS_AURA;
  G.hunterPetKey = hunterPetKey;
  G.applyPartyClassAuras = applyPartyClassAuras;
})(typeof window !== 'undefined' ? window : this);
