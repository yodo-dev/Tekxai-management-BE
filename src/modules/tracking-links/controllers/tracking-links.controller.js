import {
  create_link, delete_link, find_link_by_id, find_links_by_project,
} from '../repositories/tracking-links.repository.js';
import { validate_create_link } from '../validators/tracking-links.validation.js';

function ok(res, payload, msg = 'OK', status = 200) {
  return res.status(status).json({ success: true, message: msg, payload });
}
function fail(res, msg, status = 400) {
  return res.status(status).json({ success: false, message: msg });
}

export async function list_links(req, res, next) {
  try {
    const records = await find_links_by_project(req.params.projectId);
    return ok(res, { records, total: records.length });
  } catch (err) { next(err); }
}

export async function create_link_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_create_link(req.body);
    if (!valid) return fail(res, message);
    const { link_type, label, url } = req.body;
    const link = await create_link({ project_id: req.params.projectId, link_type, label, url, created_by: req.user.id });
    return ok(res, link, 'Tracking link added', 201);
  } catch (err) { next(err); }
}

export async function delete_link_ctrl(req, res, next) {
  try {
    const existing = await find_link_by_id(req.params.linkId);
    if (!existing) return fail(res, 'Link not found', 404);
    await delete_link(req.params.linkId);
    return ok(res, null, 'Tracking link deleted');
  } catch (err) { next(err); }
}
