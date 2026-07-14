import prisma from '../../../shared/database/client.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';
import { validate_custom_fields, validate_workflow_transition } from '../../ticket-types/validators/ticket-types.validation.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

async function next_ticket_number() {
  const last = await prisma.support_tickets.findFirst({ orderBy: { created_at: 'desc' } });
  if (!last) return 'TKT-1001';
  const num = parseInt(last.ticket_number.replace('TKT-', ''), 10) || 1000;
  return `TKT-${num + 1}`;
}

const USER_SELECT = { id: true, first_name: true, last_name: true, email: true, avatar: true };

async function get_replies_for(ticket_id) {
  return prisma.ticket_replies.findMany({
    take: 500,
    where: { ticket_id },
    include: { user: { select: USER_SELECT } },
    orderBy: { created_at: 'asc' },
  });
}

async function get_attachments_for(entity_id) {
  return prisma.file_uploads.findMany({
    take: 500,
    where: { entity_type: 'ticket', entity_id },
    select: { id: true, file_name: true, file_key: true, mime_type: true, file_size: true, created_at: true },
    orderBy: { created_at: 'asc' },
  });
}

async function get_approvals_for(ticket_id) {
  return prisma.ticket_approvals.findMany({
    where: { ticket_id },
    orderBy: { created_at: 'asc' },
    include: { approver: { select: USER_SELECT } },
  });
}

function notify(user_id, title, message, type = 'TICKET') {
  if (!user_id) return;
  prisma.notifications.create({ data: { user_id, title, message, type } }).catch(() => null);
}

function log(user_id, action, entity_id, description) {
  log_activity({ user_id, action, entity_type: 'ticket', entity_id, description }).catch(() => null);
}

const INCLUDE = {
  user: { select: USER_SELECT },
  department: { select: { id: true, name: true } },
  ticket_type: { select: { id: true, key: true, label: true, category: { select: { id: true, key: true, label: true } } } },
  assignee: { select: USER_SELECT },
  approver: { select: USER_SELECT },
  team: { select: { id: true, name: true } },
  project: { select: { id: true, title: true } },
  asset: { select: { id: true, asset_tag: true, name: true } },
};

export async function list_tickets({
  user_id, is_admin = false, status, priority, category_id, ticket_type_id, department_id,
  assignee_id, team_id, project_id, asset_id, severity, approval_status, sla, page = 1, limit = 20,
} = {}) {
  page = +page || 1; limit = +limit || 20;
  const skip = (page - 1) * limit;
  const where = {};
  if (!is_admin) where.user_id = user_id;
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (category_id) where.ticket_type = { category_id };
  if (ticket_type_id) where.ticket_type_id = ticket_type_id;
  if (department_id) where.department_id = department_id;
  if (assignee_id) where.assignee_id = assignee_id;
  if (team_id) where.team_id = team_id;
  if (project_id) where.project_id = project_id;
  if (asset_id) where.asset_id = asset_id;
  if (severity) where.severity = severity;
  if (approval_status) where.approval_status = approval_status;
  if (sla === 'overdue') {
    where.closed_at = null;
    where.OR = [{ response_due_at: { lt: new Date() } }, { resolution_due_at: { lt: new Date() } }];
  }

  const [total, records] = await Promise.all([
    prisma.support_tickets.count({ where }),
    prisma.support_tickets.findMany({
      where, skip, take: limit,
      orderBy: { created_at: 'desc' },
      include: INCLUDE,
    }),
  ]);

  return { records: records.map((t) => normalize_ticket(t)), total, page, limit, pages: Math.ceil(total / limit) };
}

export async function get_ticket(id, user_id, is_admin) {
  const t = await prisma.support_tickets.findUnique({ where: { id }, include: INCLUDE });
  if (!t) throw app_error('Ticket not found', 404);
  if (!is_admin && t.user_id !== user_id) throw app_error('Forbidden', 403);
  const [attachments, replies, approvals] = await Promise.all([
    get_attachments_for(id), get_replies_for(id), get_approvals_for(id),
  ]);
  return normalize_ticket(t, attachments, replies, approvals);
}

