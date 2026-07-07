export const COMM_CHANNELS = ['EMAIL', 'CLICKUP', 'SLACK', 'TEAMS', 'WHATSAPP', 'GOOGLE_MEET', 'ZOOM', 'OTHER'];
export const ACCESS_STATUSES = ['GRANTED', 'PENDING', 'NOT_APPLICABLE'];
export const AWS_ACCESS_STATUSES = ['GRANTED', 'PENDING', 'LIMITED', 'NOT_APPLICABLE'];
export const PROGRESS_SHARED_STATUSES = ['NOT_SHARED', 'SHARED', 'AWAITING_FEEDBACK', 'CLIENT_APPROVED'];

export function validate_devops_access(body) {
  if (body.point_of_communication !== undefined && !COMM_CHANNELS.includes(body.point_of_communication)) {
    return { valid: false, message: `point_of_communication must be one of ${COMM_CHANNELS.join(', ')}` };
  }
  for (const field of ['git_access_status', 'server_access_status', 'domain_access_status', 'email_smtp_access_status']) {
    if (body[field] !== undefined && !ACCESS_STATUSES.includes(body[field])) {
      return { valid: false, message: `${field} must be one of ${ACCESS_STATUSES.join(', ')}` };
    }
  }
  if (body.aws_access_status !== undefined && !AWS_ACCESS_STATUSES.includes(body.aws_access_status)) {
    return { valid: false, message: `aws_access_status must be one of ${AWS_ACCESS_STATUSES.join(', ')}` };
  }
  if (body.progress_shared_status !== undefined && !PROGRESS_SHARED_STATUSES.includes(body.progress_shared_status)) {
    return { valid: false, message: `progress_shared_status must be one of ${PROGRESS_SHARED_STATUSES.join(', ')}` };
  }
  return { valid: true };
}
