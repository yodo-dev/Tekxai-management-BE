export const ALLOCATION_METHODS = ['TIME_SHARE', 'FIXED_SHARE', 'HEADCOUNT_SHARE'];
export const REVENUE_SOURCE_TYPES = ['INVOICE', 'RETAINER_ALLOCATION', 'MANUAL_ESTIMATE'];

export function validate_business_unit_rule(body) {
  if (!body?.business_unit?.trim()) return { valid: false, message: 'business_unit is required' };
  if (body.default_allocation_method !== undefined && !ALLOCATION_METHODS.includes(body.default_allocation_method)) {
    return { valid: false, message: `default_allocation_method must be one of ${ALLOCATION_METHODS.join(', ')}` };
  }
  if (body.revenue_source_type !== undefined && !REVENUE_SOURCE_TYPES.includes(body.revenue_source_type)) {
    return { valid: false, message: `revenue_source_type must be one of ${REVENUE_SOURCE_TYPES.join(', ')}` };
  }
  return { valid: true };
}
