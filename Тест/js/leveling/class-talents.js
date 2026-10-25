/* Деревья героя по классам (кроме паладина — он в hero-talents.js). 5 ярусов, один из трёх, 8/16/24/32/40.
 * Каждый выбор описан эффектом fx — его применяет движок в hero-talents.js (applyFx*). Описание собирается из fx.
 *   speed           +N к скорости
 *   atkOpener       +доля атаки в первые 2 раунда боя
 *   atkHighHp       +доля атаки, пока здоровье выше 80%
 *   regenMissing    в начале хода: доля от недостающего здоровья
 *   costPct         основной ресурс способностей дешевле на долю
 *   secGen / secCost  вторичный ресурс: генератор +1 / трата от 2 ед. дешевле на 1
 *   dmgDone / healDone  весь урон / всё исцеление +доля
 *   hpPct defPct atkPct critAdd  статы
 *   mastery         +п.п. к эффекту искусности
 *   active          'stand' | 'burst' | 'guard' — приём раз в бой без хода (имя/иконка выбора)
 *   ab: { id, name, dmg | heal | shield | cd }  одна способность спека: множитель или −N к перезарядке
 *   critSchool: { school, mult }  крит этой школы бьёт сильнее
 */
(function (G) {
  function pct(x) { return Math.round(x * 100) + '%'; }

  function describe(fx) {
    var p = [];
    if (fx.speed) p.push('+' + fx.speed + ' к скорости. Ходишь раньше в раунде.');
    if (fx.atkOpener) p.push('+' + pct(fx.atkOpener) + ' атаки в первые 2 раунда боя.');
    if (fx.atkHighHp) p.push('+' + pct(fx.atkHighHp) + ' атаки, пока здоровье выше 80%.');
    if (fx.regenMissing) p.push('В начале хода: ' + pct(fx.regenMissing) + ' от недостающего здоровья.');
    if (fx.costPct) p.push('Способности на ' + pct(fx.costPct) + ' дешевле по основному ресурсу.');
    if (fx.secGen) p.push('Генератор вторичного ресурса даёт +' + fx.secGen + ' сверх нормы.');
    if (fx.secCost) p.push('Трата вторичного ресурса от 2 ед. дешевле на ' + fx.secCost + '.');
    if (fx.dmgDone && fx.healDone) p.push('+' + pct(fx.dmgDone) + ' урона и исцеления.');
    else if (fx.dmgDone) p.push('+' + pct(fx.dmgDone) + ' ко всему урону.');
    else if (fx.healDone) p.push('+' + pct(fx.healDone) + ' ко всему исцелению.');
    if (fx.hpPct) p.push('+' + pct(fx.hpPct) + ' здоровья.');
    if (fx.defPct) p.push('+' + pct(fx.defPct) + ' защиты.');
    if (fx.atkPct) p.push('+' + pct(fx.atkPct) + ' атаки.');
    if (fx.critAdd) p.push('+' + pct(fx.critAdd) + ' крита.');
    if (fx.mastery) p.push('+' + Math.round(fx.mastery * 100) + ' п.п. к эффекту искусности.');
    if (fx.active === 'stand') p.push('Раз в бой, без хода: −40% входящего урона на 2 хода.');
    if (fx.active === 'burst') p.push('Раз в бой, без хода: +20% атаки на 2 хода.');
    if (fx.active === 'guard') p.push('Раз в бой, без хода: щит 20% максимального здоровья.');
    if (fx.ab) {
      var a = fx.ab;
      if (a.dmg) p.push('«' + a.name + '» +' + pct(a.dmg - 1) + ' урона.');
      if (a.heal) p.push('«' + a.name + '» +' + pct(a.heal - 1) + ' исцеления.');
      if (a.shield) p.push('«' + a.name + '»: щит +' + pct(a.shield - 1) + '.');
      if (a.cd) p.push('«' + a.name + '»: перезарядка −' + a.cd + ' ход' + (a.cd === 1 ? '' : 'а') + '.');
    }
    if (fx.critSchool) p.push('Крит школы ' + fx.critSchool.label + ' ×' + fx.critSchool.mult + ' вместо ×1.5.');
    return p.join(' ');
  }

  function pick(id, name, icon, fx) {
    return { id: id, name: name, icon: icon, fx: fx, desc: describe(fx) };
  }

  // Ярус «Лицо спека»: улучшение способности. kind: dmg / heal / shield (множитель) или cd (−ходов)
  function ab(cls, abId, abName, kind, val, icon) {
    var fx = { ab: { id: abId, name: abName } };
    fx.ab[kind] = val;
    var title = kind === 'cd' ? 'Быстрый откат: ' + abName : 'Улучшение: ' + abName;
    return pick(cls + '_' + abId + '_' + kind, title, icon || (kind === 'cd' ? '⏳' : '✦'), fx);
  }

  function tiers(cls, t1, t2, t3bySpec, t4, t5) {
    return [
      { id: 't1', level: 8, title: 'Шаг', picks: [
        pick(cls + '_t1a', t1[0][0], t1[0][1], { speed: 2 }),
        pick(cls + '_t1b', t1[1][0], t1[1][1], { atkOpener: 0.08 }),
        pick(cls + '_t1c', t1[2][0], t1[2][1], { regenMissing: 0.05 }),
      ] },
      { id: 't2', level: 16, title: 'Ресурс', picks: t2 },
      { id: 't3', level: 24, title: 'Лицо спека', bySpec: t3bySpec },
      { id: 't4', level: 32, title: 'Приём', picks: [
        pick(cls + '_t4a', t4[0][0], t4[0][1], { active: 'stand' }),
        pick(cls + '_t4b', t4[1][0], t4[1][1], { active: 'burst' }),
        pick(cls + '_t4c', t4[2][0], t4[2][1], { active: 'guard' }),
      ] },
      { id: 't5', level: 40, title: 'Венец', picks: [
        pick(cls + '_t5a', t5[0][0], t5[0][1], { mastery: 0.08 }),
        pick(cls + '_t5b', t5[1][0], t5[1][1], { hpPct: 0.12, defPct: 0.08 }),
        pick(cls + '_t5c', t5[2][0], t5[2][1], { atkPct: 0.12, critAdd: 0.04 }),
      ] },
    ];
  }

  var TREES = {
    warrior: tiers('war',
      [['Неудержимость', '🏃'], ['Неминуемая победа', '🗡️'], ['Безудержное восстановление', '❤️']],
      [pick('war_t2a', 'Управление гневом', '😤', { costPct: 0.15 }),
       pick('war_t2b', 'Кровопускание', '🩸', { dmgDone: 0.05 }),
       pick('war_t2c', 'Закалённая кожа', '🧱', { hpPct: 0.06, atkPct: 0.04 })],
      {
        arms: [ab('war', 'ms', 'Смертельный удар', 'dmg', 1.15), ab('war', 'whirlwind', 'Вихрь', 'dmg', 1.2), ab('war', 'colossus', 'Удар колосса', 'cd', 1)],
        fury: [ab('war', 'bt', 'Кровавая жажда', 'dmg', 1.15), ab('war', 'whirlwind', 'Вихрь', 'dmg', 1.2), ab('war', 'rb', 'Яростный выпад', 'cd', 1)],
        protection: [ab('war', 'shield_slam', 'Удар щитом', 'dmg', 1.15), ab('war', 'pain_endure', 'Стойкость к боли', 'shield', 1.25), ab('war', 'shield_wall', 'Глухая оборона', 'cd', 3)],
      },
      [['Ободряющий клич', '🏰'], ['Аватара', '💥'], ['Охрана', '🔰']],
      [['Мастер оружия', '📿'], ['Закалка в боях', '❤️'], ['Кровожадность', '⚔️']]),

    hunter: tiers('hun',
      [['Поспешность', '🏃'], ['Затаившийся тигр', '🐅'], ['Бодрость', '❤️']],
      [pick('hun_t2a', 'Пыл', '🔥', { costPct: 0.15 }),
       pick('hun_t2b', 'Азарт охоты', '🎯', { dmgDone: 0.05 }),
       pick('hun_t2c', 'Дух зверя', '🐾', { hpPct: 0.06, atkPct: 0.04 })],
      {
        beast_mastery: [ab('hun', 'kill_cmd', 'Команда «Взять!»', 'dmg', 1.15), ab('hun', 'multi', 'Залп', 'dmg', 1.2), ab('hun', 'bestial', 'Звериный гнев', 'cd', 1)],
        marksmanship: [ab('hun', 'aimed', 'Прицельный выстрел', 'dmg', 1.15), ab('hun', 'barrage', 'Шквал', 'dmg', 1.2), ab('hun', 'chimera', 'Выстрел химеры', 'cd', 1)],
        survival: [ab('hun', 'explosive', 'Разрывной выстрел', 'dmg', 1.15), ab('hun', 'explosive_trap', 'Взрывная ловушка', 'dmg', 1.2), ab('hun', 'black_arrow', 'Чёрная стрела', 'cd', 1)],
      },
      [['Сдерживание', '🏰'], ['Дикий топот', '💥'], ['Маскировка', '🔰']],
      [['Мастер-охотник', '📿'], ['Выносливость следопыта', '❤️'], ['Меткий глаз', '⚔️']]),

    rogue: tiers('rog',
      [['Внезапный рывок', '🏃'], ['Сосредоточение в тени', '🗡️'], ['Заживление', '❤️']],
      [pick('rog_t2a', 'Предвкушение', '🎯', { secGen: 1 }),
       pick('rog_t2b', 'Неумолимость', '♻️', { secCost: 1 }),
       pick('rog_t2c', 'Бодрость', '⚡', { costPct: 0.15 })],
      {
        assassination: [ab('rog', 'mutilate', 'Мясорубка', 'dmg', 1.15), ab('rog', 'fan', 'Веер клинков', 'dmg', 1.2), ab('rog', 'vendetta', 'Вендетта', 'cd', 1)],
        combat: [ab('rog', 'ss', 'Коварный удар', 'dmg', 1.15), ab('rog', 'killing_spree', 'Череда убийств', 'dmg', 1.2), ab('rog', 'adrenaline', 'Выброс адреналина', 'cd', 1)],
        subtlety: [ab('rog', 'ambush', 'Внезапный удар', 'dmg', 1.15), ab('rog', 'fan', 'Веер клинков', 'dmg', 1.2), ab('rog', 'shadow_dance', 'Танец теней', 'cd', 1)],
      },
      [['Плащ теней', '🏰'], ['Метка смерти', '💥'], ['Ускользание', '🔰']],
      [['Мастер клинков', '📿'], ['Живучесть', '❤️'], ['Беспощадность', '⚔️']]),

    priest: tiers('pri',
      [['Перышко', '🪶'], ['Божественная звезда', '⭐'], ['Молитва отчаяния', '❤️']],
      [pick('pri_t2a', 'Озарение', '💧', { costPct: 0.15 }),
       pick('pri_t2b', 'Поворот судьбы', '🌀', { dmgDone: 0.05, healDone: 0.05 }),
       pick('pri_t2c', 'Придание сил', '✨', { atkPct: 0.06 })],
      {
        discipline: [ab('pri', 'penance', 'Исповедь', 'heal', 1.2), ab('pri', 'shield', 'Слово силы: Щит', 'shield', 1.25), ab('pri', 'pain_supp', 'Подавление боли', 'cd', 1)],
        holy: [ab('pri', 'circle', 'Круг исцеления', 'heal', 1.2), ab('pri', 'holy_word', 'Слово Света: Безмятежность', 'heal', 1.15), ab('pri', 'guardian', 'Дух-хранитель', 'cd', 2)],
        shadow: [ab('pri', 'mind_blast', 'Взрыв разума', 'dmg', 1.15), ab('pri', 'mind_sear', 'Пронзание разума', 'dmg', 1.2), ab('pri', 'shadowfiend', 'Исчадие Тьмы', 'cd', 1)],
      },
      [['Призрачная защита', '🏰'], ['Сила Света', '💥'], ['Ангельский оплот', '🔰']],
      [['Мастер веры', '📿'], ['Стойкость веры', '❤️'], ['Вознесение', '⚔️']]),

    deathknight: tiers('dk',
      [['Нечестивый натиск', '🏃'], ['Вожак чумы', '🗡️'], ['Чистилище', '❤️']],
      [pick('dk_t2a', 'Некротический удар', '💀', { dmgDone: 0.05 }),
       pick('dk_t2b', 'Обращение', '🩸', { hpPct: 0.06, atkPct: 0.04 }),
       pick('dk_t2c', 'Антимагический покров', '🛡️', { defPct: 0.10 })],
      {
        blood: [ab('dk', 'heart_strike', 'Удар в сердце', 'dmg', 1.15), ab('dk', 'blood_boil', 'Вскипание крови', 'dmg', 1.2), ab('dk', 'vampiric_blood', 'Кровь вампира', 'cd', 2)],
        frost: [ab('dk', 'obliterate', 'Уничтожение', 'dmg', 1.15), ab('dk', 'howling', 'Воющий ветер', 'dmg', 1.2), ab('dk', 'ity', 'Ледяной столп', 'cd', 1)],
        unholy: [ab('dk', 'scourge', 'Удар Плети', 'dmg', 1.15), ab('dk', 'outbreak', 'Вспышка болезни', 'dmg', 1.2), ab('dk', 'summon_garg', 'Призыв горгульи', 'cd', 1)],
      },
      [['Зона антимагии', '🏰'], ['Нечестивое бешенство', '💥'], ['Костяная броня', '🔰']],
      [['Повелитель смерти', '📿'], ['Мертвецкая стойкость', '❤️'], ['Беспощадность зимы', '⚔️']]),

    shaman: tiers('sha',
      [['Тотем ветряного шага', '🏃'], ['Стремительность предков', '🗡️'], ['Наставление предков', '❤️']],
      [pick('sha_t2a', 'Прилив маны', '💧', { costPct: 0.15 }),
       pick('sha_t2b', 'Покорение стихий', '🌀', { dmgDone: 0.05, healDone: 0.05 }),
       pick('sha_t2c', 'Каменная защита', '🪨', { hpPct: 0.08 })],
      {
        elemental: [ab('sha', 'lv', 'Выброс лавы', 'dmg', 1.15), ab('sha', 'chain', 'Цепная молния', 'dmg', 1.2), ab('sha', 'fire_ele', 'Элементаль огня', 'cd', 1)],
        enhancement: [ab('sha', 'stormstrike', 'Удар бури', 'dmg', 1.15), ab('sha', 'fire_nova', 'Кольцо огня', 'dmg', 1.2), ab('sha', 'feral_spirit', 'Дух дикого волка', 'cd', 1)],
        restoration: [ab('sha', 'riptide', 'Быстрина', 'heal', 1.2), ab('sha', 'ch', 'Цепное исцеление', 'heal', 1.2), ab('sha', 'spirit_link', 'Тотем духовной связи', 'cd', 1)],
      },
      [['Астральный сдвиг', '🏰'], ['Тотем бури', '💥'], ['Тотем каменного щита', '🔰']],
      [['Мастер стихий', '📿'], ['Сила земли', '❤️'], ['Гнев неба', '⚔️']]),

    mage: tiers('mag',
      [['Мерцание', '🏃'], ['Призыв силы', '🗡️'], ['Прижигание', '❤️']],
      [pick('mag_t2a', 'Оберег заклинателя', '💧', { costPct: 0.15 }),
       pick('mag_t2b', 'Руна мощи', '🔷', { dmgDone: 0.05 }),
       pick('mag_t2c', 'Временная защита', '⏳', { hpPct: 0.08 })],
      {
        arcane: [ab('mag', 'abarr', 'Чародейский обстрел', 'dmg', 1.15), ab('mag', 'ae', 'Чародейский взрыв', 'dmg', 1.2), ab('mag', 'arcane_power', 'Мощь тайной магии', 'cd', 1)],
        fire: [ab('mag', 'pyroblast', 'Огненная глыба', 'dmg', 1.15), ab('mag', 'flamestrike', 'Огненный столб', 'dmg', 1.2),
          pick('mag_fire_crit', 'Воспламенение', '🔥', { critSchool: { school: 'fire', label: 'Огонь', mult: 1.75 } })],
        frost: [ab('mag', 'ice_lance', 'Ледяное копьё', 'dmg', 1.15), ab('mag', 'frozen_orb', 'Ледяной шар', 'dmg', 1.2), ab('mag', 'icy_veins', 'Стылая кровь', 'cd', 1)],
      },
      [['Ледяная глыба', '🏰'], ['Всплеск силы', '💥'], ['Ледяная преграда', '🔰']],
      [['Мастер магии', '📿'], ['Магическая броня', '❤️'], ['Сила разума', '⚔️']]),

    warlock: tiers('wl',
      [['Стремительное пламя', '🏃'], ['Тёмная сделка', '🗡️'], ['Тёмное восстановление', '❤️']],
      [pick('wl_t2a', 'Жатва жизни', '💧', { costPct: 0.15 }),
       pick('wl_t2b', 'Гримуар превосходства', '📕', { dmgDone: 0.05 }),
       pick('wl_t2c', 'Осколочный запас', '💎', { secGen: 1 })],
      {
        affliction: [ab('wl', 'ua', 'Нестабильное колдовство', 'dmg', 1.15), ab('wl', 'seed', 'Семя порчи', 'dmg', 1.2), ab('wl', 'dark_soul', 'Тёмная душа: Знание', 'cd', 1)],
        demonology: [ab('wl', 'soul_fire', 'Ожог души', 'dmg', 1.15), ab('wl', 'hand_guldan', "Длань Гул'дана", 'dmg', 1.2), ab('wl', 'metamorphosis', 'Метаморфоза', 'cd', 1)],
        destruction: [ab('wl', 'chaos_bolt', 'Стрела Хаоса', 'dmg', 1.15), ab('wl', 'rain_fire', 'Огненный ливень', 'dmg', 1.2), ab('wl', 'conflag', 'Поджигание', 'cd', 1)],
      },
      [['Твёрдая решимость', '🏰'], ['Мощь Архимонда', '💥'], ['Жертвенный договор', '🔰']],
      [['Мастер Скверны', '📿'], ['Демоническая броня', '❤️'], ['Тёмное знание', '⚔️']]),

    monk: tiers('mon',
      [['Стремительность', '🏃'], ['Тигриное рвение', '🐅'], ['Волна ци', '❤️']],
      [pick('mon_t2a', 'Вознесение', '☯️', { secGen: 1 }),
       pick('mon_t2b', 'Мощные удары', '👊', { secCost: 1 }),
       pick('mon_t2c', 'Энергичность', '⚡', { costPct: 0.15 })],
      {
        brewmaster: [ab('mon', 'keg_smash', 'Удар бочонком', 'dmg', 1.15), ab('mon', 'breath', 'Дыхание огня', 'dmg', 1.2), ab('mon', 'fort_brew', 'Отвар железной шкуры', 'cd', 2)],
        mistweaver: [ab('mon', 'enveloping', 'Окутывающий туман', 'heal', 1.2), ab('mon', 'uft', 'Духовный подъём', 'heal', 1.2), ab('mon', 'thunder_focus', 'Громовой чай', 'cd', 2)],
        windwalker: [ab('mon', 'rsk', 'Удар восходящего солнца', 'dmg', 1.15), ab('mon', 'sck', 'Танцующий журавль', 'dmg', 1.2), ab('mon', 'xuen', 'Призыв Сюэня', 'cd', 2)],
      },
      [['Рассеивание магии', '🏰'], ['Буря, земля и огонь', '💥'], ['Смягчение удара', '🔰']],
      [['Мастер пандаренов', '📿'], ['Железное тело', '❤️'], ['Путь журавля', '⚔️']]),

    druid: tiers('dru',
      [['Кошачья стремительность', '🐆'], ['Дикий рывок', '🗡️'], ['Дар Изеры', '❤️']],
      [pick('dru_t2a', 'Душа леса', '🌿', { costPct: 0.15 }),
       pick('dru_t2b', 'Бдительность природы', '🌀', { dmgDone: 0.05, healDone: 0.05 }),
       pick('dru_t2c', 'Шкура медведя', '🐻', { hpPct: 0.08 })],
      {
        balance: [ab('dru', 'starsurge', 'Звёздный поток', 'dmg', 1.15), ab('dru', 'starfall', 'Звездопад', 'dmg', 1.2), ab('dru', 'celestial', 'Небесное выравнивание', 'cd', 1)],
        feral: [ab('dru', 'ferocious', 'Свирепый укус', 'dmg', 1.15), ab('dru', 'thrash', 'Взбучка', 'dmg', 1.2), ab('dru', 'berserk', 'Берсерк', 'cd', 1)],
        guardian: [ab('dru', 'mangle', 'Увечье', 'dmg', 1.15), ab('dru', 'thrash', 'Взбучка', 'dmg', 1.2), ab('dru', 'survival', 'Инстинкты выживания', 'cd', 3)],
        restoration: [ab('dru', 'swiftmend', 'Быстрое восстановление', 'heal', 1.2), ab('dru', 'wg', 'Буйный рост', 'heal', 1.2), ab('dru', 'tranq', 'Спокойствие', 'cd', 1)],
      },
      [['Железная кора', '🏰'], ['Сердце дикой природы', '💥'], ['Щит Кенария', '🔰']],
      [['Хранитель рощи', '📿'], ['Сила медведя', '❤️'], ['Ярость дикой природы', '⚔️']]),

    engineer: tiers('eng',
      [['Ракетные ботинки', '🚀'], ['Первый залп', '🗡️'], ['Автоматический ремонт', '❤️']],
      [pick('eng_t2a', 'Запасные детали', '⚙️', { secGen: 1 }),
       pick('eng_t2b', 'Экономная сборка', '🔧', { secCost: 1 }),
       pick('eng_t2c', 'Ёмкая батарея', '🔋', { costPct: 0.15 })],
      {
        mechanist: [ab('eng', 'wrench_bash', 'Удар гаечным ключом', 'dmg', 1.15), ab('eng', 'rivet_gun', 'Заклёпочный пистолет', 'dmg', 1.15), ab('eng', 'call_siege_walker', 'Осадный ходун', 'cd', 2)],
        sapper: [ab('eng', 'remote_charge', 'Дистанционный заряд', 'dmg', 1.15), ab('eng', 'cluster_bomb', 'Кассетная бомба', 'dmg', 1.2), ab('eng', 'demolish', 'Подрыв', 'cd', 1)],
        tinkerer: [ab('eng', 'death_ray', 'Гномский луч смерти', 'dmg', 1.15), ab('eng', 'rocket_chicken', 'Ракета-курица', 'dmg', 1.2), ab('eng', 'world_destroyer', 'Личный разрушитель миров', 'cd', 1)],
      },
      [['Бронекостюм', '🏰'], ['Перегрузка', '💥'], ['Силовое поле', '🔰']],
      [['Главный инженер', '📿'], ['Титановая броня', '❤️'], ['Гномья смекалка', '⚔️']]),

    demonhunter: tiers('dh',
      [['Импульс', '🏃'], ['Клинок Скверны', '🗡️'], ['Разрыв души', '❤️']],
      [pick('dh_t2a', 'Демонический аппетит', '😈', { secGen: 1 }),
       pick('dh_t2b', 'Безудержная мощь', '⚡', { costPct: 0.15 }),
       pick('dh_t2c', 'Слепая ярость', '🔥', { dmgDone: 0.05 })],
      {
        vengeance: [ab('dh', 'soul_cleave', 'Раскол души', 'dmg', 1.15), ab('dh', 'immolation_aura', 'Обжигающая аура', 'dmg', 1.2), ab('dh', 'metamorph_veng', 'Метаморфоза', 'cd', 2)],
        havoc: [ab('dh', 'chaos_strike', 'Удар Хаоса', 'dmg', 1.15), ab('dh', 'blade_dance', 'Танец клинков', 'dmg', 1.2), ab('dh', 'eye_beam', 'Пронзающий взгляд', 'cd', 1)],
      },
      [['Путь Пустоты', '🏰'], ['Немезида', '💥'], ['Барьер душ', '🔰']],
      [['Иллидари', '📿'], ['Демоническая кожа', '❤️'], ['Ярость Скверны', '⚔️']]),
  };

  G.IGOR_CLASS_TALENT_TIERS = TREES;
  G.igorTalentDescribe = describe;
})(typeof window !== 'undefined' ? window : this);
