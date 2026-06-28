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

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 payload:
 *                   type: object
 *                   properties:
 *                     access_token: { type: string }
 *                     user: { type: object }
 *       401:
 *         description: Invalid credentials
 */
router.post('/login',          login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token: { type: string }
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh',        refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout current session
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout',         logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 */
router.get('/me',              authenticate, me);

/**
 * @swagger
 * /auth/forgot:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: OTP sent to email
 *       404:
 *         description: Email not found
 */
router.post('/forgot',         forgot);

/**
 * @swagger
 * /auth/verify/{id}:
 *   post:
 *     summary: Verify OTP for password reset
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp]
 *             properties:
 *               otp: { type: string }
 *     responses:
 *       200:
 *         description: OTP verified
 *       400:
 *         description: Invalid or expired OTP
 */
router.post('/verify/:id',     verify);

/**
 * @swagger
 * /auth/reset/{id}:
 *   post:
 *     summary: Reset password after OTP verification
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Bad request
 */
router.post('/reset/:id',      reset);

/**
 * @swagger
 * /auth/resendOTP/{id}:
 *   get:
 *     summary: Resend OTP to user email
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OTP resent
 */
router.get('/resendOTP/:id',   resend_otp_ctrl);

/**
 * @swagger
 * /auth/2fa/setup:
 *   post:
 *     summary: Set up TOTP 2FA for current user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 2FA setup initiated, returns QR code secret
 *       401:
 *         description: Unauthorized
 */
router.post('/2fa/setup',      authenticate, setup_2fa);

/**
 * @swagger
 * /auth/2fa/verify:
 *   post:
 *     summary: Verify 2FA TOTP code after setup
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string, description: 6-digit TOTP code }
 *     responses:
 *       200:
 *         description: 2FA verified and enabled
 *       400:
 *         description: Invalid token
 *       401:
 *         description: Unauthorized
 */
router.post('/2fa/verify',     authenticate, verify_2fa);

/**
 * @swagger
 * /auth/2fa/disable:
 *   post:
 *     summary: Disable 2FA for current user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200:
 *         description: 2FA disabled
 *       401:
 *         description: Unauthorized
 */
router.post('/2fa/disable',    authenticate, disable_2fa);

/**
 * @swagger
 * /auth/2fa/validate:
 *   post:
 *     summary: Validate 2FA during login
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, token]
 *             properties:
 *               user_id: { type: string }
 *               token: { type: string }
 *     responses:
 *       200:
 *         description: Login completed with access token
 *       401:
 *         description: Invalid 2FA token
 */
router.post('/2fa/validate',   validate_2fa_login);

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Login or register via Google OAuth
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_token]
 *             properties:
 *               id_token: { type: string, description: Google ID token }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid Google token
 */
router.post('/google',         google_login);

export default router;
