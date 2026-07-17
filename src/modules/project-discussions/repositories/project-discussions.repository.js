import prisma from '../../../shared/database/client.js';

const USER_SELECT = { id: true, first_name: true, last_name: true, avatar: true };

export async function find_discussions_by_project(project_id) {
  return prisma.project_discussions.findMany({
    where: { project_id },
    orderBy: { created_at: 'asc' },
    include: { user: { select: USER_SELECT } },
  });
}

export async function find_discussion_by_id(id) {
  return prisma.project_discussions.findFirst({ where: { id } });
}

export async function create_discussion({ project_id, user_id, content, parent_id }) {
  return prisma.project_discussions.create({
    data: { project_id, user_id, content, parent_id: parent_id || null },
    include: { user: { select: USER_SELECT } },
  });
}

export async function delete_discussion(id) {
  return prisma.project_discussions.delete({ where: { id } });
}
