/* Сейв героя: localStorage igorHero_v1. Не смешивать с SAVE_KEY ключа. */
(function (G) {
  'use strict';

  var KEY = 'igorHero_v1';
  var VER = 1;

  function emptyStore() {
    return { v: VER, activeId: null, heroes: [] };
  }

  function blankTalents() {
    return { t1: null, t2: null, t3: null, t4: null, t5: null };
  }

  function newId() {
    var n = Math.random().toString(16).slice(2, 6);
    while (n.length < 4) n += '0';
    return 'h_' + n;
  }

  function sanitizeHero(h) {
    if (!h || typeof h !== 'object') return null;
    if (!h.classId || !h.specId) return null;
    var lv = 1;
    if (typeof G.igorHeroClampLevel === 'function') lv = G.igorHeroClampLevel(h.level);
    else {
      lv = Math.round(Number(h.level) || 1);
      if (lv < 1) lv = 1;
      if (lv > 40) lv = 40;
    }
    var t = h.talents && typeof h.talents === 'object' ? h.talents : {};
    var stats = h.stats && typeof h.stats === 'object' ? h.stats : {};
    var clears = h.firstClears && typeof h.firstClears === 'object' ? h.firstClears : {};
    return {
      id: String(h.id || newId()),
      name: String(h.name || 'Герой').trim().slice(0, 18) || 'Герой',
      classId: String(h.classId),
      specId: String(h.specId),
      level: lv,
      xp: Math.max(0, Math.round(Number(h.xp) || 0)),
      talents: {
        t1: t.t1 || null,
        t2: t.t2 || null,
        t3: t.t3 || null,
        t4: t.t4 || null,
        t5: t.t5 || null,
      },
      firstClears: clears,
      stats: {
        instances: Math.max(0, Math.round(Number(stats.instances) || 0)),
        kills: Math.max(0, Math.round(Number(stats.kills) || 0)),
        wipes: Math.max(0, Math.round(Number(stats.wipes) || 0)),
      },
      created: Number(h.created) || 0,
    };
  }

  function loadStore() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return emptyStore();
      var data = JSON.parse(raw);
      if (!data || data.v !== VER) return emptyStore();
      if (!Array.isArray(data.heroes)) return emptyStore();
      var heroes = [];
      for (var i = 0; i < data.heroes.length; i++) {
        var h = sanitizeHero(data.heroes[i]);
        if (h) heroes.push(h);
      }
      var activeId = data.activeId || null;
      if (activeId && !heroes.some(function (x) { return x.id === activeId; })) {
        activeId = heroes[0] ? heroes[0].id : null;
      }
      return { v: VER, activeId: activeId, heroes: heroes };
    } catch (_) {
      return emptyStore();
    }
  }

  function saveStore(store) {
    if (!store || store.v !== VER) return false;
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
      return true;
    } catch (_) {
      return false;
    }
  }

  function getActive() {
    var store = loadStore();
    if (!store.activeId) return null;
    for (var i = 0; i < store.heroes.length; i++) {
      if (store.heroes[i].id === store.activeId) return store.heroes[i];
    }
    return null;
  }

  function putHero(hero) {
    var h = sanitizeHero(hero);
    if (!h) return null;
    var store = loadStore();
    var found = false;
    for (var i = 0; i < store.heroes.length; i++) {
      if (store.heroes[i].id === h.id) {
        store.heroes[i] = h;
        found = true;
        break;
      }
    }
    if (!found) store.heroes.push(h);
    store.activeId = h.id;
    saveStore(store);
    return h;
  }

  function createHero(opts) {
    opts = opts || {};
    var h = {
      id: newId(),
      name: opts.name,
      classId: opts.classId,
      specId: opts.specId,
      level: 1,
      xp: 0,
      talents: blankTalents(),
      firstClears: {},
      stats: { instances: 0, kills: 0, wipes: 0 },
      created: Date.now(),
    };
    return putHero(h);
  }

  function setActive(id) {
    var store = loadStore();
    if (!store.heroes.some(function (x) { return x.id === id; })) return false;
    store.activeId = id;
    return saveStore(store);
  }

  function deleteActive() {
    var store = loadStore();
    if (!store.activeId) return emptyStore();
    store.heroes = store.heroes.filter(function (x) { return x.id !== store.activeId; });
    store.activeId = store.heroes[0] ? store.heroes[0].id : null;
    saveStore(store);
    return store;
  }

  function resetTalents(hero) {
    if (!hero) return null;
    hero.talents = blankTalents();
    return putHero(hero);
  }

  function gainXp(amount, reason) {
    amount = Math.max(0, Math.round(Number(amount) || 0));
    var hero = getActive();
    var max = G.IGOR_MAX_LEVEL || 40;
    var dings = [];
    if (!hero || !amount) return { hero: hero, dings: dings, granted: 0, reason: reason || '' };
    if (hero.level >= max) {
      return { hero: hero, dings: dings, granted: amount, reason: reason || '', capped: true };
    }
    hero.xp += amount;
    var toNext = typeof G.igorHeroXpToNext === 'function' ? G.igorHeroXpToNext : function () { return 9999; };
    while (hero.level < max && hero.xp >= toNext(hero.level)) {
      hero.xp -= toNext(hero.level);
      hero.level += 1;
      dings.push(hero.level);
    }
    if (hero.level >= max) hero.xp = 0;
    putHero(hero);
    return { hero: getActive(), dings: dings, granted: amount, reason: reason || '' };
  }

  G.IGOR_HERO_SAVE_KEY = KEY;
  G.igorHeroLoadStore = loadStore;
  G.igorHeroSaveStore = saveStore;
  G.igorHeroGetActive = getActive;
  G.igorHeroPut = putHero;
  G.igorHeroCreate = createHero;
  G.igorHeroSetActive = setActive;
  G.igorHeroDeleteActive = deleteActive;
  G.igorHeroResetTalents = resetTalents;
  G.igorHeroGainXp = gainXp;
  G.igorHeroBlankTalents = blankTalents;
})(typeof window !== 'undefined' ? window : this);
