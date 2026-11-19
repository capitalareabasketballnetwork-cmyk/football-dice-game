import {getCache} from '@vercel/functions';

const cache=getCache({namespace:'dieball-tv'});
const ROOM_TTL=7200;
const okCode=v=>typeof v==='string'&&/^[A-HJ-NP-Z2-9]{6}$/.test(v);
const okToken=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{16,128}$/.test(v);
const roomKey=code=>'room:'+code;
const msgKey=(code,direction,side,seq)=>'event:'+code+':'+direction+':'+side+':'+seq;
function response(res,code,data){
 res.statusCode=code;res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('X-Content-Type-Options','nosniff');
 res.end(JSON.stringify(data));
}
function requireRole(room,role,token,side){
 if(role==='host')return room.hostToken===token;
 if(role==='player'&&(side===0||side===1))return room.slots[side]?.token===token;
 return false;
}
function cleanName(name){return String(name||'').trim().replace(/[<>]/g,'').slice(0,20)}
async function readMessages(code,direction,side,last){
 const out=[];
 let seq=Math.max(0,Math.min(50000,Number(last)||0));
 for(let i=0;i<16;i++){
  const next=await cache.get(msgKey(code,direction,side,seq+1));
  if(next===undefined||next===null)break;
  seq++;out.push({side,seq,payload:next});
 }
 return out;
}
export default async function handler(req,res){
 if(req.method!=='GET'&&req.method!=='POST'){res.setHeader('Allow','GET, POST');return response(res,405,{error:'Method not allowed'})}
 try{
  if(req.method==='GET'&&req.query?.op==='health')return response(res,200,{ok:true,transport:'runtime-cache',version:2});
  const input=req.method==='POST'?(typeof req.body==='string'?JSON.parse(req.body||'{}'):req.body||{}):req.query||{};
  const op=String(input.op||''),code=String(input.code||'').toUpperCase(),role=String(input.role||''),token=String(input.token||'');
  if(!okCode(code))return response(res,400,{error:'Invalid room code'});
  if(!okToken(token))return response(res,400,{error:'Invalid token'});
  let room=await cache.get(roomKey(code));
  if(req.method==='POST'&&op==='host'){
   if(room&&Date.now()-room.createdAt<ROOM_TTL*1000)return response(res,409,{error:'Room code already in use'});
   room={hostToken:token,createdAt:Date.now(),slots:[null,null],closed:false};
   await cache.set(roomKey(code),room,{ttl:ROOM_TTL,name:'dieball-tv-room'});
   return response(res,200,{ok:true,code});
  }
  if(!room||room.closed)return response(res,404,{error:'Host room not available. Create a new TV room.'});
  if(req.method==='POST'&&op==='join'){
   const name=cleanName(input.name);
   if(name.length<2)return response(res,400,{error:'Enter your player name'});
   let side=room.slots.findIndex(x=>x&&x.token===token);
   if(side<0)side=room.slots.findIndex(x=>!x);
   if(side<0)return response(res,409,{error:'Both team slots are occupied'});
   room.slots[side]={token,name,joinedAt:Date.now()};
   await cache.set(roomKey(code),room,{ttl:ROOM_TTL,name:'dieball-tv-room'});
   return response(res,200,{ok:true,side,code,names:room.slots.map(x=>x?.name||'')});
  }
  const side=Number(input.side);
  if(!requireRole(room,role,token,side))return response(res,403,{error:'Room access denied. Check your code and try again.'});
  if(req.method==='POST'&&op==='send'){
   const seq=Number(input.seq),direction=role==='host'?'down':'up',message=input.payload;
   if(!Number.isInteger(seq)||seq<1||seq>50000||JSON.stringify(message||null).length>20000)return response(res,400,{error:'Invalid message'});
   await cache.set(msgKey(code,direction,side,seq),message,{ttl:ROOM_TTL,name:'dieball-tv-msg'});
   return response(res,200,{ok:true,seq});
  }
  if(req.method==='POST'&&op==='leave'){
   if(role==='host'){await cache.delete(roomKey(code))}
   else{
    room.slots[side]=null;
    await cache.set(roomKey(code),room,{ttl:ROOM_TTL,name:'dieball-tv-room'});
   }
   return response(res,200,{ok:true});
  }
  if(req.method==='GET'&&op==='poll'){
   if(role==='host'){
    const last0=Number(input.last0)||0,last1=Number(input.last1)||0;
    const messages=(await Promise.all([
     readMessages(code,'up',0,last0),readMessages(code,'up',1,last1)
    ])).flat().sort((a,b)=>a.seq-b.seq);
    return response(res,200,{ok:true,slots:room.slots.map(x=>x?{name:x.name}:null),messages});
   }
   const messages=await readMessages(code,'down',side,Number(input.last)||0);
   return response(res,200,{ok:true,messages});
  }
  return response(res,400,{error:'Unsupported room operation'});
 }catch(err){
  console.error('DieBall TV room API:',err?.message||err);
  return response(res,500,{error:'TV room service temporarily unavailable'});
 }
}
