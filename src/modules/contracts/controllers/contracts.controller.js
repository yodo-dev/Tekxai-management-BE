import prisma from '../../../shared/database/client.js';
function ok(res,p,m='OK',s=200){return res.status(s).json({success:true,message:m,payload:p});}
function fail(res,m,s=400){return res.status(s).json({success:false,message:m});}

// Templates
export async function list_templates(req,res,next){try{const t=await prisma.contract_templates.findMany({where:{is_active:true},orderBy:{name:'asc'}});return ok(res,t);}catch(e){next(e);}}
export async function create_template(req,res,next){try{const{name,type,content,placeholders}=req.body;if(!name||!content)return fail(res,'name and content required');const t=await prisma.contract_templates.create({data:{name,type:type||'EMPLOYMENT',content,placeholders:placeholders||[],created_by:req.user.id}});return ok(res,t,'Template created',201);}catch(e){next(e);}}
export async function update_template(req,res,next){try{const t=await prisma.contract_templates.update({where:{id:req.params.id},data:req.body});return ok(res,t,'Template updated');}catch(e){next(e);}}

// Contracts
export async function list_contracts(req,res,next){try{const is_admin=req.user.roles.some(r=>['ADMIN','SUPER_ADMIN','HR'].includes(r));const where=is_admin?(req.query.user_id?{user_id:req.query.user_id}:{}):{user_id:req.user.id};const contracts=await prisma.contracts.findMany({where,orderBy:{created_at:'desc'},include:{user:{select:{id:true,first_name:true,last_name:true}},template:{select:{name:true}}}});return ok(res,{records:contracts,total:contracts.length});}catch(e){next(e);}}
export async function get_contract(req,res,next){try{const c=await prisma.contracts.findFirst({where:{id:req.params.id}});if(!c)return fail(res,'Not found',404);return ok(res,c);}catch(e){next(e);}}
export async function create_contract(req,res,next){try{const{user_id,title,content,type,template_id,valid_from,valid_until}=req.body;if(!user_id||!title||!content)return fail(res,'user_id, title and content required');const c=await prisma.contracts.create({data:{user_id,title,content,type:type||'EMPLOYMENT',template_id,valid_from:valid_from?new Date(valid_from):null,valid_until:valid_until?new Date(valid_until):null,status:'DRAFT',created_by:req.user.id}});return ok(res,c,'Contract created',201);}catch(e){next(e);}}
export async function update_contract(req,res,next){try{const c=await prisma.contracts.update({where:{id:req.params.id},data:req.body});return ok(res,c,'Contract updated');}catch(e){next(e);}}
export async function sign_contract(req,res,next){try{const{signature_data}=req.body;if(!signature_data)return fail(res,'signature_data required');const c=await prisma.contracts.update({where:{id:req.params.id,user_id:req.user.id},data:{status:'SIGNED',signed_at:new Date(),signature_data}});return ok(res,c,'Contract signed');}catch(e){next(e);}}
