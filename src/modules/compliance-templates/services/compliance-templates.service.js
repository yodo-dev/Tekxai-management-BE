import prisma from '../../../shared/database/client.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

// Only the latest version per `key` is shown by default — older versions stay
// in the table (immutable, referenced by past applications) but aren't
// offered for new applications.
export async function list_compliance_templates({ include_all_versions = false } = {}) {
  if (include_all_versions) {
    return prisma.compliance_requirement_templates.findMany({ orderBy: [{ key: 'asc' }, { version: 'desc' }] });
  }
  const all = await prisma.compliance_requirement_templates.findMany({ where: { is_active: true }, orderBy: { version: 'desc' } });
  const latest_by_key = new Map();
  for (const t of all) if (!latest_by_key.has(t.key)) latest_by_key.set(t.key, t);
  return [...latest_by_key.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export async function get_compliance_template(id) {
  const t = await prisma.compliance_requirement_templates.findUnique({ where: { id } });
  if (!t) throw app_error('Compliance template not found', 404);
  return t;
}

export async function create_compliance_template(user_id, data) {
  const { key, label, description, items } = data;
  const t = await prisma.compliance_requirement_templates.create({
    data: { key, label, description: description || null, items, version: 1 },
  });
  log_activity({ user_id, action: 'CREATE', entity_type: 'compliance_requirement_template', entity_id: t.id, description: `Template created: ${label} (v1)` }).catch(() => {});
  return t;
}

// Editing never mutates an existing version — it inserts a new version row
// under the same key, per the frozen architecture (applied locations keep
// referencing whichever version they used, unaffected by this).
export async function create_new_template_version(user_id, key, data) {
  const latest = await prisma.compliance_requirement_templates.findFirst({ where: { key }, orderBy: { version: 'desc' } });
  if (!latest) throw app_error('Template key not found', 404);
  const { label, description, items } = data;
  const t = await prisma.compliance_requirement_templates.create({
    data: {
      key,
      version: latest.version + 1,
      label: label ?? latest.label,
      description: description ?? latest.description,
      items: items ?? latest.items,
    },
  });
  log_activity({ user_id, action: 'CREATE', entity_type: 'compliance_requirement_template', entity_id: t.id, description: `New version created: ${t.label} (v${t.version})` }).catch(() => {});
  return t;
}

export async function set_template_active(user_id, id, is_active) {
  const t = await prisma.compliance_requirement_templates.update({ where: { id }, data: { is_active: !!is_active } });
  log_activity({ user_id, action: 'UPDATE', entity_type: 'compliance_requirement_template', entity_id: id, description: `Template ${is_active ? 'activated' : 'deactivated'}: ${t.label} v${t.version}` }).catch(() => {});
  return t;
}

// Applying a template is a one-time expansion, not a live link: it upserts
// compliance_requirements rows for the location, recording which
// template+version was used (informational only — editing the template
// later never touches these rows again).
export async function apply_template_to_location(user_id, template_id, location_id) {
  const template = await get_compliance_template(template_id);
  const location = await prisma.asset_locations.findUnique({ where: { id: location_id } });
  if (!location) throw app_error('Location not found', 404);

  const items = Array.isArray(template.items) ? template.items : [];
  const results = [];
  for (const item of items) {
    const row = await prisma.compliance_requirements.upsert({
      where: { location_id_category_id: { location_id, category_id: item.category_id } },
      update: {
        required_quantity: item.required_quantity,
        applied_template_id: template.id,
        applied_template_version: template.version,
      },
      create: {
        location_id,
        category_id: item.category_id,
        required_quantity: item.required_quantity,
        applied_template_id: template.id,
        applied_template_version: template.version,
      },
    });
    results.push(row);
  }

  log_activity({
    user_id, action: 'CREATE', entity_type: 'compliance_requirement_template', entity_id: template.id,
    description: `Applied "${template.label}" v${template.version} to ${location.office} (${results.length} requirement(s))`,
  }).catch(() => {});

  return { template, location, requirements: results };
}
