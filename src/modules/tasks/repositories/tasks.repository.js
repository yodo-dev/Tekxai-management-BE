import prisma from '../../../shared/database/client.js';

const TASK_INCLUDE = {
  assignee: { select: { id: true, first_name: true, last_name: true, avatar: true } },
};

export async function find_tasks_by_project(project_id, { status, priority, page = 1, limit = 50 } = {}) {
  page = +page || 1; limit = +limit || 50;
  const skip = (page - 1) * limit;
  const where = { project_id, deleted_at: null };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  const [total, records] = await Promise.all([
    prisma.tasks.count({ where }),
    prisma.tasks.findMany({ where, skip, take: limit, include: TASK_INCLUDE, orderBy: { created_at: 'asc' } }),
  ]);
  return { records, total, page, limit };
}

export async function find_task_by_id(id) {
  return prisma.tasks.findFirst({ where: { id, deleted_at: null }, include: TASK_INCLUDE });
}

export async function create_task({ project_id, milestone_id, title, description, status, priority, assigned_to, due_date }) {
  return prisma.tasks.create({
    data: {
      project_id,
      milestone_id: milestone_id || null,
      title,
      description,
      status: status || 'TODO',
      priority: priority || 'MEDIUM',
      assigned_to: assigned_to || null,
      due_date: due_date ? new Date(due_date) : null,
    },
    include: TASK_INCLUDE,
  });
}

export async function update_task(id, { title, description, status, priority, assigned_to, due_date, milestone_id }) {
  const data = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (status) data.status = status;
  if (priority) data.priority = priority;
  if (assigned_to !== undefined) data.assigned_to = assigned_to;
  if (due_date !== undefined) data.due_date = due_date ? new Date(due_date) : null;
  if (milestone_id !== undefined) data.milestone_id = milestone_id || null;
  return prisma.tasks.update({ where: { id }, data, include: TASK_INCLUDE });
}

export async function delete_task(id) {
  return prisma.tasks.update({ where: { id }, data: { deleted_at: new Date() } });
}
