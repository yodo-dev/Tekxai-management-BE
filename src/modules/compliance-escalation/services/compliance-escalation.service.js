import prisma from '../../../shared/database/client.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';
import { create_notification } from '../../notifications/services/notifications.service.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

const MS_PER_DAY = 24 * 60 * 60 * 1000;
function days_between(from, to) {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}

// ── Escalation Policies CRUD ────────────────────────────────────────────────

export async function list_escalation_policies() {
  return prisma.escalation_policies.findMany({ orderBy: { key: 'asc' } });
}

export async function get_escalation_policy(id) {
  const p = await prisma.escalation_policies.findUnique({ where: { id } });
  if (!p) throw app_error('Escalation policy not found', 404);
  return p;
}

export async function create_escalation_policy(user_id, data) {
  const existing = await prisma.escalation_policies.findUnique({ where: { key: data.key } });
  if (existing) throw app_error('An escalation policy with this key already exists — edit it instead', 409);

  const policy = await prisma.escalation_policies.create({
    data: {
      key: data.key,
      label: data.label,
      stages: data.stages,
      is_active: data.is_active !== undefined ? data.is_active : true,
    },
  });
  log_activity({
    user_id, action: 'CREATE', entity_type: 'escalation_policy', entity_id: policy.id,
    description: `Escalation policy created: ${policy.label}`,
  }).catch(() => {});
  return policy;
}

export async function update_escalation_policy(user_id, id, data) {
  const before = await get_escalation_policy(id);
  const policy = await prisma.escalation_policies.update({
    where: { id },
    data: {
      label: data.label !== undefined ? data.label : undefined,
      stages: data.stages !== undefined ? data.stages : undefined,
      is_active: data.is_active !== undefined ? data.is_active : undefined,
    },
  });
  log_activity({
    user_id, action: 'UPDATE', entity_type: 'escalation_policy', entity_id: id,
    description: `Escalation policy updated: ${before.label}`,
  }).catch(() => {});
  return policy;
}

export async function delete_escalation_policy(user_id, id) {
  const before = await get_escalation_policy(id);
  await prisma.escalation_policies.delete({ where: { id } });
  log_activity({
    user_id, action: 'DELETE', entity_type: 'escalation_policy', entity_id: id,
    description: `Escalation policy removed: ${before.label}`,
  }).catch(() => {});
}

export async function list_escalation_history({ entity_type, alert_type, page = 1, limit = 50 } = {}) {
  page = +page || 1; limit = +limit || 50;
  const where = {};
  if (entity_type) where.entity_type = entity_type;
  if (alert_type) where.alert_type = alert_type;
  const [total, records] = await Promise.all([
    prisma.compliance_escalations.count({ where }),
    prisma.compliance_escalations.findMany({
      where, skip: (page - 1) * limit, take: limit, orderBy: { last_escalated_at: 'desc' },
    }),
  ]);
  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

// ── Escalation Engine ────────────────────────────────────────────────────────

async function notify_admins(title, message) {
  const admins = await prisma.users.findMany({
    where: { is_active: true, roles: { some: { role: { name: { in: ['ADMIN', 'SUPER_ADMIN'] } } } } },
    select: { id: true },
  });
  for (const admin of admins) {
    await create_notification({ user_id: admin.id, title, message, type: 'COMPLIANCE' }).catch(() => null);
  }
  return admins[0]?.id || null;
}

// Returns a user id suitable for attributing the activity-log entry to —
// the assignee if there is one, otherwise the first notified admin, since
// activity_logs.user_id is a required FK and an escalation with no assignee
// (e.g. a compliance requirement deviation) still needs *some* actor.
async function apply_stage_notifications(stage, { assignee_id, title, message }) {
  let fallback_actor_id = null;
  for (const target of stage.notify) {
    if (target === 'ADMIN') {
      fallback_actor_id = (await notify_admins(title, message)) || fallback_actor_id;
    } else if (target === 'ASSIGNEE' && assignee_id) {
      await create_notification({ user_id: assignee_id, title, message, type: 'COMPLIANCE' }).catch(() => null);
    } else if (target === 'SUPERVISOR' && assignee_id) {
      const assignee = await prisma.users.findUnique({ where: { id: assignee_id }, select: { supervisor_id: true } });
      if (assignee?.supervisor_id) {
        await create_notification({ user_id: assignee.supervisor_id, title, message, type: 'COMPLIANCE' }).catch(() => null);
      }
    }
  }
  return assignee_id || fallback_actor_id;
}

// Picks the highest stage whose day_threshold has been reached, so a job that
// misses a day (downtime, etc.) still lands on the correct stage next run
// rather than replaying every earlier one.
export function resolve_reached_stage(stages, days_elapsed) {
  const sorted = [...stages].sort((a, b) => a.day_threshold - b.day_threshold);
  let reached = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (days_elapsed >= sorted[i].day_threshold) reached = i;
  }
  return { index: reached, stage: reached >= 0 ? sorted[reached] : null, sorted };
}

