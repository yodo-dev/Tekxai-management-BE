// Safety & Compliance — seeds new Asset Categories via the existing
// asset_categories table/CRUD (no new categories mechanism). Existing
// categories (IT Equipment, Furniture, etc.) are untouched.

const CATEGORIES = [
  { name: 'First Aid', code: 'first_aid', tracking_type: 'QUANTITY', default_criticality: 'HIGH' },
  { name: 'Fire Safety', code: 'fire_safety', tracking_type: 'SERIALIZED', default_criticality: 'CRITICAL', default_inspection_frequency_days: 90 },
  { name: 'Emergency', code: 'emergency', tracking_type: 'SERIALIZED', default_criticality: 'CRITICAL', default_inspection_frequency_days: 90 },
  { name: 'Security', code: 'security', tracking_type: 'SERIALIZED', default_criticality: 'HIGH', default_inspection_frequency_days: 180 },
  { name: 'PPE', code: 'ppe', tracking_type: 'QUANTITY', default_criticality: 'MEDIUM' },
  { name: 'Environmental', code: 'environmental', tracking_type: 'SERIALIZED', default_criticality: 'MEDIUM', default_inspection_frequency_days: 180 },
  { name: 'Utilities', code: 'utilities', tracking_type: 'SERIALIZED', default_criticality: 'HIGH', default_inspection_frequency_days: 180 },
];

export async function seed_compliance_categories(prisma) {
  for (const [i, c] of CATEGORIES.entries()) {
    await prisma.asset_categories.upsert({
      where: { code: c.code },
      update: {},
      create: {
        name: c.name,
        code: c.code,
        description: `Safety & Compliance — ${c.name}`,
        is_device: false,
        is_assignable: c.tracking_type === 'SERIALIZED',
        tracking_type: c.tracking_type,
        default_criticality: c.default_criticality,
        default_inspection_frequency_days: c.default_inspection_frequency_days ?? null,
        sort_order: 100 + i,
      },
    });
  }
  console.log(`[seed] Safety & Compliance: ${CATEGORIES.length} asset categories`);
}
