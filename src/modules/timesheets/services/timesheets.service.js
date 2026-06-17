import {
  create_edit_request,
  create_entry,
  create_time_off_request,
  delete_entry,
  find_all_weekly_entries,
  find_edit_requests,
  find_entry_by_id,
  find_time_off_policies,
  find_time_off_requests,
  find_weekly_entries,
  update_edit_request_status,
  update_entry,
  update_time_off_status,
} from '../repositories/timesheets.repository.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

function get_week_start(date) {
  const d = date ? new Date(date) : new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function format_duration(seconds) {
  if (!seconds) return '0h 0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function format_time(dt) {
  if (!dt) return null;
  return new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function build_week_rows(entries, week_start) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const rows = days.map((label, i) => {
    const day_date = new Date(week_start);
    day_date.setDate(day_date.getDate() + i);
    const iso = day_date.toISOString().split('T')[0];

    const entry = entries.find((e) => {
      const d = new Date(e.check_in);
      return d.toISOString().split('T')[0] === iso;
    });

    if (!entry) {
      return {
        entry_id: null,
        day_date: iso,
        day_label: `${label}, ${day_date.toLocaleString('en-US', { month: 'short', day: '2-digit' })}`,
        has_entry: false,
        check_in: null,
        check_out: null,
        duration_seconds: 0,
        duration_label: '—',
        status: null,
        status_label: null,
        no_entry_text: 'No entry',
        employee: entry?.user ? `${entry.user.first_name} ${entry.user.last_name}` : undefined,
      };
    }

    const dur = entry.duration_sec || 0;
    return {
      entry_id: entry.id,
      day_date: iso,
      day_label: `${label}, ${day_date.toLocaleString('en-US', { month: 'short', day: '2-digit' })}`,
      has_entry: true,
      check_in: format_time(entry.check_in),
      check_out: format_time(entry.check_out),
      duration_seconds: dur,
      duration_label: format_duration(dur),
      status: entry.status,
      status_label: entry.status === 'COMPLETED' ? 'Completed' : entry.status === 'IN_PROGRESS' ? 'In Progress' : entry.status,
      no_entry_text: '',
      employee: entry.user ? `${entry.user.first_name} ${entry.user.last_name}` : undefined,
    };
  });

  const total_sec = rows.reduce((s, r) => s + r.duration_seconds, 0);

  return {
    week_start: week_start.toISOString(),
    week_end: new Date(week_start.getTime() + 6 * 86400000).toISOString(),
    week_label: `${week_start.toLocaleString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(week_start.getTime() + 6 * 86400000).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    total_duration_seconds: total_sec,
    total_duration_label: format_duration(total_sec),
    rows,
  };
}

// ── Public service functions ─────────────────────────────────────────────────

export async function get_weekly_timesheet(user_id, { date, is_admin = false, search } = {}) {
  const week_start = get_week_start(date);

  const entries = is_admin
    ? await find_all_weekly_entries(week_start, search)
    : await find_weekly_entries(user_id, week_start);

  return build_week_rows(entries, week_start);
}

export async function get_my_requests(user_id) {
  const [time_off, edits] = await Promise.all([
    find_time_off_requests({ user_id }),
    find_edit_requests({ user_id }),
  ]);

  return {
    time_off_requests: time_off.map(normalize_time_off),
    timesheet_edit_requests: edits.map(normalize_edit_request),
    counts: { time_off_requests: time_off.length, timesheet_edit_requests: edits.length },
  };
}

export async function get_all_requests() {
  const [time_off, edits] = await Promise.all([
    find_time_off_requests(),
    find_edit_requests(),
  ]);

  return {
    time_off_requests: time_off.map(normalize_time_off),
    timesheet_edit_requests: edits.map(normalize_edit_request),
    counts: { time_off_requests: time_off.length, timesheet_edit_requests: edits.length },
  };
}

export async function add_entry(user_id, data) {
  return create_entry({ ...data, user_id });
}

export async function edit_entry(id, user_id, data) {
  const entry = await find_entry_by_id(id);
  if (!entry) throw app_error('Entry not found', 404);
  if (entry.user_id !== user_id) throw app_error('Forbidden', 403);
  return update_entry(id, data);
}

export async function remove_entry(id, user_id, is_admin) {
  const entry = await find_entry_by_id(id);
  if (!entry) throw app_error('Entry not found', 404);
  if (!is_admin && entry.user_id !== user_id) throw app_error('Forbidden', 403);
  return delete_entry(id);
}

export async function request_edit(entry_id, user_id, data) {
  const entry = await find_entry_by_id(entry_id);
  if (!entry) throw app_error('Entry not found', 404);
  return create_edit_request({ entry_id, user_id, ...data });
}

export async function approve_edit_request(id, reviewer_id) {
  return update_edit_request_status(id, 'APPROVED', reviewer_id);
}

export async function reject_edit_request(id, reviewer_id) {
  return update_edit_request_status(id, 'REJECTED', reviewer_id);
}

export const get_policies = () => find_time_off_policies();

export async function request_time_off(user_id, data) {
  return create_time_off_request({ ...data, user_id });
}

export async function approve_time_off(id, reviewer_id, comment) {
  return update_time_off_status(id, 'APPROVED', comment, reviewer_id);
}

export async function reject_time_off(id, reviewer_id, comment) {
  return update_time_off_status(id, 'REJECTED', comment, reviewer_id);
}

// ── Normalizers ───────────────────────────────────────────────────────────────

function normalize_time_off(r) {
  const start = new Date(r.start_date);
  const end = new Date(r.end_date);
  return {
    id: r.id,
    policy_name: r.policy?.name || 'Leave',
    status: r.status,
    status_label: r.status.charAt(0) + r.status.slice(1).toLowerCase(),
    date_range_label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    total_hours_label: `${(r.days || 1) * 8}h total`,
    days: r.days,
    reason: r.reason,
    manager_comment: r.manager_comment,
    submitted_at_label: `Submitted ${new Date(r.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    name: r.user ? `${r.user.first_name} ${r.user.last_name}` : 'Unknown',
    email: r.user?.email,
    avatar: r.user?.avatar,
  };
}

function normalize_edit_request(r) {
  return {
    id: r.id,
    name: `Edit Request – ${new Date(r.created_at).toLocaleDateString()}`,
    status: r.status,
    reason: r.reason,
    date_range_label: r.entry ? new Date(r.entry.check_in).toLocaleDateString() : '',
    status_label: r.status.charAt(0) + r.status.slice(1).toLowerCase(),
  };
}
