import prisma from '../../../shared/database/client.js';

export const DOC_TYPES = [
  'CNIC', 'RESUME', 'OFFER_LETTER', 'CONTRACT', 'NDA',
  'EDUCATIONAL', 'EXPERIENCE_LETTER', 'SALARY_REVISION',
  'WARNING_LETTER', 'RESIGNATION', 'CLEARANCE', 'OTHER',
];

export async function list_employee_docs(user_id) {
  return prisma.employee_documents.findMany({
    take: 500,
    where: { user_id },
    orderBy: { created_at: 'desc' },
  });
}

export async function create_employee_doc(user_id, { document_type, title, file_key, file_url, notes }, uploaded_by) {
  return prisma.employee_documents.create({
    data: { user_id, document_type: document_type || 'OTHER', title, file_key, file_url, notes, uploaded_by },
  });
}

export async function update_employee_doc(id, user_id, data) {
  return prisma.employee_documents.updateMany({
    where: { id, user_id },
    data: { title: data.title, document_type: data.document_type, file_key: data.file_key, file_url: data.file_url, notes: data.notes },
  });
}

export async function delete_employee_doc(id, user_id) {
  return prisma.employee_documents.deleteMany({ where: { id, user_id } });
}
