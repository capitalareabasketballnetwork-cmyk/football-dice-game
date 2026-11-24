'use strict';
/* DieBall Season: 32 club league, authenticated cloud saves, fixtures, U.S. map. */
const TEAMS=[
['Boston','Admirals','E',42.3601,-71.0589],['Detroit','Engines','E',42.3314,-83.0458],
['Philadelphia','Foundry','E',39.9526,-75.1636],['Atlanta','Firebirds','E',33.749,-84.388],
['Buffalo','Blizzard','E',42.8864,-78.8784],['Pittsburgh','Ironclads','E',40.4406,-79.9959],
['Charlotte','Royals','E',35.2271,-80.8431],['Miami','Tides','E',25.7617,-80.1918],
['Kalamazoo','Kodiaks','E',42.2917,-85.5872],['Traverse City','Timberwolves','E',44.7631,-85.6206],
['Erie','Stormbreakers','E',42.1292,-80.0851],['Asheville','Mountaineers','E',35.5951,-82.5515],
['Burlington','Frostbite','E',44.4759,-73.2121],['Toledo','Torpedoes','E',41.6528,-83.5379],
['Savannah','Specters','E',32.0809,-81.0912],['Roanoke','Railmen','E',37.271,-79.9414],
['Seattle','Evergreens','W',47.6062,-122.3321],['Los Angeles','Aftershock','W',34.0522,-118.2437],
['Denver','Summit','W',39.7392,-104.9903],['Phoenix','Firestorm','W',33.4484,-112.074],
['Dallas','Desperados','W',32.7767,-96.797],['Las Vegas','Vipers','W',36.1699,-115.1398],
['San Diego','Tritons','W',32.7157,-117.1611],['Portland','Pioneers','W',45.5152,-122.6784],
['Boise','Bison','W',43.615,-116.2023],['Spokane','Ospreys','W',47.6588,-117.426],
['Missoula','Grizzlies','W',46.8721,-113.994],['Rapid City','Rush','W',44.0805,-103.231],
['Flagstaff','Falcons','W',35.1983,-111.6513],['Reno','Renegades','W',39.5296,-119.8138],
['Santa Fe','Scorpions','W',35.687,-105.9378],['Bend','Blacktails','W',44.0582,-121.3153]
].map((t,i)=>({id:i,city:t[0],name:t[1],division:t[2],lat:t[3],lng:t[4]}));
const EXTRA_CITIES=[
['New York',40.7128,-74.006],['Chicago',41.8781,-87.6298],['Houston',29.7604,-95.3698],
['San Francisco',37.7749,-122.4194],['Washington',38.9072,-77.0369],['Nashville',36.1627,-86.7816],
['Columbus',39.9612,-82.9988],['Cleveland',41.4993,-81.6944],['Indianapolis',39.7684,-86.1581],
['Orlando',28.5383,-81.3792],['Richmond',37.5407,-77.436],['Jacksonville',30.3322,-81.6557],
['Tampa',27.9506,-82.4572],['Louisville',38.2527,-85.7585],['Cincinnati',39.1031,-84.512],
['Grand Rapids',42.9634,-85.6681],['Lansing',42.7325,-84.5555],['Ann Arbor',42.2808,-83.743],
['Flint',43.0125,-83.6875],['Battle Creek',42.3212,-85.1797],['South Bend',41.6764,-86.252],
['Fort Wayne',41.0793,-85.1394],['Green Bay',44.5133,-88.0133],['Milwaukee',43.0389,-87.9065],
['Madison',43.0731,-89.4012],['Minneapolis',44.9778,-93.265],['St. Paul',44.9537,-93.09],
['Duluth',46.7867,-92.1005],['Fargo',46.8772,-96.7898],['Sioux Falls',43.5446,-96.7311],
['Omaha',41.2565,-95.9345],['Lincoln',40.8136,-96.7026],['Des Moines',41.5868,-93.625],
['Kansas City',39.0997,-94.5786],['St. Louis',38.627,-90.1994],['Wichita',37.6872,-97.3301],
['Oklahoma City',35.4676,-97.5164],['Tulsa',36.154,-95.9928],['Austin',30.2672,-97.7431],
['San Antonio',29.4241,-98.4936],['El Paso',31.7619,-106.485],['Fort Worth',32.7555,-97.3308],
['New Orleans',29.9511,-90.0715],['Memphis',35.1495,-90.049],['Knoxville',35.9606,-83.9207],
['Raleigh',35.7796,-78.6382],['Durham',35.994,-78.8986],['Charleston',32.7765,-79.9311],
['Norfolk',36.8508,-76.2859],['Syracuse',43.0481,-76.1474],['Rochester',43.1566,-77.6088],
['Providence',41.824,-71.4128],['Hartford',41.7658,-72.6734],['Portland, Maine',43.6591,-70.2568],
['Bangor',44.8016,-68.7712],['Salt Lake City',40.7608,-111.891],['Provo',40.2338,-111.6585],
['Cheyenne',41.14,-104.8202],['Casper',42.8501,-106.3252],['Billings',45.7833,-108.5007],
['Helena',46.5891,-112.0391],['Idaho Falls',43.4917,-112.0339],['Twin Falls',42.563,-114.4609],
['Tacoma',47.2529,-122.4443],['Olympia',47.0379,-122.9007],['Eugene',44.0521,-123.0868],
['Salem',44.9429,-123.0351],['Sacramento',38.5816,-121.4944],['Fresno',36.7378,-119.7871],
['Bakersfield',35.3733,-119.0187],['San Jose',37.3382,-121.8863],['Oakland',37.8044,-122.2712],
['Santa Barbara',34.4208,-119.6982],['Long Beach',33.7701,-118.1937],['Anaheim',33.8366,-117.9143],
['Tucson',32.2226,-110.9747],['Mesa',33.4152,-111.8315],['Prescott',34.54,-112.4685],
['Albuquerque',35.0844,-106.6504],['Las Cruces',32.3199,-106.7637],
['Colorado Springs',38.8339,-104.8214],['Boulder',40.015,-105.2705],
['Fort Collins',40.5853,-105.0844],['Pueblo',38.2544,-104.6091]
];
const CITIES=[...new Map([...TEAMS.map(t=>[t.city,t.lat,t.lng]),...EXTRA_CITIES].map(c=>[c[0].toLowerCase(),c])).values()].sort((a,b)=>a[0].localeCompare(b[0]));
const el=id=>document.getElementById(id);
const htmlSafe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
let season=null,division='E';
function show(section){for(const id of ['loading','auth','create','dashboard'])el(id).hidden=id!==section}
function name(t){return t.city+' '+t.name}
function teamsFor(season){return season.teams}
function makeFixtures(){
 let ids=Array.from({length:32},(_,i)=>i),weeks=[];
 for(let week=0;week<16;week++){
  const pairings=[];
  for(let j=0;j<16;j++){
   const a=ids[j],b=ids[31-j];
   pairings.push({home:a,away:b});
  }
  weeks.push(pairings);
  ids=[ids[0],ids[31],...ids.slice(1,31)];
 }
 // Every team plays 16 games: 8 home, 8 away.
 return balanceHomeAway(weeks,{}).weeks;
}
/* Use max flow to assign exactly eight home fixtures to each club.
   Completed game weeks are locked to protect previously recorded results. */
