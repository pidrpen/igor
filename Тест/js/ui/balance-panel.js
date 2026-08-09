/* ui/balance-panel: patch log + lobby balance UI */
  const BALANCE_BASE = '5.4.8';
  const BALANCE_HISTORY = [
    {
      version: '5.4.8.beta.5',
      date: '2026-08-08',
      title: 'β Бета · шмот nerf · ключ без привала · CD между пачками',
      beta: true,
      changes: [
        {
          classId: 'system',
          className: 'Шмот / баланс',
          text: 'Сильно урезаны статы шмота (ещё ~×2): ATK/DEF/HP-конверсия и бюджет генерации.',
          lines: [
            'HP: очки на вещи × GEAR_HP_MULT (0.10) → в бою в «т», не «сырое +156 = +156т».',
            'Тултипы шмота показывают вклад как в бою (+Nт здоровье/атака).',
            'Вторички в отряде: база + шмот (1 crit = 1 рейтинг); раньше ×10–14.',
            'Тринкеты шопа дополнительно поджаты при выдаче.',
          ],
        },
        {
          classId: 'system',
          className: 'Интерфейс шмота',
          text: 'Меню экипировки: панель «Авто-одеть / Снять всё / Закрыть» закреплена снизу (не уезжает при скролле).',
          lines: [
            'Магазин → Сумка: кнопка «Продать всё из сумки» (пока без золота — очистка общей сумки).',
          ],
        },
        {
          classId: 'system',
          className: 'Ключ / темп',
          text: 'Привалы убраны из маршрута: после пачки сразу следующий бой (развилки/лут/таланты остаются).',
          lines: [
            'Межпулловый бафф «Настрой +15% атаки» и отдых (хил/бафф) отключены.',
            'Кулдауны способностей НЕ сбрасываются при входе в новую пачку (сохраняется curCd и заряды).',
            'Старые сейвы с комнатой «Привал» авто-пропускают её.',
          ],
        },
      ],
    },
    {
      version: '5.4.8.beta.4',
      date: '2026-08-08',
      title: 'β Бета · Магазин · общая сумка · авто-шмот',
      beta: true,
      changes: [
        {
          classId: 'system',
          className: 'Магазин',
          text: 'Кнопка «Магазин» справа сверху: сеты брони/оружия под ключи +2 / +8 / +12 / +15 (танк · хил · дд).',
          lines: [
            'Аксессуары: уникальные на каждый класс+спек (механика спека в описании).',
            'Покупки → общая сумка профиля (localStorage mythicKeySharedBag_v1), не личная на героя.',
            'Меню «Шмот»: надеть из общей сумки; кнопка «Авто-одеть» (роль + приоритет тринкета своего спека).',
            'Снятие экипировки возвращает вещи в общую сумку.',
          ],
        },
      ],
    },
    {
      version: '5.4.8.beta.3',
      date: '2026-08-08',
      title: 'β Бета · TEST_SPECS · полный ребаланс locked',
      beta: true,
      changes: [
        {
          classId: 'system',
          className: 'Тест-ветка',
          text: 'Ранее закрытые спеки разблокированы с пометкой «Тест» (бейдж на карточках класса/спека).',
        },
        {
          classId: 'hunter',
          className: 'Охотник',
          text: 'Полный ребаланс BM / MM / SV (focus flat-киты, testBuild).',
        },
        {
          classId: 'rogue',
          className: 'Разбойник',
          text: 'Полный ребаланс Assa / Combat / Subtlety (energy + combo).',
        },
        {
          classId: 'priest',
          className: 'Жрец',
          text: 'Disc / Holy / Shadow — полные киты хила/DD (atone-lite, orbs data).',
        },
        {
          classId: 'mage',
          className: 'Маг',
          text: 'Arcane / Fire / Frost — paid nuke-киты, школы, free CD-баффы.',
        },
        {
          classId: 'druid',
          className: 'Друид',
          text: 'Balance / Feral / Guardian / Resto — 4 роли, flat + HoT/DoT.',
        },
        {
          classId: 'deathknight',
          className: 'Рыцарь смерти',
          specId: 'frost',
          specName: 'Лёд',
          text: 'Frost testBuild: Obliterate / FS / Howling / Pillar / Soul Reaper…',
        },
        {
          classId: 'shaman',
          className: 'Шаман',
          text: 'Elemental + Enhancement testBuild (Resto — прод. ветка).',
        },
        {
          classId: 'warlock',
          className: 'Чернокнижник',
          text: 'Affliction + Destruction testBuild (Demo — прод.).',
        },
        {
          classId: 'monk',
          className: 'Монах',
          text: 'Mistweaver + Windwalker testBuild (Brew — прод.).',
        },
        {
          classId: 'engineer',
          className: 'Гном-инженер',
          text: 'Новый pack: Mechanist + Sapper testBuild; Tinkerer прод.',
        },
      ],
    },
    {
      version: '5.4.8.beta.2',
      date: '2026-08-08',
      title: 'β Бета · 2D-анимации · тестовая комната',
      beta: true,
      changes: [
        {
          classId: 'paladin',
          className: 'Паладин',
          specId: 'retribution',
          specName: 'Воздаяние',
          text: 'Пиксель-спрайты v02: idle без крыльев (меч как у Гнева), wing_in / wing_out, attack / attack_winged.',
          lines: [
            'Гнев карателя: крылья на buffTurns ходов — съедаются скиллами с ходом (freeAction не тикает).',
            'Тестовая комната: выбор спека → арена vs Злой дух; панель способностей как в бою.',
          ],
        },
        {
          classId: 'system',
          className: 'Интерфейс',
          text: 'Ссылка «Тестовая версия» в основной игре; «← Основная игра» в тесте.',
        },
      ],
    },
    {
      version: '5.4.8.beta.1',
      date: '2026-08-08',
      title: 'β Бета · отдельная папка Тест',
      beta: true,
      changes: [
        {
          classId: 'system',
          className: 'Сборка',
          text: 'Копия игры в папке «Тест» для 2D-спрайтов, магазина и экспериментального баланса без поломки основной ветки.',
        },
      ],
    },
    {
      version: '5.4.8.29',
      date: '2026-08-06',
      title: 'ДК: руны с таймером · Вспышка болезни AoE',
      changes: [
        {
          classId: 'deathknight',
          className: 'Рыцарь смерти',
          text: 'Руны: потраченные не «чёрные», а приглушённый цвет типа; в каждом кружке — ходы до восстановления.',
        },
        {
          classId: 'deathknight',
          className: 'Рыцарь смерти',
          specId: 'unholy',
          specName: 'Нечестивость',
          text: '«Вспышка болезни»: на всех врагов (AoE + DoT), КД 2 → 8.',
        },
        {
          classId: 'warrior',
          className: 'Воин',
          specId: 'arms',
          specName: 'Оружие',
          text: '«Широкий размах» (после Вихря): след. Героический удар дублирует на остальных не только 40% прямого урона, но и 40% кровотечения.',
        },
        {
          classId: 'system',
          className: 'Интерфейс',
          text: 'Описание способности по наведению на иконку работает и когда скилл на КД / недоступен.',
        },
      ],
    },
    {
      version: '5.4.8.28',
      date: '2026-08-06',
      title: 'ДК Кровь: парирование 20%',
      changes: [
        {
          classId: 'deathknight',
          className: 'Рыцарь смерти',
          specId: 'blood',
          specName: 'Кровь',
          text: '«Кровяной клинок»: +15% → +20% шанса парирования (итого 20% у танка Крови).',
        },
      ],
    },
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
    if (sub) {
      const isBeta = !!(BALANCE_HISTORY[0] && BALANCE_HISTORY[0].beta);
      sub.textContent = (isBeta ? 'β бета · ' : 'текущий · ') + 'база ' + BALANCE_BASE;
    }
    if (lobbyBadge) {
      const isBeta = !!(BALANCE_HISTORY[0] && BALANCE_HISTORY[0].beta);
      lobbyBadge.textContent = (isBeta ? 'β ' : 'патч ') + BALANCE_VERSION;
    }

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
      const betaCls = p.beta ? ' beta' : '';
      const betaMark = p.beta ? '<span class="pv-beta">β</span>' : '';
      return `<article class="patch-card${idx === 0 ? ' current' : ''}${betaCls}">
        <div class="patch-head">
          <span class="pv">${p.version}${betaMark}</span>
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

