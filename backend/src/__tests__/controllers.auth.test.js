import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authController } from '../controllers/auth.controller.js';
import { authService } from '../services/auth.service.js';

vi.mock('../services/auth.service.js');

describe('authController', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register user and return 201 status', async () => {
      const mockResult = {
        token: 'jwt-token',
        user: {
          id: '123',
          email: 'test@example.com',
          username: 'testuser',
        },
      };

      mockReq.body = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      authService.register.mockResolvedValue(mockResult);

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should handle registration errors', async () => {
      mockReq.body = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      authService.register.mockRejectedValue(new Error('Registration failed'));

      await expect(authController.register(mockReq, mockRes)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should login user and return token', async () => {
      const mockResult = {
        token: 'jwt-token',
        user: {
          id: '123',
          email: 'test@example.com',
          username: 'testuser',
        },
      };

      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      authService.login.mockResolvedValue(mockResult);

      await authController.login(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('checkUsername', () => {
    it('should check if username is available', async () => {
      mockReq.query = { username: 'testuser' };

      authService.checkUsername.mockResolvedValue({ available: true });

      await authController.checkUsername(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ available: true });
    });
  });
});

