import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { comentariosService } from '../services/comentarios.service.js';
import { CommentModel } from '../models/comment.model.js';
import { PostModel } from '../models/post.model.js';
import { AppError } from '../utils/AppError.js';

vi.mock('../models/comment.model.js');
vi.mock('../models/post.model.js');

describe('comentariosService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should get all comments for a post', async () => {
      const mockComments = [{ id: 1, contenido: 'Comment' }];
      CommentModel.findByPostId.mockResolvedValue(mockComments);

      const result = await comentariosService.getAll(1);

      expect(result).toEqual(mockComments);
    });
  });

  describe('create', () => {
    it('should create a comment', async () => {
      PostModel.findRawById.mockResolvedValue({ id: 1 });
      CommentModel.create.mockResolvedValue(1);
      CommentModel.findById.mockResolvedValue({ id: 1, contenido: 'New comment' });

      const result = await comentariosService.create({
        contenido: 'New comment',
        publicacion_id: 1,
        usuarioId: '123',
      });

      expect(result).toBeDefined();
    });

    it('should throw error if post not found', async () => {
      PostModel.findRawById.mockResolvedValue(null);

      await expect(
        comentariosService.create({
          contenido: 'New comment',
          publicacion_id: 999,
          usuarioId: '123',
        })
      ).rejects.toThrow(AppError);
    });
  });
});

