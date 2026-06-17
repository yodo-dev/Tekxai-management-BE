import prisma from '../../../shared/database/client.js';

const DEPT_INCLUDE = {
  divisions: { where: { deleted_at: null }, orderBy: { name: 'asc' } },
  _count: { select: { users: true } },
};

export async function find_all_departments({ search } = {}) {
  const where = { deleted_at: null };
  if (search) where.name = { contains: search, mode: 'insensitive' };
  return prisma.departments.findMany({ where, include: DEPT_INCLUDE, orderBy: { name: 'asc' } });
}

export async function find_department_by_id(id) {
  return prisma.departments.findFirst({ where: { id, deleted_at: null }, include: DEPT_INCLUDE });
}

export async function create_department_db(data) {
  return prisma.departments.create({ data, include: DEPT_INCLUDE });
}

export async function update_department_db(id, data) {
  return prisma.departments.update({ where: { id }, data, include: DEPT_INCLUDE });
}

export async function delete_department_db(id) {
  return prisma.departments.update({ where: { id }, data: { deleted_at: new Date() } });
}

export async function find_divisions_by_department(department_id) {
  return prisma.divisions.findMany({
    where: { department_id, deleted_at: null },
    orderBy: { name: 'asc' },
  });
}

export async function create_division_db(department_id, data) {
  return prisma.divisions.create({ data: { ...data, department_id } });
}
