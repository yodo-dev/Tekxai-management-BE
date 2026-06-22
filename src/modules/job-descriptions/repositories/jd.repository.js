import prisma from '../../../shared/database/client.js';
export async function get_jd(user_id) { return prisma.job_descriptions.findFirst({ where: { user_id } }); }
export async function upsert_jd(user_id, data, created_by) {
  const { title, summary, responsibilities, qualifications, kpi_targets, employment_type } = data;
  return prisma.job_descriptions.upsert({ where: { user_id }, update: { title, summary, responsibilities, qualifications, kpi_targets, employment_type }, create: { user_id, created_by, title, summary, responsibilities, qualifications, kpi_targets, employment_type: employment_type || 'FULL_TIME' } });
}
