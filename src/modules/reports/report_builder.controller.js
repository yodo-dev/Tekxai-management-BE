import prisma from '../../shared/database/client.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
function ok(res,p,m='OK',s=200){return res.status(s).json({success:true,message:m,payload:p});}
function fail(res,m,s=400){return res.status(s).json({success:false,message:m});}

const ENTITY_MAP={
  // NOTE: 'role_name' was previously listed here but users has no such scalar column
  // (roles come through the many-to-many user_roles relation) — selecting it made every
  // default users report throw. Fixed, same class of bug as the 'deadline' fix below.
  // Extended for Sprint 1 Milestone 2 (HR Reports): department_id/designation_id/
  // grade_id/business_unit/supervisor_id/hire_date added to fields+filters so
  // Employee Summary / Department / Designation / Grade / Business Unit /
  // Supervisor / Hiring reports are all just filtered+grouped queries against
  // the same `users` entity, no new HR-specific endpoints.
  // `numeric` (Sprint 1 Milestone 2.5): whitelists which fields KPI SUM/AVG/
  // MIN/MAX may target — reuses the same field already exposed in `fields`,
  // not a new surface. Optional; omitted entirely means COUNT-only.
  users:{fields:{id:true,first_name:true,last_name:true,email:true,status:true,created_at:true,designation:true,designation_id:true,department_id:true,grade_id:true,business_unit:true,supervisor_id:true,hire_date:true,salary:true},filters:['status','created_at','designation','designation_id','department_id','grade_id','business_unit','supervisor_id','hire_date'],searchable:['first_name','last_name','email'],numeric:['salary']},
  // NOTE: 'deadline' was previously listed here but projects has no such column (it's
  // 'end_date') — selecting it made every default projects report throw. Fixed.
  projects:{fields:{id:true,title:true,status:true,client_name:true,dev_status:true,progress:true,budget:true,budget_spent:true,owner_id:true,created_at:true,end_date:true},filters:['status','created_at','client_name','owner_id'],searchable:['title','client_name'],numeric:['budget','budget_spent','progress']},
  tasks:{fields:{id:true,title:true,status:true,priority:true,project_id:true,milestone_id:true,assigned_to:true,created_at:true,due_date:true},filters:['status','priority','created_at','project_id','assigned_to'],searchable:['title']},
  milestones:{fields:{id:true,project_id:true,title:true,due_date:true,completed:true,blocked:true,created_at:true},filters:['project_id','completed','blocked','created_at'],searchable:['title']},
  // Extended for Sprint 1 Milestone 4 (Expense Reports): user_id (employee),
  // date (the actual transaction date — Current Month/Year KPIs must filter
  // on this, not created_at) and paid_to (free-text vendor, no dedicated
  // vendor table exists) added to filters. ce_amount/tekxai_amount added to
  // numeric for the existing cost-split reporting already used by
  // /expenses/summary. NOTE: expense_transactions has no department_id,
  // business_unit_id, project_id, status/approval, or is_recurring columns —
  // "Expenses by Department/Business Unit/Project", "Pending Reimbursements",
  // "Approved/Rejected Expenses", and "Recurring Expenses" are not
  // implementable without a schema change, which is out of scope here.
  expense_transactions:{fields:{id:true,total_amount:true,ce_amount:true,tekxai_amount:true,transaction_type:true,category_id:true,date:true,title:true,paid_to:true,user_id:true,created_at:true},filters:['transaction_type','category_id','created_at','date','paid_to','user_id'],searchable:['title','paid_to'],numeric:['total_amount','ce_amount','tekxai_amount']},
  // Extended for Sprint 1 Milestone 5 (Attendance & Payroll Reports):
  // run_id/user_id added to filters so "Payroll by Employee"/"by Run" work;
  // overtime_amount/bonus_amount/deductions/late_deduction/absence_penalty
  // added to numeric for Overtime Cost / Bonus / Deductions reports —
  // real columns already computed by the existing payroll calculation
  // service, not re-derived here.
  payroll_entries:{fields:{id:true,run_id:true,user_id:true,base_salary:true,gross_amount:true,net_amount:true,tax_amount:true,overtime_amount:true,bonus_amount:true,deductions:true,late_deduction:true,absence_penalty:true,present_days:true,working_days:true,status:true},filters:['status','run_id','user_id'],searchable:[],numeric:['base_salary','gross_amount','net_amount','tax_amount','overtime_amount','bonus_amount','deductions','late_deduction','absence_penalty']},
  // Extended for Sprint 1 Milestone 6 (Tickets & Monitoring Reports):
  // team_id/project_id/user_id(requester) added to filters+fields for
  // Tickets-by-Team/Project/Requester. NOTE: SLA Breaches and Average
  // Resolution Time are NOT registered/implementable here — SLA breach is a
  // live `now()` comparison ORed across response_due_at/resolution_due_at
  // (see list_tickets()'s own sla=overdue filter, tickets.service.js), and
  // resolution time is a closed_at-minus-created_at delta — neither is a
  // flat equality/range filter or a single-column aggregate the generic
  // engine's build_where/run_kpi can express. Left as a documented gap
  // rather than adding ticket-specific logic to this engine.
  support_tickets:{fields:{id:true,ticket_number:true,subject:true,status:true,priority:true,severity:true,ticket_type_id:true,department_id:true,assignee_id:true,team_id:true,project_id:true,user_id:true,approval_status:true,response_due_at:true,resolution_due_at:true,resolved_at:true,closed_at:true,created_at:true},filters:['status','priority','severity','ticket_type_id','department_id','assignee_id','team_id','project_id','user_id','approval_status','created_at'],searchable:['ticket_number','subject']},
  // Added for Reporting & BI Sprint 1 Milestone 1 — same additive registration pattern as above.
  assets:{fields:{id:true,asset_tag:true,name:true,brand:true,model:true,category_id:true,department_id:true,location_id:true,status:true,condition:true,purchase_date:true,purchase_cost:true,warranty_expiry:true,created_at:true},filters:['category_id','department_id','location_id','status','brand','created_at'],searchable:['asset_tag','name','brand','model'],numeric:['purchase_cost']},
  time_off_requests:{fields:{id:true,user_id:true,leave_type:true,start_date:true,end_date:true,days:true,effective_days:true,status:true,created_at:true},filters:['user_id','leave_type','status','created_at'],searchable:[]},
  hr_documents:{fields:{id:true,user_id:true,category_id:true,type_id:true,title:true,status:true,valid_from:true,valid_until:true,created_at:true},filters:['user_id','category_id','type_id','status','created_at'],searchable:['title']},
  // Added for Sprint 1 Milestone 2 (HR Reports) — Lifecycle Report and Team Report.
  employee_profiles:{fields:{id:true,user_id:true,employment_status:true,lifecycle_stage:true,employment_type:true,created_at:true},filters:['employment_status','lifecycle_stage','employment_type','created_at'],searchable:[]},
  team_members:{fields:{id:true,team_id:true,user_id:true,role:true,joined_at:true},filters:['team_id','role'],searchable:[]},
  // Added for Sprint 1 Milestone 3 (Asset Reports) — "Assets Under Repair"
  // detail report. There is no standing "UNDER_REPAIR" asset.status in the
  // schema; repair activity is logged here as type='REPAIR', so that's what
  // this report actually reflects (repair log entries, not a live status).
  asset_maintenance_logs:{fields:{id:true,asset_id:true,type:true,description:true,cost:true,performed_at:true,vendor_name:true,created_at:true},filters:['asset_id','type','created_at'],searchable:['description','vendor_name']},
  // Added for Sprint 1 Milestone 5 (Attendance & Payroll Reports) — all real
  // columns already computed/persisted by the existing attendance/payroll
  // services (compute_violation, payroll calculate_run); nothing re-derived.
  // "Late"/"Absent" reports are attendance_violations filtered by
  // violation_type — these rows only exist once compute_violation() has
  // already run, same as the module's own /attendance/violations endpoint.
  attendance_violations:{fields:{id:true,user_id:true,entry_id:true,date:true,violation_type:true,late_mins:true,created_at:true},filters:['user_id','violation_type','date','created_at'],searchable:[],numeric:['late_mins']},
  // Daily/Monthly attendance detail — one row per check-in/out.
  timesheet_entries:{fields:{id:true,user_id:true,check_in:true,check_out:true,duration_sec:true,status:true,is_wfh:true,created_at:true},filters:['user_id','status','is_wfh','created_at'],searchable:[],numeric:['duration_sec']},
  // Shift Assignment report — flat listing; resolving shift_id -> shift name
  // is a frontend lookup against the existing /attendance/shifts list, same
  // id-to-name pattern already used for category/department/location.
  employee_shifts:{fields:{id:true,user_id:true,shift_id:true,start_date:true,end_date:true,created_at:true},filters:['user_id','shift_id','created_at'],searchable:[]},
  // Payroll Run report — period/status-level totals, already computed by
  // calculate_run() and stored here verbatim.
  payroll_runs:{fields:{id:true,period_month:true,period_year:true,status:true,total_gross:true,total_net:true,total_deductions:true,created_at:true},filters:['status','period_month','period_year','created_at'],searchable:[],numeric:['total_gross','total_net','total_deductions']},
  // Bonus report — reuses the existing monthly_bonus_records table (the
  // legacy /report/bonus route's data source), now available through the
  // generic engine too.
  monthly_bonus_records:{fields:{id:true,user_id:true,period:true,average_score:true,performance_level:true,bonus_eligible:true,bonus_amount:true,approval_status:true,approved_at:true,created_at:true},filters:['user_id','period','approval_status','bonus_eligible','performance_level','created_at'],searchable:[],numeric:['bonus_amount','average_score']},
  // Added for Sprint 1 Milestone 6 (Monitoring Reports) — real columns
  // already computed/persisted by the existing monitoring capture flow
  // (POST /monitoring/productivity, /monitoring/app-usage); nothing
  // re-derived. "Productivity %" is AVG(productivity_score); "Productive vs
  // Idle" is SUM(active_seconds) vs SUM(idle_seconds); "User Productivity"
  // is group_by user_id with metric AVG productivity_score.
  productivity_sessions:{fields:{id:true,user_id:true,date:true,active_seconds:true,idle_seconds:true,mouse_events:true,keyboard_events:true,productivity_score:true,created_at:true},filters:['user_id','date','created_at'],searchable:[],numeric:['active_seconds','idle_seconds','mouse_events','keyboard_events','productivity_score']},
  // "Top Applications"/"Top Websites" are both this same entity grouped by
  // app_name or url respectively (there is no separate website-usage table
  // — website tracking is folded into app_usage_logs via the `url` column),
  // ranked by SUM(duration_seconds). "Monitoring Time" is SUM(duration_seconds).
  app_usage_logs:{fields:{id:true,session_id:true,user_id:true,app_name:true,url:true,duration_seconds:true,captured_at:true,created_at:true},filters:['user_id','session_id','app_name','url','created_at'],searchable:['app_name','url'],numeric:['duration_seconds']},
  // "Screenshot Count" KPI + detail listing.
  screenshots:{fields:{id:true,session_id:true,user_id:true,captured_at:true,created_at:true},filters:['user_id','session_id','created_at'],searchable:[]},
};

