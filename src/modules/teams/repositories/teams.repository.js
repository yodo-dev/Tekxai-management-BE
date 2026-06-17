import prisma from '../../../shared/database/client.js';

const TEAM_INCLUDE = {
  members: {
    include: {
      user: { select: { id: true, first_name: true, last_name: true, avatar: true, email: true } },
    },
  },
};

export async function find_teams({ search, page = 1, limit = 50, type } = {}) {
  const skip = (page - 1) * limit;
  const where = { deleted_at: null };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (type && type !== 'ALL') where.type = type;

  const [total, records] = await Promise.all([
    prisma.teams.count({ where }),
    prisma.teams.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' }, include: TEAM_INCLUDE }),
  ]);

  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function find_team_by_id(id) {
  return prisma.teams.findFirst({ where: { id, deleted_at: null }, include: TEAM_INCLUDE });
}

export async function create_team(data) {
  return prisma.teams.create({ data, include: TEAM_INCLUDE });
}

export async function update_team(id, data) {
  return prisma.teams.update({ where: { id }, data, include: TEAM_INCLUDE });
}

export async function delete_team(id) {
  return prisma.teams.update({ where: { id }, data: { deleted_at: new Date() } });
}
