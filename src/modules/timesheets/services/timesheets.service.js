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

export function build_week_rows(entries, week_start) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((label, i) => {
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
