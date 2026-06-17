import { get_starred, star_item, unstar_item } from '../services/starred.service.js';

export async function get_queries(req, res, next) {
  try {
    const result = await get_starred(req.user.id, req.query.item_type);
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
}

export async function star_item_ctrl(req, res, next) {
  try {
    const result = await star_item(req.user.id, req.params.item_type, req.params.id);
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
}

export async function unstar_item_ctrl(req, res, next) {
  try {
    await unstar_item(req.user.id, req.params.item_type, req.params.id);
    return res.json({ success: true, message: 'Unstarred' });
  } catch (e) { return next(e); }
}
