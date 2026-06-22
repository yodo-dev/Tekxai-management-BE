import {
  get_all_permissions,
  get_permissions_for_role,
  save_role_permissions,
  get_user_overrides,
  get_user_effective_permissions,
  set_user_permission,
  delete_user_permission,
  delete_all_user_overrides,
} from '../services/permissions.service.js';
import { PERMISSION_DEFINITIONS, ALL_ROLE_NAMES } from '../constants/permission-keys.js';
import prisma from '../../../shared/database/client.js';

function ok(res, payload, msg = 'OK', status = 200) {
  return res.status(status).json({ success: true, message: msg, payload });
}
function fail(res, msg, status = 400) {
  return res.status(status).json({ success: false, message: msg });
}

// GET /permission
export async function get_matrix(req, res, next) {
  try {
    const data = await get_all_permissions();
    return ok(res, data);
  } catch (err) { next(err); }
}

// GET /permission/definitions
export async function get_definitions(req, res, next) {
  try {
    return ok(res, { definitions: PERMISSION_DEFINITIONS, roles: ALL_ROLE_NAMES });
  } catch (err) { next(err); }
}

// GET /permission/:roleName
export async function get_role(req, res, next) {
  try {
    const { roleName } = req.params;
    if (!ALL_ROLE_NAMES.includes(roleName)) return fail(res, 'Invalid role', 400);
    const perms = await get_permissions_for_role(roleName);
    return ok(res, { role_name: roleName, permissions: perms });
  } catch (err) { next(err); }
}

// GET /permission/my-permissions — includes user-level overrides applied on top of role grants
export async function get_my_permissions(req, res, next) {
  try {
    const roles = req.user.roles || [];
    const user_id = req.user.id;

    if (roles.includes('SUPER_ADMIN')) {
      const all_keys = PERMISSION_DEFINITIONS.map((d) => d.key);
      return ok(res, { roles, permissions: all_keys, is_super_admin: true });
    }

    // Compute effective permissions with user-level overrides applied
    const effective = await get_user_effective_permissions(user_id, roles);
    const granted_keys = effective.filter(p => p.granted).map(p => p.permission);
    return ok(res, { roles, permissions: granted_keys, is_super_admin: false });
  } catch (err) { next(err); }
}

// PUT /permission/:roleName
export async function update_role(req, res, next) {
  try {
    const { roleName } = req.params;
    const { grants } = req.body;
    if (!grants || !Array.isArray(grants)) return fail(res, 'grants array required');
    await save_role_permissions(roleName, grants);
    const updated = await get_permissions_for_role(roleName);
    return ok(res, { role_name: roleName, permissions: updated }, 'Permissions saved');
  } catch (err) { next(err); }
}

// ── User override endpoints ───────────────────────────────────────────────────

// GET /permission/users/:userId — get user's roles + overrides + effective permissions
export async function get_user_permissions_ctrl(req, res, next) {
  try {
    const { userId } = req.params;
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true, first_name: true, last_name: true, email: true, avatar: true,
        roles: { include: { role: { select: { name: true } } } },
      },
    });
    if (!user) return fail(res, 'User not found', 404);

    const roles = user.roles.map(r => r.role.name);
    const [overrides, effective] = await Promise.all([
      get_user_overrides(userId),
      get_user_effective_permissions(userId, roles),
    ]);

    return ok(res, { user, roles, overrides, effective });
  } catch (err) { next(err); }
}

// PUT /permission/users/:userId — set/update a single permission override
// Body: { permission: string, granted: boolean, note?: string }
export async function set_user_permission_ctrl(req, res, next) {
  try {
    const { userId } = req.params;
    const { permission, granted, note } = req.body;
    if (!permission || typeof granted !== 'boolean') return fail(res, 'permission and granted (boolean) required');
    if (!PERMISSION_DEFINITIONS.find(d => d.key === permission)) return fail(res, 'Unknown permission key', 400);

    const result = await set_user_permission(userId, permission, granted, req.user.id, note);
    return ok(res, result, 'User permission override saved');
  } catch (err) { next(err); }
}

// DELETE /permission/users/:userId/:permission — remove a single override
export async function delete_user_permission_ctrl(req, res, next) {
  try {
    const { userId, permission } = req.params;
    await delete_user_permission(userId, permission);
    return ok(res, null, 'Override removed');
  } catch (err) { next(err); }
}

// DELETE /permission/users/:userId — remove ALL overrides for a user
export async function delete_all_user_permissions_ctrl(req, res, next) {
  try {
    const { userId } = req.params;
    await delete_all_user_overrides(userId);
    return ok(res, null, 'All overrides removed');
  } catch (err) { next(err); }
}
