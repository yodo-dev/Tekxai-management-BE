import prisma from '../../../shared/database/client.js';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

function ok(res, p, m = 'OK', s = 200) { return res.status(s).json({ success: true, message: m, payload: p }); }
function fail(res, m, s = 400) { return res.status(s).json({ success: false, message: m }); }

// POST /auth/2fa/setup — generate secret + QR code
export async function setup_2fa(req, res, next) {
  try {
    const user = await prisma.users.findUnique({ where: { id: req.user.id }, select: { email: true } });

    const secret = speakeasy.generateSecret({
      name: `TekXAI ERP (${user.email})`,
      issuer: 'TekXAI',
      length: 20,
    });

    await prisma.users.update({ where: { id: req.user.id }, data: { two_factor_secret: secret.base32 } });

    const qr_url = await QRCode.toDataURL(secret.otpauth_url);
    return ok(res, { secret: secret.base32, qr_url, otpauth_url: secret.otpauth_url });
  } catch (e) { next(e); }
}

// POST /auth/2fa/verify — verify OTP and enable 2FA
export async function verify_2fa(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) return fail(res, 'OTP token required');

    const user = await prisma.users.findUnique({ where: { id: req.user.id }, select: { two_factor_secret: true } });
    if (!user?.two_factor_secret) return fail(res, '2FA setup not initiated');

    const valid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!valid) return fail(res, 'Invalid OTP code');

    await prisma.users.update({ where: { id: req.user.id }, data: { two_factor_enabled: true } });
    return ok(res, { enabled: true }, '2FA enabled successfully');
  } catch (e) { next(e); }
}

// POST /auth/2fa/disable — disable 2FA
export async function disable_2fa(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) return fail(res, 'OTP token required to disable 2FA');

    const user = await prisma.users.findUnique({ where: { id: req.user.id }, select: { two_factor_secret: true, two_factor_enabled: true } });
    if (!user?.two_factor_enabled) return fail(res, '2FA is not enabled');

    const valid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token,
      window: 2,
    });
    if (!valid) return fail(res, 'Invalid OTP code');

    await prisma.users.update({ where: { id: req.user.id }, data: { two_factor_enabled: false, two_factor_secret: null } });
    return ok(res, { enabled: false }, '2FA disabled');
  } catch (e) { next(e); }
}

// POST /auth/2fa/validate — called during login when 2FA is enabled
export async function validate_2fa_login(req, res, next) {
  try {
    const { user_id, token } = req.body;
    if (!user_id || !token) return fail(res, 'user_id and token required');

    const user = await prisma.users.findUnique({
      where: { id: user_id },
      select: { id: true, two_factor_secret: true, two_factor_enabled: true, email: true, first_name: true, last_name: true },
    });
    if (!user?.two_factor_enabled) return fail(res, '2FA not enabled for this user');

    const valid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token,
      window: 2,
    });
    if (!valid) return fail(res, 'Invalid OTP code', 401);

    // Use the service layer to issue full tokens (access + refresh)
    const { sign_jwt_for_user } = await import('../services/auth.service.js');
    const result = await sign_jwt_for_user(user_id, req);
    return ok(res, result, 'Login successful');
  } catch (e) { next(e); }
}
