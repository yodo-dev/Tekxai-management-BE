import prisma from '../../../shared/database/client.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

// ─── Templates (generic — entity_type defaults to "asset", the only
// consumer wired up in this milestone, but nothing here constrains it) ──────

export async function list_checklist_templates({ entity_type, include_inactive = false } = {}) {
  const where = include_inactive ? {} : { is_active: true };
  if (entity_type) where.entity_type = entity_type;
  return prisma.checklist_templates.findMany({ where, orderBy: { label: 'asc' } });
}

export async function get_checklist_template(id) {
  const t = await prisma.checklist_templates.findUnique({ where: { id } });
  if (!t) throw app_error('Checklist template not found', 404);
  return t;
}

export async function create_checklist_template(user_id, data) {
  const { key, label, entity_type, items } = data;
  const t = await prisma.checklist_templates.create({
    data: { key, label, entity_type: entity_type || 'asset', items },
  });
  log_activity({ user_id, action: 'CREATE', entity_type: 'checklist_template', entity_id: t.id, description: `Checklist template created: ${label}` }).catch(() => {});
  return t;
}

export async function update_checklist_template(user_id, id, data) {
  const before = await get_checklist_template(id);
  const { label, items, is_active } = data;
  const t = await prisma.checklist_templates.update({
    where: { id },
    data: { label: label ?? undefined, items: items ?? undefined, is_active: is_active ?? undefined },
  });
  log_activity({ user_id, action: 'UPDATE', entity_type: 'checklist_template', entity_id: id, description: `Checklist template updated: ${before.label}` }).catch(() => {});
  return t;
}

// ─── Results (generic — entity_type/entity_id polymorphic, same convention
// as activity_logs/file_uploads) ─────────────────────────────────────────────

export async function list_checklist_results({ entity_type, entity_id, template_id } = {}) {
  const where = {};
  if (entity_type) where.entity_type = entity_type;
  if (entity_id) where.entity_id = entity_id;
  if (template_id) where.template_id = template_id;
  return prisma.checklist_results.findMany({
    where, orderBy: { checked_at: 'desc' },
    include: { template: { select: { id: true, label: true, entity_type: true } }, checker: { select: { id: true, first_name: true, last_name: true } } },
  });
}

export async function get_checklist_result(id) {
  const r = await prisma.checklist_results.findUnique({
    where: { id },
    include: { template: true, checker: { select: { id: true, first_name: true, last_name: true } } },
  });
  if (!r) throw app_error('Checklist result not found', 404);
  return r;
}

export async function submit_checklist_result(user_id, data) {
  const { entity_type, entity_id, template_id, results } = data;
  const template = await get_checklist_template(template_id);
  if (template.entity_type !== entity_type) {
    throw app_error(`This template is for "${template.entity_type}" entities, not "${entity_type}"`, 400);
  }

  const known_keys = new Set((template.items || []).map((i) => i.key));
  const unknown = Object.keys(results || {}).filter((k) => !known_keys.has(k));
  if (unknown.length) throw app_error(`Unknown checklist item(s): ${unknown.join(', ')}`, 400);

  const r = await prisma.checklist_results.create({
    data: { entity_type, entity_id, template_id, results: results || {}, checked_by: user_id },
    include: { template: { select: { id: true, label: true } } },
  });

  log_activity({
    user_id, action: 'CREATE', entity_type, entity_id,
    description: `Checklist submitted: ${template.label}`,
  }).catch(() => {});

  return r;
}
