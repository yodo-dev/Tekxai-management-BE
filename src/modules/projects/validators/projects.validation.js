// Legacy free-text statuses kept for backward compatibility with existing data.
export const LEGACY_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'];
// Project delivery workflow (Google Sheet parity).
export const WORKFLOW_STATUSES = [
  'PLANNING', 'DESIGN', 'FRONTEND', 'BACKEND', 'QA', 'CLIENT_REVIEW',
  'DEPLOYMENT', 'SUPPORT', 'DELIVERED', 'BLOCKED', 'ARCHIVED',
];
export const ALL_STATUSES = [...LEGACY_STATUSES, ...WORKFLOW_STATUSES];
export const PROGRESS_MODES = ['MANUAL', 'AUTO'];
// Enterprise Performance Platform M1 — distinguishes revenue-bearing client work from
// internal/overhead work. See Tekxai-Operations-OS/08-Master-Gap-Analysis.md §11.5.
export const PROJECT_TYPES = ['CLIENT', 'INTERNAL'];
// Sprint 2 Milestone 5 — Project Master Consolidation. Additive: a new field,
// not a redefinition of project_type (PROJECT_MASTER_AUDIT.md Risk #2).
export const PROJECT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
// Reuses the existing project_members.role column (previously always "MEMBER",
// never enforced). See Tekxai-Operations-OS gap audit — Sprint 2 Phase 2.
// Milestone 5 closes a real, pre-existing drift: ProjectDetailsSlideOver's
// Team tab already displayed AI_ENGINEER/BUSINESS_ANALYST/SALES/ESTIMATOR as
// group labels, but this whitelist rejected them if ever actually assigned —
// bringing the enforced list up to parity with what the UI already showed.
export const PROJECT_MEMBER_ROLES = [
  'FRONTEND', 'BACKEND', 'TEAM_LEAD', 'QA', 'DEVOPS', 'UI_UX',
  'AI_ENGINEER', 'BUSINESS_ANALYST', 'SALES', 'ESTIMATOR', 'OTHER', 'MEMBER',
];

// `members` is the new shape ([{ user_id, role }]) accepted alongside the
// legacy `member_ids` (plain string array, defaults every row to MEMBER) for
// backward compatibility — see create_project/update_project in the repository.
function validate_members_field(body) {
  if (body.members === undefined) return { valid: true };
  if (!Array.isArray(body.members)) return { valid: false, message: 'members must be an array' };
  for (const m of body.members) {
    if (!m?.user_id) return { valid: false, message: 'Each member requires a user_id' };
    if (m.role !== undefined && !PROJECT_MEMBER_ROLES.includes(m.role)) {
      return { valid: false, message: `member role must be one of ${PROJECT_MEMBER_ROLES.join(', ')}` };
    }
  }
  return { valid: true };
}

function validate_budget_fields(body) {
  if (body.budget !== undefined && body.budget !== null && body.budget !== '' && +body.budget < 0) {
    return { valid: false, message: 'Budget cannot be negative' };
  }
  if (body.budget_spent !== undefined && body.budget_spent !== null && +body.budget_spent < 0) {
    return { valid: false, message: 'Budget spent cannot be negative' };
  }
  return { valid: true };
}

function validate_priority_field(body) {
  if (body.priority !== undefined && body.priority !== null && !PROJECT_PRIORITIES.includes(body.priority)) {
    return { valid: false, message: `priority must be one of ${PROJECT_PRIORITIES.join(', ')}` };
  }
  return { valid: true };
}

// Target Delivery Date cannot be before Start Date — only checked when both
// are present in the same payload (a partial update touching only one of
// the two can't know the other's stored value here).
function validate_date_order(body) {
  if (body.start_date && body.end_date && new Date(body.end_date) < new Date(body.start_date)) {
    return { valid: false, message: 'Target Delivery Date cannot be before Start Date' };
  }
  return { valid: true };
}

export function validate_create_project(body) {
  if (!body?.title?.trim()) return { valid: false, message: 'Project title required' };
  if (body.status !== undefined && !ALL_STATUSES.includes(body.status)) {
    return { valid: false, message: `status must be one of ${ALL_STATUSES.join(', ')}` };
  }
  if (body.progress_mode !== undefined && !PROGRESS_MODES.includes(body.progress_mode)) {
    return { valid: false, message: `progress_mode must be one of ${PROGRESS_MODES.join(', ')}` };
  }
  if (body.project_type !== undefined && !PROJECT_TYPES.includes(body.project_type)) {
    return { valid: false, message: `project_type must be one of ${PROJECT_TYPES.join(', ')}` };
  }
  const priority_check = validate_priority_field(body);
  if (!priority_check.valid) return priority_check;
  const members_check = validate_members_field(body);
  if (!members_check.valid) return members_check;
  const budget_check = validate_budget_fields(body);
  if (!budget_check.valid) return budget_check;
  const date_check = validate_date_order(body);
  if (!date_check.valid) return date_check;
  return { valid: true };
}

export function validate_update_project(body) {
  if (body.title !== undefined && !body.title?.trim()) return { valid: false, message: 'Project title cannot be empty' };
  if (body.status !== undefined && !ALL_STATUSES.includes(body.status)) {
    return { valid: false, message: `status must be one of ${ALL_STATUSES.join(', ')}` };
  }
  if (body.progress_mode !== undefined && !PROGRESS_MODES.includes(body.progress_mode)) {
    return { valid: false, message: `progress_mode must be one of ${PROGRESS_MODES.join(', ')}` };
  }
  if (body.project_type !== undefined && !PROJECT_TYPES.includes(body.project_type)) {
    return { valid: false, message: `project_type must be one of ${PROJECT_TYPES.join(', ')}` };
  }
  const priority_check = validate_priority_field(body);
  if (!priority_check.valid) return priority_check;
  const members_check = validate_members_field(body);
  if (!members_check.valid) return members_check;
  const budget_check = validate_budget_fields(body);
  if (!budget_check.valid) return budget_check;
  const date_check = validate_date_order(body);
  if (!date_check.valid) return date_check;
  return { valid: true };
}

export function validate_budget_update(body) {
  return validate_budget_fields(body);
}

export function validate_extension_request(body) {
  if (!body?.proposed_deadline) return { valid: false, message: 'proposed_deadline is required' };
  if (!body?.reason?.trim()) return { valid: false, message: 'reason is required' };
  return { valid: true };
}

export function validate_extension_review(body) {
  if (!['APPROVED', 'REJECTED'].includes(body?.status)) {
    return { valid: false, message: 'status must be APPROVED or REJECTED' };
  }
  if (body.status === 'REJECTED' && !body?.review_reason?.trim()) {
    return { valid: false, message: 'review_reason is required when rejecting' };
  }
  return { valid: true };
}
