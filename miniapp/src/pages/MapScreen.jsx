import { useState, useEffect } from 'react';
import { getMap } from '../services/api';

const LOCS = [
  { x: 20, y: 75, name: 'Тёмный Лес' },
  { x: 42, y: 55, name: 'Горный Перевал' },
  { x: 60, y: 70, name: 'Проклятая Деревня' },
  { x: 75, y: 40, name: 'Вулкан' },
  { x: 55, y: 18, name: 'Цитадель Тьмы' },
];

const COLORS = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71'];
const SYMBOLS = ['G', 'S', 'M', 'D'];
const BOSSES = ['Древний Паук', 'Каменный Великан', 'Некромант', 'Огн. Элементаль', 'Тёмный Властелин'];

export default function MapScreen({ player }) {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!player?.season_id) return;
    getMap(player.season_id)
      .then(d => { setMapData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [player]);

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#4a6a4a' }}>
      <div style={{ fontSize: 48 }}>🗺️</div>
      <div style={{ marginTop: 8 }}>Загружаем карту...</div>
    </div>
  );

  const { locations, guilds } = mapData || {};
  const myGuild = guilds?.find(g => g.tavern_id === player?.tavern_id);

  const getPos = (guild) => {
    const idx = Math.max(0, (guild.location_index || 1) - 1);
    return LOCS[Math.min(idx, LOCS.length - 1)];
  };

  return (
    <div style={{ padding: 12, fontFamily: 'Georgia, serif' }}>
      <style>{`
        @keyframes march {
          0%   { transform: translate(-1px,  0px); }
          25%  { transform: translate( 0px, -1px); }
          50%  { transform: translate( 1px,  0px); }
          75%  { transform: translate( 0px,  1px); }
          100% { transform: translate(-1px,  0px); }
        }
        @keyframes flicker {
          0%,100% { opacity: 0.6; }
          50%     { opacity: 1;   }
        }
        .gm { animation: march 2s ease-in-out infinite; }
      `}</style>

      <h2 style={{ color: '#d4a843', fontSize: 14, letterSpacing: 2, margin: '0 0 4px', textTransform: 'uppercase' }}>
        Карта Сезона
      </h2>
      <p style={{ color: '#7a5a10', fontSize: 11, margin: '0 0 10px' }}>
        Первая гильдия до Цитадели побеждает
      </p>

      {/* MAP */}
      <div style={{
        background: 'linear-gradient(160deg,#07111f,#0c1d0c)',
        borderRadius: 14,
        border: '1.5px solid #2a4020',
        overflow: 'hidden',
        boxShadow: '0 4px 30px #00000099',
      }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', display: 'block' }}>

          {/* Stars */}
          {[...Array(25)].map((_, i) => (
            <circle key={i}
              cx={(i * 37 + 11) % 100}
              cy={(i * 53 + 7) % 100}
              r={0.25} fill="#fff" opacity={0.35}
            >
              <animate attributeName="opacity"
                values="0.15;0.6;0.15"
                dur={`${2 + (i % 4)}s`}
                begin={`${i * 0.3}s`}
                repeatCount="indefinite" />
            </circle>
          ))}

          {/* Mountains bg */}
          <polygon points="28,90 38,62 48,90" fill="#162016" />
          <polygon points="54,85 66,54 78,85" fill="#131e10" />
          <polygon points="5,95 18,72 31,95"  fill="#111c11" />

          {/* Trees (forest) */}
          {[[7,80],[11,84],[15,78],[9,72],[5,86],[13,90],[18,82]].map(([x,y],i) => (
            <g key={i}>
              <polygon points={`${x},${y} ${x-2.5},${y+5} ${x+2.5},${y+5}`} fill="#163016" />
              <polygon points={`${x},${y-3} ${x-2},${y+3} ${x+2},${y+3}`}   fill="#1e5020" />
            </g>
          ))}

          {/* Volcano */}
          <polygon points="75,52 68,74 82,74" fill="#2a1206" />
          <polygon points="75,44 71,57 79,57" fill="#4a1e08" />
          <ellipse cx={75} cy={43} rx={2} ry={1.5} fill="#e74c3c" opacity={0.7}>
            <animate attributeName="opacity" values="0.4;1;0.4" dur="1.4s" repeatCount="indefinite" />
          </ellipse>

          {/* Castle */}
          <rect x={51} y={22} width={8} height={6}  fill="#22223a" />
          <rect x={50} y={20} width={2} height={4}  fill="#2e2e4a" />
          <rect x={57} y={20} width={2} height={4}  fill="#2e2e4a" />
          <rect x={53} y={19} width={3} height={4}  fill="#2e2e4a" />
          <line x1={54.5} y1={14} x2={54.5} y2={19} stroke="#700" strokeWidth={0.3} />
          <polygon points="54.5,14 57.5,15.5 54.5,17" fill="#c00" />

          {/* Village */}
          {[[57,74],[61,72],[64,75]].map(([x,y],i) => (
            <g key={i}>
              <rect x={x-1.5} y={y} width={3} height={3} fill="#2a1e10" />
              <polygon points={`${x-2},${y} ${x},${y-2} ${x+2},${y}`} fill="#4a3020" />
            </g>
          ))}

          {/* Path */}
          <polyline
            points={LOCS.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke="#7a5a10" strokeWidth={0.8}
            strokeDasharray="2,2" opacity={0.7}
          />

          {/* Location nodes */}
          {LOCS.map((loc, i) => {
            const active = guilds?.some(g => g.location_index === i + 1);
            return (
              <g key={i}>
                <circle cx={loc.x} cy={loc.y} r={5}
                  fill={active ? '#0f200f' : '#090f09'}
                  stroke={active ? '#c8921e' : '#3a2a08'}
                  strokeWidth={0.8} />
                <circle cx={loc.x} cy={loc.y} r={1.8}
                  fill={active ? '#f1c40f' : '#7a5a10'}
                  opacity={active ? 1 : 0.5}>
                  {active && (
                    <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
                  )}
                </circle>
                <text x={loc.x} y={loc.y + 8} textAnchor="middle"
                  fill={active ? '#c8921e' : '#5a4010'} fontSize={2.6} fontFamily="Georgia">
                  {loc.name}
                </text>
                <text x={loc.x} y={loc.y - 7} textAnchor="middle"
                  fill="#c0392b" fontSize={2} fontFamily="Georgia" opacity={0.8}>
                  {BOSSES[i]}
                </text>
              </g>
            );
          })}

          {/* Guild markers */}
          {guilds?.map((guild, i) => {
            const pos = getPos(guild);
            const color = COLORS[i % 4];
            const sym = SYMBOLS[i % 4];
            const isMe = guild.tavern_id === player?.tavern_id;
            const off = [{ dx:-4,dy:-3 },{ dx:4,dy:-3 },{ dx:-4,dy:3 },{ dx:4,dy:3 }][i] || { dx:0,dy:0 };
            return (
              <g key={guild.tavern_id} className="gm"
                transform={`translate(${pos.x + off.dx},${pos.y + off.dy})`}
                style={{ animationDelay: `${i * 0.4}s` }}>
                <ellipse cx={0} cy={3.5} rx={2.5} ry={0.7} fill="#000" opacity={0.35} />
                {isMe && (
                  <circle cx={0} cy={0} r={3.5} fill="none" stroke={color} strokeWidth={0.5}>
                    <animate attributeName="r"       values="3;6;3"       dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0;0.6"   dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={0} cy={0} r={3} fill={color} opacity={isMe ? 1 : 0.65} />
                <text x={0} y={1.1} textAnchor="middle"
                  fill="#000" fontSize={2.6} fontWeight="bold" fontFamily="Georgia">
                  {sym}
                </text>
                {guild.status === 'boss_fight' && (
                  <text x={3.5} y={-3} fontSize={3.5} fill="#e74c3c">
                    !
                    <animate attributeName="opacity" values="1;0;1" dur="0.7s" repeatCount="indefinite" />
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          background: 'rgba(0,0,0,0.7)', borderRadius: 8,
          padding: '5px 9px', fontSize: 9,
        }}>
          {guilds?.map((g, i) => (
            <div key={g.tavern_id} style={{
              display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2,
              color: g.tavern_id === player?.tavern_id ? COLORS[i % 4] : '#6b5014',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS[i % 4] }} />
              {g.tavern_name}
            </div>
          ))}
        </div>
      </div>

      {/* Guild stats */}
      {myGuild && (
        <div style={{
          marginTop: 12,
          background: 'linear-gradient(135deg,#0c180c,#10161e)',
          border: '1px solid #2a4020', borderRadius: 12, padding: 14,
        }}>
          <div style={{ color: '#d4a843', fontWeight: 'bold', marginBottom: 10, fontSize: 13 }}>
            {myGuild.tavern_name}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['👣', 'Шагов',   parseInt(myGuild.total_steps || 0).toLocaleString()],
              ['❤️', 'HP',      `${myGuild.guild_hp}/${myGuild.guild_max_hp}`],
              ['📍', 'Локация', `${myGuild.location_index}/5`],
              ['⚡', 'Статус',  { traveling:'В пути', boss_fight:'Рейд!', victory:'Победа!', defeated:'Пал' }[myGuild.status] || myGuild.status],
            ].map(([icon, label, val]) => (
              <div key={label} style={{ background:'#080e08', border:'1px solid #243020', borderRadius:8, padding:'8px 10px' }}>
                <div style={{ color:'#3a5a3a', fontSize:10, marginBottom:2 }}>{icon} {label}</div>
                <div style={{ color:'#d4a843', fontWeight:'bold', fontSize:13 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}