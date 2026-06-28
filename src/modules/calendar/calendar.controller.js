import prisma from '../../shared/database/client.js';
function ok(res,p,m='OK',s=200){return res.status(s).json({success:true,message:m,payload:p});}
function fail(res,m,s=400){return res.status(s).json({success:false,message:m});}

const get_client=async()=>{const{OAuth2Client}=await import('google-auth-library');return new OAuth2Client(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET,process.env.GOOGLE_REDIRECT_URI||'postmessage');};

export async function connect_calendar(req,res,next){
  try{
    const{code}=req.body;
    if(!code)return fail(res,'code required');
    if(!process.env.GOOGLE_CLIENT_ID)return fail(res,'Google Calendar not configured',503);
    const client=await get_client();
    const{tokens}=await client.getToken(code);
    const token=await prisma.google_calendar_tokens.upsert({
      where:{user_id:req.user.id},
      create:{user_id:req.user.id,access_token:tokens.access_token,refresh_token:tokens.refresh_token||null,expires_at:tokens.expiry_date?new Date(tokens.expiry_date):null,scope:tokens.scope||null},
      update:{access_token:tokens.access_token,...(tokens.refresh_token&&{refresh_token:tokens.refresh_token}),expires_at:tokens.expiry_date?new Date(tokens.expiry_date):null,scope:tokens.scope||null},
    });
    return ok(res,{connected:true,scope:token.scope},'Calendar connected');
  }catch(e){next(e);}
}

export async function calendar_status(req,res,next){
  try{const token=await prisma.google_calendar_tokens.findUnique({where:{user_id:req.user.id}});return ok(res,{connected:!!token,expires_at:token?.expires_at});}catch(e){next(e);}
}

export async function disconnect_calendar(req,res,next){
  try{await prisma.google_calendar_tokens.deleteMany({where:{user_id:req.user.id}});return ok(res,{connected:false},'Disconnected');}catch(e){next(e);}
}

export async function get_access_token(req,res,next){
  try{
    const token=await prisma.google_calendar_tokens.findUnique({where:{user_id:req.user.id}});
    if(!token)return fail(res,'Calendar not connected',404);
    const now=Date.now();
    const expires=token.expires_at?token.expires_at.getTime():0;
    let access_token=token.access_token;
    if(token.refresh_token&&expires-now<5*60*1000){
      const client=await get_client();
      client.setCredentials({refresh_token:token.refresh_token});
      const{credentials}=await client.refreshAccessToken();
      access_token=credentials.access_token;
      await prisma.google_calendar_tokens.update({where:{user_id:req.user.id},data:{access_token,expires_at:credentials.expiry_date?new Date(credentials.expiry_date):null}});
    }
    return ok(res,{access_token});
  }catch(e){next(e);}
}
