'use strict';
/* DieBowl career mode: added separately to preserve the tested dice engine. */
const CAREER_CAP=540;
let career={credits:0,upgrades:{},season:{played:0,wins:0,losses:0,ties:0}};
let careerMode='season';
const baseRestartPro=restartPro,baseStartMatch=startMatch,baseFinishGame=finishGame;
function careerPrice(p){const base=BY_ID[p.id]||p;return Math.max(25,Math.round((base.overall-40)*1.6))+Math.max(0,career.upgrades[p.id]||0)*8}
function careerTotal(){return ROLES.reduce((n,r)=>n+(drafts[0][r.id]?careerPrice(drafts[0][r.id]):0),0)}
function careerFilled(){return ROLES.filter(r=>drafts[0][r.id]).length}
function careerPlayer(p){if(!p)return p;const step=Math.max(0,Math.min(20-(p.max||20),Number(career.upgrades[p.id])||0));return {...p,max:Math.min(20,p.max+step),overall:Math.min(99,p.overall+step*2)}}
function careerIds(){return Object.fromEntries(ROLES.filter(r=>drafts[0][r.id]).map(r=>[r.id,drafts[0][r.id].id]))}
function careerPayload(){return {players:careerIds(),career}}
function careerHydrate(data){
 if(!data||typeof data!=='object')return;
 const ids=data.players||data;
 if(data.career&&typeof data.career==='object'){
  career.credits=Math.max(0,Number(data.career.credits)||0);
  career.upgrades=data.career.upgrades&&typeof data.career.upgrades==='object'?data.career.upgrades:{};
  const s=data.career.season||{};
  career.season={played:Math.max(0,Number(s.played)||0),wins:Number(s.wins)||0,losses:Number(s.losses)||0,ties:Number(s.ties)||0};
 }
 for(const role of ROLES){const p=BY_ID[ids[role.id]];if(p&&p.role===role.id)drafts[0][role.id]=careerPlayer(p)}
 renderDraft();
}
function careerTrack(p){
 if(['OL','DL'].includes(p.role))return '<div class="range-caption">PASS +'+(p.protect||p.rush||0)+' · RUN +'+(p.block||p.stop||0)+'</div>';
 const min=Math.max(1,p.min),max=Math.min(20,p.max);
 return '<div class="range-caption"><span>ROLL RANGE · 1–20</span><b>'+min+'–'+max+'</b></div><div class="roll-track"><span class="roll-fill" style="left:'+((min-1)*5)+'%;width:'+((max-min+1)*5)+'%"></span></div><div class="roll-labels"><small>1</small><small>5</small><small>10</small><small>15</small><small>20</small></div>';
}
renderDraft=function(){
 const role=ROLES[draftIndex],filled=careerFilled();
 E('draftRound').textContent=filled+' / '+ROLES.length;
 E('draftRoleLabel').textContent=role.name;
 E('draftHeading').textContent='Choose your '+role.name.toLowerCase();
 E('capUsed').textContent='$'+careerTotal()+' / $'+CAREER_CAP;
 E('capFree').textContent='$'+(CAREER_CAP-careerTotal())+' REMAINING';
 E('capMeter').style.width=Math.min(100,100*careerTotal()/CAREER_CAP)+'%';
 E('draftSteps').innerHTML=ROLES.map((r,i)=>'<button type="button" onclick="selectRosterRole('+i+')" class="draft-step '+(i===draftIndex?'current ':'')+(drafts[0][r.id]?'done':'')+'"><span>'+r.id+'</span><small>'+(drafts[0][r.id]?'READY':'CHOOSE')+'</small></button>').join('');
 E('playerGrid').innerHTML=POOL.filter(p=>p.role===role.id).sort((a,b)=>b.overall-a.overall).map(p=>{
  const current=drafts[0][role.id],eff=careerPlayer(p),affordable=careerTotal()-(current?careerPrice(current):0)+careerPrice(eff)<=CAREER_CAP;
  return '<button type="button" class="player-card '+(current?.id===p.id?'selected':'')+'" '+(!affordable?'disabled':'')+' onclick="draftPlayer(\''+p.id+'\')">'+
  '<div class="topline"><span>'+p.role+' · '+eff.overall+' OVR</span><span class="grade">$'+careerPrice(eff)+'</span></div>'+
  '<div class="team-choice-select"><img class="pixel-portrait" alt="" src="'+portrait(p)+'"><div class="player-details"><strong>'+esc(p.name)+'</strong><small class="muted">'+esc(p.ability)+'</small></div></div>'+
  careerTrack(eff)+'</button>';
 }).join('');
 E('draftRoster').innerHTML=ROLES.map(r=>'<div class="roster-row"><span class="position">'+r.id+'</span><span class="name-and-face">'+
 (drafts[0][r.id]?'<strong>'+esc(drafts[0][r.id].name)+'</strong><img class="small-portrait" alt="" src="'+portrait(drafts[0][r.id])+'">':'<strong class="empty">NOT SELECTED</strong>')+'</span></div>').join('');
 E('cpuDraftNote').textContent='Stay under the salary cap. Earn XP during CPU seasons to improve your players.';
 E('startRosterButton').disabled=filled!==ROLES.length||careerTotal()>CAREER_CAP;
};
window.draftPlayer=function(id){
 if(state)return;
 const role=ROLES[draftIndex].id,choice=BY_ID[id];if(!choice||choice.role!==role)return;
 const current=drafts[0][role],projected=careerTotal()-(current?careerPrice(current):0)+careerPrice(choice);
 if(projected>CAREER_CAP){E('rosterStatus').textContent='Not enough salary space for that player.';return}
 drafts[0][role]=careerPlayer(choice);
 try{localStorage.setItem('diebowl-roster-v1',JSON.stringify(careerPayload()))}catch(e){}
 const next=ROLES.findIndex((r,i)=>i>draftIndex&&!drafts[0][r.id]);
 if(next>=0)draftIndex=next;else if(careerFilled()<ROLES.length)draftIndex=ROLES.findIndex(r=>!drafts[0][r.id]);
 E('rosterStatus').textContent='Salary cap remaining: $'+(CAREER_CAP-careerTotal());
 renderDraft();
 if(careerFilled()===ROLES.length)window.confirmRoster();
};
window.saveSelectedRoster=async function(){
 const payload=careerPayload();
 if(!Object.keys(payload.players).length)return;
 try{localStorage.setItem('diebowl-roster-v1',JSON.stringify(payload))}catch(e){}
 try{
  if(window.DieBallAccount){await window.DieBallAccount.init();if(await window.DieBallAccount.currentUser())await window.DieBallAccount.saveRoster(payload)}
 }catch(e){console.warn('Roster cloud sync failed:',e)}
};
window.loadSavedRoster=async function(){
 const token=++rosterLoadGeneration;
 try{const data=localStorage.getItem('diebowl-roster-v1');if(data)careerHydrate(JSON.parse(data))}catch(e){}
 try{
  if(!window.DieBallAccount)return;
  await window.DieBallAccount.init();
  const user=await window.DieBallAccount.currentUser();
  if(token!==rosterLoadGeneration||state)return;
  if(!user){
   E('rosterStatus').textContent='Sign in at Account to save and load your franchise across devices.';
   return;
  }
  const cloud=await window.DieBallAccount.loadRoster();
  if(token!==rosterLoadGeneration||state)return;
  if(cloud){careerHydrate(cloud);localStorage.setItem('diebowl-roster-v1',JSON.stringify(careerPayload()))}
  E('rosterStatus').textContent='Signed in: '+(user.user_metadata?.display_name||user.email);
  if(careerFilled()===ROLES.length&&careerTotal()<=CAREER_CAP)window.showCareerHub();
 }catch(e){E('rosterStatus').textContent='Offline roster available; cloud account could not be reached.'}
};
window.startRosterGame=function(){window.confirmRoster()};
window.confirmRoster=function(){
 if(careerFilled()!==ROLES.length||careerTotal()>CAREER_CAP)return;
 E('rosterReview').hidden=false;
 E('reviewSummary').innerHTML=ROLES.map(r=>{const p=drafts[0][r.id];return '<div class="review-player"><span>'+r.id+' · '+esc(p.name)+'</span><strong>$'+careerPrice(p)+'</strong></div>'}).join('');
 E('reviewBudget').textContent='TOTAL $'+careerTotal()+' OF $'+CAREER_CAP;
 E('rosterReview').scrollIntoView({behavior:'smooth',block:'center'});
};
window.backToRoster=function(){E('rosterReview').hidden=true};
window.saveAndContinue=async function(){
 if(careerFilled()!==ROLES.length||careerTotal()>CAREER_CAP)return;
 if(window.DieBallAccount){
  try{await window.DieBallAccount.init();if(window.DieBallAccount.isConfigured()&&!(await window.DieBallAccount.currentUser())){location.href='/account?next=/diebowl';return}}catch(e){E('rosterStatus').textContent='Account check failed: '+e.message;return}
 }
 await window.saveSelectedRoster();window.showCareerHub();
};
window.showCareerHub=function(){
 resetTimers();state=null;
 E('draftScreen').hidden=true;E('careerScreen').hidden=false;E('gameScreen').hidden=true;E('finalScreen').hidden=true;
 E('rosterReview').hidden=true;E('gameSetup').hidden=true;
 window.renderCareerHub();window.scrollTo(0,0);
};
window.renderCareerHub=function(){
 E('hubBudget').textContent='$'+careerTotal()+' / $'+CAREER_CAP;
 E('hubCredits').textContent=career.credits+' XP';
 E('hubRecord').textContent=career.season.wins+'–'+career.season.losses+'–'+career.season.ties;
 E('hubWeek').textContent=career.season.played>=8?'SEASON COMPLETE':'GAME '+(career.season.played+1)+' OF 8';
 E('hubRoster').innerHTML=ROLES.map(r=>{const p=drafts[0][r.id];if(!p)return '';
  const canTrain=career.credits>=2&&p.max<20&&careerTotal()+8<=CAREER_CAP;
  return '<div class="hub-player"><span class="name-and-face"><span class="position">'+r.id+'</span><strong>'+esc(p.name)+'</strong><img class="small-portrait" alt="" src="'+portrait(p)+'"></span>'+
  '<span class="hub-upgrade"><small>$'+careerPrice(p)+' · '+(p.role==='OL'||p.role==='DL'?'LINE BOOST':'ROLL '+p.min+'–'+p.max)+'</small><button class="outline" '+(!canTrain?'disabled':'')+' onclick="upgradeStarter(\''+p.id+'\')">TRAIN · 2 XP</button></span></div>';
 }).join('');
 E('modeSeason').classList.toggle('active',careerMode==='season');
 E('modeOnline').classList.toggle('active',careerMode==='online');
 E('careerSeason').hidden=careerMode!=='season';E('careerOnline').hidden=careerMode!=='online';
 const next=E('nextSeasonGame');if(next)next.textContent=career.season.played>=8?'START NEW SEASON':'PLAY NEXT GAME →';
};
window.chooseCareerMode=function(mode){careerMode=mode==='online'?'online':'season';window.renderCareerHub()};
window.upgradeStarter=async function(id){
 const base=BY_ID[id],selected=base&&drafts[0][base.role];
 if(!selected||selected.id!==id||career.credits<2||selected.max>=20||careerTotal()+8>CAREER_CAP)return;
 career.credits-=2;career.upgrades[id]=(career.upgrades[id]||0)+1;
 drafts[0][base.role]=careerPlayer(base);
 await window.saveSelectedRoster();window.renderCareerHub();
};
window.openGameSetup=function(){
 if(careerMode!=='season')return;
 if(career.season.played>=8){career.season={played:0,wins:0,losses:0,ties:0};window.saveSelectedRoster();window.renderCareerHub()}
 E('gameSetup').hidden=false;E('gameSetup').scrollIntoView({behavior:'smooth',block:'center'});
};
window.cancelGameSetup=function(){E('gameSetup').hidden=true};
startMatch=function(){
 drafts[1]={};
 for(const role of ROLES){const choices=POOL.filter(p=>p.role===role.id);drafts[1][role.id]=choices[Math.floor(Math.random()*choices.length)]}
 E('careerScreen').hidden=true;
 baseStartMatch();
};
finishGame=function(){
 baseFinishGame();
 const win=state.score[0]>state.score[1],tie=state.score[0]===state.score[1];
 career.season.played++;if(win)career.season.wins++;else if(tie)career.season.ties++;else career.season.losses++;
 const xp=win?4:tie?3:2;career.credits+=xp;
 E('finalSummary').textContent='Game '+career.season.played+' complete. You earned '+xp+' XP. Train your team from Team HQ.';
 window.saveSelectedRoster();
};
restartPro=function(){
 E('careerScreen').hidden=true;E('rosterReview').hidden=true;
 baseRestartPro();
};
window.restartPro=restartPro;
window.saveSelectedRoster=window.saveSelectedRoster;
window.loadSavedRoster=window.loadSavedRoster;
window.startRosterGame=window.startRosterGame;
rosterLoadGeneration++;
window.loadSavedRoster();
