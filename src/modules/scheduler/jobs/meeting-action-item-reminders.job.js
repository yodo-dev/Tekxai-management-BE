import prisma from '../../../shared/database/client.js';
import { create_notification } from '../../notifications/services/notifications.service.js';
import { classify_due_date } from '../../meetings/validators/meetings.validation.js';

// Daily sweep — notifies assignees of meeting action items due today or overdue.
// Mirrors the ticket-sla-escalation job's thin-wrapper pattern: a single entry
// point the scheduler calls, using the same classify_due_date() the dashboard
// aggregation uses so "overdue" never disagrees between the two.
export async function run_meeting_action_item_reminders() {
  const now = new Date();
  const open_items = await prisma.meeting_action_items.findMany({
    where: { status: { not: 'COMPLETED' }, due_date: { not: null } },
    include: { meeting: { select: { id: true, title: true } } },
  });

  let due_today = 0;
  let overdue = 0;

  for (const item of open_items) {
    const bucket = classify_due_date(item.due_date, item.status, now);
    if (bucket === 'DUE_TODAY') {
      due_today += 1;
      await create_notification({
        user_id: item.assignee_id,
        title: 'Action item due today',
        message: `"${item.title}" (from meeting "${item.meeting?.title || 'Unknown'}") is due today`,
        type: 'ACTION_ITEM',
      }).catch(() => null);
    } else if (bucket === 'OVERDUE') {
      overdue += 1;
      await create_notification({
        user_id: item.assignee_id,
        title: 'Action item overdue',
        message: `"${item.title}" (from meeting "${item.meeting?.title || 'Unknown'}") is overdue`,
        type: 'ACTION_ITEM',
      }).catch(() => null);
    }
  }

  return { checked: open_items.length, due_today, overdue };
}
