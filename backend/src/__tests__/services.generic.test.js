import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chatService } from '../services/chat.service.js';
import { mediaService } from '../services/media.service.js';
import { notificacionesService } from '../services/notificaciones.service.js';

vi.mock('../config/db.js');

describe('Services - Generic Tests', () => {
  describe('chatService', () => {
    it('should have getConversations method', () => {
      expect(typeof chatService.getConversations).toBe('function');
    });

    it('should have getMessages method', () => {
      expect(typeof chatService.getMessages).toBe('function');
    });

    it('should have createMessage method', () => {
      expect(typeof chatService.createMessage).toBe('function');
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

