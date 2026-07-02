import { send_leave_approved_email, send_leave_rejected_email } from '../../email/email.service.js';
import { compute_violation } from '../../attendance/repositories/attendance.repository.js';
import {
  clock_in as repo_clock_in,
  clock_out as repo_clock_out,
  create_edit_request,
  create_entry,
  create_time_off_request,
  delete_entry,
  find_all_weekly_entries,
  find_edit_requests,
  find_entry_by_id,
  find_time_off_policies,
  find_time_off_requests,
  find_todays_open_entry,
  find_today_entries,
  find_weekly_entries,
  force_checkout as repo_force_checkout,
  update_edit_request_status,
  update_entry,
  update_time_off_status,
} from '../repositories/timesheets.repository.js';
import {
  build_week_rows,
  format_duration,
  get_week_start,
} from '../services/timesheets.service.js';

function ok(res, payload, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, message, payload });
}
function fail(res, message, status = 400) {
  return res.status(status).json({ success: false, message });
}

// GET /timesheet/weekly?date=&search=
export async function weekly(req, res, next) {
  try {
    const { date, search } = req.query;
    const week_start = get_week_start(date);
    const is_admin = req.user.roles.some((r) =>
      ['ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER'].includes(r)
    );

    let entries;
    if (is_admin) {
      entries = await find_all_weekly_entries(week_start, search);
    } else {
      entries = await find_weekly_entries(req.user.id, week_start);
    }

    const rows = build_week_rows(entries, week_start);
    const total_sec = rows.reduce((s, r) => s + r.duration_seconds, 0);
    const week_end = new Date(week_start);
    week_end.setDate(week_end.getDate() + 6);

    return ok(res, {
      week_start: week_start.toISOString().split('T')[0],
      week_end: week_end.toISOString().split('T')[0],
      week_label: `${week_start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${week_end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      total_duration_seconds: total_sec,
      total_duration_label: format_duration(total_sec),
      rows,
    });
  } catch (err) { next(err); }
}

// POST /timesheet/clock-in
export async function clock_in(req, res, next) {
  try {
    const { note } = req.body;
    // Check if already clocked in today
    const existing = await find_todays_open_entry(req.user.id);
    if (existing) {
      return fail(res, 'You are already clocked in. Please clock out first.', 409);
    }
    const entry = await repo_clock_in(req.user.id, note);
    // Async: check for late-coming violation (non-blocking)
    compute_violation(req.user.id, entry).catch(() => {});
    return ok(res, entry, 'Clocked in successfully', 201);
  } catch (err) { next(err); }
}

// POST /timesheet/clock-out
export async function clock_out(req, res, next) {
  try {
    const { note } = req.body;
    const open = await find_todays_open_entry(req.user.id);
    if (!open) {
      return fail(res, 'No active clock-in found. Please clock in first.', 404);
    }
    const entry = await repo_clock_out(open.id, note);
    return ok(res, entry, 'Clocked out successfully');
  } catch (err) { next(err); }
}

// POST /timesheet/force-checkout
// Closes the most recent open entry regardless of date.
// reason: 'LOGOUT' | 'IDLE_TIMEOUT' | 'MANUAL' (default)
export async function force_checkout(req, res, next) {
  try {
    const reason = req.body?.reason || 'MANUAL';
    const entry = await repo_force_checkout(req.user.id, reason);
    if (!entry) return ok(res, null, 'No active session found');
    return ok(res, entry, 'Checked out successfully');
  } catch (err) { next(err); }
}

// GET /timesheet/today
// Aggregates all of today's sessions so an employee who clocks in more than
// once in a day (e.g. 9am-11am, then 2pm-6pm) sees a running total rather
// than only their most recent session.
export async function today_entry(req, res, next) {
  try {
    const entries = await find_today_entries(req.user.id);
    if (!entries.length) {
      return ok(res, { clocked_in: false, clocked_out: false, entry: null });
    }

    const open = entries.find((e) => !e.check_out);
    const completed_seconds = entries
      .filter((e) => e.check_out)
      .reduce((sum, e) => sum + (e.duration_sec || 0), 0);
    const last = entries[entries.length - 1];

    if (open) {
      return ok(res, {
        clocked_in: true,
        clocked_out: false,
        entry: {
          id: open.id,
          check_in: open.check_in,
          check_out: null,
          prior_seconds: completed_seconds,
          status: open.status,
        },
      });
    }

    return ok(res, {
      clocked_in: true,
      clocked_out: true,
      entry: {
        id: last.id,
        check_in: last.check_in,
        check_out: last.check_out,
        duration_seconds: completed_seconds,
        duration_label: format_duration_local(completed_seconds),
        status: last.status,
      },
    });
  } catch (err) { next(err); }
}

function format_duration_local(seconds) {
  if (!seconds) return '0h 0m';
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

// GET /timesheet/requests
export async function requests(req, res, next) {
  try {
    const is_admin = req.user.roles.some((r) =>
      ['ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER'].includes(r)
    );
    const filter = is_admin ? {} : { user_id: req.user.id };
    const [edit_reqs, time_off_reqs] = await Promise.all([
      find_edit_requests(filter),
      find_time_off_requests(filter),
    ]);

    const fmt_edit = edit_reqs.map((r) => ({
      id: r.id,
      name: `${r.user.first_name} ${r.user.last_name}`,
      email: r.user.email || '',
      avatar: r.user.avatar,
      status: r.status,
      status_label: r.status.charAt(0) + r.status.slice(1).toLowerCase(),
      reason: r.reason,
      time: r.created_at,
      date_range_label: r.entry?.check_in
        ? new Date(r.entry.check_in).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
        : '—',
    }));

    const fmt_off = time_off_reqs.map((r) => ({
      id: r.id,
      name: `${r.user.first_name} ${r.user.last_name}`,
      email: r.user.email || '',
      avatar: r.user.avatar,
      policy_name: r.policy?.name || 'Leave',
      status: r.status,
      status_label: r.status.charAt(0) + r.status.slice(1).toLowerCase(),
      days: r.days,
      reason: r.reason,
      manager_comment: r.manager_comment,
      date_range_label: `${new Date(r.start_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} – ${new Date(r.end_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}`,
      total_hours_label: `${r.days * 8}h`,
      submitted_at_label: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    }));

    return ok(res, {
      timesheet_edit_requests: fmt_edit,
      time_off_requests: fmt_off,
      counts: { timesheet_edit_requests: fmt_edit.length, time_off_requests: fmt_off.length },
    });
  } catch (err) { next(err); }
}

// GET /timesheet/my-requests
export async function my_requests(req, res, next) {
  try {
    req.user.roles = req.user.roles || [];
    const filter = { user_id: req.user.id };
    const [edit_reqs, time_off_reqs] = await Promise.all([
      find_edit_requests(filter),
      find_time_off_requests(filter),
    ]);
    return ok(res, {
      timesheet_edit_requests: edit_reqs,
      time_off_requests: time_off_reqs,
      counts: { timesheet_edit_requests: edit_reqs.length, time_off_requests: time_off_reqs.length },
    });
  } catch (err) { next(err); }
}

// GET /timesheet/time-off/policies
// GET /timesheet/time-off — manager/admin list (all or by status)
export async function list_time_off_ctrl(req, res, next) {
  try {
    const { status, user_id } = req.query;
    const records = await find_time_off_requests({ status, user_id });
    return ok(res, { records, total: records.length });
  } catch (err) { next(err); }
}

export async function get_time_off_policies(req, res, next) {
  try {
    const policies = await find_time_off_policies();
    return ok(res, { records: policies, total: policies.length });
  } catch (err) { next(err); }
}

// POST /timesheet/time-off/request
export async function time_off_request(req, res, next) {
  try {
    const { policy_id, start_date, end_date, days, reason } = req.body;
    if (!policy_id || !start_date || !end_date || !reason) {
      return fail(res, 'policy_id, start_date, end_date, and reason are required');
    }
    const result = await create_time_off_request({
      user_id: req.user.id, policy_id, start_date, end_date,
      days: Number(days) || 1, reason,
    });
    return ok(res, result, 'Time-off request submitted', 201);
  } catch (err) { next(err); }
}

// POST /timesheet/time-off/:id/approve
export async function approve_time_off_ctrl(req, res, next) {
  try {
    const result = await update_time_off_status(req.params.id, 'APPROVED', req.body.comment, req.user.id);
    // Send email notification (non-blocking)
    if (result?.user?.email) {
      const name = result.user.first_name || 'Employee';
      const policy = result.policy?.name || 'Leave';
      const range = `${new Date(result.start_date).toLocaleDateString()} – ${new Date(result.end_date).toLocaleDateString()}`;
      send_leave_approved_email(result.user.email, name, policy, range).catch(() => {});
    }
    return ok(res, result, 'Time-off request approved');
  } catch (err) { next(err); }
}

// POST /timesheet/time-off/:id/reject
export async function reject_time_off_ctrl(req, res, next) {
  try {
    const result = await update_time_off_status(req.params.id, 'REJECTED', req.body.comment, req.user.id);
    if (result?.user?.email) {
      const name = result.user.first_name || 'Employee';
      const policy = result.policy?.name || 'Leave';
      const range = `${new Date(result.start_date).toLocaleDateString()} – ${new Date(result.end_date).toLocaleDateString()}`;
      send_leave_rejected_email(result.user.email, name, policy, range, req.body.comment).catch(() => {});
    }
    return ok(res, result, 'Time-off request rejected');
  } catch (err) { next(err); }
}

// POST /timesheet/entry
export async function create_entry_ctrl(req, res, next) {
  try {
    const { check_in, check_out, note } = req.body;
    if (!check_in) return fail(res, 'check_in is required');
    const entry = await create_entry({ user_id: req.user.id, check_in, check_out, note });
    return ok(res, entry, 'Entry created', 201);
  } catch (err) { next(err); }
}

// PUT /timesheet/entry/:id
export async function update_entry_ctrl(req, res, next) {
  try {
    const existing = await find_entry_by_id(req.params.id);
    if (!existing) return fail(res, 'Entry not found', 404);
    const is_admin = req.user.roles.some((r) =>
      ['ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER'].includes(r)
    );
    if (!is_admin && existing.user_id !== req.user.id) {
      return fail(res, 'Forbidden', 403);
    }
    const entry = await update_entry(req.params.id, req.body);
    return ok(res, entry, 'Entry updated');
  } catch (err) { next(err); }
}

// DELETE /timesheet/entry/:id
export async function delete_entry_ctrl(req, res, next) {
  try {
    await delete_entry(req.params.id);
    return ok(res, null, 'Entry deleted');
  } catch (err) { next(err); }
}

// POST /timesheet/entry/:id/request
export async function request_entry_edit(req, res, next) {
  try {
    const { new_check_in, new_check_out, reason } = req.body;
    if (!reason) return fail(res, 'reason is required');
    const result = await create_edit_request({
      entry_id: req.params.id,
      user_id: req.user.id,
      new_check_in, new_check_out, reason,
    });
    return ok(res, result, 'Edit request submitted', 201);
  } catch (err) { next(err); }
}

// POST /timesheet/edit-request/:id/approve
export async function approve_edit(req, res, next) {
  try {
    const req_data = await update_edit_request_status(req.params.id, 'APPROVED', req.user.id);
    return ok(res, req_data, 'Edit request approved');
  } catch (err) { next(err); }
}

// POST /timesheet/edit-request/:id/reject
export async function reject_edit(req, res, next) {
  try {
    const req_data = await update_edit_request_status(req.params.id, 'REJECTED', req.user.id);
    return ok(res, req_data, 'Edit request rejected');
  } catch (err) { next(err); }
}
