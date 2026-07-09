import prisma from '../../../shared/database/client.js';

// Persistence only — no business rules here. See
// services/employee-lifecycle.service.js for validation, Employment Status
// sync, Timeline events, and notifications.
export async function get_lifecycle_stage(user_id) {
  const profile = await prisma.employee_profiles.findUnique({
    where: { user_id },
    select: { lifecycle_stage: true },
  });
  return profile?.lifecycle_stage || null;
}

export async function persist_lifecycle_stage(user_id, stage) {
  return prisma.employee_profiles.upsert({
    where: { user_id },
    update: { lifecycle_stage: stage },
    create: { user_id, lifecycle_stage: stage },
  });
}
