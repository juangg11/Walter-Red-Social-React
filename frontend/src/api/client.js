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

  const data = await res.json();
  if (!res.ok) 
    throw new Error(data.error);
  return data;
}

export function getChatSocketUrl() {
  const token = localStorage.getItem('token') || '';
  return `${WS_URL}?token=${encodeURIComponent(token)}`;
}
