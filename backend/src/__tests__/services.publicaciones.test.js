import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { publicacionesService } from '../services/publicaciones.service.js';
import { PostModel } from '../models/post.model.js';
import { CommunityModel } from '../models/community.model.js';
import { VoteModel } from '../models/vote.model.js';
import { mediaService } from '../services/media.service.js';
import { AppError } from '../utils/AppError.js';

vi.mock('../models/post.model.js');
vi.mock('../models/community.model.js');
vi.mock('../models/vote.model.js');
vi.mock('../services/media.service.js');

describe('publicacionesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should get all posts', async () => {
      const mockPosts = [{ id: 1, titulo: 'Post 1' }];
      PostModel.findAll.mockResolvedValue(mockPosts);

      const result = await publicacionesService.getAll({ comunidad_id: null, userId: null });

      expect(PostModel.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockPosts);
    });
  });

  describe('getById', () => {
    it('should get post by id', async () => {
      const mockPost = { id: 1, titulo: 'Post 1' };
      PostModel.findById.mockResolvedValue(mockPost);

      const result = await publicacionesService.getById(1, null);

      expect(result).toEqual(mockPost);
    });

    it('should throw error if post not found', async () => {
      PostModel.findById.mockResolvedValue(null);

      await expect(publicacionesService.getById(999, null)).rejects.toThrow(AppError);
    });
  });

  describe('create', () => {
    it('should create a post', async () => {
      const mockCommunity = { id: 1, nombre: 'Community' };
      CommunityModel.findById.mockResolvedValue(mockCommunity);
      CommunityModel.isMember.mockResolvedValue(true);
      PostModel.create.mockResolvedValue(1);
      CommunityModel.incrementPosts.mockResolvedValue(undefined);
      PostModel.findById.mockResolvedValue({ id: 1, titulo: 'New Post' });

      const result = await publicacionesService.create({
        titulo: 'New Post',
        contenido: 'Content',
        url_imagen: null,
        url_video: null,
        media_asset_id: null,
        comunidad_id: 1,
        usuarioId: '123',
      });

      expect(result).toBeDefined();
    });

    it('should throw error if community not found', async () => {
      CommunityModel.findById.mockResolvedValue(null);

      await expect(
        publicacionesService.create({
          titulo: 'New Post',
          contenido: 'Content',
          url_imagen: null,
          url_video: null,
          media_asset_id: null,
          comunidad_id: 999,
          usuarioId: '123',
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw error if user is not community member', async () => {
      const mockCommunity = { id: 1, nombre: 'Community' };
      CommunityModel.findById.mockResolvedValue(mockCommunity);
      CommunityModel.isMember.mockResolvedValue(false);

      await expect(
        publicacionesService.create({
          titulo: 'New Post',
          contenido: 'Content',
          url_imagen: null,
          url_video: null,
          media_asset_id: null,
          comunidad_id: 1,
          usuarioId: '123',
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('remove', () => {
    it('should remove a post', async () => {
      PostModel.findRawById.mockResolvedValue({ id: 1, usuario_id: '123', comunidad_id: 1 });
      PostModel.delete.mockResolvedValue(undefined);
      CommunityModel.decrementPosts.mockResolvedValue(undefined);

      await publicacionesService.remove(1, '123');

      expect(PostModel.delete).toHaveBeenCalledWith(1);
    });

    it('should throw error if post not found', async () => {
      PostModel.findRawById.mockResolvedValue(null);

      await expect(publicacionesService.remove(999, '123')).rejects.toThrow(AppError);
    });

    it('should throw error if user is not owner', async () => {
      PostModel.findRawById.mockResolvedValue({ id: 1, usuario_id: '456', comunidad_id: 1 });

      await expect(publicacionesService.remove(1, '123')).rejects.toThrow(AppError);
    });
  });

  describe('vote', () => {
    it('should create a new vote', async () => {
      PostModel.findRawById.mockResolvedValue({ id: 1 });
      VoteModel.find.mockResolvedValue(null);
      VoteModel.create.mockResolvedValue(undefined);
      PostModel.incrementVotes.mockResolvedValue(undefined);
      PostModel.findById.mockResolvedValue({ id: 1, votos: 1 });

      const result = await publicacionesService.vote(1, '123', 'up');

      expect(result.mensaje).toBe('Voto registrado');
    });

    it('should remove existing vote if same type', async () => {
      PostModel.findRawById.mockResolvedValue({ id: 1 });
      VoteModel.find.mockResolvedValue({ tipo_voto: 'up' });
      VoteModel.delete.mockResolvedValue(undefined);
      PostModel.incrementVotes.mockResolvedValue(undefined);
      PostModel.findById.mockResolvedValue({ id: 1, votos: 0 });

      const result = await publicacionesService.vote(1, '123', 'up');

      expect(result.mensaje).toBe('Voto eliminado');
    });
  });
});

