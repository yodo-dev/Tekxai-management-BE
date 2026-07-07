import prisma from '../../../shared/database/client.js';

export const DOC_TYPES = ['CONTRACT', 'SCOPE', 'PROPOSAL', 'SOW', 'WIREFRAME', 'ARCHITECTURE', 'MEETING_NOTES', 'OTHER'];

export async function list_project_docs(project_id) {
  return prisma.project_documents.findMany({
    take: 500,
    where: { project_id },
    orderBy: { created_at: 'desc' },
    include: { uploader: { select: { id: true, first_name: true, last_name: true, avatar: true } } },
  });
}

export async function create_project_doc(project_id, { document_type, title, file_key, file_url, notes }, uploaded_by) {
  return prisma.project_documents.create({
    data: { project_id, document_type: document_type || 'OTHER', title, file_key, file_url, notes, uploaded_by },
  });
}

export async function find_project_doc(id, project_id) {
  return prisma.project_documents.findFirst({ where: { id, project_id } });
}

export async function delete_project_doc(id, project_id) {
  return prisma.project_documents.deleteMany({ where: { id, project_id } });
}
