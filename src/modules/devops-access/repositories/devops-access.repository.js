import prisma from '../../../shared/database/client.js';

const DEFAULTS = {
  point_of_communication: 'EMAIL',
  progress_shared_to_client: false,
  progress_shared_status: 'NOT_SHARED',
  progress_shared_date: null,
  git_access_status: 'NOT_APPLICABLE',
  server_access_status: 'NOT_APPLICABLE',
  domain_access_status: 'NOT_APPLICABLE',
  email_smtp_access_status: 'NOT_APPLICABLE',
  aws_access_status: 'NOT_APPLICABLE',
  devops_remarks: null,
  git_provider: null,
  git_repo_url: null,
  git_organization: null,
  git_default_branch: null,
  hosting_provider: null,
  hosting_environment: null,
  hosting_server: null,
  hosting_region: null,
  domain_name: null,
  domain_dns_provider: null,
  domain_ssl_status: null,
  domain_expiry_date: null,
  database_provider: null,
  database_version: null,
  database_backup_status: null,
  storage_provider: null,
  cdn_provider: null,
  smtp_provider: null,
  third_party_services: null,
  api_keys_status: 'NOT_APPLICABLE',
  point_of_contact: null,
  credentials_verified_date: null,
};

const PASSTHROUGH_STRING_FIELDS = [
  'git_provider', 'git_repo_url', 'git_organization', 'git_default_branch',
  'hosting_provider', 'hosting_environment', 'hosting_server', 'hosting_region',
  'domain_name', 'domain_dns_provider', 'domain_ssl_status',
  'database_provider', 'database_version', 'database_backup_status',
  'storage_provider', 'cdn_provider', 'smtp_provider', 'third_party_services',
  'api_keys_status', 'point_of_contact',
];
const PASSTHROUGH_DATE_FIELDS = ['domain_expiry_date', 'credentials_verified_date'];

// Access fields that count toward the "access completion score" (out of 6).
export const ACCESS_SCORE_FIELDS = [
  'git_access_status', 'server_access_status', 'domain_access_status',
  'email_smtp_access_status', 'aws_access_status',
];

export async function find_devops_access_by_project(project_id) {
  const record = await prisma.devops_access_tracking.findUnique({ where: { project_id } });
  if (record) return record;
  return { id: null, project_id, ...DEFAULTS, created_at: null, updated_at: null };
}

export async function upsert_devops_access(project_id, data) {
  const {
    point_of_communication, progress_shared_to_client, progress_shared_status, progress_shared_date,
    git_access_status, server_access_status, domain_access_status,
    email_smtp_access_status, aws_access_status, devops_remarks,
  } = data;

  const payload = {};
  if (point_of_communication !== undefined) payload.point_of_communication = point_of_communication;
  if (progress_shared_status !== undefined) {
    payload.progress_shared_status = progress_shared_status;
    // Keep the legacy boolean in sync so older consumers of progress_shared_to_client still work.
    payload.progress_shared_to_client = progress_shared_status !== 'NOT_SHARED';
  } else if (progress_shared_to_client !== undefined) {
    payload.progress_shared_to_client = Boolean(progress_shared_to_client);
    payload.progress_shared_status = progress_shared_to_client ? 'SHARED' : 'NOT_SHARED';
  }
  if (progress_shared_date !== undefined) payload.progress_shared_date = progress_shared_date ? new Date(progress_shared_date) : null;
  if (git_access_status !== undefined) payload.git_access_status = git_access_status;
  if (server_access_status !== undefined) payload.server_access_status = server_access_status;
  if (domain_access_status !== undefined) payload.domain_access_status = domain_access_status;
  if (email_smtp_access_status !== undefined) payload.email_smtp_access_status = email_smtp_access_status;
  if (aws_access_status !== undefined) payload.aws_access_status = aws_access_status;
  if (devops_remarks !== undefined) payload.devops_remarks = devops_remarks?.trim() || null;

  for (const field of PASSTHROUGH_STRING_FIELDS) {
    if (data[field] !== undefined) payload[field] = data[field]?.trim?.() || data[field] || null;
  }
  for (const field of PASSTHROUGH_DATE_FIELDS) {
    if (data[field] !== undefined) payload[field] = data[field] ? new Date(data[field]) : null;
  }

  return prisma.devops_access_tracking.upsert({
    where: { project_id },
    update: payload,
    create: { project_id, ...DEFAULTS, ...payload },
  });
}

export function compute_access_completion_score(record) {
  if (!record) return { granted: 0, total: ACCESS_SCORE_FIELDS.length, percent: 0 };
  const granted = ACCESS_SCORE_FIELDS.filter((f) => record[f] === 'GRANTED').length;
  return { granted, total: ACCESS_SCORE_FIELDS.length, percent: Math.round((granted / ACCESS_SCORE_FIELDS.length) * 100) };
}
