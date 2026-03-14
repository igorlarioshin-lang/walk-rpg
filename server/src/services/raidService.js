// Механика боёв с боссами

const CLASS_ACTIONS = {
  warrior:  { type: 'attack',  label: '⚔️ Атака',     description: 'Наносит урон боссу' },
  mage:     { type: 'spell',   label: '🔮 Заклинание', description: 'Урон + ослабляет защиту' },
  druid:    { type: 'heal',    label: '🌿 Исцеление',  description: 'Восстанавливает HP гильдии' },
  guardian: { type: 'defend',  label: '🛡️ Защита',     description: 'Снижает урон босса' },
};

// Базовый урон по классу
const BASE_DAMAGE = {
  warrior:  { min: 30, max: 50 },
  mage:     { min: 25, max: 45 },
  druid:    { min: 0,  max: 0  },
  guardian: { min: 0,  max: 0  },
};

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function performAction(raid, char, action_type, db) {
  const expectedAction = CLASS_ACTIONS[char.class];
  if (!expectedAction || expectedAction.type !== action_type) {
    throw new Error(`Воин класса ${char.class} не может выполнить действие ${action_type}`);
  }

  let value = 0;
  let description = '';
  let bossHpChange = 0;
  let guildHpChange = 0;

  // Бонус от уровня персонажа
  const levelBonus = Math.floor(char.level * 2);

  switch (char.class) {
    case 'warrior':
      value = rand(BASE_DAMAGE.warrior.min, BASE_DAMAGE.warrior.max) + levelBonus;
      bossHpChange = -value;
      description = `⚔️ ${char.name} наносит ${value} урона!`;
      break;

    case 'mage':
      value = rand(BASE_DAMAGE.mage.min, BASE_DAMAGE.mage.max) + levelBonus;
      bossHpChange = -value;
      description = `🔮 ${char.name} применяет заклинание! ${value} урона и ослабляет защиту!`;
      break;

    case 'druid':
      value = rand(40, 70) + levelBonus;
      guildHpChange = value;
      description = `🌿 ${char.name} исцеляет отряд на ${value} HP!`;
      break;

    case 'guardian':
      value = rand(20, 40) + levelBonus;
      description = `🛡️ ${char.name} принимает удар на себя, блокируя ${value} урона!`;
      break;
  }

  // Записываем действие
  await db.query(`
    INSERT INTO raid_actions (raid_id, character_id, action_type, value, description)
    VALUES ($1, $2, $3, $4, $5)
  `, [raid.id, char.id, action_type, value, description]);

  // Обновляем HP босса
  if (bossHpChange !== 0) {
    await db.query(`
      UPDATE raids SET boss_current_hp = GREATEST(0, boss_current_hp + $1)
      WHERE id = $2
    `, [bossHpChange, raid.id]);
  }

  // Обновляем HP гильдии
  if (guildHpChange !== 0) {
    await db.query(`
      UPDATE guild_progress SET guild_hp = LEAST(guild_max_hp, guild_hp + $1)
      WHERE id = $2
    `, [guildHpChange, char.guild_progress_id]);
  }

  // Получаем обновлённое состояние рейда
  const updatedRaid = await db.query(
    'SELECT * FROM raids WHERE id = $1', [raid.id]
  );

  const r = updatedRaid.rows[0];

  // Проверяем победу — босс повержен
  if (r.boss_current_hp <= 0) {
    await db.query(`
      UPDATE raids SET status = 'victory', finished_at = NOW() WHERE id = $1
    `, [raid.id]);

    // Начисляем XP всем участникам
    await db.query(`
      UPDATE characters SET
        xp = xp + 500,
        level = CASE WHEN xp + 500 >= level * 100 THEN level + 1 ELSE level END
      WHERE tavern_id = $1
    `, [char.tavern_id]);

    // Продвигаем гильдию к следующей локации
    await advanceGuild(char.guild_progress_id, db);

    return { success: true, description, victory: true, message: '🏆 Босс повержен! Гильдия движется дальше!' };
  }

  // Ответный удар босса в конце дня считается в cron job
  return { success: true, description, victory: false, boss_hp: r.boss_current_hp };
}

async function advanceGuild(guildProgressId, db) {
  const gp = await db.query(
    'SELECT * FROM guild_progress WHERE id = $1', [guildProgressId]
  );
  const { season_id, current_location_id } = gp.rows[0];

  const nextLocation = await db.query(`
    SELECT id FROM locations
    WHERE season_id = $1 AND order_index > (
      SELECT order_index FROM locations WHERE id = $2
    )
    ORDER BY order_index LIMIT 1
  `, [season_id, current_location_id]);

  if (nextLocation.rows[0]) {
    await db.query(`
      UPDATE guild_progress SET current_location_id = $1, status = 'traveling'
      WHERE id = $2
    `, [nextLocation.rows[0].id, guildProgressId]);
  } else {
    // Финальный босс побеждён — победа в сезоне!
    await db.query(`
      UPDATE guild_progress SET status = 'victory' WHERE id = $1
    `, [guildProgressId]);

    const tavern = await db.query(`
      SELECT tavern_id, season_id FROM guild_progress WHERE id = $1
    `, [guildProgressId]);

    await db.query(`
      INSERT INTO trophies (season_id, tavern_id)
      VALUES ($1, $2)
    `, [tavern.rows[0].season_id, tavern.rows[0].tavern_id]);

    await db.query(`
      UPDATE seasons SET status = 'finished', finished_at = NOW()
      WHERE id = $1
    `, [tavern.rows[0].season_id]);
  }
}

module.exports = { performAction, advanceGuild, CLASS_ACTIONS };
