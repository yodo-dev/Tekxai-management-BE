import prisma from '../../../shared/database/client.js';

// Standard default offboarding checklist — seeded automatically by
// set_lifecycle_stage() (employee-lifecycle.service.js) when an employee's
// lifecycle stage moves to EXIT_CLEARANCE. Kept as a plain array so it's easy
// to extend without touching the seeding logic itself.
export const DEFAULT_OFFBOARDING_TASKS = [
  { title: 'Return company laptop', category: 'ASSETS', description: 'Collect and check in the employee\'s assigned laptop/hardware.' },
  { title: 'Return access badge', category: 'ASSETS', description: 'Collect the employee\'s building/office access badge.' },
  { title: 'Revoke system access', category: 'ACCESS', description: 'Disable email, VPN, and internal system accounts.' },
  { title: 'Exit interview', category: 'HR', description: 'Conduct exit interview with the departing employee.' },
  { title: 'Final settlement processed', category: 'HR', description: 'Process final payroll settlement and dues.' },
];

export async function list_tasks(user_id) {
  return prisma.offboarding_tasks.findMany({
    take: 500,
    where: { user_id },
    orderBy: [{ is_completed: 'asc' }, { created_at: 'asc' }],
  });
}

export async function create_task({ user_id, title, description, category, due_date, assigned_by }) {
  return prisma.offboarding_tasks.create({
    data: {
      user_id,
      title,
      description,
      category: category || 'GENERAL',
      due_date: due_date ? new Date(due_date) : null,
      assigned_by,
    },
  });
}

export async function complete_task(id) {
  return prisma.offboarding_tasks.update({
    where: { id },
    data: { is_completed: true, completed_at: new Date() },
  });
}

// Called from employee-lifecycle.service.js when an employee enters
// EXIT_CLEARANCE. Guards against duplicate seeding — if this employee
// already has offboarding tasks, does nothing.
export async function seed_default_offboarding_tasks(user_id, assigned_by) {
  const existing = await prisma.offboarding_tasks.findFirst({ where: { user_id } });
  if (existing) return { seeded: false, count: 0 };

  await prisma.offboarding_tasks.createMany({
    data: DEFAULT_OFFBOARDING_TASKS.map((t) => ({
      user_id,
      title: t.title,
      description: t.description,
      category: t.category,
      assigned_by,
    })),
  });

  return { seeded: true, count: DEFAULT_OFFBOARDING_TASKS.length };
}
