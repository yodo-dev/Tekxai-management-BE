import prisma from '../../../shared/database/client.js';

const PROJECT_INCLUDE = {
  owner: { select: { id: true, first_name: true, last_name: true, avatar: true, email: true } },
  team_leader: { select: { id: true, first_name: true, last_name: true, avatar: true, email: true } },
  members: { include: { user: { select: { id: true, first_name: true, last_name: true, avatar: true, email: true } } } },
  _count: { select: { members: true } },
};

function normalize_project(p, user_id = null) {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    status: p.status,
    progress: p.progress,
    total_hours: p.total_hours,
    start_date: p.start_date,
    end_date: p.end_date,
    due_date: p.end_date,
    owner_id: p.owner_id,
    leader_id: p.leader_id,
    owner: p.owner,
    team_leader: p.team_leader,
    members: p.members?.map((m) => m.user) || [],
    member_count: p._count?.members || 0,
    is_saved: false, // overridden per-user in list
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

export async function find_projects({ search, page = 1, limit = 20, status, user_id } = {}) {
  const skip = (page - 1) * limit;
  const where = { deleted_at: null };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status;

  const [total, records] = await Promise.all([
    prisma.projects.count({ where }),
    prisma.projects.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' }, include: PROJECT_INCLUDE }),
  ]);

  let saved_ids = new Set();
  if (user_id) {
    const starred = await prisma.starred_items.findMany({
      where: { user_id, item_type: 'project', item_id: { in: records.map((r) => r.id) } },
    });
    saved_ids = new Set(starred.map((s) => s.item_id));
  }

  return {
    records: records.map((p) => ({ ...normalize_project(p), is_saved: saved_ids.has(p.id) })),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

export async function find_project_by_id(id, user_id = null) {
  const p = await prisma.projects.findFirst({ where: { id, deleted_at: null }, include: PROJECT_INCLUDE });
  if (!p) return null;

  let is_saved = false;
  if (user_id) {
    const s = await prisma.starred_items.findFirst({ where: { user_id, item_type: 'project', item_id: id } });
    is_saved = !!s;
  }

  return { ...normalize_project(p), is_saved };
}

export async function create_project({ title, description, start_date, end_date, total_hours, owner_id, leader_id, member_ids = [] }) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.projects.create({
      data: { title, description, start_date, end_date, total_hours: total_hours || 0, owner_id, leader_id },
    });

    if (member_ids.length > 0) {
      await tx.project_members.createMany({
        data: member_ids.map((uid) => ({ project_id: project.id, user_id: uid })),
        skipDuplicates: true,
      });
    }

    return find_project_by_id(project.id);
  });
}

export async function update_project(id, { title, description, status, progress, start_date, end_date, total_hours, owner_id, leader_id, member_ids }) {
  return prisma.$transaction(async (tx) => {
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (progress !== undefined) data.progress = progress;
    if (start_date !== undefined) data.start_date = start_date;
    if (end_date !== undefined) data.end_date = end_date;
    if (total_hours !== undefined) data.total_hours = total_hours;
    if (owner_id !== undefined) data.owner_id = owner_id;
    if (leader_id !== undefined) data.leader_id = leader_id;

    await tx.projects.update({ where: { id }, data });

    if (Array.isArray(member_ids)) {
      await tx.project_members.deleteMany({ where: { project_id: id } });
      if (member_ids.length > 0) {
        await tx.project_members.createMany({
          data: member_ids.map((uid) => ({ project_id: id, user_id: uid })),
          skipDuplicates: true,
        });
      }
    }

    return find_project_by_id(id);
  });
}

export async function delete_project(id) {
  return prisma.projects.update({ where: { id }, data: { deleted_at: new Date() } });
}

export async function find_saved_projects(user_id, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const starred = await prisma.starred_items.findMany({
    where: { user_id, item_type: 'project' },
    skip,
    take: limit,
    orderBy: { created_at: 'desc' },
  });

  const project_ids = starred.map((s) => s.item_id);
  const projects = await prisma.projects.findMany({
    where: { id: { in: project_ids }, deleted_at: null },
    include: PROJECT_INCLUDE,
  });

  return projects.map((p) => ({ ...normalize_project(p), is_saved: true }));
}

export async function save_project(user_id, project_id) {
  return prisma.starred_items.upsert({
    where: { user_id_item_type_item_id: { user_id, item_type: 'project', item_id: project_id } },
    update: {},
    create: { user_id, item_type: 'project', item_id: project_id, project_id },
  });
}

export async function unsave_project(user_id, project_id) {
  return prisma.starred_items.deleteMany({
    where: { user_id, item_type: 'project', item_id: project_id },
  });
}
