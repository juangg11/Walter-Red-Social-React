import { AppError } from '../utils/AppError.js';

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const USERNAME_RE = /^\w{3,30}$/;

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function requiredString(body, key, label, { min = 1, max = 1000 } = {}) {
  const value = asString(body[key]);
  if (!value) throw new AppError(400, `${label} es obligatorio`);
  if (value.length < min) throw new AppError(400, `${label} debe tener al menos ${min} caracteres`);
  if (value.length > max) throw new AppError(400, `${label} no puede superar ${max} caracteres`);
  return value;
}

export function optionalString(body, key, label, { max = 1000 } = {}) {
  const value = asString(body[key]);
  if (!value) return null;
  if (value.length > max) throw new AppError(400, `${label} no puede superar ${max} caracteres`);
  return value;
}

export function requiredId(value, label = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, `${label} inválido`);
  return id;
}

export function optionalId(value, label = 'id') {
  if (value === undefined || value === null || value === '') return null;
  return requiredId(value, label);
}

export function requiredEmail(body) {
  const email = requiredString(body, 'email', 'Email', { max: 255 }).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new AppError(400, 'Email inválido');
  return email;
}

export function requiredUsernameValue(value) {
  const username = asString(value);
  if (!USERNAME_RE.test(username)) {
    throw new AppError(400, 'El username debe tener entre 3 y 30 caracteres y solo letras, números o guion bajo');
  }
  return username;
}

export function requiredUrl(body, key, label) {
  const value = optionalString(body, key, label, { max: 2048 });
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol');
    return value;
  } catch {
    throw new AppError(400, `${label} debe ser una URL http o https válida`);
  }
}