export async function get_schema(req,res,next){
  return ok(res,Object.entries(ENTITY_MAP).map(([entity,cfg])=>({entity,fields:Object.keys(cfg.fields),filterable:cfg.filters,searchable:cfg.searchable||[],numeric:cfg.numeric||[]})));
}

// Shared filter-to-`where` builder — used by run_report (via
// build_report_query below), run_aggregate, and run_kpi so filter semantics
// (whitelisting, date-range handling) can never drift between the three
// report types. Date-range detection is shape-based (`{from, to}`), not tied
// to the field name 'created_at' — any registered date filter (expense
// `date`, a future invoice `due_date`, etc.) gets range support for free,
// which is what "future modules without architecture changes" requires.
function build_where(cfg,filters={}){
  const where={};
  for(const[key,val]of Object.entries(filters)){
    if(!cfg.filters.includes(key)||val==null)continue;
    if(typeof val==='object'&&!Array.isArray(val)&&val.from){where[key]={gte:new Date(val.from),...(val.to&&{lte:new Date(val.to)})};}
    else where[key]=val;
  }
  return where;
}

// Shared query-building logic for run_report and the export endpoints below —
// kept as one function so pagination/filter/search/sort behavior can never
// drift between "view in browser" and "export" (a common source of reports
// where the exported file doesn't match what was on screen).
function build_report_query(body){
  const{entity,filters={},columns,sort_by,sort_dir='desc',search}=body;
  if(!entity||!ENTITY_MAP[entity])return{error:`entity must be one of: ${Object.keys(ENTITY_MAP).join(', ')}`};
  const cfg=ENTITY_MAP[entity];
  let select={};
  if(columns?.length){for(const c of columns)if(cfg.fields[c]!==undefined)select[c]=true;}
  else select={...cfg.fields};
  const where=build_where(cfg,filters);
  if(search&&cfg.searchable?.length){
    where.OR=cfg.searchable.map((f)=>({[f]:{contains:String(search),mode:'insensitive'}}));
  }
  const orderBy=sort_by&&(cfg.fields[sort_by]!==undefined)?{[sort_by]:sort_dir}:{created_at:cfg.fields.created_at?'desc':undefined};
  if(!orderBy.created_at&&!sort_by)delete orderBy.created_at; // entities without created_at (none currently, kept defensive)
  return{cfg,select,where,orderBy};
}

