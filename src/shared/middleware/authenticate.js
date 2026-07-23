import jwt from 'jsonwebtoken';
import { env_config } from '../../config/env.js';
import prisma from '../database/client.js';

function app_error(message, status_code = 401) {
  const error = new Error(message);
  error.status_code = status_code;
  return error;
}

// Online/last-seen heartbeat — chat-module audit found no presence signal
// anywhere in the app. There's no WebSocket infra to push real presence, so
// this bumps users.last_active_at on any authenticated request instead
// ("online" = active within ~2min, derived client-side). Throttled via an
// in-process Map so it's one UPDATE per user per 60s, not one per request —
// this process is the only backend instance (no Redis/shared cache in this
// app), so an in-memory throttle is consistent with everything else here.
const LAST_TOUCH = new Map();
const TOUCH_THROTTLE_MS = 60_000;
function touch_last_active(user_id) {
  const now = Date.now();
  const last = LAST_TOUCH.get(user_id) || 0;
  if (now - last < TOUCH_THROTTLE_MS) return;
  LAST_TOUCH.set(user_id, now);
  prisma.users.update({ where: { id: user_id }, data: { last_active_at: new Date() } }).catch(() => {});
}

export async function authenticate(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return next(app_error('Authentication required', 401));

  try {
    const decoded = jwt.verify(token, env_config.jwt_secret);

    // Reject deleted or inactive users even if their token is still valid
    const user = await prisma.users.findUnique({
      where: { id: decoded.sub },
      select: { id: true, deleted_at: true, status: true },
    });
    if (!user || user.deleted_at !== null || user.status === 'INACTIVE') {
      return next(app_error('Account is deactivated or deleted', 401));
    }

    req.user = { id: decoded.sub, email: decoded.email, roles: decoded.roles || [] };
    touch_last_active(decoded.sub);
    return next();
  } catch (err) {
    if (err.status_code) return next(err);
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
 * Priority: user override → role check → DB role permissions → deny
 *
 * Usage: can_or_role('erp.projects.view', 'ADMIN', 'SUPER_ADMIN')
 *
 * 1. SUPER_ADMIN always passes.
 * 2. User-level override (explicit grant or deny) wins over everything else.
 * 3. fallback_roles: if user's role is in this list, pass (fast path, no DB).
 * 4. DB role_permissions check for the permission key.
 * 5. Default: deny.
 */
export function can_or_role(permission, ...fallback_roles) {
  return async (req, res, next) => {
    if (!req.user) return next(app_error('Authentication required', 401));
    if (req.user.roles.includes('SUPER_ADMIN')) return next();
    try {
      const { get_user_cached_override, check_permission } = await import('../../modules/permissions/services/permissions.service.js');

      // 1. User-level override (highest priority)
      const override = get_user_cached_override(req.user.id, permission);
      if (override === true) return next();
      if (override === false) return next(app_error(`Permission denied: ${permission}`, 403));

      // 2. Role check (fast path)
      if (fallback_roles.length && req.user.roles.some((r) => fallback_roles.includes(r))) return next();

      // 3. DB role_permissions + uncached user overrides
      const granted = await check_permission(req.user.roles, permission, req.user.id);
      if (!granted) return next(app_error(`Permission denied: ${permission}`, 403));
      return next();
    } catch (err) {
      return next(err);
    }
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
