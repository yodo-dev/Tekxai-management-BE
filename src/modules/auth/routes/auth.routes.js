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

export default router;
