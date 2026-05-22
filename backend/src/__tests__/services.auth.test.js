import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from '../services/auth.service.js';
import { AppError } from '../utils/AppError.js';
import { UserModel } from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

vi.mock('../models/user.model.js');
vi.mock('bcryptjs');
vi.mock('jsonwebtoken');
vi.mock('uuid');

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockId = '123e4567-e89b-12d3-a456-426614174000';
      const mockHash = 'hashed-password';
      const mockToken = 'jwt-token';

      uuidv4.mockReturnValue(mockId);
      UserModel.findByEmailOrUsername.mockResolvedValue([]);
      bcrypt.hash.mockResolvedValue(mockHash);
      jwt.sign.mockReturnValue(mockToken);
      UserModel.create.mockResolvedValue(undefined);

      const result = await authService.register({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      });

      expect(result).toEqual({
        token: mockToken,
        user: {
          id: mockId,
          email: 'test@example.com',
          username: 'testuser',
        },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(UserModel.create).toHaveBeenCalledWith({
        id: mockId,
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: mockHash,
      });
    });

    it('should throw error if email already exists', async () => {
      UserModel.findByEmailOrUsername.mockResolvedValue([{ email: 'test@example.com' }]);

      await expect(
        authService.register({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw error if username already exists', async () => {
      UserModel.findByEmailOrUsername.mockResolvedValue([{ username: 'testuser' }]);

      await expect(
        authService.register({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockToken = 'jwt-token';
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashed-password',
      };

      UserModel.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue(mockToken);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        token: mockToken,
        user: {
          id: '123',
          email: 'test@example.com',
          username: 'testuser',
        },
      });
    });

    it('should throw error if user not found', async () => {
      UserModel.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw error for incorrect password', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        password: 'hashed-password',
      };

      UserModel.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('checkUsername', () => {
    it('should return available true when username is not taken', async () => {
      UserModel.usernameExists.mockResolvedValue(false);

      const result = await authService.checkUsername('newuser');

      expect(result).toEqual({ available: true });
    });

    it('should return available false when username is taken', async () => {
      UserModel.usernameExists.mockResolvedValue(true);

      const result = await authService.checkUsername('existinguser');

      expect(result).toEqual({ available: false });
    });
  });
});

