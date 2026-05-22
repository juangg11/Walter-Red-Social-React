import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { asyncHandler } from '../utils/asyncHandler.js';

describe('asyncHandler', () => {
  it('should wrap async functions and handle success', async () => {
    const mockReq = {};
    const mockRes = {};
    const mockNext = vi.fn();

    const handler = vi.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(handler);

    await wrapped(mockReq, mockRes, mockNext);

    expect(handler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should wrap async functions and pass errors to next', async () => {
    const mockReq = {};
    const mockRes = {};
    const mockNext = vi.fn();
    const testError = new Error('Test error');

    const handler = vi.fn().mockRejectedValue(testError);
    const wrapped = asyncHandler(handler);

    await new Promise((resolve) => {
      wrapped(mockReq, mockRes, mockNext);
      setTimeout(resolve, 100);
    });

    expect(handler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(testError);
  });

  it('should handle promise rejection', async () => {
    const mockReq = {};
    const mockRes = {};
    const mockNext = vi.fn();

    const handler = () => Promise.reject(new Error('Promise rejected'));
    const wrapped = asyncHandler(handler);

    await wrapped(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockNext.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(mockNext.mock.calls[0][0].message).toBe('Promise rejected');
  });

  it('should return a middleware function', () => {
    const handler = vi.fn();
    const wrapped = asyncHandler(handler);

    expect(typeof wrapped).toBe('function');
    expect(wrapped.length).toBe(3); // Express middleware receives (req, res, next)
  });

  it('should work with synchronous functions', () => {
    const mockReq = {};
    const mockRes = {};
    const mockNext = vi.fn();

    const handler = vi.fn().mockReturnValue(undefined);
    const wrapped = asyncHandler(handler);

    wrapped(mockReq, mockRes, mockNext);

    expect(handler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });
});

