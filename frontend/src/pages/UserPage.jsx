import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { CalendarDays, MessageSquare, UserPlus, UserRoundCheck } from 'lucide-react';
import request from '../api/client';
import { PostCard } from '../components/Feed';
import PostModal from '../components/PostModal';
import { computeVote } from '../utils/computeVote';
import { addCacheBust } from '../utils/imageCacheBust';
import styles from './UserPage.module.css';

const TABS = [
  ['posts', 'Posts'],
  ['comments', 'Respuestas'],
  ['shared', 'Compartidos'],
];

export default function UserPage({ user, onUserUpdate }) {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [sharedPosts, setSharedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [bioDraft, setBioDraft] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [userVotes, setUserVotes] = useState({});
  const [editingBio, setEditingBio] = useState(false);

  useEffect(() => {
    if (!username) return;
    let ignore = false;

    Promise.all([
        request(`/usuarios/perfil/${username}`),
        request(`/usuarios/perfil/${username}/publicaciones`),
        request(`/usuarios/perfil/${username}/comentarios`),
        request(`/usuarios/perfil/${username}/compartidos`),
      ])
      .then(([profileData, postsData, commentsData, sharedData]) => {
        if (ignore) return;

        setProfile(profileData);
        setPosts(postsData);
        setComments(commentsData);
        setSharedPosts(sharedData);
        setBioDraft(profileData.bio || '');

        const voteMap = {};
        [...postsData, ...sharedData].forEach(post => {
          if (post?.voto_usuario) voteMap[post.id] = post.voto_usuario;
        });
        setUserVotes(voteMap);
      })
      .catch(e => console.error('loadProfilePage:', e))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [username]);

  function updatePost(updatedPost) {
    setPosts(cur => cur.map(p => p.id === updatedPost.id ? updatedPost : p));
    setSharedPosts(cur => cur.map(p => p.id === updatedPost.id ? updatedPost : p));
  }

  function handlePostDeleted(postId) {
    setPosts(cur => cur.filter(p => String(p.id) !== String(postId)));
    setSharedPosts(cur => cur.filter(p => String(p.id) !== String(postId)));
    setSelectedPost(null);
  }

  async function handleVote(postId, voteType) {
    const post = [...posts, ...sharedPosts].find(item => item.id === postId);
    if (!post) return;

    const { nextVote, votes } = computeVote({
      currentVote: userVotes[postId],
      voteType,
      votes: post.votos,
    });

    updatePost({ ...post, votos: votes, voto_usuario: nextVote });
    setUserVotes(cur => ({ ...cur, [postId]: nextVote }));
    try {
      const result = await request(`/publicaciones/${postId}/votar`, { method: 'POST', body: JSON.stringify({ tipo_voto: voteType }) });
      const updated = result.post || { ...post, votos: result.votos, voto_usuario: result.voto };
      updatePost(updated);
      setUserVotes(cur => ({ ...cur, [postId]: result.voto }));
    } catch {
      updatePost(post);
      setUserVotes(cur => ({ ...cur, [postId]: post.voto_usuario ?? null }));
    }
  }

  async function handleShare(post) {
    try {
      const updated = post.compartido_por_usuario
        ? await request(`/usuarios/compartidos/${post.id}`, { method: 'DELETE' })
        : await request(`/usuarios/compartidos/${post.id}`, { method: 'POST', body: JSON.stringify({}) });

      updatePost(updated);
      if (!post.compartido_por_usuario) {
        setSharedPosts(cur => cur.some(item => item.id === updated.id) ? cur : [updated, ...cur]);
      } else if (profile?.is_me) {
        setSharedPosts(cur => cur.filter(item => item.id !== post.id));
      }
    } catch (e) {
      console.error('handleShare:', e);
    }
  }

  async function handleFollow() {
    if (!profile) return;
    try {
      const next = profile.is_following ? await request(`/usuarios/${profile.username}/follow`, { method: 'DELETE' }) : await request(`/usuarios/${profile.username}/follow`, { method: 'POST', body: JSON.stringify({}) });
      setProfile(next);
    } catch (e) {
      console.error('handleFollow:', e);
    }
  }

  async function handleSaveBio() {
    setSavingBio(true);
    try {
      const updated = await request('/usuarios/perfil', { 
        method: 'PATCH', 
        body: JSON.stringify({ bio: bioDraft }) 
      });

      onUserUpdate?.(updated);

      setProfile(cur => cur ? { ...cur, bio: updated.bio } : cur);
      setEditingBio(false);
    } catch (e) {
      console.error('Error al guardar la bio:', e);
    } finally {
      setSavingBio(false);
    }
  }

  async function openPost(postId) {
    try {
      const data = await request(`/publicaciones/${postId}?userId=${user.id}`);
      setSelectedPost(data);
    } catch (e) {
      console.error('openPost:', e);
    }
  }

  if (loading) {
    return <main className={styles.profilePage}><div className={styles.profileShell}><div className={styles.profilePanel}>Cargando perfil...</div></div></main>;
  }

  if (!profile) {
    return <main className={styles.profilePage}><div className={styles.profileShell}><div className={styles.profilePanel}>Perfil no encontrado.</div></div></main>;
  }

  const joinedDate = profile.fecha_creacion
    ? new Date(profile.fecha_creacion).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    : 'Sin fecha';

  return (
    <main className={styles.profilePage}>
      <div className={styles.profileShell}>
        <section className={styles.profileHeader}>
          <div className={styles.profileCover} />
          <div className={styles.profileHeaderBody}>
            <div className={styles.profileAvatarLarge}>
              {profile.avatar_url ? <img src={addCacheBust(profile.avatar_url)} alt={profile.username} /> : <span>{profile.username.slice(0, 2).toUpperCase()}</span>}
            </div>

            <div className={styles.profileTitleBlock}>
              <div className={styles.profileTitleRow}>
                <div>
                  <h1>{profile.username}</h1>
                  <span>{profile.email}</span>
                </div>
                {!profile.is_me && (
                  <button type="button" className={styles.profileFollowBtn} onClick={handleFollow}>
                    {profile.is_following ? <UserRoundCheck size={16} /> : <UserPlus size={16} />}
                    <span>{profile.is_following ? 'Siguiendo' : 'Seguir'}</span>
                  </button>
                )}
              </div>

              <div className={styles.profileStats}>
                <Stat label="Posts" value={profile.counts.posts_count} />
                <Stat label="Respuestas" value={profile.counts.comments_count} />
                <Stat label="Compartidos" value={profile.counts.shared_count} />
                <Stat label="Seguidores" value={profile.counts.followers_count} />
                <Stat label="Seguidos" value={profile.counts.following_count} />
              </div>
            </div>
          </div>

          <div className={styles.profileTabs}>
            {TABS.map(([id, label]) => (
              <button key={id} type="button" className={activeTab === id ? styles.active : ''} onClick={() => setActiveTab(id)}>
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.profileGrid}>
          <div className={styles.profilePanel}>
            {activeTab === 'posts' && (
              <div className={styles.profilePostList}>
                {posts.length > 0 ? posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    userVote={userVotes[post.id]}
                    onVote={handleVote}
                    onShare={handleShare}
                    onAuthorClick={handleUsernameClick}
                    onClick={() => setSelectedPost(post)}
                  />
                )) : <EmptyState text="Este usuario no ha publicado nada todavía." />}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className={styles.profileCommentList}>
                {comments.length > 0 ? comments.map(comment => (
                  <article key={comment.id} className={styles.profileCommentCard}>
                    <div className={styles.profileCommentMeta}>
                      <button type="button" className={styles.inlineUserLink} onClick={() => navigate(`/u/${profile.username}`)}>{profile.username}</button>
                      <span>en {comment.publicacion_titulo || 'Publicación'}</span>
                    </div>
                    <p>{comment.contenido}</p>
                    <button type="button" className={styles.profileLinkBtn} onClick={() => openPost(comment.publicacion_ref_id)}>
                      <MessageSquare size={16} />
                      <span>Ver post</span>
                    </button>
                  </article>
                )) : <EmptyState text="Este usuario no ha respondido todavía." />}
              </div>
            )}

            {activeTab === 'shared' && (
              <div className={styles.profilePostList}>
                {sharedPosts.length > 0 ? sharedPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    userVote={userVotes[post.id]}
                    onVote={handleVote}
                    onShare={handleShare}
                    onAuthorClick={handleUsernameClick}
                    onClick={() => setSelectedPost(post)}
                  />
                )) : <EmptyState text="No hay publicaciones compartidas." />}
              </div>
            )}
          </div>

          <aside className={styles.profileSide}>
            <section className={styles.profilePanel}>
              <h3>Sobre {profile.username}</h3>
              <div className={styles.profileCreatedRow}>
                <CalendarDays size={16} />
                <span>{joinedDate}</span>
              </div>
              <p className={styles.profileAboutText}>{profile.bio || 'Sin biografía todavía.'}</p>
              {profile.is_me && (
                <div className={styles.profileBioEditor}>
                  {editingBio ? (
                    <>
                      <textarea
                        value={bioDraft}
                        onChange={e => setBioDraft(e.target.value)}
                        maxLength={280}
                        placeholder="Biografía"
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" onClick={() => setEditingBio(false)}>Cancelar</button>
                        <button type="button" onClick={handleSaveBio} disabled={savingBio}>
                          {savingBio ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <button type="button" onClick={() => setEditingBio(true)}>
                      Editar biografía
                    </button>
                  )}
                </div>
              )}
            </section>
            <section className={styles.profilePanel}>
              <h3>Seguidores</h3>
              <UserList users={profile.followers} navigate={navigate} emptyText="Sin seguidores aún." />
            </section>
            <section className={styles.profilePanel}>
              <h3>Seguidos</h3>
              <UserList users={profile.following} navigate={navigate} emptyText="No sigue a nadie todavía." />
            </section>
          </aside>
        </section>
      </div>

      {selectedPost && (
        <PostModal
          post={selectedPost}
          user={user}
          onClose={() => setSelectedPost(null)}
          onPostUpdated={updatePost}
          onPostDeleted={handlePostDeleted}
          onAuthorClick={handleUsernameClick}
          onShare={handleShare}
        />
      )}
    </main>
  );

  function handleUsernameClick(nextUsername) {
    if (!nextUsername) return;
    navigate(`/u/${nextUsername}`);
  }
}

function Stat({ label, value }) {
  return (
    <div className={styles.profileStat}>
      <strong>{value ?? 0}</strong>
      <span>{label}</span>
    </div>
  );
}

function UserList({ users = [], navigate, emptyText }) {
  if (!users.length) return <p className={styles.profileEmptyCopy}>{emptyText}</p>;
  return (
    <div className={styles.profileUserList}>
      {users.map(item => (
        <button key={item.id} type="button" className={styles.profileUserChip} onClick={() => navigate(`/u/${item.username}`)}>
          {item.avatar_url ? <img src={addCacheBust(item.avatar_url)} alt={item.username} /> : <span>{item.username.slice(0, 2).toUpperCase()}</span>}
          <small>{item.username}</small>
        </button>
      ))}
    </div>
  );
}

function EmptyState({ text }) {
  return <div className={styles.profileEmptyCopy}>{text}</div>;
}

const idType = PropTypes.oneOfType([PropTypes.string, PropTypes.number]);

UserPage.propTypes = {
  user: PropTypes.shape({
    id: idType.isRequired,
  }).isRequired,
  onUserUpdate: PropTypes.func,
};

Stat.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

UserList.propTypes = {
  users: PropTypes.arrayOf(PropTypes.shape({
    id: idType.isRequired,
    username: PropTypes.string.isRequired,
    avatar_url: PropTypes.string,
  })),
  navigate: PropTypes.func.isRequired,
  emptyText: PropTypes.string.isRequired,
};

EmptyState.propTypes = {
  text: PropTypes.string.isRequired,
};

