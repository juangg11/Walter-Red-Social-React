import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { publicacionesController } from '../controllers/publicaciones.controller.js';
import { publicacionesService } from '../services/publicaciones.service.js';

vi.mock('../services/publicaciones.service.js');

describe('publicacionesController', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: '123' },
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should get all publications', async () => {
      const mockPubs = [{ id: 1, titulo: 'Test' }];
      publicacionesService.getAll.mockResolvedValue(mockPubs);

      await publicacionesController.getAll(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockPubs);
    });
  });

  describe('getById', () => {
    it('should get publication by id', async () => {
      mockReq.params = { id: '1' };
      const mockPub = { id: 1, titulo: 'Test' };
      publicacionesService.getById.mockResolvedValue(mockPub);

      await publicacionesController.getById(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockPub);
    });
  });

  describe('create', () => {
    it('should create a publication', async () => {
      mockReq.body = {
        titulo: 'New Post',
        contenido: 'Content',
        comunidad_id: 1,
      };
      const mockCreated = { id: 1, titulo: 'New Post' };
      publicacionesService.create.mockResolvedValue(mockCreated);

      await publicacionesController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockCreated);
    });
  });

  describe('remove', () => {
    it('should remove a publication', async () => {
      mockReq.params = { id: '1' };
      publicacionesService.remove.mockResolvedValue(undefined);

      await publicacionesController.remove(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ mensaje: 'Publicación eliminada' });
    });
  });

  describe('vote', () => {
    it('should vote on a publication', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { tipo_voto: 'up' };
      const mockVote = { id: 1, votes: 5 };
      publicacionesService.vote.mockResolvedValue(mockVote);

      await publicacionesController.vote(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockVote);
    });
  });
});

