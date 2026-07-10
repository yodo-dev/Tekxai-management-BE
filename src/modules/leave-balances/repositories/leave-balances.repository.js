import prisma from '../../../shared/database/client.js';

export async function get_or_create_balance(user_id, policy_id, year) {
  const existing = await prisma.leave_balances.findFirst({
    where: { user_id, policy_id, year: Number(year) },
    include: { policy: true },
  });
  if (existing) return existing;
  const policy = await prisma.time_off_policies.findFirst({ where: { id: policy_id } });
  if (!policy) return null;
  return prisma.leave_balances.create({
    data: {
      user_id, policy_id, year: Number(year),
      total_days:     policy.days_allowed,
      used_days:      0,
      pending_days:   0,
      remaining_days: policy.days_allowed,
    },
    include: { policy: true },
  });
}

export async function get_user_balances(user_id, year) {
  const yr = year ? Number(year) : new Date().getFullYear();
  const policies = await prisma.time_off_policies.findMany({
  take: 500, where: { is_active: true } });
  const balances = await Promise.all(policies.map((p) => get_or_create_balance(user_id, p.id, yr)));
  return balances.filter(Boolean);
}

// Sprint 2 Milestone 5: `remaining_days` tracks total_days - used_days only
// (it is NOT total - used - pending). A pending request reserves days via
// pending_days alone; remaining_days only moves when a request is actually
// approved (used_days increases) or when an approved request's debit is
// reversed. This is the invariant the approved lifecycle spec's field list
// implies (Create/Reject/Cancel never mention remaining_days changing;
// only Approve does) and it's what this function already implemented.
export async function deduct_leave(user_id, policy_id, days) {
  const year = new Date().getFullYear();
  await get_or_create_balance(user_id, policy_id, year);
  return prisma.leave_balances.updateMany({
    where: { user_id, policy_id, year },
    data: { used_days: { increment: days }, remaining_days: { decrement: days }, pending_days: { decrement: days } },
  });
}

// Create Request: reserves `days` against pending_days only. remaining_days
// is untouched here — it only reflects used_days (see deduct_leave above).
export async function mark_pending(user_id, policy_id, days) {
  const year = new Date().getFullYear();
  await get_or_create_balance(user_id, policy_id, year);
  return prisma.leave_balances.updateMany({
    where: { user_id, policy_id, year },
    data: { pending_days: { increment: days } },
  });
}

// Reject / Cancel Pending Request: releases the `days` reservation from
// pending_days. remaining_days is untouched — it was never decremented by
// mark_pending, so there is nothing to restore on it.
export async function restore_leave(user_id, policy_id, days) {
  const year = new Date().getFullYear();
  return prisma.leave_balances.updateMany({
    where: { user_id, policy_id, year },
    data: { pending_days: { decrement: days } },
  });
}
