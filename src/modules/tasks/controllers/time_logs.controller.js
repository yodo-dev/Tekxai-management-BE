import prisma from '../../../shared/database/client.js';
function ok(res,p,m='OK',s=200){return res.status(s).json({success:true,message:m,payload:p});}
function fail(res,m,s=400){return res.status(s).json({success:false,message:m});}

export async function list_time_logs(req,res,next){
  try{
    const logs=await prisma.task_time_logs.findMany({
      take: 500,
      where:{task_id:req.params.taskId},
      orderBy:{logged_at:'desc'},
      include:{
        user:{select:{id:true,first_name:true,last_name:true}},
        business_activity:{select:{id:true,name:true,default_billable:true,feeds_layer:true}},
      }
    });
    const total_seconds=logs.reduce((s,l)=>s+l.seconds,0);
    return ok(res,{logs,total_seconds});
  }catch(e){next(e);}
}

export async function log_time(req,res,next){
  try{
    const{seconds,note,logged_at,business_activity_id,allocation_method}=req.body;
    if(!seconds||+seconds<=0)return fail(res,'seconds must be positive');
    if(allocation_method&&!['TIME_SHARE','FIXED_SHARE','HEADCOUNT_SHARE'].includes(allocation_method)){
      return fail(res,'allocation_method must be one of TIME_SHARE, FIXED_SHARE, HEADCOUNT_SHARE');
    }
    const log=await prisma.task_time_logs.create({
      data:{
        task_id:req.params.taskId,user_id:req.user.id,seconds:+seconds,note:note||null,
        logged_at:logged_at?new Date(logged_at):new Date(),
        business_activity_id:business_activity_id||null,
        allocation_method:allocation_method||'TIME_SHARE',
      },
      include:{business_activity:{select:{id:true,name:true,default_billable:true,feeds_layer:true}}},
    });
    return ok(res,log,'Time logged',201);
  }catch(e){next(e);}
}

export async function delete_time_log(req,res,next){
  try{
    const log=await prisma.task_time_logs.findUnique({where:{id:req.params.logId}});
    if(!log) return fail(res,'Not found',404);
    const is_admin=req.user.roles?.some(r=>['ADMIN','SUPER_ADMIN','HR','DIVISION_MANAGER'].includes(r));
    if(!is_admin && log.user_id!==req.user.id) return fail(res,"Cannot delete another employee's time log",403);
    await prisma.task_time_logs.delete({where:{id:req.params.logId}});
    return ok(res,null,'Deleted');
  }catch(e){next(e);}
}
