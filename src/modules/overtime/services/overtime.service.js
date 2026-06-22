import prisma from '../../../shared/database/client.js';

const SALARY_THRESHOLD = 200000;  // PKR — above this = not eligible
const OVERTIME_MULTIPLIER = 1.5;

function is_same_day(date) {
  const d = new Date(date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

async function check_eligibility(user_id) {
  const profile = await prisma.employee_profiles.findUnique({
    where: { user_id },
    select: { base_salary: true, salary_currency: true },
  });
  const salary = profile?.base_salary || 0;
  if (salary >= SALARY_THRESHOLD) {
    return { eligible: false, reason: `Base salary PKR ${salary.toLocaleString()} ≥ PKR 200,000 threshold` };
  }
  return { eligible: true, reason: null, hourly_rate: salary / 26 / 8 };  // monthly ÷ 26 working days ÷ 8 hrs
}

export async function submit_overtime(user_id, data) {
  const { date, start_time, end_time, duration_minutes, reason, notes, team_id, department_id } = data;

  const eligibility = await check_eligibility(user_id);
  const overtime_date = new Date(date);
  const same_day = is_same_day(overtime_date);
  const is_late = !same_day;

  const record = await prisma.overtime_requests.create({
    data: {
      user_id,
      date: overtime_date,
      start_time: start_time || null,
      end_time: end_time || null,
      duration_minutes: +duration_minutes || 0,
      reason,
      notes: notes || null,
      status: 'PENDING',
      submitted_same_day: same_day,
      is_late_submission: is_late,
      team_id: team_id || null,
      department_id: department_id || null,
      eligible_for_overtime: eligibility.eligible,
      eligibility_reason: eligibility.reason,
      hourly_rate_snapshot: eligibility.hourly_rate || null,
      overtime_multiplier: OVERTIME_MULTIPLIER,
    },
    include: { user: { select: { first_name: true, last_name: true, email: true, employee_id: true } } },
  });
  return record;
}

export async function approve_overtime(id, approver_id, comment) {
  const ot = await prisma.overtime_requests.findUnique({ where: { id } });
  if (!ot) throw Object.assign(new Error('Overtime not found'), { status_code: 404 });
  if (!ot.eligible_for_overtime) {
    throw Object.assign(new Error('Employee is not eligible for overtime: ' + ot.eligibility_reason), { status_code: 400 });
  }
  const approved_minutes = ot.duration_minutes;
  const approved_amount = ot.hourly_rate_snapshot
    ? (ot.hourly_rate_snapshot * (approved_minutes / 60) * (ot.overtime_multiplier || 1.5))
    : null;

  return prisma.overtime_requests.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approver_id,
      approved_at: new Date(),
      approval_comment: comment || null,
      approved_minutes,
      approved_amount,
    },
    include: {
      user: { select: { first_name: true, last_name: true, email: true, employee_id: true } },
      approver: { select: { first_name: true, last_name: true } },
    },
  });
}

export async function reject_overtime(id, approver_id, comment) {
  const ot = await prisma.overtime_requests.findUnique({ where: { id } });
  if (!ot) throw Object.assign(new Error('Overtime not found'), { status_code: 404 });
  return prisma.overtime_requests.update({
    where: { id },
    data: {
      status: 'REJECTED',
      approver_id,
      rejected_at: new Date(),
      approval_comment: comment || null,
      approved_minutes: 0,
      approved_amount: 0,
    },
  });
}

export async function cancel_overtime(id, user_id, is_admin = false) {
  const ot = await prisma.overtime_requests.findUnique({ where: { id } });
  if (!ot) throw Object.assign(new Error('Overtime not found'), { status_code: 404 });
  if (!is_admin && ot.user_id !== user_id) throw Object.assign(new Error('Forbidden'), { status_code: 403 });
  if (ot.status !== 'PENDING') throw Object.assign(new Error('Can only cancel PENDING overtime'), { status_code: 400 });
  return prisma.overtime_requests.update({ where: { id }, data: { status: 'CANCELLED' } });
}

