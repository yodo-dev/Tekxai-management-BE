import prisma from '../../../shared/database/client.js';

/** Get the shift for a user (their assigned shift or default) */
export async function get_user_shift(user_id) {
  const assigned = await prisma.employee_shifts.findFirst({
    where: { user_id },
    include: { shift: true },
    orderBy: { effective: 'desc' },
  });
  if (assigned) return assigned.shift;

  return prisma.shifts.findFirst({ where: { is_default: true } });
}

/** List all shifts */
export async function find_all_shifts() {
  return prisma.shifts.findMany({
  take: 500, orderBy: { name: 'asc' } });
}

/** Create or update a shift */
export async function upsert_shift({ id, name, start_time, end_time, grace_period_min, is_default }) {
  if (id) {
    return prisma.shifts.update({ where: { id }, data: { name, start_time, end_time, grace_period_min: Number(grace_period_min), is_default: Boolean(is_default) } });
  }
  return prisma.shifts.create({ data: { name, start_time, end_time, grace_period_min: Number(grace_period_min || 15), is_default: Boolean(is_default) } });
}

/** Assign shift to employee */
export async function assign_shift(user_id, shift_id) {
  return prisma.employee_shifts.create({
    data: { user_id, shift_id, effective: new Date() },
    include: { shift: true },
  });
}

/** List attendance violations */
export async function find_violations({ user_id, start_date, end_date, violation_type, page = 1, limit = 20 } = {}) {
  page = +page || 1; limit = +limit || 20;
  const skip = (page - 1) * limit;
  const where = {};
  if (user_id) where.user_id = user_id;
  if (violation_type) where.violation_type = violation_type;
  if (start_date || end_date) {
    where.date = {};
    if (start_date) where.date.gte = new Date(start_date);
    if (end_date) where.date.lte = new Date(end_date);
  }
  const [total, records] = await Promise.all([
    prisma.attendance_violations.count({ where }),
    prisma.attendance_violations.findMany({
      where, skip, take: limit,
      include: { user: { select: { id: true, first_name: true, last_name: true, avatar: true } } },
      orderBy: { date: 'desc' },
    }),
  ]);
  return { records, total, page, limit };
}

/** Compute and record violation for a timesheet entry */
export async function compute_violation(user_id, entry) {
  const shift = await get_user_shift(user_id);
  if (!shift) return null;

  const check_in_date = new Date(entry.check_in);
  const [sh, sm] = shift.start_time.split(':').map(Number);
  const expected = new Date(check_in_date);
  expected.setHours(sh, sm, 0, 0);

  const late_ms = check_in_date - expected;
  const late_min = Math.floor(late_ms / 60000);

  if (late_min <= shift.grace_period_min) return null; // Within grace period

  return prisma.attendance_violations.upsert({
    where: { id: `viol_${user_id}_${check_in_date.toISOString().split('T')[0]}` },
    update: { late_minutes: late_min, actual_check_in: check_in_date, entry_id: entry.id },
    create: {
      id: `viol_${user_id}_${check_in_date.toISOString().split('T')[0]}`,
      user_id,
      date: new Date(check_in_date.toISOString().split('T')[0]),
      expected_check_in: expected,
      actual_check_in: check_in_date,
      late_minutes: late_min,
      violation_type: 'LATE',
      entry_id: entry.id,
    },
  });
}

/** Attendance summary for a user (used in reports) */
export async function attendance_summary(user_id, start_date, end_date) {
  const start = new Date(start_date);
  const end = new Date(end_date);

  const [entries, violations] = await Promise.all([
    prisma.timesheet_entries.count({
      where: { user_id, check_in: { gte: start, lte: end }, deleted_at: null },
    }),
    prisma.attendance_violations.findMany({
      take: 500,
      where: { user_id, date: { gte: start, lte: end } },
    }),
  ]);

  const late_count = violations.filter((v) => v.violation_type === 'LATE').length;
  const absent_count = violations.filter((v) => v.violation_type === 'ABSENT').length;
  const total_late_min = violations.reduce((s, v) => s + (v.late_minutes || 0), 0);

  return {
    total_working_days: entries,
    late_count,
    absent_count,
    total_late_minutes: total_late_min,
    average_late_minutes: late_count > 0 ? Math.round(total_late_min / late_count) : 0,
  };
}
