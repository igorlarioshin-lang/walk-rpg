const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware — проверка что запрос от администратора
const checkAdmin = async (req, res, next) => {
  const { telegram_id } = req.body.telegram_id ? req.body : req.query;
  if (!telegram_id) return res.status(401).json({ error: 'Не авторизован' });

  const admin = await db.query(
    'SELECT id FROM admins WHERE telegram_id = $1', [telegram_id]
  );
  if (!admin.rows[0]) return res.status(403).json({ error: 'Нет доступа' });
  next();
};

// Получить состояние лобби для админа
router.get('/lobby', checkAdmin, async (req, res) => {
  try {
    const season = await db.query(`SELECT * FROM seasons WHERE status = 'lobby' LIMIT 1`);
    if (!season.rows[0]) return res.json({ status: 'no_lobby' });

    const taverns = await db.query(`
      SELECT t.*,
        COUNT(c.id) as players_count,
        BOOL_AND(p.strava_access_token IS NOT NULL) as all_connected,
        json_agg(json_build_object(
          'class', c.class,
          'name', p.first_name,
          'strava_connected', p.strava_access_token IS NOT NULL
        ) ORDER BY c.created_at) FILTER (WHERE c.id IS NOT NULL) as members
      FROM taverns t
      LEFT JOIN characters c ON c.tavern_id = t.id AND c.season_id = $1
      LEFT JOIN players p ON p.id = c.player_id
      WHERE t.season_id = $1
      GROUP BY t.id
      ORDER BY t.id
    `, [season.rows[0].id]);

    const allReady = true;

    res.json({
      season: season.rows[0],
      taverns: taverns.rows,
      can_start: allReady
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Запустить сезон
router.post('/start-season', checkAdmin, async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const season = await client.query(`
      UPDATE seasons SET status = 'active', started_at = NOW()
      WHERE status = 'lobby'
      RETURNING *
    `);

    if (!season.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Нет активного лобби' });
    }

    const s = season.rows[0];

    // Проверяем что все таверны заполнены
    const taverns = await client.query(`
      SELECT t.id, COUNT(c.id) as cnt
      FROM taverns t
      LEFT JOIN characters c ON c.tavern_id = t.id AND c.season_id = $1
      WHERE t.season_id = $1
      GROUP BY t.id
    `, [s.id]);

    const notFull = taverns.rows.filter(t => parseInt(t.cnt) < 4);
    if (notFull.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Не все таверны заполнены' });
    }

    // Получаем первую локацию
    const firstLocation = await client.query(`
      SELECT id FROM locations WHERE season_id = $1 ORDER BY order_index LIMIT 1
    `, [s.id]);

    // Создаём guild_progress для каждой таверны
    await client.query(`
      INSERT INTO guild_progress (tavern_id, season_id, current_location_id)
      SELECT id, $1, $2 FROM taverns WHERE season_id = $1
    `, [s.id, firstLocation.rows[0].id]);

    await client.query('COMMIT');

    // Уведомляем всех через бота
    await require('../services/botService').notifySeasonStart(s.id);

    res.json({ success: true, season: s });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// Кикнуть игрока из таверны
router.post('/kick-player', checkAdmin, async (req, res) => {
  try {
    const { character_id } = req.body;
    await db.query('DELETE FROM characters WHERE id = $1', [character_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
