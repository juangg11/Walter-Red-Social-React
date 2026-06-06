import { CommentModel } from '../models/comment.model.js';
import { NotificationModel } from '../models/notification.model.js';
import { PostModel } from '../models/post.model.js';
import { AppError } from '../utils/AppError.js';

export const comentariosService = {

  async getByPublicacion(publicacion_id) {
    return CommentModel.findByPostId(publicacion_id);
  },

  async create({ contenido, publicacion_id, comentario_padre_id, userId, username }) {
    const post = await PostModel.findRawById(publicacion_id);
    if (!post) throw new AppError(404, 'Publicación no encontrada');
    if (comentario_padre_id) {
      const parent = await CommentModel.findById(comentario_padre_id);
      if (!parent || Number(parent.publicacion_id) !== Number(publicacion_id)) {
        throw new AppError(400, 'El comentario padre no pertenece a la publicación');
      }
    }

    const commentId = await CommentModel.create({ contenido, publicacion_id, comentario_padre_id, userId });
    await CommentModel.incrementPostCommentCount(publicacion_id);

    if (post.usuario_id && post.usuario_id !== userId) {
      await NotificationModel.create({
        usuario_id: post.usuario_id,
        titulo: 'Nuevo comentario',
        mensaje: `${username} comentó en tu publicación`,
        publicacion_id,
        comentario_id: commentId,
        tipo: 'comentario',
        actor_usuario_id: userId,
      });
    }

    return CommentModel.findWithUserById(commentId);
  },

  async remove(id, userId) {
    const comment = await CommentModel.findById(id);
    if (!comment) throw new AppError(404, 'Comentario no encontrado');
    if (comment.usuario_id !== userId) throw new AppError(403, 'No autorizado');

    await CommentModel.delete(id);
    const total = await CommentModel.countByPostId(comment.publicacion_id);
    await CommentModel.setPostCommentCount(comment.publicacion_id, total);
    return { publicacion_id: comment.publicacion_id, numero_comentarios: total };
  },

  async getAll() {
    return CommentModel.findAllWithUser();
  }
};
