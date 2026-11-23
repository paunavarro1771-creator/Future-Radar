'use strict';
/** Inspect provider-supported U17 seasons and 2026 match coverage without exposing credentials. */
const BASE='https://data.anysport.io/v1/soccer';
const LEAGUE='asl_5298ee57d4fe4e31af4b1b3e35950f99';
const get=async(path,key,params)=>{
 const url=new URL(BASE+path);
 for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
 const response=await fetch(url,{headers:{apikey:key},signal:AbortSignal.timeout(9000)});
 if(!response.ok)return {ok:false,status:response.status};
 const body=await response.json();
 return body?.success===true&&Array.isArray(body.data)?{ok:true,data:body.data,meta:body.meta||null}:{ok:false,reason:'unexpected_schema'};
};
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=300');
 if(req.method!=='GET')return res.status(405).json({available:false,reason:'method_not_allowed'});
 const key=process.env.ANYSPORT_API_KEY;
 if(!key)return res.status(200).json({available:false,reason:'provider_not_configured'});
 try{
  const seasons=await get('/seasons',key,{league_id:LEAGUE});
  if(!seasons.ok)return res.status(502).json({available:false,stage:'seasons',providerStatus:seasons.status||null,reason:seasons.reason||'provider_http_error'});
  const listed=seasons.data.map(s=>({season:String(s.season||''),hasResults:s.has_results??null,hasStandings:s.has_standings??null})).filter(s=>s.season);
  const season2026=listed.find(s=>s.season==='2026'||s.season==='2026-2027'||s.season==='2025-2026');
  if(!season2026)return res.status(200).json({available:true,leagueId:LEAGUE,seasons:listed,season2026Found:false,matches:[],note:'Provider has not listed a 2026 season for this league.'});
  const results=await get('/matches',key,{league_id:LEAGUE,season:season2026.season,page:1,limit:100});
  return res.status(200).json({available:true,leagueId:LEAGUE,seasons:listed,selectedSeason:season2026.season,matchesAvailable:results.ok,matchesCount:results.ok?results.data.length:null,matchIds:results.ok?results.data.map(m=>m.match_id).filter(Boolean).slice(0,100):[],matchQueryStatus:results.ok?'ok':results.status||results.reason||'error',note:'Diagnostic only. A nonempty match list does not establish complete live statistics coverage.'});
 }catch(e){console.error('[u17-seasons]',e?.name||'error');return res.status(502).json({available:false,reason:e?.name==='TimeoutError'?'provider_timeout':'provider_network_error'});}
};
