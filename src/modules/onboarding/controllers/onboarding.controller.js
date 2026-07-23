import prisma from '../../../shared/database/client.js';
import { send_invite_email } from '../../email/email.service.js';
import { nanoid } from '../../../shared/utils/nanoid.js';
import { convert_candidate_to_employee } from '../services/onboarding.service.js';

function ok(res,p,m='OK',s=200){return res.status(s).json({success:true,message:m,payload:p});}
function fail(res,m,s=400){return res.status(s).json({success:false,message:m});}

// GET /onboarding/candidates
export async function list_candidates(req,res,next){try{const candidates=await prisma.candidates.findMany({orderBy:{created_at:'desc'},include:{offers:{orderBy:{created_at:'desc'},take:1}}});return ok(res,{records:candidates,total:candidates.length});}catch(e){next(e);}}

// POST /onboarding/candidates
export async function create_candidate(req,res,next){try{const{email,first_name,last_name,phone,position,department_id}=req.body;if(!email||!first_name)return fail(res,'email and first_name required');const token=nanoid(32);const expires=new Date(Date.now()+7*24*60*60*1000);const c=await prisma.candidates.create({data:{email,first_name,last_name,phone,position,department_id,invited_by:req.user.id,invite_token:token,invite_expires_at:expires,status:'INVITED'}});const invite_url=`${process.env.FRONTEND_URL||'http://localhost:5173'}/candidate/portal?token=${token}`;send_invite_email(email,invite_url,`${req.user.first_name||'HR'} Team`,position||'the team').catch(()=>{});return ok(res,c,'Candidate invited',201);}catch(e){next(e);}}

// GET /onboarding/candidates/:id
export async function get_candidate(req,res,next){try{const c=await prisma.candidates.findFirst({where:{id:req.params.id},include:{offers:true}});if(!c)return fail(res,'Not found',404);return ok(res,c);}catch(e){next(e);}}

// POST /onboarding/offers
export async function create_offer(req,res,next){try{const{candidate_id,position,department_id,salary,start_date,employment_type,letter_content}=req.body;if(!candidate_id||!position)return fail(res,'candidate_id and position required');const o=await prisma.offers.create({data:{candidate_id,position,department_id,salary:+salary||0,start_date:start_date?new Date(start_date):null,employment_type:employment_type||'FULL_TIME',letter_content,status:'DRAFT',created_by:req.user.id}});return ok(res,o,'Offer created',201);}catch(e){next(e);}}

// POST /onboarding/offers/:id/send
export async function send_offer(req,res,next){try{const o=await prisma.offers.update({where:{id:req.params.id},data:{status:'SENT',sent_at:new Date()},include:{candidate:true}});if(o.candidate?.email){const portal_url=`${process.env.FRONTEND_URL||'http://localhost:5173'}/offer/${o.id}?token=${o.candidate.invite_token}`;send_invite_email(o.candidate.email,portal_url,'HR Team',o.position).catch(()=>{});}return ok(res,o,'Offer sent');}catch(e){next(e);}}

// GET /onboarding/offers/:id/accept (candidate flow)
export async function accept_offer(req,res,next){try{const o=await prisma.offers.update({where:{id:req.params.id},data:{status:'ACCEPTED',accepted_at:new Date()},include:{candidate:true}});await prisma.candidates.update({where:{id:o.candidate_id},data:{status:'ACCEPTED'}});
  // Single Employee Master: this is the one place recruitment actually
  // creates the employee (see onboarding.service.js) — don't let a failure
  // here (e.g. duplicate email) block the offer from being recorded as
  // accepted; HR can still link/create the employee manually if this ever
  // needs a retry.
  const employee=await convert_candidate_to_employee(o,req.user.id).catch(()=>null);
  return ok(res,{...o,employee},'Offer accepted');}catch(e){next(e);}}

// POST /onboarding/offers/:id/reject (candidate flow)
export async function reject_offer(req,res,next){try{const o=await prisma.offers.update({where:{id:req.params.id},data:{status:'REJECTED',rejected_at:new Date(),rejection_reason:req.body.reason},include:{candidate:true}});await prisma.candidates.update({where:{id:o.candidate_id},data:{status:'REJECTED'}});return ok(res,o,'Offer rejected');}catch(e){next(e);}}

// GET /onboarding/tasks/:userId
export async function get_tasks(req,res,next){try{const tasks=await prisma.onboarding_tasks.findMany({
  take: 500,where:{user_id:req.params.userId},orderBy:[{is_completed:'asc'},{created_at:'asc'}]});return ok(res,{records:tasks,total:tasks.length});}catch(e){next(e);}}

// POST /onboarding/tasks
export async function create_task(req,res,next){try{const{user_id,title,description,category,due_date}=req.body;if(!user_id||!title)return fail(res,'user_id and title required');const t=await prisma.onboarding_tasks.create({data:{user_id,title,description,category:category||'GENERAL',due_date:due_date?new Date(due_date):null,assigned_by:req.user.id}});return ok(res,t,'Task created',201);}catch(e){next(e);}}

// PATCH /onboarding/tasks/:id/complete
export async function complete_task(req,res,next){try{const t=await prisma.onboarding_tasks.update({where:{id:req.params.id},data:{is_completed:true,completed_at:new Date()}});return ok(res,t,'Task completed');}catch(e){next(e);}}
