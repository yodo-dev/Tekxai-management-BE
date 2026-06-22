import {
  create_milestone, delete_milestone, find_milestone_by_id,
  find_milestones_by_project, update_milestone,
} from '../repositories/milestones.repository.js';

function ok(res, payload, msg = 'OK', status = 200) {
  return res.status(status).json({ success: true, message: msg, payload });
}
function fail(res, msg, status = 400) {
  return res.status(status).json({ success: false, message: msg });
}

export async function list_milestones(req, res, next) {
  try {
    const records = await find_milestones_by_project(req.params.projectId);
    return ok(res, { records, total: records.length });
  } catch (err) { next(err); }
}

export async function create_milestone_ctrl(req, res, next) {
  try {
    const { title, description, due_date } = req.body;
    if (!title?.trim()) return fail(res, 'title is required');
    const m = await create_milestone({ project_id: req.params.projectId, title, description, due_date });
    return ok(res, m, 'Milestone created', 201);
  } catch (err) { next(err); }
}

export async function update_milestone_ctrl(req, res, next) {
  try {
    const existing = await find_milestone_by_id(req.params.milestoneId);
    if (!existing) return fail(res, 'Milestone not found', 404);
    const m = await update_milestone(req.params.milestoneId, req.body);
    return ok(res, m, 'Milestone updated');
  } catch (err) { next(err); }
}

export async function delete_milestone_ctrl(req, res, next) {
  try {
    await delete_milestone(req.params.milestoneId);
    return ok(res, null, 'Milestone deleted');
  } catch (err) { next(err); }
}
