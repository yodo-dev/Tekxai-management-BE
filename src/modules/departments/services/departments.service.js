import prisma from '../../../shared/database/client.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

const DEPT_INCLUDE = {
  divisions: { where: { deleted_at: null }, orderBy: { name: 'asc' } },
  _count: { select: { users: true } },
};

export async function list_departments({ search } = {}) {
  const where = { deleted_at: null };
  if (search) where.name = { contains: search, mode: 'insensitive' };
  return prisma.departments.findMany({ where, include: DEPT_INCLUDE, orderBy: { name: 'asc' } });
}

export async function get_department(id) {
  const d = await prisma.departments.findFirst({ where: { id, deleted_at: null }, include: DEPT_INCLUDE });
  if (!d) throw app_error('Department not found', 404);
  return d;
}

export async function create_department(data) {
  return prisma.departments.create({ data, include: DEPT_INCLUDE });
}

export async function update_department(id, data) {
  await get_department(id);
  return prisma.departments.update({ where: { id }, data, include: DEPT_INCLUDE });
}

export async function delete_department(id) {
  await get_department(id);
  return prisma.departments.update({ where: { id }, data: { deleted_at: new Date() } });
}

export async function list_divisions(department_id) {
  return prisma.divisions.findMany({
    where: { department_id, deleted_at: null },
    orderBy: { name: 'asc' },
  });
}

export async function create_division(department_id, data) {
  await get_department(department_id);
  return prisma.divisions.create({ data: { ...data, department_id } });
}
