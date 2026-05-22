import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { comentariosController } from '../controllers/comentarios.controller.js';
import { comentariosService } from '../services/comentarios.service.js';

vi.mock('../services/comentarios.service.js');

describe('comentariosController', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      params: {},
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
    it('should get all comments', async () => {
      const mockComments = [{ id: 1, contenido: 'Test comment' }];
      comentariosService.getAll.mockResolvedValue(mockComments);

      await comentariosController.getAll(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockComments);
    });
  });

  describe('create', () => {
    it('should create a comment', async () => {
      mockReq.body = { contenido: 'New comment', publicacion_id: 1 };
      const mockCreated = { id: 1, contenido: 'New comment' };
      comentariosService.create.mockResolvedValue(mockCreated);

      await comentariosController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockCreated);
    });
  });

  describe('remove', () => {
    it('should remove a comment', async () => {
      mockReq.params = { id: '1' };
      comentariosService.remove.mockResolvedValue(undefined);

      await comentariosController.remove(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ mensaje: 'Comentario eliminado' });
    });
  });
});

