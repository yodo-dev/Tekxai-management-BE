export function validate_category(body) {
  if (!body?.code?.trim()) return { valid: false, message: 'Category code required' };
  if (!body?.name?.trim()) return { valid: false, message: 'Category name required' };
  return { valid: true };
}

export function validate_type(body) {
  if (!body?.category_id?.trim()) return { valid: false, message: 'category_id required' };
  if (!body?.code?.trim()) return { valid: false, message: 'Document type code required' };
  if (!body?.name?.trim()) return { valid: false, message: 'Document type name required' };
  return { valid: true };
}

export function validate_template(body) {
  if (!body?.category_id?.trim()) return { valid: false, message: 'category_id required' };
  if (!body?.type_id?.trim()) return { valid: false, message: 'type_id required' };
  if (!body?.name?.trim()) return { valid: false, message: 'Template name required' };
  if (!body?.content?.trim()) return { valid: false, message: 'Template content required' };
  return { valid: true };
}

export function validate_generate(body) {
  if (!body?.user_id?.trim()) return { valid: false, message: 'user_id required' };
  if (!body?.category_id?.trim()) return { valid: false, message: 'category_id required' };
  if (!body?.type_id?.trim()) return { valid: false, message: 'type_id required' };
  if (!body?.template_id && !body?.raw_content?.trim()) {
    return { valid: false, message: 'Either template_id or raw_content is required' };
  }
  return { valid: true };
}
