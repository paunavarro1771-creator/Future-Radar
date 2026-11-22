'use strict';
/**
 * Future Radar Data Engine v1 — zero-cost, server-side normalization.
 * Uses the existing U17 provider aggregator; never claims data absent from providers.
 * Endpoints: /api/data-engine?competition=fifa-u17-world-cup-2026&dates=...
 *            /api/data-engine?competition=fifa-u17-world-cup-2026&date=...&home=...&away=...
 *            /api/data-engine?health=1
 * No credentials, no scraping bypass, no invented stats.
 */
const upstream=require('./u17-world-cup-live');
const officialSchedule=require('../data/fifa-u17-2026-official-group-fixtures.json');
function officialMatch(m){return {
 id:`${m.date}:${m.homeCode}:${m.awayCode}`,competitionId:'fifa-u17-world-cup-2026',date:m.date,
 home:{id:`national:${m.homeCode}:u17`,code:m.homeCode,name:null,score:null},
 away:{id:`national:${m.awayCode}:u17`,code:m.awayCode,name:null,score:null},
 status:'SCHEDULED',kickoff:m.kickoffLocal,timezone:m.timezone,pitch:m.pitch,
 matchNumber:m.matchNumber,source:m.sourceUrl,sourceType:'official_schedule_pdf',
 scheduleOnly:true,verifiedAt:null
};}
function withOfficialSchedule(matches,dates){
 const merged=new Map(officialSchedule.fixtures.filter(m=>dates.includes(m.date)).map(m=>{
   const item=officialMatch(m);return [item.id,item];
 }));
 for(const match of matches){if(match?.id)merged.set(match.id,{...merged.get(match.id),...match,scheduleOnly:false});}
 return [...merged.values()].sort((a,b)=>a.date.localeCompare(b.date)||String(a.kickoff||'').localeCompare(String(b.kickoff||'')));
}
const COMP='fifa-u17-world-cup-2026';
const VALID_DATE=/^20\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const VALID_CODE=/^[A-Z]{3}$/;
const maxDates=35;
const cache=new Map();
const getCache=(key)=>{const v=cache.get(key);if(v&&v.expires>Date.now())return v.value;cache.delete(key);return null;};
const setCache=(key,value,ttl)=>{if(cache.size>150)cache.clear();cache.set(key,{value,expires:Date.now()+ttl});};
function normalizeMatch(m){
  const date=m.date||null,homeCode=m.homeCode||null,awayCode=m.awayCode||null;
  return {
    id:m.matchKey||[date,homeCode,awayCode].join(':'),competitionId:COMP,date,
    home:{id:m.homeTeamId||null,code:homeCode,name:m.home||m.homeName||null,score:m.homeScore??null},
    away:{id:m.awayTeamId||null,code:awayCode,name:m.away||m.awayName||null,score:m.awayScore??null},
    status:m.status||null,kickoff:m.time||m.kickoff||null,
    source:m.source||m.sourceType||'existing_u17_aggregator',sourceType:m.sourceType||'unofficial_public_endpoint',
    verifiedAt:m.dataAsOf||m.verifiedAt||null,raw:m
  };
}
function callLegacy(query){
  return new Promise((resolve,reject)=>{
    let status=200,body=null;
    const res={setHeader(){return this;},status(n){status=n;return this;},json(data){body=data;resolve({status,body:data});return this;}};
    Promise.resolve(upstream({method:'GET',query},res)).then(()=>{if(body===null)reject(new Error('Provider returned no response'));}).catch(reject);
  });
}
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=60');
  res.setHeader('Access-Control-Allow-Origin','*');
  if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});
  const q=req.query||{};
  if(q.health==='1'){
    const upstreamHealth=await callLegacy({health:'1'}).catch(()=>null);
    return res.status(200).json({engine:'Future Radar Data Engine',version:1,competition:COMP,
      provider:upstreamHealth?.body||null,guaranteedRealTime:false,persistentDatabase:false,
      note:'The engine normalizes provider data; it does not create missing lineups or statistics.',
      checkedAt:new Date().toISOString()});
  }
  if(q.competition!==COMP)return res.status(400).json({error:'unsupported_competition',supported:[COMP]});
  const details=q.date!==undefined||q.home!==undefined||q.away!==undefined;
  let query,ttl;
  if(details){
    const date=String(q.date||''),home=String(q.home||'').toUpperCase(),away=String(q.away||'').toUpperCase();
    if(!VALID_DATE.test(date)||!VALID_CODE.test(home)||!VALID_CODE.test(away)||home===away)
      return res.status(400).json({error:'invalid_match_identity'});
    query={date,home,away,details:'1'};ttl=25000;
  }else{
    const dates=String(q.dates||'').split(',').filter(Boolean);
    if(!dates.length||dates.length>maxDates||dates.some(d=>!VALID_DATE.test(d)))
      return res.status(400).json({error:'invalid_dates',maxDates});
    query={list:'1',dates:dates.join(',')};ttl=45000;
  }
  const key=JSON.stringify(query),cached=getCache(key);
  if(cached)return res.status(200).json({...cached,cached:true});
  try{
    const result=await callLegacy(query);
    if(result.status!==200||!result.body?.available){
      if(!details){
        const matches=withOfficialSchedule([],query.dates.split(','));
        if(matches.length)return res.status(200).json({available:true,competitionId:COMP,matches,
          partial:true,requestedDates:query.dates.split(',').length,coveredDates:0,
          source:'Official FIFA schedule only; live provider unavailable',liveDataAvailable:false});
      }
      return res.status(result.status===200?502:result.status).json({available:false,upstream:result.body||null});
    }
    const payload=details?{
      available:true,competitionId:COMP,matchId:[query.date,query.home,query.away].join(':'),
      match:result.body.event?normalizeMatch(result.body.event):null,
      statistics:result.body.statistics??null,lineups:result.body.lineups??null,
      incidents:result.body.incidents??[],alternativeProvider:result.body.alternativeProvider??null,
      source:result.body.source||null,sourceType:result.body.sourceType||null,
      dataAsOf:result.body.dataAsOf||null,updatedAt:result.body.updatedAt||null
    }:{
      available:true,competitionId:COMP,matches:withOfficialSchedule((result.body.matches||[]).map(normalizeMatch),query.dates.split(',')),
      partial:!!result.body.partial,requestedDates:result.body.requestedDates,
      coveredDates:result.body.coveredDates,source:result.body.source||null,
      updatedAt:result.body.updatedAt||null
    };
    setCache(key,payload,ttl);
    return res.status(200).json(payload);
  }catch(err){
    console.error('Data Engine upstream error',err.message);
    if(!details){const matches=withOfficialSchedule([],query.dates.split(','));
      if(matches.length)return res.status(200).json({available:true,competitionId:COMP,matches,partial:true,
        requestedDates:query.dates.split(',').length,coveredDates:0,
        source:'Official FIFA schedule only; live provider unavailable',liveDataAvailable:false});}
    return res.status(502).json({available:false,error:'upstream_unavailable'});
  }
};
module.exports.config={maxDuration:20};
