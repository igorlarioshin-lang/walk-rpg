const cron = require('node-cron');
const { runAutobattle } = require('../services/autobattleService');

// Автобой каждые 30 минут
cron.schedule('*/30 * * * *', async () => {
  await runAutobattle();
});

console.log('✅ Autobattle job запущен (каждые 30 минут)');
