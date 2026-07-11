import prisma from '../../../shared/database/client.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

export async function list_business_activities({ search, feeds_layer, active_only } = {}) {
  const where = {};
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (feeds_layer) where.feeds_layer = feeds_layer;
  if (active_only === true || active_only === 'true') where.is_active = true;
  return prisma.business_activities.findMany({
    take: 500, where, orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
  });
}

export async function get_business_activity(id) {
  const a = await prisma.business_activities.findUnique({ where: { id } });
  if (!a) throw app_error('Business Activity not found', 404);
  return a;
}

export async function create_business_activity(data) {
  return prisma.business_activities.create({ data });
}

export async function update_business_activity(id, data) {
  await get_business_activity(id);
  return prisma.business_activities.update({ where: { id }, data });
}

export async function delete_business_activity(id) {
  await get_business_activity(id);
  // Soft-disable, not a hard delete — task_time_logs may already reference this
  // activity, and onDelete: SetNull would silently orphan historical attribution.
  return prisma.business_activities.update({ where: { id }, data: { is_active: false } });
}
