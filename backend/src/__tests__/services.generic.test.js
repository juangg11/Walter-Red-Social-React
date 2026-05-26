import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chatService } from '../services/chat.service.js';
import { mediaService } from '../services/media.service.js';
import { notificacionesService } from '../services/notificaciones.service.js';

vi.mock('../config/db.js');

describe('Services - Generic Tests', () => {
  describe('chatService', () => {
    it('should have list method', () => {
      expect(typeof chatService.list).toBe('function');
    });

    it('should have messages method', () => {
      expect(typeof chatService.messages).toBe('function');
    });

    it('should have send method', () => {
      expect(typeof chatService.send).toBe('function');
    });
  });

  describe('mediaService', () => {
    it('should have createSignature method', () => {
      expect(typeof mediaService.createSignature).toBe('function');
    });

    it('should have commit method', () => {
      expect(typeof mediaService.commit).toBe('function');
    });

    it('should have getById method', () => {
      expect(typeof mediaService.getById).toBe('function');
    });
  });

  describe('notificacionesService', () => {
    it('should have getAll method', () => {
      expect(typeof notificacionesService.getAll).toBe('function');
    });

    it('should have markAsRead method', () => {
      expect(typeof notificacionesService.markAsRead).toBe('function');
    });
  });
});

