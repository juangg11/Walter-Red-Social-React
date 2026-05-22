import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  registerDto,
  loginDto,
  checkUsernameDto,
} from '../dtos/auth.dto.js';
import { idParamDto } from '../dtos/common.dto.js';
import { AppError } from '../utils/AppError.js';

describe('registerDto', () => {
  it('should return valid register data', () => {
    const body = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
    };
    const result = registerDto(body);

    expect(result).toEqual({
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
    });
  });

  it('should throw for missing email', () => {
    const body = {
      username: 'testuser',
      password: 'password123',
    };
    expect(() => registerDto(body)).toThrow(AppError);
  });

  it('should throw for invalid email', () => {
    const body = {
      email: 'invalid',
      username: 'testuser',
      password: 'password123',
    };
    expect(() => registerDto(body)).toThrow(AppError);
  });

  it('should throw for password too short', () => {
    const body = {
      email: 'test@example.com',
      username: 'testuser',
      password: '123',
    };
    expect(() => registerDto(body)).toThrow(AppError);
  });

  it('should throw for invalid username', () => {
    const body = {
      email: 'test@example.com',
      username: 'ab',
      password: 'password123',
    };
    expect(() => registerDto(body)).toThrow(AppError);
  });
});

describe('loginDto', () => {
  it('should return valid login data', () => {
    const body = {
      email: 'test@example.com',
      password: 'password123',
    };
    const result = loginDto(body);

    expect(result).toEqual({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should throw for missing email', () => {
    const body = { password: 'password123' };
    expect(() => loginDto(body)).toThrow(AppError);
  });

  it('should throw for missing password', () => {
    const body = { email: 'test@example.com' };
    expect(() => loginDto(body)).toThrow(AppError);
  });
});

describe('checkUsernameDto', () => {
  it('should return valid username from query', () => {
    const query = { username: 'validuser' };
    const result = checkUsernameDto(query);

    expect(result).toEqual({ username: 'validuser' });
  });

  it('should throw for invalid username', () => {
    const query = { username: 'ab' };
    expect(() => checkUsernameDto(query)).toThrow(AppError);
  });

  it('should throw for missing username', () => {
    const query = {};
    expect(() => checkUsernameDto(query)).toThrow(AppError);
  });
});

describe('idParamDto', () => {
  it('should return valid id param', () => {
    const params = { id: '123' };
    const result = idParamDto(params);

    expect(result).toEqual({ id: 123 });
  });

  it('should use custom key', () => {
    const params = { userId: '456' };
    const result = idParamDto(params, 'userId');

    expect(result).toEqual({ userId: 456 });
  });

  it('should throw for invalid id', () => {
    const params = { id: 'abc' };
    expect(() => idParamDto(params)).toThrow(AppError);
  });

  it('should throw for missing id', () => {
    const params = {};
    expect(() => idParamDto(params)).toThrow(AppError);
  });
});

