import { list_tasks, create_task as create_task_service, complete_task as complete_task_service } from '../services/offboarding.service.js';

function ok(res,p,m='OK',s=200){return res.status(s).json({success:true,message:m,payload:p});}
function fail(res,m,s=400){return res.status(s).json({success:false,message:m});}

// GET /offboarding/tasks/:userId
export async function get_tasks(req,res,next){try{const tasks=await list_tasks(req.params.userId);return ok(res,{records:tasks,total:tasks.length});}catch(e){next(e);}}

// POST /offboarding/tasks
export async function create_task(req,res,next){try{const{user_id,title,description,category,due_date}=req.body;if(!user_id||!title)return fail(res,'user_id and title required');const t=await create_task_service({user_id,title,description,category,due_date,assigned_by:req.user.id});return ok(res,t,'Task created',201);}catch(e){next(e);}}

// PATCH /offboarding/tasks/:id/complete
export async function complete_task(req,res,next){try{const t=await complete_task_service(req.params.id);return ok(res,t,'Task completed');}catch(e){next(e);}}
