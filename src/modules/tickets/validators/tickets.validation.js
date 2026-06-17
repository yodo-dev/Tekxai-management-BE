export function validate_ticket(body) {
  if (!body?.subject?.trim()) return { valid: false, message: 'Subject required' };
  if (!body?.description?.trim()) return { valid: false, message: 'Description required' };
  if (!body?.recipient_role?.trim()) return { valid: false, message: 'Recipient role required' };
  return { valid: true };
}
