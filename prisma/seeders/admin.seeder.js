import bcrypt from 'bcryptjs';
import { ROLE_LEVELS, ROLE_NAMES } from '../../src/modules/admin/constants/roles.constants.js';

async function upsert_roles(prisma) {
  for (const [name, level] of Object.entries(ROLE_LEVELS)) {
    await prisma.roles.upsert({
      where: { name },
      update: { level, is_system: true },
      create: { name, level, is_system: true },
    });
  }
  console.log('[seed] Roles upserted');
}

async function upsert_departments(prisma) {
  const departments = [
    { name: 'Engineering', code: 'ENG', description: 'Software Engineering Department' },
    { name: 'Estimation', code: 'EST', description: 'Project Estimation Department' },
    { name: 'Marketing', code: 'MKT', description: 'Sales & Marketing Department' },
    { name: 'HR', code: 'HR', description: 'Human Resources Department' },
    { name: 'Operations', code: 'OPS', description: 'Operations Department' },
  ];

  const created = {};
  for (const dept of departments) {
    const d = await prisma.departments.upsert({
      where: { code: dept.code },
      update: { name: dept.name, description: dept.description },
      create: dept,
    });
    created[dept.code] = d.id;
  }

  // Engineering divisions
  const eng_divisions = [
    'Frontend Development', 'Backend Development', 'Mobile Development',
    'AI & DevOps', 'QA', 'UI/UX Design',
  ];
  for (const name of eng_divisions) {
    await prisma.divisions.upsert({
      where: { code: `ENG-${name.toUpperCase().replace(/[^A-Z]/g, '-').replace(/-+/g, '-').slice(0, 20)}` },
      update: { name },
      create: { name, code: `ENG-${name.toUpperCase().replace(/[^A-Z]/g, '-').replace(/-+/g, '-').slice(0, 20)}`, department_id: created['ENG'] },
    });
  }

  // Estimation divisions
  const est_divisions = [
    { name: 'Paint Team Australia', code: 'EST-PAINT-AUS' },
    { name: 'GC Team Australia', code: 'EST-GC-AUS' },
    { name: 'Hydro Team Australia', code: 'EST-HYDRO-AUS' },
    { name: 'GC Team United States', code: 'EST-GC-US' },
  ];
  for (const div of est_divisions) {
    await prisma.divisions.upsert({
      where: { code: div.code },
      update: { name: div.name },
      create: { ...div, department_id: created['EST'] },
    });
  }

  // Marketing divisions
  const mkt_divisions = ['Sales', 'Lead Generation', 'Account Management'];
  for (const name of mkt_divisions) {
    await prisma.divisions.upsert({
      where: { code: `MKT-${name.toUpperCase().replace(/\s/g, '-')}` },
      update: { name },
      create: { name, code: `MKT-${name.toUpperCase().replace(/\s/g, '-')}`, department_id: created['MKT'] },
    });
  }

  console.log('[seed] Departments & Divisions upserted');
  return created;
}

async function upsert_user(prisma, { email, password, firstName, lastName, roleName, department_id }) {
  if (!email || !password) {
    console.warn(`[seed] Skipped ${roleName}: missing email or password`);
    return null;
  }

  const role = await prisma.roles.findUnique({ where: { name: roleName } });
  if (!role) throw new Error(`[seed] Role not found: ${roleName}`);

  const existing = await prisma.users.findUnique({ where: { email } });
  let user;

  if (existing) {
    user = await prisma.users.update({
      where: { email },
      data: { first_name: firstName, last_name: lastName, is_active: true, department_id },
    });
  } else {
    user = await prisma.users.create({
      data: {
        email,
        password_hash: await bcrypt.hash(password, 12),
        first_name: firstName,
        last_name: lastName,
        status: 'ACTIVE',
        department_id,
      },
    });
  }

  const existing_role = await prisma.user_roles.findUnique({
    where: { user_id_role_id: { user_id: user.id, role_id: role.id } },
  });
  if (!existing_role) {
    await prisma.user_roles.create({ data: { user_id: user.id, role_id: role.id } });
  }

  const existing_settings = await prisma.user_settings.findUnique({ where: { user_id: user.id } });
  if (!existing_settings) {
    await prisma.user_settings.create({ data: { user_id: user.id } });
  }

  console.log(`[seed] Ensured ${roleName}: ${email}`);
  return user;
}

