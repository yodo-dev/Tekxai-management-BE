import { get_executive_dashboard } from '../services/executive-analytics.service.js';

function period_from_query(req) {
  const now = new Date();
  return { month: req.query.month || now.getMonth() + 1, year: req.query.year || now.getFullYear() };
}

export async function get_executive_dashboard_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_executive_dashboard(period_from_query(req)) }); }
  catch (e) { return next(e); }
}
