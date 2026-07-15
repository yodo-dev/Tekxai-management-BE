import prisma from '../../../shared/database/client.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

const INCLUDE = {
  location: { select: { id: true, office: true, floor: true, room: true, business_unit: true } },
  category: { select: { id: true, name: true, code: true, tracking_type: true, default_criticality: true } },
};

export async function list_compliance_requirements({ location_id, category_id, status, page = 1, limit = 50 } = {}) {
  page = +page || 1; limit = +limit || 50;
  const where = {};
  if (location_id) where.location_id = location_id;
  if (category_id) where.category_id = category_id;
  if (status) where.status = status;

  const [total, records] = await Promise.all([
    prisma.compliance_requirements.count({ where }),
    prisma.compliance_requirements.findMany({
      where, skip: (page - 1) * limit, take: limit, include: INCLUDE, orderBy: { created_at: 'desc' },
    }),
  ]);
  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function get_compliance_requirement(id) {
  const r = await prisma.compliance_requirements.findUnique({ where: { id }, include: INCLUDE });
  if (!r) throw app_error('Compliance requirement not found', 404);
  return r;
}

export async function create_compliance_requirement(user_id, data) {
  const { location_id, category_id, required_quantity, status, notes } = data;
  const existing = await prisma.compliance_requirements.findUnique({ where: { location_id_category_id: { location_id, category_id } } });
  if (existing) throw app_error('A requirement for this location and category already exists — edit it instead', 409);

  const r = await prisma.compliance_requirements.create({
    data: { location_id, category_id, required_quantity: +required_quantity, status: status || 'ACTIVE', notes: notes || null },
    include: INCLUDE,
  });
  log_activity({
    user_id, action: 'CREATE', entity_type: 'compliance_requirement', entity_id: r.id,
    description: `Requirement created: ${required_quantity} × ${r.category.name} at ${r.location.office}`,
  }).catch(() => {});
  return r;
}

export async function update_compliance_requirement(user_id, id, data) {
  const before = await get_compliance_requirement(id);
  const { required_quantity, status, notes } = data;
  const r = await prisma.compliance_requirements.update({
    where: { id },
    data: {
      required_quantity: required_quantity !== undefined ? +required_quantity : undefined,
      status: status !== undefined ? status : undefined,
      notes: notes !== undefined ? notes : undefined,
    },
    include: INCLUDE,
  });
  log_activity({
    user_id, action: 'UPDATE', entity_type: 'compliance_requirement', entity_id: id,
    description: `Requirement updated at ${before.location.office} (${before.category.name})`,
  }).catch(() => {});
  return r;
}

export async function delete_compliance_requirement(user_id, id) {
  const before = await get_compliance_requirement(id);
  await prisma.compliance_requirements.delete({ where: { id } });
  log_activity({
    user_id, action: 'DELETE', entity_type: 'compliance_requirement', entity_id: id,
    description: `Requirement removed: ${before.category.name} at ${before.location.office}`,
  }).catch(() => {});
}
