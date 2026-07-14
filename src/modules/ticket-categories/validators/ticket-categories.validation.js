export function validate_ticket_category(body) {
  if (!body?.key?.trim()) return { valid: false, message: 'key is required' };
  if (!body?.label?.trim()) return { valid: false, message: 'label is required' };
  return { valid: true };
}
