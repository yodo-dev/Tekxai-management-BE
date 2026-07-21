import prisma from '../../../shared/database/client.js';

const INCLUDE = {
  user:      { select: { id: true, first_name: true, last_name: true, email: true, avatar: true } },
  requester: { select: { id: true, first_name: true, last_name: true } },
  decider:   { select: { id: true, first_name: true, last_name: true } },
};

export async function find_pending_for_user_and_transition(user_id, transition) {
  return prisma.lifecycle_approval_requests.findFirst({
    where: { user_id, transition, status: 'PENDING' },
  });
}

export async function create_approval_request({ user_id, transition, from_stage, to_stage, requested_by, reason, metadata }) {
  return prisma.lifecycle_approval_requests.create({
    data: { user_id, transition, from_stage, to_stage, requested_by, reason: reason || null, metadata: metadata || undefined },
    include: INCLUDE,
  });
}

export async function find_approval_by_id(id) {
  return prisma.lifecycle_approval_requests.findUnique({ where: { id }, include: INCLUDE });
}

export async function list_approval_requests({ status, user_id, page = 1, limit = 20 } = {}) {
  page = +page || 1; limit = +limit || 20;
  const skip = (page - 1) * limit;
  const where = {};
  if (status) where.status = status;
  if (user_id) where.user_id = user_id;

  const [total, records] = await Promise.all([
    prisma.lifecycle_approval_requests.count({ where }),
    prisma.lifecycle_approval_requests.findMany({
      where, skip, take: limit, orderBy: { created_at: 'desc' }, include: INCLUDE,
    }),
  ]);

  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function decide_approval_request(id, { status, decided_by, decision_note }) {
  return prisma.lifecycle_approval_requests.update({
    where: { id },
    data: { status, decided_by, decided_at: new Date(), decision_note: decision_note || null },
    include: INCLUDE,
  });
}
