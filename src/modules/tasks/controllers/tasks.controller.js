import {
  create_task, delete_task, find_task_by_id,
  find_tasks_by_project, update_task,
} from '../repositories/tasks.repository.js';
import { validate_create_task } from '../validators/tasks.validation.js';

function ok(res, payload, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, message, payload });
}
function fail(res, message, status = 400) {
  return res.status(status).json({ success: false, message });
}

// GET /project/:projectId/tasks
export async function list_tasks(req, res, next) {
  try {
    const result = await find_tasks_by_project(req.params.projectId, req.query);
    return ok(res, result);
  } catch (err) { next(err); }
}

// GET /project/:projectId/tasks/:taskId
export async function get_task(req, res, next) {
  try {
    const task = await find_task_by_id(req.params.taskId);
    if (!task) return fail(res, 'Task not found', 404);
    return ok(res, task);
  } catch (err) { next(err); }
}

// POST /project/:projectId/tasks
export async function create_task_ctrl(req, res, next) {
  try {
    const v = validate_create_task(req.body);
    if (!v.valid) return fail(res, v.message);
    const task = await create_task({ ...req.body, project_id: req.params.projectId });
    return ok(res, task, 'Task created', 201);
  } catch (err) { next(err); }
}

// PUT /project/:projectId/tasks/:taskId
export async function update_task_ctrl(req, res, next) {
  try {
    const task = await find_task_by_id(req.params.taskId);
    if (!task) return fail(res, 'Task not found', 404);
    const updated = await update_task(req.params.taskId, req.body);
    return ok(res, updated, 'Task updated');
  } catch (err) { next(err); }
}

// DELETE /project/:projectId/tasks/:taskId
export async function delete_task_ctrl(req, res, next) {
  try {
    await delete_task(req.params.taskId);
    return ok(res, null, 'Task deleted');
  } catch (err) { next(err); }
}
