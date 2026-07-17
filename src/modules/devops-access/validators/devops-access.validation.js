export const COMM_CHANNELS = ['EMAIL', 'CLICKUP', 'SLACK', 'TEAMS', 'WHATSAPP', 'GOOGLE_MEET', 'ZOOM', 'OTHER'];
export const ACCESS_STATUSES = ['GRANTED', 'PENDING', 'NOT_APPLICABLE'];
export const AWS_ACCESS_STATUSES = ['GRANTED', 'PENDING', 'LIMITED', 'NOT_APPLICABLE'];
export const PROGRESS_SHARED_STATUSES = ['NOT_SHARED', 'SHARED', 'AWAITING_FEEDBACK', 'CLIENT_APPROVED'];
export const HOSTING_ENVIRONMENTS = ['PRODUCTION', 'STAGING', 'DEVELOPMENT'];
export const DOMAIN_SSL_STATUSES = ['ACTIVE', 'EXPIRING', 'EXPIRED', 'NOT_CONFIGURED'];
export const DATABASE_BACKUP_STATUSES = ['ENABLED', 'DISABLED', 'UNKNOWN'];
export const API_KEYS_STATUSES = ['GRANTED', 'PENDING', 'NOT_APPLICABLE'];

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
  if (body.hosting_environment !== undefined && body.hosting_environment !== null && !HOSTING_ENVIRONMENTS.includes(body.hosting_environment)) {
    return { valid: false, message: `hosting_environment must be one of ${HOSTING_ENVIRONMENTS.join(', ')}` };
  }
  if (body.domain_ssl_status !== undefined && body.domain_ssl_status !== null && !DOMAIN_SSL_STATUSES.includes(body.domain_ssl_status)) {
    return { valid: false, message: `domain_ssl_status must be one of ${DOMAIN_SSL_STATUSES.join(', ')}` };
  }
  if (body.database_backup_status !== undefined && body.database_backup_status !== null && !DATABASE_BACKUP_STATUSES.includes(body.database_backup_status)) {
    return { valid: false, message: `database_backup_status must be one of ${DATABASE_BACKUP_STATUSES.join(', ')}` };
  }
  if (body.api_keys_status !== undefined && !API_KEYS_STATUSES.includes(body.api_keys_status)) {
    return { valid: false, message: `api_keys_status must be one of ${API_KEYS_STATUSES.join(', ')}` };
  }
  return { valid: true };
}
