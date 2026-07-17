export function validate_business_unit(body) {
  if (!body?.name?.trim()) return { valid: false, message: 'Business unit name required' };
  return { valid: true };
}
