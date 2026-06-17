export function validate_score(body) {
  if (!body?.user_id?.trim()) return { valid: false, message: 'user_id required' };
  if (!body?.period?.trim()) return { valid: false, message: 'period required' };
  return { valid: true };
}

export function validate_daily_report(body) {
  if (!body?.todays_progress?.trim()) return { valid: false, message: "todays_progress required" };
  return { valid: true };
}
