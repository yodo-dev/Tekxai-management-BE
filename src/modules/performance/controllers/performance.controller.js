import {
  approve_bonus,
  calculate_bonus,
  create_daily_report,
  delete_score,
  get_employee_score,
  list_bonus_config,
  list_bonus_records,
  list_daily_reports,
  list_scores,
  mark_bonus_paid,
  update_daily_report,
  upsert_score,
} from '../services/performance.service.js';
import { send_performance_score_email } from '../../email/email.service.js';
import prisma from '../../../shared/database/client.js';

const is_admin = (req) => req.user.roles.some((r) => ['ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER'].includes(r));

// ── Daily Reports ────────────────────────────────────────────────────────────
export async function get_reports(req, res, next) {
  try {
    return res.json({ success: true, payload: await list_daily_reports({ ...req.query, user_id: req.user.id, is_admin: is_admin(req) }) });
  } catch (e) { return next(e); }
}

export async function post_report(req, res, next) {
  try {
    return res.status(201).json({ success: true, payload: await create_daily_report(req.user.id, req.body) });
  } catch (e) { return next(e); }
}

export async function patch_report(req, res, next) {
  try {
    return res.json({ success: true, payload: await update_daily_report(req.params.id, req.user.id, req.body, is_admin(req)) });
  } catch (e) { return next(e); }
}

// ── Performance Scores ───────────────────────────────────────────────────────
export async function get_scores(req, res, next) {
  try {
    return res.json({ success: true, payload: await list_scores({ ...req.query, user_id: req.user.id, is_admin: is_admin(req) }) });
  } catch (e) { return next(e); }
}

export async function get_score_for_employee(req, res, next) {
  try {
    return res.json({ success: true, payload: await get_employee_score(req.params.employeeId, req.query.period) });
  } catch (e) { return next(e); }
}

export async function post_score(req, res, next) {
  try {
    const data = { ...req.body };
    if (!data.user_id && data.employee_id) data.user_id = data.employee_id;
    delete data.employee_id;
    const result = await upsert_score(data);
    // Email the employee their performance score
    if (data.user_id) {
      const employee = await prisma.users.findUnique({ where: { id: data.user_id }, select: { email: true, first_name: true } });
      if (employee?.email) {
        send_performance_score_email(employee.email, employee.first_name || 'Employee', data.period || '', result.total_score).catch(() => {});
      }
    }
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
}

export async function delete_score_ctrl(req, res, next) {
  try {
    await delete_score(req.params.id);
    return res.json({ success: true, message: 'Performance score deleted' });
  } catch (e) { return next(e); }
}

// ── Bonus ────────────────────────────────────────────────────────────────────
export async function get_bonus_config_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await list_bonus_config() });
  } catch (e) { return next(e); }
}

export async function get_bonus(req, res, next) {
  try {
    return res.json({ success: true, payload: await list_bonus_records({ ...req.query, user_id: req.user.id, is_admin: is_admin(req) }) });
  } catch (e) { return next(e); }
}

export async function calc_bonus(req, res, next) {
  try {
    return res.json({ success: true, payload: await calculate_bonus(req.body.user_id || req.user.id, req.body.period) });
  } catch (e) { return next(e); }
}

export async function approve_bonus_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await approve_bonus(req.params.id, req.user.id) });
  } catch (e) { return next(e); }
}

export async function pay_bonus_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await mark_bonus_paid(req.params.id) });
  } catch (e) { return next(e); }
}
