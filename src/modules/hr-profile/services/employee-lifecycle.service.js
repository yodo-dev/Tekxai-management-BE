import prisma from '../../../shared/database/client.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';
import { set_employment_status } from '../../users/repositories/users.repository.js';
import { get_lifecycle_stage, persist_lifecycle_stage } from '../repositories/employee-profiles.repository.js';
import { validate_lifecycle_stage, NOTIFY_STAGES, LIFECYCLE_STAGE_LABELS } from '../constants/employee-lifecycle.js';
import { create_notification } from '../../notifications/services/notifications.service.js';
import { trigger_employee_confirmed, trigger_employee_exit_clearance } from '../../automation/services/automation.service.js';
import { seed_default_offboarding_tasks } from '../../offboarding/services/offboarding.service.js';
import { request_lifecycle_approval, get_lifecycle_approval } from '../../lifecycle-approvals/services/lifecycle-approvals.service.js';
import { decide_approval_request } from '../../lifecycle-approvals/repositories/lifecycle-approvals.repository.js';

function app_error(message, status_code = 400) {
  const e = new Error(message);
  e.status_code = status_code;
  return e;
}

// The one write path for Employee Lifecycle. Every caller that advances an
// employee's journey stage — hiring, HR profile edit, offboarding — must
// call this; nothing else may write employee_profiles.lifecycle_stage.
//
// Pipeline: validate transition -> persist -> sync Employment Status (only
// at the two frozen bookends) -> Timeline event -> notification (meaningful
// stages only). The Automation Engine and AI layer don't exist yet — the
// Timeline event this function writes via the existing activity_logs
// infrastructure is their future extension point; no engine or hook is
// stubbed out ahead of that.
export async function set_lifecycle_stage(user_id, new_stage, actor_user_id) {
  const check = validate_lifecycle_stage(new_stage);
  if (!check.valid) throw app_error(check.message, 422);

  const current_stage = await get_lifecycle_stage(user_id);
  if (current_stage === 'ARCHIVED' && new_stage !== 'ARCHIVED') {
    throw app_error('Archived is a terminal lifecycle stage and cannot be reopened', 400);
  }
  if (current_stage === new_stage) {
    return { lifecycle_stage: current_stage, changed: false };
  }

  await persist_lifecycle_stage(user_id, new_stage);

  // Frozen sync rule — exactly these two bookends, nothing else. Status
  // otherwise changes fully independently (e.g. ON_LEAVE, SUSPENDED never
  // move Lifecycle, and Lifecycle moving through PROBATION/NOTICE_PERIOD/
  // EXIT_CLEARANCE never touches Status).
  if (new_stage === 'ONBOARDING') {
    await set_employment_status(user_id, 'ACTIVE');
  } else if (new_stage === 'ARCHIVED') {
    await set_employment_status(user_id, 'TERMINATED');
  }

  await log_activity({
    user_id: actor_user_id || user_id,
    action: 'UPDATE',
    entity_type: 'employee',
    entity_id: user_id,
    description: `Employee lifecycle changed to ${LIFECYCLE_STAGE_LABELS[new_stage]}`,
  }).catch(() => {});

  if (NOTIFY_STAGES.has(new_stage)) {
    const employee = await prisma.users.findUnique({
      where: { id: user_id },
      select: { supervisor_id: true, first_name: true, last_name: true },
    });
    if (employee?.supervisor_id) {
      const employee_name = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'The employee';
      await create_notification({
        user_id: employee.supervisor_id,
        title: `Employee Lifecycle — ${LIFECYCLE_STAGE_LABELS[new_stage]}`,
        message: `${employee_name} is now at the "${LIFECYCLE_STAGE_LABELS[new_stage]}" stage.`,
        type: 'HR',
      }).catch(() => null);
    }
  }

  // Automation Engine seed — Rulebook Section A #2 "Employee Confirmed".
  // ACTIVE_EMPLOYMENT is the closest existing Lifecycle stage to the
  // Rulebook's "Confirmation" concept. The NOTIFY_STAGES block above already
  // sends the supervisor a lifecycle notification for this stage, so this
  // only adds a distinct `employee.confirmed` Timeline entry marking that
  // Automation also ran — it does not send a second notification.
  if (new_stage === 'ACTIVE_EMPLOYMENT') {
    await trigger_employee_confirmed(user_id, actor_user_id).catch(() => {});
  }

  // Exit-clearance asset flag — not a gate. EXIT_CLEARANCE and ARCHIVED (in
  // case someone skips straight to Archived) both check the employee's
  // currently active asset assignments and, if any exist, raise an extra
  // Timeline event plus an extra supervisor notification listing what's
  // outstanding. This never blocks or reverses the transition above — a
  // hard approval gate is a future milestone, not this one.
  if (new_stage === 'EXIT_CLEARANCE' || new_stage === 'ARCHIVED') {
    try {
      const active_assignments = await prisma.asset_assignments.findMany({
        where: { user_id, is_active: true },
        include: { asset: true },
      });

      if (active_assignments.length > 0) {
        const asset_names = active_assignments.map((a) => a.asset?.name || a.asset?.asset_tag || 'Unnamed asset');

        await log_activity({
          user_id: actor_user_id || user_id,
          action: 'UPDATE',
          entity_type: 'employee',
          entity_id: user_id,
          description: `${active_assignments.length} asset(s) still assigned and must be returned before exit clearance can complete: ${asset_names.join(', ')}`,
        }).catch(() => {});

        const employee = await prisma.users.findUnique({
          where: { id: user_id },
          select: { supervisor_id: true, first_name: true, last_name: true },
        });
        if (employee?.supervisor_id) {
          const employee_name = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'The employee';
          await create_notification({
            user_id: employee.supervisor_id,
            title: 'Outstanding Assets — Exit Clearance',
            message: `${employee_name} still has ${active_assignments.length} asset(s) assigned that need to be returned: ${asset_names.join(', ')}.`,
            type: 'HR',
          }).catch(() => null);
        }
      }
    } catch {
      // Never let the asset-flag check break the core lifecycle transition.
    }
  }

  // Offboarding checklist seed — EXIT_CLEARANCE only (not ARCHIVED). Exit
  // Clearance is when the exit checklist should start; Archived is the
  // terminal state after (presumably) that checklist is done. seed_default_
  // offboarding_tasks() itself no-ops if tasks already exist for this user,
  // so this is also safe against set_lifecycle_stage being called into
  // EXIT_CLEARANCE more than once.
  if (new_stage === 'EXIT_CLEARANCE') {
    await seed_default_offboarding_tasks(user_id, actor_user_id).catch(() => {});
  }

  // Automation Engine — Relieving Letter auto-generation. Same no-double-
  // notify shape as trigger_employee_confirmed above; the NOTIFY_STAGES
  // block already covers the supervisor notification for this stage.
  if (new_stage === 'EXIT_CLEARANCE') {
    await trigger_employee_exit_clearance(user_id, actor_user_id).catch(() => {});
  }

  return { lifecycle_stage: new_stage, changed: true };
}

