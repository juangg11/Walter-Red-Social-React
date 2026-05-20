import { useState, useEffect } from 'react';
import { ArrowBigUp, ArrowBigDown, Repeat2, X } from 'lucide-react';
import request from '../api/client';
import { computeVote } from '../utils/computeVote';
import styles from './PostModal.module.css';

export default function PostModal({ post, onClose, user, onCommentAdded, onPostUpdated, onAuthorClick = null, onShare = null }) {
  const [postData, setPostData] = useState(post);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userVote, setUserVote] = useState(post.voto_usuario ?? null);

  useEffect(() => {
    if (!post?.id) return;
    fetchComments();
  }, []);

  async function fetchComments() {
    setLoading(true);
    try {
      const data = await request(`/comentarios?publicacion_id=${post.id}`);
      setComments(data);
    } catch (e) {
      console.error('fetchComments:', e);
    }
    setLoading(false);
  }

  async function handleVote(voteType) {
    const { nextVote, votes } = computeVote({
      currentVote: userVote,
      voteType,
      votes: postData.votos,
    });

    const updated = { ...postData, votos: votes };
    setPostData(updated);
    setUserVote(nextVote);
    onPostUpdated?.(updated);

    try {
      const result = await request(`/publicaciones/${post.id}/votar`, { method: 'POST', body: JSON.stringify({ tipo_voto: voteType }) });
      setPostData(result.post || updated);
      setUserVote(result.voto || nextVote);
    } catch (e) {
      setPostData(postData);
      setUserVote(userVote);
    }
  }

  async function addComment(parentId = null, content = newComment) {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const data = await request('/comentarios', { method: 'POST', body: JSON.stringify({ contenido: content, publicacion_id: post.id, comentario_padre_id: parentId }) });
      setComments([...comments, data]);
      if (!parentId) setNewComment('');
      const count = (postData.numero_comentarios ?? 0) + 1;
      setPostData({ ...postData, numero_comentarios: count });
      onCommentAdded?.(count);
    } catch (e) {
      console.error('addComment:', e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}>
          <X size={24} />
        </button>

        {/* Post */}
        <div className={styles.modalPost}>
          <div className={styles.modalPostMeta}>
            Publicado por <button className={styles.inlineUserLink} onClick={() => onAuthorClick?.(postData?.username)}>w/{postData?.username ?? 'anon'}</button>
            {postData?.comunidad_nombre ? ` en w/${postData.comunidad_nombre}` : ''}
          </div>
          <h1 className={styles.modalPostTitle}>{postData?.titulo}</h1>

          {postData?.url_video ? (
            <video src={postData.url_video} controls />
          ) : postData?.url_imagen ? (
            <img src={postData.url_imagen} alt={postData.titulo} />
          ) : null}

          <div className={styles.modalPostContent}>{postData?.contenido}</div>
        </div>

        {/* Votos */}
        <div className={styles.modalVotes}>
          <button
            className={`${styles.modalVoteBtn} ${userVote === 'up' ? styles.modalVoteBtnActive : ''}`}
            title="Votar positivo"
            onClick={() => handleVote('up')}
          >
            <ArrowBigUp size={20} />
          </button>
          <span className={styles.modalVoteCount}>{postData?.votos ?? 0}</span>
          <button
            className={`${styles.modalVoteBtn} ${userVote === 'down' ? styles.modalVoteBtnActive : ''}`}
            title="Votar negativo"
            onClick={() => handleVote('down')}
          >
            <ArrowBigDown size={20} />
          </button>
          <button className={styles.modalVoteBtn} onClick={() => onShare?.(postData)}>
            <Repeat2 size={18} />
            <span>{postData?.compartido_por_usuario ? 'Compartido' : 'Compartir'}</span>
          </button>
        </div>
        {/* Comentarios */}
        <div className={styles.commentsSection}>
          <h3>Comentarios ({comments.length})</h3>

          <div className={styles.commentForm}>
            <textarea
              placeholder="Escribe un comentario..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
            />
            <button onClick={() => addComment()} disabled={submitting || !newComment.trim()}>
              {submitting ? 'Enviando...' : 'Comentar'}
            </button>
          </div>

          <div className={styles.commentsList}>
            {loading ? (
              <div className={styles.noComments}>Cargando comentarios...</div>
            ) : comments.length === 0 ? (
              <div className={styles.noComments}>Sin comentarios aún</div>
            ) : (
              <CommentTree comments={comments} onReply={addComment} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentTree({ comments, onReply }) {
  const roots = comments.filter(c => !c.comentario_padre_id);
  const repliesByParent = comments.reduce((acc, comment) => {
    if (comment.comentario_padre_id) {
      const key = String(comment.comentario_padre_id);
      acc[key] = [...(acc[key] || []), comment];
    }
    return acc;
  }, {});

  return roots.map(comment => (
    <CommentItem
      key={comment.id}
      comment={comment}
      repliesByParent={repliesByParent}
      onReply={onReply}
    />
  ));
}

function CommentItem({ comment, repliesByParent, onReply }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const replies = repliesByParent[String(comment.id)] || [];

  async function submitReply() {
    const created = await onReply(comment.id, text);
    if (!created) return;
    setText('');
    setOpen(false);
  }

  return (
    <div className={styles.commentItem}>
      <div className={styles.commentMeta}>w/{comment.username}</div>
      <p className={styles.commentText}>{comment.contenido}</p>
      <div className={styles.commentActions}>
        <span>{new Date(comment.fecha_creacion).toLocaleDateString()}</span>
        <button onClick={() => setOpen(v => !v)}>Responder</button>
      </div>
      {open && (
        <div className={styles.replyForm}>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Responder comentario" />
          <button onClick={submitReply} disabled={!text.trim()}>Enviar</button>
        </div>
      )}
      {replies.length > 0 && (
        <div className={styles.commentReplies}>
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              repliesByParent={repliesByParent}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

