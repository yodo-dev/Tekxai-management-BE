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
    data: { user_id, policy_id, year: Number(year), allocated: policy.days_allowed, used: 0, pending: 0, remaining: policy.days_allowed },
    include: { policy: true },
  });
}

export async function get_user_balances(user_id, year) {
  const yr = year ? Number(year) : new Date().getFullYear();
  const policies = await prisma.time_off_policies.findMany({ where: { is_active: true } });
  const balances = await Promise.all(policies.map((p) => get_or_create_balance(user_id, p.id, yr)));
  return balances.filter(Boolean);
}

export async function deduct_leave(user_id, policy_id, days) {
  const year = new Date().getFullYear();
  await get_or_create_balance(user_id, policy_id, year);
  return prisma.leave_balances.updateMany({ where: { user_id, policy_id, year }, data: { used: { increment: days }, remaining: { decrement: days }, pending: { decrement: days } } });
}

export async function mark_pending(user_id, policy_id, days) {
  const year = new Date().getFullYear();
  await get_or_create_balance(user_id, policy_id, year);
  return prisma.leave_balances.updateMany({ where: { user_id, policy_id, year }, data: { pending: { increment: days }, remaining: { decrement: days } } });
}

export async function restore_leave(user_id, policy_id, days) {
  const year = new Date().getFullYear();
  return prisma.leave_balances.updateMany({ where: { user_id, policy_id, year }, data: { pending: { decrement: days }, remaining: { increment: days } } });
}
