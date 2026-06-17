function is_email(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

export function validate_create_user(body) {
  const { email, password, first_name, last_name } = body || {};
  if (!email || !is_email(String(email).trim())) return { valid: false, message: 'Valid email required' };
  if (!first_name?.trim()) return { valid: false, message: 'First name required' };
  return { valid: true };
}

export function validate_update_user(body) {
  if (body?.email && !is_email(String(body.email).trim())) return { valid: false, message: 'Valid email required' };
  return { valid: true };
}
