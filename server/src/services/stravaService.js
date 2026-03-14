const axios = require('axios');
const db = require('../db');

// Обновить токен если истёк
async function refreshToken(player) {
  if (new Date(player.strava_token_expires_at) > new Date()) {
    return player.strava_access_token;
  }

  const res = await axios.post('https://www.strava.com/oauth/token', {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    refresh_token: player.strava_refresh_token,
    grant_type: 'refresh_token'
  });

  const { access_token, refresh_token, expires_at } = res.data;

  await db.query(`
    UPDATE players SET
      strava_access_token = $1,
      strava_refresh_token = $2,
      strava_token_expires_at = to_timestamp($3)
    WHERE id = $4
  `, [access_token, refresh_token, expires_at, player.id]);

  return access_token;
}

// Получить шаги за конкретный день из Strava
async function fetchStepsForDate(player, date) {
  try {
    const token = await refreshToken(player);

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const res = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        after: Math.floor(startOfDay.getTime() / 1000),
        before: Math.floor(endOfDay.getTime() / 1000),
        per_page: 50
      }
    });

    // Считаем шаги из всех активностей за день
    // Strava даёт step_count для пешеходных активностей
    let totalSteps = 0;
    for (const activity of res.data) {
      if (['Walk', 'Run', 'Hike'].includes(activity.type)) {
        // Если есть точный счётчик шагов
        if (activity.step_count) {
          totalSteps += activity.step_count;
        } else {
          // Иначе считаем по расстоянию (примерно 1300 шагов/км)
          totalSteps += Math.floor((activity.distance / 1000) * 1300);
        }
      }
    }

    return totalSteps;
  } catch (err) {
    console.error(`Strava fetch error for player ${player.id}:`, err.message);
    return 0;
  }
}

// Синхронизировать шаги всех игроков за вчера
async function syncAllPlayers() {
  console.log('🔄 Синхронизация шагов Strava...');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  // Получаем всех игроков со Strava токеном в активном сезоне
  const players = await db.query(`
    SELECT p.*, c.id as character_id, c.tavern_id, c.season_id
    FROM players p
    JOIN characters c ON c.player_id = p.id
    JOIN seasons s ON s.id = c.season_id
    WHERE p.strava_access_token IS NOT NULL AND s.status = 'active'
  `);

  for (const player of players.rows) {
    const steps = await fetchStepsForDate(player, yesterday);

    // Сохраняем шаги дня
    await db.query(`
      INSERT INTO daily_steps (character_id, date, steps)
      VALUES ($1, $2, $3)
      ON CONFLICT (character_id, date) DO UPDATE SET steps = $3, synced_at = NOW()
    `, [player.character_id, dateStr, steps]);

    // Обновляем недельные шаги персонажа
    const weeklyRes = await db.query(`
      SELECT COALESCE(SUM(steps), 0) as total
      FROM daily_steps
      WHERE character_id = $1 AND date >= date_trunc('week', CURRENT_DATE)
    `, [player.character_id]);

    const weeklySteps = parseInt(weeklyRes.rows[0].total);

    // Определяем статус персонажа на основе нормы
    let status = 'active';
    const weeklyNorm = 84000; // 12000 * 7
    const pct = weeklySteps / weeklyNorm;

    if (pct < 0.5) status = 'knockout';
    else if (pct < 0.7) status = 'exhausted';
    else if (pct < 1.0) status = 'tired';

    await db.query(`
      UPDATE characters SET
        weekly_steps = $1,
        total_steps = total_steps + $2,
        status = $3
      WHERE id = $4
    `, [weeklySteps, steps, status, player.character_id]);

    // Обновляем шаги гильдии
    if (steps > 0) {
      await db.query(`
        UPDATE guild_progress SET total_steps = total_steps + $1
        WHERE tavern_id = $2 AND season_id = $3
      `, [steps, player.tavern_id, player.season_id]);
    }

    console.log(`✅ ${player.first_name}: ${steps} шагов`);
  }

  // Обновляем прогресс на карте
  await updateMapProgress();

  console.log('✅ Синхронизация завершена');
}

// Проверяем дошли ли гильдии до следующей локации
async function updateMapProgress() {
  const guilds = await db.query(`
    SELECT gp.*, l.steps_required, l.order_index
    FROM guild_progress gp
    JOIN locations l ON l.id = gp.current_location_id
    JOIN seasons s ON s.id = gp.season_id
    WHERE s.status = 'active' AND gp.status = 'traveling'
  `);

  for (const guild of guilds.rows) {
    if (guild.total_steps >= guild.steps_required) {
      // Гильдия дошла до босса — начинаем рейд
      const boss = await db.query(
        'SELECT * FROM bosses WHERE location_id = $1', [guild.current_location_id]
      );

      if (boss.rows[0]) {
        await db.query(`
          UPDATE guild_progress SET status = 'boss_fight' WHERE id = $1
        `, [guild.id]);

        // Создаём рейд если его ещё нет
        const existingRaid = await db.query(`
          SELECT id FROM raids WHERE guild_progress_id = $1 AND status = 'active'
        `, [guild.id]);

        if (!existingRaid.rows[0]) {
          await db.query(`
            INSERT INTO raids (guild_progress_id, boss_id, boss_current_hp)
            VALUES ($1, $2, $3)
          `, [guild.id, boss.rows[0].id, boss.rows[0].hp]);

          console.log(`⚔️ Гильдия ${guild.tavern_id} встретила босса!`);
        }
      }
    }
  }
}

module.exports = { syncAllPlayers, fetchStepsForDate };
