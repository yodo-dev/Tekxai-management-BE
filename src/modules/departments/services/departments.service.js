import prisma from '../../../shared/database/client.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

const DEPT_INCLUDE = {
  divisions: { where: { deleted_at: null }, orderBy: { name: 'asc' } },
  _count: { select: { users: true } },
};

export async function list_departments({ search } = {}) {
  const where = { deleted_at: null };
  if (search) where.name = { contains: search, mode: 'insensitive' };
  return prisma.departments.findMany({
  take: 500, where, include: DEPT_INCLUDE, orderBy: { name: 'asc' } });
}

export async function get_department(id) {
  const d = await prisma.departments.findFirst({ where: { id, deleted_at: null }, include: DEPT_INCLUDE });
  if (!d) throw app_error('Department not found', 404);
  return d;
}

export async function create_department(data) {
  const { head_user_id, ...rest } = data;
  if (head_user_id) rest.manager_id = head_user_id;
  return prisma.departments.create({ data: rest, include: DEPT_INCLUDE });
}

export async function update_department(id, data) {
  await get_department(id);
  const { head_user_id, ...rest } = data;
  if (head_user_id) rest.manager_id = head_user_id;
  return prisma.departments.update({ where: { id }, data: rest, include: DEPT_INCLUDE });
}

export async function delete_department(id) {
  await get_department(id);
  return prisma.departments.update({ where: { id }, data: { deleted_at: new Date() } });
}

export async function list_divisions(department_id) {
  return prisma.divisions.findMany({
    take: 500,
    where: { department_id, deleted_at: null },
    orderBy: { name: 'asc' },
  });
}

const DIVISION_INCLUDE = {
  department: { select: { id: true, name: true } },
  _count: { select: { users: true } },
};

export async function create_division(department_id, data) {
  await get_department(department_id);
  return prisma.divisions.create({ data: { ...data, department_id }, include: DIVISION_INCLUDE });
}

export async function list_all_divisions({ search, department_id } = {}) {
  const where = { deleted_at: null };
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (department_id) where.department_id = department_id;
  return prisma.divisions.findMany({ take: 500, where, include: DIVISION_INCLUDE, orderBy: { name: 'asc' } });
}

export async function get_division(id) {
  const d = await prisma.divisions.findFirst({ where: { id, deleted_at: null }, include: DIVISION_INCLUDE });
  if (!d) throw app_error('Division not found', 404);
  return d;
}

export async function update_division(id, data) {
  await get_division(id);
  return prisma.divisions.update({ where: { id }, data, include: DIVISION_INCLUDE });
}

export async function delete_division(id) {
  await get_division(id);
  return prisma.divisions.update({ where: { id }, data: { deleted_at: new Date() } });
}
