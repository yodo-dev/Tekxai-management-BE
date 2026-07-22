import prisma from '../../../shared/database/client.js';

const REQ_SELECT = {
  id: true, title: true, category: true, description: true, quantity: true,
  estimated_cost: true, actual_cost: true, currency: true,
  vendor_name: true, purchase_notes: true, purchase_date: true, invoice_reference: true,
  priority: true, vendor_suggestion: true, attachment_url: true,
  needed_by: true, delivery_location: true, convert_to_asset: true, linked_asset_id: true,
  status: true, created_at: true, updated_at: true,
  requester: {
    select: { id: true, first_name: true, last_name: true, email: true, designation: true, department: { select: { id: true, name: true } } },
  },
  department: { select: { id: true, name: true } },
  approvals: {
    orderBy: { created_at: 'asc' },
    include: { approver: { select: { id: true, first_name: true, last_name: true } } },
  },
};

export const STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PROCUREMENT', 'FULFILLED', 'ASSET_CREATED', 'CLOSED'];
export const CATEGORIES = ['IT_EQUIPMENT', 'FURNITURE', 'ELECTRICAL', 'SOFTWARE', 'REPAIR', 'STATIONERY', 'NETWORKING', 'OTHER'];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export async function list_requisitions({ requester_id, department_id, status, category, priority, page = 1, limit = 20 } = {}) {
  page = +page || 1; limit = +limit || 20;
  const where = {};
  if (requester_id) where.requester_id = requester_id;
  if (department_id) where.department_id = department_id;
  if (status) where.status = status;
  if (category) where.category = category;
  if (priority) where.priority = priority;

  const [total, records] = await Promise.all([
    prisma.requisitions.count({ where }),
    prisma.requisitions.findMany({
      where,
      select: REQ_SELECT,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function get_requisition(id) {
  return prisma.requisitions.findUnique({ where: { id }, select: REQ_SELECT });
}

export async function create_requisition(requester_id, data) {
  const { title, category, description, quantity, estimated_cost, priority, vendor_suggestion, attachment_url, needed_by, delivery_location, convert_to_asset, department_id } = data;
  return prisma.requisitions.create({
    data: {
      requester_id,
      department_id: department_id || null,
      title,
      category: category || 'OTHER',
      description,
      quantity: quantity ? +quantity : 1,
      estimated_cost: estimated_cost ? parseFloat(estimated_cost) : null,
      priority: priority || 'MEDIUM',
      vendor_suggestion,
      attachment_url,
      needed_by: needed_by ? new Date(needed_by) : null,
      delivery_location,
      convert_to_asset: !!convert_to_asset,
      status: 'DRAFT',
      currency: 'PKR',
    },
    select: REQ_SELECT,
  });
}

export async function submit_requisition(id, requester_id) {
  const req = await prisma.requisitions.findFirst({ where: { id, requester_id, status: 'DRAFT' } });
  if (!req) throw Object.assign(new Error('Requisition not found or not in DRAFT status'), { status: 404 });
  return prisma.requisitions.update({ where: { id }, data: { status: 'SUBMITTED' }, select: REQ_SELECT });
}

export async function update_requisition(id, requester_id, data) {
  const req = await prisma.requisitions.findFirst({ where: { id, requester_id, status: 'DRAFT' } });
  if (!req) throw Object.assign(new Error('Can only edit DRAFT requisitions you own'), { status: 403 });
  const { title, category, description, quantity, estimated_cost, priority, vendor_suggestion, attachment_url, needed_by, delivery_location, convert_to_asset, department_id } = data;
  return prisma.requisitions.update({
    where: { id },
    data: {
      title, category, description,
      quantity: quantity ? +quantity : undefined,
      estimated_cost: estimated_cost != null ? parseFloat(estimated_cost) : undefined,
      priority, vendor_suggestion, attachment_url,
      needed_by: needed_by ? new Date(needed_by) : undefined,
      delivery_location, convert_to_asset: convert_to_asset != null ? !!convert_to_asset : undefined,
      department_id: department_id || undefined,
    },
    select: REQ_SELECT,
  });
}

export async function approve_requisition(id, approver_id, { action, comment, stage }) {
  const req = await prisma.requisitions.findUnique({ where: { id } });
  if (!req) throw Object.assign(new Error('Requisition not found'), { status: 404 });

  const new_status = action === 'APPROVED'
    ? (req.status === 'SUBMITTED' ? 'APPROVED' : req.status)
    : action === 'REJECTED'
    ? 'REJECTED'
    : req.status;

  return prisma.$transaction([
    prisma.requisition_approvals.create({
      data: { requisition_id: id, approver_id, action, comment, stage: stage || null },
    }),
    prisma.requisitions.update({ where: { id }, data: { status: new_status } }),
  ]);
}

export async function update_requisition_cost(id, data) {
  const { actual_cost, vendor_name, purchase_notes, purchase_date, invoice_reference } = data;
  return prisma.requisitions.update({
    where: { id },
    data: {
      actual_cost: actual_cost != null ? parseFloat(actual_cost) : undefined,
      vendor_name: vendor_name ?? undefined,
      purchase_notes: purchase_notes ?? undefined,
      purchase_date: purchase_date ? new Date(purchase_date) : undefined,
      invoice_reference: invoice_reference ?? undefined,
    },
    select: REQ_SELECT,
  });
}

// Post-approval workflow transitions only (PROCUREMENT, FULFILLED,
// ASSET_CREATED, CLOSED, DRAFT/SUBMITTED corrections) — APPROVED/REJECTED
// must go through approve_requisition() so the decision is gated by
// erp.requisitions.approve, not the broader ADMIN/HR role check this route
// otherwise shares. Without this, PATCH /:id/status could set a requisition
// to APPROVED without ever calling approve_requisition().
const DECISION_STATUSES = ['APPROVED', 'REJECTED'];
export async function update_requisition_status(id, status, approver_id, comment) {
  if (!STATUSES.includes(status)) throw Object.assign(new Error('Invalid status'), { status: 400 });
  if (DECISION_STATUSES.includes(status)) {
    throw Object.assign(new Error(`${status} must be set via POST /:id/approve, not this endpoint`), { status: 400 });
  }
  const [approval, updated] = await prisma.$transaction([
    prisma.requisition_approvals.create({
      data: { requisition_id: id, approver_id, action: status, comment },
    }),
    prisma.requisitions.update({ where: { id }, data: { status }, select: REQ_SELECT }),
  ]);
  return updated;
}

// Requisition → Asset Conversion
export async function convert_requisition_to_asset(id, asset_data, actor_id) {
  const req = await prisma.requisitions.findUnique({ where: { id } });
  if (!req) throw Object.assign(new Error('Requisition not found'), { status: 404 });
  if (!['APPROVED', 'PROCUREMENT', 'FULFILLED'].includes(req.status)) {
    throw Object.assign(new Error('Requisition must be APPROVED, PROCUREMENT or FULFILLED to convert'), { status: 400 });
  }
  if (req.linked_asset_id) {
    throw Object.assign(new Error('Asset already created from this requisition'), { status: 409 });
  }

  // Find or create a default category for the requisition category
  const cat_map = {
    IT_EQUIPMENT: 'IT Equipment', FURNITURE: 'Furniture', ELECTRICAL: 'Electrical',
    SOFTWARE: 'Software/License', REPAIR: 'Repair/Maintenance', STATIONERY: 'Stationery',
    NETWORKING: 'Networking', OTHER: 'Other',
  };
  const cat_name = cat_map[req.category] || 'Other';
  let category = await prisma.asset_categories.findFirst({ where: { name: cat_name } });
  if (!category) {
    const code = req.category.toLowerCase().replace(/[^a-z]/g, '_');
    category = await prisma.asset_categories.create({ data: { name: cat_name, code } });
  }

  return prisma.$transaction(async (tx) => {
    const asset_tag = asset_data.asset_tag || `REQ-${id.slice(-6).toUpperCase()}-${Date.now()}`;
    const asset = await tx.assets.create({
      data: {
        asset_tag,
        name: asset_data.name || req.title,
        brand: asset_data.brand || null,
        model: asset_data.model || null,
        serial_number: asset_data.serial_number || null,
        category_id: category.id,
        purchase_cost: asset_data.purchase_cost ?? req.estimated_cost,
        notes: `Created from requisition #${id}. ${asset_data.notes || ''}`.trim(),
        status: 'AVAILABLE',
      },
    });

    await tx.requisitions.update({
      where: { id },
      data: { status: 'ASSET_CREATED', linked_asset_id: asset.id },
    });

    await tx.requisition_approvals.create({
      data: {
        requisition_id: id,
        approver_id: actor_id,
        action: 'ASSET_CREATED',
        comment: `Asset created: ${asset.name} (tag: ${asset.asset_tag})`,
        stage: 'ASSET_CREATION',
      },
    });

    return { requisition_id: id, asset };
  });
}
