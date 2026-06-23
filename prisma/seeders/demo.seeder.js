import bcrypt from 'bcryptjs';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function random_int(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function days_ago(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function date_at(year, month, day) {
  return new Date(year, month - 1, day);
}

// Return a Date for a specific date with a specific HH:MM time
function date_time(base_date, hh, mm) {
  const d = new Date(base_date);
  d.setHours(hh, mm, 0, 0);
  return d;
}

// Generate weekday dates for the past `n_days` calendar days
function past_weekdays(n_days) {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 1; i <= n_days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dow = d.getDay(); // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) dates.push(d);
  }
  return dates;
}

// ─── 1. Departments ───────────────────────────────────────────────────────────

async function seed_demo_departments(prisma) {
  const depts = [
    { name: 'Design',               code: 'DESIGN',   description: 'Creative & UI/UX Design' },
    { name: 'Frontend Development', code: 'FE-DEV',   description: 'Frontend Engineering' },
    { name: 'Backend Development',  code: 'BE-DEV',   description: 'Backend Engineering' },
    { name: 'App Development',      code: 'APP-DEV',  description: 'Mobile App Development' },
    { name: 'AI & DevOps',          code: 'AI-DEVOPS',description: 'AI Engineering & DevOps' },
    { name: 'CMS',                  code: 'CMS',      description: 'Content Management' },
    { name: 'Marketing',            code: 'MKT-DEMO', description: 'Marketing & Business Development' },
    { name: 'HR & Operations',      code: 'HR-OPS',   description: 'Human Resources & Operations' },
    { name: 'Management',           code: 'MGMT',     description: 'Executive Management' },
  ];

  const map = {};
  for (const dept of depts) {
    const d = await prisma.departments.upsert({
      where: { code: dept.code },
      update: { name: dept.name, description: dept.description },
      create: dept,
    });
    map[dept.code] = d.id;
  }
  console.log('[demo] Departments upserted');
  return map;
}

// ─── 2. Employees ─────────────────────────────────────────────────────────────

const DEMO_PASSWORD = 'SuperAdmin@123';

// Build employee data list referencing dept_codes
function build_employees(dept_map) {
  const employees = [
    // ── DESIGN ──
    { email: 'sharjeel-khalid@tekxai.ca', first: 'Sharjeel',   last: 'Khalid',   dept: 'DESIGN',   designation: 'Senior Designer',         hire: '2023-03-01', base: 195000, fuel: 8000,  role: 'EMPLOYEE' },
    { email: 'zohair-ajmal@tekxai.ca',    first: 'Zohair',     last: 'Ajmal',    dept: 'DESIGN',   designation: 'Designer',                hire: '2024-12-01', base: 155000, fuel: 8000,  role: 'EMPLOYEE' },
    { email: 'naveed-ilyas@tekxai.ca',    first: 'Naveed',     last: 'Ilyas',    dept: 'DESIGN',   designation: 'Designer',                hire: '2025-06-01', base: 140000, fuel: 10000, role: 'EMPLOYEE' },
    { email: 'aiman@tekxai.ca',           first: 'Mohammad',   last: 'Aiman',    dept: 'DESIGN',   designation: 'Designer',                hire: '2024-08-01', base: 140000, fuel: 8000,  role: 'EMPLOYEE' },
    { email: 'amir-latif@tekxai.ca',      first: 'Amir',       last: 'Latif',    dept: 'DESIGN',   designation: 'Junior Designer',         hire: '2025-06-01', base: 96000,  fuel: 8000,  role: 'EMPLOYEE' },
    { email: 'm-muzammal@tekxai.ca',      first: 'Mohammad',   last: 'Muzammal', dept: 'DESIGN',   designation: 'Designer',                hire: '2025-01-01', base: 85000,  fuel: 10000, role: 'EMPLOYEE' },
    { email: 'awais-khalid@tekxai.ca',    first: 'Awais',      last: 'Khalid',   dept: 'DESIGN',   designation: 'Junior Designer',         hire: '2025-08-01', base: 80000,  fuel: 8000,  role: 'EMPLOYEE' },
    { email: 'ahmed-masood@tekxai.ca',    first: 'Ahmed',      last: 'Masood',   dept: 'DESIGN',   designation: 'Designer Intern',         hire: '2025-06-01', base: 50000,  fuel: 10000, role: 'EMPLOYEE' },
    // ── FRONTEND ──
    { email: 'muneeb-saleem@tekxai.ca',        first: 'Muneeb',    last: 'Saleem',      dept: 'FE-DEV', designation: 'Senior Frontend Developer', hire: '2025-08-01', base: 235000, fuel: 0,     role: 'EMPLOYEE' },
    { email: 'hafiz-azeem@tekxai.ca',           first: 'Hafiz',     last: 'Azeem',       dept: 'FE-DEV', designation: 'Senior Frontend Developer', hire: '2025-07-01', base: 225000, fuel: 10000, role: 'EMPLOYEE' },
    { email: 'moazzam-ali@tekxai.ca',           first: 'Moazzam',   last: 'Ali',         dept: 'FE-DEV', designation: 'Frontend Developer',        hire: '2025-05-01', base: 220000, fuel: 10000, role: 'EMPLOYEE' },
    { email: 'muzammill-ali-khan@tekxai.ca',    first: 'Muzammil',  last: 'Ali Khan',    dept: 'FE-DEV', designation: 'Frontend Developer',        hire: '2025-07-01', base: 180000, fuel: 10000, role: 'EMPLOYEE' },
    { email: 'amjad-hussain@tekxai.ca',         first: 'Amjad',     last: 'Hussain',     dept: 'FE-DEV', designation: 'Frontend Developer',        hire: '2024-11-01', base: 150000, fuel: 4000,  role: 'EMPLOYEE' },
    { email: 'm-sohail@tekxai.ca',              first: 'Muhammad',  last: 'Sohail',      dept: 'FE-DEV', designation: 'Junior Frontend Developer', hire: '2025-08-01', base: 130000, fuel: 10000, role: 'EMPLOYEE' },
    { email: 'ahmed-nadeem@tekxai.ca',          first: 'Ahmed',     last: 'Nadeem',      dept: 'FE-DEV', designation: 'Junior Frontend Developer', hire: '2025-08-01', base: 91000,  fuel: 8000,  role: 'EMPLOYEE' },
    // ── BACKEND ──
    { email: 'suleman-faheem@tekxai.ca',        first: 'Suleman',   last: 'Faheem',      dept: 'BE-DEV', designation: 'Backend Developer',   hire: '2025-09-01', base: 160000, fuel: 8000,  role: 'EMPLOYEE' },
    { email: 'm-abdullah-shahzad@tekxai.ca',    first: 'Muhammad',  last: 'Abdullah Shahzad', dept: 'BE-DEV', designation: 'Backend Developer', hire: '2025-08-01', base: 115000, fuel: 8000, role: 'EMPLOYEE' },
    // ── APP DEV ──
    { email: 'naveed@tekxai.ca',     first: 'Naveed',    last: '',       dept: 'APP-DEV',  designation: 'Lead App Developer',    hire: '2020-03-01', base: 225000, fuel: 0,     role: 'EMPLOYEE' },
    { email: 'm-junaid@tekxai.ca',   first: 'Muhammad',  last: 'Junaid', dept: 'APP-DEV',  designation: 'App Developer',         hire: '2025-09-01', base: 196000, fuel: 10000, role: 'EMPLOYEE' },
    // ── AI & DEVOPS ──
    { email: 'saad@tekxai.ca',   first: 'Saad',   last: '',    dept: 'AI-DEVOPS', designation: 'AI Engineer',     hire: '2020-03-01', base: 225000, fuel: 0,    role: 'EMPLOYEE' },
    { email: 'm-bilal@tekxai.ca',first: 'Bilal',  last: '',    dept: 'AI-DEVOPS', designation: 'DevOps Engineer', hire: '2023-10-01', base: 75000,  fuel: 5000, role: 'EMPLOYEE' },
    // ── CMS ──
    { email: 'tanzeel@tekxai.ca',    first: 'Tanzeel', last: '',       dept: 'CMS', designation: 'CMS Lead',    hire: '2020-04-01', base: 200000, fuel: 0,     role: 'EMPLOYEE' },
    { email: 'farhan@tekxai.ca',     first: 'M',       last: 'Farhan', dept: 'CMS', designation: 'CMS Manager', hire: '2024-09-01', base: 396000, fuel: 4000,  role: 'EMPLOYEE' },
    { email: 'zia@tekxai.ca',        first: 'Zia',     last: '',       dept: 'CMS', designation: 'CMS Lead',    hire: '2022-10-01', base: 250000, fuel: 14000, role: 'ADMIN' },
    { email: 'bilal-hr@tekxai.ca',   first: 'Bilal',   last: 'HR',     dept: 'CMS', designation: 'HR Manager',  hire: '2024-10-01', base: 150000, fuel: 5000,  role: 'HR' },
    // ── HR & OPS ──
    { email: 'mubasharfarooq@tekxai.ca', first: 'Mubbashar', last: 'Farooq',        dept: 'HR-OPS', designation: 'Operations Manager',   hire: '2024-08-01', base: 120000, fuel: 8000,  food: 4000, role: 'EMPLOYEE' },
    { email: 'arslan-dar@tekxai.ca',     first: 'Arsalan',   last: 'Dar',           dept: 'HR-OPS', designation: 'Operations Executive', hire: '2025-04-01', base: 85000,  fuel: 10000, role: 'EMPLOYEE' },
    { email: 'mohib@tekxai.ca',          first: 'Mohib',     last: '',              dept: 'HR-OPS', designation: 'Operations Executive', base: 70000,  fuel: 10000, role: 'EMPLOYEE' },
    { email: 'ayan@tekxai.ca',           first: 'Ayan',      last: '',              dept: 'HR-OPS', designation: 'Operations Executive', base: 70000,  fuel: 10000, role: 'EMPLOYEE' },
    { email: 'mustafa@tekxai.ca',        first: 'Mustafa',   last: '',              dept: 'HR-OPS', designation: 'Office Assistant',     base: 40000,  fuel: 10000, role: 'EMPLOYEE' },
    { email: 'ali-waris@tekxai.ca',      first: 'Ali',       last: 'Waris',         dept: 'HR-OPS', designation: 'Operations Manager',   base: 100000, fuel: 10000, role: 'EMPLOYEE' },
    { email: 'mahnoor@tekxai.ca',        first: 'Mahnoor',   last: 'Abdul Razzaq',  dept: 'HR-OPS', designation: 'HR Executive',         base: 50000,  fuel: 0,     role: 'HR' },
    { email: 'rehmat@tekxai.ca',         first: 'Rehmat',    last: '',              dept: 'HR-OPS', designation: 'Peon',                 base: 20000,  fuel: 0,     role: 'EMPLOYEE' },
    { email: 'rohaan@tekxai.ca',         first: 'Rohaan',    last: '',              dept: 'HR-OPS', designation: 'Executive',            base: 70000,  fuel: 10000, role: 'EMPLOYEE' },
    // ── MARKETING ──
    { email: 'abu-bakar@tekxai.ca',    first: 'Abu',     last: 'Bakar',   dept: 'MKT-DEMO', designation: 'Business Development Executive', base: 40000, fuel: 5000,  role: 'MARKETING' },
    { email: 'amjad-pervaiz@tekxai.ca',first: 'Amjad',   last: 'Pervaiz', dept: 'MKT-DEMO', designation: 'Marketing Executive',           base: 42000, fuel: 10000, role: 'MARKETING' },
    { email: 'abdullah@tekxai.ca',     first: 'Abdullah',last: '',        dept: 'MKT-DEMO', designation: 'Marketing Executive',           base: 48000, fuel: 4000,  role: 'MARKETING' },
    { email: 'ali@tekxai.ca',          first: 'Ali',     last: '',        dept: 'MKT-DEMO', designation: 'Marketing Executive',           base: 50000, fuel: 0,     role: 'MARKETING' },
  ];

  return employees.map(e => ({ ...e, dept_id: dept_map[e.dept] }));
}

async function seed_demo_employees(prisma, dept_map) {
  const employees = build_employees(dept_map);
  const password_hash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const user_map = {}; // email -> user record

  for (const emp of employees) {
    // Find role id
    const role = await prisma.roles.findUnique({ where: { name: emp.role } });
    if (!role) {
      console.warn(`[demo] Role ${emp.role} not found, skipping ${emp.email}`);
      continue;
    }

    const hire_date = emp.hire ? new Date(emp.hire) : null;

    // Upsert user
    let user = await prisma.users.findUnique({ where: { email: emp.email } });
    if (!user) {
      user = await prisma.users.create({
        data: {
          email: emp.email,
          password_hash,
          first_name: emp.first,
          last_name: emp.last || null,
          designation: emp.designation,
          department_id: emp.dept_id,
          hire_date,
          status: 'ACTIVE',
          is_active: true,
          business_unit: 'ERP',
        },
      });
    } else {
      user = await prisma.users.update({
        where: { email: emp.email },
        data: {
          first_name: emp.first,
          last_name: emp.last || null,
          designation: emp.designation,
          department_id: emp.dept_id,
          hire_date: hire_date || user.hire_date,
          status: 'ACTIVE',
          is_active: true,
        },
      });
    }

    // User role
    const existing_role = await prisma.user_roles.findUnique({
      where: { user_id_role_id: { user_id: user.id, role_id: role.id } },
    });
    if (!existing_role) {
      await prisma.user_roles.create({ data: { user_id: user.id, role_id: role.id } });
    }

    // User settings
    const existing_settings = await prisma.user_settings.findUnique({ where: { user_id: user.id } });
    if (!existing_settings) {
      await prisma.user_settings.create({ data: { user_id: user.id } });
    }

    // Employee profile
    const gross = emp.base + (emp.fuel || 0) + (emp.food || 0);
    await prisma.employee_profiles.upsert({
      where: { user_id: user.id },
      update: {
        base_salary: emp.base,
        gross_salary: gross,
        employment_type: 'FULL_TIME',
        employment_status: 'ACTIVE',
        profile_status: 'ACTIVE',
        work_mode: 'ONSITE',
        salary_currency: 'PKR',
        pay_frequency: 'MONTHLY',
        working_days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        work_start: '09:00',
        work_end: '18:00',
      },
      create: {
        user_id: user.id,
        base_salary: emp.base,
        gross_salary: gross,
        employment_type: 'FULL_TIME',
        employment_status: 'ACTIVE',
        profile_status: 'ACTIVE',
        work_mode: 'ONSITE',
        salary_currency: 'PKR',
        pay_frequency: 'MONTHLY',
        working_days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        work_start: '09:00',
        work_end: '18:00',
        nationality: 'Pakistani',
        blood_group: ['A+', 'B+', 'O+', 'AB+'][random_int(0, 3)],
        gender: 'MALE',
        office_branch: 'Main Office',
        work_location: 'Lahore',
      },
    });

    user_map[emp.email] = { ...user, base_salary: emp.base, fuel: emp.fuel || 0, food: emp.food || 0, designation: emp.designation, dept_code: emp.dept };
    console.log(`[demo] Seeded employee: ${emp.email}`);
  }

  return user_map;
}

// ─── 3. Leave Balances ────────────────────────────────────────────────────────

async function seed_leave_balances(prisma, user_map) {
  // Get policies
  const annual = await prisma.time_off_policies.findFirst({ where: { name: 'Annual Leave' } });
  const sick   = await prisma.time_off_policies.findFirst({ where: { name: 'Sick Leave' } });
  const casual = await prisma.time_off_policies.findFirst({ where: { name: 'Casual Leave' } });

  if (!annual) {
    console.warn('[demo] time_off_policies not seeded yet — skipping leave balances');
    return;
  }

  const year = new Date().getFullYear();

  for (const [email, user] of Object.entries(user_map)) {
    const used = random_int(0, 15);
    const remaining = Math.max(0, 21 - used);

    // Annual
    await prisma.leave_balances.upsert({
      where: { user_id_policy_id_year: { user_id: user.id, policy_id: annual.id, year } },
      update: { total_days: 21, used_days: used, pending_days: 0, remaining_days: remaining },
      create: { user_id: user.id, policy_id: annual.id, year, total_days: 21, used_days: used, pending_days: 0, remaining_days: remaining },
    });

    if (sick) {
      const s_used = random_int(0, 5);
      await prisma.leave_balances.upsert({
        where: { user_id_policy_id_year: { user_id: user.id, policy_id: sick.id, year } },
        update: { total_days: 10, used_days: s_used, pending_days: 0, remaining_days: Math.max(0, 10 - s_used) },
        create: { user_id: user.id, policy_id: sick.id, year, total_days: 10, used_days: s_used, pending_days: 0, remaining_days: Math.max(0, 10 - s_used) },
      });
    }

    if (casual) {
      const c_used = random_int(0, 4);
      await prisma.leave_balances.upsert({
        where: { user_id_policy_id_year: { user_id: user.id, policy_id: casual.id, year } },
        update: { total_days: 7, used_days: c_used, pending_days: 0, remaining_days: Math.max(0, 7 - c_used) },
        create: { user_id: user.id, policy_id: casual.id, year, total_days: 7, used_days: c_used, pending_days: 0, remaining_days: Math.max(0, 7 - c_used) },
      });
    }
  }

  console.log('[demo] Leave balances seeded');
}

// ─── 4. Timesheet Entries & Violations ───────────────────────────────────────

async function seed_timesheets(prisma, user_map) {
  const all_users = Object.values(user_map);
  // Pick first 15 users for timesheet data
  const target_users = all_users.slice(0, 15);

  const weekdays = past_weekdays(90); // ~3 months of weekdays

  const entry_refs = []; // { user_id, date, check_in, is_late, late_mins }

  for (const user of target_users) {
    for (const date of weekdays) {
      // Randomly skip some days (leave / absent)
      const skip_chance = Math.random();
      if (skip_chance < 0.05) continue; // 5% absent days

      // Determine attendance pattern
      const pattern_roll = Math.random();
      let check_in_h, check_in_m, check_out_h, check_out_m, is_wfh, missing_checkout;

      if (pattern_roll < 0.55) {
        // On time
        check_in_h = 8; check_in_m = random_int(45, 60) % 60;
        if (check_in_m === 60) { check_in_h = 9; check_in_m = 0; }
        check_out_h = 18; check_out_m = random_int(0, 30);
        is_wfh = false; missing_checkout = false;
      } else if (pattern_roll < 0.65) {
        // WFH
        check_in_h = 9; check_in_m = random_int(0, 10);
        check_out_h = 18; check_out_m = random_int(0, 45);
        is_wfh = true; missing_checkout = false;
      } else if (pattern_roll < 0.75) {
        // Slightly late (within grace 9:16–9:30)
        check_in_h = 9; check_in_m = random_int(16, 30);
        check_out_h = 18; check_out_m = random_int(15, 45);
        is_wfh = false; missing_checkout = false;
      } else if (pattern_roll < 0.82) {
        // Late after 11:15
        check_in_h = 11; check_in_m = random_int(15, 29);
        check_out_h = 19; check_out_m = random_int(0, 30);
        is_wfh = false; missing_checkout = false;
      } else if (pattern_roll < 0.88) {
        // Very late after 11:30
        check_in_h = 11; check_in_m = random_int(30, 59);
        check_out_h = 20; check_out_m = random_int(0, 30);
        is_wfh = false; missing_checkout = false;
      } else if (pattern_roll < 0.93) {
        // Missing checkout
        check_in_h = 9; check_in_m = random_int(0, 15);
        check_out_h = null; check_out_m = null;
        is_wfh = false; missing_checkout = true;
      } else {
        // Late + missing checkout
        check_in_h = 10; check_in_m = random_int(0, 59);
        check_out_h = null; check_out_m = null;
        is_wfh = false; missing_checkout = true;
      }

      const check_in = date_time(date, check_in_h, check_in_m);
      const check_out = (!missing_checkout && check_out_h !== null)
        ? date_time(date, check_out_h, check_out_m)
        : null;

      const duration_sec = check_out
        ? Math.floor((check_out.getTime() - check_in.getTime()) / 1000)
        : 0;

      // Check for existing entry for this user on this day to maintain idempotency
      const day_start = new Date(date); day_start.setHours(0, 0, 0, 0);
      const day_end   = new Date(date); day_end.setHours(23, 59, 59, 999);

      const existing = await prisma.timesheet_entries.findFirst({
        where: { user_id: user.id, check_in: { gte: day_start, lte: day_end } },
      });

      let entry;
      if (!existing) {
        entry = await prisma.timesheet_entries.create({
          data: {
            user_id: user.id,
            check_in,
            check_out,
            duration_sec,
            status: check_out ? 'COMPLETED' : 'IN_PROGRESS',
            is_wfh,
          },
        });
      } else {
        entry = existing;
      }

      // Track late arrivals for violations
      const shift_start_h = 9, shift_start_m = 0, grace_mins = 15;
      const shift_start_mins = shift_start_h * 60 + shift_start_m;
      const check_in_total_mins = check_in_h * 60 + check_in_m;
      const late_mins = check_in_total_mins - (shift_start_mins + grace_mins);

      if (late_mins > 0) {
        entry_refs.push({ user_id: user.id, entry_id: entry.id, date, late_mins });
      }
    }
  }

  console.log('[demo] Timesheet entries seeded');
  return entry_refs;
}

// ─── 5. Attendance Violations ─────────────────────────────────────────────────

async function seed_violations(prisma, entry_refs) {
  for (const ref of entry_refs) {
    // Idempotent: check existing violation for this user+date
    const existing = await prisma.attendance_violations.findFirst({
      where: { user_id: ref.user_id, date: { gte: new Date(ref.date.setHours(0,0,0,0)), lte: new Date(ref.date.setHours(23,59,59,999)) }, violation_type: 'LATE' },
    });
    if (!existing) {
      await prisma.attendance_violations.create({
        data: {
          user_id: ref.user_id,
          entry_id: ref.entry_id,
          date: ref.date,
          violation_type: 'LATE',
          late_mins: ref.late_mins,
          remarks: `Late check-in by ${ref.late_mins} minutes`,
        },
      });
    }
  }
  console.log('[demo] Attendance violations seeded');
}

// ─── 6. Time Off Requests ─────────────────────────────────────────────────────

async function seed_time_off_requests(prisma, user_map) {
  const annual = await prisma.time_off_policies.findFirst({ where: { name: 'Annual Leave' } });
  const sick   = await prisma.time_off_policies.findFirst({ where: { name: 'Sick Leave' } });
  const casual = await prisma.time_off_policies.findFirst({ where: { name: 'Casual Leave' } });

  if (!annual) { console.warn('[demo] No leave policies found, skipping time-off requests'); return; }

  const all_users = Object.values(user_map);
  const target_users = all_users.slice(0, 10);

  const scenarios = [
    { policy: annual, leave_type: 'ANNUAL',  status: 'APPROVED',  days: 2, mon_start: true,  fri_end: false },
    { policy: sick,   leave_type: 'SICK',    status: 'APPROVED',  days: 1, mon_start: false, fri_end: false },
    { policy: casual, leave_type: 'CASUAL',  status: 'PENDING',   days: 1, mon_start: false, fri_end: true  },
    { policy: annual, leave_type: 'ANNUAL',  status: 'REJECTED',  days: 3, mon_start: true,  fri_end: true  },
    { policy: sick,   leave_type: 'SICK',    status: 'APPROVED',  days: 1, mon_start: false, fri_end: false },
    { policy: casual, leave_type: 'CASUAL',  status: 'PENDING',   days: 1, mon_start: false, fri_end: false },
    { policy: annual, leave_type: 'ANNUAL',  status: 'APPROVED',  days: 5, mon_start: true,  fri_end: true  },
    { policy: sick,   leave_type: 'SICK',    status: 'PENDING',   days: 2, mon_start: false, fri_end: false },
    { policy: casual, leave_type: 'CASUAL',  status: 'APPROVED',  days: 1, mon_start: false, fri_end: false },
    { policy: annual, leave_type: 'ANNUAL',  status: 'REJECTED',  days: 1, mon_start: false, fri_end: true  },
  ];

  for (let i = 0; i < target_users.length; i++) {
    const user = target_users[i];
    const sc = scenarios[i % scenarios.length];
    if (!sc.policy) continue;

    // Start: find a Monday or any weekday ~30 days ago
    const offset = 20 + i * 4;
    const start = days_ago(offset);
    // Move to next Monday if mon_start requested
    if (sc.mon_start) {
      while (start.getDay() !== 1) start.setDate(start.getDate() + 1);
    }
    const end = new Date(start);
    end.setDate(start.getDate() + sc.days - 1);
    if (sc.fri_end) {
      while (end.getDay() !== 5) end.setDate(end.getDate() + 1);
    }

    const existing = await prisma.time_off_requests.findFirst({
      where: { user_id: user.id, start_date: start, policy_id: sc.policy.id },
    });

    if (!existing) {
      await prisma.time_off_requests.create({
        data: {
          user_id: user.id,
          policy_id: sc.policy.id,
          leave_type: sc.leave_type,
          start_date: start,
          end_date: end,
          days: sc.days,
          reason: `Demo ${sc.leave_type.toLowerCase()} leave request`,
          status: sc.status,
          is_monday_start: sc.mon_start,
          is_friday_end: sc.fri_end,
          is_sandwich: sc.mon_start && sc.fri_end,
          effective_days: sc.days,
        },
      });
    }
  }

  console.log('[demo] Time-off requests seeded');
}

// ─── 7. Overtime Requests ─────────────────────────────────────────────────────

async function seed_overtime_requests(prisma, user_map) {
  const all_users = Object.values(user_map);
  const target_users = all_users.slice(3, 8); // 5 users

  const scenarios = [
    { status: 'PENDING',  duration: 120, reason: 'Urgent client delivery',  start: '18:00', end: '20:00' },
    { status: 'APPROVED', duration: 180, reason: 'Sprint deadline crunch',   start: '18:00', end: '21:00' },
    { status: 'REJECTED', duration: 90,  reason: 'System maintenance',       start: '19:00', end: '20:30' },
    { status: 'APPROVED', duration: 150, reason: 'Production hotfix',        start: '18:30', end: '21:00' },
    { status: 'PENDING',  duration: 60,  reason: 'Client demo preparation',  start: '18:00', end: '19:00' },
  ];

  for (let i = 0; i < target_users.length; i++) {
    const user = target_users[i];
    const sc = scenarios[i];
    const date = days_ago(5 + i * 3);
    date.setHours(0, 0, 0, 0);

    const existing = await prisma.overtime_requests.findFirst({
      where: { user_id: user.id, date },
    });

    if (!existing) {
      const eligible = user.base_salary < 200000;
      await prisma.overtime_requests.create({
        data: {
          user_id: user.id,
          date,
          start_time: sc.start,
          end_time: sc.end,
          duration_minutes: sc.duration,
          reason: sc.reason,
          status: sc.status,
          eligible_for_overtime: eligible,
          eligibility_reason: eligible ? null : 'Salary above overtime threshold',
          approved_minutes: sc.status === 'APPROVED' ? sc.duration : null,
          approved_amount: sc.status === 'APPROVED' ? Math.round((user.base_salary / 192) * 1.5 * (sc.duration / 60)) : null,
          submitted_same_day: true,
        },
      });
    }
  }

  console.log('[demo] Overtime requests seeded');
}

// ─── 8. Salary Increments ─────────────────────────────────────────────────────

async function seed_salary_increments(prisma, user_map) {
  // Pick senior/older employees: those with hire_date in 2020-2023
  const seniors = Object.values(user_map).filter(u => {
    if (!u.hire_date) return false;
    const hire_year = new Date(u.hire_date).getFullYear();
    return hire_year <= 2023;
  }).slice(0, 5);

  for (let i = 0; i < seniors.length; i++) {
    const user = seniors[i];
    const prev = user.base_salary;
    const man_pct = 5, perf_pct = 10, reg_pct = 3, punc_pct = 2;
    const total_pct = man_pct + perf_pct + reg_pct + punc_pct;
    const increment_amt = Math.round((prev * total_pct) / 100);
    const new_salary = prev + increment_amt;
    const hire_year = new Date(user.hire_date).getFullYear();
    const status = hire_year <= 2022 ? 'APPROVED' : 'DRAFT';

    const existing = await prisma.salary_increments.findFirst({
      where: { user_id: user.id, review_year: 2025 },
    });

    if (!existing) {
      await prisma.salary_increments.create({
        data: {
          user_id: user.id,
          review_year: 2025,
          review_period: '2025-01 to 2025-12',
          effective_date: new Date('2026-01-01'),
          previous_salary: prev,
          mandatory_pct: man_pct,
          performance_pct: perf_pct,
          regularity_pct: reg_pct,
          punctuality_pct: punc_pct,
          total_pct,
          increment_amount: increment_amt,
          new_salary,
          status,
          performance_score_snapshot: random_int(75, 95),
          leave_count_snapshot: random_int(2, 8),
          latecoming_count_snapshot: random_int(1, 10),
          regularity_eligible: true,
          punctuality_eligible: true,
        },
      });
    }
  }

  console.log('[demo] Salary increments seeded');
}

// ─── 9. Projects ──────────────────────────────────────────────────────────────

async function seed_projects(prisma, user_map) {
  const users = Object.values(user_map);
  const get_user = (i) => users[i % users.length];

  const projects_data = [
    // IN_PROGRESS
    { title: 'Tekxai ERP Portal',          status: 'IN_PROGRESS', progress: 65, start: '2025-09-01', end: '2026-09-01', desc: 'Internal ERP system for HR, CRM, and operations.' },
    { title: 'Client CMS Revamp',           status: 'IN_PROGRESS', progress: 40, start: '2026-01-01', end: '2026-07-01', desc: 'Full redesign and rebuild of client content platform.' },
    { title: 'Mobile App v2.0',             status: 'IN_PROGRESS', progress: 25, start: '2026-03-01', end: '2026-12-01', desc: 'Cross-platform mobile app for end customers.' },
    // COMPLETED
    { title: 'Brand Identity Overhaul',     status: 'COMPLETED',   progress: 100, start: '2025-01-01', end: '2025-06-01', desc: 'Complete rebrand including logo, style guide, and assets.' },
    { title: 'Marketing Automation Setup',  status: 'COMPLETED',   progress: 100, start: '2025-04-01', end: '2025-09-01', desc: 'Email sequences, lead scoring, and CRM pipeline setup.' },
    // PENDING
    { title: 'DevOps Infrastructure v3',    status: 'PENDING',     progress: 0,   start: null,         end: null,         desc: 'Next-gen Kubernetes cluster migration and CI/CD overhaul.' },
    { title: 'AI Chatbot Integration',      status: 'PENDING',     progress: 0,   start: null,         end: '2026-12-01', desc: 'GPT-powered customer support chatbot for portal.' },
    // OVERDUE
    { title: 'Legacy System Migration',     status: 'IN_PROGRESS', progress: 15,  start: '2025-06-01', end: '2025-12-31', desc: 'Migrate legacy data warehouse to new PostgreSQL stack.' },
  ];

  const project_ids = [];

  for (let i = 0; i < projects_data.length; i++) {
    const pd = projects_data[i];
    const owner = get_user(i);
    const leader = get_user(i + 2);

    const existing = await prisma.projects.findFirst({ where: { title: pd.title } });
    let project;

    if (!existing) {
      project = await prisma.projects.create({
        data: {
          title: pd.title,
          description: pd.desc,
          status: pd.status,
          progress: pd.progress,
          start_date: pd.start ? new Date(pd.start) : null,
          end_date: pd.end ? new Date(pd.end) : null,
          owner_id: owner.id,
          leader_id: leader.id,
        },
      });
    } else {
      project = existing;
    }

    project_ids.push(project.id);

    // Add 3-5 members
    const member_count = random_int(3, 5);
    for (let m = 0; m < member_count; m++) {
      const member = get_user(i + m + 5);
      const existing_member = await prisma.project_members.findUnique({
        where: { project_id_user_id: { project_id: project.id, user_id: member.id } },
      });
      if (!existing_member) {
        await prisma.project_members.create({
          data: { project_id: project.id, user_id: member.id, role: m === 0 ? 'LEAD' : 'MEMBER' },
        });
      }
    }

    // Milestones for IN_PROGRESS projects
    if (pd.status === 'IN_PROGRESS' || pd.status === 'COMPLETED') {
      const milestone_titles = [
        'Requirements & Design', 'Development Phase 1', 'Testing & QA', 'Deployment',
      ];
      for (let mi = 0; mi < milestone_titles.length; mi++) {
        const existing_ms = await prisma.milestones.findFirst({
          where: { project_id: project.id, title: milestone_titles[mi] },
        });
        if (!existing_ms) {
          const due = pd.start
            ? new Date(new Date(pd.start).getTime() + (mi + 1) * 30 * 24 * 60 * 60 * 1000)
            : days_ago(-(mi * 30));
          await prisma.milestones.create({
            data: {
              project_id: project.id,
              title: milestone_titles[mi],
              due_date: due,
              completed: pd.progress === 100 || mi < Math.floor(pd.progress / 25),
            },
          });
        }
      }
    }
  }

  console.log('[demo] Projects seeded');
  return project_ids;
}

// ─── 10. CRM Leads ────────────────────────────────────────────────────────────

async function seed_crm_leads(prisma, user_map) {
  const users = Object.values(user_map);
  const mkt_users = users.filter(u => u.dept_code === 'MKT-DEMO');
  const fallback = users[0];

  // upwork_bids
  const upwork_data = [
    { job_title: 'React Native App Developer',     type: 'hourly', rate: 25, status: 'Won',       pipeline_stage: 'CLOSED_WON',  contract_amount: 4500, client: 'BuildFast LLC' },
    { job_title: 'Next.js Dashboard Build',         type: 'fixed',  rate: 3200, status: 'Submitted', pipeline_stage: 'NEW',         contract_amount: null, client: null },
    { job_title: 'AI Chatbot Integration',          type: 'fixed',  rate: 5000, status: 'Interview', pipeline_stage: 'CONTACTED',   contract_amount: null, client: 'TechScale Inc' },
    { job_title: 'Laravel API Backend',             type: 'hourly', rate: 20,   status: 'Lost',      pipeline_stage: 'CLOSED_LOST', contract_amount: null, client: null },
    { job_title: 'DevOps + Kubernetes Setup',       type: 'fixed',  rate: 2800, status: 'Submitted', pipeline_stage: 'NEW',         contract_amount: null, client: null },
  ];

  const bid_user = mkt_users[0] || fallback;
  for (const d of upwork_data) {
    const existing = await prisma.upwork_bids.findFirst({
      where: { user_id: bid_user.id, job_title: d.job_title },
    });
    if (!existing) {
      await prisma.upwork_bids.create({
        data: {
          user_id: bid_user.id,
          job_title: d.job_title,
          type: d.type,
          rate: d.rate,
          status: d.status,
          pipeline_stage: d.pipeline_stage,
          contract_amount: d.contract_amount,
          client_name: d.client,
          lose_reasons: d.status === 'Lost' ? ['Price'] : [],
        },
      });
    }
  }

  // linkedin_leads
  const li_data = [
    { full_name: 'James Robertson',   job_title: 'CTO',              status: 'Connected',  pipeline_stage: 'CONTACTED',   contract_amount: 8000 },
    { full_name: 'Sarah Chen',         job_title: 'Product Manager',  status: 'Replied',    pipeline_stage: 'PROPOSAL',    contract_amount: 12000 },
    { full_name: 'Ahmed Al-Rashid',    job_title: 'CEO',              status: 'Connected',  pipeline_stage: 'NEW',         contract_amount: null },
    { full_name: 'Emily Watson',       job_title: 'Tech Lead',        status: 'No Response',pipeline_stage: 'NEW',         contract_amount: null },
  ];

  const li_user = mkt_users[1] || mkt_users[0] || fallback;
  for (const d of li_data) {
    const existing = await prisma.linkedin_leads.findFirst({
      where: { user_id: li_user.id, full_name: d.full_name },
    });
    if (!existing) {
      await prisma.linkedin_leads.create({
        data: {
          user_id: li_user.id,
          full_name: d.full_name,
          job_title: d.job_title,
          status: d.status,
          pipeline_stage: d.pipeline_stage,
          contract_amount: d.contract_amount,
          lose_reasons: [],
        },
      });
    }
  }

  // email_leads
  const email_data = [
    { full_name: 'Michael Torres',  email: 'mtorres@techcorp.com', job_title: 'VP Engineering',   company: 'TechCorp Global', status: 'Replied',  pipeline_stage: 'PROPOSAL' },
    { full_name: 'Priya Sharma',    email: 'priya@startupX.io',   job_title: 'Founder',           company: 'StartupX',        status: 'New',      pipeline_stage: 'NEW' },
    { full_name: 'Robert Kim',      email: 'rkim@enterprise.com', job_title: 'Director of IT',    company: 'Enterprise Co',   status: 'New',      pipeline_stage: 'NEW' },
  ];

  const em_user = mkt_users[2] || mkt_users[0] || fallback;
  for (const d of email_data) {
    const existing = await prisma.email_leads.findFirst({
      where: { user_id: em_user.id, full_name: d.full_name },
    });
    if (!existing) {
      await prisma.email_leads.create({
        data: {
          user_id: em_user.id,
          full_name: d.full_name,
          email: d.email,
          job_title: d.job_title,
          company_name: d.company,
          status: d.status,
          pipeline_stage: d.pipeline_stage,
          lose_reasons: [],
        },
      });
    }
  }

  console.log('[demo] CRM leads seeded');
}

// ─── 11. Contracts ────────────────────────────────────────────────────────────

async function seed_contracts(prisma, user_map) {
  const users = Object.values(user_map).slice(0, 6);

  // Create a template first
  let template = await prisma.contract_templates.findFirst({ where: { name: 'Standard Employment Contract' } });
  if (!template) {
    template = await prisma.contract_templates.create({
      data: {
        name: 'Standard Employment Contract',
        type: 'EMPLOYMENT',
        content: 'This Employment Agreement is entered into between Tekxai and {{employee_name}}. Position: {{designation}}. Department: {{department}}. Compensation: PKR {{salary}} per month. Start Date: {{start_date}}.',
        placeholders: ['employee_name', 'designation', 'department', 'salary', 'start_date'],
      },
    });
  }

  const scenarios = [
    { status: 'SIGNED',  signed_at: days_ago(180) },
    { status: 'SIGNED',  signed_at: days_ago(365) },
    { status: 'SIGNED',  signed_at: days_ago(90) },
    { status: 'DRAFT',   signed_at: null },
    { status: 'PENDING', signed_at: null },
    { status: 'DRAFT',   signed_at: null },
  ];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const sc = scenarios[i];
    const existing = await prisma.contracts.findFirst({ where: { user_id: user.id, type: 'EMPLOYMENT' } });
    if (!existing) {
      await prisma.contracts.create({
        data: {
          user_id: user.id,
          template_id: template.id,
          type: 'EMPLOYMENT',
          title: `Employment Contract — ${user.first_name} ${user.last_name || ''}`.trim(),
          content: `Employment contract for ${user.first_name} ${user.last_name || ''}. Position: ${user.designation}. Compensation: PKR ${user.base_salary}/month.`,
          status: sc.status,
          valid_from: user.hire_date || new Date('2024-01-01'),
          valid_until: new Date('2027-12-31'),
          signed_at: sc.signed_at,
        },
      });
    }
  }

  console.log('[demo] Contracts seeded');
}

