import { useEffect, useRef, useState } from 'react';
import { Bell, ImagePlus, Moon, Type, UserRound } from 'lucide-react';
import request from '../api/client';
import { uploadToCloudinary } from '../utils/cloudinary';
import styles from './SettingsPage.module.css';

export default function SettingsPage({ user, settings, onSettingsChange, onUserUpdate }) {
  const fileInputRef = useRef(null);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');
  const [avatarStatus, setAvatarStatus] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState('');

  useEffect(() => {
    setAvatarUrl(user.avatar_url || '');
  }, [user.avatar_url]);

  const memberSince = user.fecha_creacion ? new Date(user.fecha_creacion).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Sin fecha disponible';

  function updateNotifications(patch) {
    onSettingsChange({ ...settings, notifications: { ...settings.notifications, ...patch } });
  }

  async function handleAvatarSelection(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setAvatarStatus('');

    try {
      const uploaded = await uploadToCloudinary(file, 'walter/avatars');
      const updated = await request('/usuarios/perfil', { method: 'PATCH', body: JSON.stringify({ avatar_url: uploaded.asset.secure_url }) });
      setAvatarUrl(updated.avatar_url || uploaded.asset.secure_url);
      onUserUpdate(updated);
      setAvatarStatus('Avatar actualizado.');
    } catch (error) {
      setAvatarStatus(error.message);
    }

    event.target.value = '';
    setUploadingAvatar(false);
  }

  async function handleDesktopNotifications(nextValue) {
    setNotificationStatus('');

    if (!nextValue) {
      updateNotifications({ desktopMessages: false });
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationStatus('Este navegador no soporta notificaciones del sistema.');
      return;
    }

    const permission = Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;

    const granted = permission === 'granted';
    updateNotifications({ desktopMessages: granted });
    setNotificationStatus(
      granted
        ? 'Permiso concedido.'
        : 'Permiso bloqueado. Tendrás que habilitarlo desde el navegador.'
    );
  }

  return (
    <main className={styles.settingsPage}>
      <div className={styles.settingsShell}>
        <section className={styles.settingsPanel}>
          <div className={styles.settingsSectionTitle}>
            <UserRound size={16} />
            <h2>Cuenta</h2>
          </div>

          <div className={styles.settingsAccountGrid}>
            <div className={styles.settingsAvatarBlock}>
              <div className={styles.settingsAvatarFrame}>
                {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : <span>{user.username.slice(0, 2).toUpperCase()}</span>}
              </div>
              <div className={styles.settingsAvatarCopy}>
                <strong>w/{user.username}</strong>
                <span>{user.email}</span>
                <small>Miembro desde {memberSince}</small>
              </div>
            </div>

            <div className={styles.settingsCardMinimal}>
              <p className={styles.settingsCardLabel}>Avatar</p>
              <div className={styles.settingsInlineActions}>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
                  <ImagePlus size={16} />
                  <span>{uploadingAvatar ? 'Subiendo...' : 'Subir imagen'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleAvatarSelection}
                />
              </div>
              {avatarStatus && <p className={styles.settingsInlineStatus}>{avatarStatus}</p>}
            </div>
          </div>
        </section>

        <section className={styles.settingsPanel}>
          <div className={styles.settingsSectionTitle}>
            <Type size={16} />
            <h2>Lectura</h2>
          </div>

          <div className={styles.settingsTextSizeRow}>
            <span className={styles.settingsRowLabel}>Tamaño del texto</span>
            <div className={styles.settingsSegmented}>
              {[
                ['md', 'Normal'],
                ['lg', 'Grande'],
                ['xl', 'Muy grande'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={settings.textSize === value ? styles.active : ''}
                  onClick={() => onSettingsChange({ ...settings, textSize: value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <ToggleRow
            title="Contraste alto"
            checked={settings.contrast === 'high'}
            onChange={checked => onSettingsChange({ ...settings, contrast: checked ? 'high' : 'normal' })}
          />
          <ToggleRow
            title="Reducir animaciones"
            checked={settings.reduceMotion}
            onChange={checked => onSettingsChange({ ...settings, reduceMotion: checked })}
          />
        </section>

        <section className={styles.settingsPanel}>
          <div className={styles.settingsSectionTitle}>
            <Bell size={16} />
            <h2>Notificaciones</h2>
          </div>

          <ToggleRow
            title="Aviso dentro de Walter"
            checked={settings.notifications.chatToasts}
            onChange={checked => updateNotifications({ chatToasts: checked })}
          />
          <ToggleRow
            title="Notificación del navegador"
            checked={settings.notifications.desktopMessages}
            onChange={handleDesktopNotifications}
          />
          {notificationStatus && <p className={styles.settingsInlineStatus}>{notificationStatus}</p>}
        </section>

        <section className={styles.settingsPanel}>
          <div className={styles.settingsSectionTitle}>
            <Moon size={16} />
            <h2>Apariencia</h2>
          </div>

          <ToggleRow
            title="Tema oscuro"
            checked={settings.theme === 'dark'}
            onChange={checked => onSettingsChange({ ...settings, theme: checked ? 'dark' : 'light' })}
          />
        </section>
      </div>
    </main>
  );
}

function ToggleRow({ title, checked, onChange }) {
  return (
    <div className={styles.settingsToggleRow}>
      <div className={styles.settingsToggleCopy}>
        <strong>{title}</strong>
      </div>
      <button
        type="button"
        className={`${styles.settingsSwitch} ${checked ? styles.settingsSwitchOn : ''}`}
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

