import { useState, useEffect } from 'react';
import { getRaid, doRaidAction } from '../services/api';

const CLASS_ACTION = {
  warrior:  { type: 'attack',  label: '⚔️ Атаковать',    color: '#e74c3c' },
  mage:     { type: 'spell',   label: '🔮 Заклинание',   color: '#9b59b6' },
  druid:    { type: 'heal',    label: '🌿 Исцелить',      color: '#2ecc71' },
  guardian: { type: 'defend',  label: '🛡️ Защититься',   color: '#3498db' },
};

const MECHANIC_DESC = {
  poison: '☠️ Яд — Друид должен лечить каждый ход!',
  armor:  '🪨 Броня — Маг сначала снимает защиту!',
  revive: '💀 Воскрешение — Хранитель блокирует!',
  burn:   '🔥 Огонь — Нужны все четверо!',
  all:    '👑 Все механики — Финальный бой!',
};

export default function RaidScreen({ player, tgId, onUpdate }) {
  const [raidData, setRaidData] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState(false);
  const [message,  setMessage]  = useState(null);

  const load = () => {
    if (!player?.tavern_id) return;
    getRaid(player.tavern_id)
      .then(d => { setRaidData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [player]);

  const handleAction = async () => {
    const action = CLASS_ACTION[player.class];
    if (!action) return;

    setActing(true);
    try {
      const res = await doRaidAction(tgId, action.type);
      setMessage(res);
      await load();
      onUpdate?.();
    } catch (err) {
      setMessage({ error: err.response?.data?.error || err.message });
    }
    setActing(false);
  };

  if (loading) return <Loading />;

  const { raid, actions, members } = raidData || {};

  if (!raid) return <NoRaid player={player} />;

  const bossPct  = Math.round((raid.boss_current_hp / raid.boss_max_hp) * 100);
  const guildPct = Math.round((raid.guild_hp / raid.guild_max_hp) * 100);
  const myAction = CLASS_ACTION[player?.class];
  const me       = members?.find(m => m.class === player?.class);
  const actedToday = me?.acted_today;

  return (
    <div style={{ padding: 16 }}>

      {/* Босс */}
      <div style={{
        background: 'linear-gradient(135deg, #2d1a1a, #1a0f0f)',
        border: '1px solid #e74c3c40',
        borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center'
      }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>{raid.boss_emoji}</div>
        <div style={{ color: '#e74c3c', fontSize: 20, fontWeight: 'bold' }}>
          {raid.boss_name}
        </div>
        {raid.mechanic && (
          <div style={{
            marginTop: 6, fontSize: 11, color: '#e67e22',
            background: '#2d1a0a', borderRadius: 8, padding: '4px 12px',
            display: 'inline-block'
          }}>
            {MECHANIC_DESC[raid.mechanic]}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8b949e', marginBottom: 4 }}>
            <span>💀 HP Босса</span>
            <span style={{ color: '#e74c3c' }}>{raid.boss_current_hp} / {raid.boss_max_hp}</span>
          </div>
          <div style={{ height: 12, background: '#21262d', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 6, transition: 'width 0.6s',
              width: `${bossPct}%`,
              background: bossPct > 60 ? '#e74c3c' : bossPct > 30 ? '#e67e22' : '#f39c12'
            }} />
          </div>
        </div>
      </div>

      {/* HP гильдии */}
      <div style={{
        background: '#161b22', border: '1px solid #30363d',
        borderRadius: 12, padding: 14, marginBottom: 16
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8b949e', marginBottom: 6 }}>
          <span>❤️ HP Гильдии</span>
          <span style={{ color: '#2ecc71' }}>{raid.guild_hp} / {raid.guild_max_hp}</span>
        </div>
        <div style={{ height: 10, background: '#21262d', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 5, transition: 'width 0.6s',
            width: `${guildPct}%`,
            background: guildPct > 60 ? '#2ecc71' : guildPct > 30 ? '#f39c12' : '#e74c3c'
          }} />
        </div>
      </div>

      {/* Участники рейда */}
      <div style={{
        background: '#161b22', border: '1px solid #30363d',
        borderRadius: 12, padding: 14, marginBottom: 16
      }}>
        <div style={{ color: '#f1c40f', fontWeight: 'bold', marginBottom: 10, fontSize: 13 }}>
          👥 Гильдия сегодня
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {members?.map(m => {
            const ca = CLASS_ACTION[m.class];
            const st = m.status === 'knockout';
            return (
              <div key={m.class} style={{
                background: '#21262d', borderRadius: 8, padding: '8px 10px',
                opacity: st ? 0.5 : 1,
                border: m.acted_today ? '1px solid #2ecc7160' : '1px solid transparent'
              }}>
                <div style={{ fontSize: 11, color: '#8b949e' }}>{ca?.label}</div>
                <div style={{ fontSize: 12, color: '#e8dcc8', marginTop: 2 }}>
                  {m.name} · Ур.{m.level}
                </div>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  {st
                    ? <span style={{ color: '#e74c3c' }}>😵 Нокаут</span>
                    : m.acted_today
                      ? <span style={{ color: '#2ecc71' }}>✅ Действовал</span>
                      : <span style={{ color: '#f39c12' }}>⏳ Ждём</span>
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Кнопка действия */}
      {myAction && (
        <div style={{ marginBottom: 16 }}>
          {actedToday ? (
            <div style={{
              background: '#1a2d1a', border: '1px solid #2ecc71',
              borderRadius: 12, padding: 16, textAlign: 'center', color: '#2ecc71'
            }}>
              ✅ Ты уже совершил действие сегодня.<br />
              <span style={{ fontSize: 12, color: '#8b949e' }}>Возвращайся завтра!</span>
            </div>
          ) : player?.status === 'knockout' ? (
            <div style={{
              background: '#2d1a1a', border: '1px solid #e74c3c',
              borderRadius: 12, padding: 16, textAlign: 'center', color: '#e74c3c'
            }}>
              😵 Ты в нокауте — не выполнил норму шагов.<br />
              <span style={{ fontSize: 12, color: '#8b949e' }}>Нельзя участвовать в рейде.</span>
            </div>
          ) : (
            <button onClick={handleAction} disabled={acting} style={{
              width: '100%', padding: 18,
              background: acting ? '#21262d' : myAction.color,
              border: 'none', borderRadius: 12, color: '#fff',
              fontSize: 18, fontWeight: 'bold', cursor: acting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', fontFamily: 'Georgia, serif',
              opacity: acting ? 0.6 : 1
            }}>
              {acting ? '⏳ Выполняем...' : myAction.label}
            </button>
          )}
        </div>
      )}

      {/* Результат действия */}
      {message && (
        <div style={{
          background: message.error ? '#2d1a1a' : '#1a2d1a',
          border: `1px solid ${message.error ? '#e74c3c' : '#2ecc71'}`,
          borderRadius: 12, padding: 14, marginBottom: 16,
          color: message.error ? '#e74c3c' : '#2ecc71', fontSize: 13
        }}>
          {message.error || message.description || message.message}
          {message.victory && (
            <div style={{ marginTop: 8, color: '#f1c40f', fontWeight: 'bold', fontSize: 16 }}>
              🏆 БОСС ПОБЕЖДЁН!
            </div>
          )}
        </div>
      )}

      {/* Лог боя */}
      {actions?.length > 0 && (
        <div style={{
          background: '#161b22', border: '1px solid #30363d',
          borderRadius: 12, padding: 14
        }}>
          <div style={{ color: '#f1c40f', fontWeight: 'bold', marginBottom: 10, fontSize: 13 }}>
            📜 Лог боя
          </div>
          {actions.map((a, i) => (
            <div key={i} style={{
              padding: '6px 0',
              borderBottom: i < actions.length - 1 ? '1px solid #21262d' : 'none',
              fontSize: 12, color: '#8b949e'
            }}>
              <span style={{ color: '#e8dcc8' }}>{a.description}</span>
              <span style={{ marginLeft: 8, fontSize: 10 }}>
                {new Date(a.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NoRaid({ player }) {
  const guildStatus = player?.guild_status;
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>
        {guildStatus === 'traveling' ? '🚶' : '👹'}
      </div>
      <div style={{ color: '#e8dcc8', fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
        {guildStatus === 'traveling'
          ? 'Гильдия в пути'
          : 'Нет активного рейда'}
      </div>
      <div style={{ color: '#8b949e', fontSize: 13 }}>
        {guildStatus === 'traveling'
          ? 'Продолжайте ходить — скоро встретите босса!'
          : 'Дойдите до следующей локации на карте'}
      </div>
    </div>
  );
}

function Loading() {
  return <div style={{ padding: 32, textAlign: 'center', color: '#8b949e' }}>Загрузка рейда...</div>;
}
