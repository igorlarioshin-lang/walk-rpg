process.env.LANG = 'en_US.UTF-8';
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const db = require('./db');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const CLASSES = {
  warrior:  { label: '⚔️ Воин',      desc: 'Основной урон по боссу' },
  mage:     { label: '🔮 Маг',       desc: 'Урон + ослабляет защиту' },
  druid:    { label: '🌿 Друид',     desc: 'Исцеляет гильдию' },
  guardian: { label: '🛡️ Хранитель', desc: 'Защищает от урона' },
};

// /start — регистрация и показ лобби
bot.onText(/\/start/, async (msg) => {
  const { id: telegram_id, first_name, username } = msg.from;

  // Создаём игрока если нет
  await db.query(`
    INSERT INTO players (telegram_id, username, first_name)
    VALUES ($1, $2, $3)
    ON CONFLICT (telegram_id) DO UPDATE SET username = $2, first_name = $3
  `, [telegram_id, username, first_name]);

  // Проверяем есть ли активный сезон или лобби
  const season = await db.query(`
    SELECT * FROM seasons WHERE status IN ('lobby', 'active') LIMIT 1
  `);

  if (!season.rows[0]) {
    return bot.sendMessage(telegram_id, '⏳ Сезон ещё не открыт. Ожидай старта!');
  }

  // Проверяем есть ли уже персонаж
  const char = await db.query(`
    SELECT c.*, t.name as tavern_name
    FROM characters c
    JOIN taverns t ON t.id = c.tavern_id
    WHERE c.player_id = (SELECT id FROM players WHERE telegram_id = $1)
    AND c.season_id = $2
  `, [telegram_id, season.rows[0].id]);

  if (char.rows[0]) {
    const c = char.rows[0];
    return bot.sendMessage(telegram_id,
      `👋 С возвращением, ${c.name}!\n\n` +
      `🏰 Таверна: ${c.tavern_name}\n` +
      `⚔️ Класс: ${CLASSES[c.class]?.label}\n` +
      `📊 Уровень: ${c.level}\n\n` +
      `Открой игру:`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '🗺️ Открыть карту', web_app: { url: `${process.env.MINIAPP_URL}?id=${telegram_id}` } }
          ]]
        }
      }
    );
  }

  // Новый игрок — показываем таверны
  await showLobby(telegram_id, season.rows[0].id);
});

// Показать лобби с тавернами
async function showLobby(telegram_id, season_id) {
  const taverns = await db.query(`
    SELECT t.*, COUNT(c.id) as players_count,
      array_agg(c.class) FILTER (WHERE c.id IS NOT NULL) as classes
    FROM taverns t
    LEFT JOIN characters c ON c.tavern_id = t.id AND c.season_id = $1
    WHERE t.season_id = $1
    GROUP BY t.id ORDER BY t.id
  `, [season_id]);

  let text = '🏙️ *Город Таверн*\nВыбери свою таверну и класс!\n\n';

  const buttons = [];
  for (const t of taverns.rows) {
    const count = parseInt(t.players_count);
    const free = 4 - count;
    const takenClasses = t.classes || [];
    const status = count >= 4 ? '🔒 Заполнена' : `🟢 ${free} места`;

    text += `${t.emoji} *${t.name}*\n`;
    text += `Игроков: ${count}/4 — ${status}\n`;
    if (takenClasses.length) {
      text += `Классы: ${takenClasses.map(c => CLASSES[c]?.label).join(', ')}\n`;
    }
    text += '\n';

    if (count < 4) {
      buttons.push([{ text: `${t.emoji} ${t.name}`, callback_data: `tavern_${t.id}` }]);
    }
  }

  bot.sendMessage(telegram_id, text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
}

// Выбор таверны
bot.on('callback_query', async (query) => {
  const { id: query_id, data, from } = query;
  const telegram_id = from.id;

  // Выбор таверны
  if (data.startsWith('tavern_')) {
    const tavern_id = parseInt(data.split('_')[1]);

    const tavern = await db.query('SELECT * FROM taverns WHERE id = $1', [tavern_id]);
    const t = tavern.rows[0];

    // Проверяем свободные классы
    const taken = await db.query(`
      SELECT class FROM characters WHERE tavern_id = $1 AND season_id = $2
    `, [tavern_id, t.season_id]);

    const takenClasses = taken.rows.map(r => r.class);
    const available = Object.keys(CLASSES).filter(c => !takenClasses.includes(c));

    if (!available.length) {
      bot.answerCallbackQuery(query_id, { text: 'Таверна заполнена!' });
      return;
    }

    const buttons = available.map(cls => [{
      text: `${CLASSES[cls].label} — ${CLASSES[cls].desc}`,
      callback_data: `class_${tavern_id}_${cls}`
    }]);

    bot.editMessageText(
      `${t.emoji} *${t.name}*\nВыбери класс персонажа:`,
      {
        chat_id: telegram_id,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      }
    );
    bot.answerCallbackQuery(query_id);
  }

  // Выбор класса
  if (data.startsWith('class_')) {
    const [, tavern_id, cls] = data.split('_');

    const player = await db.query(
      'SELECT id FROM players WHERE telegram_id = $1', [telegram_id]
    );
    const tavern = await db.query('SELECT * FROM taverns WHERE id = $1', [tavern_id]);
    const t = tavern.rows[0];

    // Создаём персонажа
    await db.query(`
      INSERT INTO characters (player_id, season_id, tavern_id, class, name)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
    `, [player.rows[0].id, t.season_id, tavern_id, cls, from.first_name]);

    bot.editMessageText(
      `✅ Персонаж создан!\n\n` +
      `${CLASSES[cls].label}\n` +
      `🏰 Таверна: ${t.emoji} ${t.name}\n\n` +
      `Теперь подключи Strava чтобы твои шаги засчитывались в игре:`,
      {
        chat_id: telegram_id,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🏃 Подключить Strava',
              url: `${process.env.SERVER_URL}/auth/strava?telegram_id=${telegram_id}`
            }
          ]]
        }
      }
    );
    bot.answerCallbackQuery(query_id);
  }
});

