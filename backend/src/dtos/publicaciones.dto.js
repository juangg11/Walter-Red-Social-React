import { optionalId, optionalString, requiredId, requiredString, requiredUrl } from '../validators/schema.js';
import { AppError } from '../utils/AppError.js';

export function listPublicacionesDto(query) {
  return {
    comunidad_id: optionalId(query.comunidad_id, 'comunidad_id'),
    userId: typeof query.userId === 'string' && query.userId.trim() ? query.userId.trim() : null,
  };
}

export function createPublicacionDto(body) {
  const mediaAssetId = optionalId(body.media_asset_id, 'media_asset_id');
  return {
    titulo: requiredString(body, 'titulo', 'El título', { min: 1, max: 150 }),
    contenido: optionalString(body, 'contenido', 'El contenido', { max: 1000 }),
    url_imagen: mediaAssetId ? null : requiredUrl(body, 'url_imagen', 'La URL de imagen'),
    url_video: mediaAssetId ? null : requiredUrl(body, 'url_video', 'La URL de vídeo'),
    media_asset_id: mediaAssetId,
    comunidad_id: requiredId(body.comunidad_id, 'comunidad_id'),
  };
}

export function votePublicacionDto(body) {
  const tipo_voto = typeof body.tipo_voto === 'string' ? body.tipo_voto.trim() : '';
  if (!['up', 'down'].includes(tipo_voto)) {
    throw new AppError(400, 'tipo_voto debe ser "up" o "down"');
  }
  return { tipo_voto };
}
