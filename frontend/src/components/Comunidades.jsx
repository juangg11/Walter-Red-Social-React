import { useEffect, useState } from 'react';
import request from '../api/client';
import styles from './Comunidades.module.css';

const CAT_COLORS = {
  'música':{ tag: '#FBEAF0', tagText: '#72243E', avatar: '#FBEAF0', avatarText: '#72243E' },
  'ciencia':{ tag: '#E1F5EE', tagText: '#085041', avatar: '#E1F5EE', avatarText: '#085041' },
  'deportes':{ tag: '#E6F1FB', tagText: '#0C447C', avatar: '#E6F1FB', avatarText: '#0C447C' },
  'entretenimiento':{ tag: '#FAEEDA', tagText: '#633806', avatar: '#FAEEDA', avatarText: '#633806' },
  'arte':{ tag: '#FAECE7', tagText: '#712B13', avatar: '#FAECE7', avatarText: '#712B13' },
  'noticias':{ tag: '#F1EFE8', tagText: '#444441', avatar: '#F1EFE8', avatarText: '#444441' },
  'negocios':{ tag: '#EAF3DE', tagText: '#27500A', avatar: '#EAF3DE', avatarText: '#27500A' },
  'criptos':{ tag: '#AFA9EC', tagText: '#26215C', avatar: '#AFA9EC', avatarText: '#26215C' },
  'conocer gente':{ tag: '#EEEDFE', tagText: '#3C3489', avatar: '#EEEDFE', avatarText: '#3C3489' },
  'otro':{ tag: '#F1EFE8', tagText: '#444441', avatar: '#F1EFE8', avatarText: '#444441' },
};

const CATEGORIES = ['música', 'ciencia', 'deportes', 'entretenimiento', 'arte', 'noticias', 'negocios', 'criptos', 'conocer gente', 'otro'];

function initials(name = '') {
  return name.replace('w/', '').slice(0, 2).toUpperCase();
}

function fmtCount(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
}

