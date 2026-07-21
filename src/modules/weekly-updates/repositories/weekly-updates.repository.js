import prisma from '../../../shared/database/client.js';

const UPDATER_INCLUDE = {
  updater: { select: { id: true, first_name: true, last_name: true, avatar: true } },
};

export async function find_updates_by_project(project_id) {
  return prisma.client_weekly_updates.findMany({
    take: 200,
    where: { project_id },
    orderBy: { update_date: 'desc' },
    include: UPDATER_INCLUDE,
  });
}

export async function find_latest_update(project_id) {
  return prisma.client_weekly_updates.findFirst({
    where: { project_id },
    orderBy: { update_date: 'desc' },
    include: UPDATER_INCLUDE,
  });
}

export async function create_update({ project_id, update_date, updated_by, method, summary, client_response, attachment_url }) {
  return prisma.client_weekly_updates.create({
    data: {
      project_id,
      update_date: update_date ? new Date(update_date) : new Date(),
      updated_by: updated_by || null,
      method: method || 'EMAIL',
      summary,
      client_response: client_response || null,
      attachment_url: attachment_url || null,
    },
    include: UPDATER_INCLUDE,
  });
}

export async function find_update_by_id(id) {
  return prisma.client_weekly_updates.findFirst({ where: { id } });
}

export async function delete_update(id) {
  return prisma.client_weekly_updates.delete({ where: { id } });
}
