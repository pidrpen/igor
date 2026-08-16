/* shop-sets: готовые сеты брони/оружия под ключи +2 / +8 / +12 / +15 */
  const SHOP_KEY_TIERS = [
    { key: 2, label: '+2', rarity: 'uncommon', name: 'Новичок' },
    { key: 8, label: '+8', rarity: 'rare', name: 'Ветеран' },
    { key: 12, label: '+12', rarity: 'epic', name: 'Элита' },
    { key: 15, label: '+15', rarity: 'epic', name: 'Титан' },
  ];
  const SHOP_ROLES = [
    { id: 'tank', name: 'Танк', icon: '🛡️' },
    { id: 'healer', name: 'Целитель', icon: '💚' },
    { id: 'dps', name: 'Боец', icon: '⚔️' },
  ];

  /** Детерминированный полный сет (все слоты) под роль и ключ. */
  function buildShopArmorSet(roleId, keyLevel) {
    const tier = SHOP_KEY_TIERS.find(t => t.key === keyLevel) || SHOP_KEY_TIERS[0];
    const ilvl = keyToIlvl(keyLevel) + 2;
    const seedBase = (roleId.charCodeAt(0) * 1000 + keyLevel * 97) >>> 0;
    const items = GEAR_SLOT_IDS.filter(s => s !== 'trinket').map((slot, i) => {
      const it = generateGearItem({
        slot,
        keyLevel,
        ilvl,
        rarity: tier.rarity,
        role: roleId,
        seed: seedBase + i * 17,
      });
      it.name = `${tier.name}: ${GEAR_SLOT_MAP[slot].name} (${roleId === 'tank' ? 'танк' : roleId === 'healer' ? 'хил' : 'дд'})`;
      it.shop = true;
      it.shopKey = keyLevel;
      it.shopRole = roleId;
      it.shopSetId = `set_${roleId}_k${keyLevel}`;
      return it;
    });
    return {
      id: `set_${roleId}_k${keyLevel}`,
      keyLevel,
      role: roleId,
      name: `Сет «${tier.name}» · ${SHOP_ROLES.find(r => r.id === roleId)?.name || roleId} · ${tier.label}`,
      icon: SHOP_ROLES.find(r => r.id === roleId)?.icon || '📦',
      rarity: tier.rarity,
      items,
      priceLabel: 'бесплатно (тест)',
    };
  }

  function allShopArmorSets() {
    const out = [];
    for (const t of SHOP_KEY_TIERS) {
      for (const r of SHOP_ROLES) {
        out.push(buildShopArmorSet(r.id, t.key));
      }
    }
    return out;
  }
