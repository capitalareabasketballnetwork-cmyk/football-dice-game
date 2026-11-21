'use strict';
/* DieBowl development beta: separate five-position draft and local CPU match.
   Player skill numbers below are original GAME BALANCE ratings, not official stats. */
const E=id=>document.getElementById(id);
const ROLES=[
 {id:'QB',name:'QUARTERBACK',sub:'Throwing and scrambling'},
 {id:'RB',name:'RUNNING BACK',sub:'Power and open-field speed'},
 {id:'WR',name:'WIDE RECEIVER',sub:'Hands and deep-ball ability'},
 {id:'OL',name:'OFFENSIVE LINEMAN',sub:'Protect your quarterback and open run lanes'},
 {id:'DL',name:'DEFENSIVE LINEMAN',sub:'Apply pass pressure and stop the run'},
 {id:'DB',name:'DEFENSIVE BACK',sub:'Coverage and hard tackles'}
];
const STATS={
 acc:'Accuracy',arm:'Arm',mob:'Mobility',power:'Power',speed:'Speed',
 vision:'Vision',hands:'Hands',deep:'Deep',route:'Routes',
 rush:'Rush',stop:'Run stop',cover:'Coverage',hit:'Tackle',protect:'Pass protect',block:'Run block'
};
const POOL=[
 ['qb01',"Zane Westborough",'NTH','QB',{"acc":5,"arm":5,"mob":4}],
 ['qb02',"Alden Flintwood",'BLZ','QB',{"acc":5,"arm":4,"mob":5}],
 ['qb03',"Henrik Oakridge",'WLD','QB',{"acc":4,"arm":5,"mob":4}],
 ['qb04',"Bowen Meadowcroft",'HBR','QB',{"acc":5,"arm":4,"mob":3}],
 ['qb05',"Kendrick Silverbrook",'VLY','QB',{"acc":4,"arm":4,"mob":5}],
 ['qb06',"Marcellus Pinecroft",'RIV','QB',{"acc":4,"arm":4,"mob":4}],
 ['rb01',"Rhett Crestwick",'NTH','RB',{"power":5,"speed":4,"vision":5}],
 ['rb02',"Callan Banner",'BLZ','RB',{"power":4,"speed":5,"vision":5}],
 ['rb03',"Eamon Claybourne",'WLD','RB',{"power":5,"speed":4,"vision":4}],
 ['rb04',"Alden Hawthorne",'HBR','RB',{"power":4,"speed":5,"vision":4}],
 ['rb05',"Gaines Redbrook",'VLY','RB',{"power":4,"speed":4,"vision":5}],
 ['rb06',"Vaughn Greycastle",'RIV','RB',{"power":5,"speed":3,"vision":4}],
 ['wr01',"Lionel Meadowcroft",'NTH','WR',{"hands":5,"deep":5,"route":5}],
 ['wr02',"Remy Oakridge",'BLZ','WR',{"hands":5,"deep":4,"route":5}],
 ['wr03',"Devlin Stonewell",'WLD','WR',{"hands":4,"deep":5,"route":5}],
 ['wr04',"Kendrick Ironwood",'HBR','WR',{"hands":5,"deep":5,"route":4}],
 ['wr05',"Drake Crestwick",'VLY','WR',{"hands":4,"deep":4,"route":5}],
 ['wr06',"Jaren Galecrest",'RIV','WR',{"hands":4,"deep":5,"route":4}],
 ['edge01',"Koa Stonehaven",'NTH','DL',{"rush":5,"stop":5}],
 ['edge02',"Zion Kingswell",'BLZ','DL',{"rush":5,"stop":4}],
 ['edge03',"Maddox Delaney",'WLD','DL',{"rush":5,"stop":5}],
 ['edge04',"Drake Fenwick",'HBR','DL',{"rush":4,"stop":5}],
 ['edge05',"Forrest Yorkwell",'VLY','DL',{"rush":5,"stop":4}],
 ['edge06',"Iker Thornbrook",'RIV','DL',{"rush":4,"stop":5}],
 ['db01',"Teagan Frostmere",'NTH','DB',{"cover":5,"hit":5}],
 ['db02',"Elias Rockford",'BLZ','DB',{"cover":5,"hit":4}],
 ['db03',"Kieran Darkwell",'WLD','DB',{"cover":5,"hit":4}],
 ['db04',"Zion Halden",'HBR','DB',{"cover":4,"hit":5}],
 ['db05',"Devlin Vesperton",'VLY','DB',{"cover":5,"hit":3}],
 ['db06',"Theo Wycliffe",'RIV','DB',{"cover":4,"hit":5}],

 ['ol01',"Brant Draycott",'NTH','OL',{"protect":5,"block":5}],
 ['ol02',"Eamon Yorkwell",'BLZ','OL',{"protect":4,"block":5}],
 ['ol03',"Jaxon Fenwick",'WLD','OL',{"protect":4,"block":5}],
 ['ol04',"Nash Woodbridge",'HBR','OL',{"protect":5,"block":4}],
 ['ol05',"Theo Banner",'VLY','OL',{"protect":5,"block":5}],
 ['ol06',"Denzel Valebrook",'RIV','OL',{"protect":5,"block":4}],
].map(([id,name,team,role,skills])=>({id,name,team,role,skills}));
const BY_ID=Object.fromEntries(POOL.map(p=>[p.id,p]));
const PLAYS=[
 {id:'inside',name:'INSIDE RUN',kind:'run',desc:'RB power + vision. Reliable yards.',skill:'RB POWER'},
 {id:'outside',name:'OUTSIDE RUN',kind:'run',desc:'RB speed + vision. Beat the edge.',skill:'RB SPEED'},
 {id:'scramble',name:'QB SCRAMBLE',kind:'run',desc:'QB mobility + RB speed. Surprise run.',skill:'QB MOBILITY'},
 {id:'quick',name:'QUICK PASS',kind:'pass',desc:'QB accuracy + WR routes. Needs +4, then ×2.',skill:'QB / WR'},
 {id:'deep',name:'DEEP PASS',kind:'pass',desc:'QB arm + WR deep. Needs +6, then ×2 +3.',skill:'HIGH RISK'}
];
const DEFENSES=[
 {id:'base',name:'BASE DEFENSE',desc:'Balanced against every play.',skill:'STANDARD'},
 {id:'blitz',name:'BLITZ',desc:'Strong against passes, weak vs. runs.',skill:'EDGE RUSH'},
 {id:'runstop',name:'RUN STOP',desc:'Stack the box to stop rushes.',skill:'EDGE / TACKLE'},
 {id:'coverage',name:'COVERAGE',desc:'Protect against big pass gains.',skill:'DB COVERAGE'}
];
const TWO_PASSES=2;
let DRIVES_PER_TEAM=8;
const rand=n=>1+Math.floor(Math.random()*n);
const sum=a=>a.reduce((n,x)=>n+x,0);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const skillDie=rating=>rating>=5?10:rating>=4?8:6;
const rollDie=sides=>({value:rand(sides),sides});
const grade=p=>Math.round(65+Object.values(p.skills).reduce((a,b)=>a+b,0)/Object.keys(p.skills).length*6);
const roster=(side,role)=>drafts[side][role];
const toneByTeam=side=>side===0?'green':'red';
let drafts=[{},{}],draftIndex=0,state=null,selected='inside',selectedCard=null,noticeSerial=0,turnSerial=0;
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
function restartPro(){
 resetTimers();
 drafts=[{},{}];draftIndex=0;state=null;selected='inside';selectedCard=null;
 logMessages=[];draftMessages=[];
 E('draftScreen').hidden=false;E('gameScreen').hidden=true;E('finalScreen').hidden=true;
 renderDraft();window.scrollTo(0,0);
}
function draftPlayer(id){
 if(state||draftIndex>=ROLES.length)return;
 const role=ROLES[draftIndex].id;
 const choice=BY_ID[id];
 if(!choice||choice.role!==role||drafts[0][role])return;
 drafts[0][role]=choice;
 const remaining=POOL.filter(p=>p.role===role&&p.id!==id);
 remaining.sort((a,b)=>(grade(b)+Math.random()*5)-(grade(a)+Math.random()*5));
 const donPick=remaining[0];
 drafts[1][role]=donPick;
 draftMessages.push('You selected '+choice.name+' · Don selected '+donPick.name);
 draftIndex++;
 if(draftIndex===ROLES.length){startMatch();return}
 renderDraft();
}
function renderDraft(){
 const step=ROLES[draftIndex]||ROLES.at(-1);
 E('draftRound').textContent=String(draftIndex+1).padStart(2,'0')+' / '+String(ROLES.length).padStart(2,'0');
 E('draftRoleLabel').textContent=step.name;
 E('draftHeading').textContent='Choose your '+step.name.toLowerCase();
 E('draftSteps').innerHTML=ROLES.map((r,i)=>'<div class="draft-step '+(i<draftIndex?'done':i===draftIndex?'current':'')+'"><span>'+r.id+'</span><small>'+(i<draftIndex?'PICKED':i===draftIndex?'ON THE CLOCK':'UP NEXT')+'</small></div>').join('');
 const available=POOL.filter(p=>p.role===step.id).sort((a,b)=>grade(b)-grade(a));
 E('playerGrid').innerHTML=available.map(p=>'<button class="player-card" onclick="draftPlayer(\''+p.id+'\')">'+
 '<div class="topline"><span>'+p.team+' / '+p.role+'</span><span class="grade">'+grade(p)+' OVR</span></div>'+
 '<strong>'+esc(p.name)+'</strong><div class="attrs">'+
 Object.entries(p.skills).map(([key,val])=>'<span class="attribute">'+STATS[key]+' <b>'+(p.role==='OL'||p.role==='DL'?'+'+lineBuff(val):'d'+skillDie(val))+'</b></span>').join('')+'</div></button>').join('');
 E('draftRoster').innerHTML=ROLES.map(r=>'<div class="roster-row"><span class="position">'+r.id+'</span><strong>'+
 (drafts[0][r.id]?esc(drafts[0][r.id].name):'<span class="empty">NOT DRAFTED</span>')+'</strong></div>').join('');
 E('cpuDraftNote').textContent=draftMessages.at(-1)||'You pick first. Don chooses a different player from the same position pool after every pick.';
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
function playEligible(id){
 const p=currentPlays().find(p=>p.id===id);
 return p&&!(state.off===0&&p.kind==='pass'&&state.passLeft[0]<=0);
}
function choosePlay(id){
 if(!state||!['play','two'].includes(state.phase)||!playEligible(id))return;
 selected=id;renderGame();
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
function rollForSkill(player,key){return rollDie(skillDie(player.skills[key]))}
function chooseCpuOffense(){
 const passes=state.passLeft[1],need=toFirst(),options=passes>0?PLAYS:PLAYS.filter(p=>p.kind!=='pass');
 const p=Math.random();
 if(passes&&need>7)return p<.48?'quick':p<.68?'deep':p<.85?'outside':'inside';
 if(passes&&state.down>=3)return p<.42?'quick':p<.64?'deep':'outside';
 return p<.37?'inside':p<.64?'outside':p<.83?'scramble':passes?'quick':'inside';
}
function chooseCpuDefense(){
 const need=toFirst(),down=state.down,x=Math.random();
 // Does NOT read the user's selected play; only the down, distance and prior usage.
 if(down>=3&&need>5)return x<.36?'coverage':x<.64?'blitz':'base';
 if(need<=3)return x<.6?'runstop':x<.85?'base':'blitz';
 return x<.35?'base':x<.58?'blitz':x<.8?'runstop':'coverage';
}
function offensiveRoll(side,play){
 const team=drafts[side],qb=team.QB,rb=team.RB,wr=team.WR;
 switch(play){
  case 'inside':return [rollForSkill(rb,'power'),rollForSkill(rb,'vision'),rollDie(6)];
  case 'outside':return [rollForSkill(rb,'speed'),rollForSkill(rb,'vision'),rollDie(6)];
  case 'scramble':return [rollForSkill(qb,'mob'),rollForSkill(rb,'speed'),rollDie(6)];
  case 'quick':return [rollForSkill(qb,'acc'),rollForSkill(wr,'route'),rollDie(6)];
  case 'deep':return [rollForSkill(qb,'arm'),rollForSkill(wr,'deep'),rollDie(6)];
  default:throw Error('Unknown offensive play');
 }
}
function defensiveRoll(side,play){
 const team=drafts[side];
 // DL does not roll dice: it modifies the offense's result through pass rush or run stop.
 if(play==='blitz')return [rollForSkill(team.DB,'hit'),rollDie(8)];
 if(play==='runstop')return [rollForSkill(team.DB,'hit'),rollDie(6)];
 if(play==='coverage')return [rollForSkill(team.DB,'cover'),rollDie(6)];
 return [rollForSkill(team.DB,'hit'),rollDie(6)];
}
// Passive linemen: no independent dice. Every matchup compares offensive protection to defensive pressure.
function lineBuff(skill){return Math.max(0,Math.min(3,Number(skill||0)-2))}
function calculateLineMatchup(off,pass){
 const ol=drafts[off].OL,dl=drafts[1-off].DL;
 const protection=lineBuff(ol.skills[pass?'protect':'block']);
 const pressure=lineBuff(dl.skills[pass?'rush':'stop']);
 return {protection,pressure,net:protection-pressure,
  summary:pass?'OL protection +'+protection+' vs DL pressure +'+pressure:
   'OL run blocking +'+protection+' vs DL run stop +'+pressure};
}
function playModifiers(offense,defense){
 const isPass=offense==='quick'||offense==='deep';
 let mod=offense==='inside'?2:offense==='outside'?1:offense==='scramble'?2:offense==='quick'?1:-2;
 if(defense==='blitz')mod+=isPass?-2:3;
 if(defense==='runstop')mod+=isPass?2:-3;
 if(defense==='coverage')mod+=isPass?-3:2;
 return mod;
}
function prepareRoll(isTwo=false){
 const off=state.off,userOff=off===0;
 const attack=userOff?selected:chooseCpuOffense();
 const defense=userOff?chooseCpuDefense():selected;
 const pass=attack==='quick'||attack==='deep';
 if(pass&&state.passLeft[off]<=0)return null;
 if(pass)state.passLeft[off]--;
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
 const success=pass&&(attack==='deep'?advantage>=6:advantage>=4);
 const yards=pass?(success?(advantage*2+(attack==='deep'?3:0)):-5):advantage;
 return {off,attack,defense,offenseDice,defenseDice,offRaw,defRaw,triple:triple&&!sameRaw,pass,success,
  bonus,advantage,yards,sameRaw,offenseCard,defenseCard,line,isTwo};
}
function showDice(dice=null,spin=false){
 const attack=dice?.offenseDice||[],defend=dice?.defenseDice||[];
 function html(values,count){
  if(!values.length)return Array.from({length:count},()=>'<span class="face blank">—</span>').join('');
  return values.map(x=>'<span class="face"><b>'+(spin?rand(x.sides):x.value)+'</b><small>D'+x.sides+'</small></span>').join('');
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
  state.msg=(roll.pass?'PASS':'RUN')+' / '+roll.attack.toUpperCase()+' · '+roll.line.summary+' · '+(state.net>0?'+':'')+state.net+' yards · Review dice.';
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
 recordLog(user+' '+roll.attack.toUpperCase()+' vs '+roll.defense.toUpperCase()+' · '+(yards>=0?'+':'')+yards+' yards.');
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
  const off=state.off,good=Math.random()<.87;
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
 const token=++turnSerial,side=direction(off),puntDist=40+rand(23);
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
  const chance=clamp(95-(dist-25)*1.55,8,90),good=Math.random()*100<chance;
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
 E('finalSummary').textContent='Your drafted '+drafts[0].QB.name+' / '+drafts[0].RB.name+' / '+drafts[0].WR.name+
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

function previewPlayDice(id,side){
 const r=drafts[side],die=(role,key)=>'D'+skillDie(r[role].skills[key]);
 switch(id){
  case 'inside':return 'RB POWER '+die('RB','power')+' · VISION '+die('RB','vision')+' · TEAM D6';
  case 'outside':return 'RB SPEED '+die('RB','speed')+' · VISION '+die('RB','vision')+' · TEAM D6';
  case 'scramble':return 'QB MOBILITY '+die('QB','mob')+' · RB SPEED '+die('RB','speed')+' · TEAM D6';
  case 'quick':return 'QB ACC '+die('QB','acc')+' · WR ROUTES '+die('WR','route')+' · TEAM D6';
  case 'deep':return 'QB ARM '+die('QB','arm')+' · WR DEEP '+die('WR','deep')+' · TEAM D6';
  case 'blitz':return 'DB TACKLE '+die('DB','hit')+' · TEAM D8 · DL PASS RUSH BUFF';
  case 'runstop':return 'DB TACKLE '+die('DB','hit')+' · TEAM D6 · DL RUN STOP BUFF';
  case 'coverage':return 'DB COVER '+die('DB','cover')+' · TEAM D6';
  case 'base':return 'DB TACKLE '+die('DB','hit')+' · TEAM D6';
  default:return '';
 }
}
function rosterHtml(side){
 return ROLES.map(role=>{
  const player=roster(side,role.id);
  const best=Math.max(...Object.values(player.skills));
  return '<div class="compact-player"><small>'+role.id+'</small><span>'+esc(player.name)+' <em>'+(role.id==='OL'||role.id==='DL'?'BUFF +'+lineBuff(best):'D'+skillDie(best))+'</em></span></div>';
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
 E('cardSection').hidden=!playMode;
 const heading=E('playHeading'),playsCounter=E('playsCount');
 playsCounter.textContent=s.passLeft[off]+' OF 2 PASSES LEFT';
 if(s.phase==='conversion'){
  heading.textContent='Choose the conversion';
  playGrid.innerHTML=off===0?'<button class="play-option" onclick="chooseConversion(1)"><strong>KICK FOR 1</strong><small>Approx. 87% chance</small></button><button class="play-option" onclick="chooseConversion(2)"><strong>GO FOR 2</strong><small>One play from the 5. Passes remaining carry over.</small></button>':'<div class="muted">DieBall Don is choosing its conversion...</div>';
  playsCounter.textContent='AFTER TOUCHDOWN';
  action.hidden=true;
 }else if(playMode){
  const options=currentPlays(),userOff=off===0;
  heading.textContent=s.phase==='two'?'TWO-POINT ATTEMPT · '+(userOff?'OFFENSE':'DEFENSE'):userOff?'CALL YOUR OFFENSE':'CALL YOUR DEFENSE';
  playGrid.innerHTML=options.map(p=>{
   const disabled=userOff&&p.kind==='pass'&&s.passLeft[0]<=0;
   return '<button class="play-option '+(selected===p.id?'active':'')+'" '+(disabled?'disabled':'')+' onclick="choosePlay(\''+p.id+'\')"><strong>'+p.name+'</strong><small>'+p.desc+'</small><span class="die-skill">'+previewPlayDice(p.id,0)+'</span></button>';
  }).join('');
  action.disabled=!playEligible(selected);
  action.textContent=s.phase==='two'?'ROLL FOR 2 POINTS':userOff?'ROLL THE DICE':'DEFEND & ROLL';
  punt.hidden=!userOff||s.phase!=='play';
  fg.hidden=!userOff||s.phase!=='play';
  punt.disabled=false;fg.disabled=false;
  renderCards();
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
window.draftPlayer=draftPlayer;
window.restartPro=restartPro;
window.choosePlay=choosePlay;
window.chooseCard=chooseCard;
window.takeTurn=takeTurn;
window.specialTeams=specialTeams;
window.chooseConversion=chooseConversion;
restartPro();
