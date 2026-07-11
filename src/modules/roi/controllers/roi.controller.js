import { get_client_roi, get_employee_roi, get_project_roi } from '../services/roi.service.js';

function period_from_query(req) {
  const now = new Date();
  return { month: req.query.month || now.getMonth() + 1, year: req.query.year || now.getFullYear() };
}

export async function get_employee_roi_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_employee_roi(req.params.userId, period_from_query(req)) }); }
  catch (e) { return next(e); }
}

export async function get_project_roi_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_project_roi(req.params.projectId, period_from_query(req)) }); }
  catch (e) { return next(e); }
}

export async function get_client_roi_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_client_roi(req.params.clientId, period_from_query(req)) }); }
  catch (e) { return next(e); }
}