// ─── Employee Lifecycle Workflow — transition orchestration ─────────────────
//
// Everything below wraps set_lifecycle_stage() (still the one write path for
// lifecycle_stage) with the pre-conditions, hard gates, and approval routing
// the Employee Lifecycle Workflow requires. None of it changes
// set_lifecycle_stage() itself or its frozen ONBOARDING/ARCHIVED Employment
// Status sync above.

function assert_current_stage(current, expected, action_label) {
  if (current !== expected) {
    throw app_error(
      `Cannot ${action_label}: employee is currently at "${LIFECYCLE_STAGE_LABELS[current] || current || 'no stage'}", expected "${LIFECYCLE_STAGE_LABELS[expected] || expected}".`,
      409
    );
  }
}

async function notify_hr_users({ title, message }) {
  const hr_users = await prisma.users.findMany({
    where: { deleted_at: null, roles: { some: { role: { name: 'HR' } } } },
    select: { id: true },
  });
  await Promise.all(hr_users.map((u) => create_notification({ user_id: u.id, title, message, type: 'HR' }).catch(() => null)));
}

// ── Readiness (compute-on-read, nothing persisted) ───────────────────────────

// ONBOARDING readiness — same "compute on read" pattern as
// projects.repository.js's health_score/access_completion_score. Reuses
// onboarding_tasks, employee_profiles, employee_documents; nothing new
// stored, nothing auto-promoted.
export async function get_onboarding_readiness(user_id) {
  const [tasks, profile, documents] = await Promise.all([
    prisma.onboarding_tasks.findMany({ where: { user_id } }),
    prisma.employee_profiles.findUnique({ where: { user_id } }),
    prisma.employee_documents.findMany({ where: { user_id } }),
  ]);

  const total_tasks = tasks.length;
  const completed_tasks = tasks.filter((t) => t.is_completed).length;
  const tasks_complete = total_tasks > 0 && completed_tasks === total_tasks;

  const missing_requirements = [];
  if (total_tasks === 0) missing_requirements.push('No onboarding tasks assigned yet');
  else if (!tasks_complete) missing_requirements.push(`${total_tasks - completed_tasks} onboarding task(s) incomplete`);
  if (!profile) missing_requirements.push('Employee profile not created');
  if (documents.length === 0) missing_requirements.push('No documents uploaded');

  return {
    total_tasks,
    completed_tasks,
    tasks_complete,
    has_profile: !!profile,
    document_count: documents.length,
    ready: tasks_complete && !!profile,
    missing_requirements,
  };
}

