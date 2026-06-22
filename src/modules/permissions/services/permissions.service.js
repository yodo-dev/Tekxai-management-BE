import { get_role_permissions, list_all_permissions, list_role_permissions, set_permissions_bulk } from '../repositories/permissions.repository.js';
import { PERMISSION_DEFINITIONS, ALL_ROLE_NAMES } from '../constants/permission-keys.js';
import prisma from '../../../shared/database/client.js';

// ── Role-level cache: role_name → Set<string>, TTL 5 minutes ─────────────────
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function get_cached(role_name) {
  const entry = cache.get(role_name);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(role_name); return null; }
  return entry.perms;
}
function set_cached(role_name, perms) { cache.set(role_name, { perms, ts: Date.now() }); }

export function invalidate_cache(role_name) {
  if (role_name) cache.delete(role_name);
  else cache.clear();
}

// ── User-level override cache: user_id → Map<permission, boolean>, TTL 2 min ─
const user_cache = new Map();
const USER_CACHE_TTL = 2 * 60 * 1000;

function get_user_cached(user_id) {
  const entry = user_cache.get(user_id);
  if (!entry) return null;
  if (Date.now() - entry.ts > USER_CACHE_TTL) { user_cache.delete(user_id); return null; }
  return entry.overrides;
}
function set_user_cached(user_id, overrides) { user_cache.set(user_id, { overrides, ts: Date.now() }); }

export function invalidate_user_cache(user_id) {
  if (user_id) user_cache.delete(user_id);
  else user_cache.clear();
}

// ── Core permission check ──────────────────────────────────────────────────────
/**
 * Precedence order:
 * 1. SUPER_ADMIN → always true
 * 2. user_id provided + user_permissions override → explicit grant or deny
 * 3. role_permissions → granted for any of the user's roles
 * 4. deny by default
 */
export async function check_permission(roles, permission, user_id = null) {
  if (roles.includes('SUPER_ADMIN')) return true;

  // 2. User-level override
  if (user_id) {
    let overrides = get_user_cached(user_id);
    if (!overrides) {
      const rows = await prisma.user_permissions.findMany({ where: { user_id } });
      overrides = new Map(rows.map(r => [r.permission, r.granted]));
      set_user_cached(user_id, overrides);
    }
    if (overrides.has(permission)) return overrides.get(permission);
  }

  // 3. Role-level check
  for (const role of roles) {
    let perms = get_cached(role);
    if (!perms) {
      perms = await get_role_permissions(role);
      set_cached(role, perms);
    }
    if (perms.has(permission)) return true;
  }
  return false;
}

// ── Role permission management ────────────────────────────────────────────────
export async function get_permissions_for_role(role_name) {
  const rows = await list_role_permissions(role_name);
  const granted_map = new Map(rows.map((r) => [r.permission, r.granted]));
  return PERMISSION_DEFINITIONS.map((def) => ({
    permission: def.key,
    label: def.label,
    workspace: def.workspace,
    module: def.module,
    action: def.action,
    granted: granted_map.get(def.key) ?? false,
  }));
}

export async function get_all_permissions() {
  const rows = await list_all_permissions();
  const by_role = {};
  for (const role of ALL_ROLE_NAMES) {
    by_role[role] = {};
    for (const def of PERMISSION_DEFINITIONS) by_role[role][def.key] = false;
  }
  for (const row of rows) {
    if (by_role[row.role_name]) by_role[row.role_name][row.permission] = row.granted;
  }
  return { roles: ALL_ROLE_NAMES, definitions: PERMISSION_DEFINITIONS, by_role };
}

export async function save_role_permissions(role_name, grants) {
  if (!ALL_ROLE_NAMES.includes(role_name))
    throw Object.assign(new Error('Invalid role name'), { status_code: 400 });
  await set_permissions_bulk(role_name, grants);
  invalidate_cache(role_name);
}

// ── User permission overrides ─────────────────────────────────────────────────
export async function get_user_overrides(user_id) {
  return prisma.user_permissions.findMany({
    where: { user_id },
    orderBy: { permission: 'asc' },
  });
}

export async function get_user_effective_permissions(user_id, roles) {
  const [overrides, role_rows] = await Promise.all([
    prisma.user_permissions.findMany({ where: { user_id } }),
    list_all_permissions(),
  ]);

  // Build role grants for this user's roles
  const role_grants = new Map();
  for (const row of role_rows) {
    if (roles.includes(row.role_name) && row.granted) role_grants.set(row.permission, true);
  }

  // Build override map
  const override_map = new Map(overrides.map(r => [r.permission, r.granted]));

  // Merge into effective permissions
  return PERMISSION_DEFINITIONS.map(def => {
    const key = def.key;
    const from_override = override_map.has(key);
    const granted = from_override ? override_map.get(key) : (role_grants.get(key) ?? false);
    return {
      permission: key,
      label: def.label,
      workspace: def.workspace,
      module: def.module,
      action: def.action,
      granted,
      source: from_override ? (override_map.get(key) ? 'override_grant' : 'override_deny') : (granted ? 'role' : 'default_deny'),
    };
  });
}

export async function set_user_permission(user_id, permission, granted, granted_by, note) {
  const result = await prisma.user_permissions.upsert({
    where: { user_id_permission: { user_id, permission } },
    create: { user_id, permission, granted, granted_by, note },
    update: { granted, granted_by, note, updated_at: new Date() },
  });
  invalidate_user_cache(user_id);
  return result;
}

export async function delete_user_permission(user_id, permission) {
  await prisma.user_permissions.deleteMany({ where: { user_id, permission } });
  invalidate_user_cache(user_id);
}

export async function delete_all_user_overrides(user_id) {
  await prisma.user_permissions.deleteMany({ where: { user_id } });
  invalidate_user_cache(user_id);
}
