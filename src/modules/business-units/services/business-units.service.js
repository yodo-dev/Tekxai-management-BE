import prisma from '../../../shared/database/client.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

const BU_INCLUDE = {
  _count: { select: { departments: true } },
};

export async function list_business_units({ search } = {}) {
  const where = {};
  if (search) where.name = { contains: search, mode: 'insensitive' };
  return prisma.business_units.findMany({
    take: 500, where, include: BU_INCLUDE, orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
  });
}

export async function get_business_unit(id) {
  const bu = await prisma.business_units.findFirst({ where: { id }, include: BU_INCLUDE });
  if (!bu) throw app_error('Business unit not found', 404);
  return bu;
}

export async function create_business_unit(data) {
  const { name, code, description, is_active, sort_order } = data;
  return prisma.business_units.create({
    data: { name, code: code || null, description: description || null, is_active, sort_order },
    include: BU_INCLUDE,
  });
}

export async function update_business_unit(id, data) {
  await get_business_unit(id);
  const { name, code, description, is_active, sort_order } = data;
  const update_data = {};
  if (name !== undefined) update_data.name = name;
  if (code !== undefined) update_data.code = code || null;
  if (description !== undefined) update_data.description = description || null;
  if (is_active !== undefined) update_data.is_active = is_active;
  if (sort_order !== undefined) update_data.sort_order = sort_order;
  return prisma.business_units.update({ where: { id }, data: update_data, include: BU_INCLUDE });
}

// business_units has no deleted_at column (Sprint 1 scope is additive-only,
// no soft-delete infra was requested) — deletion is a hard delete, guarded
// by the same "check dependents first" pattern used for departments/divisions
// since the FK is SetNull, not Restrict, so nothing at the DB level would
// otherwise stop this from silently orphaning departments.
export async function check_business_unit_dependencies(id) {
  const department_count = await prisma.departments.count({ where: { business_unit_id: id, deleted_at: null } });
  if (department_count > 0) {
    throw app_error(`Cannot delete business unit: still referenced by ${department_count} department(s)`, 409);
  }
}

export async function delete_business_unit(id) {
  await get_business_unit(id);
  await check_business_unit_dependencies(id);
  return prisma.business_units.delete({ where: { id } });
}

export async function bulk_delete_business_units(ids) {
  const results = [];
  for (const id of ids) {
    try {
      await delete_business_unit(id);
      results.push({ id, success: true });
    } catch (e) {
      results.push({ id, success: false, message: e.message || 'Failed to delete' });
    }
  }
  return results;
}
