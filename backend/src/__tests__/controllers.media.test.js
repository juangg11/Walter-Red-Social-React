import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mediaController } from '../controllers/media.controller.js';
import { mediaService } from '../services/media.service.js';

vi.mock('../services/media.service.js');

describe('mediaController', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      body: {
        folder: 'posts',
        resource_type: 'image',
      },
      user: { id: '123' },
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe('signature', () => {
    it('should generate media signature', async () => {
      const mockSignature = { signature: 'abc123signature', timestamp: 12345678 };
      mediaService.createSignature.mockReturnValue(mockSignature);

      await mediaController.signature(mockReq, mockRes);

      expect(mediaService.createSignature).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockSignature);
    });
  });

  describe('commit', () => {
    it('should commit uploaded media', async () => {
      mockReq.body = {
        public_id: 'my_public_id',
        secure_url: 'http://example.com/media.jpg',
        resource_type: 'image',
      };
      const mockCommitted = { id: 1, secure_url: 'http://example.com/media.jpg' };
      mediaService.commit.mockResolvedValue(mockCommitted);

      await mediaController.commit(mockReq, mockRes);

      expect(mediaService.commit).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockCommitted);
    });
  });
});
