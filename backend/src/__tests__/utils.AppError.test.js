import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppError, isAppError } from '../utils/AppError.js';

describe('AppError', () => {
  it('should create an AppError with status and message', () => {
    const error = new AppError(400, 'Bad Request');
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(400);
    expect(error.message).toBe('Bad Request');
    expect(error.name).toBe('AppError');
    expect(error.details).toBeNull();
  });

  it('should create an AppError with details', () => {
    const details = { field: 'email', reason: 'Invalid format' };
    const error = new AppError(422, 'Validation Error', details);
    expect(error.status).toBe(422);
    expect(error.message).toBe('Validation Error');
    expect(error.details).toEqual(details);
  });

  it('should be instanceof AppError', () => {
    const error = new AppError(500, 'Internal Server Error');
    expect(error instanceof AppError).toBe(true);
  });

  it('should preserve error stack trace', () => {
    const error = new AppError(400, 'Test error');
    expect(error.stack).toBeDefined();
  });
});

describe('isAppError', () => {
  it('should return true for AppError instances', () => {
    const error = new AppError(400, 'Test');
    expect(isAppError(error)).toBe(true);
  });

  it('should return true for objects with status property', () => {
    const error = { status: 400, message: 'Test' };
    expect(isAppError(error)).toBe(true);
  });

  it('should return false for regular Error instances', () => {
    const error = new Error('Regular error');
    expect(isAppError(error)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isAppError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isAppError(undefined)).toBe(false);
  });

  it('should return false for objects without status', () => {
    const error = { message: 'Test', code: 'ERROR' };
    expect(isAppError(error)).toBe(false);
  });

  it('should return false for plain objects', () => {
    expect(isAppError({})).toBe(false);
  });
});

