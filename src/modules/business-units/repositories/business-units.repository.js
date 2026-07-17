import prisma from '../../../shared/database/client.js';

const BU_INCLUDE = {
  _count: { select: { departments: true } },
};

export async function find_all_business_units({ search } = {}) {
  const where = {};
  if (search) where.name = { contains: search, mode: 'insensitive' };
  return prisma.business_units.findMany({
    take: 500, where, include: BU_INCLUDE, orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
  });
}

export async function find_business_unit_by_id(id) {
  return prisma.business_units.findFirst({ where: { id }, include: BU_INCLUDE });
}

export async function create_business_unit_db(data) {
  return prisma.business_units.create({ data, include: BU_INCLUDE });
}

export async function update_business_unit_db(id, data) {
  return prisma.business_units.update({ where: { id }, data, include: BU_INCLUDE });
}

export async function delete_business_unit_db(id) {
  return prisma.business_units.delete({ where: { id } });
}
