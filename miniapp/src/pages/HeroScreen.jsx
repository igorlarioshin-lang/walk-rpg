import { useState, useEffect } from 'react';

const CLASS_INFO = {
  warrior:  { emoji: '⚔️', name: 'Воин',      color: '#e74c3c', action: 'Атака',      desc: 'Наносит основной урон боссу' },
  mage:     { emoji: '🔮', name: 'Маг',       color: '#9b59b6', action: 'Заклинание', desc: 'Урон + ослабляет защиту' },
  druid:    { emoji: '🌿', name: 'Друид',     color: '#2ecc71', action: 'Исцеление',  desc: 'Восстанавливает HP гильдии' },
  guardian: { emoji: '🛡️', name: 'Хранитель', color: '#3498db', action: 'Защита',     desc: 'Блокирует урон от босса' },
};

const STATUS_INFO = {
  active:    { emoji: '💪', label: 'В форме',   color: '#2ecc71' },
  tired:     { emoji: '😐', label: 'Устал',     color: '#f39c12' },
  exhausted: { emoji: '😓', label: 'Истощён',   color: '#e67e22' },
  knockout:  { emoji: '😵', label: 'Нокаут',    color: '#e74c3c' },
};

export default function HeroScreen({ player }) {
  if (!player) return <Empty />;

  const cls    = CLASS_INFO[player.class]  || CLASS_INFO.warrior;
  const status = STATUS_INFO[player.status] || STATUS_INFO.active;

  const xpPct      = Math.round((player.xp / player.max_xp) * 100) || 0;
  const hpPct      = Math.round((player.hp / player.max_hp) * 100);
  const weeklyPct  = Math.min(100, Math.round((player.weekly_steps / 84000) * 100));
  const dailyPct   = Math.min(100, Math.round(((player.today_steps || 0) / 12000) * 100));

  return (
    <div style={{ padding: 16 }}>

      {/* Карточка персонажа */}
      <div style={{
        background: `linear-gradient(135deg, #161b22, #0d1117)`,
        border: `1px solid ${cls.color}40`,
        borderRadius: 16, padding: 20, marginBottom: 16,
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Фоновый класс-эмодзи */}
        <div style={{
          position: 'absolute', right: -10, top: -10,
          fontSize: 100, opacity: 0.06, userSelect: 'none'
        }}>
          {cls.emoji}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: `${cls.color}20`,
            border: `2px solid ${cls.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32
          }}>
            {cls.emoji}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#e8dcc8' }}>
              {player.first_name}
            </div>
            <div style={{ color: cls.color, fontSize: 14 }}>{cls.name}</div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 4, background: `${status.color}20`,
              border: `1px solid ${status.color}40`,
              borderRadius: 20, padding: '2px 8px', fontSize: 11, color: status.color
            }}>
              {status.emoji} {status.label}
            </div>
          </div>
        </div>

        {/* HP */}
        <Bar
          label="❤️ HP"
          value={`${player.hp}/${player.max_hp}`}
          pct={hpPct}
          color={hpPct > 60 ? '#2ecc71' : hpPct > 30 ? '#f39c12' : '#e74c3c'}
        />

        {/* XP */}
        <Bar
          label={`✨ XP — Уровень ${player.level}`}
          value={`${player.xp}/${player.max_xp}`}
          pct={xpPct}
          color="#f1c40f"
        />
      </div>

      {/* Шаги */}
      <div style={{
        background: '#161b22', border: '1px solid #30363d',
        borderRadius: 12, padding: 16, marginBottom: 16
      }}>
        <div style={{ color: '#f1c40f', fontWeight: 'bold', marginBottom: 12 }}>
          👣 Активность
        </div>

        <Bar
          label="Сегодня"
          value={`${(player.today_steps || 0).toLocaleString()} / 12 000`}
          pct={dailyPct}
          color="#3498db"
        />
        <div style={{ height: 8 }} />
        <Bar
          label="За неделю (норма для боя)"
          value={`${(player.weekly_steps || 0).toLocaleString()} / 84 000`}
          pct={weeklyPct}
          color={weeklyPct >= 100 ? '#2ecc71' : weeklyPct >= 70 ? '#f39c12' : '#e74c3c'}
        />

        <div style={{
          marginTop: 12, padding: '10px 12px',
          background: '#21262d', borderRadius: 8, fontSize: 12, color: '#8b949e'
        }}>
          💡 Выполни 100% нормы чтобы участвовать в рейде на босса в полную силу
        </div>
      </div>

      {/* Характеристики */}
      <div style={{
        background: '#161b22', border: '1px solid #30363d',
        borderRadius: 12, padding: 16, marginBottom: 16
      }}>
        <div style={{ color: '#f1c40f', fontWeight: 'bold', marginBottom: 12 }}>
          📊 Характеристики
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Stat icon="⚔️" label="Атака"  value={player.attack}  />
          <Stat icon="🛡️" label="Защита" value={player.defense} />
          <Stat icon="👣" label="Шагов всего" value={parseInt(player.total_steps || 0).toLocaleString()} />
          <Stat icon="🏰" label="Таверна" value={player.tavern_name} small />
        </div>
      </div>

      {/* Роль в рейде */}
      <div style={{
        background: `${cls.color}10`,
        border: `1px solid ${cls.color}30`,
        borderRadius: 12, padding: 16
      }}>
        <div style={{ color: cls.color, fontWeight: 'bold', marginBottom: 6 }}>
          {cls.emoji} Твоя роль в рейде
        </div>
        <div style={{ color: '#e8dcc8', fontSize: 14, fontWeight: 'bold' }}>
          {cls.action}
        </div>
        <div style={{ color: '#8b949e', fontSize: 12, marginTop: 4 }}>
          {cls.desc}
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, pct, color }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8b949e', marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color: '#e8dcc8' }}>{value}</span>
      </div>
      <div style={{ height: 8, background: '#21262d', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4, transition: 'width 0.6s ease',
          width: `${Math.max(2, pct)}%`, background: color
        }} />
      </div>
    </div>
  );
}

function Stat({ icon, label, value, small }) {
  return (
    <div style={{ background: '#21262d', borderRadius: 8, padding: '8px 12px' }}>
      <div style={{ color: '#8b949e', fontSize: 10, marginBottom: 2 }}>{icon} {label}</div>
      <div style={{ color: '#e8dcc8', fontWeight: 'bold', fontSize: small ? 11 : 15 }}>{value}</div>
    </div>
  );
}

function Empty() {
  return (
    <div style={{ padding: 32, textAlign: 'center', color: '#8b949e' }}>
      Персонаж не найден
    </div>
  );
}
