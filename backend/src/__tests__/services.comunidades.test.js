import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { comunidadesService } from '../services/comunidades.service.js';
import { CommunityModel } from '../models/community.model.js';
import { AppError } from '../utils/AppError.js';

vi.mock('../models/community.model.js');

describe('comunidadesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should get all communities', async () => {
      const mockCommunities = [{ id: 1, nombre: 'Community' }];
      CommunityModel.findAll.mockResolvedValue(mockCommunities);

      const result = await comunidadesService.getAll();

      expect(result).toEqual(mockCommunities);
    });
  });

  describe('create', () => {
    it('should create a community', async () => {
      CommunityModel.create.mockResolvedValue(1);
      CommunityModel.findById.mockResolvedValue({ id: 1, nombre: 'New Community' });

      const result = await comunidadesService.create({
        nombre: 'New Community',
        descripcion: 'Description',
        usuarioId: '123',
      });

      expect(result).toBeDefined();
    });
  });

  describe('join', () => {
    it('should join a community', async () => {
      CommunityModel.findById.mockResolvedValue({ id: 1 });
      CommunityModel.isMember.mockResolvedValue(false);
      CommunityModel.join.mockResolvedValue(undefined);
      CommunityModel.findById.mockResolvedValueOnce({ id: 1, nombre: 'Community' });

      const result = await comunidadesService.join(1, '123');

      expect(result).toBeDefined();
    });

    it('should throw error if community not found', async () => {
      CommunityModel.findById.mockResolvedValue(null);

      await expect(comunidadesService.join(999, '123')).rejects.toThrow(AppError);
    });
  });
});