async function seed_time_off_policies(prisma) {
  const policies = [
    { name: 'Annual Leave', description: 'Paid annual vacation leave', days_allowed: 21 },
    { name: 'Sick Leave', description: 'Medical/sick leave', days_allowed: 10 },
    { name: 'Casual Leave', description: 'Short-notice personal leave', days_allowed: 7 },
    { name: 'Emergency Leave', description: 'Family emergency leave', days_allowed: 3 },
  ];

  for (const policy of policies) {
    const existing = await prisma.time_off_policies.findFirst({ where: { name: policy.name } });
    if (!existing) {
      await prisma.time_off_policies.create({ data: policy });
    }
  }
  console.log('[seed] Time-off policies seeded');
}

async function seed_asset_categories(prisma) {
  const categories = [
    { name: 'Laptop',                 code: 'LAPTOP',      is_device: true,  is_assignable: true,  sort_order: 1  },
    { name: 'Desktop',                code: 'DESKTOP',     is_device: true,  is_assignable: true,  sort_order: 2  },
    { name: 'Monitor',                code: 'MONITOR',     is_device: true,  is_assignable: true,  sort_order: 3  },
    { name: 'Keyboard',               code: 'KEYBOARD',    is_device: false, is_assignable: true,  sort_order: 4  },
    { name: 'Mouse',                  code: 'MOUSE',       is_device: false, is_assignable: true,  sort_order: 5  },
    { name: 'Headphones / Headset',   code: 'HEADPHONES',  is_device: false, is_assignable: true,  sort_order: 6  },
    { name: 'Mobile Phone',           code: 'MOBILE',      is_device: true,  is_assignable: true,  sort_order: 7  },
    { name: 'Tablet',                 code: 'TABLET',      is_device: true,  is_assignable: true,  sort_order: 8  },
    { name: 'Printer',                code: 'PRINTER',     is_device: true,  is_assignable: false, sort_order: 9  },
    { name: 'UPS',                    code: 'UPS',         is_device: false, is_assignable: false, sort_order: 10 },
    { name: 'Router / Networking',    code: 'ROUTER',      is_device: true,  is_assignable: false, sort_order: 11 },
    { name: 'Hard Disk / SSD',        code: 'STORAGE',     is_device: true,  is_assignable: true,  sort_order: 12 },
    { name: 'Camera / CCTV',          code: 'CAMERA',      is_device: true,  is_assignable: false, sort_order: 13 },
    { name: 'Office Chair',           code: 'CHAIR',       is_device: false, is_assignable: true,  sort_order: 14 },
    { name: 'Office Table / Desk',    code: 'DESK',        is_device: false, is_assignable: true,  sort_order: 15 },
    { name: 'Generator / Electrical', code: 'GENERATOR',   is_device: false, is_assignable: false, sort_order: 16 },
    { name: 'Misc Equipment',         code: 'MISC',        is_device: false, is_assignable: false, sort_order: 17 },
    { name: 'Other',                  code: 'OTHER',       is_device: false, is_assignable: false, sort_order: 99 },
  ];

  for (const cat of categories) {
    await prisma.asset_categories.upsert({
      where: { code: cat.code },
      update: { name: cat.name, is_device: cat.is_device, is_assignable: cat.is_assignable, sort_order: cat.sort_order, is_active: true },
      create: { ...cat, is_active: true },
    });
  }

  const locations = [
    { office: 'Marketing Office', floor: 'Ground Floor', room: 'Main Area' },
    { office: 'Marketing Office', floor: 'First Floor', room: 'Meeting Room' },
    { office: 'Operations Office', floor: 'Ground Floor', room: 'Frontend Bay' },
    { office: 'Operations Office', floor: 'Ground Floor', room: 'Backend Bay' },
    { office: 'Operations Office', floor: 'Second Floor', room: 'CEO Office' },
  ];

  for (const loc of locations) {
    const existing = await prisma.asset_locations.findFirst({ where: loc });
    if (!existing) await prisma.asset_locations.create({ data: loc });
  }

  console.log('[seed] Asset categories & locations seeded');
}

