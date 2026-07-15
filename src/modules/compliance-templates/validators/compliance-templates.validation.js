function is_valid_items(items) {
  return Array.isArray(items) && items.length > 0 &&
    items.every((i) => i && typeof i.category_id === 'string' && Number.isFinite(+i.required_quantity) && +i.required_quantity >= 0);
}

export function validate_compliance_template(body, { is_new_version = false } = {}) {
  if (!is_new_version) {
    if (!body?.key?.trim()) return { valid: false, message: 'key is required' };
    if (!body?.label?.trim()) return { valid: false, message: 'label is required' };
  }
  if (!is_new_version || body.items !== undefined) {
    if (!is_valid_items(body.items)) {
      return { valid: false, message: 'items must be a non-empty array of { category_id, required_quantity }' };
    }
  }
  return { valid: true };
}

export function validate_apply_template(body) {
  if (!body?.location_id?.trim()) return { valid: false, message: 'location_id is required' };
  return { valid: true };
}
