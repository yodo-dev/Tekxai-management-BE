import { expire_overdue_documents } from '../../hr-documents/services/hr-documents.service.js';

// Flips SENT/VIEWED HR documents whose valid_until has passed to EXPIRED.
export async function run_hr_documents_expiry_job() {
  return expire_overdue_documents();
}
