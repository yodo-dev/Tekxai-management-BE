import { find_activity_logs } from '../repositories/activity.repository.js';
function ok(res,p) { return res.json({success:true,payload:p}); }
export async function list_activity_ctrl(req,res,next) {
  try { const is_admin=req.user.roles.some(r=>['ADMIN','SUPER_ADMIN','HR','DIVISION_MANAGER'].includes(r)); const p={...req.query}; if(!is_admin) p.user_id=req.user.id; return ok(res,await find_activity_logs(p)); } catch(e){next(e);}
}
export async function list_my_activity_ctrl(req,res,next) { try { return ok(res,await find_activity_logs({...req.query,user_id:req.user.id})); } catch(e){next(e);} }
export async function list_project_timeline_ctrl(req,res,next) { try { return ok(res,await find_activity_logs({...req.query,entity_type:'project',entity_id:req.params.projectId,limit:req.query.limit||200})); } catch(e){next(e);} }
