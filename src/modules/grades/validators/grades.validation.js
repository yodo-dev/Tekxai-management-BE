export function validate_grade(body) {
  if (!body?.name?.trim()) return { valid: false, message: 'Grade name required' };
  if (body.level === undefined || body.level === null || Number.isNaN(+body.level)) {
    return { valid: false, message: 'Grade level (numeric rank) required' };
  }
  return { valid: true };
}
