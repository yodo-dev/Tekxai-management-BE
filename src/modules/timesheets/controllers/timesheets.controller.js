import { send_leave_approved_email, send_leave_rejected_email } from '../../email/email.service.js';
import { compute_violation } from '../../attendance/repositories/attendance.repository.js';
import { can_manually_record_attendance } from '../../attendance/constants/attendance-status-rules.js';
import { lifecycle_allows_manual_entry } from '../../attendance/constants/lifecycle-attendance-rules.js';
import { get_or_create_balance, mark_pending, deduct_leave, restore_leave } from '../../leave-balances/repositories/leave-balances.repository.js';
import { create_notification } from '../../notifications/services/notifications.service.js';
import prisma from '../../../shared/database/client.js';
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
  find_recent_entries,
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

// GET /timesheet/recent-activity
// Admin-facing feed of the most recent check-in/check-out events across all
// employees (non-admins only ever see their own).
export async function recent_activity(req, res, next) {
  try {
    const is_admin = req.user.roles.some((r) =>
      ['ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER'].includes(r)
    );
    const limit = Math.min(+req.query.limit || 10, 50);
    const entries = await find_recent_entries(limit, is_admin ? null : req.user.id);

    const activity = entries.map((e) => {
      const is_checkout = !!e.check_out;
      const at = is_checkout ? e.check_out : e.check_in;
      return {
        id: e.id,
        type: is_checkout ? 'CHECK_OUT' : 'CHECK_IN',
        employee: e.user ? `${e.user.first_name} ${e.user.last_name}`.trim() : 'Unknown',
        user_id: e.user_id,
        at,
        message: `${e.user ? `${e.user.first_name} ${e.user.last_name}`.trim() : 'Someone'} ${is_checkout ? 'checked out' : 'checked in'}`,
      };
    });

    return ok(res, activity);
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
    // Async: check for late-coming violation. Non-blocking by design (a
    // violation-computation failure must never fail clock-in itself), but
    // the error is logged rather than silently discarded — a swallowed
    // error here previously hid a schema mismatch that meant no violation
    // was ever recorded (Sprint 2 Milestone 1).
    compute_violation(req.user.id, entry).catch((err) => {
      console.error('[attendance] compute_violation failed for user', req.user.id, err);
    });
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
//
// Sprint 2 Milestone 5: reserves the requested days against the requester's
// leave balance via mark_pending() — the single, canonical write path for
// leave balances (modules/leave-balances). Does not consume used_days; the
// request only moves from pending to used on approval (approve_time_off_ctrl).
export async function time_off_request(req, res, next) {
  try {
    const { policy_id, start_date, end_date, days, reason } = req.body;
    if (!policy_id || !start_date || !end_date || !reason) {
      return fail(res, 'policy_id, start_date, end_date, and reason are required');
    }
    const day_count = Number(days) || 1;
    const result = await create_time_off_request({
      user_id: req.user.id, policy_id, start_date, end_date,
      days: day_count, reason,
    });
    await mark_pending(req.user.id, policy_id, day_count);
    return ok(res, result, 'Time-off request submitted', 201);
  } catch (err) { next(err); }
}

// POST /timesheet/time-off/:id/approve
//
// Sprint 2 Milestone 5: hard-blocks approval if it would take the requester's
// leave balance below zero (checked against the balance's current
// remaining_days, which is only decremented by an actual approval — see
// leave-balances.repository.js). Only on passing that check does this call
// deduct_leave(), the single canonical debit path (pending -> used).
export async function approve_time_off_ctrl(req, res, next) {
  try {
    const pending = await prisma.time_off_requests.findUnique({ where: { id: req.params.id } });
    if (!pending) return fail(res, 'Time-off request not found', 404);

    // Matches the year convention used by mark_pending/deduct_leave/restore_leave
    // below (current year at call time, not the request's start_date).
    const balance = await get_or_create_balance(pending.user_id, pending.policy_id, new Date().getFullYear());
    if (!balance || balance.remaining_days < pending.days) {
      return fail(res, `Cannot approve: insufficient leave balance (${balance?.remaining_days ?? 0} remaining, ${pending.days} requested).`, 400);
    }

    const result = await update_time_off_status(req.params.id, 'APPROVED', req.body.comment, req.user.id);
    await deduct_leave(pending.user_id, pending.policy_id, pending.days);

    // Send email notification (non-blocking)
    if (result?.user?.email) {
      const name = result.user.first_name || 'Employee';
      const policy = result.policy?.name || 'Leave';
      const range = `${new Date(result.start_date).toLocaleDateString()} – ${new Date(result.end_date).toLocaleDateString()}`;
      send_leave_approved_email(result.user.email, name, policy, range).catch(() => {});
    }
    // Sprint 2 Milestone 6: in-app notification, additive to the existing email above.
    create_notification({
      user_id: result.user_id,
      title: 'Leave Request Approved',
      message: `Your ${result.policy?.name || 'leave'} request has been approved.`,
      type: 'ATTENDANCE',
    }).catch(() => null);
    return ok(res, result, 'Time-off request approved');
  } catch (err) { next(err); }
}

// POST /timesheet/time-off/:id/reject
//
// Sprint 2 Milestone 5: releases the pending reservation via restore_leave()
// (same function a future Cancel Pending Request action would use — see
// leave-balances.repository.js). No used_days change, since the request
// was never approved.
export async function reject_time_off_ctrl(req, res, next) {
  try {
    const pending = await prisma.time_off_requests.findUnique({ where: { id: req.params.id } });
    if (!pending) return fail(res, 'Time-off request not found', 404);

    const result = await update_time_off_status(req.params.id, 'REJECTED', req.body.comment, req.user.id);
    await restore_leave(pending.user_id, pending.policy_id, pending.days);

    if (result?.user?.email) {
      const name = result.user.first_name || 'Employee';
      const policy = result.policy?.name || 'Leave';
      const range = `${new Date(result.start_date).toLocaleDateString()} – ${new Date(result.end_date).toLocaleDateString()}`;
      send_leave_rejected_email(result.user.email, name, policy, range, req.body.comment).catch(() => {});
    }
    // Sprint 2 Milestone 6: in-app notification, additive to the existing email above.
    create_notification({
      user_id: result.user_id,
      title: 'Leave Request Rejected',
      message: `Your ${result.policy?.name || 'leave'} request was rejected${req.body.comment ? `: ${req.body.comment}` : '.'}`,
      type: 'ATTENDANCE',
    }).catch(() => null);
    return ok(res, result, 'Time-off request rejected');
  } catch (err) { next(err); }
}

// POST /timesheet/entry — manual admin correction, not a self-service path.
// Real-time clock-in already exists (POST /timesheet/clock-in); a
// retroactive correction for an existing entry goes through
// request_entry_edit + approve_edit below. This endpoint is now
// permission-gated (see routes) so it can only be reached by the same
// roles that can approve time-off/edit requests — it is not a second
// self-service attendance path.
//
// Reuses compute_violation() (the canonical Sprint 2 M1 write path), same
// as clock_in, so a manually-created entry is never silently exempt from
// violation detection.
//
// Sprint 2 Milestone 3: also checks the TARGET employee's Employment Status
// (req.user.id — this endpoint always creates for the requester) via the
// same can_manually_record_attendance() rule the update endpoint below
// uses, so SUSPENDED/TERMINATED/DECEASED employees cannot have a manual
// attendance record created for them.
//
// Sprint 2 Milestone 4: also checks the same target's Lifecycle Stage
// ("most restrictive wins" — Employment Status is checked first).
export async function create_entry_ctrl(req, res, next) {
  try {
    const { check_in, check_out, note } = req.body;
    if (!check_in) return fail(res, 'check_in is required');
    const requester = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: { status: true, employee_profile: { select: { lifecycle_stage: true } } },
    });
    if (!can_manually_record_attendance(requester?.status)) {
      return fail(res, `Cannot create an attendance entry while employment status is ${requester?.status}.`, 403);
    }
    if (!lifecycle_allows_manual_entry(requester?.employee_profile?.lifecycle_stage)) {
      return fail(res, `Cannot create an attendance entry while lifecycle stage is ${requester?.employee_profile?.lifecycle_stage}.`, 403);
    }
    const entry = await create_entry({ user_id: req.user.id, check_in, check_out, note });
    compute_violation(entry.user_id, entry).catch((err) => {
      console.error('[attendance] compute_violation failed for user', entry.user_id, err);
    });
    return ok(res, entry, 'Entry created', 201);
  } catch (err) { next(err); }
}

