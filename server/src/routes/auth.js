const express = require('express');
const axios = require('axios');
const router = express.Router();
const db = require('../db');

// Шаг 1 — редирект на Strava
router.get('/strava', (req, res) => {
  const { telegram_id } = req.query;
  const url = `https://www.strava.com/oauth/authorize?` +
    `client_id=${process.env.STRAVA_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.STRAVA_REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=activity:read_all` +
    `&state=${telegram_id}`;
  res.redirect(url);
});

// Шаг 2 — Strava возвращает код
router.get('/strava/callback', async (req, res) => {
  const { code, state: telegram_id } = req.query;

  try {
    // Меняем код на токен
    const tokenRes = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token, expires_at, athlete } = tokenRes.data;

    // Сохраняем токен игрока
    await db.query(`
      UPDATE players SET
        strava_access_token = $1,
        strava_refresh_token = $2,
        strava_token_expires_at = to_timestamp($3),
        strava_athlete_id = $4
      WHERE telegram_id = $5
    `, [access_token, refresh_token, expires_at, athlete.id, telegram_id]);

    // Закрываем окно и возвращаем в бот
    res.send(`
      <html><body>
        <h2>✅ Strava подключена!</h2>
        <p>Можешь закрыть это окно и вернуться в Telegram.</p>
        <script>
          setTimeout(() => window.close(), 2000);
        </script>
      </body></html>
    `);

  } catch (err) {
    console.error('Strava auth error:', err.message);
    res.status(500).send('Ошибка подключения Strava. Попробуй ещё раз.');
  }
});

module.exports = router;
