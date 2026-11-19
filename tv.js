'use strict';
/* DieBall TV beta: host browser owns match state. Public PeerJS cloud handles WebRTC signaling. */
const E=id=>document.getElementById(id);
const rand=n=>1+Math.floor(Math.random()*n),sum=a=>(a||[]).reduce((x,y)=>x+y,0),clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const escapeText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let role='',room='',peer=null,connection=null,seat=-1,links=[null,null],names=['',''],G=null,V=null;
let selected=new Set(),cardsShown=false,kickType=null,kickValue=0,kickDir=1,kickTimer=null,hostSpinTimer=null,clientSpinTimer=null;
let hostRollSeen=[0,0],hostSpinUntil=[0,0],clientRollSeen=-1,clientSpinUntil=0,seenFlight=0;
const screens=['chooseScreen','lobbyScreen','joinScreen','waitingScreen','hostScreen','controllerScreen'];
function showScreen(id){for(const x of screens)E(x).hidden=x!==id;window.scrollTo(0,0)}
function tell(text,id='lobbyStatus'){if(E(id))E(id).textContent=text}
function nameOf(side){return names[side]|| (side===0?'Home':'Away')}
function makeCode(){let chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',b=new Uint8Array(6);crypto.getRandomValues(b);return Array.from(b,v=>chars[v%chars.length]).join('')}
function exitGame(){if(peer)peer.destroy();clearInterval(kickTimer);clearInterval(hostSpinTimer);clearInterval(clientSpinTimer);location.href='/'}
function showJoinForm(){showScreen('joinScreen');E('joinError').textContent='';E('joinName').focus()}
function hostGame(){
 role='host';if(typeof window.Peer!=='function'){showScreen('lobbyScreen');tell('Connection library could not load. Check internet access.');return}
 room=makeCode();names=['',''];links=[null,null];G=null;
 E('lobbyCode').textContent=room;E('joinAddress').textContent=location.host+'/tv';
 showScreen('lobbyScreen');lobby();
 peer=new Peer('dieball-'+room.toLowerCase());
 peer.on('open',()=>tell('Room online. Waiting for players.'));
 peer.on('connection',registerConnection);
 peer.on('error',e=>tell('Room error: '+(e.message||e.type)+'. Exit and create a new room.'));
 peer.on('disconnected',()=>tell('Room signaling disconnected. Check your network.'));
}
function lobby(){
 E('homeSlot').textContent=names[0]||'Waiting for player...';
 E('awaySlot').textContent=names[1]||'Waiting for player...';
 E('homeSlot').classList.toggle('empty',!names[0]);E('awaySlot').classList.toggle('empty',!names[1]);
 E('startHostGame').disabled=!(links[0]?.open&&links[1]?.open&&!G);
}
function registerConnection(c){
 c.on('data',m=>{
  if(!m||typeof m!=='object')return;
  let side=links.indexOf(c);
  if(m.t==='join'){
   if(side>=0)return;
   if(G){c.send({t:'reject',reason:'This game already started.'});return}
   side=links.findIndex(x=>!x);
   if(side<0){c.send({t:'reject',reason:'Room is full.'});return}
   const name=String(m.name||'').trim().slice(0,20);
   if(name.length<2){c.send({t:'reject',reason:'Enter a player name.'});return}
   names[side]=name;links[side]=c;
   c.send({t:'assigned',side,room,names:[...names]});
   lobby();tell(names.filter(Boolean).length+' of 2 players connected.');return;
  }
  if(side>=0&&m.t==='action'&&G)action(side,m.action||{});
 });
 c.on('close',()=>{const side=links.indexOf(c);if(side<0)return;links[side]=null;if(!G){names[side]='';lobby();tell('Player left. Slot available.')}else{G.message=nameOf(side)+' disconnected. The room cannot continue without both players.';broadcast()}});
 c.on('error',()=>{});
}
function joinGame(ev){
 ev.preventDefault();
 const player=E('joinName').value.trim().slice(0,20),code=E('joinCode').value.trim().toUpperCase();
 if(player.length<2||!/^[A-Z2-9]{6}$/.test(code)){tell('Enter a name and 6-character game code.','joinError');return}
 if(typeof window.Peer!=='function'){tell('Connection library unavailable. Check internet.','joinError');return}
 room=code;role='player';tell('Connecting to host...','joinError');peer=new Peer();
 peer.on('open',()=>{
  connection=peer.connect('dieball-'+room.toLowerCase(),{reliable:true,serialization:'json'});
  connection.on('open',()=>connection.send({t:'join',name:player}));
  connection.on('data',receive);
  connection.on('close',()=>{tell('Disconnected from host.','waitStatus');tell('Host connection lost.','controllerError')});
  connection.on('error',()=>tell('Failed to connect. Please try again.','joinError'));
 });
 peer.on('error',err=>tell(err.type==='peer-unavailable'?'No active room matches that code.':err.message||String(err.type),'joinError'));
}
function receive(m){
 if(!m||typeof m!=='object')return;
 if(m.t==='reject'){tell(m.reason||'Room unavailable.','joinError');connection?.close();return}
 if(m.t==='assigned'){
  seat=m.side;names=m.names;room=m.room;E('waitingCode').textContent=room;
  E('waitingInfo').textContent='Joined as '+nameOf(seat)+' · '+(seat===0?'HOME':'AWAY')+'. Waiting for the host.';
  E('controllerRoom').textContent='ROOM '+room;showScreen('waitingScreen');return;
 }
 if(m.t==='state'){
  const before=V;V={...m.public,hand:m.cards};names=V.names;
  if(before?.stage!==V.stage||before?.hand?.length!==V.hand.length)selected.clear();
  showScreen('controllerScreen');renderController();
 }
}
function sendAction(payload){if(connection?.open)connection.send({t:'action',action:payload})}
function shuffledDeck(){let d=[];for(let n=2;n<=9;n++)for(let i=0;i<4;i++)d.push(n);for(let i=0;i<16;i++)d.push(10);for(let i=0;i<4;i++)d.push(11);for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]]}return d}
function deal(){if(G.deck.length<6)G.deck=shuffledDeck();G.hands=[G.deck.splice(0,3),G.deck.splice(0,3)]}
function startHostedMatch(){
 if(!links.every(c=>c?.open))return;
 G={stage:'play',scores:[0,0],off:0,pos:35,goal:45,down:1,passes:2,play:'run',
 ready:[false,false],dice:[null,null],rollSeq:[0,0],net:null,move:null,
 deck:shuffledDeck(),hands:[[],[]],usedCards:[false,false],cardPicks:[null,null],starter:-1,
 convKind:0,convPicks:[null,null],convCommitted:[false,false],convNet:0,
 results:[[],[]],startScore:0,lastDrive:[false,false],flight:null,flightId:0,
 serial:0,annId:0,announcement:null,message:'HOME takes possession. Both players roll.'};
 deal();E('gameCode').textContent=room;showScreen('hostScreen');broadcast();announce('Game On!','gold','Both teams ready',2100);
}
function sharePublic(){
 const {hands,deck,cardPicks,convPicks,...publicState}=G;
 return {...publicState,names:[...names],cardCounts:hands.map(x=>x.length),
  cardPending:cardPicks.map(x=>x===null?null:x.length),
  convPending:convPicks.map(x=>x===null?null:x.length)};
}
function broadcast(){
 if(!G)return;
 if(role==='host')renderHost();
 const shared=sharePublic();links.forEach((c,i)=>{if(c?.open)try{c.send({t:'state',public:shared,cards:[...G.hands[i]]})}catch(e){}});
}
function announce(title,tone='gold',detail='',duration=2000){
 if(!G)return;const id=++G.annId;G.announcement={title,tone,detail};broadcast();
 if(duration>0)setTimeout(()=>{if(G&&id===G.annId){G.announcement=null;broadcast()}},duration);
}
function downText(g){if(g.stage==='finished')return 'FINAL';const n=g.down;return (n===1?'1st':n===2?'2nd':n===3?'3rd':'4th')+' & '+Math.abs(g.goal-g.pos)}
function fieldPosition(g){const y=g.off===0?g.pos:100-g.pos;return y<=50?'OWN '+Math.round(y):'OPP '+Math.round(100-y)}
function validPicks(side,values){
 if(!Array.isArray(values)||values.length>3)return null;const hand=G.hands[side],u=new Set();
 for(const k of values){if(!Number.isInteger(k)||k<0||k>=hand.length||u.has(k))return null;u.add(k)}
 return [...u];
}
function removePicks(side,picks){const h=G.hands[side],values=picks.map(k=>h[k]);G.hands[side]=h.filter((_,i)=>!picks.includes(i));return values}
function recordDrive(){const n=Math.max(0,G.scores[G.off]-G.startScore);if(G.results[G.off].length<8)G.results[G.off].push(n)}
function endDrive(location,description){
 recordDrive();
 if(G.results[0].length>=8&&G.results[1].length>=8){
  G.stage='finished';G.ready=[false,false];G.dice=[null,null];
  const winner=G.scores[0]===G.scores[1]?'Game Tied':nameOf(G.scores[0]>G.scores[1]?0:1)+' Wins!';
  G.message='FINAL '+G.scores.join(' – ');announce(winner,'gold',G.message,0);return;
 }
 G.off=1-G.off;G.pos=clamp(location,1,99);G.goal=clamp(G.pos+(G.off===0?10:-10),0,100);
 G.down=1;G.passes=2;G.play='run';G.ready=[false,false];G.dice=[null,null];G.net=null;G.move=null;
 G.usedCards=[false,false];G.cardPicks=[null,null];G.starter=-1;G.convKind=0;G.convPicks=[null,null];G.convNet=0;
 G.stage='play';G.flight=null;G.message=description+' · '+nameOf(G.off)+' takes over.';
 deal();G.startScore=G.scores[G.off];broadcast();
 if(G.results[G.off].length===7&&!G.lastDrive[G.off]){G.lastDrive[G.off]=true;announce(nameOf(G.off)+"'s last drive",'gold','Final possession',2700)}
}
function firstDown(y,card=false){
 G.down=1;G.goal=clamp(G.pos+(G.off===0?10:-10),0,100);
 G.message=nameOf(G.off)+' FIRST DOWN · '+(y>=0?'+':'')+y+' yards';
 announce('First Down','good',card?'Penalty cards':'New set of downs',2200);
}
function advance(y,card=false){
 const dir=G.off===0?1:-1,from=G.pos,dest=from+dir*y;
 const to=card?clamp(dest,1,99):dest;
 G.pos=clamp(to,0,100);G.move={from,to:G.pos,forward:y>=0};G.net=y;
 const earned=G.off===0?G.pos>=G.goal:G.pos<=G.goal;
 if(card){if(earned)firstDown(y,true);else{G.message='Penalty cards '+(y>=0?'+':'')+y+' yards';broadcast()}return}
 if(y>0&&(to<=0||to>=100)){
  G.scores[G.off]+=6;G.stage='conversion-choice';G.pos=G.off===0?100:0;G.message=nameOf(G.off)+' touchdown! Choose conversion.';
  announce('Touchdown',G.off===0?'good':'bad',nameOf(G.off)+' +6',3300);return;
 }
 if(y<0&&(to<=0||to>=100)){
  G.scores[1-G.off]+=2;G.stage='kickoff';G.pos=G.off===0?20:80;
  G.message='Safety! '+nameOf(1-G.off)+' +2. Conceding team kicks off.';
  announce('Safety!','bad',nameOf(1-G.off)+' +2',3000);return;
 }
 if(earned){firstDown(y);return}
 G.down++;
 if(G.down>4){endDrive(G.pos,'Turnover on downs');announce('Turnover on Downs','bad','Change of possession',2200)}
 else{G.message=(y>=0?'+':'')+y+' yards · '+downText(G);broadcast()}
}
function resolveRoll(){
 if(!G||!['play','two-ready'].includes(G.stage)||!G.ready.every(Boolean))return;
 const a=G.dice[G.off],b=G.dice[1-G.off],raw=sum(a),def=sum(b);
 G.ready=[false,false];G.usedCards=[false,false];
 const adv=(a.every(v=>v===a[0])?2*raw:raw)-def;G.net=adv;
 if(G.stage==='two-ready'){
  const needed=G.off===0?100-G.pos:G.pos,good=raw!==def&&adv>=needed;
  if(good)G.scores[G.off]+=2;
  G.stage='kickoff';G.pos=G.off===0?20:80;
  G.message=good?'Two-point conversion made.':'Two-point conversion failed.';
  announce(good?'2 points converted':'2 points not converted',good?'good':'bad',good?'+2':'NO POINTS',2700);return;
 }
 const pass=G.play==='pass';if(pass)G.passes=Math.max(0,G.passes-1);
 if(raw===def){G.stage='fumble';G.net=0;G.message='FUMBLE! Offense rolls one recovery die.';announce('Fumble!','bad','1–4 retained · 5–6 lost',2200);return}
 const y=pass?(adv>=4?adv*2:-5):adv;
 // Even a failed pass (-5) can cross the offense's own end zone for a safety.
 if(pass&&adv>=4&&y>=(G.off===0?110-G.pos:G.pos+10)){
  G.play='run';G.down++;
  if(G.down>4)endDrive(G.pos,'Turnover on downs');
  else announce('Incomplete pass','bad','Beyond back of end zone',1900);return;
 }
 G.play='run';advance(y);
}
function ballFlight(from,to,done,text){
 const id=++G.flightId,serial=G.serial;
 G.flight={id,from,to};G.stage='flight';G.message=text||'Ball flying through the air';broadcast();
 setTimeout(()=>{if(!G||G.flight?.id!==id||G.serial!==serial)return;G.flight=null;done();broadcast()},1800);
}
function doKickoff(p){
 const side=G.off,from=G.pos,k=clamp(Number(p)||0,0,100);
 let y,description;
 if(k<4){y=50;description='Kickoff out of bounds · midfield'}
 else if(k<13){y=35;description='Kickoff touchback · own 35'}
 else if(k<23){y=1+Math.floor(k-13);description='Kickoff · own '+y}
 else if(k<33){y=11+Math.floor(k-23);description='Kickoff · own '+y}
 else if(k<43){y=21+Math.floor(k-33);description='Kickoff · own '+y}
 else{y=31+Math.min(68,Math.floor((k-43)/57*69));description='Kickoff · own '+y}
 const to=side===0?100-y:y;
 ballFlight(from,to,()=>endDrive(to,description),'Kickoff in the air...');
}
function doPunt(power){
 const start=G.pos,dir=G.off===0?1:-1,to=start+dir*(16+clamp(Number(power)||65,0,100)*.63+rand(21)-11);
 const touchback=to<=0||to>=100,location=touchback?(G.off===0?65:35):clamp(to,1,99);
 ballFlight(start,clamp(to,0,100),()=>endDrive(location,touchback?'Punt touchback':'Punt landed'),'Punt in the air...');
}
function doFieldGoal(value){
 const distance=(G.off===0?100-G.pos:G.pos)+17,width=Math.max(.5,Math.min(55,55*Math.exp(-.045*(distance-20))));
 const success=Math.abs(clamp(Number(value),0,100)-50)<width/2;
 if(success){G.scores[G.off]+=3;G.pos=G.off===0?20:80;G.stage='kickoff';announce('Field Goal Good','good',nameOf(G.off)+' +3',2700)}
 else{const pos=G.pos;endDrive(pos,'Missed field goal');announce('Missed Field Goal','bad','No points',2300)}
}
function doExtraPoint(value){
 const width=Math.max(.5,Math.min(55,55*Math.exp(-.045*(42-20))+G.convNet*.7));
 const success=Math.abs(clamp(Number(value),0,100)-50)<width/2;
 if(success)G.scores[G.off]++;G.pos=G.off===0?20:80;G.stage='kickoff';
 announce(success?'Extra point good':'extra point no good',success?'good':'bad',success?'+1':'NO POINTS',2400);
}
function cards(side,indices,conversion=false){
 const valid=validPicks(side,indices);if(!valid)return;
 if(conversion){
  if(G.stage!=='conversion-cards'||G.convCommitted[side])return;
  G.convPicks[side]=valid;G.convCommitted[side]=true;
  if(G.convCommitted.every(Boolean)){
   const off=removePicks(G.off,G.convPicks[G.off]),def=removePicks(1-G.off,G.convPicks[1-G.off]);
   G.convNet=sum(off)-sum(def);G.convPicks=[null,null];
   if(G.convKind===2){G.pos=clamp(G.pos+(G.off===0?1:-1)*G.convNet,1,99);G.stage='two-ready'}
   else G.stage='xp-ready';
   G.ready=[false,false];G.dice=[null,null];
   G.message='Conversion cards committed · '+(G.convNet>=0?'+':'')+G.convNet;
   announce('Cards Committed','gold',G.convKind===2?'Both teams roll next':'Extra point kick next',1600);
  }else{G.message=nameOf(side)+' committed conversion cards. Waiting for the other team.';broadcast()}
  return;
 }
 if(G.stage==='play'){
  if(G.usedCards[side]||valid.length===0||G.ready.some(Boolean))return;
  G.stage='cards';G.starter=side;G.cardPicks=[null,null];G.cardPicks[side]=valid;G.usedCards[side]=true;
  G.message=nameOf(side)+' played '+valid.length+' card(s). Opponent can counter.';broadcast();return;
 }
 if(G.stage==='cards'&&side!==G.starter&&G.cardPicks[side]===null){
  G.cardPicks[side]=valid;if(valid.length)G.usedCards[side]=true;
  const off=removePicks(G.off,G.cardPicks[G.off]||[]),def=removePicks(1-G.off,G.cardPicks[1-G.off]||[]);
  G.cardPicks=[null,null];G.stage='play';advance(sum(off)-sum(def),true);
 }
}
function action(side,a){
 if(!G||!links[side]?.open||!a||G.stage==='flight'||G.stage==='finished')return;
 const kind=String(a.kind||'');
 if(kind==='play'&&G.stage==='play'&&side===G.off&&!G.ready.some(Boolean)){
  if(a.play==='pass'&&G.passes<=0){announce('No more Pass plays left','bad','Choose Run instead',1300);return}
  G.play=a.play==='pass'?'pass':'run';
  if(G.play==='pass')announce(nameOf(side)+' calls a Pass','gold','Pass play selected',1400);else broadcast();return;
 }
 if(kind==='cards'){cards(side,a.indices,false);return}
 if(kind==='conversionCards'){cards(side,a.indices,true);return}
 if(kind==='convert'&&G.stage==='conversion-choice'&&side===G.off){
  G.convKind=a.value===2?2:1;G.convPicks=[null,null];G.convCommitted=[false,false];G.convNet=0;
  if(G.convKind===2)G.pos=G.off===0?95:5;
  G.stage='conversion-cards';G.message='Both teams can play cards for the conversion.';broadcast();return;
 }
 if(kind==='roll'&&['play','two-ready'].includes(G.stage)&&!G.ready[side]){
  if(G.stage==='play'&&side===G.off&&G.play==='pass'&&G.passes<=0){G.play='run';announce('No more Pass plays left','bad','Choose Run',1200);return}
  G.dice[side]=Array.from({length:side===G.off?3:2},()=>rand(6));G.rollSeq[side]++;G.ready[side]=true;
  G.message=nameOf(side)+' rolled. Waiting for '+nameOf(1-side);broadcast();
  if(G.ready.every(Boolean)){const seq=++G.serial;setTimeout(()=>{if(G&&G.serial===seq&&G.ready.every(Boolean))resolveRoll()},1500)}
  return;
 }
 if(kind==='recover'&&G.stage==='fumble'&&side===G.off){
  const v=rand(6),seq=++G.serial;G.stage='fumble-rolling';announce('Recovery Roll','gold','Rolling one die...',1300);
  setTimeout(()=>{if(!G||G.serial!==seq)return;
   if(v>=5){endDrive(G.pos,'Fumble turnover');announce('Ball Lost','bad','Recovery die '+v,2400)}
   else{G.down++;if(G.down>4)endDrive(G.pos,'Turnover on downs');else{G.stage='play';G.message='Ball Retained · down lost';broadcast()}announce('Ball Retained','good','Recovery die '+v,2400)}
  },1550);return;
 }
 if(kind==='kick'&&side===G.off){
  if(G.stage==='play'&&!G.ready.some(Boolean)&&a.type==='punt')doPunt(a.power);
  else if(G.stage==='play'&&!G.ready.some(Boolean)&&a.type==='fg')doFieldGoal(a.position);
  else if(G.stage==='kickoff'&&a.type==='kickoff')doKickoff(a.position);
  else if(G.stage==='xp-ready'&&a.type==='xp')doExtraPoint(a.position);
 }
}

