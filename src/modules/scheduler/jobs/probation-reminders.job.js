import prisma from '../../../shared/database/client.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';
import { create_notification } from '../../notifications/services/notifications.service.js';

// probation_status is a free-text column (no DB enum, no shared constants
// module for it — checked hr-profile.service.js and employee-lifecycle.js,
// neither defines an allowed-values list). 'ONGOING' is the value HR sets
// while a probation period is still in progress; 'CONFIRMED'/'EXTENDED'/
// 'FAILED' are the terminal/alternate outcomes once HR has acted on it. If
// the actual values in use ever diverge from this, update this constant —
// it is the only place the reminder job cares about the distinction.
const ONGOING_PROBATION_STATUS = 'ONGOING';

function start_of_day(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Fires reminders for probations ending in exactly 7 days (not a range) so
// the daily job naturally sends one reminder per employee instead of
// repeating on every day of a window.
export async function run_probation_reminders() {
  const today = start_of_day(new Date());
  const target_day = new Date(today);
  target_day.setDate(target_day.getDate() + 7);
  const target_day_end = new Date(target_day);
  target_day_end.setDate(target_day_end.getDate() + 1);

  const profiles = await prisma.employee_profiles.findMany({
    where: {
      probation_status: ONGOING_PROBATION_STATUS,
      probation_end: { gte: target_day, lt: target_day_end },
    },
    select: {
      user_id: true,
      probation_end: true,
    },
  });

  let sent = 0;

  for (const profile of profiles) {
    try {
      const employee = await prisma.users.findUnique({
        where: { id: profile.user_id },
        select: { supervisor_id: true, first_name: true, last_name: true },
      });

      if (!employee?.supervisor_id) continue;

      const employee_name = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'The employee';
      const probation_end_date = profile.probation_end.toISOString().slice(0, 10);

      await create_notification({
        user_id: employee.supervisor_id,
        title: 'Probation Ending Soon',
        message: `${employee_name}'s probation period ends on ${probation_end_date} — please submit a confirmation recommendation.`,
        type: 'HR',
      }).catch(() => null);

      await log_activity({
        user_id: employee.supervisor_id,
        action: 'UPDATE',
        entity_type: 'employee',
        entity_id: profile.user_id,
        description: `Probation reminder sent to supervisor — ${employee_name}'s probation ends on ${probation_end_date}.`,
      }).catch(() => {});

      sent += 1;
    } catch (err) {
      // Never let one bad record stop reminders for the rest of the batch.
      console.error('[scheduler] probation reminder failed for user', profile.user_id, err.message);
    }
  }

  return { checked: profiles.length, sent };
}
