import {
  create_ticket_type,
  get_ticket_type,
  list_ticket_types,
  set_ticket_type_active,
  update_ticket_type,
} from '../services/ticket-types.service.js';
import { validate_ticket_type } from '../validators/ticket-types.validation.js';

export async function list_ctrl(req, res, next) {
  try {
    const { category_id } = req.query;
    const include_inactive = req.query.include_inactive === 'true';
    return res.json({ success: true, payload: await list_ticket_types({ category_id, include_inactive }) });
  } catch (e) { return next(e); }
}

export async function get_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_ticket_type(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function create_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_ticket_type(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    return res.status(201).json({ success: true, payload: await create_ticket_type(req.body) });
  } catch (e) { return next(e); }
}

export async function update_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_ticket_type(req.body, { is_update: true });
    if (!valid) return res.status(400).json({ success: false, message });
    return res.json({ success: true, payload: await update_ticket_type(req.params.id, req.body) });
  } catch (e) { return next(e); }
}

export async function set_active_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await set_ticket_type_active(req.params.id, req.body?.is_active) });
  } catch (e) { return next(e); }
}
