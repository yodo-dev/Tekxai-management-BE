import {
  add_maintenance,
  assign_asset,
  create_asset,
  delete_asset,
  get_asset,
  list_assets,
  list_categories,
  list_locations,
  list_vendors,
  return_asset,
  update_asset,
} from '../services/assets.service.js';

export async function get_assets(req, res, next) {
  try {
    return res.json({ success: true, payload: await list_assets(req.query) });
  } catch (e) { return next(e); }
}

export async function get_asset_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_asset(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function create_asset_ctrl(req, res, next) {
  try { return res.status(201).json({ success: true, payload: await create_asset(req.body) }); }
  catch (e) { return next(e); }
}

export async function update_asset_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await update_asset(req.params.id, req.body) }); }
  catch (e) { return next(e); }
}

export async function delete_asset_ctrl(req, res, next) {
  try { await delete_asset(req.params.id); return res.json({ success: true, message: 'Asset retired' }); }
  catch (e) { return next(e); }
}

export async function assign_asset_ctrl(req, res, next) {
  try {
    const result = await assign_asset(req.params.id, { ...req.body, assigned_by: req.user.id });
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
}

export async function return_asset_ctrl(req, res, next) {
  try {
    await return_asset(req.params.id, req.body);
    return res.json({ success: true, message: 'Asset returned' });
  } catch (e) { return next(e); }
}

export async function add_maintenance_ctrl(req, res, next) {
  try {
    const log = await add_maintenance(req.params.id, { ...req.body, performed_by: req.user.id });
    return res.status(201).json({ success: true, payload: log });
  } catch (e) { return next(e); }
}

export async function get_categories(req, res, next) {
  try { return res.json({ success: true, payload: await list_categories() }); }
  catch (e) { return next(e); }
}

export async function get_locations(req, res, next) {
  try { return res.json({ success: true, payload: await list_locations() }); }
  catch (e) { return next(e); }
}

export async function get_vendors(req, res, next) {
  try { return res.json({ success: true, payload: await list_vendors() }); }
  catch (e) { return next(e); }
}
