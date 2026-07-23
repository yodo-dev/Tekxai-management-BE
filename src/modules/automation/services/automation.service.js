import prisma from '../../../shared/database/client.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';
import { RULES } from '../constants/rules.js';
import { generate_document } from '../../hr-documents/services/hr-documents.service.js';

// Automation Engine — Milestone 1 seed (+ HR-document lifecycle automation).
//
// This is deliberately NOT a generic rule dispatcher. It's named functions,
// one per in-scope rule, each doing exactly what that rule requires and
// nothing more. The real engine (Document 1 §10) is a future milestone;
// these functions are the seam it will eventually plug into — callers invoke
// them by name from the exact point in the codebase where the corresponding
// trigger actually happens.

async function get_employee_and_supervisor(user_id) {
  return prisma.users.findUnique({
    where: { id: user_id },
    select: { supervisor_id: true, first_name: true, last_name: true },
  });
}

function display_name(employee) {
  return `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || 'The employee';
}

// Onboarding contract auto-generation — looked up by seeded code, not id, so
// the automation degrades gracefully (skips, doesn't throw) if HR ever
// deactivates/renames the seed rows. Idempotent: skips if this employee
// already has an Employment Contract document (re-running trigger_employee_created
// for the same user, e.g. a retry, must never generate a second contract).
async function auto_generate_employment_contract(user_id, actor_user_id) {
  const type = await prisma.hr_document_types.findFirst({
    where: { code: 'EMPLOYMENT_CONTRACT', category: { code: 'EMPLOYMENT' } },
    select: { id: true, category_id: true },
  });
  if (!type) return; // seed data missing/renamed — non-fatal, contract just isn't auto-created

  const existing = await prisma.hr_documents.findFirst({
    where: { user_id, type_id: type.id },
    select: { id: true },
  });
  if (existing) return;

  await generate_document({
    user_id,
    category_id: type.category_id,
    type_id: type.id,
    raw_content:
      'Dear {{employee_name}},\n\n' +
      'We are pleased to confirm your employment with {{company_name}} as {{designation}} in the {{department_name}} department, effective {{hire_date}}.\n\n' +
      'Your reporting manager is {{manager_name}}.\n\n' +
      'This document was generated automatically as part of your onboarding.',
    title: 'Employment Contract',
    created_by: actor_user_id || user_id,
  });
}

// Rule #1 — Employee Created. Fires once the new user and their ONBOARDING
// lifecycle stage are both established. ONBOARDING is itself one of
// employee-lifecycle.service.js's NOTIFY_STAGES, so set_lifecycle_stage()
// already sends the supervisor a lifecycle notification for this exact
// transition — this function does not send a second one (same no-double-
// notify design as trigger_employee_confirmed below). It only writes the
// additional `employee.created` Timeline entry, giving Automation a
// visible, distinct marker that it ran.
export async function trigger_employee_created(user_id, actor_user_id) {
  const rule = RULES.EMPLOYEE_CREATED;
  const employee = await get_employee_and_supervisor(user_id);
  const employee_name = display_name(employee);

  await log_activity({
    user_id: actor_user_id || user_id,
    action: 'CREATE',
    entity_type: 'employee',
    entity_id: user_id,
    description: `Automation: ${rule.timeline_event} — ${employee_name} created.`,
  }).catch(() => {});

  await auto_generate_employment_contract(user_id, actor_user_id).catch(() => {});
}

// Confirmation letter auto-generation — same idempotent-by-seeded-code shape
// as auto_generate_employment_contract above: skips (non-fatal) if the seed
// type is missing/renamed, skips if this employee already has one (re-firing
// trigger_employee_confirmed for the same user must never generate a second
// letter, e.g. if HR moves ACTIVE_EMPLOYMENT -> NOTICE_PERIOD -> back).
async function auto_generate_confirmation_letter(user_id, actor_user_id) {
  const type = await prisma.hr_document_types.findFirst({
    where: { code: 'CONFIRMATION_LETTER', category: { code: 'EMPLOYMENT' } },
    select: { id: true, category_id: true },
  });
  if (!type) return;

  const existing = await prisma.hr_documents.findFirst({
    where: { user_id, type_id: type.id },
    select: { id: true },
  });
  if (existing) return;

  await generate_document({
    user_id,
    category_id: type.category_id,
    type_id: type.id,
    raw_content:
      'Dear {{employee_name}},\n\n' +
      'We are pleased to confirm that your probation period has been successfully completed, ' +
      'and your employment with {{company_name}} as {{designation}} is now confirmed, effective {{confirmation_date}}.\n\n' +
      'This document was generated automatically as part of your employee lifecycle.',
    title: 'Confirmation Letter',
    created_by: actor_user_id || user_id,
  });
}

// Relieving letter auto-generation — fires on EXIT_CLEARANCE, same
// idempotent shape as the other two auto-generators.
async function auto_generate_relieving_letter(user_id, actor_user_id) {
  const type = await prisma.hr_document_types.findFirst({
    where: { code: 'RELIEVING_LETTER', category: { code: 'OFFBOARDING' } },
    select: { id: true, category_id: true },
  });
  if (!type) return;

  const existing = await prisma.hr_documents.findFirst({
    where: { user_id, type_id: type.id },
    select: { id: true },
  });
  if (existing) return;

  await generate_document({
    user_id,
    category_id: type.category_id,
    type_id: type.id,
    raw_content:
      'Dear {{employee_name}},\n\n' +
      'This letter confirms that you have been relieved of your duties as {{designation}} at {{company_name}}, ' +
      'effective {{effective_date}}.\n\n' +
      'This document was generated automatically as part of your exit clearance.',
    title: 'Relieving Letter',
    created_by: actor_user_id || user_id,
  });
}

// Rule #2 — Employee Confirmed. Fires when Employee Lifecycle transitions to
// ACTIVE_EMPLOYMENT. employee-lifecycle.service.js's own NOTIFY_STAGES block
// already sends the supervisor a lifecycle notification for this stage, so
// this function does not send a second one — it only writes the additional
// `employee.confirmed` Timeline entry, giving Automation a visible,
// distinct marker that it ran, without double-notifying the supervisor.
export async function trigger_employee_confirmed(user_id, actor_user_id) {
  const rule = RULES.EMPLOYEE_CONFIRMED;
  const employee = await get_employee_and_supervisor(user_id);
  const employee_name = display_name(employee);

  await log_activity({
    user_id: actor_user_id || user_id,
    action: 'UPDATE',
    entity_type: 'employee',
    entity_id: user_id,
    description: `Automation: ${rule.timeline_event} — ${employee_name} confirmed (Active Employment).`,
  }).catch(() => {});

  await auto_generate_confirmation_letter(user_id, actor_user_id).catch(() => {});
}

// Rule #3 — Employee Exit Clearance. Fires when Employee Lifecycle
// transitions to EXIT_CLEARANCE. Same no-double-notify shape as the two
// triggers above — set_lifecycle_stage()'s NOTIFY_STAGES block already
// handles the supervisor notification for this stage.
export async function trigger_employee_exit_clearance(user_id, actor_user_id) {
  const rule = RULES.EMPLOYEE_EXIT_CLEARANCE;
  const employee = await get_employee_and_supervisor(user_id);
  const employee_name = display_name(employee);

  await log_activity({
    user_id: actor_user_id || user_id,
    action: 'UPDATE',
    entity_type: 'employee',
    entity_id: user_id,
    description: `Automation: ${rule.timeline_event} — ${employee_name} entered exit clearance.`,
  }).catch(() => {});

  await auto_generate_relieving_letter(user_id, actor_user_id).catch(() => {});
}
