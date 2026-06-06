import { Search, Home, User, LogOut, Bell, Users, MessageCircle, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import request from '../api/client';
import { addCacheBust } from '../utils/imageCacheBust';
import styles from './Navbar.module.css';

export default function Navbar({
  user,
  onSearchChange,
  notificationCount = 0,
  chatNotificationCount = 0,
  activeTab,
  onTabChange,
  onLogout,
  onNotificationsRead,
  onNotificationRead,
  onPostNotificationOpen,
}) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isAdmin, setIsAdmin] = useState(user?.isAdmin || false);

  useEffect(() => {
    let ignore = false;
    setIsAdmin(Boolean(user?.isAdmin));
    if (!user?.id) return undefined;

    request('/usuarios/isAdmin')
      .then(data => {
        if (!ignore) setIsAdmin(Boolean(data.isAdmin));
      })
      .catch(e => {
        if (!ignore) {
          setIsAdmin(false);
          console.error('checkAdminStatus:', e);
        }
      });

    return () => {
      ignore = true;
    };
  }, [user?.id, user?.isAdmin]);

  async function handleNotificationsClick() {
    if (showNotifications) {
      setShowNotifications(false);
      return;
    }
    try {
      const data = await request('/notificaciones');
      setNotifications(data);
      setShowNotifications(true);
    } catch (e) {
      console.error('fetchNotifications:', e);
    }
  }

  async function markAsRead(notificationId) {
    try {
      await request(`/notificaciones/${notificationId}/leer`, { method: 'PATCH' });
      setNotifications(cur => cur.map(n => (
        n.id === notificationId ? { ...n, leida: 1 } : n
      )));
      return true;
    } catch (e) {
      console.error('markAsRead:', e);
      return false;
    }
  }

  async function handleNotificationClick(notification) {
    const wasUnread = !notification.leida;
    const readOk = await markAsRead(notification.id);
    if (wasUnread && readOk) onNotificationRead?.();
    setShowNotifications(false);

    if (notification.tipo === 'seguimiento' && notification.actor_username) {
      navigate(`/u/${notification.actor_username}`);
      return;
    }

    if (notification.publicacion_id) {
      try {
        const post = await request(`/publicaciones/${notification.publicacion_id}?userId=${user?.id}`);
        onPostNotificationOpen?.({
          ...post,
          highlightedCommentId: notification.comentario_id,
        });
      } catch (e) {
        console.error('openNotificationPost:', e);
      }
    }
  }

  async function markAllRead() {
    try {
      await request('/notificaciones/leer-todas', { method: 'PATCH' });
      setNotifications(cur => cur.map(n => ({ ...n, leida: 1 })));
      onNotificationsRead?.();
    } catch (e) {
      console.error('markAllRead:', e);
    }
  }

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.navbarContent}>

          <div className={styles.navLeft}>
            <motion.div 
              className={styles.navLogo} 
              onClick={() => onTabChange?.('feed')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img className={styles.navLogoMark} src="/walter.png" alt="Walter" />
            </motion.div>
            <div className={styles.navSearch}>
              <Search size={16} />
              <input type="text" placeholder="Buscar posts y usuarios..." onChange={e => onSearchChange?.(e.target.value)} />
            </div>
          </div>

          <div className={styles.navCenterIcons}>
            <motion.span
              className={`${styles.navIconItem} ${activeTab === 'settings' ? styles.navIconItemActive : ''}`}
              onClick={() => onTabChange?.('settings')}
              title="Settings"
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.9 }}
            >
              <Settings size={20} />
            </motion.span>
            
            <motion.span
              className={`${styles.navIconItem} ${activeTab === 'communities' ? styles.navIconItemActive : ''}`}
              onClick={() => onTabChange?.('communities')}
              title="Comunidades"
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.9 }}
            >
              <Users size={20} />
            </motion.span>
            
            <motion.span
              className={`${styles.navIconItem} ${activeTab === 'feed' ? styles.navIconItemActive : ''}`}
              onClick={() => onTabChange?.('feed')}
              title="Inicio"
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.9 }}
            >
              <Home size={20} />
            </motion.span>
            
            <motion.span
              className={`${styles.navIconItem} ${activeTab === 'profile' ? styles.navIconItemActive : ''}`}
              onClick={() => onTabChange?.('profile')}
              title="Perfil"
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.9 }}
            >
              <User size={20} />
            </motion.span>
            
            <motion.span
              className={`${styles.navIconItem} ${activeTab === 'messages' ? styles.navIconItemActive : ''}`}
              onClick={() => onTabChange?.('messages')}
              title="Mensajes"
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.9 }}
            >
              <MessageCircle size={20} />
              <AnimatePresence>
                {chatNotificationCount > 0 && (
                  <motion.div
                    className={styles.notificationBadge}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    {chatNotificationCount > 9 ? '9+' : chatNotificationCount}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.span>
            
            <motion.span
              className={styles.notificationBellWrapper}
              onClick={handleNotificationsClick}
              title="Notificaciones"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
            >
              <Bell size={20} />
              <AnimatePresence>
                {notificationCount > 0 && (
                  <motion.div 
                    className={styles.notificationBadge}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.span>
          </div>

          <div className={styles.navRight}>
            <div className={styles.profileMenu}>
              {isAdmin ? (
                <button className={styles.profileLinkNav} onClick={() => navigate('/admin')}>
                  Panel de administración
                </button>
              ) : (<></>)}

              {user?.avatar_url ? (
                <img className={styles.navUserAvatar} src={addCacheBust(user.avatar_url)} alt={user.username} />
              ) : (
                <span className={styles.navUserAvatar}>{user?.username?.slice(0, 2).toUpperCase()}</span>
              )}

              <button type="button" className={styles.profileLinkNav} onClick={() => navigate(`/u/${user?.username}`)}>
                {user?.username}
              </button>

              <motion.button 
                onClick={onLogout} 
                title="Cerrar sesión"
                whileHover={{ scale: 1.1, color: "var(--primary)" }}
                whileTap={{ scale: 0.9 }}
              >
                <LogOut size={18} />
              </motion.button>
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {showNotifications && (
          <motion.div 
            className={styles.notificationsPanel}
            initial={{ opacity: 0, y: -15, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {notifications.length > 0 ? (
              <>
                <div className={styles.notificationsHeader}>
                  <button onClick={markAllRead} className={styles.markAllReadBtn}>
                    Marcar todas como leídas
                  </button>
                </div>
                {notifications.map(notif => (
                  <motion.button
                    type="button"
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`${styles.notificationItem} ${notif.leida ? styles.notificationItemRead : styles.notificationItemUnread}`}
                    whileHover={{ x: 4, backgroundColor: "var(--bg-secondary)" }}
                    transition={{ duration: 0.1 }}
                  >
                    <p className={styles.notificationTitle}>{notif.titulo || 'Nueva notificación'}</p>
                    <p className={styles.notificationMsg}>{notif.mensaje}</p>
                  </motion.button>
                ))}
              </>
            ) : (
              <div className={styles.noNotifications}>
                No tienes notificaciones
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

Navbar.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    username: PropTypes.string,
    avatar_url: PropTypes.string,
    isAdmin: PropTypes.bool,
  }),
  onSearchChange: PropTypes.func,
  notificationCount: PropTypes.number,
  chatNotificationCount: PropTypes.number,
  activeTab: PropTypes.string,
  onTabChange: PropTypes.func,
  onLogout: PropTypes.func,
  onNotificationsRead: PropTypes.func,
  onNotificationRead: PropTypes.func,
  onPostNotificationOpen: PropTypes.func,
};