export async function add_ticket_reply(ticket_id, user_id, is_admin, { message }) {
  const t = await prisma.support_tickets.findUnique({ where: { id: ticket_id } });
  if (!t) throw app_error('Ticket not found', 404);
  if (!is_admin && t.user_id !== user_id) throw app_error('Forbidden', 403);
  if (!message?.trim()) throw app_error('Message is required');

  const reply = await prisma.ticket_replies.create({
    data: { ticket_id, user_id, message: message.trim(), is_admin_reply: is_admin },
    include: { user: { select: USER_SELECT } },
  });

  // Auto move to in_progress when admin replies on pending ticket
  if (is_admin && t.status === 'pending') {
    await prisma.support_tickets.update({ where: { id: ticket_id }, data: { status: 'in_progress' } });
  }

  log(user_id, 'CREATE', ticket_id, `Replied to ticket ${t.ticket_number}`);
  if (t.user_id !== user_id) notify(t.user_id, 'New reply on your ticket', `${t.ticket_number}: ${message.trim().slice(0, 120)}`);

  return reply;
}

export async function add_ticket_attachment(ticket_id, user_id, is_admin, { file_key, file_name, file_size, mime_type }) {
  const t = await prisma.support_tickets.findUnique({ where: { id: ticket_id } });
  if (!t) throw app_error('Ticket not found', 404);
  if (!is_admin && t.user_id !== user_id) throw app_error('Forbidden', 403);
  const attachment = await prisma.file_uploads.create({
    data: { user_id, entity_type: 'ticket', entity_id: ticket_id, file_key, file_name, file_size: file_size || 0, mime_type, is_public: false },
  });
  log(user_id, 'CREATE', ticket_id, `Added attachment "${file_name}" to ticket ${t.ticket_number}`);
  return attachment;
}

export async function get_ticket_stats() {
  const [by_status, by_type] = await Promise.all([
    prisma.support_tickets.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.support_tickets.groupBy({ by: ['ticket_type_id'], _count: { id: true } }),
  ]);
  const status_map = {};
  for (const r of by_status) status_map[r.status] = r._count.id;
  const type_map = {};
  for (const r of by_type) if (r.ticket_type_id) type_map[r.ticket_type_id] = r._count.id;
  return { by_status: status_map, by_type: type_map, total: Object.values(status_map).reduce((s, v) => s + v, 0) };
}

// ─── Creation ────────────────────────────────────────────────────────────────

