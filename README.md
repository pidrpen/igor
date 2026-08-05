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
index.html              # shell: разметка + подключение CSS/JS
css/main.css            # стили
js/
  core.js               # баланс-панель, FX, портреты, хелперы
  enemies.js            # аффиксы + шаблоны врагов/боссов
  route.js              # данжи, таланты, граф маршрута
  gear.js               # экипировка
  combat.js             # бой (системы + loop)
  save.js               # localStorage / export-import
  ui.js                 # лобби, комнаты, boot
wow-mop-data.js         # базовые классы/спеки
class-balance/          # патчи 5.4.8 lite (единый apply(classes))
  *-abilities.js
  apply-all.js
assets/                 # портреты, фоны
tests/
  run-smoke.py          # smoke: структура + баланс (Chrome/Edge headless)
  balance-smoke.js      # то же для Node (если есть)
  load-check.js
  browser-smoke.html
```

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
