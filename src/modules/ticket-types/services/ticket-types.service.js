import prisma from '../../../shared/database/client.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

const TYPE_INCLUDE = {
  category: { select: { id: true, key: true, label: true } },
  department: { select: { id: true, name: true } },
  default_assignee: { select: { id: true, first_name: true, last_name: true } },
  default_team: { select: { id: true, name: true } },
};

export async function list_ticket_types({ category_id, include_inactive = false } = {}) {
  const where = include_inactive ? {} : { is_active: true };
  if (category_id) where.category_id = category_id;
  return prisma.ticket_types.findMany({
    where, take: 500, orderBy: [{ sort_order: 'asc' }, { label: 'asc' }], include: TYPE_INCLUDE,
  });
}

export async function get_ticket_type(id) {
  const t = await prisma.ticket_types.findUnique({ where: { id }, include: TYPE_INCLUDE });
  if (!t) throw app_error('Ticket type not found', 404);
  return t;
}

export async function create_ticket_type(data) {
  const {
    key, label, description, category_id, department_id, default_assignee_id, default_team_id,
    project_association, field_schema, workflow, response_sla_mins, resolution_sla_mins,
    integration_hooks, sort_order,
  } = data;
  return prisma.ticket_types.create({
    data: {
      key, label, description,
      category_id,
      department_id: department_id || null,
      default_assignee_id: default_assignee_id || null,
      default_team_id: default_team_id || null,
      project_association: project_association || 'NONE',
      field_schema, workflow,
      response_sla_mins: response_sla_mins ?? null,
      resolution_sla_mins: resolution_sla_mins ?? null,
      integration_hooks: integration_hooks ?? undefined,
      sort_order: sort_order ?? 0,
    },
    include: TYPE_INCLUDE,
  });
}

export async function update_ticket_type(id, data) {
  await get_ticket_type(id);
  const {
    label, description, category_id, department_id, default_assignee_id, default_team_id,
    project_association, field_schema, workflow, response_sla_mins, resolution_sla_mins,
    integration_hooks, sort_order, is_active,
  } = data;
  return prisma.ticket_types.update({
    where: { id },
    data: {
      label: label ?? undefined,
      description: description ?? undefined,
      category_id: category_id ?? undefined,
      department_id: department_id !== undefined ? (department_id || null) : undefined,
      default_assignee_id: default_assignee_id !== undefined ? (default_assignee_id || null) : undefined,
      default_team_id: default_team_id !== undefined ? (default_team_id || null) : undefined,
      project_association: project_association ?? undefined,
      field_schema: field_schema ?? undefined,
      workflow: workflow ?? undefined,
      response_sla_mins: response_sla_mins ?? undefined,
      resolution_sla_mins: resolution_sla_mins ?? undefined,
      integration_hooks: integration_hooks ?? undefined,
      sort_order: sort_order ?? undefined,
      is_active: is_active ?? undefined,
    },
    include: TYPE_INCLUDE,
  });
}

export async function set_ticket_type_active(id, is_active) {
  await get_ticket_type(id);
  return prisma.ticket_types.update({ where: { id }, data: { is_active: !!is_active }, include: TYPE_INCLUDE });
}
