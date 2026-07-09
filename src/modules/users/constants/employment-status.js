// Employment Status — the single operational-state vocabulary read by
// Attendance, Payroll, Monitoring, Assets, and Projects. Distinct from
// Employee Lifecycle (the HR-journey field), which owns Probation/Onboarding/
// Notice Period/etc. Never merge the two vocabularies — see Sprint 1
// Phase 2 architecture notes (Documents 4/6/7).
export const EMPLOYMENT_STATUSES = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'DECEASED'];

export function validate_employment_status(value) {
  if (!EMPLOYMENT_STATUSES.includes(value)) {
    return { valid: false, message: `employment status must be one of ${EMPLOYMENT_STATUSES.join(', ')}` };
  }
  return { valid: true };
}
