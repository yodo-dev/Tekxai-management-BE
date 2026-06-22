/**
 * Seeds: shifts, channels, contract templates, company policies, leave balances
 */

export async function seed_sample_data(prisma) {

  // ── Shifts ────────────────────────────────────────────────────────────────
  const shift = await prisma.shifts.upsert({
    where: { id: 'shift_default_001' },
    update: {},
    create: {
      id: 'shift_default_001',
      name: 'Standard (9AM–6PM)',
      start_time: '09:00',
      end_time: '18:00',
      grace_period_min: 15,
      is_default: true,
    },
  });
  console.log('[seed] shifts ✅');

  // ── Chat Channels ─────────────────────────────────────────────────────────
  const default_channels = [
    { id: 'chan_general_001',   name: 'general',     description: 'Company-wide announcements' },
    { id: 'chan_dev_001',       name: 'development', description: 'Engineering discussions' },
    { id: 'chan_design_001',    name: 'design',      description: 'Design team' },
    { id: 'chan_marketing_001', name: 'marketing',   description: 'Marketing team' },
    { id: 'chan_hr_001',        name: 'hr',          description: 'HR announcements' },
  ];
  for (const ch of default_channels) {
    await prisma.channels.upsert({
      where: { id: ch.id },
      update: {},
      create: { ...ch, type: 'PUBLIC' },
    });
  }
  console.log('[seed] channels ✅');

  // ── Contract Templates ────────────────────────────────────────────────────
  await prisma.contract_templates.upsert({
    where: { id: 'tmpl_employment_001' },
    update: {},
    create: {
      id: 'tmpl_employment_001',
      name: 'Standard Employment Contract',
      type: 'EMPLOYMENT',
      content: `EMPLOYMENT AGREEMENT

This Employment Agreement ("Agreement") is entered into as of {{start_date}}, between Tekxai ("Company") and {{employee_name}} ("Employee").

1. POSITION
   Employee agrees to serve in the position of {{position}}.

2. COMPENSATION
   Employee shall receive a salary of PKR {{salary}} per month.

3. TERM
   This Agreement shall commence on {{start_date}} and continue until terminated by either party.

4. DUTIES
   Employee agrees to perform all duties as assigned by the Company.

5. CONFIDENTIALITY
   Employee agrees to maintain strict confidentiality of all Company information.

IN WITNESS WHEREOF, the parties have executed this Agreement.`,
      placeholders: ['employee_name', 'start_date', 'position', 'salary'],
      is_active: true,
    },
  });

  await prisma.contract_templates.upsert({
    where: { id: 'tmpl_nda_001' },
    update: {},
    create: {
      id: 'tmpl_nda_001',
      name: 'Non-Disclosure Agreement (NDA)',
      type: 'NDA',
      content: `NON-DISCLOSURE AGREEMENT

This NDA is entered into between Tekxai ("Company") and {{employee_name}} ("Recipient") as of {{date}}.

The Recipient agrees to hold all Confidential Information in strict confidence and not to disclose it to any third parties.

This agreement shall remain in effect for a period of 2 years after employment ends.`,
      placeholders: ['employee_name', 'date'],
      is_active: true,
    },
  });
  console.log('[seed] contract_templates ✅');

  // ── Company Policies ──────────────────────────────────────────────────────
  const policies = [
    {
      id: 'policy_leave_001',
      title: 'Annual Leave Policy',
      category: 'LEAVE',
      content: 'Employees are entitled to 21 days of annual leave per calendar year. Leave must be applied at least 3 days in advance except for emergencies.',
      version: '1.0',
      is_mandatory: true,
      is_published: true,
      published_at: new Date(),
    },
    {
      id: 'policy_attendance_001',
      title: 'Attendance & Punctuality Policy',
      category: 'ATTENDANCE',
      content: 'Employees are expected to report by 9:00 AM. A grace period of 15 minutes applies. Three late arrivals in a month will be escalated to HR.',
      version: '1.0',
      is_mandatory: true,
      is_published: true,
      published_at: new Date(),
    },
    {
      id: 'policy_equipment_001',
      title: 'Equipment & Asset Policy',
      category: 'EQUIPMENT',
      content: 'Company equipment assigned to employees must be used for work purposes only. Employees are responsible for the care and maintenance of assigned equipment.',
      version: '1.0',
      is_mandatory: false,
      is_published: true,
      published_at: new Date(),
    },
  ];

  for (const policy of policies) {
    await prisma.company_policies.upsert({
      where: { id: policy.id },
      update: {},
      create: policy,
    });
  }
  console.log('[seed] company_policies ✅');

  // ── Bonus Configurations ──────────────────────────────────────────────────
  const bonus_configs = [
    { id: 'bonus_outstanding', min_score: 95, max_score: 100, level_name: 'Outstanding',       bonus_amount: 20000, is_active: true },
    { id: 'bonus_excellent',   min_score: 85, max_score: 94,  level_name: 'Excellent',          bonus_amount: 15000, is_active: true },
    { id: 'bonus_good',        min_score: 75, max_score: 84,  level_name: 'Good',               bonus_amount: 10000, is_active: true },
    { id: 'bonus_average',     min_score: 50, max_score: 74,  level_name: 'Average',            bonus_amount: 5000,  is_active: true },
    { id: 'bonus_needs_imp',   min_score: 0,  max_score: 49,  level_name: 'Needs Improvement',  bonus_amount: 0,     is_active: true },
  ];
  for (const cfg of bonus_configs) {
    await prisma.bonus_configurations.upsert({
      where: { id: cfg.id },
      update: {},
      create: cfg,
    });
  }
  console.log('[seed] bonus_configurations ✅');
}
