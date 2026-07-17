import prisma from '../../../shared/database/client.js';

export async function find_dependencies_by_project(project_id) {
  return prisma.project_dependencies.findMany({
    where: { project_id },
    orderBy: [{ blocking: 'desc' }, { created_at: 'asc' }],
  });
}

export async function find_dependency_by_id(id) {
  return prisma.project_dependencies.findFirst({ where: { id } });
}

export async function create_dependency({ project_id, name, type, category, owner, status, vendor, external_url, notes, blocking }) {
  return prisma.project_dependencies.create({
    data: {
      project_id,
      name,
      type,
      category: category || null,
      owner: owner || null,
      status: status || 'NOT_STARTED',
      vendor: vendor || null,
      external_url: external_url || null,
      notes: notes || null,
      blocking: Boolean(blocking),
    },
  });
}

export async function update_dependency(id, data) {
  const payload = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.type !== undefined) payload.type = data.type;
  if (data.category !== undefined) payload.category = data.category || null;
  if (data.owner !== undefined) payload.owner = data.owner || null;
  if (data.status !== undefined) payload.status = data.status;
  if (data.vendor !== undefined) payload.vendor = data.vendor || null;
  if (data.external_url !== undefined) payload.external_url = data.external_url || null;
  if (data.notes !== undefined) payload.notes = data.notes || null;
  if (data.blocking !== undefined) payload.blocking = Boolean(data.blocking);
  return prisma.project_dependencies.update({ where: { id }, data: payload });
}

export async function delete_dependency(id) {
  return prisma.project_dependencies.delete({ where: { id } });
}