// ─── 12. Company Policies ─────────────────────────────────────────────────────

async function seed_policies(prisma, user_map) {
  const admin_user = Object.values(user_map).find(u => u.email === 'zia@tekxai.ca')
    || Object.values(user_map)[0];

  const policies_data = [
    {
      title: 'Code of Conduct',
      category: 'CONDUCT',
      content: '## Code of Conduct\n\nAll employees are expected to maintain professional conduct at all times. This includes:\n\n1. **Respect:** Treat colleagues with respect and dignity.\n2. **Punctuality:** Arrive on time and meet deadlines.\n3. **Confidentiality:** Protect company and client information.\n4. **Integrity:** Act with honesty and transparency.\n\nViolations may result in disciplinary action.',
      version: '1.2',
      is_mandatory: true,
    },
    {
      title: 'Work From Home Policy',
      category: 'ATTENDANCE',
      content: '## Remote Work Policy\n\nEmployees may work from home with prior manager approval subject to:\n\n- Maximum 2 WFH days per week\n- Must be available on Slack/Teams during core hours (10am–5pm)\n- WFH must be logged in the ERP system\n- Deliverables must not be impacted',
      version: '1.0',
      is_mandatory: true,
    },
    {
      title: 'Leave & Attendance Policy',
      category: 'LEAVE',
      content: '## Leave Policy\n\n**Annual Leave:** 21 days per year\n**Sick Leave:** 10 days per year\n**Casual Leave:** 7 days per year\n\n### Attendance Rules\n- Office hours: 9:00 AM – 6:00 PM\n- Grace period: 15 minutes\n- 3 late arrivals in a month = 1 casual leave deduction\n- Monday morning / Friday evening leaves attract a sandwich clause (2x deduction)',
      version: '2.1',
      is_mandatory: true,
    },
    {
      title: 'Data Security Policy',
      category: 'SECURITY',
      content: '## Data Security\n\nAll employees must:\n\n1. Use strong passwords (minimum 12 characters)\n2. Not share credentials with anyone\n3. Lock screens when away from desk\n4. Not transfer client data to personal devices\n5. Report security incidents immediately to IT',
      version: '1.1',
      is_mandatory: true,
    },
  ];

  const policy_ids = [];

  for (const pd of policies_data) {
    let policy = await prisma.company_policies.findFirst({ where: { title: pd.title } });
    if (!policy) {
      policy = await prisma.company_policies.create({
        data: {
          ...pd,
          is_published: true,
          published_at: days_ago(90),
          created_by: admin_user.id,
        },
      });
    }
    policy_ids.push(policy.id);
  }

  // Acknowledgements: first 8 users acknowledge all policies
  const ack_users = Object.values(user_map).slice(0, 8);
  for (const user of ack_users) {
    for (const policy_id of policy_ids) {
      const existing = await prisma.policy_acknowledgements.findUnique({
        where: { user_id_policy_id: { user_id: user.id, policy_id } },
      });
      if (!existing) {
        await prisma.policy_acknowledgements.create({
          data: { user_id: user.id, policy_id, acknowledged_at: days_ago(random_int(1, 60)) },
        });
      }
    }
  }

  console.log('[demo] Policies seeded');
}

