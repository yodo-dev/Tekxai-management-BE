import prisma from '../../../../shared/database/client.js';
import { list_meetings } from '../../../meetings/services/meetings.service.js';

const USER_SELECT = { id: true, first_name: true, last_name: true, avatar: true };

function user_name(u) {
  if (!u) return null;
  return `${u.first_name || ''} ${u.last_name || ''}`.trim() || null;
}

function group_by_meeting(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.meeting_id)) map.set(row.meeting_id, []);
    map.get(row.meeting_id).push(row);
  }
  return map;
}

// Produces MEETING, MEETING_DECISION, and ACTION_ITEM events for a project —
// these three types are grouped here because decisions/action-items are only
// meaningful in the context of the meeting that produced them.
export async function fetch_meeting_events(project_id) {
  const meetingsResult = await list_meetings({ project_id, limit: 100 });
  const meeting_ids = meetingsResult.records.map((m) => m.id);

  const [decisions, action_items] = meeting_ids.length
    ? await Promise.all([
      prisma.meeting_decisions.findMany({ where: { meeting_id: { in: meeting_ids } }, include: { decider: { select: USER_SELECT } } }),
      prisma.meeting_action_items.findMany({ where: { meeting_id: { in: meeting_ids } }, include: { assignee: { select: USER_SELECT } } }),
    ])
    : [[], []];
  const decisions_by_meeting = group_by_meeting(decisions);
  const actions_by_meeting = group_by_meeting(action_items);

  const events = [];
  for (const m of meetingsResult.records) {
    events.push({
      id: `meeting:${m.id}`,
      type: 'MEETING',
      date: m.scheduled_at,
      author: user_name(m.organizer),
      summary: m.title,
      related_entity: { type: 'meeting', id: m.id, status: m.status },
    });
    for (const decision of decisions_by_meeting.get(m.id) || []) {
      events.push({
        id: `meeting_decision:${decision.id}`,
        type: 'MEETING_DECISION',
        date: decision.created_at,
        author: user_name(decision.decider),
        summary: decision.decision_text,
        related_entity: { type: 'meeting', id: m.id, title: m.title },
      });
    }
    for (const item of actions_by_meeting.get(m.id) || []) {
      events.push({
        id: `action_item:${item.id}`,
        type: 'ACTION_ITEM',
        date: item.created_at,
        author: user_name(item.assignee),
        summary: item.title,
        related_entity: { type: 'meeting', id: m.id, title: m.title, status: item.status, due_date: item.due_date },
      });
    }
  }
  return events;
}
