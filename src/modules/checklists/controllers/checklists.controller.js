import {
  create_checklist_template,
  get_checklist_result,
  get_checklist_template,
  list_checklist_results,
  list_checklist_templates,
  submit_checklist_result,
  update_checklist_template,
} from '../services/checklists.service.js';
import { validate_checklist_result, validate_checklist_template } from '../validators/checklists.validation.js';

export async function list_templates_ctrl(req, res, next) {
  try {
    const { entity_type } = req.query;
    const include_inactive = req.query.include_inactive === 'true';
    return res.json({ success: true, payload: await list_checklist_templates({ entity_type, include_inactive }) });
  } catch (e) { return next(e); }
}

export async function get_template_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_checklist_template(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function create_template_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_checklist_template(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    return res.status(201).json({ success: true, payload: await create_checklist_template(req.user.id, req.body) });
  } catch (e) { return next(e); }
}

export async function update_template_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_checklist_template(req.body, { is_update: true });
    if (!valid) return res.status(400).json({ success: false, message });
    return res.json({ success: true, payload: await update_checklist_template(req.user.id, req.params.id, req.body) });
  } catch (e) { return next(e); }
}

export async function list_results_ctrl(req, res, next) {
  try {
    const { entity_type, entity_id, template_id } = req.query;
    return res.json({ success: true, payload: await list_checklist_results({ entity_type, entity_id, template_id }) });
  } catch (e) { return next(e); }
}

export async function get_result_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_checklist_result(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function submit_result_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_checklist_result(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    return res.status(201).json({ success: true, payload: await submit_checklist_result(req.user.id, req.body) });
  } catch (e) { return next(e); }
}
