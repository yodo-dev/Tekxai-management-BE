import prisma from '../../../shared/database/client.js';
import { get_presigned_download_url } from '../../storage/storage.service.js';
function ok(res,p,m='OK',s=200){return res.status(s).json({success:true,message:m,payload:p});}
function fail(res,m,s=400){return res.status(s).json({success:false,message:m});}
// Admins/HR/managers see all employees unless they filter to one; everyone
// else can only ever see their own records.
function scoped_user_id_where(req){const is_admin=req.user.roles.some(r=>['ADMIN','SUPER_ADMIN','HR','DIVISION_MANAGER'].includes(r));const{user_id}=req.query;if(!is_admin)return{user_id:req.user.id};return user_id?{user_id}:{};}

export async function start_session(req,res,next){try{const s=await prisma.screenshot_sessions.create({data:{user_id:req.user.id,agent_version:req.body.agent_version,os_platform:req.body.os_platform,status:'ACTIVE'}});return ok(res,s,'Session started',201);}catch(e){next(e);}}

export async function end_session(req,res,next){try{const s=await prisma.screenshot_sessions.update({where:{id:req.params.id},data:{ended_at:new Date(),status:'ENDED'}});return ok(res,s,'Session ended');}catch(e){next(e);}}

export async function upload_screenshot(req,res,next){try{const{session_id,file_key,file_url,width,height,monitor_index,captured_at}=req.body;if(!session_id||!file_key)return fail(res,'session_id and file_key required');const s=await prisma.screenshots.create({data:{session_id,user_id:req.user.id,file_key,file_url,width:width?+width:null,height:height?+height:null,monitor_index:monitor_index?+monitor_index:0,captured_at:captured_at?new Date(captured_at):new Date()}});return ok(res,s,'Screenshot recorded',201);}catch(e){next(e);}}

export async function list_screenshots(req,res,next){
  try{
    const{from,to,page=1,limit=20}=req.query;
    const skip=(+page-1)*+limit;
    const where={...scoped_user_id_where(req)};
    if(from||to){where.captured_at={};if(from)where.captured_at.gte=new Date(from);if(to)where.captured_at.lte=new Date(to);}
    const[total,records]=await Promise.all([
      prisma.screenshots.count({where}),
      prisma.screenshots.findMany({where,skip,take:+limit,orderBy:{captured_at:'desc'},include:{user:{select:{id:true,first_name:true,last_name:true}}}}),
    ]);
    // Stored file_url is a bare (unsigned) S3 URL — the bucket is private, so
    // it 403s in the browser. Sign a fresh, short-lived GET URL per record instead.
    const signed_records=await Promise.all(records.map(async(r)=>{
      try{return{...r,file_url:await get_presigned_download_url(r.file_key)};}
      catch{return r;}
    }));
    return ok(res,{records:signed_records,total,page:+page,limit:+limit});
  }catch(e){next(e);}
}

export async function update_productivity(req,res,next){try{const{date,active_seconds=0,idle_seconds=0,mouse_events=0,keyboard_events=0}=req.body;const total=+active_seconds+(+idle_seconds);const score=total>0?Math.round((+active_seconds/total)*100):0;const s=await prisma.productivity_sessions.upsert({where:{user_id_date:{user_id:req.user.id,date:new Date(date||new Date().toISOString().split('T')[0])}},update:{active_seconds:+active_seconds,idle_seconds:+idle_seconds,mouse_events:+mouse_events,keyboard_events:+keyboard_events,productivity_score:score},create:{user_id:req.user.id,date:new Date(date||new Date().toISOString().split('T')[0]),active_seconds:+active_seconds,idle_seconds:+idle_seconds,mouse_events:+mouse_events,keyboard_events:+keyboard_events,productivity_score:score}});return ok(res,s);}catch(e){next(e);}}

export async function get_productivity(req,res,next){try{const{from,to}=req.query;const where={...scoped_user_id_where(req)};if(from||to){where.date={};if(from)where.date.gte=new Date(from);if(to)where.date.lte=new Date(to);}const records=await prisma.productivity_sessions.findMany({
  take: 500,where,orderBy:{date:'desc'},include:{user:{select:{id:true,first_name:true,last_name:true}}}});return ok(res,{records,total:records.length});}catch(e){next(e);}}

export async function log_app_usage(req, res, next) {
  try {
    const { session_id, app_name, window_title, url, duration_seconds, captured_at } = req.body;
    if (!session_id || !app_name) return fail(res, 'session_id and app_name required');
    const log = await prisma.app_usage_logs.create({
      data: {
        session_id,
        user_id: req.user.id,
        app_name,
        window_title: window_title || null,
        url: url || null,
        duration_seconds: duration_seconds ? +duration_seconds : 0,
        captured_at: captured_at ? new Date(captured_at) : new Date(),
      },
    });
    return ok(res, log, 'App usage logged', 201);
  } catch (e) { next(e); }
}

export async function get_app_usage(req, res, next) {
  try {
    const { from, to, page = 1, limit = 50 } = req.query;
    const skip = (+page - 1) * +limit;
    const where = { ...scoped_user_id_where(req) };
    if (from || to) {
      where.captured_at = {};
      if (from) where.captured_at.gte = new Date(from);
      if (to) where.captured_at.lte = new Date(to);
    }
    const [total, records] = await Promise.all([
      prisma.app_usage_logs.count({ where }),
      prisma.app_usage_logs.findMany({
        where, skip, take: +limit,
        orderBy: { captured_at: 'desc' },
        include: { user: { select: { id: true, first_name: true, last_name: true } } },
      }),
    ]);
    // Aggregate by app_name for summary
    const by_app = {};
    const all_logs = await prisma.app_usage_logs.findMany({
  take: 500, where });
    for (const l of all_logs) {
      by_app[l.app_name] = (by_app[l.app_name] || 0) + l.duration_seconds;
    }
    const app_summary = Object.entries(by_app)
      .map(([app_name, total_seconds]) => ({ app_name, total_seconds, total_minutes: Math.round(total_seconds / 60) }))
      .sort((a, b) => b.total_seconds - a.total_seconds);

    return ok(res, { records, total, page: +page, limit: +limit, app_summary });
  } catch (e) { next(e); }
}
