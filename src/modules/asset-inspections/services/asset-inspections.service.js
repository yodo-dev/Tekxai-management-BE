import prisma from '../../../shared/database/client.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

const INCLUDE = {
  asset: { select: { id: true, name: true, asset_tag: true, category: { select: { name: true } } } },
  assignee: { select: { id: true, first_name: true, last_name: true } },
  completer: { select: { id: true, first_name: true, last_name: true } },
  checklist_result: { select: { id: true, template_id: true } },
};

export async function list_asset_inspections({ asset_id, assigned_to, status, page = 1, limit = 50 } = {}) {
  page = +page || 1; limit = +limit || 50;
  const where = {};
  if (asset_id) where.asset_id = asset_id;
  if (assigned_to) where.assigned_to = assigned_to;
  if (status) where.status = status;

  const [total, records] = await Promise.all([
    prisma.asset_inspections.count({ where }),
    prisma.asset_inspections.findMany({ where, skip: (page - 1) * limit, take: limit, include: INCLUDE, orderBy: { due_date: 'asc' } }),
  ]);
  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

// Full history for one asset — reuses the same table, no separate history store.
export async function get_asset_inspection_history(asset_id) {
  return prisma.asset_inspections.findMany({ where: { asset_id }, include: INCLUDE, orderBy: { due_date: 'desc' } });
}

export async function get_asset_inspection(id) {
  const i = await prisma.asset_inspections.findUnique({ where: { id }, include: INCLUDE });
  if (!i) throw app_error('Inspection not found', 404);
  return i;
}

export async function create_asset_inspection(user_id, data) {
  const { asset_id, assigned_to, due_date } = data;
  const asset = await prisma.assets.findFirst({ where: { id: asset_id, deleted_at: null } });
  if (!asset) throw app_error('Asset not found', 404);

  const i = await prisma.asset_inspections.create({
    data: { asset_id, assigned_to, due_date: new Date(due_date), status: 'PENDING' },
    include: INCLUDE,
  });
  log_activity({
    user_id, action: 'CREATE', entity_type: 'asset_inspection', entity_id: i.id,
    description: `Inspection scheduled for ${asset.name} — due ${new Date(due_date).toLocaleDateString()}`,
  }).catch(() => {});
  return i;
}

export async function update_asset_inspection(user_id, id, data) {
  const before = await get_asset_inspection(id);
  const { assigned_to, due_date, status } = data;
  const i = await prisma.asset_inspections.update({
    where: { id },
    data: {
      assigned_to: assigned_to ?? undefined,
      due_date: due_date ? new Date(due_date) : undefined,
      status: status ?? undefined,
    },
    include: INCLUDE,
  });
  log_activity({
    user_id, action: 'UPDATE', entity_type: 'asset_inspection', entity_id: id,
    description: `Inspection updated for ${before.asset.name}`,
  }).catch(() => {});
  return i;
}

// Completing an inspection is the one place that updates the asset's
// denormalized last/next inspection dates — reuses the asset's own
// inspection_frequency_days (falling back to its category's default) rather
// than duplicating that logic anywhere else.
export async function complete_asset_inspection(user_id, id, { checklist_result_id, notes } = {}) {
  const inspection = await get_asset_inspection(id);
  if (inspection.status === 'COMPLETED') throw app_error('Inspection already completed', 400);

  const asset = await prisma.assets.findUnique({ where: { id: inspection.asset_id }, include: { category: true } });
  const frequency_days = asset.inspection_frequency_days ?? asset.category.default_inspection_frequency_days ?? null;
  const completed_at = new Date();
  const next_inspection_at = frequency_days ? new Date(completed_at.getTime() + frequency_days * 86400000) : null;

  const [updated_inspection] = await prisma.$transaction([
    prisma.asset_inspections.update({
      where: { id },
      data: { status: 'COMPLETED', completed_by: user_id, completed_at, checklist_result_id: checklist_result_id || undefined },
      include: INCLUDE,
    }),
    prisma.assets.update({
      where: { id: asset.id },
      data: { last_inspection_at: completed_at, next_inspection_at },
    }),
    // Completing an inspection is itself a maintenance event — reuses the
    // existing maintenance log table rather than a separate history store.
    prisma.asset_maintenance_logs.create({
      data: {
        asset_id: asset.id,
        type: 'INSPECTION',
        description: notes || `Inspection completed`,
        performed_by: user_id,
        performed_at: completed_at,
        next_due_date: next_inspection_at,
      },
    }),
  ]);

  log_activity({
    user_id, action: 'UPDATE', entity_type: 'asset_inspection', entity_id: id,
    description: `Inspection completed for ${asset.name}${next_inspection_at ? ` — next due ${next_inspection_at.toLocaleDateString()}` : ''}`,
  }).catch(() => {});

  return updated_inspection;
}
