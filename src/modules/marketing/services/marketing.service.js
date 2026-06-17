import prisma from '../../../shared/database/client.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

export async function list_deals({ team_label, salesperson_id, page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const where = {};
  if (team_label) where.team_label = team_label;
  if (salesperson_id) where.salesperson_id = salesperson_id;

  const [total, records] = await Promise.all([
    prisma.marketing_deals.count({ where }),
    prisma.marketing_deals.findMany({
      where, skip, take: limit,
      orderBy: { date: 'desc' },
      include: { salesperson: { select: { id: true, first_name: true, last_name: true, avatar: true } } },
    }),
  ]);

  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function create_deal(data) {
  return prisma.marketing_deals.create({
    data: { ...data, date: new Date(data.date) },
    include: { salesperson: { select: { id: true, first_name: true, last_name: true } } },
  });
}

export async function get_salary_builder(user_id, period) {
  const sb = await prisma.salary_builders.findFirst({ where: { user_id, period } });
  return sb;
}

export async function upsert_salary_builder({ user_id, period, team_label, basic_salary_pkr, deductions_pkr, deduction_reason, commission_pkr, allowances, status }) {
  return prisma.salary_builders.upsert({
    where: { user_id_period: { user_id, period } },
    update: { team_label, basic_salary_pkr, deductions_pkr, deduction_reason, commission_pkr, allowances, status },
    create: { user_id, period, team_label, basic_salary_pkr, deductions_pkr, deduction_reason, commission_pkr, allowances, status },
  });
}

export async function publish_salary(user_id, period) {
  const sb = await prisma.salary_builders.findFirst({ where: { user_id, period } });
  if (!sb) throw app_error('Salary builder not found', 404);
  return prisma.salary_builders.update({
    where: { id: sb.id },
    data: { status: 'published', published_at: new Date() },
  });
}

export async function list_salary_history({ user_id, team_label, page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const where = { status: 'published' };
  if (user_id) where.user_id = user_id;
  if (team_label) where.team_label = team_label;

  const [total, records] = await Promise.all([
    prisma.salary_builders.count({ where }),
    prisma.salary_builders.findMany({
      where, skip, take: limit,
      orderBy: { period: 'desc' },
      include: { user: { select: { id: true, first_name: true, last_name: true } } },
    }),
  ]);

  return { records, total, page, limit };
}
