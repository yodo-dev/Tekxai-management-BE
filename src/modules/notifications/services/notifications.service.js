import prisma from '../../../shared/database/client.js';

export async function get_notifications(user_id, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [total, records] = await Promise.all([
    prisma.notifications.count({ where: { user_id } }),
    prisma.notifications.findMany({
      where: { user_id },
      orderBy: { created_at: 'desc' },
      skip, take: limit,
    }),
  ]);
  const unread_count = await prisma.notifications.count({ where: { user_id, is_read: false } });
  return { records, total, unread_count, page, limit, pages: Math.ceil(total / limit) };
}

export async function mark_read(id, user_id) {
  return prisma.notifications.updateMany({ where: { id, user_id }, data: { is_read: true } });
}

export async function mark_all_read(user_id) {
  return prisma.notifications.updateMany({ where: { user_id }, data: { is_read: true } });
}

export async function delete_notification(id, user_id) {
  return prisma.notifications.deleteMany({ where: { id, user_id } });
}

export async function create_notification(data) {
  return prisma.notifications.create({ data });
}
