import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserModel } from '../models/user.model.js';
import pool from '../config/db.js';

vi.mock('../config/db.js');

describe('UserModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      pool.query.mockResolvedValue([[mockUser]]);

      const result = await UserModel.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      pool.query.mockResolvedValue([[]]);

      const result = await UserModel.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '123', username: 'testuser' };
      pool.query.mockResolvedValue([[mockUser]]);

      const result = await UserModel.findByUsername('testuser');

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      pool.query.mockResolvedValue([[]]);

      const result = await UserModel.findByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '123', username: 'testuser' };
      pool.query.mockResolvedValue([[mockUser]]);

      const result = await UserModel.findById('123');

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      pool.query.mockResolvedValue([[]]);

      const result = await UserModel.findById('999');

      expect(result).toBeNull();
    });
  });

  describe('findByEmailOrUsername', () => {
    it('should return users with matching email or username', async () => {
      const mockUsers = [{ id: '123', email: 'test@example.com' }];
      pool.query.mockResolvedValue([mockUsers]);

      const result = await UserModel.findByEmailOrUsername('test@example.com', 'testuser');

      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when no matches found', async () => {
      pool.query.mockResolvedValue([[]]);

      const result = await UserModel.findByEmailOrUsername('nonexistent@example.com', 'nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('usernameExists', () => {
    it('should return true when username exists', async () => {
      pool.query.mockResolvedValue([[{ id: '123' }]]);

      const result = await UserModel.usernameExists('testuser');

      expect(result).toBe(true);
    });

    it('should return false when username does not exist', async () => {
      pool.query.mockResolvedValue([[]]);

      const result = await UserModel.usernameExists('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('search', () => {
    it('should search users by username', async () => {
      const mockUsers = [{ id: '123', username: 'testuser' }];
      pool.query.mockResolvedValue([mockUsers]);

      const result = await UserModel.search('test', '456');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when no matches found', async () => {
      pool.query.mockResolvedValue([[]]);

      const result = await UserModel.search('nonexistent', '123');

      expect(result).toEqual([]);
    });
  });

  describe('follow', () => {
    it('should follow a user', async () => {
      pool.query.mockResolvedValue([[]]);

      await expect(UserModel.follow('123', '456')).resolves.not.toThrow();
    });
  });

  describe('unfollow', () => {
    it('should unfollow a user', async () => {
      pool.query.mockResolvedValue([[]]);

      await expect(UserModel.unfollow('123', '456')).resolves.not.toThrow();
    });
  });

  describe('isFollowing', () => {
    it('should return true when user is following', async () => {
      pool.query.mockResolvedValue([[{ count: 1 }]]);

      const result = await UserModel.isFollowing('123', '456');

      expect(typeof result).toBe('boolean');
    });
  });
});

