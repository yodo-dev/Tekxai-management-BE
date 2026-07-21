import prisma from '../../../shared/database/client.js';
import {
  create_approval_request, find_pending_for_user_and_transition,
  find_approval_by_id, list_approval_requests, decide_approval_request,
} from '../repositories/lifecycle-approvals.repository.js';
import { validate_transition_key } from '../constants/lifecycle-approvals.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';
import { create_notification } from '../../notifications/services/notifications.service.js';

function app_error(message, status_code = 400) {
  const e = new Error(message);
  e.status_code = status_code;
  return e;
}

// Creates a PENDING approval request for a lifecycle transition that
// requires sign-off. Called from employee-lifecycle.service.js's transition
// orchestration functions (confirm_employee / extend_probation /
// terminate_during_probation / archive_employee) — never called directly
// off a raw public endpoint, so the transition-specific validation (correct
// current stage, etc.) always runs first.
export async function request_lifecycle_approval({ user_id, transition, from_stage, to_stage, requested_by, reason, metadata }) {
  const check = validate_transition_key(transition);
  if (!check.valid) throw app_error(check.message, 422);

  const existing = await find_pending_for_user_and_transition(user_id, transition);
  if (existing) throw app_error(`A ${transition.replace(/_/g, ' ')} approval request is already pending for this employee`, 409);

  const request = await create_approval_request({ user_id, transition, from_stage, to_stage, requested_by, reason, metadata });

  await log_activity({
    user_id: requested_by,
    action: 'CREATE',
    entity_type: 'employee',
    entity_id: user_id,
    description: `Lifecycle approval requested: ${transition.replace(/_/g, ' ')} (${from_stage} -> ${to_stage})${reason ? ` — ${reason}` : ''}`,
  }).catch(() => {});

  const employee = await prisma.users.findUnique({
    where: { id: user_id },
    select: { supervisor_id: true, first_name: true, last_name: true },
  });
  if (employee?.supervisor_id && employee.supervisor_id !== requested_by) {
    const employee_name = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'An employee';
    await create_notification({
      user_id: employee.supervisor_id,
      title: 'Lifecycle Approval Requested',
      message: `${transition.replace(/_/g, ' ')} requested for ${employee_name} — awaiting HR/Admin approval.`,
      type: 'HR',
    }).catch(() => null);
  }

  return request;
}

export async function list_lifecycle_approvals(params) {
  return list_approval_requests(params);
}

export async function get_lifecycle_approval(id) {
  const request = await find_approval_by_id(id);
  if (!request) throw app_error('Approval request not found', 404);
  return request;
}

// Rejection has no downstream transition to execute — just marks the
// request REJECTED and notifies whoever requested it. Approval is handled
// in employee-lifecycle.service.js (approve_lifecycle_transition), since
// approving must also execute the underlying transition it was requested
// for — that logic already lives with the rest of the lifecycle write path.
export async function reject_lifecycle_approval(id, actor_id, decision_note) {
  const request = await get_lifecycle_approval(id);
  if (request.status !== 'PENDING') {
    throw app_error(`Only pending requests can be rejected (this one is already ${request.status})`, 409);
  }

  const updated = await decide_approval_request(id, { status: 'REJECTED', decided_by: actor_id, decision_note });

  await log_activity({
    user_id: actor_id,
    action: 'UPDATE',
    entity_type: 'employee',
    entity_id: request.user_id,
    description: `Lifecycle approval rejected: ${request.transition.replace(/_/g, ' ')}${decision_note ? ` — ${decision_note}` : ''}`,
  }).catch(() => {});

  await create_notification({
    user_id: request.requested_by,
    title: 'Lifecycle Approval Rejected',
    message: `Your ${request.transition.replace(/_/g, ' ')} request was rejected${decision_note ? `: ${decision_note}` : '.'}`,
    type: 'HR',
  }).catch(() => null);

  return updated;
}
