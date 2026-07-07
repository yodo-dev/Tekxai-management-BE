import {
  create_milestone, delete_milestone, find_milestone_by_id,
  find_milestones_by_project, update_milestone,
} from '../repositories/milestones.repository.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';
import prisma from '../../../shared/database/client.js';

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
    log_activity({
      user_id: req.user.id, action: 'CREATE', entity_type: 'project', entity_id: req.params.projectId,
      description: `Created milestone "${m.title}"`,
    }).catch(() => {});
    return ok(res, m, 'Milestone created', 201);
  } catch (err) { next(err); }
}

export async function update_milestone_ctrl(req, res, next) {
  try {
    const existing = await find_milestone_by_id(req.params.milestoneId);
    if (!existing) return fail(res, 'Milestone not found', 404);
    const m = await update_milestone(req.params.milestoneId, req.body);
    const change = req.body.completed !== undefined
      ? (req.body.completed ? 'completed' : 'reopened')
      : req.body.blocked !== undefined
        ? (req.body.blocked ? 'marked as blocked' : 'unblocked')
        : 'updated';
    log_activity({
      user_id: req.user.id, action: 'UPDATE', entity_type: 'project', entity_id: req.params.projectId,
      description: `Milestone "${m.title}" ${change}`,
    }).catch(() => {});

    if (req.body.blocked === true) {
      prisma.projects.findUnique({ where: { id: req.params.projectId }, select: { title: true, owner_id: true, leader_id: true } })
        .then((project) => {
          if (!project) return;
          const recipients = [...new Set([project.owner_id, project.leader_id].filter(Boolean))];
          for (const user_id of recipients) {
            prisma.notifications.create({
              data: {
                user_id,
                title: `Milestone Blocked — ${project.title}`,
                message: `Milestone "${m.title}" was marked as blocked.`,
                type: 'PROJECT',
              },
            }).catch(() => null);
          }
        }).catch(() => {});
    }

    return ok(res, m, 'Milestone updated');
  } catch (err) { next(err); }
}

export async function delete_milestone_ctrl(req, res, next) {
  try {
    const existing = await find_milestone_by_id(req.params.milestoneId);
    await delete_milestone(req.params.milestoneId);
    if (existing) {
      log_activity({
        user_id: req.user.id, action: 'DELETE', entity_type: 'project', entity_id: req.params.projectId,
        description: `Deleted milestone "${existing.title}"`,
      }).catch(() => {});
    }
    return ok(res, null, 'Milestone deleted');
  } catch (err) { next(err); }
}
