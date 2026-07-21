import {
  create_access_item, delete_access_item, find_access_item_by_id,
  find_access_items_by_user, update_access_item,
} from '../repositories/employee-access.repository.js';
import { validate_access_item } from '../validators/employee-access.validation.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';

function ok(res, payload, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, message, payload });
}
function fail(res, message, status = 400) {
  return res.status(status).json({ success: false, message });
}

export async function list_access_items_ctrl(req, res, next) {
  try {
    const records = await find_access_items_by_user(req.params.userId);
    return ok(res, { records, total: records.length });
  } catch (err) { next(err); }
}

export async function create_access_item_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_access_item(req.body);
    if (!valid) return fail(res, message);
    const item = await create_access_item({ user_id: req.params.userId, ...req.body, assigned_by: req.user.id });
    log_activity({
      user_id: req.user.id, action: 'CREATE', entity_type: 'employee', entity_id: req.params.userId,
      description: `Access item "${item.platform}" added${item.identifier ? ` (${item.identifier})` : ''}`,
    }).catch(() => {});
    return ok(res, item, 'Access item created', 201);
  } catch (err) { next(err); }
}

export async function update_access_item_ctrl(req, res, next) {
  try {
    const existing = await find_access_item_by_id(req.params.itemId);
    if (!existing) return fail(res, 'Access item not found', 404);
    const { valid, message } = validate_access_item(req.body, { partial: true });
    if (!valid) return fail(res, message);
    const item = await update_access_item(req.params.itemId, req.body);
    log_activity({
      user_id: req.user.id, action: 'UPDATE', entity_type: 'employee', entity_id: req.params.userId,
      description: `Access item "${item.platform}" updated${req.body.status ? ` — status: ${req.body.status}` : ''}`,
    }).catch(() => {});
    return ok(res, item, 'Access item updated');
  } catch (err) { next(err); }
}

export async function delete_access_item_ctrl(req, res, next) {
  try {
    const existing = await find_access_item_by_id(req.params.itemId);
    if (!existing) return fail(res, 'Access item not found', 404);
    await delete_access_item(req.params.itemId);
    log_activity({
      user_id: req.user.id, action: 'DELETE', entity_type: 'employee', entity_id: req.params.userId,
      description: `Access item "${existing.platform}" removed`,
    }).catch(() => {});
    return ok(res, null, 'Access item deleted');
  } catch (err) { next(err); }
}
