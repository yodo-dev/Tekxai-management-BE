import prisma from '../../../shared/database/client.js';

const TASK_INCLUDE = {
  assignee: { select: { id: true, first_name: true, last_name: true, avatar: true } },
};

const MEMBER_INCLUDE = {
  user: { select: { id: true, first_name: true, last_name: true, avatar: true, email: true } },
};

const MILESTONE_INCLUDE = {
  tasks: { where: { deleted_at: null }, include: TASK_INCLUDE, orderBy: { created_at: 'asc' } },
  members: { include: MEMBER_INCLUDE },
};

export async function find_milestones_by_project(project_id, { include_archived = false } = {}) {
  return prisma.milestones.findMany({
    take: 500,
    where: { project_id, ...(include_archived ? {} : { archived_at: null }) },
    orderBy: [{ sequence: 'asc' }, { due_date: 'asc' }],
    include: MILESTONE_INCLUDE,
  });
}

export async function find_milestone_by_id(id) {
  return prisma.milestones.findFirst({ where: { id }, include: MILESTONE_INCLUDE });
}

// Sequence uniqueness is per-project, excluding archived milestones and (on
// update) the milestone itself.
export async function find_sequence_conflict(project_id, sequence, exclude_id = null) {
  if (sequence == null) return null;
  return prisma.milestones.findFirst({
    where: {
      project_id, sequence: +sequence, archived_at: null,
      ...(exclude_id ? { id: { not: exclude_id } } : {}),
    },
    select: { id: true, title: true },
  });
}

export async function create_milestone({ project_id, title, description, due_date, sequence, status, estimated_start, estimated_end, progress_percent, remarks, depends_on_ids }) {
  return prisma.milestones.create({
    data: {
      project_id,
      title,
      description: description || null,
      due_date: due_date ? new Date(due_date) : null,
      sequence: sequence != null && sequence !== '' ? +sequence : null,
      status: status || 'NOT_STARTED',
      completed: status === 'COMPLETED',
      blocked: status === 'BLOCKED',
      completed_date: status === 'COMPLETED' ? new Date() : null,
      estimated_start: estimated_start ? new Date(estimated_start) : null,
      estimated_end: estimated_end ? new Date(estimated_end) : null,
      progress_percent: progress_percent != null ? +progress_percent : 0,
      remarks: remarks || null,
      depends_on_ids: Array.isArray(depends_on_ids) ? depends_on_ids : [],
    },
    include: MILESTONE_INCLUDE,
  });
}

export async function update_milestone(id, data) {
  const payload = {};
  if (data.title !== undefined) payload.title = data.title.trim();
  if (data.description !== undefined) payload.description = data.description || null;
  if (data.due_date !== undefined) payload.due_date = data.due_date ? new Date(data.due_date) : null;
  if (data.sequence !== undefined) payload.sequence = data.sequence != null && data.sequence !== '' ? +data.sequence : null;
  if (data.estimated_start !== undefined) payload.estimated_start = data.estimated_start ? new Date(data.estimated_start) : null;
  if (data.estimated_end !== undefined) payload.estimated_end = data.estimated_end ? new Date(data.estimated_end) : null;
  if (data.progress_percent !== undefined) payload.progress_percent = +data.progress_percent;
  if (data.remarks !== undefined) payload.remarks = data.remarks || null;
  if (data.depends_on_ids !== undefined) payload.depends_on_ids = Array.isArray(data.depends_on_ids) ? data.depends_on_ids : [];

  // status is the canonical field; completed/blocked booleans + completed_date
  // are always derived from it here, never written independently, so nothing
  // can leave the two mirrored booleans out of sync with status.
  if (data.status !== undefined) {
    payload.status = data.status;
    payload.completed = data.status === 'COMPLETED';
    payload.blocked = data.status === 'BLOCKED';
    if (data.status === 'COMPLETED') {
      payload.completed_date = data.completed_date ? new Date(data.completed_date) : new Date();
    } else {
      payload.completed_date = null;
    }
  }

  return prisma.milestones.update({ where: { id }, data: payload, include: MILESTONE_INCLUDE });
}

export async function archive_milestone(id) {
  return prisma.milestones.update({ where: { id }, data: { archived_at: new Date() }, include: MILESTONE_INCLUDE });
}

export async function unarchive_milestone(id) {
  return prisma.milestones.update({ where: { id }, data: { archived_at: null }, include: MILESTONE_INCLUDE });
}

export async function delete_milestone(id) {
  return prisma.milestones.delete({ where: { id } });
}

// Replaces the full assigned-members set for a milestone (simplest correct
// semantics for a small multi-select — same replace-the-set approach
// projects.repository.js already uses for project_members on update).
export async function set_milestone_members(milestone_id, user_ids = []) {
  const unique_ids = [...new Set(user_ids.filter(Boolean))];
  await prisma.$transaction(async (tx) => {
    await tx.milestone_members.deleteMany({ where: { milestone_id, user_id: { notIn: unique_ids } } });
    for (const user_id of unique_ids) {
      await tx.milestone_members.upsert({
        where: { milestone_id_user_id: { milestone_id, user_id } },
        update: {},
        create: { milestone_id, user_id },
      });
    }
  });
  return prisma.milestones.findFirst({ where: { id: milestone_id }, include: MILESTONE_INCLUDE });
}
