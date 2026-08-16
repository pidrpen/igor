/**
 * Тестовый класс: кнопки режут % max HP цели. Только Тест, не в основу.
 */
(function (global) {
  'use strict';

  function A(o) {
    const ab = {
      id: o.id,
      name: o.n,
      nameEn: o.en || o.n,
      icon: o.i || '💥',
      cost: 0,
      gen: 0,
      cd: 0,
      type: 'damage',
      power: 1,
      desc: o.d || '',
      school: 'none',
      freeAction: true,
      targetHpPct: o.pct,
    };
    return ab;
  }

  const CHEAT_CLASS = {
    id: 'cheat',
    name: 'Читер',
    nameEn: 'Cheat',
    icon: '🧪',
    color: '#ff4dd2',
    resource: { type: 'mana', name: 'Тест', icon: '🧪', max: 1, start: 1, regen: 0 },
    secondary: null,
    specs: [{
      id: 'debug',
      name: 'Отладка',
      nameEn: 'Debug',
      role: 'dps',
      icon: '🧪',
      testBuild: true,
      stats: { hp: 400, atk: 1, def: 20, speed: 20 },
      abilities: [10, 20, 30, 40, 50, 60, 70, 80].map((n) =>
        A({ id: 'pct_' + n, n: n + '% цели', en: n + '%', i: '💥', pct: n / 100, d: n + '% максимального здоровья цели · без хода' })
      ),
    }],
  };

  function applyCheatBalance(classes) {
    if (!Array.isArray(classes)) return false;
    const clone = JSON.parse(JSON.stringify(CHEAT_CLASS));
    const i = classes.findIndex((c) => c.id === 'cheat');
    if (i >= 0) classes[i] = clone;
    else classes.push(clone);
    return true;
  }

  global.CLASS_BALANCE_PACKS = global.CLASS_BALANCE_PACKS || [];
  global.CLASS_BALANCE_PACKS.push({ id: 'cheat', apply: applyCheatBalance });
})(typeof window !== 'undefined' ? window : globalThis);
