import { CommunityModel } from '../models/community.model.js';
import { PostModel } from '../models/post.model.js';
import { VoteModel } from '../models/vote.model.js';
import { AppError } from '../utils/AppError.js';
import { mediaService } from './media.service.js';

export const publicacionesService = {

  async getAll({ comunidad_id, userId }) {
    return PostModel.findAll({ comunidad_id, userId });
  },

  async getById(id, userId) {
    const post = await PostModel.findById(id, userId);
    if (!post) throw new AppError(404, 'Publicación no encontrada');
    return post;
  },

  async create({ titulo, contenido, url_imagen, url_video, media_asset_id, comunidad_id, usuarioId }) {
    const comunidad = await CommunityModel.findById(comunidad_id);
    if (!comunidad) throw new AppError(404, 'Comunidad no encontrada');
    const isMember = await CommunityModel.isMember(comunidad_id, usuarioId);
    if (!isMember) throw new AppError(403, 'Debes pertenecer a la comunidad para publicar');

    let finalImageUrl = url_imagen || null;
    let finalVideoUrl = url_video || null;

    if (media_asset_id) {
      const media = await mediaService.getById(media_asset_id);
      if (media.resource_type === 'image') finalImageUrl = media.secure_url;
      if (media.resource_type === 'video') finalVideoUrl = media.secure_url;
    }

    const postId = await PostModel.create({
      titulo,
      contenido,
      url_imagen: finalImageUrl,
      url_video: finalVideoUrl,
      media_asset_id,
      comunidad_id,
      usuarioId,
    });
    await CommunityModel.incrementPosts(comunidad_id);
    return this.getById(postId, usuarioId);
  },

  async remove(id, userId) {
    const post = await PostModel.findRawById(id);
    if (!post) throw new AppError(404, 'Publicación no encontrada');
    if (post.usuario_id !== userId) throw new AppError(403, 'No autorizado');

    await PostModel.delete(id);
    await CommunityModel.decrementPosts(post.comunidad_id);
  },

  async vote(postId, userId, tipo_voto) {
    const post = await PostModel.findRawById(postId);
    if (!post) throw new AppError(404, 'Publicación no encontrada');

    const existing = await VoteModel.find(userId, postId);
    if (existing) {
      const votoActual = existing.tipo_voto;
      if (votoActual === tipo_voto) {
        await VoteModel.delete(userId, postId);
        await PostModel.recalculateVotes(postId);
        const updated = await this.getById(postId, userId);
        return { mensaje: 'Voto eliminado', voto: null, votos: updated.votos, post: updated };
      } else {
        await VoteModel.update(userId, postId, tipo_voto);
        await PostModel.recalculateVotes(postId);
        const updated = await this.getById(postId, userId);
        return { mensaje: 'Voto actualizado', voto: tipo_voto, votos: updated.votos, post: updated };
      }
    }

    await VoteModel.create(userId, postId, tipo_voto);
    await PostModel.recalculateVotes(postId);
    const updated = await this.getById(postId, userId);
    return { mensaje: 'Voto registrado', voto: tipo_voto, votos: updated.votos, post: updated };
  },
};
