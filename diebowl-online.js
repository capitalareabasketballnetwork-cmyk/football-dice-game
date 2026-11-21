'use strict';
/* Authenticated DIEBOWL online rooms. All state and rolls are from the Supabase RPC. */
(function(){
 let room=null,user=null,interval=null,busy=false,selectedPlay='inside',selectedActor='RB',lastCompletedRoom=null,enteredGame=false,onlinePlayFilter='run';
 const el=id=>document.getElementById(id);
 const offensive=[
  ['inside','Inside Run',['RB','QB']],['outside','Outside Run',['RB','QB']],['power','Power Run',['RB','TE']],
  ['draw','Draw Play',['RB','QB']],['scramble','QB Scramble',['QB','RB']],['quick','Quick Pass',['WR','TE']],
  ['slant','Slant',['WR','TE']],['screen','Screen Pass',['RB','WR']],['deep','Deep Pass',['WR','TE']],
  ['playaction','Play Action',['WR','TE']],['seam','TE Seam',['TE','WR']],['hailmary','Hail Mary',['WR','TE']]
 ];
 const defensive=['base','blitz','runstop','coverage','zone','man','spy','prevent'];
 const categories={run:['inside','outside','power','draw','scramble'],pass:['quick','slant','screen','deep','seam','hailmary'],playaction:['playaction']};
 function safeText(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]))}
 function gameView(){
  const game=el('onlineGameScreen');
  game.hidden=!enteredGame;
  if(!enteredGame||!room)return;
  el('careerScreen').hidden=true;
  const homeOnOff=room.offense_id===room.host_id;
  const myTurn=room.status==='playing'&&((room.phase==='offense'&&room.offense_id===user?.id)||(room.phase==='defense'&&room.offense_id!==user?.id));
  const offense=room.phase==='offense';
  const isDefending=room.offense_id!==user?.id;
  const position=Math.max(1,Math.min(99,Number(room.position)||35));
  const ballX=homeOnOff?position:100-position;
  const nextPosition=Math.max(0,Math.min(100,position+(Number(room.distance)||10)));
  const gainX=homeOnOff?nextPosition:100-nextPosition;
  const ordinal=['','1ST','2ND','3RD','4TH'][room.down_number]||room.down_number+'TH';
  el('ogCode').textContent=room.code;
  el('ogHomeScore').textContent=room.host_score;
  el('ogAwayScore').textContent=room.guest_score;
  el('ogHomeSide').textContent=homeOnOff?'OFFENSE':'DEFENSE';
  el('ogAwaySide').textContent=homeOnOff?'DEFENSE':'OFFENSE';
  el('ogDrive').textContent='DRIVE '+Math.min(8,1+Number(room.drive_count||0))+' OF 8';
  el('ogDownText').textContent=ordinal+' & '+room.distance;
  el('ogSpot').textContent='BALL ON '+position;
  el('ogFieldInfo').textContent=(isDefending?'OPPONENT':'YOUR')+' OFFENSE · OWN '+position;
  el('ogFieldFoot').textContent=ordinal+' & '+room.distance;
  el('ogLine').style.left=ballX+'%';
  el('ogFirstLine').style.left=gainX+'%';
  el('ogBall').style.left=ballX+'%';
  el('ogDownBadge').className='center-stats down-'+Math.max(1,Math.min(4,Number(room.down_number)||1));
  const last=room.last_result;
  el('ogLastPlay').textContent=last?.message||'Waiting for play';
  el('ogResult').textContent=last?.message?last.message+' · OFFENSE D20 '+last.offense_roll+' / DEFENSE D20 '+last.defense_roll:'Match connected. Choose your first play.';
  el('ogPhase').textContent=room.status==='finished'?'GAME FINAL':room.status==='cancelled'?'ROOM CLOSED':offense?'OFFENSE PICKS FIRST':'DEFENSE RESPONDS';
  el('ogTimer').textContent=room.status==='playing'&&room.deadline?Math.max(0,Math.ceil((Date.parse(room.deadline)-Date.now())/1000))+'s':'—';
  el('ogHeading').textContent=room.status!=='playing'?'Match complete':offense?'Pick your play':'Pick your defense';
  el('ogStatus').textContent=room.status==='finished'?(room.winner_id===user?.id?'You won!':'Match finished. XP has been recorded.'):room.status==='cancelled'?'Room closed.':myTurn?(offense?'Choose an offensive play and a player, then confirm.':'Offense selected '+String(room.selected_play||'a play').toUpperCase()+'. Choose your defense.'):'Waiting for the other player to choose.';
  el('ogSubmit').hidden=!myTurn;
  el('ogPersonnel').hidden=!myTurn||!offense;
  el('ogFilter').hidden=!myTurn||!offense;
  const grid=el('ogPlayGrid');
  if(!myTurn){grid.innerHTML='';return}
  if(offense){
   const allowed=categories[onlinePlayFilter]||categories.run;
   if(!allowed.includes(selectedPlay))selectedPlay=allowed[0];
   for(const button of el('ogFilter').querySelectorAll('button')){
    const active=button.dataset.filter===onlinePlayFilter;
    button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
   }
   const entry=offensive.find(p=>p[0]===selectedPlay)||offensive[0];
   if(!entry[2].includes(selectedActor))selectedActor=entry[2][0];
   grid.innerHTML=offensive.filter(p=>allowed.includes(p[0])).map(p=>
    '<button type="button" class="play-option '+(p[0]===selectedPlay?'active':'')+'" onclick="onlineChoosePlay(\''+p[0]+'\')">'+
    (typeof playSvg==='function'?playSvg(p[0]):'')+'<strong>'+safeText(p[1])+'</strong><small>'+safeText(p[2].join(' / '))+'</small></button>').join('');
   el('ogActorGrid').innerHTML=entry[2].map(role=>{
    const player=drafts[0]?.[role];if(!player)return '';
    return '<button type="button" class="eligible-player '+(role===selectedActor?'active':'')+'" onclick="onlineChooseActor(\''+role+'\')"><img alt="" src="'+portrait(player)+'"><span><strong>'+safeText(player.name)+' · '+role+'</strong><small>DIE '+player.min+'–'+player.max+'</small></span></button>';
   }).join('');
  }else{
   if(!defensive.includes(selectedPlay))selectedPlay='base';
   grid.innerHTML=defensive.map(id=>
    '<button type="button" class="play-option '+(selectedPlay===id?'active':'')+'" onclick="onlineChoosePlay(\''+id+'\')">'+
    (typeof playSvg==='function'?playSvg(id):'')+'<strong>'+safeText(id.toUpperCase())+'</strong></button>').join('');
  }
  if(typeof rosterHtml==='function')el('ogRoster').innerHTML=rosterHtml(0);
 }
 window.onlineSetFilter=function(value){
  if(!Object.hasOwn(categories,value))return;
  onlinePlayFilter=value;selectedPlay=categories[value][0];selectedActor='RB';gameView();
 };
 window.onlineEnterGame=function(){
  if(!room||room.status!=='playing'&&room.status!=='finished')return;
  enteredGame=true;gameView();window.scrollTo(0,0);
 };
 window.onlineBackToLobby=function(){
  enteredGame=false;el('onlineGameScreen').hidden=true;el('careerScreen').hidden=false;render();window.scrollTo(0,0);
 };

 function message(t){el('onlineMessage').textContent=t}
 function errorText(e){return String(e?.message||e||'Online error').replace(/<[^>]+>/g,'')}
 function showXP(){window.DieBallAccount.onlineXP().then(x=>{if(x)el('onlineXP').textContent=x.earned+' online XP · '+x.games+' games'}).catch(()=>{})}
 function stop(){if(interval)clearInterval(interval);interval=null}
 function timer(){
  if(!room||room.status!=='playing'||!room.deadline){el('onlineTimer').textContent='—';if(enteredGame)el('ogTimer').textContent='—';return}
  const remaining=Math.max(0,Math.ceil((new Date(room.deadline).getTime()-Date.now())/1000))+'s';
  el('onlineTimer').textContent=remaining;
  if(enteredGame)el('ogTimer').textContent=remaining;
 }
 function render(){
  if(!room){el('onlineMatch').hidden=true;el('onlineLobby').hidden=false;el('onlineEnterGame').hidden=true;el('onlineGameScreen').hidden=true;return}
  el('onlineLobby').hidden=true;el('onlineMatch').hidden=false;
  el('onlineEnterGame').hidden=room.status!=='playing'&&room.status!=='finished';
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
   message('Match finished. Online XP is recorded server-side. Return to Team HQ to train your players.');
   if(lastCompletedRoom!==room.id){
    lastCompletedRoom=room.id;
    window.DieBallAccount.loadRoster().then(saved=>{if(saved&&typeof careerHydrate==='function'){careerHydrate(saved);if(typeof window.renderCareerHub==='function')window.renderCareerHub()}}).catch(()=>{});
   }
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
    message(phase==='defense'?'Offense called '+String(room.selected_play||'a play').toUpperCase()+'. Choose your defense in 10 seconds.':'Choose your offensive play in 10 seconds.');
    el('onlineActions').hidden=false;
    if(phase==='offense'){
     const entry=offensive.find(p=>p[0]===selectedPlay)||offensive[0];
     if(!entry[2].includes(selectedActor))selectedActor=entry[2][0];
     el('onlinePlays').innerHTML=offensive.map(p=>'<button class="outline '+(selectedPlay===p[0]?'online-selected':'')+'" onclick="onlineChoosePlay(\''+p[0]+'\')">'+p[1]+'</button>').join('');
     el('onlineActors').hidden=false;
     el('onlineActors').innerHTML=entry[2].map(role=>{
      const p=drafts[0]?.[role];
      const name=p?String(p.name).replace(/[&<>"]/g,''):'';
      const range=p?' · '+p.min+'–'+p.max:'';
      const face=p?'<img alt="" src="'+portrait(p)+'" class="online-portrait">':'';
      return '<button class="outline '+(selectedActor===role?'online-selected':'')+'" onclick="onlineChooseActor(\''+role+'\')">'+face+role+' · '+name+range+'</button>';
     }).join('');
    }else{
     if(!defensive.includes(selectedPlay))selectedPlay='base';
     el('onlineActors').hidden=false;
     const defendRole=['blitz','runstop','spy'].includes(selectedPlay)?'LB':'DB';
     const defender=drafts[0]?.[defendRole];
     el('onlineActors').textContent='ACTIVE DEFENDER: '+defendRole+(defender?' · '+defender.name+' · DICE '+defender.min+'–'+defender.max:'');
     el('onlinePlays').innerHTML=defensive.map(p=>'<button class="outline '+(selectedPlay===p?'online-selected':'')+'" onclick="onlineChoosePlay(\''+p+'\')">'+p.toUpperCase()+'</button>').join('');
    }
   }
  }
  timer();gameView();
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
 window.onlineCreate=async function(random=false){if(!(await prepare()))return;enteredGame=false;onlinePlayFilter='run';selectedPlay='inside';selectedActor='RB';request(random?'random':'create')};
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
  enteredGame=false;el('careerScreen').hidden=false;
  room=null;render();message('Left online room.');showXP();
 };
 window.onlineReturn=function(){stop();enteredGame=false;el('careerScreen').hidden=false;room=null;render();message('Create a room or join a friend.')};
 window.onlineInit=async function(){
  if(!await prepare())return;
  const fromUrl=new URLSearchParams(location.search).get('room');
  if(fromUrl&&/^[A-Z0-9]{6}$/i.test(fromUrl)){el('onlineJoinCode').value=fromUrl.toUpperCase();window.onlineJoin()}
  else message('Create a friend room, join with a code, or find a random opponent.');
 };
 window.onlineInit();
})();