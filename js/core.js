/* core: balance panel, FX, art, helpers */
  // ═══════════════════════════════════════════════════
  //  Mythic Key + WoW MoP classes/specs/resources
  // ═══════════════════════════════════════════════════

  if (!window.WOW_MOP) {
    document.body.innerHTML = '<p style="color:#fff;padding:2rem">Не загрузился <b>wow-mop-data.js</b>. Открой папку через локальный сервер или оба файла рядом.</p>';
    throw new Error('WOW_MOP missing');
  }

  const ROLE_LABEL = { tank: 'Танк', healer: 'Целитель', dps: 'Боец' };
  const ROLE_CLASS = { tank: 'role-tank', healer: 'role-healer', dps: 'role-dps' };
  const CLASS_CSS = {
    warrior: 'var(--warrior)', paladin: 'var(--paladin)', hunter: 'var(--hunter)',
    rogue: 'var(--rogue)', priest: 'var(--priest)', deathknight: 'var(--dk)',
    shaman: 'var(--shaman)', mage: 'var(--mage)', warlock: 'var(--warlock)',
    monk: 'var(--monk)', druid: 'var(--druid)', engineer: 'var(--engineer)',
  };
  /** Спек-оверрайд цвета контура (отряд / портрет). Unholy DK — зелёный. */
  const SPEC_ACCENT_CSS = {
    'deathknight:unholy': 'var(--dk-unholy)',
  };
  const ROLE_CSS = { tank: 'var(--tank)', healer: 'var(--heal)', dps: 'var(--dps)' };

  /** Цвет рамки класса (с учётом спека: ДК Нечестивость → зелёный). */
  function classAccentColor(classId, specId) {
    if (classId && specId) {
      const key = classId + ':' + specId;
      if (SPEC_ACCENT_CSS[key]) return SPEC_ACCENT_CSS[key];
    }
    return CLASS_CSS[classId] || 'var(--gold)';
  }

  /** Specs with applied balance patches (Правки_спеков). Others locked in lobby. */
  const PATCHED_SPECS = new Set([
    'warrior:arms', 'warrior:fury', 'warrior:protection',
    'paladin:holy', 'paladin:protection', 'paladin:retribution',
    'deathknight:blood', 'deathknight:unholy',
    'shaman:restoration',
    'warlock:demonology',
    'monk:brewmaster',
    'engineer:tinkerer',
  ]);
  function isSpecPatched(classId, specId) {
    return PATCHED_SPECS.has(classId + ':' + specId);
  }
  function isClassPatched(classId) {
    for (const key of PATCHED_SPECS) {
      if (key.startsWith(classId + ':')) return true;
    }
    return false;
  }
  function classRoleList(cls) {
    const order = ['tank', 'healer', 'dps'];
    const roles = [...new Set((cls.specs || []).map(s => s.role))];
    return order.filter(r => roles.includes(r));
  }
  function roleChipsHtml(roles) {
    return '<div class="roles">' + roles.map(r =>
      `<span class="role-chip ${ROLE_CLASS[r]}">${ROLE_LABEL[r]}</span>`
    ).join('') + '</div>';
  }

  /**
   * История баланса. Версии: 5.4.8 → 5.4.8.01 → 5.4.8.02 …
   * Старт лога — с блокировки классов (5.4.8). Дальше каждый ребаланс = +0.01.
   * Новые правки добавляй В НАЧАЛО массива BALANCE_HISTORY (свежие сверху).
   */
  const BALANCE_BASE = '5.4.8';
  const BALANCE_HISTORY = [
    {
      version: '5.4.8.27',
      date: '2026-08-06',
      title: 'Прото: Блок +1 заряд · Реванш с парира · «Одной левой!»',
      changes: [
        {
          classId: 'warrior',
          className: 'Воин',
          specId: 'protection',
          specName: 'Защита',
          text: '«Блок щитом»: каждый потраченный заряд восстанавливается отдельно (+1 за КД 5), не полным 2/2.',
          lines: [
            'Таймер старта при любом spend, если ещё не тикает; после +1 — следующий тик, пока <2.',
            'Между пачками: charges и curCd сохраняются (откат не сбрасывается в 0).',
          ],
        },
        {
          classId: 'warrior',
          className: 'Воин',
          specId: 'protection',
          specName: 'Защита',
          text: 'Авто-«Реванш» только при парировании (не при блоке). Лог: «Реванш (парир)».',
        },
        {
          classId: 'warrior',
          className: 'Воин',
          specId: 'protection',
          specName: 'Защита',
          text: 'Пассивка «Одной левой!»: +7% шанса парирования (суммируется с базой 5% → 12% без баффов).',
        },
      ],
    },
    {
      version: '5.4.8.26',
      date: '2026-08-06',
      title: 'ДК: Рунный цикл · полоска силы рун',
      changes: [
        {
          classId: 'deathknight',
          className: 'Рыцарь смерти',
          text: 'Пассивка «Рунный цикл»: руны сами восстанавливаются за 2 хода; описание механики.',
          lines: [
            'Полоска под HP — сила рун (💙), не счётчик 6 рун.',
            'Кружки рун остаются; подсветка при наведении на скилл.',
          ],
        },
      ],
    },
    {
      version: '5.4.8.25',
      date: '2026-08-06',
      title: 'Хилы: крит от стата · шаман atk 15',
      changes: [
        {
          classId: 'system',
          className: 'Система',
          text: 'Прямое лечение критует от рейтинга критического удара (×1.5), как урон. АОЕ-хилы — ролл на каждую цель.',
        },
        {
          classId: 'shaman',
          className: 'Шаман',
          specId: 'restoration',
          specName: 'Исцеление',
          text: 'Атака 8→15 (Nт ≈ Nт хила). Волна 30т / Всплеск 24т на flat (не % max HP).',
        },
      ],
    },
    {
      version: '5.4.8.24',
      date: '2026-08-06',
      title: 'Шаман Spirit Link · ДК Кровь: Кровяной клинок',
      changes: [
        {
          classId: 'shaman',
          className: 'Шаман',
          specId: 'restoration',
          specName: 'Исцеление',
          text: '«Тотем духовной связи»: выравнивает % HP отряда после каждого удара по союзнику (не только при касте/DoT).',
          lines: [
            '5 ударов по разным героям → до 5 срабатываний, если есть просадка по %.',
            'Работает через dealDmg и dealTrue, пока висит бафф тотема (3 хода, −10% урон).',
          ],
        },
        {
          classId: 'deathknight',
          className: 'Рыцарь смерти',
          specId: 'blood',
          specName: 'Кровь',
          text: 'Вместо «Щита с озона» — пассивка «Кровяной клинок»: +15% шанса парирования.',
          lines: [
            'Парирование полностью гасит удар (0 урона).',
            'Иск. «Кровавый щит» без изменений.',
          ],
        },
      ],
    },
    {
      version: '5.4.8.23',
      date: '2026-08-06',
      title: 'Рыцарь смерти: Кровь и Нечестивость открыты',
      changes: [
        {
          classId: 'deathknight',
          className: 'Рыцарь смерти',
          text: 'Класс разблокирован. Доступны «Кровь» (танк) и «Нечестивость» (ДД). «Лёд» пока закрыт.',
        },
        {
          classId: 'deathknight',
          className: 'Рыцарь смерти',
          specId: 'blood',
          specName: 'Кровь',
          text: 'Flat-ротация: Удар смерти 24т + вампиризм, Удар в сердце 16т, Вскипание 14т AoE, Лик 26т (40 силы рун).',
          lines: [
            'Костяной щит 40т · СиД 10т+DoT · Кровь вампира +30% HP · Незыблемость −40% · Тёмная власть freeAction.',
            'Атака 15. Старт 20 силы рун. (Пассивка танка — см. 5.4.8.24 «Кровяной клинок».)',
          ],
        },
        {
          classId: 'deathknight',
          className: 'Рыцарь смерти',
          specId: 'unholy',
          specName: 'Нечестивость',
          text: 'Flat-ротация: Удар Плети 22т, Разложение 18т, Лик 28т, Вспышка болезни + DoT, Жнец 36т (≤35%).',
          lines: [
            'Горгулья + СиД · Тёмное превращение усиливает вурдалака · постоянный вурдалак.',
            'Атака 15. Иск. «Клинок ужаса» (болезни + пет).',
          ],
        },
      ],
    },
    {
      version: '5.4.8.22',
      date: '2026-08-06',
      title: 'Щит праведника урон · Изобретатель жестянка',
      changes: [
        {
          classId: 'paladin',
          className: 'Паладин',
          specId: 'protection',
          specName: 'Защита',
          text: '«Щит праведника»: 80т основной цели, 30т остальным + «Щит света» (броня). 3 ES.',
        },
        {
          classId: 'engineer',
          className: 'Гном-инженер',
          specId: 'tinkerer',
          specName: 'Изобретатель',
          text: '«Гаечный воскрешатель»: в карточке «хил за счет питомца» (без ложных 114т).',
          lines: [
            'Пассивка «Ходячая жестянка»: основной питомец +1 деталь каждые 2 раунда (помойка).',
          ],
        },
      ],
    },
    {
      version: '5.4.8.21',
      date: '2026-08-06',
      title: 'Паладин Свет: atk 15 — хилы совпадают с «Nт»',
      changes: [
        {
          classId: 'paladin',
          className: 'Паладин',
          specId: 'holy',
          specName: 'Свет',
          text: 'Атака спека 8→15 (как FLAT_REF): «35т» на скилле ≈ +35т хила в бою, а не ~18т.',
        },
      ],
    },
    {
      version: '5.4.8.20',
      date: '2026-08-06',
      title: 'Паладин Защита: Щит праведника только броня',
      changes: [
        {
          classId: 'paladin',
          className: 'Паладин',
          specId: 'protection',
          specName: 'Защита',
          text: '«Щит праведника»: только «Щит света» (+10% брони / стак, 4 хода, макс. 2). Убран legacy +100% атаки (power=1).',
        },
      ],
    },
    {
      version: '5.4.8.19',
      date: '2026-08-06',
      title: 'Паладин Защита: «Святой щит» вместо «Щита с озона»',
      changes: [
        {
          classId: 'paladin',
          className: 'Паладин',
          specId: 'protection',
          specName: 'Защита',
          text: 'Вместо общего «Щита с озона» — пассивка «Святой щит»: +15% шанса блока (та же сила). Рядом «Защитник света» и «Божественный оплот».',
        },
      ],
    },
    {
      version: '5.4.8.18',
      date: '2026-08-06',
      title: 'Воин: Безрассудство — freeAction · 2 удара',
      changes: [
        {
          classId: 'warrior',
          className: 'Воин',
          specId: 'arms',
          specName: 'Оружие',
          text: '«Безрассудство» не тратит ход; +35% атаки на следующие 2 удара.',
        },
        {
          classId: 'warrior',
          className: 'Воин',
          specId: 'fury',
          specName: 'Неистовство',
          text: '«Безрассудство» не тратит ход; +35% атаки на следующие 2 удара.',
        },
      ],
    },
    {
      version: '5.4.8.17',
      date: '2026-08-06',
      title: 'Воин Оружие: Кровотечение · Вихрь · Широкий размах',
      changes: [
        {
          classId: 'warrior',
          className: 'Воин',
          specId: 'arms',
          specName: 'Оружие',
          text: 'Пассивка «Кровотечение» (4 хода) на Удар колосса / Смертельный удар / Героический удар.',
          lines: [
            'DoT «Кровотечение» 4 раунда; искусность «Удары возможности» усиливает тики.',
            'Вихрь перед Превосходством: КД 9, даёт 1 стак «Широкий размах».',
            'Героический удар под размахом: 40% силы по остальным врагам, стак тратится; иконка подсвечивается.',
          ],
        },
      ],
    },
    {
      version: '5.4.8.16',
      date: '2026-08-06',
      title: 'Паладин: Добродетель всем · синхрон цифр холи/защиты',
      changes: [
        {
          classId: 'paladin',
          className: 'Паладин',
          text: '«Добродетель» работает у всех специализаций (Свет, Защита, Воздаяние).',
          lines: [
            '25% шанс вернуть каждую потраченную ES; не выше капа 5; +ES на портрете.',
          ],
        },
        {
          classId: 'paladin',
          className: 'Паладин',
          specId: 'holy',
          specName: 'Свет',
          text: 'Цифры 5.4.8.14 синхронизированы в wow-mop-data + class-balance.',
          lines: [
            'Свет небес 35т · Вспышка 27т · Сияние 18т · Свет зари 30т · Слово славы 80т (перед зарей).',
          ],
        },
      ],
    },
    {
      version: '5.4.8.15',
      date: '2026-08-06',
      title: 'Паладин: Защитник света · Щит света · Добродетель UI · Мститель',
      changes: [
        {
          classId: 'system',
          className: 'Система',
          text: 'Урон/хил/DoT/HoT: flat и тики масштабируются от атаки (силы) персонажа; power-хилы — от max HP цели.',
        },
        {
          classId: 'paladin',
          className: 'Паладин',
          specId: 'holy',
          specName: 'Свет',
          text: 'Добродетель: +ES анимация у ресурса на портрете.',
        },
        {
          classId: 'paladin',
          className: 'Паладин',
          specId: 'protection',
          specName: 'Защита',
          text: 'Пассивка «Защитник света» +10% брони. Щит праведника → «Щит света» +10%/стак, 4 хода, макс. 2.',
          lines: [
            'Щит мстителя: гарантированный сбитие каста только у кликнутой цели; остальные 23%.',
          ],
        },
      ],
    },
    {
      version: '5.4.8.14',
      date: '2026-08-06',
      title: 'Паладин: хилы СТ/АОЕ · Добродетель · Защита · Молот гнева',
      changes: [
        {
          classId: 'system',
          className: 'Система',
          text: 'Все хилы помечены СТ или АОЕ (тип + оценка в карточке скилла).',
        },
        {
          classId: 'paladin',
          className: 'Паладин',
          specId: 'holy',
          specName: 'Свет',
          text: 'Пассивка «Добродетель»: 25% вернуть каждую потраченную ES (ролл на каждую).',
          lines: [
            'Сияние света 18т · Свет небес 35т · Вспышка света 27т · Свет зари 30т.',
            'Порядок: Слово славы перед Светом зари.',
            'Без «Оглушения» и «Прерывания».',
          ],
        },
        {
          classId: 'paladin',
          className: 'Паладин',
          specId: 'protection',
          specName: 'Защита',
          text: 'Щит мстителя 25т, КД 2, сбивает каст основной + 23% у остальных.',
          lines: [
            'Удар воина Света 18т · Правосудие 15т + 60% по целям под Освящением.',
            'Молот гнева: не тратит ход, ≤35% HP, подсветка целей.',
            'Щит праведника: +70% брони на 2 хода за 3 ES (как было по данным).',
            'Без «Оглушения» и «Прерывания».',
          ],
        },
        {
          classId: 'paladin',
          className: 'Паладин',
          specId: 'retribution',
          specName: 'Воздаяние',
          text: 'Молот гнева: не тратит ход · ≤35% HP · подсветка. Без «Оглушения».',
        },
      ],
    },
    {
      version: '5.4.8.13',
      date: '2026-08-06',
      title: 'Инженер: пар от питомца 1× за атаку (не за цели AoE)',
      changes: [
        {
          classId: 'engineer',
          className: 'Гном-инженер',
          specName: 'все спеки',
          text: 'Пар от питомцев: один раз за действие/ход пета, не за каждую поражённую цель.',
          lines: [
            'Курица, залп, АОЕ-режим «Отладки» и прочий AoE — один ролл 3–7 пара, даже если задеты все враги.',
          ],
        },
      ],
    },
    {
      version: '5.4.8.12',
      date: '2026-08-06',
      title: 'Описания способностей: тултип на иконке, база справа',
      changes: [
        {
          classId: 'system',
          className: 'UI',
          text: 'При наведении на иконку скилла — описание «что делает».',
          lines: [
            'Справа от иконки: имя, ресурс, КД, оценка урона/хила/DoT, метки (не тратит ход и т.п.).',
            'Строка «Тип» внизу карточки без изменений.',
            'То же в превью скиллов при выборе спека в лобби.',
          ],
        },
      ],
    },
    {
      version: '5.4.8.11',
      date: '2026-08-06',
      title: 'Описания пассивок · без «Оглушения» у инженера · портреты в бою',
      changes: [
        {
          classId: 'system',
          className: 'Система',
          text: 'Описания пассивок переписаны: игровой текст без формул «при 120».',
          lines: [
            'Фиксированные числа (например +15% блок, +6% уклон, −35% сила блока, +200% «Гений») сохранены.',
            'Сила искусности в тултипах — «искусность усиливает…», без рейтинга.',
          ],
        },
        {
          classId: 'engineer',
          className: 'Гном-инженер',
          text: 'Убран общий скилл «Оглушение» (party_stun) — только у инженера.',
          lines: [
            'У других ближних классов (воин, паладин, монах, разбойник, рыцарь смерти) оглушение остаётся.',
          ],
        },
        {
          classId: 'system',
          className: 'UI боя',
          text: 'Портреты в бою крупнее; имя на 2 строки (класс + спек).',
          lines: [
            'Формат: «Гном-инженер (Изобретатель)» и аналоги — видно полностью за счёт переноса.',
          ],
        },
      ],
    },
    {
      version: '5.4.8.10',
      date: '2026-08-06',
      title: 'Искусность: шаман / демо / хмелевар / изобретатель + UI пассивок и Recount',
      changes: [
        {
          classId: 'shaman',
          className: 'Шаман',
          specId: 'restoration',
          specName: 'Исцеление',
          text: 'Иск. «Глубокие воды»: прибавка к хилу растёт по потере HP цели.',
          lines: [
            'При 120 рейтинга: до +20% (было +45%).',
            '0 при полном HP → полная сила при ≤30% HP цели (линейно).',
            'Пассивка «Глубокие воды» в кармане пассивок.',
          ],
        },
        {
          classId: 'warlock',
          className: 'Чернокнижник',
          specId: 'demonology',
          specName: 'Демонология',
          text: 'Иск. «Мастер-демонолог»: только урон питомцев/демонов.',
          lines: [
            'При 120: +10% (было +47%).',
            'Все петы/демоны получают бонус; свой урон локера — без иск.',
            'Пассивка «Мастер-демонолог» в кармане.',
          ],
        },
        {
          classId: 'monk',
          className: 'Монах',
          specId: 'brewmaster',
          specName: 'Хмелевар',
          text: 'Иск. «Неуловимый боец» → шанс уклонения (ST); новая связка отваров.',
          lines: [
            'Иск. при 120: +5% уклона от прямого (ST) урона. Не общий DR танка.',
            'Пассивка «Пьяный задира»: +6% уклона.',
            '«Ещё повезёт»: стак за каждый полученный ST-удар; стак = +база (иск.+6%); без капа; сброс при успешном уклоне; видно на портрете.',
            'Старый стек brewDodge после ударов убран.',
            '«Очищающий отвар»: чистит 25% пошатывания (было 50%) → пул для щита.',
            '«Отвар неуловимости»: щит = база 30т + объём очищенного stagger (не +70т за стак).',
          ],
        },
        {
          classId: 'engineer',
          className: 'Гном-инженер',
          specId: 'tinkerer',
          specName: 'Изобретатель',
          text: 'Иск. «Гений инженерии»: шанс усиления пета; новые скиллы.',
          lines: [
            'При 120: 12% шанс (база 0% без рейтинга). Не общий +% урона героя.',
            'В конце хода изобретателя: при успехе основной питомец бьёт с +200% (×3) в режиме СТ/АОЕ.',
            '«Отладка»: 10 пар, не тратит ход, 1×/ход, переключает режим пета СТ↔АОЕ; иконка показывает текущий режим.',
            '«Гаечный воскрешатель»: скилл (−50% max HP пета → +10% max HP цели). Авто-хил убран.',
            'Пассивка «Гений инженерии» в кармане.',
          ],
        },
        {
          classId: 'system',
          className: 'Система',
          text: 'Воскрешение основного питомца + UI.',
          lines: [
            'Скилл «Воскрешение питомца» (15 ресурса) у охотника, чернокнижника, рыцаря смерти и инженера с основным петом — только если питомец мёртв.',
            'Карман «Пассивные способности» слева снизу (не сдвигает скиллы); тултип при наведении.',
            'Recount: клик по строке героя — разбивка по скиллам / источникам (урон, входящий, хил).',
            'Пассивки искусности (воин/паладин/шаман/демо/хмелевар/изобретатель) отображаются в кармане.',
          ],
        },
      ],
    },
    {
      version: '5.4.8.09',
      date: '2026-08-05',
      title: 'Пассивки: «Щит с озона» у танков (+15% блок)',
      changes: [
        {
          classId: 'system',
          className: 'Система',
          text: 'Тест пассивных способностей: чипы над панелью скиллов (наведение — описание).',
        },
        {
          classId: 'system',
          className: 'Танки',
          text: 'Пассивка «Щит с озона»: +15% шанса блокирования удара.',
          lines: [
            'Базовый шанс блока без пассивки: 0%.',
            'С пассивкой: 15% + искусность Защиты воина (если есть) + баффы блока.',
            'Сила блока по-прежнему −35% урона (фикс.).',
          ],
        },
      ],
    },
    {
      version: '5.4.8.08',
      date: '2026-08-05',
      title: 'Урон и хил: всё от статов (без фикс. flat)',
      changes: [
        {
          classId: 'system',
          className: 'Система',
          text: 'Убрана фиксированная шкала «т» без атаки.',
          lines: [
            'Поле flat теперь вес относительно атаки (15 ≈ 100% атаки).',
            'Урон, лечение, щиты, периодический урон/хил — от эффективной атаки (спек + шмот + баффы).',
            'Искусность, крит, универсальность накладываются поверх как раньше.',
          ],
        },
      ],
    },
    {
      version: '5.4.8.07',
      date: '2026-08-05',
      title: 'Паладин: старт боя с 3 Энергии Света',
      changes: [
        {
          classId: 'paladin',
          className: 'Паладин',
          specName: 'все специализации',
          text: 'Все спеки паладина начинают каждый бой с 3 ед. Энергии Света (было 0).',
          lines: [
            'Максимум по-прежнему 5.',
            'Между пуллами ресурс не «половинится» — снова 3 на вход в бой.',
          ],
        },
      ],
    },
    {
      version: '5.4.8.06',
      date: '2026-08-05',
      title: 'Искусность: правки воина и паладина (из таблицы)',
      changes: [
        {
          classId: 'warrior',
          className: 'Воин',
          specId: 'arms',
          specName: 'Оружие',
          text: 'Иск. «Удары возможности»: только кровотечения (периодический урон).',
          lines: [
            'При 120 рейтинга: +70% к урону кровотечений.',
            '% растёт со шмотом (рейтинг), не жёсткий множитель.',
          ],
        },
        {
          classId: 'warrior',
          className: 'Воин',
          specId: 'fury',
          specName: 'Неистовство',
          text: 'Иск. «Необузданная ярость»: стаки без капа.',
          lines: [
            'Навык с расходом ярости → +1 стак (видимый бафф).',
            'При 120: +15% урона за стак.',
            'Навык без расхода ярости → полный сброс стаков.',
          ],
        },
        {
          classId: 'warrior',
          className: 'Воин',
          specId: 'protection',
          specName: 'Защита',
          text: 'Иск. «Критический блок»: шанс блока, не общее снижение входящего.',
          lines: [
            'Базовый шанс блока 15% (не из иск.).',
            'Иск. добавляет шанс (при 120 → +15%).',
            'Сила блока фиксирована −35% урона.',
          ],
        },
        {
          classId: 'paladin',
          className: 'Паладин',
          specId: 'holy',
          specName: 'Свет',
          text: 'Иск. «Озарённое исцеление» → «Выбор света».',
          lines: [
            'Исцеление по цели с неполным здоровьем → период. лечение 2 хода.',
            'Объём период. лечения = % от этого исцеления (при 120 → 15%).',
            'Только цель хила; полное здоровье — не вешается.',
          ],
        },
        {
          classId: 'paladin',
          className: 'Паладин',
          specId: 'protection',
          specName: 'Защита',
          text: 'Иск. только на «Щит мстителя».',
          lines: [
            'При 120 рейтинга: +80% урона «Щит мстителя».',
            'Остальной урон/mitigation без бонуса иск.',
          ],
        },
        {
          classId: 'paladin',
          className: 'Паладин',
          specId: 'retribution',
          specName: 'Воздаяние',
          text: 'Иск. только урон школы «Свет» у Воздаяния.',
          lines: [
            'При 120: +13% к способностям школы «Свет».',
            'Урон не школы «Свет» — без бонуса.',
          ],
        },
        {
          classId: 'system',
          className: 'Система',
          text: 'Таблица искусности: заполнены поля «новый %» и «новая механика».',
          lines: [
            'Специализации без комментария → статус «ожидает комментария».',
            'Остальные без правок → «позже».',
          ],
        },
      ],
    },
    {
      version: '5.4.8.05',
      date: '2026-08-05',
      title: 'Вторички: без очков · крит 18% · унив. 0% · искусность по рейтингу',
      changes: [
        {
          classId: 'system',
          className: 'Система',
          text: 'Убрана система «30 очков» между критом / искусностью / универсальностью. Ползунки в отряде удалены.',
        },
        {
          classId: 'system',
          className: 'Система',
          text: 'Крит по умолчанию: 18% шанс, множитель ×1.5 — одинаково для всех специализаций.',
        },
        {
          classId: 'system',
          className: 'Система',
          text: 'Универсальность по умолчанию: 0% (−входящий / +хил от версы до получения со шмоток).',
        },
        {
          classId: 'system',
          className: 'Система',
          text: 'Искусность: базовый рейтинг 120 у всех. Процент эффекта = (рейтинг/120) × % при 120 рейтинга у спека (у разных спеков разный %).',
          lines: [
            'Шмотки: +0.5% крита / +0.5% унив. / +3 рейтинга иск. за 1 очко стата на вещи.',
            'В отряде: наведение на «Искусность» показывает, что именно бафает механика спека.',
          ],
        },
        {
          classId: 'warrior',
          className: 'Воин',
          specId: 'arms',
          specName: 'Оружие',
          text: 'Иск. «Удары возможности»: +41% к урону по одной цели при 120 рейтинга.',
        },
        {
          classId: 'warrior',
          className: 'Воин',
          specId: 'fury',
          specName: 'Неистовство',
          text: 'Иск. «Необузданная ярость»: +42% ко всему урону при 120 рейтинга.',
        },
        {
          classId: 'warrior',
          className: 'Воин',
          specId: 'protection',
          specName: 'Защита',
          text: 'Иск. «Критический блок»: ~33% mitigation-шкалы при 120 (снижение входящего).',
        },
        {
          classId: 'paladin',
          className: 'Паладин',
          specId: 'holy',
          specName: 'Свет',
          text: 'Иск. «Озарённое исцеление»: +38% к хилу и щитам при 120.',
        },
        {
          classId: 'paladin',
          className: 'Паладин',
          specId: 'protection',
          specName: 'Защита',
          text: 'Иск. «Божественный оплот»: ~35% mitigation при 120.',
        },
        {
          classId: 'paladin',
          className: 'Паладин',
          specId: 'retribution',
          specName: 'Воздаяние',
          text: 'Иск. «Длань Света»: +41% ко всему урону при 120.',
        },
        {
          classId: 'shaman',
          className: 'Шаман',
          specId: 'restoration',
          specName: 'Исцеление',
          text: 'Иск. «Глубокое исцеление»: +45% базы; сильнее на низком здоровье цели.',
        },
        {
          classId: 'warlock',
          className: 'Чернокнижник',
          specId: 'demonology',
          specName: 'Демонология',
          text: 'Иск. «Мастер-демонолог»: +47% к урону питомцев при 120.',
        },
        {
          classId: 'monk',
          className: 'Монах',
          specId: 'brewmaster',
          specName: 'Хмелевар',
          text: 'Иск. «Неуловимый боец»: ~35% mitigation при 120.',
        },
        {
          classId: 'engineer',
          className: 'Гном-инженер',
          specId: 'tinkerer',
          specName: 'Изобретатель',
          text: 'Иск. «Гениальные гаджеты»: +41% ко всему урону при 120.',
        },
      ],
    },
    {
      version: '5.4.8.04',
      date: '2026-08-05',
      title: 'Защита: блок · глухая оборона · ни шагу · без прыжка',
      changes: [
        {
          classId: 'warrior',
          className: 'Воин',
          specId: 'protection',
          specName: 'Защита',
          text: 'Блок щитом: 2 стака на кнопке, откат при <2 до полного 2/2.',
          lines: [
            'Реванш только с парирования (не с блока).',
            'Глухая оборона: КД 12 (было 8).',
            'Ни шагу назад: КД 7 (было 10), теперь тратит ход.',
            'Героический прыжок удалён.',
          ],
        },
      ],
    },
    {
      version: '5.4.8.03',
      date: '2026-08-05',
      title: 'Изобретатель: луч · флюкс · захват',
      changes: [
        {
          classId: 'engineer',
          className: 'Гном-инженер',
          specId: 'tinkerer',
          specName: 'Изобретатель',
          text: 'Гномский луч смерти: без деталей, КД 4, только периодический урон радиации.',
          lines: [
            'Убран дебафф −урона с луча.',
            'Поток флюкса: +2 детали, +5 пара (было +15).',
            'Магнитный захват удалён.',
          ],
        },
      ],
    },
    {
      version: '5.4.8.02',
      date: '2026-08-05',
      title: 'Убрана Удача',
      changes: [
        {
          classId: 'system',
          className: 'Система',
          text: 'Удалён случайный прок «Удача» (10% freeCast).',
          lines: [
            'Способности всегда тратят primary-ресурс.',
          ],
        },
      ],
    },
    {
      version: '5.4.8.01',
      date: '2026-08-05',
      title: 'Ярость танка · пар питомцев инженера',
      changes: [
        {
          classId: 'warrior',
          className: 'Воин',
          specId: 'protection',
          specName: 'Защита',
          text: 'При каждом прямом получении урона (не периодический урон) танк получает +3 ярости.',
        },
        {
          classId: 'engineer',
          className: 'Гном-инженер',
          specName: 'все спеки',
          text: 'Каждый удар любого питомца, нанёсший урон, даёт владельцу 3–7 ед. пара (случайно).',
        },
      ],
    },
    {
      version: '5.4.8',
      date: '2026-08-05',
      title: 'Блокировка классов · открыты только правки',
      changes: [
        {
          classId: 'system',
          className: 'Система',
          specId: null,
          specName: null,
          text: 'Классы и спеки без применённых правок заблокированы в лобби (серые). Отряд без готовых пресетов.',
        },
        {
          classId: 'warrior',
          className: 'Воин',
          specId: null,
          specName: 'Оружие / Неистовство / Защита',
          text: 'Открыты все три спека. Защита: блок, парирование; free Revenge только с парирования.',
        },
        {
          classId: 'paladin',
          className: 'Паладин',
          specId: null,
          specName: 'Свет / Защита / Воздаяние',
          text: 'Открыты все спеки. Пассивный реген маны; броня танка; Divine Storm и прочие правки Ret.',
        },
        {
          classId: 'shaman',
          className: 'Шаман',
          specId: 'restoration',
          specName: 'Исцеление',
          text: 'Открыт Resto: реген маны, пассивное возрождение 1×/ключ, Spirit Link.',
        },
        {
          classId: 'warlock',
          className: 'Чернокнижник',
          specId: 'demonology',
          specName: 'Демонология',
          text: 'Открыта Demo: реген маны, пассивные бесы, Главарь бесов, осколки с петов 65%.',
        },
        {
          classId: 'monk',
          className: 'Монах',
          specId: 'brewmaster',
          specName: 'Хмелевар',
          text: 'Открыт Brew: реген энергии, уклонение, Stagger.',
        },
        {
          classId: 'engineer',
          className: 'Гном-инженер',
          specId: 'tinkerer',
          specName: 'Изобретатель',
          text: 'Открыт Tinkerer: пар/детали, Shock Wrench, Death Ray, воскрешатель, лимит петов.',
        },
        {
          classId: 'system',
          className: 'Система',
          specId: null,
          specName: null,
          text: 'Закрыты до правок: Охотник, Разбойник, Жрец, DK, Маг, Друид (+ незакрытые спеки открытых классов).',
        },
      ],
    },
  ];
  const BALANCE_VERSION = BALANCE_HISTORY[0] ? BALANCE_HISTORY[0].version : BALANCE_BASE;
  let balanceFilterClass = 'all';
  /** 'all' | specId — активен только когда выбран конкретный класс */
  let balanceFilterSpec = 'all';

  function balanceClassLabel(classId) {
    if (!classId || classId === 'system') return 'Система';
    try {
      const c = WOW_MOP && WOW_MOP.getClass ? WOW_MOP.getClass(classId) : null;
      if (c && c.name) return c.name;
    } catch (_) {}
    const map = {
      warrior: 'Воин', paladin: 'Паладин', hunter: 'Охотник', rogue: 'Разбойник',
      priest: 'Жрец', deathknight: 'Рыцарь смерти', shaman: 'Шаман', mage: 'Маг',
      warlock: 'Чернокнижник', monk: 'Монах', druid: 'Друид', engineer: 'Гном-инженер',
    };
    return map[classId] || classId;
  }

  function balanceClassColor(classId, specId) {
    if (!classId || classId === 'system') return 'var(--border-gold)';
    // Unholy DK (и другие spec-accent) — тот же цвет, что рамка портрета
    if (specId && typeof classAccentColor === 'function') {
      return classAccentColor(classId, specId);
    }
    return CLASS_CSS[classId] || 'var(--border-gold)';
  }

  function balanceSpecLabel(classId, specId) {
    if (!specId || specId === 'all') return 'Все спеки';
    try {
      const s = WOW_MOP && WOW_MOP.getSpec ? WOW_MOP.getSpec(classId, specId) : null;
      if (s && s.name) return s.name;
    } catch (_) {}
    return specId;
  }

  /** Синхронизация фильтра баланса с «Сборкой персонажа». */
  function syncBalanceFilterFromPick(classId, specId) {
    if (classId) {
      balanceFilterClass = classId;
      balanceFilterSpec = specId || 'all';
    } else {
      balanceFilterClass = 'all';
      balanceFilterSpec = 'all';
    }
    try { renderBalancePanel(); } catch (_) {}
  }

  function renderBalancePanel() {
    const badge = document.getElementById('balance-ver-badge');
    const sub = document.getElementById('balance-ver-sub');
    const lobbyBadge = document.getElementById('lobby-patch-badge');
    const filterEl = document.getElementById('balance-filter');
    const specFilterEl = document.getElementById('balance-filter-spec');
    const hist = document.getElementById('balance-history');
    if (!hist) return;

    if (badge) badge.textContent = BALANCE_VERSION;
    if (sub) sub.textContent = 'текущий · база ' + BALANCE_BASE;
    if (lobbyBadge) lobbyBadge.textContent = 'патч ' + BALANCE_VERSION;

    // Если класс сброшен — спек тоже
    if (balanceFilterClass === 'all') balanceFilterSpec = 'all';

    // filter chips: all + classes that appear in history
    const classIds = new Set();
    for (const p of BALANCE_HISTORY) {
      for (const ch of (p.changes || [])) {
        if (ch.classId && ch.classId !== 'system') classIds.add(ch.classId);
      }
    }
    const chips = [{ id: 'all', label: 'Все' }];
    for (const id of ['warrior', 'paladin', 'shaman', 'warlock', 'monk', 'engineer', 'hunter', 'rogue', 'priest', 'deathknight', 'mage', 'druid']) {
      if (classIds.has(id)) chips.push({ id, label: balanceClassLabel(id) });
    }
    if (filterEl) {
      filterEl.innerHTML = chips.map(c =>
        `<button type="button" class="bf-btn${balanceFilterClass === c.id ? ' on' : ''}" data-bf="${c.id}">${c.label}</button>`
      ).join('');
      filterEl.querySelectorAll('.bf-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const next = btn.dataset.bf || 'all';
          balanceFilterClass = next;
          // смена класса → сброс спека (или «все спеки»)
          balanceFilterSpec = 'all';
          renderBalancePanel();
        });
      });
    }

    // Второй ряд: специализации выбранного класса
    if (specFilterEl) {
      const clsId = balanceFilterClass;
      const showSpecs = clsId && clsId !== 'all';
      if (!showSpecs) {
        specFilterEl.classList.add('hidden');
        specFilterEl.innerHTML = '';
      } else {
        const specChips = [{ id: 'all', label: 'Все спеки' }];
        const seen = new Set();
        // спеки класса из данных
        try {
          const cls = WOW_MOP && WOW_MOP.getClass ? WOW_MOP.getClass(clsId) : null;
          for (const s of (cls && cls.specs) || []) {
            if (!s || !s.id || seen.has(s.id)) continue;
            seen.add(s.id);
            specChips.push({ id: s.id, label: s.name || s.id });
          }
        } catch (_) {}
        // + спеки, которые есть только в истории
        for (const p of BALANCE_HISTORY) {
          for (const ch of (p.changes || [])) {
            if (ch.classId !== clsId || !ch.specId || seen.has(ch.specId)) continue;
            seen.add(ch.specId);
            specChips.push({ id: ch.specId, label: ch.specName || ch.specId });
          }
        }
        // если выбранный спек пропал из списка — сброс
        if (balanceFilterSpec !== 'all' && !seen.has(balanceFilterSpec)) {
          balanceFilterSpec = 'all';
        }
        specFilterEl.classList.remove('hidden');
        specFilterEl.innerHTML = specChips.map(c =>
          `<button type="button" class="bf-btn bf-spec${balanceFilterSpec === c.id ? ' on' : ''}" data-bs="${c.id}">${c.label}</button>`
        ).join('');
        specFilterEl.querySelectorAll('.bf-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            balanceFilterSpec = btn.dataset.bs || 'all';
            renderBalancePanel();
          });
        });
      }
    }

    const f = balanceFilterClass;
    const fs = balanceFilterSpec;
    hist.innerHTML = BALANCE_HISTORY.map((p, idx) => {
      const changes = (p.changes || []).filter(ch => {
        if (f === 'all') return true;
        if (ch.classId !== f) return false;
        // класс выбран, спек «все» — все записи класса
        if (!fs || fs === 'all') return true;
        // конкретный спек: его правки + классовые без specId (общие)
        if (!ch.specId) return true;
        return ch.specId === fs;
      });
      if (!changes.length) {
        return '';
      }
      const items = changes.map(ch => {
        const cls = balanceClassLabel(ch.classId);
        const sp = ch.specName ? ` <span class="sp">· ${ch.specName}</span>` : '';
        const cc = balanceClassColor(ch.classId, ch.specId);
        const name = ch.className || cls;
        const lines = Array.isArray(ch.lines) && ch.lines.length
          ? `<ul class="ch-lines">${ch.lines.map(t => `<li>${t}</li>`).join('')}</ul>`
          : '';
        return `<li style="--cc:${cc}">
          <span class="cls">${name}</span>${sp}
          <span class="ch-body">${ch.text || ''}</span>
          ${lines}
        </li>`;
      }).join('');
      return `<article class="patch-card${idx === 0 ? ' current' : ''}">
        <div class="patch-head">
          <span class="pv">${p.version}</span>
          <span class="pd">${p.date || ''}</span>
        </div>
        <div class="patch-title">${p.title || ''}</div>
        <ul class="patch-changes">${items}</ul>
      </article>`;
    }).filter(Boolean).join('') || '<div class="balance-empty">Нет записей для фильтра</div>';
  }

  /** Следующий номер патча после текущего (5.4.8 → 5.4.8.01, 5.4.8.01 → 5.4.8.02). */
  function nextBalanceVersion(from) {
    const v = String(from || BALANCE_VERSION || BALANCE_BASE);
    if (v === BALANCE_BASE) return BALANCE_BASE + '.01';
    const m = v.match(/^(5\.4\.8)\.(\d+)$/);
    if (m) {
      const n = parseInt(m[2], 10) + 1;
      return m[1] + '.' + String(n).padStart(2, '0');
    }
    return v + '.01';
  }

  function juiceOk() {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && gameSpeed <= 2;
  }
  function flashScreen(crit) {
    if (!juiceOk()) return;
    const el = document.getElementById('screen-flash');
    if (!el) return;
    el.className = crit ? 'crit on' : 'on';
    setTimeout(() => { el.className = ''; }, 60);
  }
  /** Hero card or pet portrait under owner */
  function unitEl(uid) {
    return document.querySelector(`.unit[data-uid="${uid}"], .pet-port[data-uid="${uid}"]`);
  }
  function pulseUnit(uid, cls) {
    if (!juiceOk()) return;
    const el = unitEl(uid);
    if (!el) return;
    // pet portraits only support hit/active styles
    const useCls = el.classList.contains('pet-port') && cls !== 'hit' ? 'hit' : cls;
    el.classList.remove(useCls);
    void el.offsetWidth;
    el.classList.add(useCls);
    setTimeout(() => el.classList.remove(useCls), 400);
  }

  function unitCenter(uid) {
    const el = unitEl(uid);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, el };
  }

  // ── Skill FX constructor (A) + signature map (B) ──
  const SKILL_FX = {
      // Gnome Engineer — unique jab-style geometric FX per skill
      wrench_bash: { motion: "slash", school: "physical", impact: "hit" },
      rivet_gun: { motion: "pierce", school: "physical", impact: "hit" },
      plasma_cutter: { motion: "beam", school: "arcane", impact: "hit" },
      deploy_turret: { motion: "nova", school: "physical", impact: "splash" },
      overclock: { motion: "orbit", school: "arcane", impact: "hit" },
      emergency_repair: { motion: "swirl", school: "heal", impact: "splash" },
      call_siege_walker: { motion: "slam", school: "physical", impact: "explode" },
      scrap_shot: { motion: "bolt", school: "physical", impact: "hit" },
      shock_wrench: { motion: "slash", school: "arcane", impact: "hit" },
      sticky_bomb: { motion: "arc", school: "fire", impact: "explode" },
      shrapnel_blast: { motion: "nova", school: "fire", impact: "splash" },
      cluster_bomb: { motion: "rain", school: "fire", impact: "explode" },
      deploy_bomb_drone: { motion: "orbit", school: "fire", impact: "splash" },
      rocket_barrage: { motion: "pierce", school: "fire", impact: "explode" },
      remote_charge: { motion: "bolt", school: "fire", impact: "explode" },
      demolish: { motion: "slam", school: "fire", impact: "explode" },
      nitro_boosts: { motion: "swirl", school: "fire", impact: "hit" },
      zap_gun: { motion: "bolt", school: "arcane", impact: "hit" },
      flux_bolt: { motion: "arc", school: "arcane", impact: "splash" },
      death_ray: { motion: "beam", school: "shadow", impact: "drain" },
      rocket_chicken: { motion: "arc", school: "fire", impact: "splash" },
      world_destroyer: { motion: "nova", school: "physical", impact: "explode" },
      shrink_ray: { motion: "beam", school: "arcane", impact: "drain" },
      magnetic_grip: { motion: "orbit", school: "physical", impact: "hit" },
      scrap_swarm: { motion: "swirl", school: "physical", impact: "splash" },

    // Warrior
    mortal_strike: { motion: 'slash', school: 'physical', impact: 'hit' },
    overpower: { motion: 'slash', school: 'physical', impact: 'hit' },
    colossus: { motion: 'slam', school: 'physical', impact: 'explode' },
    execute: { motion: 'slash', school: 'blood', impact: 'explode' },
    whirlwind: { motion: 'swirl', school: 'physical', impact: 'splash' },
    bladestorm: { motion: 'swirl', school: 'physical', impact: 'splash' },
    thunder_clap: { motion: 'nova', school: 'physical', impact: 'splash' },
    shield_slam: { motion: 'slam', school: 'physical', impact: 'hit' },
    revenge: { motion: 'slash', school: 'physical', impact: 'hit' },
    heroic_strike: { motion: 'slash', school: 'physical', impact: 'hit' },
    charge: { motion: 'pierce', school: 'physical', impact: 'hit' },
    pummel: { motion: 'slam', school: 'physical', impact: 'hit' },
    // Paladin
    crusader: { motion: 'slash', school: 'holy', impact: 'hit' },
    templar: { motion: 'slash', school: 'holy', impact: 'explode' },
    judgment: { motion: 'bolt', school: 'holy', impact: 'hit' },
    exorcism: { motion: 'bolt', school: 'holy', impact: 'explode' },
    divine_storm: { motion: 'swirl', school: 'holy', impact: 'splash' },
    holy_shock: { motion: 'bolt', school: 'holy', impact: 'hit' },
    flash_light: { motion: 'beam', school: 'holy', impact: 'hit' },
    holy_light: { motion: 'beam', school: 'holy', impact: 'hit' },
    light_dawn: { motion: 'nova', school: 'holy', impact: 'splash' },
    word_glory: { motion: 'beam', school: 'holy', impact: 'hit' },
    shield_righteous: { motion: 'nova', school: 'holy', impact: 'hit' },
    rebuke: { motion: 'slam', school: 'holy', impact: 'hit' },
    // Hunter
    arcane_shot: { motion: 'bolt', school: 'arcane', impact: 'hit' },
    steady: { motion: 'bolt', school: 'physical', impact: 'hit' },
    aimed: { motion: 'pierce', school: 'physical', impact: 'explode' },
    multi: { motion: 'rain', school: 'physical', impact: 'splash' },
    kill_shot: { motion: 'pierce', school: 'physical', impact: 'explode' },
    kill_cmd: { motion: 'slash', school: 'physical', impact: 'hit' },
    serpent: { motion: 'bolt', school: 'nature', impact: 'hit' },
    black_arrow: { motion: 'bolt', school: 'shadow', impact: 'hit' },
    explosive: { motion: 'bolt', school: 'fire', impact: 'explode' },
    // Rogue
    mutilate: { motion: 'slash', school: 'physical', impact: 'hit' },
    envenom: { motion: 'slash', school: 'nature', impact: 'splash' },
    eviscerate: { motion: 'slash', school: 'physical', impact: 'explode' },
    rupture: { motion: 'slash', school: 'blood', impact: 'hit' },
    garrote: { motion: 'slash', school: 'blood', impact: 'hit' },
    ambush: { motion: 'pierce', school: 'physical', impact: 'explode' },
    sinister: { motion: 'slash', school: 'physical', impact: 'hit' },
    fan_knives: { motion: 'rain', school: 'physical', impact: 'splash' },
    dispatch: { motion: 'slash', school: 'physical', impact: 'explode' },
    kick: { motion: 'slam', school: 'physical', impact: 'hit' },
    // Priest
    smite: { motion: 'bolt', school: 'holy', impact: 'hit' },
    mind_blast: { motion: 'bolt', school: 'shadow', impact: 'hit' },
    mind_spike: { motion: 'bolt', school: 'shadow', impact: 'hit' },
    swp: { motion: 'orbit', school: 'shadow', impact: 'hit' },
    vt: { motion: 'orbit', school: 'shadow', impact: 'drain' },
    devouring: { motion: 'orbit', school: 'shadow', impact: 'drain' },
    mind_flay: { motion: 'beam', school: 'shadow', impact: 'drain' },
    flash_heal: { motion: 'beam', school: 'holy', impact: 'hit' },
    greater_heal: { motion: 'beam', school: 'holy', impact: 'hit' },
    renew: { motion: 'orbit', school: 'holy', impact: 'hit' },
    pw_shield: { motion: 'nova', school: 'holy', impact: 'hit' },
    shield: { motion: 'nova', school: 'holy', impact: 'hit' },
    penance: { motion: 'rain', school: 'holy', impact: 'hit' },
    holy_fire: { motion: 'bolt', school: 'holy', impact: 'explode' },
    // DK
    obliterate: { motion: 'slash', school: 'frost', impact: 'explode' },
    frost_strike: { motion: 'slash', school: 'frost', impact: 'hit' },
    howling: { motion: 'nova', school: 'frost', impact: 'splash' },
    death_coil: { motion: 'bolt', school: 'shadow', impact: 'hit' },
    death_strike: { motion: 'slash', school: 'blood', impact: 'drain' },
    heart: { motion: 'slash', school: 'blood', impact: 'hit' },
    blood_boil: { motion: 'nova', school: 'blood', impact: 'splash' },
    scourge: { motion: 'slash', school: 'shadow', impact: 'hit' },
    festering: { motion: 'slash', school: 'shadow', impact: 'hit' },
    outbreak: { motion: 'bolt', school: 'shadow', impact: 'hit' },
    plague_strike: { motion: 'slash', school: 'shadow', impact: 'hit' },
    mind_freeze: { motion: 'slam', school: 'frost', impact: 'hit' },
    // Shaman
    lightning: { motion: 'chain', school: 'nature', impact: 'hit' },
    chain_light: { motion: 'chain', school: 'nature', impact: 'hit' },
    lava_burst: { motion: 'bolt', school: 'fire', impact: 'explode' },
    flame_shock: { motion: 'bolt', school: 'fire', impact: 'hit' },
    earth_shock: { motion: 'bolt', school: 'nature', impact: 'hit' },
    frost_shock: { motion: 'bolt', school: 'frost', impact: 'hit' },
    lava_lash: { motion: 'slash', school: 'fire', impact: 'explode' },
    stormstrike: { motion: 'slash', school: 'nature', impact: 'hit' },
    healing_wave: { motion: 'beam', school: 'nature', impact: 'hit' },
    riptide: { motion: 'bolt', school: 'nature', impact: 'hit' },
    chain_heal: { motion: 'chain', school: 'nature', impact: 'hit' },
    healing_rain: { motion: 'rain', school: 'nature', impact: 'splash' },
    fire_nova: { motion: 'nova', school: 'fire', impact: 'explode' },
    wind_shear: { motion: 'slash', school: 'nature', impact: 'hit' },
    // Mage
    fireball: { motion: 'bolt', school: 'fire', impact: 'explode' },
    pyroblast: { motion: 'bolt', school: 'fire', impact: 'explode' },
    scorch: { motion: 'bolt', school: 'fire', impact: 'hit' },
    living_bomb: { motion: 'orbit', school: 'fire', impact: 'explode' },
    combust: { motion: 'nova', school: 'fire', impact: 'explode' },
    frostbolt: { motion: 'bolt', school: 'frost', impact: 'hit' },
    ice_lance: { motion: 'pierce', school: 'frost', impact: 'hit' },
    frozen_orb: { motion: 'orbit', school: 'frost', impact: 'splash' },
    blizzard: { motion: 'rain', school: 'frost', impact: 'splash' },
    arcane_blast: { motion: 'bolt', school: 'arcane', impact: 'hit' },
    arcane_missiles: { motion: 'rain', school: 'arcane', impact: 'hit' },
    arcane_barrage: { motion: 'bolt', school: 'arcane', impact: 'explode' },
    arcane_explosion: { motion: 'nova', school: 'arcane', impact: 'splash' },
    counterspell: { motion: 'slam', school: 'arcane', impact: 'hit' },
    // Warlock
    shadow_bolt: { motion: 'bolt', school: 'shadow', impact: 'hit' },
    incinerate: { motion: 'bolt', school: 'fire', impact: 'hit' },
    chaos_bolt: { motion: 'bolt', school: 'fire', impact: 'explode' },
    immolate: { motion: 'orbit', school: 'fire', impact: 'hit' },
    corruption: { motion: 'orbit', school: 'shadow', impact: 'hit' },
    agony: { motion: 'orbit', school: 'shadow', impact: 'drain' },
    ua: { motion: 'orbit', school: 'shadow', impact: 'drain' },
    drain_life: { motion: 'beam', school: 'shadow', impact: 'drain' },
    drain_soul: { motion: 'beam', school: 'shadow', impact: 'drain' },
    hand_guldan: { motion: 'rain', school: 'shadow', impact: 'explode' },
    conflagrate: { motion: 'bolt', school: 'fire', impact: 'explode' },
    rain_fire: { motion: 'rain', school: 'fire', impact: 'splash' },
    soul_fire: { motion: 'bolt', school: 'fire', impact: 'explode' },
    // Monk
    jab: { motion: 'slash', school: 'chi', impact: 'hit' },
    tiger: { motion: 'slash', school: 'chi', impact: 'hit' },
    rsk: { motion: 'slash', school: 'chi', impact: 'explode' },
    fists: { motion: 'swirl', school: 'chi', impact: 'splash' },
    blackout: { motion: 'slash', school: 'chi', impact: 'hit' },
    keg_smash: { motion: 'slam', school: 'physical', impact: 'splash' },
    breath_fire: { motion: 'beam', school: 'fire', impact: 'splash' },
    spinning: { motion: 'swirl', school: 'chi', impact: 'splash' },
    chi_wave: { motion: 'chain', school: 'chi', impact: 'hit' },
    enveloping: { motion: 'orbit', school: 'chi', impact: 'hit' },
    soothing: { motion: 'beam', school: 'chi', impact: 'hit' },
    renewing: { motion: 'orbit', school: 'chi', impact: 'hit' },
    spear_hand: { motion: 'pierce', school: 'chi', impact: 'hit' },
    // Druid
    wrath: { motion: 'bolt', school: 'nature', impact: 'hit' },
    starfire: { motion: 'bolt', school: 'arcane', impact: 'explode' },
    moonfire: { motion: 'orbit', school: 'arcane', impact: 'hit' },
    sunfire: { motion: 'orbit', school: 'nature', impact: 'hit' },
    starsurge: { motion: 'bolt', school: 'arcane', impact: 'explode' },
    hurricane: { motion: 'swirl', school: 'nature', impact: 'splash' },
    rake: { motion: 'slash', school: 'physical', impact: 'hit' },
    shred: { motion: 'slash', school: 'physical', impact: 'hit' },
    rip: { motion: 'slash', school: 'blood', impact: 'hit' },
    ferocious: { motion: 'slash', school: 'physical', impact: 'explode' },
    mangle: { motion: 'slash', school: 'physical', impact: 'hit' },
    thrash: { motion: 'swirl', school: 'physical', impact: 'splash' },
    swipe: { motion: 'arc', school: 'physical', impact: 'splash' },
    maul: { motion: 'slash', school: 'physical', impact: 'hit' },
    reju: { motion: 'orbit', school: 'nature', impact: 'hit' },
    regrowth: { motion: 'beam', school: 'nature', impact: 'hit' },
    healing_touch: { motion: 'beam', school: 'nature', impact: 'hit' },
    wild_growth: { motion: 'nova', school: 'nature', impact: 'splash' },
    lifebloom: { motion: 'orbit', school: 'nature', impact: 'hit' },
  };

  function skillFxStyle(ability) {
    const fx = resolveSkillFx(ability);
    if (fx.school === 'heal' || ability.type === 'heal' || ability.type === 'heal_aoe') return 'heal';
    if (fx.school && fx.school !== 'physical') return fx.school;
    if (ability.type === 'aoe' || ability.type === 'cast_aoe') return 'aoe';
    return fx.school || '';
  }

  function resolveSkillFx(ability, actor) {
    const id = (ability?.id || '').toLowerCase();
    const name = (ability?.name || '').toLowerCase();
    const type = (ability?.type || '').toLowerCase();
    const blob = id + ' ' + name + ' ' + type;

    if (SKILL_FX[id]) {
      return { ...SKILL_FX[id] };
    }

    // School inference
    let school = 'physical';
    if (type === 'heal' || type === 'heal_aoe' || type === 'shield' || /heal|жизн|свет|исцел|омолож|хил|mist|reju|flash|renew|light|свят/.test(blob)) school = 'heal';
    else if (/fire|flame|огн|жар|пир|combust|inciner|pyro|meteor|lava|slag|ember|ash|угол|пепел/.test(blob)) school = 'fire';
    else if (/frost|ice|холод|лед|freeze|blizzard|howling/.test(blob)) school = 'frost';
    else if (/shadow|void|тьм|порч|death|нечист|mind|dark|хаос|разлом|sha|агон|corrupt/.test(blob)) school = 'shadow';
    else if (/nature|природ|leaf|thorn|wild|moon|star|звер|ярос|serpent|riptide|chain|lightning|earth/.test(blob)) school = 'nature';
    else if (/holy|божеств|paladin|crusader|judgment|exorc|smite|penance/.test(blob)) school = 'holy';
    else if (/arcane|тайная|arcane/.test(blob)) school = 'arcane';
    else if (/chi|ци|jab|tiger|fists|brew|mistweaver|windwalker/.test(blob)) school = 'chi';
    else if (/blood|blood|кран|death_strike|heart|blood_boil|execute|rupture|garrote/.test(blob)) school = 'blood';
    else if (actor?.classId === 'mage' && /bolt|blast|barrage/.test(blob)) school = 'arcane';
    else if (actor?.classId === 'warlock') school = 'shadow';
    else if (actor?.classId === 'priest' && actor?.specId === 'shadow') school = 'shadow';
    else if (actor?.classId === 'priest') school = 'holy';
    else if (actor?.classId === 'paladin') school = 'holy';
    else if (actor?.classId === 'shaman') school = 'nature';
    else if (actor?.classId === 'druid' && (actor?.specId === 'balance' || actor?.specId === 'restoration')) school = 'nature';
    else if (actor?.classId === 'monk') school = 'chi';
    else if (actor?.classId === 'engineer') school = /bomb|rocket|demolish|nitro|shrapnel|sticky|cluster|charge/.test(blob) ? 'fire' : 'physical';
    else if (actor?.classId === 'deathknight' && actor?.specId === 'frost') school = 'frost';
    else if (actor?.classId === 'deathknight' && actor?.specId === 'blood') school = 'blood';
    else if (actor?.classId === 'deathknight') school = 'shadow';

    // Motion inference
    let motion = 'bolt';
    if (type === 'heal' || type === 'heal_aoe' || type === 'shield') motion = type === 'heal_aoe' ? 'nova' : 'beam';
    else if (type === 'buff' || type === 'taunt') motion = 'nova';
    else if (type === 'aoe' || type === 'cast_aoe') {
      if (/rain|дожд|blizzard|meteor|storm|вихрь|nova|взрыв/.test(blob)) motion = /rain|дожд|blizzard/.test(blob) ? 'rain' : 'nova';
      else if (/whirl|blade|spin|swirl|вихрь|fan|swipe|thrash/.test(blob)) motion = 'swirl';
      else motion = 'nova';
    } else if (type === 'dot') motion = 'orbit';
    else if (/chain|цепн|прыж/.test(blob)) motion = 'chain';
    else if (/pierce|aimed|lance|stab|ambush|charge|spear|выст|shot/.test(blob) && !/slash|удар/.test(blob)) {
      motion = /shot|выст|aimed|arcane_shot|steady/.test(blob) ? 'bolt' : 'pierce';
    } else if (/slash|удар|strike|blow|cleave|sunder|bash|maul|swipe|kick|revenge|devastate|mutilate|shred|rake|jab|palm|mortal|overpower|slam|rend|execute|heroic|shield_slam|heart|obliterate|scourge|storm|lava_lash|blackout|rsk|tiger|маул|кос|удар/.test(blob)
      || actor?.role === 'tank'
      || (actor && ['warrior','rogue','deathknight'].includes(actor.classId))
      || (actor?.classId === 'monk' && actor?.specId !== 'mistweaver')
      || (actor?.classId === 'druid' && (actor?.specId === 'feral' || actor?.specId === 'guardian'))
      || (actor?.classId === 'paladin' && actor?.specId === 'retribution')
      || (actor?.classId === 'shaman' && actor?.specId === 'enhancement')) {
      if (/slam|bash|colossus|keg|shield_slam|pummel/.test(blob)) motion = 'slam';
      else if (/cleave|swipe|arc/.test(blob)) motion = 'arc';
      else motion = 'slash';
    } else if (/beam|луч|flay|drain|penance/.test(blob)) motion = 'beam';
    else if (/rain|залп|multi|barrage|missiles|hand_guldan/.test(blob)) motion = 'rain';
    else if (/nova|explosion|взрыв|thunder_clap|divine_storm/.test(blob)) motion = 'nova';
    else if (/orbit|orb|bomb|corrupt|agony|ua|immolate|moonfire|sunfire|vt|swp/.test(blob)) motion = 'orbit';
    else motion = 'bolt';

    // Chi / melee polish: prefer jab-style slash over bland bolt for ST damage
    if (school === 'chi' && type === 'damage' && motion === 'bolt') motion = 'slash';
    if (type === 'damage' && motion === 'bolt' && /удар|strike|jab|palm|kick|blow/.test(blob)) motion = 'slash';

    // Impact
    let impact = 'hit';

    if (type === 'heal' || type === 'heal_aoe' || school === 'heal') impact = 'hit';
    else if (/explode|burst|combust|pyro|chaos|meteor|execute|kill_shot|colossus|chaos_bolt/.test(blob)) impact = 'explode';
    else if (/drain|life|vt|devouring|death_strike|agony/.test(blob)) impact = 'drain';
    else if (type === 'aoe' || type === 'cast_aoe' || motion === 'rain' || motion === 'swirl' || motion === 'nova') impact = 'splash';

    // Shape hint
    let shape = 'single';
    if (type === 'aoe' || type === 'cast_aoe' || type === 'heal_aoe' || motion === 'nova' || motion === 'swirl' || motion === 'rain') shape = 'aoe_ring';
    else if (type === 'buff' || type === 'taunt' || type === 'shield') shape = 'self';
    else if (motion === 'beam' || motion === 'chain') shape = 'channel';

    return { motion, school, impact, shape };
  }

  function playSkillAnim(actor, ability, targets) {
    if (!juiceOk() || !actor) return;
    const layer = document.getElementById('skill-fx-layer');
    if (!layer) return;
    const from = unitCenter(actor.uid);
    if (!from) return;
    const list = (targets || []).filter(Boolean);
    const fx = resolveSkillFx(ability, actor);
    const school = fx.school === 'heal' ? 'heal' : (fx.school || '');
    const style = school === 'physical' ? '' : school;
    const type = ability.type || '';

    pulseUnit(actor.uid, 'casting-skill');
    pulseUnit(actor.uid, 'attacking');
    if (school) {
      const el = unitEl(actor.uid);
      if (el) {
        const cls = 'school-flash-' + (school === 'physical' ? 'physical' : school);
        // physical flash uses generic casting
        if (school !== 'physical') {
          el.classList.add(cls);
          setTimeout(() => el.classList.remove(cls), 420);
        }
      }
    }

    const tag = document.createElement('div');
    tag.className = 'skill-name-tag' + (school ? ' school-' + school : '');
    tag.textContent = ability.name || '';
    tag.style.left = from.x + 'px';
    tag.style.top = (from.y - 28) + 'px';
    layer.appendChild(tag);
    setTimeout(() => tag.remove(), 1200);

    const spawnBurst = (x, y, kind, impact) => {
      const b = document.createElement('div');
      let cls = 'skill-burst';
      if (kind) cls += ' ' + kind;
      if (impact && impact !== 'hit') cls += ' impact-' + impact;
      b.className = cls;
      b.style.left = x + 'px';
      b.style.top = y + 'px';
      layer.appendChild(b);
      setTimeout(() => b.remove(), 900);
    };
        const spawnSlash = (x, y) => {
      // jab-style dual geometric cut — no emoji
      const make = (rot, delay) => {
        const s = document.createElement('div');
        s.className = 'skill-slash' + (school && school !== 'physical' ? ' ' + school : '');
        s.style.left = x + 'px';
        s.style.top = y + 'px';
        s.style.setProperty('--slash-rot', rot + 'deg');
        if (delay) s.style.animationDelay = delay + 'ms';
        layer.appendChild(s);
        setTimeout(() => s.remove(), 780 + (delay || 0));
      };
      make(-38, 0);
      make(34, 120);
    };
    const spawnRing = (x, y, ground) => {
      const r = document.createElement('div');
      r.className = 'skill-ring' + (school ? ' ' + school : '') + (ground ? ' ground' : '');
      r.style.left = x + 'px';
      r.style.top = y + 'px';
      layer.appendChild(r);
      setTimeout(() => r.remove(), 1100);
    };
    const spawnBeam = (x1, y1, x2, y2) => {
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      const beam = document.createElement('div');
      beam.className = 'skill-beam' + (school ? ' ' + school : '');
      beam.style.left = x1 + 'px';
      beam.style.top = y1 + 'px';
      beam.style.width = len + 'px';
      beam.style.transform = `rotate(${ang}deg)`;
      layer.appendChild(beam);
      setTimeout(() => beam.remove(), 750);
    };
    const spawnArc = (x, y) => {
      const a = document.createElement('div');
      a.className = 'skill-arc' + (school && school !== 'physical' ? ' ' + school : '');
      a.style.left = x + 'px';
      a.style.top = y + 'px';
      layer.appendChild(a);
      setTimeout(() => a.remove(), 700);
    };
    const spawnSwirl = (x, y) => {
      const s = document.createElement('div');
      s.className = 'skill-swirl' + (school ? ' ' + school : (style ? ' ' + style : ' physical'));
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      layer.appendChild(s);
      setTimeout(() => s.remove(), 1100);
    };
    const spawnRain = (x, y, n) => {
      const count = n || 6;
      for (let i = 0; i < count; i++) {
        const d = document.createElement('div');
        d.className = 'skill-rain-drop' + (school && school !== 'physical' ? ' ' + school : ' fire');
        d.style.left = (x + (Math.random() * 50 - 25)) + 'px';
        d.style.top = (y + (Math.random() * 20 - 30)) + 'px';
        d.style.animationDelay = (i * 0.04) + 's';
        layer.appendChild(d);
        setTimeout(() => d.remove(), 1000);
      }
    };
    const spawnOrbit = (x, y) => {
      for (let i = 0; i < 3; i++) {
        const o = document.createElement('div');
        o.className = 'skill-orbit' + (school && school !== 'physical' ? ' ' + school : ' shadow');
        o.style.left = x + 'px';
        o.style.top = y + 'px';
        o.style.animationDelay = (i * 0.06) + 's';
        layer.appendChild(o);
        setTimeout(() => o.remove(), 1000);
      }
    };
    const spawnPierce = (x1, y1, x2, y2) => {
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      const p = document.createElement('div');
      p.className = 'skill-pierce' + (school ? ' ' + school : ' physical');
      p.style.left = x1 + 'px';
      p.style.top = y1 + 'px';
      p.style.width = len + 'px';
      p.style.transform = `rotate(${ang}deg)`;
      layer.appendChild(p);
      setTimeout(() => p.remove(), 650);
    };
    const spawnProjectile = (to, onHit) => {
      const proj = document.createElement('div');
      proj.className = 'skill-projectile' + (school ? ' school-' + school : '');
      // pure CSS orb — no emoji
      proj.style.left = from.x + 'px';
      proj.style.top = from.y + 'px';
      const dx = to.x - from.x, dy = to.y - from.y;
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      proj.style.setProperty('--ang', ang + 'deg');
      layer.appendChild(proj);
      // trail: jab-style geometric line along flight path
      const trail = document.createElement('div');
      trail.className = 'skill-slash' + (school && school !== 'physical' ? ' ' + school : '');
      trail.style.left = from.x + 'px';
      trail.style.top = from.y + 'px';
      trail.style.setProperty('--slash-rot', ang + 'deg');
      trail.style.opacity = '0.7';
      layer.appendChild(trail);
      setTimeout(() => trail.remove(), 780);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dur = clamp(dist / 520, 0.42, 0.85); // slower flight
      proj.animate([
        { transform: 'translate(-50%, -50%) scale(.45)', opacity: 0.15 },
        { transform: `translate(calc(-50% + ${dx * 0.45}px), calc(-50% + ${dy * 0.45}px)) scale(1.2)`, opacity: 1, offset: 0.5 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.85)`, opacity: 1 },
      ], { duration: dur * 1000, easing: 'cubic-bezier(.18,.75,.22,1)', fill: 'forwards' });
      setTimeout(() => {
        if (onHit) onHit();
        proj.remove();
      }, dur * 1000);
    };
    const hitPulse = (t) => {
      if (type === 'heal' || type === 'heal_aoe' || type === 'shield' || school === 'heal') pulseUnit(t.uid, type === 'shield' ? 'shielded' : 'healed');
      else pulseUnit(t.uid, 'hit');
    };

    // Self / buff / shield no-target
    // Summon deploy: jab-style dual slash + ring (machine deploy flash)
    if (type === 'summon') {
      spawnSlash(from.x, from.y);
      spawnRing(from.x, from.y, true);
      spawnBurst(from.x, from.y, style || 'physical', fx.impact || 'splash');
      if (list.length) {
        list.forEach((tgt, i) => setTimeout(() => {
          const p = rectCenter(tgt);
          spawnOrbit(p.x, p.y);
          spawnBurst(p.x, p.y, style || 'physical', 'splash');
        }, 120 + i * 90));
      }
      return;
    }

    if (type === 'buff' || type === 'taunt' || (type === 'shield' && !list.length) || fx.motion === 'nova' && !list.length) {
      spawnRing(from.x, from.y, fx.motion === 'nova');
      spawnBurst(from.x, from.y, style || (type === 'shield' ? 'heal' : ''), fx.impact);
      if (type === 'shield') pulseUnit(actor.uid, 'shielded');
      if (type === 'taunt' || type === 'aoe' || type === 'cast_aoe') {
        list.forEach((t, i) => setTimeout(() => {
          const to = unitCenter(t.uid);
          if (!to) return;
          spawnBurst(to.x, to.y, style || 'aoe', fx.impact);
          hitPulse(t);
        }, 100 + i * 90));
      }
      return;
    }

    // AoE family
    if (type === 'aoe' || type === 'heal_aoe' || type === 'cast_aoe' || fx.motion === 'swirl' || fx.motion === 'rain' || (fx.motion === 'nova' && list.length > 1)) {
      if (fx.motion === 'swirl') spawnSwirl(from.x, from.y);
      else if (fx.motion === 'rain') {
        list.forEach((t, i) => setTimeout(() => {
          const to = unitCenter(t.uid) || from;
          spawnRain(to.x, to.y, 5);
        }, i * 70));
      } else {
        spawnRing(from.x, from.y, true);
      }
      list.forEach((t, i) => {
        setTimeout(() => {
          const to = unitCenter(t.uid);
          if (!to) return;
          if (fx.motion === 'swirl') spawnSwirl(to.x, to.y);
          spawnBurst(to.x, to.y, style || (type === 'heal_aoe' ? 'heal' : 'aoe'), fx.impact);
          hitPulse(t);
        }, 120 + i * 90);
      });
      return;
    }

    // Per-target
    list.forEach((t, i) => {
      const to = unitCenter(t.uid);
      if (!to) return;
      const delay = i * 90;
      setTimeout(() => {
        const motion = fx.motion;
        if (motion === 'beam' || type === 'heal' || type === 'shield') {
          spawnBeam(from.x, from.y, to.x, to.y);
          spawnBurst(to.x, to.y, style || 'heal', fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'chain') {
          // hop: caster → target (visual only; multi-target handled by successive list entries)
          spawnBeam(from.x, from.y, to.x, to.y);
          spawnBurst(to.x, to.y, style || 'nature', fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'slash' || motion === 'slam') {
          spawnSlash(to.x, to.y);
          if (motion === 'slam') spawnRing(to.x, to.y, true);
          spawnBurst(to.x, to.y, style, fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'arc') {
          spawnArc(to.x, to.y);
          spawnBurst(to.x, to.y, style, fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'pierce') {
          spawnPierce(from.x, from.y, to.x, to.y);
          spawnBurst(to.x, to.y, style, fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'orbit') {
          spawnOrbit(to.x, to.y);
          spawnBurst(to.x, to.y, style || 'shadow', fx.impact);
          if (type === 'dot') spawnRing(to.x, to.y);
          hitPulse(t);
          return;
        }
        if (motion === 'nova') {
          spawnRing(to.x, to.y, true);
          spawnBurst(to.x, to.y, style || 'aoe', fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'rain') {
          spawnRain(to.x, to.y, 6);
          spawnBurst(to.x, to.y, style, fx.impact);
          hitPulse(t);
          return;
        }
        if (motion === 'swirl') {
          spawnSwirl(to.x, to.y);
          spawnBurst(to.x, to.y, style, fx.impact);
          hitPulse(t);
          return;
        }
        // bolt default
        spawnProjectile(to, () => {
          spawnBurst(to.x, to.y, style || (type === 'dot' ? 'shadow' : ''), fx.impact);
          if (type === 'dot') spawnRing(to.x, to.y);
          hitPulse(t);
        });
      }, delay);
    });

    // no targets: self burst
    if (!list.length) {
      spawnBurst(from.x, from.y, style, fx.impact);
    }
  }

  function showTurnBanner(text) {
    const el = document.getElementById('turn-banner');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 900);
  }
  function updateVignette() {
    const el = document.getElementById('vignette');
    if (!el || !run) return;
    const allies = run.party.filter(p => p.alive);
    const low = allies.some(p => p.hp / p.maxHp < 0.3);
    el.classList.toggle('on', low && allies.length > 0);
  }
  function updateBossFrame() {
    const frame = document.getElementById('boss-frame');
    if (!frame || !combat) { if (frame) frame.classList.remove('show'); return; }
    const boss = combat.enemies.find(e => e.isBoss && e.alive);
    if (!boss) { frame.classList.remove('show'); return; }
    frame.classList.add('show');
    document.getElementById('boss-name').textContent = boss.icon + ' ' + boss.name;
    const pct = clamp(boss.hp / boss.maxHp * 100, 0, 100);
    document.getElementById('boss-hp-fill').style.width = pct + '%';
    document.getElementById('boss-hp-text').textContent = fmt(boss.hp) + ' / ' + fmt(boss.maxHp);
    const ph = document.getElementById('boss-phases');
    if (boss.phases) {
      ph.innerHTML = boss.phases.map((_, i) =>
        `<span class="${i <= (boss.phaseIndex || 0) ? 'on' : ''}"></span>`).join('');
    } else ph.innerHTML = '';
  }
  // Portraits + battle backgrounds only (ability icons stay emoji).
  // Base is always the game root `assets/` folder (resolved from this script URL),
  // so paths stay correct even if the page is opened from a subpath or CSS lives in css/.
  const ASSETS = {
    base: (function () {
      try {
        const el = document.querySelector('script[src*="js/core.js"]');
        if (el && el.src) return new URL('../assets/', el.src).href;
      } catch (_) { /* ignore */ }
      try { return new URL('assets/', document.baseURI || location.href).href; } catch (_) { /* ignore */ }
      return 'assets/';
    })(),
    classP(id) { return this.base + 'portraits/classes/' + id + '.png'; },
    specP(classId, specId) { return this.base + 'portraits/specs/' + classId + '_' + specId + '.png'; },
    enemyP(id) { return this.base + 'portraits/enemies/' + id + '.png'; },
    petP(id) { return this.base + 'portraits/pets/' + id + '.png'; },
    /** Per-room battle backdrop: assets/backgrounds/{theme}/{loc}.png → fallback theme.png */
    bg(theme, loc) {
      const t = theme || 'crypt';
      if (loc) return this.base + 'backgrounds/' + t + '/' + loc + '.png';
      return this.base + 'backgrounds/' + t + '.png';
    },
  };
  /**
   * Route node → location art key (progression through the dungeon).
   * Files live in assets/backgrounds/{crypt|forge|tide|jade|rift|ember}/{key}.png
   */
  const NODE_LOC = {
    // Progressive dungeon walk: each major stop gets a distinct room art.
    // Only rest1/rest2 share the same safe-camp look on purpose.
    start: 'entrance',
    fork1a: 'corridor',
    fork1b: 'elite',
    rest1: 'rest',
    mid: 'mid',
    fork2a: 'gallery',
    fork2b: 'depths',
    rest2: 'rest',
    final: 'throne',
    mop1: 'mopup',
    mop2: 'depths',
    mop3: 'gallery',
    risk: 'elite',
    side1: 'corridor',
  };
  /** Fallback by room type if node id unknown */
  const TYPE_LOC = {
    trash: 'corridor', elite: 'elite', boss: 'mid', final: 'throne', rest: 'rest',
  };
  function artHtml(src, emoji, extraClass, extraStyle) {
    const em = emoji || '✨';
    const st = extraStyle ? ` style="${extraStyle}"` : '';
    return `<span class="art-wrap ${extraClass || ''}"${st}>` +
      `<img class="art-img" src="${src}" alt="" loading="lazy" onerror="this.parentNode.classList.add('no-art')"/>` +
      `<span class="art-emoji">${em}</span></span>`;
  }
  function portraitSrc(u) {
    if (!u) return null;
    if (u.isPet) return ASSETS.petP(u.petKey || 'imp');
    if (u.side === 'enemy') return ASSETS.enemyP(u.heroId || u.id || 'z');
    // Prefer class+spec art in combat; fall back to class
    if (u.classId && u.specId) return ASSETS.specP(u.classId, u.specId);
    if (u.classId) return ASSETS.classP(u.classId);
    return null;
  }
  function applyDungeonTheme(theme) {
    const themes = ['theme-crypt', 'theme-forge', 'theme-tide', 'theme-jade', 'theme-rift', 'theme-ember'];
    const t = theme !== undefined ? theme : (run?.dungeon?.theme || null);
    document.body.classList.remove(...themes);
    const ba = document.getElementById('battle-area');
    if (ba) {
      ba.classList.remove(...themes);
      if (!t) ba.style.removeProperty('--battle-bg');
    }
    if (t) {
      document.body.classList.add('theme-' + t);
      if (ba) ba.classList.add('theme-' + t);
    }
  }
  /** Switch battle backdrop to match current route node (dungeon progression). */
  function applyRoomBackground(nodeOrId) {
    const theme = run?.dungeon?.theme || 'crypt';
    const node = typeof nodeOrId === 'string'
      ? (run?.route?.nodes?.[nodeOrId] || null)
      : (nodeOrId || currentRouteNode());
    const id = node?.id || (typeof nodeOrId === 'string' ? nodeOrId : null);
    const loc = (id && NODE_LOC[id])
      || (node && TYPE_LOC[node.type])
      || 'entrance';
    applyDungeonTheme(theme);
    const ba = document.getElementById('battle-area');
    if (!ba) return;

    // Каждый ключ — только свои тематические фоны; комнаты отличаются по loc
    const artTheme = theme;
    const url = ASSETS.bg(artTheme, loc);
    // Не мигаем: если URL уже тот же — не трогаем
    // Quote URL for CSS (absolute file/http URLs may contain spaces / Cyrillic)
    const toCssUrl = (u) => `url(${JSON.stringify(String(u))})`;
    if (ba.dataset.bgUrl === url) return;
    ba.dataset.bgUrl = url;

    const img = new Image();
    img.onload = () => { ba.style.setProperty('--battle-bg', toCssUrl(url)); };
    img.onerror = () => {
      const fallback = ASSETS.bg(artTheme);
      ba.dataset.bgUrl = fallback;
      ba.style.setProperty('--battle-bg', toCssUrl(fallback));
    };
    img.src = url;
  }
  function spawnConfetti() {
    if (!juiceOk()) return;
    for (let i = 0; i < 28; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = ['#e0c060', '#c77dff', '#3dd68c', '#4da3ff', '#ff6b6b'][i % 5];
      p.style.animationDelay = (Math.random() * 0.5) + 's';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 2800);
    }
  }
  function refreshKeystone() {
    const lvl = document.getElementById('key-level')?.value || '5';
    const dun = DUNGEONS.find(d => d.id === document.getElementById('dungeon-select')?.value);
    const el = document.getElementById('ks-level');
    const nm = document.getElementById('ks-name');
    if (el) el.textContent = '+' + lvl;
    if (nm) nm.textContent = dun ? dun.name : '—';
  }
