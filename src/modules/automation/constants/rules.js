// Automation Engine — Milestone 1 seed.
//
// Tekxai-Operations-OS/03-Automation-Rulebook.md Section A defines 38 rules
// platform-wide; this milestone wires up exactly the first two
// (Employee Created, Employee Confirmed). This file does not implement a
// generic rule-config/storage system, a scheduler, or an event bus — it is
// just a small, hardcoded description of the 2 in-scope rules, kept next to
// the functions in ../services/automation.service.js that actually run them.
//
// Rulebook's "Notifications" columns list Manager/IT/Facility/Payroll for
// Employee Created and Employee/Payroll for Employee Confirmed. IT, Facility,
// and Payroll have no resolvable code-level recipient in this codebase today
// (no IT/Facility/Payroll queue or role-based inbox exists yet), so both
// rules are scoped to the one recipient that already has a concrete,
// resolvable target in the data model: the employee's supervisor
// (users.supervisor_id) — the same recipient pattern already used by
// employee-lifecycle.service.js's NOTIFY_STAGES notification block.
export const RULES = {
  EMPLOYEE_CREATED: {
    name: 'EMPLOYEE_CREATED',
    trigger: 'HR creates the Employee Profile (new user record established).',
    timeline_event: 'employee.created',
    notify: 'supervisor',
  },
  EMPLOYEE_CONFIRMED: {
    name: 'EMPLOYEE_CONFIRMED',
    trigger: 'Employee Lifecycle transitions to ACTIVE_EMPLOYMENT.',
    timeline_event: 'employee.confirmed',
    notify: 'supervisor',
  },
  // Third rule wired up: HR-document-system lifecycle automation (auto-
  // generate a Confirmation Letter on EMPLOYEE_CONFIRMED, a Relieving Letter
  // here on exit clearance) — same supervisor-notify scoping rationale as
  // the two rules above.
  EMPLOYEE_EXIT_CLEARANCE: {
    name: 'EMPLOYEE_EXIT_CLEARANCE',
    trigger: 'Employee Lifecycle transitions to EXIT_CLEARANCE.',
    timeline_event: 'employee.exit_clearance',
    notify: 'supervisor',
  },
};
