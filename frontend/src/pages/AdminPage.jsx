import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: "easeIn" } }
};

function getInitialUser() {
  const stored = localStorage.getItem('user');
  const token = localStorage.getItem('token');
  return stored && token ? JSON.parse(stored) : null;
}

function getInitialSettings() {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;

  try {
    const storedSettings = window.localStorage.getItem('walter-settings');
    if (!storedSettings) {
      return { ...DEFAULT_SETTINGS, theme: prefersDark ? 'dark' : 'light' };
    }

    const parsed = JSON.parse(storedSettings);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications },
    };
  } catch {
    return { ...DEFAULT_SETTINGS, theme: prefersDark ? 'dark' : 'light' };
  }
}

function getActiveTab(pathname) {
  if (pathname.startsWith('/mensajes')) return 'messages';
  if (pathname.startsWith('/comunidades')) return 'communities';
  if (pathname.startsWith('/u/')) return 'profile';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'feed';
}

function App() {
  const [user, setUser] = useState(getInitialUser);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommunities, setSelectedCommunities] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [selectedPost, setSelectedPost] = useState(null);
  const [chatToast, setChatToast] = useState(null);
  const [settings, setSettings] = useState(getInitialSettings);
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const userId = user?.id;

  async function loadCommunities() {
    if (!userId) return;
    try {
      const data = await request(`/comunidades?userId=${userId}`);
      setCommunities(data);
    } catch (e) {
      console.error('Error loading communities:', e);
    }
  }

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
    if (!userId) return undefined;
    let ignore = false;

    request(`/comunidades?userId=${userId}`)
      .then(data => {
        if (!ignore) setCommunities(data);
      })
      .catch(e => console.error('Error loading communities:', e));

    request('/notificaciones/no-leidas')
      .then(data => {
        if (!ignore) setNotificationCount(data.total);
      })
      .catch(e => console.error('Error loading notifications:', e));

    return () => {
      ignore = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;

    const rawWsUrl = getChatSocketUrl();
    if (!rawWsUrl) return undefined;

    const wsUrlStr = String(rawWsUrl).trim();
    const safeWsPattern = /^wss?:\/\/[a-zA-Z0-9.\-_:]+(\/[a-zA-Z0-9.\-_/?=&]*)?$/;

    if (!safeWsPattern.test(wsUrlStr)) {
      console.error('Conexión de WebSocket bloqueada: URL con formato malicioso.');
      return undefined;
    }

    let ws;
    try {
      ws = new WebSocket(wsUrlStr);
    } catch (e) {
      console.error('WebSocket no disponible:', e);
      return undefined;
    }

    ws.onmessage = event => {
      const payload = JSON.parse(event.data);
      if (payload.type !== 'chat:message') return;
      if (payload.message.usuario_id === userId) return;

      setNotificationCount(current => current + 1);
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

    ws.onerror = () => {};

    return () => ws?.close();
  }, [userId, settings.notifications.chatToasts, settings.notifications.desktopMessages]);

  useEffect(() => {
    if (!chatToast) return undefined;
    const timer = window.setTimeout(() => setChatToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [chatToast]);

  useEffect(() => {
    function onUnauthorized() {
      handleLogout();
      navigate('/', { replace: true });
    }

    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, [navigate]);

  function sanitizeUserObject(userObj) {
    if (!userObj) return null;
    
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    };

    return {
      ...userObj,
      username: sanitizeString(userObj.username),
      bio: sanitizeString(userObj.bio),
      avatar_url: sanitizeString(userObj.avatar_url),
    };
  }

  function handleLogin(userData) {
    if (!userData) return;
    const sanitizedUser = sanitizeUserObject(userData);
    setUser(sanitizedUser);
    localStorage.setItem('user', JSON.stringify(sanitizedUser));
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCommunities([]);
    setNotificationCount(0);
  }

  function handleTabChange(tab) {
    if (tab === 'messages') navigate('/mensajes');
    else if (tab === 'communities') navigate('/comunidades');
    else if (tab === 'profile') navigate(`/u/${user.username}`);
    else if (tab === 'settings') navigate('/settings');
    else navigate('/');
  }

  function handleSettingsChange(nextSettings) {
    setSettings(nextSettings);
  }

  function handleUserUpdate(updatedUser) {
    if (!updatedUser) return;
    const sanitizedUser = sanitizeUserObject(updatedUser);
    setUser(sanitizedUser);
    localStorage.setItem('user', JSON.stringify(sanitizedUser));
  }

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

      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={styles.pageContainer}
        >
          <Routes location={location}>
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
        </motion.div>
      </AnimatePresence>

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