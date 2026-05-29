import { Search, Home, User, LogOut, Bell, Users, MessageCircle, Settings } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import request from '../api/client';
import { addCacheBust } from '../utils/imageCacheBust';
import styles from './Navbar.module.css';

export default function Navbar({ user, onSearchChange, notificationCount = 0, activeTab, onTabChange, onLogout, onNotificationsRead }) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

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
      setNotifications(cur => cur.filter(n => n.id !== notificationId));
    } catch (e) {
      console.error('markAsRead:', e);
    }
  }

  async function markAllRead() {
    try {
      await request('/notificaciones/leer-todas', { method: 'PATCH' });
      setNotifications([]);
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
            <button className={styles.profileLinkNav} onClick={() => navigate('/admin')}>
              Panel de administración
            </button>
            <div className={styles.profileMenu}>
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
                  <motion.div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={styles.notificationItem}
                    whileHover={{ x: 4, backgroundColor: "var(--bg-secondary)" }}
                    transition={{ duration: 0.1 }}
                  >
                    <p className={styles.notificationTitle}>{notif.titulo || 'Nueva notificación'}</p>
                    <p className={styles.notificationMsg}>{notif.mensaje}</p>
                  </motion.div>
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