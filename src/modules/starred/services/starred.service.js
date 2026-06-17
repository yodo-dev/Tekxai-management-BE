import prisma from '../../../shared/database/client.js';

export async function get_starred(user_id, item_type) {
  const where = { user_id };
  if (item_type) where.item_type = item_type;

  const items = await prisma.starred_items.findMany({
    where,
    orderBy: { created_at: 'desc' },
    include: { project: { select: { id: true, title: true, status: true, progress: true } } },
  });

  const grouped = { projects: [], tasks: [], comments: [] };
  for (const item of items) {
    const key = item.item_type + 's';
    if (grouped[key]) grouped[key].push(item);
  }

  return grouped;
}

export async function star_item(user_id, item_type, item_id) {
  const project_id = item_type === 'project' ? item_id : null;
  return prisma.starred_items.upsert({
    where: { user_id_item_type_item_id: { user_id, item_type, item_id } },
    update: {},
    create: { user_id, item_type, item_id, project_id },
  });
}

export async function unstar_item(user_id, item_type, item_id) {
  return prisma.starred_items.deleteMany({
    where: { user_id, item_type, item_id },
  });
}
