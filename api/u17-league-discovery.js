'use strict';
/** Safe league discovery: only public competition metadata, never the API key. */
const BASE='https://data.anysport.io/v1/soccer';
const DEFAULT_ID='asl_5298ee57d4fe4e31af4b1b3e35950f99';
const isId=v=>typeof v==='string'&&/^asl_[a-f0-9]{32}$/.test(v);
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=300');
 if(req.method!=='GET')return res.status(405).json({available:false,reason:'method_not_allowed'});
 const key=process.env.ANYSPORT_API_KEY;
 if(!key)return res.status(200).json({available:false,reason:'provider_not_configured'});
 const id=isId(req.query?.league_id)?req.query.league_id:DEFAULT_ID;
 if(req.query?.mode==='seasons'){
  try{
   const url=new URL(BASE+'/seasons');url.searchParams.set('league_id',id);
   const response=await fetch(url,{headers:{apikey:key},signal:AbortSignal.timeout(9000)});
   if(!response.ok)return res.status(502).json({available:false,stage:'seasons',providerStatus:response.status});
   const body=await response.json();
   if(body.success!==true||!Array.isArray(body.data))return res.status(502).json({available:false,reason:'unexpected_provider_schema'});
   const seasons=body.data.map(x=>({season:String(x.season||''),hasResults:x.has_results??null})).filter(x=>x.season);
   return res.status(200).json({available:true,leagueId:id,seasons,season2026Found:seasons.some(x=>x.season==='2026'),note:'Provider seasons only; match coverage not yet confirmed.'});
  }catch(e){return res.status(502).json({available:false,reason:e?.name==='TimeoutError'?'provider_timeout':'provider_network_error'});}
 }
 try{
  const url=new URL(BASE+'/leagues');url.searchParams.set('league_id',id);url.searchParams.set('lang','en');
  const upstream=await fetch(url,{headers:{apikey:key},signal:AbortSignal.timeout(9000)});
  if(!upstream.ok)return res.status(502).json({available:false,reason:'provider_http_error',providerStatus:upstream.status});
  const data=await upstream.json();
  if(data.success!==true||!Array.isArray(data.data))return res.status(502).json({available:false,reason:'unexpected_provider_schema'});
  const leagues=data.data.filter(x=>x&&isId(x.league_id)).map(x=>({leagueId:x.league_id,name:x.name||x.league_name||null,country:x.country||null,isCup:x.is_cup??null}));
  return res.status(200).json({available:true,requestedLeagueId:id,found:leagues.some(x=>x.leagueId===id),leagues,source:'AnySport',note:'Competition lookup only. Does not confirm 2026 match coverage or live events.'});
 }catch(error){console.error('[u17-league-discovery]',error?.name||'error');return res.status(502).json({available:false,reason:error?.name==='TimeoutError'?'provider_timeout':'provider_network_error'});}
};
