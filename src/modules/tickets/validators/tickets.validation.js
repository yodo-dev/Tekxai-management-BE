export const TICKET_CATEGORIES = ['IT', 'HR', 'FINANCE', 'ADMIN', 'OTHER'];

export function validate_ticket(body) {
  if (!body?.subject?.trim()) return { valid: false, message: 'Subject required' };
  if (!body?.description?.trim()) return { valid: false, message: 'Description required' };

  // Service Desk path: a ticket_type_id is provided, so recipient_role/category are
  // derived server-side from the type — only subject/description are required here.
  if (body.ticket_type_id) return { valid: true };

  // Legacy path — unchanged validation.
  if (!body?.recipient_role?.trim()) return { valid: false, message: 'Recipient role required' };
  if (body.category !== undefined && body.category !== null && !TICKET_CATEGORIES.includes(body.category)) {
    return { valid: false, message: `category must be one of ${TICKET_CATEGORIES.join(', ')}` };
  }
  return { valid: true };
}
