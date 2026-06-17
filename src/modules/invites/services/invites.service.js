import bcrypt from 'bcryptjs';
import prisma from '../../../shared/database/client.js';
import {
  create_invite,
  delete_invite,
  find_invite_by_id,
  find_invite_by_token,
  find_invites,
  mark_invite_used,
  update_invite,
} from '../repositories/invites.repository.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

export const list_invites = (p) => find_invites(p);

export async function get_invite(id) {
  const inv = await find_invite_by_id(id);
  if (!inv) throw app_error('Invite not found', 404);
  return inv;
}

export async function send_invite({ email, role_id, team_id, department, designation, invited_by }) {
  const existing = await prisma.invites.findFirst({
    where: { email, status: 'PENDING', expires_at: { gt: new Date() } },
  });
  if (existing) throw app_error('An active invite already exists for this email', 409);

  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  return create_invite({ email, role_id, team_id, department, designation, invited_by, expires_at });
}

export async function preview_token(token) {
  const inv = await find_invite_by_token(token);
  if (!inv) return { valid: false, code: 'NOT_FOUND' };
  if (inv.status === 'USED') return { valid: false, code: 'USED' };
  if (inv.expires_at < new Date()) return { valid: false, code: 'EXPIRED' };

  const user_exists = !!(await prisma.users.findFirst({ where: { email: inv.email, deleted_at: null } }));

  return {
    valid: true,
    email: inv.email,
    role: inv.role,
    department: inv.department,
    designation: inv.designation,
    user_exists,
    requires_login_only: user_exists,
  };
}

export async function redeem_invite({ token, first_name, last_name, password }) {
  const inv = await find_invite_by_token(token);
  if (!inv || inv.status !== 'PENDING' || inv.expires_at < new Date()) {
    throw app_error('Invalid or expired invite', 400);
  }

  const existing = await prisma.users.findFirst({ where: { email: inv.email, deleted_at: null } });

  if (existing) {
    // Link existing user
    await mark_invite_used(inv.id, existing.id);
    return { message: 'Invite accepted', user_id: existing.id };
  }

  if (!first_name || !password) throw app_error('Name and password are required', 400);

  const password_hash = await bcrypt.hash(password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.users.create({
      data: { email: inv.email, password_hash, first_name, last_name, designation: inv.designation, status: 'ACTIVE' },
    });
    if (inv.role_id) {
      await tx.user_roles.create({ data: { user_id: u.id, role_id: inv.role_id } });
    }
    await tx.user_settings.create({ data: { user_id: u.id } });
    return u;
  });

  await mark_invite_used(inv.id, user.id);
  return { message: 'Account created successfully', user_id: user.id };
}

export async function update_existing_invite(id, data) {
  await get_invite(id);
  return update_invite(id, data);
}

export async function delete_existing_invite(id) {
  await get_invite(id);
  return delete_invite(id);
}

export async function accept_invite_for_user(id, user_id) {
  const inv = await get_invite(id);
  if (inv.status === 'USED') throw app_error('Invite already used', 400);
  return mark_invite_used(id, user_id);
}
