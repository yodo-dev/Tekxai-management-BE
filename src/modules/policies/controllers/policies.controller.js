import prisma from '../../../shared/database/client.js';
function ok(res,p,m='OK',s=200){return res.status(s).json({success:true,message:m,payload:p});}
function fail(res,m,s=400){return res.status(s).json({success:false,message:m});}

export async function list_policies(req,res,next){try{const is_admin=req.user.roles.some(r=>['ADMIN','SUPER_ADMIN','HR'].includes(r));const where=is_admin?{}:{is_published:true};const policies=await prisma.company_policies.findMany({
  take: 500,where,orderBy:{created_at:'desc'}});return ok(res,{records:policies,total:policies.length});}catch(e){next(e);}}
export async function get_policy(req,res,next){try{const p=await prisma.company_policies.findFirst({where:{id:req.params.id},include:{acknowledgements:{where:{user_id:req.user.id}}}});if(!p)return fail(res,'Not found',404);return ok(res,{...p,acknowledged:p.acknowledgements.length>0});}catch(e){next(e);}}
export async function create_policy(req,res,next){try{const{title,category,content,version,is_mandatory}=req.body;if(!title||!content)return fail(res,'title and content required');const p=await prisma.company_policies.create({data:{title,category:category||'GENERAL',content,version:version||'1.0',is_mandatory:is_mandatory!==false,created_by:req.user.id}});return ok(res,p,'Policy created',201);}catch(e){next(e);}}
export async function update_policy(req,res,next){try{const p=await prisma.company_policies.update({where:{id:req.params.id},data:req.body});return ok(res,p,'Policy updated');}catch(e){next(e);}}
export async function publish_policy(req,res,next){try{const p=await prisma.company_policies.update({where:{id:req.params.id},data:{is_published:true,published_at:new Date()}});return ok(res,p,'Policy published');}catch(e){next(e);}}
export async function acknowledge_policy(req,res,next){try{const ack=await prisma.policy_acknowledgements.upsert({where:{user_id_policy_id:{user_id:req.user.id,policy_id:req.params.id}},update:{acknowledged_at:new Date(),ip_address:req.ip},create:{user_id:req.user.id,policy_id:req.params.id,ip_address:req.ip}});return ok(res,ack,'Acknowledged');}catch(e){next(e);}}
export async function my_acknowledgements(req,res,next){try{const acks=await prisma.policy_acknowledgements.findMany({
  take: 500,where:{user_id:req.user.id},include:{policy:true}});return ok(res,acks);}catch(e){next(e);}}
