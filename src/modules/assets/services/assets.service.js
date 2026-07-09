import prisma from '../../../shared/database/client.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';
import { create_notification } from '../../notifications/services/notifications.service.js';

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

  await create_notification({
    user_id,
    title: 'Asset Assigned',
    message: `The asset "${asset.name}" has been assigned to you.`,
    type: 'ASSET',
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
    await create_notification({
      user_id: assigned_user_id,
      title: 'Asset Return Recorded',
      message: `The return of asset "${asset.name}" has been recorded.`,
      type: 'ASSET',
    }).catch(() => null);
  }
}

export async function add_maintenance(asset_id, data) {
  await get_asset(asset_id);
  return prisma.asset_maintenance_logs.create({ data: { ...data, asset_id } });
}

// ─── Asset Requests (single-approver request/approval workflow) ──────────────

const REQUEST_INCLUDE = {
  requester: { select: { id: true, first_name: true, last_name: true, email: true } },
  requested_for: { select: { id: true, first_name: true, last_name: true, email: true } },
  reviewer: { select: { id: true, first_name: true, last_name: true, email: true } },
  category: true,
};

export async function create_asset_request(user_id, { requested_for_user_id, asset_category_id, reason }) {
  if (!asset_category_id) throw app_error('asset_category_id is required', 400);

  const request = await prisma.asset_requests.create({
    data: {
      user_id,
      requested_for_user_id: requested_for_user_id || user_id,
      asset_category_id,
      reason,
    },
    include: REQUEST_INCLUDE,
  });

  await log_activity({
    user_id,
    action: 'CREATE',
    entity_type: 'asset_request',
    entity_id: request.id,
    description: `Asset request created for category "${request.category?.name}"`,
  }).catch(() => {});

  return request;
}

