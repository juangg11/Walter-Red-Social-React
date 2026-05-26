import { useState } from 'react';
import request from '../api/client';
import { Mail, Lock, User, X, MessageSquare, HelpCircle, ArrowRight } from 'lucide-react';
import styles from './Auth.module.css';

export default function Auth({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const [activeFooterTab, setActiveFooterTab] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    }
    setLoading(false);
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, username }) });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.message || 'Error al registrar la cuenta');
    }
    setLoading(false);
  }

  function openAuthModal(signUpMode) {
    setIsSignUp(signUpMode);
    setError('');
    setIsModalOpen(true);
  }

  function closeAuthModal() {
    setIsModalOpen(false);
    setError('');
  }

  return (
    <div className={styles.landingPage}>
      {/* Luces de fondo cinéticas (Efecto Aurora) */}
      <div className={styles.auroraGlow1}></div>
      <div className={styles.auroraGlow2}></div>

      {/* Contenido Principal con animación de entrada escalonada */}
      <main className={styles.mainContent}>
        <div className={styles.heroSection}>
          
          {/* LOGO: Letra "W" con tipografía premium y animación fluida */}
          <div className={styles.logoContainer}>
            <span className={styles.textLogoMark}>W</span>
            <div className={styles.logoReflection}></div>
          </div>

          <h1 className={styles.mainTitle}>Encuentra tu comunidad.</h1>
          <p className={styles.tagline}>
            Únete a <span className={styles.brandText}>Walter</span>, el espacio donde las ideas cobran vida, los hilos fluyen libres y tus intereses encuentran su hogar definitivo.
          </p>

          <div className={styles.actionButtons}>
            <button 
              className={styles.primaryActionBtn} 
              onClick={() => openAuthModal(true)}
            >
              Comenzar ahora
              <ArrowRight size={18} className={styles.arrowIcon} />
            </button>
            <button 
              className={styles.secondaryActionBtn} 
              onClick={() => openAuthModal(false)}
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </main>

      {/* Drawer de información con transición suave */}
      {activeFooterTab && (
        <div className={styles.infoDrawer}>
          <div className={styles.infoDrawerContent}>
            <button className={styles.closeDrawerBtn} onClick={() => setActiveFooterTab(null)}>
              <X size={16} />
            </button>
            {activeFooterTab === 'ayuda' && (
              <>
                <h4>Centro de Ayuda y Soporte</h4>
                <p>¿Tienes problemas para acceder? Asegúrate de que tus credenciales coincidan con las registradas. Si experimentas comportamientos inesperados, limpia la caché de tu navegador o contacta con la administración.</p>
              </>
            )}
            {activeFooterTab === 'contacto' && (
              <>
                <h4>Contacto de Prensa y Soporte</h4>
                <p>¿Quieres reportar un bug o hacernos una propuesta? Escríbenos directamente a <span className={styles.highlightText}>support@walter.network</span> o búscanos en los canales comunitarios oficiales.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer minimalista */}
      <footer className={styles.landingFooter}>
        <div className={styles.footerLinks}>
          <button 
            className={`${styles.footerLinkItem} ${activeFooterTab === 'ayuda' ? styles.activeLink : ''}`}
            onClick={() => setActiveFooterTab(activeFooterTab === 'ayuda' ? null : 'ayuda')}
          >
            <HelpCircle size={14} />
            Ayuda
          </button>
          <button 
            className={`${styles.footerLinkItem} ${activeFooterTab === 'contacto' ? styles.activeLink : ''}`}
            onClick={() => setActiveFooterTab(activeFooterTab === 'contacto' ? null : 'contacto')}
          >
            <MessageSquare size={14} />
            Contacto
          </button>
        </div>
        <p className={styles.copyright}>&copy; {new Date().getFullYear()} Walter. Red Social Comunitario.</p>
      </footer>

      {/* MODAL DE AUTENTICACIÓN AVANZADO */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={closeAuthModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeAuthModal} title="Cerrar">
              <X size={20} />
            </button>

            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {isSignUp ? 'Crea tu cuenta en Walter' : 'Te damos la bienvenida'}
              </h2>
              <p className={styles.modalSubtitle}>
                {isSignUp ? 'Completa los campos para unirte a la red.' : 'Introduce tus credenciales para continuar.'}
              </p>
            </div>

            <form onSubmit={isSignUp ? handleSignUp : handleLogin} className={styles.form}>
              {isSignUp && (
                <div className={styles.inputGroup}>
                  <User size={18} className={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="Nombre de usuario"
                    value={username}
                    onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
                    required
                    maxLength={30}
                    autoComplete="username"
                  />
                </div>
              )}

              <div className={styles.inputGroup}>
                <Mail size={18} className={styles.inputIcon} />
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className={styles.inputGroup}>
                <Lock size={18} className={styles.inputIcon} />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && <p className={styles.errorText}>{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className={styles.submitBtn}
              >
                {loading ? 'Procesando...' : (isSignUp ? 'Registrarse y Entrar' : 'Iniciar Sesión')}
              </button>
            </form>

            <div className={styles.toggleContainer}>
              <p className={styles.toggleText}>
                {isSignUp ? '¿Ya formas parte de Walter?' : '¿Aún no tienes cuenta?'}
              </p>
              <button
                onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                className={styles.toggleBtn}
              >
                {isSignUp ? 'Acceder con mi cuenta' : 'Crear una cuenta nueva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}