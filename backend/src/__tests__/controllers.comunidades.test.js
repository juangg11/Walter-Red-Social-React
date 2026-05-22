import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { comunidadesController } from '../controllers/comunidades.controller.js';
import { comunidadesService } from '../services/comunidades.service.js';

vi.mock('../services/comunidades.service.js');

describe('comunidadesController', () => {
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
    it('should get all communities', async () => {
      const mockCommunities = [{ id: 1, nombre: 'Test Community' }];
      comunidadesService.getAll.mockResolvedValue(mockCommunities);

      await comunidadesController.getAll(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockCommunities);
    });
  });

  describe('create', () => {
    it('should create a community', async () => {
      mockReq.body = { nombre: 'New Community', descripcion: 'Description' };
      const mockCreated = { id: 1, nombre: 'New Community' };
      comunidadesService.create.mockResolvedValue(mockCreated);

      await comunidadesController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockCreated);
    });
  });

  describe('join', () => {
    it('should join a community', async () => {
      mockReq.params = { id: '1' };
      comunidadesService.join.mockResolvedValue({ joined: true });

      await comunidadesController.join(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('leave', () => {
    it('should leave a community', async () => {
      mockReq.params = { id: '1' };
      comunidadesService.leave.mockResolvedValue({});

      await comunidadesController.leave(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
    });
  });
});

