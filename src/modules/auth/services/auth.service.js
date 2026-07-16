import { send_otp_email, send_invite_email } from '../../email/email.service.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env_config } from '../../../config/env.js';
import { AUTH_ALLOWED_ROLES, AUTH_MESSAGES } from '../constants/auth.constants.js';
import {
  create_otp,
  create_refresh_token_session,
  ensure_user_settings,
  find_refresh_token_by_hash,
  find_user_with_roles_by_email,
  find_user_with_roles_by_id,
  find_valid_otp,
  mark_otp_used,
  revoke_all_refresh_tokens_for_user,
  revoke_refresh_token_by_hash,
  update_user_password,
} from '../repositories/auth.repository.js';

function app_error(message, status_code = 400) {
  const e = new Error(message);
  e.status_code = status_code;
  return e;
}

function hash_token(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// Precomputed bcrypt hash of a random, unguessable string — never a real
// password. Used purely so the "no such user" / "inactive user" rejection
// paths in login_user() pay the same bcrypt cost as a real wrong-password
// compare, closing the timing side-channel that previously let an attacker
// distinguish account existence/state by response time alone (both paths
// already returned the identical AUTH_MESSAGES.INVALID_CREDENTIALS message —
// this only equalizes timing, it changes no visible behavior).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 12);

function get_role_names(user) {
  return user.roles.map((ur) => ur.role.name);
}

function ensure_allowed_role(role_names) {
  const allowed = role_names.some((n) => AUTH_ALLOWED_ROLES.includes(n));
  if (!allowed) throw app_error(AUTH_MESSAGES.UNAUTHORIZED_ROLE, 403);
}

function build_token_payload(user, role_names) {
  return { sub: user.id, email: user.email, roles: role_names };
}

function generate_access_token(payload) {
  return jwt.sign(payload, env_config.jwt_secret, { expiresIn: env_config.jwt_expires_in });
}

function generate_refresh_token(payload) {
  const refresh_token = jwt.sign(
    { ...payload, jti: crypto.randomBytes(16).toString('hex') },
    env_config.jwt_refresh_secret,
    { expiresIn: env_config.jwt_refresh_expires_in },
  );
  const decoded = jwt.decode(refresh_token);
  return { refresh_token, expires_at: new Date(decoded.exp * 1000) };
}

/**
 * BUG-001 / BUG-003 FIX:
 * Returns camelCase token keys and role_name at top level so FE
 * extractTokensFromAuthResponse() can find them.
 */
function normalize_user(user, role_names) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone,
    avatar: user.avatar,
    department: user.department,
    position: user.position,
    designation: user.designation,
    status: user.status,
    is_active: user.is_active,
    // FE reads user.role_name for redirect logic
    role_name: role_names[0] || null,
    roles: role_names,
  };
}

async function issue_tokens(user, metadata) {
  const role_names = get_role_names(user);
  ensure_allowed_role(role_names);

  const payload = build_token_payload(user, role_names);
  const access_token = generate_access_token(payload);
  const { refresh_token, expires_at } = generate_refresh_token(payload);
  const token_hash = hash_token(refresh_token);

  await create_refresh_token_session({
    user_id: user.id,
    token_hash,
    expires_at,
    created_by_ip: metadata.ip_address,
    created_by_user_agent: metadata.user_agent,
  });

  await ensure_user_settings(user.id);

  return {
    user: normalize_user(user, role_names),
    // BUG-001 FIX: use camelCase keys that FE expects
    accessToken: access_token,
    refreshToken: refresh_token,
    // also include snake_case for any direct consumers
    access_token,
    refresh_token,
  };
}

export async function login_user(payload, metadata) {
  const user = await find_user_with_roles_by_email(payload.email);

  if (!user || !user.is_active) {
    await bcrypt.compare(payload.password, DUMMY_PASSWORD_HASH); // pay the same cost as a real attempt
    throw app_error(AUTH_MESSAGES.INVALID_CREDENTIALS, 401);
  }

  const valid = await bcrypt.compare(payload.password, user.password_hash);
  if (!valid) throw app_error(AUTH_MESSAGES.INVALID_CREDENTIALS, 401);

  // If 2FA is enabled, return a challenge instead of tokens
  if (user.two_factor_enabled) {
    return { requires_2fa: true, user_id: user.id };
  }

  return issue_tokens(user, metadata);
}