async function seed_bonus_config(prisma) {
  const configs = [
    { level_name: 'Outstanding',       min_score: 95, max_score: 100, bonus_amount: 20000 },
    { level_name: 'Excellent',          min_score: 85, max_score: 94,  bonus_amount: 15000 },
    { level_name: 'Good',               min_score: 75, max_score: 84,  bonus_amount: 10000 },
    { level_name: 'Average',            min_score: 50, max_score: 74,  bonus_amount: 5000  },
    { level_name: 'Needs Improvement',  min_score: 0,  max_score: 49,  bonus_amount: 0     },
  ];

  for (const c of configs) {
    const existing = await prisma.bonus_configurations.findFirst({ where: { level_name: c.level_name } });
    if (!existing) await prisma.bonus_configurations.create({ data: c });
  }
  console.log('[seed] Bonus configurations seeded');
}

export async function seedAdmin(prisma) {
  await upsert_roles(prisma);
  const dept_ids = await upsert_departments(prisma);

  // The canonical demo password used for all role demo users
  const DEMO_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';

  // Super Admin
  await upsert_user(prisma, {
    email: process.env.SEED_SUPER_ADMIN_EMAIL || 'superadmin@tekxai.com',
    password: DEMO_PASSWORD,
    firstName: process.env.SEED_SUPER_ADMIN_FIRST_NAME || 'Super',
    lastName: process.env.SEED_SUPER_ADMIN_LAST_NAME || 'Admin',
    roleName: ROLE_NAMES.SUPER_ADMIN,
    department_id: dept_ids['OPS'],
  });

  // Admin
  await upsert_user(prisma, {
    email: process.env.SEED_ADMIN_EMAIL || 'admin@tekxai.com',
    password: DEMO_PASSWORD,
    firstName: process.env.SEED_ADMIN_FIRST_NAME || 'System',
    lastName: process.env.SEED_ADMIN_LAST_NAME || 'Admin',
    roleName: ROLE_NAMES.ADMIN,
    department_id: dept_ids['OPS'],
  });

  // HR role demo user
  await upsert_user(prisma, {
    email: 'hr@tekxai.com',
    password: DEMO_PASSWORD,
    firstName: 'HR',
    lastName: 'Manager',
    roleName: ROLE_NAMES.HR,
    department_id: dept_ids['HR'],
  });

  // Division Manager demo user
  await upsert_user(prisma, {
    email: 'divmanager@tekxai.com',
    password: DEMO_PASSWORD,
    firstName: 'Division',
    lastName: 'Manager',
    roleName: ROLE_NAMES.DIVISION_MANAGER,
    department_id: dept_ids['ENG'],
  });

  // Marketing role demo user
  await upsert_user(prisma, {
    email: 'marketing@tekxai.com',
    password: DEMO_PASSWORD,
    firstName: 'Marketing',
    lastName: 'Lead',
    roleName: ROLE_NAMES.MARKETING,
    department_id: dept_ids['MKT'],
  });

  // Employee demo user
  await upsert_user(prisma, {
    email: process.env.SEED_EMPLOYEE_EMAIL || 'employee@tekxai.com',
    password: DEMO_PASSWORD,
    firstName: process.env.SEED_EMPLOYEE_FIRST_NAME || 'Demo',
    lastName: process.env.SEED_EMPLOYEE_LAST_NAME || 'Employee',
    roleName: ROLE_NAMES.EMPLOYEE,
    department_id: dept_ids['ENG'],
  });

  await seed_time_off_policies(prisma);
  await seed_asset_categories(prisma);
  await seed_bonus_config(prisma);

  console.log('[seed] All done');
}
