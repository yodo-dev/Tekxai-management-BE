export function validate_designation(body) {
  if (!body?.name?.trim()) return { valid: false, message: 'Designation name required' };
  return { valid: true };
}
