const express = require('express');
const router = express.Router();
const db = require('../db');

// Получить состояние игры для игрока
router.get('/player/:telegram_id', async (req, res) => {
  try {
    const { telegram_id } = req.params;

    const player = await db.query(`
      SELECT p.*, c.*, t.name as tavern_name, t.emoji as tavern_emoji,
             gp.total_steps as guild_steps, gp.guild_hp, gp.guild_max_hp,
             gp.status as guild_status, l.name as location_name, l.emoji as location_emoji
      FROM players p
      LEFT JOIN characters c ON c.player_id = p.id AND c.season_id = (
        SELECT id FROM seasons WHERE status = 'active' LIMIT 1
      )
      LEFT JOIN taverns t ON t.id = c.tavern_id
      LEFT JOIN guild_progress gp ON gp.tavern_id = c.tavern_id
      LEFT JOIN locations l ON l.id = gp.current_location_id
      WHERE p.telegram_id = $1
    `, [telegram_id]);

    if (!player.rows[0]) return res.status(404).json({ error: 'Игрок не найден' });
    res.json(player.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получить состояние лобби (все таверны)
router.get('/lobby', async (req, res) => {
  try {
    const season = await db.query(`SELECT * FROM seasons WHERE status = 'lobby' LIMIT 1`);
    if (!season.rows[0]) return res.json({ status: 'no_lobby' });

    const taverns = await db.query(`
      SELECT t.*,
        COUNT(c.id) as players_count,
        json_agg(json_build_object(
          'class', c.class,
          'name', c.name,
          'first_name', p.first_name
        ) ORDER BY c.created_at) FILTER (WHERE c.id IS NOT NULL) as members
      FROM taverns t
      LEFT JOIN characters c ON c.tavern_id = t.id AND c.season_id = $1
      LEFT JOIN players p ON p.id = c.player_id
      WHERE t.season_id = $1
      GROUP BY t.id
      ORDER BY t.id
    `, [season.rows[0].id]);

    res.json({ season: season.rows[0], taverns: taverns.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получить карту и прогресс всех гильдий
router.get('/map/:season_id', async (req, res) => {
  try {
    const { season_id } = req.params;

    const locations = await db.query(`
      SELECT l.*, b.name as boss_name, b.emoji as boss_emoji,
             b.hp as boss_hp, b.max_hp as boss_max_hp, b.is_final
      FROM locations l
      LEFT JOIN bosses b ON b.location_id = l.id
      WHERE l.season_id = $1
      ORDER BY l.order_index
    `, [season_id]);

    const guilds = await db.query(`
      SELECT gp.*, t.name as tavern_name, t.emoji as tavern_emoji,
             l.order_index as location_index
      FROM guild_progress gp
      JOIN taverns t ON t.id = gp.tavern_id
      JOIN locations l ON l.id = gp.current_location_id
      WHERE gp.season_id = $1
      ORDER BY l.order_index DESC, gp.total_steps DESC
    `, [season_id]);

    res.json({ locations: locations.rows, guilds: guilds.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получить текущий рейд гильдии
router.get('/raid/:tavern_id', async (req, res) => {
  try {
    const { tavern_id } = req.params;

    const raid = await db.query(`
      SELECT r.*, b.name as boss_name, b.emoji as boss_emoji,
             b.max_hp as boss_max_hp, b.attack as boss_attack, b.mechanic,
             gp.guild_hp, gp.guild_max_hp
      FROM raids r
      JOIN bosses b ON b.id = r.boss_id
      JOIN guild_progress gp ON gp.id = r.guild_progress_id
      WHERE gp.tavern_id = $1 AND r.status = 'active'
      ORDER BY r.started_at DESC LIMIT 1
    `, [tavern_id]);

    if (!raid.rows[0]) return res.json({ raid: null });

    // Последние действия
    const actions = await db.query(`
      SELECT ra.*, c.class, c.name as character_name
      FROM raid_actions ra
      JOIN characters c ON c.id = ra.character_id
      WHERE ra.raid_id = $1
      ORDER BY ra.created_at DESC LIMIT 20
    `, [raid.rows[0].id]);

    // Статусы персонажей гильдии
    const members = await db.query(`
      SELECT c.class, c.name, c.status, c.hp, c.max_hp, c.level,
             c.weekly_steps,
             EXISTS(
               SELECT 1 FROM raid_actions ra
               WHERE ra.raid_id = $1 AND ra.character_id = c.id
               AND DATE(ra.created_at) = CURRENT_DATE
             ) as acted_today
      FROM characters c
      WHERE c.tavern_id = $2 AND c.season_id = (
        SELECT season_id FROM guild_progress WHERE tavern_id = $2 LIMIT 1
      )
    `, [raid.rows[0].id, tavern_id]);

    res.json({ raid: raid.rows[0], actions: actions.rows, members: members.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Совершить действие в рейде
router.post('/raid/action', async (req, res) => {
  try {
    const { telegram_id, action_type } = req.body;

    // Получаем персонажа
    const charRes = await db.query(`
      SELECT c.*, gp.id as guild_progress_id, gp.tavern_id
      FROM characters c
      JOIN guild_progress gp ON gp.tavern_id = c.tavern_id
      JOIN players p ON p.id = c.player_id
      WHERE p.telegram_id = $1 AND c.status = 'active'
    `, [telegram_id]);

    const char = charRes.rows[0];
    if (!char) return res.status(400).json({ error: 'Персонаж не найден или в нокауте' });

    // Находим активный рейд
    const raidRes = await db.query(`
      SELECT * FROM raids WHERE guild_progress_id = $1 AND status = 'active'
    `, [char.guild_progress_id]);

    const raid = raidRes.rows[0];
    if (!raid) return res.status(400).json({ error: 'Нет активного рейда' });

    // Проверяем не действовал ли уже сегодня
    const alreadyActed = await db.query(`
      SELECT id FROM raid_actions
      WHERE raid_id = $1 AND character_id = $2 AND DATE(created_at) = CURRENT_DATE
    `, [raid.id, char.id]);

    if (alreadyActed.rows[0]) {
      return res.status(400).json({ error: 'Ты уже совершил действие сегодня' });
    }

    // Считаем значение действия по классу
    const result = await require('../services/raidService').performAction(
      raid, char, action_type, db
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Лог автобоя
router.get('/autobattle/:tavern_id', async (req, res) => {
  try {
    const { tavern_id } = req.params;
    const logs = await db.query(`
      SELECT al.*
      FROM autobattle_log al
      JOIN guild_progress gp ON gp.id = al.guild_progress_id
      WHERE gp.tavern_id = $1
      ORDER BY al.created_at DESC LIMIT 30
    `, [tavern_id]);
    res.json(logs.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Таблица лидеров
router.get('/leaderboard/:season_id', async (req, res) => {
  try {
    const { season_id } = req.params;
    const result = await db.query(`
      SELECT t.name, t.emoji, gp.total_steps, gp.status,
             l.name as location_name, l.order_index,
             (SELECT COUNT(*) FROM trophies WHERE tavern_id = t.id) as trophies
      FROM guild_progress gp
      JOIN taverns t ON t.id = gp.tavern_id
      JOIN locations l ON l.id = gp.current_location_id
      WHERE gp.season_id = $1
      ORDER BY l.order_index DESC, gp.total_steps DESC
    `, [season_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
