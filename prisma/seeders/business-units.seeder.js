// Organization Hierarchy Migration — Sprint 1, Phase 1. Seeds the two
// current business units. Idempotent (upsert by unique code) so it's safe
// to re-run.
export async function seed_business_units(prisma) {
  console.log('[seed] Seeding default business units...');
  const defaults = [
    { name: 'TekxAI Software House', code: 'SOFTWARE_HOUSE', sort_order: 1 },
    { name: 'TekxAI Cost Estimators', code: 'COST_ESTIMATORS', sort_order: 2 },
  ];
  for (const bu of defaults) {
    await prisma.business_units.upsert({
      where: { code: bu.code },
      update: {},
      create: bu,
    });
  }
  console.log(`[seed] ${defaults.length} business unit(s) seeded.`);
}
