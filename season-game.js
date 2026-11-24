'use strict';
/* Connect the Season dashboard to the existing full DieBall CPU match rules. */
(function(){
 const params=new URLSearchParams(location.search);
 if(!location.pathname.endsWith('/season-play.html')&&params.get('seasonGame')!=='1')return;
 let launched=false,saving=false,saved=false,context=null;
 function currentWeek(s){let n=0;while(s.results[String(n)])n++;return n}
 function deterministicScore(team,week,salt){
  let h=(team+31)*2654435761 ^ (week+13)*1597334677 ^ salt*1640531527;
  h=(h^(h>>>16))*2246822519;h=h^(h>>>13);
  return [0,3,6,7,10,13,14,16,17,20,21,23,24,27,28,30,31,34,35][(h>>>0)%19];
 }
 function seasonHeader(){
  const header=document.querySelector('#bodymode .header-right');
  if(!header||document.getElementById('seasonBack'))return;
  const link=document.createElement('a');
  link.id='seasonBack';link.href='/season.html';link.className='smallbtn';
  link.textContent='← SEASON';link.style.cssText='background:#b8fb8b;color:#12321c;padding:8px;border-radius:8px;text-decoration:none;font-weight:950';
  header.prepend(link);
 }
 async function begin(){
  if(launched)return;launched=true;
  try{
   const account=window.DieBallAccount;
   if(!account)throw Error('Account service is unavailable.');
   const user=await account.currentUser();
   if(!user){location.replace('/account');return}
   const season=await account.loadSeason();
   if(!season){location.replace('/season.html');return}
   const week=currentWeek(season);
   if(week>=16){location.replace('/season.html');return}
   const match=season.weeks[week].find(g=>g.home===season.userTeamId||g.away===season.userTeamId);
   if(!match)throw Error('Unable to locate this week\'s opponent.');
   const otherId=match.home===season.userTeamId?match.away:match.home;
   const opponent=season.teams[otherId],my=season.teams[season.userTeamId];
   context={season,week,match,opponent,me:my};
   window.seasonTeamName=my.city+' '+my.name;
   window.seasonOpponentName=opponent.city+' '+opponent.name;
   const home=season.teams[match.home],away=season.teams[match.away];
   window.seasonHomeName=home.city+' '+home.name;
   window.seasonAwayName=away.city+' '+away.name;
   window.seasonIsAway=match.away===season.userTeamId;
   gameDrivesPerTeam=season.drives;
   currentMode='cpu';teamNames=[window.seasonTeamName,window.seasonOpponentName];
   document.getElementById('cpuName').textContent=window.seasonOpponentName;
   enterGame();
   const scorebar=document.querySelector('#bodymode .scorebar');
   if(window.seasonIsAway){
    scorebar.classList.add('season-away');
    const guest=scorebar.querySelector('.mini-team:not(.opponent)');
    const host=scorebar.querySelector('.mini-team.opponent');
    // Visual scoreboard only. The underlying CPU game keeps the player as side 0.
    scorebar.insertBefore(host,guest);
    host.style.gridColumn='1';
    host.style.justifyContent='flex-start';
    guest.style.gridColumn='2';
    guest.style.justifyContent='flex-end';
   }
   scorebar.classList.add('season-scoreboard');
   const homeBox=scorebar.querySelector(window.seasonIsAway?'.mini-team.opponent':'.mini-team:not(.opponent)');
   const awayBox=scorebar.querySelector(window.seasonIsAway?'.mini-team:not(.opponent)':'.mini-team.opponent');
   function putBadge(box,label){
    let badge=box.querySelector('.season-side-label');
    if(!badge){badge=document.createElement('small');badge.className='season-side-label';box.append(badge)}
    badge.textContent=label;
   }
   putBadge(homeBox,'HOME');
   putBadge(awayBox,'AWAY');
   seasonHeader();render();
   const loading=document.getElementById('seasonLaunching');
   if(loading)loading.remove();
   if(document.getElementById('walkthrough'))document.getElementById('walkthrough').style.display='none';
   let info=document.createElement('div');info.id='seasonMatchInfo';
   info.textContent='SEASON · WEEK '+(week+1)+' · '+(match.home===season.userTeamId?'HOME':'AWAY')+' vs '+window.seasonOpponentName;
   info.style.cssText='font-size:10px;color:#b8fb8b;font-weight:900;text-align:center;padding:2px 4px';
   document.querySelector('#bodymode .scorebar').before(info);
  }catch(err){
   launched=false;alert('Unable to start your season game: '+(err.message||err));
   location.replace('/season.html');
  }
 }
 async function finish(){
  if(!context||saved||saving)return;
  saving=true;
  let notice=document.getElementById('seasonSaveStatus');
  if(!notice){notice=document.createElement('div');notice.id='seasonSaveStatus';notice.style.cssText='position:fixed;right:10px;bottom:10px;z-index:5000;background:#1c4c2b;border:1px solid #9fe47c;padding:10px 13px;border-radius:9px;font-weight:900;font-size:12px;max-width:90vw';document.body.append(notice)}
  notice.textContent='Saving your season result…';
  try{
   const latest=await window.DieBallAccount.loadSeason();
   if(!latest)throw Error('Your saved season could not be found.');
   if(currentWeek(latest)!==context.week){saved=true;notice.textContent='This game week is already recorded.';return}
   const games=[];
   for(const fixture of latest.weeks[context.week]){
    if(fixture.home===latest.userTeamId||fixture.away===latest.userTeamId){
     games.push({...fixture,hs:fixture.home===latest.userTeamId?g.score[0]:g.score[1],as:fixture.away===latest.userTeamId?g.score[0]:g.score[1]});
    }else{
     games.push({...fixture,hs:deterministicScore(fixture.home,context.week,1),as:deterministicScore(fixture.away,context.week,2)});
    }
   }
   latest.results[String(context.week)]=games;
   await window.DieBallAccount.saveSeason(latest);
   saved=true;notice.textContent='✓ Week '+(context.week+1)+' saved. Return to Season for updated standings.';
   const link=document.createElement('a');link.href='/season.html';link.textContent=' VIEW SEASON →';
   link.style.cssText='color:#fff2af;text-decoration:underline;margin-left:5px';notice.append(link);
  }catch(err){notice.textContent='Season save failed: '+(err.message||err)+'. Please keep this game open and tap to retry.';notice.style.cursor='pointer';notice.onclick=()=>{saving=false;finish()}}
  finally{saving=false}
 }
 window.finishSeasonGame=finish;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',begin);else begin();
})();