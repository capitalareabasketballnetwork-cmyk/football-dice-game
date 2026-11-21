'use strict';
/* DieBowl development beta: separate five-position draft and local CPU match.
   Player skill numbers below are original GAME BALANCE ratings, not official stats. */
const E=id=>document.getElementById(id);
const ROLES=[['QB','QUARTERBACK'],['RB','RUNNING BACK'],['WR','WIDE RECEIVER'],['TE','TIGHT END'],['OL','OFFENSIVE LINE'],['DL','DEFENSIVE LINE'],['LB','LINEBACKER'],['DB','DEFENSIVE BACK'],['K','KICKER'],['P','PUNTER']].map(([id,name])=>({id,name}));
const STATS={
 acc:'Accuracy',arm:'Arm',mob:'Mobility',power:'Power',speed:'Speed',
 vision:'Vision',hands:'Hands',deep:'Deep',route:'Routes',
 rush:'Rush',stop:'Run stop',cover:'Coverage',hit:'Tackle',protect:'Pass protect',block:'Run block'
};
const POOL=(window.DIEBOWL_OPTIONS||[]).map(p=>({...p,team:'FREE AGENT',skills:p.role==='OL'?{protect:p.protect,block:p.block}:p.role==='DL'?{rush:p.rush,stop:p.stop}:{acc:3,arm:3,mob:3,power:3,speed:3,vision:3,hands:3,deep:3,route:3,rush:3,stop:3,cover:3,hit:3}}));
const BY_ID=Object.fromEntries(POOL.map(p=>[p.id,p]));
const PLAYS=[
 {id:'inside',name:'INSIDE RUN',kind:'run',desc:'Attack the gap behind your OL.',skill:'RB / OL',actors:['RB','QB']},
 {id:'outside',name:'OUTSIDE RUN',kind:'run',desc:'Race toward the sideline.',skill:'RB / OL',actors:['RB','QB']},
 {id:'power',name:'POWER RUN',kind:'run',desc:'Run downhill behind the TE.',skill:'RB / TE / OL',actors:['RB','TE']},
 {id:'draw',name:'DRAW PLAY',kind:'run',desc:'Show a pass, then run.',skill:'RB / QB',actors:['RB','QB']},
 {id:'scramble',name:'QB SCRAMBLE',kind:'run',desc:'Quarterback escapes the rush.',skill:'QB / RB',actors:['QB','RB']},
 {id:'quick',name:'QUICK PASS',kind:'pass',desc:'A fast short throw.',skill:'QB / WR / TE',actors:['WR','TE']},
 {id:'slant',name:'SLANT',kind:'pass',desc:'Receiver cuts inside.',skill:'QB / WR / TE',actors:['WR','TE']},
 {id:'screen',name:'SCREEN PASS',kind:'pass',desc:'Dump the ball into space.',skill:'QB / RB / WR',actors:['RB','WR']},
 {id:'deep',name:'DEEP PASS',kind:'pass',desc:'Take a vertical shot.',skill:'QB / WR / TE',actors:['WR','TE']},
 {id:'playaction',name:'PLAY ACTION',kind:'pass',desc:'Fake the handoff, throw deep.',skill:'QB / WR / TE',actors:['WR','TE']},
 {id:'seam',name:'TE SEAM',kind:'pass',desc:'Attack between safeties.',skill:'QB / TE / WR',actors:['TE','WR']},
 {id:'hailmary',name:'HAIL MARY',kind:'pass',desc:'Desperate deep shot.',skill:'QB / WR / TE',actors:['WR','TE']}
];
const DEFENSES=[
 {id:'base',name:'BASE DEFENSE',kind:'defense',desc:'Balanced standard defense.',skill:'LB / DB',actors:['LB','DB']},
 {id:'blitz',name:'BLITZ',kind:'defense',desc:'Rush the quarterback.',skill:'LB / DL',actors:['LB','DB']},
 {id:'runstop',name:'RUN STOP',kind:'defense',desc:'Load the box for runs.',skill:'LB / DL',actors:['LB','DB']},
 {id:'coverage',name:'DEEP COVERAGE',kind:'defense',desc:'Limit long receptions.',skill:'DB / LB',actors:['DB','LB']},
 {id:'zone',name:'ZONE COVERAGE',kind:'defense',desc:'Defend zones across the field.',skill:'LB / DB',actors:['LB','DB']},
 {id:'man',name:'MAN COVERAGE',kind:'defense',desc:'Follow specific receivers.',skill:'DB / LB',actors:['DB','LB']},
 {id:'spy',name:'QB SPY',kind:'defense',desc:'Watch for scrambles.',skill:'LB / DB',actors:['LB','DB']},
 {id:'prevent',name:'PREVENT',kind:'defense',desc:'Keep the ball in front.',skill:'DB / LB',actors:['DB','LB']}
];
const TWO_PASSES=Infinity;
let DRIVES_PER_TEAM=8;
const rand=n=>1+Math.floor(Math.random()*n);
const sum=a=>a.reduce((n,x)=>n+x,0);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const skillDie=rating=>rating>=5?10:rating>=4?8:6;
const rollDie=sides=>({value:rand(sides),sides});
const grade=p=>p.overall;
const roster=(side,role)=>drafts[side][role];
const toneByTeam=side=>side===0?'green':'red';
let drafts=[{},{}],draftIndex=0,state=null,selected='inside',selectedActorId=null,selectedCard=null,noticeSerial=0,turnSerial=0;
let rosterLoadGeneration=0;
let noticeTimer=null,spinTimer=null,playTimer=null,kickTimer=null,session=0,logMessages=[],draftMessages=[];
function countDrives(){return state?.drives[0].length+state?.drives[1].length||0}
function spotLabel(pos,side){
 const own=side===0?pos:100-pos;
 return own<=50?'OWN '+Math.round(own):'OPP '+Math.round(100-own);
}
function direction(side){return side===0?1:-1}
function yardTarget(){return state.off===0?100:0}
function distanceToGoal(){return Math.abs(yardTarget()-state.pos)}
function toFirst(){return Math.abs(state.goal-state.pos)}
function pointsStatus(score){return score>=6?'td':score===3?'fg':'fail'}
function recordLog(message){
 logMessages.unshift(message);
 if(logMessages.length>12)logMessages.length=12;
}
function notify(title,description='',tone='green',duration=1800){
 if(state?.phase==='finished')return;
 const n=++noticeSerial;
 clearTimeout(noticeTimer);
 E('noticeHeading').textContent=title;
 E('noticeDetail').textContent=description;
 E('gameNotice').className='game-notice '+tone;
 E('gameNotice').hidden=false;
 if(duration>0)noticeTimer=setTimeout(()=>{if(n===noticeSerial)E('gameNotice').hidden=true},duration);
}
function resetTimers(){
 session++;turnSerial++;noticeSerial++;
 clearTimeout(noticeTimer);clearTimeout(playTimer);clearTimeout(kickTimer);clearInterval(spinTimer);
 E('gameNotice').hidden=true;
 E('kickVisual').hidden=true;
}

