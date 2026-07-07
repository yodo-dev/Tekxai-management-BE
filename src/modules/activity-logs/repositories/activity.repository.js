import prisma from '../../../shared/database/client.js';
export async function log_activity({ user_id, action, entity_type, entity_id, description, ip_address, user_agent }) {
  return prisma.activity_logs.create({ data: { user_id, action, entity_type, entity_id, description, ip_address, user_agent } });
}
export async function find_activity_logs({ user_id, action, entity_type, entity_id, page=1, limit=20, start_date, end_date }={}) {
  page = +page || 1; limit = +limit || 20;
  const skip=(page-1)*limit; const where={};
  if(user_id) where.user_id=user_id; if(action) where.action=action;
  if(entity_type) where.entity_type=entity_type; if(entity_id) where.entity_id=entity_id;
  if(start_date||end_date){ where.created_at={}; if(start_date) where.created_at.gte=new Date(start_date); if(end_date) where.created_at.lte=new Date(end_date); }
  const [total,records]=await Promise.all([prisma.activity_logs.count({where}),prisma.activity_logs.findMany({where,skip,take:limit,orderBy:{created_at:'desc'},include:{user:{select:{id:true,first_name:true,last_name:true}}}})]);
  return {records,total,page,limit};
}