export async function list_asset_requests({ status, page = 1, limit = 20 } = {}) {
  page = +page || 1; limit = +limit || 20;
  const skip = (page - 1) * limit;
  const where = {};
  if (status) where.status = status;

  const [total, records] = await Promise.all([
    prisma.asset_requests.count({ where }),
    prisma.asset_requests.findMany({
      where, skip, take: limit, orderBy: { created_at: 'desc' }, include: REQUEST_INCLUDE,
    }),
  ]);

  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function get_asset_request(id) {
  const request = await prisma.asset_requests.findUnique({ where: { id }, include: REQUEST_INCLUDE });
  if (!request) throw app_error('Asset request not found', 404);
  return request;
}

export async function approve_asset_request(id, { asset_id, reviewed_by, notes }) {
  const request = await get_asset_request(id);
  if (request.status !== 'PENDING') throw app_error('Only pending requests can be approved', 400);
  if (!asset_id) throw app_error('asset_id is required to approve a request', 400);

  // Reuse assign_asset for the actual assignment — no duplicated assignment logic.
  await assign_asset(asset_id, { user_id: request.requested_for_user_id, assigned_by: reviewed_by, notes });

  const updated = await prisma.asset_requests.update({
    where: { id },
    data: { status: 'APPROVED', reviewed_by, reviewed_at: new Date() },
    include: REQUEST_INCLUDE,
  });

  await log_activity({
    user_id: reviewed_by,
    action: 'UPDATE',
    entity_type: 'asset_request',
    entity_id: id,
    description: `Asset request approved and asset assigned`,
  }).catch(() => {});

  await create_notification({
    user_id: request.user_id,
    title: 'Asset Request Approved',
    message: `Your asset request for "${request.category?.name}" has been approved.`,
    type: 'ASSET',
  }).catch(() => null);

  return updated;
}

export async function reject_asset_request(id, { reviewed_by, rejection_reason }) {
  const request = await get_asset_request(id);
  if (request.status !== 'PENDING') throw app_error('Only pending requests can be rejected', 400);

  const updated = await prisma.asset_requests.update({
    where: { id },
    data: { status: 'REJECTED', reviewed_by, reviewed_at: new Date(), rejection_reason },
    include: REQUEST_INCLUDE,
  });

  await log_activity({
    user_id: reviewed_by,
    action: 'UPDATE',
    entity_type: 'asset_request',
    entity_id: id,
    description: `Asset request rejected${rejection_reason ? `: ${rejection_reason}` : ''}`,
  }).catch(() => {});

  await create_notification({
    user_id: request.user_id,
    title: 'Asset Request Rejected',
    message: `Your asset request for "${request.category?.name}" was rejected${rejection_reason ? `: ${rejection_reason}` : ''}.`,
    type: 'ASSET',
  }).catch(() => null);

  return updated;
}

// ─── Asset Disposals ──────────────────────────────────────────────────────────

export async function list_disposals({ page = 1, limit = 20 } = {}) {
  page = +page || 1; limit = +limit || 20;
  const skip = (page - 1) * limit;

  const [total, records] = await Promise.all([
    prisma.asset_disposals.count(),
    prisma.asset_disposals.findMany({
      skip, take: limit, orderBy: { disposal_date: 'desc' },
      include: { asset: { select: { id: true, name: true, asset_tag: true } } },
    }),
  ]);

  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function create_disposal(data) {
  const { asset_id, reason, disposal_date, disposed_by, notes } = data;
  const asset = await get_asset(asset_id);

  const disposal = await prisma.$transaction(async (tx) => {
    const created = await tx.asset_disposals.create({
      data: {
        asset_id,
        reason,
        disposal_date: disposal_date ? new Date(disposal_date) : new Date(),
        disposed_by,
        notes,
      },
      include: { asset: { select: { id: true, name: true, asset_tag: true } } },
    });
    await tx.asset_assignments.updateMany({
      where: { asset_id, is_active: true },
      data: { is_active: false, returned_at: new Date() },
    });
    await tx.assets.update({ where: { id: asset_id }, data: { status: 'RETIRED', deleted_at: new Date() } });
    return created;
  });

  await log_activity({
    user_id: disposed_by,
    action: 'UPDATE',
    entity_type: 'asset',
    entity_id: asset_id,
    description: `Asset "${asset.name}" disposed${reason ? `: ${reason}` : ''}`,
  }).catch(() => {});

  return disposal;
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

// ─── Reporting: Depreciation & Inventory (Sprint 1 Phase 3 M4) ───────────────
// NOTE: depreciation is computed on the fly — no schema changes. Uses a simple,
// uniform straight-line assumption: 36 months (3 years) useful life.
const DEPRECIATION_MONTHS = 36;

function compute_depreciation(purchase_cost, purchase_date) {
  if (purchase_cost == null || !purchase_date) {
    return { current_value: null, depreciation_to_date: null, months_elapsed: null };
  }
  const now = new Date();
  const purchased = new Date(purchase_date);
  const months_elapsed = Math.max(
    0,
    (now.getFullYear() - purchased.getFullYear()) * 12 + (now.getMonth() - purchased.getMonth())
  );
  const fraction_remaining = Math.max(0, 1 - months_elapsed / DEPRECIATION_MONTHS);
  const current_value = Math.round(purchase_cost * fraction_remaining * 100) / 100;
  const depreciation_to_date = Math.round((purchase_cost - current_value) * 100) / 100;
  return { current_value, depreciation_to_date, months_elapsed };
}

export async function get_depreciation_report() {
  const assets = await prisma.assets.findMany({
    where: { deleted_at: null },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      name: true,
      asset_tag: true,
      category: { select: { id: true, name: true } },
      status: true,
      purchase_cost: true,
      purchase_date: true,
    },
  });

  const records = assets.map((a) => {
    const { current_value, depreciation_to_date, months_elapsed } = compute_depreciation(
      a.purchase_cost,
      a.purchase_date
    );
    return {
      id: a.id,
      name: a.name,
      asset_tag: a.asset_tag,
      category: a.category,
      status: a.status,
      purchase_cost: a.purchase_cost,
      purchase_date: a.purchase_date,
      months_elapsed,
      current_value,
      depreciation_to_date,
    };
  });

  const total_purchase_cost = records.reduce((sum, r) => sum + (r.purchase_cost || 0), 0);
  const total_current_value = records.reduce((sum, r) => sum + (r.current_value || 0), 0);
  const total_depreciation = records.reduce((sum, r) => sum + (r.depreciation_to_date || 0), 0);

  return {
    records,
    total: records.length,
    useful_life_months: DEPRECIATION_MONTHS,
    total_purchase_cost: Math.round(total_purchase_cost * 100) / 100,
    total_current_value: Math.round(total_current_value * 100) / 100,
    total_depreciation: Math.round(total_depreciation * 100) / 100,
  };
}

export async function get_inventory_report() {
  const now = new Date();
  const in_90_days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const [
    status_groups,
    category_groups_raw,
    warranty_assets,
    completed_assignments,
  ] = await Promise.all([
    prisma.assets.groupBy({
      by: ['status'],
      where: { deleted_at: null },
      _count: { _all: true },
    }),
    prisma.assets.groupBy({
      by: ['category_id'],
      where: { deleted_at: null },
      _count: { _all: true },
    }),
    prisma.assets.findMany({
      where: {
        deleted_at: null,
        warranty_expiry: { lte: in_90_days },
      },
      select: {
        id: true,
        name: true,
        asset_tag: true,
        warranty_expiry: true,
        status: true,
        category: { select: { id: true, name: true } },
      },
      orderBy: { warranty_expiry: 'asc' },
    }),
    prisma.asset_assignments.findMany({
      where: { returned_at: { not: null } },
      select: { assigned_at: true, returned_at: true },
    }),
  ]);

  const categories = await prisma.asset_categories.findMany({
    where: { id: { in: category_groups_raw.map((c) => c.category_id) } },
    select: { id: true, name: true },
  });
  const category_name_by_id = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const by_status = status_groups.map((g) => ({ status: g.status, count: g._count._all }));
  const by_category = category_groups_raw.map((g) => ({
    category_id: g.category_id,
    category_name: category_name_by_id[g.category_id] || 'Unknown',
    count: g._count._all,
  }));

  const warranty_alerts = warranty_assets.map((a) => ({
    ...a,
    is_expired: new Date(a.warranty_expiry) < now,
    days_until_expiry: Math.ceil((new Date(a.warranty_expiry) - now) / (24 * 60 * 60 * 1000)),
  }));

  let average_time_in_assignment_days = null;
  if (completed_assignments.length > 0) {
    const total_days = completed_assignments.reduce((sum, a) => {
      const days = (new Date(a.returned_at) - new Date(a.assigned_at)) / (24 * 60 * 60 * 1000);
      return sum + Math.max(0, days);
    }, 0);
    average_time_in_assignment_days = Math.round((total_days / completed_assignments.length) * 10) / 10;
  }

  return {
    by_status,
    by_category,
    warranty_alerts,
    average_time_in_assignment_days,
    completed_assignments_count: completed_assignments.length,
  };
}

export async function list_locations() {
  return prisma.asset_locations.findMany({
  take: 500, orderBy: { office: 'asc' } });
}

export async function list_vendors() {
  return prisma.asset_vendors.findMany({
  take: 500, orderBy: { name: 'asc' } });
}
