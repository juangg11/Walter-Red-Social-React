import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatController } from '../controllers/chat.controller.js';
import { chatService } from '../services/chat.service.js';

vi.mock('../services/chat.service.js');

describe('chatController', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      params: {},
      body: {},
      user: { id: '123' },
      app: {
        get: vi.fn(),
      },
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should get user conversations', async () => {
      const mockConversations = [{ id: 1, name: 'Chat 1' }];
      chatService.list.mockResolvedValue(mockConversations);

      await chatController.list(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockConversations);
    });
  });

  describe('messages', () => {
    it('should get conversation messages', async () => {
      mockReq.params = { chatId: '1' };
      const mockMessages = [{ id: 1, contenido: 'Message' }];
      chatService.messages.mockResolvedValue(mockMessages);

      await chatController.messages(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockMessages);
    });
  });

  describe('send', () => {
    it('should create a message', async () => {
      mockReq.params = { chatId: '1' };
      mockReq.body = { contenido: 'Hello' };
      const mockCreated = { id: 1, contenido: 'Hello' };
      chatService.send.mockResolvedValue(mockCreated);
      chatService.participantIds.mockResolvedValue(['123', '456']);

      await chatController.send(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockCreated);
    });
  });
});
