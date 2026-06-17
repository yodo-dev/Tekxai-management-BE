export function validate_asset(body) {
  if (!body?.name?.trim()) return { valid: false, message: 'Asset name required' };
  if (!body?.category_id?.trim()) return { valid: false, message: 'Category required' };
  return { valid: true };
}

export function validate_assignment(body) {
  if (!body?.user_id?.trim()) return { valid: false, message: 'user_id required' };
  return { valid: true };
}
