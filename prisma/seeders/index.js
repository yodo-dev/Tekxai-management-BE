import { seedAdmin as seed_admin } from './admin.seeder.js';
import { seed_permissions } from './permissions.seeder.js';
import prisma from '../../src/shared/database/client.js';

async function main() {
  console.log('[seed] Starting seed…');
  await seed_admin(prisma);
  await seed_permissions(prisma);
  console.log('[seed] Complete.');
}

main()
  .catch((e) => { console.error('[seed] Failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
