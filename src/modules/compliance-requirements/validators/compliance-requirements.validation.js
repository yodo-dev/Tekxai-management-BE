export const REQUIREMENT_STATUSES = ['ACTIVE', 'UNDER_MAINTENANCE', 'TEMPORARILY_DISABLED', 'NOT_APPLICABLE'];

export function validate_compliance_requirement(body, { is_update = false } = {}) {
  if (!is_update) {
    if (!body?.location_id?.trim()) return { valid: false, message: 'location_id is required' };
    if (!body?.category_id?.trim()) return { valid: false, message: 'category_id is required' };
  }
  if (!is_update && (body.required_quantity === undefined || body.required_quantity === null)) {
    return { valid: false, message: 'required_quantity is required' };
  }
  if (body.required_quantity !== undefined && (+body.required_quantity < 0 || Number.isNaN(+body.required_quantity))) {
    return { valid: false, message: 'required_quantity must be a non-negative number' };
  }
  if (body.status !== undefined && !REQUIREMENT_STATUSES.includes(body.status)) {
    return { valid: false, message: `status must be one of ${REQUIREMENT_STATUSES.join(', ')}` };
  }
  return { valid: true };
}
