import {
  create_compliance_requirement,
  delete_compliance_requirement,
  get_compliance_requirement,
  list_compliance_requirements,
  update_compliance_requirement,
} from '../services/compliance-requirements.service.js';
import { validate_compliance_requirement } from '../validators/compliance-requirements.validation.js';

export async function list_ctrl(req, res, next) {
  try {
    const { location_id, category_id, status, page, limit } = req.query;
    return res.json({ success: true, payload: await list_compliance_requirements({ location_id, category_id, status, page, limit }) });
  } catch (e) { return next(e); }
}

export async function get_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_compliance_requirement(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function create_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_compliance_requirement(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    return res.status(201).json({ success: true, payload: await create_compliance_requirement(req.user.id, req.body) });
  } catch (e) { return next(e); }
}

export async function update_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_compliance_requirement(req.body, { is_update: true });
    if (!valid) return res.status(400).json({ success: false, message });
    return res.json({ success: true, payload: await update_compliance_requirement(req.user.id, req.params.id, req.body) });
  } catch (e) { return next(e); }
}

export async function delete_ctrl(req, res, next) {
  try {
    await delete_compliance_requirement(req.user.id, req.params.id);
    return res.json({ success: true, message: 'Compliance requirement deleted' });
  } catch (e) { return next(e); }
}
