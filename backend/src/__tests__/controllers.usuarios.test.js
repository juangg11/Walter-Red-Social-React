import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usuariosController } from '../controllers/usuarios.controller.js';
import { usuariosService } from '../services/usuarios.service.js';

vi.mock('../services/usuarios.service.js');

describe('usuariosController', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      params: {},
      body: {},
      user: { id: '123', username: 'testuser' },
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe('me', () => {
    it('should get current user profile', async () => {
      const mockProfile = { id: '123', username: 'testuser', email: 'test@example.com' };
      usuariosService.getProfile.mockResolvedValue(mockProfile);

      await usuariosController.me(mockReq, mockRes);

      expect(usuariosService.getProfile).toHaveBeenCalledWith('testuser', '123');
      expect(mockRes.json).toHaveBeenCalledWith(mockProfile);
    });
  });

  describe('getProfile', () => {
    it('should get user profile by username', async () => {
      mockReq.params = { username: 'otheruser' };
      const mockProfile = { username: 'otheruser', bio: 'Test bio' };
      usuariosService.getProfile.mockResolvedValue(mockProfile);

      await usuariosController.getProfile(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockProfile);
    });
  });

  describe('getByUsername', () => {
    it('should get user by username', async () => {
      mockReq.params = { username: 'testuser' };
      const mockUser = { id: '456', username: 'testuser' };
      usuariosService.getByUsername.mockResolvedValue(mockUser);

      await usuariosController.getByUsername(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('follow', () => {
    it('should follow a user', async () => {
      mockReq.params = { username: 'otheruser' };
      const mockProfile = { username: 'otheruser', is_following: true };
      usuariosService.follow.mockResolvedValue(mockProfile);

      await usuariosController.follow(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockProfile);
    });
  });

  describe('unfollow', () => {
    it('should unfollow a user', async () => {
      mockReq.params = { username: 'otheruser' };
      usuariosService.unfollow.mockResolvedValue({});

      await usuariosController.unfollow(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('updatePerfil', () => {
    it('should update user profile', async () => {
      mockReq.body = { avatar_url: 'http://example.com/avatar.jpg', bio: 'New bio' };
      const mockUpdated = { id: '123', avatar_url: 'http://example.com/avatar.jpg', bio: 'New bio' };
      usuariosService.updatePerfil.mockResolvedValue(mockUpdated);

      await usuariosController.updatePerfil(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockUpdated);
    });
  });

  describe('sharePost', () => {
    it('should share a post', async () => {
      mockReq.params = { postId: '789' };
      const mockShare = { id: '789', shared: true };
      usuariosService.sharePost.mockResolvedValue(mockShare);

      await usuariosController.sharePost(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockShare);
    });
  });

  describe('unsharePost', () => {
    it('should unshare a post', async () => {
      mockReq.params = { postId: '789' };
      const mockUnshare = { id: '789', shared: false };
      usuariosService.unsharePost.mockResolvedValue(mockUnshare);

      await usuariosController.unsharePost(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockUnshare);
    });
  });
});

