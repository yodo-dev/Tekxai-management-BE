// Legacy free-text statuses kept for backward compatibility with existing data.
export const LEGACY_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'];
// Project delivery workflow (Google Sheet parity).
export const WORKFLOW_STATUSES = [
  'PLANNING', 'DESIGN', 'FRONTEND', 'BACKEND', 'QA', 'CLIENT_REVIEW',
  'DEPLOYMENT', 'SUPPORT', 'DELIVERED', 'BLOCKED', 'ARCHIVED',
];
export const ALL_STATUSES = [...LEGACY_STATUSES, ...WORKFLOW_STATUSES];
export const PROGRESS_MODES = ['MANUAL', 'AUTO'];

export function validate_create_project(body) {
  if (!body?.title?.trim()) return { valid: false, message: 'Project title required' };
  if (body.status !== undefined && !ALL_STATUSES.includes(body.status)) {
    return { valid: false, message: `status must be one of ${ALL_STATUSES.join(', ')}` };
  }
  if (body.progress_mode !== undefined && !PROGRESS_MODES.includes(body.progress_mode)) {
    return { valid: false, message: `progress_mode must be one of ${PROGRESS_MODES.join(', ')}` };
  }
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
  return { valid: true };
}