// ─── 13. Salary Builders (monthly payroll samples) ────────────────────────────

async function seed_salary_builders(prisma, user_map) {
  const periods = ['2026-05', '2026-06'];
  const sample_users = Object.values(user_map).slice(0, 10);

  for (const user of sample_users) {
    for (const period of periods) {
      const existing = await prisma.salary_builders.findUnique({
        where: { user_id_period: { user_id: user.id, period } },
      });
      if (!existing) {
        const late_deduction = random_int(0, 3) * 500;
        const allowances = [];
        if ((user.fuel || 0) > 0) {
          allowances.push({ name: 'Fuel Allowance', amount: user.fuel });
        }
        if ((user.food || 0) > 0) {
          allowances.push({ name: 'Food Allowance', amount: user.food });
        }

        await prisma.salary_builders.create({
          data: {
            user_id: user.id,
            period,
            team_label: user.dept_code || 'ERP',
            status: period === '2026-05' ? 'published' : 'draft',
            basic_salary_pkr: user.base_salary,
            deductions_pkr: late_deduction,
            deduction_reason: late_deduction > 0 ? 'Late coming deductions' : null,
            commission_pkr: 0,
            allowances,
            published_at: period === '2026-05' ? new Date('2026-06-01') : null,
          },
        });
      }
    }
  }

  console.log('[demo] Salary builders seeded');
}

