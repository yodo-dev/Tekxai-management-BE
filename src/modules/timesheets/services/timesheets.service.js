export function get_week_start(date) {
  const d = date ? new Date(date) : new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function format_duration(seconds) {
  if (!seconds) return '0h 0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function format_time(dt) {
  if (!dt) return null;
  return new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Calendar-date string from a Date's LOCAL components — not
// `.toISOString().split('T')[0]`, which converts to UTC first and silently
// shifts the date back a day on any positive-UTC-offset server timezone
// (this app runs under Asia/Karachi, UTC+5) whenever the Date represents
// local midnight, as `day_date` below always does.
export function local_date_str(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function build_week_rows(entries, week_start) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((label, i) => {
    const day_date = new Date(week_start);
    day_date.setDate(day_date.getDate() + i);
    const iso = local_date_str(day_date);

    const entry = entries.find((e) => local_date_str(new Date(e.check_in)) === iso);

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
        employee: undefined,
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
      status_label:
        entry.status === 'COMPLETED'   ? 'Completed'   :
        entry.status === 'IN_PROGRESS' ? 'In Progress' :
        entry.status,
      employee: entry.user
        ? `${entry.user.first_name} ${entry.user.last_name}`.trim()
        : undefined,
    };
  });
}
