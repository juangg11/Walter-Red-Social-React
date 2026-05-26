import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stub environment variables with localhost values that are allowed by WebSocket host checks
vi.stubEnv('VITE_API_URL', 'http://localhost:3001');
vi.stubEnv('VITE_WS_URL', 'wss://localhost:3001/ws');

describe('API Client', () => {
  let originalFetch;
  let originalLocalStorage;
  let originalConsole;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalLocalStorage = global.localStorage;

    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };

    global.fetch = vi.fn();
    originalConsole = global.console;
    global.console = {
      ...console,
      warn: vi.fn(),
      error: vi.fn(),
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.localStorage = originalLocalStorage;
    global.console = originalConsole;
    vi.clearAllMocks();
  });

  it('should fetch data from API successfully with valid token', async () => {
    const validToken = 'header.payload.signature';
    global.localStorage.getItem.mockReturnValue(validToken);

    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    };
    global.fetch.mockResolvedValueOnce(mockResponse);

    const { default: request } = await import('../api/client.js');
    const result = await request('/test-path');

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/test-path', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
    });
    expect(result).toEqual({ success: true });
  });

  it('should handle request without token', async () => {
    global.localStorage.getItem.mockReturnValue(null);

    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ data: 'ok' }),
    };
    global.fetch.mockResolvedValueOnce(mockResponse);

    const { default: request } = await import('../api/client.js');
    await request('/no-token');

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/no-token', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('should reject unsafe relative paths', async () => {
    const { default: request } = await import('../api/client.js');

    await expect(request('http://unsafe.com/path')).rejects.toThrow('Ruta de petición no segura.');
    await expect(request('//unsafe-relative')).rejects.toThrow('Ruta de petición no segura.');
  });

  it('should handle token with suspicious format', async () => {
    global.localStorage.getItem.mockReturnValue('invalid_token_format');

    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({}),
    };
    global.fetch.mockResolvedValueOnce(mockResponse);

    const { default: request } = await import('../api/client.js');
    await request('/test');

    expect(console.warn).toHaveBeenCalledWith('Token con formato sospechoso.');
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/test', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('should throw HTTP error when response is not ok', async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid parameters' }),
    };
    global.fetch.mockResolvedValueOnce(mockResponse);

    const { default: request } = await import('../api/client.js');
    await expect(request('/error')).rejects.toThrow('Invalid parameters');
  });

  it('should throw generic HTTP error when error JSON parsing fails', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('JSON parse error');
      },
    };
    global.fetch.mockResolvedValueOnce(mockResponse);

    const { default: request } = await import('../api/client.js');
    await expect(request('/internal-error')).rejects.toThrow('Error HTTP 500');
  });

  it('should remove token and trigger auth event on 401 unauthorized', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      json: async () => ({ error: 'Session expired' }),
    };
    global.fetch.mockResolvedValueOnce(mockResponse);

    const originalDispatchEvent = window.dispatchEvent;
    const mockDispatchEvent = vi.fn();
    window.dispatchEvent = mockDispatchEvent;

    const { default: request } = await import('../api/client.js');
    await expect(request('/secure')).rejects.toThrow('Session expired');

    expect(global.localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(global.localStorage.removeItem).toHaveBeenCalledWith('user');
    expect(mockDispatchEvent).toHaveBeenCalled();

    window.dispatchEvent = originalDispatchEvent;
  });

  describe('getChatSocketUrl', () => {
    let originalLocation;

    beforeEach(() => {
      originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: new URL('http://localhost:3000'),
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        configurable: true,
      });
    });

    it('should generate socket URL from configured WS_URL', async () => {
      const { getChatSocketUrl } = await import('../api/client.js');
      const url = getChatSocketUrl();
      console.log('SOCKET_URL_ERROR_CALLS:', console.error.mock.calls);
      expect(url).toContain('wss://localhost:3001/ws');
    });

    it('should fallback and build WS url from API URL when WS_URL is empty', async () => {
      vi.stubEnv('VITE_WS_URL', '');
      const { getChatSocketUrl } = await import('../api/client.js');
      const url = getChatSocketUrl();
      expect(url).toContain('ws://localhost:3001/ws');
    });

    it('should return null if WS host is not in allowlist', async () => {
      vi.stubEnv('VITE_WS_URL', 'wss://malicious-host.com/ws');
      const { getChatSocketUrl } = await import('../api/client.js');
      const url = getChatSocketUrl();
      expect(url).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('should return null for invalid WebSocket protocols', async () => {
      vi.stubEnv('VITE_WS_URL', 'http://localhost:3001/ws');
      const { getChatSocketUrl } = await import('../api/client.js');
      const url = getChatSocketUrl();
      expect(url).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('should return null for malformed URL', async () => {
      vi.stubEnv('VITE_WS_URL', '!!!invalid-url!!!');
      const { getChatSocketUrl } = await import('../api/client.js');
      const url = getChatSocketUrl();
      expect(url).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });
});
