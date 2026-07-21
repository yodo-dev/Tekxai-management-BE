// No generic, reusable Approval Engine exists anywhere in this codebase
// (/admin/approvals is a frontend aggregator over three unrelated hardcoded
// flows — requisitions, leave, tickets — not an engine anything else can
// plug into). This is a small, lifecycle-scoped approval mechanism, built
// the same way those per-domain flows already are (a status column + an
// approve/reject action), limited to the lifecycle transitions that
// genuinely need a sign-off step.
export const LIFECYCLE_APPROVAL_TRANSITIONS = [
  'CONFIRM_EMPLOYEE',    // PROBATION -> ACTIVE_EMPLOYMENT
  'EXTEND_PROBATION',    // PROBATION -> PROBATION (probation_end pushed out)
  'TERMINATE_PROBATION', // PROBATION -> EXIT_CLEARANCE
  'ARCHIVE_EMPLOYEE',    // EXIT_CLEARANCE -> ARCHIVED
];

export const LIFECYCLE_APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

export function validate_transition_key(value) {
  if (!LIFECYCLE_APPROVAL_TRANSITIONS.includes(value)) {
    return { valid: false, message: `transition must be one of ${LIFECYCLE_APPROVAL_TRANSITIONS.join(', ')}` };
  }
  return { valid: true };
}
