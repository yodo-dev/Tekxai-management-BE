import {
  create_project,
  delete_project,
  find_project_by_id,
  find_projects,
  find_saved_projects,
  save_project,
  unsave_project,
  update_project,
} from '../repositories/projects.repository.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

export const list_projects = (p, user_id) => find_projects({ ...p, user_id });

export async function get_project(id, user_id) {
  const p = await find_project_by_id(id, user_id);
  if (!p) throw app_error('Project not found', 404);
  return p;
}

export const create_new_project = (d) => create_project(d);

export async function update_existing_project(id, d, user_id) {
  await get_project(id, user_id);
  return update_project(id, d);
}

export async function delete_existing_project(id) {
  const p = await find_project_by_id(id);
  if (!p) throw app_error('Project not found', 404);
  return delete_project(id);
}

export const get_saved = (user_id, p) => find_saved_projects(user_id, p);

export async function toggle_save_project(user_id, project_id, action) {
  await get_project(project_id, user_id);
  if (action === 'save') return save_project(user_id, project_id);
  return unsave_project(user_id, project_id);
}
