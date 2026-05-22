import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PostModel } from '../models/post.model.js';
import { CommentModel } from '../models/comment.model.js';
import { VoteModel } from '../models/vote.model.js';
import { CommunityModel } from '../models/community.model.js';
import { NotificationModel } from '../models/notification.model.js';
import { MediaModel } from '../models/media.model.js';
import pool from '../config/db.js';

vi.mock('../config/db.js');

describe('Models - Generic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pool.query.mockResolvedValue([[], []]);
  });

  describe('PostModel', () => {
    it('should have findAll method', () => {
      expect(typeof PostModel.findAll).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof PostModel.findById).toBe('function');
    });

    it('should have findRawById method', () => {
      expect(typeof PostModel.findRawById).toBe('function');
    });

    it('should have create method', () => {
      expect(typeof PostModel.create).toBe('function');
    });

    it('should have delete method', () => {
      expect(typeof PostModel.delete).toBe('function');
    });

    it('should have incrementVotes method', () => {
      expect(typeof PostModel.incrementVotes).toBe('function');
    });

    it('findAll should handle filters', async () => {
      pool.query.mockResolvedValue([[]]);
      await PostModel.findAll({ comunidad_id: 1, userId: '123' });
      expect(pool.query).toHaveBeenCalled();
    });
  });

  describe('CommentModel', () => {
    it('should have findByPostId method', () => {
      expect(typeof CommentModel.findByPostId).toBe('function');
    });

    it('should have create method', () => {
      expect(typeof CommentModel.create).toBe('function');
    });

    it('should have delete method', () => {
      expect(typeof CommentModel.delete).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof CommentModel.findById).toBe('function');
    });
  });

  describe('VoteModel', () => {
    it('should have find method', () => {
      expect(typeof VoteModel.find).toBe('function');
    });

    it('should have create method', () => {
      expect(typeof VoteModel.create).toBe('function');
    });

    it('should have delete method', () => {
      expect(typeof VoteModel.delete).toBe('function');
    });

    it('should have update method', () => {
      expect(typeof VoteModel.update).toBe('function');
    });
  });

  describe('CommunityModel', () => {
    it('should have findAll method', () => {
      expect(typeof CommunityModel.findAll).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof CommunityModel.findById).toBe('function');
    });

    it('should have create method', () => {
      expect(typeof CommunityModel.create).toBe('function');
    });

    it('should have isMember method', () => {
      expect(typeof CommunityModel.isMember).toBe('function');
    });

    it('should have join method', () => {
      expect(typeof CommunityModel.join).toBe('function');
    });

    it('should have leave method', () => {
      expect(typeof CommunityModel.leave).toBe('function');
    });

    it('should have incrementPosts method', () => {
      expect(typeof CommunityModel.incrementPosts).toBe('function');
    });

    it('should have decrementPosts method', () => {
      expect(typeof CommunityModel.decrementPosts).toBe('function');
    });
  });

  describe('NotificationModel', () => {
    it('should have findByUserId method', () => {
      expect(typeof NotificationModel.findByUserId).toBe('function');
    });

    it('should have create method', () => {
      expect(typeof NotificationModel.create).toBe('function');
    });

    it('should have markAsRead method', () => {
      expect(typeof NotificationModel.markAsRead).toBe('function');
    });
  });

  describe('MediaModel', () => {
    it('should have findById method', () => {
      expect(typeof MediaModel.findById).toBe('function');
    });

    it('should have delete method', () => {
      expect(typeof MediaModel.delete).toBe('function');
    });
  });

  describe('Database Queries', () => {
    it('PostModel.findAll should execute query', async () => {
      pool.query.mockResolvedValue([[]]);
      await PostModel.findAll({});
      expect(pool.query).toHaveBeenCalled();
    });

    it('CommentModel methods should execute queries', async () => {
      pool.query.mockResolvedValue([[]]);
      await CommentModel.findByPostId(1);
      expect(pool.query).toHaveBeenCalled();
    });

    it('CommunityModel.findAll should execute query', async () => {
      pool.query.mockResolvedValue([[]]);
      await CommunityModel.findAll();
      expect(pool.query).toHaveBeenCalled();
    });
  });
});

