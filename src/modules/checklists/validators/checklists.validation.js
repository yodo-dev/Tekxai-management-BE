function is_valid_items(items) {
  return Array.isArray(items) && items.length > 0 && items.every((i) => i && typeof i.key === 'string' && typeof i.label === 'string');
}

export function validate_checklist_template(body, { is_update = false } = {}) {
  if (!is_update) {
    if (!body?.key?.trim()) return { valid: false, message: 'key is required' };
    if (!body?.label?.trim()) return { valid: false, message: 'label is required' };
  }
  if (!is_update && !is_valid_items(body.items)) {
    return { valid: false, message: 'items must be a non-empty array of { key, label }' };
  }
  if (is_update && body.items !== undefined && !is_valid_items(body.items)) {
    return { valid: false, message: 'items must be a non-empty array of { key, label }' };
  }
  return { valid: true };
}

export function validate_checklist_result(body) {
  if (!body?.entity_type?.trim()) return { valid: false, message: 'entity_type is required' };
  if (!body?.entity_id?.trim()) return { valid: false, message: 'entity_id is required' };
  if (!body?.template_id?.trim()) return { valid: false, message: 'template_id is required' };
  if (body.results !== undefined && (typeof body.results !== 'object' || Array.isArray(body.results))) {
    return { valid: false, message: 'results must be an object of { item_key: value }' };
  }
  return { valid: true };
}
