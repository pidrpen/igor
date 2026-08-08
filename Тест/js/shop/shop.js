/* shop: Магазин + общая сумка аккаунта + выдача сетов */
  const SHARED_BAG_KEY = 'mythicKeySharedBag_v1';
  const SHARED_BAG_CAP = 80;

  function getSharedBag() {
    try {
      const raw = localStorage.getItem(SHARED_BAG_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(Boolean).map(cloneGearItem) : [];
    } catch (_) {
      return [];
    }
  }
  function setSharedBag(items) {
    const bag = (items || []).filter(Boolean).map(cloneGearItem);
    while (bag.length > SHARED_BAG_CAP) bag.shift();
    try {
      localStorage.setItem(SHARED_BAG_KEY, JSON.stringify(bag));
    } catch (e) {
      console.warn('[shop bag]', e);
      toast?.('Сумка: не удалось сохранить');
    }
    return bag;
  }
  function addToSharedBag(items) {
    const bag = getSharedBag();
    for (const it of (Array.isArray(items) ? items : [items])) {
      if (it) bag.push(cloneGearItem(it));
    }
    return setSharedBag(bag);
  }
  function removeFromSharedBag(uid) {
    const bag = getSharedBag().filter(it => it.uid !== uid);
    return setSharedBag(bag);
  }

  /** Материализовать trinket template → item with uid */
  function materializeShopTrinket(t) {
    if (!t) return null;
    return {
      uid: gearUid(),
      slot: 'trinket',
      name: t.name,
      icon: t.icon || '🔮',
      ilvl: t.ilvl || 10,
      rarity: t.rarity || 'rare',
      role: t.role || 'any',
      classId: t.classId || null,
      specId: t.specId || null,
      stats: { ...(t.stats || {}) },
      shop: true,
      shopKey: t.shopKey,
      testBuild: true,
      special: t.special ? { ...t.special } : null,
      templateId: t.id,
    };
  }

  function getShopTrinketsForKey(keyLevel) {
    const raw = (typeof SHOP_TRINKETS_RAW !== 'undefined') ? SHOP_TRINKETS_RAW : [];
    return raw.filter(t => +t.shopKey === +keyLevel);
  }

  // ── UI ──
  let shopOpen = false;
  let shopKeyFilter = 8;
  let shopTab = 'sets'; // sets | trinkets | bag

  function openShop() {
    shopOpen = true;
    const m = document.getElementById('shop-modal');
    m?.classList.remove('hidden');
    renderShop();
  }
  function closeShop() {
    shopOpen = false;
    document.getElementById('shop-modal')?.classList.add('hidden');
  }

  function renderShop() {
    const body = document.getElementById('shop-body');
    const tabs = document.getElementById('shop-tabs');
    const keyRow = document.getElementById('shop-key-row');
    if (!body) return;

    if (keyRow) {
      keyRow.innerHTML = SHOP_KEY_TIERS.map(t =>
        `<button type="button" class="btn btn-sm shop-key-btn${shopKeyFilter === t.key ? ' on' : ''}" data-k="${t.key}">${t.label} · ${t.name}</button>`
      ).join('');
      keyRow.querySelectorAll('[data-k]').forEach(b => {
        b.onclick = () => { shopKeyFilter = +b.dataset.k; renderShop(); };
      });
    }
    if (tabs) {
      tabs.innerHTML = [
        ['sets', '📦 Сеты'],
        ['trinkets', '🔮 Аксессуары'],
        ['bag', '🎒 Общая сумка'],
      ].map(([id, lab]) =>
        `<button type="button" class="btn btn-sm${shopTab === id ? ' on' : ''}" data-tab="${id}">${lab}</button>`
      ).join('');
      tabs.querySelectorAll('[data-tab]').forEach(b => {
        b.onclick = () => { shopTab = b.dataset.tab; renderShop(); };
      });
    }

    if (shopTab === 'sets') renderShopSets(body);
    else if (shopTab === 'trinkets') renderShopTrinkets(body);
    else renderShopBag(body);

    const count = getSharedBag().length;
    const badge = document.getElementById('shop-bag-count');
    if (badge) badge.textContent = String(count);
  }

  function renderShopSets(body) {
    const sets = allShopArmorSets().filter(s => s.keyLevel === shopKeyFilter);
    body.innerHTML = `
      <p class="shop-hint">Готовый комплект (все слоты кроме аксессуара) падает в <b>общую сумку</b>. Наденьте вручную или «Авто-одеть» в меню шмота.</p>
      <div class="shop-grid">${sets.map(s => `
        <div class="shop-card rarity-${s.rarity}">
          <div class="shop-card-ico">${s.icon}</div>
          <div class="shop-card-title">${s.name}</div>
          <div class="shop-card-meta">${s.items.length} предметов · ${rarityLabel(s.rarity)}</div>
          <div class="shop-card-stats">${formatGearStats({ stats: sumSetStats(s.items) })}</div>
          <button type="button" class="btn btn-ok btn-sm" data-buy-set="${s.id}">В сумку</button>
        </div>`).join('')}</div>`;
    body.querySelectorAll('[data-buy-set]').forEach(btn => {
      btn.onclick = () => {
        const set = sets.find(x => x.id === btn.dataset.buySet);
        if (!set) return;
        const copies = set.items.map(it => {
          const c = cloneGearItem(it);
          c.uid = gearUid();
          return c;
        });
        addToSharedBag(copies);
        toast(`В сумку: ${set.name} (${copies.length} шт.)`);
        renderShop();
      };
    });
  }

  function sumSetStats(items) {
    const tot = { atk: 0, hp: 0, def: 0, crit: 0, mastery: 0, vers: 0, speed: 0 };
    for (const it of items) {
      if (!it?.stats) continue;
      for (const k of Object.keys(tot)) tot[k] += (+it.stats[k] || 0);
    }
    return tot;
  }

  function renderShopTrinkets(body) {
    const list = getShopTrinketsForKey(shopKeyFilter);
    body.innerHTML = `
      <p class="shop-hint">Уникальные аксессуары под <b>класс + специализацию</b>. Механика описана в карточке (условия/бонусы тестовой ветки).</p>
      <div class="shop-grid shop-grid-trinkets">${list.map(t => `
        <div class="shop-card rarity-${t.rarity}">
          <div class="shop-card-ico">${t.icon}</div>
          <div class="shop-card-title">${t.name}</div>
          <div class="shop-card-meta">${t.classId} · ${t.specId} · ilvl ${t.ilvl}</div>
          <div class="shop-card-stats">${formatGearStats(t)}</div>
          <div class="shop-special">${t.special?.desc || ''}</div>
          <button type="button" class="btn btn-ok btn-sm" data-buy-tr="${t.id}">В сумку</button>
        </div>`).join('')}</div>`;
    body.querySelectorAll('[data-buy-tr]').forEach(btn => {
      btn.onclick = () => {
        const t = list.find(x => x.id === btn.dataset.buyTr);
        if (!t) return;
        addToSharedBag(materializeShopTrinket(t));
        toast('В сумку: ' + t.name);
        renderShop();
      };
    });
  }

  function renderShopBag(body) {
    const bag = getSharedBag();
    if (!bag.length) {
      body.innerHTML = '<p class="shop-hint">Общая сумка пуста. Купите сет или аксессуар.</p>';
      return;
    }
    body.innerHTML = `
      <p class="shop-hint">Общая на весь профиль (${bag.length}/${SHARED_BAG_CAP}). Экипировка — в меню персонажа «Шмот».</p>
      <div class="shop-bag-list">${bag.map(it => `
        <div class="shop-bag-row">
          <span class="rarity-${it.rarity}">${it.icon} ${it.name}</span>
          <span class="ilvl-badge">${it.ilvl}</span>
          <span class="shop-bag-meta">${GEAR_SLOT_MAP[it.slot]?.name || it.slot}${it.specId ? ' · ' + it.classId + '/' + it.specId : ''}</span>
          ${it.special ? `<span class="shop-special-inline">${it.special.desc}</span>` : ''}
          <button type="button" class="btn btn-sm btn-danger" data-del="${it.uid}">×</button>
        </div>`).join('')}</div>
      <div style="margin-top:.6rem;text-align:center">
        <button type="button" class="btn btn-sm" id="shop-clear-bag">Очистить сумку</button>
      </div>`;
    body.querySelectorAll('[data-del]').forEach(b => {
      b.onclick = () => {
        removeFromSharedBag(b.dataset.del);
        renderShop();
      };
    });
    body.querySelector('#shop-clear-bag')?.addEventListener('click', () => {
      if (confirm('Очистить общую сумку?')) {
        setSharedBag([]);
        renderShop();
      }
    });
  }

  function initShop() {
    // floating button top-right
    if (!document.getElementById('btn-open-shop')) {
      const b = document.createElement('button');
      b.id = 'btn-open-shop';
      b.type = 'button';
      b.className = 'shop-fab';
      b.innerHTML = '🛒 Магазин <span class="shop-fab-count" id="shop-bag-count">0</span>';
      b.title = 'Магазин тестовых сетов и аксессуаров';
      b.onclick = openShop;
      document.body.appendChild(b);
    }
    document.getElementById('shop-close')?.addEventListener('click', closeShop);
    document.getElementById('shop-modal')?.addEventListener('click', (e) => {
      if (e.target?.id === 'shop-modal') closeShop();
    });
    const c = document.getElementById('shop-bag-count');
    if (c) c.textContent = String(getSharedBag().length);
  }

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initShop);
    } else {
      initShop();
    }
  } catch (e) {
    console.error('[shop]', e);
  }
