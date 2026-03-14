import { useState, useEffect } from 'react';
import { getLeaderboard } from '../services/api';

export default function LeaderScreen({ player }) {
  const [board, setBoard]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!player?.season_id) return;
    getLeaderboard(player.season_id)
      .then(d => { setBoard(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [player]);

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: '#8b949e' }}>Загрузка...</div>;

  const MEDALS = ['🥇', '🥈', '🥉', '4️⃣'];

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: '#f1c40f', fontSize: 16, marginBottom: 4, letterSpacing: 1 }}>
        🏆 РЕЙТИНГ ГИЛЬДИЙ
      </h2>
      <p style={{ color: '#8b949e', fontSize: 12, marginBottom: 16 }}>
        Кто дальше прошёл по карте
      </p>

      {board.map((g, i) => {
        const isMe = g.tavern_name === player?.tavern_name;
        return (
          <div key={i} style={{
            background: isMe ? '#1a2d1a' : '#161b22',
            border: `1px solid ${isMe ? '#2ecc71' : '#30363d'}`,
            borderRadius: 12, padding: '14px 16px', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 14
          }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>
              {MEDALS[i] || '🎖️'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{g.emoji}</span>
                <span style={{
                  fontWeight: 'bold', fontSize: 15,
                  color: isMe ? '#2ecc71' : '#e8dcc8'
                }}>
                  {g.name}
                </span>
                {parseInt(g.trophies) > 0 && (
                  <span title="Кубок победителя">🏆</span>
                )}
              </div>
              <div style={{ color: '#8b949e', fontSize: 11, marginTop: 4 }}>
                📍 {g.location_name} · 👣 {parseInt(g.total_steps).toLocaleString()} шагов
              </div>
            </div>
            <div style={{
              background: STATUS_COLOR[g.status] + '20',
              border: `1px solid ${STATUS_COLOR[g.status]}40`,
              borderRadius: 8, padding: '4px 10px',
              fontSize: 11, color: STATUS_COLOR[g.status], flexShrink: 0
            }}>
              {STATUS_LABEL[g.status] || g.status}
            </div>
          </div>
        );
      })}

      {board.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: '#8b949e' }}>
          Рейтинг появится после старта сезона
        </div>
      )}
    </div>
  );
}

const STATUS_LABEL = {
  traveling:  '🚶 В пути',
  boss_fight: '⚔️ Рейд',
  victory:    '🏆 Победа!',
  defeated:   '💀 Пал'
};

const STATUS_COLOR = {
  traveling:  '#3498db',
  boss_fight: '#e74c3c',
  victory:    '#f1c40f',
  defeated:   '#8b949e'
};