function rosterIds(){return Object.fromEntries(ROLES.filter(r=>drafts[0][r.id]).map(r=>[r.id,drafts[0][r.id].id]))}
function hydrateRoster(ids){
 if(!ids||typeof ids!=='object')return;
 for(const role of ROLES){const p=BY_ID[ids[role.id]];if(p&&p.role===role.id)drafts[0][role.id]=p}
 renderDraft();
}
async function loadSavedRoster(){
 const token=++rosterLoadGeneration;
 try{const saved=localStorage.getItem('diebowl-roster-v1');if(saved)hydrateRoster(JSON.parse(saved))}catch(e){}
 try{
  if(!window.DieBallAccount)return;
  await window.DieBallAccount.init();
  const user=await window.DieBallAccount.currentUser();
  if(token!==rosterLoadGeneration||state)return;
  if(!user){
   E('rosterStatus').textContent=window.DieBallAccount.isConfigured()?'Sign in to sync your roster. Guest selections stay on this device.':'Online accounts need a Supabase connection. Your testing roster stays on this device.';
   return;
  }
  const cloud=await window.DieBallAccount.loadRoster();
  if(token!==rosterLoadGeneration||state)return;
  if(cloud){hydrateRoster(cloud);localStorage.setItem('diebowl-roster-v1',JSON.stringify(rosterIds()))}
  E('rosterStatus').textContent='Signed in as '+(user.user_metadata?.display_name||user.email)+'. Save to sync your lineup.';
 }catch(e){E('rosterStatus').textContent='Cloud roster unavailable: '+e.message+'. You can still test locally.'}
}
function restartPro(){
 resetTimers();state=null;draftIndex=0;selected='inside';selectedActorId=null;selectedCard=null;
 E('draftScreen').hidden=false;E('gameScreen').hidden=true;E('finalScreen').hidden=true;
 renderDraft();loadSavedRoster();window.scrollTo(0,0);
}
function selectRosterRole(index){
 if(state||!Number.isInteger(index)||index<0||index>=ROLES.length)return;
 draftIndex=index;renderDraft();
}
function draftPlayer(id){
 if(state)return;
 const role=ROLES[draftIndex].id,choice=BY_ID[id];
 if(!choice||choice.role!==role)return;
 drafts[0][role]=choice;
 try{localStorage.setItem('diebowl-roster-v1',JSON.stringify(rosterIds()))}catch(e){}
 E('rosterStatus').textContent='Selected '+choice.name+'. Press Save My Roster to sync your team.';
 const next=ROLES.findIndex((r,i)=>i>draftIndex&&!drafts[0][r.id]);
 if(next>=0)draftIndex=next;
 else if(ROLES.some(r=>!drafts[0][r.id]))draftIndex=ROLES.findIndex(r=>!drafts[0][r.id]);
 renderDraft();
}
async function saveSelectedRoster(){
 const ids=rosterIds(),count=Object.keys(ids).length;
 if(!count){E('rosterStatus').textContent='Choose at least one player first.';return}
 try{localStorage.setItem('diebowl-roster-v1',JSON.stringify(ids))}
 catch(e){E('rosterStatus').textContent='Device storage unavailable: '+e.message;return}
 const status=E('rosterStatus');status.textContent='Saved '+count+' of '+ROLES.length+' starters locally.';
 try{
  if(!window.DieBallAccount)return;
  await window.DieBallAccount.init();
  if(!window.DieBallAccount.isConfigured()){status.textContent+=' Connect Supabase to enable cloud saves.';return}
  const user=await window.DieBallAccount.currentUser();
  if(!user){status.textContent+=' Sign in to sync between devices.';return}
  await window.DieBallAccount.saveRoster(ids);
  status.textContent='Cloud roster saved to '+(user.user_metadata?.display_name||user.email)+'.';
 }catch(e){status.textContent='Saved locally, but cloud sync failed: '+e.message}
}
async function startRosterGame(){
 const missing=ROLES.filter(r=>!drafts[0][r.id]);
 if(missing.length){
  draftIndex=ROLES.indexOf(missing[0]);renderDraft();
  E('rosterStatus').textContent='Select '+missing.map(r=>r.id).join(', ')+' to begin.';
  return;
 }
 if(window.DieBallAccount){
  try{
   await window.DieBallAccount.init();
   if(window.DieBallAccount.isConfigured()){
    const user=await window.DieBallAccount.currentUser();
    if(!user){location.href='/account?next=/diebowl';return}
   }
  }catch(e){
   E('rosterStatus').textContent='Account service unavailable: '+e.message;
   return;
  }
 }
 drafts[1]={};
 for(const role of ROLES){
  const pool=POOL.filter(p=>p.role===role.id);
  drafts[1][role.id]=pool[Math.floor(Math.random()*pool.length)];
 }
 saveSelectedRoster();
 startMatch();
}
function portrait(p){return window.dieBowlPortrait?window.dieBowlPortrait(p):''}
function renderDraft(){
 const role=ROLES[draftIndex],filled=ROLES.filter(r=>drafts[0][r.id]).length;
 E('draftRound').textContent=filled+' / '+ROLES.length;
 E('draftRoleLabel').textContent=role.name;
 E('draftHeading').textContent='Choose your '+role.name.toLowerCase();
 E('draftSteps').innerHTML=ROLES.map((r,i)=>'<button type="button" onclick="selectRosterRole('+i+')" class="draft-step '+(i===draftIndex?'current ':'')+(drafts[0][r.id]?'done':'')+'"><span>'+r.id+'</span><small>'+(drafts[0][r.id]?'READY':'CHOOSE')+'</small></button>').join('');
 E('playerGrid').innerHTML=POOL.filter(p=>p.role===role.id).sort((a,b)=>b.overall-a.overall).map(p=>
  '<button type="button" class="player-card '+(drafts[0][role.id]?.id===p.id?'selected':'')+'" onclick="draftPlayer(\''+p.id+'\')">'+
  '<div class="topline"><span>'+p.role+' · '+p.overall+' OVR</span><span class="grade">#'+(p.rank||'—')+'</span></div>'+
  '<div class="team-choice-select"><img class="pixel-portrait" alt="" src="'+portrait(p)+'"><div class="player-details"><strong>'+esc(p.name)+'</strong><small class="muted">'+esc(p.ability)+'</small></div></div>'+
  '<div class="attrs">'+(p.role==='OL'?'<span class="attribute">PROTECT +'+p.protect+'</span><span class="attribute">BLOCK +'+p.block+'</span>':
  p.role==='DL'?'<span class="attribute">PRESSURE +'+p.rush+'</span><span class="attribute">STOP +'+p.stop+'</span>':
  '<span class="attribute">ROLL '+p.min+'–'+p.max+'</span>')+'</div></button>').join('');
 E('draftRoster').innerHTML=ROLES.map(r=>'<div class="roster-row"><span class="position">'+r.id+'</span><span class="name-and-face">'+
  (drafts[0][r.id]?'<img class="small-portrait" alt="" src="'+portrait(drafts[0][r.id])+'"><strong>'+esc(drafts[0][r.id].name)+'</strong>':
  '<strong class="empty">NOT SELECTED</strong>')+'</span></div>').join('');
 E('cpuDraftNote').textContent='Pick one starter at each position. Your picks are not exclusive and can be changed whenever you return.';
 E('startRosterButton').disabled=filled!==ROLES.length;
}
function newDeck(){
 const a=[];for(let val=2;val<=10;val++)for(let i=0;i<4;i++)a.push(val);
 for(let i=a.length-1;i>0;i--){const k=Math.floor(Math.random()*(i+1));[a[i],a[k]]=[a[k],a[i]]}
 return a;
}
function dealCards(){
 const deck=newDeck();
 const h=deck.splice(0,3),c=[];
 for(let i=deck.length-1;i>=0&&c.length<3;i--)if(!h.includes(deck[i]))c.push(deck.splice(i,1)[0]);
 if(c.length<3)while(c.length<3&&deck.length)c.push(deck.shift());
 state.cards=[h,c];selectedCard=null;
}
function startMatch(){
 resetTimers();
 DRIVES_PER_TEAM=Number(document.querySelector('input[name="diebowlGameLength"]:checked')?.value)===4?4:8;
 state={phase:'play',off:0,pos:35,goal:45,down:1,
  score:[0,0],drives:[[],[]],passLeft:[TWO_PASSES,TWO_PASSES],cards:[[],[]],
  driveStartScore:0,lastRoll:null,net:null,move:null,pending:null,
  msg:'Your offense starts on its own 35. Pick a play.',playNumber:0};
 selected='inside';selectedCard=null;logMessages=[];
 dealCards();recordLog('THE GAME BEGINS · You start at your own 35.');
 E('draftScreen').hidden=true;E('gameScreen').hidden=false;E('finalScreen').hidden=true;
 renderGame();window.scrollTo(0,0);notify('GAME ON!','Your drafted team takes the field.','green',1800);
}
function currentPlays(){return state.off===0?PLAYS:DEFENSES}
function playEligible(id){return !!currentPlays().find(p=>p.id===id)}
function choosePlay(id){
 if(!state||!['play','two'].includes(state.phase)||!playEligible(id))return;
 selected=id;selectedActorId=null;renderGame();
}
function chooseCard(index){
 if(!state||!['play','two'].includes(state.phase))return;
 if(!Number.isInteger(index)||index<0||index>=state.cards[0].length)return;
 selectedCard=selectedCard===index?null:index;renderCards();
}
function renderCards(){
 E('cpuCardCount').textContent='DON HAS '+state.cards[1].length+' CARD'+(state.cards[1].length===1?'':'S');
 E('penaltyHand').innerHTML=state.cards[0].length?
 state.cards[0].map((v,i)=>'<button aria-pressed="'+(selectedCard===i)+'" title="Add '+v+' to your side of the play" class="penalty-card '+(selectedCard===i?'selected':'')+'" onclick="chooseCard('+i+')">'+v+'</button>').join(''):
 '<span class="tiny">No cards left this drive</span>';
}
function cpuCardChoice(declaredCount){
 // Don receives ONLY the number of cards declared, not their value.
 const hand=state.cards[1];
 if(!hand.length)return null;
 const react=declaredCount>0?Math.random()<.65:Math.random()<.19;
 if(!react)return null;
 return hand.indexOf(Math.max(...hand));
}
function rollForPlayer(p){
 const min=Math.max(1,p?.min||1),max=Math.max(min,p?.max||6);
 return {min,sides:max,value:min+Math.floor(Math.random()*(max-min+1)),player:p?.id||null};
}
function activePlayer(side,play){
 const info=(side===state.off?PLAYS:DEFENSES).find(p=>p.id===play);
 const ids=info?.actors||[];
 if(side===0&&selectedActorId){
  const picked=BY_ID[selectedActorId];
  if(picked&&ids.includes(picked.role)&&drafts[0][picked.role]?.id===picked.id)return picked;
 }
 for(const role of ids)if(drafts[side][role])return drafts[side][role];
 return drafts[side].RB||drafts[side].LB;
}

