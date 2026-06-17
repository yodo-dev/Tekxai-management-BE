export function validate_entry(body) {
  if (!body?.check_in) return { valid: false, message: 'check_in is required' };
  return { valid: true };
}

export function validate_time_off_request(body) {
  if (!body?.policy_id) return { valid: false, message: 'policy_id is required' };
  if (!body?.start_date) return { valid: false, message: 'start_date is required' };
  if (!body?.end_date) return { valid: false, message: 'end_date is required' };
  if (!body?.reason?.trim()) return { valid: false, message: 'reason is required' };
  return { valid: true };
}
