import prisma from '../../shared/database/client.js';
function ok(res,p,m='OK',s=200){return res.status(s).json({success:true,message:m,payload:p});}
function fail(res,m,s=400){return res.status(s).json({success:false,message:m});}

const VALID_EVENTS=['task.created','task.updated','task.completed','expense.submitted','expense.approved','expense.rejected','project.created','project.updated','user.created','payroll.completed','performance.scored'];

export async function list_webhooks(req,res,next){try{const hooks=await prisma.webhooks.findMany({
  take: 500,include:{_count:{select:{deliveries:true}},creator:{select:{id:true,first_name:true,last_name:true}}}});return ok(res,{hooks,valid_events:VALID_EVENTS});}catch(e){next(e);}}

export async function create_webhook(req,res,next){try{const{name,url,secret,events}=req.body;if(!name||!url||!events?.length)return fail(res,'name, url, and events required');const invalid=events.filter(e=>!VALID_EVENTS.includes(e));if(invalid.length)return fail(res,`Invalid events: ${invalid.join(', ')}`);const hook=await prisma.webhooks.create({data:{name,url,secret:secret||null,events,created_by:req.user.id}});return ok(res,hook,'Webhook created',201);}catch(e){next(e);}}

export async function update_webhook(req,res,next){try{const{name,url,secret,events,active}=req.body;if(events){const invalid=events.filter(e=>!VALID_EVENTS.includes(e));if(invalid.length)return fail(res,`Invalid events: ${invalid.join(', ')}`);}const hook=await prisma.webhooks.update({where:{id:req.params.id},data:{...(name&&{name}),...(url&&{url}),...(secret!==undefined&&{secret:secret||null}),...(events&&{events}),...(active!==undefined&&{active})}});return ok(res,hook,'Updated');}catch(e){next(e);}}

export async function delete_webhook(req,res,next){try{await prisma.webhooks.delete({where:{id:req.params.id}});return ok(res,null,'Deleted');}catch(e){next(e);}}

export async function get_deliveries(req,res,next){try{const logs=await prisma.webhook_deliveries.findMany({where:{webhook_id:req.params.id},orderBy:{delivered_at:'desc'},take:50});return ok(res,logs);}catch(e){next(e);}}

export async function test_webhook(req,res,next){try{const hook=await prisma.webhooks.findUnique({where:{id:req.params.id}});if(!hook)return fail(res,'Not found',404);const{fire_webhook}=await import('../../shared/services/webhook.service.js');fire_webhook('task.created',{id:'test',title:'Test Task',note:'Test webhook delivery'});return ok(res,null,'Test delivery queued');}catch(e){next(e);}}
