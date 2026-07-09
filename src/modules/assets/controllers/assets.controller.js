import {
  add_maintenance,
  approve_asset_request,
  assign_asset,
  create_asset,
  create_asset_request,
  create_category,
  create_disposal,
  delete_asset,
  get_asset,
  list_asset_requests,
  list_categories,
  list_disposals,
  list_assets,
  list_locations,
  list_vendors,
  reject_asset_request,
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
    await return_asset(req.params.id, req.body, req.user.id);
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

export async function create_category_ctrl(req, res, next) {
  try {
    const cat = await create_category(req.body);
    return res.status(201).json({ success: true, payload: cat });
  } catch (e) { return next(e); }
}

export async function get_locations(req, res, next) {
  try { return res.json({ success: true, payload: await list_locations() }); }
  catch (e) { return next(e); }
}

export async function get_vendors(req, res, next) {
  try { return res.json({ success: true, payload: await list_vendors() }); }
  catch (e) { return next(e); }
}

// GET /asset/maintenance/all — all maintenance logs (admin view)
export async function list_all_maintenance_ctrl(req, res, next) {
  try {
    const prisma_client = (await import('../../../shared/database/client.js')).default;
    const logs = await prisma_client.asset_maintenance_logs.findMany({
      take: 500,
      orderBy: { maintenance_date: 'desc' },
      include: { asset: { select: { id: true, name: true, asset_tag: true } } },
    });
    return res.json({ success: true, payload: { records: logs, total: logs.length } });
  } catch (err) { next(err); }
}

// ─── Asset Requests ────────────────────────────────────────────────────────

export async function create_asset_request_ctrl(req, res, next) {
  try {
    const request = await create_asset_request(req.user.id, req.body);
    return res.status(201).json({ success: true, payload: request });
  } catch (e) { return next(e); }
}

export async function get_asset_requests_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await list_asset_requests(req.query) }); }
  catch (e) { return next(e); }
}

export async function approve_asset_request_ctrl(req, res, next) {
  try {
    const request = await approve_asset_request(req.params.id, { ...req.body, reviewed_by: req.user.id });
    return res.json({ success: true, payload: request });
  } catch (e) { return next(e); }
}

export async function reject_asset_request_ctrl(req, res, next) {
  try {
    const request = await reject_asset_request(req.params.id, { ...req.body, reviewed_by: req.user.id });
    return res.json({ success: true, payload: request });
  } catch (e) { return next(e); }
}

// ─── Asset Disposals ────────────────────────────────────────────────────────

export async function get_disposals_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await list_disposals(req.query) }); }
  catch (e) { return next(e); }
}

export async function create_disposal_ctrl(req, res, next) {
  try {
    const disposal = await create_disposal({ ...req.body, disposed_by: req.user.id });
    return res.status(201).json({ success: true, payload: disposal });
  } catch (e) { return next(e); }
}
