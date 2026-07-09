import prisma from '../../../shared/database/client.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';

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
  page = +page || 1; limit = +limit || 20;
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

function parse_dates(d) {
  if (d.purchase_date)   d.purchase_date   = new Date(d.purchase_date);
  if (d.warranty_expiry) d.warranty_expiry = new Date(d.warranty_expiry);
  return d;
}

export async function create_asset(data) {
  const { user_id, assigned_at, ...assetData } = data;
  parse_dates(assetData);
  if (!assetData.asset_tag) {
    const count = await prisma.assets.count();
    assetData.asset_tag = `AST-${String(count + 1001).padStart(4, '0')}`;
  }
  if (user_id) {
    assetData.status = 'ASSIGNED';
    return prisma.$transaction(async (tx) => {
      const asset = await tx.assets.create({ data: assetData, include: ASSET_INCLUDE });
      await tx.asset_assignments.create({
        data: {
          asset_id: asset.id,
          user_id,
          assigned_at: assigned_at ? new Date(assigned_at) : new Date(),
          is_active: true,
        },
      });
      return tx.assets.findFirst({ where: { id: asset.id }, include: ASSET_INCLUDE });
    });
  }
  return prisma.assets.create({ data: assetData, include: ASSET_INCLUDE });
}

export async function update_asset(id, data) {
  await get_asset(id);
  parse_dates(data);
  return prisma.assets.update({ where: { id }, data, include: ASSET_INCLUDE });
}

export async function delete_asset(id) {
  await get_asset(id);
  return prisma.assets.update({ where: { id }, data: { deleted_at: new Date(), status: 'RETIRED' } });
}

export async function assign_asset(asset_id, { user_id, assigned_by, return_date, notes }) {
  const asset = await get_asset(asset_id);
  if (asset.status === 'ASSIGNED') throw app_error('Asset is already assigned', 400);

  const assignment = await prisma.$transaction(async (tx) => {
    await tx.asset_assignments.updateMany({
      where: { asset_id, is_active: true },
      data: { is_active: false },
    });
    const created = await tx.asset_assignments.create({
      data: { asset_id, user_id, assigned_by, return_date, notes, is_active: true },
    });
    await tx.assets.update({ where: { id: asset_id }, data: { status: 'ASSIGNED' } });
    return created;
  });

  const employee = await prisma.users.findUnique({
    where: { id: user_id },
    select: { first_name: true, last_name: true },
  });
  const employee_name = `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || 'the employee';

  await log_activity({
    user_id: assigned_by || user_id,
    action: 'UPDATE',
    entity_type: 'asset',
    entity_id: asset_id,
    description: `Asset "${asset.name}" assigned to ${employee_name}`,
  }).catch(() => {});

  await prisma.notifications.create({
    data: {
      user_id,
      title: 'Asset Assigned',
      message: `The asset "${asset.name}" has been assigned to you.`,
      type: 'ASSET',
    },
  }).catch(() => null);

  return assignment;
}

export async function return_asset(asset_id, { returned_condition, notes }, actor_user_id) {
  const asset = await get_asset(asset_id);
  const active_assignment = asset.assignments?.[0];

  await prisma.$transaction(async (tx) => {
    await tx.asset_assignments.updateMany({
      where: { asset_id, is_active: true },
      data: { is_active: false, returned_at: new Date(), returned_condition, notes },
    });
    await tx.assets.update({ where: { id: asset_id }, data: { status: 'AVAILABLE' } });
  });

  const assigned_user_id = active_assignment?.user_id || active_assignment?.user?.id;

  await log_activity({
    user_id: actor_user_id || assigned_user_id,
    action: 'UPDATE',
    entity_type: 'asset',
    entity_id: asset_id,
    description: `Asset "${asset.name}" returned${returned_condition ? ` in ${returned_condition} condition` : ''}`,
  }).catch(() => {});

  if (assigned_user_id) {
    await prisma.notifications.create({
      data: {
        user_id: assigned_user_id,
        title: 'Asset Return Recorded',
        message: `The return of asset "${asset.name}" has been recorded.`,
        type: 'ASSET',
      },
    }).catch(() => null);
  }
}

export async function add_maintenance(asset_id, data) {
  await get_asset(asset_id);
  return prisma.asset_maintenance_logs.create({ data: { ...data, asset_id } });
}

export async function list_categories() {
  return prisma.asset_categories.findMany({
    take: 500,
    where: { is_active: true },
    orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
  });
}

export async function create_category({ name, description, is_device = false, is_assignable = true }) {
  const code = name.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').slice(0, 20);
  return prisma.asset_categories.upsert({
    where: { code },
    update: { name, description, is_device, is_assignable, is_active: true },
    create: { name, code, description, is_device, is_assignable, is_active: true, sort_order: 50 },
  });
}

export async function list_locations() {
  return prisma.asset_locations.findMany({
  take: 500, orderBy: { office: 'asc' } });
}

export async function list_vendors() {
  return prisma.asset_vendors.findMany({
  take: 500, orderBy: { name: 'asc' } });
}