// /mysteps — мои шаги за сегодня
bot.onText(/\/mysteps/, async (msg) => {
  const telegram_id = msg.from.id;

  const result = await db.query(`
    SELECT ds.steps, ds.date, c.weekly_steps, c.level, c.status
    FROM daily_steps ds
    JOIN characters c ON c.id = ds.character_id
    JOIN players p ON p.id = c.player_id
    WHERE p.telegram_id = $1 AND ds.date = CURRENT_DATE
  `, [telegram_id]);

  if (!result.rows[0]) {
    return bot.sendMessage(telegram_id, '📊 Шаги за сегодня ещё не синхронизированы. Попробуй завтра утром!');
  }

  const { steps, weekly_steps, level, status } = result.rows[0];
  const norm = 12000;
  const weeklyNorm = 84000;
  const pct = Math.round((steps / norm) * 100);
  const weeklyPct = Math.round((weekly_steps / weeklyNorm) * 100);

  const statusEmoji = { active: '💪', tired: '😐', exhausted: '😓', knockout: '😵' };

  bot.sendMessage(telegram_id,
    `📊 *Твоя статистика*\n\n` +
    `👣 Сегодня: ${steps.toLocaleString()} / ${norm.toLocaleString()} (${pct}%)\n` +
    `📅 За неделю: ${weekly_steps.toLocaleString()} / ${weeklyNorm.toLocaleString()} (${weeklyPct}%)\n` +
    `⚡ Статус: ${statusEmoji[status] || '❓'} ${status}\n` +
    `📈 Уровень: ${level}`,
    { parse_mode: 'Markdown' }
  );
});

// /guild — состояние гильдии
bot.onText(/\/guild/, async (msg) => {
  const telegram_id = msg.from.id;

  const result = await db.query(`
    SELECT t.name as tavern_name, t.emoji, l.name as location, l.emoji as loc_emoji,
           gp.total_steps, gp.guild_hp, gp.guild_max_hp, gp.status,
           json_agg(json_build_object(
             'name', p.first_name, 'class', c.class,
             'level', c.level, 'weekly_steps', c.weekly_steps, 'status', c.status
           )) as members
    FROM characters c
    JOIN players p ON p.id = c.player_id
    JOIN taverns t ON t.id = c.tavern_id
    JOIN guild_progress gp ON gp.tavern_id = c.tavern_id
    JOIN locations l ON l.id = gp.current_location_id
    WHERE c.tavern_id = (
      SELECT tavern_id FROM characters c2
      JOIN players p2 ON p2.id = c2.player_id
      WHERE p2.telegram_id = $1 LIMIT 1
    )
    GROUP BY t.name, t.emoji, l.name, l.emoji, gp.total_steps, gp.guild_hp, gp.guild_max_hp, gp.status
    LIMIT 1
  `, [telegram_id]);

  if (!result.rows[0]) {
    return bot.sendMessage(telegram_id, 'Ты не состоишь в гильдии.');
  }

  const g = result.rows[0];
  const statusEmoji = { active: '💪', tired: '😐', exhausted: '😓', knockout: '😵' };

  let text = `${g.emoji} *${g.tavern_name}*\n`;
  text += `📍 Локация: ${g.loc_emoji} ${g.location}\n`;
  text += `❤️ HP гильдии: ${g.guild_hp}/${g.guild_max_hp}\n`;
  text += `👣 Всего шагов: ${parseInt(g.total_steps).toLocaleString()}\n\n`;
  text += `*Участники:*\n`;

  for (const m of g.members) {
    const cls = CLASSES[m.class]?.label || m.class;
    text += `${statusEmoji[m.status] || '❓'} ${m.name} — ${cls} (Ур.${m.level}) — ${m.weekly_steps.toLocaleString()} шагов\n`;
  }

  bot.sendMessage(telegram_id, text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '🗺️ Открыть карту', web_app: { url: `${process.env.MINIAPP_URL}?id=${telegram_id}` } }
      ]]
    }
  });
});

