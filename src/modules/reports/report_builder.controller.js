import prisma from '../../shared/database/client.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
function ok(res,p,m='OK',s=200){return res.status(s).json({success:true,message:m,payload:p});}
function fail(res,m,s=400){return res.status(s).json({success:false,message:m});}

const ENTITY_MAP={
  // NOTE: 'role_name' was previously listed here but users has no such scalar column
  // (roles come through the many-to-many user_roles relation) — selecting it made every
  // default users report throw. Fixed, same class of bug as the 'deadline' fix below.
  users:{fields:{id:true,first_name:true,last_name:true,email:true,status:true,created_at:true,designation:true,salary:true},filters:['status','created_at','designation'],searchable:['first_name','last_name','email']},
  // NOTE: 'deadline' was previously listed here but projects has no such column (it's
  // 'end_date') — selecting it made every default projects report throw. Fixed.
  projects:{fields:{id:true,title:true,status:true,client_name:true,dev_status:true,progress:true,budget:true,budget_spent:true,owner_id:true,created_at:true,end_date:true},filters:['status','created_at','client_name','owner_id'],searchable:['title','client_name']},
  tasks:{fields:{id:true,title:true,status:true,priority:true,project_id:true,milestone_id:true,assigned_to:true,created_at:true,due_date:true},filters:['status','priority','created_at','project_id','assigned_to'],searchable:['title']},
  milestones:{fields:{id:true,project_id:true,title:true,due_date:true,completed:true,blocked:true,created_at:true},filters:['project_id','completed','blocked','created_at'],searchable:['title']},
  expense_transactions:{fields:{id:true,total_amount:true,transaction_type:true,category_id:true,date:true,title:true,paid_to:true,created_at:true},filters:['transaction_type','category_id','created_at'],searchable:['title','paid_to']},
  payroll_entries:{fields:{id:true,base_salary:true,gross_amount:true,net_amount:true,tax_amount:true,present_days:true,working_days:true,status:true},filters:['status'],searchable:[]},
  support_tickets:{fields:{id:true,ticket_number:true,subject:true,status:true,priority:true,severity:true,ticket_type_id:true,department_id:true,assignee_id:true,approval_status:true,response_due_at:true,resolution_due_at:true,closed_at:true,created_at:true},filters:['status','priority','severity','ticket_type_id','department_id','assignee_id','approval_status','created_at'],searchable:['ticket_number','subject']},
  // Added for Reporting & BI Sprint 1 Milestone 1 — same additive registration pattern as above.
  assets:{fields:{id:true,asset_tag:true,name:true,brand:true,model:true,category_id:true,department_id:true,location_id:true,status:true,condition:true,purchase_date:true,purchase_cost:true,warranty_expiry:true,created_at:true},filters:['category_id','department_id','location_id','status','created_at'],searchable:['asset_tag','name','brand','model']},
  time_off_requests:{fields:{id:true,user_id:true,leave_type:true,start_date:true,end_date:true,days:true,effective_days:true,status:true,created_at:true},filters:['user_id','leave_type','status','created_at'],searchable:[]},
  hr_documents:{fields:{id:true,user_id:true,category_id:true,type_id:true,title:true,status:true,valid_from:true,valid_until:true,created_at:true},filters:['user_id','category_id','type_id','status','created_at'],searchable:['title']},
};

export async function get_schema(req,res,next){
  return ok(res,Object.entries(ENTITY_MAP).map(([entity,cfg])=>({entity,fields:Object.keys(cfg.fields),filterable:cfg.filters,searchable:cfg.searchable||[]})));
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
  const where={};
  for(const[key,val]of Object.entries(filters)){
    if(!cfg.filters.includes(key)||val==null)continue;
    if(key==='created_at'&&val.from){where.created_at={gte:new Date(val.from),...(val.to&&{lte:new Date(val.to)})};}
    else where[key]=val;
  }
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
