import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { UserModel } from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';

export const authService = {
  toAuthUser(user) {
    const authUser = {
      id: user.id,
      email: user.email,
      username: user.username,
    };
    if (user.avatar_url !== undefined) authUser.avatar_url = user.avatar_url;
    if (user.bio !== undefined) authUser.bio = user.bio;
    if (user.fecha_creacion !== undefined) authUser.fecha_creacion = user.fecha_creacion;
    if (user.is_admin !== undefined) authUser.isAdmin = user.is_admin === 1 || user.is_admin === true;
    return authUser;
  },

  async register({ email, username, password }) {
    const existing = await UserModel.findByEmailOrUsername(email, username);
    if (existing.length > 0) {
      throw new AppError(409, 'Email o username ya en uso');
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);

    await UserModel.create({ id, email, username, passwordHash });

    const token = jwt.sign({ id, email, username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const user = await UserModel.findById(id);
    return { token, user: this.toAuthUser(user) };
  },

  async login({ email, password }) {
    const user = await UserModel.findByEmail(email);

    if (!user) throw new AppError(401, 'Credenciales incorrectas');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new AppError(401, 'Credenciales incorrectas');

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    return { token, user: this.toAuthUser(user) };
  },

  async checkUsername(username) {
    return { available: !(await UserModel.usernameExists(username)) };
  },
};
