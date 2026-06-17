import jwt from 'jsonwebtoken';
import { env_config } from '../../config/env.js';

function app_error(message, status_code = 401) {
  const error = new Error(message);
  error.status_code = status_code;
  return error;
}

export function authenticate(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return next(app_error('Authentication required', 401));

  try {
    const decoded = jwt.verify(token, env_config.jwt_secret);
    req.user = { id: decoded.sub, email: decoded.email, roles: decoded.roles || [] };
    return next();
  } catch {
    return next(app_error('Invalid or expired token', 401));
  }
}

export function authorize(...allowed_roles) {
  return (req, res, next) => {
    if (!req.user) return next(app_error('Authentication required', 401));
    const has_role = req.user.roles.some((r) => allowed_roles.includes(r));
    if (!has_role) return next(app_error('Insufficient permissions', 403));
    return next();
  };
}
