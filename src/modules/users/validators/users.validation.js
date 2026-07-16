function is_email(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

export function validate_create_user(body) {
  const { email, first_name, last_name } = body || {};
  if (!email || !is_email(String(email).trim())) {
    return { valid: false, field: 'email', code: 'INVALID_EMAIL', message: 'Valid email required' };
  }
  if (!first_name?.trim()) {
    return { valid: false, field: 'first_name', code: 'REQUIRED_FIELD', message: 'First name required' };
  }
  if (!last_name?.trim()) {
    return { valid: false, field: 'last_name', code: 'REQUIRED_FIELD', message: 'Last name required' };
  }
  return { valid: true };
}

export function validate_update_user(body) {
  if (body?.email && !is_email(String(body.email).trim())) return { valid: false, message: 'Valid email required' };
  return { valid: true };
}
