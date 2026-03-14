const db = require('../db');

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Симуляция автобоя для одной гильдии
async function simulateGuild(guildProgress) {
  const { id, tavern_id, current_location_id, total_steps } = guildProgress;

  // Получаем мобов локации
  const mobs = await db.query(
    'SELECT * FROM mobs WHERE location_id = $1', [current_location_id]
  );
  if (!mobs.rows.length) return;

  // Получаем персонажей гильдии
  const chars = await db.query(`
    SELECT * FROM characters
    WHERE tavern_id = $1 AND status != 'inactive'
    AND season_id = (SELECT season_id FROM guild_progress WHERE id = $2)
  `, [tavern_id, id]);

  if (!chars.rows.length) return;

  // Считаем силу отряда на основе шагов за сегодня
  const todaySteps = await db.query(`
    SELECT COALESCE(SUM(ds.steps), 0) as total
    FROM daily_steps ds
    JOIN characters c ON c.id = ds.character_id
    WHERE c.tavern_id = $1 AND ds.date = CURRENT_DATE
  `, [tavern_id]);

  const steps = parseInt(todaySteps.rows[0].total);

  // Если шагов нет — отряд не движется
  if (steps < 1000) {
    await logEvent(id, 'move', '😴 Отряд отдыхает... нужно больше шагов!');
    return;
  }

  // Скорость зависит от шагов
  let speedLabel = '🐢 Еле ползут';
  if (steps >= 48000) speedLabel = '💨 Мчатся вперёд';
  else if (steps >= 30000) speedLabel = '🏃 Бодро шагают';
  else if (steps >= 20000) speedLabel = '🚶 Идут';

  await logEvent(id, 'move', `${speedLabel} (${steps.toLocaleString()} шагов сегодня)`);

  // С шансом встречаем моба
  const encounterChance = Math.min(0.8, steps / 60000);
  if (Math.random() < encounterChance) {
    const mob = mobs.rows[rand(0, mobs.rows.length - 1)];

    // Считаем атаку отряда
    const teamAtk = chars.rows.reduce((sum, c) => sum + c.attack, 0);
    const rounds = Math.ceil(mob.hp / Math.max(1, teamAtk - mob.attack / 2));

    if (rounds <= 5) {
      // Победа
      await logEvent(id, 'mob_defeat',
        `⚔️ Отряд встретил ${mob.emoji} ${mob.name} и победил за ${rounds} раундов! +${mob.xp_reward} XP`
      );

      // Начисляем XP персонажам
      for (const char of chars.rows) {
        const newXp = char.xp + mob.xp_reward;
        const newLevel = Math.floor(1 + Math.sqrt(newXp / 50));

        if (newLevel > char.level) {
          await logEvent(id, 'level_up',
            `⬆️ ${getClassEmoji(char.class)} ${char.name} достиг ${newLevel} уровня!`
          );
        }

        await db.query(`
          UPDATE characters SET xp = $1, level = $2 WHERE id = $3
        `, [newXp, newLevel, char.id]);
      }
    } else {
      // Отряд потрепали
      const damage = rand(5, 15);
      await logEvent(id, 'mob_encounter',
        `💥 ${mob.emoji} ${mob.name} оказался силён! Отряд получил ${damage} урона но отступил`
      );

      await db.query(`
        UPDATE guild_progress SET guild_hp = GREATEST(10, guild_hp - $1) WHERE id = $2
      `, [damage, id]);
    }
  }
}

function getClassEmoji(cls) {
  const map = { warrior: '⚔️', mage: '🔮', druid: '🌿', guardian: '🛡️' };
  return map[cls] || '👤';
}

async function logEvent(guildProgressId, eventType, description) {
  await db.query(`
    INSERT INTO autobattle_log (guild_progress_id, event_type, description)
    VALUES ($1, $2, $3)
  `, [guildProgressId, eventType, description]);
}

// Запустить автобой для всех активных гильдий
async function runAutobattle() {
  const guilds = await db.query(`
    SELECT gp.*
    FROM guild_progress gp
    JOIN seasons s ON s.id = gp.season_id
    WHERE s.status = 'active' AND gp.status = 'traveling'
  `);

  for (const guild of guilds.rows) {
    await simulateGuild(guild);
  }
}

module.exports = { runAutobattle };
