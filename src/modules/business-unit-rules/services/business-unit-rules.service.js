import prisma from '../../../shared/database/client.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

export async function list_business_unit_rules({ active_only } = {}) {
  const where = {};
  if (active_only === true || active_only === 'true') where.is_active = true;
  return prisma.business_unit_rules.findMany({ take: 500, where, orderBy: { business_unit: 'asc' } });
}

export async function get_business_unit_rule_by_unit(business_unit) {
  const r = await prisma.business_unit_rules.findUnique({ where: { business_unit } });
  if (!r) throw app_error(`No rule configured for business unit "${business_unit}"`, 404);
  return r;
}

export async function get_business_unit_rule(id) {
  const r = await prisma.business_unit_rules.findUnique({ where: { id } });
  if (!r) throw app_error('Business Unit rule not found', 404);
  return r;
}

export async function create_business_unit_rule(data) {
  return prisma.business_unit_rules.create({ data });
}

export async function update_business_unit_rule(id, data) {
  await get_business_unit_rule(id);
  return prisma.business_unit_rules.update({ where: { id }, data });
}

export async function delete_business_unit_rule(id) {
  await get_business_unit_rule(id);
  return prisma.business_unit_rules.update({ where: { id }, data: { is_active: false } });
}
