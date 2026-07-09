// Legacy free-text statuses kept for backward compatibility with existing data.
export const LEGACY_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'];
// Project delivery workflow (Google Sheet parity).
export const WORKFLOW_STATUSES = [
  'PLANNING', 'DESIGN', 'FRONTEND', 'BACKEND', 'QA', 'CLIENT_REVIEW',
  'DEPLOYMENT', 'SUPPORT', 'DELIVERED', 'BLOCKED', 'ARCHIVED',
];
export const ALL_STATUSES = [...LEGACY_STATUSES, ...WORKFLOW_STATUSES];
export const PROGRESS_MODES = ['MANUAL', 'AUTO'];

function validate_budget_fields(body) {
  if (body.budget !== undefined && body.budget !== null && body.budget !== '' && +body.budget < 0) {
    return { valid: false, message: 'Budget cannot be negative' };
  }
  if (body.budget_spent !== undefined && body.budget_spent !== null && +body.budget_spent < 0) {
    return { valid: false, message: 'Budget spent cannot be negative' };
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
  const budget_check = validate_budget_fields(body);
  if (!budget_check.valid) return budget_check;
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
  const budget_check = validate_budget_fields(body);
  if (!budget_check.valid) return budget_check;
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
