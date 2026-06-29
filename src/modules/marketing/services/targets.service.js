import prisma from '../../../shared/database/client.js';

export async function list_targets({ user_id, team_type } = {}) {
  const where = {};
  if (user_id) where.user_id = user_id;
  if (team_type) where.team_type = team_type;
  return prisma.marketing_targets.findMany({
  take: 500, where });
}

export async function upsert_target({ user_id, team_type, ...rest }) {
  const key = user_id ? { user_id, team_type: team_type || null } : { user_id: null, team_type: team_type || null };
  return prisma.marketing_targets.upsert({
    where: { user_id_team_type: key },
    update: { ...rest },
    create: { user_id: user_id || null, team_type: team_type || null, ...rest },
  });
}

export async function get_my_activity_report(user_id, from, to) {
  const fromDate = from ? new Date(from) : new Date(new Date().setDate(1));
  const toDate = to ? new Date(to) : new Date();

  const [upwork, linkedin, email, linkedin_act] = await Promise.all([
    prisma.upwork_bids.findMany({
      take: 500,
      where: { user_id, date: { gte: fromDate, lte: toDate } },
      orderBy: { date: 'desc' },
    }),
    prisma.linkedin_leads.findMany({
      take: 500,
      where: { user_id, date: { gte: fromDate, lte: toDate } },
      orderBy: { date: 'desc' },
    }),
    prisma.email_leads.findMany({
      take: 500,
      where: { user_id, created_at: { gte: fromDate, lte: toDate } },
      orderBy: { created_at: 'desc' },
    }),
    prisma.linkedin_activity.findMany({
      take: 500,
      where: { user_id, date: { gte: fromDate, lte: toDate } },
      orderBy: { date: 'desc' },
    }),
  ]);

  return { upwork, linkedin, email, linkedin_activity: linkedin_act };
}
