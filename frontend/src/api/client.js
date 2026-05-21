const URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;

function getToken() {
  return localStorage.getItem('token');
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
  const token = localStorage.getItem('token') || '';
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
    const allowedHosts = ['localhost', 'localhost:3001', window.location.hostname];
    const isAllowed = allowedHosts.some(host => 
      url.hostname === host || url.host === host
    );

    if (!isAllowed) {
      console.error('WebSocket URL not in allowlist:', base);
      return null;
    }
  } catch {
    console.error('Invalid WebSocket URL:', base);
    return null;
  }

  return `${base}?token=${encodeURIComponent(token)}`;
}
