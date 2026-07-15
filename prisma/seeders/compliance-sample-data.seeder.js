// Realistic enterprise sample data for Safety & Compliance — Compliance
// Templates, Checklist Templates, and applied Compliance Requirements across
// a handful of representative offices, so the UI has real data to render
// against from day one (not an empty database).

const CHECKLIST_TEMPLATES = [
  {
    key: 'first_aid_box', label: 'First Aid Box Checklist', entity_type: 'asset',
    items: [
      'Band Aids', 'Sterile Gauze', 'Medical Tape', 'Elastic Bandage', 'Burn Dressing', 'Burn Gel',
      'Alcohol Swabs', 'Antiseptic Solution', 'Sterile Saline', 'Cotton Rolls', 'Eye Pads', 'Scissors',
      'Tweezers', 'Digital Thermometer', 'Disposable Gloves', 'Face Masks', 'CPR Shield',
      'Instant Cold Pack', 'Emergency Blanket', 'Flashlight', 'Emergency Contact Sheet',
      'Incident Register', 'Biohazard Waste Bags', 'Disposable Cups', 'Safety Pins', 'First Aid Manual',
    ].map((label, i) => ({ key: `item_${i + 1}`, label })),
  },
  {
    key: 'fire_extinguisher', label: 'Fire Extinguisher Checklist', entity_type: 'asset',
    items: ['Installed', 'Pressure OK', 'Pin Available', 'Inspection Sticker', 'Expiry Valid'].map((label, i) => ({ key: `item_${i + 1}`, label })),
  },
  {
    key: 'emergency_exit', label: 'Emergency Exit Checklist', entity_type: 'asset',
    items: ['Sign Installed', 'Visible', 'Lighting Working'].map((label, i) => ({ key: `item_${i + 1}`, label })),
  },
  {
    key: 'smoke_detector', label: 'Smoke Detector Checklist', entity_type: 'asset',
    items: ['Installed', 'Battery OK', 'Test Passed'].map((label, i) => ({ key: `item_${i + 1}`, label })),
  },
  {
    key: 'generator', label: 'Generator Checklist', entity_type: 'asset',
    items: ['Installed', 'Fuel Level OK', 'Starts Successfully', 'Oil Level OK', 'No Leaks'].map((label, i) => ({ key: `item_${i + 1}`, label })),
  },
  {
    key: 'electrical_panel', label: 'Electrical Panel Checklist', entity_type: 'asset',
    items: ['Panel Locked', 'Labeled Correctly', 'No Exposed Wiring', 'Breakers Functional'].map((label, i) => ({ key: `item_${i + 1}`, label })),
  },
  {
    key: 'ppe_kit', label: 'PPE Kit Checklist', entity_type: 'asset',
    items: ['Helmets Available', 'Vests Available', 'Gloves Available', 'Goggles Available', 'Undamaged'].map((label, i) => ({ key: `item_${i + 1}`, label })),
  },
  {
    key: 'safety_signage', label: 'Safety Signage Checklist', entity_type: 'asset',
    items: ['Installed', 'Legible', 'Correct Location', 'Not Damaged'].map((label, i) => ({ key: `item_${i + 1}`, label })),
  },
  {
    key: 'eye_wash_station', label: 'Eye Wash Station Checklist', entity_type: 'asset',
    items: ['Installed', 'Water Flow OK', 'Accessible', 'Not Expired'].map((label, i) => ({ key: `item_${i + 1}`, label })),
  },
  {
    key: 'ups', label: 'UPS Checklist', entity_type: 'asset',
    items: ['Installed', 'Battery Health OK', 'Load Test Passed', 'No Alarms'].map((label, i) => ({ key: `item_${i + 1}`, label })),
  },
  {
    key: 'cctv', label: 'CCTV Checklist', entity_type: 'asset',
    items: ['Installed', 'Recording', 'Lens Clear', 'Storage OK'].map((label, i) => ({ key: `item_${i + 1}`, label })),
  },
];

// Compliance Templates — each item references a category by *code* (resolved
// to category_id at seed time). Realistic enterprise defaults per office type.
function build_templates(cat) {
  return [
    {
      key: 'corporate_office', label: 'Corporate Office Template',
      description: 'Standard safety/compliance requirements for a corporate office floor',
      items: [
        { category_id: cat.fire_safety, required_quantity: 8 },
        { category_id: cat.first_aid, required_quantity: 2 },
        { category_id: cat.emergency, required_quantity: 12 }, // emergency lights
        { category_id: cat.security, required_quantity: 6 },  // CCTV/access control
        { category_id: cat.ppe, required_quantity: 1 },
        { category_id: cat.utilities, required_quantity: 2 }, // generator/UPS
      ],
    },
    {
      key: 'marketing_office', label: 'Marketing Office Template',
      description: 'Lighter-weight requirements for a small marketing office',
      items: [
        { category_id: cat.fire_safety, required_quantity: 3 },
        { category_id: cat.first_aid, required_quantity: 1 },
        { category_id: cat.emergency, required_quantity: 4 },
        { category_id: cat.security, required_quantity: 2 },
      ],
    },
    {
      key: 'warehouse', label: 'Warehouse Template',
      description: 'Higher fire/PPE/utilities requirements for a warehouse facility',
      items: [
        { category_id: cat.fire_safety, required_quantity: 15 },
        { category_id: cat.first_aid, required_quantity: 4 },
        { category_id: cat.emergency, required_quantity: 20 },
        { category_id: cat.security, required_quantity: 8 },
        { category_id: cat.ppe, required_quantity: 20 },
        { category_id: cat.environmental, required_quantity: 3 }, // gas/CO detectors
        { category_id: cat.utilities, required_quantity: 3 },
      ],
    },
    {
      key: 'software_house', label: 'Software House Template',
      description: 'Standard requirements for a software development office',
      items: [
        { category_id: cat.fire_safety, required_quantity: 6 },
        { category_id: cat.first_aid, required_quantity: 2 },
        { category_id: cat.emergency, required_quantity: 10 },
        { category_id: cat.security, required_quantity: 4 },
        { category_id: cat.utilities, required_quantity: 2 },
      ],
    },
  ];
}

