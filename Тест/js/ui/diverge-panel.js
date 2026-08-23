/* ui/diverge-panel: Тест vs основа — дом факта «залито ли»
 *
 * Карточка лобби «Расхождение с основой».
 * После перелива названной механики: сменить poured у этой строки.
 *   no   — только Тест
 *   part — каркас на основе есть, Тест впереди
 *   yes  — на основе то же
 * Не дублировать SESSION и жёлтое.
 */
  const DIVERGE_STATUS = {
    no:   { label: 'не залито',  order: 0 },
    part: { label: 'частично',   order: 1 },
    yes:  { label: 'залито',     order: 2 },
  };

  const DIVERGE_LOG = [
    {
      id: 'raid-focus-pick',
      name: 'Кого играешь (ключ и рейд)',
      poured: 'no',
      testVer: '5.4.9.35В',
      text: 'Ключ 5 и рейд 10: один выбор, кто ходит (спек слева / слот / «Собрать рейд»). Таверна не перехватывает. Авто — partyAiAct в обоих. На основе ещё старый выбор, рейд отдельно сажал на танка.',
    },
    {
      id: 'jade-echo',
      name: 'Копия союзника в монастыре',
      poured: 'yes',
      pourVer: '5.4.9.33',
      testVer: '5.4.9.31В',
      text: 'После Смятения в ряду союзников копия героя. Лечение кормит врага. Удар снимает карту. Уехало 5.4.9.33.',
    },
    {
      id: 'pack-mix',
      name: 'Разные паки по комнатам',
      poured: 'yes',
      pourVer: '5.4.9.33',
      testVer: '5.4.9.30В',
      text: 'Коридор и развилка после мида — не те же враги, что на вратах. Уехало 5.4.9.33.',
    },
    {
      id: 'raid-loot',
      name: 'Лут и таймер рейда',
      poured: 'yes',
      pourVer: '5.4.9.33',
      testVer: '5.4.9.29В',
      text: 'После победы — 1 из 3 аксессуаров Лэй Шэня. Кнопка в ключе и в рейде, без хода, раз за бой. Копия в общую сумку. Обычный: щит 20% max HP / −40% входящего 2 хода / +20% атаки 2 хода. Героический: 30% / −50% / +30%. Таймер 15:00 / 10:00. Уехало 5.4.9.33.',
    },
    {
      id: 'field',
      name: 'Поле боя',
      poured: 'no',
      testVer: '5.4.9.10В',
      text: 'С 5.4.9.10В в ключе и рейде выключено: шаг влево/вправо, линии, давка, раскол на одном экране. Пользователь имел в виду раскол пачек на разные экраны — это в бэклоге, не код. На основе поля не было.',
    },
    {
      id: 'shop',
      name: 'Магазин',
      poured: 'no',
      testVer: '5.4.8.34',
      text: 'Кнопка магазина, сеты под ключ, аксессуары по спекам, общая сумка профиля. На основе магазина нет.',
    },
    {
      id: 'test-room',
      name: 'Тестовая комната и спрайты',
      poured: 'no',
      testVer: '5.4.9.27В',
      text: 'Хаб: тест анимаций, рисовка, тушь, арена спрайтов. С 5.4.9.27В кнопки роликов школ (снаряд, удар, область, щит, кик, смерть) теми же CSS-формами, что в бою. Phaser-арена — отдельная страница. На основе комнаты и спрайтов нет.',
    },
    {
      id: 'hero-nick',
      name: 'Ник таверны в бою',
      poured: 'yes',
      pourVer: '5.4.9.27',
      testVer: '5.4.9.27В',
      text: 'Ник в сейве igorHero_v1. Лобби, инст, ключ и рейд: «Ник (класс · спек)». Уехало 5.4.9.27.',
    },
    {
      id: 'place-tele',
      name: 'Имя комнаты и телеграф',
      poured: 'yes',
      pourVer: '5.4.9.27',
      testVer: '5.4.9.27В',
      text: 'Над боем имя данжа и комнаты. Крупный баннер каста. На карте маршрута «ты здесь». Уехало 5.4.9.27.',
    },
    {
      id: 'cheat',
      name: 'Читер',
      poured: 'no',
      testVer: '5.4.8.38',
      text: 'Кнопки 10–80% max HP цели, ход не тратят. Инженер уже на основе, читер — нет.',
    },
    {
      id: 'leveling',
      name: 'Прокачка и таверна',
      poured: 'part',
      pourVer: '5.4.9.17',
      testVer: '5.4.9.27В',
      text: 'Сейв igorHero_v1, в том числе шмот героя. Экспорт/импорт тащит таверну с вещами. С 5.4.9.23. Ник в бою уехал 5.4.9.27. На Тесте с 5.4.9.18В ещё «Уровень +1» и несколько героев. Папка прокачка/ у корня — отдельная песочница.',
    },
    {
      id: 'hero-party',
      name: 'Отряд от героя таверны',
      poured: 'yes',
      pourVer: '5.4.9.17',
      testVer: '5.4.9.17В',
      text: 'Галка в лобби: слот 1 — герой таверны, слоты 2–5 выбираешь. Уехало 5.4.9.17.',
    },
    {
      id: 'party-ai',
      name: 'ИИ союзников',
      poured: 'yes',
      pourVer: '5.4.9.25',
      testVer: '5.4.9.25В',
      text: 'Ротации всех 37 спеков. С 5.4.9.25 ключ и рейд только partyAiAct, без запасного набора в raidAllyAi. Кик, столбы, около 12% ошибка. В ключе ИИ бьёт шёпот касания, семя и осколок инверсии раньше тела босса. Уехало 5.4.9.25.',
    },
    {
      id: 'skill-fx',
      name: 'Анимации способностей',
      poured: 'yes',
      pourVer: '5.4.9.23',
      testVer: '5.4.9.24В',
      text: 'Таблицы роликов js/ui/skill-fx-*.js (школа / полёт / удар) и рисованные снаряды по школе. Эмодзи в полёте нет. Уехало 5.4.9.23. Картинки кнопок сняты 5.4.9.24.',
    },
    {
      id: 'gear-draft',
      name: 'Драфт шмота ключа',
      poured: 'yes',
      pourVer: '5.4.9.15',
      testVer: '5.4.9.15В',
      text: 'После элиты / стража / финала всегда выбор 1 из 3 вещей. Треш без шмота. Крит / универсальность / искусность на живой рейтинг. Сверху 10% сила ключа, не вместо вещи. Рейд после Лэй Шэня — 1 из 3 аксессуаров. Уехало 5.4.9.15, лут рейда 5.4.9.33.',
    },
    {
      id: 'raid-floor',
      name: 'Пол HP и очередь фаз рейда',
      poured: 'yes',
      pourVer: '5.4.9.17',
      testVer: '5.4.9.17В',
      text: 'Большой удар не открывает две сцены сразу. Пол HP: 75 / 70 / 50 / 40 / 15 / 5% — даже читер 80% не пробивает ниже текущей фазы. 75% провал (босс скрыт с ряда). 50% два союзных столба. Катакомбы с 50% сами не стартуют. Уехало 5.4.9.17: raid.js, damage.js, abilities.js, enemies.js tickThunderKing.',
    },
    {
      id: 'turn-wait',
      name: 'Ход ждёт ролик',
      poured: 'yes',
      pourVer: '5.4.9.33',
      testVer: '5.4.9.13В',
      text: 'После кнопки ход ждёт около 42% длины ролика, потолок 280 мс. Уехало 5.4.9.33.',
    },
    {
      id: 'dungeon-inst',
      name: 'Инсты ключей',
      poured: 'yes',
      pourVer: '5.4.9.16',
      testVer: '5.4.9.16В',
      text: 'js/dungeon-inst.js и фазы боссов (Ша Сомнения, Пожиратель, Королева, Титан, Прилив) как на Тесте. Уехало 5.4.9.16. Карта маршрута на основе: стили .route-map в css/main.css.',
    },
    {
      id: 'class-kits',
      name: 'Цифры классов',
      poured: 'yes',
      pourVer: '5.4.9.11',
      testVer: '5.4.9.11В',
      text: 'Киты классов как на Тесте после 5.4.9-hour. Воин Оружие: Вихрь перезарядка 3, 13т×2. Читер не лили.',
    },
    {
      id: 'raid-shell',
      name: 'Рейд 10 (каркас)',
      poured: 'yes',
      pourVer: '5.4.9',
      text: 'Лэй Шэнь, обычный / героический, катакомбы 50%, столбы 20%, провал 75%, налог HP ×1.12 / атака ×1.08, толщина босса ×7 / ×10. Стили на Тесте в test-room.css, на основе в raid.css. Пол HP и очередь фаз — отдельная строка, залиты 5.4.9.17. Таймер и лут рейда — отдельная строка (Тест 5.4.9.29В).',
    },
    {
      id: 'party-auras',
      name: 'Бафф отряда по классу',
      poured: 'yes',
      pourVer: '5.4.9.28',
      testVer: '5.4.9.28В',
      text: 'Бафф в начале боя — на основе. Показ: «Пассивные способности» слева снизу, «Баффы отряда» справа снизу. Уехало на основу 5.4.9.28.',
    },
    {
      id: 'hunter-pets',
      name: 'Три зверя охотника',
      poured: 'yes',
      pourVer: '5.4.9.06',
      text: 'Повелитель зверей — медведь: 20% нанесённого возвращается питомцу, отряду +4% атаки. Стрельба — ястреб: +10% крита питомцу, отряду +5% крита. Выживание — ящер: +8% универсальности питомцу, отряду +5% универсальности.',
    },
    {
      id: 'ability-drag',
      name: 'Панель 1–9: зажать и перетащить',
      poured: 'yes',
      pourVer: '5.4.9.06',
      text: 'Порядок кнопок: зажать около 0.3 с и перетащить. Пишется в abilityOrder, кит класса не меняется. Бой: способность, потом клик по портрету.',
    },
    {
      id: 'demonhunter',
      name: 'Охотник на демонов',
      poured: 'yes',
      pourVer: '5.4.9.08',
      text: 'Месть и Истребление открыты в лобби основы. Пакет class-balance/demonhunter-abilities.js. Поле и ролики охотника на демонов с пакетом не уезжали.',
    },
    {
      id: 'engineer',
      name: 'Гном-инженер',
      poured: 'yes',
      pourVer: '5.4.8.40',
      text: 'Пакет класса на основе. Читер рядом не лили.',
    },
    {
      id: 'buff-icons',
      name: 'Иконки баффов у портрета',
      poured: 'yes',
      pourVer: '5.4.9',
      text: 'Панель 2×6 слева от портрета. Тест и основа.',
    },
    {
      id: 'lobby-art',
      name: 'Фон лобби и скрытие интерфейса',
      poured: 'yes',
      pourVer: '5.4.9',
      text: 'Фон ключа и рейда, кнопка скрыть карточки (прозрачность, не display none), переход ключ↔рейд молниями. Стили: Тест — test-room.css, основа — raid.css.',
    },
  ];

  let divergeFilter = 'all';

  function divergeCounts() {
    const c = { no: 0, part: 0, yes: 0 };
    for (const row of DIVERGE_LOG) {
      if (c[row.poured] !== undefined) c[row.poured] += 1;
    }
    return c;
  }

  function renderDivergePanel() {
    const list = document.getElementById('diverge-list');
    const filterEl = document.getElementById('diverge-filter');
    const note = document.getElementById('diverge-note');
    const sub = document.getElementById('diverge-sub');
    if (!list) return;

    const counts = divergeCounts();
    if (note) {
      note.textContent = 'Чем Тест отличается от основы, и уехало ли. Не залито '
        + counts.no + ', частично ' + counts.part + ', залито ' + counts.yes + '.';
    }
    if (sub) sub.textContent = 'не залито ' + counts.no;

    if (filterEl) {
      const chips = [
        { id: 'all', label: 'Все' },
        { id: 'no', label: 'Не залито' },
        { id: 'part', label: 'Частично' },
        { id: 'yes', label: 'Залито' },
      ];
      filterEl.innerHTML = chips.map(c =>
        '<button type="button" class="bf-btn' + (divergeFilter === c.id ? ' on' : '') + '" data-dv="' + c.id + '">' + c.label + '</button>'
      ).join('');
      filterEl.querySelectorAll('.bf-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          divergeFilter = btn.dataset.dv || 'all';
          renderDivergePanel();
        });
      });
    }

    const rows = DIVERGE_LOG
      .filter(row => divergeFilter === 'all' || row.poured === divergeFilter)
      .slice()
      .sort((a, b) => {
        const oa = (DIVERGE_STATUS[a.poured] || DIVERGE_STATUS.no).order;
        const ob = (DIVERGE_STATUS[b.poured] || DIVERGE_STATUS.no).order;
        if (oa !== ob) return oa - ob;
        return String(a.name).localeCompare(String(b.name), 'ru');
      });

    list.innerHTML = rows.map(row => {
      const st = DIVERGE_STATUS[row.poured] || DIVERGE_STATUS.no;
      const verBits = [];
      if (row.testVer) verBits.push('Тест ' + row.testVer);
      if (row.poured === 'yes' && row.pourVer) verBits.push('основа ' + row.pourVer);
      else if (row.poured === 'part' && row.pourVer) verBits.push('каркас ' + row.pourVer);
      const ver = verBits.length ? '<span class="dv-ver">' + verBits.join(' · ') + '</span>' : '';
      return '<article class="diverge-row poured-' + row.poured + '">'
        + '<div class="dv-head">'
        + '<span class="dv-name">' + row.name + '</span>'
        + '<span class="dv-status ' + row.poured + '">' + st.label + '</span>'
        + '</div>'
        + '<div class="dv-text">' + (row.text || '') + '</div>'
        + ver
        + '</article>';
    }).join('') || '<div class="balance-empty">Нет записей для фильтра</div>';
  }
