-- Walk RPG Database Schema

-- Администраторы
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Сезоны
CREATE TABLE seasons (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'lobby', -- lobby | active | finished
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Таверны (гильдии)
CREATE TABLE taverns (
  id SERIAL PRIMARY KEY,
  season_id INTEGER REFERENCES seasons(id),
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  description TEXT,
  max_players INTEGER DEFAULT 4,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Игроки
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(100),
  first_name VARCHAR(100),
  strava_access_token TEXT,
  strava_refresh_token TEXT,
  strava_token_expires_at TIMESTAMP,
  strava_athlete_id BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Персонажи игроков (на каждый сезон свой)
CREATE TABLE characters (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  season_id INTEGER REFERENCES seasons(id),
  tavern_id INTEGER REFERENCES taverns(id),
  class VARCHAR(20) NOT NULL, -- warrior | mage | druid | guardian
  name VARCHAR(100),
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  hp INTEGER DEFAULT 100,
  max_hp INTEGER DEFAULT 100,
  attack INTEGER DEFAULT 10,
  defense INTEGER DEFAULT 5,
  status VARCHAR(20) DEFAULT 'active', -- active | knockout | inactive
  total_steps INTEGER DEFAULT 0,
  weekly_steps INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, season_id)
);

-- Ежедневные шаги
CREATE TABLE daily_steps (
  id SERIAL PRIMARY KEY,
  character_id INTEGER REFERENCES characters(id),
  date DATE NOT NULL,
  steps INTEGER DEFAULT 0,
  synced_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(character_id, date)
);

-- Локации на карте
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  season_id INTEGER REFERENCES seasons(id),
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  steps_required INTEGER NOT NULL, -- шагов гильдии чтобы дойти
  created_at TIMESTAMP DEFAULT NOW()
);

-- Боссы
CREATE TABLE bosses (
  id SERIAL PRIMARY KEY,
  location_id INTEGER REFERENCES locations(id),
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  description TEXT,
  hp INTEGER NOT NULL,
  max_hp INTEGER NOT NULL,
  attack INTEGER NOT NULL,
  weekly_steps_required INTEGER NOT NULL, -- шагов гильдии за неделю чтобы открыть бой
  mechanic TEXT, -- описание особой механики
  is_final BOOLEAN DEFAULT FALSE
);

-- Прогресс гильдий на карте
CREATE TABLE guild_progress (
  id SERIAL PRIMARY KEY,
  tavern_id INTEGER REFERENCES taverns(id),
  season_id INTEGER REFERENCES seasons(id),
  current_location_id INTEGER REFERENCES locations(id),
  total_steps BIGINT DEFAULT 0,
  guild_hp INTEGER DEFAULT 400,
  guild_max_hp INTEGER DEFAULT 400,
  status VARCHAR(20) DEFAULT 'traveling', -- traveling | boss_fight | victory | defeated
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tavern_id, season_id)
);

-- Рейды на боссов
CREATE TABLE raids (
  id SERIAL PRIMARY KEY,
  guild_progress_id INTEGER REFERENCES guild_progress(id),
  boss_id INTEGER REFERENCES bosses(id),
  boss_current_hp INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- active | victory | defeat
  started_at TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP
);

-- Действия в рейде
CREATE TABLE raid_actions (
  id SERIAL PRIMARY KEY,
  raid_id INTEGER REFERENCES raids(id),
  character_id INTEGER REFERENCES characters(id),
  action_type VARCHAR(20) NOT NULL, -- attack | spell | heal | defend
  value INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Мобы на тропинке (для автобоя)
CREATE TABLE mobs (
  id SERIAL PRIMARY KEY,
  location_id INTEGER REFERENCES locations(id),
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  hp INTEGER NOT NULL,
  attack INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  gold_reward INTEGER NOT NULL
);

-- Лог автобоя
CREATE TABLE autobattle_log (
  id SERIAL PRIMARY KEY,
  guild_progress_id INTEGER REFERENCES guild_progress(id),
  event_type VARCHAR(30) NOT NULL, -- move | mob_encounter | mob_defeat | level_up
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Кубки победителей
CREATE TABLE trophies (
  id SERIAL PRIMARY KEY,
  season_id INTEGER REFERENCES seasons(id),
  tavern_id INTEGER REFERENCES taverns(id),
  awarded_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_characters_player ON characters(player_id);
CREATE INDEX idx_characters_tavern ON characters(tavern_id);
CREATE INDEX idx_daily_steps_character ON daily_steps(character_id);
CREATE INDEX idx_daily_steps_date ON daily_steps(date);
CREATE INDEX idx_guild_progress_tavern ON guild_progress(tavern_id);
CREATE INDEX idx_raid_actions_raid ON raid_actions(raid_id);
CREATE INDEX idx_autobattle_log_guild ON autobattle_log(guild_progress_id);
