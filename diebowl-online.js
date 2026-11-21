'use strict';
/* Authenticated DIEBOWL online rooms. All state and rolls are from the Supabase RPC. */
(function(){
 let room=null,user=null,interval=null,busy=false,selectedPlay='inside',selectedActor='RB';
 const el=id=>document.getElementById(id);
 const offensive=[
  ['inside','Inside Run',['RB','QB']],['outside','Outside Run',['RB','QB']],['power','Power Run',['RB','TE']],
  ['draw','Draw Play',['RB','QB']],['scramble','QB Scramble',['QB','RB']],['quick','Quick Pass',['WR','TE']],
  ['slant','Slant',['WR','TE']],['screen','Screen Pass',['RB','WR']],['deep','Deep Pass',['WR','TE']],
  ['playaction','Play Action',['WR','TE']],['seam','TE Seam',['TE','WR']],['hailmary','Hail Mary',['WR','TE']]
 ];
 const defensive=['base','blitz','runstop','coverage','zone','man','spy','prevent'];
 function message(t){el('onlineMessage').textContent=t}
 function errorText(e){return String(e?.message||e||'Online error').replace(/<[^>]+>/g,'')}
 function showXP(){window.DieBallAccount.onlineXP().then(x=>{if(x)el('onlineXP').textContent=x.earned+' online XP · '+x.games+' games'}).catch(()=>{})}
 function stop(){if(interval)clearInterval(interval);interval=null}
 function timer(){
  if(!room||room.status!=='playing'||!room.deadline){el('onlineTimer').textContent='—';return}
  el('onlineTimer').textContent=Math.max(0,Math.ceil((new Date(room.deadline).getTime()-Date.now())/1000))+'s';
 }
 function render(){
  if(!room){el('onlineMatch').hidden=true;el('onlineLobby').hidden=false;return}
  el('onlineLobby').hidden=true;el('onlineMatch').hidden=false;
  el('roomCode').textContent=room.code;
  el('onlineScore').textContent=room.host_score+' – '+room.guest_score;
  el('onlineField').textContent='Yard '+room.position+' · Down '+room.down_number+' & '+room.distance;
  el('onlinePlays').innerHTML='';
  el('onlineActions').hidden=true;
  el('onlineResult').textContent=room.last_result?.message?
   'LAST PLAY: '+room.last_result.message+' · OFF '+room.last_result.offense_roll+' / DEF '+room.last_result.defense_roll:'';
  if(room.status==='waiting'){
   message(room.queue_type==='random'?'Searching for an opponent...':'Send this code to a friend. The game will start automatically when they join.');
   el('onlinePhase').textContent='WAITING FOR SECOND PLAYER';
  }else if(room.status==='finished'){
   el('onlinePhase').textContent=room.winner_id?(room.winner_id===user?.id?'YOU WIN!':'OPPONENT WINS'):'TIE GAME';
   message('Match finished. Online XP is recorded server-side. Return to Team HQ to see your saved roster.');
   showXP();stop();
  }else if(room.status==='cancelled'){
   el('onlinePhase').textContent='ROOM CLOSED';message('This room is closed.');stop();
  }else{
   const myOff=room.offense_id===user?.id,phase=room.phase;
   const myTurn=(phase==='offense'&&myOff)||(phase==='defense'&&!myOff);
   el('onlinePhase').textContent=(myOff?'YOU HAVE THE BALL':'YOU ARE DEFENDING')+' · '+(phase==='offense'?'OFFENSE CHOOSES':'DEFENSE RESPONDS');
   if(!myTurn){
    message(phase==='offense'?'Waiting for offense to select its play...':'Waiting for the defense to respond...');
   }else{
    message('Choose your '+phase+' play. Your 10-second clock is running.');
    el('onlineActions').hidden=false;
    if(phase==='offense'){
     const entry=offensive.find(p=>p[0]===selectedPlay)||offensive[0];
     if(!entry[2].includes(selectedActor))selectedActor=entry[2][0];
     el('onlinePlays').innerHTML=offensive.map(p=>'<button class="outline '+(selectedPlay===p[0]?'online-selected':'')+'" onclick="onlineChoosePlay(\''+p[0]+'\')">'+p[1]+'</button>').join('');
     el('onlineActors').hidden=false;
     el('onlineActors').innerHTML=entry[2].map(role=>'<button class="outline '+(selectedActor===role?'online-selected':'')+'" onclick="onlineChooseActor(\''+role+'\')">'+role+'</button>').join('');
    }else{
     if(!defensive.includes(selectedPlay))selectedPlay='base';
     el('onlineActors').hidden=true;
     el('onlinePlays').innerHTML=defensive.map(p=>'<button class="outline '+(selectedPlay===p?'online-selected':'')+'" onclick="onlineChoosePlay(\''+p+'\')">'+p.toUpperCase()+'</button>').join('');
    }
   }
  }
  timer();
 }
 async function request(action,code=null,play=null,actor=null,silent=false){
  if(busy)return;
  busy=true;
  try{
   room=await window.DieBallAccount.onlineAction(action,code,play,actor);
   render();
   if(!interval&&room.status!=='finished'&&room.status!=='cancelled'){
    interval=setInterval(()=>{timer();if(!busy&&room?.code)request('refresh',room.code,null,null,true)},1000);
   }
  }catch(e){if(!silent)message(errorText(e))}
  finally{busy=false}
 }
 async function prepare(){
  await window.DieBallAccount.init();
  user=await window.DieBallAccount.currentUser();
  if(!user){message('Sign in to your DieBall account before playing online.');return false}
  showXP();return true;
 }
 window.onlineCreate=async function(random=false){if(!(await prepare()))return;selectedPlay='inside';selectedActor='RB';request(random?'random':'create')};
 window.onlineJoin=async function(){if(!(await prepare()))return;const code=el('onlineJoinCode').value.trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(code)){message('Enter a six-character room code.');return}request('join',code)};
 window.onlineChoosePlay=function(play){selectedPlay=play;render()};
 window.onlineChooseActor=function(role){selectedActor=role;render()};
 window.onlineSubmit=function(){
  if(!room||!user)return;
  const off=room.offense_id===user.id;
  if((off&&room.phase!=='offense')||(!off&&room.phase!=='defense'))return;
  request(off?'offense':'defense',room.code,selectedPlay,off?selectedActor:null);
 };
 window.onlineLeave=async function(){
  if(!room)return;
  if(room.status==='playing'&&!confirm('Forfeit this online match?'))return;
  stop();await request('leave',room.code);
  room=null;render();message('Left online room.');showXP();
 };
 window.onlineReturn=function(){stop();room=null;render();message('Create a room or join a friend.')};
 window.onlineInit=async function(){
  if(!await prepare())return;
  const fromUrl=new URLSearchParams(location.search).get('room');
  if(fromUrl&&/^[A-Z0-9]{6}$/i.test(fromUrl)){el('onlineJoinCode').value=fromUrl.toUpperCase();window.onlineJoin()}
  else message('Create a friend room, join with a code, or find a random opponent.');
 };
 window.onlineInit();
})();