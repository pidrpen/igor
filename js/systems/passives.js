/* systems/passives: getSpecPassives, passive tray, fury stacks */
  function getSpecPassives(classId, specId, role) {
    const list = [];
    const r = role || (classId && specId && (WOW_MOP.getSpec(classId, specId) || {}).role) || null;
    if (typeof CLASS_AURA === 'object' && classId && classId !== 'hunter') {
      const au = CLASS_AURA[classId];
      if (au && au.tip && (au.atkMod || au.dmgReduce || au.critMod || au.versMod || au.petAtkMod || au.healTakenMod || au.lifesteal)) {
        list.push({
          id: au.id,
          name: au.name,
          icon: au.icon,
          short: 'отряд',
          detail: au.tip + ' Вешается на весь отряд в начале боя. Два одинаковых класса не складывают.',
        });
      }
    }
    if (classId === 'hunter') {
      const hk = (typeof hunterPetKey === 'function') ? hunterPetKey(specId) : 'hunter_pet';
      const names = { hunter_bear: 'Медведь: 20% вампиризма себе, отряду +4% атаки.', hunter_hawk: 'Ястреб: +10% крита питомцу, отряду +5% крита.', hunter_raptor: 'Ящер: +8% унив. питомцу, отряду +5% унив.' };
      list.push({
        id: 'hunter_aspect',
        name: specId === 'marksmanship' ? 'Дух ястреба' : (specId === 'survival' ? 'Дух ящера' : 'Дух зверя'),
        icon: specId === 'marksmanship' ? '🦅' : (specId === 'survival' ? '🦖' : '🐻'),
        short: 'питомец',
        detail: names[hk] || names.hunter_bear,
      });
    }
    // Все ДК: как работают руны
    if (classId === 'deathknight' && specId === 'frost') {
      list.push({
        id: 'frozen_throne',
        name: 'Преданность ледяному трону',
        icon: '❄️',
        short: '3 льда + 3 нечестивости',
        detail: 'Руны: 3 льда и 3 нечестивости, крови нет. Потраченные руны восстанавливаются через 3 хода (тик в начале вашего хода). Сила рун растёт от рунных ударов и пассивно (+5 за ход).',
      });
    } else if (classId === 'deathknight') {
      list.push({
        id: 'rune_cycle',
        name: 'Рунный цикл',
        icon: '🔷',
        short: 'руны 3х',
        detail: 'У вас 6 рун: 2 крови, 2 льда, 2 нечестивости. Потраченные руны восстанавливаются через 3 хода (тик в начале вашего хода). Сила рун растёт от рунных ударов и пассивно (+5 за ход).',
      });
    }
    // R1: «Щит с озона» только у воина Защиты. Стражу свою пассивку ещё не придумали.
    if (classId === 'warrior' && specId === 'protection') {
      list.push({
        id: 'ozone_shield',
        name: 'Щит с озона',
        icon: '🛡️',
        short: '+15% блок',
        detail: 'Повышает шанс блокировать удар на 15%. Заблокированный удар наносит меньше урона.',
        blockChanceAdd: 0.15,
      });
    }
    // Хмелевар
    if (classId === 'monk' && specId === 'brewmaster') {
      list.push({
        id: 'brew_mastery_dodge',
        name: 'Неуловимый боец',
        icon: '💨',
        short: 'уклон',
        detail: 'Искусность повышает шанс уклониться от прямого удара (не по области).',
      });
      list.push({
        id: 'drunk_brawler',
        name: 'Пьяный задира',
        icon: '🍺',
        short: '+6% уклон',
        detail: 'Всегда даёт +6% шанса уклониться от прямого удара.',
        dodgeChanceAdd: 0.06,
      });
      list.push({
        id: 'lucky_again_passive',
        name: 'Ещё повезёт',
        icon: '🍀',
        short: 'стаки',
        detail: 'Каждый пропущенный прямой удар делает следующий уклон вероятнее. После успешного уклонения эффект сбрасывается. Стаки видны на портрете.',
      });
    }
    // Шаман исцеление
    if (classId === 'shaman' && specId === 'restoration') {
      list.push({
        id: 'deep_waters',
        name: 'Глубокие воды',
        icon: '🌊',
        short: 'хил раненых',
        detail: 'Чем сильнее ранен союзник, тем больше отдачи от исцеления. Полная сила — когда у цели не больше 30% здоровья. Искусность усиливает эффект.',
      });
    }
    // Демонология
    if (classId === 'warlock' && specId === 'demonology') {
      list.push({
        id: 'master_demonologist',
        name: 'Мастер-демонолог',
        icon: '😈',
        short: 'урон петов',
        detail: 'Искусность усиливает урон всех питомцев и демонов. Собственные заклинания не затрагиваются.',
      });
    }
    // Механист
    if (classId === 'engineer' && specId === 'mechanist') {
      list.push({
        id: 'bot_share',
        name: 'Делит удар',
        icon: '🤖',
        short: '50% в бота',
        detail: 'Боевой бот принимает 50% урона, который проходит в хозяина. Только удар по самому механисту.',
      });
    }
    // Изобретатель
    if (classId === 'engineer' && specId === 'tinkerer') {
      list.push({
        id: 'walking_scrap',
        name: 'Ходячая жестянка',
        icon: '🗑️',
        short: '+1 деталь / 2х',
        detail: 'Основной питомец каждые 2 хода находит на помойке 1 деталь (если жив и есть место в запасе деталей).',
      });
      list.push({
        id: 'engineering_genius',
        name: 'Гений инженерии',
        icon: '⚙️',
        short: 'прокачка пета',
        detail: 'В конце хода есть шанс «прокачать» основного питомца — он наносит удар с +200% урона (в текущем режиме: одна цель или область). Искусность повышает только шанс срабатывания.',
      });
    }
    // Prot warrior mastery + parry passive
    if (classId === 'warrior' && specId === 'protection') {
      list.push({
        id: 'crit_block_mastery',
        name: 'Критический блок',
        icon: '🧱',
        short: 'шанс блока',
        detail: 'Искусность повышает шанс блокировать удар. Заблокированный удар ослабляется на 35%.',
      });
      list.push({
        id: 'one_left',
        name: 'Одной левой!',
        icon: '✋',
        short: '+7% парир',
        detail: 'Повышает шанс парировать прямой удар на 7%. При парировании срабатывает авто-Реванш.',
        parryChanceAdd: 0.07,
      });
    }
    // Death Knight Blood
    if (classId === 'deathknight' && specId === 'blood') {
      list.push({
        id: 'blood_blade',
        name: 'Кровяной клинок',
        icon: '🩸',
        short: '+20% парирование',
        detail: 'Повышает шанс парировать прямой удар на 20%. При парировании урон не проходит.',
        parryChanceAdd: 0.20,
      });
      list.push({
        id: 'blood_shield_mastery',
        name: 'Кровавый щит',
        icon: '🩸',
        short: 'щит Удара смерти',
        detail: 'Искусность усиливает только щит с Удара смерти: 20% реально возвращённого этим ударом здоровья, плюс доля искусности. Входящий урон искусность не режет.',
      });
    }
    // Death Knight Unholy
    if (classId === 'deathknight' && specId === 'unholy') {
      list.push({
        id: 'dreadblade_mastery',
        name: 'Клинок ужаса',
        icon: '🧟',
        short: 'болезни + пет',
        detail: 'Искусность усиливает периодический урон (болезни) и урон вурдалака и горгульи.',
      });
      list.push({
        id: 'raise_dead_passive',
        name: 'Воскрешение мертвеца',
        icon: '💀',
        short: 'вурдалак',
        detail: 'В начале боя рядом с вами постоянный вурдалак. «Тёмное превращение» усиливает его.',
      });
    }
    // Все паладины: «Добродетель» (возврат ES)
    if (classId === 'paladin') {
      list.push({
        id: 'virtue',
        name: 'Добродетель',
        icon: '🕊️',
        short: 'возврат ES',
        detail: 'При трате Энергии Света каждая потраченная единица может вернуться с шансом 25% (отдельный ролл на каждую). Не выше максимума ES.',
      });
    }
    if (classId === 'paladin' && specId === 'holy') {
      list.push({
        id: 'illuminated_heal',
        name: 'Озарённое исцеление',
        icon: '✨',
        short: 'Выбор света',
        detail: 'Исцеление раненого союзника оставляет на нём «Выбор света» на 2 хода — слабое периодическое лечение. Сила зависит от искусности и объёма хила.',
      });
    }
    if (classId === 'paladin' && specId === 'protection') {
      // Аналог танкового «Щита с озона», но в светлой тематике (+15% блок)
      list.push({
        id: 'holy_shield',
        name: 'Святой щит',
        icon: '✝️',
        short: '+15% блок',
        detail: 'Повышает шанс блокировать удар на 15%. Заблокированный удар наносит меньше урона.',
        blockChanceAdd: 0.15,
      });
      list.push({
        id: 'light_defender',
        name: 'Защитник света',
        icon: '🛡️',
        short: '+10% броня',
        detail: 'Постоянно повышает броню на 10%.',
        armorModAdd: 0.10,
      });
      list.push({
        id: 'divine_bulwark',
        name: 'Божественный оплот',
        icon: '🔰',
        short: 'Щит мстителя',
        detail: 'Искусность усиливает только «Щит мстителя». Остальные способности не затрагиваются.',
      });
    }
    if (classId === 'paladin' && specId === 'retribution') {
      list.push({
        id: 'hand_of_light',
        name: 'Длань Света',
        icon: '☀️',
        short: 'урон Света',
        detail: 'Искусность усиливает урон способностей школы «Свет».',
      });
    }
    if (classId === 'warrior' && specId === 'arms') {
      list.push({
        id: 'bleed_passive',
        name: 'Кровотечение',
        icon: '🩸',
        short: '4 хода',
        detail: '«Удар колосса», «Смертельный удар» и «Героический удар» накладывают «Кровотечение» на цель на 4 хода (периодический урон каждый раунд).',
      });
      list.push({
        id: 'strikes_of_opportunity',
        name: 'Удары возможности',
        icon: '🩸',
        short: 'кровотечения',
        detail: 'Искусность усиливает эффекты кровотечения (в том числе пассивное «Кровотечение»).',
      });
    }
    if (classId === 'warrior' && specId === 'fury') {
      list.push({
        id: 'unshackled_fury',
        name: 'Необузданная ярость',
        icon: '😤',
        short: 'стаки',
        detail: 'Способности с расходом ярости накапливают ярость боя — каждый стак усиливает урон. Способность без расхода ярости сбрасывает стаки. Видно на портрете.',
      });
    }
    try {
      if (typeof igorHeroHonestCleared === 'function' && igorHeroHonestCleared(classId, specId)) {
        list.push({
          id: 'honest_cleared',
          name: 'Честно прокачен',
          icon: '🕯️',
          short: '+10%',
          detail: 'Таверна, ур. 40. +10% к здоровью, атаке, защите, скорости, критическому удару, искусности и универсальности.',
        });
      }
    } catch (_) {}
    return list;
  }
  function getUnitPassives(u) {
    if (!u || u.side !== 'ally' || u.isPet) return [];
    return getSpecPassives(u.classId, u.specId, u.role);
  }
  function passiveBlockChance(u) {
    return getUnitPassives(u).reduce((s, p) => s + (Number(p.blockChanceAdd) || 0), 0);
  }
  function passiveParryChance(u) {
    return getUnitPassives(u).reduce((s, p) => s + (Number(p.parryChanceAdd) || 0), 0);
  }
  function passiveArmorMod(u) {
    if (!u) return 0;
    return getUnitPassives(u).reduce((s, p) => s + (Number(p.armorModAdd) || 0), 0);
  }
  function getUiTipFloat(id, className) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = className + ' hidden';
      el.setAttribute('role', 'tooltip');
      document.body.appendChild(el);
    }
    return el;
  }

  /**
   * Позиция fixed-тултипа.
   * containerEl — опционально: держать подсказку строго внутри этой панели
   * (карман «Пассивные способности»).
   */
  function positionUiTipFloat(tip, anchor, containerEl) {
    const rect = anchor.getBoundingClientRect();
    const pad = 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bounds = containerEl
      ? containerEl.getBoundingClientRect()
      : { left: pad, top: pad, right: vw - pad, bottom: vh - pad, width: vw - pad * 2, height: vh - pad * 2 };

    // Ширина: не шире контейнера / экрана
    const maxW = Math.max(140, Math.min(bounds.width - pad * 2, containerEl ? bounds.width - pad * 2 : Math.min(300, vw * 0.8)));
    tip.style.boxSizing = 'border-box';
    tip.style.maxWidth = Math.round(maxW) + 'px';
    tip.style.width = 'auto';
    tip.style.left = '0px';
    tip.style.top = '0px';
    tip.style.whiteSpace = 'normal';
    tip.style.overflowWrap = 'anywhere';
    tip.style.wordBreak = 'break-word';

    // Переизмерить после maxWidth
    let tw = tip.offsetWidth || Math.min(240, maxW);
    let th = tip.offsetHeight || 70;
    if (tw > maxW) {
      tip.style.width = Math.round(maxW) + 'px';
      tw = tip.offsetWidth || maxW;
      th = tip.offsetHeight || th;
    }

    let left;
    let top;
    if (containerEl) {
      // Внутри кармана: на всю ширину панели, под/над чипом
      left = bounds.left + pad;
      // предпочитаем под чипом
      top = rect.bottom + 4;
      if (top + th > bounds.bottom - pad) {
        top = rect.top - th - 4;
      }
      if (top < bounds.top + pad) top = bounds.top + pad;
      // если всё ещё не влезает по высоте — прижать к верху контейнера
      if (top + th > bounds.bottom - pad) {
        top = Math.max(bounds.top + pad, bounds.bottom - pad - th);
      }
      // горизонталь строго в рамке
      if (left + tw > bounds.right - pad) left = bounds.right - pad - tw;
      if (left < bounds.left + pad) left = bounds.left + pad;
    } else {
      left = rect.right + pad;
      if (left + tw > vw - pad) left = Math.max(pad, rect.left - tw - pad);
      top = rect.top;
      if (top + th > vh - pad) top = Math.max(pad, vh - th - pad);
      if (top < pad) top = pad;
    }

    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
  }

  function getPassiveTipFloat() {
    return getUiTipFloat('passive-tip-float', 'passive-tip-float');
  }

  function hidePassiveTipFloat() {
    const el = document.getElementById('passive-tip-float');
    if (el) el.classList.add('hidden');
    const panel = document.getElementById('passive-pocket-tip');
    if (panel) {
      panel.classList.add('hidden');
      panel.replaceChildren();
    }
    document.querySelectorAll('.passive-chip.active-tip').forEach(c => c.classList.remove('active-tip'));
  }

  /** Описание пассивки в кармане — только нижняя панель, без fixed-окон. */
  function showPassivePocketTip(name, detail) {
    const panel = document.getElementById('passive-pocket-tip');
    if (!panel) return;
    // не трогаем hidePassiveTipFloat (она гасит panel)
    const float = document.getElementById('passive-tip-float');
    if (float) float.classList.add('hidden');
    panel.replaceChildren();
    const n = document.createElement('div');
    n.className = 'pt-name';
    n.textContent = name || 'Пассивка';
    const d = document.createElement('div');
    d.className = 'pt-detail';
    d.textContent = detail || 'Нет описания.';
    panel.appendChild(n);
    panel.appendChild(d);
    panel.classList.remove('hidden');
  }

  function showPassiveTipFloat(chip, name, detail) {
    const pocket = document.getElementById('passive-pocket');
    const inPocket = !!(pocket && !pocket.classList.contains('hidden') && chip && pocket.contains(chip));
    if (inPocket) {
      showPassivePocketTip(name, detail);
      return;
    }
    // Лобби: fixed float
    const tip = getPassiveTipFloat();
    tip.replaceChildren();
    const n = document.createElement('div');
    n.className = 'pt-name';
    n.textContent = name || 'Пассивка';
    const d = document.createElement('div');
    d.className = 'pt-detail';
    d.textContent = detail || '';
    tip.appendChild(n);
    tip.appendChild(d);
    tip.classList.remove('hidden');
    positionUiTipFloat(tip, chip, null);
  }

  function hideAbilityTipFloat() {
    const el = document.getElementById('ability-tip-float');
    if (el) el.classList.add('hidden');
  }

  function showAbilityTipFloat(anchor, name, detail) {
    if (!detail) {
      hideAbilityTipFloat();
      return;
    }
    const tip = getUiTipFloat('ability-tip-float', 'ability-tip-float');
    tip.replaceChildren();
    const n = document.createElement('div');
    n.className = 'pt-name';
    n.textContent = name || 'Способность';
    const d = document.createElement('div');
    d.className = 'pt-detail';
    d.textContent = detail;
    tip.appendChild(n);
    tip.appendChild(d);
    tip.classList.remove('hidden');
    positionUiTipFloat(tip, anchor);
  }

  function bindPassiveChipTips(root) {
    if (!root) return;
    const pocket = document.getElementById('passive-pocket');
    const inPocket = !!(pocket && pocket.contains(root));
    root.querySelectorAll('.passive-chip').forEach(chip => {
      if (chip.dataset.tipBound) return;
      chip.dataset.tipBound = '1';
      const name = chip.dataset.passiveName || chip.querySelector('.p-name')?.textContent || '';
      const detail = chip.dataset.passiveDetail || chip.querySelector('.pt-detail')?.textContent || '';
      const show = () => {
        root.querySelectorAll('.passive-chip.active-tip').forEach(c => c.classList.remove('active-tip'));
        chip.classList.add('active-tip');
        showPassiveTipFloat(chip, name, detail);
      };
      if (inPocket) {
        // В кармане ключа: описание только по нажатию (клик/Enter), не по наведению
        chip.setAttribute('role', 'button');
        chip.setAttribute('aria-pressed', 'false');
        chip.title = 'Нажмите, чтобы открыть описание';
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          const already = chip.classList.contains('active-tip');
          root.querySelectorAll('.passive-chip.active-tip').forEach(c => {
            c.classList.remove('active-tip');
            c.setAttribute('aria-pressed', 'false');
          });
          if (already) {
            const panel = document.getElementById('passive-pocket-tip');
            if (panel) {
              panel.classList.add('hidden');
              panel.replaceChildren();
            }
            return;
          }
          chip.classList.add('active-tip');
          chip.setAttribute('aria-pressed', 'true');
          showPassiveTipFloat(chip, name, detail);
        });
        chip.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            chip.click();
          }
        });
      } else {
        const hide = () => {
          chip.classList.remove('active-tip');
          requestAnimationFrame(() => {
            if (!root.querySelector('.passive-chip:hover, .passive-chip:focus')) hidePassiveTipFloat();
          });
        };
        chip.addEventListener('mouseenter', show);
        chip.addEventListener('mouseleave', hide);
        chip.addEventListener('focus', show);
        chip.addEventListener('blur', hide);
      }
    });
  }

  function renderPassiveTray(actor, trayEl) {
    const tray = trayEl || document.getElementById('passive-tray');
    const pocket = document.getElementById('passive-pocket');
    if (!tray) return;
    const listEl = (!trayEl && document.getElementById('passive-list')) || tray;
    const tipPanel = document.getElementById('passive-pocket-tip');
    // не вызываем hidePassiveTipFloat целиком — сбросит выбор при каждом ходе
    const float = document.getElementById('passive-tip-float');
    if (float) float.classList.add('hidden');

    const passives = actor ? getUnitPassives(actor) : [];
    if (!passives.length) {
      if (listEl) listEl.innerHTML = '';
      if (tipPanel) {
        tipPanel.classList.add('hidden');
        tipPanel.replaceChildren();
      }
      if (pocket && !trayEl) {
        pocket.classList.add('hidden', 'collapsed');
        delete pocket.dataset.userOpened;
      }
      return;
    }
    const chipsHtml = passives.map(p => {
      const name = p.name || 'Пассивка';
      const detail = p.detail || p.short || '';
      const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      return `
      <div class="passive-chip" tabindex="0" data-passive-name="${esc(name)}" data-passive-detail="${esc(detail)}">
        <span class="p-tag">Пассив</span>
        <span class="p-ico">${p.icon || '✨'}</span>
        <span class="p-name">${name}</span>
        <div class="passive-tip" role="tooltip">
          <div class="pt-name">${name}</div>
          <div class="pt-detail">${detail}</div>
        </div>
      </div>`;
    }).join('');
    if (listEl) listEl.innerHTML = chipsHtml;
    // tip-панель не чистим, если уже открыта — только при смене набора
    if (tipPanel && tipPanel.dataset.forActor !== (actor && actor.uid)) {
      tipPanel.classList.add('hidden');
      tipPanel.replaceChildren();
      tipPanel.dataset.forActor = actor && actor.uid ? actor.uid : '';
    }
    if (pocket && !trayEl) {
      pocket.classList.remove('hidden');
      if (pocket.dataset.userOpened !== '1') {
        pocket.classList.add('collapsed');
      }
      bindPassiveChipTips(listEl || tray);
    }
  }

  function hidePassivePocket() {
    const pocket = document.getElementById('passive-pocket');
    const list = document.getElementById('passive-list');
    hidePassiveTipFloat();
    if (list) list.innerHTML = '';
    if (pocket) {
      pocket.classList.add('hidden', 'collapsed');
      delete pocket.dataset.userOpened;
    }
  }

  function bindPassivePocketUI() {
    const pocket = document.getElementById('passive-pocket');
    if (!pocket || pocket.dataset.bound) return;
    pocket.dataset.bound = '1';
    document.getElementById('passive-pocket-toggle')?.addEventListener('click', () => {
      if (pocket.classList.contains('hidden')) return;
      pocket.classList.toggle('collapsed');
      pocket.dataset.userOpened = pocket.classList.contains('collapsed') ? '0' : '1';
      hidePassiveTipFloat();
    });
    // скролл/ресайз — спрятать тултип (позиция устарела)
    window.addEventListener('scroll', () => {
      hidePassiveTipFloat();
      hideAbilityTipFloat();
    }, true);
    window.addEventListener('resize', () => {
      hidePassiveTipFloat();
      hideAbilityTipFloat();
    });
  }

  /** Fury: stack mastery on rage spenders; clear on non-spenders. */
  function applyFuryMasteryStacks(actor, ability) {
    if (!actor || actor.classId !== 'warrior' || actor.specId !== 'fury') return;
    if (actor.res?.primary?.type !== 'rage') return;
    actor.buffs = actor.buffs || [];
    const spendsRage = (Number(ability.cost) || 0) > 0;
    if (spendsRage) {
      const prev = actor.buffs.find(b => b && b.id === 'fury_mastery');
      const stacks = (prev ? (Number(prev.stacks) || 0) : 0) + 1;
      actor.buffs = actor.buffs.filter(b => !b || b.id !== 'fury_mastery');
      const pct = masteryPct(actor);
      applyStatus(actor, {
        id: 'fury_mastery',
        name: 'Необузданная ярость ×' + stacks,
        icon: '😤',
        turns: 99,
        stacks,
        // display only — damage via masteryDmgMult
        tip: '+' + Math.round(pct * stacks * 100) + '% урона',
      });
      floatText(actor.uid, 'ярость ×' + stacks, 'buff');
    } else {
      const kick = typeof isKickAbility === 'function'
        ? isKickAbility(ability)
        : (ability && (ability.type === 'interrupt' || ability.id === 'pummel' || ability.id === 'kick'));
      if (kick) return;
      const had = actor.buffs.some(b => b && b.id === 'fury_mastery');
      if (had) {
        actor.buffs = actor.buffs.filter(b => !b || b.id !== 'fury_mastery');
        floatText(actor.uid, 'стаки сброс', 'buff');
        log(actor.name + ': Необузданная ярость сброшена', 'system');
      }
    }
  }

