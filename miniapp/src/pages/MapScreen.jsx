import { useState, useEffect } from 'react';
import { getMap } from '../services/api';

const LOCATION_POSITIONS = [
  { x: 20, y: 75 },
  { x: 42, y: 55 },
  { x: 60, y: 70 },
  { x: 75, y: 40 },
  { x: 55, y: 18 },
];

const GUILD_COLORS = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71'];
const GUILD_SYMBOLS = ['G', 'S', 'M', 'D'];

export default function MapScreen({ player }) {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!player?.season_id) return;
    getMap(player.season_id)
      .then(d => { setMapData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [player]);

  useEffect(() => {
    const pts = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 4 + 3,
      delay: Math.random() * 5,
    }));
    setParticles(pts);
  }, []);

  if (loading) return <Loading />;
  if (!mapData) return <Empty />;

  const { locations, guilds } = mapData;
  const myGuild = guilds?.find(g => g.tavern_id === player?.tavern_id);

  const getGuildPosition = (guild) => {
    const idx = (guild.location_index || 1) - 1;
    return LOCATION_POSITIONS[Math.min(idx, LOCATION_POSITIONS.length - 1)] || LOCATION_POSITIONS[0];
  };

  return (
    <div style={{ padding: '12px 12px 0', fontFamily: "'Georgia', serif" }}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); opacity: 0.6; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
        @keyframes pulse-ring {
          0% { r: 3; opacity: 0.5; }
          100% { r: 6; opacity: 0; }
        }
        @keyframes march {
          0% { transform: translate(-1px, 0); }
          25% { transform: translate(0, -1px); }
          50% { transform: translate(1px, 0); }
          75% { transform: translate(0, 1px); }
          100% { transform: translate(-1px, 0); }
        }
        .guild-marker { animation: march 2s ease-in-out infinite; }
      `}</style>

      <div style={{ marginBottom: 8 }}>
        <h2 style={{ color: '#d4a843', fontSize: 15, letterSpacing: 2, margin: 0, textTransform: 'uppercase' }}>
          Карта Сезона
        </h2>
        <p style={{ color: '#8b6914', fontSize: 11, margin: '2px 0 0' }}>
          Первая гильдия до Цитадели побеждает
        </p>
      </div>

      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 40%, #0a1a0d 100%)',
        borderRadius: 16,
        border: '2px solid #2a4a2a',
        overflow: 'hidden',
        boxShadow: '0 0 40px #00000080',
      }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', display: 'block' }}>

          {/* Звёзды */}
          {particles.map(p => (
            <circle key={p.id} cx={p.x} cy={p.y} r={0.2} fill="#fff" opacity={0.4}>
              <animate attributeName="opacity" values="0.2;0.8;0.2" dur={`${p.duration}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
            </circle>
          ))}

          {/* Горы */}
          <polygon points="30,85 40,60 50,85" fill="#1a2a1a" opacity={0.6} />
          <polygon points="55,80 68,52 81,80" fill="#1a2510" opacity={0.5} />

          {/* Лес */}
          {[[8,78],[12,82],[16,76],[10,70],[6,84],[14,88],[18,80]].map(([x,y],i) => (
            <g key={i}>
              <polygon points={`${x},${y} ${x-2.5},${y+5} ${x+2.5},${y+5}`} fill="#1a4a1a" opacity={0.8} />
              <polygon points={`${x},${y-2} ${x-2},${y+3} ${x+2},${y+3}`} fill="#2a6a2a" opacity={0.9} />
            </g>
          ))}

          {/* Вулкан */}
          <polygon points="75,50 68,72 82,72" fill="#3a1a0a" opacity={0.9} />
          <polygon points="75,44 71,56 79,56" fill="#5a2a0a" opacity={0.8} />
          <ellipse cx={75} cy={43} rx={2} ry={1.5} fill="#e74c3c" opacity={0.6}>
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.5s" repeatCount="indefinite" />
          </ellipse>

          {/* Замок */}
          <rect x={51} y={21} width={8} height={6} fill="#2a2a3a" />
          <rect x={50} y={19} width={2} height={4} fill="#3a3a4a" />
          <rect x={57} y={19} width={2} height={4} fill="#3a3a4a" />
          <rect x={53} y={18} width={3} height={4} fill="#3a3a4a" />
          <line x1={54.5} y1={14} x2={54.5} y2={18} stroke="#8b0000" strokeWidth={0.3} />
          <polygon points="54.5,14 57.5,15.5 54.5,17" fill="#cc0000" opacity={0.9} />

          {/* Деревня */}
          {[[57,73],[61,71],[64,74]].map(([x,y],i) => (
            <g key={i}>
              <rect x={x-1.5} y={y} width={3} height={3} fill="#3a2a1a" />
              <polygon points={`${x-2},${y} ${x},${y-2} ${x+2},${y}`} fill="#5a3a2a" />
            </g>
          ))}

          {/* Путь */}
          <polyline
            points={LOCATION_POSITIONS.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke="#8b6914" strokeWidth={0.8} strokeDasharray="2,2" opacity={0.6}
          />

          {/* Локации */}
          {locations.map((loc, i) => {
            const pos = LOCATION_POSITIONS[i];
            if (!pos) return null;
            const isActive = guilds?.some(g => g.location_index === loc.order_index);
            return (
              <g key={loc.id}>
                <circle cx={pos.x} cy={pos.y} r={5.5} fill="none"
                  stroke={isActive ? '#f1c40f' : '#4a3a14'} strokeWidth={0.5} opacity={isActive ? 0.8 : 0.4} />
                <circle cx={pos.x} cy={pos.y} r={4}
                  fill={isActive ? '#1a2a0a' : '#0d1a0d'}
                  stroke={isActive ? '#d4a843' : '#3a2a0a'} strokeWidth={0.8} />
                <circle cx={pos.x} cy={pos.y} r={1.5}
                  fill={isActive ? '#f1c40f' : '#8b6914'} opacity={isActive ? 1 : 0.5} />
                <text x={pos.x} y={pos.y + 8} textAnchor="middle"
                  fill={isActive ? '#d4a843' : '#6b5014'} fontSize={2.8} fontFamily="Georgia">
                  {loc.name || `Локация ${i+1}`}
                </text>
                {loc.boss_name && (
                  <text x={pos.x} y={pos.y - 7} textAnchor="middle"
                    fill="#e74c3c" fontSize={2.2} fontFamily="Georgia" opacity={0.8}>
                    ⚔ {loc.boss_name}
                  </text>
                )}
              </g>
            );
          })}

          {/* Маркеры гильдий */}
          {guilds?.map((guild, i) => {
            const pos = getGuildPosition(guild);
            const color = GUILD_COLORS[i % 4];
            const symbol = GUILD_SYMBOLS[i % 4];
            const isMe = guild.tavern_id === player?.tavern_id;
            const offsets = [{ dx:-3,dy:-3 },{ dx:3,dy:-3 },{ dx:-3,dy:3 },{ dx:3,dy:3 }];
            const off = offsets[i] || { dx:0, dy:0 };
            return (
              <g key={guild.tavern_id} className="guild-marker"
                transform={`translate(${pos.x + off.dx}, ${pos.y + off.dy})`}
                style={{ animationDelay: `${i * 0.5}s` }}>
                <ellipse cx={0} cy={3.5} rx={2.5} ry={0.8} fill="#000" opacity={0.3} />
                {isMe && (
                  <circle cx={0} cy={0} r={3} fill="none" stroke={color} strokeWidth={0.5}>
                    <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={0} cy={0} r={2.8} fill={color} opacity={isMe ? 1 : 0.7} />
                <text x={0} y={1} textAnchor="middle" fill="#000" fontSize={2.5} fontWeight="bold">{symbol}</text>
                {guild.status === 'boss_fight' && (
                  <text x={3} y={-3} fontSize={3} fill="#e74c3c">
                    !<animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite" />
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Легенда */}
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          background: '#00000080', borderRadius: 8, padding: '4px 8px',
          fontSize: 9, backdropFilter: 'blur(4px)'
        }}>
          {guilds?.map((g, i) => (
            <div key={g.tavern_id} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              color: g.tavern_id === player?.tavern_id ? GUILD_COLORS[i % 4] : '#6b5014',
              marginBottom: 2
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: GUILD_COLORS[i % 4] }} />
              {g.tavern_name}
            </div>
          ))}
        </div>
      </div>

      {/* Статистика */}
      {myGuild && (
        <div style={{
          marginTop: 12,
          background: 'linear-gradient(135deg, #0d1a0d, #111820)',
          border: '1px solid #2a4a2a', borderRadius: 12, padding: 14,
        }}>
          <div style={{ color: '#d4a843', fontWeight: 'bold', marginBottom: 10, fontSize: 13 }}>
            {myGuild.tavern_name}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['👣','Шагов', parseInt(myGuild.total_steps||0).toLocaleString()],
              ['❤️','HP', `${myGuild.guild_hp}/${myGuild.guild_max_hp}`],
              ['📍','Локация', `${myGuild.location_index}/5`],
              ['⚡','Статус', STATUS[myGuild.status]||myGuild.status],
            ].map(([icon,label,value]) => (
              <div key={label} style={{ background:'#0a120a', border:'1px solid #2a3a2a', borderRadius:8, padding:'8px 10px' }}>
                <div style={{ color:'#4a6a4a', fontSize:10, marginBottom:2 }}>{icon} {label}</div>
                <div style={{ color:'#d4a843', fontWeight:'bold', fontSize:13 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS = { traveling:'В пути', boss_fight:'Рейд!', victory:'Победа!', defeated:'Пал' };

function Loading() {
  return (
    <div style={{ padding:40, textAlign:'center', color:'#4a6a4a' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>🗺️</div>
      Загружаем карту...
    </div>
  );
}

function Empty() {
  return (
    <div style={{ padding:32, textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>🗺️</div>
      <div style={{ color:'#4a6a4a' }}>Карта недоступна</div>
    </div>
  );
}
// v2