export default function Communities({ user, onCommunityCreated }) {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [sort, setSort] = useState('members');
  const [showModal, setShowModal] = useState(false);

  const [mName, setMName] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mCat, setMCat] = useState('otro');
  const [mError, setMError] = useState('');
  const [saving, setSaving] = useState(false);
  const userId = user.id;

  async function fetchCommunities() {
    setLoading(true);
    try {
      const data = await request(`/comunidades?userId=${userId}`);
      setCommunities(data);
    } catch (e) {
      console.error('fetchCommunities:', e);
    }
    setLoading(false);
  }

  useEffect(() => {
    let ignore = false;

    request(`/comunidades?userId=${userId}`)
      .then(data => {
        if (!ignore) setCommunities(data);
      })
      .catch(e => console.error('fetchCommunities:', e))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [userId]);

  async function handleJoin(comunidadId) {
    try {
      await request(`/comunidades/${comunidadId}/unirse`, { method: 'POST', body: JSON.stringify({}) });
      setCommunities(cur => cur.map(c => c.id === comunidadId ? { ...c, es_miembro: 1, numero_miembros: c.numero_miembros + 1 } : c));
      onCommunityCreated?.();
    } catch (e) {
      console.error('handleJoin:', e);
    }
  }

  async function handleLeave(comunidadId) {
    try {
      await request(`/comunidades/${comunidadId}/abandonar`, { method: 'DELETE' });
      setCommunities(cur => cur.map(c => c.id === comunidadId ? { ...c, es_miembro: 0, numero_miembros: Math.max(0, c.numero_miembros - 1) } : c));
      onCommunityCreated?.();
    } catch (e) {
      console.error('handleLeave:', e);
    }
  }

  async function handleCreate() {
    const name = mName.trim();
    if (!name) { setMError('El nombre es obligatorio.'); return; }

    setSaving(true);
    try {
      await request('/comunidades', { method: 'POST', body: JSON.stringify({ nombre: name.startsWith('w/') ? name : 'w/' + name, descripcion: mDesc.trim() || null, categoria: mCat }) });
      await fetchCommunities();
      onCommunityCreated?.();
      setShowModal(false);
    } catch (e) {
      setMError(e.message);
    }
    setSaving(false);
  }

  const q = search.toLowerCase().trim();
  const filtered = communities.filter(c =>
    (!q || c.nombre?.toLowerCase().includes(q) || c.descripcion?.toLowerCase().includes(q)) &&
    (!catFilter || c.categoria === catFilter)
  ).sort((a, b) => {
    if (sort === 'members') return (b.numero_miembros || 0) - (a.numero_miembros || 0);
    if (sort === 'posts') return (b.numero_posts || 0) - (a.numero_posts || 0);
    if (sort === 'name') return (a.nombre || '').localeCompare(b.nombre || '');
    return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
  });
  const existingCats = [...new Set(communities.map(c => c.categoria).filter(Boolean))];

  return (
    <div>
      <div className={styles.headerBlock}>
        <div>
          <p className={styles.headerTitle}>Comunidades</p>
          <p className={styles.headerSubtitle}>
            {filtered.length === communities.length ? `${communities.length} comunidades` : `${filtered.length} de ${communities.length} comunidades`}
          </p>
        </div>
        <button onClick={() => { setMName(''); setMDesc(''); setMCat('otro'); setMError(''); setShowModal(true); }} className={styles.comunidadesBtnPrimary}>
          + Nueva comunidad
        </button>
      </div>

      <div className={styles.filtersRow}>
        <input type="text" placeholder="Buscar comunidades..." value={search} onChange={e => setSearch(e.target.value)} className={styles.comunidadesInput} style={{ flex: 1, minWidth: '10rem' }} />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={styles.comunidadesSelect}>
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className={styles.comunidadesSelect}>
          <option value="members">Más miembros</option>
          <option value="posts">Más posts</option>
          <option value="name">Nombre A-Z</option>
          <option value="new">Más recientes</option>
        </select>
      </div>

      <div className={styles.tagsRow}>
        {existingCats.map(cat => {
          const colors = CAT_COLORS[cat] || CAT_COLORS.otro;
          const active = catFilter === cat;
          return (
            <span
              key={cat}
              onClick={() => setCatFilter(prev => prev === cat ? '' : cat)}
              className={styles.tagItem}
              style={{
                background: colors.tag,
                color: colors.tagText,
                opacity: active ? 1 : 0.6,
                outline: active ? `1.5px solid ${colors.tagText}` : 'none',
                outlineOffset: '2px'
              }}
            >
              {cat}
            </span>
          );
        })}
      </div>

      {loading ? (
        <p className={styles.headerSubtitle}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 0', fontSize: '0.875rem' }}>No se encontraron comunidades</p>
      ) : (
        <div className={styles.cardGrid}>
          {filtered.map(c => {
            const cat    = c.categoria || 'otro';
            const colors = CAT_COLORS[cat] || CAT_COLORS.otro;
            return (
              <div key={c.id} className={styles.comunidadesCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardAvatar} style={{ background: colors.avatar, color: colors.avatarText }}>
                    {initials(c.nombre)}
                  </div>
                  <div className={styles.cardInfo}>
                    <p className={styles.cardName}>{c.nombre}</p>
                    <span className={styles.tagItem} style={{ background: colors.tag, color: colors.tagText }}>{cat}</span>
                  </div>
                </div>
                <p className={styles.cardDesc}>{c.descripcion || 'Sin descripción.'}</p>
                <div className={styles.cardStats}>
                  <span>{fmtCount(c.numero_miembros || 0)} miembros</span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>{fmtCount(c.numero_posts || 0)} posts</span>
                </div>
                <button
                  onClick={() => c.es_miembro ? handleLeave(c.id) : handleJoin(c.id)}
                  className={c.es_miembro ? styles.comunidadesBtnGhost : styles.comunidadesBtnPrimary}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', alignSelf: 'flex-start' }}
                >
                  {c.es_miembro ? 'Abandonar' : 'Unirse'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div onClick={() => setShowModal(false)} className={styles.modalOverlay}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <p className={styles.modalTitle}>Crear comunidad</p>

            <div style={{ marginBottom: '1rem' }}>
              <label className={styles.comunidadesLabel}>Nombre *</label>
              <input type="text" placeholder="ej. w/JavaScript" value={mName} onChange={e => { setMName(e.target.value); setMError(''); }} className={styles.comunidadesInput} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className={styles.comunidadesLabel}>Descripción</label>
              <textarea placeholder="¿De qué trata esta comunidad?" value={mDesc} onChange={e => setMDesc(e.target.value)} rows={3} className={styles.comunidadesInput} style={{ resize: 'none' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className={styles.comunidadesLabel}>Categoría</label>
              <select value={mCat} onChange={e => setMCat(e.target.value)} className={styles.comunidadesSelect} style={{ width: '100%' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {mError && <p className={styles.errorText}>{mError}</p>}

            <div className={styles.modalActions}>
              <button onClick={() => setShowModal(false)} className={styles.comunidadesBtnGhost}>Cancelar</button>
              <button onClick={handleCreate} disabled={saving} className={styles.comunidadesBtnPrimary} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'Creando...' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
