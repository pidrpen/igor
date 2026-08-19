/* Дерево героя: 5 ярусов, один из трёх, 8/16/24/32/40. Паладин — из концепта. Остальные — общая заглушка. S37 без своей ветки. */
(function (G) {
  var PALADIN_TIERS = [
    {
      id: 't1', level: 8, title: 'Шаг',
      picks: [
        { id: 'speed_of_light', name: 'Скорость света', icon: '💨', desc: '+2 к скорости. Ходишь раньше в раунде.' },
        { id: 'long_arm', name: 'Долгая рука закона', icon: '⚖️', desc: 'Правосудие вешает −10% защиты цели на 2 хода.' },
        { id: 'pursuit', name: 'Преследование справедливости', icon: '🏃', desc: '+8% атаки, пока твоё здоровье выше 80%.' },
      ],
    },
    {
      id: 't2', level: 16, title: 'Ресурс',
      picks: [
        { id: 'divine_purpose', name: 'Божественная цель', icon: '🕊️', desc: 'Добродетель: шанс вернуть Энергию Света 25% → 40%.' },
        { id: 'holy_avenger', name: 'Святой мститель', icon: '☀️', desc: 'После траты Энергии Света следующий генератор даёт +1 сверх нормы. Внутри 3 хода.' },
        { id: 'sanctified_wrath', name: 'Освящённый гнев', icon: '😇', desc: 'Пока висит Гнев карателя — +1 Энергия Света в начале твоего хода.' },
      ],
    },
    {
      id: 't3', level: 24, title: 'Лицо спека',
      bySpec: {
        retribution: [
          { id: 'blade_of_light', name: 'Клинок Света', icon: '⚔️', desc: 'Вердикт храмовника +15% урона.' },
          { id: 'ash_storm', name: 'Буря пепла', icon: '🌪️', desc: 'Божественная буря стоит 3 Энергии Света, не 4.' },
          { id: 'wrathful_hammer', name: 'Карающий молот', icon: '⚡', desc: 'Молот гнева доступен с 50% здоровья цели.' },
        ],
        protection: [
          { id: 'unbreakable', name: 'Несокрушимый дух', icon: '❤️', desc: 'Ревностный защитник: перезарядка 6 → 4.' },
          { id: 'holy_bulwark', name: 'Святой оплот', icon: '🔰', desc: 'Щит от Щита мстителя: 25% → 40% нанесённого.' },
          { id: 'hallowed_ground', name: 'Освящённая земля', icon: '☀️', desc: 'Освящение 6 ходов. Сплэш Правосудия 60% → 80%.' },
        ],
        holy: [
          { id: 'selfless', name: 'Самоотверженный целитель', icon: '✨', desc: 'Шок небес (хил) +20%.' },
          { id: 'eternal_flame', name: 'Вечное пламя', icon: '🔥', desc: 'Слово славы оставляет периодическое лечение 20% на 3 хода.' },
          { id: 'sacred_shield', name: 'Священный щит', icon: '🛡️', desc: 'Божественная защита: щит +50%.' },
        ],
      },
    },
    {
      id: 't4', level: 32, title: 'Приём',
      picks: [
        { id: 'sacrifice', name: 'Длань жертвенности', icon: '🤲', desc: 'Раз в бой, без хода: 30% входящего выбранного союзника идёт в тебя на 2 хода.' },
        { id: 'bubble', name: 'Божественный щит', icon: '💠', desc: 'Раз в инст, без хода: следующий удар по тебе = 0.' },
        { id: 'fierce_light', name: 'Гневный свет', icon: '🌟', desc: 'Крит школы Свет ×1.75 вместо ×1.5.' },
      ],
    },
    {
      id: 't5', level: 40, title: 'Венец',
      picks: [
        { id: 'master_light', name: 'Мастер Света', icon: '📿', desc: '+8 п.п. к эффекту искусности.' },
        { id: 'oathbound', name: 'Закалённый клятвами', icon: '🏰', desc: '+12% здоровья и +8% защиты.' },
        { id: 'blade_justice', name: 'Клинок правосудия', icon: '🗡️', desc: '+12% атаки и +4% крита.' },
      ],
    },
  ];

  /* Общая заглушка (в т.ч. Изобретатель S37 — без своей ветки). Шаг / ресурс / живучесть. */
  var GENERIC_TIERS = [
    {
      id: 't1', level: 8, title: 'Шаг',
      picks: [
        { id: 'gen_swift', name: 'Лёгкий шаг', icon: '💨', desc: '+2 к скорости. Ходишь раньше в раунде.' },
        { id: 'gen_strike', name: 'Первый укол', icon: '🗡️', desc: '+6% атаки в первые 2 раунда боя.' },
        { id: 'gen_skin', name: 'Плотная кожа', icon: '🧥', desc: '+8% здоровья.' },
      ],
    },
    {
      id: 't2', level: 16, title: 'Ресурс',
      picks: [
        { id: 'gen_tide', name: 'Прилив ресурса', icon: '💧', desc: 'Генератор вторичного ресурса даёт +1 сверх нормы.' },
        { id: 'gen_hoard', name: 'Запас', icon: '🎒', desc: 'Трата вторичного ресурса от 2 ед. дешевле на 1.' },
        { id: 'gen_wind', name: 'Второе дыхание', icon: '🌬️', desc: 'В начале твоего хода: 6% от недостающего здоровья.' },
      ],
    },
    {
      id: 't3', level: 24, title: 'Лицо',
      picks: [
        { id: 'gen_focus', name: 'Собранность', icon: '🎯', desc: '+8% атаки.' },
        { id: 'gen_ward', name: 'Стойка', icon: '🛡️', desc: '+10% защиты.' },
        { id: 'gen_grip', name: 'Хватка', icon: '✊', desc: '+6% здоровья и +4% атаки.' },
      ],
    },
    {
      id: 't4', level: 32, title: 'Приём',
      picks: [
        { id: 'gen_stand', name: 'Последний рубеж', icon: '🏰', desc: 'Раз в бой, без хода: −40% входящего на 2 хода.' },
        { id: 'gen_burst', name: 'Окно удара', icon: '💥', desc: 'Раз в бой, без хода: +20% атаки на 2 хода.' },
        { id: 'gen_guard', name: 'Импульс защиты', icon: '🔰', desc: 'Раз в бой, без хода: щит 20% максимального здоровья.' },
      ],
    },
    {
      id: 't5', level: 40, title: 'Венец',
      picks: [
        { id: 'gen_master', name: 'Мастерство', icon: '📿', desc: '+8 п.п. к эффекту искусности.' },
        { id: 'gen_vital', name: 'Закал', icon: '❤️', desc: '+12% здоровья и +8% защиты.' },
        { id: 'gen_edge', name: 'Грань', icon: '⚔️', desc: '+12% атаки и +4% крита.' },
      ],
    },
  ];

  function isPaladin(classId) {
    return classId === 'paladin';
  }

  function tiersFor(classId) {
    return isPaladin(classId) ? PALADIN_TIERS : GENERIC_TIERS;
  }

  function talentPicks(classId, specId, tier) {
    if (!tier) return [];
    if (tier.bySpec) return (tier.bySpec[specId] || []).slice();
    return (tier.picks || []).slice();
  }

  function picksForHero(hero, tierId) {
    if (!hero) return [];
    var tiers = tiersFor(hero.classId);
    for (var i = 0; i < tiers.length; i++) {
      if (tiers[i].id === tierId) return talentPicks(hero.classId, hero.specId, tiers[i]);
    }
    return [];
  }

  function talentSet(heroOrUnit) {
    var ids = new Set();
    var src = null;
    if (heroOrUnit && heroOrUnit._heroTalentIds) {
      heroOrUnit._heroTalentIds.forEach(function (id) { ids.add(id); });
      return ids;
    }
    if (heroOrUnit && heroOrUnit.talents) src = heroOrUnit.talents;
    else if (typeof G.igorHeroGetActive === 'function') {
      var h = G.igorHeroGetActive();
      src = h && h.talents;
    }
    if (src) {
      Object.keys(src).forEach(function (k) {
        if (src[k]) ids.add(src[k]);
      });
    }
    return ids;
  }

  function hasTalent(u, id) {
    if (!u || !id) return false;
    if (u._heroTalentIds && u._heroTalentIds.has && u._heroTalentIds.has(id)) return true;
    return talentSet(u).has(id);
  }

  function pendingTier(hero) {
    if (!hero) return null;
    var tiers = tiersFor(hero.classId);
    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i];
      if (hero.level >= t.level && !(hero.talents && hero.talents[t.id])) return t;
    }
    return null;
  }

  function cloneAb(o) {
    var a = {
      id: o.id, name: o.name, icon: o.icon || '✨',
      cost: o.cost || 0, gen: o.gen || 0, costSec: o.costSec || 0, genSec: o.genSec || 0,
      costRunes: null, genRunic: 0,
      cd: o.cd || 0, baseCd: o.cd || 0, curCd: 0,
      type: o.type || 'buff', power: o.power || 0, school: o.school || 'none',
      desc: o.desc || '', freeAction: !!o.freeAction,
    };
    if (o.dmgReduce != null) a.dmgReduce = o.dmgReduce;
    if (o.atkMod != null) a.atkMod = o.atkMod;
    if (o.buffTurns != null) a.buffTurns = o.buffTurns;
    if (o.flat != null) a.flat = o.flat;
    return a;
  }

  function injectTalentAbs(unit, ids) {
    if (!unit.abilities) unit.abilities = [];
    function has(id) { return unit.abilities.some(function (a) { return a && a.id === id; }); }
    if (ids.has('sacrifice') && !has('hero_sac')) {
      unit.abilities.push(cloneAb({
        id: 'hero_sac', name: 'Длань жертвенности', icon: '🤲',
        type: 'buff', freeAction: true, cd: 99, school: 'none',
        desc: 'Раз в бой: 30% входящего союзника идёт в тебя, 2 хода',
      }));
    }
    if (ids.has('bubble') && !has('hero_bubble')) {
      unit.abilities.push(cloneAb({
        id: 'hero_bubble', name: 'Божественный щит', icon: '💠',
        type: 'buff', freeAction: true, cd: 99, school: 'none',
        desc: 'Раз в инст: следующий удар = 0',
      }));
    }
    if (ids.has('gen_stand') && !has('hero_last_stand')) {
      unit.abilities.push(cloneAb({
        id: 'hero_last_stand', name: 'Последний рубеж', icon: '🏰',
        type: 'buff', freeAction: true, cd: 99, dmgReduce: 0.4, buffTurns: 2,
        desc: 'Раз в бой: −40% входящего, 2 хода',
      }));
    }
    if (ids.has('gen_burst') && !has('hero_burst')) {
      unit.abilities.push(cloneAb({
        id: 'hero_burst', name: 'Окно удара', icon: '💥',
        type: 'buff', freeAction: true, cd: 99, atkMod: 0.2, buffTurns: 2,
        desc: 'Раз в бой: +20% атаки, 2 хода',
      }));
    }
    if (ids.has('gen_guard') && !has('hero_guard')) {
      unit.abilities.push(cloneAb({
        id: 'hero_guard', name: 'Импульс защиты', icon: '🔰',
        type: 'shield', freeAction: true, cd: 99,
        desc: 'Раз в бой: щит 20% максимального здоровья',
      }));
    }
  }

  function tweakAbilities(unit, ids) {
    (unit.abilities || []).forEach(function (a) {
      if (!a) return;
      if (ids.has('ash_storm') && a.id === 'divine_storm' && a.costSec > 3) a.costSec = 3;
      if (ids.has('unbreakable') && a.id === 'ardent') { a.cd = 4; a.baseCd = 4; }
      if (ids.has('hallowed_ground') && a.id === 'consecrate' && a.applyDot) a.applyDot.turns = 6;
      if (ids.has('hallowed_ground') && a.id === 'judgment') a.judgmentConsecrateSplash = 0.8;
      if (ids.has('holy_bulwark') && a.id === 'avengers') a.shieldFromDmg = 0.4;
      if (ids.has('gen_hoard') && a.costSec >= 2) a.costSec = a.costSec - 1;
    });
  }

  function applyTalents(unit, hero) {
    if (!unit || !unit._isHero) return unit;
    var rec = hero || (typeof G.igorHeroGetActive === 'function' ? G.igorHeroGetActive() : null);
    var ids = talentSet(rec || unit);
    unit._heroTalentIds = ids;
    tweakAbilities(unit, ids);
    injectTalentAbs(unit, ids);
    applyStatTalents(unit);
    return unit;
  }

  function applyStatTalents(unit) {
    if (!unit || !unit._isHero) return;
    var ids = unit._heroTalentIds || talentSet(unit);
    if (ids.has('speed_of_light') || ids.has('gen_swift')) {
      unit.speed = (unit.speed || 0) + 2;
      if (unit._baseSpeed != null) unit._baseSpeed += 2;
    }
    function bumpHp(m) {
      var ratio = unit.maxHp ? unit.hp / unit.maxHp : 1;
      unit.maxHp = Math.round(unit.maxHp * m);
      if (unit._baseMaxHp != null) unit._baseMaxHp = Math.round(unit._baseMaxHp * m);
      unit.hp = Math.max(unit.alive === false ? 0 : 1, Math.min(unit.maxHp, Math.round(unit.maxHp * ratio)));
    }
    function bumpAtk(m) {
      unit.atk = Math.round(unit.atk * m);
      if (unit._baseAtk != null) unit._baseAtk = Math.round(unit._baseAtk * m);
    }
    function bumpDef(m) {
      unit.def = Math.round(unit.def * m);
      if (unit._baseDef != null) unit._baseDef = Math.round(unit._baseDef * m);
    }
    if (ids.has('oathbound') || ids.has('gen_vital')) { bumpHp(1.12); bumpDef(1.08); }
    if (ids.has('blade_justice') || ids.has('gen_edge')) bumpAtk(1.12);
    if (ids.has('gen_skin')) bumpHp(1.08);
    if (ids.has('gen_focus')) bumpAtk(1.08);
    if (ids.has('gen_ward')) bumpDef(1.10);
    if (ids.has('gen_grip')) { bumpHp(1.06); bumpAtk(1.04); }
    unit._heroTalentStatsApplied = true;
  }

  function execCeil(u) {
    return hasTalent(u, 'wrathful_hammer') ? 0.5 : 0.35;
  }

  function wrap(name, factory) {
    var prev = G[name];
    if (typeof prev !== 'function') return false;
    var next = factory(prev);
    G[name] = next;
    try { eval(name + ' = next'); } catch (_) {}
    return true;
  }

  function install() {
    if (G._igorHeroTalentsHooked) return true;
    if (typeof dealDmg !== 'function') return false;

    wrap('getEff', function (orig) {
      return function (u, viewer) {
        var e = orig(u, viewer);
        if (!u || !e) return e;
        if (hasTalent(u, 'pursuit') && u.maxHp && u.hp / u.maxHp > 0.8) {
          e.atk = Math.round(e.atk * 1.08);
        }
        if (hasTalent(u, 'gen_strike') && typeof combat !== 'undefined' && combat && combat.round <= 2) {
          e.atk = Math.round(e.atk * 1.06);
        }
        return e;
      };
    });

    wrap('critChance', function (orig) {
      return function (u) {
        var c = orig(u);
        if (hasTalent(u, 'blade_justice') || hasTalent(u, 'gen_edge')) c += 0.04;
        return typeof clamp === 'function' ? clamp(c, 0.05, 0.75) : Math.max(0.05, Math.min(0.75, c));
      };
    });

    wrap('critMult', function (orig) {
      return function (u) {
        if (hasTalent(u, 'fierce_light') && u && u._heroLastSchool === 'holy') return 1.75;
        return orig(u);
      };
    });

    wrap('masteryPct', function (orig) {
      return function (u) {
        if (u && u._isHero && (u._heroLevel || 40) < 10) return 0;
        var p = orig(u);
        if (hasTalent(u, 'master_light') || hasTalent(u, 'gen_master')) p += 0.08;
        return p;
      };
    });

    wrap('abilityDamageRaw', function (orig) {
      return function (actor, ab, mult) {
        var m = mult == null ? 1 : mult;
        if (ab && ab.id === 'templar' && hasTalent(actor, 'blade_of_light')) m *= 1.15;
        return orig(actor, ab, m);
      };
    });

    wrap('abilityShieldRaw', function (orig) {
      return function (actor, ab, target) {
        var v = orig(actor, ab, target);
        if (ab && ab.id === 'divine_prot' && hasTalent(actor, 'sacred_shield')) v = Math.round(v * 1.5);
        return v;
      };
    });

    wrap('canPay', function (orig) {
      return function (u, ab, target) {
        if (ab && typeof EXECUTE_IDS !== 'undefined' && EXECUTE_IDS.has(ab.id) && hasTalent(u, 'wrathful_hammer')) {
          EXECUTE_IDS.delete(ab.id);
          var ok;
          try { ok = orig(u, ab, target); }
          finally { EXECUTE_IDS.add(ab.id); }
          if (!ok) return false;
          var ceil = 0.5;
          if (target && target.side === 'enemy') return target.hp / target.maxHp <= ceil;
          if (!target && typeof combat !== 'undefined' && combat && typeof living === 'function') {
            return living('enemy').some(function (e) { return e.hp / e.maxHp <= ceil; });
          }
          return true;
        }
        return orig(u, ab, target);
      };
    });

    wrap('abilityTargetRule', function (orig) {
      return function (ab) {
        if (ab && ab.id === 'hero_sac') return 'ally_any';
        return orig(ab);
      };
    });

    wrap('dealDmg', function (orig) {
      return function (target, raw, attacker, ctx) {
        if (attacker && ctx && ctx.school) attacker._heroLastSchool = ctx.school;
        if (target && target.buffs) {
          var bub = target.buffs.find(function (b) { return b && b.id === 'hero_bubble'; });
          if (bub && raw > 0) {
            target.buffs = target.buffs.filter(function (b) { return b !== bub; });
            try { if (typeof floatText === 'function') floatText(target.uid, '0', 'buff'); } catch (_) {}
            try { if (typeof log === 'function') log((target.name || 'Герой') + ': Божественный щит — удар = 0', 'heal'); } catch (_) {}
            return 0;
          }
          var link = target.buffs.find(function (b) { return b && b.id === 'hero_sac_link'; });
          if (link && raw > 0 && typeof run !== 'undefined' && run && run.party) {
            var pal = run.party.find(function (p) { return p && p.uid === link.shareToUid; });
            var share = Math.max(1, Math.round(raw * 0.3));
            raw = Math.max(0, raw - share);
            if (pal && pal.alive && pal.uid !== target.uid) {
              orig(pal, share, attacker, ctx);
            }
          }
        }
        return orig(target, raw, attacker, ctx);
      };
    });

    wrap('healUnit', function (orig) {
      return function (t, amount, healer, opts) {
        if (healer && hasTalent(healer, 'selfless') && opts && opts.abilityId === 'holy_shock') {
          amount = Math.round(amount * 1.2);
        }
        var healed = orig(t, amount, healer, opts);
        if (healed > 0 && healer && hasTalent(healer, 'eternal_flame') && opts && opts.abilityId === 'word_glory' && typeof applyStatus === 'function') {
          var tick = Math.max(1, Math.round(healed * 0.2 / 3));
          applyStatus(t, {
            id: 'hot_eternal_flame', name: 'Вечное пламя', icon: '🔥',
            turns: 3, hot: tick, fromUid: healer.uid, periodic: true,
          });
        }
        return healed;
      };
    });

    wrap('castAbility', function (orig) {
      return function (actor, ability, target) {
        if (ability && ability.id === 'hero_sac') {
          if (typeof canPay === 'function' && !canPay(actor, ability, target)) return;
          target = (target && target.alive && target.side === actor.side && !target.isPet) ? target : actor;
          if (typeof payAbility === 'function') payAbility(actor, ability);
          ability.curCd = ability.cd || 99;
          if (typeof applyStatus === 'function') {
            applyStatus(target, {
              id: 'hero_sac_link', name: 'Длань жертвенности', icon: '🤲',
              turns: 2, shareToUid: actor.uid, tip: '30% входящего идёт в ' + (actor.name || 'паладина'),
            });
          }
          try { if (typeof log === 'function') log(actor.name + ': Длань жертвенности → ' + target.name, 'player'); } catch (_) {}
          return;
        }
        if (ability && ability.id === 'hero_bubble') {
          if (typeof canPay === 'function' && !canPay(actor, ability, target)) return;
          if (typeof payAbility === 'function') payAbility(actor, ability);
          ability.curCd = ability.cd || 99;
          if (typeof applyStatus === 'function') {
            applyStatus(actor, { id: 'hero_bubble', name: 'Божественный щит', icon: '💠', turns: 99, tip: 'Следующий удар = 0' });
          }
          try { if (typeof log === 'function') log(actor.name + ': Божественный щит', 'player'); } catch (_) {}
          return;
        }
        if (ability && ability.id === 'hero_guard') {
          if (typeof canPay === 'function' && !canPay(actor, ability, target)) return;
          if (typeof payAbility === 'function') payAbility(actor, ability);
          ability.curCd = ability.cd || 99;
          var sh = Math.max(1, Math.round((actor.maxHp || 0) * 0.2));
          actor.shield = (actor.shield || 0) + sh;
          try { if (typeof log === 'function') log(actor.name + ': Импульс защиты 🛡' + (typeof fmt === 'function' ? fmt(sh) : sh), 'heal'); } catch (_) {}
          return;
        }
        if (ability && typeof EXECUTE_IDS !== 'undefined' && EXECUTE_IDS.has(ability.id) && hasTalent(actor, 'wrathful_hammer')) {
          var ceil = execCeil(actor);
          if (!target && typeof living === 'function') {
            target = living(actor.side === 'ally' ? 'enemy' : 'ally').find(function (e) { return e.hp / e.maxHp <= ceil; });
            if (!target) return;
          }
          if (target && target.hp / target.maxHp > ceil) {
            try { if (typeof log === 'function') log(ability.name + ' только при ≤50% здоровья', 'system'); } catch (_) {}
            return;
          }
          EXECUTE_IDS.delete(ability.id);
          try { return orig(actor, ability, target); }
          finally { EXECUTE_IDS.add(ability.id); }
        }
        orig(actor, ability, target);
        if (ability && ability.id === 'judgment' && hasTalent(actor, 'long_arm') && target && typeof applyStatus === 'function') {
          applyStatus(target, {
            id: 'long_arm', name: 'Долгая рука закона', icon: '⚖️',
            turns: 2, defMod: -0.10, tip: 'Защита −10%',
          });
        }
      };
    });

    wrap('maybeHolyVirtueRefund', function (orig) {
      return function (u, ab) {
        if (u && u._isHero && (u._heroLevel || 40) < 10) return;
        if (!hasTalent(u, 'divine_purpose')) return orig(u, ab);
        if (!u || u.classId !== 'paladin') return orig(u, ab);
        if (!u.res || !u.res.secondary || u.res.secondary.type !== 'holy_power') return;
        var spent = Math.max(0, Number(u._spentSec) || 0);
        if (spent <= 0) return;
        var refunded = 0;
        for (var i = 0; i < spent; i++) if (Math.random() < 0.4) refunded++;
        if (refunded <= 0) return;
        var cl = typeof clamp === 'function' ? clamp : function (v, a, b) { return Math.max(a, Math.min(b, v)); };
        u.res.secondary.current = cl(u.res.secondary.current + refunded, 0, u.res.secondary.max);
        try {
          if (typeof floatText === 'function') floatText(u.uid, '+' + refunded + ' ES', 'buff');
          if (typeof log === 'function') log((u.name || 'Паладин') + ': Добродетель (40%) — вернулось ' + refunded + ' ES', 'player');
        } catch (_) {}
      };
    });

    wrap('payAbility', function (orig) {
      return function (u, ab) {
        orig(u, ab);
        if (!u || !ab) return;
        if (hasTalent(u, 'holy_avenger') && ab.costSec > 0 && u.res && u.res.secondary && u.res.secondary.type === 'holy_power') {
          u._haArmed = true;
          u._haIcd = 3;
        }
        if (hasTalent(u, 'holy_avenger') && ab.genSec > 0 && u._haArmed && u.res && u.res.secondary) {
          u.res.secondary.current = Math.min(u.res.secondary.max, u.res.secondary.current + 1);
          u._haArmed = false;
          try { if (typeof log === 'function') log(u.name + ': Святой мститель +1 ES', 'player'); } catch (_) {}
        }
        if (hasTalent(u, 'gen_tide') && ab.genSec > 0 && u.res && u.res.secondary) {
          u.res.secondary.current = Math.min(u.res.secondary.max, u.res.secondary.current + 1);
        }
      };
    });

    wrap('regenResources', function (orig) {
      return function (actor) {
        orig(actor);
        if (!actor || !actor._isHero) return;
        if (actor._haIcd > 0) actor._haIcd -= 1;
        if (hasTalent(actor, 'sanctified_wrath') && actor.res && actor.res.secondary && actor.res.secondary.type === 'holy_power') {
          var aw = (actor.buffs || []).some(function (b) { return b && (b.id === 'crit_avenging' || (b.name && String(b.name).indexOf('Гнев карателя') >= 0)); });
          if (aw) {
            actor.res.secondary.current = Math.min(actor.res.secondary.max, actor.res.secondary.current + 1);
          }
        }
        if (hasTalent(actor, 'gen_wind') && actor.alive && actor.maxHp) {
          var miss = actor.maxHp - actor.hp;
          if (miss > 0) {
            var add = Math.max(1, Math.round(miss * 0.06));
            actor.hp = Math.min(actor.maxHp, actor.hp + add);
          }
        }
      };
    });

    wrap('getUnitPassives', function (orig) {
      return function (u) {
        var list = orig(u) || [];
        if (!u || !u._isHero || u._heroLevel == null) return list;
        if (typeof G.igorHeroPassiveUnlockLevel !== 'function') return list;
        var lv = u._heroLevel;
        return list.filter(function (p) {
          return lv >= G.igorHeroPassiveUnlockLevel(u.classId, u.specId, p && p.id);
        });
      };
    });

    G._igorHeroTalentsHooked = true;
    return true;
  }

  G.IGOR_HERO_TALENT_TIERS_PALADIN = PALADIN_TIERS;
  G.IGOR_HERO_TALENT_TIERS_GENERIC = GENERIC_TIERS;
  G.igorHeroTalentTiers = tiersFor;
  G.igorHeroTalentPicks = talentPicks;
  G.igorHeroPicksForHero = picksForHero;
  G.igorHeroHasTalent = hasTalent;
  G.igorHeroPendingTier = pendingTier;
  G.igorHeroApplyTalents = applyTalents;
  G.igorHeroApplyStatTalents = applyStatTalents;

  if (!install()) {
    document.addEventListener('DOMContentLoaded', install);
    var t = setInterval(function () { if (install()) clearInterval(t); }, 80);
    setTimeout(function () { clearInterval(t); }, 8000);
  }
})(typeof window !== 'undefined' ? window : this);