// entity_type/entity_id/alert_type uniquely key a compliance_escalations row
// (@@unique in schema) so re-running the job never double-fires a stage —
// stage_reached is only ever moved forward, never re-notified for the same index.
async function escalate_entity({ entity_type, entity_id, alert_type, days_elapsed, policy, assignee_id, subject }) {
  const { index, stage } = resolve_reached_stage(policy.stages, days_elapsed);
  if (index < 0) return false;

  const tracker = await prisma.compliance_escalations.findUnique({
    where: { entity_type_entity_id_alert_type: { entity_type, entity_id, alert_type } },
  });

  if (tracker && tracker.stage_reached >= index + 1) return false; // already escalated to this stage or beyond

  const title = `${policy.label} — Stage ${index + 1}`;
  const message = `${subject} is ${days_elapsed} day(s) overdue (stage ${index + 1} of ${policy.stages.length}).`;

  const actor_id = await apply_stage_notifications(stage, { assignee_id, title, message });

  await prisma.compliance_escalations.upsert({
    where: { entity_type_entity_id_alert_type: { entity_type, entity_id, alert_type } },
    update: { stage_reached: index + 1, last_escalated_at: new Date() },
    create: { entity_type, entity_id, alert_type, stage_reached: index + 1, last_escalated_at: new Date() },
  });

  if (actor_id) {
    await log_activity({
      user_id: actor_id, action: 'UPDATE', entity_type, entity_id,
      description: `${title}: ${message}`,
    }).catch(() => {});
  }

  return true;
}

async function run_inspection_overdue_escalation(policy) {
  const now = new Date();
  const inspections = await prisma.asset_inspections.findMany({
    where: { status: { in: ['PENDING', 'OVERDUE'] }, due_date: { lt: now } },
    include: { asset: { select: { name: true, asset_tag: true } } },
  });

  let escalated = 0;
  for (const inspection of inspections) {
    if (inspection.status !== 'OVERDUE') {
      await prisma.asset_inspections.update({ where: { id: inspection.id }, data: { status: 'OVERDUE' } }).catch(() => null);
    }
    const days_elapsed = days_between(inspection.due_date, now);
    const fired = await escalate_entity({
      entity_type: 'asset_inspection',
      entity_id: inspection.id,
      alert_type: 'INSPECTION_OVERDUE',
      days_elapsed,
      policy,
      assignee_id: inspection.assigned_to,
      subject: `Inspection for ${inspection.asset?.name || 'asset'} (${inspection.asset?.asset_tag || inspection.asset_id})`,
    });
    if (fired) escalated += 1;
  }
  return { checked: inspections.length, escalated };
}

