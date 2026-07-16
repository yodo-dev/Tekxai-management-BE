import bcrypt from 'bcryptjs';
import prisma from '../../../shared/database/client.js';
import { create_user, find_user_by_id, find_users, soft_delete_user, update_user, set_employment_status, record_designation_change, set_user_role } from '../repositories/users.repository.js';
import { validate_employment_status } from '../constants/employment-status.js';
import { validate_create_user } from '../validators/users.validation.js';
import { field_error } from '../../../shared/errors/field_error.js';
import { set_lifecycle_stage } from '../../hr-profile/services/employee-lifecycle.service.js';
import { validate_lifecycle_stage } from '../../hr-profile/constants/employee-lifecycle.js';
import { trigger_employee_created } from '../../automation/services/automation.service.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';
import { create_notification } from '../../notifications/services/notifications.service.js';

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
  const check = validate_create_user(body);
  if (!check.valid) throw field_error(check.message, check.field, check.code, 422);

  const existing = await prisma.users.findUnique({ where: { email: body.email } });
  if (existing) throw field_error('Email already in use', 'email', 'DUPLICATE_EMAIL', 409);

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
  // `status`, `lifecycle_stage`, and designation_id/grade_id/department_id
  // are all stripped here defensively — each has exactly one write path
  // (set_employment_status / set_lifecycle_stage / change_user_designation
  // below) and must never reach the generic update_user() call, which would
  // otherwise silently bypass the Employment Status sync, the Lifecycle
  // sync, or the designation_history audit trail. This matters in practice:
  // the Employee Profile page's Organization card already PUTs designation
  // changes through this exact generic endpoint.
  // RBAC ISOLATION: role_id/role/roles/permissions/user_permissions are
  // stripped here too, on top of update_user()'s own unconditional strip —
  // this endpoint (generic profile update, reached by Employee Directory,
  // Employee Profile, HR flows) must never be able to influence RBAC even
  // if a future refactor changes what update_user() does with its input.
  // Role assignment has exactly one write path: change_user_role() below,
  // reachable only via the dedicated PUT /users/:id/role endpoint.
  const {
    team_id, password, status, lifecycle_stage, designation_id, grade_id, department_id,
    role_id, role, roles, permissions, user_permissions,
    ...rest
  } = body;
  if (password) {
    if (password.length < 8) throw field_error('Password must be at least 8 characters', 'password', 'MIN_LENGTH', 422);
    rest.password_hash = await bcrypt.hash(password, 12);
  }

  if (status !== undefined) {
    const check = validate_employment_status(status);
    if (!check.valid) throw field_error(check.message, 'status', 'INVALID_VALUE', 422);
    await set_employment_status(id, status);
  }

  if (lifecycle_stage !== undefined) {
    const check = validate_lifecycle_stage(lifecycle_stage);
    if (!check.valid) throw app_error(check.message, 422);
    await set_lifecycle_stage(id, lifecycle_stage, actor_user_id || id);
  }

  if (designation_id !== undefined || grade_id !== undefined || department_id !== undefined) {
    await change_user_designation(id, { designation_id, grade_id, department_id }, actor_user_id || id);
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

const CHANGE_TYPE_LABELS = {
  PROMOTION: 'Promotion',
  TRANSFER: 'Transfer',
  PROMOTION_AND_TRANSFER: 'Promotion & Transfer',
};

// Promotion / Transfer — direct HR/Admin action (no multi-step approval
// workflow, matching how this happens in this codebase today). Delegates
// the actual write to record_designation_change(), the single write path
// for designation_id/grade_id/department_id, then layers on Timeline
// logging and notifications the generic update_existing_user() never had.
export async function change_user_designation(id, body, actor_user_id) {
  await get_user(id); // throws 404 if not found

  const { designation_id, grade_id, department_id, reason, effective_date } = body;
  if (designation_id === undefined && grade_id === undefined && department_id === undefined) {
    const e = new Error('At least one of designation_id, grade_id, department_id is required');
    e.status_code = 422;
    throw e;
  }

  const { user, history } = await record_designation_change(
    id,
    { designation_id, grade_id, department_id, reason, effective_date },
    actor_user_id
  );

  const label = CHANGE_TYPE_LABELS[history.change_type] || 'Designation change';

  await log_activity({
    user_id: actor_user_id || id,
    action: 'UPDATE',
    entity_type: 'employee',
    entity_id: id,
    description: `${label} recorded for ${user.first_name || ''} ${user.last_name || ''}`.trim()
      + (reason ? ` — ${reason}` : ''),
  }).catch(() => {});

  await create_notification({
    user_id: id,
    title: label,
    message: `Your ${label.toLowerCase()} has been recorded${reason ? `: ${reason}` : '.'}`,
    type: 'HR',
  }).catch(() => null);

  // Notify the NEW manager if the department changed — the department's
  // manager_id, not the user's own supervisor_id (which may be unrelated).
  if (department_id !== undefined && department_id) {
    const new_department = await prisma.departments.findUnique({
      where: { id: department_id },
      select: { manager_id: true, name: true },
    });
    if (new_department?.manager_id && new_department.manager_id !== id) {
      const employee_name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'An employee';
      await create_notification({
        user_id: new_department.manager_id,
        title: 'New Team Member — Transfer',
        message: `${employee_name} has been transferred into ${new_department.name || 'your department'}.`,
        type: 'HR',
      }).catch(() => null);
    }
  }

  return { user, history };
}

export async function delete_user(id) {
  await get_user(id);
  await soft_delete_user(id);
}

// RBAC — the ONE write path for a user's role assignment. Only the dedicated
// RBAC/User Management endpoint (PUT /users/:id/role) calls this; no HR
// Profile, Employee Directory, or Add/Edit Employee endpoint may reach it.
// This is the fix for the SUPER_ADMIN -> EMPLOYEE demotion bug: that
// corruption happened because a generic profile-update endpoint was allowed
// to silently carry a (wrong, defaulted) role_id through to a user_roles
// write. Requiring a distinct, explicit action for role changes closes that
// path structurally, not just by patching the one call site that broke.
export async function change_user_role(id, role_id, actor_user_id) {
  await get_user(id); // throws 404 if not found
  if (!role_id) throw field_error('role_id is required', 'role_id', 'REQUIRED_FIELD', 422);

  const role = await prisma.roles.findUnique({ where: { id: role_id } });
  if (!role) throw field_error('Role not found', 'role_id', 'INVALID_VALUE', 404);

  const user = await set_user_role(id, role_id);

  await log_activity({
    user_id: actor_user_id || id,
    action: 'UPDATE',
    entity_type: 'user_role',
    entity_id: id,
    description: `Role changed to ${role.name} for ${user.first_name || ''} ${user.last_name || ''}`.trim(),
  }).catch(() => {});

  return user;
}
