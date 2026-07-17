import {
  create_task, delete_task, find_task_by_id,
  find_tasks_by_project, update_task,
} from '../repositories/tasks.repository.js';
import { validate_create_task } from '../validators/tasks.validation.js';
import { send_task_assigned_email } from '../../email/email.service.js';
import prisma from '../../../shared/database/client.js';
import { fire_webhook } from '../../../shared/services/webhook.service.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';

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
    // Send assignment email if task has an assignee
    if (task.assigned_to) {
      const [assignee, project] = await Promise.all([
        prisma.users.findUnique({ where: { id: task.assigned_to }, select: { email: true, first_name: true } }),
        prisma.projects.findUnique({ where: { id: req.params.projectId }, select: { title: true } }),
      ]);
      if (assignee?.email) {
        send_task_assigned_email(assignee.email, assignee.first_name || 'Team Member', task.title, project?.title || 'Unknown Project').catch(() => {});
      }
    }
    fire_webhook('task.created', { id: task.id, title: task.title }).catch(() => {});
    log_activity({
      user_id: req.user.id, action: 'CREATE', entity_type: 'project', entity_id: req.params.projectId,
      description: `Created task "${task.title}"`,
    }).catch(() => {});
    return ok(res, task, 'Task created', 201);
  } catch (err) { next(err); }
}

const MANAGER_ROLES = ['ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER'];

// PUT /project/:projectId/tasks/:taskId
export async function update_task_ctrl(req, res, next) {
  try {
    const task = await find_task_by_id(req.params.taskId);
    if (!task) return fail(res, 'Task not found', 404);
    // Only a manager-tier role or the task's own assignee may update it —
    // this endpoint had no check at all before, letting any authenticated
    // user edit any task on any project.
    const is_manager = req.user.roles?.some((r) => MANAGER_ROLES.includes(r));
    const is_assignee = task.assigned_to === req.user.id;
    if (!is_manager && !is_assignee) return fail(res, 'Insufficient permissions', 403);
    const prev_assignee = task.assigned_to;
    const updated = await update_task(req.params.taskId, req.body);
    // Send assignment email if assignee changed
    if (req.body.assigned_to && req.body.assigned_to !== prev_assignee) {
      const [assignee, project] = await Promise.all([
        prisma.users.findUnique({ where: { id: req.body.assigned_to }, select: { email: true, first_name: true } }),
        prisma.projects.findUnique({ where: { id: req.params.projectId }, select: { title: true } }),
      ]);
      if (assignee?.email) {
        send_task_assigned_email(assignee.email, assignee.first_name || 'Team Member', updated.title, project?.title || 'Unknown Project').catch(() => {});
      }
    }
    if (req.body.status !== undefined && req.body.status !== task.status) {
      log_activity({
        user_id: req.user.id, action: 'UPDATE', entity_type: 'project', entity_id: req.params.projectId,
        description: `Task "${updated.title}" status changed to ${updated.status}`,
      }).catch(() => {});
    }
    return ok(res, updated, 'Task updated');
  } catch (err) { next(err); }
}

// DELETE /project/:projectId/tasks/:taskId
export async function delete_task_ctrl(req, res, next) {
  try {
    const existing = await find_task_by_id(req.params.taskId);
    await delete_task(req.params.taskId);
    if (existing) {
      log_activity({
        user_id: req.user.id, action: 'DELETE', entity_type: 'project', entity_id: req.params.projectId,
        description: `Deleted task "${existing.title}"`,
      }).catch(() => {});
    }
    return ok(res, null, 'Task deleted');
  } catch (err) { next(err); }
}
