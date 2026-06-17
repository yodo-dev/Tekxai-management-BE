import prisma from '../../../shared/database/client.js';

const INVITE_INCLUDE = {
  role: { select: { id: true, name: true } },
  team: { select: { id: true, name: true } },
  inviter: { select: { id: true, first_name: true, last_name: true, email: true } },
};

export async function find_invites({ search, status, page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { designation: { contains: search, mode: 'insensitive' } },
      { department: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, records] = await Promise.all([
    prisma.invites.count({ where }),
    prisma.invites.findMany({
      where, skip, take: limit,
      orderBy: { created_at: 'desc' },
      include: INVITE_INCLUDE,
    }),
  ]);

  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function find_invite_by_id(id) {
  return prisma.invites.findUnique({ where: { id }, include: INVITE_INCLUDE });
}

export async function find_invite_by_token(token) {
  return prisma.invites.findUnique({ where: { token }, include: INVITE_INCLUDE });
}

export async function create_invite(data) {
  return prisma.invites.create({ data, include: INVITE_INCLUDE });
}

export async function update_invite(id, data) {
  return prisma.invites.update({ where: { id }, data, include: INVITE_INCLUDE });
}

export async function delete_invite(id) {
  return prisma.invites.delete({ where: { id } });
}

export async function mark_invite_used(id, redeemed_by_id) {
  return prisma.invites.update({
    where: { id },
    data: { status: 'USED', used_at: new Date(), redeemed_by_id },
  });
}
