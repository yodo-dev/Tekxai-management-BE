import { find_updates_by_project } from '../../../weekly-updates/repositories/weekly-updates.repository.js';

function user_name(u) {
  if (!u) return null;
  return `${u.first_name || ''} ${u.last_name || ''}`.trim() || null;
}

export async function fetch_weekly_update_events(project_id) {
  const updates = await find_updates_by_project(project_id);
  return updates.map((u) => ({
    id: `weekly_update:${u.id}`,
    type: 'WEEKLY_UPDATE',
    date: u.update_date,
    author: user_name(u.updater),
    summary: u.summary,
    related_entity: { type: 'weekly_update', id: u.id, method: u.method, client_response: u.client_response },
  }));
}
