# BLT Character Sheet (MVP)

Отдельное веб-приложение для зрителей: интерактивный лист героя в стиле DnD-карточки.
**Код мода Bannerlord / BLT не меняет.** Данные берутся из ответов бота в Twitch-чате.

## Что умеет MVP

- Официальный **Twitch Embed** (просмотры считаются, когда стрим идёт)
- Вход через **Twitch OAuth** + подключение к чату (IRC)
- Кнопка обновления листа → шлёт `!info`, парсит ответ бота `[BLT]`
- Модули (расширяемо): **Обзор**, **Инвентарь**, **Предметы**, **Ретинью**
- **Демо-данные** без игры
- Работает при **оффлайн-стриме**, если кампания запущена и бот BLT в чате (как обычно у мода)

## Почему не нужен платный хостинг

| Часть | Где живёт |
|--------|-----------|
| UI (HTML/JS) | **GitHub Pages** или localhost (бесплатно). Не бесплатный Neocities — см. ниже |
| Логин зрителя | **Twitch OAuth** |
| Команды и данные героя | **Twitch Chat** ↔ бот BLT на ПК стримера |
| Плеер | **player.twitch.tv** embed |

Зрители **не подключаются к твоему компьютеру напрямую**. Они пишут в чат через Twitch; бот в игре отвечает — страница это читает.

## Быстрый старт (локально)

1. Скопируй `config.example.js` → уже есть `config.js`, заполни:
   - `twitchClientId` — из [Twitch Developer Console](https://dev.twitch.tv/console)
   - `channel` — логин канала стримера
2. В Twitch App добавь OAuth Redirect URL **точно**:
   - `http://localhost:5500/`  
     (или тот origin+path, откуда открываешь `index.html`)
3. Подними статический сервер из этой папки (ES-modules не работают с `file://`):

```bash
# Python
python -m http.server 5500

# или Node
npx --yes serve -l 5500
```

4. Открой `http://localhost:5500/`
5. Войти Twitch → **Чат** → **Обновить лист**

## Важно про Neocities

**Бесплатный Neocities не подходит для этого приложения.**  
У них CSP: `connect-src 'self'` — браузер **не может** ходить на `api.twitch.tv` и открывать WebSocket чата Twitch. Отсюда ошибка `Failed to fetch` после логина, чат тоже не подключится.

Платный Neocities Supporter снимает ограничение; проще и бесплатно — **GitHub Pages** или локальный `localhost`.

## GitHub Pages (рабочий бесплатный вариант)

1. Залей репозиторий / включи Pages (Settings → Pages → Deploy from branch).
2. Корень сайта либо `/CompiledDevelopedApp/`, либо вынеси содержимое этой папки в `docs/` / gh-pages.
3. В Twitch App добавь Redirect URL, например:
   - `https://USER.github.io/REPO/CompiledDevelopedApp/`
4. В `config.js` укажи `twitchClientId` и `channel`.
5. Зрители открывают:
   - `https://USER.github.io/REPO/CompiledDevelopedApp/?channel=streamer`

`?channel=` перекрывает значение из конфига — удобно для разных стримеров с одной сборкой.

## Настройка BLT (без правок кода)

В **BLT Configure** у команды Hero Info включи то, что хочешь видеть на листе:

- Show Gold / General / Top Skills / Attributes  
- Show Inventory, Civilian Inventory, Storage  
- Show Retinue (+ List), Secondary Retinue (+ List)  
- Powers / Stats — по желанию  

Имя команды должно совпадать с `infoCommand` в `config.js` (по умолчанию `!info`).

Префикс бота (`[BLT] `) — как в Auth / Bot Message Prefix; при другом префиксе поправь `botPrefix` в конфиге.

## Как добавить модуль

1. Создай `js/modules/myfeature.js`
2. Зарегистрируй:

```js
import { registerModule } from "../core/registry.js";

registerModule({
  id: "myfeature",
  title: "Моя фича",
  order: 50,
  mount(root, api) {
    root.innerHTML = `<p>Hello</p>`;
    // api.store, api.commandBus, api.toast, api.loadDemo()
  },
});
```

3. Импортируй файл в `js/app.js`.

## Ограничения MVP (честно)

- Парсинг чата зависит от формата ответа бота и настроек Info; длинные ответы режутся на несколько сообщений — приложение их склеивает за окно ~4.5 с.
- Нужны scopes `chat:read` + `chat:edit` (кнопки шлют команды от имени зрителя).
- Implicit OAuth (`response_type=token`) удобен для GitHub Pages; Client ID публичный — это нормально для SPA.
- Полноценный «живой» JSON из игры без чата потребовал бы API в моде или туннель — в этом MVP сознательно не делаем.

## Структура

```
CompiledDevelopedApp/
  index.html
  config.js / config.example.js
  css/sheet.css
  js/
    app.js
    core/          # state, registry, twitch, parser, command bus
    modules/       # overview, inventory, items, retinue
```
