# 🏰 Walk RPG

RPG-игра в Telegram где твои реальные шаги прокачивают персонажа.

## Структура проекта

```
walk-rpg/
├── database/          # SQL схема и начальные данные
│   ├── schema.sql     # Структура таблиц
│   └── seed.sql       # Локации, боссы, мобы
├── server/            # Бэкенд (Node.js + Express)
│   └── src/
│       ├── index.js           # Точка входа
│       ├── db.js              # Подключение к БД
│       ├── routes/
│       │   ├── api.js         # API для Mini App
│       │   ├── auth.js        # Strava OAuth
│       │   └── admin.js       # Панель администратора
│       ├── services/
│       │   ├── stravaService.js    # Синхронизация шагов
│       │   ├── raidService.js      # Механика боёв
│       │   ├── autobattleService.js # Автобой
│       │   └── botService.js       # Уведомления
│       └── jobs/
│           ├── syncSteps.js    # Ночная синхронизация
│           └── autobattle.js   # Автобой каждые 30 мин
├── bot/
│   └── bot.js         # Telegram бот
├── miniapp/           # React Mini App
│   └── src/
│       ├── App.jsx
│       ├── pages/
│       │   ├── MapScreen.jsx      # Карта мира
│       │   ├── HeroScreen.jsx     # Персонаж и шаги
│       │   ├── RaidScreen.jsx     # Бой с боссом
│       │   ├── LogScreen.jsx      # Журнал похода
│       │   └── LeaderScreen.jsx   # Рейтинг гильдий
│       └── services/
│           └── api.js
└── DEPLOY.md          # Инструкция по запуску

```

## Быстрый старт

Читай **DEPLOY.md** — там пошаговая инструкция.

## Технологии

- **Бэкенд:** Node.js, Express, PostgreSQL
- **Бот:** node-telegram-bot-api
- **Mini App:** React + Vite
- **Шаги:** Strava API
- **Хостинг:** Railway (сервер + БД) + Vercel (Mini App)
