export const FEEDS_LAYERS = ['REVENUE', 'VALUE', 'COST_ONLY'];

export function validate_business_activity(body) {
  if (!body?.name?.trim()) return { valid: false, message: 'Business Activity name required' };
  if (body.feeds_layer !== undefined && !FEEDS_LAYERS.includes(body.feeds_layer)) {
    return { valid: false, message: `feeds_layer must be one of ${FEEDS_LAYERS.join(', ')}` };
  }
  return { valid: true };
}
