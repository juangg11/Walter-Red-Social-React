import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAdmin } from '../middleware/admin.js';
import { UserModel } from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';

vi.mock('../models/user.model.js');

describe('requireAdmin', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { user: { id: 'admin-id' } };
    res = {};
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('rejects requests without authenticated user id', async () => {
    req.user = null;

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].status).toBe(401);
  });

  it('rejects authenticated users that are not admins', async () => {
    UserModel.isAdmin.mockResolvedValue(false);

    await requireAdmin(req, res, next);

    expect(UserModel.isAdmin).toHaveBeenCalledWith('admin-id');
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].status).toBe(403);
  });

  it('allows admin users', async () => {
    UserModel.isAdmin.mockResolvedValue(true);

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
