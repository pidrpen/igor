# Mythic Key — Mists of Pandaria lite

Пошаговый мифик-ключ (5 человек), классы/спеки MoP.

## Запуск

Из этой папки подними локальный сервер и открой `index.html`:

```bash
python -m http.server 8080
# → http://localhost:8080/
```

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
