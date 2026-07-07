import prisma from '../../shared/database/client.js';
function ok(res,p,m='OK',s=200){return res.status(s).json({success:true,message:m,payload:p});}
function fail(res,m,s=400){return res.status(s).json({success:false,message:m});}

const ENTITY_MAP={
  users:{fields:{id:true,first_name:true,last_name:true,email:true,role_name:true,created_at:true,designation:true,salary:true},filters:['role_name','created_at','designation']},
  // NOTE: 'deadline' was previously listed here but projects has no such column (it's
  // 'end_date') — selecting it made every default projects report throw. Fixed.
  projects:{fields:{id:true,title:true,status:true,client_name:true,dev_status:true,progress:true,budget:true,budget_spent:true,owner_id:true,created_at:true,end_date:true},filters:['status','created_at','client_name','owner_id']},
  tasks:{fields:{id:true,title:true,status:true,priority:true,project_id:true,milestone_id:true,assigned_to:true,created_at:true,due_date:true},filters:['status','priority','created_at','project_id','assigned_to']},
  milestones:{fields:{id:true,project_id:true,title:true,due_date:true,completed:true,blocked:true,created_at:true},filters:['project_id','completed','blocked','created_at']},
  expense_transactions:{fields:{id:true,total_amount:true,transaction_type:true,category_id:true,date:true,title:true,paid_to:true,created_at:true},filters:['transaction_type','category_id','created_at']},
  payroll_entries:{fields:{id:true,base_salary:true,gross_amount:true,net_amount:true,tax_amount:true,present_days:true,working_days:true,status:true},filters:['status']},
};

export async function get_schema(req,res,next){
  return ok(res,Object.entries(ENTITY_MAP).map(([entity,cfg])=>({entity,fields:Object.keys(cfg.fields),filterable:cfg.filters})));
}

export async function run_report(req,res,next){
  try{
    const{entity,filters={},columns,sort_by,sort_dir='desc',limit=500}=req.body;
    if(!entity||!ENTITY_MAP[entity])return fail(res,`entity must be one of: ${Object.keys(ENTITY_MAP).join(', ')}`);
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
    const orderBy=sort_by?{[sort_by]:sort_dir}:{created_at:'desc'};
    const data=await prisma[entity].findMany({where,select,orderBy,take:Math.min(+limit,1000)});
    return ok(res,{entity,count:data.length,data});
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
