function is_email(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
export function validate_invite(body) {
  if (!body?.email || !is_email(String(body.email).trim())) return { valid: false, message: 'Valid email required' };
  if (!body?.role_id?.trim()) return { valid: false, message: 'role_id required' };
  return { valid: true };
}
