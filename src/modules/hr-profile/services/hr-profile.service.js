import prisma from '../../../shared/database/client.js';
import { set_employment_status } from '../../users/repositories/users.repository.js';
import { validate_employment_status } from '../../users/constants/employment-status.js';
import { set_lifecycle_stage } from './employee-lifecycle.service.js';
import { field_error } from '../../../shared/errors/field_error.js';

const PROFILE_SELECT = {
  id: true, user_id: true, profile_status: true, lifecycle_stage: true,
  personal_email: true, cnic: true, dob: true, gender: true, marital_status: true,
  father_name: true, alternate_phone: true, nationality: true, religion: true, blood_group: true,
  current_address: true, permanent_address: true,
  emergency_contact_name: true, emergency_contact_relation: true, emergency_contact_phone: true,
  employment_type: true, employment_status: true, grade: true,
  work_mode: true, office_location: true,
  work_location: true, office_branch: true, floor_area: true,
  working_days: true, weekend: true, work_start: true, work_end: true,
  lunch_break_min: true, work_extension: true, work_phone: true, is_remote: true,
  probation_start: true, probation_end: true, probation_status: true, confirmation_date: true,
  resignation_date: true, termination_date: true, notice_period_days: true,
  salary_currency: true, base_salary: true, gross_salary: true, effective_salary_date: true,
  pay_frequency: true,
  notes: true, created_at: true, updated_at: true,
};

export async function get_hr_profile(user_id) {
  return prisma.employee_profiles.findUnique({ where: { user_id }, select: PROFILE_SELECT });
}

export async function upsert_hr_profile(user_id, data, actor_user_id) {
  // Employee Lifecycle Workflow: ARCHIVED is terminal and read-only. Only a
  // lifecycle_stage-only payload (none exists today — ARCHIVED cannot be
  // reopened, see set_lifecycle_stage) is ever let through; every other
  // profile edit is blocked once an employee is archived.
  const current = await prisma.employee_profiles.findUnique({ where: { user_id }, select: { lifecycle_stage: true } });
  if (current?.lifecycle_stage === 'ARCHIVED') {
    throw field_error('This employee is Archived. The profile is read-only and cannot be edited.', 'lifecycle_stage', 'ARCHIVED_READ_ONLY', 409);
  }

  const allowed = [
    'profile_status',
    'personal_email', 'cnic', 'dob', 'gender', 'marital_status',
    'father_name', 'alternate_phone', 'nationality', 'religion', 'blood_group',
    'current_address', 'permanent_address',
    'emergency_contact_name', 'emergency_contact_relation', 'emergency_contact_phone',
    'employment_type', 'grade', 'work_mode', 'office_location',
    'work_location', 'office_branch', 'floor_area',
    'working_days', 'weekend', 'work_start', 'work_end',
    'lunch_break_min', 'work_extension', 'work_phone', 'is_remote',
    'probation_start', 'probation_end', 'probation_status', 'confirmation_date',
    'resignation_date', 'termination_date', 'notice_period_days',
    'salary_currency', 'base_salary', 'gross_salary', 'effective_salary_date',
    'pay_frequency', 'notes',
  ];

  const clean = {};
  for (const key of allowed) {
    if (data[key] !== undefined) {
      if (['dob', 'probation_start', 'probation_end', 'confirmation_date', 'resignation_date', 'termination_date', 'effective_salary_date'].includes(key)) {
        clean[key] = data[key] ? new Date(data[key]) : null;
      } else if (['notice_period_days', 'lunch_break_min'].includes(key)) {
        clean[key] = data[key] != null ? +data[key] : null;
      } else if (['base_salary', 'gross_salary'].includes(key)) {
        clean[key] = data[key] != null ? parseFloat(data[key]) : null;
      } else if (['is_remote'].includes(key)) {
        clean[key] = !!data[key];
      } else {
        clean[key] = data[key];
      }
    }
  }

  // employment_status has exactly one write path (set_employment_status),
  // shared with users.service.js, so users.status and
  // employee_profiles.employment_status can never drift apart.
  if (data.employment_status !== undefined) {
    const check = validate_employment_status(data.employment_status);
    if (!check.valid) throw field_error(check.message, 'employment_status', 'INVALID_VALUE', 422);
    await set_employment_status(user_id, data.employment_status);
  }

  // lifecycle_stage has exactly one write path (set_lifecycle_stage) — it is
  // deliberately never added to `allowed` above, so a generic profile patch
  // can never touch it by accident.
  if (data.lifecycle_stage !== undefined) {
    await set_lifecycle_stage(user_id, data.lifecycle_stage, actor_user_id || user_id);
  }

  return prisma.employee_profiles.upsert({
    where: { user_id },
    update: clean,
    create: { user_id, ...clean },
    select: PROFILE_SELECT,
  });
}

export async function get_full_employee_record(user_id) {
  // Accept either a DB cuid or a human-readable employee_id (e.g. TXI-0046)
  const id_filter = user_id.startsWith('TXI-') || /^[A-Z]+-\d+$/.test(user_id)
    ? { employee_id: user_id }
    : { id: user_id };
  const user = await prisma.users.findFirst({
    where: { ...id_filter, deleted_at: null },
    select: {
      id: true, email: true, first_name: true, last_name: true, phone: true, avatar: true,
      department: true, department_id: true, division: true, position: true, designation: true, employee_id: true,
      designation_ref: { select: { id: true, name: true } },
      grade: { select: { id: true, name: true, level: true } },
      supervisor: { select: { id: true, first_name: true, last_name: true } },
      status: true, is_active: true, hire_date: true, created_at: true,
      roles: { include: { role: { select: { id: true, name: true } } } },
      team_memberships: { include: { team: { select: { id: true, name: true } } } },
      job_description: true,
    },
  });

  if (!user) return null;

  const db_id = user.id;

  const [profile, documents, contracts, onboarding_tasks, leave_balances, performance_scores, asset_assignments, policy_acknowledgements] = await Promise.all([
    prisma.employee_profiles.findUnique({ where: { user_id: db_id } }),
    prisma.employee_documents.findMany({
  take: 500, where: { user_id: db_id }, orderBy: { created_at: 'desc' } }),
    prisma.contracts.findMany({ where: { user_id: db_id }, orderBy: { created_at: 'desc' }, take: 10 }),
    prisma.onboarding_tasks.findMany({
  take: 500, where: { user_id: db_id }, orderBy: { created_at: 'asc' } }),
    prisma.leave_balances.findMany({
  take: 500, where: { user_id: db_id }, include: { policy: true } }),
    prisma.employee_performance_scores.findMany({ where: { user_id: db_id }, orderBy: { created_at: 'desc' }, take: 5 }),
    prisma.asset_assignments.findMany({
      take: 500,
      where: { user_id: db_id },
      include: { asset: { include: { category: true } } },
      orderBy: { assigned_at: 'desc' },
    }),
    prisma.policy_acknowledgements.findMany({
  take: 500, where: { user_id: db_id }, include: { policy: { select: { id: true, title: true, category: true } } } }),
  ]);

  return {
    user: {
      ...user,
      role: user.roles?.[0]?.role || null,
      role_name: user.roles?.[0]?.role?.name || null,
      team_memberships: user.team_memberships || [],
    },
    profile,
    documents,
    contracts,
    onboarding_tasks,
    leave_balances,
    performance_scores,
    asset_assignments,
    policy_acknowledgements,
  };
}