export async function list_overtime({
  user_id, status, team_id, department_id,
  from_date, to_date, month, year,
  page = 1, limit = 20, is_admin = false, current_user_id,
} = {}) {
  const take = Math.min(+limit || 20, 100);
  const skip = ((+page || 1) - 1) * take;

  const where = {};
  // Non-admins can only see their own
  if (!is_admin) where.user_id = current_user_id;
  else {
    if (user_id)     where.user_id = user_id;
    if (team_id)     where.team_id = team_id;
    if (department_id) where.department_id = department_id;
  }
  if (status) where.status = status;

  // Date range
  if (month && year) {
    const start = new Date(`${year}-${String(month).padStart(2,'0')}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    where.date = { gte: start, lt: end };
  } else if (from_date || to_date) {
    where.date = {};
    if (from_date) where.date.gte = new Date(from_date);
    if (to_date)   where.date.lte = new Date(to_date);
  }

  const [total, records] = await Promise.all([
    prisma.overtime_requests.count({ where }),
    prisma.overtime_requests.findMany({
      where, skip, take,
      orderBy: { date: 'desc' },
      include: {
        user: { select: { first_name: true, last_name: true, email: true, employee_id: true, designation: true,
          department: { select: { name: true } },
          team_memberships: { select: { team: { select: { name: true } } }, take: 1 },
        }},
        approver: { select: { first_name: true, last_name: true } },
      },
    }),
  ]);
  return { records, total, page: +page, limit: take, pages: Math.ceil(total / take) };
}

export async function get_overtime_stats({ user_id, month, year, department_id, team_id } = {}) {
  const where = {};
  if (user_id) where.user_id = user_id;
  if (department_id) where.department_id = department_id;
  if (team_id) where.team_id = team_id;
  if (month && year) {
    const start = new Date(`${year}-${String(month).padStart(2,'0')}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    where.date = { gte: start, lt: end };
  }

  const all = await prisma.overtime_requests.findMany({ where, select: {
    status: true, duration_minutes: true, approved_minutes: true,
    approved_amount: true, is_late_submission: true, eligible_for_overtime: true,
  }});

  const total = all.length;
  const pending = all.filter(r => r.status === 'PENDING').length;
  const approved = all.filter(r => r.status === 'APPROVED').length;
  const rejected = all.filter(r => r.status === 'REJECTED').length;
  const cancelled = all.filter(r => r.status === 'CANCELLED').length;
  const ineligible = all.filter(r => !r.eligible_for_overtime).length;
  const late_submissions = all.filter(r => r.is_late_submission).length;
  const total_approved_minutes = all.filter(r => r.status === 'APPROVED').reduce((s, r) => s + (r.approved_minutes || 0), 0);
  const total_approved_amount = all.filter(r => r.status === 'APPROVED').reduce((s, r) => s + (r.approved_amount || 0), 0);

  return {
    total, pending, approved, rejected, cancelled, ineligible, late_submissions,
    total_approved_minutes,
    total_approved_hours: +(total_approved_minutes / 60).toFixed(2),
    total_approved_amount: +total_approved_amount.toFixed(2),
  };
}

export async function get_payroll_data({ user_id, month, year }) {
  const start = new Date(`${year}-${String(month).padStart(2,'0')}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const approved = await prisma.overtime_requests.findMany({
    where: { user_id, status: 'APPROVED', date: { gte: start, lt: end } },
    select: { id: true, date: true, duration_minutes: true, approved_minutes: true, approved_amount: true, approval_comment: true },
  });
  const excluded = await prisma.overtime_requests.findMany({
    where: { user_id, status: { in: ['REJECTED', 'CANCELLED'] }, date: { gte: start, lt: end } },
    select: { id: true, date: true, status: true, duration_minutes: true, approval_comment: true },
  });
  const pending = await prisma.overtime_requests.findMany({
    where: { user_id, status: 'PENDING', date: { gte: start, lt: end } },
    select: { id: true, date: true, duration_minutes: true },
  });

  const total_approved_minutes = approved.reduce((s, r) => s + (r.approved_minutes || 0), 0);
  const total_approved_amount = approved.reduce((s, r) => s + (r.approved_amount || 0), 0);

  return {
    month, year, user_id,
    approved, excluded, pending,
    summary: {
      approved_count: approved.length,
      excluded_count: excluded.length,
      pending_count: pending.length,
      total_approved_minutes,
      total_approved_hours: +(total_approved_minutes / 60).toFixed(2),
      total_approved_amount: +total_approved_amount.toFixed(2),
    },
  };
}
