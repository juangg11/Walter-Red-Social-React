import { AdminModel } from '../models/admin.model.js';
import { AppError } from '../utils/AppError.js';

export const adminController = {
  resources(_req, res) {
    res.json(AdminModel.listResources());
  },

  async list(req, res) {
    const rows = await AdminModel.findAll(req.params.resource);

    if (!rows) {
      throw new AppError(404, 'Recurso administrativo no encontrado');
    }

    res.json(rows);
  },
};
