const VALID_NOTIFY_TARGETS = ['ASSIGNEE', 'SUPERVISOR', 'ADMIN'];

export function validate_escalation_policy(data, { partial = false } = {}) {
  const { key, label, stages, is_active } = data;

  if (!partial || key !== undefined) {
    if (!key || typeof key !== 'string') return { valid: false, message: 'key is required' };
  }
  if (!partial || label !== undefined) {
    if (!label || typeof label !== 'string') return { valid: false, message: 'label is required' };
  }
  if (!partial || stages !== undefined) {
    if (!Array.isArray(stages) || stages.length === 0) {
      return { valid: false, message: 'stages must be a non-empty array' };
    }
    for (const stage of stages) {
      if (typeof stage.day_threshold !== 'number' || stage.day_threshold < 0) {
        return { valid: false, message: 'each stage requires a non-negative numeric day_threshold' };
      }
      if (!Array.isArray(stage.notify) || stage.notify.length === 0) {
        return { valid: false, message: 'each stage requires a non-empty notify array' };
      }
      if (stage.notify.some((n) => !VALID_NOTIFY_TARGETS.includes(n))) {
        return { valid: false, message: `notify values must be one of: ${VALID_NOTIFY_TARGETS.join(', ')}` };
      }
    }
  }
  if (is_active !== undefined && typeof is_active !== 'boolean') {
    return { valid: false, message: 'is_active must be a boolean' };
  }

  return { valid: true };
}
