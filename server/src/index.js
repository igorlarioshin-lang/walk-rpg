require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
app.use(cors());
app.use(express.json());

// Роуты
app.use('/auth',    require('./routes/auth'));
app.use('/api',     require('./routes/api'));
app.use('/admin',   require('./routes/admin'));

// Cron jobs
require('./jobs/syncSteps');
require('./jobs/autobattle');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
});
require('../../bot/bot.js');