import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import request from '../api/client.js';

vi.mock('../api/client.js');

describe('cloudinary utility - uploadToCloudinary', () => {
  let originalFetch;
  let originalConsoleError;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    originalConsoleError = console.error;
    console.error = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    console.error = originalConsoleError;
  });

  it('should upload to cloudinary successfully', async () => {
    const mockFile = new File(['test'], 'image.png', { type: 'image/png' });
    
    // 1. Mock request for signature
    request.mockResolvedValueOnce({
      cloudName: 'safe-cloud',
      apiKey: 'api-key-123',
      timestamp: 1234567,
      signature: 'sig-123',
      folder: 'posts',
      context: 'user=123',
    });

    // 2. Mock fetch for Cloudinary upload
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        public_id: 'pub-id',
        secure_url: 'https://cloudinary.com/safe-cloud/image.png',
        resource_type: 'image',
        format: 'png',
        bytes: 100,
        width: 10,
        height: 10,
        duration: null,
      }),
    });

    // 3. Mock request for commit
    const mockSavedAsset = { id: 1, secure_url: 'https://cloudinary.com/safe-cloud/image.png' };
    request.mockResolvedValueOnce(mockSavedAsset);

    const result = await uploadToCloudinary(mockFile, 'posts');

    expect(request).toHaveBeenNthCalledWith(1, '/media/signature', {
      method: 'POST',
      body: JSON.stringify({ folder: 'posts' }),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.cloudinary.com/v1_1/safe-cloud/auto/upload',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    );

    expect(request).toHaveBeenNthCalledWith(2, '/media/commit', {
      method: 'POST',
      body: JSON.stringify({
        public_id: 'pub-id',
        secure_url: 'https://cloudinary.com/safe-cloud/image.png',
        resource_type: 'image',
        format: 'png',
        bytes: 100,
        width: 10,
        height: 10,
        duration: null,
      }),
    });

    expect(result).toEqual({
      cloudinary: {
        public_id: 'pub-id',
        secure_url: 'https://cloudinary.com/safe-cloud/image.png',
        resource_type: 'image',
        format: 'png',
        bytes: 100,
        width: 10,
        height: 10,
        duration: null,
      },
      asset: mockSavedAsset,
    });
  });

  it('should throw error if signature is missing or cloudName is absent', async () => {
    request.mockResolvedValueOnce(null);
    const mockFile = new File(['test'], 'image.png');

    await expect(uploadToCloudinary(mockFile, 'posts')).rejects.toThrow(
      'No se pudo obtener la configuración de Cloudinary.'
    );
  });

  it('should throw error if cloudName is unsafe', async () => {
    request.mockResolvedValueOnce({
      cloudName: 'unsafe;cloud!!',
    });
    const mockFile = new File(['test'], 'image.png');

    await expect(uploadToCloudinary(mockFile, 'posts')).rejects.toThrow(
      'Configuración de almacenamiento no segura.'
    );
    expect(console.error).toHaveBeenCalled();
  });

  it('should throw error if upload response is not ok', async () => {
    const mockFile = new File(['test'], 'image.png');
    
    request.mockResolvedValueOnce({
      cloudName: 'safe-cloud',
      apiKey: 'api-key-123',
      timestamp: 1234567,
      signature: 'sig-123',
      folder: 'posts',
      context: 'user=123',
    });

    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: { message: 'Upload failed' },
      }),
    });

    await expect(uploadToCloudinary(mockFile, 'posts')).rejects.toThrow('Upload failed');
  });

  it('should throw default error if upload response is not ok and no message provided', async () => {
    const mockFile = new File(['test'], 'image.png');
    
    request.mockResolvedValueOnce({
      cloudName: 'safe-cloud',
      apiKey: 'api-key-123',
      timestamp: 1234567,
      signature: 'sig-123',
      folder: 'posts',
      context: 'user=123',
    });

    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => null,
    });

    await expect(uploadToCloudinary(mockFile, 'posts')).rejects.toThrow('Error al subir archivo');
  });
});