// Used by 2FA validate and Google OAuth to issue tokens for an already-authenticated user
export async function sign_jwt_for_user(user_id, req) {
  const user = await find_user_with_roles_by_id(user_id);
  if (!user || !user.is_active) throw app_error(AUTH_MESSAGES.INVALID_CREDENTIALS, 401);
  const metadata = {
    ip_address: req?.ip || 'unknown',
    user_agent: req?.get?.('user-agent') || 'unknown',
  };
  return issue_tokens(user, metadata);
}

export async function refresh_auth_tokens(payload, metadata) {
  let decoded;
  try {
    decoded = jwt.verify(payload.refresh_token, env_config.jwt_refresh_secret);
  } catch {
    throw app_error(AUTH_MESSAGES.INVALID_REFRESH_TOKEN, 401);
  }

  const token_hash = hash_token(payload.refresh_token);
  const session = await find_refresh_token_by_hash(token_hash);

  if (!session || session.revoked_at || session.expires_at < new Date()) {
    throw app_error(AUTH_MESSAGES.INVALID_REFRESH_TOKEN, 401);
  }

  const user = await find_user_with_roles_by_id(decoded.sub);
  if (!user || !user.is_active) throw app_error(AUTH_MESSAGES.INVALID_REFRESH_TOKEN, 401);

  const role_names = get_role_names(user);
  ensure_allowed_role(role_names);

  const new_payload = build_token_payload(user, role_names);
  const access_token = generate_access_token(new_payload);
  const { refresh_token, expires_at } = generate_refresh_token(new_payload);
  const new_hash = hash_token(refresh_token);

  await revoke_refresh_token_by_hash(token_hash, new_hash);
  await create_refresh_token_session({
    user_id: user.id,
    token_hash: new_hash,
    expires_at,
    created_by_ip: metadata.ip_address,
    created_by_user_agent: metadata.user_agent,
  });

  // BUG-002 FIX: return camelCase keys
  return {
    accessToken: access_token,
    refreshToken: refresh_token,
    access_token,
    refresh_token,
  };
}

export async function logout_user(payload) {
  const token_hash = hash_token(payload.refresh_token);
  await revoke_refresh_token_by_hash(token_hash);
  return { message: AUTH_MESSAGES.LOGOUT_SUCCESS };
}

export async function get_me(user_id) {
  const user = await find_user_with_roles_by_id(user_id);
  if (!user) throw app_error('User not found', 404);
  const role_names = get_role_names(user);
  return normalize_user(user, role_names);
}

export async function forgot_password(email) {
  const user = await find_user_with_roles_by_email(email);
  if (!user) return { message: AUTH_MESSAGES.OTP_SENT };

  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const expires_at = new Date(Date.now() + 15 * 60 * 1000);
  await create_otp(user.id, code, 'forgot_password', expires_at);

  if (env_config.env !== 'production') {
    console.log(`[DEV] OTP for ${email}: ${code}  (user_id: ${user.id})`);
  }

  // Send OTP email (fire-and-forget — don't fail the request if email fails)
  send_otp_email(email, code, 'password reset').catch(err =>
    console.error('[EMAIL] Failed to send OTP email:', err.message)
  );

  return { message: AUTH_MESSAGES.OTP_SENT, _dev_user_id: env_config.env !== 'production' ? user.id : undefined };
}

export async function verify_otp(user_id, code) {
  const otp = await find_valid_otp(user_id, code, 'forgot_password');
  if (!otp) throw app_error(AUTH_MESSAGES.OTP_INVALID, 400);
  return { message: 'OTP verified', user_id };
}

export async function reset_password(user_id, code, new_password) {
  const otp = await find_valid_otp(user_id, code, 'forgot_password');
  if (!otp) throw app_error(AUTH_MESSAGES.OTP_INVALID, 400);

  if (new_password.length < 8) throw app_error('Password must be at least 8 characters', 400);

  const password_hash = await bcrypt.hash(new_password, 12);
  await update_user_password(user_id, password_hash);
  await mark_otp_used(otp.id);
  await revoke_all_refresh_tokens_for_user(user_id); // invalidate sessions issued under the old password
  return { message: AUTH_MESSAGES.PASSWORD_RESET_SUCCESS };
}

export async function resend_otp(user_id) {
  const user = await find_user_with_roles_by_id(user_id);
  if (!user) throw app_error('User not found', 404);

  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const expires_at = new Date(Date.now() + 15 * 60 * 1000);
  await create_otp(user.id, code, 'forgot_password', expires_at);

  if (env_config.env !== 'production') {
    console.log(`[DEV] Resend OTP for ${user.email}: ${code}`);
  }

  return { message: AUTH_MESSAGES.OTP_SENT };
}
