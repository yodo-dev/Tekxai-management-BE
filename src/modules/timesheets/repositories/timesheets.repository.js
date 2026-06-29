import prisma from '../../../shared/database/client.js';

// ── Duration helper ───────────────────────────────────────────────────────────

function calc_duration_sec(check_in, check_out) {
  if (!check_in || !check_out) return 0;
  const diff = Math.floor((new Date(check_out) - new Date(check_in)) / 1000);
  return diff > 0 ? diff : 0;
}

// ── Entries ───────────────────────────────────────────────────────────────────

export async function find_weekly_entries(user_id, week_start) {
  const start = new Date(week_start);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return prisma.timesheet_entries.findMany({
    take: 500,
    where: { user_id, check_in: { gte: start, lt: end }, deleted_at: null },
    include: { user: { select: { id: true, first_name: true, last_name: true } } },
    orderBy: { check_in: 'asc' },
  });
}

export async function find_all_weekly_entries(week_start, search) {
  const start = new Date(week_start);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const where = { check_in: { gte: start, lt: end }, deleted_at: null };
  if (search) {
    where.user = { OR: [
      { first_name: { contains: search, mode: 'insensitive' } },
      { last_name:  { contains: search, mode: 'insensitive' } },
    ]};
  }

  return prisma.timesheet_entries.findMany({
    where,
    include: { user: { select: { id: true, first_name: true, last_name: true, avatar: true } } },
    orderBy: { check_in: 'asc' },
    take: 500,
  });
}

export async function find_entry_by_id(id) {
  return prisma.timesheet_entries.findFirst({ where: { id, deleted_at: null } });
}

/** Find today's open entry (no check_out) for a user */
export async function find_todays_open_entry(user_id) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return prisma.timesheet_entries.findFirst({
    where: {
      user_id,
      check_in: { gte: start, lt: end },
      check_out: null,
      deleted_at: null,
    },
    orderBy: { check_in: 'desc' },
  });
}

export async function find_today_entry(user_id) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return prisma.timesheet_entries.findFirst({
    where: { user_id, check_in: { gte: start, lt: end }, deleted_at: null },
    orderBy: { check_in: 'desc' },
  });
}

export async function create_entry({ user_id, check_in, check_out, note }) {
  const ci = new Date(check_in);
  const co = check_out ? new Date(check_out) : null;
  const duration_sec = calc_duration_sec(ci, co);
  const status = co ? 'COMPLETED' : 'IN_PROGRESS';

  return prisma.timesheet_entries.create({
    data: { user_id, check_in: ci, check_out: co, duration_sec, status, note },
  });
}

export async function update_entry(id, { check_in, check_out, note, status }) {
  // Get existing entry to recalculate duration
  const existing = await prisma.timesheet_entries.findFirst({ where: { id } });
  const data = {};
  if (check_in) data.check_in = new Date(check_in);
  if (check_out) data.check_out = new Date(check_out);
  if (note !== undefined) data.note = note;

  // Auto-calculate duration if check_out provided
  const new_ci = data.check_in || existing?.check_in;
  const new_co = data.check_out || existing?.check_out;
  if (new_co) {
    data.duration_sec = calc_duration_sec(new_ci, new_co);
    data.status = status || 'COMPLETED';
  } else if (status) {
    data.status = status;
  }

  return prisma.timesheet_entries.update({ where: { id }, data });
}

/** Convenience: clock in (create entry with just check_in) */
export async function clock_in(user_id, note) {
  return create_entry({ user_id, check_in: new Date().toISOString(), note });
}

/** Convenience: clock out (update open entry with check_out) */
export async function clock_out(entry_id, note) {
  const entry = await prisma.timesheet_entries.findFirst({ where: { id: entry_id } });
  const now = new Date();
  const duration = entry ? calc_duration_sec(entry.check_in, now) : 0;
  return prisma.timesheet_entries.update({
    where: { id: entry_id },
    data: {
      check_out: now,
      duration_sec: duration,
      status: 'COMPLETED',
      note: note || null,
      checkout_reason: 'MANUAL',
      checkout_source: 'WEB',
    },
  });
}

/**
 * Force-close the most recent open entry for a user, regardless of date.
 * Used by: auto-checkout on logout, idle timeout, admin corrections.
 * `reason` is one of: 'LOGOUT' | 'IDLE_TIMEOUT' | 'ADMIN' | 'MANUAL'
 */
export async function force_checkout(user_id, reason = 'MANUAL') {
  const open = await prisma.timesheet_entries.findFirst({
    where: { user_id, check_out: null, deleted_at: null },
    orderBy: { check_in: 'desc' },
  });
  if (!open) return null;

  const now = new Date();
  const duration = calc_duration_sec(open.check_in, now);
  return prisma.timesheet_entries.update({
    where: { id: open.id },
    data: {
      check_out: now,
      duration_sec: duration,
      status: 'COMPLETED',
      checkout_reason: reason,
      checkout_source: 'SYSTEM',
    },
  });
}

export async function delete_entry(id) {
  return prisma.timesheet_entries.update({ where: { id }, data: { deleted_at: new Date() } });
}

// ── Edit Requests ────────────────────────────────────────────────────────────

export async function create_edit_request({ entry_id, user_id, new_check_in, new_check_out, reason }) {
  return prisma.timesheet_edit_requests.create({
    data: {
      entry_id,
      user_id,
      new_check_in: new_check_in ? new Date(new_check_in) : null,
      new_check_out: new_check_out ? new Date(new_check_out) : null,
      reason,
    },
    include: { user: { select: { id: true, first_name: true, last_name: true } } },
  });
}

export async function find_edit_requests({ status, user_id } = {}) {
  const where = {};
  if (status) where.status = status;
  if (user_id) where.user_id = user_id;
  return prisma.timesheet_edit_requests.findMany({
    where,
    include: {
      user: { select: { id: true, first_name: true, last_name: true, avatar: true } },
      entry: true,
    },
    orderBy: { created_at: 'desc' },
    take: 500,
  });
}

export async function update_edit_request_status(id, status, reviewed_by) {
  return prisma.timesheet_edit_requests.update({
    where: { id },
    data: { status, reviewed_by, reviewed_at: new Date() },
  });
}

// ── Time Off Policies ────────────────────────────────────────────────────────

export async function find_time_off_policies() {
  return prisma.time_off_policies.findMany({
  take: 500, where: { is_active: true }, orderBy: { name: 'asc' } });
}

// ── Time Off Requests ────────────────────────────────────────────────────────

export async function create_time_off_request({ user_id, policy_id, start_date, end_date, days, reason }) {
  return prisma.time_off_requests.create({
    data: {
      user_id,
      policy_id,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      days: days || 1,
      reason,
    },
    include: {
      policy: true,
      user: { select: { id: true, first_name: true, last_name: true, email: true, avatar: true } },
    },
  });
}

export async function find_time_off_requests({ user_id, status } = {}) {
  const where = {};
  if (user_id) where.user_id = user_id;
  if (status) where.status = status;
  return prisma.time_off_requests.findMany({
    where,
    include: {
      policy: true,
      user: { select: { id: true, first_name: true, last_name: true, email: true, avatar: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 500,
  });
}

export async function update_time_off_status(id, status, manager_comment, reviewed_by) {
  return prisma.time_off_requests.update({
    where: { id },
    data: { status, manager_comment, reviewed_by, reviewed_at: new Date() },
    include: {
      user:   { select: { id: true, first_name: true, last_name: true, email: true } },
      policy: true,
    },
  });
}
