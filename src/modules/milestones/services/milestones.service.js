import {
  create_milestone_db, delete_milestone_db, find_milestone_by_id, find_milestones, update_milestone_db,
} from '../repositories/milestones.repository.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

export const list_milestones = (project_id) => find_milestones(project_id);

export async function get_milestone(id) {
  const m = await find_milestone_by_id(id);
  if (!m) throw app_error('Milestone not found', 404);
  return m;
}

export async function create_milestone_svc(data) {
  const { project_id, title, description, due_date } = data;
  if (!project_id) throw app_error('project_id is required');
  if (!title?.trim()) throw app_error('title is required');

  return create_milestone_db({
    project_id,
    title: title.trim(),
    description: description?.trim() || null,
    due_date: due_date ? new Date(due_date) : null,
  });
}

export async function update_milestone_svc(id, data) {
  const m = await find_milestone_by_id(id);
  if (!m) throw app_error('Milestone not found', 404);

  const upd = {};
  if (data.title       !== undefined) upd.title       = data.title.trim();
  if (data.description !== undefined) upd.description = data.description;
  if (data.due_date    !== undefined) upd.due_date    = data.due_date ? new Date(data.due_date) : null;
  if (data.completed   !== undefined) upd.completed   = Boolean(data.completed);

  return update_milestone_db(id, upd);
}

export async function delete_milestone_svc(id) {
  const m = await find_milestone_by_id(id);
  if (!m) throw app_error('Milestone not found', 404);
  return delete_milestone_db(id);
}
