import {
  get_onboarding_readiness, get_offboarding_readiness, get_probation_summary,
  move_to_probation, enter_notice_period, move_to_exit_clearance, archive_employee,
  request_confirm_employee, request_extend_probation, request_terminate_probation, request_archive_employee,
} from '../services/employee-lifecycle.service.js';

function ok(res, payload, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, message, payload });
}

export async function get_onboarding_readiness_ctrl(req, res, next) {
  try { return ok(res, await get_onboarding_readiness(req.params.userId)); } catch (err) { next(err); }
}

export async function get_offboarding_readiness_ctrl(req, res, next) {
  try { return ok(res, await get_offboarding_readiness(req.params.userId)); } catch (err) { next(err); }
}

export async function get_probation_summary_ctrl(req, res, next) {
  try { return ok(res, await get_probation_summary(req.params.userId)); } catch (err) { next(err); }
}

export async function move_to_probation_ctrl(req, res, next) {
  try { return ok(res, await move_to_probation(req.params.userId, req.user.id), 'Moved to Probation'); } catch (err) { next(err); }
}

export async function enter_notice_period_ctrl(req, res, next) {
  try { return ok(res, await enter_notice_period(req.params.userId, req.user.id, req.body || {}), 'Moved to Notice Period'); } catch (err) { next(err); }
}

export async function move_to_exit_clearance_ctrl(req, res, next) {
  try { return ok(res, await move_to_exit_clearance(req.params.userId, req.user.id), 'Moved to Exit Clearance'); } catch (err) { next(err); }
}

export async function archive_employee_ctrl(req, res, next) {
  try { return ok(res, await archive_employee(req.params.userId, req.user.id), 'Employee archived'); } catch (err) { next(err); }
}

export async function request_confirm_employee_ctrl(req, res, next) {
  try { return ok(res, await request_confirm_employee(req.params.userId, req.user.id, req.body || {}), 'Confirmation approval requested', 201); } catch (err) { next(err); }
}

export async function request_extend_probation_ctrl(req, res, next) {
  try { return ok(res, await request_extend_probation(req.params.userId, req.user.id, req.body || {}), 'Probation extension approval requested', 201); } catch (err) { next(err); }
}

export async function request_terminate_probation_ctrl(req, res, next) {
  try { return ok(res, await request_terminate_probation(req.params.userId, req.user.id, req.body || {}), 'Termination approval requested', 201); } catch (err) { next(err); }
}

export async function request_archive_employee_ctrl(req, res, next) {
  try { return ok(res, await request_archive_employee(req.params.userId, req.user.id, req.body || {}), 'Archive approval requested', 201); } catch (err) { next(err); }
}
