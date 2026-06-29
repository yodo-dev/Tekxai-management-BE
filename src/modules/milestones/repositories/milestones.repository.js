import prisma from '../../../shared/database/client.js';

export async function find_milestones_by_project(project_id) {
  return prisma.milestones.findMany({
    take: 500,
    where: { project_id },
    orderBy: { due_date: 'asc' },
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

export async function update_milestone(id, { title, description, due_date, completed }) {
  const data = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (due_date !== undefined) data.due_date = due_date ? new Date(due_date) : null;
  if (completed !== undefined) data.completed = Boolean(completed);
  return prisma.milestones.update({ where: { id }, data });
}

export async function delete_milestone(id) {
  return prisma.milestones.delete({ where: { id } });
}
