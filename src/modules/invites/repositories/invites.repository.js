import prisma from '../../../shared/database/client.js';

const INVITE_INCLUDE = {
  role: { select: { id: true, name: true } },
  team: { select: { id: true, name: true } },
  inviter: { select: { id: true, first_name: true, last_name: true, email: true } },
};

export async function find_invites({ search, status, page = 1, limit = 20 } = {}) {
  page = +page || 1; limit = +limit || 20;
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
  const { team_id, role_id, invited_by, ...rest } = data;
  return prisma.invites.create({
    data: {
      ...rest,
      role:    { connect: { id: role_id } },
      inviter: { connect: { id: invited_by } },
      ...(team_id ? { team: { connect: { id: team_id } } } : {}),
    },
    include: INVITE_INCLUDE,
  });
}

export async function update_invite(id, data) {
  const { team_id, role_id, expires_in_days, ...rest } = data;
  const prisma_data = { ...rest };

  if (team_id !== undefined) {
    prisma_data.team = team_id ? { connect: { id: team_id } } : { disconnect: true };
  }
  if (role_id !== undefined) {
    prisma_data.role = { connect: { id: role_id } };
  }
  if (expires_in_days) {
    prisma_data.expires_at = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000);
  }

  return prisma.invites.update({ where: { id }, data: prisma_data, include: INVITE_INCLUDE });
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
