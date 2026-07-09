import prisma from '../../../shared/database/client.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';
import { set_employment_status } from '../../users/repositories/users.repository.js';
import { get_lifecycle_stage, persist_lifecycle_stage } from '../repositories/employee-profiles.repository.js';
import { validate_lifecycle_stage, NOTIFY_STAGES, LIFECYCLE_STAGE_LABELS } from '../constants/employee-lifecycle.js';

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
      await prisma.notifications.create({
        data: {
          user_id: employee.supervisor_id,
          title: `Employee Lifecycle — ${LIFECYCLE_STAGE_LABELS[new_stage]}`,
          message: `${employee_name} is now at the "${LIFECYCLE_STAGE_LABELS[new_stage]}" stage.`,
          type: 'HR',
        },
      }).catch(() => null);
    }
  }

  return { lifecycle_stage: new_stage, changed: true };
}
