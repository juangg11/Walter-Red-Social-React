import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../utils/AppError.js';
import { UserModel } from '../models/user.model.js';

vi.mock('jsonwebtoken');
vi.mock('../models/user.model.js');

describe('authMiddleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    process.env.JWT_SECRET = 'testsecret';
    mockReq = {
      headers: {},
    };
    mockRes = {};
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('should reject request without authorization header', async () => {
    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    expect(mockNext.mock.calls[0][0].status).toBe(401);
    expect(mockNext.mock.calls[0][0].message).toBe('Token requerido');
  });

  it('should reject request without Bearer prefix', async () => {
    mockReq.headers.authorization = 'Basic xyz';

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    expect(mockNext.mock.calls[0][0].status).toBe(401);
  });

  it('should reject request with invalid token', async () => {
    mockReq.headers.authorization = 'Bearer invalid_token';
    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    expect(mockNext.mock.calls[0][0].message).toBe('Token inválido o expirado');
  });

  it('should reject request when user not found', async () => {
    mockReq.headers.authorization = 'Bearer valid_token';
    jwt.verify.mockReturnValue({ id: 123 });
    UserModel.findById.mockResolvedValue(null);

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    expect(mockNext.mock.calls[0][0].message).toBe('Tu sesion ya no es valida. Inicia sesion otra vez.');
  });

  it('should set user payload and call next on valid token', async () => {
    const payload = { id: 123, email: 'test@example.com' };
    const user = { id: 123, username: 'testuser' };

    mockReq.headers.authorization = 'Bearer valid_token';
    jwt.verify.mockReturnValue(payload);
    UserModel.findById.mockResolvedValue(user);

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', process.env.JWT_SECRET);
    expect(UserModel.findById).toHaveBeenCalledWith(123);
    expect(mockReq.user).toEqual(payload);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should extract token correctly from Bearer header', async () => {
    mockReq.headers.authorization = 'Bearer eyJhbGc...';
    jwt.verify.mockReturnValue({ id: 456 });
    UserModel.findById.mockResolvedValue({ id: 456 });

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith('eyJhbGc...', expect.any(String));
  });

  it('should handle empty authorization header', async () => {
    mockReq.headers.authorization = '';

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('should handle malformed Bearer header', async () => {
    mockReq.headers.authorization = 'Bearer';

    await authMiddleware(mockReq, mockRes, mockNext);

    // Should still try to verify with undefined token
    expect(mockNext).toHaveBeenCalled();
  });
});

