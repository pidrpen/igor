/* systems/resources: resources + ability charges */
  // ── Resources ──
  function makeResourceState(cls, spec) {
    const { primary, secondary } = WOW_MOP.resolveResources(cls, spec);
    const state = {
      primary: {
        type: primary.type,
        name: primary.name,
        icon: primary.icon,
        max: primary.max,
        current: primary.start ?? primary.max,
        regen: primary.regen ?? 0,
      },
      secondary: secondary ? {
        type: secondary.type,
        name: secondary.name,
        icon: secondary.icon,
        max: secondary.max,
        current: secondary.start ?? 0,
      } : null,
      runes: null,
    };
    if (primary.type === 'runes') {
      state.runes = {
        blood: [true, true],
        frost: [true, true],
        unholy: [true, true],
        cd: [], // { type, turns }
      };
      state.primary.current = 6;
      state.primary.max = 6;
    }
    return state;
  }

  function readyRunes(u) {
    if (!u.res.runes) return 0;
    const r = u.res.runes;
    return r.blood.filter(Boolean).length + r.frost.filter(Boolean).length + r.unholy.filter(Boolean).length;
  }

  function spendRunes(u, costRunes) {
    if (!costRunes || !u.res.runes) return true;
    const r = u.res.runes;
    const take = (type, n) => {
      let left = n;
      for (let i = 0; i < r[type].length && left > 0; i++) {
        if (r[type][i]) { r[type][i] = false; r.cd.push({ type, idx: i, turns: 2 }); left--; }
      }
      return left === 0;
    };
    if (costRunes.any) {
      let n = costRunes.any;
      for (const type of ['blood', 'frost', 'unholy']) {
        for (let i = 0; i < r[type].length && n > 0; i++) {
          if (r[type][i]) { r[type][i] = false; r.cd.push({ type, idx: i, turns: 2 }); n--; }
        }
      }
      return n === 0;
    }
    if (costRunes.b && !take('blood', costRunes.b)) return false;
    if (costRunes.f && !take('frost', costRunes.f)) return false;
    if (costRunes.u && !take('unholy', costRunes.u)) return false;
    return true;
  }

  function canPay(u, ab, target) {
    if (ab.maxCharges) {
      if (ab.charges == null) ab.charges = ab.maxCharges;
      if (ab.charges <= 0) return false;
    } else if (ab.curCd > 0.05) return false;
    if (typeof PET_SUMMONS !== 'undefined' && PET_SUMMONS[ab.id] && u && typeof canSummonAbility === 'function' && !canSummonAbility(u, ab.id)) return false;
    if (ab.costRunes) {
      if (!u.res.runes) return false;
      if (ab.costRunes.any) { if (readyRunes(u) < ab.costRunes.any) return false; }
      else {
        const r = u.res.runes;
        if (ab.costRunes.b && r.blood.filter(Boolean).length < ab.costRunes.b) return false;
        if (ab.costRunes.f && r.frost.filter(Boolean).length < ab.costRunes.f) return false;
        if (ab.costRunes.u && r.unholy.filter(Boolean).length < ab.costRunes.u) return false;
      }
    }
    if (ab.cost > 0 && u.res.primary.type !== 'runes' && u.res.primary.current < ab.cost) return false;
    if (ab.costSec > 0) {
      if (!u.res.secondary) return false;
      const need = ab.costSec;
      if (u.res.secondary.type === 'combo' && need === 1) {
        if (u.res.secondary.current < 1) return false;
      } else if (u.res.secondary.current < need) return false;
    }
    // execute window
    if (EXECUTE_IDS.has(ab.id) && target && target.side === 'enemy') {
      if (target.hp / target.maxHp > 0.35) return false;
    }
    if (EXECUTE_IDS.has(ab.id) && !target && combat) {
      const foes = living('enemy');
      if (!foes.some(e => e.hp / e.maxHp <= 0.35)) return false;
    }
    if ((ab.type === 'interrupt' || INTERRUPT_IDS.has(ab.id)) && target) {
      if (!target.casting) return false;
    }
    if (ab.id === 'debug_mode' && u._debugUsedThisTurn) return false;
    if (ab.id === 'pet_rez') {
      const pet = getMainPet(u, true);
      if (pet && pet.alive && pet.hp > 0) return false;
      if (!mainPetKeyFor(u.classId, u.specId)) return false;
    }
    if (ab.id === 'wrench_heal') {
      const pet = getMainPet(u, false);
      if (!pet) return false;
    }
    return true;
  }

  function payAbility(u, ab) {
    // remember secondary stacks for finisher scaling before spend
    if (ab.costSec > 0 && u.res.secondary) {
      u._spentSec = u.res.secondary.type === 'combo'
        ? u.res.secondary.current
        : Math.min(u.res.secondary.current, ab.costSec);
    } else u._spentSec = 0;

    if (ab.costRunes) spendRunes(u, ab.costRunes);
    else if (ab.cost > 0 && u.res.primary.type !== 'runes') {
      u.res.primary.current = Math.max(0, u.res.primary.current - ab.cost);
    }
    if (ab.gen && u.res.primary.type !== 'runes') {
      u.res.primary.current = clamp(u.res.primary.current + ab.gen, 0, u.res.primary.max);
    }
    if (ab.genRunic && u.res.secondary?.type === 'runic_power') {
      u.res.secondary.current = clamp(u.res.secondary.current + ab.genRunic, 0, u.res.secondary.max);
    }
    if (ab.genSec && u.res.secondary) {
      const prev = u.res.secondary.current;
      u.res.secondary.current = clamp(u.res.secondary.current + ab.genSec, 0, u.res.secondary.max);
      // Balance eclipse: при заполнении шкалы — короткий +ATK (lite 5.4.8)
      if (u.res.secondary.type === 'eclipse' && prev < u.res.secondary.max && u.res.secondary.current >= u.res.secondary.max) {
        u.buffs = u.buffs || [];
        applyStatus(u, { id: 'eclipse', name: 'Затмение', icon: '🌓', turns: 3, atkMod: 0.2 });
        u.res.secondary.current = 0;
      }
    }
    if (ab.costSec > 0 && u.res.secondary) {
      if (u.res.secondary.type === 'runic_power') {
        u.res.secondary.current = Math.max(0, u.res.secondary.current - ab.costSec);
      } else if (u.res.secondary.type === 'combo') {
        u.res.secondary.current = 0;
      } else {
        u.res.secondary.current = Math.max(0, u.res.secondary.current - ab.costSec);
      }
      // Холи-паладин «Добродетель»: каждая потраченная ES — 25% шанс вернуть
      try { maybeHolyVirtueRefund(u, ab); } catch (e) { console.error(e); }
    }
  }

  /**
   * Пассивка «Добродетель» (все спеки паладина):
   * за каждую потраченную ед. Энергии Света — 25% вернуть 1 ед. (независимые роллы).
   */
  function maybeHolyVirtueRefund(u, ab) {
    if (!u || u.classId !== 'paladin') return;
    if (!u.res?.secondary || u.res.secondary.type !== 'holy_power') return;
    const spent = Math.max(0, Number(u._spentSec) || 0);
    if (spent <= 0) return;
    let refunded = 0;
    for (let i = 0; i < spent; i++) {
      if (Math.random() < 0.25) refunded++;
    }
    if (refunded <= 0) return;
    u.res.secondary.current = clamp(
      u.res.secondary.current + refunded,
      0,
      u.res.secondary.max
    );
    floatText(u.uid, '+' + refunded + ' ES', 'buff');
    pulseResourceGain(u.uid, '+' + refunded + ' ES');
    log(
      (u.name || 'Паладин') + ': Добродетель — вернулось ' + refunded + ' ES (из ' + spent + ')',
      'player'
    );
  }

  /** Короткая анимация +X у вторичного ресурса на портрете */
  function pulseResourceGain(unitUid, text) {
    if (!unitUid) return;
    const card = document.querySelector(`.unit[data-uid="${unitUid}"]`);
    if (!card) return;
    const slot = card.querySelector('.slot-sec') || card.querySelector('.bar.res')?.parentElement;
    if (!slot) return;
    slot.classList.add('res-gain-pulse');
    const tag = document.createElement('span');
    tag.className = 'res-gain-float';
    tag.textContent = text || '+';
    slot.style.position = slot.style.position || 'relative';
    slot.appendChild(tag);
    setTimeout(() => {
      tag.remove();
      slot.classList.remove('res-gain-pulse');
    }, 900);
  }

  function regenResources(u) {
    if (!u.alive) return;
    const p = u.res.primary;
    if (p.type !== 'runes' && p.regen) {
      p.current = clamp(p.current + p.regen, 0, p.max);
    }
    if (u.res.runes) {
      const left = [];
      for (const cd of u.res.runes.cd) {
        cd.turns--;
        if (cd.turns <= 0) u.res.runes[cd.type][cd.idx] = true;
        else left.push(cd);
      }
      u.res.runes.cd = left;
      u.res.primary.current = readyRunes(u);
    }
    // small passive RP for DK
    if (u.res.secondary?.type === 'runic_power') {
      u.res.secondary.current = clamp(u.res.secondary.current + 5, 0, u.res.secondary.max);
    }
  }

  function costLabel(u, ab) {
    const bits = [];
    if (ab.costRunes) {
      if (ab.costRunes.any) bits.push(ab.costRunes.any + ' рун(ы)');
      else {
        if (ab.costRunes.b) bits.push(ab.costRunes.b + ' крови');
        if (ab.costRunes.f) bits.push(ab.costRunes.f + ' льда');
        if (ab.costRunes.u) bits.push(ab.costRunes.u + ' нечестивости');
      }
    } else if (ab.cost > 0) bits.push(ab.cost + ' ' + (u.res.primary.icon || '') + ' ' + u.res.primary.name);
    if (ab.costSec > 0 && u.res.secondary) {
      bits.push(ab.costSec + ' ' + u.res.secondary.icon + ' ' + u.res.secondary.name);
    }
    if (ab.gen) bits.push('+' + ab.gen + ' ' + u.res.primary.name);
    if (ab.genSec && u.res.secondary) bits.push('+' + ab.genSec + ' ' + u.res.secondary.name);
    if (ab.genRunic) bits.push('+' + ab.genRunic + ' силы рун');
    if (ab.cd) bits.push('КД ' + ab.cd);
    if (!bits.length) bits.push('бесплатно');
    return bits.join(' · ');
  }

  // ── Lobby UI ──

