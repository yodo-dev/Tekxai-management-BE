import {
  archive_milestone, create_milestone, delete_milestone, find_milestone_by_id,
  find_milestones_by_project, find_sequence_conflict, set_milestone_members,
  unarchive_milestone, update_milestone,
} from '../repositories/milestones.repository.js';
import { validate_create_milestone, validate_update_milestone } from '../validators/milestones.validation.js';

function app_error(message, status_code = 400) {
  const e = new Error(message);
  e.status_code = status_code;
  return e;
}

export async function list_milestones(project_id, { include_archived } = {}) {
  return find_milestones_by_project(project_id, { include_archived });
}

export async function get_milestone(id) {
  const m = await find_milestone_by_id(id);
  if (!m) throw app_error('Milestone not found', 404);
  return m;
}

// Dependencies must be other milestones of the SAME project (no self-
// reference, no cross-project ids) — the only integrity check a scalar
// array needs, since there's no FK to enforce it at the DB level.
async function validate_dependencies(project_id, milestone_id, depends_on_ids) {
  if (!Array.isArray(depends_on_ids) || depends_on_ids.length === 0) return;
  if (milestone_id && depends_on_ids.includes(milestone_id)) {
    throw app_error('A milestone cannot depend on itself', 422);
  }
  const project_milestones = await find_milestones_by_project(project_id, { include_archived: true });
  const valid_ids = new Set(project_milestones.map((m) => m.id));
  const invalid = depends_on_ids.filter((id) => !valid_ids.has(id));
  if (invalid.length > 0) {
    throw app_error(`Dependencies must be milestones of the same project (invalid id(s): ${invalid.join(', ')})`, 422);
  }
}

export async function create_milestone_svc(project_id, data) {
  const check = validate_create_milestone(data);
  if (!check.valid) throw app_error(check.message, 422);

  if (data.sequence != null && data.sequence !== '') {
    const conflict = await find_sequence_conflict(project_id, data.sequence);
    if (conflict) throw app_error(`Sequence ${data.sequence} is already used by milestone "${conflict.title}" in this project`, 409);
  }

  await validate_dependencies(project_id, null, data.depends_on_ids);

  const milestone = await create_milestone({ project_id, ...data });

  if (Array.isArray(data.assigned_user_ids)) {
    return set_milestone_members(milestone.id, data.assigned_user_ids);
  }
  return milestone;
}

export async function update_milestone_svc(id, data) {
  const existing = await find_milestone_by_id(id);
  if (!existing) throw app_error('Milestone not found', 404);

  const check = validate_update_milestone(data);
  if (!check.valid) throw app_error(check.message, 422);

  if (data.sequence != null && data.sequence !== '') {
    const conflict = await find_sequence_conflict(existing.project_id, data.sequence, id);
    if (conflict) throw app_error(`Sequence ${data.sequence} is already used by milestone "${conflict.title}" in this project`, 409);
  }

  if (data.depends_on_ids !== undefined) {
    await validate_dependencies(existing.project_id, id, data.depends_on_ids);
  }

  const updated = await update_milestone(id, data);

  if (Array.isArray(data.assigned_user_ids)) {
    return set_milestone_members(id, data.assigned_user_ids);
  }
  return updated;
}

export async function archive_milestone_svc(id) {
  const existing = await find_milestone_by_id(id);
  if (!existing) throw app_error('Milestone not found', 404);
  return archive_milestone(id);
}

export async function unarchive_milestone_svc(id) {
  const existing = await find_milestone_by_id(id);
  if (!existing) throw app_error('Milestone not found', 404);
  return unarchive_milestone(id);
}

export async function delete_milestone_svc(id) {
  const existing = await find_milestone_by_id(id);
  if (!existing) throw app_error('Milestone not found', 404);
  // Other milestones' depends_on_ids scalar arrays are not cleaned up here —
  // same trade-off the schema comment already accepts (no FK integrity on a
  // simple scalar list). The controller's dependency-resolution step
  // silently drops ids it can't find, so a dangling reference never surfaces
  // as a broken link, just a shorter resolved list.
  await delete_milestone(id);
  return existing;
}
