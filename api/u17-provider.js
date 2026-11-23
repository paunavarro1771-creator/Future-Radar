'use strict';
/**
 * Read-only U17 provider adapter. Set ANYSPORT_API_KEY in Vercel.
 * Does not claim to be live until provider returns a current timestamp.
 * API calls are made server-side; secrets never reach the browser.
 */
const LEAGUE='asl_5298ee57d4fe4e31af4b1b3e35950f99';
const BASE='https://data.anysport.io/v1/soccer';
const TTL=60_000;
let cached=null,expires=0;
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=30');
 if(req.method!=='GET')return res.status(405).json({available:false,error:'method_not_allowed'});
 const apiKey=process.env.ANYSPORT_API_KEY;
 if(!apiKey)return res.status(200).json({available:false,reason:'provider_not_configured',matches:[],realtime:false});
 if(cached&&Date.now()<expires)return res.status(200).json(cached);
 try{
  const url=new URL(BASE+'/matches');url.searchParams.set('league_id',LEAGUE);url.searchParams.set('season','2026');url.searchParams.set('lang','en');
  const response=await fetch(url,{headers:{apikey:apiKey},signal:AbortSignal.timeout(9000)});
  if(!response.ok)throw Error('provider_http_'+response.status);
  const body=await response.json();
  if(body.success!==true||!Array.isArray(body.data))throw Error('invalid_provider_response');
  const matches=body.data.map(m=>({providerId:String(m.match_id||''),date:String(m.date||''),home:String(m.home?.name||m.home||''),away:String(m.away?.name||m.away||''),status:String(m.status||''),homeScore:Number.isInteger(m.home_score)?m.home_score:null,awayScore:Number.isInteger(m.away_score)?m.away_score:null})).filter(m=>m.providerId&&/^2026-\d{2}-\d{2}$/.test(m.date));
  cached={available:true,realtime:false,source:'AnySport',fetchedAt:new Date().toISOString(),matches};expires=Date.now()+TTL;
  return res.status(200).json(cached);
 }catch(error){return res.status(502).json({available:false,reason:'provider_unavailable',matches:[],realtime:false});}
};
