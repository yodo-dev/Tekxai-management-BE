import {
  create_dependency, delete_dependency, find_dependencies_by_project,
  find_dependency_by_id, update_dependency,
} from '../repositories/dependencies.repository.js';
import { validate_dependency } from '../validators/dependencies.validation.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';

function ok(res, payload, msg = 'OK', status = 200) {
  return res.status(status).json({ success: true, message: msg, payload });
}
function fail(res, msg, status = 400) {
  return res.status(status).json({ success: false, message: msg });
}

export async function list_dependencies(req, res, next) {
  try {
    const records = await find_dependencies_by_project(req.params.projectId);
    return ok(res, { records, total: records.length });
  } catch (err) { next(err); }
}

export async function create_dependency_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_dependency(req.body);
    if (!valid) return fail(res, message);
    const d = await create_dependency({ project_id: req.params.projectId, ...req.body });
    log_activity({
      user_id: req.user.id, action: 'CREATE', entity_type: 'project', entity_id: req.params.projectId,
      description: `Added dependency "${d.name}" (${d.type})`,
    }).catch(() => {});
    return ok(res, d, 'Dependency created', 201);
  } catch (err) { next(err); }
}

export async function update_dependency_ctrl(req, res, next) {
  try {
    const existing = await find_dependency_by_id(req.params.dependencyId);
    if (!existing) return fail(res, 'Dependency not found', 404);
    const { valid, message } = validate_dependency(req.body, { partial: true });
    if (!valid) return fail(res, message);
    const d = await update_dependency(req.params.dependencyId, req.body);
    log_activity({
      user_id: req.user.id, action: 'UPDATE', entity_type: 'project', entity_id: req.params.projectId,
      description: `Dependency "${d.name}" updated${req.body.status ? ` — status: ${req.body.status}` : ''}`,
    }).catch(() => {});
    return ok(res, d, 'Dependency updated');
  } catch (err) { next(err); }
}

export async function delete_dependency_ctrl(req, res, next) {
  try {
    const existing = await find_dependency_by_id(req.params.dependencyId);
    await delete_dependency(req.params.dependencyId);
    if (existing) {
      log_activity({
        user_id: req.user.id, action: 'DELETE', entity_type: 'project', entity_id: req.params.projectId,
        description: `Removed dependency "${existing.name}"`,
      }).catch(() => {});
    }
    return ok(res, null, 'Dependency deleted');
  } catch (err) { next(err); }
}