function chooseCpuOffense(){
 const need=toFirst(),x=Math.random();
 if(need>7)return x<.2?'quick':x<.36?'deep':x<.53?'slant':x<.7?'outside':x<.84?'seam':'playaction';
 if(state.down>=3)return x<.24?'slant':x<.43?'quick':x<.59?'screen':x<.74?'power':'inside';
 return x<.22?'inside':x<.42?'outside':x<.58?'power':x<.73?'screen':x<.88?'scramble':'quick';
}

function chooseCpuDefense(){
 const need=toFirst(),down=state.down,x=Math.random();
 if(down>=3&&need>5)return x<.24?'coverage':x<.45?'blitz':x<.64?'zone':x<.82?'man':'prevent';
 if(need<=3)return x<.45?'runstop':x<.7?'base':x<.84?'spy':'blitz';
 return x<.25?'base':x<.43?'blitz':x<.58?'runstop':x<.75?'coverage':x<.88?'zone':'man';
}

function offensiveRoll(side,play){
 const team=drafts[side],choice=activePlayer(side,play);
 const pass=PLAYS.find(p=>p.id===play)?.kind==='pass';
 if(pass){
  // QB throws, chosen WR/TE/RB receives, and the offense rolls one team die.
  return [rollForPlayer(team.QB),rollForPlayer(choice.role==='QB'?team.WR:choice),rollDie(6)];
 }
 if(play==='scramble')return [rollForPlayer(team.QB),rollForPlayer(team.RB),rollDie(6)];
 return [rollForPlayer(choice.role==='OL'?team.RB:choice),rollForPlayer(team.RB),rollDie(6)];
}
function defensiveRoll(side,play){
 const team=drafts[side],primary=activePlayer(side,play);
 const secondary=primary.role==='DB'?team.LB:team.DB;
 return [rollForPlayer(primary),rollForPlayer(secondary)];
}

