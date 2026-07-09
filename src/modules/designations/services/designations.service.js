import prisma from '../../../shared/database/client.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

const DESIGNATION_INCLUDE = {
  department: { select: { id: true, name: true } },
  _count: { select: { users: true } },
};

export async function list_designations({ search, department_id } = {}) {
  const where = { deleted_at: null };
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (department_id) where.department_id = department_id;
  return prisma.designations.findMany({
    take: 500, where, include: DESIGNATION_INCLUDE, orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
  });
}

export async function get_designation(id) {
  const d = await prisma.designations.findFirst({ where: { id, deleted_at: null }, include: DESIGNATION_INCLUDE });
  if (!d) throw app_error('Designation not found', 404);
  return d;
}

export async function create_designation(data) {
  return prisma.designations.create({ data, include: DESIGNATION_INCLUDE });
}

export async function update_designation(id, data) {
  await get_designation(id);
  return prisma.designations.update({ where: { id }, data, include: DESIGNATION_INCLUDE });
}

export async function delete_designation(id) {
  await get_designation(id);
  return prisma.designations.update({ where: { id }, data: { deleted_at: new Date() } });
}
