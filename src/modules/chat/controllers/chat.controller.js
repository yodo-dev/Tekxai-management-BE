import prisma from '../../../shared/database/client.js';
function ok(res,p,m='OK',s=200){return res.status(s).json({success:true,message:m,payload:p});}
function fail(res,m,s=400){return res.status(s).json({success:false,message:m});}

// ─── Channels ────────────────────────────────────────────────────────────────

export async function list_channels(req,res,next){
  try{
    const userId = req.user.id;
    const channels = await prisma.channels.findMany({
      where:{
        is_archived:false,
        OR:[
          {type:'PUBLIC'},
          {members:{some:{user_id:userId}}},
        ],
      },
      include:{
        _count:{select:{messages:true,members:true}},
        members:{
          where:{user_id:userId},
          select:{last_read_at:true,user_id:true},
        },
        messages:{
          where:{deleted_at:null},
          orderBy:{created_at:'desc'},
          take:1,
          include:{user:{select:{id:true,first_name:true,last_name:true}}},
        },
      },
      orderBy:{updated_at:'desc'},
    });
    return ok(res,{records:channels,total:channels.length});
  }catch(e){next(e);}
}

export async function get_channel(req,res,next){
  try{
    const userId = req.user.id;
    const ch = await prisma.channels.findUnique({
      where:{id:req.params.id},
      include:{
        members:{
          include:{user:{select:{id:true,first_name:true,last_name:true,avatar:true,designation:true}}},
          orderBy:{joined_at:'asc'},
        },
        _count:{select:{messages:true,members:true}},
      },
    });
    if(!ch) return fail(res,'Channel not found',404);
    if(ch.type==='PRIVATE'){
      const isMember=ch.members.some(m=>m.user_id===userId);
      const isAdmin=req.user.roles?.some(r=>['SUPER_ADMIN','ADMIN'].includes(r));
      if(!isMember&&!isAdmin) return fail(res,'Access denied',403);
    }
    return ok(res,ch);
  }catch(e){next(e);}
}

export async function create_channel(req,res,next){
  try{
    const{name,description,type,entity_type,entity_id}=req.body;
    if(!name)return fail(res,'name required');
    const ch=await prisma.channels.create({
      data:{name,description,type:type||'PUBLIC',entity_type,entity_id,created_by:req.user.id},
      include:{_count:{select:{messages:true,members:true}}},
    });
    await prisma.channel_members.create({data:{channel_id:ch.id,user_id:req.user.id,role:'OWNER'}});
    return ok(res,ch,'Channel created',201);
  }catch(e){next(e);}
}

export async function update_channel(req,res,next){
  try{
    const userId=req.user.id;
    const{name,description,type}=req.body;
    const ch=await prisma.channels.findUnique({where:{id:req.params.id},include:{members:{where:{user_id:userId}}}});
    if(!ch) return fail(res,'Not found',404);
    const myRole=ch.members[0]?.role;
    const isAdmin=req.user.roles?.some(r=>['SUPER_ADMIN','ADMIN'].includes(r));
    if(!isAdmin&&!['OWNER','ADMIN'].includes(myRole)) return fail(res,'Only channel admin/owner can update',403);
    const updated=await prisma.channels.update({
      where:{id:req.params.id},
      data:{
        ...(name?{name}:{}),
        ...(description!==undefined?{description}:{}),
        ...(type?{type}:{}),
      },
    });
    return ok(res,updated,'Channel updated');
  }catch(e){next(e);}
}

export async function archive_channel(req,res,next){
  try{
    const ch=await prisma.channels.findUnique({where:{id:req.params.id},include:{members:{where:{user_id:req.user.id}}}});
    if(!ch) return fail(res,'Not found',404);
    const isAdmin=req.user.roles?.some(r=>['SUPER_ADMIN','ADMIN'].includes(r));
    if(!isAdmin&&ch.members[0]?.role!=='OWNER') return fail(res,'Only owner can archive',403);
    await prisma.channels.update({where:{id:req.params.id},data:{is_archived:true}});
    return ok(res,null,'Channel archived');
  }catch(e){next(e);}
}

export async function join_channel(req,res,next){
  try{
    const m=await prisma.channel_members.upsert({
      where:{channel_id_user_id:{channel_id:req.params.id,user_id:req.user.id}},
      update:{},
      create:{channel_id:req.params.id,user_id:req.user.id},
    });
    return ok(res,m,'Joined channel');
  }catch(e){next(e);}
}

// ─── Channel Members ──────────────────────────────────────────────────────────

