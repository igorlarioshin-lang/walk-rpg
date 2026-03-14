const cron = require('node-cron');
const { syncAllPlayers } = require('../services/stravaService');

// Синхронизация шагов каждую ночь в 02:00
cron.schedule('0 2 * * *', async () => {
  console.log('⏰ Запуск ночной синхронизации шагов...');
  await syncAllPlayers();
});

// Сброс недельных шагов каждый понедельник в 00:00
cron.schedule('0 0 * * 1', async () => {
  const db = require('../db');
  console.log('📅 Сброс недельных шагов...');
  await db.query(`UPDATE characters SET weekly_steps = 0, status = 'active'`);
  console.log('✅ Недельные шаги сброшены');
});

console.log('✅ Cron jobs запущены');
