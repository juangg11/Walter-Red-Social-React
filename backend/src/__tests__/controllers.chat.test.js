import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe('getConversations', () => {
    it('should get user conversations', async () => {
      const mockConversations = [{ id: 1, name: 'Chat 1' }];
      chatService.getConversations.mockResolvedValue(mockConversations);

      await chatController.getConversations(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockConversations);
    });
  });

  describe('getMessages', () => {
    it('should get conversation messages', async () => {
      mockReq.params = { id: '1' };
      const mockMessages = [{ id: 1, contenido: 'Message' }];
      chatService.getMessages.mockResolvedValue(mockMessages);

      await chatController.getMessages(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockMessages);
    });
  });

  describe('createMessage', () => {
    it('should create a message', async () => {
      mockReq.body = { contenido: 'Hello', conversation_id: 1 };
      const mockCreated = { id: 1, contenido: 'Hello' };
      chatService.createMessage.mockResolvedValue(mockCreated);

      await chatController.createMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockCreated);
    });
  });
});

