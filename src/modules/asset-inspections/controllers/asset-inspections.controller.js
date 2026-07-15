import {
  complete_asset_inspection,
  create_asset_inspection,
  get_asset_inspection,
  get_asset_inspection_history,
  list_asset_inspections,
  update_asset_inspection,
} from '../services/asset-inspections.service.js';
import { validate_asset_inspection } from '../validators/asset-inspections.validation.js';

export async function list_ctrl(req, res, next) {
  try {
    const { asset_id, assigned_to, status, page, limit } = req.query;
    return res.json({ success: true, payload: await list_asset_inspections({ asset_id, assigned_to, status, page, limit }) });
  } catch (e) { return next(e); }
}

export async function history_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_asset_inspection_history(req.params.assetId) }); }
  catch (e) { return next(e); }
}

export async function get_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_asset_inspection(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function create_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_asset_inspection(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    return res.status(201).json({ success: true, payload: await create_asset_inspection(req.user.id, req.body) });
  } catch (e) { return next(e); }
}

export async function update_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_asset_inspection(req.body, { is_update: true });
    if (!valid) return res.status(400).json({ success: false, message });
    return res.json({ success: true, payload: await update_asset_inspection(req.user.id, req.params.id, req.body) });
  } catch (e) { return next(e); }
}

export async function complete_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await complete_asset_inspection(req.user.id, req.params.id, req.body) });
  } catch (e) { return next(e); }
}
