import {
  apply_template_to_location,
  create_compliance_template,
  create_new_template_version,
  get_compliance_template,
  list_compliance_templates,
  set_template_active,
} from '../services/compliance-templates.service.js';
import { validate_apply_template, validate_compliance_template } from '../validators/compliance-templates.validation.js';

export async function list_ctrl(req, res, next) {
  try {
    const include_all_versions = req.query.include_all_versions === 'true';
    return res.json({ success: true, payload: await list_compliance_templates({ include_all_versions }) });
  } catch (e) { return next(e); }
}

export async function get_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_compliance_template(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function create_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_compliance_template(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    return res.status(201).json({ success: true, payload: await create_compliance_template(req.user.id, req.body) });
  } catch (e) { return next(e); }
}

export async function create_version_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_compliance_template(req.body, { is_new_version: true });
    if (!valid) return res.status(400).json({ success: false, message });
    return res.status(201).json({ success: true, payload: await create_new_template_version(req.user.id, req.params.key, req.body) });
  } catch (e) { return next(e); }
}

export async function set_active_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await set_template_active(req.user.id, req.params.id, req.body?.is_active) });
  } catch (e) { return next(e); }
}

export async function apply_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_apply_template(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    return res.status(201).json({ success: true, payload: await apply_template_to_location(req.user.id, req.params.id, req.body.location_id) });
  } catch (e) { return next(e); }
}
