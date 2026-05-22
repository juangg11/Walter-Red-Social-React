import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usuariosService } from '../services/usuarios.service.js';
import { UserModel } from '../models/user.model.js';
import { PostModel } from '../models/post.model.js';
import { CommentModel } from '../models/comment.model.js';
import { CommunityModel } from '../models/community.model.js';
import { AppError } from '../utils/AppError.js';

vi.mock('../models/user.model.js');
vi.mock('../models/post.model.js');
vi.mock('../models/comment.model.js');
vi.mock('../models/community.model.js');

describe('usuariosService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getByUsername', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '123', username: 'testuser' };
      UserModel.findByUsername.mockResolvedValue(mockUser);

      const result = await usuariosService.getByUsername('testuser');

      expect(result).toEqual(mockUser);
    });

    it('should throw error when user not found', async () => {
      UserModel.findByUsername.mockResolvedValue(null);

      await expect(usuariosService.getByUsername('nonexistent')).rejects.toThrow(AppError);
    });
  });

  describe('getProfile', () => {
    it('should return complete profile data', async () => {
      const mockUser = { id: '123', username: 'testuser' };
      UserModel.findByUsername.mockResolvedValue(mockUser);
      UserModel.countsByUserId.mockResolvedValue({ posts: 5, followers: 10 });
      UserModel.followersByUserId.mockResolvedValue(10);
      UserModel.followingByUserId.mockResolvedValue(20);
      UserModel.isFollowing.mockResolvedValue(false);

      const result = await usuariosService.getProfile('testuser', '456');

      expect(result).toHaveProperty('username', 'testuser');
      expect(result).toHaveProperty('is_me', false);
      expect(result).toHaveProperty('is_following', false);
    });
  });

  describe('follow', () => {
    it('should follow a user', async () => {
      const mockUser = { id: '456', username: 'otheruser' };
      UserModel.findByUsername.mockResolvedValue(mockUser);
      UserModel.follow.mockResolvedValue(undefined);
      UserModel.countsByUserId.mockResolvedValue({});
      UserModel.followersByUserId.mockResolvedValue(11);
      UserModel.followingByUserId.mockResolvedValue(20);
      UserModel.isFollowing.mockResolvedValue(true);

      const result = await usuariosService.follow('otheruser', '123');

      expect(UserModel.follow).toHaveBeenCalledWith('123', '456');
      expect(result).toHaveProperty('is_following', true);
    });

    it('should throw error when trying to follow self', async () => {
      const mockUser = { id: '123', username: 'testuser' };
      UserModel.findByUsername.mockResolvedValue(mockUser);

      await expect(usuariosService.follow('testuser', '123')).rejects.toThrow(AppError);
    });
  });

  describe('unfollow', () => {
    it('should unfollow a user', async () => {
      const mockUser = { id: '456', username: 'otheruser' };
      UserModel.findByUsername.mockResolvedValue(mockUser);
      UserModel.unfollow.mockResolvedValue(undefined);
      UserModel.countsByUserId.mockResolvedValue({});
      UserModel.followersByUserId.mockResolvedValue(9);
      UserModel.followingByUserId.mockResolvedValue(20);
      UserModel.isFollowing.mockResolvedValue(false);

      await usuariosService.unfollow('otheruser', '123');

      expect(UserModel.unfollow).toHaveBeenCalledWith('123', '456');
    });
  });

  describe('updatePerfil', () => {
    it('should update user profile', async () => {
      const mockUser = { id: '123', avatar_url: 'http://example.com/avatar.jpg', bio: 'New bio' };
      UserModel.findById.mockResolvedValue(mockUser);
      UserModel.updateProfile.mockResolvedValue(mockUser);

      const result = await usuariosService.updatePerfil('123', {
        avatar_url: 'http://example.com/avatar.jpg',
        bio: 'New bio',
      });

      expect(result).toEqual(mockUser);
    });

    it('should throw error when user not found', async () => {
      UserModel.findById.mockResolvedValue(null);

      await expect(
        usuariosService.updatePerfil('999', { avatar_url: 'http://example.com/avatar.jpg', bio: 'Bio' })
      ).rejects.toThrow(AppError);
    });
  });

  describe('sharePost', () => {
    it('should share a post', async () => {
      PostModel.findRawById.mockResolvedValue({ id: '789' });
      PostModel.share.mockResolvedValue(undefined);
      PostModel.findById.mockResolvedValue({ id: '789', shared: true });

      const result = await usuariosService.sharePost('789', '123');

      expect(PostModel.share).toHaveBeenCalledWith('123', '789');
      expect(result).toHaveProperty('id', '789');
    });

    it('should throw error when post not found', async () => {
      PostModel.findRawById.mockResolvedValue(null);

      await expect(usuariosService.sharePost('999', '123')).rejects.toThrow(AppError);
    });
  });
});

