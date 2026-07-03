import bcrypt from 'bcryptjs';
import prisma from '../../../shared/database/client.js';
import { create_user, find_user_by_id, find_users, soft_delete_user, update_user } from '../repositories/users.repository.js';

function app_error(message, status_code = 400) {
  const e = new Error(message);
  e.status_code = status_code;
  return e;
}

export async function list_users(params) {
  return find_users(params);
}

export async function get_user(id) {
  const user = await find_user_by_id(id);
  if (!user) throw app_error('User not found', 404);
  return user;
}

async function generate_employee_id() {
  const last = await prisma.users.findFirst({
    where: { employee_id: { startsWith: 'TXI-' } },
    orderBy: { employee_id: 'desc' },
    select: { employee_id: true },
  });
  const next = last?.employee_id ? parseInt(last.employee_id.replace('TXI-', ''), 10) + 1 : 1;
  return `TXI-${String(next).padStart(4, '0')}`;
}

export async function create_new_user(body) {
  const existing = await prisma.users.findUnique({ where: { email: body.email } });
  if (existing) throw app_error('Email already in use', 409);

  const password_hash = await bcrypt.hash(body.password || Math.random().toString(36), 12);
  const { team_id, ...rest } = body;

  // Always generate employee_id server-side to avoid FE count-based collisions
  if (!rest.employee_id) {
    rest.employee_id = await generate_employee_id();
  }

  const user = await create_user({ ...rest, password_hash });

  // Assign to team if provided
  if (team_id) {
    const team = await prisma.teams.findUnique({ where: { id: team_id } });
    if (team) {
      const existing_membership = await prisma.team_members.findFirst({ where: { user_id: user.id, team_id } });
      if (!existing_membership) {
        await prisma.team_members.create({ data: { user_id: user.id, team_id, role: 'MEMBER' } });
      }
    }
  }

  return user;
}

export async function update_existing_user(id, body) {
  await get_user(id); // throws 404 if not found
  const { team_id, password, ...rest } = body;
  if (password) rest.password_hash = await bcrypt.hash(password, 12);
  const user = await update_user(id, rest);

  // Update team membership if team_id provided
  if (team_id !== undefined) {
    // Remove from all current teams first
    await prisma.team_members.deleteMany({ where: { user_id: id } });
    // Add to new team if set
    if (team_id) {
      const team = await prisma.teams.findUnique({ where: { id: team_id } });
      if (team) {
        await prisma.team_members.create({ data: { user_id: id, team_id, role: 'MEMBER' } });
      }
    }
  }

  return user;
}

export async function delete_user(id) {
  await get_user(id);
  await soft_delete_user(id);
}
