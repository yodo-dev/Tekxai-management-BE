import prisma from '../../../shared/database/client.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

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

export async function list_assets({ search, status, category_id, department_id, location_id, page = 1, limit = 20 } = {}) {
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

export async function get_asset(id) {
  const a = await prisma.assets.findFirst({ where: { id, deleted_at: null }, include: ASSET_INCLUDE });
  if (!a) throw app_error('Asset not found', 404);
  return a;
}

export async function create_asset(data) {
  // Auto-generate asset tag if not provided
  if (!data.asset_tag) {
    const count = await prisma.assets.count();
    data.asset_tag = `AST-${String(count + 1001).padStart(4, '0')}`;
  }
  return prisma.assets.create({ data, include: ASSET_INCLUDE });
}

export async function update_asset(id, data) {
  await get_asset(id);
  return prisma.assets.update({ where: { id }, data, include: ASSET_INCLUDE });
}

export async function delete_asset(id) {
  await get_asset(id);
  return prisma.assets.update({ where: { id }, data: { deleted_at: new Date(), status: 'RETIRED' } });
}

export async function assign_asset(asset_id, { user_id, assigned_by, return_date, notes }) {
  const asset = await get_asset(asset_id);
  if (asset.status === 'ASSIGNED') throw app_error('Asset is already assigned', 400);

  return prisma.$transaction(async (tx) => {
    await tx.asset_assignments.updateMany({
      where: { asset_id, is_active: true },
      data: { is_active: false },
    });
    const assignment = await tx.asset_assignments.create({
      data: { asset_id, user_id, assigned_by, return_date, notes, is_active: true },
    });
    await tx.assets.update({ where: { id: asset_id }, data: { status: 'ASSIGNED' } });
    return assignment;
  });
}

export async function return_asset(asset_id, { returned_condition, notes }) {
  return prisma.$transaction(async (tx) => {
    await tx.asset_assignments.updateMany({
      where: { asset_id, is_active: true },
      data: { is_active: false, returned_at: new Date(), returned_condition, notes },
    });
    await tx.assets.update({ where: { id: asset_id }, data: { status: 'AVAILABLE' } });
  });
}

export async function add_maintenance(asset_id, data) {
  await get_asset(asset_id);
  return prisma.asset_maintenance_logs.create({ data: { ...data, asset_id } });
}

export async function list_categories() {
  return prisma.asset_categories.findMany({ orderBy: { name: 'asc' } });
}

export async function list_locations() {
  return prisma.asset_locations.findMany({ orderBy: { office: 'asc' } });
}

export async function list_vendors() {
  return prisma.asset_vendors.findMany({ orderBy: { name: 'asc' } });
}