// ─── 14. Marketing Deals & Deposits ──────────────────────────────────────────

async function seed_marketing_data(prisma, user_map) {
  const mkt_users = Object.values(user_map).filter(u => u.dept_code === 'MKT-DEMO');
  const fallback = Object.values(user_map)[0];
  const seller = mkt_users[0] || fallback;

  const deals = [
    { date: days_ago(30), source: 'Upwork',   lead_job: 'React Dashboard',     team: 'CMS',      revenue: 3200 },
    { date: days_ago(25), source: 'LinkedIn', lead_job: 'Mobile App Project',   team: 'APP-DEV',  revenue: 8500 },
    { date: days_ago(20), source: 'Upwork',   lead_job: 'AI Integration',       team: 'AI-DEVOPS',revenue: 5000 },
    { date: days_ago(10), source: 'Email',    lead_job: 'Laravel API',           team: 'BE-DEV',   revenue: 2200 },
    { date: days_ago(5),  source: 'Upwork',   lead_job: 'Next.js E-commerce',   team: 'FE-DEV',   revenue: 4000 },
  ];

  for (const d of deals) {
    const existing = await prisma.marketing_deals.findFirst({
      where: { salesperson_id: seller.id, lead_job: d.lead_job },
    });
    if (!existing) {
      await prisma.marketing_deals.create({
        data: {
          date: d.date,
          salesperson_id: seller.id,
          source: d.source,
          lead_job: d.lead_job,
          team_label: d.team,
          revenue_usd: d.revenue,
        },
      });
    }
  }

  // Deposits
  const deposits = [
    { project: 'Tekxai ERP Portal',    client: 'Internal',    amount: 0,     source: 'Internal' },
    { project: 'React Dashboard',       client: 'BuildFast LLC',amount: 3200, source: 'Upwork' },
    { project: 'Mobile App v2.0',       client: 'TechScale Inc',amount: 4250, source: 'LinkedIn' },
    { project: 'AI Chatbot Integration',client: 'Enterprise Co',amount: 2500, source: 'Email' },
  ];

  for (const d of deposits) {
    if (d.amount === 0) continue;
    const existing = await prisma.deposits.findFirst({ where: { project_name: d.project, client_name: d.client } });
    if (!existing) {
      await prisma.deposits.create({
        data: {
          project_name: d.project,
          client_name: d.client,
          amount: d.amount,
          source: d.source,
          deposit_date: days_ago(random_int(5, 20)),
          created_by: seller.id,
          is_new_client: false,
        },
      });
    }
  }

  console.log('[demo] Marketing deals & deposits seeded');
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default async function seed_demo(prisma) {
  console.log('[demo] Starting demo data seeder…');

  // 1. Departments
  let dept_map;
  try {
    dept_map = await seed_demo_departments(prisma);
  } catch (e) {
    console.error('[demo] Departments failed:', e.message);
    return;
  }

  // 2. Employees
  let user_map;
  try {
    user_map = await seed_demo_employees(prisma, dept_map);
  } catch (e) {
    console.error('[demo] Employees failed:', e.message);
    return;
  }

  if (!user_map || Object.keys(user_map).length === 0) {
    console.warn('[demo] No users created — aborting remaining steps');
    return;
  }

  // 3. Leave Balances
  try { await seed_leave_balances(prisma, user_map); }
  catch (e) { console.error('[demo] Leave balances failed:', e.message); }

  // 4. Timesheets + Violations
  let entry_refs = [];
  try { entry_refs = await seed_timesheets(prisma, user_map) || []; }
  catch (e) { console.error('[demo] Timesheets failed:', e.message); }

  try { await seed_violations(prisma, entry_refs); }
  catch (e) { console.error('[demo] Violations failed:', e.message); }

  // 5. Time Off Requests
  try { await seed_time_off_requests(prisma, user_map); }
  catch (e) { console.error('[demo] Time-off requests failed:', e.message); }

  // 6. Overtime Requests
  try { await seed_overtime_requests(prisma, user_map); }
  catch (e) { console.error('[demo] Overtime requests failed:', e.message); }

  // 7. Salary Increments
  try { await seed_salary_increments(prisma, user_map); }
  catch (e) { console.error('[demo] Salary increments failed:', e.message); }

  // 8. Projects
  try { await seed_projects(prisma, user_map); }
  catch (e) { console.error('[demo] Projects failed:', e.message); }

  // 9. CRM Leads
  try { await seed_crm_leads(prisma, user_map); }
  catch (e) { console.error('[demo] CRM leads failed:', e.message); }

  // 10. Contracts
  try { await seed_contracts(prisma, user_map); }
  catch (e) { console.error('[demo] Contracts failed:', e.message); }

  // 11. Company Policies
  try { await seed_policies(prisma, user_map); }
  catch (e) { console.error('[demo] Policies failed:', e.message); }

  // 12. Salary Builders
  try { await seed_salary_builders(prisma, user_map); }
  catch (e) { console.error('[demo] Salary builders failed:', e.message); }

  // 13. Marketing data
  try { await seed_marketing_data(prisma, user_map); }
  catch (e) { console.error('[demo] Marketing data failed:', e.message); }

  console.log('[demo] Demo seeder complete.');
}
