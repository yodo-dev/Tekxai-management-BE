import {
  assign_shift, create_shift, create_violation, delete_shift, find_violations,
  get_attendance_summary, get_default_shift, get_user_shift, list_shifts, update_shift,
} from '../repositories/attendance.repository.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

/**
 * Check if a check-in time is late given the user's shift.
 * Returns { is_late, late_mins }.
 */
export async function check_late(user_id, check_in_time) {
  const check_in_dt = new Date(check_in_time);

  // Get user's assigned shift or fall back to default
  const emp_shift = await get_user_shift(user_id, check_in_dt);
  const shift = emp_shift?.shift || await get_default_shift();
  if (!shift) return { is_late: false, late_mins: 0 };

  // Parse shift start HH:MM
  const [sh, sm] = shift.start_time.split(':').map(Number);
  const shift_start = new Date(check_in_dt);
  shift_start.setHours(sh, sm, 0, 0);

  const grace_end = new Date(shift_start.getTime() + shift.grace_period_mins * 60 * 1000);
  const is_late   = check_in_dt > grace_end;
  const late_mins = is_late ? Math.floor((check_in_dt - shift_start) / 60000) : 0;

  return { is_late, late_mins, shift_start, grace_period_mins: shift.grace_period_mins };
}

/**
 * Auto-detect and record late violation for a timesheet entry.
 * Called after clock_in.
 */
export async function process_attendance_on_clock_in(user_id, entry_id, check_in_time) {
  const { is_late, late_mins } = await check_late(user_id, check_in_time);
  if (is_late) {
    await create_violation({
      user_id,
      entry_id,
      date: check_in_time,
      violation_type: 'LATE',
      late_mins,
      remarks: `Late by ${late_mins} minutes`,
    });
  }
  return { is_late, late_mins };
}

export const get_shifts      = () => list_shifts();
export const create_shift_svc = (data) => {
  if (!data.name) throw app_error('name is required');
  if (!data.start_time) throw app_error('start_time is required (HH:MM)');
  if (!data.end_time)   throw app_error('end_time is required (HH:MM)');
  return create_shift(data);
};
export const update_shift_svc = (id, data) => update_shift(id, data);
export const delete_shift_svc = (id) => delete_shift(id);

export async function assign_shift_svc(data) {
  if (!data.user_id)   throw app_error('user_id required');
  if (!data.shift_id)  throw app_error('shift_id required');
  if (!data.start_date) throw app_error('start_date required');
  return assign_shift(data);
}

export async function get_violations(filters) {
  return find_violations(filters);
}

export async function get_summary(user_id, year, month) {
  if (!user_id) throw app_error('user_id required');
  const y = year  || new Date().getFullYear();
  const m = month || new Date().getMonth() + 1;
  return get_attendance_summary(user_id, y, m);
}