// Passive linemen: no independent dice. Every matchup compares offensive protection to defensive pressure.
function lineBuff(skill){return Math.max(0,Math.min(5,Number(skill||0)))}
function calculateLineMatchup(off,pass){
 const ol=drafts[off].OL,dl=drafts[1-off].DL;
 const protection=lineBuff(ol.skills[pass?'protect':'block']);
 const pressure=lineBuff(dl.skills[pass?'rush':'stop']);
 return {protection,pressure,net:protection-pressure,
  summary:pass?'OL protection +'+protection+' vs DL pressure +'+pressure:
   'OL run blocking +'+protection+' vs DL run stop +'+pressure};
}
function playModifiers(offense,defense){
 const isPass=PLAYS.find(p=>p.id===offense)?.kind==='pass';
 let mod={inside:2,outside:1,power:3,draw:1,scramble:2,quick:1,slant:2,screen:1,deep:-2,playaction:-1,seam:1,hailmary:-5}[offense]||0;
 if(defense==='blitz')mod+=isPass?-3:3;
 if(defense==='runstop')mod+=isPass?2:-3;
 if(defense==='coverage')mod+=isPass?-3:2;
 if(defense==='zone')mod+=isPass?-2:1;
 if(defense==='man')mod+=isPass?-2:1;
 if(defense==='spy')mod+=offense==='scramble'?-4:isPass?-1:0;
 if(defense==='prevent')mod+=isPass?-4:3;
 return mod;
}
function prepareRoll(isTwo=false){
 const off=state.off,userOff=off===0;
 const attack=userOff?selected:chooseCpuOffense();
 const defense=userOff?chooseCpuDefense():selected;
 const pass=PLAYS.find(p=>p.id===attack)?.kind==='pass';
 // Passes are unlimited in DieBowl.
 const offenseDice=offensiveRoll(off,attack),defenseDice=defensiveRoll(1-off,defense);
 const offRaw=sum(offenseDice.map(x=>x.value)),defRaw=sum(defenseDice.map(x=>x.value));
 const sameRaw=offRaw===defRaw,triple=offenseDice.every(d=>d.value===offenseDice[0].value);
 const declared=selectedCard===null?0:1;
 const cpuIndex=cpuCardChoice(declared);
 const userValue=selectedCard===null?0:state.cards[0].splice(selectedCard,1)[0];
 const cpuValue=cpuIndex===null?0:state.cards[1].splice(cpuIndex,1)[0];
 const offenseCard=off===0?userValue:cpuValue,defenseCard=off===0?cpuValue:userValue;
 selectedCard=null;
 const line=calculateLineMatchup(off,pass);
 const bonus=playModifiers(attack,defense)+line.net+(offenseCard-defenseCard);
 const advantage=(triple?offRaw*2:offRaw)-defRaw+bonus;
 const success=pass&&(attack==='hailmary'?advantage>=10:['deep','playaction'].includes(attack)?advantage>=6:advantage>=4);
 // DL can force a sack when its rush advantage is strong and the QB fails the pass.
 const sack=pass&&!success&&line.net<=-2&&!sameRaw;
 const yards=pass?(success?(advantage*2+(['deep','playaction','hailmary'].includes(attack)?3:0)):(sack?-7:-5)):advantage;
 return {off,attack,defense,offenseDice,defenseDice,offRaw,defRaw,triple:triple&&!sameRaw,pass,success,
  bonus,advantage,yards,sameRaw,sack,offenseCard,defenseCard,line,isTwo};
}
function showDice(dice=null,spin=false){
 const attack=dice?.offenseDice||[],defend=dice?.defenseDice||[];
 function html(values,count){
  if(!values.length)return Array.from({length:count},()=>'<span class="face blank">—</span>').join('');
  return values.map(x=>'<span class="face"><b>'+(spin?(x.min||1)+Math.floor(Math.random()*(x.sides-(x.min||1)+1)):x.value)+'</b><small>'+(x.min||1)+'–'+x.sides+'</small></span>').join('');
 }
 E('offenseDice').innerHTML=html(attack,3);
 E('defenseDice').innerHTML=html(defend,2);
 E('offenseTotal').innerHTML=attack.length&&!spin?'TOTAL '+dice.offRaw+(dice.triple?'<span class="bonus">TRIPLE ×2</span>':'')+(dice.success?'<span class="bonus">PASS ×2</span>':''):'TOTAL —';
 E('defenseTotal').textContent=defend.length&&!spin?'TOTAL '+dice.defRaw:'TOTAL —';
}
function takeTurn(){
 if(!state)return;
 if(state.phase==='fumble'){rollRecovery();return}
 if(state.phase!=='play'&&state.phase!=='two')return;
 if(!playEligible(selected))return;
 if(state.phase==='play'&&state.off===1&&state.down===4){
  const special=cpuFourthDecision();
  if(special){specialTeams(special,true);return}
 }
 const two=state.phase==='two',roll=prepareRoll(two);
 if(!roll)return;
 state.phase='rolling';state.lastRoll=null;state.net=null;state.move=null;
 state.msg=(roll.off===0?'Your ':'Don’s ')+(roll.pass?'PASS':'RUN')+' vs '+roll.defense.toUpperCase()+' · '+roll.line.summary+' · Rolling...';
 renderGame();
 const token=++turnSerial;
 clearInterval(spinTimer);
 spinTimer=setInterval(()=>showDice(roll,true),85);
 playTimer=setTimeout(()=>{
  if(!state||turnSerial!==token||state.phase!=='rolling')return;
  clearInterval(spinTimer);spinTimer=null;
  state.lastRoll=roll;state.net=roll.sameRaw?(roll.pass?-5:0):roll.yards;
  state.phase='result';
  state.msg=(roll.sack?'SACK!':roll.pass?'PASS':'RUN')+' / '+roll.attack.toUpperCase()+' · '+roll.line.summary+' · '+(state.net>0?'+':'')+state.net+' yards · Review dice.';
  renderGame();
  const pause=roll.triple?2200:1400;
  if(roll.triple)notify('TRIPLE DIE!','Three matching offensive dice · ×2','green',2000);
  playTimer=setTimeout(()=>{if(turnSerial===token&&state?.phase==='result')applyRoll(roll)},pause);
 },1000);
}
function applyRoll(r){
 if(!state||state.phase!=='result')return;
 if(r.isTwo){
  let gained=!r.sameRaw&&r.yards>=5;
  if(gained)state.score[r.off]+=2;
  recordLog((r.off===0?'You':'Don')+(gained?' convert for 2!':' fail the two-point try.')+' ('+r.attack+')');
  state.phase='conversion-done';
  notify(gained?'TWO POINTS!':'CONVERSION FAILED',gained?'+2 points':'No points',gained?toneByTeam(r.off):'red',1800);
  const x=session;playTimer=setTimeout(()=>{if(state&&session===x&&state.phase==='conversion-done')endDrive('Touchdown · '+(gained?'2-point conversion':'conversion failed'))},1850);
  renderGame();return;
 }
 if(r.sameRaw){
  // Failed passes lose 5 yards before the fumble is recovered.
  if(r.pass){
   const dest=state.pos+direction(r.off)*-5;
   state.move={from:state.pos,to:clamp(dest,0,100),yards:-5};
   if(dest<=0||dest>=100){awardSafety('Failed pass −5 into own end zone');return}
   state.pos=dest;
  }
  state.phase='fumble';
  state.msg='FUMBLE! '+(r.pass?'Failed pass costs 5 yards first. ':'')+'Roll one recovery die. 1–4 keep; 5–6 lose.';
  recordLog((r.off===0?'Your':'Don’s')+' offense fumbled ('+(r.pass?'pass -5 yards':'run')+').');
  notify('FUMBLE!','One recovery die decides possession','red',1800);
  renderGame();
  if(state.off===1){
   const x=session;playTimer=setTimeout(()=>{if(state&&session===x&&state.phase==='fumble')rollRecovery(true)},2300);
  }
  return;
 }
 applyYards(r.yards,r);
}
function applyYards(yards,roll){
 const off=state.off,from=state.pos,physical=from+direction(off)*yards;
 state.net=yards;state.move={from,to:clamp(physical,0,100),yards};
 const user=off===0?'You':'DieBall Don';
 recordLog(user+' '+(roll.sack?'SACK · ':'')+roll.attack.toUpperCase()+' vs '+roll.defense.toUpperCase()+' · '+(yards>=0?'+':'')+yards+' yards.');
 if(yards<0&&(physical<=0||physical>=100)){awardSafety('Negative play into the offense’s end zone');return}
 if(yards>0&&(physical>=100||physical<=0)){state.pos=clamp(physical,0,100);awardTouchdown();return}
 state.pos=clamp(physical,1,99);
 const earned=off===0?state.pos>=state.goal:state.pos<=state.goal;
 if(earned){
  state.down=1;state.goal=clamp(state.pos+direction(off)*10,0,100);
  state.msg='FIRST DOWN! New set of downs.';state.phase='play';
  notify('FIRST DOWN!','Ten more yards to go',toneByTeam(off),1550);
  renderGame();return;
 }
 state.down++;
 if(state.down>4){endDrive('Turnover on downs',state.pos);notify('TURNOVER ON DOWNS','Opposite offense takes possession','red',1800);return}
 state.phase='play';
 state.msg=(yards>=0?'+':'')+yards+' yards. '+downLabel()+' & '+toFirst()+'.';
 renderGame();
}
function downLabel(){return ['','1ST','2ND','3RD','4TH'][clamp(state.down,1,4)]}
function awardTouchdown(){
 const off=state.off;
 state.score[off]+=6;
 state.phase='touchdown';
 state.msg=(off===0?'YOUR':'DON’S')+' TOUCHDOWN! Conversion coming next.';
 recordLog((off===0?'YOU':'DON')+' TOUCHDOWN! +6');
 renderGame();notify('TOUCHDOWN!',(off===0?'YOU':'DIEBALL DON')+' SCORES 6',toneByTeam(off),2200);
 const x=session;playTimer=setTimeout(()=>{
  if(!state||session!==x||state.phase!=='touchdown')return;
  state.phase='conversion';state.msg=off===0?'Choose an extra point or go for two.':'Don is choosing a conversion.';
  renderGame();
  if(off===1)playTimer=setTimeout(()=>{if(state&&session===x&&state.phase==='conversion')chooseConversion(Math.random()<.81?1:2,true)},950);
 },2300);
}
function awardSafety(reason){
 const victim=state.off,def=1-victim;
 state.score[def]+=2;
 recordLog('SAFETY! '+(def===0?'Your defense':'Don’s defense')+' earns 2 points.');
 state.phase='safety';
 state.msg=reason+'. '+(def===0?'You':'Don')+' receive the next possession.';
 renderGame();notify('SAFETY!','DEFENSE +2',toneByTeam(def),2200);
 const x=session;playTimer=setTimeout(()=>{if(state&&session===x&&state.phase==='safety')endDrive('Safety')},2300);
}
function rollRecovery(cpuAuto=false){
 if(!state||state.phase!=='fumble'||(state.off===1&&!cpuAuto))return;
 const token=++turnSerial,face=rand(6);
 state.phase='recovery';state.msg='Rolling the single recovery die...';
 renderGame();
 let elapsed=0;
 clearInterval(spinTimer);
 spinTimer=setInterval(()=>{elapsed++;E('offenseDice').innerHTML='<span class="face">'+rand(6)+'</span>'},110);
 playTimer=setTimeout(()=>{
  if(!state||turnSerial!==token||state.phase!=='recovery')return;
  clearInterval(spinTimer);spinTimer=null;
  E('offenseDice').innerHTML='<span class="face">'+face+'</span>';
  state.msg='Recovery die '+face+(face>=5?' — BALL LOST':' — BALL RETAINED');
  state.phase='recovery-result';renderGame();
  E('offenseDice').innerHTML='<span class="face">'+face+'</span>';
  const x=session;playTimer=setTimeout(()=>{
   if(!state||session!==x||state.phase!=='recovery-result')return;
   if(face>=5){endDrive('Fumble lost',state.pos);notify('BALL LOST','Fumble turnover','red',1500)}
   else{
    state.down++;
    if(state.down>4){endDrive('Turnover on downs',state.pos);notify('TURNOVER ON DOWNS','The offense lost the down','red',1500)}
    else{state.phase='play';state.msg='Ball retained. Down lost.';recordLog('Ball retained on recovery '+face+'.');renderGame();notify('BALL RETAINED','Recovery die '+face,toneByTeam(state.off),1400)}
   }
  },1700);
 },1250);
}
function chooseConversion(points,automated=false){
 if(!state||state.phase!=='conversion'||(state.off===1&&!automated)||![1,2].includes(points))return;
 if(points===1){
  state.phase='kick';state.msg=(state.off===0?'Your':'Don’s')+' extra point is in the air.';renderGame();
  const off=state.off,kicker=drafts[off].K,good=Math.random()<clamp(.8+(((kicker?.min||1)+(kicker?.max||6))/2-5)*.025,.7,.96);
  const x=session;playTimer=setTimeout(()=>{
   if(!state||session!==x||state.phase!=='kick')return;
   if(good)state.score[off]++;
   recordLog((off===0?'Your':'Don’s')+' extra point '+(good?'GOOD':'NO GOOD')+'.');
   state.phase='conversion-done';renderGame();
   notify(good?'EXTRA POINT GOOD!':'EXTRA POINT MISSED',good?'+1 point':'No points',good?toneByTeam(off):'red',1600);
   playTimer=setTimeout(()=>{if(state&&session===x&&state.phase==='conversion-done')endDrive('Touchdown · extra point '+(good?'good':'missed'))},1650);
  },950);
  return;
 }
 state.phase='two';
 state.pos=state.off===0?95:5;
 state.goal=yardTarget();
 selected=state.off===0?(state.passLeft[0]>0?'quick':'inside'):'base';
 selectedCard=null;state.msg='Go for 2 from the 5-yard line. Choose a play and roll.';
 renderGame();
}
function cpuFourthDecision(){
 if(state.off!==1||state.down!==4)return null;
 const need=toFirst(),dist=distanceToGoal()+17,late=countDrives()>=12,trailing=state.score[1]<state.score[0];
 if(need<=2&&Math.random()<(late&&trailing?.88:.67))return null;
 if(dist<=52&&Math.random()<(late&&trailing?.4:.75))return 'fg';
 return need<=4&&late&&trailing?null:'punt';
}
function specialTeams(kind,cpu=false){
 if(!state||state.phase!=='play'||(state.off===0&&cpu)||(!cpu&&state.off!==0))return;
 if(!['punt','fg'].includes(kind))return;
 const off=state.off,from=state.pos,dist=distanceToGoal()+17;
 state.phase='kick';state.move=null;state.msg=(off===0?'You':'Don')+' '+(kind==='punt'?'punt':'attempt a field goal')+'...';
 selectedCard=null;renderGame();
 const token=++turnSerial,side=direction(off),puntPlayer=drafts[off].P,puntDist=34+rand(18)+Math.round(((puntPlayer?.min||1)+(puntPlayer?.max||6))/2);
 let landing=from+side*puntDist,touchback=landing<=0||landing>=100;
 const target=kind==='punt'?clamp(landing,0,100):off===0?100:0;
 E('kickVisual').hidden=false;E('kickVisual').style.transition='none';
 E('kickVisual').style.left=from+'%';E('kickVisual').style.top='46%';
 void E('kickVisual').offsetWidth;
 E('kickVisual').style.transition='left 1.2s ease-in-out,top 1.2s ease';
 requestAnimationFrame(()=>{E('kickVisual').style.left=target+'%';E('kickVisual').style.top=kind==='fg'?'24%':'45%'});
 playTimer=setTimeout(()=>{
  if(!state||turnSerial!==token||state.phase!=='kick')return;
  E('kickVisual').hidden=true;
  if(kind==='punt'){
   const nextPos=touchback?(off===0?65:35):clamp(landing,1,99);
   endDrive(touchback?'Punt touchback':'Punt · '+puntDist+' yards',nextPos);
   notify('PUNT',touchback?'Touchback · receiving team on own 35':puntDist+' yards',toneByTeam(off),1500);
   return;
  }
  const kicker=drafts[off].K,skill=((kicker?.min||1)+(kicker?.max||6))/2;
  const chance=clamp(85-(dist-25)*1.55+(skill-5)*2,8,95),good=Math.random()*100<chance;
  if(good){state.score[off]+=3;endDrive('Field goal good');notify('FIELD GOAL GOOD!','+'+3+' points · '+Math.round(dist)+'-yard kick',toneByTeam(off),1900)}
  else{endDrive('Field goal missed',from);notify('FIELD GOAL MISSED','No points · '+Math.round(dist)+'-yard attempt','red',1900)}
 },1300);
}
function endDrive(reason,nextPos=null){
 if(!state)return;
 const old=state.off,pts=Math.max(0,state.score[old]-state.driveStartScore);
 state.drives[old].push({points:pts,reason});
 recordLog((old===0?'YOUR':'DON’S')+' DRIVE '+state.drives[old].length+' ENDS · '+reason+' · '+pts+' pts.');
 const finished=state.drives[0].length>=DRIVES_PER_TEAM&&state.drives[1].length>=DRIVES_PER_TEAM;
 if(finished){finishGame();return}
 const prevTotal=countDrives(),off=1-old;
 state.off=off;
 state.pos=nextPos===null?(off===0?35:65):clamp(nextPos,1,99);
 state.goal=clamp(state.pos+direction(off)*10,0,100);
 state.down=1;state.passLeft[off]=TWO_PASSES;state.driveStartScore=state.score[off];
 state.phase='play';state.net=null;state.move=null;state.lastRoll=null;state.playNumber++;
 selected=off===0?'inside':'base';selectedCard=null;dealCards();
 state.msg=(off===0?'Your offense':'DieBall Don')+' starts '+spotLabel(state.pos,off)+'.';
 renderGame();
 if([1,2,3].map(q=>q*(DRIVES_PER_TEAM/2)).includes(prevTotal)){
  const title=prevTotal===DRIVES_PER_TEAM/2?'END OF FIRST QUARTER':prevTotal===DRIVES_PER_TEAM?'HALFTIME':'END OF THIRD QUARTER';
  notify(title,'YOU '+state.score[0]+' — '+state.score[1]+' DON','gold',1800);
 }
}
function finishGame(){
 state.phase='finished';
 E('draftScreen').hidden=true;E('gameScreen').hidden=true;E('finalScreen').hidden=false;
 E('gameNotice').hidden=true;
 const verdict=state.score[0]===state.score[1]?'GAME TIED':state.score[0]>state.score[1]?'YOU WIN!':'YOU LOSE!';
 E('winnerHeading').textContent=verdict;
 E('finalScore').textContent='YOU '+state.score[0]+' — '+state.score[1]+' DON';
 E('finalSummary').textContent='Your roster led by '+drafts[0].QB.name+' / '+drafts[0].RB.name+' / '+drafts[0].WR.name+
 ' lineup earned '+state.score[0]+' points over '+DRIVES_PER_TEAM+' drives. Draft again to try a different combination.';
 window.scrollTo(0,0);
}
function updateField(){
 const s=state;
 E('lineOfScrimmage').style.left=s.pos+'%';E('lineToGain').style.left=s.goal+'%';
 E('fieldBall').style.left=s.pos+'%';
 const prev=E('lastLine'),arrow=E('yardArrow');
 const move=s.move,shown=move&&move.from!==move.to&&!['kick','finished'].includes(s.phase);
 prev.hidden=!shown;arrow.hidden=!shown;
 if(shown){
  const from=move.from,to=move.to;
  prev.style.left=from+'%';
  arrow.style.left=Math.min(from,to)+'%';arrow.style.width=Math.abs(to-from)+'%';
  arrow.className='net-arrow'+(move.yards<0?' loss':'')+(to<from?' point-left':'');
 }
 E('fieldInfo').textContent=(s.off===0?'YOUR OFFENSE':'DON’S OFFENSE')+' · '+spotLabel(s.pos,s.off);
 E('netYards').textContent=s.net===null?'NET YARDS —':'NET YARDS '+(s.net>0?'+':'')+s.net;
 E('fieldMessage').textContent=s.phase==='play'?'Choose your play.':s.msg;
}


