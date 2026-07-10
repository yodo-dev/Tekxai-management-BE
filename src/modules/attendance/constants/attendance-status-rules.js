// Employment Status × Attendance Action matrix — Sprint 2 Milestone 3.
//
// Deliberately an explicit per-status, per-action table rather than a single
// `status === 'ACTIVE'` shortcut, so a future Lifecycle Stage milestone can
// layer in additional nuance (e.g. ONBOARDING-specific rules) without
// rewriting this into an allow-list shape it wasn't built for.
//
// `clock_in`             — may the employee start a new attendance session.
// `new_time_off`         — may the employee submit a NEW time-off request
//                           (approving/rejecting existing ones is untouched).
// `manual_entry`         — may an admin/manager create or modify a manual
//                           attendance record for this employee (the
//                           employee whose record it is, not the admin
//                           performing the action).
//
// Clock-out and force-checkout are intentionally NOT part of this matrix —
// per the approved design, they are never blocked by Employment Status.
// Clock-out already requires an existing open session (enforced elsewhere);
// force-checkout exists purely for system consistency and must always be
// able to close a stray open session regardless of status.
export const ATTENDANCE_STATUS_RULES = {
  ACTIVE:     { clock_in: true,  new_time_off: true,  manual_entry: true },
  ON_LEAVE:   { clock_in: false, new_time_off: false, manual_entry: true },
  SUSPENDED:  { clock_in: false, new_time_off: false, manual_entry: false },
  TERMINATED: { clock_in: false, new_time_off: false, manual_entry: false },
  DECEASED:   { clock_in: false, new_time_off: false, manual_entry: false },
  // INACTIVE is already fully blocked at the global authenticate.js layer
  // (cannot reach any authenticated route at all) — listed here only for
  // matrix completeness, not because this code path is ever reachable.
  INACTIVE:   { clock_in: false, new_time_off: false, manual_entry: false },
};

function rule_for(status, action) {
  // Fail closed: an unrecognized/missing status is never treated as eligible.
  return ATTENDANCE_STATUS_RULES[status]?.[action] ?? false;
}

export function can_clock_in(status) {
  return rule_for(status, 'clock_in');
}

export function can_submit_time_off(status) {
  return rule_for(status, 'new_time_off');
}

export function can_manually_record_attendance(status) {
  return rule_for(status, 'manual_entry');
}
