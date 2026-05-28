import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import request from '../api/client';
import { Mail, Lock, User, X, MessageSquare, HelpCircle, ArrowRight } from 'lucide-react';
import styles from './Auth.module.css';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
};

/**
 * Validates that a token conforms to the expected JWT format
 * before it is persisted to browser storage (S8475).
 */
function validateToken(token) {
  if (typeof token !== 'string') return null;
  const jwtPattern = /^[a-zA-Z0-9\-_=]+\.[a-zA-Z0-9\-_=]+\.[a-zA-Z0-9\-_=]+$/;
  return jwtPattern.test(token) ? token : null;
}

/**
 * Sanitises a user object received from the server so that no
 * tainted string values are written straight to localStorage (S8475).
 */
function sanitizeUserForStorage(userObj) {
  if (!userObj || typeof userObj !== 'object') return null;

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
    email: sanitizeString(userObj.email),
    bio: sanitizeString(userObj.bio),
    avatar_url: sanitizeString(userObj.avatar_url),
  };
}

/**
 * Persists auth credentials to localStorage after sanitisation.
 * Returns the sanitised user object so callers can pass it upstream.
 */
function persistAuthData(data) {
  const safeToken = validateToken(data.token);
  if (!safeToken) throw new Error('Token con formato no válido');

  const safeUser = sanitizeUserForStorage(data.user);
  if (!safeUser) throw new Error('Datos de usuario no válidos');

  localStorage.setItem('token', safeToken);          // sanitised ✔
  localStorage.setItem('user', JSON.stringify(safeUser)); // sanitised ✔
  return safeUser;
}

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
      const safeUser = persistAuthData(data);
      onLogin(safeUser);
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
      const safeUser = persistAuthData(data);
      onLogin(safeUser);
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

  async function handleGuestLogin() {
    setError('');
    setLoading(true);
    try {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'invitado@gmail.com', password: '123456' })
      });
      const safeUser = persistAuthData(data);
      onLogin(safeUser);
    } catch (err) {
      setError(err.message || 'Error al iniciar como invitado');
    }
    setLoading(false);
  }

  function closeAuthModal() {
    setIsModalOpen(false);
    setError('');
  }

  return (
    <div className={styles.landingPage}>
      <motion.div 
        className={styles.auroraGlow1}
        animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className={styles.auroraGlow2}
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 0.9, 0.7] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <main className={styles.mainContent}>
        <div className={styles.heroGrid}>
          
          <motion.div 
            className={styles.heroLeft}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h1 variants={itemVariants} className={styles.mainTitle}>
              Encuentra tu comunidad.
            </motion.h1>
            
            <motion.p variants={itemVariants} className={styles.tagline}>
              Únete a <span className={styles.brandText}>Walter</span>, el espacio descentralizado donde todas las ideas tienen cabida, los hilos cobran vida y tus intereses encuentran su hogar en una comunidad.
            </motion.p>
            
            <motion.div variants={itemVariants} className={styles.actionButtons}>
              <button className={styles.primaryActionBtn} onClick={() => openAuthModal(true)}>
                Comenzar ahora
                <ArrowRight size={18} className={styles.arrowIcon} />
              </button>
              <button className={styles.secondaryActionBtn} onClick={() => openAuthModal(false)}>
                Iniciar sesión
              </button>
              <div className={styles.guestBtnWrapper}>
                <button className={styles.guestBtn} onClick={handleGuestLogin} disabled={loading}>
                  {loading ? 'Entrando...' : 'Iniciar sesión como invitado'}
                </button>
              </div>
            </motion.div>
          </motion.div>

          <motion.div 
            className={styles.heroRight}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            <div className={styles.giantLogoContainer}>
              <span className={styles.textLogoMark}>W</span>
            </div>
          </motion.div>
        </div>
      </main>

      <div className={`${styles.infoDrawer} ${activeFooterTab ? styles.infoDrawerOpen : ''}`}>
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
              <h4>Contacto</h4>
              <p>¿Quieres reportar un bug o hacernos una propuesta? Escríbenos directamente a <span className={styles.highlightText}>soporte_walter@walter.com</span>.</p>
            </>
          )}
        </div>
      </div>

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
        <p className={styles.copyright}>&copy; {new Date().getFullYear()} Walter - Red Social.</p>
      </footer>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            className={styles.modalOverlay} 
            onClick={closeAuthModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className={styles.modalContent} 
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            >
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
                <AnimatePresence mode="wait">
                  {isSignUp && (
                    <motion.div 
                      className={styles.inputGroup}
                      initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                      animate={{ height: "auto", opacity: 1, marginBottom: "1.15rem" }}
                      exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
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
                    </motion.div>
                  )}
                </AnimatePresence>
                
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
                
                <button type="submit" disabled={loading} className={styles.submitBtn}>
                  {loading ? 'Procesando...' : (isSignUp ? 'Registrarse y Entrar' : 'Iniciar Sesión')}
                </button>
              </form>
              
              <div className={styles.toggleContainer}>
                <p className={styles.toggleText}>
                  {isSignUp ? '¿Ya formas parte de Walter?' : '¿Aún no tienes cuenta?'}
                </p>
                <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className={styles.toggleBtn}>
                  {isSignUp ? 'Acceder con mi cuenta' : 'Crear una cuenta nueva'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}