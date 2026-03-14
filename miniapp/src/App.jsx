import { useState, useEffect } from 'react';
import { getPlayer } from './services/api';
import MapScreen    from './pages/MapScreen';
import HeroScreen   from './pages/HeroScreen';
import RaidScreen   from './pages/RaidScreen';
import LogScreen    from './pages/LogScreen';
import LeaderScreen from './pages/LeaderScreen';

const NAV = [
  { id: 'map',    label: '🗺️',  title: 'Карта'    },
  { id: 'hero',   label: '⚔️',  title: 'Герой'    },
  { id: 'raid',   label: '👹',  title: 'Рейд'     },
  { id: 'log',    label: '📜',  title: 'Лог'      },
  { id: 'leader', label: '🏆',  title: 'Рейтинг'  },
];

export default function App() {
  const [tab, setTab]       = useState('map');
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  // Получаем telegram_id из Telegram Web App или из URL
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    || new URLSearchParams(window.location.search).get('id')
    || 'demo';

  useEffect(() => {
    // Расширяем на весь экран в Telegram
    window.Telegram?.WebApp?.expand();
    window.Telegram?.WebApp?.setHeaderColor('#0d1117');

    getPlayer(tgId)
      .then(data => { setPlayer(data); setLoading(false); })
      .catch(err  => { setError(err.message); setLoading(false); });
  }, [tgId]);

  if (loading) return <Splash />;
  if (error)   return <ErrorScreen msg={error} />;

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', paddingBottom: 64 }}>
      {/* Шапка */}
      <Header player={player} />

      {/* Экраны */}
      {tab === 'map'    && <MapScreen    player={player} tgId={tgId} />}
      {tab === 'hero'   && <HeroScreen   player={player} tgId={tgId} />}
      {tab === 'raid'   && <RaidScreen   player={player} tgId={tgId} onUpdate={() =>
        getPlayer(tgId).then(setPlayer)
      } />}
      {tab === 'log'    && <LogScreen    player={player} />}
      {tab === 'leader' && <LeaderScreen player={player} />}

      {/* Нижняя навигация */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#161b22', borderTop: '1px solid #30363d',
        display: 'flex', zIndex: 100
      }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setTab(n.id)} style={{
            flex: 1, padding: '10px 0', background: 'none', border: 'none',
            color: tab === n.id ? '#f1c40f' : '#8b949e',
            fontSize: 22, cursor: 'pointer', display: 'flex',
            flexDirection: 'column', alignItems: 'center', gap: 2
          }}>
            <span>{n.label}</span>
            <span style={{ fontSize: 9, letterSpacing: 0.5 }}>{n.title}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Header({ player }) {
  if (!player) return null;
  const CLASS_EMOJI = { warrior: '⚔️', mage: '🔮', druid: '🌿', guardian: '🛡️' };
  const hpPct = Math.round((player.hp / player.max_hp) * 100);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #161b22, #0d1117)',
      borderBottom: '1px solid #30363d', padding: '12px 16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 18, fontWeight: 'bold', color: '#f1c40f' }}>
            {CLASS_EMOJI[player.class]} {player.first_name}
          </span>
          <span style={{
            marginLeft: 8, fontSize: 11, color: '#8b949e',
            background: '#21262d', padding: '2px 8px', borderRadius: 10
          }}>
            Ур. {player.level}
          </span>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: '#8b949e' }}>
          {player.tavern_emoji} {player.tavern_name}
        </div>
      </div>

      {/* HP bar */}
      <div style={{ marginTop: 6 }}>
        <div style={{
          height: 6, background: '#21262d', borderRadius: 3, overflow: 'hidden'
        }}>
          <div style={{
            height: '100%', borderRadius: 3, transition: 'width 0.5s',
            width: `${hpPct}%`,
            background: hpPct > 60 ? '#2ecc71' : hpPct > 30 ? '#f39c12' : '#e74c3c'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#8b949e', marginTop: 2 }}>
          <span>❤️ {player.hp}/{player.max_hp}</span>
          <span>✨ {player.xp} XP</span>
        </div>
      </div>
    </div>
  );
}

function Splash() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#0d1117'
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🏰</div>
      <div style={{ color: '#f1c40f', fontSize: 22, fontWeight: 'bold', letterSpacing: 2 }}>
        WALK RPG
      </div>
      <div style={{ color: '#8b949e', marginTop: 8, fontSize: 14 }}>Загрузка...</div>
    </div>
  );
}

function ErrorScreen({ msg }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#0d1117',
      padding: 32
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <div style={{ color: '#e74c3c', textAlign: 'center' }}>{msg}</div>
      <div style={{ color: '#8b949e', marginTop: 8, fontSize: 12 }}>
        Убедись что бот запущен и ты выбрал таверну
      </div>
    </div>
  );
}
