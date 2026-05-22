const URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;

// Definir hosts permitidos de forma estricta
const ALLOWED_WS_HOSTS = [
  'localhost',
  'localhost:3001',
  '127.0.0.1',
  '127.0.0.1:3001',
];

function getToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  const jwtPattern = /^[a-zA-Z0-9-_=]+\.[a-zA-Z0-9-_=]+\.[a-zA-Z0-9-_=]+$/;

  if (!jwtPattern.test(token)) {
    console.warn('Token con formato sospechoso.');
    return null;
  }

  return token;
}

export default async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const message = data?.error || `Error HTTP ${res.status}`;

    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { message } }));
      }
    }

    throw new Error(message);
  }
  return data;
}

export function getChatSocketUrl() {
  const token = getToken() || '';
  const configured = (WS_URL || '').trim();
  let base = configured;

  if (!base && URL) {
    let apiBase = String(URL);

    while (apiBase.endsWith('/')) {
      apiBase = apiBase.slice(0, -1);
    }

    base = apiBase.replace(/^http/, 'ws').replace(/\/api$/, '') + '/ws';
  }

  if (!base) return null;

  try {
    const url = new URL(base, window.location.origin);
    const host = url.host;
    const hostname = url.hostname;
    
    const isAllowed = ALLOWED_WS_HOSTS.includes(host) || 
                      ALLOWED_WS_HOSTS.includes(hostname) ||
                      (hostname === window.location.hostname && window.location.hostname !== '');

    if (!isAllowed) {
      console.error('WebSocket host not in allowlist:', host);
      return null;
    }

    if (!['ws:', 'wss:'].includes(url.protocol)) {
      console.error('Invalid WebSocket protocol:', url.protocol);
      return null;
    }
  } catch (e) {
    console.error('Invalid WebSocket URL:', base, e);
    return null;
  }

  return `${base}?token=${encodeURIComponent(token)}`;
}
