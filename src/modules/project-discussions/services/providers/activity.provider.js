import { find_activity_logs } from '../../../activity-logs/repositories/activity.repository.js';

function user_name(u) {
  if (!u) return null;
  return `${u.first_name || ''} ${u.last_name || ''}`.trim() || null;
}

export async function fetch_activity_events(project_id) {
  const activityResult = await find_activity_logs({ entity_type: 'project', entity_id: project_id, limit: 200 });
  return activityResult.records.map((a) => ({
    id: `activity:${a.id}`,
    type: 'ACTIVITY',
    date: a.created_at,
    author: user_name(a.user),
    summary: a.description,
    related_entity: { type: 'activity', id: a.id, action: a.action },
  }));
}
