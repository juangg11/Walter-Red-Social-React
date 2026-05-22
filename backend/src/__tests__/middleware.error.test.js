import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { errorHandler, notFoundHandler } from '../middleware/error.js';
import { AppError } from '../utils/AppError.js';

describe('notFoundHandler', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      originalUrl: '/api/nonexistent',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('should return 404 status with error message', () => {
    notFoundHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Ruta no encontrada: GET /api/nonexistent',
    });
  });

  it('should include request method and URL in error', () => {
    mockReq.method = 'POST';
    mockReq.originalUrl = '/api/users';

    notFoundHandler(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Ruta no encontrada: POST /api/users',
    });
  });

  it('should handle different HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    methods.forEach((method) => {
      mockRes.status.mockClear();
      mockRes.json.mockClear();
      mockReq.method = method;

      notFoundHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });
});

describe('errorHandler', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
    vi.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('should handle duplicate entry error', () => {
    const error = new Error('Duplicate entry');
    error.code = 'ER_DUP_ENTRY';

    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'El recurso ya existe',
    });
  });

  it('should handle AppError with status', () => {
    const error = new AppError(422, 'Validation failed', { field: 'email' });

    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(422);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: { field: 'email' },
    });
  });

  it('should handle AppError without details', () => {
    const error = new AppError(401, 'Unauthorized');

    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
    });
  });

  it('should handle generic errors with 500 status', () => {
    const error = new Error('Something went wrong');

    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Error interno del servidor',
    });
    expect(console.error).toHaveBeenCalledWith(error);
  });

  it('should handle null error gracefully', () => {
    errorHandler(null, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Error interno del servidor',
    });
  });

  it('should recognize error objects with status property as AppError', () => {
    const error = { status: 400, message: 'Bad request', code: 'BAD_REQ' };

    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Bad request',
    });
  });
});

