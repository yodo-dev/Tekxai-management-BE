import prisma from '../../../shared/database/client.js';
import { create_notification } from '../../notifications/services/notifications.service.js';

// `shift_schedules` is the one canonical shift model (Sprint 2 Milestone 1) —
// it's the only one with a real relation (`employee_shifts.shift_id` FKs into
// it). The orphaned duplicate `shifts` model has been retired. Its DB column
// is `grace_period_mins` (plural); the API/FE contract predates this fix and
// uses `grace_period_min` (singular), so every function here normalizes the
// shape at the boundary rather than touching the contract or the frontend.
function normalize_shift(shift) {
  if (!shift) return shift;
  const { grace_period_mins, ...rest } = shift;
  return { ...rest, grace_period_min: grace_period_mins };
}

/** Get the shift for a user (their currently active assignment, or the default) */
export async function get_user_shift(user_id) {
  const now = new Date();
  const assigned = await prisma.employee_shifts.findFirst({
    where: {
      user_id,
      start_date: { lte: now },
      OR: [{ end_date: null }, { end_date: { gte: now } }],
    },
    include: { shift: true },
    orderBy: { start_date: 'desc' },
  });
  if (assigned) return normalize_shift(assigned.shift);

  const default_shift = await prisma.shift_schedules.findFirst({ where: { is_default: true } });
  return normalize_shift(default_shift);
}

/** List all shifts, each annotated with its currently-active assignees —
 * admin-side visibility into shift assignments (Shift Management had no way
 * to see who's on a shift after assigning them; employees could only see
 * their own via get_user_shift/my-shift). */
export async function find_all_shifts() {
  const now = new Date();
  const shifts = await prisma.shift_schedules.findMany({
    take: 500,
    orderBy: { name: 'asc' },
    include: {
      employee_shifts: {
        where: { start_date: { lte: now }, OR: [{ end_date: null }, { end_date: { gte: now } }] },
        select: { user: { select: { id: true, first_name: true, last_name: true } } },
      },
    },
  });
  return shifts.map((s) => {
    const { employee_shifts, ...rest } = s;
    return { ...normalize_shift(rest), assigned_employees: employee_shifts.map((e) => e.user) };
  });
}

/** Create or update a shift */
export async function upsert_shift({ id, name, start_time, end_time, grace_period_min, is_default }) {
  const data = {
    name, start_time, end_time,
    grace_period_mins: Number(grace_period_min || 15),
    is_default: Boolean(is_default),
  };
  const shift = id
    ? await prisma.shift_schedules.update({ where: { id }, data })
    : await prisma.shift_schedules.create({ data });
  return normalize_shift(shift);
}

/** Delete a shift */
export async function delete_shift(id) {
  return prisma.shift_schedules.delete({ where: { id } });
}

/** Assign shift to employee */
export async function assign_shift(user_id, shift_id) {
  const assignment = await prisma.employee_shifts.create({
    data: { user_id, shift_id, start_date: new Date() },
    include: { shift: true },
  });
  return { ...assignment, shift: normalize_shift(assignment.shift) };
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

  const date_key = check_in_date.toISOString().split('T')[0];
  const remarks = `Late check-in by ${late_min} minutes (expected ${shift.start_time}, checked in at `
    + `${String(check_in_date.getHours()).padStart(2, '0')}:${String(check_in_date.getMinutes()).padStart(2, '0')})`;

  const violation_id = `viol_${user_id}_${date_key}`;
  // Sprint 2 Milestone 6: only notify the first time this day's violation is
  // created, not on every subsequent recompute (e.g. a second late clock-in
  // the same day would otherwise re-run this upsert and re-notify).
  const already_existed = await prisma.attendance_violations.findUnique({ where: { id: violation_id } });

  const violation = await prisma.attendance_violations.upsert({
    where: { id: violation_id },
    update: { late_mins: late_min, remarks, entry_id: entry.id },
    create: {
      id: violation_id,
      user_id,
      date: new Date(date_key),
      violation_type: 'LATE',
      late_mins: late_min,
      remarks,
      entry_id: entry.id,
    },
  });

  if (!already_existed) {
    create_notification({
      user_id,
      title: 'Late Check-In Recorded',
      message: `You checked in late by ${late_min} minutes (expected ${shift.start_time}).`,
      type: 'ATTENDANCE',
    }).catch(() => null);
  }

  return violation;
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
  const total_late_min = violations.reduce((s, v) => s + (v.late_mins || 0), 0);

  return {
    total_working_days: entries,
    late_count,
    absent_count,
    total_late_minutes: total_late_min,
    average_late_minutes: late_count > 0 ? Math.round(total_late_min / late_count) : 0,
  };
}