function eligibleForPlay(id,side=0){
 const entry=(side===state.off?PLAYS:DEFENSES).find(x=>x.id===id);
 return (entry?.actors||[]).map(role=>drafts[side][role]).filter(Boolean);
}
function playSvg(id){
 const schemes={
 inside:['M35 34 L73 34','M47 24 L73 34'],outside:['M34 34 L61 34 L80 12','M45 44 L85 14'],
 power:['M35 34 L73 34 L88 32','M45 25 L71 29'],draw:['M35 34 L18 34 L70 34','M43 34 L78 34'],
 scramble:['M33 34 L26 19 L56 10 L92 14'],quick:['M36 34 L65 19','M65 35 L85 33'],
 slant:['M34 15 L56 14 L80 33'],screen:['M35 34 L20 34 L25 54 L72 52'],
 deep:['M35 14 L103 13','M35 52 L103 53'],playaction:['M34 34 L56 34 L43 34 L96 12'],
 seam:['M47 34 L47 12 L106 12'],hailmary:['M35 14 L113 12','M35 54 L113 52'],
 base:['M43 22 L50 31','M43 47 L50 37'],blitz:['M43 11 L79 34','M43 55 L79 34'],
 runstop:['M43 22 L80 26','M43 45 L80 40'],coverage:['M55 17 L91 13','M55 51 L91 54'],
 zone:['M45 26 L67 17','M47 42 L68 52'],man:['M48 17 L80 17','M48 54 L80 54'],
 spy:['M45 34 L75 34'],prevent:['M58 15 L92 12','M58 53 L92 55']
 };
 const lines=schemes[id]||schemes.base;
 const defense=['base','blitz','runstop','coverage','zone','man','spy','prevent'].includes(id);
 const arrowColor=defense?'#ffa184':'#b5ff94';
 const markerId='play-head-'+id;
 return '<svg class="play-diagram" viewBox="0 0 120 68" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+esc(id)+' tactical play diagram">'+
 '<defs><marker id="'+markerId+'" markerWidth="5" markerHeight="5" refX="3.5" refY="2.5" orient="auto"><path d="M0 0 L5 2.5 L0 5Z" fill="'+arrowColor+'"/></marker></defs>'+
 '<g stroke="#c8f4c2" opacity=".2" stroke-width=".7"><path d="M20 0 V68 M40 0 V68 M60 0 V68 M80 0 V68 M100 0 V68 M0 17 H120 M0 51 H120"/></g>'+
 '<g fill="#e7fff0" stroke="#28523a" stroke-width="1">'+
 [10,29,48].map(y=>'<circle cx="31" cy="'+y+'" r="4"/>').join('')+
 '<circle cx="31" cy="58" r="4"/></g>'+
 '<g fill="#ffb4a7">'+[17,34,51].map(y=>'<rect x="85" y="'+(y-4)+'" width="8" height="8" rx="1"/>').join('')+'</g>'+
 lines.map(path=>'<path d="'+path+'" stroke="'+arrowColor+'" stroke-width="2.8" fill="none" stroke-linejoin="round" stroke-linecap="round" marker-end="url(#'+markerId+')"/>').join('')+
 '</svg>';
}
function chooseActor(id){
 if(!state||!['play','two'].includes(state.phase))return;
 if(!eligibleForPlay(selected,0).some(p=>p.id===id))return;
 selectedActorId=id;
 renderPersonnel();
}
function renderPersonnel(){
 const panel=E('playPersonnel');
 if(!state||!['play','two'].includes(state.phase)){panel.hidden=true;return}
 panel.hidden=false;
 const available=eligibleForPlay(selected,0);
 if(!available.some(p=>p.id===selectedActorId))selectedActorId=available[0]?.id||null;
 E('eligiblePlayers').innerHTML=available.map(p=>'<button type="button" class="eligible-player '+(selectedActorId===p.id?'active':'')+'" onclick="chooseActor(\''+p.id+'\')" aria-pressed="'+(selectedActorId===p.id)+'">'+
 '<img alt="" src="'+portrait(p)+'"><span><strong>'+esc(p.name)+' · '+p.role+'</strong><small>ROLL '+p.min+'–'+p.max+'</small></span></button>').join('')+
 '<div class="eligible-player" role="note"><span><strong>'+(state.off===0?'OL BUFF +'+(drafts[0].OL?.protect||0)+' / +'+(drafts[0].OL?.block||0):'DL BUFF +'+(drafts[0].DL?.rush||0)+' / +'+(drafts[0].DL?.stop||0))+'</strong><small>Passive, no extra die</small></span></div>';
}
function previewPlayDice(id,side){
 const info=(side===state.off?PLAYS:DEFENSES).find(p=>p.id===id);
 if(!info)return '';
 const choices=info.actors.map(role=>drafts[side][role]).filter(Boolean);
 return choices.map(p=>p.role+' '+p.min+'–'+p.max).join(' · ');
}
function rosterHtml(side){
 return ROLES.map(role=>{
  const p=roster(side,role.id);
  return '<div class="compact-player"><small>'+role.id+'</small><span class="player-game-roster"><img alt="" src="'+portrait(p)+'"><span>'+esc(p.name)+
   ' <em>'+(role.id==='OL'?'+ '+p.protect+' PROTECT / + '+p.block+' BLOCK':
    role.id==='DL'?'+ '+p.rush+' RUSH / + '+p.stop+' STOP':p.min+'–'+p.max)+'</em></span></span></div>';
 }).join('');
}

