import prisma from '../../../shared/database/client.js';
import { find_updates_by_project } from '../../weekly-updates/repositories/weekly-updates.repository.js';
import { find_discussions_by_project } from '../repositories/project-discussions.repository.js';
import { find_activity_logs } from '../../activity-logs/repositories/activity.repository.js';
import { list_meetings } from '../../meetings/services/meetings.service.js';

const USER_SELECT = { id: true, first_name: true, last_name: true, avatar: true };

function user_name(u) {
  if (!u) return null;
  return `${u.first_name || ''} ${u.last_name || ''}`.trim() || null;
}

// Aggregates the existing project-linked communication sources (Weekly
// Updates, Project Discussions, project-linked Meetings, Activity Logs)
// into one normalized, chronological feed. Reuses each source's existing
// repository/service function verbatim — no duplicate queries, no new tables.
export async function get_project_communication_timeline(project_id) {
  const [updates, discussions, meetingsResult, activityResult] = await Promise.all([
    find_updates_by_project(project_id),
    find_discussions_by_project(project_id),
    list_meetings({ project_id, limit: 100 }),
    find_activity_logs({ entity_type: 'project', entity_id: project_id, limit: 200 }),
  ]);

  const meeting_ids = meetingsResult.records.map((m) => m.id);
  const [decisions, action_items] = meeting_ids.length
    ? await Promise.all([
      prisma.meeting_decisions.findMany({ where: { meeting_id: { in: meeting_ids } }, include: { decider: { select: USER_SELECT } } }),
      prisma.meeting_action_items.findMany({ where: { meeting_id: { in: meeting_ids } }, include: { assignee: { select: USER_SELECT } } }),
    ])
    : [[], []];
  function group_by_meeting(rows) {
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.meeting_id)) map.set(row.meeting_id, []);
      map.get(row.meeting_id).push(row);
    }
    return map;
  }
  const decisions_by_meeting = group_by_meeting(decisions);
  const actions_by_meeting = group_by_meeting(action_items);

  const events = [];

  for (const u of updates) {
    events.push({
      id: `weekly_update:${u.id}`,
      type: 'WEEKLY_UPDATE',
      date: u.update_date,
      author: user_name(u.updater),
      summary: u.summary,
      related_entity: { type: 'weekly_update', id: u.id, method: u.method, client_response: u.client_response },
    });
  }

  for (const d of discussions) {
    events.push({
      id: `discussion:${d.id}`,
      type: 'DISCUSSION',
      date: d.created_at,
      author: user_name(d.user),
      summary: d.content,
      related_entity: { type: 'discussion', id: d.id, parent_id: d.parent_id },
    });
  }

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

  for (const a of activityResult.records) {
    events.push({
      id: `activity:${a.id}`,
      type: 'ACTIVITY',
      date: a.created_at,
      author: user_name(a.user),
      summary: a.description,
      related_entity: { type: 'activity', id: a.id, action: a.action },
    });
  }

  events.sort((a, b) => new Date(b.date) - new Date(a.date));

  return { records: events, total: events.length };
}
