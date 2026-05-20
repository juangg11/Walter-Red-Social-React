import { Search, Home, User, LogOut, Bell, Users, MessageCircle, Settings } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import request from '../api/client';
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
            <div className={styles.navLogo} onClick={() => onTabChange?.('feed')}>
              <img className={styles.navLogoMark} src="/walter.png" alt="Walter" />
            </div>
            <div className={styles.navSearch}>
              <Search size={16} />
              <input type="text" placeholder="Buscar posts y usuarios..." onChange={e => onSearchChange?.(e.target.value)} />
            </div>
          </div>

          <div className={styles.navCenterIcons}>
            <span
              className={`${styles.navIconItem} ${activeTab === 'feed' ? styles.navIconItemActive : ''}`}
              onClick={() => onTabChange?.('feed')}
              title="Inicio"
            >
              <Home size={20} />
            </span>
            <span
              className={`${styles.navIconItem} ${activeTab === 'messages' ? styles.navIconItemActive : ''}`}
              onClick={() => onTabChange?.('messages')}
              title="Mensajes"
            >
              <MessageCircle size={20} />
            </span>
            <span
              className={`${styles.navIconItem} ${activeTab === 'communities' ? styles.navIconItemActive : ''}`}
              onClick={() => onTabChange?.('communities')}
              title="Comunidades"
            >
              <Users size={20} />
            </span>
            <span
              className={`${styles.navIconItem} ${activeTab === 'profile' ? styles.navIconItemActive : ''}`}
              onClick={() => onTabChange?.('profile')}
              title="Perfil"
            >
              <User size={20} />
            </span>
            <span
              className={`${styles.navIconItem} ${activeTab === 'settings' ? styles.navIconItemActive : ''}`}
              onClick={() => onTabChange?.('settings')}
              title="Settings"
            >
              <Settings size={20} />
            </span>
            <span
              className={styles.notificationBellWrapper}
              onClick={handleNotificationsClick}
              title="Notificaciones"
            >
              <Bell size={20} />
              {notificationCount > 0 && (
                <div className={styles.notificationBadge}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </div>
              )}
            </span>
          </div>

          <div className={styles.navRight}>
            <div className={styles.profileMenu}>
              {user?.avatar_url ? (
                <img className={styles.navUserAvatar} src={user.avatar_url} alt={user.username} />
              ) : (
                <span className={styles.navUserAvatar}>{user?.username?.slice(0, 2).toUpperCase()}</span>
              )}
              <button type="button" className={styles.profileLinkNav} onClick={() => navigate(`/u/${user?.username}`)}>{user?.username}</button>
              <button onClick={onLogout} title="Cerrar sesión"><LogOut size={18} /></button>
            </div>
          </div>

        </div>
      </nav>

      {showNotifications && (
        <div className={styles.notificationsPanel}>
          {notifications.length > 0 ? (
            <>
              <div className={styles.notificationsHeader}>
                <button onClick={markAllRead} className={styles.markAllReadBtn}>
                  Marcar todas como leídas
                </button>
              </div>
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={styles.notificationItem}
                >
                  <p className={styles.notificationTitle}>{notif.titulo || 'Nueva notificación'}</p>
                  <p className={styles.notificationMsg}>{notif.mensaje}</p>
                </div>
              ))}
            </>
          ) : (
            <div className={styles.noNotifications}>
              No tienes notificaciones
            </div>
          )}
        </div>
      )}
    </>
  );
}
