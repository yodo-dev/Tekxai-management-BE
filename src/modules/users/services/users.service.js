import bcrypt from 'bcryptjs';
import prisma from '../../../shared/database/client.js';
import { create_user, find_user_by_id, find_users, soft_delete_user, update_user, set_employment_status } from '../repositories/users.repository.js';
import { validate_employment_status } from '../constants/employment-status.js';
import { set_lifecycle_stage } from '../../hr-profile/services/employee-lifecycle.service.js';
import { validate_lifecycle_stage } from '../../hr-profile/constants/employee-lifecycle.js';
import { trigger_employee_created } from '../../automation/services/automation.service.js';

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

export async function create_new_user(body, actor_user_id) {
  const existing = await prisma.users.findUnique({ where: { email: body.email } });
  if (existing) throw app_error('Email already in use', 409);

  const password_hash = await bcrypt.hash(body.password || Math.random().toString(36), 12);
  const { team_id, ...rest } = body;

  // Always generate employee_id server-side to avoid FE count-based collisions
  if (!rest.employee_id) {
    rest.employee_id = await generate_employee_id();
  }

  const user = await create_user({ ...rest, password_hash });

  // Every new hire starts at ONBOARDING. This is the one place Lifecycle's
  // frozen ONBOARDING->ACTIVE sync rule fires, which is also what
  // establishes employee_profiles.employment_status alongside users.status
  // — no separate direct set_employment_status call needed here.
  await set_lifecycle_stage(user.id, 'ONBOARDING', actor_user_id || user.id);

  // Automation Engine seed — Rulebook Section A #1 "Employee Created".
  // Fires once the user and their ONBOARDING lifecycle stage are both
  // established above.
  await trigger_employee_created(user.id, actor_user_id || user.id).catch(() => {});

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

export async function update_existing_user(id, body, actor_user_id) {
  await get_user(id); // throws 404 if not found
  // `status` and `lifecycle_stage` are stripped here defensively — users has
  // no lifecycle_stage column, but the generic /user/:id endpoint must never
  // be a path that either field can sneak through on (e.g. a combined
  // organization-update payload), even though update_user() would otherwise
  // reject an unknown column outright.
  const { team_id, password, status, lifecycle_stage, ...rest } = body;
  if (password) rest.password_hash = await bcrypt.hash(password, 12);

  if (status !== undefined) {
    const check = validate_employment_status(status);
    if (!check.valid) throw app_error(check.message, 422);
    await set_employment_status(id, status);
  }

  if (lifecycle_stage !== undefined) {
    const check = validate_lifecycle_stage(lifecycle_stage);
    if (!check.valid) throw app_error(check.message, 422);
    await set_lifecycle_stage(id, lifecycle_stage, actor_user_id || id);
  }

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