export async function create_ticket({
  user_id, is_admin, subject, description, category, department_id, recipient_role, recipient_label,
  recipient_name, priority, severity, ticket_type_id, project_id, asset_id, custom_fields,
  assignee_id, team_id,
}) {
  const ticket_number = await next_ticket_number();

  // Legacy path — no ticket_type_id: behaves exactly as before this feature existed.
  if (!ticket_type_id) {
    const ticket = await prisma.support_tickets.create({
      data: { ticket_number, subject, description, category, department_id, recipient_role, recipient_label, recipient_name, priority, user_id },
      include: INCLUDE,
    });
    log(user_id, 'CREATE', ticket.id, `Created ticket ${ticket_number}: ${subject}`);
    return normalize_ticket(ticket);
  }

  // Service Desk path
  const type = await prisma.ticket_types.findUnique({
    where: { id: ticket_type_id },
    include: { category: true },
  });
  if (!type || !type.is_active) throw app_error('Ticket type not found or inactive', 404);

  const { valid, message } = validate_custom_fields(type.field_schema, custom_fields || {});
  if (!valid) throw app_error(message, 400);

  if (type.project_association === 'REQUIRED' && !project_id) {
    throw app_error('This ticket type requires a project', 400);
  }

  const workflow = Array.isArray(type.workflow) ? type.workflow : [];
  const initial_status = workflow[0]?.key || 'pending';

  const type_snapshot = {
    type_id: type.id,
    type_name: type.label,
    category_id: type.category_id,
    category_name: type.category?.label || null,
    field_schema: type.field_schema,
    workflow: type.workflow,
  };

  const now = Date.now();
  const response_due_at = type.response_sla_mins ? new Date(now + type.response_sla_mins * 60000) : null;
  const resolution_due_at = type.resolution_sla_mins ? new Date(now + type.resolution_sla_mins * 60000) : null;

  // Auto-fill from the type's defaults; only an admin/HR caller may override.
  const final_department_id = (is_admin && department_id) || type.department_id || null;
  const final_team_id = (is_admin && team_id) || type.default_team_id || null;
  const final_assignee_id = (is_admin && assignee_id) || type.default_assignee_id || null;

  const ticket = await prisma.support_tickets.create({
    data: {
      ticket_number, subject, description,
      category: type.category?.key || category || null,
      department_id: final_department_id,
      recipient_role: recipient_role || 'other',
      recipient_label: recipient_label || type.label,
      recipient_name: recipient_name || type.label,
      priority: priority || 'medium',
      severity: severity || null,
      user_id,
      status: initial_status,
      ticket_type_id: type.id,
      project_id: project_id || null,
      asset_id: asset_id || null,
      custom_fields: custom_fields || {},
      response_due_at, resolution_due_at,
      assignee_id: final_assignee_id,
      team_id: final_team_id,
      type_snapshot,
    },
    include: INCLUDE,
  });

  log(user_id, 'CREATE', ticket.id, `Created ${type.label} ticket ${ticket_number}: ${subject}`);
  const notify_target = final_assignee_id || (final_department_id
    ? (await prisma.departments.findUnique({ where: { id: final_department_id }, select: { manager_id: true } }))?.manager_id
    : null);
  notify(notify_target, `New ${type.label} ticket assigned`, `${ticket_number}: ${subject}`);

  return normalize_ticket(ticket);
}

// ─── Update / Workflow ───────────────────────────────────────────────────────

export async function update_ticket(id, actor_id, {
  status, resolution_note, assignee_id, team_id, project_id, asset_id, severity, priority,
}) {
  const t = await prisma.support_tickets.findUnique({ where: { id } });
  if (!t) throw app_error('Ticket not found', 404);

  const data = {};
  if (resolution_note) data.resolution_note = resolution_note;
  if (severity !== undefined) data.severity = severity;
  if (priority !== undefined) data.priority = priority;
  if (project_id !== undefined) data.project_id = project_id || null;
  if (asset_id !== undefined) data.asset_id = asset_id || null;

  if (status !== undefined && status !== t.status) {
    const workflow = t.type_snapshot?.workflow;
    if (workflow) {
      const { valid, message, target_step } = validate_workflow_transition(workflow, t.status, status);
      if (!valid) throw app_error(message, 400);
      data.status = status;
      if (target_step && workflow[workflow.length - 1]?.key === target_step.key) {
        data.closed_at = new Date();
      }
    } else {
      // Legacy ticket with no configured workflow — unchanged free-status behavior.
      data.status = status;
      if (status === 'resolved') data.resolved_at = new Date();
    }
  }

  if (assignee_id !== undefined && assignee_id !== t.assignee_id) {
    data.assignee_id = assignee_id || null;
  }
  if (team_id !== undefined && team_id !== t.team_id) {
    data.team_id = team_id || null;
  }

  const updated = await prisma.support_tickets.update({ where: { id }, data, include: INCLUDE });

  if (data.status) log(actor_id, 'UPDATE', id, `Status changed from ${t.status} to ${data.status} on ticket ${t.ticket_number}`);
  if (data.assignee_id !== undefined) {
    log(actor_id, 'UPDATE', id, `Reassigned ticket ${t.ticket_number}`);
    notify(data.assignee_id, 'Ticket assigned to you', `${t.ticket_number}: ${t.subject}`);
  }
  if (data.team_id !== undefined) log(actor_id, 'UPDATE', id, `Team changed on ticket ${t.ticket_number}`);
  if (data.closed_at) {
    log(actor_id, 'UPDATE', id, `Closed ticket ${t.ticket_number}`);
    notify(t.user_id, 'Ticket closed', `${t.ticket_number}: ${t.subject}`);
  } else if (data.status) {
    notify(t.user_id, 'Ticket status updated', `${t.ticket_number} is now ${data.status}`);
  }

  return normalize_ticket(updated);
}