// OFFBOARDING readiness — feeds both the Exit Clearance UI and the hard gate
// in archive_employee() below. checklist/asset/approval are each
// independently blocking.
export async function get_offboarding_readiness(user_id) {
  const [tasks, active_assignments, approvals] = await Promise.all([
    prisma.offboarding_tasks.findMany({ where: { user_id } }),
    prisma.asset_assignments.findMany({ where: { user_id, is_active: true }, include: { asset: true } }),
    prisma.lifecycle_approval_requests.findMany({
      where: { user_id, transition: 'ARCHIVE_EMPLOYEE' },
      orderBy: { created_at: 'desc' },
    }),
  ]);

  const total_tasks = tasks.length;
  const completed_tasks = tasks.filter((t) => t.is_completed).length;
  const checklist_complete = total_tasks > 0 && completed_tasks === total_tasks;

  const outstanding_assets = active_assignments.map((a) => a.asset?.name || a.asset?.asset_tag || 'Unnamed asset');
  const latest_approval = approvals[0] || null;
  const approval_complete = latest_approval?.status === 'APPROVED';

  const blocking_reasons = [];
  if (!checklist_complete) {
    blocking_reasons.push(total_tasks === 0 ? 'Offboarding checklist not started' : `${total_tasks - completed_tasks} offboarding task(s) incomplete`);
  }
  if (outstanding_assets.length > 0) {
    blocking_reasons.push(`${outstanding_assets.length} outstanding asset(s): ${outstanding_assets.join(', ')}`);
  }
  if (!approval_complete) {
    blocking_reasons.push(
      latest_approval?.status === 'PENDING' ? 'Archive approval is pending' : 'Archive approval has not been requested yet'
    );
  }

  return {
    total_tasks,
    completed_tasks,
    checklist_complete,
    outstanding_assets,
    outstanding_asset_count: outstanding_assets.length,
    latest_approval,
    approval_complete,
    ready: checklist_complete && outstanding_assets.length === 0 && approval_complete,
    blocking_reasons,
  };
}

