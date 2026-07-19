import prisma from '../../../shared/database/client.js';

function app_error(message, status_code = 400) {
  const e = new Error(message);
  e.status_code = status_code;
  return e;
}

// ── Categories ──────────────────────────────────────────────────────────────

export async function list_categories({ include_inactive } = {}) {
  return prisma.hr_document_categories.findMany({
    where: include_inactive ? {} : { is_active: true },
    orderBy: { sort_order: 'asc' },
    include: { _count: { select: { document_types: true, templates: true } } },
  });
}

export async function create_category(data) {
  return prisma.hr_document_categories.create({ data });
}

export async function update_category(id, data) {
  const existing = await prisma.hr_document_categories.findUnique({ where: { id } });
  if (!existing) throw app_error('Category not found', 404);
  return prisma.hr_document_categories.update({ where: { id }, data });
}

// ── Document Types ──────────────────────────────────────────────────────────

export async function list_types({ category_id, include_inactive } = {}) {
  const where = include_inactive ? {} : { is_active: true };
  if (category_id) where.category_id = category_id;
  return prisma.hr_document_types.findMany({
    where,
    orderBy: { sort_order: 'asc' },
    include: { category: { select: { id: true, name: true, code: true } }, _count: { select: { templates: true } } },
  });
}

export async function create_type(data) {
  return prisma.hr_document_types.create({ data });
}

export async function update_type(id, data) {
  const existing = await prisma.hr_document_types.findUnique({ where: { id } });
  if (!existing) throw app_error('Document type not found', 404);
  return prisma.hr_document_types.update({ where: { id }, data });
}

// ── Templates (+ versioning) ─────────────────────────────────────────────────

const TEMPLATE_INCLUDE = {
  category: { select: { id: true, name: true, code: true } },
  type: { select: { id: true, name: true, code: true } },
  current_version: true,
};

export async function list_templates({ category_id, type_id, include_inactive } = {}) {
  const where = include_inactive ? {} : { is_active: true };
  if (category_id) where.category_id = category_id;
  if (type_id) where.type_id = type_id;
  return prisma.hr_document_templates.findMany({ where, orderBy: { created_at: 'desc' }, include: TEMPLATE_INCLUDE });
}

export async function get_template(id) {
  const template = await prisma.hr_document_templates.findUnique({ where: { id }, include: TEMPLATE_INCLUDE });
  if (!template) throw app_error('Template not found', 404);
  return template;
}

export async function list_template_versions(template_id) {
  return prisma.hr_document_template_versions.findMany({ where: { template_id }, orderBy: { version: 'desc' } });
}

// Creates the template row AND its first version (version 1) atomically.
export async function create_template({ category_id, type_id, name, content, placeholders, created_by }) {
  return prisma.$transaction(async (tx) => {
    const template = await tx.hr_document_templates.create({
      data: { category_id, type_id, name, created_by },
    });
    const version = await tx.hr_document_template_versions.create({
      data: { template_id: template.id, version: 1, content, placeholders: placeholders || [], created_by },
    });
    return tx.hr_document_templates.update({
      where: { id: template.id },
      data: { current_version_id: version.id },
      include: TEMPLATE_INCLUDE,
    });
  });
}

// Editing content NEVER mutates an existing version — it always creates a
// new one and repoints current_version_id. Renaming/activating a template
// (no content change) is a plain in-place update, no new version needed.
export async function update_template(id, { name, is_active, content, placeholders, created_by }) {
  const template = await prisma.hr_document_templates.findUnique({ where: { id } });
  if (!template) throw app_error('Template not found', 404);

  const meta_data = {};
  if (name !== undefined) meta_data.name = name;
  if (is_active !== undefined) meta_data.is_active = is_active;

  if (content === undefined) {
    if (Object.keys(meta_data).length === 0) return get_template(id);
    return prisma.hr_document_templates.update({ where: { id }, data: meta_data, include: TEMPLATE_INCLUDE });
  }

  return prisma.$transaction(async (tx) => {
    const latest = await tx.hr_document_template_versions.findFirst({
      where: { template_id: id },
      orderBy: { version: 'desc' },
    });
    const next_version = (latest?.version || 0) + 1;
    const version = await tx.hr_document_template_versions.create({
      data: { template_id: id, version: next_version, content, placeholders: placeholders || [], created_by },
    });
    return tx.hr_document_templates.update({
      where: { id },
      data: { ...meta_data, current_version_id: version.id },
      include: TEMPLATE_INCLUDE,
    });
  });
}

// ── Documents ────────────────────────────────────────────────────────────────

const DOCUMENT_LIST_INCLUDE = {
  user: { select: { id: true, first_name: true, last_name: true, email: true, avatar: true } },
  category: { select: { id: true, name: true, code: true } },
  type: { select: { id: true, name: true, code: true } },
};

const DOCUMENT_DETAIL_INCLUDE = {
  ...DOCUMENT_LIST_INCLUDE,
  template: { select: { id: true, name: true } },
  template_version: { select: { id: true, version: true } },
  signatures: true,
  previous_document: { select: { id: true, title: true, created_at: true } },
  renewals: { select: { id: true, title: true, status: true, created_at: true } },
};

export async function list_documents({ user_id, category_id, type_id, status, page = 1, limit = 20 } = {}) {
  page = +page || 1; limit = +limit || 20;
  const where = {};
  if (user_id) where.user_id = user_id;
  if (category_id) where.category_id = category_id;
  if (type_id) where.type_id = type_id;
  if (status) where.status = status;
  const [total, records] = await Promise.all([
    prisma.hr_documents.count({ where }),
    prisma.hr_documents.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { created_at: 'desc' }, include: DOCUMENT_LIST_INCLUDE,
    }),
  ]);
  return { records, total, page, limit };
}

export async function get_document(id) {
  const doc = await prisma.hr_documents.findUnique({ where: { id }, include: DOCUMENT_DETAIL_INCLUDE });
  if (!doc) throw app_error('Document not found', 404);
  return doc;
}

// Generated documents are immutable content-wise from here on — this is the
// only place a hr_documents row's content/template_version_id are ever set.
export async function create_document(data) {
  return prisma.hr_documents.create({ data, include: DOCUMENT_DETAIL_INCLUDE });
}

// Status-only transitions — never touches content/template_version_id.
export async function update_document_status(id, data) {
  const existing = await prisma.hr_documents.findUnique({ where: { id } });
  if (!existing) throw app_error('Document not found', 404);
  return prisma.hr_documents.update({ where: { id }, data, include: DOCUMENT_DETAIL_INCLUDE });
}

export async function set_document_file_key(id, file_key) {
  return prisma.hr_documents.update({ where: { id }, data: { file_key }, include: DOCUMENT_DETAIL_INCLUDE });
}

// ── Signatures ───────────────────────────────────────────────────────────────

export async function create_signature(data) {
  return prisma.hr_document_signatures.create({ data });
}

export async function find_signature(document_id, signer_role) {
  return prisma.hr_document_signatures.findFirst({ where: { document_id, signer_role } });
}

export async function mark_signature_signed(id, { signature_data, ip_address }) {
  return prisma.hr_document_signatures.update({
    where: { id },
    data: { signature_data, signed_at: new Date(), ip_address },
  });
}
