import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mediaController } from '../controllers/media.controller.js';
import { mediaService } from '../services/media.service.js';

vi.mock('../services/media.service.js');

describe('mediaController', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      user: { id: '123' },
      file: { buffer: Buffer.from('test') },
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe('upload', () => {
    it('should upload media', async () => {
      const mockUploaded = { id: 1, url: 'http://example.com/media.jpg' };
      mediaService.upload.mockResolvedValue(mockUploaded);

      await mediaController.upload(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockUploaded);
    });
  });

  describe('delete', () => {
    it('should delete media', async () => {
      mockReq.params = { id: '1' };
      mediaService.delete.mockResolvedValue(undefined);

      await mediaController.delete(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
    });
  });
});

