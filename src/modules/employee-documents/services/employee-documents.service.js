import prisma from '../../../shared/database/client.js';
import { delete_file } from '../../storage/storage.service.js';

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

// When a document is replaced with a new file, the old object would
// otherwise sit in S3/disk forever with nothing referencing it — delete it
// once the DB row points at the new one.
export async function update_employee_doc(id, user_id, data) {
  const existing = await prisma.employee_documents.findFirst({ where: { id, user_id } });
  const result = await prisma.employee_documents.updateMany({
    where: { id, user_id },
    data: { title: data.title, document_type: data.document_type, file_key: data.file_key, file_url: data.file_url, notes: data.notes },
  });
  if (existing?.file_key && data.file_key && existing.file_key !== data.file_key) {
    await delete_file(existing.file_key).catch(() => {});
  }
  return result;
}

export async function delete_employee_doc(id, user_id) {
  const existing = await prisma.employee_documents.findFirst({ where: { id, user_id } });
  const result = await prisma.employee_documents.deleteMany({ where: { id, user_id } });
  if (existing?.file_key) await delete_file(existing.file_key).catch(() => {});
  return result;
}
