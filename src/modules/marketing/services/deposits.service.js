import prisma from '../../../shared/database/client.js';

export async function list_deposits({ from, to, page = 1, limit = 50 } = {}) {
  page = +page || 1; limit = +limit || 50;
  const skip = (page - 1) * limit;
  const where = {};
  if (from) where.deposit_date = { gte: new Date(from) };
  if (to) where.deposit_date = { ...(where.deposit_date || {}), lte: new Date(to) };

  const [total, records] = await Promise.all([
    prisma.deposits.count({ where }),
    prisma.deposits.findMany({
      where, skip, take: limit,
      orderBy: { deposit_date: 'desc' },
      include: { creator: { select: { id: true, first_name: true, last_name: true } } },
    }),
  ]);
  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function create_deposit(data, user_id) {
  return prisma.deposits.create({
    data: { ...data, created_by: user_id, deposit_date: data.deposit_date ? new Date(data.deposit_date) : new Date() },
    include: { creator: { select: { id: true, first_name: true, last_name: true } } },
  });
}

export async function update_deposit(id, data) {
  return prisma.deposits.update({
    where: { id },
    data: { ...data, deposit_date: data.deposit_date ? new Date(data.deposit_date) : undefined, updated_at: new Date() },
    include: { creator: { select: { id: true, first_name: true, last_name: true } } },
  });
}

export async function delete_deposit(id) {
  return prisma.deposits.delete({ where: { id } });
}

export async function get_deposit_target(month, year) {
  return prisma.deposit_targets.findFirst({ where: { month: +month, year: +year } });
}

export async function upsert_deposit_target(month, year, target_amount) {
  return prisma.deposit_targets.upsert({
    where: { month_year: { month: +month, year: +year } },
    update: { target_amount: +target_amount },
    create: { month: +month, year: +year, target_amount: +target_amount },
  });
}
