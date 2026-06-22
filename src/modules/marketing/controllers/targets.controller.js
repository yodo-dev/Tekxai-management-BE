import { list_targets, upsert_target, get_my_activity_report } from '../services/targets.service.js';

export const get_targets = async (req, res, next) => {
  try {
    const result = await list_targets(req.query);
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
};

export const upsert_target_ctrl = async (req, res, next) => {
  try {
    const record = await upsert_target(req.body);
    return res.json({ success: true, payload: record });
  } catch (e) { return next(e); }
};

export const get_my_report = async (req, res, next) => {
  try {
    const uid = req.query.user_id || req.user.id;
    const { from, to } = req.query;
    const result = await get_my_activity_report(uid, from, to);
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
};
