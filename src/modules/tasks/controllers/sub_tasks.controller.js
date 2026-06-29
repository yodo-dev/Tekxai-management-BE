import prisma from '../../../shared/database/client.js';
function ok(res,p,m='OK',s=200){return res.status(s).json({success:true,message:m,payload:p});}
function fail(res,m,s=400){return res.status(s).json({success:false,message:m});}

export async function list_sub_tasks(req,res,next){
  try{
    const items=await prisma.task_sub_items.findMany({
  take: 500,where:{task_id:req.params.taskId},orderBy:{created_at:'asc'}});
    return ok(res,items);
  }catch(e){next(e);}
}

export async function create_sub_task(req,res,next){
  try{
    const{title}=req.body;
    if(!title)return fail(res,'title required');
    const item=await prisma.task_sub_items.create({data:{task_id:req.params.taskId,title,created_by:req.user.id}});
    return ok(res,item,'Sub-task created',201);
  }catch(e){next(e);}
}

export async function toggle_sub_task(req,res,next){
  try{
    const item=await prisma.task_sub_items.update({where:{id:req.params.subId},data:{completed:req.body.completed}});
    return ok(res,item);
  }catch(e){next(e);}
}

export async function delete_sub_task(req,res,next){
  try{
    await prisma.task_sub_items.delete({where:{id:req.params.subId}});
    return ok(res,null,'Deleted');
  }catch(e){next(e);}
}