export async function run_report(req,res,next){
  try{
    const built=build_report_query(req.body);
    if(built.error)return fail(res,built.error);
    const{select,where,orderBy}=built;
    const{entity,page=1,limit=500}=req.body;
    const take=Math.min(+limit||500,1000);
    const skip=(Math.max(+page,1)-1)*take;
    const[total,data]=await Promise.all([
      prisma[entity].count({where}),
      prisma[entity].findMany({where,select,orderBy,take,skip}),
    ]);
    // count/data kept for backward compatibility with existing callers that
    // only read those two keys — total/page/limit are additive, matching the
    // {records,total,page,limit} shape used everywhere else in the API.
    return ok(res,{entity,count:data.length,data,total,page:+page,limit:take});
  }catch(e){next(e);}
}

// Builds the full (unpaginated, up to 5000-row safety cap) result set for
// export — exports intentionally aren't limited to the current on-screen
// page, but still capped so a runaway query can't exhaust memory.
async function build_export_rows(body){
  const built=build_report_query(body);
  if(built.error)throw Object.assign(new Error(built.error),{status_code:400});
  const{entity}=body;
  const{select,where,orderBy}=built;
  return prisma[entity].findMany({where,select,orderBy,take:5000});
}

export async function export_excel(req,res,next){
  try{
    const{entity}=req.body;
    const rows=await build_export_rows(req.body);
    const wb=new ExcelJS.Workbook();
    const sheet=wb.addWorksheet(entity);
    const columns=rows.length?Object.keys(rows[0]):(req.body.columns||[]);
    sheet.columns=columns.map((c)=>({header:c,key:c,width:20}));
    sheet.getRow(1).font={bold:true};
    for(const row of rows)sheet.addRow(row);
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',`attachment; filename="${entity}-report.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  }catch(e){next(e);}
}

export async function export_pdf(req,res,next){
  try{
    const{entity}=req.body;
    const rows=await build_export_rows(req.body);
    const columns=rows.length?Object.keys(rows[0]):(req.body.columns||[]);
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`attachment; filename="${entity}-report.pdf"`);
    const pdf=new PDFDocument({margin:36,size:'A4',layout:'landscape'});
    pdf.pipe(res);
    pdf.font('Helvetica-Bold').fontSize(14).text(`${entity} report`,{align:'left'});
    pdf.moveDown(0.5);
    pdf.font('Helvetica-Bold').fontSize(8).text(columns.join('   |   '));
    pdf.moveDown(0.3);
    pdf.font('Helvetica').fontSize(8);
    for(const row of rows){
      pdf.text(columns.map((c)=>String(row[c]??'')).join('   |   '));
    }
    pdf.end();
  }catch(e){next(e);}
}

