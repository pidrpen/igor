# Mythic Key — Mists of Pandaria lite

Пошаговый мифик-ключ (5 человек), классы/спеки MoP.

## Запуск

Из этой папки подними локальный сервер и открой `index.html`:

```bash
python -m http.server 8080
# → http://localhost:8080/
```

## Тестовая комната (анимации)

В лобби кнопка **«Тестовая комната (анимации)»**:

1. Список всех специализаций → выбор → **Запустить комнату**
2. Арена: герой слева · **Злой дух** справа (враг по умолчанию)
3. Кнопки / клавиши: Idle · удар героя (1) · удар врага (2) · оба (3)

Спрайты: **стиль 02 · 16-bit SNES** (72×72 → ×5 nearest) — `assets/sprites/characters/`  
Реестр: `js/test-room/sprites.js` + `assets/sprites/manifest.json`  
Сборка: `tools/build_v02_anims.py` (из `предложения ИИ/02_pixel_16bit_snes.jpg`)  
Сейчас: **paladin:retribution** + **evil_spirit**. Idle статичный.  
В тестовой комнате — скиллы спека из `WOW_MOP` (клавиши 1–9); per-skill анимации через `skills` / `skill_<id>`.  
Остальные спеки — без 2D-пака.

## Структура

```
index.html                 # shell: разметка + порядок <script>
css/main.css
js/
  state.js                 # run/combat/party + STAT/мастерство константы
  core.js                  # цвета классов, портреты, темы данжей
  ui/
    balance-panel.js       # история баланса + панель в лобби
    fx.js                  # VFX скиллов
    combat-ui.js           # ability bar, unit cards, render боя
  systems/
    telegraph-loot.js      # телеграфы, лут, key powers
    stats.js               # крит / иск / унив
    passives.js            # пассивки спеков
    meter.js               # Recount
    ability-data.js        # PET/HoT/школы/описания
    resources.js           # ресурсы + charges
    combat-loop.js         # startCombat / processTurn / endRound
    abilities.js           # castAbility
    damage.js              # dealDmg / heal / block-parry-revenge
    ai.js                  # ИИ
    combat-flow.js         # afterAction, victory, rest
  enemies.js route.js gear.js save.js ui.js
  combat.js                # shim (не подключается)
wow-mop-data.js
class-balance/
assets/
tests/
```

Зоны правок: **цифры скилла** → `class-balance/`; **блок/парир/реванш** → `systems/damage.js`; **заряды** → `systems/resources.js`; **пассивки** → `systems/passives.js`; **changelog UI** → `ui/balance-panel.js`.



Бэкап монолита (до разбиения): `index.html.monolith.bak`.

## Class-balance (контракт)

Каждый пакет регистрирует:

```js
CLASS_BALANCE_PACKS.push({ id: 'warrior', apply(classes) { /* ... */ } });
```

`apply-all.js` применяет все пакеты к `WOW_MOP.classes`.  
Legacy-глобалы (`WOW_WARRIOR_BALANCE`, `PALADIN_BALANCE`, …) по-прежнему понимаются.

## Тесты

```bash
python tests/run-smoke.py
# или: node tests/load-check.js && node tests/balance-smoke.js
```

## Upgrade pack (v2)

1. **Boss mechanics** — mid-боссы и 3-фазные финалы на каждое подземелье (кик/бастер/адды)
2. **Weekly affixes** — ротация недели + новые: Кровавый, Тяжёлый, Сотрясающий, Бесплотный, Страждущий
3. **Kick windows** — приоритет кастов (P1–P4), цветные телеграфы, эскалация за пропущенный кик
4. **Threat / tank** — таблица угрозы, провокация, бастеры по не-танку больнее, метки TANK/OT
5. **Play-style loot** — Lust, battle-rez, обход trash, щит отряда, метка, kick-CD, активные тринкеты
6. **Route variety** — случайные элит-ветки, optional risk room, side path
7. **UI refresh** — тёмная editorial-палитра, Cinzel + DM Sans, threat chips, week badge
