import { find_discussions_by_project } from '../../repositories/project-discussions.repository.js';

function user_name(u) {
  if (!u) return null;
  return `${u.first_name || ''} ${u.last_name || ''}`.trim() || null;
}

export async function fetch_discussion_events(project_id) {
  const discussions = await find_discussions_by_project(project_id);
  return discussions.map((d) => ({
    id: `discussion:${d.id}`,
    type: 'DISCUSSION',
    date: d.created_at,
    author: user_name(d.user),
    summary: d.content,
    related_entity: { type: 'discussion', id: d.id, parent_id: d.parent_id },
  }));
}