// Generic "count by dimension" aggregate — answers every "Employees by
// Department", "Assets by Category", "Expenses by Vendor" style report
// across every registered entity with one endpoint, instead of a bespoke
// groupBy query per module. group_by must be one of the entity's own
// registered `filters` (same whitelist reused, not a new one) so this can
// never aggregate on a column the entity didn't already choose to expose.
// `metric_field` (Sprint 1 Milestone 4): optional — when given (and in the
// entity's `numeric` whitelist), each group also gets an aggregated `value`
// (e.g. total spend per category, not just row count) and rows sort by that
// instead of count. Without it, behavior is unchanged (COUNT-only, backward
// compatible with Milestones 1-3 callers).
// `metric` (Sprint 1 Milestone 6): optional, defaults to 'SUM' when
// metric_field is given — 'AVG' enables per-group averages (e.g. average
// productivity score per employee) alongside the existing per-group sums,
// same whitelist/validation, no new endpoint.
const AGG_METRICS=['SUM','AVG'];
export async function run_aggregate(req,res,next){
  try{
    const{entity,group_by,filters={},metric_field,metric='SUM'}=req.body;
    if(!entity||!ENTITY_MAP[entity])return fail(res,`entity must be one of: ${Object.keys(ENTITY_MAP).join(', ')}`);
    const cfg=ENTITY_MAP[entity];
    if(!group_by||!cfg.filters.includes(group_by))return fail(res,`group_by must be one of: ${cfg.filters.join(', ')}`);
    if(metric_field&&!cfg.numeric?.includes(metric_field))return fail(res,`metric_field must be one of: ${(cfg.numeric||[]).join(', ')||'(no numeric fields registered for this entity)'}`);
    const m=String(metric).toUpperCase();
    if(metric_field&&!AGG_METRICS.includes(m))return fail(res,`metric must be one of: ${AGG_METRICS.join(', ')}`);
    const agg_key=m==='AVG'?'_avg':'_sum';
    const where=build_where(cfg,filters);
    const groupBy_args={by:[group_by],where,_count:{_all:true}};
    if(metric_field)groupBy_args[agg_key]={[metric_field]:true};
    const grouped=await prisma[entity].groupBy(groupBy_args);
    const rows=grouped
      .map((g)=>({[group_by]:g[group_by],count:g._count._all,...(metric_field&&{value:g[agg_key]?.[metric_field]??0})}))
      .sort((a,b)=>metric_field?b.value-a.value:b.count-a.count);
    return ok(res,{entity,group_by,metric_field:metric_field||null,metric:metric_field?m:null,total:rows.reduce((s,r)=>s+r.count,0),rows});
  }catch(e){next(e);}
}

