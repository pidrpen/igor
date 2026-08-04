/**
 * Применяет пакеты class-balance/* к WOW_MOP.classes после wow-mop-data.js.
 * Подключать: <script src="wow-mop-data.js"></script> + все *-abilities.js + этот файл.
 */
(function (global) {
  'use strict';
  if (!global.WOW_MOP || !Array.isArray(global.WOW_MOP.classes)) {
    console.warn('[class-balance] WOW_MOP.classes не найден — пропуск');
    return;
  }
  const classes = global.WOW_MOP.classes;

  function replaceClass(cls) {
    if (!cls || !cls.id) return false;
    const i = classes.findIndex((c) => c.id === cls.id);
    if (i >= 0) classes[i] = cls;
    else classes.push(cls);
    return true;
  }

  function replaceSpecs(classId, specs) {
    const c = classes.find((x) => x.id === classId);
    if (!c || !specs) return false;
    c.specs = specs;
    return true;
  }

  const applied = [];

  // Warrior — only specs array
  if (global.WOW_WARRIOR_BALANCE && global.WOW_WARRIOR_BALANCE.specs) {
    if (replaceSpecs('warrior', global.WOW_WARRIOR_BALANCE.specs)) applied.push('warrior');
  }

  // Paladin
  if (global.PALADIN_BALANCE && global.PALADIN_BALANCE.class) {
    if (replaceClass(global.PALADIN_BALANCE.class)) applied.push('paladin');
  }

  // Hunter
  if (typeof global.applyHunterBalance === 'function') {
    global.applyHunterBalance(classes);
    applied.push('hunter');
  } else if (global.HUNTER_CLASS) {
    if (replaceClass(global.HUNTER_CLASS)) applied.push('hunter');
  }

  // Rogue
  if (global.ROGUE_BALANCE) {
    const rCls = global.ROGUE_BALANCE.ROGUE_CLASS || global.ROGUE_BALANCE.class || global.ROGUE_BALANCE.cls;
    if (rCls) {
      if (replaceClass(rCls)) applied.push('rogue');
    } else if (typeof global.ROGUE_BALANCE.applyToWowClass === 'function') {
      const rc = classes.find((c) => c.id === 'rogue');
      if (rc) {
        global.ROGUE_BALANCE.applyToWowClass(rc);
        applied.push('rogue');
      }
    }
  }

  // Priest
  if (global.PRIEST_BALANCE) {
    if (typeof global.PRIEST_BALANCE.apply === 'function') {
      global.PRIEST_BALANCE.apply(global.WOW_MOP);
      applied.push('priest');
    } else if (global.PRIEST_CLASS) {
      if (replaceClass(global.PRIEST_CLASS)) applied.push('priest');
    }
  }

  // Death Knight
  if (global.DEATHKNIGHT_CLASS) {
    if (replaceClass(global.DEATHKNIGHT_CLASS)) applied.push('deathknight');
  }

  // Shaman
  if (global.MK_SHAMAN_BALANCE && typeof global.MK_SHAMAN_BALANCE.apply === 'function') {
    global.MK_SHAMAN_BALANCE.apply(classes);
    applied.push('shaman');
  }

  // Mage — object with specs map
  if (global.MAGE_BALANCE && global.MAGE_BALANCE.specs) {
    const mb = global.MAGE_BALANCE;
    const specsArr = ['arcane', 'fire', 'frost']
      .map((k) => mb.specs[k])
      .filter(Boolean);
    if (specsArr.length) {
      replaceClass({
        id: 'mage',
        name: mb.name || 'Маг',
        nameEn: mb.nameEn || 'Mage',
        icon: mb.icon || '🔮',
        color: mb.color || '#69CCF0',
        resource: mb.resource || { type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 5 },
        secondary: mb.secondary != null ? mb.secondary : null,
        specs: specsArr,
      });
      applied.push('mage');
    }
  }

  // Warlock
  if (global.WARLOCK_CLASS) {
    if (replaceClass(global.WARLOCK_CLASS)) applied.push('warlock');
  } else if (global.WARLOCK_BALANCE && global.WARLOCK_BALANCE.class) {
    if (replaceClass(global.WARLOCK_BALANCE.class)) applied.push('warlock');
  }

  // Monk
  if (global.MONK_BALANCE && typeof global.MONK_BALANCE.applyTo === 'function') {
    global.MONK_BALANCE.applyTo(classes);
    applied.push('monk');
  } else if (global.CLASS_BALANCE && global.CLASS_BALANCE.monk) {
    global.CLASS_BALANCE.monk.applyTo(classes);
    applied.push('monk');
  }

  // Druid
  if (global.CLASS_BALANCE && global.CLASS_BALANCE.druid && typeof global.CLASS_BALANCE.druid.applyTo === 'function') {
    global.CLASS_BALANCE.druid.applyTo(classes);
    applied.push('druid');
  }

  global.CLASS_BALANCE_APPLIED = applied;
  console.info('[class-balance] применено:', applied.join(', ') || '(ничего)');
})(typeof window !== 'undefined' ? window : globalThis);
