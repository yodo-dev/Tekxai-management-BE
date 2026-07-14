import prisma from '../../../shared/database/client.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

export async function list_ticket_categories({ include_inactive = false } = {}) {
  const where = include_inactive ? {} : { is_active: true };
  return prisma.ticket_categories.findMany({
    where, take: 500, orderBy: [{ sort_order: 'asc' }, { label: 'asc' }],
    include: { _count: { select: { ticket_types: true } } },
  });
}

export async function get_ticket_category(id) {
  const c = await prisma.ticket_categories.findUnique({ where: { id } });
  if (!c) throw app_error('Ticket category not found', 404);
  return c;
}

export async function create_ticket_category(data) {
  const { key, label, sort_order } = data;
  return prisma.ticket_categories.create({ data: { key, label, sort_order: sort_order ?? 0 } });
}

export async function update_ticket_category(id, data) {
  await get_ticket_category(id);
  const { label, sort_order, is_active } = data;
  return prisma.ticket_categories.update({
    where: { id },
    data: {
      label: label ?? undefined,
      sort_order: sort_order ?? undefined,
      is_active: is_active ?? undefined,
    },
  });
}

export async function set_ticket_category_active(id, is_active) {
  await get_ticket_category(id);
  return prisma.ticket_categories.update({ where: { id }, data: { is_active: !!is_active } });
}
