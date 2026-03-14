// Этот файл импортируется из сервера для отправки уведомлений через бота

let botInstance = null;

function getBot() {
  if (!botInstance) {
    const TelegramBot = require('node-telegram-bot-api');
    botInstance = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
  }
  return botInstance;
}

async function notifySeasonStart(season_id) {
  const db = require('../db');
  const bot = getBot();

  const players = await db.query(`
    SELECT p.telegram_id, t.name as tavern_name, t.emoji
    FROM players p
    JOIN characters c ON c.player_id = p.id AND c.season_id = $1
    JOIN taverns t ON t.id = c.tavern_id
  `, [season_id]);

  for (const p of players.rows) {
    try {
      await bot.sendMessage(p.telegram_id,
        `🚀 *Сезон начался!*\n${p.emoji} Таверна ${p.tavern_name} выдвигается!\nНорма: 12 000 шагов в день 👣`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[
            { text: '🗺️ Открыть карту', web_app: { url: `${process.env.MINIAPP_URL}?id=${p.telegram_id}` } }
          ]]}
        }
      );
    } catch(e) { /* игнорируем ошибки отправки */ }
  }
}

async function notifyBossMet(tavern_id, boss_name, boss_emoji) {
  const db = require('../db');
  const bot = getBot();

  const players = await db.query(`
    SELECT p.telegram_id FROM players p
    JOIN characters c ON c.player_id = p.id
    WHERE c.tavern_id = $1
  `, [tavern_id]);

  for (const p of players.rows) {
    try {
      await bot.sendMessage(p.telegram_id,
        `⚔️ *Босс встречен!*\nВаш отряд добрался до ${boss_emoji} *${boss_name}*!\nОткрой рейд и соверши своё действие!`,
        { parse_mode: 'Markdown' }
      );
    } catch(e) {}
  }
}

async function notifyVictory(tavern_id, is_final) {
  const db = require('../db');
  const bot = getBot();

  const players = await db.query(`
    SELECT p.telegram_id FROM players p
    JOIN characters c ON c.player_id = p.id
    WHERE c.tavern_id = $1
  `, [tavern_id]);

  const msg = is_final
    ? `🏆 *СЕЗОН ЗАВЕРШЁН!*\nВаша гильдия победила Тёмного Властелина и выиграла Кубок сезона! 🏆`
    : `✅ *Босс повержён!*\nОтряд движется к следующей локации!`;

  for (const p of players.rows) {
    try {
      await bot.sendMessage(p.telegram_id, msg, { parse_mode: 'Markdown' });
    } catch(e) {}
  }
}

async function notifyWeeklyReset(tavern_id) {
  const db = require('../db');
  const bot = getBot();

  const members = await db.query(`
    SELECT p.telegram_id, p.first_name, c.weekly_steps, c.status
    FROM players p JOIN characters c ON c.player_id = p.id
    WHERE c.tavern_id = $1
  `, [tavern_id]);

  for (const m of members.rows) {
    const pct = Math.round((m.weekly_steps / 84000) * 100);
    const emoji = m.status === 'knockout' ? '😵' : m.status === 'exhausted' ? '😓' : '💪';
    try {
      await bot.sendMessage(m.telegram_id,
        `📅 *Итоги недели*\n\n${emoji} Ты прошёл ${m.weekly_steps.toLocaleString()} / 84 000 шагов (${pct}%)\n` +
        (m.status === 'knockout'
          ? `⚠️ Нокаут — в этот рейд ты не участвуешь. Нужно больше ходить!`
          : `✅ Ты допущен к рейду!`),
        { parse_mode: 'Markdown' }
      );
    } catch(e) {}
  }
}

module.exports = { notifySeasonStart, notifyBossMet, notifyVictory, notifyWeeklyReset };
