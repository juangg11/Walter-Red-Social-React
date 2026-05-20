import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Auth from './components/Auth';
import Navbar from './components/Navbar';
import PostModal from './components/PostModal';
import HomePage from './pages/HomePage';
import CommunitiesPage from './pages/CommunitiesPage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import UserPage from './pages/UserPage';
import request, { getChatSocketUrl } from './api/client';
import styles from './App.module.css';

const DEFAULT_SETTINGS = {
  theme: 'light',
  textSize: 'md',
  contrast: 'normal',
  reduceMotion: false,
  notifications: {
    chatToasts: true,
    desktopMessages: false,
  },
};

function App() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommunities, setSelectedCommunities] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [selectedPost, setSelectedPost] = useState(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [loading, setLoading] = useState(true);
  const [chatToast, setChatToast] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token  = localStorage.getItem('token');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    try {
      const storedSettings = window.localStorage.getItem('walter-settings');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications },
        });
      } else {
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        setSettings(current => ({ ...current, theme: prefersDark ? 'dark' : 'light' }));
      }
    } catch {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      setSettings(current => ({ ...current, theme: prefersDark ? 'dark' : 'light' }));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    document.body.dataset.theme = settings.theme;
    document.body.dataset.textSize = settings.textSize;
    document.body.dataset.contrast = settings.contrast;
    document.body.dataset.motion = settings.reduceMotion ? 'reduced' : 'normal';
    document.documentElement.dataset.textSize = settings.textSize;
    document.documentElement.dataset.motion = settings.reduceMotion ? 'reduced' : 'normal';
    window.localStorage.setItem('walter-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!user) return;
    loadCommunities();
    loadNotificationCount();
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    const ws = new WebSocket(getChatSocketUrl());

    ws.onmessage = event => {
      const payload = JSON.parse(event.data);
      if (payload.type !== 'chat:message') return;
      if (payload.message.usuario_id === user.id) return;

      setNotificationCount(notificationCount + 1);
      if (settings.notifications.chatToasts) {
        setChatToast({
          id: payload.message.id,
          title: `Nuevo mensaje de w/${payload.message.username}`,
          message: payload.message.contenido || 'Te ha enviado una imagen',
        });
      }

      if (settings.notifications.desktopMessages && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`w/${payload.message.username}`, {
          body: payload.message.contenido,
        });
      }
    };

    return () => ws.close();
  }, [user, settings.notifications.chatToasts, settings.notifications.desktopMessages]);

  useEffect(() => {
    if (!chatToast) return undefined;
    const timer = window.setTimeout(() => setChatToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [chatToast]);

  async function loadCommunities() {
    try {
      const data = await request(`/comunidades?userId=${user.id}`);
      setCommunities(data);
    } catch (e) {
      console.error('Error loading communities:', e);
    }
  }

  async function loadNotificationCount() {
    try {
      const data = await request('/notificaciones/no-leidas');
      setNotificationCount(data.total);
    } catch (e) {
      console.error('Error loading notifications:', e);
    }
  }

  function handleLogin(userData) {
    setUser(userData);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCommunities([]);
    setNotificationCount(0);
  }

  useEffect(() => {
    if (location.pathname.startsWith('/mensajes')) setActiveTab('messages');
    else if (location.pathname.startsWith('/comunidades')) setActiveTab('communities');
    else if (location.pathname.startsWith('/u/')) setActiveTab('profile');
    else if (location.pathname.startsWith('/settings')) setActiveTab('settings');
    else setActiveTab('feed');
  }, [location.pathname]);

  function handleTabChange(tab) {
    setActiveTab(tab);
    if (tab === 'messages') navigate('/mensajes');
    else if (tab === 'communities') navigate('/comunidades');
    else if (tab === 'profile') navigate(`/u/${user.username}`);
    else if (tab === 'settings') navigate('/settings');
    else navigate('/');
  }

  function handleSettingsChange(nextSettings) {
    setSettings(nextSettings);
  }

  function handleUserUpdate(nextUser) {
    setUser(nextUser);
    localStorage.setItem('user', JSON.stringify(nextUser));
  }

  if (loading) return null;
  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <div className={styles.appLayout}>
      <Navbar
        user={user}
        onSearchChange={setSearchQuery}
        notificationCount={notificationCount}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
        onNotificationsRead={() => setNotificationCount(0)}
      />

      <Routes>
        <Route path="/" element={
          <HomePage
            user={user}
            searchQuery={searchQuery}
            selectedCommunities={selectedCommunities}
            setSelectedCommunities={setSelectedCommunities}
            communities={communities}
            onPostClick={setSelectedPost}
          />
        } />
        <Route path="/comunidades" element={<CommunitiesPage user={user} onCommunityCreated={loadCommunities} />} />
        <Route path="/mensajes" element={<ChatPage user={user} />} />
        <Route path="/u/:username" element={<UserPage user={user} onUserUpdate={handleUserUpdate} />} />
        <Route
          path="/settings"
          element={
            <SettingsPage
              user={user}
              settings={settings}
              onSettingsChange={handleSettingsChange}
              onUserUpdate={handleUserUpdate}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          user={user}
        />
      )}

      {chatToast && (
        <button
          type="button"
          className={styles.chatToast}
          onClick={() => {
            setChatToast(null);
            navigate('/mensajes');
          }}
        >
          <strong>{chatToast.title}</strong>
          <span>{chatToast.message}</span>
        </button>
      )}
    </div>
  );
}

export default App;
