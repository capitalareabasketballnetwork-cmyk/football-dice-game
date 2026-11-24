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
  const title=over?(g.score[0]===g.score[1]?'IT\'S A TIE!':g.score[0]>g.score[1]?'YOU WON!':'YOU LOST!'):'GAME STATISTICS';
  const table=box.rows.map(([label,calc])=>'<tr><td>'+safe(calc(box.data[0],0))+'</td><td>'+safe(label)+'</td><td>'+safe(calc(box.data[1],1))+'</td></tr>').join('');
  const drives=box.names.map((name,i)=>'<section><h3>'+safe(name)+' · '+g.driveHistory[i].length+' / '+g.drivesPerTeam+' DRIVES</h3><div class="dbs-drive-list">'+Array.from({length:g.drivesPerTeam},(_,j)=>'<span title="Drive '+(j+1)+'">'+(g.driveHistory[i][j]===undefined?'—':g.driveHistory[i][j]===0?'0':g.driveHistory[i][j])+'</span>').join('')+'</div></section>').join('');
  const returnTo=window.seasonTeamName?'/season':'/';
  document.getElementById('dieballBoxScoreContent').innerHTML='<div class="dbs-eyebrow">DIEBALL · '+(window.seasonTeamName?'SEASON MODE':'YOU VS CPU')+'</div><div class="dbs-title">'+title+'</div>'+
  '<div class="dbs-score"><div><small>'+safe(box.names[0])+'</small><strong>'+g.score[0]+'</strong></div><span>FINAL'+(over?'':'*')+'</span><div><small>'+safe(box.names[1])+'</small><strong>'+g.score[1]+'</strong></div></div>'+
  '<h3>TEAM STATISTICS</h3><table class="dbs-table"><thead><tr><th>'+safe(box.names[0])+'</th><th>STATISTIC</th><th>'+safe(box.names[1])+'</th></tr></thead><tbody>'+table+'</tbody></table>'+
  '<h3>DRIVE-BY-DRIVE POINTS</h3><div class="dbs-drives">'+drives+'</div>'+
  '<p style="color:#a7c8af;font-size:11px">Yardage includes positive and negative rushing/pass plays. Conversion and defensive rates are based on dice-play attempts.</p>'+
  '<div class="dbs-actions">'+(over?'<a class="dbs-action" style="text-align:center;text-decoration:none" href="'+returnTo+'">← BACK TO '+(window.seasonTeamName?'SEASON':'HOME')+'</a>'+(window.seasonTeamName?'<a class="dbs-secondary" style="text-align:center;text-decoration:none" href="/">MAIN MENU</a>':''):'<button class="dbs-secondary" type="button" id="dbsClose">RETURN TO GAME</button>')+'</div>';
  const close=document.getElementById('dbsClose');if(close)close.onclick=hide;
  document.getElementById('dieballBoxScore').hidden=false;
 }
 function hide(){const e=document.getElementById('dieballBoxScore');if(e&&typeof g!=='undefined'&&g?.state!=='over')e.hidden=true}
 function final(){setTimeout(()=>show(true),1600)}
 window.DieBallStats={onDice,onFirstDown,onTouchdown,onDriveEnd,show,hide,final,ensureUI,buildBox};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureUI);else ensureUI();
})();