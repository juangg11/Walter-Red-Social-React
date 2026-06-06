import { ChatModel } from '../models/chat.model.js';
import { AppError } from '../utils/AppError.js';
import { mediaService } from './media.service.js';

export const chatService = {
  async searchUsers(query, userId) {
    const q = typeof query === 'string' ? query.trim() : '';
    if (q.length < 2) return [];
    return UserModel.search(q, userId);
  },

  async createOrGet(userId, otherUserId) {
    if (userId === otherUserId) throw new AppError(400, 'No puedes abrir chat contigo mismo');
    const otherUser = await UserModel.findById(otherUserId);
    if (!otherUser) throw new AppError(404, 'Usuario no encontrado');
    const existing = await ChatModel.findDirectChat(userId, otherUserId);
    const chatId = existing?.id || await ChatModel.createDirectChat(userId, otherUserId);
    return ChatModel.findByIdForUser(chatId, userId);
  },

  async list(userId) {
    return ChatModel.listForUser(userId);
  },

  async messages(chatId, userId) {
    const chat = await ChatModel.findByIdForUser(chatId, userId);
    if (!chat) throw new AppError(404, 'Chat no encontrado');
    return ChatModel.listMessages(chatId, userId);
  },

  async send(chatId, userId, payload) {
    const chat = await ChatModel.findByIdForUser(chatId, userId);
    if (!chat) throw new AppError(404, 'Chat no encontrado');
    if (payload.media_asset_id) await mediaService.getById(payload.media_asset_id);
    const message = await ChatModel.addMessage({ chatId, userId, ...payload });

    return message;
  },

  async participantIds(chatId) {
    return ChatModel.participantIds(chatId);
  },
};
