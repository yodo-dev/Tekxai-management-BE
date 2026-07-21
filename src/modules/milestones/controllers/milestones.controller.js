import {
  archive_milestone_svc, create_milestone_svc, delete_milestone_svc, get_milestone,
  list_milestones, unarchive_milestone_svc, update_milestone_svc,
} from '../services/milestones.service.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';
import { create_notification } from '../../notifications/services/notifications.service.js';
import prisma from '../../../shared/database/client.js';

function ok(res, payload, msg = 'OK', status = 200) {
  return res.status(status).json({ success: true, message: msg, payload });
}

// Resolves each milestone's depends_on_ids into lightweight {id, title,
// status} objects for display, silently dropping ids that no longer exist
// (deleted milestone) rather than surfacing a broken reference.
function with_resolved_dependencies(records) {
  const by_id = new Map(records.map((m) => [m.id, m]));
  return records.map((m) => ({
    ...m,
    depends_on: (m.depends_on_ids || [])
      .map((id) => by_id.get(id))
      .filter(Boolean)
      .map((d) => ({ id: d.id, title: d.title, status: d.status })),
  }));
}

export async function list_milestones_ctrl(req, res, next) {
  try {
    const records = await list_milestones(req.params.projectId, { include_archived: req.query.include_archived === 'true' });
    return ok(res, { records: with_resolved_dependencies(records), total: records.length });
  } catch (err) { next(err); }
}

export async function create_milestone_ctrl(req, res, next) {
  try {
    const m = await create_milestone_svc(req.params.projectId, req.body);
    log_activity({
      user_id: req.user.id, action: 'CREATE', entity_type: 'project', entity_id: req.params.projectId,
      description: `Created milestone "${m.title}"`,
    }).catch(() => {});

    if (Array.isArray(req.body.assigned_user_ids) && req.body.assigned_user_ids.length > 0) {
      const project = await prisma.projects.findUnique({ where: { id: req.params.projectId }, select: { title: true } });
      for (const user_id of req.body.assigned_user_ids) {
        create_notification({
          user_id,
          title: 'Assigned to Milestone',
          message: `You were assigned to milestone "${m.title}" on ${project?.title || 'a project'}.`,
          type: 'PROJECT',
        }).catch(() => null);
      }
    }

    return ok(res, m, 'Milestone created', 201);
  } catch (err) { next(err); }
}

export async function update_milestone_ctrl(req, res, next) {
  try {
    const existing = await get_milestone(req.params.milestoneId);
    const m = await update_milestone_svc(req.params.milestoneId, req.body);

    const change = req.body.status !== undefined
      ? `status changed to ${req.body.status.replace(/_/g, ' ')}`
      : req.body.progress_percent !== undefined
        ? `progress updated to ${req.body.progress_percent}%`
        : 'updated';
    log_activity({
      user_id: req.user.id, action: 'UPDATE', entity_type: 'project', entity_id: req.params.projectId,
      description: `Milestone "${m.title}" ${change}`,
    }).catch(() => {});

    if (req.body.status === 'BLOCKED' && existing.status !== 'BLOCKED') {
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

export async function archive_milestone_ctrl(req, res, next) {
  try {
    const m = await archive_milestone_svc(req.params.milestoneId);
    log_activity({
      user_id: req.user.id, action: 'UPDATE', entity_type: 'project', entity_id: req.params.projectId,
      description: `Milestone "${m.title}" archived`,
    }).catch(() => {});
    return ok(res, m, 'Milestone archived');
  } catch (err) { next(err); }
}

export async function unarchive_milestone_ctrl(req, res, next) {
  try {
    const m = await unarchive_milestone_svc(req.params.milestoneId);
    log_activity({
      user_id: req.user.id, action: 'UPDATE', entity_type: 'project', entity_id: req.params.projectId,
      description: `Milestone "${m.title}" unarchived`,
    }).catch(() => {});
    return ok(res, m, 'Milestone unarchived');
  } catch (err) { next(err); }
}

export async function delete_milestone_ctrl(req, res, next) {
  try {
    const existing = await delete_milestone_svc(req.params.milestoneId);
    log_activity({
      user_id: req.user.id, action: 'DELETE', entity_type: 'project', entity_id: req.params.projectId,
      description: `Deleted milestone "${existing.title}"`,
    }).catch(() => {});
    return ok(res, null, 'Milestone deleted');
  } catch (err) { next(err); }
}
