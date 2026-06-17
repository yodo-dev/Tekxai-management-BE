import prisma from '../../../shared/database/client.js';

const USER_SELECT = {
  id: true,
  email: true,
  first_name: true,
  last_name: true,
  phone: true,
  avatar: true,
  department: true,
  position: true,
  designation: true,
  status: true,
  is_active: true,
  created_at: true,
  updated_at: true,
  roles: { include: { role: { select: { id: true, name: true } } } },
  team_memberships: { include: { team: { select: { id: true, name: true } } } },
};

function normalize_user(user) {
  const role = user.roles?.[0]?.role;
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone,
    avatar: user.avatar,
    department: user.department,
    position: user.position,
    designation: user.designation,
    status: user.status,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
    role: role || null,
    role_name: role?.name || null,
    team_memberships: user.team_memberships || [],
  };
}

export async function find_users({ search, page = 1, limit = 20, role } = {}) {
  const skip = (page - 1) * limit;
  const where = { deleted_at: null };

  if (search) {
    where.OR = [
      { first_name: { contains: search, mode: 'insensitive' } },
      { last_name:  { contains: search, mode: 'insensitive' } },
      { email:      { contains: search, mode: 'insensitive' } },
      { department: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (role) {
    where.roles = { some: { role: { name: role } } };
  }

  const [total, records] = await Promise.all([
    prisma.users.count({ where }),
    prisma.users.findMany({
      where,
      select: USER_SELECT,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
  ]);

  return {
    records: records.map(normalize_user),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

export async function find_user_by_id(id) {
  const user = await prisma.users.findFirst({
    where: { id, deleted_at: null },
    select: USER_SELECT,
  });
  return user ? normalize_user(user) : null;
}

export async function create_user({ email, password_hash, first_name, last_name, phone, department, position, designation, role_id, avatar }) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.users.create({
      data: {
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        department,
        position,
        designation,
        avatar,
        status: 'ACTIVE',
      },
    });

    if (role_id) {
      await tx.user_roles.create({ data: { user_id: user.id, role_id } });
    }

    await tx.user_settings.create({ data: { user_id: user.id } });

    const full_user = await tx.users.findUnique({ where: { id: user.id }, select: USER_SELECT });
    return normalize_user(full_user);
  });
}

export async function update_user(id, data) {
  const { role_id, ...rest } = data;

  await prisma.users.update({
    where: { id },
    data: { ...rest, updated_at: new Date() },
  });

  if (role_id) {
    const existing = await prisma.user_roles.findFirst({ where: { user_id: id } });
    if (existing) {
      await prisma.user_roles.delete({
        where: { user_id_role_id: { user_id: id, role_id: existing.role_id } },
      });
    }
    await prisma.user_roles.upsert({
      where: { user_id_role_id: { user_id: id, role_id } },
      update: {},
      create: { user_id: id, role_id },
    });
  }

  return find_user_by_id(id);
}

export async function soft_delete_user(id) {
  return prisma.users.update({
    where: { id },
    data: { deleted_at: new Date(), is_active: false, status: 'INACTIVE' },
  });
}
