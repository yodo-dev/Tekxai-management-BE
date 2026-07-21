import {
  create_update, delete_update, find_latest_update, find_update_by_id, find_updates_by_project,
} from '../repositories/weekly-updates.repository.js';
import { validate_create_update } from '../validators/weekly-updates.validation.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';

function ok(res, payload, msg = 'OK', status = 200) {
  return res.status(status).json({ success: true, message: msg, payload });
}
function fail(res, msg, status = 400) {
  return res.status(status).json({ success: false, message: msg });
}

export async function list_updates(req, res, next) {
  try {
    const records = await find_updates_by_project(req.params.projectId);
    return ok(res, { records, total: records.length, latest: records[0] || null });
  } catch (err) { next(err); }
}

export async function get_latest_update_ctrl(req, res, next) {
  try {
    const latest = await find_latest_update(req.params.projectId);
    return ok(res, latest);
  } catch (err) { next(err); }
}

export async function create_update_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_create_update(req.body);
    if (!valid) return fail(res, message);
    const { update_date, method, summary, client_response, attachment_url } = req.body;
    const record = await create_update({
      project_id: req.params.projectId, update_date, updated_by: req.user.id, method, summary, client_response, attachment_url,
    });
    log_activity({
      user_id: req.user.id, action: 'CREATE', entity_type: 'project', entity_id: req.params.projectId,
      description: `Logged client update via ${record.method}: ${summary.slice(0, 120)}`,
    }).catch(() => {});
    return ok(res, record, 'Weekly update logged', 201);
  } catch (err) { next(err); }
}

export async function delete_update_ctrl(req, res, next) {
  try {
    const existing = await find_update_by_id(req.params.updateId);
    if (!existing) return fail(res, 'Update not found', 404);
    await delete_update(req.params.updateId);
    log_activity({
      user_id: req.user.id, action: 'DELETE', entity_type: 'project', entity_id: existing.project_id,
      description: `Removed a logged client update from ${existing.update_date?.toISOString?.().slice(0, 10) || existing.update_date}`,
    }).catch(() => {});
    return ok(res, null, 'Weekly update deleted');
  } catch (err) { next(err); }
}
