# AFK Rome Village

Ранний браузерный прототип idle-игры: римская деревня растёт, легион автоматически держит
рубеж против волн орков. Играть: https://zebrapozer.github.io/AFK_Rome_Village/
(после включения GitHub Pages).

## Быстрый запуск

Самый простой способ: дважды кликнуть `prototype/index.html` — игра откроется в браузере
(сохранение тоже работает). Или через локальный сервер:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory prototype
```

Открыть <http://127.0.0.1:4173>. Зависимости, сборка и backend не нужны.

## Структура

```
README.md               этот файл
AGENTS.md               правила для ИИ-агентов (Codex, Claude): проверки, стиль, соглашения
HANDOFF_FOR_CODEX.md    последняя передача работы: что сделано и что дальше
ASSET_REQUESTS.md       какие картинки нужно отрендерить
PLAYTEST.md             памятка для тестеров: как играть, как выгрузить статистику, вопросы
index.html              переадресация на prototype/ (вход для GitHub Pages)

docs/
  GAME_DESIGN.md        геймдизайн-документ; актуальные решения — в конце
  META_LOOP.md          долгосрочная прогрессия (30 волн и дальше)
  GAME_RULES.md         все формулы — спецификация для переноса в Unreal
  GAME_DATA_TABLES.md   таблицы, посчитанные из данных (генерируются)
  UNREAL_PORT.md        как переносить в Unreal: соответствие, порядок, проверки
  TELEMETRY.md          формат статистики плейтестов
  references/           наброски, концепт роста, документ Клода

art/                    исходная графика в полном размере (её правим и заменяем)
  characters/           спрайты героев и врагов, уже вырезанные, с прозрачностью
  icons/                головы, ресурсы, иконка приложения
  buildings/  obstacles/  landscape/  sky/
  concepts/             концепт-арты (в игре не используются)
  _archive/             старые варианты и лишнее — в игре не используется

prototype/              сама игра (это и публикует GitHub Pages)
  index.html  style.css  manifest.webmanifest
  data/*.json           ВСЕ числа игры (враги, волны, баланс, цены, герои, боссы, офлайн)
  data/game-data.js     собирается из JSON (node prototype/tools/build-data.cjs)
  src/sim/              правила игры без экрана — то, что переносится в Unreal
  src/audio, render, ui звук, отрисовка, интерфейс (в Unreal делаются заново)
  src/main.js           запуск
  golden/               эталонные сценарии для проверки Unreal-версии
  assets/               облегчённые копии из art/ — генерируются, руками не править
  tests/, tools/
  README.md             механики, баланс, интерфейс, сохранение, звук
```

## Как добавить или заменить картинку

1. Положить файл в нужную папку `art/` (PNG с настоящей прозрачностью).
2. Если это новый файл — добавить строку в список `ASSETS` в `prototype/tools/build_assets.py`
   и путь в `prototype/src/render/assets.js`.
3. Запустить `python3 prototype/tools/build_assets.py` (нужен Pillow) — обновится `prototype/assets/`.

## Как поменять число в игре

Все числа — в `prototype/data/*.json` (у каждого файла есть `_doc` с пояснением). После правки:

```sh
node prototype/tools/build-data.cjs      # пересобрать data/game-data.js
node prototype/tools/gen-rules.cjs       # обновить docs/GAME_DATA_TABLES.md
node prototype/tools/export-golden.cjs   # обновить эталоны, если изменение задумано
```

## Проверки

```sh
node prototype/tests/wave-balance.cjs
node prototype/tools/balance-bot.cjs
```

## Текущее состояние

Один легионер на старте, 1–5 врагов в волне, развитие поселения после боссов, растущая деревня.
У каждого героя свой спелл, слоты героев открываются с поселением (1/2/3), есть ротация
с усталостью и «свежими силами». Интерфейс в телефоне, синтезированные звуки, сохранение
и AFK-доход, игра на весь экран на телефоне. Подробно — в `prototype/README.md`.
