# Mythic Key — правила работы

Пошаговый мифик-ключ на 5 человек и рейд на 10 (Лэй Шэнь) на классах Туманов Пандарии. Чистый HTML/JS/CSS, без сборки. GitHub: [pidrpen/igor](https://github.com/pidrpen/igor), ветка `main`.

## Два дерева

| Путь | Что это |
|---|---|
| корень репозитория | **основа** — стабильная сборка для игроков |
| `Тест/` | **рабочая копия** — новые правки идут сюда |
| `launcher/` | `MythicKey.exe`: качает обе сборки с `main`, открывает игру в окне Edge. Выпуск = пуш в `main` |

**Перелив** — перенос названного куска из Теста в основу. Только по слову пользователя и только названный кусок, не вся папка `Тест/`.
Баг боя, который есть в обоих деревьях, можно чинить сразу в обоих.

## Обычная правка

1. Правь `Тест/`.
2. После правки JS/CSS — бамп `?v=` у тега этого файла в том `index.html`, который его грузит. Иначе браузер и лаунчер держат старую версию.
3. Изменилась механика или цифры — новая карточка сверху в `js/ui/balance-panel.js` → `BALANCE_HISTORY`. Номер: Тест `5.4.9.NNВ`, основа — та же цифра без «В».
4. Теги `<script>` в `index.html` закрывай полностью (`</script>`), иначе тег глотает следующие файлы.
5. Проверка: `node tests/load-check.js && node tests/balance-smoke.js` (в корне и в `Тест/`), потом ключ в браузере.

## Перелив

- **Класс:** копия `class-balance/<класс>-abilities.js` (все спеки класса).
- **Один спек:** в файле основы заменить только объект `specs[]` с этим `id`.
- **Фича:** список файлов + крючки в общих файлах (`ui.js`, `combat-loop.js`, `combat-flow.js`, `save.js`, `enemies.js`, `combat-ui.js`). Эти файлы не копировать целиком.
- После: бамп `?v=` в основе, карточка без «В», в `Тест/js/ui/diverge-panel.js` (`DIVERGE_LOG`) сменить `poured`.
- Без отдельного слова не переливать: магазин (`js/shop/`), живой бой (`js/live/`), облачный сейв (`js/cloud*.js`).

## Бой — не ломать

- Бой ключа и рейда один: тот же ход, авто-союзники (`partyAiAct`), «кого играешь». Не плодить `if (run.raid)` в боёвке.
- Управление: способность (или 1–9) → клик по портрету цели. Автоцель и автоудар не добавлять.
- Авто-союзник после бесплатного действия доигрывает ход сам, а не отдаёт его игроку (`isAutoAlly` / `runAutoAllyTurn` в `combat-loop.js`).
- Скрытие лобби — `opacity`, не `display: none` (ломает высоту и скролл).

## Где что

Пути от корня дерева. В основе то же, кроме строк «только Тест».

| Что | Файл |
|---|---|
| Цифры и кит класса | `class-balance/<класс>-abilities.js` → `apply-all.js` (скелет `wow-mop-data.js` пакет перезаписывает) |
| Константы статов, `MASTERY_BY_SPEC` | `js/state.js` |
| Цвета, портреты, темы данжей, `PATCHED_SPECS` | `js/core.js` |
| Враги, аффиксы, Лэй Шэнь | `js/enemies.js` |
| Инсты ключа (паки, механики комнат) | `js/dungeon-inst.js` |
| Маршрут ключа, силы ключа | `js/route.js` (Тест: награды развилок `FORK_REWARDS` / `assignForkRewards`, выдача в `combat-flow.js` `onVictory`) |
| Время за ход (только Тест) | `js/state.js` `ROUND_SEC_KEY` / `ROUND_SEC_RAID`, списание `chargeRoundTime` в `combat-loop.js` |
| Ловушка бойца на мид-боссе (только Тест) | `js/systems/trap.js` (`trapTick` из `checkEnd`, `_trapId` + обёртка `fieldSameHall`) |
| Рейд 10 | `js/raid.js`, `js/raid-catacombs.js` (сплит `raid-split.js` и погоня `raid-finale.js` выключены) |
| Шмот, драфт 1 из 3 | `js/gear.js` |
| Ход / раунд, авто-союзники | `js/systems/combat-loop.js` |
| Каст | `js/systems/abilities.js` |
| Урон, хил, броня, блок | `js/systems/damage.js` |
| ИИ союзников / врагов | `js/systems/party-ai.js` / `js/systems/ai.js` |
| Победа, конец хода | `js/systems/combat-flow.js` |
| Ресурсы, заряды | `js/systems/resources.js` |
| Пассивки, баффы отряда | `js/systems/passives.js`, `js/systems/party-auras.js` |
| Телеграфы, кик, лут-силы | `js/systems/telegraph-loot.js` |
| Описания способностей | `js/systems/ability-data.js` |
| Recount | `js/systems/meter.js` |
| Карточки боя, панель 1–9 | `js/ui/combat-ui.js` (Тест: портрет врага — тон подземелья, рамка ранга, значок роли — `foeFaceHtml`, стили `.foe-face` в `css/extra.css`) |
| Ролики способностей | таблицы `js/ui/skill-fx-<класс>.js` (школа / движение / попадание), рисует `js/ui/fx.js` `playSkillAnim`, стили `css/theme-controls.css`. Тест: попадания burst / ring / shard / flash (`spawnImpact`), короткая версия на 3–4× (`fxFast`) |
| Лобби, отряд, старт | `js/ui.js` |
| Таверна, герой 1–40 | `js/leveling/` (сейв `igorHero_v1`) |
| Деревья талантов героя | паладин — `js/leveling/hero-talents.js`; остальные классы (только Тест) — `js/leveling/class-talents.js`, эффекты `fx` применяет `hero-talents.js` |
| Сейв | `js/save.js` |
| Журнал патчей в лобби | `js/ui/balance-panel.js` |
| Стили | `css/main.css`; рейд и прочее — Тест `css/extra.css`, основа `css/raid.css` |
| Поле 3×2 (выключено) | `js/systems/field.js` — только Тест |
| Магазин | `js/shop/` — только Тест |
| Живой бой (реальное время, Phaser) | `js/live/` + `js/vendor/phaser.min.js` + `css/live.css`, ассеты `assets/live/`, `assets/kenney/`, `assets/sprites/` — только Тест |
| Облачный сейв (Supabase) | `js/cloud.js`, `js/cloud-config.js`, `css/cloud.css`, `облако/` — только Тест |
| Тест vs основа, залито ли | `js/ui/diverge-panel.js` — только Тест |
| Дизайн механик данжей | `Тест/ключи/` |
| Отложенные идеи | `Тест/бэклог_ветки.md` |

## Запуск

```bash
python -m http.server 8080
# основа: http://localhost:8080/   Тест: http://localhost:8080/Тест/
```

## Ответы пользователю

- По-русски. Имена способностей полностью (Правосудие, не «суд»).
- У чисел всегда единицы: т, HP, %, ходы, заряды, ресурс (ярость, мана, энергия…).
