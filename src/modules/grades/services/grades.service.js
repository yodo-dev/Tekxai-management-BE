import prisma from '../../../shared/database/client.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

const GRADE_INCLUDE = {
  _count: { select: { users: true } },
};

export async function list_grades({ search } = {}) {
  const where = { deleted_at: null };
  if (search) where.name = { contains: search, mode: 'insensitive' };
  return prisma.grades.findMany({ take: 500, where, include: GRADE_INCLUDE, orderBy: { level: 'asc' } });
}

export async function get_grade(id) {
  const g = await prisma.grades.findFirst({ where: { id, deleted_at: null }, include: GRADE_INCLUDE });
  if (!g) throw app_error('Grade not found', 404);
  return g;
}

export async function create_grade(data) {
  return prisma.grades.create({ data: { ...data, level: +data.level }, include: GRADE_INCLUDE });
}

export async function update_grade(id, data) {
  await get_grade(id);
  const patch = { ...data };
  if (patch.level !== undefined) patch.level = +patch.level;
  return prisma.grades.update({ where: { id }, data: patch, include: GRADE_INCLUDE });
}

export async function delete_grade(id) {
  await get_grade(id);
  return prisma.grades.update({ where: { id }, data: { deleted_at: new Date() } });
}
