import prisma from '../../../shared/database/client.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

/** Initialize leave balances for a user for current year based on active policies */
export async function initialize_balances(user_id, year) {
  const y = year || new Date().getFullYear();
  const policies = await prisma.time_off_policies.findMany({ where: { is_active: true } });

  const results = [];
  for (const policy of policies) {
    const existing = await prisma.leave_balances.findFirst({
      where: { user_id, policy_id: policy.id, year: y },
    });
    if (!existing) {
      const balance = await prisma.leave_balances.create({
        data: {
          user_id,
          policy_id: policy.id,
          year:          y,
          total_days:    policy.days_allowed,
          used_days:     0,
          pending_days:  0,
          remaining_days: policy.days_allowed,
        },
        include: { policy: true },
      });
      results.push(balance);
    }
  }
  return results;
}

/** Get all leave balances for a user */
export async function get_user_balances(user_id, year) {
  const y = year || new Date().getFullYear();
  // Auto-initialize if missing
  const existing = await prisma.leave_balances.findMany({ where: { user_id, year: y } });
  if (existing.length === 0) await initialize_balances(user_id, y);

  return prisma.leave_balances.findMany({
    where: { user_id, year: y },
    include: { policy: true },
  });
}

/** Deduct days when leave is approved */
export async function deduct_leave(user_id, policy_id, days, year) {
  const y = year || new Date().getFullYear();
  const balance = await prisma.leave_balances.findFirst({ where: { user_id, policy_id, year: y } });
  if (!balance) throw app_error('Leave balance not found for this policy', 404);
  if (balance.remaining_days < days) throw app_error(`Insufficient leave balance. Available: ${balance.remaining_days} days`, 400);

  return prisma.leave_balances.update({
    where: { id: balance.id },
    data: {
      used_days:     balance.used_days     + days,
      pending_days:  Math.max(0, balance.pending_days - days),
      remaining_days: balance.remaining_days - days,
    },
    include: { policy: true },
  });
}

/** Add pending days when leave is requested */
export async function add_pending_leave(user_id, policy_id, days, year) {
  const y = year || new Date().getFullYear();
  let balance = await prisma.leave_balances.findFirst({ where: { user_id, policy_id, year: y } });
  if (!balance) {
    await initialize_balances(user_id, y);
    balance = await prisma.leave_balances.findFirst({ where: { user_id, policy_id, year: y } });
  }
  if (!balance) throw app_error('Leave balance not found', 404);

  return prisma.leave_balances.update({
    where: { id: balance.id },
    data: { pending_days: balance.pending_days + days },
  });
}

/** Remove pending days when leave is rejected/cancelled */
export async function remove_pending_leave(user_id, policy_id, days, year) {
  const y = year || new Date().getFullYear();
  const balance = await prisma.leave_balances.findFirst({ where: { user_id, policy_id, year: y } });
  if (balance) {
    await prisma.leave_balances.update({
      where: { id: balance.id },
      data: { pending_days: Math.max(0, balance.pending_days - days) },
    });
  }
}

export async function list_all_balances(year) {
  const y = year || new Date().getFullYear();
  return prisma.leave_balances.findMany({
    where: { year: y },
    include: {
      policy: true,
      user:   { select: { id: true, first_name: true, last_name: true, email: true } },
    },
    orderBy: [{ user_id: 'asc' }, { policy_id: 'asc' }],
  });
}
