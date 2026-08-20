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
        id: 'brew_stagger',
        name: 'Пошатывание',
        icon: '🥴',
        short: '35% в пул',
        detail: 'Около 35% входящего урона уходит в пул «Пошатывание» и тикает по себе (25% пула за раунд). «Очищающий отвар» снимает долю пула в щит «Отвара неуловимости». Под «Отваром железной шкуры» в пул уходит больше (до 75%).',
      });
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
      list.push({
        id: 'brew_gift',
        name: 'Дар хмелевара',
        icon: '🍵',
        short: 'крит-хил → хот',
        detail: 'Когда вас лечат, есть шанс (равный шансу критического удара лечащего) повесить «Дар хмелевара»: 75% этого хила размазываются на 5 раундов. Повторный прок обновляет хот. Это не кнопка — только эффект на портрете.',
      });
    }
    if (classId === 'priest' && specId === 'discipline') {
      list.push({
        id: 'atonement_passive',
        name: 'Искупление',
        icon: '✝️',
        short: 'урон → хил',
        detail: 'Щит, Молитва исцеления и урон Кары / Священного огня / Исповеди во врага / пета оставляют или кормят «Искупление»: доля урона лечит носителей.',
      });
    }
    if (classId === 'monk' && specId === 'mistweaver') {
      list.push({
        id: 'renewing_echo',
        name: 'Носители тумана',
        icon: '✨',
        short: '70% урона в хил',
        detail: 'Союзники с «Заживляющим туманом» получают хил, равный 70% урона, который наносит ткач.',
      });
      list.push({
        id: 'jade_tick',
        name: 'Нефритовая змея',
        icon: '🐍',
        short: 'тик после хода',
        detail: 'Пока жива змея, после хода каждого героя и моба она лечит выбранного «Успокаивающим туманом» на 3т и бьёт последнюю цель хозяина на 3т. Сама змея в очереди не стоит.',
      });
    }
    if (classId === 'druid' && specId === 'balance') {
      list.push({
        id: 'eclipse_passive',
        name: 'Затмение',
        icon: '🌓',
        short: 'полная шкала',
        detail: 'Когда шкала затмения заполняется, вы получаете +20% атаки на 3 хода, шкала сбрасывается.',
      });
    }
    if (classId === 'druid' && specId === 'feral') {
      list.push({
        id: 'combo_curve',
        name: 'Серия приёмов',
        icon: '🃏',
        short: '0.22…1.55',
        detail: 'Финишер ест всю серию. Цифра на кнопке — при 5 очках. Множители: 1 → 0.22, 2 → 0.42, 3 → 0.68, 4 → 1.05, 5 → 1.55. «Дикий рёв» серию не ест.',
      });
    }
    if (classId === 'rogue') {
      list.push({
        id: 'combo_curve',
        name: 'Серия приёмов',
        icon: '🃏',
        short: '0.22…1.55',
        detail: 'Финишер ест всю серию. Цифра на кнопке — при 5 очках. Множители: 1 → 0.22, 2 → 0.42, 3 → 0.68, 4 → 1.05, 5 → 1.55.',
      });
    }
    if (classId === 'mage' && specId === 'fire') {
      list.push({
        id: 'pyro_hot_passive',
        name: 'Раскалённая глыба',
        icon: '☄️',
        short: 'крит шара',
        detail: 'Крит «Огненного шара» вешает «Раскалённую глыбу»: следующая «Огненная глыба» стоит 10 маны и бьёт 90т. «Огненный столб» с 33% вешает «Раскалённый столб» — следующий шар критует.',
      });
    }
    if (classId === 'mage' && specId === 'frost') {
      list.push({
        id: 'lance_aoe_passive',
        name: 'Копьё — область',
        icon: '🗡️',
        short: '20% со стрелы',
        detail: 'С «Ледяной стрелы» 20% шанс повесить «Копьё — область»: следующее «Ледяное копьё» бьёт всех врагов. Окно снимается после копья.',
      });
    }
    // Шаман стихии
    if (classId === 'shaman' && specId === 'elemental') {
      list.push({
        id: 'lava_shock_crit',
        name: 'Выброс по шоку',
        icon: '🌋',
        short: 'крит по шоку',
        detail: 'Пока на цели ваш «Огненный шок», «Выброс лавы» критует без броска.',
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
        detail: '«Удар колосса», «Смертельный удар» и «Героический удар» накладывают «Кровотечение»: 5т за раунд, 4 раунда. Свой экземпляр на каждого наложившего. Наведите на «Кровотечение» в подсказке способности, чтобы прочитать эффект.',
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

    const isAbilityTip = !!(tip && tip.classList.contains('ability-tip-float'));
    const widthCap = isAbilityTip ? Math.min(560, vw * 0.92) : Math.min(300, vw * 0.8);
    // Ширина: не шире контейнера / экрана (у подсказки способности шире — полный abilityDescribe)
    const maxW = Math.max(140, Math.min(bounds.width - pad * 2, containerEl ? bounds.width - pad * 2 : widthCap));
    tip.style.boxSizing = 'border-box';
    tip.style.maxWidth = Math.round(maxW) + 'px';
    tip.style.width = 'auto';
    tip.style.left = '0px';
    tip.style.top = '0px';
    tip.style.whiteSpace = 'normal';
    tip.style.overflowWrap = 'anywhere';
    tip.style.wordBreak = 'break-word';
    if (isAbilityTip) {
      const maxH = Math.max(140, Math.min(vh - pad * 2, Math.round(vh * 0.72)));
      tip.style.maxHeight = Math.round(maxH) + 'px';
      tip.style.overflowX = 'hidden';
      tip.style.overflowY = 'auto';
    }

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

  function bindTipRefs(detailEl, extraEl) {
    if (!detailEl || !extraEl) return;
    detailEl.querySelectorAll('.tip-ref').forEach((sp) => {
      const show = () => {
        extraEl.classList.remove('hidden');
        extraEl.replaceChildren();
        const hn = document.createElement('div');
        hn.className = 'pt-gloss-name';
        hn.textContent = sp.dataset.glossName || '';
        const hd = document.createElement('div');
        hd.textContent = sp.dataset.gloss || '';
        extraEl.appendChild(hn);
        extraEl.appendChild(hd);
      };
      const hide = () => extraEl.classList.add('hidden');
      sp.addEventListener('mouseenter', show);
      sp.addEventListener('mouseleave', hide);
      sp.addEventListener('focus', show);
      sp.addEventListener('blur', hide);
      sp.tabIndex = 0;
    });
  }

  /** «Кавычки» → жёлтая строка; наведение раскрывает словарь эффекта. */
  function fillQuotedText(targetEl, text) {
    if (!targetEl) return;
    targetEl.replaceChildren();
    const src = String(text || '');
    const re = /«([^»]+)»/g;
    let last = 0;
    let m;
    while ((m = re.exec(src))) {
      if (m.index > last) targetEl.appendChild(document.createTextNode(src.slice(last, m.index)));
      const gloss = typeof effectGlossaryText === 'function' ? effectGlossaryText(m[1]) : '';
      if (gloss) {
        const sp = document.createElement('span');
        sp.className = 'tip-ref';
        sp.textContent = '«' + m[1] + '»';
        sp.dataset.gloss = gloss;
        sp.dataset.glossName = m[1];
        targetEl.appendChild(sp);
      } else {
        targetEl.appendChild(document.createTextNode(m[0]));
      }
      last = m.index + m[0].length;
    }
    if (last < src.length) targetEl.appendChild(document.createTextNode(src.slice(last)));
    if (!targetEl.childNodes.length) targetEl.textContent = src;
  }

  function makeGlossBox() {
    const extra = document.createElement('div');
    extra.className = 'pt-gloss hidden';
    extra.setAttribute('aria-live', 'polite');
    return extra;
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
    fillQuotedText(d, detail || 'Нет описания.');
    const extra = makeGlossBox();
    panel.appendChild(n);
    panel.appendChild(d);
    panel.appendChild(extra);
    bindTipRefs(d, extra);
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
    fillQuotedText(d, detail || '');
    const extra = makeGlossBox();
    tip.appendChild(n);
    tip.appendChild(d);
    tip.appendChild(extra);
    bindTipRefs(d, extra);
    tip.classList.remove('hidden');
    positionUiTipFloat(tip, chip, null);
  }

  let abilityTipHideTimer = null;
  function hideAbilityTipFloat() {
    clearTimeout(abilityTipHideTimer);
    abilityTipHideTimer = setTimeout(() => {
      const el = document.getElementById('ability-tip-float');
      if (!el) return;
      if (el.matches(':hover') || el.querySelector(':focus')) return;
      el.classList.add('hidden');
    }, 180);
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
    tip.appendChild(n);
    const d = document.createElement('div');
    d.className = 'pt-detail';
    fillQuotedText(d, detail || '');
    tip.appendChild(d);
    const extra = makeGlossBox();
    tip.appendChild(extra);
    bindTipRefs(d, extra);
    tip.onmouseenter = () => clearTimeout(abilityTipHideTimer);
    tip.onmouseleave = () => hideAbilityTipFloat();
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

  function isClassAuraPassiveId(id) {
    const s = String(id || '');
    return s.indexOf('aura_') === 0 || s === 'hunter_aspect';
  }

  function renderPassiveTray(actor, trayEl) {
    const tray = trayEl || document.getElementById('passive-tray');
    const pocket = document.getElementById('passive-pocket');
    if (!tray) return;
    const listEl = (!trayEl && document.getElementById('passive-list')) || tray;
    const tipPanel = document.getElementById('passive-pocket-tip');
    const float = document.getElementById('passive-tip-float');
    if (float) float.classList.add('hidden');
    if (tipPanel) {
      tipPanel.classList.add('hidden');
      tipPanel.replaceChildren();
    }

    const auras = (typeof listPartyClassAuras === 'function') ? listPartyClassAuras() : [];
    const specPass = (actor ? getUnitPassives(actor) : []).filter(p => !isClassAuraPassiveId(p.id));
    if (!auras.length && !specPass.length) {
      if (listEl) listEl.innerHTML = '';
      if (pocket && !trayEl) {
        pocket.classList.add('hidden', 'collapsed');
        delete pocket.dataset.userOpened;
      }
      return;
    }

    const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const chipHtml = (p, tag) => {
      const from = p.fromName
        ? `<div class="p-from">даёт ${esc(p.className || '')}${p.fromName ? ' · ' + esc(p.fromName) : ''}</div>`
        : '';
      return `<div class="passive-chip${p.fromName ? ' is-aura' : ''}">
        <div class="p-head">
          <span class="p-tag">${esc(tag)}</span>
          <span class="p-ico">${p.icon || ''}</span>
          <span class="p-name">${esc(p.name || 'Бафф')}</span>
        </div>
        ${from}
        <div class="p-detail">${esc(p.detail || p.short || 'Нет описания.')}</div>
      </div>`;
    };

    let html = '';
    if (auras.length) {
      html += '<div class="passive-sec">Баффы отряда</div>';
      html += auras.map(a => chipHtml(a, 'отряд')).join('');
    }
    if (specPass.length) {
      const who = actor ? (actor.fullName || actor.name || 'герой') : '';
      html += '<div class="passive-sec">Пассивки · ' + esc(who) + '</div>';
      html += specPass.map(p => chipHtml(p, 'пассив')).join('');
    }
    if (listEl) listEl.innerHTML = html;
    if (pocket && !trayEl) {
      pocket.classList.remove('hidden');
      if (pocket.dataset.userOpened === '0') pocket.classList.add('collapsed');
      else {
        pocket.classList.remove('collapsed');
        pocket.dataset.userOpened = '1';
      }
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

