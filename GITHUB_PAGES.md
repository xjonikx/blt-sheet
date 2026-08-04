# GitHub Pages — чтобы заработало у зрителей

Делай **отдельный маленький репозиторий** только под сайт (проще, чем из всего BLT).

## 1. Создай репо

1. GitHub → **New repository**
2. Имя, например: `blt-sheet`
3. Public → Create (без README, если зальёшь файлы сам)

## 2. Залей файлы

В **корень** репо положи содержимое папки `CompiledDevelopedApp`:

- `index.html`
- `config.js`
- `css/`
- `js/`

Не клади внутрь ещё одну папку `CompiledDevelopedApp` — иначе адрес будет длиннее и OAuth сломается.

Через сайт: **Add file → Upload files** → выбери все эти файлы/папки → Commit.

Или через git:

```bash
cd CompiledDevelopedApp
git init
git add index.html config.js css js
git commit -m "BLT character sheet"
git branch -M main
git remote add origin https://github.com/ТВОЙ_ЛОГИН/blt-sheet.git
git push -u origin main
```

## 3. Включи Pages

1. Репо → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / folder: `/ (root)`
4. Save
5. Через 1–2 минуты сайт будет:
   `https://ТВОЙ_ЛОГИН.github.io/blt-sheet/`

## 4. Twitch Console (обязательно)

[dev.twitch.tv/console](https://dev.twitch.tv/console) → твоё приложение → **OAuth Redirect URLs** добавь **точно**:

```
https://ТВОЙ_ЛОГИН.github.io/blt-sheet/
```

(со слэшем в конце — как откроется в браузере; если без слэша — добавь оба варианта)

`config.js` уже с твоим Client ID и каналом — ок.

## 5. Проверка

1. Открой `https://ТВОЙ_ЛОГИН.github.io/blt-sheet/`
2. Справа в блоке Redirect URI — должен совпасть с тем, что в Twitch
3. **Войти Twitch** → **Чат** → вкладка **Основные** → **!инв**

Стрим может быть оффлайн. Нужны: игра + кампания + бот BLT в чате.

## Не работает?

| Симптом | Что проверить |
|--------|----------------|
| redirect_mismatch | Redirect URL в Twitch ≠ адрес страницы |
| Failed to fetch | Не Neocities; на Pages должно быть ок |
| Чат не коннектится | Вошёл? Нажал «Чат»? |
| Нет ответа на !инв | Кампания / бот / команда в BLT Configure |
