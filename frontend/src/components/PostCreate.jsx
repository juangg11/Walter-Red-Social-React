import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import request from '../api/client';
import { uploadToCloudinary } from '../utils/cloudinary';
import styles from './PostCreate.module.css';

export default function PostCreate({ isOpen, onClose, communities = [], onPostCreated }) {
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const memberCommunities = communities.filter((c) => c.es_miembro);

  function reset() {
    setTitulo('');
    setContenido('');
    setSelectedCommunity('');
    setMediaFile(null);
    setError('');
  }

  async function handleCreate() {
    if (!titulo.trim()) { setError('El titulo es obligatorio'); return; }
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

      const payload = {
        titulo,
        contenido,
        comunidad_id: Number(selectedCommunity),
        media_asset_id: mediaAssetId || null,
      };

      await request('/publicaciones', { method: 'POST', body: JSON.stringify(payload) });
      reset();
      onPostCreated?.();
      onClose();
    } catch (e) {
      setError(e.message);
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
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={handleClose}><X size={24} /></button>

        <div className={styles.modalPost}>
          <h2>Crear un nuevo post</h2>

          <div className={styles.formField}>
            <label>Comunidad</label>
            <select
              value={selectedCommunity}
              onChange={(e) => setSelectedCommunity(e.target.value)}
              className={`${styles.inputField} ${styles.selectField}`}
            >
              <option value="">Selecciona una comunidad</option>
              {memberCommunities.length > 0 ? (
                memberCommunities.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.nombre}</option>
                ))
              ) : (
                <option disabled>No perteneces a ninguna comunidad</option>
              )}
            </select>
            {memberCommunities.length === 0 && (
              <p className={styles.subtext}>
                Unete a una comunidad antes de publicar.
              </p>
            )}
          </div>

          <div className={styles.formField}>
            <label>Titulo</label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Titulo del post"
              className={styles.inputField}
            />
          </div>

          <div className={styles.formField}>
            <label>Contenido</label>
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              placeholder="Que tienes en mente?"
              rows="5"
              className={styles.inputField}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className={`${styles.formField} ${styles.mediaField}`}>
            <label>Multimedia (opcional)</label>
            <input
              id="post-media-file"
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
              className={styles.fileInputHidden}
            />
            <label htmlFor="post-media-file" className={styles.mediaPickerBtn}>
              <ImagePlus size={18} />
              <span>{mediaFile ? 'Cambiar archivo' : 'Subir foto o video'}</span>
            </label>
            {mediaFile ? (
              <div className={styles.selectedMediaPill}>
                <span className={styles.selectedMediaName}>{mediaFile.name}</span>
                <button type="button" className={styles.removeMediaBtn} onClick={() => setMediaFile(null)}>
                  Quitar
                </button>
              </div>
            ) : (
              <p className={styles.subtext}>PNG, JPG, GIF o MP4</p>
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
