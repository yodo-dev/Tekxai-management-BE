import { seedAdmin as seed_admin } from './admin.seeder.js';
import { seed_permissions } from './permissions.seeder.js';
import { seed_ticket_desk } from './ticket-desk.seeder.js';
import { seed_compliance_categories } from './compliance.seeder.js';
import { seed_compliance_sample_data } from './compliance-sample-data.seeder.js';
import { seed_business_units } from './business-units.seeder.js';
import prisma from '../../src/shared/database/client.js';

async function main() {
  console.log('[seed] Starting seed…');
  await seed_admin(prisma);
  await seed_permissions(prisma);
  await seed_ticket_desk(prisma);
  await seed_compliance_categories(prisma);
  await seed_compliance_sample_data(prisma);
  await seed_business_units(prisma);
  console.log('[seed] Complete.');
}

main()
  .catch((e) => { console.error('[seed] Failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
