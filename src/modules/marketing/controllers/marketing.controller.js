import {
  create_deal,
  get_salary_builder,
  list_deals,
  list_salary_history,
  publish_salary,
  upsert_salary_builder,
} from '../services/marketing.service.js';

export async function get_deals(req, res, next) {
  try {
    return res.json({ success: true, payload: await list_deals(req.query) });
  } catch (e) { return next(e); }
}

export async function create_deal_ctrl(req, res, next) {
  try {
    const deal = await create_deal({ ...req.body, salesperson_id: req.body.salesperson_id || req.user.id });
    return res.status(201).json({ success: true, payload: deal });
  } catch (e) { return next(e); }
}

export async function get_salary_builder_ctrl(req, res, next) {
  try {
    const { user_id, period } = req.query;
    return res.json({ success: true, payload: await get_salary_builder(user_id || req.user.id, period) });
  } catch (e) { return next(e); }
}

export async function upsert_salary_ctrl(req, res, next) {
  try {
    const sb = await upsert_salary_builder({ ...req.body, user_id: req.body.user_id || req.user.id });
    return res.json({ success: true, payload: sb });
  } catch (e) { return next(e); }
}

export async function publish_salary_ctrl(req, res, next) {
  try {
    const sb = await publish_salary(req.params.user_id, req.params.period);
    return res.json({ success: true, payload: sb });
  } catch (e) { return next(e); }
}

export async function get_salary_history(req, res, next) {
  try {
    return res.json({ success: true, payload: await list_salary_history(req.query) });
  } catch (e) { return next(e); }
}
