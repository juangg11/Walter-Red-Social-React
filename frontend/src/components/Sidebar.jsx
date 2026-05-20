import { useEffect, useState } from 'react';
import request from '../api/client';
import styles from './Sidebar.module.css';

export const CommunitiesSidebar = ({ communities = [], selectedCommunities = [], onSelectCommunities }) => {
  const [showAll, setShowAll] = useState(false);
  const joinedCommunities = communities.filter(c => Boolean(c.es_miembro));
  const selectedIds = selectedCommunities.map(String);

  function toggleCommunity(community) {
    const id = String(community.id);
    if (!id) return;
    const next = selectedIds.includes(id)
      ? selectedIds.filter(cur => cur !== id)
      : [...selectedIds, id];
    onSelectCommunities(next);
  }

  function selectAll() {
    const allIds = joinedCommunities.map(c => String(c.id));
    const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.includes(id));
    onSelectCommunities(allSelected ? [] : allIds);
  }

  const displayed = showAll ? joinedCommunities : joinedCommunities.slice(0, 6);

  return (
    <div className={styles.sidebarLeft}>
      <div className={styles.headerRow}>
        <h3>Mis Comunidades</h3>
        <button onClick={selectAll} className={styles.textBtn}>
          {joinedCommunities.length > 0 && selectedIds.length === joinedCommunities.length ? 'Limpiar' : 'Todas'}
        </button>
      </div>

      <div className={styles.listContainer}>
        {displayed.length > 0 ? displayed.map((community) => {
          const id = String(community.id);
          const isSelected = selectedIds.includes(id);
          return (
            <div
              key={id}
              onClick={() => toggleCommunity(community)}
              className={`${styles.communityItem} ${isSelected ? styles.communityItemSelected : styles.communityItemNormal}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleCommunity(community)}
                onClick={e => e.stopPropagation()}
              />
              <span>{community.nombre || 'Comunidad'}</span>
            </div>
          );
        }) : (
          <p className={styles.emptyText}>No hay comunidades</p>
        )}

        {joinedCommunities.length > 6 && (
          <button onClick={() => setShowAll(v => !v)} className={styles.moreBtn}>
            {showAll ? 'Ver menos' : 'Ver más'}
          </button>
        )}
      </div>
    </div>
  );
};

export const TrendingSidebar = ({ onPostClick }) => {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await request('/publicaciones');
        const sorted = [...data].sort((a, b) => (b.votos || 0) - (a.votos || 0)).slice(0, 5);
        setTrending(sorted);
      } catch (e) {
        console.error('TrendingSidebar:', e);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className={styles.sidebarRight}>
      <h3 className={styles.trendingTitle}>Tendencias</h3>
      {loading ? (
        <p className={styles.emptyText}>Cargando...</p>
      ) : (
        <div className={styles.listContainer}>
          {trending.length > 0 ? trending.map((post, idx) => (
            <div
              key={post.id}
              onClick={() => onPostClick?.(post)}
              className={styles.trendingItem}
            >
              <p className={styles.trendingPostTitle}>
                {idx + 1}. {post.titulo || 'Sin título'}
              </p>
              <p className={styles.trendingVotesCount}>{post.votos || 0} votos</p>
            </div>
          )) : (
            <p className={styles.emptyText}>No hay tendencias</p>
          )}
        </div>
      )}
    </div>
  );
};
