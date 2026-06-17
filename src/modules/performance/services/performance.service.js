import prisma from '../../../shared/database/client.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

// ── Daily Progress Reports ───────────────────────────────────────────────────

export async function list_daily_reports({ user_id, is_admin = false, date, page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const where = {};
  if (!is_admin) where.user_id = user_id;
  if (date) {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    where.date = { gte: d, lt: next };
  }

  const [total, records] = await Promise.all([
    prisma.daily_progress_reports.count({ where }),
    prisma.daily_progress_reports.findMany({
      where, skip, take: limit,
      orderBy: { date: 'desc' },
      include: { user: { select: { id: true, first_name: true, last_name: true, avatar: true } } },
    }),
  ]);

  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function create_daily_report(user_id, data) {
  return prisma.daily_progress_reports.create({
    data: { ...data, user_id, date: new Date(data.date || Date.now()) },
    include: { user: { select: { id: true, first_name: true, last_name: true } } },
  });
}

export async function update_daily_report(id, user_id, data, is_admin) {
  const report = await prisma.daily_progress_reports.findUnique({ where: { id } });
  if (!report) throw app_error('Report not found', 404);
  if (!is_admin && report.user_id !== user_id) throw app_error('Forbidden', 403);
  return prisma.daily_progress_reports.update({ where: { id }, data });
}

// ── Performance Scores ───────────────────────────────────────────────────────

const BONUS_CONFIG = [
  { min: 95, max: 100, level: 'Outstanding',         bonus: 20000 },
  { min: 85, max: 94,  level: 'Excellent',            bonus: 15000 },
  { min: 75, max: 84,  level: 'Good',                 bonus: 10000 },
  { min: 50, max: 74,  level: 'Average',              bonus: 5000  },
  { min: 0,  max: 49,  level: 'Needs Improvement',   bonus: 0     },
];

function get_bonus_config(score) {
  return BONUS_CONFIG.find((b) => score >= b.min && score <= b.max) || BONUS_CONFIG[BONUS_CONFIG.length - 1];
}

export async function list_scores({ user_id, period, is_admin = false } = {}) {
  const where = {};
  if (!is_admin) where.user_id = user_id;
  if (period) where.period = period;

  return prisma.employee_performance_scores.findMany({
    where,
    include: { user: { select: { id: true, first_name: true, last_name: true, avatar: true } } },
    orderBy: { created_at: 'desc' },
  });
}

export async function get_employee_score(target_user_id, period) {
  return prisma.employee_performance_scores.findFirst({
    where: { user_id: target_user_id, period },
    include: { user: { select: { id: true, first_name: true, last_name: true } } },
  });
}

export async function upsert_score(data) {
  const total_score = (data.timely_delivery || 0) + (data.quality_score || 0) +
    (data.regularity || 0) + (data.punctuality || 0) + (data.dress_code || 0);

  return prisma.employee_performance_scores.upsert({
    where: { user_id_period: { user_id: data.user_id, period: data.period } },
    update: { ...data, total_score },
    create: { ...data, total_score },
  });
}

// ── Bonus ────────────────────────────────────────────────────────────────────

export async function calculate_bonus(user_id, period) {
  const score = await prisma.employee_performance_scores.findFirst({ where: { user_id, period } });
  if (!score) throw app_error('Performance score not found for this period', 404);

  const config = get_bonus_config(score.total_score);

  return prisma.monthly_bonus_records.upsert({
    where: { user_id_period: { user_id, period } },
    update: {
      average_score: score.total_score,
      performance_level: config.level,
      bonus_eligible: config.bonus > 0,
      bonus_amount: config.bonus,
    },
    create: {
      user_id,
      period,
      average_score: score.total_score,
      performance_level: config.level,
      bonus_eligible: config.bonus > 0,
      bonus_amount: config.bonus,
    },
  });
}

export async function list_bonus_records({ user_id, period, status, is_admin = false, page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const where = {};
  if (!is_admin) where.user_id = user_id;
  if (period) where.period = period;
  if (status) where.approval_status = status;

  const [total, records] = await Promise.all([
    prisma.monthly_bonus_records.count({ where }),
    prisma.monthly_bonus_records.findMany({
      where, skip, take: limit,
      orderBy: { created_at: 'desc' },
    }),
  ]);

  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function approve_bonus(id, approved_by) {
  return prisma.monthly_bonus_records.update({
    where: { id },
    data: { approval_status: 'APPROVED', approved_by, approved_at: new Date() },
  });
}

export async function mark_bonus_paid(id) {
  return prisma.monthly_bonus_records.update({
    where: { id },
    data: { approval_status: 'PAID', paid_at: new Date() },
  });
}