// Команда для администратора — /admin
bot.onText(/\/admin/, async (msg) => {
  const telegram_id = msg.from.id;

  const admin = await db.query(
    'SELECT id FROM admins WHERE telegram_id = $1', [telegram_id]
  );
  if (!admin.rows[0]) return;

  const season = await db.query(`SELECT * FROM seasons WHERE status = 'lobby' LIMIT 1`);
  if (!season.rows[0]) {
    return bot.sendMessage(telegram_id, '📊 Активное лобби не найдено.');
  }

  const taverns = await db.query(`
    SELECT t.name, t.emoji, COUNT(c.id) as cnt
    FROM taverns t
    LEFT JOIN characters c ON c.tavern_id = t.id AND c.season_id = $1
    WHERE t.season_id = $1
    GROUP BY t.id, t.name, t.emoji ORDER BY t.id
  `, [season.rows[0].id]);

  let text = `🏙️ *Админ панель — Лобби*\n\n`;
  let allReady = true;

  for (const t of taverns.rows) {
    const cnt = parseInt(t.cnt);
    const ready = cnt === 4;
    text += `${t.emoji} ${t.name}: ${cnt}/4 ${ready ? '✅' : '⏳'}\n`;
  }

  const buttons = [];
  if (allReady) {
    buttons.push([{ text: '🚀 Запустить сезон!', callback_data: 'admin_start_season' }]);
    text += '\n✅ Все таверны заполнены! Можно стартовать.';
  } else {
    text += '\n⏳ Ожидаем заполнения всех таверн...';
  }

  bot.sendMessage(telegram_id, text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
});

// Запуск сезона администратором
bot.on('callback_query', async (query) => {
  if (query.data !== 'admin_start_season') return;
  const telegram_id = query.from.id;

  const admin = await db.query('SELECT id FROM admins WHERE telegram_id = $1', [telegram_id]);
  if (!admin.rows[0]) return bot.answerCallbackQuery(query.id, { text: 'Нет доступа' });

  try {
    const axios = require('axios');
    await axios.post(`${process.env.SERVER_URL}/admin/start-season`, {
      telegram_id
    });

    bot.editMessageText('🚀 *Сезон запущен!* Удачи всем гильдиям!', {
      chat_id: telegram_id,
      message_id: query.message.message_id,
      parse_mode: 'Markdown'
    });
    bot.answerCallbackQuery(query.id, { text: 'Сезон начался!' });
  } catch (err) {
    bot.answerCallbackQuery(query.id, { text: `Ошибка: ${err.message}` });
  }
});

// Уведомить всех о старте сезона
async function notifySeasonStart(season_id) {
  const players = await db.query(`
    SELECT p.telegram_id, c.class, t.name as tavern_name, t.emoji
    FROM players p
    JOIN characters c ON c.player_id = p.id AND c.season_id = $1
    JOIN taverns t ON t.id = c.tavern_id
  `, [season_id]);

  for (const p of players.rows) {
    try {
      await bot.sendMessage(p.telegram_id,
        `🚀 *Сезон начался!*\n\n` +
        `${p.emoji} Таверна ${p.tavern_name} выдвигается в путь!\n` +
        `Ходи каждый день и прокачивай своего героя!\n\n` +
        `Норма: 12 000 шагов в день 👣`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🗺️ Открыть карту', web_app: { url: `${process.env.MINIAPP_URL}?id=${p.telegram_id}` } }
            ]]
          }
        }
      );
    } catch (e) {
      console.error(`Не удалось уведомить ${p.telegram_id}`);
    }
  }
}

module.exports = { bot, notifySeasonStart };
