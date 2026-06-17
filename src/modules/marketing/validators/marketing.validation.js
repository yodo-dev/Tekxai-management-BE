export function validate_deal(body) {
  if (!body?.lead_job?.trim()) return { valid: false, message: 'lead_job required' };
  if (!body?.source?.trim()) return { valid: false, message: 'source required' };
  return { valid: true };
}
