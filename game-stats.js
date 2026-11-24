'use strict';
/* Shared DieBall box score tracker. Does not affect game rules. */
(function(){
 const empty=()=>({rushAttempts:0,rushYards:0,passAttempts:0,passCompletions:0,passYards:0,thirdAtt:0,thirdMade:0,fourthAtt:0,fourthMade:0,firstDowns:0,longestRush:0,longestPass:0,turnoversOnDowns:0});
 const get=g=>{if(!g.gameStats)g.gameStats=[empty(),empty()];return g.gameStats};
 function onDice(g,type,yards,complete){
  const st=get(g)[g.off],third=g.down===3,fourth=g.down===4;
  if(third)st.thirdAtt++;if(fourth)st.fourthAtt++;
  const maxForward=g.off===0?100-g.pos:g.pos;
  const actual=yards>0?Math.min(yards,maxForward):yards;
  if(type==='pass'){st.passAttempts++;if(complete)st.passCompletions++;st.passYards+=actual;st.longestPass=Math.max(st.longestPass,actual)}
  else{st.rushAttempts++;st.rushYards+=actual;st.longestRush=Math.max(st.longestRush,actual)}
  g.statsPendingDown={side:g.off,down:g.down,converted:false};
 }
 function onFirstDown(g){
  const st=get(g)[g.off];st.firstDowns++;
  const p=g.statsPendingDown;
  if(p&&p.side===g.off&&!p.converted){
   if(p.down===3)st.thirdMade++;if(p.down===4)st.fourthMade++;
   p.converted=true;
  }else if(!p||p.side!==g.off){
   // Penalty-card first downs can occur before a dice play.
   if(g.down===1){} 
  }
 }
 function onTouchdown(g){
  const p=g.statsPendingDown;
  if(!p||p.side!==g.off||p.converted)return;
  const st=get(g)[g.off];
  if(p.down===3)st.thirdMade++;if(p.down===4)st.fourthMade++;p.converted=true;
 }
 function onDriveEnd(g,side,reason){
  const st=get(g)[side];
  if(/turnover on downs/i.test(reason))st.turnoversOnDowns++;
  g.statsPendingDown=null;
 }
 const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const pct=(n,d)=>d?Math.round(n/d*100)+'%':'—';
 const convert=(a,b)=>a+' / '+b+' ('+pct(a,b)+')';
 function buildBox(g){
  const data=get(g);const name=window.seasonTeamName||'YOU';
  const opponent=window.seasonOpponentName||'DIEBALL DON';
  const rows=[
   ['Total offensive yards',x=>x.rushYards+x.passYards],
   ['Rushing yards',x=>x.rushYards],
   ['Passing yards',x=>x.passYards],
   ['Rushing attempts',x=>x.rushAttempts],
   ['Passes completed / attempted',x=>x.passCompletions+' / '+x.passAttempts],
   ['Completion percentage',x=>pct(x.passCompletions,x.passAttempts)],
   ['Third-down conversions',x=>convert(x.thirdMade,x.thirdAtt)],
   ['Fourth-down conversions',x=>convert(x.fourthMade,x.fourthAtt)],
   ['Third-down defense (stops)',(_,i)=>{const other=data[1-i];return convert(other.thirdAtt-other.thirdMade,other.thirdAtt)}],
   ['Fourth-down defense (stops)',(_,i)=>{const other=data[1-i];return convert(other.fourthAtt-other.fourthMade,other.fourthAtt)}],
   ['First downs',x=>x.firstDowns],
   ['Longest run',x=>x.longestRush+' yd'],
   ['Longest pass gain',x=>x.longestPass+' yd'],
   ['Turnovers on downs',x=>x.turnoversOnDowns],
   ['Drives completed',(_,i)=>g.driveHistory[i].length],
   ['Touchdown drives',(_,i)=>g.driveHistory[i].filter(v=>v>=6).length]
  ];
  return {data,names:[name,opponent],rows};
 }
 function ratingFor(row,data,drives){
  const me=data[0],cpu=data[1];
  const total=x=>x.rushYards+x.passYards;
  const attempts=x=>x.thirdAtt+x.fourthAtt;
  const defense=x=>(x.thirdAtt-x.thirdMade)+(x.fourthAtt-x.fourthMade);
  const pctValue=(made,att)=>att?made/att:null;
  const classify=(myValue,otherValue,minimumDifference,minimumSample=0,sample=10,reverse=false)=>{
   if(sample<minimumSample)return null;
   const delta=(reverse?otherValue-myValue:myValue-otherValue);
   if(delta>=minimumDifference)return 'great';
   if(delta<=-minimumDifference)return 'poor';
   return null;
  };
  switch(row){
   case 0:return classify(total(me),total(cpu),35,0,10);
   case 1:return classify(me.rushYards,cpu.rushYards,25,0,10);
   case 2:return classify(me.passYards,cpu.passYards,25,0,10);
   case 5:{
    if(me.passAttempts<4)return null;
    const rate=pctValue(me.passCompletions,me.passAttempts);
    return rate>=.75?'great':rate<=.3?'poor':null;
   }
   case 6:{
    if(me.thirdAtt<3)return null;
    const rate=pctValue(me.thirdMade,me.thirdAtt);
    return rate>=.7?'great':rate<=.25?'poor':null;
   }
   case 7:{
    if(me.fourthAtt<2)return null;
    const rate=pctValue(me.fourthMade,me.fourthAtt);
    return rate>=.75?'great':rate===0?'poor':null;
   }
   case 8:{
    if(cpu.thirdAtt<3)return null;
    const stopRate=pctValue(cpu.thirdAtt-cpu.thirdMade,cpu.thirdAtt);
    return stopRate>=.75?'great':stopRate<=.25?'poor':null;
   }
   case 9:{
    if(cpu.fourthAtt<2)return null;
    const stopRate=pctValue(cpu.fourthAtt-cpu.fourthMade,cpu.fourthAtt);
    return stopRate>=.75?'great':stopRate===0?'poor':null;
   }
   case 10:return classify(me.firstDowns,cpu.firstDowns,4);
   case 13:return me.turnoversOnDowns>=2?'poor':null;
   case 15:{
    const user=drives[0].length,opponent=drives[1].length;
    const tds=drives[0].filter(x=>x>=6).length;
    const rate=user?tds/user:0;
    return user>=4?(rate>=.6?'great':rate===0?'poor':null):null;
   }
   default:return null;
  }
 }
 function highlightSummary(box,g){
  const mine=box.data[0],opp=box.data[1];
  const total=mine.rushYards+mine.passYards,allowed=opp.rushYards+opp.passYards;
  const metrics=[
   {label:'TOTAL YARDS',value:total+' YDS',detail:'vs '+allowed+' allowed',grade:ratingFor(0,box.data,g.driveHistory)},
   {label:'3RD DOWN',value:mine.thirdAtt?Math.round(mine.thirdMade/mine.thirdAtt*100)+'%':'—',detail:convert(mine.thirdMade,mine.thirdAtt),grade:ratingFor(6,box.data,g.driveHistory)},
   {label:'PASSING',value:mine.passYards+' YDS',detail:mine.passCompletions+' / '+mine.passAttempts+' completed',grade:ratingFor(2,box.data,g.driveHistory)},
   {label:'DEFENSIVE STOPS',value:(opp.thirdAtt-opp.thirdMade)+' / '+opp.thirdAtt,detail:'Opponent 3rd downs',grade:ratingFor(8,box.data,g.driveHistory)}
  ];
  return '<div class="dbs-kpi-grid">'+metrics.map(item=>
   '<div class="dbs-kpi '+(item.grade||'')+'"><span class="dbs-kpi-label">'+safe(item.label)+'</span>'+
   '<strong>'+safe(item.value)+'</strong><small>'+safe(item.detail)+'</small>'+
   (item.grade?'<span class="dbs-kpi-flag">'+(item.grade==='great'?'★ STANDOUT':'! NEEDS WORK')+'</span>':'')+'</div>'
  ).join('')+'</div>';
 }
 function ensureUI(){
  if(document.getElementById('dieballBoxScore'))return;
  const style=document.createElement('style');style.textContent=`
  #dieballBoxScore{position:fixed;inset:0;z-index:9998;background:#05140cf5;color:#e9ffe9;overflow-y:auto;padding:clamp(12px,3vw,35px)}
  #dieballBoxScore[hidden]{display:none!important}
  .dbs-container{max-width:850px;margin:auto;background:#112e1d;border:1px solid #456d4a;border-radius:17px;padding:clamp(14px,3vw,27px)}
  .dbs-eyebrow{font-size:11px;letter-spacing:2px;color:#b8f89f;font-weight:900}
  .dbs-title{font-size:clamp(32px,6vw,54px);margin:10px 0 5px;line-height:1;font-weight:1000}
  .dbs-score{display:flex;gap:10px;justify-content:space-between;align-items:center;background:#1b452b;border-radius:12px;padding:15px 12px;margin:17px 0}
  .dbs-score div{flex:1;min-width:0}.dbs-score strong{font-size:clamp(20px,3.8vw,34px)}.dbs-score small{display:block;color:#bdd6ba;font-size:10px;overflow-wrap:anywhere}
  .dbs-score div:last-child{text-align:right}.dbs-score span{font-size:12px;font-weight:800;color:#b8ff9a}
  .dbs-table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px}.dbs-table th{color:#eaffd7;text-align:center;border-bottom:1px solid #507651;padding:9px 4px}.dbs-table td{border-bottom:1px solid #31563a;padding:10px 4px;text-align:center}
  .dbs-table td:nth-child(2){text-align:left;color:#a9cbae;width:52%}
  .dbs-drives{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin:14px 0}.dbs-drives section{background:#193b28;padding:13px;border-radius:10px}
  .dbs-drives h3{font-size:11px;margin:0 0 9px}.dbs-drive-list{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.dbs-drive-list span{background:#274832;border-radius:6px;padding:7px 2px;text-align:center;font-weight:850;font-size:12px}
  .dbs-action{border:0;border-radius:9px;padding:13px 17px;background:#b8ff9a;color:#0c2716;font-weight:950;cursor:pointer}
  .dbs-secondary{border:1px solid #6a9e72;border-radius:9px;padding:12px 16px;background:transparent;color:white;font-weight:900;cursor:pointer}
  .dbs-actions{display:flex;gap:10px;flex-wrap:wrap}.dbs-actions>*{flex:1}
  .dbs-container{max-width:940px;background:linear-gradient(160deg,#173822,#0b2015 76%);box-shadow:0 24px 65px #0009}
  .dbs-title{letter-spacing:-1.4px;text-shadow:0 3px 18px #06150a}
  .dbs-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:20px 0 22px}
  .dbs-kpi{display:flex;flex-direction:column;gap:5px;min-width:0;position:relative;padding:15px 11px;min-height:118px;border:1px solid #4b7653;border-radius:13px;background:#183925}
  .dbs-kpi-label{font-weight:900;letter-spacing:.9px;color:#b1cfb6;font-size:10px}
  .dbs-kpi strong{font-size:clamp(18px,3.8vw,28px);color:#f0ffe8;letter-spacing:-.6px}
  .dbs-kpi small{font-size:10px;color:#aac4b0}
  .dbs-kpi-flag{font-size:9px;font-weight:1000;letter-spacing:.5px;margin-top:auto}
  .dbs-kpi.great,.dbs-stat-card.great{border-color:#61ec89;background:linear-gradient(145deg,#164f2d,#153824);box-shadow:inset 0 0 14px #57f68f14,0 0 12px #45e76b17}
  .dbs-kpi.great .dbs-kpi-flag,.dbs-stat-card.great .dbs-stat-flag{color:#aaffaa}
  .dbs-kpi.poor,.dbs-stat-card.poor{border-color:#db726e;background:linear-gradient(145deg,#53272a,#30201f);box-shadow:inset 0 0 14px #ed686118,0 0 12px #ee444415}
  .dbs-kpi.poor .dbs-kpi-flag,.dbs-stat-card.poor .dbs-stat-flag{color:#ffaba5}
  .dbs-section-title{font-size:13px;font-weight:950;letter-spacing:1.2px;color:#c9f7bc;margin:26px 0 11px}
  .dbs-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:20px}
  .dbs-stat-card{display:flex;flex-direction:column;gap:12px;justify-content:space-between;border:1px solid #42664a;border-radius:12px;padding:13px 14px;background:#132f20;min-width:0}
  .dbs-stat-top{display:flex;align-items:center;gap:7px;justify-content:space-between}
  .dbs-stat-title{font-size:11px;color:#c1dac4;font-weight:900;text-transform:uppercase;letter-spacing:.55px}
  .dbs-stat-flag{font-size:9px;font-weight:1000;white-space:nowrap}
  .dbs-stat-values{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .dbs-stat-values>div{min-width:0}.dbs-stat-values>div:last-child{text-align:right}
  .dbs-stat-values span{font-size:9px;font-weight:800;color:#9fbea8;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dbs-stat-values strong{display:block;margin-top:4px;font-size:18px;color:#efffed;overflow-wrap:anywhere}
  .dbs-stat-card.great .dbs-stat-values>div:first-child strong{color:#a9ffae}
  .dbs-stat-card.poor .dbs-stat-values>div:first-child strong{color:#ffb4b0}
  .dbs-legend{display:flex;flex-wrap:wrap;gap:13px;color:#b8cbb7;font-size:10px;margin:9px 0 18px}
  .dbs-legend b{font-weight:950}.dbs-legend .green{color:#aaffaa}.dbs-legend .red{color:#ffaba5}
  @media(max-width:650px){.dbs-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dbs-stat-grid{grid-template-columns:1fr}.dbs-kpi{min-height:106px}}

  @media(max-width:500px){.dbs-table{font-size:10px}.dbs-drives{gap:7px}.dbs-drives section{padding:8px}}
  `;document.head.append(style);
  const node=document.createElement('div');node.id='dieballBoxScore';node.hidden=true;node.setAttribute('role','dialog');node.setAttribute('aria-label','DieBall game statistics');
  node.innerHTML='<div class="dbs-container" id="dieballBoxScoreContent"></div>';document.body.append(node);
  const header=document.querySelector('#bodymode .header-right');
  if(header&&!document.getElementById('dbsStatsButton')){
   const btn=document.createElement('button');btn.id='dbsStatsButton';btn.className='smallbtn';btn.textContent='▤ STATS';btn.type='button';btn.onclick=()=>show(false);header.prepend(btn);
  }
 }
 function show(final=false){
  if(typeof g==='undefined'||!g)return;
  ensureUI();
  const box=buildBox(g),over=final||g.state==='over';
  const title=over?(g.score[0]===g.score[1]?'YOU TIED!':g.score[0]>g.score[1]?'YOU WON!':'YOU LOST!'):'GAME STATISTICS';
  const cards=box.rows.map(([label,calc],i)=>{
   const rating=ratingFor(i,box.data,g.driveHistory);
   const badge=rating==='great'?'★ STANDOUT':rating==='poor'?'! NEEDS WORK':'';
   return '<div class="dbs-stat-card '+(rating||'')+'">'+
     '<div class="dbs-stat-top"><span class="dbs-stat-title">'+safe(label)+'</span>'+
      (badge?'<span class="dbs-stat-flag">'+badge+'</span>':'')+'</div>'+
     '<div class="dbs-stat-values"><div><span>'+safe(box.names[0])+'</span><strong>'+safe(calc(box.data[0],0))+'</strong></div>'+
     '<div><span>'+safe(box.names[1])+'</span><strong>'+safe(calc(box.data[1],1))+'</strong></div></div></div>';
  }).join('');
  const drives=box.names.map((name,i)=>'<section><h3>'+safe(name)+' · '+g.driveHistory[i].length+' / '+g.drivesPerTeam+' DRIVES</h3><div class="dbs-drive-list">'+Array.from({length:g.drivesPerTeam},(_,j)=>'<span title="Drive '+(j+1)+'">'+(g.driveHistory[i][j]===undefined?'—':g.driveHistory[i][j]===0?'0':g.driveHistory[i][j])+'</span>').join('')+'</div></section>').join('');
  const returnTo=window.seasonTeamName?'/season':'/';
  document.getElementById('dieballBoxScoreContent').innerHTML='<div class="dbs-eyebrow">DIEBALL · '+(window.seasonTeamName?'SEASON MODE':'YOU VS CPU')+'</div><div class="dbs-title">'+title+'</div>'+
  '<div class="dbs-score"><div><small>'+safe(box.names[0])+'</small><strong>'+g.score[0]+'</strong></div><span>FINAL'+(over?'':'*')+'</span><div><small>'+safe(box.names[1])+'</small><strong>'+g.score[1]+'</strong></div></div>'+
  '<div class="dbs-section-title">GAME HIGHLIGHTS</div>'+highlightSummary(box,g)+
  '<div class="dbs-section-title">FULL TEAM BOX SCORE</div><div class="dbs-legend"><span><b class="green">● GREEN</b> standout game performance</span><span><b class="red">● RED</b> needs improvement</span><span>Other stats remain neutral</span></div><div class="dbs-stat-grid">'+cards+'</div>'+
  '<h3>DRIVE-BY-DRIVE POINTS</h3><div class="dbs-drives">'+drives+'</div>'+
  '<p style="color:#a7c8af;font-size:11px">Yardage includes positive and negative rushing/pass plays. Conversion and defensive rates are based on dice-play attempts.</p>'+
  '<div class="dbs-actions">'+(over?'<a class="dbs-action" style="text-align:center;text-decoration:none" href="'+returnTo+'">← BACK TO '+(window.seasonTeamName?'SEASON':'HOME')+'</a>'+(window.seasonTeamName?'<a class="dbs-secondary" style="text-align:center;text-decoration:none" href="/">MAIN MENU</a>':''):'<button class="dbs-secondary" type="button" id="dbsClose">RETURN TO GAME</button>')+'</div>';
  const close=document.getElementById('dbsClose');if(close)close.onclick=hide;
  document.getElementById('dieballBoxScore').hidden=false;
 }
 function hide(){const e=document.getElementById('dieballBoxScore');if(e&&typeof g!=='undefined'&&g?.state!=='over')e.hidden=true}
 function final(){setTimeout(()=>show(true),350)}
 window.DieBallStats={onDice,onFirstDown,onTouchdown,onDriveEnd,show,hide,final,ensureUI,buildBox};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureUI);else ensureUI();
})();