export async function list_members(req,res,next){
  try{
    const userId=req.user.id;
    const ch=await prisma.channels.findUnique({where:{id:req.params.id}});
    if(!ch) return fail(res,'Not found',404);
    if(ch.type==='PRIVATE'){
      const isMember=await prisma.channel_members.findUnique({where:{channel_id_user_id:{channel_id:req.params.id,user_id:userId}}});
      if(!isMember) return fail(res,'Access denied',403);
    }
    const members=await prisma.channel_members.findMany({
      where:{channel_id:req.params.id},
      include:{user:{select:{id:true,first_name:true,last_name:true,avatar:true,designation:true,email:true}}},
      orderBy:{joined_at:'asc'},
      take:500,
    });
    return ok(res,{records:members,total:members.length});
  }catch(e){next(e);}
}

export async function add_member(req,res,next){
  try{
    const userId=req.user.id;
    const{user_id,role='MEMBER'}=req.body;
    if(!user_id) return fail(res,'user_id required');
    const ch=await prisma.channels.findUnique({where:{id:req.params.id},include:{members:{where:{user_id:userId}}}});
    if(!ch) return fail(res,'Not found',404);
    const myRole=ch.members[0]?.role;
    const isAdmin=req.user.roles?.some(r=>['SUPER_ADMIN','ADMIN'].includes(r));
    if(!isAdmin&&!['OWNER','ADMIN'].includes(myRole)) return fail(res,'Only channel admin/owner can add members',403);
    const member=await prisma.channel_members.upsert({
      where:{channel_id_user_id:{channel_id:req.params.id,user_id}},
      update:{role},
      create:{channel_id:req.params.id,user_id,role},
      include:{user:{select:{id:true,first_name:true,last_name:true,avatar:true,designation:true}}},
    });
    return ok(res,member,'Member added',201);
  }catch(e){next(e);}
}

export async function remove_member(req,res,next){
  try{
    const userId=req.user.id;
    const{memberId}=req.params;
    const ch=await prisma.channels.findUnique({where:{id:req.params.id},include:{members:{where:{user_id:userId}}}});
    if(!ch) return fail(res,'Not found',404);
    const myRole=ch.members[0]?.role;
    const isAdmin=req.user.roles?.some(r=>['SUPER_ADMIN','ADMIN'].includes(r));
    if(memberId!==userId&&!isAdmin&&!['OWNER','ADMIN'].includes(myRole)) return fail(res,'Only channel admin/owner can remove members',403);
    await prisma.channel_members.deleteMany({where:{channel_id:req.params.id,user_id:memberId}});
    return ok(res,null,'Member removed');
  }catch(e){next(e);}
}

export async function update_member_role(req,res,next){
  try{
    const userId=req.user.id;
    const{memberId}=req.params;
    const{role}=req.body;
    if(!['OWNER','ADMIN','MEMBER'].includes(role)) return fail(res,'Invalid role');
    const ch=await prisma.channels.findUnique({where:{id:req.params.id},include:{members:{where:{user_id:userId}}}});
    if(!ch) return fail(res,'Not found',404);
    const myRole=ch.members[0]?.role;
    const isAdmin=req.user.roles?.some(r=>['SUPER_ADMIN','ADMIN'].includes(r));
    if(!isAdmin&&myRole!=='OWNER') return fail(res,'Only owner can change roles',403);
    const updated=await prisma.channel_members.updateMany({where:{channel_id:req.params.id,user_id:memberId},data:{role}});
    return ok(res,updated);
  }catch(e){next(e);}
}

// ─── DM Support ──────────────────────────────────────────────────────────────

export async function get_or_create_dm(req,res,next){
  try{
    const userId=req.user.id;
    const{target_user_id}=req.body;
    if(!target_user_id)return fail(res,'target_user_id required');
    if(target_user_id===userId)return fail(res,'Cannot DM yourself');

    const existing=await prisma.channels.findFirst({
      where:{
        type:'DM',
        AND:[
          {members:{some:{user_id:userId}}},
          {members:{some:{user_id:target_user_id}}},
        ],
      },
      include:{
        members:{include:{user:{select:{id:true,first_name:true,last_name:true,avatar:true,designation:true}}}},
        messages:{where:{deleted_at:null},orderBy:{created_at:'desc'},take:1,include:{user:{select:{id:true,first_name:true,last_name:true}}}},
      },
    });
    if(existing)return ok(res,existing);

    const channel=await prisma.$transaction(async(tx)=>{
      const target=await tx.users.findUnique({where:{id:target_user_id},select:{first_name:true,last_name:true}});
      const me=await tx.users.findUnique({where:{id:userId},select:{first_name:true,last_name:true}});
      const name=`${me?.first_name||''} & ${target?.first_name||''}`;
      const ch=await tx.channels.create({data:{name,type:'DM',created_by:userId}});
      await tx.channel_members.createMany({
        data:[
          {channel_id:ch.id,user_id:userId},
          {channel_id:ch.id,user_id:target_user_id},
        ],
      });
      return tx.channels.findUnique({
        where:{id:ch.id},
        include:{
          members:{include:{user:{select:{id:true,first_name:true,last_name:true,avatar:true,designation:true}}}},
          messages:{where:{deleted_at:null},orderBy:{created_at:'desc'},take:1,include:{user:{select:{id:true,first_name:true,last_name:true}}}},
        },
      });
    });
    return res.status(201).json({success:true,payload:channel});
  }catch(e){next(e);}
}

