import { Router } from 'express';
import {
  forgot,
  login,
  logout,
  me,
  refresh,
  resend_otp_ctrl,
  reset,
  verify,
} from '../controllers/auth.controller.js';
import { setup_2fa, verify_2fa, disable_2fa, validate_2fa_login } from '../controllers/two_factor.controller.js';
import { google_login } from '../controllers/google_auth.controller.js';
import { authenticate } from '../../../shared/middleware/authenticate.js';

const router = Router();

router.post('/login',          login);
router.post('/refresh',        refresh);
router.post('/logout',         logout);
router.get('/me',              authenticate, me);
router.post('/forgot',         forgot);
router.post('/verify/:id',     verify);
router.post('/reset/:id',      reset);
router.get('/resendOTP/:id',   resend_otp_ctrl);

// TOTP 2FA
router.post('/2fa/setup',      authenticate, setup_2fa);
router.post('/2fa/verify',     authenticate, verify_2fa);
router.post('/2fa/disable',    authenticate, disable_2fa);
router.post('/2fa/validate',   validate_2fa_login);

// Google OAuth SSO
router.post('/google',         google_login);

export default router;
