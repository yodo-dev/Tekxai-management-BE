export function validate_department(body) {
  if (!body?.name?.trim()) return { valid: false, message: 'Department name required' };
  return { valid: true };
}
