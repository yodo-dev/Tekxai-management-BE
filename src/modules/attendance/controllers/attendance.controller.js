import {
  assign_shift, attendance_summary, compute_violation, delete_shift,
  find_all_shifts, find_violations, get_user_shift, upsert_shift,
} from '../repositories/attendance.repository.js';

function ok(res, payload, msg = 'OK', status = 200) {
  return res.status(status).json({ success: true, message: msg, payload });
}
function fail(res, msg, status = 400) {
  return res.status(status).json({ success: false, message: msg });
}

export async function list_shifts_ctrl(req, res, next) {
  try {
    const shifts = await find_all_shifts();
    return ok(res, shifts);
  } catch (err) { next(err); }
}

export async function upsert_shift_ctrl(req, res, next) {
  try {
    const { name, start_time, end_time, grace_period_min, is_default, id } = req.body;
    if (!name || !start_time || !end_time) return fail(res, 'name, start_time, end_time required');
    const shift = await upsert_shift({ id, name, start_time, end_time, grace_period_min, is_default });
    return ok(res, shift, id ? 'Shift updated' : 'Shift created', id ? 200 : 201);
  } catch (err) { next(err); }
}

export async function delete_shift_ctrl(req, res, next) {
  try {
    await delete_shift(req.params.id);
    return ok(res, null, 'Shift deleted');
  } catch (err) { next(err); }
}

export async function assign_shift_ctrl(req, res, next) {
  try {
    const { user_id, shift_id } = req.body;
    if (!user_id || !shift_id) return fail(res, 'user_id and shift_id required');
    const result = await assign_shift(user_id, shift_id);
    return ok(res, result, 'Shift assigned');
  } catch (err) { next(err); }
}

export async function get_my_shift_ctrl(req, res, next) {
  try {
    const shift = await get_user_shift(req.user.id);
    return ok(res, shift || null);
  } catch (err) { next(err); }
}

export async function list_violations_ctrl(req, res, next) {
  try {
    const is_admin = req.user.roles.some((r) => ['ADMIN','SUPER_ADMIN','HR','DIVISION_MANAGER'].includes(r));
    const params = { ...req.query };
    if (!is_admin) params.user_id = req.user.id;
    const result = await find_violations(params);
    return ok(res, result);
  } catch (err) { next(err); }
}

export async function get_my_attendance_summary(req, res, next) {
  try {
    const { start_date, end_date } = req.query;
    const start = start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const end = end_date || new Date().toISOString();
    const summary = await attendance_summary(req.user.id, start, end);
    return ok(res, summary);
  } catch (err) { next(err); }
}
