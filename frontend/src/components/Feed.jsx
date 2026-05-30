import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowBigUp, ArrowBigDown, MessageSquare, Plus, Repeat2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import PostModal from './PostModal';
import PostCreate from './PostCreate';
import request from '../api/client';
import { computeVote } from '../utils/computeVote';
import styles from './Feed.module.css';

function formatCommunityName(name) {
  if (!name) return '';
  return String(name).replace(/^w\//i, '');
}

export function PostCard({ post, userVote, onVote, onClick, onShare, onAuthorClick = null }) {
  const communityName = formatCommunityName(post.comunidad_nombre);
  const isShared = Boolean(post.compartido_por_usuario);
  const mediaNode = post.url_video
    ? (
      <video src={post.url_video} controls>
        <track kind="captions" />
      </video>
    )
    : post.url_imagen
      ? <img src={post.url_imagen} alt={post.titulo} />
      : null;

  return (
    <div
      className={styles.postCard}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
    >
      <div className={styles.votes}>
        <button
          type="button"
          className={styles.voteBtn}
          title="Votar positivo"
          onClick={e => { e.stopPropagation(); onVote(post.id, 'up'); }}
          style={{ color: userVote === 'up' ? 'var(--primary)' : 'var(--secondary)' }}
        >
          <ArrowBigUp size={20} />
        </button>
        <span className={styles.voteCount}>{post.votos ?? 0}</span>
        <button
          type="button"
          className={styles.voteBtn}
          title="Votar negativo"
          onClick={e => { e.stopPropagation(); onVote(post.id, 'down'); }}
          style={{ color: userVote === 'down' ? 'var(--primary)' : 'var(--secondary)' }}
        >
          <ArrowBigDown size={20} />
        </button>
      </div>

      <div className={styles.postContent}>
        <p className={styles.postMeta}>
          Publicado por <button type="button" className={styles.inlineUserLink} onClick={e => { e.stopPropagation(); onAuthorClick?.(post.username); }}>{post.username ?? 'anon'}</button>
          {communityName ? ` en w/${communityName}` : ''}
        </p>
        <h3>{post.titulo ?? 'Sin título'}</h3>

        {mediaNode}

        <p>{post.contenido ?? ''}</p>

        <div className={styles.postFooter}>
          <MessageSquare size={18} />
          <span>{post.numero_comentarios ?? 0} Comentarios</span>
          <button
            type="button"
            className={`${styles.postShareBtn} ${isShared ? styles.postShareBtnActive : ''}`}
            onClick={e => {
              e.stopPropagation();
              onShare?.(post);
            }}
          >
            <Repeat2 size={16} />
            <span>{isShared ? 'Compartido' : 'Compartir'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Feed({ user, searchQuery, selectedCommunities, communities = [] }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [userVotes, setUserVotes] = useState({});
  const userId = user.id;

  async function fetchPosts() {
    setLoading(true);
    try {
      const data = await request(`/publicaciones?userId=${userId}`);
      setPosts(data);
      const votesMap = {};
      data.forEach(p => { if (p.voto_usuario) votesMap[p.id] = p.voto_usuario; });
      setUserVotes(votesMap);
    } catch (e) {
      console.error('fetchPosts:', e);
    }
    setLoading(false);
  }

  useEffect(() => {
    let ignore = false;

    request(`/publicaciones?userId=${userId}`)
      .then(data => {
        if (ignore) return;
        setPosts(data);
        const votesMap = {};
        data.forEach(p => { if (p.voto_usuario) votesMap[p.id] = p.voto_usuario; });
        setUserVotes(votesMap);
      })
      .catch(e => console.error('fetchPosts:', e))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [userId]);

  async function handleVote(postId, voteType) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const previousVotes = post.votos;
    const previousVote = userVotes[postId] ?? null;

    const { nextVote, votes } = computeVote({
      currentVote: previousVote,
      voteType,
      votes: post.votos,
    });

    setPosts(cur => cur.map(p => p.id === postId ? { ...p, votos: votes } : p));
    setUserVotes(cur => ({ ...cur, [postId]: nextVote }));

    try {
      const result = await request(`/publicaciones/${postId}/votar`, { method: 'POST', body: JSON.stringify({ tipo_voto: voteType }) });
      const serverPost = result.post || { ...post, votos: result.votos, voto_usuario: result.voto };
      setPosts(cur => cur.map(p => p.id === postId ? serverPost : p));
      setUserVotes(cur => ({ ...cur, [postId]: result.voto }));
    } catch {
      setPosts(cur => cur.map(p => p.id === postId ? { ...p, votos: previousVotes } : p));
      setUserVotes(cur => ({ ...cur, [postId]: previousVote }));
    }
  }

  function syncPost(updatedPost) {
    setPosts(cur => cur.map(p => p.id === updatedPost.id ? updatedPost : p));
    setUserVotes(cur => ({ ...cur, [updatedPost.id]: updatedPost.voto_usuario ?? cur[updatedPost.id] ?? null }));
    setSelectedPost(prev => prev?.id === updatedPost.id ? updatedPost : prev);
  }

  function handlePostDeleted(postId) {
    setPosts(cur => cur.filter(p => String(p.id) !== String(postId)));
    setSelectedPost(null);
  }

  function handleCommentAdded(postId, count) {
    setPosts(cur => cur.map(p => p.id === postId ? { ...p, numero_comentarios: count } : p));
  }

  async function handleShare(post) {
    try {
      const updated = post.compartido_por_usuario
        ? await request(`/usuarios/compartidos/${post.id}`, { method: 'DELETE' })
        : await request(`/usuarios/compartidos/${post.id}`, { method: 'POST', body: JSON.stringify({}) });

      setPosts(cur => cur.map(item => item.id === post.id ? updated : item));
      setSelectedPost(cur => cur?.id === post.id ? updated : cur);
      return updated;
    } catch (e) {
      console.error('sharePost:', e);
      return null;
    }
  }

  const filteredPosts = posts.filter(p => {
    const q = searchQuery?.toLowerCase().trim();
    const matchesSearch = !q ||
      p.titulo?.toLowerCase().includes(q) ||
      p.contenido?.toLowerCase().includes(q) ||
      p.username?.toLowerCase().includes(q);
    const matchesCommunity = !selectedCommunities?.length ||
      selectedCommunities.map(String).includes(String(p.comunidad_id));
    return matchesSearch && matchesCommunity;
  });

  let emptyMessage = 'Sé el primero en compartir algo en w/Walter';
  if (searchQuery) emptyMessage = 'No se encontraron posts con esa búsqueda';
  else if (selectedCommunities?.length) emptyMessage = 'No hay posts en las comunidades seleccionadas';

  return (
    <>
      <div className={styles.feed}>
        {loading ? (
          <EmptyCard><p>Cargando posts...</p></EmptyCard>
        ) : filteredPosts.length === 0 ? (
          <EmptyCard>
            <h3>Sin posts</h3>
            <p>{emptyMessage}</p>
          </EmptyCard>
        ) : (
          filteredPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              userVote={userVotes[post.id]}
              onVote={handleVote}
              onShare={handleShare}
              onAuthorClick={username => navigate(`/u/${username}`)}
              onClick={() => setSelectedPost(post)}
            />
          ))
        )}
      </div>

      {selectedPost && (
        <PostModal
          post={selectedPost}
          user={user}
          onClose={() => setSelectedPost(null)}
          onCommentAdded={count => handleCommentAdded(selectedPost.id, count)}
          onPostUpdated={syncPost}
          onPostDeleted={handlePostDeleted}
          onAuthorClick={username => navigate(`/u/${username}`)}
          onShare={handleShare}
        />
      )}

      <PostCreate
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        user={user}
        communities={communities}
        onPostCreated={fetchPosts}
      />

      {createPortal(
        <button
          onClick={() => setCreateOpen(true)}
          title="Crear nuevo post"
          className={styles.floatingCreateBtn}
        >
          <Plus size={28} />
        </button>,
        document.body
      )}
    </>
  );
}

function EmptyCard({ children }) {
  return (
    <div className={styles.emptyCard}>
      <div className={styles.emptyCardContent}>{children}</div>
    </div>
  );
}

const idType = PropTypes.oneOfType([PropTypes.string, PropTypes.number]);

PostCard.propTypes = {
  post: PropTypes.shape({
    id: idType.isRequired,
    comunidad_nombre: PropTypes.string,
    compartido_por_usuario: PropTypes.bool,
    votos: PropTypes.number,
    username: PropTypes.string,
    titulo: PropTypes.string,
    url_video: PropTypes.string,
    url_imagen: PropTypes.string,
    contenido: PropTypes.string,
    numero_comentarios: PropTypes.number,
    comunidad_id: idType,
  }).isRequired,
  userVote: PropTypes.string,
  onVote: PropTypes.func.isRequired,
  onClick: PropTypes.func,
  onShare: PropTypes.func,
  onAuthorClick: PropTypes.func,
};

Feed.propTypes = {
  user: PropTypes.shape({ id: idType.isRequired }).isRequired,
  searchQuery: PropTypes.string,
  selectedCommunities: PropTypes.arrayOf(idType),
  communities: PropTypes.arrayOf(PropTypes.object),
};

EmptyCard.propTypes = {
  children: PropTypes.node,
};
