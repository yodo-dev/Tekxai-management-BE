import prisma from '../../../shared/database/client.js';
import { nanoid } from '../../../shared/utils/nanoid.js';
function ok(res,p,m='OK',s=200){return res.status(s).json({success:true,message:m,payload:p});}
function fail(res,m,s=400){return res.status(s).json({success:false,message:m});}

export async function list_clients(req,res,next){try{const clients=await prisma.client_accounts.findMany({orderBy:{name:'asc'},take:500,include:{project_access:{select:{project_id:true}}}});return ok(res,{records:clients,total:clients.length});}catch(e){next(e);}}
export async function create_client(req,res,next){try{const{name,email,phone,company}=req.body;if(!name)return fail(res,'name required');const c=await prisma.client_accounts.create({data:{name,email,phone,company,invite_token:nanoid(32),created_by:req.user.id}});return ok(res,c,'Client created',201);}catch(e){next(e);}}
export async function get_client(req,res,next){try{const c=await prisma.client_accounts.findFirst({where:{id:req.params.id},include:{project_access:{select:{project_id:true,access_level:true}}}});if(!c)return fail(res,'Not found',404);return ok(res,c);}catch(e){next(e);}}
export async function grant_project_access(req,res,next){try{const{project_id,access_level}=req.body;if(!project_id)return fail(res,'project_id required');const a=await prisma.client_project_access.upsert({where:{client_id_project_id:{client_id:req.params.id,project_id}},update:{access_level:access_level||'VIEWER'},create:{client_id:req.params.id,project_id,access_level:access_level||'VIEWER'}});return ok(res,a,'Access granted');}catch(e){next(e);}}
export async function list_client_projects(req,res,next){try{const accesses=await prisma.client_project_access.findMany({
  take: 500,where:{client_id:req.params.id},include:{project:{select:{id:true,title:true,status:true,progress:true,end_date:true}}}});return ok(res,accesses);}catch(e){next(e);}}
