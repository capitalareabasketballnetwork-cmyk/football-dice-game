// Public-only client settings; NEVER place a Supabase service role key here.
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'})}
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const anonKey=process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!anonKey)return res.status(200).json({available:false});
 if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co\/?$/i.test(url)){
  return res.status(500).json({available:false,error:'Invalid Supabase project URL'});
 }
 return res.status(200).json({available:true,url,anonKey});
}