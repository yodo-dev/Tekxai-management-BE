import prisma from '../../../shared/database/client.js';
function ok(res,p,m='OK',s=200){return res.status(s).json({success:true,message:m,payload:p});}
function fail(res,m,s=400){return res.status(s).json({success:false,message:m});}

export async function list_time_logs(req,res,next){
  try{
    const logs=await prisma.task_time_logs.findMany({
      where:{task_id:req.params.taskId},
      orderBy:{logged_at:'desc'},
      include:{user:{select:{id:true,first_name:true,last_name:true}}}
    });
    const total_seconds=logs.reduce((s,l)=>s+l.seconds,0);
    return ok(res,{logs,total_seconds});
  }catch(e){next(e);}
}

export async function log_time(req,res,next){
  try{
    const{seconds,note,logged_at}=req.body;
    if(!seconds||+seconds<=0)return fail(res,'seconds must be positive');
    const log=await prisma.task_time_logs.create({
      data:{task_id:req.params.taskId,user_id:req.user.id,seconds:+seconds,note:note||null,logged_at:logged_at?new Date(logged_at):new Date()}
    });
    return ok(res,log,'Time logged',201);
  }catch(e){next(e);}
}

export async function delete_time_log(req,res,next){
  try{
    await prisma.task_time_logs.delete({where:{id:req.params.logId}});
    return ok(res,null,'Deleted');
  }catch(e){next(e);}
}
