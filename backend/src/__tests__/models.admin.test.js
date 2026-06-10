import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminModel } from '../models/admin.model.js';
import pool from '../config/db.js';

vi.mock('../config/db.js');

describe('AdminModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists administrative resources without exposing SQL queries', () => {
    const resources = AdminModel.listResources();

    expect(resources.length).toBeGreaterThan(0);
    expect(resources.some((resource) => resource.name === 'notificaciones')).toBe(true);
    expect(resources.every((resource) => resource.query === undefined)).toBe(true);
  });

  it('checks allowed resource names from the allowlist', () => {
    expect(AdminModel.hasResource('usuarios')).toBe(true);
    expect(AdminModel.hasResource('tabla_inventada')).toBe(false);
  });

  it('returns null for unknown resources without querying the database', async () => {
    const result = await AdminModel.findAll('tabla_inventada');

    expect(result).toBeNull();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('queries rows for a known administrative resource', async () => {
    const rows = [{ id: '1', username: 'walter' }];
    pool.query.mockResolvedValue([rows]);

    const result = await AdminModel.findAll('usuarios');

    expect(result).toEqual(rows);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][0]).toContain('FROM users');
  });
});
