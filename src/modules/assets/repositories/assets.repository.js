import prisma from '../../../shared/database/client.js';

const ASSET_INCLUDE = {
  category: true,
  vendor: true,
  location: true,
  department: { select: { id: true, name: true } },
  assignments: {
    where: { is_active: true },
    include: { user: { select: { id: true, first_name: true, last_name: true, email: true } } },
    take: 1,
  },
};

export async function find_assets({ search, status, category_id, department_id, location_id, page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const where = { deleted_at: null };
  if (status) where.status = status;
  if (category_id) where.category_id = category_id;
  if (department_id) where.department_id = department_id;
  if (location_id) where.location_id = location_id;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { asset_tag: { contains: search, mode: 'insensitive' } },
      { serial_number: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
    ];
  }
  const [total, records] = await Promise.all([
    prisma.assets.count({ where }),
    prisma.assets.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' }, include: ASSET_INCLUDE }),
  ]);
  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function find_asset_by_id(id) {
  return prisma.assets.findFirst({ where: { id, deleted_at: null }, include: ASSET_INCLUDE });
}

export async function create_asset(data) {
  return prisma.assets.create({ data, include: ASSET_INCLUDE });
}

export async function update_asset(id, data) {
  return prisma.assets.update({ where: { id }, data, include: ASSET_INCLUDE });
}

export async function retire_asset(id) {
  return prisma.assets.update({ where: { id }, data: { deleted_at: new Date(), status: 'RETIRED' } });
}

export async function create_assignment({ asset_id, user_id, assigned_by, return_date, notes }) {
  const [assignment] = await prisma.$transaction([
    prisma.asset_assignments.create({ data: { asset_id, user_id, assigned_by, return_date, notes, is_active: true } }),
    prisma.assets.update({ where: { id: asset_id }, data: { status: 'ASSIGNED' } }),
    prisma.asset_assignments.updateMany({ where: { asset_id, is_active: true, NOT: { created_at: undefined } }, data: {} }),
  ]);
  return assignment;
}

export async function return_asset_db(asset_id, { returned_condition, notes }) {
  await prisma.$transaction([
    prisma.asset_assignments.updateMany({ where: { asset_id, is_active: true }, data: { is_active: false, returned_at: new Date(), returned_condition, notes } }),
    prisma.assets.update({ where: { id: asset_id }, data: { status: 'AVAILABLE' } }),
  ]);
}

export async function find_categories() {
  return prisma.asset_categories.findMany({ orderBy: { name: 'asc' } });
}

export async function find_locations() {
  return prisma.asset_locations.findMany({ orderBy: { office: 'asc' } });
}

export async function find_vendors() {
  return prisma.asset_vendors.findMany({ orderBy: { name: 'asc' } });
}

export async function create_maintenance_log(data) {
  return prisma.asset_maintenance_logs.create({ data });
}
