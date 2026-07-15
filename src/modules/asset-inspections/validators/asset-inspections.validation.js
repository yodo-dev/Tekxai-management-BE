export function validate_asset_inspection(body, { is_update = false } = {}) {
  if (!is_update) {
    if (!body?.asset_id?.trim()) return { valid: false, message: 'asset_id is required' };
    if (!body?.assigned_to?.trim()) return { valid: false, message: 'assigned_to is required' };
    if (!body?.due_date) return { valid: false, message: 'due_date is required' };
  }
  if (body.due_date !== undefined && Number.isNaN(new Date(body.due_date).getTime())) {
    return { valid: false, message: 'due_date must be a valid date' };
  }
  return { valid: true };
}