// Legacy alias — kept so the pre-existing PATCH behavior (status + resolution_note
// only, on tickets without a ticket_type) is unaffected by signature changes above.
export async function update_ticket_status(id, actor_id, body) {
  return update_ticket(id, actor_id, body);
}

// ─── Approvals — mirrors requisition_approvals' exact pattern ───────────────

export async function record_ticket_approval(ticket_id, approver_id, { action, comment }) {
  if (!['APPROVE', 'REJECT'].includes(action)) throw app_error('action must be APPROVE or REJECT', 400);

  const t = await prisma.support_tickets.findUnique({ where: { id: ticket_id } });
  if (!t) throw app_error('Ticket not found', 404);

  const workflow = t.type_snapshot?.workflow;
  if (!workflow) throw app_error('This ticket has no configured workflow', 400);

  const current_step = workflow.find((s) => s.key === t.status);
  if (!current_step?.requires_approval) throw app_error('Invalid approval stage: current status does not require approval', 400);

  const current_index = workflow.findIndex((s) => s.key === t.status);
  const next_step = workflow[current_index + 1];
  const new_status = action === 'APPROVE' ? (next_step?.key || t.status) : t.status;
  const is_closing = action === 'APPROVE' && next_step && workflow[workflow.length - 1].key === next_step.key;

  const [approval, updated] = await prisma.$transaction([
    prisma.ticket_approvals.create({
      data: { ticket_id, approver_id, action, comment: comment || null, stage: t.status },
    }),
    prisma.support_tickets.update({
      where: { id: ticket_id },
      data: {
        approval_status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        approved_by: approver_id,
        approved_at: new Date(),
        status: new_status,
        closed_at: is_closing ? new Date() : undefined,
      },
      include: INCLUDE,
    }),
  ]);

  log(approver_id, 'UPDATE', ticket_id,
    `${action === 'APPROVE' ? 'Approved' : 'Rejected'} "${current_step.label}" on ticket ${t.ticket_number}${comment ? `: ${comment}` : ''}`);
  notify(t.user_id, `Ticket ${action === 'APPROVE' ? 'approved' : 'rejected'}`, `${t.ticket_number}: ${current_step.label} ${action === 'APPROVE' ? 'approved' : 'rejected'}`);

  return { approval, ticket: normalize_ticket(updated) };
}

export async function get_ticket_approvals(ticket_id) {
  return get_approvals_for(ticket_id);
}

function normalize_ticket(t, attachments = [], replies = [], approvals = []) {
  return {
    id: t.id,
    ticketNumber: t.ticket_number,
    ticket_number: t.ticket_number,
    subject: t.subject,
    description: t.description,
    category: t.category,
    departmentId: t.department_id,
    department: t.department || null,
    recipientRole: t.recipient_role,
    recipientLabel: t.recipient_label,
    recipientName: t.recipient_name,
    status: t.status,
    priority: t.priority,
    severity: t.severity,
    createdAt: t.created_at,
    resolvedAt: t.resolved_at,
    closedAt: t.closed_at,
    resolutionNote: t.resolution_note,
    createdBy: t.user ? `${t.user.first_name} ${t.user.last_name}` : 'Unknown',
    createdByEmail: t.user?.email || '',
    user: t.user,
    ticketType: t.ticket_type || null,
    assignee: t.assignee || null,
    team: t.team || null,
    project: t.project || null,
    asset: t.asset || null,
    customFields: t.custom_fields || null,
    typeSnapshot: t.type_snapshot || null,
    responseDueAt: t.response_due_at,
    resolutionDueAt: t.resolution_due_at,
    approvalStatus: t.approval_status,
    approvedBy: t.approver || null,
    approvedAt: t.approved_at,
    attachments,
    replies,
    approvals,
  };
}
