import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notificacionesController } from '../controllers/notificaciones.controller.js';
import { notificacionesService } from '../services/notificaciones.service.js';

vi.mock('../services/notificaciones.service.js');

describe('notificacionesController', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      params: {},
      user: { id: '123' },
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should get all notifications', async () => {
      const mockNotifs = [{ id: 1, tipo: 'like' }];
      notificacionesService.getAll.mockResolvedValue(mockNotifs);

      await notificacionesController.getAll(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockNotifs);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockReq.params = { id: '1' };
      notificacionesService.markAsRead.mockResolvedValue({});

      await notificacionesController.markAsRead(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
    });
  });
});

