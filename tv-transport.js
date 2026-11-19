/* DieBall TV transport — same-origin polling relay over shared Vercel Runtime Cache.
   No PeerJS, WebRTC, NAT traversal, or public signaling servers required.
   Rooms are ephemeral and this is an early-access beta, not durable matchmaking. */
'use strict';
(()=>{
 const endpoint='/api/tv-room';
 const secureId=()=>{
  const bytes=new Uint8Array(24);crypto.getRandomValues(bytes);
  return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 };
 const pause=ms=>new Promise(done=>setTimeout(done,ms));
 async function api(data,method='POST'){
  const options={method,cache:'no-store',headers:{'Accept':'application/json'}};
  let url=endpoint;
  if(method==='GET'){url+='?'+new URLSearchParams(data).toString()}
  else {options.headers['Content-Type']='application/json';options.body=JSON.stringify(data)}
  const r=await fetch(url,options),body=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(new Error(body.error||'Room service returned '+r.status),{status:r.status});
  return body;
 }
 class Events{
  constructor(){this.handlers=new Map()}
  on(event,callback){if(!this.handlers.has(event))this.handlers.set(event,[]);this.handlers.get(event).push(callback);return this}
  emit(event,...args){for(const callback of this.handlers.get(event)||[]){try{callback(...args)}catch(err){console.error('DieBall TV listener:',err)}}}
 }
 class RelayConn extends Events{
  constructor(peer,side,role){super();this.peer=peer;this.side=side;this.role=role;this.open=true;this.seq=0;this.queue=Promise.resolve()}
  send(payload){
   if(!this.open||this.peer.destroyed)return;
   if(this.role==='player'&&payload?.t==='join'){
    this.peer.joinAs(payload.name,this);return;
   }
   const item={op:'send',code:this.peer.code,token:this.peer.token,role:this.role,side:this.side,seq:++this.seq,payload};
   this.queue=this.queue.then(async()=>{
    for(let retry=0;retry<6&&!this.peer.destroyed;retry++){
     try{await api(item);return}catch(err){
      if(retry===5){this.emit('error',err);throw err}
      await pause(Math.min(4000,350*Math.pow(2,retry)));
     }
    }
   }).catch(err=>console.warn('DieBall TV relay send:',err.message));
  }
  close(){
   if(!this.open)return;
   this.open=false;
   this.emit('close');
  }
 }
 class RelayPeer extends Events{
  constructor(id){
   super();
   this.host=typeof id==='string'&&id.startsWith('dieball-');
   this.code=this.host?id.slice(8).toUpperCase():'';
   this.token=secureId();this.destroyed=false;this.disconnected=false;
   this.connections=[null,null];this.lastUp=[0,0];this.lastDown=0;this.failures=0;
   this.polling=false;this.client=null;
   if(this.host)this.startHost();
   else queueMicrotask(()=>{if(!this.destroyed)this.emit('open','dieball-client')});
  }
  async startHost(){
   try{
    await api({op:'host',code:this.code,token:this.token});
    if(this.destroyed)return;
    this.emit('open','dieball-'+this.code.toLowerCase());
    this.poll();
   }catch(err){
    if(!this.destroyed)this.emit('error',{type:'network',message:'Unable to register room: '+err.message});
   }
  }
  connect(hostId){
   if(this.host)throw Error('A host cannot join from its own screen');
   this.code=hostId.replace(/^dieball-/i,'').toUpperCase();
   const c=new RelayConn(this,-1,'player');this.client=c;
   queueMicrotask(()=>{if(!this.destroyed)c.emit('open')});
   return c;
  }
  async joinAs(name,connection){
   try{
    const info=await api({op:'join',code:this.code,token:this.token,name});
    if(this.destroyed)return;
    connection.side=info.side;
    connection.emit('data',{t:'assigned',side:info.side,room:this.code,names:info.names});
    // Mirror the original join action for the host-side connection handler.
    connection.send({t:'join',name});
    this.poll();
   }catch(err){
    if(this.destroyed)return;
    connection.emit('error',err);
    this.emit('error',{type:err.status===404?'peer-unavailable':'network',message:err.message});
   }
  }
  async poll(){
   if(this.polling||this.destroyed)return;this.polling=true;
   while(!this.destroyed){
    try{
     if(this.host){
      const result=await api({op:'poll',role:'host',code:this.code,token:this.token,last0:this.lastUp[0],last1:this.lastUp[1]},'GET');
      for(let side=0;side<2;side++){
       const present=!!result.slots?.[side],conn=this.connections[side];
       if(present&&!conn){
        const c=new RelayConn(this,side,'host');
        this.connections[side]=c;this.emit('connection',c);
       }else if(!present&&conn){conn.close();this.connections[side]=null}
      }
      for(const msg of result.messages||[]){
       const side=msg.side;
       if(side!==0&&side!==1)continue;
       this.lastUp[side]=Math.max(this.lastUp[side],msg.seq);
       this.connections[side]?.emit('data',msg.payload);
      }
     }else if(this.client?.side>=0){
      const result=await api({op:'poll',role:'player',code:this.code,token:this.token,side:this.client.side,last:this.lastDown},'GET');
      for(const msg of result.messages||[]){
       this.lastDown=Math.max(this.lastDown,msg.seq);
       this.client?.emit('data',msg.payload);
      }
     }
     this.failures=0;
     if(this.disconnected){this.disconnected=false;this.emit('open',this.host?'dieball-'+this.code.toLowerCase():'dieball-client')}
    }catch(err){
     this.failures++;
     if(this.failures===3){
      this.disconnected=true;
      this.emit('disconnected');
     }
     if(err.status===403||err.status===404){
      this.emit('error',{type:'network',message:err.message});
      break;
     }
    }
    await pause(this.failures?Math.min(4000,500*this.failures):850);
   }
   this.polling=false;
  }
  reconnect(){this.disconnected=false;if(!this.polling&&!this.destroyed)this.poll()}
  destroy(){
   this.destroyed=true;this.polling=false;
   this.connections.forEach(c=>c?.close());this.client?.close();
   if(this.code){
    const role=this.host?'host':'player',side=this.client?.side??-1;
    const payload=JSON.stringify({op:'leave',code:this.code,token:this.token,role,side});
    if(navigator.sendBeacon){
     navigator.sendBeacon(endpoint,new Blob([payload],{type:'application/json'}));
    }else{
     fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:payload,keepalive:true}).catch(()=>{});
    }
   }
  }
 }
 window.Peer=RelayPeer;
})();
