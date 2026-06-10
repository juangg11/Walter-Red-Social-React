import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
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
import AdminPage from './pages/AdminPage';

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
  const prefersDark = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches;

  try {
    const storedSettings = globalThis.localStorage.getItem('walter-settings');
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

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');
}

function sanitizeUserObject(userObj) {
  if (!userObj) return null;
  return {
    ...userObj,
    username: sanitizeString(userObj.username),
    bio: sanitizeString(userObj.bio),
    avatar_url: sanitizeString(userObj.avatar_url),
  };
}

function getActiveTab(pathname) {
  if (pathname.startsWith('/mensajes')) return 'messages';
  if (pathname.startsWith('/comunidades')) return 'communities';
  if (pathname.startsWith('/u/')) return 'profile';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'feed';
}

function getChatNotificationStorageKey(userId) {
  return `walter-chat-notifications:${userId}`;
}

function readChatNotificationCount(userId) {
  if (!userId) return 0;
  const stored = Number(globalThis.localStorage?.getItem(getChatNotificationStorageKey(userId)));
  return Number.isFinite(stored) && stored > 0 ? stored : 0;
}

function writeChatNotificationCount(userId, count) {
  if (!userId) return;
  const key = getChatNotificationStorageKey(userId);
  const safeCount = Math.max(0, Number(count) || 0);
  if (safeCount === 0) globalThis.localStorage?.removeItem(key);
  else globalThis.localStorage?.setItem(key, String(safeCount));
}

function AdminRoute() {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    let ignore = false;

    request('/usuarios/isAdmin')
      .then((data) => {
        if (!ignore) setAllowed(Boolean(data?.isAdmin));
      })
      .catch(() => {
        if (!ignore) setAllowed(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (allowed === null) {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: 'var(--text-secondary)' }}>
        Comprobando acceso...
      </div>
    );
  }

  return allowed ? <AdminPage /> : <Navigate to="/" replace />;
}
function App() {
  const [user, setUser] = useState(getInitialUser);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommunities, setSelectedCommunities] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [chatNotificationCount, setChatNotificationCount] = useState(() => readChatNotificationCount(getInitialUser()?.id));
  const [selectedPost, setSelectedPost] = useState(null);
  const [settings, setSettings] = useState(getInitialSettings);
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const userId = user?.id;
  const motionMode = settings.reduceMotion ? 'always' : 'never';

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
    globalThis.localStorage.setItem('walter-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    setChatNotificationCount(readChatNotificationCount(userId));
  }, [userId]);

  useEffect(() => {
    writeChatNotificationCount(userId, chatNotificationCount);
  }, [userId, chatNotificationCount]);

  useEffect(() => {
    if (!userId) return undefined;
    let ignore = false;

    request(`/comunidades?userId=${userId}`)
      .then(data => {
        if (!ignore) setCommunities(data);
      })
      .catch(e => console.error('Error loading communities:', e));

    function loadNotificationCount() {
      request('/notificaciones/no-leidas')
        .then(data => {
          if (!ignore) setNotificationCount(data.total);
        })
        .catch(e => console.error('Error loading notifications:', e));
    }

    loadNotificationCount();
    const notificationTimer = globalThis.setInterval(() => {
      loadNotificationCount();
    }, 15000);

    return () => {
      ignore = true;
      globalThis.clearInterval(notificationTimer);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;

    const rawWsUrl = getChatSocketUrl();
    if (!rawWsUrl) return undefined;

    const wsUrlStr = String(rawWsUrl).trim();
    const safeWsPattern = /^wss?:\/\/[a-zA-Z0-9.\-_:]+(\/[a-zA-Z0-9.\-_/?=&]*)?$/;

    if (!safeWsPattern.test(wsUrlStr)) {
      console.error('ConexiÃ³n de WebSocket bloqueada: URL con formato malicioso.');
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

      if (activeTab !== 'messages') setChatNotificationCount(current => current + 1);
    };

    ws.onerror = () => {};

    return () => ws?.close();
  }, [userId, activeTab]);

  useEffect(() => {
    if (activeTab === 'messages') setChatNotificationCount(0);
  }, [activeTab]);

  useEffect(() => {
    function onUnauthorized() {
      handleLogout();
      navigate('/', { replace: true });
    }

    globalThis.addEventListener('auth:unauthorized', onUnauthorized);
    return () => globalThis.removeEventListener('auth:unauthorized', onUnauthorized);
  }, [navigate]);

  function handleLogin(userData) {
    if (!userData) return;
    const sanitizedUser = sanitizeUserObject(userData);
    setUser(sanitizedUser);
    // localStorage persistence is handled by Auth.jsx's persistAuthData()
  }

  function handleLogout() {
    writeChatNotificationCount(userId, 0);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCommunities([]);
    setNotificationCount(0);
    setChatNotificationCount(0);
  }

  function handleTabChange(tab) {
    if (tab === 'messages') {
      setChatNotificationCount(0);
      navigate('/mensajes');
    }
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

  if (!user) {
    return (
      <MotionConfig reducedMotion={motionMode}>
        <Auth onLogin={handleLogin} />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion={motionMode}>
      <div className={styles.appLayout}>
        <Navbar
          user={user}
          onSearchChange={setSearchQuery}
          notificationCount={notificationCount}
          chatNotificationCount={chatNotificationCount}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onLogout={handleLogout}
          onNotificationsRead={() => setNotificationCount(0)}
          onNotificationRead={() => setNotificationCount(current => Math.max(0, current - 1))}
          onPostNotificationOpen={post => {
            setSelectedPost(post);
            navigate('/');
          }}
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
              <Route path="/admin" element={<AdminRoute />} />
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
      </div>
    </MotionConfig>
  );
}

export default App;


