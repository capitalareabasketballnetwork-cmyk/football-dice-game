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
let season=null,division='E',map=null,markers=null,route=null;
function show(section){for(const id of ['loading','auth','create','dashboard'])el(id).hidden=id!==section}
function name(t){return t.city+' '+t.name}
function teamsFor(season){return season.teams}
function makeFixtures(){
 let ids=Array.from({length:32},(_,i)=>i),weeks=[];
 for(let week=0;week<16;week++){
  const pairings=[];
  for(let j=0;j<16;j++){
   const a=ids[j],b=ids[31-j];
   const host=(week+j)%2===0?a:b;
   pairings.push({home:host,away:host===a?b:a});
  }
  weeks.push(pairings);
  ids=[ids[0],ids[31],...ids.slice(1,31)];
 }
 return weeks;
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
function dot(latlng,color,radius=6){return L.circleMarker(latlng,{radius,color:'#fff',weight:1.5,fillColor:color,fillOpacity:1})}
function updateMap(){
 if(typeof L==='undefined'){el('map').innerHTML='<p style="padding:20px;color:#183c25">Map service unavailable. The full team schedule and standings are still available.</p>';return}
 if(!map){
  map=L.map('map',{scrollWheelZoom:false,attributionControl:true}).setView([39.3,-97.5],4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:12,attribution:'© OpenStreetMap contributors'}).addTo(map);
 }
 if(markers)map.removeLayer(markers);if(route)map.removeLayer(route);
 markers=L.layerGroup().addTo(map);route=L.layerGroup().addTo(map);
 const next=playedWeeks(),fixture=next<16?season.weeks[next].find(g=>g.home===season.userTeamId||g.away===season.userTeamId):null;
 const away=fixture?.away===season.userTeamId?null:fixture?.away;
 season.teams.forEach(t=>{
  const color=t.user?'#ffbd43':away===t.id?'#ff8265':'#367a51';
  dot([t.lat,t.lng],color,t.user?9:away===t.id?8:5).bindPopup('<b>'+htmlSafe(name(t))+'</b><br>'+(t.user?'YOUR TEAM':t.division==='E'?'East Division':'West Division')).addTo(markers);
 });
 const my=season.teams[season.userTeamId];
 if(away!=null){
  const opponent=season.teams[away];
  L.polyline([[my.lat,my.lng],[opponent.lat,opponent.lng]],{color:'#faaa52',weight:3,dashArray:'3 9',opacity:.95}).addTo(route);
  el('mapHint').textContent='Dotted line: your next away trip to '+name(opponent)+'.';
 }else el('mapHint').textContent=fixture?'Your next game is at home. Select an upcoming away game in the schedule to preview its travel route.':'Season complete!';
 map.invalidateSize();
}
window.previewTrip=function(week){
 const g=season.weeks[week].find(x=>x.home===season.userTeamId||x.away===season.userTeamId);
 if(!g||!map||!route)return;
 route.clearLayers();
 const my=season.teams[season.userTeamId],op=season.teams[g.home===season.userTeamId?g.away:g.home];
 if(g.away===season.userTeamId){
  L.polyline([[my.lat,my.lng],[op.lat,op.lng]],{color:'#faaa52',weight:3,dashArray:'3 9',opacity:.95}).addTo(route);
  el('mapHint').textContent='Week '+(week+1)+' away game: '+name(op)+'. Dotted line from '+my.city+' to '+op.city+'.';
 }else el('mapHint').textContent='Week '+(week+1)+' is a home game against '+name(op)+'.';
 map.flyToBounds(L.latLngBounds([[my.lat,my.lng],[op.lat,op.lng]]).pad(.32),{maxZoom:6});
};
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
  return '<div class="game '+(i===week?'current':'')+'"><div><small>WEEK '+(i+1)+' · '+(isHome?'HOME':'AWAY')+'</small><strong>'+(isHome?'vs ':'@ ')+htmlSafe(name(other))+'</strong></div><b>'+(result?htmlSafe(score):i===week?'NEXT':'')+'</b><button class="secondary" onclick="previewTrip('+i+')">MAP</button></div>';
 }).join('');
 if(week===16){el('nextTitle').textContent='SEASON COMPLETE';el('nextSubtitle').textContent='Your final record: '+record.w+'–'+record.l+(record.t?'–'+record.t:'');el('playNext').hidden=true}
 else{
  const g=fixtures[week].game,isHome=g.home===me.id,opp=season.teams[isHome?g.away:g.home];
  el('nextTitle').textContent=(isHome?'vs ':'@ ')+name(opp);
  el('nextSubtitle').textContent='Week '+(week+1)+' · '+(isHome?'Home game':'Away game')+' · '+season.drives+' drives per team';
  el('playNext').hidden=false;
 }
 selectDivision(division);updateMap();
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
  if(season){division=season.teams[season.userTeamId].division;render()}
  else{
   el('cityChoices').innerHTML=CITIES.map(c=>'<option value="'+htmlSafe(c[0])+'"></option>').join('');
   show('create');
  }
 }catch(err){show('auth');el('authError').textContent=err.message||String(err)}
}
el('createForm').addEventListener('submit',submitCreate);
el('playNext').addEventListener('click',()=>{if(season&&playedWeeks()<16)location.href='/?seasonGame=1'});
init();