function balanceHomeAway(weeks,results={}){
 const copy=weeks.map(games=>games.map(g=>({home:g.home,away:g.away})));
 const locked=Array(32).fill(0),unknown=[];
 for(let week=0;week<copy.length;week++){
  for(let j=0;j<copy[week].length;j++){
   const g=copy[week][j];
   if(Object.prototype.hasOwnProperty.call(results,String(week)))locked[g.home]++;
   else unknown.push({week,j,a:g.home,b:g.away});
  }
 }
 if(locked.some(x=>x>8))return {weeks:copy,balanced:false,reason:'Previously completed weeks include more than eight home games for a team.'};
 const required=locked.map(x=>8-x);
 if(required.reduce((a,b)=>a+b,0)!==unknown.length)return {weeks:copy,balanced:false,reason:'Inconsistent remaining schedule.'};
 const n=unknown.length,source=0,gameStart=1,teamStart=gameStart+n,sink=teamStart+32;
 const graph=Array.from({length:sink+1},()=>[]);
 function add(from,to,cap){
  const forward={to,cap,rev:graph[to].length};
  const backward={to:from,cap:0,rev:graph[from].length};
  graph[from].push(forward);graph[to].push(backward);
  return forward;
 }
 const choices=[];
 for(let i=0;i<n;i++){
  const edge=unknown[i];
  add(source,gameStart+i,1);
  const a=add(gameStart+i,teamStart+edge.a,1);
  add(gameStart+i,teamStart+edge.b,1);
  choices.push(a);
 }
 for(let i=0;i<32;i++)add(teamStart+i,sink,required[i]);
 let matched=0;
 while(matched<n){
  const prev=Array(sink+1).fill(null),q=[source];prev[source]={from:-1};
  for(let qi=0;qi<q.length&&!prev[sink];qi++){
   const from=q[qi];
   for(let ei=0;ei<graph[from].length;ei++){
    const edge=graph[from][ei];
    if(edge.cap>0&&!prev[edge.to]){prev[edge.to]={from,ei};q.push(edge.to)}
   }
  }
  if(!prev[sink])break;
  for(let node=sink;node!==source;){
   const {from,ei}=prev[node],edge=graph[from][ei];
   edge.cap--;graph[node][edge.rev].cap++;
   node=from;
  }
  matched++;
 }
 if(matched!==n)return {weeks:copy,balanced:false,reason:'Unable to balance remaining games without changing completed results.'};
 for(let i=0;i<n;i++){
  const {week,j,a,b}=unknown[i],home=choices[i].cap===0?a:b;
  copy[week][j]={home,away:home===a?b:a};
 }
 return {weeks:copy,balanced:true};
}

