export const MILESTONE_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'];

function is_valid_date(value) {
  return !isNaN(new Date(value).getTime());
}

function validate_dates(body) {
  if (body.estimated_start !== undefined && body.estimated_start !== null && !is_valid_date(body.estimated_start)) {
    return { valid: false, message: 'estimated_start must be a valid date' };
  }
  if (body.estimated_end !== undefined && body.estimated_end !== null && !is_valid_date(body.estimated_end)) {
    return { valid: false, message: 'estimated_end must be a valid date' };
  }
  if (body.due_date !== undefined && body.due_date !== null && !is_valid_date(body.due_date)) {
    return { valid: false, message: 'due_date must be a valid date' };
  }
  if (body.estimated_start && body.estimated_end && new Date(body.estimated_end) < new Date(body.estimated_start)) {
    return { valid: false, message: 'estimated_end cannot be before estimated_start' };
  }
  return { valid: true };
}

function validate_progress(body) {
  if (body.progress_percent === undefined || body.progress_percent === null) return { valid: true };
  const n = +body.progress_percent;
  if (Number.isNaN(n) || n < 0 || n > 100) {
    return { valid: false, message: 'progress_percent must be a number between 0 and 100' };
  }
  return { valid: true };
}

function validate_sequence(body) {
  if (body.sequence === undefined || body.sequence === null || body.sequence === '') return { valid: true };
  const n = +body.sequence;
  if (!Number.isInteger(n) || n < 1) {
    return { valid: false, message: 'sequence must be a positive integer' };
  }
  return { valid: true };
}

export function validate_create_milestone(body) {
  if (!body?.title?.trim()) return { valid: false, message: 'title is required' };
  if (body.status !== undefined && !MILESTONE_STATUSES.includes(body.status)) {
    return { valid: false, message: `status must be one of ${MILESTONE_STATUSES.join(', ')}` };
  }
  const dates = validate_dates(body);
  if (!dates.valid) return dates;
  const progress = validate_progress(body);
  if (!progress.valid) return progress;
  const sequence = validate_sequence(body);
  if (!sequence.valid) return sequence;
  return { valid: true };
}

export function validate_update_milestone(body) {
  if (body.title !== undefined && !body.title?.trim()) return { valid: false, message: 'title cannot be empty' };
  if (body.status !== undefined && !MILESTONE_STATUSES.includes(body.status)) {
    return { valid: false, message: `status must be one of ${MILESTONE_STATUSES.join(', ')}` };
  }
  const dates = validate_dates(body);
  if (!dates.valid) return dates;
  const progress = validate_progress(body);
  if (!progress.valid) return progress;
  const sequence = validate_sequence(body);
  if (!sequence.valid) return sequence;
  return { valid: true };
}
