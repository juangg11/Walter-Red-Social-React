import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  requiredString,
  optionalString,
  requiredId,
  optionalId,
  requiredEmail,
  requiredUsernameValue,
  requiredUrl,
} from '../validators/schema.js';
import { AppError } from '../utils/AppError.js';

describe('requiredString', () => {
  it('should return trimmed string when valid', () => {
    const body = { name: '  test  ' };
    const result = requiredString(body, 'name', 'Name');
    expect(result).toBe('test');
  });

  it('should throw when field is missing', () => {
    const body = {};
    expect(() => requiredString(body, 'name', 'Name')).toThrow(AppError);
  });

  it('should throw when field is empty', () => {
    const body = { name: '' };
    expect(() => requiredString(body, 'name', 'Name')).toThrow(AppError);
  });

  it('should throw when field is below minimum length', () => {
    const body = { name: 'ab' };
    expect(() => requiredString(body, 'name', 'Name', { min: 3 })).toThrow(AppError);
  });

  it('should throw when field exceeds maximum length', () => {
    const body = { name: 'verylongstring' };
    expect(() => requiredString(body, 'name', 'Name', { max: 5 })).toThrow(AppError);
  });

  it('should handle non-string values', () => {
    const body = { name: 123 };
    expect(() => requiredString(body, 'name', 'Name')).toThrow(AppError);
  });

  it('should respect both min and max constraints', () => {
    const body = { name: 'hello' };
    const result = requiredString(body, 'name', 'Name', { min: 3, max: 10 });
    expect(result).toBe('hello');
  });
});

describe('optionalString', () => {
  it('should return null when field is missing', () => {
    const body = {};
    const result = optionalString(body, 'name', 'Name');
    expect(result).toBeNull();
  });

  it('should return null when field is empty', () => {
    const body = { name: '' };
    const result = optionalString(body, 'name', 'Name');
    expect(result).toBeNull();
  });

  it('should return trimmed string when present', () => {
    const body = { name: '  test  ' };
    const result = optionalString(body, 'name', 'Name');
    expect(result).toBe('test');
  });

  it('should throw when exceeds maximum length', () => {
    const body = { name: 'toolongstring' };
    expect(() => optionalString(body, 'name', 'Name', { max: 5 })).toThrow(AppError);
  });
});

describe('requiredId', () => {
  it('should return valid positive integer', () => {
    const result = requiredId('123', 'id');
    expect(result).toBe(123);
  });

  it('should throw for non-integer values', () => {
    expect(() => requiredId('abc', 'id')).toThrow(AppError);
  });

  it('should throw for zero', () => {
    expect(() => requiredId('0', 'id')).toThrow(AppError);
  });

  it('should throw for negative numbers', () => {
    expect(() => requiredId('-1', 'id')).toThrow(AppError);
  });

  it('should throw for decimal numbers', () => {
    expect(() => requiredId('12.5', 'id')).toThrow(AppError);
  });
});

describe('optionalId', () => {
  it('should return null when value is undefined', () => {
    expect(optionalId(undefined, 'id')).toBeNull();
  });

  it('should return null when value is null', () => {
    expect(optionalId(null, 'id')).toBeNull();
  });

  it('should return null when value is empty string', () => {
    expect(optionalId('', 'id')).toBeNull();
  });

  it('should return valid id', () => {
    expect(optionalId('456', 'id')).toBe(456);
  });

  it('should throw for invalid id', () => {
    expect(() => optionalId('abc', 'id')).toThrow(AppError);
  });
});

describe('requiredEmail', () => {
  it('should return valid email in lowercase', () => {
    const body = { email: 'TEST@EXAMPLE.COM' };
    const result = requiredEmail(body);
    expect(result).toBe('test@example.com');
  });

  it('should throw for invalid email format', () => {
    const body = { email: 'invalid-email' };
    expect(() => requiredEmail(body)).toThrow(AppError);
  });

  it('should throw when email is missing', () => {
    const body = {};
    expect(() => requiredEmail(body)).toThrow(AppError);
  });

  it('should accept valid complex emails', () => {
    const body = { email: 'user+tag@subdomain.co.uk' };
    const result = requiredEmail(body);
    expect(result).toBe('user+tag@subdomain.co.uk');
  });

  it('should reject email without domain', () => {
    const body = { email: 'user@localhost' };
    expect(() => requiredEmail(body)).toThrow(AppError);
  });
});

describe('requiredUsernameValue', () => {
  it('should accept valid username', () => {
    const result = requiredUsernameValue('valid_user123');
    expect(result).toBe('valid_user123');
  });

  it('should throw for username too short', () => {
    expect(() => requiredUsernameValue('ab')).toThrow(AppError);
  });

  it('should throw for username too long', () => {
    const longUsername = 'a'.repeat(31);
    expect(() => requiredUsernameValue(longUsername)).toThrow(AppError);
  });

  it('should throw for invalid characters', () => {
    expect(() => requiredUsernameValue('user@name')).toThrow(AppError);
  });

  it('should accept underscore', () => {
    const result = requiredUsernameValue('user_name');
    expect(result).toBe('user_name');
  });

  it('should accept numbers', () => {
    const result = requiredUsernameValue('user123');
    expect(result).toBe('user123');
  });
});

describe('requiredUrl', () => {
  it('should return valid http URL', () => {
    const body = { url: 'http://example.com' };
    const result = requiredUrl(body, 'url', 'URL');
    expect(result).toBe('http://example.com');
  });

  it('should return valid https URL', () => {
    const body = { url: 'https://example.com/path?query=value' };
    const result = requiredUrl(body, 'url', 'URL');
    expect(result).toBe('https://example.com/path?query=value');
  });

  it('should return null for missing URL', () => {
    const body = {};
    const result = requiredUrl(body, 'url', 'URL');
    expect(result).toBeNull();
  });

  it('should throw for invalid URL', () => {
    const body = { url: 'not-a-url' };
    expect(() => requiredUrl(body, 'url', 'URL')).toThrow(AppError);
  });

  it('should throw for ftp protocol', () => {
    const body = { url: 'ftp://example.com' };
    expect(() => requiredUrl(body, 'url', 'URL')).toThrow(AppError);
  });
});