// PUT /timesheet/entry/:id — same manual-correction scope as create_entry_ctrl
// above (see routes: permission-gated to admin/manager roles). Reuses
// compute_violation() when check_in changes, for the same reason.
//
// Sprint 2 Milestone 3: checks the ENTRY OWNER's Employment Status (not
// necessarily req.user's — an admin can edit any employee's entry), since
// the rule is about whose attendance record is being modified, not who is
// performing the edit.
//
// Sprint 2 Milestone 4: also checks the same owner's Lifecycle Stage
// ("most restrictive wins" — Employment Status is checked first).
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
    const owner = await prisma.users.findUnique({
      where: { id: existing.user_id },
      select: { status: true, employee_profile: { select: { lifecycle_stage: true } } },
    });
    if (!can_manually_record_attendance(owner?.status)) {
      return fail(res, `Cannot modify an attendance entry while employment status is ${owner?.status}.`, 403);
    }
    if (!lifecycle_allows_manual_entry(owner?.employee_profile?.lifecycle_stage)) {
      return fail(res, `Cannot modify an attendance entry while lifecycle stage is ${owner?.employee_profile?.lifecycle_stage}.`, 403);
    }
    const entry = await update_entry(req.params.id, req.body);
    if (req.body.check_in) {
      compute_violation(entry.user_id, entry).catch((err) => {
        console.error('[attendance] compute_violation failed for user', entry.user_id, err);
      });
    }
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
//
// Approval is the canonical modification path for a disputed entry — this
// is the only place a timesheet_edit_requests row is allowed to result in a
// timesheet_entries change. It reuses update_entry() (the same function the
// manual-correction endpoints above use), not a separate raw Prisma call, so
// there is exactly one place that updates timesheet_entries. Previously this
// only flipped the request's own status and never touched the entry at all
// — approving an edit request had no effect on the underlying attendance
// record (Sprint 2 Milestone 2 fix).
//
// Sprint 2 Milestone 3: this is a manual-attendance-modification path just
// like update_entry_ctrl above, so it must not become a bypass of the same
// SUSPENDED/TERMINATED/DECEASED rule that endpoint enforces. Checked BEFORE
// the request is marked APPROVED, so a blocked attempt leaves the request
// PENDING rather than silently marking it approved without applying it —
// exactly the kind of no-op this milestone exists to avoid reintroducing.
//
// Sprint 2 Milestone 4: also checks the same owner's Lifecycle Stage
// ("most restrictive wins" — Employment Status is checked first), same
// PENDING-not-silently-approved guarantee.
export async function approve_edit(req, res, next) {
  try {
    const pending = await prisma.timesheet_edit_requests.findUnique({ where: { id: req.params.id } });
    if (!pending) return fail(res, 'Edit request not found', 404);

    if (pending.entry_id) {
      const target_entry = await find_entry_by_id(pending.entry_id);
      if (target_entry) {
        const owner = await prisma.users.findUnique({
          where: { id: target_entry.user_id },
          select: { status: true, employee_profile: { select: { lifecycle_stage: true } } },
        });
        if (!can_manually_record_attendance(owner?.status)) {
          return fail(res, `Cannot modify an attendance entry while employment status is ${owner?.status}.`, 403);
        }
        if (!lifecycle_allows_manual_entry(owner?.employee_profile?.lifecycle_stage)) {
          return fail(res, `Cannot modify an attendance entry while lifecycle stage is ${owner?.employee_profile?.lifecycle_stage}.`, 403);
        }
      }
    }

    const req_data = await update_edit_request_status(req.params.id, 'APPROVED', req.user.id);

    if (req_data.entry_id && (req_data.new_check_in || req_data.new_check_out)) {
      const updated_entry = await update_entry(req_data.entry_id, {
        check_in: req_data.new_check_in || undefined,
        check_out: req_data.new_check_out || undefined,
      });
      if (req_data.new_check_in) {
        compute_violation(updated_entry.user_id, updated_entry).catch((err) => {
          console.error('[attendance] compute_violation failed for user', updated_entry.user_id, err);
        });
      }
    }

    // Sprint 2 Milestone 6: notify the requester (timesheet_edit_requests.user_id).
    create_notification({
      user_id: pending.user_id,
      title: 'Timesheet Edit Request Approved',
      message: 'Your timesheet edit request has been approved.',
      type: 'ATTENDANCE',
    }).catch(() => null);

    return ok(res, req_data, 'Edit request approved');
  } catch (err) { next(err); }
}

// POST /timesheet/edit-request/:id/reject — intentionally touches only the
// request's own status; the underlying timesheet_entries row is never
// modified on rejection.
export async function reject_edit(req, res, next) {
  try {
    const req_data = await update_edit_request_status(req.params.id, 'REJECTED', req.user.id);
    // Sprint 2 Milestone 6: notify the requester (timesheet_edit_requests.user_id).
    create_notification({
      user_id: req_data.user_id,
      title: 'Timesheet Edit Request Rejected',
      message: 'Your timesheet edit request was rejected.',
      type: 'ATTENDANCE',
    }).catch(() => null);
    return ok(res, req_data, 'Edit request rejected');
  } catch (err) { next(err); }
}
