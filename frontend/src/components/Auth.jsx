import { useState } from 'react';
import request from '../api/client';
import { Mail, Lock, User } from 'lucide-react';
import styles from './Auth.module.css';

export default function Auth({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const [error, setError] = useState('');

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
      setError(err.message);
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
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        <div className={styles.header}>
          <h1 className={styles.logo}>w/Walter</h1>
          <p className={styles.subtitle}>¡Comparte tus ideas con la comunidad!</p>
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
            />
          </div>

          {error && <p className={styles.errorText}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={styles.submitBtn}
          >
            {loading ? 'Cargando...' : (isSignUp ? 'Registrarse' : 'Entrar')}
          </button>
        </form>

        <div className={styles.toggleContainer}>
          <p className={styles.toggleText}>
            {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
          </p>
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            className={styles.toggleBtn}
          >
            {isSignUp ? 'Entrar' : 'Crear Cuenta'}
          </button>
        </div>
      </div>
    </div>
  );
}