export function validate_team(body) {
  if (!body?.name?.trim()) return { valid: false, message: 'Team name required' };
  return { valid: true };
}
