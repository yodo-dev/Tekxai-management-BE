import prisma from '../../../shared/database/client.js';

/** Get all permissions for a role as a Set of granted permission keys */
export async function get_role_permissions(role_name) {
  const rows = await prisma.role_permissions.findMany({
    take: 500,
    where: { role_name, granted: true },
    select: { permission: true },
  });
  return new Set(rows.map((r) => r.permission));
}

/** Get all role_permissions rows for the management UI */
export async function list_all_permissions() {
  return prisma.role_permissions.findMany({
    take: 500,
    orderBy: [{ role_name: 'asc' }, { permission: 'asc' }],
  });
}

/** Get all permissions for a specific role (full rows) */
export async function list_role_permissions(role_name) {
  return prisma.role_permissions.findMany({
    take: 500,
    where: { role_name },
    orderBy: { permission: 'asc' },
  });
}

/** Upsert a permission grant/revoke for a role */
export async function set_permission(role_name, permission, granted) {
  return prisma.role_permissions.upsert({
    where: { role_name_permission: { role_name, permission } },
    update: { granted },
    create: { role_name, permission, granted },
  });
}

/** Bulk upsert many permissions for a role at once */
export async function set_permissions_bulk(role_name, grants) {
  // grants: Array<{ permission: string, granted: boolean }>
  return prisma.$transaction(
    grants.map(({ permission, granted }) =>
      prisma.role_permissions.upsert({
        where: { role_name_permission: { role_name, permission } },
        update: { granted },
        create: { role_name, permission, granted },
      })
    )
  );
}

/** Check if a role has a specific permission */
export async function has_permission(role_name, permission) {
  const row = await prisma.role_permissions.findUnique({
    where: { role_name_permission: { role_name, permission } },
  });
  return row ? row.granted : false;
}

/** Seed default permissions for all roles (idempotent) */
export async function seed_default_permissions(defaults) {
  // defaults: { ROLE_NAME: ['perm.key.action', ...] }
  const ops = [];
  for (const [role_name, perms] of Object.entries(defaults)) {
    for (const permission of perms) {
      ops.push(
        prisma.role_permissions.upsert({
          where: { role_name_permission: { role_name, permission } },
          update: {}, // don't overwrite admin-configured values
          create: { role_name, permission, granted: true },
        })
      );
    }
  }
  return prisma.$transaction(ops);
}
