import { useState, useEffect } from 'react';
import { getAutobattle } from '../services/api';

const EVENT_STYLE = {
  move:          { color: '#3498db',  icon: '🚶' },
  mob_encounter: { color: '#e67e22',  icon: '⚠️' },
  mob_defeat:    { color: '#2ecc71',  icon: '⚔️' },
  level_up:      { color: '#f1c40f',  icon: '⬆️' },
};

export default function LogScreen({ player }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!player?.tavern_id) return;
    getAutobattle(player.tavern_id)
      .then(d => { setLogs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [player]);

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: '#8b949e' }}>Загрузка...</div>;

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: '#f1c40f', fontSize: 16, marginBottom: 4, letterSpacing: 1 }}>
        📜 ЖУРНАЛ ПОХОДА
      </h2>
      <p style={{ color: '#8b949e', fontSize: 12, marginBottom: 16 }}>
        Что происходило с твоим отрядом пока ты ходил
      </p>

      {logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📜</div>
          <div style={{ color: '#8b949e' }}>Журнал пуст. Иди гулять — тогда появятся события!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {logs.map((log, i) => {
            const style = EVENT_STYLE[log.event_type] || { color: '#8b949e', icon: '•' };
            const time  = new Date(log.created_at);
            return (
              <div key={i} style={{
                background: '#161b22',
                border: `1px solid ${style.color}30`,
                borderLeft: `3px solid ${style.color}`,
                borderRadius: '0 10px 10px 0',
                padding: '10px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 10
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{style.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#e8dcc8', fontSize: 13 }}>{log.description}</div>
                  <div style={{ color: '#8b949e', fontSize: 10, marginTop: 3 }}>
                    {time.toLocaleDateString('ru')} {time.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