export async function seed_compliance_sample_data(prisma) {
  const categories = await prisma.asset_categories.findMany({
    where: { code: { in: ['first_aid', 'fire_safety', 'emergency', 'security', 'ppe', 'environmental', 'utilities'] } },
  });
  const cat = {};
  for (const c of categories) cat[c.code] = c.id;
  if (Object.keys(cat).length < 7) {
    console.warn('[seed] Compliance sample data skipped — run the compliance categories seeder first.');
    return;
  }

  // Checklist Templates
  for (const t of CHECKLIST_TEMPLATES) {
    await prisma.checklist_templates.upsert({
      where: { key: t.key },
      update: {},
      create: { key: t.key, label: t.label, entity_type: t.entity_type, items: t.items },
    });
  }

  // Compliance Requirement Templates (v1 each)
  const templates = build_templates(cat);
  const created_templates = {};
  for (const t of templates) {
    const existing = await prisma.compliance_requirement_templates.findFirst({ where: { key: t.key }, orderBy: { version: 'desc' } });
    if (existing) { created_templates[t.key] = existing; continue; }
    created_templates[t.key] = await prisma.compliance_requirement_templates.create({
      data: { key: t.key, version: 1, label: t.label, description: t.description, items: t.items },
    });
  }

  // Sample offices — reuse existing locations where they match, create the
  // remaining example office types (Warehouse, Software House) if missing.
  const existing_locations = await prisma.asset_locations.findMany();
  const office_names = new Set(existing_locations.map((l) => l.office));

  const SAMPLE_OFFICES = [
    { office: 'Warehouse', floor: 'Ground Floor', room: 'Main Storage', business_unit: 'Operations', template_key: 'warehouse' },
    { office: 'Software House', floor: '2nd Floor', room: 'Engineering Bay', business_unit: 'ERP', template_key: 'software_house' },
  ];

  const applied = [];
  for (const o of SAMPLE_OFFICES) {
    let location = existing_locations.find((l) => l.office === o.office);
    if (!location) {
      location = await prisma.asset_locations.create({
        data: { office: o.office, floor: o.floor, room: o.room, business_unit: o.business_unit },
      });
    }
    const template = created_templates[o.template_key];
    for (const item of template.items) {
      const row = await prisma.compliance_requirements.upsert({
        where: { location_id_category_id: { location_id: location.id, category_id: item.category_id } },
        update: {},
        create: {
          location_id: location.id, category_id: item.category_id, required_quantity: item.required_quantity,
          applied_template_id: template.id, applied_template_version: template.version,
        },
      });
      applied.push(row);
    }
  }

  // Also apply Corporate Office / Marketing Office templates to the existing
  // "Marketing Office" location and one existing office as a stand-in
  // "Corporate Office", so pre-existing real locations get real requirements too.
  const marketing_location = existing_locations.find((l) => l.office === 'Marketing Office');
  if (marketing_location) {
    const template = created_templates['marketing_office'];
    for (const item of template.items) {
      const row = await prisma.compliance_requirements.upsert({
        where: { location_id_category_id: { location_id: marketing_location.id, category_id: item.category_id } },
        update: {},
        create: {
          location_id: marketing_location.id, category_id: item.category_id, required_quantity: item.required_quantity,
          applied_template_id: template.id, applied_template_version: template.version,
        },
      });
      applied.push(row);
    }
  }

  const operations_location = existing_locations.find((l) => l.office === 'Operations Office');
  if (operations_location) {
    const template = created_templates['corporate_office'];
    for (const item of template.items) {
      const row = await prisma.compliance_requirements.upsert({
        where: { location_id_category_id: { location_id: operations_location.id, category_id: item.category_id } },
        update: {},
        create: {
          location_id: operations_location.id, category_id: item.category_id, required_quantity: item.required_quantity,
          applied_template_id: template.id, applied_template_version: template.version,
        },
      });
      applied.push(row);
    }
  }

  console.log(`[seed] Compliance sample data: ${CHECKLIST_TEMPLATES.length} checklist templates, ${Object.keys(created_templates).length} compliance templates, ${applied.length} compliance requirements applied`);
}
