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
      text: 'Хаб: тест анимаций, рисовка, тушь, арена спрайтов. Phaser-арена — отдельная страница, ключ её не грузит. На основе комнаты и спрайтов нет.',
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
      testVer: '5.4.9.23В',
      text: 'Сейв igorHero_v1, в том числе шмот героя. Экспорт/импорт тащит таверну с вещами. С 5.4.9.23. На Тесте с 5.4.9.18В ещё «Уровень +1» и несколько героев. Папка прокачка/ у корня — отдельная песочница.',
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
      pourVer: '5.4.9.15',
      testVer: '5.4.9.15В',
      text: 'Ротации всех 37 спеков (с 5.4.9.15). Кик, столбы, около 12% ошибка. Авто-ключ как авто-рейд. В ключе ИИ бьёт шёпот касания, семя и осколок инверсии раньше тела босса.',
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
      text: 'После элиты / стража / финала всегда выбор 1 из 3 вещей. Треш без шмота. Крит / универсальность / искусность на живой рейтинг. Сверху 10% сила ключа, не вместо вещи. Рейд лут не даёт. Уехало 5.4.9.15.',
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
      poured: 'no',
      text: 'После кнопки ход ждёт ролик 280–900 мс. На основе ожидания нет.',
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
      text: 'Лэй Шэнь, обычный / героический, катакомбы 50%, столбы 20%, провал 75%, налог HP ×1.12 / атака ×1.08, толщина босса ×7 / ×10. Стили на Тесте в test-room.css, на основе в raid.css. Пол HP и очередь фаз — отдельная строка, залиты 5.4.9.17.',
    },
    {
      id: 'party-auras',
      name: 'Бафф отряда по классу',
      poured: 'yes',
      pourVer: '5.4.9.06',
      text: 'В начале боя каждый живой класс вешает свой бафф на отряд и питомцев. Два одинаковых не складывают, разные складываются. На Тесте с 5.4.9.10В показ в окне «Пассивные бафы» справа снизу (кто даёт и что), не в рамке портрета. На основе по-прежнему иконки у рамки.',
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
