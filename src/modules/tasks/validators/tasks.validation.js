export function validate_create_task(body) {
  if (!body?.title?.trim()) return { valid: false, message: 'title is required' };
  const STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
  const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  if (body.status && !STATUSES.includes(body.status))
    return { valid: false, message: `status must be one of: ${STATUSES.join(', ')}` };
  if (body.priority && !PRIORITIES.includes(body.priority))
    return { valid: false, message: `priority must be one of: ${PRIORITIES.join(', ')}` };
  return { valid: true };
}