function renderHost(){
 if(!G||role!=='host')return;
 const g=G;
 E('hostHomeName').textContent=nameOf(0).toUpperCase();E('hostAwayName').textContent=nameOf(1).toUpperCase();
 E('homePanelName').textContent=nameOf(0);E('awayPanelName').textContent=nameOf(1);
 E('hostHomeScore').textContent=g.scores[0];E('hostAwayScore').textContent=g.scores[1];
 E('hostPosition').textContent=fieldPosition(g);E('hostDown').textContent=downText(g);
 E('hostLos').style.left=g.pos+'%';E('hostGoal').style.left=g.goal+'%';
 E('homeRole').textContent=g.off===0?'OFFENSE':'DEFENSE';E('awayRole').textContent=g.off===1?'OFFENSE':'DEFENSE';
 E('hostMessage').textContent=g.message;
 for(let side=0;side<2;side++){
  const box=E(side===0?'homeDice':'awayDice'),total=E(side===0?'homeTotal':'awayTotal');
  const cards=E(side===0?'homeCardCount':'awayCardCount');
  if(g.rollSeq[side]!==hostRollSeen[side]){
   hostRollSeen[side]=g.rollSeq[side];hostSpinUntil[side]=Date.now()+850;startHostSpin();
  }
  const values=g.dice[side]||Array.from({length:side===g.off?3:2},()=>1);
  const anim=Date.now()<hostSpinUntil[side];
  box.innerHTML=values.map(n=>'<div class="die '+(anim?'spinning':'')+'">'+(anim?rand(6):n)+'</div>').join('');
  total.textContent=anim?'= ...':g.dice[side]?'= '+sum(g.dice[side]):'= —';
  cards.innerHTML='<span class="tiny">CARDS LEFT</span>'+Array.from({length:g.hands[side].length},()=>'<span class="card-back">PC</span>').join('');
 }
 const net=E('hostNet');net.textContent=g.net===null?'—':(g.net>0?'+':'')+g.net;
 net.className='net-big '+(g.net>0?'good':g.net<0?'bad':'');
 E('hostDrives').innerHTML=Array.from({length:8},(_,i)=>[0,1].map(side=>{
  const v=g.results[side][i];return '<div class="drive-box '+(v===undefined?'':v>=6?'td':v===3?'fg':'fail')+'" title="'+(side===0?'Home':'Away')+' drive '+(i+1)+'">'+(v===undefined?'':v>0?v:'×')+'</div>'
 }).join('')).join('');
 const move=E('hostMovement');
 if(g.move&&g.move.from!==g.move.to){
  move.hidden=false;move.style.left=Math.min(g.move.from,g.move.to)+'%';move.style.width=Math.abs(g.move.to-g.move.from)+'%';
  move.className='field-moving'+(g.move.forward?'':' loss');
 }else move.hidden=true;
 const ball=E('hostBall');
 if(g.flight&&seenFlight!==g.flight.id){
  seenFlight=g.flight.id;ball.classList.remove('flying');ball.style.transition='none';ball.style.left=g.flight.from+'%';
  void ball.offsetWidth;ball.style.transition='left 1.6s ease-in-out';ball.classList.add('flying');
  requestAnimationFrame(()=>{ball.style.left=g.flight.to+'%'});
 }else if(!g.flight){
  ball.classList.remove('flying');ball.style.transition='left .65s ease';ball.style.left=g.pos+'%';
 }
 const announ=E('hostAnnouncement');announ.hidden=!g.announcement;
 if(g.announcement){
  announ.className='tv-announcement '+g.announcement.tone;
  E('hostAnnouncementTitle').textContent=g.announcement.title;E('hostAnnouncementDetail').textContent=g.announcement.detail;
 }
}
function startHostSpin(){
 if(hostSpinTimer)return;
 hostSpinTimer=setInterval(()=>{
  if(!G||!hostSpinUntil.some(t=>t>Date.now())){clearInterval(hostSpinTimer);hostSpinTimer=null}
  renderHost();
 },95);
}
function toggleCards(){cardsShown=!cardsShown;renderController()}
function controllerAvailableCards(){
 if(!V)return false;
 return V.stage==='play'&&!V.usedCards[seat]&&!V.ready.some(Boolean)||
  V.stage==='cards'&&V.starter!==seat&&V.cardPending[seat]===null||
  V.stage==='conversion-cards'&&!V.convCommitted[seat];
}
function renderController(){
 if(!V||seat<0)return;
 const v=V,offense=v.off===seat,available=controllerAvailableCards();
 E('controlTeam0').textContent=nameOf(0).toUpperCase();E('controlTeam1').textContent=nameOf(1).toUpperCase();
 E('controlScore0').textContent=v.scores.join(' – ');
 let message=v.message;
 if(v.stage==='conversion-choice')message=offense?'Choose one or two points.':'Opponent chooses conversion.';
 if(v.stage==='conversion-cards')message=v.convCommitted[seat]?'Cards committed; waiting for opponent.':'Choose cards for the conversion, or commit zero.';
 if(v.stage==='cards')message=v.starter===seat?'Waiting for opponent to counter cards.':'Opponent played '+(v.cardPending[v.starter]||0)+' cards. Counter or commit zero.';
 if(v.stage==='fumble')message=offense?'Fumble! Press Roll Recovery Die.':'Offense is rolling for fumble recovery.';
 if(v.stage==='kickoff')message=offense?'Kickoff — aim near the opponent’s own 1.':'Waiting for kickoff.';
 if(v.stage==='two-ready')message='Two-point attempt: both players roll dice.';
 if(v.stage==='xp-ready')message=offense?'Kick the extra point.':'Opponent is kicking an extra point.';
 if(v.stage==='finished')message=v.announcement?.title||'Final score';
 E('controllerStatus').textContent=message;
 E('controllerRole').textContent=(offense?'OFFENSE · 3 DICE':'DEFENSE · 2 DICE')+(v.ready[seat]?' · READY':'');
 const values=v.dice[seat]||Array.from({length:offense?3:2},()=>1);
 if(v.rollSeq[seat]!==clientRollSeen){
  clientRollSeen=v.rollSeq[seat];clientSpinUntil=Date.now()+850;startClientSpin();
 }
 const spinning=Date.now()<clientSpinUntil;
 E('controllerDice').innerHTML=values.map(n=>'<div class="die '+(spinning?'spinning':'')+'">'+(spinning?rand(6):n)+'</div>').join('');
 E('controllerTotal').textContent=v.dice[seat]&&!spinning?'TOTAL '+sum(v.dice[seat]):'TOTAL —';
 if(!available)selected.clear();
 E('cardEye').textContent=cardsShown?'◉':'◎';
 E('cardEye').setAttribute('aria-label',cardsShown?'Hide cards':'Reveal cards');
 E('controllerCards').innerHTML=v.hand.length?v.hand.map((n,i)=>'<button class="'+(!cardsShown?'back ':'')+(selected.has(i)?'selected':'')+'" '+(!available?'disabled':'')+' onclick="pickCard('+i+')">'+(cardsShown?n:'?')+'</button>').join(''):'<span class="tiny">No cards remain</span>';
 const commit=E('commitCards');
 commit.disabled=!available||(v.stage==='play'&&selected.size===0);
 commit.textContent=v.stage==='conversion-cards'?'COMMIT ('+selected.size+')':v.stage==='cards'?'COUNTER ('+selected.size+')':'PLAY CARDS ('+selected.size+')';
 E('cardHint').textContent=v.stage==='play'?'One penalty-card play per dice play.':v.stage==='cards'?'Counter or commit zero.':v.stage==='conversion-cards'?'Both teams may commit remaining cards.':'Keep your cards private.';
 E('controllerPlayCalls').hidden=!(v.stage==='play'&&offense&&!v.ready.some(Boolean));
 E('callRun').classList.toggle('active',v.play==='run');
 E('callPass').classList.toggle('active',v.play==='pass');
 E('callPass').textContent='PASS ('+v.passes+' left)';
 E('callPass').disabled=v.passes<=0;
 E('controllerRoll').disabled=!(['play','two-ready'].includes(v.stage)&&!v.ready[seat]);
 E('controllerRoll').textContent=v.ready[seat]?'WAITING FOR OPPONENT':v.stage==='two-ready'?'ROLL FOR 2 POINTS':'ROLL DICE';
 const actions=E('controllerActions');
 const enabled=offense&&!v.ready.some(Boolean);
 actions.hidden=!(v.stage==='play'&&enabled||v.stage==='kickoff'&&offense||v.stage==='xp-ready'&&offense||v.stage==='conversion-choice'&&offense||v.stage==='fumble'&&offense);
 const first=E('controllerFg'),second=E('controllerPunt');
 second.hidden=false;
 if(v.stage==='play'){
  first.textContent='FIELD GOAL';first.onclick=()=>startKick('fg');
  second.textContent='PUNT';second.onclick=()=>startKick('punt');
 }else if(v.stage==='kickoff'){
  first.textContent='KICKOFF';first.onclick=()=>startKick('kickoff');second.hidden=true;
 }else if(v.stage==='xp-ready'){
  first.textContent='KICK EXTRA POINT';first.onclick=()=>startKick('xp');second.hidden=true;
 }else if(v.stage==='conversion-choice'){
  first.textContent='KICK FOR 1';first.onclick=()=>sendAction({kind:'convert',value:1});
  second.textContent='GO FOR 2';second.onclick=()=>sendAction({kind:'convert',value:2});
 }else if(v.stage==='fumble'){
  first.textContent='ROLL RECOVERY DIE';first.onclick=()=>sendAction({kind:'recover'});second.hidden=true;
 }
 if(kickType&&!(v.stage==='play'&&offense||v.stage==='kickoff'&&offense||v.stage==='xp-ready'&&offense)){
  stopKick();E('controllerKickPanel').hidden=true;
 }
}
function startClientSpin(){
 if(clientSpinTimer)return;
 clientSpinTimer=setInterval(()=>{
  if(!V||Date.now()>=clientSpinUntil){clearInterval(clientSpinTimer);clientSpinTimer=null}
  renderController();
 },95);
}
function pickCard(i){
 if(!V||!controllerAvailableCards()||!Number.isInteger(i)||i<0||i>=V.hand.length)return;
 if(selected.has(i))selected.delete(i);else selected.add(i);
 renderController();
}
function sendCards(){
 if(!V)return;const type=V.stage==='conversion-cards'?'conversionCards':'cards';
 sendAction({kind:type,indices:[...selected]});selected.clear();renderController();
}
function callPlay(which){sendAction({kind:'play',play:which})}
function requestRoll(){sendAction({kind:'roll'})}
function stopKick(){clearInterval(kickTimer);kickTimer=null;kickType=null}
function startKick(type){
 if(!V||seat!==V.off)return;
 stopKick();kickType=type;kickValue=0;kickDir=1;
 const panel=E('controllerKickPanel');panel.hidden=false;
 if(type==='punt'){
  panel.innerHTML='<div class="controller-heading">PUNT POWER</div><label class="tiny" for="puntPower">POWER <b id="puntPowerValue">65</b>%</label><input type="range" id="puntPower" min="0" max="100" value="65" style="width:100%;margin:18px 0"><button class="primary" onclick="completeKick()">PUNT BALL</button>';
  E('puntPower').addEventListener('input',ev=>{E('puntPowerValue').textContent=ev.target.value});
  return;
 }
 if(type==='kickoff'){
  panel.innerHTML='<div class="controller-heading">KICKOFF · AIM FOR OWN 1</div><div class="kick-vertical"><div class="kick-needle" id="kickNeedle"></div></div><button class="primary" onclick="completeKick()">STOP KICKOFF</button>';
 }else{
  const dist=type==='xp'?42:Math.round((V.off===0?100-V.pos:V.pos)+17);
  const width=Math.max(.5,Math.min(55,55*Math.exp(-.045*(dist-20))+(type==='xp'?V.convNet*.7:0)));
  panel.innerHTML='<div class="controller-heading">'+(type==='xp'?'EXTRA POINT':'FIELD GOAL')+' · '+dist+' YARDS</div><div class="kick-meter"><div class="kick-zone" style="width:'+width+'%"></div><div class="kick-needle" id="kickNeedle"></div></div><button class="primary" onclick="completeKick()">STOP KICK</button>';
 }
 kickTimer=setInterval(()=>{
  kickValue+=kickDir*(type==='kickoff'?3.3:2.4);
  if(kickValue>=100||kickValue<=0){kickDir*=-1;kickValue=clamp(kickValue,0,100)}
  const mark=E('kickNeedle');if(mark)mark.style[type==='kickoff'?'top':'left']=kickValue+'%';
 },20);
}
function completeKick(){
 if(!kickType)return;const type=kickType,value=type==='punt'?Number(E('puntPower').value):kickValue;
 stopKick();E('controllerKickPanel').hidden=true;
 sendAction({kind:'kick',type,position:value,power:value});
}
showScreen('chooseScreen');