import { optionalId, requiredId, requiredString } from '../validators/schema.js';

export function listComentariosDto(query) {
  return { publicacion_id: requiredId(query.publicacion_id, 'publicacion_id') };
}

export function createComentarioDto(body) {
  return {
    contenido: requiredString(body, 'contenido', 'El contenido', { min: 1, max: 250 }),
    publicacion_id: requiredId(body.publicacion_id, 'publicacion_id'),
    comentario_padre_id: optionalId(body.comentario_padre_id, 'comentario_padre_id'),
  };
}