const KPI_METRICS=['COUNT','SUM','AVG','MIN','MAX'];
const KPI_AGG_KEY={SUM:'_sum',AVG:'_avg',MIN:'_min',MAX:'_max'};

// Generic single-value KPI — answers "Total Employees" (COUNT), "Monthly
// Expense" (SUM), "Average Salary" (AVG) etc. across any registered entity
// with one endpoint instead of a bespoke stats route per module. For
// non-COUNT metrics, `field` must be in the entity's `numeric` whitelist —
// same reuse-the-existing-registration pattern as group_by on /aggregate.
export async function run_kpi(req,res,next){
  try{
    const{entity,metric='COUNT',field,filters={}}=req.body;
    if(!entity||!ENTITY_MAP[entity])return fail(res,`entity must be one of: ${Object.keys(ENTITY_MAP).join(', ')}`);
    const cfg=ENTITY_MAP[entity];
    const m=String(metric).toUpperCase();
    if(!KPI_METRICS.includes(m))return fail(res,`metric must be one of: ${KPI_METRICS.join(', ')}`);
    const where=build_where(cfg,filters);
    if(m==='COUNT'){
      const value=await prisma[entity].count({where});
      return ok(res,{entity,metric:m,field:null,value});
    }
    if(!field||!cfg.numeric?.includes(field))return fail(res,`field must be one of: ${(cfg.numeric||[]).join(', ')||'(no numeric fields registered for this entity)'}`);
    const agg_key=KPI_AGG_KEY[m];
    const result=await prisma[entity].aggregate({where,[agg_key]:{[field]:true}});
    const value=result[agg_key]?.[field]??0;
    return ok(res,{entity,metric:m,field,value});
  }catch(e){next(e);}
}

export async function list_saved(req,res,next){
  try{const saved=await prisma.saved_reports.findMany({
  take: 500,where:{OR:[{created_by:req.user.id},{is_public:true}]},orderBy:{created_at:'desc'},include:{creator:{select:{id:true,first_name:true,last_name:true}}}});return ok(res,saved);}catch(e){next(e);}
}

export async function save_report(req,res,next){
  try{const{name,description,config,is_public}=req.body;if(!name||!config)return fail(res,'name and config required');const report=await prisma.saved_reports.create({data:{name,description,config,is_public:!!is_public,created_by:req.user.id}});return ok(res,report,'Saved',201);}catch(e){next(e);}
}

export async function delete_saved(req,res,next){
  try{
    const report=await prisma.saved_reports.findUnique({where:{id:req.params.id}});
    if(!report)return fail(res,'Not found',404);
    const is_admin=req.user.roles.some(r=>['ADMIN','SUPER_ADMIN'].includes(r));
    if(!is_admin&&report.created_by!==req.user.id)return fail(res,'Forbidden',403);
    await prisma.saved_reports.delete({where:{id:req.params.id}});
    return ok(res,null,'Deleted');
  }catch(e){next(e);}
}