function renderGame(){
 if(!state)return;
 const s=state,off=s.off,playMode=s.phase==='play'||s.phase==='two';
 E('homeScore').textContent=s.score[0];E('awayScore').textContent=s.score[1];
 E('homeOff').textContent=off===0?'HOME · OFFENSE':'HOME · DEFENSE';
 E('awayOff').textContent=off===1?'AWAY · OFFENSE':'AWAY · DEFENSE';
 const down=E('downBadge'),quarter=Math.min(4,Math.floor(countDrives()/(DRIVES_PER_TEAM/2))+1);
 down.className='center-stats down-'+(playMode?s.down:1);
 E('driveLabel').textContent='Q'+quarter+' · DRIVE '+Math.min(DRIVES_PER_TEAM*2,countDrives()+1)+' OF '+(DRIVES_PER_TEAM*2);
 E('scorecardHeading').textContent='THE '+(DRIVES_PER_TEAM*2)+'-DRIVE SCORECARD';
 E('downText').textContent=s.phase==='two'?'2-POINT TRY':s.phase==='conversion'?'CONVERSION':s.phase==='touchdown'?'TOUCHDOWN':downLabel()+' & '+toFirst();
 E('spotText').textContent='BALL ON '+spotLabel(s.pos,off);
 updateField();
 E('offenseDiceTitle').textContent=(off===0?'YOUR':'DON’S')+' OFFENSE · 3 DICE';
 E('defenseDiceTitle').textContent=(off===1?'YOUR':'DON’S')+' DEFENSE · 2 DICE';
 if(!['rolling','recovery'].includes(s.phase))showDice(s.lastRoll,false);
 E('gameRoster').innerHTML=rosterHtml(0);
 E('cpuRoster').innerHTML=rosterHtml(1);
 function driveRow(side){
  return Array.from({length:DRIVES_PER_TEAM},(_,i)=>{
   const d=s.drives[side][i],css=d?pointsStatus(d.points):'';
   return '<div class="drive-cell '+css+'" title="'+esc(d?.reason||'Upcoming drive')+'">'+(d?(d.points||'×'):'')+'</div>';
  }).join('');
 }
 E('homeDrives').innerHTML=driveRow(0);E('awayDrives').innerHTML=driveRow(1);
 E('playLog').innerHTML=logMessages.slice(0,7).map(m=>'<li>'+esc(m)+'</li>').join('');
 E('gameStatus').textContent=s.msg;
 const playGrid=E('playGrid'),action=E('playAction'),punt=E('puntAction'),fg=E('fgAction');
 action.hidden=false;punt.hidden=true;fg.hidden=true;
 E('playPersonnel').hidden=!playMode;
 E('cardSection').hidden=!playMode;
 const heading=E('playHeading'),playsCounter=E('playsCount');
 playsCounter.textContent='UNLIMITED PASS PLAYS';
 if(s.phase==='conversion'){
  heading.textContent='Choose the conversion';
  playGrid.innerHTML=off===0?'<button class="play-option" onclick="chooseConversion(1)"><strong>KICK FOR 1</strong><small>Approx. 87% chance</small></button><button class="play-option" onclick="chooseConversion(2)"><strong>GO FOR 2</strong><small>One play from the 5. Passing is unlimited.</small></button>':'<div class="muted">DieBall Don is choosing its conversion...</div>';
  playsCounter.textContent='AFTER TOUCHDOWN';
  action.hidden=true;
 }else if(playMode){
  const options=currentPlays(),userOff=off===0;
  heading.textContent=s.phase==='two'?'TWO-POINT ATTEMPT · '+(userOff?'OFFENSE':'DEFENSE'):userOff?'CALL YOUR OFFENSE':'CALL YOUR DEFENSE';
  playGrid.innerHTML=options.map(p=>{
   const disabled=false;
   return '<button class="play-option '+(selected===p.id?'active':'')+'" '+(disabled?'disabled':'')+' onclick="choosePlay(\''+p.id+'\')">'+playSvg(p.id)+'<strong>'+p.name+'</strong><small>'+p.desc+'</small><span class="die-skill">'+previewPlayDice(p.id,0)+'</span></button>';
  }).join('');
  action.disabled=!playEligible(selected);
  action.textContent=s.phase==='two'?'ROLL FOR 2 POINTS':userOff?'ROLL THE DICE':'DEFEND & ROLL';
  punt.hidden=!userOff||s.phase!=='play';
  fg.hidden=!userOff||s.phase!=='play';
  punt.disabled=false;fg.disabled=false;
  renderCards();
  renderPersonnel();
 }else if(s.phase==='fumble'){
  heading.textContent='FUMBLE RECOVERY';
  playGrid.innerHTML='<div class="muted">'+(off===0?'Roll one die to decide if you retain the football.':'DieBall Don is about to roll the recovery die.')+'</div>';
  playsCounter.textContent='1–4 KEEP · 5–6 LOST';
  action.textContent=off===0?'ROLL RECOVERY DIE':'DON IS RECOVERING';
  action.disabled=off!==0;
 }else{
  heading.textContent=s.phase==='touchdown'?'TOUCHDOWN!':s.phase==='recovery'||s.phase==='recovery-result'?'RECOVERY DIE':s.phase==='kick'?'KICK IN THE AIR':s.phase==='result'?'REVIEW THE DICE':'PLAY IN PROGRESS';
  playGrid.innerHTML='<span class="muted">'+esc(s.msg)+'</span>';
  playsCounter.textContent='DIEBOWL';
  action.disabled=true;action.textContent='PLEASE WAIT';
 }
}
window.chooseActor=chooseActor;
window.selectRosterRole=selectRosterRole;
window.saveSelectedRoster=saveSelectedRoster;
window.startRosterGame=startRosterGame;
window.draftPlayer=draftPlayer;
window.restartPro=restartPro;
window.choosePlay=choosePlay;
window.chooseCard=chooseCard;
window.takeTurn=takeTurn;
window.specialTeams=specialTeams;
window.chooseConversion=chooseConversion;
restartPro();
