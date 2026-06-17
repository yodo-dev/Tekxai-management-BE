export function validate_create_project(body) {
  if (!body?.title?.trim()) return { valid: false, message: 'Project title required' };
  return { valid: true };
}
