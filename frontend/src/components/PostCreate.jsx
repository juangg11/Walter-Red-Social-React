import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import request from '../api/client';
import { uploadToCloudinary } from '../utils/cloudinary';
import styles from './PostCreate.module.css';

export default function PostCreate({ isOpen, onClose, user, communities, onPostCreated }) {
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [urlImagen, setUrlImagen] = useState('');
  const [urlVideo, setUrlVideo] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableCommunities, setAvailableCommunities] = useState(communities);
  const memberCommunities = availableCommunities.filter(c => c.es_miembro);

  useEffect(() => {
    setAvailableCommunities(communities);
  }, [communities]);

  function reset() {
    setTitulo('');
    setContenido('');
    setSelectedCommunity('');
    setUrlImagen('');
    setUrlVideo('');
    setMediaFile(null);
    setMediaPreview('');
    setError('');
  }

  async function handleCreate() {
    if (!titulo.trim()) { setError('El título es obligatorio'); return; }
    if (!contenido.trim()) { setError('El contenido es obligatorio'); return; }
    if (!selectedCommunity) { setError('Debes seleccionar una comunidad a la que pertenezcas'); return; }

    setLoading(true);
    setError('');
    try {
      let mediaAssetId = null;
      if (mediaFile) {
        const uploaded = await uploadToCloudinary(mediaFile, 'walter/posts');
        mediaAssetId = uploaded.asset.id;
      }

      const payload = { titulo, contenido, comunidad_id: Number(selectedCommunity), media_asset_id: mediaAssetId || null, url_imagen: urlImagen.trim() || null, url_video: urlVideo.trim() || null };
      await request('/publicaciones', { method: 'POST', body: JSON.stringify(payload) });
      reset();
      onPostCreated?.();
      onClose();
    } catch (e) {
      setError(e.message || 'Error al crear el post');
    }
    setLoading(false);
  }

  if (!isOpen) return null;

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={handleClose}><X size={24} /></button>

        <div className={styles.modalPost}>
          <h2>Crear un nuevo post</h2>

          {/* Comunidad */}
          <div className={styles.formField}>
            <label>Comunidad</label>
            <select
              value={selectedCommunity}
              onChange={e => setSelectedCommunity(e.target.value)}
              className={`${styles.inputField} ${styles.selectField}`}
            >
              <option value="">Selecciona una comunidad</option>
              {memberCommunities.length > 0 ? (
                memberCommunities.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.nombre}</option>
                ))
              ) : (
                <option disabled>No perteneces a ninguna comunidad</option>
              )}
            </select>
            {memberCommunities.length === 0 && (
              <p className={styles.subtext}>
                Únete a una comunidad antes de publicar.
              </p>
            )}
          </div>

          {/* Título */}
          <div className={styles.formField}>
            <label>Título</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título del post" className={styles.inputField} />
          </div>

          {/* Contenido */}
          <div className={styles.formField}>
            <label>Contenido</label>
            <textarea value={contenido} onChange={e => setContenido(e.target.value)} placeholder="¿Qué tienes en mente?" rows="5" className={styles.inputField} style={{ resize: 'vertical' }} />
          </div>

          {/* URL imagen */}
          <div className={styles.formField}>
            <label>URL de imagen (opcional)</label>
            <input value={urlImagen} onChange={e => setUrlImagen(e.target.value)} placeholder="https://ejemplo.com/imagen.jpg" className={styles.inputField} disabled={Boolean(mediaFile)} />
          </div>

          {/* URL vídeo */}
          <div className={styles.formField}>
            <label>URL de vídeo (opcional)</label>
            <input value={urlVideo} onChange={e => setUrlVideo(e.target.value)} placeholder="https://ejemplo.com/video.mp4" className={styles.inputField} disabled={Boolean(mediaFile)} />
          </div>

          <div className={styles.formField}>
            <label>Archivo multimedia (opcional)</label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={e => setMediaFile(e.target.files?.[0] || null)}
              className={styles.inputField}
            />
            {mediaFile && (
              <p className={styles.subtext}>{mediaFile.name}</p>
            )}
          </div>

          {error && (
            <div className={styles.errorBox}>
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading || memberCommunities.length === 0}
            className={styles.submitBtn}
          >
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  );
}
