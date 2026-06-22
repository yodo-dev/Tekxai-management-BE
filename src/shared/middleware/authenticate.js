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

/**
 * Permission-key middleware for DB-driven granular access control.
 * Usage: router.get('/resource', authenticate, can('crm.pipeline.view'), handler)
 *
 * Super Admin always passes.
 * For all other roles, checks the role_permissions table.
 */
export function can(permission) {
  return async (req, res, next) => {
    if (!req.user) return next(app_error('Authentication required', 401));
    if (req.user.roles.includes('SUPER_ADMIN')) return next();
    try {
      const { check_permission } = await import('../../modules/permissions/services/permissions.service.js');
      const granted = await check_permission(req.user.roles, permission, req.user.id);
      if (!granted) return next(app_error(`Permission denied: ${permission}`, 403));
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
