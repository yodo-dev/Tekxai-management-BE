import prisma from '../../../shared/database/client.js';

export async function find_links_by_project(project_id) {
  return prisma.project_tracking_links.findMany({
    take: 200,
    where: { project_id },
    orderBy: { created_at: 'desc' },
  });
}

export async function create_link({ project_id, link_type, label, url, created_by }) {
  return prisma.project_tracking_links.create({
    data: { project_id, link_type, label: label || null, url, created_by: created_by || null },
  });
}

export async function find_link_by_id(id) {
  return prisma.project_tracking_links.findFirst({ where: { id } });
}

export async function delete_link(id) {
  return prisma.project_tracking_links.delete({ where: { id } });
}
