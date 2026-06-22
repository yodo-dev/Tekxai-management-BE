import prisma from '../../../shared/database/client.js';

export async function get_crm_dashboard(user_id, role) {
  const is_manager = ['ADMIN', 'SUPER_ADMIN'].includes(role);
  const user_filter = is_manager ? {} : { user_id };

  const [
    upwork_stats,
    linkedin_stats,
    email_stats,
    deposit_total,
    hot_upwork,
    hot_linkedin,
    recent_won,
  ] = await Promise.all([
    // Upwork funnel
    prisma.upwork_bids.groupBy({
      by: ['status'],
      where: { ...user_filter },
      _count: { id: true },
      _sum: { contract_amount: true },
    }),
    // LinkedIn funnel
    prisma.linkedin_leads.groupBy({
      by: ['status'],
      where: { ...user_filter },
      _count: { id: true },
      _sum: { contract_amount: true },
    }),
    // Email funnel
    prisma.email_leads.groupBy({
      by: ['status'],
      where: { ...user_filter },
      _count: { id: true },
      _sum: { contract_amount: true },
    }),
    // Total deposit this month
    prisma.deposits.aggregate({
      where: {
        deposit_date: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { amount: true },
    }),
    // Hot upwork bids
    prisma.upwork_bids.findMany({
      where: { ...user_filter, is_hot: true, },
      orderBy: { updated_at: 'desc' },
      take: 5,
      include: { user: { select: { first_name: true, last_name: true } } },
    }),
    // Hot LinkedIn leads
    prisma.linkedin_leads.findMany({
      where: { ...user_filter, is_hot: true, },
      orderBy: { updated_at: 'desc' },
      take: 5,
      include: { user: { select: { first_name: true, last_name: true } } },
    }),
    // Recent won deals
    prisma.marketing_deals.findMany({
      where: is_manager ? {} : { salesperson_id: user_id },
      orderBy: { date: 'desc' },
      take: 10,
      include: { salesperson: { select: { first_name: true, last_name: true } } },
    }),
  ]);

  // Compute funnel totals
  const sum_status = (arr, won_statuses, active_statuses) => {
    const total = arr.reduce((s, r) => s + r._count.id, 0);
    const won = arr.filter(r => won_statuses.includes(r.status)).reduce((s, r) => s + r._count.id, 0);
    const active = arr.filter(r => active_statuses.includes(r.status)).reduce((s, r) => s + r._count.id, 0);
    const won_value = arr.filter(r => won_statuses.includes(r.status)).reduce((s, r) => s + (r._sum.contract_amount || 0), 0);
    return { total, won, active, won_value };
  };

  return {
    upwork: sum_status(upwork_stats, ['Won', 'Contract'], ['Submitted', 'Pending']),
    linkedin: sum_status(linkedin_stats, ['Won', 'Contracted'], ['Connected', 'Interested']),
    email: sum_status(email_stats, ['Won', 'Contracted'], ['Contacted', 'Interested']),
    deposits_this_month: deposit_total._sum.amount || 0,
    hot_leads: {
      upwork: hot_upwork,
      linkedin: hot_linkedin,
    },
    recent_won,
    pipeline_summary: {
      total_leads:
        upwork_stats.reduce((s, r) => s + r._count.id, 0) +
        linkedin_stats.reduce((s, r) => s + r._count.id, 0) +
        email_stats.reduce((s, r) => s + r._count.id, 0),
      total_won_value:
        [...upwork_stats, ...linkedin_stats, ...email_stats]
          .filter(r => ['Won', 'Contract', 'Contracted'].includes(r.status))
          .reduce((s, r) => s + (r._sum.contract_amount || 0), 0),
    },
  };
}

export async function get_team_hierarchy(user_id, role) {
  const is_manager = ['ADMIN', 'SUPER_ADMIN'].includes(role);

  if (is_manager) {
    // Return all users with business_unit = CRM and their supervisors
    const crm_users = await prisma.users.findMany({
      where: { business_unit: 'CRM', deleted_at: null, is_active: true },
      select: {
        id: true, first_name: true, last_name: true, email: true,
        designation: true, business_unit: true, supervisor_id: true,
        supervisor: { select: { id: true, first_name: true, last_name: true } },
        subordinates: { select: { id: true, first_name: true, last_name: true, designation: true } },
      },
    });
    return crm_users;
  }

  // Return user's own team
  const me = await prisma.users.findUnique({
    where: { id: user_id },
    select: {
      id: true, first_name: true, last_name: true, supervisor_id: true,
      supervisor: { select: { id: true, first_name: true, last_name: true } },
      subordinates: { select: { id: true, first_name: true, last_name: true, designation: true } },
    },
  });
  return me ? [me] : [];
}

export async function assign_supervisor(target_user_id, supervisor_id) {
  return prisma.users.update({
    where: { id: target_user_id },
    data: { supervisor_id: supervisor_id || null },
    select: { id: true, first_name: true, last_name: true, supervisor_id: true },
  });
}
