import { useState, useEffect } from 'react';
import { getMap } from '../services/api';

const LOCATION_COLORS = ['#27ae60', '#3498db', '#9b59b6', '#e67e22', '#e74c3c'];

export default function MapScreen({ player }) {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!player?.season_id) return;
    getMap(player.season_id)
      .then(d => { setMapData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [player]);

  if (loading) return <Loading />;
  if (!mapData) return <Empty />;

  const { locations, guilds } = mapData;

  // Находим гильдию текущего игрока
  const myGuild = guilds.find(g => g.tavern_id === player?.tavern_id);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: '#f1c40f', fontSize: 16, marginBottom: 4, letterSpacing: 1 }}>
        🗺️ КАРТА СЕЗОНА
      </h2>
      <p style={{ color: '#8b949e', fontSize: 12, marginBottom: 20 }}>
        Первая гильдия дошедшая до конца побеждает 🏆
      </p>

      {/* Карта локаций */}
      <div style={{ position: 'relative' }}>
        {locations.map((loc, i) => {
          const guildsHere = guilds.filter(g => g.location_index === loc.order_index);
          const isMyLocation = myGuild?.location_index === loc.order_index;

          return (
            <div key={loc.id} style={{ marginBottom: 8 }}>
              {/* Локация */}
              <div style={{
                background: isMyLocation
                  ? 'linear-gradient(135deg, #1a2f1a, #162316)'
                  : '#161b22',
                border: `1px solid ${isMyLocation ? '#2ecc71' : '#30363d'}`,
                borderRadius: 12, padding: '14px 16px',
                position: 'relative', overflow: 'hidden'
              }}>
                {/* Фоновый цвет локации */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0, width: 4,
                  background: LOCATION_COLORS[i] || '#8b949e', borderRadius: '12px 0 0 12px'
                }} />

                <div style={{ marginLeft: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 20 }}>{loc.emoji}</span>
                      <span style={{
                        marginLeft: 8, fontWeight: 'bold', fontSize: 15,
                        color: isMyLocation ? '#2ecc71' : '#e8dcc8'
                      }}>
                        {loc.name}
                      </span>
                    </div>
                    {loc.boss_name && (
                      <div style={{
                        background: '#2d1a1a', border: '1px solid #e74c3c',
                        borderRadius: 8, padding: '3px 8px', fontSize: 11, color: '#e74c3c'
                      }}>
                        {loc.boss_emoji} {loc.boss_name}
                      </div>
                    )}
                  </div>

                  {/* Гильдии на этой локации */}
                  {guildsHere.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {guildsHere.map(g => (
                        <div key={g.tavern_id} style={{
                          background: g.tavern_id === player?.tavern_id ? '#1a3a1a' : '#21262d',
                          border: `1px solid ${g.tavern_id === player?.tavern_id ? '#2ecc71' : '#30363d'}`,
                          borderRadius: 20, padding: '4px 10px', fontSize: 12,
                          color: g.tavern_id === player?.tavern_id ? '#2ecc71' : '#8b949e',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          <span>{g.tavern_emoji}</span>
                          <span>{g.tavern_name}</span>
                          {g.status === 'boss_fight' && (
                            <span style={{ color: '#e74c3c' }}>⚔️</span>
                          )}
                          {g.status === 'victory' && (
                            <span>🏆</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Стрелка вниз между локациями */}
              {i < locations.length - 1 && (
                <div style={{ textAlign: 'center', color: '#30363d', fontSize: 20, lineHeight: 1.2 }}>
                  ↓
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Моя гильдия — статистика */}
      {myGuild && (
        <div style={{
          marginTop: 20, background: '#161b22',
          border: '1px solid #30363d', borderRadius: 12, padding: 16
        }}>
          <div style={{ color: '#f1c40f', fontWeight: 'bold', marginBottom: 12 }}>
            {myGuild.tavern_emoji} {myGuild.tavern_name}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Stat label="👣 Шагов всего" value={parseInt(myGuild.total_steps).toLocaleString()} />
            <Stat label="❤️ HP гильдии" value={`${myGuild.guild_hp}/${myGuild.guild_max_hp}`} />
            <Stat label="📍 Локация" value={`${myGuild.location_index}/5`} />
            <Stat label="📊 Статус" value={STATUS_LABEL[myGuild.status] || myGuild.status} />
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_LABEL = {
  traveling: '🚶 В пути',
  boss_fight: '⚔️ Бой с боссом',
  victory: '🏆 Победа!',
  defeated: '💀 Поражение'
};

function Stat({ label, value }) {
  return (
    <div style={{ background: '#21262d', borderRadius: 8, padding: '8px 12px' }}>
      <div style={{ color: '#8b949e', fontSize: 10, marginBottom: 2 }}>{label}</div>
      <div style={{ color: '#e8dcc8', fontWeight: 'bold', fontSize: 14 }}>{value}</div>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ padding: 32, textAlign: 'center', color: '#8b949e' }}>
      Загружаем карту...
    </div>
  );
}

function Empty() {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
      <div style={{ color: '#8b949e' }}>Карта недоступна. Сезон ещё не начался.</div>
    </div>
  );
}
