import prisma from '../../../shared/database/client.js';

export async function find_daily_reports({ user_id, is_admin, date, page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const where = {};
  if (!is_admin) where.user_id = user_id;
  if (date) {
    const d = new Date(date);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    where.date = { gte: d, lt: next };
  }
  const [total, records] = await Promise.all([
    prisma.daily_progress_reports.count({ where }),
    prisma.daily_progress_reports.findMany({
      where, skip, take: limit, orderBy: { date: 'desc' },
      include: { user: { select: { id: true, first_name: true, last_name: true, avatar: true } } },
    }),
  ]);
  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function create_daily_report_db(data) {
  return prisma.daily_progress_reports.create({
    data: { ...data, date: new Date(data.date || Date.now()) },
    include: { user: { select: { id: true, first_name: true, last_name: true } } },
  });
}

export async function update_daily_report_db(id, data) {
  return prisma.daily_progress_reports.update({ where: { id }, data });
}

export async function find_performance_scores({ user_id, period, is_admin }) {
  const where = {};
  if (!is_admin) where.user_id = user_id;
  if (period) where.period = period;
  return prisma.employee_performance_scores.findMany({
    where,
    include: { user: { select: { id: true, first_name: true, last_name: true, avatar: true } } },
    orderBy: { created_at: 'desc' },
  });
}

export async function upsert_score_db(data) {
  const total_score = (data.timely_delivery || 0) + (data.quality_score || 0) +
    (data.regularity || 0) + (data.punctuality || 0) + (data.dress_code || 0);
  return prisma.employee_performance_scores.upsert({
    where: { user_id_period: { user_id: data.user_id, period: data.period } },
    update: { ...data, total_score },
    create: { ...data, total_score },
  });
}

export async function find_bonus_records({ user_id, period, status, is_admin, page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const where = {};
  if (!is_admin) where.user_id = user_id;
  if (period) where.period = period;
  if (status) where.approval_status = status;
  const [total, records] = await Promise.all([
    prisma.monthly_bonus_records.count({ where }),
    prisma.monthly_bonus_records.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' } }),
  ]);
  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function upsert_bonus_db(user_id, period, data) {
  return prisma.monthly_bonus_records.upsert({
    where: { user_id_period: { user_id, period } },
    update: data,
    create: { user_id, period, ...data },
  });
}

export async function update_bonus_status_db(id, status, updated_by) {
  const data = { approval_status: status };
  if (status === 'APPROVED') { data.approved_by = updated_by; data.approved_at = new Date(); }
  if (status === 'PAID') data.paid_at = new Date();
  return prisma.monthly_bonus_records.update({ where: { id }, data });
}
