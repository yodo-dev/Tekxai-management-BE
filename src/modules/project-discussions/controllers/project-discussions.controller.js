import {
  create_discussion, delete_discussion, find_discussion_by_id, find_discussions_by_project,
} from '../repositories/project-discussions.repository.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';
import { get_project_communication_timeline } from '../services/communication-timeline.service.js';

function ok(res, payload, msg = 'OK', status = 200) {
  return res.status(status).json({ success: true, message: msg, payload });
}
function fail(res, msg, status = 400) {
  return res.status(status).json({ success: false, message: msg });
}

export async function list_discussions(req, res, next) {
  try {
    const records = await find_discussions_by_project(req.params.projectId);
    return ok(res, { records, total: records.length });
  } catch (err) { next(err); }
}

export async function create_discussion_ctrl(req, res, next) {
  try {
    const { content, parent_id } = req.body;
    if (!content?.trim()) return fail(res, 'content is required');
    const d = await create_discussion({
      project_id: req.params.projectId, user_id: req.user.id, content: content.trim(), parent_id,
    });
    log_activity({
      user_id: req.user.id, action: 'CREATE', entity_type: 'project', entity_id: req.params.projectId,
      description: `Added a project note: "${content.trim().slice(0, 80)}${content.trim().length > 80 ? '…' : ''}"`,
    }).catch(() => {});
    return ok(res, d, 'Note added', 201);
  } catch (err) { next(err); }
}

export async function get_communication_timeline_ctrl(req, res, next) {
  try {
    const result = await get_project_communication_timeline(req.params.projectId);
    return ok(res, result);
  } catch (err) { next(err); }
}

export async function delete_discussion_ctrl(req, res, next) {
  try {
    const existing = await find_discussion_by_id(req.params.discussionId);
    if (!existing) return fail(res, 'Discussion not found', 404);
    if (existing.user_id !== req.user.id && !req.user.roles?.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r))) {
      return fail(res, 'You can only delete your own notes', 403);
    }
    await delete_discussion(req.params.discussionId);
    log_activity({
      user_id: req.user.id, action: 'DELETE', entity_type: 'project', entity_id: req.params.projectId,
      description: 'Deleted a project note',
    }).catch(() => {});
    return ok(res, null, 'Note deleted');
  } catch (err) { next(err); }
}