// Derived probation summary (start/end/status/remaining days) for the
// Lifecycle tab — no new columns, reads employee_profiles' existing fields.
export async function get_probation_summary(user_id) {
  const profile = await prisma.employee_profiles.findUnique({
    where: { user_id },
    select: { probation_start: true, probation_end: true, probation_status: true },
  });
  if (!profile) return null;

  let remaining_days = null;
  if (profile.probation_end) {
    remaining_days = Math.ceil((new Date(profile.probation_end).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  }

  return { ...profile, remaining_days };
}

// ── Direct transitions (no approval gate) ────────────────────────────────────
//
// ONBOARDING->PROBATION, ACTIVE_EMPLOYMENT->NOTICE_PERIOD, and
// NOTICE_PERIOD->EXIT_CLEARANCE are routine HR/manager actions today (no
// existing approval flow gates any of them), so they stay direct — matching
// how every other HR action in this codebase already works (permission
// check + audit log + notification, no separate sign-off step).

export async function move_to_probation(user_id, actor_user_id) {
  const current = await get_lifecycle_stage(user_id);
  assert_current_stage(current, 'ONBOARDING', 'move this employee to Probation');
  return set_lifecycle_stage(user_id, 'PROBATION', actor_user_id);
}

// Entering Notice Period is the one direct transition with its own
// downstream automation: seeds the offboarding checklist immediately
// (reusing the same idempotent seed_default_offboarding_tasks() the
// EXIT_CLEARANCE path already calls — safe to call at both points, the
// second call is always a no-op) and notifies HR. The reporting manager is
// already notified by set_lifecycle_stage()'s NOTIFY_STAGES block below —
// not duplicated here. Access is deliberately left untouched (no revocation)
// per the approved architecture.
export async function enter_notice_period(user_id, actor_user_id, { notice_period_days } = {}) {
  const current = await get_lifecycle_stage(user_id);
  assert_current_stage(current, 'ACTIVE_EMPLOYMENT', 'move this employee to Notice Period');

  const result = await set_lifecycle_stage(user_id, 'NOTICE_PERIOD', actor_user_id);

  if (notice_period_days != null) {
    await prisma.employee_profiles.update({
      where: { user_id },
      data: { notice_period_days: +notice_period_days },
    }).catch(() => {});
  }

  await seed_default_offboarding_tasks(user_id, actor_user_id).catch(() => {});

  const employee = await prisma.users.findUnique({ where: { id: user_id }, select: { first_name: true, last_name: true } });
  const employee_name = `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || 'An employee';
  await notify_hr_users({
    title: 'Employee Entered Notice Period',
    message: `${employee_name} has entered their notice period. Offboarding tasks have been created — access remains active until Exit Clearance.`,
  }).catch(() => {});

  return result;
}

export async function move_to_exit_clearance(user_id, actor_user_id) {
  const current = await get_lifecycle_stage(user_id);
  assert_current_stage(current, 'NOTICE_PERIOD', 'move this employee to Exit Clearance');
  return set_lifecycle_stage(user_id, 'EXIT_CLEARANCE', actor_user_id);
}

// EXIT_CLEARANCE -> ARCHIVED — the hard gate. Cannot run until the
// offboarding checklist is complete, no assets remain outstanding, and an
// APPROVED "Archive Employee" approval request exists for this employee.
// `_internal_skip_approval_check` is set only by approve_lifecycle_transition
// below, for the split-second where the approval being approved is still
// PENDING (it becomes APPROVED right after this function returns) — the
// checklist/asset gates are never skipped, only the approval-existence check.
export async function archive_employee(user_id, actor_user_id, { _internal_skip_approval_check = false } = {}) {
  const current = await get_lifecycle_stage(user_id);
  assert_current_stage(current, 'EXIT_CLEARANCE', 'archive this employee');

  const readiness = await get_offboarding_readiness(user_id);

  if (!readiness.checklist_complete) {
    throw app_error(`Cannot archive: offboarding checklist is incomplete (${readiness.blocking_reasons.join('; ')}).`, 409);
  }
  if (readiness.outstanding_asset_count > 0) {
    throw app_error(`Cannot archive: ${readiness.outstanding_asset_count} outstanding asset(s) must be returned first (${readiness.outstanding_assets.join(', ')}).`, 409);
  }
  if (!_internal_skip_approval_check && !readiness.approval_complete) {
    throw app_error('Cannot archive: an approved "Archive Employee" request is required first. Use "Request Archive" to start one.', 409);
  }

  return set_lifecycle_stage(user_id, 'ARCHIVED', actor_user_id);
}

// ── Approval-gated transitions ───────────────────────────────────────────────
//
// Probation confirmation/extension/termination and the final archive all go
// through the lifecycle-scoped approval mechanism (lifecycle-approvals
// module) — request_* creates a PENDING request; approving it (via
// approve_lifecycle_transition, called from the lifecycle-approvals routes)
// executes the underlying transition.

export async function request_confirm_employee(user_id, actor_user_id, { reason } = {}) {
  const current = await get_lifecycle_stage(user_id);
  assert_current_stage(current, 'PROBATION', 'confirm this employee');
  return request_lifecycle_approval({
    user_id, transition: 'CONFIRM_EMPLOYEE', from_stage: 'PROBATION', to_stage: 'ACTIVE_EMPLOYMENT',
    requested_by: actor_user_id, reason,
  });
}

export async function request_extend_probation(user_id, actor_user_id, { new_probation_end, reason } = {}) {
  if (!new_probation_end) throw app_error('new_probation_end is required', 422);
  const current = await get_lifecycle_stage(user_id);
  assert_current_stage(current, 'PROBATION', "extend this employee's probation");
  return request_lifecycle_approval({
    user_id, transition: 'EXTEND_PROBATION', from_stage: 'PROBATION', to_stage: 'PROBATION',
    requested_by: actor_user_id, reason, metadata: { new_probation_end },
  });
}

export async function request_terminate_probation(user_id, actor_user_id, { reason } = {}) {
  const current = await get_lifecycle_stage(user_id);
  assert_current_stage(current, 'PROBATION', 'terminate this employee during probation');
  return request_lifecycle_approval({
    user_id, transition: 'TERMINATE_PROBATION', from_stage: 'PROBATION', to_stage: 'EXIT_CLEARANCE',
    requested_by: actor_user_id, reason,
  });
}

export async function request_archive_employee(user_id, actor_user_id, { reason } = {}) {
  const current = await get_lifecycle_stage(user_id);
  assert_current_stage(current, 'EXIT_CLEARANCE', 'archive this employee');
  return request_lifecycle_approval({
    user_id, transition: 'ARCHIVE_EMPLOYEE', from_stage: 'EXIT_CLEARANCE', to_stage: 'ARCHIVED',
    requested_by: actor_user_id, reason,
  });
}

// Approving a request executes its underlying transition, then marks it
// APPROVED — never the other order, so a request can never be left APPROVED
// without the transition having actually happened.
export async function approve_lifecycle_transition(approval_id, actor_user_id, decision_note) {
  const request = await get_lifecycle_approval(approval_id);
  if (request.status !== 'PENDING') {
    throw app_error(`Only pending requests can be approved (this one is already ${request.status}).`, 409);
  }

  let transition_result;
  switch (request.transition) {
    case 'CONFIRM_EMPLOYEE': {
      const current = await get_lifecycle_stage(request.user_id);
      assert_current_stage(current, 'PROBATION', 'confirm this employee');
      transition_result = await set_lifecycle_stage(request.user_id, 'ACTIVE_EMPLOYMENT', actor_user_id);
      await prisma.employee_profiles.update({
        where: { user_id: request.user_id },
        data: { probation_status: 'CONFIRMED', confirmation_date: new Date() },
      }).catch(() => {});
      break;
    }
    case 'EXTEND_PROBATION': {
      const current = await get_lifecycle_stage(request.user_id);
      assert_current_stage(current, 'PROBATION', "extend this employee's probation");
      const new_end = request.metadata?.new_probation_end;
      if (!new_end) throw app_error('Approval request is missing new_probation_end metadata', 422);
      await prisma.employee_profiles.update({
        where: { user_id: request.user_id },
        data: { probation_end: new Date(new_end), probation_status: 'EXTENDED' },
      });
      await log_activity({
        user_id: actor_user_id, action: 'UPDATE', entity_type: 'employee', entity_id: request.user_id,
        description: `Probation extended to ${new Date(new_end).toISOString().slice(0, 10)}`,
      }).catch(() => {});
      transition_result = { lifecycle_stage: current, changed: false, probation_end: new_end };
      break;
    }
    case 'TERMINATE_PROBATION': {
      const current = await get_lifecycle_stage(request.user_id);
      assert_current_stage(current, 'PROBATION', 'terminate this employee during probation');
      transition_result = await set_lifecycle_stage(request.user_id, 'EXIT_CLEARANCE', actor_user_id);
      await prisma.employee_profiles.update({
        where: { user_id: request.user_id },
        data: { probation_status: 'FAILED', termination_date: new Date() },
      }).catch(() => {});
      break;
    }
    case 'ARCHIVE_EMPLOYEE': {
      transition_result = await archive_employee(request.user_id, actor_user_id, { _internal_skip_approval_check: true });
      break;
    }
    default:
      throw app_error(`Unknown transition type: ${request.transition}`, 500);
  }

  const updated_request = await decide_approval_request(approval_id, { status: 'APPROVED', decided_by: actor_user_id, decision_note });

  await log_activity({
    user_id: actor_user_id, action: 'UPDATE', entity_type: 'employee', entity_id: request.user_id,
    description: `Lifecycle approval granted: ${request.transition.replace(/_/g, ' ')}${decision_note ? ` — ${decision_note}` : ''}`,
  }).catch(() => {});

  await create_notification({
    user_id: request.requested_by,
    title: 'Lifecycle Approval Granted',
    message: `Your ${request.transition.replace(/_/g, ' ')} request was approved.`,
    type: 'HR',
  }).catch(() => null);

  return { approval: updated_request, transition: transition_result };
}

// Direct admin override — bypasses the formal approval-gated transitions
// above (move-to-probation, request-confirm, etc.) for cases those don't
// cover, e.g. correcting a batch of employees stuck in ONBOARDING that
// pre-date a default-stage fix. Still goes through the one write path
// (set_lifecycle_stage) so validation and the frozen status-sync rule apply;
// only the "must currently be in stage X" transition sequencing is skipped.
export async function bulk_set_lifecycle_stage(user_ids, new_stage, actor_user_id) {
  const results = await Promise.allSettled(
    user_ids.map((user_id) => set_lifecycle_stage(user_id, new_stage, actor_user_id))
  );
  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results
    .map((r, i) => (r.status === 'rejected' ? { user_id: user_ids[i], message: r.reason?.message || 'Unknown error' } : null))
    .filter(Boolean);
  return { succeeded, failed };
}
