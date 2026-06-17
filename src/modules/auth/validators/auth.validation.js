function is_email(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function validate_login_payload(payload) {
  const email = String(payload?.email || '').trim().toLowerCase();
  const password = String(payload?.password || '');

  if (!email || !is_email(email)) return { valid: false, message: 'A valid email is required' };
  if (!password || password.length < 6) return { valid: false, message: 'Password must be at least 6 characters' };

  return { valid: true, value: { email, password } };
}

export function validate_refresh_payload(payload) {
  // Accept both refresh_token (snake) and refreshToken (camel) for compatibility
  const refresh_token = String(payload?.refresh_token || payload?.refreshToken || '').trim();

  if (!refresh_token) return { valid: false, message: 'refresh_token is required' };

  return { valid: true, value: { refresh_token } };
}

export function validate_forgot_payload(payload) {
  const email = String(payload?.email || '').trim().toLowerCase();
  if (!email || !is_email(email)) return { valid: false, message: 'A valid email is required' };
  return { valid: true, value: { email } };
}

export function validate_otp_payload(payload) {
  const code = String(payload?.otp || payload?.code || '').trim();
  if (!code || !/^\d{4}$/.test(code)) return { valid: false, message: 'OTP must be 4 digits' };
  return { valid: true, value: { code } };
}

export function validate_reset_payload(payload) {
  const password = String(payload?.password || '').trim();
  if (!password || password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
  return { valid: true, value: { password } };
}
