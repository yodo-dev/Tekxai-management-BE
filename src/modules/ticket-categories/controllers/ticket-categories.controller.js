import {
  create_ticket_category,
  get_ticket_category,
  list_ticket_categories,
  set_ticket_category_active,
  update_ticket_category,
} from '../services/ticket-categories.service.js';
import { validate_ticket_category } from '../validators/ticket-categories.validation.js';

export async function list_ctrl(req, res, next) {
  try {
    const include_inactive = req.query.include_inactive === 'true';
    return res.json({ success: true, payload: await list_ticket_categories({ include_inactive }) });
  } catch (e) { return next(e); }
}

export async function get_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_ticket_category(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function create_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_ticket_category(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    return res.status(201).json({ success: true, payload: await create_ticket_category(req.body) });
  } catch (e) { return next(e); }
}

export async function update_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await update_ticket_category(req.params.id, req.body) });
  } catch (e) { return next(e); }
}

export async function set_active_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await set_ticket_category_active(req.params.id, req.body?.is_active) });
  } catch (e) { return next(e); }
}
