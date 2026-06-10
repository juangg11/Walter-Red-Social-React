import { UserModel } from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';

export async function requireAdmin(req, _res, next) {
  const userId = req.user?.id;

  if (!userId) {
    return next(new AppError(401, 'Token requerido'));
  }

  const isAdmin = await UserModel.isAdmin(userId);
  if (!isAdmin) {
    return next(new AppError(403, 'Acceso reservado a administradores'));
  }

  return next();
}
