/* state: shared runtime + combat constants */
  const HIST_KEY = 'mythicKeyHistory_v1';
  const DEATH_PENALTY = 5;
  /** Combat numbers in thousands: base 170 HP → 170000 (shown as 170т). */
  const STAT_SCALE = 1000;
  /**
   * flat в данных — НЕ фиксированный урон, а «вес» относительно атаки.
   * flat === FLAT_REF ≈ 100% эффективной атаки; flat 30 ≈ 200% атаки.
   * Исторически flat писали рядом с atk ~12–18 → REF 15.
   */
  const FLAT_REF = 15;

  // ── Secondary stats (crit / mastery / vers) ─────────────────
  // Рейтинги (растут от шмота). % считается из рейтинга.
  // Крит: 100 рейтинга → 18% (линейно). Унив.: 1 рейтинг → 0.5%.
  // Искусность: 120 рейтинга → pctAt120% у спека.
  const SEC_CRIT_RATING = 100;         // дефолт рейтинга крита
  const SEC_CRIT_DEFAULT = 0.18;       // 18% при 100 рейтинга
  const SEC_CRIT_MULT = 1.5;           // множитель крит-урона
  const SEC_VERS_RATING = 0;           // дефолт рейтинга унив.
  const SEC_VERS_PCT_PER_RATING = 0.005; // 0.5% за 1 рейтинг
  const SEC_MASTERY_RATING = 120;      // базовый рейтинг искусности
  // Конверсия шмоток → рейтинг 1:1 (раньше было ×10–14 — отсюда «бешеные» % в отряде).
  // Полный сет: обычно +30–80 рейтинга к криту (~+5–14%), не сотни.
  const GEAR_CRIT_PER_POINT = 1;
  const GEAR_VERS_PER_POINT = 1;
  const GEAR_MASTERY_PER_POINT = 1;

  /**
   * Primary со шмота → боевые числа (как база * STAT_SCALE).
   * Боевой бонус = gearStat * STAT_SCALE * GEAR_*_MULT.
   * В UI «т» = боевой / 1000 ≈ gearStat * mult.
   * Пример: 100 hp на шмоте * 0.10 → +10т HP, не +100т.
   */
  const GEAR_ATK_MULT = 0.05;
  const GEAR_DEF_MULT = 0.045;
  const GEAR_HP_MULT = 0.10;

  /**
   * Искусность по специализации.
   * pctAt120 — % эффекта при рейтинге 120 (одинаковый рейтинг → разный % у спеков).
   * kind — как применяется в бою; effect — текст для UI (hover).
   */
  const MASTERY_BY_SPEC = {
    // Engineer (Gnome)
    engineer_mechanist:  { name: 'Сборка механизмов', effect: 'Увеличивает урон питомцев, турелей и механизмов', kind: 'pet', pctAt120: 50 },
    engineer_sapper:     { name: 'Пиротехника', effect: 'Увеличивает урон по области и от взрывов', kind: 'aoe', pctAt120: 44 },
    engineer_tinkerer:   { name: 'Гениальные гаджеты', effect: 'Шанс «Гения инженерии»: усилить основного питомца в конце хода (база 0%, иск. даёт %)', kind: 'pet_tune', pctAt120: 12 },
    // Warrior
    warrior_arms:        { name: 'Удары возможности', effect: 'Усиливает эффекты кровотечения (периодический урон)', kind: 'bleed', pctAt120: 70 },
    warrior_fury:        { name: 'Необузданная ярость', effect: 'Стаки за навыки с расходом ярости: +% урона за стак (сброс без расхода)', kind: 'fury_stacks', pctAt120: 15 },
    warrior_protection:  { name: 'Критический блок', effect: 'Добавляет шанс блока к «Щиту с озона» (блок −35% урона)', kind: 'block_chance', pctAt120: 15 },
    // Paladin
    paladin_holy:        { name: 'Озарённое исцеление', effect: '«Выбор света»: периодическое лечение % от объёма хила на 2 хода', kind: 'light_echo', pctAt120: 15 },
    paladin_protection:  { name: 'Божественный оплот', effect: 'Усиливает только урон «Щит мстителя»', kind: 'avengers', pctAt120: 80 },
    paladin_retribution: { name: 'Длань Света', effect: 'Усиливает урон способностей Воздаяния школы «Свет»', kind: 'holy_dmg', pctAt120: 13 },
    // Hunter
    hunter_beast_mastery:{ name: 'Повелитель зверей', effect: 'Увеличивает урон питомца', kind: 'pet', pctAt120: 48 },
    hunter_marksmanship: { name: 'Дикий залп', effect: 'Увеличивает дальний урон по одной цели', kind: 'st', pctAt120: 42 },
    hunter_survival:     { name: 'Сущность гадюки', effect: 'Увеличивает периодический урон и урон по области', kind: 'dot_aoe', pctAt120: 39 },
    // Rogue
    rogue_assassination: { name: 'Сильные яды', effect: 'Увеличивает периодический урон / отравления', kind: 'dot', pctAt120: 44 },
    rogue_combat:        { name: 'Удар с левой', effect: 'Увеличивает весь исходящий урон', kind: 'dmg', pctAt120: 41 },
    rogue_subtlety:      { name: 'Палач', effect: 'Увеличивает урон завершающих приёмов', kind: 'finisher', pctAt120: 45 },
    // Priest
    priest_discipline:   { name: 'Сила щита', effect: 'Увеличивает силу щитов', kind: 'shield', pctAt120: 42 },
    priest_holy:         { name: 'Отзвук Света', effect: 'Увеличивает лечение и периодическое исцеление', kind: 'heal', pctAt120: 39 },
    priest_shadow:       { name: 'Теневой отклик', effect: 'Увеличивает периодический урон / урон тьмы', kind: 'dot', pctAt120: 42 },
    // Death Knight
    deathknight_blood:   { name: 'Кровавый щит', effect: 'Снижает входящий урон; усиливает щит-эффекты', kind: 'tank', pctAt120: 36 },
    deathknight_frost:   { name: 'Ледяное сердце', effect: 'Увеличивает весь исходящий урон', kind: 'dmg', pctAt120: 41 },
    deathknight_unholy:  { name: 'Клинок ужаса', effect: 'Увеличивает периодический урон / болезни и урон питомца', kind: 'dot_pet', pctAt120: 41 },
    // Shaman
    shaman_elemental:    { name: 'Перегрузка стихий', effect: 'Увеличивает урон заклинаний (частично)', kind: 'multi', pctAt120: 38 },
    shaman_enhancement:  { name: 'Усиленные стихии', effect: 'Увеличивает весь исходящий урон', kind: 'dmg', pctAt120: 41 },
    shaman_restoration:  { name: 'Глубокое исцеление', effect: '«Глубокие воды»: прибавка к хилу растёт по мере потери HP цели (полная при ≤30% HP)', kind: 'lowhp_heal', pctAt120: 20 },
    // Mage
    mage_arcane:         { name: 'Магистр маны', effect: 'Увеличивает весь исходящий урон', kind: 'dmg', pctAt120: 41 },
    mage_fire:           { name: 'Воспламенение', effect: 'Увеличивает огненный периодический урон', kind: 'dot', pctAt120: 42 },
    mage_frost:          { name: 'Ледышки', effect: 'Увеличивает урон по области / ледяной урон', kind: 'aoe', pctAt120: 39 },
    // Warlock
    warlock_affliction:  { name: 'Сильные страдания', effect: 'Увеличивает периодический урон', kind: 'dot', pctAt120: 45 },
    warlock_demonology:  { name: 'Мастер-демонолог', effect: 'Увеличивает урон всех питомцев/демонов (только питомцы)', kind: 'pet', pctAt120: 10 },
    warlock_destruction: { name: 'Буря углей', effect: 'Увеличивает весь исходящий урон', kind: 'dmg', pctAt120: 42 },
    // Monk
    monk_brewmaster:     { name: 'Неуловимый боец', effect: 'Добавляет шанс уклонения от прямого (ST) урона (при 120 → +5%)', kind: 'dodge_chance', pctAt120: 5 },
    monk_mistweaver:     { name: 'Дар змеи', effect: 'Увеличивает исходящее лечение', kind: 'heal', pctAt120: 39 },
    monk_windwalker:     { name: 'Удары комбо', effect: 'Увеличивает весь исходящий урон', kind: 'dmg', pctAt120: 41 },
    // Druid
    druid_balance:       { name: 'Полное затмение', effect: 'Увеличивает урон по области / урон заклинаний', kind: 'aoe', pctAt120: 39 },
    druid_feral:         { name: 'Бритвенные когти', effect: 'Увеличивает урон кровотечений', kind: 'dot', pctAt120: 44 },
    druid_guardian:      { name: 'Природный страж', effect: 'Снижает входящий урон; небольшой бонус к запасу здоровья', kind: 'tank', pctAt120: 35 },
    druid_restoration:   { name: 'Гармония', effect: 'Увеличивает лечение и периодическое исцеление', kind: 'heal', pctAt120: 39 },
  };


  // ── Party builder state ──
  let party = []; // { classId, specId }
  let editSlot = null;
  let pickClass = null;
  let pickSpec = null;

  // ── Run ──
  let run = null, combat = null, pendingTarget = null, toastTimer = null, timerInterval = null;
  let gameSpeed = 1; // 1, 2, 4
  let paused = false;
  let soundOn = true;
  let aiTimer = null;

  // ── Recount (meter for current key) ──
  // damage/taken/healing — totals by hero uid
  // damageBySkill / takenBySource / healingBySkill — per-skill nested maps
  let recount = null;
  let recountUiRaf = 0;

  const uid = () => Math.random().toString(36).slice(2, 9);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /** Recount: reset totals for a new key run */