export async function create_group(req,res,next){
  try{
    const userId=req.user.id;
    const{name,member_ids=[]}=req.body;
    if(!name?.trim())return fail(res,'name required');
    const allMembers=[...new Set([userId,...member_ids])];
    const channel=await prisma.$transaction(async(tx)=>{
      const ch=await tx.channels.create({data:{name:name.trim(),type:'GROUP',created_by:userId}});
      await tx.channel_members.createMany({
        data:allMembers.map(uid=>({channel_id:ch.id,user_id:uid,role:uid===userId?'OWNER':'MEMBER'})),
      });
      return tx.channels.findUnique({
        where:{id:ch.id},
        include:{
          members:{include:{user:{select:{id:true,first_name:true,last_name:true,avatar:true}}}},
          messages:{where:{deleted_at:null},orderBy:{created_at:'desc'},take:1},
        },
      });
    });
    return res.status(201).json({success:true,payload:channel});
  }catch(e){next(e);}
}

export async function create_private_channel(req,res,next){
  try{
    const userId=req.user.id;
    const{name,description,member_ids=[]}=req.body;
    if(!name?.trim()) return fail(res,'name required');
    const allMembers=[...new Set([userId,...member_ids])];
    const channel=await prisma.$transaction(async(tx)=>{
      const ch=await tx.channels.create({
        data:{name:name.trim(),description,type:'PRIVATE',created_by:userId},
      });
      await tx.channel_members.createMany({
        data:allMembers.map(uid=>({channel_id:ch.id,user_id:uid,role:uid===userId?'OWNER':'MEMBER'})),
      });
      return tx.channels.findUnique({
        where:{id:ch.id},
        include:{
          members:{include:{user:{select:{id:true,first_name:true,last_name:true,avatar:true}}}},
          _count:{select:{messages:true,members:true}},
        },
      });
    });
    return res.status(201).json({success:true,payload:channel});
  }catch(e){next(e);}
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function get_messages(req,res,next){
  try{
    const{page=1,limit=50}=req.query;
    const skip=(+page-1)*+limit;
    const msgs=await prisma.messages.findMany({
      where:{channel_id:req.params.id,deleted_at:null,parent_id:null},
      orderBy:{created_at:'desc'},
      skip,
      take:+limit,
      include:{
        user:{select:{id:true,first_name:true,last_name:true,avatar:true}},
        reactions:{select:{id:true,user_id:true,emoji:true,created_at:true}},
        _count:{select:{replies:true}},
      },
    });
    await prisma.channel_members.upsert({
      where:{channel_id_user_id:{channel_id:req.params.id,user_id:req.user.id}},
      update:{last_read_at:new Date()},
      create:{channel_id:req.params.id,user_id:req.user.id,last_read_at:new Date()},
    }).catch(()=>{});
    return ok(res,{records:msgs.reverse(),total:msgs.length,page:+page});
  }catch(e){next(e);}
}

export async function send_message(req,res,next){
  try{
    const{content,parent_id,file_url,file_name,file_size,mime_type}=req.body;
    if(!content?.trim()&&!file_url) return fail(res,'content or file_url required');
    const msg=await prisma.messages.create({
      data:{
        channel_id:req.params.id,
        user_id:req.user.id,
        content:content?.trim()||'',
        parent_id:parent_id||null,
        file_url:file_url||null,
        file_name:file_name||null,
        file_size:file_size||null,
        mime_type:mime_type||null,
      },
      include:{
        user:{select:{id:true,first_name:true,last_name:true,avatar:true}},
        reactions:{},
        _count:{select:{replies:true}},
      },
    });
    await prisma.channel_members.upsert({
      where:{channel_id_user_id:{channel_id:req.params.id,user_id:req.user.id}},
      update:{last_read_at:new Date()},
      create:{channel_id:req.params.id,user_id:req.user.id,last_read_at:new Date()},
    }).catch(()=>{});
    await prisma.channels.update({where:{id:req.params.id},data:{updated_at:new Date()}}).catch(()=>{});
    return ok(res,msg,'Message sent',201);
  }catch(e){next(e);}
}

export async function edit_message(req,res,next){
  try{
    const msg=await prisma.messages.findFirst({where:{id:req.params.msgId}});
    if(!msg) return fail(res,'Not found',404);
    if(msg.user_id!==req.user.id) return fail(res,"Cannot edit others' messages",403);
    if(!req.body.content?.trim()) return fail(res,'content required');
    const updated=await prisma.messages.update({
      where:{id:req.params.msgId},
      data:{content:req.body.content.trim(),is_edited:true,edited_at:new Date()},
      include:{
        user:{select:{id:true,first_name:true,last_name:true,avatar:true}},
        reactions:{},
        _count:{select:{replies:true}},
      },
    });
    return ok(res,updated);
  }catch(e){next(e);}
}

export async function delete_message(req,res,next){
  try{
    const msg=await prisma.messages.findFirst({where:{id:req.params.msgId}});
    if(!msg)return fail(res,'Not found',404);
    if(msg.user_id!==req.user.id&&!req.user.roles?.some(r=>['ADMIN','SUPER_ADMIN'].includes(r)))return fail(res,'Forbidden',403);
    await prisma.messages.update({where:{id:req.params.msgId},data:{deleted_at:new Date()}});
    return ok(res,null,'Message deleted');
  }catch(e){next(e);}
}

// ─── Threads ──────────────────────────────────────────────────────────────────

export async function get_thread(req,res,next){
  try{
    const{msgId}=req.params;
    const userId=req.user.id;

    const parent=await prisma.messages.findUnique({
      where:{id:msgId},
      include:{
        user:{select:{id:true,first_name:true,last_name:true,avatar:true}},
        reactions:{select:{id:true,user_id:true,emoji:true,created_at:true}},
        _count:{select:{replies:true}},
      },
    });
    if(!parent) return fail(res,'Message not found',404);

    const ch=await prisma.channels.findUnique({where:{id:parent.channel_id}});
    if(ch?.type==='PRIVATE'){
      const isMember=await prisma.channel_members.findUnique({where:{channel_id_user_id:{channel_id:ch.id,user_id:userId}}});
      if(!isMember) return fail(res,'Access denied',403);
    }

    const replies=await prisma.messages.findMany({
      where:{parent_id:msgId,deleted_at:null},
      orderBy:{created_at:'asc'},
      take:500,
      include:{
        user:{select:{id:true,first_name:true,last_name:true,avatar:true}},
        reactions:{select:{id:true,user_id:true,emoji:true,created_at:true}},
      },
    });

    return ok(res,{parent,replies});
  }catch(e){next(e);}
}

// ─── Reactions ────────────────────────────────────────────────────────────────

export async function add_reaction(req,res,next){
  try{
    const{emoji}=req.body;
    if(!emoji)return fail(res,'emoji required');
    const r=await prisma.message_reactions.upsert({
      where:{message_id_user_id_emoji:{message_id:req.params.msgId,user_id:req.user.id,emoji}},
      update:{},
      create:{message_id:req.params.msgId,user_id:req.user.id,emoji},
    });
    return ok(res,r);
  }catch(e){next(e);}
}

export async function remove_reaction(req,res,next){
  try{
    await prisma.message_reactions.deleteMany({where:{message_id:req.params.msgId,user_id:req.user.id,emoji:req.body.emoji}});
    return ok(res,null,'Reaction removed');
  }catch(e){next(e);}
}

// ─── Users for chat ──────────────────────────────────────────────────────────

export async function list_users_for_chat(req,res,next){
  try{
    const{search}=req.query;
    const where={deleted_at:null,id:{not:req.user.id}};
    if(search){
      where.OR=[
        {first_name:{contains:search,mode:'insensitive'}},
        {last_name:{contains:search,mode:'insensitive'}},
        {email:{contains:search,mode:'insensitive'}},
      ];
    }
    const users=await prisma.users.findMany({
      where,
      select:{id:true,first_name:true,last_name:true,email:true,avatar:true,designation:true},
      take:20,
      orderBy:{first_name:'asc'},
    });
    return ok(res,users);
  }catch(e){next(e);}
}
