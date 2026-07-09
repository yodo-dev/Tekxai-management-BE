// Employee Lifecycle — the People-module journey field, independent from
// Employment Status (users.status / employee_profiles.employment_status).
// Lives on employee_profiles, not users: nothing in auth/access-control
// reads it, and every consumer that will (Attendance, Payroll, Performance)
// already joins employee_profiles for other HR detail. See Sprint 1 Phase 2
// Milestone 2 architecture (Documents 4/6/7).
export const LIFECYCLE_STAGES = [
  'ONBOARDING',
  'PROBATION',
  'ACTIVE_EMPLOYMENT',
  'NOTICE_PERIOD',
  'EXIT_CLEARANCE',
  'ARCHIVED',
];

export function validate_lifecycle_stage(value) {
  if (!LIFECYCLE_STAGES.includes(value)) {
    return { valid: false, message: `lifecycle stage must be one of ${LIFECYCLE_STAGES.join(', ')}` };
  }
  return { valid: true };
}

// Stages meaningful enough to notify the supervisor on. PROBATION is
// deliberately excluded — HR already tracks probation detail via
// employee_profiles.probation_status/probation_start/probation_end.
export const NOTIFY_STAGES = new Set([
  'ONBOARDING',
  'ACTIVE_EMPLOYMENT',
  'NOTICE_PERIOD',
  'EXIT_CLEARANCE',
  'ARCHIVED',
]);

export const LIFECYCLE_STAGE_LABELS = {
  ONBOARDING: 'Onboarding',
  PROBATION: 'Probation',
  ACTIVE_EMPLOYMENT: 'Active Employment',
  NOTICE_PERIOD: 'Notice Period',
  EXIT_CLEARANCE: 'Exit Clearance',
  ARCHIVED: 'Archived',
};
