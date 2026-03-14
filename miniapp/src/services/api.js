import axios from 'axios';

const BASE = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
const api = axios.create({ baseURL: BASE });

export const getPlayer     = (tgId)      => api.get(`/api/player/${tgId}`).then(r => r.data);
export const getLobby      = ()          => api.get('/api/lobby').then(r => r.data);
export const getMap        = (seasonId)  => api.get(`/api/map/${seasonId}`).then(r => r.data);
export const getRaid       = (tavernId)  => api.get(`/api/raid/${tavernId}`).then(r => r.data);
export const getAutobattle = (tavernId)  => api.get(`/api/autobattle/${tavernId}`).then(r => r.data);
export const getLeaderboard= (seasonId)  => api.get(`/api/leaderboard/${seasonId}`).then(r => r.data);
export const doRaidAction  = (tgId, act) => api.post('/api/raid/action', { telegram_id: tgId, action_type: act }).then(r => r.data);
