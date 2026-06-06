import { CommunityModel } from '../models/community.model.js';
import { CommentModel } from '../models/comment.model.js';
import { NotificationModel } from '../models/notification.model.js';
import { PostModel } from '../models/post.model.js';
import { UserModel } from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';

export const usuariosService = {

  async getByUsername(username) {
    const user = await UserModel.findByUsername(username);
    if (!user) throw new AppError(404, 'Usuario no encontrado');
    return user;
  },

  async isAdmin(userId) {
    return UserModel.isAdmin(userId);
  },

  async getPublicaciones(username, viewerId = null) {
    const user = await this.getByUsername(username);
    return PostModel.findByUserId(user.id, viewerId);
  },

  async getComentarios(username) {
    const user = await this.getByUsername(username);
    return CommentModel.findByUserId(user.id);
  },

  async getCompartidos(username, viewerId = null) {
    const user = await this.getByUsername(username);
    return PostModel.findSharedByUserId(user.id, viewerId);
  },

  async getComunidades(username) {
    const user = await this.getByUsername(username);
    return CommunityModel.findByUserId(user.id);
  },

  async getProfile(username, viewerId = null) {
    const user = await this.getByUsername(username);
    const [counts, followers, following, isFollowing] = await Promise.all([
      UserModel.countsByUserId(user.id),
      UserModel.followersByUserId(user.id),
      UserModel.followingByUserId(user.id),
      UserModel.isFollowing(viewerId, user.id),
    ]);

    return {
      ...user,
      is_me: viewerId === user.id,
      is_following: isFollowing,
      counts,
      followers,
      following,
    };
  },

  async updatePerfil(userId, { avatar_url, bio, username }) {
    const current = await UserModel.findById(userId);
    if (!current) throw new AppError(404, 'Usuario no encontrado');

    if (username && username !== current.username) {
      const exists = await UserModel.usernameExists(username);
      if (exists) throw new AppError(400, 'El nombre de usuario ya existe');
    }

    const user = await UserModel.updateProfile(userId, {
      avatar_url: avatar_url ?? current.avatar_url,
      bio: bio ?? current.bio,
      username: username ?? current.username,
    });
    if (!user) throw new AppError(404, 'Usuario no encontrado');
    return user;
  },

  async follow(username, viewerId) {
    const user = await this.getByUsername(username);
    if (user.id === viewerId) throw new AppError(400, 'No puedes seguirte a ti mismo');
    const affectedRows = await UserModel.follow(viewerId, user.id);
    if (affectedRows > 0) {
      const follower = await UserModel.findById(viewerId);
      await NotificationModel.create({
        usuario_id: user.id,
        titulo: 'Nuevo seguidor',
        mensaje: `${follower?.username || 'Un usuario'} empezó a seguirte`,
        publicacion_id: null,
        comentario_id: null,
        tipo: 'seguimiento',
        actor_usuario_id: viewerId,
      });
    }
    return this.getProfile(username, viewerId);
  },

  async unfollow(username, viewerId) {
    const user = await this.getByUsername(username);
    if (user.id === viewerId) throw new AppError(400, 'No puedes dejar de seguirte a ti mismo');
    await UserModel.unfollow(viewerId, user.id);
    return this.getProfile(username, viewerId);
  },

  async sharePost(postId, viewerId) {
    const post = await PostModel.findRawById(postId);
    if (!post) throw new AppError(404, 'Publicación no encontrada');
    await PostModel.share(viewerId, postId);
    return PostModel.findById(postId, viewerId);
  },

  async unsharePost(postId, viewerId) {
    const post = await PostModel.findRawById(postId);
    if (!post) throw new AppError(404, 'Publicación no encontrada');
    await PostModel.unshare(viewerId, postId);
    return PostModel.findById(postId, viewerId);
  },
};
