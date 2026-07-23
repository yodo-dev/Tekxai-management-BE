import prisma from '../../../shared/database/client.js';
import { create_new_user } from '../../users/services/users.service.js';
import { upsert_hr_profile } from '../../hr-profile/services/hr-profile.service.js';

// Single Employee Master: the one place recruitment actually creates the
// employee, rather than dead-ending at "offer ACCEPTED" and leaving HR to
// re-type the same name/email/position into Add Employee by hand with no
// technical link back to the candidate. Reuses the exact same
// create_new_user() pipeline Add Employee itself uses (ONBOARDING lifecycle
// stage, default EMPLOYEE role, employee_id generation, Automation Engine's
// "Employee Created" hook) so a recruitment-sourced employee is
// indistinguishable from any other, except for the candidate_id trace.
export async function convert_candidate_to_employee(offer, actor_user_id) {
  const candidate = offer.candidate;
  if (!candidate) return null;

  const existing_user = await prisma.users.findUnique({
    where: { email: candidate.email },
    select: { id: true },
  });

  if (existing_user) {
    // Already a platform user (re-hire, or created some other way before
    // this offer was accepted) — link the candidate record for
    // traceability instead of trying to create a duplicate account, which
    // would just fail on the unique email constraint.
    await prisma.employee_profiles.updateMany({
      where: { user_id: existing_user.id, candidate_id: null },
      data: { candidate_id: candidate.id },
    }).catch(() => {});
    return { user_id: existing_user.id, created: false };
  }

  const user = await create_new_user({
    email: candidate.email,
    first_name: candidate.first_name,
    last_name: candidate.last_name,
    phone: candidate.phone,
    department_id: offer.department_id || candidate.department_id || undefined,
    designation: offer.position,
    hire_date: offer.start_date,
  }, actor_user_id);

  await upsert_hr_profile(user.id, {
    employment_type: offer.employment_type,
    base_salary: offer.salary,
  }, actor_user_id).catch(() => {});

  await prisma.employee_profiles.update({
    where: { user_id: user.id },
    data: { candidate_id: candidate.id },
  }).catch(() => {});

  return { user_id: user.id, created: true };
}
