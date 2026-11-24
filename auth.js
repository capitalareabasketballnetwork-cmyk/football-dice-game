'use strict';
/* DieBall Account: Supabase Auth + per-user cloud rosters, activated by Vercel public env config.
   Until configured, no email/password data is collected or stored. */
(function(){
 let initPromise=null,client=null,config=null;
 async function init(){
  if(initPromise)return initPromise;
  initPromise=(async()=>{
   const response=await fetch('/api/public-config',{cache:'no-store'});
   if(!response.ok)throw Error('Account service configuration could not be loaded.');
   config=await response.json();
   if(!config.available)return null;
   const mod=await import('https://esm.sh/@supabase/supabase-js@2.49.10');
   client=mod.createClient(config.url,config.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   return client;
  })();
  return initPromise;
 }
 async function currentUser(){
  const c=await init();
  if(!c)return null;
  const {data,error}=await c.auth.getUser();
  if(error&&error.name!=='AuthSessionMissingError')return null;
  return data?.user||null;
 }
 async function signUp(email,password,name){
  const c=await init();if(!c)throw Error('Online accounts are not configured.');
  if(!name||name.trim().length<2)throw Error('Enter a display name (at least 2 characters).');
  if(!password||password.length<8)throw Error('Use a password with at least 8 characters.');
  const {data,error}=await c.auth.signUp({email,password,options:{
   data:{display_name:name.trim().slice(0,22)},
   emailRedirectTo:location.origin+'/account'
  }});
  if(error)throw error;
  return data;
 }
 async function signIn(email,password){
  const c=await init();if(!c)throw Error('Online accounts are not configured.');
  const {data,error}=await c.auth.signInWithPassword({email,password});
  if(error)throw error;return data;
 }
 async function signOut(){
  const c=await init();if(!c)return;
  const {error}=await c.auth.signOut();if(error)throw error;
 }
 async function sendReset(email){
  const c=await init();if(!c)throw Error('Online accounts are not configured.');
  const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/account'});
  if(error)throw error;
 }
 async function saveRoster(roster){
  const c=await init(),user=await currentUser();
  if(!c||!user)throw Error('Sign in to save your roster in the cloud.');
  const {error}=await c.from('diebowl_rosters').upsert({
   user_id:user.id,roster,updated_at:new Date().toISOString()
  },{onConflict:'user_id'});
  if(error)throw error;
  return true;
 }
 async function loadRoster(){
  const c=await init(),user=await currentUser();
  if(!c||!user)return null;
  const {data,error}=await c.from('diebowl_rosters').select('roster').eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  return data?.roster||null;
 }
 async function updateName(name){
  const c=await init();if(!c)throw Error('Online accounts are not configured.');
  if(!name||name.trim().length<2)throw Error('Display name must contain two characters.');
  const {data,error}=await c.auth.updateUser({data:{display_name:name.trim().slice(0,22)}});
  if(error)throw error;return data;
 }
 
 async function onlineAction(action,code=null,play=null,actor=null){
  const c=await init();if(!c)throw Error('Online connection unavailable.');
  const {data,error}=await c.rpc('diebowl_online_action',{p_action:action,p_code:code,p_play:play,p_actor:actor});
  if(error)throw error;return data;
 }
 async function onlineXP(){
  const c=await init(),user=await currentUser();if(!c||!user)return null;
  const {data,error}=await c.from('diebowl_online_xp').select('earned,games').eq('user_id',user.id).maybeSingle();
  if(error)throw error;return data||{earned:0,games:0};
 }
 async function loadSeason(){
  const c=await init(),user=await currentUser();if(!c||!user)return null;
  const {data,error}=await c.from('dieball_seasons').select('season').eq('user_id',user.id).maybeSingle();
  if(error)throw error;return data?.season||null;
 }
 async function saveSeason(season){
  const c=await init(),user=await currentUser();
  if(!c||!user)throw Error('You must sign in to save Season progress.');
  const {error}=await c.from('dieball_seasons').upsert({
   user_id:user.id,season,updated_at:new Date().toISOString()
  },{onConflict:'user_id'});
  if(error)throw error;return true;
 }
 window.DieBallAccount={init,currentUser,signUp,signIn,signOut,sendReset,saveRoster,loadRoster,updateName,onlineAction,onlineXP,loadSeason,saveSeason,isConfigured:()=>!!config?.available};
})();
