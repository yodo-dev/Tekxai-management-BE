import { DEFAULT_ROLE_PERMISSIONS } from '../../src/modules/permissions/constants/permission-keys.js';

export async function seed_permissions(prisma) {
  console.log('[seed] Seeding default role permissions...');
  const ops = [];
  for (const [role_name, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    for (const permission of perms) {
      ops.push(
        prisma.role_permissions.upsert({
          where: { role_name_permission: { role_name, permission } },
          update: {}, // never overwrite admin-configured values
          create: { role_name, permission, granted: true },
        })
      );
    }
  }
  await prisma.$transaction(ops);
  console.log(`[seed] ${ops.length} permission rows seeded.`);
}
