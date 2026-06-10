import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminController } from '../controllers/admin.controller.js';
import { AdminModel } from '../models/admin.model.js';
import { AppError } from '../utils/AppError.js';

vi.mock('../models/admin.model.js');

describe('adminController', () => {
  let req;
  let res;

  beforeEach(() => {
    req = { params: {} };
    res = { json: vi.fn() };
    vi.clearAllMocks();
  });

  it('returns the administrative resources', () => {
    const resources = [{ name: 'usuarios', label: 'Usuarios' }];
    AdminModel.listResources.mockReturnValue(resources);

    adminController.resources(req, res);

    expect(res.json).toHaveBeenCalledWith(resources);
  });

  it('returns rows for a valid administrative resource', async () => {
    const rows = [{ id: '1', username: 'walter' }];
    req.params.resource = 'usuarios';
    AdminModel.findAll.mockResolvedValue(rows);

    await adminController.list(req, res);

    expect(AdminModel.findAll).toHaveBeenCalledWith('usuarios');
    expect(res.json).toHaveBeenCalledWith(rows);
  });

  it('throws a 404 for unknown resources', async () => {
    req.params.resource = 'unknown';
    AdminModel.findAll.mockResolvedValue(null);

    await expect(adminController.list(req, res)).rejects.toMatchObject({
      status: 404,
      message: 'Recurso administrativo no encontrado',
    });
    await expect(adminController.list(req, res)).rejects.toBeInstanceOf(AppError);
  });
});
