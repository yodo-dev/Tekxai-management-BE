import prisma from '../../../shared/database/client.js';

// ── Entries ───────────────────────────────────────────────────────────────────

export async function find_weekly_entries(user_id, week_start) {
  const start = new Date(week_start);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return prisma.timesheet_entries.findMany({
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
  });
}

export async function find_entry_by_id(id) {
  return prisma.timesheet_entries.findFirst({ where: { id, deleted_at: null } });
}

export async function create_entry({ user_id, check_in, check_out, note }) {
  return prisma.timesheet_entries.create({
    data: { user_id, check_in: new Date(check_in), check_out: check_out ? new Date(check_out) : null, note },
  });
}

export async function update_entry(id, { check_in, check_out, note, status }) {
  const data = {};
  if (check_in) data.check_in = new Date(check_in);
  if (check_out) data.check_out = new Date(check_out);
  if (note !== undefined) data.note = note;
  if (status) data.status = status;

  return prisma.timesheet_entries.update({ where: { id }, data });
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
  return prisma.time_off_policies.findMany({ where: { is_active: true }, orderBy: { name: 'asc' } });
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
  });
}

export async function update_time_off_status(id, status, manager_comment, reviewed_by) {
  return prisma.time_off_requests.update({
    where: { id },
    data: { status, manager_comment, reviewed_by, reviewed_at: new Date() },
  });
}
