# Тела живого боя

Игра сама находит папки здесь, список в коде вести не нужно. Залил папку в `main`, лаунчер скачал, и в следующем бою юнит уже в новом теле.

## Кадры

`<папка>/<направление>_<анимация>_<номер>.png`, например `shaman/5_run_03.png`.

- PNG 256×512, прозрачный фон, ступни в точке x=128, y≈458, рост фигуры ≈130 px (как у `monk/`).
- Анимация: `idle` (1 кадр, `_00`), `run` (бег), `act` (удар или каст). Номера подряд с `00`: игра берёт кадры, пока не встретит пропуск.
- Направления 0–7: 3 — лицом к камере, 4 — вниз-вправо, 5 — вправо, 6 — вверх-вправо, 7 — спиной. 0, 1, 2 можно не рисовать: игра отразит 6, 5, 4.
- Обязателен `3_idle_00.png`. По нему игра понимает, что папка есть.
- Нет `run`: юнит стоит на месте, пока идёт. Нет `act`: на ударе вздрагивает.

## Имена папок

Герои: папка спека важнее папки класса (`monk_brewmaster` раньше `monk`).

| Класс | Папка | Спеки |
|---|---|---|
| Воин | `warrior` | `warrior_arms`, `warrior_fury`, `warrior_protection` |
| Паладин | `paladin` | `paladin_holy`, `paladin_protection`, `paladin_retribution` |
| Охотник | `hunter` | `hunter_beast_mastery`, `hunter_marksmanship`, `hunter_survival` |
| Разбойник | `rogue` | `rogue_assassination`, `rogue_combat`, `rogue_subtlety` |
| Жрец | `priest` | `priest_discipline`, `priest_holy`, `priest_shadow` |
| Рыцарь смерти | `deathknight` | `deathknight_blood`, `deathknight_frost`, `deathknight_unholy` |
| Шаман | `shaman` | `shaman_elemental`, `shaman_enhancement`, `shaman_restoration` |
| Маг | `mage` | `mage_arcane`, `mage_fire`, `mage_frost` |
| Чернокнижник | `warlock` | `warlock_affliction`, `warlock_demonology`, `warlock_destruction` |
| Монах | `monk` | `monk_brewmaster`, `monk_mistweaver`, `monk_windwalker` |
| Друид | `druid` | `druid_balance`, `druid_feral`, `druid_guardian`, `druid_restoration` |
| Гном-инженер | `engineer` | `engineer_mechanist`, `engineer_sapper` |
| Охотник на демонов | `demonhunter` | `demonhunter_vengeance`, `demonhunter_havoc` |

Мобы Нефрита:

| Моб | Папка |
|---|---|
| Страж монастыря | `mob_guard` |
| Нефритовый страж | `mob_elite` |
| Нефритовый лучник | `mob_archer` |
| Монастырская целительница | `mob_healer` |
| Ткач тумана | `mob_caster` |
| Тень ша | `mob_assassin` |
| Глыба ша | `mob_brute` |
| Ученик | `mob_disciple` |
| Нефритовый боец | `mob_charger` или `mob_jade_fighter` |
| Сгусток ша | `mob_wisp` или `mob_sha_clot` |
| Ша сомнения (босс) | `mob_boss` или `mob_sha_doubt` |

Питомцы: `pet_ghoul` (вурдалак), `pet_beast` (зверь охотника), `pet_niuzao` (Нюцзао), `pet_totem` (Тотем потока), `pet_gargoyle` (Горгулья).