function createSeason(city,nickname,length){
 const userCity=CITIES.find(c=>c[0].toLowerCase()===city.trim().toLowerCase());
 if(!userCity)throw Error('Please select a city from the dropdown suggestions.');
 const nick=nickname.trim().replace(/\s+/g,' ');
 if(!/^[a-zA-Z][a-zA-Z0-9 '\-]{1,27}$/.test(nick))throw Error('Enter a team nickname (2–28 letters, numbers, spaces or hyphens).');
 // Exact nickname match replaces that club; otherwise substitute from player's geographically closest division.
 let removed=TEAMS.find(t=>t.name.toLowerCase()===nick.toLowerCase());
 const preferred=userCity[2]<-95?'W':'E';
 if(!removed){const eligible=TEAMS.filter(t=>t.division===preferred);removed=eligible[0]}
 const clubs=TEAMS.map(t=>({...t}));
 const old=clubs[removed.id];
 clubs[removed.id]={id:removed.id,city:userCity[0],name:nick,division:old.division,lat:userCity[1],lng:userCity[2],user:true};
 return {version:1,city:userCity[0],nickname:nick,drives:length,userTeamId:removed.id,teams:clubs,weeks:makeFixtures(),results:{},createdAt:new Date().toISOString()};
}
function playedWeeks(){let n=0;while(season.results[String(n)])n++;return n}
function standings(){
 const scores=season.teams.map(t=>({...t,w:0,l:0,t:0,pf:0,pa:0}));
 for(const games of Object.values(season.results)){for(const game of games){
  const h=scores[game.home],a=scores[game.away];h.pf+=game.hs;h.pa+=game.as;a.pf+=game.as;a.pa+=game.hs;
  if(game.hs>game.as){h.w++;a.l++}else if(game.hs<game.as){a.w++;h.l++}else{h.t++;a.t++}
 }}
 return scores.sort((a,b)=>a.division.localeCompare(b.division)||b.w-a.w||a.l-b.l||(b.pf-b.pa)-(a.pf-a.pa)||name(a).localeCompare(name(b)));
}
function selectDivision(next){division=next;el('tabE').classList.toggle('active',next==='E');el('tabW').classList.toggle('active',next==='W');
 const clubs=standings().filter(t=>t.division===division);
 el('standings').innerHTML=clubs.map((t,i)=>'<tr class="'+(t.user?'mine':'')+'"><td>'+(i+1)+'</td><td>'+htmlSafe(name(t))+(t.user?' ★':'')+'</td><td class="num">'+t.w+'</td><td class="num">'+t.l+'</td><td class="num">'+t.t+'</td></tr>').join('');
}
window.setDivision=selectDivision;

/* Static map with accurate state borders; dots and schedule paths are interactive, not draggable. */
let shownTripWeek=null;
let selectedTeamId=null;
let selectedLeagueFixture=null;
let scoresViewingWeek=null;
function mapPoint(t){return {x:35+(Number(t.lng)+125)*13.6,y:440-(Number(t.lat)-24)*15.5}}
function recordFor(id){
 const t=standings().find(x=>x.id===id);
 return t?{w:t.w,l:t.l,t:t.t}: {w:0,l:0,t:0};
}
function showTeamMapDetail(id){
 const t=season?.teams[id];if(!t)return;
 selectedTeamId=id;
 const rec=recordFor(id);
 const detail=el('teamMapDetail');
 detail.hidden=false;
 detail.innerHTML='<div><strong>'+htmlSafe(name(t))+(t.user?' ★':'')+'</strong><small>'+(t.division==='E'?'EAST':'WEST')+' DIVISION</small></div><b>'+rec.w+'–'+rec.l+(rec.t?'–'+rec.t:'')+'</b>';
}
window.showTeamMapDetail=showTeamMapDetail;
function updateMap(){
 const current=playedWeeks();
 if(shownTripWeek===null||shownTripWeek<current)shownTripWeek=current<16?current:null;
 const pair=selectedLeagueFixture||(shownTripWeek===null?null:season.weeks[shownTripWeek].find(g=>g.home===season.userTeamId||g.away===season.userTeamId));
 const me=season.teams[season.userTeamId];
 const op=pair?season.teams[pair.home===season.userTeamId?pair.away:pair.home]:null;
 const isAway=!!pair&&pair.away===season.userTeamId;
 const gameOwner=selectedLeagueFixture?season.teams[pair.away]:me;
 const here=mapPoint(gameOwner),there=op?mapPoint(op):null;
 // The arc always travels AWAY -> HOME, regardless of which is the user's club.
 let arch='';
 if(pair){
  const awayTeam=season.teams[pair.away],homeTeam=season.teams[pair.home];
  const from=mapPoint(awayTeam),to=mapPoint(homeTeam);
  const midX=(from.x+to.x)/2,midY=(from.y+to.y)/2;
  const distance=Math.hypot(from.x-to.x,from.y-to.y);
  const lift=Math.min(100,Math.max(22,distance*.23));
  const cx=midX,cy=Math.max(15,midY-lift);
  const line='M'+from.x.toFixed(1)+','+from.y.toFixed(1)+' Q'+cx.toFixed(1)+','+cy.toFixed(1)+' '+to.x.toFixed(1)+','+to.y.toFixed(1);
  // Draw two chevrons tangent to the curve, with tips toward the home club.
  const arrows=[.43,.74].map(t=>{
   const x=(1-t)*(1-t)*from.x+2*(1-t)*t*cx+t*t*to.x;
   const y=(1-t)*(1-t)*from.y+2*(1-t)*t*cy+t*t*to.y;
   const dx=2*(1-t)*(cx-from.x)+2*t*(to.x-cx);
   const dy=2*(1-t)*(cy-from.y)+2*t*(to.y-cy);
   const angle=Math.atan2(dy,dx)*180/Math.PI;
   return '<path d="M-8,-5 L0,0 L-8,5" fill="none" stroke="#ffe8a6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+') rotate('+angle.toFixed(1)+')"/>';
  }).join('');
  arch='<path d="'+line+'" fill="none" stroke="#ffdf8c" stroke-width="3.2" stroke-dasharray="'+(isAway?'3 9':'7 5')+'" stroke-linecap="round" opacity=".98"/>'+
    arrows+
    '<circle cx="'+to.x.toFixed(1)+'" cy="'+to.y.toFixed(1)+'" r="11.5" fill="none" stroke="#ffbd72" stroke-width="1.7" opacity=".75"/>';
 }
 const borders=(window.DFL_US_STATES||[]).map(([nm,path])=>'<path d="'+path+'" fill="#24573b" stroke="#73b687" stroke-width="1.15" stroke-linejoin="round" aria-hidden="true"><title>'+htmlSafe(nm)+'</title></path>').join('');
 const points=season.teams.map(t=>{
  const p=mapPoint(t),highlight=pair&&(pair.home===t.id||pair.away===t.id);
  const color=t.user?'#ffc34d':highlight?'#ff8570':'#8fcca1',r=t.user?8:highlight?7:5;
  const title=htmlSafe(name(t)),rec=recordFor(t.id);
  return '<g class="team-map-pin" role="button" tabindex="0" data-team-id="'+t.id+'" aria-label="'+title+' record '+rec.w+' wins '+rec.l+' losses" style="cursor:pointer">'+
    '<circle class="hit-area" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="13" fill="transparent"/>'+
    '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+r+'" fill="'+color+'" stroke="#0f291a" stroke-width="2" pointer-events="none"/>'+
    (t.user?'<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="11.5" fill="none" stroke="#ffc34d" stroke-width="1.4" pointer-events="none"/>':'')+
    '<title>'+title+' · '+rec.w+'–'+rec.l+'</title></g>';
 }).join('');
 el('map').innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 480" preserveAspectRatio="xMidYMid meet" aria-label="Fixed map of US state lines and DieBall teams; select team dots for details">'+
 '<defs><pattern id="mapGrid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#315540" stroke-width=".55" opacity=".25"/></pattern></defs>'+
 '<rect width="900" height="480" rx="14" fill="#0a2418"/><rect width="900" height="480" fill="url(#mapGrid)"/>'+
 borders+arch+points+
 '<text x="38" y="469" fill="#97bba0" font-size="13" font-weight="700" letter-spacing="1.6">DIEBALL FOOTBALL LEAGUE · 48 STATES</text></svg>';
 el('mapHint').textContent=selectedLeagueFixture?
  'Week '+(shownTripWeek+1)+' · '+name(season.teams[pair.away])+' travel to '+name(season.teams[pair.home])+'. Route arrows point toward the home team.':op?
  'Week '+(shownTripWeek+1)+' · '+(isAway?'AWAY at ':'HOME vs ')+name(op)+'. '+(isAway?'Dotted':'Dashed')+' arc arrows point toward the HOME team. Select a team dot to view its record.':
  'Season complete · select any team dot to see its record.';
 if(selectedTeamId!==null)showTeamMapDetail(selectedTeamId);
 for(const row of el('schedule').querySelectorAll('[data-week]')){
  row.classList.toggle('selected',Number(row.dataset.week)===shownTripWeek);
 }
}
window.previewTrip=function(week){
 if(!season||!Number.isInteger(week)||week<0||week>=16)return;
 shownTripWeek=week;selectedLeagueFixture=null;updateMap();
};
function handleMapSelection(event){
 const pin=event.target.closest?.('[data-team-id]');
 if(!pin||!el('map').contains(pin))return;
 showTeamMapDetail(Number(pin.dataset.teamId));
}
el('map').addEventListener('click',handleMapSelection);
el('map').addEventListener('keydown',event=>{
 if(event.key!=='Enter'&&event.key!==' ')return;
 if(event.target.closest?.('[data-team-id]')){event.preventDefault();handleMapSelection(event)}
});

function viewLeagueGame(week,gameIndex){
 const game=season?.weeks[week]?.[gameIndex];if(!game)return;
 scoresViewingWeek=week;
 shownTripWeek=week;selectedLeagueFixture=game;
 const res=season.results[String(week)]?.find(g=>g.home===game.home&&g.away===game.away||
   g.home===game.away&&g.away===game.home);
 const home=season.teams[game.home],away=season.teams[game.away];
 const detail=el('teamMapDetail');detail.hidden=false;
 detail.innerHTML='<div><strong>'+htmlSafe(name(away))+' @ '+htmlSafe(name(home))+'</strong><small>WEEK '+(week+1)+' · AWAY → HOME</small></div><b>'+(res?res.as+' – '+res.hs:'UPCOMING')+'</b>';
 selectedTeamId=null;
 updateMap();
 const mapContainer=el('map');
 mapContainer.scrollIntoView({behavior:'smooth',block:'center'});
 renderScores();
}
window.viewLeagueGame=viewLeagueGame;
function renderScores(){
 if(!season)return;
 const completed=playedWeeks();
 if(scoresViewingWeek===null)scoresViewingWeek=Math.min(completed,15);
 scoresViewingWeek=Math.max(0,Math.min(15,scoresViewingWeek));
 el('scoresWeekLabel').textContent='WEEK '+(scoresViewingWeek+1);
 el('previousWeek').disabled=scoresViewingWeek===0;
 el('nextWeek').disabled=scoresViewingWeek===15;
 const fixtures=season.weeks[scoresViewingWeek];
 const completedGames=season.results[String(scoresViewingWeek)]||[];
 el('weeklyScores').innerHTML=fixtures.map((g,i)=>{
  const h=season.teams[g.home],a=season.teams[g.away];
  const result=completedGames.find(x=>(x.home===g.home&&x.away===g.away)||(x.home===g.away&&x.away===g.home));
  const hs=result?(result.home===g.home?result.hs:result.as):'—';
  const as=result?(result.away===g.away?result.as:result.hs):'—';
  const focused=selectedLeagueFixture&&shownTripWeek===scoresViewingWeek&&
    (selectedLeagueFixture.home===g.home&&selectedLeagueFixture.away===g.away);
  return '<button type="button" class="week-game '+(focused?'selected':'')+'" onclick="viewLeagueGame('+scoresViewingWeek+','+i+')">'+
  '<small>WEEK '+(scoresViewingWeek+1)+' · '+(result?'FINAL':'SCHEDULED')+'</small>'+
  '<div class="match-row"><span>'+htmlSafe(name(a))+'</span><b>'+as+'</b></div>'+
  '<div class="match-row home"><span>'+htmlSafe(name(h))+' ⌂</span><b>'+hs+'</b></div></button>';
 }).join('');
}
function playoffSeeds(div){
 return standings().filter(t=>t.division===div).slice(0,7);
}
function renderPlayoffs(){
 if(!season)return;
 el('playoffDivisions').innerHTML=['E','W'].map(div=>{
  const seeds=playoffSeeds(div);
  const slot=i=>'<span><b class="seed">#'+(i+1)+'</b> '+htmlSafe(name(seeds[i]))+' <small>('+seeds[i].w+'–'+seeds[i].l+')</small></span>';
  const wc=[[1,6],[2,5],[3,4]].map(([a,b])=>'<div class="playoff-match">'+slot(a)+slot(b)+'</div>').join('');
  const bye='<div class="playoff-match playoff-bye"><span>'+slot(0)+'</span><span>FIRST ROUND BYE ✓</span></div>';
  const divisionRound='<div class="playoff-match">'+slot(0)+'<span>vs lowest remaining seed</span></div>'+
    '<div class="playoff-match"><span>Other wild-card winners</span><span>TBD</span></div>';
  const championship='<div class="playoff-match"><span>Division semifinal winners</span><span>TBD</span></div>';
  return '<section class="playoff-side"><h3>'+(div==='E'?'EASTERN':'WESTERN')+' DIVISION · 7 SEEDS</h3>'+
  '<div class="playoff-rounds"><div class="playoff-round"><h4>Wild Card</h4>'+bye+wc+'</div>'+
  '<div class="playoff-round"><h4>Divisional</h4>'+divisionRound+'</div>'+
  '<div class="playoff-round"><h4>Championship</h4>'+championship+'</div></div></section>';
 }).join('')+'<section style="grid-column:1/-1;text-align:center;background:#183a26;padding:15px;border-radius:10px"><div class="eyebrow">DFL CHAMPIONSHIP</div><strong>East Champion vs West Champion</strong><p class="hint">Matchup to be determined</p></section>';
}
function render(){
 if(!season)return;
 show('dashboard');
 const me=season.teams[season.userTeamId],week=playedWeeks(),record=standings().find(t=>t.id===me.id);
 el('teamTitle').innerHTML=htmlSafe(name(me).toUpperCase().split(' ').slice(0,-1).join(' '))+' <em>'+htmlSafe(me.name.toUpperCase())+'</em>';
 el('teamSub').textContent='DFL · '+(me.division==='E'?'Eastern':'Western')+' Division · Season 1';
 el('metricRecord').textContent=record.w+'–'+record.l+(record.t?'–'+record.t:'');
 el('metricDivision').textContent=me.division==='E'?'EAST':'WEST';
 el('metricWeek').textContent=(week===16?'FINAL':(week+1)+' / 16');
 el('metricLength').textContent=season.drives===4?'SHORT':'FULL';
 const fixtures=season.weeks.map((w,i)=>({i,game:w.find(g=>g.home===me.id||g.away===me.id)}));
 el('schedule').innerHTML=fixtures.map(({i,game})=>{
  const isHome=game.home===me.id,other=season.teams[isHome?game.away:game.home];
  const result=season.results[String(i)]?.find(g=>g.home===me.id||g.away===me.id);
  const score=result?(isHome?result.hs+'–'+result.as:result.as+'–'+result.hs):'';
  return '<button type="button" class="game '+(i===week?'current':'')+'" data-week="'+i+'" onclick="previewTrip('+i+')"><div><small>WEEK '+(i+1)+' · '+(isHome?'HOME':'AWAY')+'</small><strong>'+(isHome?'vs ':'@ ')+htmlSafe(name(other))+'</strong></div><b>'+(result?htmlSafe(score):i===week?'NEXT':'')+'</b><span class="game-map-label">VIEW ROUTE ↗</span></button>';
 }).join('');
 if(week===16){el('nextTitle').textContent='SEASON COMPLETE';el('nextSubtitle').textContent='Your final record: '+record.w+'–'+record.l+(record.t?'–'+record.t:'');el('playNext').hidden=true}
 else{
  const g=fixtures[week].game,isHome=g.home===me.id,opp=season.teams[isHome?g.away:g.home];
  el('nextTitle').textContent=(isHome?'vs ':'@ ')+name(opp);
  el('nextSubtitle').textContent='Week '+(week+1)+' · '+(isHome?'Home game':'Away game')+' · '+season.drives+' drives per team';
  el('playNext').hidden=false;
 }
 selectDivision(division);updateMap();renderScores();renderPlayoffs();
}
async function submitCreate(e){
 e.preventDefault();const status=el('createStatus');status.textContent='Creating and saving your league…';
 try{
  const next=createSeason(el('city').value,el('nickname').value,Number(document.querySelector('input[name=length]:checked').value));
  await window.DieBallAccount.saveSeason(next);season=next;division=season.teams[season.userTeamId].division;render();
 }catch(err){status.textContent=err.message||String(err)}
}
async function init(){
 try{
  await window.DieBallAccount.init();
  if(!await window.DieBallAccount.currentUser()){show('auth');return}
  season=await window.DieBallAccount.loadSeason();
  if(season){
   const corrected=balanceHomeAway(season.weeks,season.results||{});
   if(corrected.balanced){
    const changed=JSON.stringify(season.weeks)!==JSON.stringify(corrected.weeks);
    if(changed){season.weeks=corrected.weeks;await window.DieBallAccount.saveSeason(season)}
   }else console.warn('Existing completed fixtures prevent exact 8/8 home-away balance:',corrected.reason);
   division=season.teams[season.userTeamId].division;render();
  }
  else{
   el('cityChoices').innerHTML=CITIES.map(c=>'<option value="'+htmlSafe(c[0])+'"></option>').join('');
   show('create');
  }
 }catch(err){show('auth');el('authError').textContent=err.message||String(err)}
}
el('previousWeek').addEventListener('click',()=>{scoresViewingWeek=Math.max(0,(scoresViewingWeek??0)-1);renderScores()});
el('nextWeek').addEventListener('click',()=>{scoresViewingWeek=Math.min(15,(scoresViewingWeek??0)+1);renderScores()});
el('showPlayoffs').addEventListener('click',()=>{const p=el('playoffPanel');p.hidden=false;renderPlayoffs();p.scrollIntoView({behavior:'smooth',block:'start'})});
el('hidePlayoffs').addEventListener('click',()=>{el('playoffPanel').hidden=true});
el('createForm').addEventListener('submit',submitCreate);
el('playNext').addEventListener('click',()=>{if(season&&playedWeeks()<16)location.href='/season-play'});
init();