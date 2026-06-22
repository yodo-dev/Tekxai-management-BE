import { get_jd, upsert_jd } from '../repositories/jd.repository.js';
function ok(res,p,m='OK') { return res.json({success:true,message:m,payload:p}); }
export async function get_my_jd(req,res,next) { try { return ok(res,await get_jd(req.user.id)||null); } catch(e){next(e);} }
export async function get_user_jd(req,res,next) { try { return ok(res,await get_jd(req.params.userId)||null); } catch(e){next(e);} }
export async function upsert_jd_ctrl(req,res,next) { try { return ok(res,await upsert_jd(req.params.userId||req.user.id,req.body,req.user.id),'Saved'); } catch(e){next(e);} }
