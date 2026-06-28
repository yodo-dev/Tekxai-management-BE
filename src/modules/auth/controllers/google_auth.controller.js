import { OAuth2Client } from 'google-auth-library';
import prisma from '../../../shared/database/client.js';
import { sign_jwt_for_user } from '../services/auth.service.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function ok(res, p, m = 'OK', s = 200) { return res.status(s).json({ success: true, message: m, payload: p }); }
function fail(res, m, s = 400) { return res.status(s).json({ success: false, message: m }); }

// POST /auth/google — verify Google ID token, return JWT
export async function google_login(req, res, next) {
  try {
    const { id_token } = req.body;
    if (!id_token) return fail(res, 'id_token required');

    if (!process.env.GOOGLE_CLIENT_ID) return fail(res, 'Google OAuth not configured', 503);

    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: google_id, email, given_name, family_name, picture } = payload;

    // Find or create user
    let user = await prisma.users.findFirst({ where: { OR: [{ google_id }, { email }] } });

    if (!user) {
      // Auto-create as EMPLOYEE — also create the role association
      user = await prisma.users.create({
        data: {
          email,
          first_name: given_name || 'New',
          last_name: family_name || 'User',
          google_id,
          avatar: picture || null,
          password_hash: '',
        },
      });

      // Link to EMPLOYEE role
      const employee_role = await prisma.roles.findFirst({ where: { name: 'EMPLOYEE' } });
      if (employee_role) {
        await prisma.user_roles.create({ data: { user_id: user.id, role_id: employee_role.id } });
      }
    } else if (!user.google_id) {
      user = await prisma.users.update({ where: { id: user.id }, data: { google_id, avatar: user.avatar || picture || null } });
    }

    if (user.two_factor_enabled) {
      return ok(res, { requires_2fa: true, user_id: user.id });
    }

    const result = await sign_jwt_for_user(user.id, req);
    return ok(res, result, 'Login successful');
  } catch (e) { next(e); }
}
