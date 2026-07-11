import {
  get_business_unit_performance,
  get_client_performance,
  get_department_performance,
  get_employee_performance,
  get_project_performance,
} from '../services/enterprise-performance.service.js';

function period_from_query(req) {
  const now = new Date();
  return { month: req.query.month || now.getMonth() + 1, year: req.query.year || now.getFullYear() };
}

export async function get_employee_performance_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_employee_performance(req.params.userId, period_from_query(req)) }); }
  catch (e) { return next(e); }
}

export async function get_project_performance_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_project_performance(req.params.projectId, period_from_query(req)) }); }
  catch (e) { return next(e); }
}

export async function get_client_performance_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_client_performance(req.params.clientId, period_from_query(req)) }); }
  catch (e) { return next(e); }
}

export async function get_department_performance_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_department_performance(req.params.departmentId, period_from_query(req)) }); }
  catch (e) { return next(e); }
}

export async function get_business_unit_performance_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_business_unit_performance(req.params.unit, period_from_query(req)) }); }
  catch (e) { return next(e); }
}
