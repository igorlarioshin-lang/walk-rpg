# 🚀 Инструкция по запуску Walk RPG

---

## Шаг 1 — Создай Telegram бота (5 минут)

1. Открой Telegram, найди @BotFather
2. Напиши `/newbot`
3. Введи название бота, например: `Walk RPG`
4. Введи username бота, например: `walk_rpg_bot`
5. BotFather пришлёт токен вида: `7123456789:AAHdqTcvCH1vGWJxfSeofSs0K57L2G0olMo`
6. **Сохрани этот токен** — он нужен в `.env`

Узнай свой Telegram ID:
- Напиши @userinfobot в Telegram
- Он пришлёт твой ID (число) — это твой `ADMIN_TELEGRAM_ID`

---

## Шаг 2 — Создай Strava приложение (5 минут)

1. Зайди на https://www.strava.com/settings/api
2. Нажми "Create & Manage Your App"
3. Заполни:
   - Application Name: `Walk RPG`
   - Category: `Other`
   - Website: `https://t.me/walk_rpg_bot` (замени на своего бота)
   - Authorization Callback Domain: `твой-домен.railway.app` (заполним позже)
4. Нажми Save
5. Сохрани `Client ID` и `Client Secret`

---

## Шаг 3 — Залей код на GitHub (3 минуты)

1. Зайди на https://github.com и создай новый репозиторий `walk-rpg`
2. Установи Git если нет: https://git-scm.com
3. В папке с проектом выполни:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/ТВО_ИМЯ/walk-rpg.git
git push -u origin main
```

---

## Шаг 4 — Задеплой сервер на Railway (10 минут)

1. Зайди на https://railway.app
2. Нажми "New Project" → "Deploy from GitHub repo"
3. Выбери репозиторий `walk-rpg`
4. Railway автоматически определит Node.js проект

### Добавь базу данных:
1. В проекте нажми "New" → "Database" → "PostgreSQL"
2. Railway создаст БД и добавит переменную `DATABASE_URL` автоматически

### Настрой переменные окружения:
В Railway → твой сервис → Variables добавь:

```
TELEGRAM_BOT_TOKEN=токен_от_BotFather
ADMIN_TELEGRAM_ID=твой_telegram_id
STRAVA_CLIENT_ID=id_из_strava
STRAVA_CLIENT_SECRET=secret_из_strava
STRAVA_REDIRECT_URI=https://твой-домен.railway.app/auth/strava/callback
MINIAPP_URL=https://твой-miniapp.vercel.app
NODE_ENV=production
```

### Узнай домен Railway:
- В Railway → Settings → Domains
- Скопируй домен вида `walk-rpg-production.up.railway.app`
- Вставь его в `STRAVA_REDIRECT_URI`

### Заполни базу данных:
1. В Railway → PostgreSQL → Query
2. Вставь и выполни содержимое файла `database/schema.sql`
3. Потом вставь и выполни `database/seed.sql`

---

## Шаг 5 — Обнови Strava приложение

1. Вернись на https://www.strava.com/settings/api
2. В поле "Authorization Callback Domain" вставь домен Railway:
   `walk-rpg-production.up.railway.app`
3. Сохрани

---

## Шаг 6 — Задеплой Mini App на Vercel (5 минут)

1. Зайди на https://vercel.com
2. "New Project" → импортируй репозиторий
3. В настройках укажи папку `miniapp` как root directory
4. Добавь переменную:
   ```
   VITE_SERVER_URL=https://твой-домен.railway.app
   ```
5. Deploy!
6. Скопируй URL вида `walk-rpg-miniapp.vercel.app`
7. Вставь его в Railway переменную `MINIAPP_URL`

---

## Шаг 7 — Зарегистрируй Mini App в Telegram

1. Напиши @BotFather
2. `/newapp` → выбери своего бота
3. Вставь URL Mini App: `https://walk-rpg-miniapp.vercel.app`
4. BotFather зарегистрирует приложение

---

## Шаг 8 — Добавь себя как администратора

В Railway → PostgreSQL → Query выполни:

```sql
INSERT INTO admins (telegram_id) VALUES (ТВО_TELEGRAM_ID);
```

---

## Готово! Проверка

1. Найди своего бота в Telegram
2. Напиши `/start` — должно появиться лобби с тавернами
3. Напиши `/admin` — должна появиться панель администратора

---

## Команды бота

| Команда | Описание |
|---|---|
| `/start` | Начать игру, выбрать таверну и класс |
| `/mysteps` | Посмотреть свои шаги за сегодня и неделю |
| `/guild` | Состояние своей гильдии |
| `/admin` | Панель администратора (только для admin) |

---

## Если что-то не работает

**Бот не отвечает:**
- Проверь токен в Railway Variables
- Посмотри логи: Railway → твой сервис → Logs

**Strava не подключается:**
- Проверь что домен в Strava совпадает с Railway доменом
- Проверь STRAVA_CLIENT_ID и STRAVA_CLIENT_SECRET

**База данных:**
- Убедись что выполнил schema.sql и seed.sql
- DATABASE_URL должен быть добавлен автоматически Railway

---

## Стоимость

| Сервис | Цена |
|---|---|
| Railway (сервер + БД) | $5/месяц после free trial |
| Vercel (Mini App) | Бесплатно |
| Strava API | Бесплатно |
| Telegram Bot | Бесплатно |

**Итого: ~$5/месяц**
