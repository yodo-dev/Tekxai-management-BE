// Lifecycle Stage × Attendance Action matrix — Sprint 2 Milestone 4.
//
// Employment Status (attendance-status-rules.js) remains the primary
// authority. This matrix adds Lifecycle Stage as a second, orthogonal
// signal — the two are combined at each call site with a simple
// "most restrictive wins" AND, never by branching one inside the other.
//
// Unlike `users.status` (NOT NULL, defaults to ACTIVE), `employee_profiles
// .lifecycle_stage` is nullable with no DB default — pre-existing employees
// were never backfilled (see schema.prisma comment on that field). Failing
// closed on null/unmapped stages here would incorrectly block attendance for
// the entire pre-existing workforce, so the default below is UNRESTRICTED
// (true), not false. Only the stages explicitly called out in the approved
// spec impose a restriction.
//
// `clock_in`      — may the employee start a new attendance session.
// `new_time_off`  — may the employee submit a NEW time-off request.
// `manual_entry`  — may an admin/manager create or modify a manual
//                   attendance record for this employee.
//
// Clock-out and force-checkout are intentionally NOT part of this matrix,
// for the same Force Checkout Rule established in Milestone 3.
export const LIFECYCLE_ATTENDANCE_RULES = {
  // Employee has not officially started work yet.
  ONBOARDING: { clock_in: false, new_time_off: true, manual_entry: false },

  // No lifecycle-specific restriction — identical to the unrestricted
  // default. Listed explicitly per the approved spec rather than omitted,
  // for matrix completeness/readability.
  PROBATION: { clock_in: true, new_time_off: true, manual_entry: true },
  ACTIVE_EMPLOYMENT: { clock_in: true, new_time_off: true, manual_entry: true },
  NOTICE_PERIOD: { clock_in: true, new_time_off: true, manual_entry: true },

  // Employee is exiting the company and should not begin new attendance
  // sessions or submit new leave requests.
  EXIT_CLEARANCE: { clock_in: false, new_time_off: false, manual_entry: false },

  // ARCHIVED: deliberately no entry. Employment Status already becomes
  // TERMINATED via the frozen sync in employee-lifecycle.service.js, which
  // already blocks all three actions — an explicit rule here would be
  // duplicate logic (out of scope per the approved spec).
};

function rule_for(stage, action) {
  // Unmapped/null stage: unrestricted by Lifecycle (Employment Status still applies).
  return LIFECYCLE_ATTENDANCE_RULES[stage]?.[action] ?? true;
}

export function lifecycle_allows_clock_in(stage) {
  return rule_for(stage, 'clock_in');
}

export function lifecycle_allows_time_off(stage) {
  return rule_for(stage, 'new_time_off');
}

export function lifecycle_allows_manual_entry(stage) {
  return rule_for(stage, 'manual_entry');
}
