/**
 * Unified class-balance applicator.
 *
 * Contract for every pack (preferred):
 *   function apply(classes: Array) → void|boolean
 *   registered via:
 *     CLASS_BALANCE_PACKS.push({ id: 'warrior', apply })
 *   or:
 *     CLASS_BALANCE.warrior = { apply }
 *
 * Legacy globals are still accepted (see discoverLegacyPacks).
 *
 * Load order: wow-mop-data.js → *-abilities.js → apply-all.js
 * Правда по классу = файл пакета. wow-mop-data после apply не читают.
 */
(function (global) {
  'use strict';

  if (!global.WOW_MOP || !Array.isArray(global.WOW_MOP.classes)) {
    console.warn('[class-balance] WOW_MOP.classes не найден — пропуск');
    return;
  }

  const classes = global.WOW_MOP.classes;

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function replaceClass(cls) {
    if (!cls || !cls.id) return false;
    const i = classes.findIndex((c) => c.id === cls.id);
    if (i >= 0) classes[i] = clone(cls);
    else classes.push(clone(cls));
    return true;
  }

  function replaceSpecs(classId, specs) {
    const c = classes.find((x) => x.id === classId);
    if (!c || !specs) return false;
    c.specs = clone(specs);
    return true;
  }

  /** Normalize any pack-like object into apply(classes). */
  function normalizePack(id, pack) {
    if (!pack) return null;
    if (typeof pack === 'function') {
      return { id, apply: pack };
    }
    if (typeof pack.apply === 'function') {
      return {
        id: pack.id || id,
        apply: function (clsArr) {
          // Some packs take WOW_MOP, some take classes array
          if (pack.apply.length >= 1) {
            const arg0 = pack.apply.toString();
            // Prefer classes array; if pack historically used WOW_MOP, try both safely
            try {
              return pack.apply(clsArr);
            } catch (_) {
              return pack.apply(global.WOW_MOP);
            }
          }
          return pack.apply(clsArr);
        },
      };
    }
    if (typeof pack.applyTo === 'function') {
      return { id: pack.id || id, apply: (clsArr) => pack.applyTo(clsArr) };
    }
    if (typeof pack.applyToWowClass === 'function') {
      return {
        id: pack.id || id,
        apply: function (clsArr) {
          const target = clsArr.find((c) => c.id === (pack.classId || id));
          if (target) pack.applyToWowClass(target);
        },
      };
    }
    if (typeof pack.applyHunterBalance === 'function') {
      return { id: 'hunter', apply: (clsArr) => pack.applyHunterBalance(clsArr) };
    }
    // Full class object under .class / .cls / .ROGUE_CLASS
    const full =
      pack.class ||
      pack.cls ||
      pack.ROGUE_CLASS ||
      (pack.id && pack.specs && pack.resource ? pack : null);
    if (full && full.id && full.specs) {
      return { id: full.id || id, apply: () => replaceClass(full) };
    }
    // Specs-only (warrior style)
    if (Array.isArray(pack.specs)) {
      return {
        id: pack.id || id,
        apply: () => replaceSpecs(pack.id || id, pack.specs),
      };
    }
    // Mage-style specs map { arcane, fire, frost }
    if (pack.specs && typeof pack.specs === 'object' && !Array.isArray(pack.specs)) {
      return {
        id: pack.id || id || 'mage',
        apply: function () {
          const keys = Object.keys(pack.specs);
          const specsArr = keys.map((k) => pack.specs[k]).filter(Boolean);
          if (!specsArr.length) return false;
          return replaceClass({
            id: pack.id || id || 'mage',
            name: pack.name || 'Маг',
            nameEn: pack.nameEn || 'Mage',
            icon: pack.icon || '🔮',
            color: pack.color || '#69CCF0',
            resource: pack.resource || {
              type: 'mana', name: 'Мана', icon: '💧', max: 100, start: 100, regen: 5,
            },
            secondary: pack.secondary != null ? pack.secondary : null,
            specs: specsArr,
          });
        },
      };
    }
    return null;
  }

  function discoverLegacyPacks() {
    const out = [];
    const tryAdd = (id, pack) => {
      const n = normalizePack(id, pack);
      if (n) out.push(n);
    };

    // Explicit registry first
    if (Array.isArray(global.CLASS_BALANCE_PACKS)) {
      for (const p of global.CLASS_BALANCE_PACKS) {
        const n = normalizePack(p.id, p);
        if (n) out.push(n);
      }
    }
    if (global.CLASS_BALANCE && typeof global.CLASS_BALANCE === 'object') {
      for (const id of Object.keys(global.CLASS_BALANCE)) {
        tryAdd(id, global.CLASS_BALANCE[id]);
      }
    }

    // Per-class legacy globals
    tryAdd('warrior', global.WOW_WARRIOR_BALANCE || (global.WARRIOR_SPECS && { id: 'warrior', specs: global.WARRIOR_SPECS }));
    tryAdd('paladin', global.PALADIN_BALANCE);
    tryAdd('hunter', global.HUNTER_BALANCE || global.HUNTER_CLASS || global.applyHunterBalance);
    tryAdd('rogue', global.ROGUE_BALANCE);
    tryAdd('priest', global.PRIEST_BALANCE || global.PRIEST_CLASS);
    tryAdd('deathknight', global.DEATHKNIGHT_CLASS || global.DEATHKNIGHT_BALANCE);
    tryAdd('shaman', global.MK_SHAMAN_BALANCE || global.SHAMAN_BALANCE);
    tryAdd('mage', global.MAGE_BALANCE);
    tryAdd('warlock', global.WARLOCK_BALANCE || global.WARLOCK_CLASS);
    tryAdd('monk', global.MONK_BALANCE);
    tryAdd('druid', global.CLASS_BALANCE && global.CLASS_BALANCE.druid);
    tryAdd('engineer', global.ENGINEER_BALANCE || global.ENGINEER_CLASS);
    tryAdd('demonhunter', global.DEMONHUNTER_BALANCE || global.DEMONHUNTER_DRAFT);

    // Dedupe by id (first wins = registry order preference, then first legacy)
    const seen = new Set();
    const deduped = [];
    for (const p of out) {
      if (!p || !p.id || seen.has(p.id)) continue;
      seen.add(p.id);
      deduped.push(p);
    }
    return deduped;
  }

  // Shared helpers for packs (optional)
  global.CLASS_BALANCE_API = {
    replaceClass,
    replaceSpecs,
    clone,
    /**
     * Register a pack: apply(classes) contract.
     * @param {string} id
     * @param {function(Array): *} applyFn
     */
    register: function (id, applyFn) {
      global.CLASS_BALANCE_PACKS = global.CLASS_BALANCE_PACKS || [];
      global.CLASS_BALANCE_PACKS.push({ id, apply: applyFn });
    },
  };

  const packs = discoverLegacyPacks();
  const applied = [];

  for (const pack of packs) {
    try {
      pack.apply(classes);
      applied.push(pack.id);
    } catch (err) {
      console.warn('[class-balance] fail', pack.id, err);
    }
  }

  global.CLASS_BALANCE_APPLIED = applied;
  console.info('[class-balance] применено:', applied.join(', ') || '(ничего)');

  // Контроль: холи-паладин (5.4.8.14+) — Сияние 18 · Свет небес 35 · Вспышка 27 · Слово 80 · Заря 30
  try {
    const pal = classes.find((c) => c && c.id === 'paladin');
    const holy = pal && (pal.specs || []).find((s) => s && s.id === 'holy');
    if (holy && Array.isArray(holy.abilities)) {
      const want = {
        holy_radiance: 18, holy_light: 35, flash: 27, word_glory: 80, light_dawn: 30, holy_shock: 27,
      };
      const got = {};
      const bad = [];
      for (const ab of holy.abilities) {
        if (!ab || !want[ab.id]) continue;
        const fl = ab.flat != null ? Number(ab.flat) : (ab.fl != null ? Number(ab.fl) : null);
        got[ab.id] = fl;
        if (fl !== want[ab.id]) bad.push(ab.id + '=' + fl + ' (нужно ' + want[ab.id] + ')');
      }
      if (bad.length) {
        console.warn('[class-balance] HOLY flat mismatch:', bad.join(', '), got);
      } else {
        console.info('[class-balance] holy flats OK:', got);
      }
    }
  } catch (e) {
    console.warn('[class-balance] holy check fail', e);
  }
})(typeof window !== 'undefined' ? window : globalThis);
