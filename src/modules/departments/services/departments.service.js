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

// Soft delete only flips deleted_at (no FK cascade happens), so nothing at
// the DB level stops a department from being deleted out from under its
// still-active divisions/employees. This is a business-rule guard, not a
// constraint — checked explicitly so the user gets a clear message instead
// of a silently orphaned reference.
export async function check_department_dependencies(id) {
  const [division_count, user_count] = await Promise.all([
    prisma.divisions.count({ where: { department_id: id, deleted_at: null } }),
    prisma.users.count({ where: { department_id: id, deleted_at: null } }),
  ]);
  if (division_count > 0 || user_count > 0) {
    const parts = [];
    if (division_count > 0) parts.push(`${division_count} division(s)`);
    if (user_count > 0) parts.push(`${user_count} employee(s)`);
    throw app_error(`Cannot delete department: still referenced by ${parts.join(' and ')}`, 409);
  }
}

export async function delete_department(id) {
  await get_department(id);
  await check_department_dependencies(id);
  return prisma.departments.update({ where: { id }, data: { deleted_at: new Date() } });
}

export async function bulk_delete_departments(ids) {
  const results = [];
  for (const id of ids) {
    try {
      await delete_department(id);
      results.push({ id, success: true });
    } catch (e) {
      results.push({ id, success: false, message: e.message || 'Failed to delete' });
    }
  }
  return results;
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

// Same rationale as check_department_dependencies — soft delete doesn't
// block on FK cascades, so we check explicitly for employees/teams still
// assigned to this division before allowing the delete.
export async function check_division_dependencies(id) {
  const [user_count, team_count] = await Promise.all([
    prisma.users.count({ where: { division_id: id, deleted_at: null } }),
    prisma.teams.count({ where: { division_id: id } }),
  ]);
  if (user_count > 0 || team_count > 0) {
    const parts = [];
    if (user_count > 0) parts.push(`${user_count} employee(s)`);
    if (team_count > 0) parts.push(`${team_count} team(s)`);
    throw app_error(`Cannot delete division: still referenced by ${parts.join(' and ')}`, 409);
  }
}

export async function delete_division(id) {
  await get_division(id);
  await check_division_dependencies(id);
  return prisma.divisions.update({ where: { id }, data: { deleted_at: new Date() } });
}

export async function bulk_delete_divisions(ids) {
  const results = [];
  for (const id of ids) {
    try {
      await delete_division(id);
      results.push({ id, success: true });
    } catch (e) {
      results.push({ id, success: false, message: e.message || 'Failed to delete' });
    }
  }
  return results;
}
