import {
  forgot_password,
  get_me,
  login_user,
  logout_user,
  refresh_auth_tokens,
  resend_otp,
  reset_password,
  verify_otp,
} from '../services/auth.service.js';
import {
  validate_forgot_payload,
  validate_login_payload,
  validate_otp_payload,
  validate_refresh_payload,
  validate_reset_payload,
} from '../validators/auth.validation.js';

function get_metadata(req) {
  return {
    ip_address: req.ip,
    user_agent: req.get('user-agent') || 'unknown',
  };
}

export async function login(req, res, next) {
  try {
    const v = validate_login_payload(req.body);
    if (!v.valid) return res.status(400).json({ success: false, message: v.message });

    const result = await login_user(v.value, get_metadata(req));
    return res.status(200).json({ success: true, message: 'Login successful', data: result });
  } catch (e) {
    return next(e);
  }
}

export async function refresh(req, res, next) {
  try {
    const v = validate_refresh_payload(req.body);
    if (!v.valid) return res.status(400).json({ success: false, message: v.message });

    const result = await refresh_auth_tokens(v.value, get_metadata(req));
    return res.status(200).json({ success: true, message: 'Token refreshed', data: result });
  } catch (e) {
    return next(e);
  }
}

export async function logout(req, res, next) {
  try {
    const v = validate_refresh_payload(req.body);
    if (!v.valid) return res.status(400).json({ success: false, message: v.message });

    const result = await logout_user(v.value);
    return res.status(200).json({ success: true, message: result.message });
  } catch (e) {
    return next(e);
  }
}

export async function me(req, res, next) {
  try {
    const user = await get_me(req.user.id);
    return res.status(200).json({ success: true, data: user });
  } catch (e) {
    return next(e);
  }
}

export async function forgot(req, res, next) {
  try {
    const v = validate_forgot_payload(req.body);
    if (!v.valid) return res.status(400).json({ success: false, message: v.message });

    const result = await forgot_password(v.value.email);
    return res.status(200).json({ success: true, message: result.message });
  } catch (e) {
    return next(e);
  }
}

export async function verify(req, res, next) {
  try {
    const { id } = req.params;
    const v = validate_otp_payload(req.body);
    if (!v.valid) return res.status(400).json({ success: false, message: v.message });

    const result = await verify_otp(id, v.value.code);
    return res.status(200).json({ success: true, message: result.message, data: { user_id: id } });
  } catch (e) {
    return next(e);
  }
}

export async function reset(req, res, next) {
  try {
    const { id } = req.params;
    const v = validate_reset_payload(req.body);
    if (!v.valid) return res.status(400).json({ success: false, message: v.message });

    const otp_v = validate_otp_payload(req.body);
    if (!otp_v.valid) return res.status(400).json({ success: false, message: 'OTP is required' });

    const result = await reset_password(id, otp_v.value.code, v.value.password);
    return res.status(200).json({ success: true, message: result.message });
  } catch (e) {
    return next(e);
  }
}

export async function resend_otp_ctrl(req, res, next) {
  try {
    const { id } = req.params;
    const result = await resend_otp(id);
    return res.status(200).json({ success: true, message: result.message });
  } catch (e) {
    return next(e);
  }
}