async function run_requirement_unresolved_escalation(policy) {
  const now = new Date();
  const requirements = await prisma.compliance_requirements.findMany({
    where: { status: { in: ['UNDER_MAINTENANCE', 'TEMPORARILY_DISABLED'] } },
    include: {
      location: { select: { office: true } },
      category: { select: { name: true } },
    },
  });

  let escalated = 0;
  for (const req of requirements) {
    const days_elapsed = days_between(req.updated_at, now);
    const fired = await escalate_entity({
      entity_type: 'compliance_requirement',
      entity_id: req.id,
      alert_type: 'COMPLIANCE_REQUIREMENT_UNRESOLVED',
      days_elapsed,
      policy,
      assignee_id: null,
      subject: `${req.category?.name || 'Requirement'} at ${req.location?.office || 'location'} (status: ${req.status})`,
    });
    if (fired) escalated += 1;
  }
  return { checked: requirements.length, escalated };
}

// ── Ticket SLA runners — reuse the same generic engine/tables. day_threshold
// in the policy stages is "days past the SLA due date", so a stage with
// day_threshold 0 fires on the first run after the breach. ─────────────────

function make_ticket_sla_runner(alert_type, due_field, label) {
  return async function run(policy) {
    const now = new Date();
    const tickets = await prisma.support_tickets.findMany({
      where: { closed_at: null, [due_field]: { lt: now } },
      select: { id: true, ticket_number: true, subject: true, assignee_id: true, [due_field]: true },
    });

    let escalated = 0;
    for (const ticket of tickets) {
      const days_elapsed = days_between(ticket[due_field], now);
      const fired = await escalate_entity({
        entity_type: 'ticket',
        entity_id: ticket.id,
        alert_type,
        days_elapsed,
        policy,
        assignee_id: ticket.assignee_id,
        subject: `${label} SLA for ticket ${ticket.ticket_number} (${ticket.subject})`,
      });
      if (fired) escalated += 1;
    }
    return { checked: tickets.length, escalated };
  };
}

const run_ticket_response_sla_escalation = make_ticket_sla_runner('TICKET_RESPONSE_SLA_BREACH', 'response_due_at', 'Response');
const run_ticket_resolution_sla_escalation = make_ticket_sla_runner('TICKET_RESOLUTION_SLA_BREACH', 'resolution_due_at', 'Resolution');

const TICKET_SLA_KEYS = ['TICKET_RESPONSE_SLA_BREACH', 'TICKET_RESOLUTION_SLA_BREACH'];

const ALERT_TYPE_RUNNERS = {
  INSPECTION_OVERDUE: run_inspection_overdue_escalation,
  COMPLIANCE_REQUIREMENT_UNRESOLVED: run_requirement_unresolved_escalation,
  TICKET_RESPONSE_SLA_BREACH: run_ticket_response_sla_escalation,
  TICKET_RESOLUTION_SLA_BREACH: run_ticket_resolution_sla_escalation,
};

// Ticket SLAs are minute-granularity, so the scheduler runs this filtered
// entry point far more often than the daily compliance sweep. Same engine,
// same idempotent stage tracking — just a narrower policy set.
export async function run_ticket_sla_escalation() {
  const policies = await prisma.escalation_policies.findMany({ where: { is_active: true } });
  const results = {};
  for (const policy of policies) {
    const key = policy.key.toUpperCase();
    if (!TICKET_SLA_KEYS.includes(key)) continue;
    results[policy.key] = await ALERT_TYPE_RUNNERS[key](policy);
  }
  return results;
}

// Single entry point used by both the daily scheduler job and the manual
// "run now" endpoint, so there is exactly one escalation code path.
export async function run_compliance_escalation() {
  const policies = await prisma.escalation_policies.findMany({ where: { is_active: true } });
  const results = {};

  for (const policy of policies) {
    const runner = ALERT_TYPE_RUNNERS[policy.key.toUpperCase()] || ALERT_TYPE_RUNNERS[policy.key];
    if (!runner) continue;
    results[policy.key] = await runner(policy);
  }

  return results;
}
