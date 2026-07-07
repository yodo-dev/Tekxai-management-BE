import prisma from '../../../shared/database/client.js';

const TASK_INCLUDE = {
  assignee: { select: { id: true, first_name: true, last_name: true, avatar: true } },
};

export async function find_milestones_by_project(project_id) {
  return prisma.milestones.findMany({
    take: 500,
    where: { project_id },
    orderBy: { due_date: 'asc' },
    include: {
      tasks: { where: { deleted_at: null }, include: TASK_INCLUDE, orderBy: { created_at: 'asc' } },
    },
  });
}

export async function find_milestone_by_id(id) {
  return prisma.milestones.findFirst({ where: { id } });
}

export async function create_milestone({ project_id, title, description, due_date }) {
  return prisma.milestones.create({
    data: {
      project_id,
      title,
      description,
      due_date: due_date ? new Date(due_date) : null,
    },
  });
}

export async function update_milestone(id, { title, description, due_date, completed, blocked }) {
  const data = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (due_date !== undefined) data.due_date = due_date ? new Date(due_date) : null;
  if (completed !== undefined) data.completed = Boolean(completed);
  if (blocked !== undefined) data.blocked = Boolean(blocked);
  return prisma.milestones.update({ where: { id }, data });
}

export async function delete_milestone(id) {
  return prisma.milestones.delete({ where: { id } });
}
