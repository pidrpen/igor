(function (root) {
  const SKIP = { 'cheat:debug': 1, 'engineer:tinkerer': 1 };
  const ALIAS = {
    'monk:brewmaster': 'brew',
    'shaman:restoration': 'sham',
    'deathknight:unholy': 'unholy'
  };
  const NES = {
    warrior: { prefix: 'war', folder: 'warrior_nes', size: 96 },
    paladin: { prefix: 'pal', folder: 'paladin_ret_nes', size: 100 },
    hunter: { prefix: 'hunt', folder: 'hunter_bm_nes', size: 96 },
    rogue: { prefix: 'rog', folder: 'rogue_nes', size: 92 },
    priest: { prefix: 'pri', folder: 'priest_nes', size: 96 },
    deathknight: { prefix: 'dk', folder: 'dk_unholy_nes', size: 100 },
    shaman: { prefix: 'sham', folder: 'shaman_resto_nes', size: 96 },
    mage: { prefix: 'mage', folder: 'mage_nes', size: 96 },
    warlock: { prefix: 'lock', folder: 'warlock_nes', size: 96 },
    monk: { prefix: 'brew', folder: 'monk_brew_nes', size: 96 },
    druid: { prefix: 'dru', folder: 'druid_nes', size: 98 },
    engineer: { prefix: 'eng', folder: 'engineer_nes', size: 92 },
    demonhunter: { prefix: 'dh', folder: 'dh_nes', size: 96 }
  };
  const RANGED_CLASS = { hunter: 1, mage: 1, warlock: 1 };
  const ABILITY_ANIM = {
    jab: 'brew_jab', keg_smash: 'brew_keg', blackout: 'brew_kick', breath: 'brew_breath',
    sck: 'brew_kick', rsk: 'brew_kick', touch_death: 'brew_kick',
    riptide: 'sham_riptide', ch: 'sham_hw', hw: 'sham_hw', chw: 'sham_hw',
    hs: 'sham_hw', hst: 'sham_hw', unleash: 'sham_hw', flame_shock: 'sham_flame',
    spirit_link: 'sham_hw', lv: 'sham_flame', lb: 'sham_attack',
    death_coil: 'dk_coil', dnd: 'dk_nova', outbreak: 'dk_coil', summon_garg: 'dk_coil'
  };

  function isRanged(cls, spec, role) {
    if (RANGED_CLASS[cls]) return true;
    if (cls === 'priest' && spec !== 'holy' && spec !== 'discipline') return true;
    if (cls === 'shaman' && spec !== 'enhancement') return true;
    if (cls === 'druid' && (spec === 'balance' || spec === 'restoration')) return true;
    if (role === 'healer') return true;
    return false;
  }

  function kindOf(a, ranged) {
    const t = a.type || '';
    if (a.id === 'keg_smash' || a.id === 'keg') return 'keg';
    if (a.id === 'breath') return 'breath';
    if (a.id === 'death_coil' || a.id === 'flame_shock') return 'bolt';
    if (a.id === 'summon_garg' || a.id === 'niuzao' || a.id === 'hst') return 'summon';
    if (t === 'heal_aoe') return 'heal_aoe';
    if (t === 'heal') return 'heal';
    if (t === 'aoe') return 'nova';
    if (t === 'dot') return ranged ? 'bolt' : 'melee';
    if (t === 'buff' || t === 'shield' || t === 'cleanse' || t === 'taunt') return 'self';
    if (t === 'summon') return 'summon';
    if (t === 'damage' && ranged) return 'bolt';
    return 'melee';
  }

  function rangeOf(a, ranged, role) {
    const k = kindOf(a, ranged);
    if (k === 'heal' || k === 'heal_aoe' || k === 'self' || k === 'summon') return 8;
    if (k === 'nova') return 3.4;
    if (k === 'bolt' || k === 'keg') return ranged ? 5.6 : 5.2;
    if (k === 'breath') return 3.6;
    if (role === 'healer') return 4.8;
    return ranged ? 5.2 : 1.32;
  }

  function liveRegen(type, card) {
    if (type === 'rage' || type === 'steam') return 0;
    if (type === 'runic' || type === 'runic_power') return 0;
    if (type === 'energy' || type === 'focus') return Math.min(12, (card || 12) * 0.48);
    if (type === 'mana') return Math.min(4, (card || 5) * 0.42);
    return Math.min(6, (card || 0) * 0.4);
  }

  function mapAbs(list, fallbackAnim, ranged, role) {
    return (list || []).map(function (a, i) {
      const kind = kindOf(a, ranged);
      const heal = (a.type === 'heal' || a.type === 'heal_aoe') ? (a.flat || 0) : 0;
      return {
        id: a.id,
        key: i === 9 ? '0' : String(i + 1),
        name: a.name,
        cost: a.cost || 0,
        costSec: a.costSec || 0,
        costRunes: a.costRunes || null,
        genSec: a.genSec || 0,
        genRunic: a.genRunic || 0,
        gen: a.gen || 0,
        cd: a.cd || 0,
        dmg: a.flat || 0,
        heal: heal,
        range: rangeOf(a, ranged, role),
        kind: kind,
        type: a.type,
        anim: ABILITY_ANIM[a.id] || fallbackAnim,
        hitAt: 2,
        applyDot: a.applyDot || null,
        applyHot: a.applyHot || null,
        healFromDealt: a.healFromDealt || 0,
        dmgReduce: a.dmgReduce || 0,
        buffTurns: a.buffTurns || 0,
        atkMod: a.atkMod || 0,
        freeAction: !!a.freeAction,
        desc: a.desc || '',
        purifyPct: a.purifyPct || 0,
        healAmp: a.healAmp || 0,
        nextHealCharges: a.nextHealCharges || 0,
        chainDecay: a.chainDecay || 0,
        enemyDmgMod: a.enemyDmgMod || 0,
        selfShieldFlat: a.selfShieldFlat || 0,
        maxHpPct: a.maxHpPct || 0,
        healTakenMod: a.healTakenMod || 0,
        lifesteal: a.lifesteal || 0,
        critMod: a.critMod || 0
      };
    });
  }

  function kitId(classId, specId) {
    const key = classId + ':' + specId;
    return ALIAS[key] || (classId + '_' + specId);
  }

  function buildOne(cls, spec) {
    const nes = NES[cls.id] || { prefix: 'brew', folder: 'monk_brew_nes', size: 96 };
    const role = spec.role || 'dps';
    const ranged = isRanged(cls.id, spec.id, role);
    const res = spec.resourceOverride || cls.resource || { type: 'mana', name: 'мана', max: 100, regen: 4 };
    const sec = spec.secondaryOverride !== undefined ? spec.secondaryOverride : cls.secondary;
    const resType = res.type === 'runic_power' ? 'runic' : (res.type || 'mana');
    const hp = Math.round((80 + (spec.stats && spec.stats.hp || 100) * 0.8) * (role === 'tank' ? 1.18 : 1));
    const speed = 2.55 + ((spec.stats && spec.stats.speed) || 10) * 0.055;
    const fallbackAnim = nes.prefix === 'brew' ? 'brew_jab' : (nes.prefix + '_attack');
    const idle = nes.prefix + '_idle';
    const kit = {
      id: kitId(cls.id, spec.id),
      classId: cls.id,
      specId: spec.id,
      name: spec.name,
      className: cls.name,
      fullName: cls.name + ' ' + spec.name,
      color: cls.color || '#c4a040',
      hp: hp,
      speed: speed,
      size: nes.size,
      start: { x: 14, y: 22.5 },
      idle: idle,
      spritePrefix: nes.prefix,
      nesFolder: nes.folder,
      aiAnim: fallbackAnim,
      aiHit: 2,
      aiDmg: Math.max(10, Math.round(((spec.stats && spec.stats.atk) || 12) * 1.15)),
      aiCd: role === 'healer' ? 1.15 : (role === 'tank' ? 1.05 : 0.9),
      aiRange: ranged ? 5.2 : (role === 'healer' ? 4.6 : 1.28),
      resName: (res.name || 'ресурс').toLowerCase(),
      resType: resType,
      resMax: res.max || 100,
      resRegen: liveRegen(resType, res.regen),
      resStart: res.start != null ? res.start : (resType === 'rage' ? 20 : (resType === 'runic' ? 20 : (res.max || 100))),
      role: role,
      ranged: ranged,
      abs: mapAbs(spec.abilities, fallbackAnim, ranged, role)
    };
    if (sec && sec.type) {
      kit.secName = sec.name || 'вторичный';
      kit.secMax = sec.max || 5;
      kit.secType = sec.type;
    }
    if (resType === 'runic' || cls.id === 'deathknight') {
      kit.resType = 'runic';
      kit.resName = 'сила рун';
      kit.runesMax = 6;
      kit.runeRegen = 1 / 3.6;
      if (spec.id === 'frost') kit.runeSet = { b: 0, f: 3, u: 3 };
      else kit.runeSet = { b: 2, f: 2, u: 2 };
    }
    if (cls.id === 'monk' && (spec.id === 'brewmaster' || spec.id === 'windwalker')) {
      kit.secName = kit.secName || 'ци';
      kit.secMax = kit.secMax || 5;
    }
    return kit;
  }

  function buildKits() {
    const out = {};
    const mop = root.WOW_MOP;
    const classes = (mop && mop.classes) || [];
    classes.forEach(function (cls) {
      (cls.specs || []).forEach(function (spec) {
        const key = cls.id + ':' + spec.id;
        if (SKIP[key]) return;
        const kit = buildOne(cls, spec);
        out[kit.id] = kit;
      });
    });
    if (!out.brew) {
      out.brew = {
        id: 'brew', classId: 'monk', specId: 'brewmaster', name: 'Монах Хмелевар',
        color: '#00c78c', hp: 220, speed: 3.2, size: 96, start: { x: 9.2, y: 14.3 },
        idle: 'brew_idle', spritePrefix: 'brew', aiAnim: 'brew_jab', aiHit: 2, aiDmg: 20, aiCd: 1.2, aiRange: 1.28,
        resName: 'энергия', resType: 'energy', resMax: 100, resRegen: 12, secName: 'ци', secMax: 5, role: 'tank', abs: []
      };
    }
    Object.keys(out).forEach(function (id) {
      const list = out[id].abs || [];
      list.forEach(function (a, i) { a.key = i === 9 ? '0' : String(i + 1); });
    });
    return out;
  }

  const DEFAULT_PARTY = ['brew', 'sham', 'unholy', 'paladin_retribution', 'hunter_beast_mastery'];

  root.LiveKits = {
    build: buildKits,
    PARTY: DEFAULT_PARTY,
    NES: NES,
    SKIP: SKIP,
    kitId: kitId
  };
})(window);
